/**
 * ProMarket — catalogue partagé (module SANS aucune dépendance).
 *
 * Ce fichier est importable côté navigateur ET côté Convex : il ne doit donc
 * jamais importer `src/convex/schema.ts` (qui tire `@convex-dev/auth/server`
 * dans le bundle client — cf. src/lib/clientBundleGuards.test.ts).
 */

// ============================================================================
// Catégories (6 groupes) — cf. cahier des charges ProMarket §3
// ============================================================================

export type ProMarketCategorySlug =
  | "construction"
  | "finitions"
  | "installations"
  | "maintenance"
  | "exterieur"
  | "services";

export interface ProMarketCategory {
  slug: ProMarketCategorySlug;
  label: string;
  icon: string;
  description: string;
}

export const PROMARKET_CATEGORIES: ProMarketCategory[] = [
  {
    slug: "construction",
    label: "Construction",
    icon: "HardHat",
    description: "Gros œuvre, maçonnerie, fondations et structures",
  },
  {
    slug: "finitions",
    label: "Finitions",
    icon: "Paintbrush",
    description: "Peinture, carrelage, plâtrerie, menuiserie",
  },
  {
    slug: "installations",
    label: "Installations techniques",
    icon: "Zap",
    description: "Plomberie, électricité, climatisation, sanitaire",
  },
  {
    slug: "maintenance",
    label: "Maintenance & dépannage",
    icon: "Wrench",
    description: "Serrurerie, dépannage, entretien, réparations",
  },
  {
    slug: "exterieur",
    label: "Aménagement extérieur",
    icon: "Palmtree",
    description: "Jardins, piscines, paysagisme, aménagements",
  },
  {
    slug: "services",
    label: "Services professionnels",
    icon: "DraftingCompass",
    description: "Architectes, ingénieurs, bureaux d'études, experts",
  },
];

export const PROMARKET_CATEGORY_LABELS: Record<string, string> =
  Object.fromEntries(PROMARKET_CATEGORIES.map((c) => [c.slug, c.label]));

// ============================================================================
// Métiers — catalogue officiel
// ============================================================================

export interface ProMarketTrade {
  slug: string;
  label: string;
  category: ProMarketCategorySlug;
  icon: string;
  /** Mots-clés utilisés par l'assistant IA pour reconnaître le besoin. */
  keywords: string[];
}

