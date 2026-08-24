import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { materialCategoryValidator } from "./schema";

// ═══════════════════════════════════════════════════════════════════════════
// Intelligence Marché — BIM engine market data layer (Tunisia)
// Sources registry, product catalog, seed/sync, AI analytics.
// ═══════════════════════════════════════════════════════════════════════════

// ── Registry of market sources (fabricants / distributeurs / plateformes) ──
export const MARKET_SOURCES = [
  { name: "Carthage Cement", type: "fabricant", website: "carthagecement.com.tn", reliabilityScore: 0.95 },
  { name: "Les Ciments de Bizerte", type: "fabricant", website: "cimentsdebizerte.com.tn", reliabilityScore: 0.95 },
  { name: "El Fouledh", type: "fabricant", website: "elfouledh.com.tn", reliabilityScore: 0.93 },
  { name: "SOTEMAIL", type: "fabricant", website: "sotemail.com.tn", reliabilityScore: 0.9 },
  { name: "SOPAL", type: "fabricant", website: "sopal.com.tn", reliabilityScore: 0.9 },
  { name: "Knauf Tunisie", type: "fabricant", website: "knauf.tn", reliabilityScore: 0.92 },
  { name: "CGC Tunisie", type: "distributeur", website: "cgc.com.tn", reliabilityScore: 0.85 },
  { name: "CONAP Tunisie", type: "distributeur", website: "conap.com.tn", reliabilityScore: 0.85 },
  { name: "COFEQ", type: "distributeur", website: "cofeq.com.tn", reliabilityScore: 0.84 },
  { name: "COMAF", type: "distributeur", website: "comaf.com.tn", reliabilityScore: 0.86 },
  { name: "Comptoir Hammami", type: "distributeur", website: "comptoirhammami.com", reliabilityScore: 0.88 },
  { name: "COBAM Group", type: "distributeur", website: "cobam.tn", reliabilityScore: 0.85 },
  { name: "Comptoir Pro", type: "distributeur", website: "comptoirpro.com.tn", reliabilityScore: 0.83 },
  { name: "eBonus Market", type: "distributeur", website: "ebonusmarket.com", reliabilityScore: 0.82 },
  { name: "Batiprice Tunisie", type: "plateforme", website: "batiprice.com", reliabilityScore: 0.9 },
  { name: "BMP (Building Market Place)", type: "plateforme", website: "bmp.tn", reliabilityScore: 0.88 },
  { name: "Medina Construction", type: "plateforme", website: "medinaconstruction.com", reliabilityScore: 0.86 },
  { name: "Go Africa Tunisie", type: "plateforme", website: "goafricaonline.com", reliabilityScore: 0.8 },
];

