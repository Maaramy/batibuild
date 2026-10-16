// ============================================================================
// PRIX DE L'ÉLECTRICITÉ — SOURCE UNIQUE DE CALCUL (barème indicatif Tunisie 2026)
// ----------------------------------------------------------------------------
// Deux postes seulement utilisent ce module :
//
//   1. « Électricité complète » — installation électrique complète d'un
//      bâtiment neuf, chiffrée au m² (type de projet `electricite_complete` /
//      `installations_electricite` du moteur BIM).
//   2. « Électricité — Second œuvre et finitions » — le poste électrique du
//      lot « Second œuvre et finitions » du Quantitatif détaillé (DQE).
//
// Les deux postes représentent les MÊMES travaux : une seule source de prix
// (ce module), donc aucun double comptage possible. Le périmètre couvert est
// celui d'une installation complète :
//
//   • gaines, conduits et boîtes d'encastrement ;
//   • câbles et conducteurs ;
//   • prises de courant et prises spécialisées ;
//   • interrupteurs et commandes ;
//   • points lumineux et sorties de câbles ;
//   • tableau électrique, disjoncteurs et protections différentielles ;
//   • mise à la terre et liaisons équipotentielles ;
//   • main-d'œuvre de pose, de raccordement et d'essais.
//
// Ne sont PAS compris (postes traités séparément s'ils existent au catalogue) :
// luminaires décoratifs haut de gamme, appareils électroménagers, domotique,
// équipements photovoltaïques.
//
// ⚠ Les montants ci-dessous sont des HYPOTHÈSES DE PARAMÉTRAGE à valider avec
// les données réelles du marché tunisien : ce ne sont pas des tarifs officiels.
// Ils sont modifiables par l'administrateur (table `bimConfig`, champ
// `electricityPricesM2`) sans modification du code source, avec validation des
// bornes admises et journalisation de la modification.
//
// Module PUR (aucun accès Convex, React ou DOM) : utilisé par le moteur de
// coûts (`convex/bimEngine`), par le générateur du Quantitatif détaillé
// (`convex/dqeEngine`), par la configuration administrateur et par les tests.
// ============================================================================

/** Niveaux de qualité couverts par le barème. */
export type ElectricityScenarioKey = "economique" | "standard" | "premium";

/** Barème d'électricité : un prix TTC au m² par niveau de qualité. */
export interface ElectricityPrices {
  eco: number;
  std: number;
  premium: number;
}

/**
 * Barème de référence 2026 (hypothèses de paramétrage) :
 * Économique 35 DT/m² · Standard 65 DT/m² · Premium 100 DT/m².
 */
export const ELECTRICITY_PRICE_M2: ElectricityPrices = { eco: 35, std: 65, premium: 100 };

/** Sérialisation par défaut du barème (valeur initiale enregistrée en base). */
export const DEFAULT_ELECTRICITY_PRICES_JSON = JSON.stringify(ELECTRICITY_PRICE_M2);

/**
 * Provision d'électricité déjà comprise dans le prix de marché au m² AVANT la
 * mise à jour du barème (barème alors configuré : 60 / 120 / 180 DT/m²).
 * Elle est retirée du coût total lorsque le poste électrique est ajouté au
 * nouveau barème : l'électricité n'est donc jamais comptée deux fois.
 */
export const ELECTRICITY_PROVISION_M2: ElectricityPrices = { eco: 60, std: 120, premium: 180 };

/** Bornes admises pour la saisie administrateur (TND/m²). */
export const ELECTRICITY_PRICE_RANGES: Record<
  keyof ElectricityPrices,
  { min: number; max: number; label: string }
> = {
  eco: { min: 5, max: 200, label: "Économique" },
  std: { min: 5, max: 300, label: "Standard" },
  premium: { min: 5, max: 400, label: "Premium" },
};

/** Mention affichée partout où le barème est présenté. */
export const ELECTRICITY_PRICE_DISCLAIMER =
  "Barème indicatif (hypothèse de paramétrage à valider avec le marché) — installation électrique complète, TTC, main-d'œuvre comprise. Hors luminaires décoratifs haut de gamme, électroménager, domotique et photovoltaïque.";

/**
 * Les six sous-postes du poste électrique. Leurs parts couvrent 100 % du
 * montant du barème × surface : le poste affiché est donc exactement le prix
 * de référence, ventilé sans ajout ni perte.
 */
