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

/** Get all subscriptions (admin only, returns empty if not admin) */
export const getAllSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      return [];
    }
    return await ctx.db.query("subscriptions").order("desc").collect();
  },
});

/** Get all subscriptions with user info (admin only, returns empty if not admin) */
export const getAllSubscriptionsWithUsers = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      return [];
    }

    const subs = await ctx.db.query("subscriptions").order("desc").collect();

    const result = await Promise.all(
      subs.map(async (sub) => {
        const user = await ctx.db.get(sub.userId);
        return {
          ...sub,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
              }
            : null,
        };
      }),
    );

    return result;
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

/** Get pending subscriptions with user info (admin only, returns empty if not admin) */
export const getPendingSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      return [];
    }

    const pendingSubs = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    // Enrich with user info
    const result = await Promise.all(
      pendingSubs.map(async (sub) => {
        const user = await ctx.db.get(sub.userId);
        return {
          ...sub,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                company: user.company,
              }
            : null,
        };
      }),
    );

    return result;
  },
});

/** Approve a pending bank transfer subscription (admin only) */
export const adminApproveSubscription = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub) throw new Error("Abonnement introuvable");
    if (sub.status !== "pending") throw new Error("Cet abonnement n'est pas en attente");

    const now = Date.now();
    const planDuration = 30 * 24 * 60 * 60 * 1000; // 30 days

    // Update subscription to active
    await ctx.db.patch(args.subscriptionId, {
      status: "active",
      startDate: now,
      endDate: now + planDuration,
      updatedAt: now,
    });

    // Update user's plan
    await ctx.db.patch(sub.userId, {
      subscriptionPlan: "pro",
      subscriptionEndDate: now + planDuration,
    });

    return { success: true };
  },
});

/** Reject a pending bank transfer subscription (admin only) */
export const adminRejectSubscription = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub) throw new Error("Abonnement introuvable");
    if (sub.status !== "pending") throw new Error("Cet abonnement n'est pas en attente");

    await ctx.db.patch(args.subscriptionId, {
      status: "canceled",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
