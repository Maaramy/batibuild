// ============================================================================
// SYNCHRONISATION DES MONTANTS — Estimation ⇄ Aide à la décision
// ----------------------------------------------------------------------------
// Contrat vérifié ici : pour un même projet, un même scénario et une même
// version de calcul, le montant TTC affiché dans « Aide à la décision » est
// STRICTEMENT égal au montant TTC officiel de « Résultat de l'estimation ».
//
// Les assertions comparent les valeurs NUMÉRIQUES (jamais les chaînes
// formatées) et l'écart autorisé est de 0 TND.
// ============================================================================

import { describe, expect, it } from "vitest";

import { runBIMEstimation } from "../convex/bimEngine";
import { generateDqe } from "../convex/dqeEngine";
import {
  computeQuantitatifTotals,
  overlayCustomizations,
  scaleDqeLots,
  budgetScenarioFactor,
  type BudgetScenarioKey,
  type QuantitatifCustomizationEntry,
} from "../convex/quantitatifCustomLogic";
import { resolveEstimationBudget } from "./estimationBudget";
import { legacyContingencyFactor } from "./constructionCost";
import { realBuiltArea } from "./buildingLevels";

const CATEGORY = "maison";
const SURFACE = 100;
const FLOORS = 1;
const REGION = "tunis";
const SCENARIO_KEYS: BudgetScenarioKey[] = ["economique", "standard", "premium"];

const builtSurface = realBuiltArea(SURFACE, FLOORS);
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

/**
 * Montant TTC officiel affiché par « Résultat de l'estimation », recalculé
 * SANS le résolveur : scénario budgétaire corrigé des imprévus, ou pipeline
 * DQE complet pour le scénario Personnalisé. Sert de contre-vérification.
 */
function estimationResultTTC(
  key: BudgetScenarioKey | "personnalise",
  entry?: QuantitatifCustomizationEntry,
): number {
  if (key === "personnalise") {
    if (!entry) throw new Error("Entrée Personnalisé requise");
    return referencePersonalizedTotal(entry);
  }
  return ce.budgetScenarios![key].totalCost;
}

/** Entrée de personnalisation : prix unitaire ET quantité modifiés. */
function customizationEntry(priceDelta: number, qtyDelta: number): QuantitatifCustomizationEntry {
  const lot = dqeLots.find((l) => (l.lines ?? []).length > 0)!;
  const lineIndex = 0;
  const line = lot.lines[lineIndex];
  return {
    lineKey: `${lot.id}::${lineIndex}`,
    lotId: lot.id,
    lotName: lot.name,
    lineIndex,
    baseDesignation: line.designation,
    designation: line.designation,
    unit: line.unit,
    quantity: Math.max(1, Number(line.quantity) + qtyDelta),
    unitPrice: Math.max(1, Number(line.unitPrice) + priceDelta),
    nature: line.nature,
    priceScenario: "standard",
    replacedArticle: true,
    updatedAt: Date.now(),
  };
}

/** Référence indépendante : total du scénario Personnalisé via le pipeline DQE. */
function referencePersonalizedTotal(entry: QuantitatifCustomizationEntry): number {
  const baseFactor = budgetScenarioFactor(ce.budgetScenarios, "standard");
  const scaled = scaleDqeLots(dqeLots, baseFactor);
  const overlay = overlayCustomizations(scaled, [entry], {
    scaleFactor: baseFactor,
    realCostFactor: 1,
  });
  return computeQuantitatifTotals(overlay.lots, builtSurface).total;
}

