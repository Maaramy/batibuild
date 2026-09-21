import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { getFreePlanStatus, isProfilePaymentActive } from "./access";
import { SUPPLIER_SPECIALTIES_LABELS } from "./schema";
import { scheduleEmailEvent, formatDateFr } from "./emailNotifications";

// ============================================================================
// Constants
// ============================================================================

const MONTHLY_DAYS = 30;

/** Read the supplier plan price from paymentConfig (fallback 120 TND) */
async function getSupplierPrice(ctx: any): Promise<number> {
  const config = await ctx.db
    .query("paymentConfig")
    .order("desc")
    .first();
  const p = config?.supplierPrice;
  // null/0 = « Offre gratuite » (switch admin) → prix affiché 0
  if (p === undefined) return 120;
  return p === null || p === 0 ? 0 : p;
}

/**
 * Legacy logos were saved as `${window.location.origin}/api/storage/<storageId>`,
 * which never resolves on the app host (no /api proxy). Detect that pattern on
 * read and re-resolve the real Convex storage URL. Queries are read-only, so the
 * healed URL is persisted on the next profile save (see updateProfile).
 */
const BROKEN_STORAGE_URL_RE = /\/api\/storage\/([A-Za-z0-9]+)(?:[?#]|$)/;

async function repairLogoUrl(
  ctx: any,
  logo: string | undefined
): Promise<string | undefined> {
  if (!logo) return undefined;
  const match = logo.match(BROKEN_STORAGE_URL_RE);
  if (!match) return logo;
  try {
    const url = await ctx.storage.getUrl(match[1] as any);
    return url || logo;
  } catch {
    return logo;
  }
}

// ============================================================================
// Queries
// ============================================================================

/** Get the current user's supplier profile */
export const getMyProfile = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) return null;

    // Trial period removed — legacy trial profiles are treated as inactive.
    // « Offre gratuite » (switch admin) : l'espace fournisseur est activé
    // automatiquement, sans abonnement payant ni expiration.
    const now = Date.now();
    const free = await getFreePlanStatus(ctx);
    const planFree = free.supplierFree;

    let effectiveStatus =
      profile.subscriptionStatus === "trial"
        ? "inactive"
        : profile.subscriptionStatus;
    if (planFree) {
      effectiveStatus = "active";
    }
    if (
      !planFree &&
      effectiveStatus === "active" &&
      profile.subscriptionEndDate &&
      profile.subscriptionEndDate < now
    ) {
      effectiveStatus = "expired";
    }

    // Calculate remaining days (Illimité quand l'offre gratuite est active)
    let remainingDays = 0;
    if (effectiveStatus === "active" && profile.subscriptionEndDate && !planFree) {
      remainingDays = Math.max(
        0,
        Math.ceil(
          (profile.subscriptionEndDate - now) / (24 * 60 * 60 * 1000)
        )
      );
    }

    return {
      ...profile,
      logo: await repairLogoUrl(ctx, profile.logo),
      specialtiesLabels: profile.specialties.map(
        (s) => SUPPLIER_SPECIALTIES_LABELS[s] || s
      ),
      effectiveStatus,
      remainingDays,
      planFree,
      plan: profile.plan || "none",
      price: planFree ? 0 : await getSupplierPrice(ctx),
    };
  },
});

/** Get all active supplier profiles (for recommendations) */
export const getActiveSuppliers = query({
  handler: async (ctx) => {
    const now = Date.now();
    const free = await getFreePlanStatus(ctx);

    // « Offre gratuite » : tous les profils visibles sont actifs automatiquement
    const suppliers = free.supplierFree
      ? await ctx.db.query("supplierProfiles").collect()
      : await ctx.db
          .query("supplierProfiles")
          .withIndex("by_subscription", (q) =>
            q.eq("subscriptionStatus", "active")
          )
          .collect();

    const visible = [];
    for (const s of suppliers) {
      if (!s.isVisible) continue;
      // Paiement obligatoire : profil inactif / expiré = strictement invisible.
      if (await isProfilePaymentActive(ctx, free.supplierFree, s, now)) visible.push(s);
    }

    const result = [];
    for (const s of visible) {
      result.push({
        _id: s._id,
        userId: s.userId,
        companyName: s.companyName,
        phone: s.phone,
        email: s.email,
        address: s.address,
        website: s.website,
        description: s.description,
        logo: await repairLogoUrl(ctx, s.logo),
        specialties: s.specialties,
        regions: s.regions,
        plan: s.plan,
      });
    }
    return result;
  },
});

