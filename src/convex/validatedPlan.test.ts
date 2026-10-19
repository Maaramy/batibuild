/// <reference types="vite/client" />

// ============================================================================
// PLAN VALIDÉ → ÉTAPES SUIVANTES DU PARCOURS
// ----------------------------------------------------------------------------
// Vérifie le chemin réel du produit :
//   createProject → validateProjectPlan → simulateAnalysis → projet enregistré
//
// Le plan validé doit devenir la source des surfaces, des niveaux, des pièces
// et donc du coût / du quantitatif utilisés par « Matériaux utilisés » et
// « Aide à la décision ». Aucune surface n'est ressaisie après la validation.
// ============================================================================

import { beforeEach, describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

type RoomSpec = [kind: string, label: string, w: number, h: number];

function plan(floors: { level: number; rooms: RoomSpec[] }[], variantId = "plan-v3") {
  const mapped = floors.map(({ level, rooms }) => {
    const mappedRooms = rooms.map(([kind, label, w, h]) => ({
      id: `L${level}-${label}`,
      kind,
      label,
      w,
      h,
      area: Math.round(w * h * 1000) / 1000,
    }));
    return {
      level,
      area:
        Math.round(mappedRooms.reduce((sum, room) => sum + room.area, 0) * 100) / 100,
      rooms: mappedRooms,
    };
  });
  return {
    variantId,
    variantName: "Variante 3 · Compacte",
    score: 92,
    footprint: { length: 10, width: 10 },
    totalArea: Math.round(mapped.reduce((sum, floor) => sum + floor.area, 0) * 100) / 100,
    floors: mapped,
  };
}

// RDC de 100 m² exactement (35 + 12 + 16 + 14 + 6 + 3 + 14).
const RDC_ROOMS: RoomSpec[] = [
  ["sejour", "Séjour", 7, 5],
  ["cuisine", "Cuisine", 4, 3],
  ["chambre", "Chambre 1", 4, 4],
  ["chambre", "Chambre 2", 3.5, 4],
  ["sdb", "SDB", 3, 2],
  ["wc", "WC", 2, 1.5],
  ["couloir", "Couloir", 2, 7],
];

// Étage de 80 m² (4 chambres de 16 + SDB 6 + couloir 10).
const UPPER_ROOMS: RoomSpec[] = [
  ["chambre", "Chambre 3", 4, 4],
  ["chambre", "Chambre 4", 4, 4],
  ["chambre", "Chambre 5", 4, 4],
  ["chambre", "Chambre 6", 4, 4],
  ["sdb", "SDB étage", 3, 2],
  ["couloir", "Couloir étage", 2, 5],
];

const PLAN_RDC_100 = plan([{ level: 0, rooms: RDC_ROOMS }]);

const PLAN_R1_100_80 = plan([
  { level: 0, rooms: RDC_ROOMS },
  { level: 1, rooms: UPPER_ROOMS },
]);

async function createUser(
  t: ReturnType<typeof convexTest>,
  suffix: string,
  role: "admin" | "user" = "admin",
) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: `User ${suffix}`,
      email: `plan-${suffix}@test.com`,
      role,
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
  userId: string,
  input: {
    name: string;
    surface: number;
    floors: number;
    levelSurfaces?: number[];
    bedrooms?: number;
  },
) {
  const asUser = t.withIdentity({ subject: userId });
  return asUser.mutation(api.projects.createProject, {
    name: input.name,
    category: "maison" as any,
    region: "tunis" as any,
    surface: input.surface,
    floors: input.floors,
    levelSurfaces: input.levelSurfaces,
    bedrooms: input.bedrooms,
  });
}

