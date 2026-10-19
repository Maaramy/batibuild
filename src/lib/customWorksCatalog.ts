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
// Leur coût = nombre de panneaux choisi par l'utilisateur × prix unitaire TTC
// POSÉ d'un panneau (matériel + pose + raccordement), ce prix étant DÉFINI PAR
// LE SYSTÈME selon le type de panneau retenu et le scénario (`SOLAR_PANEL_TYPE`
// et `solarPanelUnitPrice`).
// ============================================================================

/**
 * Icônes lucide disponibles pour les travaux (noms de composants de la
 * bibliothèque déjà utilisée par toute la plateforme). Ajouter un travail = ajouter
 * son nom ici et son entrée dans `CUSTOM_WORK_CATALOG` + `CustomWorkIcon`.
 */
export type CustomWorkIconName = "Waves" | "Car" | "CookingPot" | "TreePine" | "Sun";

/** Clés des travaux personnalisés prédéfinis. */
export type CustomWorkKey =
  | "piscine"
  | "garage"
  | "cuisine_exterieure"
  | "jardin"
  | "solaire";

export interface CustomWorkDef {
  key: CustomWorkKey;
  /** Libellé affiché. */
  label: string;
  /**
   * Nom du composant d'icône **lucide-react** (même bibliothèque que toute la
   * plateforme, même style de tracé). Ce nom est résolu en composant par
   * `CustomWorkIcon` — source unique : changer une icône ne se fait qu'ici.
   */
  icon: CustomWorkIconName;
  /**
   * Couleur de la part du travail dans « Répartition » et « Détail par
   * catégorie » (scénario « Personnalisé »). Teintes complémentaires de la
   * palette BIM du résultat de coût : une teinte distincte par travail, comme
   * une catégorie de travaux supplémentaire.
   */
  color: string;
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
    // Même icône que la catégorie « Matériaux pour piscine » de la plateforme.
    icon: "Waves",
    color: "#06b6d4",
    category: "piscine",
    nature: "Piscine & bassin",
  },
  {
    key: "garage",
    label: "Garage",
    icon: "Car",
    color: "#64748b",
    category: "garage",
    nature: "Garage / abri",
  },
  {
    key: "cuisine_exterieure",
    label: "Cuisine extérieure",
    // Même icône que le type « Rénovation Cuisine » de la plateforme.
    icon: "CookingPot",
    color: "#f97316",
    category: "cuisine_exterieure",
    nature: "Cuisine & barbecue extérieurs",
  },
  {
    key: "jardin",
    label: "Jardin",
    // Même icône que la catégorie « Aménagement extérieur / jardins ».
    icon: "TreePine",
    color: "#14b8a6",
    category: "jardin",
    nature: "Aménagement paysager",
  },
  {
    key: "solaire",
    label: "Panneaux solaires",
    // Même icône que la catégorie « Panneaux solaires » de la plateforme.
    icon: "Sun",
    color: "#eab308",
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
  /**
   * Prix unitaire TTC (TND) d'un panneau POSÉ — fourniture, pose et
   * raccordement compris —, par niveau de finition (scénario budgétaire).
   * Référentiel système 2026 : une installation photovoltaïque raccordée au
   * réseau revient à environ 1 800 à 2 000 DT TTC par panneau posé (soit ≈ 7
   * 500 à 9 800 DT TTC pour une installation complète de 2 à 3 kWc, 4 à 5
   * panneaux). Aucun métrage ne module ce prix.
   */
  unitPriceTnd: { economique: number; standard: number; premium: number };
}

/**
 * Type de panneau RETENU par le système pour le poste solaire (référence du
 * catalogue matériaux 2026 « Panneau photovoltaïque 450 Wc monocristallin »).
 * Le prix unitaire n'est jamais saisi : il est défini par le système pour ce
 * type de panneau, TTC posé (voir `unitPriceTnd`).
 */
export const SOLAR_PANEL_TYPE: SolarPanelType = {
  id: "photovoltaique_monocristallin_450wc",
  label: "Panneau photovoltaïque 450 Wc monocristallin",
  powerWc: 450,
  unit: "panneaux",
  unitPriceTnd: { economique: 1800, standard: 1900, premium: 2000 },
};

/**
 * Prix unitaire système (TND TTC) d'UN panneau POSÉ, selon le niveau de
 * finition (scénario budgétaire). Ce prix comprend le matériel, la pose et le
 * raccordement : il n'est jamais calculé à partir d'une surface en m².
 */
