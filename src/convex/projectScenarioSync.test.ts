/// <reference types="vite/client" />

import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { generateDqe } from "./dqeEngine.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// SCÉNARIO AFFICHÉ — persistance partagée entre les pages
// ----------------------------------------------------------------------------
// « Aide à la décision » doit reprendre EXACTEMENT le scénario et le montant
// affichés dans « Résultat de l'estimation ». Le scénario affiché (y compris
// « personnalise ») est donc enregistré sur le projet et relu à l'identique
// après navigation, rechargement du navigateur ou réouverture du projet.
// ============================================================================

const SCENARIOS = {
  economique: { label: "Économique", totalCost: 80_000, costPerM2: 800 },
  standard: { label: "Standard", totalCost: 100_000, costPerM2: 1_000 },
  premium: { label: "Premium", totalCost: 125_000, costPerM2: 1_250 },
};

async function createUser(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Client Scénario",
      email: `scenario-${Math.random()}@test.com`,
      role: "user",
      status: "active",
      subscriptionPlan: "pro",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

async function createProject(t: ReturnType<typeof convexTest>, userId: any) {
  const dqe = generateDqe({ category: "maison", surface: 100, floors: 1, totalBudget: 198_000 });
  return t.run(async (ctx) =>
    ctx.db.insert("projects", {
      userId,
      name: "Maison 100 m²",
      category: "maison",
      status: "completed",
      region: "tunis",
      surface: 100,
      floors: 1,
      dqe: dqe as any,
      costEstimate: {
        totalCost: 198_000,
        costPerSquareMeter: 1_980,
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

describe("scénario affiché — persistance et isolation par projet", () => {
  it("enregistre le scénario Personnalisé et le restitue après rechargement", async () => {
    const t = convexTest(schema, modules);
    const user = await createUser(t);
    const projectId = await createProject(t, user);
    const asUser = t.withIdentity({ subject: user });

    await asUser.mutation(api.projects.setProjectScenario, {
      projectId,
      scenario: "personnalise",
    });

    // Relecture complète du projet (équivalent d'un rechargement de page).
    const project = await asUser.query(api.projects.getProject, { projectId });
    expect((project as any).selectedScenario).toBe("personnalise");
  });

  it("refuse un scénario inconnu (aucun montant arbitraire)", async () => {
    const t = convexTest(schema, modules);
    const user = await createUser(t);
    const projectId = await createProject(t, user);
    const asUser = t.withIdentity({ subject: user });

    await expect(
      asUser.mutation(api.projects.setProjectScenario, {
        projectId,
        scenario: "moyenne",
      }),
    ).rejects.toThrow(/Scénario invalide/);
  });

  it("deux projets conservent chacun leur scénario (aucune contamination)", async () => {
    const t = convexTest(schema, modules);
    const user = await createUser(t);
    const first = await createProject(t, user);
    const second = await createProject(t, user);
    const asUser = t.withIdentity({ subject: user });

    await asUser.mutation(api.projects.setProjectScenario, { projectId: first, scenario: "premium" });
    await asUser.mutation(api.projects.setProjectScenario, { projectId: second, scenario: "economique" });

    const p1 = await asUser.query(api.projects.getProject, { projectId: first });
    const p2 = await asUser.query(api.projects.getProject, { projectId: second });
    expect((p1 as any).selectedScenario).toBe("premium");
    expect((p2 as any).selectedScenario).toBe("economique");
  });
});
