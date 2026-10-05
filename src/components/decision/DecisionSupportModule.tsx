// ============================================================================
// AIDE À LA DÉCISION — module « Intelligence prédictive IA »
// ----------------------------------------------------------------------------
// Copilote financier & achats du projet. Le module est affiché sur la page
// DÉDIÉE « Aide à la décision » (étape n°2 du parcours groupe A) : il a été
// retiré de la page de résultat « Coût estimatif ».
//
// • Déclenchement automatique : dès que les résultats du coût sont disponibles,
//   l'analyse se prépare (état de chargement élégant) puis s'affiche.
// • Données réelles uniquement : les prévisions proviennent du moteur partagé
//   `predictiveIntelligence` (historique marché réel, sinon comparaison réelle
//   des scénarios Économique / Standard / Premium). Aucun prix inventé — sans
//   donnée exploitable, on affiche « Données insuffisantes… ».
// • L'analyse est MÉMORISÉE (signature des versions quantitatif / prix /
//   scénario) : elle n'est pas recalculée à chaque affichage ; si une donnée
//   importante change, l'utilisateur est invité à la relancer.
// • Réservé au forfait Client Pro : un état verrouillé élégant s'affiche pour
//   les autres profils, et aucun calcul IA avancé n'est alors lancé.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { useQuery } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Bell,
  BrainCircuit,
  Calculator,
  CalendarClock,
  ChevronDown,
  CircleCheck,
  Clock3,
  Coins,
  CreditCard,
  Filter,
  FlaskConical,
  Gauge,
  Info,
  Layers,
  Lightbulb,
  ListOrdered,
  Loader2,
  Lock,
  Minus,
  PackageOpen,
  Percent,
  PiggyBank,
  Recycle,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Siren,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Wallet,
  Zap,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { predictiveIntelligence } from "@/convex/materialSelectionEngine";
import {
  buildMaterialIntelligence,
  type CategoryTrendRow,
  type MaterialTrendRow,
  type PriceListRow,
  type SupplierMatch,
} from "@/lib/materialIntelligence";
import { MaterialAnalysisSection } from "@/components/decision/MaterialAnalysisSection";
import {
  buildDecisionAnalysis,
  buildSimulations,
  groupsPresent,
  materialGroup,
  scoreBand,
  PREDICTION_CONFIDENCE_LABELS,
  PRICE_FORECAST_BASIS_LABELS,
  PRICE_TREND_LABELS,
  PURCHASE_TIMING_LABELS,
  type AlertLevel,
  type DecisionAlert,
  type DecisionAnalysis,
  type DecisionScorePart,
  type PurchasePriorityRow,
  type ScoreTone,
  type SimulationResult,
} from "@/lib/decisionAnalysis";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatTnd } from "@/lib/utils";

// ── Charte visuelle (couleurs + texte + icône, jamais la couleur seule) ────
const TONE_TEXT: Record<ScoreTone, string> = {
  excellent: "text-emerald-600 dark:text-emerald-400",
  bon: "text-sky-600 dark:text-sky-400",
  surveiller: "text-amber-600 dark:text-amber-400",
  risque: "text-red-600 dark:text-red-400",
};
const TONE_CHIP: Record<ScoreTone, string> = {
  excellent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  bon: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  surveiller: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  risque: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};
const TONE_STROKE: Record<ScoreTone, string> = {
  excellent: "#10b981",
  bon: "#0ea5e9",
  surveiller: "#f59e0b",
  risque: "#ef4444",
};

const SCORE_ICONS: Record<DecisionScorePart["key"], typeof TrendingUp> = {
  prices: TrendingUp,
  budget: Wallet,
  materials: Layers,
  losses: Recycle,
  purchase: ShoppingCart,
};

const ALERT_META: Record<
  AlertLevel,
  { icon: typeof Siren; ring: string; chip: string; dot: string }
> = {
  hausse: {
    icon: Siren,
    ring: "border-red-500/30 bg-red-500/[0.05]",
    chip: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    dot: "bg-red-500",
  },
  budget: {
    icon: ShieldAlert,
    ring: "border-amber-500/30 bg-amber-500/[0.05]",
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  opportunite: {
    icon: CircleCheck,
    ring: "border-emerald-500/30 bg-emerald-500/[0.05]",
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  optimisation: {
    icon: Lightbulb,
    ring: "border-sky-500/30 bg-sky-500/[0.05]",
    chip: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
  },
};

// ── Briques d'interface ────────────────────────────────────────────────────

function ToneBadge({ label, tone }: { label: string; tone: ScoreTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        TONE_CHIP[tone],
      )}
    >
      {label}
    </span>
  );
}

function TrendBadge({ trend, pct }: { trend: "hausse" | "baisse" | "stable"; pct?: number }) {
  const map = {
    hausse: {
      icon: TrendingUp,
      cls: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    },
    baisse: {
      icon: TrendingDown,
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    stable: {
      icon: Minus,
      cls: "border-border/50 bg-muted/40 text-muted-foreground",
    },
  } as const;
  const Icon = map[trend].icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        map[trend].cls,
      )}
    >
      <Icon className="h-3 w-3" />
      {PRICE_TREND_LABELS[trend]}
      {typeof pct === "number" && pct !== 0 && (
        <span className="tabular-nums">
          {pct > 0 ? "+" : ""}
          {pct.toLocaleString("fr-FR")} %
        </span>
      )}
    </span>
  );
}

