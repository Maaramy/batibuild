import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// ── Helpers ──

const periodToMs: Record<string, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
  "year": 365 * 24 * 60 * 60 * 1000,
};

function getStartTs(period: string, customStart?: number): number {
  if (period === "custom" && customStart) return customStart;
  const ms = periodToMs[period] || periodToMs["30d"];
  return Date.now() - ms;
}

async function resolveSupplierId(ctx: any) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Non authentifié");
  const profile = await ctx.db
    .query("supplierProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
    .first();
  if (!profile) throw new Error("Profil fournisseur introuvable");
  return profile._id;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/** KPI summary cards.
 *  Returns null when the user has no supplier profile yet (dashboard calls
 *  this for every supplier-role user, profile creation is a separate step). */
export const getSupplierKPIs = query({
  args: {
    period: v.string(),
    customStart: v.optional(v.number()),
  },
  handler: async (ctx, { period, customStart }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .first();
    if (!profile) return null;
    const supplierId = profile._id;
    const startTs = getStartTs(period, customStart);

    const allEvents = await ctx.db
      .query("supplierAnalytics")
      .withIndex("by_supplier", (q) => q.eq("supplierId", supplierId))
      .collect();

    const events = allEvents.filter((e) => e.date >= startTs);

    // ── Vues du profil (analytics "view" events, ex. page publique du profil) ──
    const views = events.filter((e) => e.eventType === "view").length;
    const clicks = events.filter((e) => e.eventType === "click").length;
    const contacts = events.filter((e) => e.eventType === "contact").length;
    const ctr = views > 0 ? Math.round((clicks / views) * 1000) / 10 : 0;

    // ── Demandes reçues (vraies demandes de devis reçues sur la période) ──
    const allRequests = await ctx.db
      .query("quoteRequests")
      .withIndex("by_supplier", (q) => q.eq("supplierId", supplierId))
      .collect();
    const requestsReceived = allRequests.filter(
      (r) => r.createdAt >= startTs,
    ).length;

    // ── Réponses envoyées (vraies réponses aux devis sur la période) ──
    const allResponses = await ctx.db
      .query("quoteResponses")
      .withIndex("by_supplier", (q) => q.eq("supplierId", supplierId))
      .collect();
    const responsesSent = allResponses.filter(
      (r) => r.createdAt >= startTs,
    ).length;

    // ── Taux de réponse = réponses / demandes reçues ──
    const responseRate =
      requestsReceived > 0
        ? Math.round((responsesSent / requestsReceived) * 100)
        : 0;

    // Average rating
    const ratings = await ctx.db
      .query("supplierRatings")
      .withIndex("by_supplier", (q) => q.eq("supplierId", supplierId))
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
      clicks,
      contacts,
      ctr,
      requestsReceived,
      responsesSent,
      responseRate,
      avgRating,
      totalRatings: recentRatings.length,
    };
  },
});

/** Views & clicks over time (daily) for line/area chart */
export const getViewsOverTime = query({
  args: {
    period: v.string(),
    customStart: v.optional(v.number()),
  },
  handler: async (ctx, { period, customStart }) => {
    const supplierId = await resolveSupplierId(ctx);
    const startTs = getStartTs(period, customStart);

    const allEvents = await ctx.db
      .query("supplierAnalytics")
      .withIndex("by_supplier", (q) => q.eq("supplierId", supplierId))
      .collect();

    const events = allEvents.filter((e) => e.date >= startTs);

    // Group by day
    const dayMap = new Map<string, { views: number; clicks: number }>();
    for (const e of events) {
      const day = new Date(e.date).toISOString().slice(0, 10);
      const cur = dayMap.get(day) || { views: 0, clicks: 0 };
      if (e.eventType === "view") cur.views++;
      if (e.eventType === "click") cur.clicks++;
      dayMap.set(day, cur);
    }

    return [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));
  },
});

/** Clicks by product for bar chart */
export const getClicksByProduct = query({
  args: {
    period: v.string(),
    customStart: v.optional(v.number()),
  },
  handler: async (ctx, { period, customStart }) => {
    const supplierId = await resolveSupplierId(ctx);
    const startTs = getStartTs(period, customStart);

    const allEvents = await ctx.db
      .query("supplierAnalytics")
      .withIndex("by_supplier", (q) => q.eq("supplierId", supplierId))
      .collect();

    const events = allEvents.filter(
      (e) => e.date >= startTs && e.eventType === "click" && e.productId,
    );

    const byProduct = new Map<string, number>();
    for (const e of events) {
      const pid = e.productId!;
      byProduct.set(pid, (byProduct.get(pid) || 0) + 1);
    }

    return [...byProduct.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([product, clicks]) => ({ product, clicks }));
  },
});

