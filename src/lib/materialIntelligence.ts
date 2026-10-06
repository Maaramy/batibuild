/**
 * INTELLIGENCE PRÉDICTIVE — ANALYSE MATÉRIAU PAR MATÉRIAU
 *
 * Moteur PUR (sans Convex / React) qui remplace l'analyse « par catégorie » par
 * une analyse INDIVIDUELLE de chaque matériau/article du projet.
 *
 *   Quantitatif détaillé  → besoins + quantités (données du PROJET)
 *   Liste des prix         → prix, référence, unité, dispo, historique (données
 *                            commerciales RÉELLES)
 *   Intelligence prédictive→ analyse matériau par matériau (fiches + scores)
 *   Agrégation             → indicateurs globaux du projet
 *   Aide à la décision     → décisions prioritaires présentées à l'utilisateur
 *
 * Distinction stricte des 4 niveaux de données (§18) :
 *   • `projectTotal` / `quantity`  → Données du projet ;
 *   • `priceList*`                 → Données de la Liste des prix ;
 *   • `currentTotal` / `impact*`   → Calculs ;
 *   • `trend` / `forecast*`        → Prévisions IA.
 *
 * Aucune donnée n'est inventée : un matériau absent de la Liste des prix affiche
 * « Matériau non trouvé dans la Liste des prix. » et, sans historique exploitable,
 * « Données insuffisantes pour établir une prévision fiable pour ce matériau. ».
 */

import {
  MATERIAL_SCENARIO_LABELS,
  PREDICTION_CONFIDENCE_LABELS,
  PRICE_TREND_FULL_LABELS,
  PURCHASE_TIMING_LABELS,
  type MaterialLine,
  type MaterialVariant,
  type PredictionConfidence,
  type PriceForecastBasis,
  type PriceTrendDirection,
  type PurchaseTiming,
  type BudgetOptimizationItem,
  type BudgetRiskItem,
  type LossReductionItem,
} from "@/convex/materialSelectionEngine";
import { materialGroup, type MaterialGroup } from "@/lib/decisionAnalysis";

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const pct2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const round3 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 1000) / 1000;

// ── Messages de qualité des données (§18) ───────────────────────────────────
export const MATERIAL_NOT_FOUND_MESSAGE = "Matériau non trouvé dans la Liste des prix.";
export const MATERIAL_INSUFFICIENT_DATA_MESSAGE =
  "Données insuffisantes pour établir une prévision fiable pour ce matériau.";

/** Seuil de variation (%) au-delà duquel une tendance est qualifiée. */
const TREND_THRESHOLD_PCT = 0.5;

// ── Entrées ─────────────────────────────────────────────────────────────────
/** Ligne de la « Liste des prix » (`materialPrices`) réellement disponible. */
export interface PriceListRow {
  _id: string;
  name: string;
  category?: string;
  subcategory?: string;
  unit?: string;
  unitPrice: number;
  currency?: string;
  sku?: string;
  brand?: string;
  manufacturer?: string;
  region?: string;
  availability?: string;
  priceQuality?: string;
  confidenceIndex?: number;
  reliabilityIndex?: number;
  minPrice?: number;
  avgPrice?: number;
  maxPrice?: number;
  lastUpdated?: number;
}

/** Tendance RÉELLE d'un matériau (source `getMaterialPriceTrends`, par article). */
export interface MaterialTrendRow {
  materialPriceId: string;
  changes: number;
  netPct: number;
  lastPct?: number;
  firstChangedAt?: number;
  lastChangedAt?: number;
  source?: "marche" | "publication";
}

/** Tendance de marché d'une catégorie (contexte, source `getPriceTrends`). */
export interface CategoryTrendRow {
  category: string;
  changes: number;
  netPct: number;
  firstChangedAt?: number;
  lastChangedAt?: number;
}

