// ============================================================================
// CATALOGUE OFFICIEL DES TYPES DE PROJETS (25 types)
// Source unique de vérité pour les menus, formulaires, filtres, calculs et
// résultats. Tous les anciens types de projets ont été remplacés par cette
// liste. Les anciens slugs restent uniquement supportés par le moteur BIM
// (MARKET_PRICE_M2 / PROJECT_PCT) pour que les projets déjà enregistrés
// puissent être recalculés ; ils ne sont plus proposés dans l'interface.
// ============================================================================

export const PROJECT_TYPES = [
  // Résidentiel neuf
  "maison",
  "villa",
  "maison_r_plus_1",
  "maison_r_plus_2",
  "immeuble_residentiel",
  "appartement",
  "studio",
  "duplex",
  "maison_hote",
  // Rénovation & peinture
  "renovation_complete",
  "renovation_cuisine",
  "renovation_salle_de_bain",
  "peinture_interieure",
  // Piscines
  "piscine_beton",
  "piscine_coque",
  // Hors résidentiel
  "garage",
  "boutique_commerciale",
  "restaurant",
  "cafe",
  "bureau_cabinet",
  "atelier",
  "entrepot",
  "batiment_agricole",
  // Corps d'état spécialisés
  "electricite_complete",
  "plomberie_complete",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  maison: "Maison",
  villa: "Villa",
  maison_r_plus_1: "Maison R+1",
  maison_r_plus_2: "Maison R+2",
  immeuble_residentiel: "Immeuble résidentiel",
  appartement: "Appartement",
  studio: "Studio",
  duplex: "Duplex",
  maison_hote: "Maison d'hôte",
  renovation_complete: "Rénovation complète",
  renovation_cuisine: "Rénovation cuisine",
  renovation_salle_de_bain: "Rénovation salle de bain",
  peinture_interieure: "Peinture intérieure",
  piscine_beton: "Piscine béton",
  piscine_coque: "Piscine coque",
  garage: "Garage",
  boutique_commerciale: "Boutique commerciale",
  restaurant: "Restaurant",
  cafe: "Café",
  bureau_cabinet: "Bureau & cabinet",
  atelier: "Atelier",
  entrepot: "Entrepôt",
  batiment_agricole: "Bâtiment agricole",
  electricite_complete: "Électricité complète",
  plomberie_complete: "Plomberie complète",
};

/** Icône Lucide (nom) associée à chaque type — utilisée par l'interface. */
export const PROJECT_TYPE_ICONS: Record<ProjectType, string> = {
  maison: "Home",
  villa: "Building2",
  maison_r_plus_1: "Layers",
  maison_r_plus_2: "Layers",
  immeuble_residentiel: "Building",
  appartement: "Building",
  studio: "DoorOpen",
  duplex: "Layers",
  maison_hote: "Palmtree",
  renovation_complete: "Wrench",
  renovation_cuisine: "ChefHat",
  renovation_salle_de_bain: "ShowerHead",
  peinture_interieure: "Paintbrush",
  piscine_beton: "Waves",
  piscine_coque: "Waves",
  garage: "Car",
  boutique_commerciale: "Store",
  restaurant: "UtensilsCrossed",
  cafe: "Coffee",
  bureau_cabinet: "Briefcase",
  atelier: "Hammer",
  entrepot: "Warehouse",
  batiment_agricole: "Tractor",
  electricite_complete: "Zap",
  plomberie_complete: "Droplets",
};

/** Groupes d'affichage dans les menus / filtres. */
export const PROJECT_TYPE_GROUPS: { key: string; label: string; types: ProjectType[] }[] = [
  {
    key: "residentiel",
    label: "Résidentiel",
    types: [
      "maison",
      "villa",
      "maison_r_plus_1",
      "maison_r_plus_2",
      "immeuble_residentiel",
      "appartement",
      "studio",
      "duplex",
      "maison_hote",
    ],
  },
  {
    key: "renovation",
    label: "Rénovation & peinture",
    types: [
      "renovation_complete",
      "renovation_cuisine",
      "renovation_salle_de_bain",
      "peinture_interieure",
    ],
  },
  {
    key: "piscines",
    label: "Piscines",
    types: ["piscine_beton", "piscine_coque"],
  },
  {
    key: "commercial",
    label: "Commercial, tertiaire & industriel",
    types: [
      "garage",
      "boutique_commerciale",
      "restaurant",
      "cafe",
      "bureau_cabinet",
      "atelier",
      "entrepot",
      "batiment_agricole",
    ],
  },
  {
    key: "corps_etat",
    label: "Corps d'état spécialisés",
    types: ["electricite_complete", "plomberie_complete"],
  },
];