/** Traffic sources for donut chart */
export const getTrafficSources = query({
  args: {
    period: v.string(),
    customStart: v.optional(v.number()),
  },
  handler: async (ctx, { period, customStart }) => {
    const supplierId = await resolveSupplierId(ctx);
    const startTs = getStartTs(period, customStart);

    const allEvents = await ctx.db
      .query("supplierAnalytics")
      .withIndex("by_supplier", (q) => q.eq("supplierId", supplierId))
      .collect();

    const events = allEvents.filter((e) => e.date >= startTs);

    const bySource = new Map<string, number>();
    for (const e of events) {
      const src = e.source || "other";
      bySource.set(src, (bySource.get(src) || 0) + 1);
    }

    return [...bySource.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  },
});

/** Top 5 products for horizontal bar chart */
export const getTopProducts = query({
  args: {
    period: v.string(),
    customStart: v.optional(v.number()),
  },
  handler: async (ctx, { period, customStart }) => {
    const supplierId = await resolveSupplierId(ctx);
    const startTs = getStartTs(period, customStart);

    const allEvents = await ctx.db
      .query("supplierAnalytics")
      .withIndex("by_supplier", (q) => q.eq("supplierId", supplierId))
      .collect();

    const events = allEvents.filter((e) => e.date >= startTs);

    const byProduct = new Map<string, { views: number; clicks: number }>();
    for (const e of events) {
      const pid = e.productId || "unknown";
      const cur = byProduct.get(pid) || { views: 0, clicks: 0 };
      if (e.eventType === "view") cur.views++;
      if (e.eventType === "click") cur.clicks++;
      byProduct.set(pid, cur);
    }

    return [...byProduct.entries()]
      .sort(([, a], [, b]) => b.views - a.views)
      .slice(0, 5)
      .map(([product, data]) => ({
        product,
        views: data.views,
        clicks: data.clicks,
        ctr: data.views > 0 ? Math.round((data.clicks / data.views) * 1000) / 10 : 0,
      }));
  },
});

/** Detailed table data */
export const getDetailedTable = query({
  args: {
    period: v.string(),
    customStart: v.optional(v.number()),
  },
  handler: async (ctx, { period, customStart }) => {
    const supplierId = await resolveSupplierId(ctx);
    const startTs = getStartTs(period, customStart);

    const allEvents = await ctx.db
      .query("supplierAnalytics")
      .withIndex("by_supplier", (q) => q.eq("supplierId", supplierId))
      .collect();

    const events = allEvents.filter((e) => e.date >= startTs);

    const byProduct = new Map<string, { views: number; clicks: number; contacts: number }>();
    for (const e of events) {
      const pid = e.productId || "unknown";
      const cur = byProduct.get(pid) || { views: 0, clicks: 0, contacts: 0 };
      if (e.eventType === "view") cur.views++;
      if (e.eventType === "click") cur.clicks++;
      if (e.eventType === "contact") cur.contacts++;
      byProduct.set(pid, cur);
    }

    return [...byProduct.entries()]
      .map(([product, data]) => ({
        product,
        views: data.views,
        clicks: data.clicks,
        contacts: data.contacts,
        ctr: data.views > 0 ? Math.round((data.clicks / data.views) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.views - a.views);
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS — record analytics events (called by frontend or backend hooks)
// ═══════════════════════════════════════════════════════════════════════════

export const recordEvent = mutation({
  args: {
    supplierId: v.id("supplierProfiles"),
    eventType: v.union(v.literal("view"), v.literal("click"), v.literal("contact")),
    productId: v.optional(v.string()),
    source: v.optional(
      v.union(v.literal("direct"), v.literal("search"), v.literal("social"), v.literal("other")),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("supplierAnalytics", {
      supplierId: args.supplierId,
      date: Date.now(),
      eventType: args.eventType,
      productId: args.productId,
      source: args.source,
    });
    return { ok: true };
  },
});

// La mutation `seedDemoAnalytics` (90 jours d'événements aléatoires + fausses
// notes) a été supprimée : la page Statistiques fournisseur n'affiche plus que
// les données réelles du fournisseur connecté. Aucune donnée de démonstration
// ne peut donc plus être créée.
