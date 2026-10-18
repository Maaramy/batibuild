// ============================================================================
// AIDE À LA DÉCISION — page dédiée (copilote budget & achats)
// ----------------------------------------------------------------------------
// Page individuelle du parcours du projet (groupe A, étape n°2). Elle affiche
// le module de budget (« Capacité de construction ») sur les données déjà
// enregistrées du projet — aucune analyse n'est relancée ici.
//
// Le module a été RETIRÉ de la page de résultat « Coût estimatif » : il n'est
// plus affiché en extension du résultat, mais uniquement sur cette page,
// atteignable depuis l'étape « Aide à la décision » du Journey.
//
// Le coût total du scénario retenu (même valeur que « Coût estimatif ») est
// déduit du scénario persisté du projet ; il sert de contexte au module pour le
// risque de dépassement et les simulations. Le module gère lui-même son état de
// chargement, sa mise en cache et son accès réservé au forfait Client Pro.
// ============================================================================

import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "convex/react";
import { Building2, CheckCircle2, Coins, MapPin, Ruler, Wallet } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { realBuiltArea } from "@/lib/buildingLevels";
import { ProjectJourneyNav } from "@/components/ProjectJourneyNav";
import { DecisionSupportModule } from "@/components/decision/DecisionSupportModule";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/section";
import { usePageSEO } from "@/hooks/use-page-seo";
import { normalizeLegacyCategory, projectTypeLabel } from "@/convex/projectTypes";
import { isComplementaryWorkEligible } from "@/lib/customWorksCatalog";
import { REGION_LABELS } from "@/lib/projectPdf";
import {
  BUDGET_SCENARIO_LABELS,
  PERSONALIZED_SCENARIO_KEY,
  PERSONALIZED_SCENARIO_LABEL,
  type BudgetScenarioKey,
} from "@/convex/quantitatifCustomLogic";
import type { Id } from "@/convex/_generated/dataModel";
import { resolveEstimationBudget } from "@/lib/estimationBudget";
import { formatTndAmount, type BudgetAnalysis } from "@/lib/budgetEngine";
import type { ScenarioTotal } from "@/lib/constructionPlanEngine";

const SCENARIO_KEYS: BudgetScenarioKey[] = ["economique", "standard", "premium"];

