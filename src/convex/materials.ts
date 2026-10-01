import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { materialCategoryValidator } from "./schema";
import { TUNISIA_2026_CATALOG } from "./materialCatalog2026";
import { evaluatePriceAlerts } from "./materialAlerts";

// Champs de la fiche matériau enrichie (tous optionnels).
const enrichmentArgs = {
  characteristics: v.optional(
    v.array(v.object({ label: v.string(), value: v.string() })),
  ),
  certifications: v.optional(v.array(v.string())),
  norms: v.optional(v.array(v.string())),
  packaging: v.optional(v.string()),
  usageAdvice: v.optional(v.string()),
  storageAdvice: v.optional(v.string()),
  safetyAdvice: v.optional(v.string()),
  compatibility: v.optional(v.array(v.string())),
  imageUrl: v.optional(v.string()),
  technicalSheetUrl: v.optional(v.string()),
  supplierRef: v.optional(v.string()),
};

type EnrichmentInput = {
  characteristics?: { label: string; value: string }[];
  certifications?: string[];
  norms?: string[];
  packaging?: string;
  usageAdvice?: string;
  storageAdvice?: string;
  safetyAdvice?: string;
  compatibility?: string[];
  imageUrl?: string;
  technicalSheetUrl?: string;
  supplierRef?: string;
};

/** Vrai dès qu'au moins un champ de la fiche enrichie est fourni. */
function hasEnrichmentFields(args: EnrichmentInput): boolean {
  return Object.keys(pickEnrichment(args)).length > 0;
}

/** Sous-ensemble « fiche enrichie » réellement présent dans les arguments. */
function pickEnrichment(args: EnrichmentInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keys: (keyof EnrichmentInput)[] = [
    "characteristics",
    "certifications",
    "norms",
    "packaging",
    "usageAdvice",
    "storageAdvice",
    "safetyAdvice",
    "compatibility",
    "imageUrl",
    "technicalSheetUrl",
    "supplierRef",
  ];
  for (const key of keys) {
    if (args[key] !== undefined) out[key] = args[key];
  }
  return out;
}

// ============================================================================
// Queries
// ============================================================================

/** Get all material prices, optionally filtered by category */
export const getMaterialPrices = query({
  args: {
    category: v.optional(materialCategoryValidator),
  },
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db
        .query("materialPrices")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    }
    return await ctx.db.query("materialPrices").collect();
  },
});

/** Get all supplier offers (used by AI actions via runQuery — actions have no ctx.db). */
export const getMaterialOffers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("materialOffers").collect();
  },
});

/** Get all material categories with summary (count, avg price, quality stats) */
export const getMaterialCategories = query({
  args: {},
  handler: async (ctx) => {
    const materials = await ctx.db.query("materialPrices").collect();
    const categories = new Map<
      string,
      { count: number; totalValue: number; observed: number; confident: number }
    >();
    for (const m of materials) {
      const existing = categories.get(m.category) || {
        count: 0,
        totalValue: 0,
        observed: 0,
        confident: 0,
      };
      categories.set(m.category, {
        count: existing.count + 1,
        totalValue: existing.totalValue + m.unitPrice,
        observed: existing.observed + (m.priceQuality === "observé_en_ligne" ? 1 : 0),
        confident: existing.confident + ((m.confidenceIndex ?? 0) >= 0.8 ? 1 : 0),
      });
    }
    return Array.from(categories.entries()).map(([category, data]) => ({
      category,
      ...data,
      avgPrice: data.count > 0 ? Math.round((data.totalValue / data.count) * 1000) / 1000 : 0,
    }));
  },
});

/** Get a single material price by ID */
export const getMaterialPrice = query({
  args: { id: v.id("materialPrices") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/** Search materials by name */
export const searchMaterials = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const materials = await ctx.db.query("materialPrices").collect();
    const q = args.query.toLowerCase();
    return materials.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q),
    );
  },
});

// ============================================================================
// Mutations (Admin-only)
// ============================================================================

