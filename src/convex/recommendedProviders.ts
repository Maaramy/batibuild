// ============================================================================
// PRESTATAIRES RECOMMANDÉS PAR L'IA — Génération dynamique par projet
//
// Remplace la liste statique `providerRecommendations` par un système dynamique :
//
//   Projet (type + DQE + région)
//     → besoins détectés (spécialités fournisseurs / corps de métiers)
//     → filtrage des profils fournisseurs & experts éligibles (actifs, publiés)
//     → priorité région du projet, puis régions voisines, puis toute la Tunisie
//     → randomisation seedée parmi les éligibles (jamais un profil hors besoin)
//     → persistance dans `projectRecommendedProviders` avec déduplication
//       stricte (projectId + providerId + type) — un même prestataire ne peut
//       jamais être associé deux fois au même projet.
//
// La logique pure (matching, scoring, sélection) est séparée des fonctions
// Convex afin d'être testable directement (`recommendedProviders.test.ts`).
//
// ⚠️ Aucun `await import()` dynamique (non supporté par Convex) : les tables
// statiques ci-dessous servent de dispatch. Aucun faux profil n'est créé :
// seuls les profils réels actifs et visibles sont éligibles. Le DQE et les
// données du projet ne sont jamais modifiés (lecture seule).
// ============================================================================

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { getFreePlanStatus, isProfilePaymentActive } from "./access";
import { SPECIALTY_TO_PROVIDER_TYPE } from "./schema";
import {
  SUPPLIER_SPECIALTIES_LABELS,
  keepSupplierSpecialties,
} from "../lib/supplierSpecialties";
import {
  EXPERT_PROFESSION_LABELS,
  normalizeExpertProfession,
} from "../lib/expertProfessions";
import { resolveProjectType } from "./projectTypes";

// ============================================================================
// 1. BIBLIOTHÈQUE DE BESOINS — type de projet → spécialités fournisseurs
//    (clés = SUPPLIER_SPECIALTIES, donc compatibles avec les profils réels)
//
//    ⚠️ Deux besoins historiques (« architecte », « bureau_etudes ») ne sont
//    plus des spécialités fournisseur : ils restent dans ces listes car ils
//    servent aussi à faire correspondre les EXPERTS (professions officielles).
//    Ils ne sont plus jamais affichés côté fournisseur — voir
//    `keepSupplierSpecialties` et son usage dans le payload de recommandation.
// ============================================================================

export const PROJECT_TYPE_SPECIALTIES: Record<string, string[]> = {
  maison: [
    "construction_maisons", "gros_oeuvre", "second_oeuvre", "electricite",
    "plomberie", "carrelage", "peinture", "etancheite", "toiture", "isolation",
    "fenetres", "menuserie_bois",
  ],
  villa: [
    "villas", "construction_maisons", "gros_oeuvre", "second_oeuvre",
    "electricite", "plomberie", "carrelage", "peinture", "etancheite",
    "toiture", "piscines", "jardins", "fenetres", "aluminium",
  ],
  appartement: [
    "gros_oeuvre", "second_oeuvre", "electricite", "plomberie", "carrelage",
    "peinture", "isolation", "toiture", "fenetres",
  ],
  studio: [
    "second_oeuvre", "electricite", "plomberie", "carrelage", "peinture",
    "isolation", "fenetres",
  ],
  duplex: [
    "gros_oeuvre", "second_oeuvre", "electricite", "plomberie", "carrelage",
    "peinture", "isolation", "etancheite", "fenetres", "menuserie_bois",
  ],
  immeuble: [
    "immeubles", "gros_oeuvre", "electricite", "plomberie", "carrelage",
    "peinture", "etancheite", "fenetres", "architecte", "bureau_etudes",
  ],
  local_commercial: [
    "immeubles", "gros_oeuvre", "second_oeuvre", "electricite", "plomberie",
    "climatisation", "carrelage", "peinture", "fenetres",
  ],
  bureau: [
    "bureau_etudes", "second_oeuvre", "electricite", "climatisation",
    "domotique", "carrelage", "peinture", "fenetres", "architecte",
  ],
  entrepot: [
    "gros_oeuvre", "toiture", "etancheite", "terrassement", "beton",
    "ferraillage", "electricite", "voirie", "location_engins",
  ],
  residence_touristique: [
    "villas", "immeubles", "piscines", "gros_oeuvre", "second_oeuvre",
    "electricite", "plomberie", "climatisation", "carrelage", "peinture",
    "architecte", "jardins",
  ],
  projet_neuf: [
    "construction_maisons", "gros_oeuvre", "second_oeuvre", "electricite",
    "plomberie", "carrelage", "peinture", "etancheite", "toiture",
    "terrassement", "architecte", "bureau_etudes",
  ],
  renovation_complete: [
    "demolition", "macconnerie", "electricite", "plomberie", "second_oeuvre",
    "carrelage", "peinture", "isolation",
  ],
  extension_batiment: [
    "macconnerie", "gros_oeuvre", "beton", "ferraillage", "toiture",
    "etancheite", "charpente", "electricite", "terrassement",
  ],
  renovation_cuisine: [
    "cuisine", "plomberie", "electricite", "carrelage", "second_oeuvre",
  ],
  renovation_salle_de_bain: [
    "salle_de_bain", "plomberie", "carrelage", "electricite", "isolation",
    "second_oeuvre",
  ],
  piscine: [
    "piscines", "terrassement", "macconnerie", "beton", "etancheite",
    "plomberie", "electricite", "jardins", "marbre",
  ],
  restaurant: [
    "cuisine", "electricite", "plomberie", "climatisation", "second_oeuvre",
    "carrelage", "salle_de_bain",
  ],
  cafe: [
    "cuisine", "electricite", "plomberie", "climatisation", "second_oeuvre",
    "carrelage",
  ],
  electricite_complete: [
    "electricite", "domotique", "energie_solaire",
  ],
  plomberie_complete: [
    "plomberie", "salle_de_bain", "cuisine", "second_oeuvre",
  ],
};

/** Repli raisonnable quand aucun besoin spécifique n'est détecté. */
export const DEFAULT_SPECIALTIES: string[] = [
  "construction_maisons", "gros_oeuvre", "second_oeuvre",
];

// ============================================================================
// 2. DÉTECTION DES BESOINS DANS LE DQE / QUANTITATIF (mots-clés normalisés)
//    Le texte est normalisé (minuscules, sans accents ni séparateurs) puis
//    chaque domaine est activé si l'un de ses marqueurs est présent.
// ============================================================================

/** Clés de domaine DQE → clés de spécialité fournisseur équivalentes. */
const DQE_DOMAIN_TO_SPECIALTY: Record<string, string> = {
  plomberie: "plomberie",
  sanitaire: "salle_de_bain",
  electricite: "electricite",
  carrelage: "carrelage",
  marbre: "marbre",
  peinture: "peinture",
  platre: "isolation",
  maconnerie: "macconnerie",
  beton: "beton",
  ferraillage: "ferraillage",
  coffrage: "coffrage",
  fondations: "fondations",
  terrassement: "terrassement",
  etancheite: "etancheite",
  toiture: "toiture",
  charpente: "charpente",
  menuiserie: "aluminium",
  bois: "menuserie_bois",
  cuisine: "cuisine",
  climatisation: "climatisation",
  piscine: "piscines",
  solaire: "energie_solaire",
  jardin: "jardins",
  demolition: "demolition",
  voirie: "voirie",
  transport: "transport_materiaux",
  engins: "location_engins",
};

