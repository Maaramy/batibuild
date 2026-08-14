import { describe, expect, test } from "vitest";
import {
  cementBagsForVolume,
  concreteMixForVolume,
  bricksForWall,
  paintForSurface,
  tilesForSurface,
  roiForPurchase,
  detectCalculation,
  runCalculation,
  retrieveKnowledge,
  extractMemory,
} from "./copilotEngine";

describe("detectCalculation", () => {
  test("détecte le volume de béton (surface + épaisseur)", () => {
    const calc = detectCalculation("Combien de béton pour une dalle de 250 m² avec une épaisseur de 20 cm ?");
    expect(calc).not.toBeNull();
    expect(calc!.kind).toBe("concrete_volume");
    expect(calc!.surface).toBe(250);
    expect(calc!.thicknessCm).toBe(20);
  });

  test("détecte le volume de béton sans épaisseur (défaut 20 cm)", () => {
    const calc = detectCalculation("combien de beton pour une dalle de 100 m2");
    expect(calc).not.toBeNull();
    expect(calc!.kind).toBe("concrete_volume");
    expect(calc!.surface).toBe(100);
    expect(calc!.thicknessCm).toBe(20);
  });

  test("détecte les sacs de ciment pour un volume", () => {
    const calc = detectCalculation("il me faut combien de ciment pour 5 m3 de béton ?");
    expect(calc).not.toBeNull();
    expect(calc!.kind).toBe("cement_bags");
    expect(calc!.volumeM3).toBe(5);
  });

  test("détecte le prix au m²", () => {
    const calc = detectCalculation("480 000 TND pour 250 m², quel est le prix au m2 ?");
    expect(calc).not.toBeNull();
    expect(calc!.kind).toBe("price_per_m2");
    expect(calc!.totalCost).toBe(480000);
    expect(calc!.surface).toBe(250);
  });

  test("détecte le mur en parpaings (2 dimensions)", () => {
    const calc = detectCalculation("combien de parpaings pour un mur de 12 m sur 3 m ?");
    expect(calc).not.toBeNull();
    expect(calc!.kind).toBe("bricks_wall");
    expect(calc!.length).toBe(12);
    expect(calc!.height).toBe(3);
  });

  test("détecte la peinture", () => {
    const calc = detectCalculation("combien de peinture pour 120 m² en 2 couches ?");
    expect(calc).not.toBeNull();
    expect(calc!.kind).toBe("paint_quantity");
    expect(calc!.surface).toBe(120);
    expect(calc!.coats).toBe(2);
  });

  test("détecte le ROI", () => {
    const calc = detectCalculation("est-ce un bon investissement à 480 000 TND avec un loyer de 2 500 TND par mois ?");
    expect(calc).not.toBeNull();
    expect(calc!.kind).toBe("roi");
    expect(calc!.totalCost).toBe(480000);
    expect(calc!.monthlyRent).toBe(2500);
  });

  test("ne détecte pas un message sans calcul", () => {
    expect(detectCalculation("quel isolant choisir pour ma villa ?")).toBeNull();
  });
});

describe("runCalculation", () => {
  test("volume de béton — dalle 250 m² × 20 cm = 50 m³", () => {
    const calc = detectCalculation("Combien de béton pour une dalle de 250 m² avec une épaisseur de 20 cm ?");
    const res = runCalculation(calc!);
    expect(res.summary).toContain("50 m³");
    // 50 m³ × 350 kg/m³ ÷ 50 kg = 350 sacs
    expect(res.values.find((v) => v.label === "Ciment")!.value).toContain("350");
  });

  test("prix au m² — 480 000 TND / 250 m² = 1 920 TND/m²", () => {
    const calc = detectCalculation("480 000 TND pour 250 m², quel est le prix au m2 ?");
    const res = runCalculation(calc!);
    // toLocaleString("fr-FR") peut utiliser un espace fine insécable (U+202F)
    const normalized = res.summary.replace(/[\u00A0\u202F]/g, " ");
    expect(normalized).toContain("1 920 TND");
  });

  test("mur en parpaings 12×3 = 36 m² × 12,5 = 450", () => {
    const calc = detectCalculation("combien de parpaings pour un mur de 12 m sur 3 m ?");
    const res = runCalculation(calc!);
    expect(res.values.find((v) => v.label === "Unités")!.value).toBe("450");
  });

  test("cementBagsForVolume — 5 m³ à 350 kg/m³ → 35 sacs", () => {
    expect(cementBagsForVolume(5, 350)).toBe(35);
  });

  test("concreteMixForVolume — 1 m³ → 7 sacs, 0,4 m³ sable, 0,8 m³ gravier", () => {
    const mix = concreteMixForVolume(1, 350);
    expect(mix.cementBags).toBe(7);
    expect(mix.sandM3).toBeCloseTo(0.4);
    expect(mix.gravelM3).toBeCloseTo(0.8);
  });

  test("paintForSurface — 120 m² × 2 couches → 24 L", () => {
    expect(paintForSurface(120, 2).liters).toBeCloseTo(24);
  });

  test("tilesForSurface — 100 m² pose droite → 105 m²", () => {
    expect(tilesForSurface(100, false).totalM2).toBeCloseTo(105);
  });

  test("roiForPurchase — 480 000, loyer 2 500, charges 3 600/an", () => {
    const r = roiForPurchase(480000, 2500, 3600);
    expect(r.netYield).toBeCloseTo((2500 * 12 - 3600) / 480000 * 100, 1);
    expect(r.paybackYears).toBeCloseTo(480000 / (2500 * 12 - 3600), 1);
  });

  test("bricksForWall — 12×3 m parpaing 20 → 450 u", () => {
    expect(bricksForWall(12, 3, "parpaing20").units).toBe(450);
  });
});

describe("retrieveKnowledge", () => {
  const kb = [
    { topic: "Isolation thermique", keywords: ["isolation", "polystyrene", "laine"], content: "Le PSE est le plus courant en Tunisie." },
    { topic: "Béton armé", keywords: ["beton", "dalle", "dosage"], content: "Dosage 350 kg/m³." },
    { topic: "Peinture", keywords: ["peinture", "enduit"], content: "Rendement 10 m²/L." },
  ];

  test("retrouve l'isolant pour une question isolation", () => {
    const results = retrieveKnowledge("quel isolant choisir ? polystyrene ou laine", kb, 1);
    expect(results[0].topic).toBe("Isolation thermique");
  });

  test("retrouve le béton pour une question dalle", () => {
    const results = retrieveKnowledge("combien de béton pour ma dalle ?", kb, 1);
    expect(results[0].topic).toBe("Béton armé");
  });

  test("ne retourne rien sans correspondance", () => {
    expect(retrieveKnowledge("zzzz rien à voir", kb)).toHaveLength(0);
  });
});

describe("extractMemory", () => {
  test("détecte une décision « je choisis »", () => {
    const mem = extractMemory("je choisis le polystyrène expansé 6 cm pour l'isolation");
    expect(mem).not.toBeNull();
    expect(mem!.category).toBe("isolation");
    expect(mem!.content).toContain("polystyrène");
  });

  test("détecte « on garde »", () => {
    const mem = extractMemory("on garde la solution d'isolation que nous avons choisie");
    expect(mem).not.toBeNull();
    expect(mem!.category).toBe("isolation");
  });

  test("retourne null sans décision", () => {
    expect(extractMemory("quel est le prix du ciment ?")).toBeNull();
  });
});
