// ============================================================================
// CATALOGUE OFFICIEL DES TYPES DE BIEN (13 types de construction)
// Source unique de vérité pour les menus, formulaires, filtres, calculs et
// résultats de la plateforme Construction.
//
// La liste est alignée sur le module Investissement (INVESTMENT_TYPES) à
// l'exception de « Terrain constructible », qui n'est pas un projet de
// construction. « Maison R+1 » et « Maison R+2 » sont des types de
// construction spécifiques : ils n'existent pas dans le module Investissement
// et sont mappés vers « maison » pour l'analyse de rentabilité. Un même type
// de bien alimente donc les deux modules : le projet de construction
// (quantitatif détaillé / DQE) et l'analyse de rentabilité (investissement).
//
// Les anciens types de projets (rénovation, piscine, garage…)
// restent supportés par LEGACY_PROJECT_TYPE_MAP / LEGACY_TYPE_LABELS et par
// les moteurs (BIM, DQE) afin que les projets déjà enregistrés puissent être
// affichés et recalculés ; ils ne sont plus proposés dans l'interface
// « Nouveau projet ».
// ============================================================================

export const PROJECT_TYPES = [
  // Résidentiel
  "maison",
  "villa",
  "maison_r_plus_1",
  "maison_r_plus_2",
  "appartement",
  "studio",
  "duplex",
  "immeuble",
  // Commercial & tertiaire
  "local_commercial",
  "bureau",
  "entrepot",
  // Tourisme & promotion
  "residence_touristique",
  "projet_neuf",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  maison: "Maison",
  villa: "Villa",
  maison_r_plus_1: "Maison R+1",
  maison_r_plus_2: "Maison R+2",
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
  villa: "Building",
  maison_r_plus_1: "Home",
  maison_r_plus_2: "Building2",
  appartement: "Building2",
  studio: "DoorOpen",
  duplex: "Layers",
  immeuble: "Building2",
  local_commercial: "Store",
  bureau: "Briefcase",
  entrepot: "Package",
  residence_touristique: "Palmtree",
  projet_neuf: "HardHat",
};

/** Groupes d'affichage dans les menus / filtres. */
export const PROJECT_TYPE_GROUPS: { key: string; label: string; types: ProjectType[] }[] = [
  {
    key: "residentiel",
    label: "Résidentiel",
    types: ["maison", "villa", "maison_r_plus_1", "maison_r_plus_2", "appartement", "studio", "duplex", "immeuble"],
  },
  {
    key: "tertiaire",
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
  "maison_r_plus_1",
  "maison_r_plus_2",
  "appartement",
  "studio",
  "duplex",
  "immeuble",
  "residence_touristique",
  "projet_neuf",
  "bureau",
];

/** Types à un seul niveau (rez-de-chaussée imposé). */
export const SINGLE_LEVEL_TYPES: string[] = ["local_commercial", "entrepot", "bureau"];

/** Champs de composition masqués selon le type de bien. */
export const HIDDEN_ROOM_FIELDS: Record<string, string[]> = {
  bureau: ["kitchens", "livingRooms", "garages"],
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
  residence_touristique: { bedrooms: "3", bathrooms: "2", kitchens: "1", livingRooms: "1", garages: "1", wcs: "2", pools: "0" },
  projet_neuf: { bedrooms: "3", bathrooms: "2", kitchens: "1", livingRooms: "1", garages: "1", wcs: "2", pools: "0" },
  bureau: { bedrooms: "2", bathrooms: "1", kitchens: "0", livingRooms: "0", garages: "0", wcs: "1", pools: "0" },
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
  immeuble_residentiel: "immeuble",
  maison_hote: "residence_touristique",
  boutique_commerciale: "local_commercial",
  bureau_cabinet: "bureau",
  atelier: "entrepot",
  ferme: "batiment_agricole",
  serre_agricole: "batiment_agricole",
  renovation_interieure: "renovation_complete",
  renovation_exterieure: "renovation_complete",
  installations_sanitaires: "plomberie_complete",
  installations_electricite: "electricite_complete",
  piscine: "piscine_beton",
  // Anciens types supprimés du catalogue → libellés conservés pour l'affichage
  maison_r_plus_1: "maison_r_plus_1",
  maison_r_plus_2: "maison_r_plus_2",
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
  // Types officiels (1:1 avec INVESTMENT_TYPES, hors « terrain »)
  maison: "maison",
  villa: "villa",
  maison_r_plus_1: "maison",
  maison_r_plus_2: "maison",
  appartement: "appartement",
  studio: "studio",
  duplex: "duplex",
  immeuble: "immeuble",
  local_commercial: "local_commercial",
  bureau: "bureau",
  entrepot: "entrepot",
  residence_touristique: "residence_touristique",
  projet_neuf: "projet_neuf",
  // Anciens types → équivalent d'investissement le plus proche
  immeuble_residentiel: "immeuble",
  maison_hote: "residence_touristique",
  renovation_complete: "appartement",
  renovation_cuisine: "appartement",
  renovation_salle_de_bain: "appartement",
  peinture_interieure: "appartement",
  piscine_beton: "villa",
  piscine_coque: "villa",
  piscine: "villa",
  garage: "local_commercial",
  boutique_commerciale: "local_commercial",
  restaurant: "local_commercial",
  cafe: "local_commercial",
  bureau_cabinet: "bureau",
  atelier: "entrepot",
  ferme: "entrepot",
  serre_agricole: "entrepot",
  batiment_agricole: "entrepot",
  electricite_complete: "appartement",
  plomberie_complete: "appartement",
  installations_sanitaires: "appartement",
  installations_electricite: "appartement",
};

/** Type d'investissement associé à un projet (nouveau ou ancien slug). */
export function investmentTypeForProject(slug: string): string {
  const resolved = resolveProjectType(slug) ?? slug;
  return PROJECT_TO_INVESTMENT_TYPE[resolved] ?? "appartement";
}
