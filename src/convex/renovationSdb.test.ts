import { describe, it, expect } from "vitest";

import { generateDqe, type DqeResult } from "./dqeEngine";
import { REGION_COST_M2, runBIMEstimation } from "./bimEngine";
import { buildSdbEstimate } from "../lib/renovationSdbPricing";
import { regionCostFactor } from "../lib/regionImpact";

// ============================================================================
// INTÉGRATION — DQE « RÉNOVATION SALLE DE BAIN »
// ----------------------------------------------------------------------------
// Vérifie que le moteur réel produit : des prix distincts par article, les
// quantités de la pièce, les quatre scénarios, les postes optionnels, la TVA,
// la propagation d'un prix administré et la synchronisation avec le coût
// estimatif. Les autres types de projet ne doivent pas être affectés.
// ============================================================================

const CATEGORY = "renovation_salle_de_bain";

const run = (
  surface: number,
  extra: Partial<Parameters<typeof generateDqe>[0]> = {},
): DqeResult =>
  generateDqe({
    category: CATEGORY,
    surface,
    floors: 1,
    totalBudget: 250_000, // ignoré : le DQE salle de bain est au réel
    ...extra,
  });

const lines = (dqe: DqeResult) => dqe.lots.flatMap((l) => l.lines);
const lineOf = (dqe: DqeResult, designation: string) => {
  const found = lines(dqe).find((l) => l.designation === designation);
  if (!found) throw new Error(`Poste introuvable : ${designation}`);
  return found;
};

/** Normalisation identique à `normKey` du moteur DQE. */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/×/g, "x")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

describe("DQE salle de bain — structure et cohérence", () => {
  it("les huit catégories attendues sont présentes, sans doublon", () => {
    const dqe = run(5);
    expect(dqe.lots.map((l) => l.name)).toEqual([
      "Dépose et démolition",
      "Maçonnerie et préparation",
      "Étanchéité",
      "Revêtements",
      "Plomberie et évacuation",
      "Sanitaires et mobilier",
      "Électricité et ventilation",
      "Finitions",
    ]);
    const designations = lines(dqe).map((l) => l.designation);
    expect(new Set(designations).size).toBe(designations.length);
  });

  it("total = somme des lots = somme des postes, aucun lot calé sur un pourcentage", () => {
    const dqe = run(5);
    const sumLots = dqe.lots.reduce((s, l) => s + l.subtotal, 0);
    expect(dqe.totals.total).toBe(sumLots);
    for (const lot of dqe.lots) {
      expect(lot.lines.reduce((s, l) => s + l.total, 0)).toBe(lot.subtotal);
      expect(lot.allocatedSubtotal).toBe(lot.subtotal);
    }
    expect(
      dqe.totals.materiaux +
        dqe.totals.mainOeuvre +
        dqe.totals.equipements +
        dqe.totals.transport +
        dqe.totals.etudes,
    ).toBe(dqe.totals.total);
  });

  it("chaque ligne porte HT, TVA 19 % et TTC", () => {
    for (const line of lines(run(5))) {
      expect(line.vatRate).toBe(19);
      expect(line.totalHT).toBeGreaterThan(0);
      expect(line.vatAmount).toBeCloseTo((line.totalHT! * 19) / 100, 1);
      expect(Math.abs(line.total - line.quantity * line.unitPrice)).toBeLessThanOrEqual(1);
    }
  });
});

describe("prix réels, plus de montants identiques par défaut", () => {
  it("les articles phares ont des prix unitaires différents", () => {
    const dqe = run(5);
    const wc = lineOf(dqe, "WC (à poser ou suspendu)").unitPrice;
    const basin = lineOf(dqe, "Lavabo ou vasque").unitPrice;
    const tap = lineOf(dqe, "Mitigeur de lavabo").unitPrice;
    const tile = lineOf(dqe, "Carrelage de sol antidérapant (grès cérame)").unitPrice;
    expect(new Set([wc, basin, tap, tile]).size).toBe(4);
    // Fourchettes du marché tunisien 2026 (TTC).
    expect(tile).toBeGreaterThanOrEqual(15 * 1.19);
    expect(tile).toBeLessThanOrEqual(80 * 1.19);
  });

  it("les quantités de sol et de murs sont distinctes (jamais surface = revêtements)", () => {
    const dqe = run(5);
    const floor = lineOf(dqe, "Carrelage de sol antidérapant (grès cérame)").quantity;
    const wall = lineOf(dqe, "Faïence murale (20×30 ou 25×40)").quantity;
    expect(wall).toBeGreaterThan(floor);
    expect(lineOf(dqe, "Démolition carrelage et faïence").quantity).toBeGreaterThan(floor);
  });
});

