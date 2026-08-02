import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { SUPPLIER_SPECIALTIES_LABELS } from "./schema";

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
  return config?.supplierPrice ?? 120;
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

    // Trial period removed — legacy trial profiles are treated as inactive
    const now = Date.now();
    let effectiveStatus =
      profile.subscriptionStatus === "trial"
        ? "inactive"
        : profile.subscriptionStatus;
    if (
      effectiveStatus === "active" &&
      profile.subscriptionEndDate &&
      profile.subscriptionEndDate < now
    ) {
      effectiveStatus = "expired";
    }

    // Calculate remaining days
    let remainingDays = 0;
    if (effectiveStatus === "active" && profile.subscriptionEndDate) {
      remainingDays = Math.max(
        0,
        Math.ceil(
          (profile.subscriptionEndDate - now) / (24 * 60 * 60 * 1000)
        )
      );
    }

    return {
      ...profile,
      specialtiesLabels: profile.specialties.map(
        (s) => SUPPLIER_SPECIALTIES_LABELS[s] || s
      ),
      effectiveStatus,
      remainingDays,
      plan: profile.plan || "none",
      price: await getSupplierPrice(ctx),
    };
  },
});

/** Get all active supplier profiles (for recommendations) */
export const getActiveSuppliers = query({
  handler: async (ctx) => {
    const now = Date.now();
    const suppliers = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_subscription", (q) =>
        q.eq("subscriptionStatus", "active")
      )
      .collect();

    return suppliers
      .filter((s) => s.isVisible)
      .filter((s) => {
        // Filter out expired monthly
        if (
          s.subscriptionStatus === "active" &&
          s.subscriptionEndDate &&
          s.subscriptionEndDate < now
        ) {
          return false;
        }
        return true;
      })
      .map((s) => ({
        _id: s._id,
        companyName: s.companyName,
        phone: s.phone,
        email: s.email,
        address: s.address,
        website: s.website,
        description: s.description,
        specialties: s.specialties,
        regions: s.regions,
        plan: s.plan,
      }));
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
    if (!admin || admin.role !== "admin") {
      return [];
    }

    const profiles = await ctx.db.query("supplierProfiles").order("desc").collect();

    const result = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return {
          ...profile,
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
    return {
      companyName: profile.companyName,
      phone: profile.phone,
      email: profile.email,
      address: profile.address,
      website: profile.website,
      description: profile.description,
      specialties: profile.specialties,
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

    const now = Date.now();
    const profileId = await ctx.db.insert("supplierProfiles", {
      userId: user._id,
      companyName: args.companyName,
      phone: args.phone,
      email: args.email,
      address: args.address,
      website: args.website,
      description: args.description,
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

    await ctx.db.patch(profile._id, {
      paymentProofStorageId: args.storageId,
      paymentProofUrl: args.url,
      paymentProofFileName: args.fileName || "reçu_paiement",
      paymentProofUploadedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/** Admin: Attach a payment proof file to a supplier profile (same as subscriptions) */
export const adminUploadSupplierPaymentProof = mutation({
  args: {
    profileId: v.id("supplierProfiles"),
    storageId: v.id("_storage"),
    url: v.string(),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin")
      throw new Error("Unauthorized: Admin access required");

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Profil fournisseur introuvable");

    await ctx.db.patch(args.profileId, {
      paymentProofStorageId: args.storageId,
      paymentProofUrl: args.url,
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
    if (!admin || admin.role !== "admin")
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

    return { success: true };
  },
});

/** Admin: Reject a pending supplier subscription */
export const adminRejectSupplierSubscription = mutation({
  args: { profileId: v.id("supplierProfiles") },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin")
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

    return { success: true };
  },
});

/** Toggle supplier visibility */
export const toggleVisibility = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) throw new Error("Aucun profil fournisseur");

    await ctx.db.patch(profile._id, {
      isVisible: !profile.isVisible,
      updatedAt: Date.now(),
    });
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
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized: Admin access required");

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Profil fournisseur introuvable");

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
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized: Admin access required");

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

    const allSuppliers = await ctx.db.query("supplierProfiles").collect();

    for (const profile of allSuppliers) {
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
