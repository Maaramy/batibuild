import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// ============================================================================
// User Roles & Subscription Plans
// ============================================================================

export const ROLES = {
  ADMIN: "admin",
  USER: "user",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
);
export type Role = Infer<typeof roleValidator>;

export const SUBSCRIPTION_PLANS = {
  FREE: "free",
  PRO: "pro",
} as const;

export const subscriptionPlanValidator = v.union(
  v.literal(SUBSCRIPTION_PLANS.FREE),
  v.literal(SUBSCRIPTION_PLANS.PRO),
);
export type SubscriptionPlan = Infer<typeof subscriptionPlanValidator>;

// ============================================================================
// Tunisian Regions (Gouvernorats)
// ============================================================================

export const TUNISIA_REGIONS = [
  "tunis",
  "ariana",
  "ben_arous",
  "manouba",
  "nabeul",
  "zaghouan",
  "bizerte",
  "beja",
  "jendouba",
  "le_kef",
  "siliana",
  "kairouan",
  "kasserine",
  "sidi_bouzid",
  "sousse",
  "monastir",
  "mahdia",
  "sfax",
  "gabes",
  "medenine",
  "tataouine",
  "gafsa",
  "tozeur",
  "kebili",
] as const;

export const regionValidator = v.union(
  ...TUNISIA_REGIONS.map((r) => v.literal(r)),
);
export type TunisiaRegion = (typeof TUNISIA_REGIONS)[number];

export const REGION_LABELS: Record<TunisiaRegion, string> = {
  tunis: "Tunis",
  ariana: "Ariana",
  ben_arous: "Ben Arous",
  manouba: "Manouba",
  nabeul: "Nabeul",
  zaghouan: "Zaghouan",
  bizerte: "Bizerte",
  beja: "Béja",
  jendouba: "Jendouba",
  le_kef: "Le Kef",
  siliana: "Siliana",
  kairouan: "Kairouan",
  kasserine: "Kasserine",
  sidi_bouzid: "Sidi Bouzid",
  sousse: "Sousse",
  monastir: "Monastir",
  mahdia: "Mahdia",
  sfax: "Sfax",
  gabes: "Gabès",
  medenine: "Médenine",
  tataouine: "Tataouine",
  gafsa: "Gafsa",
  tozeur: "Tozeur",
  kebili: "Kébili",
};

// ============================================================================
// Project Categories (40+ types)
// ============================================================================

export const PROJECT_CATEGORIES = [
  "maison",
  "maison_r+1",
  "villa",
  "immeuble_residentiel",
  "piscine",
  "jardin",
  "amenagement_paysager",
  "garage",
  "cloture",
  "mur_de_separation",
  "cuisine_exterieure",
  "terrasse",
  "pergola",
  "toiture",
  "extension_batiment",
  "entrepot",
  "local_commercial",
  "bureau",
  "ferme",
  "serre_agricole",
  "parking",
  "aire_de_jeux",
  "mosquee",
  "ecole",
  "hotel",
  "restaurant",
  "cafe",
  "atelier",
  "usine",
  "depot",
  "installation_solaire",
  "chateau_d_eau",
  "systeme_irrigation",
  "route",
  "trottoir",
  "renovation_interieure",
  "renovation_salle_de_bain",
  "renovation_cuisine",
  "renovation_facade",
  "demolition",
  "installations_sanitaires",
  "installations_electricite",
] as const;

export const projectCategoryValidator = v.union(
  ...PROJECT_CATEGORIES.map((c) => v.literal(c)),
);
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export const PROJECT_STATUS = {
  DRAFT: "draft",
  ANALYZING: "analyzing",
  COMPLETED: "completed",
  ARCHIVED: "archived",
} as const;

export const projectStatusValidator = v.union(
  v.literal(PROJECT_STATUS.DRAFT),
  v.literal(PROJECT_STATUS.ANALYZING),
  v.literal(PROJECT_STATUS.COMPLETED),
  v.literal(PROJECT_STATUS.ARCHIVED),
);
export type ProjectStatus = Infer<typeof projectStatusValidator>;

// ============================================================================
// Material Categories for Cost Estimation
// ============================================================================

export const MATERIAL_CATEGORIES = [
  // BIM Macro-categories
  "gros_oeuvre",
  "second_oeuvre",
  "equipements",
  "main_oeuvre",
  "transport",
  "etudes_imprevus",
  // Traditional material categories
  "ciment",
  "sable",
  "gravier",
  "briques",
  "parpaings",
  "beton",
  "acier",
  "bois",
  "peinture",
  "carrelage",
  "marbre",
  "plomberie",
  "electricite",
  "portes",
  "fenetres",
  "toiture",
  "etancheite",
  "isolation",
  "revetements",
  "location_engins",
  "terrassement",
  "fondations",
  "finition",
  "divers",
] as const;

export const materialCategoryValidator = v.union(
  ...MATERIAL_CATEGORIES.map((c) => v.literal(c)),
);
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

