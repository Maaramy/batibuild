import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";

// ============================================================================
// COMPATIBILITÉ PROFIL ↔ ABONNEMENT — VALIDATION CENTRALE OBLIGATOIRE
// ============================================================================
// Règle produit : le type d'abonnement doit correspondre EXACTEMENT au type de
// profil actif de l'utilisateur.
//
//   Profil (user.userRole)      → Forfait autorisé (subscriptions.plan)
//   client  (Client Pro)        → pro uniquement
//   supplier (Fournisseur)      → supplier uniquement
//   expert  (Expert)            → expert uniquement
//   particulier / standard      → aucune offre professionnelle (free uniquement)
//
// « free » correspond à l'ABSENCE de forfait payé : il est compatible avec tout
// profil (l'utilisateur n'a simplement rien souscrit).
//
// Cette fonction est la SEULE source de vérité : elle est appelée côté backend
// (Convex) par toutes les mutations et requêtes sensibles — souscription,
// activation, accès aux fonctionnalités professionnelles. La vérification
// frontend n'est qu'un confort d'affichage, jamais une sécurité.

/** Types de profil utilisateur (champ `users.userRole`). */
export type UserRole = "client" | "supplier" | "expert";

/** Forfaits d'abonnement (champ `subscriptions.plan` / `users.subscriptionPlan`). */
export type SubscriptionPlanValue = "free" | "pro" | "expert" | "supplier";

/** Marqueur d'erreur : permet à l'interface d'identifier précisément ce refus. */
export const PROFILE_SUBSCRIPTION_ERROR_MARKER = "PROFILE_SUBSCRIPTION_MISMATCH:";

/** Le forfait attendu pour chaque type de profil. */
export const EXPECTED_PLAN_FOR_PROFILE: Record<UserRole, SubscriptionPlanValue> = {
  client: "pro",
  supplier: "supplier",
  expert: "expert",
};

/** Libellés français des profils. */
export const PROFILE_ROLE_LABELS: Record<UserRole, string> = {
  client: "Client Pro",
  supplier: "Fournisseur",
  expert: "Expert",
};

/** Libellés français des forfaits. */
export const PLAN_VALUE_LABELS: Record<SubscriptionPlanValue, string> = {
  free: "Gratuit",
  pro: "Client Pro",
  expert: "Expert",
  supplier: "Fournisseur",
};

/** Le plan est-il valide pour ce profil ? (« free » et absence de plan → oui). */
export function planBelongsToProfile(
  plan: string | null | undefined,
  profileRole: UserRole | null | undefined,
): boolean {
  if (!plan || plan === "free") return true;
  const role = profileRole ?? "client";
  return plan === EXPECTED_PLAN_FOR_PROFILE[role];
}

/** Le forfait attendu pour un profil donné (client par défaut). */
export function expectedPlanForProfile(
  profileRole: UserRole | null | undefined,
): SubscriptionPlanValue {
  return EXPECTED_PLAN_FOR_PROFILE[profileRole ?? "client"];
}

// ============================================================================
// Résultat de validation (exposé à l'interface et à l'administration)
// ============================================================================

export type ProfileSubscriptionMismatchReason =
  | "ok" // correspondance exacte (ou aucun forfait payé)
  | "plan_missing" // aucun forfait résolu
  | "plan_not_allowed_for_profile"; // le forfait actif n'appartient pas au profil

export interface ProfileSubscriptionCompatibility {
  compatible: boolean;
  reason: ProfileSubscriptionMismatchReason;
  /** Profil actif résolu (null = utilisateur sans profil particulier). */
  profileRole: UserRole | null;
  /** Forfait attendu pour ce profil. */
  expectedPlan: SubscriptionPlanValue;
  /** Forfait de l'abonnement de référence (actif, en attente ou dernier payé). */
  activePlan: SubscriptionPlanValue | null;
}

/**
 * Champs de compatibilité exposés dans l'instantané d'abonnement
 * (source de vérité unique consommée par toute la plateforme).
 */
export async function compatibilityFieldsForUser(
  ctx: Pick<QueryCtx, "db">,
  user: Pick<Doc<"users">, "_id" | "userRole" | "subscriptionPlan">,
  now = Date.now(),
): Promise<ProfileSubscriptionCompatibility> {
  const profileRole = await resolveProfileRole(ctx, user);
  const { plan } = await getReferenceSubscriptionPlan(ctx, user._id, now);
  return checkProfileSubscriptionCompatibility(
    { userRole: profileRole },
    plan ?? user.subscriptionPlan ?? null,
  );
}

