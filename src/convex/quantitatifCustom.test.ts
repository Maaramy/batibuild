/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { generateDqe } from "./dqeEngine.js";
import { getCompatibleArticles } from "./quantitatifCatalog.js";
import {
  EDITABLE_LOT_IDS,
  PROTECTED_LOT_IDS,
  applyDeletions,
  budgetScenarioFactor,
  computeQuantitatifTotals,
  indexCustomizations,
  indexDeletions,
  isDeletableLot,
  isEditableLot,
  isNoopCustomization,
  isProtectedLot,
  overlayCustomizations,
  overlayRawCustomizations,
  quantitatifDeletionKey,
  quantitatifLineKey,
  scaleDqeLots,
  standardLevelFromPrice,
  unitPriceForScenario,
  type QuantitatifCustomizationEntry,
  type QuantitatifDeletionEntry,
} from "./quantitatifCustomLogic.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// Helpers
// ============================================================================

const SCENARIOS = {
  economique: { label: "Économique", totalCost: 80_000, costPerM2: 800, multiplier: 0.8 },
  standard: { label: "Standard", totalCost: 100_000, costPerM2: 1_000, multiplier: 1 },
  premium: { label: "Premium", totalCost: 125_000, costPerM2: 1_250, multiplier: 1.25 },
};

function dqeFixture() {
  const dqe = generateDqe({
    category: "villa",
    surface: 150,
    floors: 2,
    totalBudget: 100_000,
  });
  return { dqe, lots: dqe.lots, scaled: scaleDqeLots(dqe.lots, 1) };
}

/** Retrouve une ligne par sous-chaîne de désignation (robuste au libellé exact). */
function findLine(lots: any[], lotId: string, needle: string, skip = 0) {
  const lot = lots.find((l) => l.id === lotId);
  if (!lot) throw new Error(`lot ${lotId} introuvable`);
  let seen = 0;
  for (let i = 0; i < (lot.lines ?? []).length; i += 1) {
    const line = lot.lines[i];
    if (!line.designation.includes(needle)) continue;
    if (seen < skip) {
      seen += 1;
      continue;
    }
    return { lot, index: i, line };
  }
  throw new Error(`ligne contenant « ${needle} » introuvable dans ${lotId}`);
}

function entry(
  lotId: string,
  lotName: string,
  index: number,
  line: any,
  overrides: Partial<QuantitatifCustomizationEntry> = {},
): QuantitatifCustomizationEntry {
  return {
    lineKey: quantitatifLineKey(lotId, index),
    lotId,
    lotName,
    lineIndex: index,
    baseDesignation: line.designation,
    designation: line.designation,
    unit: line.unit,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    nature: line.nature,
    priceScenario: "standard",
    replacedArticle: false,
    updatedAt: 1,
    ...overrides,
  };
}

const CIMENT = "Terrassement et fondations";
const CARRELAGE = "Revêtements de sol";
const PLAQUES = "Planchers";
const ETUDE_SOL = "Étude des sols";
const GAZON = "Plantation et gazon";

/** Suppression d'une catégorie (`nature` absente) ou d'une sous-catégorie. */
function deletion(
  kind: "lot" | "nature",
  lot: any,
  nature?: string,
): QuantitatifDeletionEntry {
  return {
    kind,
    lotId: lot.id,
    lotName: lot.name,
    ...(nature ? { nature } : {}),
    deletedAt: 1,
  };
}

async function createUser(
  t: ReturnType<typeof convexTest>,
  overrides: { role?: string; email?: string } = {},
) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Client Quantitatif",
      email: overrides.email ?? "quantitatif@test.com",
      role: overrides.role ?? "user",
      status: "active",
      subscriptionPlan: "free",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

async function createProject(
  t: ReturnType<typeof convexTest>,
  userId: any,
  overrides: Record<string, unknown> = {},
) {
  return t.run(async (ctx) =>
    ctx.db.insert("projects", {
      userId,
      name: "Villa S+3",
      category: "villa",
      status: "completed",
      region: "tunis",
      surface: 150,
      floors: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    } as any),
  );
}

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

// ============================================================================
// Catégories autorisées
// ============================================================================

describe("quantitatifCustomLogic — catégories autorisées", () => {
  it("autorise uniquement les 4 catégories prévues", () => {
    expect(EDITABLE_LOT_IDS).toEqual([
      "frais_preliminaires",
      "gros_oeuvre",
      "second_oeuvre",
      "amenagements_exterieurs",
    ]);
    for (const id of EDITABLE_LOT_IDS) expect(isEditableLot(id)).toBe(true);
  });

  it("refuse toutes les autres catégories du quantitatif", () => {
    for (const id of ["vrd", "equipements", "depose_demolition", "carrelage", "", null, undefined]) {
      expect(isEditableLot(id as any)).toBe(false);
    }
  });

  it("construit une clé d'article stable", () => {
    expect(quantitatifLineKey("gros_oeuvre", 3)).toBe("gros_oeuvre::3");
  });
});

// ============================================================================
// Scénarios budgétaires
// ============================================================================

describe("quantitatifCustomLogic — scénarios budgétaires", () => {
  it("calcule le facteur d'un scénario par rapport au standard", () => {
    expect(budgetScenarioFactor(SCENARIOS, "standard")).toBe(1);
    expect(budgetScenarioFactor(SCENARIOS, "economique")).toBeCloseTo(0.8, 6);
    expect(budgetScenarioFactor(SCENARIOS, "premium")).toBeCloseTo(1.25, 6);
  });

  it("retombe sur 1 lorsque les scénarios sont absents", () => {
    expect(budgetScenarioFactor(undefined, "premium")).toBe(1);
    expect(budgetScenarioFactor({}, "premium")).toBe(1);
  });

  it("recalcule le prix unitaire selon le niveau de finition", () => {
    expect(unitPriceForScenario(1_000, SCENARIOS, "standard")).toBe(1_000);
    expect(unitPriceForScenario(1_000, SCENARIOS, "premium")).toBe(1_250);
    expect(unitPriceForScenario(1_000, SCENARIOS, "economique")).toBe(800);
  });

  it("revient au niveau de référence sans dérive cumulative", () => {
    const premium = unitPriceForScenario(1_000, SCENARIOS, "premium");
    expect(standardLevelFromPrice(premium, SCENARIOS, "premium")).toBeCloseTo(1_000, 6);
    const eco = unitPriceForScenario(1_000, SCENARIOS, "economique");
    expect(standardLevelFromPrice(eco, SCENARIOS, "economique")).toBeCloseTo(1_000, 6);
  });

  it("ne modifie jamais les scénarios d'origine", () => {
    const before = JSON.stringify(SCENARIOS);
    unitPriceForScenario(1_000, SCENARIOS, "premium");
    budgetScenarioFactor(SCENARIOS, "economique");
    expect(JSON.stringify(SCENARIOS)).toBe(before);
  });
});

