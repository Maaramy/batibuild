import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { scheduleEmailEvent, formatDateFr, splitName } from "./emailNotifications";
import {
  DAY_MS,
  PHASE_LABELS,
  TRIAL_DURATION_DAYS,
  computeSubscriptionSnapshot,
  daysRemainingUntil,
  isFreeOffer,
  type SubscriptionSnapshot,
} from "./subscriptionPeriods";

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
  freeOfferEnabled: boolean;
  planPrice: number | null;
  currency: string;
}

/** Contextes autorisés : requêtes, mutations et crons (tous ont `ctx.db`). */
type DbCtx = QueryCtx | MutationCtx;

async function readPricing(ctx: DbCtx): Promise<PricingInfo> {
  const config = await ctx.db.query("paymentConfig").order("desc").first();
  return {
    freeOfferEnabled: isFreeOffer(config?.proPrice),
    planPrice: config?.proPrice ?? null,
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

  const pricing = await readPricing(ctx);

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
  const monthly = subs.filter((s) => s.kind !== "investment");
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

  return computeSubscriptionSnapshot({
    now,
    isAdmin: user.role === "admin" || user.role === "moderator",
    freeOfferEnabled: pricing.freeOfferEnabled,
    planPrice: pricing.planPrice,
    currency: pricing.currency,
    plan: user.subscriptionPlan ?? null,
    trialClaimedAt: user.trialClaimedAt ?? null,
    trialStartDate: user.trialStartDate ?? null,
    trialEndDate: user.trialEndDate ?? null,
    subscriptionStartDate,
    subscriptionEndDate,
    subscriptionPlan: reference?.plan ?? user.subscriptionPlan ?? null,
    subscriptionPrice: reference?.amount ?? pricing.planPrice,
    pendingPayment: !activeSub && !!pendingSub,
  });
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
    | "free_offer_disabled"
    | "subscription_active"
    | "unknown_user";
  trialEndDate?: number;
};

/**
 * Démarre l'essai gratuit de 7 jours si — et seulement si — l'« Offre
 * gratuite » est activée et que l'utilisateur n'en a jamais bénéficié.
 * Idempotent : les appels répétés (rafraîchissements, plusieurs appareils,
 * clics rapides, appels simultanés) ne prolongent jamais la période, car
 * `trialClaimedAt` est écrit une seule fois et jamais effacé.
 *
 * Utilisé à l'inscription (`auth.callbacks.afterUserCreatedOrUpdated`) et en
 * rattrapage côté client (`startMyTrial`) pour les comptes créés avant la mise
 * en place de l'essai.
 */
export async function startTrialFor(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<TrialStartResult> {
  const user = await ctx.db.get(userId);
  if (!user) return { started: false, reason: "unknown_user" };

  if (user.trialClaimedAt != null) return { started: false, reason: "already_used" };

  const pricing = await readPricing(ctx);
  if (!pricing.freeOfferEnabled) return { started: false, reason: "free_offer_disabled" };

  const now = Date.now();

  // Un abonnement mensuel actif désactive l'essai (l'abonné n'en a pas besoin).
  const subs = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  if (subs.some((s) => s.endDate != null && s.endDate > now && s.status !== "canceled")) {
    return { started: false, reason: "subscription_active" };
  }

  const trialEndDate = now + TRIAL_DURATION_DAYS * DAY_MS;

  await ctx.db.patch(userId, {
    trialClaimedAt: now,
    trialStartDate: now,
    trialEndDate,
    trialDaysTotal: TRIAL_DURATION_DAYS,
    trialDaysRemaining: TRIAL_DURATION_DAYS,
    subscriptionStatus: "trialing",
    updatedAt: now,
  });

  try {
    await ctx.db.insert("notifications", {
      userId,
      type: "subscription",
      title: "Votre essai gratuit a démarré",
      message: `Profitez de ${TRIAL_DURATION_DAYS} jours d'essai gratuit. Votre essai se termine le ${formatDateFr(trialEndDate)}.`,
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
    return await startTrialFor(ctx, user._id);
  },
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
