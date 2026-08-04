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
  { name: "Tunisie Industrie", type: "plateforme", website: "tunisieindustrie.nat.tn", reliabilityScore: 0.85 },
  { name: "Tunisie Index", type: "plateforme", website: "tunisieindex.com", reliabilityScore: 0.82 },
] as const;

export const GOVERNORATES = [
  "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan", "Bizerte",
  "Béja", "Jendouba", "Le Kef", "Siliana", "Sousse", "Monastir", "Mahdia",
  "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid", "Gabès", "Médenine",
  "Tataouine", "Gafsa", "Tozeur", "Kébili",
] as const;

// ── Seed product catalog (curated reference prices, market TN) ──
// name, category (must match MATERIAL_CATEGORIES), subcategory, unit, basePrice (TND)
type CatalogItem = {
  name: string;
  category: string;
  subcategory: string;
  unit: string;
  basePrice: number;
  brand?: string;
  manufacturer?: string;
};

export const MARKET_CATALOG: CatalogItem[] = [
  // Ciment
  { name: "Ciment CPJ 42.5 (sac 50kg)", category: "ciment", subcategory: "Ciment en sac", unit: "sac", basePrice: 16.5, brand: "Carthage Cement", manufacturer: "Carthage Cement" },
  { name: "Ciment CPJ 42.5 (vrac)", category: "ciment", subcategory: "Ciment en vrac", unit: "tonne", basePrice: 320, brand: "Ciments de Bizerte", manufacturer: "Les Ciments de Bizerte" },
  { name: "Ciment blanc (sac 40kg)", category: "ciment", subcategory: "Ciment blanc", unit: "sac", basePrice: 38, brand: "Ciments de Bizerte", manufacturer: "Les Ciments de Bizerte" },
  // Fer à béton
  { name: "Fer à béton HA 8mm", category: "fer_a_beton", subcategory: "Barres HA", unit: "barre", basePrice: 13.5, brand: "El Fouledh", manufacturer: "El Fouledh" },
  { name: "Fer à béton HA 10mm", category: "fer_a_beton", subcategory: "Barres HA", unit: "barre", basePrice: 20.5, brand: "El Fouledh", manufacturer: "El Fouledh" },
  { name: "Fer à béton HA 12mm", category: "fer_a_beton", subcategory: "Barres HA", unit: "barre", basePrice: 29.5, brand: "El Fouledh", manufacturer: "El Fouledh" },
  { name: "Treillis soudé ST 25", category: "fer_a_beton", subcategory: "Treillis soudé", unit: "panneau", basePrice: 45, brand: "El Fouledh", manufacturer: "El Fouledh" },
  // Briques & blocs
  { name: "Brique creuse 10 cm", category: "briques", subcategory: "Briques creuses", unit: "pièce", basePrice: 0.48, brand: "COMAF", manufacturer: "COMAF" },
  { name: "Brique creuse 15 cm", category: "briques", subcategory: "Briques creuses", unit: "pièce", basePrice: 0.65, brand: "COMAF", manufacturer: "COMAF" },
  { name: "Bloc béton 20x20x40", category: "blocs", subcategory: "Blocs en béton", unit: "pièce", basePrice: 1.15, brand: "COBAM Group", manufacturer: "COBAM Group" },
  { name: "Bloc hourdis 16x20x50", category: "blocs", subcategory: "Hourdis", unit: "pièce", basePrice: 1.9, brand: "COBAM Group", manufacturer: "COBAM Group" },
  // Granulats
  { name: "Sable de construction (m³)", category: "sable", subcategory: "Sable", unit: "m³", basePrice: 55, brand: "COBAM Group", manufacturer: "COBAM Group" },
  { name: "Gravier concassé (m³)", category: "gravier", subcategory: "Gravier", unit: "m³", basePrice: 62, brand: "COBAM Group", manufacturer: "COBAM Group" },
  // Bois & coffrage
  { name: "Chevron sapin 63x75x400", category: "bois", subcategory: "Bois de coffrage", unit: "pièce", basePrice: 14, brand: "Comptoir Pro", manufacturer: "Comptoir Pro" },
  { name: "Panneau coffrage 18mm", category: "coffrage", subcategory: "Panneaux", unit: "pièce", basePrice: 42, brand: "Comptoir Pro", manufacturer: "Comptoir Pro" },
  // Isolation & étanchéité
  { name: "Laine de verre (rouleau 30m²)", category: "isolation", subcategory: "Isolation thermique", unit: "rouleau", basePrice: 89, brand: "Knauf Tunisie", manufacturer: "Knauf Tunisie" },
  { name: "Membrane bitumineuse (rouleau 10m)", category: "etancheite", subcategory: "Étanchéité toiture", unit: "rouleau", basePrice: 58, brand: "SOTEMAIL", manufacturer: "SOTEMAIL" },
  // Carrelage & revêtements
  { name: "Carrelage grès cérame 60x60", category: "carrelage", subcategory: "Grès cérame", unit: "m²", basePrice: 26, brand: "SOPAL", manufacturer: "SOPAL" },
  { name: "Faïence murale 25x40", category: "faience", subcategory: "Faïence", unit: "m²", basePrice: 19, brand: "SOPAL", manufacturer: "SOPAL" },
  { name: "Marbre importé (m²)", category: "marbre", subcategory: "Marbre", unit: "m²", basePrice: 120, brand: "Comptoir Hammami", manufacturer: "Comptoir Hammami" },
  { name: "Pierre naturelle (m²)", category: "pierre_naturelle", subcategory: "Pierre", unit: "m²", basePrice: 85, brand: "Comptoir Hammami", manufacturer: "Comptoir Hammami" },
  // Peinture
  { name: "Peinture acrylique blanche (pot 15L)", category: "peinture", subcategory: "Peinture intérieure", unit: "pot", basePrice: 68, brand: "Comptoir Pro", manufacturer: "Comptoir Pro" },
  // Plomberie & sanitaire
  { name: "Tube PVC évacuation Ø100 (3m)", category: "plomberie", subcategory: "Tubes PVC", unit: "pièce", basePrice: 12.5, brand: "CONAP", manufacturer: "CONAP" },
  { name: "Robinetterie mitigeur salle de bain", category: "plomberie", subcategory: "Robinetterie", unit: "pièce", basePrice: 65, brand: "Comptoir Hammami", manufacturer: "Comptoir Hammami" },
  { name: "WC à l'anglaise complet", category: "sanitaire", subcategory: "Sanitaire", unit: "pièce", basePrice: 240, brand: "Comptoir Hammami", manufacturer: "Comptoir Hammami" },
  { name: "Lavabo céramique", category: "sanitaire", subcategory: "Sanitaire", unit: "pièce", basePrice: 95, brand: "Comptoir Hammami", manufacturer: "Comptoir Hammami" },
  // Électricité & éclairage
  { name: "Câble électrique 3x2.5mm² (100m)", category: "electricite", subcategory: "Câblage", unit: "rouleau", basePrice: 89, brand: "Comptoir Pro", manufacturer: "Comptoir Pro" },
  { name: "Disjoncteur modulaire 16A", category: "electricite", subcategory: "Protection", unit: "pièce", basePrice: 12, brand: "Comptoir Pro", manufacturer: "Comptoir Pro" },
  { name: "Spot LED encastrable 9W", category: "eclairage", subcategory: "Éclairage LED", unit: "pièce", basePrice: 8.5, brand: "eBonus Market", manufacturer: "eBonus Market" },
  // Menuiserie
  { name: "Porte intérieure en bois (H.204)", category: "portes", subcategory: "Portes intérieures", unit: "pièce", basePrice: 220, brand: "CGC Tunisie", manufacturer: "CGC Tunisie" },
  { name: "Fenêtre aluminium 90x120", category: "menuiserie_aluminium", subcategory: "Fenêtres alu", unit: "pièce", basePrice: 310, brand: "CGC Tunisie", manufacturer: "CGC Tunisie" },
  { name: "Fenêtre PVC double vitrage 90x120", category: "menuiserie_pvc", subcategory: "Fenêtres PVC", unit: "pièce", basePrice: 380, brand: "CGC Tunisie", manufacturer: "CGC Tunisie" },
  // Climatisation / chauffage
  { name: "Climatiseur split 12000 BTU", category: "climatisation", subcategory: "Climatisation", unit: "pièce", basePrice: 1350, brand: "Comptoir Hammami", manufacturer: "Comptoir Hammami" },
  { name: "Chauffe-eau électrique 100L", category: "chauffage", subcategory: "Chauffage ECS", unit: "pièce", basePrice: 480, brand: "Comptoir Hammami", manufacturer: "Comptoir Hammami" },
  // Quincaillerie / outillage
  { name: "Peinture à l'huile (pot 5L)", category: "quincaillerie", subcategory: "Quincaillerie", unit: "pot", basePrice: 55, brand: "Comptoir Pro", manufacturer: "Comptoir Pro" },
  { name: "Bétonnière 350L", category: "outillage", subcategory: "Outillage", unit: "pièce", basePrice: 1900, brand: "Comptoir Pro", manufacturer: "Comptoir Pro" },
  // Aménagement extérieur / piscine / jardin
  { name: "Clôture béton préfabriquée (m)", category: "amenagement_exterieur", subcategory: "Clôtures", unit: "mètre", basePrice: 95, brand: "COBAM Group", manufacturer: "COBAM Group" },
  { name: "Pavé autobloquant (m²)", category: "amenagement_exterieur", subcategory: "Pavés", unit: "m²", basePrice: 32, brand: "SOPAL", manufacturer: "SOPAL" },
  { name: "Revêtement piscine mosaïque (m²)", category: "piscines", subcategory: "Revêtement", unit: "m²", basePrice: 55, brand: "SOPAL", manufacturer: "SOPAL" },
  { name: "Gazon synthétique (m²)", category: "jardins", subcategory: "Gazon", unit: "m²", basePrice: 18, brand: "eBonus Market", manufacturer: "eBonus Market" },
];

