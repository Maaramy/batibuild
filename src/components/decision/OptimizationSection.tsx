// ============================================================================
// AIDE À LA DÉCISION — Budget / Capacité de construction
// ----------------------------------------------------------------------------
// Curseur de budget (50 000 → 1 000 000 TND, pas de 10 000 TND) puis le module
// d'aide à la décision « Capacité de construction » (`CapacityDecisionCard`) :
// sélection des travaux, % global de construction, plan de construction,
// priorisation IA, simulations +10/+20/+30 TND, comparaison Économique /
// Standard / Premium. Le curseur reste ajustable après l'analyse : les
// résultats sont recalculés à la volée avec les mêmes règles.
//
// Le parcours d'optimisation (« Coût total » + « Optimisez votre projet »)
// n'est plus affiché ici ; le plan d'optimisation reste calculé en amont par
// le module parent.
//
// SEUL écran de chargement animé du parcours « Aide à la décision » : il est
// affiché uniquement après le clic sur « Analyser mon budget avec l'IA »
// (design, logo, animations et durée de 3 s inchangés). Aucun chargement
// automatique n'est déclenché à l'arrivée sur la page.
//
// L'« Analyse de vos matériaux » n'est plus ici : elle est rendue sous la carte
// « Confiance » de la page « Coût de construction ».
// ============================================================================

