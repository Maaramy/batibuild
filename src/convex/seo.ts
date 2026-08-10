import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ============================================================================
// Default SEO Configuration
// ============================================================================

export const DEFAULT_SEO_CONFIG = {
  siteName: "batibuild App - Estimation Construction Tunisie",
  siteDescription: "Estimation de coûts de construction par IA pour la Tunisie. Devis, matériaux, main-d'œuvre aux prix tunisiens 2026.",
  keywords: "estimation construction Tunisie, devis bâtiment Tunisie, coût construction Tunisie, prix matériaux construction Tunisie 2026, BIM Tunisie, batibuild App, devis maison Tunisie",
  ogTitle: "batibuild App - Estimation Construction par IA en Tunisie",
  ogDescription: "Obtenez une estimation instantanée de vos projets de construction en Tunisie. Analyse IA, devis détaillé, prix tunisiens 2026.",
  twitterCard: "summary_large_image",
} as const;

// ============================================================================
// Queries
// ============================================================================

/** Get the current SEO configuration (public - no auth needed) */
export const getSeoConfig = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query("seoConfig").order("desc").take(1);
    return configs[0] ?? null;
  },
});

/** Get default SEO configuration for SSR / fallback */
export const getSeoConfigOrDefault = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query("seoConfig").order("desc").take(1);
    if (configs[0]) return configs[0];
    return {
      siteName: DEFAULT_SEO_CONFIG.siteName,
      siteDescription: DEFAULT_SEO_CONFIG.siteDescription,
      keywords: DEFAULT_SEO_CONFIG.keywords,
      ogTitle: DEFAULT_SEO_CONFIG.ogTitle,
      ogDescription: DEFAULT_SEO_CONFIG.ogDescription,
      ogImage: "",
      twitterCard: DEFAULT_SEO_CONFIG.twitterCard,
      canonicalUrl: "",
      googleAnalyticsId: "",
      robotsTxt: "",
      additionalMetaTags: "",
      googleSiteVerification: "",
      blogTitle: "Blog batibuild App — Construction & Rénovation en Tunisie",
      blogDescription: "Conseils, guides et actualités sur la construction et la rénovation en Tunisie : prix des matériaux, étapes de chantier, financement et astuces d'experts.",
      blogOgImage: "",
    };
  },
});

// ============================================================================
// Mutations
// ============================================================================

/** Save or update SEO configuration (admin only) */
export const saveSeoConfig = mutation({
  args: {
    siteName: v.string(),
    siteDescription: v.string(),
    keywords: v.string(),
    ogTitle: v.string(),
    ogDescription: v.string(),
    ogImage: v.optional(v.string()),
    twitterCard: v.optional(v.string()),
    canonicalUrl: v.optional(v.string()),
    googleAnalyticsId: v.optional(v.string()),
    robotsTxt: v.optional(v.string()),
    additionalMetaTags: v.optional(v.string()),
    googleSiteVerification: v.optional(v.string()),
    blogTitle: v.optional(v.string()),
    blogDescription: v.optional(v.string()),
    blogOgImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const now = Date.now();
    const existing = await ctx.db.query("seoConfig").order("desc").take(1);

    const data = {
      ...args,
      ogImage: args.ogImage ?? "",
      twitterCard: args.twitterCard ?? "summary_large_image",
      canonicalUrl: args.canonicalUrl ?? "",
      googleAnalyticsId: args.googleAnalyticsId ?? "",
      robotsTxt: args.robotsTxt ?? "",
      additionalMetaTags: args.additionalMetaTags ?? "",
      googleSiteVerification: args.googleSiteVerification ?? "",
      blogTitle: args.blogTitle ?? "",
      blogDescription: args.blogDescription ?? "",
      blogOgImage: args.blogOgImage ?? "",
      updatedAt: now,
      updatedBy: user._id,
    };

    if (existing[0]) {
      await ctx.db.patch(existing[0]._id, data);
      return { id: existing[0]._id, action: "updated" };
    }

    const id = await ctx.db.insert("seoConfig", data);
    return { id, action: "created" };
  },
});

/** Delete SEO configuration (admin only) - revert to defaults */
export const deleteSeoConfig = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const existing = await ctx.db.query("seoConfig").order("desc").take(1);
    if (existing[0]) {
      await ctx.db.delete(existing[0]._id);
    }
    return { success: true };
  },
});
