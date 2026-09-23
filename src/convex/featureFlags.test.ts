/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// Test Helpers
// ============================================================================

async function createTestUser(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{ role: string; email: string }> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      name: "Test Admin",
      email: overrides.email ?? "admin@test.com",
      role: overrides.role ?? "admin",
      status: "active",
      subscriptionPlan: "free",
      phone: "+216 99 000 000",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

// ============================================================================
// getFlagsMap — query publique (contexte frontend)
// ============================================================================

describe("featureFlags.getFlagsMap", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("retourne les 6 fonctionnalités par défaut (toutes actives)", async () => {
    const userId = await createTestUser(t);
    const map = await t.withIdentity({ subject: userId }).query(
      api.featureFlags.getFlagsMap,
      {},
    );

    expect(map).toEqual({
      construction_cost_estimation: true,
      investment_project: true,
      ai_materials: true,
      architectural_plans: true,
      plans_3d_enhanced: true,
      dashboard_ai_copilot: true,
    });
  });

  it("reflète un flag désactivé en base", async () => {
    const userId = await createTestUser(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("featureFlags", {
        key: "ai_materials",
        name: "Matériaux AI",
        description: "Assistant IA",
        enabled: false,
        updatedAt: Date.now(),
      });
    });

    const map = await t.withIdentity({ subject: userId }).query(
      api.featureFlags.getFlagsMap,
      {},
    );
    expect(map!.ai_materials).toBe(false);
    expect(map!.construction_cost_estimation).toBe(true);
  });

  it("est nulle pour un utilisateur non connecté", async () => {
    const map = await t.query(api.featureFlags.getFlagsMap, {});
    expect(map).toBeNull();
  });
});

// ============================================================================
// setFlag — mutation admin (sécurité serveur)
// ============================================================================

describe("featureFlags.setFlag", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("un admin peut désactiver une fonctionnalité (upsert + log)", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = t.withIdentity({ subject: adminId });

    const result = await adminT.mutation(api.featureFlags.setFlag, {
      key: "ai_materials",
      enabled: false,
    });
    expect(result).toEqual({ key: "ai_materials", enabled: false });

    // Le document est créé (upsert)
    const row = await t.run(async (ctx) => {
      const all = await ctx.db.query("featureFlags").collect();
      return all.find((r: any) => r.key === "ai_materials");
    });
    expect(row!.enabled).toBe(false);
    expect(row!.updatedBy).toBe(adminId);

    // Le changement est journalisé
    const logs = await t.run(async (ctx) => {
      return ctx.db.query("adminLogs").collect();
    });
    const log = logs.find((l: any) => l.action === "feature_flag_disabled");
    expect(log).toBeTruthy();
    expect(log!.adminId).toBe(adminId);
    expect(log!.details).toContain("Matériaux AI");
  });

  it("un utilisateur standard ne peut jamais modifier un flag", async () => {
    const userId = await createTestUser(t, { role: "user", email: "u@test.com" });
    const userT = t.withIdentity({ subject: userId });

    await expect(
      userT.mutation(api.featureFlags.setFlag, {
        key: "ai_materials",
        enabled: false,
      }),
    ).rejects.toThrow(/Admin access required/);

    // Rien n'a été écrit
    const rows = await t.run(async (ctx) => ctx.db.query("featureFlags").collect());
    expect(rows).toHaveLength(0);
  });

  it("rejette une clé inconnue", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    await expect(
      t.withIdentity({ subject: adminId }).mutation(api.featureFlags.setFlag, {
        key: "unknown_feature",
        enabled: false,
      }),
    ).rejects.toThrow(/inconnue/);
  });

  it("réactiver une fonctionnalité restaure son état actif (sans perte de code)", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = t.withIdentity({ subject: adminId });

    await adminT.mutation(api.featureFlags.setFlag, {
      key: "construction_cost_estimation",
      enabled: false,
    });
    const reactivated = await adminT.mutation(api.featureFlags.setFlag, {
      key: "construction_cost_estimation",
      enabled: true,
    });
    expect(reactivated.enabled).toBe(true);
  });
});

// ============================================================================
// getAllFlags — vue admin (liste + statut)
// ============================================================================

describe("featureFlags.getAllFlags", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("liste toutes les fonctionnalités pour un admin", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const flags = await t.withIdentity({ subject: adminId }).query(
      api.featureFlags.getAllFlags,
      {},
    );

    expect(flags).toHaveLength(6);
    expect(flags!.every((f) => f.enabled === true)).toBe(true);
    expect(flags!.map((f) => f.key)).toEqual([
      "construction_cost_estimation",
      "investment_project",
      "ai_materials",
      "architectural_plans",
      "plans_3d_enhanced",
      "dashboard_ai_copilot",
    ]);
  });

  it("est nulle pour un utilisateur standard (jamais exposée)", async () => {
    const userId = await createTestUser(t, { role: "user", email: "u2@test.com" });
    const flags = await t.withIdentity({ subject: userId }).query(
      api.featureFlags.getAllFlags,
      {},
    );
    expect(flags).toBeNull();
  });
});

// ============================================================================
// ensureFlagDocs — auto-provisionnement (cron)
// ============================================================================

describe("featureFlags.ensureFlagDocs", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("crée les documents manquants et reste idempotent", async () => {
    const { internal } = await import("./_generated/api.js");

    const first = await t.mutation(internal.featureFlags.ensureFlagDocs, {});
    expect(first.created).toBe(6);

    const second = await t.mutation(internal.featureFlags.ensureFlagDocs, {});
    expect(second.created).toBe(0);
  });
});
