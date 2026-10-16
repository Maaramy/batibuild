// ============================================================================
// IMPACT RÉGIONAL & COMPARATIF RÉGIONAL — SOURCE UNIQUE DE CALCUL
// ----------------------------------------------------------------------------
// Problème corrigé : l'impact régional et le comparatif régional étaient
// calculés avec des pourcentages régionaux FIXES codés en dur (multiplicateurs
// 0,90 – 1,15) appliqués au seul coût du scénario « Standard ». Changer de
// scénario (Économique / Standard / Premium / Personnalisé) ne modifiait donc
// jamais ces deux blocs, et le comparatif ne retombait pas sur le total
// réellement affiché (la surface de CHAQUE niveau y était facturée au prix
// complet du RDC, frais communs compris).
//
// Méthode retenue :
//
//   • Le prix au m² régional est celui de la GRILLE 2026 configurée pour le
//     scénario actif (Économique / Standard / Premium) ; le coefficient
//     régional y est déjà compris : il n'est donc appliqué qu'UNE seule fois,
//     jamais majoré une seconde fois par un facteur régional global.
//   • Le total du scénario actif (scénario « Personnalisé » compris) est celui
//     qui est RÉELLEMENT affiché. Chaque région est ensuite obtenue en ne
//     faisant varier QUE le paramètre régional :
//
//         total(région) = total(actif) × prix(région) / prix(région actuelle)
//
//     → même projet, même surface, mêmes quantités, même DQE, même scénario :
//     seuls les prix de référence régionaux changent. La région active retombe
//     donc EXACTEMENT sur le total affiché, sans double majoration.
//   • La région de référence est Médenine, base 100 % de la grille 2026.
//
// Module PUR (aucun accès Convex, React ou DOM) : utilisé par le moteur BIM
// (`convex/bimEngine`), par la page de résultat et par les tests.
// ============================================================================

/** Scénarios de la grille régionale 2026 (niveaux de la feuille « Couts_24_gouv »). */
export type RegionScenarioKey = "economique" | "standard" | "premium";

/** Prix au m² (TND, TTC) d'un gouvernorat pour un niveau de la grille. */
export interface RegionGridPrice {
  eco: number;
  std: number;
  premium: number;
  /** Fourchettes affichables de la grille (facultatif) : « 1600-2000 ». */
  ecoRange?: string;
  stdRange?: string;
  premiumRange?: string;
}

/** Grille régionale complète : un prix par gouvernorat et par niveau. */
export type RegionGridPrices = Record<string, RegionGridPrice>;

/** Région de référence (base 100 % de la grille 2026). */
export const REFERENCE_REGION = "medenine";
export const REFERENCE_REGION_LABEL = "Médenine";

export const REGION_SCENARIO_LABELS: Record<RegionScenarioKey, string> = {
  economique: "Économique",
  standard: "Standard",
  premium: "Premium",
};

/** Niveau de la grille 2026 utilisé par chaque scénario budgétaire. */
const GRID_KEY: Record<RegionScenarioKey, "eco" | "std" | "premium"> = {
  economique: "eco",
  standard: "std",
  premium: "premium",
};

