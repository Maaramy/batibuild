import { SUPPLIER_SPECIALTIES } from "@/lib/supplierSpecialties";

// ═══════════════════════════════════════════════════════════════════════════
// MISE EN CORRESPONDANCE MATÉRIAUX ↔ FOURNISSEURS
//
// Les catégories de matériaux du Quantitatif (id catégorie : ciment, beton,
// carrelage…) diffèrent des spécialités de métier inscrites par les
// fournisseurs (SUPPLIER_SPECIALTIES : gros_oeuvre, carrelage, electricite…).
//
// Cette table relie chaque catégorie de matériaux à la (aux) spécialité(s)
// fournisseur(s) correspondante(s), afin de pouvoir ouvrir l'annuaire
// pré-filtré « par région + spécialité » — sans dépendre d'un code fournisseur
// inexistant.
// ═══════════════════════════════════════════════════════════════════════════

/** Ensemble des spécialités fournisseurs valides (référence schéma). */
const VALID_SPECIALTIES = new Set<string>(SUPPLIER_SPECIALTIES);

export const MATERIAL_CATEGORY_TO_SUPPLIER_SPECIALTIES: Record<string, string[]> = {
  beton: ["beton"],
  ciment: ["gros_oeuvre", "macconnerie"],
  acier: ["ferraillage"],
  briques: ["macconnerie", "gros_oeuvre"],
  blocs_beton: ["macconnerie", "gros_oeuvre", "beton"],
  isolation_thermique: ["isolation"],
  isolation_acoustique: ["isolation"],
  etancheite: ["etancheite"],
  mortier: ["macconnerie"],
  enduit: ["peinture"],
  carrelage: ["carrelage"],
  faience: ["carrelage"],
  pierre_naturelle: ["marbre", "carrelage"],
  marbre: ["marbre"],
  peinture: ["peinture"],
  bois: ["menuserie_bois", "charpente"],
  aluminium: ["aluminium"],
  pvc: ["pvc", "fenetres"],
  verre: ["aluminium", "pvc"],
  menuiserie: ["menuserie_bois", "aluminium", "pvc", "portes"],
  portes: ["portes", "menuserie_bois"],
  revetements_sol: ["carrelage", "marbre"],
  sanitaires: ["plomberie", "salle_de_bain"],
  robinetterie: ["plomberie"],
  electricite: ["electricite"],
  plomberie: ["plomberie"],
  chauffage: ["climatisation", "plomberie", "electricite"],
  climatisation: ["climatisation"],
  equipements_energetiques: ["energie_solaire", "electricite"],
  panneaux_solaires: ["energie_solaire", "electricite"],
  piscine: ["piscines"],
  amenagement_exterieur: ["jardins", "voirie", "piscines"],
};

/**
 * Convertit une liste d'identifiants de catégories matériaux de l'analyse IA
 * en liste dédupliquée et ordonnée de spécialités fournisseurs valides.
 *
 * Les catégories sans correspondance (ex. « autres », « divers ») sont
 * simplement ignorées : elles n'ont pas de filtre spécialité associé.
 */
export function categorySpecialties(categoryIds: string[]): string[] {
  const out: string[] = [];
  for (const id of categoryIds) {
    const mapped = MATERIAL_CATEGORY_TO_SUPPLIER_SPECIALTIES[id] ?? [];
    for (const sp of mapped) {
      if (VALID_SPECIALTIES.has(sp) && !out.includes(sp)) out.push(sp);
    }
  }
  return out;
}
