// ============================================================================
// ÉVOLUTION ANNUELLE DES COÛTS DE CONSTRUCTION — moteur PUR
// ----------------------------------------------------------------------------
// Source unique des taux d'évolution paramétrables par l'administrateur
// (panneau d'administration → Barème des coûts → Évolution annuelle des coûts).
//
// Aucune dépendance Convex / React : ce module est utilisé par le backend
// (`convex/costEvolution.ts`), par l'interface d'administration et par les
// rapports PDF, afin qu'un même taux ne puisse jamais diverger entre deux
// affichages.
//
// LES TAUX FOURNIS PAR DÉFAUT SONT DES HYPOTHÈSES DE SIMULATION. Ils ne sont
// jamais présentés comme des taux officiels garantis du marché tunisien.
//
// Règle de calcul (projection composée) :
//   Coût futur = Coût de référence × (1 + taux annuel / 100) ^ nombre d'années
//
// Le calcul part TOUJOURS du coût de référence : un montant déjà projeté n'est
// jamais reprojeté (aucune double augmentation).
// ============================================================================

// ── Catégories de travaux ───────────────────────────────────────────────────

export type CostEvolutionCategoryKey =
  | "gros_oeuvre"
  | "maconnerie_cloisons"
  | "electricite"
  | "plomberie"
  | "enduits_platrerie"
  | "peinture"
  | "revetements_finitions"
  | "menuiserie_ferronnerie"
  | "amenagements_exterieurs"
  | "main_oeuvre"
  | "transport_logistique";

export interface CostEvolutionCategoryMeta {
  key: CostEvolutionCategoryKey;
  label: string;
}

/**
 * Catégories de travaux pilotées par le module — l'ordre est celui affiché
 * dans le panneau d'administration et dans les rapports.
 */
export const COST_EVOLUTION_CATEGORIES: CostEvolutionCategoryMeta[] = [
  { key: "gros_oeuvre", label: "Gros œuvre : fondations et structures" },
  { key: "maconnerie_cloisons", label: "Maçonnerie et cloisons" },
  { key: "electricite", label: "Électricité complète" },
  { key: "plomberie", label: "Plomberie complète" },
  { key: "enduits_platrerie", label: "Enduits et plâtrerie" },
  { key: "peinture", label: "Peinture intérieure et extérieure" },
  { key: "revetements_finitions", label: "Revêtements et finitions" },
  { key: "menuiserie_ferronnerie", label: "Menuiserie et ferronnerie" },
  { key: "amenagements_exterieurs", label: "Aménagements extérieurs" },
  { key: "main_oeuvre", label: "Main-d'œuvre" },
  { key: "transport_logistique", label: "Transport et logistique" },
];

export const COST_EVOLUTION_CATEGORY_LABELS: Record<CostEvolutionCategoryKey, string> =
  COST_EVOLUTION_CATEGORIES.reduce(
    (acc, c) => {
      acc[c.key] = c.label;
      return acc;
    },
    {} as Record<CostEvolutionCategoryKey, string>,
  );

/** Taux initial de simulation pour CHAQUE catégorie (hypothèse, pas officiel). */
export const DEFAULT_CATEGORY_RATE = 3;

// ── Composantes d'un poste ──────────────────────────────────────────────────

export type CostComponentKey = "materials" | "labor" | "transport" | "equipment";

/** Taux annuels par composante (%), pour un poste ventilé. */
export interface CostComponentRates {
  materials: number;
  labor: number;
  transport: number;
  equipment: number;
}

export const COST_COMPONENT_LABELS: Record<CostComponentKey, string> = {
  materials: "Matériaux",
  labor: "Main-d'œuvre",
  transport: "Transport",
  equipment: "Équipements",
};

/**
 * Répartition indicative utilisée UNIQUEMENT lorsqu'aucune ventilation réelle
 * (quantitatif) n'est fournie pour un poste. Elle permet d'appliquer des taux
 * distincts aux matériaux, à la main-d'œuvre, au transport et aux équipements
 * sans jamais inventer de montants : la somme des parts vaut 1 et s'applique au
 * coût de référence réel du poste.
 */
