/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

async function createUser(
  t: ReturnType<typeof convexTest>,
  role: string,
  email: string,
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
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
    });
  });
}

describe("seedMarketData", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("refuse le seed à un utilisateur simple", async () => {
    const userId = await createUser(t, "user", "user@test.com");
    const userT = t.withIdentity({ subject: userId });
    await expect(userT.mutation(api.marketData.seedMarketData, {})).rejects.toThrow(
      "réservé",
    );
  });

  it("permet le seed à un modérateur (rôle administrateur élargi)", async () => {
    const modId = await createUser(t, "moderator", "mod@test.com");
    const modT = t.withIdentity({ subject: modId });
    const res = await modT.mutation(api.marketData.seedMarketData, {});
    expect(res.sources).toBeGreaterThanOrEqual(15);
    expect(res.catalog).toBeGreaterThanOrEqual(30);
    expect(res.seededProducts).toBeGreaterThanOrEqual(30);
  });

  it("seed idempotent : un second seed ne crée pas de doublons", async () => {
    const adminId = await createUser(t, "admin", "admin@test.com");
    const adminT = t.withIdentity({ subject: adminId });
    await adminT.mutation(api.marketData.seedMarketData, {});
    const res2 = await adminT.mutation(api.marketData.seedMarketData, {});

    expect(res2.seededProducts).toBe(0);

    const products = await t.run(async (ctx) =>
      ctx.db.query("materialPrices").collect(),
    );
    const sources = await t.run(async (ctx) =>
      ctx.db.query("marketSources").collect(),
    );
    const names = products.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length); // no duplicates
    expect(sources.length).toBe(res2.sources);
  });
});

describe("syncMarketData", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("refuse le sync à un utilisateur non-admin", async () => {
    const userId = await createUser(t, "user", "user@test.com");
    const userT = t.withIdentity({ subject: userId });
    await expect(userT.mutation(api.marketData.syncMarketData, {})).rejects.toThrow(
      "réservé",
    );
  });

  it("synchronise les offres et re-agrège les produits", async () => {
    const adminId = await createUser(t, "admin", "admin@test.com");
    const adminT = t.withIdentity({ subject: adminId });
    await adminT.mutation(api.marketData.seedMarketData, {});

    const res = await adminT.mutation(api.marketData.syncMarketData, {});
    expect(typeof res.updatedOffers).toBe("number");
    expect(typeof res.historyRows).toBe("number");
    expect(typeof res.stockAlerts).toBe("number");

    // All products must have aggregated min/avg/max after sync
    const products = await t.run(async (ctx) =>
      ctx.db.query("materialPrices").collect(),
    );
    expect(products.length).toBeGreaterThan(0);
    for (const p of products) {
      expect(p.minPrice).toBeGreaterThan(0);
      expect(p.avgPrice).toBeGreaterThan(0);
      expect(p.maxPrice).toBeGreaterThan(0);
      expect(p.reliabilityIndex).toBeGreaterThan(0);
    }

    // Sources get lastSyncAt
    const sources = await t.run(async (ctx) =>
      ctx.db.query("marketSources").collect(),
    );
    for (const s of sources) expect(s.lastSyncAt).toBeGreaterThan(0);
  });
});

describe("Analytics queries", () => {
  let t: ReturnType<typeof convexTest>;
  let adminT: any;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    const adminId = await createUser(t, "admin", "admin@test.com");
    adminT = t.withIdentity({ subject: adminId });
    await adminT.mutation(api.marketData.seedMarketData, {});
    await adminT.mutation(api.marketData.syncMarketData, {});
  });

  it("getMarketOverview agrège offres, produits et sources", async () => {
    const overview = await t.query(api.marketData.getMarketOverview, {});
    expect(overview.totalOffers).toBeGreaterThan(0);
    expect(overview.totalProducts).toBeGreaterThan(0);
    expect(overview.totalSources).toBeGreaterThanOrEqual(15);
    expect(overview.sourcesByType.fabricant).toBeGreaterThan(0);
    expect(overview.sourcesByType.distributeur).toBeGreaterThan(0);
    expect(overview.categories.length).toBeGreaterThan(0);
    expect(overview.lastSyncAt).toBeGreaterThan(0);
  });

  it("getBestOffers retourne les offres triées par prix croissant", async () => {
    const offers = await t.query(api.marketData.getBestOffers, { limit: 5 });
    expect(offers.length).toBeGreaterThan(0);
    for (let i = 1; i < offers.length; i++) {
      expect(offers[i].price).toBeGreaterThanOrEqual(offers[i - 1].price);
    }
    for (const o of offers) {
      expect(o.supplier).toBeTruthy();
      expect(o.reliabilityIndex).toBeGreaterThan(0);
    }
  });

  it("getBestOffers filtre par catégorie", async () => {
    const offers = await t.query(api.marketData.getBestOffers, {
      category: "liants_ciments_mortiers",
      limit: 10,
    });
    expect(offers.length).toBeGreaterThan(0);
    for (const o of offers) expect(o.category).toBe("liants_ciments_mortiers");
  });

  it("getGovernoratePrices retourne la moyenne nationale et les extrêmes", async () => {
    const res = await t.query(api.marketData.getGovernoratePrices, {});
    expect(res.rows.length).toBeGreaterThan(0);
    expect(res.nationalAverage).toBeGreaterThan(0);
    expect(res.cheapest).not.toBeNull();
    expect(res.mostExpensive).not.toBeNull();
  });

  it("getPriceTrends retourne les tendances par catégorie", async () => {
    const trends = (await t.query(api.marketData.getPriceTrends, {})) as Array<{
      category: string;
      changes: number;
      netPct: number;
    }>;
    expect(trends.length).toBeGreaterThan(0);
    for (const tr of trends) {
      expect(tr.category).toBeTruthy();
      expect(typeof tr.netPct).toBe("number");
    }
  });

  it("getSupplierComparison trie les fournisseurs du moins cher au plus cher", async () => {
    const product = await t.run(async (ctx) =>
      ctx.db.query("materialPrices").first(),
    );
    expect(product).not.toBeNull();
    const offers = await t.query(api.marketData.getSupplierComparison, {
      productId: product!._id,
    });
    expect(offers.length).toBeGreaterThan(0);
    for (let i = 1; i < offers.length; i++) {
      expect(offers[i].minPrice).toBeGreaterThanOrEqual(offers[i - 1].minPrice);
    }
  });

  it("getStockAlerts fonctionne après sync", async () => {
    const alerts = await t.query(api.marketData.getStockAlerts, {});
    expect(Array.isArray(alerts)).toBe(true);
    for (const a of alerts) {
      expect(["rupture", "sur_commande"]).toContain(a.availability);
    }
  });
});
