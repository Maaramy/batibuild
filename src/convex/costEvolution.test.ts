/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import { describe as _describe } from "vitest";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";
import {
  DEFAULT_CATEGORY_RATE,
  defaultCostEvolutionSettings,
} from "../lib/costEvolution";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// Évolution annuelle des coûts — backend (paramétrage, droits, historique)
// ============================================================================

async function createUser(
  t: ReturnType<typeof convexTest>,
  role: "admin" | "user" = "admin",
): Promise<Id<"users">> {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: role === "admin" ? "Admin Barème" : "Client Barème",
      email: `cost-evolution-${role}-${Math.random()}@test.com`,
      role,
      status: "active",
      subscriptionPlan: "free",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

async function createProject(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  totalCost = 200_000,
): Promise<Id<"projects">> {
  const now = Date.now();
  return t.run(async (ctx) =>
    ctx.db.insert("projects", {
      userId,
      name: "Villa barème",
      category: "villa",
      status: "completed",
      region: "tunis",
      surface: 100,
      floors: 1,
      selectedScenario: "standard",
      costEstimate: {
        totalCost,
        costPerSquareMeter: totalCost / 100,
        currency: "TND",
        breakdown: [],
        contingencyBuffer: 0,
        contingencyPercentage: 0,
      },
      createdAt: now,
      updatedAt: now,
    }),
  );
}

const asUser = (t: ReturnType<typeof convexTest>, userId: Id<"users">) =>
  t.withIdentity({ subject: userId });

/** Charge utile complète dérivée des valeurs par défaut. */
async function defaultArgs(t: ReturnType<typeof convexTest>, patch: Record<string, unknown> = {}) {
  const settings = defaultCostEvolutionSettings(Date.UTC(2026, 0, 1));
  return {
    referenceYear: settings.referenceYear,
    effectiveFrom: settings.effectiveFrom,
    defaultScenario: settings.defaultScenario,
    customRate: settings.customRate,
    enabled: true,
    scenarioRates: settings.scenarioRates,
    categories: settings.categories,
    ...patch,
  };
}

describe("costEvolution.getConfig", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("retourne le barème par défaut, inactif, sans écriture préalable", async () => {
    const config = await t.query(api.costEvolution.getConfig, {});
    expect(config.isDefault).toBe(true);
    expect(config.enabled).toBe(false);
    expect(config.version).toBe(0);
    expect(config.scenarioRates).toEqual({ moderee: 3, moyen: 5, eleve: 8 });
    expect(config.categories).toHaveLength(11);
    expect(config.categories.every((c) => c.rate === DEFAULT_CATEGORY_RATE)).toBe(true);
  });
});

