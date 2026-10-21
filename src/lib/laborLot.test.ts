import { describe, it, expect } from "vitest";
import {
  LABOR_LOT_UNIT,
  formatLaborLot,
  formatQuantitatifQuantity,
  isLaborNature,
  normalizeLaborLine,
  normalizeLaborLots,
} from "./laborLot";
import { generateDqe } from "../convex/dqeEngine";
import { PROJECT_TYPES } from "../convex/projectTypes";
import { buildSdbEstimate, sdbDqeLots } from "./renovationSdbPricing";

const round2 = (n: number) => Math.round(n * 100) / 100;

const run = (category: string, totalBudget = 300_000) =>
  generateDqe({ category, surface: 120, floors: 1, totalBudget });

describe("main-d'œuvre en lots — helpers partagés", () => {
  it("un poste de main-d'œuvre devient 1 lot sans changer son montant", () => {
    const line: any = normalizeLaborLine({
      designation: "Dépose des revêtements",
      nature: "main_oeuvre",
      unit: "m²",
      quantity: 120,
      unitPrice: 18,
      total: 2_160,
    });
    expect(line.unit).toBe(LABOR_LOT_UNIT);
    expect(line.quantity).toBe(1);
    expect(line.unitPrice).toBe(2_160);
    expect(line.total).toBe(2_160);
    // Base d'origine conservée pour audit.
    expect(line.referenceQuantity).toBe(120);
    expect(line.referenceUnit).toBe("m²");
    expect(line.referenceUnitPrice).toBe(18);
  });

  it("un poste matériel n'est jamais modifié (quantité, unité, prix)", () => {
    const material = {
      designation: "Peinture intérieure",
      nature: "materiaux",
      unit: "seau 20 L",
      quantity: 21.6,
      unitPrice: 162.56,
      total: 3_511,
    };
    expect(normalizeLaborLine(material)).toBe(material);
  });

  it("la part main-d'œuvre incluse sous un poste devient un lot, sans doubler le montant", () => {
    const line: any = normalizeLaborLine({
      designation: "Peinture intérieure",
      nature: "materiaux",
      unit: "seau 20 L",
      quantity: 21.6,
      unitPrice: 162.56,
      total: 3_511,
      labor: {
        label: "Main-d'œuvre — Peinture intérieure",
        quantity: 250,
        unit: "m²",
        unitPrice: 4,
        total: 1_000,
      },
    });
    expect(line.quantity).toBe(21.6);
    expect(line.unit).toBe("seau 20 L");
    expect(line.total).toBe(3_511);
    expect(line.labor!.quantity).toBe(1);
    expect(line.labor!.unit).toBe("lot");
    expect(line.labor!.unitPrice).toBe(1_000);
    expect(line.labor!.total).toBe(1_000);
    expect(line.labor!.referenceQuantity).toBe(250);
    expect(line.labor!.referenceUnit).toBe("m²");
    expect(line.labor!.referenceUnitPrice).toBe(4);
  });

  it("la normalisation est idempotente", () => {
    const once = normalizeLaborLine({
      nature: "main_oeuvre",
      unit: "jour",
      quantity: 15,
      unitPrice: 80,
      total: 1_200,
    });
    expect(normalizeLaborLine(once)).toEqual(once);
  });

  it("affichage : « Lot N » pour la main-d'œuvre, « quantité unité » sinon", () => {
    expect(formatLaborLot(1)).toBe("Lot 1");
    expect(formatLaborLot(3)).toBe("Lot 3");
    expect(formatQuantitatifQuantity(1, "lot", "main_oeuvre")).toBe("Lot 1");
    expect(formatQuantitatifQuantity(2, "lot", "main_oeuvre")).toBe("Lot 2");
    // Un matériel vendu au lot conserve son affichage habituel.
    expect(formatQuantitatifQuantity(1, "lot", "materiaux")).toBe("1 lot");
    expect(formatQuantitatifQuantity(21.6, "seau 20 L", "materiaux")).toBe(
      "21.6 seau 20 L",
    );
    expect(isLaborNature("main_oeuvre")).toBe(true);
    expect(isLaborNature("materiaux")).toBe(false);
  });
});