/** Meilleur fournisseur réel pour une désignation (source `getCheapestSuppliers`). */
export interface SupplierMatch {
  name: string;
  supplier?: string;
  sourceType?: string;
  minPrice?: number;
  avgPrice?: number;
  unit?: string;
  governorate?: string;
  reliabilityIndex?: number;
  availability?: string;
}

export interface MaterialIntelligenceInput {
  /** Lignes de matériaux du scénario retenu (besoins du projet). */
  lines: MaterialLine[] | null | undefined;
  /** Liste des prix complète de BatiBuild (`materialPrices`). */
  priceList?: PriceListRow[] | null;
  /** Tendances par matériau (`getMaterialPriceTrends`). */
  materialTrends?: MaterialTrendRow[] | null;
  /** Contexte de marché par catégorie (`getPriceTrends`) — repli explicite. */
  categoryTrends?: CategoryTrendRow[] | null;
  /** Variantes de scénarios réelles (comparaison Économique/Standard/Premium). */
  variants?: Record<string, MaterialVariant[]> | null;
  /** Fournisseurs réels par désignation (`getCheapestSuppliers`). */
  suppliers?: SupplierMatch[] | null;
  /** Scénario retenu. */
  scenario: string;
  /** Budget matériaux du scénario retenu (TND). */
  materialsBudget: number;
  /** Coût total du scénario retenu (TND). */
  projectTotal: number;
  /** Sorties déjà calculées par `predictiveIntelligence` (pertes / optimisations). */
  lossReduction?: LossReductionItem[] | null;
  budgetItems?: BudgetOptimizationItem[] | null;
  riskItems?: BudgetRiskItem[] | null;
}

// ── Sorties ─────────────────────────────────────────────────────────────────
export interface MaterialIntelRow {
  articleId: string;
  designation: string;
  catalogName: string | null;
  reference: string | null;
  category: string;
  group: MaterialGroup;
  unit: string;

  // ── Données du projet ──────────────────────────────────────────────────
  quantity: number;
  projectUnitPrice: number;
  projectTotal: number;

  // ── Données de la Liste des prix ───────────────────────────────────────
  found: boolean;
  priceListId: string | null;
  priceListName: string | null;
  priceListUnitPrice: number | null;
  priceListMin: number | null;
  priceListMax: number | null;
  priceListCategory: string | null;
  priceListSubcategory: string | null;
  sku: string | null;
  availability: string | null;
  region: string | null;
  supplier: string | null;
  sourceType: string | null;
  priceUpdatedAt: number | null;
  priceQuality: string | null;

  // ── Calculs ────────────────────────────────────────────────────────────
  currentUnitPrice: number;
  currentTotal: number;

  // ── Prévisions IA ──────────────────────────────────────────────────────
  trend: PriceTrendDirection;
  trendPct: number;
  forecastLow: number | null;
  forecastHigh: number | null;
  horizon: string | null;
  confidence: PredictionConfidence;
  confidencePct: number;
  observations: number;
  basis: PriceForecastBasis | null;
  basisLabel: string | null;
  /** Vrai si la prévision provient des données PROPRES au matériau. */
  materialSpecific: boolean;
  forecastMessage: string | null;

  // ── Scores ─────────────────────────────────────────────────────────────
  riskScore: number;
  impactScore: number;
  priorityScore: number;
  impactAmount: number;
  /**
   * Score de surveillance /100 (§11) — agrégation pondérée des six critères de
   * classement demandés, dans leur ordre de priorité :
   *   1. risque de hausse (riskScore) · 2. impact financier (impactScore) ·
   *   3. quantité nécessaire · 4. priorité d'achat (priorityScore) ·
   *   5. risque de perte (valeur de perte) · 6. niveau de confiance.
   */
  watchScore: number;

  // ── Décision ───────────────────────────────────────────────────────────
  timing: PurchaseTiming;
  timingLabel: string;
  timingReason: string;
  budgetCurrent: number;
  budgetProjected: number;
  budgetGap: number;
  potentialSaving: number;
  lossQty: number;
  lossUnit: string;
  lossValue: number;
  lossReason: string | null;
  recommendation: string;

