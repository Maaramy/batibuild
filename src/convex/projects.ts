import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import {
  projectCategoryValidator,
  projectStatusValidator,
  PROJECT_STATUS,
  materialCategoryValidator,
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

/** Get all projects (admin only) */
export const getAllProjects = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
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
    location: v.optional(v.string()),
    manualInput: v.optional(
      v.object({
        landArea: v.optional(v.number()),
        builtArea: v.optional(v.number()),
        length: v.optional(v.number()),
        width: v.optional(v.number()),
        floors: v.optional(v.number()),
        description: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      userId: user._id,
      name: args.name,
      category: args.category,
      status: PROJECT_STATUS.DRAFT,
      description: args.description,
      location: args.location,
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
      }),
    ),
    optimizationTips: v.optional(v.array(v.string())),
    technicalRecommendations: v.optional(v.array(v.string())),
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
      updatedAt: Date.now(),
    });
  },
});

/** Update project dimensions */
export const updateProjectDimensions = mutation({
  args: {
    projectId: v.id("projects"),
    landArea: v.optional(v.number()),
    builtArea: v.optional(v.number()),
    length: v.optional(v.number()),
    width: v.optional(v.number()),
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
      ...(args.landArea !== undefined && { landArea: args.landArea }),
      ...(args.builtArea !== undefined && { builtArea: args.builtArea }),
      ...(args.length !== undefined && { length: args.length }),
      ...(args.width !== undefined && { width: args.width }),
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

    await ctx.db.delete(args.projectId);
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

/** Generate a simulated AI analysis (demo mode) */
export const simulateAnalysis = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;

    const project = await ctx.db.get(args.projectId);
    if (!project) return;

    // Simulated AI analysis
    const landArea = project.landArea || project.manualInput?.landArea || 200;
    const builtArea = project.builtArea || project.manualInput?.builtArea || 150;

    const baseCostPerM2 = 1200; // TND per m² (average Tunisian construction cost)
    const estimatedTotal = builtArea * baseCostPerM2;

    const analysis = {
      category: project.category,
      confidence: 0.85,
      dimensions: {
        detected: true,
        estimatedLength: Math.sqrt(landArea),
        estimatedWidth: Math.sqrt(landArea),
        estimatedArea: landArea,
      },
      features: [
        { type: "walls", detected: true, quantity: 4 },
        { type: "roof", detected: true, quantity: 1 },
        { type: "doors", detected: true, quantity: Math.round(builtArea / 30) },
        { type: "windows", detected: true, quantity: Math.round(builtArea / 20) },
        { type: "foundation", detected: true, quantity: 1 },
      ],
      anomalies: [],
      constructionMethods: [
        "construction traditionnelle (parpaings et poutres)",
        "dalle pleine en béton armé",
      ],
      estimatedDuration: `${Math.ceil(builtArea / 20)} mois`,
      laborEstimate: {
        totalWorkers: Math.ceil(builtArea / 30),
        totalDays: Math.ceil(builtArea / 10) * 22,
        estimatedCost: estimatedTotal * 0.35,
      },
      rawAnalysis: `Analyse du projet ${project.name}:\nType détecté: ${project.category}\nSurface estimée: ${builtArea}m²\nNombre d'étages: ${project.floors || 1}\nRésultat: Projet résidentiel standard.`,
    };

    const breakdown = [
      {
        category: "ciment" as const,
        label: "Ciment",
        estimatedCost: estimatedTotal * 0.08,
        percentage: 8,
        items: [
          { name: "Ciment CPJ 42.5", quantity: Math.round(builtArea * 3.5), unit: "sacs", unitPrice: 12, totalPrice: Math.round(builtArea * 3.5 * 12) },
        ],
      },
      {
        category: "sable" as const,
        label: "Sable",
        estimatedCost: estimatedTotal * 0.04,
        percentage: 4,
        items: [
          { name: "Sable de construction", quantity: Math.round(builtArea * 0.5), unit: "m³", unitPrice: 35, totalPrice: Math.round(builtArea * 0.5 * 35) },
        ],
      },
      {
        category: "acier" as const,
        label: "Acier",
        estimatedCost: estimatedTotal * 0.12,
        percentage: 12,
        items: [
          { name: "Acier à béton (T12)", quantity: Math.round(builtArea * 1.2), unit: "tonnes", unitPrice: 3200, totalPrice: Math.round(builtArea * 1.2 * 3200) },
        ],
      },
      {
        category: "briques" as const,
        label: "Briques & Parpaings",
        estimatedCost: estimatedTotal * 0.06,
        percentage: 6,
      },
      {
        category: "beton" as const,
        label: "Béton",
        estimatedCost: estimatedTotal * 0.1,
        percentage: 10,
      },
      {
        category: "bois" as const,
        label: "Bois",
        estimatedCost: estimatedTotal * 0.03,
        percentage: 3,
      },
      {
        category: "carrelage" as const,
        label: "Carrelage & Revêtements",
        estimatedCost: estimatedTotal * 0.07,
        percentage: 7,
      },
      {
        category: "peinture" as const,
        label: "Peinture",
        estimatedCost: estimatedTotal * 0.03,
        percentage: 3,
      },
      {
        category: "plomberie" as const,
        label: "Plomberie",
        estimatedCost: estimatedTotal * 0.06,
        percentage: 6,
      },
      {
        category: "electricite" as const,
        label: "Électricité",
        estimatedCost: estimatedTotal * 0.05,
        percentage: 5,
      },
      {
        category: "portes" as const,
        label: "Portes & Fenêtres",
        estimatedCost: estimatedTotal * 0.06,
        percentage: 6,
      },
      {
        category: "main_oeuvre" as const,
        label: "Main-d'œuvre",
        estimatedCost: estimatedTotal * 0.25,
        percentage: 25,
      },
      {
        category: "divers" as const,
        label: "Terrassement & Fondations",
        estimatedCost: estimatedTotal * 0.05,
        percentage: 5,
      },
    ];

    const costEstimate = {
      totalCost: estimatedTotal,
      costPerSquareMeter: baseCostPerM2,
      currency: "TND",
      breakdown,
      contingencyBuffer: estimatedTotal * 0.1,
      contingencyPercentage: 10,
    };

    await ctx.db.patch(args.projectId, {
      status: "completed" as const,
      aiAnalysis: analysis,
      costEstimate,
      landArea,
      builtArea,
      optimizationTips: [
        "Utiliser des matériaux locaux pour réduire les coûts de transport",
        "Optimiser la conception pour réduire les déchets de chantier",
        "Envisager l'isolation thermique pour réduire les coûts énergétiques futurs",
        "Grouper les commandes de matériaux pour obtenir des remises sur volume",
      ],
      technicalRecommendations: [
        "Prévoir une étude de sol avant le début des travaux",
        "Assurer une bonne ventilation naturelle dans toutes les pièces",
        "Utiliser des enduits extérieurs respirants pour la façade",
        "Prévoir un système de récupération des eaux pluviales",
      ],
      updatedAt: Date.now(),
    });
  },
});