describe("générateur DQE — tous les projets et scénarios", () => {
  it("tous les postes de main-d'œuvre sont exprimés en lots, montants inchangés", () => {
    for (const category of PROJECT_TYPES) {
      const dqe = run(category);
      const laborLines: any[] = [];
      for (const lot of dqe.lots) {
        for (const line of lot.lines) {
          if (line.nature === "main_oeuvre") laborLines.push(line);
          if (line.labor) {
            expect(line.labor.unit, `${category} / ${line.labor.label}`).toBe("lot");
            expect(line.labor.quantity, `${category} / ${line.labor.label}`).toBe(1);
            expect(
              Math.abs(line.labor.total - line.labor.quantity * line.labor.unitPrice),
              `${category} / ${line.labor.label}`,
            ).toBeLessThanOrEqual(0.01);
          }
        }
      }
      for (const line of laborLines) {
        expect(line.unit, `${category} / ${line.designation}`).toBe("lot");
        expect(line.quantity, `${category} / ${line.designation}`).toBeGreaterThanOrEqual(1);
        expect(
          Math.abs(line.total - line.quantity * line.unitPrice),
          `${category} / ${line.designation}`,
        ).toBeLessThanOrEqual(0.01);
      }
      // Sous-totaux, total général et ventilation par nature inchangés.
      expect(dqe.lots.reduce((s, l) => s + l.subtotal, 0)).toBe(dqe.totals.total);
      const t = dqe.totals;
      expect(t.materiaux + t.mainOeuvre + t.equipements + t.transport + t.etudes).toBe(
        t.total,
      );
    }
  });

  it("la normalisation d'un DQE déjà en lots ne change ni montant ni total", () => {
    for (const category of PROJECT_TYPES) {
      const dqe = run(category);
      const again = normalizeLaborLots(dqe.lots);
      expect(again).toEqual(dqe.lots);
      expect(again.reduce((s, l) => s + l.subtotal, 0)).toBe(dqe.totals.total);
    }
  });

  it("les postes techniques (plomberie, électricité) restent au m² et leur main-d'œuvre est un lot", () => {
    for (const category of PROJECT_TYPES) {
      const dqe = run(category);
      for (const line of dqe.lots.flatMap((l) => l.lines)) {
        if (!line.technicalInstallation) continue;
        expect(line.unit, `${category} / ${line.designation}`).toBe("m²");
        expect(line.quantity, `${category} / ${line.designation}`).toBeGreaterThan(0);
        if (line.labor) {
          expect(line.labor.unit, `${category} / ${line.designation}`).toBe("lot");
          expect(line.labor.quantity, `${category} / ${line.designation}`).toBe(1);
        }
      }
    }
  });
});

describe("rénovation de salle de bain — TVA et scénarios", () => {
  for (const scenario of ["economique", "standard", "premium"] as const) {
    it(`scénario ${scenario} : main-d'œuvre en lots, TVA et totaux inchangés`, () => {
      const estimate = buildSdbEstimate({
        surface: 5,
        scenario,
        vatRate: 13,
      });
      const lots = sdbDqeLots(estimate);
      const lines = lots.flatMap((l) => l.lines as any[]);
      const labor = lines.filter((l) => l.nature === "main_oeuvre");
      expect(labor.length).toBeGreaterThan(0);
      for (const line of labor) {
        expect(line.unit).toBe("lot");
        expect(line.quantity).toBeGreaterThanOrEqual(1);
        expect(Math.abs(line.total - line.quantity * line.unitPrice)).toBeLessThanOrEqual(0.01);
        expect(line.vatRate).toBe(13);
      }
      // Total TTC = somme exacte des lots, elle-même somme des montants de
      // lignes arrondis : la normalisation en lots n'a rien changé.
      const expected = estimate.lots
        .flatMap((l) => l.lines)
        .reduce((s, l) => s + Math.round(l.totalTTC), 0);
      const displayed = lots.reduce((s, l) => s + l.subtotal, 0);
      expect(displayed).toBe(expected);
      expect(Math.abs(displayed - estimate.totals.totalTTC)).toBeLessThanOrEqual(
        lines.length,
      );
      for (const line of lines) {
        expect(Math.abs(line.totalHT + line.vatAmount - line.total)).toBeLessThanOrEqual(0.51);
      }
    });
  }
});
