import { describe, expect, it } from "vitest";

import type { MaterialWorkspace } from "@/convex/materialSelectionEngine";
import type { DecisionAnalysis } from "@/lib/decisionAnalysis";
import type { MaterialIntelRow, MaterialIntelligence } from "@/lib/materialIntelligence";
import {
  boundOptimizationRate,
  buildOptimizationPlan,
  estimateOptimizationRate,
  type OptimizationRateInput,
  combineSavings,
  OPTIMIZATION_MAX_PCT,
  OPTIMIZATION_MIN_PCT,
  progressionBlocks,
  scaleSaving,
  TARGET_HIGH_PCT,
  TARGET_LOW_PCT,
  type OptimizationInput,
  type OptimizationOpportunity,
} from "@/lib/optimizationEngine";

// ── Fabriques de test ───────────────────────────────────────────────────────
const baseRow = (o: Partial<MaterialIntelRow> = {}): MaterialIntelRow => ({
  articleId: "a1",
  designation: "Ciment CPJ 42.5",
  catalogName: null,
  reference: null,
  category: "liants_ciments_mortiers",
  group: "Ciment",
  unit: "sac",
  quantity: 10,
  projectUnitPrice: 100,
  projectTotal: 1000,
  found: true,
  priceListId: "p1",
  priceListName: "Ciment CPJ 42.5",
  priceListUnitPrice: 100,
  priceListMin: null,
  priceListMax: null,
  priceListCategory: null,
  priceListSubcategory: null,
  sku: null,
  availability: null,
  region: null,
  supplier: null,
  sourceType: null,
  priceUpdatedAt: null,
  priceQuality: null,
  currentUnitPrice: 100,
  currentTotal: 1000,
  trend: "stable",
  trendPct: 0,
  forecastLow: null,
  forecastHigh: null,
  horizon: null,
  confidence: "faible",
  confidencePct: 30,
  observations: 0,
  basis: null,
  basisLabel: null,
  materialSpecific: false,
  forecastMessage: null,
  riskScore: 20,
  impactScore: 40,
  priorityScore: 50,
  impactAmount: 0,
  watchScore: 30,
  timing: "surveiller",
  timingLabel: "Surveiller le prix",
  timingReason: "",
  budgetCurrent: 1000,
  budgetProjected: 1000,
  budgetGap: 0,
  potentialSaving: 0,
  lossQty: 0,
  lossUnit: "sac",
  lossValue: 0,
  lossReason: null,
  recommendation: "",
  dataQuality: { project: true, priceList: true, computed: true, forecast: false },
  ...o,
});

const mkIntel = (
  rows: MaterialIntelRow[],
  materialsBudget = rows.reduce((s, r) => s + r.currentTotal, 0),
): MaterialIntelligence => ({
  rows,
  analyzedCount: rows.length,
  priceListMatched: rows.filter((r) => r.found).length,
  materialsBudget,
  generatedAt: 0,
  aggregate: {
    analyzed: rows.length,
    watched: 0,
    priorityPurchases: 0,
    opportunities: 0,
    notFound: 0,
    rising: rows.filter((r) => r.trend === "hausse").length,
    falling: 0,
    globalScore: 60,
    priceRiskScore: 25,
    budgetOptimizationScore: 55,
    purchasePriorityScore: 50,
    antiWasteScore: 70,
    totalPotentialSaving: 0,
    totalExposure: 0,
    totalCurrent: rows.reduce((s, r) => s + r.currentTotal, 0),
    totalProjected: rows.reduce((s, r) => s + r.budgetProjected, 0),
    totalLoss: rows.reduce((s, r) => s + r.lossValue, 0),
    confidencePct: 40,
  },
});

const mkWorkspace = (
  variants: MaterialWorkspace["variants"] = {},
  lines: MaterialWorkspace["lines"] = [],
): MaterialWorkspace => ({ variants, lines } as unknown as MaterialWorkspace);

const mkAnalysis = (avoidableLoss = 0): DecisionAnalysis =>
  ({ losses: { avoidableLoss } } as unknown as DecisionAnalysis);

const input = (rows: MaterialIntelRow[], opts: Partial<OptimizationInput> = {}): OptimizationInput => ({
  intel: mkIntel(rows),
  workspace: mkWorkspace(),
  analysis: mkAnalysis(),
  projectTotal: 10_000,
  scenario: "standard",
  scenarioLabel: "Standard",
  ...opts,
});

