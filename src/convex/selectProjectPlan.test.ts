/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { generateFloorPlans } from "../lib/floorPlanEngine";

const modules = import.meta.glob("./**/*.*s");

async function createUser(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Client Plans",
      email: "plans@test.com",
      role: "admin",
      status: "active",
      subscriptionPlan: "free",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

describe("projects.selectProjectPlan — référence du Journey", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createUser(t);
  });

  it("enregistre la variante et ses surfaces réelles par niveau", async () => {
    const userT = t.withIdentity({ subject: userId });
    const projectId = await userT.mutation(api.projects.createProject, {
      name: "Maison 150",
      category: "maison",
      region: "tunis",
      surface: 150,
      floors: 2,
    } as any);

    const variant = generateFloorPlans({
      category: "maison",
      surface: 150,
      floors: 2,
      plotArea: 300,
      works: ["piscine", "jardin"],
      pools: 1,
    })[0];
    const levelSurfaces = variant.floors.map((f) =>
      Number(f.rooms.filter((r) => !r.exterior).reduce((s, r) => s + r.area, 0).toFixed(2)),
    );

    await userT.mutation(api.projects.selectProjectPlan, {
      projectId,
      variantId: variant.id,
      styleId: variant.styleId,
      name: variant.name,
      builtArea: variant.surfaces.built,
      levelSurfaces,
      footprint: variant.footprint,
    });

    const project: any = await t.run(async (ctx) => ctx.db.get(projectId));
    expect(project.planSelection.variantId).toBe(variant.id);
    expect(project.planSelection.styleId).toBe(variant.styleId);
    expect(project.planSelection.builtArea).toBeCloseTo(variant.surfaces.built, 1);
    expect(project.planSelection.footprint.length).toBeCloseTo(variant.footprint.length, 2);
    expect(project.levelSurfaces).toEqual(levelSurfaces);
    // La surface demandée du projet n'est jamais réécrite par la sélection.
    expect(project.surface).toBe(150);
  });

  it("conserve 100 m² au RDC + 80 m² à l'étage après rechargement (180 m²)", async () => {
    const userT = t.withIdentity({ subject: userId });
    const projectId = await userT.mutation(api.projects.createProject, {
      name: "Maison 100 + 80",
      category: "maison",
      region: "tunis",
      surface: 100,
      floors: 2,
    } as any);

    const variant = generateFloorPlans({
      category: "maison",
      surface: 100,
      floors: 2,
      levelSurfaces: [100, 80],
      bedrooms: 3,
    })[0];
    const levelSurfaces = variant.floors.map((f) =>
      Number(f.rooms.filter((r) => !r.exterior).reduce((s, r) => s + r.area, 0).toFixed(2)),
    );
    expect(levelSurfaces).toEqual([100, 80]);

    await userT.mutation(api.projects.selectProjectPlan, {
      projectId,
      variantId: variant.id,
      styleId: variant.styleId,
      name: variant.name,
      builtArea: variant.surfaces.built,
      levelSurfaces,
      footprint: variant.footprint,
    });

    // Rechargement du projet : les surfaces enregistrées sont la référence.
    const project: any = await userT.query(api.projects.getProject, { projectId });
    expect(project.surface).toBe(100);
    expect(project.levelSurfaces).toEqual([100, 80]);
    expect(project.planSelection.builtArea).toBeCloseTo(180, 1);
    expect(project.planSelection.levelSurfaces).toEqual([100, 80]);

    // Une régénération depuis les données rechargées redonne 100 / 80 / 180.
    const regenerated = generateFloorPlans({
      category: project.category,
      surface: project.surface,
      floors: project.floors,
      levelSurfaces: project.levelSurfaces,
    })[0];
    const covered = regenerated.floors.map((f) =>
      f.rooms.filter((r) => !r.exterior).reduce((s, r) => s + r.area, 0),
    );
    regenerated.floors.forEach((f, idx) => {
      expect(covered[idx] + f.rooms.filter((r) => r.exterior).reduce((s, r) => s + r.area, 0)).toBeCloseTo(
        [100, 80][idx],
        1,
      );
    });
    expect(regenerated.surfaces.built).toBeLessThanOrEqual(180);
  });

  it("refuse la sélection d'un projet appartenant à un autre utilisateur", async () => {
    const ownerT = t.withIdentity({ subject: userId });
    const projectId = await ownerT.mutation(api.projects.createProject, {
      name: "Projet privé",
      category: "maison",
      region: "tunis",
      surface: 120,
      floors: 1,
    } as any);

    const otherId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Autre",
        email: "autre@test.com",
        role: "user",
        status: "active",
        subscriptionPlan: "free",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    await expect(
      t.withIdentity({ subject: otherId }).mutation(api.projects.selectProjectPlan, {
        projectId,
        variantId: "plan-v1",
        styleId: "contemporain",
        name: "Variante 1 · Contemporain",
        builtArea: 120,
        levelSurfaces: [120],
        footprint: { length: 12, width: 10 },
      }),
    ).rejects.toThrow(/Unauthorized/);
  });
});
