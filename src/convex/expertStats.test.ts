/// <reference types="vite/client" />

import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// Helpers
// ============================================================================

async function createUser(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{ role: string; name: string; email: string }> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      name: overrides.name ?? "Expert User",
      email: overrides.email ?? "expert@test.com",
      role: overrides.role ?? "user",
      status: "active",
      subscriptionPlan: "free",
      image: undefined,
      company: undefined,
      phone: "+216 99 111 111",
      subscriptionEndDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

async function createExpertProfile(
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
// Tests
// ============================================================================

describe("expertStats — recordExpertEvent", () => {
  const t = convexTest({ schema, modules });

  it("insère un événement view dans expertAnalytics", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);

    const result = await t.run(async (ctx) => {
      return ctx.runMutation(api.expertStats.recordExpertEvent, {
        expertId: expertId as any,
        eventType: "view",
      });
    });

    expect(result).toEqual({ ok: true });

    // Verify the event was stored
    const events = await t.run(async (ctx) => {
      return ctx.db
        .query("expertAnalytics")
        .withIndex("by_expert", (q) => q.eq("expertId", expertId as any))
        .collect();
    });

    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("view");
  });

  it("insère un événement contact avec source", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);

    await t.run(async (ctx) => {
      return ctx.runMutation(api.expertStats.recordExpertEvent, {
        expertId: expertId as any,
        eventType: "contact",
        source: "direct",
      });
    });

    const events = await t.run(async (ctx) => {
      return ctx.db
        .query("expertAnalytics")
        .withIndex("by_expert", (q) => q.eq("expertId", expertId as any))
        .collect();
    });

    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("contact");
    expect(events[0].source).toBe("direct");
  });
});

describe("expertStats — getExpertKPIs", () => {
  const t = convexTest({ schema, modules });

  it("retourne des compteurs à 0 quand aucun événement n'existe", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);

    const kpis = (await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertKPIs, { period: "30d" });
    }))!;

    expect(kpis.views).toBe(0);
    expect(kpis.requestsReceived).toBe(0);
    expect(kpis.responsesSent).toBe(0);
    expect(kpis.responseRate).toBe(0);
  });

  it("compte les vues correctement", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);

    // Record 3 views
    for (let i = 0; i < 3; i++) {
      await t.run(async (ctx) => {
        return ctx.runMutation(api.expertStats.recordExpertEvent, {
          expertId: expertId as any,
          eventType: "view",
        });
      });
    }

    const kpis = (await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertKPIs, { period: "30d" });
    }))!;

    expect(kpis.views).toBe(3);
  });

  it("compte les demandes reçues depuis expertServiceRequests", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);

    // Insert 2 service requests
    await t.run(async (ctx) => {
      await ctx.db.insert("expertServiceRequests", {
        userId: userId as any,
        expertId: expertId as any,
        requestType: "devis",
        serviceType: "architecture",
        description: "Test request 1",
        userPhone: "+216 99 000 000",
        userEmail: "user@test.com",
        userName: "Test User",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("expertServiceRequests", {
        userId: userId as any,
        expertId: expertId as any,
        requestType: "service",
        serviceType: "engineering",
        description: "Test request 2",
        userPhone: "+216 99 000 000",
        userEmail: "user@test.com",
        userName: "Test User",
        status: "responded",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const kpis = (await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertKPIs, { period: "30d" });
    }))!;

    expect(kpis.requestsReceived).toBe(2);
  });

  it("calcule le taux de réponse", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);

    await t.run(async (ctx) => {
      // 3 requests
      for (let i = 0; i < 3; i++) {
        await ctx.db.insert("expertServiceRequests", {
          userId: userId as any,
          expertId: expertId as any,
          requestType: "devis",
          serviceType: "architecture",
          description: `Request ${i}`,
          userPhone: "+216 99 000 000",
          userEmail: "user@test.com",
          userName: "Test User",
          status: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      // 2 responses
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
          createdAt: Date.now(),
        });
      }
    });

    const kpis = (await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertKPIs, { period: "30d" });
    }))!;

    expect(kpis.requestsReceived).toBe(3);
    expect(kpis.responsesSent).toBe(2);
    expect(kpis.responseRate).toBe(67); // 2/3 * 100 = 66.67 → rounded to 67
  });

  it("filtrage par période fonctionne", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);

    // Insert an event from 60 days ago (outside 30d window)
    await t.run(async (ctx) => {
      await ctx.db.insert("expertAnalytics", {
        expertId: expertId as any,
        date: Date.now() - 60 * 24 * 60 * 60 * 1000,
        eventType: "view",
      });
      // Insert a recent event
      await ctx.db.insert("expertAnalytics", {
        expertId: expertId as any,
        date: Date.now(),
        eventType: "view",
      });
    });

    const kpis30d = (await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertKPIs, { period: "30d" });
    }))!;

    const kpis90d = (await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertKPIs, { period: "90d" });
    }))!;

    expect(kpis30d.views).toBe(1); // only recent
    expect(kpis90d.views).toBe(2); // both
  });
});
