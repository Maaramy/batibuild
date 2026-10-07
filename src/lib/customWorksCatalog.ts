// ============================================================================
// TRAVAUX PERSONNALISÉS — catalogue prédéfini des travaux complémentaires.
// ----------------------------------------------------------------------------
// Aucune dépendance Convex / React : ce module est partagé par le backend
// (calcul automatique des coûts, stockage projet) et par l'interface (liste
// prédéfinie + récapitulatif).
//
// Principe : l'utilisateur choisit un travail dans une LISTE PRÉDÉFINIE ; le
// système le chiffre AUTOMATIQUEMENT à partir des données réelles du projet
// (surface, niveaux, région…) et du scénario budgétaire actif, avec les MÊMES
// données de prix que le reste de l'estimation (moteur BIM). Aucun montant
// n'est saisi à la main, aucun prix n'est codé en dur.
// ============================================================================

/** Clés des travaux personnalisés prédéfinis. */
export type CustomWorkKey = "piscine" | "garage" | "jardin" | "solaire";

export interface CustomWorkDef {
  key: CustomWorkKey;
  /** Libellé affiché. */
  label: string;
  /** Pictogramme affiché dans la liste. */
  emoji: string;
  /**
   * Catégorie du moteur BIM utilisée pour le chiffrage automatique (mêmes
   * pourcentages de structure, mêmes profils matériaux/main-d'œuvre et mêmes
   * prix que l'estimation du projet).
   */
  category: string;
  /** Nature du travail (aide à l'affichage). */
  nature: string;
}

/**
 * Liste prédéfinie des travaux complémentaires. L'ordre est stable : il sert
 * d'ordre d'affichage et de recalcul.
 */
export const CUSTOM_WORK_CATALOG: CustomWorkDef[] = [
  {
    key: "piscine",
    label: "Piscine",
    emoji: "🏊",
    category: "piscine",
    nature: "Piscine & bassin",
  },
  {
    key: "garage",
    label: "Garage",
    emoji: "🚗",
    category: "garage",
    nature: "Garage / abri",
  },
  {
    key: "jardin",
    label: "Jardin",
    emoji: "🌳",
    category: "jardin",
    nature: "Aménagement paysager",
  },
  {
    key: "solaire",
    label: "Panneaux solaires",
    emoji: "☀️",
    category: "installation_solaire",
    nature: "Énergie photovoltaïque",
  },
];

export const CUSTOM_WORK_KEYS: CustomWorkKey[] = CUSTOM_WORK_CATALOG.map((w) => w.key);

const BY_KEY: Record<string, CustomWorkDef> = Object.fromEntries(
  CUSTOM_WORK_CATALOG.map((w) => [w.key, w]),
);

export function isCustomWorkKey(value: unknown): value is CustomWorkKey {
  return typeof value === "string" && value in BY_KEY;
}

export function getCustomWorkDef(key: string): CustomWorkDef | undefined {
  return BY_KEY[key];
}

/**
 * Normalise une sélection : clés connues uniquement, dédoublonnées, dans
 * l'ordre du catalogue. Empêche d'ajouter deux fois le même travail.
 */
export function normalizeCustomWorkKeys(keys: readonly unknown[]): CustomWorkKey[] {
  const set = new Set<string>();
  for (const k of keys) if (isCustomWorkKey(k)) set.add(k);
  return CUSTOM_WORK_KEYS.filter((k) => set.has(k));
}

// ── Dimensions dérivées des données du projet ─────────────────────────────
//
// Les quantités à chiffrer (surface de bassin, surface de garage, surface
// paysagère, surface de toiture pour le photovoltaïque) sont DÉDUITES des
// données réelles du projet — jamais d'un montant. Aucune ne code un prix.

export interface CustomWorkProjectContext {
  /** Emprise au sol (m²). */
  surface: number;
  /** Nombre de niveaux. */
  floors: number;
  /** Surface du terrain (m²), si connue. */
  surfaceTotale?: number;
  /** Nombre de piscines déclarées. */
  pools?: number;
  /** Nombre de garages déclarés. */
  garages?: number;
}

function clamp(n: number, lo: number, hi: number): number {
  const v = Number.isFinite(n) ? n : 0;
  return Math.max(lo, Math.min(hi, v));
}

/** Surface bâtie totale (emprise × niveaux). */
export function builtSurface(ctx: CustomWorkProjectContext): number {
  const emprise = Math.max(1, Number(ctx.surface) || 0);
  return emprise * Math.max(1, Math.round(ctx.floors) || 1);
}

/**
 * Surface à chiffrer pour un travail personnalisé, déduite du projet :
 *  • Piscine : 32 m² par bassin déclaré, sinon ~10 % de la surface bâtie
 *    (bornée 24-72 m²) ;
 *  • Garage : 18 m² par garage déclaré (au moins un) ;
 *  • Jardin : surface restante du terrain hors bâti, sinon ~25 % du bâti ;
 *  • Panneaux solaires : surface de toiture ≈ emprise au sol.
 */
export function resolveCustomWorkSurface(
  key: CustomWorkKey,
  ctx: CustomWorkProjectContext,
): number {
  const built = builtSurface(ctx);
  const emprise = Math.max(1, Number(ctx.surface) || 0);
  switch (key) {
    case "piscine": {
      const declared = Math.round(ctx.pools ?? 0);
      if (declared > 0) return 32 * declared;
      return clamp(Math.round(built * 0.1), 24, 72);
    }
    case "garage": {
      const declared = Math.round(ctx.garages ?? 0);
      return 18 * Math.max(1, declared);
    }
    case "jardin": {
      const terrain = Number(ctx.surfaceTotale) || 0;
      if (terrain > built) return clamp(Math.round(terrain - built), 30, 400);
      return clamp(Math.round(built * 0.25), 40, 300);
    }
    case "solaire":
      return clamp(Math.round(emprise), 20, 400);
    default:
      return clamp(Math.round(built), 20, 400);
  }
}

/**
 * Niveau de finition (données de prix du moteur BIM) correspondant au scénario
 * budgétaire actif : Économique → « economique », Premium → « premium »,
 * Standard / non renseigné → « standard ».
 */
export function scenarioToFinishLevel(scenario?: string): "economique" | "standard" | "premium" {
  if (scenario === "economique") return "economique";
  if (scenario === "premium") return "premium";
  return "standard";
}