export const PROMARKET_TRADES: ProMarketTrade[] = [
  // ── Construction ──────────────────────────────────────────────────────────
  { slug: "macon", label: "Maçon", category: "construction", icon: "HardHat", keywords: ["macon", "maçonnerie", "maçonnerie", "mur", "brique", "parpaing", "beton", "béton"] },
  { slug: "entreprise_construction", label: "Entreprise de construction", category: "construction", icon: "Building2", keywords: ["entreprise de construction", "constructeur", "entreprise generale", "bâtir", "construction"] },
  { slug: "chef_chantier", label: "Chef de chantier", category: "construction", icon: "ClipboardList", keywords: ["chef de chantier", "conduite de chantier", "suivi de chantier", "chantier"] },
  { slug: "coffreur", label: "Coffreur", category: "construction", icon: "Boxes", keywords: ["coffreur", "coffrage", "banche", "dalle"] },
  { slug: "ferrailleur", label: "Ferrailleur", category: "construction", icon: "Layers", keywords: ["ferrailleur", "ferraillage", "acier", "armature", "fer a beton"] },
  { slug: "etancheur", label: "Étancheur", category: "construction", icon: "Droplets", keywords: ["etancheur", "étanchéité", "infiltration", "toiture terrasse", "humidite", "humidité", "fuite toiture"] },
  { slug: "terrassier", label: "Terrassier", category: "construction", icon: "Truck", keywords: ["terrassier", "terrassement", "excavation", "fouille", "nivellement", "pelle"] },

  // ── Finitions ─────────────────────────────────────────────────────────────
  { slug: "peintre", label: "Peintre", category: "finitions", icon: "Paintbrush", keywords: ["peintre", "peinture", "badigeon", "enduit", "lisser", "repeindre"] },
  { slug: "carreleur", label: "Carreleur", category: "finitions", icon: "LayoutGrid", keywords: ["carreleur", "carrelage", "faience", "faïence", "revetement sol", "revêtement", "grès"] },
  { slug: "platrier", label: "Plâtrier", category: "finitions", icon: "Layers3", keywords: ["platrier", "plâtrier", "platre", "plâtre", "placo", "placoplatre", "faux plafond", "staff"] },
  { slug: "poseur_revetement", label: "Poseur de revêtement", category: "finitions", icon: "Layers", keywords: ["poseur de revetement", "parquet", "stratifie", "vinyle", "moquette", "revetement mural"] },
  { slug: "menuisier", label: "Menuisier", category: "finitions", icon: "DoorOpen", keywords: ["menuisier", "menuiserie", "bois", "placard", "dressing", "cuisine en bois", "meuble"] },
  { slug: "aluminium", label: "Aluminium", category: "finitions", icon: "LayoutGrid", keywords: ["aluminium", "alu", "vitrage", "baie vitree", "veranda", "chassis alu"] },
  { slug: "poseur_portes_fenetres", label: "Poseur de portes et fenêtres", category: "finitions", icon: "DoorOpen", keywords: ["porte", "fenetre", "fenêtre", "pose de porte", "volet", "store", "portail"] },

  // ── Installations techniques ──────────────────────────────────────────────
  { slug: "plombier", label: "Plombier", category: "installations", icon: "Droplets", keywords: ["plombier", "plomberie", "fuite", "fuite d'eau", "tuyau", "robinet", "canalisation", "degat des eaux", "dégât des eaux", "chauffe-eau"] },
  { slug: "electricien", label: "Électricien", category: "installations", icon: "Zap", keywords: ["electricien", "électricien", "electricite", "électricité", "panne electrique", "tableau electrique", "disjoncteur", "prise", "cablage", "court-circuit"] },
  { slug: "climaticien", label: "Climaticien", category: "installations", icon: "Waves", keywords: ["climaticien", "climatisation", "clim", "climatiseur", "plit", "split", "froid", "charger gaz"] },
  { slug: "chauffagiste", label: "Chauffagiste", category: "installations", icon: "Sun", keywords: ["chauffagiste", "chauffage", "chaudiere", "chaudière", "radiateur", "plancher chauffant"] },
  { slug: "installateur_sanitaire", label: "Installateur sanitaire", category: "installations", icon: "ShowerHead", keywords: ["sanitaire", "salle de bain", "salle de bain complete", "wc", "lavabo", "douche", "baignoire"] },
  { slug: "photovoltaique", label: "Installateur photovoltaïque", category: "installations", icon: "Sun", keywords: ["photovoltaique", "solaire", "panneau solaire", "energie solaire", "onduleur"] },
  { slug: "installateur_reseau", label: "Installateur réseau", category: "installations", icon: "Plug", keywords: ["reseau", "réseau", "internet", "cablage reseau", "camera", "domotique", "alarme"] },

  // ── Maintenance & dépannage ───────────────────────────────────────────────
  { slug: "serrurier", label: "Serrurier", category: "maintenance", icon: "LockKeyhole", keywords: ["serrurier", "serrure", "cle", "clé", "porte bloquee", "blindage", "ouvrir porte"] },
  { slug: "reparateur_electromenager", label: "Réparateur électroménager", category: "maintenance", icon: "Plug", keywords: ["electromenager", "électroménager", "machine a laver", "refrigerateur", "réfrigérateur", "four", "frigo"] },
  { slug: "reparateur_plomberie", label: "Réparateur plomberie", category: "maintenance", icon: "Wrench", keywords: ["reparation plomberie", "debouchage", "débouchage", "evier bouche", "évier", "chasse d'eau"] },
  { slug: "reparateur_electrique", label: "Réparateur électrique", category: "maintenance", icon: "Zap", keywords: ["depannage electrique", "réparation électrique", "urgence electrique"] },
  { slug: "maintenance_clim", label: "Maintenance climatisation", category: "maintenance", icon: "Waves", keywords: ["entretien climatisation", "maintenance clim", "nettoyage clim", "recharge gaz"] },

  // ── Aménagement extérieur ─────────────────────────────────────────────────
  { slug: "jardinier", label: "Jardinier", category: "exterieur", icon: "Palmtree", keywords: ["jardinier", "jardin", "gazon", "elagage", "élagage", "taille haie", "arrosage"] },
  { slug: "pisciniste", label: "Pisciniste", category: "exterieur", icon: "Waves", keywords: ["pisciniste", "piscine", "entretien piscine", "pompe piscine", "filtration"] },
  { slug: "paysagiste", label: "Paysagiste", category: "exterieur", icon: "Palmtree", keywords: ["paysagiste", "paysage", "amenagement jardin", "espace vert", "terrasse exterieure"] },
  { slug: "amenagement_exterieur", label: "Aménagement extérieur", category: "exterieur", icon: "HardHat", keywords: ["amenagement exterieur", "cloture", "clôture", "pavé", "pave", "allee", "perron", "terrasse"] },

  // ── Services professionnels ───────────────────────────────────────────────
  { slug: "architecte", label: "Architecte", category: "services", icon: "DraftingCompass", keywords: ["architecte", "plan", "permis de batir", "permis de bâtir", "conception", "esquisse", "plan architectural"] },
  { slug: "ingenieur", label: "Ingénieur", category: "services", icon: "Calculator", keywords: ["ingenieur", "ingénieur", "structure", "beton arme", "note de calcul", "genie civil"] },
  { slug: "bureau_etudes", label: "Bureau d'études", category: "services", icon: "ClipboardCheck", keywords: ["bureau d'etudes", "bureau d'études", "etude technique", "suivi technique", "dossier"] },
  { slug: "geometre", label: "Géomètre", category: "services", icon: "Compass", keywords: ["geometre", "géomètre", "bornage", "leve topographique", "relevé", "cadastre", "limite de terrain"] },
  { slug: "expert_immobilier", label: "Expert immobilier", category: "services", icon: "Scale", keywords: ["expert immobilier", "estimation immobiliere", "evaluation", "évaluation", "expertise"] },
  { slug: "decorateur", label: "Décorateur", category: "services", icon: "Palette", keywords: ["decorateur", "décorateur", "decoration", "décoration", "interieur design", "aménagement intérieur"] },
];

