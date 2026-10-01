/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { projectDataVersion, JOURNEY_MODULES } from "./journey.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// Helpers
// ============================================================================

async function createUser(t: ReturnType<typeof convexTest>, email = "u@test.com") {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Test User",
      email,
      role: "user",
      status: "active",
      subscriptionPlan: "free",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

async function createProject(
  t: ReturnType<typeof convexTest>,
  userId: any,
  overrides: Record<string, unknown> = {},
) {
  return t.run(async (ctx) =>
    ctx.db.insert("projects", {
      userId,
      name: "Villa 250 m²",
      category: "villa" as never,
      status: "completed" as never,
      surface: 250,
      floors: 2,
      bedrooms: 4,
      bathrooms: 3,
      region: "tunis" as never,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    } as never),
  );
}

// ============================================================================
// projectDataVersion — empreinte déterministe des données du projet
// ============================================================================

describe("projectDataVersion", () => {
  it("est stable pour les mêmes données", () => {
    const p = { category: "villa", surface: 250, floors: 2, region: "tunis" };
    expect(projectDataVersion(p)).toBe(projectDataVersion({ ...p }));
  });

  it("change quand une donnée importante du projet change", () => {
    const base = { category: "villa", surface: 250, floors: 2, region: "tunis" };
    for (const patch of [
      { surface: 300 },
      { category: "maison" },
      { floors: 3 },
      { region: "sfax" },
      { bedrooms: 5 },
    ]) {
      expect(projectDataVersion({ ...base, ...patch })).not.toBe(
        projectDataVersion(base),
      );
    }
  });

  it("ignore les champs non significatifs (nom, statut, résultats)", () => {
    const base = { category: "villa", surface: 250 };
    expect(
      projectDataVersion({ ...base, name: "Autre nom", status: "draft", costEstimate: { totalCost: 1 } }),
    ).toBe(projectDataVersion(base));
  });
});

// ============================================================================
// getJourneyState / recordJourneyAnalysis / markJourneyRunning
// ============================================================================

describe("journey — cache par projet", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: any;
  let projectId: any;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createUser(t);
    projectId = await createProject(t, userId);
  });

  it("renvoie toutes les étapes au statut « none » sans analyse", async () => {
    const state = await t
      .withIdentity({ subject: userId })
      .query(api.journey.getJourneyState, { projectId });
    expect(Object.keys(state.modules).sort()).toEqual([...JOURNEY_MODULES].sort());
    for (const key of JOURNEY_MODULES) {
      expect(state.modules[key].status).toBe("none");
    }
  });

  it("passe une étape à « done » après enregistrement", async () => {
    await t
      .withIdentity({ subject: userId })
      .mutation(api.journey.recordJourneyAnalysis, {
        projectId,
        module: "materials",
        resultRef: "analysis_123",
      });
    const state = await t
      .withIdentity({ subject: userId })
      .query(api.journey.getJourneyState, { projectId });
    expect(state.modules.materials.status).toBe("done");
    expect(state.modules.materials.resultRef).toBe("analysis_123");
    expect(state.modules.materials.analyzedAt).toBeGreaterThan(0);
    // Les autres étapes ne sont pas affectées.
    expect(state.modules.cost.status).toBe("none");
  });

  it("marque « running » pendant l'analyse", async () => {
    await t
      .withIdentity({ subject: userId })
      .mutation(api.journey.markJourneyRunning, { projectId, module: "plans" });
    const state = await t
      .withIdentity({ subject: userId })
      .query(api.journey.getJourneyState, { projectId });
    expect(state.modules.plans.status).toBe("running");
  });

  it("marque « stale » quand les données du projet ont changé (sans supprimer le résultat)", async () => {
    await t
      .withIdentity({ subject: userId })
      .mutation(api.journey.recordJourneyAnalysis, { projectId, module: "cost" });

    // Modification d'une donnée importante (surface).
    await t.run(async (ctx) => ctx.db.patch(projectId, { surface: 400 }));

    const state = await t
      .withIdentity({ subject: userId })
      .query(api.journey.getJourneyState, { projectId });
    expect(state.modules.cost.status).toBe("stale");
    // Le résultat reste référencé : il n'est jamais supprimé automatiquement.
    expect(state.modules.cost.analyzedAt).toBeGreaterThan(0);
  });

  it("ne crée pas de doublon : une seule ligne par (projet, étape)", async () => {
    for (let i = 0; i < 3; i++) {
      await t
        .withIdentity({ subject: userId })
        .mutation(api.journey.recordJourneyAnalysis, { projectId, module: "consult" });
    }
    const rows = await t.run(async (ctx) =>
      ctx.db.query("journeyAnalyses").collect(),
    );
    expect(rows.filter((r) => r.module === "consult")).toHaveLength(1);
  });

  it("refuse l'accès à un projet qui n'appartient pas à l'utilisateur", async () => {
    const otherId = await createUser(t, "other@test.com");
    const otherProject = await createProject(t, otherId, { name: "Autre" });
    await expect(
      t
        .withIdentity({ subject: userId })
        .query(api.journey.getJourneyState, { projectId: otherProject }),
    ).rejects.toThrow();
  });
});
