import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { roleValidator, subscriptionPlanValidator } from "./schema";
import bcrypt from "bcryptjs";
import { P, runBIMEstimation } from "./bimEngine";
import { scheduleEmailEvent, formatDateFr, planLabel, splitName } from "./emailNotifications";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Usage: const signedInUser = await ctx.runQuery(api.authHelpers.currentUser);
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (user === null) {
      return null;
    }

    return user;
  },
});

/**
 * Check if at least one admin exists in the system
 */
export const checkAdminExists = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.some((u) => u.role === "admin");
  },
});

/**
 * Get all users (admin only, returns empty if not admin)
 */
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      return [];
    }

    const users = await ctx.db.query("users").collect();

    // Sort by creation date descending
    return users.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },
});

/**
 * Admin: update user role
 */
export const adminUpdateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
    });

    const targetUser = await ctx.db.get(args.userId);
    await logAdminAction(
      ctx, admin, "update_user_role",
      { userId: args.userId, email: targetUser?.email },
      `Rôle changé en ${args.role === "admin" ? "Administrateur" : "Utilisateur"}`,
    );
  },
});

/**
 * Admin: update user subscription plan
 */
export const adminUpdateUserPlan = mutation({
  args: {
    userId: v.id("users"),
    plan: subscriptionPlanValidator,
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const now = Date.now();
    const planDuration = args.plan === "pro" ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.userId, {
      subscriptionPlan: args.plan,
      subscriptionEndDate: now + planDuration,
    });

    // Also update/create subscription record
    const existingSub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    if (existingSub && existingSub.status === "active") {
      await ctx.db.patch(existingSub._id, {
        plan: args.plan,
        endDate: now + planDuration,
        updatedAt: now,
      });
    } else {
      // Read dynamic download limits from payment config
      const paymentConfig = await ctx.db
        .query("paymentConfig")
        .order("desc")
        .first();
      const expertLimit = paymentConfig?.expertDownloadLimit ?? 100;
      const proLimit = paymentConfig?.proDownloadLimit ?? 10;
      const limit = args.plan === "expert" ? expertLimit : args.plan === "pro" ? proLimit : 0;

      await ctx.db.insert("subscriptions", {
        userId: args.userId,
        plan: args.plan,
        status: "active",
        startDate: now,
        endDate: now + planDuration,
        paymentMethod: "admin",
        amount: args.plan === "pro" ? 79 : args.plan === "expert" ? 320 : 0,
        currency: "TND",
        monthlyDownloadCount: 0,
        downloadLimit: limit,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Update current user's profile (name, company, phone)
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    emailNotifications: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    const patch: Record<string, any> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.company !== undefined) patch.company = args.company;
    if (args.phone !== undefined) patch.phone = args.phone;
    if (args.emailNotifications !== undefined) patch.emailNotifications = args.emailNotifications;

    await ctx.db.patch(user._id, patch);
    return { success: true };
  },
});

/**
 * Generate a URL for client-side file upload to Convex storage
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Upload profile photo — stores image in Convex storage and saves URL
 */
export const updateProfileImage = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) throw new Error("Impossible de récupérer l'image");

    await ctx.db.patch(user._id, { image: imageUrl });
    return { url: imageUrl };
  },
});

/**
 * Self-promote to admin (only works if no admin exists yet)
 */
export const makeMeAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    // Check if any admin exists
    const allUsers = await ctx.db.query("users").collect();
    const hasAdmin = allUsers.some((u) => u.role === "admin");

    if (hasAdmin) {
      throw new Error("Un administrateur existe déjà. Contactez-le pour obtenir les droits.");
    }

    await ctx.db.patch(user._id, { role: "admin" });
    return { success: true };
  },
});

/**
 * Seed initial demo data (materials + auto-admin)
 */
