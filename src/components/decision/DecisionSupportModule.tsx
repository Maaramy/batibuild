// ============================================================================
// AIDE À LA DÉCISION — module « Intelligence prédictive IA »
// ----------------------------------------------------------------------------
// Copilote financier & achats du projet. Le module est affiché sur la page
// DÉDIÉE « Aide à la décision » (étape n°2 du parcours du groupe A) : il a
// été retiré de la page de résultat « Coût estimatif ».
//
// • AUCUN CHARGEMENT AUTOMATIQUE : à l'arrivée, le module n'affiche ni écran
//   animé ni analyse. Un squelette discret couvre l'attente des données réelles
//   puis la carte de saisie du budget s'affiche. L'écran de chargement animé de
//   Batibuild n'apparaît qu'au clic sur « Analyser mon budget avec l'IA » —
//   cette action est exclusivement utilisateur (`OptimizationSection`).
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
import {
  MAX_BUDGET_TND,
  MIN_BUDGET_TND,
  buildBudgetAnalysis,
  clampBudgetTnd,
  formatTndAmount,
  initialBudgetTnd,
  type BudgetAnalysis,
} from "@/lib/budgetEngine";
import {
  buildDecisionAnalysis,
  type DecisionAnalysis,
} from "@/lib/decisionAnalysis";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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

  // Valeur initiale : 50 000 TND, sauf budget déjà enregistré et valide.
  const [budgetAvailable, setBudgetAvailable] = useState<number>(() =>
    initialBudgetTnd(null),
  );
  const [analyzedBudget, setAnalyzedBudget] = useState<number | null>(null);

  // Restauration du dernier budget analysé pour ce projet. Un budget hors des
  // bornes du curseur n'est pas repris : la valeur initiale de 50 000 TND reste
  // appliquée, conformément à la règle de sélection.
  useEffect(() => {
    if (savedBudget === undefined || analyzedBudget !== null) return;
    const saved = Number(savedBudget?.budgetAvailable);
    if (!Number.isFinite(saved) || saved < MIN_BUDGET_TND || saved > MAX_BUDGET_TND) {
      return;
    }
    const restored = initialBudgetTnd(saved);
    setAnalyzedBudget(restored);
    setBudgetAvailable(restored);
  }, [savedBudget, analyzedBudget]);

  /** Analyse réelle pour un budget donné — mêmes règles, mêmes montants. */
  const buildAnalysisForBudget = useCallback(
    (value: number): BudgetAnalysis | null => {
      const ctx = budgetContext;
      if (!ctx) return null;
      return buildBudgetAnalysis({
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
    },
    [budgetContext, projectId, projectName, scenarioLabel, projectTotal, costPerM2, surface],
  );

  const budgetAnalysis = useMemo<BudgetAnalysis | null>(() => {
    if (analyzedBudget === null || analyzedBudget < MIN_BUDGET_TND) return null;
    return buildAnalysisForBudget(analyzedBudget);
  }, [analyzedBudget, buildAnalysisForBudget]);

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

  /** Persiste un résultat déjà calculé (aucun recalcul de règle). */
  const persistBudget = useCallback(
    async (value: number, analysis: BudgetAnalysis) => {
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
    },
    [projectId, saveBudget],
  );

  const startBudgetAnalysis = async (budget: number) => {
    if (budgetPhase === "loading") return;
    const raw = Number(budget);
    if (!Number.isFinite(raw) || raw < MIN_BUDGET_TND) {
      lastBudgetRef.current = raw;
      setBudgetSettled(false);
      setBudgetError(
        `Budget insuffisant : le minimum requis est de ${formatTndAmount(MIN_BUDGET_TND)}.`,
      );
      setBudgetPhase("error");
      return;
    }
    const value = clampBudgetTnd(raw);
    lastBudgetRef.current = value;
    setBudgetAvailable(value);

    setBudgetError(null);
    setBudgetSettled(false);
    setBudgetPhase("loading");
    setBudgetAttempt((n) => n + 1);

    const runId = ++budgetRunRef.current;
    try {
      const analysis = buildAnalysisForBudget(value);
      if (!analysis) {
        throw new Error(
          "Le Quantitatif détaillé du projet n'est pas encore disponible.",
        );
      }
      // Le résultat est disponible immédiatement, mais l'affichage attend la
      // fin de l'animation de 3 s (gérée par l'écran de chargement).
      setAnalyzedBudget(value);
      await persistBudget(value, analysis);
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

  /**
   * Curseur déplacé : le montant et, une fois l'analyse affichée, tous les
   * résultats (capacité de construction, répartition) sont actualisés en temps
   * réel — sans relancer l'animation de 3 s ni masquer les résultats.
   */
  const handleBudgetChange = (value: number) => {
    const next = clampBudgetTnd(value);
    lastBudgetRef.current = next;
    setBudgetAvailable(next);
    if (budgetError) {
      setBudgetError(null);
      setBudgetPhase("idle");
    }
    // Des résultats existent déjà (analyse lancée ou budget enregistré
    // restauré) : ils sont recalculés à la volée avec la nouvelle valeur.
    // Avant toute analyse, le curseur ne fait que préparer le budget.
    if (analyzedBudget !== null && budgetPhase !== "loading") {
      setAnalyzedBudget(next);
    }
  };

  /** Fin de glissement : enregistre le budget courant, sans nouveau chargement. */
  const handleBudgetCommit = (value: number) => {
    if (analyzedBudget === null || budgetPhase === "loading") return;
    const next = clampBudgetTnd(value);
    const analysis = buildAnalysisForBudget(next);
    if (!analysis) return;
    void persistBudget(next, analysis).catch(() => undefined);
  };

  const handleBudgetAnimationComplete = useCallback(() => {
    setBudgetPhase("ready");
  }, []);

  const handleBudgetRetry = () => {
    if (lastBudgetRef.current == null) return;
    void startBudgetAnalysis(lastBudgetRef.current);
  };

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

  // Analyse mémorisée : jamais relancée à chaque affichage. La signature est
  // adoptée immédiatement dès qu'elle est disponible — aucune attente
  // artificielle, donc aucun « chargement » supplémentaire avant le clic sur
  // « Analyser mon budget avec l'IA ».
  const [committedSignature, setCommittedSignature] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!signature || committedSignature !== null) return;
    setCommittedSignature(signature);
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
  // Attente des données RÉELLES utilisées par l'analyse (quantitatif, marché,
  // prix) : un squelette discret remplace le contenu, jamais l'écran de
  // chargement animé — celui-ci reste réservé au clic sur le bouton d'analyse.
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
      <section
        id="aide-a-la-decision"
        className="scroll-mt-24 space-y-3"
        aria-busy="true"
        aria-live="polite"
      >
        {/* Attente discrète : aucun écran animé avant le clic sur
            « Analyser mon budget avec l'IA », aucune analyse lancée. */}
        <span className="sr-only">Chargement des données de votre aide à la décision…</span>
        <Card className="rounded-2xl border-border/60 bg-card shadow-elev-1">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-56 max-w-full" />
                <Skeleton className="h-3 w-full max-w-md" />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
              <Skeleton className="h-12 w-full rounded-xl sm:w-56" />
            </div>
          </CardContent>
        </Card>
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
          budgetAvailable={budgetAvailable}
          onBudgetChange={handleBudgetChange}
          onBudgetCommit={handleBudgetCommit}
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