export const ELECTRICITY_SUBPOSTS: {
  key: string;
  label: string;
  share: number;
  unit: string;
  nature: "equipements" | "main_oeuvre";
  protectedByDqe: true;
}[] = [
  {
    key: "cablage_gaines",
    label: "Électricité — Câblage, gaines et boîtes d'encastrement",
    share: 0.3,
    unit: "lot",
    nature: "equipements",
    protectedByDqe: true,
  },
  {
    key: "prises_interrupteurs",
    label: "Électricité — Prises, prises spécialisées et interrupteurs",
    share: 0.17,
    unit: "lot",
    nature: "equipements",
    protectedByDqe: true,
  },
  {
    key: "tableau_protections",
    label: "Électricité — Tableau, disjoncteurs et protections différentielles",
    share: 0.2,
    unit: "lot",
    nature: "equipements",
    protectedByDqe: true,
  },
  {
    key: "points_lumineux",
    label: "Électricité — Points lumineux et sorties de câbles",
    share: 0.12,
    unit: "lot",
    nature: "equipements",
    protectedByDqe: true,
  },
  {
    key: "terre_essais",
    label: "Électricité — Mise à la terre, liaisons équipotentielles, contrôles et essais",
    share: 0.06,
    unit: "lot",
    nature: "equipements",
    protectedByDqe: true,
  },
  {
    key: "main_oeuvre",
    label: "Électricité — Main-d'œuvre de pose, raccordement et essais",
    share: 0.15,
    unit: "lot",
    nature: "main_oeuvre",
    protectedByDqe: true,
  },
];

/** Somme des parts des sous-postes (contrôle automatique : doit valoir 1). */
export const ELECTRICITY_SUBPOSTS_TOTAL_SHARE = ELECTRICITY_SUBPOSTS.reduce(
  (s, p) => s + p.share,
  0,
);

/** Types de projet dont le périmètre EST l'électricité complète. */
export const ELECTRICITY_PROJECT_TYPES = ["electricite_complete", "installations_electricite"];

/** Le projet est-il de type « Électricité complète » ? */
export function isElectricityProjectType(category?: string | null): boolean {
  return !!category && ELECTRICITY_PROJECT_TYPES.includes(category);
}

/** Niveau de qualité d'un scénario (le scénario « Personnalisé » suit sa base). */
export function electricityScenarioKey(scenario?: string | null): ElectricityScenarioKey {
  const s = String(scenario ?? "").toLowerCase();
  if (s === "economique" || s === "eco") return "economique";
  if (s === "premium" || s === "haut_standing" || s === "luxe") return "premium";
  return "standard";
}

/** Clé interne (`eco` / `std` / `premium`) d'un scénario. */
function priceKey(scenario?: string | null): keyof ElectricityPrices {
  const key = electricityScenarioKey(scenario);
  return key === "economique" ? "eco" : key === "premium" ? "premium" : "std";
}

/** Prix au m² du barème pour un scénario (TND TTC). */
export function electricityPriceM2(
  prices: ElectricityPrices | null | undefined,
  scenario?: string | null,
): number {
  const value = prices?.[priceKey(scenario)];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Lit les prix enregistrés par l'administrateur (JSON). Toute valeur absente,
 * non numérique ou hors bornes est ignorée : le barème de référence s'applique
 * alors, le moteur n'utilise jamais un prix invalide.
 */
export function parseElectricityPrices(raw?: string | null): Partial<ElectricityPrices> | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return undefined;
    const out: Partial<ElectricityPrices> = {};
    for (const key of ["eco", "std", "premium"] as const) {
      const value = (parsed as Record<string, unknown>)[key];
      const bounds = ELECTRICITY_PRICE_RANGES[key];
      if (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= bounds.min &&
        value <= bounds.max
      ) {
        out[key] = value;
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  } catch {
    return undefined;
  }
}

/** Barème effectif : valeurs par défaut complétées par la configuration administrateur. */
export function resolveElectricityPrices(
  overrides?: Partial<ElectricityPrices> | null,
): ElectricityPrices {
  return {
    eco: overrides?.eco ?? ELECTRICITY_PRICE_M2.eco,
    std: overrides?.std ?? ELECTRICITY_PRICE_M2.std,
    premium: overrides?.premium ?? ELECTRICITY_PRICE_M2.premium,
  };
}

/** Erreur de saisie du barème (message affiché dans le panneau d'administration). */
export function validateElectricityPrices(raw: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "Barème électricité : JSON invalide (attendu {\"eco\":35,\"std\":65,\"premium\":100}).";
  }
  if (!parsed || typeof parsed !== "object") {
    return "Barème électricité : objet attendu ({\"eco\":…,\"std\":…,\"premium\":…}).";
  }
  for (const key of ["eco", "std", "premium"] as const) {
    const value = (parsed as Record<string, unknown>)[key];
    const bounds = ELECTRICITY_PRICE_RANGES[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return `Barème électricité : « ${key} » doit être un nombre (TND/m²).`;
    }
    if (value < bounds.min || value > bounds.max) {
      return `Barème électricité : « ${key} » = ${value} DT/m² hors bornes admises (${bounds.min}-${bounds.max}).`;
    }
  }
  return null;
}

/**
 * Coefficient régional appliqué au barème : coefficient du gouvernorat du
 * projet, base Médenine = 100 % (même référence que la grille tarifaire 2026).
 * Il est fourni par le moteur (`prix régional du niveau / base Médenine`) pour
 * ne pas dupliquer la grille : ce module ne contient aucun prix régional.
 */
