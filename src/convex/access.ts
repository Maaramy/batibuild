import { query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { api } from "./_generated/api";
import { getUserSubscriptionStatus } from "./subscriptionStatus";

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

  // Les actions n'ont PAS accès à ctx.db → on passe par la query publique.
  const snapshot: any = ctx.db
    ? await getUserSubscriptionStatus(ctx, user._id)
    : await ctx.runQuery(api.subscriptionStatus.getMySubscriptionStatus);

  // Essai gratuit actif, abonnement mensuel actif ou « Offre gratuite » avant
  // démarrage de l'essai → services accessibles.
  if (snapshot?.isActive) return { allowed: true, reason: "ok" };

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
      // Détail de la période en cours (essai / abonnement) pour l'interface.
      status: snapshot?.status ?? "none",
      type: snapshot?.type ?? "none",
      requiresPayment: snapshot?.requiresPayment ?? true,
      trialDaysRemaining: snapshot?.trialDaysRemaining ?? 0,
      subscriptionDaysRemaining: snapshot?.subscriptionDaysRemaining ?? 0,
    };
  },
});
