import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { attachmentValidator } from "./schema";
import {
  PROMARKET_CATEGORIES,
  PROMARKET_TRADE_LABELS,
  interpretProMarketNeed,
  promarketRegionLabel,
  promarketTradeLabel,
} from "../lib/promarketMeta";
import { DEMO_PROFESSIONALS, DEMO_REVIEWS, buildDemoProfileDoc } from "./promarketDemo";
import {
  MAX_ATTACHMENTS,
  type SearchArgs,
  avgRating,
  canQuoteRequest,
  canViewRequest,
  categoryForTrade,
  getOwnProfile,
  isStaff,
  notify,
  notifyProfessionalsByTrade,
  publicProfile,
  requestStatusValidator,
  requestSummary,
  requireUser,
  runSearch,
} from "./promarketShared";
import {
  buildProMarketEligibilityFilter,
  evaluateExpertForProMarket,
  getExpertProMarketContext,
  proMarketExpertOnlyError,
  syncProMarketProfileFromExpert,
} from "./proMarketAccess";

// ============================================================================
// ProMarket — marketplace de services professionnels (clients & professionnels)
//
// Les règles de sécurité vivent dans `promarketShared.ts` et sont appliquées
// côté serveur : coordonnées jamais exposées aux visiteurs anonymes, fiche
// modifiable par son propriétaire uniquement (badges = admin), demandes
// lisibles par le client / le professionnel concerné / le staff, devis réservés
// aux professionnels éligibles, avis publiés après modération.
// ============================================================================

// ----------------------------------------------------------------------------
// Catalogue & recherche
// ----------------------------------------------------------------------------

/** Catégories ProMarket (table admin, sinon catalogue par défaut). */
export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("promarketCategories")
      .withIndex("by_order")
      .take(100);

    const profiles = await ctx.db
      .query("promarketProfiles")
      .withIndex("by_status", (q: any) => q.eq("status", "active"))
      .take(600);
    const countFor = (slug: string) =>
      profiles.filter((p: Doc<"promarketProfiles">) => p.category === slug).length;

    if (rows.length === 0) {
      return PROMARKET_CATEGORIES.map((c, index) => ({
        slug: c.slug,
        label: c.label,
        icon: c.icon,
        description: c.description,
        order: index,
        active: true,
        seeded: false,
        count: countFor(c.slug),
      }));
    }

    return rows
      .filter((c: Doc<"promarketCategories">) => c.active)
      .map((c: Doc<"promarketCategories">) => ({
        slug: c.slug,
        label: c.label,
        icon: c.icon,
        description: c.description ?? "",
        order: c.order,
        active: c.active,
        seeded: true,
        count: countFor(c.slug),
      }));
  },
});

/** Nombre de fiches actives par métier (filtres de recherche). */
export const listTradeCounts = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db
      .query("promarketProfiles")
      .withIndex("by_status", (q: any) => q.eq("status", "active"))
      .take(600);
    const counts = new Map<string, number>();
    for (const p of profiles) {
      counts.set(p.trade, (counts.get(p.trade) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([trade, count]) => ({ trade, count }))
      .sort((a, b) => b.count - a.count);
  },
});

/** Recherche multicritère de professionnels. */
export const searchProfessionals = query({
  args: {
    q: v.optional(v.string()),
    category: v.optional(v.string()),
    trade: v.optional(v.string()),
    region: v.optional(v.string()),
    city: v.optional(v.string()),
    kind: v.optional(v.union(v.literal("independant"), v.literal("entreprise"))),
    minRating: v.optional(v.number()),
    verifiedOnly: v.optional(v.boolean()),
    urgent: v.optional(v.boolean()),
    homeService: v.optional(v.boolean()),
    availability: v.optional(
      v.union(v.literal("immediate"), v.literal("week"), v.literal("busy")),
    ),
    maxPrice: v.optional(v.number()),
    maxDistanceKm: v.optional(v.number()),
    userLat: v.optional(v.number()),
    userLng: v.optional(v.number()),
    sort: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await getCurrentUser(ctx);
    return await runSearch(ctx, args as SearchArgs, viewer);
  },
});

/** Assistant ProMarket : interprète un besoin en langage naturel. */
export const interpretNeed = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const viewer = await getCurrentUser(ctx);
    const need = interpretProMarketNeed(args.query);
    // L'urgence et l'intervention à domicile ne sont pas des filtres excluants :
    // elles sont intégrées au score de pertinence (cf. runSearch).
    const search = await runSearch(
      ctx,
      {
        trade: need.trade,
        category: need.category,
        region: need.region,
        city: need.city,
        sort: "relevance",
        limit: 6,
      },
      viewer,
    );
    return { need, professionals: search.results, total: search.total };
  },
});