/** Create a new material price (admin only) */
export const createMaterialPrice = mutation({
  args: {
    category: materialCategoryValidator,
    name: v.string(),
    nameAr: v.optional(v.string()),
    nameFr: v.optional(v.string()),
    unit: v.string(),
    unitPrice: v.number(),
    currency: v.string(),
    region: v.optional(v.string()),
    notes: v.optional(v.string()),
    priceQuality: v.optional(
      v.union(
        v.literal("observé_en_ligne"),
        v.literal("publication_2026"),
        v.literal("estimation_indicative"),
      ),
    ),
    confidenceIndex: v.optional(v.number()),
    ...enrichmentArgs,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }
    const hasEnrichment = hasEnrichmentFields(args);
    const id = await ctx.db.insert("materialPrices", {
      category: args.category,
      name: args.name,
      nameAr: args.nameAr,
      nameFr: args.nameFr,
      unit: args.unit,
      unitPrice: args.unitPrice,
      currency: args.currency,
      region: args.region,
      notes: args.notes,
      priceQuality: args.priceQuality,
      confidenceIndex: args.confidenceIndex,
      ...pickEnrichment(args),
      ...(hasEnrichment ? { enrichmentUpdatedAt: Date.now() } : {}),
      lastUpdated: Date.now(),
      updatedBy: user._id,
    });
    return id;
  },
});

/** Update a material price (admin only) */
export const updateMaterialPrice = mutation({
  args: {
    id: v.id("materialPrices"),
    unitPrice: v.optional(v.number()),
    name: v.optional(v.string()),
    nameAr: v.optional(v.string()),
    nameFr: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    brand: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    description: v.optional(v.string()),
    unit: v.optional(v.string()),
    region: v.optional(v.string()),
    notes: v.optional(v.string()),
    priceQuality: v.optional(
      v.union(
        v.literal("observé_en_ligne"),
        v.literal("publication_2026"),
        v.literal("estimation_indicative"),
      ),
    ),
    confidenceIndex: v.optional(v.number()),
    ...enrichmentArgs,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Material not found");

    // Record price history if price changed
    if (args.unitPrice !== undefined && args.unitPrice !== existing.unitPrice) {
      await ctx.db.insert("priceHistory", {
        materialPriceId: args.id,
        previousPrice: existing.unitPrice,
        newPrice: args.unitPrice,
        changedBy: user._id,
        changedAt: Date.now(),
      });
    }

    await ctx.db.patch(args.id, {
      ...(args.unitPrice !== undefined && { unitPrice: args.unitPrice }),
      ...(args.name !== undefined && { name: args.name }),
      ...(args.nameAr !== undefined && { nameAr: args.nameAr }),
      ...(args.nameFr !== undefined && { nameFr: args.nameFr }),
      ...(args.subcategory !== undefined && { subcategory: args.subcategory }),
      ...(args.brand !== undefined && { brand: args.brand }),
      ...(args.manufacturer !== undefined && { manufacturer: args.manufacturer }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.unit !== undefined && { unit: args.unit }),
      ...(args.region !== undefined && { region: args.region }),
      ...(args.notes !== undefined && { notes: args.notes }),
      ...(args.priceQuality !== undefined && { priceQuality: args.priceQuality }),
      ...(args.confidenceIndex !== undefined && { confidenceIndex: args.confidenceIndex }),
      ...pickEnrichment(args),
      ...(hasEnrichmentFields(args) ? { enrichmentUpdatedAt: Date.now() } : {}),
      lastUpdated: Date.now(),
      updatedBy: user._id,
    });

    // Déclenche les alertes prix des utilisateurs qui suivent ce matériau.
    if (args.unitPrice !== undefined && args.unitPrice !== existing.unitPrice) {
      await evaluatePriceAlerts(ctx, existing, existing.unitPrice, args.unitPrice);
    }
    return args.id;
  },
});

/** Delete a material price (admin only) */
export const deleteMaterialPrice = mutation({
  args: { id: v.id("materialPrices") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }
    await ctx.db.delete(args.id);
  },
});

// ============================================================================
// Seed & Monthly Price Updates
// ============================================================================

/**
 * Seed the official 2026 material catalog (Tunisia).
 * Idempotent : les matériaux déjà présents sont simplement mis à jour.
 */
