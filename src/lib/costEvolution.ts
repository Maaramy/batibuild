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

const fmtDateLong = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

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

// ============================================================================
// APPLICATION AU MOTEUR D'ESTIMATION DES NOUVEAUX PROJETS
// ----------------------------------------------------------------------------
// Contrat produit :
//   1. les taux ne s'appliquent QU'AU MOMENT DU CALCUL d'une estimation —
//      jamais à une estimation déjà calculée et enregistrée ;
//   2. mécanisme inactif (administration) ⇒ AUCUN montant modifié ;
//   3. chiffrage déjà validé ⇒ aucun taux appliqué ;
//   4. chaque poste reçoit UN SEUL facteur (taux du poste, taux de sa
//      composante ou taux global) : aucune double augmentation ;
//   5. l'empreinte (version, date, statut) accompagne le calcul pour
//      l'affichage du détail et les rapports PDF.
//
// Horizon retenu pour les estimations : UN an d'évolution (le taux annuel du
// barème) dès que le barème est en vigueur (date d'application ≤ date du
// calcul). Les projections pluriannuelles restent l'affaire de la
// prévisualisation (`projectCost`), jamais du moteur d'estimation.
// ============================================================================

/** Empreinte conservée avec chaque calcul d'estimation. */
export interface EstimateEvolutionFingerprint {
  /** Version du barème administrateur au moment du calcul (0 = valeurs par défaut). */
  version: number;
  /** Actif = taux appliqués · Inactif = mécanisme désactivé · Validé = chiffrage validé. */
  status: "active" | "inactive" | "validated";
  /** Date réelle du calcul (ms epoch). */
  appliedAt: number;
  referenceYear: number;
  effectiveFrom: number;
  scenario: CostEvolutionScenarioKey;
  scenarioLabel: string;
  /** Horizon appliqué (années) : 1 dès que le barème est en vigueur. */
  years: number;
  /** Taux annuel global du barème (%), utilisé pour les postes sans taux dédié. */
  globalRate: number;
  /** Coût TTC avant application du barème. */
  referenceCost: number;
  /** Coût TTC après application (identique à referenceCost si aucun taux). */
  projectedCost: number;
  increase: number;
  increasePct: number;
}

export const COST_EVOLUTION_STATUS_LABELS: Record<
  EstimateEvolutionFingerprint["status"],
  string
