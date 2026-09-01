import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { api } from "./_generated/api";

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
  | "expired";

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

/** Calcule l'accès Client Pro d'un utilisateur (requêtes, mutations, actions). */
export async function getClientProAccess(ctx: any, user: any): Promise<ClientProAccess> {
  if (!user) return { allowed: false, reason: "no_subscription" };
  // Admin / modérateur : accès toujours accordé
  if (user.role === "admin" || user.role === "moderator") {
    return { allowed: true, reason: "ok" };
  }

  // Exception : l'administrateur a activé le « switch gratuit » sur Client Pro
  // (prix null ou 0 dans la config) → activation AUTOMATIQUE des services,
  // sans choix de forfait ni paiement, quel que soit le plan de l'utilisateur.
  const free = await getFreePlanStatus(ctx);
  if (free.proFree) {
    return { allowed: true, reason: "ok" };
  }

  if (user.subscriptionPlan !== "pro") {
    return { allowed: false, reason: "not_client_pro" };
  }

  // Abonnement Client Pro payant, actif et non expiré
  const now = Date.now();
  const subs = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
    .collect();

  const proSub = subs
    .filter((s: any) => s.plan === "pro")
    .sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];

  if (!proSub) return { allowed: false, reason: "no_subscription" };
  if (proSub.status === "pending") return { allowed: false, reason: "pending" };
  if (proSub.endDate && proSub.endDate < now) return { allowed: false, reason: "expired" };
  if ((proSub.amount ?? 0) <= 0) return { allowed: false, reason: "no_subscription" };

  return { allowed: true, reason: "ok" };
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
    return {
      ...access,
      plan: user?.subscriptionPlan ?? null,
      endDate: user?.subscriptionEndDate ?? null,
      isAdmin: user?.role === "admin" || user?.role === "moderator",
    };
  },
});
