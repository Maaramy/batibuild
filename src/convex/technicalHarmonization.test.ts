/// <reference types="vite/client" />

// ============================================================================
// HARMONISATION DES COÛTS DE PLOMBERIE ET D'ÉLECTRICITÉ
// ----------------------------------------------------------------------------
// Références du marché tunisien 2026 (scénario Standard, TTC) :
//   • Plomberie complète : 9 400 TND TTC / 100 m² → 94 TND/m² ;
//   • Électricité complète : 7 200 TND TTC / 100 m² → 72 TND/m².
//
//   Test A — projet Standard de 100 m² : 9 400 / 7 200 TND.
//   Test B — projet Standard de 150 m² : 14 100 / 10 800 TND.
//   Test C — cohérence globale : DQE = estimation = récapitulatifs = PDF,
//            total = somme des lots et des natures (aucun doublon), autres
//            postes inchangés, scénarios non standards et rénovations
//            partielles préservés.
//
// Le chemin Test A/B emprunte le parcours réel (createProject →
// simulateAnalysis), donc le moteur BIM, le Quantitatif détaillé, les
// scénarios budgétaires et les valeurs du devis PDF.
// ============================================================================

import { describe, expect, it, beforeEach } from "vitest";
import { convexTest } from "convex-test";

import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { generateDqe, type DqeResult } from "./dqeEngine";
import { MARKET_PRICE_M2, runBIMEstimation } from "./bimEngine";
import { PROJECT_TYPES } from "./projectTypes";
import { realBuiltArea } from "../lib/buildingLevels";
import { regionCostFactor } from "../lib/regionImpact";
import { REGION_COST_M2 } from "./bimEngine";
import {
  ELECTRICITY_BAREME_M2,
  ELECTRICITY_REFERENCE_M2,
  ELECTRICITY_REFERENCE_TTC,
  PLUMBING_BAREME_M2,
  PLUMBING_REFERENCE_M2,
  PLUMBING_REFERENCE_TTC,
  TECHNICAL_REFERENCE_SURFACE_M2,
} from "../lib/technicalBareme";
import { technicalLotCost } from "../lib/dqeTechnicalLots";
import { resolvePdfScenarioValues } from "../lib/projectPdfScenario";

const modules = import.meta.glob("./**/*.*s");

const PLUMBING = "Plomberie sanitaire";
const ELECTRICITY = "Électricité";

type DqeLineLike = {
  designation: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  nature: string;
  labor?: { total: number };
};

type ProjectLike = {
  dqe: {
    lots: { id: string; name: string; subtotal: number; allocatedSubtotal?: number; lines: DqeLineLike[] }[];
    totals: {
      materiaux: number;
      mainOeuvre: number;
      equipements: number;
      transport: number;
      etudes: number;
      total: number;
      costPerM2: number;
    };
  };
  costEstimate: {
    totalCost: number;
    costPerSquareMeter: number;
    budgetScenarios: Record<
      "economique" | "standard" | "premium",
      { totalCost: number; costPerM2: number }
    >;
    breakdown: { estimatedCost: number }[];
  };
};

const lineOf = (dqe: DqeResult, designation: string): DqeLineLike => {
  const found = dqe.lots
    .flatMap((lot) => lot.lines)
    .find((line) => line.designation === designation);
  if (!found) throw new Error(`Poste introuvable : ${designation}`);
  return found as unknown as DqeLineLike;
};

/** Mêmes entrées que `simulateAnalysis` : grille BIM Standard + barème régional. */
function estimation(category: string, surface: number, floors = 1) {
  const bim = runBIMEstimation(category, surface, floors, "medenine", "standard");
  const totalBudget = bim.costEstimate.totalCost;
  const dqe = generateDqe({ category, surface, floors, totalBudget });
  return { totalBudget, dqe };
}

// ── Parcours réel createProject → simulateAnalysis ─────────────────────────

