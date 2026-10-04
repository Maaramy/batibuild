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
 * Invariant : le prix total est repris EXACTEMENT tel que calculé par le
 * Quantitatif détaillé (`line.total`, après mise à l'échelle du scénario) ; à
 * défaut seulement, il est recalculé (`quantité × prix unitaire`). Aucune
 * désignation, unité ou quantité n'est modifiée : le montant affiché ici ne
 * peut donc jamais différer du module « Coût estimatif » pour le même
 * projet / scénario / quantitatif.
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
      // Montant officiel du Quantitatif détaillé (déjà arrondi par le moteur de
      // coût). On ne le recalcule jamais : c'est la garantie d'égalité stricte
      // avec « Coût estimatif ».
      const storedTotal = Number(line?.total);
      const total = Number.isFinite(storedTotal) ? storedTotal : quantity * unitPrice;
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
        total,
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
  /**
   * Scénario ACTIF de la sélection (celui affiché dans « Coût estimatif ») :
   * c'est la base de comparaison des choix personnalisés.
   */
  scenario: MaterialScenarioKey;
  scenarioAvailable: boolean;
  /**
   * Budget matériaux PRÉVU du scénario ACTIF retenu (total matériaux du
   * scénario actif, même calcul que « Coût estimatif »). Le scénario de
   * référence Standard n'est jamais utilisé ici : sinon une sélection
   * correcte en Premium/Économique serait faussement signalée en dépassement.
   */
  budgetMaterials: number;
}

export interface SelectionValidation {
  blocking: SelectionIssue[];
  warnings: SelectionIssue[];
  canConfirm: boolean;
  /** Articles EXPLICITEMENT retenus par l'utilisateur (décision, pas proposition). */
  selectedCount: number;
  requiredCount: number;
  /** Articles obligatoires sans aucune couverture (ni proposition, ni choix). */
  missingCount: number;
  /**
   * Recommandations IA proposées mais NON encore acceptées par l'utilisateur :
   * elles remplissent le Quantitatif (proposition) sans être transférées
   * automatiquement dans « Matériaux sélectionnés » (§16.2).
   */
  proposedCount: number;
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
    // Ligne non modifiée → montant officiel du Quantitatif détaillé (égalité
    // stricte avec « Coût estimatif ») ; sinon recalcul quantité × P.U.
    const unchanged = qty === line.quantity && entry.unitPrice === line.unitPrice;
    return sum + (unchanged ? line.total : qty * entry.unitPrice);
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

