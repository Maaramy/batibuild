import { query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { api } from "./_generated/api";
import { getUserSubscriptionStatus } from "./subscriptionStatus";
import { resolveProfileRole, type UserRole } from "./profileSubscription";
import { readTrialConfig, trialIncludes } from "./trialConfig";
import type { TrialModuleKey } from "../lib/subscriptionPlans";

// ============================================================================
// Accès aux services Client Pro
// ============================================================================
// Règle : pour utiliser les services de la plateforme (projets de construction,
// matériaux IA, plans architecturaux, suivi de A à Z),
// le client doit disposer d'un abonnement Client Pro PAYANT actif.
//   - Abonnement expiré  → renouvellement obligatoire pour maintenir l'accès.
//   - Exception          → l'administrateur peut activer le « switch gratuit »
//                          sur le forfait Client Pro (prix null dans la config) :
//                          dans ce cas l'accès est accordé sans paiement.
//   - Admin / modérateur → accès toujours accordé (bypass de test).

export type ClientProAccessReason =
  | "ok"
  /** Période d'essai active sans le module demandé (ex. rapports PDF). */
  | "trial_no_module"
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

/** Marqueur d'erreur serveur : téléchargement PDF réservé au forfait payant. */
export const PDF_ACCESS_MARKER = "PDF_ACCESS_REQUIRED:";

/** État « Offre gratuite » (switch admin) pour chaque forfait — prix null ou 0. */
export interface FreePlanStatus {
  proFree: boolean;
  supplierFree: boolean;
  expertFree: boolean;
}

/**
 * État « Offre gratuite » (prix null/0) de CHAQUE forfait payant.
 *
 * Ce n'est pas l'ancien forfait « Free » (supprimé) : c'est l'interrupteur qui
 * rend un forfait payant gratuit, lu depuis la configuration administrée.
 */
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

/**
 * Le module est-il ouvert pendant la période d'essai ?
 *
 * Fonctionne depuis une query/mutation (`ctx.db`) comme depuis une action
 * (`ctx.runQuery`, sans `ctx.db`) : la même configuration serveur est lue dans
 * les deux cas — aucune valeur n'est devinée côté client.
 */
async function isTrialModuleAllowed(ctx: any, module: TrialModuleKey): Promise<boolean> {
  try {
    if (ctx.db) {
      const trial = await readTrialConfig(ctx);
      return trialIncludes(trial, module);
    }
    const publicConfig = await ctx.runQuery(api.trialConfig.getPublicTrialConfig);
    return Array.isArray(publicConfig?.modules) && publicConfig.modules.includes(module);
  } catch {
    // Config illisible → refus (jamais d'accès accordé par défaut).
    return false;
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
 * unique) : période d'essai gratuite (durée et éligibilité réglées par
 * l'administrateur) puis abonnement mensuel de 30 jours ; après l'échéance de
 * l'un ou de l'autre, le paiement (ou le renouvellement) devient obligatoire.
 * L'ancien forfait « Free » n'existe plus et n'accorde aucun droit.
 */
export async function getClientProAccess(
  ctx: any,
  user: any,
  module?: TrialModuleKey,
): Promise<ClientProAccess> {
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
    // Pendant la PÉRIODE D'ESSAI, seuls les modules cochés par l'administrateur
    // sont ouverts : un module non configuré est refusé côté serveur (l'ancien
    // forfait « Free » n'accordait au contraire aucun droit particulier).
    if (snapshot?.type === "trial" && module) {
      if (!(await isTrialModuleAllowed(ctx, module))) {
        return { allowed: false, reason: "trial_no_module" };
      }
    }
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

/**
 * Lève une erreur si l'utilisateur n'a pas accès aux services Client Pro.
 *
 * `module` rattache le service à un module de la période d'essai : quand l'essai
 * est actif sans ce module, le message distingue clairement « non inclus dans
 * l'essai » de « abonnement requis » — aucune erreur n'est masquée.
 */
export async function requireClientProAccess(
  ctx: any,
  user: any,
  service: string,
  module?: TrialModuleKey,
): Promise<void> {
  const access = await getClientProAccess(ctx, user, module);
  if (access.allowed) return;
  if (access.reason === "trial_no_module") {
    throw new Error(
      `${CLIENT_PRO_ACCESS_MARKER}« ${service} » n'est pas inclus dans votre période d'essai. ` +
        "Choisissez une offre pour y accéder dès maintenant.",
    );
  }
  throw clientProAccessError(service);
}

// ============================================================================
// Téléchargement des rapports PDF — contrôle centralisé (forfait payant)
// ============================================================================
// Règle produit : le téléchargement des rapports PDF est réservé au forfait
// payant Client Pro. Pendant la période d'essai, il n'est ouvert que si
// l'administrateur a coché le module « Rapports PDF ». Ce contrôle est côté
// backend (Convex) : l'interface ne fait que l'afficher.

export type PdfAccessReason = ClientProAccessReason;

export interface PdfDownloadAccess {
  allowed: boolean;
  reason: PdfAccessReason;
  plan: string | null;
}

/** Décision pure/centralisée : l'utilisateur peut-il télécharger un rapport PDF ? */
export async function getPdfDownloadAccess(ctx: any, user: any): Promise<PdfDownloadAccess> {
  if (!user) return { allowed: false, reason: "no_subscription", plan: null };
  if (user.role === "admin" || user.role === "moderator") {
    return { allowed: true, reason: "ok", plan: user.subscriptionPlan ?? null };
  }

  // Les rapports PDF des projets sont réservés au profil Client (Client Pro).
  let profileRole: UserRole | null;
  if (ctx.db) profileRole = await resolveProfileRole(ctx, user);
  else
    profileRole = (await ctx.runQuery(api.profileSubscription.getMyProfileRole)) as UserRole | null;
  if (profileRole !== null && profileRole !== "client") {
    return { allowed: false, reason: "not_client_pro", plan: user.subscriptionPlan ?? null };
  }

  const snapshot: any = ctx.db
    ? await getUserSubscriptionStatus(ctx, user._id)
    : await ctx.runQuery(api.subscriptionStatus.getMySubscriptionStatus);

  const plan = snapshot?.plan ?? user.subscriptionPlan ?? null;
  // Abonnement mensuel PAYANT actif (`type === "monthly"`) → PDF autorisé.
  const paidActive =
    snapshot?.type === "monthly" &&
    snapshot?.isActive === true &&
    snapshot?.planCompatible !== false;
  if (paidActive) return { allowed: true, reason: "ok", plan };

  // Période d'essai : le PDF n'est ouvert que si l'administrateur a coché le
  // module « Rapports PDF » dans la configuration de l'essai (décision
  // recalculée côté serveur dans `getUserSubscriptionStatus`).
  if (snapshot?.type === "trial" && snapshot?.isActive === true) {
    return snapshot.trialPdfAllowed === true
      ? { allowed: true, reason: "ok", plan }
      : { allowed: false, reason: "trial_no_module", plan };
  }
  if (snapshot?.status === "pending") return { allowed: false, reason: "pending", plan };
  if (snapshot?.status === "expired") return { allowed: false, reason: "expired", plan };
  if (snapshot?.status === "trial_expired") {
    return { allowed: false, reason: "trial_expired", plan };
  }
  return { allowed: false, reason: "no_subscription", plan };
}

/** Droit de télécharger un rapport PDF (réactif) — consommé par l'interface. */
export const canDownloadPdf = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return await getPdfDownloadAccess(ctx, user);
  },
});

/**
 * Alias explicite `getUserSubscription()` — état d'abonnement complet de
 * l'utilisateur connecté (même source de vérité que « Mon abonnement »).
 */
export const getUserSubscription = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return await getUserSubscriptionStatus(ctx, user._id);
  },
});

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
