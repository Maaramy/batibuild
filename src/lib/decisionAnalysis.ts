/**
 * AIDE À LA DÉCISION — dérivation de l'Intelligence prédictive
 *
 * Ce module PUR ne calcule AUCUN prix : il transforme le résultat déjà produit
 * par `predictiveIntelligence` (moteur partagé, `materialSelectionEngine.ts`) en
 * un modèle de présentation complet : scores, cartes KPI, alertes, matrice de
 * risques, priorité d'achat, recommandations personnalisées et simulations.
 *
 * Règles de fiabilité (§16) :
 *   • « Données réelles » = lignes/prix/quantités du Quantitatif du projet ;
 *   • « Prévision IA » = tendance issue de l'historique marché ou, à défaut,
 *     de la comparaison réelle des scénarios Économique / Standard / Premium ;
 *   • « Estimation calculée » = scores, expositions et scénarios « Et si ? »,
 *     dérivés des données ci-dessus et toujours présentés comme des ordres de
 *     grandeur, jamais comme une certitude.
 */

import {
  MATERIAL_SCENARIO_LABELS,
  PREDICTION_CONFIDENCE_LABELS,
  PRICE_FORECAST_BASIS_LABELS,
  PRICE_TREND_FULL_LABELS,
  PRICE_TREND_LABELS,
  PURCHASE_TIMING_LABELS,
  type BudgetOptimizationItem,
  type BudgetRiskItem,
  type LossReductionItem,
  type MaterialLine,
  type MaterialPriceForecast,
  type MaterialWorkspace,
  type PredictionConfidence,
  type PredictiveIntelligence,
  type PriceForecastBasis,
  type PriceTrendDirection,
  type PurchasePeriodAdvice,
  type PurchaseTiming,
} from "@/convex/materialSelectionEngine";

// ── Petits utilitaires numériques ───────────────────────────────────────────
const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const pct2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

export { PRICE_TREND_FULL_LABELS, PRICE_TREND_LABELS, PREDICTION_CONFIDENCE_LABELS, PURCHASE_TIMING_LABELS, PRICE_FORECAST_BASIS_LABELS, MATERIAL_SCENARIO_LABELS };

// ── Charte visuelle des scores (§15) ────────────────────────────────────────
export type ScoreTone = "excellent" | "bon" | "surveiller" | "risque";

export interface ScoreBand {
  label: string;
  tone: ScoreTone;
}

/** Charte « qualité » : 80–100 Excellent · 60–79 Bon · 40–59 À surveiller · 0–39 Risque élevé. */
export function scoreBand(score: number): ScoreBand {
  const s = clamp(Math.round(score));
  if (s >= 80) return { label: "Excellent", tone: "excellent" };
  if (s >= 60) return { label: "Bon", tone: "bon" };
  if (s >= 40) return { label: "À surveiller", tone: "surveiller" };
  return { label: "Risque élevé", tone: "risque" };
}

/**
 * Charte « risque » : plus le score est haut, plus le risque est élevé.
 * (Un score de risque faible est donc « sain ».)
 */
export function riskBand(score: number): ScoreBand {
  const s = clamp(Math.round(score));
  if (s <= 20) return { label: "Risque faible", tone: "excellent" };
  if (s <= 45) return { label: "Risque modéré", tone: "bon" };
  if (s <= 70) return { label: "Vigilance", tone: "surveiller" };
  return { label: "Risque élevé", tone: "risque" };
}

// ── Regroupement « familles » des matériaux (filtres §5) ────────────────────
export const MATERIAL_GROUP_LABELS = [
  "Ciment",
  "Acier",
  "Béton",
  "Briques",
  "Bois",
  "Isolation",
  "Électricité",
  "Plomberie",
  "Finitions",
  "Autres",
] as const;

export type MaterialGroup = (typeof MATERIAL_GROUP_LABELS)[number];

