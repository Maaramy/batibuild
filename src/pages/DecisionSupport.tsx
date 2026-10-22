// ============================================================================
// AIDE À LA DÉCISION — page dédiée (copilote budget & achats)
// ----------------------------------------------------------------------------
// Page individuelle du parcours du projet (groupes A et D, étape n°2). Elle affiche
// le module de budget (« Capacité de construction ») sur les données déjà
// enregistrées du projet — aucune analyse n'est relancée ici.
//
// Le module a été RETIRÉ de la page de résultat « Coût estimatif » : il n'est
// plus affiché en extension du résultat, mais uniquement sur cette page,
// atteignable depuis l'étape « Aide à la décision » du Journey.
//
// AUCUN CHARGEMENT AUTOMATIQUE : l'arrivée sur cette page n'affiche ni écran
// animé ni analyse. Un squelette discret couvre uniquement l'attente des
// données réelles ; l'écran de chargement animé de Batibuild n'apparaît qu'au
// clic sur « Analyser mon budget avec l'IA », dans `OptimizationSection`.
//
// Le coût total du scénario retenu (même valeur que « Coût estimatif ») est
// déduit du scénario persisté du projet ; il sert de contexte au module pour le
// risque de dépassement et les simulations. Le module gère lui-même sa mise en
// cache et son accès réservé au forfait Client Pro.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "convex/react";
import { ArrowRight, Building2, CreditCard, MapPin, Ruler, ShieldAlert, Wallet } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { realBuiltArea } from "@/lib/buildingLevels";
import { ProjectJourneyNav } from "@/components/ProjectJourneyNav";
import { DecisionSupportModule } from "@/components/decision/DecisionSupportModule";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/feedback";
import { usePageSEO } from "@/hooks/use-page-seo";
import {
  DECISION_SUPPORT_DENY_COPY,
  type DecisionSupportAccess,
} from "@/lib/decisionSupportAccess";
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
import { formatTndAmount } from "@/lib/budgetEngine";
import { resolveEstimationBudget } from "@/lib/estimationBudget";
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

  // ── Aucun chargement automatique ────────────────────────────────────────
  // L'arrivée sur cette page ne lance aucune analyse et n'affiche aucun écran
  // animé : seules les données réelles sont attendues (squelette discret).
  // L'écran de chargement animé est déclenché exclusivement par le clic sur
  // « Analyser mon budget avec l'IA » (`OptimizationSection`).
  //
  // Résultats affichés (budget analysé) : la carte projet et la carte de
  // saisie du budget sont alors masquées — leurs données restent intactes.
  const [budgetResultsDisplayed, setBudgetResultsDisplayed] = useState(false);
  const handleBudgetResultsDisplayed = useCallback(
    (displayed: boolean) => setBudgetResultsDisplayed(displayed),
    [],
  );
  useEffect(() => {
    setBudgetResultsDisplayed(false);
  }, [id]);

  const project = useQuery(
    api.projects.getProject,
    id ? { projectId: id as Id<"projects"> } : "skip",
  );

  // ── Autorisation d'accès — décision calculée CÔTÉ SERVEUR ────────────────
  // « Aide à la décision » = projets des GROUPES A et D + abonnement CLIENT PRO actif
  // et non expiré. La même décision protège les queries/mutations du module :
  // cette vérification couvre le rechargement, l'accès direct à l'URL et
  // l'ouverture d'un projet existant. Aucune donnée du module n'est rendue
  // avant que le serveur ait répondu.
  const access = useQuery(
    api.decisionSupportAccess.getProjectDecisionSupportAccess,
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
          « Suivant → : Plans architecturaux AI » (parcours complet A / D). */}
      <ProjectJourneyNav
        projectId={id}
        category={project?.category}
        featureLabel="Aide à la décision"
        // Accès refusé (groupes B et C, compte gratuit, abonnement expiré…) : aucun
        // bouton « Suivant » vers une étape verrouillée — l'en-tête du projet
        // reste affiché, le parcours reprend via « Continuer mon projet ».
        steps={access && !access.allowed ? [] : undefined}
        maxWidthClassName="max-w-6xl"
      />

      <div className="mx-auto mt-4 max-w-6xl space-y-4 px-3 sm:px-6">
        {project === undefined ||
        access === undefined ||
        customization === undefined ||
        customWorksData === undefined ? (
          /* ── Attente discrète des données réelles : AUCUN écran de
              chargement animé, aucune analyse lancée. L'animation de Batibuild
              reste réservée au clic sur « Analyser mon budget avec l'IA ». ── */
          <div className="space-y-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Chargement des données de votre aide à la décision…</span>
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elev-1">
              <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                  <div className="min-w-0 space-y-2">
                    <Skeleton className="h-5 w-40 max-w-full" />
                    <Skeleton className="h-3 w-28 max-w-full" />
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <Skeleton className="h-5 w-28 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-32" />
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border/50 border-t border-border/50">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="min-w-0 px-3 py-3 sm:px-4">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="mt-2 h-4 w-20" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-elev-1 sm:p-5">
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
            </div>
          </div>
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
        ) : !access.allowed ? (
          /* ── Accès refusé : groupes B et C, compte gratuit, abonnement
              expiré… Les autres étapes du projet restent accessibles (aucun
              blocage injustifié) — seule cette fonctionnalité est verrouillée. */
          <DecisionSupportBlocked
            access={access}
            onBack={() => navigate(`/dashboard/project/${id}`)}
            onUpgrade={() => navigate("/dashboard/pricing")}
            onLogin={() => navigate(`/auth?returnTo=/dashboard/decision/${id}`)}
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
            {/* ── Résumé du projet — masqué dès que les résultats sont
                affichés (les données du projet restent chargées et utilisées
                par le module pour les étapes suivantes). ── */}
            {!budgetResultsDisplayed ? (
            <section
              aria-label="Résumé du projet"
              className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elev-1"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 text-base font-semibold leading-tight tracking-tight sm:text-lg">
                      {project.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {projectTypeLabel(project.category)}
                      {regionLabel ? ` · ${regionLabel}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-1 sm:items-end">
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11.5px] font-semibold text-primary">
                    Scénario {scenarioLabel}
                  </span>
                  <p className="mt-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
                    Coût estimé
                  </p>
                  <p className="text-xl font-bold leading-tight tabular-nums sm:text-2xl">
                    {formatTndAmount(projectTotal)}
                  </p>
                  {costPerM2 > 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      {formatTndAmount(costPerM2)}/m²
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border/50 border-t border-border/50">
                <SynthStat
                  icon={Ruler}
                  label="Surface"
                  value={builtSurface ? `${builtSurface} m²` : "—"}
                />
                <SynthStat icon={MapPin} label="Région" value={regionLabel ?? "—"} />
                <SynthStat icon={Wallet} label="Scénario" value={scenarioLabel} />
              </div>
            </section>
            ) : null}

            {/* ── Module budget / capacité de construction ── */}
            <DecisionSupportModule
              // Le module est remonté à chaque changement de projet : aucun
              // résultat, budget, erreur ni animation du projet précédent ne
              // peut subsister.
              key={project._id}
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
              onBudgetResultsDisplayed={handleBudgetResultsDisplayed}
            />
          </>
        )}
      </div>
    </main>
  );
}

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
    <div className="min-w-0 px-3 py-3 sm:px-4">
      <p className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1 truncate text-[13px] font-semibold text-foreground" title={value}>
        {value}
      </p>
    </div>
  );
}

/**
 * Écran de refus — « Aide à la décision » verrouillée.
 *
 * Le motif vient du SERVEUR (`access.reason`) : aucun calcul local, donc aucun
 * contournement possible. Le message est adapté au cas :
 *   • groupes B et C      → fonctionnalité absente du parcours ;
 *   • compte gratuit      → invitation à passer à Client Pro ;
 *   • expiré / en attente → blocage jusqu'à réactivation ;
 *   • non connecté        → authentification demandée.
 * La sortie « Retour au projet » permet de poursuivre les autres étapes.
 */
function DecisionSupportBlocked({
  access,
  onBack,
  onUpgrade,
  onLogin,
}: {
  access: DecisionSupportAccess;
  onBack: () => void;
  onUpgrade: () => void;
  onLogin: () => void;
}) {
  const reason = access.reason === "ok" ? "not_client_pro" : access.reason;
  const copy = DECISION_SUPPORT_DENY_COPY[reason];
  const cta = copy.cta;
  const onPrimary = reason === "not_authenticated" ? onLogin : onUpgrade;

  return (
    <section
      aria-label="Accès à l'aide à la décision"
      className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elev-1"
    >
      <div className="flex flex-col items-center gap-3 px-4 py-10 text-center sm:px-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          {access.group === "C" ? (
            <ShieldAlert className="h-6 w-6" />
          ) : (
            <CreditCard className="h-6 w-6" />
          )}
        </div>
        <h2 className="text-base font-bold tracking-tight sm:text-lg">{copy.title}</h2>
        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {copy.description}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {cta && (
            <Button className="gap-1.5" onClick={onPrimary}>
              <CreditCard className="h-4 w-4" />
              {cta}
            </Button>
          )}
          <Button variant="outline" className="gap-1.5" onClick={onBack}>
            <ArrowRight className="h-4 w-4" />
            Continuer mon projet
          </Button>
        </div>
      </div>
    </section>
  );
}