/** Types éligibles à l'étape « Composition intérieure » (pièces). */
export const ROOM_ELIGIBLE_TYPES: ProjectType[] = [
  "maison",
  "villa",
  "maison_r_plus_1",
  "maison_r_plus_2",
  "immeuble_residentiel",
  "appartement",
  "studio",
  "duplex",
  "maison_hote",
  "renovation_complete",
  "renovation_cuisine",
  "renovation_salle_de_bain",
];

/** Types à un seul niveau (rez-de-chaussée imposé). */
export const SINGLE_LEVEL_TYPES: ProjectType[] = [
  "garage",
  "boutique_commerciale",
  "restaurant",
  "cafe",
  "bureau_cabinet",
  "atelier",
  "entrepot",
  "batiment_agricole",
  "piscine_beton",
  "piscine_coque",
];

/** Champs de composition masqués selon le type de bien. */
export const HIDDEN_ROOM_FIELDS: Partial<Record<ProjectType, string[]>> = {
  bureau_cabinet: ["kitchens", "livingRooms", "garages"],
  restaurant: ["kitchens", "livingRooms", "garages", "pools"],
  cafe: ["kitchens", "livingRooms", "garages", "pools"],
  boutique_commerciale: ["kitchens", "livingRooms", "garages", "pools"],
};

/** Champs de composition réservés à certains types de bien. */
export const ROOM_ONLY_FOR: Record<string, string[]> = {
  pools: ["villa", "maison_hote"],
};

/** Valeurs par défaut des pièces selon le type de bien. */
export const ROOM_DEFAULTS: Partial<
  Record<
    ProjectType,
    {
      bedrooms: string;
      bathrooms: string;
      kitchens: string;
      livingRooms: string;
      garages: string;
      wcs: string;
      pools: string;
    }
  >
> = {
  maison: { bedrooms: "2", bathrooms: "1", kitchens: "1", livingRooms: "1", garages: "0", wcs: "1", pools: "0" },
  villa: { bedrooms: "3", bathrooms: "2", kitchens: "1", livingRooms: "1", garages: "1", wcs: "1", pools: "1" },
  maison_r_plus_1: { bedrooms: "3", bathrooms: "2", kitchens: "1", livingRooms: "1", garages: "1", wcs: "1", pools: "0" },
  maison_r_plus_2: { bedrooms: "4", bathrooms: "2", kitchens: "1", livingRooms: "2", garages: "1", wcs: "2", pools: "0" },
  immeuble_residentiel: { bedrooms: "3", bathrooms: "1", kitchens: "1", livingRooms: "1", garages: "0", wcs: "1", pools: "0" },
  appartement: { bedrooms: "2", bathrooms: "1", kitchens: "1", livingRooms: "1", garages: "0", wcs: "1", pools: "0" },
  studio: { bedrooms: "1", bathrooms: "1", kitchens: "1", livingRooms: "0", garages: "0", wcs: "0", pools: "0" },
  duplex: { bedrooms: "3", bathrooms: "2", kitchens: "1", livingRooms: "1", garages: "1", wcs: "1", pools: "0" },
  maison_hote: { bedrooms: "4", bathrooms: "3", kitchens: "1", livingRooms: "1", garages: "1", wcs: "2", pools: "1" },
  renovation_complete: { bedrooms: "2", bathrooms: "1", kitchens: "1", livingRooms: "1", garages: "0", wcs: "1", pools: "0" },
  renovation_cuisine: { bedrooms: "0", bathrooms: "0", kitchens: "1", livingRooms: "0", garages: "0", wcs: "0", pools: "0" },
  renovation_salle_de_bain: { bedrooms: "0", bathrooms: "1", kitchens: "0", livingRooms: "0", garages: "0", wcs: "0", pools: "0" },
};