/** Fiche détaillée d'un professionnel (avec ses avis publiés). */
export const getProfessional = query({
  args: { professionalId: v.id("promarketProfiles") },
  handler: async (ctx, args) => {
    const viewer = await getCurrentUser(ctx);
    const profile = await ctx.db.get(args.professionalId);
    if (!profile) return null;
    const isOwner = Boolean(viewer && profile.userId === viewer._id);
    if (profile.status === "suspended" && !isStaff(viewer) && !isOwner) {
      return null;
    }
    // RÈGLE D'ACCÈS PROFESSIONNELS : une fiche réelle qui n'est plus adossée à
    // un Expert BatiBuild éligible n'est plus publique.
    if (!profile.demo && !isStaff(viewer) && !isOwner) {
      const expert = profile.expertProfileId
        ? await ctx.db.get(profile.expertProfileId)
        : null;
      if (!(await evaluateExpertForProMarket(ctx, expert)).eligible) return null;
    }

    const saved = viewer
      ? (await ctx.db
          .query("promarketSaved")
          .withIndex("by_user_professional", (q: any) =>
            q.eq("userId", viewer._id).eq("professionalId", args.professionalId),
          )
          .first()) !== null
      : false;

    const reviews = await ctx.db
      .query("promarketReviews")
      .withIndex("by_professional_status", (q: any) =>
        q.eq("professionalId", args.professionalId).eq("status", "approved"),
      )
      .order("desc")
      .take(30);

    const authors = await Promise.all(
      reviews.map(async (r: Doc<"promarketReviews">) => {
        if (r.userId) {
          const u = await ctx.db.get(r.userId);
          return u?.name ?? u?.email?.split("@")[0] ?? "Client";
        }
        return r.authorName ?? "Client";
      }),
    );

    const gallery = await Promise.all(
      (profile.gallery ?? []).map(async (g) => ({
        ...g,
        url: await ctx.storage.getUrl(g.storageId),
      })),
    );

    return {
      profile: { ...publicProfile(profile, viewer), gallery },
      saved,
      reviews: reviews.map((r: Doc<"promarketReviews">, i: number) => ({
        _id: r._id,
        rating: r.rating,
        quality: r.quality,
        punctuality: r.punctuality,
        professionalism: r.professionalism,
        value: r.value,
        communication: r.communication,
        comment: r.comment,
        status: r.status,
        demo: r.demo ?? false,
        createdAt: r.createdAt,
        authorName: authors[i],
      })),
    };
  },
});

/** Incrémente le compteur de vues d'une fiche. */
export const registerView = mutation({
  args: { professionalId: v.id("promarketProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.professionalId);
    if (!profile) return null;
    await ctx.db.patch(args.professionalId, { views: (profile.views ?? 0) + 1 });
    return null;
  },
});

/** Enregistre un clic de contact (appel, WhatsApp, message, devis). */
export const registerContact = mutation({
  args: {
    professionalId: v.id("promarketProfiles"),
    channel: v.union(
      v.literal("phone"),
      v.literal("whatsapp"),
      v.literal("message"),
      v.literal("quote"),
    ),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const profile = await ctx.db.get(args.professionalId);
    if (!profile) throw new ConvexError("Professionnel introuvable");
    await ctx.db.patch(args.professionalId, {
      contacts: (profile.contacts ?? 0) + 1,
      quoteCount:
        args.channel === "quote" || args.channel === "message"
          ? (profile.quoteCount ?? 0) + 1
          : profile.quoteCount ?? 0,
    });
    return null;
  },
});

/** Identifiants des professionnels enregistrés par l'utilisateur courant. */
export const listSavedProfessionalIds = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [] as string[];
    const rows = await ctx.db
      .query("promarketSaved")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .take(200);
    return rows.map((r: Doc<"promarketSaved">) => r.professionalId as string);
  },
});

/** Professionnels enregistrés (favoris). */
export const listSavedProfessionals = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("promarketSaved")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .take(100);
    const out = [];
    const isEligible = await buildProMarketEligibilityFilter(ctx);
    for (const row of rows) {
      const profile = await ctx.db.get(row.professionalId);
      if (!profile || profile.status === "suspended") continue;
      if (!(await isEligible(profile))) continue;
      out.push({ ...publicProfile(profile, user), savedAt: row.createdAt });
    }
    return out;
  },
});

/** Enregistrer / retirer un professionnel des favoris. */
export const toggleSavedProfessional = mutation({
  args: { professionalId: v.id("promarketProfiles") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const profile = await ctx.db.get(args.professionalId);
    if (!profile) throw new ConvexError("Professionnel introuvable");
    const existing = await ctx.db
      .query("promarketSaved")
      .withIndex("by_user_professional", (q: any) =>
        q.eq("userId", user._id).eq("professionalId", args.professionalId),
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false };
    }
    await ctx.db.insert("promarketSaved", {
      userId: user._id,
      professionalId: args.professionalId,
      createdAt: Date.now(),
    });
    return { saved: true };
  },
});

// ----------------------------------------------------------------------------
// Espace professionnel — RÈGLE D'ACCÈS PROFESSIONNELS
//
// ProMarket n'a AUCUN système d'inscription professionnelle : l'espace
// professionnel est l'espace de l'Expert BatiBuild. La fiche ProMarket est une
// projection synchronisée de `expertProfiles` (cf. proMarketAccess.ts).
// ----------------------------------------------------------------------------

