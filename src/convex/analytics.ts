import { v } from "convex/values";
import { query, mutation, type QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./users";

/** Garde admin partagé par les queries analytiques (jamais de données sans droits). */
async function requireAnalyticsAdmin(ctx: QueryCtx): Promise<boolean> {
  const user = await getCurrentUser(ctx);
  return !!user && (user.role === "admin" || user.role === "moderator");
}

// ============================================================================
// Mutations
// ============================================================================

/** Record a new connection or update an existing session */
export const trackConnection = mutation({
  args: {
    sessionId: v.string(),
    country: v.string(),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    userAgent: v.optional(v.string()),
    page: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if session already exists
    const existing = await ctx.db
      .query("connectionLogs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();

    if (existing) {
      // Update existing session
      await ctx.db.patch(existing._id, {
        lastSeenAt: now,
        page: args.page,
        disconnectedAt: undefined,
      });
      return existing._id;
    }

    // Create new session
    return await ctx.db.insert("connectionLogs", {
      sessionId: args.sessionId,
      country: args.country,
      city: args.city,
      region: args.region,
      lat: args.lat,
      lng: args.lng,
      userAgent: args.userAgent,
      page: args.page,
      connectedAt: now,
      lastSeenAt: now,
    });
  },
});

/** Heartbeat: keep session alive */
export const heartbeat = mutation({
  args: {
    sessionId: v.string(),
    page: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("connectionLogs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeenAt: Date.now(),
        page: args.page,
        disconnectedAt: undefined,
      });
    }
  },
});

/** Mark a session as disconnected */
export const disconnect = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("connectionLogs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        disconnectedAt: Date.now(),
      });
    }
  },
});

// ============================================================================
// Queries — Real-time
// ============================================================================

/** Users currently "online" (heartbeat within the last 2 minutes) */
export const getLiveUsers = query({
  args: {},
  handler: async (ctx) => {
    if (!(await requireAnalyticsAdmin(ctx))) return null;
    const twoMinAgo = Date.now() - 2 * 60 * 1000;
    const logs = await ctx.db
      .query("connectionLogs")
      .withIndex("by_lastSeen", (q) => q.gt("lastSeenAt", twoMinAgo))
      .collect();

    // Deduplicate: keep only the latest session per user (or per session)
    const sessionMap = new Map(
      logs.map((log) => [log.sessionId, log])
    );

    const sessions = Array.from(sessionMap.values());

    // Aggregate by country
    const byCountry: Record<string, number> = {};
    const byRegion: Record<string, number> = {};

    for (const s of sessions) {
      byCountry[s.country] = (byCountry[s.country] || 0) + 1;
      if (s.region) {
        byRegion[s.region] = (byRegion[s.region] || 0) + 1;
      }
    }

    return {
      total: sessions.length,
      byCountry,
      byRegion,
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        country: s.country,
        city: s.city,
        region: s.region,
        lat: s.lat,
        lng: s.lng,
        page: s.page,
        connectedAt: s.connectedAt,
        lastSeenAt: s.lastSeenAt,
      })),
    };
  },
});

// ============================================================================
// Queries — History
// ============================================================================

/** Connection history grouped by day for a given number of days */
export const getConnectionHistory = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    if (!(await requireAnalyticsAdmin(ctx))) return null;
    const since = Date.now() - args.days * 24 * 60 * 60 * 1000;
    const logs = await ctx.db
      .query("connectionLogs")
      .withIndex("by_connected", (q) => q.gte("connectedAt", since))
      .collect();

    // Group by day
    const byDay: Record<
      string,
      { date: string; connections: number; uniqueUsers: Set<string>; countries: Record<string, number> }
    > = {};

    for (const log of logs) {
      const d = new Date(log.connectedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      if (!byDay[key]) {
        byDay[key] = {
          date: key,
          connections: 0,
          uniqueUsers: new Set(),
          countries: {},
        };
      }
      byDay[key].connections += 1;
      byDay[key].uniqueUsers.add(log.sessionId);
      byDay[key].countries[log.country] =
        (byDay[key].countries[log.country] || 0) + 1;
    }

    // Convert Set to count and sort
    const result = Object.values(byDay)
      .map((d) => ({
        date: d.date,
        connections: d.connections,
        uniqueSessions: d.uniqueUsers.size,
        countries: d.countries,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  },
});

/** Stats summary for the admin dashboard */
export const getStatsSummary = query({
  args: {},
  handler: async (ctx) => {
    if (!(await requireAnalyticsAdmin(ctx))) return null;
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Total connections all time
    const allLogs = await ctx.db.query("connectionLogs").collect();
    const totalConnections = allLogs.length;

    // Unique sessions
    const uniqueSessions = new Set(allLogs.map((l) => l.sessionId)).size;

    // Connections in last 24h
    const last24h = allLogs.filter((l) => l.connectedAt > dayAgo).length;
    const last7d = allLogs.filter((l) => l.connectedAt > weekAgo).length;
    const last30d = allLogs.filter((l) => l.connectedAt > monthAgo).length;

    // Top countries
    const countryCounts: Record<string, number> = {};
    for (const log of allLogs) {
      countryCounts[log.country] = (countryCounts[log.country] || 0) + 1;
    }
    const topCountries = Object.entries(countryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    return {
      totalConnections,
      uniqueSessions,
      last24h,
      last7d,
      last30d,
      topCountries,
    };
  },
});
