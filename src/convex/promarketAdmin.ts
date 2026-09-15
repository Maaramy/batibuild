import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { getFreePlanStatus } from "./access";
import {
  avgRating,
  isStaff,
  notify,
  profileStatusValidator,
  publicProfile,
  requestStatusValidator,
  requestSummary,
  requireStaff,
  reviewStatusValidator,
} from "./promarketShared";
import {
  evaluateExpertForProMarket,
  proMarketTradeForExpert,
  syncProMarketProfileFromExpert,
} from "./proMarketAccess";
import { promarketTradeLabel, normalizeProMarketText } from "../lib/promarketMeta";

// ============================================================================
// ProMarket — administration (modération, vérification, statistiques)
//
// Toutes les fonctions de ce module exigent le rôle `admin` ou `moderator`
// (vérifié côté serveur). Les badges de vérification ne peuvent être attribués
// QUE par ici : aucune fiche ne s'auto-vérifie.
// ============================================================================

// ----------------------------------------------------------------------------
// Fiches professionnelles
// ----------------------------------------------------------------------------

export const adminListProfessionals = query({
  args: {
    status: v.optional(profileStatusValidator),
    demoOnly: v.optional(v.boolean()),
    q: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const rows = args.status
      ? await ctx.db
          .query("promarketProfiles")
          .withIndex("by_status", (q: any) => q.eq("status", args.status))
          .order("desc")
          .take(300)
      : await ctx.db.query("promarketProfiles").order("desc").take(300);

    const needle = args.q ? normalizeProMarketText(args.q) : "";
    return rows
      .filter((p: Doc<"promarketProfiles">) => {
        if (args.demoOnly !== undefined && p.demo !== args.demoOnly) return false;
        if (!needle) return true;
        return normalizeProMarketText(
          `${p.displayName} ${p.companyName ?? ""} ${p.city} ${p.region} ${promarketTradeLabel(p.trade)}`,
        ).includes(needle);
      })
      .slice(0, 200)
      .map((p: Doc<"promarketProfiles">) => ({
        ...publicProfile(p, null),
        phone: p.phone,
        email: p.email,
        // Les coordonnées restent visibles pour l'administration.
        hasAccount: Boolean(p.userId),
        // Règle d'accès : une fiche réelle DOIT être adossée à un compte Expert.
        // `linkedToExpert: false` signale une fiche historique à retirer.
        linkedToExpert: Boolean(p.expertProfileId),
      }));
  },
});

/** Validation / suspension d'une fiche professionnelle. */
export const adminSetProfessionalStatus = mutation({
  args: {
    professionalId: v.id("promarketProfiles"),
    status: profileStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const profile = await ctx.db.get(args.professionalId);
    if (!profile) throw new ConvexError("Professionnel introuvable");
    await ctx.db.patch(args.professionalId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    if (profile.userId && args.status === "active") {
      await notify(ctx, {
        userId: profile.userId,
        type: "promarket_verified",
        title: "Fiche ProMarket validée",
        message: "Votre fiche est désormais visible dans ProMarket.",
        link: "/promarket/pro-space",
      });
    }
    if (profile.userId && args.status === "suspended") {
      await notify(ctx, {
        userId: profile.userId,
        type: "promarket_verified",
        title: "Fiche ProMarket suspendue",
        message:
          "Votre fiche a été suspendue. Contactez le support BatiBuild pour plus d'informations.",
        link: "/dashboard/support",
      });
    }
    return null;
  },
});

/**
 * Attribution des badges de vérification (identité, professionnel, documents,
 * « Recommandé BatiBuild ») — exclusivement réservée à l'administration.
 */
export const adminSetBadges = mutation({
  args: {
    professionalId: v.id("promarketProfiles"),
    verifiedIdentity: v.optional(v.boolean()),
    verifiedPro: v.optional(v.boolean()),
    verifiedDocs: v.optional(v.boolean()),
    recommended: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const profile = await ctx.db.get(args.professionalId);
    if (!profile) throw new ConvexError("Professionnel introuvable");
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const key of [
      "verifiedIdentity",
      "verifiedPro",
      "verifiedDocs",
      "recommended",
    ] as const) {
      if (args[key] !== undefined) patch[key] = args[key];
    }
    await ctx.db.patch(args.professionalId, patch);
    if (profile.userId && args.verifiedPro && !profile.verifiedPro) {
      await notify(ctx, {
        userId: profile.userId,
        type: "promarket_verified",
        title: "Badge « Professionnel vérifié » attribué",
        message:
          "Vos informations professionnelles ont été vérifiées par l'équipe BatiBuild.",
        link: "/promarket/pro-space",
      });
    }
    return null;
  },
});

