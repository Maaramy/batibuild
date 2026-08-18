// ============================================================================
// CATALOGUE OFFICIEL DES TYPES DE PROJET (25 types)
// Source unique de vérité pour les menus, formulaires, filtres, calculs,
// résultats et Quantitatif détaillé / DQE de la plateforme.
//
// Les types sont classés en :
//   • Résidentiel (8)
//   • Rénovation & finitions (4)
//   • Équipements extérieurs (3)
//   • Commercial & tertiaire (6)
//   • Technique & artisanat (4)
//
// Chaque type dispose d'un gabarit DQE spécifique dans dqeEngine.ts et
// est relié au module Investissement via PROJECT_TO_INVESTMENT_TYPE.
// ============================================================================

export const PROJECT_TYPES = [
  // Résidentiel
  "maison",
  "villa",
  "maison_r_plus_1",
  "maison_r_plus_2",
  "immeuble",
  "appartement",
  "studio",
  "duplex",
  // Rénovation & finitions
  "renovation_complete",
  "renovation_cuisine",
  "renovation_salle_de_bain",
  "peinture_interieure",
  // Équipements extérieurs
  "piscine_beton",
  "piscine_coque",
  "garage",
  // Commercial & tertiaire
  "boutique_commerciale",
  "restaurant",
  "cafe",
  "bureau_cabinet",
  "atelier",
  "entrepot",
  "maison_hote",
  // Technique & artisanat
  "batiment_agricole",
  "electricite_complete",
  "plomberie_complete",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  // Résidentiel
  maison: "Maison",
  villa: "Villa",
  maison_r_plus_1: "Maison R+1",
  maison_r_plus_2: "Maison R+2",
  immeuble: "Immeuble résidentiel",
  appartement: "Appartement",
  studio: "Studio",
  duplex: "Duplex",
  // Rénovation & finitions
  renovation_complete: "Rénovation complète",
  renovation_cuisine: "Rénovation cuisine",
  renovation_salle_de_bain: "Rénovation salle de bain",
  peinture_interieure: "Peinture intérieure",
  // Équipements extérieurs
  piscine_beton: "Piscine béton",
  piscine_coque: "Piscine coque",
  garage: "Garage",
  // Commercial & tertiaire
  boutique_commerciale: "Boutique commerciale",
  restaurant: "Restaurant",
  cafe: "Café",
  bureau_cabinet: "Bureau & cabinet",
  atelier: "Atelier",
  entrepot: "Entrepôt",
  maison_hote: "Maison d'hôte",
  // Technique & artisanat
  batiment_agricole: "Bâtiment agricole",
  electricite_complete: "Électricité complète",
  plomberie_complete: "Plomberie complète",
};

/** Icône Lucide (nom) associée à chaque type — utilisée par l'interface. */
export const PROJECT_TYPE_ICONS: Record<ProjectType, string> = {
  // Résidentiel
  maison: "Home",
  villa: "Building",
  maison_r_plus_1: "Home",
  maison_r_plus_2: "Building2",
  immeuble: "Building2",
  appartement: "Building2",
  studio: "DoorOpen",
  duplex: "Layers",
  // Rénovation & finitions
  renovation_complete: "Wrench",
  renovation_cuisine: "CookingPot",
  renovation_salle_de_bain: "Bath",
  peinture_interieure: "PaintBucket",
  // Équipements extérieurs
  piscine_beton: "Waves",
  piscine_coque: "Waves",
  garage: "Car",
  // Commercial & tertiaire
  boutique_commerciale: "Store",
  restaurant: "UtensilsCrossed",
  cafe: "Coffee",
  bureau_cabinet: "Briefcase",
  atelier: "Hammer",
  entrepot: "Package",
  maison_hote: "Palmtree",
  // Technique & artisanat
  batiment_agricole: "Sprout",
  electricite_complete: "Zap",
  plomberie_complete: "Droplets",
};

/** Groupes d'affichage dans les menus / filtres. */
export const PROJECT_TYPE_GROUPS: { key: string; label: string; types: ProjectType[] }[] = [
  {
    key: "residentiel",
    label: "Résidentiel",
    types: ["maison", "villa", "maison_r_plus_1", "maison_r_plus_2", "immeuble", "appartement", "studio", "duplex"],
  },
  {
    key: "renovation",
    label: "Rénovation & finitions",
    types: ["renovation_complete", "renovation_cuisine", "renovation_salle_de_bain", "peinture_interieure"],
  },
  {
    key: "exterieur",
    label: "Équipements extérieurs",
    types: ["piscine_beton", "piscine_coque", "garage"],
  },
  {
    key: "tertiaire",
    label: "Commercial & tertiaire",
    types: ["boutique_commerciale", "restaurant", "cafe", "bureau_cabinet", "atelier", "entrepot", "maison_hote"],
  },
  {
    key: "technique",
    label: "Technique & artisanat",
    types: ["batiment_agricole", "electricite_complete", "plomberie_complete"],
  },
];

/** Types éligibles à l'étape « Composition intérieure » (pièces). */
export const ROOM_ELIGIBLE_TYPES: string[] = [
  "maison",
  "villa",
  "maison_r_plus_1",
  "maison_r_plus_2",
  "immeuble",
  "appartement",
  "studio",
  "duplex",
  "boutique_commerciale",
  "bureau_cabinet",
  "maison_hote",
];

/** Types à un seul niveau (rez-de-chaussée imposé). */
export const SINGLE_LEVEL_TYPES: string[] = ["boutique_commerciale", "entrepot", "atelier", "bureau_cabinet", "garage"];

