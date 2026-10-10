/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { generateDqe } from "./dqeEngine.js";
import {
  acceptAllRecommendations,
  materialsTotal,
  selectAllRecommended,
} from "./materialSelectionEngine.js";
import { autoLaunchMaterialSelection } from "./materialSelections.js";

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
  // Sélection EXPLICITE (acceptation des recommandations par l'utilisateur).
  return selectAllRecommended(ws.lines, scenario as any);
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

  it("refuse de valider de simples propositions IA non acceptées, puis accepte après décision", async () => {
    const user = await createUser(t);
    const projectId = await createProject(t, user);
    await enableFlag(t);
    const asUser = t.withIdentity({ subject: user });

    const res = await asUser.query(api.materialSelections.getMaterialsWorkspace, { projectId });
    // Propositions IA : couvrent le Quantitatif mais ne sont PAS une sélection.
    const proposals = acceptAllRecommendations(res!.workspace.lines, "standard");
    await expect(
      asUser.mutation(api.materialSelections.confirmSelection, {
        projectId,
        scenario: "standard",
        entries: proposals,
      }),
    ).rejects.toThrow();

    const accepted = selectAllRecommended(res!.workspace.lines, "standard");
    const confirmed = await asUser.mutation(api.materialSelections.confirmSelection, {
      projectId,
      scenario: "standard",
      entries: accepted,
    });
    expect(confirmed.version).toBe(1);
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

// ============================================================================
// §9 — Auto-lancement à la fin du Coût estimatif, sans redirection
// ============================================================================

describe("materialSelections — auto-lancement (§9)", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("initialise le module avec les matériaux sélectionnés par défaut (recommandations IA acceptées)", async () => {
    const user = await createUser(t);
    const projectId = await createProject(t, user);
    await enableFlag(t);

    const launched = await t.run(async (ctx) =>
      autoLaunchMaterialSelection(ctx as any, user, projectId),
    );
    expect(launched.launched).toBe(true);

    const asUser = t.withIdentity({ subject: user });
    const res = await asUser.query(api.materialSelections.getMaterialsWorkspace, { projectId });
    expect(res!.saved).not.toBeNull();
    expect(res!.saved!.status).toBe("en_cours");
    expect(res!.saved!.scenario).toBe("standard");
    // La sélection couvre 100 % des matériaux et n'est pas obsolète.
    expect(Object.keys(res!.saved!.entries ?? {}).length).toBe(res!.workspace.lines.length);
    expect(res!.saved!.stale).toBe(false);
    // Les matériaux apparaissent SÉLECTIONNÉS par défaut, sans intervention de
    // l'utilisateur : les recommandations IA sont acceptées en arrière-plan.
    expect(
      Object.values(res!.saved!.entries ?? {}).every((e: any) => e.userSelected === true),
    ).toBe(true);
    expect((res!.saved!.totals as any).materialsTotal).toBeCloseTo(
      res!.workspace.materialsTotal,
      4,
    );
  });

  it("ne réécrase pas un brouillon tant que le Quantitatif et les prix n'ont pas changé", async () => {
    const user = await createUser(t);
    const projectId = await createProject(t, user);
    await enableFlag(t);

    const first = await t.run(async (ctx) =>
      autoLaunchMaterialSelection(ctx as any, user, projectId),
    );
    expect(first.launched).toBe(true);

    const second = await t.run(async (ctx) =>
      autoLaunchMaterialSelection(ctx as any, user, projectId),
    );
    expect(second.launched).toBe(false);
  });

  it("ne s'auto-lance pas si le module est désactivé", async () => {
    const user = await createUser(t);
    const projectId = await createProject(t, user);
    // Feature flag explicitement désactivé.
    await t.run(async (ctx) =>
      ctx.db.insert("featureFlags", {
        key: "ai_materials",
        name: "Matériaux IA",
        description: "test",
        enabled: false,
        updatedAt: Date.now(),
      }),
    );
    const launched = await t.run(async (ctx) =>
      autoLaunchMaterialSelection(ctx as any, user, projectId),
    );
    expect(launched.launched).toBe(false);
  });

  it("suit le scénario choisi dans « Coût estimatif » (source partagée)", async () => {
    const user = await createUser(t);
    const projectId = await createProject(t, user);
    await enableFlag(t);
    const asUser = t.withIdentity({ subject: user });

    // Le scénario est choisi dans le résultat d'estimation des coûts de
    // construction (page projet) puis doit piloter le module matériaux.
    await asUser.mutation(api.projects.setProjectScenario, {
      projectId,
      scenario: "premium",
    });
    const res = await asUser.query(api.materialSelections.getMaterialsWorkspace, { projectId });
    expect(res!.workspace.scenario).toBe("premium");
  });

  it("répercute sur le projet le scénario choisi dans « Choix matériaux »", async () => {
    const user = await createUser(t);
    const projectId = await createProject(t, user);
    await enableFlag(t);
    const asUser = t.withIdentity({ subject: user });

    await asUser.mutation(api.materialSelections.setSelectionScenario, {
      projectId,
      scenario: "economique",
    });
    const project = await t.run(async (ctx) => ctx.db.get(projectId));
    expect((project as any).selectedScenario).toBe("economique");
  });

  it("ne s'auto-lance pas sans Quantitatif détaillé", async () => {
    const user = await createUser(t);
    await enableFlag(t);
    const projectId = await t.run(async (ctx) =>
      ctx.db.insert("projects", {
        userId: user,
        name: "Projet sans DQE",
        category: "villa",
        status: "draft",
        region: "tunis",
        surface: 150,
        floors: 2,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any),
    );
    const launched = await t.run(async (ctx) =>
      autoLaunchMaterialSelection(ctx as any, user, projectId),
    );
    expect(launched.launched).toBe(false);
  });
});
