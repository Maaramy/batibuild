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
// Tunisian Construction Prices 2026 (TND)
// ============================================================================

const PRICES_2026 = {
  cement: { bag42_5: 15, bag32_5: 12.5 },
  sand: { construction: 20, fine: 18 },
  gravel: { "15_25mm": 35, "8_15mm": 32 },
  bricks: { hollow_10: 0.9, hollow_15: 1.3, hourdis_16: 1.5, "noot_6": 0.35 },
  concrete: { "ready_mix_250": 180, "ready_mix_300": 210, "ready_mix_350": 240 },
  steel: { "t6_bar": 2650, "t8_bar": 3200, "t10_bar": 3800, "t12_ton": 3400, "t14_ton": 3500 },
  wood: { formwork_m3: 650, framing_m3: 750 },
  paint: { "interior_l": 22, "exterior_l": 28, "primer_l": 15 },
  tiles: { "floor_m2": 35, "wall_m2": 28, "marble_m2": 85, "granite_m2": 120 },
  plumbing: { "pvc_110": 12, "pvc_50": 6, "copper_m": 18, geyser: 450, wc: 280, lavabo: 150 },
  electrical: { "cable_1_5_m": 1.2, "cable_2_5_m": 2, "cable_6_m": 4, breaker: 45, panel: 180, "led_light": 35, socket: 8, switch: 6 },
  doors: { simple: 350, "double": 650, metal: 500, garage: 1200 },
  windows: { "alu_simple": 450, "alu_double": 650, pvc: 550, "iron_grille": 200 },
  roofing: { "tile_m2": 15, "steel_sheet_m2": 25, "waterproof_m2": 18, "insulation_m2": 22 },
  labor: { "worker_day": 55, "mason_day": 70, "electrician_day": 65, "plumber_day": 65 },
  transport: { "truck_trip": 150, "mixer_m3": 25 },
  equipment: { "excavator_day": 250, "compactor_day": 180, "mixer_day": 80 },
  finishing: { "plaster_m2": 8, "stucco_m2": 12, "tiling_m2": 15, "painting_m2": 6 },
};

// ============================================================================
// Category-specific material calculators
// ============================================================================