export const DEFAULT_COST_MIX: CostComponentRates = {
  materials: 0.55,
  labor: 0.25,
  transport: 0.08,
  equipment: 0.12,
};

export interface CostEvolutionCategory {
  key: CostEvolutionCategoryKey;
  /** Taux annuel du poste (%). */
  rate: number;
  /** true ⇒ le poste est projeté à partir de ses composantes réelles. */
  useComponents: boolean;
  /** Taux annuels des composantes (%). */
  components: CostComponentRates;
}

// ── Scénarios ───────────────────────────────────────────────────────────────

export type CostEvolutionScenarioKey = "moderee" | "moyen" | "eleve";

export const COST_EVOLUTION_SCENARIOS: {
  key: CostEvolutionScenarioKey;
  label: string;
  description: string;
}[] = [
  { key: "moderee", label: "Modéré", description: "Hypothèse de simulation" },
  { key: "moyen", label: "Moyen", description: "Hypothèse de simulation" },
  { key: "eleve", label: "Élevé", description: "Hypothèse de simulation" },
];

export const COST_EVOLUTION_SCENARIO_LABELS: Record<CostEvolutionScenarioKey, string> = {
  moderee: "Modéré",
  moyen: "Moyen",
  eleve: "Élevé",
};

/** Taux initiaux des trois scénarios (hypothèses modifiables, non officielles). */
export const DEFAULT_SCENARIO_RATES: Record<CostEvolutionScenarioKey, number> = {
  moderee: 3,
  moyen: 5,
  eleve: 8,
};

export type CostScenarioRates = Record<CostEvolutionScenarioKey, number>;

// ── Paramétrage complet ─────────────────────────────────────────────────────

export interface CostEvolutionSettings {
  /** Année de référence du barème. */
  referenceYear: number;
  /** Date d'application des nouveaux paramètres (ms epoch). */
  effectiveFrom: number;
  /** Scénario utilisé par défaut dans les projections. */
  defaultScenario: CostEvolutionScenarioKey;
  /** Taux personnalisé saisi par l'administrateur (%). */
  customRate: number;
  /** Mécanisme actif : tant qu'il est inactif, aucun taux n'est appliqué. */
  enabled: boolean;
  scenarioRates: CostScenarioRates;
  categories: CostEvolutionCategory[];
}

/** Libellé affiché dans tous les rapports (mention légale obligatoire). */
export const COST_EVOLUTION_DISCLAIMER =
  "Projection indicative fondée sur des hypothèses de variation des prix. Les montants futurs ne constituent pas un devis garanti.";

/** Table des taux initiaux, une entrée par catégorie. */
export const DEFAULT_CATEGORIES: CostEvolutionCategory[] = COST_EVOLUTION_CATEGORIES.map(
  ({ key }) => ({
    key,
    rate: DEFAULT_CATEGORY_RATE,
    useComponents: false,
    components: {
      materials: DEFAULT_CATEGORY_RATE,
      labor: DEFAULT_CATEGORY_RATE,
      transport: DEFAULT_CATEGORY_RATE,
      equipment: DEFAULT_CATEGORY_RATE,
    },
  }),
);

/** Paramétrage par défaut — mécanisme INACTIF (aucune estimation recalculée). */
export function defaultCostEvolutionSettings(now: number = Date.now()): CostEvolutionSettings {
  const referenceYear = new Date(now).getUTCFullYear();
  return {
    referenceYear,
    effectiveFrom: Date.UTC(referenceYear, 0, 1),
    defaultScenario: "moderee",
    customRate: DEFAULT_SCENARIO_RATES.moderee,
    enabled: false,
    scenarioRates: { ...DEFAULT_SCENARIO_RATES },
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, components: { ...c.components } })),
  };
}

// ── Bornes de validation ────────────────────────────────────────────────────

/** Un taux annuel de construction hors de cette plage est refusé. */
export const COST_EVOLUTION_RATE_MIN = 0;
export const COST_EVOLUTION_RATE_MAX = 50;
/** Horizon de projection admis (années). */
export const COST_EVOLUTION_YEARS_MIN = 0;
export const COST_EVOLUTION_YEARS_MAX = 30;
export const COST_EVOLUTION_YEAR_MIN = 2000;
export const COST_EVOLUTION_YEAR_MAX = 2100;

