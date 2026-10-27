import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { resolveProfileRole } from "./profileSubscription";
import { DAY_MS } from "./subscriptionPeriods";

// ============================================================================
// SYNCHRONISATION DES PROFILS EXPERT / FOURNISSEUR AVEC LEURS DROITS
// ----------------------------------------------------------------------------
// Une seule règle, appliquée dans les DEUX sens (activation ET suspension) :
//
//   Un profil Expert / Fournisseur est ACTIF et VISIBLE si le compte dispose,
//   pour ce forfait, de :
//     • l'« Offre gratuite » du forfait (interrupteur administrateur) ; ou
//     • une période d'essai EN COURS (date de fin future, horloge serveur) ; ou
//     • un abonnement mensuel PAYÉ non expiré.
//   Sinon il est suspendu : statut « expired », masqué de l'annuaire, des
//   recommandations et de la mise en relation — SANS aucune suppression
//   (profil, spécialité, coordonnées, annonces et historique conservés).
//
// Ce module ne touche JAMAIS :
//   • aux profils Client Pro ni à la cotisation par crédits de projets ;
//   • au compte, à la table `subscriptions`, aux paiements ni aux factures :
//     il n'écrit que les champs d'état des profils expert / fournisseur ;
//   • à un profil masqué volontairement par l'administrateur (`isVisible: false`
//     avec un statut `active` / `trial` reste tel quel) ;
//   • aux demandes de paiement en attente de validation (`pending` reste
//     `pending` : seul l'administrateur valide un reçu) ;
//   • à un compte désactivé (décision d'administration).
//
// Toute décision est prise côté serveur à partir de l'horloge serveur : un
// rafraîchissement, une reconnexion, une modification de profil côté client ou
// un changement d'appareil ne peut ni accorder ni prolonger un droit.
//
// Appelé par : l'inscription et le choix du profil (`users.setUserRole`), la
// création d'un profil professionnel, la sauvegarde de la configuration d'essai
// (activation par l'administrateur) et le cron quotidien — un seul chemin de
// décision, donc aucune divergence possible entre l'espace utilisateur,
// l'administration, la recherche et la mise en relation.
// ============================================================================

/** Rôle professionnel concerné : seuls Expert et Fournisseur. */
export type ProfessionalRole = "expert" | "supplier";

/**
 * Fenêtre pendant laquelle un compte est considéré « nouvel inscrit ».
 * Même règle que `users.setUserRole` : elle décide uniquement de la SOURCE de
 * l'essai (« inscription » ou « rattrapage »), donc du respect de la restriction
 * « nouveaux inscrits » réglée par l'administrateur.
 */
export const NEW_ACCOUNT_WINDOW_MS = 7 * DAY_MS;

/** Un profil professionnel, quelle que soit sa table. */
type ProfessionalProfileDoc = Doc<"expertProfiles"> | Doc<"supplierProfiles">;

/** Nature du droit qui ouvre l'espace professionnel. */
export type ProfessionalEntitlementKind = "free_plan" | "trial" | "subscription" | "none";

export interface ProfessionalEntitlement {
  /** Un droit valide ouvre-t-il l'espace professionnel à cet instant ? */
  entitled: boolean;
  kind: ProfessionalEntitlementKind;
  /** Fin du droit (null = « offre gratuite » sans échéance, ou aucun droit). */
  endDate: number | null;
  /** Début du droit (essai démarré / abonnement payé). */
  startDate: number | null;
}

export interface ProfessionalFreePlans {
  expertFree: boolean;
  supplierFree: boolean;
}

export interface ProfessionalProfileSyncResult {
  /** Profils (ré)activés ou réalignés sur un droit valide. */
  activated: number;
  /** Profils suspendus faute de droit valide (essai / abonnement échu). */
  suspended: number;
  /** Profils déjà cohérents — jamais réécrits. */
  unchanged: number;
}

type SyncOutcome = "activated" | "suspended" | "unchanged";

/**
 * « Offre gratuite » des forfaits Expert / Fournisseur (switch administrateur,
 * prix nul ou zéro). Lecture identique au contrôle de visibilité : en cas de
 * configuration illisible, la règle PAYANTE s'applique — aucun droit n'est
 * accordé par défaut.
 */
export async function readProfessionalFreePlans(ctx: MutationCtx): Promise<ProfessionalFreePlans> {
  try {
    const pricing = await ctx.runQuery(api.payments.getPublicPricing);
    const isFree = (price: number | null | undefined) => price === null || price === 0;
    return {
      expertFree: isFree(pricing?.expertPrice),
      supplierFree: isFree(pricing?.supplierPrice),
    };
  } catch {
    return { expertFree: false, supplierFree: false };
  }
}