function getResidentialBreakdown(surface: number, floors: number) {
  const totalBuilt = surface * (floors || 1);
  const cementQty = Math.round(totalBuilt * 4.2);
  const sandQty = Math.round(totalBuilt * 0.6);
  const gravelQty = Math.round(totalBuilt * 0.4);
  const steelQty = Math.round(totalBuilt * 1.5 * 100) / 100;
  const brickQty = Math.round(totalBuilt * 65);
  const hourdisQty = Math.round(totalBuilt * 8.5);
  const concreteQty = Math.round(totalBuilt * 0.35 * 100) / 100;
  const woodQty = Math.round(totalBuilt * 0.08 * 100) / 100;
  const tileQty = Math.round(totalBuilt * 0.7);
  const paintLiters = Math.round(totalBuilt * 0.4);
  const doorCount = Math.round(totalBuilt / 35);
  const windowCount = Math.round(totalBuilt / 25);
  const copperMeters = Math.round(totalBuilt * 0.3);
  const cableMeters = Math.round(totalBuilt * 4);

  const totalCost = Math.round(
    cementQty * PRICES_2026.cement.bag42_5 +
    sandQty * PRICES_2026.sand.construction +
    gravelQty * PRICES_2026.gravel["15_25mm"] +
    steelQty * PRICES_2026.steel.t12_ton +
    brickQty * PRICES_2026.bricks.hollow_10 +
    hourdisQty * PRICES_2026.bricks.hourdis_16 +
    concreteQty * PRICES_2026.concrete.ready_mix_300 +
    woodQty * PRICES_2026.wood.formwork_m3 +
    tileQty * PRICES_2026.tiles.floor_m2 +
    paintLiters * PRICES_2026.paint.interior_l +
    doorCount * PRICES_2026.doors.simple +
    windowCount * PRICES_2026.windows.alu_simple +
    copperMeters * PRICES_2026.plumbing.copper_m +
    cableMeters * PRICES_2026.electrical.cable_2_5_m +
    totalBuilt * 0.7 * PRICES_2026.roofing.tile_m2 +
    totalBuilt * PRICES_2026.roofing.waterproof_m2 +
    totalBuilt * PRICES_2026.roofing.insulation_m2 +
    0
  );

  const laborCost = Math.round(totalBuilt * 380);
  const grandTotal = totalCost + laborCost;
  const breakdownTotal = grandTotal;

  return {
    breakdown: [
      {
        category: "ciment" as const,
        label: "Ciment",
        estimatedCost: Math.round(cementQty * PRICES_2026.cement.bag42_5),
        percentage: Math.round((cementQty * PRICES_2026.cement.bag42_5 / breakdownTotal) * 100),
        items: [
          { name: "Ciment CPJ 42.5 (Sac 50kg)", quantity: cementQty, unit: "sacs", unitPrice: PRICES_2026.cement.bag42_5, totalPrice: Math.round(cementQty * PRICES_2026.cement.bag42_5) },
          { name: "Ciment CPJ 32.5 (Maçonnerie)", quantity: Math.round(cementQty * 0.3), unit: "sacs", unitPrice: PRICES_2026.cement.bag32_5, totalPrice: Math.round(cementQty * 0.3 * PRICES_2026.cement.bag32_5) },
        ],
      },
      {
        category: "sable" as const,
        label: "Sable & Gravier",
        estimatedCost: Math.round(sandQty * PRICES_2026.sand.construction + gravelQty * PRICES_2026.gravel["15_25mm"]),
        percentage: Math.round(((sandQty * PRICES_2026.sand.construction + gravelQty * PRICES_2026.gravel["15_25mm"]) / breakdownTotal) * 100),
        items: [
          { name: "Sable de construction (0/4)", quantity: sandQty, unit: "m³", unitPrice: PRICES_2026.sand.construction, totalPrice: Math.round(sandQty * PRICES_2026.sand.construction) },
          { name: "Gravier (15/25mm)", quantity: gravelQty, unit: "m³", unitPrice: PRICES_2026.gravel["15_25mm"], totalPrice: Math.round(gravelQty * PRICES_2026.gravel["15_25mm"]) },
          { name: "Sable fin (enduit)", quantity: Math.round(sandQty * 0.2), unit: "m³", unitPrice: PRICES_2026.sand.fine, totalPrice: Math.round(sandQty * 0.2 * PRICES_2026.sand.fine) },
        ],
      },
      {
        category: "acier" as const,
        label: "Acier & Fer",
        estimatedCost: Math.round(steelQty * PRICES_2026.steel.t12_ton),
        percentage: Math.round((steelQty * PRICES_2026.steel.t12_ton / breakdownTotal) * 100),
        items: [
          { name: "Acier à béton T12 (en tonnes)", quantity: steelQty, unit: "tonnes", unitPrice: PRICES_2026.steel.t12_ton, totalPrice: Math.round(steelQty * PRICES_2026.steel.t12_ton) },
          { name: "Acier T6 (fers de répartition)", quantity: Math.round(steelQty * 0.3), unit: "tonnes", unitPrice: PRICES_2026.steel.t6_bar / 6, totalPrice: Math.round(steelQty * 0.3 * PRICES_2026.steel.t6_bar / 6) },
          { name: "Treillis soudé ST25", quantity: Math.round(totalBuilt * 0.15), unit: "m²", unitPrice: 12, totalPrice: Math.round(totalBuilt * 0.15 * 12) },
        ],
      },
      {
        category: "briques" as const,
        label: "Briques & Hourdis",
        estimatedCost: Math.round(brickQty * PRICES_2026.bricks.hollow_10 + hourdisQty * PRICES_2026.bricks.hourdis_16),
        percentage: Math.round(((brickQty * PRICES_2026.bricks.hollow_10 + hourdisQty * PRICES_2026.bricks.hourdis_16) / breakdownTotal) * 100),
        items: [
          { name: "Brique creuse 10cm", quantity: brickQty, unit: "unités", unitPrice: PRICES_2026.bricks.hollow_10, totalPrice: Math.round(brickQty * PRICES_2026.bricks.hollow_10) },
          { name: "Brique creuse 15cm", quantity: Math.round(brickQty * 0.15), unit: "unités", unitPrice: PRICES_2026.bricks.hollow_15, totalPrice: Math.round(brickQty * 0.15 * PRICES_2026.bricks.hollow_15) },
          { name: "Hourdis 16x50", quantity: hourdisQty, unit: "unités", unitPrice: PRICES_2026.bricks.hourdis_16, totalPrice: Math.round(hourdisQty * PRICES_2026.bricks.hourdis_16) },
        ],
      },
      {
        category: "beton" as const,
        label: "Béton prêt à l'emploi",
        estimatedCost: Math.round(concreteQty * PRICES_2026.concrete.ready_mix_300),
        percentage: Math.round((concreteQty * PRICES_2026.concrete.ready_mix_300 / breakdownTotal) * 100),
        items: [
          { name: "Béton dosé à 300 kg/m³", quantity: concreteQty, unit: "m³", unitPrice: PRICES_2026.concrete.ready_mix_300, totalPrice: Math.round(concreteQty * PRICES_2026.concrete.ready_mix_300) },
          { name: "Béton dosé à 250 kg/m³ (fondations)", quantity: Math.round(concreteQty * 0.25), unit: "m³", unitPrice: PRICES_2026.concrete.ready_mix_250, totalPrice: Math.round(concreteQty * 0.25 * PRICES_2026.concrete.ready_mix_250) },
        ],
      },
      {
        category: "bois" as const,
        label: "Bois & Coffrage",
        estimatedCost: Math.round(woodQty * PRICES_2026.wood.formwork_m3),
        percentage: Math.round((woodQty * PRICES_2026.wood.formwork_m3 / breakdownTotal) * 100),
        items: [
          { name: "Bois de coffrage (planches)", quantity: woodQty, unit: "m³", unitPrice: PRICES_2026.wood.formwork_m3, totalPrice: Math.round(woodQty * PRICES_2026.wood.formwork_m3) },
          { name: "Bois de charpente", quantity: Math.round(woodQty * 0.25), unit: "m³", unitPrice: PRICES_2026.wood.framing_m3, totalPrice: Math.round(woodQty * 0.25 * PRICES_2026.wood.framing_m3) },
        ],
      },
      {
        category: "carrelage" as const,
        label: "Carrelage & Revêtements",
        estimatedCost: Math.round(tileQty * PRICES_2026.tiles.floor_m2 + tileQty * 0.3 * PRICES_2026.tiles.wall_m2),
        percentage: Math.round(((tileQty * PRICES_2026.tiles.floor_m2 + tileQty * 0.3 * PRICES_2026.tiles.wall_m2) / breakdownTotal) * 100),
        items: [
          { name: "Carrelage sol (grès cérame)", quantity: tileQty, unit: "m²", unitPrice: PRICES_2026.tiles.floor_m2, totalPrice: Math.round(tileQty * PRICES_2026.tiles.floor_m2) },
          { name: "Carrelage mural (faïence)", quantity: Math.round(tileQty * 0.3), unit: "m²", unitPrice: PRICES_2026.tiles.wall_m2, totalPrice: Math.round(tileQty * 0.3 * PRICES_2026.tiles.wall_m2) },
          { name: "Plinthe en céramique", quantity: Math.round(totalBuilt * 0.4), unit: "ml", unitPrice: 8, totalPrice: Math.round(totalBuilt * 0.4 * 8) },
        ],
      },
      {
        category: "peinture" as const,
        label: "Peinture & Enduits",
        estimatedCost: Math.round(paintLiters * PRICES_2026.paint.interior_l + paintLiters * 0.3 * PRICES_2026.paint.exterior_l),
        percentage: Math.round(((paintLiters * PRICES_2026.paint.interior_l + paintLiters * 0.3 * PRICES_2026.paint.exterior_l) / breakdownTotal) * 100),
        items: [
          { name: "Peinture intérieure mate", quantity: paintLiters, unit: "litres", unitPrice: PRICES_2026.paint.interior_l, totalPrice: Math.round(paintLiters * PRICES_2026.paint.interior_l) },
          { name: "Peinture extérieure acrylique", quantity: Math.round(paintLiters * 0.3), unit: "litres", unitPrice: PRICES_2026.paint.exterior_l, totalPrice: Math.round(paintLiters * 0.3 * PRICES_2026.paint.exterior_l) },
          { name: "Sous-couche d'accrochage", quantity: Math.round(paintLiters * 0.2), unit: "litres", unitPrice: PRICES_2026.paint.primer_l, totalPrice: Math.round(paintLiters * 0.2 * PRICES_2026.paint.primer_l) },
          { name: "Enduit de lissage (poudre)", quantity: Math.round(totalBuilt * 2.5), unit: "kg", unitPrice: 1.5, totalPrice: Math.round(totalBuilt * 2.5 * 1.5) },
        ],
      },
      {
        category: "plomberie" as const,
        label: "Plomberie & Sanitaire",
        estimatedCost: Math.round(copperMeters * PRICES_2026.plumbing.copper_m + doorCount * PRICES_2026.plumbing.wc + doorCount * PRICES_2026.plumbing.geyser * 0.3),
        percentage: Math.round(((copperMeters * PRICES_2026.plumbing.copper_m + doorCount * PRICES_2026.plumbing.wc + doorCount * PRICES_2026.plumbing.geyser * 0.3) / breakdownTotal) * 100),
        items: [
          { name: "Tuyau cuivre Ø14", quantity: copperMeters, unit: "ml", unitPrice: PRICES_2026.plumbing.copper_m, totalPrice: Math.round(copperMeters * PRICES_2026.plumbing.copper_m) },
          { name: "Tuyau PVC Ø110 (évacuation)", quantity: Math.round(copperMeters * 0.2), unit: "ml", unitPrice: PRICES_2026.plumbing.pvc_110, totalPrice: Math.round(copperMeters * 0.2 * PRICES_2026.plumbing.pvc_110) },
          { name: "WC complet avec réservoir", quantity: Math.round(Math.max(1, doorCount * 0.4)), unit: "unités", unitPrice: PRICES_2026.plumbing.wc, totalPrice: Math.round(Math.max(1, doorCount * 0.4) * PRICES_2026.plumbing.wc) },
          { name: "Lavabo avec robinetterie", quantity: Math.round(Math.max(1, doorCount * 0.3)), unit: "unités", unitPrice: PRICES_2026.plumbing.lavabo, totalPrice: Math.round(Math.max(1, doorCount * 0.3) * PRICES_2026.plumbing.lavabo) },
          { name: "Chauffe-eau 100L", quantity: Math.max(1, Math.round(doorCount * 0.3)), unit: "unités", unitPrice: PRICES_2026.plumbing.geyser, totalPrice: Math.max(1, Math.round(doorCount * 0.3)) * PRICES_2026.plumbing.geyser },
        ],
      },
      {
        category: "electricite" as const,
        label: "Électricité",
        estimatedCost: Math.round(cableMeters * PRICES_2026.electrical.cable_2_5_m + doorCount * PRICES_2026.electrical.breaker + doorCount * PRICES_2026.electrical.socket * 3),
        percentage: Math.round(((cableMeters * PRICES_2026.electrical.cable_2_5_m + doorCount * PRICES_2026.electrical.breaker + doorCount * PRICES_2026.electrical.socket * 3) / breakdownTotal) * 100),
        items: [
          { name: "Câble électrique 2.5mm²", quantity: cableMeters, unit: "ml", unitPrice: PRICES_2026.electrical.cable_2_5_m, totalPrice: Math.round(cableMeters * PRICES_2026.electrical.cable_2_5_m) },
          { name: "Câble électrique 1.5mm² (éclairage)", quantity: Math.round(cableMeters * 0.5), unit: "ml", unitPrice: PRICES_2026.electrical.cable_1_5_m, totalPrice: Math.round(cableMeters * 0.5 * PRICES_2026.electrical.cable_1_5_m) },
          { name: "Disjoncteur différentiel", quantity: Math.max(1, Math.round(doorCount * 0.5)), unit: "unités", unitPrice: PRICES_2026.electrical.breaker, totalPrice: Math.max(1, Math.round(doorCount * 0.5)) * PRICES_2026.electrical.breaker },
          { name: "Tableau électrique", quantity: 1, unit: "unité", unitPrice: PRICES_2026.electrical.panel, totalPrice: PRICES_2026.electrical.panel },
          { name: "Prises de courant", quantity: Math.max(4, doorCount * 3), unit: "unités", unitPrice: PRICES_2026.electrical.socket, totalPrice: Math.max(4, doorCount * 3) * PRICES_2026.electrical.socket },
          { name: "Interrupteurs", quantity: Math.max(3, doorCount * 2), unit: "unités", unitPrice: PRICES_2026.electrical.switch, totalPrice: Math.max(3, doorCount * 2) * PRICES_2026.electrical.switch },
          { name: "Luminaires LED", quantity: Math.max(2, doorCount * 2), unit: "unités", unitPrice: PRICES_2026.electrical.led_light, totalPrice: Math.max(2, doorCount * 2) * PRICES_2026.electrical.led_light },
        ],
      },
      {
        category: "portes" as const,
        label: "Portes",
        estimatedCost: Math.round(doorCount * PRICES_2026.doors.simple + 1 * PRICES_2026.doors.metal),
        percentage: Math.round(((doorCount * PRICES_2026.doors.simple + PRICES_2026.doors.metal) / breakdownTotal) * 100),
        items: [
          { name: "Porte intérieure en bois", quantity: doorCount, unit: "unités", unitPrice: PRICES_2026.doors.simple, totalPrice: Math.round(doorCount * PRICES_2026.doors.simple) },
          { name: "Porte d'entrée métallique", quantity: 1, unit: "unité", unitPrice: PRICES_2026.doors.metal, totalPrice: PRICES_2026.doors.metal },
        ],
      },
      {
        category: "fenetres" as const,
        label: "Fenêtres & Menuiseries",
        estimatedCost: Math.round(windowCount * PRICES_2026.windows.alu_simple + windowCount * PRICES_2026.windows.iron_grille),
        percentage: Math.round(((windowCount * PRICES_2026.windows.alu_simple + windowCount * PRICES_2026.windows.iron_grille) / breakdownTotal) * 100),
        items: [
          { name: "Fenêtre coulissante alu", quantity: windowCount, unit: "unités", unitPrice: PRICES_2026.windows.alu_simple, totalPrice: Math.round(windowCount * PRICES_2026.windows.alu_simple) },
          { name: "Grille de protection métallique", quantity: windowCount, unit: "unités", unitPrice: PRICES_2026.windows.iron_grille, totalPrice: Math.round(windowCount * PRICES_2026.windows.iron_grille) },
        ],
      },
      {
        category: "toiture" as const,
        label: "Toiture & Étanchéité",
        estimatedCost: Math.round(totalBuilt * 0.7 * PRICES_2026.roofing.tile_m2 + totalBuilt * PRICES_2026.roofing.waterproof_m2),
        percentage: Math.round(((totalBuilt * 0.7 * PRICES_2026.roofing.tile_m2 + totalBuilt * PRICES_2026.roofing.waterproof_m2) / breakdownTotal) * 100),
        items: [
          { name: "Tuile canal", quantity: Math.round(totalBuilt * 0.7), unit: "m²", unitPrice: PRICES_2026.roofing.tile_m2, totalPrice: Math.round(totalBuilt * 0.7 * PRICES_2026.roofing.tile_m2) },
          { name: "Étanchéité liquide (toiture-terrasse)", quantity: Math.round(totalBuilt * 0.3), unit: "m²", unitPrice: PRICES_2026.roofing.waterproof_m2, totalPrice: Math.round(totalBuilt * 0.3 * PRICES_2026.roofing.waterproof_m2) },
          { name: "Isolation thermique (polystyrène)", quantity: Math.round(totalBuilt * 0.7), unit: "m²", unitPrice: PRICES_2026.roofing.insulation_m2, totalPrice: Math.round(totalBuilt * 0.7 * PRICES_2026.roofing.insulation_m2) },
        ],
      },
      {
        category: "fondations" as const,
        label: "Terrassement & Fondations",
        estimatedCost: Math.round(totalBuilt * 12),
        percentage: Math.round((totalBuilt * 12 / breakdownTotal) * 100),
        items: [
          { name: "Fouilles en rigole", quantity: Math.round(totalBuilt * 0.15), unit: "m³", unitPrice: 18, totalPrice: Math.round(totalBuilt * 0.15 * 18) },
          { name: "Béton de propreté", quantity: Math.round(totalBuilt * 0.05), unit: "m³", unitPrice: 140, totalPrice: Math.round(totalBuilt * 0.05 * 140) },
          { name: "Sable de remblai", quantity: Math.round(totalBuilt * 0.1), unit: "m³", unitPrice: 15, totalPrice: Math.round(totalBuilt * 0.1 * 15) },
        ],
      },
      {
        category: "main_oeuvre" as const,
        label: "Main-d'œuvre",
        estimatedCost: laborCost,
        percentage: Math.round((laborCost / breakdownTotal) * 100),
        items: [
          { name: "Maçon (journalier)", quantity: Math.round(totalBuilt / 20), unit: "jours", unitPrice: PRICES_2026.labor.mason_day, totalPrice: Math.round(totalBuilt / 20 * PRICES_2026.labor.mason_day) },
          { name: "Manœuvre (journalier)", quantity: Math.round(totalBuilt / 15), unit: "jours", unitPrice: PRICES_2026.labor.worker_day, totalPrice: Math.round(totalBuilt / 15 * PRICES_2026.labor.worker_day) },
          { name: "Électricien", quantity: Math.round(totalBuilt / 80), unit: "jours", unitPrice: PRICES_2026.labor.electrician_day, totalPrice: Math.round(totalBuilt / 80 * PRICES_2026.labor.electrician_day) },
          { name: "Plombier", quantity: Math.round(totalBuilt / 100), unit: "jours", unitPrice: PRICES_2026.labor.plumber_day, totalPrice: Math.round(totalBuilt / 100 * PRICES_2026.labor.plumber_day) },
          { name: "Carreleur", quantity: Math.round(totalBuilt / 60), unit: "jours", unitPrice: PRICES_2026.labor.mason_day, totalPrice: Math.round(totalBuilt / 60 * PRICES_2026.labor.mason_day) },
        ],
      },
      {
        category: "location_engins" as const,
        label: "Location engins",
        estimatedCost: Math.round(totalBuilt * 8),
        percentage: Math.round((totalBuilt * 8 / breakdownTotal) * 100),
        items: [
          { name: "Pelleteuse (location)", quantity: Math.round(totalBuilt / 100), unit: "jours", unitPrice: PRICES_2026.equipment.excavator_day, totalPrice: Math.round(totalBuilt / 100 * PRICES_2026.equipment.excavator_day) },
          { name: "Bétonnière (location)", quantity: Math.round(totalBuilt / 50), unit: "jours", unitPrice: PRICES_2026.equipment.mixer_day, totalPrice: Math.round(totalBuilt / 50 * PRICES_2026.equipment.mixer_day) },
        ],
      },
      {
        category: "transport" as const,
        label: "Transport",
        estimatedCost: Math.round(totalBuilt * 5),
        percentage: Math.round((totalBuilt * 5 / breakdownTotal) * 100),
        items: [
          { name: "Transport de matériaux (camion)", quantity: Math.round(totalBuilt / 40), unit: "voyages", unitPrice: PRICES_2026.transport.truck_trip, totalPrice: Math.round(totalBuilt / 40 * PRICES_2026.transport.truck_trip) },
          { name: "Pompe à béton", quantity: concreteQty, unit: "m³", unitPrice: PRICES_2026.transport.mixer_m3, totalPrice: Math.round(concreteQty * PRICES_2026.transport.mixer_m3) },
        ],
      },
    ],
    totalCost: breakdownTotal,
    costPerM2: Math.round(breakdownTotal / (floors || 1)),
    features: {
      doorCount,
      windowCount,
      tileQty,
      paintLiters,
    },
  };
}

