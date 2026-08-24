import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { materialCategoryValidator } from "./schema";

// ═══════════════════════════════════════════════════════════════════════════
// Intelligence Marché — BIM engine market data layer (Tunisia)
// Sources registry, product catalog, seed/sync, AI analytics.
// ═══════════════════════════════════════════════════════════════════════════

export const MARKET_SOURCES = [
  { name: "Carthage Cement", type: "fabricant" as const, website: "carthagecement.com.tn", reliabilityScore: 0.95 },
  { name: "Les Ciments de Bizerte", type: "fabricant" as const, website: "cimentsdebizerte.com.tn", reliabilityScore: 0.95 },
  { name: "El Fouledh", type: "fabricant" as const, website: "elfouledh.com.tn", reliabilityScore: 0.93 },
  { name: "SOTEMAIL", type: "fabricant" as const, website: "sotemail.com.tn", reliabilityScore: 0.9 },
  { name: "SOPAL", type: "fabricant" as const, website: "sopal.com.tn", reliabilityScore: 0.9 },
  { name: "Knauf Tunisie", type: "fabricant" as const, website: "knauf.tn", reliabilityScore: 0.92 },
  { name: "CGC Tunisie", type: "distributeur" as const, website: "cgc.com.tn", reliabilityScore: 0.85 },
  { name: "CONAP Tunisie", type: "distributeur" as const, website: "conap.com.tn", reliabilityScore: 0.85 },
  { name: "COFEQ", type: "distributeur" as const, website: "cofeq.com.tn", reliabilityScore: 0.84 },
  { name: "COMAF", type: "distributeur" as const, website: "comaf.com.tn", reliabilityScore: 0.86 },
  { name: "Comptoir Hammami", type: "distributeur" as const, website: "comptoirhammami.com", reliabilityScore: 0.88 },
  { name: "COBAM Group", type: "distributeur" as const, website: "cobam.tn", reliabilityScore: 0.85 },
  { name: "Comptoir Pro", type: "distributeur" as const, website: "comptoirpro.com.tn", reliabilityScore: 0.83 },
  { name: "eBonus Market", type: "distributeur" as const, website: "ebonusmarket.com", reliabilityScore: 0.82 },
  { name: "Batiprice Tunisie", type: "plateforme" as const, website: "batiprice.com", reliabilityScore: 0.9 },
  { name: "BMP (Building Market Place)", type: "plateforme" as const, website: "bmp.tn", reliabilityScore: 0.88 },
  { name: "Medina Construction", type: "plateforme" as const, website: "medinaconstruction.com", reliabilityScore: 0.86 },
  { name: "Go Africa Tunisie", type: "plateforme" as const, website: "goafricaonline.com", reliabilityScore: 0.8 },
];