/** Fiche ProMarket de l'Expert connecté + éligibilité + statistiques. */
export const getMyProfessionalProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { profile: null, stats: null, expert: null, eligibility: null };
    }

    const { expert, profile, eligibility } = await getExpertProMarketContext(
      ctx,
      user._id,
    );

    const expertSummary = expert
      ? {
          _id: expert._id,
          profession: expert.profession,
          displayName: expert.displayName,
          companyName: expert.companyName ?? null,
          description: expert.description ?? null,
          specialties: expert.specialties ?? [],
          regions: expert.regions ?? [],
          phone: expert.phone,
          isVisible: expert.isVisible,
          proMarketOptIn: expert.proMarketOptIn === true,
          proMarketAvailable: expert.proMarketAvailable !== false,
          proMarketStatus: expert.proMarketStatus ?? null,
          proMarketPrefs: expert.proMarketPrefs ?? null,
        }
      : null;

    if (!profile) {
      return { profile: null, stats: null, expert: expertSummary, eligibility };
    }

    const requests = await ctx.db
      .query("promarketRequests")
      .withIndex("by_professional", (q: any) => q.eq("professionalId", profile._id))
      .take(300);
    const quotes = await ctx.db
      .query("promarketQuotes")
      .withIndex("by_professional", (q: any) => q.eq("professionalId", profile._id))
      .take(300);

    return {
      profile: publicProfile(profile, user),
      expert: expertSummary,
      eligibility,
      stats: {
        newRequests: requests.filter((r: Doc<"promarketRequests">) => r.status === "new")
          .length,
        activeRequests: requests.filter((r: Doc<"promarketRequests">) =>
          [
            "contact",
            "quote_requested",
            "quote_received",
            "discussing",
            "accepted",
            "in_progress",
          ].includes(r.status),
        ).length,
        quotesSent: quotes.length,
        quotesAccepted: quotes.filter((q: Doc<"promarketQuotes">) => q.status === "accepted")
          .length,
        jobsDone: requests.filter((r: Doc<"promarketRequests">) => r.status === "done")
          .length,
        rating: avgRating(profile),
        ratingCount: profile.ratingCount,
        views: profile.views,
        contacts: profile.contacts,
        responseRate:
          requests.length === 0
            ? null
            : Math.round((quotes.length / requests.length) * 100),
      },
    };
  },
});

/**
 * Préférences ProMarket de l'Expert BatiBuild connecté.
 *
 * RÈGLE D'ACCÈS PROFESSIONNELS (§1 et §3) : aucun compte professionnel
 * ProMarket n'est créé ici. Cette mutation écrit les préférences SUR le profil
 * Expert existant (« Disponible sur ProMarket » / « Disponible pour de
 * nouvelles missions ») puis synchronise la fiche ProMarket depuis ce profil.
 * Un utilisateur sans profil Expert est refusé avec un message actionnable.
 */
export const setMyProMarketPreferences = mutation({
  args: {
    optIn: v.boolean(),
    available: v.optional(v.boolean()),
    trade: v.optional(v.string()),
    kind: v.optional(v.union(v.literal("independant"), v.literal("entreprise"))),
    availability: v.optional(
      v.union(v.literal("immediate"), v.literal("week"), v.literal("busy")),
    ),
    experienceYears: v.optional(v.number()),
    priceFrom: v.optional(v.number()),
    priceUnit: v.optional(v.string()),
    urgent: v.optional(v.boolean()),
    homeService: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const expert = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .first();
    // §1 — ProMarket n'accueille que des Experts BatiBuild existants.
    if (!expert) throw proMarketExpertOnlyError("no_expert_profile");

    if (args.trade !== undefined && args.trade !== "" && !PROMARKET_TRADE_LABELS[args.trade]) {
      throw new ConvexError("Métier ProMarket inconnu.");
    }
    if (
      args.experienceYears !== undefined &&
      (args.experienceYears < 0 || args.experienceYears > 70)
    ) {
      throw new ConvexError("Années d'expérience invalides.");
    }
    if (args.priceFrom !== undefined && (args.priceFrom < 0 || args.priceFrom > 1_000_000)) {
      throw new ConvexError("Tarif indicatif invalide.");
    }

    const now = Date.now();
    const previous = expert.proMarketPrefs;
    const prefs = {
      trade: args.trade?.trim() || previous?.trade,
      kind: args.kind ?? previous?.kind ?? (expert.companyName ? "entreprise" : "independant"),
      availability: args.availability ?? previous?.availability ?? "week",
      experienceYears: Math.round(args.experienceYears ?? previous?.experienceYears ?? 0),
      priceFrom: args.priceFrom ?? previous?.priceFrom,
      priceUnit: args.priceUnit?.trim() || previous?.priceUnit,
      urgent: args.urgent ?? previous?.urgent ?? false,
      homeService: args.homeService ?? previous?.homeService ?? false,
    };

    // Première activation → validation administrateur requise. Un refus
    // administratif n'est jamais contourné par un nouveau clic de l'expert.
    const status =
      args.optIn && expert.proMarketStatus === undefined
        ? ("pending" as const)
        : expert.proMarketStatus;

    await ctx.db.patch(expert._id, {
      proMarketOptIn: args.optIn,
      proMarketAvailable: args.available ?? expert.proMarketAvailable ?? true,
      proMarketPrefs: prefs,
      proMarketStatus: status,
      proMarketRequestedAt:
        args.optIn && !expert.proMarketRequestedAt ? now : expert.proMarketRequestedAt,
      updatedAt: now,
    });

    const updated = await ctx.db.get(expert._id);
    const { profileId, eligibility } = await syncProMarketProfileFromExpert(ctx, updated);

    if (args.optIn && !isStaff(user)) {
      await notify(ctx, {
        userId: user._id,
        type: "promarket_verified",
        title: "ProMarket — activation enregistrée",
        message:
          "Votre profil Expert sera publié sur ProMarket après validation par l'équipe BatiBuild.",
        link: "/promarket/pro-space",
      });
    }

    return { profileId, eligibility };
  },
});

/**
 * Demandes reçues / opportunités de l'Expert connecté.
 * Seul un Expert BatiBuild éligible à ProMarket a un espace professionnel.
 */
