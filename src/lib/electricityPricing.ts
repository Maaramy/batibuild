// ============================================================================
// BARÈME ÉLECTRICITÉ — TUNISIE 2026 (SOURCE UNIQUE DES PRIX DE L'ÉLECTRICITÉ)
// ----------------------------------------------------------------------------
// Deux usages distincts, un seul barème :
//
//   1. « Électricité complète » — coût GLOBAL de l'installation électrique d'un
//      bâtiment neuf, exprimé en TND/m² TTC (`electricite_complete`). Le prix au
//      m² du projet est le barème du niveau de finition, indexé par le
//      coefficient régional de la grille 2026 (base Médenine = 100 %).
//
//   2. « Électricité — Second œuvre et finitions » — coût de la partie
//      électrique INTÉGRÉ à la catégorie « Second œuvre et finitions » du
//      Quantitatif détaillé (lot `second_oeuvre`) : le poste électrique du lot
//      est chiffré barème × surface réellement construite, à la place des
//      forfaits électriques du gabarit. Aucun poste n'est compté deux fois : le
//      sous-total du lot (et donc le coût global TTC) reste inchangé.
//
// Les valeurs ci-dessous sont des HYPOTHÈSES DE PARAMÉTRAGE : elles doivent être
// validées avec les données réelles du marché tunisien. Ce ne sont PAS des
// tarifs officiels et rien ne doit être présenté comme tel.
//
// Module PUR (aucun accès Convex ni React) : il est utilisé par le moteur BIM,
// le générateur du Quantitatif détaillé (DQE), la configuration administrateur
// et les pages qui affichent le poste électrique.
// ============================================================================

/** Niveaux de qualité du barème (identiques aux scénarios budgétaires). */
export type ElectricityLevelKey = "economique" | "standard" | "premium";

/** Barème électricité : prix TND/m² TTC par niveau de qualité. */
export interface ElectricityPrices {
  economique: number;
  standard: number;
  premium: number;
}

/** Fourchette admise d'un niveau du barème (TND/m² TTC). */
export interface ElectricityPriceRange {
  min: number;
  max: number;
}

/** Libellés affichés des niveaux du barème. */
export const ELECTRICITY_LEVELS: { key: ElectricityLevelKey; label: string }[] = [
  { key: "economique", label: "Économique" },
  { key: "standard", label: "Standard" },
  { key: "premium", label: "Premium" },
];

/**
 * Barème par défaut (paramètres initiaux à valider sur le marché tunisien).
 * Aucune de ces valeurs n'est un tarif officiel.
 */
export const DEFAULT_ELECTRICITY_PRICES: ElectricityPrices = {
  economique: 35,
  standard: 65,
  premium: 100,
};

/** Barème par défaut sérialisé pour la base (JSON). */
export const DEFAULT_ELECTRICITY_PRICES_JSON = JSON.stringify(DEFAULT_ELECTRICITY_PRICES);

/**
 * Fourchettes admises pour une saisie administrateur. Une valeur hors bornes est
 * refusée par l'enregistrement : le barème pilote le poste électrique, la
 * catégorie « Second œuvre et finitions » et le coût du type « Électricité
 * complète », jamais un prix invalide.
 */
export const ELECTRICITY_PRICE_RANGES: Record<ElectricityLevelKey, ElectricityPriceRange> = {
  economique: { min: 15, max: 60 },
  standard: { min: 30, max: 120 },
  premium: { min: 50, max: 200 },
};

/**
 * Base de référence du coefficient régional : prix « Standard » de la base
 * Médenine (= 100 % de la grille « Coût de construction au m² – Tunisie 2026 »).
 * Un gouvernorat moins cher que la base reçoit donc un coefficient < 1 et un
 * gouvernorat plus cher un coefficient > 1 — appliqué UNE seule fois au barème.
 */
export const ELECTRICITY_REFERENCE_STD_M2 = 1800;

/** Mention obligatoire partout où le barème est affiché. */
export const ELECTRICITY_PRICING_NOTE =
  "Barème de paramétrage — hypothèses de départ à valider avec les données réelles du marché tunisien 2026. Ces montants ne sont pas des tarifs officiels.";

/** Catégories de projet dont le prix au m² EST le prix de l'électricité. */
export const ELECTRICITY_CATEGORIES = ["electricite_complete", "installations_electricite"] as const;

/**
 * Ventilation indicative du poste électrique (part de chaque sous-poste).
 * La somme des parts vaut 100 % : aucune part n'est perdue ni comptée deux fois.
 */
