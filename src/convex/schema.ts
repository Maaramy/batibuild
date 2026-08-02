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
  EXPERT: "expert",
} as const;

export const subscriptionPlanValidator = v.union(
  v.literal(SUBSCRIPTION_PLANS.FREE),
  v.literal(SUBSCRIPTION_PLANS.PRO),
  v.literal(SUBSCRIPTION_PLANS.EXPERT),
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
// Supplier Specialties (for registered supplier profiles)
// ============================================================================

export const SUPPLIER_SPECIALTIES = [
  "construction_maisons",
  "villas",
  "immeubles",
  "piscines",
  "jardins",
  "terrassement",
  "fondations",
  "gros_oeuvre",
  "second_oeuvre",
  "macconnerie",
  "beton",
  "ferraillage",
  "coffrage",
  "charpente",
  "toiture",
  "etancheite",
  "isolation",
  "carrelage",
  "marbre",
  "peinture",
  "electricite",
  "plomberie",
  "climatisation",
  "cuisine",
  "salle_de_bain",
  "aluminium",
  "menuserie_bois",
  "pvc",
  "portes",
  "fenetres",
  "energie_solaire",
  "domotique",
  "voirie",
  "demolition",
  "transport_materiaux",
  "location_engins",
  "architecte",
  "bureau_etudes",
  "ingenieur",
  "geometre",
  "promoteur_immobilier",
] as const;

export const SUPPLIER_SPECIALTIES_LABELS: Record<string, string> = {
  construction_maisons: "Construction de maisons",
  villas: "Villas",
  immeubles: "Immeubles",
  piscines: "Piscines",
  jardins: "Jardins",
  terrassement: "Terrassement",
  fondations: "Fondations",
  gros_oeuvre: "Gros œuvre",
  second_oeuvre: "Second œuvre",
  macconnerie: "Maçonnerie",
  beton: "Béton",
  ferraillage: "Ferraillage",
  coffrage: "Coffrage",
  charpente: "Charpente",
  toiture: "Toiture",
  etancheite: "Étanchéité",
  isolation: "Isolation",
  carrelage: "Carrelage",
  marbre: "Marbre",
  peinture: "Peinture",
  electricite: "Électricité",
  plomberie: "Plomberie",
  climatisation: "Climatisation",
  cuisine: "Cuisine",
  salle_de_bain: "Salle de bain",
  aluminium: "Aluminium",
  menuserie_bois: "Menuiserie bois",
  pvc: "PVC",
  portes: "Portes",
  fenetres: "Fenêtres",
  energie_solaire: "Énergie solaire",
  domotique: "Domotique",
  voirie: "Voirie",
  demolition: "Démolition",
  transport_materiaux: "Transport de matériaux",
  location_engins: "Location d'engins",
  architecte: "Architecte",
  bureau_etudes: "Bureau d'études",
  ingenieur: "Ingénieur",
  geometre: "Géomètre",
  promoteur_immobilier: "Promoteur immobilier",
};

// Map supplier specialties to BIM provider types (for recommendations)
export const SPECIALTY_TO_PROVIDER_TYPE: Record<string, string[]> = {
  construction_maisons: ["entreprise_generale","macon"],
  villas: ["entreprise_generale","architecte"],
  immeubles: ["entreprise_generale","bureau_etudes","ingenieur_structure"],
  piscines: ["pisciniste"],
  jardins: ["paysagiste"],
  terrassement: ["terrassement"],
  fondations: ["terrassement","entreprise_generale"],
  gros_oeuvre: ["entreprise_generale","macon","coffreur","ferrailleur"],
  second_oeuvre: ["carreleur","peintre","platrier"],
  macconnerie: ["macon"],
  beton: ["beton_ready"],
  ferraillage: ["ferrailleur"],
  coffrage: ["coffreur"],
  charpente: ["menuisier_bois"],
  toiture: ["etancheite","menuisier_bois"],
  etancheite: ["etancheite"],
  isolation: ["etancheite","platrier"],
  carrelage: ["carreleur"],
  marbre: ["marbrier"],
  peinture: ["peintre"],
  electricite: ["electricien"],
  plomberie: ["plombier"],
  climatisation: ["climatisation"],
  cuisine: ["cuisine"],
  salle_de_bain: ["sanitaire","carreleur","plombier"],
  aluminium: ["menuisier_aluminium"],
  menuserie_bois: ["menuisier_bois"],
  pvc: ["menuisier_aluminium"],
  portes: ["portes_fenetres"],
  fenetres: ["portes_fenetres","vitrier"],
  energie_solaire: ["solaire"],
  domotique: ["electricien"],
  voirie: ["terrassement"],
  demolition: ["demolition"],
  transport_materiaux: ["transporteur"],
  location_engins: ["location_engins"],
  architecte: ["architecte"],
  bureau_etudes: ["bureau_etudes"],
  ingenieur: ["ingenieur_structure"],
  geometre: ["bureau_etudes"],
  promoteur_immobilier: ["promoteur"],
};

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
      
      // Provider recommendations (real Tunisian companies)
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
              // Real company contacts
              suppliers: v.optional(
                v.array(
                  v.object({
                    id: v.string(),
                    name: v.string(),
                    phone: v.string(),
                    email: v.optional(v.string()),
                    address: v.string(),
                    website: v.optional(v.string()),
                    description: v.optional(v.string()),
                    rating: v.optional(v.number()),
                  })
                )
              ),
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

      // Budget optimization suggestions
      optimizationTips: v.optional(v.array(v.string())),
      technicalRecommendations: v.optional(v.array(v.string())),
      
      // Predictive intelligence (Pro/Expert) — AI price forecasts & buying advice
      predictiveInsights: v.optional(
        v.object({
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
        })
      ),
      
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
      paymentProofStorageId: v.optional(v.id("_storage")),
      paymentProofUrl: v.optional(v.string()),
      paymentProofFileName: v.optional(v.string()),
      paymentProofUploadedAt: v.optional(v.number()),
      paymentProofVerified: v.optional(v.boolean()),
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
        v.literal("approve_supplier_subscription"),
        v.literal("reject_supplier_subscription"),
        v.literal("verify_supplier_receipt"),
        v.literal("unverify_supplier_receipt"),
        v.literal("delete_subscription_receipt"),
        v.literal("delete_supplier_receipt"),
        v.literal("storage_purge"),
        v.literal("create_material"),
        v.literal("update_material"),
        v.literal("delete_material"),
        v.literal("bim_refresh"),
        v.literal("bim_save"),
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

    // Supplier Profiles (registered by companies)
    supplierProfiles: defineTable({
      userId: v.id("users"),
      companyName: v.string(),
      phone: v.string(),
      email: v.string(),
      address: v.string(),
      website: v.optional(v.string()),
      description: v.optional(v.string()),
      logo: v.optional(v.string()),
      specialties: v.array(v.string()),
      regions: v.array(v.string()),
      plan: v.union(
        v.literal("trial"),
        v.literal("monthly"),
        v.literal("none")
      ),
      subscriptionStatus: v.union(
        v.literal("active"),
        v.literal("trial"),
        v.literal("inactive"),
        v.literal("expired"),
        v.literal("pending")
      ),
      trialStartDate: v.optional(v.number()),
      subscriptionStartDate: v.optional(v.number()),
      subscriptionEndDate: v.optional(v.number()),
      // Payment proof (same procedure as Pro/Expert plans)
      paymentMethod: v.optional(v.union(v.literal("bank_transfer"), v.literal("d17"))),
      paymentAmount: v.optional(v.number()),
      paymentCurrency: v.optional(v.string()),
      paymentProofStorageId: v.optional(v.id("_storage")),
      paymentProofUrl: v.optional(v.string()),
      paymentProofFileName: v.optional(v.string()),
      paymentProofUploadedAt: v.optional(v.number()),
      paymentProofVerified: v.optional(v.boolean()),
      isVisible: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_specialties", ["specialties"])
      .index("by_subscription", ["subscriptionStatus"]),

    // Payment Configuration (bank transfer & D17 details)
    paymentConfig: defineTable({
      // Bank transfer
      bankName: v.string(),
      bankTitulaire: v.string(),
      bankRib: v.string(),
      bankIban: v.string(),
      bankSwift: v.string(),
      // D17
      d17MerchantName: v.string(),
      d17Phone: v.string(),
      d17Email: v.string(),
      d17Notice: v.string(),
      // Common
      proPrice: v.number(),
      supplierPrice: v.number(),
      expertPrice: v.optional(v.number()),
      currency: v.string(),
      // Prices (Free is always 0)
      // Project plan limits
      freeProjectLimit: v.optional(v.number()),
      proProjectLimit: v.optional(v.number()),
      expertProjectLimit: v.optional(v.number()),
      // Download limits per plan
      freeDownloadLimit: v.optional(v.number()),
      proDownloadLimit: v.optional(v.number()),
      expertDownloadLimit: v.optional(v.number()),
      updatedAt: v.number(),
      updatedBy: v.id("users"),
    }).index("by_updated", ["updatedAt"]),

    // BIM Configuration (editable by admin — Tunisian market price overrides)
    bimConfig: defineTable({
      // JSON-serialized BIM engine pricing data
      marketPricesM2: v.string(),
      projectPercentages: v.string(),
      regionMultipliers: v.string(),
      unitPrices: v.string(),
      // Metadata
      version: v.number(),
      refreshedAt: v.number(),
      refreshedBy: v.id("users"),
    }).index("by_refreshed", ["refreshedAt"]),

    // SEO Configuration (editable by admin)
    seoConfig: defineTable({
      siteName: v.string(),
      siteDescription: v.string(),
      keywords: v.string(),
      ogTitle: v.string(),
      ogDescription: v.string(),
      ogImage: v.optional(v.string()),
      twitterCard: v.optional(v.string()),
      canonicalUrl: v.optional(v.string()),
      googleAnalyticsId: v.optional(v.string()),
      robotsTxt: v.optional(v.string()),
      additionalMetaTags: v.optional(v.string()),
      googleSiteVerification: v.optional(v.string()),
      updatedAt: v.number(),
      updatedBy: v.id("users"),
    }).index("by_updated", ["updatedAt"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