// ── Helpers ──
export const isMarketAdmin = async (ctx: any) => {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Non authentifié");
  if (user.role !== "admin" && user.role !== "moderator") throw new Error("Accès réservé à l'administration");
  return user;
};

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const jitter = (base: number, pct: number) =>
  Math.round(base * (1 + (Math.random() * 2 - 1) * pct) * 100) / 100;

// ═══════════════════════════════════════════════════════════════════════════
// SEED — idempotent. Inserts missing sources, catalog products and offers.
// ═══════════════════════════════════════════════════════════════════════════
export const seedMarketData = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await isMarketAdmin(ctx);
    const now = Date.now();

    // 1. Sources
    const existingSources = await ctx.db.query("marketSources").collect();
    const known = new Set(existingSources.map((s) => s.name));
    const sources: { id: string; name: string; type: "fabricant" | "distributeur" | "plateforme"; reliabilityScore: number }[] = [];
    for (const src of MARKET_SOURCES) {
      if (known.has(src.name)) {
        const found = existingSources.find((s) => s.name === src.name)!;
        sources.push({ id: found._id, name: found.name, type: found.type, reliabilityScore: found.reliabilityScore });
        continue;
      }
      const id = await ctx.db.insert("marketSources", {
        name: src.name,
        type: src.type,
        website: src.website,
        reliabilityScore: src.reliabilityScore,
        active: true,
        createdAt: now,
      });
      sources.push({ id, name: src.name, type: src.type, reliabilityScore: src.reliabilityScore });
    }

    // 2. Catalog → materialPrices
    const existingProducts = await ctx.db.query("materialPrices").collect();
    const productsByName = new Map(existingProducts.map((p) => [p.name, p]));
    let seeded = 0;
    for (const item of MARKET_CATALOG) {
      let productId = productsByName.get(item.name)?._id;
      if (!productId) {
        productId = await ctx.db.insert("materialPrices", {
          category: item.category as any,
          name: item.name,
          unit: item.unit,
          unitPrice: item.basePrice,
          currency: "TND",
          lastUpdated: now,
          updatedBy: admin._id as any,
          subcategory: item.subcategory,
          brand: item.brand,
          manufacturer: item.manufacturer,
          minPrice: item.basePrice,
          avgPrice: item.basePrice,
          maxPrice: item.basePrice,
          availability: "disponible",
          reliabilityIndex: 0.8,
        });
        seeded++;
      }
      // 3. Offers per matching source (max 3 per product)
      const candidates = sources.filter(
        (s) => s.name === item.manufacturer || s.name === item.brand || s.type === "distributeur"
      );
      const offerSources = candidates.length > 0 ? candidates.slice(0, 3) : sources.slice(0, 2);
      const existingOffers = await ctx.db
        .query("materialOffers")
        .withIndex("by_product", (q) => q.eq("productId", productId as any))
        .collect();
      const offerKeys = new Set(existingOffers.map((o) => o.supplier));
      for (const src of offerSources) {
        if (offerKeys.has(src.name)) continue;
        const minP = jitter(item.basePrice, 0.06);
        await ctx.db.insert("materialOffers", {
          productId: productId as any,
          category: item.category,
          subcategory: item.subcategory,
          name: item.name,
          brand: item.brand,
          manufacturer: item.manufacturer,
          unit: item.unit,
          minPrice: minP,
          avgPrice: jitter(item.basePrice, 0.04),
          maxPrice: jitter(item.basePrice, 0.08),
          currency: "TND",
          governorate: pick(GOVERNORATES),
          city: pick(GOVERNORATES),
          supplier: src.name,
          sourceId: src.id as any,
          sourceType: src.type,
          availability: "disponible",
          reliabilityIndex: Math.round(src.reliabilityScore * 100) / 100,
          updatedAt: now,
        });
      }
    }
    return { seededProducts: seeded, sources: sources.length, catalog: MARKET_CATALOG.length };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// SYNC — simulates market refresh: price drift, stock changes, history logs.
