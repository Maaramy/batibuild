import { SUPPLIER_SPECIALTIES } from "@/lib/supplierSpecialties";

// ═══════════════════════════════════════════════════════════════════════════
// MISE EN CORRESPONDANCE MATÉRIAUX ↔ FOURNISSEURS
//
// L'analyse « Matériaux IA » travaille sur des catégories de matériaux
// (id catégorie Copilot : ciment, beton, carrelage…), alors que l'annuaire
// des fournisseurs filtre sur des spécialités de métier inscrites par les
// fournisseurs (SUPPLIER_SPECIALTIES : gros_oeuvre, carrelage, electricite…).
//
// Cette table relie chaque catégorie de matériaux analysée à la (aux)
// spécialité(s) fournisseur(s) correspondante(s), afin de pouvoir ouvrir
// l'annuaire pré-filtré « par région + spécialité » depuis les résultats
// de l'analyse — sans dépendre d'un code fournisseur inexistant.
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

// ── Mise en relation « matériaux du projet » ↔ fournisseurs ────────────────
// Les fournisseurs inscrits déclarent des SPÉCIALITÉS (et non un catalogue
// produit) : on ne peut donc jamais affirmer qu'un article précis est « en
// stock ». On mesure uniquement la CORRESPONDANCE entre le libellé réel de
// l'article et les spécialités déclarées : une correspondance partielle est
// signalée comme telle, et aucun prix / stock n'est inventé.

/** Règle libellé d'article → spécialités fournisseur (ordre = priorité). */
const ARTICLE_SPECIALTY_RULES: Array<{ test: RegExp; specialties: string[] }> = [
  { test: /photovolta|panneau solaire|onduleur|solaire/, specialties: ["energie_solaire", "electricite"] },
  { test: /climatis|chauffage|ventilation|vmc|split/, specialties: ["climatisation", "electricite"] },
  { test: /bois de coffrage|coffrage|banchage/, specialties: ["coffrage", "menuserie_bois"] },
  { test: /ciment|mortier|beton pret|beton de|beton arme|chape|crete/, specialties: ["macconnerie", "beton", "gros_oeuvre"] },
  { test: /sable|gravier|granulat|tout venant|remblai|terrassement|fouille/, specialties: ["terrassement", "gros_oeuvre"] },
  { test: /acier|fer a beton|ferraill|treillis|armature/, specialties: ["ferraillage"] },
  { test: /brique|parpaing|hourdis|bloc|maconnerie|cloison/, specialties: ["macconnerie", "gros_oeuvre"] },
  { test: /carrelage|ceramique|faience|gres|plinthe|pave ceram/, specialties: ["carrelage"] },
  { test: /marbre|granit|pierre naturelle|seuil/, specialties: ["marbre", "carrelage"] },
  { test: /peinture|enduit|platre|ba13|placoplatre|faux plafond|corniche|lissage/, specialties: ["peinture", "second_oeuvre"] },
  { test: /porte|fenetre|vitrage|menuiserie|aluminium|alu |pvc|baie/, specialties: ["portes", "fenetres", "aluminium", "pvc", "menuserie_bois"] },
  { test: /sanitaire|wc |lavabo|vasque|robinet|plomberie|tube|evacuation|chauffe.eau/, specialties: ["plomberie", "salle_de_bain"] },
  { test: /electric|cable|prise|interrupteur|tableau|disjoncteur|luminaire|eclairage/, specialties: ["electricite"] },
  { test: /etanche|isolant|isolation|polystyrene/, specialties: ["etancheite", "isolation"] },
  { test: /piscine|liner|margelle/, specialties: ["piscines"] },
  { test: /gazon|jardin|plantation|terre vegetale|arrosage|paysag/, specialties: ["jardins"] },
  { test: /pave|voirie|bordure|enrobe|trottoir|reseau/, specialties: ["voirie", "terrassement"] },
  { test: /cloture|portail|grillage|garde.corps|escalier|motorisation/, specialties: ["second_oeuvre", "gros_oeuvre"] },
  { test: /cuisine|plan de travail|evier/, specialties: ["cuisine"] },
  { test: /toiture|bac acier|tuile|charpente/, specialties: ["toiture", "charpente"] },
];

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Spécialités fournisseur correspondant au libellé réel d'un article.
 * Aucune correspondance = tableau vide : le fournisseur ne sera jamais
 * présenté comme disponible pour cet article.
 */