// ── Seed market data (admin only) ─────────────────────────────────────────
export const seedMarketData = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "moderator")) {
      throw new Error("Cette action est réservée aux administrateurs.");
    }

    // Seed marketSources
    const existingSources = await ctx.db.query("marketSources").collect();
    let sourcesCount = 0;
    if (existingSources.length === 0) {
      for (const s of MARKET_SOURCES) {
        await ctx.db.insert("marketSources", {
          name: s.name,
          type: s.type,
          website: s.website,
          reliabilityScore: s.reliabilityScore,
          active: true,
          createdAt: Date.now(),
        });
        sourcesCount++;
      }
    }

    // Seed materialPrices
    const existing = await ctx.db.query("materialPrices").collect();
    const existingNames = new Set(existing.map((e) => e.name));

    const MATERIALS_SEED = [
      { name: "Ciment CPJ 42.5", unit: "sac 50kg", unitPrice: 28, category: "liants_ciments_mortiers" as const, subcategory: "portland" },
      { name: "Ciment CPJ 32.5", unit: "sac 50kg", unitPrice: 22, category: "liants_ciments_mortiers" as const, subcategory: "modifie" },
      { name: "Sable fin 0/2", unit: "m³", unitPrice: 45, category: "terrassement_granulats" as const, subcategory: "beton" },
      { name: "Sable moyen 0/5", unit: "m³", unitPrice: 40, category: "terrassement_granulats" as const, subcategory: "maconnerie" },
      { name: "Gravier 5/15", unit: "m³", unitPrice: 55, category: "terrassement_granulats" as const, subcategory: "beton" },
      { name: "Gravier 15/25", unit: "m³", unitPrice: 50, category: "terrassement_granulats" as const, subcategory: "gros_betons" },
      { name: "Brique rouge pleine", unit: "pièce", unitPrice: 0.35, category: "maconnerie_plancher" as const, subcategory: "rouge" },
      { name: "Brique creuse 20cm", unit: "pièce", unitPrice: 0.55, category: "maconnerie_plancher" as const, subcategory: "creuse" },
      { name: "Blocs béton 20cm", unit: "pièce", unitPrice: 1.2, category: "maconnerie_plancher" as const, subcategory: "20cm" },
      { name: "Blocs béton 15cm", unit: "pièce", unitPrice: 0.95, category: "maconnerie_plancher" as const, subcategory: "15cm" },
      { name: "Treillis soudé ST25", unit: "panneau", unitPrice: 42, category: "structure_metal" as const, subcategory: "treillis" },
      { name: "Fer à béton Ø12", unit: "barre 12m", unitPrice: 28, category: "structure_metal" as const, subcategory: "barre" },
      { name: "Fer à béton Ø16", unit: "barre 12m", unitPrice: 48, category: "structure_metal" as const, subcategory: "barre" },
      { name: "Plaque de plâtre Knauf 12.5mm", unit: "m²", unitPrice: 18, category: "isolation_finitions" as const, subcategory: "plaque" },
      { name: "Profilé métallique 48mm", unit: "barre 3m", unitPrice: 8, category: "isolation_finitions" as const, subcategory: "profile" },
      { name: "Enduit intérieur gris", unit: "sac 25kg", unitPrice: 22, category: "isolation_finitions" as const, subcategory: "interieur" },
      { name: "Peinture blanche mate", unit: "bidon 5L", unitPrice: 65, category: "isolation_finitions" as const, subcategory: "mate" },
      { name: "Carrelage sol grès cérame", unit: "m²", unitPrice: 35, category: "carrelage_faiencerie" as const, subcategory: "sol" },
      { name: "Faïence murale blanche", unit: "m²", unitPrice: 28, category: "carrelage_faiencerie" as const, subcategory: "mur" },
      { name: "Porte intérieure standard", unit: "unité", unitPrice: 380, category: "menuiseries_peinture" as const, subcategory: "interieur" },
      { name: "Porte d'entrée blindée", unit: "unité", unitPrice: 1200, category: "menuiseries_peinture" as const, subcategory: "exterieur" },
      { name: "Fenêtre PVC double vitrage", unit: "m²", unitPrice: 220, category: "menuiseries_peinture" as const, subcategory: "pvc" },
      { name: "WC suspendu complet", unit: "unité", unitPrice: 450, category: "sanitaires_chauffage" as const, subcategory: "wc" },
      { name: "Lavabo sur meuble", unit: "unité", unitPrice: 320, category: "sanitaires_chauffage" as const, subcategory: "lavabo" },
      { name: "Receveur de douche 80x120", unit: "unité", unitPrice: 280, category: "sanitaires_chauffage" as const, subcategory: "douche" },
      { name: "Robinetterie chromée", unit: "point d'eau", unitPrice: 85, category: "sanitaires_chauffage" as const, subcategory: "chrome" },
      { name: "Tuyau PER Ø26", unit: "barre 4m", unitPrice: 18, category: "sanitaires_chauffage" as const, subcategory: "per" },
      { name: "Tuyau PVC Ø110", unit: "barre 4m", unitPrice: 22, category: "sanitaires_chauffage" as const, subcategory: "pvc" },
      { name: "Câble électrique 2.5mm²", unit: "rouleau 100m", unitPrice: 120, category: "electricite_domotique" as const, subcategory: "cable" },
      { name: "Disjoncteur divisionnaire 20A", unit: "unité", unitPrice: 12, category: "electricite_domotique" as const, subcategory: "disjoncteur" },
      { name: "Tableau électrique 24 modules", unit: "unité", unitPrice: 180, category: "electricite_domotique" as const, subcategory: "tableau" },
      { name: "Prise 2P+T 16A", unit: "unité", unitPrice: 8, category: "electricite_domotique" as const, subcategory: "prise" },
      { name: "Interrupteur simple", unit: "unité", unitPrice: 7, category: "electricite_domotique" as const, subcategory: "interrupteur" },
      { name: "Chauffe-eau 50L", unit: "unité", unitPrice: 380, category: "sanitaires_chauffage" as const, subcategory: "chauffe_eau" },
      { name: "Climatisation split 12000 BTU", unit: "unité", unitPrice: 1200, category: "sanitaires_chauffage" as const, subcategory: "split" },
      { name: "Panneau solaire 350W", unit: "module", unitPrice: 650, category: "electricite_domotique" as const, subcategory: "photovoltaique" },
    ];

    let catalogCount = 0;
    let seededProducts = 0;
    for (const m of MATERIALS_SEED) {
      if (existingNames.has(m.name)) continue;
      await ctx.db.insert("materialPrices", {
        ...m,
        currency: "TND",
        lastUpdated: Date.now(),
        updatedBy: user._id,
        priceQuality: "estimation_indicative",
        availability: "disponible",
        minPrice: m.unitPrice * 0.9,
        avgPrice: m.unitPrice,
        maxPrice: m.unitPrice * 1.1,
        reliabilityIndex: 0.85,
      });
      seededProducts++;
      catalogCount++;
    }

    return {
      sources: sourcesCount || existingSources.length,
      catalog: catalogCount || existing.length,
      seededProducts,
    };
  },
});