// ============================================================================
// Mise à l'échelle & superposition
// ============================================================================

describe("quantitatifCustomLogic — mise à l'échelle et superposition", () => {
  it("met à l'échelle les lignes et les sous-totaux", () => {
    const { dqe } = dqeFixture();
    const scaled = scaleDqeLots(dqe.lots, 2);
    expect(scaled[0].subtotal).toBe(Math.round(dqe.lots[0].subtotal * 2));
    expect(scaled[0].lines[0].total).toBe(Math.round(dqe.lots[0].lines[0].total * 2));
  });

  it("ne touche à rien sans personnalisation", () => {
    const { scaled } = dqeFixture();
    const res = overlayCustomizations(scaled, [], { scaleFactor: 1, realCostFactor: 1 });
    expect(res.modifiedCount).toBe(0);
    expect(res.lots).toBe(scaled);
  });

  it("modifie un article et recalcule son montant", () => {
    const { scaled } = dqeFixture();
    const { lot, index, line } = findLine(scaled, "gros_oeuvre", CIMENT);
    const res = overlayCustomizations(
      scaled,
      [entry("gros_oeuvre", lot.name, index, line, { unitPrice: line.unitPrice * 2 })],
      { scaleFactor: 1, realCostFactor: 1 },
    );
    expect(res.modifiedCount).toBe(1);
    const updated = res.lots.find((l: any) => l.id === "gros_oeuvre").lines[index];
    expect(updated.customized).toBe(true);
    expect(updated.total).toBe(Math.round(line.quantity * line.unitPrice * 2));
  });

  it("additionne plusieurs modifications réparties sur plusieurs catégories", () => {
    const { scaled } = dqeFixture();
    const baseTotal = scaled.reduce((s: number, l: any) => s + l.subtotal, 0);

    const ciment = findLine(scaled, "gros_oeuvre", CIMENT);
    const etude = findLine(scaled, "frais_preliminaires", ETUDE_SOL);
    const gazon = findLine(scaled, "amenagements_exterieurs", GAZON);

    const res = overlayCustomizations(
      scaled,
      [
        entry("gros_oeuvre", ciment.lot.name, ciment.index, ciment.line, {
          unitPrice: ciment.line.unitPrice + 5,
        }),
        entry("frais_preliminaires", etude.lot.name, etude.index, etude.line, {
          unitPrice: etude.line.unitPrice + 500,
        }),
        entry("amenagements_exterieurs", gazon.lot.name, gazon.index, gazon.line, {
          quantity: gazon.line.quantity + 10,
        }),
      ],
      { scaleFactor: 1, realCostFactor: 1 },
    );

    expect(res.modifiedCount).toBe(3);
    expect(res.grandTotal).toBeGreaterThan(baseTotal);
    // Le total général reste cohérent avec la somme des sous-totaux.
    expect(res.grandTotal).toBe(
      res.lots.reduce((s: number, l: any) => s + Number(l.subtotal), 0),
    );
  });

  it("recalcule le sous-total de la catégorie modifiée", () => {
    const { scaled } = dqeFixture();
    const { lot, index, line } = findLine(scaled, "second_oeuvre", CARRELAGE);
    const res = overlayCustomizations(
      scaled,
      [entry("second_oeuvre", lot.name, index, line, { quantity: line.quantity + 50 })],
      { scaleFactor: 1, realCostFactor: 1 },
    );
    const updated = res.lots.find((l: any) => l.id === "second_oeuvre");
    expect(updated.subtotal).toBe(
      updated.lines.reduce((s: number, l: any) => s + Number(l.total), 0),
    );
    expect(updated.subtotal).toBeGreaterThan(lot.subtotal);
  });

  it("n'altère aucune autre catégorie", () => {
    const { scaled } = dqeFixture();
    const { lot, index, line } = findLine(scaled, "gros_oeuvre", CIMENT);
    const res = overlayCustomizations(
      scaled,
      [entry("gros_oeuvre", lot.name, index, line, { unitPrice: line.unitPrice + 1 })],
      { scaleFactor: 1, realCostFactor: 1 },
    );
    for (const before of scaled) {
      if (before.id === "gros_oeuvre") continue;
      const after = res.lots.find((l: any) => l.id === before.id);
      expect(after.subtotal).toBe(before.subtotal);
      expect(after.lines).toEqual(before.lines);
    }
  });

  it("remplace un article (désignation, unité, prix)", () => {
    const { scaled } = dqeFixture();
    const { lot, index, line } = findLine(scaled, "second_oeuvre", CARRELAGE);
    const res = overlayCustomizations(
      scaled,
      [
        entry("second_oeuvre", lot.name, index, line, {
          designation: "Carrelage grès cérame 90×90",
          unit: "m²",
          unitPrice: 72,
          replacedArticle: true,
        }),
      ],
      { scaleFactor: 1, realCostFactor: 1 },
    );
    const updated = res.lots.find((l: any) => l.id === "second_oeuvre").lines[index];
    expect(updated.designation).toBe("Carrelage grès cérame 90×90");
    expect(updated.unit).toBe("m²");
    expect(updated.total).toBe(Math.round(line.quantity * 72));
  });

  it("applique le facteur du scénario affiché et le facteur d'imprévus", () => {
    const { scaled } = dqeFixture();
    const { lot, index, line } = findLine(scaled, "gros_oeuvre", CIMENT);
    const res = overlayCustomizations(
      scaled,
      [entry("gros_oeuvre", lot.name, index, line, { quantity: 10, unitPrice: 20 })],
      { scaleFactor: 1.25, realCostFactor: 0.9 },
    );
    const updated = res.lots.find((l: any) => l.id === "gros_oeuvre").lines[index];
    expect(updated.total).toBe(Math.round(10 * 20 * 1.25 * 0.9));
  });

  it("retrouve un article déplacé par la désignation d'origine", () => {
    const { scaled } = dqeFixture();
    const { lot, index, line } = findLine(scaled, "gros_oeuvre", PLAQUES);
    // Le quantitatif est régénéré avec les lignes réordonnées : la ligne ciblée
    // n'occupe plus la même position mais reste identifiable.
    const reordered = scaled.map((l: any) =>
      l.id === "gros_oeuvre"
        ? { ...l, lines: [l.lines[1], l.lines[0], ...l.lines.slice(2)] }
        : l,
    );
    const res = overlayCustomizations(
      reordered,
      [entry("gros_oeuvre", lot.name, index, line, { unitPrice: line.unitPrice * 3 })],
      { scaleFactor: 1, realCostFactor: 1 },
    );
    expect(res.modifiedCount).toBe(1);
    const updated = res.lots.find((l: any) => l.id === "gros_oeuvre");
    const moved = updated.lines.find((l: any) => l.designation === line.designation);
    expect(moved.customized).toBe(true);
    expect(moved.total).toBe(Math.round(line.quantity * line.unitPrice * 3));
    // Aucun autre article du lot n'est touché.
    expect(updated.lines.filter((l: any) => l.customized).length).toBe(1);
  });

  it("n'applique jamais une modification à un autre article", () => {
    const { scaled } = dqeFixture();
    const { lot, index, line } = findLine(scaled, "gros_oeuvre", CIMENT);
    const renamed = scaled.map((l: any) =>
      l.id === "gros_oeuvre"
        ? { ...l, lines: l.lines.map((x: any, i: number) => (i === index ? { ...x, designation: "Nouvelle désignation" } : x)) }
        : l,
    );
    const res = overlayCustomizations(
      renamed,
      [entry("gros_oeuvre", lot.name, index, line, { unitPrice: line.unitPrice + 10 })],
      { scaleFactor: 1, realCostFactor: 1 },
    );
    expect(res.modifiedCount).toBe(0);
  });

  it("superpose les modifications sur le quantitatif brut (export)", () => {
    const { dqe } = dqeFixture();
    const { lot, index, line } = findLine(dqe.lots, "gros_oeuvre", CIMENT);
    const lots = overlayRawCustomizations(dqe.lots, [
      entry("gros_oeuvre", lot.name, index, line, { quantity: 3, unitPrice: 10 }),
    ]);
    const updated = lots.find((l: any) => l.id === "gros_oeuvre");
    expect(updated.lines[index].total).toBe(30);
    expect(updated.subtotal).toBe(updated.lines.reduce((s: number, l: any) => s + l.total, 0));
  });
});

