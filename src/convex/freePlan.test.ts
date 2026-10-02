/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

// ============================================================================
// Forfait Free — accès aux fonctionnalités & restriction PDF
// ============================================================================

const modules = import.meta.glob("./**/*.*s");
const DAY_MS = 24 * 60 * 60 * 1000;

async function insertUser(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{
    role: string;
    userRole: "client" | "supplier" | "expert" | null;
    email: string;
    subscriptionPlan: string | undefined;
    paid: boolean;
  }> = {},
) {
  return t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      name: "Test User",
      email: overrides.email ?? "test@test.com",
      role: overrides.role ?? "user",
      status: "active",
      subscriptionPlan: (overrides.subscriptionPlan ?? "free") as never,
      userRole: overrides.userRole ?? undefined,
      image: undefined,
      company: undefined,
      phone: undefined,
      subscriptionEndDate: undefined,
      createdAt: now,
      updatedAt: now,
    });
    if (overrides.paid) {
      await ctx.db.insert("subscriptions", {
        userId,
        kind: "construction",
        plan: (overrides.subscriptionPlan ?? "pro") as never,
        status: "active",
        startDate: now - 1000,
        endDate: now + 30 * DAY_MS,
        paymentMethod: "card",
        paymentId: "pay-test",
        amount: 80,
        currency: "TND",
        monthlyDownloadCount: 0,
        downloadLimit: Infinity,
        createdAt: now,
        updatedAt: now,
      });
    }
    return userId;
  });
}

async function enableFree(t: ReturnType<typeof convexTest>, adminId: string) {
  await t
    .withIdentity({ subject: adminId })
    .mutation(api.payments.updateFreePlanConfig, { enabled: true });
}

// ----------------------------------------------------------------------------

describe("Forfait Free — configuration admin", () => {
  let t: ReturnType<typeof convexTest>;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("est désactivé par défaut (aucune valeur codée en dur)", async () => {
    const pricing = await t.query(api.payments.getPublicPricing);
    expect(pricing.freePlanEnabled).toBe(false);
  });

  it("l'admin peut activer puis désactiver le forfait Free", async () => {
    const adminId = await insertUser(t, { role: "admin", email: "admin@test.com" });
    const adminT = t.withIdentity({ subject: adminId });

    await adminT.mutation(api.payments.updateFreePlanConfig, { enabled: true });
    expect((await t.query(api.payments.getPublicPricing)).freePlanEnabled).toBe(true);

    await adminT.mutation(api.payments.updateFreePlanConfig, { enabled: false });
    expect((await t.query(api.payments.getPublicPricing)).freePlanEnabled).toBe(false);
  });

  it("un non-admin ne peut pas modifier le forfait Free", async () => {
    const userId = await insertUser(t, { role: "user" });
    await expect(
      t
        .withIdentity({ subject: userId })
        .mutation(api.payments.updateFreePlanConfig, { enabled: true }),
    ).rejects.toThrow();
  });
});

describe("Forfait Free — accès aux fonctionnalités (tous les profils)", () => {
  let t: ReturnType<typeof convexTest>;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("Free activé → un Client sans abonnement a accès", async () => {
    const adminId = await insertUser(t, { role: "admin", email: "admin@test.com" });
    await enableFree(t, adminId);
    const userId = await insertUser(t, { userRole: "client", email: "client@test.com" });
    const access = await t
      .withIdentity({ subject: userId })
      .query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(true);
  });

  it("Free activé → un Fournisseur a accès", async () => {
    const adminId = await insertUser(t, { role: "admin", email: "admin@test.com" });
    await enableFree(t, adminId);
    const userId = await insertUser(t, { userRole: "supplier", email: "supplier@test.com" });
    const access = await t
      .withIdentity({ subject: userId })
      .query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(true);
  });

  it("Free activé → un Expert a accès", async () => {
    const adminId = await insertUser(t, { role: "admin", email: "admin@test.com" });
    await enableFree(t, adminId);
    const userId = await insertUser(t, { userRole: "expert", email: "expert@test.com" });
    const access = await t
      .withIdentity({ subject: userId })
      .query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(true);
  });

  it("Free désactivé → l'accès redevient réservé au forfait payant", async () => {
    const adminId = await insertUser(t, { role: "admin", email: "admin@test.com" });
    await enableFree(t, adminId);
    await t
      .withIdentity({ subject: adminId })
      .mutation(api.payments.updateFreePlanConfig, { enabled: false });

    const userId = await insertUser(t, { userRole: "client", email: "client@test.com" });
    const access = await t
      .withIdentity({ subject: userId })
      .query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(false);
  });
});

