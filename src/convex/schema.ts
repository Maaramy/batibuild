import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// ============================================================================
// User Roles & Subscription Plans
// ============================================================================

export const ROLES = {
  ADMIN: "admin",
  MODERATOR: "moderator",
  SUPPORT_AGENT: "support_agent",
  USER: "user",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.MODERATOR),
  v.literal(ROLES.SUPPORT_AGENT),
  v.literal(ROLES.USER),
);
export type Role = Infer<typeof roleValidator>;

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  moderator: "Modérateur",
  support_agent: "Agent support",
  user: "Utilisateur",
};

// Trois catégories d'offres : Client Pro (pro), Fournisseur (supplier), Expert (expert).
// « free » n'est PLUS un forfait proposé (le forfait gratuit permanent a été
// supprimé au profit de la période d'essai administrable). La valeur subsiste
// uniquement comme LEGACY : des documents `users` / `subscriptions` déjà
// enregistrés peuvent la porter, et l'administration l'utilise pour RETIRER un
// abonnement (« Aucun forfait »). Elle n'accorde aucun droit.
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

// Catalogue officiel des types de bien (source : src/convex/projectTypes.ts).
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
//
// Définies dans `src/lib/supplierSpecialties.ts` (module sans aucune
// dépendance) : elles sont réexportées ici pour que le backend continue de
// les importer depuis `./schema`, mais le navigateur les importe directement
// depuis `@/lib/supplierSpecialties`. C'est ce qui garde tout le schéma
// serveur (defineSchema, authTables, @auth/core…) HORS du bundle client.
// ============================================================================

export {
  SUPPLIER_SPECIALTIES,
  SUPPLIER_SPECIALTIES_LABELS,
} from "../lib/supplierSpecialties";

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
  // ── Métiers de la catégorie « Professionnel » (espace Expert) ──
  // Permettent à la mise en relation de retrouver un professionnel par sa
  // spécialité (plombier, électricien, piscinier…), comme auparavant par sa
  // profession.
  plombier: ["plombier"],
  electricien: ["electricien"],
  chauffagiste: ["climatisation", "plombier"],
  installateur_cvc: ["climatisation"],
  frigoriste: ["climatisation"],
  installateur_panneaux_solaires: ["solaire"],
  installateur_chauffe_eau_solaire: ["solaire", "plombier"],
  technicien_domotique: ["electricien"],
  installateur_securite_alarme: ["electricien"],
  technicien_reseaux_telecoms: ["electricien"],
  macon: ["macon"],
  coffreur: ["coffreur"],
  ferrailleur: ["ferrailleur"],
  bancheur: ["coffreur"],
  constructeur_piscines: ["pisciniste"],
  piscinier: ["pisciniste"],
  etancheur: ["etancheite"],
  terrassier: ["terrassement"],
  demolisseur: ["demolition"],
  charpentier_metallique: ["menuisier_bois"],
  peintre_batiment: ["peintre"],
  platrier: ["platrier"],
  plaquiste: ["platrier"],
  poseur_faux_plafonds: ["platrier"],
  carreleur: ["carreleur"],
  poseur_revetements_sol: ["carreleur"],
  menuisier_bois: ["menuisier_bois"],
  menuisier_aluminium_pvc: ["menuisier_aluminium"],
  vitrier: ["vitrier"],
  serrurier: ["portes_fenetres"],
  ferronnier: ["portes_fenetres"],
  poseur_portes_fenetres: ["portes_fenetres"],
  jointeur: ["etancheite"],
  staffeur_decorateur_platre: ["platrier"],
  paysagiste: ["paysagiste"],
  jardinier: ["paysagiste"],
  installateur_clotures_portails: ["entreprise_generale"],
  poseur_paves_dallages: ["terrassement"],
  installateur_cuisines_equipees: ["cuisine"],
  installateur_sanitaires: ["sanitaire"],
  specialiste_etancheite_terrasses: ["etancheite"],
  technicien_isolation: ["etancheite", "platrier"],
  nettoyeur_fin_chantier: ["entreprise_generale"],
  specialiste_renovation_immobiliere: ["entreprise_generale"],
};

// ============================================================================
// Schema Definition
// ============================================================================

