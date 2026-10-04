// ============================================================================
// CHOIX MATÉRIAUX AI — MOTEUR PARTAGÉ (logique pure, sans Convex / React)
// ----------------------------------------------------------------------------
// PRINCIPE ABSOLU : ce module n'invente AUCUNE donnée et ne possède AUCUN
// moteur de prix propre. Il exploite les résultats réels du module
// « Coût estimatif → Quantitatif détaillé » :
//
//   Quantitatif détaillé (projet.dqe)
//     × facteur du scénario (Économique / Standard / Premium, issus de
//       `costEstimate.budgetScenarios` — même source que la page projet)
//     = lignes de matériaux du scénario actif
//
// Les désignations, unités et quantités sont reprises TELLES QUELLES du
// Quantitatif détaillé (`articleId` stable = `${lotId}::${index}`) et les prix
// proviennent du même calcul que celui affiché dans « Coût estimatif »
// (`budgetScenarioFactor` + `scaleDqeLots`, logique partagée).
//
// Utilisé par la page « Choix matériaux AI » (affichage immédiat, aucun
// recalcul) et par les mutations Convex de `materialSelections.ts` (recalcul
// officiel côté serveur avant sauvegarde) : une seule logique de calcul, un
// seul résultat, partagé par les deux modules.
// ============================================================================

import { TUNISIA_2026_CATALOG } from "./materialCatalog2026";
import { normalizeDesignationKey, resolveCatalogReference } from "./dqeEngine";
import {
  budgetScenarioFactor,
  scaleDqeLots,
  quantitatifLineKey,
  BUDGET_SCENARIO_LABELS,
  type BudgetScenarioKey,
} from "./quantitatifCustomLogic";

const asArr = <T,>(x: any): T[] => (Array.isArray(x) ? x : []);
const round2 = (n: number) => Math.round(n * 100) / 100;

// ── Scénarios ───────────────────────────────────────────────────────────────
export type MaterialScenarioKey = BudgetScenarioKey;

export const MATERIAL_SCENARIO_KEYS: MaterialScenarioKey[] = [
  "economique",
  "standard",
  "premium",
];

export const MATERIAL_SCENARIO_LABELS: Record<MaterialScenarioKey, string> = {
  ...BUDGET_SCENARIO_LABELS,
};

// ── Qualité ─────────────────────────────────────────────────────────────────
export type MaterialQualityValue = "economique" | "standard" | "premium" | "inconnue";

export const MATERIAL_QUALITY_LABELS: Record<MaterialQualityValue, string> = {
  economique: "Économique",
  standard: "Standard",
  premium: "Premium",
  inconnue: "Qualité à préciser",
};

/**
 * La gamme suit le scénario du Coût estimatif. Sans référence catalogue, la
 * qualité n'est pas connue : aucune valeur n'est inventée (§12).
 */
export function qualityForScenario(
  scenario: MaterialScenarioKey,
  hasCatalogReference: boolean,
): MaterialQualityValue {
  return hasCatalogReference ? (scenario as MaterialQualityValue) : "inconnue";
}

// ── Référence catalogue ─────────────────────────────────────────────────────
export interface CatalogReference {
  materialId: string;
  name: string;
  unit: string;
  unitPrice: number;
  category: string;
  subcategory?: string;
  sku?: string;
  priceQuality?: string;
  confidence?: number;
}

const CATALOG_BY_KEY = new Map<string, CatalogReference>();
for (const item of TUNISIA_2026_CATALOG as any[]) {
  const key = normalizeDesignationKey(String(item.name ?? ""));
  if (!key || CATALOG_BY_KEY.has(key)) continue;
  CATALOG_BY_KEY.set(key, {
    materialId: item.sku ? String(item.sku) : `cat:${key}`,
    name: String(item.name),
    unit: String(item.unit),
    unitPrice: Number(item.unitPrice) || 0,
    category: String(item.category ?? ""),
    subcategory: item.subcategory ? String(item.subcategory) : undefined,
    sku: item.sku ? String(item.sku) : undefined,
    priceQuality: item.quality ? String(item.quality) : undefined,
    confidence: typeof item.confidence === "number" ? item.confidence : undefined,
  });
}

/** Référence catalogue d'une désignation du Quantitatif détaillé. */
export function catalogReferenceFor(designation: string): CatalogReference | null {
  const ref: any = resolveCatalogReference(String(designation ?? ""));
  if (ref) {
    const key = normalizeDesignationKey(String(ref.name ?? ""));
    return (
      CATALOG_BY_KEY.get(key) ?? {
        materialId: ref.sku ? String(ref.sku) : `cat:${key}`,
        name: String(ref.name ?? ""),
        unit: String(ref.unit ?? ""),
        unitPrice: Number(ref.unitPrice) || 0,
        category: String(ref.category ?? ""),
        subcategory: ref.subcategory ? String(ref.subcategory) : undefined,
        sku: ref.sku ? String(ref.sku) : undefined,
        priceQuality: ref.quality ? String(ref.quality) : undefined,
        confidence: typeof ref.confidence === "number" ? ref.confidence : undefined,
      }
    );
  }
  return CATALOG_BY_KEY.get(normalizeDesignationKey(designation)) ?? null;
}

// ── Conditionnements ────────────────────────────────────────────────────────
/** Conditionnement réellement lisible dans une désignation officielle. */
export interface PackageRule {
  /** Taille du conditionnement exprimée dans l'unité du besoin (kg). */
  size: number;
  /** Unité du conditionnement (« sac », « panneau »). */
  unit: string;
  /** Unité du besoin couverte par le conditionnement. */
  needUnit: string;
}

/**
 * Conditionnement déduit d'une désignation officielle (« (sac 50 kg) »).
 * Aucune conversion n'est inventée : sans mention explicite, `null`.
 */
export function packageRuleFor(designation: string): PackageRule | null {
  const text = String(designation ?? "");
  const sac = /\(sac\s*(\d+(?:[.,]\d+)?)\s*kg\)/i.exec(text);
  if (sac) {
    const size = Number(String(sac[1]).replace(",", "."));
    if (size > 0) return { size, unit: "sac", needUnit: "kg" };
  }
  if (/\(panneau\)/i.test(text)) return { size: 1, unit: "panneau", needUnit: "panneau" };
  return null;
}

