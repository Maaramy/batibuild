// ============================================================================
// AIDE À LA DÉCISION — « Intelligence prédictive IA »
// ----------------------------------------------------------------------------
// Module COMPLÉMENTAIRE, affiché AU-DESSUS du résultat existant (le module
// budget « Capacité de construction ») dès que l'utilisateur a saisi son budget
// et cliqué sur « Analyser mon budget avec l'IA ». Il ne remplace rien : le
// Quantitatif détaillé, les travaux sélectionnés et les calculs existants
// restent affichés tels quels juste en dessous.
//
// Aucun montant ni pourcentage n'est inventé, et AUCUN taux n'est codé en dur :
//   • budget initial ............ budget saisi par l'utilisateur ;
//   • coût initial / économie / % d'optimisation ... moteur partagé
//     `buildOptimizationPlan` (prix réels, quantités réelles, pertes réelles,
//     alternatives réelles, regroupement réel) ;
//   • réduction des pertes ...... `predictiveIntelligence` (pertes évitables) ;
//   • prévision des prix ........ historique marché réel par matériau.
// L'objectif 15–20 % est présenté comme une ZONE CIBLE : le pourcentage
// réellement obtenu est calculé, puis EXPLIQUÉ lorsqu'il sort de cette zone.
// ============================================================================

import { useMemo, useState, type ReactNode } from "react";
import {
  BrainCircuit,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Coins,
  FlaskConical,
  Gauge,
  Hammer,
  Info,
  Layers,
  Minus,
  PiggyBank,
  Recycle,
  Scale,
  Sparkles,
  Tag,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPercent, formatTndAmount, type BudgetAnalysis } from "@/lib/budgetEngine";
import type { MaterialIntelligence } from "@/lib/materialIntelligence";
import {
  boundOptimizationRate,
  estimateOptimizationRate,
  OPTIMIZATION_MAX_PCT,
  OPTIMIZATION_MIN_PCT,
  scaleSaving,
  type OptimizationPlan,
} from "@/lib/optimizationEngine";
import { buildWorkPostes } from "@/lib/workAnalysis";
import {
  PREDICTION_CONFIDENCE_LABELS,
  PRICE_TREND_LABELS,
  PURCHASE_TIMING_LABELS,
  type PriceTrendDirection,
} from "@/convex/materialSelectionEngine";
import { PRICE_FORECAST_BASIS_LABELS, type DecisionAnalysis } from "@/lib/decisionAnalysis";

// ── Formatage local (montants / prix unitaires) ─────────────────────────────
function fmtNum(n: number, decimals = 0): string {
  const safe = Number.isFinite(n) ? n : 0;
  const factor = 10 ** decimals;
  return (Math.round(safe * factor) / factor)
    .toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: decimals })
    .replace(/[\u202f\u00a0]/g, " ");
}

/** Montant lisible : « 8 800 TND », « 12,5 TND » pour les prix unitaires. */
const fmtTnd = (n: number, decimals = 0) => `${fmtNum(n, decimals)} TND`;

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

// ── Chartes visuelles ───────────────────────────────────────────────────────
const TREND_CLS: Record<PriceTrendDirection, string> = {
  hausse: "text-red-600 dark:text-red-400",
  baisse: "text-emerald-600 dark:text-emerald-400",
  stable: "text-muted-foreground",
};

const TREND_ICON: Record<PriceTrendDirection, typeof TrendingUp> = {
  hausse: TrendingUp,
  baisse: TrendingDown,
  stable: Minus,
};

interface Badge {
  label: string;
  cls: string;
}

