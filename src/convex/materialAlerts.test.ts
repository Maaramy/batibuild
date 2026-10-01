/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { shouldTrigger } from "./materialAlerts";

const modules = import.meta.glob("./**/*.*s");

async function createUser(
  t: ReturnType<typeof convexTest>,
  role: string,
  email: string,
) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: role === "admin" ? "Admin Test" : "User Test",
      email,
      role,
      status: "active",
      subscriptionPlan: "free",
      image: undefined,
      company: undefined,
      phone: undefined,
      subscriptionEndDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

async function insertMaterial(
  t: ReturnType<typeof convexTest>,
  adminId: string,
  unitPrice = 12,
) {
  return t.run(async (ctx) =>
    ctx.db.insert("materialPrices", {
      category: "liants_ciments_mortiers" as never,
      name: "Ciment CPJ 42.5 (sac 50 kg)",
      unit: "sac",
      unitPrice,
      currency: "TND",
      lastUpdated: Date.now(),
      updatedBy: adminId as never,
      priceQuality: "publication_2026" as never,
    }),
  );
}

describe("shouldTrigger", () => {
  it("déclenche un franchissement vers le bas uniquement", () => {
    expect(shouldTrigger("below", 12, 10, 11)).toBe(true);
    // Déjà sous le seuil avant : pas de nouveau déclenchement.
    expect(shouldTrigger("below", 10, 9, 11)).toBe(false);
    // Hausse : jamais.
    expect(shouldTrigger("below", 10, 12, 11)).toBe(false);
  });

  it("déclenche un franchissement vers le haut", () => {
    expect(shouldTrigger("above", 10, 12, 11)).toBe(true);
    expect(shouldTrigger("above", 11, 12, 11)).toBe(false);
    expect(shouldTrigger("above", 12, 10, 11)).toBe(false);
  });

  it("déclenche une variation au-delà du seuil en %", () => {
    expect(shouldTrigger("change", 100, 106, undefined, 5)).toBe(true);
    expect(shouldTrigger("change", 100, 94, undefined, 5)).toBe(true);
    expect(shouldTrigger("change", 100, 102, undefined, 5)).toBe(false);
  });

  it("ne déclenche rien sans changement de prix", () => {
    expect(shouldTrigger("below", 10, 10, 11)).toBe(false);
    expect(shouldTrigger("change", 10, 10, undefined, 5)).toBe(false);
  });
});

describe("materialAlerts", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("refuse la création d'une alerte non authentifiée", async () => {
    const adminId = await createUser(t, "admin", "admin@test.com");
    const materialId = await insertMaterial(t, adminId);
    await expect(
      t.mutation(api.materialAlerts.createAlert, {
        materialPriceId: materialId as never,
        direction: "below",
        targetPrice: 10,
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("exige un prix cible positif pour une alerte de seuil", async () => {
    const adminId = await createUser(t, "admin", "admin@test.com");
    const userId = await createUser(t, "user", "user@test.com");
    const materialId = await insertMaterial(t, adminId);
    const userT = t.withIdentity({ subject: userId });
    await expect(
      userT.mutation(api.materialAlerts.createAlert, {
        materialPriceId: materialId as never,
        direction: "below",
      }),
    ).rejects.toThrow("prix cible");
  });

  it("déclenche une notification quand le prix franchit le seuil", async () => {
    const adminId = await createUser(t, "admin", "admin@test.com");
    const userId = await createUser(t, "user", "user@test.com");
    const adminT = t.withIdentity({ subject: adminId });
    const userT = t.withIdentity({ subject: userId });
    const materialId = await insertMaterial(t, adminId, 12);

    await userT.mutation(api.materialAlerts.createAlert, {
      materialPriceId: materialId as never,
      direction: "below",
      targetPrice: 10,
    });

    // Le prix passe de 12 à 9 → franchissement vers le bas.
    await adminT.mutation(api.materials.updateMaterialPrice, {
      id: materialId as never,
      unitPrice: 9,
    });

    const notifications = await t.run(async (ctx) =>
      (await ctx.db.query("notifications").collect()).filter((n) => n.userId === userId),
    );
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("price_alert");
    expect(notifications[0].link).toContain(materialId);

    const alerts = await t.run(async (ctx) => ctx.db.query("materialPriceAlerts").collect());
    expect(alerts[0].triggerCount).toBe(1);
    expect(alerts[0].lastTriggeredAt).toBeGreaterThan(0);
  });

  it("ne déclenche pas si le prix reste au-dessus du seuil", async () => {
    const adminId = await createUser(t, "admin", "admin@test.com");
    const userId = await createUser(t, "user", "user@test.com");
    const adminT = t.withIdentity({ subject: adminId });
    const userT = t.withIdentity({ subject: userId });
    const materialId = await insertMaterial(t, adminId, 12);

    await userT.mutation(api.materialAlerts.createAlert, {
      materialPriceId: materialId as never,
      direction: "below",
      targetPrice: 8,
    });
    await adminT.mutation(api.materials.updateMaterialPrice, {
      id: materialId as never,
      unitPrice: 11,
    });

    const notifications = await t.run(async (ctx) => ctx.db.query("notifications").collect());
    expect(notifications).toHaveLength(0);
  });

  it("isole les alertes entre utilisateurs", async () => {
    const adminId = await createUser(t, "admin", "admin@test.com");
    const userA = await createUser(t, "user", "a@test.com");
    const userB = await createUser(t, "user", "b@test.com");
    const materialId = await insertMaterial(t, adminId);

    const aT = t.withIdentity({ subject: userA });
    const alertId = await aT.mutation(api.materialAlerts.createAlert, {
      materialPriceId: materialId as never,
      direction: "change",
      thresholdPercent: 5,
    });

    const bT = t.withIdentity({ subject: userB });
    await expect(bT.mutation(api.materialAlerts.deleteAlert, { alertId })).rejects.toThrow(
      "Alerte introuvable",
    );
    await expect(bT.mutation(api.materialAlerts.toggleAlert, { alertId })).rejects.toThrow(
      "Alerte introuvable",
    );
  });

  it("retourne les alertes enrichies de l'utilisateur", async () => {
    const adminId = await createUser(t, "admin", "admin@test.com");
    const userId = await createUser(t, "user", "user@test.com");
    const materialId = await insertMaterial(t, adminId, 14);
    const userT = t.withIdentity({ subject: userId });

    await userT.mutation(api.materialAlerts.createAlert, {
      materialPriceId: materialId as never,
      direction: "below",
      targetPrice: 12,
      note: "Avant le chantier",
    });

    const rows = await userT.query(api.materialAlerts.getMyAlerts, {});
    expect(rows).toHaveLength(1);
    expect(rows[0].materialName).toBe("Ciment CPJ 42.5 (sac 50 kg)");
    expect(rows[0].materialPrice).toBe(14);
    expect(rows[0].currency).toBe("TND");
    expect(rows[0].active).toBe(true);
  });
});