// Extensible: replace the jitter logic with real web scrapers/APIs per source.
// ═══════════════════════════════════════════════════════════════════════════
export const syncMarketData = mutation({
  args: {},
  handler: async (ctx) => {
    await isMarketAdmin(ctx);
    return runSync(ctx);
  },
});

// Internal entry point used by the weekly cron (no auth check).
export const runMarketSyncInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    return runSync(ctx);
  },
});

async function runSync(ctx: any) {
  const now = Date.now();
  const offers = await ctx.db.query("materialOffers").collect();
  let updated = 0;
  let history = 0;
  let stockAlerts = 0;

  for (const offer of offers) {
    // 15% chance of price drift; 8% chance of availability change
    const drift = Math.random() < 0.15;
    const stockChange = Math.random() < 0.08;
    if (!drift && !stockChange) continue;

    const prevMin = offer.minPrice;
    const prevAvg = offer.avgPrice;
    const prevMax = offer.maxPrice;
    let newMin = prevMin;
    let newAvg = prevAvg;
    let newMax = prevMax;
    if (drift) {
      const delta = 1 + (Math.random() * 2 - 1) * 0.07;
      newMin = Math.round(prevMin * delta * 100) / 100;
      newAvg = Math.round(prevAvg * delta * 100) / 100;
      newMax = Math.round(prevMax * delta * 100) / 100;
    }
    const avail: "disponible" | "sur_commande" | "rupture" = stockChange
      ? (["disponible", "sur_commande", "rupture"] as const)[Math.floor(Math.random() * 3)]
      : offer.availability;

    await ctx.db.patch(offer._id, {
      minPrice: newMin,
      avgPrice: newAvg,
      maxPrice: newMax,
      availability: avail,
      updatedAt: now,
    });
    updated++;
    if (avail === "rupture") stockAlerts++;

    if (drift) {
      await ctx.db.insert("offerPriceHistory", {
        offerId: offer._id,
        previousMin: prevMin,
        previousAvg: prevAvg,
        previousMax: prevMax,
        newMin: newMin,
        newAvg: newAvg,
        newMax: newMax,
        changedAt: now,
      });
      history++;
    }
  }

  // Re-aggregate product-level stats (min/avg/max, reliability, availability)
  const products = await ctx.db.query("materialPrices").collect();
  const offersByProduct = new Map<string, any[]>();
  for (const o of offers) {
    const list = offersByProduct.get(o.productId) || [];
    list.push(o);
    offersByProduct.set(o.productId, list);
  }
  for (const p of products) {
    const list = offersByProduct.get(p._id) || [];
    if (list.length === 0) continue;
    const mins = list.map((o) => o.minPrice);
    const avgs = list.map((o) => o.avgPrice);
    const rel = list.reduce((s, o) => s + o.reliabilityIndex, 0) / list.length;
    const hasStock = list.some((o) => o.availability === "disponible");
    const allRupture = list.length > 0 && list.every((o) => o.availability === "rupture");
    await ctx.db.patch(p._id, {
      minPrice: Math.min(...mins),
      avgPrice: Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 100) / 100,
      maxPrice: Math.max(...mins),
      unitPrice: Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 100) / 100,
      reliabilityIndex: Math.round(rel * 100) / 100,
      availability: allRupture ? "rupture" : hasStock ? "disponible" : "sur_commande",
      lastUpdated: now,
    });
  }

  // Touch sources for lastSyncAt
  const sources = await ctx.db.query("marketSources").collect();
  for (const s of sources) await ctx.db.patch(s._id, { lastSyncAt: now });

  return { updatedOffers: updated, historyRows: history, stockAlerts, syncedAt: now };
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS QUERIES — public (read) so the predictive module can reuse them.
// ═══════════════════════════════════════════════════════════════════════════
export const getMarketOverview = query({
  args: {},
  handler: async (ctx) => {
    const [offers, products, sources, history] = await Promise.all([
      ctx.db.query("materialOffers").collect(),
      ctx.db.query("materialPrices").collect(),
      ctx.db.query("marketSources").collect(),
      ctx.db.query("offerPriceHistory").order("desc").take(200),
    ]);
    const byCategory = new Map<string, { offers: number; avg: number; min: number }>();
    for (const o of offers) {
      const cur = byCategory.get(o.category) || { offers: 0, avg: 0, min: Infinity };
      cur.offers++;
      cur.avg += o.avgPrice;
      cur.min = Math.min(cur.min, o.minPrice);
      byCategory.set(o.category, cur);
    }
    const categories = [...byCategory.entries()].map(([category, c]) => ({
      category,
      offers: c.offers,
      avgPrice: Math.round((c.avg / c.offers) * 100) / 100,
      minPrice: c.min,
    }));
    const avgChange =
      history.length > 0
        ? Math.round(
            (history.reduce((s, h) => s + ((h.newAvg - h.previousAvg) / h.previousAvg) * 100, 0) /
              history.length) *
              100
          ) / 100
        : 0;
    return {
      totalOffers: offers.length,
      totalProducts: products.length,
      totalSources: sources.filter((s) => s.active).length,
      sourcesByType: {
        fabricant: sources.filter((s) => s.type === "fabricant").length,
        distributeur: sources.filter((s) => s.type === "distributeur").length,
        plateforme: sources.filter((s) => s.type === "plateforme").length,
      },
      avgChange,
      categories,
      lastSyncAt: sources.length ? Math.max(...sources.map((s) => s.lastSyncAt || 0)) : null,
    };
  },
});

