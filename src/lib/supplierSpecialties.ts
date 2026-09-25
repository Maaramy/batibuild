// ============================================================================
// Spécialités fournisseurs / experts — constantes partagées client + serveur
//
// ⚠️ Ce module doit rester SANS dépendance (aucun import). Il est importé par
// les pages/composants du navigateur ET par le schéma Convex. Auparavant ces
// deux constantes vivaient dans `src/convex/schema.ts` : comme cinq fichiers
// du client les importaient, tout le schéma serveur entrait dans le bundle
// navigateur (defineSchema/defineTable de `convex/server`, `authTables` de
// `@convex-dev/auth/server`, donc `@auth/core`, `jose`, `oauth4webapi`,
// `preact`…) — soit ~150 modules de code serveur inutiles côté client, et un
// pic mémoire de build bien plus élevé.
//
// `src/convex/schema.ts` les réexporte pour ne rien casser côté backend.
// ============================================================================

// ⚠️ Spécialités réservées aux fournisseurs de matériaux/services. Les métiers
// de la maîtrise d'œuvre et de la promotion (architecte, bureau d'études,
// ingénieur, géomètre, promoteur immobilier) n'en font plus partie : ils sont
// proposés uniquement dans l'espace Expert (`src/components/expert/
// expertProfileOptions.ts`) et ne doivent jamais réapparaître côté fournisseur.
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
};

/**
 * Anciennes spécialités « métier » retirées de l'espace Fournisseur : elles
 * appartiennent à la maîtrise d'œuvre / promotion et vivent désormais
 * uniquement dans l'espace Expert. Conservées ici pour pouvoir écarter les
 * valeurs historiques encore stockées dans d'anciens profils fournisseurs —
 * aucune donnée n'est supprimée en base, elles ne sont simplement plus
 * proposées ni affichées.
 */
export const REMOVED_SUPPLIER_SPECIALTIES = [
  "architecte",
  "bureau_etudes",
  "ingenieur",
  "geometre",
  "promoteur_immobilier",
] as const;

const REMOVED_SET = new Set<string>(REMOVED_SUPPLIER_SPECIALTIES);

/**
 * Écarte les spécialités retirées d'une liste (valeur stockée sur un profil
 * historique). Les autres valeurs sont laissées intactes.
 */
export function keepSupplierSpecialties(
  values: readonly string[] | undefined | null,
): string[] {
  return (values ?? []).filter((v) => !REMOVED_SET.has(v));
}