export function isValidRate(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= COST_EVOLUTION_RATE_MIN &&
    value <= COST_EVOLUTION_RATE_MAX
  );
}

export function isValidYears(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= COST_EVOLUTION_YEARS_MIN &&
    value <= COST_EVOLUTION_YEARS_MAX
  );
}

export function isCostEvolutionCategoryKey(value: unknown): value is CostEvolutionCategoryKey {
  return (
    typeof value === "string" &&
    COST_EVOLUTION_CATEGORIES.some((c) => c.key === value)
  );
}

export function isCostEvolutionScenarioKey(value: unknown): value is CostEvolutionScenarioKey {
  return value === "moderee" || value === "moyen" || value === "eleve";
}

/**
 * Contrôle complet d'un paramétrage avant enregistrement.
 * Retourne la liste des erreurs (vide = paramétrage valide).
 */
export function validateCostEvolutionSettings(settings: CostEvolutionSettings): string[] {
  const errors: string[] = [];

  if (
    !Number.isInteger(settings.referenceYear) ||
    settings.referenceYear < COST_EVOLUTION_YEAR_MIN ||
    settings.referenceYear > COST_EVOLUTION_YEAR_MAX
  ) {
    errors.push(
      `Année de référence invalide : saisir une année entre ${COST_EVOLUTION_YEAR_MIN} et ${COST_EVOLUTION_YEAR_MAX}.`,
    );
  }

  if (!Number.isFinite(settings.effectiveFrom) || settings.effectiveFrom <= 0) {
    errors.push("Date d'application invalide.");
  }

  if (!isCostEvolutionScenarioKey(settings.defaultScenario)) {
    errors.push("Scénario par défaut invalide.");
  }

  for (const { key, label } of COST_EVOLUTION_SCENARIOS) {
    if (!isValidRate(settings.scenarioRates?.[key])) {
      errors.push(
        `Taux du scénario « ${label} » invalide : saisir une valeur entre ${COST_EVOLUTION_RATE_MIN} et ${COST_EVOLUTION_RATE_MAX} %.`,
      );
    }
  }

  if (!isValidRate(settings.customRate)) {
    errors.push(
      `Taux personnalisé invalide : saisir une valeur entre ${COST_EVOLUTION_RATE_MIN} et ${COST_EVOLUTION_RATE_MAX} %.`,
    );
  }

  const seen = new Set<string>();
  for (const category of settings.categories ?? []) {
    const label = COST_EVOLUTION_CATEGORY_LABELS[category.key] ?? category.key;
    if (!isCostEvolutionCategoryKey(category.key)) {
      errors.push(`Catégorie inconnue : ${category.key}.`);
      continue;
    }
    if (seen.has(category.key)) {
      errors.push(`Catégorie en double : ${label}.`);
    }
    seen.add(category.key);
    if (!isValidRate(category.rate)) {
      errors.push(
        `Taux invalide pour « ${label} » : saisir une valeur entre ${COST_EVOLUTION_RATE_MIN} et ${COST_EVOLUTION_RATE_MAX} %.`,
      );
    }
    if (category.useComponents) {
      for (const component of Object.keys(COST_COMPONENT_LABELS) as CostComponentKey[]) {
        if (!isValidRate(category.components?.[component])) {
          errors.push(
            `Taux « ${COST_COMPONENT_LABELS[component]} » invalide pour « ${label} ».`,
          );
        }
      }
    }
  }

  for (const { key, label } of COST_EVOLUTION_CATEGORIES) {
    if (!seen.has(key)) {
      errors.push(`Catégorie manquante : ${label}.`);
    }
  }

  return errors;
}

// ── Lecture défensive d'un paramétrage enregistré ───────────────────────────

const NUM = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/**
 * Normalise un paramétrage lu en base : toute valeur absente ou invalide est
 * remplacée par le défaut correspondant, sans jamais faire échouer l'affichage.
 */
