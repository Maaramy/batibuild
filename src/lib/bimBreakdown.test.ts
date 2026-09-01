import { describe, it, expect } from "vitest";
import { buildTtcBreakdown } from "./bimBreakdown";

// Grille fixe type (base 200 000 DT) + contingence 12 % (24 000) → TTC 224 000
const GRID = [
  { category: "gros_oeuvre", label: "Gros œuvre", estimatedCost: 80000, items: [] },
  { category: "second_oeuvre", label: "Second œuvre", estimatedCost: 50000, items: [] },
  { category: "equipements", label: "Équipements", estimatedCost: 30000, items: [] },
  { category: "main_oeuvre", label: "Main-d'œuvre", estimatedCost: 20000, items: [] },
  { category: "transport", label: "Transport", estimatedCost: 12000, items: [] },
  { category: "etudes_imprevus", label: "Études, permis & imprévus", estimatedCost: 8000, items: [] },
];

describe("buildTtcBreakdown — cohérence Répartition / Détail / Quantitatif", () => {
  it("somme des montants = coût total TTC exact (scénario standard)", () => {
    const items = buildTtcBreakdown(GRID, 224000);
    const sum = items.reduce((s, it) => s + it.estimatedCost, 0);
    expect(sum).toBe(224000);
  });

  it("ajoute la contingence (12 % du coût de base) en dernière ligne", () => {
    const items = buildTtcBreakdown(GRID, 224000);
    const last = items[items.length - 1];
    expect(last.category).toBe("contingence");
    expect(last.label).toBe("Imprévus & contingence");
    expect(last.estimatedCost).toBe(24000);
  });

  it("pourcentages calculés sur le TTC et somme = 100 exactement", () => {
    const items = buildTtcBreakdown(GRID, 224000);
    const pctSum = items.reduce((s, it) => s + it.pctTTC, 0);
    expect(pctSum).toBeCloseTo(100, 10);
    // 80 000 / 224 000 = 35,714… → 35,7 ; 24 000 / 224 000 = 10,714… → 10,7
    expect(items[0].pctTTC).toBe(35.7);
    expect(items[6].pctTTC).toBe(10.7);
  });

  it("chaque pourcentage reflète exactement montant / TTC", () => {
    const items = buildTtcBreakdown(GRID, 224000);
    for (const it of items.slice(0, -1)) {
      expect(it.pctTTC).toBe(Math.round((it.estimatedCost / 224000) * 1000) / 10);
    }
  });

  it("scénario non-standard : montants scalés + contingence = TTC du scénario", () => {
    // Économique : grille × 0,75 (150 000) + 12 % (18 000) → TTC 168 000
    const eco = GRID.map((c) => ({ ...c, estimatedCost: Math.round(c.estimatedCost * 0.75) }));
    const items = buildTtcBreakdown(eco, 168000);
    const sum = items.reduce((s, it) => s + it.estimatedCost, 0);
    expect(sum).toBe(168000);
    const pctSum = items.reduce((s, it) => s + it.pctTTC, 0);
    expect(pctSum).toBeCloseTo(100, 10);
    expect(items[items.length - 1].estimatedCost).toBe(18000);
  });

  it("absorbe l'écart d'arrondi dans la contingence (somme toujours exacte)", () => {
    // Catégories arrondies individuellement : somme 199 998 au lieu de 200 000
    const off = GRID.map((c, i) => ({
      ...c,
      estimatedCost: i === 0 ? c.estimatedCost - 2 : c.estimatedCost,
    }));
    const items = buildTtcBreakdown(off, 224000);
    const sum = items.reduce((s, it) => s + it.estimatedCost, 0);
    expect(sum).toBe(224000);
    expect(items[items.length - 1].estimatedCost).toBe(24002);
  });

  it("gère un breakdown vide (seule la contingence = total TTC)", () => {
    const items = buildTtcBreakdown([], 50000);
    expect(items).toHaveLength(1);
    expect(items[0].category).toBe("contingence");
    expect(items[0].estimatedCost).toBe(50000);
    expect(items[0].pctTTC).toBe(100);
  });
});
