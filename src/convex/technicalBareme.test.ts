import { describe, expect, it } from "vitest";

import { generateDqe } from "./dqeEngine";
import { MARKET_PRICE_M2, REGION_COST_M2 } from "./bimEngine";
import {
  ELECTRICITY_BAREME_M2,
  ELECTRICITY_LABOR_M2,
  PAINT_BUCKET_LITERS,
  PLUMBING_BAREME_M2,
  PLUMBING_LABOR_M2,
  paintAllInPerBucket,
} from "../lib/technicalBareme";
import { REFERENCE_REGION, regionCostFactor } from "../lib/regionImpact";

// ============================================================================
// BARÈME TECHNIQUE 2026 — PEINTURE · PLOMBERIE · ÉLECTRICITÉ
// ----------------------------------------------------------------------------
// Projet de référence : maison de 100 m² de surface construite (RDC), budget
// TTC 198 000 TND (grille Tunis standard 2026).
// Vérifie que :
//   • la peinture intérieure consomme 18 seaux de 20 L / 100 m², l'extérieure 12 ;
//   • plomberie 94 DT/m² et électricité 72 DT/m² (Standard), soit 9 400 et
//     7 200 TND TTC pour 100 m² construits ;
//   • la main-d'œuvre correspondante est portée par chaque poste, affichée mais
//     comptée UNE seule fois ;
//   • le total du Second œuvre = somme réelle de ses postes ;
//   • les autres lots ne bougent pas d'un dinar.
// ============================================================================

const BUDGET = 198_000;
const iso = generateDqe({
  category: "maison",
  surface: 100,
  floors: 1,
  totalBudget: BUDGET,
});
const secondOeuvre = iso.lots.find((l) => l.id === "second_oeuvre")!;
const line = (designation: string) => {
  const found = secondOeuvre.lines.find((l) => l.designation === designation);
  if (!found) throw new Error(`Poste introuvable : ${designation}`);
  return found;
};

describe("barème peinture — seaux de 20 L (100 m² construits)", () => {
  it("peinture intérieure : 18 seaux de 20 L et la main-d'œuvre correspondante", () => {
    const paint = line("Peinture intérieure (3 couches, finition standard)");
    expect(paint.unit).toBe(`seau ${PAINT_BUCKET_LITERS} L`);
    expect(paint.quantity).toBe(18);
    expect(paint.unitPrice).toBeGreaterThan(0);
    expect(paint.labor).toBeDefined();
    // 250 m² de murs / plafonds peints × 4 DT/m² = 1 000 DT, inclus dans le poste.
    expect(paint.labor!.label).toContain("Peinture intérieure");
    // Main-d'œuvre facturée au lot : 1 lot, prix = montant du lot.
    expect(paint.labor!.quantity).toBe(1);
    expect(paint.labor!.unit).toBe("lot");
    expect(paint.labor!.unitPrice).toBe(1_000);
    expect(paint.labor!.total).toBe(1_000);
    // La base du barème reste enregistrée pour audit.
    expect(paint.labor!.referenceQuantity).toBe(250);
    expect(paint.labor!.referenceUnit).toBe("m²");
    expect(paint.labor!.referenceUnitPrice).toBe(4);
    // La main-d'œuvre est INCLUSE : elle est inférieure au montant du poste.
    expect(paint.labor!.total).toBeLessThan(paint.total);
  });

  it("peinture extérieure : 12 seaux de 20 L et la main-d'œuvre correspondante", () => {
    const paint = line("Peinture extérieure (façade, monocouche acrylique)");
    expect(paint.unit).toBe(`seau ${PAINT_BUCKET_LITERS} L`);
    expect(paint.quantity).toBe(12);
    expect(paint.labor).toBeDefined();
    // 80 m² de façade × 5 DT/m² = 400 DT, inclus dans le poste.
    expect(paint.labor!.quantity).toBe(1);
    expect(paint.labor!.unit).toBe("lot");
    expect(paint.labor!.unitPrice).toBe(400);
    expect(paint.labor!.referenceQuantity).toBe(80);
    expect(paint.labor!.referenceUnitPrice).toBe(5);
    expect(paint.labor!.total).toBe(400);
    expect(paint.labor!.total).toBeLessThan(paint.total);
  });

  it("les quantités de peinture suivent la surface construite", () => {
    const double = generateDqe({
      category: "maison",
      surface: 200,
      floors: 1,
      totalBudget: BUDGET * 2,
    });
    const so = double.lots.find((l) => l.id === "second_oeuvre")!;
    const int = so.lines.find((l) =>
      l.designation.startsWith("Peinture intérieure"),
    )!;
    const ext = so.lines.find((l) =>
      l.designation.startsWith("Peinture extérieure"),
    )!;
    expect(int.quantity).toBe(36);
    expect(ext.quantity).toBe(24);
    expect(int.labor!.quantity).toBe(1);
    expect(int.labor!.referenceQuantity).toBe(500);
  });
});