export const listProfessionalRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { profile: null, assigned: [], opportunities: [], eligibility: null };
    const { profile, eligibility } = await getExpertProMarketContext(ctx, user._id);
    const empty = { profile: null, assigned: [], opportunities: [], eligibility };
    if (!profile || !eligibility.eligible) return empty;

    const rows = await ctx.db
      .query("promarketRequests")
      .withIndex("by_professional", (q: any) => q.eq("professionalId", profile._id))
      .order("desc")
      .take(100);

    const assigned = [];
    for (const request of rows) {
      const client = await ctx.db.get(request.userId);
      const quotes = await ctx.db
        .query("promarketQuotes")
        .withIndex("by_request", (q: any) => q.eq("requestId", request._id))
        .take(50);
      const myQuote = quotes.find(
        (q: Doc<"promarketQuotes">) => q.professionalId === profile._id,
      );
      const allMessages = await ctx.db
        .query("promarketMessages")
        .withIndex("by_request", (q: any) => q.eq("requestId", request._id))
        .order("desc")
        .take(200);
      assigned.push({
        ...requestSummary(request),
        clientName: client?.name ?? client?.email?.split("@")[0] ?? "Client",
        quotesCount: quotes.length,
        myQuote: myQuote ?? null,
        lastMessage: allMessages[0]
          ? {
              body: allMessages[0].body.slice(0, 120),
              createdAt: allMessages[0].createdAt,
            }
          : null,
        unreadCount: allMessages.filter(
          (m: Doc<"promarketMessages">) => !m.readAt && m.senderId !== user._id,
        ).length,
      });
    }

    // Opportunités : demandes publiées (sans destinataire) du même métier.
    const openRows = await ctx.db
      .query("promarketRequests")
      .withIndex("by_trade_created", (q: any) => q.eq("trade", profile.trade))
      .order("desc")
      .take(100);
    const opportunities = openRows
      .filter(
        (r: Doc<"promarketRequests">) =>
          !r.professionalId &&
          r.userId !== user._id &&
          r.status !== "canceled" &&
          r.status !== "done",
      )
      .slice(0, 40)
      .map((r: Doc<"promarketRequests">) => requestSummary(r));

    return {
      profile: publicProfile(profile, user),
      assigned,
      opportunities,
      eligibility,
    };
  },
});

// ----------------------------------------------------------------------------
// Demandes, devis, messagerie
// ----------------------------------------------------------------------------

/** Demandes créées par l'utilisateur courant. */
export const listMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("promarketRequests")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .take(100);

    const out = [];
    for (const request of rows) {
      const profile = request.professionalId
        ? await ctx.db.get(request.professionalId)
        : null;
      const quotes = await ctx.db
        .query("promarketQuotes")
        .withIndex("by_request", (q: any) => q.eq("requestId", request._id))
        .take(50);
      const messages = await ctx.db
        .query("promarketMessages")
        .withIndex("by_request", (q: any) => q.eq("requestId", request._id))
        .order("desc")
        .take(200);

      out.push({
        ...requestSummary(request),
        professional: profile
          ? {
              _id: profile._id,
              displayName: profile.displayName,
              trade: profile.trade,
              tradeLabel: promarketTradeLabel(profile.trade),
              city: profile.city,
              rating: avgRating(profile),
              ratingCount: profile.ratingCount,
              demo: profile.demo,
            }
          : null,
        quotesCount: quotes.length,
        bestQuote: quotes.length
          ? Math.min(...quotes.map((q: Doc<"promarketQuotes">) => q.price))
          : null,
        lastMessage: messages[0]
          ? { body: messages[0].body.slice(0, 120), createdAt: messages[0].createdAt }
          : null,
        unreadCount: messages.filter(
          (m: Doc<"promarketMessages">) => !m.readAt && m.senderId !== user._id,
        ).length,
      });
    }
    return out;
  },
});

/** Devis envoyés (professionnel) et reçus (client). */
export const listMyQuotes = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { sent: [], received: [] };
    const profile = await getOwnProfile(ctx, user._id);

    const sentRows = profile
      ? await ctx.db
          .query("promarketQuotes")
          .withIndex("by_professional", (q: any) => q.eq("professionalId", profile._id))
          .order("desc")
          .take(100)
      : [];
    const receivedRows = await ctx.db
      .query("promarketQuotes")
      .withIndex("by_client", (q: any) => q.eq("clientUserId", user._id))
      .order("desc")
      .take(100);

    const decorate = async (rows: Doc<"promarketQuotes">[], side: "sent" | "received") => {
      const list = [];
      for (const quote of rows) {
        const request = await ctx.db.get(quote.requestId);
        list.push({
          ...quote,
          tradeLabel: request ? promarketTradeLabel(request.trade) : "",
          requestTitle: request?.title ?? "",
          requestStatus: request?.status ?? null,
          regionLabel: request ? promarketRegionLabel(request.region) : "",
          side,
        });
      }
      return list;
    };

    return {
      sent: await decorate(sentRows, "sent"),
      received: await decorate(receivedRows, "received"),
    };
  },
});