async function createAdminUser(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Admin Harmonisation",
      email: "admin-harmonisation@test.com",
      role: "admin",
      status: "active",
      subscriptionPlan: "free",
      image: undefined,
      company: undefined,
      phone: undefined,
      subscriptionEndDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

async function createAndEstimate(
  t: ReturnType<typeof convexTest>,
  userId: string,
  input: { name: string; category: string; surface: number; floors?: number },
): Promise<ProjectLike> {
  const userT = t.withIdentity({ subject: userId });
  const projectId = await userT.mutation(api.projects.createProject, {
    name: input.name,
    category: input.category as any,
    region: "medenine" as any,
    surface: input.surface,
    floors: input.floors ?? 1,
  });
  await userT.mutation(api.projects.simulateAnalysis, { projectId });
  const project = await t.run(async (ctx) => ctx.db.get(projectId));
  return project as unknown as ProjectLike;
}

describe("Test A — projet Standard de 100 m²", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createAdminUser(t);
  });

  it("Plomberie complète : 9 400 TND TTC, du moteur jusqu'au rapport PDF", async () => {
    const project = await createAndEstimate(t, userId, {
      name: "Plomberie complète 100",
      category: "plomberie_complete",
      surface: 100,
    });

    // Estimation du coût de construction.
    expect(project.costEstimate.totalCost).toBe(9_400);
    // Quantitatif détaillé : total = somme exacte des lots.
    const sumLots = project.dqe.lots.reduce((s, lot) => s + lot.subtotal, 0);
    expect(project.dqe.totals.total).toBe(9_400);
    expect(sumLots).toBe(9_400);
    // Scénario Standard et récapitulatifs alignés.
    expect(project.costEstimate.budgetScenarios.standard.totalCost).toBe(9_400);
    expect(project.costEstimate.costPerSquareMeter).toBe(94);
    // Devis PDF : les mêmes valeurs, aucune seconde taxation.
    const pdf = resolvePdfScenarioValues({
      scenario: "standard",
      scenarios: project.costEstimate.budgetScenarios,
      ce: project.costEstimate,
      dqe: project.dqe,
    });
    expect(pdf.totalCost).toBe(9_400);
    expect(pdf.dqeTotals?.total).toBe(9_400);
    expect(pdf.dqeLots.reduce((s: number, lot: any) => s + lot.subtotal, 0)).toBe(9_400);
  });

  it("Électricité complète : 7 200 TND TTC, du moteur jusqu'au rapport PDF", async () => {
    const project = await createAndEstimate(t, userId, {
      name: "Électricité complète 100",
      category: "electricite_complete",
      surface: 100,
    });

    expect(project.costEstimate.totalCost).toBe(7_200);
    const sumLots = project.dqe.lots.reduce((s, lot) => s + lot.subtotal, 0);
    expect(project.dqe.totals.total).toBe(7_200);
    expect(sumLots).toBe(7_200);
    expect(project.costEstimate.budgetScenarios.standard.totalCost).toBe(7_200);
    expect(project.costEstimate.costPerSquareMeter).toBe(72);

    const pdf = resolvePdfScenarioValues({
      scenario: "standard",
      scenarios: project.costEstimate.budgetScenarios,
      ce: project.costEstimate,
      dqe: project.dqe,
    });
    expect(pdf.totalCost).toBe(7_200);
    expect(pdf.dqeTotals?.total).toBe(7_200);
  });
});

describe("Test B — projet Standard de 150 m²", () => {
  it("Plomberie complète : 14 100 TND TTC", () => {
    const { totalBudget, dqe } = estimation("plomberie_complete", 150);
    expect(totalBudget).toBe(14_100);
    expect(dqe.totals.total).toBe(14_100);
    expect(dqe.lots.reduce((s, lot) => s + lot.subtotal, 0)).toBe(14_100);
    expect(dqe.totals.costPerM2).toBe(94);
  });

  it("Électricité complète : 10 800 TND TTC", () => {
    const { totalBudget, dqe } = estimation("electricite_complete", 150);
    expect(totalBudget).toBe(10_800);
    expect(dqe.totals.total).toBe(10_800);
    expect(dqe.lots.reduce((s, lot) => s + lot.subtotal, 0)).toBe(10_800);
    expect(dqe.totals.costPerM2).toBe(72);
  });

  it("les deux lots suivent proportionnellement la surface (×1,5 entre 100 et 150 m²)", () => {
    const p100 = estimation("plomberie_complete", 100).dqe.totals.total;
    const p150 = estimation("plomberie_complete", 150).dqe.totals.total;
    const e100 = estimation("electricite_complete", 100).dqe.totals.total;
    const e150 = estimation("electricite_complete", 150).dqe.totals.total;
    expect(p150).toBe(Math.round(p100 * 1.5));
    expect(e150).toBe(Math.round(e100 * 1.5));
  });
});