export const DQE_KEYWORDS: Record<string, string[]> = {
  plomberie: [
    "plomberie", "tuyaut", "tuyau", "tube pvc", "tube ppr", "ppr", "multicouche",
    "cuivre", "raccord", "vanne", "robinet", "siphon", "collier", "chauffe eau",
    "chauffeeau", "wc", "lavabo", "evier", "douche", "baignoire", "bidet",
    "evacuation", "eaux usees", "eaux vannes", "eaux menageres", "alimentation eau",
    "regard", "descente", "collecteur", "mise en pression", "essai de pression",
  ],
  sanitaire: [
    "sanitaire", "salle de bain", "salle de bains", "meuble vasque",
    "paroi de douche", "receveur", "miroir", "accessoire sanitaire",
    "chauffe eau", "chauffeeau", "chauffe-bain",
  ],
  electricite: [
    "electricite", "electrique", "cable", "fil", "disjoncteur",
    "tableau elect", "prise", "interrupteur", "eclairage", "appareillage",
    "gaine icta", "icta", "reglette", "spot", "neon", "led", "luminaire",
    "mise a la terre", "differentiel", "domino", "borne", "carcasse",
    "sonnette", "interphone", "domotique", "preaillage", "pre câblage",
    "precablage", "compteur", "gaine technique",
  ],
  carrelage: [
    "carrelage", "faien", "carreau", "colle carrelage", "mortier colle",
    "joint carrelage", "plinthe", "revetement sol", "gres", "granito", "dalle",
  ],
  marbre: ["marbre", "granit", "travertin"],
  peinture: [
    "peinture", "enduit", "pate a lisser", "primaire", "sous couche",
    "souscouche", "vernis", "rouleau", "pinceau", "impression", "facade",
  ],
  platre: [
    "plaque de platre", "ba13", "cloison", "placoplatre", "platre",
    "faux plafond", "plafond demountable", "staff", "corniche",
  ],
  maconnerie: [
    "maconnerie", "ciment", "mortier", "bloc", "brique", "agglo", "sable",
    "gravier", "armature", "chaintage", "linteau", "poteau", "longrine",
    "plancher", "hourdis", "beton arme", "mur",
  ],
  beton: ["beton", "central a beton", "beton pret"],
  ferraillage: ["fer", "ferraillage", "armature", "treillis", "attelle"],
  coffrage: ["coffrage", "etalon", "bastaing", "banche"],
  fondations: ["fondation", "semelle", "radier", "pieu", "rigole"],
  terrassement: [
    "terrassement", "excavation", "fouille", "remblai", "deblai", "pelleteuse",
    "nivele", "defrichage",
  ],
  etancheite: [
    "etancheite", "membrane", "bitume", "goudron", "releve", "geotextile",
    "resine",
  ],
  toiture: [
    "toiture", "tuile", "couverture", "gouttiere", "chevron", "panne",
    "liteau", "traitement de toiture",
  ],
  charpente: ["charpente", "bois", "madrier"],
  menuiserie: [
    "fenetre", "porte", "menuiserie", "aluminium", "volet", "store",
    "vitrage", "rideau metallique", "baie vitree", "garde corps",
  ],
  bois: ["bois", "agglomere", "mdf", "contreplaque"],
  cuisine: [
    "cuisine equipee", "meuble de cuisine", "plan de travail", "credence",
    "hotte", "cuisiniere", "evier cuisine", "cuisine",
  ],
  climatisation: [
    "climatisation", "split", "vrv", "vrf", "condenseur", "clim",
    "gainable", "ventilation", "vmc",
  ],
  piscine: [
    "piscine", "bassin", "filtration", "pompe piscine", "skimmer", "liner",
    "margelle", "chlore", "local technique",
  ],
  solaire: [
    "solaire", "photovoltaique", "capteur solaire", "onduleur", "batterie solaire",
  ],
  jardin: [
    "jardin", "paysager", "gazon", "plantation", "arbre", "arbuste",
    "cloture", "mur de cloture", "portail",
  ],
  demolition: ["demolition", "deconstruction", "gravats", "debris"],
  voirie: ["voirie", "trottoir", "borde", "pave", "asphalte", "route", "enrobage"],
  transport: ["transport", "livraison", "camion"],
  engins: ["location engin", "engin", "grue", "nacelle"],
};