const opp = (
  id: string,
  articleId: string | null,
  baseKind: OptimizationOpportunity["baseKind"],
  saving: number,
  baseCost = 1000,
): OptimizationOpportunity => ({
  id,
  lever: baseKind === "quantity" ? "quantites" : baseKind === "global" ? "regroupement" : "prix",
  articleId,
  designation: "Test",
  group: "Ciment",
  title: id,
  baseCost,
  baseKind,
  saving,
  savingPct: 0,
  impactScore: 50,
  rankScore: 50,
  risk: "faible",
  compatibility: 90,
  confidence: "moyenne",
  currentLabel: null,
  alternativeLabel: null,
  justification: "",
  consequences: "",
  overlaps: baseKind === "price",
});

// ── Tests ───────────────────────────────────────────────────────────────────
describe("optimizationEngine — potentiel dynamique (§2, §3)", () => {
  it("ne code jamais 15/18/20 en dur : le potentiel suit les données", () => {
    // Écart au minimum observé : (100 − 70) × 10 = 300 TND → 3 % du coût total.
    const rows = [baseRow({ priceListMin: 70 })];
    const plan = buildOptimizationPlan(input(rows));

    expect(plan.potentielPct).toBe(3);
    expect(plan.objective.targetLow).toBe(TARGET_LOW_PCT);
    expect(plan.objective.targetHigh).toBe(TARGET_HIGH_PCT);
    expect(plan.objective.band).toBe("en_cours");
    expect(plan.objective.reachable).toBe(false);
  });

  it("affiche un message honnête quand 15 % n'est pas atteignable (§10)", () => {
    const plan = buildOptimizationPlan(input([baseRow({ priceListMin: 70 })]));
    expect(plan.honesty).toBeTruthy();
    expect(plan.honesty).toContain("3");
    expect(plan.honesty).toContain("ne permettent pas de recommander davantage");
  });

  it("signale un potentiel élevé avec alerte d'arbitrage (§3)", () => {
    const rows = [baseRow({ articleId: "a1", currentTotal: 10000, quantity: 100, potentialSaving: 2500 })];
    const plan = buildOptimizationPlan(
      input(rows, { intel: mkIntel(rows, 10000), projectTotal: 10000 }),
    );
    expect(plan.potentielPct).toBe(25);
    expect(plan.objective.band).toBe("eleve");
    expect(plan.objective.message).toContain("Potentiel élevé");
  });
});

describe("optimizationEngine — addition non naïve (§6)", () => {
  it("dédoublonne deux leviers « prix » sur le même article", () => {
    const rows = [baseRow({ priceListMin: 50, potentialSaving: 800 })];
    const plan = buildOptimizationPlan(input(rows));

    expect(plan.economieBrute).toBe(1300); // 500 (prix) + 800 (alternative)
    expect(plan.economieRealisable).toBe(800); // max, jamais la somme
    expect(plan.overlap).toBe(500);
  });

  it("combine prix et quantité de façon multiplicative", () => {
    const c = combineSavings(
      [opp("p", "a1", "price", 500), opp("q", "a1", "quantity", 200)],
      ["p", "q"],
      10_000,
    );
    // 1000 × (1 − 0,5 × 0,8) = 600
    expect(c.brut).toBe(700);
    expect(c.realisable).toBe(600);
  });

  it("applique le regroupement global sur la base encore optimisable", () => {
    const c = combineSavings(
      [opp("p", "a1", "price", 500), opp("g", null, "global", 100)],
      ["p", "g"],
      10_000,
    );
    // Article : 500 ; base restante 50 % × 100 = 50 → 550.
    expect(c.realisable).toBe(550);
  });
});

describe("optimizationEngine — indicateurs (§14, §15, §17)", () => {
  it("borne le score d'optimisation et expose ses critères", () => {
    const plan = buildOptimizationPlan(input([baseRow({ priceListMin: 50 })]));
    expect(plan.scoreOptimisation).toBeGreaterThanOrEqual(0);
    expect(plan.scoreOptimisation).toBeLessThanOrEqual(100);
    expect(plan.scoreCriteria.length).toBe(6);
    for (const c of plan.scoreCriteria) {
      expect(c.value).toBeGreaterThanOrEqual(0);
      expect(c.value).toBeLessThanOrEqual(100);
    }
  });

  it("distingue le potentiel des autres indicateurs (§17)", () => {
    const plan = buildOptimizationPlan(input([baseRow({ priceListMin: 50 })]));
    expect(plan.coutInitial).toBe(plan.projectTotal);
    expect(plan.coutOptimise).toBe(plan.coutInitial - plan.economieRealisable);
    expect(plan.topCards.budgetOptimise).toBe(plan.coutOptimise);
    expect(plan.topCards.materials).toBe(1);
    // Réduction des pertes ≠ potentiel
    expect(plan.topCards.pertesPct).toBe(0);
  });

  it("retourne un plan indisponible sans matériau analysé", () => {
    const plan = buildOptimizationPlan(input([]));
    expect(plan.available).toBe(false);
    expect(plan.reason).toBeTruthy();
  });
});

