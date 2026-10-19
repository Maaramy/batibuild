// ============================================================================
// MATÉRIAUX UTILISÉS — articles réellement nécessaires au projet.
// ----------------------------------------------------------------------------
// Module PUR (aucune dépendance Convex / React) : il transforme le quantitatif
// du projet en tableau d'articles. Deux sources, JAMAIS additionnées :
//   • le DQE lorsqu'il liste lui-même les articles (rénovation, garage,
//     piscine…) — il porte alors le scénario, les modifications d'articles et
//     les travaux complémentaires ;
//   • le détail matériaux du moteur BIM (`costEstimate.breakdown`) pour une
//     construction neuve, dont le DQE décrit des postes de travaux.
//
//   Article · Quantité · Unité · Prix unitaire · Prix total (TND)
//
// Règles :
//   • SOURCE UNIQUE : les articles proviennent du quantitatif du projet
//     (moteur BIM ou, à défaut, lignes « matériaux » du DQE). Aucune quantité,
//     aucun prix n'est inventé ni saisi à la main.
//   • Seules les catégories de MATÉRIAUX sont retenues (gros œuvre et second
//     œuvre). La main-d'œuvre, le transport, les études et les équipements ne
//     sont jamais comptés comme matériaux.
//   • Aucun double comptage : les articles sont agrégés par libellé + unité
//     (une seule ligne par article, quantité cumulée).
//   • Le prix unitaire suit le scénario budgétaire sélectionné (facteur
//     scénario / Standard) et la correction des anciennes marges d'imprévus.
//     Le total d'une ligne est TOUJOURS quantité × prix unitaire.
//   • Les travaux complémentaires du scénario « Personnalisé » ajoutent leurs
//     propres articles matériaux (déjà chiffrés par le moteur), sans jamais
//     recalculer ni dupliquer ceux de l'estimation de base.
//   • Le total des matériaux est la somme des lignes affichées : il ne doit
//     jamais être confondu avec le coût global de construction (qui comprend
//     aussi la main-d'œuvre, le transport, les études et les autres frais).
// ============================================================================

import { legacyContingencyFactor } from "@/lib/constructionCost";
import type { CustomWorkEstimate } from "@/convex/customWorksEngine";

/** Catégories du moteur BIM considérées comme des matériaux. */
export const MATERIAL_BREAKDOWN_CATEGORIES = ["gros_oeuvre", "second_oeuvre"] as const;

/** Catégorie technique d'un article (affichage uniquement). */
export type MaterialUsageSource = "bim" | "dqe" | "none";

export interface MaterialUsageRow {
  /** Clé stable (libellé + unité normalisés) — sert aussi de clé React. */
  key: string;
  /** Nom complet de l'article (et caractéristiques utiles). */
  article: string;
  /** Catégorie / lot d'origine (« Gros œuvre », « Garage »…). */
  category: string;
  quantity: number;
  unit: string;
  /** Prix unitaire du scénario sélectionné (TND). */
  unitPrice: number;
  /** Quantité × prix unitaire (TND). */
  total: number;
}

export interface MaterialUsageResult {
  rows: MaterialUsageRow[];
  /** Somme des lignes affichées (TND) — jamais le coût global. */
  total: number;
  /** Nombre d'articles distincts affichés. */
  articleCount: number;
  /** Origine réelle des quantités. */
  source: MaterialUsageSource;
}

/** Formes tolérantes (les données enregistrées peuvent être partielles). */
export interface MaterialBreakdownCategoryLike {
  category?: string;
  label?: string;
  items?: Array<{
    name?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    totalPrice?: number;
  }> | null;
}

export interface MaterialDqeLineLike {
  designation?: string;
  description?: string;
  sousLot?: string;
  nature?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  total?: number;
}

export interface MaterialDqeLotLike {
  name?: string;
  nature?: string;
  lines?: MaterialDqeLineLike[] | null;
}

