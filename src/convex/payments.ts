import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ============================================================================
// Default Payment Configuration (fallback)
// ============================================================================

const DEFAULT_CONFIG = {
  bankName: "Banque de Tunisie (BT)",
  bankTitulaire: "GALISKON PROJECT",
  bankRib: "07 001 1234567890123 47",
  bankIban: "TN59 0700 1123 4567 8901 2347",
  bankSwift: "BTBK TN TT",
  d17MerchantName: "GALISKON PROJECT",
  d17Phone: "+216 XX XXX XXX",
  d17Email: "paiement@budgetbati.tn",
  d17Notice:
    "Envoyez le paiement via l'application D17 de La Poste Tunisienne",
  proPrice: 79,
  supplierPrice: 120,
  expertPrice: 320,
  currency: "TND",
  freeProjectLimit: 3,
  proProjectLimit: 10,
  expertProjectLimit: 100,
  freeDownloadLimit: 0,
  proDownloadLimit: 10,
  expertDownloadLimit: 100,
};

// ============================================================================
// Queries
// ============================================================================

/** Get the current payment configuration (public) */
export const getPaymentConfig = query({
  handler: async (ctx) => {
    const config = await ctx.db
      .query("paymentConfig")
      .order("desc")
      .first();

    if (!config) {
      return {
        ...DEFAULT_CONFIG,
        _id: null,
        updatedAt: Date.now(),
        updatedBy: null,
      };
    }

    return config;
  },
});

/** Get payment config for admin editing */
export const getPaymentConfigAdmin = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") return null;

    const config = await ctx.db
      .query("paymentConfig")
      .order("desc")
      .first();

    return config || null;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/** Update payment configuration (admin only) */
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
    proPrice: v.optional(v.number()),
    supplierPrice: v.optional(v.number()),
    expertPrice: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Accès non autorisé");
    }

    const existing = await ctx.db
      .query("paymentConfig")
      .order("desc")
      .first();

    const now = Date.now();
    const updates: Record<string, any> = {
      updatedAt: now,
      updatedBy: user._id,
    };

    // Only include provided fields
    if (args.bankName !== undefined) updates.bankName = args.bankName;
    if (args.bankTitulaire !== undefined) updates.bankTitulaire = args.bankTitulaire;
    if (args.bankRib !== undefined) updates.bankRib = args.bankRib;
    if (args.bankIban !== undefined) updates.bankIban = args.bankIban;
    if (args.bankSwift !== undefined) updates.bankSwift = args.bankSwift;
    if (args.d17MerchantName !== undefined) updates.d17MerchantName = args.d17MerchantName;
    if (args.d17Phone !== undefined) updates.d17Phone = args.d17Phone;
    if (args.d17Email !== undefined) updates.d17Email = args.d17Email;
    if (args.d17Notice !== undefined) updates.d17Notice = args.d17Notice;
    if (args.proPrice !== undefined) updates.proPrice = args.proPrice;
    if (args.supplierPrice !== undefined) updates.supplierPrice = args.supplierPrice;
    if (args.expertPrice !== undefined) updates.expertPrice = args.expertPrice;
    if (args.currency !== undefined) updates.currency = args.currency;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      // Insert with all required fields from DEFAULT_CONFIG + provided values
      await ctx.db.insert("paymentConfig", {
        bankName: args.bankName ?? DEFAULT_CONFIG.bankName,
        bankTitulaire: args.bankTitulaire ?? DEFAULT_CONFIG.bankTitulaire,
        bankRib: args.bankRib ?? DEFAULT_CONFIG.bankRib,
        bankIban: args.bankIban ?? DEFAULT_CONFIG.bankIban,
        bankSwift: args.bankSwift ?? DEFAULT_CONFIG.bankSwift,
        d17MerchantName: args.d17MerchantName ?? DEFAULT_CONFIG.d17MerchantName,
        d17Phone: args.d17Phone ?? DEFAULT_CONFIG.d17Phone,
        d17Email: args.d17Email ?? DEFAULT_CONFIG.d17Email,
        d17Notice: args.d17Notice ?? DEFAULT_CONFIG.d17Notice,
        proPrice: args.proPrice ?? DEFAULT_CONFIG.proPrice,
        supplierPrice: args.supplierPrice ?? DEFAULT_CONFIG.supplierPrice,
        expertPrice: args.expertPrice ?? DEFAULT_CONFIG.expertPrice,
        currency: args.currency ?? DEFAULT_CONFIG.currency,
        updatedAt: now,
        updatedBy: user._id,
      });
    }

    return { success: true };
  },
});

// ============================================================================
// Plan Pricing & Limits Configuration
// ============================================================================

const DEFAULT_PLAN_PRICING = {
  proPrice: 79,
  expertPrice: 320,
  freeProjectLimit: 3,
  proProjectLimit: 10,
  expertProjectLimit: 100,
  freeDownloadLimit: 0,
  proDownloadLimit: 10,
  expertDownloadLimit: 100,
};

