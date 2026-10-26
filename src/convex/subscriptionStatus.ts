import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import { compatibilityFieldsForUser, resolveProfileRole } from "./profileSubscription";
import { scheduleEmailEvent, formatDateFr, splitName } from "./emailNotifications";
import {
  DAY_MS,
  MONTHLY_DURATION_DAYS,
  PHASE_LABELS,
  TRIAL_DURATION_DAYS,
  computeSubscriptionSnapshot,
  daysRemainingUntil,
  type SubscriptionSnapshot,
} from "./subscriptionPeriods";
import {
  isProfileEligibleForTrial,
  isTrialCampaignOpen,
  readTrialConfig,
  trialEndDateFor,
  trialIncludes,
  type TrialConfig,
} from "./trialConfig";
import { DEFAULT_PLAN_PRICES, resolvePlanPrice } from "../lib/planPricing";

// ============================================================================
// GESTION CENTRALE DE LA PÉRIODE D'ESSAI ET DE L'ABONNEMENT MENSUEL
// ============================================================================
// `subscriptionPeriods.ts` porte la logique pure (règles de priorité, calculs) ;
// ce fichier porte l'accès aux données et les points d'entrée Convex.
//
// `getUserSubscriptionStatus` est LA source de vérité consommée par tous les
// modules de la plateforme (contrôle d'accès Client Pro, « Mon abonnement »,
// espace administrateur). Les compteurs `…DaysRemaining` persistés sont des
// miroirs recalculés à chaque écriture et par le cron quotidien : la décision
// d'accès est toujours recalculée depuis les dates et l'horloge serveur.

export {
  DAY_MS,
  MONTHLY_DURATION_DAYS,
  PHASE_LABELS,
  TRIAL_DURATION_DAYS,
  computeSubscriptionSnapshot,
  daysRemainingUntil,
  isFreeOffer,
  planDisplayName,
  type SubscriptionPhase,
  type SubscriptionSnapshot,
} from "./subscriptionPeriods";

// ============================================================================
// Lecture des données
// ============================================================================

interface PricingInfo {
  /** Configuration complète de l'essai (activation, profils, modules). */
  trial: TrialConfig;
  /** La période d'essai est-elle activée ET dans sa fenêtre de validité ? */
  trialEnabled: boolean;
  trialDays: number;
  trialPdfAllowed: boolean;
  planPrice: number | null;
  /** « Offre gratuite » Client Pro activée (prix null/0, forfait disponible). */
  clientProFreeOffer: boolean;
  currency: string;
}

/** Contextes autorisés : requêtes, mutations et crons (tous ont `ctx.db`). */
type DbCtx = QueryCtx | MutationCtx;

async function readPricing(ctx: DbCtx, now = Date.now()): Promise<PricingInfo> {
  const config = await ctx.db.query("paymentConfig").order("desc").first();
  const trial = await readTrialConfig(ctx);
  return {
    trial,
    trialEnabled: isTrialCampaignOpen(trial, now),
    trialDays: trial.durationDays,
    trialPdfAllowed: trialIncludes(trial, "pdf"),
    // Prix Client Pro RÉELLEMENT enregistré : un champ absent (document créé par
    // un autre réglage) vaut la valeur initiale, jamais « gratuit » — même règle
    // que `payments.getPlanPricing` / `getPublicPricing` (`lib/planPricing.ts`).
    planPrice: resolvePlanPrice(config?.proPrice, DEFAULT_PLAN_PRICES.pro),
    // Le switch « Offre gratuite » Client Pro est actif quand le prix a été
    // EXPLICITEMENT enregistré à null/0 et que le forfait n'est pas désactivé.
    // Un prix absent (document partiel) ne rend jamais le forfait gratuit.
    // Il accorde l'accès Client Pro sans période d'essai.
    clientProFreeOffer:
      config != null &&
      config.clientProEnabled !== false &&
      (config.proPrice === null || config.proPrice === 0),
    currency: config?.currency ?? "TND",
  };
}

