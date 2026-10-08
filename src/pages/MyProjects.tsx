import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, LoadingState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/section";
import { cn } from "@/lib/utils";
import { projectTypeLabel } from "@/convex/projectTypes";
import {
  ArrowRight,
  FolderOpen,
  HardHat,
  Heart,
  MapPin,
  Plus,
  Ruler,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  MY_PROJECTS_FILTERS,
  countByFilter,
  formatProjectDate,
  projectDurationLabel,
  projectMatchesFilter,
  projectProgress,
  projectRegionLabel,
  projectStatusMeta,
  type MyProjectsFilter,
} from "@/lib/myProjects";

// ============================================================================
// PAGE « MES PROJETS » — bibliothèque de projets
// ----------------------------------------------------------------------------
// Interface de type liste de conversations : une LIGNE COMPACTE par projet
// (nom, statut, type, localisation, dernière modification, progression) plutôt
// que de grandes cartes. Les données viennent de `projects.getMyProjectsForCards`
// : seuls les projets de l'utilisateur connecté sont renvoyés.
//
// Actions disponibles sur chaque ligne :
//   • Ouvrir        → `/dashboard/project/:id` (projet existant, aucune copie)
//   • Favori        → `projects.toggleFavorite` (mutation existante)
//   • Supprimer     → `projects.deleteProject` (confirmation explicite)
//
// Aucune donnée n'est créée ni recopiée : la page ne fait que présenter ce que
// les modules existants exposent déjà.
// ============================================================================

type ProjectCardData = {
  _id: string;
  name?: string;
  category?: string;
  status?: string;
  region?: string | null;
  surface?: number;
  floors?: number;
  isFavorite?: boolean;
  createdAt: number;
  updatedAt: number;
  thumbnailUrl?: string | null;
  thumbnailName?: string | null;
  aiAnalysis?: { estimatedDuration?: string } | null;
  files?: { name?: string; type?: string }[];
  costEstimate?: unknown;
  dqe?: unknown;
  providerRecommendations?: unknown;
};