// ============================================================================
// Totaux
// ============================================================================

describe("quantitatifCustomLogic — totaux", () => {
  it("recalcule les totaux par nature et le coût au m²", () => {
    const { scaled } = dqeFixture();
    const totals = computeQuantitatifTotals(scaled, 300);
    expect(totals.total).toBe(scaled.reduce((s: number, l: any) => s + l.subtotal, 0));
    expect(totals.costPerM2).toBe(Math.round(totals.total / 300));
    const materiaux = scaled
      .flatMap((l: any) => l.lines)
      .filter((l: any) => l.nature === "materiaux")
      .reduce((s: number, l: any) => s + l.total, 0);
    expect(totals.materiaux).toBe(materiaux);
  });

  it("gère une surface nulle", () => {
    const { scaled } = dqeFixture();
    expect(computeQuantitatifTotals(scaled, 0).costPerM2).toBe(0);
  });
});

// ============================================================================
// Index & détection d'absence d'effet
// ============================================================================

describe("quantitatifCustomLogic — index et absence d'effet", () => {
  it("indexe les personnalisations par clé d'article", () => {
    const { scaled } = dqeFixture();
    const { lot, index, line } = findLine(scaled, "gros_oeuvre", CIMENT);
    const map = indexCustomizations([entry("gros_oeuvre", lot.name, index, line)]);
    expect(map.size).toBe(1);
    expect(map.get(quantitatifLineKey("gros_oeuvre", index))?.designation).toBe(line.designation);
  });

  it("détecte une sauvegarde sans effet", () => {
    const base = {
      baseDesignation: "Ciment",
      designation: "Ciment",
      unit: "sac",
      baseUnit: "sac",
      quantity: 10,
      baseQuantity: 10,
      unitPrice: 14.7,
      baseUnitPrice: 14.7,
      priceScenario: "standard" as const,
    };
    expect(isNoopCustomization(base)).toBe(true);
    expect(isNoopCustomization({ ...base, unitPrice: 20 })).toBe(false);
    expect(isNoopCustomization({ ...base, quantity: 12 })).toBe(false);
    expect(isNoopCustomization({ ...base, designation: "Autre" })).toBe(false);
    expect(isNoopCustomization({ ...base, priceScenario: "premium" })).toBe(false);
  });
});

// ============================================================================
// Catégories protégées — suppression interdite
// ============================================================================