/**
 * Droits professionnels RÉELS d'un compte pour un forfait donné.
 *
 * Priorité : offre gratuite → abonnement PAYÉ valide → essai en cours. Un
 * abonnement payé l'emporte toujours sur l'essai : un compte en essai qui paie
 * ne doit jamais être ramené au statut d'essai (ni à l'échéance de l'essai).
 * Les dates sont comparées à l'horloge serveur ; l'enregistrement
 * `subscriptions` fait foi pour un abonnement payé, avec repli sur les dates du
 * compte lorsque son forfait correspond (activation par un autre chemin).
 */
export async function resolveProfessionalEntitlement(
  ctx: MutationCtx,
  role: ProfessionalRole,
  user: Doc<"users">,
  profile: { subscriptionStatus?: string | null; subscriptionEndDate?: number | null },
  now: number,
  freePlans: ProfessionalFreePlans,
): Promise<ProfessionalEntitlement> {
  const none: ProfessionalEntitlement = {
    entitled: false,
    kind: "none",
    endDate: null,
    startDate: null,
  };

  if (role === "expert" ? freePlans.expertFree : freePlans.supplierFree) {
    return { entitled: true, kind: "free_plan", endDate: null, startDate: null };
  }

  // 1. Abonnement mensuel payé et non expiré, POUR CE FORFAIT : un abonnement
  //    Expert n'ouvre jamais l'espace Fournisseur, et inversement. Il est
  //    examiné AVANT l'essai, car un compte en essai qui a payé doit rester
  //    « abonnement actif » et non revenir à l'échéance de son essai.
  const subs = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();
  const activeSub = subs.find(
    (s) => s.plan === role && s.status === "active" && s.endDate != null && s.endDate > now,
  );
  if (activeSub) {
    return {
      entitled: true,
      kind: "subscription",
      endDate: activeSub.endDate ?? null,
      startDate: activeSub.startDate ?? null,
    };
  }
  if (
    user.subscriptionPlan === role &&
    user.subscriptionEndDate != null &&
    user.subscriptionEndDate > now
  ) {
    return {
      entitled: true,
      kind: "subscription",
      endDate: user.subscriptionEndDate,
      startDate: user.subscriptionStartDate ?? null,
    };
  }

  // 2. Période d'essai du compte encore en cours (dates écrites côté serveur).
  if (user.trialClaimedAt != null && user.trialEndDate != null && user.trialEndDate > now) {
    return {
      entitled: true,
      kind: "trial",
      endDate: user.trialEndDate,
      startDate: user.trialStartDate ?? user.trialClaimedAt,
    };
  }

  // 3. Droit porté par le PROFIL lui-même : essai ou abonnement enregistré sur
  //    le profil, tant que son échéance est future — ou sans échéance
  //    enregistrée (données historiques). Exactement la règle du contrôle de
  //    visibilité : la synchronisation ne coupe JAMAIS un profil que ce
  //    contrôle continue d'afficher. Seule une échéance réellement dépassée,
  //    sans aucun droit au niveau du compte, suspend le profil.
  const profileEndDate = profile.subscriptionEndDate ?? null;
  if (profileEndDate == null || profileEndDate > now) {
    if (profile.subscriptionStatus === "trial") {
      return { entitled: true, kind: "trial", endDate: profileEndDate, startDate: null };
    }
    if (profile.subscriptionStatus === "active") {
      return { entitled: true, kind: "subscription", endDate: profileEndDate, startDate: null };
    }
  }

  return none;
}

/**
 * Réconcilie UN profil avec ses droits réels. Idempotent : un profil déjà
 * cohérent n'est jamais réécrit (aucune donnée, aucun horodatage inutile).
 */