/** Champs de composition masqués selon le type de bien. */
export const HIDDEN_ROOM_FIELDS: Record<string, string[]> = {
  bureau_cabinet: ["kitchens", "livingRooms", "garages"],
  boutique_commerciale: ["kitchens", "livingRooms", "garages"],
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
  maison_r_plus_1: { bedrooms: "3", bathrooms: "2", kitchens: "1", livingRooms: "1", garages: "1", wcs: "1", pools: "0" },
  maison_r_plus_2: { bedrooms: "4", bathrooms: "2", kitchens: "1", livingRooms: "1", garages: "1", wcs: "1", pools: "0" },
  immeuble: { bedrooms: "3", bathrooms: "1", kitchens: "1", livingRooms: "1", garages: "0", wcs: "1", pools: "0" },
  appartement: { bedrooms: "2", bathrooms: "1", kitchens: "1", livingRooms: "1", garages: "0", wcs: "1", pools: "0" },
  studio: { bedrooms: "1", bathrooms: "1", kitchens: "1", livingRooms: "0", garages: "0", wcs: "0", pools: "0" },
  duplex: { bedrooms: "3", bathrooms: "2", kitchens: "1", livingRooms: "1", garages: "1", wcs: "1", pools: "0" },
  maison_hote: { bedrooms: "3", bathrooms: "2", kitchens: "1", livingRooms: "1", garages: "1", wcs: "2", pools: "0" },
  bureau_cabinet: { bedrooms: "2", bathrooms: "1", kitchens: "0", livingRooms: "0", garages: "0", wcs: "1", pools: "0" },
};

// ============================================================================
// Rétro-compatibilité : anciens slugs → type officiel (recalcul & logique)
// ============================================================================

// clé = ancien slug · valeur = slug officiel de remplacement. Seuls les
// anciens slugs ayant un équivalent structurel dans le catalogue unifié sont
// résolus (le gabarit DQE est alors identique). Les anciens types sans
// équivalent (rénovation, piscine, restaurant…) sont conservés tels quels
// pour l'affichage et le recalcul des projets déjà enregistrés.
export const LEGACY_PROJECT_TYPE_MAP: Record<string, string> = {
  // Anciens slugs officiels → nouveaux slugs officiels (migration)
  local_commercial: "boutique_commerciale",
  bureau: "bureau_cabinet",
  residence_touristique: "maison_hote",
  immeuble_residentiel: "immeuble",
  projet_neuf: "immeuble",
  // Anciens slugs alternatifs → type officiel
  ferme: "batiment_agricole",
  serre_agricole: "batiment_agricole",
  renovation_interieure: "renovation_complete",
  renovation_exterieure: "renovation_complete",
  installations_sanitaires: "plomberie_complete",
  installations_electricite: "electricite_complete",
  piscine: "piscine_beton",
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
};

/**
 * Libellés français des anciens types de bien (projets déjà enregistrés).
 * Utilisés par projectTypeLabel pour l'affichage des catégories retirées du
 * catalogue officiel.
 */
export const LEGACY_TYPE_LABELS: Record<string, string> = {
  maison_r_plus_1: "Maison R+1",
  maison_r_plus_2: "Maison R+2",
  immeuble_residentiel: "Immeuble résidentiel",
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
  batiment_agricole: "Bâtiment agricole",
  electricite_complete: "Électricité complète",
  plomberie_complete: "Plomberie complète",
  jardin: "Jardin",
  amenagement_paysager: "Aménagement paysager",
  cloture: "Clôture",
  mur_de_separation: "Mur de séparation",
  cuisine_exterieure: "Cuisine extérieure",
  terrasse: "Terrasse",
  pergola: "Pergola",
  toiture: "Toiture",
  extension_batiment: "Extension de bâtiment",
  ferme: "Ferme",
  serre_agricole: "Serre agricole",
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
  renovation_interieure: "Rénovation intérieure",
  renovation_exterieure: "Rénovation extérieure",
  renovation_facade: "Rénovation façade",
  demolition: "Démolition",
  installations_sanitaires: "Installations sanitaires",
  installations_electricite: "Installations électricité",
  piscine: "Piscine",
  projet_neuf: "Projet immobilier neuf",
  residence_touristique: "Résidence touristique",
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
// Un projet de construction (avec son Quantitatif détaillé / DQE) alimente une
// analyse d'investissement : coût total de construction → prix d'acquisition ou
// coût de rénovation, surface & région réutilisées. Les 11 types officiels
// correspondent 1:1 aux types de bien du module Investissement (hors « Terrain
// constructible ») ; les anciens types sont mappés vers l'équivalent le plus
// proche pour le pré-remplissage.
// ============================================================================

export const PROJECT_TO_INVESTMENT_TYPE: Record<string, string> = {
  // 25 types officiels → équivalent d'investissement
  maison: "maison",
  villa: "villa",
  maison_r_plus_1: "maison",
  maison_r_plus_2: "maison",
  immeuble: "immeuble",
  appartement: "appartement",
  studio: "studio",
  duplex: "duplex",
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
  maison_hote: "residence_touristique",
  batiment_agricole: "entrepot",
  electricite_complete: "appartement",
  plomberie_complete: "appartement",
  // Anciens types (rétro-compatibilité données existantes)
  local_commercial: "local_commercial",
  bureau: "bureau",
  residence_touristique: "residence_touristique",
  projet_neuf: "projet_neuf",
  immeuble_residentiel: "immeuble",
  piscine: "villa",
  ferme: "entrepot",
  serre_agricole: "entrepot",
  installations_sanitaires: "appartement",
  installations_electricite: "appartement",
};

/** Type d'investissement associé à un projet (nouveau ou ancien slug). */
export function investmentTypeForProject(slug: string): string {
  const resolved = resolveProjectType(slug) ?? slug;
  return PROJECT_TO_INVESTMENT_TYPE[resolved] ?? "appartement";
}
