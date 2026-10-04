/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { generateDqe } from "./dqeEngine.js";
import { acceptAllRecommendations, materialsTotal } from "./materialSelectionEngine.js";

const modules = import.meta.glob("./**/*.*s");

const SCENARIOS = {
  economique: { label: "Économique", totalCost: 80_000, costPerM2: 800, multiplier: 0.8 },
  standard: { label: "Standard", totalCost: 100_000, costPerM2: 1_000, multiplier: 1 },
  premium: { label: "Premium", totalCost: 125_000, costPerM2: 1_250, multiplier: 1.25 },
};

async function createUser(t: ReturnType<typeof convexTest>, role = "admin") {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Test Matériaux",
      email: `materials-${role}-${Math.random()}@test.com`,
      role,
      status: "active",
      subscriptionPlan: "pro",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

async function createProject(t: ReturnType<typeof convexTest>, userId: any) {
  const dqe = generateDqe({ category: "villa", surface: 150, floors: 2, totalBudget: 100_000 });
  return t.run(async (ctx) =>
    ctx.db.insert("projects", {
      userId,
      name: "Villa Matériaux",
      category: "villa",
      status: "completed",
      region: "tunis",
      surface: 150,
      floors: 2,
      dqe: dqe as any,
      costEstimate: {
        totalCost: 100_000,
        costPerSquareMeter: 1_000,
        currency: "TND",
        breakdown: [],
        contingencyBuffer: 0,
        contingencyPercentage: 0,
        budgetScenarios: SCENARIOS,
        dqe,
      } as any,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as any),
  );
}

async function enableFlag(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) =>
    ctx.db.insert("featureFlags", {
      key: "ai_materials",
      name: "Matériaux IA",
      description: "test",
      enabled: true,
      updatedAt: Date.now(),
    }),
  );
}

function entriesFromWorkspace(ws: any, scenario: string) {
  return acceptAllRecommendations(ws.lines, scenario as any);
}

describe("materialSelections — API", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("refuse l'accès sans authentification", async () => {
    const user = await createUser(t);
    const projectId = await createProject(t, user);
    const ws = await t.query(api.materialSelections.getMaterialsWorkspace, { projectId });
    expect(ws).toBeNull();
  });

  it("renvoie un espace de travail cohérent pour le propriétaire", async () => {
    const user = await createUser(t);
    const projectId = await createProject(t, user);
    const asUser = t.withIdentity({ subject: user });

    const res = await asUser.query(api.materialSelections.getMaterialsWorkspace, { projectId });
    expect(res).not.toBeNull();
    expect(res!.workspace.hasQuantitatif).toBe(true);
    expect(res!.workspace.scenario).toBe("standard");
    expect(res!.workspace.lines.length).toBeGreaterThan(0);
    expect(res!.workspace.materialsTotal).toBeCloseTo(materialsTotal(res!.workspace.lines), 4);
    expect(res!.saved).toBeNull();
  });

  it("ne laisse pas un autre utilisateur accéder au projet", async () => {
    const owner = await createUser(t);
    const other = await createUser(t, "user");
    const projectId = await createProject(t, owner);
    const asOther = t.withIdentity({ subject: other });
    const res = await asOther.query(api.materialSelections.getMaterialsWorkspace, { projectId });
    expect(res).toBeNull();
  });

  it("persiste le scénario puis la sélection, et crée une version validée", async () => {
    const user = await createUser(t);
    const projectId = await createProject(t, user);
    await enableFlag(t);
    const asUser = t.withIdentity({ subject: user });

    await asUser.mutation(api.materialSelections.setSelectionScenario, {
      projectId,
      scenario: "premium",
    });
    let res = await asUser.query(api.materialSelections.getMaterialsWorkspace, { projectId });
    expect(res!.workspace.scenario).toBe("premium");
    expect(res!.saved!.scenario).toBe("premium");

    const entries = entriesFromWorkspace(res!.workspace, "premium");
    const draft = await asUser.mutation(api.materialSelections.saveSelectionDraft, {
      projectId,
      scenario: "premium",
      entries,
    });
    expect(draft.totals.materialsTotal).toBeCloseTo(res!.workspace.materialsTotal, 4);

    const confirmed = await asUser.mutation(api.materialSelections.confirmSelection, {
      projectId,
      scenario: "premium",
      entries,
    });
    expect(confirmed.version).toBe(1);
    expect(confirmed.score.total).toBeGreaterThan(0);

    const versions = await asUser.query(api.materialSelections.getSelectionVersions, { projectId });
    expect(versions).toHaveLength(1);
    expect(versions[0].scenario).toBe("premium");

    res = await asUser.query(api.materialSelections.getMaterialsWorkspace, { projectId });
    expect(res!.saved!.status).toBe("valides");
    expect(res!.saved!.stale).toBe(false);
  });

  it("refuse de valider une sélection incomplète (recalcul serveur)", async () => {
    const user = await createUser(t);
    const projectId = await createProject(t, user);
    await enableFlag(t);
    const asUser = t.withIdentity({ subject: user });

    const res = await asUser.query(api.materialSelections.getMaterialsWorkspace, { projectId });
    const entries = entriesFromWorkspace(res!.workspace, "standard");
    delete (entries as any)[res!.workspace.lines[0].articleId];

    await expect(
      asUser.mutation(api.materialSelections.confirmSelection, {
        projectId,
        scenario: "standard",
        entries,
      }),
    ).rejects.toThrow();
  });

  it("réinitialise la sélection courante", async () => {
    const user = await createUser(t);
    const projectId = await createProject(t, user);
    await enableFlag(t);
    const asUser = t.withIdentity({ subject: user });

    await asUser.mutation(api.materialSelections.setSelectionScenario, {
      projectId,
      scenario: "economique",
    });
    await asUser.mutation(api.materialSelections.resetSelection, { projectId });
    const res = await asUser.query(api.materialSelections.getMaterialsWorkspace, { projectId });
    expect(res!.saved).toBeNull();
  });
});
