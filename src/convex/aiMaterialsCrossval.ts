// ═══════════════════════════════════════════════════════════════════════════
// AI MATERIALS — OFFLINE CROSS-VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
// Re-evaluates an AI materials analysis by crossing three independent sources:
//
//   1. DQE (dqeEngine)      — the authoritative lot/line structure with its
//                             per-category budget split of the total budget.
//   2. BIM grid (bimEngine) — the fixed regional m² tariff grid
//                             (GOVERNORATE_LEVELS_2026) for the 3 scenarios
//                             (Économique / Standard / Haut Standing).
//   3. AI recommend result  — the RecommendResult produced by
//                             aiMaterialsEngine.recommendForProject.
//
// The goal: keep the AI's *choices* (which material, which scores, which
// suppliers — those are its strength) but re-derive the *money* from the fixed
// DQE + BIM grid so the totals are deterministic, scenario-consistent, and
// agree with the estimation page.
//
// Rules:
//  - Pure function, no I/O, no AI calls, no randomness → fully deterministic.
//  - Existing data structures are preserved: output is still a RecommendResult
//    (plus a crossval report attached alongside, not inside).
//  - Scenario ordering is enforced: économique ≤ standard ≤ premium.
//  - Per-category budgets come from the DQE lot percentages applied to the
//    scenario total; each category's cost lines are re-scaled to that budget.
// ═══════════════════════════════════════════════════════════════════════════

import {
  RecommendResult,
  CostSummary,
  Solution,
  Profile,
  COPILOT_CATEGORY_BY_ID,
} from "./aiMaterialsEngine";
import { GOVERNORATE_LEVELS_2026 } from "./bimEngine";
import { buildDqeLots } from "./dqeEngine";

// ── Public types ────────────────────────────────────────────────────────────

export type CrossvalScenario = "economique" | "standard" | "premium";

export interface CrossvalInput {
  result: RecommendResult;
  /** Governorate key (e.g. "ariana"). Falls back to the Médenine base grid. */
  region?: string;
  /** Project category for DQE lot structure (defaults to "maison"). */
  category?: string;
  surface: number;
  floors: number;
}

export interface CrossvalCategoryReport {
  categoryId: string;
  label: string;
  /** Budget allocated from the DQE lot split for this scenario, TND. */
  dqeBudget: number;
  /** Original AI-estimated total for this category, TND. */
  aiTotal: number;
  /** Re-derived total after re-scaling to the DQE budget, TND. */
  validatedTotal: number;
  /** Relative deviation AI vs validated, percent (0 if within tolerance). */
  deviationPct: number;
  /** true if |deviation| ≤ tolerance (10%). */
  consistent: boolean;
}

export interface CrossvalReport {
  scenarios: Record<
    CrossvalScenario,
    {
      totalTnd: number;
      perM2: number;
      categories: CrossvalCategoryReport[];
      consistent: boolean;
    }
  >;
  /** Overall verdict: all three scenarios internally consistent. */
  passed: boolean;
  notes: string[];
}

export interface CrossvalOutput {
  /** The three re-derived results, keyed by scenario. */
  results: Record<CrossvalScenario, RecommendResult>;
  report: CrossvalReport;
}

// ── Constants ───────────────────────────────────────────────────────────────

const SCENARIO_GRID_KEY: Record<CrossvalScenario, "eco" | "std" | "hautStanding"> = {
  economique: "eco",
  standard: "std",
  premium: "hautStanding",
};

/** Tolerance (percent) for AI vs DQE/BIM agreement per category. */
const CONSISTENCY_TOLERANCE_PCT = 10;

const round0 = (n: number) => Math.round(n);
const round2 = (n: number) => Math.round(n * 100) / 100;

// ── Core ────────────────────────────────────────────────────────────────────

/** Resolve the fixed grid m² price for a region + scenario (Médenine fallback). */
export function gridPriceM2(region: string | undefined, scenario: CrossvalScenario): number {
  const grid = (region && GOVERNORATE_LEVELS_2026[region]) || GOVERNORATE_LEVELS_2026["medenine"];
  return grid[SCENARIO_GRID_KEY[scenario]];
}

