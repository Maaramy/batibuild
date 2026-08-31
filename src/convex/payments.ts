import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
// ============================================================================
// Payment Configuration
// ============================================================================

// Abonnements mensuels (30 jours) — accès illimité pour les forfaits payants :
//   Client  80 TND/mois  → accès complet illimité
//   Fournisseur 120 TND/mois → 2 mois gratuits, puis paiement
//   Expert 120 TND/mois → 2 mois gratuits, puis paiement
const UNLIMITED = 1000000;
const DEFAULT_PLAN_PRICING = {
  startPrice: 80,
  proPrice: 0,
  expertPrice: 120,
  supplierPrice: 120,
  currency: "TND",
  freeProjectLimit: 0,
  proProjectLimit: UNLIMITED,
  expertProjectLimit: UNLIMITED,
  freeInvestmentLimit: 0,
  proInvestmentLimit: UNLIMITED,
  expertInvestmentLimit: UNLIMITED,
  freeDownloadLimit: 0,
  proDownloadLimit: UNLIMITED,
  expertDownloadLimit: UNLIMITED,
  trialEnabled: true,
  trialDurationDays: 60,
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
      proPrice: config.proPrice ?? DEFAULT_PLAN_PRICING.proPrice,
      expertPrice: config.expertPrice ?? DEFAULT_PLAN_PRICING.expertPrice,
      supplierPrice: config.supplierPrice ?? DEFAULT_PLAN_PRICING.supplierPrice,
      freeProjectLimit: 0,
      proProjectLimit: config.proProjectLimit ?? DEFAULT_PLAN_PRICING.proProjectLimit,
      expertProjectLimit: config.expertProjectLimit ?? DEFAULT_PLAN_PRICING.expertProjectLimit,
      freeInvestmentLimit: 0,
      proInvestmentLimit: config.proInvestmentLimit ?? DEFAULT_PLAN_PRICING.proInvestmentLimit,
      expertInvestmentLimit: config.expertInvestmentLimit ?? DEFAULT_PLAN_PRICING.expertInvestmentLimit,
      freeDownloadLimit: 0,
      proDownloadLimit: config.proDownloadLimit ?? DEFAULT_PLAN_PRICING.proDownloadLimit,
      expertDownloadLimit: config.expertDownloadLimit ?? DEFAULT_PLAN_PRICING.expertDownloadLimit,
      trialEnabled: config.trialEnabled ?? DEFAULT_PLAN_PRICING.trialEnabled,
      trialDurationDays: config.trialDurationDays ?? DEFAULT_PLAN_PRICING.trialDurationDays,
    };
  },
});

/** Update plan pricing & limits configuration (admin only) */
export const updatePlanPricing = mutation({
  args: {
    plan: v.string(),
    price: v.optional(v.number()),
    projectLimit: v.optional(v.number()),
    investmentLimit: v.optional(v.number()),
    downloadLimit: v.optional(v.number()),
    trialEnabled: v.optional(v.boolean()),
    trialDurationDays: v.optional(v.number()),
    // Rétrocompatibilité : un prix unique par forfait couvre tous les types
    type: v.optional(v.union(v.literal("construction"), v.literal("investment"))),
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
    if (args.trialEnabled !== undefined) patch.trialEnabled = args.trialEnabled;
    if (args.trialDurationDays !== undefined) patch.trialDurationDays = args.trialDurationDays;
    const plan = args.plan;

    if (plan === "free") {
      if (args.price !== undefined) patch.startPrice = args.price;
    } else if (plan === "pro") {
      if (args.price !== undefined) patch.proPrice = args.price;
      if (args.projectLimit !== undefined) patch.proProjectLimit = args.projectLimit;
      if (args.investmentLimit !== undefined) patch.proInvestmentLimit = args.investmentLimit;
      if (args.downloadLimit !== undefined) patch.proDownloadLimit = args.downloadLimit;
    } else if (plan === "expert") {
      if (args.price !== undefined) patch.expertPrice = args.price;
      if (args.projectLimit !== undefined) patch.expertProjectLimit = args.projectLimit;
      if (args.investmentLimit !== undefined) patch.expertInvestmentLimit = args.investmentLimit;
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

/** Get public pricing info (no auth required - for pricing page) */
export const getPublicPricing = query({
  handler: async (ctx) => {
    const config = await ctx.db
      .query("paymentConfig")
      .order("desc")
      .first();

    if (!config) return DEFAULT_PLAN_PRICING;

    return {
      startPrice: config.startPrice ?? DEFAULT_PLAN_PRICING.startPrice,
      proPrice: config.proPrice ?? DEFAULT_PLAN_PRICING.proPrice,
      expertPrice: config.expertPrice ?? DEFAULT_PLAN_PRICING.expertPrice,
      supplierPrice: config.supplierPrice ?? DEFAULT_PLAN_PRICING.supplierPrice,
      freeProjectLimit: 0,
      proProjectLimit: config.proProjectLimit ?? DEFAULT_PLAN_PRICING.proProjectLimit,
      expertProjectLimit: config.expertProjectLimit ?? DEFAULT_PLAN_PRICING.expertProjectLimit,
      freeInvestmentLimit: 0,
      proInvestmentLimit: config.proInvestmentLimit ?? DEFAULT_PLAN_PRICING.proInvestmentLimit,
      expertInvestmentLimit: config.expertInvestmentLimit ?? DEFAULT_PLAN_PRICING.expertInvestmentLimit,
      freeDownloadLimit: 0,
      proDownloadLimit: config.proDownloadLimit ?? DEFAULT_PLAN_PRICING.proDownloadLimit,
      expertDownloadLimit: config.expertDownloadLimit ?? DEFAULT_PLAN_PRICING.expertDownloadLimit,
      trialEnabled: config.trialEnabled ?? DEFAULT_PLAN_PRICING.trialEnabled,
      trialDurationDays: config.trialDurationDays ?? DEFAULT_PLAN_PRICING.trialDurationDays,
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
    };
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