describe("Forfait Free — restriction du téléchargement PDF", () => {
  let t: ReturnType<typeof convexTest>;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("Free activé → client Free ne peut PAS télécharger de PDF", async () => {
    const adminId = await insertUser(t, { role: "admin", email: "admin@test.com" });
    await enableFree(t, adminId);
    const userId = await insertUser(t, { userRole: "client", email: "client@test.com" });

    const can = await t
      .withIdentity({ subject: userId })
      .query(api.access.canDownloadPdf);
    expect(can.allowed).toBe(false);
    expect(can.reason).toBe("free_plan");
  });

  it("Client Pro payant actif → PDF autorisé", async () => {
    const userId = await insertUser(t, {
      userRole: "client",
      subscriptionPlan: "pro",
      paid: true,
      email: "pro@test.com",
    });
    const can = await t
      .withIdentity({ subject: userId })
      .query(api.access.canDownloadPdf);
    expect(can.allowed).toBe(true);
    expect(can.reason).toBe("ok");
  });

  it("Fournisseur / Expert → PDF refusé (réservé Client Pro)", async () => {
    const adminId = await insertUser(t, { role: "admin", email: "admin@test.com" });
    await enableFree(t, adminId);
    const supplierId = await insertUser(t, { userRole: "supplier", email: "s@test.com" });
    const expertId = await insertUser(t, { userRole: "expert", email: "e@test.com" });

    expect(
      (await t.withIdentity({ subject: supplierId }).query(api.access.canDownloadPdf)).allowed,
    ).toBe(false);
    expect(
      (await t.withIdentity({ subject: expertId }).query(api.access.canDownloadPdf)).allowed,
    ).toBe(false);
  });

  it("application serveur : consumeDownload refuse le Free", async () => {
    const adminId = await insertUser(t, { role: "admin", email: "admin@test.com" });
    await enableFree(t, adminId);
    const userId = await insertUser(t, { userRole: "client", email: "client@test.com" });

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.subscriptions.consumeDownload, {}),
    ).rejects.toThrow(/PDF/);

    // Client Pro payant : la mutation passe.
    const proId = await insertUser(t, {
      userRole: "client",
      subscriptionPlan: "pro",
      paid: true,
      email: "pro@test.com",
    });
    await t.withIdentity({ subject: proId }).mutation(api.subscriptions.consumeDownload, {});
  });
});

describe("Forfait Free — sélection & cohérence des données", () => {
  let t: ReturnType<typeof convexTest>;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("choisir le forfait Free est refusé quand il est désactivé", async () => {
    const userId = await insertUser(t, { userRole: "client" });
    await expect(
      t.withIdentity({ subject: userId }).mutation(api.subscriptions.chooseFreePlan, {}),
    ).rejects.toThrow();
  });

  it("choisir le forfait Free fonctionne quand il est activé (tout profil)", async () => {
    const adminId = await insertUser(t, { role: "admin", email: "admin@test.com" });
    await enableFree(t, adminId);
    const userId = await insertUser(t, { userRole: "expert", email: "expert@test.com" });

    await t.withIdentity({ subject: userId }).mutation(api.subscriptions.chooseFreePlan, {});

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.subscriptionPlan).toBe("free");
  });

  it("désactiver le forfait Free ne supprime aucune donnée (projets, abonnements)", async () => {
    const adminId = await insertUser(t, { role: "admin", email: "admin@test.com" });
    const adminT = t.withIdentity({ subject: adminId });
    await enableFree(t, adminId);

    const userId = await insertUser(t, {
      userRole: "client",
      subscriptionPlan: "pro",
      paid: true,
      email: "pro@test.com",
    });

    // Projet + résultat (estimation) enregistrés pour cet utilisateur.
    const projectId = await t.run(async (ctx) => {
      const now = Date.now();
      return ctx.db.insert("projects", {
        userId,
        name: "Villa 250 m²",
        category: "villa",
        status: "completed",
        createdAt: now,
        updatedAt: now,
      });
    });

    await adminT.mutation(api.payments.updateFreePlanConfig, { enabled: false });

    const project = await t.run(async (ctx) => ctx.db.get(projectId));
    expect(project).not.toBeNull();
    expect(project?.name).toBe("Villa 250 m²");

    const subs = await t.run(async (ctx) =>
      ctx.db
        .query("subscriptions")
        .collect(),
    );
    expect(subs.length).toBe(1);
    expect(subs[0].status).toBe("active");
  });
});
