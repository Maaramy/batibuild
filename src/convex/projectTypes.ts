// ============================================================================
// CATALOGUE OFFICIEL DES TYPES DE PROJET (11 types)
// Aligné exactement sur les types de bien du module Investissement
// (à l'exception de « terrain constructible », qui n'est pas un projet
// de construction).
//
// Types : maison, villa, appartement, studio, duplex, immeuble,
// local_commercial, bureau, entrepot, residence_touristique, projet_neuf
//
// Chaque type dispose d'un gabarit DQE spécifique dans dqeEngine.ts et
// est relié au module Investissement via PROJECT_TO_INVESTMENT_TYPE.
// ============================================================================

export const PROJECT_TYPES = [
  "maison",
  "villa",
  "appartement",
  "studio",
  "duplex",
  "immeuble",
  "local_commercial",
  "bureau",
  "entrepot",
  "residence_touristique",
  "projet_neuf",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  maison: "Maison",
  villa: "Villa",
  appartement: "Appartement",
  studio: "Studio",
  duplex: "Duplex",
  immeuble: "Immeuble",
  local_commercial: "Local commercial",
  bureau: "Bureau",
  entrepot: "Entrepôt",
  residence_touristique: "Résidence touristique",
  projet_neuf: "Projet immobilier neuf",
};

/** Icône Lucide (nom) associée à chaque type — utilisée par l'interface. */
export const PROJECT_TYPE_ICONS: Record<ProjectType, string> = {
  maison: "Home",
  villa: "Building2",
  appartement: "Building",
  studio: "DoorOpen",
  duplex: "Layers",
  immeuble: "Building2",
  local_commercial: "Store",
  bureau: "Briefcase",
  entrepot: "Warehouse",
  residence_touristique: "Palmtree",
  projet_neuf: "HardHat",
};

/** Groupes d'affichage dans les menus / filtres. */
export const PROJECT_TYPE_GROUPS: { key: string; label: string; types: ProjectType[] }[] = [
  {
    key: "residentiel",
    label: "Résidentiel",
    types: ["maison", "villa", "appartement", "studio", "duplex", "immeuble"],
  },
  {
    key: "commercial",
    label: "Commercial & tertiaire",
    types: ["local_commercial", "bureau", "entrepot"],
  },
  {
    key: "tourisme",
    label: "Tourisme & promotion",
    types: ["residence_touristique", "projet_neuf"],
  },
];

/** Types éligibles à l'étape « Composition intérieure » (pièces). */
export const ROOM_ELIGIBLE_TYPES: string[] = [
  "maison",
  "villa",
  "appartement",
  "studio",
  "duplex",
  "immeuble",
  "residence_touristique",
  "projet_neuf",
];

/** Types à un seul niveau (rez-de-chaussée imposé). */
export const SINGLE_LEVEL_TYPES: string[] = ["local_commercial", "entrepot", "bureau"];

/** Champs de composition masqués selon le type de bien. */
export const HIDDEN_ROOM_FIELDS: Record<string, string[]> = {
  bureau: ["kitchens", "livingRooms", "garages"],
  local_commercial: ["kitchens", "livingRooms", "garages"],
  entrepot: ["kitchens", "livingRooms", "garages", "bedrooms"],
};

/** Champs de composition réservés à certains types de bien. */
export const ROOM_ONLY_FOR: Record<string, string[]> = {
  pools: ["villa"],
};

/** Valeurs par défaut des pièces selon le type de bien. */
export const ROOM_DEFAULTS: Record<
  string,
  {
    bedrooms: string;
    bathrooms: string;
    kitchens: string;
    livingRooms: string;
    garages: string;
    wcs: string;
    pools: string;
  }