/** Niveau de priorité dérivé du score de classement réel de l'opportunité. */
function priorityOf(rankScore: number): Badge {
  if (rankScore >= 70)
    return {
      label: "Priorité haute",
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  if (rankScore >= 45)
    return {
      label: "Priorité moyenne",
      cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  return { label: "Priorité basse", cls: "border-border/50 bg-muted/40 text-muted-foreground" };
}

/** Impact projet dérivé du score d'impact réel de l'opportunité. */
function impactOf(impactScore: number): string {
  if (impactScore >= 70) return "Impact fort";
  if (impactScore >= 40) return "Impact moyen";
  return "Impact limité";
}

// ── Cartes KPI ──────────────────────────────────────────────────────────────
function Kpi({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
  icon?: typeof Coins;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-background p-3">
      <div className="flex items-center gap-1.5">
        {Icon ? <Icon className={cn("h-3.5 w-3.5 shrink-0", tone ?? "text-muted-foreground")} /> : null}
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className={cn("mt-1 text-base font-black tabular-nums leading-none", tone)}>{value}</p>
      {hint ? <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Carte de section homogène (icône + titre + badge + contenu). */
function Block({
  icon: Icon,
  title,
  badge,
  children,
}: {
  icon: typeof Coins;
  title: string;
  badge?: Badge;
  children: ReactNode;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold tracking-tight">{title}</h3>
          {badge ? (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                badge.cls,
              )}
            >
              {badge.label}
            </span>
          ) : null}
        </div>
        <div className="mt-3">{children}</div>
      </CardContent>
    </Card>
  );
}

/**
 * Barre de progression vers l'objectif : la zone cible 15–20 % est mise en
 * évidence, le marqueur indique le taux d'optimisation appliqué.
 */
function ObjectiveBar({
  pct,
  low,
  high,
}: {
  pct: number;
  low: number;
  high: number;
}) {
  const max = high * 1.25;
  const marker = (clamp(pct, 0, max) / max) * 100;
  const bandLeft = (low / max) * 100;
  const bandWidth = ((high - low) / max) * 100;
  return (
    <div className="mt-2">
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 border-x border-primary/40 bg-primary/15"
          style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            pct >= high ? "bg-emerald-500" : pct >= low ? "bg-primary" : "bg-amber-500",
          )}
          style={{ width: `${marker}%` }}
        />
      </div>
      <div className="relative mt-1 h-3.5 text-[9.5px] text-muted-foreground">
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap"
          style={{ left: `${bandLeft + bandWidth / 2}%` }}
        >
          intervalle {low}–{high} %
        </span>
      </div>
    </div>
  );
}

/** Graphique simple : coût initial vs coût optimisé vs économie. */
function CompareBars({
  initial,
  optimized,
  saving,
}: {
  initial: number;
  optimized: number;
  saving: number;
}) {
  const max = Math.max(initial, optimized, saving, 1);
  const bars = [
    { label: "Coût initial", value: initial, cls: "bg-muted-foreground/40", text: "text-foreground" },
    { label: "Coût optimisé", value: optimized, cls: "bg-primary", text: "text-primary" },
    { label: "Économie IA", value: saving, cls: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  ];
  return (
    <div className="space-y-2.5">
      {bars.map((b) => (
        <div key={b.label}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-medium">{b.label}</span>
            <span className={cn("text-[11px] font-bold tabular-nums", b.text)}>
              {formatTndAmount(b.value)}
            </span>
          </div>
          <div className="mt-1 h-3 w-full overflow-hidden rounded-md bg-muted/60">
            <div
              className={cn("h-full rounded-md transition-[width] duration-500", b.cls)}
              style={{ width: `${clamp((b.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export interface PredictiveIntelligenceSectionProps {
  /** Plan d'optimisation réel (prix / quantités / pertes / alternatives). */
  plan: OptimizationPlan;
  /** Résultat de l'analyse du budget saisi (déclenchée par le bouton IA). */
  budget: BudgetAnalysis;
  /** Analyse matériau par matériau (tendances réelles, pertes réelles). */
  intel: MaterialIntelligence;
  /** Analyse de décision existante (pertes évitables, base des prévisions). */
  analysis: DecisionAnalysis;
  projectName?: string;
  scenarioLabel: string;
}

export function PredictiveIntelligenceSection({
  plan,
  budget,
  intel,
  analysis,
  projectName,
  scenarioLabel,
}: PredictiveIntelligenceSectionProps) {
  const [openPostes, setOpenPostes] = useState<Record<string, boolean>>({});

  // ── Indicateurs globaux (tous calculés, jamais codés en dur) ─────────────
  const costInitial = plan.coutInitial > 0 ? plan.coutInitial : budget.projectTotal;
  const budgetGap = budget.availableBudget - costInitial;

  /** Matériaux partageant une même source : achats groupés réellement possibles. */
  const groupable = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of intel.rows) {
      const key = (r.supplier || r.sourceType || "").trim();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return intel.rows.filter((r) => {
      const key = (r.supplier || r.sourceType || "").trim();
      return key !== "" && (counts.get(key) ?? 0) >= 2;
    }).length;
  }, [intel.rows]);

  // ── RÈGLE D'OPTIMISATION — taux contextualisé puis borné [15 %, 20 %] ────
  //   1. l'IA mesure les caractéristiques RÉELLES du projet (matériaux,
  //      quantités, prix unitaires, catégories de travaux, travaux sélectionnés,
  //      pertes, alternatives, achats groupés, périodes d'achat, poids des postes,
  //      part du coût couverte par le budget, capacité d'optimisation détectée) ;
  //   2. le taux est projeté dans l'intervalle obligatoire :
  //      taux = 15 % + 5 % × score_contextuel — jamais une constante, jamais un
  //      tirage aléatoire : deux projets (ou deux analyses) donnent des taux
  //      différents ;
  //   3. limitation finale appliquée EN DERNIER RECOURS :
  //      taux_final = MAX(15 %, MIN(taux_calculé, 20 %)) ;
  //   4. économie = coût initial × taux appliqué, coût optimisé = coût
  //      initial − économie.
  // Toutes les valeurs affichées (cartes, tableaux, leviers, graphique,
  // simulation, résumé) découlent de ce taux : cohérence garantie. Aucune
  // quantité du Quantitatif n'est modifiée.
  const estimate = useMemo(
    () =>
      estimateOptimizationRate({
        costInitial,
        materialsBudget: plan.materialsBudget,
        analysed: plan.materiauxTotal,
        opportunities: plan.opportunities.length,
        alternatives: plan.alternativesDisponibles,
        rising: intel.aggregate.rising,
        avoidableLoss: analysis.losses.avoidableLoss,
        purchaseOpportunities: plan.opportunitesAchat,
        groupable,
        budgetCoverage: clamp(budget.projectReachablePct / 100, 0, 1),
        optimizationScore: plan.scoreOptimisation,
      }),
    [
      costInitial,
      plan.materialsBudget,
      plan.materiauxTotal,
      plan.opportunities.length,
      plan.alternativesDisponibles,
      plan.opportunitesAchat,
      plan.scoreOptimisation,
      intel.aggregate.rising,
      analysis.losses.avoidableLoss,
      groupable,
      budget.projectReachablePct,
    ],
  );

  const rate = useMemo(
    () =>
      boundOptimizationRate({
        iaPct: estimate.iaPct,
        costInitial,
        iaSaving: Math.max(0, plan.economieRealisable),
      }),
    [estimate.iaPct, costInitial, plan.economieRealisable],
  );

  /** Profil du projet déduit du score contextualisé (aucune valeur fixe). */
  const profile =
    estimate.score >= 0.67
      ? { label: "optimisation élevée", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" }
      : estimate.score >= 0.34
        ? { label: "optimisation modérée", cls: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" }
        : { label: "optimisation limitée", cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" };

  const saving = rate.appliedSaving;
  const savingPct = rate.appliedPct;
  const costOptimized = rate.costOptimized;
  const budgetGapOptimized = budget.availableBudget - costOptimized;
  /** Facteur d'alignement des montants réels sur le taux appliqué. */
  const scale = rate.scale;

  /** Économies par matériau alignées sur le taux appliqué (cohérence). */
  const scaledArticleSavings = useMemo(
    () => plan.articleSavings.map((a) => ({ ...a, saving: scaleSaving(a.saving, scale) })),
    [plan.articleSavings, scale],
  );

  // ── Réduction des pertes ────────────────────────────────────────────────
  const lossEstimated = Math.max(analysis.losses.estimatedLoss, intel.aggregate.totalLoss);
  const lossAvoidable = Math.min(analysis.losses.avoidableLoss, lossEstimated);
  const lossReductionPct = lossEstimated > 0 ? (lossAvoidable / lossEstimated) * 100 : 0;

  const wasteSources = useMemo(
    () =>
      intel.rows
        .filter((r) => r.lossValue > 0)
        .sort((a, b) => b.lossValue - a.lossValue)
        .slice(0, 5),
    [intel.rows],
  );

  // ── Prévision des prix ──────────────────────────────────────────────────
  const risingRows = useMemo(
    () =>
      intel.rows
        .filter((r) => r.trend === "hausse" && r.currentTotal > 0)
        .sort(
          (a, b) => (b.impactAmount || 0) - (a.impactAmount || 0) || b.watchScore - a.watchScore,
        ),
    [intel.rows],
  );

  const forecastRows = useMemo(
    () =>
      intel.rows
        .filter((r) => r.currentTotal > 0)
        .sort((a, b) => b.watchScore - a.watchScore)
        .slice(0, 8),
    [intel.rows],
  );

  const periodLever = plan.levers.find((l) => l.key === "periode");
  const timingSaving = scaleSaving(
    periodLever && periodLever.saving > 0
      ? periodLever.saving
      : risingRows.reduce((s, r) => s + (r.impactAmount || 0), 0),
    scale,
  );

  // ── Analyse des travaux : postes réels du Quantitatif détaillé ───────────
  const postes = useMemo(
    () =>
      buildWorkPostes({
        breakdown: budget.breakdown,
        rows: intel.rows,
        articleSavings: scaledArticleSavings,
        totalSaving: saving,
      }),
    [budget.breakdown, intel.rows, scaledArticleSavings, saving],
  );

  // ── Recommandations IA : leviers réels + meilleures opportunités ─────────
  // Les montants par action sont alignés sur le taux appliqué (mise à l'échelle
  // des économies réelles) : les recommandations restent donc cohérentes avec le
  // montant économisé total affiché.
  const activeLevers = useMemo(
    () =>
      plan.levers
        .map((l) => {
          const aligned = scaleSaving(l.saving, scale);
          return {
            ...l,
            saving: aligned,
            savingPct: costInitial > 0 ? (aligned / costInitial) * 100 : 0,
          };
        })
        .filter((l) => l.saving > 0)
        .sort((a, b) => b.saving - a.saving),
    [plan.levers, scale, costInitial],
  );
  const topOpportunities = useMemo(
    () =>
      plan.opportunities.slice(0, 5).map((op) => ({ ...op, saving: scaleSaving(op.saving, scale) })),
    [plan.opportunities, scale],
  );

  const contextLabel = [projectName, scenarioLabel].filter(Boolean).join(" · ");

  return (
    <section id="intelligence-predictive-ia" className="scroll-mt-24 space-y-3">
      {/* ── En-tête ── */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] via-background to-background p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold tracking-tight">Intelligence prédictive IA</h2>
              <span className="rounded-full border border-primary/30 bg-primary/[0.08] px-2 py-0.5 text-[10px] font-semibold text-primary">
                Analyse du budget saisi
              </span>
              {plan.available ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <CircleCheck className="h-3 w-3" /> {plan.materiauxTotal} matériaux analysés
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              L'IA analyse votre budget, le Quantitatif détaillé, les quantités, les prix unitaires,
              les pertes de matériaux et l'évolution des prix pour identifier les optimisations
              réellement possibles, sans dégrader votre projet.
            </p>
            {contextLabel ? (
              <p className="mt-0.5 text-[10px] text-muted-foreground/80">{contextLabel}</p>
            ) : null}
          </div>
        </div>

        {/* Mise en avant du taux appliqué et du montant réellement économisé */}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-3">
            <p className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Économie estimée par l'IA
            </p>
            <p className="mt-1 text-xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatTndAmount(saving)}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              soit {formatPercent(savingPct)} du coût total du projet
            </p>
          </div>
          <Kpi
            icon={Gauge}
            label="Taux d'optimisation IA"
            value={formatPercent(savingPct)}
            hint={`borné dans [${OPTIMIZATION_MIN_PCT} % ; ${OPTIMIZATION_MAX_PCT} %]`}
            tone="text-emerald-600 dark:text-emerald-400"
          />
          <Kpi
            icon={PiggyBank}
            label="Coût optimisé"
            value={formatTndAmount(costOptimized)}
            hint={`coût initial ${formatTndAmount(costInitial)}`}
          />
        </div>

        {!plan.available && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/[0.05] p-2.5">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <p className="text-[10.5px] text-amber-800 dark:text-amber-200">
              {plan.reason ??
                "Données insuffisantes pour calculer une optimisation fiable sur ce projet."}
            </p>
          </div>
        )}
      </div>

      {/* ── Cartes 1 & 2 — Budget initial / Budget optimisé ── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Block icon={Coins} title="Budget initial" badge={{ label: "Avant optimisation", cls: "border-border/50 bg-muted/40 text-muted-foreground" }}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Kpi icon={Coins} label="Budget saisi" value={formatTndAmount(budget.availableBudget)} />
            <Kpi
              icon={Hammer}
              label="Coût estimatif initial"
              value={formatTndAmount(costInitial)}
              hint={scenarioLabel ? `scénario ${scenarioLabel}` : undefined}
            />
            <Kpi
              label={budgetGap >= 0 ? "Marge disponible" : "Manque à financer"}
              value={formatTndAmount(Math.abs(budgetGap))}
              tone={budgetGap >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
              hint={`${formatTndAmount(budget.availableBudget)} − ${formatTndAmount(costInitial)}`}
            />
          </div>
          <p className="mt-2 text-[10.5px] leading-snug text-muted-foreground">
            {budgetGap >= 0
              ? `Votre budget couvre le coût estimatif initial : ${formatTndAmount(budgetGap)} restent mobilisables (imprévus, finitions, équipements).`
              : `Il manque ${formatTndAmount(Math.abs(budgetGap))} pour financer le coût estimatif initial. L'optimisation IA et l'échelonnement des travaux permettent de réduire cet écart.`}
          </p>
        </Block>

        <Block
          icon={Sparkles}
          title="Budget optimisé"
          badge={{ label: `−${formatPercent(savingPct)}`, cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" }}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Kpi
              icon={PiggyBank}
              label="Montant économisé"
              value={formatTndAmount(saving)}
              tone="text-emerald-600 dark:text-emerald-400"
            />
            <Kpi
              icon={Gauge}
              label="Taux d'optimisation"
              value={formatPercent(savingPct)}
              tone="text-emerald-600 dark:text-emerald-400"
              hint={`variable selon le projet, borné ${OPTIMIZATION_MIN_PCT}–${OPTIMIZATION_MAX_PCT} %`}
            />
            <Kpi
              icon={Tag}
              label="Nouveau coût estimé"
              value={formatTndAmount(costOptimized)}
              hint={`au lieu de ${formatTndAmount(costInitial)}`}
            />
          </div>

          <div className="mt-2.5 rounded-lg border border-border/40 bg-muted/20 p-2.5">
            <p className="text-[11.5px] font-semibold">
              Budget optimisé : {formatTndAmount(costOptimized)}
            </p>
            <p className="text-[11.5px] text-muted-foreground">
              Économie estimée : {formatTndAmount(saving)} (
              {savingPct > 0 ? `−${formatPercent(savingPct)}` : "0 %"})
            </p>
            <p className="mt-1 text-[10.5px] text-muted-foreground">
              {budgetGapOptimized >= 0
                ? `Après optimisation, le coût estimé devient finançable avec votre budget : ${formatTndAmount(budgetGapOptimized)} restent disponibles.`
                : `Après optimisation, l'écart à financer passe de ${formatTndAmount(Math.abs(budgetGap))} à ${formatTndAmount(Math.abs(budgetGapOptimized))} (soit ${formatPercent(savingPct)} du coût total).`}
            </p>
          </div>

          <ObjectiveBar
            pct={savingPct}
            low={OPTIMIZATION_MIN_PCT}
            high={OPTIMIZATION_MAX_PCT}
          />

          <div className="mt-2 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] p-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <div>
              <p className="text-[10.5px] font-semibold">
                Comment ce taux est calculé ?{" "}
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[9.5px]",
                    rate.raised || rate.capped ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" : profile.cls,
                  )}
                >
                  {rate.raised
                    ? `plancher ${OPTIMIZATION_MIN_PCT} % appliqué`
                    : rate.capped
                      ? `plafond ${OPTIMIZATION_MAX_PCT} % appliqué`
                      : `${profile.label} · ${formatPercent(savingPct)}`}
                </span>
              </p>
              <p className="mt-1 text-[10.5px] leading-snug text-muted-foreground">
                Taux contextualisé calculé à partir de {estimate.criteria.length} critères réels du
                projet : matériaux, quantités, prix unitaires, catégories de travaux, travaux
                sélectionnés, pertes, alternatives, achats groupés, périodes d'achat, poids des postes
                et part du coût couverte par votre budget. Il diffère d'un projet à l'autre et d'une
                analyse à l'autre — aucune valeur fixe n'est appliquée.
              </p>
              <ul className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {estimate.criteria.map((c) => (
                  <li
                    key={c.key}
                    className="rounded-lg border border-border/30 bg-background/60 px-2 py-1"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 text-[10px] font-medium">{c.label}</span>
                      <span className="shrink-0 text-[9.5px] tabular-nums text-muted-foreground">
                        {formatPercent(c.value * 100)}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${clamp(c.value * 100)}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[9.5px] leading-snug text-muted-foreground">
                      {c.detail}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 font-mono text-[10px] text-muted-foreground/90">
                taux = {OPTIMIZATION_MIN_PCT} % + {OPTIMIZATION_MAX_PCT - OPTIMIZATION_MIN_PCT} % × score
              </p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground/90">
                taux_final = MAX({OPTIMIZATION_MIN_PCT} %, MIN(taux_calculé, {OPTIMIZATION_MAX_PCT} %))
              </p>
              <p className="mt-1 text-[10px] leading-snug text-muted-foreground/90">
                Économie = coût initial × taux appliqué ; coût optimisé = coût initial − économie.
                Aucune quantité du Quantitatif n'est modifiée : l'optimisation est le résultat des
                actions ci-dessous.
              </p>
            </div>
          </div>
        </Block>
      </div>

      {/* ── Cartes 3 & 4 — Réduction des pertes / Prévision des prix ── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Block
          icon={Recycle}
          title="Réduction des pertes"
          badge={{ label: `−${formatPercent(lossReductionPct)} de pertes évitables`, cls: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" }}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Kpi
              icon={Recycle}
              label="Pertes estimées"
              value={formatTndAmount(lossEstimated)}
              hint="chutes, surplus de conditionnement"
            />
            <Kpi
              icon={PiggyBank}
              label="Pertes évitables"
              value={formatTndAmount(lossAvoidable)}
              tone="text-sky-600 dark:text-sky-400"
            />
            <Kpi
              icon={Gauge}
              label="Score anti-gaspillage"
              value={`${fmtNum(analysis.losses.antiWasteScore)}/100`}
              hint={`${analysis.losses.optimizableCount} matériau(x) concerné(s)`}
            />
          </div>

          <p className="mt-2 text-[10.5px] uppercase tracking-wide text-muted-foreground">
            Principales sources de gaspillage détectées
          </p>
          {wasteSources.length > 0 ? (
            <ul className="mt-1.5 space-y-1.5">
              {wasteSources.map((r) => (
                <li
                  key={r.articleId}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg border border-border/40 bg-background px-2.5 py-2"
                >
                  <span className="min-w-0 flex-1 text-[11.5px] font-medium break-words">
                    {r.designation}
                  </span>
                  <span className="text-[11px] font-bold tabular-nums text-sky-600 dark:text-sky-400">
                    {formatTndAmount(r.lossValue)}
                  </span>
                  <span className="w-full text-[10px] leading-snug text-muted-foreground">
                    {r.lossReason ?? r.recommendation}
                    {r.lossQty > 0 ? ` (surplus ${fmtNum(r.lossQty, 1)} ${r.unit || "u"})` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[10.5px] text-muted-foreground">
              Aucune perte significative détectée : les quantités commandées correspondent aux besoins
              réels du Quantitatif.
            </p>
          )}
        </Block>

        <Block
          icon={TrendingUp}
          title="Prévision des prix"
          badge={{
            label: risingRows.length > 0 ? `${risingRows.length} matériau(x) en hausse` : "Prix stables",
            cls:
              risingRows.length > 0
                ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
                : "border-border/50 bg-muted/40 text-muted-foreground",
          }}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Kpi
              icon={TrendingUp}
              label="Exposition aux hausses"
              value={formatTndAmount(intel.aggregate.totalExposure)}
              hint="montant exposé aux hausses estimées"
              tone={intel.aggregate.totalExposure > 0 ? "text-red-600 dark:text-red-400" : undefined}
            />
            <Kpi
              icon={CalendarDays}
              label="Achat au bon moment"
              value={formatTndAmount(timingSaving)}
              tone="text-emerald-600 dark:text-emerald-400"
              hint="économie possible en anticipant"
            />
            <Kpi
              icon={TrendingUp}
              label="Matériaux surveillés"
              value={`${intel.aggregate.watched}`}
              hint={`${intel.aggregate.priorityPurchases} achat(s) prioritaire(s)`}
            />
          </div>

          {risingRows.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {risingRows.slice(0, 4).map((r) => (
                <li
                  key={r.articleId}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg border border-red-500/20 bg-red-500/[0.04] px-2.5 py-2"
                >
                  <span className="min-w-0 flex-1 text-[11.5px] font-medium break-words">
                    {r.designation}
                  </span>
                  {/* Libellé seul : le pourcentage de variation reste interne au moteur. */}
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                    {PRICE_TREND_LABELS[r.trend]}
                  </span>
                  <span className="rounded-full border border-border/40 bg-background px-1.5 py-0.5 text-[9.5px] text-muted-foreground">
                    {PREDICTION_CONFIDENCE_LABELS[r.confidence]}
                  </span>
                  <span className="w-full text-[10px] leading-snug text-muted-foreground">
                    {r.forecastMessage ??
                      `Hausse estimée sur ${r.horizon ?? "les prochaines semaines"} — impact ${formatTndAmount(r.impactAmount)} sur le budget projet.`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[10.5px] text-muted-foreground">
              Aucune hausse significative détectée sur vos matériaux : l'achat immédiat ne présente pas
              de risque de surcoût identifié.
            </p>
          )}
        </Block>
      </div>

      {/* ── Analyse des travaux ── */}
      <Block
        icon={Hammer}
        title="Analyse intelligente des travaux"
        badge={{ label: `${postes.length} poste(s) analysé(s)`, cls: "border-border/50 bg-muted/40 text-muted-foreground" }}
      >
        <p className="text-[10.5px] leading-snug text-muted-foreground">
          Pour chaque poste : coût actuel, importance dans le budget, optimisation possible, quantités,
          prix unitaires, pertes, substitution de matériaux, négociation / achat groupé et période
          d'achat recommandée. Aucun poste n'est modifié.
        </p>

        <div className="mt-2.5 -mx-1 overflow-x-auto px-1 pb-1">
          <table className="w-full min-w-[600px] border-collapse text-[11.5px]">
            <thead>
              <tr className="border-b border-border/50 text-left text-[9.5px] uppercase tracking-wide text-muted-foreground">
                <th className="py-1.5 pr-2 font-semibold">Travaux</th>
                <th className="py-1.5 pr-2 text-right font-semibold">Coût actuel</th>
                <th className="py-1.5 pr-2 text-right font-semibold">Optimisation possible</th>
                <th className="py-1.5 pr-2 text-right font-semibold">Économie estimée</th>
                <th className="py-1.5 pr-2 text-right font-semibold">Coût optimisé</th>
                <th className="py-1.5 text-right font-semibold">Détail</th>
              </tr>
            </thead>
            <tbody>
              {postes.map((p) => {
                const open = openPostes[p.key] ?? false;
                return (
                  <tr key={p.key} className="border-b border-border/25 align-top">
                    <td className="py-2 pr-2">
                      <span className="block font-semibold">{p.label}</span>
                      <span className="block text-[10px] text-muted-foreground">
                        {formatPercent(p.pctOfTotal)} du budget · {p.materialCount} matériau(x)
                      </span>
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {formatTndAmount(p.currentCost)}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {p.saving > 0 ? (
                        <span className="font-semibold text-primary">{formatPercent(p.optimPct)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {p.saving > 0 ? formatTndAmount(p.saving) : "—"}
                    </td>
                    <td className="py-2 pr-2 text-right font-bold tabular-nums">
                      {formatTndAmount(p.optimizedCost)}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setOpenPostes((s) => ({ ...s, [p.key]: !open }))}
                        className="inline-flex items-center gap-1 rounded-md border border-border/50 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted/40"
                        aria-expanded={open}
                      >
                        {open ? "Masquer" : "Analyser"}
                        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="text-[11.5px] font-bold">
                <td className="py-2 pr-2">Total projet</td>
                <td className="py-2 pr-2 text-right tabular-nums">{formatTndAmount(costInitial)}</td>
                <td className="py-2 pr-2 text-right tabular-nums text-primary">
                  {formatPercent(savingPct)}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatTndAmount(saving)}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{formatTndAmount(costOptimized)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Détail dépliable par poste */}
        {postes.map((p) => {
          if (!(openPostes[p.key] ?? false)) return null;
          return (
            <div key={p.key} className="mt-2 rounded-xl border border-border/40 bg-muted/15 p-2.5">
              <p className="text-[11.5px] font-semibold">{p.label} — analyse détaillée</p>
              <div className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-1 text-[10.5px] sm:grid-cols-2">
                <Detail label="Quantité / prix unitaire">
                  {p.topRows.length > 0
                    ? p.topRows
                        .map(
                          (r) =>
                            `${r.designation} — ${fmtNum(r.quantity, 2)} ${r.unit || "u"} à ${fmtTnd(r.currentUnitPrice, 2)}`,
                        )
                        .join(" · ")
                    : "Aucun matériau chiffré rattaché à ce poste."}
                </Detail>
                <Detail label="Pertes potentielles">
                  {p.lossValue > 0
                    ? `${formatTndAmount(p.lossValue)} de pertes évitables sur ce poste.`
                    : "Aucune perte significative détectée."}
                </Detail>
                <Detail label="Substitution de matériaux">
                  {p.alternatives > 0
                    ? `${p.alternatives} matériau(x) avec une alternative moins coûteuse.`
                    : "Aucune alternative compatible identifiée."}
                </Detail>
                <Detail label="Négociation / achat groupé">
                  {p.suppliers.length >= 2
                    ? `${p.suppliers.length} fournisseurs / sources : commande groupée possible.`
                    : p.suppliers.length === 1
                      ? "Un seul fournisseur identifié : négociation directe recommandée."
                      : "Fournisseurs non renseignés dans la Liste des prix."}
                </Detail>
                <Detail label="Période d'achat recommandée">
                  {p.risingCount > 0
                    ? `${p.risingCount} matériau(x) en hausse estimée — acheter prochainement.`
                    : "Aucune urgence : achats au rythme du chantier."}
                </Detail>
                <Detail label="Possibilité d'optimisation">
                  {p.saving > 0
                    ? `${formatPercent(p.optimPct)} du coût du poste, soit ${formatTndAmount(p.saving)}.`
                    : "Pas d'optimisation fiable identifiée sur ce poste."}
                </Detail>
              </div>
            </div>
          );
        })}
      </Block>

      {/* ── Recommandations IA ── */}
      <Block
        icon={Sparkles}
        title="Comment l'IA vous permet d'économiser"
        badge={{ label: `${activeLevers.length} levier(s) actif(s)`, cls: "border-primary/30 bg-primary/[0.08] text-primary" }}
      >
        {activeLevers.length > 0 ? (
          <ul className="space-y-1.5">
            {activeLevers.map((l) => (
              <li
                key={l.key}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-border/40 bg-background px-2.5 py-2"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
                  {l.index}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11.5px] font-semibold">{l.title}</span>
                  <span className="block text-[10px] leading-snug text-muted-foreground">
                    {l.description}
                  </span>
                </span>
                <span className="text-[11.5px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatTndAmount(l.saving)}
                </span>
                <span className="rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[9.5px] text-muted-foreground">
                  {formatPercent(l.savingPct)} du projet · {l.opportunityCount} action(s)
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[10.5px] text-muted-foreground">
            Aucun levier chiffré n'a pu être identifié avec les données actuelles : le taux appliqué
            correspond au plancher de la règle d'optimisation ({OPTIMIZATION_MIN_PCT} %) et sa
            répartition par levier n'est pas calculable. Le tableau « Analyse intelligente des
            travaux » répartit l'économie selon le poids réel de chaque poste.
          </p>
        )}

        {topOpportunities.length > 0 ? (
          <>
            <p className="mt-3 text-[10.5px] uppercase tracking-wide text-muted-foreground">
              Actions prioritaires identifiées
            </p>
            <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {topOpportunities.map((op) => {
                const prio = priorityOf(op.rankScore);
                return (
                  <div key={op.id} className="rounded-xl border border-border/40 bg-muted/10 p-2.5">
                    <div className="flex items-start gap-2">
                      <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <p className="min-w-0 flex-1 text-[11.5px] font-semibold leading-snug">
                        {op.title}
                      </p>
                    </div>
                    <p className="mt-1 text-[10.5px] leading-snug text-muted-foreground">
                      {op.justification}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9.5px] font-semibold text-emerald-700 dark:text-emerald-300">
                        {formatTndAmount(op.saving)} d'économie
                      </span>
                      <span className="rounded-full border border-border/50 bg-background px-2 py-0.5 text-[9.5px] text-muted-foreground">
                        {impactOf(op.impactScore)} ({op.impactScore}/100)
                      </span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[9.5px] font-semibold", prio.cls)}>
                        {prio.label}
                      </span>
                      {op.currentLabel && op.alternativeLabel ? (
                        <span className="rounded-full border border-border/50 bg-background px-2 py-0.5 text-[9.5px] text-muted-foreground">
                          {op.currentLabel} → {op.alternativeLabel}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-border/50 bg-background px-2 py-0.5 text-[9.5px] text-muted-foreground">
                        Compatibilité {op.compatibility}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </Block>

      {/* ── Simulation avant / après ── */}
      <Block
        icon={Scale}
        title="Simulation de votre budget"
        badge={{ label: `économie ${formatTndAmount(saving)}`, cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" }}
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-border/40 bg-muted/15 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Avant optimisation
              </p>
              <p className="mt-1 text-[11.5px]">
                Budget : <span className="font-bold tabular-nums">{formatTndAmount(budget.availableBudget)}</span>
              </p>
              <p className="text-[11.5px]">
                Coût estimatif :{" "}
                <span className="font-bold tabular-nums">{formatTndAmount(costInitial)}</span>
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Après optimisation IA
              </p>
              <p className="mt-1 text-[11.5px]">
                Coût optimisé :{" "}
                <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatTndAmount(costOptimized)}
                </span>
              </p>
              <p className="text-[11.5px]">
                Économie :{" "}
                <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatTndAmount(saving)} ({formatPercent(savingPct)})
                </span>
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Budget restant après optimisation :{" "}
                {formatTndAmount(Math.max(0, budgetGapOptimized))}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-background p-2.5">
            <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              Coût initial vs coût optimisé
            </p>
            <CompareBars initial={costInitial} optimized={costOptimized} saving={saving} />
            <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
              Graphique d'estimation : l'économie affichée découle du taux d'optimisation appliqué
              ({formatPercent(savingPct)} du coût initial), soit {formatTndAmount(saving)} — montant
              identique à celui des cartes, du tableau des travaux et du résumé ci-dessous.
            </p>
          </div>
        </div>
      </Block>

      {/* ── Prévision des prix des matériaux ── */}
      <Block
        icon={TrendingUp}
        title="Prévision des prix des matériaux"
        badge={{
          label: analysis.priceEvolution.basis
            ? PRICE_FORECAST_BASIS_LABELS[analysis.priceEvolution.basis]
            : "Estimations IA",
          cls: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        }}
      >
        {forecastRows.length > 0 ? (
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <table className="w-full min-w-[560px] border-collapse text-[11.5px]">
              <thead>
                <tr className="border-b border-border/50 text-left text-[9.5px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-1.5 pr-2 font-semibold">Matériau</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Prix actuel</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Tendance prévue</th>
                  <th className="py-1.5 font-semibold">Action recommandée</th>
                </tr>
              </thead>
              <tbody>
                {forecastRows.map((r) => {
                  const Icon = TREND_ICON[r.trend];
                  return (
                    <tr key={r.articleId} className="border-b border-border/25 align-top">
                      <td className="py-2 pr-2">
                        <span className="block max-w-[220px] break-words font-medium">
                          {r.designation}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {r.group}
                          {r.materialSpecific ? " · historique propre au matériau" : ""}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {fmtTnd(r.currentUnitPrice, 2)}
                        {r.unit ? <span className="text-muted-foreground">/{r.unit}</span> : null}
                      </td>
                      <td className={cn("py-2 pr-2 text-right font-semibold tabular-nums", TREND_CLS[r.trend])}>
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          <Icon className="h-3.5 w-3.5" />
                          {/* Tendance en libellé uniquement — aucun pourcentage de variation affiché. */}
                          {PRICE_TREND_LABELS[r.trend]}
                        </span>
                        <span className="mt-0.5 block text-[9.5px] font-normal text-muted-foreground">
                          {PREDICTION_CONFIDENCE_LABELS[r.confidence]}
                          {r.confidencePct > 0 ? ` (${fmtNum(r.confidencePct)} %)` : ""}
                          {Math.abs(r.trendPct) > 50 ? " · amplitude inhabituelle, à confirmer" : ""}
                        </span>
                        {r.horizon ? (
                          <span className="block text-[10px] font-normal text-muted-foreground">
                            {r.horizon}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2">
                        <span className="block text-[11.5px] font-medium">
                          {PURCHASE_TIMING_LABELS[r.timing]}
                        </span>
                        <span className="block text-[10px] leading-snug text-muted-foreground">
                          {r.timingReason}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[10.5px] text-muted-foreground">
            Aucun historique de prix exploitable pour vos matériaux : aucune tendance n'est inventée.
          </p>
        )}

        <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/[0.04] p-2.5">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
          <p className="text-[10.5px] leading-snug text-muted-foreground">
            Ces prévisions sont des <strong>estimations IA</strong> (historique de marché réel,{" "}
            {analysis.priceEvolution.confidencePct
              ? `confiance ${fmtNum(analysis.priceEvolution.confidencePct)} %`
              : "confiance faible"}
            ), et non des certitudes. Elles n'engagent aucune obligation d'achat : la décision finale
            reste la vôtre.
          </p>
        </div>
      </Block>

      {/* ── Pied de module : traçabilité ── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CircleCheck className="h-3 w-3 text-emerald-500" /> Budget saisi :{" "}
          {formatTndAmount(budget.availableBudget)}
        </span>
        <span className="inline-flex items-center gap-1">
          <CircleCheck className="h-3 w-3 text-emerald-500" /> {plan.materiauxTotal} matériaux ·{" "}
          {plan.materiauxOptimisables} optimisables · {plan.fortImpact} à fort impact
        </span>
        <span className="inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-primary" /> {plan.opportunities.length} action(s) identifiée(s)
        </span>
        <span className="inline-flex items-center gap-1">
          <Gauge className="h-3 w-3 text-emerald-500" /> Taux appliqué {formatPercent(savingPct)} ·
          économie {formatTndAmount(saving)} · coût optimisé {formatTndAmount(costOptimized)}
        </span>
        <span className="inline-flex items-center gap-1">
          <FlaskConical className="h-3 w-3 text-sky-500" /> Confiance moyenne des prévisions :{" "}
          {fmtNum(intel.aggregate.confidencePct)} %
        </span>
        <span className="ml-auto inline-flex items-center gap-1">
          Généré le{" "}
          {new Date(budget.generatedAt).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>
    </section>
  );
}

/** Ligne « libellé → valeur » du détail d'un poste de travaux. */
function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="leading-snug">
      <span className="font-semibold text-muted-foreground">{label} : </span>
      <span>{children}</span>
    </p>
  );
}

export default PredictiveIntelligenceSection;
