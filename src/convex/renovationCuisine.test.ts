/// <reference types="vite/client" />

// ============================================================================
// TYPE DE PROJET « RÉNOVATION CUISINE » — moteurs (BIM, DQE, quantitatif)
// ----------------------------------------------------------------------------
// Vérifie que le type est natif de Batibuild et que la chaîne de calcul reste
// cohérente, exactement comme pour les autres types de projet :
//
//   moteur BIM (estimation) → DQE / quantitatif détaillé (4 sections communes)
//   → scénarios Économique / Standard / Premium / Personnalisé
//   → montants HT / TVA / TTC → enregistrement & réouverture du projet.
//
// Aucun montant n'est inventé : les valeurs viennent du moteur BIM et du moteur
// DQE réels ; le taux de TVA (19 %) est celui de la chaîne d'estimation de la
// plateforme.
//
// L'intégration « plateforme » (nom du type, parcours, rapport PDF, helper
// fiscal partagé) est couverte par `src/lib/renovationCuisine.test.ts` : les
// modules de `src/lib` ne sont pas importables depuis le projet `src/convex`.
// ============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";

import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { generateDqe } from "./dqeEngine.js";
import { runBIMEstimation } from "./bimEngine.js";
import { PROJECT_TYPE_LABELS, PROJECT_TYPES, resolveProjectType } from "./projectTypes.js";
import {
  EDITABLE_LOT_IDS,
  computeQuantitatifTotals,
  isEditableLot,
  overlayCustomizations,
  quantitatifLineKey,
  scaleDqeLots,
  unitPriceForScenario,
  type QuantitatifCustomizationEntry,
} from "./quantitatifCustomLogic.js";

const modules = import.meta.glob("./**/*.*s");

const CATEGORY = "renovation_cuisine";
/** Cuisine standard : 12 m², plein pied, marché de Tunis. */
const SURFACE = 12;
const REGION = "tunis";
/** Taux de TVA de la chaîne d'estimation Batibuild (« TVA 19 % incluse »). */
const TVA_RATE_PERCENT = 19;

const round3 = (n: number) => Math.round(n * 1000) / 1000;
/** Décomposition TTC → HT + TVA (même formule que `computeInvoiceTax`). */
function tax(amountTTC: number) {
  const amountHT = round3(amountTTC / (1 + TVA_RATE_PERCENT / 100));
  return { amountHT, taxAmount: round3(amountTTC - amountHT), amountTTC };
}

/** Les QUATRE sections communes à tous les types de projet, dans l'ordre. */
const SECTIONS = [
  { id: "frais_preliminaires", name: "Frais Préliminaires et Études" },
  { id: "gros_oeuvre", name: "Gros œuvre" },
  { id: "second_oeuvre", name: "Second œuvre et finitions" },
  { id: "amenagements_exterieurs", name: "Aménagements extérieurs" },
] as const;

const estimate = (finishLevel = "standard", surface = SURFACE) =>
  runBIMEstimation(CATEGORY, surface, 1, REGION, finishLevel);

const dqeFor = (totalBudget: number, surface = SURFACE) =>
  generateDqe({ category: CATEGORY, surface, floors: 1, totalBudget });

interface AnyDqeLot {
  id: string;
  name: string;
  subtotal: number;
  percent?: number;
  lines: any[];
}

const lotById = (lots: readonly AnyDqeLot[], id: string): AnyDqeLot => {
  const lot = lots.find((l) => l.id === id);
  if (!lot) throw new Error(`Section ${id} introuvable`);
  return lot;
};

const lotOf = (dqe: { lots: AnyDqeLot[] }, id: string) => lotById(dqe.lots, id);

const lineIndexContaining = (lot: { lines: { designation: string }[] }, needle: string) => {
  const index = lot.lines.findIndex((l) => l.designation.includes(needle));
  if (index < 0) throw new Error(`Article « ${needle} » introuvable`);
  return index;
};

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

// ============================================================================
// 1. Type natif du catalogue
// ============================================================================

describe("« Rénovation Cuisine » — type de projet natif", () => {
  it("est un type officiel du catalogue, nommé exactement « Rénovation Cuisine »", () => {
    expect(resolveProjectType(CATEGORY)).toBe(CATEGORY);
    expect(PROJECT_TYPES).toContain(CATEGORY);
    expect(PROJECT_TYPE_LABELS[CATEGORY]).toBe("Rénovation Cuisine");
  });
});

