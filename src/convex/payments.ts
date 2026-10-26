import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import {
  PAYMENT_METHOD_CATALOG,
  defaultPaymentMethodStates,
  mergePaymentMethodStates,
  paymentMethodDefinition,
} from "../lib/paymentMethods";
import { getEnabledPaymentMethodSlugs, getPaymentMethodStates } from "./paymentMethodStates";
import { isTrialCampaignOpen, readTrialConfig } from "./trialConfig";
// ============================================================================
// Payment Configuration
// ============================================================================

// Abonnements mensuels (30 jours) — trois catégories d'offres :
//   Client Pro  80 TND/mois (par défaut payant — null = gratuit)
//   Fournisseur 120 TND/mois (null = gratuit)
//   Expert      120 TND/mois (null = gratuit)
// Le forfait « Free » a été supprimé : il est remplacé par la période d'essai
// gratuite administrable (`convex/trialConfig.ts`), puis par les offres payantes.
const UNLIMITED = 1000000;
const DEFAULT_PLAN_PRICING = {
  startPrice: 80,
  // Forfait par défaut des nouveaux utilisateurs ("trial" | "client_pro").
  // "trial" = aucun forfait payé attribué : la période d'essai s'applique.
  defaultPlan: "trial" as const,
  // Disponibilité du forfait Client Pro (peut être retiré comme défaut).
  clientProEnabled: true,
  proPrice: 80, // Client Pro — payant par défaut
  expertPrice: 120,
  supplierPrice: 120,
  currency: "TND",
  freeProjectLimit: 0,
  proProjectLimit: UNLIMITED,
  expertProjectLimit: UNLIMITED,
  freeDownloadLimit: 0,
  proDownloadLimit: UNLIMITED,
  expertDownloadLimit: UNLIMITED,
  bankName: "",
  bankTitulaire: "",
  bankRib: "",
  bankIban: "",
  bankSwift: "",
  d17MerchantName: "",
  d17Phone: "",
  d17Email: "",
  d17Notice: "",
};

/** Get all plan pricing & limits configuration (admin only) */
export const getPlanPricing = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "moderator")) return null;

    const config = await ctx.db
      .query("paymentConfig")
      .order("desc")
      .first();

    if (!config) return DEFAULT_PLAN_PRICING;

    return {
      startPrice: config.startPrice ?? DEFAULT_PLAN_PRICING.startPrice,
      clientProEnabled: config.clientProEnabled !== false,
      // Legacy "free" (forfait supprimé) interprété comme « période d'essai ».
      defaultPlan: config.defaultPlan === "client_pro" ? "client_pro" : "trial",
      // Période d'essai administrable (source de vérité : convex/trialConfig.ts).
      trialEnabled: config.trialEnabled === true,
      trialDurationDays: config.trialDurationDays ?? null,
      trialEligibleProfiles: config.trialEligibleProfiles ?? null,
      trialModules: config.trialModules ?? null,
      // null = forfait gratuit ; la valeur par défaut (sans config) n'est PAS gratuite.
      proPrice: config.proPrice ?? null,
      expertPrice: config.expertPrice ?? null,
      supplierPrice: config.supplierPrice ?? null,
      freeProjectLimit: 0,
      proProjectLimit: config.proProjectLimit ?? DEFAULT_PLAN_PRICING.proProjectLimit,
      expertProjectLimit: config.expertProjectLimit ?? DEFAULT_PLAN_PRICING.expertProjectLimit,
      freeDownloadLimit: 0,
      proDownloadLimit: config.proDownloadLimit ?? DEFAULT_PLAN_PRICING.proDownloadLimit,
      expertDownloadLimit: config.expertDownloadLimit ?? DEFAULT_PLAN_PRICING.expertDownloadLimit,
    };
  },
});