describe("progressionBlocks — barre de progression (§9)", () => {
  it("produit une barre de 18 blocs cohérente avec le pourcentage", () => {
    expect(progressionBlocks(0)).toBe("░".repeat(18));
    expect(progressionBlocks(25)).toBe("█".repeat(18));
    const mid = progressionBlocks(12.5);
    expect(mid).toHaveLength(18);
    expect(mid).toContain("█");
    expect(mid).toContain("░");
  });
});

describe("boundOptimizationRate — taux final borné dans [15 %, 20 %]", () => {
  it("relève au plancher un potentiel trop faible", () => {
    const r = boundOptimizationRate({ iaPct: 12, costInitial: 60_000, iaSaving: 7_200 });
    expect(r.iaPct).toBe(12);
    expect(r.appliedPct).toBe(OPTIMIZATION_MIN_PCT);
    expect(r.raised).toBe(true);
    expect(r.capped).toBe(false);
    expect(r.appliedSaving).toBe(9_000);
    expect(r.costOptimized).toBe(51_000);
    expect(r.explanation).toContain("plancher");
  });

  it("conserve un potentiel compris dans l'intervalle", () => {
    const r = boundOptimizationRate({ iaPct: 17.8, costInitial: 60_000, iaSaving: 10_680 });
    expect(r.appliedPct).toBe(17.8);
    expect(r.raised).toBe(false);
    expect(r.capped).toBe(false);
    expect(r.appliedSaving).toBe(10_680);
    expect(r.costOptimized).toBe(49_320);
  });

  it("plafonne un potentiel excessif", () => {
    const r = boundOptimizationRate({ iaPct: 23, costInitial: 100_000, iaSaving: 23_000 });
    expect(r.appliedPct).toBe(OPTIMIZATION_MAX_PCT);
    expect(r.capped).toBe(true);
    expect(r.raised).toBe(false);
    expect(r.appliedSaving).toBe(20_000);
    expect(r.costOptimized).toBe(80_000);
    expect(r.explanation).toContain("plafond");
  });

  it("ne sort jamais de [15 %, 20 %] quelles que soient les données", () => {
    for (const iaPct of [0, 1, 5.4, 12, 14.99, 15, 15.2, 16.7, 18.9, 20, 20.01, 25, 60, 100, -5]) {
      const r = boundOptimizationRate({ iaPct, costInitial: 123_456, iaSaving: 9_876.54 });
      expect(r.appliedPct).toBeGreaterThanOrEqual(OPTIMIZATION_MIN_PCT);
      expect(r.appliedPct).toBeLessThanOrEqual(OPTIMIZATION_MAX_PCT);
      // Cohérence montants ↔ taux affiché.
      expect(r.appliedSaving).toBe(Math.round(r.costInitial * (r.appliedPct / 100)));
      expect(r.costOptimized).toBe(r.costInitial - r.appliedSaving);
      expect(r.costOptimized).toBeGreaterThanOrEqual(0);
    }
  });

  it("reste variable d'un projet à l'autre (jamais un taux fixe)", () => {
    const a = boundOptimizationRate({ iaPct: 15.4, costInitial: 100_000, iaSaving: 15_400 });
    const b = boundOptimizationRate({ iaPct: 18.9, costInitial: 100_000, iaSaving: 18_900 });
    expect(a.appliedPct).not.toBe(b.appliedPct);
    expect(a.appliedSaving).not.toBe(b.appliedSaving);
  });

  it("fournit un facteur d'alignement cohérent avec le montant réel", () => {
    const r = boundOptimizationRate({ iaPct: 23, costInitial: 100_000, iaSaving: 23_000 });
    expect(r.appliedSaving).toBeCloseTo(r.iaSaving * r.scale, 6);
    expect(scaleSaving(1_000, r.scale)).toBeCloseTo(869.6, 1);
  });

  it("applique quand même le plancher sans économie chiffrée (facteur neutre)", () => {
    const r = boundOptimizationRate({ iaPct: 0, costInitial: 80_000, iaSaving: 0 });
    expect(r.appliedPct).toBe(OPTIMIZATION_MIN_PCT);
    expect(r.appliedSaving).toBe(12_000);
    expect(r.scale).toBe(0);
    expect(scaleSaving(500, r.scale)).toBe(0);
  });
});