export function normalizeCostEvolutionSettings(
  raw: Partial<CostEvolutionSettings> | null | undefined,
  now: number = Date.now(),
): CostEvolutionSettings {
  const base = defaultCostEvolutionSettings(now);
  if (!raw) return base;

  const byKey = new Map<CostEvolutionCategoryKey, CostEvolutionCategory>();
  for (const category of raw.categories ?? []) {
    if (isCostEvolutionCategoryKey(category?.key)) byKey.set(category.key, category);
  }

  const categories = base.categories.map((fallback) => {
    const stored = byKey.get(fallback.key);
    if (!stored) return fallback;
    const components = stored.components ?? fallback.components;
    return {
      key: fallback.key,
      rate: isValidRate(stored.rate) ? stored.rate : fallback.rate,
      useComponents: stored.useComponents === true,
      components: {
        materials: isValidRate(components.materials) ? components.materials : fallback.components.materials,
        labor: isValidRate(components.labor) ? components.labor : fallback.components.labor,
        transport: isValidRate(components.transport)
          ? components.transport
          : fallback.components.transport,
        equipment: isValidRate(components.equipment)
          ? components.equipment
          : fallback.components.equipment,
      },
    };
  });

  const scenarioRates: CostScenarioRates = {
    moderee: isValidRate(raw.scenarioRates?.moderee)
      ? (raw.scenarioRates as CostScenarioRates).moderee
      : base.scenarioRates.moderee,
    moyen: isValidRate(raw.scenarioRates?.moyen)
      ? (raw.scenarioRates as CostScenarioRates).moyen
      : base.scenarioRates.moyen,
    eleve: isValidRate(raw.scenarioRates?.eleve)
      ? (raw.scenarioRates as CostScenarioRates).eleve
      : base.scenarioRates.eleve,
  };

  return {
    referenceYear:
      Number.isInteger(raw.referenceYear) &&
      (raw.referenceYear as number) >= COST_EVOLUTION_YEAR_MIN &&
      (raw.referenceYear as number) <= COST_EVOLUTION_YEAR_MAX
        ? (raw.referenceYear as number)
        : base.referenceYear,
    effectiveFrom: NUM(raw.effectiveFrom, base.effectiveFrom) > 0
      ? NUM(raw.effectiveFrom, base.effectiveFrom)
      : base.effectiveFrom,
    defaultScenario: isCostEvolutionScenarioKey(raw.defaultScenario)
      ? raw.defaultScenario
      : base.defaultScenario,
    customRate: isValidRate(raw.customRate) ? raw.customRate : base.customRate,
    enabled: raw.enabled === true,
    scenarioRates,
    categories,
  };
}

// ── Calculs ─────────────────────────────────────────────────────────────────

/** Arrondi au millime (3 décimales) — jamais d'arrondi intermédiaire visible. */
export const roundMillimes = (value: number): number =>
  Math.round((value + Number.EPSILON) * 1000) / 1000;

/**
 * Coût futur d'un montant de référence après `years` années au taux composé.
 *   Coût futur = Coût de référence × (1 + taux / 100) ^ années
 */
export function compoundCost(referenceCost: number, annualRate: number, years: number): number {
  if (!Number.isFinite(referenceCost) || referenceCost <= 0) return 0;
  const rate = isValidRate(annualRate) ? annualRate : 0;
  const horizon = isValidYears(years) ? years : 0;
  if (horizon === 0 || rate === 0) return roundMillimes(referenceCost);
  return roundMillimes(referenceCost * Math.pow(1 + rate / 100, horizon));
}

/** Taux du scénario demandé (ou du scénario par défaut). */
export function scenarioRate(
  settings: CostEvolutionSettings,
  scenario?: CostEvolutionScenarioKey,
): number {
  const key = scenario ?? settings.defaultScenario;
  return settings.scenarioRates?.[key] ?? settings.scenarioRates?.[settings.defaultScenario] ?? 0;
}

/** Part de chaque composante — toujours normalisée à 1. */
function normalizedMix(mix?: Partial<CostComponentRates>): CostComponentRates {
  const raw = { ...DEFAULT_COST_MIX, ...(mix ?? {}) };
  const total =
    Math.max(0, raw.materials) +
    Math.max(0, raw.labor) +
    Math.max(0, raw.transport) +
    Math.max(0, raw.equipment);
  if (total <= 0) return { ...DEFAULT_COST_MIX };
  return {
    materials: Math.max(0, raw.materials) / total,
    labor: Math.max(0, raw.labor) / total,
    transport: Math.max(0, raw.transport) / total,
    equipment: Math.max(0, raw.equipment) / total,
  };
}