function getRenovationBreakdown(surface: number, floors: number) {
  const totalBuilt = surface * (floors || 1);
  const cementQty = Math.round(totalBuilt * 1.5);
  const sandQty = Math.round(totalBuilt * 0.3);
  const tileQty = Math.round(totalBuilt * 0.6);
  const paintLiters = Math.round(totalBuilt * 0.5);
  const doorCount = Math.round(totalBuilt / 50);

  const wallPaintArea = totalBuilt * 3.5;
  const totalCost = Math.round(
    cementQty * PRICES_2026.cement.bag42_5 +
    sandQty * PRICES_2026.sand.construction +
    tileQty * PRICES_2026.tiles.floor_m2 +
    paintLiters * PRICES_2026.paint.interior_l +
    doorCount * PRICES_2026.doors.simple +
    wallPaintArea * (PRICES_2026.finishing.painting_m2 + PRICES_2026.finishing.plaster_m2)
  );
  const laborCost = Math.round(totalBuilt * 180);
  const breakdownTotal = totalCost + laborCost;

  return {
    breakdown: [
      {
        category: "ciment" as const, label: "Ciment & Mortier",
        estimatedCost: Math.round(cementQty * PRICES_2026.cement.bag42_5),
        percentage: Math.round(cementQty * PRICES_2026.cement.bag42_5 / breakdownTotal * 100),
        items: [{ name: "Ciment CPJ 42.5", quantity: cementQty, unit: "sacs", unitPrice: PRICES_2026.cement.bag42_5, totalPrice: Math.round(cementQty * PRICES_2026.cement.bag42_5) }],
      },
      {
        category: "carrelage" as const, label: "Carrelage & Revêtements",
        estimatedCost: Math.round(tileQty * PRICES_2026.tiles.floor_m2),
        percentage: Math.round(tileQty * PRICES_2026.tiles.floor_m2 / breakdownTotal * 100),
        items: [
          { name: "Carrelage sol", quantity: tileQty, unit: "m²", unitPrice: PRICES_2026.tiles.floor_m2, totalPrice: Math.round(tileQty * PRICES_2026.tiles.floor_m2) },
          { name: "Collage + joint", quantity: tileQty, unit: "m²", unitPrice: 5, totalPrice: Math.round(tileQty * 5) },
        ],
      },
      {
        category: "peinture" as const, label: "Peinture & Finitions",
        estimatedCost: Math.round(paintLiters * PRICES_2026.paint.interior_l),
        percentage: Math.round(paintLiters * PRICES_2026.paint.interior_l / breakdownTotal * 100),
        items: [
          { name: "Peinture intérieure", quantity: paintLiters, unit: "litres", unitPrice: PRICES_2026.paint.interior_l, totalPrice: Math.round(paintLiters * PRICES_2026.paint.interior_l) },
          { name: "Enduit de rebouchage", quantity: Math.round(totalBuilt * 1.5), unit: "kg", unitPrice: 2, totalPrice: Math.round(totalBuilt * 1.5 * 2) },
        ],
      },
      {
        category: "electricite" as const, label: "Électricité",
        estimatedCost: Math.round(totalBuilt * 25),
        percentage: Math.round(totalBuilt * 25 / breakdownTotal * 100),
        items: [
          { name: "Câbles et gaines", quantity: Math.round(totalBuilt * 2), unit: "ml", unitPrice: 2.5, totalPrice: Math.round(totalBuilt * 2 * 2.5) },
          { name: "Prises et interrupteurs (rénovation)", quantity: Math.round(totalBuilt / 10), unit: "unités", unitPrice: 12, totalPrice: Math.round(totalBuilt / 10 * 12) },
        ],
      },
      {
        category: "plomberie" as const, label: "Plomberie",
        estimatedCost: Math.round(totalBuilt * 20),
        percentage: Math.round(totalBuilt * 20 / breakdownTotal * 100),
        items: [
          { name: "Tuyauterie PVC", quantity: Math.round(totalBuilt * 0.1), unit: "ml", unitPrice: 8, totalPrice: Math.round(totalBuilt * 0.1 * 8) },
          { name: "Robinets et mitigeurs", quantity: Math.round(Math.max(1, totalBuilt / 50)), unit: "unités", unitPrice: 60, totalPrice: Math.round(Math.max(1, totalBuilt / 50) * 60) },
        ],
      },
      {
        category: "portes" as const, label: "Portes",
        estimatedCost: Math.round(doorCount * PRICES_2026.doors.simple),
        percentage: Math.round(doorCount * PRICES_2026.doors.simple / breakdownTotal * 100),
        items: [{ name: "Porte intérieure", quantity: doorCount, unit: "unités", unitPrice: PRICES_2026.doors.simple, totalPrice: Math.round(doorCount * PRICES_2026.doors.simple) }],
      },
      {
        category: "main_oeuvre" as const, label: "Main-d'œuvre",
        estimatedCost: laborCost,
        percentage: Math.round(laborCost / breakdownTotal * 100),
        items: [
          { name: "Ouvrier polyvalent", quantity: Math.round(totalBuilt / 25), unit: "jours", unitPrice: PRICES_2026.labor.worker_day, totalPrice: Math.round(totalBuilt / 25 * PRICES_2026.labor.worker_day) },
          { name: "Plombier", quantity: Math.round(totalBuilt / 150), unit: "jours", unitPrice: PRICES_2026.labor.plumber_day, totalPrice: Math.round(totalBuilt / 150 * PRICES_2026.labor.plumber_day) },
          { name: "Électricien", quantity: Math.round(totalBuilt / 120), unit: "jours", unitPrice: PRICES_2026.labor.electrician_day, totalPrice: Math.round(totalBuilt / 120 * PRICES_2026.labor.electrician_day) },
        ],
      },
      {
        category: "divers" as const, label: "Démolition & Déblais",
        estimatedCost: Math.round(totalBuilt * 10),
        percentage: Math.round(totalBuilt * 10 / breakdownTotal * 100),
        items: [
          { name: "Démolition sélective", quantity: Math.round(totalBuilt * 0.1), unit: "m³", unitPrice: 25, totalPrice: Math.round(totalBuilt * 0.1 * 25) },
          { name: "Évacuation des déchets", quantity: Math.round(totalBuilt / 50), unit: "benne", unitPrice: 180, totalPrice: Math.round(totalBuilt / 50 * 180) },
        ],
      },
    ],
    totalCost: breakdownTotal,
    costPerM2: Math.round(breakdownTotal / (floors || 1)),
    features: { doorCount },
  };
}

