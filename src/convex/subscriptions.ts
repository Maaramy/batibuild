import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { subscriptionPlanValidator } from "./schema";
import {
  scheduleAdminNotification,
  scheduleEmailEvent,
  formatDateFr,
  planLabel,
  splitName,
} from "./emailNotifications";
import { DAY_MS, MONTHLY_DURATION_DAYS } from "./subscriptionPeriods";
import {
  PROFILE_ROLE_LABELS,
  PROFILE_SUBSCRIPTION_ERROR_MARKER,
  PLAN_VALUE_LABELS,
  expectedPlanForProfile,
  resolveProfileRole,
} from "./profileSubscription";
import { assertPaymentMethodEnabled } from "./paymentMethodStates";
import { getPdfDownloadAccess, PDF_ACCESS_MARKER } from "./access";
import { requiresManualValidation } from "../lib/paymentMethods";
import {
  cancelPendingInvoicesForSubscription,
  invoiceNumberForSubscription,
  issueSubscriptionInvoice,
  syncLatestInvoiceForSubscription,
} from "./invoices";

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

/** All of the current user's subscriptions (used by access checks called from actions, which have no ctx.db). */
export const getUserSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
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
;

/** Consomme un téléchargement de construction (rétrocompatible). */
export const consumeDownload = mutation({
  args: {},
  handler: async (ctx) => {
    return consumeDownloadForKind(ctx, "construction");
  },
});

/** Vérifie si l'utilisateur peut télécharger un PDF de construction (rétrocompatible). */
export const checkDownloadAllowed = query({
  args: {},
  handler: async (ctx) => {
    return checkDownloadAllowedForKind(ctx, "construction");
  },
});

async function checkDownloadAllowedForKind(ctx: any, _kind: string) {
  const user = await getCurrentUser(ctx);
  const access = await getPdfDownloadAccess(ctx, user);
  return { allowed: access.allowed, reason: access.reason, limit: Infinity, used: 0 } as any;
}

/**
 * Contrôle serveur du téléchargement PDF : réservé au forfait payant Client Pro
 * (ou à une période d'essai dont le module PDF a été ouvert par
 * l'administrateur). L'interface ne peut pas contourner cette vérification
 * (les générateurs PDF appellent cette mutation).
 */
async function consumeDownloadForKind(ctx: any, _kind: string): Promise<void> {
  const user = await getCurrentUser(ctx);
  const access = await getPdfDownloadAccess(ctx, user);
  if (!access.allowed) {
    throw new Error(
      `${PDF_ACCESS_MARKER}Le téléchargement des rapports PDF est réservé à l'abonnement Client Pro.`,
    );
  }
}

// consumeDownloadForKind — quotas removed

// ============================================================================
// Mutations
// ============================================================================

// Forfaits mensuels : durée de 30 jours — renouvellement mensuel.
// La période d'essai gratuite (durée réglée par l'administrateur) est gérée par
// `subscriptionStatus.ts` : souscrire à une offre mensuelle la désactive
// immédiatement. L'ancien forfait « Free » a été supprimé.
const MONTHLY_DURATION = MONTHLY_DURATION_DAYS * DAY_MS; // 30 jours

