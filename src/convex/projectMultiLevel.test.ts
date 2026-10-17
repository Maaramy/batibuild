/// <reference types="vite/client" />

// ============================================================================
// COÛT MULTI-NIVEAUX — TEST DE BOUT EN BOUT (interface réelle du produit)
// ----------------------------------------------------------------------------
// Le calcul est vérifié à travers le CHEMIN RÉEL utilisé par l'application :
//   createProject (surfaces par niveau) → simulateAnalysis (moteur BIM + DQE)
//   → projet enregistré (coût estimatif + Quantitatif détaillé).
// Il couvre :
//   • la correction du calcul R+1 / R+2 (jamais deux RDC complets) ;
//   • l'usage des surfaces RÉELLES saisies par niveau ;
//   • la configuration des coefficients par l'administrateur, sans code ;
//   • la cohérence coût global TTC ↔ somme du DQE ;
//   • l'absence de double comptage des travaux communs (fondations, toiture).
// ============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { runBIMEstimation } from "./bimEngine";

const modules = import.meta.glob("./**/*.*s");

async function createAdminUser(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Admin Test",
      email: "admin-multiniveau@test.com",
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

/** Crée un projet puis lance l'estimation réelle (moteur BIM + DQE). */
async function createAndEstimate(
  t: ReturnType<typeof convexTest>,
  userId: string,
  input: {
    surface: number;
    floors: number;
    levelSurfaces?: number[];
    name: string;
    region?: "tunis" | "medenine";
  },
) {
  const userT = t.withIdentity({ subject: userId });
  const projectId = await userT.mutation(api.projects.createProject, {
    name: input.name,
    category: "maison" as any,
    region: (input.region ?? "tunis") as any,
    surface: input.surface,
    floors: input.floors,
    levelSurfaces: input.levelSurfaces,
  });
  await userT.mutation(api.projects.simulateAnalysis, { projectId });
  const project: any = await t.run(async (ctx) => ctx.db.get(projectId));
  return { projectId, project };
}

const sumLevelsAndRoof = (ce: any) =>
  ce.levelBreakdown.levels.reduce((s: number, l: any) => s + l.amount, 0) +
  ce.levelBreakdown.roof.amount +
  // Ajustements explicites (ex. Second œuvre facturé à la somme réelle de ses
  // postes) : comptés une seule fois, jamais noyés dans un niveau.
  (ce.levelBreakdown.costAdjustments ?? []).reduce(
    (s: number, a: any) => s + (Number(a.amount) || 0),
    0,
  );

describe("Estimation enregistrée d'un projet à étages (createProject → simulateAnalysis)", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createAdminUser(t);
  });

  it("R+1 (100 + 100 m²) : jamais deux coûts complets de RDC", async () => {
    const rdc = await createAndEstimate(t, userId, { surface: 100, floors: 1, name: "RDC 100" });
    const r1 = await createAndEstimate(t, userId, {
      surface: 100,
      floors: 2,
      levelSurfaces: [100, 100],
      name: "R+1 100/100",
    });

    const ceRdc = rdc.project.costEstimate;
    const ce = r1.project.costEstimate;

    // Le coût TTC est la somme réelle du quantitatif : le lot « Second œuvre
    // et finitions » est facturé à ses postes réels (peinture au seau de 20 L,
    // plomberie / électricité au m²), les autres lots restant sur la grille.
    const dqeRdc = rdc.project.dqe;
    expect(ceRdc.totalCost).toBe(dqeRdc.totals.total);
    expect(ceRdc.costPerSquareMeter).toBe(Math.round(ceRdc.totalCost / 100));
    expect(ceRdc.totalCost).toBeLessThan(1980 * 100);
    expect(ce.totalCost).toBeGreaterThan(ceRdc.totalCost);
    expect(ce.totalCost).toBeLessThan(ceRdc.totalCost * 2);

    // Détail du calcul persisté : RDC 100 % (frais communs une seule fois) + R+1 75 %.
    const lb = ce.levelBreakdown;
    expect(lb.levels.map((l: any) => l.label)).toEqual(["RDC", "R+1"]);
    expect(lb.levels[0].coefficient).toBe(1);
    expect(lb.levels[0].commonAmount).toBeGreaterThan(0);
    expect(lb.levels[1].commonAmount).toBe(0);
    expect(lb.levels[1].coefficient).toBe(0.75);
    expect(lb.levels[1].amount).toBe(Math.round(1980 * 100 * 0.75));
    expect(ce.totalCost).toBe(sumLevelsAndRoof(ce));
    expect(lb.anomalies).toEqual([]);
  });

  it("Second œuvre et finitions : barème réel peinture / plomberie / électricité, main-d'œuvre affichée", async () => {
    const { project } = await createAndEstimate(t, userId, {
      surface: 100,
      floors: 1,
      name: "Barème 100 m²",
    });
    const ce = project.costEstimate;
    const so = project.dqe.lots.find((l: any) => l.id === "second_oeuvre");
    const line = (prefix: string) =>
      so.lines.find((l: any) => l.designation.startsWith(prefix));

    // Peinture : 18 seaux de 20 L en intérieur, 12 en extérieur (100 m²).
    // Projet à Tunis : barème national × coefficient régional 1,10.
    const paintInt = line("Peinture intérieure");
    expect(paintInt.unit).toBe("seau 20 L");
    expect(paintInt.quantity).toBe(18);
    expect(paintInt.unitPrice).toBe(178.82);
    expect(paintInt.labor.quantity).toBe(250);
    expect(paintInt.labor.unitPrice).toBe(4.4);
    const paintExt = line("Peinture extérieure");
    expect(paintExt.quantity).toBe(12);
    expect(paintExt.labor.unitPrice).toBe(5.5);
    // Plomberie 93,50 DT/m² et électricité 71,50 DT/m² de surface construite
    // (barème national 85 / 65 DT/m² × 1,10 pour Tunis).
    const plumbing = line("Plomberie");
    expect(plumbing.unitPrice).toBe(93.5);
    expect(plumbing.labor.unitPrice).toBe(38.5);
    const electricity = line("Électricité");
    expect(electricity.unitPrice).toBe(71.5);
    expect(electricity.labor.unitPrice).toBe(27.5);
    // Total du lot = somme de ses postes, comptés une seule fois.
    expect(so.subtotal).toBe(
      so.lines.reduce((s: number, l: any) => s + l.total, 0),
    );
    // Coût TTC et coût/m² enregistrés = quantitatif réel.
    expect(ce.totalCost).toBe(project.dqe.totals.total);
    expect(ce.costPerSquareMeter).toBe(project.dqe.totals.costPerM2);
    expect(ce.budgetScenarios.standard.totalCost).toBe(ce.totalCost);
    // La répartition du moteur retombe sur le nouveau total : seule la
    // catégorie « Second œuvre » porte l'écart, les autres sont intactes.
    const sumBreakdown = ce.breakdown.reduce(
      (s: number, c: any) => s + c.estimatedCost,
      0,
    );
    expect(sumBreakdown).toBe(ce.totalCost);
    // Seule la catégorie « Second œuvre » est décalée du même écart : aucune
    // autre catégorie de la répartition n'est retouchée.
    const pure = runBIMEstimation("maison", 100, 1, "tunis", "standard").costEstimate;
    const delta =
      so.subtotal - (so.allocatedSubtotal ?? so.subtotal);
    for (const cat of pure.breakdown) {
      const storedCat = ce.breakdown.find((c: any) => c.category === cat.category);
      expect(storedCat.estimatedCost, cat.category).toBe(
        cat.category === "second_oeuvre" ? cat.estimatedCost + delta : cat.estimatedCost,
      );
    }
  });

  it("l'impact régional de la grille s'applique au barème du Quantitatif (Tunis vs Médenine)", async () => {
    const tunis = await createAndEstimate(t, userId, {
      surface: 100,
      floors: 1,
      name: "Barème Tunis",
      region: "tunis",
    });
    const medenine = await createAndEstimate(t, userId, {
      surface: 100,
      floors: 1,
      name: "Barème Médenine",
      region: "medenine",
    });
    const second = (p: any) =>
      p.dqe.lots.find((l: any) => l.id === "second_oeuvre");
    const lineOf = (p: any, prefix: string) =>
      second(p).lines.find((l: any) => l.designation.startsWith(prefix));

    // Médenine = base 100 % du barème national : 85 / 65 DT/m², seau inchangé.
    expect(lineOf(medenine.project, "Plomberie").unitPrice).toBe(85);
    expect(lineOf(medenine.project, "Électricité").unitPrice).toBe(65);
    expect(lineOf(medenine.project, "Peinture intérieure").unitPrice).toBe(162.56);

    for (const prefix of ["Peinture intérieure", "Peinture extérieure", "Plomberie", "Électricité"]) {
      const t = lineOf(tunis.project, prefix);
      const m = lineOf(medenine.project, prefix);
      // Mêmes quantités, prix × 1,10 (1 980 / 1 800 = grille régionale 2026).
      expect(t.quantity, prefix).toBe(m.quantity);
      expect(t.unitPrice, prefix).toBeCloseTo(m.unitPrice * 1.1, 2);
      expect(t.labor.unitPrice, prefix).toBeCloseTo(m.labor.unitPrice * 1.1, 2);
    }
    expect(second(tunis.project).subtotal).toBeGreaterThan(
      second(medenine.project).subtotal,
    );
    // Le coefficient n'est appliqué qu'aux postes du barème : les autres
    // articles du Second œuvre (catalogue 2026) restent identiques.
    const scaledNames = ["Peinture intérieure", "Peinture extérieure", "Plomberie", "Électricité"];
    const others = (p: any) =>
      second(p).lines.filter(
        (l: any) => !scaledNames.some((n) => l.designation.startsWith(n)),
      );
    expect(others(tunis.project)).toEqual(others(medenine.project));
    // La cohérence coût global ↔ DQE reste vérifiée dans les deux régions.
    for (const { project } of [tunis, medenine]) {
      expect(project.costEstimate.totalCost).toBe(project.dqe.totals.total);
      expect(project.costEstimate.levelBreakdown.anomalies).toEqual([]);
    }
  });

  it("le Quantitatif détaillé enregistré retombe exactement sur le coût estimatif", async () => {
    const { project } = await createAndEstimate(t, userId, {
      surface: 100,
      floors: 2,
      levelSurfaces: [100, 100],
      name: "R+1 DQE",
    });
    const ce = project.costEstimate;
    const dqe = project.dqe;
    const sumLots = dqe.lots.reduce((s: number, l: any) => s + l.subtotal, 0);
    expect(sumLots).toBe(dqe.totals.total);
    expect(Math.abs(dqe.totals.total - ce.totalCost)).toBeLessThanOrEqual(dqe.lots.length);
    // Aucune anomalie de cohérence DQE ↔ coût global.
    expect(ce.levelBreakdown.anomalies).toEqual([]);
  });

  it("R+2 avec surfaces réelles 100 / 100 / 80 m² : chaque niveau garde SA surface", async () => {
    const { project } = await createAndEstimate(t, userId, {
      surface: 100,
      floors: 3,
      levelSurfaces: [100, 100, 80],
      name: "R+2 100/100/80",
    });
    const ce = project.costEstimate;
    const lb = ce.levelBreakdown;

    expect(project.levelSurfaces).toEqual([100, 100, 80]);
    expect(lb.realBuiltArea).toBe(280);
    expect(lb.levels.map((l: any) => l.area)).toEqual([100, 100, 80]);
    expect(lb.levels[2].amount).toBe(Math.round(1980 * 80 * 0.72));
    // La surface de l'étage n'est jamais remplacée par celle du RDC.
    expect(lb.levels[2].amount).toBeLessThan(lb.levels[1].amount);
    expect(ce.totalCost).toBe(sumLevelsAndRoof(ce));
  });

  it("les fondations et le terrassement du DQE suivent l'emprise au sol, pas les niveaux", async () => {
    const { project } = await createAndEstimate(t, userId, {
      surface: 100,
      floors: 3,
      name: "R+2 emprise",
    });
    const go = project.dqe.lots.find((l: any) => l.id === "gros_oeuvre");
    const fondations = go.lines.find((l: any) => l.designation === "Terrassement et fondations");
    const toiture = go.lines.find((l: any) => l.designation.includes("Toiture"));
    // Comptés une seule fois sur 100 m² d'emprise (et non 300 m² de niveaux).
    expect(fondations.quantity).toBe(100);
    expect(toiture.quantity).toBe(100);
  });

  it("les coefficients enregistrés par l'administrateur pilotent le calcul, sans code", async () => {
    const before = await createAndEstimate(t, userId, {
      surface: 100,
      floors: 2,
      name: "Avant config",
    });

    const adminT = t.withIdentity({ subject: userId });
    await adminT.mutation(api.bimConfig.saveBIMConfig, {
      levelCoefficients: JSON.stringify({ rPlus1: 0.72, commonShare: 0.25, roofWeight: 0.04 }),
      levelCoefficientsValidFrom: Date.UTC(2026, 0, 1),
      levelCoefficientsValidUntil: Date.UTC(2026, 11, 31),
    });

    const after = await createAndEstimate(t, userId, {
      surface: 100,
      floors: 2,
      name: "Après config",
    });

    const lb = after.project.costEstimate.levelBreakdown;
    // Les coefficients enregistrés sont ceux appliqués par le moteur.
    expect(lb.config.rPlus1).toBe(0.72);
    expect(lb.config.commonShare).toBe(0.25);
    expect(lb.config.roofWeight).toBe(0.04);
    expect(lb.levels[1].amount).toBe(Math.round(1980 * 100 * 0.72));
    expect(lb.levels[0].commonAmount).toBe(Math.round(1980 * 100 * 0.25));
    // Coefficient d'étage abaissé → coût global plus bas, sans anomalie.
    expect(after.project.costEstimate.totalCost).toBeLessThan(
      before.project.costEstimate.totalCost,
    );
    // Toujours exactement la somme des niveaux + toiture.
    expect(after.project.costEstimate.totalCost).toBe(sumLevelsAndRoof(after.project.costEstimate));
    expect(lb.anomalies).toEqual([]);
  });

  it("un coefficient incohérent est signalé dans le projet enregistré, jamais masqué", async () => {
    // R+1 à 80 % avec 25 % de frais communs : le coefficient dépasse la part non
    // commune du RDC → les frais fixes seraient comptés deux fois. La valeur reste
    // dans la fourchette admise (65-80 %), elle est donc acceptée puis SIGNALÉE.
    const adminT = t.withIdentity({ subject: userId });
    await adminT.mutation(api.bimConfig.saveBIMConfig, {
      levelCoefficients: JSON.stringify({ rPlus1: 0.8, commonShare: 0.25 }),
    });

    const { project } = await createAndEstimate(t, userId, {
      surface: 100,
      floors: 2,
      name: "Config incohérente",
    });
    const anomalies = project.costEstimate.levelBreakdown.anomalies;
    expect(anomalies.map((a: any) => a.code)).toContain("frais_fixes_dupliques_R+1");
    // Le calcul reste explicite : total = somme des niveaux + toiture.
    expect(project.costEstimate.totalCost).toBe(sumLevelsAndRoof(project.costEstimate));
  });

  it("un coefficient d'étage hors fourchette est refusé à l'enregistrement", async () => {
    const adminT = t.withIdentity({ subject: userId });
    await expect(
      adminT.mutation(api.bimConfig.saveBIMConfig, {
        levelCoefficients: JSON.stringify({ rPlus1: 0.95 }),
      }),
    ).rejects.toThrow(/hors fourchette/);
  });

  it("le tableau de bord admin expose les coefficients effectifs et leur validité", async () => {
    const adminT = t.withIdentity({ subject: userId });
    await adminT.mutation(api.bimConfig.saveBIMConfig, {
      levelCoefficients: JSON.stringify({ rPlus2: 0.7 }),
      levelCoefficientsValidFrom: Date.UTC(2026, 0, 1),
      levelCoefficientsValidUntil: Date.UTC(2026, 11, 31),
    });
    const config: any = await adminT.query(api.bimConfig.getBIMConfig, {});
    // Les valeurs EFFECTIVES (défauts fusionnés) sont celles appliquées au moteur.
    expect(config.parsedLevelCoefficients.rPlus2).toBe(0.7);
    expect(config.parsedLevelCoefficients.rPlus1).toBe(0.75);
    expect(config.levelCoefficientsAreDefault).toBe(false);
    expect(config.levelCoefficientsValidFrom).toBe(Date.UTC(2026, 0, 1));
    expect(config.levelCoefficientsValidUntil).toBe(Date.UTC(2026, 11, 31));
    expect(config.levelCoefficientRanges.rPlus1).toEqual({ min: 0.65, max: 0.8 });
  });
});