/** Normalise un texte pour la recherche de mots-clés (sans accents). */
export function normalizeText(text: string): string {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Détecte les spécialités nécessaires à partir du texte du DQE /
 * quantitatif du projet (postes, désignations, matériaux, travaux).
 */
export function detectSpecialtiesFromText(text: string): string[] {
  const norm = normalizeText(text);
  if (!norm) return [];
  const found = new Set<string>();
  for (const [domain, keywords] of Object.entries(DQE_KEYWORDS)) {
    if (keywords.some((k) => norm.includes(normalizeText(k)))) {
      const specialty = DQE_DOMAIN_TO_SPECIALTY[domain];
      if (specialty) found.add(specialty);
    }
  }
  return [...found];
}

/**
 * Spécialités attendues pour un type de projet (catalogue officiel ;
 * les anciens slugs et libellés libres sont résolus automatiquement).
 * Le libellé brut est aussi scanné pour les types inconnus du catalogue.
 */
export function projectTypeSpecialties(
  category: string | null | undefined,
): string[] {
  const raw = (category ?? "").trim();
  const resolved = resolveProjectType(raw);
  if (resolved && PROJECT_TYPE_SPECIALTIES[resolved]) {
    return PROJECT_TYPE_SPECIALTIES[resolved];
  }
  // Type inconnu : détection par mots-clés sur le libellé lui-même
  // (« rénovation façade », « mur de clôture », « pergola »…).
  const detected = detectSpecialtiesFromText(raw);
  return detected.length > 0 ? detected : DEFAULT_SPECIALTIES;
}

// ============================================================================
// 3. CORPS DE MÉTIERS — spécialités → types de prestataires (experts)
//    Inverse de SPECIALTY_TO_PROVIDER_TYPE (données réelles du schéma).
// ============================================================================

export const PROVIDER_TYPE_LABELS: Record<string, string> = {
  entreprise_generale: "Entreprise générale",
  macon: "Maçon",
  architecte: "Architecte",
  bureau_etudes: "Bureau d'études",
  ingenieur_structure: "Ingénieur structure",
  pisciniste: "Pisciniste",
  paysagiste: "Paysagiste",
  terrassement: "Terrassement",
  coffreur: "Coffreur",
  ferrailleur: "Ferrailleur",
  carreleur: "Carreleur",
  peintre: "Peintre",
  platrier: "Plâtrier",
  beton_ready: "Béton prêt à l'emploi",
  menuisier_bois: "Menuisier bois",
  etancheite: "Étanchéité",
  marbrier: "Marbrier",
  electricien: "Électricien",
  plombier: "Plombier",
  climatisation: "Climatisation",
  cuisine: "Cuisine équipée",
  sanitaire: "Installation sanitaire",
  menuisier_aluminium: "Menuisier aluminium",
  portes_fenetres: "Portes & fenêtres",
  vitrier: "Vitrier",
  solaire: "Énergie solaire",
  transporteur: "Transport de matériaux",
  location_engins: "Location d'engins",
  demolition: "Démolition",
  promoteur: "Promoteur immobilier",
};

/** Type de prestataire → profession expert correspondante (table experts). */
const PROVIDER_TYPE_TO_EXPERT_PROFESSION: Record<string, string> = {
  architecte: "architecte",
  bureau_etudes: "bureau_etudes",
  ingenieur_structure: "ingenieur",
  promoteur: "promoteur_immobilier",
  plombier: "plombier",
  electricien: "electricien",
};

/** Inverse de SPECIALTY_TO_PROVIDER_TYPE : spécialité → types de métiers. */
export function specialtiesToProviderTypes(specialties: string[]): string[] {
  const types = new Set<string>();
  for (const s of specialties) {
    (SPECIALTY_TO_PROVIDER_TYPE[s] ?? []).forEach((t) => types.add(t));
  }
  return [...types];
}

/**
 * Types de métiers qu'un EXPERT peut couvrir : sa profession officielle
 * (inverse de `PROVIDER_TYPE_TO_EXPERT_PROFESSION`) + ses spécialités
 * déclarées, quand elles correspondent à un type connu.
 */
export function expertProviderTypes(
  profession: string | null | undefined,
  specialties: string[] | null | undefined,
): string[] {
  const types = new Set<string>();
  for (const [ptype, prof] of Object.entries(PROVIDER_TYPE_TO_EXPERT_PROFESSION)) {
    if (prof === profession) types.add(ptype);
  }
  specialtiesToProviderTypes(specialties ?? []).forEach((t) => types.add(t));
  return [...types];
}

// ============================================================================
// 3bis. CATÉGORIES D'EXPERTS — regroupement affiché dans « Prestataires
//       recommandés par l'IA » (7 catégories normalisées).
//
// Chaque expert est classé par sa profession réelle (données du profil,
// jamais modifiées). « Autre spécialité » est le repli pour toute profession
// hors des six catégories officielles : aucune fiche n'est inventée.
// ============================================================================

export interface ExpertCategoryDef {
  key: string;
  /** Emoji d'en-tête du groupe. */
  icon: string;
  label: string;
  /** Professions officielles rattachées à la catégorie. */
  professions: string[];
}

export const EXPERT_CATEGORIES: ExpertCategoryDef[] = [
  { key: "architectes", icon: "🏗️", label: "Architectes", professions: ["architecte"] },
  { key: "ingenieurs", icon: "🏢", label: "Ingénieurs", professions: ["ingenieur"] },
  { key: "bureaux_etudes", icon: "📐", label: "Bureaux d'études", professions: ["bureau_etudes"] },
  { key: "electricite", icon: "⚡", label: "Experts électricité", professions: ["electricien"] },
  { key: "plomberie", icon: "💧", label: "Experts plomberie / CVC", professions: ["plombier"] },
  { key: "promoteurs", icon: "🏠", label: "Promoteurs immobiliers", professions: ["promoteur_immobilier"] },
];

export const EXPERT_OTHER_CATEGORY: ExpertCategoryDef = {
  key: "autre_specialite",
  icon: "🧰",
  label: "Autre spécialité",
  professions: [],
};

// Métiers de la catégorie « Professionnel » rattachés à une catégorie existante
// de la mise en relation (l'expert est classé par sa spécialité réelle).
const PROFESSIONNEL_ELECTRICITY_TRADES = new Set([
  "electricien",
  "technicien_domotique",
  "installateur_panneaux_solaires",
  "installateur_securite_alarme",
  "technicien_reseaux_telecoms",
]);
const PROFESSIONNEL_PLUMBING_TRADES = new Set([
  "plombier",
  "chauffagiste",
  "installateur_cvc",
  "frigoriste",
  "installateur_chauffe_eau_solaire",
  "installateur_sanitaires",
]);

/**
 * Catégorie affichée d'un expert d'après sa profession réelle.
 *
 * Les professions historiques (`plombier`, `electricien`) comme la catégorie
 * `professionnel` sont classées par la spécialité enregistrée : un plombier ou
 * un électricien reste dans sa catégorie d'origine, les autres métiers
 * techniques relèvent d'« Autre spécialité » (aucune fiche n'est inventée).
 */
export function expertCategoryOf(
  profession: string | null | undefined,
  specialties: readonly string[] | null | undefined = [],
): ExpertCategoryDef {
  if (normalizeExpertProfession(profession) === "professionnel") {
    const trades = new Set([
      profession ?? "",
      ...(specialties ?? []),
    ]);
    const hasElectricity = [...trades].some((t) =>
      PROFESSIONNEL_ELECTRICITY_TRADES.has(t),
    );
    const hasPlumbing = [...trades].some((t) =>
      PROFESSIONNEL_PLUMBING_TRADES.has(t),
    );
    if (hasElectricity) {
      return EXPERT_CATEGORIES.find((c) => c.key === "electricite")!;
    }
    if (hasPlumbing) {
      return EXPERT_CATEGORIES.find((c) => c.key === "plomberie")!;
    }
    return EXPERT_OTHER_CATEGORY;
  }
  return (
    EXPERT_CATEGORIES.find((c) => c.professions.includes(profession ?? "")) ??
    EXPERT_OTHER_CATEGORY
  );
}

// ============================================================================
// 3ter. SPÉCIALITÉS COMPLÉMENTAIRES — familles de métiers proches, utilisées
//       uniquement lorsqu'aucune correspondance exacte n'existe (« Spécialité
//       complémentaire »). Ex. plomberie ↔ CVC, études structure ↔ architecture.
// ============================================================================

export const PROVIDER_TYPE_FAMILY: Record<string, string> = {
  architecte: "etudes",
  bureau_etudes: "etudes",
  ingenieur_structure: "etudes",
  macon: "gros_oeuvre",
  coffreur: "gros_oeuvre",
  ferrailleur: "gros_oeuvre",
  beton_ready: "gros_oeuvre",
  terrassement: "gros_oeuvre",
  etancheite: "gros_oeuvre",
  entreprise_generale: "general",
  plombier: "fluides",
  sanitaire: "fluides",
  climatisation: "fluides",
  cuisine: "fluides",
  electricien: "electricite",
  solaire: "electricite",
  carreleur: "finitions",
  peintre: "finitions",
  platrier: "finitions",
  marbrier: "finitions",
  menuisier_bois: "finitions",
  menuisier_aluminium: "finitions",
  portes_fenetres: "finitions",
  vitrier: "finitions",
  pisciniste: "amenagement",
  paysagiste: "amenagement",
  demolition: "amenagement",
  transporteur: "amenagement",
  location_engins: "amenagement",
  promoteur: "promotion",
};

/** Types de métiers appartenant à une même famille que `types`. */
export function complementaryTypes(types: string[]): Set<string> {
  const families = new Set(
    types.map((t) => PROVIDER_TYPE_FAMILY[t]).filter((f): f is string => !!f),
  );
  const out = new Set<string>();
  for (const [t, fam] of Object.entries(PROVIDER_TYPE_FAMILY)) {
    if (families.has(fam)) out.add(t);
  }
  return out;
}

// ============================================================================
// 4. RÉGIONS — priorité projet → voisines → toute la Tunisie
// ============================================================================

/** Régions voisines (élargissement progressif). */
export const REGION_NEIGHBORS: Record<string, string[]> = {
  tunis: ["ariana", "ben_arous", "manouba"],
  ariana: ["tunis", "ben_arous", "manouba"],
  ben_arous: ["tunis", "ariana", "manouba", "nabeul"],
  manouba: ["tunis", "ariana", "ben_arous", "bizerte"],
  nabeul: ["ben_arous", "zaghouan", "sousse"],
  zaghouan: ["nabeul", "ben_arous", "kairouan", "siliana"],
  bizerte: ["beja", "manouba"],
  beja: ["bizerte", "jendouba", "le_kef", "siliana"],
  jendouba: ["beja", "le_kef"],
  le_kef: ["jendouba", "siliana", "kasserine", "beja"],
  siliana: ["le_kef", "beja", "zaghouan", "kairouan", "kasserine"],
  kairouan: ["siliana", "zaghouan", "sidi_bouzid", "kasserine", "sousse", "monastir"],
  kasserine: ["le_kef", "siliana", "kairouan", "sidi_bouzid", "gafsa"],
  sidi_bouzid: ["kasserine", "kairouan", "gafsa", "sfax", "mahdia"],
  sousse: ["monastir", "kairouan", "nabeul", "zaghouan", "mahdia"],
  monastir: ["sousse", "mahdia", "kairouan"],
  mahdia: ["monastir", "sousse", "kairouan", "sidi_bouzid", "sfax"],
  sfax: ["mahdia", "sidi_bouzid", "gafsa", "gabes"],
  gabes: ["sfax", "medenine", "gafsa", "kebili"],
  medenine: ["gabes", "tataouine", "kebili"],
  tataouine: ["medenine", "gafsa", "kebili"],
  gafsa: ["kasserine", "sidi_bouzid", "sfax", "gabes", "tozeur", "tataouine"],
  tozeur: ["gafsa", "kebili"],
  kebili: ["tozeur", "gafsa", "gabes", "medenine", "tataouine"],
};

function normalizeRegion(r: string): string {
  return (r ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_")
    .trim();
}

/** 0 = même région · 1 = région voisine · 2 = reste de la Tunisie. */
export function regionRankFor(
  profileRegions: string[],
  projectRegion: string | null | undefined,
): 0 | 1 | 2 {
  const proj = normalizeRegion(projectRegion ?? "");
  if (!proj || profileRegions.length === 0) return 2;
  const normed = profileRegions.map(normalizeRegion);
  if (normed.includes(proj)) return 0;
  const neighbors = (REGION_NEIGHBORS[proj] ?? []).map(normalizeRegion);
  if (normed.some((r) => neighbors.includes(r))) return 1;
  return 2;
}

// ============================================================================
// 5. SÉLECTION INTELLIGENTE — scoring + randomisation seedée + déduplication
// ============================================================================

/** PRNG déterministe (mulberry32) — la seed rend les tests reproductibles. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seed stable dérivée d'une chaîne (FNV-1a). */
export function seedFromString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface RecommendationCandidate {
  /** Identifiant du profil réel (supplierProfiles / expertProfiles). */
  id: string;
  /** Clés de spécialités déclarées par le profil. */
  specialties: string[];
  /** Régions desservies déclarées par le profil. */
  regions: string[];
}

export interface ScoredRecommendation<T extends RecommendationCandidate> {
  candidate: T;
  /** Spécialités en correspondance réelle avec le besoin du projet. */
  matchedSpecialties: string[];
  regionRank: 0 | 1 | 2;
  score: number;
}

/**
 * Sélectionne au plus `limit` candidats éligibles :
 *   correspondance réelle avec les besoins → priorité région → score →
 *   randomisation seedée parmi les ex æquo (les mêmes profils ne sortent pas
 *   systématiquement en tête, mais JAMAIS un profil hors besoin).
 * `excludedIds` : profils déjà associés au projet (déduplication stricte).
 */
export function pickRecommendations<T extends RecommendationCandidate>(
  candidates: T[],
  wanted: string[],
  projectRegion: string | null | undefined,
  seed: number,
  limit: number,
  excludedIds: ReadonlySet<string>,
): ScoredRecommendation<T>[] {
  const wantedSet = new Set(wanted);
  const eligible: ScoredRecommendation<T>[] = [];

  for (const c of candidates) {
    if (!c?.id || excludedIds.has(c.id)) continue;
    const matched = (c.specialties ?? []).filter((s) => wantedSet.has(s));
    if (matched.length === 0) continue; // jamais un profil hors besoin
    const rank = regionRankFor(c.regions ?? [], projectRegion);
    eligible.push({
      candidate: c,
      matchedSpecialties: matched,
      regionRank: rank,
      // score : couverture du besoin, pondérée par la proximité régionale
      score: matched.length * 10 + (3 - rank),
    });
  }

  // Randomisation : mélange seedé AVANT le tri stable → les ex æquo
  // (même rang régional + même score) tournent d'une actualisation à l'autre.
  const rng = mulberry32(seed);
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }

  eligible.sort((a, b) => a.regionRank - b.regionRank || b.score - a.score);
  return eligible.slice(0, Math.max(0, limit));
}

// ============================================================================
// 5bis. SCORING DES EXPERTS — classement par pertinence (catégorie par
//       catégorie), sans jamais modifier les données du profil :
//
//         1. spécialité exacte identifiée par l'IA (besoin détecté dans le
//            DQE / travaux nécessaires)…… pondération la plus forte ;
//         2. type de projet compatible ;
//         3. région du projet (puis voisine, puis Tunisie) ;
//         4. disponibilité (immédiate > cette semaine > rendez-vous) ;
//         5. profil actif ET complet (téléphone, e-mail, spécialités, région).
//
//       Si aucune correspondance exacte n'existe dans une catégorie, seules
//       les spécialités proches sont affichées, marquées « Spécialité
//       complémentaire ». La déduplication par identifiant est stricte.
// ============================================================================

export interface ExpertCandidate extends RecommendationCandidate {
  /** Profession officielle du profil (architecte, plombier…). */
  profession: string;
  /** Disponibilité déclarée : immediate | this_week | appointment. */
  availability?: string;
  /** Profil renseigné de façon complète (contact + spécialités + régions). */
  complete: boolean;
}

export interface ScoredExpert<T extends ExpertCandidate> {
  candidate: T;
  categoryKey: string;
  category: ExpertCategoryDef;
  /** Besoins réellement couverts (libellés de métiers). */
  matchedNeeds: string[];
  /** Correspondance exacte avec un besoin identifié. */
  exact: boolean;
  /** Correspondance par spécialité proche (aucune exacte dans la catégorie). */
  complementary: boolean;
  regionRank: 0 | 1 | 2;
  score: number;
}

export interface ExpertGroup<T extends ExpertCandidate> {
  key: string;
  icon: string;
  label: string;
  experts: ScoredExpert<T>[];
}

/** Bonus de classement lié à la disponibilité déclarée. */
const AVAILABILITY_SCORE: Record<string, number> = {
  immediate: 40,
  this_week: 30,
  appointment: 20,
};

/**
 * Groupe et classe les experts éligibles par catégorie.
 *
 * `exactTypes`    = métiers issus du besoin identifié (DQE / travaux) ;
 * `compatibleTypes` = métiers attendus pour le type de projet.
 * Seuls les experts réellement pertinents sont renvoyés (jamais un profil
 * désactivé : le filtrage d'éligibilité est fait en amont par l'appelant).
 */
export function buildExpertRecommendations<T extends ExpertCandidate>(
  candidates: T[],
  opts: {
    exactTypes: string[];
    compatibleTypes: string[];
    projectRegion: string | null | undefined;
    /** Nombre maximum d'experts renvoyés par catégorie. */
    limitPerCategory?: number;
  },
): ExpertGroup<T>[] {
  const exactSet = new Set(opts.exactTypes);
  const compatSet = new Set(opts.compatibleTypes);
  const closeSet = complementaryTypes([...exactSet, ...compatSet]);
  const limit = Math.max(1, opts.limitPerCategory ?? 6);

  const byCategory = new Map<string, ScoredExpert<T>[]>();
  const seen = new Set<string>(); // déduplication stricte d'un même expert

  for (const c of candidates) {
    if (!c?.id || seen.has(c.id)) continue;
    const types = expertProviderTypes(c.profession, c.specialties);
    const matchedExact = types.filter((t) => exactSet.has(t));
    const matchedCompat = types.filter((t) => compatSet.has(t));
    const matchedClose = types.filter((t) => closeSet.has(t));
    const exact = matchedExact.length > 0;
    const compatible = matchedCompat.length > 0;
    const complementary = !exact && !compatible && matchedClose.length > 0;
    if (!exact && !compatible && !complementary) continue; // hors besoin réel
    seen.add(c.id);

    const rank = regionRankFor(c.regions ?? [], opts.projectRegion);
    const matchedTypes = exact
      ? matchedExact
      : compatible
        ? matchedCompat
        : matchedClose;
    const score =
      (exact ? 1000 : 0) +
      (compatible ? 300 : 0) +
      (3 - rank) * 60 +
      (AVAILABILITY_SCORE[c.availability ?? ""] ?? 0) +
      (c.complete ? 10 : 0);

    const category = expertCategoryOf(c.profession, c.specialties);
    const list = byCategory.get(category.key) ?? [];
    list.push({
      candidate: c,
      categoryKey: category.key,
      category,
      matchedNeeds: [...new Set(matchedTypes)].map(
        (t) => PROVIDER_TYPE_LABELS[t] ?? t,
      ),
      exact,
      complementary,
      regionRank: rank,
      score,
    });
    byCategory.set(category.key, list);
  }

  const groups: ExpertGroup<T>[] = [];
  for (const def of [...EXPERT_CATEGORIES, EXPERT_OTHER_CATEGORY]) {
    const list = byCategory.get(def.key);
    if (!list || list.length === 0) continue;
    // Priorité aux correspondances exactes ; à défaut, aux spécialités
    // complémentaires (jamais les deux mélangées dans la même catégorie).
    const hasExact = list.some((e) => e.exact);
    const hasCompatible = list.some((e) => !e.complementary);
    const visible = hasExact
      ? list.filter((e) => !e.complementary)
      : hasCompatible
        ? list.filter((e) => !e.complementary)
        : list.filter((e) => e.complementary);
    visible.sort((a, b) => b.score - a.score || a.candidate.id.localeCompare(b.candidate.id));
    groups.push({
      key: def.key,
      icon: def.icon,
      label: def.label,
      experts: visible.slice(0, limit),
    });
  }
  return groups;
}

/** Un profil expert est « complet » quand les informations clés sont renseignées. */
export function isCompleteExpertProfile(profile: {
  displayName?: string;
  phone?: string;
  email?: string;
  address?: string;
  specialties?: string[];
  regions?: string[];
}): boolean {
  return (
    !!profile.displayName &&
    !!profile.phone &&
    (!!profile.email || !!profile.address) &&
    (profile.specialties ?? []).length > 0 &&
    (profile.regions ?? []).length > 0
  );
}

const EXPERT_AVAILABILITY_LABELS: Record<string, string> = {
  immediate: "Disponible immédiatement",
  this_week: "Disponible cette semaine",
  appointment: "Sur rendez-vous",
};

/** Libellé de disponibilité d'un expert (repli : « Profil vérifié »). */
export function expertAvailabilityLabel(code: string | null | undefined): string {
  return EXPERT_AVAILABILITY_LABELS[code ?? ""] ?? "Profil vérifié";
}

// ============================================================================
// 6. FONCTIONS CONVEX — requête de lecture + génération idempotente
// ============================================================================

export type RecommendedType = "supplier" | "expert";

export interface RecommendedProviderView {
  associationId: string;
  type: RecommendedType;
  profileId: string;
  name: string;
  /** URL réellement affichable par <img src> (résolue côté backend) ou undefined. */
  logo?: string;
  /** Profession de l'expert (architecte, ingénieur…) — undefined pour un fournisseur. */
  professionLabel?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  regionLabel: string;
  regionRank: 0 | 1 | 2;
  matchedNeeds: string[];
  specialties: string[];
  profession?: string;
  availability: string;
  // ── Champs experts (recommandations calculées en direct) ──────────────────
  /** Catégorie de regroupement (architectes, plombiers…). */
  categoryKey?: string;
  categoryLabel?: string;
  categoryIcon?: string;
  /** Clés de spécialités brutes (réutilisées par les dialogues de demande). */
  specialtyKeys?: string[];
  /** Prix indicatif saisi par l'expert (texte libre). */
  indicativePrice?: string;
  /** Code de disponibilité déclaré : immediate | this_week | appointment. */
  availabilityCode?: string;
  /** Créneaux précisés par l'expert. */
  availabilityDetails?: string;
  /** L'expert accepte les interventions urgentes. */
  acceptsUrgent?: boolean;
  /** Correspondance exacte avec un besoin identifié. */
  exact?: boolean;
  /** Correspondance par spécialité proche (aucune exacte dans la catégorie). */
  complementary?: boolean;
  /** Description du profil (2 lignes max à l'affichage). */
  description?: string;
}

/** Groupe d'experts affiché dans « Prestataires recommandés par l'IA ». */
export interface ExpertCategoryGroup {
  key: string;
  icon: string;
  label: string;
  experts: RecommendedProviderView[];
}

export interface RecommendationsPayload {
  suppliers: RecommendedProviderView[];
  experts: RecommendedProviderView[];
  /** Experts regroupés par catégorie (recalculés en direct selon le projet). */
  expertsByCategory: ExpertCategoryGroup[];
  needs: { specialties: string[]; trades: string[] };
  regionLabel: string;
  /** Contexte du projet transmis automatiquement aux demandes prestataires. */
  projectContext: {
    name: string;
    region?: string;
    category?: string;
    surface?: number;
  };
  generatedAt: number;
}

/** Libellé d'une spécialité (repli sur la clé brute). */
function specialtyLabel(key: string): string {
  return SUPPLIER_SPECIALTIES_LABELS[key] ?? PROVIDER_TYPE_LABELS[key] ?? key;
}

// ============================================================================
// 7. IMAGES — résolution des logos vers des URLs réellement affichables
//    La source officielle est le champ `logo` des profils (schéma Convex).
//    Aucun nouveau champ n'est créé : on lit uniquement ce qui existe déjà.
// ============================================================================

/**
 * Anciens logos enregistrés comme `${window.location.origin}/api/storage/<id>`
 * (jamais résoluble sur l'hôte de l'application, sans proxy /api) — même
 * logique de réparation que les pages profils (supplierProfiles/expertProfiles).
 * Les requêtes Convex sont read-only : l'URL réparée est re-persistée au
 * prochain enregistrement du profil.
 */
const BROKEN_STORAGE_URL_RE = /\/api\/storage\/([A-Za-z0-9]+)(?:[?#]|$)/;

/** Champs image compatibles des anciennes structures de profil (lecture seule). */
const LOGO_FIELDS = ["logo", "logoUrl", "companyLogo", "image"] as const;

/**
 * Libellés des professions experts — affiché à la place du mot « Expert ».
 * Source unique : `src/lib/expertProfessions.ts` (catégorie « Professionnel »
 * et valeurs historiques incluses).
 */
export { EXPERT_PROFESSION_LABELS };

/**
 * Lit le champ image réel du profil — source officielle : `logo` ; les autres
 * champs ne servent que si une ancienne structure en contient une.
 */
export function pickLogoField(profile: unknown): string | undefined {
  const p = profile as Record<string, unknown> | null | undefined;
  if (!p) return undefined;
  for (const f of LOGO_FIELDS) {
    const raw = p[f];
    if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
  }
  return undefined;
}

/**
 * Écarte les valeurs non-affichables par <img src> : storageId brut Convex
 * (jamais envoyé comme src), data:/blob: (non fiables), chaînes vides.
 */
export function normalizeLogoValue(
  value: string | undefined | null,
): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (/^(data|blob):/i.test(v)) return undefined;
  // storageId Convex brut (base64url ~32+ caractères, sans séparateur)
  if (/^[A-Za-z0-9_-]{32,}$/.test(v)) return undefined;
  return v;
}

/**
 * Convertit la valeur stockée en URL exploitable par <img src> :
 *   - champ absent/vide → undefined (fallback volontaire côté UI) ;
 *   - ancienne URL /api/storage/<id> → vraie URL Convex Storage ;
 *   - URL directe → inchangée ;
 *   - fichier indisponible dans le stockage → undefined (jamais de src cassé).
 */
async function resolveLogoUrl(
  ctx: any,
  value: string | undefined | null,
): Promise<string | undefined> {
  const cleaned = normalizeLogoValue(value ?? undefined);
  if (!cleaned) return undefined;
  const match = cleaned.match(BROKEN_STORAGE_URL_RE);
  if (!match) return cleaned;
  try {
    const url = await ctx.storage.getUrl(match[1] as any);
    return normalizeLogoValue(url ?? undefined);
  } catch {
    // storageId invalide / fichier supprimé → fallback propre côté UI.
    return undefined;
  }
}

const REGION_LABEL_FALLBACK: Record<string, string> = {
  tunis: "Tunis", ariana: "Ariana", ben_arous: "Ben Arous", manouba: "Manouba",
  nabeul: "Nabeul", zaghouan: "Zaghouan", bizerte: "Bizerte", beja: "Béja",
  jendouba: "Jendouba", le_kef: "Le Kef", siliana: "Siliana",
  kairouan: "Kairouan", kasserine: "Kasserine", sidi_bouzid: "Sidi Bouzid",
  sousse: "Sousse", monastir: "Monastir", mahdia: "Mahdia", sfax: "Sfax",
  gabes: "Gabès", medenine: "Médenine", tataouine: "Tataouine",
  gafsa: "Gafsa", tozeur: "Tozeur", kebili: "Kébili",
};

function regionLabelFor(r: string): string {
  const key = normalizeRegion(r);
  return REGION_LABEL_FALLBACK[key] ?? r;
}

/** Charge les profils fournisseurs éligibles (actifs + visibles uniquement). */
async function loadEligibleSuppliers(ctx: any): Promise<RecommendationCandidate[]> {
  const now = Date.now();
  const free = await getFreePlanStatus(ctx);
  const profiles = free.supplierFree
    ? await ctx.db.query("supplierProfiles").collect()
    : await ctx.db
        .query("supplierProfiles")
        .withIndex("by_subscription", (q: any) => q.eq("subscriptionStatus", "active"))
        .collect();
  return profiles
    .filter((s: any) => s.isVisible)
    .filter((s: any) => {
      if (free.supplierFree) return true;
      if (s.subscriptionStatus === "active" && s.subscriptionEndDate && s.subscriptionEndDate < now) return false;
      return true;
    })
    .map((s: any) => ({ id: s._id as string, specialties: s.specialties ?? [], regions: s.regions ?? [] }));
}

/** Charge les profils experts éligibles (actifs + visibles uniquement). */
async function loadEligibleExperts(ctx: any): Promise<RecommendationCandidate[]> {
  const now = Date.now();
  const free = await getFreePlanStatus(ctx);
  const profiles = free.expertFree
    ? await ctx.db.query("expertProfiles").collect()
    : await ctx.db
        .query("expertProfiles")
        .withIndex("by_subscription", (q: any) => q.eq("subscriptionStatus", "active"))
        .collect();
  return profiles
    .filter((e: any) => e.isVisible)
    .filter((e: any) => {
      if (free.expertFree) return true;
      if (e.subscriptionStatus === "active" && e.subscriptionEndDate && e.subscriptionEndDate < now) return false;
      return true;
    })
    .map((e: any) => ({
      id: e._id as string,
      // Un expert correspond par ses spécialités ET par sa profession.
      specialties: [
        ...(e.specialties ?? []),
        ...Object.entries(PROVIDER_TYPE_TO_EXPERT_PROFESSION)
          .filter(([, prof]) => prof === e.profession)
          .map(([ptype]) => ptype),
      ],
      regions: e.regions ?? [],
    }));
}

/** Besoins du projet : spécialités (fournisseurs) + corps de métiers (experts). */
export function needsForProject(
  category: string | null | undefined,
  dqeText: string | null | undefined,
): { specialties: string[]; trades: string[] } {
  const byType = projectTypeSpecialties(category);
  const byDqe = detectSpecialtiesFromText(dqeText ?? "");
  const specialties = [...new Set([...byType, ...byDqe])];
  return { specialties, trades: specialtiesToProviderTypes(specialties) };
}

const SUPPLIER_LIMIT_DEFAULT = 6;
const EXPERT_LIMIT_DEFAULT = 6;
/** Nombre maximum d'experts affichés par catégorie dans la section IA. */
const EXPERT_LIMIT_PER_CATEGORY = 6;

/**
 * Génère les recommandations d'un projet — logique partagée par la mutation
 * `refresh` (pure hors accès base, seed injectée → testable).
 */
export function buildRecommendationPlan(
  args: {
    category: string | null | undefined;
    dqeText: string | null | undefined;
    region: string | null | undefined;
    seed: number;
    supplierLimit?: number;
    expertLimit?: number;
  },
  suppliers: RecommendationCandidate[],
  experts: RecommendationCandidate[],
  existingIds: ReadonlySet<string>,
): {
  suppliers: ScoredRecommendation<RecommendationCandidate>[];
  experts: ScoredRecommendation<RecommendationCandidate>[];
  needs: { specialties: string[]; trades: string[] };
} {
  const needs = needsForProject(args.category, args.dqeText);
  return {
    suppliers: pickRecommendations(
      suppliers,
      needs.specialties,
      args.region,
      args.seed,
      args.supplierLimit ?? SUPPLIER_LIMIT_DEFAULT,
      existingIds,
    ),
    experts: pickRecommendations(
      experts,
      needs.specialties,
      args.region,
      args.seed,
      args.expertLimit ?? EXPERT_LIMIT_DEFAULT,
      existingIds,
    ),
    needs,
  };
}

/**
 * Badge de disponibilité affiché aux clients : « Profil vérifié » —
 * le détail d'abonnement n'est jamais exposé dans les recommandations.
 */
function availabilityLabel(profile: { subscriptionStatus?: string }): string {
  return profile.subscriptionStatus === "trial" ? "Période d'essai" : "Profil vérifié";
}

/** Lit les recommandations existantes d'un projet (payload rendu par l'UI). */
async function readProjectRecommendations(
  ctx: any,
  projectId: string,
): Promise<RecommendationsPayload> {
  const associations = await ctx.db
    .query("projectRecommendedProviders")
    .withIndex("by_project", (q: any) => q.eq("projectId", projectId))
    .collect();

  const suppliers: RecommendedProviderView[] = [];
  const experts: RecommendedProviderView[] = [];

  for (const a of associations) {
    const profile = await ctx.db.get(a.providerId);
    if (!profile) continue;
    const rank = (a.regionRank ?? 2) as 0 | 1 | 2;
    const matched: string[] = a.matchedSpecialties ?? [];
    // Les spécialités « métier » retirées de l'espace Fournisseur (architecte,
    // bureau d'études, ingénieur, géomètre, promoteur) ne sont plus affichées
    // sur une carte fournisseur — pour un expert, elles restent valides (ce
    // sont ses professions officielles).
    const isSupplier = a.type === "supplier";
    const base = {
      associationId: a._id as string,
      profileId: a.providerId as string,
      regionRank: rank,
      matchedNeeds: (isSupplier ? keepSupplierSpecialties(matched) : matched).map(
        specialtyLabel,
      ),
      specialties: (isSupplier
        ? keepSupplierSpecialties(profile.specialties)
        : (profile.specialties ?? [])
      )
        .slice(0, 4)
        .map(specialtyLabel),
    };
    if (a.type === "supplier") {
      suppliers.push({
        ...base,
        type: "supplier",
        name: profile.companyName ?? "Fournisseur",
        logo: await resolveLogoUrl(ctx, pickLogoField(profile)),
        phone: profile.phone,
        email: profile.email ?? undefined,
        address: profile.address ?? undefined,
        website: profile.website ?? undefined,
        regionLabel:
          (profile.regions ?? []).map(regionLabelFor).slice(0, 3).join(", ") ||
          "Tunisie",
        availability: availabilityLabel(profile),
      });
    } else {
      // Photo de l'expert : logo du profil, sinon photo du compte (users.image)
      // — les deux sources réelles déjà existantes, aucune donnée inventée.
      const account = profile.userId ? await ctx.db.get(profile.userId) : null;
      experts.push({
        ...base,
        type: "expert",
        name: profile.displayName ?? "Expert",
        logo:
          (await resolveLogoUrl(ctx, pickLogoField(profile))) ??
          normalizeLogoValue(account?.image ?? undefined),
        professionLabel:
          EXPERT_PROFESSION_LABELS[profile.profession] ?? profile.profession,
        phone: profile.phone,
        email: profile.email ?? undefined,
        address: profile.address ?? undefined,
        website: profile.website ?? undefined,
        profession: profile.profession,
        regionLabel:
          (profile.regions ?? []).map(regionLabelFor).slice(0, 3).join(", ") ||
          "Tunisie",
        availability: availabilityLabel(profile),
      });
    }
  }

  return {
    suppliers,
    experts,
    // Les experts affichés sont recalculés en direct (voir `buildExpertGroups`),
    // jamais figés à la date de génération : la catégorie, le besoin et la
    // région du projet sont toujours reflétés.
    expertsByCategory: [],
    needs: { specialties: [], trades: [] },
    regionLabel: "",
    projectContext: { name: "" },
    // 0 = aucune association : la section n'a jamais été générée pour ce projet.
    generatedAt: associations.length > 0 ? Math.max(...associations.map((a: any) => a.createdAt)) : 0,
  };
}

/**
 * Experts recommandés du projet, recalculés en direct et regroupés par
 * catégorie d'après les données réelles des profils (aucune fiche inventée).
 *
 * Éligibilité : profil visible + abonnement actif (mêmes règles que annuaires
 * et recommandations fournisseurs). Priorité : besoin identifié > type de
 * projet > région > disponibilité > profil complet.
 */
async function buildExpertGroups(
  ctx: any,
  project: any,
): Promise<ExpertCategoryGroup[]> {
  const now = Date.now();
  const free = await getFreePlanStatus(ctx);
  const profiles = await ctx.db.query("expertProfiles").collect();
  // Éligibilité strictement alignée sur l'annuaire ProMarket
  // (`getActiveExperts`) : visible + abonnement payant actif (ou essai).
  // Jamais un expert désactivé, non publié ou expiré.
  const eligible: any[] = [];
  for (const e of profiles) {
    if (!e.isVisible) continue;
    if (await isProfilePaymentActive(ctx, free.expertFree, e, now)) eligible.push(e);
  }

  const typeSpecialties = projectTypeSpecialties(project?.category);
  const dqeSpecialties = detectSpecialtiesFromText(dqeTextOf(project));
  const typeTrades = specialtiesToProviderTypes(typeSpecialties);
  const dqeTrades = specialtiesToProviderTypes(dqeSpecialties);

  const candidates: (ExpertCandidate & { profile: any })[] = eligible.map((e: any) => ({
    id: e._id as string,
    profession: e.profession,
    specialties: e.specialties ?? [],
    regions: e.regions ?? [],
    availability: e.availability,
    complete: isCompleteExpertProfile(e),
    profile: e,
  }));

  const groups = buildExpertRecommendations(candidates, {
    // Besoin identifié (DQE) prioritaire ; sinon le type de projet porte la
    // correspondance (« type de projet compatible »).
    exactTypes: dqeTrades,
    compatibleTypes: typeTrades,
    projectRegion: project?.region,
    limitPerCategory: EXPERT_LIMIT_PER_CATEGORY,
  });

  const result: ExpertCategoryGroup[] = [];
  for (const group of groups) {
    const experts: RecommendedProviderView[] = [];
    for (const scored of group.experts) {
      const e = scored.candidate.profile;
      // Photo : logo du profil, sinon image du compte — sources réelles.
      const account = e.userId ? await ctx.db.get(e.userId) : null;
      experts.push({
        associationId: `live:${e._id}`,
        type: "expert",
        profileId: e._id as string,
        name: e.displayName ?? "Expert",
        logo:
          (await resolveLogoUrl(ctx, pickLogoField(e))) ??
          normalizeLogoValue(account?.image ?? undefined),
        professionLabel: EXPERT_PROFESSION_LABELS[e.profession] ?? e.profession,
        profession: e.profession,
        categoryKey: scored.categoryKey,
        categoryLabel: scored.category.label,
        categoryIcon: scored.category.icon,
        phone: e.phone,
        email: e.email ?? undefined,
        address: e.address ?? undefined,
        website: e.website ?? undefined,
        regionLabel:
          (e.regions ?? []).map(regionLabelFor).slice(0, 3).join(", ") || "Tunisie",
        regionRank: scored.regionRank,
        matchedNeeds: scored.matchedNeeds,
        specialties: (e.specialties ?? []).slice(0, 4).map(specialtyLabel),
        specialtyKeys: e.specialties ?? [],
        indicativePrice: e.indicativePrice,
        availability: expertAvailabilityLabel(e.availability),
        availabilityCode: e.availability,
        availabilityDetails: e.availabilityDetails,
        acceptsUrgent: e.acceptsUrgent === true,
        exact: scored.exact,
        complementary: scored.complementary,
        description: e.description,
      });
    }
    result.push({ key: group.key, icon: group.icon, label: group.label, experts });
  }
  return result;
}

/** Query — recommandations actuelles du projet (lecture seule). */
export const getForProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Projet introuvable");
    if (project.userId !== user._id && user.role !== "admin") {
      throw new Error("Non autorisé");
    }
    const payload = await readProjectRecommendations(ctx, args.projectId);
    const needs = needsForProject(
      project.category,
      dqeTextOf(project),
    );
    // Experts recalculés à chaque lecture : ils suivent automatiquement le type
    // de projet, le besoin (DQE) et la région — aucune mise à jour manuelle.
    const expertsByCategory = await buildExpertGroups(ctx, project);
    return {
      ...payload,
      experts: expertsByCategory.flatMap((g) => g.experts),
      expertsByCategory,
      projectContext: {
        name: project.name,
        region: project.region ?? undefined,
        category: project.category ?? undefined,
        surface: project.surface ?? undefined,
      },
      needs: {
        // Besoins affichés = spécialités fournisseur uniquement ; les métiers
        // (architecte, bureau d'études…) restent visibles via `trades`.
        specialties: keepSupplierSpecialties(needs.specialties).map(specialtyLabel),
        trades: needs.trades.map((t) => PROVIDER_TYPE_LABELS[t] ?? t),
      },
      regionLabel: project.region ? regionLabelFor(project.region) : "",
    };
  },
});