export function articleSupplierSpecialties(article: string): string[] {
  const text = normalizeText(article);
  const out: string[] = [];
  for (const rule of ARTICLE_SPECIALTY_RULES) {
    if (!rule.test.test(text)) continue;
    for (const sp of rule.specialties) {
      if (VALID_SPECIALTIES.has(sp) && !out.includes(sp)) out.push(sp);
    }
  }
  return out;
}

/** Article recherché (nom réel, quantité, unité issus du projet). */
export interface MaterialRequest {
  name: string;
  quantity: number;
  unit: string;
}

/** Forme minimale d'un fournisseur inscrit (annuaire). */
export interface SupplierMatchProfile {
  _id: string;
  companyName: string;
  specialties: string[];
  regions?: string[] | null;
  description?: string | null;
}

export interface SupplierMaterialMatch<T extends SupplierMatchProfile> {
  supplier: T;
  /** Articles dont les spécialités déclarées couvrent le besoin. */
  matchedArticles: string[];
  /** Articles non couverts (correspondance partielle). */
  missingArticles: string[];
  /** Part des articles couverts (0 → 1). */
  coverage: number;
  /** Le fournisseur déclare intervenir dans la région du chantier. */
  regionMatch: boolean;
  /** Vrai si le fournisseur ne couvre qu'une partie de la liste. */
  partial: boolean;
}

/**
 * Classe les fournisseurs pour une liste d'articles réels.
 *
 * Priorités : couverture des articles (déclarée via les spécialités), puis
 * région du chantier, puis nombre d'articles. Un fournisseur sans aucune
 * correspondance est exclu (il n'est jamais présenté comme disponible). Une
 * correspondance partielle est conservée et signalée (`partial = true`).
 */
export function matchSuppliersToMaterials<T extends SupplierMatchProfile>(
  materials: readonly MaterialRequest[],
  suppliers: readonly T[],
  region?: string | null,
): SupplierMaterialMatch<T>[] {
  const requests = (materials ?? []).filter((m) => String(m?.name ?? "").trim());
  if (requests.length === 0) return [];

  // Spécialités requises pour chaque article (calculées une seule fois).
  const required = requests.map((m) => ({
    name: m.name,
    specialties: articleSupplierSpecialties(m.name),
  }));
  const wantedRegion = String(region ?? "").trim();

  const results: SupplierMaterialMatch<T>[] = [];
  for (const supplier of suppliers ?? []) {
    const declared = new Set(
      (supplier.specialties ?? []).filter((sp) => VALID_SPECIALTIES.has(sp)),
    );
    if (declared.size === 0) continue;

    const matchedArticles: string[] = [];
    const missingArticles: string[] = [];
    for (const item of required) {
      const covered =
        item.specialties.length > 0 && item.specialties.some((sp) => declared.has(sp));
      if (covered) matchedArticles.push(item.name);
      else missingArticles.push(item.name);
    }
    if (matchedArticles.length === 0) continue;

    const coverage = matchedArticles.length / required.length;
    const regionMatch =
      !wantedRegion || (supplier.regions ?? []).includes(wantedRegion);
    results.push({
      supplier,
      matchedArticles,
      missingArticles,
      coverage,
      regionMatch,
      partial: missingArticles.length > 0,
    });
  }

  return results.sort((a, b) => {
    if (b.coverage !== a.coverage) return b.coverage - a.coverage;
    if (a.regionMatch !== b.regionMatch) return a.regionMatch ? -1 : 1;
    if (b.matchedArticles.length !== a.matchedArticles.length) {
      return b.matchedArticles.length - a.matchedArticles.length;
    }
    return a.supplier.companyName.localeCompare(b.supplier.companyName, "fr");
  });
}
