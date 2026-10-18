// ============================================================================
// AIDE À LA DÉCISION — Budget / Capacité de construction
// ----------------------------------------------------------------------------
// Carte de saisie du budget puis le module d'aide à la décision
// « Capacité de construction » (`CapacityDecisionCard`) : sélection des
// travaux, % global de construction, plan de construction, priorisation IA,
// simulations +10/+20/+30 TND,
// comparaison Économique / Standard / Premium.
//
// Le parcours d'optimisation (« Coût total » + « Optimisez votre projet »)
// n'est plus affiché ici ; le plan d'optimisation reste calculé en amont par
// le module parent.
//
// L'« Analyse de vos matériaux » n'est plus ici : elle est rendue sous la carte
// « Confiance » de la page « Coût de construction ».
// ============================================================================

import { Coins, Info, Sparkles, TrendingDown } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MIN_BUDGET_TND,
  formatPercent,
  formatTndAmount,
  type BudgetAnalysis,
  type QuantitatifLot,
} from "@/lib/budgetEngine";
import type { OptimizationPlan } from "@/lib/optimizationEngine";
import type { ScenarioTotal } from "@/lib/constructionPlanEngine";

import { CapacityDecisionCard } from "@/components/decision/CapacityDecisionCard";
import { CircularProgress } from "@/components/decision/CircularProgress";

/** Couleur cohérente avec le niveau — plus c'est élevé, mieux c'est. */
function higherBetterTone(pct: number): "success" | "warning" | "danger" {
  if (pct >= 80) return "success";
  if (pct >= 50) return "warning";
  return "danger";
}

/** Budget engagé : marge restante (vert) vs limite approchée (ambre). */
function budgetUsageTone(pct: number): "success" | "warning" {
  return pct > 90 ? "warning" : "success";
}

export function OptimizationSection({
  plan,
  budgetAnalysis,
  onBudgetAnalyze,
  budgetAvailable,
  onBudgetChange,
  projectId,
  lots,
  scenarioTotals,
  projectContextLabel,
  complementaryWorksEnabled,
}: {
  /** Plan d'optimisation — indicateurs et pistes d'économies existants. */
  plan: OptimizationPlan;
  budgetAnalysis: BudgetAnalysis | null;
  /** Identifiant du projet — travaux personnalisés enregistrés pour ce projet. */
  projectId?: string;
  onBudgetAnalyze?: (budget: number) => void;
  budgetAvailable?: number;
  onBudgetChange?: (value: string) => void;
  /** Lots du Quantitatif détaillé (source des postes manquant au coût). */
  lots?: QuantitatifLot[];
  /** Totaux des scénarios d'estimation (Économique / Standard / Premium). */
  scenarioTotals?: ScenarioTotal[];
  projectContextLabel?: string;
  /** Travaux complémentaires accessibles (type de projet + surface ≥ 120 m²). */
  complementaryWorksEnabled?: boolean;
}) {
  const budgetInputValue = typeof budgetAvailable === "number" ? String(budgetAvailable) : "";
  const budgetNumber = Number(budgetInputValue);
  const budgetTooLow = budgetInputValue !== "" && budgetNumber > 0 && budgetNumber < MIN_BUDGET_TND;
  const budgetValid = Number.isFinite(budgetNumber) && budgetNumber >= MIN_BUDGET_TND;

  // Pistes d'économies existantes (déjà calculées par le moteur d'optimisation).
  const savingLevers = plan.levers.filter((l) => l.saving > 0).slice(0, 3);
  const showSavings = plan.available && plan.economieRealisable > 0;
  const showIndicators = budgetAnalysis?.available === true || plan.available;

  return (
    <div className="space-y-3">
      {/* ── Saisie du budget ── */}
      <Card className="border-border/60 bg-card shadow-elev-1">
        <CardContent className="p-4">
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Coins className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tracking-tight">Quel est votre budget disponible ?</p>
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

      {/* ── §4 Indicateurs circulaires — pourcents essentiels (données
          existantes uniquement, aucun pourcentage inventé) ── */}
      {showIndicators ? (
        <section aria-labelledby="decision-indicators-title">
          <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
            <h2
              id="decision-indicators-title"
              className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Indicateurs essentiels
            </h2>
            <p className="text-[10px] text-muted-foreground/70">
              calculés à partir de vos données réelles
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {budgetAnalysis?.available ? (
              <CircularProgress
                value={budgetAnalysis.projectReachablePct}
                displayValue={formatPercent(budgetAnalysis.projectReachablePct)}
                label="Projet finançable"
                description="part du coût total couverte par votre budget"
                tone={higherBetterTone(budgetAnalysis.projectReachablePct)}
              />
            ) : null}
            {budgetAnalysis?.available ? (
              <CircularProgress
                value={budgetAnalysis.budgetUsedPct}
                displayValue={formatPercent(budgetAnalysis.budgetUsedPct)}
                label="Budget engagé"
                description="part du budget disponible consommée par le programme finançable"
                tone={budgetUsageTone(budgetAnalysis.budgetUsedPct)}
              />
            ) : null}
            {plan.available ? (
              <CircularProgress
                value={plan.scoreOptimisation}
                displayValue={formatPercent(plan.scoreOptimisation)}
                label="Potentiel d'optimisation"
                description="capacité d'optimisation des coûts de votre projet"
                tone={higherBetterTone(plan.scoreOptimisation)}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ── §5 Optimisation des coûts — pistes d'économies existantes
          (montants déjà calculés par le moteur ; économies POTENTIELLES,
          jamais présentées comme garanties) ── */}
      {showSavings ? (
        <Card className="border-emerald-500/25 bg-emerald-500/[0.04] shadow-elev-1">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingDown className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold tracking-tight">Optimisation des coûts</p>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Pistes d'économies détectées sur vos matériaux — estimations potentielles,
                  sous réserve de vos choix.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-500/25 bg-background p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Économie potentielle
                </p>
                <p className="mt-0.5 text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatTndAmount(plan.economieRealisable)}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Coût optimisé estimé
                </p>
                <p className="mt-0.5 text-base font-bold tabular-nums">
                  {formatTndAmount(plan.coutOptimise)}
                </p>
              </div>
            </div>

            {savingLevers.length > 0 ? (
              <ul className="space-y-1.5">
                {savingLevers.map((lever) => (
                  <li
                    key={lever.key}
                    className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border/40 bg-background px-2.5 py-2"
                  >
                    <span className="min-w-0 text-[11.5px] font-semibold">{lever.title}</span>
                    <span className="ml-auto flex shrink-0 items-center gap-2">
                      <span className="text-[11.5px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        −{formatTndAmount(lever.saving)}
                      </span>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                        {formatPercent(lever.savingPct)}
                      </span>
                    </span>
                    {lever.note ? (
                      <span className="w-full text-[10px] leading-snug text-muted-foreground">
                        {lever.note}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="text-[10px] leading-snug text-muted-foreground">{plan.explainer}</p>
          </CardContent>
        </Card>
      ) : null}

      {/* ── §6 Capacité de construction (module d'aide à la décision) ── */}
      {budgetAnalysis?.available ? (
        <CapacityDecisionCard
          analysis={budgetAnalysis}
          projectId={projectId}
          lots={lots}
          scenarioTotals={scenarioTotals}
          complementaryWorksEnabled={complementaryWorksEnabled}
        />
      ) : budgetAnalysis?.reason ? (
        <Card className="border-border/60 bg-card">
          <CardContent className="flex items-start gap-2.5 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <h3 className="text-sm font-semibold">Capacité de construction</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{budgetAnalysis.reason}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