const schema = defineSchema(
  {
    // Default auth tables from Convex Auth
    ...authTables,

    // Users table (extended from auth base)
    //
    // ⚠️ Ce defineTable remplace entièrement `authTables.users` : il doit donc
    // conserver TOUS les champs et index que Convex Auth utilise, sinon ses
    // écritures échouent à la validation (`phoneVerificationTime` ci-dessous,
    // renseigné dès qu'un code de vérification porte un numéro de téléphone)
    // et ses recherches par index échouent (`phone`).
    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      phoneVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
      subscriptionPlan: v.optional(subscriptionPlanValidator),
      subscriptionEndDate: v.optional(v.number()),
      // ── Période d'essai gratuite (7 jours) & abonnement mensuel (30 jours) ──
      // Source de vérité = `subscriptionStatus.getUserSubscriptionStatus` : les
      // dates sont écrites par le serveur, les compteurs « …DaysRemaining » ne
      // sont que des miroirs recalculés à chaque écriture / passage du cron.
      // `trialClaimedAt` est immuable : il empêche un second essai gratuit,
      // même après suppression de la fenêtre d'essai lors d'une souscription.
      trialClaimedAt: v.optional(v.number()),
      trialStartDate: v.optional(v.number()),
      trialEndDate: v.optional(v.number()),
      trialDaysTotal: v.optional(v.number()),
      trialDaysRemaining: v.optional(v.number()),
      subscriptionStartDate: v.optional(v.number()),
      subscriptionDaysTotal: v.optional(v.number()),
      subscriptionDaysRemaining: v.optional(v.number()),
      // ── COTISATION CLIENT PRO (crédits de projets) ────────────────────────
      // Le forfait Client Pro n'est PAS un abonnement mensuel : il fonctionne
      // par crédits de projets. `clientProFreeGrantedAt` est immuable et
      // garantit que la gratuité initiale n'est accordée qu'UNE seule fois.
      // Les compteurs ci-dessous sont la source de vérité du solde ; chaque
      // mouvement est doublé dans `clientProCreditEvents` (historique).
      clientProFreeGrantedAt: v.optional(v.number()),
      clientProFreeProjectsGranted: v.optional(v.number()),
      clientProFreeProjectsUsed: v.optional(v.number()),
      clientProPaidProjectsGranted: v.optional(v.number()),
      clientProPaidProjectsUsed: v.optional(v.number()),
      // Miroir du statut d'abonnement. « free » est conservé pour la lecture des
      // documents anciens (forfait supprimé) : il n'est plus jamais écrit.
      subscriptionStatus: v.optional(
        v.union(
          v.literal("trialing"),
          v.literal("trial_expired"),
          v.literal("active"),
          v.literal("expired"),
          v.literal("free"),
          v.literal("pending"),
          v.literal("none"),
        ),
      ),
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
      .index("phone", ["phone"])
      .index("subscriptionPlan", ["subscriptionPlan"]),

    // Projects
    projects: defineTable({
      userId: v.id("users"),
      name: v.string(),
      category: projectCategoryValidator,
      status: projectStatusValidator,
      description: v.optional(v.string()),
      region: v.optional(regionValidator),
      // Scénario budgétaire actif choisi dans « Coût estimatif »
      // ("economique" | "standard" | "premium"). Source partagée qui pilote
      // « Choix matériaux AI » et « Analyse IA & historique ».
      selectedScenario: v.optional(v.string()),
      
      // Surface (unified field, in m²)
      surface: v.optional(v.number()),
      floors: v.optional(v.number()),
      // Surfaces couvertes RÉELLES de chaque niveau (1er élément = RDC). Absent
      // = la surface du RDC s'applique à tous les niveaux. Un étage de surface
      // différente n'est donc jamais facturé comme le RDC.
      levelSurfaces: v.optional(v.array(v.number())),
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
      // Variante de plan architectural retenue par l'utilisateur. Les surfaces
      // du plan deviennent la référence des étapes suivantes (coût, matériaux,
      // métrés) via `levelSurfaces`, sans modifier la surface demandée.
      planSelection: v.optional(
        v.object({
          variantId: v.string(),
          styleId: v.string(),
          name: v.string(),
          builtArea: v.number(),
          levelSurfaces: v.array(v.number()),
          footprint: v.object({ length: v.number(), width: v.number() }),
          selectedAt: v.number(),
        }),
      ),
      
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
          // Détail du calcul multi-niveaux (RDC, étages, toiture, frais communs,
          // surfaces réelles) et vérification automatique des anomalies.
          levelBreakdown: v.optional(v.any()),
          // Empreinte du barème d'évolution annuelle appliqué à CE calcul :
          // version, date et statut conservés pour l'affichage du détail et les
          // rapports PDF. Absente sur les estimations antérieures au module.
          costEvolution: v.optional(
            v.object({
              version: v.number(),
              status: v.union(
                v.literal("active"),
                v.literal("inactive"),
                v.literal("validated"),
              ),
              appliedAt: v.number(),
              referenceYear: v.number(),
              effectiveFrom: v.number(),
              scenario: v.string(),
              scenarioLabel: v.string(),
              years: v.number(),
              globalRate: v.number(),
              referenceCost: v.number(),
              projectedCost: v.number(),
              increase: v.number(),
              increasePct: v.number(),
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
      // Chiffrage validé par le propriétaire du projet : à partir de cet
      // instant, aucun barème d'évolution annuelle n'est appliqué aux
      // recalculs de ce projet (les montants déjà enregistrés ne sont jamais
      // modifiés automatiquement).
      costEstimateValidatedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_status", ["userId", "status"])
      .index("by_category", ["category"])
      .index("by_favorite", ["userId", "isFavorite"])
      // Index par compte + nom : la numérotation étant propre à chaque compte
      // (« #1 » pour tous les utilisateurs), le garde-fou vérifie qu'un nom
      // généré (« #N Ma maison ») n'est pas déjà attribué DANS CE COMPTE avant
      // de le réutiliser (voir projectCounters).
      .index("by_user_name", ["userId", "name"]),

    // Personnalisation du « Quantitatif détaillé » — scénario « Personnalisé »
    // Les scénarios Économique / Standard / Premium d'origine ne sont jamais
    // modifiés : les modifications d'articles sont stockées à part (une ligne
    // par projet et par utilisateur) puis superposées à l'affichage.
    quantitatifCustomizations: defineTable({
      projectId: v.id("projects"),
      userId: v.id("users"),
      // Scénario de référence choisi par l'utilisateur au moment de la
      // première modification : « scénario de référence + modifications ».
      baseScenario: v.union(
        v.literal("economique"),
        v.literal("standard"),
        v.literal("premium"),
      ),
      modifications: v.array(
        v.object({
          // Identifiant stable de l'article : `${lotId}::${index de ligne}`.
          lineKey: v.string(),
          lotId: v.string(),
          lotName: v.string(),
          lineIndex: v.number(),
          // Désignation d'origine (permet la ré-initialisation et la
          // re-résolution lorsque le quantitatif est régénéré).
          baseDesignation: v.string(),
          designation: v.string(),
          unit: v.string(),
          quantity: v.number(),
          // Prix unitaire au niveau de référence « Standard » du moteur
          // (le scénario affiché applique son propre facteur).
          unitPrice: v.number(),
          nature: v.string(),
          priceScenario: v.union(
            v.literal("economique"),
            v.literal("standard"),
            v.literal("premium"),
          ),
          // Vrai lorsque l'article a été remplacé par un article compatible.
          replacedArticle: v.boolean(),
          updatedAt: v.number(),
        }),
      ),
      // Postes (lignes de travaux) supprimés depuis « Modifier l'article ».
      // Stockés séparément du quantitatif du projet (jamais modifié) : ils ne
      // s'appliquent qu'au scénario « Personnalisé ». Les postes protégés
      // (Gros œuvre, Transport et autres, études/permis, structure, enveloppe,
      // réseaux) ne peuvent jamais y figurer : le contrôle est fait dans la
      // mutation `removeQuantitatifPoste`.
      removedPostes: v.optional(
        v.array(
          v.object({
            // Identité de position du poste : `${lotId}::${index de ligne}`.
            lineKey: v.string(),
            lotId: v.string(),
            lotName: v.string(),
            // Désignation d'origine (repli lorsque le quantitatif est régénéré).
            designation: v.string(),
            nature: v.string(),
            // Montant au niveau de référence du moteur (avant mise à l'échelle).
            amount: v.number(),
            removedAt: v.number(),
          }),
        ),
      ),
      updatedAt: v.number(),
    })
      .index("by_project", ["projectId"])
      .index("by_project_user", ["projectId", "userId"])
      .index("by_user", ["userId"]),

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
      /** Référence officielle du barème batibuild Tunisie 2026 (MAT-xxxx). */
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
        v.literal("support_ticket_created"),
        v.literal("support_reply"),
        v.literal("support_ticket_resolved"),
        v.literal("expert_appointment"),
        v.literal("expert_urgent"),
        v.literal("quote_request"),
        v.literal("quote_update"),
      ),
      title: v.string(),
      message: v.string(),
      read: v.boolean(),
      link: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_read", ["userId", "read"]),

    // ── Support & Messagerie ──────────────────────────────────────────────────
    // Tickets de demande de support créés par les utilisateurs.
    supportTickets: defineTable({
      userId: v.id("users"),
      subject: v.string(),
      category: v.union(
        v.literal("technical"),
        v.literal("account"),
        v.literal("billing"),
        v.literal("project"),
        v.literal("feature"),
        v.literal("other"),
      ),
      priority: v.union(
        v.literal("low"),
        v.literal("normal"),
        v.literal("high"),
        v.literal("urgent"),
      ),
      status: v.union(
        v.literal("open"),
        v.literal("in_progress"),
        v.literal("awaiting_user"),
        v.literal("resolved"),
        v.literal("closed"),
      ),
      createdAt: v.number(),
      lastActivityAt: v.number(),
      // Numéro lisible du ticket (ex : SUP-000124), généré côté serveur.
      ticketNumber: v.optional(v.string()),
      // Administrateur / agent support assigné au ticket.
      assignedTo: v.optional(v.id("users")),
      // Horodatages de résolution / fermeture.
      resolvedAt: v.optional(v.number()),
      closedAt: v.optional(v.number()),
      // Compteurs de messages non lus (temps réel, par côté)
      userUnreadCount: v.optional(v.number()),
      adminUnreadCount: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"])
      .index("by_category", ["category"]),

    // Messages d'une conversation de support (liés à un ticket).
    supportMessages: defineTable({
      ticketId: v.id("supportTickets"),
      senderId: v.id("users"),
      senderRole: v.union(v.literal("user"), v.literal("support")),
      body: v.string(),
      attachmentStorageId: v.optional(v.id("_storage")),
      attachmentName: v.optional(v.string()),
      attachmentType: v.optional(v.string()),
      attachmentSize: v.optional(v.number()),
      createdAt: v.number(),
    }).index("by_ticket", ["ticketId"]),

    // Notes internes (visibles uniquement par l'équipe support, jamais par l'utilisateur).
    supportNotes: defineTable({
      ticketId: v.id("supportTickets"),
      authorId: v.id("users"),
      authorName: v.optional(v.string()),
      body: v.string(),
      createdAt: v.number(),
    }).index("by_ticket", ["ticketId"]),

    // Compteur séquentiel pour la numérotation des tickets (SUP-000001...).
    supportCounters: defineTable({
      kind: v.string(),
      value: v.number(),
    }).index("by_kind", ["kind"]),

    // Compteur séquentiel de facturation — un compteur par année civile
    // (`kind` = « invoice:2026 »). Lu et incrémenté dans la même mutation que
    // la création de la facture : deux paiements simultanés ne peuvent donc
    // JAMAIS obtenir le même numéro (transaction Convex sérialisée).
    invoiceCounters: defineTable({
      kind: v.string(),
      value: v.number(),
    }).index("by_kind", ["kind"]),

    // Compteur séquentiel des numéros de projet (« #1 », « #2 », …) — UN
    // COMPTEUR PAR UTILISATEUR (`kind` = « project:<userId> ») : chaque compte
    // possède sa propre séquence, indépendante des projets des autres.
    //
    // Lu ET incrémenté dans la même mutation que l'insertion du projet : deux
    // créations simultanées pour le MÊME compte écrivent le même document et ne
    // peuvent donc jamais obtenir le même numéro (transaction Convex
    // sérialisée). Un numéro attribué n'est jamais réutilisé, même si le projet
    // est supprimé ensuite ; les projets historiques ne sont pas renumérotés.
    projectCounters: defineTable({
      kind: v.string(),
      value: v.number(),
    }).index("by_kind", ["kind"]),

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
      projectsUsed: v.optional(v.number()),
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

    // ── COTISATIONS CLIENT PRO (crédits de projets) ───────────────────────────
    // Une commande = un paiement de cotisation, pour un nombre de projets
    // précis. Elle naît « pending » : AUCUN crédit n'est attribué avant la
    // confirmation effective du paiement par un administrateur. La transition
    // pending → confirmed est unique et atomique, ce qui rend l'attribution
    // idempotente : un même paiement ne peut jamais créditer deux fois.
    clientProCreditOrders: defineTable({
      userId: v.id("users"),
      /** Nombre de projets achetés (figé à la commande). */
      projects: v.number(),
      /** Montant réellement à régler (figé à la commande — un changement de
       *  tarif ne réécrit jamais une commande existante). */
      price: v.number(),
      currency: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("confirmed"),
        v.literal("rejected"),
        v.literal("cancelled"),
      ),
      paymentMethod: v.optional(v.string()),
      paymentProofStorageId: v.optional(v.id("_storage")),
      paymentProofUrl: v.optional(v.string()),
      paymentProofFileName: v.optional(v.string()),
      paymentProofUploadedAt: v.optional(v.number()),
      invoiceId: v.optional(v.id("invoices")),
      /** Crédits réellement attribués à la confirmation (traçabilité). */
      grantedProjects: v.optional(v.number()),
      confirmedAt: v.optional(v.number()),
      confirmedBy: v.optional(v.id("users")),
      rejectedAt: v.optional(v.number()),
      rejectionReason: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"]),

    // Journal des mouvements de crédits (attribution gratuite, achat,
    // consommation, remboursement, attribution manuelle). Il ne remplace pas
    // les compteurs du compte : il permet l'audit et empêche qu'un même projet
    // soit décompté (ou remboursé) deux fois.
    clientProCreditEvents: defineTable({
      userId: v.id("users"),
      type: v.union(
        v.literal("free_grant"),
        v.literal("purchase"),
        v.literal("admin_grant"),
        v.literal("consume"),
        v.literal("refund"),
      ),
      /** Positif pour une attribution, négatif pour une consommation. */
      projects: v.number(),
      /** Source débitée/créditée pour les mouvements de quota. */
      bucket: v.optional(v.union(v.literal("free"), v.literal("paid"))),
      projectId: v.optional(v.id("projects")),
      orderId: v.optional(v.id("clientProCreditOrders")),
      note: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_project", ["projectId"])
      .index("by_order", ["orderId"]),

    // ── FACTURES ──────────────────────────────────────────────────────────────
    // Historique de facturation : une facture par paiement ou renouvellement.
    //
    //   • numérotation UNIQUE et SÉQUENTIELLE (FACT-2026-000001) allouée par
    //     `invoiceCounters` dans la transaction d'insertion ;
    //   • une facture n'est JAMAIS supprimée ni écrasée : annulation et
    //     remboursement sont des STATUTS, pas des suppressions — l'historique
    //     reste consultable par l'abonné et par l'administrateur ;
    //   • les informations du client ET les coordonnées de facturation de
    //     batibuild sont FIGÉES à l'émission (`customer*`, `issuer`) : une
    //     facture ancienne reste exacte même si le profil change plus tard ;
    //   • `pdfStorageId` n'est renseigné que si une copie PDF a été archivée :
    //     par défaut le document est régénéré à la demande depuis ces données
    //     (déterministe, toujours disponible, y compris hors ligne).
    invoices: defineTable({
      /** Numéro officiel, unique et séquentiel : « FACT-2026-000001 ». */
      invoiceNumber: v.string(),
      /** Propriétaire de la facture (seul habilité à la consulter). */
      userId: v.id("users"),
      /**
       * Abonnement facturé : identifiant de `subscriptions` pour un profil
       * Client Pro, ou « supplierProfile:<id> » / « expertProfile:<id> » pour
       * les abonnements Fournisseur / Expert (tables dédiées).
       */
      subscriptionId: v.optional(v.string()),
      /** Référence de transaction du paiement (aucune passerelle externe). */
      transactionId: v.optional(v.string()),
      /** Date d'émission de la facture. */
      issueDate: v.number(),
      /** Date du paiement confirmé (absente tant que la facture n'est pas payée). */
      paymentDate: v.optional(v.number()),
      /** Période d'abonnement facturée. */
      billingPeriodStart: v.number(),
      billingPeriodEnd: v.number(),
      /** Type de profil facturé : Client Pro / Fournisseur / Expert. */
      profileType: v.union(
        v.literal("client"),
        v.literal("supplier"),
        v.literal("expert"),
      ),
      /** Forfait facturé (pro / supplier / expert). */
      plan: v.string(),
      /** Désignation détaillée affichée sur la facture. */
      description: v.string(),
      /** Prix hors taxes. */
      amountHT: v.number(),
      /** Montant de TVA (0 si non applicable). */
      taxAmount: v.number(),
      /** Taux de TVA appliqué (%), figé à l'émission. */
      taxRate: v.number(),
      /** Montant toutes taxes comprises — montant réellement réglé. */
      amountTTC: v.number(),
      currency: v.string(),
      /** Méthode de paiement interne (bank_transfer, d17, admin…). */
      paymentMethod: v.optional(v.string()),
      /** Statut : payée / en attente / annulée / remboursée. */
      status: v.union(
        v.literal("paid"),
        v.literal("pending"),
        v.literal("cancelled"),
        v.literal("refunded"),
      ),
      /** Instantané du client au moment de l'émission (historique immuable). */
      customerName: v.optional(v.string()),
      customerEmail: v.optional(v.string()),
      customerAddress: v.optional(v.string()),
      customerCompany: v.optional(v.string()),
      /** Coordonnées de facturation de batibuild, figées à l'émission. */
      issuer: v.optional(
        v.object({
          name: v.string(),
          address: v.optional(v.string()),
          taxId: v.optional(v.string()),
          email: v.optional(v.string()),
          phone: v.optional(v.string()),
          terms: v.optional(v.string()),
        }),
      ),
      /** Copie PDF archivée (facultative — sinon régénérée à la demande). */
      pdfStorageId: v.optional(v.id("_storage")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_number", ["invoiceNumber"])
      .index("by_status", ["status"])
      .index("by_issue_date", ["issueDate"])
      .index("by_user_issue_date", ["userId", "issueDate"])
      .index("by_subscription", ["subscriptionId"]),

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
        v.literal("storage_orphan_delete"),
        v.literal("storage_duplicate_delete"),
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
        v.literal("migrate_expert_professions"),
        v.literal("feature_flag_enabled"),
        v.literal("feature_flag_disabled"),
        v.literal("update_invoice_status"),
        v.literal("update_trial_config"),
        v.literal("update_project_limits"),
        v.literal("update_client_pro_credits"),
        v.literal("update_expert_plan"),
        v.literal("update_supplier_plan"),
        v.literal("approve_client_pro_cotisation"),
        v.literal("migrate_client_pro_credits"),
        v.literal("migrate_free_plan_users"),
        v.literal("email_template_delete"),
        v.literal("notification_recipient_save"),
        v.literal("notification_recipient_delete"),
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

    // Le prix de chaque matériau est historisé (paragraphe 6 des règles métier
    // de la fiche enrichie) ; `priceHistory` ci-dessus porte les changements.

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

    // ── Feature flags (système central de gestion des fonctionnalités) ──────
    // Un document par fonctionnalité : l'admin active/désactive des modules
    // entiers depuis l'espace admin. Un flag désactivé masque TOUTES les
    // entrées UI (menus, cartes, CTA) et bloque les routes — sans jamais
    // supprimer le code, les tables ou les fonctions backend correspondantes.
    // Système générique : ajouter un module = insérer un document, pas de
    // changement de structure.
    featureFlags: defineTable({
      /** Identifiant interne stable, ex. "ai_materials". */
      key: v.string(),
      /** Nom affiché dans l'admin. */
      name: v.string(),
      /** Description affichée dans l'admin. */
      description: v.string(),
      enabled: v.boolean(),
      /** Mode progressif (off/beta/on) pour le déploiement par étapes. */
      mode: v.optional(
        v.union(v.literal("off"), v.literal("beta"), v.literal("on")),
      ),
      updatedAt: v.number(),
      updatedBy: v.optional(v.id("users")),
    })
      .index("by_key", ["key"]),

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
      // Prix par forfait. Client Pro (proPrice) est TOUJOURS payant : l'« Offre
      // gratuite » Client Pro (accès permanent sans paiement) a été supprimée,
      // un prix null/0 y est lu comme la valeur initiale. Fournisseur
      // (supplierPrice) et Expert (expertPrice) : null/0 = « Offre gratuite »
      // administrable.
      proPrice: v.optional(v.number()),
      supplierPrice: v.optional(v.number()),
      expertPrice: v.optional(v.number()),
      currency: v.string(),
      startPrice: v.optional(v.number()),
      constructionStartPrice: v.optional(v.number()),
      constructionProPrice: v.optional(v.number()),
      constructionExpertPrice: v.optional(v.number()),
      freeProjectLimit: v.optional(v.number()),
      proProjectLimit: v.optional(v.number()),
      expertProjectLimit: v.optional(v.number()),
      // Champs hérités (anciens tarifs et quotas d'un module retiré de la
      // plateforme). VOLONTAIREMENT conservés en option : un document
      // `paymentConfig` déjà enregistré peut encore les porter, et Convex
      // valide le document à la LECTURE — les retirer ici rendrait ce document
      // illisible et casserait l'accès aux forfaits. Aucun code ne les lit ni
      // ne les écrit : aucune nouvelle donnée ne peut être créée.
      investmentStartPrice: v.optional(v.number()),
      investmentProPrice: v.optional(v.number()),
      investmentExpertPrice: v.optional(v.number()),
      freeInvestmentLimit: v.optional(v.number()),
      proInvestmentLimit: v.optional(v.number()),
      expertInvestmentLimit: v.optional(v.number()),
      freeDownloadLimit: v.optional(v.number()),
      proDownloadLimit: v.optional(v.number()),
      expertDownloadLimit: v.optional(v.number()),
      // ── Période d'essai gratuite (remplace l'ancien forfait « Free ») ──────
      // Entièrement réglée par l'administrateur (Admin → Abonnements mensuels →
      // Période d'essai gratuite). `convex/trialConfig.ts` est la source de
      // vérité : activation, durée (1 à 365 jours), fenêtre globale de
      // validité, profils éligibles (Client Pro inclus s'il est coché) et
      // modules ouverts pendant l'essai. `trialClientProDurationDays` porte la
      // durée dédiée au forfait Client Pro (absente = durée commune).
      // Aucun droit n'est accordé côté client : chaque décision d'accès est
      // recalculée depuis ces champs côté serveur.
      trialEnabled: v.optional(v.boolean()),
      trialDurationDays: v.optional(v.number()),
      // Legacy : durée dédiée au forfait Client Pro. Client Pro n'est plus un
      // abonnement mensuel et ne bénéficie plus d'une période d'essai ; le
      // champ reste déclaré pour que les documents existants restent lisibles.
      trialClientProDurationDays: v.optional(v.number()),
      trialValidFrom: v.optional(v.number()),
      trialValidUntil: v.optional(v.number()),
      trialEligibleProfiles: v.optional(v.array(v.string())),
      trialModules: v.optional(v.array(v.string())),
      // true = essai réservé aux nouveaux inscrits (pas de rattrapage des
      // comptes existants par `startMyTrial`).
      trialNewAccountsOnly: v.optional(v.boolean()),
      // ── Abonnements mensuels Expert / Fournisseur — paramètres INDÉPENDANTS ──
      // Prix : `expertPrice` / `supplierPrice` ci-dessus. Essai et services
      // inclus sont réglés séparément par forfait. Absent = repli sur la
      // configuration d'essai commune (`trialEnabled`, `trialDurationDays`).
      expertTrialEnabled: v.optional(v.boolean()),
      expertTrialDays: v.optional(v.number()),
      expertIncludedServices: v.optional(v.array(v.string())),
      expertAutoRenew: v.optional(v.boolean()),
      // Nombre de jours avant l'échéance pour envoyer le rappel de renouvellement.
      expertReminderDays: v.optional(v.number()),
      supplierTrialEnabled: v.optional(v.boolean()),
      supplierTrialDays: v.optional(v.number()),
      supplierIncludedServices: v.optional(v.array(v.string())),
      supplierAutoRenew: v.optional(v.boolean()),
      supplierReminderDays: v.optional(v.number()),
      // ── Cotisation Client Pro (crédits de projets) ────────────────────────
      // Le forfait Client Pro n'est plus un abonnement mensuel : l'utilisateur
      // dispose d'un quota de projets gratuits (une seule fois), puis achète
      // des packs de projets. Tous ces paramètres sont enregistrés ici et lus
      // côté serveur par `convex/clientProCredits.ts`.
      clientProFreeGrantEnabled: v.optional(v.boolean()),
      clientProFreeProjects: v.optional(v.number()),
      clientProCotisationPrice: v.optional(v.number()),
      clientProCotisationProjects: v.optional(v.number()),
      clientProCreditTiers: v.optional(
        v.array(
          v.object({
            projects: v.number(),
            price: v.number(),
          }),
        ),
      ),
      clientProRefundOnDelete: v.optional(v.boolean()),
      clientProAllowStacking: v.optional(v.boolean()),
      // ── Limite du nombre de projets par offre ────────────────────────────
      // Réglée par l'administrateur (Admin → Abonnements mensuels). Source de
      // vérité : `convex/projectLimits.ts`, vérifiée côté serveur dans la même
      // transaction que la création du projet. `*Enabled` absent = aucune
      // limite (comportement historique préservé). Les projets déjà créés ne
      // sont jamais supprimés ni verrouillés par ces champs.
      projectLimitTrialEnabled: v.optional(v.boolean()),
      projectLimitTrialMax: v.optional(v.number()),
      // "offer" = décompte depuis le début de la période ; "total" = cumulé.
      projectLimitTrialReset: v.optional(v.string()),
      projectLimitFreeEnabled: v.optional(v.boolean()),
      projectLimitFreeMax: v.optional(v.number()),
      projectLimitFreeReset: v.optional(v.string()),
      projectLimitPaidEnabled: v.optional(v.boolean()),
      projectLimitPaidMax: v.optional(v.number()),
      projectLimitPaidReset: v.optional(v.string()),
      // Legacy : ancien interrupteur du forfait « Free » (offre gratuite
      // permanente), SUPPRIMÉ. Le champ reste déclaré pour que les documents
      // `paymentConfig` déjà enregistrés restent lisibles (Convex valide le
      // document à la lecture). Aucun code ne l'écrit ; il n'accorde plus aucun
      // droit : seul `trialEnabled` commande l'essai.
      freePlanEnabled: v.optional(v.boolean()),
      // Disponibilité du forfait Client Pro (peut être retiré comme défaut).
      // true/absent = disponible ; false = désactivé par l'administrateur.
      clientProEnabled: v.optional(v.boolean()),
      // Forfait attribué AUTOMATIQUEMENT aux nouveaux utilisateurs qui ne
      // sélectionnent aucune offre à l'inscription. Lu côté backend
      // (`subscriptionStatus.applyDefaultPlanForNewUser`) : jamais codé en dur.
      //   "trial"       → aucun forfait payé, la période d'essai s'applique ;
      //   "client_pro"  → abonnement Client Pro (stocké "pro") attribué ;
      //   "free"        → valeur LEGACY (forfait supprimé), lue comme "trial".
      defaultPlan: v.optional(
        v.union(v.literal("trial"), v.literal("client_pro"), v.literal("free")),
      ),
      // ── Facturation : TVA et coordonnées de l'émetteur ────────────────────
      // Taux de TVA appliqué aux factures (%). 0 ou absent = « TVA non
      // applicable » : les prix des forfaits sont alors facturés en l'état.
      // Le taux est FIGÉ sur chaque facture : le modifier ne réécrit jamais
      // l'historique.
      vatRate: v.optional(v.number()),
      // Coordonnées de facturation affichées sur le PDF (en-tête/pied de page).
      // Laissées vides par défaut : l'administrateur saisit les informations
      // légales réelles, aucune donnée n'est inventée.
      companyLegalName: v.optional(v.string()),
      companyAddress: v.optional(v.string()),
      companyTaxId: v.optional(v.string()),
      companyEmail: v.optional(v.string()),
      companyPhone: v.optional(v.string()),
      paymentTerms: v.optional(v.string()),
      // Méthodes de paiement activées/désactivées par l'administrateur.
      // Le catalogue et l'ordre proviennent de `lib/paymentMethods.ts` ;
      // la base ne stocke que l'état de chaque méthode.
      paymentMethodStates: v.optional(
        v.array(
          v.object({
            slug: v.string(),
            enabled: v.boolean(),
          }),
        ),
      ),
      updatedAt: v.number(),
      updatedBy: v.id("users"),
    }).index("by_updated", ["updatedAt"]),

    bimConfig: defineTable({
      marketPricesM2: v.string(),
      projectPercentages: v.string(),
      regionMultipliers: v.string(),
      unitPrices: v.string(),
      // Coefficients multi-niveaux (JSON : rdc, rPlus1, rPlus2,
      // rPlus3AndAbove, commonShare, roofWeight) réglés par l'administrateur,
      // avec leur date de validité — sans modification du code source.
      levelCoefficients: v.optional(v.string()),
      levelCoefficientsValidFrom: v.optional(v.number()),
      levelCoefficientsValidUntil: v.optional(v.number()),
      // Taux de TVA appliqué au DQE de rénovation de salle de bain (%), réglé
      // par l'administrateur. Absent → taux de droit commun (19 %).
      sdbVatRate: v.optional(v.number()),
      version: v.number(),
      refreshedAt: v.number(),
      refreshedBy: v.id("users"),
    }).index("by_refreshed", ["refreshedAt"]),

    // ── Évolution annuelle des coûts de construction ─────────────────────
    // Paramétrage UNIQUE (la dernière ligne est la version en vigueur) :
    // taux annuels par catégorie, trois scénarios, année et date de
    // référence, statut du mécanisme. Les estimations existantes ne sont
    // jamais recalculées automatiquement (aucun champ de projet n'est
    // modifié par ce paramétrage).
    costEvolutionConfig: defineTable({
      referenceYear: v.number(),
      effectiveFrom: v.number(),
      defaultScenario: v.union(
        v.literal("moderee"),
        v.literal("moyen"),
        v.literal("eleve"),
      ),
      customRate: v.number(),
      enabled: v.boolean(),
      scenarioRates: v.object({
        moderee: v.number(),
        moyen: v.number(),
        eleve: v.number(),
      }),
      categories: v.array(
        v.object({
          key: v.string(),
          rate: v.number(),
          useComponents: v.boolean(),
          components: v.object({
            materials: v.number(),
            labor: v.number(),
            transport: v.number(),
            equipment: v.number(),
          }),
        }),
      ),
      version: v.number(),
      updatedAt: v.number(),
      updatedBy: v.id("users"),
    }).index("by_updated", ["updatedAt"]),

    // Historique des versions du barème : auteur, date, valeurs précédentes
    // et nouvelles. Une ligne par modification (aucune n'est supprimée).
    costEvolutionHistory: defineTable({
      version: v.number(),
      action: v.union(
        v.literal("save"),
        v.literal("reset"),
        v.literal("toggle"),
      ),
      previous: v.string(),
      next: v.string(),
      details: v.string(),
      changedBy: v.id("users"),
      changedByName: v.string(),
      changedAt: v.number(),
    }).index("by_changed", ["changedAt"]),

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
        v.literal("expert_quote_request"),
        v.literal("expert_appointment_request"),
        v.literal("expert_urgent_request"),
        v.literal("quote_received"),
        v.literal("service_received"),
        v.literal("expert_quote_received"),
        v.literal("expert_appointment_response"),
        v.literal("expert_urgent_response"),
        v.literal("support_ticket_created"),
        v.literal("support_reply"),
        // Notifications destinées à l'administrateur de la plateforme
        v.literal("admin_new_user"),
        v.literal("admin_new_subscription"),
        v.literal("admin_new_project")
      ),
      label: v.string(),
      subject: v.string(),
      bodyHtml: v.string(),
      active: v.optional(v.boolean()),
      /**
       * Modèle supprimé par l'administrateur (tombstone). La ligne est conservée
       * pour ne jamais ressusciter un modèle supprimé via la version par défaut
       * du code : `getEmailTemplates` le masque et aucun envoi n'est effectué.
       * Ré-ajouter le modèle efface ce champ.
       */
      deletedAt: v.optional(v.number()),
      updatedAt: v.number(),
      updatedBy: v.id("users"),
    }).index("by_key", ["key"]),

    // Destinataires des notifications administrateur (adresses gérées depuis
    // l'administration, sans intervention dans le code).
    adminNotificationRecipients: defineTable({
      email: v.string(),
      name: v.optional(v.string()),
      /** Types de notification reçus ; `all` = toutes les catégories. */
      topics: v.array(v.string()),
      active: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
      createdBy: v.optional(v.id("users")),
    }).index("by_created", ["createdAt"]),

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

    // Sélection courante des matériaux du module « Choix matériaux AI ».
    // Une seule ligne par projet et par utilisateur : elle porte le scénario
    // actif (synchronisé avec le Coût estimatif) et le brouillon de sélection.
    materialSelections: defineTable({
      userId: v.id("users"),
      projectId: v.id("projects"),
      scenario: v.string(),
      /** Entrées de sélection indexées par `articleId` (traçabilité §17.26). */
      entries: v.any(),
      totals: v.any(),
      /** Versions des données au moment de l'enregistrement (§18.17). */
      quantitativeVersion: v.optional(v.string()),
      priceVersion: v.optional(v.string()),
      status: v.string(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_project", ["userId", "projectId"]),

    // Versions validées (historique) de la sélection finale des matériaux.
    materialSelectionVersions: defineTable({
      userId: v.id("users"),
      projectId: v.id("projects"),
      version: v.number(),
      scenario: v.string(),
      entries: v.any(),
      totals: v.any(),
      score: v.any(),
      status: v.string(),
      quantitativeVersion: v.optional(v.string()),
      priceVersion: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_project", ["userId", "projectId"])
      .index("by_user_project_version", ["userId", "projectId", "version"]),

    // ── Plans techniques (plomberie / électricité) ──────────────────────────
    // Un document courant par projet + utilisateur + type + variante + niveau.
    // Les positions modifiées manuellement et les quantités sont conservées
    // telles quelles ; les versions successives sont archivées à part.
    projectTechnicalPlans: defineTable({
      projectId: v.id("projects"),
      userId: v.id("users"),
      kind: v.union(v.literal("plomberie"), v.literal("electricite")),
      variantId: v.string(),
      level: v.number(),
      version: v.number(),
      /** Positions modifiées (id du point → { x, y } en mètres). */
      overrides: v.any(),
      /** Quantités calculées au moment de l'enregistrement. */
      quantities: v.any(),
      /** Synthèse (surface, emprise, nombre de points, calories calculées). */
      summary: v.any(),
      note: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_project_user", ["projectId", "userId"])
      .index("by_project_user_kind", ["projectId", "userId", "kind"])
      .index("by_project_user_key", ["projectId", "userId", "kind", "variantId", "level"]),

    // Historique des versions enregistrées (une ligne par sauvegarde).
    projectTechnicalPlanVersions: defineTable({
      projectId: v.id("projects"),
      userId: v.id("users"),
      kind: v.union(v.literal("plomberie"), v.literal("electricite")),
      variantId: v.string(),
      level: v.number(),
      version: v.number(),
      overrides: v.any(),
      quantities: v.any(),
      summary: v.any(),
      note: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_project_user_kind", ["projectId", "userId", "kind"])
      .index("by_project_user_key", ["projectId", "userId", "kind", "variantId", "level"]),

    budgetAnalyses: defineTable({
      projectId: v.id("projects"),
      userId: v.id("users"),
      budgetAvailable: v.number(),
      analyzedAt: v.number(),
      result: v.any(),
    })
      .index("by_project_user", ["projectId", "userId"]),

    // Travaux personnalisés — liste PRÉDÉFINIE de travaux complémentaires
    // choisis par l'utilisateur (Piscine, Garage, Jardin, Panneaux solaires).
    // Seules les clés (et le nombre de panneaux solaires) sont stockées : les
    // coûts sont recalculés à la lecture via le moteur BIM, selon les données du
    // projet et le scénario actif (aucun montant arbitraire, aucune duplication
    // possible — clés uniques).
    projectCustomWorks: defineTable({
      projectId: v.id("projects"),
      userId: v.id("users"),
      /** Clés des travaux sélectionnés (uniques, ordre du catalogue). */
      keys: v.array(v.string()),
      /**
       * Nombre de panneaux solaires choisi (1-5). Le poste solaire se chiffre
       * EXCLUSIVEMENT sur cette quantité : nombre de panneaux × prix unitaire
       * système d'un panneau — jamais sur une surface en m².
       */
      solarPanels: v.optional(v.number()),
      updatedAt: v.number(),
    })
      .index("by_project_user", ["projectId", "userId"]),

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

    // Prestataires recommandés par l'IA pour un projet — association unique
    // (projectId + providerId + type) : un même fournisseur/expert ne peut
    // jamais être recommandé deux fois pour le même projet. Voir
    // `src/convex/recommendedProviders.ts` (matching + déduplication backend).
    projectRecommendedProviders: defineTable({
      projectId: v.id("projects"),
      providerId: v.union(v.id("supplierProfiles"), v.id("expertProfiles")),
      type: v.union(v.literal("supplier"), v.literal("expert")),
      /** Spécialités réellement en correspondance avec le besoin du projet. */
      matchedSpecialties: v.array(v.string()),
      /** 0 = région du projet · 1 = voisine · 2 = reste de la Tunisie. */
      regionRank: v.union(v.literal(0), v.literal(1), v.literal(2)),
      createdAt: v.number(),
    })
      .index("by_project", ["projectId"])
      .index("by_provider", ["providerId"])
      .index("by_pair", ["projectId", "providerId", "type"]),

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
      // Champ historique conservé pour les demandes déjà enregistrées ; le
      // formulaire ne le propose plus (remplacé par le motif obligatoire).
      message: v.optional(v.string()),
      // Motif obligatoire (clé de `src/lib/quoteMotifs.ts`) et précision libre
      // lorsque le motif choisi est « Autre ».
      motif: v.optional(v.string()),
      motifOther: v.optional(v.string()),
      // Pièces jointes : référence de stockage Convex + métadonnées d'affichage.
      attachments: v.optional(
        v.array(
          v.object({
            storageId: v.id("_storage"),
            name: v.string(),
            type: v.string(),
            size: v.number(),
          }),
        ),
      ),
      // Statuts historiques (`pending` / `responded` / `closed`) conservés tels
      // quels — aucune donnée n'est migrée — et enrichis des statuts de gestion
      // en messagerie (En cours / Acceptée / Refusée / Expirée).
      status: v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("responded"),
        v.literal("accepted"),
        v.literal("refused"),
        v.literal("closed"),
        v.literal("expired"),
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
      // Nature du message du fournisseur dans la conversation. Absent sur les
      // anciennes réponses = un devis classique (compatibilité totale).
      kind: v.optional(
        v.union(
          v.literal("quote"),
          v.literal("refusal"),
          v.literal("clarification"),
        ),
      ),
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
        // Catégorie regroupant les métiers techniques du bâtiment et des travaux
        // (spécialité obligatoire : plombier, électricien, maçon, piscinier…).
        v.literal("professionnel"),
        // Valeurs historiques conservées : des profils existants les utilisent
        // encore tant que la migration n'a pas été exécutée par l'administration.
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
      // ── ProMarket : prix indicatifs, disponibilité, acceptation des urgences ──
      // Texte libre affiché tel quel (« À partir de 80 TND », « Sur devis »…).
      indicativePrice: v.optional(v.string()),
      availability: v.optional(
        v.union(
          v.literal("immediate"),
          v.literal("this_week"),
          v.literal("appointment")
        )
      ),
      // Créneaux précisés par l'expert quand la disponibilité = « Rendez-vous ».
      availabilityDetails: v.optional(v.string()),
      acceptsUrgent: v.optional(v.boolean()),
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

    // ── Demandes de rendez-vous (ProMarket ↔ profil expert) ──
    expertAppointments: defineTable({
      userId: v.id("users"),
      expertId: v.id("expertProfiles"),
      projectId: v.optional(v.id("projects")),
      projectName: v.optional(v.string()),
      // Informations du projet transmises avec la demande (affichage expert,
      // e-mails). Optionnelles : les demandes sans projet restent valides.
      projectCategory: v.optional(v.string()),
      projectSurface: v.optional(v.number()),
      // Date souhaitée (timestamp du jour sélectionné) + heure « HH:MM ».
      preferredDate: v.number(),
      preferredTime: v.string(),
      reason: v.string(),
      message: v.optional(v.string()),
      userPhone: v.optional(v.string()),
      userEmail: v.optional(v.string()),
      userName: v.optional(v.string()),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("declined"),
        v.literal("cancelled"),
        v.literal("completed"),
      ),
      decisionMessage: v.optional(v.string()),
      decidedAt: v.optional(v.number()),
      // Rappel « rendez-vous à venir » envoyé une seule fois (idempotence).
      reminderSentAt: v.optional(v.number()),
      readAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_expert", ["expertId"])
      .index("by_status", ["status"])
      .index("by_date", ["preferredDate"]),

    // ── Demandes en urgence (intervention rapide) ──
    expertUrgentRequests: defineTable({
      userId: v.id("users"),
      expertId: v.id("expertProfiles"),
      projectId: v.optional(v.id("projects")),
      projectName: v.optional(v.string()),
      description: v.string(),
      region: v.optional(v.string()),
      userPhone: v.string(),
      userEmail: v.optional(v.string()),
      userName: v.optional(v.string()),
      status: v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("declined"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
      decisionMessage: v.optional(v.string()),
      decidedAt: v.optional(v.number()),
      readAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_expert", ["expertId"])
      .index("by_status", ["status"]),

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
        v.literal("conseils"),
        v.literal("important"),
        v.literal("urgent"),
        v.literal("maintenance"),
      ),
      priority: v.number(),
      imageUrl: v.optional(v.string()),
      imageStorageId: v.optional(v.id("_storage")),
      externalUrl: v.optional(v.string()),
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
