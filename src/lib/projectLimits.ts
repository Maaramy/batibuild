// ============================================================================
// LIMITE DU NOMBRE DE PROJETS PAR OFFRE — LOGIQUE PURE
// ----------------------------------------------------------------------------
// L'administrateur règle, depuis « Abonnements mensuels — Prix et
// configuration », le nombre maximal de projets créables pour :
//   • la PÉRIODE D'ESSAI gratuite ;
//   • l'OFFRE GRATUITE (forfait mensuel dont le prix est null/0 — switch
//     « Offre gratuite » de l'administration) ;
//   • le forfait CLIENT PRO PAYANT (limite facultative, désactivée par défaut :
//     ses fonctionnalités et conditions restent inchangées).
//
// Ce module ne dépend d'aucun autre module Convex : il est importé à la fois
// par le backend (`convex/projectLimits.ts`, seule source de vérité pour
// l'application de la limite) et par l'interface d'administration.
//
// Rien n'est codé en dur dans le moteur d'estimation : la configuration est
// lue en base (Convex) à chaque contrôle.
// ============================================================================

/** Bornes de saisie du nombre maximal de projets. */
export const PROJECT_LIMIT_MIN = 1;
export const PROJECT_LIMIT_MAX = 500;

/** Marqueur d'erreur serveur : limite de projets atteinte (détectable côté UI). */
export const PROJECT_LIMIT_MARKER = "PROJECT_LIMIT_REACHED:";

export type ProjectLimitTier = "trial" | "free" | "paid";

/**
 * Réinitialisation de la limite :
 *   • `"total"` : plafond cumulé sur tous les projets créés par le compte ;
 *   • `"offer"` : plafond compté depuis le début de la période de l'offre
 *                 (début de l'essai ou de l'abonnement mensuel en cours).
 */
export type ProjectLimitResetMode = "total" | "offer";

export interface ProjectLimitRule {
  enabled: boolean;
  maxProjects: number;
  resetMode: ProjectLimitResetMode;
}

export interface ProjectLimitConfig {
  trial: ProjectLimitRule;
  free: ProjectLimitRule;
  paid: ProjectLimitRule;
}

/**
 * Valeurs par défaut : AUCUNE limite active. Le comportement existant est donc
 * strictement préservé tant que l'administrateur n'active rien.
 */
export const DEFAULT_PROJECT_LIMIT_CONFIG: ProjectLimitConfig = {
  trial: { enabled: false, maxProjects: 1, resetMode: "offer" },
  free: { enabled: false, maxProjects: 1, resetMode: "offer" },
  paid: { enabled: false, maxProjects: 100, resetMode: "total" },
};

/** Champs lus dans `paymentConfig` (tolérant : documents anciens). */
export interface ProjectLimitConfigSource {
  projectLimitTrialEnabled?: boolean | null;
  projectLimitTrialMax?: number | null;
  projectLimitTrialReset?: string | null;
  projectLimitFreeEnabled?: boolean | null;
  projectLimitFreeMax?: number | null;
  projectLimitFreeReset?: string | null;
  projectLimitPaidEnabled?: boolean | null;
  projectLimitPaidMax?: number | null;
  projectLimitPaidReset?: string | null;
}

export const PROJECT_LIMIT_TIERS: ProjectLimitTier[] = ["trial", "free", "paid"];

export const PROJECT_LIMIT_TIER_LABELS: Record<ProjectLimitTier, string> = {
  trial: "Période d'essai gratuite",
  free: "Offre gratuite",
  paid: "Client Pro (abonnement payant)",
};

export const PROJECT_LIMIT_RESET_LABELS: Record<ProjectLimitResetMode, string> = {
  offer: "Par période de l'offre",
  total: "Total cumulé (jamais réinitialisé)",
};

function normalizeResetMode(value: string | null | undefined): ProjectLimitResetMode {
  return value === "total" ? "total" : "offer";
}