// ── Sync market data (admin) ──────────────────────────────────────────────
export const syncMarketData = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "moderator")) {
      throw new Error("Cette action est réservée aux administrateurs.");
    }

    const sources = await ctx.db.query("marketSources").collect();
    const products = await ctx.db.query("materialPrices").collect();
    const existingOffers = await ctx.db.query("materialOffers").collect();

    let updatedOffers = 0;
    let historyRows = 0;
    let stockAlerts = 0;

    for (const product of products) {
      const productOffers = existingOffers.filter((o) => o.productId === product._id);
      if (productOffers.length === 0) continue;

      const minP = Math.min(...productOffers.map((o) => o.minPrice));
      const avgP = productOffers.reduce((s, o) => s + o.avgPrice, 0) / productOffers.length;
      const maxP = Math.max(...productOffers.map((o) => o.maxPrice));
      const avgRel = productOffers.reduce((s, o) => s + o.reliabilityIndex, 0) / productOffers.length;

      await ctx.db.patch(product._id, {
        minPrice: minP,
        avgPrice: avgP,
        maxPrice: maxP,
        reliabilityIndex: avgRel,
        lastUpdated: Date.now(),
        updatedBy: user._id,
      });

      for (const o of productOffers) {
        await ctx.db.insert("offerPriceHistory", {
          offerId: o._id,
          previousMin: o.minPrice,
          previousAvg: o.avgPrice,
          previousMax: o.maxPrice,
          newMin: minP,
          newAvg: avgP,
          newMax: maxP,
          changedAt: Date.now(),
        });
        historyRows++;
        if (o.availability === "rupture" || o.availability === "sur_commande") {
          stockAlerts++;
        }
      }
    }

    for (const s of sources) {
      await ctx.db.patch(s._id, { lastSyncAt: Date.now() });
    }

    return { updatedOffers, historyRows, stockAlerts };
  },
});

// ── Get all material prices ───────────────────────────────────────────────
export const getMaterialPrices = query({
  args: {
    category: v.optional(materialCategoryValidator),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { category, search }) => {
    let all;
    if (category) {
      all = await ctx.db.query("materialPrices").withIndex("by_category", (qi) => qi.eq("category", category)).collect();
    } else {
      all = await ctx.db.query("materialPrices").collect();
    }
    if (search) {
      const lower = search.toLowerCase();
      return all.filter((m) => m.name.toLowerCase().includes(lower) || m.category.toLowerCase().includes(lower));
    }
    return all;
  },
});

// ── Get material price history ────────────────────────────────────────────
export const getMaterialPriceHistory = query({
  args: { materialPriceId: v.id("materialPrices") },
  handler: async (ctx, { materialPriceId }) => {
    const offers = await ctx.db.query("materialOffers").withIndex("by_product", (q) => q.eq("productId", materialPriceId)).collect();
    const offerIds = new Set(offers.map((o) => o._id));
    const history = await ctx.db.query("offerPriceHistory").collect();
    return history.filter((h) => offerIds.has(h.offerId));
  },
});

// ── Get supplier offers for a material ────────────────────────────────────
export const getSupplierOffers = query({
  args: { materialPriceId: v.id("materialPrices") },
  handler: async (ctx, { materialPriceId }) => {
    return await ctx.db.query("materialOffers").withIndex("by_product", (q) => q.eq("productId", materialPriceId)).collect();
  },
});

// ── Market overview ───────────────────────────────────────────────────────
export const getMarketOverview = query({
  args: {},
  handler: async (ctx) => {
    const sources = await ctx.db.query("marketSources").collect();
    const products = await ctx.db.query("materialPrices").collect();
    const offers = await ctx.db.query("materialOffers").collect();

    const sourcesByType: Record<string, number> = {};
    for (const s of sources) {
      sourcesByType[s.type] = (sourcesByType[s.type] || 0) + 1;
    }

    const categories = [...new Set(products.map((p) => p.category))];
    const lastSyncAt = sources.reduce((max, s) => Math.max(max, s.lastSyncAt || 0), 0);

    return {
      totalOffers: offers.length,
      totalProducts: products.length,
      totalSources: sources.length,
      sourcesByType,
      categories,
      lastSyncAt,
      avgChange: 0,
    };
  },
});