/** Check if the current user has a supplier profile */
export const hasSupplierProfile = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return false;

    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return !!profile;
  },
});

/** Get all supplier profiles with user info (admin only) */
export const getAllSupplierProfiles = query({
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
      return [];
    }

    const profiles = await ctx.db.query("supplierProfiles").order("desc").collect();

    const result = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return {
          ...profile,
          logo: await repairLogoUrl(ctx, profile.logo),
          subscriptionStatus:
            profile.subscriptionStatus === "trial" ? "inactive" : profile.subscriptionStatus,
          specialtiesLabels: profile.specialties.map(
            (s) => SUPPLIER_SPECIALTIES_LABELS[s] || s
          ),
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                image: user.image,
              }
            : null,
        };
      }),
    );

    return result;
  },
});

/** Get a supplier profile by ID (public) */
export const getSupplierById = query({
  args: { supplierId: v.id("supplierProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.supplierId);
    if (!profile || !profile.isVisible) return null;
    // Paiement obligatoire : profil inactif / expiré = strictement invisible.
    const now = Date.now();
    const free = await getFreePlanStatus(ctx);
    if (!(await isProfilePaymentActive(ctx, free.supplierFree, profile, now))) {
      return null;
    }
    return {
      _id: profile._id,
      companyName: profile.companyName,
      phone: profile.phone,
      email: profile.email,
      address: profile.address,
      website: profile.website,
      description: profile.description,
      // Logo de l'entreprise : indispensable à la fiche publique, et réparé à
      // la lecture pour les anciennes URL `/api/storage/<id>`.
      logo: await repairLogoUrl(ctx, profile.logo),
      specialties: profile.specialties,
      regions: profile.regions ?? [],
      specialtiesLabels: profile.specialties.map(
        (s) => SUPPLIER_SPECIALTIES_LABELS[s] || s
      ),
    };
  },
});

// ============================================================================
// Mutations
// ============================================================================

/** Create a supplier profile */
export const createProfile = mutation({
  args: {
    companyName: v.string(),
    phone: v.string(),
    email: v.string(),
    address: v.string(),
    website: v.optional(v.string()),
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    specialties: v.array(v.string()),
    regions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    // Check if already has a profile
    const existing = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) throw new Error("Vous avez déjà un profil fournisseur");

    // Resolve the storage ID to a real storage URL (client-side-built URLs are broken)
    let logo = args.logo;
    if (args.logoStorageId) {
      const url = await ctx.storage.getUrl(args.logoStorageId);
      if (!url) throw new Error("Impossible de récupérer le logo");
      logo = url;
    }

    const now = Date.now();
    const profileId = await ctx.db.insert("supplierProfiles", {
      userId: user._id,
      companyName: args.companyName,
      phone: args.phone,
      email: args.email,
      address: args.address,
      website: args.website,
      description: args.description,
      logo,
      specialties: args.specialties,
      regions: args.regions,
      plan: "none",
      subscriptionStatus: "inactive",
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    });

    return profileId;
  },
});

/** Update a supplier profile */
export const updateProfile = mutation({
  args: {
    companyName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    clearLogo: v.optional(v.boolean()),
    specialties: v.optional(v.array(v.string())),
    regions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) throw new Error("Aucun profil fournisseur trouvé");

    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (args.companyName !== undefined) updates.companyName = args.companyName;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.email !== undefined) updates.email = args.email;
    if (args.address !== undefined) updates.address = args.address;
    if (args.website !== undefined) updates.website = args.website;
    if (args.description !== undefined) updates.description = args.description;
    // Logo: clearLogo > logoStorageId (server-resolved URL) > legacy raw URL.
    // When no logo arg is given, heal a legacy broken logo URL on save.
    if (args.clearLogo) {
      updates.logo = undefined; // db.patch removes fields set to undefined
    } else if (args.logoStorageId) {
      const url = await ctx.storage.getUrl(args.logoStorageId);
      if (!url) throw new Error("Impossible de récupérer le logo");
      updates.logo = url;
    } else if (args.logo !== undefined) {
      updates.logo = args.logo;
    } else {
      const repaired = await repairLogoUrl(ctx, profile.logo);
      if (repaired !== profile.logo) updates.logo = repaired;
    }
    if (args.specialties !== undefined) updates.specialties = args.specialties;
    if (args.regions !== undefined) updates.regions = args.regions;

    await ctx.db.patch(profile._id, updates);
  },
});