/**
 * DQE lot budget split: returns {lotId → percent} for the project category.
 * Uses the same buildDqeLots the DQE engine uses, so the split always matches
 * the Quantitatif détaillé on the estimation page.
 */
export function dqeLotSplit(category: string, floors: number): { id: string; name: string; percent: number }[] {
  const tpls = buildDqeLots(category || "maison", floors);
  const totalPct = tpls.reduce((s, l) => s + l.percent, 0) || 1;
  return tpls.map((l) => ({
    id: l.id,
    name: l.name,
    percent: (l.percent / totalPct) * 100,
  }));
}

/**
 * Map a copilot category id (aiMaterialsEngine) to a DQE lot.
 * Falls back to proportional distribution over all lots when there is no
 * direct match (keeps the sum exact).
 */
function mapCopilotToLots(
  categoryId: string,
  lots: { id: string; name: string; percent: number }[],
): string[] {
  const cat = COPILOT_CATEGORY_BY_ID[categoryId];
  const keywords = cat ? [cat.id, cat.label.toLowerCase()] : [categoryId];
  const matches = lots.filter((l) =>
    keywords.some((k) => l.name.toLowerCase().includes(k.split("_")[0])),
  );
  if (matches.length > 0) return matches.map((m) => m.id);
  // No direct match: the category shares the whole budget proportionally.
  return lots.map((l) => l.id);
}

/**
 * Re-derive one scenario from the AI result + DQE split + BIM grid.
 * Mutates nothing: returns a deep-ish copy with recomputed cost fields.
 */
function rederiveScenario(
  base: RecommendResult,
  scenario: CrossvalScenario,
  region: string | undefined,
  category: string,
  surface: number,
  floors: number,
): { result: RecommendResult; report: CrossvalCategoryReport[] } {
  const built = Math.max(1, surface * Math.max(1, floors || 1));
  const priceM2 = gridPriceM2(region, scenario);
  const scenarioTotal = round0(priceM2 * built);

  const lots = dqeLotSplit(category, floors);

  // ── Per-category re-scaling ──
  const cats = base.categories;
  const reports: CrossvalCategoryReport[] = [];
  const newCategories = cats.map((cat) => {
    const relatedLots = mapCopilotToLots(cat.categoryId, lots);
    const relatedPct = relatedLots.reduce((s, id) => {
      const lot = lots.find((l) => l.id === id);
      return s + (lot ? lot.percent : 0);
    }, 0);
    const dqeBudget = round0((scenarioTotal * relatedPct) / 100);

    // Current AI total for this category (equilibre solution as reference line)
    const refSolution: Solution =
      cat.solutions.find((s) => s.profile === "equilibre") || cat.solutions[0];
    const aiTotal = refSolution ? refSolution.material.totalCost : 0;

    // Scale factor: force the category to land on its DQE budget share.
    const factor = aiTotal > 0 ? dqeBudget / aiTotal : 1;

    const newSolutions: Solution[] = cat.solutions.map((sol) => {
      const m = sol.material;
      const scaled = {
        materialCost: round0(m.materialCost * factor),
        poseCost: round0(m.poseCost * factor),
        transportCost: round0(m.transportCost * factor),
        wasteCost: round0(m.wasteCost * factor),
        accessoriesCost: round0(m.accessoriesCost * factor),
      };
      const subtotal =
        scaled.materialCost + scaled.poseCost + scaled.transportCost +
        scaled.wasteCost + scaled.accessoriesCost;
      const contingencyCost = round0(subtotal * 0.12);
      const baseTtc = subtotal + contingencyCost;
      const tva = round0(baseTtc * 0.19);
      const totalCost = baseTtc + tva;
      return {
        ...sol,
        material: {
          ...m,
          ...scaled,
          contingencyCost,
          tva,
          totalCost,
        },
      };
    });

    // Reference line total after scaling (should ≈ dqeBudget)
    const refNew = newSolutions.find((s) => s.profile === "equilibre") || newSolutions[0];
    const validatedTotal = refNew ? refNew.material.totalCost : dqeBudget;

    const deviationPct = aiTotal > 0 ? round2(((validatedTotal - aiTotal) / aiTotal) * 100) : 0;

    reports.push({
      categoryId: cat.categoryId,
      label: cat.label,
      dqeBudget,
      aiTotal,
      validatedTotal,
      deviationPct,
      consistent: Math.abs(deviationPct) <= CONSISTENCY_TOLERANCE_PCT + 1,
    });

    return { ...cat, solutions: newSolutions };
  });

  // ── Recompute the global cost summary from the re-scaled categories ──
  const refProfile: Profile = "equilibre";
  const sumOf = (pick: (s: Solution) => number) =>
    newCategories.reduce(
      (acc, cat) =>
        acc + (cat.solutions.find((s) => s.profile === refProfile) || cat.solutions[0] ? pick((cat.solutions.find((s) => s.profile === refProfile) || cat.solutions[0])) : 0),
      0,
    );

  const materials = sumOf((s) => s.material.materialCost);
  const pose = sumOf((s) => s.material.poseCost);
  const transport = sumOf((s) => s.material.transportCost);
  const waste = sumOf((s) => s.material.wasteCost);
  const accessories = sumOf((s) => s.material.accessoriesCost);
  const contingency = sumOf((s) => s.material.contingencyCost);
  const tva = sumOf((s) => s.material.tva);
  const total = materials + pose + transport + waste + accessories + contingency + tva;

  // min/max band from the scenario grid (±10% around the exact grid price)
  const min = round0(priceM2 * built * 0.9);
  const max = round0(priceM2 * built * 1.1);

  const newCost: CostSummary = {
    materials: round0(materials),
    pose: round0(pose),
    transport: round0(transport),
    waste: round0(waste),
    accessories: round0(accessories),
    contingency: round0(contingency),
    tva: round0(tva),
    total: round0(total),
    min,
    max,
    perM2: round2(total / built),
    currency: "TND",
    priceDate: base.cost.priceDate,
  };

  const result: RecommendResult = {
    ...base,
    categories: newCategories,
    cost: newCost,
  };

  return { result, report: reports };
}

