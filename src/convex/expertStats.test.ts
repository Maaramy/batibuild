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
  overrides: Partial<{
    role: string;
    name: string;
    email: string;
    phone: string;
  }> = {},
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
      phone: overrides.phone ?? "+216 99 000 000",
      subscriptionEndDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

async function createTestExpertProfile(
  t: ReturnType<typeof convexTest>,
  userId: string,
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("expertProfiles", {
      userId: userId as any,
      profession: "architecte",
      displayName: "Test Expert",
      phone: "+216 99 111 111",
      email: "expert@test.com",
      specialties: ["residential"],
      regions: ["tunis"],
      plan: "trial",
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

// ============================================================================
// recordExpertEvent — mutation
// ============================================================================

describe("expertStats.recordExpertEvent", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: string;
  let expertId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createTestUser(t);
    expertId = await createTestExpertProfile(t, userId);
  });

  it("inserts a view event", async () => {
    const result = await t.mutation(api.expertStats.recordExpertEvent, {
      expertId: expertId as any,
      eventType: "view",
    });
    expect(result).toEqual({ ok: true });

    // Verify the event was inserted
    const events = await t.run(async (ctx) => {
      return ctx.db
        .query("expertAnalytics")
        .collect();
    });
    const myEvents = events.filter((e: any) => e.expertId === expertId);
    expect(myEvents).toHaveLength(1);
    expect(myEvents[0].eventType).toBe("view");
    expect(myEvents[0].source).toBeUndefined();
  });

  it("inserts a contact event with source", async () => {
    await t.mutation(api.expertStats.recordExpertEvent, {
      expertId: expertId as any,
      eventType: "contact",
      source: "search",
    });

    const events = await t.run(async (ctx) => {
      return ctx.db
        .query("expertAnalytics")
        .collect();
    });
    const myEvents = events.filter((e: any) => e.expertId === expertId);
    expect(myEvents).toHaveLength(1);
    expect(myEvents[0].eventType).toBe("contact");
    expect(myEvents[0].source).toBe("search");
  });

  it("inserts a click event", async () => {
    await t.mutation(api.expertStats.recordExpertEvent, {
      expertId: expertId as any,
      eventType: "click",
      source: "direct",
    });

    const events = await t.run(async (ctx) => {
      return ctx.db
        .query("expertAnalytics")
        .collect();
    });
    const myEvents = events.filter((e: any) => e.expertId === expertId);
    expect(myEvents[0].eventType).toBe("click");
    expect(myEvents[0].source).toBe("direct");
  });

  it("allows multiple events for the same expert", async () => {
    await t.mutation(api.expertStats.recordExpertEvent, {
      expertId: expertId as any,
      eventType: "view",
    });
    await t.mutation(api.expertStats.recordExpertEvent, {
      expertId: expertId as any,
      eventType: "contact",
    });
    await t.mutation(api.expertStats.recordExpertEvent, {
      expertId: expertId as any,
      eventType: "view",
    });

    const events = await t.run(async (ctx) => {
      return ctx.db
        .query("expertAnalytics")
        .collect();
    });
    const myEvents = events.filter((e: any) => e.expertId === expertId);
    expect(myEvents).toHaveLength(3);
  });

  it("does not record events for other experts", async () => {
    const userId2 = await createTestUser(t, { email: "other@test.com" });
    const expertId2 = await createTestExpertProfile(t, userId2);

    await t.mutation(api.expertStats.recordExpertEvent, {
      expertId: expertId as any,
      eventType: "view",
    });
    await t.mutation(api.expertStats.recordExpertEvent, {
      expertId: expertId2 as any,
      eventType: "view",
    });

    const events = await t.run(async (ctx) => {
      return ctx.db
        .query("expertAnalytics")
        .collect();
    });
    const myEvents = events.filter((e: any) => e.expertId === expertId);
    expect(myEvents).toHaveLength(1);
  });
});

// ============================================================================
// getExpertKPIs — query
// ============================================================================

