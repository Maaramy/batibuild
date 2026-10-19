import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useConvex, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { isHeaderNavItemActive } from "@/components/HeaderNav";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { usePdfGate } from "@/hooks/use-pdf-gate";
import { ArrowLeft, ArrowRight, FileText, Loader2, Lock } from "lucide-react";
import { projectTypeLabel } from "@/convex/projectTypes";
import { projectRegionLabel } from "@/lib/myProjects";
import {
  buildProjectJourney,
  type ProjectJourneyFlags,
  type ProjectJourneyStep,
  type ProjectJourneyStepKey,
} from "@/lib/projectJourney";
import {
  reportStatuses,
  type ProjectReportArtifacts,
} from "@/lib/reportRegistry";
import {
  downloadCostReport,
  downloadExecutionReport,
  downloadMaterialsReport,
  downloadPlansReport,
} from "@/lib/reportDownloads";
import { cn } from "@/lib/utils";

/**
 * JOURNEY DU PROJET — parcours linéaire persistant
 *
 * Le Journey remplace l'ancienne barre d'étapes et n'affiche qu'UNE seule
 * étape à la fois — celle dédiée à la page courante : `[PDF] Nom de l'étape
 * [Suivant →]`, mobile-first, sur fond clair, contours fins, accents vert/mint
 * et boutons arrondis. On avance de proche en proche (« Suivant → ») et on
 * revient à l'étape précédente ; le parcours complet n'est jamais déroulé en
 * même temps.
 *
 *   - les étapes viennent de `@/lib/projectJourney` (groupe A : 6 étapes,
 *     groupe B : 4 étapes) et sont filtrées par les feature flags de
 *     l'administration — une étape désactivée disparaît et le total est
 *     recalculé automatiquement ;
 *   - l'icône PDF de chaque étape télécharge le rapport DÉJÀ GÉNÉRÉ à partir des
 *     données enregistrées (aucun recalcul d'analyse). Elle réutilise le système
 *     PDF existant (`reportDownloads`, logo BatiBuild) et respecte les
 *     restrictions du forfait via `usePdfGate` ;
 *   - si le rapport n'existe pas encore, l'icône est en état « non disponible »
 *     et indique qu'il faut d'abord générer le rapport (jamais de faux rapport) ;
 *   - « Suivant → » ouvre l'étape suivante en conservant toutes les données du
 *     projet ; les résultats déjà enregistrés s'affichent immédiatement (les
 *     pages cibles chargent les données Convex, elles ne relancent rien) ;
 *   - l'état réel de chaque étape (non commencé / PDF disponible) et la
 *     progression sont déduits des données réellement enregistrées du projet.
 *
 * Une page peut fournir son propre parcours via `steps` (page « Résultat de
 * l'analyse IA ») ; un tableau vide masque alors le Journey.
 */

interface ProjectJourneyNavProps {
  /** Identifiant du projet courant : sans lui, le Journey n'est pas affiché. */
  projectId?: string | null;
  /** Type de projet enregistré (détermine le groupe du parcours). */
  category?: string | null;
  /**
   * État des feature flags de l'administration. Facultatif : par défaut le
   * Journey lit le contexte central (`FeatureFlagsProvider`), donc toute page
   * hérite automatiquement de l'état activé/désactivé sans le transmettre.
   */
  flags?: ProjectJourneyFlags;
  /**
   * Parcours imposé par la page (prioritaire). Un tableau vide masque le
   * Journey. Sans cette prop, le parcours est déduit du type de projet.
   */
  steps?: ProjectJourneyStep[];
  /**
   * Force l'étape affichée (utile quand la route de la page ne correspond pas
   * à l'étape, ex. la page « Résultat de l'analyse IA »). Par défaut l'étape
   * est déduite de la route affichée.
   */
  activeKey?: ProjectJourneyStepKey;
  /**
   * Affiche l'en-tête du projet (nom, type • surface • ville, `# x / N`)
   * au-dessus de l'étape. Activé par défaut afin que l'identité du projet
   * reste visible durant tout le parcours ; une page qui possède déjà son
   * propre en-tête projet (détail du projet) peut le désactiver.
   */
  showProjectHeader?: boolean;
  /**
   * Libellé de la fonctionnalité affiché après le nom du projet dans l'en-tête
   * (« Nom du projet : [Fonctionnalité] »). Il remplace les en-têtes propres à
   * chaque fonctionnalité. Lorsque l'étape courante est identifiée, son libellé
   * est utilisé en priorité ; ce libellé sert de repli quand aucun projet (donc
   * aucune étape) n'est disponible.
   */
  featureLabel?: string;
  maxWidthClassName?: string;
  className?: string;
}

