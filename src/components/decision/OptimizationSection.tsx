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

import { Coins, Info, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MIN_BUDGET_TND,
  formatTndAmount,
  type BudgetAnalysis,
  type QuantitatifLot,
} from "@/lib/budgetEngine";
import type { OptimizationPlan } from "@/lib/optimizationEngine";
import type { ScenarioTotal } from "@/lib/constructionPlanEngine";

import { CapacityDecisionCard } from "@/components/decision/CapacityDecisionCard";

export function OptimizationSection({
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
  /** Plan d'optimisation calculé en amont — plus affiché sur cette page. */
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

  return (
    <div className="space-y-4">
      {/* ── Saisie du budget ── */}
      <Card className="rounded-2xl border-border/60 bg-card shadow-elev-1">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Coins className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold leading-tight tracking-tight sm:text-lg">
                Quel est votre budget disponible ?
              </h3>
              <p className="mt-1 text-xs leading-snug text-muted-foreground sm:text-[13px]">
                Saisissez votre budget total pour ce projet. L'analyse de la capacité de construction
                est calculée automatiquement à partir de votre Quantitatif.
              </p>
              {projectContextLabel ? (
                <p className="mt-1 text-[11px] text-muted-foreground">{projectContextLabel}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                className="text-[11.5px] font-semibold text-foreground"
                htmlFor="budget-available"
              >
                Budget total
              </label>
              <div className="relative mt-1.5">
                <Input
                  id="budget-available"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1000"
                  value={budgetInputValue}
                  onChange={(e) => onBudgetChange?.(e.target.value)}
                  placeholder={`${MIN_BUDGET_TND} TND minimum`}
                  className="h-12 rounded-xl pr-14 text-base font-semibold tabular-nums"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-semibold text-muted-foreground">
                  TND
                </span>
              </div>
              <p
                className={cn(
                  "mt-1.5 text-[11px] leading-snug",
                  budgetTooLow ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                )}
              >
                {budgetTooLow
                  ? `Budget minimal : ${formatTndAmount(MIN_BUDGET_TND)}. En dessous, aucun chantier structurel n'est finançable.`
                  : `Budget minimal analysable : ${formatTndAmount(MIN_BUDGET_TND)}.`}
              </p>
            </div>
            <Button
              className="h-12 w-full gap-1.5 whitespace-nowrap rounded-xl sm:w-auto"
              disabled={!budgetValid}
              onClick={() => onBudgetAnalyze?.(budgetNumber)}
            >
              <Sparkles className="h-4 w-4" />
              Analyser mon budget avec l'IA
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Capacité de construction (module d'aide à la décision) ── */}
      {budgetAnalysis?.available ? (
        <CapacityDecisionCard
          analysis={budgetAnalysis}
          projectId={projectId}
          lots={lots}
          scenarioTotals={scenarioTotals}
          complementaryWorksEnabled={complementaryWorksEnabled}
        />
      ) : budgetAnalysis?.reason ? (
        <Card className="rounded-2xl border-border/60 bg-card">
          <CardContent className="flex items-start gap-2.5 p-4 sm:p-5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <h3 className="text-sm font-semibold sm:text-base">Capacité de construction</h3>
              <p className="mt-1 text-xs leading-snug text-muted-foreground sm:text-[13px]">
                {budgetAnalysis.reason}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