export function solarPanelUnitPrice(finishLevel?: string): number {
  const level =
    finishLevel === "economique" || finishLevel === "premium" ? finishLevel : "standard";
  return SOLAR_PANEL_TYPE.unitPriceTnd[level];
}

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
 *  • Garage : 12 m² par garage déclaré (au moins un) ;
 *  • Cuisine extérieure : ~6 % du bâti (bornée 10-24 m²) ;
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
      return 12 * Math.max(1, declared);
    }
    case "cuisine_exterieure":
      // Cuisine d'été : surface déduite du bâti (~6 %), bornée 10-24 m²
      // (plan de travail, barbecue / plancha et auvent).
      return clamp(Math.round(built * 0.06), 10, 24);
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

// ── Conditions d'accès aux travaux complémentaires ─────────────────────────
//
// La fonctionnalité « Travaux complémentaires personnalisés » n'est proposée
// que pour les SEPT types de projet autorisés ci-dessous ET dont la surface
// couverte est supérieure ou égale à 120 m².
//
// Types EXCLUS : studio, local commercial, bureau, entrepôt et tous les autres
// types (groupe B du Project Journey). Pour ces projets : aucune option de
// sélection affichée, aucun poste dans le Quantitatif détaillé, aucun coût
// ajouté au total (contrôle identique côté backend, `convex/customWorks.ts`).
// La sélection déjà enregistrée n'est jamais effacée : elle est simplement
// neutralisée, puis redevient active si le projet redevient éligible.
//
// En dehors de ces conditions, la fonctionnalité est masquée et le scénario
// « Personnalisé » se comporte exactement comme avant.

export const COMPLEMENTARY_WORK_PROJECT_TYPES: string[] = [
  "maison",
  "villa",
  "appartement",
  "duplex",
  "immeuble",
  "residence_touristique",
  "projet_neuf",
];

/** Surface couverte minimale du projet (m²) pour accéder aux travaux. */
export const COMPLEMENTARY_WORK_MIN_SURFACE = 120;

/**
 * Le projet est-il éligible aux travaux complémentaires ?
 * Les anciens slugs « Maison R+1 / R+2 » sont ramenés à « maison » par les
 * appelants (`normalizeLegacyCategory`) ; la comparaison reste tolérante ici.
 */
export function isComplementaryWorkEligible(
  category: string | undefined | null,
  surface: number | undefined | null,
): boolean {
  const cat = String(category ?? "").trim();
  if (!COMPLEMENTARY_WORK_PROJECT_TYPES.includes(cat)) return false;
  const s = Number(surface);
  return Number.isFinite(s) && s >= COMPLEMENTARY_WORK_MIN_SURFACE;
}

// ── Catégories « Travaux complémentaires personnalisés » du Quantitatif ────
//
// Chaque travail complémentaire sélectionné forme SA PROPRE catégorie du
// Quantitatif détaillé, exactement comme « Gros œuvre » ou « Second œuvre et
// finitions » : son titre est le libellé du travail (`Piscine`, `Garage`, …) et
// ses lignes sont les articles réels du moteur, regroupés par nature (postes
// Matériaux, Main-d'œuvre, Outillage & Équipements, Transport, Études).
// Les catégories sont insérées à la suite de « Second œuvre et finitions »,
// immédiatement AVANT « Aménagement extérieur ». Leur identifiant n'est pas
// modifiable par l'utilisateur (hors des catégories éditables) et n'entre
// jamais en conflit avec un lot existant du moteur DQE.

export const COMPLEMENTARY_WORKS_LOT_PREFIX = "travaux_personnalises";

/** Identifiant de la catégorie d'un travail complémentaire donné. */
export function complementaryWorkLotId(key: string): string {
  return `${COMPLEMENTARY_WORKS_LOT_PREFIX}_${key}`;
}

/**
 * L'identifiant appartient-il à une catégorie de travaux complémentaires
 * personnalisés ? (sert à éviter tout doublon à l'insertion)
 */
export function isComplementaryWorkLotId(lotId?: string | null): boolean {
  return String(lotId ?? "").startsWith(`${COMPLEMENTARY_WORKS_LOT_PREFIX}_`);
}

/** Identifiant / libellé du lot « Aménagement extérieur » du moteur DQE. */
export const EXTERIOR_LOT_ID = "amenagements_exterieurs";
export const EXTERIOR_LOT_MATCH = /amenagement/;