export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    const now = Date.now();
    const results: string[] = [];

    // 1. Always promote the current user to admin
    if (user.role !== "admin") {
      await ctx.db.patch(user._id, { role: "admin" });
      results.push("✅ Vous êtes maintenant administrateur");
    } else {
      results.push("ℹ️ Vous êtes déjà administrateur");
    }

    // 2. Seed materials if empty
    const existingMaterials = await ctx.db.query("materialPrices").first();
    if (!existingMaterials) {
      // Use material prices from bimEngine
      const materials: { category: string; name: string; unit: string; unitPrice: number }[] = [];

      // ... use same seed logic as seedMaterialPrices
      for (const [key, val] of Object.entries(P)) {
        if (typeof val !== "object" || val === null) continue;
        const v = val as Record<string, number>;
        if (key === "cement") {
          materials.push(
            { category: "ciment", name: "Ciment CPJ 42.5 (Sac 50kg)", unit: "sacs", unitPrice: v.bag42_5 },
            { category: "ciment", name: "Ciment CPJ 32.5 (Sac 50kg)", unit: "sacs", unitPrice: v.bag32_5 },
          );
        } else if (key === "sand") {
          materials.push(
            { category: "sable", name: "Sable de construction 0/4", unit: "m³", unitPrice: v.construction },
            { category: "sable", name: "Sable fin", unit: "m³", unitPrice: v.fine },
          );
        } else if (key === "gravel") {
          materials.push(
            { category: "gravier", name: "Gravier 15/25mm", unit: "m³", unitPrice: v["15_25mm"] },
            { category: "gravier", name: "Gravier 8/15mm", unit: "m³", unitPrice: v["8_15mm"] },
          );
        } else if (key === "bricks") {
          materials.push(
            { category: "briques", name: "Brique creuse 10cm", unit: "unités", unitPrice: v.hollow_10 },
            { category: "briques", name: "Brique creuse 15cm", unit: "unités", unitPrice: v.hollow_15 },
            { category: "briques", name: "Hourdis 16x50", unit: "unités", unitPrice: v.hourdis_16 },
            { category: "parpaings", name: "Parpaing creux 15cm", unit: "unités", unitPrice: v.parpaing_15 },
            { category: "parpaings", name: "Parpaing creux 20cm", unit: "unités", unitPrice: v.parpaing_20 },
          );
        } else if (key === "concrete") {
          materials.push(
            { category: "beton", name: "Béton prêt 250 kg/m³", unit: "m³", unitPrice: v.ready_mix_250 },
            { category: "beton", name: "Béton prêt 300 kg/m³", unit: "m³", unitPrice: v.ready_mix_300 },
            { category: "beton", name: "Béton prêt 350 kg/m³", unit: "m³", unitPrice: v.ready_mix_350 },
          );
        } else if (key === "steel") {
          materials.push(
            { category: "acier", name: "Acier T6 (mètre)", unit: "m", unitPrice: v.t6_m },
            { category: "acier", name: "Acier T8 (mètre)", unit: "m", unitPrice: v.t8_m },
            { category: "acier", name: "Acier T10 (mètre)", unit: "m", unitPrice: v.t10_m },
            { category: "acier", name: "Acier T12 (tonne)", unit: "tonnes", unitPrice: v.t12_ton },
          );
        } else if (key === "tiles") {
          materials.push(
            { category: "carrelage", name: "Carrelage sol grès cérame", unit: "m²", unitPrice: v.floor_m2 },
            { category: "carrelage", name: "Carrelage mural faïence", unit: "m²", unitPrice: v.wall_m2 },
            { category: "marbre", name: "Marbre", unit: "m²", unitPrice: v.marble_m2 },
            { category: "carrelage", name: "Plinthe céramique", unit: "ml", unitPrice: v.plinthe_ml },
          );
        } else if (key === "paint") {
          materials.push(
            { category: "peinture", name: "Peinture intérieure mate", unit: "litres", unitPrice: v.interior_l },
            { category: "peinture", name: "Peinture extérieure acrylique", unit: "litres", unitPrice: v.exterior_l },
          );
        } else if (key === "plumbing") {
          materials.push(
            { category: "plomberie", name: "Tuyau PVC Ø110", unit: "ml", unitPrice: v.pvc_110 },
            { category: "plomberie", name: "Tuyau PVC Ø50", unit: "ml", unitPrice: v.pvc_50 },
            { category: "plomberie", name: "Chauffe-eau électrique 80L", unit: "unités", unitPrice: v.geyser },
            { category: "plomberie", name: "WC complet", unit: "unités", unitPrice: v.wc },
          );
        } else if (key === "electrical") {
          materials.push(
            { category: "electricite", name: "Câble électrique 2.5mm²", unit: "ml", unitPrice: v.cable_2_5_m },
            { category: "electricite", name: "Disjoncteur 20A", unit: "unités", unitPrice: v.breaker },
            { category: "electricite", name: "Tableau électrique 13 modules", unit: "unités", unitPrice: v.panel },
            { category: "electricite", name: "Luminaire LED", unit: "unités", unitPrice: v.led_light },
          );
        } else if (key === "doors") {
          materials.push(
            { category: "portes", name: "Porte intérieure bois", unit: "unités", unitPrice: v.simple },
            { category: "portes", name: "Porte d'entrée métallique", unit: "unités", unitPrice: v.metal },
          );
        } else if (key === "windows") {
          materials.push(
            { category: "fenetres", name: "Fenêtre alu simple vitrage", unit: "unités", unitPrice: v.alu_simple },
            { category: "fenetres", name: "Grille de protection métallique", unit: "unités", unitPrice: v.iron_grille },
          );
        } else if (key === "roofing") {
          materials.push(
            { category: "toiture", name: "Tuile canal rouge", unit: "m²", unitPrice: v.tile_m2 },
            { category: "etancheite", name: "Étanchéité liquide", unit: "m²", unitPrice: v.waterproof_m2 },
            { category: "isolation", name: "Isolation thermique", unit: "m²", unitPrice: v.insulation_m2 },
          );
        } else if (key === "labor") {
          materials.push(
            { category: "main_oeuvre", name: "Maçon qualifié (jour)", unit: "jours", unitPrice: v.mason_day },
            { category: "main_oeuvre", name: "Manœuvre (jour)", unit: "jours", unitPrice: v.worker_day },
            { category: "main_oeuvre", name: "Électricien (jour)", unit: "jours", unitPrice: v.electrician_day },
            { category: "main_oeuvre", name: "Plombier (jour)", unit: "jours", unitPrice: v.plumber_day },
          );
        } else if (key === "transport") {
          materials.push(
            { category: "transport", name: "Transport benne 10t", unit: "voyages", unitPrice: v.truck_trip },
            { category: "transport", name: "Bétonnière portée", unit: "m³", unitPrice: v.mixer_m3 },
          );
        } else if (key === "equipment") {
          materials.push(
            { category: "location_engins", name: "Pelle mécanique (jour)", unit: "jours", unitPrice: v.excavator_day },
            { category: "location_engins", name: "Compacteur (jour)", unit: "jours", unitPrice: v.compactor_day },
            { category: "location_engins", name: "Bétonnière électrique (jour)", unit: "jours", unitPrice: v.mixer_day },
          );
        }
      }

      materials.push(
        { category: "bois", name: "Bois de coffrage", unit: "m³", unitPrice: 650 },
        { category: "bois", name: "Bois de charpente", unit: "m³", unitPrice: 750 },
        { category: "revetements", name: "Enduit de lissage", unit: "kg", unitPrice: 1.2 },
        { category: "revetements", name: "Placoplâtre BA13", unit: "m²", unitPrice: 20 },
        { category: "fondations", name: "Fouilles en rigole", unit: "m³", unitPrice: 18 },
        { category: "terrassement", name: "Terrassement mécanique", unit: "m³", unitPrice: 25 },
        { category: "finition", name: "Corniche en plâtre", unit: "ml", unitPrice: 8 },
        { category: "divers", name: "Treillis soudé ST25", unit: "m²", unitPrice: 12 },
      );

      for (const m of materials) {
        await ctx.db.insert("materialPrices", {
          category: m.category as any,
          name: m.name,
          unit: m.unit,
          unitPrice: m.unitPrice,
          currency: "TND",
          lastUpdated: now,
          updatedBy: user._id,
        });
      }
      results.push(`✅ ${materials.length} matériaux ajoutés`);
    } else {
      results.push("ℹ️ Matériaux déjà existants, aucun doublon créé");
    }

    // 3. Create a demo project
    const existingProjects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!existingProjects) {
      // Run BIM estimation for a demo project
      const demoResult = runBIMEstimation("maison", 150, 1, "tunis", "standard");

      await ctx.db.insert("projects", {
        userId: user._id,
        name: "Projet de construction",
        category: "maison",
        status: "completed",
        description: "Projet de démonstration généré automatiquement. Projet de construction RDC de 150m² à Tunis.",
        region: "tunis",
        surface: 150,
        floors: 1,
        costEstimate: demoResult.costEstimate as any,
        aiAnalysis: demoResult.aiAnalysis as any,
        optimizationTips: demoResult.optimizationTips,
        technicalRecommendations: demoResult.technicalRecommendations,
        isFavorite: true,
        createdAt: now,
        updatedAt: now,
      });
      results.push("✅ Projet démo créé : Maison 150m²");
    }

    return { success: true, messages: results };
  },
});