import { Coins, Info, Loader2, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { EstimateLoadingScreen } from "@/components/EstimateLoadingScreen";
import { cn } from "@/lib/utils";
import {
  BUDGET_STEP_TND,
  MAX_BUDGET_TND,
  MIN_BUDGET_TND,
  clampBudgetTnd,
  formatTndAmount,
  type BudgetAnalysis,
  type QuantitatifLot,
} from "@/lib/budgetEngine";
import type { OptimizationPlan } from "@/lib/optimizationEngine";
import type { ScenarioTotal } from "@/lib/constructionPlanEngine";

import { CapacityDecisionCard } from "@/components/decision/CapacityDecisionCard";

const NOOP = () => undefined;

export function OptimizationSection({
  budgetAnalysis,
  onBudgetAnalyze,
  budgetAvailable,
  onBudgetChange,
  onBudgetCommit,
  budgetAnalyzing,
  budgetAnalysisError,
  budgetAnalysisSettled,
  budgetAnalysisAttempt,
  onBudgetAnimationComplete,
  onBudgetRetry,
  projectName,
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
  /** Modification en temps réel du curseur (résultats actualisés à la volée). */
  onBudgetChange?: (value: number) => void;
  /** Fin de glissement : persistance du budget (sans animation). */
  onBudgetCommit?: (value: number) => void;
  /** Analyse IA en cours : bouton désactivé, animation affichée. */
  budgetAnalyzing?: boolean;
  /** Message d'erreur réel (anim + « Réessayer »). */
  budgetAnalysisError?: string | null;
  /** Le résultat réel est calculé et enregistré : l'animation peut se terminer. */
  budgetAnalysisSettled?: boolean;
  /** Incrémenté à chaque tentative : remonte l'animation (3 s). */
  budgetAnalysisAttempt?: number;
  onBudgetAnimationComplete?: () => void;
  onBudgetRetry?: () => void;
  projectName?: string;
  /** Lots du Quantitatif détaillé (source des postes manquant au coût). */
  lots?: QuantitatifLot[];
  /** Totaux des scénarios d'estimation (Économique / Standard / Premium). */
  scenarioTotals?: ScenarioTotal[];
  projectContextLabel?: string;
  /** Travaux complémentaires accessibles (type de projet + surface ≥ 120 m²). */
  complementaryWorksEnabled?: boolean;
}) {
  // Budget affiché : 50 000 TND par défaut, ou le budget enregistré déjà
  // normalisé par le module. Toute valeur est bornée au curseur.
  const rawBudget = typeof budgetAvailable === "number" && Number.isFinite(budgetAvailable)
    ? budgetAvailable
    : MIN_BUDGET_TND;
  const budgetNumber = clampBudgetTnd(rawBudget);
  const budgetTooLow = rawBudget < MIN_BUDGET_TND;
  const budgetValid = !budgetTooLow && Number.isFinite(budgetNumber) && budgetNumber >= MIN_BUDGET_TND;

  return (
    <div className="space-y-4">
      {/* ── Budget disponible — curseur toujours ajustable, y compris après
          l'analyse : les résultats se mettent à jour sans nouveau chargement. ── */}
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
                Faites glisser le curseur pour ajuster votre budget total. L'analyse de la capacité
                de construction est calculée automatiquement à partir de votre Quantitatif.
              </p>
              {projectContextLabel ? (
                <p className="mt-1 text-[11px] text-muted-foreground">{projectContextLabel}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <label
                className="text-[11.5px] font-semibold text-foreground"
                htmlFor="budget-available"
              >
                Budget total
              </label>
              <p
                id="budget-available-value"
                aria-live="polite"
                className="text-lg font-bold leading-none tabular-nums text-foreground sm:text-xl"
              >
                {formatTndAmount(budgetNumber)}
              </p>
            </div>

            <Slider
              id="budget-available"
              min={MIN_BUDGET_TND}
              max={MAX_BUDGET_TND}
              step={BUDGET_STEP_TND}
              value={[budgetNumber]}
              onValueChange={([value]) => onBudgetChange?.(value)}
              onValueCommit={([value]) => onBudgetCommit?.(value)}
              disabled={budgetAnalyzing}
              aria-label="Budget total disponible"
              aria-valuetext={formatTndAmount(budgetNumber)}
              className="py-1"
            />

            <div className="flex items-center justify-between gap-3 text-[10px] font-medium tabular-nums text-muted-foreground">
              <span>Min. {formatTndAmount(MIN_BUDGET_TND)}</span>
              <span>Max. {formatTndAmount(MAX_BUDGET_TND)}</span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p
                className={cn(
                  "text-[11px] leading-snug",
                  budgetTooLow ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                )}
                role={budgetTooLow ? "alert" : undefined}
              >
                {budgetTooLow
                  ? `Budget insuffisant : le minimum requis est de ${formatTndAmount(MIN_BUDGET_TND)}.`
                  : `Budget minimal analysable : ${formatTndAmount(MIN_BUDGET_TND)}.`}
              </p>
              <Button
                className="h-11 w-full shrink-0 gap-1.5 whitespace-nowrap rounded-xl sm:h-10 sm:w-auto"
                disabled={!budgetValid || budgetAnalyzing}
                aria-busy={budgetAnalyzing || undefined}
                onClick={() => onBudgetAnalyze?.(budgetNumber)}
              >
                {budgetAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {budgetAnalyzing
                  ? "Analyse en cours…"
                  : "Analyser mon budget avec l'IA"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Chargement animé (même design que l'estimation) ── */}
      {budgetAnalyzing || budgetAnalysisError ? (
        <EstimateLoadingScreen
          key={budgetAnalysisAttempt ?? 0}
          projectName={projectName}
          durationMs={3000}
          title="BatiBuild analyse votre budget"
          description="Comparaison de votre budget disponible avec les montants réels du projet — surface, région, scénario et matériaux."
          progressLabel="Progression de l'analyse budgétaire"
          pending={!budgetAnalysisSettled}
          error={budgetAnalysisError ?? null}
          onRetry={onBudgetRetry}
          onComplete={onBudgetAnimationComplete ?? NOOP}
        />
      ) : null}

      {/* ── Capacité de construction (module d'aide à la décision) ── */}
      {!budgetAnalyzing && !budgetAnalysisError && budgetAnalysis?.available ? (
        <CapacityDecisionCard
          analysis={budgetAnalysis}
          projectId={projectId}
          lots={lots}
          scenarioTotals={scenarioTotals}
          complementaryWorksEnabled={complementaryWorksEnabled}
        />
      ) : !budgetAnalyzing && !budgetAnalysisError && budgetAnalysis?.reason ? (
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