function ScoreRing({
  value,
  tone,
  size = 132,
  thickness = 11,
}: {
  value: number;
  tone: ScoreTone;
  size?: number;
  thickness?: number;
}) {
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={thickness}
          className="text-muted/40"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={TONE_STROKE[tone]}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dash}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-2xl font-black tabular-nums leading-none", TONE_TEXT[tone])}>
          {Math.round(value)}
        </span>
        <span className="text-[9px] font-medium text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function SoftBar({ value, tone }: { value: number; tone: ScoreTone }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ backgroundColor: TONE_STROKE[tone] }}
      />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  title,
  value,
  sub,
  accent = "text-primary",
  bg = "bg-primary/10",
  children,
}: {
  icon: typeof Gauge;
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
  bg?: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card p-3 shadow-sm"
    >
      <div className="flex items-start gap-2">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", bg, accent)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <div className="mt-0.5 text-sm font-bold leading-tight">{value}</div>
        </div>
      </div>
      {sub && <div className="mt-2 text-[10.5px] leading-snug text-muted-foreground">{sub}</div>}
      {children}
    </motion.div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Gauge;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Chargement élégant (Skeleton) ───────────────────────────────────────────

function DecisionLoading() {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border bg-gradient-to-br from-primary/[0.06] to-background p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <div>
            <p className="text-sm font-semibold">Analyse prédictive en cours…</p>
            <p className="text-[11px] text-muted-foreground">
              L'IA analyse les prix, le budget, les quantités et les opportunités d'achat de votre projet.
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}

// ── État verrouillé (hors forfait Client Pro) ───────────────────────────────

function DecisionLocked() {
  return (
    <Card className="border border-border/40 bg-background/60">
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Lock className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-bold">
            🔒 Intelligence prédictive
          </h3>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Disponible avec le forfait Client Pro.
          </p>
        </div>
        <Button className="mt-1 gap-1.5" onClick={() => (window.location.href = "/dashboard/pricing")}>
          <CreditCard className="h-4 w-4" />
          Voir les offres
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Module principal ────────────────────────────────────────────────────────

export interface DecisionSupportModuleProps {
  projectId: string;
  projectName?: string;
  projectTypeLabel?: string;
  regionLabel?: string;
  surface?: number;
  /** Coût total du scénario retenu — même valeur que « Coût estimatif ». */
  projectTotal: number;
  /** Libellé du scénario retenu (Économique / Standard / Premium / Personnalisé). */
  scenarioLabel: string;
}

export function DecisionSupportModule({
  projectId,
  projectName,
  projectTypeLabel,
  regionLabel,
  surface,
  projectTotal,
  scenarioLabel,
}: DecisionSupportModuleProps) {
  const { hash } = useLocation();
  const access = useQuery(api.access.checkClientProAccess);
  const allowed = access?.allowed === true;

  const workspaceQuery = useQuery(
    api.materialSelections.getMaterialsWorkspace,
    allowed ? { projectId: projectId as Id<"projects"> } : "skip",
  );
  const trends = useQuery(api.marketData.getPriceTrends, allowed ? {} : "skip");
  // ── Source principale : la « Liste des prix » + l'historique PAR MATÉRIAU ──
  const priceList = useQuery(api.materials.getMaterialPrices, allowed ? {} : "skip");
  const materialTrends = useQuery(api.marketData.getMaterialPriceTrends, allowed ? {} : "skip");
  const supplierNames = useMemo<string[]>(() => {
    const ws = workspaceQuery?.workspace;
    if (!ws) return [];
    const set = new Set<string>();
    for (const l of ws.lines) set.add(l.catalogName || l.designation);
    return Array.from(set).filter(Boolean).slice(0, 150);
  }, [workspaceQuery]);
  const suppliers = useQuery(
    api.marketData.getCheapestSuppliers,
    allowed && supplierNames.length > 0 ? { names: supplierNames } : "skip",
  );

  // ── Défilement vers le module lorsqu'on suit le Journey (ancre) ──────────
  useEffect(() => {
    if (hash !== "#aide-a-la-decision") return;
    const el = document.getElementById("aide-a-la-decision");
    requestAnimationFrame(() => el?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [hash]);

  // ── Intelligence prédictive (moteur partagé, données réelles) ────────────
  const intelligence = useMemo(() => {
    if (!allowed || !workspaceQuery) return null;
    const ws = workspaceQuery.workspace;
    return predictiveIntelligence({
      lines: ws.lines,
      selections: workspaceQuery.saved?.entries ?? null,
      variants: ws.variants,
      scenario: ws.scenario,
      materialsBudget: ws.budget.materialsBudget,
      marketTrends: trends ?? null,
    });
  }, [allowed, workspaceQuery, trends]);

  const analysis = useMemo<DecisionAnalysis | null>(() => {
    if (!intelligence || !workspaceQuery) return null;
    return buildDecisionAnalysis({
      intelligence,
      workspace: workspaceQuery.workspace,
      projectTotal,
      projectTypeLabel,
      scenarioLabel,
    });
  }, [intelligence, workspaceQuery, projectTotal, projectTypeLabel, scenarioLabel]);

  const simulations = useMemo<SimulationResult[]>(() => {
    if (!analysis || !workspaceQuery) return [];
    return buildSimulations({
      workspace: workspaceQuery.workspace,
      projectTotal,
      lossSaving: analysis.losses.avoidableLoss,
      budgetSaving: analysis.budget.saving,
      riseExposure: analysis.riseExposure,
    });
  }, [analysis, workspaceQuery, projectTotal]);

  const groups = useMemo(
    () => (workspaceQuery ? groupsPresent(workspaceQuery.workspace.lines) : []),
    [workspaceQuery],
  );

  // ── Analyse MATÉRIAU PAR MATÉRIAU (nouvelle logique) ─────────────────────
  // Chaque matériau du Quantitatif est croisé avec la Liste des prix et son
  // propre historique ; l'agrégation projet en découle. Aucune analyse directe
  // des catégories du Quantitatif.
  const materialIntel = useMemo(() => {
    if (!allowed || !workspaceQuery) return null;
    const ws = workspaceQuery.workspace;
    return buildMaterialIntelligence({
      lines: ws.lines,
      priceList: (priceList ?? []) as unknown as PriceListRow[],
      materialTrends: (materialTrends ?? []) as unknown as MaterialTrendRow[],
      categoryTrends: (trends ?? []) as unknown as CategoryTrendRow[],
      variants: ws.variants,
      suppliers: (suppliers ?? []) as unknown as SupplierMatch[],
      scenario: ws.scenario,
      materialsBudget: ws.budget.materialsBudget,
      projectTotal,
      lossReduction: intelligence?.lossReduction ?? null,
      budgetItems: intelligence?.budget.items ?? null,
      riskItems: intelligence?.budget.riskItems ?? null,
    });
  }, [allowed, workspaceQuery, priceList, materialTrends, trends, suppliers, intelligence, projectTotal]);

  // ── Signature des données (quantitatif / prix / scénario / marché) ───────
  const signature = useMemo(
    () =>
      workspaceQuery
        ? [
            workspaceQuery.workspace.quantitativeVersion,
            workspaceQuery.workspace.priceVersion,
            workspaceQuery.workspace.scenario,
            trends?.length ?? 0,
          ].join("|")
        : null,
    [workspaceQuery, trends],
  );

  // Analyse mémorisée : jamais relancée à chaque affichage (déclenchement auto
  // au premier rendu, puis recalcul uniquement sur action de l'utilisateur).
  const [committedSignature, setCommittedSignature] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!signature || committedSignature !== null) return;
    const t = window.setTimeout(() => setCommittedSignature(signature), 850);
    return () => window.clearTimeout(t);
  }, [signature, committedSignature]);

  const stale = signature != null && committedSignature != null && signature !== committedSignature;

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => {
      setCommittedSignature(signature);
      setRefreshing(false);
    }, 650);
  };

  const ready = allowed && workspaceQuery != null && trends != null;
  const loading = access === undefined || (allowed && (workspaceQuery === undefined || trends === undefined || committedSignature === null));

  // ── En-tête commun (toujours visible) ────────────────────────────────────
  const header = (
    <div className="rounded-2xl border bg-gradient-to-br from-primary/[0.07] via-background to-background p-4 shadow-sm">
      <div className="flex flex-wrap items-start gap-2.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BrainCircuit className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-base font-bold tracking-tight">Intelligence prédictive IA</h2>
            <Badge className="rounded-full border border-primary/25 bg-primary/10 text-[9px] text-primary">
              <Sparkles className="mr-1 h-3 w-3" />
              Aide à la décision
            </Badge>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Anticipez vos achats, maîtrisez votre budget et réduisez les pertes grâce à l'analyse prédictive.
          </p>
        </div>
      </div>
    </div>
  );

  if (access !== undefined && !allowed) {
    return (
      <section id="aide-a-la-decision" className="scroll-mt-24 space-y-3">
        {header}
        <DecisionLocked />
      </section>
    );
  }

  if (loading) {
    return (
      <section id="aide-a-la-decision" className="scroll-mt-24 space-y-3">
        {header}
        <DecisionLoading />
      </section>
    );
  }

  if (!ready || !analysis || !workspaceQuery) {
    return (
      <section id="aide-a-la-decision" className="scroll-mt-24 space-y-3">
        {header}
        <Card className="border-dashed">
          <CardContent className="flex items-start gap-2.5 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              L'analyse prédictive sera disponible dès que le Quantitatif détaillé du projet sera calculé.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  const a = analysis;

  return (
    <section id="aide-a-la-decision" className="scroll-mt-24 space-y-3">
      {header}

      {/* ── Bandeau mise à jour (§17) ── */}
      <AnimatePresence>
        {(stale || refreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-2">
              <RefreshCw className={cn("mt-0.5 h-4 w-4 shrink-0 text-amber-600", refreshing && "animate-spin")} />
              <p className="text-[11px] text-amber-800 dark:text-amber-200">
                {refreshing
                  ? "Mise à jour de l'analyse prédictive…"
                  : "Les données du projet ont changé. Mettre à jour l'analyse prédictive ?"}
              </p>
            </div>
            {!refreshing && (
              <Button size="sm" className="h-8 gap-1.5" onClick={refresh}>
                <RefreshCw className="h-3.5 w-3.5" />
                Mettre à jour
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bandeau fiabilité (§16) ── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CircleCheck className="h-3 w-3 text-emerald-500" /> Données réelles du projet
        </span>
        <span className="inline-flex items-center gap-1">
          <FlaskConical className="h-3 w-3 text-sky-500" /> Prévisions IA
          {a.priceEvolution.basis && ` (${PRICE_FORECAST_BASIS_LABELS[a.priceEvolution.basis]})`}
        </span>
        <span className="inline-flex items-center gap-1">
          <Calculator className="h-3 w-3 text-amber-500" /> Estimations calculées
        </span>
        <span className="ml-auto inline-flex items-center gap-1">
          <Clock3 className="h-3 w-3" />
          Généré le{" "}
          {new Date(a.generatedAt).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>

      {!a.available && (
        <div className="flex items-start gap-2 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/[0.05] p-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-[11px] text-amber-800 dark:text-amber-200">
            {a.reason ?? "Données insuffisantes pour établir une prévision fiable."} Les analyses ci-dessous
            reposent uniquement sur les données réelles du Quantitatif du projet.
          </p>
        </div>
      )}

      {/* ── Analyse de vos matériaux — matériau par matériau (prioritaire) ── */}
      {materialIntel && <MaterialAnalysisSection intel={materialIntel} />}

      <KpiGrid analysis={a} />
      <GlobalScoreCard analysis={a} />
      <PriceEvolutionSection analysis={a} groups={groups} />
      <PurchasePeriodSection analysis={a} />
      <BudgetOptimizationSection analysis={a} />
      <LossReductionSection analysis={a} />
      <AlertsSection alerts={a.alerts} />
      <PurchasePrioritySection priorities={a.priorities} />
      <RiskMatrixSection analysis={a} />
      <SimulationSection simulations={simulations} />
      <RecommendationsSection analysis={a} projectName={projectName} regionLabel={regionLabel} surface={surface} scenarioLabel={scenarioLabel} />
    </section>
  );
}

// ── 1. Cartes KPI (§3) ──────────────────────────────────────────────────────

function KpiGrid({ analysis: a }: { analysis: DecisionAnalysis }) {
  const pe = a.priceEvolution;
  const purchase = a.purchasePeriod;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard
        icon={Activity}
        title="Évolution des prix"
        value={<TrendBadge trend={pe.trend} pct={pe.evolutionPct} />}
        sub={
          pe.forecasts.length === 0
            ? "Données insuffisantes"
            : `Horizon : ${pe.horizon} · Confiance : ${PREDICTION_CONFIDENCE_LABELS[pe.confidence]}`
        }
        accent={TONE_TEXT[pe.trend === "hausse" ? "risque" : pe.trend === "baisse" ? "excellent" : "surveiller"]}
        bg="bg-muted/40"
      />
      <KpiCard
        icon={CalendarClock}
        title="Meilleure période d'achat"
        value={purchase ? purchase.periodLabel : "—"}
        sub={
          purchase
            ? `${PURCHASE_TIMING_LABELS[purchase.timing]} · ${purchase.concerned} matériau(x)`
            : "À définir"
        }
        accent="text-primary"
      >
        {purchase && purchase.potentialSaving > 0 && (
          <p className="mt-1.5 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
            Économie potentielle : {formatTnd(purchase.potentialSaving)}
          </p>
        )}
      </KpiCard>
      <KpiCard
        icon={Wallet}
        title="Optimisation du budget"
        value={
          <span className="tabular-nums">
            {a.budget.saving > 0 ? `−${a.budget.savingPct.toLocaleString("fr-FR")} %` : "Optimisé"}
          </span>
        }
        sub={
          a.budget.saving > 0 ? (
            <>
              Budget actuel {formatTnd(a.budget.current)} → optimisé {formatTnd(a.budget.optimized)}
            </>
          ) : (
            "Aucune économie supplémentaire détectée"
          )
        }
        accent="text-emerald-600"
        bg="bg-emerald-500/10"
      />
      <KpiCard
        icon={Gauge}
        title="Risque de dépassement"
        value={
          <span className="inline-flex items-center gap-2">
            <span className={cn("tabular-nums", TONE_TEXT[a.overrunRisk.band.tone])}>
              {a.overrunRisk.score} / 100
            </span>
            <ToneBadge label={a.overrunRisk.band.label} tone={a.overrunRisk.band.tone} />
          </span>
        }
        sub={a.overrunRisk.note}
        accent={TONE_TEXT[a.overrunRisk.band.tone]}
        bg="bg-muted/40"
      >
        <div className="mt-2">
          <SoftBar value={a.overrunRisk.score} tone={a.overrunRisk.band.tone} />
        </div>
      </KpiCard>
      <KpiCard
        icon={TrendingUp}
        title="Risque de hausse matériaux"
        value={
          <span className="inline-flex items-center gap-2">
            <span className={cn("tabular-nums", TONE_TEXT[a.materialRiseRisk.band.tone])}>
              {a.materialRiseRisk.score} / 100
            </span>
            <ToneBadge label={a.materialRiseRisk.band.label} tone={a.materialRiseRisk.band.tone} />
          </span>
        }
        sub={a.materialRiseRisk.note}
        accent={TONE_TEXT[a.materialRiseRisk.band.tone]}
        bg="bg-red-500/10"
      >
        <div className="mt-2">
          <SoftBar value={a.materialRiseRisk.score} tone={a.materialRiseRisk.band.tone} />
        </div>
      </KpiCard>
      <KpiCard
        icon={Recycle}
        title="Pertes potentielles"
        value={
          <span className="tabular-nums">
            {a.losses.estimatedLoss > 0 ? formatTnd(a.losses.estimatedLoss) : "Aucune perte chiffrée"}
          </span>
        }
        sub={
          a.losses.optimizableCount > 0
            ? `${a.losses.optimizableCount} poste(s) · ${a.losses.groups.join(", ") || "—"} · économie ${formatTnd(a.losses.potentialSaving)}`
            : "Conditionnements déjà alignés sur le besoin"
        }
        accent="text-amber-600"
        bg="bg-amber-500/10"
      />
    </div>
  );
}

// ── 2. Score global IA (§4) ─────────────────────────────────────────────────

function GlobalScoreCard({ analysis: a }: { analysis: DecisionAnalysis }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="flex flex-col items-center">
          <ScoreRing value={a.globalScore} tone={a.globalBand.tone} />
          <div className="mt-2 text-center">
            <p className="text-xs font-semibold">Score d'intelligence du projet</p>
            <ToneBadge label={a.globalBand.label} tone={a.globalBand.tone} />
          </div>
        </div>
        <div className="w-full flex-1 space-y-2.5">
          {a.scoreParts.map((p) => {
            const Icon = SCORE_ICONS[p.key];
            return (
              <div key={p.key}>
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", TONE_TEXT[p.band.tone])} />
                  <span className="text-[11px] font-medium">{p.label}</span>
                  <span className={cn("ml-auto text-[11px] font-bold tabular-nums", TONE_TEXT[p.band.tone])}>
                    {p.value}/100
                  </span>
                </div>
                <div className="mt-1">
                  <SoftBar value={p.value} tone={p.band.tone} />
                </div>
                <p className="mt-0.5 text-[9.5px] text-muted-foreground">{p.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-[10px] text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        Score calculé dynamiquement à partir des données du projet — estimation indicative, jamais une certitude.
      </p>
    </div>
  );
}

// ── 3. Prévision de l'évolution des prix (§5) ───────────────────────────────

function PriceEvolutionSection({ analysis: a, groups }: { analysis: DecisionAnalysis; groups: string[] }) {
  const [filter, setFilter] = useState<string>("Tous");
  const pe = a.priceEvolution;
  const rows = useMemo(
    () => pe.forecasts.filter((f) => filter === "Tous" || groupOf(f.category) === filter),
    [pe.forecasts, filter],
  );

  // Barres Actuel → Court terme → Moyen terme (base 100).
  const bars = [
    { label: "Prix actuel", pct: 0 },
    { label: "Court terme", pct: pe.shortPct },
    { label: "Moyen terme", pct: pe.midPct },
  ].map((b) => ({ ...b, value: 100 + b.pct }));
  const maxBar = Math.max(...bars.map((b) => b.value), 100);

  if (pe.forecasts.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <SectionTitle icon={Activity} title="Prévision de l'évolution des prix" subtitle="Prix actuel → court terme → moyen terme" />
          <div className="flex items-start gap-2 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/[0.05] p-3">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-[11px] text-amber-800 dark:text-amber-200">
              Données insuffisantes pour établir une prévision fiable.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <SectionTitle
          icon={Activity}
          title="Prévision de l'évolution des prix"
          subtitle={`Tendance ${PRICE_TREND_LABELS[pe.trend]} · fiabilité ${pe.confidencePct} %`}
        />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Graphique Actuel → Court → Moyen terme */}
          <div className="rounded-xl border border-border/40 bg-muted/10 p-3">
            <div className="flex h-40 items-end justify-around gap-3">
              {bars.map((b) => {
                const h = (b.value / maxBar) * 100;
                return (
                  <div key={b.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                    <span
                      className={cn(
                        "text-[10px] font-bold tabular-nums",
                        b.pct > 0 ? "text-red-600 dark:text-red-400" : b.pct < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                      )}
                    >
                      {b.pct === 0 ? "Base" : `${b.pct > 0 ? "+" : ""}${b.pct.toLocaleString("fr-FR")} %`}
                    </span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                      className={cn(
                        "w-full max-w-[64px] rounded-t-lg",
                        b.pct > 0 ? "bg-gradient-to-t from-red-500/50 to-red-500" : b.pct < 0 ? "bg-gradient-to-t from-emerald-500/50 to-emerald-500" : "bg-gradient-to-t from-primary/40 to-primary/70",
                      )}
                    />
                    <span className="truncate text-[9.5px] text-muted-foreground">{b.label}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[9.5px] text-muted-foreground">
              Base 100 = prix actuels. Le moyen terme est une estimation calculée (extrapolation).
            </p>
          </div>

          {/* Matériaux les plus exposés */}
          <div className="rounded-xl border border-border/40 bg-muted/10 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Matériaux les plus exposés
            </p>
            {pe.exposed.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Aucun matériau en tendance haussière dans les données disponibles.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {pe.exposed.map((f) => (
                  <li key={f.articleId} className="flex items-center gap-2 text-[11px]">
                    <TrendingUp className="h-3 w-3 shrink-0 text-red-500" />
                    <span className="min-w-0 flex-1 truncate">{f.designation}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-red-600 dark:text-red-400">
                      +{f.trendPct.toLocaleString("fr-FR")} %
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Filtres par famille */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {["Tous", ...groups].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setFilter(g)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
                filter === g
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/50 bg-background text-muted-foreground hover:bg-muted/40",
              )}
            >
              {g === "Tous" ? "Tous les matériaux" : g}
            </button>
          ))}
        </div>

        {/* Tableau → cartes (responsive, aucune barre horizontale) */}
        <div className="mt-3 space-y-2">
          <div className="hidden grid-cols-[2fr_repeat(5,1fr)] gap-2 px-2 text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
            <span>Matériau</span>
            <span className="text-right">Prix actuel</span>
            <span className="text-right">Prévision</span>
            <span className="text-center">Variation</span>
            <span className="text-center">Risque</span>
            <span className="text-center">Confiance</span>
          </div>
          {rows.slice(0, 12).map((f) => {
            const forecastPrice = f.currentUnitPrice * (1 + f.trendPct / 100);
            return (
              <div
                key={f.articleId}
                className="grid grid-cols-2 gap-2 rounded-lg border border-border/40 bg-background p-2.5 sm:grid-cols-[2fr_repeat(5,1fr)] sm:items-center sm:gap-2 sm:p-2"
              >
                <div className="col-span-2 min-w-0 sm:col-span-1">
                  <p className="truncate text-[11px] font-medium">{f.designation}</p>
                  <p className="text-[9px] text-muted-foreground">{groupOf(f.category)} · {f.unit}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-muted-foreground sm:hidden">Prix actuel</p>
                  <p className="text-[11px] font-semibold tabular-nums">{f.currentUnitPrice.toLocaleString("fr-FR")}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-muted-foreground sm:hidden">Prévision</p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">{forecastPrice.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</p>
                </div>
                <div className="flex justify-start sm:justify-center">
                  <TrendBadge trend={f.trend} pct={f.trendPct} />
                </div>
                <div className="flex justify-start sm:justify-center">
                  <span className="text-[10px] text-muted-foreground">{PREDICTION_CONFIDENCE_LABELS[f.confidence]}</span>
                </div>
                <div className="flex justify-start sm:justify-center">
                  {f.trend === "hausse" ? (
                    <Siren className="h-3.5 w-3.5 text-red-500" />
                  ) : f.trend === "baisse" ? (
                    <CircleCheck className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
              </div>
            );
          })}
          {rows.length > 12 && (
            <p className="text-center text-[10px] text-muted-foreground">
              {rows.length - 12} autre(s) matériau(x) — affinez le filtre pour les consulter.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── 4. Meilleures périodes d'achat (§6) ─────────────────────────────────────

const TIMING_BADGE: Record<string, { cls: string; dot: string }> = {
  acheter_maintenant: { cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", dot: "🟢" },
  acheter_prochainement: { cls: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300", dot: "🟢" },
  attendre: { cls: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300", dot: "🔴" },
  surveiller: { cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300", dot: "🟠" },
};

function PurchasePeriodSection({ analysis: a }: { analysis: DecisionAnalysis }) {
  const p = a.purchasePeriod;
  if (!p) return null;
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <SectionTitle
          icon={CalendarClock}
          title="Quand acheter ?"
          subtitle={`Période recommandée : ${p.periodLabel} · ${p.concerned} matériau(x) concerné(s)`}
        />
        {p.potentialSaving > 0 && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <PiggyBank className="h-3.5 w-3.5" />
            Économie potentielle estimée : {formatTnd(p.potentialSaving)}
          </div>
        )}
        <div className="space-y-2">
          {p.advices.slice(0, 10).map((adv) => {
            const meta = TIMING_BADGE[adv.timing] ?? TIMING_BADGE.surveiller;
            return (
              <div key={adv.articleId} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-background p-2.5">
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{adv.designation}</span>
                <TrendBadge trend={adv.trend} pct={adv.trendPct} />
                <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", meta.cls)}>
                  <span aria-hidden>{meta.dot}</span>
                  {PURCHASE_TIMING_LABELS[adv.timing]}
                </span>
                <span className="text-[9.5px] text-muted-foreground">{PREDICTION_CONFIDENCE_LABELS[adv.confidence]}</span>
                <p className="w-full text-[10px] leading-snug text-muted-foreground">{adv.reason}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[10px] text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Ces recommandations sont des prévisions indicatives, jamais une garantie de prix.
        </p>
      </CardContent>
    </Card>
  );
}

// ── 5. Optimisation du budget (§7) ──────────────────────────────────────────

function BudgetOptimizationSection({ analysis: a }: { analysis: DecisionAnalysis }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <SectionTitle
          icon={Wallet}
          title="Comment réduire votre budget ?"
          subtitle={`Budget matériaux ${formatTnd(a.budget.current)} → ${formatTnd(a.budget.optimized)}`}
        />
        {a.budget.items.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            Aucune opportunité d'économie détectée : le scénario retenu est déjà le plus favorable parmi les scénarios disponibles.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {a.budget.items.slice(0, 8).map((item) => {
              const open = openId === item.articleId;
              return (
                <div key={item.articleId} className="rounded-xl border border-border/40 bg-background p-2.5">
                  <div className="flex items-start gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                      <Coins className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold leading-snug">Optimiser « {item.designation} »</p>
                      <p className="text-[10px] text-muted-foreground">
                        Économie potentielle : <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatTnd(item.saving)}</span>
                        {" · "}{item.savingPct.toLocaleString("fr-FR")} %
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : item.articleId)}
                    className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                  >
                    {open ? "Masquer le détail" : "Voir le détail"}
                    <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 space-y-1 border-t border-border/30 pt-2 text-[10px]">
                          <div className="flex justify-between"><span className="text-muted-foreground">Scénario actuel</span><span className="tabular-nums">{formatTnd(item.currentTotal)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Alternative proposée</span><span className="tabular-nums">{formatTnd(item.alternativeTotal)}</span></div>
                          <p className="pt-1 leading-snug text-muted-foreground">{item.note}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
        {a.budget.riskItems.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.05] p-2.5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Postes à forte part du budget
            </p>
            <ul className="space-y-1">
              {a.budget.riskItems.map((r) => (
                <li key={r.articleId} className="flex items-center gap-2 text-[10.5px]">
                  <Scale className="h-3 w-3 shrink-0 text-amber-600" />
                  <span className="min-w-0 flex-1 truncate">{r.designation}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{r.sharePct.toLocaleString("fr-FR")} %</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── 6. Réduction des pertes (§8) ────────────────────────────────────────────

function LossReductionSection({ analysis: a }: { analysis: DecisionAnalysis }) {
  const l = a.losses;
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <SectionTitle icon={Recycle} title="Réduction des pertes" subtitle="Quantités, conditionnements et marge de sécurité" />
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full text-sm font-black tabular-nums",
                TONE_CHIP[scoreToneOf(l.antiWasteScore)],
              )}
            >
              {l.antiWasteScore}
            </span>
            <div>
              <p className="text-[11px] font-semibold">Score anti-gaspillage</p>
              <p className="text-[10px] text-muted-foreground">{scoreLabelOf(l.antiWasteScore)}</p>
            </div>
          </div>
          <div className="text-[10.5px] text-muted-foreground">
            <p>Pertes estimées : <span className="font-semibold text-foreground">{formatTnd(l.estimatedLoss)}</span></p>
            <p>Évitables : <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatTnd(l.avoidableLoss)}</span></p>
          </div>
        </div>
        {l.items.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Aucune perte de matériaux identifiée sur ce projet.</p>
        ) : (
          <div className="space-y-2">
            {l.items.slice(0, 6).map((item, i) => (
              <div key={`${item.articleId}-${i}`} className="rounded-lg border border-border/40 bg-background p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <PackageOpen className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{item.designation}</span>
                  {item.surplusCost > 0 && (
                    <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                      {formatTnd(item.surplusCost)} de perte
                    </span>
                  )}
                </div>
                {item.surplusQty > 0 && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Surplus estimé : {item.surplusQty.toLocaleString("fr-FR")} {item.surplusUnit}
                  </p>
                )}
                <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{item.recommendation}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── 7. Alertes prédictives (§9) ─────────────────────────────────────────────

function AlertsSection({ alerts }: { alerts: DecisionAlert[] }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <SectionTitle icon={Bell} title="Alertes IA" subtitle={`${alerts.length} signal(aux) issu(s) de l'analyse`} />
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {alerts.map((al) => {
            const meta = ALERT_META[al.level];
            const Icon = meta.icon;
            return (
              <div key={al.id} className={cn("rounded-xl border p-2.5", meta.ring)}>
                <div className="flex items-start gap-2">
                  <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", meta.chip)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold">{al.title}</p>
                    <p className="text-[10px] leading-snug text-muted-foreground">{al.reason}</p>
                    {al.impact > 0 && (
                      <p className="mt-1 text-[10px] font-semibold text-foreground">
                        Impact financier potentiel : {formatTnd(al.impact)}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] leading-snug">
                      <span className="font-semibold">Recommandation : </span>
                      {al.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── 8. Score de priorité des achats (§10) ───────────────────────────────────

function priorityLevel(p: number): { label: string; band: ScoreTone } {
  if (p >= 70) return { label: "Élevée", band: "risque" };
  if (p >= 40) return { label: "Moyenne", band: "surveiller" };
  return { label: "Faible", band: "excellent" };
}

function PurchasePrioritySection({ priorities }: { priorities: PurchasePriorityRow[] }) {
  const [level, setLevel] = useState<"tous" | "eleve" | "moyen" | "faible">("tous");
  const rows = priorities.filter((p) => {
    if (level === "tous") return true;
    const l = priorityLevel(p.priority).label;
    return level === "eleve" ? l === "Élevée" : level === "moyen" ? l === "Moyenne" : l === "Faible";
  });

  if (priorities.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <SectionTitle icon={ListOrdered} title="Priorité d'achat" subtitle="Classement 0–100 par niveau d'urgence" />
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {([
            ["tous", "Tous"],
            ["eleve", "Priorité élevée"],
            ["moyen", "Priorité moyenne"],
            ["faible", "Priorité faible"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setLevel(key)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
                level === key
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/50 bg-background text-muted-foreground hover:bg-muted/40",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {rows.slice(0, 10).map((p) => {
            const lvl = priorityLevel(p.priority);
            return (
              <div key={p.articleId} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-background p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium">{p.designation}</p>
                  <p className="text-[9.5px] text-muted-foreground">{p.group} · {formatTnd(p.total)}</p>
                </div>
                <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums", TONE_CHIP[lvl.band])}>
                  {p.priority}/100
                </span>
                <TrendBadge trend={p.trend} />
                <span className="w-full text-[10px] text-muted-foreground sm:w-auto">{p.recommendation}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── 9. Analyse des risques (§11) ────────────────────────────────────────────

function RiskMatrixSection({ analysis: a }: { analysis: DecisionAnalysis }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <SectionTitle icon={ShieldAlert} title="Risques prévisionnels du projet" subtitle="Probabilité · Impact · Score" />
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {a.risks.map((r) => (
            <div key={r.id} className="rounded-xl border border-border/40 bg-background p-2.5">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 shrink-0 rounded-full")} style={{ backgroundColor: TONE_STROKE[r.band.tone] }} />
                <span className="min-w-0 flex-1 text-[11px] font-semibold">{r.label}</span>
                <ToneBadge label={`${r.score}/100 · ${r.band.label}`} tone={r.band.tone} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] text-muted-foreground">Probabilité {r.probability}%</p>
                  <SoftBar value={r.probability} tone="surveiller" />
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Impact {r.impact}%</p>
                  <SoftBar value={r.impact} tone="risque" />
                </div>
              </div>
              <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">{r.recommendation}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── 10. Simulation « Et si ? » (§12) ────────────────────────────────────────

function SimulationSection({ simulations }: { simulations: SimulationResult[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = simulations.find((s) => s.id === activeId) ?? null;
  if (simulations.length === 0) return null;
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <SectionTitle
          icon={FlaskConical}
          title="Simulation « Et si ? »"
          subtitle="Ne modifie jamais le résultat officiel de votre projet"
        />
        <div className="flex flex-wrap gap-1.5">
          {simulations.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(activeId === s.id ? null : s.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
                activeId === s.id
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/50 bg-background text-muted-foreground hover:bg-muted/40",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          {active && (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-3"
            >
              <p className="text-[11px] text-muted-foreground">{active.description}</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-background p-2">
                  <p className="text-[9.5px] text-muted-foreground">Nouveau coût estimatif</p>
                  <p className="text-sm font-bold tabular-nums">{formatTnd(active.newProjectTotal)}</p>
                </div>
                <div className="rounded-lg bg-background p-2">
                  <p className="text-[9.5px] text-muted-foreground">Différence</p>
                  <p className={cn("text-sm font-bold tabular-nums", active.delta > 0 ? "text-red-600 dark:text-red-400" : active.delta < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                    {active.delta > 0 ? "+" : ""}{formatTnd(active.delta)}
                    <span className="ml-1 text-[10px] font-medium">
                      ({active.deltaPct > 0 ? "+" : ""}{active.deltaPct.toLocaleString("fr-FR")} %)
                    </span>
                  </p>
                </div>
                <div className="rounded-lg bg-background p-2">
                  <p className="text-[9.5px] text-muted-foreground">Impact</p>
                  <p className="text-[11px] font-medium leading-snug">{active.impactNote}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <p className="mt-3 flex items-start gap-1.5 text-[10px] text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Simulation indicative : le résultat officiel du projet reste inchangé tant que vous ne validez pas une modification.
        </p>
      </CardContent>
    </Card>
  );
}

// ── 11. Recommandations IA personnalisées (§13) ─────────────────────────────

function RecommendationsSection({
  analysis: a,
  projectName,
  regionLabel,
  surface,
  scenarioLabel,
}: {
  analysis: DecisionAnalysis;
  projectName?: string;
  regionLabel?: string;
  surface?: number;
  scenarioLabel: string;
}) {
  const context = [
    projectName,
    regionLabel,
    surface ? `${surface} m²` : null,
    `scénario ${scenarioLabel}`,
  ].filter(Boolean) as string[];
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.05] to-background shadow-sm">
      <CardContent className="p-4">
        <SectionTitle
          icon={BrainCircuit}
          title="Recommandations pour votre projet"
          subtitle={context.join(" · ")}
        />
        <ul className="space-y-2">
          {a.recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-2 rounded-lg border border-border/40 bg-background/70 p-2.5">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="text-[11px] leading-snug">{r}</p>
            </li>
          ))}
        </ul>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <MiniStat icon={Percent} label="Postes analysés" value={String(a.analyzedLines)} />
          <MiniStat icon={ShieldCheck} label="Score global" value={`${a.globalScore}/100`} />
          <MiniStat icon={Zap} label="Exposition hausse" value={formatTnd(a.riseExposure)} />
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/70 p-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[9.5px] text-muted-foreground">{label}</p>
        <p className="text-[11px] font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

// ── Utilitaires locaux ──────────────────────────────────────────────────────

const groupOf = materialGroup;
const scoreToneOf = (n: number): ScoreTone => scoreBand(n).tone;
const scoreLabelOf = (n: number): string => scoreBand(n).label;