/**
 * État d'abonnement complet d'un utilisateur, recalculé côté serveur.
 * C'est LA source de vérité : tout module qui doit savoir si l'accès est
 * autorisé passe par ici.
 *
 * NB : nécessite `ctx.db` (requêtes, mutations). Depuis une action, utiliser la
 * query publique `getMySubscriptionStatus` via `ctx.runQuery`.
 */
export async function getUserSubscriptionStatus(
  ctx: DbCtx,
  userId: Id<"users">,
  now = Date.now(),
): Promise<SubscriptionSnapshot | null> {
  const user = await ctx.db.get(userId);
  if (!user) return null;

  const pricing = await readPricing(ctx, now);

  const subs = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .order("desc")
    .collect();

  // Abonnement mensuel de référence = un abonnement PAYÉ encore valide s'il
  // existe (un renouvellement remplace l'ancien), sinon le plus récent.
  //
  // Un `pending` (virement en attente de validation) ou un `canceled`
  // (virement refusé, abonnement annulé avant échéance) ne compte JAMAIS comme
  // une période payée : `createSubscription` leur donne une date de fin à
  // 30 jours dès leur création, donc s'en servir comme référence accorderait
  // l'accès complet sans aucun paiement validé. Les dates ne sont reprises que
  // d'un abonnement réellement payé (`active` / `expired`), ou — à défaut — du
  // document utilisateur, que seule une activation écrit et qu'une expiration
  // efface. Les périodes en attente restent exposées via `pendingPayment`.
  const monthly = subs;
  const activeSub = monthly.find(
    (s) => s.status === "active" && s.endDate != null && s.endDate > now,
  );
  const pendingSub = monthly.find((s) => s.status === "pending");
  const paidPeriods = monthly.filter((s) => s.status === "active" || s.status === "expired");
  const reference = activeSub ?? paidPeriods[0] ?? null;

  const subscriptionEndDate =
    activeSub?.endDate ?? user.subscriptionEndDate ?? reference?.endDate ?? null;
  const subscriptionStartDate =
    activeSub?.startDate ?? user.subscriptionStartDate ?? reference?.startDate ?? null;

  // ── Compatibilité profil ↔ abonnement (règle obligatoire) ──
  const profileCompatibility = await compatibilityFieldsForUser(ctx, user, now);

  // ── Éligibilité à la période d'essai ──
  // Client Pro et profil non résolu : JAMAIS d'essai, quelle que soit la
  // configuration. La décision est prise ici, côté serveur, et consommée par
  // tous les contrôles d'accès (site web et WebView Android).
  const trialEligible = isProfileEligibleForTrial(
    pricing.trial,
    profileCompatibility?.profileRole,
  );

  // L'« Offre gratuite » Client Pro ne s'applique qu'aux profils Client Pro
  // (ou non résolus, traités comme tels) — jamais aux Fournisseurs/Experts.
  const profileRole = profileCompatibility?.profileRole ?? null;
  const freeOffer =
    pricing.clientProFreeOffer && (profileRole == null || profileRole === "client");

  const snapshot = computeSubscriptionSnapshot({
    now,
    isAdmin: user.role === "admin" || user.role === "moderator",
    trialEnabled: pricing.trialEnabled,
    trialEligible,
    freeOffer,
    planPrice: pricing.planPrice,
    currency: pricing.currency,
    profileCompatibility,
    plan: user.subscriptionPlan ?? null,
    trialClaimedAt: user.trialClaimedAt ?? null,
    trialStartDate: user.trialStartDate ?? null,
    trialEndDate: user.trialEndDate ?? null,
    trialDaysTotal: user.trialDaysTotal ?? pricing.trialDays,
    trialPdfAllowed: pricing.trialPdfAllowed,
    subscriptionStartDate,
    subscriptionEndDate,
    subscriptionPlan: reference?.plan ?? user.subscriptionPlan ?? null,
    subscriptionPrice: reference?.amount ?? pricing.planPrice,
    pendingPayment: !activeSub && !!pendingSub,
  });

  // Libellés de compatibilité déjà calculés par `computeSubscriptionSnapshot`.
  return snapshot;
}