/** Update plan pricing & limits configuration (admin only) */
export const updatePlanPricing = mutation({
  args: {
    plan: v.string(),
    // null = forfait gratuit (switch « Offre gratuite »)
    price: v.optional(v.union(v.number(), v.null())),
    projectLimit: v.optional(v.number()),
    downloadLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const existingConfig = await ctx.db
      .query("paymentConfig")
      .order("desc")
      .first();

    const patch: Record<string, any> = {};
    const plan = args.plan;

    if (plan === "pro") {
      // « pro » = Client Pro (Start remplacé par Client Pro).
      if (args.price !== undefined) patch.proPrice = args.price;
      if (args.projectLimit !== undefined) patch.proProjectLimit = args.projectLimit;
      if (args.downloadLimit !== undefined) patch.proDownloadLimit = args.downloadLimit;
    } else if (plan === "expert") {
      if (args.price !== undefined) patch.expertPrice = args.price;
      if (args.projectLimit !== undefined) patch.expertProjectLimit = args.projectLimit;
      if (args.downloadLimit !== undefined) patch.expertDownloadLimit = args.downloadLimit;
    } else if (plan === "supplier") {
      if (args.price !== undefined) patch.supplierPrice = args.price;
    }

    if (existingConfig) {
      await ctx.db.patch(existingConfig._id, { ...patch, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("paymentConfig", {
        ...DEFAULT_PLAN_PRICING,
        ...patch,
        updatedAt: Date.now(),
        createdAt: Date.now(),
      } as any);
    }

    return { success: true };
  },
});

/**
 * Active/désactive le forfait Client Pro (admin uniquement).
 *
 * Quand il est désactivé, Client Pro ne peut plus être choisi comme forfait
 * par défaut. Aucune donnée n'est supprimée et les abonnements existants ne
 * sont pas modifiés automatiquement.
 */
export const updateClientProEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const existingConfig = await ctx.db.query("paymentConfig").order("desc").first();
    if (existingConfig) {
      await ctx.db.patch(existingConfig._id, {
        clientProEnabled: args.enabled,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("paymentConfig", {
        ...DEFAULT_PLAN_PRICING,
        clientProEnabled: args.enabled,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any);
    }

    return { success: true, clientProEnabled: args.enabled };
  },
});

/**
 * Définit le FORFAIT PAR DÉFAUT attribué aux nouveaux utilisateurs
 * (admin uniquement).
 *
 *   - `"trial"` : aucun forfait payé — l'offre gratuite ou la souscription
 *                   s'appliquent (la période d'essai ne concerne que les
 *                   profils Fournisseur / Expert, jamais Client Pro) ;
 *   - `"client_pro"` : abonnement Client Pro attribué d'office.
 *
 * Contrôle serveur : un forfait désactivé ne peut jamais être enregistré comme
 * défaut. La configuration est stockée dans Convex (`paymentConfig`) et ne
 * s'applique qu'aux nouvelles inscriptions.
 */
export const updateDefaultPlanConfig = mutation({
  args: { plan: v.union(v.literal("trial"), v.literal("client_pro")) },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const existingConfig = await ctx.db.query("paymentConfig").order("desc").first();
    const clientProEnabled = existingConfig?.clientProEnabled !== false;

    if (args.plan === "client_pro" && !clientProEnabled) {
      throw new Error(
        "Client Pro est désactivé : il ne peut pas être défini comme forfait par défaut. Activez Client Pro ou sélectionnez l'option sans forfait payé.",
      );
    }

    if (existingConfig) {
      await ctx.db.patch(existingConfig._id, {
        defaultPlan: args.plan,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("paymentConfig", {
        ...DEFAULT_PLAN_PRICING,
        defaultPlan: args.plan,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any);
    }

    return { success: true, defaultPlan: args.plan };
  },
});

/** Get public pricing info (no auth required - for pricing page) */
export const getPublicPricing = query({
  handler: async (ctx) => {
    const config = await ctx.db
      .query("paymentConfig")
      .order("desc")
      .first();

    // `paymentMethods` est toujours présent : les interfaces de règlement s'en
    // servent pour n'afficher que les méthodes activées par l'administrateur.
    const enabledMethods = await getEnabledPaymentMethodSlugs(ctx);

    if (!config) return { ...DEFAULT_PLAN_PRICING, paymentMethods: enabledMethods };

    const trial = await readTrialConfig(ctx);

    return {
      startPrice: config.startPrice ?? DEFAULT_PLAN_PRICING.startPrice,
      clientProEnabled: config.clientProEnabled !== false,
      // Legacy "free" (forfait supprimé) interprété comme « période d'essai ».
      defaultPlan: config.defaultPlan === "client_pro" ? "client_pro" : "trial",
      // Période d'essai gratuite (activée + fenêtre de validité, calcul serveur).
      trialEnabled: isTrialCampaignOpen(trial),
      trialDurationDays: trial.durationDays,
      trialModules: trial.modules,
      trialEligibleProfiles: trial.eligibleProfiles,
      // null = forfait gratuit ; la valeur par défaut (sans config) n'est PAS gratuite.
      proPrice: config.proPrice ?? null,
      expertPrice: config.expertPrice ?? null,
      supplierPrice: config.supplierPrice ?? null,
      freeProjectLimit: 0,
      proProjectLimit: config.proProjectLimit ?? DEFAULT_PLAN_PRICING.proProjectLimit,
      expertProjectLimit: config.expertProjectLimit ?? DEFAULT_PLAN_PRICING.expertProjectLimit,
      freeDownloadLimit: 0,
      proDownloadLimit: config.proDownloadLimit ?? DEFAULT_PLAN_PRICING.proDownloadLimit,
      expertDownloadLimit: config.expertDownloadLimit ?? DEFAULT_PLAN_PRICING.expertDownloadLimit,
      currency: config.currency ?? "TND",
      bankName: config.bankName,
      bankTitulaire: config.bankTitulaire,
      bankRib: config.bankRib,
      bankIban: config.bankIban,
      bankSwift: config.bankSwift,
      d17MerchantName: config.d17MerchantName,
      d17Phone: config.d17Phone,
      d17Email: config.d17Email,
      d17Notice: config.d17Notice,
      // Méthodes de paiement réellement utilisables (activées par l'admin).
      paymentMethods: enabledMethods,
    };
  },
});

// ============================================================================
// Méthodes de paiement — configuration administrable (source de vérité serveur)
// ============================================================================

/** Catalogue complet + état activé/désactivé (admin uniquement). */
export const getPaymentMethodsAdmin = query({
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
      return null;
    }

    const states = await getPaymentMethodStates(ctx);
    const byslug = new Map(states.map((s) => [s.slug, s.enabled]));

    return {
      methods: PAYMENT_METHOD_CATALOG.map((method) => ({
        ...method,
        enabled: byslug.get(method.slug) ?? false,
      })),
    };
  },
});

/**
 * Active/désactive une méthode de paiement.
 *
 * Effet immédiat : la méthode disparaît (ou réapparaît) dans toutes les
 * interfaces de règlement, et les transactions la concernant sont refusées
 * côté serveur. Aucune donnée historique n'est supprimée.
 */
export const updatePaymentMethodState = mutation({
  args: {
    slug: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const method = paymentMethodDefinition(args.slug);
    if (!method) {
      throw new Error(`Méthode de paiement inconnue : « ${args.slug} »`);
    }
    if (!method.implemented) {
      throw new Error(
        `Le module de paiement « ${method.label} » n'est pas encore connecté et ne peut pas être activé.`,
      );
    }

    const existingConfig = await ctx.db
      .query("paymentConfig")
      .order("desc")
      .first();

    // La liste complète est toujours réécrite depuis le catalogue : le schéma
    // reste valide même si de nouvelles méthodes apparaissent plus tard.
    const previous = mergePaymentMethodStates(existingConfig?.paymentMethodStates);
    const next = previous.map((state) =>
      state.slug === args.slug ? { ...state, enabled: args.enabled } : state,
    );

    if (existingConfig) {
      await ctx.db.patch(existingConfig._id, {
        paymentMethodStates: next,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("paymentConfig", {
        ...DEFAULT_PLAN_PRICING,
        paymentMethodStates: next.length
          ? next
          : defaultPaymentMethodStates(),
        updatedAt: Date.now(),
        createdAt: Date.now(),
      } as any);
    }

    return { success: true, slug: args.slug, enabled: args.enabled };
  },
});

/** Get payment config with bank/D17 details (admin only) */
export const getPaymentConfigAdmin = query({
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") return null;

    const config = await ctx.db
      .query("paymentConfig")
      .order("desc")
      .first();

    return config;
  },
});

/** Update payment config (bank and D17 details) (admin only) */
export const updatePaymentConfig = mutation({
  args: {
    bankName: v.optional(v.string()),
    bankTitulaire: v.optional(v.string()),
    bankRib: v.optional(v.string()),
    bankIban: v.optional(v.string()),
    bankSwift: v.optional(v.string()),
    d17MerchantName: v.optional(v.string()),
    d17Phone: v.optional(v.string()),
    d17Email: v.optional(v.string()),
    d17Notice: v.optional(v.string()),
    // ── Facturation : TVA et coordonnées de l'émetteur ──
    // Le taux ne s'applique QU'aux factures émises ensuite : les factures déjà
    // émises conservent leur taux et leurs montants (historique figé).
    vatRate: v.optional(v.number()),
    companyLegalName: v.optional(v.string()),
    companyAddress: v.optional(v.string()),
    companyTaxId: v.optional(v.string()),
    companyEmail: v.optional(v.string()),
    companyPhone: v.optional(v.string()),
    paymentTerms: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Taux de TVA : borné à [0 ; 100] pour ne jamais produire de montant absurde.
    if (args.vatRate !== undefined && (args.vatRate < 0 || args.vatRate > 100)) {
      throw new Error("Le taux de TVA doit être compris entre 0 et 100 %.");
    }

    const existingConfig = await ctx.db
      .query("paymentConfig")
      .order("desc")
      .first();

    const patch: Record<string, any> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) patch[key] = value;
    }

    if (existingConfig) {
      await ctx.db.patch(existingConfig._id, patch);
    } else {
      await ctx.db.insert("paymentConfig", {
        ...DEFAULT_PLAN_PRICING,
        ...patch,
        createdAt: Date.now(),
      } as any);
    }

    return { success: true };
  },
});
