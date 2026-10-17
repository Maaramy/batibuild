/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { generateDqe, normalizeDesignationKey } from "./dqeEngine.js";
import { getCompatibleArticles } from "./quantitatifCatalog.js";
import {
  DELETE_POSTE_CONFIRMATION,
  EDITABLE_LOT_IDS,
  PROTECTED_POSTE_LOT_IDS,
  PROTECTED_POSTE_MESSAGE,
  BUDGET_SCENARIO_KEYS,
  applyPosteRemovals,
  articlePopupUnitPrice,
  budgetScenarioFactor,
  computeQuantitatifTotals,
  indexCustomizations,
  indexPosteRemovals,
  isEditableLot,
  isNoopCustomization,
  isPosteDeletable,
  isProtectedPosteLot,
  normalizePosteKey,
  overlayCustomizations,
  overlayRawCustomizations,
  posteProtectionReason,
  quantitatifLineKey,
  quantitatifPosteKey,
  scaleDqeLots,
  standardLevelFromPrice,
  unitPriceForScenario,
  type QuantitatifCustomizationEntry,
  type QuantitatifPosteRemovalEntry,
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

  it("affiche dans le popup les mêmes données que le scénario Standard", () => {
    const standard = unitPriceForScenario(65, SCENARIOS, "standard");
    // Le tableau du quantitatif, lui, continue de varier par scénario.
    expect(unitPriceForScenario(65, SCENARIOS, "economique")).not.toBe(standard);
    expect(unitPriceForScenario(65, SCENARIOS, "premium")).not.toBe(standard);

    // Popup : un seul prix, celui du Standard, quel que soit le scénario.
    expect(articlePopupUnitPrice(standard)).toBe(standard);
    expect(articlePopupUnitPrice(standard)).toBe(articlePopupUnitPrice(65));

    // Un article déjà enregistré à un autre niveau est ramené au Standard
    // (aucune dérive cumulative, aucun autre prix affiché).
    for (const key of BUDGET_SCENARIO_KEYS) {
      const stored = unitPriceForScenario(65, SCENARIOS, key);
      const back = standardLevelFromPrice(stored, SCENARIOS, key);
      expect(articlePopupUnitPrice(back)).toBe(standard);
    }

    // Correction des anciennes marges d'imprévus : conservée (ce n'est pas un
    // facteur de scénario).
    expect(articlePopupUnitPrice(65, 1 / 1.1)).toBeCloseTo(59.09, 2);
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
// Suppression d'un poste — clé stable et protections
// ============================================================================

/** Entrée de suppression d'un poste (écrite par la mutation, jamais par le client). */
function removal(
  lotId: string,
  lotName: string,
  index: number,
  line: any,
  overrides: Partial<QuantitatifPosteRemovalEntry> = {},
): QuantitatifPosteRemovalEntry {
  return {
    lineKey: quantitatifLineKey(lotId, index),
    lotId,
    lotName,
    designation: line.designation,
    nature: line.nature,
    amount: Math.round(line.quantity * line.unitPrice),
    removedAt: 1,
    ...overrides,
  };
}

/** Poste du gabarit résidentiel qui n'est ni structure, ni réseau, ni étude. */
const POSTE_LIBRE = "Cuisine équipée";

describe("quantitatifCustomLogic — clé stable et protections de poste", () => {
  it("utilise la même normalisation de libellé que le moteur DQE", () => {
    for (const label of [
      "Étude des sols (géotechnique)",
      "Menuiserie extérieure (fenêtres et portes-fenêtres PVC double vitrage)",
      "Dalle 40×40",
      "Cuisine équipée",
      "   ",
    ]) {
      expect(normalizePosteKey(label)).toBe(normalizeDesignationKey(label));
    }
    // La clé de poste combine l'identifiant stable de catégorie et le libellé.
    expect(quantitatifPosteKey("second_oeuvre", "Cuisine équipée")).toBe(
      "second_oeuvre::cuisineequipee",
    );
  });

  it("protège Gros œuvre et Transport et autres (tous leurs postes)", () => {
    expect(PROTECTED_POSTE_LOT_IDS).toEqual(["gros_oeuvre", "vrd"]);
    for (const category of [
      "maison",
      "villa",
      "appartement",
      "immeuble",
      "renovation_complete",
      "renovation_cuisine",
    ]) {
      const dqe = generateDqe({ category, surface: 150, floors: 2, totalBudget: 120_000 });
      let checked = 0;
      for (const lot of dqe.lots) {
        if (!isProtectedPosteLot(lot.id, lot.name)) continue;
        for (const line of lot.lines) {
          checked += 1;
          expect(
            isPosteDeletable({
              lotId: lot.id,
              lotName: lot.name,
              designation: line.designation,
              nature: line.nature,
            }),
            `${category} · ${lot.name} · ${line.designation}`,
          ).toBe(false);
        }
      }
      expect(checked, category).toBeGreaterThan(0);
    }
    // Variantes de libellé selon le type de projet (repli par libellé).
    expect(isProtectedPosteLot("gros_oeuvre", "Gros œuvre — reprises et réparations")).toBe(true);
    expect(isProtectedPosteLot(undefined, "Transports & autres")).toBe(true);
    expect(isProtectedPosteLot("", "Transport et autres")).toBe(true);
    // Les catégories voisines ne sont pas protégées à tort.
    expect(isProtectedPosteLot("second_oeuvre", "Second œuvre et finitions")).toBe(false);
    expect(isProtectedPosteLot("amenagements_exterieurs", "Aménagements extérieurs")).toBe(false);
  });

  it("protège les postes d'études et de permis (essentiels au DQE)", () => {
    const dqe = generateDqe({ category: "maison", surface: 120, floors: 1, totalBudget: 100_000 });
    const lot = dqe.lots.find((l) => l.id === "frais_preliminaires")!;
    expect(lot.lines.length).toBeGreaterThan(0);
    for (const line of lot.lines) {
      expect(line.nature).toBe("etudes");
      expect(
        posteProtectionReason({
          lotId: lot.id,
          lotName: lot.name,
          designation: line.designation,
          nature: line.nature,
        }),
      ).toContain("études");
    }
  });

  it("protège les postes porteurs (enveloppe, réseaux, sécurité)", () => {
    const dqe = generateDqe({ category: "maison", surface: 120, floors: 1, totalBudget: 100_000 });
    const second = dqe.lots.find((l) => l.id === "second_oeuvre")!;
    const amena = dqe.lots.find((l) => l.id === "amenagements_exterieurs")!;
    const targets: [any, string][] = [
      [second, "Enduits intérieurs"],
      [second, "Menuiserie extérieure"],
      [second, "Plomberie sanitaire"],
      [second, "Électricité"],
      [second, "VMC"],
      [second, "Garde-corps"],
      [amena, "Clôture"],
      [amena, "Drainage"],
    ];
    for (const [lot, needle] of targets) {
      const line = lot.lines.find((l: any) => l.designation.includes(needle));
      expect(line, `${lot.name} · ${needle}`).toBeDefined();
      expect(
        isPosteDeletable({
          lotId: lot.id,
          lotName: lot.name,
          designation: line!.designation,
          nature: line!.nature,
        }),
        `${lot.name} · ${needle}`,
      ).toBe(false);
    }
  });

  it("autorise la suppression des finitions et équipements non porteurs", () => {
    const dqe = generateDqe({ category: "maison", surface: 120, floors: 1, totalBudget: 100_000 });
    const allowed: [string, string][] = [
      ["second_oeuvre", "Revêtements de sol"],
      ["second_oeuvre", "Peinture intérieure"],
      ["second_oeuvre", "Cuisine équipée"],
      ["second_oeuvre", "Climatisation"],
      ["second_oeuvre", "Faux plafonds"],
      ["second_oeuvre", "Luminaires intérieurs"],
      ["second_oeuvre", "Miroir et accessoires"],
      ["amenagements_exterieurs", "Portail d'accès"],
      ["amenagements_exterieurs", "Allées et terrasses"],
      ["amenagements_exterieurs", "Plantation et gazon"],
      ["amenagements_exterieurs", "Éclairage extérieur"],
    ];
    for (const [lotId, needle] of allowed) {
      const lot = dqe.lots.find((l) => l.id === lotId)!;
      const line = lot.lines.find((l) => l.designation.includes(needle));
      expect(line, `${lotId} · ${needle}`).toBeDefined();
      expect(
        posteProtectionReason({
          lotId,
          lotName: lot.name,
          designation: line!.designation,
          nature: line!.nature,
        }),
        `${lotId} · ${needle}`,
      ).toBeNull();
    }
  });

  it("protège par défaut tout poste non identifiable", () => {
    expect(
      isPosteDeletable({ lotId: "", lotName: "Second œuvre", designation: "Peinture", nature: "materiaux" }),
    ).toBe(false);
    expect(
      isPosteDeletable({ lotId: "second_oeuvre", lotName: "Second œuvre", designation: "", nature: "materiaux" }),
    ).toBe(false);
    expect(
      isPosteDeletable({ lotId: "second_oeuvre", lotName: "Second œuvre", designation: null, nature: null }),
    ).toBe(false);
  });

  it("expose les messages exacts attendus par le produit", () => {
    expect(DELETE_POSTE_CONFIRMATION).toBe(
      "Voulez-vous vraiment supprimer ce poste ? Cette opération modifiera le quantitatif et le coût total de votre projet.",
    );
    expect(PROTECTED_POSTE_MESSAGE).toBe("Poste protégé — suppression interdite");
  });
});

// ============================================================================
// Suppression d'un poste — application au scénario Personnalisé
// ============================================================================

describe("quantitatifCustomLogic — application des suppressions de poste", () => {
  it("retire le poste ciblé, garde ses voisins et recalcule les totaux", () => {
    const { scaled } = dqeFixture();
    const lot = scaled.find((l: any) => l.id === "second_oeuvre")!;
    const target = lot.lines.find((l: any) => l.designation === POSTE_LIBRE)!;
    const index = lot.lines.indexOf(target);
    const before = computeQuantitatifTotals(scaled, 300);

    const res = applyPosteRemovals(scaled, [removal(lot.id, lot.name, index, target)]);
    const after = res.lots.find((l) => l.id === lot.id)!;

    expect(res.removedLines).toBe(1);
    expect(after.lines.some((l: any) => l.designation === POSTE_LIBRE)).toBe(false);
    expect(after.lines.length).toBe(lot.lines.length - 1);
    // Toutes les autres sous-catégories (natures) et tous les autres postes
    // restent strictement identiques.
    for (const line of lot.lines) {
      if (line.designation === POSTE_LIBRE) continue;
      expect(after.lines.find((l: any) => l.designation === line.designation)).toEqual(line);
    }
    expect(after.subtotal).toBe(lot.subtotal - target.total);
    // Coût global et coût au m² recalculés.
    const totals = computeQuantitatifTotals(res.lots, 300);
    expect(totals.total).toBe(before.total - target.total);
    expect(totals.costPerM2).toBe(Math.round(totals.total / 300));
    // Total affiché = somme des sous-totaux affichés (aucun écart).
    expect(totals.total).toBe(res.lots.reduce((s, l) => s + l.subtotal, 0));
    const sumPercent = res.lots.reduce((s, l) => s + l.percent, 0);
    expect(sumPercent).toBeGreaterThanOrEqual(99.5);
    expect(sumPercent).toBeLessThanOrEqual(100.5);
    // Les autres catégories ne perdent ni ligne ni sous-total (leurs lignes
    // restent les mêmes objets : aucune donnée du projet n'est recopiée).
    for (const other of scaled.filter((l) => l.id !== lot.id)) {
      const kept = res.lots.find((l) => l.id === other.id)!;
      expect(kept.subtotal).toBe(other.subtotal);
      expect(kept.lines).toBe(other.lines);
    }
  });

  it("ne modifie jamais le quantitatif d'origine (DQE et scénarios intacts)", () => {
    const { scaled } = dqeFixture();
    const lot = scaled.find((l: any) => l.id === "second_oeuvre")!;
    const target = lot.lines.find((l: any) => l.designation === POSTE_LIBRE)!;
    const snapshot = JSON.stringify(scaled);
    applyPosteRemovals(scaled, [removal(lot.id, lot.name, lot.lines.indexOf(target), target)]);
    expect(JSON.stringify(scaled)).toBe(snapshot);
  });

  it("retrouve le poste par sa clé stable après régénération du quantitatif", () => {
    const { scaled } = dqeFixture();
    const lot = scaled.find((l: any) => l.id === "second_oeuvre")!;
    const target = lot.lines.find((l: any) => l.designation === POSTE_LIBRE)!;
    const indexAvant = lot.lines.indexOf(target);
    // Le quantitatif est régénéré : une ligne a été insérée, toutes les
    // positions ont bougé, les postes sont les mêmes.
    const regenerated = [
      {
        ...lot,
        lines: [
          { designation: "Nouveau poste", quantity: 1, unitPrice: 10, total: 10, nature: "materiaux" },
          ...lot.lines,
        ],
      },
    ];
    const res = applyPosteRemovals(regenerated as any, [
      removal(lot.id, lot.name, indexAvant, target),
    ]);
    const after = res.lots[0];
    expect(res.removedLines).toBe(1);
    expect(after.lines.some((l: any) => l.designation === POSTE_LIBRE)).toBe(false);
    expect(after.lines.some((l: any) => l.designation === "Nouveau poste")).toBe(true);
  });

  it("ne retire jamais un poste au hasard d'après sa seule position", () => {
    const { scaled } = dqeFixture();
    const lot = scaled.find((l: any) => l.id === "second_oeuvre")!;
    const target = lot.lines.find((l: any) => l.designation === POSTE_LIBRE)!;
    const index = lot.lines.indexOf(target);
    // La ligne enregistrée n'existe plus à cette position : un autre poste y est.
    const remplacelot = {
      ...lot,
      lines: lot.lines.map((l: any, i: number) =>
        i === index
          ? { designation: "Poste tout autre", quantity: 1, unitPrice: 10, total: 10, nature: "materiaux" }
          : l,
      ),
    };
    const res = applyPosteRemovals([remplacelot as any], [removal(lot.id, lot.name, index, target)]);
    expect(res.removedLines).toBe(0);
    expect(res.lots[0].lines.length).toBe(remplacelot.lines.length);
  });

  it("ignore une suppression inconnue (autre projet) et reste sans effet si vide", () => {
    const { scaled } = dqeFixture();
    const inconnu = applyPosteRemovals(scaled, [
      {
        lineKey: "lot_inconnu::0",
        lotId: "lot_inconnu",
        lotName: "Ailleurs",
        designation: "Poste",
        nature: "materiaux",
        amount: 1,
        removedAt: 1,
      },
    ]);
    expect(inconnu.removedLines).toBe(0);
    expect(inconnu.lots).toBe(scaled);
    expect(applyPosteRemovals(scaled, []).lots).toBe(scaled);
    expect(applyPosteRemovals(scaled, undefined).lots).toBe(scaled);
  });

  it("indexe les suppressions par position et par clé stable", () => {
    const { scaled } = dqeFixture();
    const lot = scaled.find((l: any) => l.id === "second_oeuvre")!;
    const target = lot.lines.find((l: any) => l.designation === POSTE_LIBRE)!;
    const index = indexPosteRemovals([
      removal(lot.id, lot.name, lot.lines.indexOf(target), target),
    ]);
    expect(index.byLineKey.size).toBe(1);
    expect(index.byPosteKey.has(quantitatifPosteKey(lot.id, POSTE_LIBRE))).toBe(true);
  });
});

// ============================================================================
// Backend — suppression d'un poste (« Modifier l'article »)
// ============================================================================

describe("quantitatifCustom — suppression d'un poste", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function setup(overrides: Record<string, unknown> = {}) {
    const userId = await createUser(t, { email: "poste@test.com" });
    const { dqe } = dqeFixture();
    const projectId = await createProject(t, userId, { dqe, ...overrides });
    return { userId, projectId, dqe };
  }

  const removeArgs = (projectId: any, lot: any, index: number, line: any) => ({
    projectId,
    lotId: lot.id,
    lineIndex: index,
    baseDesignation: line.designation,
    baseScenario: "standard" as const,
  });

  const getDoc = (userId: string, projectId: any) =>
    asUser(t, userId).query(api.quantitatifCustom.getCustomization, { projectId });

  /** Reproduit exactement le calcul de la page : référence → suppressions. */
  function personalized(dqeLots: any[], removed: any[], surface: number) {
    const baseFactor = budgetScenarioFactor(SCENARIOS, "standard");
    const scaled = scaleDqeLots(dqeLots, baseFactor);
    const overlay = overlayCustomizations(scaled, [], {
      scaleFactor: baseFactor,
      realCostFactor: 1,
    });
    const applied = applyPosteRemovals(overlay.lots, removed as QuantitatifPosteRemovalEntry[]);
    return { lots: applied.lots, totals: computeQuantitatifTotals(applied.lots, surface) };
  }

  it("supprime un poste autorisé et synchronise le scénario Personnalisé", async () => {
    const { userId, projectId, dqe } = await setup();
    const lot = dqe.lots.find((l) => l.id === "second_oeuvre")!;
    const target = lot.lines.find((l: any) => l.designation === POSTE_LIBRE)!;
    const index = lot.lines.indexOf(target);
    const before = computeQuantitatifTotals(dqe.lots, 300);

    const res = await asUser(t, userId).mutation(
      api.quantitatifCustom.removeQuantitatifPoste,
      removeArgs(projectId, lot, index, target),
    );
    expect(res.designation).toBe(target.designation);
    expect(res.nature).toBe(target.nature);
    expect(res.amount).toBe(Math.round(target.quantity * target.unitPrice));

    const doc = await getDoc(userId, projectId);
    expect(doc?.removedCount).toBe(1);
    expect(doc?.removedPostes[0]).toMatchObject({
      lineKey: quantitatifLineKey(lot.id, index),
      lotId: lot.id,
      designation: target.designation,
      nature: target.nature,
    });

    // Le Quantitatif détaillé affiché = référence moins le poste supprimé,
    // sous-totaux et coût global recalculés.
    const page = personalized(dqe.lots, doc!.removedPostes, 300);
    const after = page.lots.find((l: any) => l.id === lot.id)!;
    expect(page.totals.total).toBe(before.total - target.total);
    expect(page.totals.costPerM2).toBe(Math.round(page.totals.total / 300));
    expect(after.subtotal).toBe(lot.subtotal - target.total);
    expect(after.lines.some((l: any) => l.designation === POSTE_LIBRE)).toBe(false);
    // Montant du scénario Personnalisé = Quantitatif détaillé affiché.
    expect(page.totals.total).toBe(page.lots.reduce((s: number, l: any) => s + l.subtotal, 0));
    // Le quantitatif du projet (données partagées, DQE, autres scénarios) est intact.
    const project = await t.run(async (ctx) => ctx.db.get(projectId));
    expect((project as any).dqe.lots).toEqual(dqe.lots);
  });

  it("refuse tout poste de Gros œuvre et de Transport et autres", async () => {
    const { userId, projectId, dqe } = await setup();
    for (const lotId of ["gros_oeuvre", "vrd"]) {
      const lot = dqe.lots.find((l) => l.id === lotId)!;
      expect(lot.lines.length).toBeGreaterThan(0);
      for (let index = 0; index < lot.lines.length; index += 1) {
        await expect(
          asUser(t, userId).mutation(
            api.quantitatifCustom.removeQuantitatifPoste,
            removeArgs(projectId, lot, index, lot.lines[index]),
          ),
          `${lot.name} · ${lot.lines[index].designation}`,
        ).rejects.toThrow(/Poste protégé — suppression interdite/i);
      }
    }
    // Aucune suppression enregistrée, aucune donnée modifiée.
    expect(await getDoc(userId, projectId)).toBeNull();
    const project = await t.run(async (ctx) => ctx.db.get(projectId));
    expect((project as any).dqe.lots).toEqual(dqe.lots);
  });

  it("refuse les postes d'études et les postes porteurs (enveloppe, réseaux)", async () => {
    const { userId, projectId, dqe } = await setup();
    const targets: [string, string][] = [
      ["frais_preliminaires", "Étude des sols"],
      ["frais_preliminaires", "permis de construire"],
      ["second_oeuvre", "Menuiserie extérieure"],
      ["second_oeuvre", "Plomberie sanitaire"],
      ["second_oeuvre", "Électricité"],
      ["second_oeuvre", "VMC"],
      ["second_oeuvre", "Garde-corps"],
      ["amenagements_exterieurs", "Clôture"],
      ["amenagements_exterieurs", "Drainage"],
    ];
    for (const [lotId, needle] of targets) {
      const lot = dqe.lots.find((l) => l.id === lotId)!;
      const line = lot.lines.find((l) => l.designation.includes(needle));
      expect(line, `${lotId} · ${needle}`).toBeDefined();
      await expect(
        asUser(t, userId).mutation(
          api.quantitatifCustom.removeQuantitatifPoste,
          removeArgs(projectId, lot, lot.lines.indexOf(line!), line!),
        ),
        `${lotId} · ${needle}`,
      ).rejects.toThrow(/Poste protégé — suppression interdite/i);
    }
    expect(await getDoc(userId, projectId)).toBeNull();
  });

  it("refuse une catégorie non personnalisable et un poste introuvable", async () => {
    const userId = await createUser(t, { email: "poste-renov@test.com" });
    const dqe = generateDqe({
      category: "renovation_complete",
      surface: 120,
      floors: 1,
      totalBudget: 90_000,
    });
    const projectId = await createProject(t, userId, { dqe, category: "renovation_complete" });

    // « Équipements techniques » n'est pas une catégorie personnalisable.
    const equip = dqe.lots.find((l) => l.id === "equipements")!;
    await expect(
      asUser(t, userId).mutation(
        api.quantitatifCustom.removeQuantitatifPoste,
        removeArgs(projectId, equip, 0, equip.lines[0]),
      ),
    ).rejects.toThrow(/n'est pas modifiable/i);

    // Poste et catégorie inexistants.
    const second = dqe.lots.find((l) => l.id === "second_oeuvre")!;
    await expect(
      asUser(t, userId).mutation(api.quantitatifCustom.removeQuantitatifPoste, {
        projectId,
        lotId: "second_oeuvre",
        lineIndex: 999,
        baseDesignation: "Poste inexistant",
        baseScenario: "standard" as const,
      }),
    ).rejects.toThrow(/introuvable/i);
    await expect(
      asUser(t, userId).mutation(api.quantitatifCustom.removeQuantitatifPoste, {
        projectId,
        lotId: "categorie_inexistante",
        lineIndex: 0,
        baseDesignation: second.lines[0].designation,
        baseScenario: "standard" as const,
      }),
    ).rejects.toThrow(/introuvable/i);
  });

  it("est idempotent : un même poste n'est jamais enregistré deux fois", async () => {
    const { userId, projectId, dqe } = await setup();
    const lot = dqe.lots.find((l) => l.id === "second_oeuvre")!;
    const target = lot.lines.find((l: any) => l.designation === POSTE_LIBRE)!;
    const index = lot.lines.indexOf(target);
    const args = removeArgs(projectId, lot, index, target);
    await asUser(t, userId).mutation(api.quantitatifCustom.removeQuantitatifPoste, args);
    await asUser(t, userId).mutation(api.quantitatifCustom.removeQuantitatifPoste, args);
    const doc = await getDoc(userId, projectId);
    expect(doc?.removedCount).toBe(1);
    expect(doc?.removedPostes.length).toBe(1);
  });

  it("retire la personnalisation du poste supprimé et ne le réintroduit jamais", async () => {
    const { userId, projectId, dqe } = await setup();
    const lot = dqe.lots.find((l) => l.id === "second_oeuvre")!;
    const target = lot.lines.find((l: any) => l.designation === POSTE_LIBRE)!;
    const index = lot.lines.indexOf(target);
    const other = lot.lines.find((l: any) => l.designation.includes("Peinture intérieure"))!;

    await asUser(t, userId).mutation(api.quantitatifCustom.saveItemCustomization, {
      projectId,
      lotId: lot.id,
      lotName: lot.name,
      lineIndex: index,
      baseDesignation: target.designation,
      designation: `${target.designation} — variante`,
      unit: target.unit,
      nature: target.nature,
      priceScenario: "standard",
      replacedArticle: true,
      baseScenario: "standard",
    });
    await asUser(t, userId).mutation(
      api.quantitatifCustom.removeQuantitatifPoste,
      removeArgs(projectId, lot, index, target),
    );

    let doc = await getDoc(userId, projectId);
    expect(doc?.modifiedCount).toBe(0);
    expect(doc?.removedCount).toBe(1);

    // Une autre personnalisation d'article n'efface pas la suppression.
    await asUser(t, userId).mutation(api.quantitatifCustom.saveItemCustomization, {
      projectId,
      lotId: lot.id,
      lotName: lot.name,
      lineIndex: lot.lines.indexOf(other),
      baseDesignation: other.designation,
      designation: `${other.designation} — variante`,
      unit: other.unit,
      nature: other.nature,
      priceScenario: "standard",
      replacedArticle: true,
      baseScenario: "standard",
    });
    doc = await getDoc(userId, projectId);
    expect(doc?.modifiedCount).toBe(1);
    expect(doc?.removedCount).toBe(1);

    // La réinitialisation du dernier article ne restaure pas le poste supprimé.
    await asUser(t, userId).mutation(api.quantitatifCustom.resetItemCustomization, {
      projectId,
      lineKey: quantitatifLineKey(lot.id, lot.lines.indexOf(other)),
    });
    doc = await getDoc(userId, projectId);
    expect(doc).not.toBeNull();
    expect(doc?.modifiedCount).toBe(0);
    expect(doc?.removedCount).toBe(1);

    // La réinitialisation totale restaure le poste (scénario supprimé).
    await asUser(t, userId).mutation(api.quantitatifCustom.resetAllCustomizations, {
      projectId,
    });
    expect(await getDoc(userId, projectId)).toBeNull();
  });

  it("conserve le poste supprimé après régénération du quantitatif", async () => {
    const { userId, projectId, dqe } = await setup();
    const lot = dqe.lots.find((l) => l.id === "second_oeuvre")!;
    const target = lot.lines.find((l: any) => l.designation === POSTE_LIBRE)!;
    await asUser(t, userId).mutation(
      api.quantitatifCustom.removeQuantitatifPoste,
      removeArgs(projectId, lot, lot.lines.indexOf(target), target),
    );

    // Le quantitatif est régénéré (mise à jour des prix / synchronisation) :
    // une ligne est ajoutée, les positions changent.
    const project = await t.run(async (ctx) => ctx.db.get(projectId));
    const refreshed = dqe.lots.map((l: any) =>
      l.id === "second_oeuvre"
        ? {
            ...l,
            lines: [
              {
                designation: "Poste ajouté à la régénération",
                quantity: 1,
                unitPrice: 10,
                total: 10,
                nature: "materiaux",
              },
              ...l.lines,
            ],
          }
        : l,
    );
    await t.run(async (ctx) =>
      ctx.db.patch(projectId, { dqe: { ...(project as any).dqe, lots: refreshed } }),
    );

    const doc = await getDoc(userId, projectId);
    const page = personalized(refreshed, doc!.removedPostes, 300);
    const after = page.lots.find((l: any) => l.id === "second_oeuvre")!;
    expect(after.lines.some((l: any) => l.designation === POSTE_LIBRE)).toBe(false);
    expect(after.lines.some((l: any) => l.designation === "Poste ajouté à la régénération")).toBe(true);
  });

  it("isole les suppressions par projet et par utilisateur", async () => {
    const { userId, projectId, dqe } = await setup();
    const lot = dqe.lots.find((l) => l.id === "second_oeuvre")!;
    const target = lot.lines.find((l: any) => l.designation === POSTE_LIBRE)!;
    const index = lot.lines.indexOf(target);

    const intruder = await createUser(t, { email: "intrus-poste@test.com" });
    const otherProject = await createProject(t, intruder, {
      dqe: dqeFixture().dqe,
      name: "Projet de l'intrus",
      category: "maison",
    });

    await expect(
      asUser(t, intruder).mutation(
        api.quantitatifCustom.removeQuantitatifPoste,
        removeArgs(projectId, lot, index, target),
      ),
    ).rejects.toThrow(/Accès refusé/i);

    await asUser(t, userId).mutation(
      api.quantitatifCustom.removeQuantitatifPoste,
      removeArgs(projectId, lot, index, target),
    );

    // La suppression du projet A n'existe ni pour l'autre utilisateur, ni sur
    // ses propres projets.
    expect(await getDoc(intruder, projectId)).toBeNull();
    expect(await getDoc(intruder, otherProject)).toBeNull();
    expect(await getDoc(userId, otherProject)).toBeNull();
    // Un seul document écrit, sur le projet concerné uniquement.
    const docs = await t.run(async (ctx) =>
      ctx.db.query("quantitatifCustomizations").collect(),
    );
    expect(docs.length).toBe(1);
    expect(docs[0].projectId).toBe(projectId);
  });
});
