import { describe, it, expect } from "vitest";
import {
  DEFAULT_INVESTMENT_REGION,
  buildInvestmentPrefill,
  constructionCostForScenario,
  extractProjectInvestmentFields,
  investmentPrefillFromProject,
  legacyContingencyFactor,
  withRealConstructionCost,
} from "./investmentPrefill";

// ---------------------------------------------------------------------------
// Jeux de données représentatifs des deux groupes de projets
// ---------------------------------------------------------------------------

/** Estimation standard : 3 scénarios, sans majoration d'imprévus. */
const COST_ESTIMATE = {
  totalCost: 300_000,
  contingencyBuffer: 0,
  contingencyPercentage: 0,
  budgetScenarios: {
    economique: { totalCost: 255_000, costPerM2: 1700, label: "Économique", multiplier: 0.85 },
    standard: { totalCost: 300_000, costPerM2: 2000, label: "Standard", multiplier: 1 },
    premium: { totalCost: 360_000, costPerM2: 2400, label: "Premium", multiplier: 1.2 },
  },
};

/** Groupe A — villa à Béja. */
const GROUP_A_PROJECT = {
  name: "Villa Béja",
  category: "villa",
  region: "beja",
  surface: 240,
  costEstimate: COST_ESTIMATE,
};

/** Groupe B — rénovation complète d'un appartement à Sousse. */
const GROUP_B_PROJECT = {
  name: "Rénovation appartement Sousse",
  category: "renovation_complete",
  region: "sousse",
  surface: 95,
  costEstimate: COST_ESTIMATE,
};

describe("extractProjectInvestmentFields — les 4 champs de l'analyse de rentabilité", () => {
  it("extrait nom, coût de construction, surface et région (groupe A)", () => {
    const fields = extractProjectInvestmentFields(GROUP_A_PROJECT, COST_ESTIMATE, "standard");
    expect(fields).toEqual({
      projectName: "Villa Béja",
      constructionCost: 300_000,
      surface: 240,
      region: "beja",
    });
  });

  it("extrait les mêmes champs pour un projet du groupe B (rénovation)", () => {
    const fields = extractProjectInvestmentFields(GROUP_B_PROJECT, COST_ESTIMATE, "standard");
    expect(fields).toEqual({
      projectName: "Rénovation appartement Sousse",
      constructionCost: 300_000,
      surface: 95,
      region: "sousse",
    });
  });

  it("suit le scénario budgétaire affiché sur la page des résultats", () => {
    expect(extractProjectInvestmentFields(GROUP_B_PROJECT, COST_ESTIMATE, "economique").constructionCost)
      .toBe(255_000);
    expect(extractProjectInvestmentFields(GROUP_B_PROJECT, COST_ESTIMATE, "premium").constructionCost)
      .toBe(360_000);
  });

  it("retombe sur économique → standard → total quand le scénario demandé manque", () => {
    const partial = { totalCost: 123_000, budgetScenarios: { standard: { totalCost: 200_000 } } };
    expect(constructionCostForScenario(partial, "premium")).toBe(200_000);
    expect(constructionCostForScenario({ totalCost: 123_000 }, "standard")).toBe(123_000);
    expect(constructionCostForScenario(null, "standard")).toBe(0);
  });

  it("n'invente aucune donnée absente : surface null, région par défaut, coût 0", () => {
    const fields = extractProjectInvestmentFields(
      { name: "Projet sans données", category: "villa", region: null, surface: null },
      null,
      "standard",
    );
    expect(fields.projectName).toBe("Projet sans données");
    expect(fields.surface).toBeNull();
    expect(fields.region).toBe(DEFAULT_INVESTMENT_REGION);
    expect(fields.constructionCost).toBe(0);
  });

  it("traite une surface nulle ou non valide comme une donnée absente", () => {
    expect(extractProjectInvestmentFields({ surface: 0 }, COST_ESTIMATE, "standard").surface).toBeNull();
    expect(extractProjectInvestmentFields({ surface: -10 }, COST_ESTIMATE, "standard").surface).toBeNull();
    expect(extractProjectInvestmentFields({ surface: Number.NaN }, COST_ESTIMATE, "standard").surface)
      .toBeNull();
  });

  it("supporte un projet non encore chargé (undefined)", () => {
    const fields = extractProjectInvestmentFields(undefined, undefined, "standard");
    expect(fields).toEqual({
      projectName: null,
      constructionCost: 0,
      surface: null,
      region: DEFAULT_INVESTMENT_REGION,
    });
  });
});

