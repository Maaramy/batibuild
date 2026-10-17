import { describe, expect, it } from "vitest";

import { generateDqe } from "./dqeEngine";
import { MARKET_PRICE_M2 } from "./bimEngine";
import {
  ELECTRICITY_BAREME_M2,
  ELECTRICITY_LABOR_M2,
  PAINT_BUCKET_LITERS,
  PLUMBING_BAREME_M2,
  PLUMBING_LABOR_M2,
} from "../lib/technicalBareme";

// ============================================================================
// BARÈME TECHNIQUE 2026 — PEINTURE · PLOMBERIE · ÉLECTRICITÉ
// ----------------------------------------------------------------------------
// Projet de référence : maison de 100 m² de surface construite (RDC), budget
// TTC 198 000 TND (grille Tunis standard 2026).
// Vérifie que :
//   • la peinture intérieure consomme 18 seaux de 20 L / 100 m², l'extérieure 12 ;
//   • plomberie 85 DT/m² et électricité 65 DT/m² (Standard) ;
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
    expect(paint.labor!.quantity).toBe(250);
    expect(paint.labor!.unit).toBe("m²");
    expect(paint.labor!.unitPrice).toBe(4);
    expect(paint.labor!.total).toBe(1_000);
    // La main-d'œuvre est INCLUSE : elle est inférieure au montant du poste.
    expect(paint.labor!.total).toBeLessThan(paint.total);
  });

  it("peinture extérieure : 12 seaux de 20 L et la main-d'œuvre correspondante", () => {
    const paint = line("Peinture extérieure (façade, monocouche acrylique)");
    expect(paint.unit).toBe(`seau ${PAINT_BUCKET_LITERS} L`);
    expect(paint.quantity).toBe(12);
    expect(paint.labor).toBeDefined();
    // 80 m² de façade × 5 DT/m² = 400 DT, inclus dans le poste.
    expect(paint.labor!.quantity).toBe(80);
    expect(paint.labor!.unitPrice).toBe(5);
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
    expect(int.labor!.quantity).toBe(500);
  });
});

describe("barème plomberie et électricité — DT/m² de surface construite", () => {
  it("plomberie complète : 85 DT/m² (Standard) et main-d'œuvre de 35 DT/m²", () => {
    const plumbing = line("Plomberie sanitaire");
    expect(plumbing.unit).toBe("m²");
    expect(plumbing.quantity).toBe(100);
    expect(plumbing.unitPrice).toBe(PLUMBING_BAREME_M2.standard);
    expect(plumbing.total).toBe(8_500);
    expect(plumbing.labor).toBeDefined();
    expect(plumbing.labor!.quantity).toBe(100);
    expect(plumbing.labor!.unitPrice).toBe(PLUMBING_LABOR_M2.standard);
    expect(plumbing.labor!.total).toBe(3_500);
    expect(plumbing.labor!.total).toBeLessThan(plumbing.total);
  });

  it("électricité complète : 65 DT/m² (Standard) et main-d'œuvre de 25 DT/m²", () => {
    const electricity = line("Électricité");
    expect(electricity.unit).toBe("m²");
    expect(electricity.quantity).toBe(100);
    expect(electricity.unitPrice).toBe(ELECTRICITY_BAREME_M2.standard);
    expect(electricity.total).toBe(6_500);
    expect(electricity.labor).toBeDefined();
    expect(electricity.labor!.unitPrice).toBe(ELECTRICITY_LABOR_M2.standard);
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
    expect(PLUMBING_BAREME_M2).toEqual({ economique: 60, standard: 85, premium: 115 });
    expect(ELECTRICITY_BAREME_M2).toEqual({ economique: 35, standard: 65, premium: 100 });
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
