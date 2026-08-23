import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { scheduleEmailEvent, formatDateFr } from "./emailNotifications";

// ============================================================================
// Constants
// ============================================================================

const MONTHLY_DAYS = 30;

async function getExpertPrice(ctx: any): Promise<number> {
  const config = await ctx.db.query("paymentConfig").order("desc").first();
  return config?.expertPrice ?? 150;
}

// ============================================================================
// Queries
// ============================================================================

/** Get the current user's expert profile */
export const getMyProfile = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const profile = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) return null;

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

    let remainingDays = 0;
    if (effectiveStatus === "active" && profile.subscriptionEndDate) {
      remainingDays = Math.max(
        0,
        Math.ceil((profile.subscriptionEndDate - now) / (24 * 60 * 60 * 1000))
      );
    }

    return { ...profile, effectiveStatus, remainingDays };
  },
});

/** Check if current user has an expert profile */
export const hasExpertProfile = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return false;
    const profile = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    return !!profile;
  },
});

/** Get a random active expert by profession (for frontend recommendation) */
export const getRandomByProfession = query({
  args: { profession: v.string() },
  handler: async (ctx, args) => {
    const experts = await ctx.db
      .query("expertProfiles")
      .withIndex("by_profession", (q) => q.eq("profession", args.profession as any))
      .collect();

    const active = experts.filter(
      (e) =>
        e.isVisible &&
        (e.subscriptionStatus === "active" || e.subscriptionStatus === "trial")
    );
    if (active.length === 0) return null;

    // Fisher-Yates shuffle and pick first
    for (let i = active.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [active[i], active[j]] = [active[j], active[i]];
    }
    return active[0];
  },
});

// ============================================================================
// Mutations
// ============================================================================

/** Create a new expert profile */
export const createProfile = mutation({
  args: {
    profession: v.union(
      v.literal("architecte"),
      v.literal("bureau_etudes"),
      v.literal("ingenieur"),
      v.literal("promoteur_immobilier"),
    ),
    displayName: v.string(),
    companyName: v.optional(v.string()),
    phone: v.string(),
    email: v.string(),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
    specialties: v.array(v.string()),
    regions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");

    const existing = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (existing) throw new Error("Profil expert déjà existant");

    const now = Date.now();
    const profileId = await ctx.db.insert("expertProfiles", {
      userId: user._id,
      profession: args.profession,
      displayName: args.displayName,
      companyName: args.companyName,
      phone: args.phone,
      email: args.email,
      address: args.address,
      website: args.website,
      description: args.description,
      logo: args.logo,
      specialties: args.specialties,
      regions: args.regions,
      plan: "none",
      subscriptionStatus: "inactive",
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    });

    // Log admin action
    try {
      await ctx.db.insert("adminLogs", {
        adminId: user._id,
        adminName: user.name || "Expert",
        action: "create_blog_post",
        details: `Profil expert créé — ${args.displayName} (${args.profession})`,
        createdAt: now,
      });
    } catch (e) {
      /* optional */
    }

    return { success: true, profileId };
  },
});

/** Update expert profile */
export const updateProfile = mutation({
  args: {
    profession: v.optional(
      v.union(
        v.literal("architecte"),
        v.literal("bureau_etudes"),
        v.literal("ingenieur"),
        v.literal("promoteur_immobilier"),
      )
    ),
    displayName: v.optional(v.string()),
    companyName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
    specialties: v.optional(v.array(v.string())),
    regions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");

    const profile = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) throw new Error("Profil expert introuvable");

    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (args.profession !== undefined) updates.profession = args.profession;
    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (args.companyName !== undefined) updates.companyName = args.companyName;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.email !== undefined) updates.email = args.email;
    if (args.address !== undefined) updates.address = args.address;
    if (args.website !== undefined) updates.website = args.website;
    if (args.description !== undefined) updates.description = args.description;
    if (args.logo !== undefined) updates.logo = args.logo;
    if (args.specialties !== undefined) updates.specialties = args.specialties;
    if (args.regions !== undefined) updates.regions = args.regions;

    await ctx.db.patch(profile._id, updates);
    return { success: true };
  },
});

/** Toggle expert profile visibility */
export const toggleVisibility = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");
    const profile = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) throw new Error("Profil expert introuvable");
    await ctx.db.patch(profile._id, {
      isVisible: !profile.isVisible,
      updatedAt: Date.now(),
    });
    return { success: true, isVisible: !profile.isVisible };
  },
});

/** Request subscription */
export const requestSubscription = mutation({
  args: {
    paymentMethod: v.union(v.literal("bank_transfer"), v.literal("d17")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");
    const profile = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) throw new Error("Profil expert introuvable");

    const price = await getExpertPrice(ctx);
    const now = Date.now();

    await ctx.db.patch(profile._id, {
      subscriptionStatus: "pending",
      paymentMethod: args.paymentMethod,
      paymentAmount: price,
      updatedAt: now,
    });

    return { success: true };
  },
});

/** Upload payment proof */
export const uploadExpertPaymentProof = mutation({
  args: {
    storageId: v.id("_storage"),
    url: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");
    const profile = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) throw new Error("Profil expert introuvable");

    await ctx.db.patch(profile._id, {
      paymentProofStorageId: args.storageId,
      paymentProofUrl: args.url,
      paymentProofFileName: args.fileName,
      paymentProofUploadedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/** Delete expert profile */
export const deleteProfile = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");
    const profile = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) throw new Error("Profil expert introuvable");

    await ctx.db.delete(profile._id);

    try {
      await ctx.db.insert("adminLogs", {
        adminId: user._id,
        adminName: user.name || "Expert",
        action: "create_blog_post",
        details: `Profil expert supprimé — ${profile.displayName}`,
        createdAt: Date.now(),
      });
    } catch (e) {
      /* optional */
    }

    return { success: true };
  },
});