export const PROMARKET_TRADE_LABELS: Record<string, string> = Object.fromEntries(
  PROMARKET_TRADES.map((t) => [t.slug, t.label]),
);

export const PROMARKET_CATEGORY_BY_TRADE: Record<string, string> =
  Object.fromEntries(PROMARKET_TRADES.map((t) => [t.slug, t.category]));

/** Tous les métiers ProMarket valides (validation serveur). */
export function isProMarketTrade(slug: string | undefined | null): boolean {
  return Boolean(slug && PROMARKET_TRADE_LABELS[slug]);
}

/**
 * RÈGLE D'ACCÈS PROFESSIONNELS — ProMarket n'accueille que des Experts
 * BatiBuild. La profession déclarée sur le profil Expert détermine le métier
 * ProMarket par défaut (l'expert peut ensuite préciser un métier du catalogue).
 */
export const PROMARKET_TRADE_BY_EXPERT_PROFESSION: Record<string, string> = {
  architecte: "architecte",
  bureau_etudes: "bureau_etudes",
  ingenieur: "ingenieur",
  promoteur_immobilier: "entreprise_construction",
  plombier: "plombier",
  electricien: "electricien",
};

export function expertProfessionTrade(profession: string | undefined): string {
  if (!profession) return "";
  return PROMARKET_TRADE_BY_EXPERT_PROFESSION[profession] ?? "";
}

