import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { requireClientProAccess, getFreePlanStatus } from "./access";
// Moteur « Intelligence prédictive » Groupe B — import statique obligatoire :
// les imports dynamiques (await import) ne sont pas supportés dans les
// fonctions Convex (« dynamic module import unsupported »).
import { buildPredictiveAnalysis } from "./predictiveDomains";
import {
  projectCategoryValidator,
  projectStatusValidator,
  PROJECT_STATUS,
  materialCategoryValidator,
  regionValidator,
  SPECIALTY_TO_PROVIDER_TYPE,
} from "./schema";

// ============================================================================
// Queries
// ============================================================================

/** Get all projects for the current user */
export const getUserProjects = query({
  args: {
    status: v.optional(projectStatusValidator),
    includeFavorites: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    let projects;
    if (args.status) {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", user._id).eq("status", args.status!),
        )
        .order("desc")
        .collect();
    } else {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("desc")
        .collect();
    }

    if (args.includeFavorites) {
      projects = projects.filter((p) => p.isFavorite);
    }

    return projects;
  },
});

/** Get all projects (admin only, returns empty if not admin) */
export const getAllProjects = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "moderator")) {
      return [];
    }
    return await ctx.db.query("projects").order("desc").collect();
  },
});

/** Get a single project by ID */
export const getProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project) return null;
    if (project.userId !== user._id && user.role !== "admin") return null;

    return project;
  },
});

/** Get project statistics for dashboard */
export const getProjectStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return {
        totalProjects: 0,
        completedProjects: 0,
        analyzingProjects: 0,
        draftProjects: 0,
        totalEstimatedCost: 0,
        averageCostPerProject: 0,
        recentProjects: [],
      };
    }

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const completed = projects.filter(
      (p) => p.status === PROJECT_STATUS.COMPLETED,
    );
    const analyzing = projects.filter(
      (p) => p.status === PROJECT_STATUS.ANALYZING,
    );
    const drafts = projects.filter((p) => p.status === PROJECT_STATUS.DRAFT);

    const totalCost = completed.reduce(
      (sum, p) => sum + (p.costEstimate?.totalCost || 0),
      0,
    );

    const recentProjects = projects
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    return {
      totalProjects: projects.length,
      completedProjects: completed.length,
      analyzingProjects: analyzing.length,
      draftProjects: drafts.length,
      totalEstimatedCost: totalCost,
      averageCostPerProject: completed.length > 0 ? totalCost / completed.length : 0,
      recentProjects,
    };
  },
});