describe("montant TTC de l'estimation — égalité exacte avec Aide à la décision", () => {
  it("Standard : 100 m² maison Tunis, le même montant sur les deux pages", () => {
    const input = {
      costEstimate: ce,
      dqeLots,
      builtSurface,
      selectedScenario: "standard",
    } as const;

    const decisionBudgetTTC = resolveEstimationBudget(input).selectedTotal;
    const estimationResultTTC = ce.budgetScenarios!.standard.totalCost;

    expect(decisionBudgetTTC).toBe(estimationResultTTC);
    expect(decisionBudgetTTC).toBe(198_000);
    expect(resolveEstimationBudget(input).selectedCostPerM2).toBe(
      ce.budgetScenarios!.standard.costPerM2,
    );
  });

  it("Économique et Premium : égalité exacte, sans montant intermédiaire", () => {
    for (const key of ["economique", "premium"] as const) {
      const budget = resolveEstimationBudget({
        costEstimate: ce,
        dqeLots,
        builtSurface,
        selectedScenario: key,
      });
      expect(budget.selectedKey).toBe(key);
      expect(budget.selectedTotal).toBe(ce.budgetScenarios![key].totalCost);
      expect(budget.selectedCostPerM2).toBe(ce.budgetScenarios![key].costPerM2);
    }
  });

  it("changement de scénario : aucun montant du scénario précédent ne subsiste", () => {
    const standard = resolveEstimationBudget({
      costEstimate: ce,
      dqeLots,
      builtSurface,
      selectedScenario: "standard",
    }).selectedTotal;
    const eco = resolveEstimationBudget({
      costEstimate: ce,
      dqeLots,
      builtSurface,
      selectedScenario: "economique",
    }).selectedTotal;
    const premium = resolveEstimationBudget({
      costEstimate: ce,
      dqeLots,
      builtSurface,
      selectedScenario: "premium",
    }).selectedTotal;

    expect(eco).not.toBe(standard);
    expect(premium).not.toBe(standard);
    expect(new Set([eco, standard, premium]).size).toBe(3);
  });

  it("Personnalisé : montant réel après modification des prix ET des quantités", () => {
    const entry = customizationEntry(12, 3);
    const input = {
      costEstimate: ce,
      dqeLots,
      builtSurface,
      selectedScenario: "personnalise",
      baseScenario: "standard",
      modifications: [entry],
    } as const;

    const budget = resolveEstimationBudget(input);
    expect(budget.personalized).not.toBeNull();
    expect(budget.selectedKey).toBe("personnalise");
    // Montant RÉEL du Personnalisé — jamais celui du Standard.
    expect(budget.selectedTotal).toBe(budget.personalized!.totals.total);
    expect(budget.selectedTotal).toBe(referencePersonalizedTotal(entry));
    expect(budget.selectedTotal).not.toBe(ce.budgetScenarios!.standard.totalCost);
  });

  it("modification du DQE : les deux pages reprennent le montant actualisé", () => {
    const entry = customizationEntry(20, 5);
    const before = resolveEstimationBudget({
      costEstimate: ce,
      dqeLots,
      builtSurface,
      selectedScenario: "personnalise",
      baseScenario: "standard",
      modifications: [entry],
    }).selectedTotal;

    const updatedLots = dqeLots.map((lot) => ({
      ...lot,
      lines: lot.lines.map((line: any) => ({
        ...line,
        total: Math.round(Number(line.total) * 1.1),
      })),
    }));
    const after = resolveEstimationBudget({
      costEstimate: ce,
      dqeLots: updatedLots,
      builtSurface,
      selectedScenario: "personnalise",
      baseScenario: "standard",
      modifications: [entry],
    }).selectedTotal;

    expect(after).not.toBe(before);
    expect(after).toBe(
      resolveEstimationBudget({
        costEstimate: ce,
        dqeLots: updatedLots,
        builtSurface,
        selectedScenario: "personnalise",
        baseScenario: "standard",
        modifications: [entry],
      }).selectedTotal,
    );
  });

  it("rechargement du projet : scénario et montant conservés à l'identique", () => {
    const input = {
      costEstimate: ce,
      dqeLots,
      builtSurface,
      selectedScenario: "premium",
    } as const;
    const first = resolveEstimationBudget(input);
    const reloaded = resolveEstimationBudget({ ...input });
    expect(reloaded.selectedKey).toBe("premium");
    expect(reloaded.selectedTotal).toBe(first.selectedTotal);
  });

  it("deux projets différents : aucune contamination de montant", () => {
    const otherSurface = 160;
    const otherCe = runBIMEstimation(CATEGORY, otherSurface, FLOORS, REGION, "standard", undefined, {
      levelSurfaces: [otherSurface],
    }).costEstimate;
    const otherLots = generateDqe({
      category: CATEGORY,
      surface: otherSurface,
      floors: FLOORS,
      totalBudget: otherCe.totalCost,
      levelSurfaces: [otherSurface],
    }).lots as any[];

    const first = resolveEstimationBudget({
      costEstimate: ce,
      dqeLots,
      builtSurface,
      selectedScenario: "standard",
    });
    const other = resolveEstimationBudget({
      costEstimate: otherCe,
      dqeLots: otherLots,
      builtSurface: realBuiltArea(otherSurface, FLOORS),
      selectedScenario: "standard",
    });

    expect(first.selectedTotal).toBe(ce.budgetScenarios!.standard.totalCost);
    expect(other.selectedTotal).toBe(otherCe.budgetScenarios!.standard.totalCost);
    expect(other.selectedTotal).not.toBe(first.selectedTotal);
  });

  it("ancienne estimation (imprévus) : même montant réel que la page résultat", () => {
    const legacy = {
      ...ce,
      contingencyPercentage: 8,
      totalCost: Math.round(ce.totalCost * 1.08),
      budgetScenarios: {
        economique: {
          ...ce.budgetScenarios!.economique,
          totalCost: Math.round(ce.budgetScenarios!.economique.totalCost * 1.08),
        },
        standard: {
          ...ce.budgetScenarios!.standard,
          totalCost: Math.round(ce.budgetScenarios!.standard.totalCost * 1.08),
        },
        premium: {
          ...ce.budgetScenarios!.premium,
          totalCost: Math.round(ce.budgetScenarios!.premium.totalCost * 1.08),
        },
      },
    } as any;

    const factor = legacyContingencyFactor(legacy);
    const expected = Math.round(ce.budgetScenarios!.standard.totalCost * 1.08 * factor);
    const budget = resolveEstimationBudget({
      costEstimate: legacy,
      dqeLots,
      builtSurface,
      selectedScenario: "standard",
    });

    expect(budget.selectedTotal).toBe(expected);
    // Le même arrondi est appliqué par la page résultat.
    expect(budget.selectedTotal).toBe(Math.round(legacy.budgetScenarios.standard.totalCost * factor));
  });

  it("assertion contractuelle : decisionBudgetTTC === estimationResultTTC (0 TND d'écart)", () => {
    for (const key of [...SCENARIO_KEYS, "personnalise" as const]) {
      const entry = customizationEntry(12, 3);
      const decisionBudgetTTC = resolveEstimationBudget({
        costEstimate: ce,
        dqeLots,
        builtSurface,
        selectedScenario: key,
        baseScenario: "standard",
        modifications: [entry],
      }).selectedTotal;
      // Montant officiel recalculé indépendamment du résolveur.
      const officialEstimationTTC = estimationResultTTC(key, entry);

      expect(decisionBudgetTTC - officialEstimationTTC).toBe(0);
      expect(Number.isInteger(decisionBudgetTTC)).toBe(true);
    }
  });
});