describe("costEvolution.saveConfig — droits et validation serveur", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("refuse un utilisateur non administrateur", async () => {
    const userId = await createUser(t, "user");
    await expect(
      asUser(t, userId).mutation(api.costEvolution.saveConfig, (await defaultArgs(t)) as never),
    ).rejects.toThrow(/administrateurs/i);
  });

  it("refuse un appel non authentifié", async () => {
    await expect(
      t.mutation(api.costEvolution.saveConfig, (await defaultArgs(t)) as never),
    ).rejects.toThrow();
  });

  it("refuse un taux hors bornes (aucune écriture)", async () => {
    const userId = await createUser(t);
    const args = await defaultArgs(t, {
      scenarioRates: { moderee: 3, moyen: 5, eleve: 80 },
    });
    await expect(
      asUser(t, userId).mutation(api.costEvolution.saveConfig, args as never),
    ).rejects.toThrow(/Élevé/);
    const config = await t.query(api.costEvolution.getConfig, {});
    expect(config.isDefault).toBe(true);
  });

  it("enregistre le paramétrage, incrémente la version et journalise l'auteur", async () => {
    const userId = await createUser(t);
    const args = await defaultArgs(t, {
      scenarioRates: { moderee: 3, moyen: 5, eleve: 8 },
      defaultScenario: "moyen",
    });
    const saved = await asUser(t, userId).mutation(api.costEvolution.saveConfig, args as never);
    expect(saved.version).toBe(1);
    expect(saved.enabled).toBe(true);

    const config = await t.query(api.costEvolution.getConfig, {});
    expect(config.isDefault).toBe(false);
    expect(config.version).toBe(1);
    expect(config.defaultScenario).toBe("moyen");
    expect(config.updatedByName).toBe("Admin Barème");

    const history = await asUser(t, userId).query(api.costEvolution.getHistory, {});
    expect(history).toHaveLength(1);
    expect(history[0].action).toBe("save");
    expect(history[0].changedByName).toBe("Admin Barème");
    // Les valeurs précédentes ET nouvelles sont conservées.
    expect(history[0].previous).toBe("null");
    expect(JSON.parse(history[0].next).scenarioRates.moyen).toBe(5);
  });

  it("conserve l'historique complet des versions successives", async () => {
    const userId = await createUser(t);
    const admin = asUser(t, userId);

    await admin.mutation(api.costEvolution.saveConfig, (await defaultArgs(t)) as never);
    await admin.mutation(
      api.costEvolution.saveConfig,
      (await defaultArgs(t, { scenarioRates: { moderee: 4, moyen: 6, eleve: 9 } })) as never,
    );

    const history = await admin.query(api.costEvolution.getHistory, {});
    expect(history).toHaveLength(2);
    // L'ancienne valeur (3 %) est bien présente dans l'entrée la plus récente.
    expect(JSON.parse(history[0].previous).scenarioRates.moderee).toBe(3);
    expect(JSON.parse(history[0].next).scenarioRates.moderee).toBe(4);
  });

  it("n'expose pas l'historique aux non-administrateurs", async () => {
    const adminId = await createUser(t);
    const clientId = await createUser(t, "user");
    await asUser(t, adminId).mutation(
      api.costEvolution.saveConfig,
      (await defaultArgs(t)) as never,
    );
    const history = await asUser(t, clientId).query(api.costEvolution.getHistory, {});
    expect(history).toEqual([]);
  });
});

describe("costEvolution.setEnabled — désactivation sans perte de paramètres", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("désactive le mécanisme en conservant tous les taux enregistrés", async () => {
    const userId = await createUser(t);
    const admin = asUser(t, userId);
    await admin.mutation(
      api.costEvolution.saveConfig,
      (await defaultArgs(t, {
        scenarioRates: { moderee: 4, moyen: 5, eleve: 8 },
      })) as never,
    );

    const result = await admin.mutation(api.costEvolution.setEnabled, { enabled: false });
    expect(result.enabled).toBe(false);

    const config = await t.query(api.costEvolution.getConfig, {});
    expect(config.enabled).toBe(false);
    // Les taux ne sont pas effacés par la désactivation.
    expect(config.scenarioRates.moderee).toBe(4);
    expect(config.categories).toHaveLength(11);

    const history = await admin.query(api.costEvolution.getHistory, {});
    expect(history[0].action).toBe("toggle");
    expect(history[0].details).toContain("désactivé");
  });

  it("refuse la désactivation par un non-administrateur", async () => {
    const userId = await createUser(t, "user");
    await expect(
      asUser(t, userId).mutation(api.costEvolution.setEnabled, { enabled: false }),
    ).rejects.toThrow(/administrateurs/i);
  });
});

describe("costEvolution.resetDefaults", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("restaure 3 / 5 / 8 % et tous les postes à 3 % en conservant le statut", async () => {
    const userId = await createUser(t);
    const admin = asUser(t, userId);
    await admin.mutation(
      api.costEvolution.saveConfig,
      (await defaultArgs(t, {
        scenarioRates: { moderee: 12, moyen: 20, eleve: 30 },
      })) as never,
    );

    const reset = await admin.mutation(api.costEvolution.resetDefaults, {});
    expect(reset.scenarioRates).toEqual({ moderee: 3, moyen: 5, eleve: 8 });
    expect(reset.categories.every((c) => c.rate === DEFAULT_CATEGORY_RATE)).toBe(true);
    expect(reset.enabled).toBe(true); // statut conservé

    const history = await admin.query(api.costEvolution.getHistory, {});
    expect(history[0].action).toBe("reset");
    expect(JSON.parse(history[0].previous).scenarioRates.eleve).toBe(30);
  });

  it("refuse la réinitialisation par un non-administrateur", async () => {
    const userId = await createUser(t, "user");
    await expect(
      asUser(t, userId).mutation(api.costEvolution.resetDefaults, {}),
    ).rejects.toThrow(/administrateurs/i);
  });
});