const GROUP_BY_CATEGORY: Record<string, MaterialGroup> = {
  liants_ciments_mortiers: "Ciment",
  acier_metaux_structure: "Acier",
  quincaillerie_fixations: "Acier",
  betons_prefabrication: "Béton",
  terrassement_granulats: "Béton",
  voirie_reseaux_drainage: "Béton",
  maconnerie_plancher: "Briques",
  bois_panneaux_coffrage: "Bois",
  menuiseries: "Bois",
  materiaux_durables_biosources: "Bois",
  isolation_thermique: "Isolation",
  etancheite_protection: "Isolation",
  eclairage: "Électricité",
  equipements: "Électricité",
  cvc_chauffage_ventilation: "Électricité",
  energies_renouvelables: "Électricité",
  securite_incendie_surete: "Électricité",
  plomberie: "Plomberie",
  peintures_enduits_finitions: "Finitions",
  revetements_sols_murs: "Finitions",
  cloisons_platre_plafonds: "Finitions",
  toitures_bardages_facades: "Finitions",
  vitrage_verriers: "Finitions",
  chimie_construction: "Finitions",
};

/** Famille lisible d'une catégorie du catalogue officiel 2026. */
export function materialGroup(category: string | null | undefined): MaterialGroup {
  return GROUP_BY_CATEGORY[String(category ?? "").trim()] ?? "Autres";
}

// ── Modèles de sortie ───────────────────────────────────────────────────────
export interface DecisionScorePart {
  key: "prices" | "budget" | "materials" | "losses" | "purchase";
  label: string;
  icon: string;
  value: number;
  band: ScoreBand;
  detail: string;
}

export interface PriceEvolutionView {
  trend: PriceTrendDirection;
  evolutionPct: number;
  horizon: string;
  confidence: PredictionConfidence;
  confidencePct: number;
  basis: PriceForecastBasis | null;
  headline: string;
  /** Prévision court terme (% — variation observée / estimée). */
  shortPct: number;
  /** Projection moyen terme (% — estimation calculée, extrapolation). */
  midPct: number;
  forecasts: MaterialPriceForecast[];
  exposed: MaterialPriceForecast[];
  groups: MaterialGroup[];
}

export interface PurchasePeriodView {
  periodLabel: string;
  timing: PurchaseTiming;
  concerned: number;
  potentialSaving: number;
  confidence: PredictionConfidence;
  advices: PurchasePeriodAdvice[];
}

export interface BudgetView {
  current: number;
  optimized: number;
  saving: number;
  savingPct: number;
  items: BudgetOptimizationItem[];
  /** Postes à forte part du budget (surveillance). */
  riskItems: BudgetRiskItem[];
}

export interface LossView {
  estimatedLoss: number;
  avoidableLoss: number;
  potentialSaving: number;
  optimizableCount: number;
  groups: MaterialGroup[];
  antiWasteScore: number;
  items: LossReductionItem[];
}

export type AlertLevel = "hausse" | "budget" | "opportunite" | "optimisation";

export interface DecisionAlert {
  id: string;
  level: AlertLevel;
  title: string;
  reason: string;
  impact: number;
  recommendation: string;
}

export interface PurchasePriorityRow {
  articleId: string;
  designation: string;
  group: MaterialGroup;
  priority: number;
  band: ScoreBand;
  trend: PriceTrendDirection;
  timing: PurchaseTiming;
  recommendation: string;
  total: number;
  confidence: PredictionConfidence;
}

export interface DecisionRisk {
  id: string;
  label: string;
  probability: number;
  impact: number;
  score: number;
  band: ScoreBand;
  recommendation: string;
}

export interface DecisionAnalysis {
  available: boolean;
  reason: string | null;
  scenario: MaterialWorkspace["scenario"];
  analyzedLines: number;
  generatedAt: number;
  globalScore: number;
  globalBand: ScoreBand;
  scoreParts: DecisionScorePart[];
  priceEvolution: PriceEvolutionView;
  purchasePeriod: PurchasePeriodView | null;
  budget: BudgetView;
  overrunRisk: { score: number; band: ScoreBand; note: string };
  materialRiseRisk: { score: number; band: ScoreBand; rising: MaterialPriceForecast[]; note: string };
  losses: LossView;
  alerts: DecisionAlert[];
  priorities: PurchasePriorityRow[];
  risks: DecisionRisk[];
  recommendations: string[];
  /** Exposition au risque de hausse (TND) — base de la simulation d'achat anticipé. */
  riseExposure: number;
}

