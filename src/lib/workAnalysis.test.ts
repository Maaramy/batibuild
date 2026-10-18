import { describe, expect, it } from "vitest";

import type { BudgetCategoryLine } from "@/lib/budgetEngine";
import type { MaterialIntelRow } from "@/lib/materialIntelligence";
import type { OptimizationPlan } from "@/lib/optimizationEngine";
import { buildWorkPostes } from "@/lib/workAnalysis";

// ── Fabriques de test ───────────────────────────────────────────────────────
const baseRow = (o: Partial<MaterialIntelRow> = {}): MaterialIntelRow => ({
  articleId: "a1",
  designation: "Ciment CPJ 42.5",
  catalogName: null,
  reference: null,
  category: "liants_ciments_mortiers",
  group: "Ciment",
  unit: "sac",
  quantity: 10,
  projectUnitPrice: 100,
  projectTotal: 1000,
  found: true,
  priceListId: "p1",
  priceListName: "Ciment CPJ 42.5",
  priceListUnitPrice: 100,
  priceListMin: null,
  priceListMax: null,
  priceListCategory: null,
  priceListSubcategory: null,
  sku: null,
  availability: null,
  region: null,
  supplier: null,
  sourceType: null,
  priceUpdatedAt: null,
  priceQuality: null,
  currentUnitPrice: 100,
  currentTotal: 1000,
  trend: "stable",
  trendPct: 0,
  forecastLow: null,
  forecastHigh: null,
  horizon: null,
  confidence: "faible",
  confidencePct: 30,
  observations: 0,
  basis: null,
  basisLabel: null,
  materialSpecific: false,
  forecastMessage: null,
  riskScore: 20,
  impactScore: 40,
  priorityScore: 50,
  impactAmount: 0,
  watchScore: 30,
  timing: "surveiller",
  timingLabel: "Surveiller le prix",
  timingReason: "",
  budgetCurrent: 1000,
  budgetProjected: 1000,
  budgetGap: 0,
  potentialSaving: 0,
  lossQty: 0,
  lossUnit: "sac",
  lossValue: 0,
  lossReason: null,
  recommendation: "",
  dataQuality: { project: true, priceList: true, computed: true, forecast: false },
  ...o,
});

const category = (
  categoryId: string,
  categoryLabel: string,
  estimatedCost: number,
  articles: string[] = [],
): BudgetCategoryLine => ({
  categoryId,
  categoryLabel,
  estimatedCost,
  pctOfTotal: 0,
  budgetNeeded: estimatedCost,
  fundedAmount: 0,
  realizationPct: 0,
  status: "report",
  priority: 1,
  subcategories:
    articles.length === 0
      ? []
      : [
          {
            subcategoryId: `${categoryId}:sub`,
            subcategoryLabel: "Sous-lot",
            estimatedCost,
            fundedAmount: 0,
            pctOfCategory: 100,
            realizationPct: 0,
            status: "report",
            articles: articles.map((designation) => ({
              designation,
              estimatedCost: 0,
              fundedAmount: 0,
              realizationPct: 0,
            })),
          },
        ],
});

const saving = (designation: string, value: number): OptimizationPlan["articleSavings"][number] => ({
  articleId: designation,
  designation,
  saving: value,
  base: value * 10,
});

