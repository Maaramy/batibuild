import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { materialCategoryValidator } from "./schema";

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

/** Get all material categories with summary */
export const getMaterialCategories = query({
  args: {},
  handler: async (ctx) => {
    const materials = await ctx.db.query("materialPrices").collect();
    const categories = new Map<
      string,
      { count: number; totalValue: number }
    >();
    for (const m of materials) {
      const existing = categories.get(m.category) || {
        count: 0,
        totalValue: 0,
      };
      categories.set(m.category, {
        count: existing.count + 1,
        totalValue: existing.totalValue + m.unitPrice,
      });
    }
    return Array.from(categories.entries()).map(([category, data]) => ({
      category,
      ...data,
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
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }
    const id = await ctx.db.insert("materialPrices", {
      ...args,
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
    unit: v.optional(v.string()),
    region: v.optional(v.string()),
    notes: v.optional(v.string()),
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
      ...(args.unit !== undefined && { unit: args.unit }),
      ...(args.region !== undefined && { region: args.region }),
      ...(args.notes !== undefined && { notes: args.notes }),
      lastUpdated: Date.now(),
      updatedBy: user._id,
    });
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
