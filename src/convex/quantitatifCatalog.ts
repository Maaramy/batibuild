// ============================================================================
// ARTICLES COMPATIBLES — substitution d'un article du « Quantitatif détaillé »
// ----------------------------------------------------------------------------
// S'appuie sur le référentiel existant (catalogue officiel Tunisie 2026) et sur
// les prix administrables de la table `materialPrices`. Les articles proposés
// sont filtrés par usage : même catégorie de travaux que la référence résolue,
// en privilégiant l'unité compatible, puis le même sous-lot, puis le prix.
// ============================================================================

import { TUNISIA_2026_CATALOG, type CatalogItem } from "./materialCatalog2026";
import { normalizeDesignationKey, resolveCatalogReference } from "./dqeEngine";

export interface CompatibleArticle {
  name: string;
  unit: string;
  unitPrice: number;
  category: string;
  subcategory?: string;
  sku?: string;
  /** L'unité correspond à celle de l'article d'origine (quantité conservée). */
  unitCompatible: boolean;
  /** L'article appartient au même sous-lot / sous-famille. */
  sameSubcategory: boolean;
}

export interface CompatibleArticlesResult {
  /** Référence de l'article d'origine dans le catalogue (si résolue). */
  reference: {
    name: string;
    unit: string;
    unitPrice: number;
    category: string;
    subcategory?: string;
  } | null;
  articles: CompatibleArticle[];
}

/** Index normalisé des prix administrables (table `materialPrices`). */
export function buildLivePriceIndex(
  rows: { name: string; unit: string; unitPrice: number }[],
): Map<string, { unit: string; unitPrice: number }> {
  const map = new Map<string, { unit: string; unitPrice: number }>();
  for (const r of rows) {
    if (!r?.name || !(r.unitPrice > 0)) continue;
    map.set(normalizeDesignationKey(r.name), { unit: r.unit, unitPrice: r.unitPrice });
  }
  return map;
}

function priceOf(
  item: CatalogItem,
  live?: Map<string, { unit: string; unitPrice: number }>,
): { unit: string; unitPrice: number } {
  const liveHit = live?.get(normalizeDesignationKey(item.name));
  if (liveHit && liveHit.unitPrice > 0) {
    return { unit: liveHit.unit || item.unit, unitPrice: liveHit.unitPrice };
  }
  return { unit: item.unit, unitPrice: item.unitPrice };
}

/**
 * Liste prédéfinie des articles compatibles avec un article du quantitatif :
 * même catégorie de travaux (usage), unité compatible privilégiée.
 */
export function getCompatibleArticles(
  designation: string,
  lineUnit?: string,
  livePrices?: Map<string, { unit: string; unitPrice: number }>,
  limit = 24,
): CompatibleArticlesResult {
  const ref = resolveCatalogReference(designation);
  if (!ref) return { reference: null, articles: [] };

  const refPrice = priceOf(ref, livePrices);
  const excluded = new Set<string>([
    normalizeDesignationKey(designation),
    normalizeDesignationKey(ref.name),
  ]);

  const pool = TUNISIA_2026_CATALOG.filter(
    (item) =>
      item.category === ref.category && !excluded.has(normalizeDesignationKey(item.name)),
  );

  const unit = lineUnit || refPrice.unit;
  const articles: CompatibleArticle[] = pool.map((item) => {
    const p = priceOf(item, livePrices);
    return {
      name: item.name,
      unit: p.unit,
      unitPrice: p.unitPrice,
      category: item.category,
      subcategory: item.subcategory,
      sku: item.sku,
      unitCompatible: p.unit === unit,
      sameSubcategory: !!ref.subcategory && item.subcategory === ref.subcategory,
    };
  });

  articles.sort((a, b) => {
    if (a.unitCompatible !== b.unitCompatible) return a.unitCompatible ? -1 : 1;
    if (a.sameSubcategory !== b.sameSubcategory) return a.sameSubcategory ? -1 : 1;
    if (a.unitPrice !== b.unitPrice) return a.unitPrice - b.unitPrice;
    return a.name.localeCompare(b.name, "fr");
  });

  return {
    reference: {
      name: ref.name,
      unit: refPrice.unit,
      unitPrice: refPrice.unitPrice,
      category: ref.category,
      subcategory: ref.subcategory,
    },
    articles: articles.slice(0, limit),
  };
}