export function promarketTradeLabel(slug: string | undefined): string {
  if (!slug) return "";
  return PROMARKET_TRADE_LABELS[slug] ?? slug;
}

export function promarketCategoryLabel(slug: string | undefined): string {
  if (!slug) return "";
  return PROMARKET_CATEGORY_LABELS[slug] ?? slug;
}

// ============================================================================
// Gouvernorats & villes (Tunisie)
// ============================================================================

export interface ProMarketRegion {
  slug: string;
  label: string;
  cities: string[];
  lat: number;
  lng: number;
}

export const PROMARKET_REGIONS: ProMarketRegion[] = [
  { slug: "tunis", label: "Tunis", lat: 36.8065, lng: 10.1815, cities: ["Tunis centre", "La Marsa", "Le Bardo", "La Goulette", "Carthage", "Sidi Bou Saïd", "El Menzah", "El Manar", "Bab Souika"] },
  { slug: "ariana", label: "Ariana", lat: 36.8625, lng: 10.1956, cities: ["Ariana Ville", "Raoued", "Soukra", "Borj Louzir", "Ennasr", "Sidi Thabet"] },
  { slug: "ben_arous", label: "Ben Arous", lat: 36.7531, lng: 10.2283, cities: ["Ben Arous", "Radès", "Ezzahra", "Hammam Lif", "Mégrine", "Fouchana", "Mornag"] },
  { slug: "manouba", label: "Manouba", lat: 36.8089, lng: 10.0875, cities: ["Manouba", "Denden", "Oued Ellil", "Douar Hicher", "Borj Toumi"] },
  { slug: "nabeul", label: "Nabeul", lat: 36.4513, lng: 10.7357, cities: ["Nabeul", "Hammamet", "Kelibia", "Korba", "Dar Chaabane", "Menzel Temime"] },
  { slug: "zaghouan", label: "Zaghouan", lat: 36.4029, lng: 10.1429, cities: ["Zaghouan", "El Fahs", "Nadhour", "Bir Mcherga"] },
  { slug: "bizerte", label: "Bizerte", lat: 37.2744, lng: 9.8739, cities: ["Bizerte", "Menzel Bourguiba", "Ras Jebel", "Mateur", "Menzel Jemil"] },
  { slug: "beja", label: "Béja", lat: 36.7256, lng: 9.1817, cities: ["Béja", "Testour", "Teboursouk", "Nefza"] },
  { slug: "jendouba", label: "Jendouba", lat: 36.5011, lng: 8.7802, cities: ["Jendouba", "Tabarka", "Aïn Draham", "Bou Salem"] },
  { slug: "le_kef", label: "Le Kef", lat: 36.1742, lng: 8.7049, cities: ["Le Kef", "Dahmani", "Tajerouine", "Sakiet Sidi Youssef"] },
  { slug: "siliana", label: "Siliana", lat: 36.0843, lng: 9.3708, cities: ["Siliana", "Makthar", "Bouarada", "Gaâfour"] },
  { slug: "kairouan", label: "Kairouan", lat: 35.6781, lng: 10.0963, cities: ["Kairouan", "Sbikha", "Haffouz", "Oueslatia"] },
  { slug: "kasserine", label: "Kasserine", lat: 35.1676, lng: 8.8365, cities: ["Kasserine", "Sbeitla", "Feriana", "Thala"] },
  { slug: "sidi_bouzid", label: "Sidi Bouzid", lat: 35.0382, lng: 9.4849, cities: ["Sidi Bouzid", "Regueb", "Meknassy", "Jelma"] },
  { slug: "sousse", label: "Sousse", lat: 35.8256, lng: 10.6084, cities: ["Sousse", "Hammam Sousse", "Msaken", "Kalaa Kebira", "Akouda", "Chott Meriem"] },
  { slug: "monastir", label: "Monastir", lat: 35.7643, lng: 10.8113, cities: ["Monastir", "Sahline", "Jemmal", "Zeramdine", "Skanes"] },
  { slug: "mahdia", label: "Mahdia", lat: 35.5047, lng: 11.0622, cities: ["Mahdia", "Ksour Essef", "Chebba", "El Jem", "Rejiche"] },
  { slug: "sfax", label: "Sfax", lat: 34.7406, lng: 10.7603, cities: ["Sfax Ville", "Sakiet Ezzit", "Sakiet Eddaïer", "Chihia", "Thyna", "Gremda"] },
  { slug: "gabes", label: "Gabès", lat: 33.8815, lng: 10.0982, cities: ["Gabès", "Mareth", "El Hamma", "Ghannouch"] },
  { slug: "medenine", label: "Médenine", lat: 33.3549, lng: 10.5055, cities: ["Médenine", "Djerba Houmt Souk", "Djerba Midoun", "Zarzis", "Ben Gardane"] },
  { slug: "tataouine", label: "Tataouine", lat: 32.9297, lng: 10.4518, cities: ["Tataouine", "Ghomrassen", "Remada", "Bir Lahmar"] },
  { slug: "gafsa", label: "Gafsa", lat: 34.425, lng: 8.7842, cities: ["Gafsa", "Metlaoui", "Redeyef", "Moularès"] },
  { slug: "tozeur", label: "Tozeur", lat: 33.9197, lng: 8.1335, cities: ["Tozeur", "Nefta", "Degache", "Hazoua"] },
  { slug: "kebili", label: "Kébili", lat: 33.7044, lng: 8.969, cities: ["Kébili", "Douz", "Souk Lahad", "Faouar"] },
];