/** Request the monthly supplier plan (payment pending — same procedure as Pro/Expert) */
export const requestSubscription = mutation({
  args: {
    paymentMethod: v.union(v.literal("bank_transfer"), v.literal("d17")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) throw new Error("Aucun profil fournisseur");
    if (profile.subscriptionStatus === "pending")
      throw new Error("Une demande d'abonnement est déjà en attente de validation");

    const price = await getSupplierPrice(ctx);
    const now = Date.now();

    await ctx.db.patch(profile._id, {
      plan: "monthly",
      subscriptionStatus: "pending",
      paymentMethod: args.paymentMethod,
      paymentAmount: price,
      paymentCurrency: "TND",
      paymentProofVerified: false,
      isVisible: false,
      updatedAt: now,
    });

    return { price };
  },
});

/** Upload the payment receipt (D17 screenshot or bank transfer proof) */
export const uploadSupplierPaymentProof = mutation({
  args: {
    storageId: v.id("_storage"),
    url: v.string(),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) throw new Error("Aucun profil fournisseur");
    if (profile.subscriptionStatus !== "pending")
      throw new Error("Aucune demande de paiement en attente");

    // Resolve the real storage URL server-side — client-built URLs are broken
    const resolvedUrl = (await ctx.storage.getUrl(args.storageId)) || args.url;
    await ctx.db.patch(profile._id, {
      paymentProofStorageId: args.storageId,
      paymentProofUrl: resolvedUrl,
      paymentProofFileName: args.fileName || "reçu_paiement",
      paymentProofUploadedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});


/** Admin: Approve a pending supplier subscription (payment verified) */
export const adminApproveSupplierSubscription = mutation({
  args: { profileId: v.id("supplierProfiles") },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator"))
      throw new Error("Unauthorized: Admin access required");

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Profil fournisseur introuvable");
    if (profile.subscriptionStatus !== "pending")
      throw new Error("Ce profil n'a pas de demande en attente");

    const now = Date.now();
    const endDate = now + MONTHLY_DAYS * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.profileId, {
      plan: "monthly",
      subscriptionStatus: "active",
      subscriptionStartDate: now,
      subscriptionEndDate: endDate,
      paymentProofVerified: true,
      isVisible: true,
      updatedAt: now,
    });

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "approve_supplier_subscription",
        targetUserId: profile.userId,
        targetUserEmail: profile.email,
        details: `Abonnement fournisseur approuvé — ${profile.companyName}`,
        createdAt: now,
      });
    } catch (e) { /* optional */ }

    try {
      await ctx.db.insert("notifications", {
        userId: profile.userId,
        type: "subscription",
        title: "Abonnement fournisseur activé",
        message: "Félicitations ! Votre paiement a été vérifié et votre profil fournisseur est désormais visible par les porteurs de projets.",
        read: false,
        link: "/supplier",
        createdAt: now,
      });
    } catch (e) { /* optional */ }

    // Send automatic email notification (supplier subscription activated)
    const supplierUser = await ctx.db.get(profile.userId);
    const to = profile.email || supplierUser?.email;
    if (to && supplierUser?.emailNotifications !== false) {
      await scheduleEmailEvent(ctx, {
        to,
        recipientName: profile.companyName,
        templateKey: "subscription_activated",
        vars: {
          nomEntreprise: profile.companyName,
          typeAbonnement: "Fournisseur",
          dateActivation: formatDateFr(now),
          dateExpiration: formatDateFr(endDate),
          montant: profile.paymentAmount ? `${profile.paymentAmount} TND` : undefined,
          numeroFacture: `INV-SUP-${profile._id}`,
        },
        dedupeKey: `supplier_activated:${to}:${profile._id}`,
        sendToAdmins: true,
      });
    }

    return { success: true };
  },
});