export const ELECTRICITY_SUBPOSTES: { key: string; label: string; share: number }[] = [
  { key: "tableau", label: "Tableau, protections et mise à la terre", share: 0.2 },
  { key: "cablage", label: "Câblage et gaines", share: 0.24 },
  { key: "points", label: "Prises et commandes (points électriques)", share: 0.18 },
  { key: "eclairage", label: "Points lumineux et luminaires", share: 0.16 },
  { key: "courants_faibles", label: "Courants faibles (VDI, interphone, TV)", share: 0.12 },
  { key: "essais", label: "Essais, mesures et mise en service", share: 0.1 },
];

/** Le type de projet est-il facturé au barème électricité (TND/m²) ? */
export function isElectricityCategory(category?: string | null): boolean {
  if (typeof category !== "string") return false;
  return (ELECTRICITY_CATEGORIES as readonly string[]).includes(category);
}

/** Libellé d'un niveau du barème. */
export function electricityLevelLabel(key: ElectricityLevelKey): string {
  return ELECTRICITY_LEVELS.find((l) => l.key === key)?.label ?? "Standard";
}

/** Niveau du barème correspondant au niveau de finition d'un projet. */
export function electricityLevelFromFinishLevel(
  finishLevel?: string | null,
): ElectricityLevelKey {
  if (finishLevel === "economique" || finishLevel === "eco") return "economique";
  if (finishLevel === "premium") return "premium";
  return "standard";
}

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/**
 * Lit un barème enregistré (JSON) en ignorant toute valeur invalide : la
 * résolution retombe alors, niveau par niveau, sur le barème par défaut.
 */
export function parseElectricityPrices(
  raw?: string | null,
): Partial<ElectricityPrices> | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return undefined;
    const out: Partial<ElectricityPrices> = {};
    for (const { key } of ELECTRICITY_LEVELS) {
      const value = (parsed as Record<string, unknown>)[key];
      if (isPositiveNumber(value)) out[key] = value;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  } catch {
    return undefined;
  }
}

/** Barème EFFECTIF (valeurs enregistrées, complétées par les défauts). */
export function resolveElectricityPrices(
  overrides?: Partial<ElectricityPrices> | null,
): ElectricityPrices {
  const o = overrides ?? {};
  const pick = (key: ElectricityLevelKey) =>
    isPositiveNumber((o as Record<string, unknown>)[key])
      ? Number((o as Record<string, unknown>)[key])
      : DEFAULT_ELECTRICITY_PRICES[key];
  return {
    economique: pick("economique"),
    standard: pick("standard"),
    premium: pick("premium"),
  };
}

/**
 * Contrôle d'une saisie administrateur : renvoie le message d'erreur à afficher
 * si un niveau est hors fourchette ou non numérique, sinon `null`. Un JSON
 * illisible est refusé (jamais de barème partiellement appliqué).
 */
export function validateElectricityPrices(raw?: string | null): string | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "Barème électricité illisible : le format attendu est un objet JSON { economique, standard, premium }.";
  }
  if (!parsed || typeof parsed !== "object") {
    return "Barème électricité invalide : le format attendu est un objet JSON { economique, standard, premium }.";
  }
  const outOfRange: string[] = [];
  for (const { key, label } of ELECTRICITY_LEVELS) {
    const value = (parsed as Record<string, unknown>)[key];
    if (value === undefined) continue; // niveau conservé tel quel
    const bounds = ELECTRICITY_PRICE_RANGES[key];
    if (!isPositiveNumber(value) || value < bounds.min || value > bounds.max) {
      outOfRange.push(`${label} : ${String(value)} (admis ${bounds.min}-${bounds.max} DT/m²)`);
    }
  }
  if (outOfRange.length > 0) {
    return `Barème électricité hors fourchette — ${outOfRange.join(" · ")}. Ces fourchettes sont des hypothèses de départ à valider sur les devis réels tunisiens, pas des tarifs officiels.`;
  }
  return null;
}

/**
 * Coefficient régional appliqué au barème : rapport entre le prix « Standard »
 * du gouvernorat (grille 2026) et la base Médenine. Absent = 1 (base nationale).
 */
export function electricityRegionIndex(regionStdM2?: number | null): number {
  const base = ELECTRICITY_REFERENCE_STD_M2;
  if (!isPositiveNumber(regionStdM2)) return 1;
  return Math.round((regionStdM2 / base) * 10000) / 10000;
}