/**
 * Admin: delete a user and all associated data
 */
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Cannot delete yourself
    if (admin._id === args.userId) {
      throw new Error("Vous ne pouvez pas supprimer votre propre compte.");
    }

    const userId = args.userId;
    const targetUser = await ctx.db.get(userId);
    if (!targetUser) throw new Error("Utilisateur introuvable");

    // 1. Delete all user's projects
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const project of projects) {
      await ctx.db.delete(project._id);
    }

    // 2. Delete all user's subscriptions
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const sub of subscriptions) {
      await ctx.db.delete(sub._id);
    }

    // 3. Delete all user's notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const notif of notifications) {
      await ctx.db.delete(notif._id);
    }

    // 4. Delete all user's reports
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const report of reports) {
      await ctx.db.delete(report._id);
    }

    // 5. Delete auth accounts linked to this user
    const authAccounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const account of authAccounts) {
      await ctx.db.delete(account._id);
    }

    // 6. Delete auth sessions linked to this user
    const sessions = await ctx.db
      .query("authSessions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    // 7. Delete verification codes linked to this user (via auth accounts)
    const accountIds = authAccounts.map((a) => a._id);
    for (const accId of accountIds) {
      const verifications = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", accId))
        .collect();
      for (const verif of verifications) {
        await ctx.db.delete(verif._id);
      }
    }

    // 8. Finally, delete the user document
    await ctx.db.delete(userId);

    // Log the action
    await logAdminAction(
      ctx, admin, "delete_user",
      { userId, email: targetUser?.email },
      targetUser?.name || "Utilisateur supprimé",
    );

    return { success: true };
  },
});