describe("scénarios — grilles d'articles distinctes", () => {
  it("Économique < Standard < Premium, quantités identiques", () => {
    const eco = run(5, { scenario: "economique" });
    const std = run(5, { scenario: "standard" });
    const pre = run(5, { scenario: "premium" });
    expect(eco.totals.total).toBeLessThan(std.totals.total);
    expect(std.totals.total).toBeLessThan(pre.totals.total);

    const qty = (d: DqeResult, name: string) => lineOf(d, name).quantity;
    expect(qty(pre, "Faïence murale (20×30 ou 25×40)")).toBe(
      qty(eco, "Faïence murale (20×30 ou 25×40)"),
    );
    // Le prix change article par article, pas par un coefficient unique.
    const ecoPrices = lines(eco).map((l) => l.unitPrice);
    const prePrices = lines(pre).map((l) => l.unitPrice);
    const changed = ecoPrices.filter((p, i) => p !== prePrices[i]).length;
    expect(changed).toBeGreaterThan(10);
  });

  it("le moteur BIM expose les trois scénarios issus des mêmes articles", () => {
    const bim = runBIMEstimation(CATEGORY, 5, 1, "tunis", "standard");
    const s = bim.costEstimate.budgetScenarios!;
    expect(s.economique.totalCost).toBeLessThan(s.standard.totalCost);
    expect(s.standard.totalCost).toBeLessThan(s.premium.totalCost);
    // Le scénario Standard du moteur = somme du DQE standard (arrondis inclus),
    // avec le même coefficient régional que le backend.
    const dqe = run(5, {
      scenario: "standard",
      regionFactor: regionCostFactor(REGION_COST_M2, "tunis", "standard"),
    });
    expect(Math.abs(s.standard.totalCost - dqe.totals.total)).toBeLessThanOrEqual(
      lines(dqe).length,
    );
  });
});

describe("postes optionnels", () => {
  it("aucun équipement non sélectionné n'est facturé", () => {
    const dqe = run(5);
    const names = lines(dqe).map((l) => l.designation);
    expect(names).not.toContain("Baignoire");
    expect(names).not.toContain("Douche à l'italienne (caniveau + pente)");
    expect(names).not.toContain("Démolition localisée des cloisons et supports");

    const noWc = run(5, { sdbOptions: { toilet: false } });
    expect(lines(noWc).some((l) => l.designation === "WC (à poser ou suspendu)")).toBe(false);
    expect(noWc.totals.total).toBeLessThan(dqe.totals.total);

    const italian = run(5, { sdbOptions: { shower: "italienne" } });
    expect(lines(italian).some((l) => l.designation.startsWith("Douche à l'italienne"))).toBe(
      true,
    );
    expect(lines(italian).some((l) => l.designation.startsWith("Receveur de douche"))).toBe(
      false,
    );
  });
});

describe("prix administré — propagation au DQE et au coût global", () => {
  it("un prix saisi dans l'administration remplace le prix de référence", () => {
    const before = run(5);
    const designation = "Carrelage de sol antidérapant (grès cérame)";
    const oldPrice = lineOf(before, designation).unitPrice;
    const newPrice = Math.round(oldPrice * 1.3);

    const admin = new Map([
      [norm(designation), { unit: "m²", unitPrice: newPrice }],
    ]);
    const after = run(5, { livePrices: admin });
    const line = lineOf(after, designation);
    // Prix administré saisi TTC → prix unitaire TTC identique à l'arrondi HT/TVA.
    expect(Math.abs(line.unitPrice - newPrice)).toBeLessThanOrEqual(0.01);
    expect(line.observations).toContain("prix administré");
    expect(after.totals.total).toBeGreaterThan(before.totals.total);
    // Le reste du DQE n'est pas rééchelonné : seuls les postes concernés bougent.
    expect(lineOf(after, "Mitigeur de lavabo").unitPrice).toBe(
      lineOf(before, "Mitigeur de lavabo").unitPrice,
    );
  });
});

describe("petite et grande salle de bain", () => {
  it("les quantités et le total suivent la surface réelle", () => {
    const small = run(4);
    const large = run(8);
    expect(lineOf(large, "Carrelage de sol antidérapant (grès cérame)").quantity).toBeGreaterThan(
      lineOf(small, "Carrelage de sol antidérapant (grès cérame)").quantity,
    );
    expect(lineOf(large, "Faïence murale (20×30 ou 25×40)").quantity).toBeGreaterThan(
      lineOf(small, "Faïence murale (20×30 ou 25×40)").quantity,
    );
    expect(large.totals.total).toBeGreaterThan(small.totals.total);
  });
});

describe("isolation — les autres types de projet ne changent pas", () => {
  it("une maison conserve le calage budgétaire historique", () => {
    const budget = 180_000;
    const dqe = generateDqe({
      category: "maison",
      surface: 120,
      floors: 1,
      totalBudget: budget,
    });
    const allocated = dqe.lots.reduce((s, l) => s + (l.allocatedSubtotal ?? l.subtotal), 0);
    expect(allocated).toBe(budget);
    for (const lot of dqe.lots) {
      if (lot.id === "second_oeuvre") continue;
      expect(lot.subtotal).toBe(lot.allocatedSubtotal ?? lot.subtotal);
      expect(lot.lines.every((l) => l.vatRate === undefined)).toBe(true);
    }
  });

  it("le module salle de bain n'affecte aucun autre type", () => {
    for (const category of ["appartement", "bureau", "renovation_cuisine"]) {
      const est = buildSdbEstimate({ surface: 5 });
      expect(est.lots.length).toBeGreaterThan(0);
      const dqe = generateDqe({ category, surface: 80, floors: 1, totalBudget: 100_000 });
      expect(dqe.lots.length).toBeGreaterThan(0);
      expect(dqe.lots.every((l) => l.allocatedSubtotal !== undefined)).toBe(true);
    }
  });
});
