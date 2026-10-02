/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api, internal } from "./_generated/api.js";

// ============================================================================
// Forfait par défaut — configuration admin + attribution aux nouveaux comptes
// ============================================================================

const modules = import.meta.glob("./**/*.*s");
const DAY_MS = 24 * 60 * 60 * 1000;

/** Utilisateur SANS forfait attribué (comme un compte fraîchement créé). */
async function insertNewUser(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{ role: string; email: string; userRole: "client" | "supplier" | "expert" }> = {},
) {
  return t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert("users", {
      name: "Nouveau",
      email: overrides.email ?? "new@test.com",
      role: overrides.role ?? "user",
      status: "active",
      userRole: overrides.userRole ?? undefined,
      image: undefined,
      company: undefined,
      phone: undefined,
      subscriptionEndDate: undefined,
      createdAt: now,
      updatedAt: now,
      // subscriptionPlan volontairement absent : comme à l'inscription.
    });
  });
}

async function insertAdmin(t: ReturnType<typeof convexTest>, email = "admin@test.com") {
  return t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert("users", {
      name: "Admin",
      email,
      role: "admin",
      status: "active",
      image: undefined,
      company: undefined,
      phone: undefined,
      subscriptionPlan: "free",
      subscriptionEndDate: undefined,
      createdAt: now,
      updatedAt: now,
    });
  });
}

function applyDefaultPlan(t: ReturnType<typeof convexTest>, userId: string) {
  return t.mutation(internal.subscriptionStatus.applyDefaultPlanOnSignup, {
    userId: userId as never,
  });
}

// ----------------------------------------------------------------------------

describe("Forfait par défaut — configuration admin", () => {
  let t: ReturnType<typeof convexTest>;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("valeur par défaut = Free quand aucune config n'existe", async () => {
    const pricing = await t.query(api.payments.getPublicPricing);
    expect(pricing.defaultPlan).toBe("free");
  });

  it("l'admin peut définir Free comme forfait par défaut (Free activé)", async () => {
    const adminId = await insertAdmin(t);
    const adminT = t.withIdentity({ subject: adminId });

    await adminT.mutation(api.payments.updateFreePlanConfig, { enabled: true });
    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "free" });

    const pricing = await t.query(api.payments.getPublicPricing);
    expect(pricing.defaultPlan).toBe("free");
    expect(pricing.freePlanEnabled).toBe(true);
  });

  it("l'admin peut définir Client Pro comme forfait par défaut", async () => {
    const adminId = await insertAdmin(t);
    const adminT = t.withIdentity({ subject: adminId });

    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "client_pro" });

    const pricing = await t.query(api.payments.getPublicPricing);
    expect(pricing.defaultPlan).toBe("client_pro");
  });

  it("Free désactivé → impossible de le définir comme défaut", async () => {
    const adminId = await insertAdmin(t);
    const adminT = t.withIdentity({ subject: adminId });

    // Free désactivé (défaut)
    await expect(
      adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "free" }),
    ).rejects.toThrow(/Free est désactivé/);
  });

  it("Client Pro désactivé → impossible de le définir comme défaut", async () => {
    const adminId = await insertAdmin(t);
    const adminT = t.withIdentity({ subject: adminId });

    await adminT.mutation(api.payments.updateClientProEnabled, { enabled: false });
    await expect(
      adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "client_pro" }),
    ).rejects.toThrow(/Client Pro est désactivé/);
  });

  it("la configuration persiste (relecture) et n'est pas codée en dur", async () => {
    const adminId = await insertAdmin(t);
    const adminT = t.withIdentity({ subject: adminId });

    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "client_pro" });
    // Relecture (équivaut à une actualisation / reconnexion : même source Convex).
    expect((await t.query(api.payments.getPublicPricing)).defaultPlan).toBe("client_pro");

    // Pour revenir à Free, il faut d'abord l'activer (contrôle serveur).
    await adminT.mutation(api.payments.updateFreePlanConfig, { enabled: true });
    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "free" });
    expect((await t.query(api.payments.getPublicPricing)).defaultPlan).toBe("free");
  });

  it("un non-admin ne peut pas modifier le forfait par défaut", async () => {
    const userId = await insertNewUser(t);
    await expect(
      t.withIdentity({ subject: userId }).mutation(api.payments.updateDefaultPlanConfig, {
        plan: "free",
      }),
    ).rejects.toThrow();
  });
});