export const getBestOffers = query({
  args: { category: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { category, limit }) => {
    let offers = await ctx.db.query("materialOffers").collect();
    if (category) offers = offers.filter((o) => o.category === category);
    // Best = cheapest reliable offer per product
    const bestByProduct = new Map<string, any>();
    for (const o of offers) {
      const cur = bestByProduct.get(o.productId);
      if (!cur || o.minPrice < cur.minPrice) bestByProduct.set(o.productId, o);
    }
    return [...bestByProduct.values()]
      .sort((a, b) => a.minPrice - b.minPrice)
      .slice(0, limit || 10)
      .map((o) => ({
        productId: o.productId,
        name: o.name,
        category: o.category,
        brand: o.brand,
        unit: o.unit,
        price: o.minPrice,
        supplier: o.supplier,
        governorate: o.governorate,
        reliabilityIndex: o.reliabilityIndex,
        availability: o.availability,
      }));
  },
});

export const getStockAlerts = query({
  args: {},
  handler: async (ctx) => {
    const offers = await ctx.db.query("materialOffers").collect();
    return offers
      .filter((o) => o.availability === "rupture" || o.availability === "sur_commande")
      .map((o) => ({
        name: o.name,
        supplier: o.supplier,
        governorate: o.governorate,
        availability: o.availability,
        lastPrice: o.avgPrice,
        updatedAt: o.updatedAt,
      }))
      .slice(0, 30);
  },
});

