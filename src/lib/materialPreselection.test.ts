import { describe, it, expect } from "vitest";
import {
  materialValue,
  preselectMaterials,
  priceScore,
  qualityScore,
  PRIORITY_OPTIONS,
} from "./materialPreselection";

const CATS = [
  {
    id: "ciment",
    materials: [
      { id: "c-cheap", unitPrice: 10, confidenceIndex: 0.5 },
      { id: "c-mid", unitPrice: 15, confidenceIndex: 0.7, priceQuality: "publication_2026" },
      { id: "c-prem", unitPrice: 25, confidenceIndex: 0.95, priceQuality: "observé_en_ligne" },
    ],
  },
  { id: "piscine", materials: [] },
];

describe("qualityScore", () => {
  it("combine l'indice de confiance et la source de prix", () => {
    expect(qualityScore({ id: "a", unitPrice: 10, confidenceIndex: 0.5 })).toBe(50);
    expect(qualityScore({ id: "b", unitPrice: 10, confidenceIndex: 0.5, priceQuality: "observé_en_ligne" })).toBe(56);
    expect(qualityScore({ id: "c", unitPrice: 10 })).toBe(50);
  });
});

describe("priceScore", () => {
  it("donne 100 au moins cher et 0 au plus cher", () => {
    expect(priceScore(10, 10, 20)).toBe(100);
    expect(priceScore(20, 10, 20)).toBe(0);
    expect(priceScore(15, 10, 20)).toBe(50);
  });

  it("retourne un score neutre sans écart de prix", () => {
    expect(priceScore(15, 15, 15)).toBe(70);
  });
});

describe("materialValue", () => {
  it("favorise le prix avec la priorité « prix »", () => {
    const cheap = materialValue({ id: "a", unitPrice: 10 }, "prix", 10, 20);
    const pricey = materialValue({ id: "b", unitPrice: 20 }, "prix", 10, 20);
    expect(cheap).toBeGreaterThan(pricey);
  });
});

describe("preselectMaterials", () => {
  it("retient les meilleurs rapports prix/qualité par catégorie", () => {
    const res = preselectMaterials({ categories: CATS, priority: "equilibre" });
    expect(res.materialIds.length).toBeGreaterThan(0);
    expect(res.materialIds.length).toBeLessThan(3);
    expect(res.categoryIds).toEqual(["ciment"]);
    expect(res.reason).toContain("Pré-sélection prix / qualité");
  });

  it("garantit au moins un matériau par catégorie et ignore les vides", () => {
    const res = preselectMaterials({
      categories: [{ id: "x", materials: [{ id: "only", unitPrice: 12 }] }],
    });
    expect(res.materialIds).toEqual(["only"]);
    expect(res.categoryIds).toEqual(["x"]);
  });

  it("retourne un résultat vide sans matériau", () => {
    const res = preselectMaterials({ categories: [{ id: "piscine", materials: [] }] });
    expect(res.materialIds).toEqual([]);
    expect(res.reason).toContain("Aucun matériau");
  });

  it("expose trois priorités", () => {
    expect(PRIORITY_OPTIONS.map((o) => o.value)).toEqual(["prix", "equilibre", "qualite"]);
  });
});