function getPoolBreakdown(surface: number) {
  const cementQty = Math.round(surface * 8);
  const sandQty = Math.round(surface * 0.8);
  const steelQty = Math.round(surface * 0.7 * 100) / 100;
  const tileQty = Math.round(surface * 1.5);
  const totalCost = Math.round(
    cementQty * PRICES_2026.cement.bag42_5 +
    sandQty * PRICES_2026.sand.construction +
    steelQty * PRICES_2026.steel.t12_ton +
    tileQty * (PRICES_2026.tiles.wall_m2 + 15) +
    surface * PRICES_2026.roofing.waterproof_m2 * 3 +
    surface * 250
  );
  const laborCost = Math.round(surface * 250);
  const breakdownTotal = totalCost + laborCost;

  return {
    breakdown: [
      {
        category: "ciment" as const, label: "Ciment & Béton",
        estimatedCost: Math.round(cementQty * PRICES_2026.cement.bag42_5),
        percentage: Math.round(cementQty * PRICES_2026.cement.bag42_5 / breakdownTotal * 100),
        items: [
          { name: "Ciment CPJ 42.5", quantity: cementQty, unit: "sacs", unitPrice: PRICES_2026.cement.bag42_5, totalPrice: Math.round(cementQty * PRICES_2026.cement.bag42_5) },
          { name: "Béton projeté (gunite)", quantity: Math.round(surface * 0.5), unit: "m³", unitPrice: 250, totalPrice: Math.round(surface * 0.5 * 250) },
        ],
      },
      {
        category: "acier" as const, label: "Acier",
        estimatedCost: Math.round(steelQty * PRICES_2026.steel.t12_ton),
        percentage: Math.round(steelQty * PRICES_2026.steel.t12_ton / breakdownTotal * 100),
        items: [{ name: "Treillis soudé ST25", quantity: steelQty, unit: "tonnes", unitPrice: PRICES_2026.steel.t12_ton, totalPrice: Math.round(steelQty * PRICES_2026.steel.t12_ton) }],
      },
      {
        category: "carrelage" as const, label: "Revêtement piscine",
        estimatedCost: Math.round(tileQty * (PRICES_2026.tiles.wall_m2 + 15)),
        percentage: Math.round(tileQty * (PRICES_2026.tiles.wall_m2 + 15) / breakdownTotal * 100),
        items: [
          { name: "Carrelage piscine antidérapant", quantity: tileQty, unit: "m²", unitPrice: PRICES_2026.tiles.wall_m2 + 15, totalPrice: Math.round(tileQty * (PRICES_2026.tiles.wall_m2 + 15)) },
          { name: "Mosaïque piscine (liner)", quantity: Math.round(surface * 1.2), unit: "m²", unitPrice: 45, totalPrice: Math.round(surface * 1.2 * 45) },
        ],
      },
      {
        category: "etancheite" as const, label: "Étanchéité",
        estimatedCost: Math.round(surface * PRICES_2026.roofing.waterproof_m2 * 3),
        percentage: Math.round(surface * PRICES_2026.roofing.waterproof_m2 * 3 / breakdownTotal * 100),
        items: [{ name: "Revêtement d'étanchéité (résine)", quantity: Math.round(surface * 3), unit: "m²", unitPrice: PRICES_2026.roofing.waterproof_m2, totalPrice: Math.round(surface * 3 * PRICES_2026.roofing.waterproof_m2) }],
      },
      {
        category: "plomberie" as const, label: "Filtration & Plomberie",
        estimatedCost: Math.round(surface * 250),
        percentage: Math.round(surface * 250 / breakdownTotal * 100),
        items: [
          { name: "Système de filtration (pompe + filtre)", quantity: 1, unit: "forfait", unitPrice: 1500, totalPrice: 1500 },
          { name: "Tuyaux PVC Ø50 (skimmer)", quantity: Math.round(surface * 0.2), unit: "ml", unitPrice: 12, totalPrice: Math.round(surface * 0.2 * 12) },
        ],
      },
      {
        category: "main_oeuvre" as const, label: "Main-d'œuvre",
        estimatedCost: laborCost,
        percentage: Math.round(laborCost / breakdownTotal * 100),
        items: [
          { name: "Spécialiste piscine", quantity: Math.round(surface / 10), unit: "jours", unitPrice: PRICES_2026.labor.mason_day + 20, totalPrice: Math.round(surface / 10 * (PRICES_2026.labor.mason_day + 20)) },
          { name: "Manœuvre", quantity: Math.round(surface / 8), unit: "jours", unitPrice: PRICES_2026.labor.worker_day, totalPrice: Math.round(surface / 8 * PRICES_2026.labor.worker_day) },
        ],
      },
    ],
    totalCost: breakdownTotal,
    costPerM2: Math.round(breakdownTotal),
    features: {},
  };
}

