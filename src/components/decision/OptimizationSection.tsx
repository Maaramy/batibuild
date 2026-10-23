// ============================================================================
// AIDE À LA DÉCISION — Budget / Capacité de construction
// ----------------------------------------------------------------------------
// Curseur de budget (50 000 TND → montant total TTC du scénario actif, pas de
// 10 000 TND, maximum exact atteignable) puis le module d'aide à la décision
// « Capacité de construction » (`CapacityDecisionCard`) :
// sélection des travaux, % global de construction, plan de construction,
// priorisation IA, simulations +10/+20/+30 TND, comparaison Économique /
// Standard / Premium. Le curseur reste ajustable après l'analyse : les
// résultats sont recalculés à la volée avec les mêmes règles.
//
// Le parcours d'optimisation (« Coût total » + « Optimisez votre projet »)
// n'est plus affiché ici ; le plan d'optimisation reste calculé en amont par
// le module parent.
//
// La carte de saisie du budget (« Quel est votre budget disponible ? ») est
// MASQUÉE PAR DÉFAUT dès que des résultats existent : le bouton « Voir budget »
// / « Masquer budget » placé dans l'en-tête de « Capacité de construction »
// permet de l'afficher ou de la masquer à tout moment, sans rechargement et
// sans jamais perdre la valeur saisie. Elle reste visible tant qu'aucune donnée
// analysée n'existe (sinon l'analyse serait impossible) et pendant l'analyse.
//
// SEUL écran de chargement animé du parcours « Aide à la décision » : il est
// affiché uniquement après le clic sur « Analyser mon budget avec l'IA »
// (design, logo, animations et durée de 3 s inchangés). Aucun chargement
// automatique n'est déclenché à l'arrivée sur la page. Les étapes affichées
// sont celles de l'aide à la décision (`DECISION_SUPPORT_LOADING_STEPS`) et non
// celles du parcours Journey : analyse du Quantitatif, prix & matériaux,
// capacité de construction, plan de construction, optimisation budgétaire.
//
// L'« Analyse de vos matériaux » n'est plus ici : elle est rendue sous la carte
// « Confiance » de la page « Coût de construction ».
// ============================================================================

