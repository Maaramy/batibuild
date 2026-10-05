import { describe, it, expect } from "vitest";

import type { MaterialLine } from "@/convex/materialSelectionEngine";
import {
  buildMaterialIntelligence,
  buildPriceListIndex,
  matchPriceListRow,
  MATERIAL_INSUFFICIENT_DATA_MESSAGE,
  MATERIAL_NOT_FOUND_MESSAGE,
  normalizeMaterialName,
  type CategoryTrendRow,
  type MaterialTrendRow,
  type PriceListRow,
} from "./materialIntelligence";

const DAY = 86_400_000;

function mkLine(over: Partial<MaterialLine> = {}): MaterialLine {
  const quantity = over.quantity ?? 2850;
  const unitPrice = over.unitPrice ?? 3.2;
  return {
    articleId: "lot_acier::0",
    lotId: "lot_acier",
    lotName: "Acier",
    category: "acier_metaux_structure",
    designation: "Acier HA 12",
    unit: "kg",
    quantity,
    unitPrice,
    total: over.total ?? quantity * unitPrice,
    scenario: "standard",
    quality: "standard",
    nature: "materiaux",
    isMaterial: true,
    priceAvailable: true,
    qualityAvailable: true,
    source: "quantitatif_detaille",
    ...over,
  };
}

const PRICE_LIST: PriceListRow[] = [
  {
    _id: "pl_acier",
    name: "Acier HA 12",
    category: "acier_metaux_structure",
    subcategory: "barre",
    unit: "kg",
    unitPrice: 3.2,
    sku: "MAT-9001",
    availability: "disponible",
    priceQuality: "observé_en_ligne",
    confidenceIndex: 0.9,
    minPrice: 3.0,
    avgPrice: 3.2,
    maxPrice: 3.5,
    lastUpdated: DAY * 100,
  },
  {
    _id: "pl_ciment",
    name: "Ciment CPJ 42.5 (sac 50 kg)",
    category: "liants_ciments_mortiers",
    unit: "sac",
    unitPrice: 14.5,
    sku: "MAT-0001",
    availability: "sur_commande",
    confidenceIndex: 0.7,
    minPrice: 14,
    avgPrice: 14.5,
    maxPrice: 15.2,
  },
];

const history = (materialPriceId: string, changes: number, netPct: number): MaterialTrendRow => ({
  materialPriceId,
  changes,
  netPct,
  firstChangedAt: DAY * 100,
  lastChangedAt: DAY * 130,
});

describe("correspondance avec la Liste des prix", () => {
  it("normalise les désignations (accents, casse, ponctuation)", () => {
    expect(normalizeMaterialName("Ciment CPJ 42.5 (sac 50 kg)")).toBe("ciment cpj 42 5 sac 50 kg");
    expect(normalizeMaterialName(null)).toBe("");
  });

  it("retrouve une correspondance par nom exact puis par SKU", () => {
    const index = buildPriceListIndex(PRICE_LIST);
    expect(matchPriceListRow({ designation: "Ciment CPJ 42.5 (sac 50 kg)", materialId: "cat:x" }, index)?._id).toBe(
      "pl_ciment",
    );
    expect(matchPriceListRow({ designation: "Réf inconnue", materialId: "MAT-9001" }, index)?._id).toBe(
      "pl_acier",
    );
  });

  it("ne force aucune correspondance hasardeuse", () => {
    const index = buildPriceListIndex(PRICE_LIST);
    expect(matchPriceListRow({ designation: "Panneau solaire 350W", materialId: "cat:y" }, index)).toBeNull();
  });
});