describe("buildWorkPostes — répartition des économies réelles par poste", () => {
  const rows = [
    baseRow({ articleId: "a1", designation: "Ciment CPJ 42.5", currentTotal: 1000, supplier: "S1" }),
    baseRow({
      articleId: "a2",
      designation: "Acier HA 12",
      currentTotal: 2000,
      trend: "hausse",
      impactAmount: 300,
      potentialSaving: 200,
      lossValue: 80,
      supplier: "S1",
    }),
    baseRow({
      articleId: "a3",
      designation: "Peinture blanche",
      currentTotal: 500,
      potentialSaving: 30,
      supplier: "S2",
      sourceType: "liste_prix",
    }),
  ];

  const breakdown = [
    category("c1", "Gros œuvre (fondations, structure)", 10000, ["Ciment CPJ 42.5", "Acier HA 12"]),
    category("c2", "Second œuvre et finitions", 4000, ["Peinture blanche"]),
    category("c3", "Équipements", 6000),
  ];

  it("rattache les économies au poste de leur matériau puis répartit le reste au prorata", () => {
    const postes = buildWorkPostes({
      breakdown,
      rows,
      articleSavings: [
        saving("Ciment CPJ 42.5", 100),
        saving("Acier HA 12", 200),
        saving("Peinture blanche", 50),
      ],
      totalSaving: 500,
    });

    expect(postes.map((p) => p.key)).toEqual(["c1", "c2", "c3"]);
    // Libellé nettoyé du complément entre parenthèses.
    expect(postes[0].label).toBe("Gros œuvre");

    // Économies rattachées : 300 TND sur le gros œuvre, 50 TND sur les finitions.
    expect(postes[0].saving).toBeGreaterThan(300);
    expect(postes[1].saving).toBeGreaterThan(50);
    // Le poste sans matériau chiffré ne capte rien (poids matériaux = 0).
    expect(postes[2].saving).toBe(0);

    // La somme des postes reste ÉGALE à l'économie globale retenue.
    const total = postes.reduce((s, p) => s + p.saving, 0);
    expect(total).toBeCloseTo(500, 6);

    // Cohérence arithmétique de chaque ligne.
    for (const p of postes) {
      expect(p.optimizedCost).toBeCloseTo(p.currentCost - p.saving, 6);
      expect(p.optimizedCost).toBeGreaterThanOrEqual(0);
      if (p.currentCost > 0) {
        expect(p.optimPct).toBeCloseTo((p.saving / p.currentCost) * 100, 6);
      }
    }
  });

  it("agrège les indicateurs réels du poste (matériaux, pertes, alternatives, fournisseurs, hausses)", () => {
    const [grosOeuvre] = buildWorkPostes({
      breakdown,
      rows,
      articleSavings: [],
      totalSaving: 0,
    });

    expect(grosOeuvre.materialCount).toBe(2);
    expect(grosOeuvre.materialBase).toBe(3000);
    expect(grosOeuvre.lossValue).toBe(80);
    expect(grosOeuvre.alternatives).toBe(1);
    expect(grosOeuvre.risingCount).toBe(1);
    expect(grosOeuvre.suppliers).toEqual(["S1"]);
    expect(grosOeuvre.topRows.map((r) => r.designation)).toEqual(["Acier HA 12", "Ciment CPJ 42.5"]);
  });

  it("ne dépasse jamais le coût du poste (coût optimisé jamais négatif)", () => {
    const postes = buildWorkPostes({
      breakdown: [
        category("c1", "Poste sous-estimé", 100, ["Ciment CPJ 42.5"]),
        category("c2", "Autre poste", 900, ["Acier HA 12"]),
      ],
      rows,
      articleSavings: [saving("Ciment CPJ 42.5", 5000), saving("Acier HA 12", 10)],
      totalSaving: 5010,
    });

    expect(postes[0].saving).toBe(100);
    expect(postes[0].optimizedCost).toBe(0);
    expect(postes[0].optimPct).toBe(100);
    for (const p of postes) expect(p.optimizedCost).toBeGreaterThanOrEqual(0);
  });

  it("retombe sur le coût du poste quand aucun matériau n'est chiffré", () => {
    const postes = buildWorkPostes({
      breakdown: [category("c1", "A", 6000), category("c2", "B", 4000)],
      rows: [],
      articleSavings: [],
      totalSaving: 1000,
    });

    expect(postes[0].saving).toBeCloseTo(600, 6);
    expect(postes[1].saving).toBeCloseTo(400, 6);
    expect(postes.reduce((s, p) => s + p.saving, 0)).toBeCloseTo(1000, 6);
  });

  it("fait correspondre les désignations indépendamment de la casse et des accents", () => {
    const [poste] = buildWorkPostes({
      breakdown: [category("c1", "Gros œuvre", 5000, ["CIMENT CPJ 42.5"])],
      rows,
      articleSavings: [saving("Ciment CPJ 42.5", 120)],
      totalSaving: 120,
    });

    expect(poste.saving).toBeCloseTo(120, 6);
  });

  it("reste neutre sans données (aucun poste, aucune économie)", () => {
    expect(buildWorkPostes({ breakdown: [], rows: [], articleSavings: [], totalSaving: 0 })).toEqual(
      [],
    );
  });
});