  /** Traçabilité des 4 niveaux de données (§18). */
  dataQuality: {
    project: boolean;
    priceList: boolean;
    computed: boolean;
    forecast: boolean;
  };
}

export interface MaterialIntelAggregate {
  analyzed: number;
  watched: number;
  priorityPurchases: number;
  opportunities: number;
  notFound: number;
  rising: number;
  falling: number;
  globalScore: number;
  priceRiskScore: number;
  budgetOptimizationScore: number;
  purchasePriorityScore: number;
  antiWasteScore: number;
  totalPotentialSaving: number;
  totalExposure: number;
  totalCurrent: number;
  totalProjected: number;
  totalLoss: number;
  confidencePct: number;
}

export interface MaterialIntelligence {
  rows: MaterialIntelRow[];
  aggregate: MaterialIntelAggregate;
  analyzedCount: number;
  priceListMatched: number;
  materialsBudget: number;
  generatedAt: number;
}

// ── Normalisation & correspondance avec la Liste des prix ────────────────────
export function normalizeMaterialName(s: string | null | undefined): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const tokensOf = (s: string) => normalizeMaterialName(s).split(" ").filter((t) => t.length >= 3);

export interface PriceListIndex {
  byKey: Map<string, PriceListRow>;
  bySku: Map<string, PriceListRow>;
}

export function buildPriceListIndex(priceList: PriceListRow[]): PriceListIndex {
  const byKey = new Map<string, PriceListRow>();
  const bySku = new Map<string, PriceListRow>();
  for (const row of priceList) {
    const key = normalizeMaterialName(row.name);
    if (key && !byKey.has(key)) byKey.set(key, row);
    if (row.sku) bySku.set(String(row.sku), row);
  }
  return { byKey, bySku };
}

/**
 * Retrouve la ligne de la Liste des prix correspondant à un matériau du projet.
 * Correspondance stricte : SKU officiel, nom exact, inclusion, puis recouvrement
 * de jetons (≥ 2). Aucune correspondance approximative hasardeuse : au-delà,
 * `null` (le matériau est alors « non trouvé dans la Liste des prix »).
 */
export function matchPriceListRow(
  line: Pick<MaterialLine, "designation" | "catalogName" | "materialId">,
  index: PriceListIndex,
): PriceListRow | null {
  const sku =
    line.materialId && !String(line.materialId).startsWith("cat:")
      ? String(line.materialId)
      : null;
  if (sku && index.bySku.has(sku)) return index.bySku.get(sku) ?? null;

  const key = normalizeMaterialName(line.catalogName || line.designation);
  if (!key) return null;
  const exact = index.byKey.get(key);
  if (exact) return exact;

  if (key.length >= 10) {
    for (const [pk, row] of index.byKey) {
      if (pk.length >= 8 && (key.includes(pk) || pk.includes(key))) return row;
    }
  }

  const itemTokens = tokensOf(line.catalogName || line.designation);
  if (itemTokens.length >= 2) {
    let best: PriceListRow | null = null;
    let bestScore = 1;
    for (const [pk, row] of index.byKey) {
      const score = itemTokens.filter((t) => pk.includes(t)).length;
      if (score >= 2 && score > bestScore) {
        bestScore = score;
        best = row;
      }
    }
    if (best) return best;
  }
  return null;
}

// ── Horizon dérivé d'une fenêtre réelle ────────────────────────────────────
function horizonFor(first?: number, last?: number): string {
  const f = Number(first);
  const l = Number(last);
  const windowDays =
    Number.isFinite(f) && Number.isFinite(l) && l >= f ? Math.round((l - f) / 86_400_000) : null;
  return windowDays === null || windowDays <= 45 ? "prochaines semaines" : "prochains mois";
}