/** Détail d'une demande : conversation + devis (contrôle d'accès serveur). */
export const getRequestDetail = query({
  args: { requestId: v.id("promarketRequests") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const request = await ctx.db.get(args.requestId);
    if (!request) return null;
    const { allowed, profile: myProfile } = await canViewRequest(ctx, user, request);
    if (!allowed) return null;

    const target = request.professionalId
      ? await ctx.db.get(request.professionalId)
      : null;
    const client = await ctx.db.get(request.userId);

    const quotes = await ctx.db
      .query("promarketQuotes")
      .withIndex("by_request", (q: any) => q.eq("requestId", request._id))
      .order("desc")
      .take(50);

    const quotesOut = [];
    for (const quote of quotes) {
      const pro = await ctx.db.get(quote.professionalId);
      quotesOut.push({
        ...quote,
        professionalName: pro?.displayName ?? "",
        professionalTrade: pro ? promarketTradeLabel(pro.trade) : "",
        professionalCity: pro?.city ?? "",
        professionalRating: pro ? avgRating(pro) : 0,
        professionalDemo: pro?.demo ?? false,
        isMine: myProfile ? quote.professionalId === myProfile._id : false,
      });
    }

    const messageRows = await ctx.db
      .query("promarketMessages")
      .withIndex("by_request_created", (q: any) => q.eq("requestId", request._id))
      .take(300);

    const withUrls = async (
      list:
        | { storageId: Id<"_storage">; name: string; type: string; size?: number }[]
        | undefined,
    ) =>
      Promise.all(
        (list ?? []).map(async (a) => ({
          ...a,
          url: await ctx.storage.getUrl(a.storageId),
        })),
      );

    const messages = [];
    for (const m of messageRows) {
      const sender = await ctx.db.get(m.senderId);
      messages.push({
        _id: m._id,
        body: m.body,
        senderId: m.senderId,
        senderRole: m.senderRole,
        senderName: sender?.name ?? sender?.email?.split("@")[0] ?? "Utilisateur",
        mine: m.senderId === user._id,
        readAt: m.readAt,
        createdAt: m.createdAt,
        attachments: await withUrls(m.attachments),
      });
    }

    const existingReview = await ctx.db
      .query("promarketReviews")
      .withIndex("by_request", (q: any) => q.eq("requestId", request._id))
      .take(10);

    const canReview =
      request.userId === user._id &&
      ["accepted", "in_progress", "done"].includes(request.status) &&
      Boolean(request.professionalId) &&
      !existingReview.some((r: Doc<"promarketReviews">) => r.userId === user._id);

    return {
      request: {
        ...requestSummary(request),
        attachments: await withUrls(request.attachments),
      },
      professional: target
        ? {
            _id: target._id,
            displayName: target.displayName,
            trade: target.trade,
            tradeLabel: promarketTradeLabel(target.trade),
            city: target.city,
            rating: avgRating(target),
            ratingCount: target.ratingCount,
            demo: target.demo,
            phone: target.phone,
            whatsapp: target.whatsapp,
          }
        : null,
      client: {
        name: client?.name ?? client?.email?.split("@")[0] ?? "Client",
        phone: isStaff(user) || myProfile ? client?.phone : undefined,
      },
      quotes: quotesOut,
      messages,
      isOwner: request.userId === user._id,
      myProfileId: myProfile?._id ?? null,
      canReview,
      alreadyReviewed: existingReview.some(
        (r: Doc<"promarketReviews">) => r.userId === user._id,
      ),
    };
  },
});

/** Création d'une demande de service / de devis (publiée ou adressée). */
export const createRequest = mutation({
  args: {
    kind: v.union(v.literal("service"), v.literal("quote"), v.literal("ai")),
    trade: v.string(),
    title: v.string(),
    description: v.string(),
    region: v.string(),
    city: v.optional(v.string()),
    address: v.optional(v.string()),
    budget: v.optional(v.number()),
    deadline: v.optional(v.string()),
    urgent: v.optional(v.boolean()),
    homeService: v.optional(v.boolean()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    preferences: v.optional(v.string()),
    professionalId: v.optional(v.id("promarketProfiles")),
    projectId: v.optional(v.id("projects")),
    attachments: v.optional(v.array(attachmentValidator)),
    source: v.optional(
      v.union(
        v.literal("search"),
        v.literal("profile"),
        v.literal("project"),
        v.literal("ai"),
      ),
    ),
    aiQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const title = args.title.trim();
    const description = args.description.trim();
    if (title.length < 3) {
      throw new ConvexError("Le titre doit contenir au moins 3 caractères.");
    }
    if (description.length < 10) {
      throw new ConvexError("Décrivez votre besoin en au moins 10 caractères.");
    }
    if (!args.trade) throw new ConvexError("Choisissez le type de service.");
    if (!args.region) throw new ConvexError("Indiquez la localisation des travaux.");
    if ((args.attachments?.length ?? 0) > MAX_ATTACHMENTS) {
      throw new ConvexError(`Maximum ${MAX_ATTACHMENTS} pièces jointes.`);
    }
    if (args.budget !== undefined && (args.budget < 0 || args.budget > 1_000_000_000)) {
      throw new ConvexError("Budget indicatif invalide.");
    }
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || project.userId !== user._id) {
        throw new ConvexError("Projet introuvable.");
      }
    }

    // RÈGLE D'ACCÈS PROFESSIONNELS : une demande ne peut viser qu'un Expert
    // BatiBuild actif et éligible. Une fiche de démonstration (sans compte) ne
    // reçoit jamais de demande : celle-ci est PUBLIÉE et distribuée aux
    // Experts éligibles du métier.
    let target: Doc<"promarketProfiles"> | null = null;
    if (args.professionalId) {
      const candidate = await ctx.db.get(args.professionalId);
      if (!candidate || candidate.status !== "active") {
        throw new ConvexError("Professionnel indisponible.");
      }
      const expert = candidate.expertProfileId
        ? await ctx.db.get(candidate.expertProfileId)
        : null;
      const eligibility = await evaluateExpertForProMarket(ctx, expert);
      if (!candidate.demo && !eligibility.eligible) {
        throw new ConvexError(
          "Ce professionnel n'est plus disponible sur ProMarket.",
        );
      }
      target = candidate.demo ? null : candidate;
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("promarketRequests", {
      userId: user._id,
      professionalId: target?._id,
      projectId: args.projectId,
      kind: args.kind,
      trade: args.trade,
      category: categoryForTrade(args.trade),
      title,
      description,
      region: args.region,
      city: args.city?.trim(),
      address: args.address?.trim(),
      budget: args.budget,
      deadline: args.deadline?.trim(),
      urgent: args.urgent ?? false,
      homeService: args.homeService ?? false,
      phone: args.phone?.trim() ?? user.phone,
      email: args.email?.trim() ?? user.email,
      preferences: args.preferences?.trim(),
      attachments: args.attachments,
      status: target ? "quote_requested" : "new",
      source: args.source ?? (target ? "profile" : "search"),
      aiQuery: args.aiQuery,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    });

    const tradeLabel = promarketTradeLabel(args.trade);
    const link = `/promarket/request/${requestId}`;

    if (target?.userId) {
      await notify(ctx, {
        userId: target.userId,
        type: "promarket_new_request",
        title: `Nouvelle demande : ${tradeLabel}`,
        message: `${title} — ${promarketRegionLabel(args.region)}${
          args.urgent ? " (urgent)" : ""
        }`,
        link,
      });
    } else {
      // Demande publiée : seuls les professionnels du métier sont notifiés.
      await notifyProfessionalsByTrade(
        ctx,
        args.trade,
        {
          title: `Nouvelle demande : ${tradeLabel}`,
          message: `${title} — ${promarketRegionLabel(args.region)}`,
          link,
        },
        user._id,
      );
    }

    return requestId;
  },
});