async function syncProfileDoc(
  ctx: MutationCtx,
  role: ProfessionalRole,
  profile: ProfessionalProfileDoc,
  now: number,
  freePlans: ProfessionalFreePlans,
): Promise<SyncOutcome> {
  const user = await ctx.db.get(profile.userId);
  // Profil orphelin ou compte désactivé : décision d'administration, jamais
  // remise en cause par la synchronisation automatique.
  if (!user || user.status === "disabled") return "unchanged";

  const status = profile.subscriptionStatus;
  const entitlement = await resolveProfessionalEntitlement(ctx, role, user, profile, now, freePlans);

  // ── Droit terminé → suspension (essai fini ou abonnement échu non renouvelé).
  if (!entitlement.entitled) {
    if (status !== "trial" && status !== "active") return "unchanged";

    await ctx.db.patch(profile._id, {
      subscriptionStatus: "expired",
      isVisible: false,
      updatedAt: now,
    });

    try {
      await ctx.db.insert("notifications", {
        userId: profile.userId,
        type: "subscription",
        title: "Votre profil est temporairement invisible",
        message:
          (status === "trial"
            ? "Votre période d'essai est terminée. "
            : "Votre abonnement mensuel a expiré. ") +
          "Votre profil n'apparaît plus dans les résultats de recherche ni dans la mise en relation. " +
          "Souscrivez ou renouvelez votre abonnement pour rétablir vos services — vos données et votre profil sont conservés.",
        read: false,
        link: role === "expert" ? "/dashboard/expert" : "/dashboard/supplier",
        createdAt: now,
      });
    } catch {
      // Notification optionnelle : elle ne bloque jamais la suspension.
    }

    return "suspended";
  }

  // Offre gratuite : le contrôle de visibilité accorde déjà l'accès quel que
  // soit l'état du profil — aucune écriture n'est nécessaire (et un profil
  // masqué par l'administrateur reste masqué).
  if (entitlement.kind === "free_plan" || entitlement.endDate == null) return "unchanged";

  // ── Droit valide → alignement du profil sur ce droit :
  //   • profil resté « inactive » / « expired » (créé après le démarrage de
  //     l'essai, rattrapage, retour du paiement, écriture interrompue) → il est
  //     (ré)activé et rendu visible ;
  //   • profil dont le statut ou l'échéance ne correspondent plus au droit réel
  //     (abonnement payé attribué par l'administrateur à un profil encore marqué
  //     « trial », demande en attente alors que le paiement est confirmé) → il est
  //     réaligné pour rester VISIBLE : un abonné payant n'est jamais interrompu
  //     par une échéance d'essai dépassée.
  //
  // Exception : une demande en attente de validation (`pending`) n'est jamais
  // convertie par un ESSAI — seul l'administrateur valide un reçu. Elle est en
  // revanche alignée dès qu'un abonnement payé confirmé existe pour ce forfait.
  if (status === "pending" && entitlement.kind !== "subscription") return "unchanged";

  const targetStatus = entitlement.kind === "trial" ? "trial" : "active";
  const needsVisibility = status !== "active" && status !== "trial";
  const alreadyAligned =
    status === targetStatus && profile.subscriptionEndDate === entitlement.endDate;
  // Déjà aligné : aucune réécriture (la synchronisation est idempotente).
  if (alreadyAligned) return "unchanged";

  if (entitlement.kind === "trial") {
    await ctx.db.patch(profile._id, {
      plan: "trial",
      subscriptionStatus: "trial",
      trialStartDate: entitlement.startDate ?? now,
      subscriptionEndDate: entitlement.endDate,
      // Un simple réalignement de dates ne rétablit pas la visibilité à la place
      // de l'administrateur : seuls l'activation et le paiement confirmé le font.
      ...(needsVisibility ? { isVisible: true } : {}),
      updatedAt: now,
    });
  } else {
    await ctx.db.patch(profile._id, {
      plan: "monthly",
      subscriptionStatus: "active",
      subscriptionStartDate: entitlement.startDate ?? now,
      subscriptionEndDate: entitlement.endDate,
      ...(needsVisibility ? { isVisible: true } : {}),
      updatedAt: now,
    });
  }

  return "activated";
}

function record(result: ProfessionalProfileSyncResult, outcome: SyncOutcome): void {
  if (outcome === "activated") result.activated++;
  else if (outcome === "suspended") result.suspended++;
  else result.unchanged++;
}

/** Réconcilie le profil professionnel d'UN compte (essai, abonnement, libre). */
export async function syncProfessionalProfileForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  now = Date.now(),
): Promise<ProfessionalProfileSyncResult> {
  const result: ProfessionalProfileSyncResult = { activated: 0, suspended: 0, unchanged: 0 };

  const user = await ctx.db.get(userId);
  if (!user) return result;

  // Le profil actif du compte décide de la table : Client Pro et particuliers
  // ne sont jamais concernés par cette synchronisation.
  const role = await resolveProfileRole(ctx, user);
  if (role !== "expert" && role !== "supplier") return result;

  const freePlans = await readProfessionalFreePlans(ctx);

  const profile =
    role === "expert"
      ? await ctx.db
          .query("expertProfiles")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .first()
      : await ctx.db
          .query("supplierProfiles")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .first();
  if (!profile) return result;

  record(result, await syncProfileDoc(ctx, role, profile, now, freePlans));
  return result;
}

/**
 * Réconcilie TOUS les profils Expert et Fournisseur avec leurs droits réels :
 * active ceux qui ont un droit valide (essai en cours, abonnement payé, offre
 * gratuite) et suspend ceux dont l'essai ou l'abonnement est terminé sans
 * paiement. Aucune donnée n'est supprimée, aucune écriture inutile.
 */
export async function syncAllProfessionalProfiles(
  ctx: MutationCtx,
  now = Date.now(),
): Promise<ProfessionalProfileSyncResult> {
  const result: ProfessionalProfileSyncResult = { activated: 0, suspended: 0, unchanged: 0 };
  const freePlans = await readProfessionalFreePlans(ctx);

  for (const [role, table] of [
    ["expert", "expertProfiles"],
    ["supplier", "supplierProfiles"],
  ] as const) {
    const profiles = await ctx.db.query(table).collect();
    for (const profile of profiles) {
      record(result, await syncProfileDoc(ctx, role, profile, now, freePlans));
    }
  }

  return result;
}