/** Get all plan pricing & limits configuration (admin only) */
export const getPlanPricing = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") return null;

    const config = await ctx.db
      .query("paymentConfig")
      .order("desc")
      .first();

    if (!config) return DEFAULT_PLAN_PRICING;

    return {
      proPrice: config.proPrice ?? DEFAULT_PLAN_PRICING.proPrice,
      expertPrice: config.expertPrice ?? DEFAULT_PLAN_PRICING.expertPrice,
      freeProjectLimit: config.freeProjectLimit ?? DEFAULT_PLAN_PRICING.freeProjectLimit,
      proProjectLimit: config.proProjectLimit ?? DEFAULT_PLAN_PRICING.proProjectLimit,
      expertProjectLimit: config.expertProjectLimit ?? DEFAULT_PLAN_PRICING.expertProjectLimit,
      freeDownloadLimit: config.freeDownloadLimit ?? DEFAULT_PLAN_PRICING.freeDownloadLimit,
      proDownloadLimit: config.proDownloadLimit ?? DEFAULT_PLAN_PRICING.proDownloadLimit,
      expertDownloadLimit: config.expertDownloadLimit ?? DEFAULT_PLAN_PRICING.expertDownloadLimit,
    };
  },
});

/** Update plan pricing & limits configuration (admin only) */
export const updatePlanPricing = mutation({
  args: {
    proPrice: v.optional(v.number()),
    expertPrice: v.optional(v.number()),
    freeProjectLimit: v.optional(v.number()),
    proProjectLimit: v.optional(v.number()),
    expertProjectLimit: v.optional(v.number()),
    freeDownloadLimit: v.optional(v.number()),
    proDownloadLimit: v.optional(v.number()),
    expertDownloadLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Accès non autorisé");
    }

    const existing = await ctx.db
      .query("paymentConfig")
      .order("desc")
      .first();

    const now = Date.now();
    const updates: Record<string, any> = {
      updatedAt: now,
      updatedBy: user._id,
    };

    if (args.proPrice !== undefined) updates.proPrice = args.proPrice;
    if (args.expertPrice !== undefined) updates.expertPrice = args.expertPrice;
    if (args.freeProjectLimit !== undefined) updates.freeProjectLimit = args.freeProjectLimit;
    if (args.proProjectLimit !== undefined) updates.proProjectLimit = args.proProjectLimit;
    if (args.expertProjectLimit !== undefined) updates.expertProjectLimit = args.expertProjectLimit;
    if (args.freeDownloadLimit !== undefined) updates.freeDownloadLimit = args.freeDownloadLimit;
    if (args.proDownloadLimit !== undefined) updates.proDownloadLimit = args.proDownloadLimit;
    if (args.expertDownloadLimit !== undefined) updates.expertDownloadLimit = args.expertDownloadLimit;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("paymentConfig", {
        bankName: "",
        bankTitulaire: "",
        bankRib: "",
        bankIban: "",
        bankSwift: "",
        d17MerchantName: "",
        d17Phone: "",
        d17Email: "",
        d17Notice: "",
        supplierPrice: 120,
        currency: "TND",
        proPrice: args.proPrice ?? DEFAULT_PLAN_PRICING.proPrice,
        expertPrice: args.expertPrice ?? DEFAULT_PLAN_PRICING.expertPrice,
        freeProjectLimit: args.freeProjectLimit ?? DEFAULT_PLAN_PRICING.freeProjectLimit,
        proProjectLimit: args.proProjectLimit ?? DEFAULT_PLAN_PRICING.proProjectLimit,
        expertProjectLimit: args.expertProjectLimit ?? DEFAULT_PLAN_PRICING.expertProjectLimit,
        freeDownloadLimit: args.freeDownloadLimit ?? DEFAULT_PLAN_PRICING.freeDownloadLimit,
        proDownloadLimit: args.proDownloadLimit ?? DEFAULT_PLAN_PRICING.proDownloadLimit,
        expertDownloadLimit: args.expertDownloadLimit ?? DEFAULT_PLAN_PRICING.expertDownloadLimit,
        updatedAt: now,
        updatedBy: user._id,
      });
    }

    return { success: true };
  },
});

/** Seed default payment config (if not exists) */
export const seedDefaultPaymentConfig = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Accès non autorisé");
    }

    const existing = await ctx.db
      .query("paymentConfig")
      .order("desc")
      .first();

    if (existing) {
      // Update with defaults for any missing fields
      const updates: Record<string, any> = { updatedAt: Date.now(), updatedBy: user._id };
      let hasChanges = false;

      for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
        if ((existing as any)[key] === undefined || (existing as any)[key] === null) {
          updates[key] = value;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await ctx.db.patch(existing._id, updates);
      }

      return { seeded: false, message: "La configuration existe déjà" };
    }

    await ctx.db.insert("paymentConfig", {
      ...DEFAULT_CONFIG,
      updatedAt: Date.now(),
      updatedBy: user._id,
    });

    return { seeded: true, message: "Configuration par défaut créée" };
  },
});
