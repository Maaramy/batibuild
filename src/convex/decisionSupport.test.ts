/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// SOURCE UNIQUE DE VÉRITÉ — « Estimation du coût de construction » enregistrée.
// Les attentes re-prennent les ÉQUATIONS EXACTES de la page résultat
// (`ProjectDetail.tsx`) :
//   • retrait de l'ancienne majoration d'imprévus (`contingencyPercentage`) ;
//   • décomposition du coût × facteur du scénario (`scaledBreakdown`) ;
//   • Quantitatif détaillé × facteur du scénario × retrait d'imprévus
//     (`scaleDqeLots(lots, scaleFactor × realCostFactor)`, arrondis compris).
// ============================================================================

/** Ancienne estimation enregistrée avec une majoration d'imprévus de 8 %. */
const LEGACY_PCT = 8;
const REAL_COST_FACTOR = 1 / (1 + LEGACY_PCT / 100);

const SCENARIOS = {
  economique: { label: "Économique", totalCost: 204_768, costPerM2: 1_575, multiplier: 0.8 },
  standard: { label: "Standard", totalCost: 255_960, costPerM2: 1_969, multiplier: 1 },
  premium: { label: "Premium", totalCost: 319_950, costPerM2: 2_461, multiplier: 1.25 },
};

const BREAKDOWN = [
  { category: "fondations", label: "Fondations", estimatedCost: 100_000, percentage: 39.1 },
  { category: "toiture", label: "Toiture", estimatedCost: 50_000, percentage: 19.5 },
];

const RAW_LOTS = [
  {
    id: "fondations",
    name: "Fondations",
    subtotal: 100_000,
    lines: [
      { designation: "Béton C25/30", sousLot: "Dalle", quantity: 20, unit: "m³", unitPrice: 320, total: 6_400 },
      { designation: "Acier HA", sousLot: "Ferraillage", quantity: 100, unit: "kg", unitPrice: 2.2, total: 220 },
    ],
  },
  {
    id: "toiture",
    name: "Toiture",
    subtotal: 50_000,
    lines: [
      { designation: "Zinc 25/100", sousLot: "Couverture", quantity: 120, unit: "m²", unitPrice: 45.5, total: 5_460 },
    ],
  },
];

async function createUser(
  t: ReturnType<typeof convexTest>,
  role: "admin" | "user" = "admin",
) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Test Aide à la décision",
      email: `decision-${Math.random()}@test.com`,
      role,
      status: "active",
      subscriptionPlan: "pro",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

interface ProjectOpts {
  contingencyPercentage?: number;
  selectedScenario?: string;
}