export const PROMARKET_REGION_LABELS: Record<string, string> = Object.fromEntries(
  PROMARKET_REGIONS.map((r) => [r.slug, r.label]),
);

export function promarketRegionLabel(slug: string | undefined): string {
  if (!slug) return "";
  return PROMARKET_REGION_LABELS[slug] ?? slug;
}

export function promarketRegion(slug: string): ProMarketRegion | undefined {
  return PROMARKET_REGIONS.find((r) => r.slug === slug);
}

// ============================================================================
// Statuts, disponibilité, tri
// ============================================================================

export const PROMARKET_REQUEST_STATUSES = [
  "new",
  "contact",
  "quote_requested",
  "quote_received",
  "discussing",
  "accepted",
  "in_progress",
  "done",
  "canceled",
] as const;
export type ProMarketRequestStatus =
  (typeof PROMARKET_REQUEST_STATUSES)[number];

export const PROMARKET_REQUEST_STATUS_LABELS: Record<string, string> = {
  new: "Nouvelle demande",
  contact: "Contact établi",
  quote_requested: "Devis demandé",
  quote_received: "Devis reçu",
  discussing: "En discussion",
  accepted: "Accepté",
  in_progress: "Intervention en cours",
  done: "Terminé",
  canceled: "Annulé",
};

/** Classes Tailwind du badge de statut (design system BatiBuild). */
export const PROMARKET_REQUEST_STATUS_CLASSES: Record<string, string> = {
  new: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  contact: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400",
  quote_requested: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400",
  quote_received: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400",
  discussing: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400",
  accepted: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  done: "bg-emerald-600/10 text-emerald-700 border-emerald-600/20 dark:text-emerald-400",
  canceled: "bg-muted text-muted-foreground border-border",
};

export const PROMARKET_AVAILABILITIES = [
  "immediate",
  "week",
  "busy",
] as const;
export type ProMarketAvailability = (typeof PROMARKET_AVAILABILITIES)[number];

