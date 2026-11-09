import { describe, expect, it } from "vitest";

import { generateDqe } from "../convex/dqeEngine";
import { resolveEstimationBudget } from "./estimationBudget";
import {
  DEFAULT_WORK_CATEGORY_IDS,
  UPPER_FLOOR_WORK_CATEGORY_IDS,
  applyWorkSelectionToLots,
  defaultWorkCategories,
  lotsSubtotal,
  resolveWorkSelection,
  scaleCostEstimateForWorkSelection,
  upperFloorWorkCategoryOptions,
  workCategoryIdsForType,
  workCategoryOptions,
  workSelectionRatio,
} from "./workCategories";

// ============================================================================
// « MODE DE CONSTRUCTION » — étape du tunnel de création de projet
// ----------------------------------------------------------------------------
// Ces tests verrouillent : les catégories proposées pour chaque type de projet,
// la pré-sélection « Gros œuvre » + « Second œuvre et finitions », le filtrage
// des lots du Quantitatif détaillé et l'ajustement des montants de l'estimation.
// ============================================================================

const MAISON_LOTS = [
  { id: "frais_preliminaires", name: "Frais Préliminaires et Études", subtotal: 10_000 },
  { id: "gros_oeuvre", name: "Gros œuvre (fondations, structures)", subtotal: 60_000 },
  { id: "second_oeuvre", name: "Second œuvre et finitions", subtotal: 20_000 },
  { id: "amenagements_exterieurs", name: "Aménagements extérieurs", subtotal: 6_000 },
  { id: "vrd", name: "Transports & autres", subtotal: 4_000 },
];

describe("catégories proposées selon le type de projet", () => {
  it("propose les catégories du gabarit du type (maison : études → VRD)", () => {
    const ids = workCategoryIdsForType("maison").map(String);
    expect(ids).toEqual([
      "frais_preliminaires",
      "gros_oeuvre",
      "second_oeuvre",
      "amenagements_exterieurs",
      "vrd",
    ]);
  });

  it("change réellement de catégories avec le type (salle de bain, piscine)", () => {
    const sdb = workCategoryIdsForType("renovation_salle_de_bain").map(String);
    expect(sdb).toContain("carrelage");
    expect(sdb).not.toContain("gros_oeuvre");

    const piscine = workCategoryIdsForType("piscine").map(String);
    expect(piscine).toContain("filtration");
    expect(piscine).not.toContain("second_oeuvre");
  });

  it("associe un libellé ET une description à chaque catégorie", () => {
    for (const type of ["maison", "local_commercial", "piscine", "electricite_complete"]) {
      for (const option of workCategoryOptions(type)) {
        expect(option.label.length).toBeGreaterThan(3);
        expect(option.description.length).toBeGreaterThan(10);
      }
    }
  });
});

describe("mode Étage : travaux proposés", () => {
  it("n'affiche que le gros œuvre et le second œuvre et finitions", () => {
    const options = upperFloorWorkCategoryOptions();
    expect(options.map((option) => option.id)).toEqual([
      "gros_oeuvre",
      "second_oeuvre",
    ]);
    expect([...UPPER_FLOOR_WORK_CATEGORY_IDS]).toEqual([
      "gros_oeuvre",
      "second_oeuvre",
    ]);
    expect(options.map((option) => option.label)).toEqual([
      "Gros œuvre (fondations, structures)",
      "Second œuvre et finitions",
    ]);
    expect(options.every((option) => option.defaultSelected)).toBe(true);
  });

  it("décrit le gros œuvre de l'Étage 1 sans fondations ni terrassement", () => {
    const grosOeuvre = upperFloorWorkCategoryOptions().find(
      (option) => option.id === "gros_oeuvre",
    );
    expect(grosOeuvre?.description).toMatch(/sans fondations ni terrassement/i);
    expect(grosOeuvre?.description).not.toMatch(/^Terrassement/i);
  });
});