async function createProject(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  opts: ProjectOpts = {},
): Promise<Id<"projects">> {
  const pct = opts.contingencyPercentage ?? LEGACY_PCT;
  const dqe = { lots: RAW_LOTS };
  return t.run(async (ctx) =>
    ctx.db.insert("projects", {
      userId,
      name: "Maison 120 m²",
      category: "villa",
      status: "completed",
      region: "tunis",
      surface: 120,
      floors: 1,
      selectedScenario: opts.selectedScenario ?? "standard",
      dqe,
      costEstimate: {
        totalCost: SCENARIOS.standard.totalCost,
        costPerSquareMeter: SCENARIOS.standard.costPerM2,
        currency: "TND",
        breakdown: BREAKDOWN,
        contingencyBuffer: 0,
        contingencyPercentage: pct,
        budgetScenarios: SCENARIOS,
        dqe,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

function asUser(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

// ============================================================================

describe("getProjectBudgetContext — coûts strictement identiques au résultat", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: Id<"users">;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createUser(t);
  });

  it("scénario Premium + majoration legacy : reproduit exactement les équations de la page résultat", async () => {
    const projectId = await createProject(t, userId, { selectedScenario: "premium" });
    const ctx = await asUser(t, userId).query(api.decisionSupport.getProjectBudgetContext, {
      projectId,
    });
    expect(ctx).not.toBeNull();
    if (!ctx) return;

    // Page résultat : montants corrigés puis facteur du scénario.
    const correctedStd = Math.round(SCENARIOS.standard.totalCost * REAL_COST_FACTOR); // 237 000
    const correctedSel = Math.round(SCENARIOS.premium.totalCost * REAL_COST_FACTOR); // 296 250
    const scaleFactor = correctedSel / correctedStd; // 1,25
    expect(correctedStd).toBe(237_000);

    // Total = `currentTotal` du résultat (scénario enregistré, corrigé).
    expect(ctx.totalCost).toBe(correctedSel);

    // Décomposition = `scaledBreakdown` du résultat : × facteur du scénario,
    // SANS retrait d'imprévus (le résultat n'applique ce retrait qu'aux totaux
    // et scénarios, pas à `breakdown`).
    expect(ctx.breakdown).toEqual([
      { ...BREAKDOWN[0], estimatedCost: Math.round(BREAKDOWN[0].estimatedCost * scaleFactor) },
      { ...BREAKDOWN[1], estimatedCost: Math.round(BREAKDOWN[1].estimatedCost * scaleFactor) },
    ]);
    expect(ctx.breakdown[0].estimatedCost).toBe(125_000);

    // Quantitatif = `scaleDqeLots(lots, scaleFactor × realCostFactor)` du
    // résultat : arronds identiques, prix unitaire recalculé depuis le total.
    const f = scaleFactor * REAL_COST_FACTOR;
    expect(ctx.lots).toHaveLength(2);
    expect(ctx.lots[0].subtotal).toBe(Math.round(100_000 * f));
    expect(ctx.lots[0].lines[0].total).toBe(Math.round(6_400 * f));
    expect(ctx.lots[0].lines[0].unitPrice).toBe(
      Math.round((Math.round(6_400 * f) / 20) * 100) / 100,
    );
    expect(ctx.lots[0].lines[1].total).toBe(Math.round(220 * f));
    expect(ctx.lots[1].subtotal).toBe(Math.round(50_000 * f));
    expect(ctx.lots[1].lines[0].total).toBe(Math.round(5_460 * f));

    // Libellés et sous-lots enregistrés intacts (aucune recréation).
    expect(ctx.lots[0].lines[0].designation).toBe("Béton C25/30");
    expect(ctx.lots[0].lines[0].subcategory).toBe("Dalle");
    expect(ctx.surface).toBe(120);
  });

  it("scénario Standard + majoration legacy : décomposition brute, quantitatif corrigé (comme le résultat)", async () => {
    const projectId = await createProject(t, userId, { selectedScenario: "standard" });
    const ctx = await asUser(t, userId).query(api.decisionSupport.getProjectBudgetContext, {
      projectId,
    });
    expect(ctx).not.toBeNull();
    if (!ctx) return;

    // Total affiché par le résultat = 255 960 / 1,08 = 237 000.
    expect(ctx.totalCost).toBe(Math.round(255_960 * REAL_COST_FACTOR));
    expect(ctx.totalCost).toBe(237_000);

    // Décomposition : facteur de scénario = 1 → montants ENREGISTRÉS bruts
    // (le résultat n'y retire pas la majoration).
    expect(ctx.breakdown.map((b) => b.estimatedCost)).toEqual([100_000, 50_000]);

    // Quantitatif : seul le retrait de la majoration s'applique.
    expect(ctx.lots[0].subtotal).toBe(Math.round(100_000 * REAL_COST_FACTOR));
    expect(ctx.lots[0].lines[0].total).toBe(Math.round(6_400 * REAL_COST_FACTOR));
    expect(ctx.lots[1].lines[0].total).toBe(Math.round(5_460 * REAL_COST_FACTOR));
  });

  it("estimation moderne (sans majoration) : montants strictement enregistrés, aucun facteur", async () => {
    const projectId = await createProject(t, userId, {
      contingencyPercentage: 0,
      selectedScenario: "standard",
    });
    const ctx = await asUser(t, userId).query(api.decisionSupport.getProjectBudgetContext, {
      projectId,
    });
    expect(ctx).not.toBeNull();
    if (!ctx) return;

    expect(ctx.totalCost).toBe(255_960);
    expect(ctx.breakdown).toEqual(BREAKDOWN);
    expect(ctx.lots[0].subtotal).toBe(100_000);
    expect(ctx.lots[0].lines[0]).toEqual({
      designation: "Béton C25/30",
      subcategory: "Dalle",
      quantity: 20,
      unit: "m³",
      unitPrice: 320,
      total: 6_400,
    });
    expect(ctx.lots[1].lines[0].total).toBe(5_460);
  });

  it("refuse l'accès à un autre utilisateur", async () => {
    const projectId = await createProject(t, userId);
    // Utilisateur non admin : seul le propriétaire doit lire le contexte.
    const otherId = await createUser(t, "user");
    const ctx = await asUser(t, otherId).query(api.decisionSupport.getProjectBudgetContext, {
      projectId,
    });
    expect(ctx).toBeNull();
  });
});