// ============================================================================
// Schema Definition
// ============================================================================

const schema = defineSchema(
  {
    // Default auth tables from Convex Auth
    ...authTables,

    // Users table (extended from auth base)
    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
      subscriptionPlan: v.optional(subscriptionPlanValidator),
      subscriptionEndDate: v.optional(v.number()),
      phone: v.optional(v.string()),
      company: v.optional(v.string()),
      status: v.optional(v.union(v.literal("active"), v.literal("disabled"))),
      favoriteProjects: v.optional(v.array(v.id("projects"))),
      createdAt: v.optional(v.number()),
    })
      .index("email", ["email"])
      .index("subscriptionPlan", ["subscriptionPlan"]),

    // Projects
    projects: defineTable({
      userId: v.id("users"),
      name: v.string(),
      category: projectCategoryValidator,
      status: projectStatusValidator,
      description: v.optional(v.string()),
      region: v.optional(regionValidator),
      
      // Surface (unified field, in m²)
      surface: v.optional(v.number()),
      floors: v.optional(v.number()),
      
      // AI Analysis results
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
      
      // Cost estimation
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
      
      // Budget optimization suggestions
      optimizationTips: v.optional(v.array(v.string())),
      technicalRecommendations: v.optional(v.array(v.string())),
      
      // File references
      files: v.optional(
        v.array(
          v.object({
            name: v.string(),
            type: v.string(),
            url: v.optional(v.string()),
            storageId: v.optional(v.id("_storage")),
            size: v.optional(v.number()),
          }),
        ),
      ),
      
      // Manual input source data
      manualInput: v.optional(
        v.object({
          surface: v.optional(v.number()),
          floors: v.optional(v.number()),
          description: v.optional(v.string()),
        }),
      ),
      
      isFavorite: v.optional(v.boolean()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_status", ["userId", "status"])
      .index("by_category", ["category"])
      .index("by_favorite", ["userId", "isFavorite"]),

    // Material Prices (admin-managed database of Tunisian market prices)
    materialPrices: defineTable({
      category: materialCategoryValidator,
      name: v.string(),
      nameAr: v.optional(v.string()),
      nameFr: v.optional(v.string()),
      unit: v.string(),
      unitPrice: v.number(),
      currency: v.string(),
      region: v.optional(v.string()),
      lastUpdated: v.number(),
      updatedBy: v.id("users"),
      notes: v.optional(v.string()),
    })
      .index("by_category", ["category"])
      .index("by_name", ["name"]),

    // Project Reports
    reports: defineTable({
      projectId: v.id("projects"),
      userId: v.id("users"),
      type: v.union(v.literal("pdf"), v.literal("excel"), v.literal("csv")),
      generatedAt: v.number(),
      url: v.optional(v.string()),
      storageId: v.optional(v.id("_storage")),
      size: v.optional(v.number()),
    })
      .index("by_project", ["projectId"])
      .index("by_user", ["userId"]),

    // Notifications
    notifications: defineTable({
      userId: v.id("users"),
      type: v.union(
        v.literal("project_completed"),
        v.literal("price_update"),
        v.literal("subscription"),
        v.literal("report_ready"),
        v.literal("system"),
      ),
      title: v.string(),
      message: v.string(),
      read: v.boolean(),
      link: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_read", ["userId", "read"]),

    // Subscriptions & Payments
    subscriptions: defineTable({
      userId: v.id("users"),
      plan: subscriptionPlanValidator,
      status: v.union(
        v.literal("active"),
        v.literal("canceled"),
        v.literal("expired"),
        v.literal("pending"),
      ),
      startDate: v.number(),
      endDate: v.optional(v.number()),
      paymentMethod: v.optional(v.string()),
      paymentId: v.optional(v.string()),
      amount: v.optional(v.number()),
      currency: v.optional(v.string()),
      monthlyDownloadCount: v.optional(v.number()),
      downloadLimit: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"]),

    // Admin Action Logs
    adminLogs: defineTable({
      adminId: v.id("users"),
      adminName: v.optional(v.string()),
      action: v.union(
        v.literal("delete_user"),
        v.literal("batch_delete_users"),
        v.literal("toggle_user_status"),
        v.literal("update_user_role"),
        v.literal("update_user_plan"),
        v.literal("approve_subscription"),
        v.literal("reject_subscription"),
        v.literal("create_material"),
        v.literal("update_material"),
        v.literal("delete_material"),
      ),
      targetUserId: v.optional(v.id("users")),
      targetUserEmail: v.optional(v.string()),
      details: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_admin", ["adminId"])
      .index("by_action", ["action"])
      .index("by_created", ["createdAt"]),

    // Price History for tracking material price changes
    priceHistory: defineTable({
      materialPriceId: v.id("materialPrices"),
      previousPrice: v.number(),
      newPrice: v.number(),
      changedBy: v.id("users"),
      changedAt: v.number(),
    }).index("by_material", ["materialPriceId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