// ============================================================================
// Admin Queries & Mutations
// ============================================================================

const EXPERT_MONTHLY_DAYS = 30;

/** Admin: Get all expert profiles with user data */
export const getAllExpertProfiles = query({
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
      return [];
    }

    const profiles = await ctx.db.query("expertProfiles").order("desc").collect();

    const result = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return {
          ...profile,
          subscriptionStatus:
            profile.subscriptionStatus === "trial" ? "inactive" : profile.subscriptionStatus,
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

/** Admin: Delete an expert profile */
export const adminDeleteExpertProfile = mutation({
  args: { profileId: v.id("expertProfiles") },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator"))
      throw new Error("Unauthorized: Admin access required");

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Profil expert introuvable");

    await ctx.db.delete(args.profileId);

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "delete_expert_profile",
        targetUserId: profile.userId,
        details: `Profil expert supprimé — ${profile.displayName}`,
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }

    return { success: true };
  },
});

/** Admin: Toggle expert profile visibility */
export const adminToggleExpertVisibility = mutation({
  args: { profileId: v.id("expertProfiles") },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator"))
      throw new Error("Unauthorized: Admin access required");

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Profil expert introuvable");

    await ctx.db.patch(args.profileId, {
      isVisible: !profile.isVisible,
      updatedAt: Date.now(),
    });

    return { success: true, isVisible: !profile.isVisible };
  },
});

/** Admin: Approve a pending expert subscription */
export const adminApproveExpertSubscription = mutation({
  args: { profileId: v.id("expertProfiles") },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator"))
      throw new Error("Unauthorized: Admin access required");

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Profil expert introuvable");
    if (profile.subscriptionStatus !== "pending")
      throw new Error("Ce profil n'a pas de demande en attente");

    const now = Date.now();
    const endDate = now + EXPERT_MONTHLY_DAYS * 24 * 60 * 60 * 1000;

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
        action: "approve_expert_subscription",
        targetUserId: profile.userId,
        targetUserEmail: profile.email,
        details: `Abonnement expert approuvé — ${profile.displayName}`,
        createdAt: now,
      });
    } catch (e) { /* optional */ }

    try {
      await ctx.db.insert("notifications", {
        userId: profile.userId,
        type: "subscription",
        title: "Abonnement expert activé",
        message: "Félicitations ! Votre paiement a été vérifié et votre profil expert est désormais visible.",
        read: false,
        link: "/dashboard/expert",
        createdAt: now,
      });
    } catch (e) { /* optional */ }

    const expertUser = await ctx.db.get(profile.userId);
    const to = profile.email || expertUser?.email;
    if (to && expertUser?.emailNotifications !== false) {
      await scheduleEmailEvent(ctx, {
        to,
        recipientName: profile.displayName,
        templateKey: "subscription_activated",
        vars: {
          nomEntreprise: profile.displayName,
          typeAbonnement: "Expert",
          dateActivation: formatDateFr(now),
          dateExpiration: formatDateFr(endDate),
          montant: profile.paymentAmount ? `${profile.paymentAmount} TND` : undefined,
          numeroFacture: `INV-EXP-${profile._id}`,
        },
        dedupeKey: `expert_activated:${to}:${profile._id}`,
        sendToAdmins: true,
      });
    }

    return { success: true };
  },
});

/** Admin: Reject a pending expert subscription */
export const adminRejectExpertSubscription = mutation({
  args: { profileId: v.id("expertProfiles") },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator"))
      throw new Error("Unauthorized: Admin access required");

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Profil expert introuvable");
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
        action: "reject_expert_subscription",
        targetUserId: profile.userId,
        targetUserEmail: profile.email,
        details: `Abonnement expert rejeté — ${profile.displayName}`,
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }

    return { success: true };
  },
});

/** Admin: Verify expert payment receipt */
export const adminVerifyExpertReceipt = mutation({
  args: { profileId: v.id("expertProfiles") },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator"))
      throw new Error("Unauthorized: Admin access required");

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Profil expert introuvable");

    await ctx.db.patch(args.profileId, {
      paymentProofVerified: true,
      updatedAt: Date.now(),
    });

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "verify_expert_receipt",
        targetUserId: profile.userId,
        targetUserEmail: profile.email,
        details: `Reçu expert vérifié — ${profile.displayName}`,
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }

    return { success: true };
  },
});

/** Admin: Delete expert payment receipt */
export const adminDeleteExpertReceipt = mutation({
  args: { profileId: v.id("expertProfiles") },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator"))
      throw new Error("Unauthorized: Admin access required");

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Profil expert introuvable");

    await ctx.db.patch(args.profileId, {
      paymentProofStorageId: undefined,
      paymentProofUrl: undefined,
      paymentProofFileName: undefined,
      paymentProofUploadedAt: undefined,
      paymentProofVerified: undefined,
      updatedAt: Date.now(),
    });

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "delete_expert_receipt",
        targetUserId: profile.userId,
        details: `Reçu expert supprimé — ${profile.displayName}`,
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }

    return { success: true };
  },
});
