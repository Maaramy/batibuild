import { query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { api } from "./_generated/api";
import { getUserSubscriptionStatus } from "./subscriptionStatus";
import { resolveProfileRole, type UserRole } from "./profileSubscription";

// ============================================================================
// Accès aux services Client Pro
// ============================================================================
// Règle : pour utiliser les services de la plateforme (projets de construction,
// projets d'investissement, matériaux IA, plans architecturaux, suivi de A à Z),
// le client doit disposer d'un abonnement Client Pro PAYANT actif.
//   - Abonnement expiré  → renouvellement obligatoire pour maintenir l'accès.
//   - Exception          → l'administrateur peut activer le « switch gratuit »
//                          sur le forfait Client Pro (prix null dans la config) :
//                          dans ce cas l'accès est accordé sans paiement.
//   - Admin / modérateur → accès toujours accordé (bypass de test).

export type ClientProAccessReason =
  | "ok"
  | "not_client_pro"
  | "plan_not_allowed_for_profile"
  | "no_subscription"
  | "pending"
  | "expired"
  | "trial_expired";

export interface ClientProAccess {
  allowed: boolean;
  reason: ClientProAccessReason;
}

export const CLIENT_PRO_ACCESS_MARKER = "CLIENT_PRO_ACCESS:";

/** État « Offre gratuite » (switch admin) pour chaque forfait — prix null ou 0. */
export interface FreePlanStatus {
  proFree: boolean;
  supplierFree: boolean;
  expertFree: boolean;
}

export async function getFreePlanStatus(ctx: any): Promise<FreePlanStatus> {
  try {
    const pricing = await ctx.runQuery(api.payments.getPublicPricing);
    const isFree = (p: number | null | undefined) => p === null || p === 0;
    return {
      proFree: isFree(pricing?.proPrice),
      supplierFree: isFree(pricing?.supplierPrice),
      expertFree: isFree(pricing?.expertPrice),
    };
  } catch {
    // Config illisible → règle payante par défaut
    return { proFree: false, supplierFree: false, expertFree: false };
  }
}

/**
 * Visibilité d'un profil professionnel (Expert / Fournisseur).
 *
 * Règle produit : un profil dont le paiement n'est pas actif reste STRICTEMENT
 * invisible pour les utilisateurs, quel que soit le champ `isVisible` — la
 * gestion de la visibilité est verrouillée côté serveur et ne peut pas être
 * modifiée par l'utilisateur (l'administrateur seul la contrôle).
 *
 * - « Offre gratuite » (switch admin, prix null/0) : tous les profils sont
 *   actifs sans paiement.
 * - Sinon : l'abonnement doit être actif (ou essai legacy) ET non expiré.
 */
export interface PaymentGatedProfile {
  isVisible?: boolean | null;
  subscriptionStatus?: string | null;
  subscriptionEndDate?: number | null;
}

/**
 * Le paiement couvre-t-il l'espace de ce profil ? (offre gratuite, abonnement
 * actif non expiré, ou essai legacy encore dans les délais.)
 */
export async function isProfilePaymentActive(
  ctx: any,
  freePlanEnabled: boolean,
  profile: PaymentGatedProfile,
  now = Date.now(),
): Promise<boolean> {
  if (freePlanEnabled) return true;
  const status = profile.subscriptionStatus;
  if (status !== "active" && status !== "trial") return false;
  if (
    status === "active" &&
    profile.subscriptionEndDate &&
    profile.subscriptionEndDate < now
  ) {
    return false;
  }
  return true;
}

/** Message d'erreur standard renvoyé par les fonctions backend gatées. */
export function clientProAccessError(service: string): Error {
  return new Error(
    `${CLIENT_PRO_ACCESS_MARKER}L'accès à « ${service} » nécessite un abonnement Client Pro payant actif. ` +
      "En cas d'expiration, le renouvellement est obligatoire pour maintenir l'accès.",
  );
}

/**
 * Calcule l'accès Client Pro d'un utilisateur (requêtes, mutations, actions).
 *
 * Toute la décision vient de `getUserSubscriptionStatus` (source de vérité
 * unique) : essai gratuit de 7 jours quand l'« Offre gratuite » est activée,
 * puis abonnement mensuel de 30 jours ; après l'échéance de l'un ou de
 * l'autre, le paiement (ou le renouvellement) devient obligatoire.
 */
export async function getClientProAccess(ctx: any, user: any): Promise<ClientProAccess> {
  if (!user) return { allowed: false, reason: "no_subscription" };
  // Admin / modérateur : accès toujours accordé
  if (user.role === "admin" || user.role === "moderator") {
    return { allowed: true, reason: "ok" };
  }

  // ── Règle obligatoire : les services Client Pro exigent le profil Client Pro ──
  // Vérification backend (profil explicite, ou inféré des profils spécialisés).
  // Un Expert ou un Fournisseur n'accède JAMAIS aux fonctionnalités Client Pro,
  // même avec un abonnement payant actif.
  //
  // Les requêtes/mutations ont `ctx.db` ; les actions n'ont PAS `ctx.db` et
  // passent par la query publique `getMyProfileRole` (même utilisateur).
  let profileRole: UserRole | null;
  if (ctx.db) {
    profileRole = await resolveProfileRole(ctx, user);
  } else {
    profileRole = (await ctx.runQuery(api.profileSubscription.getMyProfileRole)) as UserRole | null;
  }
  if (profileRole !== null && profileRole !== "client") {
    return { allowed: false, reason: "not_client_pro" };
  }

  // Les actions n'ont PAS accès à ctx.db → on passe par la query publique.
  const snapshot: any = ctx.db
    ? await getUserSubscriptionStatus(ctx, user._id)
    : await ctx.runQuery(api.subscriptionStatus.getMySubscriptionStatus);

  // Période active (essai gratuit, abonnement mensuel ou « Offre gratuite »)
  // ET forfait compatible avec le profil — sinon refus.
  if (snapshot?.isActive && snapshot?.planCompatible !== false) {
    return { allowed: true, reason: "ok" };
  }
  if (snapshot?.isActive && snapshot?.planCompatible === false) {
    return { allowed: false, reason: "plan_not_allowed_for_profile" };
  }

  if (snapshot?.status === "pending") return { allowed: false, reason: "pending" };
  if (snapshot?.status === "trial_expired") return { allowed: false, reason: "trial_expired" };
  if (snapshot?.status === "expired") return { allowed: false, reason: "expired" };

  // Aucun essai accordé et offre gratuite désactivée : l'utilisateur n'a jamais
  // été Client Pro (ou son forfait n'est plus reconnu).
  if (user.subscriptionPlan !== "pro" && snapshot?.type !== "trial") {
    return { allowed: false, reason: "not_client_pro" };
  }

  return { allowed: false, reason: "no_subscription" };
}

/** Lève une erreur si l'utilisateur n'a pas accès aux services Client Pro. */
export async function requireClientProAccess(ctx: any, user: any, service: string): Promise<void> {
  const access = await getClientProAccess(ctx, user);
  if (!access.allowed) {
    throw clientProAccessError(service);
  }
}

/** État d'accès Client Pro (réactif) — consommé par l'interface. */
export const checkClientProAccess = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const access = await getClientProAccess(ctx, user);
    const snapshot = user ? await getUserSubscriptionStatus(ctx, user._id) : null;
    return {
      ...access,
      plan: user?.subscriptionPlan ?? null,
      endDate: user?.subscriptionEndDate ?? null,
      isAdmin: user?.role === "admin" || user?.role === "moderator",
      // Profil actif + compatibilité (affichage et messages de paywall).
      profileRole: snapshot?.profileRole ?? null,
      expectedPlan: snapshot?.expectedPlan ?? "pro",
      planCompatible: snapshot?.planCompatible ?? true,
      // Détail de la période en cours (essai / abonnement) pour l'interface.
      status: snapshot?.status ?? "none",
      type: snapshot?.type ?? "none",
      requiresPayment: snapshot?.requiresPayment ?? true,
      trialDaysRemaining: snapshot?.trialDaysRemaining ?? 0,
      subscriptionDaysRemaining: snapshot?.subscriptionDaysRemaining ?? 0,
    };
  },
});