/** Admin: Reject a pending supplier subscription */
export const adminRejectSupplierSubscription = mutation({
  args: { profileId: v.id("supplierProfiles") },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator"))
      throw new Error("Unauthorized: Admin access required");

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Profil fournisseur introuvable");
    if (profile.subscriptionStatus !== "pending") {
      return { success: true, alreadyProcessed: true };
    }

    await ctx.db.patch(args.profileId, {
      subscriptionStatus: "inactive",
      paymentProofVerified: false,
      isVisible: false,
      updatedAt: Date.now(),
    });

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "reject_supplier_subscription",
        targetUserId: profile.userId,
        targetUserEmail: profile.email,
        details: `Abonnement fournisseur refusé — ${profile.companyName}`,
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }

    try {
      await ctx.db.insert("notifications", {
        userId: profile.userId,
        type: "subscription",
        title: "Abonnement fournisseur refusé",
        message: "Votre paiement n'a pas pu être vérifié. Contactez le support pour plus d'informations.",
        read: false,
        link: "/supplier",
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }

    // Send automatic email notification (payment rejected)
    const supplierUser = await ctx.db.get(profile.userId);
    const to = profile.email || supplierUser?.email;
    if (to && supplierUser?.emailNotifications !== false) {
      await scheduleEmailEvent(ctx, {
        to,
        recipientName: profile.companyName,
        templateKey: "payment_rejected",
        vars: {
          nomEntreprise: profile.companyName,
          typeAbonnement: "Fournisseur",
          montant: profile.paymentAmount ? `${profile.paymentAmount} TND` : undefined,
          numeroFacture: `INV-SUP-${profile._id}`,
        },
        dedupeKey: `supplier_rejected:${to}:${profile._id}`,
        sendToAdmins: true,
      });
    }

    return { success: true };
  },
});

/**
 * Toggle supplier visibility — VERROUILLÉ.
 *
 * Règle produit : la visibilité d'un profil fournisseur est gérée
 * automatiquement selon l'état du paiement (offre gratuite ou abonnement
 * actif = visible, sinon strictement invisible). L'utilisateur ne peut pas la
 * modifier ; seul l'administrateur contrôle le champ `isVisible` (voir
 * `adminToggleVisibility`).
 */
export const toggleVisibility = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) throw new Error("Aucun profil fournisseur");

    throw new Error(
      "La visibilité de votre profil est gérée automatiquement selon l'état de votre abonnement."
    );
  },
});

/** Delete supplier profile */
export const deleteProfile = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) throw new Error("Aucun profil fournisseur");

    await ctx.db.delete(profile._id);
  },
});

/** Admin: Delete any supplier profile */
export const adminDeleteProfile = mutation({
  args: { profileId: v.id("supplierProfiles") },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) throw new Error("Unauthorized: Admin access required");

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Profil fournisseur introuvable");

    // Also remove the payment receipt file from storage (permanent)
    if (profile.paymentProofStorageId) {
      try {
        await ctx.storage.delete(profile.paymentProofStorageId);
      } catch (e) { /* optional */ }
    }

    await ctx.db.delete(args.profileId);

    // Notify the supplier
    try {
      await ctx.db.insert("notifications", {
        userId: profile.userId,
        type: "system",
        title: "Profil fournisseur supprimé",
        message: "Votre profil fournisseur a été supprimé par l'administrateur. Contactez le support pour plus d'informations.",
        read: false,
        link: "/supplier",
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }
  },
});

/** Admin: Toggle supplier profile visibility */
export const adminToggleVisibility = mutation({
  args: { profileId: v.id("supplierProfiles") },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) throw new Error("Unauthorized: Admin access required");

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Profil fournisseur introuvable");

    await ctx.db.patch(args.profileId, {
      isVisible: !profile.isVisible,
      updatedAt: Date.now(),
    });
  },
});

/** Internal: Check supplier subscription statuses and send notifications (called by cron) */
export const checkSupplierNotifications = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    const free = await getFreePlanStatus(ctx);
    const allSuppliers = await ctx.db.query("supplierProfiles").collect();

    for (const profile of allSuppliers) {
      // « Offre gratuite » : pas d'expiration, espace toujours actif
      if (free.supplierFree) continue;

      // Check active subscription ending in 3 days
      if (
        profile.subscriptionStatus === "active" &&
        profile.subscriptionEndDate
      ) {
        const daysUntilEnd = Math.round((profile.subscriptionEndDate - now) / DAY_MS);

        if (daysUntilEnd === 3) {
          try {
            await ctx.db.insert("notifications", {
              userId: profile.userId,
              type: "subscription",
              title: "Abonnement bientôt expiré",
              message: "Votre abonnement fournisseur expire dans 3 jours. Renouvelez-le pour continuer à être recommandé aux porteurs de projets.",
              read: false,
              link: "/supplier",
              createdAt: now,
            });
          } catch (e) { /* optional */ }
        }

        // Subscription expired
        if (profile.subscriptionEndDate < now && profile.isVisible) {
          await ctx.db.patch(profile._id, { isVisible: false, updatedAt: now });
          try {
            await ctx.db.insert("notifications", {
              userId: profile.userId,
              type: "subscription",
              title: "Abonnement expiré",
              message: "Votre abonnement fournisseur a expiré. Votre profil a été masqué. Réabonnez-vous à 120 TND/mois pour réactiver votre visibilité.",
              read: false,
              link: "/supplier",
              createdAt: now,
            });
          } catch (e) { /* optional */ }
        }
      }
    }
  },
});