/** Décision pure à partir d'un utilisateur et du forfait de référence. */
export function checkProfileSubscriptionCompatibility(
  user: Pick<Doc<"users">, "userRole"> | { userRole?: UserRole | null } | null,
  activePlan: string | null | undefined,
): ProfileSubscriptionCompatibility {
  const profileRole = (user?.userRole as UserRole | undefined) ?? null;
  const expectedPlan = expectedPlanForProfile(profileRole);
  const plan = (activePlan ?? null) as SubscriptionPlanValue | null;

  if (!plan || plan === "free") {
    return {
      compatible: true,
      reason: "ok",
      profileRole,
      expectedPlan,
      activePlan: null,
    };
  }

  const compatible = planBelongsToProfile(plan, profileRole);
  return {
    compatible,
    reason: compatible ? "ok" : "plan_not_allowed_for_profile",
    profileRole,
    expectedPlan,
    activePlan: plan,
  };
}

// ============================================================================
// Accès aux données (backend uniquement)
// ============================================================================

/**
 * Résout le type de profil actif d'un utilisateur.
 *
 * Lit d'abord `user.userRole` ; à défaut (comptes legacy créés avant
 * l'introduction du champ), infère le rôle depuis les profils spécialisés
 * existants — même logique que `users.adminFixUserRoles` — afin de ne jamais
 * bloquer un utilisateur dont le champ n'a simplement pas été écrit.
 * Renvoie null si aucun profil n'est identifiable (particulier standard).
 */
export async function resolveProfileRole(
  ctx: Pick<QueryCtx, "db">,
  user: Pick<Doc<"users">, "_id" | "userRole">,
): Promise<UserRole | null> {
  if (user.userRole) return user.userRole as UserRole;

  const expertProfile = await ctx.db
    .query("expertProfiles")
    .withIndex("by_user", (q) => q.eq("userId", user._id as Id<"users">))
    .first();
  if (expertProfile) return "expert";

  const supplierProfile = await ctx.db
    .query("supplierProfiles")
    .withIndex("by_user", (q) => q.eq("userId", user._id as Id<"users">))
    .first();
  if (supplierProfile) return "supplier";

  return null;
}

interface ReferenceSubscriptionDoc {
  plan: string;
  status: string;
  kind?: string | null;
  startDate?: number | null;
  endDate?: number | null;
}

/**
 * Forfait de l'abonnement mensuel de référence d'un utilisateur : le premier
 * abonnement PAYÉ encore valide, sinon le plus récent (payé, en attente ou
 * expiré). Même priorité que `subscriptionStatus.getUserSubscriptionStatus`.
 * Les abonnements `investment` ne sont pas des forfaits de profil.
 */
export async function getReferenceSubscriptionPlan(
  ctx: Pick<QueryCtx, "db">,
  userId: Id<"users">,
  now = Date.now(),
): Promise<{ plan: string | null; reference: ReferenceSubscriptionDoc | null }> {
  const subs = (await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()) as unknown as ReferenceSubscriptionDoc[];

  const monthly = subs.filter((s) => s.kind !== "investment");
  if (monthly.length === 0) return { plan: null, reference: null };

  const byRecent = (a: ReferenceSubscriptionDoc, b: ReferenceSubscriptionDoc) =>
    (b.startDate ?? 0) - (a.startDate ?? 0);

  const active = monthly
    .filter((s) => s.status === "active" && s.endDate != null && s.endDate > now)
    .sort(byRecent)[0];
  const reference = active ?? monthly.slice().sort(byRecent)[0];

  return { plan: reference?.plan ?? null, reference: reference ?? null };
}

/**
 * FONCTION CENTRALE — `validateProfileSubscriptionCompatibility(userId)`.
 *
 * 1. récupère le profil actuel de l'utilisateur ;
 * 2. récupère son abonnement actif (de référence) ;
 * 3. détermine le type de profil et le type d'abonnement ;
 * 4. compare les deux valeurs ;
 * 5. n'autorise l'accès qu'en cas de correspondance exacte.
 *
 * À utiliser dans TOUTES les mutations et requêtes sensibles liées aux
 * abonnements et aux fonctionnalités professionnelles.
 */
export async function validateProfileSubscriptionCompatibility(
  ctx: Pick<QueryCtx, "db">,
  userId: Id<"users">,
  now = Date.now(),
): Promise<ProfileSubscriptionCompatibility> {
  const user = await ctx.db.get(userId);
  if (!user) {
    return {
      compatible: false,
      reason: "plan_missing",
      profileRole: null,
      expectedPlan: "pro",
      activePlan: null,
    };
  }

  const profileRole = await resolveProfileRole(ctx, user);
  const { plan } = await getReferenceSubscriptionPlan(ctx, userId, now);

  // Sans profil explicite : l'utilisateur est un particulier standard — il ne
  // peut détenir que l'offre Client Pro (ou rester sans forfait).
  return checkProfileSubscriptionCompatibility(
    { userRole: profileRole },
    plan ?? user.subscriptionPlan ?? null,
  );
}

