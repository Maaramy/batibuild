import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ── Supplier Ratings ────────────────────────────────────────────────────────

/** Rate a supplier (1-5). One rating per user per supplier — updates if exists. */
export const rateSupplier = mutation({
  args: {
    supplierId: v.id("supplierProfiles"),
    rating: v.number(),
    projectId: v.optional(v.id("projects")),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.rating < 1 || args.rating > 5) throw new Error("La note doit être entre 1 et 5");
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");

    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) throw new Error("Fournisseur introuvable");

    // Check if user already rated this supplier
    const existing = await ctx.db
      .query("supplierRatings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const dupe = existing.find((r) => r.supplierId === args.supplierId);

    if (dupe) {
      await ctx.db.patch(dupe._id, {
        rating: args.rating,
        comment: args.comment ?? dupe.comment,
        projectId: args.projectId ?? dupe.projectId,
      });
      return { success: true, updated: true, ratingId: dupe._id };
    }

    const ratingId = await ctx.db.insert("supplierRatings", {
      supplierId: args.supplierId,
      userId: user._id,
      rating: args.rating,
      projectId: args.projectId,
      comment: args.comment,
      createdAt: Date.now(),
    });
    return { success: true, updated: false, ratingId };
  },
});

/** Get average rating for a supplier */
export const getSupplierAverage = query({
  args: { supplierId: v.id("supplierProfiles") },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("supplierRatings")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .collect();
    if (ratings.length === 0) return { avg: 0, count: 0 };
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return { avg: Math.round((sum / ratings.length) * 10) / 10, count: ratings.length };
  },
});

/** Get user's rating for a supplier (or null) */
export const getMySupplierRating = query({
  args: { supplierId: v.id("supplierProfiles") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const ratings = await ctx.db
      .query("supplierRatings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return ratings.find((r) => r.supplierId === args.supplierId) ?? null;
  },
});

// ── Expert Ratings ──────────────────────────────────────────────────────────

/** Rate an expert (1-5). One rating per user per expert — updates if exists. */
export const rateExpert = mutation({
  args: {
    expertId: v.id("expertProfiles"),
    rating: v.number(),
    projectId: v.optional(v.id("projects")),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.rating < 1 || args.rating > 5) throw new Error("La note doit être entre 1 et 5");
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");

    const expert = await ctx.db.get(args.expertId);
    if (!expert) throw new Error("Expert introuvable");

    // Check if user already rated this expert
    const existing = await ctx.db
      .query("expertRatings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const dupe = existing.find((r) => r.expertId === args.expertId);

    if (dupe) {
      await ctx.db.patch(dupe._id, {
        rating: args.rating,
        comment: args.comment ?? dupe.comment,
        projectId: args.projectId ?? dupe.projectId,
      });
      return { success: true, updated: true, ratingId: dupe._id };
    }

    const ratingId = await ctx.db.insert("expertRatings", {
      expertId: args.expertId,
      userId: user._id,
      rating: args.rating,
      projectId: args.projectId,
      comment: args.comment,
      createdAt: Date.now(),
    });
    return { success: true, updated: false, ratingId };
  },
});

/** Get average rating for an expert */
export const getExpertAverage = query({
  args: { expertId: v.id("expertProfiles") },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("expertRatings")
      .withIndex("by_expert", (q) => q.eq("expertId", args.expertId))
      .collect();
    if (ratings.length === 0) return { avg: 0, count: 0 };
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return { avg: Math.round((sum / ratings.length) * 10) / 10, count: ratings.length };
  },
});

/** Get user's rating for an expert (or null) */
export const getMyExpertRating = query({
  args: { expertId: v.id("expertProfiles") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const ratings = await ctx.db
      .query("expertRatings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return ratings.find((r) => r.expertId === args.expertId) ?? null;
  },
});

/** Get all ratings for a supplier (for profile detail page) */
export const getSupplierRatings = query({
  args: { supplierId: v.id("supplierProfiles") },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("supplierRatings")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .order("desc")
      .collect();
    // Enrich with user names
    const enriched = await Promise.all(
      ratings.map(async (r) => {
        const user = await ctx.db.get(r.userId);
        return { ...r, userName: user?.name ?? "Anonyme" };
      }),
    );
    return enriched;
  },
});

/** Get all ratings for an expert (for profile detail page) */
export const getExpertRatings = query({
  args: { expertId: v.id("expertProfiles") },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("expertRatings")
      .withIndex("by_expert", (q) => q.eq("expertId", args.expertId))
      .order("desc")
      .collect();
    const enriched = await Promise.all(
      ratings.map(async (r) => {
        const user = await ctx.db.get(r.userId);
        return { ...r, userName: user?.name ?? "Anonyme" };
      }),
    );
    return enriched;
  },
});