// ============================================================================
// 2. Estimation — le moteur BIM traite une rénovation, jamais du neuf
// ============================================================================

describe("« Rénovation Cuisine » — estimation BIM", () => {
  it("produit une estimation chiffrée pour une cuisine de 12 m²", () => {
    const bim = estimate();
    expect(bim.costEstimate.totalCost).toBeGreaterThan(0);
    expect(bim.costEstimate.breakdown.length).toBeGreaterThan(0);
  });

  it("n'applique pas un prix de construction neuve au m²", () => {
    const cuisine = estimate("standard");
    const maisonNeuve = runBIMEstimation("maison", SURFACE, 1, REGION, "standard");
    expect(cuisine.costEstimate.budgetScenarios.standard.costPerM2).toBeLessThan(
      maisonNeuve.costEstimate.budgetScenarios.standard.costPerM2,
    );
  });

  it("les trois gammes sont strictement croissantes (Économique < Standard < Premium)", () => {
    const eco = estimate("economique").costEstimate.totalCost;
    const std = estimate("standard").costEstimate.totalCost;
    const premium = estimate("premium").costEstimate.totalCost;
    expect(eco).toBeLessThan(std);
    expect(std).toBeLessThan(premium);
  });
});

// ============================================================================
// 3. Quantitatif détaillé — les quatre sections communes
// ============================================================================

describe("« Rénovation Cuisine » — quantitatif détaillé (4 sections communes)", () => {
  it("expose exactement les quatre sections de la plateforme, dans l'ordre officiel", () => {
    const dqe = dqeFor(estimate().costEstimate.totalCost);
    expect(dqe.lots.map((l) => [l.id, l.name])).toEqual(SECTIONS.map((s) => [s.id, s.name]));
  });

  it("couvre les postes de rénovation de cuisine attendus dans chaque section", () => {
    const dqe = dqeFor(estimate().costEstimate.totalCost);
    const designations = dqe.lots.flatMap((l) => l.lines.map((x) => x.designation));
    const expected = [
      // A. Frais préliminaires et études
      "Visite et diagnostic de l'existant",
      "Protection des zones conservées",
      "Préparation et organisation du chantier",
      "Prestations complémentaires",
      // B. Gros œuvre
      "Dépose de la cuisine existante",
      "Démolition des revêtements",
      "Modification des cloisons ou ouvertures",
      "Évacuation des gravats",
      "Reprise des murs et enduits",
      "Ragréage du sol",
      // C. Second œuvre et finitions
      "Alimentation eau",
      "Évacuation (PVC",
      "Points électriques cuisine",
      "Câblage et gaines",
      "Revêtement de sol",
      "Faïence murale",
      "Peinture des murs et plafonds",
      "Meubles hauts et bas",
      "Hotte aspirante",
      "Plan de travail",
      "Évier inox",
      "Robinetterie évier",
      "Four / table de cuisson / réfrigérateur",
      "Raccordements des équipements intégrés",
    ];
    for (const needle of expected) {
      expect(
        designations.some((d) => d.includes(needle)),
        `poste manquant : ${needle}`,
      ).toBe(true);
    }
  });

  it("porte pour chaque poste : unité, quantité, prix unitaire HT et montant HT", () => {
    const dqe = dqeFor(estimate().costEstimate.totalCost);
    for (const lot of dqe.lots) {
      for (const line of lot.lines) {
        expect(line.unit, line.designation).toBeTruthy();
        expect(line.quantity, line.designation).toBeGreaterThan(0);
        expect(line.unitPrice, line.designation).toBeGreaterThan(0);
        expect(line.total, line.designation).toBeGreaterThan(0);
        // Montant HT = Quantité × Prix unitaire HT (tolérance d'arrondi)
        expect(
          Math.abs(line.total - line.quantity * line.unitPrice),
          line.designation,
        ).toBeLessThanOrEqual(1.01);
      }
    }
  });

  it("les quatre sections sont personnalisables comme celles des autres projets", () => {
    const dqe = dqeFor(estimate().costEstimate.totalCost);
    for (const section of SECTIONS) {
      expect(isEditableLot(section.id), section.id).toBe(true);
      expect(dqe.lots.some((l) => l.id === section.id)).toBe(true);
    }
    expect(EDITABLE_LOT_IDS).toEqual(SECTIONS.map((s) => s.id));
  });
});