// ── Seed market data (admin only) ─────────────────────────────────────────
export const seedMarketData = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "moderator")) {
      throw new Error("Cette action est réservée aux administrateurs.");
    }

    // Seed materialPrices if empty
    const existing = await ctx.db.query("materialPrices").collect();
    if (existing.length > 0) {
      return { message: "Données marché déjà initialisées.", count: existing.length };
    }

    const MATERIALS_SEED = [
      { name: "Ciment CPJ 42.5", unit: "sac 50kg", unitPrice: 28, category: "ciment", subcategory: "portland" },
      { name: "Ciment CPJ 32.5", unit: "sac 50kg", unitPrice: 22, category: "ciment", subcategory: "modifie" },
      { name: "Sable fin 0/2", unit: "m³", unitPrice: 45, category: "sable", subcategory: "beton" },
      { name: "Sable moyen 0/5", unit: "m³", unitPrice: 40, category: "sable", subcategory: "maconnerie" },
      { name: "Gravier 5/15", unit: "m³", unitPrice: 55, category: "gravier", subcategory: "beton" },
      { name: "Gravier 15/25", unit: "m³", unitPrice: 50, category: "gravier", subcategory: "gros_betons" },
      { name: "Brique rouge pleine", unit: "pièce", unitPrice: 0.35, category: "briques", subcategory: "rouge" },
      { name: "Brique creuse 20cm", unit: "pièce", unitPrice: 0.55, category: "briques", subcategory: "creuse" },
      { name: "Blocs béton 20cm", unit: "pièce", unitPrice: 1.2, category: "blocs_beton", subcategory: "20cm" },
      { name: "Blocs béton 15cm", unit: "pièce", unitPrice: 0.95, category: "blocs_beton", subcategory: "15cm" },
      { name: "Treillis soudé ST25", unit: "panneau", unitPrice: 42, category: "acier", subcategory: "treillis" },
      { name: "Fer à béton Ø12", unit: "barre 12m", unitPrice: 28, category: "acier", subcategory: "barre" },
      { name: "Fer à béton Ø16", unit: "barre 12m", unitPrice: 48, category: "acier", subcategory: "barre" },
      { name: "Plaque de plâtre Knauf 12.5mm", unit: "m²", unitPrice: 18, category: "plafond", subcategory: "plaque" },
      { name: "Profilé métallique 48mm", unit: "barre 3m", unitPrice: 8, category: "plafond", subcategory: "profile" },
      { name: "Enduit intérieur gris", unit: "sac 25kg", unitPrice: 22, category: "enduit", subcategory: "interieur" },
      { name: "Peinture blanche mate", unit: "bidon 5L", unitPrice: 65, category: "peinture", subcategory: "mate" },
      { name: "Carrelage sol grès cérame", unit: "m²", unitPrice: 35, category: "carrelage", subcategory: "sol" },
      { name: "Faïence murale blanche", unit: "m²", unitPrice: 28, category: "carrelage", subcategory: "mur" },
      { name: "Porte intérieure standard", unit: "unité", unitPrice: 380, category: "portes", subcategory: "interieur" },
      { name: "Porte d'entrée blindée", unit: "unité", unitPrice: 1200, category: "portes", subcategory: "exterieur" },
      { name: "Fenêtre PVC double vitrage", unit: "m²", unitPrice: 220, category: "menuiserie", subcategory: "pvc" },
      { name: "WC suspendu complet", unit: "unité", unitPrice: 450, category: "sanitaires", subcategory: "wc" },
      { name: "Lavabo sur meuble", unit: "unité", unitPrice: 320, category: "sanitaires", subcategory: "lavabo" },
      { name: "Receveur de douche 80x120", unit: "unité", unitPrice: 280, category: "sanitaires", subcategory: "douche" },
      { name: "Robinetterie chromée", unit: "point d'eau", unitPrice: 85, category: "robinetterie", subcategory: "chrome" },
      { name: "Tuyau PER Ø26", unit: "barre 4m", unitPrice: 18, category: "plomberie", subcategory: "per" },
      { name: "Tuyau PVC Ø110", unit: "barre 4m", unitPrice: 22, category: "plomberie", subcategory: "pvc" },
      { name: "Câble électrique 2.5mm²", unit: "rouleau 100m", unitPrice: 120, category: "electricite", subcategory: "cable" },
      { name: "Disjoncteur divisionnaire 20A", unit: "unité", unitPrice: 12, category: "electricite", subcategory: "disjoncteur" },
      { name: "Tableau électrique 24 modules", unit: "unité", unitPrice: 180, category: "electricite", subcategory: "tableau" },
      { name: "Prise 2P+T 16A", unit: "unité", unitPrice: 8, category: "electricite", subcategory: "prise" },
      { name: "Interrupteur simple", unit: "unité", unitPrice: 7, category: "electricite", subcategory: "interrupteur" },
      { name: "Chauffe-eau 50L", unit: "unité", unitPrice: 380, category: "sanitaires", subcategory: "chauffe_eau" },
      { name: "Climatisation split 12000 BTU", unit: "unité", unitPrice: 1200, category: "climatisation", subcategory: "split" },
      { name: "Panneau solaire 350W", unit: "module", unitPrice: 650, category: "panneaux_solaires", subcategory: "photovoltaique" },
    ];

    const count = MATERIALS_SEED.length;
    for (const m of MATERIALS_SEED) {
      await ctx.db.insert("materialPrices", {
        ...m,
        currency: "TND",
        lastUpdated: Date.now(),
        priceQuality: "marche_tunisien_2026",
        availability: "disponible",
      });
    }

    return { message: `${count} matériaux insérés dans le catalogue.`, count };
  },
});