describe("quantitatifCustomLogic — catégories protégées", () => {
  it("protège Gros œuvre et Transport et autres", () => {
    expect(PROTECTED_LOT_IDS).toEqual(["gros_oeuvre", "vrd"]);
    const { scaled } = dqeFixture();
    const go = scaled.find((l: any) => l.id === "gros_oeuvre")!;
    const vrd = scaled.find((l: any) => l.id === "vrd")!;
    expect(isProtectedLot(go.id, go.name)).toBe(true);
    expect(isProtectedLot(vrd.id, vrd.name)).toBe(true);
    expect(isDeletableLot(go.id, go.name)).toBe(false);
    expect(isDeletableLot(vrd.id, vrd.name)).toBe(false);
  });

  it("protège les variantes de libellé selon le type de projet", () => {
    expect(isProtectedLot("gros_oeuvre", "Gros œuvre — reprises et réparations")).toBe(true);
    expect(isProtectedLot(undefined, "Gros œuvre (fondations, structures)")).toBe(true);
    expect(isProtectedLot(undefined, "Transports & autres")).toBe(true);
    expect(isProtectedLot(undefined, "Transport et autres")).toBe(true);
    expect(isProtectedLot("", "Transport et autres")).toBe(true);
  });

  it("autorise la suppression de toutes les autres catégories", () => {
    for (const id of [
      "frais_preliminaires",
      "second_oeuvre",
      "amenagements_exterieurs",
      "divers",
      "carrelage",
    ]) {
      expect(isProtectedLot(id, "Autre catégorie")).toBe(false);
      expect(isDeletableLot(id, "Autre catégorie")).toBe(true);
    }
    // Une catégorie sans identifiant ne peut jamais être supprimée.
    expect(isDeletableLot("", "Lot sans identifiant")).toBe(false);
    expect(isDeletableLot(null, "Lot sans identifiant")).toBe(false);
  });

  it("ne protège pas à tort les catégories voisines", () => {
    for (const name of [
      "Second œuvre et finitions",
      "Aménagements extérieurs",
      "Frais Préliminaires et Études",
      "Transport sanitaire",
      "Gros entretien",
    ]) {
      expect(isProtectedLot("autre", name)).toBe(false);
    }
  });
});

// ============================================================================
// Application des suppressions (scénario Personnalisé)
// ============================================================================

describe("quantitatifCustomLogic — suppressions", () => {
  it("supprime une catégorie, ses sous-catégories et ses lignes", () => {
    const { scaled } = dqeFixture();
    const lot = scaled.find((l: any) => l.id === "second_oeuvre")!;
    const before = scaled.reduce((s: number, l: any) => s + l.subtotal, 0);

    const res = applyDeletions(scaled, [deletion("lot", lot)]);

    expect(res.lots.find((l: any) => l.id === lot.id)).toBeUndefined();
    expect(res.deletedLots).toBe(1);
    expect(res.removedLines).toBe(lot.lines.length);
    // Sous-total et total recalculés, pourcentages cohérents.
    expect(res.lots.reduce((s: number, l: any) => s + l.subtotal, 0)).toBe(before - lot.subtotal);
    // Les catégories voisines (dont les protégées) sont intactes.
    expect(res.lots.map((l: any) => l.id)).toEqual([
      "frais_preliminaires",
      "gros_oeuvre",
      "amenagements_exterieurs",
      "vrd",
    ]);
  });

  it("supprime une seule sous-catégorie sans toucher aux autres", () => {
    const { scaled } = dqeFixture();
    const lot = scaled.find((l: any) => l.id === "second_oeuvre")!;
    const nature = lot.lines[0].nature as string;
    const removed = lot.lines.filter((l: any) => l.nature === nature);
    expect(removed.length).toBeGreaterThan(0);

    const res = applyDeletions(scaled, [deletion("nature", lot, nature)]);
    const after = res.lots.find((l: any) => l.id === lot.id)!;

    expect(after.lines.some((l: any) => l.nature === nature)).toBe(false);
    expect(after.lines.length).toBe(lot.lines.length - removed.length);
    expect(after.subtotal).toBe(
      lot.subtotal - removed.reduce((s: number, l: any) => s + l.total, 0),
    );
    expect(res.removedLines).toBe(removed.length);
    expect(res.deletedLots).toBe(0);
    // Les autres catégories gardent leurs lignes et leurs sous-totaux.
    for (const other of scaled.filter((l: any) => l.id !== lot.id)) {
      const kept = res.lots.find((l: any) => l.id === other.id)!;
      expect(kept.lines).toEqual(other.lines);
      expect(kept.subtotal).toBe(other.subtotal);
    }
  });

  it("ne modifie jamais le quantitatif d'origine", () => {
    const { scaled } = dqeFixture();
    const snapshot = JSON.stringify(scaled);
    const second = scaled.find((l: any) => l.id === "second_oeuvre")!;
    const amena = scaled.find((l: any) => l.id === "amenagements_exterieurs")!;
    applyDeletions(scaled, [
      deletion("lot", second),
      deletion("nature", amena, amena.lines[0].nature),
    ]);
    expect(JSON.stringify(scaled)).toBe(snapshot);
  });

  it("recalcule le total et le coût au m² après suppression", () => {
    const { scaled } = dqeFixture();
    const lot = scaled.find((l: any) => l.id === "second_oeuvre")!;
    const before = computeQuantitatifTotals(scaled, 300);

    const res = applyDeletions(scaled, [deletion("lot", lot)]);
    const totals = computeQuantitatifTotals(res.lots, 300);

    expect(totals.total).toBe(before.total - lot.subtotal);
    expect(totals.costPerM2).toBe(Math.round(totals.total / 300));
    expect(totals.total).toBeLessThan(before.total);
  });

  it("indexe les suppressions par clé stable et absorbe les sous-catégories", () => {
    expect(quantitatifDeletionKey({ kind: "lot", lotId: "vrd" })).toBe("lot::vrd");
    expect(
      quantitatifDeletionKey({ kind: "nature", lotId: "second_oeuvre", nature: "materiaux" }),
    ).toBe("nature::second_oeuvre::materiaux");

    const { scaled } = dqeFixture();
    const lot = scaled.find((l: any) => l.id === "second_oeuvre")!;
    const index = indexDeletions([
      deletion("nature", lot, "materiaux"),
      deletion("lot", lot),
    ]);
    expect(index.lotIds.has(lot.id)).toBe(true);
    expect(index.natureKeys.has(`${lot.id}::materiaux`)).toBe(true);
  });

  it("ignore une suppression ciblant un autre projet (aucun effet)", () => {
    const { scaled } = dqeFixture();
    const res = applyDeletions(scaled, [
      { kind: "lot", lotId: "lot_inconnu", lotName: "Ailleurs", deletedAt: 1 },
    ]);
    expect(res.lots.length).toBe(scaled.length);
    expect(res.removedLines).toBe(0);
    expect(res.deletedLots).toBe(0);
  });

  it("est sans effet sans suppression enregistrée", () => {
    const { scaled } = dqeFixture();
    expect(applyDeletions(scaled, []).lots).toBe(scaled);
    expect(applyDeletions(scaled, undefined).lots).toBe(scaled);
  });
});

