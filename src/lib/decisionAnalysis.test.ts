import { describe, it, expect } from "vitest";

import { generateDqe } from "@/convex/dqeEngine";
import {
  buildMaterialWorkspace,
  predictiveIntelligence,
  type MarketCategoryTrend,
} from "@/convex/materialSelectionEngine";
import {
  buildDecisionAnalysis,
  buildSimulations,
  groupsPresent,
  materialGroup,
  riskBand,
  scoreBand,
} from "./decisionAnalysis";

const SCENARIOS = {
  economique: { label: "Économique", totalCost: 80_000, costPerM2: 800, multiplier: 0.8 },
  standard: { label: "Standard", totalCost: 100_000, costPerM2: 1_000, multiplier: 1 },
  premium: { label: "Premium", totalCost: 125_000, costPerM2: 1_250, multiplier: 1.25 },
};

const COST = { budgetScenarios: SCENARIOS, totalCost: 100_000, costPerSquareMeter: 1_000 };

const lots = () => generateDqe({ category: "villa", surface: 150, floors: 2, totalBudget: 100_000 }).lots;

function buildIntelligence(marketTrends: MarketCategoryTrend[] = []) {
  const workspace = buildMaterialWorkspace({ rawLots: lots(), costEstimate: COST, scenario: "standard" });
  const intelligence = predictiveIntelligence({
    lines: workspace.lines,
    variants: workspace.variants,
    scenario: "standard",
    materialsBudget: workspace.budget.materialsBudget,
    marketTrends,
  });
  return { workspace, intelligence };
}

describe("charte visuelle des scores (§15)", () => {
  it("applique les paliers 80/60/40", () => {
    expect(scoreBand(85).label).toBe("Excellent");
    expect(scoreBand(80).tone).toBe("excellent");
    expect(scoreBand(79).label).toBe("Bon");
    expect(scoreBand(60).tone).toBe("bon");
    expect(scoreBand(59).label).toBe("À surveiller");
    expect(scoreBand(40).tone).toBe("surveiller");
    expect(scoreBand(39).label).toBe("Risque élevé");
    expect(scoreBand(0).tone).toBe("risque");
  });

  it("inverse la lecture pour un score de risque", () => {
    expect(riskBand(5).label).toBe("Risque faible");
    expect(riskBand(90).label).toBe("Risque élevé");
  });
});

describe("materialGroup", () => {
  it("regroupe les catégories du catalogue officiel", () => {
    expect(materialGroup("liants_ciments_mortiers")).toBe("Ciment");
    expect(materialGroup("acier_metaux_structure")).toBe("Acier");
    expect(materialGroup("betons_prefabrication")).toBe("Béton");
    expect(materialGroup("maconnerie_plancher")).toBe("Briques");
    expect(materialGroup("isolation_thermique")).toBe("Isolation");
    expect(materialGroup("peintures_enduits_finitions")).toBe("Finitions");
    expect(materialGroup("categorie_inconnue")).toBe("Autres");
    expect(materialGroup(null)).toBe("Autres");
  });

  it("ne retient que les familles réellement présentes", () => {
    const { workspace } = buildIntelligence();
    const groups = groupsPresent(workspace.lines);
    expect(groups.length).toBeGreaterThan(0);
    expect(new Set(groups).size).toBe(groups.length);
  });
});