/** Forme minimale du projet utilisée pour déduire l'état des rapports. */
interface JourneyProject {
  _id: string;
  name?: string;
  category?: string;
  surface?: number;
  surfaceTotale?: number;
  region?: string;
  costEstimate?: unknown;
}

export function ProjectJourneyNav({
  projectId,
  category,
  flags,
  steps: stepsOverride,
  activeKey,
  showProjectHeader = true,
  featureLabel,
  maxWidthClassName = "max-w-5xl",
  className,
}: ProjectJourneyNavProps) {
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
  const convex = useConvex();
  const consumeDownload = useMutation(api.subscriptions.consumeDownload);
  const pdfGate = usePdfGate();

  // Source unique de vérité : le contexte central des feature flags.
  const { flags: contextFlags } = useFeatureFlags();
  const resolvedFlags = flags ?? contextFlags;

  const hasProjectId = typeof projectId === "string" && projectId.trim().length > 0;

  const defaultSteps = useMemo(
    () => buildProjectJourney(category, projectId, resolvedFlags),
    [category, projectId, resolvedFlags],
  );

  const steps = stepsOverride ?? defaultSteps;

  // Données réellement enregistrées du projet (aucune analyse relancée) :
  // elles servent uniquement à déduire l'état des rapports et à alimenter les
  // générateurs PDF existants.
  const projects = useQuery(
    api.projects.getMyProjectsForCards,
    hasProjectId ? {} : "skip",
  );
  const artifacts = useQuery(
    api.reportCenter.getMyReportArtifacts,
    hasProjectId ? {} : "skip",
  );

  const project = useMemo<JourneyProject | null>(() => {
    if (!hasProjectId) return null;
    const found = (projects ?? []).find((p) => p._id === projectId);
    return (found as JourneyProject | undefined) ?? null;
  }, [projects, projectId, hasProjectId]);

  const artifact = useMemo<ProjectReportArtifacts | undefined>(() => {
    if (!hasProjectId) return undefined;
    const row = (artifacts ?? []).find((r) => r.projectId === projectId);
    if (!row) return undefined;
    return {
      materialsAnalysisId: row.materialsAnalysisId,
      roadmapId: row.roadmapId,
    };
  }, [artifacts, projectId, hasProjectId]);

  const statuses = useMemo(
    () => (project ? reportStatuses(project, artifact) : null),
    [project, artifact],
  );

  // En-tête du projet, conservé durant tout le parcours : type • surface •
  // ville, plus le rang du projet parmi ceux de l'utilisateur (`# x / N`).
  const projectMeta = useMemo<string[]>(() => {
    if (!project) return [];
    const parts: string[] = [];
    if (project.category) parts.push(projectTypeLabel(project.category));
    if (project.surface) parts.push(`${project.surface}m² couv.`);
    if (project.surfaceTotale) parts.push(`${project.surfaceTotale}m² totale`);
    const region = projectRegionLabel(project);
    if (region) parts.push(region);
    return parts;
  }, [project]);

  const projectCounter = useMemo(() => {
    if (!hasProjectId || !projects) return null;
    const index = projects.findIndex((p) => p._id === projectId);
    if (index === -1) return null;
    return { current: index + 1, total: projects.length };
  }, [projects, projectId, hasProjectId]);

  const [busyKey, setBusyKey] = useState<ProjectJourneyStepKey | null>(null);

  const pdfReadyFor = (step: ProjectJourneyStep): boolean =>
    !!step.reportKey && statuses?.[step.reportKey] === "available";

  const runDownload = async (step: ProjectJourneyStep): Promise<void> => {
    if (!project || !step.reportKey) return;
    setBusyKey(step.key);
    try {
      switch (step.reportKey) {
        case "cost":
          await downloadCostReport({
            convex,
            project,
            projectId: project._id,
            consumeDownload: () => consumeDownload({}),
          });
          break;
        case "plans":
          await downloadPlansReport(project);
          break;
        case "materials":
          if (!artifact?.materialsAnalysisId) throw new Error("report-unavailable");
          await downloadMaterialsReport(convex, artifact.materialsAnalysisId);
          break;
        case "execution":
          await downloadExecutionReport(convex, project._id);
          break;
      }
      toast.success("Rapport PDF téléchargé");
    } catch (error) {
      if (error instanceof Error && error.message === "report-unavailable") {
        toast.error("Ce rapport n'est pas encore disponible.");
      } else {
        toast.error("Impossible de générer le rapport. Veuillez réessayer.");
      }
    } finally {
      setBusyKey(null);
    }
  };

  // Toute demande passe par le contrôle PDF centralisé : forfait Free →
  // dialogue « Rapport PDF disponible avec Client Pro ». Le serveur reste
  // l'autorité (mutation `consumeDownload`).
  const handlePdf = (step: ProjectJourneyStep): void => {
    if (!step.reportKey || !project) return;
    if (!pdfReadyFor(step)) {
      toast.info(
        "Ce rapport doit d'abord être généré : ouvrez l'étape et lancez l'analyse.",
      );
      return;
    }
    pdfGate.requestPdfDownload(() => runDownload(step));
  };

  const hasSteps = steps.length > 0;
  const total = steps.length;

  // Progression dynamique : étape active si l'on est sur son module, sinon
  // première étape non terminée (d'après les rapports réellement disponibles).
  const activeIndex = !hasSteps
    ? -1
    : activeKey != null
      ? steps.findIndex((s) => s.key === activeKey)
      : (() => {
          // Une ancre de section fournie par l'URL (lien profond) tranche en
          // priorité ; sinon l'étape active est déduite de la route affichée.
          if (hash) {
            const byHash = steps.findIndex((s) => s.href.includes(hash));
            if (byHash >= 0) return byHash;
          }
          return steps.findIndex((s) => isHeaderNavItemActive({ path: s.path }, pathname));
        })();
  const completedCount = steps.filter((s) => pdfReadyFor(s)).length;
  const currentIndex =
    activeIndex >= 0
      ? activeIndex
      : Math.min(completedCount, Math.max(total - 1, 0));

  // Une seule étape est affichée : l'étape DÉDIÉE à la page courante. Le
  // parcours complet n'est jamais déroulé en même temps — on avance de proche
  // en proche avec « Suivant → » et on revient avec « Étape précédente ».
  const stepIndex = hasSteps ? Math.min(Math.max(currentIndex, 0), total - 1) : 0;
  const step: ProjectJourneyStep | undefined = hasSteps
    ? steps[stepIndex]
    : undefined;
  const previous = step && stepIndex > 0 ? steps[stepIndex - 1] : undefined;
  const next = step && stepIndex < total - 1 ? steps[stepIndex + 1] : undefined;

  const hasReport = !!step?.reportKey;
  const pdfReady = step ? pdfReadyFor(step) : false;
  const busy = step ? busyKey === step.key : false;
  const stateLabel = !hasReport
    ? "Étape du parcours"
    : pdfReady
      ? "PDF disponible"
      : "Non commencé";

  // En-tête projet unifié — il remplace les en-têtes propres à chaque
  // fonctionnalité : « Nom du projet : [Fonctionnalité] ». Le libellé de l'étape
  // courante prime ; `featureLabel` sert de repli (page sans projet identifié).
  const headerFeature = step?.label ?? featureLabel ?? null;
  const showHeader = showProjectHeader && (project != null || headerFeature != null);
  if (!hasSteps && !showHeader) return null;
  const headerBackTarget = hasProjectId
    ? `/dashboard/project/${projectId}`
    : "/dashboard";

  return (
    <>
      {/* Bandeau projet COLLANT — conservé en haut de toutes les pages du
          parcours et fusionné avec le nom de la fonctionnalité :
          « Nom du projet : [Fonctionnalité] ». Il remplace les en-têtes propres
          aux pages. Rendue en dehors de la carte (parent = <main>) pour rester
          collée pendant tout le défilement de la page. */}
      {showHeader && (
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background">
          <div
            className={cn(
              "mx-auto flex items-center gap-2 px-3 py-2 sm:px-4",
              maxWidthClassName,
            )}
          >
              <button
                type="button"
                onClick={() => navigate(headerBackTarget)}
                aria-label="Revenir au projet"
                title="Revenir au projet"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-background text-foreground transition-colors hover:bg-muted/60 active:scale-95"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <div className="h-4 w-px shrink-0 bg-border/60" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {project ? (
                    <>
                      {project.name ?? "Projet"}
                      {headerFeature && (
                        <span className="font-normal text-muted-foreground">
                          {" : "}
                          {headerFeature}
                        </span>
                      )}
                    </>
                  ) : (
                    headerFeature
                  )}
                </p>
                {project && (
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {projectMeta.join(" • ")}
                    {projectCounter && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                        #{projectCounter.current}
                        <span className="text-muted-foreground/50">/</span>
                        {projectCounter.total}
                      </span>
                    )}
                  </p>
                )}
              </div>
          </div>
        </header>
      )}

      {hasSteps && (
      <nav aria-label="Parcours du projet" className={cn("w-full", className)}>
      <div className={cn("mx-auto px-3 pt-3 sm:px-4", maxWidthClassName)}>
        <div className="rounded-xl border border-border/60 bg-card p-3 sm:p-4 shadow-elev-1">
          {step && (
          <>
          {/* Étape dédiée à la page : [icône PDF] Nom de l'étape [Suivant →] */}
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-background px-2 py-2 sm:gap-3 sm:px-3 sm:py-2.5">
            {/* Icône PDF — télécharge le rapport déjà généré, sans relancer
                aucune analyse. État « non disponible » si le rapport n'existe
                pas encore ou si l'étape n'a pas de rapport. */}
            <button
              type="button"
              disabled={!hasReport || busy || !project}
              onClick={() => handlePdf(step)}
              aria-label={
                !hasReport
                  ? `Aucun rapport PDF pour l'étape ${step.label}`
                  : pdfReady
                    ? `Télécharger le rapport PDF — ${step.label}`
                    : `Rapport ${step.label} non disponible`
              }
              title={
                !hasReport
                  ? "Aucun rapport PDF pour cette étape"
                  : pdfReady
                    ? "Télécharger le rapport PDF"
                    : "Rapport à générer d'abord"
              }
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all",
                pdfReady
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 active:scale-95 dark:text-emerald-400"
                  : "cursor-not-allowed border-foreground/10 bg-muted/40 text-muted-foreground/50",
              )}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : hasReport ? (
                <FileText className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
            </button>

            {/* Nom de l'étape + état réel */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {step.label}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {stateLabel}
              </p>
            </div>

            {/* « Suivant → » : ouvre l'étape suivante en conservant les données
                du projet. Absent sur la dernière étape. */}
            {next ? (
              <button
                type="button"
                onClick={() => navigate(next.href)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-foreground/15 bg-background px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-muted/50 active:scale-95 sm:px-3"
              >
                Suivant
                <ArrowRight className="h-3 w-3" />
              </button>
            ) : (
              <span className="h-7 w-7 shrink-0" aria-hidden />
            )}
          </div>

          {/* Retour à l'étape précédente (les données restent conservées). */}
          {previous && (
            <button
              type="button"
              onClick={() => navigate(previous.href)}
              className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Étape précédente : {previous.label}
            </button>
          )}
          </>
          )}
        </div>
      </div>
      </nav>
      )}
      {pdfGate.dialog}
    </>
  );
}
