// ============================================================================
// TYPE DE PROJET « RÉNOVATION CUISINE » — intégration plateforme
// ----------------------------------------------------------------------------
// Complète `src/convex/renovationCuisine.test.ts` (moteurs BIM / DQE /
// quantitatif, non importables depuis `src/lib` côté Convex) :
//
//   • nom exact du type et classement dans le parcours (groupe B) ;
//   • rapport PDF : sections exportées et scénario « Personnalisé » ;
//   • helper fiscal partagé (TTC → HT + TVA) appliqué au total du projet.
//
// Aucun montant n'est inventé : tout provient des moteurs réels de la
// plateforme (`generateDqe`, `runBIMEstimation`).
// ============================================================================

import { describe, it, expect } from "vitest";

import { generateDqe } from "@/convex/dqeEngine";
import { runBIMEstimation } from "@/convex/bimEngine";
import { PROJECT_TYPE_LABELS, resolveProjectType } from "@/convex/projectTypes";
import {
  computeQuantitatifTotals,
  overlayCustomizations,
  scaleDqeLots,
  type QuantitatifCustomizationEntry,
} from "@/convex/quantitatifCustomLogic";
import {
  DECISION_PAGE_PATH,
  buildProjectJourney,
  projectJourneyGroup,
} from "@/lib/projectJourney";
import { reportModuleKeysForGroup, visibleReportModules } from "@/lib/reportRegistry";
import { resolvePdfScenarioValues } from "@/lib/projectPdfScenario";
import { computeInvoiceTax } from "@/lib/invoiceStatus";

const CATEGORY = "renovation_cuisine";
const SURFACE = 12;
const REGION = "tunis";
const PROJECT_ID = "project-cuisine-1";
/** Taux de TVA de la chaîne d'estimation Batibuild (« TVA 19 % incluse »). */
const TVA_RATE_PERCENT = 19;

const ce = runBIMEstimation(CATEGORY, SURFACE, 1, REGION, "standard").costEstimate;
const dqe = generateDqe({ category: CATEGORY, surface: SURFACE, floors: 1, totalBudget: ce.totalCost });

const lotById = (lots: any[], id: string) => lots.find((l) => l.id === id);

describe("« Rénovation Cuisine » — intégration plateforme", () => {
  it("est sélectionnable dans le catalogue et nommé exactement « Rénovation Cuisine »", () => {
    expect(resolveProjectType(CATEGORY)).toBe(CATEGORY);
    expect(PROJECT_TYPE_LABELS[CATEGORY]).toBe("Rénovation Cuisine");
  });

  it("suit le parcours rénovation : coût estimatif → aide à la décision → mise en relation", () => {
    expect(projectJourneyGroup(CATEGORY)).toBe("B");
    const steps = buildProjectJourney(CATEGORY, PROJECT_ID);
    expect(steps.map((s) => s.label)).toEqual([
      "Coût estimatif",
      "Aide à la décision",
      "Mise en relation",
    ]);
    // Le lien de l'aide à la décision conserve le contexte du projet
    expect(steps[1].href).toBe(`${DECISION_PAGE_PATH}/${PROJECT_ID}`);
    // Aucune étape de construction neuve (plans, exécution) pour une rénovation
    expect(steps.map((s) => s.key)).not.toContain("plans");
    expect(steps.map((s) => s.key)).not.toContain("execution");
  });

  it("n'expose que le rapport « Coût estimatif » dans le rapport PDF", () => {
    expect(reportModuleKeysForGroup(projectJourneyGroup(CATEGORY))).toEqual(["cost"]);
    expect(visibleReportModules(() => true, CATEGORY).map((m) => m.key)).toEqual(["cost"]);
  });

  it("exporte le quantitatif en quatre sections et le total TTC du scénario", () => {
    const values = resolvePdfScenarioValues({
      scenario: "standard",
      scenarios: ce.budgetScenarios,
      ce,
      dqe,
      dqeScaleFactor: 1,
    });

    expect(values.isPersonalized).toBe(false);
    expect(values.scenarioLabel).toBe("Standard");
    expect((values.dqeLots as any[]).map((l) => l.id)).toEqual([
      "frais_preliminaires",
      "gros_oeuvre",
      "second_oeuvre",
      "amenagements_exterieurs",
    ]);
    expect(values.dqeTotals!.total).toBe(Math.round(dqe.totals.total));
    expect(values.totalCost).toBe(ce.totalCost);
    expect(values.breakdown.length).toBeGreaterThan(0);

    // Total TTC du projet décomposé HT + TVA (taux de la chaîne d'estimation)
    const tax = computeInvoiceTax(values.totalCost, TVA_RATE_PERCENT);
    expect(tax.amountTTC).toBe(values.totalCost);
    expect(tax.taxAmount).toBeGreaterThan(0);
    expect(tax.amountHT + tax.taxAmount).toBeCloseTo(tax.amountTTC, 3);
  });

  it("exporte aussi le scénario « Personnalisé » du projet", () => {
    const scaled = scaleDqeLots(dqe.lots, 1);
    const lot = lotById(scaled, "second_oeuvre");
    const index = lot.lines.findIndex((l: any) => l.designation.includes("Hotte aspirante"));
    const line = lot.lines[index];
    const customization: QuantitatifCustomizationEntry = {
      lineKey: `second_oeuvre::${index}`,
      lotId: "second_oeuvre",
      lotName: lot.name,
      lineIndex: index,
      baseDesignation: line.designation,
      designation: line.designation,
      unit: line.unit,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      nature: line.nature,
      priceScenario: "standard",
      replacedArticle: false,
      updatedAt: 1,
    };

    const res = overlayCustomizations(
      scaled,
      [{ ...customization, unitPrice: line.unitPrice * 2 }],
      { scaleFactor: 1, realCostFactor: 1 },
    );
    const totals = computeQuantitatifTotals(res.lots, SURFACE);

    const values = resolvePdfScenarioValues({
      scenario: "personnalise",
      scenarios: ce.budgetScenarios,
      ce,
      dqe,
      dqeScaleFactor: 1,
      personalized: { lots: res.lots, totals, modifiedCount: res.modifiedCount },
    });

    expect(values.isPersonalized).toBe(true);
    expect(values.scenarioLabel).toBe("Personnalisé");
    expect(values.modifiedCount).toBe(1);
    expect(values.totalCost).toBe(totals.total);
    // Le total personnalisé reste cohérent avec la somme des quatre sections
    expect(values.totalCost).toBe(
      (values.dqeLots as any[]).reduce((s: number, l: any) => s + l.subtotal, 0),
    );
  });
});
