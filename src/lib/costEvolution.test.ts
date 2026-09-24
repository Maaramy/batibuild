import { describe, expect, it } from "vitest";
import {
  COST_EVOLUTION_MAX_POINTS,
  compactCostEvolutionLabel,
  compactCostValue,
  costEvolutionDeltaPct,
  sampleCostEvolutionPoints,
  type CostEvolutionPoint,
} from "./costEvolution";

/** Même forme que la sortie du moteur : aujourd'hui + 24 mois. */
const series = (months = 24): CostEvolutionPoint[] =>
  Array.from({ length: months + 1 }, (_, m) => ({
    label: m === 0 ? "Aujourd'hui" : `M+${m}`,
    cost: 500_000 * Math.pow(1.005, m),
  }));

describe("sampleCostEvolutionPoints", () => {
  it("garde tous les points si la série est déjà courte", () => {
    const points = series(6);
    expect(sampleCostEvolutionPoints(points, 13)).toBe(points);
    expect(sampleCostEvolutionPoints([], 13)).toEqual([]);
    expect(sampleCostEvolutionPoints(series(0), 13)).toHaveLength(1);
  });

  it("échantillonne 24 mois en 13 colonnes, premier et dernier conservés", () => {
    const points = series(24);
    const shown = sampleCostEvolutionPoints(points);
    expect(shown).toHaveLength(COST_EVOLUTION_MAX_POINTS);
    expect(shown[0]).toEqual(points[0]);
    expect(shown[shown.length - 1]).toEqual(points[24]);
    // Pas uniforme : M+0, M+2, M+4 … M+24
    expect(shown.map((p) => p.label)).toEqual([
      "Aujourd'hui",
      "M+2",
      "M+4",
      "M+6",
      "M+8",
      "M+10",
      "M+12",
      "M+14",
      "M+16",
      "M+18",
      "M+20",
      "M+22",
      "M+24",
    ]);
  });

  it("les colonnes affichées sur mobile (une sur deux) restent uniformes", () => {
    const shown = sampleCostEvolutionPoints(series(24));
    const mobile = shown.filter((_, i) => i % 2 === 0);
    expect(mobile.map((p) => p.label)).toEqual([
      "Aujourd'hui",
      "M+4",
      "M+8",
      "M+12",
      "M+16",
      "M+20",
      "M+24",
    ]);
  });

  it("ne dépasse jamais le maximum demandé, quelle que soit la longueur", () => {
    for (const months of [1, 2, 5, 12, 19, 24, 25, 36, 60]) {
      for (const max of [2, 3, 7, 13]) {
        const shown = sampleCostEvolutionPoints(series(months), max);
        expect(shown.length).toBeLessThanOrEqual(max);
        expect(shown[0]).toEqual(series(months)[0]);
        expect(shown[shown.length - 1]).toEqual(series(months)[months]);
      }
    }
  });

  it("ne mute pas la série d'origine", () => {
    const points = series(24);
    const snapshot = points.map((p) => ({ ...p }));
    sampleCostEvolutionPoints(points);
    expect(points).toEqual(snapshot);
  });
});

describe("costEvolutionDeltaPct", () => {
  it("calcule la variation depuis le premier point", () => {
    const points = series(24);
    expect(costEvolutionDeltaPct(points, 0)).toBeNull();
    const delta = costEvolutionDeltaPct(points, 24);
    expect(delta).not.toBeNull();
    expect(delta!).toBeGreaterThan(10);
    expect(delta!).toBeLessThan(15);
  });

  it("gère les cas limites sans référence exploitable", () => {
    expect(costEvolutionDeltaPct([], 1)).toBeNull();
    expect(costEvolutionDeltaPct([{ label: "Aujourd'hui", cost: 0 }], 1)).toBeNull();
    expect(
      costEvolutionDeltaPct(
        [
          { label: "Aujourd'hui", cost: 0 },
          { label: "M+1", cost: 100 },
        ],
        1,
      ),
    ).toBeNull();
    expect(
      costEvolutionDeltaPct([{ label: "Aujourd'hui", cost: 100 }], 5),
    ).toBeNull();
  });

  it("accepte une variation négative (baisse des coûts)", () => {
    const points: CostEvolutionPoint[] = [
      { label: "Aujourd'hui", cost: 200 },
      { label: "M+1", cost: 150 },
    ];
    expect(costEvolutionDeltaPct(points, 1)).toBeCloseTo(-25, 5);
  });
});

describe("compactCostEvolutionLabel", () => {
  it("raccourcit uniquement le point de référence", () => {
    expect(compactCostEvolutionLabel("Aujourd'hui")).toBe("Auj.");
    expect(compactCostEvolutionLabel("M+4")).toBe("M+4");
    expect(compactCostEvolutionLabel("")).toBe("");
  });
});

describe("compactCostValue", () => {
  it("abrège les milliers en k", () => {
    expect(compactCostValue(561_200)).toBe("561 k");
    expect(compactCostValue(1000)).toBe("1 k");
  });

  it("reste lisible sous 1 000 et sur valeur non finie", () => {
    expect(compactCostValue(940)).toBe("940");
    expect(compactCostValue(Number.NaN)).toBe("—");
  });
});
