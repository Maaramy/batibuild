import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { requireClientProAccess } from "./access";
import { readFlag } from "./featureFlags";
import {
  COPILOT_CATEGORIES,
  COPILOT_CATEGORY_BY_ID,
  matchCategoryMaterials,
  categoriesFromCostEstimation,
} from "./aiMaterialsEngine";

// ═══════════════════════════════════════════════════════════════════════════
// AI MATERIALS COPILOT — API Convex (queries + mutations).
// Les actions IA (recommendMaterials, compareCopilotMaterials, chat…) vivent
// dans aiMaterialsActions.ts (fichier « use node »).
// ═══════════════════════════════════════════════════════════════════════════

// ── Queries ──────────────────────────────────────────────────────────────────
export const getCopilotCategories = query({
  args: {},
  handler: async (ctx) => {
    const materials = await ctx.db.query("materialPrices").collect();
    return COPILOT_CATEGORIES.map((cat) => ({
      id: cat.id,
      label: cat.label,
      icon: cat.icon,
      count: matchCategoryMaterials(cat, materials as any[]).length,
    }));
  },
});

/**
 * Catégories & matériaux **réellement utilisés** par l'estimation globale des
 * coûts de construction (DQE) du projet sélectionné.
 *
 * Lecture strictement privée : le projet est vérifié comme appartenant à
 * l'utilisateur connecté (ou à un administrateur). Renvoie `hasEstimation:
 * false` tant que le calcul des coûts n'a pas été lancé, afin que l'interface
 * propose de le lancer plutôt que d'afficher des catégories non pertinentes.
 */
export const getCostEstimationCategories = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const EMPTY = { hasEstimation: false, categories: [], materialsCount: 0 };

    const user = await getCurrentUser(ctx);
    if (!user) return EMPTY;

    const project = await ctx.db.get(projectId);
    if (!project || (project.userId !== user._id && user.role !== "admin")) {
      return EMPTY;
    }

    let dqe = (project as any).dqe ?? (project as any).costEstimate?.dqe ?? null;

    // Repli : anciennes estimations sans DQE — on reconstitue les matériaux du
    // calcul des coûts à partir du découpage `costEstimate.breakdown.items`.
    if (!dqe?.lots?.length) {
      const breakdown = (project as any).costEstimate?.breakdown;
      if (Array.isArray(breakdown) && breakdown.length > 0) {
        dqe = {
          lots: breakdown.map((b: any) => ({
            id: b?.category,
            name: b?.label,
            lines: (Array.isArray(b?.items) ? b.items : []).map((it: any) => ({
              designation: it?.name,
              quantity: it?.quantity,
            })),
          })),
        };
      }
    }

    if (!dqe?.lots?.length) return EMPTY;

    const materials = await ctx.db.query("materialPrices").collect();
    const categories = categoriesFromCostEstimation(dqe, materials as any[]);
    const materialsCount = categories.reduce((sum, c) => sum + c.count, 0);

    return { hasEstimation: true, categories, materialsCount };
  },
});

/** Matériaux + offres pour les catégories sélectionnées (comparateur, exploration). */
export const getCopilotMaterials = query({
  args: { categories: v.array(v.string()) },
  handler: async (ctx, { categories }) => {
    const materials = await ctx.db.query("materialPrices").collect();
    const offers = await ctx.db.query("materialOffers").collect();
    const picked = new Set<string>();
    const byCat = new Map<string, string>();
    for (const id of categories) {
      const cat = COPILOT_CATEGORY_BY_ID[id];
      if (!cat) continue;
      for (const m of matchCategoryMaterials(cat, materials as any[])) {
        picked.add(m._id);
        byCat.set(m._id, cat.id);
      }
    }
    const pickedMaterials = materials.filter((m) => picked.has(m._id));
    const offerIds = new Set(pickedMaterials.map((m) => m._id));
    return {
      materials: pickedMaterials.map((m) => ({
        _id: m._id,
        name: m.name,
        category: m.category,
        subcategory: m.subcategory,
        unit: m.unit,
        unitPrice: m.unitPrice,
        brand: m.brand,
        manufacturer: m.manufacturer,
        priceQuality: m.priceQuality,
        confidenceIndex: m.confidenceIndex,
        availability: m.availability,
        copilotCategory: byCat.get(m._id),
      })),
      offers: offers.filter((o) => offerIds.has(o.productId as any)),
    };
  },
});

/** Historique des analyses enregistrées de l'utilisateur. */
export const getCopilotAnalyses = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("aiMaterialAnalyses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
  },
});

/** Récupère une analyse enregistrée par son identifiant (propriétaire uniquement). */
export const getCopilotAnalysis = query({
  args: { analysisId: v.id("aiMaterialAnalyses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const doc = await ctx.db.get(args.analysisId);
    if (!doc || doc.userId !== user._id) return null;
    return doc;
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────
export const saveCopilotAnalysis = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    input: v.any(),
    results: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    // Feature flag : module désactivé → enregistrement bloqué côté serveur.
    if (!(await readFlag(ctx, "ai_materials"))) {
      throw new Error("Cette fonctionnalité n'est actuellement pas disponible.");
    }

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Matériaux IA");

    return await ctx.db.insert("aiMaterialAnalyses", {
      userId: user._id,
      projectId: args.projectId,
      input: args.input,
      results: args.results,
      createdAt: Date.now(),
    });
  },
});

export const deleteCopilotAnalysis = mutation({
  args: { analysisId: v.id("aiMaterialAnalyses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const doc = await ctx.db.get(args.analysisId);
    if (!doc || doc.userId !== user._id) throw new Error("Accès refusé");
    await ctx.db.delete(args.analysisId);
  },
});
