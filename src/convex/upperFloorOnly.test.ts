/// <reference types="vite/client" />

// ============================================================================
// MODE « ÉTAGE » — ÉTAGE 1 UNIQUEMENT
// ----------------------------------------------------------------------------
// Vérifie le chemin réel du produit :
//   createProject(levelMode = "floor1", surface = 100)
//   → simulateAnalysis (moteur BIM + DQE)
//   → projet enregistré.
//
// Règles couvertes :
//   • le mode Plain-pied garde le calcul historique (RDC, frais communs) ;
//   • le mode Étage ne calcule QU'UN niveau, l'Étage 1, sur 100 m² ;
//   • aucune fondation, aucun terrassement, aucun VRD, aucune toiture ;
//   • aucune quantité doublée, aucun niveau inférieur ajouté ;
//   • coût estimatif et DQE restent cohérents.
// ============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { runBIMEstimation } from "./bimEngine";
import { generateDqe } from "./dqeEngine";

const modules = import.meta.glob("./**/*.*s");

async function createAdminUser(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Admin Étage",
      email: "admin-etage-1@test.com",
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

async function createAndEstimate(
  t: ReturnType<typeof convexTest>,
  userId: string,
  input: {
    name: string;
    surface: number;
    levelMode?: "plain" | "floor1";
  },
) {
  const userT = t.withIdentity({ subject: userId });
  const projectId = await userT.mutation(api.projects.createProject, {
    name: input.name,
    category: "maison" as any,
    region: "tunis" as any,
    surface: input.surface,
    floors: 1,
    levelMode: input.levelMode,
  });
  await userT.mutation(api.projects.simulateAnalysis, { projectId });
  const project: any = await t.run(async (ctx) => ctx.db.get(projectId));
  return { projectId, project };
}

const allDqeLines = (project: any) =>
  project.dqe.lots.flatMap((lot: any) => lot.lines);

describe("Moteur BIM — mode Étage 1", () => {
  it("calcule un seul niveau de 100 m², sans RDC, sans fondation et sans toiture", () => {
    const result = runBIMEstimation(
      "maison",
      100,
      1,
      "tunis",
      "standard",
      undefined,
      { upperFloorOnly: true },
    );
    const lb = result.costEstimate.levelBreakdown;

    expect(lb.levels).toHaveLength(1);
    expect(lb.levels[0].label).toBe("Étage 1");
    expect(lb.levels[0].area).toBe(100);
    expect(lb.levels[0].commonAmount).toBe(0);
    expect(lb.realBuiltArea).toBe(100);
    expect(lb.roof.counted).toBe(false);
    expect(lb.roof.amount).toBe(0);
    expect(lb.total).toBe(lb.levels[0].amount);
    expect(lb.levels.map((l: any) => l.label)).not.toContain("RDC");
    expect(lb.levels.map((l: any) => l.label)).not.toContain("R+1");

    // Aucun poste de niveau inférieur ou d'enveloppe dans la ventilation BIM.
    const itemNames = result.costEstimate.breakdown.flatMap((category: any) =>
      category.items.map((item: any) => item.name),
    );
    expect(
      itemNames.some((name: string) =>
        /fondation|terrassement|soubassement|dallage|fouille|toiture/i.test(name),
      ),
    ).toBe(false);
  });

  it("ne modifie pas le calcul Plain-pied historique", () => {
    const plain = runBIMEstimation("maison", 100, 1, "tunis", "standard");
    const withFalse = runBIMEstimation(
      "maison",
      100,
      1,
      "tunis",
      "standard",
      undefined,
      { upperFloorOnly: false },
    );

    expect(withFalse.costEstimate).toEqual(plain.costEstimate);
    expect(plain.costEstimate.levelBreakdown.levels[0].label).toBe("RDC");
    expect(plain.costEstimate.levelBreakdown.levels[0].commonAmount).toBeGreaterThan(0);
    expect(plain.costEstimate.levelBreakdown.roof.counted).toBe(false);
  });

  it("produit un DQE d'Étage 1 sans poste de niveau inférieur et sans doublement", () => {
    const estimate = runBIMEstimation(
      "maison",
      100,
      1,
      "tunis",
      "standard",
      undefined,
      { upperFloorOnly: true },
    );
    const dqe = generateDqe({
      category: "maison",
      surface: 100,
      floors: 1,
      totalBudget: estimate.costEstimate.totalCost,
      upperFloorOnly: true,
    });

    const lines = dqe.lots.flatMap((lot) => lot.lines);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((line) => line.levelLabel === "Étage 1")).toBe(true);
    expect(dqe.totals.costPerM2).toBe(Math.round(dqe.totals.total / 100));

    // Aucun poste rattaché au niveau inférieur ou à l'enveloppe du bâtiment.
    const forbidden =
      /fondation|terrassement|soubassement|dallage|fouille|toiture|raccordement|\bVRD\b|étude des sols|permis de construire/i;
    const offending = lines.filter((line) => forbidden.test(line.designation));
    expect(offending.map((line) => line.designation)).toEqual([]);

    // La dalle est calculée sur 100 m², jamais sur 200 m².
    const slab = lines.find((line) => /^Dalle en béton armé$/i.test(line.designation));
    expect(slab).toBeDefined();
    expect(slab!.quantity).toBe(100);

    // Aucun lot d'aménagements extérieurs ni de VRD.
    expect(dqe.lots.map((lot) => lot.id)).not.toContain("amenagements_exterieurs");
    expect(dqe.lots.map((lot) => lot.id)).not.toContain("vrd");
  });
});