// ── Best offers (sorted by price) ─────────────────────────────────────────
export const getBestOffers = query({
  args: {
    category: v.optional(materialCategoryValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { category, limit }) => {
    const offers = await ctx.db.query("materialOffers").collect();
    let filtered = offers;
    if (category) {
      const products = await ctx.db.query("materialPrices").withIndex("by_category", (q) => q.eq("category", category)).collect();
      const productIds = new Set(products.map((p) => p._id));
      filtered = offers.filter((o) => productIds.has(o.productId));
    }
    filtered.sort((a, b) => a.minPrice - b.minPrice);
    const max = limit ?? 50;
    return filtered.slice(0, max).map((o) => ({
      name: o.name,
      supplier: o.supplier,
      price: o.minPrice,
      avgPrice: o.avgPrice,
      category: o.category,
      unit: o.unit,
      governorate: o.governorate,
      reliabilityIndex: o.reliabilityIndex,
      availability: o.availability,
    }));
  },
});

// ── Governorate prices ────────────────────────────────────────────────────
export const getGovernoratePrices = query({
  args: {},
  handler: async (ctx) => {
    const offers = await ctx.db.query("materialOffers").collect();
    const byGov: Record<string, number[]> = {};
    for (const o of offers) {
      const gov = o.governorate || "Inconnu";
      if (!byGov[gov]) byGov[gov] = [];
      byGov[gov].push(o.avgPrice);
    }
    const rows = Object.entries(byGov).map(([gov, prices]) => ({
      governorate: gov,
      average: prices.reduce((a, b) => a + b, 0) / prices.length,
      min: Math.min(...prices),
      max: Math.max(...prices),
      count: prices.length,
    }));
    rows.sort((a, b) => a.average - b.average);
    const allPrices = offers.map((o) => o.avgPrice);
    const nationalAverage = allPrices.length > 0 ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0;
    return {
      rows,
      nationalAverage,
      cheapest: rows.length > 0 ? rows[0] : null,
      mostExpensive: rows.length > 0 ? rows[rows.length - 1] : null,
    };
  },
});

// ── Price trends ──────────────────────────────────────────────────────────
export const getPriceTrends = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("materialPrices").collect();
    const offers = await ctx.db.query("materialOffers").collect();
    const history = await ctx.db.query("offerPriceHistory").collect();
    const productCategoryMap = new Map(products.map((p) => [p._id, p.category]));
    const offerProductMap = new Map(offers.map((o) => [o._id, o.productId]));
    const catChanges: Record<string, number[]> = {};
    for (const h of history) {
      const productId = offerProductMap.get(h.offerId);
      if (!productId) continue;
      const cat = productCategoryMap.get(productId);
      if (!cat) continue;
      if (!catChanges[cat]) catChanges[cat] = [];
      const pct = h.previousAvg > 0 ? ((h.newAvg - h.previousAvg) / h.previousAvg) * 100 : 0;
      catChanges[cat].push(pct);
    }
    return Object.entries(catChanges).map(([category, changes]) => ({
      category,
      changes: changes.length,
      netPct: changes.reduce((a, b) => a + b, 0) / changes.length,
    }));
  },
});

// ── Supplier comparison ───────────────────────────────────────────────────
export const getSupplierComparison = query({
  args: { productId: v.id("materialPrices") },
  handler: async (ctx, { productId }) => {
    const offers = await ctx.db.query("materialOffers").withIndex("by_product", (q) => q.eq("productId", productId)).collect();
    offers.sort((a, b) => a.minPrice - b.minPrice);
    return offers.map((o) => ({
      supplier: o.supplier,
      sourceType: o.sourceType,
      minPrice: o.minPrice,
      avgPrice: o.avgPrice,
      maxPrice: o.maxPrice,
      unit: o.unit,
      governorate: o.governorate,
      reliabilityIndex: o.reliabilityIndex,
      availability: o.availability,
    }));
  },
});