describe("expertStats.getExpertKPIs", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: string;
  let expertId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createTestUser(t);
    expertId = await createTestExpertProfile(t, userId);
  });

  it("returns zero KPIs for a fresh expert", async () => {
    const userT = asUser(t, userId);
    const kpis = await userT.query(api.expertStats.getExpertKPIs, {
      period: "30d",
    });
    expect(kpis.views).toBe(0);
    expect(kpis.requestsReceived).toBe(0);
    expect(kpis.responsesSent).toBe(0);
    expect(kpis.responseRate).toBe(0);
    expect(kpis.avgRating).toBe(0);
    expect(kpis.totalRatings).toBe(0);
  });

  it("counts views from expertAnalytics", async () => {
    // Record 3 view events
    await t.mutation(api.expertStats.recordExpertEvent, {
      expertId: expertId as any,
      eventType: "view",
    });
    await t.mutation(api.expertStats.recordExpertEvent, {
      expertId: expertId as any,
      eventType: "view",
    });
    await t.mutation(api.expertStats.recordExpertEvent, {
      expertId: expertId as any,
      eventType: "view",
    });

    const userT = asUser(t, userId);
    const kpis = await userT.query(api.expertStats.getExpertKPIs, {
      period: "30d",
    });
    expect(kpis.views).toBe(3);
  });

  it("counts contacts separately from views", async () => {
    await t.mutation(api.expertStats.recordExpertEvent, {
      expertId: expertId as any,
      eventType: "view",
    });
    await t.mutation(api.expertStats.recordExpertEvent, {
      expertId: expertId as any,
      eventType: "contact",
    });

    const userT = asUser(t, userId);
    const kpis = await userT.query(api.expertStats.getExpertKPIs, {
      period: "30d",
    });
    expect(kpis.views).toBe(1);
  });

  it("counts requests received from expertServiceRequests", async () => {
    // Insert service requests directly
    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("expertServiceRequests", {
        userId: userId as any,
        expertId: expertId as any,
        requestType: "devis",
        serviceType: "architecture",
        description: "Need architect",
        userPhone: "+216 99 000 000",
        userEmail: "user@test.com",
        userName: "User",
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("expertServiceRequests", {
        userId: userId as any,
        expertId: expertId as any,
        requestType: "service",
        serviceType: "architecture",
        description: "Need service",
        userPhone: "+216 99 000 000",
        userEmail: "user@test.com",
        userName: "User",
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    });

    const userT = asUser(t, userId);
    const kpis = await userT.query(api.expertStats.getExpertKPIs, {
      period: "30d",
    });
    expect(kpis.requestsReceived).toBe(2);
  });

  it("counts responses sent from expertServiceResponses", async () => {
    const now = Date.now();
    let requestId: string;
    await t.run(async (ctx) => {
      requestId = await ctx.db.insert("expertServiceRequests", {
        userId: userId as any,
        expertId: expertId as any,
        requestType: "devis",
        serviceType: "architecture",
        description: "Need architect",
        userPhone: "+216 99 000 000",
        userEmail: "user@test.com",
        userName: "User",
        status: "responded",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("expertServiceResponses", {
        serviceRequestId: requestId as any,
        expertId: expertId as any,
        userId: userId as any,
        message: "Here is my offer",
        totalAmount: 5000,
        createdAt: now,
      });
    });

    const userT = asUser(t, userId);
    const kpis = await userT.query(api.expertStats.getExpertKPIs, {
      period: "30d",
    });
    expect(kpis.responsesSent).toBe(1);
    expect(kpis.requestsReceived).toBe(1);
    expect(kpis.responseRate).toBe(100);
  });

  it("calculates response rate correctly", async () => {
    const now = Date.now();
    await t.run(async (ctx) => {
      // 3 requests, 2 responses → 67%
      for (let i = 0; i < 3; i++) {
        await ctx.db.insert("expertServiceRequests", {
          userId: userId as any,
          expertId: expertId as any,
          requestType: "devis",
          serviceType: "architecture",
          description: `Request ${i}`,
          userPhone: "+216 99 000 000",
          userEmail: "user@test.com",
          userName: "User",
          status: "pending",
          createdAt: now,
          updatedAt: now,
        });
      }
      const requests = await ctx.db
        .query("expertServiceRequests")
        .withIndex("by_expert", (q) => q.eq("expertId", expertId as any))
        .collect();
      for (let i = 0; i < 2; i++) {
        await ctx.db.insert("expertServiceResponses", {
          serviceRequestId: requests[i]._id,
          expertId: expertId as any,
          userId: userId as any,
          message: `Response ${i}`,
          createdAt: now,
        });
      }
    });

    const userT = asUser(t, userId);
    const kpis = await userT.query(api.expertStats.getExpertKPIs, {
      period: "30d",
    });
    expect(kpis.requestsReceived).toBe(3);
    expect(kpis.responsesSent).toBe(2);
    expect(kpis.responseRate).toBe(67);
  });

  it("returns 0 responseRate when no requests", async () => {
    const userT = asUser(t, userId);
    const kpis = await userT.query(api.expertStats.getExpertKPIs, {
      period: "30d",
    });
    expect(kpis.responseRate).toBe(0);
  });

  it("filters by period (7d) — excludes old events", async () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    await t.run(async (ctx) => {
      await ctx.db.insert("expertAnalytics", {
        expertId: expertId as any,
        date: eightDaysAgo,
        eventType: "view",
      });
    });
    // Recent event
    await t.mutation(api.expertStats.recordExpertEvent, {
      expertId: expertId as any,
      eventType: "view",
    });

    const userT = asUser(t, userId);
    const kpis7d = await userT.query(api.expertStats.getExpertKPIs, {
      period: "7d",
    });
    const kpis90d = await userT.query(api.expertStats.getExpertKPIs, {
      period: "90d",
    });
    expect(kpis7d.views).toBe(1); // only recent
    expect(kpis90d.views).toBe(2); // both
  });

  it("supports custom period start", async () => {
    const now = Date.now();
    const fiveDaysAgo = now - 5 * 24 * 60 * 60 * 1000;
    const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000;

    await t.run(async (ctx) => {
      await ctx.db.insert("expertAnalytics", {
        expertId: expertId as any,
        date: tenDaysAgo,
        eventType: "view",
      });
      await ctx.db.insert("expertAnalytics", {
        expertId: expertId as any,
        date: fiveDaysAgo,
        eventType: "view",
      });
    });

    const userT = asUser(t, userId);
    const kpis = await userT.query(api.expertStats.getExpertKPIs, {
      period: "custom",
      customStart: fiveDaysAgo,
    });
    expect(kpis.views).toBe(1); // only the one at fiveDaysAgo
  });

  it("averages expert ratings", async () => {
    const now = Date.now();
    await t.run(async (ctx) => {
      // Insert 3 ratings: 4, 5, 3 → avg = 4.0
      await ctx.db.insert("expertRatings", {
        expertId: expertId as any,
        userId: userId as any,
        rating: 4,
        createdAt: now,
      });
      await ctx.db.insert("expertRatings", {
        expertId: expertId as any,
        userId: userId as any,
        rating: 5,
        createdAt: now,
      });
      await ctx.db.insert("expertRatings", {
        expertId: expertId as any,
        userId: userId as any,
        rating: 3,
        createdAt: now,
      });
    });

    const userT = asUser(t, userId);
    const kpis = await userT.query(api.expertStats.getExpertKPIs, {
      period: "30d",
    });
    expect(kpis.avgRating).toBe(4.0);
    expect(kpis.totalRatings).toBe(3);
  });

  it("returns 0 avgRating when no ratings", async () => {
    const userT = asUser(t, userId);
    const kpis = await userT.query(api.expertStats.getExpertKPIs, {
      period: "30d",
    });
    expect(kpis.avgRating).toBe(0);
    expect(kpis.totalRatings).toBe(0);
  });
});
