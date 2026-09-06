import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";
import {
  analysisInputValidator,
  analysisResultsValidator,
  aiInsightsValidator,
} from "./investmentTypes";

// ============================================================================
// User Roles & Subscription Plans
// ============================================================================

export const ROLES = {
  ADMIN: "admin",
  MODERATOR: "moderator",
  USER: "user",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.MODERATOR),
  v.literal(ROLES.USER),
);
export type Role = Infer<typeof roleValidator>;

// Trois catégories d'offres : Client Pro (pro), Fournisseur (supplier), Expert (expert).
// « free » correspond à l'absence de forfait (aucun abonnement actif).
export const SUBSCRIPTION_PLANS = {
  FREE: "free",
  PRO: "pro", // Client Pro
  EXPERT: "expert",
} as const;

export const subscriptionPlanValidator = v.union(
  v.literal(SUBSCRIPTION_PLANS.FREE),
  v.literal(SUBSCRIPTION_PLANS.PRO),
  v.literal(SUBSCRIPTION_PLANS.EXPERT),
  v.literal("supplier"),
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
// Project Categories (11 types de bien unifiés)
// ============================================================================

// Catalogue officiel des types de bien (source : src/convex/projectTypes.ts),
// aligné sur le module Investissement (hors « Terrain constructible »).
// Les anciens types (maison R+1, rénovation, piscine…) restent lisibles en
// base (schemaValidation: false) mais ne sont plus proposés dans les menus,
// formulaires, filtres ou calculs.
export const PROJECT_CATEGORIES = [
  // Résidentiel
  "maison",
  "villa",
  "appartement",
  "studio",
  "duplex",
  "immeuble",
  // Commercial & tertiaire
  "local_commercial",
  "bureau",
  "entrepot",
  // Tourisme
  "residence_touristique",
  // Projet neuf générique
  "projet_neuf",
  // Rénovation & finition
  "renovation_complete",
  "extension_batiment",
  "renovation_cuisine",
  "renovation_salle_de_bain",
  "peinture_interieure",
  // Équipements extérieurs
  "piscine",
  // Hébergement & restauration
  "restaurant",
  "cafe",
  // Travaux techniques
  "electricite_complete",
  "plomberie_complete",
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
  // BIM Macro-categories (postes de coût de l'estimation)
  "gros_oeuvre",
  "second_oeuvre",
  "equipements",
  "main_oeuvre",
  "transport",
  "etudes_imprevus",
  // ── Catégories officielles 2026 (Base de données des matériaux – Tunisie 2026) ──
  "terrassement_granulats",
  "liants_ciments_mortiers",
  "betons_prefabrication",
  "acier_metaux_structure",
  "maconnerie_plancher",
  "bois_panneaux_coffrage",
  "etancheite_protection",
  "isolation_thermique",
  "cloisons_platre_plafonds",
  "toitures_bardages_facades",
  "revetements_sols_murs",
  "peintures_enduits_finitions",
  "menuiseries",
  "vitrage_verriers",
  "chimie_construction",
  "quincaillerie_fixations",
  "eclairage",
  "cvc_chauffage_ventilation",
  "energies_renouvelables",
  "securite_incendie_surete",
  "voirie_reseaux_drainage",
  "amenagements_exterieurs",
  "materiaux_durables_biosources",
  // ── Catégories legacy (compatibilité des données existantes) ──
  "ciment",
  "sable",
  "gravier",
  "briques",
  "parpaings",
  "beton",
  "acier",
  "bois",
  "coffrage",
  "peinture",
  "carrelage",
  "faience",
  "marbre",
  "pierre_naturelle",
  "plomberie",
  "sanitaire",
  "electricite",
  "eclairage",
  "portes",
  "fenetres",
  "menuiserie_aluminium",
  "menuiserie_pvc",
  "cuisines",
  "dressings",
  "toiture",
  "etancheite",
  "isolation",
  "revetements",
  "quincaillerie",
  "outillage",
  "climatisation",
  "chauffage",
  "amenagement_exterieur",
  "piscines",
  "jardins",
  "location_engins",
  "terrassement",
  "fondations",
  "finition",
  "granulats",
  "blocs",
  "fer_a_beton",
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
      emailNotifications: v.optional(v.boolean()),
      userRole: v.optional(v.union(
        v.literal("client"),
        v.literal("supplier"),
        v.literal("expert"),
      )),
      createdAt: v.optional(v.number()),
      updatedAt: v.optional(v.number()),
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
      // Nombre de pièces (maison, villa, immeuble résidentiel)
      bedrooms: v.optional(v.number()),
      bathrooms: v.optional(v.number()),
      kitchens: v.optional(v.number()),
      livingRooms: v.optional(v.number()),
      garages: v.optional(v.number()),
      wcs: v.optional(v.number()),
      pools: v.optional(v.number()),
      // Surface totale du terrain (m2)
      surfaceTotale: v.optional(v.number()),
      
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
          dqe: v.optional(v.any()),
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
      
      // DQE — Quantitatif détaillé par lots (modèle Google Sheets)
      dqe: v.optional(v.any()),

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
      subcategory: v.optional(v.string()),
      brand: v.optional(v.string()),
      description: v.optional(v.string()),
      manufacturer: v.optional(v.string()),
      minPrice: v.optional(v.number()),
      avgPrice: v.optional(v.number()),
      maxPrice: v.optional(v.number()),
      availability: v.optional(
        v.union(v.literal("disponible"), v.literal("sur_commande"), v.literal("rupture"))
      ),
      reliabilityIndex: v.optional(v.number()),
      sourceRef: v.optional(v.string()),
      priceQuality: v.optional(
        v.union(
          v.literal("observé_en_ligne"),
          v.literal("publication_2026"),
          v.literal("estimation_indicative"),
        ),
      ),
      confidenceIndex: v.optional(v.number()),
      /** Référence officielle du barème Batibuild Tunisie 2026 (MAT-xxxx). */
      sku: v.optional(v.string()),
    })
      .index("by_category", ["category"])
      .index("by_name", ["name"]),

    marketSources: defineTable({
      name: v.string(),
      type: v.union(
        v.literal("fabricant"),
        v.literal("distributeur"),
        v.literal("plateforme")
      ),
      website: v.optional(v.string()),
      reliabilityScore: v.number(),
      active: v.boolean(),
      categoryScope: v.optional(v.array(v.string())),
      lastSyncAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_type", ["type"])
      .index("by_name", ["name"]),

    materialOffers: defineTable({
      productId: v.id("materialPrices"),
      category: v.string(),
      subcategory: v.optional(v.string()),
      name: v.string(),
      brand: v.optional(v.string()),
      manufacturer: v.optional(v.string()),
      unit: v.string(),
      minPrice: v.number(),
      avgPrice: v.number(),
      maxPrice: v.number(),
      currency: v.string(),
      governorate: v.optional(v.string()),
      city: v.optional(v.string()),
      supplier: v.string(),
      sourceId: v.id("marketSources"),
      sourceType: v.union(
        v.literal("fabricant"),
        v.literal("distributeur"),
        v.literal("plateforme")
      ),
      availability: v.union(
        v.literal("disponible"),
        v.literal("sur_commande"),
        v.literal("rupture")
      ),
      reliabilityIndex: v.number(),
      updatedAt: v.number(),
    })
      .index("by_product", ["productId"])
      .index("by_category", ["category"])
      .index("by_governorate", ["governorate"])
      .index("by_supplier", ["supplier"]),

    offerPriceHistory: defineTable({
      offerId: v.id("materialOffers"),
      previousMin: v.number(),
      previousAvg: v.number(),
      previousMax: v.number(),
      newMin: v.number(),
      newAvg: v.number(),
      newMax: v.number(),
      changedAt: v.number(),
    })
      .index("by_offer", ["offerId"])
      .index("by_time", ["changedAt"]),

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

    subscriptions: defineTable({
      userId: v.id("users"),
      kind: v.optional(v.union(v.literal("construction"), v.literal("investment"))),
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
      projectsUsed: v.optional(v.number()),
      investmentsUsed: v.optional(v.number()),
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
        v.literal("email_config_save"),
        v.literal("email_template_save"),
        v.literal("email_resend"),
        v.literal("create_blog_post"),
        v.literal("update_blog_post"),
        v.literal("delete_blog_post"),
        v.literal("publish_blog_post"),
        v.literal("unpublish_blog_post"),
        v.literal("approve_comment"),
        v.literal("reject_comment"),
        v.literal("delete_comment"),
        v.literal("delete_expert_profile"),
        v.literal("approve_expert_subscription"),
        v.literal("reject_expert_subscription"),
        v.literal("verify_expert_receipt"),
        v.literal("delete_expert_receipt"),
      ),
      targetUserId: v.optional(v.id("users")),
      targetUserEmail: v.optional(v.string()),
      details: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_admin", ["adminId"])
      .index("by_action", ["action"])
      .index("by_created", ["createdAt"]),

    priceHistory: defineTable({
      materialPriceId: v.id("materialPrices"),
      previousPrice: v.number(),
      newPrice: v.number(),
      changedBy: v.id("users"),
      changedAt: v.number(),
    }).index("by_material", ["materialPriceId"]),

    // Supplier Profiles
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

    paymentConfig: defineTable({
      bankName: v.string(),
      bankTitulaire: v.string(),
      bankRib: v.string(),
      bankIban: v.string(),
      bankSwift: v.string(),
      d17MerchantName: v.string(),
      d17Phone: v.string(),
      d17Email: v.string(),
      d17Notice: v.string(),
      // Prix par forfait — null signifie que le forfait est gratuit.
      // Client Pro = proPrice (par défaut payant), Fournisseur = supplierPrice, Expert = expertPrice.
      proPrice: v.optional(v.number()),
      supplierPrice: v.optional(v.number()),
      expertPrice: v.optional(v.number()),
      currency: v.string(),
      startPrice: v.optional(v.number()),
      constructionStartPrice: v.optional(v.number()),
      constructionProPrice: v.optional(v.number()),
      constructionExpertPrice: v.optional(v.number()),
      investmentStartPrice: v.optional(v.number()),
      investmentProPrice: v.optional(v.number()),
      investmentExpertPrice: v.optional(v.number()),
      freeProjectLimit: v.optional(v.number()),
      proProjectLimit: v.optional(v.number()),
      expertProjectLimit: v.optional(v.number()),
      freeInvestmentLimit: v.optional(v.number()),
      proInvestmentLimit: v.optional(v.number()),
      expertInvestmentLimit: v.optional(v.number()),
      freeDownloadLimit: v.optional(v.number()),
      proDownloadLimit: v.optional(v.number()),
      expertDownloadLimit: v.optional(v.number()),
      trialEnabled: v.optional(v.boolean()),
      trialDurationDays: v.optional(v.number()),
      updatedAt: v.number(),
      updatedBy: v.id("users"),
    }).index("by_updated", ["updatedAt"]),

    bimConfig: defineTable({
      marketPricesM2: v.string(),
      projectPercentages: v.string(),
      regionMultipliers: v.string(),
      unitPrices: v.string(),
      version: v.number(),
      refreshedAt: v.number(),
      refreshedBy: v.id("users"),
    }).index("by_refreshed", ["refreshedAt"]),

    emailConfig: defineTable({
      senderName: v.string(),
      senderEmail: v.string(),
      replyTo: v.optional(v.string()),
      smtpHost: v.optional(v.string()),
      smtpPort: v.optional(v.number()),
      smtpSecurity: v.optional(
        v.union(v.literal("ssl"), v.literal("tls"), v.literal("none"))
      ),
      smtpUser: v.optional(v.string()),
      smtpPasswordEnc: v.optional(v.string()),
      signature: v.optional(v.string()),
      logoUrl: v.optional(v.string()),
      primaryColor: v.optional(v.string()),
      accentColor: v.optional(v.string()),
      autoEnabled: v.optional(v.boolean()),
      notifyAdminCc: v.optional(v.boolean()),
      loginLink: v.optional(v.string()),
      updatedAt: v.number(),
      updatedBy: v.id("users"),
    }).index("by_updated", ["updatedAt"]),

    emailTemplates: defineTable({
      key: v.union(
        v.literal("subscription_activated"),
        v.literal("subscription_renewed"),
        v.literal("subscription_expired"),
        v.literal("payment_confirmed"),
        v.literal("payment_rejected"),
        v.literal("subscription_suspended"),
        v.literal("subscription_canceled"),
        v.literal("quote_request_sent"),
        v.literal("service_request_sent"),
        v.literal("quote_received"),
        v.literal("service_received")
      ),
      label: v.string(),
      subject: v.string(),
      bodyHtml: v.string(),
      active: v.optional(v.boolean()),
      updatedAt: v.number(),
      updatedBy: v.id("users"),
    }).index("by_key", ["key"]),

    emailHistory: defineTable({
      to: v.string(),
      recipientName: v.optional(v.string()),
      templateKey: v.string(),
      subject: v.string(),
      status: v.union(
        v.literal("sent"),
        v.literal("failed"),
        v.literal("pending")
      ),
      error: v.optional(v.string()),
      createdAt: v.number(),
      sentAt: v.optional(v.number()),
      attemptCount: v.optional(v.number()),
      dedupeKey: v.optional(v.string()),
      payloadJson: v.optional(v.string()),
      sentToAdmins: v.optional(v.boolean()),
    })
      .index("by_created", ["createdAt"])
      .index("by_status", ["status"])
      .index("by_dedupe", ["dedupeKey"]),

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
      blogTitle: v.optional(v.string()),
      blogDescription: v.optional(v.string()),
      blogOgImage: v.optional(v.string()),
      updatedAt: v.number(),
      updatedBy: v.id("users"),
    }).index("by_updated", ["updatedAt"]),

    blogPosts: defineTable({
      title: v.string(),
      slug: v.string(),
      excerpt: v.string(),
      contentHtml: v.string(),
      coverImage: v.optional(v.string()),
      coverStorageId: v.optional(v.id("_storage")),
      category: v.string(),
      tags: v.optional(v.array(v.string())),
      authorId: v.id("users"),
      authorName: v.string(),
      authorImage: v.optional(v.string()),
      status: v.union(v.literal("draft"), v.literal("published")),
      featured: v.optional(v.boolean()),
      views: v.optional(v.number()),
      seoTitle: v.optional(v.string()),
      seoDescription: v.optional(v.string()),
      seoKeywords: v.optional(v.string()),
      seoOgImage: v.optional(v.string()),
      publishedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_slug", ["slug"])
      .index("by_status_published", ["status", "publishedAt"])
      .index("by_category", ["category"])
      .index("by_created", ["createdAt"]),

    blogComments: defineTable({
      postId: v.id("blogPosts"),
      authorId: v.id("users"),
      authorName: v.string(),
      authorImage: v.optional(v.string()),
      content: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
      createdAt: v.number(),
    })
      .index("by_post_status", ["postId", "status", "createdAt"])
      .index("by_status", ["status", "createdAt"])
      .index("by_created", ["createdAt"]),

    investmentAnalyses: defineTable({
      userId: v.id("users"),
      projectId: v.optional(v.id("projects")),
      input: analysisInputValidator,
      results: analysisResultsValidator,
      aiInsights: v.optional(aiInsightsValidator),
      shareToken: v.optional(v.string()),
      shareExpiresAt: v.optional(v.number()),
      isFavorite: v.optional(v.boolean()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_created", ["createdAt"])
      .index("by_share_token", ["shareToken"]),

    aiMaterialAnalyses: defineTable({
      userId: v.id("users"),
      projectId: v.optional(v.id("projects")),
      input: v.any(),
      results: v.any(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_project", ["userId", "projectId"])
      .index("by_created", ["createdAt"]),

    projectRoadmaps: defineTable({
      userId: v.id("users"),
      projectId: v.id("projects"),
      input: v.any(),
      results: v.any(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_project", ["projectId"])
      .index("by_user_project", ["userId", "projectId"]),

    supplierAnalytics: defineTable({
      supplierId: v.id("supplierProfiles"),
      date: v.number(),
      eventType: v.union(
        v.literal("view"),
        v.literal("click"),
        v.literal("contact"),
      ),
      productId: v.optional(v.string()),
      source: v.optional(
        v.union(
          v.literal("direct"),
          v.literal("search"),
          v.literal("social"),
          v.literal("other"),
        ),
      ),
    })
      .index("by_supplier", ["supplierId"])
      .index("by_supplier_date", ["supplierId", "date"])
      .index("by_supplier_type", ["supplierId", "eventType"]),

    supplierRatings: defineTable({
      supplierId: v.id("supplierProfiles"),
      userId: v.id("users"),
      rating: v.number(),
      projectId: v.optional(v.id("projects")),
      comment: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_supplier", ["supplierId"])
      .index("by_user", ["userId"])
      .index("by_supplier_date", ["supplierId", "createdAt"]),

    expertRatings: defineTable({
      expertId: v.id("expertProfiles"),
      userId: v.id("users"),
      rating: v.number(),
      projectId: v.optional(v.id("projects")),
      comment: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_expert", ["expertId"])
      .index("by_user", ["userId"])
      .index("by_expert_date", ["expertId", "createdAt"]),

    quoteRequests: defineTable({
      userId: v.id("users"),
      supplierId: v.id("supplierProfiles"),
      projectId: v.optional(v.id("projects")),
      projectName: v.optional(v.string()),
      category: v.string(),
      materials: v.array(v.object({
        name: v.string(),
        quantity: v.number(),
        unit: v.string(),
      })),
      userPhone: v.string(),
      userEmail: v.string(),
      userName: v.string(),
      message: v.optional(v.string()),
      status: v.union(
        v.literal("pending"),
        v.literal("responded"),
        v.literal("closed"),
      ),
      readAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_supplier", ["supplierId"])
      .index("by_status", ["status"])
      .index("by_created", ["createdAt"]),

    quoteResponses: defineTable({
      quoteRequestId: v.id("quoteRequests"),
      supplierId: v.id("supplierProfiles"),
      userId: v.id("users"),
      message: v.string(),
      totalAmount: v.optional(v.number()),
      attachmentUrl: v.optional(v.string()),
      attachmentStorageId: v.optional(v.id("_storage")),
      attachmentFileName: v.optional(v.string()),
      readAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_quote", ["quoteRequestId"])
      .index("by_supplier", ["supplierId"])
      .index("by_user", ["userId"])
      .index("by_created", ["createdAt"]),

    expertProfiles: defineTable({
      userId: v.id("users"),
      profession: v.union(
        v.literal("architecte"),
        v.literal("bureau_etudes"),
        v.literal("ingenieur"),
        v.literal("promoteur_immobilier"),
        v.literal("plombier"),
        v.literal("electricien"),
      ),
      displayName: v.string(),
      companyName: v.optional(v.string()),
      phone: v.string(),
      email: v.string(),
      address: v.optional(v.string()),
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
      paymentMethod: v.optional(v.union(v.literal("bank_transfer"), v.literal("d17"))),
      paymentAmount: v.optional(v.number()),
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
      .index("by_profession", ["profession"])
      .index("by_subscription", ["subscriptionStatus"]),

    expertServiceRequests: defineTable({
      userId: v.id("users"),
      expertId: v.id("expertProfiles"),
      projectId: v.optional(v.id("projects")),
      projectName: v.optional(v.string()),
      requestType: v.union(v.literal("devis"), v.literal("service")),
      serviceType: v.string(),
      description: v.string(),
      projectType: v.optional(v.string()),
      totalTTC: v.optional(v.number()),
      surface: v.optional(v.number()),
      region: v.optional(v.string()),
      userPhone: v.string(),
      userEmail: v.string(),
      userName: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("responded"),
        v.literal("closed"),
      ),
      readAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_expert", ["expertId"])
      .index("by_status", ["status"])
      .index("by_created", ["createdAt"]),

    expertServiceResponses: defineTable({
      serviceRequestId: v.id("expertServiceRequests"),
      expertId: v.id("expertProfiles"),
      userId: v.id("users"),
      message: v.string(),
      totalAmount: v.optional(v.number()),
      attachmentUrl: v.optional(v.string()),
      attachmentStorageId: v.optional(v.id("_storage")),
      attachmentFileName: v.optional(v.string()),
      readAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_request", ["serviceRequestId"])
      .index("by_expert", ["expertId"])
      .index("by_user", ["userId"]),

    expertAnalytics: defineTable({
      expertId: v.id("expertProfiles"),
      date: v.number(),
      eventType: v.union(
        v.literal("view"),
        v.literal("click"),
        v.literal("contact"),
      ),
      productId: v.optional(v.string()),
      source: v.optional(
        v.union(
          v.literal("direct"),
          v.literal("search"),
          v.literal("social"),
          v.literal("other"),
        ),
      ),
    })
      .index("by_expert", ["expertId"])
      .index("by_expert_date", ["expertId", "date"])
      .index("by_expert_type", ["expertId", "eventType"]),

    // ── Announcements (admin broadcast messages shown in Dashboard) ──
    announcements: defineTable({
      title: v.string(),
      content: v.string(),
      type: v.union(
        v.literal("annonce"),
        v.literal("information"),
        v.literal("news"),
        v.literal("important"),
        v.literal("urgent"),
        v.literal("maintenance"),
      ),
      priority: v.number(),
      imageUrl: v.optional(v.string()),
      imageStorageId: v.optional(v.id("_storage")),
      status: v.union(
        v.literal("draft"),
        v.literal("scheduled"),
        v.literal("published"),
        v.literal("expired"),
        v.literal("disabled"),
      ),
      isActive: v.boolean(),
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
      targetType: v.union(
        v.literal("all"),
        v.literal("company"),
        v.literal("role"),
        v.literal("user"),
      ),
      // Pas de table « companies » : le ciblage société utilise le champ
      // textuel users.company (raison sociale déclarée par l'utilisateur).
      targetCompanyNames: v.optional(v.array(v.string())),
      targetRoles: v.optional(v.array(v.string())),
      targetUserIds: v.optional(v.array(v.id("users"))),
      displayOrder: v.optional(v.number()),
      createdBy: v.id("users"),
      authorName: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_status_active", ["status", "isActive"])
      .index("by_type", ["type"])
      .index("by_created", ["createdAt"])
      .index("by_order", ["displayOrder"]),

    // ── Connection logs (real-time analytics) ──────────────────────
    connectionLogs: defineTable({
      sessionId: v.string(),
      country: v.string(),
      city: v.optional(v.string()),
      region: v.optional(v.string()),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
      userAgent: v.optional(v.string()),
      page: v.string(),
      connectedAt: v.number(),
      lastSeenAt: v.number(),
      disconnectedAt: v.optional(v.number()),
    })
      .index("by_session", ["sessionId"])
      .index("by_country", ["country"])
      .index("by_region", ["region"])
      .index("by_connected", ["connectedAt"])
      .index("by_lastSeen", ["lastSeenAt"]),

  },
  {
    schemaValidation: false,
  },
);

export default schema;