export interface ComponentProjection {
  key: CostComponentKey;
  label: string;
  referenceCost: number;
  rate: number;
  projectedCost: number;
}

/**
 * Projection d'un poste :
 *   • détail activé → chaque composante est projetée à son propre taux, puis
 *     les montants sont additionnés (le coût de référence est réparti une
 *     seule fois selon `mix`, aucune augmentation globale ne s'ajoute) ;
 *   • sinon → taux du poste appliqué au coût de référence.
 */
export function projectCategoryCost(params: {
  category: CostEvolutionCategory;
  referenceCost: number;
  years: number;
  mix?: Partial<CostComponentRates>;
}): { rateApplied: number; projectedCost: number; components: ComponentProjection[] } {
  const { category, referenceCost, years } = params;
  const reference = Number.isFinite(referenceCost) && referenceCost > 0 ? referenceCost : 0;

  if (!category.useComponents || reference === 0) {
    return {
      rateApplied: category.rate,
      projectedCost: compoundCost(reference, category.rate, years),
      components: [],
    };
  }

  const mix = normalizedMix(params.mix);
  const components: ComponentProjection[] = (
    Object.keys(COST_COMPONENT_LABELS) as CostComponentKey[]
  ).map((key) => {
    const componentReference = roundMillimes(reference * mix[key]);
    const rate = category.components[key];
    return {
      key,
      label: COST_COMPONENT_LABELS[key],
      referenceCost: componentReference,
      rate,
      projectedCost: compoundCost(componentReference, rate, years),
    };
  });

  const projectedCost = roundMillimes(
    components.reduce((sum, c) => sum + c.projectedCost, 0),
  );
  // Taux moyen réellement obtenu (affichage) — jamais réappliqué ensuite.
  const rateApplied =
    reference > 0 && years > 0
      ? roundMillimes((Math.pow(projectedCost / reference, 1 / years) - 1) * 100)
      : 0;

  return { rateApplied, projectedCost, components };
}

export interface CostProjectionLine {
  key: string;
  label: string;
  referenceCost: number;
  rateApplied: number;
  years: number;
  increase: number;
  projectedCost: number;
  components: ComponentProjection[];
}

export interface CostProjection {
  enabled: boolean;
  scenario: CostEvolutionScenarioKey;
  scenarioLabel: string;
  rate: number;
  years: number;
  referenceCost: number;
  projectedCost: number;
  increase: number;
  increasePct: number;
  lines: CostProjectionLine[];
  disclaimer: string;
}

/**
 * Projection du coût d'un projet.
 *
 * `categoryAmounts` — montants de référence RÉELS par catégorie (issus du
 * quantitatif). Quand ils sont fournis, chaque poste est projeté avec SON
 * taux puis les résultats sont additionnés : aucun taux global n'est appliqué
 * ensuite aux mêmes montants. Sinon le taux du scénario s'applique au total.
 *
 * `enabled = false` ⇒ aucune projection : le coût de référence est retourné
 * tel quel (le mécanisme est inactif, rien n'est modifié).
 */