export const PROMARKET_AVAILABILITY_LABELS: Record<string, string> = {
  immediate: "Disponible immédiatement",
  week: "Disponible cette semaine",
  busy: "Sur rendez-vous",
};

export const PROMARKET_SORTS = [
  "relevance",
  "nearest",
  "rating",
  "reviews",
  "verified",
  "price",
  "availability",
] as const;
export type ProMarketSort = (typeof PROMARKET_SORTS)[number];

export const PROMARKET_SORT_LABELS: Record<string, string> = {
  relevance: "Pertinence",
  nearest: "Plus proche",
  rating: "Mieux noté",
  reviews: "Plus d'avis",
  verified: "Professionnels vérifiés",
  price: "Prix croissant",
  availability: "Disponibilité immédiate",
};

export const PROMARKET_KINDS = ["independant", "entreprise"] as const;
export type ProMarketKind = (typeof PROMARKET_KINDS)[number];

export const PROMARKET_REVIEW_CRITERIA = [
  "quality",
  "punctuality",
  "professionalism",
  "value",
  "communication",
] as const;
export type ProMarketReviewCriterion =
  (typeof PROMARKET_REVIEW_CRITERIA)[number];

export const PROMARKET_REVIEW_CRITERIA_LABELS: Record<string, string> = {
  quality: "Qualité du travail",
  punctuality: "Ponctualité",
  professionalism: "Professionnalisme",
  value: "Rapport qualité/prix",
  communication: "Communication",
};

// ============================================================================
// Intégration Projet — métiers suggérés selon le type de projet BatiBuild
// ============================================================================

/**
 * Métiers pertinents pour un type de projet BatiBuild.
 *
 * Même logique que l'assistant ProMarket : une correspondance déterministe et
 * lisible (aucune clé d'API), utilisée par « Trouver des professionnels pour ce
 * projet » sur la page d'un projet.
 */
export const PROMARKET_TRADES_BY_PROJECT_CATEGORY: Record<string, string[]> = {
  maison: ["macon", "electricien", "plombier", "peintre", "carreleur", "menuisier"],
  villa: ["macon", "electricien", "plombier", "carreleur", "pisciniste", "paysagiste"],
  appartement: ["electricien", "plombier", "peintre", "carreleur", "menuisier"],
  studio: ["electricien", "plombier", "peintre", "menuisier"],
  duplex: ["macon", "electricien", "plombier", "peintre", "carreleur"],
  immeuble: ["entreprise_construction", "chef_chantier", "coffreur", "ferrailleur", "electricien"],
  local_commercial: ["electricien", "peintre", "climaticien", "menuisier", "installateur_reseau"],
  bureau: ["electricien", "peintre", "installateur_reseau", "climaticien", "menuisier"],
  entrepot: ["macon", "electricien", "etancheur", "installateur_reseau"],
  residence_touristique: ["entreprise_construction", "chef_chantier", "plombier", "electricien", "pisciniste"],
  projet_neuf: ["macon", "electricien", "plombier", "peintre", "carreleur", "menuisier"],
  renovation_complete: ["macon", "electricien", "plombier", "peintre", "carreleur", "menuisier", "climaticien"],
  extension_batiment: ["macon", "coffreur", "ferrailleur", "electricien", "plombier"],
  renovation_cuisine: ["menuisier", "plombier", "electricien", "carreleur", "installateur_sanitaire"],
  renovation_salle_de_bain: ["installateur_sanitaire", "carreleur", "plombier", "electricien", "etancheur"],
  peinture_interieure: ["peintre", "platrier"],
  piscine: ["pisciniste", "macon", "carreleur", "paysagiste"],
  restaurant: ["electricien", "plombier", "climaticien", "carreleur", "menuisier"],
  cafe: ["electricien", "plombier", "climaticien", "menuisier"],
  electricite_complete: ["electricien", "installateur_reseau"],
  plomberie_complete: ["plombier", "installateur_sanitaire", "chauffagiste"],
};

