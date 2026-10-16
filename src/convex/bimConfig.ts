import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getCurrentUser } from "./users";
import { P, MARKET_PRICE_M2, PROJECT_PCT, REGION_COST_M2 } from "./bimEngine";
import {
  DEFAULT_LEVEL_COST_CONFIG,
  LEVEL_COEFFICIENTS_VALIDITY_2026,
  LEVEL_COEFFICIENT_RANGES,
  resolveLevelCostConfig,
  type LevelCostConfig,
} from "../lib/buildingLevels";
import {
  DEFAULT_PAINT_QUANTITIES_JSON,
  PAINT_QUANTITY_RANGES,
  parsePaintQuantities,
  paintOutOfRange,
  resolvePaintQuantities,
} from "../lib/paintQuantities";

// ============================================================================
// COEFFICIENTS MULTI-NIVEAUX — configuration administrateur
// ----------------------------------------------------------------------------
// Les coefficients de coût par niveau (RDC 100 % · R+1 et R+2 65-80 % · R+3 et
// suivants 56-80 %), la part des frais communs et le poids de la toiture sont
// modifiables depuis le panneau d'administration avec leur date de validité :
// aucun changement du code source n'est nécessaire. Les valeurs enregistrées
// sont celles qui pilotent réellement le moteur de coûts, le DQE et l'aide à la
// décision.
// ============================================================================

/**
 * Lit les coefficients multi-niveaux stockés en JSON par l'administrateur.
 * Toute valeur manquante ou invalide est ignorée (repli sur les défauts).
 */
export function parseLevelCoefficients(raw?: string | null): Partial<LevelCostConfig> | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return undefined;
    const out: Partial<LevelCostConfig> = {};
    for (const key of [
      "rdc",
      "rPlus1",
      "rPlus2",
      "rPlus3AndAbove",
      "commonShare",
      "roofWeight",
    ] as const) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        out[key] = value;
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  } catch {
    return undefined;
  }
}

/** Coefficients par défaut, sérialisés pour la base (JSON). */
export const DEFAULT_LEVEL_COEFFICIENTS_JSON = JSON.stringify(DEFAULT_LEVEL_COST_CONFIG);

// ============================================================================
// QUANTITÉS ET PRIX DU SEAU DE PEINTURE — configuration administrateur
// ----------------------------------------------------------------------------
// Le projet de référence de 100 m² construit porte 10 seaux de peinture
// intérieure (200 L) et 7 seaux de peinture extérieure (140 L), au seau de
// 20 litres et sur 3 couches. Ces quantités, la règle de proportionnalité, le
// volume du seau et le prix du seau sont modifiables depuis le panneau
// d'administration : les valeurs enregistrées pilotent réellement les deux
// postes de peinture du Quantitatif détaillé (`dqeEngine`), le devis, les
// scénarios budgétaires et les rapports PDF — aucun changement du code source
// n'est nécessaire.
// ============================================================================

/**
 * Vérifie une configuration de peinture : les paramètres enregistrés doivent
 * rester dans les fourchettes admises (une saisie incohérente est refusée, pas
 * silencieusement corrigée).
 */
export function assertPaintQuantitiesInRange(raw?: string | null): void {
  const resolved = resolvePaintQuantities(parsePaintQuantities(raw));
  const outOfRange = paintOutOfRange(resolved);
  if (outOfRange.length > 0) {
    throw new Error(
      `Paramètres de peinture hors fourchette : ${outOfRange
        .map((o) => `${o.key} = ${o.value} (${o.min}-${o.max})`)
        .join(", ")}.`,
    );
  }
}