describe("Forfait par défaut — attribution aux nouvelles inscriptions", () => {
  let t: ReturnType<typeof convexTest>;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("défaut Free → le nouvel utilisateur reçoit Free", async () => {
    const adminId = await insertAdmin(t);
    const adminT = t.withIdentity({ subject: adminId });
    await adminT.mutation(api.payments.updateFreePlanConfig, { enabled: true });
    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "free" });

    const userId = await insertNewUser(t);
    await applyDefaultPlan(t, userId);

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.subscriptionPlan).toBe("free");
  });

  it("défaut Client Pro → le nouvel utilisateur reçoit Client Pro (abonnement actif)", async () => {
    const adminId = await insertAdmin(t);
    const adminT = t.withIdentity({ subject: adminId });
    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "client_pro" });

    const userId = await insertNewUser(t, { email: "pro-new@test.com" });
    await applyDefaultPlan(t, userId);

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.subscriptionPlan).toBe("pro");
    expect(user?.subscriptionEndDate).toBeGreaterThan(Date.now());

    const subs = await t.run(async (ctx) => ctx.db.query("subscriptions").collect());
    expect(subs.length).toBe(1);
    expect(subs[0].plan).toBe("pro");
    expect(subs[0].status).toBe("active");

    // Accès réel confirmé côté backend.
    const access = await t
      .withIdentity({ subject: userId })
      .query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(true);
  });

  it("changer le défaut ne modifie PAS les utilisateurs existants", async () => {
    const adminId = await insertAdmin(t);
    const adminT = t.withIdentity({ subject: adminId });

    // Utilisateur existant avec un forfait déjà attribué.
    const existing = await insertNewUser(t, { email: "existing@test.com" });
    await t.run(async (ctx) => ctx.db.patch(existing, { subscriptionPlan: "free" }));

    // L'admin bascule le défaut sur Client Pro.
    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "client_pro" });

    // (Ré)application défensive : l'utilisateur existant reste inchangé.
    await applyDefaultPlan(t, existing);

    const user = await t.run(async (ctx) => ctx.db.get(existing));
    expect(user?.subscriptionPlan).toBe("free");
    expect(user?.subscriptionEndDate).toBeUndefined();
  });

  it("le backend utilise la configuration enregistrée (et non une valeur codée en dur)", async () => {
    const adminId = await insertAdmin(t);
    const adminT = t.withIdentity({ subject: adminId });
    await adminT.mutation(api.payments.updateFreePlanConfig, { enabled: true });

    // Défaut = Free → 1er utilisateur.
    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "free" });
    const u1 = await insertNewUser(t, { email: "u1@test.com" });
    await applyDefaultPlan(t, u1);
    expect((await t.run(async (ctx) => ctx.db.get(u1)))?.subscriptionPlan).toBe("free");

    // Défaut = Client Pro → 2e utilisateur.
    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "client_pro" });
    const u2 = await insertNewUser(t, { email: "u2@test.com" });
    await applyDefaultPlan(t, u2);
    expect((await t.run(async (ctx) => ctx.db.get(u2)))?.subscriptionPlan).toBe("pro");
  });

  it("repli automatique si le forfait par défaut est désactivé entre-temps", async () => {
    const adminId = await insertAdmin(t);
    const adminT = t.withIdentity({ subject: adminId });
    await adminT.mutation(api.payments.updateFreePlanConfig, { enabled: true });
    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "free" });

    // L'admin désactive Free : le défaut enregistré reste "free" mais devient
    // inattribuable → repli sur Client Pro (actif).
    await adminT.mutation(api.payments.updateFreePlanConfig, { enabled: false });

    const userId = await insertNewUser(t);
    await applyDefaultPlan(t, userId);
    expect((await t.run(async (ctx) => ctx.db.get(userId)))?.subscriptionPlan).toBe("pro");
  });

  it("désactiver un forfait ne supprime aucune donnée", async () => {
    const adminId = await insertAdmin(t);
    const adminT = t.withIdentity({ subject: adminId });
    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "client_pro" });

    const userId = await insertNewUser(t);
    await applyDefaultPlan(t, userId);

    const projectId = await t.run(async (ctx) => {
      const now = Date.now();
      return ctx.db.insert("projects", {
        userId,
        name: "Projet conservé",
        category: "villa",
        status: "completed",
        createdAt: now,
        updatedAt: now,
      });
    });

    await adminT.mutation(api.payments.updateClientProEnabled, { enabled: false });

    expect(await t.run(async (ctx) => ctx.db.get(projectId))).not.toBeNull();
    expect(await t.run(async (ctx) => ctx.db.get(userId))).not.toBeNull();
  });
});