export interface DecisionAnalysisInput {
  intelligence: PredictiveIntelligence;
  workspace: MaterialWorkspace;
  /** Coût total du scénario retenu (TND) — même valeur que « Coût estimatif ». */
  projectTotal: number;
  /** Libellé du type de projet (personnalisation des recommandations). */
  projectTypeLabel?: string;
  /** Libellé du scénario retenu. */
  scenarioLabel?: string;
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/** Période d'achat recommandée, dérivée de la dominante des conseils. */
function periodLabelFor(timing: PurchaseTiming, now: Date): string {
  const month = (offset: number) => MONTHS_FR[(now.getMonth() + offset) % 12];
  switch (timing) {
    case "acheter_maintenant":
      return "Immédiatement";
    case "acheter_prochainement":
      return `${month(1)}–${month(2)}`;
    case "attendre":
      return `${month(2)}–${month(3)}`;
    default:
      return "À surveiller";
  }
}

export function buildDecisionAnalysis(input: DecisionAnalysisInput): DecisionAnalysis {
  const { intelligence: pi, workspace: ws, projectTotal } = input;
  const now = new Date();
  const forecasts = pi.priceForecasts ?? [];
  const materialsBudget = ws.budget.materialsBudget > 0 ? ws.budget.materialsBudget : 0;

  // ── Évolution des prix (agrégation pondérée par le montant réel) ──────────
  const totalWeight = forecasts.reduce((s, f) => s + f.currentTotal, 0);
  const evolutionPct =
    totalWeight > 0
      ? pct2(forecasts.reduce((s, f) => s + f.trendPct * f.currentTotal, 0) / totalWeight)
      : 0;
  const trend: PriceTrendDirection =
    evolutionPct >= 0.5 ? "hausse" : evolutionPct <= -0.5 ? "baisse" : "stable";
  const avgConfidenceScore =
    forecasts.length > 0
      ? forecasts.reduce((s, f) => s + f.confidenceScore, 0) / forecasts.length
      : 0;
  const confidencePct = Math.round(avgConfidenceScore * 100);
  const confidence: PredictionConfidence =
    confidencePct >= 70 ? "elevee" : confidencePct >= 40 ? "moyenne" : "faible";
  const basis: PriceForecastBasis | null =
    forecasts.length === 0
      ? null
      : forecasts.some((f) => f.basis === "historique")
        ? "historique"
        : "variantes";
  // Horizon : le plus représentatif (le plus fréquent) parmi les prévisions.
  const horizonCounts = new Map<string, number>();
  for (const f of forecasts) horizonCounts.set(f.horizon, (horizonCounts.get(f.horizon) ?? 0) + 1);
  const horizon =
    [...horizonCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "prochaines semaines";

  const exposed = [...forecasts]
    .filter((f) => f.trend === "hausse")
    .sort((a, b) => b.trendPct * b.currentTotal - a.trendPct * a.currentTotal)
    .slice(0, 5);

  const riseExposure = pct2(
    forecasts.reduce(
      (s, f) => s + (f.trend === "hausse" ? (f.currentTotal * f.trendPct) / 100 : 0),
      0,
    ),
  );

  const headline =
    forecasts.length === 0
      ? "Données insuffisantes pour établir une prévision fiable."
      : trend === "hausse"
        ? `${evolutionPct >= 0 ? "+" : ""}${evolutionPct.toLocaleString("fr-FR")} % — hausse probable des prix sur les ${horizon}.`
        : trend === "baisse"
          ? `${evolutionPct.toLocaleString("fr-FR")} % — baisse possible détectée sur les ${horizon}.`
          : "Prix globalement stables sur les prochaines semaines.";

  const priceEvolution: PriceEvolutionView = {
    trend,
    evolutionPct,
    horizon,
    confidence,
    confidencePct,
    basis,
    headline,
    shortPct: evolutionPct,
    // Estimation calculée : projection indicative à moyen terme (2 × la
    // variation observée). Jamais présentée comme une certitude.
    midPct: pct2(evolutionPct * 2),
    forecasts,
    exposed,
    groups: Array.from(new Set(forecasts.map((f) => materialGroup(f.category)))),
  };

  // ── Meilleure période d'achat ────────────────────────────────────────────
  const advices = pi.purchasePlan ?? [];
  const timingCounts = new Map<PurchaseTiming, number>();
  for (const a of advices) timingCounts.set(a.timing, (timingCounts.get(a.timing) ?? 0) + 1);
  const dominantTiming: PurchaseTiming =
    [...timingCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "surveiller";
  const concernedAdvices = advices.filter((a) => a.timing === dominantTiming);
  // Économie accessible = variation favorable réelle des scénarios déjà connus.
  const periodSaving = pct2(
    advices
      .filter((a) => a.basis === "variantes" && a.trend === "baisse")
      .reduce((s, a) => {
        const f = forecasts.find((x) => x.articleId === a.articleId);
        return s + (f ? (f.currentTotal * Math.abs(f.trendPct)) / 100 : 0);
      }, 0),
  );
  const purchasePeriod: PurchasePeriodView | null =
    advices.length === 0
      ? null
      : {
          periodLabel: periodLabelFor(dominantTiming, now),
          timing: dominantTiming,
          concerned: concernedAdvices.length,
          potentialSaving: periodSaving,
          confidence:
            concernedAdvices.every((a) => a.confidence === "faible") ? "faible" : "moyenne",
          advices,
        };

  // ── Optimisation du budget ───────────────────────────────────────────────
  const budgetSaving = pi.budget.potentialSaving;
  const budget: BudgetView = {
    current: materialsBudget,
    optimized: Math.max(0, materialsBudget - budgetSaving),
    saving: budgetSaving,
    savingPct: materialsBudget > 0 ? pct2((budgetSaving / materialsBudget) * 100) : 0,
    items: pi.budget.items ?? [],
    riskItems: pi.budget.riskItems ?? [],
  };

  // ── Réduction des pertes ─────────────────────────────────────────────────
  const lossEstimated = pi.totals.lossRisk;
  const avoidable = pct2(
    (pi.lossReduction ?? []).reduce((s, i) => s + (i.kind === "planification" ? 0 : i.surplusCost), 0),
  );
  const optimizableCount = (pi.lossReduction ?? []).filter((i) => i.surplusCost > 0).length;
  const lossGroups = Array.from(
    new Set(
      (pi.lossReduction ?? [])
        .filter((i) => i.surplusCost > 0)
        .map((i) => materialGroup(ws.lines.find((l) => l.articleId === i.articleId)?.category)),
    ),
  );
  const lossShare = materialsBudget > 0 ? lossEstimated / materialsBudget : 0;
  const losses: LossView = {
    estimatedLoss: lossEstimated,
    avoidableLoss: avoidable,
    potentialSaving: avoidable,
    optimizableCount,
    groups: lossGroups,
    antiWasteScore: clamp(Math.round(100 - lossShare * 100 * 2)),
    items: pi.lossReduction ?? [],
  };

  // ── Risque de dépassement ────────────────────────────────────────────────
  const overrunRaw = (riseExposure + lossEstimated) / Math.max(projectTotal, 1);
  const overrunScore = clamp(Math.round(overrunRaw * 100 * 5));
  const overrunRisk = {
    score: overrunScore,
    band: riskBand(overrunScore),
    note:
      forecasts.length === 0
        ? "Aucune prévision de prix exploitable : risque non quantifiable avec certitude."
        : "Estimation calculée à partir de l'exposition aux hausses et des pertes identifiées, rapportée au coût total du projet.",
  };

  // ── Risque de hausse des matériaux ───────────────────────────────────────
  const exposedWeight = forecasts
    .filter((f) => f.trend === "hausse")
    .reduce((s, f) => s + f.currentTotal, 0);
  const exposedShare = materialsBudget > 0 ? exposedWeight / materialsBudget : 0;
  const riseScore =
    exposed.length === 0
      ? 0
      : clamp(Math.round(exposedShare * 100 * 0.6 + Math.max(...exposed.map((f) => f.trendPct)) * 6));
  const materialRiseRisk = {
    score: riseScore,
    band: riskBand(riseScore),
    rising: exposed,
    note:
      exposed.length === 0
        ? "Aucun matériau de votre projet ne présente de tendance à la hausse dans les données disponibles."
        : `${exposed.length} matériau(x) susceptibles d'augmenter, représentant ${Math.round(exposedShare * 100)} % du budget matériaux.`,
  };

  // ── Scores IA (§4) ───────────────────────────────────────────────────────
  const priceScore = forecasts.length === 0 ? 0 : clamp(Math.round(35 + avgConfidenceScore * 65));
  const budgetScore = clamp(Math.round(45 + budget.savingPct * 3.5));
  const scoredLines = ws.lines.filter((l) => l.priceAvailable);
  const avgPriceQuality =
    scoredLines.length > 0
      ? scoredLines.reduce((s, l) => s + (ws.scores[l.articleId]?.score ?? 0), 0) / scoredLines.length
      : 0;
  const materialScore = clamp(Math.round(avgPriceQuality || 60));
  const lossScore = losses.antiWasteScore;
  const clearTiming = advices.filter((a) => a.timing !== "surveiller").length;
  const purchaseScore = advices.length === 0 ? 0 : clamp(Math.round((clearTiming / advices.length) * 60 + 35));

  const scoreParts: DecisionScorePart[] = [
    {
      key: "prices",
      label: "Prévision des prix",
      icon: "trending",
      value: priceScore,
      band: scoreBand(priceScore),
      detail:
        forecasts.length === 0
          ? "Données insuffisantes"
          : `${forecasts.length} postes prévus · fiabilité ${confidencePct} %`,
    },
    {
      key: "budget",
      label: "Optimisation budget",
      icon: "wallet",
      value: budgetScore,
      band: scoreBand(budgetScore),
      detail: budget.saving > 0 ? `${budget.savingPct.toLocaleString("fr-FR")} % d'économie accessible` : "Budget déjà optimisé",
    },
    {
      key: "materials",
      label: "Optimisation matériaux",
      icon: "layers",
      value: materialScore,
      band: scoreBand(materialScore),
      detail: `${scoredLines.length} matériaux évalués`,
    },
    {
      key: "losses",
      label: "Réduction des pertes",
      icon: "recycle",
      value: lossScore,
      band: scoreBand(lossScore),
      detail: lossEstimated > 0 ? `${lossEstimated.toLocaleString("fr-FR")} TND de pertes estimées` : "Aucune perte chiffrée détectée",
    },
    {
      key: "purchase",
      label: "Stratégie d'achat",
      icon: "cart",
      value: purchaseScore,
      band: scoreBand(purchaseScore),
      detail: purchasePeriod ? `Période conseillée : ${purchasePeriod.periodLabel}` : "À définir",
    },
  ];
  const globalScore = clamp(
    Math.round(
      priceScore * 0.24 +
        budgetScore * 0.2 +
        materialScore * 0.2 +
        lossScore * 0.18 +
        purchaseScore * 0.18,
    ),
  );

  // ── Priorité d'achat (§10) ───────────────────────────────────────────────
  const priorities: PurchasePriorityRow[] = forecasts.map((f) => {
    const share = materialsBudget > 0 ? f.currentTotal / materialsBudget : 0;
    const trendWeight = f.trend === "hausse" ? 1 : f.trend === "stable" ? 0.4 : 0.15;
    const value = clamp(Math.round(share * 100 * 2 + trendWeight * 40 + f.confidenceScore * 20));
    const advice = advices.find((a) => a.articleId === f.articleId);
    return {
      articleId: f.articleId,
      designation: f.designation,
      group: materialGroup(f.category),
      priority: value,
      band: scoreBand(value),
      trend: f.trend,
      timing: advice?.timing ?? "surveiller",
      recommendation: advice ? PURCHASE_TIMING_LABELS[advice.timing] : PRICE_TREND_LABELS[f.trend],
      total: f.currentTotal,
      confidence: f.confidence,
    };
  });
  priorities.sort((a, b) => b.priority - a.priority);

  // ── Alertes prédictives (§9) ─────────────────────────────────────────────
  const alerts: DecisionAlert[] = [];
  if (exposed[0]) {
    alerts.push({
      id: "hausse",
      level: "hausse",
      title: "Hausse probable",
      reason: `${exposed[0].designation} pourrait augmenter (${exposed[0].trendPct >= 0 ? "+" : ""}${exposed[0].trendPct.toLocaleString("fr-FR")} %).`,
      impact: riseExposure,
      recommendation: "Envisagez un achat anticipé sur les postes les plus exposés.",
    });
  }
  const topRiskItem = pi.budget.riskItems?.[0];
  if (topRiskItem) {
    alerts.push({
      id: "budget",
      level: "budget",
      title: "Budget sous surveillance",
      reason: `${topRiskItem.designation} représente ${topRiskItem.sharePct.toLocaleString("fr-FR")} % du budget matériaux.`,
      impact: topRiskItem.total,
      recommendation: "Comparez les fournisseurs et surveillez l'évolution de ce poste.",
    });
  }
  if (purchasePeriod && purchasePeriod.potentialSaving > 0) {
    alerts.push({
      id: "opportunite",
      level: "opportunite",
      title: "Opportunité d'achat",
      reason: `Une période favorable (${purchasePeriod.periodLabel}) a été détectée pour ${purchasePeriod.concerned} matériau(x).`,
      impact: purchasePeriod.potentialSaving,
      recommendation: "Planifiez ces achats sur la période recommandée.",
    });
  }
  const lossItem = losses.items.find((i) => i.surplusCost > 0);
  if (lossItem) {
    alerts.push({
      id: "optimisation",
      level: "optimisation",
      title: "Optimisation des pertes",
      reason: `Une réduction des pertes est possible sur « ${lossItem.designation} ».`,
      impact: lossItem.surplusCost,
      recommendation: "Ajustez la quantité commandée au conditionnement réel.",
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      id: "info",
      level: "opportunite",
      title: "Aucune alerte majeure",
      reason: "Les données disponibles ne révèlent aucune tension particulière sur votre projet.",
      impact: 0,
      recommendation: "Poursuivez le suivi habituel des prix avant vos commandes.",
    });
  }

  // ── Matrice des risques (§11) ────────────────────────────────────────────
  const trendSpread =
    forecasts.length > 1
      ? Math.max(...forecasts.map((f) => Math.abs(f.trendPct)))
      : 0;
  const topCategoryShare =
    materialsBudget > 0 && forecasts.length > 0
      ? Math.max(...forecasts.map((f) => f.currentTotal)) / materialsBudget
      : 0;
  const noPriceLines = ws.lines.filter((l) => !l.priceAvailable).length;
  const riskDefs: Array<Omit<DecisionRisk, "score" | "band">> = [
    {
      id: "price",
      label: "Hausse des prix",
      probability: exposed.length > 0 ? clamp(Math.round(exposedShare * 100 + 25)) : 15,
      impact: clamp(Math.round((riseExposure / Math.max(projectTotal, 1)) * 100 * 5)),
      recommendation: "Anticiper les commandes des postes exposés.",
    },
    {
      id: "volatility",
      label: "Volatilité des matériaux",
      probability: clamp(Math.round(trendSpread * 8)),
      impact: clamp(Math.round(trendSpread * 6)),
      recommendation: "Lisser les achats et privilégier des prix fermes.",
    },
    {
      id: "availability",
      label: "Disponibilité / données",
      probability: clamp(Math.round(((noPriceLines + ws.lines.length * 0.2) / Math.max(ws.lines.length, 1)) * 100)),
      impact: 40,
      recommendation: "Confirmer la disponibilité auprès des fournisseurs locaux.",
    },
    {
      id: "dependency",
      label: "Dépendance à un matériau",
      probability: clamp(Math.round(topCategoryShare * 100)),
      impact: clamp(Math.round(topCategoryShare * 80)),
      recommendation: "Identifier des alternatives pour le poste dominant.",
    },
    {
      id: "overrun",
      label: "Dépassement budgétaire",
      probability: overrunScore,
      impact: clamp(Math.round(overrunRaw * 100 * 8)),
      recommendation: "Conserver une marge et suivre les écarts de prix.",
    },
    {
      id: "losses",
      label: "Pertes de matériaux",
      probability: clamp(Math.round(lossShare * 100 * 3)),
      impact: clamp(Math.round(lossShare * 100 * 4)),
      recommendation: "Ajuster les quantités aux conditionnements réels.",
    },
    {
      id: "timing",
      label: "Achats trop précoces / tardifs",
      probability: clamp(Math.round((advices.filter((a) => a.timing === "surveiller").length / Math.max(advices.length, 1)) * 100)),
      impact: 35,
      recommendation: "Suivre le calendrier d'achat recommandé par l'IA.",
    },
  ];
  const risks: DecisionRisk[] = riskDefs.map((r) => {
    const score = clamp(Math.round((r.probability * r.impact) / 100));
    return { ...r, score, band: riskBand(score) };
  });

  // ── Recommandations personnalisées (§13) ─────────────────────────────────
  const recommendations: string[] = [];
  const typeLabel = input.projectTypeLabel ? `Votre projet (${input.projectTypeLabel})` : "Votre projet";
  if (exposed[0]) {
    recommendations.push(
      `${typeLabel} présente une exposition au prix de « ${exposed[0].designation} » estimée à ${riseExposure.toLocaleString("fr-FR")} TND. Surveillez son évolution et envisagez un achat anticipé si les conditions restent favorables.`,
    );
  } else if (forecasts.length > 0) {
    recommendations.push(
      `${typeLabel} ne présente aucune tendance à la hausse marquée sur ses ${forecasts.length} postes suivis : un achat échelonné reste pertinent.`,
    );
  } else {
    recommendations.push(
      `${typeLabel} ne dispose pas d'assez de données de prix pour établir une prévision fiable ; les analyses ci-dessous reposent uniquement sur le Quantitatif détaillé.`,
    );
  }
  if (budget.saving > 0) {
    recommendations.push(
      `Une économie potentielle de ${budget.saving.toLocaleString("fr-FR")} TND (${budget.savingPct.toLocaleString("fr-FR")} %) est accessible sans dégrader votre scénario « ${input.scenarioLabel ?? MATERIAL_SCENARIO_LABELS[ws.scenario]} » : ${budget.items.length} poste(s) concerné(s).`,
    );
  }
  if (losses.optimizableCount > 0) {
    recommendations.push(
      `Réduisez vos pertes sur ${losses.optimizableCount} poste(s) (${losses.avoidableLoss.toLocaleString("fr-FR")} TND évitables) en ajustant les quantités commandées aux conditionnements réels.`,
    );
  }
  if (purchasePeriod) {
    recommendations.push(
      `La stratégie d'achat conseillée est « ${PURCHASE_TIMING_LABELS[purchasePeriod.timing]} » ; la période la plus favorable estimée est ${purchasePeriod.periodLabel}.`,
    );
  }
  if (topRiskItem) {
    recommendations.push(
      `Le poste « ${topRiskItem.designation} » pèse ${topRiskItem.sharePct.toLocaleString("fr-FR")} % du budget matériaux : comparez au moins deux fournisseurs avant de commander.`,
    );
  }

  return {
    available: pi.available,
    reason: pi.reason,
    scenario: ws.scenario,
    analyzedLines: pi.analyzedLines,
    generatedAt: pi.generatedAt,
    globalScore,
    globalBand: scoreBand(globalScore),
    scoreParts,
    priceEvolution,
    purchasePeriod,
    budget,
    overrunRisk,
    materialRiseRisk,
    losses,
    alerts,
    priorities,
    risks,
    recommendations,
    riseExposure,
  };
}

// ── Simulation « Et si ? » (§12) ─────────────────────────────────────────────
export interface SimulationInput {
  workspace: MaterialWorkspace;
  projectTotal: number;
  /** Pertes évitables (TND). */
  lossSaving: number;
  /** Économie accessible via la comparaison des scénarios (TND). */
  budgetSaving: number;
  /** Exposition aux hausses (TND) — économie d'un achat anticipé. */
  riseExposure: number;
}

export interface SimulationResult {
  id: string;
  label: string;
  description: string;
  newProjectTotal: number;
  delta: number;
  deltaPct: number;
  impactedCount: number;
  impactNote: string;
}

function shock(
  input: SimulationInput,
  pct: number,
  group: MaterialGroup | null,
): { delta: number; count: number } {
  const lines = input.workspace.lines.filter(
    (l) => l.priceAvailable && (group === null || materialGroup(l.category) === group),
  );
  const delta = lines.reduce((s, l) => s + (l.total * pct) / 100, 0);
  return { delta: pct2(delta), count: lines.length };
}

const make = (
  id: string,
  label: string,
  description: string,
  input: SimulationInput,
  delta: number,
  impactedCount: number,
  impactNote: string,
): SimulationResult => ({
  id,
  label,
  description,
  newProjectTotal: Math.round(input.projectTotal + delta),
  delta: Math.round(delta),
  deltaPct: input.projectTotal > 0 ? pct2((delta / input.projectTotal) * 100) : 0,
  impactedCount,
  impactNote,
});

/** Scénarios « Et si ? » — ne modifient JAMAIS le résultat officiel du projet. */
export function buildSimulations(input: SimulationInput): SimulationResult[] {
  const all = shock(input, 5, null);
  const steel = shock(input, 10, "Acier");
  const cement = shock(input, 5, "Ciment");
  return [
    make(
      "all_5",
      "+5 % tous les matériaux",
      "Hausse généralisée des prix fournisseurs.",
      input,
      all.delta,
      all.count,
      `${all.count} poste(s) impacté(s)`,
    ),
    make(
      "steel_10",
      "+10 % sur l'acier",
      "Tension sur le marché de l'acier.",
      input,
      steel.delta,
      steel.count,
      steel.count > 0 ? `${steel.count} poste(s) acier impacté(s)` : "Aucun poste acier dans ce projet",
    ),
    make(
      "cement_5",
      "+5 % sur le ciment",
      "Hausse du prix du ciment.",
      input,
      cement.delta,
      cement.count,
      cement.count > 0 ? `${cement.count} poste(s) ciment impacté(s)` : "Aucun poste ciment dans ce projet",
    ),
    make(
      "loss_10",
      "−10 % de pertes",
      "Réduction des pertes de matériaux.",
      input,
      -input.lossSaving * 0.1,
      0,
      input.lossSaving > 0 ? "Optimisation des quantités commandées" : "Aucune perte chiffrée",
    ),
    make(
      "budget_opt",
      "Optimisation du budget",
      "Passage aux variantes les plus économiques.",
      input,
      -input.budgetSaving,
      0,
      input.budgetSaving > 0 ? "Sans dégrader le scénario retenu" : "Budget déjà optimisé",
    ),
    make(
      "anticipate",
      "Achat anticipé",
      "Achats réalisés avant les hausses estimées.",
      input,
      -input.riseExposure,
      0,
      input.riseExposure > 0 ? "Évite la hausse prévue" : "Aucune hausse prévue",
    ),
  ];
}

/** Catégories réellement présentes dans le projet (pour le filtre §5). */
export function groupsPresent(lines: MaterialLine[]): string[] {
  const set = new Set<MaterialGroup>();
  for (const l of lines) set.add(materialGroup(l.category));
  return MATERIAL_GROUP_LABELS.filter((g) => set.has(g));
}
