import { describe, expect, it } from "vitest";

import { generateDqe, type DqeResult } from "./dqeEngine";
import { PROJECT_TYPES } from "./projectTypes";
import { realBuiltArea } from "../lib/buildingLevels";
import { regionCostFactor } from "../lib/regionImpact";
import { REGION_COST_M2 } from "./bimEngine";
import {
  ELECTRICITY_BAREME_M2,
  PLUMBING_BAREME_M2,
} from "../lib/technicalBareme";

// ============================================================================
// SYNCHRONISATION DU QUANTITATIF DÉTAILLÉ — PLOMBERIE & ÉLECTRICITÉ
// ----------------------------------------------------------------------------
// Le même jeu de règles (barème national au m², surface réellement construite,
// équipements déclarés) est appliqué à TOUS les types de projet concernés.
// Les tests vérifient, pour chaque configuration :
//   • la quantité suit la surface du projet (jamais 100 / 120 m² de référence) ;
//   • Montant = Quantité × Prix unitaire, sous-total du lot = somme des postes ;
//   • total des lots = total du DQE = total des natures ;
//   • les autres lots ne bougent pas lorsqu'un équipement est déclaré ;
//   • la rénovation conserve des quantités de chantier réalistes.
// ============================================================================

const run = (
  category: string,
  opts: {
    surface: number;
    floors?: number;
    levelSurfaces?: number[];
    totalBudget?: number;
    rooms?: { bathrooms?: number; kitchens?: number; wcs?: number };
    regionFactor?: number;
  },
) =>
  generateDqe({
    category,
    surface: opts.surface,
    floors: opts.floors ?? 1,
    levelSurfaces: opts.levelSurfaces,
    totalBudget: opts.totalBudget ?? 250_000,
    rooms: opts.rooms,
    regionFactor: opts.regionFactor,
  });

const technicalLines = (dqe: DqeResult) =>
  dqe.lots
    .flatMap((lot) => lot.lines.map((line) => ({ lot, line })))
    .filter(({ line }) =>
      ["Plomberie sanitaire", "Électricité", "Installation électrique complète", "Installation électrique", "Installation électrique industrielle", "Réseau eau et évacuation"].includes(
        line.designation,
      ),
    );

const lineOf = (dqe: DqeResult, designation: string) => {
  const found = dqe.lots
    .flatMap((lot) => lot.lines)
    .find((line) => line.designation === designation);
  if (!found) throw new Error(`Poste introuvable : ${designation}`);
  return found;
};

/** Invariants financiers communs à tous les DQE. */
function expectFinancialIntegrity(dqe: DqeResult, label: string) {
  const sumLots = dqe.lots.reduce((s, lot) => s + lot.subtotal, 0);
  expect(sumLots, `${label} : somme des lots`).toBe(dqe.totals.total);
  for (const lot of dqe.lots) {
    expect(
      lot.lines.reduce((s, line) => s + line.total, 0),
      `${label} / ${lot.name} : somme des postes`,
    ).toBe(lot.subtotal);
    for (const line of lot.lines) {
      expect(
        Math.abs(line.total - line.quantity * line.unitPrice),
        `${label} / ${lot.name} / ${line.designation}`,
      ).toBeLessThanOrEqual(Math.max(1, line.quantity * 0.01));
    }
  }
  expect(
    dqe.totals.materiaux +
      dqe.totals.mainOeuvre +
      dqe.totals.equipements +
      dqe.totals.transport +
      dqe.totals.etudes,
    `${label} : natures`,
  ).toBe(dqe.totals.total);
  const pct = dqe.lots.reduce((s, lot) => s + lot.percent, 0);
  expect(pct, `${label} : pourcentages`).toBeGreaterThanOrEqual(99.5);
  expect(pct, `${label} : pourcentages`).toBeLessThanOrEqual(100.5);
}

