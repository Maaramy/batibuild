/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import {
  computeIndicators,
  buildForecasts,
  buildScenarios,
  computeScore,
  buildComparison,
  runEngine,
  normalizeInput,
} from "./investments.js";

const modules = import.meta.glob("./**/*.*s");

const BASE_INPUT = {
  investmentType: "appartement" as const,
  purchasePrice: 396226,
  region: "tunis",
  monthlyRent: 3500,
  occupancyRate: 100,
  annualExpensesPct: 0,
  acquisitionFeesPct: 6,
};

describe("Moteur financier (fonctions pures)", () => {
  it("exemple du cahier des charges : 420 000 TND investis, 42 000 TND/an → 10 ans", () => {
    const input = normalizeInput(BASE_INPUT);
    const ind = computeIndicators(input);

    expect(ind.totalCost).toBe(420000);
    expect(ind.netAnnualIncome).toBe(42000);
    expect(ind.monthlyCashflow).toBe(3500);
    expect(ind.paybackYears).toBe(10);
    expect(ind.roiAnnualPct).toBe(10);
    expect(ind.grossYieldPct).toBe(10);
    expect(ind.netYieldPct).toBe(10);
  });

  it("les indicateurs restent cohérents avec des charges réalistes", () => {
    const input = normalizeInput({
      ...BASE_INPUT,
      annualExpensesPct: 20,
      occupancyRate: 95,
    });
    const ind = computeIndicators(input);

    expect(ind.grossAnnualRent).toBe(39900); // 3500*12*0.95
    expect(ind.operatingExpenses).toBe(7980); // 20%
    expect(ind.netAnnualIncome).toBe(31920);
    expect(ind.grossYieldPct).toBeGreaterThan(ind.netYieldPct);
    expect(ind.paybackYears).toBeGreaterThan(10);
    expect(ind.pricePerM2).toBeUndefined(); // pas de surface fournie
  });

  it("pricePerM2 est calculé quand la surface est fournie", () => {
    const input = normalizeInput({ ...BASE_INPUT, area: 120 });
    const ind = computeIndicators(input);
    expect(ind.pricePerM2).toBe(3302); // 396226 / 120 arrondi
  });

  it("loyer à la nuitée : équivalent mensuel = montant × 365/12", () => {
    const input = normalizeInput({
      ...BASE_INPUT,
      rentMode: "nuit",
      rentAmount: 150,
      occupancyRate: 60,
    });
    const ind = computeIndicators(input);
    expect(input.rentMode).toBe("nuit");
    expect(input.rentAmount).toBe(150);
    expect(ind.monthlyRent).toBe(Math.round((150 * 365) / 12));
    expect(ind.grossAnnualRent).toBe(Math.round(ind.monthlyRent * 12 * 0.6));
    expect(ind.occupancyRate).toBe(60);
  });

  it("charges détaillées et fiscalité intégrées aux charges d'exploitation", () => {
    const input = normalizeInput({
      ...BASE_INPUT,
      annualCharges: 2000,
      insurance: 500,
      managementFees: 0,
      taxationPct: 10,
    });
    const ind = computeIndicators(input);
    expect(ind.grossAnnualRent).toBe(42000); // 3500 × 12 × 100 %
    expect(ind.annualCharges).toBe(2000);
    expect(ind.insurance).toBe(500);
    expect(ind.managementFees).toBe(0);
    expect(ind.taxation).toBe(4200); // 10 % du brut
    expect(ind.operatingExpenses).toBe(2000 + 500 + 4200);
    expect(ind.netAnnualIncome).toBe(42000 - 6700);
  });

  it("frais de financement, d'agence, d'aménagement et ameublement ajoutés au coût total", () => {
    const input = normalizeInput({
      ...BASE_INPUT,
      financingFees: 5000,
      agencyFees: 8000,
      renovationCost: 10000,
      furnishingCost: 15000,
    });
    const ind = computeIndicators(input);
    expect(ind.acquisitionFees).toBe(23774); // 6 % de 396226
    expect(ind.financingFees).toBe(5000);
    expect(ind.agencyFees).toBe(8000);
    expect(ind.renovationCost).toBe(10000);
    expect(ind.furnishingCost).toBe(15000);
    expect(ind.totalCost).toBe(396226 + 23774 + 5000 + 8000 + 10000 + 15000);
  });

  it("la durée prévue de l'investissement est plancher à 5 ans", () => {
    const input = normalizeInput({ ...BASE_INPUT, horizonYears: 3 });
    expect(input.horizonYears).toBe(5);
  });

  it("l'appréciation annuelle est bornée entre 4 % et 6 %", () => {
    const low = normalizeInput({ ...BASE_INPUT, annualAppreciationPct: 2 });
    const high = normalizeInput({ ...BASE_INPUT, annualAppreciationPct: 9 });
    expect(low.annualAppreciationPct).toBe(4);
    expect(high.annualAppreciationPct).toBe(6);
  });

  it("hypothèses fixes du moteur : loyers 5 %, inflation 6 %", () => {
    const input = normalizeInput({ ...BASE_INPUT });
    expect(input.rentGrowthPct).toBe(5);
    expect(input.inflationPct).toBe(6);
  });

  it("prévisions : 10 points, revenus cumulés croissants, résumé 1/3/5/10 ans", () => {
    const input = normalizeInput(BASE_INPUT);
    const { points, summary } = buildForecasts(input);

    expect(points.length).toBe(10);
    for (let i = 1; i < points.length; i++) {
      expect(points[i].cumulativeIncome).toBeGreaterThan(points[i - 1].cumulativeIncome);
    }
    expect(summary.map((s) => s.horizon)).toEqual([1, 3, 5, 10]);
    expect(summary[3].futureValue).toBeGreaterThan(input.purchasePrice);
  });

  it("scénarios : optimiste ≥ réaliste ≥ prudent", () => {
    const input = normalizeInput(BASE_INPUT);
    const scenarios = buildScenarios(input);
    const keys = scenarios.map((s) => s.key);

    expect(keys).toEqual(["optimiste", "realiste", "prudent"]);
    const [opt, real, prd] = scenarios;
    expect(opt.cumulativeProfit).toBeGreaterThanOrEqual(real.cumulativeProfit);
    expect(real.cumulativeProfit).toBeGreaterThanOrEqual(prd.cumulativeProfit);
    expect(opt.futureValue).toBeGreaterThan(prd.futureValue);
    expect(real.risks.length).toBeGreaterThan(0);
  });

  it("score IA : entre 0 et 100 avec les 6 critères", () => {
    const input = normalizeInput(BASE_INPUT);
    const ind = computeIndicators(input);
    const score = computeScore(input, ind);

    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
    expect(score.criteria.length).toBe(6);
    const keys = score.criteria.map((c) => c.key);
    expect(keys).toContain("rentabilite");
    expect(keys).toContain("risque");
    expect(score.grade.length).toBeGreaterThan(0);
  });

  it("comparateur : 5 types comparés avec le même budget", () => {
    const input = normalizeInput(BASE_INPUT);
    const ind = computeIndicators(input);
    const comparison = buildComparison(input, ind);

    expect(comparison.length).toBe(5);
    const labels = comparison.map((c) => c.type);
    expect(labels).toContain("appartement");
    expect(labels).toContain("terrain");
    for (const c of comparison) {
      expect(c.totalCost).toBe(ind.totalCost);
      expect(c.score).toBeGreaterThanOrEqual(0);
    }
  });

  it("runEngine produit une analyse complète avec zone rankée", () => {
    const results = runEngine(BASE_INPUT);
    expect(results.indicators.totalCost).toBeGreaterThan(0);
    expect(results.forecasts.length).toBe(10);
    expect(results.scenarios.length).toBe(3);
    expect(results.comparison.length).toBe(5);
    expect(results.zone.rank).toBeGreaterThanOrEqual(1);
    expect(results.aiConfidence).toBeGreaterThanOrEqual(60);
    expect(results.aiConfidence).toBeLessThanOrEqual(97);
  });
});