// ============================================================================
// Articles compatibles
// ============================================================================

describe("quantitatifCatalog — articles compatibles", () => {
  it("propose des articles de la même catégorie de travaux", () => {
    const res = getCompatibleArticles("Revêtements de sol (carrelage grès cérame premier choix)", "m²");
    expect(res.reference).not.toBeNull();
    expect(res.articles.length).toBeGreaterThan(0);
    for (const a of res.articles) {
      expect(a.category).toBe(res.reference!.category);
      expect(a.name).not.toBe(res.reference!.name);
    }
  });

  it("place les unités compatibles en tête", () => {
    const res = getCompatibleArticles("Ciment CPJ 42.5", "sac");
    const flags = res.articles.map((a) => a.unitCompatible);
    const firstIncompatible = flags.indexOf(false);
    if (firstIncompatible >= 0) {
      expect(flags.slice(firstIncompatible).every((f) => f === false)).toBe(true);
    }
  });

  it("accepte les prix administrables (table materialPrices)", () => {
    const live = new Map([["cimentcpj425sac50kg", { unit: "sac", unitPrice: 19.9 }]]);
    const res = getCompatibleArticles("Ciment CPJ 42.5", "sac", live);
    expect(res.reference?.unitPrice).toBe(19.9);
  });

  it("retourne une liste vide pour une désignation inconnue", () => {
    expect(getCompatibleArticles("Désignation totalement inconnue", "u").articles).toEqual([]);
  });
});

// ============================================================================
// Backend — persistance du scénario Personnalisé
// ============================================================================

