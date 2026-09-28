import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { getFreePlanStatus, isProfilePaymentActive } from "./access";
import { requireProfileRoleForCreation, requireProfileRole } from "./profileSubscription";
import { scheduleEmailEvent, formatDateFr } from "./emailNotifications";
import { normalizeIndicativePrice } from "../lib/expertAvailability";
import { stripCjk, sanitizeStringList } from "../lib/sanitizeText";
import { assertPaymentMethodEnabled } from "./paymentMethodStates";
import { invoicePeriodEnd } from "../lib/invoiceStatus";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  cancelPendingInvoicesForSubscription,
  invoiceNumberForSubscription,
  issueProfileRequestInvoice,
  markProfileInvoicePaid,
  profileSubscriptionKey,
  type ProfileInvoiceInput,
} from "./invoices";

// ============================================================================
// Constants
// ============================================================================

async function getExpertPrice(ctx: any): Promise<number> {
  const config = await ctx.db.query("paymentConfig").order("desc").first();
  const p = config?.expertPrice;
  // null/0 = « Offre gratuite » (switch admin) → prix affiché 0
  if (p === undefined) return 150;
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
    // « Offre gratuite » (switch admin) : l'espace expert est activé
    // automatiquement, sans abonnement payant ni expiration.
    const free = await getFreePlanStatus(ctx);
    const planFree = free.expertFree;

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

    let remainingDays = 0;
    if (effectiveStatus === "active" && profile.subscriptionEndDate && !planFree) {
      remainingDays = Math.max(
        0,
        Math.ceil((profile.subscriptionEndDate - now) / (24 * 60 * 60 * 1000))
      );
    }

    return {
      ...profile,
      logo: await repairLogoUrl(ctx, profile.logo),
      effectiveStatus,
      remainingDays,
      planFree,
    };
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

    const now = Date.now();
    const free = await getFreePlanStatus(ctx);
    const active = [];
    for (const e of experts) {
      if (!e.isVisible) continue;
      // Paiement obligatoire : sans offre gratuite ni abonnement actif, le
      // profil reste strictement invisible, même si `isVisible` est vrai.
      if (await isProfilePaymentActive(ctx, free.expertFree, e, now)) active.push(e);
    }
    if (active.length === 0) return null;

    // Fisher-Yates shuffle and pick first
    for (let i = active.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [active[i], active[j]] = [active[j], active[i]];
    }
    const picked = active[0];
    return {
      ...picked,
      logo: await repairLogoUrl(ctx, picked.logo),
    };
  },
});

/** Get all active & visible expert profiles (for the professionals directory) */
export const getActiveExperts = query({
  handler: async (ctx) => {
    const now = Date.now();
    const free = await getFreePlanStatus(ctx);
    const experts = await ctx.db.query("expertProfiles").collect();

    const visible = [];
    for (const e of experts) {
      if (!e.isVisible) continue;
      // Paiement obligatoire : profil inactif / expiré = strictement invisible.
      if (await isProfilePaymentActive(ctx, free.expertFree, e, now)) visible.push(e);
    }

    const result = [];
    for (const e of visible) {
      result.push({
        _id: e._id,
        displayName: e.displayName,
        companyName: e.companyName,
        phone: e.phone,
        email: e.email,
        address: e.address,
        website: e.website,
        description: e.description,
        logo: await repairLogoUrl(ctx, e.logo),
        profession: e.profession,
        specialties: e.specialties,
        regions: e.regions,
        // ProMarket : informations d'achat affichées sur les cartes
        indicativePrice: e.indicativePrice,
        availability: e.availability,
        availabilityDetails: e.availabilityDetails,
        acceptsUrgent: e.acceptsUrgent,
        plan: e.plan,
      });
    }
    return result;
  },
});

