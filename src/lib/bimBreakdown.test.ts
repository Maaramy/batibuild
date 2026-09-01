import { describe, it, expect } from "vitest";
import { computeBreakdownPct } from "./bimBreakdown";

// Lots du « Quantitatif détaillé » (sous-totaux scalés sur le scénario)
const LOTS = [
  { label: "Gros œuvre (fondations, structures)", amount: 89600 },
  { label: "Second œuvre et finitions", amount: 67200 },
  { label: "Main-d'œuvre", amount: 33600 },
  { label: "Équipements", amount: 22400 },
  { label: "Frais Préliminaires et Études", amount: 11200 },
];

describe("computeBreakdownPct — Répartition / Détail = Quantitatif détaillé", () => {
  it("pourcentages recalculés depuis les montants des lots (somme = 100)", () => {
    const items = computeBreakdownPct(LOTS);
    const sum = items.reduce((s, it) => s + it.pct, 0);
    expect(sum).toBeCloseTo(100, 10);
    // 89 600 / 224 000 = 40 % ; 11 200 / 224 000 = 5 %
    expect(items[0].pct).toBe(40);
    expect(items[4].pct).toBe(5);
  });

  it("montants conservés à l'identique (mêmes prix que le quantitatif)", () => {
    const items = computeBreakdownPct(LOTS);
    items.forEach((it, i) => {
      expect(it.amount).toBe(LOTS[i].amount);
      expect(it.label).toBe(LOTS[i].label);
    });
  });

  it("la dernière ligne absorbe l'écart d'arrondi (somme exacte)", () => {
    const items = computeBreakdownPct([
      { label: "A", amount: 1 },
      { label: "B", amount: 1 },
      { label: "C", amount: 1 },
    ]);
    // 33,3 + 33,3 + 33,4 = 100
    expect(items.map((i) => i.pct)).toEqual([33.3, 33.3, 33.4]);
    expect(items.reduce((s, i) => s + i.pct, 0)).toBe(100);
  });

  it("chaque pourcentage reflète montant / total (à 0,1 près)", () => {
    const items = computeBreakdownPct(LOTS);
    const total = LOTS.reduce((s, l) => s + l.amount, 0);
    for (const it of items.slice(0, -1)) {
      expect(it.pct).toBe(Math.round((it.amount / total) * 1000) / 10);
    }
  });

  it("liste vide → résultat vide", () => {
    expect(computeBreakdownPct([])).toEqual([]);
  });
});