describe("barème de référence — une seule source, aucun barème contradictoire", () => {
  it("les références TTC 100 m² donnent exactement 94 et 72 DT/m²", () => {
    expect(TECHNICAL_REFERENCE_SURFACE_M2).toBe(100);
    expect(PLUMBING_REFERENCE_TTC).toBe(9_400);
    expect(ELECTRICITY_REFERENCE_TTC).toBe(7_200);
    expect(PLUMBING_REFERENCE_M2).toBe(94);
    expect(ELECTRICITY_REFERENCE_M2).toBe(72);
    expect(PLUMBING_BAREME_M2.standard).toBe(94);
    expect(ELECTRICITY_BAREME_M2.standard).toBe(72);
  });

  it("les scénarios Économique et Premium conservent leur propre barème", () => {
    expect(PLUMBING_BAREME_M2.economique).toBe(60);
    expect(PLUMBING_BAREME_M2.premium).toBe(115);
    expect(ELECTRICITY_BAREME_M2.economique).toBe(35);
    expect(ELECTRICITY_BAREME_M2.premium).toBe(100);
    expect(PLUMBING_BAREME_M2.economique).toBeLessThan(PLUMBING_BAREME_M2.standard);
    expect(PLUMBING_BAREME_M2.standard).toBeLessThan(PLUMBING_BAREME_M2.premium);
    expect(ELECTRICITY_BAREME_M2.economique).toBeLessThan(ELECTRICITY_BAREME_M2.standard);
    expect(ELECTRICITY_BAREME_M2.standard).toBeLessThan(ELECTRICITY_BAREME_M2.premium);
  });

  it("la grille « type de projet » et ses alias legacy reprennent les mêmes valeurs", () => {
    for (const key of ["plomberie_complete", "installations_sanitaires"]) {
      expect(MARKET_PRICE_M2[key], key).toEqual({
        eco: PLUMBING_BAREME_M2.economique,
        std: PLUMBING_BAREME_M2.standard,
        premium: PLUMBING_BAREME_M2.premium,
      });
    }
    for (const key of ["electricite_complete", "installations_electricite"]) {
      expect(MARKET_PRICE_M2[key], key).toEqual({
        eco: ELECTRICITY_BAREME_M2.economique,
        std: ELECTRICITY_BAREME_M2.standard,
        premium: ELECTRICITY_BAREME_M2.premium,
      });
    }
  });

  it("la fonction commune de calcul applique une seule fois le coefficient régional", () => {
    const base = technicalLotCost("plomberie", { builtArea: 100 });
    expect(base.quantity).toBe(100);
    expect(base.unitPrice).toBe(94);
    expect(base.total).toBe(9_400);
    expect(base.laborTotal).toBeLessThan(base.total);

    const tunis = 1.1;
    const regional = technicalLotCost("plomberie", { builtArea: 100, regionFactor: tunis });
    expect(regional.unitPrice).toBe(103.4);
    expect(regional.total).toBe(10_340);

    // La TVA n'est jamais ajoutée : le barème et les montants sont déjà TTC.
    expect(base.total).toBe(PLUMBING_REFERENCE_TTC);
    expect(technicalLotCost("electricite", { builtArea: 100 }).total).toBe(
      ELECTRICITY_REFERENCE_TTC,
    );
  });
});

