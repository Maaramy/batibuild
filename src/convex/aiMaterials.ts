import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getCurrentUser } from "./users";
import { requireClientProAccess } from "./access";
import { readFlag } from "./featureFlags";
import { COPILOT_CATEGORIES, type CopilotCategory } from "./aiMaterialsEngine";

// ── Données projet pour l'IA Matériaux (source du besoin = DQE) ──────────────/ ** Poste de besoin extrait d'un lot du Quantitatif détaillé. */
export interface DqeNeedPoste {
  /** Identifiant stable du poste dans le DQE (`lotId::index`). */
  key: string;
  /** Libellé du lot / sous-lot (ex : « Fondations », « Murs porteurs »). */
  poste: string;
  /** Sous-poste (anciennement `sousLot`). */
  sousPoste?: string;
  designation: string;
  /** Unité du besoin calculé (m², m, sac, tonne…). */
  unit: string;
  /** Quantité calculée (après transformation du lot + calage de prix). */
  quantity: number;
  /** Prix unitaire calculé du poste (TND). */
  unitPrice: number;
  /** Total du besoin dans la monnaie du projet. */
  total: number;
  nature: "materiaux" | "main_oeuvre" | "equipements" | "transport" | "etudes";
  /** Catégorie du copilote Matériaux suggérée depuis la désignation du poste. */
  suggestedCategoryId?: string;
  suggestedCategoryLabel?: string;
  /** Pré-sélection automatique : besoin matériau exploitable pour l'IA. */
  preSelected: boolean;
}

// ── Suggestion de catégorie Matériaux AI depuis une désignation du DQE ───────
// Le rapprochement se fait sur les mots-clés du moteur (aucune invention) :
// la désignation est normalisée (accents, casse) puis chaque mot-clé trouvé
// pondère le score par sa longueur, ce qui privilégie les correspondances
// les plus spécifiques (« isolation thermique » avant « laine »).
const normText = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00d7/g, "x")
    .toLowerCase();

function suggestCategory(need: Pick<DqeNeedPoste, "designation" | "sousPoste" | "poste">): CopilotCategory | null {
  const haystack = normText(
    [need.designation, need.sousPoste ?? "", need.poste].filter(Boolean).join(" "),
  );
  let best: { cat: CopilotCategory; score: number } | null = null;
  for (const cat of COPILOT_CATEGORIES) {
    let score = 0;
    for (const kw of cat.keywords) {
      const k = normText(kw);
      if (k && haystack.includes(k)) score += k.length;
    }
    if (score > 0 && (!best || score > best.score)) best = { cat, score };
  }
  return best?.cat ?? null;
}

/** Scénario budgétaire du projet (facteur appliqué aux besoins du DQE). */
export interface DqeBudgetScenario {
  totalCost: number;
  factor: number;
}

/** Déroulé des besoins réellement calculés dans le DQE, par catégorie. */
export interface DqeNeedsByCategory {
  id: string;
  label: string;
  nature: string;
  needs: DqeNeedPoste[];
}

/** Données calculées à partir du projet pour le moteur Matériaux AI. */
export interface AiMaterialsProjectData {
  /** Pré-sélection proposée par l'IA depuis les besoins du DQE. */
  preSelectedMaterialIds: string[];
  needs: DqeNeedPoste[];
  needsByCategory: DqeNeedsByCategory[];
  totalDqeCost: number;
  referenceSurface: number;
  generatedAt: number;
  /** Facteurs de prix des scénarios budgétaires du projet (relatifs au Standard). */
  budgetScenarios: Record<string, DqeBudgetScenario>;
}

