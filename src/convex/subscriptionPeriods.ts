// ============================================================================
// PÉRIODE D'ESSAI (7 JOURS) & ABONNEMENT MENSUEL (30 JOURS) — LOGIQUE PURE
// ============================================================================
// Ce module ne dépend d'AUCUN autre module Convex : il ne contient que des
// constantes, des types et des fonctions pures. Il peut donc être importé par
// `subscriptionStatus.ts` (queries/mutations/cron), `access.ts` (contrôle
// d'accès), `subscriptions.ts` et `users.ts` sans créer de cycle d'import.
//
// Règle centrale :
//   SI « Offre gratuite » activée ET essai jamais utilisé → Essai gratuit 7 jours
//   SI essai actif                                        → Accès autorisé
//   SI essai expiré                                       → Accès payant requis
//   SI abonnement mensuel actif (30 jours)                → Accès autorisé
//   SI abonnement mensuel expiré                          → Accès payant requis
//
// Tous les calculs s'appuient sur une horloge fournie (côté serveur :
// `Date.now()`), jamais sur la date de l'appareil du visiteur.

export const DAY_MS = 24 * 60 * 60 * 1000;
/** Durée fixe de l'essai gratuit. */
export const TRIAL_DURATION_DAYS = 7;
/** Durée fixe de l'abonnement mensuel. */
export const MONTHLY_DURATION_DAYS = 30;

/** Phases exposées à l'interface (et à l'administration). */
export type SubscriptionPhase =
  | "admin" // admin / modérateur : accès toujours autorisé
  | "active" // abonnement mensuel actif
  | "pending" // paiement en attente de validation
  | "trialing" // essai gratuit en cours
  | "trial_expired" // essai terminé → paiement obligatoire
  | "expired" // abonnement mensuel expiré → renouvellement obligatoire
  | "trial_available" // offre gratuite activée, essai pas encore démarré
  | "none"; // aucun accès (offre gratuite désactivée, jamais d'essai)

export type SubscriptionKind = "monthly" | "trial" | "admin" | "none";

export interface SubscriptionSnapshot {
  status: SubscriptionPhase;
  /** Nature de la période en cours — sert au rendu « Mon abonnement ». */
  type: SubscriptionKind;
  /** Vrai si les services Client Pro sont accessibles maintenant. */
  isActive: boolean;
  /** Vrai si l'utilisateur doit souscrire (ou renouveler) pour retrouver l'accès. */
  requiresPayment: boolean;
  isAdmin: boolean;
  plan: string | null;
  planName: string | null;
  price: number | null;
  currency: string;
  /** Bornes de la période affichée à l'utilisateur. */
  startDate: number | null;
  endDate: number | null;
  /** Essai gratuit. */
  trialUsed: boolean;
  trialDaysTotal: number;
  trialDaysRemaining: number;
  trialStartDate: number | null;
  trialEndDate: number | null;
  /** Abonnement mensuel. */
  subscriptionDaysTotal: number;
  subscriptionDaysRemaining: number;
  subscriptionStartDate: number | null;
  subscriptionEndDate: number | null;
  /** Vrai quand l'essai doit être démarré (offre gratuite + jamais utilisé). */
  trialShouldStart: boolean;
  /** L'« Offre gratuite » (switch admin) est-elle activée pour Client Pro ? */
  freeOfferEnabled: boolean;
  /** ── Compatibilité profil ↔ abonnement (règle obligatoire) ── */
  /** Profil actif résolu (client / supplier / expert ou null). */
  profileRole: "client" | "supplier" | "expert" | null;
  /** Forfait attendu pour ce profil. */
  expectedPlan: string;
  /** Forfait de l'abonnement de référence. */
  activePlan: string | null;
  /** Vrai si le forfait actif correspond exactement au profil actif. */
  planCompatible: boolean;
  /** Libellé du forfait attendu (affichage). */
  expectedPlanLabel: string | null;
  /** Libellé du profil actif (affichage). */
  profileRoleLabel: string | null;
  /** Libellé du forfait de référence (affichage). */
  activePlanLabel: string | null;
}

/** Jours restants (arrondis au jour supérieur), jamais négatifs. */
export function daysRemainingUntil(endDate: number | null | undefined, now: number): number {
  if (endDate == null) return 0;
  if (endDate <= now) return 0;
  return Math.ceil((endDate - now) / DAY_MS);
}