function getLandscapingBreakdown(surface: number) {
  const soilQty = Math.round(surface * 0.3);
  const gravelQty = Math.round(surface * 0.1);
  const plantCount = Math.round(surface * 0.3);
  const totalCost = Math.round(
    soilQty * 35 +
    gravelQty * PRICES_2026.gravel["8_15mm"] +
    plantCount * 25 +
    surface * 0.5 * PRICES_2026.roofing.insulation_m2 +
    surface * 0.5 * PRICES_2026.tiles.floor_m2
  );
  const laborCost = Math.round(surface * 40);
  const breakdownTotal = totalCost + laborCost;

  return {
    breakdown: [
      {
        category: "divers" as const, label: "Terre & Végétaux",
        estimatedCost: Math.round(soilQty * 35 + plantCount * 25),
        percentage: Math.round((soilQty * 35 + plantCount * 25) / breakdownTotal * 100),
        items: [
          { name: "Terre végétale", quantity: soilQty, unit: "m³", unitPrice: 35, totalPrice: Math.round(soilQty * 35) },
          { name: "Plantes et arbustes", quantity: plantCount, unit: "unités", unitPrice: 25, totalPrice: Math.round(plantCount * 25) },
          { name: "Gazon en rouleau", quantity: Math.round(surface * 0.4), unit: "m²", unitPrice: 8, totalPrice: Math.round(surface * 0.4 * 8) },
        ],
      },
      {
        category: "gravier" as const, label: "Gravier & Décoration",
        estimatedCost: Math.round(gravelQty * PRICES_2026.gravel["8_15mm"]),
        percentage: Math.round(gravelQty * PRICES_2026.gravel["8_15mm"] / breakdownTotal * 100),
        items: [
          { name: "Gravier décoratif", quantity: gravelQty, unit: "m³", unitPrice: PRICES_2026.gravel["8_15mm"], totalPrice: Math.round(gravelQty * PRICES_2026.gravel["8_15mm"]) },
          { name: "Paillage décoratif", quantity: Math.round(surface * 0.1), unit: "m²", unitPrice: 12, totalPrice: Math.round(surface * 0.1 * 12) },
        ],
      },
      {
        category: "carrelage" as const, label: "Aménagement extérieur",
        estimatedCost: Math.round(surface * 0.3 * PRICES_2026.tiles.floor_m2),
        percentage: Math.round(surface * 0.3 * PRICES_2026.tiles.floor_m2 / breakdownTotal * 100),
        items: [
          { name: "Dalles de jardin", quantity: Math.round(surface * 0.3), unit: "m²", unitPrice: PRICES_2026.tiles.floor_m2, totalPrice: Math.round(surface * 0.3 * PRICES_2026.tiles.floor_m2) },
          { name: "Bordures en béton", quantity: Math.round(Math.sqrt(surface) * 2), unit: "ml", unitPrice: 12, totalPrice: Math.round(Math.sqrt(surface) * 2 * 12) },
        ],
      },
      {
        category: "main_oeuvre" as const, label: "Main-d'œuvre",
        estimatedCost: laborCost,
        percentage: Math.round(laborCost / breakdownTotal * 100),
        items: [
          { name: "Jardinier paysagiste", quantity: Math.round(surface / 20), unit: "jours", unitPrice: PRICES_2026.labor.mason_day, totalPrice: Math.round(surface / 20 * PRICES_2026.labor.mason_day) },
          { name: "Manœuvre", quantity: Math.round(surface / 15), unit: "jours", unitPrice: PRICES_2026.labor.worker_day, totalPrice: Math.round(surface / 15 * PRICES_2026.labor.worker_day) },
        ],
      },
    ],
    totalCost: breakdownTotal,
    costPerM2: Math.round(breakdownTotal),
    features: {},
  };
}

