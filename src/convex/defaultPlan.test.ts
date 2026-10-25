/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api, internal } from "./_generated/api.js";

// ============================================================================
// Forfait par défaut — configuration admin + attribution aux nouveaux comptes
// ----------------------------------------------------------------------------
// Le forfait « Free » a été supprimé : le défaut est soit la PÉRIODE D'ESSAI
// (« trial » : aucun forfait payé attribué), soit Client Pro (« client_pro »).
// Aucune valeur n'est codée en dur dans le moteur : tout vient de Convex.
// ============================================================================

const modules = import.meta.glob("./**/*.*s");

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

  it("valeur par défaut = période d'essai quand aucune config n'existe", async () => {
    const pricing = await t.query(api.payments.getPublicPricing);
    expect(pricing.defaultPlan).toBe("trial");
  });

  it("l'admin peut définir la période d'essai comme défaut", async () => {
    const adminId = await insertAdmin(t);
    const adminT = t.withIdentity({ subject: adminId });

    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "trial" });

    expect((await t.query(api.payments.getPublicPricing)).defaultPlan).toBe("trial");
  });

  it("l'admin peut définir Client Pro comme forfait par défaut", async () => {
    const adminId = await insertAdmin(t);
    const adminT = t.withIdentity({ subject: adminId });

    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "client_pro" });

    expect((await t.query(api.payments.getPublicPricing)).defaultPlan).toBe("client_pro");
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

    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "trial" });
    expect((await t.query(api.payments.getPublicPricing)).defaultPlan).toBe("trial");
  });

  it("un non-admin ne peut pas modifier le forfait par défaut", async () => {
    const userId = await insertNewUser(t);
    await expect(
      t.withIdentity({ subject: userId }).mutation(api.payments.updateDefaultPlanConfig, {
        plan: "trial",
      }),
    ).rejects.toThrow();
  });
});

describe("Forfait par défaut — attribution aux nouvelles inscriptions", () => {
  let t: ReturnType<typeof convexTest>;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("défaut « période d'essai » → aucun forfait payé n'est attribué", async () => {
    const adminId = await insertAdmin(t);
    const adminT = t.withIdentity({ subject: adminId });
    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "trial" });

    const userId = await insertNewUser(t);
    const res = await applyDefaultPlan(t, userId);

    expect(res.plan).toBe("trial");
    expect(res.applied).toBe(false);

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    // Aucun forfait « Free » n'est écrit : le compte relève de l'essai gratuit.
    expect(user?.subscriptionPlan).toBeUndefined();
    expect(user?.subscriptionEndDate).toBeUndefined();

    const subs = await t.run(async (ctx) => ctx.db.query("subscriptions").collect());
    expect(subs.length).toBe(0);
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
    await t.run(async (ctx) => ctx.db.patch(existing, { subscriptionPlan: "pro" }));

    // L'admin bascule le défaut sur la période d'essai.
    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "trial" });

    // (Ré)application défensive : l'utilisateur existant reste inchangé.
    await applyDefaultPlan(t, existing);

    const user = await t.run(async (ctx) => ctx.db.get(existing));
    expect(user?.subscriptionPlan).toBe("pro");
    expect(user?.subscriptionEndDate).toBeUndefined();
  });

  it("le backend utilise la configuration enregistrée (et non une valeur codée en dur)", async () => {
    const adminId = await insertAdmin(t);
    const adminT = t.withIdentity({ subject: adminId });

    // Défaut = Client Pro → 1er utilisateur.
    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "client_pro" });
    const u1 = await insertNewUser(t, { email: "u1@test.com" });
    await applyDefaultPlan(t, u1);
    expect((await t.run(async (ctx) => ctx.db.get(u1)))?.subscriptionPlan).toBe("pro");

    // Défaut = période d'essai → 2e utilisateur : aucun forfait payé.
    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "trial" });
    const u2 = await insertNewUser(t, { email: "u2@test.com" });
    await applyDefaultPlan(t, u2);
    expect((await t.run(async (ctx) => ctx.db.get(u2)))?.subscriptionPlan).toBeUndefined();
  });

  it("repli automatique si Client Pro est désactivé entre-temps", async () => {
    const adminId = await insertAdmin(t);
    const adminT = t.withIdentity({ subject: adminId });
    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "client_pro" });

    // L'admin désactive Client Pro : le défaut enregistré reste "client_pro"
    // mais devient inattribuable → repli sur « aucun forfait payé » (essai).
    await adminT.mutation(api.payments.updateClientProEnabled, { enabled: false });

    const userId = await insertNewUser(t);
    await applyDefaultPlan(t, userId);
    expect((await t.run(async (ctx) => ctx.db.get(userId)))?.subscriptionPlan).toBeUndefined();
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