describe("validateProjectPlan — le plan validé alimente tout le parcours", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createUser(t, Math.random().toString(36).slice(2));
  });

  it("enregistre les surfaces, niveaux, dimensions et pièces du plan", async () => {
    const asUser = t.withIdentity({ subject: userId });
    const projectId = await createProject(t, userId, {
      name: "Maison plan validé",
      surface: 100,
      floors: 1,
      levelSurfaces: [100],
      bedrooms: 1,
    });

    const result = await asUser.mutation(api.projects.validateProjectPlan, {
      projectId,
      plan: PLAN_R1_100_80,
    });

    const project: any = await t.run(async (ctx) => ctx.db.get(projectId));

    expect(result.surface).toBe(100);
    expect(result.floors).toBe(2);
    expect(result.levelSurfaces).toEqual([100, 80]);
    expect(project.surface).toBe(100);
    expect(project.floors).toBe(2);
    expect(project.levelSurfaces).toEqual([100, 80]);
    expect(project.bedrooms).toBe(6);
    expect(project.bathrooms).toBe(2);
    expect(project.kitchens).toBe(1);
    expect(project.livingRooms).toBe(1);
    expect(project.wcs).toBe(1);

    // Instantané complet : dimensions réelles des pièces conservées.
    expect(project.validatedPlan.variantId).toBe("plan-v3");
    expect(project.validatedPlan.validatedAt).toBeGreaterThan(0);
    expect(project.validatedPlan.totalArea).toBe(180);
    expect(project.validatedPlan.floors).toHaveLength(2);
    const bedroom = project.validatedPlan.floors[0].rooms.find(
      (r: any) => r.label === "Chambre 2",
    );
    expect(bedroom).toMatchObject({ kind: "chambre", w: 3.5, h: 4, area: 14 });
  });

  it("invalide l'estimation et le quantitatif devenus obsolètes", async () => {
    const asUser = t.withIdentity({ subject: userId });
    const projectId = await createProject(t, userId, {
      name: "Maison à réestimer",
      surface: 100,
      floors: 1,
    });
    await asUser.mutation(api.projects.simulateAnalysis, { projectId });

    const before: any = await t.run(async (ctx) => ctx.db.get(projectId));
    expect(before.costEstimate).toBeTruthy();
    expect(before.dqe).toBeTruthy();

    await asUser.mutation(api.projects.validateProjectPlan, {
      projectId,
      plan: PLAN_R1_100_80,
    });

    const after: any = await t.run(async (ctx) => ctx.db.get(projectId));
    expect(after.costEstimate).toBeUndefined();
    expect(after.dqe).toBeUndefined();
  });

  it("recalcule le coût multi-niveaux sur les surfaces du plan validé", async () => {
    const asUser = t.withIdentity({ subject: userId });
    const projectId = await createProject(t, userId, {
      name: "Maison R+1 plan",
      surface: 100,
      floors: 1,
    });

    await asUser.mutation(api.projects.validateProjectPlan, {
      projectId,
      plan: PLAN_R1_100_80,
    });
    await asUser.mutation(api.projects.simulateAnalysis, { projectId });

    const project: any = await t.run(async (ctx) => ctx.db.get(projectId));
    expect(project.costEstimate).toBeTruthy();
    expect(project.dqe).toBeTruthy();

    // Le calcul multi-niveaux reprend EXACTEMENT les surfaces du plan.
    const levels = project.costEstimate.levelBreakdown.levels;
    expect(levels).toHaveLength(2);
    expect(levels.map((l: any) => l.label)).toEqual(["RDC", "R+1"]);
    expect(levels.map((l: any) => l.area)).toEqual([100, 80]);
    expect(project.costEstimate.totalCost).toBe(project.dqe.totals.total);
  });

  it("un autre plan validé produit un autre coût et d'autres quantités", async () => {
    const asUser = t.withIdentity({ subject: userId });
    const smaller = await createProject(t, userId, {
      name: "Plan RDC",
      surface: 100,
      floors: 1,
    });
    const larger = await createProject(t, userId, {
      name: "Plan R+1",
      surface: 100,
      floors: 1,
    });

    await asUser.mutation(api.projects.validateProjectPlan, {
      projectId: smaller,
      plan: PLAN_RDC_100,
    });
    await asUser.mutation(api.projects.validateProjectPlan, {
      projectId: larger,
      plan: PLAN_R1_100_80,
    });
    await asUser.mutation(api.projects.simulateAnalysis, { projectId: smaller });
    await asUser.mutation(api.projects.simulateAnalysis, { projectId: larger });

    const p1: any = await t.run(async (ctx) => ctx.db.get(smaller));
    const p2: any = await t.run(async (ctx) => ctx.db.get(larger));

    expect(p2.surface).toBe(100);
    expect(p2.floors).toBe(2);
    expect(p2.costEstimate.totalCost).toBeGreaterThan(p1.costEstimate.totalCost);
    expect(p2.dqe.totals.total).toBeGreaterThan(p1.dqe.totals.total);
  });

  it("refuse un plan sans niveau et ne modifie pas le projet", async () => {
    const asUser = t.withIdentity({ subject: userId });
    const projectId = await createProject(t, userId, {
      name: "Plan invalide",
      surface: 100,
      floors: 1,
    });

    await expect(
      asUser.mutation(api.projects.validateProjectPlan, {
        projectId,
        plan: { ...PLAN_RDC_100, floors: [] },
      }),
    ).rejects.toThrow(/aucun niveau/i);

    const project: any = await t.run(async (ctx) => ctx.db.get(projectId));
    expect(project.surface).toBe(100);
    expect(project.floors).toBe(1);
    expect(project.validatedPlan).toBeUndefined();
  });

  it("refuse la validation d'un projet d'un autre utilisateur", async () => {
    const projectId = await createProject(t, userId, {
      name: "Projet privé",
      surface: 100,
      floors: 1,
    });
    const otherId = await createUser(
      t,
      `other-${Math.random().toString(36).slice(2)}`,
      "user",
    );
    const asOther = t.withIdentity({ subject: otherId });

    await expect(
      asOther.mutation(api.projects.validateProjectPlan, {
        projectId,
        plan: PLAN_RDC_100,
      }),
    ).rejects.toThrow(/unauthorized/i);
  });
});