describe("costEvolution.previewImpact — lecture seule", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("compare les trois scénarios sur un coût de référence", async () => {
    const userId = await createUser(t);
    await asUser(t, userId).mutation(
      api.costEvolution.saveConfig,
      (await defaultArgs(t)) as never,
    );

    const preview = await asUser(t, userId).query(api.costEvolution.previewImpact, {
      referenceCost: 200_000,
      years: 1,
    });
    expect(preview.scenarios.map((s) => s.projectedCost)).toEqual([206_000, 210_000, 216_000]);
    expect(preview.projection.projectedCost).toBe(206_000);
  });

  it("utilise le coût estimatif réel du projet", async () => {
    const userId = await createUser(t);
    const projectId = await createProject(t, userId, 300_000);
    await asUser(t, userId).mutation(
      api.costEvolution.saveConfig,
      (await defaultArgs(t)) as never,
    );

    const preview = await asUser(t, userId).query(api.costEvolution.previewImpact, {
      projectId,
      years: 3,
    });
    expect(preview.projection.referenceCost).toBe(300_000);
    expect(preview.projection.projectedCost).toBeCloseTo(327_818.1, 1);
  });

  it("refuse le projet d'un autre utilisateur", async () => {
    const ownerId = await createUser(t, "user");
    const otherId = await createUser(t, "user");
    const projectId = await createProject(t, ownerId);

    await expect(
      asUser(t, otherId).query(api.costEvolution.previewImpact, { projectId, years: 1 }),
    ).rejects.toThrow(/Accès refusé/);
  });

  it("n'écrit AUCUNE donnée (aucune version créée par une prévisualisation)", async () => {
    const userId = await createUser(t);
    const projectId = await createProject(t, userId);
    await asUser(t, userId).query(api.costEvolution.previewImpact, { projectId, years: 5 });
    const config = await t.query(api.costEvolution.getConfig, {});
    expect(config.isDefault).toBe(true);
    expect(config.version).toBe(0);
  });

  it("ne modifie pas le coût estimatif enregistré du projet (aucun recalcul silencieux)", async () => {
    const userId = await createUser(t);
    const projectId = await createProject(t, userId, 200_000);
    const admin = asUser(t, userId);
    await admin.mutation(api.costEvolution.saveConfig, (await defaultArgs(t)) as never);
    await admin.query(api.costEvolution.previewImpact, { projectId, years: 3 });

    const project = await t.run(async (ctx) => ctx.db.get(projectId));
    expect(project?.costEstimate?.totalCost).toBe(200_000);
  });

  it("projette chaque poste séparément quand les montants réels sont fournis", async () => {
    const userId = await createUser(t);
    const admin = asUser(t, userId);
    const settings = defaultCostEvolutionSettings(Date.UTC(2026, 0, 1));
    await admin.mutation(
      api.costEvolution.saveConfig,
      {
        ...(await defaultArgs(t)),
        categories: settings.categories.map((c) =>
          c.key === "peinture" ? { ...c, rate: 8 } : c,
        ),
      } as never,
    );

    const preview = await admin.query(api.costEvolution.previewImpact, {
      referenceCost: 200_000,
      years: 1,
      categoryAmounts: [
        { key: "gros_oeuvre", amount: 150_000 },
        { key: "peinture", amount: 50_000 },
      ],
    });

    expect(preview.projection.lines).toHaveLength(2);
    expect(preview.projection.lines[0].projectedCost).toBe(154_500); // 3 %
    expect(preview.projection.lines[1].projectedCost).toBe(54_000); // 8 %
    expect(preview.projection.projectedCost).toBe(208_500);
    // Aucune double application : le total n'est pas majoré une seconde fois.
    expect(preview.projection.increase).toBe(8_500);
  });
});