// ----------------------------------------------------------------------------
// Experts BatiBuild sur ProMarket
//
// RÈGLE D'ACCÈS PROFESSIONNELS §4 — l'administrateur SUSPENDE ou RÉACTIVE
// l'accès ProMarket des Experts BatiBuild et suit leur activité (demandes,
// candidatures/devis, note moyenne). L'activation étant automatique, il n'y a
// plus de dossier « en attente de validation ». Aucune fiche ProMarket
// indépendante n'existe : les profils listés ici sont tous adossés à un compte
// Expert.
// ----------------------------------------------------------------------------

export const adminListProMarketExperts = query({
  args: {
    bucket: v.optional(
      v.union(
        v.literal("all"),
        v.literal("eligible"),
        v.literal("active"),
        v.literal("pending"),
        v.literal("disabled"),
        v.literal("incomplete"),
      ),
    ),
    q: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);

    const experts = await ctx.db.query("expertProfiles").take(500);
    const needle = args.q ? normalizeProMarketText(args.q) : "";
    const bucket = args.bucket ?? "all";
    const free = await getFreePlanStatus(ctx);

    const rows = [];
    for (const expert of experts) {
      const user = expert.userId ? await ctx.db.get(expert.userId) : null;
      const eligibility = await evaluateExpertForProMarket(ctx, expert, free);
      const profile = await ctx.db
        .query("promarketProfiles")
        .withIndex("by_expert", (q: any) => q.eq("expertProfileId", expert._id))
        .first();

      const requests = profile
        ? await ctx.db
            .query("promarketRequests")
            .withIndex("by_professional", (q: any) =>
              q.eq("professionalId", profile._id),
            )
            .take(300)
        : [];
      const quotes = profile
        ? await ctx.db
            .query("promarketQuotes")
            .withIndex("by_professional", (q: any) =>
              q.eq("professionalId", profile._id),
            )
            .take(300)
        : [];

      const status = expert.proMarketStatus ?? null;
      // Activation automatique : il n'existe plus de dossier « en attente de
      // validation ». « pending » = suspension absente mais profil incomplet.
      const inBucket =
        bucket === "all"
          ? true
          : bucket === "eligible"
            ? eligibility.eligible
            : bucket === "active"
              ? eligibility.eligible && eligibility.available
              : bucket === "pending"
                ? !eligibility.eligible && status !== "disabled"
                : bucket === "disabled"
                  ? status === "disabled"
                  : eligibility.reasons.includes("incomplete_profile");
      if (!inBucket) continue;

      if (needle) {
        const hay = normalizeProMarketText(
          [
            expert.displayName,
            expert.companyName ?? "",
            user?.email ?? "",
            promarketTradeLabel(proMarketTradeForExpert(expert)),
          ].join(" "),
        );
        if (!hay.includes(needle)) continue;
      }

      rows.push({
        expertId: expert._id,
        userId: expert.userId,
        ownerName: user?.name ?? user?.email ?? "Expert",
        email: expert.email,
        displayName: expert.displayName,
        companyName: expert.companyName ?? null,
        profession: expert.profession,
        trade: proMarketTradeForExpert(expert),
        tradeLabel: promarketTradeLabel(proMarketTradeForExpert(expert)),
        regions: expert.regions ?? [],
        isVisible: expert.isVisible,
        available: expert.proMarketAvailable !== false,
        status,
        eligibility,
        profileId: profile?._id ?? null,
        acceptedContacts: profile?.contacts ?? 0,
        requestsReceived: requests.length,
        applications: quotes.length,
        jobsDone: requests.filter((r: Doc<"promarketRequests">) => r.status === "done")
          .length,
        rating: profile ? avgRating(profile) : 0,
        ratingCount: profile?.ratingCount ?? 0,
      });
    }

    return rows.sort((a, b) => b.requestsReceived - a.requestsReceived);
  },
});