// ============================================================================
// Queries — configuration du moteur BIM (barèmes Tunisie 2026)
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

    // Defensive parsing: a legacy or partial config row must never crash the
    // admin BIM tab. Invalid/missing fields fall back to safe defaults.
    const safeParse = (raw: any, fallback: any) => {
      if (typeof raw !== "string" || raw.trim() === "") return fallback;
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : fallback;
      } catch {
        return fallback;
      }
    };

    const levelOverrides = parseLevelCoefficients(config.levelCoefficients);
    const paintOverrides = parsePaintQuantities(config.paintQuantities);

    return {
      ...config,
      // Parse JSON strings back to objects for the client
      parsedMarketPrices: safeParse(config.marketPricesM2, {}),
      parsedPercentages: safeParse(config.projectPercentages, {}),
      parsedMultipliers: safeParse(config.regionMultipliers, {}),
      parsedUnitPrices: safeParse(config.unitPrices, {}),
      // Coefficients multi-niveaux EFFECTIFS (défauts fusionnés avec la
      // configuration enregistrée) + fourchettes admises : le panneau
      // d'administration affiche exactement ce que le moteur applique.
      parsedLevelCoefficients: resolveLevelCostConfig(levelOverrides),
      levelCoefficientRanges: LEVEL_COEFFICIENT_RANGES,
      levelCoefficientsAreDefault: levelOverrides === undefined,
      levelCoefficientsValidFrom:
        config.levelCoefficientsValidFrom ?? LEVEL_COEFFICIENTS_VALIDITY_2026.from,
      levelCoefficientsValidUntil:
        config.levelCoefficientsValidUntil ?? LEVEL_COEFFICIENTS_VALIDITY_2026.until,
      // Quantités/prix du seau de peinture EFFECTIFS (défauts fusionnés avec la
      // configuration enregistrée) + fourchettes admises : le panneau
      // d'administration affiche exactement ce que le Quantitatif détaillé
      // applique.
      parsedPaintQuantities: resolvePaintQuantities(paintOverrides),
      paintQuantityRanges: PAINT_QUANTITY_RANGES,
      paintQuantitiesAreDefault: paintOverrides === undefined,
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
    const regionMultipliers = JSON.stringify(REGION_COST_M2);
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
      // Les coefficients multi-niveaux réglés par l'administrateur sont
      // conservés : une actualisation des prix ne les écrase jamais.
      levelCoefficients: existing?.levelCoefficients ?? DEFAULT_LEVEL_COEFFICIENTS_JSON,
      levelCoefficientsValidFrom:
        existing?.levelCoefficientsValidFrom ?? LEVEL_COEFFICIENTS_VALIDITY_2026.from,
      levelCoefficientsValidUntil:
        existing?.levelCoefficientsValidUntil ?? LEVEL_COEFFICIENTS_VALIDITY_2026.until,
      // Les quantités et prix du seau de peinture réglés par l'administrateur
      // sont conservés : une actualisation des prix ne les écrase jamais.
      paintQuantities: existing?.paintQuantities ?? DEFAULT_PAINT_QUANTITIES_JSON,
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
          m.category === "acier_metaux_structure" ||
          m.category === "liants_ciments_mortiers" ||
          m.category === "acier" ||
          m.category === "ciment"
            ? 0.015
            : 0.01;
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

    // ── Market intelligence: seed sources/catalog on first run, then sync ──
    let marketSync: any = null;
    try {
      const sources = await ctx.db.query("marketSources").take(1);
      if (sources.length === 0) {
        await ctx.runMutation(api.marketData.seedMarketData, {});
      }
      marketSync = await ctx.runMutation(internal.marketData.runMarketSyncInternal, {});
    } catch (e) {
      // Non-blocking: market layer failures must not break the BIM refresh
      marketSync = { error: (e as Error).message };
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
      marketSync,
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
    /** Coefficients multi-niveaux (JSON : rdc, rPlus1, rPlus2, rPlus3AndAbove,
     *  commonShare, roofWeight). */
    levelCoefficients: v.optional(v.string()),
    /** Dates de validité des coefficients (bornes incluses, ms epoch). */
    levelCoefficientsValidFrom: v.optional(v.number()),
    levelCoefficientsValidUntil: v.optional(v.number()),
    /** Quantités et prix du seau de peinture (JSON : interiorBuckets,
     *  exteriorBuckets, bucketLiters, referenceSurface, coats, proportional,
     *  interiorBucketPrice, exteriorBucketPrice). */
    paintQuantities: v.optional(v.string()),
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

    // Coefficients multi-niveaux : les valeurs enregistrées pilotent le moteur
    // de coûts. Une saisie hors fourchette est acceptée mais signalée comme
    // anomalie dans l'interface d'administration (rien n'est masqué).
    const rawLevelCoefficients =
      args.levelCoefficients ?? existing?.levelCoefficients ?? DEFAULT_LEVEL_COEFFICIENTS_JSON;
    const resolvedLevels = parseLevelCoefficients(rawLevelCoefficients);
    if (resolvedLevels) {
      const outOfRange = Object.entries(resolvedLevels).filter(([key, value]) => {
        const bounds = (LEVEL_COEFFICIENT_RANGES as Record<string, { min: number; max: number }>)[key];
        return bounds ? value < bounds.min || value > bounds.max : false;
      });
      if (outOfRange.length > 0) {
        throw new Error(
          `Coefficients multi-niveaux hors fourchette : ${outOfRange
            .map(([key, value]) => `${key} = ${value}`)
            .join(", ")}. Admissible : RDC 100 % · R+1 et R+2 65-80 % · R+3 et suivants 56-80 % · frais communs 10-40 % · toiture 2-15 %.`,
        );
      }
    }

    // Quantités/prix de peinture : les valeurs enregistrées pilotent les deux
    // postes du Quantitatif détaillé. Une saisie hors fourchette est refusée
    // (le panneau d'administration signale déjà l'anomalie avant l'envoi).
    const rawPaintQuantities =
      args.paintQuantities ?? existing?.paintQuantities ?? DEFAULT_PAINT_QUANTITIES_JSON;
    assertPaintQuantitiesInRange(rawPaintQuantities);
    const resolvedPaint = resolvePaintQuantities(parsePaintQuantities(rawPaintQuantities));

    const bimConfigData = {
      version: existing ? existing.version + 1 : 1,
      refreshedAt: now,
      refreshedBy: user._id,
      marketPricesM2: args.marketPricesM2 ?? (existing?.marketPricesM2 ?? JSON.stringify(MARKET_PRICE_M2)),
      projectPercentages: args.projectPercentages ?? (existing?.projectPercentages ?? JSON.stringify(PROJECT_PCT)),
      regionMultipliers: args.regionMultipliers ?? (existing?.regionMultipliers ?? JSON.stringify(REGION_COST_M2)),
      unitPrices: args.unitPrices ?? (existing?.unitPrices ?? JSON.stringify(P)),
      levelCoefficients: rawLevelCoefficients,
      levelCoefficientsValidFrom:
        args.levelCoefficientsValidFrom ??
        existing?.levelCoefficientsValidFrom ??
        LEVEL_COEFFICIENTS_VALIDITY_2026.from,
      levelCoefficientsValidUntil:
        args.levelCoefficientsValidUntil ??
        existing?.levelCoefficientsValidUntil ??
        LEVEL_COEFFICIENTS_VALIDITY_2026.until,
      paintQuantities: rawPaintQuantities,
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
      details: `Configuration BIM sauvegardée manuellement (v${bimConfigData.version}) — coefficients multi-niveaux ${JSON.stringify(resolvedLevels ?? {})} · peinture ${JSON.stringify(resolvedPaint)}`,
      createdAt: now,
    });

    return {
      version: bimConfigData.version,
      refreshedAt: now,
      levelCoefficients: resolveLevelCostConfig(resolvedLevels),
      paintQuantities: resolvedPaint,
    };
  },
});