  let coveredCount = 0;
  let selectedCount = 0;
  let proposedCount = 0;
  let customizedCount = 0;
  let acceptedRecommendations = 0;
  // Base de comparaison = scénario ACTIF, jamais un « scénario recommandé »
  // distinct : sinon des lignes correctement choisies pour le scénario actif
  // seraient signalées à tort comme personnalisées (et le message afficherait
  // deux fois le même libellé).
  const baselineScenario = scenario;

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
    coveredCount += 1;
    // Proposition IA (userSelected=false) != sélection de l'utilisateur (§16.2).
    if (entry.userSelected) selectedCount += 1;
    else proposedCount += 1;
    const qty = entry.selectedQuantity ?? entry.quantity;
    if (!(qty > 0)) {
      blocking.push({
        code: "invalid_quantity",
        severity: "blocking",
        articleId: line.articleId,
        message: `Quantité invalide pour « ${line.designation} » : la quantité doit être supérieure à zéro.`,
      });
    }
    if (entry.scenario !== baselineScenario) {
      customizedCount += 1;
      warnings.push({
        code: "custom_choice",
        severity: "warning",
        articleId: line.articleId,
        message: `« ${line.designation} » : choix personnalisé (${MATERIAL_SCENARIO_LABELS[entry.scenario]}) différent du scénario retenu (${MATERIAL_SCENARIO_LABELS[baselineScenario]}).`,
      });
    } else {
      acceptedRecommendations += 1;
    }
    // Aucun avertissement « qualité à préciser » par ligne : sans référence
    // catalogue, la gamme est simplement « à préciser » (§12) — c'est un état
    // ATTENDU du Quantitatif réel (les ouvrages composites n'ont pas de
    // référence produit), et non une anomalie de la sélection. Il est déjà
    // affiché sur la ligne (« Qualité à préciser ») et n'est pas modifiable
    // ici : l'alerter par ligne saturerait la liste au détriment des vrais
    // problèmes (budget dépassé, recommandations en attente…).
  }

  const missingCount = required.length - coveredCount;
  if (missingCount > 0) {
    blocking.push({
      code: "incomplete_selection",
      severity: "blocking",
      message: `${missingCount} matériau${missingCount > 1 ? "x" : ""} obligatoire${missingCount > 1 ? "s" : ""} sans couverture — la sélection doit couvrir 100 % du Quantitatif détaillé.`,
    });
    warnings.push({
      code: "progress",
      severity: "warning",
      message: `${coveredCount} / ${required.length} matériaux couverts — ${missingCount} restant${missingCount > 1 ? "s" : ""} à renseigner.`,
    });
  } else if (proposedCount > 0) {
    warnings.push({
      code: "pending_recommendations",
      severity: "warning",
      message: `${proposedCount} matériau${proposedCount > 1 ? "x" : ""} proposé${proposedCount > 1 ? "s" : ""} par l'IA ${proposedCount > 1 ? "sont" : "est"} en attente de votre décision — acceptez les recommandations ou ajustez avant de valider.`,
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
    // La validation exige un CHOIX EXPLICITE : les propositions IA seules ne
    // suffisent pas (aucun transfert automatique vers « Matériaux sélectionnés »).
    canConfirm: blocking.length === 0 && selectedCount >= required.length,
    selectedCount,
    requiredCount: required.length,
    missingCount: required.length - coveredCount,
    proposedCount,
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
    const unchanged =
      selectedQuantity === reference.quantity && entry.unitPrice === reference.unitPrice;
    const totalPrice = unchanged ? reference.total : selectedQuantity * entry.unitPrice;
    const referenceTotalPrice = reference.total;
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
/**
 * PROPOSITION IA : remplit le Quantitatif avec les valeurs recommandées mais
 * SANS les marquer comme sélectionnées (`userSelected: false`). Utilisé par
 * l'auto-lancement et à l'ouverture du module : l'IA propose, l'utilisateur
 * décide — aucun transfert automatique vers « Matériaux sélectionnés » (§16.2).
 */
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

/**
 * ACCEPTATION EXPLICITE des recommandations IA par l'utilisateur : mêmes lignes
 * que `acceptAllRecommendations` mais marquées `userSelected: true`. C'est ce
 * geste qui transfère les propositions dans « Matériaux sélectionnés ».
 */
export function selectAllRecommended(
  lines: MaterialLine[] | null | undefined,
  scenario: MaterialScenarioKey,
): Record<string, MaterialSelectionEntry> {
  const out = acceptAllRecommendations(lines, scenario);
  for (const key of Object.keys(out)) {
    out[key] = { ...out[key], userSelected: true };
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
  | "recommandations"
  | "selectionnes"
  | "valides"
  | "a_reviser"
  | "blocage";

export const PROJECT_MATERIALS_STATUS_LABELS: Record<ProjectMaterialsStatus, string> = {
  en_cours: "Sélection en cours",
  recommandations: "Recommandations IA proposées",
  selectionnes: "Matériaux sélectionnés",
  valides: "Matériaux validés",
  a_reviser: "À réviser",
  blocage: "Blocage",
};

export const PROJECT_MATERIALS_STATUS_ICONS: Record<ProjectMaterialsStatus, string> = {
  en_cours: "🟡",
  recommandations: "🟣",
  selectionnes: "🟢",
  valides: "🔵",
  a_reviser: "🟠",
  blocage: "🔴",
};

/** Statut déduit des données réellement enregistrées (§17.24). */
export function projectMaterialsStatus(input: {
  requiredCount: number;
  selectedCount: number;
  /** Recommandations IA proposées (non encore acceptées). */
  proposedCount?: number;
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
  // Des recommandations IA couvrent le Quantitatif mais n'ont pas encore été
  // acceptées : le module affiche « proposées », jamais « sélectionnées ».
  if ((input.proposedCount ?? 0) > 0) return "recommandations";
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
  /** Total global des matériaux du scénario actif (Σ quantité × P.U.). */
  materialsTotal: number;
  /** Total global des matériaux du scénario de référence (proposition). */
  referenceTotal: number;
  budget: {
    projectTotal: number;
    costPerM2: number;
    /**
     * Budget matériaux PRÉVU du scénario ACTIF retenu (total matériaux du
     * scénario actif). C'est la base de comparaison de la sélection : une
     * sélection conforme au scénario actif ne peut donc jamais être signalée
     * « budget dépassé » (le scénario de référence Standard ne sert qu'à
     * mesurer l'impact prix, jamais de budget).
     */
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
    materialsTotal: total,
    referenceTotal,
    budget: {
      projectTotal: activeCtx?.totalCost ?? 0,
      costPerM2: activeCtx?.costPerM2 ?? 0,
      materialsBudget: total,
      materialsSharePct,
    },
    quantitativeVersion: quantitativeVersion(rawLots),
    priceVersion: priceVersion(rawLots),
    generatedAt: Date.now(),
  };
}

// ============================================================================
// INTELLIGENCE PRÉDICTIVE — module « Choix matériaux »
// ----------------------------------------------------------------------------
// Données 100 % réelles, aucune invention de prix ni de tendance :
//   • Lignes du Quantitatif détaillé au scénario RETENU (prix + quantités).
//   • Variantes de scénarios (Économique / Standard / Premium) = prix réels du
//     même moteur de coût → base des économies potentielles et des alternatives.
//   • Conditionnements réels (`packagingForLine`) → surplus / pertes.
//   • Historique de prix de marché disponible (`getPriceTrends`) → tendance.
//
// Sans historique exploitable, aucune prévision de prix n'est fabriquée : le
// module affiche « Données insuffisantes pour établir une prévision fiable. »
// Il ne modifie JAMAIS les quantités ni les matériaux sélectionnés : il ne
// produit que des analyses et des recommandations (décision finale au client).
// ============================================================================

/** Seuil de variation (en %) au-delà duquel une tendance est qualifiée. */
const TREND_THRESHOLD_PCT = 0.5;

/** Message affiché lorsqu'aucune prévision fiable ne peut être calculée. */
export const INSUFFICIENT_DATA_MESSAGE =
  "Données insuffisantes pour établir une prévision fiable.";

export type PriceTrendDirection = "hausse" | "baisse" | "stable";
export type PredictionConfidence = "faible" | "moyenne" | "elevee";
/**
 * Source réelle d'une prévision :
 *   • `historique` — tendance temporelle issue de l'historique de prix marché.
 *   • `variantes`  — à défaut d'historique, comparaison des prix RÉELS des
 *     scénarios disponibles (Économique / Standard / Premium) pour le même
 *     besoin : elle indique si un coût inférieur est réellement accessible.
 */
export type PriceForecastBasis = "historique" | "variantes";

export const PRICE_FORECAST_BASIS_LABELS: Record<PriceForecastBasis, string> = {
  historique: "Historique marché",
  variantes: "Comparaison scénarios",
};
export type PurchaseTiming =
  | "acheter_maintenant"
  | "acheter_prochainement"
  | "attendre"
  | "surveiller";

export const PRICE_TREND_LABELS: Record<PriceTrendDirection, string> = {
  hausse: "↗ Hausse",
  baisse: "↘ Baisse",
  stable: "→ Stable",
};

export const PRICE_TREND_FULL_LABELS: Record<PriceTrendDirection, string> = {
  hausse: "Hausse probable",
  baisse: "Baisse probable",
  stable: "Stabilité probable",
};

export const PREDICTION_CONFIDENCE_LABELS: Record<PredictionConfidence, string> = {
  faible: "Confiance faible",
  moyenne: "Confiance moyenne",
  elevee: "Confiance élevée",
};

export const PURCHASE_TIMING_LABELS: Record<PurchaseTiming, string> = {
  acheter_maintenant: "Acheter maintenant",
  acheter_prochainement: "Acheter prochainement",
  attendre: "Attendre",
  surveiller: "Surveiller le prix",
};

export const LOSS_RISK_LABELS: Record<LossRiskKind, string> = {
  surplus_conditionnement: "Surplus de conditionnement",
  quantite_excessive: "Quantité excessive",
  planification: "Planification à optimiser",
};

/**
 * Tendance de prix RÉELLE d'une catégorie de marché (source : marché BatiBuild,
 * table `offerPriceHistory` via `getPriceTrends`). `changes` = nombre de
 * variations observées (proxy de la confiance), `netPct` = variation nette
 * moyenne observée (%).
 */
export interface MarketCategoryTrend {
  category: string;
  changes: number;
  netPct: number;
  firstChangedAt?: number;
  lastChangedAt?: number;
}

export interface MaterialPriceForecast {
  articleId: string;
  designation: string;
  category: string;
  unit: string;
  /** Prix unitaire réel du scénario retenu. */
  currentUnitPrice: number;
  /** Montant réel du besoin (quantité × prix unitaire) au scénario retenu. */
  currentTotal: number;
  trend: PriceTrendDirection;
  trendPct: number;
  confidence: PredictionConfidence;
  /** Indice de confiance normalisé (0 → 1), dérivé du nombre d'observations. */
  confidenceScore: number;
  observations: number;
  horizon: string;
  observedWindowDays: number | null;
  /** Origine réelle de la prévision (historique marché ou variantes réelles). */
  basis: PriceForecastBasis;
  recommendation: string;
}

export interface PurchasePeriodAdvice {
  articleId: string;
  designation: string;
  timing: PurchaseTiming;
  trend: PriceTrendDirection;
  trendPct: number;
  confidence: PredictionConfidence;
  basis: PriceForecastBasis;
  reason: string;
}

export interface BudgetOptimizationItem {
  articleId: string;
  designation: string;
  currentScenario: MaterialScenarioKey;
  alternativeScenario: MaterialScenarioKey;
  currentTotal: number;
  alternativeTotal: number;
  saving: number;
  savingPct: number;
  note: string;
}

export interface BudgetRiskItem {
  articleId: string;
  designation: string;
  total: number;
  sharePct: number;
  note: string;
}

export interface BudgetOptimization {
  potentialSaving: number;
  items: BudgetOptimizationItem[];
  riskItems: BudgetRiskItem[];
}

export type LossRiskKind =
  | "surplus_conditionnement"
  | "quantite_excessive"
  | "planification";

export interface LossReductionItem {
  articleId: string;
  designation: string;
  kind: LossRiskKind;
  surplusQty: number;
  surplusUnit: string;
  surplusCost: number;
  recommendation: string;
}

export interface PredictiveIntelligence {
  /** Vrai si AU MOINS une analyse repose sur des données réelles. */
  available: boolean;
  reason: string | null;
  scenario: MaterialScenarioKey;
  analyzedLines: number;
  marketCategoriesUsed: number;
  priceForecasts: MaterialPriceForecast[];
  purchasePlan: PurchasePeriodAdvice[];
  budget: BudgetOptimization;
  lossReduction: LossReductionItem[];
  totals: { potentialSaving: number; lossRisk: number };
  generatedAt: number;
}

/** Horizon temporel dérivé de la fenêtre d'historique réellement observée. */
function forecastHorizon(t: MarketCategoryTrend): {
  horizon: string;
  windowDays: number | null;
} {
  const first = Number(t.firstChangedAt);
  const last = Number(t.lastChangedAt);
  const windowDays =
    Number.isFinite(first) && Number.isFinite(last) && last >= first
      ? Math.round((last - first) / 86_400_000)
      : null;
  const horizon = windowDays === null || windowDays <= 45 ? "prochaines semaines" : "prochains mois";
  return { horizon, windowDays };
}

/**
 * Calcule l'intelligence prédictive à partir des données RÉELLES du projet.
 * Fonction pure : elle n'appelle aucun service et ne modifie aucune donnée.
 *
 * `lines`/`variants` proviennent de `buildMaterialWorkspace` au scénario retenu,
 * `selections` identifie les matériaux réellement présélectionnés, et
 * `marketTrends` provient de l'historique de prix de marché disponible.
 */
export function predictiveIntelligence(input: {
  lines: MaterialLine[] | null | undefined;
  selections?: Record<string, MaterialSelectionEntry | undefined> | null;
  variants?: Record<string, MaterialVariant[]> | null;
  scenario: MaterialScenarioKey;
  materialsBudget?: number;
  marketTrends?: MarketCategoryTrend[] | null;
}): PredictiveIntelligence {
  const scenario = input.scenario;
  const selections = input.selections ?? null;
  const variantsMap = input.variants ?? {};
  const lines = asArr<MaterialLine>(input.lines).filter(
    (l) => l.priceAvailable && Number(l.quantity) > 0,
  );
  // Périmètre = matériaux réellement présélectionnés ; à défaut, tous les
  // matériaux du Quantitatif du scénario retenu (données réelles uniquement).
  const selected = selections ? lines.filter((l) => selections[l.articleId]) : lines;
  const scope = selected.length > 0 ? selected : lines;

  const trendByCat = new Map<string, MarketCategoryTrend>();
  for (const t of asArr<MarketCategoryTrend>(input.marketTrends)) {
    const key = String(t.category ?? "").trim().toLowerCase();
    if (!key || trendByCat.has(key)) continue;
    trendByCat.set(key, t);
  }

  // ── Évolution prévisionnelle des prix ─────────────────────────────────────
  // 1) Tendance temporelle dès qu'un historique marché existe pour la
  //    catégorie.  2) Sinon, comparaison des prix RÉELS des scénarios
  //    disponibles pour le même besoin (aucune valeur inventée) : elle révèle
  //    si un coût unitaire inférieur est réellement accessible. Ce repli garantit
  //    un résultat exploitable même sans historique marché enregistré.
  const priceForecasts: MaterialPriceForecast[] = [];
  for (const line of scope) {
    const trend = trendByCat.get(String(line.category ?? "").trim().toLowerCase());
    if (trend && Number.isFinite(trend.netPct) && Math.round(Number(trend.changes) || 0) > 0) {
      const trendPct = round2(trend.netPct);
      const direction: PriceTrendDirection =
        trendPct >= TREND_THRESHOLD_PCT
          ? "hausse"
          : trendPct <= -TREND_THRESHOLD_PCT
            ? "baisse"
            : "stable";
      const observations = Math.max(0, Math.round(Number(trend.changes) || 0));
      const confidence: PredictionConfidence =
        observations >= 8 ? "elevee" : observations >= 3 ? "moyenne" : "faible";
      const confidenceScore = Math.max(0, Math.min(1, observations / 10));
      const { horizon, windowDays } = forecastHorizon(trend);
      const recommendation =
        direction === "hausse"
          ? trendPct >= 2
            ? "Acheter maintenant : hausse probable, anticipez l'achat."
            : "Acheter prochainement : hausse probable."
          : direction === "baisse"
            ? "Attendre : baisse probable, surveillez le prix."
            : "Surveiller le prix : stabilité probable.";
      priceForecasts.push({
        articleId: line.articleId,
        designation: line.designation,
        category: line.category,
        unit: line.unit,
        currentUnitPrice: round2(line.unitPrice),
        currentTotal: round2(line.quantity * line.unitPrice),
        trend: direction,
        trendPct,
        confidence,
        confidenceScore,
        observations,
        horizon,
        observedWindowDays: windowDays,
        basis: "historique",
        recommendation,
      });
      continue;
    }

    // Repli : comparaison des prix réels des variantes de scénario.
    const vs = asArr<MaterialVariant>(variantsMap[line.articleId]).filter(
      (v) => v.available && Number(v.unitPrice) > 0,
    );
    if (vs.length === 0) continue;
    const active = vs.find((v) => v.scenario === scenario);
    const currentUnitPrice = active ? active.unitPrice : line.unitPrice;
    if (!(currentUnitPrice > 0)) continue;
    const cheapest = vs.reduce((m, v) => (v.unitPrice < m.unitPrice ? v : m));
    const deltaPct = round2(((cheapest.unitPrice - currentUnitPrice) / currentUnitPrice) * 100);
    const direction: PriceTrendDirection =
      cheapest.scenario !== scenario && deltaPct <= -TREND_THRESHOLD_PCT ? "baisse" : "stable";
    const observations = vs.length;
    const confidence: PredictionConfidence = vs.length >= 3 ? "moyenne" : "faible";
    const confidenceScore = Math.max(0, Math.min(1, vs.length / 3));
    priceForecasts.push({
      articleId: line.articleId,
      designation: line.designation,
      category: line.category,
      unit: line.unit,
      currentUnitPrice: round2(currentUnitPrice),
      currentTotal: round2(line.quantity * currentUnitPrice),
      trend: direction,
      trendPct: direction === "baisse" ? deltaPct : 0,
      confidence,
      confidenceScore,
      observations,
      horizon: "prochaines semaines",
      observedWindowDays: null,
      basis: "variantes",
      recommendation:
        direction === "baisse"
          ? `Baisse possible : le scénario ${MATERIAL_SCENARIO_LABELS[cheapest.scenario]} propose le même besoin à un coût unitaire inférieur.`
          : "Stable : vous êtes déjà au meilleur coût disponible parmi les scénarios pour ce poste.",
    });
  }
  priceForecasts.sort((a, b) => b.currentTotal - a.currentTotal);

  // ── Meilleure période d'achat (déduite de la tendance réelle) ────────────
  const purchasePlan: PurchasePeriodAdvice[] = priceForecasts.map((f) => {
    // Une baisse issue de l'historique invite à attendre ; une baisse issue des
    // variantes est une opportunité déjà accessible (on optimise maintenant).
    const timing: PurchaseTiming =
      f.trend === "hausse"
        ? f.trendPct >= 2
          ? "acheter_maintenant"
          : "acheter_prochainement"
        : f.trend === "baisse"
          ? f.basis === "historique"
            ? "attendre"
            : "acheter_prochainement"
          : "surveiller";
    return {
      articleId: f.articleId,
      designation: f.designation,
      timing,
      trend: f.trend,
      trendPct: f.trendPct,
      confidence: f.confidence,
      basis: f.basis,
      reason: f.recommendation,
    };
  });

  // ── Optimisation du budget (écarts réels entre scénarios) ────────────────
  const budgetItems: BudgetOptimizationItem[] = [];
  for (const line of scope) {
    const vs = asArr<MaterialVariant>(variantsMap[line.articleId]).filter(
      (v) => v.available && Number(v.unitPrice) > 0,
    );
    if (vs.length < 2) continue;
    const active = vs.find((v) => v.scenario === scenario);
    const cheapest = vs.reduce((m, v) => (v.unitPrice < m.unitPrice ? v : m));
    const currentUnit = active ? active.unitPrice : line.unitPrice;
    const currentTotal = round2(line.quantity * currentUnit);
    const alternativeTotal = round2(line.quantity * cheapest.unitPrice);
    const saving = round2(currentTotal - alternativeTotal);
    if (cheapest.scenario === scenario || saving <= 1e-6) continue;
    budgetItems.push({
      articleId: line.articleId,
      designation: line.designation,
      currentScenario: scenario,
      alternativeScenario: cheapest.scenario,
      currentTotal,
      alternativeTotal,
      saving,
      savingPct: currentTotal > 0 ? round2((saving / currentTotal) * 100) : 0,
      note: `Passer au scénario ${MATERIAL_SCENARIO_LABELS[cheapest.scenario]} : même besoin, qualité ${cheapest.qualityLabel}. Est-ce compatible avec vos exigences ?`,
    });
  }
  budgetItems.sort((a, b) => b.saving - a.saving);
  const potentialSaving = round2(budgetItems.reduce((s, i) => s + i.saving, 0));

  // Matériaux dont le prix représente un risque pour le budget.
  const budgetBase =
    Number(input.materialsBudget) > 0 ? Number(input.materialsBudget) : materialsTotal(scope);
  const riskItems: BudgetRiskItem[] = scope
    .map((line) => ({ line, total: round2(line.quantity * line.unitPrice) }))
    .filter((x) => budgetBase > 0 && x.total / budgetBase >= 0.1)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((x) => ({
      articleId: x.line.articleId,
      designation: x.line.designation,
      total: x.total,
      sharePct: round2((x.total / budgetBase) * 100),
      note: "Poste majeur du budget matériaux : surveillez l'évolution de son prix et comparez les fournisseurs.",
    }));

  // ── Réduction des pertes (conditionnements réels + planification) ────────
  const lossReduction: LossReductionItem[] = [];
  const flagged = new Set<string>();
  for (const line of scope) {
    const pkg = packagingForLine(line);
    if (!pkg || pkg.surplus <= 1e-6 || pkg.extraCost <= 1e-6) continue;
    const ratio = pkg.need > 0 ? pkg.surplus / pkg.need : 0;
    flagged.add(line.articleId);
    lossReduction.push({
      articleId: line.articleId,
      designation: line.designation,
      kind: ratio >= 0.2 ? "quantite_excessive" : "surplus_conditionnement",
      surplusQty: round2(pkg.surplus),
      surplusUnit: pkg.needUnit,
      surplusCost: round2(pkg.extraCost),
      recommendation:
        `Le conditionnement (${pkg.packageUnit} de ${pkg.packageSize} ${pkg.needUnit}) impose ` +
        `${pkg.purchasedQty} ${pkg.packageUnit} pour un besoin de ${round2(pkg.need)} ${pkg.needUnit}. ` +
        `Ajustez la commande ou prévoyez l'usage du surplus pour éviter la perte.`,
    });
  }
  lossReduction.sort((a, b) => b.surplusCost - a.surplusCost);

  // Planification : postes à fort montant, sans donnée chiffrée inventée.
  const planningCandidates = scope
    .filter((l) => !flagged.has(l.articleId))
    .sort((a, b) => b.quantity * b.unitPrice - a.quantity * a.unitPrice)
    .slice(0, 3);
  for (const line of planningCandidates) {
    lossReduction.push({
      articleId: line.articleId,
      designation: line.designation,
      kind: "planification",
      surplusQty: 0,
      surplusUnit: line.unit || "",
      surplusCost: 0,
      recommendation:
        "Poste à fort montant : planifiez les achats par phases et vérifiez les quantités avant commande pour limiter le stockage et les pertes.",
    });
  }
  const lossRisk = round2(lossReduction.reduce((s, i) => s + i.surplusCost, 0));

  const available = priceForecasts.length > 0 || budgetItems.length > 0 || lossReduction.length > 0;
  const marketCategoriesUsed = new Set(priceForecasts.map((f) => f.category)).size;

  return {
    available,
    reason: available ? null : INSUFFICIENT_DATA_MESSAGE,
    scenario,
    analyzedLines: scope.length,
    marketCategoriesUsed,
    priceForecasts,
    purchasePlan,
    budget: { potentialSaving, items: budgetItems, riskItems },
    lossReduction,
    totals: { potentialSaving, lossRisk },
    generatedAt: Date.now(),
  };
}