function normalizeMax(value: number | null | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  return Math.min(PROJECT_LIMIT_MAX, Math.max(PROJECT_LIMIT_MIN, rounded));
}

/** Normalise la configuration enregistrée (valeurs invalides → défaut). */
export function normalizeProjectLimitConfig(
  source: ProjectLimitConfigSource | null | undefined,
): ProjectLimitConfig {
  const fallback = DEFAULT_PROJECT_LIMIT_CONFIG;
  return {
    trial: {
      enabled: source?.projectLimitTrialEnabled === true,
      maxProjects: normalizeMax(source?.projectLimitTrialMax, fallback.trial.maxProjects),
      resetMode: normalizeResetMode(source?.projectLimitTrialReset),
    },
    free: {
      enabled: source?.projectLimitFreeEnabled === true,
      maxProjects: normalizeMax(source?.projectLimitFreeMax, fallback.free.maxProjects),
      resetMode: normalizeResetMode(source?.projectLimitFreeReset),
    },
    paid: {
      enabled: source?.projectLimitPaidEnabled === true,
      maxProjects: normalizeMax(source?.projectLimitPaidMax, fallback.paid.maxProjects),
      resetMode: normalizeResetMode(source?.projectLimitPaidReset),
    },
  };
}

/** Erreurs de validation d'une règle (liste vide = règle valide). */
function validateRule(rule: ProjectLimitRule, tier: ProjectLimitTier): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(rule.maxProjects)) {
    errors.push(`${PROJECT_LIMIT_TIER_LABELS[tier]} : le nombre maximal doit être un entier.`);
  } else if (rule.maxProjects < PROJECT_LIMIT_MIN || rule.maxProjects > PROJECT_LIMIT_MAX) {
    errors.push(
      `${PROJECT_LIMIT_TIER_LABELS[tier]} : le nombre maximal doit être compris entre ${PROJECT_LIMIT_MIN} et ${PROJECT_LIMIT_MAX} projets.`,
    );
  }
  if (rule.resetMode !== "offer" && rule.resetMode !== "total") {
    errors.push(`${PROJECT_LIMIT_TIER_LABELS[tier]} : mode de réinitialisation inconnu.`);
  }
  return errors;
}

export function validateProjectLimitConfig(config: ProjectLimitConfig): string[] {
  return PROJECT_LIMIT_TIERS.flatMap((tier) => validateRule(config[tier], tier));
}

/** Champs à enregistrer dans `paymentConfig`. */
export function projectLimitStoragePatch(config: ProjectLimitConfig) {
  return {
    projectLimitTrialEnabled: config.trial.enabled,
    projectLimitTrialMax: Math.round(config.trial.maxProjects),
    projectLimitTrialReset: config.trial.resetMode,
    projectLimitFreeEnabled: config.free.enabled,
    projectLimitFreeMax: Math.round(config.free.maxProjects),
    projectLimitFreeReset: config.free.resetMode,
    projectLimitPaidEnabled: config.paid.enabled,
    projectLimitPaidMax: Math.round(config.paid.maxProjects),
    projectLimitPaidReset: config.paid.resetMode,
  };
}

/**
 * Offre à laquelle rattacher l'utilisateur — `null` = aucune limite applicable
 * (aucune période active : la création est déjà bloquée par le contrôle
 * d'accès Client Pro).
 *
 * • période d'essai active → `"trial"` ;
 * • abonnement mensuel actif gratuit (prix null/0) → `"free"` ;
 * • abonnement mensuel actif payant → `"paid"`.
 */
export function resolveProjectLimitTier(input: {
  type: string | null | undefined;
  isActive: boolean | null | undefined;
  price: number | null | undefined;
  isFreeOffer: boolean;
}): ProjectLimitTier | null {
  if (input.isActive !== true) return null;
  if (input.type === "trial") return "trial";
  if (input.type === "monthly") return input.isFreeOffer ? "free" : "paid";
  return null;
}

/**
 * Début de la période servant au décompte (`null` = compter tous les projets).
 * En mode « total », la limite ne se réinitialise jamais.
 */