describe("plomberie / électricité — tous les types de projet utilisent la même règle", () => {
  it("aucun poste technique n'a une quantité de référence figée : elle suit la surface", () => {
    for (const category of PROJECT_TYPES) {
      for (const surface of [45, 120, 320]) {
        const label = `${category}@${surface}`;
        const dqe = run(category, { surface, floors: 1 });
        const builtArea = realBuiltArea(surface, 1, undefined);
        const lines = technicalLines(dqe);
        // Types sans poste au barème (réseaux spécifiques d'une cuisine / SdB
        // rénovée, en ml et en points) : vérifiés dans le bloc dédié plus bas.
        if (lines.length === 0) continue;
        for (const { line } of lines) {
          if (line.unit !== "m²") continue;
          expect(line.quantity, `${label} / ${line.designation}`).toBe(builtArea);
        }
      }
    }
  });

  it("les quantités doublent avec la surface (maison, appartement, bureau, local)", () => {
    for (const category of [
      "maison",
      "appartement",
      "bureau",
      "local_commercial",
      "entrepot",
    ]) {
      const small = run(category, { surface: 90 });
      const big = run(category, { surface: 180 });
      for (const { line } of technicalLines(small)) {
        if (line.unit !== "m²") continue;
        const other = technicalLines(big).find(
          (entry) => entry.line.designation === line.designation,
        );
        expect(other, `${category} / ${line.designation}`).toBeDefined();
        expect(other!.line.quantity, `${category} / ${line.designation}`).toBe(
          line.quantity * 2,
        );
      }
    }
  });

  it("les étages s'ajoutent : la quantité suit la surface réellement construite", () => {
    const dqe = run("villa", {
      surface: 100,
      floors: 2,
      levelSurfaces: [100, 100],
    });
    expect(realBuiltArea(100, 2, [100, 100])).toBe(200);
    expect(lineOf(dqe, "Plomberie sanitaire").quantity).toBe(200);
    expect(lineOf(dqe, "Électricité").quantity).toBe(200);
  });

  it("les prix unitaires restent le barème national (résidentiel), appliqué une seule fois", () => {
    const dqe = run("maison", { surface: 100 });
    expect(lineOf(dqe, "Plomberie sanitaire").unitPrice).toBe(PLUMBING_BAREME_M2.standard);
    expect(lineOf(dqe, "Électricité").unitPrice).toBe(ELECTRICITY_BAREME_M2.standard);

    const tunis = run("maison", {
      surface: 100,
      regionFactor: regionCostFactor(REGION_COST_M2, "tunis", "standard"),
    });
    const factor = regionCostFactor(REGION_COST_M2, "tunis", "standard");
    expect(lineOf(tunis, "Plomberie sanitaire").unitPrice).toBeCloseTo(
      PLUMBING_BAREME_M2.standard * factor,
      2,
    );
    // La quantité ne dépend jamais de la région : seul le prix suit la grille.
    expect(lineOf(tunis, "Plomberie sanitaire").quantity).toBe(
      lineOf(dqe, "Plomberie sanitaire").quantity,
    );
  });
});