/** Get a single expert profile by ID (for profile detail page) */
export const getExpertById = query({
  args: { expertId: v.id("expertProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.expertId);
    if (!profile || !profile.isVisible) return null;
    // Paiement obligatoire : profil inactif / expiré = strictement invisible.
    const free = await getFreePlanStatus(ctx);
    if (!(await isProfilePaymentActive(ctx, free.expertFree, profile))) return null;
    return {
      _id: profile._id,
      displayName: profile.displayName,
      companyName: profile.companyName,
      phone: profile.phone,
      email: profile.email,
      address: profile.address,
      website: profile.website,
      description: profile.description,
      profession: profile.profession,
      specialties: profile.specialties,
      regions: profile.regions ?? [],
      // Logo réparé à la lecture (anciennes URL `/api/storage/<id>`).
      logo: await repairLogoUrl(ctx, profile.logo),
      // ProMarket : prix indicatifs, disponibilité, urgences
      indicativePrice: profile.indicativePrice,
      availability: profile.availability,
      availabilityDetails: profile.availabilityDetails,
      acceptsUrgent: profile.acceptsUrgent,
    };
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
      v.literal("plombier"),
      v.literal("electricien"),
    ),
    displayName: v.string(),
    companyName: v.optional(v.string()),
    phone: v.string(),
    email: v.string(),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    specialties: v.array(v.string()),
    regions: v.array(v.string()),
    indicativePrice: v.optional(v.string()),
    availability: v.optional(
      v.union(
        v.literal("immediate"),
        v.literal("this_week"),
        v.literal("appointment"),
      ),
    ),
    availabilityDetails: v.optional(v.string()),
    acceptsUrgent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");

    // ── Réservé au profil Expert (vérification backend obligatoire) ──
    // La création d'un premier profil expert vaut déclaration du rôle : les
    // comptes legacy sans userRole sont acceptés et alignés ci-dessous.
    await requireProfileRoleForCreation(ctx, user, "expert");
    // Création du premier profil expert : le champ userRole est aligné.
    if (!user.userRole) {
      await ctx.db.patch(user._id, { userRole: "expert", updatedAt: Date.now() });
    }

    const existing = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (existing) throw new Error("Profil expert déjà existant");

    // Resolve the storage ID to a real storage URL (client-side-built URLs are broken)
    let logo = args.logo;
    if (args.logoStorageId) {
      const url = await ctx.storage.getUrl(args.logoStorageId);
      if (!url) throw new Error("Impossible de récupérer le logo");
      logo = url;
    }

    const now = Date.now();
    // Nettoyage systématique : aucun caractère chinois/CJK ne doit être
    // persisté dans les spécificités du profil expert.
    const profileId = await ctx.db.insert("expertProfiles", {
      userId: user._id,
      profession: args.profession,
      displayName: stripCjk(args.displayName) || args.displayName,
      companyName: args.companyName ? stripCjk(args.companyName) : undefined,
      phone: args.phone,
      email: args.email,
      address: args.address ? stripCjk(args.address) : undefined,
      website: args.website,
      description: args.description ? stripCjk(args.description) : undefined,
      logo,
      specialties: sanitizeStringList(args.specialties),
      regions: sanitizeStringList(args.regions),
      indicativePrice: normalizeIndicativePrice(args.indicativePrice),
      availability: args.availability,
      availabilityDetails: stripCjk(args.availabilityDetails) || undefined,
      acceptsUrgent: args.acceptsUrgent,
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
        v.literal("plombier"),
        v.literal("electricien"),
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
    logoStorageId: v.optional(v.id("_storage")),
    clearLogo: v.optional(v.boolean()),
    specialties: v.optional(v.array(v.string())),
    regions: v.optional(v.array(v.string())),
    indicativePrice: v.optional(v.string()),
    availability: v.optional(
      v.union(
        v.literal("immediate"),
        v.literal("this_week"),
        v.literal("appointment"),
      ),
    ),
    availabilityDetails: v.optional(v.string()),
    acceptsUrgent: v.optional(v.boolean()),
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
    if (args.displayName !== undefined) updates.displayName = stripCjk(args.displayName) || args.displayName;
    if (args.companyName !== undefined) updates.companyName = stripCjk(args.companyName);
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.email !== undefined) updates.email = args.email;
    if (args.address !== undefined) updates.address = stripCjk(args.address);
    if (args.website !== undefined) updates.website = args.website;
    if (args.description !== undefined) updates.description = stripCjk(args.description);
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
    // Spécificités : CJK retirés, trim, vides et doublons supprimés.
    if (args.specialties !== undefined) updates.specialties = sanitizeStringList(args.specialties);
    if (args.regions !== undefined) updates.regions = sanitizeStringList(args.regions);
    // ProMarket : prix indicatifs (chaîne vide = champ retiré), disponibilité,
    // zones précises et acceptation des urgences.
    if (args.indicativePrice !== undefined) {
      updates.indicativePrice = normalizeIndicativePrice(args.indicativePrice);
    }
    if (args.availability !== undefined) updates.availability = args.availability;
    if (args.availabilityDetails !== undefined) {
      updates.availabilityDetails = stripCjk(args.availabilityDetails) || undefined;
    }
    if (args.acceptsUrgent !== undefined) updates.acceptsUrgent = args.acceptsUrgent;

    await ctx.db.patch(profile._id, updates);
    return { success: true };
  },
});

/**
 * Toggle expert profile visibility — VERROUILLÉ.
 *
 * Règle produit : la visibilité d'un profil expert est gérée automatiquement
 * selon l'état du paiement (offre gratuite ou abonnement actif = visible,
 * sinon strictement invisible). L'utilisateur ne peut pas la modifier ; seul
 * l'administrateur contrôle le champ `isVisible` (voir
 * `adminToggleExpertVisibility`).
 */
export const toggleVisibility = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");
    const profile = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) throw new Error("Profil expert introuvable");
    throw new Error(
      "La visibilité de votre profil est gérée automatiquement selon l'état de votre abonnement."
    );
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
    // ── Réservé au profil Expert ──
    await requireProfileRole(ctx, user, "expert");
    // Méthode désactivée par l'admin → nouvelle demande refusée côté serveur.
    await assertPaymentMethodEnabled(ctx, args.paymentMethod);
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

    // ── FACTURE — émise « en attente » dès la demande de paiement, puis
    // « payée » à la validation (même procédure que l'offre Client Pro).
    const requested = await ctx.db.get(profile._id);
    if (requested) await issueProfileRequestInvoice(ctx, expertInvoiceInput(requested));

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
    // ── Réservé au profil Expert ──
    await requireProfileRole(ctx, user, "expert");
    const profile = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) throw new Error("Profil expert introuvable");

    // Resolve the real storage URL server-side — client-built URLs are broken
    const resolvedUrl = (await ctx.storage.getUrl(args.storageId)) || args.url;
    await ctx.db.patch(profile._id, {
      paymentProofStorageId: args.storageId,
      paymentProofUrl: resolvedUrl,
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

/* ------------------------------------------------------------------ *
 * Facturation — l'abonnement expert produit la même facture que les autres
 * profils (type de profil « Expert » dans « Mes factures » et dans
 * Admin → Factures). Le numéro réel est repris dans les e-mails.
 * ------------------------------------------------------------------ */

/** Données de facturation d'un profil expert (aucune donnée inventée). */
function expertInvoiceInput(
  profile: Doc<"expertProfiles">,
  period?: { start: number; end: number },
  paymentDate?: number,
): ProfileInvoiceInput {
  // Période mensuelle : bornes réelles de l'abonnement dès qu'elles existent,
  // sinon 30 jours à partir de maintenant (demande en cours de validation).
  const periodStart = period?.start ?? profile.subscriptionStartDate ?? Date.now();
  return {
    profileType: "expert",
    profileId: String(profile._id),
    userId: profile.userId,
    plan: "expert",
    amountTTC: profile.paymentAmount ?? 0,
    currency: "TND",
    paymentMethod: profile.paymentMethod,
    periodStart,
    // Durée mensuelle : source unique partagée avec la facturation (`invoicePeriodEnd`).
    periodEnd: period?.end ?? profile.subscriptionEndDate ?? invoicePeriodEnd(periodStart),
    paymentDate,
    customer: {
      name: profile.displayName,
      company: profile.companyName ?? profile.displayName,
      email: profile.email,
      address: profile.address,
    },
  };
}

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

    // ── FACTURE — la validation du paiement marque le terme en cours PAYÉ ──
    const expertInvoice = await markProfileInvoicePaid(
      ctx,
      expertInvoiceInput(profile, { start: now, end: endDate }, now),
    );

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
          numeroFacture: expertInvoice?.invoiceNumber,
        },
        // Facture PDF jointe à l'e-mail d'activation du compte expert.
        invoiceId: expertInvoice?._id,
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

    // Facture : la demande refusée annule la facture NON PAYÉE (historique
    // conservé — aucune facture n'est supprimée).
    await cancelPendingInvoicesForSubscription(
      ctx,
      profileSubscriptionKey("expert", String(args.profileId)),
    );

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

    // Facture : le reçu vérifié marque la facture PAYÉE (créée si nécessaire).
    await markProfileInvoicePaid(ctx, expertInvoiceInput(profile, undefined, Date.now()));

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
