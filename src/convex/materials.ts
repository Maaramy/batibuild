import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { materialCategoryValidator } from "./schema";
import { P } from "./bimEngine";
import { internalMutation } from "./_generated/server";

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

// ============================================================================
// Seed & Monthly Price Updates
// ============================================================================

/** Seed initial material prices from the BIM engine (Tunisia 2026) */
export const seedMaterialPrices = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const existing = await ctx.db.query("materialPrices").first();
    if (existing) {
      throw new Error("Prices already seeded. Use updateAllMaterialPrices to refresh.");
    }

    const materials: {
      category: string; name: string; unit: string; unitPrice: number;
    }[] = [];

    // Extract from BIM engine P constant
    for (const [key, val] of Object.entries(P)) {
      if (typeof val === "object" && val !== null) {
        if (key === "cement") {
          materials.push(
            { category: "ciment", name: "Ciment CPJ 42.5 (Sac 50kg)", unit: "sacs", unitPrice: (val as any).bag42_5 },
            { category: "ciment", name: "Ciment CPJ 32.5 (Sac 50kg)", unit: "sacs", unitPrice: (val as any).bag32_5 },
          );
        } else if (key === "sand") {
          materials.push(
            { category: "sable", name: "Sable de construction 0/4", unit: "m³", unitPrice: (val as any).construction },
            { category: "sable", name: "Sable fin", unit: "m³", unitPrice: (val as any).fine },
          );
        } else if (key === "gravel") {
          materials.push(
            { category: "gravier", name: "Gravier 15/25mm", unit: "m³", unitPrice: (val as any)["15_25mm"] },
            { category: "gravier", name: "Gravier 8/15mm", unit: "m³", unitPrice: (val as any)["8_15mm"] },
          );
        } else if (key === "bricks") {
          materials.push(
            { category: "briques", name: "Brique creuse 10cm", unit: "unités", unitPrice: (val as any).hollow_10 },
            { category: "briques", name: "Brique creuse 15cm", unit: "unités", unitPrice: (val as any).hollow_15 },
            { category: "briques", name: "Hourdis 16x50", unit: "unités", unitPrice: (val as any).hourdis_16 },
            { category: "parpaings", name: "Parpaing creux 15cm", unit: "unités", unitPrice: (val as any).parpaing_15 },
            { category: "parpaings", name: "Parpaing creux 20cm", unit: "unités", unitPrice: (val as any).parpaing_20 },
          );
        } else if (key === "concrete") {
          materials.push(
            { category: "beton", name: "Béton prêt 250 kg/m³", unit: "m³", unitPrice: (val as any).ready_mix_250 },
            { category: "beton", name: "Béton prêt 300 kg/m³", unit: "m³", unitPrice: (val as any).ready_mix_300 },
            { category: "beton", name: "Béton prêt 350 kg/m³", unit: "m³", unitPrice: (val as any).ready_mix_350 },
          );
        } else if (key === "steel") {
          materials.push(
            { category: "acier", name: "Acier T6 (barre)", unit: "m", unitPrice: (val as any).t6_m },
            { category: "acier", name: "Acier T8 (barre)", unit: "m", unitPrice: (val as any).t8_m },
            { category: "acier", name: "Acier T10 (barre)", unit: "m", unitPrice: (val as any).t10_m },
            { category: "acier", name: "Acier T12 (tonne)", unit: "tonnes", unitPrice: (val as any).t12_ton },
          );
        } else if (key === "tiles") {
          materials.push(
            { category: "carrelage", name: "Carrelage sol grès cérame", unit: "m²", unitPrice: (val as any).floor_m2 },
            { category: "carrelage", name: "Carrelage mural faïence", unit: "m²", unitPrice: (val as any).wall_m2 },
            { category: "marbre", name: "Marbre", unit: "m²", unitPrice: (val as any).marble_m2 },
            { category: "carrelage", name: "Plinthe céramique", unit: "ml", unitPrice: (val as any).plinthe_ml },
          );
        } else if (key === "paint") {
          materials.push(
            { category: "peinture", name: "Peinture intérieure mate", unit: "litres", unitPrice: (val as any).interior_l },
            { category: "peinture", name: "Peinture extérieure acrylique", unit: "litres", unitPrice: (val as any).exterior_l },
          );
        } else if (key === "plumbing") {
          materials.push(
            { category: "plomberie", name: "Tuyau PVC Ø110", unit: "ml", unitPrice: (val as any).pvc_110 },
            { category: "plomberie", name: "Tuyau PVC Ø50", unit: "ml", unitPrice: (val as any).pvc_50 },
            { category: "plomberie", name: "Chauffe-eau électrique 80L", unit: "unités", unitPrice: (val as any).geyser },
            { category: "plomberie", name: "WC complet avec réservoir", unit: "unités", unitPrice: (val as any).wc },
          );
        } else if (key === "electrical") {
          materials.push(
            { category: "electricite", name: "Câble électrique 2.5mm²", unit: "ml", unitPrice: (val as any).cable_2_5_m },
            { category: "electricite", name: "Disjoncteur 20A", unit: "unités", unitPrice: (val as any).breaker },
            { category: "electricite", name: "Tableau électrique 13 modules", unit: "unités", unitPrice: (val as any).panel },
            { category: "electricite", name: "Luminaire LED plafonnier", unit: "unités", unitPrice: (val as any).led_light },
          );
        } else if (key === "doors") {
          materials.push(
            { category: "portes", name: "Porte intérieure en bois", unit: "unités", unitPrice: (val as any).simple },
            { category: "portes", name: "Porte d'entrée métallique", unit: "unités", unitPrice: (val as any).metal },
          );
        } else if (key === "windows") {
          materials.push(
            { category: "fenetres", name: "Fenêtre alu simple vitrage", unit: "unités", unitPrice: (val as any).alu_simple },
            { category: "fenetres", name: "Grille de protection métallique", unit: "unités", unitPrice: (val as any).iron_grille },
          );
        } else if (key === "roofing") {
          materials.push(
            { category: "toiture", name: "Tuile canal rouge", unit: "m²", unitPrice: (val as any).tile_m2 },
            { category: "etancheite", name: "Étanchéité liquide bitumeuse", unit: "m²", unitPrice: (val as any).waterproof_m2 },
            { category: "isolation", name: "Isolation thermique", unit: "m²", unitPrice: (val as any).insulation_m2 },
          );
        } else if (key === "labor") {
          materials.push(
            { category: "main_oeuvre", name: "Maçon qualifié (jour)", unit: "jours", unitPrice: (val as any).mason_day },
            { category: "main_oeuvre", name: "Manœuvre (jour)", unit: "jours", unitPrice: (val as any).worker_day },
            { category: "main_oeuvre", name: "Électricien (jour)", unit: "jours", unitPrice: (val as any).electrician_day },
            { category: "main_oeuvre", name: "Plombier (jour)", unit: "jours", unitPrice: (val as any).plumber_day },
          );
        } else if (key === "transport") {
          materials.push(
            { category: "transport", name: "Transport benne 10t (voyage)", unit: "voyages", unitPrice: (val as any).truck_trip },
            { category: "transport", name: "Bétonnière portée (m³)", unit: "m³", unitPrice: (val as any).mixer_m3 },
          );
        } else if (key === "equipment") {
          materials.push(
            { category: "location_engins", name: "Pelle mécanique (jour)", unit: "jours", unitPrice: (val as any).excavator_day },
            { category: "location_engins", name: "Compacteur (jour)", unit: "jours", unitPrice: (val as any).compactor_day },
            { category: "location_engins", name: "Bétonnière électrique (jour)", unit: "jours", unitPrice: (val as any).mixer_day },
          );
        }
      }
    }

    // Add additional materials
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

    const now = Date.now();
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

    return { count: materials.length };
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
      const volatility = m.category === "acier" || m.category === "ciment" ? 0.015 : 0.01;
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
      const volatility = m.category === "acier" || m.category === "ciment" ? 0.02 : 0.012;
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
        updated++;
      }
    }

    return { updated, total: materials.length };
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