// ============================================================================
// Queries
// ============================================================================

/** État d'abonnement de l'utilisateur connecté (réactif, utilisé par « Mon abonnement »). */
export const getMySubscriptionStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return await getUserSubscriptionStatus(ctx, user._id);
  },
});

/** Vue administrateur : état d'essai / abonnement de chaque utilisateur. */
export const listUsersSubscriptionStatus = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) return [];

    const now = Date.now();
    const users = await ctx.db.query("users").collect();

    const rows = await Promise.all(
      users.map(async (user) => {
        const snapshot = await getUserSubscriptionStatus(ctx, user._id, now);
        if (!snapshot) return null;
        return {
          userId: user._id,
          name: user.name ?? null,
          email: user.email ?? null,
          role: user.role ?? null,
          userRole: user.userRole ?? null,
          plan: user.subscriptionPlan ?? null,
          createdAt: user.createdAt ?? user._creationTime,
          statusLabel: PHASE_LABELS[snapshot.status],
          snapshot,
        };
      }),
    );

    return rows
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },
});

// ============================================================================
// Démarrage de l'essai (partagé : inscription, connexion, rattrapage client)
// ============================================================================

export type TrialStartResult = {
  started: boolean;
  reason:
    | "started"
    | "already_used"
    | "trial_disabled"
    | "campaign_closed"
    | "profile_not_eligible"
    | "existing_account_only"
    | "subscription_active"
    | "unknown_user";
  trialEndDate?: number;
};

/**
 * Démarre la période d'essai si — et seulement si — elle est activée par
 * l'administrateur, ouverte (fenêtre de validité), que le profil du compte est
 * éligible (Fournisseur / Expert — jamais Client Pro) et que l'utilisateur n'en
 * a jamais bénéficié.
 *
 * La DURÉE vient de `paymentConfig.trialDurationDays` (1 à 365 jours, réglée
 * dans l'administration) — plus aucune constante codée en dur.
 *
 * Idempotent : les appels répétés (rafraîchissements, plusieurs appareils,
 * clics rapides, appels simultanés) ne prolongent jamais la période, car
 * `trialClaimedAt` est écrit une seule fois et jamais effacé. Un compte ne
 * peut donc pas reconstituer un essai en modifiant son profil.
 *
 * `source` distingue l'inscription du rattrapage : quand l'administrateur
 * réserve l'essai aux nouveaux inscrits (`trialNewAccountsOnly`), le
 * rattrapage des comptes existants est refusé.
 */
export async function startTrialFor(
  ctx: MutationCtx,
  userId: Id<"users">,
  options: { source?: "signup" | "catch_up" } = {},
): Promise<TrialStartResult> {
  const user = await ctx.db.get(userId);
  if (!user) return { started: false, reason: "unknown_user" };

  if (user.trialClaimedAt != null) return { started: false, reason: "already_used" };

  const config = await readTrialConfig(ctx);
  if (!config.enabled) return { started: false, reason: "trial_disabled" };

  const now = Date.now();
  if (!isTrialCampaignOpen(config, now)) return { started: false, reason: "campaign_closed" };

  if (config.newAccountsOnly && options.source !== "signup") {
    return { started: false, reason: "existing_account_only" };
  }

  const profileRole = await resolveProfileRole(ctx, user);
  if (!isProfileEligibleForTrial(config, profileRole)) {
    return { started: false, reason: "profile_not_eligible" };
  }

  // Un abonnement mensuel actif désactive l'essai (l'abonné n'en a pas besoin).
  const subs = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  if (subs.some((s) => s.endDate != null && s.endDate > now && s.status !== "canceled")) {
    return { started: false, reason: "subscription_active" };
  }

  const trialEndDate = trialEndDateFor(config, now);
  const daysTotal = Math.max(1, daysRemainingUntil(trialEndDate, now));

  await ctx.db.patch(userId, {
    trialClaimedAt: now,
    trialStartDate: now,
    trialEndDate,
    trialDaysTotal: daysTotal,
    trialDaysRemaining: daysTotal,
    subscriptionStatus: "trialing",
    updatedAt: now,
  });

  try {
    await ctx.db.insert("notifications", {
      userId,
      type: "subscription",
      title: "Votre période d'essai a démarré",
      message: `Profitez de ${daysTotal} jour${daysTotal > 1 ? "s" : ""} d'essai gratuit. Votre essai se termine le ${formatDateFr(trialEndDate)}.`,
      read: false,
      link: "/dashboard/pricing",
      createdAt: now,
    });
  } catch {
    // Notification optionnelle
  }

  return { started: true, reason: "started", trialEndDate };
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Rattrapage côté client : démarre l'essai si l'utilisateur y a droit.
 * Sert aux comptes existants (créés avant la mise en place de l'essai) et
 * après une réinitialisation d'appareil ; sans effet si l'essai est déjà
 * consommé.
 */
export const startMyTrial = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    return await startTrialFor(ctx, user._id, { source: "catch_up" });
  },
});

