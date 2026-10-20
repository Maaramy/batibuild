/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { generateFloorPlans } from "../lib/floorPlanEngine";
import {
  ARCHITECTURAL_PLAN_TYPES,
  ARCHITECTURAL_SPECS,
} from "../lib/architecturalSpecs";

const modules = import.meta.glob("./**/*.*s");

async function createUser(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Client Plans 14 types",
      email: "plans14@test.com",
      role: "admin",
      status: "active",
      subscriptionPlan: "free",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

describe("plans des 14 types — enregistrement et rechargement", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createUser(t);
  });

  it("conserve la variante, les niveaux et les surfaces de chaque type", async () => {
    const userT = t.withIdentity({ subject: userId });

    for (const category of ARCHITECTURAL_PLAN_TYPES) {
      const spec = ARCHITECTURAL_SPECS[category];
      const projectId = await userT.mutation(api.projects.createProject, {
        name: `Projet ${spec.label}`,
        category,
        region: "tunis",
        surface: spec.surface.default,
        floors: spec.levels.default,
        surfaceTotale: Math.max(600, spec.surface.default * 2.5),
      });

      const variant = generateFloorPlans({
        category,
        surface: spec.surface.default,
        floors: spec.levels.default,
        plotArea: Math.max(600, spec.surface.default * 2.5),
      })[0];
      const levelSurfaces = variant.floors.map((floor) =>
        Number(
          floor.rooms
            .filter((r) => !r.exterior)
            .reduce((s, r) => s + r.area, 0)
            .toFixed(2),
        ),
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

      // Rechargement : mêmes données après relecture de la base.
      type ReloadedProject = {
        category: string;
        surface?: number;
        floors?: number;
        levelSurfaces?: number[];
        planSelection?: { variantId: string; name: string; builtArea: number };
      };
      const reloaded = (await userT.query(api.projects.getProject, {
        projectId,
      })) as ReloadedProject | null;
      expect(reloaded, category).toBeTruthy();
      expect(reloaded!.category).toBe(category);
      expect(reloaded!.planSelection?.variantId).toBe(variant.id);
      expect(reloaded!.planSelection?.name).toBe(variant.name);
      expect(reloaded!.planSelection?.builtArea).toBeCloseTo(variant.surfaces.built, 1);
      expect(reloaded!.levelSurfaces).toEqual(levelSurfaces);
      expect(reloaded!.levelSurfaces).toHaveLength(variant.floors.length);
      // Le nombre de niveaux suit le plan retenu (sinon le coût serait calculé
      // sur un seul niveau d'un plan à deux étages).
      expect(reloaded!.floors).toBe(variant.floors.length);
      // La surface demandée et le type ne sont jamais réécrits par la sélection.
      expect(reloaded!.surface).toBe(spec.surface.default);
    }
  });

  it("aligne le nombre de niveaux du projet sur le plan retenu", async () => {
    const userT = t.withIdentity({ subject: userId });
    // Projet saisi au RDC seul, plan retenu à 2 niveaux (immeuble R+1).
    const projectId = await userT.mutation(api.projects.createProject, {
      name: "Immeuble R+1",
      category: "immeuble",
      region: "tunis",
      surface: 180,
      floors: 1,
      surfaceTotale: 500,
    });
    const variant = generateFloorPlans({
      category: "immeuble",
      surface: 180,
      floors: 2,
      plotArea: 500,
    })[0];
    const levelSurfaces = variant.floors.map((floor) =>
      Number(floor.rooms.filter((r) => !r.exterior).reduce((s, r) => s + r.area, 0).toFixed(2)),
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
    const reloaded = (await userT.query(api.projects.getProject, { projectId })) as {
      floors?: number;
      surface?: number;
      levelSurfaces?: number[];
    } | null;
    expect(reloaded!.floors).toBe(2);
    expect(reloaded!.surface).toBe(180);
    expect(reloaded!.levelSurfaces).toHaveLength(2);
  });
});