// ── Lignes de matériaux ─────────────────────────────────────────────────────
/** Ligne de matériau issue du Quantitatif détaillé (scénario appliqué). */
export interface MaterialLine {
  /** Identifiant stable de l'article : `${lotId}::${index}`. */
  articleId: string;
  lotId: string;
  lotName: string;
  /** Catégorie du catalogue officiel (sous-catégorie de travaux). */
  category: string;
  /** Sous-lot du Quantitatif. */
  subcategory?: string;
  /** Désignation EXACTE du Quantitatif détaillé (jamais renommée). */
  designation: string;
  description?: string;
  unit: string;
  /** Quantité calculée par le Quantitatif détaillé. */
  quantity: number;
  /** Prix unitaire du scénario (même calcul que « Coût estimatif »). */
  unitPrice: number;
  /** Prix total de la ligne = quantité × prix unitaire. */
  total: number;
  scenario: MaterialScenarioKey;
  quality: MaterialQualityValue;
  nature: string;
  isMaterial: boolean;
  materialId?: string;
  catalogName?: string;
  catalogUnit?: string;
  catalogUnitPrice?: string | number;
  priceQuality?: string;
  confidence?: number;
  /** Faux lorsque le prix n'existe pas dans les données réelles. */
  priceAvailable: boolean;
  qualityAvailable: boolean;
  customized?: boolean;
  packageRule?: PackageRule;
  /** Source du calcul — traçabilité (§17.26). */
  source: "quantitatif_detaille";
}

/**
 * Construit les lignes de matériaux à partir des lots du Quantitatif détaillé
 * **déjà mis à l'échelle du scénario**.
 *
 * Invariant : `total = quantité × prix unitaire` (toujours recalculé) et
 * aucune désignation n'est modifiée.
 */
export function materialLinesFromLots(
  lots: any[] | null | undefined,
  scenario: MaterialScenarioKey,
): MaterialLine[] {
  const out: MaterialLine[] = [];
  asArr<any>(lots).forEach((lot, lotIdx) => {
    const lotId = String(lot?.id ?? `lot_${lotIdx}`);
    asArr<any>(lot?.lines).forEach((line: any, index: number) => {
      const quantity = Number(line?.quantity) || 0;
      const unitPrice = Number(line?.unitPrice) || 0;
      const designation = String(line?.designation ?? "").trim();
      const catalog = designation ? catalogReferenceFor(designation) : null;
      const isMaterial = String(line?.nature ?? "materiaux") === "materiaux";
      out.push({
        articleId: quantitatifLineKey(lotId, index),
        lotId,
        lotName: String(lot?.name ?? ""),
        category: catalog?.category ?? "",
        subcategory: line?.sousLot ? String(line.sousLot) : catalog?.subcategory,
        designation,
        description: line?.description ? String(line.description) : undefined,
        unit: String(line?.unit ?? catalog?.unit ?? ""),
        quantity,
        unitPrice,
        total: quantity * unitPrice,
        scenario,
        quality: isMaterial ? qualityForScenario(scenario, !!catalog) : "inconnue",
        nature: String(line?.nature ?? "materiaux"),
        isMaterial,
        materialId: catalog?.materialId,
        catalogName: catalog?.name,
        catalogUnit: catalog?.unit,
        catalogUnitPrice: catalog?.unitPrice,
        priceQuality: catalog?.priceQuality,
        confidence: catalog?.confidence,
        priceAvailable: unitPrice > 1e-9,
        qualityAvailable: !!catalog,
        customized: line?.customized === true ? true : undefined,
        packageRule: catalog ? (packageRuleFor(catalog.name) ?? undefined) : undefined,
        source: "quantitatif_detaille",
      });
    });
  });
  return out;
}

/**
 * Quantitatif détaillé au niveau d'un scénario : applique exactement le même
 * facteur que la page « Coût estimatif » (facteur du scénario × correction des
 * anciennes marges d'imprévus). Le Quantitatif d'origine n'est jamais modifié.
 */
export function quantitatifForScenario(
  rawLots: any[] | null | undefined,
  scenarios: any,
  scenario: MaterialScenarioKey,
  realCostFactor = 1,
): any[] {
  const factor = budgetScenarioFactor(scenarios, scenario) * (realCostFactor || 1);
  if (factor === 1) return asArr<any>(rawLots);
  return scaleDqeLots(asArr<any>(rawLots), factor);
}

/** Lignes de matériaux d'un scénario (calcul complet et déterministe). */
export function buildScenarioMaterialLines(
  rawLots: any[] | null | undefined,
  scenarios: any,
  scenario: MaterialScenarioKey,
  realCostFactor = 1,
): MaterialLine[] {
  return materialLinesFromLots(
    quantitatifForScenario(rawLots, scenarios, scenario, realCostFactor),
    scenario,
  );
}

/** Total des matériaux = somme des prix totaux des lignes (§2, §18.5). */
export function materialsTotal(lines: MaterialLine[] | null | undefined): number {
  return asArr<MaterialLine>(lines).reduce((s, l) => s + (Number(l?.total) || 0), 0);
}

/** Lignes de nature « matériaux » uniquement (les besoins quantitatifs réels). */
export function materialsOnly(lines: MaterialLine[] | null | undefined): MaterialLine[] {
  return asArr<MaterialLine>(lines).filter((l) => l.isMaterial);
}

// ── Contexte des scénarios ─────────────────────────────────────────────────
export interface ScenarioContext {
  key: MaterialScenarioKey;
  label: string;
  /** Facteur du scénario par rapport au Standard (donnée réelle du projet). */
  factor: number;
  /** Coût total des travaux du scénario (budget projet). */
  totalCost: number;
  costPerM2: number;
  available: boolean;
  /** Vrai pour le scénario de référence du Quantitatif détaillé. */
  reference: boolean;
}