describe("estimateOptimizationRate — taux contextualisé, jamais constant", () => {
  const rateInput = (o: Partial<OptimizationRateInput> = {}): OptimizationRateInput => ({
    costInitial: 100_000,
    materialsBudget: 40_000,
    analysed: 20,
    opportunities: 12,
    alternatives: 6,
    rising: 4,
    avoidableLoss: 600,
    purchaseOpportunities: 5,
    groupable: 6,
    budgetCoverage: 0.6,
    optimizationScore: 60,
    ...o,
  });

  it("reste toujours dans [15 %, 20 %], même sur des données extrêmes", () => {
    for (const r of [
      rateInput(),
      rateInput({ analysed: 0, opportunities: 0, alternatives: 0, rising: 0, avoidableLoss: 0, purchaseOpportunities: 0, groupable: 0, optimizationScore: 0, budgetCoverage: 0 }),
      rateInput({ analysed: 500, opportunities: 2_000, alternatives: 500, rising: 500, avoidableLoss: 900_000, purchaseOpportunities: 400, groupable: 500, optimizationScore: 100, budgetCoverage: 0 }),
      rateInput({ costInitial: Number.NaN, materialsBudget: Number.NaN, avoidableLoss: Number.NaN, optimizationScore: Number.NaN }),
    ]) {
      const e = estimateOptimizationRate(r);
      expect(e.iaPct).toBeGreaterThanOrEqual(OPTIMIZATION_MIN_PCT);
      expect(e.iaPct).toBeLessThanOrEqual(OPTIMIZATION_MAX_PCT);
      expect(Number.isFinite(e.iaPct)).toBe(true);
      // Projection linéaire taux = 15 + 5 × score. Le score exposé est arrondi
      // à 2 décimales pour l'affichage : l'écart maximal induit est de 0,03 pt.
      expect(e.iaPct).toBeCloseTo(15 + 5 * e.score, 1);
      expect(Math.abs(e.iaPct - (15 + 5 * e.score))).toBeLessThanOrEqual(0.05);
      expect(e.score).toBeGreaterThanOrEqual(0);
      expect(e.score).toBeLessThanOrEqual(1);
    }
  });

  it("produit des taux DIFFÉRENTS selon les caractéristiques du projet", () => {
    const a = estimateOptimizationRate(rateInput({ opportunities: 3, alternatives: 1, rising: 1, avoidableLoss: 40, purchaseOpportunities: 0, groupable: 0, optimizationScore: 22, budgetCoverage: 0.95 }));
    const b = estimateOptimizationRate(rateInput());
    const c = estimateOptimizationRate(rateInput({ opportunities: 38, alternatives: 18, rising: 9, avoidableLoss: 2_400, purchaseOpportunities: 14, groupable: 16, optimizationScore: 88, budgetCoverage: 0.3 }));

    // Projets de plus en plus optimisables → taux strictement croissants.
    expect(a.iaPct).toBeLessThan(b.iaPct);
    expect(b.iaPct).toBeLessThan(c.iaPct);
    // Aucun des trois n'est collé aux bornes : le taux est bien calculé.
    expect(a.iaPct).toBeGreaterThan(OPTIMIZATION_MIN_PCT);
    expect(c.iaPct).toBeLessThan(OPTIMIZATION_MAX_PCT);
    expect(new Set([a.iaPct, b.iaPct, c.iaPct]).size).toBe(3);
  });

  it("renvoie toujours le même taux pour les mêmes données (aucun tirage aléatoire)", () => {
    expect(estimateOptimizationRate(rateInput())).toEqual(estimateOptimizationRate(rateInput()));
  });

  it("expose les critères réels et leurs poids", () => {
    const e = estimateOptimizationRate(rateInput());
    expect(e.criteria).toHaveLength(8);
    expect(e.criteria.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1, 6);
    for (const c of e.criteria) {
      expect(c.value).toBeGreaterThanOrEqual(0);
      expect(c.value).toBeLessThanOrEqual(1);
      expect(c.detail.length).toBeGreaterThan(0);
    }
    // Les critères reflètent les données fournies.
    expect(e.criteria.find((c) => c.key === "densite")?.detail).toContain("12");
    expect(e.criteria.find((c) => c.key === "substitution")?.detail).toContain("6");
  });

  it("ne renvoie jamais 20 % par défaut sur un projet peu optimisable", () => {
    const lean = estimateOptimizationRate(rateInput({ analysed: 30, opportunities: 1, alternatives: 0, rising: 0, avoidableLoss: 0, purchaseOpportunities: 0, groupable: 0, optimizationScore: 15, budgetCoverage: 1 }));
    expect(lean.iaPct).toBeLessThan(OPTIMIZATION_MAX_PCT);
    expect(lean.iaPct).toBeGreaterThanOrEqual(OPTIMIZATION_MIN_PCT);
    expect(lean.score).toBeLessThan(0.2);
  });
});