// ============================================================================
// 4. Cohérence BIM ↔ DQE ↔ quantitatif détaillé
// ============================================================================

describe("« Rénovation Cuisine » — cohérence BIM ↔ DQE ↔ quantitatif", () => {
  it("le DQE retombe sur le budget BIM, section par section", () => {
    const budget = estimate().costEstimate.totalCost;
    const dqe = dqeFor(budget);

    // Total du quantitatif = budget BIM (seuls les arrondis par section diffèrent)
    expect(Math.abs(dqe.totals.total - budget)).toBeLessThanOrEqual(dqe.lots.length);
    // Somme des sous-totaux de sections = total déclaré
    expect(dqe.lots.reduce((s: number, l) => s + l.subtotal, 0)).toBe(dqe.totals.total);
    // Chaque section tombe exactement sur son sous-total
    for (const lot of dqe.lots) {
      expect(lot.lines.reduce((s: number, l) => s + l.total, 0), lot.id).toBe(lot.subtotal);
    }
    // Ventilation par nature = total
    const t = dqe.totals;
    expect(t.materiaux + t.mainOeuvre + t.equipements + t.transport + t.etudes).toBe(t.total);
  });

  it("les quantités des postes suivent les dimensions réelles de la cuisine", () => {
    const budget = estimate().costEstimate.totalCost;
    const q = (surface: number, needle: string) => {
      const lot = lotOf(dqeFor(budget, surface), "second_oeuvre");
      return lot.lines[lineIndexContaining(lot, needle)].quantity;
    };
    expect(q(24, "Revêtement de sol")).toBeGreaterThan(q(SURFACE, "Revêtement de sol"));
    // Les postes à quantité fixe (forfait, appareil) ne bougent pas avec la surface
    expect(q(24, "Hotte aspirante")).toBe(q(SURFACE, "Hotte aspirante"));
    expect(q(24, "Évier inox")).toBe(q(SURFACE, "Évier inox"));
  });
});

// ============================================================================
// 5. Recalcul automatique des totaux (quantité, prix, HT / TVA / TTC)
// ============================================================================