> = {
  active: "Actif — taux appliqués",
  inactive: "Inactif — aucun taux appliqué",
  validated: "Chiffrage validé — barème non appliqué",
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Horizon d'évolution appliqué à UNE estimation : 1 an dès que le barème est
 * en vigueur, 0 si sa date d'application est encore à venir.
 */
export function estimateEvolutionHorizonYears(
  effectiveFrom: number,
  now: number = Date.now(),
): number {
  if (!Number.isFinite(effectiveFrom) || !Number.isFinite(now)) return 0;
  return effectiveFrom <= now ? 1 : 0;
}

/** Facteur composé d'un taux sur un horizon donné. */
export function rateFactor(rate: number, years: number): number {
  const r = isValidRate(rate) ? rate : 0;
  const y = isValidYears(years) ? years : 0;
  if (r === 0 || y === 0) return 1;
  return Math.pow(1 + r / 100, y);
}

// ── Rattachement d'un poste à une catégorie du barème ─────────────────────

/**
 * Reconnaissance d'un poste par son libellé (lot, sous-lot, article).
 * L'ordre est significatif : les familles techniques les plus spécifiques
 * sont testées avant les familles génériques.
 */
const EVOLUTION_TEXT_RULES: Array<{ key: CostEvolutionCategoryKey; re: RegExp }> = [
  { key: "electricite", re: /(électri|electri|éclairage|eclairage|câbl|cabl|domotique|prise)/i },
  {
    key: "plomberie",
    re: /(plomber|robinetter|sanitair|évacuation|evacuation|canalis|chauffe[- ]?eau|adoucisseur|climatisation|ventilation|frigor|cvc|pompe|filtration)/i,
  },
  { key: "peinture", re: /(peintur|laque|impression)/i },
  { key: "enduits_platrerie", re: /(enduit|plâtr|platr|staff)/i },
  {
    key: "revetements_finitions",
    re: /(carrel|revêtement|revetement|parquet|marbre|faïenc|faience|grès|gres|chape|finition|nettoyage)/i,
  },
  {
    key: "menuiserie_ferronnerie",
    re: /(menuis|porte|fenêtre|fenetre|pvc|ferronn|ferron|serrur|vitrage|volet|quincail)/i,
  },
  { key: "maconnerie_cloisons", re: /(maçonner|maconner|cloison|brique|parpaing|pierre)/i },
  {
    key: "gros_oeuvre",
    re: /(gros.?(œuvre|oeuvre)|fondation|terrassement|structure|béton|beton|coffrage|ferraillage|dalle|plancher|charpente|toiture|étanchéité|etancheite)/i,
  },
  {
    key: "amenagements_exterieurs",
    re: /(aménagement|amenagement|jardin|gazon|clôture|cloture|portail|pavé|pave|voirie|piscine|bassin|extérieur|exterieur)/i,
  },
  {
    key: "main_oeuvre",
    re: /(main.d'œuvre|main_oeuvre|dépose|depose|démolition|demolition|essai)/i,
  },
  { key: "transport_logistique", re: /(transport|livraison|logistique|vrd|engins|divers)/i },
];

/** Catégorie du barème reconnue dans le libellé d'un poste, sinon `null`. */
export function evolutionKeyForText(text: unknown): CostEvolutionCategoryKey | null {
  const value = String(text ?? "").toLowerCase();
  if (!value.trim()) return null;
  return EVOLUTION_TEXT_RULES.find((rule) => rule.re.test(value))?.key ?? null;
}

/**
 * Catégories de coût de l'estimation (« gros_oeuvre », « second_oeuvre »…)
 * rattachées au barème. Les postes sans taux dédié (études, équipements,
 * frais préliminaires) retournent `null` → taux global du barème.
 */
const COST_CATEGORY_TO_EVOLUTION: Record<string, CostEvolutionCategoryKey> = {
  gros_oeuvre: "gros_oeuvre",
  fondations: "gros_oeuvre",
  terrassement: "gros_oeuvre",
  terrassement_granulats: "gros_oeuvre",
  structure: "gros_oeuvre",
  maconnerie: "maconnerie_cloisons",
  cloisons: "maconnerie_cloisons",
  electricite: "electricite",
  plomberie: "plomberie",
  enduits: "enduits_platrerie",
  platrerie: "enduits_platrerie",
  peinture: "peinture",
  finition: "revetements_finitions",
  finitions: "revetements_finitions",
  revetements: "revetements_finitions",
  second_oeuvre: "revetements_finitions",
  menuiserie: "menuiserie_ferronnerie",
  amenagement_exterieur: "amenagements_exterieurs",
  amenagements_exterieurs: "amenagements_exterieurs",
  main_oeuvre: "main_oeuvre",
  transport: "transport_logistique",
};

/**
 * Catégorie du barème d'un poste de l'estimation : table de correspondance
 * puis reconnaissance par libellé, sinon `null` (taux global).
 */
export function evolutionKeyForCostCategory(
  category: unknown,
): CostEvolutionCategoryKey | null {
  const key = String(category ?? "").toLowerCase();
  if (!key) return null;
  return COST_CATEGORY_TO_EVOLUTION[key] ?? evolutionKeyForText(key);
}

/** Composante du barème correspondant à la nature d'une ligne du Quantitatif. */
const NATURE_TO_COMPONENT: Record<string, CostComponentKey> = {
  materiaux: "materials",
  main_oeuvre: "labor",
  transport: "transport",
  equipements: "equipment",
};

/**
 * Facteur composé appliqué à UN poste :
 *   • poste sans catégorie dédiée → taux annuel global du barème ;
 *   • poste avec ventilation par composante → taux de la composante réelle
 *     (matériaux / main-d'œuvre / transport / équipements) de la ligne ;
 *   • sinon → taux du poste.
 * Un poste n'est jamais majoré deux fois.
 */
export function evolutionFactorFor(params: {
  settings: CostEvolutionSettings;
  key: CostEvolutionCategoryKey | null;
  nature?: string | null;
  years?: number;
}): number {
  const { settings, key } = params;
  const years = isValidYears(params.years ?? 1) ? (params.years as number) : 0;
  if (!key) return rateFactor(settings.customRate, years);
  const category = settings.categories?.find((c) => c.key === key);
  if (!category) return rateFactor(settings.customRate, years);
  if (!category.useComponents) return rateFactor(category.rate, years);

  const nature = String(params.nature ?? "").toLowerCase();
  if (nature === "etudes") return rateFactor(category.rate, years);
  const component = NATURE_TO_COMPONENT[nature];
  if (component) return rateFactor(category.components[component], years);

  // Aucune nature exploitable : moyenne pondérée des composantes (la somme
  // des parts vaut 1, le coût de référence n'est donc majoré qu'une fois).
  const mix = DEFAULT_COST_MIX;
  return (
    mix.materials * rateFactor(category.components.materials, years) +
    mix.labor * rateFactor(category.components.labor, years) +
    mix.transport * rateFactor(category.components.transport, years) +
    mix.equipment * rateFactor(category.components.equipment, years)
  );
}

// ── Application à un résultat d'estimation ───────────────────────────────

/** Détail multi-niveaux (`costEstimate.levelBreakdown`). */
function scaleLevelBreakdown(lb: any, factor: number): void {
  if (!lb || typeof lb !== "object") return;
  const r = (value: any) => (typeof value === "number" ? Math.round(value * factor) : value);
  // Prix au m² NON arrondi : le contrôle « niveau = prix × surface ×
  // coefficient » reste exact après majoration.
  if (typeof lb.pricePerM2 === "number") lb.pricePerM2 = lb.pricePerM2 * factor;
  for (const level of lb.levels ?? []) {
    if (!level) continue;
    level.amount = r(level.amount);
    level.commonAmount = r(level.commonAmount);
  }
  if (lb.roof) lb.roof.amount = r(lb.roof.amount);
  if (lb.common) lb.common.amount = r(lb.common.amount);
  for (const adjustment of lb.costAdjustments ?? []) {
    if (adjustment) adjustment.amount = r(adjustment.amount);
  }
  // L'invariant « total = Σ niveaux + toiture + ajustements » est RECALCULÉ :
  // il reste exact après l'arrondi de chaque ligne.
  if (Array.isArray(lb.levels)) {
    const sum =
      lb.levels.reduce((s: number, l: any) => s + (Number(l?.amount) || 0), 0) +
      (Number(lb.roof?.amount) || 0) +
      (lb.costAdjustments ?? []).reduce((s: number, a: any) => s + (Number(a?.amount) || 0), 0);
    lb.total = sum;
    const area = Number(lb.realBuiltArea) || 0;
    if (area > 0) lb.costPerM2Real = Math.round(sum / area);
  }
}

const DQE_NATURES: Array<{ key: "materiaux" | "mainOeuvre" | "equipements" | "transport" | "etudes"; nature: string }> = [
  { key: "materiaux", nature: "materiaux" },
  { key: "mainOeuvre", nature: "main_oeuvre" },
  { key: "equipements", nature: "equipements" },
  { key: "transport", nature: "transport" },
  { key: "etudes", nature: "etudes" },
];

export interface ApplyCostEvolutionResult {
  fingerprint: EstimateEvolutionFingerprint;
  /** true ⇒ les montants ont réellement été majorés (barème actif et en vigueur). */
  applied: boolean;
  years: number;
  /** Facteur global appliqué aux agrégats de la grille. */
  gridFactor: number;
}

/**
 * Applique le barème d'évolution annuelle à un résultat d'estimation NEUF.
 *
 * L'entrée est MUTÉE EN PLACE (les documents sont fraîchement produits par le
 * moteur, jamais enregistrés) :
 *   • `costEstimate.breakdown` — chaque poste et ses articles à leur propre
 *     facteur ; les agrégats (total, scénarios, détail multi-niveaux) suivent
 *     le facteur pondéré de la grille ;
 *   • `dqe` — chaque ligne du Quantitatif détaillé reçoit le facteur de SA
 *     catégorie (les quantités et les unités ne changent jamais), les
 *     sous-totaux, les totaux par nature et le total TTC sont recalculés ;
 *   • `aiAnalysis.laborEstimate.estimatedCost` suit la main-d'œuvre.
 *
 * Aucune modification n'est faite lorsque le mécanisme est inactif, lorsque
 * sa date d'application est à venir ou lorsque le chiffrage est déjà validé.
 */
export function applyCostEvolutionToEstimate(params: {
  settings: CostEvolutionSettings;
  version: number;
  now?: number;
  chiffrageValide?: boolean;
  costEstimate?: any;
  dqe?: any;
  aiAnalysis?: any;
  /** Surface réellement construite (coût au m² du Quantitatif). */
  builtSurface?: number;
}): ApplyCostEvolutionResult {
  const now = params.now ?? Date.now();
  const settings = params.settings;
  const ce = params.costEstimate ?? null;
  const dqe = params.dqe ?? null;
  const baseGrid = Number(ce?.totalCost) || 0;
  const baseTotal = Number(dqe?.totals?.total) || baseGrid;
  const years = estimateEvolutionHorizonYears(settings.effectiveFrom, now);

  const fingerprint = (
    status: EstimateEvolutionFingerprint["status"],
    projected: number,
  ): EstimateEvolutionFingerprint => ({
    version: params.version,
    status,
    appliedAt: now,
    referenceYear: settings.referenceYear,
    effectiveFrom: settings.effectiveFrom,
    scenario: settings.defaultScenario,
    scenarioLabel:
      COST_EVOLUTION_SCENARIO_LABELS[settings.defaultScenario] ?? settings.defaultScenario,
    years,
    globalRate: settings.customRate,
    referenceCost: roundMillimes(baseTotal),
    projectedCost: roundMillimes(projected),
    increase: roundMillimes(projected - baseTotal),
    increasePct:
      baseTotal > 0 ? roundMillimes(((projected - baseTotal) / baseTotal) * 100) : 0,
  });

  // Aucun cas n'altère un calcul déjà enregistré : seules les valeurs
  // explicitement calculées ici peuvent porter une majoration.
  if (params.chiffrageValide) {
    return { fingerprint: fingerprint("validated", baseTotal), applied: false, years, gridFactor: 1 };
  }
  if (settings.enabled !== true) {
    return { fingerprint: fingerprint("inactive", baseTotal), applied: false, years, gridFactor: 1 };
  }
  if (years === 0) {
    // Barème actif mais pas encore en vigueur : rien n'est appliqué.
    return { fingerprint: fingerprint("active", baseTotal), applied: false, years, gridFactor: 1 };
  }

  // ── 1. Répartition du coût estimatif (postes + articles) ───────────────
  const rows: any[] = Array.isArray(ce?.breakdown) ? ce.breakdown : [];
  let baseSum = 0;
  let scaledSum = 0;
  for (const row of rows) {
    const base = Number(row.estimatedCost) || 0;
    const rowKey =
      evolutionKeyForCostCategory(row.category) ?? evolutionKeyForText(row.label ?? "");
    const rowFactor = evolutionFactorFor({ settings, key: rowKey, years });
    baseSum += base;

    const items: any[] = Array.isArray(row.items) ? row.items : [];
    if (items.length > 0) {
      let itemSum = 0;
      for (const item of items) {
        const itemKey = evolutionKeyForText(item?.name ?? "") ?? rowKey;
        const factor = evolutionFactorFor({ settings, key: itemKey, years });
        const quantity = Number(item?.quantity) || 0;
        const baseItem = Number(item?.totalPrice) || 0;
        if (quantity > 0) {
          const unitPrice = round2((Number(item?.unitPrice) || 0) * factor);
          item.unitPrice = unitPrice;
          item.totalPrice = Math.round(unitPrice * quantity);
        } else {
          item.totalPrice = Math.round(baseItem * factor);
        }
        itemSum += Number(item.totalPrice) || 0;
      }
      row.estimatedCost = Math.round(itemSum);
    } else {
      row.estimatedCost = Math.round(base * rowFactor);
    }
    scaledSum += Number(row.estimatedCost) || 0;
  }

  // Facteur global de la grille : moyenne pondérée des postes réels.
  const gridFactor =
    baseSum > 0
      ? scaledSum / baseSum
      : evolutionFactorFor({ settings, key: null, years });
  const gridTotal = Math.round(baseGrid * gridFactor);

  if (ce) {
    ce.totalCost = gridTotal;
    if (typeof ce.costPerSquareMeter === "number") {
      ce.costPerSquareMeter = Math.round(ce.costPerSquareMeter * gridFactor);
    }
    for (const row of rows) {
      if (gridTotal > 0) {
        row.percentage = Math.round(((Number(row.estimatedCost) || 0) / gridTotal) * 100);
      }
    }
    const scenarios = ce.budgetScenarios;
    if (scenarios) {
      for (const key of ["economique", "standard", "premium"] as const) {
        const scenario = scenarios[key];
        if (!scenario) continue;
        if (typeof scenario.totalCost === "number") {
          scenario.totalCost = Math.round(scenario.totalCost * gridFactor);
        }
        if (typeof scenario.costPerM2 === "number") {
          scenario.costPerM2 = Math.round(scenario.costPerM2 * gridFactor);
        }
      }
    }
    scaleLevelBreakdown(ce.levelBreakdown, gridFactor);
  }

  // ── 2. Quantitatif détaillé : un facteur par poste, quantités inchangées ──
  if (dqe && Array.isArray(dqe.lots)) {
    for (const lot of dqe.lots) {
      const lotKey =
        evolutionKeyForCostCategory(lot?.id) ?? evolutionKeyForText(lot?.name ?? "");
      const lines: any[] = Array.isArray(lot?.lines) ? lot.lines : [];
      if (lines.length === 0) {
        if (typeof lot?.subtotal === "number") lot.subtotal = Math.round(lot.subtotal * gridFactor);
        continue;
      }
      for (const line of lines) {
        if (!line) continue;
        const key =
          evolutionKeyForText(`${line.designation ?? ""} ${line.sousLot ?? ""}`) ?? lotKey;
        const factor = evolutionFactorFor({ settings, key, nature: line.nature, years });
        const quantity = Number(line.quantity) || 0;
        if (quantity > 0) {
          const unitPrice = round2((Number(line.unitPrice) || 0) * factor);
          line.unitPrice = unitPrice;
          line.total = Math.round(unitPrice * quantity);
        } else {
          line.total = Math.round((Number(line.total) || 0) * factor);
        }
        // Part main-d'œuvre affichée sous le poste (jamais recomptée) : elle
        // suit le taux de la composante main-d'œuvre du barème.
        if (line.labor && typeof line.labor === "object") {
          const laborRate = evolutionFactorFor({ settings, key, nature: "main_oeuvre", years });
          const laborQuantity = Number(line.labor.quantity) || 0;
          if (laborQuantity > 0) {
            const unitPrice = round2((Number(line.labor.unitPrice) || 0) * laborRate);
            line.labor.unitPrice = unitPrice;
            line.labor.total = Math.round(unitPrice * laborQuantity);
          } else if (typeof line.labor.total === "number") {
            line.labor.total = Math.round(line.labor.total * laborRate);
          }
        }
        // Décomposition HT / TVA : proportionnelle, la règle
        // « montant TTC = total HT + TVA » reste exacte.
        if (typeof line.totalHT === "number") {
          line.totalHT = Math.round(line.totalHT * factor);
          if (typeof line.vatAmount === "number") line.vatAmount = line.total - line.totalHT;
        }
      }
      lot.subtotal = lines.reduce((s: number, l: any) => s + (Number(l?.total) || 0), 0);
      // Budget alloué : suit le facteur GLOBAL de la grille, ce qui garantit
      // que la somme des écarts (sous-total réel − alloué) retombe exactement
      // sur l'évolution du total.
      if (typeof lot.allocatedSubtotal === "number") {
        lot.allocatedSubtotal = Math.round(lot.allocatedSubtotal * gridFactor);
      }
    }

    const grandTotal = dqe.lots.reduce(
      (s: number, l: any) => s + (Number(l?.subtotal) || 0),
      0,
    );
    for (const lot of dqe.lots) {
      lot.percent =
        grandTotal > 0 ? Math.round(((Number(lot?.subtotal) || 0) / grandTotal) * 1000) / 10 : 0;
    }

    const totals = dqe.totals ?? {};
    const linesHaveNature = dqe.lots.every((lot: any) =>
      (Array.isArray(lot?.lines) ? lot.lines : []).every((l: any) =>
        DQE_NATURES.some((n) => n.nature === l?.nature),
      ),
    );
    const laborOf = (line: any) => Number(line?.labor?.total) || 0;
    if (linesHaveNature) {
      // Même ventilation que le moteur : la part main-d'œuvre d'un poste est
      // comptée dans la nature « main_oeuvre », jamais deux fois.
      const own = (nature: string) =>
        dqe.lots.reduce(
          (s: number, lot: any) =>
            s +
            (Array.isArray(lot?.lines) ? lot.lines : []).reduce(
              (a: number, l: any) =>
                l?.nature === nature ? a + (Number(l.total) || 0) - laborOf(l) : a,
              0,
            ),
          0,
        );
      const laborIncluded = dqe.lots.reduce(
        (s: number, lot: any) =>
          s +
          (Array.isArray(lot?.lines) ? lot.lines : []).reduce(
            (a: number, l: any) => a + laborOf(l),
            0,
          ),
        0,
      );
      for (const { key, nature } of DQE_NATURES) {
        const value = own(nature) + (nature === "main_oeuvre" ? laborIncluded : 0);
        if (typeof totals[key] === "number") totals[key] = value;
      }
    } else {
      const previousTotal = Number(totals.total) || 0;
      const ratio = previousTotal > 0 ? grandTotal / previousTotal : 1;
      for (const { key } of DQE_NATURES) {
        if (typeof totals[key] === "number") totals[key] = Math.round(totals[key] * ratio);
      }
    }
    const surface = Number(params.builtSurface) || 0;
    totals.total = grandTotal;
    totals.costPerM2 = surface > 0 ? Math.round(grandTotal / surface) : 0;
    dqe.totals = totals;
    if (typeof dqe.referenceTotal === "number") {
      dqe.referenceTotal = Math.round(dqe.referenceTotal * gridFactor);
    }
  }

  // ── 3. Analyse IA : estimation de main-d'œuvre alignée ──────────────────
  const laborEstimate = params.aiAnalysis?.laborEstimate;
  if (laborEstimate && typeof laborEstimate.estimatedCost === "number") {
    const laborFactor = evolutionFactorFor({ settings, key: "main_oeuvre", years });
    laborEstimate.estimatedCost = Math.round(laborEstimate.estimatedCost * laborFactor);
  }

  const projected = Number(dqe?.totals?.total) || Number(ce?.totalCost) || baseTotal;
  return { fingerprint: fingerprint("active", projected), applied: true, years, gridFactor };
}

// ── Bloc PDF issu de l'empreinte du calcul ────────────────────────────────

/**
 * Section « Hypothèses d'évolution des coûts » reconstruite À PARTIR DE
 * L'EMPREINTE enregistrée avec l'estimation : les rapports des projets déjà
 * chiffrés (sans empreinte) ne gagnent jamais de section, et les montants
 * affichés sont exactement ceux appliqués à CE calcul.
 */
export function buildAppliedCostEvolutionPdfBlock(
  fingerprint: EstimateEvolutionFingerprint | null | undefined,
): CostEvolutionPdfBlock | null {
  if (!fingerprint || fingerprint.status !== "active") return null;
  return {
    title: "Hypothèses d'évolution des coûts",
    disclaimer: COST_EVOLUTION_DISCLAIMER,
    referenceYear: fingerprint.referenceYear,
    effectiveFrom: fingerprint.effectiveFrom,
    scenarioLabel: fingerprint.scenarioLabel,
    rate: fingerprint.globalRate,
    years: fingerprint.years,
    referenceCost: fingerprint.referenceCost,
    projectedCost: fingerprint.projectedCost,
    increase: fingerprint.increase,
    rows: [
      {
        label: "Barème de référence",
        value: `${fingerprint.referenceYear} · appliqué le ${fmtDateLong(fingerprint.effectiveFrom)}`,
      },
      { label: "Version des taux", value: `v${fingerprint.version}` },
      { label: "Statut", value: COST_EVOLUTION_STATUS_LABELS[fingerprint.status] },
      { label: "Date du calcul", value: fmtDateLong(fingerprint.appliedAt) },
      { label: "Scénario", value: fingerprint.scenarioLabel },
      { label: "Taux annuel global", value: `${fingerprint.globalRate} %/an` },
      { label: "Horizon de projection", value: `${fingerprint.years} an(s)` },
      { label: "Coût de référence", value: fmtTnd(fingerprint.referenceCost) },
      { label: "Coût projeté", value: fmtTnd(fingerprint.projectedCost) },
      {
        label: "Différence",
        value: `+${fmtTnd(fingerprint.increase)} (${fingerprint.increasePct} %)`,
      },
    ],
  };
}
