import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
// ============================================================================
// Payment Configuration
// ============================================================================
// Abonnements mensuels (30 jours) — accès complet pour les forfaits payants:
//   Client  80 TND/mois  → paiement requis après la création de la demande
//   Fournisseur 120 TND/mois → 2 mois gratuits, puis paiement
//   Expert 120 TND/mois → 2 mois gratuits, puis paiement
// ============================================================================
const UNLIMITED = 1000000;

// Tarifs minimums métier. Une ancienne configuration à 0 TND ne doit jamais
// transformer un abonnement en accès gratuit permanent:
const MINIMUM_PLAN_PRICES: Record<string, number> = {
  free: 80,
  pro: 120,
  expert: 120,
  supplier: 120,
};

function normalizePlanPrice(plan: string, value: number | undefined): number {
  const fallback = MINIMUM_PLAN_PRICES[plan] ?? 1;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

const DEFAULT_PLAN_PRICING = {
  startPrice: 80,
  proPrice: 120,
  expertPrice: 120,
  supplierPrice: 120,
  currency: "TND",
  // Aucun accès n'est accordé sans abonnement actif et paiement validé.
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
      startPrice: normalizePlanPrice("free", config.startPrice),
      proPrice: normalizePlanPrice("pro", config.proPrice),
      expertPrice: normalizePlanPrice("expert", config.expertPrice),
      supplierPrice: normalizePlanPrice("supplier", config.supplierPrice),
      // Le quota historique du forfait Client ne constitue jamais un accès.
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

    if (args.price !== undefined && (!Number.isFinite(args.price) || args.price <= 0)) {
      throw new Error("Le tarif mensuel doit être supérieur à 0 TND.");
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
      if (args.projectLimit !== undefined) patch.freeProjectLimit = args.projectLimit;
      if (args.investmentLimit !== undefined) patch.freeInvestmentLimit = args.investmentLimit;
      if (args.downloadLimit !== undefined) patch.freeDownloadLimit = args.downloadLimit;
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
      await ctx.db.patch(existingConfig._id, {
        ...patch,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
    } else {
      await ctx.db.insert("paymentConfig", {
        ...DEFAULT_PLAN_PRICING,
        ...patch,
        updatedAt: Date.now(),
        updatedBy: admin._id,
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
      startPrice: normalizePlanPrice("free", config.startPrice),
      proPrice: normalizePlanPrice("pro", config.proPrice),
      expertPrice: normalizePlanPrice("expert", config.expertPrice),
      supplierPrice: normalizePlanPrice("supplier", config.supplierPrice),
      // Le quota historique du forfait Client ne constitue jamais un accès.
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

    const patch: Record<string, any> = {
      updatedAt: Date.now(),
      updatedBy: admin._id,
    };
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) patch[key] = value;
    }

    if (existingConfig) {
      await ctx.db.patch(existingConfig._id, patch);
    } else {
      await ctx.db.insert("paymentConfig", {
        ...DEFAULT_PLAN_PRICING,
        ...patch,
        updatedBy: admin._id,
        createdAt: Date.now(),
      } as any);
    }

    return { success: true };
  },
});
