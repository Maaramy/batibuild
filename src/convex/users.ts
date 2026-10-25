import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { roleValidator, subscriptionPlanValidator } from "./schema";

/** Libellés FR des rôles système (journal admin). */
const ROLE_LOG_LABELS: Record<string, string> = {
  admin: "Administrateur",
  moderator: "Modérateur",
  support_agent: "Agent support",
  user: "Utilisateur",
};
import { P, runBIMEstimation } from "./bimEngine";
import { applyRealisticDoorsWindows } from "./bimQuantitatif";
import { scheduleEmailEvent, formatDateFr, planLabel, splitName } from "./emailNotifications";
import { DAY_MS, MONTHLY_DURATION_DAYS } from "./subscriptionPeriods";
import {
  PLAN_VALUE_LABELS,
  PROFILE_ROLE_LABELS,
  checkProfileSubscriptionCompatibility,
  expectedPlanForProfile,
  getReferenceSubscriptionPlan,
  pickActiveSubscription,
  pickReferenceSubscription,
  planFromProfileSubscription,
  resolveProfileRole,
  resolveProfileRoleFrom,
  type ReferenceSubscriptionDoc,
} from "./profileSubscription";

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
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
      return [];
    }

    const users = await ctx.db.query("users").collect();

    // ── Vérité serveur profil ↔ abonnement (une seule lecture par table) ──
    // L'administration affiche le profil RÉSOLU (userRole, sinon profil
    // expert/fournisseur existant) et l'abonnement de RÉFÉRENCE (mensuel
    // actif, sinon le plus récent), puis la compatibilité calculée par la
    // MÊME fonction que le reste du backend. Sans cela, un compte qui a
    // choisi « Expert » à l'inscription mais dont le champ `userRole` n'a
    // jamais été écrit affichait à tort un « ! » dans la colonne Inscription.
    const expertRows = await ctx.db.query("expertProfiles").collect();
    const supplierRows = await ctx.db.query("supplierProfiles").collect();
    const subscriptionRows = (await ctx.db.query("subscriptions").collect()) as unknown as Array<
      ReferenceSubscriptionDoc & { userId: Id<"users"> }
    >;

    const expertByUser = new Map(expertRows.map((p) => [String(p.userId), p] as const));
    const supplierByUser = new Map(supplierRows.map((p) => [String(p.userId), p] as const));
    const subsByUser = new Map<string, ReferenceSubscriptionDoc[]>();
    for (const sub of subscriptionRows) {
      const key = String(sub.userId);
      const list = subsByUser.get(key);
      if (list) list.push(sub);
      else subsByUser.set(key, [sub]);
    }
    const now = Date.now();

    // Sort by creation date descending
    return users.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).map((u) => {
      const key = String(u._id);
      const profileRole = resolveProfileRoleFrom(u, {
        hasExpertProfile: expertByUser.has(key),
        hasSupplierProfile: supplierByUser.has(key),
      });
      const subs = subsByUser.get(key) ?? [];
      // Priorité d'affichage du forfait :
      //   1. abonnement mensuel ACTIF (`subscriptions`) — Client Pro notamm. ;
      //   2. forfait porté par un profil Expert / Fournisseur actif — les
      //      activations Expert et Fournisseur écrivent dans la table du
      //      profil, y compris pour les comptes déjà activés ;
      //   3. abonnement de référence (le plus récent) ;
      //   4. forfait enregistré sur le compte.
      const activeSubscription = pickActiveSubscription(subs, now);
      const reference = pickReferenceSubscription(subs, now);
      const referencePlan =
        activeSubscription?.plan ??
        planFromProfileSubscription(expertByUser.get(key), "expert", now) ??
        planFromProfileSubscription(supplierByUser.get(key), "supplier", now) ??
        reference?.plan ??
        u.subscriptionPlan ??
        null;
      const compatibility = checkProfileSubscriptionCompatibility(
        { userRole: profileRole },
        referencePlan,
      );
      return {
        ...u,
        profileRole,
        referencePlan,
        profileSubscriptionCompatible: compatibility.compatible,
      };
    });
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
      updatedAt: Date.now(),
    });

    const targetUser = await ctx.db.get(args.userId);
    await logAdminAction(
      ctx, admin, "update_user_role",
      { userId: args.userId, email: targetUser?.email },
      `Rôle changé en ${ROLE_LOG_LABELS[args.role] ?? args.role}`,
    );
  },
});

