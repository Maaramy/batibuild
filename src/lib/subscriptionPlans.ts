// ============================================================================
// Abonnements — contenu partagé (admin, page Abonnements, dialogue PDF)
// ============================================================================
// Ce module ne contient QUE de la présentation (libellés, catalogues, listes
// de fonctionnalités) et les VALEURS PAR DÉFAUT de la période d'essai.
//
// La disponibilité réelle de l'essai et ses droits ne sont JAMAIS codés ici :
// ils viennent de la configuration Convex (`paymentConfig.trialEnabled`,
// `trialDurationDays`, `trialEligibleProfiles`, `trialModules`), lue et
// vérifiée côté serveur (`convex/trialConfig.ts`).
//
// Le forfait « Free » n'existe plus : il est remplacé par la période d'essai
// gratuite administrable, puis par les offres payantes.
//
// La période d'essai couvre les profils que l'administrateur sélectionne, y
// compris Client Pro (désactivé par défaut : opt-in explicite). La durée peut
// être réglée séparément pour Client Pro (`clientProDurationDays`).
// L'« Offre gratuite » Client Pro (accès permanent sans échéance ni paiement) a
// été supprimée : à l'expiration de l'essai, seul un paiement confirmé ouvre
// l'abonnement Client Pro, au tarif mensuel enregistré par l'administrateur.

export const CLIENT_PRO_PLAN_LABEL = "Client Pro";
export const TRIAL_PLAN_LABEL = "Période d'essai";
export const TRIAL_PLAN_SHORT_LABEL = "Essai";

// ── Bornes de la durée d'essai (jours) — validées côté serveur ──────────────
export const TRIAL_MIN_DAYS = 1;
export const TRIAL_MAX_DAYS = 365;
/** Durée proposée par défaut (l'administrateur la modifie librement). */
export const TRIAL_DEFAULT_DAYS = 7;
/**
 * Durée dédiée au forfait Client Pro. `null` = même durée que les autres
 * profils (`durationDays`). Réglée par l'administrateur, jamais codée en dur.
 */
export const TRIAL_CLIENT_PRO_DEFAULT_DAYS: number | null = null;
/** Durées les plus courantes, proposées comme raccourcis dans l'administration. */
export const TRIAL_PRESET_DAYS = [7, 14, 30] as const;

// ── Modules pouvant être ouverts pendant l'essai ────────────────────────────
export type TrialModuleKey =
  | "estimation"
  | "decision"
  | "plans"
  | "materials"
  | "directory"
  | "execution"
  | "pdf";

export interface TrialModuleDefinition {
  key: TrialModuleKey;
  label: string;
  description: string;
  /** Ouvert par défaut quand l'administrateur n'a rien choisi. */
  defaultIncluded: boolean;
  /** Module premium : jamais accordé par défaut pendant l'essai. */
  premium?: boolean;
}

export const TRIAL_MODULES: TrialModuleDefinition[] = [
  {
    key: "estimation",
    label: "Coût estimatif",
    description: "Estimation, quantitatif détaillé et scénarios de coût.",
    defaultIncluded: true,
  },
  {
    key: "decision",
    label: "Aide à la décision",
    description: "Analyse du budget et recommandations.",
    defaultIncluded: true,
  },
  {
    key: "plans",
    label: "Plans architecturaux IA",
    description: "Plans 2D / 3D générés pour le projet.",
    defaultIncluded: true,
  },
  {
    key: "materials",
    label: "Matériaux IA",
    description: "Recommandations et comparaison des matériaux.",
    defaultIncluded: true,
  },
  {
    key: "directory",
    label: "Mise en relation",
    description: "Annuaire des fournisseurs et des professionnels.",
    defaultIncluded: true,
  },
  {
    key: "execution",
    label: "Exécution & suivi",
    description: "Organisation et suivi de l'avancement du chantier.",
    defaultIncluded: true,
  },
  {
    key: "pdf",
    label: "Rapports PDF",
    description: "Téléchargement des rapports — réservé à Client Pro par défaut.",
    defaultIncluded: false,
    premium: true,
  },
];

export const TRIAL_MODULE_KEYS: TrialModuleKey[] = TRIAL_MODULES.map((m) => m.key);

export const DEFAULT_TRIAL_MODULES: TrialModuleKey[] = TRIAL_MODULES.filter(
  (m) => m.defaultIncluded,
).map((m) => m.key);