/**
 * Reset password using a verified email (OTP verified).
 * Finds the auth account for the given email with provider "password"
 * and updates the password hash.
 */
export const resetPassword = mutation({
  args: {
    email: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate password length
    if (args.newPassword.length < 8) {
      throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
    }

    // Find user by email
    const users = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .collect();

    if (users.length === 0) {
      throw new Error("Aucun compte trouvé avec cet email.");
    }

    const user = users[0];

    // Find the auth account for this user with password provider
    const authAccounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    const passwordAccount = authAccounts.find(a => a.provider === "password");

    if (!passwordAccount) {
      throw new Error("Aucun compte mot de passe trouvé. Utilisez la connexion rapide par email.");
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(args.newPassword, salt);

    // Update the password hash (cast needed as authAccounts type from authTables doesn't expose passwordHash)
    await ctx.db.patch(passwordAccount._id, {
      passwordHash,
    } as any);

    return { success: true };
  },
});

// ============================================================================
// Admin Action Logging Helper
// ============================================================================

async function logAdminAction(
  ctx: QueryCtx & { db: any },
  admin: { _id: any; name?: string },
  action: string,
  target?: { userId?: any; email?: string },
  details?: string,
) {
  await ctx.db.insert("adminLogs", {
    adminId: admin._id,
    adminName: admin.name,
    action,
    targetUserId: target?.userId,
    targetUserEmail: target?.email,
    details: details || null,
    createdAt: Date.now(),
  });
}

// ============================================================================
// Admin Logs Query
// ============================================================================

export const getAdminLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      return [];
    }

    const limit = args.limit ?? 100;
    const logs = await ctx.db
      .query("adminLogs")
      .order("desc")
      .take(limit);

    return logs;
  },
});

