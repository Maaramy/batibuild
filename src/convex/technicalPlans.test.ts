/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

async function createUser(
  t: ReturnType<typeof convexTest>,
  role: "admin" | "user" = "user",
  email = "user@test.com",
) {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      name: "Test User",
      email,
      role,
      status: "active",
      subscriptionPlan: role === "admin" ? "client_pro" : "free",
      phone: "+216 99 000 000",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

async function createProject(t: ReturnType<typeof convexTest>, userId: any, name: string) {
  return t.run((ctx) =>
    ctx.db.insert("projects", {
      userId,
      name,
      category: "maison",
      status: "completed",
      surface: 100,
      floors: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

const overrides = { "pf-r1-wc-0": { x: 1.2, y: 2.4 } };
const quantities = [
  {
    id: "fix-wc",
    kind: "plomberie",
    group: "Appareils sanitaires",
    label: "WC",
    unit: "unité",
    quantity: 1,
  },
];

describe("technicalPlans — persistance versionnée", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("enregistre un plan, incrémente la version et archive l'historique", async () => {
    const adminId = await createUser(t, "admin", "admin@test.com");
    const projectId = await createProject(t, adminId, "Maison 100 m²");
    const asAdmin = t.withIdentity({ subject: adminId });

    const first = await asAdmin.mutation(api.technicalPlans.saveTechnicalPlan, {
      projectId,
      kind: "plomberie",
      variantId: "variant-1",
      level: 0,
      overrides,
      quantities,
      summary: { area: 100 },
    });
    expect(first.version).toBe(1);

    const second = await asAdmin.mutation(api.technicalPlans.saveTechnicalPlan, {
      projectId,
      kind: "plomberie",
      variantId: "variant-1",
      level: 0,
      overrides: { ...overrides, "pf-r1-lavabo-1": { x: 2, y: 1 } },
      quantities,
      summary: { area: 100 },
    });
    expect(second.version).toBe(2);

    const plans = await asAdmin.query(api.technicalPlans.getProjectTechnicalPlans, { projectId });
    expect(plans).toHaveLength(1);
    expect(plans[0].version).toBe(2);
    expect(Object.keys(plans[0].overrides)).toHaveLength(2);

    const versions = await asAdmin.query(api.technicalPlans.getTechnicalPlanVersions, {
      projectId,
      kind: "plomberie",
    });
    expect(versions.map((v) => v.version)).toEqual([2, 1]);
  });

  it("sépare strictement les projets et refuse un utilisateur non propriétaire", async () => {
    const adminId = await createUser(t, "admin", "admin@test.com");
    const otherId = await createUser(t, "user", "other@test.com");
    const projectId = await createProject(t, adminId, "Projet A");
    const asAdmin = t.withIdentity({ subject: adminId });

    await asAdmin.mutation(api.technicalPlans.saveTechnicalPlan, {
      projectId,
      kind: "electricite",
      variantId: "variant-1",
      level: 0,
      overrides: {},
      quantities: [],
      summary: { area: 100 },
    });

    const asOther = t.withIdentity({ subject: otherId });
    const leaked = await asOther.query(api.technicalPlans.getProjectTechnicalPlans, { projectId });
    expect(leaked).toEqual([]);

    await expect(
      asOther.mutation(api.technicalPlans.saveTechnicalPlan, {
        projectId,
        kind: "electricite",
        variantId: "variant-1",
        level: 0,
        overrides: {},
        quantities: [],
        summary: {},
      }),
    ).rejects.toThrow(/Accès refusé/);
  });

  it("rejette des coordonnées forgées et un niveau invalide", async () => {
    const adminId = await createUser(t, "admin", "admin@test.com");
    const projectId = await createProject(t, adminId, "Projet B");
    const asAdmin = t.withIdentity({ subject: adminId });

    await expect(
      asAdmin.mutation(api.technicalPlans.saveTechnicalPlan, {
        projectId,
        kind: "plomberie",
        variantId: "v1",
        level: 0,
        overrides: { x: { x: "loin", y: 2 } },
        quantities,
        summary: {},
      }),
    ).rejects.toThrow(/invalides/);

    await expect(
      asAdmin.mutation(api.technicalPlans.saveTechnicalPlan, {
        projectId,
        kind: "plomberie",
        variantId: "v1",
        level: 99,
        overrides: {},
        quantities,
        summary: {},
      }),
    ).rejects.toThrow(/Niveau de plan invalide/);
  });

  it("ne renvoie rien sans authentification", async () => {
    const adminId = await createUser(t, "admin", "admin@test.com");
    const projectId = await createProject(t, adminId, "Projet C");
    const plans = await t.query(api.technicalPlans.getProjectTechnicalPlans, { projectId });
    expect(plans).toEqual([]);
    const versions = await t.query(api.technicalPlans.getTechnicalPlanVersions, {
      projectId,
      kind: "plomberie",
    });
    expect(versions).toEqual([]);
  });
});