describe("buildDecisionAnalysis", () => {
  it("produit un modèle complet et borné à partir des données réelles", () => {
    const { workspace, intelligence } = buildIntelligence();
    const analysis = buildDecisionAnalysis({
      intelligence,
      workspace,
      projectTotal: workspace.budget.projectTotal,
      projectTypeLabel: "Villa",
      scenarioLabel: "Standard",
    });

    expect(analysis.globalScore).toBeGreaterThanOrEqual(0);
    expect(analysis.globalScore).toBeLessThanOrEqual(100);
    expect(analysis.scoreParts).toHaveLength(5);
    expect(analysis.scoreParts.map((p) => p.key)).toEqual([
      "prices",
      "budget",
      "materials",
      "losses",
      "purchase",
    ]);
    expect(analysis.alerts.length).toBeGreaterThanOrEqual(1);
    expect(analysis.risks).toHaveLength(7);
    expect(analysis.risks.every((r) => r.score >= 0 && r.score <= 100)).toBe(true);

    // Priorité d'achat triée par ordre décroissant.
    const priorities = analysis.priorities.map((p) => p.priority);
    expect([...priorities].sort((a, b) => b - a)).toEqual(priorities);

    // Recommandations project-specific : au moins la personnalisation du type.
    expect(analysis.recommendations.length).toBeGreaterThan(0);
    expect(analysis.recommendations.some((r) => r.includes("Villa"))).toBe(true);
  });

  it("détecte une hausse seulement lorsque l'historique marché en fournit une", () => {
    const { workspace } = buildIntelligence();
    // Historique réel simulé pour toutes les catégories présentes dans le projet.
    const categories = Array.from(
      new Set(workspace.lines.map((l) => l.category).filter((c) => !!c)),
    );
    expect(categories.length).toBeGreaterThan(0);
    const trends: MarketCategoryTrend[] = categories.map((category) => ({
      category,
      changes: 10,
      netPct: 4.2,
    }));
    const { workspace: ws2, intelligence: i2 } = buildIntelligence(trends);
    const analysis = buildDecisionAnalysis({
      intelligence: i2,
      workspace: ws2,
      projectTotal: ws2.budget.projectTotal,
    });
    expect(analysis.priceEvolution.basis).toBe("historique");
    expect(analysis.priceEvolution.forecasts.some((f) => f.basis === "historique")).toBe(true);
    expect(analysis.riseExposure).toBeGreaterThan(0);
    expect(analysis.materialRiseRisk.rising.length).toBeGreaterThan(0);
    expect(analysis.alerts[0].level).toBe("hausse");
  });

  it("reste honnête sans données exploitable (aucune tendance inventée)", () => {
    const intelligence = predictiveIntelligence({ lines: [], scenario: "standard", marketTrends: null });
    const { workspace } = buildIntelligence();
    const analysis = buildDecisionAnalysis({ intelligence, workspace, projectTotal: 100_000 });
    expect(analysis.available).toBe(false);
    expect(analysis.priceEvolution.trend).toBe("stable");
    expect(analysis.priceEvolution.forecasts).toHaveLength(0);
  });
});

describe("buildSimulations (§12)", () => {
  it("produit les scénarios attendus sans modifier le résultat officiel", () => {
    const { workspace, intelligence } = buildIntelligence();
    const analysis = buildDecisionAnalysis({
      intelligence,
      workspace,
      projectTotal: workspace.budget.projectTotal,
    });
    const sims = buildSimulations({
      workspace,
      projectTotal: workspace.budget.projectTotal,
      lossSaving: analysis.losses.avoidableLoss,
      budgetSaving: analysis.budget.saving,
      riseExposure: analysis.riseExposure,
    });
    expect(sims.map((s) => s.id)).toEqual([
      "all_5",
      "steel_10",
      "cement_5",
      "loss_10",
      "budget_opt",
      "anticipate",
    ]);
    // Une hausse généralisée augmente le coût si des matériaux chiffrés existent.
    if (workspace.lines.some((l) => l.priceAvailable)) {
      expect(sims[0].delta).toBeGreaterThanOrEqual(0);
      expect(sims[0].newProjectTotal).toBeGreaterThanOrEqual(workspace.budget.projectTotal);
    }
    // Les scénarios d'optimisation réduisent (ou n'augmentent pas) le coût.
    expect(sims[3].delta).toBeLessThanOrEqual(0);
    expect(sims[4].delta).toBeLessThanOrEqual(0);
    expect(sims[5].delta).toBeLessThanOrEqual(0);
  });
});
