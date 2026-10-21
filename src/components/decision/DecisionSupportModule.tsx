// ============================================================================
// AIDE À LA DÉCISION — module « Intelligence prédictive IA »
// ----------------------------------------------------------------------------
// Copilote financier & achats du projet. Le module est affiché sur la page
// DÉDIÉE « Aide à la décision » (étape n°2 du parcours du groupe A) : il a
// été retiré de la page de résultat « Coût estimatif ».
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
//
// • Contenu : le module de budget (« Capacité de construction ») uniquement.
//   Le parcours « Optimisez votre projet » et le bloc « Coût total » ont été
//   retirés de cette page ; l'analyse détaillée des matériaux reste affichée
//   dans « Coût de construction » (sous la carte « Confiance »).
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import { useQuery } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Info,
  Lock,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { predictiveIntelligence } from "@/convex/materialSelectionEngine";
import {
  buildMaterialIntelligence,
  type CategoryTrendRow,
  type MaterialTrendRow,
  type PriceListRow,
  type SupplierMatch,
} from "@/lib/materialIntelligence";

import { OptimizationSection } from "@/components/decision/OptimizationSection";
import { buildOptimizationPlan, type OptimizationPlan } from "@/lib/optimizationEngine";
import type { ScenarioTotal } from "@/lib/constructionPlanEngine";
import { buildBudgetAnalysis, type BudgetAnalysis } from "@/lib/budgetEngine";
import {
  buildDecisionAnalysis,
  type DecisionAnalysis,
} from "@/lib/decisionAnalysis";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EstimateLoadingScreen } from "@/components/EstimateLoadingScreen";
import { decisionSupportLoadingSteps } from "@/lib/projectJourney";

// ── État verrouillé (hors forfait Client Pro) ───────────────────────────────

