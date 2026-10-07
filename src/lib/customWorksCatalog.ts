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
// n'est saisi à la main.
//
// Exception volontaire : les PANNEAUX SOLAIRES ne sont JAMAIS chiffrés au m².
// Leur coût = nombre de panneaux choisi par l'utilisateur × prix unitaire d'un
// panneau, ce prix étant DÉFINI PAR LE SYSTÈME selon le type de panneau retenu
// (voir `SOLAR_PANEL_TYPE` et `bimEngine.solarPanelUnitPrice`).
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

// ── Panneaux solaires : type retenu + nombre de panneaux ──────────────────
//
// Le poste « Panneaux solaires » est chiffré UNIQUEMENT à partir du nombre de
// panneaux : aucun métrage, aucune surface, aucun m² n'entre dans son calcul.

/** Type de panneau photovoltaïque proposé par le système. */
export interface SolarPanelType {
  /** Identifiant technique du type retenu. */
  id: string;
  /** Libellé affiché (et référence du poste dans le moteur BIM). */
  label: string;
  /** Puissance crête d'un panneau (Wc). */
  powerWc: number;
  /** Unité de quantité affichée dans les résultats. */
  unit: string;
}

/**
 * Type de panneau RETENU par le système pour le poste solaire (référence du
 * catalogue matériaux 2026 « Panneau photovoltaïque 450 Wc monocristallin »).
 * Le prix unitaire n'est pas saisi : il est défini par le système pour ce type
 * (`bimEngine.solarPanelUnitPrice`, catalogue 2026 ou prix en direct).
 */
export const SOLAR_PANEL_TYPE: SolarPanelType = {
  id: "photovoltaique_monocristallin_450wc",
  label: "Panneau photovoltaïque 450 Wc monocristallin",
  powerWc: 450,
  unit: "panneaux",
};

/** Nombre de panneaux proposés à l'utilisateur (sélecteur 1 → 5). */
export const SOLAR_PANEL_COUNT_OPTIONS: number[] = [1, 2, 3, 4, 5];

/** Bornes du sélecteur de panneaux. */
export const SOLAR_PANEL_MIN_COUNT = 1;
export const SOLAR_PANEL_MAX_COUNT = 5;

/** Nombre de panneaux retenu par défaut (aucun choix enregistré). */
export const SOLAR_PANEL_DEFAULT_COUNT = 3;

/**
 * Borne le nombre de panneaux : entier entre 1 et 5 (valeur par défaut si
 * absent ou invalide). Aucune surface n'intervient.
 */
export function normalizeSolarPanelCount(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return SOLAR_PANEL_DEFAULT_COUNT;
  return Math.min(SOLAR_PANEL_MAX_COUNT, Math.max(SOLAR_PANEL_MIN_COUNT, n));
}

// ── Dimensions dérivées des données du projet ─────────────────────────────
//
// Les quantités à chiffrer (surface de bassin, surface de garage, surface
// paysagère) sont DÉDUITES des données réelles du projet — jamais d'un montant.
// Aucune ne code un prix. Les panneaux solaires n'utilisent AUCUNE surface.

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
 *  • Jardin : surface restante du terrain hors bâti, sinon ~25 % du bâti.
 *
 * Les panneaux solaires n'y figurent pas : leur quantité est un NOMBRE DE
 * PANNEAUX choisi par l'utilisateur (aucun m²).
 */
export function resolveCustomWorkSurface(
  key: CustomWorkKey,
  ctx: CustomWorkProjectContext,
): number {
  const built = builtSurface(ctx);
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
      // Aucun métrage : le poste solaire se chiffre au nombre de panneaux.
      return 0;
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