describe("« Rénovation Cuisine » — recalcul automatique des totaux", () => {
  it("modifier une quantité recalcule le montant, le sous-total, le total et le TTC", () => {
    const dqe = dqeFor(estimate().costEstimate.totalCost);
    const scaled = scaleDqeLots(dqe.lots, 1);
    const lot = lotOf({ lots: scaled }, "second_oeuvre");
    const index = lineIndexContaining(lot, "Hotte aspirante");
    const line = lot.lines[index];

    const before = computeQuantitatifTotals(scaled, SURFACE);
    const res = overlayCustomizations(
      scaled,
      [entry("second_oeuvre", lot.name, index, line, { quantity: line.quantity + 5 })],
      { scaleFactor: 1, realCostFactor: 1 },
    );
    const after = computeQuantitatifTotals(res.lots, SURFACE);
    const updatedLot = lotById(res.lots, "second_oeuvre");
    const updated = updatedLot.lines[index];

    // Montant de l'article = nouvelle quantité × prix unitaire
    expect(updated.quantity).toBe(line.quantity + 5);
    expect(updated.total).toBe(Math.round(updated.quantity * updated.unitPrice));

    // Sous-total de la section, total général et coût au m² recalculés
    expect(updatedLot.subtotal).toBe(
      updatedLot.lines.reduce((s: number, l: any) => s + l.total, 0),
    );
    expect(after.total).toBeGreaterThan(before.total);
    expect(after.total).toBe(res.lots.reduce((s: number, l: any) => s + l.subtotal, 0));
    expect(after.costPerM2).toBe(Math.round(after.total / SURFACE));

    // Les sections non modifiées ne bougent pas
    expect(lotById(res.lots, "gros_oeuvre").subtotal).toBe(
      lotById(scaled, "gros_oeuvre").subtotal,
    );

    // HT / TVA / TTC recalculés à partir du nouveau total TTC
    const taxBefore = tax(before.total);
    const taxAfter = tax(after.total);
    expect(taxAfter.amountTTC).toBe(after.total);
    expect(taxAfter.amountHT).toBeGreaterThan(taxBefore.amountHT);
    expect(taxAfter.taxAmount).toBeGreaterThan(taxBefore.taxAmount);
    expect(taxAfter.amountHT + taxAfter.taxAmount).toBeCloseTo(taxAfter.amountTTC, 3);
  });

  it("modifier un prix recalcule HT, TVA, TTC et le coût total du projet", () => {
    const dqe = dqeFor(estimate().costEstimate.totalCost);
    const scaled = scaleDqeLots(dqe.lots, 1);
    const lot = lotOf({ lots: scaled }, "second_oeuvre");
    const index = lineIndexContaining(lot, "Évier inox");
    const line = lot.lines[index];

    const before = computeQuantitatifTotals(scaled, SURFACE);
    const res = overlayCustomizations(
      scaled,
      [entry("second_oeuvre", lot.name, index, line, { unitPrice: line.unitPrice * 1.3 })],
      { scaleFactor: 1, realCostFactor: 1 },
    );
    const after = computeQuantitatifTotals(res.lots, SURFACE);
    const updated = lotById(res.lots, "second_oeuvre").lines[index];

    expect(updated.unitPrice).toBeGreaterThan(line.unitPrice);
    expect(updated.total).toBe(Math.round(updated.quantity * updated.unitPrice));
    expect(after.total).toBe(res.grandTotal);
    expect(after.total).toBeGreaterThan(before.total);

    const taxBefore = tax(before.total);
    const taxAfter = tax(after.total);
    expect(taxAfter.amountTTC).toBe(after.total);
    // Le nouveau total TTC se décompose exactement en HT + TVA : la hausse du
    // projet se répercute intégralement sur les montants affichés.
    const deltaTTC = taxAfter.amountTTC - taxBefore.amountTTC;
    const deltaHT = taxAfter.amountHT - taxBefore.amountHT;
    const deltaTVA = taxAfter.taxAmount - taxBefore.taxAmount;
    expect(deltaTTC).toBe(after.total - before.total);
    expect(deltaHT).toBeGreaterThan(0);
    expect(deltaTVA).toBeGreaterThan(0);
    expect(deltaHT + deltaTVA).toBeCloseTo(deltaTTC, 1);
  });
});

// ============================================================================
// 6. Les quatre gammes de rénovation
// ============================================================================

describe("« Rénovation Cuisine » — gammes Économique / Standard / Premium / Personnalisé", () => {
  it("les scénarios modifient les prix SANS fausser les quantités physiques", () => {
    const quantities = (level: string) =>
      dqeFor(estimate(level).costEstimate.totalCost).lots.map((l) =>
        l.lines.map((x) => `${x.designation}|${x.quantity}|${x.unit}`),
      );
    expect(quantities("economique")).toEqual(quantities("standard"));
    expect(quantities("premium")).toEqual(quantities("standard"));

    // …mais les montants diffèrent bien selon la gamme
    expect(dqeFor(estimate("premium").costEstimate.totalCost).totals.total).toBeGreaterThan(
      dqeFor(estimate("standard").costEstimate.totalCost).totals.total,
    );
    expect(dqeFor(estimate("economique").costEstimate.totalCost).totals.total).toBeLessThan(
      dqeFor(estimate("standard").costEstimate.totalCost).totals.total,
    );
  });

  it("le niveau de finition décline le prix unitaire d'un article", () => {
    const scenarios = estimate().costEstimate.budgetScenarios;
    expect(unitPriceForScenario(100, scenarios, "standard")).toBe(100);
    expect(unitPriceForScenario(100, scenarios, "premium")).toBeGreaterThan(100);
    expect(unitPriceForScenario(100, scenarios, "economique")).toBeLessThan(100);
  });
});

// ============================================================================
// 7. Aucun coût artificiel
// ============================================================================