/** Vrai si « Offre gratuite » est activée (prix null ou 0 dans la config). */
export function isFreeOffer(price: number | null | undefined): boolean {
  return price === null || price === 0;
}

export const PLAN_LABELS: Record<string, string> = {
  pro: "Client Pro",
  expert: "Expert",
  supplier: "Fournisseur",
  free: "Gratuit",
};

export function planDisplayName(plan: string | null | undefined): string | null {
  if (!plan) return null;
  return PLAN_LABELS[plan] ?? plan;
}

/** Libellé français d'un forfait attendu (« Client Pro », « Expert »…). */
function planLabel2Label(plan: string | null | undefined): string | null {
  if (!plan) return null;
  const labels: Record<string, string> = {
    pro: "Client Pro",
    expert: "Expert",
    supplier: "Fournisseur",
    free: "Gratuit",
  };
  return labels[plan] ?? plan;
}

/** Libellé français d'un type de profil (« Client Pro », « Expert »…). */
function profileRoleLabel(role: string | null | undefined): string | null {
  if (!role) return null;
  const labels: Record<string, string> = {
    client: "Client Pro",
    supplier: "Fournisseur",
    expert: "Expert",
  };
  return labels[role] ?? role;
}

/** Libellés de statut utilisés par l'interface et l'administration. */
export const PHASE_LABELS: Record<SubscriptionPhase, string> = {
  admin: "Administrateur",
  active: "Abonnement actif",
  pending: "Paiement en attente",
  trialing: "Essai actif",
  trial_expired: "Essai expiré",
  expired: "Abonnement expiré",
  trial_available: "Essai disponible",
  none: "Aucun abonnement",
};

export interface SnapshotInput {
  now: number;
  isAdmin: boolean;
  freeOfferEnabled: boolean;
  planPrice: number | null;
  currency?: string;
  /** Plan enregistré sur le compte (user.subscriptionPlan). */
  plan: string | null;
  /** Marqueur immuable : l'essai a déjà été accordé. */
  trialClaimedAt?: number | null;
  trialStartDate?: number | null;
  trialEndDate?: number | null;
  subscriptionStartDate?: number | null;
  subscriptionEndDate?: number | null;
  /** Plan / prix de l'abonnement mensuel de référence (dernier en date). */
  subscriptionPlan?: string | null;
  subscriptionPrice?: number | null;
  /** Un paiement mensuel est en attente de validation. */
  pendingPayment?: boolean;
  /** ── Compatibilité profil ↔ abonnement (règle obligatoire) ── */
  profileCompatibility?: {
    profileRole: "client" | "supplier" | "expert" | null;
    expectedPlan: string;
    activePlan: string | null;
    compatible: boolean;
  } | null;
}

/**
 * Calcule l'état d'abonnement d'un utilisateur. Fonction pure : la décision ne
 * dépend que des entrées, ce qui la rend testable et impossible à contourner
 * depuis le client (aucune date fournie par le navigateur n'est utilisée).
 */
