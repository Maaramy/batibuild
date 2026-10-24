import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useConvex, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { projectTypeLabel } from "@/convex/projectTypes";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { usePdfGate } from "@/hooks/use-pdf-gate";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatProjectDate, projectDurationLabel, projectRegionLabel } from "@/lib/myProjects";
import {
  REPORT_STATUS_LABEL,
  countAvailableReports,
  reportStatuses,
  reportUnavailableMessage,
  visibleReportModules,
  type ProjectReportArtifacts,
  type ReportModuleKey,
} from "@/lib/reportRegistry";
import {
  downloadCostReport,
  downloadDecisionSupportReport,
  downloadExecutionReport,
  downloadPlansReport,
} from "@/lib/reportDownloads";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Download,
  FileDown,
  HardHat,
  Loader2,
  Lock,
  MapPin,
  Play,
  Ruler,
  Timer,
} from "lucide-react";

// ============================================================================
// PAGE « RAPPORTS PDF »
//
// Accessible depuis le menu principal (utilisateurs connectés). L'utilisateur
// voit la liste de SES projets (données filtrées côté serveur — les projets
// d'un autre utilisateur ne sont jamais renvoyés) puis, pour chaque projet,
// toutes les fonctionnalités compatibles avec leur état et l'accès à leur
// rapport PDF.
//
//   • rapport réellement généré  → téléchargement direct du PDF ;
//   • module non exécuté         → message + bouton « Exécuter le module » ;
//   • module désactivé (admin)   → fonctionnalité totalement masquée.
//
// Aucun faux rapport : le statut provient des données réelles du projet
// (`reportStatuses` + `reportCenter.getMyReportArtifacts`).
// ============================================================================

type ProjectCardData = {
  _id: string;
  name?: string;
  category?: string;
  region?: string | null;
  surface?: number;
  floors?: number;
  createdAt: number;
  updatedAt: number;
  thumbnailUrl?: string | null;
  thumbnailName?: string | null;
  aiAnalysis?: { estimatedDuration?: string } | null;
  costEstimate?: unknown;
};

type ArtifactRow = {
  projectId: string;
  roadmapId: string | null;
  budgetAnalysisId?: string | null;
};

type PendingModule = { label: string; href: string };

