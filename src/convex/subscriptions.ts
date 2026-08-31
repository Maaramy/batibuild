import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./users";
import { subscriptionPlanValidator, SUBSCRIPTION_PLANS } from "./schema";
import { scheduleEmailEvent, formatDateFr, planLabel, splitName } from "./emailNotifications";

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

/**
 * Quotas de l'utilisateur par type (construction · investissement).
 * Abonnement mensuel (30 jours) — accès illimité pour les forfaits payants.
 */
export const getMyQuotas = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const configs = await getPlanQuotaConfig(ctx);

    const sub = await getActiveSubscription(ctx, user._id);

    const plan = sub?.plan ?? "free";
    const now = Date.now();
    const isActive = sub && sub.status === "active" && (!sub.endDate || sub.endDate > now);
    // Un abonnement actif n'est « illimité » que s'il est réellement payé
    // (montant > 0) ou en période d'essai. Un tarif réglé à 0 TND ne donne pas
    // d'accès illimité — pas d'accès gratuit permanent.
    const unlimited = !!isActive && (sub?.amount ?? 0) > 0;

    // Forfaits payés/essai = accès illimité ; sinon palier gratuit plafonné
    const cUsed = unlimited ? 0 : await countUserDocs(ctx, user._id, "projects");
    const iUsed = unlimited ? 0 : await countUserDocs(ctx, user._id, "investments");

    const cLimit = unlimited ? Infinity : configs.free.projects;
    const iLimit = unlimited ? Infinity : configs.free.investments;

    const downloadsBase = {
      used: 0,
      limit: Infinity,
      allowed: unlimited,
    };

    return {
      construction: {
        kind: "construction" as const,
        plan,
        used: cUsed,
        limit: cLimit,
        reached: cUsed >= cLimit,
        downloads: downloadsBase,
      },
      investment: {
        kind: "investment" as const,
        plan,
        used: iUsed,
        limit: iLimit,
        reached: iUsed >= iLimit,
        downloads: downloadsBase,
      },
    };
  },
});

