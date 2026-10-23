// ============================================================================
// ÉCRAN DE CHARGEMENT — CONTENUS RÉELS DU COÛT ESTIMATIF
// ----------------------------------------------------------------------------
// Le chargement ne doit afficher aucun montant fictif : ce test verrouille
// l'égalité stricte entre le résumé de chargement et les valeurs de la page
// finale (même résolveur de budget, même surface construite, même quantitatif).
// ============================================================================

import { describe, expect, it } from "vitest";

import { runBIMEstimation } from "../convex/bimEngine";
import { generateDqe } from "../convex/dqeEngine";
import { resolveEstimationBudget } from "./estimationBudget";
import { buildEstimateLoadingSummary } from "./estimateLoadingSummary";
import { loadingLevelsLabel } from "./estimateLoaderTiming";
import { realBuiltArea } from "./buildingLevels";

const CATEGORY = "maison";
const SURFACE = 100;
const FLOORS = 1;
const REGION = "tunis";

const bim = runBIMEstimation(CATEGORY, SURFACE, FLOORS, REGION, "standard", undefined, {
  levelSurfaces: [SURFACE],
});
const ce = bim.costEstimate;
const dqeLots = generateDqe({
  category: CATEGORY,
  surface: SURFACE,
  floors: FLOORS,
  totalBudget: ce.totalCost,
  levelSurfaces: [SURFACE],
}).lots as any[];

/** Document projet minimal, identique à celui relu par la page finale. */
const project = {
  name: "Villa test",
  category: CATEGORY,
  region: REGION,
  surface: SURFACE,
  floors: FLOORS,
  levelSurfaces: [SURFACE],
  selectedScenario: "standard",
  costEstimate: ce as any,
  dqe: { lots: dqeLots },
};

const official = resolveEstimationBudget({
  costEstimate: ce as any,
  dqeLots,
  builtSurface: realBuiltArea(SURFACE, FLOORS, [SURFACE]),
  selectedScenario: "standard",
  baseScenario: "standard",
});

describe("résumé de chargement — aucune donnée disponible", () => {
  const summary = buildEstimateLoadingSummary({ project: null });

  it("ne fabrique aucun montant et conserve les emplacements", () => {
    expect(summary.total).toBeNull();
    expect(summary.costPerM2).toBeNull();
    expect(summary.builtSurface).toBeNull();
    expect(summary.breakdown).toEqual([]);
    expect(summary.ready).toBe(false);
  });

  it("affiche les quatre opérations de calcul comme non effectuées", () => {
    expect(summary.steps.map((s) => s.key)).toEqual([
      "quantities",
      "prices",
      "categories",
      "total",
    ]);
    expect(summary.steps.every((s) => !s.done)).toBe(true);
  });
});

describe("résumé de chargement — projet standard", () => {
  const summary = buildEstimateLoadingSummary({ project });

  it("reprend exactement le budget officiel de la page finale", () => {
    expect(summary.total).toBe(official.selectedTotal);
    expect(summary.costPerM2).toBe(Math.round(official.selectedCostPerM2));
    expect(summary.scenario).toBe("Standard");
    expect(summary.ready).toBe(true);
  });

  it("affiche les informations réelles du projet", () => {
    expect(summary.projectName).toBe("Villa test");
    expect(summary.projectType).toBe("Maison");
    expect(summary.region).toBe("Tunis");
    expect(summary.builtSurface).toBe(100);
    expect(summary.floors).toBe(1);
  });

  it("reprend la répartition réelle du quantitatif", () => {
    const expected = dqeLots.filter((l) => (l.subtotal ?? 0) > 0);
    expect(summary.breakdown).toHaveLength(expected.length);
    for (const row of summary.breakdown) {
      const lot = expected.find((l) => l.name === row.label);
      expect(lot).toBeDefined();
      expect(row.amount).toBeCloseTo(lot!.subtotal, 2);
    }
    // La répartition est la somme EXACTE des lots du quantitatif affiché ;
    // le budget officiel reste celui des scénarios (même base que la page
    // finale), d'où l'absence de comparaison directe avec `summary.total`.
    const sum = summary.breakdown.reduce((s, r) => s + r.amount, 0);
    const lotsSum = expected.reduce((s, l) => s + (l.subtotal ?? 0), 0);
    expect(sum).toBeCloseTo(lotsSum, 2);
  });

  it("marque les quatre opérations comme réellement effectuées", () => {
    expect(summary.steps.every((s) => s.done)).toBe(true);
  });
});