export const seedMaterialPrices = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const existing = await ctx.db.query("materialPrices").collect();
    const byName = new Map(existing.map((m) => [m.name, m]));
    const now = Date.now();
    let created = 0;
    let updated = 0;

    for (const item of TUNISIA_2026_CATALOG) {
      const current = byName.get(item.name);
      if (current) {
        // Mise à jour silencieuse (catégorie officielle + prix + qualité)
        if (
          current.category !== item.category ||
          current.unitPrice !== item.unitPrice ||
          current.priceQuality !== item.quality ||
          (item.sku ?? undefined) !== current.sku
        ) {
          await ctx.db.patch(current._id, {
            category: item.category as any,
            unitPrice: item.unitPrice,
            priceQuality: item.quality,
            confidenceIndex: item.confidence,
            subcategory: item.subcategory,
            sku: item.sku,
            lastUpdated: now,
            updatedBy: user._id,
          });
          updated++;
        }
        continue;
      }
      await ctx.db.insert("materialPrices", {
        category: item.category as any,
        name: item.name,
        unit: item.unit,
        unitPrice: item.unitPrice,
        currency: "TND",
        lastUpdated: now,
        updatedBy: user._id,
        subcategory: item.subcategory,
        priceQuality: item.quality,
        confidenceIndex: item.confidence,
        sku: item.sku,
      });
      created++;
    }

    return { count: created, updated, total: TUNISIA_2026_CATALOG.length };
  },
});

/**
 * Réinitialise complètement la base des prix : supprime toutes les références
 * (et leur historique), puis charge le catalogue officiel 2026 (admin only).
 * À utiliser après une refonte du catalogue — les anciennes références legacy
 * (main d'œuvre, transport, engins…) ne sont pas conservées.
 */
export const resetMaterialPrices = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    // 1. Supprimer les références existantes + leur historique de prix
    const existing = await ctx.db.query("materialPrices").collect();
    for (const m of existing) {
      const history = await ctx.db
        .query("priceHistory")
        .withIndex("by_material", (q) => q.eq("materialPriceId", m._id))
        .collect();
      for (const h of history) await ctx.db.delete(h._id);
      await ctx.db.delete(m._id);
    }

    // 2. Charger le catalogue officiel 2026
    const now = Date.now();
    let seeded = 0;
    for (const item of TUNISIA_2026_CATALOG) {
      await ctx.db.insert("materialPrices", {
        category: item.category as any,
        name: item.name,
        unit: item.unit,
        unitPrice: item.unitPrice,
        currency: "TND",
        lastUpdated: now,
        updatedBy: user._id,
        subcategory: item.subcategory,
        priceQuality: item.quality,
        confidenceIndex: item.confidence,
        sku: item.sku,
      });
      seeded++;
    }

    return { deleted: existing.length, seeded, total: TUNISIA_2026_CATALOG.length };
  },
});

/** Monthly automatic price update with realistic fluctuations */
export const updateAllMaterialPrices = internalMutation({
  args: {},
  handler: async (ctx) => {
    const materials = await ctx.db.query("materialPrices").collect();
    if (materials.length === 0) return { updated: 0 };

    // Get an admin user for the update
    const admins = await ctx.db
      .query("users")
      .withIndex("subscriptionPlan", (q) => q.eq("subscriptionPlan", "free"))
      .take(1);
    const adminUser = admins[0];
    if (!adminUser) return { updated: 0 };

    let updated = 0;
    // Tunisian inflation ~1-2% over 6 months, so ~0.2-0.3% per month
    const baseInflation = 0.002 + Math.random() * 0.003;

    for (const m of materials) {
      // Each material has its own random fluctuation around the base inflation
      const volatile =
        m.category === "acier_metaux_structure" ||
        m.category === "liants_ciments_mortiers" ||
        m.category === "acier" ||
        m.category === "ciment";
      const volatility = volatile ? 0.015 : 0.01;
      const change = baseInflation + (Math.random() - 0.5) * volatility;
      const newPrice = Math.round(m.unitPrice * (1 + change) * 1000) / 1000;

      if (newPrice !== m.unitPrice && newPrice > 0) {
        // Record history
        await ctx.db.insert("priceHistory", {
          materialPriceId: m._id,
          previousPrice: m.unitPrice,
          newPrice: newPrice,
          changedBy: adminUser._id,
          changedAt: Date.now(),
        });

        // Update price
        await ctx.db.patch(m._id, {
          unitPrice: newPrice,
          lastUpdated: Date.now(),
          updatedBy: adminUser._id,
        });
        await evaluatePriceAlerts(ctx, m, m.unitPrice, newPrice);
        updated++;
      }
    }

    return { updated };
  },
});