describe("« Rénovation Cuisine » — aucun coût artificiel", () => {
  it("la section « Aménagements extérieurs » reste vide et à 0 TND", () => {
    const dqe = dqeFor(estimate().costEstimate.totalCost);
    const ext = lotOf(dqe, "amenagements_exterieurs");
    expect(ext.lines).toEqual([]);
    expect(ext.subtotal).toBe(0);
    expect(ext.percent).toBe(0);
    // Le total des trois autres sections = total du projet : rien n'est ajouté
    expect(
      dqe.lots
        .filter((l) => l.id !== "amenagements_exterieurs")
        .reduce((s: number, l) => s + l.subtotal, 0),
    ).toBe(dqe.totals.total);
  });

  it("aucun poste de construction neuve n'est injecté dans une rénovation", () => {
    const dqe = dqeFor(estimate().costEstimate.totalCost);
    const interdit =
      /permis de construire|géotechnique|étude des sols|béton armé|fondations|plancher|treillis|acier à béton|charpente|terrassement/i;
    for (const lot of dqe.lots) {
      for (const line of lot.lines) expect(line.designation, lot.id).not.toMatch(interdit);
    }
  });

  it("les travaux de second œuvre priment sur les reprises de gros œuvre", () => {
    const dqe = dqeFor(estimate().costEstimate.totalCost);
    expect(lotOf(dqe, "second_oeuvre").subtotal).toBeGreaterThan(
      lotOf(dqe, "gros_oeuvre").subtotal,
    );
    expect(lotOf(dqe, "frais_preliminaires").subtotal).toBeGreaterThan(0);
  });
});

// ============================================================================
// 8. Enregistrement, réouverture et autorisations
// ============================================================================

describe("« Rénovation Cuisine » — enregistrement et autorisations", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: any;
  let dqe: ReturnType<typeof dqeFor>;
  let ce: ReturnType<typeof estimate>["costEstimate"];
  let projectId: any;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    ce = estimate().costEstimate;
    dqe = dqeFor(ce.totalCost);
    userId = await t.run((ctx) =>
      ctx.db.insert(
        "users",
        {
          name: "Client Cuisine",
          email: `cuisine-${Math.random()}@test.com`,
          role: "user",
          status: "active",
          subscriptionPlan: "free",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as any,
      ),
    );
    projectId = await t.run((ctx) =>
      ctx.db.insert(
        "projects",
        {
          userId,
          name: "Rénovation Cuisine — 12 m²",
          category: CATEGORY,
          status: "completed",
          region: REGION,
          surface: SURFACE,
          floors: 1,
          selectedScenario: "standard",
          costEstimate: ce,
          dqe,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as any,
      ),
    );
  });

  it("enregistre la personnalisation d'une section, la relit, puis la réinitialise", async () => {
    const asUser = t.withIdentity({ subject: userId });
    const lot = lotOf(dqe, "second_oeuvre");
    const index = lineIndexContaining(lot, "Hotte aspirante");
    const line = lot.lines[index];

    await asUser.mutation(api.quantitatifCustom.saveItemCustomization, {
      projectId,
      lotId: "second_oeuvre",
      lotName: lot.name,
      lineIndex: index,
      baseDesignation: line.designation,
      designation: line.designation,
      unit: line.unit,
      nature: line.nature,
      priceScenario: "premium",
      baseScenario: "standard",
      replacedArticle: false,
    });

    const saved = await asUser.query(api.quantitatifCustom.getCustomization, { projectId });
    expect(saved?.modifiedCount).toBe(1);
    expect(saved?.modifications[0].lotId).toBe("second_oeuvre");
    // Le prix unitaire est relu côté serveur au niveau de finition demandé
    expect(saved!.modifications[0].unitPrice).toBeCloseTo(
      unitPriceForScenario(line.unitPrice, ce.budgetScenarios, "premium"),
      2,
    );

    await asUser.mutation(api.quantitatifCustom.resetItemCustomization, {
      projectId,
      lineKey: quantitatifLineKey("second_oeuvre", index),
    });
    expect(await asUser.query(api.quantitatifCustom.getCustomization, { projectId })).toBeNull();
  });

  it("refuse la personnalisation d'une catégorie non autorisée", async () => {
    const asUser = t.withIdentity({ subject: userId });
    await expect(
      asUser.mutation(api.quantitatifCustom.saveItemCustomization, {
        projectId,
        lotId: "vrd",
        lotName: "VRD",
        lineIndex: 0,
        baseDesignation: "Article",
        designation: "Article",
        unit: "u",
        nature: "materiaux",
        priceScenario: "standard",
        baseScenario: "standard",
        replacedArticle: false,
      }),
    ).rejects.toThrow(/pas modifiable/);
  });
});