/** Contexte des trois scénarios, dérivé de `costEstimate.budgetScenarios`. */
export function buildScenarioContexts(
  costs:
    | { budgetScenarios?: any; totalCost?: number; costPerSquareMeter?: number }
    | null
    | undefined,
): ScenarioContext[] {
  const scenarios = costs?.budgetScenarios;
  return MATERIAL_SCENARIO_KEYS.map((key) => {
    const s = scenarios?.[key];
    return {
      key,
      label: MATERIAL_SCENARIO_LABELS[key],
      factor: budgetScenarioFactor(scenarios, key),
      totalCost:
        Number(s?.totalCost) || (key === "standard" ? Number(costs?.totalCost) || 0 : 0),
      costPerM2:
        Number(s?.costPerM2) ||
        (key === "standard" ? Number(costs?.costPerSquareMeter) || 0 : 0),
      available: !!(Number(s?.totalCost) || (key === "standard" && Number(costs?.totalCost))),
      reference: key === "standard",
    };
  });
}

/** Scénario actif : scénario persisté s'il est disponible, sinon Standard. */
export function resolveActiveScenario(
  stored: string | null | undefined,
  contexts: ScenarioContext[],
): MaterialScenarioKey {
  const wanted = String(stored ?? "").trim();
  if ((MATERIAL_SCENARIO_KEYS as readonly string[]).includes(wanted)) {
    const ctx = contexts.find((c) => c.key === wanted);
    if (ctx?.available) return ctx.key;
  }
  const standard = contexts.find((c) => c.key === "standard" && c.available);
  return standard?.key ?? "standard";
}

// ── Variantes (comparaison Économique ↔ Standard ↔ Premium) ────────────────
export interface MaterialVariant {
  scenario: MaterialScenarioKey;
  label: string;
  quality: MaterialQualityValue;
  qualityLabel: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  total: number;
  /** Écart de coût par rapport au scénario de référence (Standard). */
  budgetImpact: number;
  impactPct: number;
  available: boolean;
  recommended: boolean;
  note: string;
}

const VARIANT_NOTES: Record<MaterialScenarioKey, string> = {
  economique: "Budget",
  standard: "⭐ Recommandé",
  premium: "Performance",
};

/**
 * Variantes réelles d'un besoin : la quantité reste celle du Quantitatif
 * détaillé (elle ne dépend pas du scénario) ; seul le prix unitaire change,
 * via le même moteur de coût (facteur du scénario).
 */
export function variantsForLine(
  line: MaterialLine,
  standardUnitPrice: number,
  contexts: ScenarioContext[],
  recommendedScenario: MaterialScenarioKey,
): MaterialVariant[] {
  const referenceFactor = contexts.find((c) => c.reference)?.factor || 1;
  const lineFactor = contexts.find((c) => c.key === line.scenario)?.factor || 1;
  const base =
    Number.isFinite(standardUnitPrice) && standardUnitPrice > 0
      ? standardUnitPrice
      : line.unitPrice / (lineFactor || 1);
  const referenceTotal = line.quantity * base * referenceFactor;
  return contexts.map((ctx) => {
    const unitPrice = round2(base * ctx.factor);
    const total = line.quantity * unitPrice;
    const budgetImpact = total - referenceTotal;
    return {
      scenario: ctx.key,
      label: ctx.label,
      quality: qualityForScenario(ctx.key, line.qualityAvailable),
      qualityLabel: line.qualityAvailable
        ? MATERIAL_QUALITY_LABELS[ctx.key as MaterialQualityValue]
        : MATERIAL_QUALITY_LABELS.inconnue,
      unit: line.unit,
      unitPrice,
      quantity: line.quantity,
      total,
      budgetImpact,
      impactPct: referenceTotal > 0 ? (budgetImpact / referenceTotal) * 100 : 0,
      available: ctx.available && line.priceAvailable,
      recommended: ctx.key === recommendedScenario,
      note: VARIANT_NOTES[ctx.key],
    };
  });
}

// ── Score intelligent prix / qualité (§7) ──────────────────────────────────
export type PriceQualityLevel = "excellent" | "bon" | "moyen" | "a_optimiser";

export const PRICE_QUALITY_LABELS: Record<PriceQualityLevel, string> = {
  excellent: "Excellent",
  bon: "Bon",
  moyen: "Moyen",
  a_optimiser: "À optimiser",
};

export interface PriceQualityScore {
  level: PriceQualityLevel;
  label: string;
  /** Note sur 100 (outil d'aide à la décision). */
  score: number;
  /** Explication affichée derrière « Pourquoi cette recommandation ? ». */
  reason: string;
  /** Signaux réellement observés dans les données du projet. */
  signals: string[];
}

/**
 * Score prix/qualité d'une ligne, calculé uniquement à partir de données
 * réelles : gamme du scénario, existence d'une référence catalogue, qualité de
 * la source de prix et prix payé par rapport au prix de référence catalogue.
 */