function DecisionLocked() {
  return (
    <Card className="border border-border/40 bg-background/60">
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Lock className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold">
            Intelligence prédictive
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
  /** Coût au m² du scénario, sans imprévus (coût réel, modules résultat). */
  costPerM2?: number;
  /** Libellé du scénario retenu (Économique / Standard / Premium / Personnalisé). */
  scenarioLabel: string;
  /** Totaux des scénarios d'estimation pour la comparaison du module budget. */
  scenarioTotals?: ScenarioTotal[];
  /**
   * Travaux complémentaires accessibles ? (type de projet logement /
   * immobilier neuf ET surface couverte ≥ 120 m²). Masqués sinon.
   */
  complementaryWorksEnabled?: boolean;
  /**
   * Horodatage du début du chargement de la page : l'écran par étapes reprend
   * l'animation déjà commencée au lieu de redémarrer (aucun flash).
   */
  loadingStartedAt?: number;
  /** Résultats du budget affichés ? (les cartes projet / saisie sont masquées.) */
  onBudgetResultsDisplayed?: (displayed: boolean) => void;
}

export function DecisionSupportModule({
  projectId,
  projectName,
  projectTypeLabel,
  regionLabel,
  surface,
  projectTotal,
  costPerM2,
  scenarioLabel,
  scenarioTotals,
  complementaryWorksEnabled,
  loadingStartedAt,
  onBudgetResultsDisplayed,
}: DecisionSupportModuleProps) {
  const { hash } = useLocation();
  // Même décision serveur que la page : GROUPE A + Client Pro actif. Aucune
  // query du module n'est lancée si l'accès est refusé (le serveur refuserait
  // de toute façon chaque lecture/écriture).
  const access = useQuery(api.decisionSupportAccess.getProjectDecisionSupportAccess, {
    projectId: projectId as Id<"projects">,
  });
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

  // ── Optimisation — couche complémentaire au-dessus de l'analyse matériaux ─
  // Aucun calcul existant n'est touché : le moteur lit l'analyse matériau-par-
  // matériau (et les sorties déjà produites) et en déduit les opportunités.
  const optimization = useMemo<OptimizationPlan | null>(() => {
    if (!materialIntel || !workspaceQuery || !analysis) return null;
    return buildOptimizationPlan({
      intel: materialIntel,
      workspace: workspaceQuery.workspace,
      analysis,
      projectTotal,
      scenario: workspaceQuery.workspace.scenario,
      scenarioLabel,
    });
  }, [materialIntel, workspaceQuery, analysis, projectTotal, scenarioLabel]);

  // ── Budget disponible : analyse « capacité de construction » ───────────
  // Le budget saisi par l'utilisateur est la SEULE donnée qu'il apporte ;
  // tout le reste est recalculé à partir du Quantitatif réel du projet.
  const budgetContext = useQuery(
    api.decisionSupport.getProjectBudgetContext,
    allowed ? { projectId: projectId as Id<"projects"> } : "skip",
  );
  const savedBudget = useQuery(
    api.decisionSupport.getBudgetAnalysis,
    allowed ? { projectId: projectId as Id<"projects"> } : "skip",
  );
  const saveBudget = useMutation(api.decisionSupport.saveBudgetAnalysis);

  const [budgetAvailable, setBudgetAvailable] = useState<number | null>(null);
  const [analyzedBudget, setAnalyzedBudget] = useState<number | null>(null);

  // Restauration du dernier budget analysé pour ce projet.
  useEffect(() => {
    if (savedBudget === undefined || analyzedBudget !== null) return;
    if (typeof savedBudget?.budgetAvailable === "number" && savedBudget.budgetAvailable > 0) {
      setAnalyzedBudget(savedBudget.budgetAvailable);
      setBudgetAvailable(savedBudget.budgetAvailable);
    }
  }, [savedBudget, analyzedBudget]);

  const budgetAnalysis = useMemo<BudgetAnalysis | null>(() => {
    const ctx = budgetContext;
    if (!ctx || analyzedBudget === null || analyzedBudget <= 0) return null;
    return buildBudgetAnalysis({
      projectId,
      userId: ctx.userId,
      projectName: projectName ?? ctx.projectName,
      scenarioLabel,
      projectTotal,
      costPerM2,
      budgetAvailable: analyzedBudget,
      breakdown: ctx.breakdown,
      lots: ctx.lots,
      surface,
    });
  }, [budgetContext, analyzedBudget, projectId, projectName, scenarioLabel, projectTotal, costPerM2, surface]);

  // ── Analyse budgétaire : animation de 3 s + résultat réel ────────────────
  // Le calcul reste EXACTEMENT `buildBudgetAnalysis` (mêmes données, mêmes
  // montants) ; l'animation est purement visuelle. Le résultat n'est affiché
  // qu'après la fin de l'animation ET la persistance réussie.
  const [budgetPhase, setBudgetPhase] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [budgetSettled, setBudgetSettled] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [budgetAttempt, setBudgetAttempt] = useState(0);
  const lastBudgetRef = useRef<number | null>(null);
  const budgetRunRef = useRef(0);

  const startBudgetAnalysis = async (budget: number) => {
    if (budgetPhase === "loading") return;
    const value = Math.max(0, Math.round(budget));
    const ctx = budgetContext;
    lastBudgetRef.current = value;

    setBudgetError(null);
    setBudgetSettled(false);
    setBudgetPhase("loading");
    setBudgetAttempt((n) => n + 1);

    const runId = ++budgetRunRef.current;
    try {
      if (!ctx) {
        throw new Error(
          "Le Quantitatif détaillé du projet n'est pas encore disponible.",
        );
      }
      const analysis = buildBudgetAnalysis({
        projectId,
        userId: ctx.userId,
        projectName: projectName ?? ctx.projectName,
        scenarioLabel,
        projectTotal,
        costPerM2,
        budgetAvailable: value,
        breakdown: ctx.breakdown,
        lots: ctx.lots,
        surface,
      });
      // Le résultat est disponible immédiatement, mais l'affichage attend la
      // fin de l'animation de 3 s (gérée par l'écran de chargement).
      setAnalyzedBudget(value);
      await saveBudget({
        projectId: projectId as Id<"projects">,
        budgetAvailable: value,
        result: {
          projectTotal: analysis.projectTotal,
          scenarioLabel: analysis.scenarioLabel,
          analyzedAt: analysis.generatedAt,
          usedBudget: analysis.usedBudget,
          remainingBudget: analysis.remainingBudget,
          projectReachablePct: analysis.projectReachablePct,
          realisableCategories: analysis.statusSummary.realisable.map((l) => l.categoryLabel),
          partielCategories: analysis.statusSummary.partiel.map((l) => l.categoryLabel),
          reportCategories: analysis.statusSummary.report.map((l) => l.categoryLabel),
          scenarios: analysis.scenarios.map((s) => ({
            scenario: s.scenario,
            budget: s.budget,
            progressPct: s.progressPct,
            remainingToFund: s.remainingToFund,
          })),
          recommendation: analysis.recommendation,
          summarySentence: analysis.summarySentence,
        },
      });
      // Tentative obsolète (nouvelle analyse ou démontage) : on n'écrase rien.
      if (runId !== budgetRunRef.current) return;
      setBudgetSettled(true);
    } catch (error) {
      if (runId !== budgetRunRef.current) return;
      const message = error instanceof Error ? error.message : "";
      setBudgetError(
        message && /abonnement|acc[eè]s|client\s*pro/i.test(message)
          ? message
          : "L'analyse budgétaire n'a pas pu aboutir. Vos données de projet sont conservées — vérifiez votre connexion puis réessayez.",
      );
      setBudgetPhase("error");
    }
  };

  const handleBudgetAnimationComplete = useCallback(() => {
    setBudgetPhase("ready");
  }, []);

  const handleBudgetRetry = () => {
    if (lastBudgetRef.current == null) return;
    void startBudgetAnalysis(lastBudgetRef.current);
  };

  const handleDecisionLoadingComplete = useCallback(() => {}, []);

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
  // Le chargement dure tant que les données RÉELLES utilisées par l'analyse
  // (quantitatif, marché, prix) ne sont pas arrivées : aucun résultat partiel
  // ni carte vide n'est affiché entre-temps.
  const loading =
    access === undefined ||
    (allowed &&
      (workspaceQuery === undefined ||
        trends === undefined ||
        priceList === undefined ||
        materialTrends === undefined ||
        committedSignature === null));

  // « Résultats affichés » = exactement la condition de rendu de « Capacité de
  // construction » : analyse prédictive terminée, budget analysé, animation
  // finie, aucune erreur. La page en déduit le masquage de la carte projet et
  // de la carte de saisie du budget (les données restent en mémoire et en base).
  const budgetResultsDisplayed =
    !loading &&
    budgetPhase !== "loading" &&
    budgetError === null &&
    Boolean(budgetAnalysis?.available);
  useEffect(() => {
    onBudgetResultsDisplayed?.(budgetResultsDisplayed);
  }, [budgetResultsDisplayed, onBudgetResultsDisplayed]);

  if (access !== undefined && !allowed) {
    return (
      <section id="aide-a-la-decision" className="scroll-mt-24 space-y-3">
        <DecisionLocked />
      </section>
    );
  }

  if (loading) {
    return (
      <section id="aide-a-la-decision" className="scroll-mt-24 space-y-3">
        {/* Même écran, même design et mêmes transitions que le chargement des
            résultats d'estimation ; seuls les intitulés d'étapes changent. */}
        <EstimateLoadingScreen
          pending
          startedAt={loadingStartedAt}
          title="BatiBuild prépare votre aide à la décision"
          description="Analyse prédictive du Quantitatif, des prix réels et du budget de votre projet."
          steps={decisionSupportLoadingSteps()}
          progressLabel="Progression de l'aide à la décision"
          readyLabel="Analyse prête, affichage des résultats…"
          waitingLabel="Calculs en cours — attente des données réelles…"
          waitingDetail="Finalisation de l'analyse prédictive…"
          onComplete={handleDecisionLoadingComplete}
        />
      </section>
    );
  }

  if (!ready || !analysis || !workspaceQuery) {
    return (
      <section id="aide-a-la-decision" className="scroll-mt-24 space-y-3">
        <Card className="border-border/60 bg-card">
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

      {!a.available && (
        <div className="flex items-start gap-2 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/[0.05] p-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-[11px] text-amber-800 dark:text-amber-200">
            {a.reason ?? "Données insuffisantes pour établir une prévision fiable."} Les analyses ci-dessous
            reposent uniquement sur les données réelles du Quantitatif du projet.
          </p>
        </div>
      )}

      {/* L'analyse détaillée des matériaux est affichée dans « Coût de
          construction » (sous la carte « Confiance »). Ici, elle alimente
          uniquement le moteur d'optimisation — sans double affichage. */}

      {/* ── Budget + optimisation — leviers, simulation, validation ── */}
      {optimization && (
        <OptimizationSection
          plan={optimization}
          budgetAnalysis={budgetAnalysis}
          budgetAvailable={budgetAvailable ?? undefined}
          onBudgetChange={(value) => setBudgetAvailable(value === "" ? null : Number(value))}
          onBudgetAnalyze={(value) => {
            void startBudgetAnalysis(value);
          }}
          budgetAnalyzing={budgetPhase === "loading"}
          budgetAnalysisError={budgetError}
          budgetAnalysisSettled={budgetSettled}
          budgetAnalysisAttempt={budgetAttempt}
          onBudgetAnimationComplete={handleBudgetAnimationComplete}
          onBudgetRetry={handleBudgetRetry}
          projectName={projectName}
          projectId={projectId}
          lots={budgetContext?.lots ?? undefined}
          scenarioTotals={scenarioTotals}
          complementaryWorksEnabled={complementaryWorksEnabled}
          projectContextLabel={
            [
              projectTypeLabel,
              regionLabel,
              surface ? `${surface} m²` : null,
              scenarioLabel,
            ]
              .filter(Boolean)
              .join(" · ") || undefined
          }
        />
      )}
    </section>
  );
}