/**
 * Variante stricte : lève une erreur marquée si la combinaison profil ↔
 * abonnement actif est invalide. À appeler avant d'accorder une
 * fonctionnalité professionnelle.
 */
export async function requireValidProfileSubscription(
  ctx: Pick<QueryCtx, "db">,
  userId: Id<"users">,
): Promise<ProfileSubscriptionCompatibility> {
  const compatibility = await validateProfileSubscriptionCompatibility(ctx, userId);
  if (!compatibility.compatible) {
    const profileLabel = PROFILE_ROLE_LABELS[compatibility.profileRole ?? "client"];
    const planLabel = compatibility.activePlan
      ? PLAN_VALUE_LABELS[compatibility.activePlan] ?? compatibility.activePlan
      : "aucun";
    throw new Error(
      `${PROFILE_SUBSCRIPTION_ERROR_MARKER}Incompatibilité détectée : votre profil est « ${profileLabel} » ` +
        `mais votre abonnement actif est « ${planLabel} ». ` +
        `Souscrivez à l'offre ${PLAN_VALUE_LABELS[compatibility.expectedPlan]} pour régulariser votre compte.`,
    );
  }
  return compatibility;
}

/**
 * Variante pour la CRÉATION d'un premier profil spécialisé : la création
 * elle-même vaut déclaration du rôle. Refus uniquement si un rôle explicite
 * différent est déjà établi (champ `userRole` ou profil existant).
 */
export async function requireProfileRoleForCreation(
  ctx: Pick<QueryCtx, "db">,
  user: Pick<Doc<"users">, "_id" | "userRole" | "name">,
  role: Exclude<UserRole, "client">,
): Promise<void> {
  const resolved = await resolveProfileRole(ctx, user);
  if (resolved === null || resolved === role) return;

  const expectedLabel = PROFILE_ROLE_LABELS[role];
  throw new Error(
    `${PROFILE_SUBSCRIPTION_ERROR_MARKER}Cette fonctionnalité est réservée au profil ${expectedLabel}. ` +
      "Mettez à jour votre type de profil pour y accéder.",
  );
}

/**
 * Réserve une mutation à un type de profil précis (Expert / Fournisseur).
 * Les comptes legacy sans `userRole` passent si leur profil spécialisé
 * existe (inféré par `resolveProfileRole`).
 */
export async function requireProfileRole(
  ctx: Pick<QueryCtx, "db">,
  user: Pick<Doc<"users">, "_id" | "userRole" | "name">,
  role: Exclude<UserRole, "client">,
): Promise<UserRole> {
  const resolved = await resolveProfileRole(ctx, user);
  if (resolved === role) return resolved;

  const expectedLabel = PROFILE_ROLE_LABELS[role];
  throw new Error(
    `${PROFILE_SUBSCRIPTION_ERROR_MARKER}Cette fonctionnalité est réservée au profil ${expectedLabel}. ` +
      "Mettez à jour votre type de profil pour y accéder.",
  );
}

// ============================================================================
// Point d'entrée réactif pour l'interface (actions incluses, sans ctx.db)
// ============================================================================

/** Rôle de profil de l'utilisateur connecté (réactif, consommé par l'interface). */
export const getMyProfileRole = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return await resolveProfileRole(ctx, user);
  },
});

/**
 * État de compatibilité de l'utilisateur connecté (réactif) — consommé par
 * « Mon abonnement » pour avertir en cas d'incompatibilité profil ↔ forfait.
 */
export const getMyProfileSubscriptionCompatibility = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const profileRole = await resolveProfileRole(ctx, user);
    const { plan } = await getReferenceSubscriptionPlan(ctx, user._id);
    const compatibility = checkProfileSubscriptionCompatibility(
      { userRole: profileRole },
      plan ?? user.subscriptionPlan ?? null,
    );
    return {
      ...compatibility,
      profileRole,
      expectedPlanLabel: PLAN_VALUE_LABELS[compatibility.expectedPlan],
      activePlanLabel: compatibility.activePlan
        ? (PLAN_VALUE_LABELS[compatibility.activePlan] ?? compatibility.activePlan)
        : null,
      profileRoleLabel: profileRole ? PROFILE_ROLE_LABELS[profileRole] : null,
    };
  },
});