/** Admin: mark a supplier payment receipt as verified / unverified */
export const adminVerifySupplierReceipt = mutation({
  args: {
    profileId: v.id("supplierProfiles"),
    verified: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator"))
      throw new Error("Unauthorized: Admin access required");

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Profil fournisseur introuvable");

    await ctx.db.patch(args.profileId, {
      paymentProofVerified: args.verified,
      updatedAt: Date.now(),
    });

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: args.verified ? "verify_supplier_receipt" : "unverify_supplier_receipt",
        targetUserId: profile.userId,
        targetUserEmail: profile.email,
        details: `Reçu fournisseur ${args.verified ? "vérifié" : "non vérifié"} — ${profile.companyName}`,
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }

    // Send automatic email notification (payment confirmed)
    if (args.verified) {
      const supplierUser = await ctx.db.get(profile.userId);
      const to = profile.email || supplierUser?.email;
      if (to && supplierUser?.emailNotifications !== false) {
        await scheduleEmailEvent(ctx, {
          to,
          recipientName: profile.companyName,
          templateKey: "payment_confirmed",
          vars: {
            nomEntreprise: profile.companyName,
            typeAbonnement: "Fournisseur",
            montant: profile.paymentAmount ? `${profile.paymentAmount} TND` : undefined,
            numeroFacture: `INV-SUP-${profile._id}`,
            dateActivation: formatDateFr(profile.subscriptionStartDate),
            dateExpiration: formatDateFr(profile.subscriptionEndDate),
          },
          dedupeKey: `supplier_paid:${to}:${profile._id}`,
          sendToAdmins: true,
        });
      }
    }

    return { success: true };
  },
});

/** Admin: permanently delete a supplier payment receipt from storage (keeps the profile) */
export const adminDeleteSupplierReceipt = mutation({
  args: { profileId: v.id("supplierProfiles") },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator"))
      throw new Error("Unauthorized: Admin access required");

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Profil fournisseur introuvable");

    // Remove the file from storage (permanent)
    if (profile.paymentProofStorageId) {
      try {
        await ctx.storage.delete(profile.paymentProofStorageId);
      } catch (e) { /* optional */ }
    }

    await ctx.db.patch(args.profileId, {
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
        action: "delete_supplier_receipt",
        targetUserId: profile.userId,
        targetUserEmail: profile.email,
        details: `Reçu de paiement fournisseur supprimé définitivement — ${profile.companyName}`,
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }

    return { success: true };
  },
});

// ============================================================================
// Public: Random active supplier(s) per specialty
// ============================================================================

export const getRandomBySpecialty = query({
  args: {
    specialty: v.string(),
    limit: v.optional(v.number()),
    fallbackToAny: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 1;
    const now = Date.now();
    const free = await getFreePlanStatus(ctx);

    // Même politique d'éligibilité que quoteRequests.create et getActiveSuppliers :
    //  - « Offre gratuite » activée (switch admin) : tous les profils visibles
    //  - Sinon : abonnements actifs (non expirés) ou essai
    const allProfiles = await ctx.db
      .query("supplierProfiles")
      .collect();

    const visible = [];
    for (const p of allProfiles) {
      if (!p.isVisible) continue;
      // Paiement obligatoire : profil inactif / expiré = strictement invisible.
      if (await isProfilePaymentActive(ctx, free.supplierFree, p, now)) visible.push(p);
    }

    // 1. Try exact specialty match
    const matching = visible.filter(
      (p) => p.specialties.includes(args.specialty)
    );

    const selected = matching.length > 0
      ? [...matching].sort(() => Math.random() - 0.5).slice(0, limit)
      : args.fallbackToAny && visible.length > 0
        ? [...visible].sort(() => Math.random() - 0.5).slice(0, limit)
        : [];

    const withLogo = [];
    for (const p of selected) {
      withLogo.push({
        ...p,
        logo: await repairLogoUrl(ctx, p.logo),
      });
    }
    return withLogo;
  },
});
