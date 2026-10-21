/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

async function createAdmin(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      name: "Admin Test",
      email: "admin@test.com",
      role: "admin",
      status: "active",
      subscriptionPlan: "free",
      image: undefined,
      company: undefined,
      phone: undefined,
      subscriptionEndDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

async function createMaterial(
  t: ReturnType<typeof convexTest>,
  adminId: string,
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("materialPrices", {
      category: "ciment",
      name: "Ciment 42.5",
      unit: "sac",
      unitPrice: 15,
      currency: "TND",
      lastUpdated: Date.now(),
      updatedBy: adminId as any,
    });
  });
}

describe("refreshBIMData", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("non-admin est rejeté", async () => {
    const userId = await createAdmin(t);
    await t.run(async (ctx) => ctx.db.patch(userId, { role: "user" }));
    const userT = t.withIdentity({ subject: userId });
    await expect(userT.mutation(api.bimConfig.refreshBIMData, {})).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("crée la config BIM et met à jour les matériaux", async () => {
    const adminId = await createAdmin(t);
    await createMaterial(t, adminId);
    const userT = t.withIdentity({ subject: adminId });

    const res = await userT.mutation(api.bimConfig.refreshBIMData, {});

    expect(res.version).toBe(1);
    expect(res.materialCount).toBe(1);

    const config = await t.run(async (ctx) =>
      ctx.db.query("bimConfig").order("desc").first(),
    );
    expect(config).not.toBeNull();
    if (!config) return;
    expect(JSON.parse(config.marketPricesM2)).toBeTruthy();

    const material = await t.run(async (ctx) =>
      ctx.db.query("materialPrices").first(),
    );
    expect(material!.unitPrice).not.toBe(15);

    const logs = await t.run(async (ctx) =>
      ctx.db.query("adminLogs").collect(),
    );
    expect(logs.length).toBe(1);
  });

  it("sauvegarde le taux de TVA salle de bain et le relit", async () => {
    const adminId = await createAdmin(t);
    const adminT = t.withIdentity({ subject: adminId });

    const res = await adminT.mutation(api.bimConfig.saveBIMConfig, {
      sdbVatRate: 13,
    });
    expect(res.sdbVatRate).toBe(13);

    const config = await t.query(api.bimConfig.getBIMConfig, {});
    expect(config!.sdbVatRate).toBe(13);
    expect(config!.sdbVatRateIsDefault).toBe(false);
  });

  it("refuse un taux de TVA hors 0-30 % sans rien enregistrer", async () => {
    const adminId = await createAdmin(t);
    const adminT = t.withIdentity({ subject: adminId });

    for (const rate of [-1, 31, 55]) {
      await expect(
        adminT.mutation(api.bimConfig.saveBIMConfig, { sdbVatRate: rate }),
      ).rejects.toThrow(/TVA invalide/);
    }

    const config = await t.query(api.bimConfig.getBIMConfig, {});
    expect(config).toBeNull();
  });

  it("une configuration legacy sans taux retombe sur 19 %", async () => {
    const adminId = await createAdmin(t);
    await t.run(async (ctx) =>
      ctx.db.insert("bimConfig", {
        marketPricesM2: "{}",
        projectPercentages: "{}",
        regionMultipliers: "{}",
        unitPrices: "{}",
        version: 1,
        refreshedAt: Date.now(),
        refreshedBy: adminId as any,
      }),
    );

    const config = await t.query(api.bimConfig.getBIMConfig, {});
    expect(config!.sdbVatRate).toBe(19);
    expect(config!.sdbVatRateIsDefault).toBe(true);
  });

  it("getBIMConfig ne plante pas sur une ligne legacy malformée", async () => {
    const adminId = await createAdmin(t);
    await t.run(async (ctx) =>
      ctx.db.insert("bimConfig", {
        marketPricesM2: "{not-valid-json",
        projectPercentages: "",
        regionMultipliers: undefined as any,
        unitPrices: JSON.stringify({ cement: { bag42_5: 15 } }),
        version: 1,
        refreshedAt: Date.now(),
        refreshedBy: adminId as any,
      }),
    );

    const config = await t.query(api.bimConfig.getBIMConfig, {});
    expect(config).not.toBeNull();
    expect(config!.parsedMarketPrices).toEqual({}); // fallback au lieu de crash
    expect(config!.parsedPercentages).toEqual({});
    expect(config!.parsedMultipliers).toEqual({});
    expect(config!.parsedUnitPrices).toEqual({ cement: { bag42_5: 15 } });
  });
});