/**
 * Admin: update user profile type (client, supplier, expert)
 */
export const adminSetUserProfileRole = mutation({
  args: {
    userId: v.id("users"),
    userRole: v.union(
      v.literal("client"),
      v.literal("supplier"),
      v.literal("expert"),
    ),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    await ctx.db.patch(args.userId, { userRole: args.userRole, updatedAt: Date.now() });

    const targetUser = await ctx.db.get(args.userId);
    const roleLabel = args.userRole === "supplier" ? "Fournisseur" : args.userRole === "expert" ? "Expert" : "Client Pro";

    // ── État de compatibilité après changement de profil (administration) ──
    // L'attribution manuelle admin reste possible (override), mais l'état
    // incompatible est consigné dans le journal pour traçabilité.
    const { plan: activePlan } = await getReferenceSubscriptionPlan(ctx, args.userId);
    const compatibility = checkProfileSubscriptionCompatibility(
      { userRole: args.userRole },
      activePlan ?? targetUser?.subscriptionPlan ?? null,
    );

    await logAdminAction(
      ctx, admin, "update_user_role",
      { userId: args.userId, email: targetUser?.email },
      `Profil utilisateur changé en ${roleLabel}` +
        (compatibility.compatible
          ? " — abonnement compatible"
          : ` — INCOMPATIBILITÉ : abonnement actif « ${
              compatibility.activePlan
                ? (PLAN_VALUE_LABELS[compatibility.activePlan] ?? compatibility.activePlan)
                : "aucun"
            } » au lieu de « ${PLAN_VALUE_LABELS[compatibility.expectedPlan]} »`),
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
    // Abonnements mensuels (30 jours) pour toutes les offres. L'attribution
    // manuelle remplace la période d'essai, qui n'est jamais rejouée.
    const planDuration = MONTHLY_DURATION_DAYS * DAY_MS;

    // ── « Aucun forfait » (valeur legacy "free") ──────────────────────────
    // Le forfait gratuit permanent a été supprimé : cette valeur RETIRE
    // l'abonnement au lieu d'en accorder un. Le compte retombe sur la période
    // d'essai si elle est activée, sinon sur la souscription obligatoire.
    // Aucune donnée (projets, devis, factures) n'est supprimée.
    if (args.plan === "free") {
      const subs = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
      for (const sub of subs) {
        if (sub.status === "active" || sub.status === "pending") {
          await ctx.db.patch(sub._id, { status: "canceled", updatedAt: now });
        }
      }

      await ctx.db.patch(args.userId, {
        subscriptionPlan: undefined,
        subscriptionStartDate: undefined,
        subscriptionEndDate: undefined,
        subscriptionDaysRemaining: 0,
        subscriptionStatus: "none",
        updatedAt: now,
      });

      return {
        success: true,
        planCompatible: true,
        expectedPlan: null,
        profileAligned: false,
        message: "Forfait retiré : le compte n'a plus d'abonnement payant (période d'essai ou souscription).",
      };
    }

    // ── Compatibilité profil ↔ abonnement (règle obligatoire) ──
    // Le profil est résolu comme partout ailleurs (userRole, sinon profil
    // expert/fournisseur existant) : un compte legacy sans `userRole` mais
    // avec un profil expert n'est pas déclaré « Client Pro » par défaut.
    const targetBefore = await ctx.db.get(args.userId);
    const resolvedRole = targetBefore ? await resolveProfileRole(ctx, targetBefore) : null;
    const expectedPlan = expectedPlanForProfile(resolvedRole ?? targetBefore?.userRole ?? null);
    const planCompatible = args.plan === expectedPlan;

    // ── Synchronisation EXPLICITE profil ↔ abonnement ──
    // Le profil n'est JAMAIS changé en silence : on ne fait que persister le
    // rôle déjà résolu (leur profil réel) quand le champ `userRole` n'a
    // simplement jamais été écrit, puis on le signale à l'administrateur
    // (réponse + journal admin).
    const profileAligned = !!targetBefore && !targetBefore.userRole && resolvedRole !== null;
    const alignedRole = profileAligned ? resolvedRole : null;
    const profileLabel = PROFILE_ROLE_LABELS[resolvedRole ?? targetBefore?.userRole ?? "client"];
    const planLabel = PLAN_VALUE_LABELS[args.plan] ?? args.plan;

    await ctx.db.patch(args.userId, {
      ...(alignedRole ? { userRole: alignedRole } : {}),
      subscriptionPlan: args.plan,
      subscriptionEndDate: now + planDuration,
      subscriptionStartDate: now,
      subscriptionDaysTotal: MONTHLY_DURATION_DAYS,
      subscriptionDaysRemaining: MONTHLY_DURATION_DAYS,
      subscriptionStatus: "active",
      trialStartDate: undefined,
      trialEndDate: undefined,
      trialDaysRemaining: 0,
      updatedAt: now,
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
        amount: args.plan === "pro" ? 80 : args.plan === "expert" ? 120 : args.plan === "supplier" ? 120 : 0,
        currency: "TND",
        monthlyDownloadCount: 0,
        downloadLimit: limit,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (profileAligned) {
      await logAdminAction(
        ctx, admin, "update_user_role",
        { userId: args.userId, email: targetBefore?.email },
        `Profil « ${profileLabel} » confirmé sur le compte (champ profil manquant) — abonnement « ${planLabel} » associé`,
      );
    }

    return {
      success: true,
      planCompatible,
      expectedPlan,
      profileAligned,
      message: !planCompatible
        ? `Attention : profil « ${profileLabel} » — l'offre attendue est ${PLAN_VALUE_LABELS[expectedPlan]}. ` +
            "L'abonnement attribué reste incompatible tant que le profil n'est pas aligné."
        : profileAligned
          ? `Profil « ${profileLabel} » confirmé et abonnement « ${planLabel} » associé et actif.`
          : undefined,
    };
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

    const now = Date.now();
    const patch: Record<string, any> = {};
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.company !== undefined) patch.company = args.company.trim();
    if (args.phone !== undefined) patch.phone = args.phone.trim();
    if (args.emailNotifications !== undefined) patch.emailNotifications = args.emailNotifications;

    // Horodatage centralisé : créé une fois (depuis _creationTime si absent
    // pour les comptes plus anciens), puis dernière modification à chaque
    // enregistrement du profil.
    if (!user.createdAt) patch.createdAt = user._creationTime;
    patch.updatedAt = now;

    await ctx.db.patch(user._id, patch);
    return { success: true };
  },
});

/**
 * Generate a URL for client-side file upload to Convex storage
 */
/**
 * Set the user's profile type (client, supplier, expert)
 * Used during registration or role switching
 */
export const setUserRole = mutation({
  args: {
    userRole: v.union(
      v.literal("client"),
      v.literal("supplier"),
      v.literal("expert"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    await ctx.db.patch(user._id, { userRole: args.userRole, updatedAt: Date.now() });

    // ── Compatibilité immédiate profil ↔ abonnement ──
    // Aucune conversion automatique de forfait : si l'abonnement actif ne
    // correspond plus au nouveau profil, l'interface est informée pour
    // inviter l'utilisateur à souscrire à l'offre correspondante.
    const { plan } = await getReferenceSubscriptionPlan(ctx, user._id);
    const compatibility = checkProfileSubscriptionCompatibility(
      { userRole: args.userRole },
      plan ?? user.subscriptionPlan ?? null,
    );

    return {
      success: true,
      compatibility: {
        compatible: compatibility.compatible,
        activePlan: compatibility.activePlan,
        expectedPlan: compatibility.expectedPlan,
        activePlanLabel: compatibility.activePlan
          ? (PLAN_VALUE_LABELS[compatibility.activePlan] ?? compatibility.activePlan)
          : null,
        expectedPlanLabel: PLAN_VALUE_LABELS[compatibility.expectedPlan],
        profileRoleLabel: PROFILE_ROLE_LABELS[args.userRole],
      },
    };
  },
});

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

    await ctx.db.patch(user._id, { image: imageUrl, updatedAt: Date.now() });
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
      // Portes & fenêtres : quantités réalistes par pièce (1 porte/pièce,
      // 1-2 fenêtres/pièce, 2 portes principales) — prix catalogue conservés.
      demoResult.costEstimate.breakdown = applyRealisticDoorsWindows(
        demoResult.costEstimate.breakdown,
        { bedrooms: 4, bathrooms: 2, kitchens: 1, livingRooms: 2, wcs: 2 },
      );

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
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Cannot delete yourself
    if (admin._id === args.userId) {
      throw new Error("Vous ne pouvez pas supprimer votre propre compte.");
    }

    const userId = args.userId;
    const targetUser = await ctx.db.get(userId);
    if (!targetUser) throw new Error("Utilisateur introuvable");

    // Cascade complète (projets, profils, abonnements, fichiers, relations,
    // auth) exécutée dans la MÊME transaction : si une étape échoue, rien
    // n'est supprimé et l'utilisateur reste intact.
    const result = await ctx.runMutation(internal.userDeletion.deleteUserCompletely, {
      userId,
    });

    // Log the action (données techniques du compte supprimé, pour audit).
    const summary = Object.entries(result.deleted ?? {})
      .filter(([, n]) => (n as number) > 0)
      .map(([table, n]) => `${table}:${n}`)
      .join(", ");
    await logAdminAction(
      ctx, admin, "delete_user",
      { userId, email: targetUser?.email },
      `${targetUser?.name || "Utilisateur supprimé"}${summary ? ` — ${summary}` : ""}`,
    );

    return { success: true };
  },
});

// ============================================================================
// Mot de passe (provider `password` de Convex Auth)
//
// Convex Auth hache les mots de passe avec Scrypt et les stocke dans le champ
// `secret` de `authAccounts` : un mot de passe écrit autrement (bcrypt, champ
// `passwordHash` inexistant au schéma) est refusé par la validation Convex ou
// ne correspond plus jamais à la connexion. Tout passe donc par la mutation
// interne `auth:store`, exactement le point d'entrée qu'utilisent les helpers
// du SDK (`modifyAccountCredentials`, `retrieveAccountWithCredentials`,
// `verifyCodeAndSignIn`) : hachage, vérification du code OTP et session
// restent gérés par la librairie, sans réimplémentation.
// ============================================================================

/** Réécrit le mot de passe du compte `password` (hachage Scrypt côté Convex Auth). */
async function setPasswordSecret(
  ctx: MutationCtx,
  providerAccountId: string,
  newPassword: string,
): Promise<void> {
  try {
    await ctx.runMutation(internal.auth.store, {
      args: {
        type: "modifyAccount",
        provider: "password",
        account: { id: providerAccountId, secret: newPassword },
      },
    });
  } catch (error) {
    // Le hachage et l'écriture sont délégués à Convex Auth : si l'opération
    // échoue, le client reçoit une erreur applicative explicite au lieu d'un
    // « Server Error » générique.
    console.error("[users] Échec de l'écriture du nouveau mot de passe", error);
    throw new ConvexError(
      "L'enregistrement du nouveau mot de passe a échoué. Relancez la procédure.",
    );
  }
}

/** E-mail de recherche : la casse et les espaces ne doivent pas bloquer un compte. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Documents `users` rattachés à cet e-mail.
 *
 * L'index `email` est sensible à la casse : on interroge la valeur saisie et sa
 * forme normalisée, et il peut y avoir plusieurs documents pour une même
 * adresse (d'anciens comptes ont pu être créés en double, Convex Auth liant un
 * compte à un utilisateur existant par e-mail vérifié).
 */
async function findUsersByEmail(ctx: QueryCtx, email: string): Promise<Doc<"users">[]> {
  const found: Doc<"users">[] = [];
  for (const candidate of new Set([email.trim(), normalizeEmail(email)])) {
    if (candidate === "") continue;
    const rows = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", candidate))
      .collect();
    for (const row of rows) {
      if (!found.some((u) => u._id === row._id)) found.push(row);
    }
  }
  return found;
}

/** Compte « mot de passe » de cet utilisateur, s'il en possède un. */
async function findPasswordAccount(ctx: MutationCtx, userId: Id<"users">) {
  const authAccounts = await ctx.db
    .query("authAccounts")
    .filter((q) => q.eq(q.field("userId"), userId))
    .collect();
  return authAccounts.find((a) => a.provider === "password");
}

/**
 * Compte « mot de passe » rattaché à cet e-mail, avec son identifiant de compte.
 *
 * On ne retient pas le premier document `users` venu : plusieurs documents
 * peuvent porter la même adresse, et seul celui qui possède réellement un
 * compte `password` détient le secret à réinitialiser.
 */
async function findPasswordAccountForEmail(
  ctx: MutationCtx,
  email: string,
): Promise<{ providerAccountId: string } | null> {
  for (const user of await findUsersByEmail(ctx, email)) {
    const account = await findPasswordAccount(ctx, user._id);
    if (account !== undefined) return { providerAccountId: account.providerAccountId };
  }
  return null;
}

/**
 * Vérifie `code` (code OTP envoyé par e-mail) et renvoie l'utilisateur à qui
 * appartient le compte vérifié ; `null` si le code est invalide ou expiré.
 *
 * `verifyCodeAndSignIn` consomme le code (usage unique) et ouvre toujours une
 * session : comme aucun jeton n'est délivré ici, la session est supprimée dans
 * la foulée — l'utilisateur se reconnectera avec son nouveau mot de passe.
 *
 * `email` doit être exactement l'adresse utilisée pour demander le code :
 * le provider `Email` de Convex Auth compare `params.email` au
 * `providerAccountId` du compte et refuse toute autre valeur.
 */
async function consumeEmailOtp(
  ctx: MutationCtx,
  email: string,
  code: string,
): Promise<Id<"users"> | null> {
  let session: any;
  try {
    session = await ctx.runMutation(internal.auth.store, {
      args: {
        type: "verifyCodeAndSignIn",
        params: { email, code },
        provider: "email-otp",
        generateTokens: false,
        allowExtraProviders: false,
      },
    });
  } catch (error) {
    // Le code ne correspond pas au compte, ou Convex Auth a échoué : l'erreur
    // réelle reste dans les logs du serveur, le client reçoit une erreur
    // applicative explicite au lieu d'un « Server Error » générique.
    console.error("[users] Échec de verifyCodeAndSignIn lors d'une réinitialisation", error);
    throw new ConvexError(
      "La vérification du code a échoué. Demandez un nouveau code ou réessayez dans un instant.",
    );
  }

  // `auth:store` est une mutation unique qui sert tous les flux : on ne
  // conserve que le résultat de `verifyCodeAndSignIn` (une session).
  if (session === null || typeof session !== "object" || !("sessionId" in session)) {
    return null;
  }

  // Nettoyage « au mieux » : aucune session utilisable n'a été émise
  // (`generateTokens: false`), donc une session résiduelle est inerte et ne
  // doit jamais faire échouer la réinitialisation du mot de passe.
  try {
    await ctx.db.delete(session.sessionId);
  } catch (error) {
    console.error("[users] Session de vérification non supprimée", error);
  }

  return "userId" in session ? (session.userId as Id<"users">) : null;
}

/**
 * Réinitialise le mot de passe après vérification du code reçu par e-mail
 * (parcours « Mot de passe oublié »).
 */
export const resetPassword = mutation({
  args: {
    email: v.string(),
    code: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const requestedEmail = normalizeEmail(args.email);
    const code = args.code.trim();

    // Toutes les erreurs ci-dessous sont des `ConvexError` : leur message est
    // transmis tel quel au client, jamais remplacé par un « Server Error ».
    if (requestedEmail === "") {
      throw new ConvexError("Veuillez renseigner votre adresse e-mail.");
    }
    if (args.newPassword.length < 8) {
      throw new ConvexError("Le mot de passe doit contenir au moins 8 caractères.");
    }
    if (!/^\d{6}$/.test(code)) {
      throw new ConvexError(
        "Le code de vérification est incorrect. Saisissez les 6 chiffres reçus par e-mail.",
      );
    }

    // Compte à réinitialiser : recherche exacte (cas nominal, y compris les
    // adresses enregistrées sur plusieurs documents `users`).
    const target = await findPasswordAccountForEmail(ctx, args.email);

    // Le code est consommé par cette vérification (usage unique).
    const verifiedUserId = await consumeEmailOtp(ctx, args.email, code);
    if (verifiedUserId === null) {
      if (target !== null) {
        throw new ConvexError("Code de vérification invalide ou expiré. Relancez la procédure.");
      }
      const users = await findUsersByEmail(ctx, args.email);
      throw new ConvexError(
        users.length === 0
          ? "Aucun compte trouvé avec cet email."
          : "Ce compte n'a pas de mot de passe : utilisez la connexion rapide par email.",
      );
    }

    // Le code doit avoir été envoyé à l'adresse du compte réinitialisé.
    const verifiedUser = await ctx.db.get(verifiedUserId);
    const verifiedEmail = verifiedUser?.email ?? null;
    if (verifiedEmail !== null && normalizeEmail(verifiedEmail) !== requestedEmail) {
      throw new ConvexError("Ce code de vérification a été envoyé à une autre adresse e-mail.");
    }

    // Le code est valide : le compte visé peut être résolu sans ambiguïté, y
    // compris lorsque l'adresse a été enregistrée avec une autre casse.
    const account =
      target ??
      (await findPasswordAccount(ctx, verifiedUserId)) ??
      (verifiedEmail === null ? null : await findPasswordAccountForEmail(ctx, verifiedEmail));

    if (account === null) {
      throw new ConvexError(
        "Ce compte n'a pas de mot de passe : utilisez la connexion rapide par email.",
      );
    }

    await setPasswordSecret(ctx, account.providerAccountId, args.newPassword);

    return { success: true };
  },
});

/**
 * Change the current user's password (requires the current password).
 * Used from the "Mon Profil" page. Only works for accounts that have a
 * password provider (users who registered/sign in with e-mail + password).
 */
export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Non connecté");

    if (args.newPassword.length < 8) {
      throw new ConvexError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
    }
    if (args.newPassword === args.currentPassword) {
      throw new ConvexError("Le nouveau mot de passe doit être différent de l'actuel.");
    }

    const passwordAccount = await findPasswordAccount(ctx, user._id);

    if (!passwordAccount) {
      throw new ConvexError(
        "Ce compte n'a pas de mot de passe : utilisez la connexion rapide par email.",
      );
    }

    // Vérifie le mot de passe actuel : c'est Convex Auth qui compare le secret
    // fourni au hachage stocké (Scrypt), avec sa limitation de tentatives.
    let check: any;
    try {
      check = await ctx.runMutation(internal.auth.store, {
        args: {
          type: "retrieveAccountWithCredentials",
          provider: "password",
          account: { id: passwordAccount.providerAccountId, secret: args.currentPassword },
        },
      });
    } catch (error) {
      console.error("[users] Échec de la vérification du mot de passe actuel", error);
      throw new ConvexError(
        "La vérification du mot de passe actuel a échoué. Réessayez dans un instant.",
      );
    }

    if (check === "TooManyFailedAttempts") {
      throw new ConvexError("Trop de tentatives. Réessayez dans quelques minutes.");
    }
    if (check === "InvalidSecret" || check === "InvalidAccountId") {
      throw new ConvexError("Le mot de passe actuel est incorrect.");
    }

    await setPasswordSecret(ctx, passwordAccount.providerAccountId, args.newPassword);

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
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
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
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
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

        // Cascade complète réutilisée (même transaction par utilisateur).
        await ctx.runMutation(internal.userDeletion.deleteUserCompletely, {
          userId,
        });

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
 * Admin: auto-correct userRole for users with undefined userRole
 * who have supplier or expert profiles. Fixes registration bug.
 */
export const adminFixUserRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const fixed: { email: string; from: string; to: string }[] = [];

    // Get all users with no userRole
    const users = await ctx.db.query("users").collect();
    const usersWithoutRole = users.filter((u) => !u.userRole);

    for (const user of usersWithoutRole) {
      // Check if user has a supplier profile
      const supplierProfile = await ctx.db
        .query("supplierProfiles")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (supplierProfile) {
        await ctx.db.patch(user._id, { userRole: "supplier" });
        fixed.push({ email: user.email || user.name || "unknown", from: "client", to: "supplier" });
        continue;
      }

      // Check if user has an expert profile
      const expertProfile = await ctx.db
        .query("expertProfiles")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (expertProfile) {
        await ctx.db.patch(user._id, { userRole: "expert" });
        fixed.push({ email: user.email || user.name || "unknown", from: "client", to: "expert" });
      }
    }

    return { fixed, total: usersWithoutRole.length };
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
