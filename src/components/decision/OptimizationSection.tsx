// ============================================================================
// AIDE À LA DÉCISION — Budget / Capacité de construction
// ----------------------------------------------------------------------------
// Un seul bloc : le budget saisi par l'utilisateur → « Capacité de
// construction » (Quantitatif à 3 niveaux : catégorie → sous-catégorie →
// article).
//
// Le parcours d'optimisation (« Coût total » + « Optimisez votre projet »)
// n'est plus affiché ici ; le plan d'optimisation reste calculé en amont par
// le module parent.
//
// L'« Analyse de vos matériaux » n'est plus ici : elle est rendue sous la carte
// « Confiance » de la page « Coût de construction ».
// ============================================================================

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Coins,
  Hammer,
  Info,
  Sparkles,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BUDGET_SIMULATION_STEP_TND,
  MIN_BUDGET_TND,
  budgetProgressionBlocks,
  formatPercent,
  formatTndAmount,
  type BudgetAnalysis,
  type BudgetStatus,
} from "@/lib/budgetEngine";
import type { OptimizationPlan } from "@/lib/optimizationEngine";

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

/** Pourcentage borné à [0, 100] — une jauge ne déborde jamais de son cercle. */
function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}

/**
 * Jauge circulaire : le cercle plein représente 100 %, l'arc rempli la part
 *atteinte. La valeur reste écrite au centre — aucune donnée n'est cachée.
 */
function RingGauge({
  label,
  value,
  hint,
  stroke,
}: {
  label: string;
  value: number;
  hint?: string;
  stroke: string;
}) {
  const pct = clampPct(value);
  // Le viewBox reste fixe : la taille AFFICHÉE est pilotée par les classes
  // responsive ci-dessous, la jauge s'adapte donc sans recalcul.
  const vb = 76;
  const strokeWidth = 7;
  const radius = (vb - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-background p-2.5 sm:gap-3">
      <div className="relative h-14 w-14 shrink-0 sm:h-[76px] sm:w-[76px]">
        <svg
          viewBox={`0 0 ${vb} ${vb}`}
          className="h-full w-full"
          role="img"
          aria-label={`${label} : ${formatPercent(pct)}`}
        >
          <circle
            cx={vb / 2}
            cy={vb / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-muted"
          />
          <circle
            cx={vb / 2}
            cy={vb / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${vb / 2} ${vb / 2})`}
            className={cn("transition-[stroke-dashoffset] duration-500", stroke)}
          />
        </svg>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center font-black tabular-nums",
            "text-[11px] sm:text-[13px]",
            stroke,
          )}
        >
          {formatPercent(pct)}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        {hint ? <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

/** Barre de progression du taux de réalisation d'un poste du Quantitatif. */
function RealizationBar({ pct }: { pct: number }) {
  const v = clampPct(pct);
  const tone = v >= 100 ? "bg-emerald-500" : v > 0 ? "bg-amber-500" : "bg-border";
  return (
    <div className="flex w-20 shrink-0 items-center justify-end gap-1 sm:w-32 sm:gap-1.5">
      <div className="h-1.5 w-8 shrink-0 overflow-hidden rounded-full bg-muted sm:w-14">
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", tone)}
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right tabular-nums text-[9.5px] text-muted-foreground sm:w-11">
        {formatPercent(v)}
      </span>
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
 * Libellé court d'un poste : le libellé du Quantitatif peut embarquer un
 * complément entre parenthèses qui répète les sous-catégories listées juste
 * en dessous (« Gros œuvre (fondations, structures) » → « Gros œuvre »).
 * L'affichage ne garde que le libellé propre.
 */
function shortLabel(label: string): string {
  const cleaned = label.replace(/\s*\([^()]*\)\s*$/, "").trim();
  return cleaned.length > 0 ? cleaned : label;
}

/**
 * Quantitatif à 3 niveaux : catégorie → sous-catégorie → article.
 * Chaque ligne affiche son montant estimé et son % de réalisation (montant
 * financé / montant estimé, calculé par `budgetEngine` — jamais codé en dur).
 * Un seul montant par ligne : celui du poste, la réalisation le %.
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
                <span className="block text-[12px] font-semibold">{shortLabel(cat.categoryLabel)}</span>
                <span className="block text-[10px] text-muted-foreground">
                  {formatTndAmount(cat.estimatedCost)} · {formatPercent(cat.pctOfTotal)} du projet
                </span>
              </span>
              <RealizationBar pct={cat.realizationPct} />
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
                          <span className="block text-[11.5px] font-medium">
                            {shortLabel(sub.subcategoryLabel)}
                          </span>
                          <span className="block text-[10px] text-muted-foreground">
                            {formatTndAmount(sub.estimatedCost)} · {formatPercent(sub.pctOfCategory)} de la
                            catégorie
                          </span>
                        </span>
                        <RealizationBar pct={sub.realizationPct} />
                        <StatusBadge status={sub.status} />
                        {subOpen ? (
                          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </button>

                      {subOpen && (
                        <div className="border-t border-border/20 p-2">
                          <div className="flex items-baseline gap-2 pb-1 text-[9.5px] uppercase tracking-wide text-muted-foreground">
                            <span className="min-w-0 flex-1">Article</span>
                            <span className="w-20 shrink-0 text-right sm:w-24">Montant</span>
                            <span className="w-20 shrink-0 text-right sm:w-32">Réalisation</span>
                          </div>
                          <ul className="space-y-1">
                            {sub.articles.map((art, idx) => (
                              <li
                                key={`${subKey}:${idx}`}
                                className="flex items-start gap-2 text-[11px]"
                              >
                                <span className="min-w-0 flex-1 break-words">
                                  {art.quantity !== undefined ? (
                                    <span className="text-muted-foreground">
                                      {art.quantity} {art.unit} —{" "}
                                    </span>
                                  ) : null}
                                  {art.designation}
                                </span>
                                <span className="w-20 shrink-0 whitespace-nowrap text-right tabular-nums sm:w-24">
                                  {formatTndAmount(art.estimatedCost)}
                                </span>
                                <RealizationBar pct={art.realizationPct} />
                              </li>
                            ))}
                          </ul>
                        </div>
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

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <RingGauge
            label="Chantier finançable"
            value={analysis.projectReachablePct}
            hint="du coût total du projet"
            stroke={
              analysis.projectReachablePct >= 80
                ? "stroke-emerald-500 text-emerald-600 dark:text-emerald-400"
                : analysis.projectReachablePct >= 50
                  ? "stroke-amber-500 text-amber-600 dark:text-amber-400"
                  : "stroke-red-500 text-red-600 dark:text-red-400"
            }
          />
          <RingGauge
            label="Budget consommé"
            value={analysis.budgetUsedPct}
            hint={formatTndAmount(analysis.usedBudget)}
            stroke="stroke-primary text-primary"
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
  budgetAnalysis,
  onBudgetAnalyze,
  budgetAvailable,
  onBudgetChange,
  projectContextLabel,
}: {
  /** Plan d'optimisation calculé en amont — plus affiché sur cette page. */
  plan: OptimizationPlan;
  budgetAnalysis: BudgetAnalysis | null;
  onBudgetAnalyze?: (budget: number) => void;
  budgetAvailable?: number;
  onBudgetChange?: (value: string) => void;
  projectContextLabel?: string;
}) {
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
    </div>
  );
}