/** Manually trigger a price refresh (admin only) - applies market fluctuations */
export const refreshMaterialPrices = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const materials = await ctx.db.query("materialPrices").collect();
    if (materials.length === 0) {
      throw new Error("Aucun matériau à mettre à jour. Veuillez d'abord initialiser les prix.");
    }

    let updated = 0;
    // Tunisian inflation simulation
    const baseInflation = 0.001 + Math.random() * 0.004;

    for (const m of materials) {
      const volatile =
        m.category === "acier_metaux_structure" ||
        m.category === "liants_ciments_mortiers" ||
        m.category === "acier" ||
        m.category === "ciment";
      const volatility = volatile ? 0.02 : 0.012;
      const change = baseInflation + (Math.random() - 0.5) * volatility;
      const newPrice = Math.round(m.unitPrice * (1 + change) * 1000) / 1000;

      if (newPrice !== m.unitPrice && newPrice > 0) {
        await ctx.db.insert("priceHistory", {
          materialPriceId: m._id,
          previousPrice: m.unitPrice,
          newPrice: newPrice,
          changedBy: user._id,
          changedAt: Date.now(),
        });

        await ctx.db.patch(m._id, {
          unitPrice: newPrice,
          lastUpdated: Date.now(),
          updatedBy: user._id,
        });
        await evaluatePriceAlerts(ctx, m, m.unitPrice, newPrice);
        updated++;
      }
    }

    return { updated, total: materials.length };
  },
});

/**
 * Bulk update material prices from an Excel import.
 * Each row must have either `sku` or `name` to match, plus a `unitPrice`.
 * Returns summary: { updated, created, errors, total }.
 */
export const bulkUpdateMaterialPrices = mutation({
  args: {
    rows: v.array(
      v.object({
        sku: v.optional(v.string()),
        name: v.string(),
        unitPrice: v.number(),
        unit: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const existing = await ctx.db.query("materialPrices").collect();
    const now = Date.now();
    let updated = 0;
    let created = 0;
    const errors: string[] = [];

    // Index existing materials by SKU and by name
    const bySku = new Map<string, (typeof existing)[number]>();
    const byName = new Map<string, (typeof existing)[number]>();
    for (const m of existing) {
      if (m.sku) bySku.set(m.sku, m);
      byName.set(m.name, m);
    }

    for (const row of args.rows) {
      try {
        if (row.unitPrice <= 0 || !isFinite(row.unitPrice)) {
          errors.push(`Ligne « ${row.name} » : prix invalide (${row.unitPrice})`);
          continue;
        }

        // Try matching by SKU first, then by name
        let match = row.sku ? bySku.get(row.sku) : undefined;
        if (!match) match = byName.get(row.name);

        if (match) {
          // Update existing material if price changed
          if (match.unitPrice !== row.unitPrice) {
            await ctx.db.insert("priceHistory", {
              materialPriceId: match._id,
              previousPrice: match.unitPrice,
              newPrice: row.unitPrice,
              changedBy: user._id,
              changedAt: now,
            });
            await ctx.db.patch(match._id, {
              unitPrice: row.unitPrice,
              ...(row.unit && { unit: row.unit }),
              ...(row.sku && { sku: row.sku }),
              lastUpdated: now,
              updatedBy: user._id,
            });
            await evaluatePriceAlerts(ctx, match, match.unitPrice, row.unitPrice);
            updated++;
          }
        } else if (row.sku) {
          // Create new material from import
          await ctx.db.insert("materialPrices", {
            name: row.name,
            sku: row.sku,
            unitPrice: row.unitPrice,
            unit: row.unit || "unité",
            category: "divers" as any,
            currency: "TND",
            priceQuality: "observé_en_ligne",
            lastUpdated: now,
            updatedBy: user._id,
          });
          created++;
        } else {
          errors.push(`Ligne « ${row.name} » : aucun SKU/nom correspondant trouvé`);
        }
      } catch (err: any) {
        errors.push(`Ligne « ${row.name} » : ${err.message || "erreur inconnue"}`);
      }
    }

    return {
      updated,
      created,
      errors,
      total: args.rows.length,
      totalMaterials: existing.length + created,
    };
  },
});

/** Get price history for a material */
export const getPriceHistory = query({
  args: { materialPriceId: v.id("materialPrices") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("priceHistory")
      .withIndex("by_material", (q) =>
        q.eq("materialPriceId", args.materialPriceId),
      )
      .order("desc")
      .collect();
  },
});