export function scorePriceQuality(
  line: MaterialLine,
  variants: MaterialVariant[] | null | undefined,
  activeScenario: MaterialScenarioKey,
): PriceQualityScore {
  const signals: string[] = [];

  if (!line.priceAvailable) {
    return {
      level: "a_optimiser",
      label: PRICE_QUALITY_LABELS.a_optimiser,
      score: 0,
      reason:
        "Le prix de cet article n'est pas disponible dans les données du projet : aucune évaluation n'est possible sans inventer une valeur.",
      signals: ["Prix non disponible"],
    };
  }

  let score = 50;
  if (line.qualityAvailable) {
    score += 15;
    signals.push(
      `Référence officielle ${line.materialId ?? ""}${
        line.catalogName ? ` — ${line.catalogName}` : ""
      }`.trim(),
    );
  } else {
    score -= 10;
    signals.push("Aucune référence catalogue : qualité à préciser");
  }

  if (line.priceQuality === "observé_en_ligne") {
    score += 12;
    signals.push("Prix observé en ligne (donnée la plus fraîche)");
  } else if (line.priceQuality === "publication_2026") {
    score += 8;
    signals.push("Prix issu de la publication officielle 2026");
  } else if (line.priceQuality === "estimation_indicative") {
    score -= 5;
    signals.push("Prix indicatif : à confirmer auprès d'un fournisseur");
  }
  if (typeof line.confidence === "number") {
    score += Math.round((line.confidence - 0.5) * 20);
    signals.push(`Indice de confiance ${Math.round(line.confidence * 100)} %`);
  }

  const reference = Number(line.catalogUnitPrice) || 0;
  if (reference > 0) {
    const ratio = line.unitPrice / reference;
    if (ratio <= 0.98) {
      score += 12;
      signals.push(
        `Prix inférieur au prix catalogue de référence (${Math.round((1 - ratio) * 100)} % de moins)`,
      );
    } else if (ratio >= 1.08) {
      score -= 12;
      signals.push(
        `Prix supérieur au prix catalogue de référence (+${Math.round((ratio - 1) * 100)} %)`,
      );
    } else {
      signals.push("Prix conforme au prix catalogue de référence");
    }
  }

  if (activeScenario === "premium") {
    signals.push("Scénario Premium : gamme supérieure, budget plus élevé");
  } else if (activeScenario === "economique") {
    score += 5;
    signals.push("Scénario Économique : optimisation budgétaire maximale");
  } else {
    score += 8;
    signals.push("Scénario Standard : compromis prix / qualité de référence");
  }

  const cheaper = asArr<MaterialVariant>(variants)
    .filter((v) => v.available && v.total < line.total - 1)
    .sort((a, b) => a.total - b.total)[0];
  if (cheaper) {
    const saving = line.total - cheaper.total;
    if (activeScenario === "premium") {
      score -= 8;
      signals.push(
        `Une variante ${cheaper.label} réduirait le coût de ${Math.round(saving)} TND`,
      );
    } else {
      signals.push(
        `Économie possible de ${Math.round(saving)} TND avec la variante ${cheaper.label}`,
      );
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const level: PriceQualityLevel =
    score >= 80 ? "excellent" : score >= 62 ? "bon" : score >= 45 ? "moyen" : "a_optimiser";
  const reasons: Record<PriceQualityLevel, string> = {
    excellent:
      "Le matériau retenu présente un excellent rapport entre son prix réel dans le projet et le niveau de qualité attendu pour ce scénario.",
    bon:
      "Le rapport qualité/prix est bon : le prix correspond à la gamme du scénario et la référence est fiable.",
    moyen:
      "Le rapport qualité/prix est correct mais perfectible : vérifiez la gamme ou le prix auprès d'un fournisseur.",
    a_optimiser:
      "Le rapport qualité/prix peut être optimisé : une variante ou une mise à jour de prix améliorerait le résultat.",
  };
  return { level, label: PRICE_QUALITY_LABELS[level], score, reason: reasons[level], signals };
}

// ── Intelligence prédictive (§6) ───────────────────────────────────────────
export type RecommendationKind =
  | "keep"
  | "economy_available"
  | "premium_impact"
  | "missing_data"
  | "verify";

export interface MaterialRecommendation {
  articleId: string;
  designation: string;
  kind: RecommendationKind;
  title: string;
  message: string;
  /** Économie potentielle (TND) sans changer la quantité. */
  savings?: number;
  /** Surcoût (TND) de la variante actuelle. */
  extraCost?: number;
  alternativeScenario?: MaterialScenarioKey;
  /** Base factuelle de la recommandation (toujours des données réelles). */
  basis: string;
}

/**
 * Recommandations de l'IA prédictive : chaque message est construit sur des
 * montants réels du projet (aucun prix fictif). L'IA propose, l'utilisateur
 * décide — aucune recommandation n'est appliquée automatiquement.
 */
export function predictiveRecommendations(
  lines: MaterialLine[] | null | undefined,
  variantsByArticle: Record<string, MaterialVariant[] | undefined>,
  activeScenario: MaterialScenarioKey,
): MaterialRecommendation[] {
  const out: MaterialRecommendation[] = [];
  for (const line of materialsOnly(lines)) {
    if (!line.priceAvailable) {
      out.push({
        articleId: line.articleId,
        designation: line.designation,
        kind: "missing_data",
        title: "Prix non disponible",
        message: `Le prix de « ${line.designation} » n'est pas renseigné dans les données du projet. Complétez la base de prix pour obtenir une recommandation chiffrée.`,
        basis: "Quantitatif détaillé — prix unitaire absent",
      });
      continue;
    }

    const variants = asArr<MaterialVariant>(variantsByArticle[line.articleId]);
    const cheaper = variants
      .filter((v) => v.available && v.total < line.total - 1)
      .sort((a, b) => a.total - b.total)[0];
    const pricier = variants
      .filter((v) => v.available && v.total > line.total + 1)
      .sort((a, b) => b.total - a.total)[0];

    if (activeScenario === "premium" && cheaper) {
      const diff = line.total - cheaper.total;
      out.push({
        articleId: line.articleId,
        designation: line.designation,
        kind: "premium_impact",
        title: "Attention : impact budgétaire",
        message: `« ${line.designation} » en Premium augmente le budget de ${Math.round(diff)} TND par rapport à la variante ${cheaper.label}. Son niveau de performance supérieur peut toutefois être pertinent pour cette application.`,
        savings: diff,
        alternativeScenario: cheaper.scenario,
        basis: `Variante ${cheaper.label} du Quantitatif détaillé`,
      });
    } else if (cheaper && line.total > 0) {
      const diff = line.total - cheaper.total;
      out.push({
        articleId: line.articleId,
        designation: line.designation,
        kind: "economy_available",
        title: "Alternative recommandée",
        message: `Une variante ${cheaper.label} permettrait de réduire le coût des matériaux de ${Math.round(diff)} TND tout en conservant la quantité calculée pour cet ouvrage.`,
        savings: diff,
        alternativeScenario: cheaper.scenario,
        basis: `Variante ${cheaper.label} du Quantitatif détaillé`,
      });
    } else if (pricier) {
      const diff = pricier.total - line.total;
      out.push({
        articleId: line.articleId,
        designation: line.designation,
        kind: "keep",
        title: "Choix pertinent",
        message: `Le matériau ${MATERIAL_SCENARIO_LABELS[activeScenario]} retenu offre actuellement le meilleur compromis entre prix et qualité pour « ${line.designation} » : la variante ${pricier.label} coûterait ${Math.round(diff)} TND de plus.`,
        extraCost: diff,
        alternativeScenario: pricier.scenario,
        basis: "Variantes comparées du Quantitatif détaillé",
      });
    }
  }
  return out;
}

// ── Conditionnements (§17.14) ──────────────────────────────────────────────
export interface PackagingInfo {
  need: number;
  needUnit: string;
  packageSize: number;
  packageUnit: string;
  /** Quantité réellement achetée (arrondi au conditionnement supérieur). */
  purchasedQty: number;
  coveredQty: number;
  surplus: number;
  unitPrice: number;
  purchasedCost: number;
  extraCost: number;
}

/**
 * Conversion de la quantité calculée en conditionnements réels. Retourne `null`
 * lorsque le conditionnement n'est pas explicitement connu ou que l'unité du
 * Quantitatif est déjà celle du conditionnement (aucune conversion inventée).
 */
export function packagingForLine(line: MaterialLine): PackagingInfo | null {
  const rule = line.packageRule;
  if (!rule || !line.priceAvailable) return null;
  const need = Number(line.quantity) || 0;
  if (need <= 0 || rule.size <= 0) return null;
  const unit = String(line.unit ?? "").toLowerCase();
  const pkgUnit = rule.unit.toLowerCase();
  const needUnit = rule.needUnit.toLowerCase();
  // Quantité déjà exprimée dans l'unité du conditionnement → rien à convertir.
  if (unit === pkgUnit || unit.startsWith(pkgUnit)) return null;
  // Unité inconnue : aucune conversion n'est inventée pour autant.
  if (unit !== needUnit) return null;
  const purchasedQty = Math.ceil(need / rule.size);
  const coveredQty = purchasedQty * rule.size;
  const unitPrice = Number(line.catalogUnitPrice) || 0;
  // Sans prix du conditionnement réel, aucun coût n'est calculé.
  if (!(unitPrice > 0)) return null;
  const purchasedCost = purchasedQty * unitPrice;
  return {
    need,
    needUnit: rule.needUnit,
    packageSize: rule.size,
    packageUnit: rule.unit,
    purchasedQty,
    coveredQty,
    surplus: coveredQty - need,
    unitPrice,
    purchasedCost,
    extraCost: purchasedCost - line.total,
  };
}

// ── Sélection finale — états & validation (§16, §17) ───────────────────────
export type MaterialLineState =
  | "a_selectionner"
  | "recommande_ai"
  | "selectionne"
  | "modifie_utilisateur"
  | "confirme"
  | "a_verifier"
  | "obsolete";

export const MATERIAL_LINE_STATE_LABELS: Record<MaterialLineState, string> = {
  a_selectionner: "À sélectionner",
  recommande_ai: "Recommandé par AI",
  selectionne: "Sélectionné",
  modifie_utilisateur: "Modifié par l'utilisateur",
  confirme: "Confirmé",
  a_verifier: "À vérifier",
  obsolete: "Obsolète",
};

/** Sélection enregistrée d'un article (traçabilité §16.3 / §17.26). */
export interface MaterialSelectionEntry {
  projectId?: string;
  articleId: string;
  materialId?: string;
  /** Désignation exacte du Quantitatif détaillé (jamais renommée). */
  designation: string;
  /** Quantité calculée par le Quantitatif détaillé. */
  quantity: number;
  /** Quantité retenue par l'utilisateur (égale par défaut). */
  selectedQuantity?: number;
  unit: string;
  scenario: MaterialScenarioKey;
  quality: MaterialQualityValue;
  unitPrice: number;
  totalPrice: number;
  aiRecommendation?: string;
  userSelected: boolean;
  selectedAt: number;
}

export type SelectionIssueSeverity = "blocking" | "warning";

export interface SelectionIssue {
  code: string;
  severity: SelectionIssueSeverity;
  articleId?: string;
  message: string;
}

export interface SelectionValidationInput {
  lines: MaterialLine[];
  selections: Record<string, MaterialSelectionEntry | undefined>;
  /** Scénario de référence retenu pour la sélection. */
  scenario: MaterialScenarioKey;
  scenarioAvailable: boolean;
  /** Budget matériaux prévu (total matériaux du scénario de référence). */
  budgetMaterials: number;
  /** Scénario recommandé par l'IA (scénario de référence par défaut). */
  recommendedScenario?: MaterialScenarioKey;
}

export interface SelectionValidation {
  blocking: SelectionIssue[];
  warnings: SelectionIssue[];
  canConfirm: boolean;
  selectedCount: number;
  requiredCount: number;
  missingCount: number;
  /** Articles sélectionnés hors recommandation IA. */
  customizedCount: number;
  acceptedRecommendations: number;
}

/** Total matériaux d'une sélection (recalcul complet, jamais un delta seul). */
export function selectionMaterialsTotal(
  lines: MaterialLine[] | null | undefined,
  selections: Record<string, MaterialSelectionEntry | undefined>,
): number {
  return materialsOnly(lines).reduce((sum, line) => {
    const entry = selections[line.articleId];
    if (!entry) return sum;
    const qty = entry.selectedQuantity ?? entry.quantity;
    return sum + qty * entry.unitPrice;
  }, 0);
}

/** Validation complète avant confirmation (§17.20 / §17.21 / §17.22). */
export function validateSelection(input: SelectionValidationInput): SelectionValidation {
  const { lines, selections, scenario } = input;
  const required = materialsOnly(lines);
  const blocking: SelectionIssue[] = [];
  const warnings: SelectionIssue[] = [];

  if (!input.scenarioAvailable) {
    blocking.push({
      code: "scenario_unavailable",
      severity: "blocking",
      message:
        "Le scénario sélectionné n'est plus disponible pour ce projet : relancez le calcul du coût estimatif.",
    });
  }
  if (required.length === 0) {
    blocking.push({
      code: "empty_quantitatif",
      severity: "blocking",
      message: "Aucun matériau exploitable dans le Quantitatif détaillé du projet.",
    });
  }

  let selectedCount = 0;
  let customizedCount = 0;
  let acceptedRecommendations = 0;
  const recommendedScenario = input.recommendedScenario ?? scenario;

  for (const line of required) {
    if (!line.designation || !line.unit) {
      blocking.push({
        code: "corrupted_line",
        severity: "blocking",
        articleId: line.articleId,
        message: `Une ligne du Quantitatif détaillé est incomplète (désignation ou unité manquante) — lot « ${line.lotName} ».`,
      });
    }
    if (!line.priceAvailable) {
      blocking.push({
        code: "missing_price",
        severity: "blocking",
        articleId: line.articleId,
        message: `Aucun prix disponible pour « ${line.designation} » : le prix est indispensable au calcul du coût.`,
      });
    }
    const entry = selections[line.articleId];
    if (!entry) continue;
    selectedCount += 1;
    const qty = entry.selectedQuantity ?? entry.quantity;
    if (!(qty > 0)) {
      blocking.push({
        code: "invalid_quantity",
        severity: "blocking",
        articleId: line.articleId,
        message: `Quantité invalide pour « ${line.designation} » : la quantité doit être supérieure à zéro.`,
      });
    }
    if (entry.scenario !== recommendedScenario) {
      customizedCount += 1;
      warnings.push({
        code: "custom_choice",
        severity: "warning",
        articleId: line.articleId,
        message: `« ${line.designation} » : choix personnalisé (${MATERIAL_SCENARIO_LABELS[entry.scenario]}) différent du scénario de référence ${MATERIAL_SCENARIO_LABELS[scenario]}.`,
      });
    } else {
      acceptedRecommendations += 1;
    }
    if (!line.qualityAvailable) {
      warnings.push({
        code: "quality_unknown",
        severity: "warning",
        articleId: line.articleId,
        message: `« ${line.designation} » : qualité à préciser (aucune référence catalogue).`,
      });
    }
  }

  const missingCount = required.length - selectedCount;
  if (missingCount > 0) {
    blocking.push({
      code: "incomplete_selection",
      severity: "blocking",
      message: `${missingCount} matériau${missingCount > 1 ? "x" : ""} obligatoire${missingCount > 1 ? "s" : ""} non sélectionné${missingCount > 1 ? "s" : ""} — la sélection doit couvrir 100 % du Quantitatif détaillé.`,
    });
    warnings.push({
      code: "progress",
      severity: "warning",
      message: `${selectedCount} / ${required.length} matériaux sélectionnés — ${missingCount} restant${missingCount > 1 ? "s" : ""} à sélectionner.`,
    });
  }

  const total = selectionMaterialsTotal(lines, selections);
  if (input.budgetMaterials > 1e-9 && total > input.budgetMaterials) {
    const delta = total - input.budgetMaterials;
    warnings.push({
      code: "over_budget",
      severity: "warning",
      message: `Budget dépassé : votre sélection dépasse le budget matériaux prévu de ${Math.round(delta)} TND (+${((delta / input.budgetMaterials) * 100).toFixed(2)} %).`,
    });
  }

  return {
    blocking,
    warnings,
    canConfirm: blocking.length === 0,
    selectedCount,
    requiredCount: required.length,
    missingCount: required.length - selectedCount,
    customizedCount,
    acceptedRecommendations,
  };
}

// ── Recalcul officiel d'une sélection (§18.4 → §18.5) ─────────────────────
export interface RecalculatedSelectionLine {
  articleId: string;
  designation: string;
  quantity: number;
  selectedQuantity: number;
  quantityDelta: number;
  unit: string;
  scenario: MaterialScenarioKey;
  quality: MaterialQualityValue;
  unitPrice: number;
  totalPrice: number;
  /** Prix total du scénario de référence (proposition initiale). */
  referenceUnitPrice: number;
  referenceTotalPrice: number;
  impact: number;
  aiRecommendation: boolean;
  userSelected: boolean;
  state: MaterialLineState;
}

export interface RecalculatedSelection {
  lines: RecalculatedSelectionLine[];
  materialsTotal: number;
  referenceTotal: number;
  impact: number;
  impactPct: number;
  selectedCount: number;
  requiredCount: number;
  customizedCount: number;
  acceptedRecommendations: number;
}

/**
 * Recalcul officiel d'une sélection : chaque ligne est recalculée à partir de
 * la quantité et du prix unitaire courants, puis le total est obtenu par somme
 * des lignes — jamais par application d'un delta.
 */
export function recalculateSelection(
  referenceLines: MaterialLine[] | null | undefined,
  selections: Record<string, MaterialSelectionEntry | undefined>,
  scenario: MaterialScenarioKey,
): RecalculatedSelection {
  const required = materialsOnly(referenceLines);
  const referenceByArticle = new Map(required.map((l) => [l.articleId, l]));
  const lines: RecalculatedSelectionLine[] = [];

  for (const entry of Object.values(selections)) {
    if (!entry) continue;
    const reference = referenceByArticle.get(entry.articleId);
    if (!reference) continue; // article disparu du Quantitatif → sélection obsolète
    const selectedQuantity = entry.selectedQuantity ?? entry.quantity;
    const totalPrice = selectedQuantity * entry.unitPrice;
    const referenceTotalPrice = reference.quantity * reference.unitPrice;
    lines.push({
      articleId: entry.articleId,
      designation: reference.designation,
      quantity: reference.quantity,
      selectedQuantity,
      quantityDelta: selectedQuantity - reference.quantity,
      unit: reference.unit,
      scenario: entry.scenario,
      quality: entry.quality,
      unitPrice: entry.unitPrice,
      totalPrice,
      referenceUnitPrice: reference.unitPrice,
      referenceTotalPrice,
      impact: totalPrice - referenceTotalPrice,
      aiRecommendation: entry.scenario === scenario,
      userSelected: entry.userSelected,
      state: selectionLineState(entry, scenario),
    });
  }

  const materialsTotal = lines.reduce((s, l) => s + l.totalPrice, 0);
  const referenceTotal = lines.reduce((s, l) => s + l.referenceTotalPrice, 0);
  const impact = materialsTotal - referenceTotal;
  return {
    lines,
    materialsTotal,
    referenceTotal,
    impact,
    impactPct: referenceTotal > 0 ? (impact / referenceTotal) * 100 : 0,
    selectedCount: lines.length,
    requiredCount: required.length,
    customizedCount: lines.filter((l) => l.scenario !== scenario).length,
    acceptedRecommendations: lines.filter((l) => l.scenario === scenario).length,
  };
}

/** État d'affichage d'une ligne de sélection (§16.11). */
export function selectionLineState(
  entry: MaterialSelectionEntry,
  recommendedScenario: MaterialScenarioKey,
): MaterialLineState {
  if (entry.scenario === recommendedScenario) {
    return entry.userSelected ? "selectionne" : "recommande_ai";
  }
  return entry.userSelected ? "modifie_utilisateur" : "selectionne";
}

// ── Actions groupées (§17.16) ─────────────────────────────────────────────
/** Accepte toutes les recommandations IA : sélection = scénario de référence. */
export function acceptAllRecommendations(
  lines: MaterialLine[] | null | undefined,
  scenario: MaterialScenarioKey,
): Record<string, MaterialSelectionEntry> {
  const out: Record<string, MaterialSelectionEntry> = {};
  const now = Date.now();
  for (const line of materialsOnly(lines)) {
    out[line.articleId] = {
      articleId: line.articleId,
      materialId: line.materialId,
      designation: line.designation,
      quantity: line.quantity,
      selectedQuantity: line.quantity,
      unit: line.unit,
      scenario,
      quality: line.quality,
      unitPrice: line.unitPrice,
      totalPrice: line.quantity * line.unitPrice,
      userSelected: false,
      selectedAt: now,
    };
  }
  return out;
}

/** Sélection d'une variante pour un article, avec recalcul immédiat (§16.4). */
export function selectVariant(
  line: MaterialLine,
  variant: MaterialVariant,
  userSelected: boolean,
): MaterialSelectionEntry {
  return {
    articleId: line.articleId,
    materialId: line.materialId,
    designation: line.designation,
    quantity: line.quantity,
    selectedQuantity: line.quantity,
    unit: line.unit,
    scenario: variant.scenario,
    quality: variant.quality,
    unitPrice: variant.unitPrice,
    totalPrice: line.quantity * variant.unitPrice,
    aiRecommendation: variant.note,
    userSelected,
    selectedAt: Date.now(),
  };
}

// ── Score global de la sélection (§17.18) ─────────────────────────────────
export interface SelectionScore {
  total: number;
  budget: number;
  quality: number;
  coherence: number;
  priceQuality: number;
  label: string;
}

export function selectionScore(input: {
  materialsTotal: number;
  budgetMaterials: number;
  validation: SelectionValidation;
  averagePriceQuality: number;
}): SelectionScore {
  const { materialsTotal, budgetMaterials, validation } = input;
  const budgetScore =
    budgetMaterials > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(100 - ((materialsTotal - budgetMaterials) / budgetMaterials) * 100),
          ),
        )
      : 50;
  const qualityScore = Math.round(
    100 - (validation.customizedCount / Math.max(1, validation.requiredCount)) * 20,
  );
  const coherenceScore = validation.blocking.length === 0 ? 94 : 60;
  const priceQuality = Math.round(Math.max(0, Math.min(100, input.averagePriceQuality)));
  const total = Math.round(
    budgetScore * 0.35 + qualityScore * 0.25 + coherenceScore * 0.2 + priceQuality * 0.2,
  );
  const label =
    total >= 85
      ? "Sélection optimisée"
      : total >= 70
        ? "Sélection équilibrée"
        : total >= 55
          ? "Sélection acceptable"
          : "Sélection à revoir";
  return { total, budget: budgetScore, quality: qualityScore, coherence: coherenceScore, priceQuality, label };
}