describe("withRealConstructionCost — anciennes estimations majorées d'imprévus", () => {
  it("retire la majoration d'imprévus du total et des scénarios", () => {
    const legacy = {
      totalCost: 110_000,
      contingencyBuffer: 10_000,
      contingencyPercentage: 10,
      budgetScenarios: {
        economique: { totalCost: 110_000 },
        standard: { totalCost: 110_000 },
        premium: { totalCost: 110_000 },
      },
    };
    expect(legacyContingencyFactor(legacy)).toBeCloseTo(1 / 1.1, 10);
    const corrected = withRealConstructionCost(legacy)!;
    expect(corrected.totalCost).toBe(100_000);
    expect(corrected.budgetScenarios?.standard?.totalCost).toBe(100_000);
    expect(corrected.contingencyPercentage).toBe(0);
    // L'objet d'origine n'est jamais modifié.
    expect(legacy.totalCost).toBe(110_000);
  });

  it("renvoie l'estimation inchangée quand aucune correction n'est nécessaire", () => {
    expect(withRealConstructionCost(COST_ESTIMATE)).toBe(COST_ESTIMATE);
    expect(withRealConstructionCost(null)).toBeNull();
    expect(withRealConstructionCost(undefined)).toBeUndefined();
  });

  it("l'extraction depuis le projet brut applique la correction", () => {
    const legacyProject = {
      ...GROUP_A_PROJECT,
      costEstimate: {
        totalCost: 110_000,
        contingencyBuffer: 10_000,
        contingencyPercentage: 10,
        budgetScenarios: { standard: { totalCost: 110_000 } },
      },
    };
    expect(investmentPrefillFromProject(legacyProject, "standard").purchasePrice).toBe(100_000);
  });
});

describe("buildInvestmentPrefill — formulaire de l'analyse de rentabilité", () => {
  it("reporte les 4 champs extraits et le type de bien déduit du projet", () => {
    const prefill = buildInvestmentPrefill(
      extractProjectInvestmentFields(GROUP_A_PROJECT, COST_ESTIMATE, "standard"),
      GROUP_A_PROJECT.category,
    );
    expect(prefill.name).toBe("Villa Béja");
    expect(prefill.purchasePrice).toBe(300_000);
    expect(prefill.area).toBe(240);
    expect(prefill.region).toBe("beja");
    expect(prefill.investmentType).toBe("villa");
  });

  it("déduit le type de bien des projets du groupe B sans erreur", () => {
    expect(
      buildInvestmentPrefill(
        extractProjectInvestmentFields(GROUP_B_PROJECT, COST_ESTIMATE, "standard"),
        "renovation_complete",
      ).investmentType,
    ).toBe("projet_neuf");
    expect(
      buildInvestmentPrefill(
        extractProjectInvestmentFields(GROUP_B_PROJECT, COST_ESTIMATE, "standard"),
        "plomberie_complete",
      ).investmentType,
    ).toBe("projet_neuf");
    expect(
      buildInvestmentPrefill(
        extractProjectInvestmentFields(GROUP_B_PROJECT, COST_ESTIMATE, "standard"),
        "restaurant",
      ).investmentType,
    ).toBe("local_commercial");
  });

  it("retombe sur appartement pour un type de projet inconnu", () => {
    expect(buildInvestmentPrefill(extractProjectInvestmentFields({}, null), "type_inconnu").investmentType)
      .toBe("appartement");
  });

  it("laisse la ville vide : elle reste à choisir dans la région extraite", () => {
    const prefill = buildInvestmentPrefill(
      extractProjectInvestmentFields(GROUP_B_PROJECT, COST_ESTIMATE, "standard"),
      GROUP_B_PROJECT.category,
    );
    expect(prefill.city).toBe("");
    expect(prefill.quartier).toBe("");
  });
});

describe("investmentPrefillFromProject — ouverture directe de l'analyse (URL, actualisation)", () => {
  it("retrouve les mêmes données que la page des résultats, groupe A et groupe B", () => {
    const a = investmentPrefillFromProject(GROUP_A_PROJECT, "standard");
    expect([a.name, a.purchasePrice, a.area, a.region]).toEqual(["Villa Béja", 300_000, 240, "beja"]);

    const b = investmentPrefillFromProject(GROUP_B_PROJECT, "standard");
    expect([b.name, b.purchasePrice, b.area, b.region]).toEqual([
      "Rénovation appartement Sousse",
      300_000,
      95,
      "sousse",
    ]);
  });

  it("reste exploitable si le projet n'a pas d'estimation", () => {
    const prefill = investmentPrefillFromProject({ name: "Projet", category: "plomberie_complete" });
    expect(prefill.purchasePrice).toBe(0);
    expect(prefill.area).toBeUndefined();
    expect(prefill.investmentType).toBe("projet_neuf");
  });
});
