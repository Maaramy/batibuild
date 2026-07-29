import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { SUPPLIER_SPECIALTIES_LABELS } from "./schema";

// ============================================================================
// Constants
// ============================================================================

const TRIAL_DAYS = 7;
const MONTHLY_PRICE = 120; // TND/month
const MONTHLY_DAYS = 30;

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

    // Check if trial has expired
    const now = Date.now();
    let effectiveStatus = profile.subscriptionStatus;
    if (
      effectiveStatus === "trial" &&
      profile.trialStartDate &&
      profile.trialStartDate + TRIAL_DAYS * 24 * 60 * 60 * 1000 < now
    ) {
      effectiveStatus = "expired";
    }
    if (
      effectiveStatus === "active" &&
      profile.subscriptionEndDate &&
      profile.subscriptionEndDate < now
    ) {
      effectiveStatus = "expired";
    }

    // Calculate remaining days
    let remainingDays = 0;
    if (effectiveStatus === "trial" && profile.trialStartDate) {
      remainingDays = Math.max(
        0,
        Math.ceil(
          (profile.trialStartDate + TRIAL_DAYS * 24 * 60 * 60 * 1000 - now) /
            (24 * 60 * 60 * 1000)
        )
      );
    } else if (effectiveStatus === "active" && profile.subscriptionEndDate) {
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
      TRIAL_DAYS,
      MONTHLY_PRICE,
    };
  },
});

/** Get all active/trial supplier profiles (for recommendations) */
export const getActiveSuppliers = query({
  handler: async (ctx) => {
    const now = Date.now();
    const suppliers = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_subscription", (q) =>
        q.eq("subscriptionStatus", "active")
      )
      .collect();

    // Also get trial suppliers (not expired)
    const trialSuppliers = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_subscription", (q) => q.eq("subscriptionStatus", "trial"))
      .collect();

    const allSuppliers = [...suppliers, ...trialSuppliers];

    return allSuppliers
      .filter((s) => s.isVisible)
      .filter((s) => {
        // Filter out expired trials
        if (
          s.subscriptionStatus === "trial" &&
          s.trialStartDate &&
          s.trialStartDate + TRIAL_DAYS * 24 * 60 * 60 * 1000 < now
        ) {
          return false;
        }
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

/** Start 7-day free trial */
export const startTrial = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) throw new Error("Aucun profil fournisseur");

    if (profile.subscriptionStatus === "trial") {
      throw new Error("Vous avez déjà utilisé votre essai gratuit");
    }
    if (profile.subscriptionStatus === "active") {
      throw new Error("Vous êtes déjà abonné");
    }

    const now = Date.now();
    await ctx.db.patch(profile._id, {
      plan: "trial",
      subscriptionStatus: "trial",
      trialStartDate: now,
      subscriptionEndDate: now + TRIAL_DAYS * 24 * 60 * 60 * 1000,
      isVisible: true,
      updatedAt: now,
    });

    return { trialDays: TRIAL_DAYS };
  },
});

/** Activate monthly subscription (120 TND/month - virement) */
export const activateSubscription = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) throw new Error("Aucun profil fournisseur");

    const now = Date.now();
    const endDate = now + MONTHLY_DAYS * 24 * 60 * 60 * 1000;

    await ctx.db.patch(profile._id, {
      plan: "monthly",
      subscriptionStatus: "active",
      subscriptionStartDate: now,
      subscriptionEndDate: endDate,
      isVisible: true,
      updatedAt: now,
    });

    return { monthlyPrice: MONTHLY_PRICE };
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
      // Check trial ending in 2 days
      if (
        profile.subscriptionStatus === "trial" &&
        profile.trialStartDate
      ) {
        const trialEnd = profile.trialStartDate + TRIAL_DAYS * DAY_MS;
        const daysUntilEnd = Math.round((trialEnd - now) / DAY_MS);

        if (daysUntilEnd === 2) {
          try {
            await ctx.db.insert("notifications", {
              userId: profile.userId,
              type: "subscription",
              title: "Essai gratuit bientôt terminé",
              message: "Votre essai gratuit de 7 jours se termine dans 2 jours. Souscrivez à l'abonnement à 120 TND/mois pour continuer à apparaître dans les recommandations.",
              read: false,
              link: "/supplier",
              createdAt: now,
            });
          } catch (e) { /* optional */ }
        }

        // Trial expired
        if (trialEnd < now && profile.isVisible) {
          await ctx.db.patch(profile._id, { isVisible: false, updatedAt: now });
          try {
            await ctx.db.insert("notifications", {
              userId: profile.userId,
              type: "subscription",
              title: "Essai gratuit terminé",
              message: "Votre essai gratuit de 7 jours est terminé. Votre profil a été masqué. Abonnez-vous à 120 TND/mois pour réactiver votre visibilité.",
              read: false,
              link: "/supplier",
              createdAt: now,
            });
          } catch (e) { /* optional */ }
        }
      }

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