// ── Statut global (§17.24) ────────────────────────────────────────────────
export type ProjectMaterialsStatus =
  | "en_cours"
  | "selectionnes"
  | "valides"
  | "a_reviser"
  | "blocage";

export const PROJECT_MATERIALS_STATUS_LABELS: Record<ProjectMaterialsStatus, string> = {
  en_cours: "Sélection en cours",
  selectionnes: "Matériaux sélectionnés",
  valides: "Matériaux validés",
  a_reviser: "À réviser",
  blocage: "Blocage",
};

export const PROJECT_MATERIALS_STATUS_ICONS: Record<ProjectMaterialsStatus, string> = {
  en_cours: "🟡",
  selectionnes: "🟢",
  valides: "🔵",
  a_reviser: "🟠",
  blocage: "🔴",
};

/** Statut déduit des données réellement enregistrées (§17.24). */
export function projectMaterialsStatus(input: {
  requiredCount: number;
  selectedCount: number;
  validated: boolean;
  stale: boolean;
  blocking: number;
}): ProjectMaterialsStatus {
  if (input.blocking > 0) return "blocage";
  if (input.stale) return "a_reviser";
  if (input.validated) return "valides";
  if (input.requiredCount > 0 && input.selectedCount >= input.requiredCount) {
    return "selectionnes";
  }
  return "en_cours";
}