export default function ReportCenter() {
  const navigate = useNavigate();
  const convex = useConvex();
  const { isEnabled } = useFeatureFlags();
  const consumeDownload = useMutation(api.subscriptions.consumeDownload);
  // Téléchargement PDF : contrôle centralisé (réservé au forfait payant Client Pro).
  const pdfGate = usePdfGate();

  usePageSEO({
    title: "Rapports PDF - batibuild",
    description:
      "Consultez et téléchargez les rapports PDF de vos projets : devis estimatif, plan IA, aide à la décision et guide construction A-Z.",
  });

  // Projets de l'utilisateur connecté (lecture strictement privée, côté serveur).
  const projects = useQuery(api.projects.getMyProjectsForCards, {}) as
    | ProjectCardData[]
    | undefined;
  const artifacts = useQuery(api.reportCenter.getMyReportArtifacts, {}) as
    | ArtifactRow[]
    | undefined;

  const artifactByProject = useMemo(() => {
    const map = new Map<string, ProjectReportArtifacts>();
    for (const row of artifacts ?? []) {
      map.set(row.projectId, {
        roadmapId: row.roadmapId,
        budgetAnalysisId: row.budgetAnalysisId ?? null,
      });
    }
    return map;
  }, [artifacts]);

  // États d'interface (jamais des données métier).
  const [busy, setBusy] = useState<{ projectId: string; module: ReportModuleKey } | null>(null);
  const [pending, setPending] = useState<PendingModule | null>(null);

  const loading = projects === undefined;

  const runDownload = async (
    project: ProjectCardData,
    moduleKey: ReportModuleKey,
  ) => {
    setBusy({ projectId: project._id, module: moduleKey });
    try {
      switch (moduleKey) {
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
        case "decision":
          await downloadDecisionSupportReport(convex, project._id);
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
      setBusy(null);
    }
  };

  // Toute demande de téléchargement passe par le contrôle PDF centralisé :
  // forfait Free → dialogue « Rapport PDF disponible avec Client Pro ».
  const handleDownload = (
    project: ProjectCardData,
    moduleKey: ReportModuleKey,
  ) => {
    pdfGate.requestPdfDownload(() => runDownload(project, moduleKey));
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.04] via-background to-background pb-16">
      {pdfGate.dialog}
      {/* En-tête sticky */}
      <header className="sticky top-0 z-40 border-b border-border/20 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:px-6">
          <button
            onClick={() => navigate(-1)}
            aria-label="Retour"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all hover:bg-muted/50 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <FileDown className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold leading-tight sm:text-base">Rapports PDF</h1>
            <p className="text-[10px] leading-tight text-muted-foreground">
              {loading
                ? "Chargement…"
                : `${projects.length} projet${projects.length > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <p className="text-xs">Chargement de vos projets…</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-300/40 bg-emerald-50/40 px-4 py-14 text-center dark:border-emerald-800/30 dark:bg-emerald-950/20">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <HardHat className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
            </div>
            <p className="text-sm font-medium">Aucun projet pour le moment</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              Créez un projet : chaque module exécuté produira ici son rapport PDF,
              téléchargeable en un clic.
            </p>
            <Button
              size="sm"
              onClick={() => navigate("/dashboard/new")}
              className="mt-4 gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-xs text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500"
            >
              <HardHat className="h-3.5 w-3.5" />
              Nouveau projet
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {projects.map((project) => {
              const modules = visibleReportModules(isEnabled, project.category);
              const artifact = artifactByProject.get(project._id);
              const statuses = reportStatuses(project, artifact);
              const available = countAvailableReports(modules, statuses);
              const typeLabel = projectTypeLabel(project.category ?? "");
              const duration = projectDurationLabel(project);
              const region = projectRegionLabel(project);

              return (
                <article
                  key={project._id}
                  className="overflow-hidden rounded-2xl border border-border/40 bg-background/60 backdrop-blur-sm"
                >
                  {/* En-tête de carte — identité du projet */}
                  <div className="flex gap-3 p-3.5">
                    <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent">
                      {project.thumbnailUrl ? (
                        <img
                          src={project.thumbnailUrl}
                          alt={project.thumbnailName ?? `Aperçu ${project.name ?? ""}`}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Ruler className="h-7 w-7 text-emerald-600/40 dark:text-emerald-400/30" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-semibold">
                        {project.name || "Projet sans nom"}
                      </h2>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {typeLabel || "Type non précisé"}
                          {project.surface ? ` • ${project.surface} m²` : ""}
                          {region ? ` • ${region}` : ""}
                        </span>
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-2.5 w-2.5" />
                          {formatProjectDate(project.createdAt)}
                        </span>
                        {region && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5" />
                            {region}
                          </span>
                        )}
                        {duration && (
                          <span className="inline-flex items-center gap-1">
                            <Timer className="h-2.5 w-2.5" />
                            {duration}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Rapports disponibles
                        </span>
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          {available}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fonctionnalités du projet — une ligne par module */}
                  <div className="space-y-1.5 border-t border-border/25 px-3.5 py-3">
                    {modules.length === 0 ? (
                      <p className="py-2 text-center text-[11px] text-muted-foreground">
                        Aucune fonctionnalité activée pour ce projet.
                      </p>
                    ) : (
                      modules.map((module) => {
                        const status = statuses[module.key];
                        const isBusy =
                          busy?.projectId === project._id && busy.module === module.key;
                        const isAvailable = status === "available";
                        const Icon = module.icon;
                        return (
                          <div
                            key={module.key}
                            className="flex items-center gap-2.5 rounded-xl border border-border/30 bg-background/50 px-2.5 py-2"
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium">{module.label}</p>
                              <p
                                className={cn(
                                  "text-[10px]",
                                  isAvailable
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-muted-foreground",
                                )}
                              >
                                {isBusy ? REPORT_STATUS_LABEL.generating : REPORT_STATUS_LABEL[status]}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={isBusy}
                              aria-label={
                                isAvailable
                                  ? `Télécharger le rapport ${module.label}`
                                  : `Rapport ${module.label} non disponible`
                              }
                              onClick={() =>
                                isAvailable
                                  ? handleDownload(project, module.key)
                                  : setPending({
                                      label: module.label,
                                      href: module.buildHref(project._id),
                                    })
                              }
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all active:scale-95",
                                isAvailable
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                                  : "border-border/40 bg-muted/30 text-muted-foreground/60",
                                isBusy && "cursor-wait",
                              )}
                            >
                              {isBusy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : isAvailable ? (
                                <Download className="h-3.5 w-3.5" />
                              ) : (
                                <Lock className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Rapport non exécuté → message + accès direct au module */}
      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rapport non disponible</DialogTitle>
            <DialogDescription>
              {pending ? reportUnavailableMessage(pending.label) : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPending(null)}>
              Fermer
            </Button>
            <Button
              className="gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500"
              onClick={() => {
                if (pending) navigate(pending.href);
                setPending(null);
              }}
            >
              <Play className="h-3.5 w-3.5" />
              Exécuter le module
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
