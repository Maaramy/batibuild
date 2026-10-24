/// <reference types="vite/client" />

// ============================================================================
// ÉVOLUTION ANNUELLE DES COÛTS — BRANCHEMENT AU MOTEUR D'ESTIMATION
// ----------------------------------------------------------------------------
// Le calcul est vérifié à travers le CHEMIN RÉEL de l'application :
//   createProject → simulateAnalysis (moteur BIM + Quantitatif détaillé)
//   → projet enregistré (coût estimatif + DQE + empreinte du barème).
//
// Garanties vérifiées :
//   • seuls les NOUVEAUX calculs portent les taux activés ;
//   • une modification ou une désactivation des taux n'altère JAMAIS une
//     estimation déjà enregistrée (aucun recalcul silencieux) ;
//   • un chiffrage validé n'est jamais majoré ;
//   • le coût estimatif, les scénarios et le Quantitatif restent alignés.
// ============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";
import { defaultCostEvolutionSettings } from "../lib/costEvolution";

const modules = import.meta.glob("./**/*.*s");

async function createAdminUser(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Admin Évolution",
      email: `admin-evolution-estimation-${Math.random()}@test.com`,
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

async function createProject(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  name: string,
) {
  const userT = t.withIdentity({ subject: userId });
  return await userT.mutation(api.projects.createProject, {
    name,
    category: "maison" as never,
    region: "tunis" as never,
    surface: 100,
    floors: 1,
  });
}

const asUser = (t: ReturnType<typeof convexTest>, userId: Id<"users">) =>
  t.withIdentity({ subject: userId });

/** Barème activé, en vigueur quelle que soit l'horloge de la machine. */
async function activateBarème(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  patch: Record<string, unknown> = {},
) {
  const settings = defaultCostEvolutionSettings(Date.now());
  return asUser(t, userId).mutation(api.costEvolution.saveConfig, {
    referenceYear: settings.referenceYear,
    effectiveFrom: Date.now() - 60_000,
    defaultScenario: settings.defaultScenario,
    customRate: settings.customRate,
    enabled: true,
    scenarioRates: settings.scenarioRates,
    categories: settings.categories,
    ...patch,
  } as never);
}

const getProject = (t: ReturnType<typeof convexTest>, id: Id<"projects">) =>
  t.run(async (ctx) => ctx.db.get(id));

/** Somme « Σ niveaux + toiture + ajustements explicites » du détail multi-niveaux. */
const sumLevelsAndRoof = (ce: any) =>
  (ce.levelBreakdown?.levels ?? []).reduce((s: number, l: any) => s + (Number(l?.amount) || 0), 0) +
  (Number(ce.levelBreakdown?.roof?.amount) || 0) +
  (ce.levelBreakdown?.costAdjustments ?? []).reduce(
    (s: number, a: any) => s + (Number(a?.amount) || 0),
    0,
  );

describe("Estimation neuve × barème d'évolution annuelle", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: Id<"users">;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createAdminUser(t);
  });

  it("mécanisme inactif (défaut) : aucune estimation ne porte de taux", async () => {
    const projectId = await createProject(t, userId, "Maison sans barème");
    await asUser(t, userId).mutation(api.projects.simulateAnalysis, { projectId });

    const project = await getProject(t, projectId);
    const fp = project?.costEstimate?.costEvolution as any;
    expect(fp).toBeTruthy();
    expect(fp.status).toBe("inactive");
    expect(fp.increase).toBe(0);
    expect(fp.referenceCost).toBe(project?.costEstimate?.totalCost);
    expect(fp.projectedCost).toBe(project?.costEstimate?.totalCost);
  });

  it("barème activé : le calcul applique les taux et enregistre l'empreinte", async () => {
    const userT = asUser(t, userId);
    const projectId = await createProject(t, userId, "Maison nouvelle");

    // 1. Calcul sans barème → coût de référence.
    await userT.mutation(api.projects.simulateAnalysis, { projectId });
    const reference = await getProject(t, projectId);
    const baseTotal = reference!.costEstimate!.totalCost;
    expect(baseTotal).toBeGreaterThan(0);

    // 2. Activation du barème puis nouveau calcul.
    await activateBarème(t, userId);
    await userT.mutation(api.projects.simulateAnalysis, { projectId });

    const project = await getProject(t, projectId);
    const ce: any = project!.costEstimate;
    const fp = ce.costEvolution;

    // Empreinte : version, date, statut, horizon.
    expect(fp.status).toBe("active");
    expect(fp.version).toBe(1);
    expect(fp.years).toBe(1);
    expect(fp.appliedAt).toBeGreaterThan(0);
    expect(fp.referenceYear).toBeGreaterThan(2000);
    expect(fp.globalRate).toBe(3);
    expect(fp.referenceCost).toBe(baseTotal);
    expect(fp.projectedCost).toBe(ce.totalCost);
    expect(fp.increase).toBeGreaterThan(0);

    // Les taux sont réellement appliqués (≈ +3 % sur l'ensemble des postes).
    expect(ce.totalCost).toBeGreaterThan(baseTotal * 1.01);
    expect(ce.totalCost).toBeLessThan(baseTotal * 1.06);

    // Cohérence : coût estimatif = somme du Quantitatif détaillé.
    expect(ce.totalCost).toBe(project!.dqe!.totals.total);
    expect(ce.costPerSquareMeter).toBe(Math.round(ce.totalCost / 100));
    expect(
      (project!.dqe!.totals.materiaux ?? 0) +
        (project!.dqe!.totals.mainOeuvre ?? 0) +
        (project!.dqe!.totals.equipements ?? 0) +
        (project!.dqe!.totals.transport ?? 0) +
        (project!.dqe!.totals.etudes ?? 0),
    ).toBe(ce.totalCost);

    // Détail multi-niveaux : invariant exact « total = Σ niveaux (+ ajustements) ».
    expect(sumLevelsAndRoof(ce)).toBe(ce.totalCost);
    expect(ce.levelBreakdown.anomalies).toEqual([]);

    // Scénarios : même rapport, ordre inchangé.
    const scenarios = ce.budgetScenarios;
    expect(scenarios.economique.totalCost).toBeLessThan(scenarios.standard.totalCost);
    expect(scenarios.standard.totalCost).toBeLessThan(scenarios.premium.totalCost);
    expect(scenarios.standard.totalCost).toBe(ce.totalCost);
  });

  it("une modification ou une désactivation des taux n'altère JAMAIS un projet déjà chiffré", async () => {
    const userT = asUser(t, userId);
    const projectId = await createProject(t, userId, "Maison chiffrée");
    await activateBarème(t, userId);
    await userT.mutation(api.projects.simulateAnalysis, { projectId });

    const before = await getProject(t, projectId);
    const estimateSnapshot = JSON.stringify(before!.costEstimate);
    const dqeSnapshot = JSON.stringify(before!.dqe);
    const total = before!.costEstimate!.totalCost;
    expect((before!.costEstimate as any).costEvolution.status).toBe("active");

    // Désactivation du mécanisme (paramètres conservés côté barème).
    await asUser(t, userId).mutation(api.costEvolution.setEnabled, { enabled: false });
    const afterDisable = await getProject(t, projectId);
    expect(JSON.stringify(afterDisable!.costEstimate)).toBe(estimateSnapshot);
    expect(JSON.stringify(afterDisable!.dqe)).toBe(dqeSnapshot);

    // Modification des taux (scénario élevé 8 % + postes à 8 %).
    const settings = defaultCostEvolutionSettings(Date.now());
    await asUser(t, userId).mutation(api.costEvolution.saveConfig, {
      referenceYear: settings.referenceYear,
      effectiveFrom: Date.now() - 60_000,
      defaultScenario: "eleve",
      customRate: 8,
      enabled: true,
      scenarioRates: { moderee: 3, moyen: 5, eleve: 8 },
      categories: settings.categories.map((c) => ({ ...c, rate: 8 })),
    } as never);
    const afterRateChange = await getProject(t, projectId);
    expect(JSON.stringify(afterRateChange!.costEstimate)).toBe(estimateSnapshot);
    expect(JSON.stringify(afterRateChange!.dqe)).toBe(dqeSnapshot);
    expect(afterRateChange!.costEstimate!.totalCost).toBe(total);
  });

  it("un projet estimé SANS barème gagne ses taux au prochain calcul explicite", async () => {
    const userT = asUser(t, userId);
    const projectId = await createProject(t, userId, "Maison recalculée");
    await userT.mutation(api.projects.simulateAnalysis, { projectId });
    const before = await getProject(t, projectId);
    expect((before!.costEstimate as any).costEvolution.status).toBe("inactive");

    await activateBarème(t, userId);
    await userT.mutation(api.projects.simulateAnalysis, { projectId });
    const after = await getProject(t, projectId);

    expect((after!.costEstimate as any).costEvolution.status).toBe("active");
    expect(after!.costEstimate!.totalCost).toBeGreaterThan(before!.costEstimate!.totalCost);
    // Les quantités du Quantitatif sont strictement conservées.
    const linesOf = (dqe: any) =>
      (dqe?.lots ?? []).flatMap((lot: any) =>
        (lot.lines ?? []).map((l: any) => `${lot.id}::${l.designation}::${l.quantity}::${l.unit}`),
      );
    expect(linesOf(after!.dqe)).toEqual(linesOf(before!.dqe));
  });

  it("chiffrage validé : plus aucun taux n'est appliqué aux recalculs", async () => {
    const userT = asUser(t, userId);
    const projectId = await createProject(t, userId, "Maison validée");
    await activateBarème(t, userId);
    await userT.mutation(api.projects.simulateAnalysis, { projectId });
    const evolved = await getProject(t, projectId);
    const evolvedTotal = evolved!.costEstimate!.totalCost;

    await userT.mutation(api.projects.validateCostEstimate, { projectId });
    await userT.mutation(api.projects.simulateAnalysis, { projectId });
    const validated = await getProject(t, projectId);
    const ce: any = validated!.costEstimate;

    expect(ce.costEvolution.status).toBe("validated");
    expect(ce.costEvolution.increase).toBe(0);
    expect(ce.costEvolution.referenceCost).toBe(ce.costEvolution.projectedCost);
    // Sans taux, le calcul retombe STRICTEMENTMENT sur la grille du moteur.
    expect(ce.totalCost).toBeLessThan(evolvedTotal);
    expect(ce.totalCost).toBe(validated!.dqe!.totals.total);
  });

  it("retour à l'inactif : le recalcul retombe exactement sur le coût de référence", async () => {
    const userT = asUser(t, userId);
    const projectId = await createProject(t, userId, "Maison aller-retour");
    await userT.mutation(api.projects.simulateAnalysis, { projectId });
    const referenceTotal = (await getProject(t, projectId))!.costEstimate!.totalCost;

    await activateBarème(t, userId);
    await userT.mutation(api.projects.simulateAnalysis, { projectId });
    const evolvedTotal = (await getProject(t, projectId))!.costEstimate!.totalCost;
    expect(evolvedTotal).toBeGreaterThan(referenceTotal);

    await asUser(t, userId).mutation(api.costEvolution.setEnabled, { enabled: false });
    await userT.mutation(api.projects.simulateAnalysis, { projectId });
    const project = await getProject(t, projectId);

    expect(project!.costEstimate!.totalCost).toBe(referenceTotal);
    expect((project!.costEstimate as any).costEvolution.status).toBe("inactive");
  });

  it("les prix unitaires évoluent, les quantités et les unités jamais", async () => {
    const userT = asUser(t, userId);
    const projectId = await createProject(t, userId, "Maison quantitatif");
    await userT.mutation(api.projects.simulateAnalysis, { projectId });
    const before = (await getProject(t, projectId))!.dqe as any;

    await activateBarème(t, userId);
    await userT.mutation(api.projects.simulateAnalysis, { projectId });
    const after = (await getProject(t, projectId))!.dqe as any;

    expect(after.lots.length).toBe(before.lots.length);
    let compared = 0;
    let increased = 0;
    for (let i = 0; i < before.lots.length; i++) {
      const lb = before.lots[i];
      const la = after.lots[i];
      expect(la.id).toBe(lb.id);
      expect((la.lines ?? []).length).toBe((lb.lines ?? []).length);
      for (let j = 0; j < (lb.lines ?? []).length; j++) {
        const lineB = lb.lines[j];
        const lineA = la.lines[j];
        expect(lineA.designation).toBe(lineB.designation);
        expect(lineA.quantity).toBe(lineB.quantity);
        expect(lineA.unit).toBe(lineB.unit);
        expect(lineA.unitPrice).toBeGreaterThanOrEqual(lineB.unitPrice);
        if (lineA.unitPrice > lineB.unitPrice) increased++;
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(0);
    expect(increased).toBeGreaterThan(0);
  });
});