function confidenceFor(observations: number): { label: PredictionConfidence; pct: number } {
  const pct = clamp(Math.round((Math.min(observations, 10) / 10) * 100), 0, 100);
  const label: PredictionConfidence =
    observations >= 8 ? "elevee" : observations >= 3 ? "moyenne" : "faible";
  return { label, pct };
}

/** Confiance issue de la qualité de la donnée lorsqu'aucune observation n'existe. */
function dataQualityConfidence(row: PriceListRow | null): { label: PredictionConfidence; pct: number } {
  const raw =
    typeof row?.confidenceIndex === "number"
      ? row.confidenceIndex
      : typeof row?.reliabilityIndex === "number"
        ? row.reliabilityIndex
        : null;
  if (raw === null) return { label: "faible", pct: 30 };
  const pct = clamp(Math.round(raw * 100), 0, 95);
  const label: PredictionConfidence = pct >= 70 ? "elevee" : pct >= 40 ? "moyenne" : "faible";
  return { label, pct };
}

// ── Moteur principal ────────────────────────────────────────────────────────
export function buildMaterialIntelligence(
  input: MaterialIntelligenceInput,
): MaterialIntelligence {
  const materialsBudget = input.materialsBudget > 0 ? input.materialsBudget : 0;
  const priceList = (input.priceList ?? []).filter((r) => r && r.unitPrice >= 0);
  const index = buildPriceListIndex(priceList);

  const trendById = new Map<string, MaterialTrendRow>();
  for (const t of input.materialTrends ?? []) trendById.set(String(t.materialPriceId), t);
  const trendByCat = new Map<string, CategoryTrendRow>();
  for (const t of input.categoryTrends ?? []) {
    const k = normalizeMaterialName(t.category);
    if (k && !trendByCat.has(k)) trendByCat.set(k, t);
  }
  const supplierByName = new Map<string, SupplierMatch>();
  for (const s of input.suppliers ?? []) supplierByName.set(normalizeMaterialName(s.name), s);

  const lossByArticle = new Map<string, LossReductionItem>();
  for (const l of input.lossReduction ?? [])
    if (!lossByArticle.has(l.articleId)) lossByArticle.set(l.articleId, l);
  const savingByArticle = new Map<string, BudgetOptimizationItem>();
  for (const b of input.budgetItems ?? [])
    if (!savingByArticle.has(b.articleId)) savingByArticle.set(b.articleId, b);

  const lines = (input.lines ?? []).filter(
    (l) => l && Number(l.quantity) > 0 && l.priceAvailable,
  );

  const draft: MaterialIntelRow[] = lines.map((line) => {
    const match = matchPriceListRow(line, index);
    const supplier = supplierByName.get(normalizeMaterialName(line.catalogName || line.designation));
    const found = !!match;

    // Prix courant : priorité à la Liste des prix (référence commerciale réelle) ;
    // à défaut, le prix du Quantitatif du projet (jamais inventé).
    const priceListUnitPrice = found && match && match.unitPrice > 0 ? match.unitPrice : null;
    const currentUnitPrice = priceListUnitPrice ?? line.unitPrice;
    const currentTotal = round3(line.quantity * currentUnitPrice);

    // ── Prévision matériau par matériau ──────────────────────────────────
    let trend: PriceTrendDirection = "stable";
    let trendPct = 0;
    let basis: PriceForecastBasis | null = null;
    let basisLabel: string | null = null;
    let materialSpecific = false;
    let observations = 0;
    let horizon: string | null = null;
    let confidence: PredictionConfidence = "faible";
    let confidencePct = 0;
    let forecastMessage: string | null = null;

    const ownTrend = found && match ? trendById.get(String(match._id)) : undefined;
    const catTrend = trendByCat.get(normalizeMaterialName(line.category));

    if (ownTrend && Number(ownTrend.changes) > 0 && Number.isFinite(ownTrend.netPct)) {
      // 1) Historique PROPRE au matériau — source première.
      trendPct = pct2(ownTrend.netPct);
      trend =
        trendPct >= TREND_THRESHOLD_PCT
          ? "hausse"
          : trendPct <= -TREND_THRESHOLD_PCT
            ? "baisse"
            : "stable";
      observations = Math.max(0, Math.round(ownTrend.changes));
      const c = confidenceFor(observations);
      confidence = c.label;
      confidencePct = c.pct;
      basis = "historique";
      basisLabel = `Historique matériau${match?.sku ? ` · ${match.sku}` : ""}`;
      materialSpecific = true;
      horizon = horizonFor(ownTrend.firstChangedAt, ownTrend.lastChangedAt);
    } else {
      // 2) Comparaison RÉELLE des prix de scénarios pour CE matériau.
      const vs = (input.variants?.[line.articleId] ?? []).filter((v) => v.available && v.unitPrice > 0);
      const active = vs.find((v) => v.scenario === input.scenario);
      const cheapest = vs.length > 0 ? vs.reduce((m, v) => (v.unitPrice < m.unitPrice ? v : m)) : null;
      const refUnit = active ? active.unitPrice : currentUnitPrice;
      const deltaPct =
        cheapest && refUnit > 0 ? pct2(((cheapest.unitPrice - refUnit) / refUnit) * 100) : 0;

      if (
        vs.length >= 2 &&
        cheapest &&
        cheapest.scenario !== input.scenario &&
        deltaPct <= -TREND_THRESHOLD_PCT
      ) {
        trend = "baisse";
        trendPct = deltaPct;
        observations = vs.length;
        const c = confidenceFor(vs.length);
        confidence = c.label;
        confidencePct = c.pct;
        basis = "variantes";
        basisLabel = "Comparaison scénarios (matériau)";
        materialSpecific = true;
        horizon = "prochaines semaines";
      } else if (vs.length >= 2) {
        observations = vs.length;
        const c = confidenceFor(vs.length);
        confidence = c.label;
        confidencePct = c.pct;
        basis = "variantes";
        basisLabel = "Comparaison scénarios (matériau)";
        materialSpecific = true;
        horizon = "prochaines semaines";
      } else if (catTrend && Number(catTrend.changes) > 0 && Number.isFinite(catTrend.netPct)) {
        // 3) Contexte de marché de la catégorie — EXPLICITEMENT non spécifique
        //    au matériau (jamais présenté comme SA tendance propre).
        trendPct = pct2(catTrend.netPct);
        trend =
          trendPct >= TREND_THRESHOLD_PCT
            ? "hausse"
            : trendPct <= -TREND_THRESHOLD_PCT
              ? "baisse"
              : "stable";
        observations = Math.max(0, Math.round(catTrend.changes));
        const c = confidenceFor(observations);
        confidence = c.label === "elevee" ? "moyenne" : "faible";
        confidencePct = Math.max(0, c.pct - 20);
        basis = "historique";
        basisLabel = `Contexte marché — ${line.category || "catégorie"}`;
        materialSpecific = false;
        horizon = horizonFor(catTrend.firstChangedAt, catTrend.lastChangedAt);
      } else {
        // 4) Aucune donnée exploitable : on ne fabrique AUCUNE prévision.
        const c = dataQualityConfidence(match);
        confidence = c.label;
        confidencePct = c.pct;
        forecastMessage = found ? MATERIAL_INSUFFICIENT_DATA_MESSAGE : MATERIAL_NOT_FOUND_MESSAGE;
      }
    }

    // Intervalle de prévision : centré sur le prix attendu, largeur issue de la
    // fourchette réelle mini/maxi de la Liste des prix, sinon 3 %.
    let forecastLow: number | null = null;
    let forecastHigh: number | null = null;
    if (basis) {
      const expected = currentUnitPrice * (1 + trendPct / 100);
      const min = match?.minPrice ?? null;
      const max = match?.maxPrice ?? null;
      const avg = match?.avgPrice ?? null;
      const halfSpread =
        min !== null && max !== null && avg && avg > 0 ? Math.max(0.01, (max - min) / 2 / avg) : 0.03;
      forecastLow = round3(Math.max(0, expected * (1 - halfSpread)));
      forecastHigh = round3(expected * (1 + halfSpread));
    }

    // ── Impact financier = quantité × prix actuel × variation ─────────────
    const impactAmount = round3((currentTotal * trendPct) / 100);

    // ── Risque prix /100 ─────────────────────────────────────────────────
    const absPct = Math.abs(trendPct);
    let riskScore = 10;
    if (trend === "hausse") riskScore += Math.min(58, absPct * 10);
    else if (trend === "baisse") riskScore += Math.min(8, absPct * 2);
    riskScore += confidencePct * 0.15;
    const availability = (match?.availability ?? supplier?.availability ?? null) || null;
    if (availability === "rupture") riskScore += 12;
    else if (availability === "sur_commande") riskScore += 6;
    if (!found) riskScore = clamp(riskScore, 5, 45); // absence de donnée ≠ risque de prix
    riskScore = clamp(Math.round(riskScore));

    // ── Pertes / optimisation (déjà calculés, par article) ───────────────
    const loss = lossByArticle.get(line.articleId);
    const lossValue = loss ? round3(loss.surplusCost) : 0;
    const budgetItem = savingByArticle.get(line.articleId);
    const potentialSaving = budgetItem ? round3(budgetItem.saving) : 0;

    const expectedUnit = basis ? currentUnitPrice * (1 + trendPct / 100) : currentUnitPrice;
    const budgetProjected = round3(line.quantity * expectedUnit);

    // ── Recommandation matériau (texte spécifique, jamais générique) ─────
    const recommendation = !found
      ? MATERIAL_NOT_FOUND_MESSAGE
      : !basis
        ? MATERIAL_INSUFFICIENT_DATA_MESSAGE
        : trend === "hausse"
          ? absPct >= 4
            ? "Matériau fortement exposé à la variation des prix. Surveiller l'évolution et envisager un achat anticipé lorsque les conditions sont favorables."
            : "Achat à surveiller — une hausse du prix est potentiellement probable."
          : trend === "baisse"
            ? "Baisse probable du prix : envisagez d'attendre ou de comparer les fournisseurs avant de commander."
            : "Prix globalement stables : achetez selon le planning du chantier.";

    return {
      articleId: line.articleId,
      designation: line.designation,
      catalogName: line.catalogName ?? null,
      reference:
        match?.sku ??
        (line.materialId && !String(line.materialId).startsWith("cat:")
          ? String(line.materialId)
          : null),
      category: line.category,
      group: materialGroup(line.category),
      unit: line.unit || match?.unit || "",
      quantity: line.quantity,
      projectUnitPrice: round3(line.unitPrice),
      projectTotal: round3(line.quantity * line.unitPrice),
      found,
      priceListId: match?._id ?? null,
      priceListName: match?.name ?? null,
      priceListUnitPrice,
      priceListMin: match?.minPrice ?? null,
      priceListMax: match?.maxPrice ?? null,
      priceListCategory: match?.category ?? null,
      priceListSubcategory: match?.subcategory ?? null,
      sku: match?.sku ?? null,
      availability,
      region: match?.region ?? supplier?.governorate ?? null,
      supplier: supplier?.supplier ?? match?.brand ?? match?.manufacturer ?? null,
      sourceType: supplier?.sourceType ?? null,
      priceUpdatedAt: match?.lastUpdated ?? null,
      priceQuality: match?.priceQuality ?? null,
      currentUnitPrice: round3(currentUnitPrice),
      currentTotal,
      trend,
      trendPct,
      forecastLow,
      forecastHigh,
      horizon,
      confidence,
      confidencePct,
      observations,
      basis,
      basisLabel,
      materialSpecific,
      forecastMessage,
      riskScore,
      impactScore: 0,
      priorityScore: 0,
      impactAmount,
      watchScore: 0,
      timing: "surveiller",
      timingLabel: PURCHASE_TIMING_LABELS.surveiller,
      timingReason: "",
      budgetCurrent: currentTotal,
      budgetProjected,
      budgetGap: round3(budgetProjected - currentTotal),
      potentialSaving,
      lossQty: loss ? round3(loss.surplusQty) : 0,
      lossUnit: loss?.surplusUnit ?? (line.unit || ""),
      lossValue,
      lossReason: loss ? loss.recommendation : null,
      recommendation,
      dataQuality: {
        project: Number(line.quantity) > 0,
        priceList: found,
        computed: true,
        forecast: !!basis,
      },
    };
  });

  // ── Normalisation des scores d'impact & priorité (relatifs au projet) ────
  const maxImpact = Math.max(1, ...draft.map((r) => Math.abs(r.impactAmount)));
  const maxTotal = Math.max(1, ...draft.map((r) => r.currentTotal));
  const maxQty = Math.max(1e-6, ...draft.map((r) => r.quantity));
  const maxLoss = Math.max(1e-6, ...draft.map((r) => r.lossValue));
  for (const row of draft) {
    const impactAbs = Math.abs(row.impactAmount);
    const impactShare = impactAbs / maxImpact;
    const valueShare = row.currentTotal / maxTotal;
    row.impactScore = clamp(Math.round(60 * impactShare + 40 * valueShare));

    // Priorité d'achat = impact financier + risque prix + poids budgétaire.
    const budgetShare = materialsBudget > 0 ? row.currentTotal / materialsBudget : 0;
    const shareScore = clamp(Math.round(Math.min(1, budgetShare * 3) * 100));
    row.priorityScore = clamp(
      Math.round(row.impactScore * 0.5 + row.riskScore * 0.35 + shareScore * 0.15),
    );

    // ── Classement « Matériaux à surveiller » (§11) ─────────────────────
    // Agrégation pondérée respectant l'ordre de priorité demandé : risque de
    // hausse, impact financier, quantité, priorité d'achat, risque de perte,
    // niveau de confiance. Chaque critère est normalisé /100 sur le projet.
    const qtyScore = clamp(Math.round((row.quantity / maxQty) * 100));
    const lossScore = clamp(Math.round((row.lossValue / maxLoss) * 100));
    row.watchScore = clamp(
      Math.round(
        row.riskScore * 0.30 +
          row.impactScore * 0.22 +
          qtyScore * 0.15 +
          row.priorityScore * 0.15 +
          lossScore * 0.10 +
          row.confidencePct * 0.08,
      ),
    );

    // ── Période d'achat par matériau, avec explication ───────────────────
    let timing: PurchaseTiming;
    if (!row.basis) timing = "surveiller";
    else if (row.trend === "hausse")
      timing = row.trendPct >= 2 ? "acheter_maintenant" : "acheter_prochainement";
    else if (row.trend === "baisse")
      timing = row.basis === "historique" && row.materialSpecific ? "attendre" : "acheter_prochainement";
    else timing = "surveiller";
    row.timing = timing;
    const lowPriority = row.priorityScore < 40 && row.impactScore < 40;
    row.timingLabel =
      lowPriority && timing === "surveiller"
        ? "Achat non prioritaire"
        : PURCHASE_TIMING_LABELS[timing];
    row.timingReason = !row.basis
      ? row.forecastMessage ?? MATERIAL_INSUFFICIENT_DATA_MESSAGE
      : timing === "acheter_maintenant"
        ? `Hausse estimée sur ${row.designation} : anticipez l'achat pour éviter le surcoût.`
        : timing === "acheter_prochainement"
          ? row.trend === "hausse"
            ? `Légère hausse probable sur ${row.designation} : préparez la commande.`
            : `Une alternative moins coûteuse existe pour ${row.designation}.`
          : timing === "attendre"
            ? `Baisse probable sur ${row.designation} : attendez une meilleure fenêtre.`
            : lowPriority
              ? `Impact financier limité : ${row.designation} n'est pas prioritaire.`
              : `Prix stables : suivez l'évolution de ${row.designation} avant commande.`;
  }

  // ── Agrégation projet (à partir des analyses INDIVIDUELLES) ──────────────
  const analyzed = draft.length;
  const watched = draft.filter((r) => r.trend === "hausse" || r.riskScore >= 60).length;
  const priorityPurchases = draft.filter((r) => r.priorityScore >= 70).length;
  const opportunities = draft.filter((r) => r.potentialSaving > 0 || r.trend === "baisse").length;
  const notFound = draft.filter((r) => !r.found).length;
  const rising = draft.filter((r) => r.trend === "hausse").length;
  const falling = draft.filter((r) => r.trend === "baisse").length;

  const totalCurrent = round3(draft.reduce((s, r) => s + r.currentTotal, 0));
  const totalProjected = round3(draft.reduce((s, r) => s + r.budgetProjected, 0));
  const totalExposure = round3(
    draft.reduce((s, r) => s + (r.impactAmount > 0 ? r.impactAmount : 0), 0),
  );
  const savingFromBaisses = round3(
    draft.reduce((s, r) => s + (r.impactAmount < 0 ? -r.impactAmount : 0), 0),
  );
  const totalPotentialSaving = round3(
    draft.reduce((s, r) => s + r.potentialSaving, 0) + savingFromBaisses,
  );
  const totalLoss = round3(draft.reduce((s, r) => s + r.lossValue, 0));

  const weightSum = draft.reduce((s, r) => s + Math.max(r.currentTotal, 1e-6), 0);
  const wavg = (pick: (r: MaterialIntelRow) => number) =>
    weightSum > 0
      ? draft.reduce((s, r) => s + pick(r) * Math.max(r.currentTotal, 1e-6), 0) / weightSum
      : 0;

  const priceRiskScore = clamp(Math.round(wavg((r) => r.riskScore)));
  const confidencePct = clamp(Math.round(wavg((r) => r.confidencePct)));
  const savingPct = materialsBudget > 0 ? (totalPotentialSaving / materialsBudget) * 100 : 0;
  const budgetOptimizationScore = clamp(Math.round(45 + savingPct * 3.5));
  const purchasePriorityScore = clamp(
    analyzed === 0 ? 0 : Math.round(draft.reduce((s, r) => s + r.priorityScore, 0) / analyzed),
  );
  const lossShare = materialsBudget > 0 ? totalLoss / materialsBudget : 0;
  const antiWasteScore = clamp(Math.round(100 - lossShare * 100 * 2));

  const globalScore = clamp(
    Math.round(
      (100 - priceRiskScore) * 0.3 +
        budgetOptimizationScore * 0.2 +
        purchasePriorityScore * 0.2 +
        antiWasteScore * 0.15 +
        confidencePct * 0.15,
    ),
  );

  return {
    rows: draft,
    aggregate: {
      analyzed,
      watched,
      priorityPurchases,
      opportunities,
      notFound,
      rising,
      falling,
      globalScore,
      priceRiskScore,
      budgetOptimizationScore,
      purchasePriorityScore,
      antiWasteScore,
      totalPotentialSaving,
      totalExposure,
      totalCurrent,
      totalProjected,
      totalLoss,
      confidencePct,
    },
    analyzedCount: analyzed,
    priceListMatched: draft.filter((r) => r.found).length,
    materialsBudget,
    generatedAt: Date.now(),
  };
}

/** Ré-exports pratiques pour l'interface. */
export { PREDICTION_CONFIDENCE_LABELS, PRICE_TREND_FULL_LABELS, MATERIAL_SCENARIO_LABELS };