function getSolarBreakdown(surface: number) {
  const panelCount = Math.round(surface * 0.4);
  const batteryCount = Math.round(panelCount * 0.3);
  const totalCost = Math.round(
    panelCount * 600 +
    batteryCount * 2500 +
    1 * 3000 +
    panelCount * 50 +
    surface * 0.3 * 15
  );
  const laborCost = Math.round(panelCount * 150);
  const breakdownTotal = totalCost + laborCost;

  return {
    breakdown: [
      {
        category: "electricite" as const, label: "Panneaux solaires",
        estimatedCost: Math.round(panelCount * 600),
        percentage: Math.round(panelCount * 600 / breakdownTotal * 100),
        items: [{ name: "Panneau photovoltaïque 450Wc", quantity: panelCount, unit: "unités", unitPrice: 600, totalPrice: Math.round(panelCount * 600) }],
      },
      {
        category: "bois" as const, label: "Structure & Support",
        estimatedCost: Math.round(panelCount * 50 + surface * 0.3 * 15),
        percentage: Math.round((panelCount * 50 + surface * 0.3 * 15) / breakdownTotal * 100),
        items: [
          { name: "Support métallique (kit)", quantity: panelCount, unit: "unités", unitPrice: 50, totalPrice: Math.round(panelCount * 50) },
          { name: "Câble solaire spécifique", quantity: Math.round(surface * 0.3), unit: "ml", unitPrice: 15, totalPrice: Math.round(surface * 0.3 * 15) },
        ],
      },
      {
        category: "divers" as const, label: "Batteries & Onduleur",
        estimatedCost: Math.round(batteryCount * 2500 + 1 * 3000),
        percentage: Math.round((batteryCount * 2500 + 3000) / breakdownTotal * 100),
        items: [
          { name: "Batterie lithium 5kWh", quantity: batteryCount, unit: "unités", unitPrice: 2500, totalPrice: Math.round(batteryCount * 2500) },
          { name: "Onduleur hybride", quantity: 1, unit: "unité", unitPrice: 3000, totalPrice: 3000 },
        ],
      },
      {
        category: "main_oeuvre" as const, label: "Installation",
        estimatedCost: laborCost,
        percentage: Math.round(laborCost / breakdownTotal * 100),
        items: [{ name: "Installateur solaire", quantity: Math.round(panelCount / 5), unit: "jours", unitPrice: PRICES_2026.labor.electrician_day + 20, totalPrice: Math.round(panelCount / 5 * (PRICES_2026.labor.electrician_day + 20)) }],
      },
    ],
    totalCost: breakdownTotal,
    costPerM2: Math.round(breakdownTotal),
    features: { panelCount, batteryCount },
  };
}