// ============================================================================
// Forfait par défaut (configuration administrée)
// ============================================================================

/**
 * Forfait par défaut des nouveaux comptes :
 *   - `"trial"`     : aucun forfait payé n'est attribué — la période d'essai
 *                     gratuite (configurée par l'administrateur) s'applique ;
 *   - `"client_pro"` : abonnement Client Pro (30 jours) attribué d'office.
 * La valeur historique `"free"` (forfait supprimé) est interprétée comme
 * `"trial"` pour les documents `paymentConfig` encore enregistrés.
 */
export type DefaultPlanValue = "trial" | "client_pro";

/**
 * Attribue le FORFAIT PAR DÉFAUT configuré par l'administrateur à un NOUVEL
 * utilisateur (appelé à l'inscription uniquement).
 *
 * Règles :
 *   - ne remplace JAMAIS un forfait déjà défini → les utilisateurs existants
 *     restent strictement inchangés ;
 *   - lit toujours la configuration Convex (`paymentConfig.defaultPlan`),
 *     jamais une valeur codée en dur ;
 *   - n'attribue jamais un forfait désactivé (repli sur « aucun forfait »,
 *     donc sur la période d'essai si elle est activée) ;
 *   - ne supprime aucune donnée.
 */
export async function applyDefaultPlanForNewUser(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<{ applied: boolean; plan: DefaultPlanValue | null }> {
  const user = await ctx.db.get(userId);
  if (!user) return { applied: false, plan: null };
  // Un forfait explicitement choisi / déjà attribué n'est jamais remplacé.
  if (user.subscriptionPlan != null) return { applied: false, plan: null };

  const config = await ctx.db.query("paymentConfig").order("desc").first();
  const now = Date.now();
  const requested: DefaultPlanValue = config?.defaultPlan === "client_pro" ? "client_pro" : "trial";
  const clientProEnabled = config?.clientProEnabled !== false;

  // Un forfait désactivé n'est jamais attribué : repli sur « aucun forfait ».
  const plan: DefaultPlanValue =
    requested === "client_pro" && clientProEnabled ? "client_pro" : "trial";

  if (plan === "client_pro") {
    // Client Pro : abonnement mensuel (30 jours) actif attribué par défaut.
    const endDate = now + MONTHLY_DURATION_DAYS * DAY_MS;
    await ctx.db.patch(userId, {
      subscriptionPlan: "pro",
      subscriptionStartDate: now,
      subscriptionEndDate: endDate,
      subscriptionDaysTotal: MONTHLY_DURATION_DAYS,
      subscriptionDaysRemaining: MONTHLY_DURATION_DAYS,
      subscriptionStatus: "active",
      updatedAt: now,
    });
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!existing) {
      await ctx.db.insert("subscriptions", {
        userId,
        plan: "pro",
        status: "active",
        startDate: now,
        endDate,
        paymentMethod: "default_plan",
        amount: 0,
        currency: "TND",
        monthlyDownloadCount: 0,
        downloadLimit: Infinity,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { applied: true, plan: "client_pro" };
  }

  // « Aucun forfait » : rien n'est écrit sur le compte. La période d'essai est
  // démarrée séparément par `startTrialFor` (même configuration serveur).
  return { applied: false, plan: "trial" };
}

/**
 * Point d'entrée interne (test / automatisation) : applique le forfait par
 * défaut à un utilisateur. Réservé au backend.
 */
export const applyDefaultPlanOnSignup = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => applyDefaultPlanForNewUser(ctx, args.userId),
});

/**
 * Point d'entrée interne de l'INSCRIPTION : démarre la période d'essai avec la
 * source « signup » (seule source autorisée quand l'administrateur réserve
 * l'essai aux nouveaux inscrits). Même fonction que le callback d'authentification.
 */
export const startTrialOnSignup = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => startTrialFor(ctx, args.userId, { source: "signup" }),
});