describe("sélection par défaut", () => {
  it("pré-sélectionne Gros œuvre et Second œuvre et finitions", () => {
    expect([...DEFAULT_WORK_CATEGORY_IDS]).toEqual(["gros_oeuvre", "second_oeuvre"]);
    expect(defaultWorkCategories("maison")).toEqual(["gros_oeuvre", "second_oeuvre"]);
    expect(defaultWorkCategories("villa")).toEqual(["gros_oeuvre", "second_oeuvre"]);
  });

  it("ne coche par défaut que des catégories réellement proposées", () => {
    const ids = workCategoryIdsForType("piscine");
    const defaults = defaultWorkCategories("piscine");
    // La piscine ne produit ni Gros œuvre ni Second œuvre : toutes ses
    // catégories restent cochées pour ne pas amputer son estimation.
    expect(defaults).toEqual([...ids]);
  });

  it("marque les options par défaut dans la liste affichée", () => {
    const options = workCategoryOptions("maison");
    expect(options.filter((o) => o.defaultSelected).map((o) => o.id)).toEqual([
      "gros_oeuvre",
      "second_oeuvre",
    ]);
  });
});

describe("filtrage des lots du Quantitatif détaillé", () => {
  it("n'active aucun filtre pour un projet sans sélection enregistrée", () => {
    const selection = resolveWorkSelection(undefined, "maison");
    expect(selection.active).toBe(false);
    expect(applyWorkSelectionToLots(MAISON_LOTS, selection)).toHaveLength(5);
    expect(workSelectionRatio(MAISON_LOTS, MAISON_LOTS)).toBe(1);
  });

  it("ne garde que les catégories cochées", () => {
    const selection = resolveWorkSelection(["gros_oeuvre", "second_oeuvre"], "maison");
    expect(selection.active).toBe(true);
    expect(applyWorkSelectionToLots(MAISON_LOTS, selection).map((l) => l.id)).toEqual([
      "gros_oeuvre",
      "second_oeuvre",
    ]);
  });

  it("conserve toujours les lots hors catalogue (travaux complémentaires)", () => {
    const selection = resolveWorkSelection(["gros_oeuvre"], "maison");
    const lots = [
      ...MAISON_LOTS,
      { id: "custom:piscine", name: "Piscine ajoutée", subtotal: 25_000 },
    ];
    const kept = applyWorkSelectionToLots(lots, selection).map((l) => l.id);
    expect(kept).toContain("custom:piscine");
    expect(kept).not.toContain("vrd");
  });

  it("filtre un vrai quantitatif du moteur et fait baisser le total", () => {
    // `totalBudget` est indispensable : sans budget, les lots n'ont pas encore
    // de sous-total (le moteur les calcule à partir du budget du projet).
    const dqe = generateDqe({
      category: "maison",
      surface: 120,
      floors: 1,
      totalBudget: 300_000,
    } as any);
    const lots = (dqe as any).lots ?? [];
    expect(lots.length).toBeGreaterThan(2);

    const selection = resolveWorkSelection(defaultWorkCategories("maison"), "maison");
    const kept = applyWorkSelectionToLots(lots, selection);

    expect(kept.map((l: any) => l.id)).toEqual(["gros_oeuvre", "second_oeuvre"]);
    expect(lotsSubtotal(kept)).toBeLessThan(lotsSubtotal(lots));

    const ratio = workSelectionRatio(lots, kept);
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThan(1);
  });
});