describe("Test C — cohérence globale", () => {
  it("maison 100 m² : plomberie 9 400 et électricité 7 200 dans le Quantitatif", () => {
    const { dqe } = estimation("maison", 100);
    const plumbing = lineOf(dqe, PLUMBING);
    const electricity = lineOf(dqe, ELECTRICITY);
    expect(plumbing.quantity).toBe(100);
    expect(plumbing.unitPrice).toBe(94);
    expect(plumbing.total).toBe(9_400);
    expect(electricity.quantity).toBe(100);
    expect(electricity.unitPrice).toBe(72);
    expect(electricity.total).toBe(7_200);
  });

  it("maison 150 m² : 14 100 et 10 800, proportionnels à la surface construite", () => {
    const { dqe } = estimation("maison", 150);
    expect(lineOf(dqe, PLUMBING).total).toBe(14_100);
    expect(lineOf(dqe, ELECTRICITY).total).toBe(10_800);
    expect(lineOf(dqe, PLUMBING).quantity).toBe(150);
  });

  it("total global TTC = somme des lots = somme des natures, sans doublon", () => {
    const { totalBudget, dqe } = estimation("maison", 130);
    const sumLots = dqe.lots.reduce((s, lot) => s + lot.subtotal, 0);
    const t = dqe.totals;
    expect(sumLots).toBe(t.total);
    expect(t.materiaux + t.mainOeuvre + t.equipements + t.transport + t.etudes).toBe(
      t.total,
    );
    // Le budget BIM reste la référence de chaque lot : seul l'écart du lot
    // « Second œuvre et finitions » (facturé au réel) déplace le total.
    const allocated = dqe.lots.reduce(
      (s, lot) => s + (lot.allocatedSubtotal ?? lot.subtotal),
      0,
    );
    expect(allocated).toBe(totalBudget);
    const realDelta = dqe.lots.reduce(
      (s, lot) => s + (lot.subtotal - (lot.allocatedSubtotal ?? lot.subtotal)),
      0,
    );
    expect(t.total).toBe(totalBudget + realDelta);
    // La plomberie et l'électricité ne sont comptées qu'une fois : elles sont
    // comprises dans ce total, jamais ajoutées en sus.
    expect(t.total).toBeGreaterThan(
      lineOf(dqe, PLUMBING).total + lineOf(dqe, ELECTRICITY).total,
    );
  });

  it("les autres postes de construction ne sont pas modifiés par l'harmonisation", () => {
    const { dqe } = estimation("maison", 120);
    const second = dqe.lots.find((l) => l.id === "second_oeuvre")!;
    // Prix catalogue 2026 des postes non techniques : inchangés par le barème
    // plomberie / électricité.
    const expected: Record<string, number> = {
      "Revêtements de sol (carrelage grès cérame premier choix)": 30,
      "Revêtements muraux SDB/Cuisine (faïence)": 47.5,
      "Enduits intérieurs (ciment, plâtre)": 16,
      "Menuiserie intérieure (portes en bois semi-massif/stratifié)": 750,
    };
    for (const [designation, price] of Object.entries(expected)) {
      const line = second.lines.find((l) => l.designation === designation)!;
      expect(line.unitPrice, designation).toBe(price);
    }
    // Les autres lots gardent exactement leur budget alloué.
    for (const lot of dqe.lots) {
      if (lot.id === "second_oeuvre") continue;
      expect(lot.subtotal, lot.name).toBe(lot.allocatedSubtotal ?? lot.subtotal);
    }
  });

  it("scénarios Économique / Standard / Premium : mêmes règles, totaux ordonnés", () => {
    const eco = technicalLotCost("plomberie", { builtArea: 100, scenario: "economique" });
    const std = technicalLotCost("plomberie", { builtArea: 100, scenario: "standard" });
    const prem = technicalLotCost("plomberie", { builtArea: 100, scenario: "premium" });
    expect(eco.total).toBe(6_000);
    expect(std.total).toBe(9_400);
    expect(prem.total).toBe(11_500);
    expect(eco.total).toBeLessThan(std.total);
    expect(std.total).toBeLessThan(prem.total);

    const { dqe } = estimation("maison", 120);
    expect(dqe.lots.every((lot) => lot.subtotal === lot.lines.reduce((s, l) => s + l.total, 0))).toBe(
      true,
    );
  });

  it("impact régional : le coefficient s'applique une seule fois aux deux lots", () => {
    const factor = regionCostFactor(REGION_COST_M2, "tunis", "standard");
    const bim = runBIMEstimation("maison", 100, 1, "tunis", "standard");
    const dqe = generateDqe({
      category: "maison",
      surface: 100,
      floors: 1,
      totalBudget: bim.costEstimate.totalCost,
      regionFactor: factor,
    });
    expect(lineOf(dqe, PLUMBING).unitPrice).toBeCloseTo(94 * factor, 2);
    expect(lineOf(dqe, ELECTRICITY).unitPrice).toBeCloseTo(72 * factor, 2);
    expect(lineOf(dqe, PLUMBING).quantity).toBe(100);
  });

  it("rénovation partielle : aucun lot complet de 94 / 72 DT/m² appliqué aveuglément", () => {
    // Cuisine : réseaux facturés à leurs quantités réelles (ml / points).
    const cuisine = generateDqe({
      category: "renovation_cuisine",
      surface: 12,
      floors: 1,
      totalBudget: 40_000,
    });
    const cuisineLines = cuisine.lots.flatMap((lot) => lot.lines);
    expect(cuisineLines.some((l) => l.designation === PLUMBING)).toBe(false);
    expect(cuisineLines.some((l) => l.designation === ELECTRICITY)).toBe(false);
    expect(cuisineLines.some((l) => l.designation === "Alimentation eau (PER/PER-AL)")).toBe(
      true,
    );

    // Salle de bain : grille pièce par pièce, pas un forfait au m².
    const sdb = generateDqe({
      category: "renovation_salle_de_bain",
      surface: 6,
      floors: 1,
      totalBudget: 12_000,
    });
    const sdbLines = sdb.lots.flatMap((lot) => lot.lines);
    expect(sdbLines.some((l) => l.designation === PLUMBING)).toBe(false);
    const sdbPlumbing = sdb.lots.find((lot) => lot.id === "plomberie")!;
    // Aucun poste au m² : la pièce est chiffrée au ml / à l'unité, pas au tarif
    // du lot complet.
    expect(sdbPlumbing.lines.every((l) => l.unit !== "m²")).toBe(true);
    expect(sdbPlumbing.subtotal).not.toBe(6 * 94);
    expect(sdbPlumbing.subtotal).toBe(
      sdbPlumbing.lines.reduce((s, l) => s + l.total, 0),
    );
    expect(sdbLines.find((l) => l.designation === "Alimentation eau (PER)")!.quantity).toBe(15);
  });

  it("projet sans plomberie / électricité complète : aucun poste au barème ajouté", () => {
    const { dqe } = estimation("peinture_interieure", 60);
    const designations = dqe.lots.flatMap((lot) => lot.lines.map((l) => l.designation));
    expect(designations).not.toContain(PLUMBING);
    expect(designations).not.toContain(ELECTRICITY);
    expect(dqe.totals.total).toBe(
      dqe.lots.reduce((s, lot) => s + lot.subtotal, 0),
    );
  });

  it("chaque type de projet concerné applique les deux références au m²", () => {
    for (const category of PROJECT_TYPES) {
      for (const surface of [80, 150]) {
        const built = realBuiltArea(surface, 1);
        const { dqe } = estimation(category, surface);
        const label = `${category}@${surface}`;
        const technical = dqe.lots
          .flatMap((lot) => lot.lines)
          .filter((line) => (line as any).technicalInstallation) as any[];

        for (const line of technical) {
          const kind = line.technicalInstallation as "plomberie" | "electricite";
          const rate = kind === "plomberie" ? 94 : 72;
          expect(line.unit, `${label} / ${line.designation}`).toBe("m²");
          expect(line.quantity, `${label} / ${line.designation}`).toBe(built);
          expect(line.unitPrice, `${label} / ${line.designation}`).toBe(rate);
          expect(line.total, `${label} / ${line.designation}`).toBe(
            Math.round(line.quantity * line.unitPrice),
          );
          if (line.labor) {
            // Main-d'œuvre facturée au lot : 1 lot, prix = montant du lot.
            expect(line.labor.quantity).toBe(1);
            expect(line.labor.unit).toBe("lot");
            expect(line.labor.unitPrice).toBe(line.labor.total);
            expect(line.labor.referenceUnitPrice).toBe(kind === "plomberie" ? 35 : 25);
            expect(line.labor.total).toBeLessThan(line.total);
          }
        }
        // Un seul poste par corps d'état : aucun doublon entre les lots.
        const kinds = technical.map((line) => line.technicalInstallation);
        expect(new Set(kinds).size, label).toBe(kinds.length);
        // Le total du DQE reste la somme de ses lots.
        expect(dqe.totals.total, label).toBe(
          dqe.lots.reduce((s, lot) => s + lot.subtotal, 0),
        );
      }
    }
  });

  it("le montant technique suit la surface réellement construite (tous niveaux)", () => {
    const surface = 100;
    const floors = 2;
    const levelSurfaces = [100, 80];
    const built = realBuiltArea(surface, floors, levelSurfaces);
    const bim = runBIMEstimation("villa", surface, floors, "medenine", "standard", undefined, {
      levelSurfaces,
    });
    const dqe = generateDqe({
      category: "villa",
      surface,
      floors,
      levelSurfaces,
      totalBudget: bim.costEstimate.totalCost,
    });
    expect(built).toBe(180);
    expect(lineOf(dqe, PLUMBING).quantity).toBe(180);
    expect(lineOf(dqe, PLUMBING).total).toBe(180 * 94);
    expect(lineOf(dqe, ELECTRICITY).total).toBe(180 * 72);
  });
});