describe("quantitatifCustom — persistance", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function setup(needle = CIMENT, overrides: Record<string, unknown> = {}) {
    const userId = await createUser(t);
    const { dqe } = dqeFixture();
    // Le quantitatif enregistré du projet est la source de vérité du serveur
    // (quantité et prix unitaire verrouillés).
    const projectId = await createProject(t, userId, { dqe, ...overrides });
    const target = findLine(dqe.lots, "gros_oeuvre", needle);
    return { userId, projectId, dqe, target };
  }

  function saveArgs(projectId: any, target: any, overrides: Record<string, unknown> = {}) {
    // Aucune quantité ni prix unitaire : ces deux valeurs sont verrouillées et
    // relues côté serveur.
    return {
      projectId,
      lotId: "gros_oeuvre",
      lotName: target.lot.name,
      lineIndex: target.index,
      baseDesignation: target.line.designation,
      designation: `${target.line.designation} — variante`,
      unit: target.line.unit,
      nature: target.line.nature,
      priceScenario: "standard" as const,
      replacedArticle: true,
      baseScenario: "standard" as const,
      ...overrides,
    };
  }

  it("crée le scénario Personnalisé à la première modification", async () => {
    const { userId, projectId, target } = await setup();
    expect(
      await asUser(t, userId).query(api.quantitatifCustom.getCustomization, { projectId }),
    ).toBeNull();

    await asUser(t, userId).mutation(
      api.quantitatifCustom.saveItemCustomization,
      saveArgs(projectId, target),
    );

    const doc = await asUser(t, userId).query(api.quantitatifCustom.getCustomization, {
      projectId,
    });
    expect(doc?.modifiedCount).toBe(1);
    expect(doc?.baseScenario).toBe("standard");
    // Quantité et prix unitaire verrouillés : valeurs de l'article de référence.
    expect(doc?.modifications[0].quantity).toBe(target.line.quantity);
    expect(doc?.modifications[0].unitPrice).toBeCloseTo(target.line.unitPrice, 6);
    expect(doc?.modifications[0].designation).toBe(`${target.line.designation} — variante`);
  });

  it("regroupe plusieurs articles dans un seul scénario Personnalisé", async () => {
    const { userId, projectId, dqe, target } = await setup();
    const other = findLine(dqe.lots, "second_oeuvre", CARRELAGE);

    await asUser(t, userId).mutation(
      api.quantitatifCustom.saveItemCustomization,
      saveArgs(projectId, target, { baseScenario: "premium" }),
    );
    await asUser(t, userId).mutation(
      api.quantitatifCustom.saveItemCustomization,
      saveArgs(projectId, other, {
        lotId: "second_oeuvre",
        lotName: other.lot.name,
        lineIndex: other.index,
        baseDesignation: other.line.designation,
        unit: other.line.unit,
        nature: other.line.nature,
      }),
    );

    const doc = await asUser(t, userId).query(api.quantitatifCustom.getCustomization, {
      projectId,
    });
    expect(doc?.modifiedCount).toBe(2);
    // Le scénario de référence reste celui de la première modification.
    expect(doc?.baseScenario).toBe("premium");
  });

  it("met à jour la modification d'un même article sans doublon", async () => {
    const { userId, projectId, target } = await setup();
    await asUser(t, userId).mutation(
      api.quantitatifCustom.saveItemCustomization,
      saveArgs(projectId, target),
    );
    await asUser(t, userId).mutation(
      api.quantitatifCustom.saveItemCustomization,
      saveArgs(projectId, target, { designation: "Autre article", unit: "u" }),
    );
    const doc = await asUser(t, userId).query(api.quantitatifCustom.getCustomization, {
      projectId,
    });
    expect(doc?.modifiedCount).toBe(1);
    expect(doc?.modifications[0].designation).toBe("Autre article");
    expect(doc?.modifications[0].unit).toBe("u");
    // Quantité et prix unitaire restent ceux de l'article de référence.
    expect(doc?.modifications[0].quantity).toBe(target.line.quantity);
    expect(doc?.modifications[0].unitPrice).toBeCloseTo(target.line.unitPrice, 6);
  });

  it("ne crée rien pour une sauvegarde sans effet", async () => {
    const { userId, projectId, target } = await setup();
    const res = await asUser(t, userId).mutation(
      api.quantitatifCustom.saveItemCustomization,
      saveArgs(projectId, target, {
        designation: target.line.designation,
        unit: target.line.unit,
        replacedArticle: false,
      }),
    );
    expect(res.removed).toBe(true);
    expect(
      await asUser(t, userId).query(api.quantitatifCustom.getCustomization, { projectId }),
    ).toBeNull();
  });

  it("réinitialise un article puis toutes les modifications", async () => {
    const { userId, projectId, dqe, target } = await setup();
    const other = findLine(dqe.lots, "gros_oeuvre", PLAQUES);

    await asUser(t, userId).mutation(
      api.quantitatifCustom.saveItemCustomization,
      saveArgs(projectId, target),
    );
    await asUser(t, userId).mutation(
      api.quantitatifCustom.saveItemCustomization,
      saveArgs(projectId, other, {
        lineIndex: other.index,
        baseDesignation: other.line.designation,
        unit: other.line.unit,
        nature: other.line.nature,
      }),
    );

    let doc = await asUser(t, userId).query(api.quantitatifCustom.getCustomization, { projectId });
    expect(doc?.modifiedCount).toBe(2);

    await asUser(t, userId).mutation(api.quantitatifCustom.resetItemCustomization, {
      projectId,
      lineKey: quantitatifLineKey("gros_oeuvre", other.index),
    });
    doc = await asUser(t, userId).query(api.quantitatifCustom.getCustomization, { projectId });
    expect(doc?.modifiedCount).toBe(1);
    expect(doc?.modifications[0].lineKey).toBe(quantitatifLineKey("gros_oeuvre", target.index));

    await asUser(t, userId).mutation(api.quantitatifCustom.resetAllCustomizations, { projectId });
    doc = await asUser(t, userId).query(api.quantitatifCustom.getCustomization, { projectId });
    expect(doc).toBeNull();
  });

  it("supprime le scénario Personnalisé lorsqu'il ne reste plus de modification", async () => {
    const { userId, projectId, target } = await setup();
    await asUser(t, userId).mutation(
      api.quantitatifCustom.saveItemCustomization,
      saveArgs(projectId, target),
    );
    await asUser(t, userId).mutation(api.quantitatifCustom.resetItemCustomization, {
      projectId,
      lineKey: quantitatifLineKey("gros_oeuvre", target.index),
    });
    expect(
      await asUser(t, userId).query(api.quantitatifCustom.getCustomization, { projectId }),
    ).toBeNull();
  });

  it("refuse toute catégorie non autorisée", async () => {
    const { userId, projectId, dqe } = await setup();
    const vrd = dqe.lots.find((l: any) => l.id === "vrd");
    await expect(
      asUser(t, userId).mutation(api.quantitatifCustom.saveItemCustomization, {
        projectId,
        lotId: "vrd",
        lotName: vrd?.name ?? "Transports & autres",
        lineIndex: 0,
        baseDesignation: "Benne",
        designation: "Benne 8 m³",
        unit: "bennes",
        nature: "transport",
        priceScenario: "standard" as const,
        replacedArticle: false,
        baseScenario: "standard" as const,
      }),
    ).rejects.toThrow(/modifiable/i);
  });

  it("verrouille la quantité et le prix unitaire : aucune valeur client n'est acceptée", async () => {
    const { userId, projectId, target } = await setup();
    // Tentative de forçage : la quantité et le prix unitaire ne font plus
    // partie de l'API (la validation des arguments rejette tout champ
    // supplémentaire) et seraient de toute façon ignorés par le recalcul
    // serveur depuis l'article de référence.
    await expect(
      asUser(t, userId).mutation(api.quantitatifCustom.saveItemCustomization, {
        ...saveArgs(projectId, target),
        quantity: 9_999,
        unitPrice: 1,
        baseQuantity: 1,
        baseUnitPrice: 1,
      } as any),
    ).rejects.toThrow(/Unexpected field|extra field/i);

    await asUser(t, userId).mutation(
      api.quantitatifCustom.saveItemCustomization,
      saveArgs(projectId, target),
    );
    const doc = await asUser(t, userId).query(api.quantitatifCustom.getCustomization, {
      projectId,
    });
    expect(doc?.modifications[0].quantity).toBe(target.line.quantity);
    expect(doc?.modifications[0].unitPrice).toBeCloseTo(target.line.unitPrice, 6);
  });

  it("décline le prix unitaire verrouillé selon le scénario de budget", async () => {
    const { userId, projectId, target } = await setup(CIMENT, {
      costEstimate: {
        totalCost: 100_000,
        currency: "TND",
        breakdown: [],
        contingencyBuffer: 0,
        contingencyPercentage: 0,
        budgetScenarios: {
          economique: { totalCost: 80_000, costPerM2: 800, label: "Économique", multiplier: 0.8 },
          standard: { totalCost: 100_000, costPerM2: 1_000, label: "Standard", multiplier: 1 },
          premium: { totalCost: 125_000, costPerM2: 1_250, label: "Premium", multiplier: 1.25 },
        },
      },
    });

    await asUser(t, userId).mutation(
      api.quantitatifCustom.saveItemCustomization,
      saveArgs(projectId, target, { priceScenario: "premium", baseScenario: "premium" }),
    );
    const doc = await asUser(t, userId).query(api.quantitatifCustom.getCustomization, {
      projectId,
    });
    expect(doc?.modifications[0].unitPrice).toBeCloseTo(
      unitPriceForScenario(target.line.unitPrice, SCENARIOS, "premium"),
      6,
    );
    expect(doc?.modifications[0].quantity).toBe(target.line.quantity);
  });

  it("refuse un article de référence introuvable dans le quantitatif", async () => {
    const userId = await createUser(t, { email: "sans-dqe@test.com" });
    // Projet enregistré sans quantitatif : aucune référence à verrouiller.
    const projectId = await createProject(t, userId);
    await expect(
      asUser(t, userId).mutation(api.quantitatifCustom.saveItemCustomization, {
        projectId,
        lotId: "gros_oeuvre",
        lotName: "Gros œuvre (fondations, structures)",
        lineIndex: 0,
        baseDesignation: "Article inconnu",
        designation: "Article inconnu — variante",
        unit: "u",
        nature: "materiaux",
        priceScenario: "standard" as const,
        replacedArticle: false,
        baseScenario: "standard" as const,
      }),
    ).rejects.toThrow(/introuvable/i);
  });

  it("isole les personnalisations par utilisateur", async () => {
    const { userId, projectId, target } = await setup();
    const intruder = await createUser(t, { email: "intrus@test.com" });
    await asUser(t, userId).mutation(
      api.quantitatifCustom.saveItemCustomization,
      saveArgs(projectId, target),
    );
    await expect(
      asUser(t, intruder).mutation(
        api.quantitatifCustom.saveItemCustomization,
        saveArgs(projectId, target),
      ),
    ).rejects.toThrow(/Accès refusé/i);
    expect(
      await asUser(t, intruder).query(api.quantitatifCustom.getCustomization, { projectId }),
    ).toBeNull();
  });

  it("expose uniquement des articles compatibles pour les catégories autorisées", async () => {
    const { userId, projectId } = await setup();
    const res = await asUser(t, userId).query(
      api.quantitatifCustom.getCompatibleArticlesForLine,
      {
        projectId,
        lotId: "second_oeuvre",
        designation: "Revêtements de sol (carrelage grès cérame premier choix)",
        unit: "m²",
      },
    );
    expect(res.articles.length).toBeGreaterThan(0);

    const refused = await asUser(t, userId).query(
      api.quantitatifCustom.getCompatibleArticlesForLine,
      { projectId, lotId: "vrd", designation: "Benne", unit: "u" },
    );
    expect(refused.articles).toEqual([]);
    expect(refused.reference).toBeNull();
  });
});