function getTerraceBreakdown(surface: number) {
  const tileQty = Math.round(surface * 1.05);
  const cementQty = Math.round(surface * 1.5);
  const sandQty = Math.round(surface * 0.15);
  const totalCost = Math.round(
    tileQty * (PRICES_2026.tiles.floor_m2 + 10) +
    cementQty * PRICES_2026.cement.bag42_5 +
    sandQty * PRICES_2026.sand.construction +
    surface * PRICES_2026.roofing.waterproof_m2 +
    surface * 10
  );
  const laborCost = Math.round(surface * 45);
  const breakdownTotal = totalCost + laborCost;

  return {
    breakdown: [
      {
        category: "carrelage" as const, label: "Carrelage extérieur",
        estimatedCost: Math.round(tileQty * (PRICES_2026.tiles.floor_m2 + 10)),
        percentage: Math.round(tileQty * (PRICES_2026.tiles.floor_m2 + 10) / breakdownTotal * 100),
        items: [{ name: "Carrelage extérieur antidérapant", quantity: tileQty, unit: "m²", unitPrice: PRICES_2026.tiles.floor_m2 + 10, totalPrice: Math.round(tileQty * (PRICES_2026.tiles.floor_m2 + 10)) }],
      },
      {
        category: "ciment" as const, label: "Mortier & Chape",
        estimatedCost: Math.round(cementQty * PRICES_2026.cement.bag42_5 + sandQty * PRICES_2026.sand.construction),
        percentage: Math.round((cementQty * PRICES_2026.cement.bag42_5 + sandQty * PRICES_2026.sand.construction) / breakdownTotal * 100),
        items: [
          { name: "Ciment CPJ 42.5", quantity: cementQty, unit: "sacs", unitPrice: PRICES_2026.cement.bag42_5, totalPrice: Math.round(cementQty * PRICES_2026.cement.bag42_5) },
          { name: "Sable", quantity: sandQty, unit: "m³", unitPrice: PRICES_2026.sand.construction, totalPrice: Math.round(sandQty * PRICES_2026.sand.construction) },
        ],
      },
      {
        category: "etancheite" as const, label: "Étanchéité",
        estimatedCost: Math.round(surface * PRICES_2026.roofing.waterproof_m2),
        percentage: Math.round(surface * PRICES_2026.roofing.waterproof_m2 / breakdownTotal * 100),
        items: [{ name: "Revêtement d'étanchéité", quantity: Math.round(surface), unit: "m²", unitPrice: PRICES_2026.roofing.waterproof_m2, totalPrice: Math.round(surface * PRICES_2026.roofing.waterproof_m2) }],
      },
      {
        category: "main_oeuvre" as const, label: "Main-d'œuvre",
        estimatedCost: laborCost,
        percentage: Math.round(laborCost / breakdownTotal * 100),
        items: [
          { name: "Carreleur", quantity: Math.round(surface / 15), unit: "jours", unitPrice: PRICES_2026.labor.mason_day, totalPrice: Math.round(surface / 15 * PRICES_2026.labor.mason_day) },
          { name: "Manœuvre", quantity: Math.round(surface / 20), unit: "jours", unitPrice: PRICES_2026.labor.worker_day, totalPrice: Math.round(surface / 20 * PRICES_2026.labor.worker_day) },
        ],
      },
    ],
    totalCost: breakdownTotal,
    costPerM2: Math.round(breakdownTotal),
    features: {},
  };
}