export default function DecisionSupport() {
  usePageSEO({
    title: "Aide à la décision - batibuild",
    description:
      "Intelligence prédictive IA : anticipez vos achats, maîtrisez votre budget et réduisez les pertes de votre projet de construction.",
  });

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Dernière analyse de budget remontée par le module (affichage seul :
  // budget disponible + écart dans la synthèse budgétaire de la page).
  const [budgetAnalysis, setBudgetAnalysis] = useState<BudgetAnalysis | null>(null);

  const project = useQuery(
    api.projects.getProject,
    id ? { projectId: id as Id<"projects"> } : "skip",
  );

  // ── Montant TTC officiel — MÊME résolveur que le résultat d'estimation ──
  // `resolveEstimationBudget` est la source unique : scénarios corrigés des
  // imprévus, montant du scénario enregistré (Économique / Standard / Premium /
  // Personnalisé) et coût au m². Aucun recalcul indépendant ici : le montant
  // transmis est identique, au dinar près, à celui de « Coût de construction ».
  const customization = useQuery(
    api.quantitatifCustom.getCustomization,
    id ? { projectId: id as Id<"projects"> } : "skip",
  );
  const customWorksData = useQuery(
    api.customWorks.getProjectCustomWorks,
    id ? { projectId: id as Id<"projects"> } : "skip",
  );

  // Surface réellement construite : somme des surfaces de chaque niveau
  // (un étage plus petit que le RDC n'emprunte jamais la surface du RDC).
  const builtSurface = project?.surface
    ? realBuiltArea(project.surface, project.floors || 1, project.levelSurfaces)
    : 0;

  const complementaryWorksEligible = isComplementaryWorkEligible(
    normalizeLegacyCategory(project?.category as string),
    project?.surface,
  );

  const budget = useMemo(
    () =>
      resolveEstimationBudget({
        costEstimate: project?.costEstimate ?? null,
        dqeLots: ((project as any)?.dqe?.lots ?? []) as any[],
        builtSurface,
        selectedScenario: project?.selectedScenario ?? null,
        baseScenario: (customization?.baseScenario ?? "standard") as BudgetScenarioKey,
        modifications: (customization?.modifications ?? []) as any,
        removedPostes: (customization?.removedPostes ?? []) as any,
        complementaryWorks: complementaryWorksEligible ? customWorksData?.works ?? [] : [],
      }),
    [project, builtSurface, customization, customWorksData, complementaryWorksEligible],
  );

  const projectTotal = budget.selectedTotal;
  const costPerM2 = budget.selectedCostPerM2;
  const scenarioLabel =
    budget.selectedKey === PERSONALIZED_SCENARIO_KEY
      ? PERSONALIZED_SCENARIO_LABEL
      : BUDGET_SCENARIO_LABELS[budget.selectedKey as BudgetScenarioKey];

  // Totaux des 4 solutions (Économique / Standard / Premium / Personnalisé)
  // → comparaison dans le module « Capacité de construction ». Le scénario
  // Personnalisé utilise son montant RÉEL, jamais celui de son scénario de base.
  const scenarioTotals = useMemo<ScenarioTotal[]>(() => {
    const rows: ScenarioTotal[] = [];
    for (const key of SCENARIO_KEYS) {
      const totalCost = budget.scenarios?.[key]?.totalCost ?? 0;
      if (totalCost > 0) {
        rows.push({
          key,
          label: BUDGET_SCENARIO_LABELS[key],
          totalCost,
          selected: budget.selectedKey === key,
        });
      }
    }
    if (budget.personalized) {
      rows.push({
        key: PERSONALIZED_SCENARIO_KEY,
        label: PERSONALIZED_SCENARIO_LABEL,
        totalCost: budget.personalized.totals.total,
        selected: budget.selectedKey === PERSONALIZED_SCENARIO_KEY,
      });
    }
    return rows;
  }, [budget]);
  const regionLabel = project?.region
    ? REGION_LABELS[project.region] ?? project.region
    : undefined;

  return (
    <main className="min-h-screen bg-background pb-12">
      {/* Parcours du projet — l'étape « Aide à la décision » est mise en avant
          (route dédiée), avec « Étape précédente : Coût estimatif » et
          « Suivant → : Plans architecturaux AI ». */}
      <ProjectJourneyNav
        projectId={id}
        category={project?.category}
        featureLabel="Aide à la décision"
        maxWidthClassName="max-w-7xl"
      />

      <div className="mx-auto mt-5 max-w-7xl space-y-4 px-4 sm:px-6">
        {project === undefined ? (
          /* ── Chargement du projet ── */
          <LoadingState message="Chargement du projet…" />
        ) : project === null ? (
          /* ── Projet introuvable ── */
          <EmptyState
            title="Projet introuvable"
            description="Ce projet n'existe pas ou n'est pas accessible."
            action={
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
                Retour au tableau de bord
              </Button>
            }
          />
        ) : !budget.scenarios && !budget.personalized ? (
          /* ── Estimation non disponible : jamais de montant par défaut ── */
          <EmptyState
            title="Estimation indisponible"
            description="Le coût de construction de ce projet n'a pas encore été calculé. Lancez l'estimation depuis la page du projet : le montant officiel sera repris ici automatiquement."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/dashboard/project/${id}`)}
              >
                Aller à l'estimation du coût
              </Button>
            }
          />
        ) : (
          <>
            {/* ── En-tête : titre, explication, accès aux actions ── */}
            <PageHeader
              title="Aide à la décision"
              subtitle="Optimisez votre budget avec vos données réelles."
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={() => navigate(`/dashboard/project/${id}`)}
                >
                  <Coins className="h-4 w-4" />
                  Coût estimatif
                </Button>
              }
            />

            {/* ── Résumé du projet : type, surface, scénario ── */}
            <Card className="border-border/60 bg-card shadow-elev-1">
              <CardContent className="p-4 sm:p-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold tracking-tight">
                      {project.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {projectTypeLabel(project.category)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <SynthStat
                    icon={Ruler}
                    label="Surface"
                    value={builtSurface ? `${builtSurface} m²` : "—"}
                  />
                  <SynthStat icon={MapPin} label="Région" value={regionLabel ?? "—"} />
                  <SynthStat label="Scénario" value={scenarioLabel} />
                </div>
              </CardContent>
            </Card>

            {/* ── Synthèse budgétaire : montant total du scénario actif.
                Même source que « Estimation des coûts de construction »
                (`resolveEstimationBudget`) — aucun recalcul indépendant. ── */}
            <Card className="overflow-hidden border-primary/25 bg-primary/[0.04] shadow-elev-1">
              <CardContent className="space-y-3 p-4 sm:p-5">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  <Wallet className="h-4 w-4" />
                  Synthèse budgétaire
                </p>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Coût total du scénario sélectionné
                  </p>
                  <p className="mt-1 text-[28px] font-bold leading-tight tracking-tight tabular-nums sm:text-4xl lg:text-5xl">
                    {formatTndAmount(projectTotal)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    Scénario : {scenarioLabel}
                  </span>
                  {builtSurface > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium text-foreground">
                      <Ruler className="h-3 w-3 text-muted-foreground" />
                      {builtSurface} m²
                    </span>
                  ) : null}
                  {typeof costPerM2 === "number" && costPerM2 > 0 ? (
                    <span className="inline-flex items-center rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium tabular-nums text-foreground">
                      {formatTndAmount(costPerM2)}/m²
                    </span>
                  ) : null}
                </div>

                {/* Budget disponible + écart : uniquement si une analyse existe */}
                {budgetAnalysis?.available ? (
                  <div className="grid grid-cols-1 gap-2 rounded-xl border border-border/60 bg-background p-3 sm:grid-cols-2">
                    <div>
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <Coins className="h-3.5 w-3.5" /> Budget disponible
                      </p>
                      <p className="mt-0.5 text-base font-bold tabular-nums">
                        {formatTndAmount(budgetAnalysis.availableBudget)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {budgetAnalysis.gapToProjectTotal > 0
                          ? "Reste à financer"
                          : "Écart avec le budget"}
                      </p>
                      {budgetAnalysis.gapToProjectTotal > 0 ? (
                        <p className="mt-0.5 text-base font-bold tabular-nums text-amber-600 dark:text-amber-400">
                          {formatTndAmount(budgetAnalysis.gapToProjectTotal)}
                        </p>
                      ) : (
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          Budget couvrant le coût estimé
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* ── Module budget / capacité de construction ── */}
            <DecisionSupportModule
              projectId={project._id}
              projectName={project.name}
              projectTypeLabel={projectTypeLabel(project.category)}
              regionLabel={regionLabel}
              surface={builtSurface}
              projectTotal={projectTotal}
              costPerM2={costPerM2}
              scenarioLabel={scenarioLabel}
              scenarioTotals={scenarioTotals.length > 0 ? scenarioTotals : undefined}
              complementaryWorksEnabled={complementaryWorksEligible}
              onBudgetAnalysisChange={setBudgetAnalysis}
            />
          </>
        )}
      </div>
    </main>
  );
}

/** Tuile de résumé du projet — grille responsive, texte jamais coupé. */
function SynthStat({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-background p-2.5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