/**
 * Suspension / réactivation ProMarket d'un Expert (administrateur).
 *
 * L'activation étant automatique, l'administration n'a plus qu'un pouvoir de
 * suspension : « disable » retire l'expert de ProMarket, « enable » le
 * republie (s'il remplit par ailleurs les conditions d'éligibilité).
 */
export const adminSetExpertProMarketStatus = mutation({
  args: {
    expertId: v.id("expertProfiles"),
    action: v.union(v.literal("disable"), v.literal("enable")),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const expert = await ctx.db.get(args.expertId);
    if (!expert) throw new ConvexError("Expert introuvable");

    const now = Date.now();
    // « enable » réactive l'accès (déjà automatique pour les profils complets) ;
    // « disable » le suspend. Le sync masque ou republie la fiche ProMarket en
    // conséquence.
    const patch =
      args.action === "enable"
        ? {
            proMarketStatus: "active" as const,
            proMarketOptIn: true,
            proMarketValidatedAt: now,
            updatedAt: now,
          }
        : {
            proMarketStatus: "disabled" as const,
            updatedAt: now,
          };

    await ctx.db.patch(expert._id, patch);
    const updated = await ctx.db.get(expert._id);
    const { profileId } = await syncProMarketProfileFromExpert(ctx, updated);

    if (expert.userId) {
      const published = args.action === "enable";
      await notify(ctx, {
        userId: expert.userId,
        type: "promarket_verified",
        title: published
          ? "ProMarket activé pour votre profil"
          : "ProMarket désactivé pour votre profil",
        message: published
          ? "Votre profil Expert est désormais visible sur ProMarket."
          : "L'administration a désactivé votre visibilité sur ProMarket.",
        link: "/promarket/pro-space",
      });
    }

    return { profileId, status: patch.proMarketStatus };
  },
});

/** Compteurs de pilotage (éligibles / actifs / en attente / désactivés). */
export const adminProMarketExpertCounts = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const experts = await ctx.db.query("expertProfiles").take(500);
    const free = await getFreePlanStatus(ctx);

    let eligible = 0;
    let active = 0;
    let pending = 0;
    let disabled = 0;
    for (const expert of experts) {
      const status = expert.proMarketStatus ?? null;
      if (status === "disabled") disabled++;
      const eligibility = await evaluateExpertForProMarket(ctx, expert, free);
      if (eligibility.eligible) {
        eligible++;
        if (eligibility.available) active++;
      } else if (status !== "disabled") {
        // Plus aucune validation administrative n'est attendue : ce compteur
        // ne représente que les profils encore incomplets.
        pending++;
      }
    }

    const profiles = await ctx.db.query("promarketProfiles").take(1000);
    return {
      totalExperts: experts.length,
      eligible,
      active,
      pending,
      disabled,
      publishedProfiles: profiles.filter(
        (p: Doc<"promarketProfiles">) => !p.demo && p.status === "active",
      ).length,
      demoProfiles: profiles.filter((p: Doc<"promarketProfiles">) => p.demo).length,
    };
  },
});

// ----------------------------------------------------------------------------
// Catégories (CRUD complet)
// ----------------------------------------------------------------------------

export const adminListCategories = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    return await ctx.db.query("promarketCategories").withIndex("by_order").take(100);
  },
});

