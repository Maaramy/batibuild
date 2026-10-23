// ============================================================================
// RAPPORT PDF — AIDE À LA DÉCISION : détail des postes et articles.
//
// Le rapport doit reprendre TOUS les postes du Quantitatif (et pas seulement
// les catégories) : chaque sous-catégorie et chaque article réellement chiffré
// est présent, dans l'ordre de priorité des chantiers, avec sa quantité, son
// coût et le montant financé.
// ============================================================================
import jsPDF from "jspdf";
import { describe, expect, it, vi } from "vitest";

import type { BudgetAnalysis, BudgetCategoryLine } from "./budgetEngine";
import { buildQuantitatifDetailRows, exportDecisionSupportPdf } from "./decisionSupportPdf";

function category(overrides: Partial<BudgetCategoryLine> = {}): BudgetCategoryLine {
  return {
    categoryId: "gros_oeuvre",
    categoryLabel: "Gros œuvre",
    estimatedCost: 100000,
    pctOfTotal: 50,
    budgetNeeded: 100000,
    fundedAmount: 80000,
    realizationPct: 80,
    status: "partiel",
    priority: 4,
    subcategories: [],
    ...overrides,
  };
}

const BREAKDOWN: BudgetCategoryLine[] = [
  category({
    categoryId: "second_oeuvre",
    categoryLabel: "Second œuvre",
    priority: 5,
    estimatedCost: 40000,
    fundedAmount: 5000,
    realizationPct: 12.5,
    subcategories: [
      {
        subcategoryId: "second_oeuvre__0",
        subcategoryLabel: "Carrelage sol",
        estimatedCost: 25000,
        fundedAmount: 5000,
        pctOfCategory: 62.5,
        realizationPct: 20,
        status: "partiel",
        articles: [
          {
            designation: "Carrelage sol 40×40 (m²)",
            estimatedCost: 25000,
            fundedAmount: 5000,
            realizationPct: 20,
            quantity: 146,
            unit: "m²",
            unitPrice: 171,
          },
        ],
      },
    ],
  }),
  category({
    subcategories: [
      {
        subcategoryId: "gros_oeuvre__0",
        subcategoryLabel: "Fondations",
        estimatedCost: 60000,
        fundedAmount: 60000,
        pctOfCategory: 60,
        realizationPct: 100,
        status: "realisable",
        articles: [
          {
            designation: "Béton prêt à l'emploi 300 kg/m³",
            estimatedCost: 40000,
            fundedAmount: 40000,
            realizationPct: 100,
            quantity: 74,
            unit: "m³",
          },
          {
            designation: "Acier à béton T12 (tonne)",
            estimatedCost: 20000,
            fundedAmount: 20000,
            realizationPct: 100,
            quantity: 6,
            unit: "tonne",
          },
        ],
      },
    ],
  }),
];

describe("détail PDF de l'aide à la décision", () => {
  it("reprend tous les articles du Quantitatif, pas seulement les catégories", () => {
    const rows = buildQuantitatifDetailRows({ breakdown: BREAKDOWN });
    const articles = rows.filter((r) => r.level === "article");

    expect(articles).toHaveLength(3);
    expect(articles.map((a) => a.label)).toEqual([
      "Béton prêt à l'emploi 300 kg/m³",
      "Acier à béton T12 (tonne)",
      "Carrelage sol 40×40 (m²)",
    ]);
    // Montants et quantités strictement repris de l'analyse affichée.
    expect(articles[0]).toMatchObject({
      quantity: "74 m³",
      cost: 40000,
      funded: 40000,
      pct: 100,
    });
    expect(articles[2]).toMatchObject({
      quantity: "146 m²",
      cost: 25000,
      funded: 5000,
      pct: 20,
    });
  });

  it("affiche les postes dans l'ordre de priorité des chantiers", () => {
    const rows = buildQuantitatifDetailRows({ breakdown: BREAKDOWN });
    expect(rows.filter((r) => r.level === "category").map((r) => r.label)).toEqual([
      "Gros œuvre",
      "Second œuvre",
    ]);
    expect(rows.filter((r) => r.level === "subcategory").map((r) => r.label)).toEqual([
      "Fondations",
      "Carrelage sol",
    ]);
  });

  it("produit un PDF multi-pages sans erreur, détail des articles inclus", () => {
    // jsPDF copie ses méthodes d'API sur chaque instance à la construction :
    // remplacer `save` évite l'écriture disque tout en générant le vrai PDF.
    type JsPdfApi = { API: Record<string, unknown> };
    const API = (jsPDF as unknown as JsPdfApi).API;
    const originalSave = API.save;
    let generated: jsPDF | null = null;
    const save = vi.fn(function (this: jsPDF) {
      generated = this;
    });
    API.save = save;
    try {
      const analysis: BudgetAnalysis = {
        available: true,
        projectId: "p1",
        userId: "u1",
        projectName: "Villa Test",
        scenarioLabel: "Standard",
        surface: 100,
        projectTotal: 140000,
        availableBudget: 85000,
        usedBudget: 85000,
        remainingBudget: 0,
        projectReachablePct: 60.7,
        budgetUsedPct: 100,
        selectedCostSharePct: 60.7,
        gapToProjectTotal: 55000,
        gapToNextCategory: 15000,
        nextCategoryLabel: "Second œuvre",
        optimalCombination: "Gros œuvre puis Second œuvre",
        perUnitEstimate: 1400,
        breakdown: BREAKDOWN,
        statusSummary: { realisable: [], partiel: BREAKDOWN, report: [] },
        scenarios: [
          {
            scenario: "actuel",
            label: "Budget actuel",
            budget: 85000,
            fundedCost: 85000,
            remaining: 55000,
            progressPct: 60.7,
            reachableCategories: [],
            partialCategories: [],
            deferredCategories: [],
            additionalCategories: [],
            remainingToFundPct: 39.3,
            remainingToFund: 55000,
            headline: "60,7 % du projet finançable",
          },
        ],
        recommendation: "Prioriser le gros œuvre.",
        summarySentence: "Avec 85 000 TND, 60,7 % du projet est finançable.",
        generatedAt: new Date("2026-10-23T09:00:00Z").getTime(),
      };

      const filename = exportDecisionSupportPdf({
        analysis,
        projectContext: "Villa · Ariana · 100 m² · Standard",
      });

      expect(filename).toBe("Rapport-Aide-a-la-decision-Villa_Test.pdf");
      expect(save).toHaveBeenCalledTimes(1);
      expect(generated).not.toBeNull();
      const doc = generated as unknown as jsPDF;
      expect(doc.getNumberOfPages()).toBeGreaterThan(0);
      // Les articles du Quantitatif sont bien dans le flux du document (et pas
      // seulement les totaux par catégorie).
      const pdf = doc.output() as string;
      expect(pdf).toContain("Carrelage sol 40");
      expect(pdf).toContain("Acier");
      expect(pdf).toContain("Béton prêt");
    } finally {
      API.save = originalSave;
    }
  });

  it("conserve un poste agrégé sans article au lieu de l'omettre", () => {
    const rows = buildQuantitatifDetailRows({
      breakdown: [category({ subcategories: [] })],
    });
    expect(rows.map((r) => r.level)).toEqual(["category", "note"]);
    expect(rows[1].label).toBe("Aucun détail d'article enregistré pour ce poste");
  });
});
