import { describe, it, expect } from "vitest";
import { alignDqeToBase } from "./bimBreakdown";

// DQE « hérité » : calibré sur le budget TTC (base 200 000 + imprévus 12 % = 224 000)
const LEGACY_DQE_LOTS = [
  {
    id: "gros_oeuvre",
    name: "Gros œuvre (fondations, structures)",
    percent: 40,
    subtotal: 89600,
    lines: [
      { designation: "Béton dosé", quantity: 120, unit: "m³", unitPrice: 400, total: 48000, nature: "materiaux" },
      { designation: "Acier", quantity: 80, unit: "t", unitPrice: 520, total: 41600, nature: "materiaux" },
    ],
  },
  {
    id: "second_oeuvre",
    name: "Second œuvre et finitions",
    percent: 30,
    subtotal: 67200,
    lines: [
      { designation: "Carrelage", quantity: 200, unit: "m²", unitPrice: 336, total: 67200, nature: "materiaux" },
    ],
  },
  {
    id: "main_oeuvre",
    name: "Main-d'œuvre",
    percent: 15,
    subtotal: 33600,
    lines: [
      { designation: "Main-d'œuvre globale", quantity: 1, unit: "lot", unitPrice: 33600, total: 33600, nature: "main_oeuvre" },
    ],
  },
  {
    id: "equipements",
    name: "Équipements",
    percent: 10,
    subtotal: 22400,
    lines: [
      { designation: "Sanitaires", quantity: 4, unit: "u", unitPrice: 5600, total: 22400, nature: "equipements" },
    ],
  },
  {
    id: "etudes",
    name: "Frais Préliminaires et Études",
    percent: 5,
    subtotal: 11200,
    lines: [
      { designation: "Études & permis", quantity: 1, unit: "lot", unitPrice: 11200, total: 11200, nature: "etudes" },
    ],
  },
];

describe("alignDqeToBase — Quantitatif = référence unique (sans Imprévus)", () => {
  it("réaligne un DQE TTC hérité sur la base de la grille (200 000)", () => {
    const aligned = alignDqeToBase(LEGACY_DQE_LOTS, 200000);
    expect(aligned.factor).toBeCloseTo(200000 / 224000, 5);
    // Somme des sous-totaux = base (tolérance d'arrondi par lot)
    expect(aligned.total).toBeCloseTo(200000, 0);
    const sum = aligned.lots.reduce((s, l) => s + l.subtotal, 0);
    expect(Math.abs(sum - 200000)).toBeLessThanOrEqual(5);
  });

  it("le total du quantitatif = exactement la somme des catégories de la grille", () => {
    // Grille déjà alignée : DQE calibré sur 200 000 → facteur 1, aucun changement
    const aligned = alignDqeToBase(LEGACY_DQE_LOTS, 224000);
    expect(aligned.factor).toBe(1);
    expect(aligned.total).toBe(224000);
  });

  it("montants des lignes et prix unitaires réalignés en cohérence", () => {
    const aligned = alignDqeToBase(LEGACY_DQE_LOTS, 200000);
    const lot = aligned.lots[0];
    const sumLines = lot.lines.reduce((s: number, l: any) => s + l.total, 0);
    expect(Math.abs(sumLines - lot.subtotal)).toBeLessThanOrEqual(5);
    for (const line of lot.lines) {
      expect(Math.abs(line.unitPrice * line.quantity - line.total)).toBeLessThan(1);
    }
  });

  it("aucun lot « Imprévus » ajouté — la liste reste identique", () => {
    const aligned = alignDqeToBase(LEGACY_DQE_LOTS, 200000);
    expect(aligned.lots.map((l) => l.id)).toEqual([
      "gros_oeuvre",
      "second_oeuvre",
      "main_oeuvre",
      "equipements",
      "etudes",
    ]);
    expect(aligned.lots.some((l) => l.name.toLowerCase().includes("impr\u00e9vus"))).toBe(false);
  });

  it("lots vides → facteur 1 et total 0", () => {
    const aligned = alignDqeToBase([], 200000);
    expect(aligned.factor).toBe(1);
    expect(aligned.total).toBe(0);
    expect(aligned.lots).toEqual([]);
  });

  it("base 0 → facteur 1 (aucune division par zéro)", () => {
    const aligned = alignDqeToBase(LEGACY_DQE_LOTS, 0);
    expect(aligned.factor).toBe(1);
  });
});