// ============================================================================
// Rétro-compatibilité : anciens slugs → type officiel (affichage & recalcul)
// ============================================================================

// clé = ancien slug · valeur = slug officiel de remplacement. Les anciens
// slugs sans équivalent officiel (jardin, mosquée…) sont conservés tels quels
// uniquement pour l'affichage des projets déjà enregistrés.
export const LEGACY_PROJECT_TYPE_MAP: Record<string, string> = {
  immeuble: "immeuble_residentiel",
  local_commercial: "boutique_commerciale",
  bureau: "bureau_cabinet",
  ferme: "batiment_agricole",
  serre_agricole: "batiment_agricole",
  piscine: "piscine_beton",
  renovation_interieure: "renovation_complete",
  renovation_exterieure: "renovation_complete",
  installations_sanitaires: "plomberie_complete",
  installations_electricite: "electricite_complete",
  // Anciens types supprimés du catalogue → libellés conservés pour l'affichage
  jardin: "jardin",
  amenagement_paysager: "amenagement_paysager",
  cloture: "cloture",
  mur_de_separation: "mur_de_separation",
  cuisine_exterieure: "cuisine_exterieure",
  terrasse: "terrasse",
  pergola: "pergola",
  toiture: "toiture",
  extension_batiment: "extension_batiment",
  parking: "parking",
  aire_de_jeux: "aire_de_jeux",
  mosquee: "mosquee",
  ecole: "ecole",
  hotel: "hotel",
  usine: "usine",
  depot: "depot",
  installation_solaire: "installation_solaire",
  chateau_d_eau: "chateau_d_eau",
  systeme_irrigation: "systeme_irrigation",
  route: "route",
  trottoir: "trottoir",
  renovation_facade: "renovation_facade",
  demolition: "demolition",
  projet_neuf: "projet_neuf",
  residence_touristique: "residence_touristique",
};

/** Libellé affiché d'un slug de projet (nouveau ou ancien). */
export function projectTypeLabel(slug: string): string {
  const typed = slug as ProjectType;
  if (PROJECT_TYPE_LABELS[typed]) return PROJECT_TYPE_LABELS[typed];
  return slug;
}

/**
 * Résout un slug (nouveau ou ancien) vers le type officiel du catalogue.
 * Retourne null si le slug ne correspond à aucun type connu.
 */
export function resolveProjectType(slug: string): ProjectType | null {
  const typed = slug as ProjectType;
  if (PROJECT_TYPES.includes(typed)) return typed;
  const mapped = LEGACY_PROJECT_TYPE_MAP[slug];
  if (mapped && (PROJECT_TYPES as readonly string[]).includes(mapped)) {
    return mapped as ProjectType;
  }
  return null;
}

// ============================================================================
// Lien avec le module Investissement
// Un projet de construction (avec son Quantitatif détaillé / DQE) alimente une
// analyse d'investissement : coût total de construction → prix d'acquisition ou
// coût de rénovation, surface & région réutilisées.
// ============================================================================

export const PROJECT_TO_INVESTMENT_TYPE: Record<string, string> = {
  maison: "maison",
  villa: "villa",
  maison_r_plus_1: "maison",
  maison_r_plus_2: "maison",
  immeuble_residentiel: "immeuble",
  appartement: "appartement",
  studio: "studio",
  duplex: "duplex",
  maison_hote: "residence_touristique",
  renovation_complete: "appartement",
  renovation_cuisine: "appartement",
  renovation_salle_de_bain: "appartement",
  peinture_interieure: "appartement",
  piscine_beton: "villa",
  piscine_coque: "villa",
  garage: "local_commercial",
  boutique_commerciale: "local_commercial",
  restaurant: "local_commercial",
  cafe: "local_commercial",
  bureau_cabinet: "bureau",
  atelier: "entrepot",
  entrepot: "entrepot",
  batiment_agricole: "terrain",
  electricite_complete: "appartement",
  plomberie_complete: "appartement",
};

/** Type d'investissement associé à un projet (nouveau ou ancien slug). */
export function investmentTypeForProject(slug: string): string {
  const resolved = resolveProjectType(slug) ?? slug;
  return PROJECT_TO_INVESTMENT_TYPE[resolved] ?? "appartement";
}
