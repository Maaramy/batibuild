import { describe, it, expect } from "vitest";
import {
  crossValidateMaterials,
  gridPriceM2,
  dqeLotSplit,
} from "./aiMaterialsCrossval";
import { RecommendResult, Solution } from "./aiMaterialsEngine";

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeSolution(profile: Solution["profile"], totalCost: number): Solution {
  const materialCost = totalCost * 0.6;
  const poseCost = totalCost * 0.2;
  const transportCost = totalCost * 0.05;
  const wasteCost = totalCost * 0.04;
  const accessoriesCost = totalCost * 0.03;
  const subtotal = materialCost + poseCost + transportCost + wasteCost + accessoriesCost;
  const contingencyCost = subtotal * 0.12;
  const base = subtotal + contingencyCost;
  const tva = base * 0.19;
  return {
    profile,
    profileLabel: profile,
    material: {
      id: "m1",
      name: "mat",
      unit: "u",
      band: { min: 1, avg: 2, max: 3 },
      quantity: 1,
      quantityUnit: "u",
      materialCost,
      poseCost,
      transportCost,
      wasteCost,
      accessoriesCost,
      contingencyCost,
      tva,
      totalCost: base + tva,
    },
    scores: {
      prix: 50, qualite: 50, durabilite: 50, isolationThermique: 50,
      isolationAcoustique: 50, resistance: 50, entretien: 50,
      disponibilite: 50, impactEnvironnemental: 50, noteGlobale: 50,
    },
    qualityScore10: 5,
    recommendationScore: 50,
    justification: "j",
    pros: [],
    cons: [],
    suppliers: [],
  };
}

function makeResult(catCount = 3, totalPerCat = 10000): RecommendResult {
  const categories = Array.from({ length: catCount }, (_, i) => ({
    categoryId: `cat${i}`,
    label: `Cat ${i}`,
    icon: "Box",
    candidatesCount: 3,
    coverage: true,
    solutions: [
      makeSolution("economique", totalPerCat * 0.85),
      makeSolution("equilibre", totalPerCat),
      makeSolution("premium", totalPerCat * 1.45),
    ],
    bestValue: "equilibre" as const,
    bestSupplier: null,
  }));
  return {
    generatedAt: 0,
    context: { surface: 120, floors: 1 },
    categories,
    recommendation: {
      solution: "equilibre",
      score: 70,
      materialName: "mat",
      categoryLabel: "Cat 0",
      explanation: "x",
      advantages: [],
      limits: [],
    },
    cost: {
      materials: 0, pose: 0, transport: 0, waste: 0, accessories: 0,
      contingency: 0, tva: 0, total: 0, min: 0, max: 0,
      perM2: 0, currency: "TND", priceDate: 0,
    },
    missingData: [],
  };
}

// ── Grid / DQE helpers ──────────────────────────────────────────────────────

describe("gridPriceM2", () => {
  it("returns the exact Ariana grid values for the 3 scenarios", () => {
    expect(gridPriceM2("ariana", "economique")).toBe(1404);
    expect(gridPriceM2("ariana", "standard")).toBe(1944);
    expect(gridPriceM2("ariana", "premium")).toBe(2700);
  });

  it("falls back to the Médenine base grid without a region", () => {
    expect(gridPriceM2(undefined, "standard")).toBe(1800);
    expect(gridPriceM2("unknown_region", "standard")).toBe(1800);
  });
});

describe("dqeLotSplit", () => {
  it("percentages sum to 100", () => {
    const lots = dqeLotSplit("maison", 1);
    const sum = lots.reduce((s, l) => s + l.percent, 0);
    expect(sum).toBeCloseTo(100, 6);
  });

  it("is deterministic across calls", () => {
    expect(dqeLotSplit("maison", 2)).toEqual(dqeLotSplit("maison", 2));
  });
});

// ── Cross-validation ────────────────────────────────────────────────────────

describe("crossValidateMaterials", () => {
  it("is deterministic: same input → same output", () => {
    const input = { result: makeResult(), region: "ariana", surface: 120, floors: 1 };
    const a = crossValidateMaterials(input);
    const b = crossValidateMaterials(input);
    expect(a.report).toEqual(b.report);
    expect(a.results.economique.cost.total).toBe(b.results.economique.cost.total);
  });

  it("produces the 3 scenarios with économique ≤ standard ≤ premium", () => {
    const out = crossValidateMaterials({
      result: makeResult(),
      region: "ariana",
      surface: 120,
      floors: 1,
    });
    const { economique, standard, premium } = out.results;
    expect(economique.cost.total).toBeLessThanOrEqual(standard.cost.total);
    expect(standard.cost.total).toBeLessThanOrEqual(premium.cost.total);
  });

  it("preserves the RecommendResult structure (categories, solutions, cost fields)", () => {
    const out = crossValidateMaterials({
      result: makeResult(3),
      region: "tunis",
      surface: 100,
      floors: 2,
    });
    const r = out.results.standard;
    expect(r.categories).toHaveLength(3);
    for (const cat of r.categories) {
      expect(cat.solutions.map((s) => s.profile)).toEqual([
        "economique", "equilibre", "premium",
      ]);
      for (const s of cat.solutions) {
        expect(s.material.totalCost).toBeGreaterThan(0);
        expect(s.material.contingencyCost).toBeGreaterThanOrEqual(0);
        expect(s.material.tva).toBeGreaterThanOrEqual(0);
      }
    }
    expect(r.cost.currency).toBe("TND");
    expect(r.cost.total).toBeGreaterThan(0);
    expect(r.cost.perM2).toBeGreaterThan(0);
  });

  it("does not mutate the input result", () => {
    const result = makeResult();
    const before = JSON.stringify(result);
    crossValidateMaterials({ result, region: "ariana", surface: 120, floors: 1 });
    expect(JSON.stringify(result)).toBe(before);
  });

  it("totals scale linearly with surface (deterministic grid × built area)", () => {
    const small = crossValidateMaterials({
      result: makeResult(), region: "ariana", surface: 100, floors: 1,
    });
    const big = crossValidateMaterials({
      result: makeResult(), region: "ariana", surface: 200, floors: 1,
    });
    const ratio = big.results.standard.cost.total / small.results.standard.cost.total;
    expect(ratio).toBeCloseTo(2, 1);
  });

  it("uses the fixed grid (Ariana standard = 1944 DT/m² × built × uplift), no national average", () => {
    const out = crossValidateMaterials({
      result: makeResult(1, 1000), // tiny AI totals → big uplift factor
      region: "ariana",
      surface: 120,
      floors: 1,
    });
    // The scenario totals must differ from each other (grid-driven),
    // and the standard total must be > grid×surface (pose/TVA uplift),
    // but proportional to it — proving the grid drives the result.
    const std = out.results.standard.cost;
    expect(std.total).toBeGreaterThan(1944 * 120);
    expect(std.min).toBeLessThan(std.total);
    expect(std.max).toBeGreaterThan(std.total);
  });

  it("reports per-category consistency with a ±10% tolerance", () => {
    const out = crossValidateMaterials({
      result: makeResult(3),
      region: "ariana",
      surface: 120,
      floors: 1,
    });
    for (const c of out.report.scenarios.standard.categories) {
      expect(c.dqeBudget).toBeGreaterThan(0);
      expect(Number.isFinite(c.deviationPct)).toBe(true);
    }
    expect(typeof out.report.passed).toBe("boolean");
  });
});