export const adminUpsertCategory = mutation({
  args: {
    slug: v.string(),
    label: v.string(),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    order: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const slug = args.slug.trim().toLowerCase().replace(/\s+/g, "_");
    if (slug.length < 2) throw new ConvexError("Identifiant de catégorie invalide.");
    if (args.label.trim().length < 2) throw new ConvexError("Libellé invalide.");
    const now = Date.now();
    const existing = await ctx.db
      .query("promarketCategories")
      .withIndex("by_slug", (q: any) => q.eq("slug", slug))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        label: args.label.trim(),
        icon: args.icon ?? existing.icon,
        description: args.description ?? existing.description,
        order: args.order ?? existing.order,
        active: args.active ?? existing.active,
        updatedAt: now,
      });
      return existing._id;
    }
    const count = (await ctx.db.query("promarketCategories").take(100)).length;
    return await ctx.db.insert("promarketCategories", {
      slug,
      label: args.label.trim(),
      icon: args.icon ?? "Store",
      description: args.description,
      order: args.order ?? count,
      active: args.active ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const adminDeleteCategory = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const existing = await ctx.db
      .query("promarketCategories")
      .withIndex("by_slug", (q: any) => q.eq("slug", args.slug))
      .first();
    if (!existing) throw new ConvexError("Catégorie introuvable");
    await ctx.db.delete(existing._id);
    return null;
  },
});

// ----------------------------------------------------------------------------
// Demandes & litiges
// ----------------------------------------------------------------------------

export const adminListRequests = query({
  args: { status: v.optional(requestStatusValidator) },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const rows = args.status
      ? await ctx.db
          .query("promarketRequests")
          .withIndex("by_status", (q: any) => q.eq("status", args.status))
          .order("desc")
          .take(200)
      : await ctx.db.query("promarketRequests").order("desc").take(200);
    const out = [];
    for (const r of rows) {
      const client = await ctx.db.get(r.userId);
      const pro = r.professionalId ? await ctx.db.get(r.professionalId) : null;
      out.push({
        ...requestSummary(r),
        clientName: client?.name ?? client?.email ?? "Client",
        professionalName: pro?.displayName ?? null,
      });
    }
    return out;
  },
});

// ----------------------------------------------------------------------------
// Avis
// ----------------------------------------------------------------------------

export const adminListReviews = query({
  args: { status: v.optional(reviewStatusValidator) },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const rows = args.status
      ? await ctx.db
          .query("promarketReviews")
          .withIndex("by_status_created", (q: any) => q.eq("status", args.status))
          .order("desc")
          .take(200)
      : await ctx.db.query("promarketReviews").order("desc").take(200);

    const out = [];
    for (const r of rows) {
      const pro = await ctx.db.get(r.professionalId);
      const author = r.userId ? await ctx.db.get(r.userId) : null;
      out.push({
        ...r,
        professionalName: pro?.displayName ?? "",
        professionalTrade: pro ? promarketTradeLabel(pro.trade) : "",
        authorName:
          author?.name ?? author?.email ?? r.authorName ?? "Client",
      });
    }
    return out;
  },
});