// ── Versions des données (§18.17) ─────────────────────────────────────────
/** Empreinte déterministe courte (FNV-1a) — aucune dépendance externe. */
export function hashString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Version du Quantitatif détaillé : empreinte des articles réellement lus. */
export function quantitativeVersion(lots: any[] | null | undefined): string {
  const parts: string[] = [];
  asArr<any>(lots).forEach((lot) => {
    asArr<any>(lot?.lines).forEach((line: any, index: number) => {
      parts.push(
        `${quantitatifLineKey(String(lot?.id ?? ""), index)}|${String(line?.designation ?? "")}|${Number(line?.quantity) || 0}|${String(line?.unit ?? "")}`,
      );
    });
  });
  return hashString(parts.join(";"));
}

/** Version des prix : empreinte des prix unitaires réellement utilisés. */
export function priceVersion(lots: any[] | null | undefined): string {
  const parts: string[] = [];
  asArr<any>(lots).forEach((lot) => {
    asArr<any>(lot?.lines).forEach((line: any, index: number) => {
      parts.push(
        `${quantitatifLineKey(String(lot?.id ?? ""), index)}|${Number(line?.unitPrice) || 0}`,
      );
    });
  });
  return hashString(parts.join(";"));
}

/** Un résultat enregistré est-il obsolète par rapport aux données actuelles ? */
export function isStale(
  stored: { quantitativeVersion?: string; priceVersion?: string } | null | undefined,
  current: { quantitativeVersion: string; priceVersion: string },
): boolean {
  if (!stored) return false;
  if (stored.quantitativeVersion && stored.quantitativeVersion !== current.quantitativeVersion) {
    return true;
  }
  return !!(stored.priceVersion && stored.priceVersion !== current.priceVersion);
}

