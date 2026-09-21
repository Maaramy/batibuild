import { v } from "convex/values";
import { query, mutation, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { getFreePlanStatus, isProfilePaymentActive } from "./access";

// ============================================================================
// STATISTIQUES EXPERT — performances et visibilité d'un profil professionnel
//
// Toutes les données sont réelles : elles proviennent des vues et contacts
// enregistrés (`expertAnalytics`), des demandes de devis/prestations
// (`expertServiceRequests` + `expertServiceResponses`), des demandes de
// rendez-vous (`expertAppointments`), des urgences (`expertUrgentRequests`) et
// des avis (`expertRatings`). Aucune donnée de démonstration n'est fabriquée.
//
// Chaque query résout le profil expert de l'utilisateur connecté : un compte
// sans profil reçoit une réponse vide / null (les écrans restent utilisables).
// ============================================================================

// ── Helpers ──

const DAY_MS = 24 * 60 * 60 * 1000;

const periodToMs: Record<string, number> = {
  "7d": 7 * DAY_MS,
  "30d": 30 * DAY_MS,
  "90d": 90 * DAY_MS,
  year: 365 * DAY_MS,
};

function getStartTs(period: string, customStart?: number): number {
  if (period === "custom" && customStart) return customStart;
  const ms = periodToMs[period] || periodToMs["30d"];
  return Date.now() - ms;
}

/** Bornes de la période (start inclus → now). */
function getRange(period: string, customStart?: number) {
  const startTs = getStartTs(period, customStart);
  return { startTs, endTs: Date.now() };
}

/** Profil expert de l'utilisateur connecté (null si absent / non authentifié). */
async function resolveExpert(ctx: QueryCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) return null;
  return await ctx.db
    .query("expertProfiles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();
}

/** Données de la période, telles qu'exploitées par les queries ci-dessous. */
type PeriodData = {
  events: Doc<"expertAnalytics">[];
  requests: Doc<"expertServiceRequests">[];
  responses: Doc<"expertServiceResponses">[];
  appointments: Doc<"expertAppointments">[];
  urgents: Doc<"expertUrgentRequests">[];
  ratings: Doc<"expertRatings">[];
};

/** Toutes les sources nécessaires aux statistiques, filtrées sur la période. */
async function collectPeriodData(
  ctx: QueryCtx,
  expertId: Id<"expertProfiles">,
  startTs: number,
  endTs: number,
): Promise<PeriodData> {
  const [allEvents, allRequests, allResponses, allAppointments, allUrgents, allRatings] =
    await Promise.all([
      ctx.db
        .query("expertAnalytics")
        .withIndex("by_expert", (q) => q.eq("expertId", expertId))
        .collect(),
      ctx.db
        .query("expertServiceRequests")
        .withIndex("by_expert", (q) => q.eq("expertId", expertId))
        .collect(),
      ctx.db
        .query("expertServiceResponses")
        .withIndex("by_expert", (q) => q.eq("expertId", expertId))
        .collect(),
      ctx.db
        .query("expertAppointments")
        .withIndex("by_expert", (q) => q.eq("expertId", expertId))
        .collect(),
      ctx.db
        .query("expertUrgentRequests")
        .withIndex("by_expert", (q) => q.eq("expertId", expertId))
        .collect(),
      ctx.db
        .query("expertRatings")
        .withIndex("by_expert", (q) => q.eq("expertId", expertId))
        .collect(),
    ]);

  const inRange = (ts: number) => ts >= startTs && ts <= endTs;

  return {
    events: allEvents.filter((e) => inRange(e.date)),
    requests: allRequests.filter((r) => inRange(r.createdAt)),
    responses: allResponses.filter((r) => inRange(r.createdAt)),
    appointments: allAppointments.filter((a) => inRange(a.createdAt)),
    urgents: allUrgents.filter((u) => inRange(u.createdAt)),
    ratings: allRatings.filter((r) => inRange(r.createdAt)),
  };
}

function countByEvent(
  events: Doc<"expertAnalytics">[],
  type: "view" | "click" | "contact",
) {
  return events.filter((e) => e.eventType === type).length;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES — KPIs temps réel
// ═══════════════════════════════════════════════════════════════════════════

/** Cartes KPI du tableau de bord expert.
 *  Renvoie null quand l'utilisateur n'a pas encore de profil expert. */
export const getExpertKPIs = query({
  args: {
    period: v.string(),
    customStart: v.optional(v.number()),
  },
  handler: async (ctx, { period, customStart }) => {
    const profile = await resolveExpert(ctx);
    if (!profile) return null;
    const expertId = profile._id;
    const { startTs, endTs } = getRange(period, customStart);
    const data: PeriodData = await collectPeriodData(
      ctx,
      expertId,
      startTs,
      endTs,
    );

    // ── Vues, clics et contacts du profil ──
    const views = countByEvent(data.events, "view");
    const clicks = countByEvent(data.events, "click");
    const contacts = countByEvent(data.events, "contact");

    // ── Demandes reçues / réponses envoyées ──
    const requestsReceived = data.requests.length;
    const responsesSent = data.responses.length;
    const responseRate =
      requestsReceived > 0
        ? Math.round((responsesSent / requestsReceived) * 100)
        : 0;
    const pendingRequests = data.requests.filter(
      (r) => r.status === "pending",
    ).length;

    // ── Rendez-vous ──
    const appointments = data.appointments.length;
    const appointmentsApproved = data.appointments.filter(
      (a) => a.status === "approved" || a.status === "completed",
    ).length;
    const appointmentsPending = data.appointments.filter(
      (a) => a.status === "pending",
    ).length;

    // ── Urgences ──
    const urgentRequests = data.urgents.length;
    const urgentAccepted = data.urgents.filter(
      (u) => u.status === "accepted" || u.status === "completed",
    ).length;

    // ── Note moyenne ──
    const avgRating =
      data.ratings.length > 0
        ? Math.round(
            (data.ratings.reduce((s, r) => s + r.rating, 0) /
              data.ratings.length) *
              10,
          ) / 10
        : 0;

    // ── Taux de contact : part des visiteurs qui engagent la conversation ──
    const contactRate =
      views > 0 ? Math.round((contacts / views) * 1000) / 10 : 0;

    return {
      views,
      clicks,
      contacts,
      contactRate,
      requestsReceived,
      responsesSent,
      responseRate,
      pendingRequests,
      appointments,
      appointmentsApproved,
      appointmentsPending,
      urgentRequests,
      urgentAccepted,
      avgRating,
      totalRatings: data.ratings.length,
    };
  },
});

/** Vues et contacts par jour (courbe d'audience).
 *  Les jours sans activité sont inclus à 0 pour une courbe lisible. */
export const getExpertViewsOverTime = query({
  args: {
    period: v.string(),
    customStart: v.optional(v.number()),
  },
  handler: async (ctx, { period, customStart }) => {
    const profile = await resolveExpert(ctx);
    if (!profile) return [];
    const { startTs, endTs } = getRange(period, customStart);

    const events = await ctx.db
      .query("expertAnalytics")
      .withIndex("by_expert", (q) => q.eq("expertId", profile._id))
      .collect();

    const dayMap = new Map<string, { views: number; contacts: number }>();
    for (const e of events) {
      if (e.date < startTs || e.date > endTs) continue;
      const day = new Date(e.date).toISOString().slice(0, 10);
      const cur = dayMap.get(day) || { views: 0, contacts: 0 };
      if (e.eventType === "view") cur.views++;
      if (e.eventType === "contact") cur.contacts++;
      dayMap.set(day, cur);
    }

    // Série continue : bornée à 366 points pour éviter les très longues séries.
    const days: Array<{ date: string; views: number; contacts: number }> = [];
    const firstDay = Math.floor(startTs / DAY_MS) * DAY_MS;
    for (let ts = firstDay; ts <= endTs && days.length < 366; ts += DAY_MS) {
      const key = new Date(ts).toISOString().slice(0, 10);
      const cur = dayMap.get(key) || { views: 0, contacts: 0 };
      days.push({ date: key, ...cur });
    }
    return days;
  },
});

/** Sources de trafic du profil (direct / recherche / réseaux / autre). */
export const getExpertTrafficSources = query({
  args: {
    period: v.string(),
    customStart: v.optional(v.number()),
  },
  handler: async (ctx, { period, customStart }) => {
    const profile = await resolveExpert(ctx);
    if (!profile) return [];
    const { startTs, endTs } = getRange(period, customStart);

    const events = await ctx.db
      .query("expertAnalytics")
      .withIndex("by_expert", (q) => q.eq("expertId", profile._id))
      .collect();

    const bySource = new Map<string, number>();
    for (const e of events) {
      if (e.date < startTs || e.date > endTs) continue;
      const src = e.source || "other";
      bySource.set(src, (bySource.get(src) || 0) + 1);
    }

    return [...bySource.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  },
});

/** Répartition des demandes par nature (devis, services, rendez-vous, urgences). */
export const getExpertDemandBreakdown = query({
  args: {
    period: v.string(),
    customStart: v.optional(v.number()),
  },
  handler: async (ctx, { period, customStart }) => {
    const profile = await resolveExpert(ctx);
    if (!profile) return [];
    const { startTs, endTs } = getRange(period, customStart);
    const data = await collectPeriodData(ctx, profile._id, startTs, endTs);

    const rows = [
      {
        name: "Devis",
        value: data.requests.filter((r) => r.requestType === "devis").length,
      },
      {
        name: "Services experts",
        value: data.requests.filter((r) => r.requestType === "service").length,
      },
      { name: "Rendez-vous", value: data.appointments.length },
      { name: "Urgences", value: data.urgents.length },
    ];

    return rows;
  },
});

/** Régions d'où proviennent les demandes (top 8). */
export const getExpertRegions = query({
  args: {
    period: v.string(),
    customStart: v.optional(v.number()),
  },
  handler: async (ctx, { period, customStart }) => {
    const profile = await resolveExpert(ctx);
    if (!profile) return [];
    const { startTs, endTs } = getRange(period, customStart);
    const data = await collectPeriodData(ctx, profile._id, startTs, endTs);

    const byRegion = new Map<string, number>();
    for (const r of [...data.requests, ...data.urgents]) {
      if (!r.region) continue;
      byRegion.set(r.region, (byRegion.get(r.region) || 0) + 1);
    }

    return [...byRegion.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  },
});

/** Tableau de détail : demandes, réponses et taux par type de demande. */
export const getExpertDemandTable = query({
  args: {
    period: v.string(),
    customStart: v.optional(v.number()),
  },
  handler: async (ctx, { period, customStart }) => {
    const profile = await resolveExpert(ctx);
    if (!profile) return [];
    const { startTs, endTs } = getRange(period, customStart);
    const data = await collectPeriodData(ctx, profile._id, startTs, endTs);

    const lastOf = (rows: Array<{ createdAt: number }>) =>
      rows.length > 0 ? Math.max(...rows.map((r) => r.createdAt)) : 0;

    const build = (
      key: string,
      name: string,
      requests: Array<{ status: string; createdAt: number }>,
      responded: number,
    ) => ({
      key,
      name,
      requests: requests.length,
      responses: responded,
      rate:
        requests.length > 0
          ? Math.round((responded / requests.length) * 100)
          : 0,
      pending: requests.filter((r) => r.status === "pending").length,
      lastAt: lastOf(requests),
    });

    const devis = data.requests.filter((r) => r.requestType === "devis");
    const services = data.requests.filter((r) => r.requestType === "service");
    const devisIds = new Set(devis.map((r) => r._id));
    const serviceIds = new Set(services.map((r) => r._id));
    const devisResponses = data.responses.filter((r) =>
      devisIds.has(r.serviceRequestId),
    ).length;
    const serviceResponses = data.responses.filter((r) =>
      serviceIds.has(r.serviceRequestId),
    ).length;

    const decidedAppointments = data.appointments.filter(
      (a) => a.status !== "pending" && a.status !== "cancelled",
    ).length;
    const decidedUrgents = data.urgents.filter(
      (u) => u.status !== "pending" && u.status !== "cancelled",
    ).length;

    return [
      build("devis", "Devis", devis, devisResponses),
      build("service", "Services experts", services, serviceResponses),
      build("appointment", "Rendez-vous", data.appointments, decidedAppointments),
      build("urgent", "Urgences", data.urgents, decidedUrgents),
    ];
  },
});

/** Activité récente : dernières interactions reçues (12 plus récentes). */
export const getExpertRecentActivity = query({
  args: {
    period: v.string(),
    customStart: v.optional(v.number()),
  },
  handler: async (ctx, { period, customStart }) => {
    const profile = await resolveExpert(ctx);
    if (!profile) return [];
    const { startTs, endTs } = getRange(period, customStart);
    const data = await collectPeriodData(ctx, profile._id, startTs, endTs);

    const activities: Array<{
      id: string;
      kind: "devis" | "service" | "appointment" | "urgent" | "rating";
      title: string;
      subtitle: string;
      status: string;
      at: number;
    }> = [];

    for (const r of data.requests) {
      activities.push({
        id: r._id,
        kind: r.requestType === "devis" ? "devis" : "service",
        title: r.userName || "Client",
        subtitle: r.projectName
          ? `Projet : ${r.projectName}`
          : (r.description || "").slice(0, 90),
        status: r.status,
        at: r.createdAt,
      });
    }
    for (const a of data.appointments) {
      activities.push({
        id: a._id,
        kind: "appointment",
        title: a.userName || "Client",
        subtitle: a.reason || "Demande de rendez-vous",
        status: a.status,
        at: a.createdAt,
      });
    }
    for (const u of data.urgents) {
      activities.push({
        id: u._id,
        kind: "urgent",
        title: u.userName || "Client",
        subtitle: (u.description || "Demande urgente").slice(0, 90),
        status: u.status,
        at: u.createdAt,
      });
    }
    for (const r of data.ratings) {
      activities.push({
        id: r._id,
        kind: "rating",
        title: `${r.rating}/5`,
        subtitle: r.comment ? r.comment.slice(0, 90) : "Nouvel avis client",
        status: "published",
        at: r.createdAt,
      });
    }

    return activities.sort((a, b) => b.at - a.at).slice(0, 12);
  },
});

/** Position du profil parmi les experts visibles de la même profession. */
export const getExpertVisibility = query({
  args: {},
  handler: async (ctx) => {
    const profile = await resolveExpert(ctx);
    if (!profile) return null;

    const peers = await ctx.db
      .query("expertProfiles")
      .withIndex("by_profession", (q) => q.eq("profession", profile.profession))
      .collect();
    // Plafonné : le classement reste borné même si un métier compte beaucoup
    // de profils publiés (chaque profil nécessite ses avis et ses vues).
    const visible = peers.filter((p) => p.isVisible).slice(0, 200);

    // Classement : note moyenne, puis nombre d'avis, puis vues cumulées.
    const scored = await Promise.all(
      visible.map(async (p) => {
        const ratings = await ctx.db
          .query("expertRatings")
          .withIndex("by_expert", (q) => q.eq("expertId", p._id))
          .collect();
        const views = await ctx.db
          .query("expertAnalytics")
          .withIndex("by_expert_type", (q) =>
            q.eq("expertId", p._id).eq("eventType", "view"),
          )
          .collect();
        const avg =
          ratings.length > 0
            ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
            : 0;
        return { id: p._id, avg, count: ratings.length, views: views.length };
      }),
    );

    scored.sort(
      (a, b) =>
        b.avg - a.avg || b.count - a.count || b.views - a.views,
    );
    const index = scored.findIndex((s) => s.id === profile._id);

    // Visibilité effective : un profil dont le paiement n'est pas actif reste
    // strictement invisible, quel que soit le champ `isVisible` (géré par
    // l'administrateur / l'abonnement, jamais par l'utilisateur).
    const free = await getFreePlanStatus(ctx);
    const paymentActive = await isProfilePaymentActive(ctx, free.expertFree, profile);

    return {
      rank: index >= 0 ? index + 1 : null,
      total: scored.length,
      isVisible: profile.isVisible === true && paymentActive,
      profession: profile.profession,
    };
  },
});

// ── Complétude du profil : ce qu'il reste à renseigner pour être visible ──

const PROFILE_CHECKS: Array<{
  key: string;
  label: string;
  done: (p: Doc<"expertProfiles">) => boolean;
}> = [
  { key: "logo", label: "Photo ou logo", done: (p) => !!p.logo },
  { key: "description", label: "Présentation", done: (p) => !!p.description?.trim() },
  { key: "companyName", label: "Nom de l'entreprise", done: (p) => !!p.companyName?.trim() },
  { key: "phone", label: "Téléphone", done: (p) => !!p.phone?.trim() },
  { key: "email", label: "E-mail", done: (p) => !!p.email?.trim() },
  { key: "address", label: "Adresse", done: (p) => !!p.address?.trim() },
  { key: "website", label: "Site web", done: (p) => !!p.website?.trim() },
  { key: "specialties", label: "Au moins une spécialité", done: (p) => (p.specialties ?? []).length > 0 },
  { key: "regions", label: "Zones d'intervention", done: (p) => (p.regions ?? []).length > 0 },
  { key: "indicativePrice", label: "Prix indicatifs", done: (p) => !!p.indicativePrice?.trim() },
  { key: "availability", label: "Disponibilité", done: (p) => !!p.availability },
];

/** Score de complétude du profil + champs manquants (pilotent la visibilité). */
export const getExpertProfileCompleteness = query({
  args: {},
  handler: async (ctx) => {
    const profile = await resolveExpert(ctx);
    if (!profile) return null;

    const missing = PROFILE_CHECKS.filter((c) => !c.done(profile)).map((c) => ({
      key: c.key,
      label: c.label,
    }));
    const total = PROFILE_CHECKS.length;

    return {
      score: Math.round(((total - missing.length) / total) * 100),
      filled: total - missing.length,
      total,
      missing,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS — enregistrement des événements
// ═══════════════════════════════════════════════════════════════════════════

/** Enregistre un événement (vue / clic / contact) pour un profil expert. */
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
