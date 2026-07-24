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
    const planDurations: Record<string, number> = {
      free: 365 * 24 * 60 * 60 * 1000, // 1 year
      pro: 365 * 24 * 60 * 60 * 1000,
      enterprise: 365 * 24 * 60 * 60 * 1000,
    };

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
      status: "active",
      startDate: now,
      endDate: now + (planDurations[args.plan] || planDurations.free),
      paymentMethod: args.paymentMethod,
      paymentId: args.paymentId,
      amount: args.amount,
      currency: args.currency || "TND",
      createdAt: now,
      updatedAt: now,
    });

    // Update user's subscription plan
    await ctx.db.patch(user._id, {
      subscriptionPlan: args.plan,
      subscriptionEndDate: now + (planDurations[args.plan] || planDurations.free),
    });

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