/** Mise à jour du statut d'une demande (client, professionnel concerné, staff). */
export const updateRequestStatus = mutation({
  args: { requestId: v.id("promarketRequests"), status: requestStatusValidator },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new ConvexError("Demande introuvable");
    const { allowed, profile } = await canViewRequest(ctx, user, request);
    if (!allowed) throw new ConvexError("Accès refusé à cette demande");
    if (!isStaff(user) && request.userId !== user._id && !profile) {
      throw new ConvexError("Vous ne pouvez pas modifier cette demande");
    }
    const now = Date.now();
    await ctx.db.patch(args.requestId, {
      status: args.status,
      updatedAt: now,
      lastActivityAt: now,
    });
    if (profile && !isStaff(user)) {
      await notify(ctx, {
        userId: request.userId,
        type: "promarket_message",
        title: "Mise à jour de votre demande",
        message: `${profile.displayName} a mis à jour le statut de la demande.`,
        link: `/promarket/request/${request._id}`,
      });
    }
    return null;
  },
});

/** Message dans la conversation d'une demande. */
export const sendRequestMessage = mutation({
  args: {
    requestId: v.id("promarketRequests"),
    body: v.string(),
    attachments: v.optional(v.array(attachmentValidator)),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const body = args.body.trim();
    if (!body && !(args.attachments?.length ?? 0)) {
      throw new ConvexError("Le message est vide.");
    }
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new ConvexError("Demande introuvable");
    const { allowed, profile } = await canViewRequest(ctx, user, request);
    if (!allowed) throw new ConvexError("Accès refusé à cette conversation");
    if (request.status === "canceled") {
      throw new ConvexError("Cette demande a été annulée.");
    }
    if ((args.attachments?.length ?? 0) > MAX_ATTACHMENTS) {
      throw new ConvexError(`Maximum ${MAX_ATTACHMENTS} pièces jointes.`);
    }

    const isOwner = request.userId === user._id;
    const senderRole: "client" | "professional" =
      !isOwner && (profile || isStaff(user)) ? "professional" : "client";

    const now = Date.now();
    await ctx.db.insert("promarketMessages", {
      requestId: args.requestId,
      senderId: user._id,
      senderRole,
      body,
      attachments: args.attachments,
      createdAt: now,
    });

    // Le statut avance automatiquement au premier échange.
    const nextStatus =
      request.status === "new" || request.status === "quote_requested"
        ? "contact"
        : request.status;
    await ctx.db.patch(args.requestId, {
      status: nextStatus,
      lastActivityAt: now,
      updatedAt: now,
    });

    if (isOwner) {
      if (request.professionalId) {
        const target = await ctx.db.get(request.professionalId);
        if (target?.userId) {
          await notify(ctx, {
            userId: target.userId,
            type: "promarket_message",
            title: "Nouveau message ProMarket",
            message: body.slice(0, 120),
            link: `/promarket/request/${request._id}`,
          });
        }
      }
    } else {
      await notify(ctx, {
        userId: request.userId,
        type: "promarket_message",
        title: "Nouveau message d'un professionnel",
        message: body.slice(0, 120),
        link: `/promarket/request/${request._id}`,
      });
    }
    return null;
  },
});