/** Extrait le texte analysable du DQE / quantitatif d'un projet. */
function dqeTextOf(project: any): string {
  const parts: string[] = [];
  const dqe = project?.dqe;
  if (dqe?.lots?.length) {
    for (const lot of dqe.lots) {
      if (lot?.title) parts.push(lot.title);
      for (const line of lot?.lines ?? []) {
        if (line?.name) parts.push(line.name);
        if (line?.description) parts.push(line.description);
      }
    }
  }
  if (dqe?.lotsFlat?.length) {
    for (const lot of dqe.lotsFlat) {
      if (lot?.title) parts.push(lot.title);
      for (const line of lot?.lines ?? []) {
        if (line?.name) parts.push(line.name);
      }
    }
  }
  const breakdown = project?.costEstimate?.breakdown;
  if (Array.isArray(breakdown)) {
    for (const b of breakdown) {
      if (b?.label) parts.push(b.label);
      for (const item of b?.items ?? []) {
        if (item?.label) parts.push(item.label);
        if (item?.name) parts.push(item.name);
      }
    }
  }
  return parts.join(" · ");
}

/**
 * Mutation — actualise les recommandations du projet.
 *
 * Idempotence / déduplication (garantie côté backend) :
 *   - les associations existantes (projectId + providerId + type) sont
 *     conservées et renvoyées telles quelles ;
 *   - seuls les profils ENCORE non associés et éligibles sont insérés,
 *     chacun re-vérifié juste avant l'insertion (clics rapides, appels
 *     simultanés) ;
 *   - randomisation fraîche (seed horodatée) uniquement parmi les non-associés.
 * Aucun faux profil, aucune modification du DQE ni des données du projet.
 */