describe("ajustement des montants de l'estimation", () => {
  const COST_ESTIMATE = {
    totalCost: 100_000,
    costPerSquareMeter: 1_000,
    budgetScenarios: {
      economique: { totalCost: 90_000, costPerM2: 900 },
      standard: { totalCost: 100_000, costPerM2: 1_000 },
      premium: { totalCost: 120_000, costPerM2: 1_200 },
    },
    breakdown: [
      { category: "gros_oeuvre", estimatedCost: 60_000, items: [{ totalPrice: 60_000 }] },
      { category: "second_oeuvre", estimatedCost: 40_000, items: [{ totalPrice: 40_000 }] },
    ],
  };

  it("laisse l'estimation intacte lorsque le ratio vaut 1", () => {
    expect(scaleCostEstimateForWorkSelection(COST_ESTIMATE, 1)).toBe(COST_ESTIMATE);
  });

  it("met à l'échelle total, coût au m², scénarios et répartition", () => {
    const scaled: any = scaleCostEstimateForWorkSelection(COST_ESTIMATE, 0.8);
    expect(scaled.totalCost).toBe(80_000);
    expect(scaled.costPerSquareMeter).toBe(800);
    expect(scaled.budgetScenarios.standard.totalCost).toBe(80_000);
    expect(scaled.budgetScenarios.premium.totalCost).toBe(96_000);
    expect(scaled.breakdown[0].estimatedCost).toBe(48_000);
    expect(scaled.breakdown[0].items[0].totalPrice).toBe(48_000);
    // L'objet d'origine n'est jamais modifié.
    expect(COST_ESTIMATE.totalCost).toBe(100_000);
  });

  it("ajuste le montant officiel via le résolveur partagé (page + aide à la décision)", () => {
    const lots = [
      { id: "frais_preliminaires", subtotal: 10_000 },
      { id: "gros_oeuvre", subtotal: 60_000 },
      { id: "second_oeuvre", subtotal: 20_000 },
      { id: "vrd", subtotal: 10_000 },
    ];
    const common = {
      costEstimate: COST_ESTIMATE as any,
      dqeLots: lots as any,
      builtSurface: 100,
      selectedScenario: "standard" as const,
    };

    // Sans sélection : montant d'origine, au dinar près.
    expect(resolveEstimationBudget(common).selectedTotal).toBe(100_000);

    // Avec « Gros œuvre » + « Second œuvre et finitions » seulement : 80 %.
    const filtered = resolveEstimationBudget({
      ...common,
      workCategories: ["gros_oeuvre", "second_oeuvre"],
      projectCategory: "maison",
    });
    expect(filtered.selectedTotal).toBe(80_000);
    expect(filtered.selectedCostPerM2).toBe(800);
    expect(filtered.scenarios.standard.totalCost).toBe(80_000);
  });

  it("ré-ancre les scénarios budgétaires sur le coût total TTC des travaux retenus", () => {
    // Cas réel : le total TTC enregistré (100 000) ne se déduit pas de la somme
    // des lots après harmonisation du quantitatif. Les scénarios doivent suivre
    // le TTC réellement chiffré, pas un pourcentage approximatif du total.
    const lots = [
      { id: "gros_oeuvre", subtotal: 70_000 },
      { id: "second_oeuvre", subtotal: 15_000 },
      { id: "vrd", subtotal: 12_000 },
    ];
    const budget = resolveEstimationBudget({
      costEstimate: COST_ESTIMATE as any,
      dqeLots: lots as any,
      builtSurface: 100,
      selectedScenario: "standard",
      workCategories: ["gros_oeuvre", "second_oeuvre"],
      projectCategory: "maison",
    });

    // Standard = TTC exact des lots retenus (85 000), coût au m² recalculé.
    expect(budget.selectedTotal).toBe(85_000);
    expect(budget.totalCost).toBe(85_000);
    expect(budget.selectedCostPerM2).toBe(850);
    expect(budget.scenarios.standard.totalCost).toBe(85_000);
    // Positions relatives du moteur conservées : −10 % et +20 % du Standard.
    expect(budget.scenarios.economique.totalCost).toBe(76_500);
    expect(budget.scenarios.premium.totalCost).toBe(102_000);
    expect(budget.scenarios.economique.costPerM2).toBe(765);
    expect(budget.scenarios.premium.costPerM2).toBe(1_020);
  });

  it("calcule le ratio des travaux sélectionnés sur le quantitatif complet", () => {
    const selection = resolveWorkSelection(["gros_oeuvre", "second_oeuvre"], "maison");
    const kept = applyWorkSelectionToLots(MAISON_LOTS, selection);
    // (60 000 + 20 000) / 100 000
    expect(workSelectionRatio(MAISON_LOTS, kept)).toBeCloseTo(0.8, 6);
  });
});