/**
 * Monthly automatic BIM refresh (runs via cron on the 1st of each month).
 * Updates BIM config in DB + material prices with realistic market fluctuations.
 * This is an internal mutation — no auth check needed (cron has no user context).
 */
export const refreshBIMDataMonthly = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find any admin user for logging purposes
    const allUsers = await ctx.db.query("users").take(20);
    const adminUser = allUsers.find((u) => u.role === "admin");
    if (!adminUser) return { updated: 0, error: "No admin user found" };

    // ── 1. Update BIM config in DB ──
    const marketPricesM2 = JSON.stringify(MARKET_PRICE_M2);
    const projectPercentages = JSON.stringify(PROJECT_PCT);
    const regionMultipliers = JSON.stringify(REGION_COST_M2);
    const unitPrices = JSON.stringify(P);

    const existing = await ctx.db
      .query("bimConfig")
      .order("desc")
      .first();

    const bimConfigData = {
      marketPricesM2,
      projectPercentages,
      regionMultipliers,
      unitPrices,
      // Coefficients multi-niveaux : conservés tels quels s'ils existent.
      levelCoefficients: existing?.levelCoefficients ?? DEFAULT_LEVEL_COEFFICIENTS_JSON,
      levelCoefficientsValidFrom:
        existing?.levelCoefficientsValidFrom ?? LEVEL_COEFFICIENTS_VALIDITY_2026.from,
      levelCoefficientsValidUntil:
        existing?.levelCoefficientsValidUntil ?? LEVEL_COEFFICIENTS_VALIDITY_2026.until,
      // Quantités/prix du seau de peinture : conservés tels quels s'ils existent.
      paintQuantities: existing?.paintQuantities ?? DEFAULT_PAINT_QUANTITIES_JSON,
      version: existing ? existing.version + 1 : 1,
      refreshedAt: now,
      refreshedBy: adminUser._id,
    };

    if (existing) {
      await ctx.db.patch(existing._id, bimConfigData);
    } else {
      await ctx.db.insert("bimConfig", bimConfigData);
    }

    // ── 2. Refresh material prices with market fluctuations ──
    const materials = await ctx.db.query("materialPrices").collect();
    let updatedMaterials = 0;

    if (materials.length > 0) {
      // Tunisian inflation ~1-2% over 6 months, so ~0.2-0.3% per month
      const baseInflation = 0.002 + Math.random() * 0.003;

      for (const m of materials) {
        const volatility =
          m.category === "acier_metaux_structure" ||
          m.category === "liants_ciments_mortiers" ||
          m.category === "acier" ||
          m.category === "ciment"
            ? 0.015
            : 0.01;
        const change = baseInflation + (Math.random() - 0.5) * volatility;
        const newPrice = Math.round(m.unitPrice * (1 + change) * 1000) / 1000;

        if (newPrice !== m.unitPrice && newPrice > 0) {
          // Record history
          await ctx.db.insert("priceHistory", {
            materialPriceId: m._id,
            previousPrice: m.unitPrice,
            newPrice: newPrice,
            changedBy: adminUser._id,
            changedAt: now,
          });

          // Update price
          await ctx.db.patch(m._id, {
            unitPrice: newPrice,
            lastUpdated: now,
            updatedBy: adminUser._id,
          });
          updatedMaterials++;
        }
      }
    }

    // ── 3. Market intelligence sync (seed is done via the manual admin button) ──
    // Non-blocking: market layer failures must not break the BIM refresh
    try {
      await ctx.runMutation(internal.marketData.runMarketSyncInternal, {});
    } catch {
      // ignore market layer failures
    }

    // ── 4. Log the automatic update ──
    await ctx.db.insert("adminLogs", {
      adminId: adminUser._id,
      adminName: adminUser.name || "Système",
      action: "bim_refresh" as any,
      details: `Mise à jour mensuelle automatique — v${bimConfigData.version}, ${materials.length} matériaux, ${updatedMaterials} mis à jour`,
      createdAt: now,
    });

    return {
      version: bimConfigData.version,
      materialCount: materials.length,
      updatedMaterials,
      categoriesCount: Object.keys(MARKET_PRICE_M2).length,
    };
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