export function projectLimitPeriodStart(
  rule: ProjectLimitRule,
  tier: ProjectLimitTier,
  dates: { trialStartDate?: number | null; subscriptionStartDate?: number | null },
): number | null {
  if (rule.resetMode === "total") return null;
  const start = tier === "trial" ? dates.trialStartDate : dates.subscriptionStartDate;
  // Date de début inconnue : on compte TOUS les projets (jamais de
  // contournement par absence d'information).
  return typeof start === "number" && start > 0 ? start : null;
}

export interface ProjectLimitStatus {
  /** Offre concernée (`null` = aucune limite applicable à ce compte). */
  tier: ProjectLimitTier | null;
  /** Une limite est-elle réellement configurée pour cette offre ? */
  limitEnabled: boolean;
  /** Plafond configuré (`null` = illimité). */
  maxProjects: number | null;
  /** Projets déjà créés dans la fenêtre de décompte. */
  usedProjects: number;
  /** Projets encore autorisés (`null` = illimité). */
  remainingProjects: number | null;
  /** Vrai si un nouveau projet peut être créé. */
  allowed: boolean;
}

export const UNLIMITED_PROJECT_LIMIT: ProjectLimitStatus = {
  tier: null,
  limitEnabled: false,
  maxProjects: null,
  usedProjects: 0,
  remainingProjects: null,
  allowed: true,
};

/** Décision pure : le plafond est-il atteint ? */
export function evaluateProjectLimit(
  rule: ProjectLimitRule | null,
  tier: ProjectLimitTier | null,
  usedProjects: number,
): ProjectLimitStatus {
  if (!rule || !tier || !rule.enabled) {
    return { ...UNLIMITED_PROJECT_LIMIT, tier };
  }
  const used = Math.max(0, usedProjects);
  const remaining = Math.max(0, rule.maxProjects - used);
  return {
    tier,
    limitEnabled: true,
    maxProjects: rule.maxProjects,
    usedProjects: used,
    remainingProjects: remaining,
    allowed: used < rule.maxProjects,
  };
}

/**
 * Décision d'affichage de l'écran « Limite de projets atteinte ».
 *
 * Elle n'est évaluée qu'au moment d'une TENTATIVE de création d'un NOUVEAU
 * projet :
 *   • jamais pendant une création en cours ni après une création réussie (le
 *     résultat du dernier projet autorisé doit toujours s'afficher) ;
 *   • jamais lorsqu'aucun quota n'est connu (le serveur tranche, afin de ne
 *     jamais bloquer sur une donnée pas encore chargée).
 *
 * Le quota lui-même est calculé côté serveur (`evaluateProjectLimit` sur le
 * nombre réel de projets) : ce test ne fait que décider de l'écran.
 */
export function shouldBlockNewProjectCreation(input: {
  status: { allowed: boolean } | null | undefined;
  creationInProgress: boolean;
  hasCreatedProject: boolean;
}): boolean {
  if (input.creationInProgress || input.hasCreatedProject) return false;
  if (!input.status) return false;
  return input.status.allowed === false;
}

/** Message présenté à l'utilisateur qui a atteint le plafond de son offre. */
export function projectLimitReachedMessage(
  tier: ProjectLimitTier,
  maxProjects: number,
): string {
  const limit = `${maxProjects} projet${maxProjects > 1 ? "s" : ""}`;
  if (tier === "paid") {
    return (
      `Vous avez atteint la limite de ${limit} autorisée pour votre abonnement Client Pro. ` +
      "Vos projets existants restent consultables et modifiables. Contactez l'administration " +
      "pour bénéficier de conditions adaptées."
    );
  }
  const offer = tier === "trial" ? "votre période d'essai" : "votre offre gratuite";
  return (
    `Vous avez atteint la limite de ${limit} autorisée pour ${offer}. ` +
    "Passez à Client Pro pour bénéficier des conditions de votre abonnement."
  );
}