export interface BuildMaterialUsageInput {
  /** Estimation enregistrée du projet (`projects.costEstimate`). */
  costEstimate: { breakdown?: MaterialBreakdownCategoryLike[] | null } | null | undefined;
  /**
   * Quantitatif détaillé au scénario affiché (`projects.dqe.lots`, mis à
   * l'échelle et personnalisé par l'appelant). Utilisé comme source dès qu'il
   * porte lui-même les articles matériaux ; sinon ignoré au profit du BIM.
   */
  dqeLots?: readonly MaterialDqeLotLike[] | null;
  /**
   * Facteur du scénario affiché (montant scénario / montant Standard). Il est
   * appliqué aux prix unitaires, exactement comme le Quantitatif détaillé.
   */
  scenarioFactor?: number;
  /**
   * Travaux complémentaires du scénario « Personnalisé » (chiffrés par le
   * moteur). Leurs articles matériaux sont ajoutés à la liste de base.
   */
  complementaryWorks?: readonly CustomWorkEstimate[] | null;
}

const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const roundQty = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

/** Normalise un libellé pour fusionner les doublons (accents, casse, espaces). */
export function normalizeMaterialKey(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const isMaterialCategory = (category: unknown): boolean =>
  (MATERIAL_BREAKDOWN_CATEGORIES as readonly string[]).includes(String(category ?? ""));

/** Une quantité strictement positive et un prix strictement positif. */
const isBillable = (quantity: number, unitPrice: number): boolean =>
  Number.isFinite(quantity) && quantity > 0 && Number.isFinite(unitPrice) && unitPrice > 0;

/**
 * Détecte un Quantitatif détaillé réellement « matériaux » (rénovation,
 * garage, piscine…) : son lot de gros œuvre liste alors les articles eux-mêmes
 * (ciment, sable, acier, briques…). Pour une construction neuve, le gros œuvre
 * est décrit en postes de travaux (m²) et les matériaux détaillés proviennent
 * du moteur BIM.
 */
const GRANULAR_MATERIAL_TEST =
  /ciment|sable|gravier|acier|fer a beton|brique|parpaing|hourdis|treillis|beton pret|bois de coffrage/;

function isGranularMaterialLot(lot: MaterialDqeLotLike): boolean {
  const name = normalizeMaterialKey(lot?.name);
  const looksLikeStructure =
    name.includes("gros") ||
    name.includes("oeuvre") ||
    name.includes("structure") ||
    name.includes("terrassement") ||
    name.includes("coque");
  if (!looksLikeStructure) return false;
  return (lot?.lines ?? []).some((line) => {
    const nature = String(line?.nature ?? "");
    if (nature && nature !== "materiaux") return false;
    return GRANULAR_MATERIAL_TEST.test(normalizeMaterialKey(line?.designation));
  });
}

/** Vrai si le DQE porte lui-même les articles matériaux (et non des postes). */
export function hasGranularDqeMaterials(
  dqeLots: readonly MaterialDqeLotLike[] | null | undefined,
): boolean {
  return (dqeLots ?? []).some((lot) => isGranularMaterialLot(lot));
}

interface Accumulator {
  article: string;
  category: string;
  unit: string;
  quantity: number;
  total: number;
  unitPrice: number;
}

/**
 * Construit le tableau « Matériaux utilisés » à partir des données réelles du
 * projet. Aucun montant fictif : si aucune donnée exploitable n'existe, le
 * résultat est vide (l'interface affiche alors un message explicite).
 */
export function buildMaterialUsage(input: BuildMaterialUsageInput): MaterialUsageResult {
  const legacyFactor = legacyContingencyFactor(input.costEstimate as any);
  const scenarioFactor =
    Number.isFinite(input.scenarioFactor) && (input.scenarioFactor as number) > 0
      ? (input.scenarioFactor as number)
      : 1;
  const factor = scenarioFactor * legacyFactor;

  const buckets = new Map<string, Accumulator>();
  let source: MaterialUsageSource = "none";
  const dqeIsGranular = hasGranularDqeMaterials(input.dqeLots);

  const addRow = (
    article: unknown,
    category: unknown,
    quantityRaw: unknown,
    unitRaw: unknown,
    unitPriceRaw: unknown,
    priceFactor: number,
  ) => {
    const label = String(article ?? "").trim();
    const unit = String(unitRaw ?? "").trim();
    const quantity = roundQty(Number(quantityRaw) || 0);
    const unitPrice = round2((Number(unitPriceRaw) || 0) * priceFactor);
    if (!label || !unit || !isBillable(quantity, unitPrice)) return;

    const key = `${normalizeMaterialKey(label)}::${normalizeMaterialKey(unit)}`;
    const total = round2(quantity * unitPrice);
    const existing = buckets.get(key);
    if (existing) {
      existing.quantity = roundQty(existing.quantity + quantity);
      existing.total = round2(existing.total + total);
      // Prix unitaire moyen réellement facturé (quantité pondérée).
      existing.unitPrice = round2(existing.total / existing.quantity);
      return;
    }
    buckets.set(key, {
      article: label,
      category: String(category ?? "").trim() || "Matériaux",
      unit,
      quantity,
      total,
      unitPrice,
    });
  };

  // ── 1. Quantitatif détaillé réellement « matériaux » ─────────────────────
  // Pour les projets dont le DQE liste lui-même les articles (rénovation,
  // garage, piscine…), il est la source la plus fidèle : il porte déjà le
  // scénario affiché, les modifications d'articles et les travaux
  // complémentaires. Les prix sont repris SANS second facteur (déjà appliqué).
  if (dqeIsGranular) {
    for (const lot of input.dqeLots ?? []) {
      for (const line of lot?.lines ?? []) {
        const nature = String(line?.nature ?? lot?.nature ?? "");
        if (nature !== "materiaux") continue;
        addRow(
          line?.designation,
          line?.sousLot || lot?.name,
          line?.quantity,
          line?.unit,
          line?.unitPrice,
          1,
        );
      }
    }
    if (buckets.size > 0) source = "dqe";
  }

  // ── 2. Source principale pour une construction neuve : articles BIM ───────
  // Le quantitatif de gros œuvre / second œuvre du moteur BIM fournit les
  // quantités réelles (ciment, sable, gravier, acier, briques, hourdis…).
  if (source === "none") {
    const breakdown = input.costEstimate?.breakdown ?? [];
    for (const cat of breakdown) {
      if (!isMaterialCategory(cat?.category)) continue;
      for (const item of cat?.items ?? []) {
        const label = String(item?.name ?? "").trim();
        const unit = String(item?.unit ?? "").trim();
        const quantity = Number(item?.quantity) || 0;
        // Prix unitaire de référence du catalogue (le total enregistré peut
        // avoir été recalibré : on repart du prix unitaire × quantité).
        const unitPrice = Number(item?.unitPrice) || 0;
        if (!label || !unit || quantity <= 0 || unitPrice <= 0) continue;
        addRow(label, cat?.label, quantity, unit, unitPrice, factor);
      }
    }
    if (buckets.size > 0) source = "bim";
  }

  // ── 3. Travaux complémentaires (scénario « Personnalisé ») ────────────────
  // Uniquement lorsque la source est le moteur BIM : en mode DQE, les travaux
  // complémentaires sont déjà compris dans les lots transmis (aucun doublon).
  // Leurs montants sont déjà chiffrés pour le scénario actif.
  if (source === "bim") {
    for (const work of input.complementaryWorks ?? []) {
      for (const line of work?.lines ?? []) {
        if (line?.nature !== "materiaux") continue;
        addRow(line.designation, work.label, line.quantity, line.unit, line.unitPrice, 1);
      }
    }
  }

  const rows: MaterialUsageRow[] = [...buckets.entries()].map(([key, value]) => ({
    key,
    article: value.article,
    category: value.category,
    quantity: value.quantity,
    unit: value.unit,
    unitPrice: value.unitPrice,
    total: value.total,
  }));

  // Ordre stable et lisible : catégorie, puis montant décroissant.
  rows.sort((a, b) => {
    const byCategory = a.category.localeCompare(b.category, "fr");
    if (byCategory !== 0) return byCategory;
    if (b.total !== a.total) return b.total - a.total;
    return a.article.localeCompare(b.article, "fr");
  });

  const total = round2(rows.reduce((sum, row) => sum + row.total, 0));
  return { rows, total, articleCount: rows.length, source };
}

/** Liste transmissible au devis fournisseur (nom, quantité, unité). */
export function materialUsageQuoteList(
  result: MaterialUsageResult | null | undefined,
): Array<{ name: string; quantity: number; unit: string }> {
  return (result?.rows ?? []).map((row) => ({
    name: row.article,
    quantity: row.quantity,
    unit: row.unit,
  }));
}