> = {
  maison: { bedrooms: "2", bathrooms: "1", kitchens: "1", livingRooms: "1", garages: "0", wcs: "1", pools: "0" },
  villa: { bedrooms: "3", bathrooms: "2", kitchens: "1", livingRooms: "1", garages: "1", wcs: "1", pools: "1" },
  appartement: { bedrooms: "2", bathrooms: "1", kitchens: "1", livingRooms: "1", garages: "0", wcs: "1", pools: "0" },
  studio: { bedrooms: "1", bathrooms: "1", kitchens: "1", livingRooms: "0", garages: "0", wcs: "0", pools: "0" },
  duplex: { bedrooms: "3", bathrooms: "2", kitchens: "1", livingRooms: "1", garages: "1", wcs: "1", pools: "0" },
  immeuble: { bedrooms: "3", bathrooms: "1", kitchens: "1", livingRooms: "1", garages: "0", wcs: "1", pools: "0" },
  local_commercial: { bedrooms: "0", bathrooms: "0", kitchens: "0", livingRooms: "0", garages: "0", wcs: "1", pools: "0" },
  bureau: { bedrooms: "0", bathrooms: "0", kitchens: "0", livingRooms: "0", garages: "0", wcs: "1", pools: "0" },
  entrepot: { bedrooms: "0", bathrooms: "0", kitchens: "0", livingRooms: "0", garages: "0", wcs: "0", pools: "0" },
  residence_touristique: { bedrooms: "3", bathrooms: "2", kitchens: "1", livingRooms: "1", garages: "1", wcs: "2", pools: "1" },
  projet_neuf: { bedrooms: "3", bathrooms: "2", kitchens: "1", livingRooms: "1", garages: "1", wcs: "1", pools: "0" },
};

// ============================================================================
// Rétro-compatibilité : anciens slugs → type officiel (recalcul & logique)
// ============================================================================

// clé = ancien slug · valeur = slug officiel de remplacement.
export const LEGACY_PROJECT_TYPE_MAP: Record<string, string> = {
  // Anciens types résidentiels → types officiels
  maison_r_plus_1: "maison",
  maison_r_plus_2: "villa",
  immeuble_residentiel: "immeuble",
  // Anciens types commerciaux → types officiels
  boutique_commerciale: "local_commercial",
  bureau_cabinet: "bureau",
  atelier: "entrepot",
  // Anciens types tourisme → types officiels
  maison_hote: "residence_touristique",
  // Anciens types rénovation → types officiels (projet neuf associé)
  renovation_complete: "projet_neuf",
  renovation_cuisine: "projet_neuf",
  renovation_salle_de_bain: "projet_neuf",
  peinture_interieure: "projet_neuf",
  // Anciens types équipements → types officiels
  piscine_beton: "villa",
  piscine_coque: "villa",
  piscine: "villa",
  garage: "local_commercial",
  // Anciens types technique → types officiels
  batiment_agricole: "entrepot",
  electricite_complete: "projet_neuf",
  plomberie_complete: "projet_neuf",
  ferme: "entrepot",
  serre_agricole: "entrepot",
  installations_sanitaires: "projet_neuf",
  installations_electricite: "projet_neuf",
  restaurant: "local_commercial",
  cafe: "local_commercial",
  // Anciens types supprimés → libellés conservés pour l'affichage
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
  renovation_interieure: "renovation_interieure",
  renovation_exterieure: "renovation_exterieure",
  renovation_facade: "renovation_facade",
  demolition: "demolition",
};

/**
 * Libellés français des anciens types de bien (projets déjà enregistrés).
 * Utilisés par projectTypeLabel pour l'affichage des catégories retirées du
 * catalogue officiel.
 */
