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
  overrides: Partial<{ role: string; name: string; email: string }> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? "test@test.com",
      role: overrides.role ?? "user",
      status: "active",
      subscriptionPlan: "free",
      image: undefined,
      company: undefined,
      phone: "+216 99 000 000",
      subscriptionEndDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

async function createTestSupplierProfile(t: ReturnType<typeof convexTest>, userId: string) {
  return t.run(async (ctx) => {
    return ctx.db.insert("supplierProfiles", {
      userId: userId as any,
      companyName: "Test Supplier",
      phone: "+216 99 111 111",
      email: "supplier@test.com",
      address: "Tunis, Tunisia",
      specialties: ["ciment", "bois"],
      regions: ["tunis"],
      plan: "monthly",
      subscriptionStatus: "active",
      isVisible: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

const DAY = 24 * 60 * 60 * 1000;

// Insert a quote request at a given age (ms in the past)
async function insertQuoteRequest(
  t: ReturnType<typeof convexTest>,
  opts: { userId: string; supplierId: string; ageMs: number },
) {
  const now = Date.now();
  return t.run(async (ctx) => {
    return ctx.db.insert("quoteRequests", {
      userId: opts.userId as any,
      supplierId: opts.supplierId as any,
      category: "ciment",
      materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
      userPhone: "+216 99 000 000",
      userEmail: "buyer@test.com",
      userName: "Buyer",
      status: "pending",
      createdAt: now - opts.ageMs,
      updatedAt: now - opts.ageMs,
    });
  });
}

// Insert a supplier response at a given age (ms in the past)
async function insertQuoteResponse(
  t: ReturnType<typeof convexTest>,
  opts: { userId: string; supplierId: string; quoteRequestId: string; ageMs: number },
) {
  const now = Date.now();
  return t.run(async (ctx) => {
    return ctx.db.insert("quoteResponses", {
      quoteRequestId: opts.quoteRequestId as any,
      supplierId: opts.supplierId as any,
      userId: opts.userId as any,
      message: "Votre devis détaillé",
      createdAt: now - opts.ageMs,
    });
  });
}

// Insert a profile-view analytics event at a given age
async function insertViewEvent(
  t: ReturnType<typeof convexTest>,
  opts: { supplierId: string; ageMs: number },
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("supplierAnalytics", {
      supplierId: opts.supplierId as any,
      date: Date.now() - opts.ageMs,
      eventType: "view",
      source: "direct",
    });
  });
}

// ============================================================================
// getSupplierKPIs — statistiques fournisseur
// ============================================================================

describe("supplierStats.getSupplierKPIs", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns null for a user without supplier profile", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    const kpis = await userT.query(api.supplierStats.getSupplierKPIs, { period: "30d" });
    expect(kpis).toBeNull();
  });

  it("counts profile views from analytics within the period", async () => {
    const supplierUserId = await createTestUser(t, { email: "sup@test.com" });
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const supplierT = asUser(t, supplierUserId);

    await insertViewEvent(t, { supplierId, ageMs: 2 * DAY });
    await insertViewEvent(t, { supplierId, ageMs: 5 * DAY });
    await insertViewEvent(t, { supplierId, ageMs: 40 * DAY }); // hors période 30j

    const kpis = await supplierT.query(api.supplierStats.getSupplierKPIs, { period: "30d" });
    expect(kpis?.views).toBe(2);
  });

  it("counts requests received and responses sent on the period", async () => {
    const supplierUserId = await createTestUser(t, { email: "sup@test.com" });
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const buyerUserId = await createTestUser(t, { email: "buyer@test.com" });
    const supplierT = asUser(t, supplierUserId);

    // 2 demandes dans la période + 1 plus ancienne (hors 30j)
    const q1 = await insertQuoteRequest(t, { userId: buyerUserId, supplierId, ageMs: 2 * DAY });
    await insertQuoteRequest(t, { userId: buyerUserId, supplierId, ageMs: 10 * DAY });
    await insertQuoteRequest(t, { userId: buyerUserId, supplierId, ageMs: 45 * DAY });

    // 1 réponse envoyée dans la période
    await insertQuoteResponse(t, {
      userId: buyerUserId,
      supplierId,
      quoteRequestId: q1,
      ageMs: DAY,
    });

    const kpis = await supplierT.query(api.supplierStats.getSupplierKPIs, { period: "30d" });
    expect(kpis?.requestsReceived).toBe(2);
    expect(kpis?.responsesSent).toBe(1);
  });

  it("computes the response rate as responses / requests", async () => {
    const supplierUserId = await createTestUser(t, { email: "sup@test.com" });
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const buyerUserId = await createTestUser(t, { email: "buyer@test.com" });
    const supplierT = asUser(t, supplierUserId);

    // 4 demandes reçues, 2 réponses → 50 %
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) {
      const qid = await insertQuoteRequest(t, { userId: buyerUserId, supplierId, ageMs: i * DAY });
      if (i < 2) {
        await insertQuoteResponse(t, { userId: buyerUserId, supplierId, quoteRequestId: qid, ageMs: DAY / 2 });
      }
      ids.push(qid);
    }

    const kpis = await supplierT.query(api.supplierStats.getSupplierKPIs, { period: "30d" });
    expect(kpis?.requestsReceived).toBe(4);
    expect(kpis?.responsesSent).toBe(2);
    expect(kpis?.responseRate).toBe(50);
  });

  it("returns a 0 response rate when no requests were received", async () => {
    const supplierUserId = await createTestUser(t, { email: "sup@test.com" });
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const buyerUserId = await createTestUser(t, { email: "buyer@test.com" });
    const supplierT = asUser(t, supplierUserId);

    const q1 = await insertQuoteRequest(t, { userId: buyerUserId, supplierId, ageMs: 45 * DAY });
    await insertQuoteResponse(t, { userId: buyerUserId, supplierId, quoteRequestId: q1, ageMs: 40 * DAY });

    const kpis = await supplierT.query(api.supplierStats.getSupplierKPIs, { period: "30d" });
    expect(kpis?.requestsReceived).toBe(0);
    expect(kpis?.responsesSent).toBe(0);
    expect(kpis?.responseRate).toBe(0);
  });
});
