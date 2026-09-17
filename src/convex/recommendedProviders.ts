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
import { getFreePlanStatus } from "./access";
import { SPECIALTY_TO_PROVIDER_TYPE } from "./schema";
import { SUPPLIER_SPECIALTIES_LABELS } from "../lib/supplierSpecialties";
import { resolveProjectType } from "./projectTypes";

// ============================================================================
// 1. BIBLIOTHÈQUE DE BESOINS — type de projet → spécialités fournisseurs
//    (clés = SUPPLIER_SPECIALTIES, donc compatibles avec les profils réels)
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
  peinture_interieure: [
    "peinture", "second_oeuvre", "isolation",
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
// 6. FONCTIONS CONVEX — requête de lecture + génération idempotente
// ============================================================================

export type RecommendedType = "supplier" | "expert";

export interface RecommendedProviderView {
  associationId: string;
  type: RecommendedType;
  profileId: string;
  name: string;
  logo?: string;
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
}

export interface RecommendationsPayload {
  suppliers: RecommendedProviderView[];
  experts: RecommendedProviderView[];
  needs: { specialties: string[]; trades: string[] };
  regionLabel: string;
  generatedAt: number;
}

/** Libellé d'une spécialité (repli sur la clé brute). */
function specialtyLabel(key: string): string {
  return SUPPLIER_SPECIALTIES_LABELS[key] ?? PROVIDER_TYPE_LABELS[key] ?? key;
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
    const base = {
      associationId: a._id as string,
      profileId: a.providerId as string,
      regionRank: rank,
      matchedNeeds: matched.map(specialtyLabel),
      specialties: (profile.specialties ?? []).slice(0, 4).map(specialtyLabel),
    };
    if (a.type === "supplier") {
      suppliers.push({
        ...base,
        type: "supplier",
        name: profile.companyName ?? "Fournisseur",
        logo: profile.logo ?? undefined,
        phone: profile.phone,
        email: profile.email ?? undefined,
        address: profile.address ?? undefined,
        website: profile.website ?? undefined,
        regionLabel:
          (profile.regions ?? []).map(regionLabelFor).slice(0, 3).join(", ") ||
          "Tunisie",
        availability:
          profile.plan === "monthly" && profile.subscriptionStatus === "active"
            ? "Abonné actif"
            : profile.subscriptionStatus === "trial"
              ? "Période d'essai"
              : "Profil vérifié",
      });
    } else {
      experts.push({
        ...base,
        type: "expert",
        name: profile.displayName ?? "Expert",
        logo: profile.logo ?? undefined,
        phone: profile.phone,
        email: profile.email ?? undefined,
        address: profile.address ?? undefined,
        website: profile.website ?? undefined,
        profession: profile.profession,
        regionLabel:
          (profile.regions ?? []).map(regionLabelFor).slice(0, 3).join(", ") ||
          "Tunisie",
        availability:
          profile.plan === "monthly" && profile.subscriptionStatus === "active"
            ? "Abonné actif"
            : profile.subscriptionStatus === "trial"
              ? "Période d'essai"
              : "Profil vérifié",
      });
    }
  }

  return {
    suppliers,
    experts,
    needs: { specialties: [], trades: [] },
    regionLabel: "",
    // 0 = aucune association : la section n'a jamais été générée pour ce projet.
    generatedAt: associations.length > 0 ? Math.max(...associations.map((a: any) => a.createdAt)) : 0,
  };
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
    return {
      ...payload,
      needs: {
        specialties: needs.specialties.map(specialtyLabel),
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

    // 4) Renvoie le payload complet (existants + nouveaux).
    const payload = await readProjectRecommendations(ctx, args.projectId);
    return {
      ...payload,
      needs: {
        specialties: plan.needs.specialties.map(specialtyLabel),
        trades: plan.needs.trades.map((t) => PROVIDER_TYPE_LABELS[t] ?? t),
      },
      regionLabel: project.region ? regionLabelFor(project.region) : "",
    };
  },
});