export function electricityRegionFactor(regionPriceM2: number, basePriceM2: number): number {
  if (!(regionPriceM2 > 0) || !(basePriceM2 > 0)) return 1;
  return regionPriceM2 / basePriceM2;
}

/**
 * Montant du poste électrique pour une surface donnée :
 *   montant = surface × prix au m² du scénario × coefficient régional.
 */
export function electricityAmount(input: {
  /** Surface de référence du projet (surface réellement construite, m²). */
  surface: number;
  scenario?: string | null;
  prices?: ElectricityPrices | null;
  regionFactor?: number;
}): number {
  const price = electricityPriceM2(input.prices ?? ELECTRICITY_PRICE_M2, input.scenario);
  const surface = Number(input.surface) || 0;
  const factor = input.regionFactor && input.regionFactor > 0 ? input.regionFactor : 1;
  if (price <= 0 || surface <= 0) return 0;
  return Math.round(surface * price * factor);
}

/** Ligne détaillée du poste électrique (sous-poste) prête pour le DQE. */
export interface ElectricityBreakdownLine {
  key: string;
  label: string;
  share: number;
  amount: number;
  unit: string;
  nature: "equipements" | "main_oeuvre";
}

/**
 * Ventilation d'un montant électrique sur les six sous-postes. La somme des
 * montants est EXACTEMENT le montant fourni (le résidu d'arrondi est absorbé
 * par la main-d'œuvre, dernière ligne) : aucun dinars créé ni perdu.
 */
export function electricityBreakdown(amount: number): ElectricityBreakdownLine[] {
  const total = Math.max(0, Math.round(Number(amount) || 0));
  const lines: ElectricityBreakdownLine[] = ELECTRICITY_SUBPOSTS.map((p) => ({
    key: p.key,
    label: p.label,
    share: p.share,
    amount: Math.round(total * p.share),
    unit: p.unit,
    nature: p.nature,
  }));
  if (lines.length > 0) {
    const sum = lines.reduce((s, l) => s + l.amount, 0);
    lines[lines.length - 1].amount += total - sum;
  }
  return lines;
}

/** Poste électrique complet d'un projet (affichage, PDF, administration). */
export interface ElectricityEstimate {
  /** Niveau de qualité appliqué (barème). */
  scenario: ElectricityScenarioKey;
  scenarioLabel: string;
  /** Prix au m² du barème (TTC). */
  priceM2: number;
  /** Coefficient régional appliqué au barème (base Médenine = 1). */
  regionFactor: number;
  /** Surface de référence utilisée (m² construits). */
  surface: number;
  /** Montant du poste au nouveau barème. */
  amount: number;
  /** Provision d'électricité déjà comprise dans le coût de marché. */
  provision: number;
  /** Variation du coût total apportée par la mise à jour du barème. */
  adjustment: number;
  /** Ventilation du montant par sous-poste. */
  breakdown: ElectricityBreakdownLine[];
}

const SCENARIO_LABELS: Record<ElectricityScenarioKey, string> = {
  economique: "Économique",
  standard: "Standard",
  premium: "Premium",
};

/**
 * Calcule le poste électrique d'un projet : nouveau montant (barème), provision
 * déjà incluse dans le coût de marché, et variation à appliquer au coût total.
 *
 * `provision` est FOURNIE par l'appelant (moteur de coûts / DQE) : elle
 * représente l'électricité que le quantitatif allouait avant la mise à jour du
 * barème. Elle n'est jamais recalculée ici à partir d'un pourcentage inventé.
 */
export function electricityEstimate(input: {
  surface: number;
  scenario?: string | null;
  prices?: ElectricityPrices | null;
  regionFactor?: number;
  provision?: number;
}): ElectricityEstimate {
  const key = electricityScenarioKey(input.scenario);
  const prices = resolveElectricityPrices(input.prices ?? undefined);
  const priceM2 = electricityPriceM2(prices, key);
  const regionFactor = input.regionFactor && input.regionFactor > 0 ? input.regionFactor : 1;
  const amount = electricityAmount({
    surface: input.surface,
    scenario: key,
    prices,
    regionFactor,
  });
  const provision = Math.max(0, Math.round(Number(input.provision) || 0));
  return {
    scenario: key,
    scenarioLabel: SCENARIO_LABELS[key],
    priceM2,
    regionFactor,
    surface: Math.round(Number(input.surface) || 0),
    amount,
    provision,
    adjustment: amount - provision,
    breakdown: electricityBreakdown(amount),
  };
}

/** Barème lu au format « moteur BIM » (prix au m² par niveau de qualité). */
export function electricityPriceRow(prices?: ElectricityPrices | null): {
  eco: number;
  std: number;
  premium: number;
} {
  const resolved = resolveElectricityPrices(prices ?? undefined);
  return { eco: resolved.eco, std: resolved.std, premium: resolved.premium };
}
