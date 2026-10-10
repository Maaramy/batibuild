/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { generateDqe } from "./dqeEngine.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// TRAVAUX COMPLÉMENTAIRES PERSONNALISÉS — contrôle d'accès backend
// ----------------------------------------------------------------------------
// Sept types de projet autorisés uniquement. Tout le reste (studio, local
// commercial, bureau, entrepôt, groupe B…) ne doit ni pouvoir ACTIVER un
// travail via l'API, ni voir un coût renvoyé — sans jamais perdre la sélection
// déjà enregistrée.
// ============================================================================

const SCENARIOS = {
  economique: { label: "Économique", totalCost: 80_000, costPerM2: 800, multiplier: 0.8 },
  standard: { label: "Standard", totalCost: 100_000, costPerM2: 1_000, multiplier: 1 },
  premium: { label: "Premium", totalCost: 125_000, costPerM2: 1_250, multiplier: 1.25 },
};

const ALLOWED_TYPES = [
  "maison",
  "villa",
  "appartement",
  "duplex",
  "immeuble",
  "residence_touristique",
  "projet_neuf",
];

const FORBIDDEN_TYPES = [
  "studio",
  "local_commercial",
  "bureau",
  "entrepot",
  "renovation_complete",
  "piscine",
  "restaurant",
];

async function createUser(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Client Travaux",
      email: `custom-works-${Math.random()}@test.com`,
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
  const dqe = generateDqe({
    category: (overrides.category as string) ?? "villa",
    surface: (overrides.surface as number) ?? 150,
    floors: 2,
    totalBudget: 100_000,
  });
  return t.run(async (ctx) =>
    ctx.db.insert(
      "projects",
      {
        userId,
        name: "Projet travaux",
        category: "villa",
        status: "completed",
        region: "tunis",
        surface: 150,
        floors: 2,
        dqe: dqe as any,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...overrides,
      } as any,
    ),
  );
}

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

describe("customWorks — contrôle backend des types de projet", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createUser(t);
  });

  it("accepte les 7 types autorisés (surface ≥ 120 m²)", async () => {
    for (const category of ALLOWED_TYPES) {
      const projectId = await createProject(t, userId, { category, surface: 200 });
      const as = asUser(t, userId);
      const saved = await as.mutation(api.customWorks.setProjectCustomWorks, {
        projectId,
        keys: ["piscine"],
      });
      expect(saved.keys, category).toEqual(["piscine"]);
      expect(saved.total, category).toBeGreaterThan(0);

      const read = await as.query(api.customWorks.getProjectCustomWorks, { projectId });
      expect(read?.keys, category).toEqual(["piscine"]);
      expect(read?.total, category).toBeGreaterThan(0);
    }
  });

  it("refuse l'activation des travaux pour tout type non autorisé", async () => {
    for (const category of FORBIDDEN_TYPES) {
      const projectId = await createProject(t, userId, { category, surface: 400 });
      const as = asUser(t, userId);
      await expect(
        as.mutation(api.customWorks.setProjectCustomWorks, {
          projectId,
          keys: ["piscine"],
        }),
        category,
      ).rejects.toThrow(/ne sont pas disponibles pour ce type de projet/i);

      const read = await as.query(api.customWorks.getProjectCustomWorks, { projectId });
      expect(read?.keys, category).toEqual([]);
      expect(read?.works, category).toEqual([]);
      expect(read?.total, category).toBe(0);
    }
  });

  it("impose aussi la surface couverte ≥ 120 m² (type autorisé)", async () => {
    const tooSmall = await createProject(t, userId, { category: "maison", surface: 119 });
    const ok = await createProject(t, userId, { category: "maison", surface: 120 });
    const as = asUser(t, userId);

    await expect(
      as.mutation(api.customWorks.setProjectCustomWorks, {
        projectId: tooSmall,
        keys: ["garage"],
      }),
    ).rejects.toThrow(/ne sont pas disponibles/i);
    expect((await as.query(api.customWorks.getProjectCustomWorks, { projectId: tooSmall }))?.total).toBe(0);

    const saved = await as.mutation(api.customWorks.setProjectCustomWorks, {
      projectId: ok,
      keys: ["garage"],
    });
    expect(saved.keys).toEqual(["garage"]);
  });

  it("neutralise (sans effacer) une sélection déjà enregistrée si le type devient non autorisé", async () => {
    const projectId = await createProject(t, userId, { category: "immeuble", surface: 300 });
    const as = asUser(t, userId);

    await as.mutation(api.customWorks.setProjectCustomWorks, {
      projectId,
      keys: ["piscine", "jardin"],
    });

    // Le type de projet change : les travaux ne sont plus chiffrés…
    await t.run(async (ctx) => ctx.db.patch(projectId, { category: "bureau" }));
    const disabled = await as.query(api.customWorks.getProjectCustomWorks, { projectId });
    expect(disabled?.keys).toEqual([]);
    expect(disabled?.total).toBe(0);
    await expect(
      as.mutation(api.customWorks.setProjectCustomWorks, { projectId, keys: ["garage"] }),
    ).rejects.toThrow(/ne sont pas disponibles/i);

    // …mais AUCUNE donnée n'est perdue : la sélection d'origine est intacte.
    const rows = await t.run(async (ctx) => await ctx.db.query("projectCustomWorks").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].keys).toEqual(["piscine", "jardin"]);

    // De retour sur un type autorisé : la sélection redevient active.
    await t.run(async (ctx) => ctx.db.patch(projectId, { category: "immeuble" }));
    const restored = await as.query(api.customWorks.getProjectCustomWorks, { projectId });
    expect(restored?.keys).toEqual(["piscine", "jardin"]);
    expect(restored?.total).toBeGreaterThan(0);
  });

  it("n'efface jamais une sélection déjà enregistrée, même si elle est lue sur un type non autorisé", async () => {
    const projectId = await createProject(t, userId, { category: "bureau", surface: 400 });

    // Sélection présente en base (projet antérieur ou écriture directe).
    await t.run(async (ctx) =>
      ctx.db.insert("projectCustomWorks", {
        projectId: projectId as any,
        userId: userId as any,
        keys: ["piscine"],
        solarPanels: 3,
        updatedAt: Date.now(),
      }),
    );

    const as = asUser(t, userId);
    const read = await as.query(api.customWorks.getProjectCustomWorks, { projectId });
    // Aucun poste ni montant n'est renvoyé pour un type non autorisé…
    expect(read?.keys).toEqual([]);
    expect(read?.works).toEqual([]);
    expect(read?.total).toBe(0);

    // …mais les données historiques sont strictement intactes.
    const rows = await t.run(async (ctx) => await ctx.db.query("projectCustomWorks").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].keys).toEqual(["piscine"]);
    expect(rows[0].solarPanels).toBe(3);
  });

  it("refuse l'accès à un projet qui n'appartient pas à l'utilisateur", async () => {
    const projectId = await createProject(t, userId, { category: "villa", surface: 150 });
    const otherId = await createUser(t);
    await expect(
      asUser(t, otherId).mutation(api.customWorks.setProjectCustomWorks, {
        projectId,
        keys: ["piscine"],
      }),
    ).rejects.toThrow(/Accès refusé/);
    expect(
      await asUser(t, otherId).query(api.customWorks.getProjectCustomWorks, { projectId }),
    ).toBeNull();
  });
});