/** Get all subscriptions (admin only, returns empty if not admin) */
export const getAllSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "moderator")) {
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
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
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
// Quota helpers — forfaits à paiement unique (non mensuels)
// ============================================================================

/** Type de ressource soumise à quota. */
export type QuotaKind = "projects" | "investments" | "downloads";

export interface PlanQuota {
  projects: number;
  investments: number;
  downloads: number;
}

/** Quotas par défaut par forfait. */
export const DEFAULT_QUOTAS: Record<string, PlanQuota> = {
  free: { projects: 1, investments: 1, downloads: 1 },
  pro: { projects: 5, investments: 5, downloads: 5 },
  expert: { projects: 20, investments: 20, downloads: 20 },
};

/** Lit les quotas par forfait depuis paymentConfig (fallback aux défauts). */
export async function getPlanQuotaConfig(ctx: any): Promise<Record<string, PlanQuota>> {
  const config = await ctx.db
    .query("paymentConfig")
    .order("desc")
    .first();
  return {
    // Palier gratuit plafonné (1/1/1) : pas d'accès gratuit permanent.
    // Le client doit passer au paiement (ou à l'essai gratuit) pour un accès
    // illimité. Le plafond ignore les valeurs de config héritées (UNLIMITED)
    // pour rester effectif même si une ancienne config existe en base.
    // Pour ajuster le palier : modifier DEFAULT_QUOTAS.free ci-dessus.
    free: {
      projects: Math.min(config?.freeProjectLimit ?? DEFAULT_QUOTAS.free.projects, DEFAULT_QUOTAS.free.projects),
      investments: Math.min(config?.freeInvestmentLimit ?? DEFAULT_QUOTAS.free.investments, DEFAULT_QUOTAS.free.investments),
      downloads: Math.min(config?.freeDownloadLimit ?? DEFAULT_QUOTAS.free.downloads, DEFAULT_QUOTAS.free.downloads),
    },
    pro: {
      projects: config?.proProjectLimit ?? DEFAULT_QUOTAS.pro.projects,
      investments: config?.proInvestmentLimit ?? DEFAULT_QUOTAS.pro.investments,
      downloads: config?.proDownloadLimit ?? DEFAULT_QUOTAS.pro.downloads,
    },
    expert: {
      projects: config?.expertProjectLimit ?? DEFAULT_QUOTAS.expert.projects,
      investments: config?.expertInvestmentLimit ?? DEFAULT_QUOTAS.expert.investments,
      downloads: config?.expertDownloadLimit ?? DEFAULT_QUOTAS.expert.downloads,
    },
    // Supplier plan: suppliers don't consume construction/investment quotas,
    // but the record may exist in the DB — provide safe defaults so
    // getMyQuotas() doesn't crash when plan = "supplier".
    supplier: {
      projects: 0,
      investments: 0,
      downloads: 0,
    },
  };
}

type SubKind = "construction" | "investment";

/**
 * Abonnement actif de l'utilisateur (un seul forfait couvre la construction
 * et l'investissement).
 */
async function getActiveSubscription(ctx: any, userId: any, _kind?: SubKind) {
  const subs = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .order("desc")
    .collect();
  return subs.find((s: any) => s.status === "active") ?? null;
}

/** Type d'abonnement correspondant à un quota (tous couverts par le même forfait). */
function subKindForQuota(kind: QuotaKind): SubKind | null {
  if (kind === "projects") return "construction";
  if (kind === "investments") return "investment";
  return null;
}

const KIND_TO_SUB_FIELD: Record<QuotaKind, string> = {
  projects: "projectsUsed",
  investments: "investmentsUsed",
  downloads: "monthlyDownloadCount",
};

async function countUserDocs(ctx: any, userId: any, kind: QuotaKind): Promise<number> {
  if (kind === "projects") {
    return (await ctx.db.query("projects").withIndex("by_user", (q: any) => q.eq("userId", userId)).collect()).length;
  }
  if (kind === "investments") {
    return (await ctx.db.query("investmentAnalyses").withIndex("by_user", (q: any) => q.eq("userId", userId)).collect()).length;
  }
  return 0;
}

/**
 * Vérifie si l'utilisateur peut encore créer un élément du type demandé.
 * Les quotas sont comptés par abonnement (paiement unique) et par type
 * (construction / investissement).
 * Sans abonnement actif pour le type demandé, on retombe sur l'offre de
 * base (Start) comptée sur les documents.
 */
export async function checkQuota(
  _ctx: any,
  _user: any,
  _kind: QuotaKind,
): Promise<{ allowed: boolean; limit: number; used: number; plan: string; reason: string }> {
  return { allowed: true, limit: Infinity, used: 0, plan: "free", reason: "ok" };
}

/** Incrémente le compteur de quota de l'abonnement actif. */
export async function consumeQuota(_ctx: any, _user: any, _kind: QuotaKind): Promise<void> {
  // Quotas removed — no-op
}

/**
 * Décrémente le compteur de quota de l'abonnement actif.
 * Utilisé quand un administrateur supprime un document (projet, analyse) :
 * le quota consommé est libéré pour l'utilisateur concerné.
 */
export async function releaseQuota(_ctx: any, _userId: any, _kind: QuotaKind, _count = 1): Promise<void> {
  // Quotas removed — no-op
}

// ============================================================================
// Download Limit Helpers
// ============================================================================

/** Vérifie si l'utilisateur peut télécharger un PDF de construction (rétrocompatible). */
export const checkDownloadAllowed = query({
  args: {},
  handler: async (ctx) => {
    return checkDownloadAllowedForKind(ctx, "construction");
  },
});

/** Consomme un téléchargement de construction (rétrocompatible). */
export const consumeDownload = mutation({
  args: {},
  handler: async (ctx) => {
    return consumeDownloadForKind(ctx, "construction");
  },
});

async function checkDownloadAllowedForKind(_ctx: any, _kind: SubKind) {
  return { allowed: true, reason: "ok", limit: Infinity, used: 0 } as any;
}

async function consumeDownloadForKind(_ctx: any, _kind: SubKind): Promise<void> {
  // Quotas removed — no-op
}

// consumeDownloadForKind — quotas removed
export const consumeDownloadFor = mutation({
  args: {
    kind: v.union(v.literal("construction"), v.literal("investment")),
  },
  handler: async (ctx, args) => {
    return consumeDownloadForKind(ctx, args.kind);
  },
});

/** Vérifie si l'utilisateur peut télécharger (constru ou investissement). */
export const checkDownloadAllowedFor = query({
  args: {
    kind: v.union(v.literal("construction"), v.literal("investment")),
  },
  handler: async (ctx, args) => {
    return checkDownloadAllowedForKind(ctx, args.kind);
  },
});


// ============================================================================
// Mutations
// ============================================================================

// Forfaits mensuels : durée de 30 jours — renouvellement mensuel.
const MONTHLY_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 jours
// Période d'essai gratuite pour Fournisseur/Expert : 2 mois
const TRIAL_DURATION = 60 * 24 * 60 * 60 * 1000; // 60 jours

/** Create or update subscription (abonnement mensuel, 30 jours) */
export const createSubscription = mutation({
  args: {
    plan: subscriptionPlanValidator,
    kind: v.optional(v.union(v.literal("construction"), v.literal("investment"))),
    paymentMethod: v.optional(v.string()),
    paymentId: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const now = Date.now();
    const kind = args.kind ?? "construction"; // legacy : construction

    // Un seul forfait actif à la fois : un nouvel achat remplace l'ancien
    // (abonnement mensuel — renouvellement automatique).
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Durée et statut selon le contexte (essai gratuit / paiement).
    // Tous les profils (Client, Fournisseur, Expert) bénéficient d'un essai
    // gratuit configurable à l'inscription (première souscription uniquement).
    let duration = MONTHLY_DURATION;
    let status: "active" | "pending" = args.paymentMethod === "bank_transfer" ? "pending" : "active";
    if (existing.length === 0) {
      const config = await ctx.db.query("paymentConfig").order("desc").first();
      const trialEnabled = config?.trialEnabled ?? true;
      const trialDays = config?.trialDurationDays ?? 60;
      if (trialEnabled && trialDays > 0) {
        // Période d'essai gratuite : accès immédiat sans paiement préalable
        duration = trialDays * 24 * 60 * 60 * 1000;
        status = "active";
      }
    }

    for (const sub of existing) {
      if (sub.status === "active") {
        await ctx.db.patch(sub._id, { status: "canceled", updatedAt: now });
      }
    }

    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId: user._id,
      kind,
      plan: args.plan,
      status,
      startDate: now,
      endDate: now + duration,
      paymentMethod: args.paymentMethod,
      paymentId: args.paymentId,
      amount: args.amount,
      currency: args.currency || "TND",
      monthlyDownloadCount: 0,
      downloadLimit: Infinity,
      createdAt: now,
      updatedAt: now,
    });

    // Update user's subscription plan (only if active — incl. essai gratuit)
    if (status === "active") {
      await ctx.db.patch(user._id, {
        subscriptionPlan: args.plan,
        subscriptionEndDate: now + duration,
      });

      // Notify by email: activation (first subscription) or renewal (re-subscription)
      if (user.email && user.emailNotifications !== false) {
        const isRenewal = existing.length > 0;
        await scheduleEmailEvent(ctx, {
          to: user.email,
          recipientName: user.name || undefined,
          templateKey: isRenewal ? "subscription_renewed" : "subscription_activated",
          vars: {
            ...splitName(user.name),
            typeAbonnement: planLabel(args.plan),
            dateActivation: formatDateFr(now),
            dateExpiration: formatDateFr(now + duration),
            montant: args.amount ? `${args.amount} ${args.currency || "TND"}` : undefined,
            numeroFacture: `INV-${subscriptionId}`,
          },
          dedupeKey: `${isRenewal ? "subscription_renewed" : "subscription_activated"}:${user.email}:${subscriptionId}`,
          sendToAdmins: true,
        });
      }
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

/** Cancel subscription (annule tous les abonnements actifs de l'utilisateur) */
export const cancelSubscription = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const allSubs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    for (const activeSub of allSubs) {
      if (activeSub.status !== "active") continue;

      await ctx.db.patch(activeSub._id, {
        status: "canceled",
        updatedAt: Date.now(),
      });

      // Send automatic email notification (subscription canceled)
      if (user.email && user.emailNotifications !== false) {
        await scheduleEmailEvent(ctx, {
          to: user.email,
          recipientName: user.name || undefined,
          templateKey: "subscription_canceled",
          vars: {
            ...splitName(user.name),
            typeAbonnement: planLabel(activeSub.plan),
            dateActivation: formatDateFr(activeSub.startDate),
            dateExpiration: formatDateFr(activeSub.endDate),
          },
          dedupeKey: `subscription_canceled:${user.email}:${activeSub._id}`,
          sendToAdmins: true,
        });
      }
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
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
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
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
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
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
      throw new Error("Unauthorized: Admin access required");
    }

    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub) throw new Error("Abonnement introuvable");
    if (sub.status !== "pending") throw new Error("Cet abonnement n'est pas en attente");

    const now = Date.now();
    const planDuration = MONTHLY_DURATION; // paiement mensuel (30 jours)

    // Update subscription to active
    await ctx.db.patch(args.subscriptionId, {
      status: "active",
      startDate: now,
      endDate: now + planDuration,
      updatedAt: now,
    });

    // Update user's plan (use the plan from the subscription, not hardcoded)
    const planDisplayName = planLabel(sub.plan);
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
        message: `Félicitations ! Votre abonnement ${planDisplayName} a été activé. Vous pouvez désormais télécharger vos devis en PDF.`,
        read: false,
        link: "/pricing",
        createdAt: Date.now(),
      });
    } catch (e) {
      // Notification is optional, don't block approval
    }

    // Send automatic email notification (activation or renewal)
    const targetUser = await ctx.db.get(sub.userId);
    if (targetUser?.email && targetUser.emailNotifications !== false) {
      // Renewal if the user had another subscription before this one
      const otherSubs = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", sub.userId))
        .collect();
      const hasPrevious = otherSubs.some(
        (s) => s._id !== sub._id && (s.status === "active" || s.status === "expired"),
      );
      const isRenewal = hasPrevious;
      await scheduleEmailEvent(ctx, {
        to: targetUser.email,
        recipientName: targetUser.name || undefined,
        templateKey: isRenewal ? "subscription_renewed" : "subscription_activated",
        vars: {
          ...splitName(targetUser.name),
          typeAbonnement: planLabel(sub.plan),
          dateActivation: formatDateFr(now),
          dateExpiration: formatDateFr(now + planDuration),
          montant: sub.amount ? `${sub.amount} ${sub.currency || "TND"}` : undefined,
          numeroFacture: `INV-${sub._id}`,
        },
        dedupeKey: `${isRenewal ? "subscription_renewed" : "subscription_activated"}:${targetUser.email}:${sub._id}`,
        sendToAdmins: true,
      });
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
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
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

    // Send automatic email notification (payment rejected)
    const targetUser = await ctx.db.get(sub.userId);
    if (targetUser?.email && targetUser.emailNotifications !== false) {
      await scheduleEmailEvent(ctx, {
        to: targetUser.email,
        recipientName: targetUser.name || undefined,
        templateKey: "payment_rejected",
        vars: {
          ...splitName(targetUser.name),
          typeAbonnement: planLabel(sub.plan),
          montant: sub.amount ? `${sub.amount} ${sub.currency || "TND"}` : undefined,
          numeroFacture: `INV-${sub._id}`,
          dateExpiration: formatDateFr(sub.endDate),
        },
        dedupeKey: `payment_rejected:${targetUser.email}:${sub._id}`,
        sendToAdmins: true,
      });
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
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
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
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
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
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
      throw new Error("Unauthorized: Admin access required");
    }

    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub) throw new Error("Abonnement introuvable");

    const planDisplayName = planLabel(sub.plan);

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
          ? `Votre reçu de paiement pour l'abonnement ${planDisplayName} a été vérifié avec succès.`
          : `La vérification de votre reçu de paiement pour l'abonnement ${planDisplayName} a été annulée. Contactez le support si nécessaire.`,
        read: false,
        link: "/pricing",
        createdAt: Date.now(),
      });
    } catch (e) {
      // Notification is optional
    }

    // Send automatic email notification (payment confirmed)
    if (args.verified) {
      const targetUser = await ctx.db.get(sub.userId);
      if (targetUser?.email && targetUser.emailNotifications !== false) {
        await scheduleEmailEvent(ctx, {
          to: targetUser.email,
          recipientName: targetUser.name || undefined,
          templateKey: "payment_confirmed",
          vars: {
            ...splitName(targetUser.name),
            typeAbonnement: planLabel(sub.plan),
            montant: sub.amount ? `${sub.amount} ${sub.currency || "TND"}` : undefined,
            numeroFacture: `INV-${sub._id}`,
            dateActivation: formatDateFr(sub.startDate),
            dateExpiration: formatDateFr(sub.endDate),
          },
          dedupeKey: `payment_confirmed:${targetUser.email}:${sub._id}`,
          sendToAdmins: true,
        });
      }
    }

    return { success: true, verified: args.verified };
  },
});
