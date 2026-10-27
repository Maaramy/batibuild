import { query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { api } from "./_generated/api";
import { getUserSubscriptionStatus } from "./subscriptionStatus";
import { resolveProfileRole, type UserRole } from "./profileSubscription";
import { readTrialConfig, trialIncludes } from "./trialConfig";
import { buildClientProCreditSnapshot } from "./clientProCredits";
import type { TrialModuleKey } from "../lib/subscriptionPlans";

// ============================================================================
// Accès aux services Client Pro
// ============================================================================
// Règle : pour utiliser les services de la plateforme (projets de construction,
// matériaux IA, plans architecturaux, suivi de A à Z),
// le client doit disposer d'un abonnement Client Pro PAYANT actif.
//   - Abonnement expiré  → renouvellement obligatoire pour maintenir l'accès.
//   - Aucune exception   → l'ancienne « Offre gratuite » Client Pro (accès
//                          permanent sans échéance ni paiement) a été supprimée :
//                          aucun prix nul ne peut ouvrir cet accès.
//   - Admin / modérateur → accès toujours accordé (bypass de test).

export type ClientProAccessReason =
  | "ok"
  /** Période d'essai (legacy) active sans le module demandé (ex. rapports PDF). */
  | "trial_no_module"
  /** Crédits de projets Client Pro épuisés → cotisation requise. */
  | "no_credits"
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

/**
 * État « Offre gratuite » des forfaits Fournisseur / Expert (prix null ou 0).
 *
 * Client Pro n'y figure PAS : il est TOUJOURS payant. L'« Offre gratuite »
 * Client Pro (accès permanent sans échéance ni paiement) a été supprimée.
 */
export interface FreePlanStatus {
  supplierFree: boolean;
  expertFree: boolean;
}

/**
 * État « Offre gratuite » (prix null/0) des forfaits Fournisseur / Expert.
 *
 * Ce n'est pas l'ancien forfait « Free » (supprimé) : c'est l'interrupteur qui
 * rend ces deux forfaits gratuits, lu depuis la configuration administrée.
 * Aucun état équivalent n'existe pour Client Pro.
 */
export async function getFreePlanStatus(ctx: any): Promise<FreePlanStatus> {
  try {
    const pricing = await ctx.runQuery(api.payments.getPublicPricing);
    const isFree = (p: number | null | undefined) => p === null || p === 0;
    return {
      supplierFree: isFree(pricing?.supplierPrice),
      expertFree: isFree(pricing?.expertPrice),
    };
  } catch {
    // Config illisible → règle payante par défaut
    return { supplierFree: false, expertFree: false };
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
 * Le paiement couvre-t-il l'espace de ce profil ?
 *
 * Règle centralisée (utilisée par l'annuaire, les recommandations, les devis,
 * la messagerie et l'administration) :
 *   • compte désactivé → invisible ;
 *   • profil masqué par l'administrateur (`isVisible === false`) → invisible ;
 *   • profil incomplet (nom, téléphone, e-mail, spécialités, régions) → invisible ;
 *   • « Offre gratuite » administrable → actif ;
 *   • essai en cours (date de fin future) → actif ;
 *   • abonnement mensuel actif non expiré → actif ;
 *   • tout le reste (inactive, pending, expired, date dépassée) → invisible.
 */
export async function isProfilePaymentActive(
  ctx: any,
  freePlanEnabled: boolean,
  profile: PaymentGatedProfile & {
    userId?: any;
    companyName?: string | null;
    displayName?: string | null;
    phone?: string | null;
    email?: string | null;
    specialties?: string[] | null;
    regions?: string[] | null;
  },
  now = Date.now(),
): Promise<boolean> {
  // Profil explicitement masqué : aucune exception, même en offre gratuite.
  if (profile.isVisible === false) return false;

  if (profile.userId && ctx?.db) {
    const user = await ctx.db.get(profile.userId);
    if (!user || user.status === "disabled") return false;
  }

  // Conditions normales de validation : un profil vide n'est jamais publié.
  const name = (profile.companyName ?? profile.displayName ?? "").trim();
  if (
    !name ||
    !(profile.phone ?? "").trim() ||
    !(profile.email ?? "").trim() ||
    (profile.specialties?.length ?? 0) === 0 ||
    (profile.regions?.length ?? 0) === 0
  ) {
    return false;
  }

  if (freePlanEnabled) return true;

  const status = profile.subscriptionStatus;
  if (status === "trial") {
    // Un essai sans échéance n'existe pas : il doit avoir une date de fin future.
    return profile.subscriptionEndDate != null && profile.subscriptionEndDate > now;
  }
  if (status !== "active") return false;
  if (profile.subscriptionEndDate != null && profile.subscriptionEndDate <= now) return false;
  return true;
}

/**
 * Applique l'essai professionnel du COMPTE au profil spécialisé qui vient
 * d'être créé. Sans cela, un Expert / Fournisseur en essai restait invisible
 * (profil « inactive ») alors que son compte était en période d'essai.
 */
export async function applyProfessionalTrialToProfile(
  ctx: any,
  userId: any,
  profileId: any,
  role: "supplier" | "expert",
): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (!user) return false;
  const now = Date.now();
  if (user.trialClaimedAt == null || user.trialEndDate == null || user.trialEndDate <= now) {
    return false;
  }
  const trial = await readTrialConfig(ctx);
  const eligible = role === "expert" ? trial.expertTrialEnabled : trial.supplierTrialEnabled;
  if (!eligible) return false;

  await ctx.db.patch(profileId, {
    plan: "trial",
    subscriptionStatus: "trial",
    trialStartDate: user.trialStartDate ?? user.trialClaimedAt,
    subscriptionEndDate: user.trialEndDate,
    isVisible: true,
    updatedAt: now,
  });
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
    `${CLIENT_PRO_ACCESS_MARKER}L'accès à « ${service} » nécessite des crédits Client Pro. ` +
      "Payez une cotisation (nombre de projets de votre choix) pour ouvrir les services Client Pro.",
  );
}

/**
 * Calcule l'accès aux services Client Pro d'un utilisateur (queries, mutations,
 * actions) — INDÉPENDAMMENT de son éventuel forfait professionnel.
 *
 * Droits Client Pro :
 *   • crédits de projets disponibles ou déjà accordés (cotisation) ;
 *   • abonnement mensuel Client Pro historique encore valide (paiements déjà
 *     confirmés : l'échéance est respectée, rien n'est révoqué) ;
 *   • période d'essai Client Pro historique encore en cours (legacy).
 *
 * Un abonnement Expert / Fournisseur n'ouvre JAMAIS ces droits : un
 * professionnel doit acheter sa cotisation Client Pro séparément.
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

  // Les actions n'ont PAS accès à ctx.db → on passe par la query publique.
  const [snapshot, credits] = await Promise.all([
    ctx.db
      ? getUserSubscriptionStatus(ctx, user._id)
      : ctx.runQuery(api.subscriptionStatus.getMySubscriptionStatus),
    ctx.db
      ? buildClientProCreditSnapshot(ctx, user)
      : ctx.runQuery(api.clientProCredits.getMyClientProCredits),
  ]);

  // 1. Cotisation Client Pro (crédits) — indépendante du profil.
  if (credits?.entitled === true) return { allowed: true, reason: "ok" };

  // 2. Abonnement mensuel Client Pro HISTORIQUE encore valide.
  const legacyMonthlyActive =
    snapshot?.type === "monthly" &&
    snapshot?.isActive === true &&
    snapshot?.activePlan === "pro";
  if (legacyMonthlyActive) return { allowed: true, reason: "ok" };

  // 3. Essai Client Pro historique encore en cours (legacy) : seuls les
  //    modules ouverts par l'administrateur sont accessibles.
  if (snapshot?.type === "trial" && snapshot?.isActive === true) {
    if (module && !(await isTrialModuleAllowed(ctx, module))) {
      return { allowed: false, reason: "trial_no_module" };
    }
    return { allowed: true, reason: "ok" };
  }

  if (snapshot?.status === "pending") return { allowed: false, reason: "pending" };
  if (snapshot?.status === "trial_expired") return { allowed: false, reason: "trial_expired" };
  if (snapshot?.status === "expired") return { allowed: false, reason: "expired" };

  // 4. Aucun crédit : une cotisation est requise pour ouvrir les services.
  return { allowed: false, reason: "no_credits" };
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

/** Décision centralisée : l'utilisateur peut-il télécharger un rapport PDF ? */
export async function getPdfDownloadAccess(ctx: any, user: any): Promise<PdfDownloadAccess> {
  if (!user) return { allowed: false, reason: "no_subscription", plan: null };
  if (user.role === "admin" || user.role === "moderator") {
    return { allowed: true, reason: "ok", plan: user.subscriptionPlan ?? null };
  }

  const [snapshot, credits]: any[] = await Promise.all([
    ctx.db
      ? getUserSubscriptionStatus(ctx, user._id)
      : ctx.runQuery(api.subscriptionStatus.getMySubscriptionStatus),
    ctx.db
      ? buildClientProCreditSnapshot(ctx, user)
      : ctx.runQuery(api.clientProCredits.getMyClientProCredits),
  ]);

  const plan = snapshot?.plan ?? user.subscriptionPlan ?? null;

  // Cotisation Client Pro : les rapports PDF font partie des services ouverts
  // par les crédits, y compris pour un Expert / Fournisseur (droit distinct).
  if (credits?.entitled === true) return { allowed: true, reason: "ok", plan };

  // Abonnement mensuel Client Pro HISTORIQUE encore valide.
  if (
    snapshot?.type === "monthly" &&
    snapshot?.isActive === true &&
    snapshot?.activePlan === "pro"
  ) {
    return { allowed: true, reason: "ok", plan };
  }

  // Essai Client Pro historique : module PDF ouvert par l'administrateur.
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
  return { allowed: false, reason: "no_credits", plan };
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
    const credits = user ? await buildClientProCreditSnapshot(ctx, user) : null;
    return {
      ...access,
      // Solde Client Pro (crédits de projets) — affichage et paywall.
      credits: credits
        ? {
            remaining: credits.balance.remaining,
            granted: credits.balance.granted,
            used: credits.balance.used,
            entitled: credits.entitled,
            legacyMonthlyActive: credits.legacyMonthlyActive,
          }
        : null,
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