/** Métiers suggérés pour un type de projet (repli : gros œuvre + finitions). */
export function suggestTradesForProject(category: string | undefined): string[] {
  if (!category) return ["macon", "electricien", "plombier", "peintre"];
  return (
    PROMARKET_TRADES_BY_PROJECT_CATEGORY[category] ?? [
      "macon",
      "electricien",
      "plombier",
      "peintre",
      "carreleur",
    ]
  );
}

// ============================================================================
// Assistant ProMarket — interprétation d'un besoin exprimé en langage naturel
// ============================================================================

export interface ProMarketNeed {
  /** Texte original. */
  query: string;
  trade?: string;
  category?: string;
  region?: string;
  city?: string;
  urgent: boolean;
  homeService: boolean;
  /** Mots-clés reconnus (utilisés pour expliquer la compréhension). */
  matchedKeywords: string[];
  confidence: number;
}

/** Normalise une chaîne (minuscules, sans accents) pour la comparaison. */
export function normalizeProMarketText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const URGENT_KEYWORDS = [
  "urgent",
  "urgence",
  "tout de suite",
  "immediatement",
  "au plus vite",
  "des maintenant",
  "aujourd'hui",
  "aujourd hui",
  "emergency",
];

const HOME_KEYWORDS = [
  "a domicile",
  "chez moi",
  "sur place",
  "domicile",
  "chez nous",
];

/**
 * Interprète un besoin utilisateur (« Je cherche un plombier pour réparer une
 * fuite dans ma salle de bain à Ariana ») : métier, localisation, urgence.
 *
 * Implémentation déterministe (dictionnaires de mots-clés) : aucune clé d'API
 * requise, résultat stable et testable côté Convex comme côté client.
 */
export function interpretProMarketNeed(
  query: string,
  options?: { region?: string; city?: string },
): ProMarketNeed {
  const normalized = normalizeProMarketText(query ?? "");
  const matched: string[] = [];
  let best: { trade: ProMarketTrade; score: number } | undefined;

  for (const trade of PROMARKET_TRADES) {
    let score = 0;
    // Le libellé exact du métier compte double (« plombier », « carreleur »).
    if (normalized.includes(normalizeProMarketText(trade.label))) {
      score += 3;
      matched.push(trade.label);
    }
    for (const kw of trade.keywords) {
      const nk = normalizeProMarketText(kw);
      if (nk.length >= 4 && normalized.includes(nk)) {
        score += 1;
        matched.push(kw);
      }
      // Le slug reste un signal fort (« electricien », « climaticien »).
      if (
        normalized.includes(trade.slug.replace(/_/g, " ")) ||
        normalized.includes(trade.slug.replace(/_/g, ""))
      ) {
        score += 2;
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { trade, score };
  }

  // Localisation : gouvernorat puis ville reconnus dans le texte.
  let region = options?.region;
  let city = options?.city;
  if (!region) {
    for (const r of PROMARKET_REGIONS) {
      const needle = normalizeProMarketText(r.label);
      if (normalized.includes(needle)) {
        region = r.slug;
        break;
      }
      const found = r.cities.find((c) => normalized.includes(normalizeProMarketText(c)));
      if (found) {
        region = r.slug;
        city = city ?? found;
        break;
      }
    }
  }

  const urgent = URGENT_KEYWORDS.some((k) => normalized.includes(k));
  const homeService = HOME_KEYWORDS.some((k) => normalized.includes(k));

  const confidence = best ? Math.min(1, best.score / 5) : 0;

  return {
    query,
    trade: best?.trade.slug,
    category: best?.trade.category,
    region,
    city,
    urgent,
    homeService,
    matchedKeywords: [...new Set(matched)].slice(0, 8),
    confidence,
  };
}

/** Distance approximative (km) entre deux points géographiques (Haversine). */
export function promarketDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

export const PROMARKET_DISTANCE_OPTIONS = [1, 3, 5, 10, 25, 0] as const;