/** Create or update subscription (abonnement mensuel, 30 jours) */
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

    // ── Règle obligatoire : le forfait doit correspondre au profil actif ──
    // Client Pro → pro · Fournisseur → supplier · Expert → expert.
    // Vérification backend : le frontend ne peut pas contourner cette règle.
    const profileRole = await resolveProfileRole(ctx, user);
    const expectedPlan = expectedPlanForProfile(profileRole);
    if (args.plan !== expectedPlan) {
      const roleLabel = PROFILE_ROLE_LABELS[profileRole ?? "client"];
      throw new Error(
        `${PROFILE_SUBSCRIPTION_ERROR_MARKER}Votre profil « ${roleLabel} » autorise uniquement l'offre ${PLAN_VALUE_LABELS[expectedPlan]}. ` +
          "Seules les offres correspondant à votre type de profil peuvent être souscrites.",
      );
    }

    const now = Date.now();

    // Un seul forfait actif à la fois : un nouvel achat remplace l'ancien
    // (abonnement mensuel — renouvellement automatique).
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Durée mensuelle (30 jours) pour tous les forfaits — essai gratuit supprimé
    const duration = MONTHLY_DURATION;

    for (const sub of existing) {
      if (sub.status === "active") {
        await ctx.db.patch(sub._id, { status: "canceled", updatedAt: now });
      }
    }

    // ── Client Pro : TOUJOURS payant ──────────────────────────────────────
    // L'« Offre gratuite » Client Pro (accès permanent sans échéance ni
    // paiement) a été supprimée. Un montant nul ou absent n'active donc JAMAIS
    // un abonnement Client Pro : la demande reste « en attente » jusqu'à la
    // validation effective du paiement par l'administrateur. Le montant n'est
    // jamais déduit d'une valeur transmise par le client pour décider d'une
    // activation gratuite.
    const isClientPro = args.plan === "pro";
    if (
      isClientPro &&
      (args.amount === null || args.amount === 0 || args.amount === undefined)
    ) {
      throw new Error(
        "Le forfait Client Pro est payant : sélectionnez un moyen de paiement et le montant de votre abonnement.",
      );
    }

    // Forfait gratuit (montant null ou 0) des forfaits Fournisseur / Expert :
    // l'administrateur peut activer une « offre gratuite » sur ces forfaits,
    // qui est alors ouverte immédiatement, sans paiement.
    const isFreePlan =
      !isClientPro &&
      (args.amount === null || args.amount === 0 || args.amount === undefined);

    // ── Contrôle serveur : une méthode désactivée par l'admin est refusée,
    // même si le frontend tente de la forcer. ──
    if (!isFreePlan) {
      await assertPaymentMethodEnabled(ctx, args.paymentMethod);
    }

    // ── Règlement : le virement bancaire ET le paiement D17 sont à validation
    // MANUELLE. L'utilisateur joint un justificatif (capture D17 ou preuve de
    // virement) puis un administrateur approuve la demande — la souscription
    // reste donc « pending » jusque-là, exactement comme les offres Fournisseur
    // et Expert. Aucune méthode à encaissement automatique n'est branchée :
    // seul un forfait gratuit est activé immédiatement.
    const status =
      isFreePlan || !requiresManualValidation(args.paymentMethod) ? "active" : "pending";

    if (status === "pending") {
      // Paiement en attente : l'essai éventuel reste actif jusqu'à validation.
      await ctx.db.patch(user._id, { subscriptionStatus: "pending", updatedAt: now });
    }

    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId: user._id,
      plan: args.plan,
      status,
      startDate: now,
      endDate: now + duration,
      paymentMethod: isFreePlan ? undefined : args.paymentMethod,
      paymentId: args.paymentId,
      amount: isFreePlan ? 0 : args.amount,
      currency: args.currency || "TND",
      monthlyDownloadCount: 0,
      downloadLimit: Infinity,
      createdAt: now,
      updatedAt: now,
    });

    // ── FACTURE — émise AUTOMATIQUEMENT à chaque souscription payante ──
    // « En attente » tant que le règlement (virement / D17) n'est pas validé
    // par l'administrateur, « Payée » seulement après cette validation. Aucune
    // facture pour un forfait gratuit (aucun montant réglé) : rien n'est inventé.
    const subscriptionInvoice = await issueSubscriptionInvoice(ctx, {
      subscriptionId,
      userId: user._id,
      user,
      plan: args.plan,
      amountTTC: isFreePlan ? 0 : args.amount ?? 0,
      currency: args.currency || "TND",
      paymentMethod: isFreePlan ? undefined : args.paymentMethod,
      paymentId: args.paymentId,
      periodStart: now,
      periodEnd: now + duration,
      status: status === "pending" ? "pending" : "paid",
      paymentDate: status === "pending" ? undefined : now,
    });

    // Update user's subscription plan (only if not pending) — dernière formule achetée
    if (status !== "pending") {
      // Activation : la période mensuelle remplace l'essai gratuit (qui n'est
      // jamais rejoué — `trialClaimedAt` reste en place).
      await ctx.db.patch(user._id, {
        subscriptionPlan: args.plan,
        subscriptionEndDate: now + duration,
        subscriptionStartDate: now,
        subscriptionDaysTotal: MONTHLY_DURATION_DAYS,
        subscriptionDaysRemaining: MONTHLY_DURATION_DAYS,
        subscriptionStatus: "active",
        trialStartDate: undefined,
        trialEndDate: undefined,
        trialDaysRemaining: 0,
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
            // Numéro de facture réel (le client le retrouve dans « Mes factures »).
            numeroFacture: await invoiceNumberForSubscription(ctx, subscriptionId),
          },
          // Facture PDF jointe à l'e-mail d'activation / renouvellement.
          invoiceId: subscriptionInvoice?._id,
          dedupeKey: `${isRenewal ? "subscription_renewed" : "subscription_activated"}:${user.email}:${subscriptionId}`,
          sendToAdmins: true,
        });
      }

    }

    // ── Notification administrateur — indépendante des préférences e-mail de
    // l'utilisateur : l'administrateur est informé de TOUTE nouvelle
    // souscription, qu'elle soit active ou en attente de validation.
    await scheduleAdminNotification(ctx, {
      templateKey: "admin_new_subscription",
      // Une demande en attente puis son activation sont deux événements
      // distincts, jamais dédupliqués l'un contre l'autre.
      entityId:
        status === "pending" ? `${subscriptionId}:pending` : String(subscriptionId),
      vars: {
        ...splitName(user.name),
        email: user.email || "",
        profil: PROFILE_ROLE_LABELS[profileRole ?? user.userRole ?? "client"],
        typeAbonnement: planLabel(args.plan),
        montant: isFreePlan ? "0 TND" : `${args.amount ?? 0} ${args.currency || "TND"}`,
        statut:
          status === "pending" ? "En attente de validation du paiement" : "Actif",
        date: formatDateFr(now),
      },
    });

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
      // Un abonnement actif OU une demande encore en attente de validation peut
      // être résilié par l'utilisateur (retrait de la demande de paiement).
      if (activeSub.status !== "active" && activeSub.status !== "pending") continue;
      const wasActive = activeSub.status === "active";

      await ctx.db.patch(activeSub._id, {
        status: "canceled",
        updatedAt: Date.now(),
      });

      // ── Factures : seules les factures NON PAYÉES de cet abonnement sont
      // annulées. Une facture déjà payée reste payée et l'historique de
      // facturation est conservé (aucune facture n'est supprimée).
      await cancelPendingInvoicesForSubscription(ctx, activeSub._id);

      // Send automatic email notification (subscription canceled)
      if (wasActive && user.email && user.emailNotifications !== false) {
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
      subscriptionPlan: undefined,
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

    // Update user's plan (use the plan from the subscription, not hardcoded).
    // L'essai gratuit est désactivé : la période mensuelle prend le relais.
    const planDisplayName = planLabel(sub.plan);
    await ctx.db.patch(sub.userId, {
      subscriptionPlan: sub.plan,
      subscriptionEndDate: now + planDuration,
      subscriptionStartDate: now,
      subscriptionDaysTotal: MONTHLY_DURATION_DAYS,
      subscriptionDaysRemaining: MONTHLY_DURATION_DAYS,
      subscriptionStatus: "active",
      trialStartDate: undefined,
      trialEndDate: undefined,
      trialDaysRemaining: 0,
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

    // ── FACTURE — validation du paiement : la facture passe en « Payée » ──
    // (facture « en attente » créée à la souscription, ou créée maintenant
    // pour un abonnement antérieur au module de facturation).
    let approvedInvoice: Awaited<ReturnType<typeof issueSubscriptionInvoice>> = null;
    if (targetUser) {
      approvedInvoice = await issueSubscriptionInvoice(ctx, {
        subscriptionId: sub._id,
        userId: sub.userId,
        user: targetUser,
        plan: sub.plan,
        amountTTC: sub.amount ?? 0,
        currency: sub.currency ?? "TND",
        paymentMethod: sub.paymentMethod,
        paymentId: sub.paymentId,
        periodStart: now,
        periodEnd: now + planDuration,
        status: "paid",
        paymentDate: now,
      });
    }

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
          // Numéro de facture réel, disponible dans « Mes factures ».
          numeroFacture: await invoiceNumberForSubscription(ctx, sub._id),
        },
        // Facture PDF jointe : activation / renouvellement après validation.
        invoiceId: approvedInvoice?._id,
        dedupeKey: `${isRenewal ? "subscription_renewed" : "subscription_activated"}:${targetUser.email}:${sub._id}`,
        sendToAdmins: true,
      });
    }

    // ── Notification administrateur : abonnement validé / activé ──
    if (targetUser?.email) {
      await scheduleAdminNotification(ctx, {
        templateKey: "admin_new_subscription",
        entityId: String(sub._id),
        vars: {
          ...splitName(targetUser.name),
          email: targetUser.email,
          profil:
            PROFILE_ROLE_LABELS[
              (await resolveProfileRole(ctx, targetUser)) ?? targetUser.userRole ?? "client"
            ],
          typeAbonnement: planDisplayName,
          montant: sub.amount ? `${sub.amount} ${sub.currency || "TND"}` : "0 TND",
          statut: "Paiement validé — abonnement actif",
          date: formatDateFr(now),
        },
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

    // ── Facture : la demande refusée annule la facture NON PAYÉE de cet
    // abonnement (l'historique reste consultable, rien n'est supprimé).
    await cancelPendingInvoicesForSubscription(ctx, sub._id);

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

    // ── FACTURE — le statut suit la vérification du reçu de paiement ──
    const receiptUser = await ctx.db.get(sub.userId);
    // Facture du terme validé : réutilisée plus bas pour joindre le PDF à
    // l'e-mail « paiement confirmé ».
    let receiptInvoice: Awaited<ReturnType<typeof issueSubscriptionInvoice>> = null;
    if (args.verified && receiptUser) {
      receiptInvoice = await issueSubscriptionInvoice(ctx, {
        subscriptionId: sub._id,
        userId: sub.userId,
        user: receiptUser,
        plan: sub.plan,
        amountTTC: sub.amount ?? 0,
        currency: sub.currency ?? "TND",
        paymentMethod: sub.paymentMethod,
        paymentId: sub.paymentId,
        periodStart: sub.startDate,
        periodEnd: sub.endDate ?? sub.startDate,
        status: "paid",
        paymentDate: Date.now(),
      });
    } else {
      // Vérification annulée : la facture du terme en cours repasse « en
      // attente » (jamais annulée ni supprimée automatiquement).
      await syncLatestInvoiceForSubscription(ctx, sub._id, { status: "pending" });
    }

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
            numeroFacture: receiptInvoice?.invoiceNumber,
            dateActivation: formatDateFr(sub.startDate),
            dateExpiration: formatDateFr(sub.endDate),
          },
          // Facture PDF jointe à l'e-mail de confirmation de paiement.
          invoiceId: receiptInvoice?._id,
          dedupeKey: `payment_confirmed:${targetUser.email}:${sub._id}`,
          sendToAdmins: true,
        });
      }
    }

    return { success: true, verified: args.verified };
  },
});