export function computeSubscriptionSnapshot(input: SnapshotInput): SubscriptionSnapshot {
  const {
    now,
    isAdmin,
    freeOfferEnabled,
    planPrice,
    currency = "TND",
    plan,
    trialClaimedAt,
    trialStartDate,
    trialEndDate,
    subscriptionStartDate,
    subscriptionEndDate,
    subscriptionPlan,
    subscriptionPrice,
    pendingPayment = false,
    profileCompatibility = null,
  } = input;

  const trialUsed = trialClaimedAt != null;
  const trialDaysRemaining = daysRemainingUntil(trialEndDate, now);
  const subscriptionDaysRemaining = daysRemainingUntil(subscriptionEndDate, now);
  const trialActive = trialDaysRemaining > 0 && trialUsed;
  const subscriptionActive = subscriptionDaysRemaining > 0;
  const subscriptionLapsed = subscriptionEndDate != null && subscriptionEndDate <= now;

  const base = {
    isAdmin,
    plan: plan ?? null,
    currency,
    trialUsed,
    trialDaysTotal: TRIAL_DURATION_DAYS,
    trialDaysRemaining: trialActive ? trialDaysRemaining : 0,
    trialStartDate: trialStartDate ?? null,
    trialEndDate: trialEndDate ?? null,
    subscriptionDaysTotal: MONTHLY_DURATION_DAYS,
    subscriptionDaysRemaining: subscriptionActive ? subscriptionDaysRemaining : 0,
    subscriptionStartDate: subscriptionStartDate ?? null,
    subscriptionEndDate: subscriptionEndDate ?? null,
    trialShouldStart: false,
    freeOfferEnabled,
    // ── Compatibilité profil ↔ abonnement ──
    profileRole: profileCompatibility?.profileRole ?? null,
    expectedPlan: profileCompatibility?.expectedPlan ?? "pro",
    activePlan: profileCompatibility?.activePlan ?? null,
    planCompatible: profileCompatibility?.compatible ?? true,
    expectedPlanLabel: planLabel2Label(profileCompatibility?.expectedPlan ?? null),
    profileRoleLabel: profileRoleLabel(profileCompatibility?.profileRole ?? null),
    activePlanLabel: planLabel2Label(profileCompatibility?.activePlan ?? null),
  };

  // Admin / modérateur : accès toujours accordé (bypass de test).
  if (isAdmin) {
    return {
      ...base,
      status: "admin",
      type: "admin",
      isActive: true,
      requiresPayment: false,
      planName: planDisplayName(plan),
      price: null,
      startDate: null,
      endDate: null,
    };
  }

  // 1. Abonnement mensuel actif → accès autorisé, l'essai est désactivé.
  if (subscriptionActive) {
    return {
      ...base,
      status: "active",
      type: "monthly",
      isActive: true,
      requiresPayment: false,
      planName: planDisplayName(subscriptionPlan ?? plan),
      price: subscriptionPrice ?? null,
      startDate: subscriptionStartDate ?? null,
      endDate: subscriptionEndDate ?? null,
    };
  }

  // 2. Paiement en attente de validation → pas encore d'accès, pas de renouvellement à demander.
  if (pendingPayment) {
    return {
      ...base,
      status: "pending",
      type: "monthly",
      isActive: false,
      requiresPayment: false,
      planName: planDisplayName(subscriptionPlan ?? plan),
      price: subscriptionPrice ?? null,
      startDate: subscriptionStartDate ?? null,
      endDate: subscriptionEndDate ?? null,
    };
  }

  // 3. Essai gratuit actif → accès autorisé.
  if (trialActive) {
    return {
      ...base,
      status: "trialing",
      type: "trial",
      isActive: true,
      requiresPayment: false,
      planName: "Essai gratuit",
      price: null,
      startDate: trialStartDate ?? null,
      endDate: trialEndDate ?? null,
    };
  }

  // 4. Abonnement mensuel expiré → renouvellement obligatoire.
  if (subscriptionLapsed) {
    return {
      ...base,
      status: "expired",
      type: "monthly",
      isActive: false,
      requiresPayment: true,
      planName: planDisplayName(subscriptionPlan ?? plan),
      price: subscriptionPrice ?? null,
      startDate: subscriptionStartDate ?? null,
      endDate: subscriptionEndDate ?? null,
    };
  }

  // 5. Essai déjà utilisé (et terminé) → paiement obligatoire, jamais renouvelé.
  if (trialUsed) {
    return {
      ...base,
      status: "trial_expired",
      type: "trial",
      isActive: false,
      requiresPayment: true,
      planName: "Essai gratuit",
      price: null,
      startDate: trialStartDate ?? null,
      endDate: trialEndDate ?? null,
    };
  }

  // 6. Offre gratuite activée + essai jamais utilisé → 7 jours offerts.
  if (freeOfferEnabled) {
    return {
      ...base,
      status: "trial_available",
      type: "trial",
      isActive: true,
      requiresPayment: false,
      planName: "Essai gratuit",
      price: null,
      startDate: null,
      endDate: null,
      trialShouldStart: true,
    };
  }

  // 7. Aucun accès : offre gratuite désactivée et essai jamais accordé.
  return {
    ...base,
    status: "none",
    type: "none",
    isActive: false,
    requiresPayment: true,
    planName: planDisplayName(plan),
    price: planPrice,
    startDate: null,
    endDate: null,
  };
}