export const LEGACY_TYPE_LABELS: Record<string, string> = {
  // Anciens types résidentiels
  maison_r_plus_1: "Maison R+1",
  maison_r_plus_2: "Maison R+2",
  immeuble_residentiel: "Immeuble résidentiel",
  // Anciens types commerciaux
  boutique_commerciale: "Boutique commerciale",
  bureau_cabinet: "Bureau & cabinet",
  atelier: "Atelier",
  // Anciens types tourisme
  maison_hote: "Maison d'hôte",
  // Anciens types rénovation
  renovation_complete: "Rénovation complète",
  renovation_cuisine: "Rénovation cuisine",
  renovation_salle_de_bain: "Rénovation salle de bain",
  peinture_interieure: "Peinture intérieure",
  renovation_interieure: "Rénovation intérieure",
  renovation_exterieure: "Rénovation extérieure",
  renovation_facade: "Rénovation façade",
  demolition: "Démolition",
  // Anciens types équipements
  piscine_beton: "Piscine béton",
  piscine_coque: "Piscine coque",
  piscine: "Piscine",
  garage: "Garage",
  // Anciens types technique
  batiment_agricole: "Bâtiment agricole",
  electricite_complete: "Électricité complète",
  plomberie_complete: "Plomberie complète",
  ferme: "Ferme",
  serre_agricole: "Serre agricole",
  installations_sanitaires: "Installations sanitaires",
  installations_electricite: "Installations électricité",
  restaurant: "Restaurant",
  cafe: "Café",
  // Anciens types supprimés
  jardin: "Jardin",
  amenagement_paysager: "Aménagement paysager",
  cloture: "Clôture",
  mur_de_separation: "Mur de séparation",
  cuisine_exterieure: "Cuisine extérieure",
  terrasse: "Terrasse",
  pergola: "Pergola",
  toiture: "Toiture",
  extension_batiment: "Extension de bâtiment",
  parking: "Parking",
  aire_de_jeux: "Aire de jeux",
  mosquee: "Mosquée",
  ecole: "École",
  hotel: "Hôtel",
  usine: "Usine",
  depot: "Dépôt",
  installation_solaire: "Installation solaire",
  chateau_d_eau: "Château d'eau",
  systeme_irrigation: "Système d'irrigation",
  route: "Route",
  trottoir: "Trottoir",
};

/** Libellé affiché d'un slug de projet (nouveau ou ancien). */
export function projectTypeLabel(slug: string): string {
  const typed = slug as ProjectType;
  if (PROJECT_TYPE_LABELS[typed]) return PROJECT_TYPE_LABELS[typed];
  const legacy = LEGACY_TYPE_LABELS[slug];
  if (legacy) return legacy;
  return slug;
}

/**
 * Résout un slug (nouveau ou ancien) vers le type officiel du catalogue.
 * Retourne null si le slug ne correspond à aucun type connu du catalogue.
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
// Les 11 types officiels correspondent exactement aux types de bien du module
// Investissement (hors « Terrain constructible »).
// ============================================================================

export const PROJECT_TO_INVESTMENT_TYPE: Record<string, string> = {
  // 11 types officiels → équivalent d'investissement (mapping direct 1:1)
  maison: "maison",
  villa: "villa",
  appartement: "appartement",
  studio: "studio",
  duplex: "duplex",
  immeuble: "immeuble",
  local_commercial: "local_commercial",
  bureau: "bureau",
  entrepot: "entrepot",
  residence_touristique: "residence_touristique",
  projet_neuf: "projet_neuf",
  // Anciens types (rétro-compatibilité données existantes)
  maison_r_plus_1: "maison",
  maison_r_plus_2: "villa",
  immeuble_residentiel: "immeuble",
  boutique_commerciale: "local_commercial",
  bureau_cabinet: "bureau",
  atelier: "entrepot",
  maison_hote: "residence_touristique",
  renovation_complete: "projet_neuf",
  renovation_cuisine: "projet_neuf",
  renovation_salle_de_bain: "projet_neuf",
  peinture_interieure: "projet_neuf",
  piscine_beton: "villa",
  piscine_coque: "villa",
  piscine: "villa",
  garage: "local_commercial",
  batiment_agricole: "entrepot",
  electricite_complete: "projet_neuf",
  plomberie_complete: "projet_neuf",
  ferme: "entrepot",
  serre_agricole: "entrepot",
  installations_sanitaires: "projet_neuf",
  installations_electricite: "projet_neuf",
  restaurant: "local_commercial",
  cafe: "local_commercial",
};

/** Type d'investissement associé à un projet (nouveau ou ancien slug). */
export function investmentTypeForProject(slug: string): string {
  const resolved = resolveProjectType(slug) ?? slug;
  return PROJECT_TO_INVESTMENT_TYPE[resolved] ?? "appartement";
}
