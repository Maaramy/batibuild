import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// ── Helpers ──

const periodToMs: Record<string, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

function getStartTs(period: string, customStart?: number): number {
  if (period === "custom" && customStart) return customStart;
  const ms = periodToMs[period] || periodToMs["30d"];
  return Date.now() - ms;
}

async function resolveExpertId(ctx: any) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Non authentifié");
  const profile = await ctx.db
    .query("expertProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
    .first();
  if (!profile) throw new Error("Profil expert introuvable");
  return profile._id;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES — Real-time KPIs
// ═══════════════════════════════════════════════════════════════════════════

/** KPI summary cards for expert dashboard */
export const getExpertKPIs = query({
  args: {
    period: v.string(),
    customStart: v.optional(v.number()),
  },
  handler: async (ctx, { period, customStart }) => {
    const expertId = await resolveExpertId(ctx);
    const startTs = getStartTs(period, customStart);

    // ── Analytics events (views, contacts from expertAnalytics) ──
    const allEvents = await ctx.db
      .query("expertAnalytics")
      .withIndex("by_expert", (q) => q.eq("expertId", expertId))
      .collect();

    const events = allEvents.filter((e) => e.date >= startTs);
    const views = events.filter((e) => e.eventType === "view").length;
    const contacts = events.filter((e) => e.eventType === "contact").length;

    // ── Requests received (expertServiceRequests) ──
    const allRequests = await ctx.db
      .query("expertServiceRequests")
      .withIndex("by_expert", (q) => q.eq("expertId", expertId))
      .collect();
    const requestsReceived = allRequests.filter(
      (r) => r.createdAt >= startTs,
    ).length;

    // ── Responses sent (expertServiceResponses) ──
    const allResponses = await ctx.db
      .query("expertServiceResponses")
      .withIndex("by_expert", (q) => q.eq("expertId", expertId))
      .collect();
    const responsesSent = allResponses.filter(
      (r) => r.createdAt >= startTs,
    ).length;

    // ── Response rate ──
    const responseRate =
      requestsReceived > 0
        ? Math.round((responsesSent / requestsReceived) * 100)
        : 0;

    // ── Average rating ──
    const ratings = await ctx.db
      .query("expertRatings")
      .withIndex("by_expert", (q) => q.eq("expertId", expertId))
      .collect();
    const recentRatings = ratings.filter((r) => r.createdAt >= startTs);
    const avgRating =
      recentRatings.length > 0
        ? Math.round(
            (recentRatings.reduce((s, r) => s + r.rating, 0) /
              recentRatings.length) *
              10,
          ) / 10
        : 0;

    return {
      views,
      requestsReceived,
      responsesSent,
      responseRate,
      avgRating,
      totalRatings: recentRatings.length,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS — Record events
// ═══════════════════════════════════════════════════════════════════════════

/** Record a view / click / contact event for an expert profile */
export const recordExpertEvent = mutation({
  args: {
    expertId: v.id("expertProfiles"),
    eventType: v.union(
      v.literal("view"),
      v.literal("click"),
      v.literal("contact"),
    ),
    source: v.optional(
      v.union(
        v.literal("direct"),
        v.literal("search"),
        v.literal("social"),
        v.literal("other"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("expertAnalytics", {
      expertId: args.expertId,
      date: Date.now(),
      eventType: args.eventType,
      source: args.source,
    });
    return { ok: true };
  },
});
