import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { subscriptionPlanValidator, SUBSCRIPTION_PLANS } from "./schema";

// ============================================================================
// Queries
// ============================================================================

/** Get current user's subscription */
export const getMySubscription = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    return subscription;
  },
});

/** Get all subscriptions (admin only) */
export const getAllSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized");
    }
    return await ctx.db.query("subscriptions").order("desc").collect();
  },
});

// ============================================================================
// Download Limit Helpers
// ============================================================================

/** Check if the current user can download a PDF */
export const checkDownloadAllowed = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { allowed: false, reason: "non_connecté" };

    // Pro users get 10 downloads per month
    if (user.subscriptionPlan === "pro") {
      const sub = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("desc")
        .first();

      if (!sub || sub.status !== "active") {
        return { allowed: false, reason: "abonnement_inactif" };
      }

      const limit = sub.downloadLimit ?? 10;
      const used = sub.monthlyDownloadCount ?? 0;
      const remaining = limit - used;

      return {
        allowed: remaining > 0,
        reason: remaining > 0 ? "ok" : "limite_atteinte",
        remaining,
        limit,
        used,
      };
    }

    // Free users cannot download PDFs
    return { allowed: false, reason: "offre_gratuite", remaining: 0, limit: 0, used: 0 };
  },
});

/** Consume one download (call after successful PDF generation) */
export const consumeDownload = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.subscriptionPlan !== "pro") {
      throw new Error("Seuls les abonnés Pro peuvent télécharger des devis");
    }

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (!sub || sub.status !== "active") {
      throw new Error("Abonnement inactif");
    }

    const used = (sub.monthlyDownloadCount ?? 0) + 1;
    await ctx.db.patch(sub._id, {
      monthlyDownloadCount: used,
      updatedAt: Date.now(),
    });

    return { used, remaining: (sub.downloadLimit ?? 10) - used };
  },
});

// ============================================================================
// Mutations
// ============================================================================

/** Create or update subscription */
export const createSubscription = mutation({
  args: {
    plan: subscriptionPlanValidator,
    paymentMethod: v.optional(v.string()),
    paymentId: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const now = Date.now();

    const planConfig: Record<string, { duration: number; limit: number }> = {
      free: { duration: 365 * 24 * 60 * 60 * 1000, limit: 0 },
      pro: { duration: 30 * 24 * 60 * 60 * 1000, limit: 10 },
    };

    const config = planConfig[args.plan] || planConfig.free;

    // Cancel existing active subscriptions
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const sub of existing) {
      if (sub.status === "active") {
        await ctx.db.patch(sub._id, { status: "canceled", updatedAt: now });
      }
    }

    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId: user._id,
      plan: args.plan,
      status: args.paymentMethod === "bank_transfer" ? "pending" : "active",
      startDate: now,
      endDate: now + config.duration,
      paymentMethod: args.paymentMethod,
      paymentId: args.paymentId,
      amount: args.amount,
      currency: args.currency || "TND",
      monthlyDownloadCount: 0,
      downloadLimit: config.limit,
      createdAt: now,
      updatedAt: now,
    });

    // Update user's subscription plan (only if not pending)
    if (args.paymentMethod !== "bank_transfer") {
      await ctx.db.patch(user._id, {
        subscriptionPlan: args.plan,
        subscriptionEndDate: now + config.duration,
      });
    }

    return subscriptionId;
  },
});

/** Cancel subscription */
export const cancelSubscription = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const activeSub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (activeSub && activeSub.status === "active") {
      await ctx.db.patch(activeSub._id, {
        status: "canceled",
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(user._id, {
      subscriptionPlan: SUBSCRIPTION_PLANS.FREE,
    });
  },
});

/** Update user subscription plan (admin only) */
export const adminUpdateSubscription = mutation({
  args: {
    userId: v.id("users"),
    plan: subscriptionPlanValidator,
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    await ctx.db.patch(args.userId, {
      subscriptionPlan: args.plan,
    });
  },
});