/** Marque les messages reçus comme lus. */
export const markRequestMessagesRead = mutation({
  args: { requestId: v.id("promarketRequests") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) return null;
    const { allowed } = await canViewRequest(ctx, user, request);
    if (!allowed) return null;
    const messages = await ctx.db
      .query("promarketMessages")
      .withIndex("by_request", (q: any) => q.eq("requestId", args.requestId))
      .take(300);
    const now = Date.now();
    for (const m of messages) {
      if (!m.readAt && m.senderId !== user._id) {
        await ctx.db.patch(m._id, { readAt: now });
      }
    }
    return null;
  },
});

/** Envoi d'un devis par un professionnel éligible. */
export const createQuote = mutation({
  args: {
    requestId: v.id("promarketRequests"),
    price: v.number(),
    delayDays: v.optional(v.number()),
    description: v.string(),
    conditions: v.optional(v.string()),
    availability: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new ConvexError("Demande introuvable");
    if (request.status === "canceled" || request.status === "done") {
      throw new ConvexError("Cette demande n'accepte plus de devis.");
    }
    const profile = await canQuoteRequest(ctx, user, request);
    if (!profile) {
      throw new ConvexError(
        "Seuls les professionnels concernés peuvent envoyer un devis.",
      );
    }
    if (!Number.isFinite(args.price) || args.price <= 0 || args.price > 100_000_000) {
      throw new ConvexError("Montant du devis invalide.");
    }
    if (args.description.trim().length < 5) {
      throw new ConvexError("Décrivez votre offre en quelques mots.");
    }
    if (args.delayDays !== undefined && (args.delayDays < 0 || args.delayDays > 3650)) {
      throw new ConvexError("Délai invalide.");
    }

    const existing = await ctx.db
      .query("promarketQuotes")
      .withIndex("by_request", (q: any) => q.eq("requestId", args.requestId))
      .collect();
    if (existing.some((q: Doc<"promarketQuotes">) => q.professionalId === profile._id)) {
      throw new ConvexError("Vous avez déjà envoyé un devis pour cette demande.");
    }

    const now = Date.now();
    const quoteId = await ctx.db.insert("promarketQuotes", {
      requestId: args.requestId,
      professionalId: profile._id,
      professionalUserId: user._id,
      clientUserId: request.userId,
      price: Math.round(args.price),
      delayDays:
        args.delayDays !== undefined ? Math.round(args.delayDays) : undefined,
      description: args.description.trim(),
      conditions: args.conditions?.trim(),
      availability: args.availability,
      status: "sent",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.requestId, {
      professionalId: request.professionalId ?? profile._id,
      status: "quote_received",
      lastActivityAt: now,
      updatedAt: now,
    });

    await notify(ctx, {
      userId: request.userId,
      type: "promarket_quote",
      title: "Nouveau devis reçu",
      message: `${profile.displayName} vous a envoyé un devis de ${Math.round(
        args.price,
      )} TND pour « ${request.title} ».`,
      link: `/promarket/request/${request._id}`,
    });

    return quoteId;
  },
});

/** Acceptation / refus d'un devis par le client. */
export const respondToQuote = mutation({
  args: { quoteId: v.id("promarketQuotes"), accept: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const quote = await ctx.db.get(args.quoteId);
    if (!quote) throw new ConvexError("Devis introuvable");
    if (quote.clientUserId !== user._id && !isStaff(user)) {
      throw new ConvexError("Seul le client peut répondre à ce devis");
    }
    const request = await ctx.db.get(quote.requestId);
    const now = Date.now();
    await ctx.db.patch(args.quoteId, {
      status: args.accept ? "accepted" : "refused",
      updatedAt: now,
    });

    if (args.accept) {
      const others = await ctx.db
        .query("promarketQuotes")
        .withIndex("by_request", (q: any) => q.eq("requestId", quote.requestId))
        .collect();
      for (const other of others) {
        if (other._id !== quote._id && other.status === "sent") {
          await ctx.db.patch(other._id, { status: "refused", updatedAt: now });
        }
      }
      if (request) {
        await ctx.db.patch(request._id, {
          professionalId: quote.professionalId,
          status: "accepted",
          updatedAt: now,
          lastActivityAt: now,
        });
      }
      const profile = await ctx.db.get(quote.professionalId);
      if (profile) {
        await ctx.db.patch(profile._id, {
          completedCount: (profile.completedCount ?? 0) + 1,
          updatedAt: now,
        });
      }
    } else if (request) {
      await ctx.db.patch(request._id, { updatedAt: now, lastActivityAt: now });
    }

    if (quote.professionalUserId) {
      await notify(ctx, {
        userId: quote.professionalUserId,
        type: "promarket_quote",
        title: args.accept ? "Devis accepté" : "Devis refusé",
        message: args.accept
          ? "Votre devis a été accepté. Contactez le client pour planifier l'intervention."
          : "Votre devis n'a pas été retenu pour cette demande.",
        link: `/promarket/request/${quote.requestId}`,
      });
    }
    return null;
  },
});

/** Avis client — uniquement après une intervention acceptée ou terminée. */
export const createReview = mutation({
  args: {
    professionalId: v.id("promarketProfiles"),
    requestId: v.optional(v.id("promarketRequests")),
    rating: v.number(),
    quality: v.number(),
    punctuality: v.number(),
    professionalism: v.number(),
    value: v.number(),
    communication: v.number(),
    comment: v.optional(v.string()),
    photos: v.optional(
      v.array(v.object({ storageId: v.id("_storage"), name: v.optional(v.string()) })),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const profile = await ctx.db.get(args.professionalId);
    if (!profile) throw new ConvexError("Professionnel introuvable");

    const criteria = [
      args.rating,
      args.quality,
      args.punctuality,
      args.professionalism,
      args.value,
      args.communication,
    ];
    if (criteria.some((r) => !Number.isFinite(r) || r < 1 || r > 5)) {
      throw new ConvexError("Les notes doivent être comprises entre 1 et 5.");
    }

    const requests = await ctx.db
      .query("promarketRequests")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .take(200);
    const eligible = requests.find(
      (r: Doc<"promarketRequests">) =>
        r.professionalId === args.professionalId &&
        ["accepted", "in_progress", "done"].includes(r.status) &&
        (!args.requestId || r._id === args.requestId),
    );
    if (!eligible) {
      throw new ConvexError(
        "Vous ne pouvez laisser un avis qu'après une intervention avec ce professionnel.",
      );
    }

    const already = await ctx.db
      .query("promarketReviews")
      .withIndex("by_request", (q: any) => q.eq("requestId", eligible._id))
      .collect();
    if (already.some((r: Doc<"promarketReviews">) => r.userId === user._id)) {
      throw new ConvexError("Vous avez déjà laissé un avis pour cette intervention.");
    }
    if (args.comment && args.comment.length > 2000) {
      throw new ConvexError("Le commentaire est trop long (2 000 caractères max).");
    }

    const now = Date.now();
    const reviewId = await ctx.db.insert("promarketReviews", {
      professionalId: args.professionalId,
      userId: user._id,
      requestId: eligible._id,
      rating: Math.round(args.rating * 10) / 10,
      quality: args.quality,
      punctuality: args.punctuality,
      professionalism: args.professionalism,
      value: args.value,
      communication: args.communication,
      comment: args.comment?.trim(),
      photos: args.photos?.slice(0, 6),
      // Modération : un avis n'est publié qu'après validation admin.
      status: "pending",
      demo: false,
      createdAt: now,
      updatedAt: now,
    });

    if (profile.userId) {
      await notify(ctx, {
        userId: profile.userId,
        type: "promarket_review",
        title: "Nouvel avis reçu",
        message: `Un client a laissé un avis de ${
          Math.round(args.rating * 10) / 10
        }/5. Il sera publié après modération.`,
        link: "/promarket/pro-space",
      });
    }
    return reviewId;
  },
});

/** Signalement d'une fiche, d'un avis ou d'une demande. */
export const reportTarget = mutation({
  args: {
    targetType: v.union(
      v.literal("professional"),
      v.literal("review"),
      v.literal("request"),
    ),
    targetId: v.string(),
    targetLabel: v.optional(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const reason = args.reason.trim();
    if (reason.length < 5) {
      throw new ConvexError("Précisez la raison du signalement (5 caractères min).");
    }
    const existing = await ctx.db
      .query("promarketReports")
      .withIndex("by_reporter", (q: any) => q.eq("reporterId", user._id))
      .collect();
    if (
      existing.some(
        (r: Doc<"promarketReports">) =>
          r.targetId === args.targetId && r.status === "pending",
      )
    ) {
      throw new ConvexError("Vous avez déjà signalé ce contenu.");
    }
    await ctx.db.insert("promarketReports", {
      targetType: args.targetType,
      targetId: args.targetId,
      targetLabel: args.targetLabel,
      reporterId: user._id,
      reason,
      status: "pending",
      createdAt: Date.now(),
    });
    return null;
  },
});

// ----------------------------------------------------------------------------
// Données de démonstration
// ----------------------------------------------------------------------------

/**
 * Amorce ProMarket (catégories + fiches de démonstration) quand la base est
 * vide. Toutes les fiches créées sont explicitement marquées `demo: true` et
 * ne portent aucun badge de vérification.
 */
export const ensureDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const now = Date.now();

    const existingCategories = await ctx.db.query("promarketCategories").take(1);
    if (existingCategories.length === 0) {
      let order = 0;
      for (const category of PROMARKET_CATEGORIES) {
        await ctx.db.insert("promarketCategories", {
          slug: category.slug,
          label: category.label,
          icon: category.icon,
          description: category.description,
          order: order++,
          active: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    const existingProfiles = await ctx.db.query("promarketProfiles").take(1);
    if (existingProfiles.length > 0) {
      return { seeded: false, professionals: 0, reviews: 0 };
    }

    const idsByName = new Map<string, Id<"promarketProfiles">>();
    for (const seed of DEMO_PROFESSIONALS) {
      const id = await ctx.db.insert(
        "promarketProfiles",
        buildDemoProfileDoc(seed, now),
      );
      idsByName.set(seed.name, id);
    }

    let reviews = 0;
    for (const review of DEMO_REVIEWS) {
      const professionalId = idsByName.get(review.professional);
      if (!professionalId) continue;
      const createdAt = now - review.daysAgo * 24 * 3600 * 1000;
      await ctx.db.insert("promarketReviews", {
        professionalId,
        rating: review.rating,
        quality: review.rating,
        punctuality: review.rating,
        professionalism: review.rating,
        value: review.rating,
        communication: review.rating,
        comment: review.comment,
        authorName: review.author,
        status: "approved",
        demo: true,
        createdAt,
        updatedAt: createdAt,
      });
      reviews++;
    }

    return { seeded: true, professionals: idsByName.size, reviews };
  },
});
