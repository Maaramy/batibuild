/// <reference types="vite/client" />

// ============================================================================
// POSTE « ÉLECTRICITÉ » (barème 2026) — TESTS D'ACCEPTATION
// ----------------------------------------------------------------------------
// Vérifié à travers le CHEMIN RÉEL du produit, jamais sur des valeurs isolées :
//   createProject → simulateAnalysis (moteur de coûts + Quantitatif détaillé)
//   → projet enregistré (coût estimatif + DQE), et configuration administrateur
//   via `bimConfig.saveBIMConfig` (aucune modification du code source).
//
// Cas couverts :
//   • A — barème de référence, aucune configuration administrateur ;
//   • B — barème modifié par l'administrateur, NON-RÉGRESSION des autres
//         postes du Quantitatif détaillé ;
//   • C — scénarios Économique / Standard / Premium : chaque niveau porte SON
//         barème ;
//   • D — projet « Électricité complète » : le poste EST le projet.
// ============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import {
  ELECTRICITY_PRICE_M2,
  ELECTRICITY_SUBPOSTS,
  electricityAmount,
} from "../lib/electricityPricing";

const modules = import.meta.glob("./**/*.*s");

async function createAdminUser(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Admin Test",
      email: "admin-electricite@test.com",
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

/** Crée un projet puis lance l'estimation réelle (moteur de coûts + DQE). */
async function createAndEstimate(
  t: ReturnType<typeof convexTest>,
  userId: string,
  input: {
    name: string;
    surface: number;
    floors: number;
    category?: string;
    region?: string;
    levelSurfaces?: number[];
  },
) {
  const userT = t.withIdentity({ subject: userId });
  const projectId = await userT.mutation(api.projects.createProject, {
    name: input.name,
    category: (input.category ?? "maison") as any,
    region: (input.region ?? "tunis") as any,
    surface: input.surface,
    floors: input.floors,
    levelSurfaces: input.levelSurfaces,
  });
  await userT.mutation(api.projects.simulateAnalysis, { projectId });
  const project: any = await t.run(async (ctx) => ctx.db.get(projectId));
  return { projectId, project };
}

/** Lignes du poste électrique du lot « Second œuvre et finitions ». */
function electricityLines(project: any) {
  const lot = project.dqe.lots.find((l: any) => l.id === "second_oeuvre");
  return (lot?.lines ?? []).filter((l: any) => l.sousLot === "Électricité");
}

/** Empreinte des lignes d'un lot (désignation, quantité, P.U., montant). */
const lineFingerprint = (lines: any[]) =>
  lines.map((l: any) => ({
    designation: l.designation,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    total: l.total,
  }));

/** Tous les lots SAUF « Second œuvre et finitions » (hors poste électrique). */
function otherLots(project: any) {
  return project.dqe.lots
    .filter((l: any) => l.id !== "second_oeuvre")
    .map((l: any) => ({ id: l.id, subtotal: l.subtotal, lines: lineFingerprint(l.lines) }));
}

/** Lignes NON électriques du lot « Second œuvre et finitions ». */
function nonElectricSecondOeuvre(project: any) {
  const lot = project.dqe.lots.find((l: any) => l.id === "second_oeuvre");
  return lineFingerprint(
    (lot?.lines ?? []).filter((l: any) => l.sousLot !== "Électricité"),
  );
}

const scenarioTotal = (ce: any, scenario: "economique" | "standard" | "premium") =>
  scenario === "standard" ? ce.totalCost : ce.budgetScenarios[scenario].totalCost;

describe("Poste électricité — barème unique 2026 (createProject → simulateAnalysis)", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createAdminUser(t);
  });

  // ── Cas A ──────────────────────────────────────────────────────────────
  describe("Cas A · barème de référence (aucune configuration administrateur)", () => {
    it("le poste est le barème Standard appliqué à la surface construite", async () => {
      const { project } = await createAndEstimate(t, userId, {
        name: "A · maison 100",
        surface: 100,
        floors: 1,
      });
      const ce = project.costEstimate;
      const el = ce.electricity;

      expect(el.scenario).toBe("standard");
      expect(el.priceM2).toBe(ELECTRICITY_PRICE_M2.std);
      expect(el.surface).toBe(100);
      expect(el.amount).toBe(
        electricityAmount({
          surface: 100,
          scenario: "standard",
          prices: ELECTRICITY_PRICE_M2,
          regionFactor: el.regionFactor,
        }),
      );
      // L'électricité déjà comprise dans la grille est retirée : jamais deux fois.
      expect(el.provision).toBeGreaterThan(0);
      expect(el.adjustment).toBe(el.amount - el.provision);
      expect(ce.totalCost).toBe(
        ce.levelBreakdown.levels.reduce((s: number, l: any) => s + l.amount, 0) +
          ce.levelBreakdown.roof.amount +
          ce.levelBreakdown.electricityAdjustment,
      );
      expect(ce.levelBreakdown.anomalies).toEqual([]);
    });

    it("le Quantitatif détaillé porte exactement le même poste (6 sous-postes)", async () => {
      const { project } = await createAndEstimate(t, userId, {
        name: "A · DQE",
        surface: 100,
        floors: 1,
      });
      const ce = project.costEstimate;
      const lines = electricityLines(project);

      expect(lines).toHaveLength(ELECTRICITY_SUBPOSTS.length);
      expect(lines.map((l: any) => l.designation)).toEqual(
        ELECTRICITY_SUBPOSTS.map((p) => p.label),
      );
      // Somme des sous-postes = montant du poste (aucun dinar créé ni perdu).
      expect(lines.reduce((s: number, l: any) => s + l.total, 0)).toBe(
        ce.electricity.amount,
      );
      // La ventilation du moteur EST celle imprimée dans le quantitatif.
      expect(ce.electricity.breakdown.map((b: any) => b.amount)).toEqual(
        lines.map((l: any) => l.total),
      );
      // Et le quantitatif retombe sur le coût estimatif TTC.
      expect(
        Math.abs(project.dqe.totals.total - ce.totalCost),
      ).toBeLessThanOrEqual(project.dqe.lots.length);
    });
  });

  // ── Cas B ──────────────────────────────────────────────────────────────
  describe("Cas B · barème modifié par l'administrateur", () => {
    const NEW_PRICES = { eco: 40, std: 80, premium: 150 };

    it("le poste et le coût total suivent le nouveau barème, rien d'autre ne bouge", async () => {
      const before = await createAndEstimate(t, userId, {
        name: "B · avant config",
        surface: 100,
        floors: 1,
      });
      const beforeCe = before.project.costEstimate;
      const beforeOtherLots = otherLots(before.project);
      const beforeSoOther = nonElectricSecondOeuvre(before.project);

      const adminT = t.withIdentity({ subject: userId });
      await adminT.mutation(api.bimConfig.saveBIMConfig, {
        electricityPricesM2: JSON.stringify(NEW_PRICES),
      });

      const after = await createAndEstimate(t, userId, {
        name: "B · après config",
        surface: 100,
        floors: 1,
      });
      const afterCe = after.project.costEstimate;
      const afterEl = afterCe.electricity;

      // Le barème enregistré est bien celui appliqué.
      expect(afterEl.priceM2).toBe(NEW_PRICES.std);
      expect(afterEl.amount).toBe(
        electricityAmount({
          surface: 100,
          scenario: "standard",
          prices: NEW_PRICES,
          regionFactor: afterEl.regionFactor,
        }),
      );
      expect(afterEl.amount).toBeGreaterThan(beforeCe.electricity.amount);

      // NON-RÉGRESSION : les autres lots et les lignes non électriques du lot
      // « Second œuvre et finitions » ne bougent pas d'un dinar.
      expect(otherLots(after.project)).toEqual(beforeOtherLots);
      expect(nonElectricSecondOeuvre(after.project)).toEqual(beforeSoOther);

      // Le coût total ne varie QUE de la variation du poste électrique.
      expect(afterCe.totalCost - beforeCe.totalCost).toBe(
        afterEl.amount - beforeCe.electricity.amount,
      );
      // Le quantitatif suit exactement le même mouvement.
      expect(
        Math.abs(after.project.dqe.totals.total - afterCe.totalCost),
      ).toBeLessThanOrEqual(after.project.dqe.lots.length);
      expect(
        after.project.dqe.totals.total - before.project.dqe.totals.total,
      ).toBe(afterEl.amount - beforeCe.electricity.amount);
      // Les sous-postes du DQE suivent la nouvelle ventilation du barème.
      expect(electricityLines(after.project).reduce((s: number, l: any) => s + l.total, 0)).toBe(
        afterEl.amount,
      );
    });

    it("une valeur hors bornes est refusée à l'enregistrement", async () => {
      const adminT = t.withIdentity({ subject: userId });
      await expect(
        adminT.mutation(api.bimConfig.saveBIMConfig, {
          electricityPricesM2: JSON.stringify({ eco: 35, std: 900, premium: 100 }),
        }),
      ).rejects.toThrow(/hors bornes/);
    });

    it("le tableau de bord admin expose le barème effectif appliqué", async () => {
      const adminT = t.withIdentity({ subject: userId });
      await adminT.mutation(api.bimConfig.saveBIMConfig, {
        electricityPricesM2: JSON.stringify(NEW_PRICES),
      });
      const config: any = await adminT.query(api.bimConfig.getBIMConfig, {});
      expect(config.parsedElectricityPrices).toEqual(NEW_PRICES);
      expect(config.electricityPricesAreDefault).toBe(false);
      expect(config.electricityPriceRanges.std).toEqual({ min: 5, max: 300, label: "Standard" });
    });
  });

  // ── Cas C ──────────────────────────────────────────────────────────────
  describe("Cas C · scénarios Économique / Standard / Premium", () => {
    const NEW_PRICES = { eco: 50, std: 70, premium: 120 };

    it("chaque scénario porte le barème de SON niveau", async () => {
      const before = await createAndEstimate(t, userId, {
        name: "C · avant config",
        surface: 100,
        floors: 1,
      });
      const regionFactor = before.project.costEstimate.electricity.regionFactor;

      const adminT = t.withIdentity({ subject: userId });
      await adminT.mutation(api.bimConfig.saveBIMConfig, {
        electricityPricesM2: JSON.stringify(NEW_PRICES),
      });

      const after = await createAndEstimate(t, userId, {
        name: "C · après config",
        surface: 100,
        floors: 1,
      });

      const keys = [
        ["economique", "eco"],
        ["standard", "std"],
        ["premium", "premium"],
      ] as const;

      for (const [scenario, priceKey] of keys) {
        const deltaTotal =
          scenarioTotal(after.project.costEstimate, scenario) -
          scenarioTotal(before.project.costEstimate, scenario);
        const deltaElec =
          electricityAmount({
            surface: 100,
            scenario,
            prices: NEW_PRICES,
            regionFactor,
          }) -
          electricityAmount({
            surface: 100,
            scenario,
            prices: ELECTRICITY_PRICE_M2,
            regionFactor,
          });
        // Changer le barème ne déplace, dans chaque scénario, QUE le poste
        // électrique de son propre niveau de qualité.
        expect(deltaTotal).toBe(deltaElec);
        expect(after.project.costEstimate.budgetScenarios[scenario].costPerM2).toBe(
          before.project.costEstimate.budgetScenarios[scenario].costPerM2,
        );
        expect(NEW_PRICES[priceKey]).toBeGreaterThan(0);
      }

      // Les trois scénarios restent ordonnés Économique < Standard < Premium.
      const ce = after.project.costEstimate;
      expect(ce.budgetScenarios.economique.totalCost).toBeLessThan(ce.totalCost);
      expect(ce.budgetScenarios.premium.totalCost).toBeGreaterThan(ce.totalCost);
    });
  });

  // ── Cas D ──────────────────────────────────────────────────────────────
  describe("Cas D · projet « Électricité complète »", () => {
    it("le poste EST le projet : jamais ajouté une seconde fois", async () => {
      const { project } = await createAndEstimate(t, userId, {
        name: "D · électricité complète",
        surface: 100,
        floors: 1,
        category: "electricite_complete",
      });
      const ce = project.costEstimate;

      expect(ce.electricity.isProjectScope).toBe(true);
      expect(ce.electricity.adjustment).toBe(0);
      expect(ce.levelBreakdown.electricityAdjustment).toBe(0);
      expect(ce.totalCost).toBe(
        ce.levelBreakdown.levels.reduce((s: number, l: any) => s + l.amount, 0) +
          ce.levelBreakdown.roof.amount,
      );
      // Le poste affiché et le coût du projet reposent sur le même barème.
      expect(Math.abs(ce.totalCost - ce.electricity.amount)).toBeLessThanOrEqual(100);
    });

    it("le barème administrateur pilote aussi le coût du projet", async () => {
      const before = await createAndEstimate(t, userId, {
        name: "D · avant config",
        surface: 100,
        floors: 1,
        category: "electricite_complete",
      });

      const adminT = t.withIdentity({ subject: userId });
      await adminT.mutation(api.bimConfig.saveBIMConfig, {
        electricityPricesM2: JSON.stringify({ eco: 35, std: 100, premium: 150 }),
      });

      const after = await createAndEstimate(t, userId, {
        name: "D · après config",
        surface: 100,
        floors: 1,
        category: "electricite_complete",
      });

      const ce = after.project.costEstimate;
      expect(ce.electricity.priceM2).toBe(100);
      expect(ce.electricity.amount).toBe(
        electricityAmount({
          surface: 100,
          scenario: "standard",
          prices: { eco: 35, std: 100, premium: 150 },
          regionFactor: ce.electricity.regionFactor,
        }),
      );
      // Le coût au m² du projet suit le barème enregistré (même ratio que le
      // poste électrique : coefficient régional × prix du barème).
      expect(ce.costPerSquareMeter).toBe(Math.round(ce.electricity.regionFactor * 100));
      expect(ce.totalCost).toBeGreaterThan(before.project.costEstimate.totalCost);
    });
  });
});