export const getPriceTrends = query({
  args: { productId: v.optional(v.id("materialPrices")) },
  handler: async (ctx, { productId }) => {
    const history = await ctx.db.query("offerPriceHistory").order("desc").take(500);
    if (productId) {
      const offers = await ctx.db.query("materialOffers").withIndex("by_product", (q) => q.eq("productId", productId)).collect();
      const ids = new Set(offers.map((o) => o._id));
      return history
        .filter((h) => ids.has(h.offerId))
        .sort((a, b) => a.changedAt - b.changedAt)
        .map((h) => ({ at: h.changedAt, avg: h.newAvg }));
    }
    // Aggregate trend per category (last 500 changes)
    const offers = await ctx.db.query("materialOffers").collect();
    const byId = new Map(offers.map((o) => [o._id, o]));
    const byCategory = new Map<string, { changes: number; netPct: number }>();
    for (const h of history) {
      const offer = byId.get(h.offerId);
      if (!offer) continue;
      const cur = byCategory.get(offer.category) || { changes: 0, netPct: 0 };
      cur.changes++;
      cur.netPct += ((h.newAvg - h.previousAvg) / h.previousAvg) * 100;
      byCategory.set(offer.category, cur);
    }
    return [...byCategory.entries()]
      .map(([category, c]) => ({
        category,
        changes: c.changes,
        netPct: Math.round(c.netPct * 100) / 100,
      }))
      .sort((a, b) => b.changes - a.changes);
  },
});