export const refresh = mutation({
  args: {
    projectId: v.id("projects"),
    supplierLimit: v.optional(v.number()),
    expertLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Projet introuvable");
    if (project.userId !== user._id && user.role !== "admin") {
      throw new Error("Non autorisé");
    }

    // 1) Associations existantes — jamais réinsérées.
    const existing = await ctx.db
      .query("projectRecommendedProviders")
      .withIndex("by_project", (q: any) => q.eq("projectId", args.projectId))
      .collect();
    const existingSupplierIds = new Set(
      existing.filter((a: any) => a.type === "supplier").map((a: any) => a.providerId),
    );
    const existingExpertIds = new Set(
      existing.filter((a: any) => a.type === "expert").map((a: any) => a.providerId),
    );

    // 2) Éligibles réels + plan de sélection (matching + randomisation).
    const [suppliers, experts] = await Promise.all([
      loadEligibleSuppliers(ctx),
      loadEligibleExperts(ctx),
    ]);
    const plan = buildRecommendationPlan(
      {
        category: project.category,
        dqeText: dqeTextOf(project),
        region: project.region,
        seed: seedFromString(`${args.projectId}:${Date.now()}`),
        supplierLimit: args.supplierLimit,
        expertLimit: args.expertLimit,
      },
      suppliers,
      experts,
      new Set<string>([...existingSupplierIds, ...existingExpertIds]),
    );

    // 3) Insertion des nouveaux (vérification d'unicité par paire juste avant).
    const now = Date.now();
    for (const pick of plan.suppliers) {
      const providerId = pick.candidate.id as any;
      const dup = await ctx.db
        .query("projectRecommendedProviders")
        .withIndex("by_pair", (q: any) =>
          q.eq("projectId", args.projectId).eq("providerId", providerId).eq("type", "supplier"),
        )
        .first();
      if (dup) continue;
      await ctx.db.insert("projectRecommendedProviders", {
        projectId: args.projectId,
        providerId,
        type: "supplier",
        matchedSpecialties: pick.matchedSpecialties,
        regionRank: pick.regionRank,
        createdAt: now,
      });
    }
    for (const pick of plan.experts) {
      const providerId = pick.candidate.id as any;
      const dup = await ctx.db
        .query("projectRecommendedProviders")
        .withIndex("by_pair", (q: any) =>
          q.eq("projectId", args.projectId).eq("providerId", providerId).eq("type", "expert"),
        )
        .first();
      if (dup) continue;
      await ctx.db.insert("projectRecommendedProviders", {
        projectId: args.projectId,
        providerId,
        type: "expert",
        matchedSpecialties: pick.matchedSpecialties,
        regionRank: pick.regionRank,
        createdAt: now,
      });
    }

    // 4) Renvoie le payload complet : fournisseurs persistés (existants +
    //    nouveaux) et experts recalculés en direct par catégorie.
    const payload = await readProjectRecommendations(ctx, args.projectId);
    const expertsByCategory = await buildExpertGroups(ctx, project);
    return {
      ...payload,
      experts: expertsByCategory.flatMap((g) => g.experts),
      expertsByCategory,
      projectContext: {
        name: project.name,
        region: project.region ?? undefined,
        category: project.category ?? undefined,
        surface: project.surface ?? undefined,
      },
      needs: {
        // Idem `getForProject` : jamais de spécialité retirée dans les besoins
        // affichés côté fournisseur (les métiers restent dans `trades`).
        specialties: keepSupplierSpecialties(plan.needs.specialties).map(specialtyLabel),
        trades: plan.needs.trades.map((t) => PROVIDER_TYPE_LABELS[t] ?? t),
      },
      regionLabel: project.region ? regionLabelFor(project.region) : "",
    };
  },
});