/** Articles dont le Quantitatif a changé depuis la sélection enregistrée. */
export function affectedArticles(
  previous: MaterialLine[] | null | undefined,
  current: MaterialLine[] | null | undefined,
): { changed: string[]; removed: string[]; added: string[] } {
  const prevMap = new Map(asArr<MaterialLine>(previous).map((l) => [l.articleId, l]));
  const curMap = new Map(asArr<MaterialLine>(current).map((l) => [l.articleId, l]));
  const changed: string[] = [];
  const removed: string[] = [];
  const added: string[] = [];
  for (const [id, line] of prevMap) {
    const now = curMap.get(id);
    if (!now) {
      removed.push(line.designation);
      continue;
    }
    if (
      now.designation !== line.designation ||
      Math.abs(now.quantity - line.quantity) > 0.0001 ||
      now.unit !== line.unit ||
      Math.abs(now.unitPrice - line.unitPrice) > 0.005
    ) {
      changed.push(now.designation);
    }
  }
  for (const [id, line] of curMap) if (!prevMap.has(id)) added.push(line.designation);
  return { changed, removed, added };
}

// ── Espace de travail complet (payload unique partagé UI ↔ serveur) ───────
export interface MaterialWorkspace {
  hasQuantitatif: boolean;
  scenario: MaterialScenarioKey;
  scenarios: ScenarioContext[];
  /** Scénario de référence du Quantitatif détaillé (Standard). */
  referenceScenario: MaterialScenarioKey;
  /** Toutes les lignes du Quantitatif du scénario actif (matériaux + autres). */
  allLines: MaterialLine[];
  /** Lignes de matériaux du scénario actif (tableau principal). */
  lines: MaterialLine[];
  /** Variantes réelles par article (comparaison des trois scénarios). */
  variants: Record<string, MaterialVariant[]>;
  /** Score prix / qualité par article. */
  scores: Record<string, PriceQualityScore>;
  /** Recommandations de l'IA prédictive. */
  recommendations: MaterialRecommendation[];
  /** Total global des matériaux du scénario actif (Σ quantité × P.U.). */
  materialsTotal: number;
  /** Total global des matériaux du scénario de référence (proposition). */
  referenceTotal: number;
  budget: {
    projectTotal: number;
    costPerM2: number;
    materialsBudget: number;
    materialsSharePct: number;
  };
  /** Versions des données utilisées pour le calcul (§18.17). */
  quantitativeVersion: string;
  priceVersion: string;
  generatedAt: number;
}