// ── Sync prices from external source (admin) ──────────────────────────────
export const syncMaterialPrices = mutation({
  args: {
    prices: v.array(
      v.object({
        name: v.string(),
        unit: v.string(),
        unitPrice: v.number(),
        category: materialCategoryValidator,
        subcategory: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { prices }) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "moderator")) {
      throw new Error("Cette action est réservée aux administrateurs.");
    }

    const existing = await ctx.db.query("materialPrices").collect();
    const existingByName = new Map(existing.map((e) => [e.name, e]));

    let updated = 0;
    let inserted = 0;

    for (const p of prices) {
      const existingItem = existingByName.get(p.name);
      if (existingItem) {
        if (existingItem.unitPrice !== p.unitPrice) {
          await ctx.db.patch(existingItem._id, {
            unitPrice: p.unitPrice,
            unit: p.unit,
            lastUpdated: Date.now(),
          });
          updated++;
        }
      } else {
        await ctx.db.insert("materialPrices", {
          ...p,
          currency: "TND",
          lastUpdated: Date.now(),
          priceQuality: "marche_tunisien_2026",
          availability: "disponible",
        });
        inserted++;
      }
    }

    return { updated, inserted, total: existing.length + inserted };
  },
});

// ── Get all material prices ───────────────────────────────────────────────
export const getMaterialPrices = query({
  args: {
    category: v.optional(materialCategoryValidator),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { category, search }) => {
    let query = ctx.db.query("materialPrices");

    if (category) {
      query = query.withIndex("by_category", (q) => q.eq("category", category));
    }

    const all = await query.collect();

    if (search) {
      const lower = search.toLowerCase();
      return all.filter(
        (m) =>
          m.name.toLowerCase().includes(lower) ||
          m.category.toLowerCase().includes(lower),
      );
    }

    return all;
  },
});

// ── Get material price history (for a specific material) ──────────────────
export const getMaterialPriceHistory = query({
  args: { materialPriceId: v.id("materialPrices") },
  handler: async (ctx, { materialPriceId }) => {
    const history = await ctx.db
      .query("materialPriceHistory")
      .withIndex("by_material", (q) => q.eq("materialPriceId", materialPriceId))
      .order("desc")
      .collect();
    return history;
  },
});

// ── Seed supplier offers ──────────────────────────────────────────────────
export const seedSupplierOffers = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "moderator")) {
      throw new Error("Cette action est réservée aux administrateurs.");
    }

    const existing = await ctx.db.query("materialOffers").collect();
    if (existing.length > 0) {
      return { message: "Offres fournisseurs déjà initialisées.", count: existing.length };
    }

    const materials = await ctx.db.query("materialPrices").collect();
    if (materials.length === 0) {
      throw new Error("Insérez d'abord les matériaux (seedMarketData).");
    }

    const suppliers = [
      { name: "Comptoir Hammami", type: "distributeur", governorate: "Tunis" },
      { name: "COBAM Group", type: "distributeur", governorate: "Sfax" },
      { name: "Batiprice Tunisie", type: "plateforme", governorate: "Tunis" },
      { name: "COMAF", type: "distributeur", governorate: "Sousse" },
      { name: "BMP (Building Market Place)", type: "plateforme", governorate: "Ariana" },
    ];

    let count = 0;
    for (const mat of materials) {
      // 2-3 offres par matériau
      const offerCount = 2 + Math.floor(Math.random() * 2);
      const chosen = [...suppliers].sort(() => Math.random() - 0.5).slice(0, offerCount);
      for (const s of chosen) {
        const variance = 0.9 + Math.random() * 0.2; // ±10%
        const price = Math.round(mat.unitPrice * variance * 100) / 100;
        await ctx.db.insert("materialOffers", {
          productId: mat._id,
          name: mat.name,
          supplier: s.name,
          sourceType: s.type,
          unit: mat.unit,
          minPrice: price * 0.95,
          maxPrice: price * 1.1,
          avgPrice: price,
          currency: "TND",
          governorate: s.governorate,
          reliabilityIndex: 0.7 + Math.random() * 0.25,
          availability: "disponible",
          lastUpdated: Date.now(),
        });
        count++;
      }
    }

    return { message: `${count} offres fournisseurs créées.`, count };
  },
});

