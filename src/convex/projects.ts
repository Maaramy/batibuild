import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import {
  projectCategoryValidator,
  projectStatusValidator,
  PROJECT_STATUS,
  materialCategoryValidator,
  regionValidator,
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
    region: v.optional(regionValidator),
    surface: v.optional(v.number()),
    floors: v.optional(v.number()),
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

// ============================================================================
// BIM Engine (professional cost estimation)
// ============================================================================

import { runBIMEstimation } from "./bimEngine";

// ============================================================================
// Simulate Analysis (BIM Professional Engine)
// ============================================================================

/** Generate a professional BIM analysis with Tunisian 2026 prices */
export const simulateAnalysis = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;

    const project = await ctx.db.get(args.projectId);
    if (!project) return;

    const surface = project.surface || project.manualInput?.surface || 150;
    const floors = project.floors || project.manualInput?.floors || 1;
    const category = project.category;
    const region = project.region;
    const finishLevel = (project as any).finish_level || "standard";

    const result = runBIMEstimation(category, surface, floors, region, finishLevel);

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
      aiAnalysis: result.aiAnalysis,
      optimizationTips: result.optimizationTips,
      technicalRecommendations: result.technicalRecommendations,
      updatedAt: Date.now(),
    });
  },
});