export function projectCost(params: {
  settings: CostEvolutionSettings;
  referenceCost: number;
  years: number;
  scenario?: CostEvolutionScenarioKey;
  categoryAmounts?: Partial<Record<CostEvolutionCategoryKey, number>>;
  mix?: Partial<CostComponentRates>;
}): CostProjection {
  const { settings, years, scenario, categoryAmounts, mix } = params;
  const referenceCost =
    Number.isFinite(params.referenceCost) && params.referenceCost > 0
      ? roundMillimes(params.referenceCost)
      : 0;
  const horizon = isValidYears(years) ? years : 0;
  const key = scenario ?? settings.defaultScenario;
  const rate = scenarioRate(settings, key);
  const base: Omit<CostProjection, "lines" | "projectedCost" | "increase" | "increasePct"> = {
    enabled: settings.enabled === true,
    scenario: key,
    scenarioLabel: COST_EVOLUTION_SCENARIO_LABELS[key] ?? key,
    rate,
    years: horizon,
    referenceCost,
    disclaimer: COST_EVOLUTION_DISCLAIMER,
  };

  if (!base.enabled) {
    return {
      ...base,
      projectedCost: referenceCost,
      increase: 0,
      increasePct: 0,
      lines: [],
    };
  }

  const lines: CostProjectionLine[] = [];
  for (const category of settings.categories) {
    const amount = categoryAmounts?.[category.key];
    if (categoryAmounts && !(typeof amount === "number" && amount > 0)) continue;
    const reference = categoryAmounts ? (amount as number) : referenceCost;
    const projected = projectCategoryCost({ category, referenceCost: reference, years: horizon, mix });
    lines.push({
      key: category.key,
      label: COST_EVOLUTION_CATEGORY_LABELS[category.key] ?? category.key,
      referenceCost: roundMillimes(reference),
      rateApplied: projected.rateApplied,
      years: horizon,
      increase: roundMillimes(projected.projectedCost - reference),
      projectedCost: projected.projectedCost,
      components: projected.components,
    });
  }

  if (!categoryAmounts) {
    // Aucune ventilation réelle : un seul poste, taux du scénario.
    lines.length = 0;
    lines.push({
      key: "global",
      label: "Coût de construction",
      referenceCost,
      rateApplied: rate,
      years: horizon,
      increase: roundMillimes(compoundCost(referenceCost, rate, horizon) - referenceCost),
      projectedCost: compoundCost(referenceCost, rate, horizon),
      components: [],
    });
  }

  const projectedCost = roundMillimes(lines.reduce((sum, l) => sum + l.projectedCost, 0));
  const increase = roundMillimes(projectedCost - referenceCost);
  return {
    ...base,
    projectedCost,
    increase,
    increasePct: referenceCost > 0 ? roundMillimes((increase / referenceCost) * 100) : 0,
    lines,
  };
}

export interface ScenarioPreview {
  key: CostEvolutionScenarioKey;
  label: string;
  rate: number;
  projectedCost: number;
  increase: number;
  increasePct: number;
}

/**
 * Comparaison des trois scénarios sur un coût de référence — lecture seule,
 * aucune donnée n'est modifiée.
 */
export function previewScenarios(params: {
  settings: CostEvolutionSettings;
  referenceCost: number;
  years: number;
}): ScenarioPreview[] {
  const { settings, referenceCost, years } = params;
  return COST_EVOLUTION_SCENARIOS.map(({ key, label }) => {
    const rate = settings.scenarioRates[key];
    const projectedCost = compoundCost(referenceCost, rate, years);
    const increase = roundMillimes(projectedCost - referenceCost);
    return {
      key,
      label,
      rate,
      projectedCost,
      increase,
      increasePct: referenceCost > 0 ? roundMillimes((increase / referenceCost) * 100) : 0,
    };
  });
}

/**
 * Prévisualisation complète pour l'administration : scénarios + détail par
 * catégorie du scénario sélectionné. Fonction PURE (aucune écriture).
 */
export function buildImpactPreview(params: {
  settings: CostEvolutionSettings;
  referenceCost: number;
  years: number;
  scenario?: CostEvolutionScenarioKey;
  categoryAmounts?: Partial<Record<CostEvolutionCategoryKey, number>>;
}): {
  scenarios: ScenarioPreview[];
  projection: CostProjection;
  disclaimer: string;
} {
  const scenario = params.scenario ?? params.settings.defaultScenario;
  return {
    scenarios: previewScenarios({
      settings: params.settings,
      referenceCost: params.referenceCost,
      years: params.years,
    }),
    projection: projectCost({ ...params, scenario }),
    disclaimer: COST_EVOLUTION_DISCLAIMER,
  };
}

// ============================================================================
// Série « Évolution probable des coûts (24 mois) » — utilitaires d'AFFICHAGE
// ----------------------------------------------------------------------------
// La série est fournie par le plan de construction
// (`roadmap.predictions.costEvolution`) : ce module n'en produit pas. Ces
// fonctions ne calculent aucun montant : elles échantillonnent la série pour
// l'écran et abrègent libellés/axes sur mobile.
// ============================================================================