// ── Get supplier offers for a material ────────────────────────────────────
export const getSupplierOffers = query({
  args: { materialPriceId: v.id("materialPrices") },
  handler: async (ctx, { materialPriceId }) => {
    return await ctx.db
      .query("materialOffers")
      .withIndex("by_product", (q) => q.eq("productId", materialPriceId))
      .collect();
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Meilleur fournisseur (prix minimum) par désignation du quantitatif
// ═══════════════════════════════════════════════════════════════════════════

const normOffer = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const offerTokens = (s: string) =>
  normOffer(s)
    .split(" ")
    .filter((t) => t.length >= 3);

export const getCheapestSuppliers = query({
  args: { names: v.array(v.string()) },
  handler: async (ctx, { names }) => {
    if (names.length === 0) return [];
    const offers = await ctx.db.query("materialOffers").collect();
    if (offers.length === 0) return [];

    const byKey = new Map<string, any[]>();
    for (const o of offers) {
      const key = normOffer(o.name);
      if (!key) continue;
      const list = byKey.get(key) || [];
      list.push(o);
      byKey.set(key, list);
    }

    const bestOf = (list: any[]) =>
      list.reduce((best, o) =>
        o.minPrice < best.minPrice || (o.minPrice === best.minPrice && (o.reliabilityIndex || 0) > (best.reliabilityIndex || 0))
          ? o
          : best,
      );

    const results: (any | null)[] = [];
    for (const name of names) {
      const key = normOffer(name);
      const exact = byKey.get(key);
      let best = exact ? bestOf(exact) : undefined;

      // Repli 1 : sous-chaîne
      if (!best && key.length >= 10) {
        for (const [ok, list] of byKey) {
          if (ok.length >= 8 && (key.includes(ok) || ok.includes(key))) {
            best = bestOf(list);
            break;
          }
        }
      }

      // Repli 2 : recouvrement de mots-clés (≥ 2 termes communs)
      if (!best) {
        const itemTokens = offerTokens(name);
        if (itemTokens.length >= 2) {
          let bestScore = 0;
          for (const [ok, list] of byKey) {
            const score = itemTokens.filter((t) => ok.includes(t)).length;
            if (score >= 2 && score > bestScore) {
              bestScore = score;
              best = bestOf(list);
            }
          }
        }
      }

      results.push(
        best
          ? {
              name,
              supplier: best.supplier,
              sourceType: best.sourceType,
              minPrice: best.minPrice,
              avgPrice: best.avgPrice,
              unit: best.unit,
              governorate: best.governorate,
              reliabilityIndex: best.reliabilityIndex,
              availability: best.availability,
            }
          : null,
      );
    }
    return results.filter(Boolean);
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Prix catalogue pour les items BIM (source de vérité = même page Matériaux AI)
// ═══════════════════════════════════════════════════════════════════════════

export const getCatalogPricesForNames = query({
  args: { names: v.array(v.string()) },
  handler: async (ctx, { names }) => {
    if (names.length === 0) return [];

    const prices = await ctx.db.query("materialPrices").collect();
    if (prices.length === 0) return [];

    // Index par nom normalisé → { unitPrice, unit, name }
    const byKey = new Map<string, { unitPrice: number; unit: string; name: string }>();
    for (const p of prices) {
      const key = normOffer(p.name);
      if (!key || p.unitPrice <= 0) continue;
      if (!byKey.has(key)) {
        byKey.set(key, { unitPrice: p.unitPrice, unit: p.unit, name: p.name });
      }
    }

    const results: { name: string; unitPrice: number; unit: string }[] = [];
    for (const rawName of names) {
      const key = normOffer(rawName);
      const exact = key ? byKey.get(key) : undefined;
      let match = exact;

      // Repli 1 : sous-chaîne
      if (!match && key && key.length >= 10) {
        for (const [pk, pval] of byKey) {
          if (pk.length >= 8 && (key.includes(pk) || pk.includes(key))) {
            match = pval;
            break;
          }
        }
      }

      // Repli 2 : recouvrement de mots-clés (≥ 2 termes communs)
      if (!match && key) {
        const itemTokens = offerTokens(rawName);
        if (itemTokens.length >= 2) {
          let bestScore = 0;
          for (const [pk, pval] of byKey) {
            const score = itemTokens.filter((t) => pk.includes(t)).length;
            if (score >= 2 && score > bestScore) {
              bestScore = score;
              match = pval;
            }
          }
        }
      }

      if (match) {
        results.push({ name: rawName, unitPrice: match.unitPrice, unit: match.unit });
      }
    }
    return results;
  },
});