export const getAiMaterialsProjectData = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<AiMaterialsProjectData | null> => {
    const project = await ctx.runQuery<any>(api.projects.getProject, { projectId: args.projectId });
    if (!project) return null;

    // Coût total du DQE (dérivé du coût estimatif si stocké, sinon 0).
    const dqeCost = project.costEstimate?.total ?? 0;

    // Déroulé des besoins par lot du DQE.
    const needsByCategory: DqeNeedsByCategory[] = (project.costEstimate?.dqe?.lots ?? []).map((lot: any) => ({
      id: lot.id,
      label: lot.name,
      nature: lot.nature,
      needs: (lot.lines ?? []).map((line: any, index: number) => {
        const base = {
          key: `${lot.id}::${index}`,
          poste: lot.name,
          sousPoste: line.sousLot,
          designation: line.designation,
          unit: line.unit,
          quantity: Number(line.quantity) || 0,
          unitPrice: Number(line.unitPrice) || 0,
          total: Number(line.total) || 0,
          nature: line.nature,
        } as DqeNeedPoste;
        const cat = suggestCategory(base);
        return {
          ...base,
          suggestedCategoryId: cat?.id,
          suggestedCategoryLabel: cat?.label,
          // Pré-sélection : besoin réellement matériau, quantité exploitable et
          // catégorie reconnue dans le catalogue 2026.
          preSelected: base.nature === "materiaux" && base.quantity > 0 && !!cat,
        };
      }),
    }));

    // Scénarios budgétaires (Économique / Standard / Premium) : les besoins du
    // DQE sont exprimés au niveau Standard ; le facteur de chaque scénario sert
    // au client à recalculer quantités (inchangées), prix unitaires et totaux.
    const rawScenarios = project.costEstimate?.budgetScenarios;
    const standardTotal = Number(rawScenarios?.standard?.totalCost) || 0;
    const budgetScenarios: Record<string, DqeBudgetScenario> = {};
    for (const key of ["economique", "standard", "premium"] as const) {
      const totalCost = Number(rawScenarios?.[key]?.totalCost) || 0;
      budgetScenarios[key] = {
        totalCost,
        factor:
          key === "standard" || !standardTotal || !totalCost
            ? 1
            : totalCost / standardTotal,
      };
    }

    const needs = needsByCategory.flatMap((c) => c.needs);

    return {
      preSelectedMaterialIds: needs.filter((n) => n.preSelected).map((n) => n.key),
      needs,
      needsByCategory,
      totalDqeCost: dqeCost,
      referenceSurface: project.costEstimate?.dqe?.referenceSurface ?? 0,
      generatedAt: project.costEstimate?.dqe?.generatedAt ?? 0,
      budgetScenarios,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// ANALYSES ENREGISTRÉES (table `aiMaterialAnalyses`)
// Mêmes règles que le module Investissement : lecture limitée au propriétaire,
// écriture soumise à l'abonnement Client Pro et au feature flag `ai_materials`.
// ═══════════════════════════════════════════════════════════════════════════

/** Analyses Matériaux AI de l'utilisateur connecté (plus récentes d'abord). */
export const getCopilotAnalyses = query({
  args: { projectId: v.optional(v.id("projects")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    if (args.projectId) {
      return ctx.db
        .query("aiMaterialAnalyses")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", user._id).eq("projectId", args.projectId),
        )
        .order("desc")
        .collect();
    }
    return ctx.db
      .query("aiMaterialAnalyses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

/** Une analyse enregistrée (propriétaire uniquement). */
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

/** Enregistre une analyse Matériaux AI (input + résultat du moteur). */
export const saveCopilotAnalysis = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    input: v.any(),
    results: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Matériaux IA");

    // Feature flag : module désactivé → enregistrement bloqué côté serveur.
    if (!(await readFlag(ctx, "ai_materials"))) {
      throw new Error("Cette fonctionnalité n'est actuellement pas disponible.");
    }

    return await ctx.db.insert("aiMaterialAnalyses", {
      userId: user._id,
      projectId: args.projectId,
      input: args.input,
      results: args.results,
      createdAt: Date.now(),
    });
  },
});

/** Supprime une analyse Matériaux AI (propriétaire uniquement). */
export const deleteCopilotAnalysis = mutation({
  args: { analysisId: v.id("aiMaterialAnalyses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const doc = await ctx.db.get(args.analysisId);
    if (!doc || doc.userId !== user._id) throw new Error("Analyse introuvable");
    await ctx.db.delete(args.analysisId);
    return { success: true };
  },
});

export type { ProjectContext } from "./aiMaterialsEngine";