export const getGovernoratePrices = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, { category }) => {
    let offers = await ctx.db.query("materialOffers").collect();
    if (category) offers = offers.filter((o) => o.category === category);
    const byGov = new Map<string, { count: number; sum: number }>();
    for (const o of offers) {
      const key = o.governorate || "Tunis";
      const cur = byGov.get(key) || { count: 0, sum: 0 };
      cur.count++;
      cur.sum += o.avgPrice;
      byGov.set(key, cur);
    }
    const rows = [...byGov.entries()]
      .map(([governorate, c]) => ({
        governorate,
        offers: c.count,
        avgPrice: Math.round((c.sum / c.count) * 100) / 100,
      }))
      .sort((a, b) => a.avgPrice - b.avgPrice);
    const overall = rows.reduce((s, r) => s + r.avgPrice, 0) / (rows.length || 1);
    return {
      rows,
      cheapest: rows[0] || null,
      mostExpensive: rows[rows.length - 1] || null,
      nationalAverage: Math.round(overall * 100) / 100,
    };
  },
});

export const getSupplierComparison = query({
  args: { productId: v.id("materialPrices") },
  handler: async (ctx, { productId }) => {
    const offers = await ctx.db.query("materialOffers").withIndex("by_product", (q) => q.eq("productId", productId)).collect();
    return offers
      .map((o) => ({
        supplier: o.supplier,
        sourceType: o.sourceType,
        minPrice: o.minPrice,
        avgPrice: o.avgPrice,
        maxPrice: o.maxPrice,
        governorate: o.governorate,
        availability: o.availability,
        reliabilityIndex: o.reliabilityIndex,
        updatedAt: o.updatedAt,
      }))
      .sort((a, b) => a.minPrice - b.minPrice);
  },
});