describe("résumé de chargement — surface réelle multi-niveaux", () => {
  it("utilise la somme des niveaux, jamais la surface du RDC seule", () => {
    const summary = buildEstimateLoadingSummary({
      project: {
        ...project,
        surface: 120,
        floors: 2,
        levelSurfaces: [120, 80],
      },
    });
    expect(summary.builtSurface).toBe(realBuiltArea(120, 2, [120, 80]));
    expect(summary.builtSurface).toBe(200);
    expect(summary.floors).toBe(2);
    expect(loadingLevelsLabel(2)).toBe("RDC + 1");
  });
});

describe("résumé de chargement — scénario Personnalisé", () => {
  const lot = dqeLots.find((l) => (l.lines ?? []).length > 0)!;
  const line = lot.lines[0];
  const modifications = [
    {
      lineKey: `${lot.id}::0`,
      lotId: lot.id,
      designation: line.designation,
      unit: line.unit,
      quantity: line.quantity,
      unitPrice: Math.round(line.unitPrice * 1.1),
    },
  ];

  const personalizedProject = { ...project, selectedScenario: "personnalise" };

  it("n'annonce aucun montant tant que les personnalisations ne sont pas lues", () => {
    const summary = buildEstimateLoadingSummary({
      project: personalizedProject,
      customizationReady: false,
      complementaryWorksReady: false,
    });
    expect(summary.total).toBeNull();
    expect(summary.costPerM2).toBeNull();
    expect(summary.breakdown).toEqual([]);
    expect(summary.ready).toBe(false);
  });

  it("affiche le montant réel du scénario Personnalisé une fois disponible", () => {
    const summary = buildEstimateLoadingSummary({
      project: personalizedProject,
      customization: { baseScenario: "standard", modifications: modifications as any },
      complementaryWorks: [],
      customizationReady: true,
      complementaryWorksReady: true,
    });
    const expected = resolveEstimationBudget({
      costEstimate: ce as any,
      dqeLots,
      builtSurface: 100,
      selectedScenario: "personnalise",
      baseScenario: "standard",
      modifications: modifications as any,
      complementaryWorks: [],
    });
    expect(expected.personalized).not.toBeNull();
    expect(summary.scenario).toBe("Personnalisé");
    expect(summary.total).toBe(expected.personalized!.totals.total);
    expect(summary.costPerM2).toBe(Math.round(expected.personalized!.totals.costPerM2));
    expect(summary.breakdown.length).toBeGreaterThan(0);
  });
});

describe("résumé de chargement — anciennes estimations avec imprévus", () => {
  it("retire la majoration exactement comme la page finale", () => {
    const legacy = {
      ...ce,
      contingencyBuffer: Math.round(ce.totalCost * 0.1),
      contingencyPercentage: 10,
    };
    const summary = buildEstimateLoadingSummary({
      project: { ...project, costEstimate: legacy as any },
    });
    const expected = resolveEstimationBudget({
      costEstimate: legacy as any,
      dqeLots,
      builtSurface: 100,
      selectedScenario: "standard",
      baseScenario: "standard",
    });
    expect(summary.total).toBe(expected.selectedTotal);
    expect(summary.total).toBe(Math.round(ce.budgetScenarios!.standard.totalCost / 1.1));
  });
});

describe("résumé de chargement — rénovation salle de bain", () => {
  it("chiffre la pièce au réel dès que la surface est connue", () => {
    const summary = buildEstimateLoadingSummary({
      project: {
        name: "SDB",
        category: "renovation_salle_de_bain",
        region: "tunis",
        surface: 6,
        floors: 1,
        selectedScenario: "standard",
      },
    });
    expect(summary.total).not.toBeNull();
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.costPerM2).toBe(Math.round(summary.total! / 6));
    expect(summary.breakdown.length).toBeGreaterThan(0);
    const sum = summary.breakdown.reduce((s, r) => s + r.amount, 0);
    expect(Math.abs(sum - summary.total!)).toBeLessThanOrEqual(1);
  });
});