// ============================================================================
// Admin: Toggle user active/disabled status
// ============================================================================

export const toggleUserStatus = mutation({
  args: {
    userId: v.id("users"),
    status: v.union(v.literal("active"), v.literal("disabled")),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    if (admin._id === args.userId) {
      throw new Error("Vous ne pouvez pas désactiver votre propre compte.");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("Utilisateur introuvable");

    await ctx.db.patch(args.userId, { status: args.status });

    await logAdminAction(
      ctx, admin, "toggle_user_status",
      { userId: args.userId, email: targetUser.email },
      args.status === "disabled" ? "Compte désactivé" : "Compte réactivé",
    );

    // Send automatic email notification (subscription suspended)
    if (args.status === "disabled" && targetUser.email && targetUser.emailNotifications !== false) {
      const activeSub = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .order("desc")
        .first();
      await scheduleEmailEvent(ctx, {
        to: targetUser.email,
        recipientName: targetUser.name || undefined,
        templateKey: "subscription_suspended",
        vars: {
          ...splitName(targetUser.name),
          typeAbonnement: planLabel(targetUser.subscriptionPlan),
          dateActivation: formatDateFr(activeSub?.startDate),
          dateExpiration: formatDateFr(activeSub?.endDate),
        },
        dedupeKey: `subscription_suspended:${targetUser.email}:${args.userId}`,
        sendToAdmins: true,
      });
    }

    return { success: true };
  },
});

// ============================================================================
// Admin: Batch delete users
// ============================================================================

export const batchDeleteUsers = mutation({
  args: {
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const deleted: string[] = [];
    const errors: string[] = [];

    for (const userId of args.userIds) {
      if (admin._id === userId) {
        errors.push("Vous ne pouvez pas supprimer votre propre compte");
        continue;
      }

      try {
        const targetUser = await ctx.db.get(userId);
        if (!targetUser) {
          errors.push("Utilisateur introuvable");
          continue;
        }

        // Delete projects
        const projects = await ctx.db
          .query("projects")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();
        for (const p of projects) await ctx.db.delete(p._id);

        // Delete subscriptions
        const subs = await ctx.db
          .query("subscriptions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();
        for (const s of subs) await ctx.db.delete(s._id);

        // Delete notifications
        const notifs = await ctx.db
          .query("notifications")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();
        for (const n of notifs) await ctx.db.delete(n._id);

        // Delete reports
        const reports = await ctx.db
          .query("reports")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();
        for (const r of reports) await ctx.db.delete(r._id);

        // Delete auth accounts
        const authAccounts = await ctx.db
          .query("authAccounts")
          .filter((q) => q.eq(q.field("userId"), userId))
          .collect();
        for (const a of authAccounts) {
          // Also delete verification codes
          const verifs = await ctx.db
            .query("authVerificationCodes")
            .withIndex("accountId", (q) => q.eq("accountId", a._id))
            .collect();
          for (const v of verifs) await ctx.db.delete(v._id);

          await ctx.db.delete(a._id);
        }

        // Delete sessions
        const sessions = await ctx.db
          .query("authSessions")
          .filter((q) => q.eq(q.field("userId"), userId))
          .collect();
        for (const ses of sessions) await ctx.db.delete(ses._id);

        // Delete user
        await ctx.db.delete(userId);
        deleted.push(targetUser.email || targetUser.name || userId);
      } catch (err: any) {
        errors.push(err.message);
      }
    }

    // Log the batch action
    await logAdminAction(
      ctx, admin, "batch_delete_users",
      undefined,
      `${deleted.length} utilisateur(s) supprimé(s)` + (errors.length ? `, ${errors.length} erreur(s)` : ""),
    );

    return { success: true, deleted, errors };
  },
});

/**
 * Use this function internally to get the current user data. Remember to handle the null user case.
 * @param ctx
 * @returns
 */
export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  return await ctx.db.get(userId);
};
