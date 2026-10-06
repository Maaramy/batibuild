// ============================================================================
// AIDE À LA DÉCISION — Budget / Capacité de construction
// ----------------------------------------------------------------------------
// Carte de saisie du budget (total + déjà dépensé + curseur d'impact) puis
// le module d'aide à la décision « Capacité de construction »
// (`CapacityDecisionCard`) : sélection des travaux, % global de construction,
// plan de construction, priorisation IA, simulations +10/+20/+30 TND,
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
} from "@/lib/budgetEngine";
import type { OptimizationPlan } from "@/lib/optimizationEngine";
import type { ScenarioTotal } from "@/lib/constructionPlanEngine";

import { CapacityDecisionCard } from "@/components/decision/CapacityDecisionCard";

/** Curseur de simulation : pas de 5 000 TND. */
const BUDGET_SLIDER_STEP_TND = 5000;
/** Amplitude minimale du curseur (TND). */
const BUDGET_SLIDER_MIN_TND = 80000;

export function OptimizationSection({
  budgetAnalysis,
  onBudgetAnalyze,
  budgetAvailable,
  onBudgetChange,
  spentBudget,
  onSpentChange,
  onBudgetSlide,
  scenarioTotals,
  projectContextLabel,
}: {
  /** Plan d'optimisation calculé en amont — plus affiché sur cette page. */
  plan: OptimizationPlan;
  budgetAnalysis: BudgetAnalysis | null;
  onBudgetAnalyze?: (budget: number) => void;
  budgetAvailable?: number;
  onBudgetChange?: (value: string) => void;
  /** Budget déjà dépensé par l'utilisateur (TND). */
  spentBudget?: number;
  onSpentChange?: (value: string) => void;
  /** Changement immédiat du budget via le curseur (sans réenregistrement). */
  onBudgetSlide?: (value: number) => void;
  /** Totaux des scénarios d'estimation (Économique / Standard / Premium). */
  scenarioTotals?: ScenarioTotal[];
  projectContextLabel?: string;
}) {
  const budgetInputValue = typeof budgetAvailable === "number" ? String(budgetAvailable) : "";
  const budgetNumber = Number(budgetInputValue);
  const safeBudgetNumber = Number.isFinite(budgetNumber) && budgetNumber > 0 ? budgetNumber : 0;
  const budgetTooLow = budgetInputValue !== "" && budgetNumber > 0 && budgetNumber < MIN_BUDGET_TND;
  const budgetValid = Number.isFinite(budgetNumber) && budgetNumber >= MIN_BUDGET_TND;

  const spentNumberRaw = Number(String(spentBudget ?? "").replace(",", "."));
  const spentNumber = Number.isFinite(spentNumberRaw) && spentNumberRaw > 0 ? spentNumberRaw : 0;
  const remainingNumber = Math.max(0, safeBudgetNumber - spentNumber);

  // Curseur : borné par le budget minimal, le coût total du projet et la
  // valeur courante — il recalcule le module entier à chaque déplacement.
  const sliderRaw = safeBudgetNumber > 0 ? safeBudgetNumber : MIN_BUDGET_TND;
  const sliderMax = Math.max(
    BUDGET_SLIDER_MIN_TND,
    Math.ceil((budgetAnalysis?.projectTotal ?? 0) / 10000) * 10000,
    sliderRaw,
  );
  const sliderValue = Math.min(sliderMax, Math.max(MIN_BUDGET_TND, sliderRaw));

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
                Saisissez votre budget total puis le montant déjà dépensé : le budget restant et l'analyse de
                la capacité de construction sont recalculés automatiquement.
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

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="sr-only" htmlFor="budget-spent">
                Budget déjà dépensé (TND)
              </label>
              <Input
                id="budget-spent"
                type="number"
                min="0"
                step="1000"
                value={spentNumber > 0 ? String(spentNumber) : ""}
                onChange={(e) => onSpentChange?.(e.target.value)}
                placeholder="0"
                className="h-10 text-base font-medium tabular-nums"
              />
              <p className="mt-1 text-[10.5px] text-muted-foreground">
                Déjà dépensé sur ce projet (chantiers engagés, acomptes versés).
              </p>
            </div>
            <div className="flex flex-col justify-center rounded-xl border border-border/40 bg-background p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Budget restant automatiquement calculé
              </p>
              <p className="text-base font-bold tabular-nums text-primary">{formatTndAmount(remainingNumber)}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatTndAmount(safeBudgetNumber)} − {formatTndAmount(spentNumber)}
              </p>
            </div>
          </div>

          {/* ── Curseur : impact d'un changement de budget ── */}
          <div className="mt-3 rounded-xl border border-border/40 bg-background p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Impact d'un changement de budget — le tableau se recalcule immédiatement
              </span>
              <span className="text-xs font-bold tabular-nums text-primary">{formatTndAmount(sliderValue)}</span>
            </div>
            <input
              type="range"
              min={MIN_BUDGET_TND}
              max={sliderMax}
              step={BUDGET_SLIDER_STEP_TND}
              value={sliderValue}
              onChange={(e) => onBudgetSlide?.(Number(e.target.value))}
              aria-label="Curseur du budget disponible"
              className="mt-1.5 w-full accent-primary"
            />
            <div className="flex justify-between text-[9.5px] tabular-nums text-muted-foreground">
              <span>{formatTndAmount(MIN_BUDGET_TND)}</span>
              <span>{formatTndAmount(sliderMax)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Capacité de construction (module d'aide à la décision) ── */}
      {budgetAnalysis?.available ? (
        <CapacityDecisionCard
          analysis={budgetAnalysis}
          spentBudget={spentNumber}
          scenarioTotals={scenarioTotals}
        />
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
