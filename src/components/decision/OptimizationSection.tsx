// AIDE À LA DÉCISION — « OPTIMISEZ VOTRE PROJET » ( optimisation + budget IA )
// ----------------------------------------------------------------------------
// Couche d'OPTIMISATION au-dessus de l'analyse matériau-par-matériau :
// + carte Budget IA (capacité de construction) : dédiée au projet sélectionné.
// Le budget, les scénarios et la recommandation IA sont calculés dynamiquement
// depuis le Quantitatif détaillé ET le coût estimatif du projet — jamais de
// valeurs fixes ou de doublons de données.

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock3,
  Coins,
  Info,
  Layers,
  Lightbulb,
  Recycle,
  RefreshCw,
  Scale,
  ShoppingCart,
  Sparkles,
  Tag,
  Target,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatTnd } from "@/lib/utils";
import { PREDICTION_CONFIDENCE_LABELS } from "@/lib/decisionAnalysis";
import {
  buildProgress,
  combineSavings,
  progressionBlocks,
  type OptimizationLeverKey,
  type OptimizationOpportunity,
  type OptimizationPlan,
  type OptimizationRisk,
  type OpportunityAction,
} from "@/lib/optimizationEngine";
import {
  budgetProgressionBlocks,
  formatTndAmount,
  type BudgetAnalysis,
} from "@/lib/budgetEngine";

function KPIBlock({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-sm font-bold tabular-nums", tone && tone.startsWith("text-") ? tone : "")}>
        {value}
      </p>
    </div>
  );
}

function CategoryBadge({ name }: { name: string }) {
  return (
    <span className="rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
      {name}
    </span>
  );
}

const STATUS_TONE: Record<string, string> = {
  realisable: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  partiel: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  report: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};

const STATUS_LABEL: Record<string, string> = {
  realisable: "Réalisable",
  partiel: "Partiellement réalisable",
  report: "À reporter",
};