describe("buildMaterialIntelligence — analyse matériau par matériau", () => {
  it("produit une fiche par matériau avec tendance PROPRE et impact financier", () => {
    const result = buildMaterialIntelligence({
      lines: [mkLine()],
      priceList: PRICE_LIST,
      materialTrends: [history("pl_acier", 6, 6)],
      scenario: "standard",
      materialsBudget: 50_000,
      projectTotal: 100_000,
    });

    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    expect(row.found).toBe(true);
    expect(row.basis).toBe("historique");
    expect(row.materialSpecific).toBe(true);
    expect(row.trend).toBe("hausse");
    expect(row.trendPct).toBe(6);
    // Prix courant = celui de la Liste des prix (référence commerciale).
    expect(row.currentUnitPrice).toBe(3.2);
    expect(row.currentTotal).toBe(9120);
    // Impact = quantité × prix actuel × variation.
    expect(row.impactAmount).toBeCloseTo(547.2, 1);
    expect(row.forecastLow).not.toBeNull();
    expect(row.forecastHigh).not.toBeNull();
    expect(row.forecastLow!).toBeLessThan(row.forecastHigh!);
    expect(row.riskScore).toBeGreaterThan(50);
    expect(row.priorityScore).toBeGreaterThan(0);
    expect(row.recommendation).not.toBe(MATERIAL_NOT_FOUND_MESSAGE);
  });

  it("affiche « Matériau non trouvé dans la Liste des prix » sans invention de prix", () => {
    const result = buildMaterialIntelligence({
      lines: [mkLine({ designation: "Panneau solaire 350W", category: "energies_renouvelables" })],
      priceList: PRICE_LIST,
      materialTrends: [history("pl_acier", 6, 6)],
      scenario: "standard",
      materialsBudget: 50_000,
      projectTotal: 100_000,
    });
    const row = result.rows[0];
    expect(row.found).toBe(false);
    expect(row.priceListUnitPrice).toBeNull();
    expect(row.forecastMessage).toBe(MATERIAL_NOT_FOUND_MESSAGE);
    expect(row.recommendation).toBe(MATERIAL_NOT_FOUND_MESSAGE);
    expect(row.riskScore).toBeLessThanOrEqual(45);
  });

  it("n'invente aucune prévision sans donnée exploitable pour ce matériau", () => {
    const result = buildMaterialIntelligence({
      lines: [mkLine()],
      priceList: PRICE_LIST,
      materialTrends: [],
      categoryTrends: [],
      variants: null,
      scenario: "standard",
      materialsBudget: 50_000,
      projectTotal: 100_000,
    });
    const row = result.rows[0];
    expect(row.basis).toBeNull();
    expect(row.trend).toBe("stable");
    expect(row.forecastLow).toBeNull();
    expect(row.forecastMessage).toBe(MATERIAL_INSUFFICIENT_DATA_MESSAGE);
    expect(row.dataQuality.forecast).toBe(false);
  });

  it("signale explicitement une prévision issue du contexte de catégorie (non spécifique)", () => {
    const categoryTrends: CategoryTrendRow[] = [
      { category: "acier_metaux_structure", changes: 10, netPct: 4 },
    ];
    const result = buildMaterialIntelligence({
      lines: [mkLine()],
      priceList: PRICE_LIST,
      materialTrends: [],
      categoryTrends,
      scenario: "standard",
      materialsBudget: 50_000,
      projectTotal: 100_000,
    });
    const row = result.rows[0];
    expect(row.basis).toBe("historique");
    expect(row.materialSpecific).toBe(false);
    expect(row.basisLabel).toContain("Contexte marché");
    expect(row.trend).toBe("hausse");
  });

  it("classe les matériaux par priorité et agrège les indicateurs du projet", () => {
    const lines = [
      mkLine(),
      mkLine({
        articleId: "lot_ciment::0",
        category: "liants_ciments_mortiers",
        designation: "Ciment CPJ 42.5 (sac 50 kg)",
        unit: "sac",
        quantity: 1200,
        unitPrice: 14.5,
      }),
    ];
    const result = buildMaterialIntelligence({
      lines,
      priceList: PRICE_LIST,
      materialTrends: [history("pl_acier", 8, 6), history("pl_ciment", 4, 2.5)],
      scenario: "standard",
      materialsBudget: 50_000,
      projectTotal: 100_000,
    });

    expect(result.aggregate.analyzed).toBe(2);
    expect(result.aggregate.notFound).toBe(0);
    expect(result.aggregate.rising).toBe(2);
    expect(result.aggregate.globalScore).toBeGreaterThanOrEqual(0);
    expect(result.aggregate.globalScore).toBeLessThanOrEqual(100);
    expect(result.aggregate.totalExposure).toBeGreaterThan(0);
    // L'acier (impact le plus élevé) doit être prioritaire sur le ciment.
    const acier = result.rows.find((r) => r.articleId === "lot_acier::0")!;
    const ciment = result.rows.find((r) => r.articleId === "lot_ciment::0")!;
    expect(acier.priorityScore).toBeGreaterThan(ciment.priorityScore);
    // Agrégation = somme des analyses individuelles.
    expect(result.aggregate.totalCurrent).toBeCloseTo(acier.currentTotal + ciment.currentTotal, 1);
    // §11 — classement « Matériaux à surveiller » par score de surveillance.
    expect(acier.watchScore).toBeGreaterThan(0);
    expect(acier.watchScore).toBeLessThanOrEqual(100);
    expect(acier.watchScore).toBeGreaterThan(ciment.watchScore);
    // §13 — agrégats disponibles pour l'aide à la décision.
    for (const r of result.rows) {
      expect(r.watchScore).toBeGreaterThanOrEqual(0);
      expect(r.watchScore).toBeLessThanOrEqual(100);
    }
    expect(result.aggregate.totalLoss).toBeGreaterThanOrEqual(0);
    expect(result.aggregate.priceRiskScore).toBeLessThanOrEqual(100);
    expect(result.aggregate.antiWasteScore).toBeLessThanOrEqual(100);
  });
});