/** Clé de la fourchette affichable correspondant au niveau de la grille. */
const RANGE_KEY: Record<"eco" | "std" | "premium", keyof RegionGridPrice> = {
  eco: "ecoRange",
  std: "stdRange",
  premium: "premiumRange",
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Normalise un scénario inconnu vers le niveau « Standard » (repli du moteur). */
export function normalizeRegionScenario(scenario?: string | null): RegionScenarioKey {
  return scenario === "economique" || scenario === "premium" ? scenario : "standard";
}

/** Prix au m² de la grille pour une région et un scénario (0 si inconnu). */
export function gridPriceM2(
  gridPrices: RegionGridPrices | null | undefined,
  region: string,
  scenario?: string | null,
): number {
  const key = GRID_KEY[normalizeRegionScenario(scenario)];
  const value = gridPrices?.[region]?.[key];
  return typeof value === "number" && value > 0 ? value : 0;
}

/**
 * Prix moyen au m² d'un niveau de la grille (moyenne nationale des 24
 * gouvernorats). Sert de référence comparative nationale pour le scénario
 * AFFICHÉ : l'écart change donc lui aussi avec le scénario, contrairement à
 * l'ancienne référence figée sur le Standard de Médenine.
 */
export function nationalAvgPriceM2(
  nationalAvg: { eco: number; std: number; premium: number } | null | undefined,
  scenario?: string | null,
): number {
  const key = GRID_KEY[normalizeRegionScenario(scenario)];
  const value = nationalAvg?.[key];
  return typeof value === "number" && value > 0 ? value : 0;
}

/** Ligne du comparatif régional (une région tunisienne). */
export interface RegionComparisonRow {
  region: string;
  label: string;
  /** Prix au m² de la grille du scénario actif (TTC). */
  priceM2: number;
  /**
   * Coefficient régional de la région, base 100 % = région de référence
   * (prix région / prix référence). Vaut exactement 1 pour la référence.
   */
  factor: number;
  /**
   * Multiplicateur réellement appliqué au total affiché pour obtenir le total
   * de cette région (prix région / prix région active). Il vaut 1 pour la
   * région du projet : le coefficient régional de la grille n'a donc été
   * appliqué qu'une seule fois.
   */
  appliedFactor: number;
  /** Total TTC du scénario actif dans cette région (mêmes quantités). */
  totalCost: number;
  /** Coût au m² sur la surface réellement construite. */
  costPerM2: number;
  /** Écart en dinars par rapport à la région de référence. */
  deltaAmount: number;
  /** Écart en pourcentage par rapport à la région de référence. */
  deltaPct: number;
  /** La région de référence (base 100 % de la grille). */
  isReference: boolean;
  /** La région active du projet (celle du total affiché). */
  isActive: boolean;
}

/** Impact régional complet du scénario actif (résumé + comparatif des régions). */
export interface RegionImpact {
  region: string;
  regionLabel: string;
  scenario: RegionScenarioKey;
  scenarioLabel: string;
  referenceRegion: string;
  referenceLabel: string;
  /** Prix au m² de la région active pour le scénario actif (TTC). */
  priceM2: number;
  /** Fourchette de la grille pour ce niveau (si la grille la fournit). */
  priceRange?: string;
  /** Coefficient régional appliqué une seule fois (région active / référence). */
  factor: number;
  /** Total TTC du scénario actif dans sa région (= total affiché). */
  total: number;
  /** Même projet, mêmes quantités, à la région de référence. */
  totalReference: number;
  /** Écart en dinars vs la région de référence. */
  difference: number;
  /** Écart en pourcentage vs la région de référence. */
  differencePct: number;
  /** Prix moyen national du niveau du scénario (TND/m²). */
  nationalAvgPriceM2: number;
  /** Même projet, mêmes quantités, au prix moyen national du scénario. */
  totalNationalAvg?: number;
  /** Écart en pourcentage vs la moyenne nationale du scénario. */
  differenceVsNationalPct?: number;
  realBuiltArea: number;
  /** Surface équivalente pondérée par les coefficients de niveau (si connue). */
  equivalentArea?: number;
  /** Comparatif des régions (région la plus chère en premier). */
  regions: RegionComparisonRow[];
  /** La région active retombe exactement sur le total affiché. */
  coherent: boolean;
}

export interface RegionImpactInput {
  /** Région active du projet. Absente → aucun impact régional. */
  region?: string | null;
  /** Scénario actif : niveau de la grille régionale appliqué. */
  scenario: RegionScenarioKey | string;
  /** Libellé du scénario affiché (facultatif — « Personnalisé · base Standard »). */
  scenarioLabel?: string;
  /** Grille régionale configurée (prix TTC/m² par gouvernorat et par niveau). */
  gridPrices: RegionGridPrices | null | undefined;
  /** Libellés des gouvernorats (affichage). */
  labels?: Record<string, string> | null;
  /** Région de référence (base 100 %) — Médenine par défaut. */
  referenceRegion?: string;
  /** Moyenne nationale par niveau (prix TTC/m²). */
  nationalAvg?: { eco: number; std: number; premium: number } | null;
  /** Total TTC RÉELLEMENT affiché du scénario actif, dans sa propre région. */
  activeTotal: number;
  /** Surface réellement construite (m²) — base du coût au m². */
  realBuiltArea: number;
  /** Surface équivalente pondérée (information : identique dans toutes les régions). */
  equivalentArea?: number;
  /** Comparaison restreinte à certaines régions (sinon toute la grille). */
  restrict?: readonly string[];
}

/**
 * Calcule l'impact régional et le comparatif régional du SCÉNARIO ACTIF.
 *
 * Le total affiché est pris comme référence : chaque région n'est qu'une
 * variation du paramètre régional (prix de la grille), donc aucun poste (gros
 * œuvre, second œuvre, frais communs, quantités du DQE) n'est recalculé ni
 * compté deux fois, et le coefficient régional n'est appliqué qu'une seule fois.
 *
 * Retourne `undefined` quand il n'y a pas de région exploitable : l'interface
 * masque alors le bloc, comme avant.
 */
export function computeRegionImpact(input: RegionImpactInput): RegionImpact | undefined {
  const region = input.region;
  if (!region) return undefined;

  const scenario = normalizeRegionScenario(input.scenario);
  const key = GRID_KEY[scenario];
  const activeGridPrice = gridPriceM2(input.gridPrices, region, scenario);
  if (activeGridPrice <= 0) return undefined;

  const total = Number(input.activeTotal);
  if (!Number.isFinite(total) || total <= 0) return undefined;

  const referenceRegion = input.referenceRegion ?? REFERENCE_REGION;
  if (referenceRegion === region) return undefined;
  const referenceGridPrice = gridPriceM2(input.gridPrices, referenceRegion, scenario);
  if (referenceGridPrice <= 0) return undefined;

  const label = (r: string) => input.labels?.[r] ?? r;
  const realBuiltArea = Number(input.realBuiltArea) || 0;

  /** Prix de la grille d'une région pour le scénario actif (repli : région active). */
  const priceOf = (r: string) => gridPriceM2(input.gridPrices, r, scenario) || activeGridPrice;

  /**
   * Même projet, mêmes quantités, même scénario : seul le prix régional de la
   * grille change. Le coefficient régional (prix région / prix région active)
   * est donc appliqué UNE seule fois au total réellement affiché.
   */
  const totalOf = (r: string) => Math.round((total * priceOf(r)) / activeGridPrice);

  const referenceTotal = totalOf(referenceRegion);

  const candidates = (input.restrict ?? Object.keys(input.gridPrices ?? {}))
    .filter((r) => typeof input.gridPrices?.[r]?.[key] === "number");

  const regions: RegionComparisonRow[] = candidates
    .map((r) => {
      const priceM2 = priceOf(r);
      const factor = priceM2 / referenceGridPrice;
      const appliedFactor = priceM2 / activeGridPrice;
      const totalCost = totalOf(r);
      return {
        region: r,
        label: label(r),
        priceM2: Math.round(priceM2),
        factor,
        appliedFactor,
        totalCost,
        costPerM2: realBuiltArea > 0 ? Math.round(totalCost / realBuiltArea) : Math.round(priceM2),
        deltaAmount: totalCost - referenceTotal,
        deltaPct: round1((factor - 1) * 100),
        isReference: r === referenceRegion,
        isActive: r === region,
      };
    })
    .sort((a, b) => b.totalCost - a.totalCost || a.label.localeCompare(b.label));

  const factor = activeGridPrice / referenceGridPrice;
  const nationalAvg = nationalAvgPriceM2(input.nationalAvg, scenario);
  const totalNationalAvg = nationalAvg > 0 ? Math.round((total * nationalAvg) / activeGridPrice) : undefined;

  return {
    region,
    regionLabel: label(region),
    scenario,
    scenarioLabel: input.scenarioLabel ?? REGION_SCENARIO_LABELS[scenario],
    referenceRegion,
    referenceLabel: label(referenceRegion) || REFERENCE_REGION_LABEL,
    priceM2: Math.round(activeGridPrice),
    priceRange: input.gridPrices?.[region]?.[RANGE_KEY[key]] as string | undefined,
    factor,
    total,
    totalReference: referenceTotal,
    difference: total - referenceTotal,
    differencePct: round1((factor - 1) * 100),
    nationalAvgPriceM2: nationalAvg,
    totalNationalAvg,
    differenceVsNationalPct:
      totalNationalAvg && totalNationalAvg > 0 ? round1((total / totalNationalAvg - 1) * 100) : undefined,
    realBuiltArea,
    equivalentArea: input.equivalentArea,
    regions,
    coherent: regions.some((r) => r.isActive && r.totalCost === total) && regions.some((r) => r.isReference && r.factor === 1),
  };
}

/**
 * Contrôle automatique de l'impact régional : aucune incohérence n'est masquée,
 * chaque anomalie est remontée en clair (même approche que le contrôle du
 * calcul multi-niveaux de `lib/buildingLevels`).
 */
export function checkRegionImpact(impact: RegionImpact | undefined): string[] {
  const anomalies: string[] = [];
  if (!impact) return anomalies;

  const active = impact.regions.find((r) => r.isActive);
  const reference = impact.regions.find((r) => r.isReference);

  if (!active) {
    anomalies.push("La région active du projet est absente du comparatif régional.");
  } else if (active.totalCost !== impact.total) {
    anomalies.push(
      `Le total de la région active (${active.totalCost} TND) ne correspond pas au total du scénario affiché (${impact.total} TND).`,
    );
  }
  if (!reference) {
    anomalies.push("La région de référence est absente du comparatif régional.");
  } else if (reference.factor !== 1) {
    anomalies.push(
      `Le coefficient de la région de référence doit valoir 1 (${reference.factor}) : le coefficient régional est appliqué plusieurs fois.`,
    );
  }
  if (impact.regions.length < 2) {
    anomalies.push("Comparatif régional incomplet : au moins deux régions sont nécessaires pour comparer.");
  }
  if (impact.regions.some((r) => r.totalCost <= 0 || r.factor <= 0)) {
    anomalies.push("Une région du comparatif porte un montant ou un coefficient régional nul : la grille régionale est incomplète.");
  }
  return anomalies;
}
