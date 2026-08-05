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

  it("les coûts saisis (agence, financement, assurance, taxes, gestion) sont pris en compte", () => {
    const base = normalizeInput({ ...BASE_INPUT, annualExpensesPct: 0, occupancyRate: 100 });
    const withCosts = normalizeInput({
      ...BASE_INPUT,
      annualExpensesPct: 0,
      occupancyRate: 100,
      agencyFees: 10000,
      financingCost: 12000,
      insurance: 1000,
      taxes: 1500,
      managementFeesPct: 5,
    });

    const baseInd = computeIndicators(base);
    const ind = computeIndicators(withCosts);

    // Frais d'agence (one-shot) ajoutés au coût total
    expect(ind.totalCost).toBe(baseInd.totalCost + 10000);
    expect(ind.agencyFees).toBe(10000);

    // Charges annuelles : gestion 5% des loyers bruts + assurance + taxes + financement
    const gross = withCosts.monthlyRent * 12; // occupation 100%
    expect(ind.managementFees).toBe(Math.round(gross * 0.05));
    expect(ind.insurance).toBe(1000);
    expect(ind.taxes).toBe(1500);
    expect(ind.financingCost).toBe(12000);

    // Le revenu net, le cash-flow et le rendement intègrent les nouvelles charges
    expect(ind.netAnnualIncome).toBeLessThan(baseInd.netAnnualIncome);
    expect(ind.monthlyCashflow).toBeLessThan(baseInd.monthlyCashflow);
    expect(ind.netYieldPct).toBeLessThan(baseInd.netYieldPct);
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