export function isTrialModuleKey(value: unknown): value is TrialModuleKey {
  return typeof value === "string" && (TRIAL_MODULE_KEYS as string[]).includes(value);
}

/** Ne conserve que des modules connus, sans doublon (ordre du catalogue). */
export function sanitizeTrialModules(values: readonly unknown[] | null | undefined): TrialModuleKey[] {
  const set = new Set(values ?? []);
  return TRIAL_MODULE_KEYS.filter((key) => set.has(key));
}

// ── Profils éligibles à la période d'essai ──────────────────────────────────
// Client Pro figure dans le catalogue mais reste DÉSACTIVÉ par défaut : il ne
// reçoit un essai que si l'administrateur le coche explicitement.
export type TrialProfileKey = "client" | "supplier" | "expert";

/**
 * Vrai pour un profil qui ne peut pas bénéficier de l'essai. Seul un profil
 * NON RÉSOLU est exclu (aucune information fiable pour l'identifier) ; Client
 * Pro, Fournisseur et Expert dépendent de la sélection de l'administrateur.
 */
export function isTrialExcludedProfile(value: unknown): boolean {
  return value == null;
}

export interface TrialProfileDefinition {
  key: TrialProfileKey;
  label: string;
  description: string;
  defaultIncluded: boolean;
}

export const TRIAL_PROFILES: TrialProfileDefinition[] = [
  {
    key: "client",
    label: "Client Pro",
    description:
      "Essai Client Pro — à l'expiration, l'abonnement payant reste obligatoire (aucune activation sans paiement).",
    defaultIncluded: false,
  },
  {
    key: "supplier",
    label: "Fournisseur",
    description: "Espaces fournisseurs — essai autorisé par l'administration.",
    defaultIncluded: true,
  },
  {
    key: "expert",
    label: "Expert",
    description: "Espaces experts — essai autorisé par l'administration.",
    defaultIncluded: true,
  },
];

export const TRIAL_PROFILE_KEYS: TrialProfileKey[] = TRIAL_PROFILES.map((p) => p.key);

export const DEFAULT_TRIAL_PROFILES: TrialProfileKey[] = TRIAL_PROFILES.filter(
  (p) => p.defaultIncluded,
).map((p) => p.key);

export function isTrialProfileKey(value: unknown): value is TrialProfileKey {
  return typeof value === "string" && (TRIAL_PROFILE_KEYS as string[]).includes(value);
}

/** Ne conserve que des profils connus, sans doublon (ordre du catalogue). */
export function sanitizeTrialProfiles(values: readonly unknown[] | null | undefined): TrialProfileKey[] {
  const set = new Set(values ?? []);
  return TRIAL_PROFILE_KEYS.filter((key) => set.has(key));
}

// ── Comparatif Essai ↔ Client Pro (page Abonnements, dialogue PDF) ──────────
export interface PlanComparisonRow {
  feature: string;
  trial: boolean;
  pro: boolean;
  /** Vrai pour la ligne dépendant de la configuration administrateur. */
  configurable?: boolean;
}

export const PLAN_COMPARISON: PlanComparisonRow[] = [
  { feature: "Estimation", trial: true, pro: true },
  { feature: "Plans architecturaux IA", trial: true, pro: true },
  { feature: "Choix matériaux", trial: true, pro: true },
  { feature: "Consultations", trial: true, pro: true },
  { feature: "Construction & suivi", trial: true, pro: true },
  { feature: "Téléchargement PDF", trial: false, pro: true, configurable: true },
];

/** Contenu du dialogue de mise à niveau déclenché au téléchargement PDF. */
export const PDF_UPGRADE_TITLE = "Rapport PDF disponible avec Client Pro";
export const PDF_UPGRADE_MESSAGE =
  "Le téléchargement des rapports PDF n'est pas inclus dans votre période d'essai. Passez à l'abonnement Client Pro pour télécharger et conserver vos rapports professionnels.";
export const PDF_UPGRADE_CTA = "Passer à Client Pro";
export const PDF_UPGRADE_CANCEL = "Annuler";

/** Chemin de la page « Abonnements mensuels — Prix et configuration ». */
export const PRICING_PAGE_PATH = "/dashboard/pricing";

/** Libellés de période d'essai (« 14 jours », « 1 jour »). */
export function trialDurationLabel(days: number): string {
  return `${days} jour${days > 1 ? "s" : ""}`;
}
