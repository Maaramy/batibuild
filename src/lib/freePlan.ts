// ============================================================================
// Forfait Free — contenu partagé (admin, page Abonnements, dialogue PDF)
// ============================================================================
// Ce module ne contient QUE de la présentation (libellés, listes de
// fonctionnalités). La disponibilité réelle du forfait Free n'est JAMAIS codée
// ici : elle vient de `paymentConfig.freePlanEnabled` (Convex), lue via
// `api.payments.getPublicPricing` / `api.access.isFreePlanEnabled`.

export const FREE_PLAN_LABEL = "Free";
export const FREE_PLAN_PRICE = 0;
export const FREE_PLAN_CURRENCY = "TND";
export const CLIENT_PRO_PLAN_LABEL = "Client Pro";

/** Fonctionnalités incluses dans le forfait Free (et restriction PDF). */
export interface FreePlanFeature {
  label: string;
  included: boolean;
  /** Renseigné quand la fonctionnalité est bloquée en Free. */
  lockedHint?: string;
}

export const FREE_PLAN_FEATURES: FreePlanFeature[] = [
  { label: "Estimation des coûts de construction", included: true },
  { label: "Plans architecturaux IA", included: true },
  { label: "Choix matériaux", included: true },
  { label: "Consultations / mise en relation", included: true },
  { label: "Construction & suivi", included: true },
  { label: "Téléchargement des rapports PDF", included: false, lockedHint: CLIENT_PRO_PLAN_LABEL },
];

/** Tableau comparatif Free ↔ Client Pro (section « Abonnements mensuels »). */
export interface PlanComparisonRow {
  feature: string;
  free: boolean;
  pro: boolean;
}

export const PLAN_COMPARISON: PlanComparisonRow[] = [
  { feature: "Estimation", free: true, pro: true },
  { feature: "Plans architecturaux IA", free: true, pro: true },
  { feature: "Choix matériaux", free: true, pro: true },
  { feature: "Consultations", free: true, pro: true },
  { feature: "Construction & suivi", free: true, pro: true },
  { feature: "Téléchargement PDF", free: false, pro: true },
];

/** Contenu du dialogue de mise à niveau déclenché au téléchargement PDF. */
export const PDF_UPGRADE_TITLE = "Rapport PDF disponible avec Client Pro";
export const PDF_UPGRADE_MESSAGE =
  "Pour télécharger vos rapports PDF et conserver vos rapports professionnels, passez à l'abonnement Client Pro.";
export const PDF_UPGRADE_CTA = "Passer à Client Pro";
export const PDF_UPGRADE_CANCEL = "Annuler";

/** Types de rapports PDF soumis à la restriction (tous passent par le même contrôle). */
export const PDF_REPORT_TYPES = [
  "Rapport d'estimation des coûts",
  "Rapport des plans architecturaux IA",
  "Rapport de choix matériaux",
  "Rapport de consultation / mise en relation",
  "Rapport construction & suivi",
  "Rapport d'investissement",
  "Rapport d'analyse",
  "Rapport quantitatif / DQE",
] as const;

/** Chemin de la page « Abonnements mensuels — Prix et configuration ». */
export const PRICING_PAGE_PATH = "/dashboard/pricing";
