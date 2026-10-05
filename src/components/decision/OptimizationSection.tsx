// ============================================================================
// AIDE À LA DÉCISION — Budget / Capacité de construction + Optimisation
// ----------------------------------------------------------------------------
// Deux blocs complémentaires :
//   1. Budget saisi par l'utilisateur → « Capacité de construction »
//      (Quantitatif à 3 niveaux : catégorie → sous-catégorie → article) ;
//   2. Parcours d'optimisation (leviers, simulation, validation des décisions).
//
// L'« Analyse de vos matériaux » n'est plus ici : elle est rendue sous la carte
// « Confiance » de la page « Coût de construction ».
// ============================================================================

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock3,
  Coins,
  Hammer,
  Info,
  Layers,
  Lightbulb,
  Recycle,
  Scale,
  ShoppingCart,
  Sparkles,
  Tag,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PREDICTION_CONFIDENCE_LABELS } from "@/lib/decisionAnalysis";
import {
  BUDGET_SIMULATION_STEP_TND,
  MIN_BUDGET_TND,
  budgetProgressionBlocks,
  formatPercent,
  formatTndAmount,
  type BudgetAnalysis,
  type BudgetStatus,
} from "@/lib/budgetEngine";
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

// ── Icônes des leviers (alignées sur LEVER_META.icon) ───────────────────────
const LEVER_ICONS: Record<OptimizationLeverKey, typeof Tag> = {
  prix: Tag,
  materiaux: Layers,
  quantites: Recycle,
  periode: CalendarDays,
  regroupement: ShoppingCart,
  scenario: Scale,
};

