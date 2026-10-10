import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getCurrentUser } from "./users";

// ============================================================================
// Sécurité — le garde admin est appliqué côté serveur dans chaque query
// ============================================================================

type AdminUser = Doc<"users">;

async function requireAdmin(
  ctx: QueryCtx,
): Promise<AdminUser | null> {
  const user = await getCurrentUser(ctx);
  if (!user) return null;
  if (user.role !== "admin" && user.role !== "moderator") return null;
  return user;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Agrégation par jour sur la fenêtre [since, now], bornée au frontend graph. */
async function dailySeries(
  ctx: QueryCtx,
  timestamps: number[],
  since: number,
  now: number,
): Promise<{ date: string; count: number }[]> {
  const byDay = new Map<string, number>();
  for (const ts of timestamps) {
    if (ts < since) continue;
    const d = new Date(ts);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const series: { date: string; count: number }[] = [];
  for (let t = since; t <= now; t += DAY_MS) {
    const d = new Date(t);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    series.push({ date: key, count: byDay.get(key) ?? 0 });
  }
  return series;
}

// ============================================================================
// Utilisateurs
// ============================================================================

export const getUserStats = query({
  args: {},
  handler: async (ctx) => {
    if (!(await requireAdmin(ctx))) return null;
    const now = Date.now();
    const dayAgo = now - DAY_MS;
    const weekAgo = now - 7 * DAY_MS;
    const monthAgo = now - 30 * DAY_MS;

    const users = await ctx.db.query("users").collect();

    const byDayTimestamps: number[] = [];
    let total = 0;
    let newLast24h = 0;
    let newLast7d = 0;
    let newLast30d = 0;
    let active = 0;
    let disabled = 0;

    for (const u of users) {
      if (u.isAnonymous) continue;
      total += 1;
      const created = u.createdAt ?? 0;
      byDayTimestamps.push(created);
      if (created > dayAgo) newLast24h += 1;
      if (created > weekAgo) newLast7d += 1;
      if (created > monthAgo) newLast30d += 1;
      if (u.status === "disabled") disabled += 1;
      else active += 1;
    }

    // Rôle userRole: client / supplier / expert (rôle plateforme = role admin)
    const byUserRole = { client: 0, supplier: 0, expert: 0, other: 0 };
    for (const u of users) {
      if (u.isAnonymous) continue;
      const r = u.userRole;
      if (r === "client" || r === "supplier" || r === "expert") byUserRole[r] += 1;
      else byUserRole.other += 1;
    }

    // Utilisateurs "connectés récemment" : sessions vues dans les dernières 24h
    const twoMinAgo = now - 2 * 60 * 1000;
    const recentSeen = await ctx.db
      .query("connectionLogs")
      .withIndex("by_lastSeen", (q) => q.gt("lastSeenAt", twoMinAgo))
      .collect();
    const onlineSessions = recentSeen.length;

    const dayAgoSeen = await ctx.db
      .query("connectionLogs")
      .withIndex("by_lastSeen", (q) => q.gt("lastSeenAt", dayAgo))
      .collect();
    const recentSessionIds = new Set(dayAgoSeen.map((s) => s.sessionId));

    return {
      total,
      active,
      disabled,
      newLast24h,
      newLast7d,
      newLast30d,
      onlineNow: onlineSessions,
      recentSessions: recentSessionIds.size,
      byUserRole,
      // Série 30 jours pour le graphique d'évolution des inscriptions
      signupSeries: await dailySeries(ctx, byDayTimestamps, monthAgo, now),
    };
  },
});

// ============================================================================
// Projets
// ============================================================================

export const getProjectStats = query({
  args: {},
  handler: async (ctx) => {
    if (!(await requireAdmin(ctx))) return null;
    const now = Date.now();
    const dayAgo = now - DAY_MS;
    const weekAgo = now - 7 * DAY_MS;
    const monthAgo = now - 30 * DAY_MS;

    const projects = await ctx.db.query("projects").collect();

    const byDayTimestamps: number[] = [];
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let createdLast24h = 0;
    let createdLast7d = 0;
    let updatedLast24h = 0;

    for (const p of projects) {
      byDayTimestamps.push(p.createdAt);
      if (p.createdAt > dayAgo) createdLast24h += 1;
      if (p.createdAt > weekAgo) createdLast7d += 1;
      if (p.updatedAt > dayAgo) updatedLast24h += 1;
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
      byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
    }

    return {
      total: projects.length,
      createdLast24h,
      createdLast7d,
      createdLast30d: projects.filter((p) => p.createdAt > monthAgo).length,
      updatedLast24h,
      // Projets "actifs" = non archivés (draft / analyzing / completed vivants)
      active: projects.filter((p) => p.status !== "archived").length,
      completed: byStatus["completed"] ?? 0,
      archived: byStatus["archived"] ?? 0,
      analyzing: byStatus["analyzing"] ?? 0,
      draft: byStatus["draft"] ?? 0,
      byStatus,
      byCategory,
      // Série 30 jours pour le graphique d'évolution des projets
      creationSeries: await dailySeries(ctx, byDayTimestamps, monthAgo, now),
    };
  },
});

// ============================================================================
// Activité plateforme (analyses, calculs, fonctionnalités AI)
// ============================================================================

export const getActivityStats = query({
  args: {},
  handler: async (ctx) => {
    if (!(await requireAdmin(ctx))) return null;
    const now = Date.now();
    const dayAgo = now - DAY_MS;
    const weekAgo = now - 7 * DAY_MS;
    const monthAgo = now - 30 * DAY_MS;

    const [
      materialAnalyses,
      roadmaps,
      reports,
      connectionLogs,
      quoteRequests,
      expertRequests,
    ] = await Promise.all([
      ctx.db.query("aiMaterialAnalyses").collect(),
      ctx.db.query("projectRoadmaps").collect(),
      ctx.db.query("reports").collect(),
      ctx.db.query("connectionLogs").collect(),
      ctx.db.query("quoteRequests").collect(),
      ctx.db.query("expertServiceRequests").collect(),
    ]);

    // Série d'activité quotidienne combinée (analyses + calculs + AI)
    const timestamps: number[] = [
      ...materialAnalyses.map((x) => x.createdAt),
      ...roadmaps.map((x) => x.createdAt),
      ...reports.map((x) => x.generatedAt),
    ];

    const countSince = (ts: number[]) => ({
      last24h: ts.filter((t) => t > dayAgo).length,
      last7d: ts.filter((t) => t > weekAgo).length,
      last30d: ts.filter((t) => t > monthAgo).length,
    });

    const materialTs = materialAnalyses.map((x) => x.createdAt);
    const roadmapTs = roadmaps.map((x) => x.createdAt);
    const reportTs = reports.map((x) => x.generatedAt);

    const connSince = countSince(connectionLogs.map((c) => c.connectedAt));

    return {
      // Analyses
      materialAnalyses: { total: materialTs.length, ...countSince(materialTs) },
      // Calculs / documents générés
      roadmaps: { total: roadmapTs.length, ...countSince(roadmapTs) },
      reports: { total: reportTs.length, ...countSince(reportTs) },
      // Devis & services experts (fournisseurs / experts)
      quoteRequests: { total: quoteRequests.length, ...countSince(quoteRequests.map((q) => q.createdAt)) },
      expertServiceRequests: {
        total: expertRequests.length,
        ...countSince(expertRequests.map((q) => q.createdAt)),
      },
      // Connexions
      connections: { total: connectionLogs.length, ...connSince },
      // Fonctionnalités AI = analyses matériaux + roadmaps
      aiFeaturesUsed: {
        total: materialTs.length + roadmapTs.length,
        ...countSince([...materialTs, ...roadmapTs]),
      },
      // Série d'activité quotidienne (toutes actions confondues) — 30 jours
      activitySeries: await dailySeries(ctx, timestamps, monthAgo, now),
      lastActivityAt: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  },
});

// ============================================================================
// Support
// ============================================================================

export const getSupportStats = query({
  args: {},
  handler: async (ctx) => {
    if (!(await requireAdmin(ctx))) return null;
    const now = Date.now();
    const weekAgo = now - 7 * DAY_MS;

    const tickets = await ctx.db.query("supportTickets").collect();

    const byStatus: Record<string, number> = {};
    let unreadMessages = 0;
    let createdLast7d = 0;
    let resolvedLast7d = 0;

    for (const t of tickets) {
      byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
      unreadMessages += t.adminUnreadCount ?? 0;
      if (t.createdAt > weekAgo) createdLast7d += 1;
      if (t.resolvedAt && t.resolvedAt > weekAgo) resolvedLast7d += 1;
    }

    return {
      total: tickets.length,
      open: byStatus["open"] ?? 0,
      inProgress: (byStatus["in_progress"] ?? 0) + (byStatus["awaiting_user"] ?? 0),
      resolved: (byStatus["resolved"] ?? 0) + (byStatus["closed"] ?? 0),
      unreadMessages,
      createdLast7d,
      resolvedLast7d,
      byStatus,
    };
  },
});

// ============================================================================
// Vue combinée (une seule subscription réactive pour les indicateurs clés)
// ============================================================================

export const getOverviewStats = query({
  args: {},
  handler: async (ctx) => {
    if (!(await requireAdmin(ctx))) return null;
    const now = Date.now();
    const dayAgo = now - DAY_MS;
    const weekAgo = now - 7 * DAY_MS;

    const [users, projects, materialAnalyses, roadmaps, tickets] =
      await Promise.all([
        ctx.db.query("users").collect(),
        ctx.db.query("projects").collect(),
        ctx.db.query("aiMaterialAnalyses").collect(),
        ctx.db.query("projectRoadmaps").collect(),
        ctx.db.query("supportTickets").collect(),
      ]);

    const realUsers = users.filter((u) => !u.isAnonymous);
    const twoMinAgo = now - 2 * 60 * 1000;
    const onlineSessions = await ctx.db
      .query("connectionLogs")
      .withIndex("by_lastSeen", (q) => q.gt("lastSeenAt", twoMinAgo))
      .collect();

    return {
      usersTotal: realUsers.length,
      usersNew7d: realUsers.filter((u) => (u.createdAt ?? 0) > weekAgo).length,
      usersOnline: onlineSessions.length,
      projectsTotal: projects.length,
      projectsNew7d: projects.filter((p) => p.createdAt > weekAgo).length,
      projectsActive: projects.filter((p) => p.status !== "archived").length,
      analysesTotal:
        materialAnalyses.length + roadmaps.length,
      analyses24h:
        materialAnalyses.filter((a) => a.createdAt > dayAgo).length +
        roadmaps.filter((r) => r.createdAt > dayAgo).length,
      supportOpen: tickets.filter((t) => t.status === "open").length,
      supportInProgress: tickets.filter(
        (t) => t.status === "in_progress" || t.status === "awaiting_user",
      ).length,
    };
  },
});

// ============================================================================
// Géolocalisation / connexions (reprend les métriques existantes, sécurisées)
// ============================================================================

export const getConnectionStats = query({
  args: {},
  handler: async (ctx) => {
    if (!(await requireAdmin(ctx))) return null;
    const now = Date.now();
    const twoMinAgo = now - 2 * 60 * 1000;
    const dayAgo = now - DAY_MS;
    const weekAgo = now - 7 * DAY_MS;
    const monthAgo = now - 30 * DAY_MS;

    const allLogs = await ctx.db.query("connectionLogs").collect();

    const live = allLogs.filter((l) => l.lastSeenAt > twoMinAgo);
    const byCountry: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    for (const s of live) {
      byCountry[s.country] = (byCountry[s.country] ?? 0) + 1;
      if (s.region) byRegion[s.region] = (byRegion[s.region] ?? 0) + 1;
    }

    const countryCounts: Record<string, number> = {};
    for (const log of allLogs) {
      countryCounts[log.country] = (countryCounts[log.country] ?? 0) + 1;
    }
    const topCountries = Object.entries(countryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    return {
      totalConnections: allLogs.length,
      uniqueSessions: new Set(allLogs.map((l) => l.sessionId)).size,
      last24h: allLogs.filter((l) => l.connectedAt > dayAgo).length,
      last7d: allLogs.filter((l) => l.connectedAt > weekAgo).length,
      last30d: allLogs.filter((l) => l.connectedAt > monthAgo).length,
      live: {
        total: live.length,
        byCountry,
        byRegion,
        sessions: live
          .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
          .slice(0, 50)
          .map((s) => ({
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
      },
      topCountries,
    };
  },
});

// ============================================================================
// Historique des connexions (graphique par jour)
// ============================================================================

export const getConnectionHistory = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    if (!(await requireAdmin(ctx))) return null;
    const since = Date.now() - Math.min(args.days, 365) * DAY_MS;
    const logs = await ctx.db
      .query("connectionLogs")
      .withIndex("by_connected", (q) => q.gte("connectedAt", since))
      .collect();

    const byDay: Record<
      string,
      { date: string; connections: number; uniqueUsers: Set<string>; countries: Record<string, number> }
    > = {};

    for (const log of logs) {
      const d = new Date(log.connectedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!byDay[key]) {
        byDay[key] = { date: key, connections: 0, uniqueUsers: new Set(), countries: {} };
      }
      byDay[key].connections += 1;
      byDay[key].uniqueUsers.add(log.sessionId);
      byDay[key].countries[log.country] = (byDay[key].countries[log.country] ?? 0) + 1;
    }

    return Object.values(byDay)
      .map((d) => ({
        date: d.date,
        connections: d.connections,
        uniqueSessions: d.uniqueUsers.size,
        countries: d.countries,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});
