/**
 * CAPACITÉ DE CONSTRUCTION — moteur « Aide à la décision » lié au projet.
 *
 * Principe : l'utilisateur saisit un budget disponible (TND) et le moteur
 * répond par une simulation DÉTERMINISTE de ce qui peut réellement être
 * construit, calculée à partir du « Quantitatif » du projet :
 *   • Funding séquentiel dans l'ordre de priorité des chantiers
 *     (études → fondations → gros œuvre → second œuvre → finitions →
 *     aménagements extérieurs) ;
 *   • trois scénarios dynamiques : budget actuel, budget augmenté d'un palier
 *     fixe (10 000 TND), projet complet ;
 *   • un seuil minimal de budget saisi (MIN_BUDGET_TND) en dessous duquel
 *     l'analyse n'est pas produite ;
 *   • une phrase récapitulative et une recommandation construites à partir des
 *     montants réellement calculés — aucun montant ni pourcentage codé en dur.
 *
 * Ce module ne modifie NI le coût estimatif NI le moteur d'optimisation :
 * il ne fait que LIRE la décomposition existante du projet.
 */

// ── Types d'entrée ─────────────────────────────────────────────────────────

export interface CategoryBreakdownItem {
  category: string;
  label: string;
  estimatedCost: number;
  percentage: number;
}

export interface QuantitatifLot {
  id: string;
  name: string;
  subtotal: number;
}

/** Priorité des chantiers : un projet se construit dans cet ordre. */
const CATEGORY_PRIORITY: Array<{ key: string; rank: number }> = [
  { key: "etudes", rank: 1 },
  { key: "etudes_imprevus", rank: 2 },
  { key: "frais_preliminaires", rank: 1 },
  { key: "terrassement_granulats", rank: 3 },
  { key: "fondations", rank: 3 },
  { key: "gros_oeuvre", rank: 4 },
  { key: "second_oeuvre", rank: 5 },
  { key: "finitions", rank: 6 },
  { key: "amenagements_exterieurs", rank: 7 },
  { key: "equipements", rank: 8 },
  { key: "transport", rank: 9 },
];

const DEFAULT_RANK = 50;

export function categoryPriority(category: string): number {
  const key = String(category ?? "").toLowerCase();
  return CATEGORY_PRIORITY.find((c) => c.key === key)?.rank ?? DEFAULT_RANK;
}

// ── Types de sortie ────────────────────────────────────────────────────────

export type BudgetStatus = "realisable" | "partiel" | "report";

export interface BudgetCategoryLine {
  categoryId: string;
  categoryLabel: string;
  estimatedCost: number;
  /** % du coût total du projet. */
  pctOfTotal: number;
  /** Budget cumulé nécessaire pour atteindre ET terminer ce chantier. */
  budgetNeeded: number;
  /** Part du budget réellement allouée à ce chantier. */
  fundedAmount: number;
  status: BudgetStatus;
  priority: number;
}

export type BudgetScenarioKey = "actuel" | "plus_palier" | "complet";

export interface BudgetScenarioLine {
  scenario: BudgetScenarioKey;
  label: string;
  budget: number;
  /** Coût du projet effectivement finançable avec ce budget. */
  fundedCost: number;
  remaining: number;
  progressPct: number;
  reachableCategories: string[];
  partialCategories: string[];
  deferredCategories: string[];
  /** Chantiers qui deviennent possibles grâce à ce scénario. */
  additionalCategories: string[];
  /** % du coût total restant à financer sur ce scénario. */
  remainingToFundPct: number;
  /** Montant du projet non couvert par ce scénario. */
  remainingToFund: number;
  headline: string;
}