// ============================================================================
// Category classifier
// ============================================================================

const RESIDENTIAL_CATEGORIES = ["maison", "maison_r+1", "villa", "immeuble_residentiel", "extension_batiment", "entrepot", "local_commercial", "bureau", "hotel", "mosquee", "ecole", "cafe", "restaurant"];
const RENOVATION_CATEGORIES = ["renovation_interieure", "renovation_salle_de_bain", "renovation_cuisine", "renovation_facade"];
const POOL_CATEGORIES = ["piscine"];
const LANDSCAPING_CATEGORIES = ["jardin", "amenagement_paysager", "aire_de_jeux", "cloture", "mur_de_separation", "parking"];
const SOLAR_CATEGORIES = ["installation_solaire"];
const TERRACE_CATEGORIES = ["terrasse", "pergola", "toiture"];

// ============================================================================
// Simulate Analysis (demo mode)
// ============================================================================

/** Generate a simulated AI analysis (demo mode) with category-specific materials and Tunisian 2026 prices */
export const simulateAnalysis = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;

    const project = await ctx.db.get(args.projectId);
    if (!project) return;

    const surface = project.surface || project.manualInput?.surface || 200;
    const floors = project.floors || 1;
    const cat = project.category;

    // Choose the right material calculator based on category
    let result: { breakdown: any[]; totalCost: number; costPerM2: number; features: Record<string, any> };

    if (RENOVATION_CATEGORIES.includes(cat)) {
      result = getRenovationBreakdown(surface, floors);
    } else if (POOL_CATEGORIES.includes(cat)) {
      result = getPoolBreakdown(surface);
    } else if (LANDSCAPING_CATEGORIES.includes(cat)) {
      result = getLandscapingBreakdown(surface);
    } else if (SOLAR_CATEGORIES.includes(cat)) {
      result = getSolarBreakdown(surface);
    } else if (TERRACE_CATEGORIES.includes(cat)) {
      result = getTerraceBreakdown(surface);
    } else {
      result = getResidentialBreakdown(surface, floors);
    }

    const contingencyBuffer = Math.round(result.totalCost * 0.1);
    const totalWithContingency = result.totalCost + contingencyBuffer;

    // AI Analysis object
    const analysis = {
      category: cat,
      confidence: 0.88,
      dimensions: {
        detected: true,
        estimatedLength: Math.round(Math.sqrt(surface) * 100) / 100,
        estimatedWidth: Math.round(Math.sqrt(surface) * 100) / 100,
        estimatedArea: surface,
      },
      features: [
        { type: "walls", detected: true, quantity: 4 },
        { type: "roof", detected: true, quantity: 1 },
        { type: "doors", detected: true, quantity: result.features.doorCount || Math.round(surface / 35) },
        { type: "windows", detected: true, quantity: result.features.windowCount || Math.round(surface / 25) },
        { type: "foundation", detected: true, quantity: 1 },
      ],
      anomalies: [],
      constructionMethods: cat.startsWith("renovation")
        ? ["rénovation partielle avec conservation des structures existantes"]
        : ["construction traditionnelle (parpaings et poutres)", "dalle pleine en béton armé"],
      estimatedDuration: cat.startsWith("renovation")
        ? `${Math.ceil(surface / 30)} mois`
        : `${Math.ceil(surface / 15)} mois`,
      laborEstimate: {
        totalWorkers: Math.ceil(surface / 25),
        totalDays: Math.ceil(surface / 8) * 22,
        estimatedCost: Math.round(result.totalCost * 0.35),
      },
      rawAnalysis: `Analyse du projet ${project.name}:\nType détecté: ${cat}\nSurface estimée: ${surface}m²\nNombre d'étages: ${floors}\nCoût total estimé: ${result.totalCost.toLocaleString("fr-TN")} TND\nCoût au m²: ${result.costPerM2.toLocaleString("fr-TN")} TND/m²\nDate des prix: Avril 2026\nSource: Base de données BuildEase Tunisie`,
    };

    const costEstimate = {
      totalCost: result.totalCost,
      costPerSquareMeter: result.costPerM2,
      currency: "TND",
      breakdown: result.breakdown,
      contingencyBuffer,
      contingencyPercentage: 10,
    };

    // Category-specific tips and recommendations
    const optimizationTips: string[] = [
      "Utiliser des matériaux locaux pour réduire les coûts de transport",
      "Grouper les commandes de matériaux pour obtenir des remises sur volume",
    ];
    if (cat.startsWith("renovation")) {
      optimizationTips.push("Conserver les cloisons existantes pour réduire les coûts de démolition", "Opter pour une rénovation énergétique pour des économies à long terme");
    } else if (POOL_CATEGORIES.includes(cat)) {
      optimizationTips.push("Optimiser la forme de la piscine pour réduire les surfaces de carrelage", "Utiliser un système de filtration à haute efficacité énergétique", "Envisager un chauffage solaire pour prolonger la saison de baignade");
    } else if (LANDSCAPING_CATEGORIES.includes(cat)) {
      optimizationTips.push("Choisir des plantes méditerranéennes nécessitant peu d'arrosage", "Utiliser des matériaux de récupération pour les bordures et allées");
    } else {
      optimizationTips.push("Optimiser la conception pour réduire les déchets de chantier", "Envisager l'isolation thermique pour réduire les coûts énergétiques futurs");
    }

    const technicalRecommendations: string[] = [
      "Prévoir une étude de sol avant le début des travaux",
    ];
    if (cat.startsWith("renovation")) {
      technicalRecommendations.push("Vérifier l'état des canalisations existantes avant travaux", "S'assurer de la conformité électrique aux normes en vigueur");
    } else if (POOL_CATEGORIES.includes(cat)) {
      technicalRecommendations.push("Prévoir un système de traitement de l'eau adapté", "Dimensionner la pompe en fonction du volume de la piscine");
    } else if (SOLAR_CATEGORIES.includes(cat)) {
      technicalRecommendations.push("Vérifier l'orientation et l'inclinaison optimales des panneaux", "Prévoir un espace suffisant pour le stockage des batteries");
    } else {
      technicalRecommendations.push("Assurer une bonne ventilation naturelle dans toutes les pièces", "Utiliser des enduits extérieurs respirants pour la façade");
    }

    await ctx.db.patch(args.projectId, {
      status: "completed" as const,
      aiAnalysis: analysis,
      costEstimate,
      surface,
      optimizationTips,
      technicalRecommendations,
      updatedAt: Date.now(),
    });
  },
});
