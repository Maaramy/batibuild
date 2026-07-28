import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { P, MARKET_PRICE_M2, PROJECT_PCT, REGION_MULTIPLIER } from "./bimEngine";

// ============================================================================
// Queries
// ============================================================================

/** Get the latest BIM configuration (if any) */
export const getBIMConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("bimConfig")
      .order("desc")
      .first();
    if (!config) return null;
    return {
      ...config,
      // Parse JSON strings back to objects for the client
      parsedMarketPrices: JSON.parse(config.marketPricesM2),
      parsedPercentages: JSON.parse(config.projectPercentages),
      parsedMultipliers: JSON.parse(config.regionMultipliers),
      parsedUnitPrices: JSON.parse(config.unitPrices),
    };
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Refresh the BIM engine data from hardcoded defaults.
 * This stores the current BIM constants (market prices, percentages, multipliers)
 * into the database so the admin can see and verify them.
 * It also refreshes material prices with realistic market fluctuations.
 */
export const refreshBIMData = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const now = Date.now();

    // Serialize all BIM constants to JSON for storage
    const marketPricesM2 = JSON.stringify(MARKET_PRICE_M2);
    const projectPercentages = JSON.stringify(PROJECT_PCT);
    const regionMultipliers = JSON.stringify(REGION_MULTIPLIER);
    const unitPrices = JSON.stringify(P);

    // Find existing config and update, or create new one
    const existing = await ctx.db
      .query("bimConfig")
      .order("desc")
      .first();

    const bimConfigData = {
      marketPricesM2,
      projectPercentages,
      regionMultipliers,
      unitPrices,
      version: existing ? existing.version + 1 : 1,
      refreshedAt: now,
      refreshedBy: user._id,
    };

    if (existing) {
      await ctx.db.patch(existing._id, bimConfigData);
    } else {
      await ctx.db.insert("bimConfig", bimConfigData);
    }

    // Also refresh material prices with market fluctuations
    const materials = await ctx.db.query("materialPrices").collect();
    let updatedMaterials = 0;

    if (materials.length > 0) {
      // Tunisian inflation simulation ~0.2-0.5% per update
      const baseInflation = 0.002 + Math.random() * 0.003;

      for (const m of materials) {
        const volatility =
          m.category === "acier" || m.category === "ciment" ? 0.015 : 0.01;
        const change = baseInflation + (Math.random() - 0.5) * volatility;
        const newPrice = Math.round(m.unitPrice * (1 + change) * 1000) / 1000;

        if (newPrice !== m.unitPrice && newPrice > 0) {
          await ctx.db.insert("priceHistory", {
            materialPriceId: m._id,
            previousPrice: m.unitPrice,
            newPrice: newPrice,
            changedBy: user._id,
            changedAt: now,
          });

          await ctx.db.patch(m._id, {
            unitPrice: newPrice,
            lastUpdated: now,
            updatedBy: user._id,
          });
          updatedMaterials++;
        }
      }
    }

    // Log the action
    await ctx.db.insert("adminLogs", {
      adminId: user._id,
      adminName: user.name || "Admin",
      action: "bim_refresh" as any,
      details: `Mise à jour BIM v${bimConfigData.version} — ${materials.length} matériaux traités, ${updatedMaterials} mis à jour`,
      createdAt: now,
    });

    return {
      version: bimConfigData.version,
      refreshedAt: now,
      materialCount: materials.length,
      updatedMaterials,
      categoriesCount: Object.keys(MARKET_PRICE_M2).length,
    };
  },
});

/**
 * Save custom BIM configuration (admin only).
 * Allows overriding market prices, percentages, etc via JSON.
 */
export const saveBIMConfig = mutation({
  args: {
    marketPricesM2: v.optional(v.string()),
    projectPercentages: v.optional(v.string()),
    regionMultipliers: v.optional(v.string()),
    unitPrices: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("bimConfig")
      .order("desc")
      .first();

    const bimConfigData = {
      version: existing ? existing.version + 1 : 1,
      refreshedAt: now,
      refreshedBy: user._id,
      marketPricesM2: args.marketPricesM2 ?? (existing?.marketPricesM2 ?? JSON.stringify(MARKET_PRICE_M2)),
      projectPercentages: args.projectPercentages ?? (existing?.projectPercentages ?? JSON.stringify(PROJECT_PCT)),
      regionMultipliers: args.regionMultipliers ?? (existing?.regionMultipliers ?? JSON.stringify(REGION_MULTIPLIER)),
      unitPrices: args.unitPrices ?? (existing?.unitPrices ?? JSON.stringify(P)),
    };

    if (existing) {
      await ctx.db.patch(existing._id, bimConfigData);
    } else {
      await ctx.db.insert("bimConfig", bimConfigData);
    }

    await ctx.db.insert("adminLogs", {
      adminId: user._id,
      adminName: user.name || "Admin",
      action: "bim_save" as any,
      details: `Configuration BIM sauvegardée manuellement (v${bimConfigData.version})`,
      createdAt: now,
    });

    return { version: bimConfigData.version, refreshedAt: now };
  },
});

/**
 * Get BIM refresh history (last 20 logs)
 */
export const getBIMRefreshHistory = query({
  args: {},
  handler: async (ctx) => {
    const allLogs = await ctx.db.query("adminLogs").order("desc").take(100);
    const bimLogs: any[] = [];
    for (const log of allLogs) {
      if (log.action === "bim_refresh" || log.action === "bim_save") {
        bimLogs.push(log);
      }
      if (bimLogs.length >= 20) break;
    }
    return bimLogs;
  },
});