describe("Projet 100 m² — mode Étage (createProject → simulateAnalysis)", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createAdminUser(t);
  });

  it("enregistre l'Étage 1 uniquement et retombe exactement sur son DQE", async () => {
    const { project } = await createAndEstimate(t, userId, {
      name: "Étage 1 — 100 m²",
      surface: 100,
      levelMode: "floor1",
    });

    expect(project.levelMode).toBe("floor1");
    expect(project.floors).toBe(1);
    expect(project.levelSurfaces).toEqual([100]);

    const lb = project.costEstimate.levelBreakdown;
    expect(lb.levels.map((level: any) => level.label)).toEqual(["Étage 1"]);
    expect(lb.realBuiltArea).toBe(100);
    expect(lb.roof.counted).toBe(false);
    expect(lb.roof.amount).toBe(0);
    expect(lb.levels[0].commonAmount).toBe(0);
    expect(lb.levels[0].area).toBe(100);

    // Coût total = DQE, lui-même calculé sur 100 m².
    expect(project.costEstimate.totalCost).toBe(project.dqe.totals.total);
    expect(project.dqe.totals.costPerM2).toBe(
      Math.round(project.dqe.totals.total / 100),
    );

    const lines = allDqeLines(project);
    expect(lines.every((line: any) => line.levelLabel === "Étage 1")).toBe(true);
    expect(
      lines.some((line: any) =>
        /fondation|terrassement|soubassement|dallage|toiture|raccordement|\bVRD\b/i.test(
          line.designation,
        ),
      ),
    ).toBe(false);

    // Aucun doublon de niveau : le total n'est jamais celui d'un RDC + étage.
    expect(lb.levels).toHaveLength(1);
    expect(lb.levels[0].amount).toBeLessThan(
      runBIMEstimation("maison", 100, 1, "tunis", "standard").costEstimate.totalCost,
    );
  });

  it("laisse le projet Plain-pied sur son calcul RDC historique", async () => {
    const { project } = await createAndEstimate(t, userId, {
      name: "Plain-pied — 100 m²",
      surface: 100,
      levelMode: "plain",
    });

    const lb = project.costEstimate.levelBreakdown;
    expect(project.levelMode).toBe("plain");
    expect(lb.levels.map((level: any) => level.label)).toEqual(["RDC"]);
    expect(lb.levels[0].commonAmount).toBeGreaterThan(0);
    expect(lb.roof.counted).toBe(false);
    expect(lb.realBuiltArea).toBe(100);
  });
});