/** Compare multiple projects */
export const compareProjects = query({
  args: { projectIds: v.array(v.id("projects")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const projects = [];
    for (const id of args.projectIds) {
      const project = await ctx.db.get(id);
      if (project && (project.userId === user._id || user.role === "admin")) {
        projects.push(project);
      }
    }
    return projects;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/** Create a new project */
export const createProject = mutation({
  args: {
    name: v.string(),
    category: projectCategoryValidator,
    description: v.optional(v.string()),
    region: v.optional(regionValidator),
    surface: v.optional(v.number()),
    floors: v.optional(v.number()),
    // Nombre de pièces (maison, villa, immeuble résidentiel)
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    kitchens: v.optional(v.number()),
    livingRooms: v.optional(v.number()),
    garages: v.optional(v.number()),
    wcs: v.optional(v.number()),
    pools: v.optional(v.number()),
    surfaceTotale: v.optional(v.number()),
    manualInput: v.optional(
      v.object({
        surface: v.optional(v.number()),
        floors: v.optional(v.number()),
        description: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Projets de construction");

    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      userId: user._id,
      name: args.name,
      category: args.category,
      status: PROJECT_STATUS.DRAFT,
      description: args.description,
      region: args.region,
      surface: args.surface,
      floors: args.floors,
      bedrooms: args.bedrooms,
      bathrooms: args.bathrooms,
      kitchens: args.kitchens,
      livingRooms: args.livingRooms,
      garages: args.garages,
      wcs: args.wcs,
      pools: args.pools,
      surfaceTotale: args.surfaceTotale,
      manualInput: args.manualInput,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    });

    return projectId;
  },
});

/** Update project status */
export const updateProjectStatus = mutation({
  args: {
    projectId: v.id("projects"),
    status: projectStatusValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    if (project.userId !== user._id && user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.projectId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

/** Update project with AI analysis results */
export const updateProjectAnalysis = mutation({
  args: {
    projectId: v.id("projects"),
    status: v.optional(projectStatusValidator),
    aiAnalysis: v.optional(
      v.object({
        category: v.string(),
        confidence: v.number(),
        dimensions: v.object({
          detected: v.boolean(),
          estimatedLength: v.optional(v.number()),
          estimatedWidth: v.optional(v.number()),
          estimatedArea: v.optional(v.number()),
        }),
        features: v.optional(
          v.array(
            v.object({
              type: v.string(),
              detected: v.boolean(),
              quantity: v.optional(v.number()),
            }),
          ),
        ),
        anomalies: v.optional(
          v.array(
            v.object({
              type: v.string(),
              severity: v.string(),
              description: v.string(),
              recommendation: v.optional(v.string()),
            }),
          ),
        ),
        constructionMethods: v.optional(v.array(v.string())),
        estimatedDuration: v.optional(v.string()),
        laborEstimate: v.optional(
          v.object({
            totalWorkers: v.optional(v.number()),
            totalDays: v.optional(v.number()),
            estimatedCost: v.optional(v.number()),
          }),
        ),
        rawAnalysis: v.optional(v.string()),
      }),
    ),
    costEstimate: v.optional(
      v.object({
        totalCost: v.number(),
        costPerSquareMeter: v.optional(v.number()),
        currency: v.string(),
        breakdown: v.array(
          v.object({
            category: materialCategoryValidator,
            label: v.string(),
            estimatedCost: v.number(),
            percentage: v.number(),
            items: v.optional(
              v.array(
                v.object({
                  name: v.string(),
                  quantity: v.number(),
                  unit: v.string(),
                  unitPrice: v.number(),
                  totalPrice: v.number(),
                }),
              ),
            ),
          }),
        ),
        contingencyBuffer: v.number(),
        contingencyPercentage: v.number(),
        budgetScenarios: v.optional(
          v.object({
            economique: v.object({
              totalCost: v.number(),
              costPerM2: v.number(),
              label: v.string(),
              multiplier: v.number(),
            }),
            standard: v.object({
              totalCost: v.number(),
              costPerM2: v.number(),
              label: v.string(),
              multiplier: v.number(),
            }),
            premium: v.object({
              totalCost: v.number(),
              costPerM2: v.number(),
              label: v.string(),
              multiplier: v.number(),
            }),
          }),
        ),
      }),
    ),
    optimizationTips: v.optional(v.array(v.string())),
    technicalRecommendations: v.optional(v.array(v.string())),
    providerRecommendations: v.optional(
      v.object({
        providers: v.array(
          v.object({
            type: v.string(),
            label: v.string(),
            icon: v.string(),
            reason: v.string(),
            priority: v.union(
              v.literal("essentiel"),
              v.literal("recommande"),
              v.literal("optionnel")
            ),
            regionProximity: v.string(),
            localCities: v.array(v.string()),
          })
        ),
        stats: v.object({
          total: v.number(),
          essential: v.number(),
          recommended: v.number(),
        }),
        regionInfo: v.object({
          name: v.string(),
          cities: v.array(v.string()),
          advice: v.string(),
        }),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    if (project.userId !== user._id && user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.projectId, {
      ...(args.status && { status: args.status }),
      ...(args.aiAnalysis && { aiAnalysis: args.aiAnalysis }),
      ...(args.costEstimate && { costEstimate: args.costEstimate }),
      ...(args.optimizationTips && { optimizationTips: args.optimizationTips }),
      ...(args.technicalRecommendations && {
        technicalRecommendations: args.technicalRecommendations,
      }),
      ...(args.providerRecommendations && {
        providerRecommendations: args.providerRecommendations,
      }),
      updatedAt: Date.now(),
    });
  },
});

/** Update project dimensions */
export const updateProjectDimensions = mutation({
  args: {
    projectId: v.id("projects"),
    surface: v.optional(v.number()),
    floors: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    if (project.userId !== user._id && user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.projectId, {
      ...(args.surface !== undefined && { surface: args.surface }),
      ...(args.floors !== undefined && { floors: args.floors }),
      updatedAt: Date.now(),
    });
  },
});

/** Toggle favorite status */
export const toggleFavorite = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    if (project.userId !== user._id) throw new Error("Unauthorized");

    await ctx.db.patch(args.projectId, {
      isFavorite: !project.isFavorite,
      updatedAt: Date.now(),
    });
  },
});

/** Delete a project */
export const deleteProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    if (project.userId !== user._id && user.role !== "admin") {
      throw new Error("Unauthorized");
    }
    
    // Prevent deletion of completed projects (admin can still delete)
    if (project.status === "completed" && user.role !== "admin") {
      throw new Error("SUPPRESSION_REFUSEE:Les projets terminés ne peuvent pas être supprimés. Contactez un administrateur si nécessaire.");
    }

    await ctx.db.delete(args.projectId);
  },
});

/** Batch delete projects (admin only) */
export const adminBatchDeleteProjects = mutation({
  args: { projectIds: v.array(v.id("projects")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    let deleted = 0;
    for (const projectId of args.projectIds) {
      const project = await ctx.db.get(projectId);
      if (project) {
        await ctx.db.delete(projectId);
        deleted++;
      }
    }

    return { deleted };
  },
});

/** Add files to a project */
export const addProjectFiles = mutation({
  args: {
    projectId: v.id("projects"),
    files: v.array(
      v.object({
        name: v.string(),
        type: v.string(),
        storageId: v.id("_storage"),
        size: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    if (project.userId !== user._id) throw new Error("Unauthorized");

    const currentFiles = project.files || [];
    await ctx.db.patch(args.projectId, {
      files: [...currentFiles, ...args.files],
      updatedAt: Date.now(),
    });
  },
});

/** Start AI analysis for a project */
export const startAnalysis = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Projets de construction");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    if (project.userId !== user._id) throw new Error("Unauthorized");

    await ctx.db.patch(args.projectId, {
      status: PROJECT_STATUS.ANALYZING,
      updatedAt: Date.now(),
    });

    return args.projectId;
  },
});

// ============================================================================
// Predictive Intelligence (Pro/Expert) — AI price forecasts
// ============================================================================

/** Save predictive intelligence results on a project (Pro/Expert only) */
export const updatePredictiveInsights = mutation({
  args: {
    projectId: v.id("projects"),
    predictiveInsights: v.object({
      summary: v.string(),
      pricePredictions: v.array(
        v.object({
          material: v.string(),
          category: v.string(),
          predictedChangePct: v.number(),
          trend: v.union(
            v.literal("hausse"),
            v.literal("baisse"),
            v.literal("stable")
          ),
          horizon: v.string(),
          reasoning: v.string(),
        })
      ),
      bestBuyingPeriods: v.array(
        v.object({
          material: v.string(),
          period: v.string(),
          reason: v.string(),
          savingPct: v.number(),
        })
      ),
      budgetOptimizations: v.array(
        v.object({
          title: v.string(),
          description: v.string(),
          potentialSaving: v.number(),
        })
      ),
      lossReductions: v.array(
        v.object({
          title: v.string(),
          description: v.string(),
          estimatedSavingPct: v.number(),
        })
      ),
      overallSavingsPct: v.number(),
      generatedAt: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Only Pro / Expert (or admin) can store predictive insights
    const plan = user.subscriptionPlan ?? "free";
    if (plan !== "pro" && plan !== "expert" && user.role !== "admin") {
      throw new Error("L'intelligence prédictive est réservée aux forfaits Client Pro et Expert");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    if (project.userId !== user._id && user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.projectId, {
      predictiveInsights: args.predictiveInsights,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// Intelligence prédictive (Groupe B) — analyse dynamique par domaine
// ============================================================================

/**
 * Enregistre l'analyse prédictive « Groupe B » (plomberie, électricité,
 * cuisine…) sur le projet. Le calcul est effectué côté serveur à partir des
 * données réelles du projet (type, surface, coût estimé, DQE, quantitatif) :
 * cette mutation (a) valide l'accès, (b) exécute le moteur dynamique et
 * (c) persiste le résultat.
 */
export const updateGroupBPrediction = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    if (project.userId !== user._id && user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    // Calcul synchronisé via le moteur dynamique (import statique) : le
    // domaine analysé dépend du type de projet enregistré (plomberie,
    // électricité, cuisine…) croisé avec les données réelles du projet.
    const ce = project.costEstimate as { totalCost?: number; breakdown?: { items?: { name?: string; quantity?: number; unitPrice?: number; totalPrice?: number }[] }[] } | undefined;
    const dqe = (project as { dqe?: { lots?: unknown } }).dqe;
    const prediction = buildPredictiveAnalysis({
      projectType: project.category,
      surface: project.surface ?? null,
      region: project.region ?? null,
      totalCost: ce?.totalCost ?? null,
      dqeLots: (dqe?.lots as Parameters<typeof buildPredictiveAnalysis>[0]["dqeLots"]) ?? null,
      ceItems: ce?.breakdown?.flatMap((b) => b?.items ?? []) ?? null,
    });

    await ctx.db.patch(args.projectId, {
      groupBPrediction: prediction,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// BIM Engine (professional cost estimation)
// ============================================================================

import {
  runBIMEstimation,
  generateProviderRecommendations,
  buildLivePriceMap,
  withLivePrices,
} from "./bimEngine";
import { applyRealisticDoorsWindows } from "./bimQuantitatif";
import { generateDqe } from "./dqeEngine";
import { inferFloorsFromCategory, normalizeLegacyCategory } from "./projectTypes";

// ============================================================================
// Simulate Analysis (BIM Professional Engine)
// ============================================================================

/** Generate a professional BIM analysis with Tunisian 2026 prices */
export const simulateAnalysis = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Estimation des coûts");

    const project = await ctx.db.get(args.projectId);
    if (!project) return;

    const surface = project.surface ?? 150;
    // Nombre de niveaux effectif : valeur saisie par l'utilisateur si présente
    // (sélecteur manuel), sinon déduite du type de projet.
    const floors = project.floors ?? inferFloorsFromCategory(project.category);
    // Les types « Maison R+1 » / « Maison R+2 » ont été supprimés du catalogue :
    // les projets existants enregistrés avec ces anciens slugs sont
    // recalculés comme « maison » / « villa » avec leur nombre de niveaux.
    const category = normalizeLegacyCategory(project.category);
    const region = project.region ?? "tunis";
    const finishLevel = (project as any).finish_level || "standard";

    // Prix en direct depuis la base materialPrices (catalogue officiel 2026) :
    // les libellés, unités et prix unitaires du « Quantitatif détaillé » sont
    // résolus vers la base ; toute modification de prix faite dans le panneau
    // admin se reflète automatiquement dans les nouvelles estimations.
    const liveRows = await ctx.db.query("materialPrices").collect();
    const livePrices = buildLivePriceMap(
      liveRows.map((m) => ({ name: m.name, unit: m.unit, unitPrice: m.unitPrice })),
    );

    const result = withLivePrices(livePrices, () =>
      runBIMEstimation(category, surface, floors, region, finishLevel, {
        bedrooms: project.bedrooms,
        bathrooms: project.bathrooms,
        kitchens: project.kitchens,
        livingRooms: project.livingRooms,
        garages: project.garages,
        wcs: project.wcs,
        pools: project.pools,
      }),
    );

    // Portes & fenêtres du « Quantitatif détaillé » : quantités réalistes par
    // pièce (1 porte intérieure par pièce, 1-2 fenêtres par pièce, 2 portes
    // principales) selon le nombre de pièces du projet. Les prix unitaires du
    // catalogue 2026 / base materialPrices sont conservés ; l'écart de budget
    // de la catégorie « Second œuvre » est réparti sur les autres postes.
    // Les défauts pièces sont alignés sur ceux du moteur BIM (~1 pièce / 45 m²).
    const tb = surface * (floors || 1);
    result.costEstimate.breakdown = applyRealisticDoorsWindows(
      result.costEstimate.breakdown,
      {
        bedrooms: project.bedrooms ?? Math.max(1, Math.round(tb / 45)),
        bathrooms: project.bathrooms ?? Math.max(1, Math.round(tb / 80)),
        kitchens: project.kitchens ?? 1,
        livingRooms: project.livingRooms ?? Math.max(1, Math.round(tb / 75)),
        garages: project.garages ?? 0,
        wcs: project.wcs ?? Math.max(1, Math.round(tb / 90)),
        pools: project.pools ?? 0,
      },
    );

    // ── Devis Quantitatif Estimatif (DQE) ──
    // « Quantitatif détaillé » structuré selon le modèle Google Sheets de
    // référence : lots / sous-lots, désignation, description, unité, quantité,
    // prix unitaire, montant (Montant = Quantité × P.U.), sous-total par lot,
    // totaux par nature (matériaux, main-d'œuvre, équipements, transport,
    // études) et coût moyen au m². Le budget total clé en main (coût réel des
    // travaux, sans imprévus) est réparti par lot ; les prix en direct de la
    // base materialPrices
    // écrasent les prix de référence internes du moteur.
    const dqe = generateDqe({
      category,
      surface,
      floors,
      totalBudget: result.costEstimate.totalCost,
      livePrices,
    });

    // Generate AI provider recommendations
    const recommendations = generateProviderRecommendations(
      category,
      region,
      result.costEstimate.totalCost,
      surface,
      floors,
      finishLevel
    );

    // Attach registered suppliers to each provider recommendation
    const providerTypes = recommendations.providers.map((p: any) => p.type);
    const supplierMap = new Map<string, any[]>();

    // ── Also fetch registered suppliers from the database ──
    // « Offre gratuite » (switch admin) : tous les fournisseurs visibles sont
    // recommandés automatiquement, sans abonnement actif.
    const now = Date.now();
    const free = await getFreePlanStatus(ctx);
    const allProfiles = free.supplierFree
      ? (await ctx.db.query("supplierProfiles").collect()).filter(
          (s) => s.isVisible
        )
      : [
          ...(await ctx.db
            .query("supplierProfiles")
            .withIndex("by_subscription", (q) => q.eq("subscriptionStatus", "active"))
            .collect()),
          ...(await ctx.db
            .query("supplierProfiles")
            .withIndex("by_subscription", (q) => q.eq("subscriptionStatus", "trial"))
            .collect()),
        ].filter((s) => s.isVisible);

    // Filter out expired trials/subscriptions
    const validProfiles = free.supplierFree
      ? allProfiles
      : allProfiles.filter((s) => {
          if (
            s.subscriptionStatus === "trial" &&
            s.trialStartDate &&
            s.trialStartDate + 7 * 24 * 60 * 60 * 1000 < now
          ) {
            return false;
          }
          if (
            s.subscriptionStatus === "active" &&
            s.subscriptionEndDate &&
            s.subscriptionEndDate < now
          ) {
            return false;
          }
          return true;
        });

    // Map registered suppliers to provider types via their specialties
    for (const profile of validProfiles) {
      // Determine which provider types this supplier matches
      const matchedTypes = new Set<string>();
      for (const specialty of profile.specialties) {
        const providerTypesForSpecialty =
          SPECIALTY_TO_PROVIDER_TYPE[specialty] || [];
        providerTypesForSpecialty.forEach((t: string) => matchedTypes.add(t));
      }

      // For each matched provider type that's in our recommendations, add this supplier
      for (const type of matchedTypes) {
        if (providerTypes.includes(type)) {
          const existing = supplierMap.get(type) || [];
          const supplierEntry = {
            id: `registered_${profile._id}`,
            name: profile.companyName,
            phone: profile.phone,
            email: profile.email || undefined,
            address: profile.address,
            website: profile.website || undefined,
            description:
              profile.description || `Fournisseur inscrit - ${profile.companyName}`,
            rating: 4.5,
          };
          // Avoid duplicates
          if (!existing.some((s: any) => s.id === supplierEntry.id)) {
            existing.push(supplierEntry);
          }
          supplierMap.set(type, existing);
        }
      }
    }

    const enhancedProviders = recommendations.providers.map((p: any) => ({
      ...p,
      suppliers: supplierMap.get(p.type) || [],
    }));

    recommendations.providers = enhancedProviders;

    // Cast BIM categories to the valid union type for Convex schema
    const costEstimate = {
      ...result.costEstimate,
      breakdown: result.costEstimate.breakdown.map((b: any) => ({
        ...b,
        category: b.category as typeof materialCategoryValidator.type,
      })),
    };

    await ctx.db.patch(args.projectId, {
      status: PROJECT_STATUS.COMPLETED,
      costEstimate,
      dqe: dqe as any,
      aiAnalysis: result.aiAnalysis,
      optimizationTips: result.optimizationTips,
      technicalRecommendations: result.technicalRecommendations,
      providerRecommendations: recommendations,
      updatedAt: Date.now(),
    });
  },
});