/** Ligne compacte d'un projet (identité + contexte + progression + actions). */
function ProjectRow({
  project,
  onToggleFavorite,
  onDelete,
}: {
  project: ProjectCardData;
  onToggleFavorite: (id: string) => void;
  onDelete: (project: ProjectCardData) => void;
}) {
  const navigate = useNavigate();
  const status = projectStatusMeta(project.status);
  const progress = projectProgress(project);
  const duration = projectDurationLabel(project);
  const region = projectRegionLabel(project);
  const typeLabel = projectTypeLabel(project.category ?? "");
  const open = () => navigate(`/dashboard/project/${project._id}`);

  return (
    <li className="group flex items-stretch gap-1 rounded-xl border border-border/60 bg-card py-1 pl-1 pr-1 shadow-elev-1 transition-colors hover:border-primary/30 focus-within:border-primary/40">
      <button
        type="button"
        onClick={open}
        aria-label={`Ouvrir le projet ${project.name ?? ""}`}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-lg px-2 py-2 text-left focus-visible:outline-2 focus-visible:outline-ring"
      >
        {/* Aperçu discret : miniature du projet, sinon icône neutre */}
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
          {project.thumbnailUrl ? (
            <img
              src={project.thumbnailUrl}
              alt={project.thumbnailName ?? `Aperçu du projet ${project.name ?? ""}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <HardHat className="h-4 w-4" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium">
              {project.name || "Projet sans nom"}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full border px-1.5 py-px text-[10px] font-medium",
                status.badge,
              )}
            >
              {status.label}
            </span>
          </span>

          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-[11px] text-muted-foreground">
            <span className="truncate">{typeLabel || "Type non précisé"}</span>
            {region && (
              <>
                <span aria-hidden>·</span>
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{region}</span>
              </>
            )}
            {project.surface ? (
              <>
                <span aria-hidden>·</span>
                <Ruler className="h-3 w-3 shrink-0" />
                <span className="shrink-0">{project.surface} m²</span>
              </>
            ) : null}
          </span>

          <span className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground/70">
            <span>Modifié le {formatProjectDate(project.updatedAt)}</span>
            {duration && <span aria-hidden>·</span>}
            {duration && <span className="truncate">{duration}</span>}
            <span className="ml-auto shrink-0 font-medium tabular-nums text-muted-foreground">
              {progress.percent}%
            </span>
          </span>

          {/* Progression : jalons réels du dossier */}
          <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-muted">
            <span
              className={cn("block h-full rounded-full transition-all", status.accent)}
              style={{ width: `${progress.percent}%` }}
            />
          </span>
        </span>

        <ArrowRight
          aria-hidden
          className="mt-2 h-4 w-4 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
        />
      </button>

      {/* Actions contextuelles (jamais imbriquées dans le bouton principal) */}
      <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 border-l border-border/50 px-1">
        <button
          type="button"
          onClick={() => onToggleFavorite(project._id)}
          aria-label={
            project.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"
          }
          aria-pressed={!!project.isFavorite}
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Heart
            className={cn(
              "h-3.5 w-3.5",
              project.isFavorite && "fill-red-500 text-red-500",
            )}
          />
        </button>
        <button
          type="button"
          onClick={() => onDelete(project)}
          aria-label={`Supprimer le projet ${project.name ?? ""}`}
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

export default function MyProjects() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<MyProjectsFilter>("all");
  const [pendingDelete, setPendingDelete] = useState<ProjectCardData | null>(null);
  const { isEnabled } = useFeatureFlags();
  const canCreateProject = isEnabled("construction_cost_estimation");

  usePageSEO({
    title: "Mes projets - batibuild",
    description:
      "Retrouvez tous vos projets de construction : en cours, terminés, réalisés et archivés, avec surface, région, progression et coût estimatif.",
  });

  // Convex renvoie uniquement les projets de l'utilisateur connecté.
  const projects = useQuery(api.projects.getMyProjectsForCards, {}) as
    | ProjectCardData[]
    | undefined;
  const toggleFavorite = useMutation(api.projects.toggleFavorite);
  const deleteProject = useMutation(api.projects.deleteProject);

  const counts = useMemo(() => countByFilter(projects ?? []), [projects]);
  const visible = useMemo(
    () => (projects ?? []).filter((project) => projectMatchesFilter(project, filter)),
    [projects, filter],
  );

  const loading = projects === undefined;

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const projectId = pendingDelete._id as Id<"projects">;
    setPendingDelete(null);
    await deleteProject({ projectId });
  };

  return (
    <main className="min-h-screen bg-background pb-16">
      <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6">
        <PageHeader
          title="Mes projets"
          subtitle={
            loading
              ? "Chargement…"
              : `${counts.all} projet${counts.all > 1 ? "s" : ""} · vos estimations, plans et matériaux`
          }
          onBack={() => navigate(-1)}
          backLabel="Retour"
          actions={
            canCreateProject && (
              <Button size="sm" className="gap-1.5" onClick={() => navigate("/dashboard/new")}>
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Nouveau projet</span>
                <span className="sm:hidden">Nouveau</span>
              </Button>
            )
          }
        />

        {/* Filtres + compteurs : une seule ligne, aucune carte de statistique redondante */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {MY_PROJECTS_FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                aria-pressed={active}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {item.label}
                <span className="ml-1.5 text-[10px] tabular-nums text-muted-foreground">
                  {loading ? "" : counts[item.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Résultats */}
        <section className="mt-3">
          {loading ? (
            <LoadingState message="Chargement de vos projets…" />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={counts.all === 0 ? <HardHat className="h-5 w-5" /> : <FolderOpen className="h-5 w-5" />}
              title={
                counts.all === 0 ? "Aucun projet pour le moment" : "Aucun projet dans ce filtre"
              }
              description={
                counts.all === 0
                  ? "Créez votre premier projet : l'IA estime la surface, les matériaux et le coût — marché tunisien 2026."
                  : "Changez de filtre pour retrouver vos autres projets."
              }
              action={
                counts.all === 0 && canCreateProject ? (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => navigate("/dashboard/new")}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Créer un projet
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {visible.map((project) => (
                <ProjectRow
                  key={project._id}
                  project={project}
                  onToggleFavorite={(id) =>
                    void toggleFavorite({ projectId: id as Id<"projects"> })
                  }
                  onDelete={setPendingDelete}
                />
              ))}
            </ul>
          )}
        </section>

        {/* Confirmation de suppression : modale compacte, action critique isolée */}
        <Dialog
          open={pendingDelete !== null}
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null);
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Supprimer ce projet ?</DialogTitle>
              <DialogDescription>
                « {pendingDelete?.name || "Projet sans nom"} » et ses résultats
                (estimation, quantitatif, plans) seront définitivement supprimés.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button variant="outline" size="sm">
                  Annuler
                </Button>
              </DialogClose>
              <Button variant="destructive" size="sm" onClick={() => void confirmDelete()}>
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