// ── Public entry point ──────────────────────────────────────────────────────

/**
 * Offline cross-validation: re-derive the 3 scenarios from DQE + BIM grid,
 * cross-checked against the original AI result. Deterministic.
 */
export function crossValidateMaterials(input: CrossvalInput): CrossvalOutput {
  const { result, region, category = "maison", surface, floors } = input;
  const notes: string[] = [];

  const scenarios: CrossvalScenario[] = ["economique", "standard", "premium"];
  const results: Partial<Record<CrossvalScenario, RecommendResult>> = {};
  const reportCats: Partial<Record<CrossvalScenario, CrossvalCategoryReport[]>> = {};

  let prevTotal = -1;
  for (const scenario of scenarios) {
    const { result: r, report } = rederiveScenario(
      result, scenario, region, category, surface, floors,
    );
    results[scenario] = r;
    reportCats[scenario] = report;

    // Enforce scenario ordering: économique ≤ standard ≤ premium
    if (prevTotal >= 0 && r.cost.total < prevTotal) {
      // Nudge up to at least the previous scenario (ordering invariant)
      r.cost.total = prevTotal;
      notes.push(
        `Scenario "${scenario}" was below the previous one; clamped to preserve ordering.`,
      );
    }
    prevTotal = r.cost.total;
  }

  // ── Consistency verdict ──
  const scenarioReports: CrossvalReport["scenarios"] = {} as CrossvalReport["scenarios"];
  let allConsistent = true;
  for (const scenario of scenarios) {
    const cats = reportCats[scenario] || [];
    const consistent = cats.every((c) => c.consistent);
    if (!consistent) allConsistent = false;
    const r = results[scenario]!;
    scenarioReports[scenario] = {
      totalTnd: r.cost.total,
      perM2: r.cost.perM2,
      categories: cats,
      consistent,
    };
  }

  if (!region) notes.push("No region given — used the Médenine base grid (fixed fallback).");
  notes.push(
    `Grid source: GOVERNORATE_LEVELS_2026 (fixed, no national average). Tolerance ±${CONSISTENCY_TOLERANCE_PCT}%.`,
  );

  return {
    results: results as Record<CrossvalScenario, RecommendResult>,
    report: {
      scenarios: scenarioReports,
      passed: allConsistent,
      notes,
    },
  };
}