describe("barème plomberie et électricité — DT/m² de surface construite", () => {
  it("plomberie complète : 94 DT/m² (Standard) et main-d'œuvre de 35 DT/m²", () => {
    const plumbing = line("Plomberie sanitaire");
    expect(plumbing.unit).toBe("m²");
    expect(plumbing.quantity).toBe(100);
    expect(plumbing.unitPrice).toBe(PLUMBING_BAREME_M2.standard);
    expect(plumbing.total).toBe(9_400);
    expect(plumbing.labor).toBeDefined();
    expect(plumbing.labor!.quantity).toBe(1);
    expect(plumbing.labor!.unit).toBe("lot");
    expect(plumbing.labor!.unitPrice).toBe(3_500);
    expect(plumbing.labor!.referenceQuantity).toBe(100);
    expect(plumbing.labor!.referenceUnitPrice).toBe(PLUMBING_LABOR_M2.standard);
    expect(plumbing.labor!.total).toBe(3_500);
    expect(plumbing.labor!.total).toBeLessThan(plumbing.total);
  });

  it("électricité complète : 72 DT/m² (Standard) et main-d'œuvre de 25 DT/m²", () => {
    const electricity = line("Électricité");
    expect(electricity.unit).toBe("m²");
    expect(electricity.quantity).toBe(100);
    expect(electricity.unitPrice).toBe(ELECTRICITY_BAREME_M2.standard);
    expect(electricity.total).toBe(7_200);
    expect(electricity.labor).toBeDefined();
    expect(electricity.labor!.quantity).toBe(1);
    expect(electricity.labor!.unit).toBe("lot");
    expect(electricity.labor!.unitPrice).toBe(2_500);
    expect(electricity.labor!.referenceUnitPrice).toBe(ELECTRICITY_LABOR_M2.standard);
    expect(electricity.labor!.total).toBe(2_500);
    expect(electricity.labor!.total).toBeLessThan(electricity.total);
  });

  it("le barème « type de projet » reprend exactement les mêmes valeurs", () => {
    expect(MARKET_PRICE_M2.plomberie_complete).toEqual({
      eco: PLUMBING_BAREME_M2.economique,
      std: PLUMBING_BAREME_M2.standard,
      premium: PLUMBING_BAREME_M2.premium,
    });
    expect(MARKET_PRICE_M2.electricite_complete).toEqual({
      eco: ELECTRICITY_BAREME_M2.economique,
      std: ELECTRICITY_BAREME_M2.standard,
      premium: ELECTRICITY_BAREME_M2.premium,
    });
    expect(PLUMBING_BAREME_M2).toEqual({ economique: 60, standard: 94, premium: 115 });
    expect(ELECTRICITY_BAREME_M2).toEqual({ economique: 35, standard: 72, premium: 100 });
  });
});