/** Prix au m² du barème pour un niveau, coefficient régional appliqué une fois. */
export function electricityPricePerM2(
  level: ElectricityLevelKey,
  prices?: Partial<ElectricityPrices> | null,
  regionIndex = 1,
): number {
  const resolved = resolveElectricityPrices(prices);
  const index = isPositiveNumber(regionIndex) ? regionIndex : 1;
  return Math.round(resolved[level] * index);
}

/** Montant d'un poste électrique = prix au m² × surface facturée (m²). */
export function electricityPosteAmount(priceM2: number, builtArea: number): number {
  if (!isPositiveNumber(priceM2) || !isPositiveNumber(builtArea)) return 0;
  return Math.round(priceM2 * builtArea);
}

/** Ventilation indicative d'un montant de poste électrique en sous-postes. */
export function electricitySubPostes(
  amount: number,
): { key: string; label: string; share: number; amount: number }[] {
  const base = isPositiveNumber(amount) ? amount : 0;
  return ELECTRICITY_SUBPOSTES.map((sp) => ({
    ...sp,
    amount: Math.round(base * sp.share),
  }));
}

/** Portée d'un poste électrique dans le moteur d'estimation. */
export type ElectricityPosteScope = "installation_complete" | "second_oeuvre";

/**
 * Poste électrique tel qu'il est enregistré avec le coût estimatif d'un projet
 * puis affiché (page projet, devis PDF).
 */
export interface ElectricityPoste {
  scope: ElectricityPosteScope;
  /** Niveau du barème appliqué (`economique` · `standard` · `premium`). */
  levelKey: ElectricityLevelKey;
  levelLabel: string;
  /** Barème complet en vigueur (TND/m² TTC, base Médenine = 100 %). */
  prices: ElectricityPrices;
  /** Prix de référence du niveau (TND/m² TTC, base Médenine = 100 %). */
  basePriceM2: number;
  /** Coefficient régional appliqué (1 = base nationale). */
  regionIndex: number;
  /** Prix appliqué au m² après coefficient régional (TND/m² TTC). */
  priceM2: number;
  /** Surface de facturation (m² réellement construits). */
  builtArea: number;
  /** Montant TTC du poste (TND). */
  amount: number;
  /** Ventilation indicative du montant. */
  subPostes: { key: string; label: string; share: number; amount: number }[];
  /** Lot qui porte le poste (« Second œuvre et finitions ») le cas échéant. */
  lot?: { id: string; name: string } | null;
  /** Forfaits électriques du gabarit remplacés par le barème (TND). */
  replacedProvision: number;
  /** Mention de non-officialité du barème. */
  note: string;
}

/**
 * Assemble le poste électrique d'un projet à partir du barème effectif.
 * `amount` n'est passé que lorsque le moteur retient un montant différent du
 * produit « prix au m² × surface » (projet « Électricité complète » multi-niveaux).
 */
export function buildElectricityPoste(input: {
  scope: ElectricityPosteScope;
  finishLevel?: string | null;
  prices?: Partial<ElectricityPrices> | null;
  regionStdM2?: number | null;
  builtArea: number;
  amount?: number | null;
  lot?: { id: string; name: string } | null;
  replacedProvision?: number | null;
  note?: string;
}): ElectricityPoste {
  const levelKey = electricityLevelFromFinishLevel(input.finishLevel);
  const regionIndex = electricityRegionIndex(input.regionStdM2);
  const prices = resolveElectricityPrices(input.prices);
  const basePriceM2 = prices[levelKey];
  const priceM2 = electricityPricePerM2(levelKey, prices, regionIndex);
  const builtArea = isPositiveNumber(input.builtArea) ? input.builtArea : 0;
  const amount =
    typeof input.amount === "number" && Number.isFinite(input.amount) && input.amount >= 0
      ? Math.round(input.amount)
      : electricityPosteAmount(priceM2, builtArea);
  return {
    scope: input.scope,
    levelKey,
    levelLabel: electricityLevelLabel(levelKey),
    prices,
    basePriceM2,
    regionIndex,
    priceM2,
    builtArea,
    amount,
    subPostes: electricitySubPostes(amount),
    lot: input.lot ?? null,
    replacedProvision: Math.max(0, Math.round(input.replacedProvision ?? 0)),
    note: input.note ?? ELECTRICITY_PRICING_NOTE,
  };
}