// ── Stock alerts ──────────────────────────────────────────────────────────
export const getStockAlerts = query({
  args: {},
  handler: async (ctx) => {
    const offers = await ctx.db.query("materialOffers").collect();
    return offers
      .filter((o) => o.availability === "rupture" || o.availability === "sur_commande")
      .map((o) => ({
        name: o.name,
        supplier: o.supplier,
        availability: o.availability,
        category: o.category,
        unit: o.unit,
        lastUpdated: o.updatedAt,
      }));
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Meilleur fournisseur (prix minimum) par désignation du quantitatif
// ═══════════════════════════════════════════════════════════════════════════

const normOffer = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const offerTokens = (s: string) => normOffer(s).split(" ").filter((t) => t.length >= 3);

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
        o.minPrice < best.minPrice || (o.minPrice === best.minPrice && (o.reliabilityIndex || 0) > (best.reliabilityIndex || 0)) ? o : best,
      );

    const results: (any | null)[] = [];
    for (const name of names) {
      const key = normOffer(name);
      const exact = byKey.get(key);
      let best = exact ? bestOf(exact) : undefined;

      if (!best && key.length >= 10) {
        for (const [ok, list] of byKey) {
          if (ok.length >= 8 && (key.includes(ok) || ok.includes(key))) {
            best = bestOf(list);
            break;
          }
        }
      }

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
          ? { name, supplier: best.supplier, sourceType: best.sourceType, minPrice: best.minPrice, avgPrice: best.avgPrice, unit: best.unit, governorate: best.governorate, reliabilityIndex: best.reliabilityIndex, availability: best.availability }
          : null,
      );
    }
    return results.filter(Boolean);
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Prix catalogue pour les items BIM
// ═══════════════════════════════════════════════════════════════════════════

export const getCatalogPricesForNames = query({
  args: { names: v.array(v.string()) },
  handler: async (ctx, { names }) => {
    if (names.length === 0) return [];
    const prices = await ctx.db.query("materialPrices").collect();
    if (prices.length === 0) return [];

    const byKey = new Map<string, { unitPrice: number; unit: string; name: string }>();
    for (const p of prices) {
      const key = normOffer(p.name);
      if (!key || p.unitPrice <= 0) continue;
      if (!byKey.has(key)) byKey.set(key, { unitPrice: p.unitPrice, unit: p.unit, name: p.name });
    }

    const results: { name: string; unitPrice: number; unit: string }[] = [];
    for (const rawName of names) {
      const key = normOffer(rawName);
      let match = key ? byKey.get(key) : undefined;

      if (!match && key && key.length >= 10) {
        for (const [pk, pval] of byKey) {
          if (pk.length >= 8 && (key.includes(pk) || pk.includes(key))) { match = pval; break; }
        }
      }

      if (!match && key) {
        const itemTokens = offerTokens(rawName);
        if (itemTokens.length >= 2) {
          let bestScore = 0;
          for (const [pk, pval] of byKey) {
            const score = itemTokens.filter((t) => pk.includes(t)).length;
            if (score >= 2 && score > bestScore) { bestScore = score; match = pval; }
          }
        }
      }

      if (match) results.push({ name: rawName, unitPrice: match.unitPrice, unit: match.unit });
    }
    return results;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Internal: weekly market sync (cron job)
// ═══════════════════════════════════════════════════════════════════════════

export const runMarketSyncInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sources = await ctx.db.query("marketSources").collect();
    const products = await ctx.db.query("materialPrices").collect();
    const existingOffers = await ctx.db.query("materialOffers").collect();

    let updatedOffers = 0;
    let historyRows = 0;

    for (const product of products) {
      const productOffers = existingOffers.filter((o) => o.productId === product._id);
      if (productOffers.length === 0) continue;

      const minP = Math.min(...productOffers.map((o) => o.minPrice));
      const avgP = productOffers.reduce((s, o) => s + o.avgPrice, 0) / productOffers.length;
      const maxP = Math.max(...productOffers.map((o) => o.maxPrice));
      const avgRel = productOffers.reduce((s, o) => s + o.reliabilityIndex, 0) / productOffers.length;
      const prevAvg = product.avgPrice || 0;

      if (prevAvg !== avgP || (product.minPrice || 0) !== minP || (product.maxPrice || 0) !== maxP) {
        await ctx.db.patch(product._id, { minPrice: minP, avgPrice: avgP, maxPrice: maxP, reliabilityIndex: avgRel, lastUpdated: Date.now() });
        for (const o of productOffers) {
          await ctx.db.insert("offerPriceHistory", {
            offerId: o._id,
            previousMin: o.minPrice,
            previousAvg: o.avgPrice,
            previousMax: o.maxPrice,
            newMin: minP,
            newAvg: avgP,
            newMax: maxP,
            changedAt: Date.now(),
          });
          historyRows++;
        }
        updatedOffers++;
      }
    }

    for (const s of sources) {
      await ctx.db.patch(s._id, { lastSyncAt: Date.now() });
    }

    return { updatedOffers, historyRows };
  },
});