import { useState } from "react";
import { Coins, Info, Loader2, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { EstimateLoadingScreen } from "@/components/EstimateLoadingScreen";
import { cn } from "@/lib/utils";
import {
  BUDGET_STEP_TND,
  MIN_BUDGET_TND,
  budgetSliderMaxTnd,
  clampBudgetTnd,
  formatTndAmount,
  hasAnalyzableBudgetRange,
  isBudgetAnalyzable,
  type BudgetAnalysis,
  type QuantitatifLot,
} from "@/lib/budgetEngine";
import type { OptimizationPlan } from "@/lib/optimizationEngine";
import type { ScenarioTotal } from "@/lib/constructionPlanEngine";
import { DECISION_SUPPORT_LOADING_STEPS } from "@/lib/projectJourney";

import {
  BudgetVisibilityToggle,
  CapacityDecisionCard,
} from "@/components/decision/CapacityDecisionCard";

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
  /** Montant total TTC du scénario actif : maximum dynamique du curseur. */
  projectTotal,
  /** Libellé du scénario actif (Économique / Standard / Premium / Personnalisé). */
  scenarioLabel,
  lots,
  scenarioTotals,
  projectContextLabel,
  complementaryWorksEnabled,
  onDownloadPdf,
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
  /** Montant total TTC du scénario actif — maximum du curseur, sans plafond fixe. */
  projectTotal: number;
  scenarioLabel?: string;
  /** Lots du Quantitatif détaillé (source des postes manquant au coût). */
  lots?: QuantitatifLot[];
  /** Totaux des scénarios d'estimation (Économique / Standard / Premium). */
  scenarioTotals?: ScenarioTotal[];
  projectContextLabel?: string;
  /** Travaux complémentaires accessibles (type de projet + surface ≥ 120 m²). */
  complementaryWorksEnabled?: boolean;
  /** Rapport PDF de l'aide à la décision (contrôle forfait géré par la page). */
  onDownloadPdf?: (analysis: BudgetAnalysis) => void;
}) {
  // Maximum du curseur = total TTC du scénario actif (aucun plafond fixe).
  const scenarioTotal = budgetSliderMaxTnd(projectTotal);
  const rangeAvailable = hasAnalyzableBudgetRange(projectTotal);

  // Budget affiché : 50 000 TND par défaut, ou le budget enregistré déjà
  // normalisé par le module. Toute valeur est bornée à la plage du scénario.
  const rawBudget = typeof budgetAvailable === "number" && Number.isFinite(budgetAvailable)
    ? budgetAvailable
    : MIN_BUDGET_TND;
  const budgetNumber = clampBudgetTnd(rawBudget, scenarioTotal);
  const budgetBelowMin = rawBudget < MIN_BUDGET_TND;
  const budgetValid =
    rangeAvailable && !budgetBelowMin && isBudgetAnalyzable(budgetNumber, scenarioTotal);

  // ── Visibilité de la carte du budget ────────────────────────────────────
  // `null` = choix de l'utilisateur non exprimé (état par défaut) : la carte est
  // masquée dès qu'un résultat analysé est affiché, et visible tant qu'aucune
  // analyse n'existe, pendant l'analyse et en cas d'erreur (sinon le curseur
  // disparaîtrait alors qu'il est la seule action possible). Un clic sur le
  // bouton fixe explicitement le choix — la valeur du budget n'est jamais
  // réinitialisée.
  const [budgetChoice, setBudgetChoice] = useState<boolean | null>(null);
  const budgetAutoVisible =
    budgetAnalysis === null || Boolean(budgetAnalyzing) || Boolean(budgetAnalysisError);
  const budgetVisible = budgetChoice ?? budgetAutoVisible;
  const toggleBudget = () => setBudgetChoice(!budgetVisible);

  return (
    <div className="space-y-4">
      {/* ── Budget disponible — curseur toujours ajustable, y compris après
          l'analyse : les résultats se mettent à jour sans nouveau chargement.
          Masquée par défaut dès que des résultats sont affichés. ── */}
      {budgetVisible ? (
      <Card
        id="budget-available-card"
        className="rounded-2xl border-border/60 bg-card shadow-elev-1"
      >
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
            {rangeAvailable ? (
              <>
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
                  max={scenarioTotal}
                  step={BUDGET_STEP_TND}
                  value={[budgetNumber]}
                  onValueChange={([value]) => onBudgetChange?.(value)}
                  onValueCommit={([value]) => onBudgetCommit?.(value)}
                  disabled={budgetAnalyzing}
                  aria-label="Budget total disponible"
                  aria-valuetext={formatTndAmount(budgetNumber)}
                  className="py-1"
                />

                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] font-medium tabular-nums text-muted-foreground">
                  <span>Min. {formatTndAmount(MIN_BUDGET_TND)}</span>
                  <span>
                    Max. {formatTndAmount(scenarioTotal)} · scénario{" "}
                    {scenarioLabel ?? "actif"}
                  </span>
                </div>
              </>
            ) : (
              <p
                className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-[11.5px] leading-snug text-amber-700 dark:text-amber-300"
                role="alert"
              >
                {`Le scénario ${scenarioLabel ?? "actif"} est estimé à ${formatTndAmount(scenarioTotal)} : ` +
                  `sa plage de sélection serait inférieure au budget minimal analysable de ${formatTndAmount(MIN_BUDGET_TND)}. ` +
                  "Choisissez un scénario plus élevé pour lancer l'analyse."}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p
                className={cn(
                  "text-[11px] leading-snug",
                  budgetBelowMin || !rangeAvailable
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground",
                )}
                role={budgetBelowMin ? "alert" : undefined}
              >
                {budgetBelowMin
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
      ) : null}

      {/* ── Chargement animé (même design que l'estimation) ── */}
      {budgetAnalyzing || budgetAnalysisError ? (
        <EstimateLoadingScreen
          key={budgetAnalysisAttempt ?? 0}
          projectName={projectName}
          durationMs={3000}
          title="BatiBuild analyse votre budget"
          description="Comparaison de votre budget disponible avec les montants réels du projet — surface, région, scénario et matériaux."
          progressLabel="Progression de l'analyse budgétaire"
          /* Étapes RÉELLEMENT exécutées par l'aide à la décision (même écran,
             même design, mêmes icônes) — le parcours Journey n'est plus affiché
             ici. */
          steps={DECISION_SUPPORT_LOADING_STEPS}
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
          onDownloadPdf={onDownloadPdf}
          budgetVisible={budgetVisible}
          onToggleBudget={toggleBudget}
        />
      ) : !budgetAnalyzing && !budgetAnalysisError && budgetAnalysis?.reason ? (
        <Card className="rounded-2xl border-border/60 bg-card">
          <CardContent className="flex flex-wrap items-start gap-2.5 p-4 sm:p-5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold sm:text-base">Capacité de construction</h3>
              <p className="mt-1 text-xs leading-snug text-muted-foreground sm:text-[13px]">
                {budgetAnalysis.reason}
              </p>
            </div>
            <div className="flex w-full items-center justify-end min-[420px]:w-auto">
              <BudgetVisibilityToggle visible={budgetVisible} onToggle={toggleBudget} />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