function BudgetAnalysisCard({ analysis, onEdit }: { analysis: BudgetAnalysis; onEdit: () => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <KPIBlock label="Budget disponible" value={formatTndAmount(analysis.availableBudget)} tone="text-primary" />
        <KPIBlock label="Budget utilisé" value={formatTndAmount(analysis.usedBudget)} tone="text-amber-600 dark:text-amber-400" />
        <KPIBlock label="Budget restant" value={formatTndAmount(analysis.remainingBudget)} tone="text-sky-600 dark:text-sky-400" />
        <KPIBlock label="Part du projet finançable" value={`${analysis.projectReachablePct} %`} tone="text-emerald-600 dark:text-emerald-400" />
        <KPIBlock label="Coût total estimé" value={formatTndAmount(analysis.projectTotal)} tone="text-muted-foreground" />
        {analysis.perUnitEstimate != null && (
          <KPIBlock label="Coût estimé au m²" value={formatTndAmount(analysis.perUnitEstimate)} tone="text-muted-foreground" />
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-2">Catégorie</th>
              <th className="px-2 py-2 text-right">Coût estimé</th>
              <th className="px-2 py-2 text-right">Budget nécessaire</th>
              <th className="px-2 py-2 text-right">% du coût total</th>
              <th className="px-2 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {analysis.breakdown.map((cat) => (
              <tr key={cat.categoryId} className="border-b border-border/20 hover:bg-muted/20">
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <CategoryBadge name={cat.categoryId} />
                    <span className="font-medium text-foreground">{cat.categoryLabel}</span>
                  </div>
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{formatTndAmount(cat.estimatedCost)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatTndAmount(cat.budgetNeeded)}</td>
                <td className="px-2 py-2 text-right">
                  <span className="tabular-nums">{cat.pctOfTotal} %</span>
                </td>
                <td className="px-2 py-2">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-semibold", STATUS_TONE[cat.status])}>
                    {STATUS_LABEL[cat.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Que puis-je construire avec mon budget ?
        </p>
        {analysis.scenarios.map((sc, idx) => (
          <div key={sc.scenario} className="overflow-hidden rounded-xl border border-border/40">
            <div
              className={cn(
                "flex flex-wrap items-center gap-2.5 px-3 py-2 text-left",
                sc.scenario === "actuel" && "border-primary/30 bg-primary/5",
                sc.scenario === "plus_cinquantaine" && "border-sky-500/30 bg-sky-500/5",
                sc.scenario === "complet" && "border-emerald-500/30 bg-emerald-500/5",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black",
                  sc.scenario === "actuel" && "bg-primary/10 text-primary",
                  sc.scenario === "plus_cinquantaine" && "bg-sky-500/10 text-sky-600 dark:text-sky-400",
                  sc.scenario === "complet" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                )}
              >
                {idx + 1}
              </span>
              <span className="text-[12px] font-semibold">{sc.label}</span>
              <span className="ml-auto text-[11px] font-bold tabular-nums">
                Budget : {formatTndAmount(sc.budget)}
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">· {sc.headline}</span>
              </span>
            </div>
            <div className="border-t border-border/30 px-3 py-2 text-[11px] text-muted-foreground">
              {sc.reachableCategories.length > 0 && (
                <span className="font-medium text-foreground">
                  Réalisables : {sc.reachableCategories.join(", ")}
                </span>
              )}
              {sc.partialCategories.length > 0 && (
                <span className="mt-1 block">Partiellement réalisables : {sc.partialCategories.join(", ")}</span>
              )}
              {sc.deferredCategories.length > 0 && (
                <span className="mt-1 block text-amber-700 dark:text-amber-300">
                  À reporter : {sc.deferredCategories.join(", ")}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5 rounded-xl border border-border/40 bg-muted/20 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Progression du projet
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${analysis.projectReachablePct}%` }}
              />
            </div>
          </div>
          <span className="text-[11px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {analysis.projectReachablePct} % du projet
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${analysis.budgetUsedPct}%` }}
              />
            </div>
          </div>
          <span className="text-[11px] font-bold tabular-nums text-primary">
            {analysis.budgetUsedPct} % du budget
          </span>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground">
          {budgetProgressionBlocks(analysis.projectReachablePct)}
        </p>
      </div>

      {analysis.recommendation && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Recommandation de l'IA</p>
              <p className="mt-1 text-[11px] leading-snug text-foreground">{analysis.recommendation}</p>
            </div>
          </div>
        </div>
      )}

      {analysis.summarySentence && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3">
          <p className="text-[11px] leading-snug text-amber-800 dark:text-amber-200">
            {analysis.summarySentence}
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onEdit}>
          <RefreshCw className="h-3.5 w-3.5" />
          Modifier mon budget
        </Button>
      </div>
    </div>
  );
}

const LEVER_ICONS: Record<OptimizationLeverKey, typeof Tag> = {
  prix: Tag,
  materiaux: Layers,
  quantites: Recycle,
  periode: CalendarClock,
  regroupement: ShoppingCart,
  scenario: Scale,
};

const RISK_META: Record<OptimizationRisk, { label: string; cls: string }> = {
  faible: { label: "Risque faible", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  moyen: { label: "Risque modéré", cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  eleve: { label: "Arbitrage à valider", cls: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300" },
};

const ACTION_BADGE: Record<Exclude<OpportunityAction, "pending">, string> = {
  applied: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  ignored: "border-border/50 bg-muted/40 text-muted-foreground",
  later: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};
const ACTION_LABEL: Record<Exclude<OpportunityAction, "pending">, string> = {
  applied: "Appliquée",
  ignored: "Ignorée",
  later: "Plus tard",
};

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Tag; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background p-2.5">
      <Icon className={cn("h-3.5 w-3.5", tone ?? "text-muted-foreground")} />
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

function OpportunityRow({
  op,
  action,
  selected,
  open,
  onToggleSelect,
  onToggleOpen,
  onAction,
}: {
  op: OptimizationOpportunity;
  action: OpportunityAction;
  selected: boolean;
  open: boolean;
  onToggleSelect: () => void;
  onToggleOpen: () => void;
  onAction: (a: Exclude<OpportunityAction, "pending">) => void;
}) {
  const risk = RISK_META[op.risk];
  const Icon = LEVER_ICONS[op.lever];
  const done = action === "applied" || action === "ignored";
  return (
    <div
      className={cn(
        "rounded-xl border transition-colors",
        action === "applied"
          ? "border-emerald-500/40 bg-emerald-500/[0.04]"
          : action === "ignored"
            ? "border-border/40 bg-muted/20 opacity-60"
            : "border-border/40 bg-background",
      )}
    >
      <div className="flex items-start gap-2.5 p-3">
        <label className="mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            checked={selected}
            disabled={done}
            onChange={onToggleSelect}
            aria-label={`Inclure ${op.title} dans la simulation`}
            className="h-4 w-4 cursor-pointer accent-emerald-600 disabled:cursor-not-allowed"
          />
        </label>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="text-[12px] font-semibold">{op.title}</span>
            {action !== "pending" && (
              <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-semibold", ACTION_BADGE[action as Exclude<OpportunityAction, "pending">])}>
                {ACTION_LABEL[action as Exclude<OpportunityAction, "pending">]}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-muted-foreground">
            <span>Impact {op.impactScore}/100</span>
            <span
              className={cn("rounded-full border px-2 py-0.5 font-semibold", risk.cls)}
              title="Niveau de risque / d'arbitrage de cette opportunité"
            >
              {risk.label}
            </span>
            <span>Compatibilité {op.compatibility}/100</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-2.5 w-2.5" /> Confiance {PREDICTION_CONFIDENCE_LABELS[op.confidence]}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 text-[11px]" onClick={onToggleOpen}>
          {open ? "Réduire" : "+ Examiner"}
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {open && (
        <div className="space-y-2.5 border-t border-border/30 bg-muted/10 p-3">
          <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
            {op.currentLabel && (
              <p>
                <span className="text-muted-foreground">Situation actuelle : </span>
                <span className="font-medium">{op.currentLabel}</span>
              </p>
            )}
            {op.alternativeLabel && (
              <p>
                <span className="text-muted-foreground">Alternative : </span>
                <span className="font-medium">{op.alternativeLabel}</span>
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Matériau concerné : </span>
              <span className="font-medium">{op.designation}</span>
              {op.group ? ` (${op.group})` : ""}
            </p>
            <p>
              <span className="text-muted-foreground">Base de coût : </span>
              <span className="font-medium">{formatTnd(op.baseCost)}</span>
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] p-2.5">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="text-[11px] leading-snug">{op.justification}</p>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.05] p-2.5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <p className="text-[11px] leading-snug">
              <span className="font-semibold">Conséquences éventuelles : </span>
              {op.consequences}
            </p>
          </div>
          {!done && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="h-8 gap-1.5" onClick={() => onAction("applied")}>
                <Check className="h-3.5 w-3.5" /> Appliquer
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onAction("ignored")}>
                Ignorer
              </Button>
              <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={() => onAction("later")}>
                <Clock3 className="h-3.5 w-3.5" /> Plus tard
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function OptimizationSection({
  plan,
  budgetAnalysis,
  onBudgetAnalyze,
  onBudgetEdit,
  budgetAvailable,
  onBudgetChange,
}: {
  plan: OptimizationPlan;
  budgetAnalysis?: BudgetAnalysis | null;
  onBudgetAnalyze?: (budget: number) => void;
  onBudgetEdit?: () => void;
  budgetAvailable?: number;
  onBudgetChange?: (value: string) => void;
}) {
  const [decisions, setDecisions] = useState<Record<string, OpportunityAction>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const budgetInputRef = useRef<HTMLInputElement>(null);

  const appliedIds = useMemo(
    () => plan.opportunities.filter((o) => decisions[o.id] === "applied").map((o) => o.id),
    [plan.opportunities, decisions],
  );
  const pendingSelected = useMemo(
    () => selected.filter((id) => decisions[id] !== "applied" && decisions[id] !== "ignored"),
    [selected, decisions],
  );

  const progress = useMemo(
    () => buildProgress(plan.opportunities, appliedIds, pendingSelected, plan.projectTotal),
    [plan.opportunities, plan.projectTotal, appliedIds, pendingSelected],
  );

  const simulation = useMemo(() => {
    const union = Array.from(new Set([...appliedIds, ...pendingSelected]));
    const c = combineSavings(plan.opportunities, union, plan.projectTotal);
    const gain = Math.max(0, Math.round(c.realisable - progress.niveauActuel));
    const apres = Math.max(0, Math.round(plan.coutInitial - c.realisable));
    return { gain, apres, pct: c.realisablePct };
  }, [plan.opportunities, plan.projectTotal, plan.coutInitial, appliedIds, pendingSelected, progress.niveauActuel]);

  const setAction = (id: string, action: Exclude<OpportunityAction, "pending">) => {
    setDecisions((d) => ({ ...d, [id]: action }));
    setSelected((s) => s.filter((x) => x !== id));
  };

  const toggleSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const validateSelection = () => {
    if (pendingSelected.length === 0) return;
    setDecisions((d) => {
      const next = { ...d };
      for (const id of pendingSelected) next[id] = "applied";
      return next;
    });
    setSelected([]);
  };

  const budgetInputValue = typeof budgetAvailable === "number" ? String(budgetAvailable) : "";

  const focusBudgetInput = () => {
    if (onBudgetEdit) {
      onBudgetEdit();
      return;
    }
    budgetInputRef.current?.focus();
    budgetInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // ── Saisie du budget + tableau de capacité de construction ────────────────
  const budgetBlock = (
    <>
      {/* ── Saisie du budget ── */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.05] to-transparent">
        <CardContent className="p-4">
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Coins className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold tracking-tight">Quel est votre budget disponible ?</p>
              <p className="text-[11px] text-muted-foreground">
                Saisissez votre budget total disponible pour ce projet. L'analyse sera calculée automatiquement.
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="sr-only">Budget total (TND)</label>
              <Input
                ref={budgetInputRef}
                type="number"
                min="0.01"
                step="1000"
                value={budgetInputValue}
                onChange={(e) => onBudgetChange?.(e.target.value)}
                placeholder="0 TND"
                className="h-10 text-base font-medium tabular-nums"
              />
            </div>
            <Button
              className="gap-1.5 whitespace-nowrap"
              disabled={!Number.isFinite(Number(budgetInputValue)) || Number(budgetInputValue) <= 0}
              onClick={() => onBudgetAnalyze?.(Number(budgetInputValue))}
            >
              <Sparkles className="h-4 w-4" />
              Analyser mon budget avec l'IA
            </Button>
          </div>
          {typeof budgetAvailable === "number" && budgetAvailable > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Budget analysé : <span className="font-semibold text-foreground">{formatTndAmount(budgetAvailable)}</span>
              {budgetAnalysis && (
                <span className="ml-2 text-amber-700 dark:text-amber-300"> — {budgetAnalysis.projectReachablePct.toLocaleString("fr-FR")} % du projet réalisable</span>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Capacité de construction (résultat de l'analyse budget) ── */}
      {budgetAnalysis && (
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold tracking-tight">👷 Capacité de construction</h3>
              <span className="text-[10px] text-muted-foreground">
                — ce que vous pouvez construire avec votre budget
              </span>
            </div>

            {budgetAnalysis.available ? (
              <BudgetAnalysisCard analysis={budgetAnalysis} onEdit={focusBudgetInput} />
            ) : (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-800 dark:text-amber-200">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {budgetAnalysis.reason ?? "Analyse indisponible pour ce projet."}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );

  if (!plan.available) {
    return (
      <div className="space-y-3">
        {budgetBlock}
        <Card className="border-dashed">
          <CardContent className="flex items-start gap-2.5 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <h3 className="text-sm font-bold">🎯 Optimisez votre projet</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {plan.reason ?? "Données insuffisantes."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {budgetBlock}

      {/* ── Coût total ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold tracking-tight">💰 Coût total</h3>
          </div>
          <div className="mt-3 grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Coût initial</p>
              <p className="text-base font-black tabular-nums">{formatTnd(plan.coutInitial)}</p>
            </div>
            <ArrowRight className="mx-auto hidden h-4 w-4 text-muted-foreground sm:block" />
            <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Potentiel d'optimisation</p>
              <p className="text-base font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                {plan.potentielPct.toLocaleString("fr-FR")} %
              </p>
            </div>
            <ArrowRight className="mx-auto hidden h-4 w-4 text-muted-foreground sm:block" />
            <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Coût optimisé estimé</p>
              <p className="text-base font-black tabular-nums text-primary">{formatTnd(plan.coutOptimise)}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            <span>
              Économie réellement réalisable : <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatTnd(plan.economieRealisable)}</span>
            </span>
            <span>
              Somme brute des opportunités : <span className="font-semibold text-foreground">{formatTnd(plan.economieBrute)}</span>
            </span>
            {plan.overlap > 0 && (
              <span>
                Dédoublonnage (chevauchements) : −{formatTnd(plan.overlap)} ({plan.overlapPct.toLocaleString("fr-FR")} %)
              </span>
            )}
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-[10px] text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            Estimation basée sur les opportunités actuellement détectées. Les économies ne sont jamais additionnées
            naïvement : les recommandations qui se chevauchent sont dédoublonnées.
          </p>
        </CardContent>
      </Card>

      {/* ── Parcours d'optimisation ── */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold tracking-tight">🎯 Optimisez votre projet</h3>
          </div>

          {/* Progression (§9) */}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Niveau actuel</p>
              <p className="text-lg font-black tabular-nums">{progress.niveauActuelPct.toLocaleString("fr-FR")} %</p>
              <p className="text-[10px] text-muted-foreground">{formatTnd(progress.niveauActuel)} d'économie validée</p>
            </div>
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.05] p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Après recommandations sélectionnées</p>
              <p className="text-lg font-black tabular-nums text-sky-600 dark:text-sky-400">
                {progress.apresSelectionPct.toLocaleString("fr-FR")} %
              </p>
              <p className="text-[10px] text-muted-foreground">{formatTnd(progress.apresSelection)} d'économie estimée</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Potentiel restant</p>
              <p className="text-lg font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                +{progress.potentielRestantPct.toLocaleString("fr-FR")} %
              </p>
              <p className="text-[10px] text-muted-foreground">{formatTnd(progress.potentielRestant)} encore mobilisables</p>
            </div>
          </div>
          <div className="mt-2 overflow-x-auto">
            <span className="font-mono text-[12px] tracking-widest text-primary" aria-hidden>
              {progressionBlocks(progress.niveauActuelPct)}
            </span>
            <span className="ml-2 text-[10px] text-muted-foreground">
              Optimisation actuelle {progress.niveauActuelPct.toLocaleString("fr-FR")} % · potentiel total{" "}
              {progress.fullPct.toLocaleString("fr-FR")} %
            </span>
          </div>

          {/* Leviers (§5) */}
          <div className="mt-3 space-y-2">
            {plan.levers.map((lever) => {
              const Icon = LEVER_ICONS[lever.key];
              const isOpen = expanded[lever.key] ?? false;
              const ops = plan.opportunities.filter((o) => o.lever === lever.key);
              return (
                <div key={lever.key} className="overflow-hidden rounded-xl border border-border/40">
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => ({ ...e, [lever.key]: !isOpen }))}
                    className="flex w-full items-center gap-2.5 bg-muted/20 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-black text-primary">
                      {lever.index}
                    </span>
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-semibold">{lever.title}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">{lever.description}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[12px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {lever.savingPct.toLocaleString("fr-FR")} %
                      </span>
                      <span className="block text-[9.5px] text-muted-foreground">
                        {lever.opportunityCount} opportunité(s)
                      </span>
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="space-y-2 border-t border-border/30 p-2.5">
                      {lever.note && (
                        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Info className="h-3 w-3 shrink-0" /> {lever.note}
                        </p>
                      )}
                      {ops.map((op) => (
                        <OpportunityRow
                          key={op.id}
                          op={op}
                          action={decisions[op.id] ?? "pending"}
                          selected={pendingSelected.includes(op.id)}
                          open={openId === op.id}
                          onToggleSelect={() => toggleSelect(op.id)}
                          onToggleOpen={() => setOpenId((v) => (v === op.id ? null : op.id))}
                          onAction={(a) => setAction(op.id, a)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* §8 Simulation avant application */}
          {pendingSelected.length > 0 && (
            <div className="mt-3 rounded-xl border border-sky-500/40 bg-sky-500/[0.05] p-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-sky-600" />
                <h4 className="text-[12px] font-bold">Simulation — avant validation</h4>
                <span className="ml-auto rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                  {pendingSelected.length} sélectionnée(s)
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avant</p>
                  <p className="text-sm font-bold tabular-nums">{formatTnd(plan.coutInitial)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Après optimisation</p>
                  <p className="text-sm font-bold tabular-nums text-primary">{formatTnd(simulation.apres)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Gain</p>
                  <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatTnd(simulation.gain)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Optimisation</p>
                  <p className="text-sm font-bold tabular-nums">{simulation.pct.toLocaleString("fr-FR")} %</p>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Aucune modification n'est appliquée à votre projet avant validation.
              </p>
              <Button size="sm" className="mt-2 h-8 gap-1.5" onClick={validateSelection}>
                <CircleCheck className="h-3.5 w-3.5" /> Valider cette optimisation
              </Button>
            </div>
          )}

          {/* §18 Explication */}
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 p-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-[11px] font-semibold">ℹ️ Comment fonctionne l'optimisation ?</p>
              <p className="text-[11px] leading-snug text-muted-foreground">{plan.explainer}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
