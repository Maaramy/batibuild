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
                phone: user.phone,
                company: user.company,
                image: user.image,
                role: user.role,
                status: user.status,
                createdAt: user.createdAt,
                subscriptionPlan: user.subscriptionPlan,
                subscriptionEndDate: user.subscriptionEndDate,
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

/** Read download limits from paymentConfig, fallback to defaults */
async function getDownloadLimits(ctx: any): Promise<{ pro: number; expert: number }> {
  const config = await ctx.db
    .query("paymentConfig")
    .order("desc")
    .first();
  return {
    pro: config?.proDownloadLimit ?? 10,
    expert: config?.expertDownloadLimit ?? 100,
  };
}

/** Check if the current user can download a PDF */
export const checkDownloadAllowed = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { allowed: false, reason: "non_connecté" };

    // Pro/Expert users get downloads per month
    if (user.subscriptionPlan === "pro" || user.subscriptionPlan === "expert") {
      const sub = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("desc")
        .first();

      if (!sub || sub.status !== "active") {
        return { allowed: false, reason: "abonnement_inactif" };
      }

      const limits = await getDownloadLimits(ctx);
      const limit = user.subscriptionPlan === "expert" ? limits.expert : limits.pro;
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
    if (!user || (user.subscriptionPlan !== "pro" && user.subscriptionPlan !== "expert")) {
      throw new Error("Seuls les abonnés Pro et Expert peuvent télécharger des devis");
    }

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (!sub || sub.status !== "active") {
      throw new Error("Abonnement inactif");
    }

    const limits = await getDownloadLimits(ctx);
    const limit = user.subscriptionPlan === "expert" ? limits.expert : limits.pro;
    const used = (sub.monthlyDownloadCount ?? 0) + 1;
    await ctx.db.patch(sub._id, {
      monthlyDownloadCount: used,
      updatedAt: Date.now(),
    });

    return { used, remaining: limit - used };
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

    const limits = await getDownloadLimits(ctx);
    const planConfig: Record<string, { duration: number; limit: number }> = {
      free: { duration: 365 * 24 * 60 * 60 * 1000, limit: 0 },
      pro: { duration: 30 * 24 * 60 * 60 * 1000, limit: limits.pro },
      expert: { duration: 30 * 24 * 60 * 60 * 1000, limit: limits.expert },
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

/** Upload payment proof receipt (D17 screenshot or bank transfer) */
export const uploadPaymentProof = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    storageId: v.id("_storage"),
    url: v.string(),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub) throw new Error("Abonnement introuvable");
    if (sub.userId !== user._id) throw new Error("Cet abonnement ne vous appartient pas");

    await ctx.db.patch(args.subscriptionId, {
      paymentProofStorageId: args.storageId,
      paymentProofUrl: args.url,
      paymentProofFileName: args.fileName || "reçu_paiement",
      paymentProofUploadedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
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

    // Update user's plan (use the plan from the subscription, not hardcoded)
    const planLabel = sub.plan === "expert" ? "Expert" : "Pro";
    await ctx.db.patch(sub.userId, {
      subscriptionPlan: sub.plan,
      subscriptionEndDate: now + planDuration,
    });

    // Notify the user
    try {
      await ctx.db.insert("notifications", {
        userId: sub.userId,
        type: "subscription",
        title: "Abonnement activé",
        message: `Félicitations ! Votre abonnement ${planLabel} a été activé. Vous pouvez désormais télécharger vos devis en PDF.`,
        read: false,
        link: "/pricing",
        createdAt: Date.now(),
      });
    } catch (e) {
      // Notification is optional, don't block approval
    }

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

    // Silently succeed if already processed (prevents race condition errors)
    if (sub.status !== "pending") {
      return { success: true, alreadyProcessed: true };
    }

    await ctx.db.patch(args.subscriptionId, {
      status: "canceled",
      updatedAt: Date.now(),
    });

    // Notify the user
    try {
      await ctx.db.insert("notifications", {
        userId: sub.userId,
        type: "subscription",
        title: "Abonnement refusé",
        message: `Votre demande d'abonnement a été refusée. Contactez le support pour plus d'informations.`,
        read: false,
        link: "/pricing",
        createdAt: Date.now(),
      });
    } catch (e) {
      // Notification is optional
    }

    return { success: true };
  },
});

/** Batch delete subscriptions (admin only) — also removes receipt files from storage */
export const adminBatchDeleteSubscriptions = mutation({
  args: {
    subscriptionIds: v.array(v.id("subscriptions")),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    let deleted = 0;
    let errors: string[] = [];

    for (const id of args.subscriptionIds) {
      try {
        const sub = await ctx.db.get(id);
        if (sub?.paymentProofStorageId) {
          try {
            await ctx.storage.delete(sub.paymentProofStorageId);
          } catch (e: any) {
            errors.push(`Fichier de reçu non supprimé pour ${id}: ${e.message || "erreur"}`);
          }
        }
        await ctx.db.delete(id);
        deleted++;
      } catch (e: any) {
        errors.push(e.message || `Erreur pour ${id}`);
      }
    }

    return { deleted, errors };
  },
});

/** Admin: permanently delete a subscription's payment receipt from storage (keeps the subscription) */
export const adminDeleteSubscriptionReceipt = mutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub) throw new Error("Abonnement introuvable");

    // Remove the file from storage (permanent)
    if (sub.paymentProofStorageId) {
      try {
        await ctx.storage.delete(sub.paymentProofStorageId);
      } catch (e: any) {
        // ignore — continue clearing fields
      }
    }

    await ctx.db.patch(args.subscriptionId, {
      paymentProofStorageId: undefined,
      paymentProofUrl: undefined,
      paymentProofFileName: undefined,
      paymentProofUploadedAt: undefined,
      paymentProofVerified: false,
      updatedAt: Date.now(),
    });

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "delete_subscription_receipt",
        targetUserId: sub.userId,
        targetUserEmail: sub.userId ? undefined : undefined,
        details: `Reçu de paiement supprimé définitivement (abonnement ${sub.plan})`,
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }

    return { success: true };
  },
});

/** Mark a payment receipt as verified/unverified (admin only) */
export const markReceiptVerified = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    verified: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub) throw new Error("Abonnement introuvable");

    const planLabel = sub.plan === "expert" ? "Expert" : sub.plan === "pro" ? "Pro" : sub.plan;

    await ctx.db.patch(args.subscriptionId, {
      paymentProofVerified: args.verified,
      updatedAt: Date.now(),
    });

    // Notify the user
    try {
      await ctx.db.insert("notifications", {
        userId: sub.userId,
        type: "subscription",
        title: args.verified ? "Reçu de paiement vérifié" : "Vérification de reçu annulée",
        message: args.verified
          ? `Votre reçu de paiement pour l'abonnement ${planLabel} a été vérifié avec succès.`
          : `La vérification de votre reçu de paiement pour l'abonnement ${planLabel} a été annulée. Contactez le support si nécessaire.`,
        read: false,
        link: "/pricing",
        createdAt: Date.now(),
      });
    } catch (e) {
      // Notification is optional
    }

    return { success: true, verified: args.verified };
  },
});