const STATUS_META: Record<BudgetStatus, { label: string; cls: string }> = {
  realisable: {
    label: "Réalisable",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  partiel: {
    label: "Partiel",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  report: {
    label: "À reporter",
    cls: "border-border/50 bg-muted/40 text-muted-foreground",
  },
};

const RISK_META: Record<OptimizationRisk, { label: string; cls: string }> = {
  faible: {
    label: "Risque faible",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  moyen: {
    label: "Risque modéré",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  eleve: {
    label: "Arbitrage à valider",
    cls: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  },
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

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-background p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-sm font-bold tabular-nums", tone)}>{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: BudgetStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[9.5px] font-semibold", meta.cls)}>
      {meta.label}
    </span>
  );
}

/**
 * Quantitatif à 3 niveaux : catégorie → sous-catégorie → article.
 * Chaque ligne affiche son % de réalisation (montant financé / montant estimé),
 * calculé par `budgetEngine` — jamais codé en dur.
 */
function QuantitatifTable({ analysis }: { analysis: BudgetAnalysis }) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [openSubs, setOpenSubs] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-2">
      {analysis.breakdown.map((cat) => {
        const catOpen = openCategories[cat.categoryId] ?? false;
        return (
          <div key={cat.categoryId} className="overflow-hidden rounded-xl border border-border/40">
            <button
              type="button"
              onClick={() => setOpenCategories((s) => ({ ...s, [cat.categoryId]: !catOpen }))}
              className="flex w-full items-center gap-2.5 bg-muted/20 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold">{cat.categoryLabel}</span>
                <span className="block text-[10px] text-muted-foreground">
                  {formatTndAmount(cat.estimatedCost)} · {formatPercent(cat.pctOfTotal)} du projet
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[12px] font-bold tabular-nums">
                  {formatTndAmount(cat.fundedAmount)}
                </span>
                <span className="block text-[9.5px] text-muted-foreground">
                  réalisation {formatPercent(cat.realizationPct)}
                </span>
              </span>
              <StatusBadge status={cat.status} />
              {catOpen ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </button>

            {catOpen && (
              <div className="space-y-1.5 border-t border-border/30 p-2.5">
                {cat.subcategories.map((sub) => {
                  const subKey = `${cat.categoryId}:${sub.subcategoryId}`;
                  const subOpen = openSubs[subKey] ?? false;
                  return (
                    <div key={subKey} className="overflow-hidden rounded-lg border border-border/30">
                      <button
                        type="button"
                        onClick={() => setOpenSubs((s) => ({ ...s, [subKey]: !subOpen }))}
                        className="flex w-full items-center gap-2 bg-background px-2.5 py-2 text-left transition-colors hover:bg-muted/20"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11.5px] font-medium">{sub.subcategoryLabel}</span>
                          <span className="block text-[10px] text-muted-foreground">
                            {formatTndAmount(sub.estimatedCost)} · {formatPercent(sub.pctOfCategory)} de la
                            catégorie
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-[11.5px] font-bold tabular-nums">
                            {formatTndAmount(sub.fundedAmount)}
                          </span>
                          <span className="block text-[9.5px] text-muted-foreground">
                            réalisation {formatPercent(sub.realizationPct)}
                          </span>
                        </span>
                        <StatusBadge status={sub.status} />
                        {subOpen ? (
                          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </button>

                      {subOpen && (
                        <ul className="space-y-1 border-t border-border/20 p-2">
                          {sub.articles.map((art, idx) => (
                            <li
                              key={`${subKey}:${idx}`}
                              className="flex items-center gap-2 text-[11px]"
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {art.quantity !== undefined ? (
                                  <span className="text-muted-foreground">
                                    {art.quantity} {art.unit} —{" "}
                                  </span>
                                ) : null}
                                {art.designation}
                              </span>
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {formatTndAmount(art.estimatedCost)}
                              </span>
                              <span className="w-16 shrink-0 text-right tabular-nums">
                                {formatTndAmount(art.fundedAmount)}
                              </span>
                              <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">
                                {formatPercent(art.realizationPct)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** « Capacité de construction » : ce que le budget saisi permet réellement de finir. */
function BudgetCapacityCard({ analysis }: { analysis: BudgetAnalysis }) {
  const [open, setOpen] = useState(true);

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Hammer className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold tracking-tight">Capacité de construction</h3>
          <span className="ml-auto rounded-full border border-primary/30 bg-primary/[0.06] px-2 py-0.5 text-[10px] font-semibold text-primary">
            budget {formatTndAmount(analysis.availableBudget)}
          </span>
          <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => setOpen((v) => !v)}>
            {open ? "Masquer le détail" : "Voir le détail"}
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{analysis.summarySentence}</p>

        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Kpi
            label="Chantier finançable"
            value={formatPercent(analysis.projectReachablePct)}
            hint="du coût total du projet"
            tone="text-primary"
          />
          <Kpi
            label="Budget consommé"
            value={formatPercent(analysis.budgetUsedPct)}
            hint={formatTndAmount(analysis.usedBudget)}
          />
          <Kpi
            label="Reste disponible"
            value={formatTndAmount(analysis.remainingBudget)}
            tone={analysis.remainingBudget > 0 ? "text-emerald-600 dark:text-emerald-400" : undefined}
          />
          <Kpi
            label="Manque au total"
            value={formatTndAmount(analysis.gapToProjectTotal)}
            hint={`prochain chantier : ${analysis.nextCategoryLabel}`}
            tone="text-amber-600 dark:text-amber-400"
          />
        </div>

        {/* Répartition par statut */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
            {analysis.statusSummary.realisable.length} réalisable(s)
          </span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
            {analysis.statusSummary.partiel.length} partiel(s)
          </span>
          <span className="rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {analysis.statusSummary.report.length} à reporter
          </span>
        </div>

        {/* Progression du budget consommé */}
        <div className="mt-3 overflow-x-auto pb-1">
          <span className="font-mono text-[12px] tracking-widest text-primary" aria-hidden>
            {budgetProgressionBlocks(analysis.budgetUsedPct)}
          </span>
        </div>

        {/* Simulation : +10 000 TND */}
        {analysis.scenarios.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Simulation — pas de {formatTndAmount(BUDGET_SIMULATION_STEP_TND)}
            </p>
            {analysis.scenarios.map((sc) => (
              <div
                key={sc.scenario}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-background px-2.5 py-2"
              >
                <span className="text-[11.5px] font-semibold">{sc.label}</span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  budget {formatTndAmount(sc.budget)}
                </span>
                <span className="ml-auto text-[11px] font-bold tabular-nums text-primary">
                  {formatPercent(sc.progressPct)} du chantier
                </span>
                <span className="w-full text-[10.5px] leading-snug text-muted-foreground">{sc.headline}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] p-2.5">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <div>
            <p className="text-[11px] font-semibold">Recommandation</p>
            <p className="text-[11px] leading-snug text-muted-foreground">{analysis.recommendation}</p>
            <p className="mt-1 text-[10.5px] text-muted-foreground">
              Combinaison conseillée : {analysis.optimalCombination}
            </p>
          </div>
        </div>

        {open && (
          <div className="mt-3">
            <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              Quantitatif détaillé — réalisation par poste
            </p>
            <QuantitatifTable analysis={analysis} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OptimizationSection({
  plan,
  budgetAnalysis,
  onBudgetAnalyze,
  budgetAvailable,
  onBudgetChange,
  projectContextLabel,
}: {
  plan: OptimizationPlan;
  budgetAnalysis: BudgetAnalysis | null;
  onBudgetAnalyze?: (budget: number) => void;
  budgetAvailable?: number;
  onBudgetChange?: (value: string) => void;
  projectContextLabel?: string;
}) {
  const [decisions, setDecisions] = useState<Record<string, OpportunityAction>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const appliedIds = useMemo(
    () => plan.opportunities.filter((o) => decisions[o.id] === "applied").map((o) => o.id),
    [decisions, plan.opportunities],
  );
  const pendingSelected = useMemo(
    () => selected.filter((id) => decisions[id] !== "applied" && decisions[id] !== "ignored"),
    [selected, decisions],
  );

  const progress = useMemo(
    () => buildProgress(plan.opportunities, appliedIds, selected, plan.projectTotal),
    [plan.opportunities, plan.projectTotal, appliedIds, selected],
  );

  const simulation = useMemo(() => {
    const union = new Set<string>([...appliedIds, ...selected]);
    const c = combineSavings(plan.opportunities, union, plan.projectTotal);
    return {
      gain: Math.max(0, Math.round(c.realisable - progress.niveauActuel)),
      apres: Math.max(0, Math.round(plan.coutInitial - c.realisable)),
      pct: c.realisablePct,
    };
  }, [plan.opportunities, plan.projectTotal, plan.coutInitial, appliedIds, selected, progress.niveauActuel]);

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
  const budgetNumber = Number(budgetInputValue);
  const budgetTooLow = budgetInputValue !== "" && budgetNumber > 0 && budgetNumber < MIN_BUDGET_TND;
  const budgetValid = Number.isFinite(budgetNumber) && budgetNumber >= MIN_BUDGET_TND;

  return (
    <div className="space-y-3">
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
                Saisissez votre budget total disponible pour ce projet. L'analyse de la capacité de
                construction sera calculée automatiquement.
              </p>
              {projectContextLabel ? (
                <p className="mt-0.5 text-[10px] text-muted-foreground/80">{projectContextLabel}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex-1">
              <label className="sr-only" htmlFor="budget-available">
                Budget total (TND)
              </label>
              <Input
                id="budget-available"
                type="number"
                min="0"
                step="1000"
                value={budgetInputValue}
                onChange={(e) => onBudgetChange?.(e.target.value)}
                placeholder={`${MIN_BUDGET_TND} TND minimum`}
                className="h-10 text-base font-medium tabular-nums"
              />
              <p
                className={cn(
                  "mt-1 text-[10.5px]",
                  budgetTooLow ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                )}
              >
                {budgetTooLow
                  ? `Budget minimal : ${formatTndAmount(MIN_BUDGET_TND)}. En dessous, aucun chantier structurel n'est finançable.`
                  : `Budget minimal analysable : ${formatTndAmount(MIN_BUDGET_TND)}.`}
              </p>
            </div>
            <Button
              className="gap-1.5 whitespace-nowrap"
              disabled={!budgetValid}
              onClick={() => onBudgetAnalyze?.(budgetNumber)}
            >
              <Sparkles className="h-4 w-4" />
              Analyser mon budget avec l'IA
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Capacité de construction (résultat de l'analyse budget) ── */}
      {budgetAnalysis?.available ? (
        <BudgetCapacityCard analysis={budgetAnalysis} />
      ) : budgetAnalysis?.reason ? (
        <Card className="border-dashed">
          <CardContent className="flex items-start gap-2.5 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <h3 className="text-sm font-bold">Capacité de construction</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{budgetAnalysis.reason}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Coût total ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold tracking-tight">Coût total</h3>
          </div>
          <div className="mt-3 grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Coût initial</p>
              <p className="text-base font-black tabular-nums">{formatTndAmount(plan.coutInitial)}</p>
            </div>
            <ArrowRight className="mx-auto hidden h-4 w-4 text-muted-foreground sm:block" />
            <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Potentiel d'optimisation
              </p>
              <p className="text-base font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatPercent(plan.potentielPct)}
              </p>
            </div>
            <ArrowRight className="mx-auto hidden h-4 w-4 text-muted-foreground sm:block" />
            <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Coût optimisé estimé</p>
              <p className="text-base font-black tabular-nums text-primary">
                {formatTndAmount(plan.coutOptimise)}
              </p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            <span>
              Économie réellement réalisable :{" "}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatTndAmount(plan.economieRealisable)}
              </span>
            </span>
            <span>
              Somme brute des opportunités :{" "}
              <span className="font-semibold text-foreground">{formatTndAmount(plan.economieBrute)}</span>
            </span>
            {plan.overlap > 0 && (
              <span>
                Dédoublonnage (chevauchements) : −{formatTndAmount(plan.overlap)} (
                {formatPercent(plan.overlapPct)})
              </span>
            )}
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-[10px] text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            Estimation basée sur les opportunités actuellement détectées. Les économies ne sont jamais
            additionnées naïvement : les recommandations qui se chevauchent sont dédoublonnées.
          </p>
        </CardContent>
      </Card>

      {/* ── Parcours d'optimisation ── */}
      {!plan.available ? (
        <Card className="border-dashed">
          <CardContent className="flex items-start gap-2.5 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <h3 className="text-sm font-bold">Optimisez votre projet</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {plan.reason ?? "Données insuffisantes."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold tracking-tight">Optimisez votre projet</h3>
            </div>

            {/* Progression */}
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Niveau actuel</p>
                <p className="text-lg font-black tabular-nums">{formatPercent(progress.niveauActuelPct)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatTndAmount(progress.niveauActuel)} d'économie validée
                </p>
              </div>
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.05] p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Après recommandations sélectionnées
                </p>
                <p className="text-lg font-black tabular-nums text-sky-600 dark:text-sky-400">
                  {formatPercent(progress.apresSelectionPct)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatTndAmount(progress.apresSelection)} d'économie estimée
                </p>
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Potentiel restant
                </p>
                <p className="text-lg font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{formatPercent(progress.potentielRestantPct)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatTndAmount(progress.potentielRestant)} encore mobilisables
                </p>
              </div>
            </div>
            <div className="mt-2 overflow-x-auto pb-2">
              <span className="font-mono text-[12px] tracking-widest text-primary" aria-hidden>
                {progressionBlocks(progress.niveauActuelPct)}
              </span>
              <span className="ml-2 text-[10px] text-muted-foreground">
                Optimisation actuelle {formatPercent(progress.niveauActuelPct)} · potentiel total{" "}
                {formatPercent(progress.fullPct)}
              </span>
            </div>

            {/* Leviers */}
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
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {lever.description}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[12px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatPercent(lever.savingPct)}
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
                        {ops.length === 0 ? (
                          <p className="py-2 text-center text-[11px] text-muted-foreground">
                            Aucune opportunité détectée pour ce levier.
                          </p>
                        ) : (
                          ops.map((op) => (
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
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Simulation avant validation */}
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
                    <p className="text-sm font-bold tabular-nums">{formatTndAmount(plan.coutInitial)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Après optimisation
                    </p>
                    <p className="text-sm font-bold tabular-nums text-primary">
                      {formatTndAmount(simulation.apres)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Gain</p>
                    <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatTndAmount(simulation.gain)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Optimisation</p>
                    <p className="text-sm font-bold tabular-nums">{formatPercent(simulation.pct)}</p>
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

            {/* Objectif atteint ? */}
            {plan.honesty ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.05] p-2.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <p className="text-[11px] leading-snug text-muted-foreground">{plan.honesty}</p>
              </div>
            ) : null}

            {/* Explication */}
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 p-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-[11px] font-semibold">Comment fonctionne l'optimisation ?</p>
                <p className="text-[11px] leading-snug text-muted-foreground">{plan.explainer}</p>
                <p className="mt-1 text-[11px] leading-snug">{plan.objective.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
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
  const badgeAction = action as Exclude<OpportunityAction, "pending">;

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
        <button
          type="button"
          onClick={onToggleOpen}
          className="min-w-0 flex-1 text-left"
          aria-expanded={open}
        >
          <span className="flex flex-wrap items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="text-[12px] font-semibold">{op.title}</span>
            {action !== "pending" && (
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[9px] font-semibold",
                  ACTION_BADGE[badgeAction],
                )}
              >
                {ACTION_LABEL[badgeAction]}
              </span>
            )}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-muted-foreground">
            <span>Impact {op.impactScore}/100</span>
            <span className={cn("rounded-full border px-2 py-0.5 font-semibold", risk.cls)}>
              {risk.label}
            </span>
            <span>Compatibilité {op.compatibility}/100</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-2.5 w-2.5" /> {PREDICTION_CONFIDENCE_LABELS[op.confidence]}
            </span>
          </span>
        </button>
      </div>

      {open && (
        <div className="space-y-2.5 border-t border-border/30 bg-muted/10 p-3">
          <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Situation actuelle : </span>
              <span className="font-medium">{op.currentLabel ?? "—"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Alternative : </span>
              <span className="font-medium">{op.alternativeLabel ?? "—"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Matériau concerné : </span>
              <span className="font-medium">
                {op.designation}
                {op.group ? ` (${op.group})` : ""}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Base de coût : </span>
              <span className="font-medium">{formatTndAmount(op.baseCost)}</span>
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