// ============================================================================
// Cron — fin d'essai / fin d'abonnement & décrément des compteurs
// ============================================================================

/**
 * Vérifie quotidiennement les périodes essai / mensuel :
 *   - essai terminé      → statut « Essai expiré » + notification + e-mail
 *   - abonnement terminé → statut « Expiré » (miroir ; l'e-mail et la remise à
 *                          zéro du forfait restent gérés par
 *                          `emailNotifications.checkExpiredSubscriptions`)
 *   - périodes en cours  → `…DaysRemaining` recalculés depuis l'horloge serveur
 */
export const checkSubscriptionPeriods = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const users = await ctx.db.query("users").collect();

    let trialsExpired = 0;
    let subscriptionsExpired = 0;
    let countersRefreshed = 0;

    for (const user of users) {
      // Une seule écriture par utilisateur : on calcule le patch complet.
      const patch: Record<string, number | string | undefined> = {};

      const trialRemaining = daysRemainingUntil(user.trialEndDate, now);
      const subRemaining = daysRemainingUntil(user.subscriptionEndDate, now);
      const hasActiveSub = subRemaining > 0;

      if (trialRemaining !== (user.trialDaysRemaining ?? 0)) {
        patch.trialDaysRemaining = trialRemaining;
      }
      if (subRemaining !== (user.subscriptionDaysRemaining ?? 0)) {
        patch.subscriptionDaysRemaining = subRemaining;
      }

      // Essai terminé → accès payant requis, une seule fois.
      if (
        user.trialClaimedAt != null &&
        user.trialEndDate != null &&
        user.trialEndDate <= now &&
        !hasActiveSub &&
        user.subscriptionStatus !== "trial_expired"
      ) {
        patch.subscriptionStatus = "trial_expired";
        patch.trialDaysRemaining = 0;
        trialsExpired++;

        try {
          await ctx.db.insert("notifications", {
            userId: user._id,
            type: "subscription",
            title: "Votre période d'essai est terminée",
            message:
              "Votre période d'essai gratuit est terminée. Veuillez choisir une offre pour continuer à utiliser la plateforme.",
            read: false,
            link: "/dashboard/pricing",
            createdAt: now,
          });
        } catch {
          // Notification optionnelle
        }

        if (user.email && user.emailNotifications !== false) {
          await scheduleEmailEvent(ctx, {
            to: user.email,
            recipientName: user.name || undefined,
            templateKey: "subscription_expired",
            vars: {
              ...splitName(user.name),
              typeAbonnement: "Essai gratuit",
              dateActivation: formatDateFr(user.trialStartDate),
              dateExpiration: formatDateFr(user.trialEndDate),
            },
            dedupeKey: `trial_expired:${user.email}:${user.trialClaimedAt}`,
            sendToAdmins: true,
          });
        }
      }

      // Abonnement mensuel terminé → miroir de statut (e-mail géré ailleurs).
      if (
        !hasActiveSub &&
        user.subscriptionEndDate != null &&
        user.subscriptionEndDate <= now &&
        user.subscriptionStatus === "active"
      ) {
        patch.subscriptionStatus = "expired";
        patch.subscriptionDaysRemaining = 0;
        subscriptionsExpired++;
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(user._id, { ...patch, updatedAt: now });
        countersRefreshed++;
      }
    }

    return { trialsExpired, subscriptionsExpired, countersRefreshed };
  },
});