export interface BudgetAnalysis {
  available: boolean;
  reason?: string;
  projectId: string;
  userId: string;
  projectName: string;
  scenarioLabel: string;
  surface?: number;
  /** Coût total du scénario retenu (identique au « Coût estimatif »). */
  projectTotal: number;
  availableBudget: number;
  usedBudget: number;
  remainingBudget: number;
  /** % du coût total du projet finançable avec le budget saisi. */
  projectReachablePct: number;
  /** % du budget effectivement consommé. */
  budgetUsedPct: number;
  /**
   * Part du COÛT TOTAL correspondant aux travaux effectivement sélectionnables
   * (réalisables + partiellement réalisables) avec le budget saisi.
   */
  selectedCostSharePct: number;
  /** Montant du coût total du projet qui reste à financer. */
  gapToProjectTotal: number;
  /** Budget encore nécessaire pour terminer le chantier prioritaire suivant. */
  gapToNextCategory: number;
  /** Libellé du chantier prioritaire suivant (le suivant dans la priorisation). */
  nextCategoryLabel: string;
  /** Combinaison optimale de catégories conseillée par l'IA. */
  optimalCombination: string;
  /** Coût au m², quand la surface du projet est connue. */
  perUnitEstimate?: number;
  breakdown: BudgetCategoryLine[];
  statusSummary: {
    realisable: BudgetCategoryLine[];
    partiel: BudgetCategoryLine[];
    report: BudgetCategoryLine[];
  };
  scenarios: BudgetScenarioLine[];
  recommendation: string;
  summarySentence: string;
  generatedAt: number;
}

export interface BudgetAnalysisInput {
  projectId: string;
  userId: string;
  projectName: string;
  scenarioLabel: string;
  projectTotal: number;
  budgetAvailable: number;
  breakdown: CategoryBreakdownItem[];
  lots?: QuantitatifLot[];
  surface?: number;
}

/** Écart du scénario « budget augmenté », en TND. */
export const BUDGET_SIMULATION_STEP_TND = 10000;

/**
 * Budget minimal saisissable (TND) : en dessous, la simulation perdrait son
 * sens (aucun chantier structurel n'est finançable).
 */
export const MIN_BUDGET_TND = 25000;

// ── Helpers ────────────────────────────────────────────────────────────────

const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const round1 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 10) / 10;

/** Format fr-FR à espaces ordinaires (aucun caractère insécable parasite). */
function frNumber(n: number, fractionDigits = 0): string {
  const safe = Number.isFinite(n) ? n : 0;
  return safe
    .toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: fractionDigits })
    .replace(/[\u202f\u00a0]/g, " ");
}

export const formatTndAmount = (n: number) => `${frNumber(Math.round(n))} TND`;
export const formatPercent = (n: number) => `${frNumber(round1(n), 1)} %`;

interface SimulatedScenario {
  lines: BudgetCategoryLine[];
  fundedCost: number;
  remaining: number;
}

/**
 * Allocation séquentielle : on sème le budget dans l'ordre de priorité des
 * chantiers. Un chantier est « réalisable » s'il est entièrement financé,
 * « partiel » s'il est entamé mais non terminé, « report » s'il est hors
 * budget. Rien n'est inventé : seuls les montants du Quantitatif sont utilisés.
 */
function simulateScenario(
  ordered: CategoryBreakdownItem[],
  projectTotal: number,
  budget: number,
): SimulatedScenario {
  let remaining = Math.max(0, budget);
  let cumulative = 0;
  let fundedCost = 0;

  const lines = ordered.map((cat) => {
    const cost = Math.max(0, Number(cat.estimatedCost) || 0);
    cumulative += cost;

    let fundedAmount: number;
    let status: BudgetStatus;
    if (cost > 0 && remaining >= cost) {
      fundedAmount = cost;
      status = "realisable";
    } else if (cost > 0 && remaining > 0) {
      fundedAmount = remaining;
      status = "partiel";
    } else {
      fundedAmount = 0;
      status = "report";
    }

    remaining = round2(Math.max(0, remaining - fundedAmount));
    fundedCost = round2(fundedCost + fundedAmount);

    return {
      categoryId: cat.category,
      categoryLabel: cat.label,
      estimatedCost: round2(cost),
      pctOfTotal: projectTotal > 0 ? round1((cost / projectTotal) * 100) : 0,
      budgetNeeded: round2(cumulative),
      fundedAmount: round2(fundedAmount),
      status,
      priority: categoryPriority(cat.category),
    };
  });

  return { lines, fundedCost, remaining: round2(remaining) };
}