describe("plomberie / électricité — configurations réelles testées", () => {
  const CASES: {
    label: string;
    category: string;
    surface: number;
    floors?: number;
    levelSurfaces?: number[];
  }[] = [
    { label: "maison neuve 100 m² (cuisine, SdB, WC)", category: "maison", surface: 100 },
    { label: "appartement 80 m²", category: "appartement", surface: 80 },
    { label: "villa 200 m² sur 2 niveaux", category: "villa", surface: 100, floors: 2, levelSurfaces: [100, 100] },
    { label: "immeuble 400 m² sur 3 niveaux", category: "immeuble", surface: 140, floors: 3, levelSurfaces: [140, 140, 120] },
    { label: "bureau 150 m²", category: "bureau", surface: 150 },
    { label: "local commercial 120 m²", category: "local_commercial", surface: 120 },
    { label: "rénovation complète 90 m²", category: "renovation_complete", surface: 90 },
    { label: "rénovation salle de bain 6 m²", category: "renovation_salle_de_bain", surface: 6 },
  ];

  for (const testCase of CASES) {
    it(`${testCase.label} : quantités = surface construite, DQE équilibré`, () => {
      const dqe = run(testCase.category, testCase);
      const builtArea = realBuiltArea(
        testCase.surface,
        testCase.floors ?? 1,
        testCase.levelSurfaces,
      );
      const label = testCase.label;

      expectFinancialIntegrity(dqe, label);

      for (const { line } of technicalLines(dqe)) {
        expect(line.quantity, `${label} / ${line.designation}`).toBeGreaterThan(0);
        if (line.unit === "m²") {
          expect(line.quantity, `${label} / ${line.designation}`).toBe(builtArea);
        }
      }
    });
  }

  it("rénovation salle de bain : quantités de chantier par pièce, pas 0,75 ml", () => {
    const dqe = run("renovation_salle_de_bain", { surface: 6 });
    expect(lineOf(dqe, "Alimentation eau (PER)").quantity).toBe(15);
    expect(lineOf(dqe, "Alimentation eau (PER)").unit).toBe("ml");
    expect(lineOf(dqe, "Évacuation (PVC Ø50/Ø100)").quantity).toBe(10);
    expect(lineOf(dqe, "Points électriques SDB").quantity).toBe(4);
    expectFinancialIntegrity(dqe, "rénovation SdB");
  });
});

describe("équipements déclarés — adaptation sans toucher aux autres lots", () => {
  const base = run("maison", { surface: 100 });
  const equiped = run("maison", {
    surface: 100,
    rooms: { bathrooms: 3, kitchens: 2, wcs: 3 },
  });

  it("plus de salles de bain / cuisines / WC → plus de m² de réseaux", () => {
    expect(lineOf(equiped, "Plomberie sanitaire").quantity).toBeGreaterThan(
      lineOf(base, "Plomberie sanitaire").quantity,
    );
    expect(lineOf(equiped, "Électricité").quantity).toBeGreaterThan(
      lineOf(base, "Électricité").quantity,
    );
    // Le prix unitaire du barème ne change pas : seule la quantité s'adapte.
    expect(lineOf(equiped, "Plomberie sanitaire").unitPrice).toBe(
      lineOf(base, "Plomberie sanitaire").unitPrice,
    );
  });

  it("le montant du poste et le total du DQE suivent la quantité", () => {
    const plumbing = lineOf(equiped, "Plomberie sanitaire");
    expect(plumbing.total).toBe(
      Math.round(plumbing.quantity * plumbing.unitPrice),
    );
    expect(equiped.totals.total).toBeGreaterThan(base.totals.total);
    const delta =
      lineOf(equiped, "Plomberie sanitaire").total -
      lineOf(base, "Plomberie sanitaire").total +
      (lineOf(equiped, "Électricité").total -
        lineOf(base, "Électricité").total);
    expect(equiped.totals.total - base.totals.total).toBe(delta);
    expectFinancialIntegrity(equiped, "maison 100 m² équipée");
  });

  it("aucun autre lot n'est modifié par les équipements déclarés", () => {
    for (const lot of base.lots) {
      if (lot.id === "second_oeuvre") continue;
      const other = equiped.lots.find((l) => l.id === lot.id)!;
      expect(other.subtotal, lot.name).toBe(lot.subtotal);
      expect(other.lines, lot.name).toEqual(lot.lines);
    }
  });

  it("aucun doublon de poste ni de lot dans le quantitatif", () => {
    for (const category of ["maison", "bureau", "local_commercial", "renovation_complete"]) {
      const dqe = run(category, { surface: 120 });
      const lotIds = dqe.lots.map((lot) => lot.id);
      expect(new Set(lotIds).size, category).toBe(lotIds.length);
      for (const lot of dqe.lots) {
        const keys = lot.lines.map(
          (line) => `${line.sousLot ?? ""}::${line.designation}`,
        );
        expect(new Set(keys).size, `${category} / ${lot.name}`).toBe(keys.length);
      }
    }
  });
});