/** Validation / masquage d'un avis + mise à jour des agrégats de note. */
export const adminModerateReview = mutation({
  args: {
    reviewId: v.id("promarketReviews"),
    status: v.union(v.literal("approved"), v.literal("hidden")),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new ConvexError("Avis introuvable");
    const profile = await ctx.db.get(review.professionalId);
    const wasApproved = review.status === "approved";
    const willApprove = args.status === "approved";

    await ctx.db.patch(args.reviewId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    // Les avis de démonstration ne modifient jamais les agrégats : ils sont
    // déjà intégrés aux compteurs de la fiche de démonstration.
    if (profile && !review.demo && wasApproved !== willApprove) {
      const delta = willApprove ? 1 : -1;
      await ctx.db.patch(profile._id, {
        ratingSum: Math.max(0, profile.ratingSum + delta * review.rating),
        ratingCount: Math.max(0, profile.ratingCount + delta),
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const adminDeleteReview = mutation({
  args: { reviewId: v.id("promarketReviews") },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review) return null;
    const profile = await ctx.db.get(review.professionalId);
    if (profile && review.status === "approved" && !review.demo) {
      await ctx.db.patch(profile._id, {
        ratingSum: Math.max(0, profile.ratingSum - review.rating),
        ratingCount: Math.max(0, profile.ratingCount - 1),
        updatedAt: Date.now(),
      });
    }
    for (const photo of review.photos ?? []) {
      try {
        await ctx.storage.delete(photo.storageId);
      } catch {
        // best-effort
      }
    }
    await ctx.db.delete(args.reviewId);
    return null;
  },
});

// ----------------------------------------------------------------------------
// Signalements
// ----------------------------------------------------------------------------

export const adminListReports = query({
  args: {
    status: v.optional(
      v.union(v.literal("pending"), v.literal("reviewed"), v.literal("dismissed")),
    ),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const rows = args.status
      ? await ctx.db
          .query("promarketReports")
          .withIndex("by_status_created", (q: any) => q.eq("status", args.status))
          .order("desc")
          .take(200)
      : await ctx.db
          .query("promarketReports")
          .withIndex("by_created")
          .order("desc")
          .take(200);
    return await Promise.all(
      rows.map(async (report: Doc<"promarketReports">) => {
        const reporter = await ctx.db.get(report.reporterId);
        return {
          ...report,
          reporterName: reporter?.name ?? reporter?.email ?? "Utilisateur",
        };
      }),
    );
  },
});

export const adminResolveReport = mutation({
  args: {
    reportId: v.id("promarketReports"),
    status: v.union(v.literal("reviewed"), v.literal("dismissed")),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError("Signalement introuvable");
    await ctx.db.patch(args.reportId, { status: args.status });
    return null;
  },
});

// ----------------------------------------------------------------------------
// Statistiques
// ----------------------------------------------------------------------------

export const adminStats = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const profiles = await ctx.db.query("promarketProfiles").take(1000);
    const requests = await ctx.db.query("promarketRequests").take(1000);
    const quotes = await ctx.db.query("promarketQuotes").take(1000);
    const reviews = await ctx.db.query("promarketReviews").take(1000);
    const reports = await ctx.db.query("promarketReports").take(1000);

    const byCategory = new Map<string, number>();
    const byRegion = new Map<string, number>();
    const byTrade = new Map<string, number>();
    for (const p of profiles) {
      byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + 1);
      byRegion.set(p.region, (byRegion.get(p.region) ?? 0) + 1);
      byTrade.set(p.trade, (byTrade.get(p.trade) ?? 0) + 1);
    }
    const top = (map: Map<string, number>) =>
      [...map.entries()]
        .map(([key, value]) => ({ key, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

    const rated = profiles.filter((p) => p.ratingCount > 0);
    const averageRating =
      rated.length === 0
        ? 0
        : Math.round(
            (rated.reduce((sum, p) => sum + avgRating(p), 0) / rated.length) * 10,
          ) / 10;

    const doneRequests = requests.filter((r) => r.status === "done").length;

    return {
      professionals: profiles.length,
      activeProfessionals: profiles.filter((p) => p.status === "active").length,
      pendingProfessionals: profiles.filter((p) => p.status === "pending").length,
      suspendedProfessionals: profiles.filter((p) => p.status === "suspended").length,
      verifiedProfessionals: profiles.filter((p) => p.verifiedPro).length,
      demoProfessionals: profiles.filter((p) => p.demo).length,
      requests: requests.length,
      openRequests: requests.filter(
        (r) => r.status !== "done" && r.status !== "canceled",
      ).length,
      doneRequests,
      quotes: quotes.length,
      acceptedQuotes: quotes.filter((q) => q.status === "accepted").length,
      conversionRate:
        requests.length === 0
          ? 0
          : Math.round((doneRequests / requests.length) * 100),
      reviews: reviews.length,
      pendingReviews: reviews.filter((r) => r.status === "pending").length,
      pendingReports: reports.filter((r) => r.status === "pending").length,
      averageRating,
      byCategory: top(byCategory),
      byRegion: top(byRegion),
      byTrade: top(byTrade),
    };
  },
});

/** Indicateur léger : l'utilisateur courant est-il staff ? (badges de menu) */
export const canModerate = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return isStaff(user);
  },
});
