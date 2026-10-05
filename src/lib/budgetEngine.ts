/**
 * CAPACITÉ DE CONSTRUCTION — moteur « Aide à la décision » lié au projet.
 *
 * Principe : l'utilisateur saisit un budget disponible (TND) et le moteur
 * répond par une simulation DÉTERMINISTE de ce qui peut réellement être
 * construit, calculée à partir du « Quantitatif » du projet :
 *   • Funding séquentiel dans l'ordre de priorité des chantiers
 *     (études → fondations → gros œuvre → second œuvre → finitions →
 *     aménagements extérieurs) ;
 *   • trois scénarios dynamiques : budget actuel, +50 000 TND, projet complet ;
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

export type BudgetScenarioKey = "actuel" | "plus_cinquantaine" | "complet";

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
export const BUDGET_SIMULATION_STEP_TND = 50000;

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
): BudgetScenarioLine {
  const reachableCategories = sim.lines.filter((l) => l.status === "realisable").map((l) => l.categoryLabel);
  const partialCategories = sim.lines.filter((l) => l.status === "partiel").map((l) => l.categoryLabel);
  const deferredCategories = sim.lines.filter((l) => l.status === "report").map((l) => l.categoryLabel);
  const progressPct = projectTotal > 0 ? round1((sim.fundedCost / projectTotal) * 100) : 0;

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
        "La d\u00e9composition du co\u00fbt estimatif de ce projet est vide : impossible de d\u00e9terminer ce que votre budget permet de construire.",
      usedBudget: 0,
      remainingBudget: round2(budget),
      projectReachablePct: 0,
      budgetUsedPct: 0,
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
      breakdown: [],
      statusSummary: { realisable: [], partiel: [], report: [] },
      scenarios: [],
      recommendation: "",
      summarySentence: "",
    };
  }

  const current = simulateScenario(ordered, projectTotal, budget);
  const scenarios: BudgetScenarioLine[] = [
    toScenario("actuel", "Budget actuel", budget, current, projectTotal),
    toScenario(
      "plus_cinquantaine",
      `+ ${frNumber(BUDGET_SIMULATION_STEP_TND)} TND`,
      budget + BUDGET_SIMULATION_STEP_TND,
      simulateScenario(ordered, projectTotal, budget + BUDGET_SIMULATION_STEP_TND),
      projectTotal,
    ),
    toScenario(
      "complet",
      "Projet complet",
      projectTotal,
      simulateScenario(ordered, projectTotal, projectTotal),
      projectTotal,
    ),
  ];

  const realisable = current.lines.filter((l) => l.status === "realisable");
  const partiel = current.lines.filter((l) => l.status === "partiel");
  const report = current.lines.filter((l) => l.status === "report");

  const projectReachablePct =
    projectTotal > 0 ? round1((current.fundedCost / projectTotal) * 100) : 0;
  const budgetUsedPct = budget > 0 ? round1((current.fundedCost / budget) * 100) : 0;

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
  if (nextDeferred) {
    recommendationParts.push(
      `Les ${nextDeferred.categoryLabel.toLowerCase()} (${formatTndAmount(nextDeferred.estimatedCost)}) ` +
        `d\u00e9passent le budget saisi : pr\u00e9voyez un budget de ${formatTndAmount(
          nextDeferred.budgetNeeded,
        )} pour livrer le projet jusqu\u2019\u00e0 ce poste.`,
    );
  }
  const recommendation = recommendationParts.join(" ");

  return {
    ...base,
    available: true,
    usedBudget: current.fundedCost,
    remainingBudget: current.remaining,
    projectReachablePct,
    budgetUsedPct,
    perUnitEstimate:
      input.surface && input.surface > 0 ? round2(projectTotal / input.surface) : undefined,
    breakdown: current.lines,
    statusSummary: { realisable, partiel, report },
    scenarios,
    recommendation,
    summarySentence,
  };
}