/** Bloc de progression ASCII (aucune valeur codée en dur : dérivé du %). */
export function budgetProgressionBlocks(pct: number, total = 24, max = 100): string {
  const filled = Math.max(0, Math.min(total, Math.round((Math.max(0, Math.min(max, pct)) / max) * total)));
  return "\u2588".repeat(filled) + "\u2591".repeat(total - filled);
}

function toScenario(
  key: BudgetScenarioKey,
  label: string,
  budget: number,
  sim: SimulatedScenario,
  projectTotal: number,
  baseBudget: number,
): BudgetScenarioLine {
  const reachableCategories = sim.lines.filter((l) => l.status === "realisable").map((l) => l.categoryLabel);
  const partialCategories = sim.lines.filter((l) => l.status === "partiel").map((l) => l.categoryLabel);
  const deferredCategories = sim.lines.filter((l) => l.status === "report").map((l) => l.categoryLabel);
  const progressPct = projectTotal > 0 ? round1((sim.fundedCost / projectTotal) * 100) : 0;
  const remainingToFund = round2(Math.max(0, projectTotal - sim.fundedCost));
  const remainingToFundPct = projectTotal > 0 ? round1((remainingToFund / projectTotal) * 100) : 0;

  // Chantiers qui deviennent réalisables grâce au budget de ce scénario.
  const additionalCategories =
    key === "actuel"
      ? []
      : sim.lines
          .filter((l) => l.status !== "report")
          .map((l) => l.categoryLabel)
          .filter((label) => !reachableCategories.includes(label));

  const headline = deferredCategories.length
    ? `${formatPercent(progressPct)} du projet finançable \u00b7 ${formatTndAmount(sim.remaining)} disponibles`
    : `Projet complet finan\u00e7able \u00b7 ${formatTndAmount(sim.remaining)} disponibles`;

  return {
    scenario: key,
    label,
    budget: round2(budget),
    fundedCost: sim.fundedCost,
    remaining: sim.remaining,
    progressPct,
    reachableCategories,
    partialCategories,
    deferredCategories,
    additionalCategories,
    remainingToFund,
    remainingToFundPct,
    headline,
  };
}

// ── Moteur principal ───────────────────────────────────────────────────────

