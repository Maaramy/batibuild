// ============================================================================
// MODULE PUSH NOTIFICATIONS — audiences, filtres et destinations autorisées
// ----------------------------------------------------------------------------
// Partagé par le backend (validation / résolution) et l'administration (UI) :
// une seule liste d'identifiants, une seule règle de lien sûr.
// ============================================================================

export const PUSH_AUDIENCE_IDS = [
  "all_android",
  "client_pro_all",
  "client_pro_active",
  "client_pro_inactive",
  "expert_all",
  "expert_active",
  "expert_inactive",
  "supplier_all",
  "supplier_active",
  "supplier_inactive",
  "selected",
] as const;

export type PushAudienceId = (typeof PUSH_AUDIENCE_IDS)[number];

export const PUSH_AUDIENCE_LABELS: Record<PushAudienceId, string> = {
  all_android: "Tous les utilisateurs Android",
  client_pro_all: "Clients Pro",
  client_pro_active: "Clients Pro actifs",
  client_pro_inactive: "Clients Pro inactifs",
  expert_all: "Experts",
  expert_active: "Experts actifs",
  expert_inactive: "Experts inactifs",
  supplier_all: "Fournisseurs",
  supplier_active: "Fournisseurs actifs",
  supplier_inactive: "Fournisseurs inactifs",
  selected: "Utilisateurs sélectionnés individuellement",
};

/** Modules dont on peut vérifier l'utilisation réelle (filtre « jamais utilisé »). */
export const PUSH_MODULE_IDS = [
  "cost",
  "plans",
  "decision",
  "investments",
  "materials",
  "sites",
] as const;

export type PushModuleId = (typeof PUSH_MODULE_IDS)[number];

export const PUSH_MODULE_LABELS: Record<PushModuleId, string> = {
  cost: "Coût estimatif",
  plans: "Plans architecturaux",
  decision: "Aide à la décision",
  investments: "Investissement immobilier",
  materials: "Choix des matériaux IA",
  sites: "Gestion & suivi de chantier",
};

export const PUSH_SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "trial_expired",
  "expired",
  "pending",
  "none",
] as const;

export const PUSH_SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  trialing: "Essai en cours",
  active: "Actif",
  trial_expired: "Essai expiré",
  expired: "Expiré",
  pending: "En attente",
  none: "Aucun abonnement",
};

export const PUSH_SUBSCRIPTION_PLANS = ["free", "pro", "expert", "supplier", "premium"] as const;

export type PushFilters = {
  createdFrom?: number;
  createdTo?: number;
  /** Activité de l'appareil : token vu dans les N derniers jours. */
  lastActiveDays?: number;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  region?: string;
  notUsedModule?: string;
};

/**
 * Destinations de conversion attribuées à une campagne push : ouverture d'un
 * parcours monétisable (cotisation, estimation, mise en relation, plans,
 * investissement) ou d'une évaluation. Un simple clic vers le tableau de bord
 * n'est PAS compté comme conversion.
 */
const CONVERSION_PREFIXES = [
  "/dashboard/new",
  "/dashboard/pricing",
  "/dashboard/investments",
  "/dashboard/professionals-directory",
  "/dashboard/plans",
  "/dashboard/decision",
];

export function isConversionDestination(destination: string | undefined | null): boolean {
  if (!destination) return false;
  const path = destination.split("?")[0].split("#")[0];
  return CONVERSION_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * Valide une destination de notification : route interne de la plateforme ou
 * URL HTTPS. Tout autre schéma (javascript:, data:, intent:, http:) est refusé.
 * Retourne null si la destination n'est pas sûre.
 */
export function safePushDestination(
  raw: string | undefined | null,
): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  if (value.startsWith("/")) {
    // Une route interne ne peut pas être un protocole relatif (« //evil.com »).
    if (value.startsWith("//")) return null;
    if (!/^\/[A-Za-z0-9\-_/?=&%.#+~]*$/.test(value)) return null;
    return value;
  }

  if (/^https:\/\/[A-Za-z0-9.-]+(:\d+)?(\/[^\s]*)?$/i.test(value)) {
    return value;
  }
  return null;
}

/** Destination finale d'un clic, relative au site (ex. « /dashboard/new »). */
export function destinationPath(raw: string | undefined | null): string {
  const safe = safePushDestination(raw);
  if (!safe) return "/dashboard";
  if (safe.startsWith("/")) return safe;
  // URL externe : on ne redirige jamais automatiquement dans l'application.
  return "/dashboard";
}