describe("impact régional du barème dans le Quantitatif détaillé", () => {
  // Grille régionale 2026 : Médenine 1 800 DT/m² (base 100 %), Tunis 1 980.
  const tunisFactor = regionCostFactor(REGION_COST_M2, "tunis", "standard");
  const tunis = generateDqe({
    category: "maison",
    surface: 100,
    floors: 1,
    totalBudget: BUDGET,
    regionFactor: tunisFactor,
  });
  const soTunis = tunis.lots.find((l) => l.id === "second_oeuvre")!;
  const tunisLine = (designation: string) => {
    const found = soTunis.lines.find((l) => l.designation === designation);
    if (!found) throw new Error(`Poste introuvable : ${designation}`);
    return found;
  };

  it("Médenine est la base nationale : coefficient 1 et aucun prix modifié", () => {
    expect(regionCostFactor(REGION_COST_M2, REFERENCE_REGION, "standard")).toBe(1);
    const medenine = generateDqe({
      category: "maison",
      surface: 100,
      floors: 1,
      totalBudget: BUDGET,
      regionFactor: 1,
    });
    const so = medenine.lots.find((l) => l.id === "second_oeuvre")!;
    expect(so.lines).toEqual(secondOeuvre.lines);
  });

  it("Tunis ×1,10 : peinture intérieure et extérieure suivent la grille régionale", () => {
    expect(tunisFactor).toBe(1.1);
    const paintInt = tunisLine("Peinture intérieure (3 couches, finition standard)");
    const paintExt = tunisLine("Peinture extérieure (façade, monocouche acrylique)");

    // Quantités inchangées : seul le prix régional du seau change.
    expect(paintInt.quantity).toBe(18);
    expect(paintExt.quantity).toBe(12);
    expect(paintInt.unitPrice).toBe(178.82);
    expect(paintInt.unitPrice).toBeCloseTo(
      paintAllInPerBucket("interieure") * tunisFactor,
      2,
    );
    expect(paintExt.unitPrice).toBeCloseTo(
      paintAllInPerBucket("exterieure") * tunisFactor,
      2,
    );
    // La main-d'œuvre incluse suit le même coefficient (4 → 4,40 · 5 → 5,50) :
    // le montant du lot et la base de référence sont tous deux actualisés.
    expect(paintInt.labor!.unitPrice).toBe(1_100);
    expect(paintInt.labor!.referenceUnitPrice).toBe(4.4);
    expect(paintInt.labor!.total).toBe(1_100);
    expect(paintExt.labor!.unitPrice).toBe(440);
    expect(paintExt.labor!.referenceUnitPrice).toBe(5.5);
    expect(paintExt.labor!.total).toBe(440);
    // La description du poste reste factuelle : ni mention de la main-d'œuvre
    // incluse, ni note de coefficient régional (le prix régional parle seul).
    expect(paintInt.description).toBe(
      "18 seaux de 20 L pour 100 m² construits (sous-couche + 2 couches).",
    );
    expect(paintInt.description).not.toContain("main-d'œuvre");
    expect(paintInt.description).not.toContain("Coefficient régional");
  });

  it("Tunis ×1,10 : plomberie 94 → 103,40 et électricité 72 → 79,20 DT/m²", () => {
    const plumbing = tunisLine("Plomberie sanitaire");
    expect(plumbing.quantity).toBe(100);
    expect(plumbing.unitPrice).toBe(103.4);
    expect(plumbing.total).toBe(10_340);
    expect(plumbing.labor!.unitPrice).toBe(3_850);
    expect(plumbing.labor!.referenceUnitPrice).toBe(38.5);
    expect(plumbing.labor!.total).toBe(3_850);

    const electricity = tunisLine("Électricité");
    expect(electricity.quantity).toBe(100);
    expect(electricity.unitPrice).toBe(79.2);
    expect(electricity.total).toBe(7_920);
    expect(electricity.labor!.unitPrice).toBe(2_750);
    expect(electricity.labor!.referenceUnitPrice).toBe(27.5);
    expect(electricity.labor!.total).toBe(2_750);

    // Descriptions factuelles : plus de mention « main-d'œuvre incluse » ni de
    // note de coefficient régional sur ces deux postes au m².
    expect(plumbing.description).toBe(
      "Installation complète (alimentation, évacuation, chauffe-eau, appareils inclus).",
    );
    expect(electricity.description).toBe(
      "Installation complète (tableaux, prises, interrupteurs, luminaires basiques).",
    );
    for (const line of [plumbing, electricity]) {
      expect(line.description).not.toContain("main-d'œuvre");
      expect(line.description).not.toContain("Coefficient régional");
      expect(line.description).not.toContain("prix au m²");
    }
  });

  it("seul le Second œuvre porte l'écart : les autres lots restent au budget alloué", () => {
    for (const lot of tunis.lots) {
      const allocated = lot.allocatedSubtotal ?? lot.subtotal;
      if (lot.id !== "second_oeuvre") {
        expect(lot.subtotal, lot.name).toBe(allocated);
      }
      expect(lot.subtotal, lot.name).toBe(
        lot.lines.reduce((s, l) => s + l.total, 0),
      );
    }
    const delta = soTunis.subtotal - (soTunis.allocatedSubtotal ?? 0);
    expect(tunis.totals.total).toBe(BUDGET + delta);
    // Le total régional est supérieur au total de Médenine : le barème suit
    // bien la région, sans double application du coefficient.
    expect(tunis.totals.total).toBeGreaterThan(iso.totals.total);
  });
});