export function buildBudgetAnalysis(input: BudgetAnalysisInput): BudgetAnalysis {
  const projectTotal = Math.max(0, Number(input.projectTotal) || 0);
  const budget = Math.max(0, Number(input.budgetAvailable) || 0);
  const breakdown = (input.breakdown ?? []).filter(
    (c) => c && Number(c.estimatedCost) > 0,
  );
  const ordered = [...breakdown].sort(
    (a, b) => categoryPriority(a.category) - categoryPriority(b.category),
  );

  const base = {
    projectId: input.projectId,
    userId: input.userId,
    projectName: input.projectName,
    scenarioLabel: input.scenarioLabel,
    surface: input.surface,
    projectTotal: round2(projectTotal),
    availableBudget: round2(budget),
    generatedAt: Date.now(),
  };

  if (breakdown.length === 0) {
    return {
      ...base,
      available: false,
      reason:
        "Aucun Quantitatif d\u00e9taill\u00e9 n'est disponible pour ce projet. " +
        "Effectuez d'abord l'estimation du co\u00fbt de construction : l'analyse du budget s'appuie enti\u00e8rement sur ses donn\u00e9es.",
      usedBudget: 0,
      remainingBudget: round2(budget),
      projectReachablePct: 0,
      budgetUsedPct: 0,
      selectedCostSharePct: 0,
      gapToProjectTotal: round2(projectTotal),
      gapToNextCategory: 0,
      nextCategoryLabel: "",
      optimalCombination: "",
      breakdown: [],
      statusSummary: { realisable: [], partiel: [], report: [] },
      scenarios: [],
      recommendation: "",
      summarySentence: "",
    };
  }

  if (budget <= 0) {
    return {
      ...base,
      available: false,
      reason:
        "Budget saisi : 0 TND. Indiquez le budget r\u00e9ellement disponible pour ce projet afin d'obtenir une simulation de construction.",
      usedBudget: 0,
      remainingBudget: 0,
      projectReachablePct: 0,
      budgetUsedPct: 0,
      selectedCostSharePct: 0,
      gapToProjectTotal: 0,
      gapToNextCategory: 0,
      nextCategoryLabel: "",
      optimalCombination: "",
      breakdown: [],
      statusSummary: { realisable: [], partiel: [], report: [] },
      scenarios: [],
      recommendation: "",
      summarySentence: "",
    };
  }

  if (budget < MIN_BUDGET_TND) {
    return {
      ...base,
      available: false,
      reason:
        `Budget saisi : ${formatTndAmount(budget)}. ` +
        `La simulation de construction s'active \u00e0 partir de ${formatTndAmount(MIN_BUDGET_TND)} TND, ` +
        "montant minimum pour engager un chantier structurant de ce projet.",
      usedBudget: 0,
      remainingBudget: round2(budget),
      projectReachablePct: 0,
      budgetUsedPct: 0,
      selectedCostSharePct: 0,
      gapToProjectTotal: round2(projectTotal),
      gapToNextCategory: 0,
      nextCategoryLabel: "",
      optimalCombination: "",
      breakdown: [],
      statusSummary: { realisable: [], partiel: [], report: [] },
      scenarios: [],
      recommendation: "",
      summarySentence: "",
    };
  }

  const current = simulateScenario(ordered, projectTotal, budget);
  const boostedBudget = round2(budget + BUDGET_SIMULATION_STEP_TND);
  const scenarios: BudgetScenarioLine[] = [
    toScenario("actuel", "Budget actuel", budget, current, projectTotal, budget),
    toScenario(
      "plus_palier",
      `+ ${frNumber(BUDGET_SIMULATION_STEP_TND)} TND`,
      boostedBudget,
      simulateScenario(ordered, projectTotal, boostedBudget),
      projectTotal,
      budget,
    ),
    toScenario(
      "complet",
      "Projet complet",
      projectTotal,
      simulateScenario(ordered, projectTotal, projectTotal),
      projectTotal,
      budget,
    ),
  ];

  const realisable = current.lines.filter((l) => l.status === "realisable");
  const partiel = current.lines.filter((l) => l.status === "partiel");
  const report = current.lines.filter((l) => l.status === "report");

  const projectReachablePct =
    projectTotal > 0 ? round1((current.fundedCost / projectTotal) * 100) : 0;
  const budgetUsedPct = budget > 0 ? round1((current.fundedCost / budget) * 100) : 0;
  /** Coût des chantiers réellement sélectionnables (budget du projet). */
  const selectedCost = round2(
    [...realisable, ...partiel].reduce((sum, l) => sum + l.fundedAmount, 0),
  );
  const selectedCostSharePct =
    projectTotal > 0 ? round1((selectedCost / projectTotal) * 100) : 0;
  const gapToProjectTotal = round2(Math.max(0, projectTotal - current.fundedCost));

  // Phrase r\u00e9capitulative : uniquement des montants calcul\u00e9s.
  const builtPart = [
    ...realisable.map((l) => `\u00ab ${l.categoryLabel} \u00bb`),
    ...partiel.map(
      (l) =>
        `\u00ab ${l.categoryLabel} \u00bb (${formatPercent(l.estimatedCost > 0 ? (l.fundedAmount / l.estimatedCost) * 100 : 0)} financ\u00e9)`,
    ),
  ].join(", ");
  const deferredPart = report.length
    ? ` ${report.length} poste${report.length > 1 ? "s" : ""} \u00e0 reporter (${report
        .map((l) => l.categoryLabel)
        .join(", ")}).`
    : " Aucun poste n\u2019est \u00e0 reporter.";

  const summarySentence =
    `Avec un budget de ${formatTndAmount(budget)}, vous financez ${formatPercent(projectReachablePct)} ` +
    `du projet \u00ab ${input.projectName} \u00bb (sc\u00e9nario ${input.scenarioLabel}) : ` +
    (builtPart || "aucun chantier entam\u00e9") +
    `.` +
    deferredPart;

  // Recommandation : elle suit la prioritisation, jamais un montant fixe.
  const pivot = partiel[0] ?? realisable[realisable.length - 1] ?? report[0];
  const nextDeferred = report[0];
  /** Chantier prioritaire suivant : celui qu'il reste \u00e0 financer en priorit\u00e9. */
  const nextCategory = partiel[0] ?? report[0] ?? null;
  const gapToNextCategory = nextCategory
    ? round2(Math.max(0, nextCategory.estimatedCost - nextCategory.fundedAmount))
    : 0;

  /** Combinaison optimale : s\u00e9lection maximisant le co\u00fbt couvert sans d\u00e9passer le budget. */
  const optimalCombination =
    [...realisable, ...partiel]
      .map((l) => `${l.categoryLabel} (${formatTndAmount(l.fundedAmount)})`)
      .join(" + ") || "Aucun chantier finan\u00e7able";

  const recommendationParts: string[] = [];
  if (pivot) {
    recommendationParts.push(
      partiel.length
        ? `Priorit\u00e9 au \u00ab ${pivot.categoryLabel} \u00bb : ${formatTndAmount(budget)} financent l\u2019int\u00e9gralit\u00e9 de vos postes ant\u00e9rieurs et ${formatPercent(
            (pivot.fundedAmount / pivot.estimatedCost) * 100,
          )} de ce chantier.`
        : `Priorit\u00e9 au \u00ab ${pivot.categoryLabel} \u00bb : ce chantier est le plus structurant de votre projet et votre budget le couvre.`,
    );
  }
  if (nextCategory && gapToNextCategory > 0) {
    recommendationParts.push(
      `Il manque ${formatTndAmount(gapToNextCategory)} pour terminer \u00ab ${nextCategory.categoryLabel} \u00bb, ` +
        `soit un budget cumul\u00e9 de ${formatTndAmount(nextCategory.budgetNeeded)}.`,
    );
  }
  if (nextDeferred) {
    recommendationParts.push(
      `Le poste \u00ab ${nextDeferred.categoryLabel} \u00bb (${formatTndAmount(nextDeferred.estimatedCost)}) ` +
        `reste \u00e0 financer : pr\u00e9voyez ${formatTndAmount(gapToProjectTotal)} de plus pour livrer le projet \u00e0 100 %. ` +
        "S\u00e9curisez les travaux structurels avant d'engager les d\u00e9penses de finition.",
    );
  }
  recommendationParts.push(
    `R\u00e9partition conseill\u00e9e pour \u00e9viter les d\u00e9penses inutiles : ${optimalCombination}.`,
  );
  const recommendation = recommendationParts.join(" ");

  return {
    ...base,
    available: true,
    usedBudget: current.fundedCost,
    remainingBudget: current.remaining,
    projectReachablePct,
    budgetUsedPct,
    selectedCostSharePct,
    gapToProjectTotal,
    gapToNextCategory,
    nextCategoryLabel: nextCategory?.categoryLabel ?? "",
    optimalCombination,
    perUnitEstimate:
      input.surface && input.surface > 0 ? round2(projectTotal / input.surface) : undefined,
    breakdown: current.lines,
    statusSummary: { realisable, partiel, report },
    scenarios,
    recommendation,
    summarySentence,
  };
}