// ============================================================================
// MIGRATION — ancien forfait « Free » (supprimé) → essai (profils éligibles)
// ============================================================================
// Le forfait Free n'est plus proposé. Les comptes qui le portent encore sont
// convertis SANS AUCUNE PERTE : projets, devis, DQE, matériaux, abonnements
// payants, factures et historiques restent intacts. Seul le libellé de forfait
// « free » est retiré ; l'essai gratuit n'est appliqué qu'aux profils éligibles
// (Fournisseur / Expert) qui n'en ont jamais bénéficié — les comptes Client Pro
// n'en reçoivent JAMAIS (une seule fois — `trialClaimedAt` reste immuable).
//
// La migration est :
//   - réservée aux administrateurs ;
//   - idempotente (les comptes déjà convertis ne sont plus sélectionnés) ;
//   - disponible en simulation (`dryRun`) avant toute écriture.

export const getFreePlanMigrationPreview = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) return null;

    const users = await ctx.db.query("users").collect();
    const legacy = users.filter((u) => u.subscriptionPlan === "free");
    return {
      total: legacy.length,
      sample: legacy.slice(0, 8).map((u) => ({ name: u.name ?? null, email: u.email ?? null })),
    };
  },
});

export const migrateLegacyFreePlanUsers = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const dryRun = args.dryRun === true;
    const now = Date.now();
    const users = await ctx.db.query("users").collect();
    const legacy = users.filter((u) => u.subscriptionPlan === "free");

    let migrated = 0;
    let trialsStarted = 0;
    let paidPreserved = 0;

    for (const user of legacy) {
      const subs = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      const activePaid = subs.find(
        (s) => s.status === "active" && s.endDate != null && s.endDate > now,
      );

      if (!dryRun) {
        if (activePaid && activePaid.plan !== "free") {
          // Un abonnement payant est actif : il devient le forfait de référence.
          paidPreserved++;
          await ctx.db.patch(user._id, {
            subscriptionPlan: activePaid.plan,
            updatedAt: now,
          });
        } else {
          // Aucun forfait payé : le compte passe au mécanisme d'essai.
          const trial = await startTrialFor(ctx, user._id, { source: "catch_up" });
          if (trial.started) trialsStarted++;

          const patch: Record<string, unknown> = {
            subscriptionPlan: undefined,
            updatedAt: now,
          };
          if (!trial.started) {
            // Statut miroir : plus aucun accès "Free" permanent.
            const trialStillActive =
              user.trialEndDate != null && user.trialEndDate > now && user.trialClaimedAt != null;
            patch.subscriptionStatus = trialStillActive
              ? "trialing"
              : user.trialClaimedAt != null
                ? "trial_expired"
                : "none";
            if (!trialStillActive) patch.subscriptionDaysRemaining = 0;
          }
          await ctx.db.patch(user._id, patch);
        }
        migrated++;
      }
    }

    if (!dryRun && legacy.length > 0) {
      try {
        await ctx.db.insert("adminLogs", {
          adminId: admin._id,
          adminName: admin.name,
          action: "migrate_free_plan_users",
          details:
            `Forfait Free supprimé : ${migrated} compte(s) converti(s), ` +
            `${trialsStarted} essai(s) démarré(s), ${paidPreserved} abonnement(s) payant(s) conservé(s).`,
          createdAt: now,
        });
      } catch {
        // Journal optionnel
      }
    }

    return {
      dryRun,
      candidates: legacy.length,
      migrated,
      trialsStarted,
      paidPreserved,
    };
  },
});