describe("API investments", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function createUser(email: string) {
    return t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Test",
        email,
        role: "user",
        status: "active",
        subscriptionPlan: "free",
        image: undefined,
        company: undefined,
        phone: undefined,
        subscriptionEndDate: undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
  }

  it("saveAnalysis → listAnalyses → getAnalysis → isolation → deleteAnalysis", async () => {
    const userId = await createUser("user@test.com");
    const userT = t.withIdentity({ subject: userId });

    const results = runEngine(BASE_INPUT);
    const id = await userT.mutation(api.investments.saveAnalysis, {
      input: BASE_INPUT,
      results: results as any,
      aiInsights: undefined,
    });

    const list = await userT.query(api.investments.listAnalyses, {});
    expect(list.length).toBe(1);
    expect(list[0].input.region).toBe("tunis");
    expect(list[0].results.indicators.totalCost).toBe(420000);

    const got = await userT.query(api.investments.getAnalysis, {
      analysisId: id,
    });
    expect(got).not.toBeNull();

    // Un autre utilisateur ne peut pas voir l'analyse
    const otherId = await createUser("other@test.com");
    const otherT = t.withIdentity({ subject: otherId });
    const hidden = await otherT.query(api.investments.getAnalysis, {
      analysisId: id,
    });
    expect(hidden).toBeNull();
    const otherList = await otherT.query(api.investments.listAnalyses, {});
    expect(otherList.length).toBe(0);

    // Suppression
    await userT.mutation(api.investments.deleteAnalysis, { analysisId: id });
    const list2 = await userT.query(api.investments.listAnalyses, {});
    expect(list2.length).toBe(0);
  });

  it("getInvestmentZones renvoie les zones classées", async () => {
    const zones = await t.query(api.investments.getInvestmentZones, {});
    expect(zones.length).toBeGreaterThanOrEqual(20);
    expect(zones[0].name).toBe("Tunis");
    expect(zones[0].demandIndex).toBeGreaterThanOrEqual(zones[zones.length - 1].demandIndex);
  });
});