describe("total du Second œuvre et protection des autres postes", () => {
  it("le sous-total du Second œuvre est la somme exacte de ses postes", () => {
    const sum = secondOeuvre.lines.reduce((s, l) => s + l.total, 0);
    expect(secondOeuvre.subtotal).toBe(sum);
    // Chaque poste : Montant = Quantité × Prix unitaire.
    for (const l of secondOeuvre.lines) {
      expect(Math.abs(l.total - l.quantity * l.unitPrice)).toBeLessThanOrEqual(
        Math.max(1, l.quantity * 0.01),
      );
    }
  });

  it("la main-d'œuvre n'est comptée qu'une seule fois (somme des natures = total)", () => {
    const t = iso.totals;
    expect(
      t.materiaux + t.mainOeuvre + t.equipements + t.transport + t.etudes,
    ).toBe(t.total);
    // La main-d'œuvre du barème apparaît bien dans le total main-d'œuvre…
    expect(t.mainOeuvre).toBeGreaterThanOrEqual(1_000 + 400 + 3_500 + 2_500);
    // …et le total du DQE reste la somme des lots (aucun double comptage).
    expect(iso.lots.reduce((s, l) => s + l.subtotal, 0)).toBe(t.total);
  });

  it("les autres lots conservent exactement leur budget alloué", () => {
    let allocated = 0;
    for (const lot of iso.lots) {
      allocated += lot.allocatedSubtotal ?? lot.subtotal;
      if (lot.id !== "second_oeuvre") {
        expect(lot.subtotal, lot.name).toBe(lot.allocatedSubtotal ?? lot.subtotal);
      }
    }
    expect(allocated).toBe(BUDGET);
    // Seul l'écart du Second œuvre réel modifie le total TTC.
    const delta = secondOeuvre.subtotal - (secondOeuvre.allocatedSubtotal ?? 0);
    expect(iso.totals.total).toBe(BUDGET + delta);
    expect(iso.totals.costPerM2).toBe(Math.round(iso.totals.total / 100));
  });

  it("un article personnalisé ne conserve pas la main-d'œuvre du barème", async () => {
    const { overlayCustomizations } = await import("./quantitatifCustomLogic");
    const paint = line("Peinture intérieure (3 couches, finition standard)");
    const index = secondOeuvre.lines.indexOf(paint);
    const overlaid = overlayCustomizations(iso.lots as any[], [
      {
        lineKey: `second_oeuvre::${index}`,
        lotId: "second_oeuvre",
        lotName: secondOeuvre.name,
        lineIndex: index,
        baseDesignation: paint.designation,
        designation: paint.designation,
        unit: paint.unit,
        quantity: paint.quantity,
        unitPrice: paint.unitPrice,
        nature: paint.nature,
        priceScenario: "standard",
        replacedArticle: true,
        updatedAt: Date.now(),
      },
    ], { scaleFactor: 1, realCostFactor: 1 });
    const overlaidPaint = overlaid.lots
      .find((l: any) => l.id === "second_oeuvre")!
      .lines[index];
    expect(overlaidPaint.customized).toBe(true);
    expect(overlaidPaint.labor).toBeUndefined();
  });
});