/**
 * Espace de travail complet d'un projet : construit une seule fois, utilisé
 * aussi bien pour l'affichage (page) que pour le recalcul serveur (mutations).
 *
 * `realCostFactor` corrige les anciennes marges d'imprévus, exactement comme
 * la page « Coût estimatif » — les deux modules affichent donc la même valeur.
 */
const EMPTY_QUANTITATIF: MaterialLine[] = [];

export function buildMaterialWorkspace(input: {
  rawLots: any[] | null | undefined;
  costEstimate:
    | { budgetScenarios?: any; totalCost?: number; costPerSquareMeter?: number }
    | null
    | undefined;
  scenario: MaterialScenarioKey | string | null | undefined;
  realCostFactor?: number;
}): MaterialWorkspace {
  const realCostFactor = input.realCostFactor ?? 1;
  const scenarios = input.costEstimate?.budgetScenarios;
  const contexts = buildScenarioContexts(input.costEstimate);
  const rawLots = asArr<any>(input.rawLots);
  const hasQuantitatif = rawLots.some((l) => asArr<any>(l?.lines).length > 0);
  const active = resolveActiveScenario(input.scenario as string, contexts);

  const allLines = hasQuantitatif
    ? buildScenarioMaterialLines(rawLots, scenarios, active, realCostFactor)
    : EMPTY_QUANTITATIF;
  const lines = materialsOnly(allLines);
  const standardLines = hasQuantitatif
    ? materialsOnly(buildScenarioMaterialLines(rawLots, scenarios, "standard", realCostFactor))
    : EMPTY_QUANTITATIF;

  // Variantes + scores + recommandations (données réelles uniquement).
  const variants: Record<string, MaterialVariant[]> = {};
  const scores: Record<string, PriceQualityScore> = {};
  const standardByArticle = new Map(standardLines.map((l) => [l.articleId, l]));
  for (const line of lines) {
    // Prix de référence « Standard » de l'article : base commune des variantes.
    const standardUnitPrice =
      standardByArticle.get(line.articleId)?.unitPrice ??
      line.unitPrice / (contexts.find((c) => c.key === line.scenario)?.factor || 1);
    const list = variantsForLine(line, standardUnitPrice, contexts, active);
    variants[line.articleId] = list;
    scores[line.articleId] = scorePriceQuality(line, list, active);
  }

  const total = materialsTotal(lines);
  const referenceTotal = materialsTotal(standardLines);
  const activeCtx = contexts.find((c) => c.key === active);
  const materialsSharePct =
    activeCtx && activeCtx.totalCost > 0 ? (total / activeCtx.totalCost) * 100 : 0;

  return {
    hasQuantitatif,
    scenario: active,
    scenarios: contexts,
    referenceScenario: "standard",
    allLines,
    lines,
    variants,
    scores,
    recommendations: predictiveRecommendations(lines, variants, active),
    materialsTotal: total,
    referenceTotal,
    budget: {
      projectTotal: activeCtx?.totalCost ?? 0,
      costPerM2: activeCtx?.costPerM2 ?? 0,
      materialsBudget: referenceTotal,
      materialsSharePct,
    },
    quantitativeVersion: quantitativeVersion(rawLots),
    priceVersion: priceVersion(rawLots),
    generatedAt: Date.now(),
  };
}