export interface CostEvolutionPoint {
  label: string;
  cost: number;
}

/** Échantillonne la série à `maxPoints` colonnes (premier et dernier conservés). */
export function sampleCostEvolutionPoints(
  points: CostEvolutionPoint[],
  maxPoints = 13,
): CostEvolutionPoint[] {
  const list = (points ?? []).filter((p) => !!p && Number.isFinite(p.cost));
  if (maxPoints < 2 || list.length <= maxPoints) return list;
  const step = (list.length - 1) / (maxPoints - 1);
  const out: CostEvolutionPoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const point = list[Math.round(i * step)];
    if (point && out[out.length - 1] !== point) out.push(point);
  }
  return out;
}

/** Libellé court d'un point (« Aujourd'hui » → « Auj. », « M+12 » → « M12 »). */
export function compactCostEvolutionLabel(label: string): string {
  const text = String(label ?? "").trim();
  if (!text) return "";
  if (/^aujourd/i.test(text)) return "Auj.";
  const month = /^M\s*\+\s*(\d+)$/i.exec(text);
  if (month) return `M${month[1]}`;
  return text.length > 4 ? `${text.slice(0, 4)}.` : text;
}

/** Montant compact pour l'axe vertical (« 218 545 » → « 219 k »). */
export function compactCostValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  }
  if (abs >= 1_000) {
    return `${Math.round(value / 1_000).toLocaleString("fr-FR")} k`;
  }
  return Math.round(value).toLocaleString("fr-FR");
}

/** Écart (%) du point sélectionné par rapport au premier point (aujourd'hui). */
export function costEvolutionDeltaPct(
  points: CostEvolutionPoint[],
  index: number,
): number | null {
  const base = points?.[0]?.cost;
  const current = points?.[index]?.cost;
  if (!(typeof base === "number" && base > 0) || !Number.isFinite(current)) return null;
  return Math.round(((current - base) / base) * 1000) / 10;
}

// ── Bloc PDF ────────────────────────────────────────────────────────────────

export interface CostEvolutionPdfBlock {
  title: string;
  disclaimer: string;
  referenceYear: number;
  effectiveFrom: number;
  scenarioLabel: string;
  rate: number;
  years: number;
  referenceCost: number;
  projectedCost: number;
  increase: number;
  rows: { label: string; value: string }[];
}

const fmtTnd = (n: number) =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n))} TND`;

/**
 * Section facultative « Hypothèses d'évolution des coûts » des rapports PDF.
 * `null` quand le mécanisme est inactif : aucun rapport existant ne change.
 */
export function buildCostEvolutionPdfBlock(params: {
  settings: CostEvolutionSettings;
  referenceCost: number;
  years: number;
  scenario?: CostEvolutionScenarioKey;
}): CostEvolutionPdfBlock | null {
  if (params.settings.enabled !== true) return null;
  const projection = projectCost(params);
  if (projection.referenceCost <= 0) return null;

  return {
    title: "Hypothèses d'évolution des coûts",
    disclaimer: COST_EVOLUTION_DISCLAIMER,
    referenceYear: params.settings.referenceYear,
    effectiveFrom: params.settings.effectiveFrom,
    scenarioLabel: projection.scenarioLabel,
    rate: projection.rate,
    years: projection.years,
    referenceCost: projection.referenceCost,
    projectedCost: projection.projectedCost,
    increase: projection.increase,
    rows: [
      {
        label: "Barème de référence",
        value: `${params.settings.referenceYear} · appliqué le ${new Date(
          params.settings.effectiveFrom,
        ).toLocaleDateString("fr-FR")}`,
      },
      { label: "Scénario", value: projection.scenarioLabel },
      { label: "Taux appliqué", value: `${projection.rate} %/an` },
      { label: "Horizon de projection", value: `${projection.years} an(s)` },
      { label: "Coût de référence", value: fmtTnd(projection.referenceCost) },
      { label: "Coût projeté", value: fmtTnd(projection.projectedCost) },
      { label: "Différence", value: `+${fmtTnd(projection.increase)}` },
    ],
  };
}