// ============================================================================
// Backend — suppression de catégories / sous-catégories
// ============================================================================

describe("quantitatifCustom — suppression de catégories / sous-catégories", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function setup() {
    const userId = await createUser(t, { email: "suppression@test.com" });
    const { dqe } = dqeFixture();
    const projectId = await createProject(t, userId, { dqe });
    return { userId, projectId, dqe };
  }

  const standard = "standard" as const;

  async function getDoc(userId: string, projectId: any) {
    return asUser(t, userId).query(api.quantitatifCustom.getCustomization, { projectId });
  }

  it("refuse la suppression de Gros œuvre et de Transport et autres", async () => {
    const { userId, projectId, dqe } = await setup();
    for (const lotId of ["gros_oeuvre", "vrd"]) {
      await expect(
        asUser(t, userId).mutation(api.quantitatifCustom.deleteQuantitatifStructure, {
          projectId,
          lotId,
          baseScenario: standard,
        }),
      ).rejects.toThrow(/protégée/i);
    }
    // Aucune suppression enregistrée, quantitatif du projet intact.
    expect(await getDoc(userId, projectId)).toBeNull();
    const project = await t.run(async (ctx) => ctx.db.get(projectId));
    expect((project as any).dqe.lots.length).toBe(dqe.lots.length);
  });

  it("refuse aussi la suppression d'une sous-catégorie protégée", async () => {
    const { userId, projectId } = await setup();
    const protectedTargets: [string, string][] = [
      ["gros_oeuvre", "materiaux"],
      ["vrd", "transport"],
    ];
    for (const [lotId, nature] of protectedTargets) {
      await expect(
        asUser(t, userId).mutation(api.quantitatifCustom.deleteQuantitatifStructure, {
          projectId,
          lotId,
          nature,
          baseScenario: standard,
        }),
      ).rejects.toThrow(/protégée/i);
    }
    expect(await getDoc(userId, projectId)).toBeNull();
  });

  it("supprime une catégorie autorisée, ses sous-catégories et recalcule le total", async () => {
    const { userId, projectId, dqe } = await setup();
    const lot = dqe.lots.find((l: any) => l.id === "second_oeuvre")!;
    const before = computeQuantitatifTotals(dqe.lots, 300).total;

    const res = await asUser(t, userId).mutation(
      api.quantitatifCustom.deleteQuantitatifStructure,
      { projectId, lotId: lot.id, baseScenario: standard },
    );
    expect(res.kind).toBe("lot");
    expect(res.removedLines).toBe(lot.lines.length);

    const doc = await getDoc(userId, projectId);
    expect(doc?.deletions.length).toBe(1);
    expect(doc?.deletions[0]).toMatchObject({ kind: "lot", lotId: lot.id });
    expect(doc?.deletedCount).toBe(1);

    // Le quantitatif du scénario Personnalisé ne contient plus la catégorie et
    // son total est recalculé (coût global et coût au m²).
    const applied = applyDeletions(dqe.lots, doc!.deletions as QuantitatifDeletionEntry[]);
    expect(applied.lots.some((l: any) => l.id === lot.id)).toBe(false);
    const totals = computeQuantitatifTotals(applied.lots, 300);
    expect(totals.total).toBe(before - lot.subtotal);
    expect(totals.costPerM2).toBe(Math.round(totals.total / 300));

    // Le quantitatif enregistré du projet (données partagées) est intact.
    const project = await t.run(async (ctx) => ctx.db.get(projectId));
    expect((project as any).dqe.lots.length).toBe(dqe.lots.length);
  });

  it("supprime une seule sous-catégorie et laisse les autres intactes", async () => {
    const { userId, projectId, dqe } = await setup();
    const lot = dqe.lots.find((l: any) => l.id === "second_oeuvre")!;
    const nature = lot.lines[0].nature as string;

    await asUser(t, userId).mutation(api.quantitatifCustom.deleteQuantitatifStructure, {
      projectId,
      lotId: lot.id,
      nature,
      baseScenario: standard,
    });

    const doc = await getDoc(userId, projectId);
    expect(doc?.deletions.length).toBe(1);
    expect(doc?.deletions[0]).toMatchObject({ kind: "nature", lotId: lot.id, nature });

    const applied = applyDeletions(dqe.lots, doc!.deletions as QuantitatifDeletionEntry[]);
    const after = applied.lots.find((l: any) => l.id === lot.id)!;
    expect(after.lines.some((l: any) => l.nature === nature)).toBe(false);
    expect(after.lines.length).toBeGreaterThan(0);
    // Aucune autre catégorie n'est retirée.
    expect(applied.lots.map((l: any) => l.id)).toEqual(dqe.lots.map((l: any) => l.id));
  });

  it("est idempotent et une catégorie absorbe ses sous-catégories", async () => {
    const { userId, projectId } = await setup();
    const args = { projectId, lotId: "second_oeuvre", baseScenario: standard };
    await asUser(t, userId).mutation(
      api.quantitatifCustom.deleteQuantitatifStructure,
      args,
    );
    await asUser(t, userId).mutation(
      api.quantitatifCustom.deleteQuantitatifStructure,
      args,
    );
    await asUser(t, userId).mutation(api.quantitatifCustom.deleteQuantitatifStructure, {
      ...args,
      nature: "materiaux",
    });

    const doc = await getDoc(userId, projectId);
    expect(doc?.deletions.length).toBe(1);
    expect(doc?.deletions[0].kind).toBe("lot");
  });

  it("retire les personnalisations d'articles des lignes supprimées", async () => {
    const { userId, projectId, dqe } = await setup();
    const target = findLine(dqe.lots, "second_oeuvre", CARRELAGE);
    const other = findLine(dqe.lots, "amenagements_exterieurs", GAZON);

    await asUser(t, userId).mutation(api.quantitatifCustom.saveItemCustomization, {
      projectId,
      lotId: "second_oeuvre",
      lotName: target.lot.name,
      lineIndex: target.index,
      baseDesignation: target.line.designation,
      designation: `${target.line.designation} — variante`,
      unit: target.line.unit,
      nature: target.line.nature,
      priceScenario: standard,
      replacedArticle: true,
      baseScenario: standard,
    });
    await asUser(t, userId).mutation(api.quantitatifCustom.saveItemCustomization, {
      projectId,
      lotId: "amenagements_exterieurs",
      lotName: other.lot.name,
      lineIndex: other.index,
      baseDesignation: other.line.designation,
      designation: `${other.line.designation} — variante`,
      unit: other.line.unit,
      nature: other.line.nature,
      priceScenario: "premium",
      replacedArticle: false,
      baseScenario: standard,
    });

    await asUser(t, userId).mutation(api.quantitatifCustom.deleteQuantitatifStructure, {
      projectId,
      lotId: "second_oeuvre",
      baseScenario: standard,
    });

    const doc = await getDoc(userId, projectId);
    expect(doc?.modifications.length).toBe(1);
    expect(doc?.modifications[0].lotId).toBe("amenagements_exterieurs");
    expect(doc?.deletions.length).toBe(1);
  });

  it("conserve les suppressions après réinitialisation d'un article", async () => {
    const { userId, projectId, dqe } = await setup();
    const other = findLine(dqe.lots, "amenagements_exterieurs", GAZON);

    await asUser(t, userId).mutation(api.quantitatifCustom.deleteQuantitatifStructure, {
      projectId,
      lotId: "second_oeuvre",
      baseScenario: standard,
    });
    await asUser(t, userId).mutation(api.quantitatifCustom.saveItemCustomization, {
      projectId,
      lotId: "amenagements_exterieurs",
      lotName: other.lot.name,
      lineIndex: other.index,
      baseDesignation: other.line.designation,
      designation: `${other.line.designation} — variante`,
      unit: other.line.unit,
      nature: other.line.nature,
      priceScenario: "premium",
      replacedArticle: false,
      baseScenario: standard,
    });
    // La réinitialisation du dernier article ne doit pas effacer la suppression.
    await asUser(t, userId).mutation(api.quantitatifCustom.resetItemCustomization, {
      projectId,
      lineKey: quantitatifLineKey("amenagements_exterieurs", other.index),
    });

    const doc = await getDoc(userId, projectId);
    expect(doc).not.toBeNull();
    expect(doc?.modifiedCount).toBe(0);
    expect(doc?.deletions.length).toBe(1);

    // Réinitialisation totale : le scénario Personnalisé (suppressions incluses)
    // disparaît, les données d'origine restent inchangées.
    await asUser(t, userId).mutation(api.quantitatifCustom.resetAllCustomizations, {
      projectId,
    });
    expect(await getDoc(userId, projectId)).toBeNull();
    const project = await t.run(async (ctx) => ctx.db.get(projectId));
    expect((project as any).dqe.lots.length).toBe(dqe.lots.length);
  });

  it("refuse une catégorie ou une sous-catégorie introuvable", async () => {
    const { userId, projectId } = await setup();
    await expect(
      asUser(t, userId).mutation(api.quantitatifCustom.deleteQuantitatifStructure, {
        projectId,
        lotId: "categorie_inexistante",
        baseScenario: standard,
      }),
    ).rejects.toThrow(/introuvable/i);
    await expect(
      asUser(t, userId).mutation(api.quantitatifCustom.deleteQuantitatifStructure, {
        projectId,
        lotId: "second_oeuvre",
        nature: "sous_categorie_inexistante",
        baseScenario: standard,
      }),
    ).rejects.toThrow(/introuvable/i);
  });

  it("isole les suppressions par utilisateur et par projet", async () => {
    const { userId, projectId } = await setup();
    const intruder = await createUser(t, { email: "intrus-suppression@test.com" });
    const otherProject = await createProject(t, intruder, {
      dqe: dqeFixture().dqe,
      name: "Projet de l'intrus",
      category: "maison",
    });

    await expect(
      asUser(t, intruder).mutation(api.quantitatifCustom.deleteQuantitatifStructure, {
        projectId,
        lotId: "second_oeuvre",
        baseScenario: standard,
      }),
    ).rejects.toThrow(/Accès refusé/i);

    await asUser(t, userId).mutation(api.quantitatifCustom.deleteQuantitatifStructure, {
      projectId,
      lotId: "second_oeuvre",
      baseScenario: standard,
    });

    // La suppression du projet A n'apparaît ni pour l'autre utilisateur, ni sur
    // son propre projet.
    expect(await getDoc(intruder, projectId)).toBeNull();
    expect(await getDoc(intruder, otherProject)).toBeNull();
    const otherUserDoc = await getDoc(userId, otherProject);
    expect(otherUserDoc).toBeNull();
  });
});
