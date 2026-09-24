import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { projectTypeLabel } from "@/convex/projectTypes";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Clock,
  FolderOpen,
  HardHat,
  Heart,
  LayoutGrid,
  Loader2,
  MapPin,
  Plus,
  Ruler,
  Sparkles,
  Timer,
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
// PAGE « MES PROJETS »
//
// Page dédiée ouverte par l'onglet « Mes projets » de la barre de navigation
// de l'application Android (et accessible directement par son URL).
//
// Elle affiche TOUS les projets de l'utilisateur connecté — en cours,
// terminés, réalisés (statut « terminé ») et archivés — dans des cartes
// modernes. Les données viennent de `projects.getMyProjectsForCards`, filtrée
// côté serveur sur la session : **les projets d'un autre utilisateur ne sont
// jamais renvoyés ni affichés**.
//
// Ouvrir une carte navigue vers le projet EXISTANT
// (`/dashboard/project/:id`) : aucune copie n'est créée, le contexte (coût,
// quantitatif, plan, matériaux…) est rechargé depuis le projet lui-même, qui
// reste le projet actif.
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

/** Tuile de statistique compacte (compteurs par statut). */
function StatTile({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  tone: string;
  icon: typeof HardHat;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-border/40 bg-background/60 px-3 py-2.5 backdrop-blur-sm">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", tone)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-base font-bold leading-none">{value}</p>
        <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}

/** Ligne d'information (icône + libellé discret + valeur). */
function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof HardHat;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="shrink-0 text-muted-foreground/70">{label}</span>
      <span className="truncate font-medium text-foreground/80">{value}</span>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectCardData }) {
  const navigate = useNavigate();
  const status = projectStatusMeta(project.status);
  const progress = projectProgress(project);
  const duration = projectDurationLabel(project);
  const region = projectRegionLabel(project);
  const typeLabel = projectTypeLabel(project.category ?? "");

  return (
    <button
      type="button"
      onClick={() => navigate(`/dashboard/project/${project._id}`)}
      aria-label={`Ouvrir le projet ${project.name ?? ""}`}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border border-border/40 bg-background/60 text-left backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.99]"
    >
      {/* Visuel : miniature du plan / document du projet si disponible,
          sinon repli graphique aux couleurs de la marque. */}
      <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent sm:h-32">
        {project.thumbnailUrl ? (
          <img
            src={project.thumbnailUrl}
            alt={project.thumbnailName ?? `Aperçu du projet ${project.name ?? ""}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <HardHat className="h-10 w-10 text-emerald-600/40 dark:text-emerald-400/30" />
          </div>
        )}

        <span
          className={cn(
            "absolute left-2 top-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm",
            status.badge,
          )}
        >
          {status.label}
        </span>

        {project.isFavorite && (
          <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/85 backdrop-blur-sm">
            <Heart className="h-3 w-3 fill-red-400 text-red-400" />
          </span>
        )}

        {project.thumbnailUrl && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[9px] font-medium text-muted-foreground backdrop-blur-sm">
            <FolderOpen className="h-2.5 w-2.5" />
            Document du projet
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        {/* Identité du projet */}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold sm:text-base">
            {project.name || "Projet sans nom"}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{typeLabel || "Type non précisé"}</span>
          </p>
        </div>

        {/* Caractéristiques + dates */}
        <div className="flex flex-col gap-1.5 border-t border-border/25 pt-2.5">
          <MetaRow
            icon={Ruler}
            label="Surface"
            value={project.surface ? `${project.surface} m²` : "—"}
          />
          <MetaRow icon={MapPin} label="Région" value={region ?? "—"} />
          <MetaRow icon={CalendarDays} label="Créé le" value={formatProjectDate(project.createdAt)} />
          <MetaRow icon={Clock} label="Modifié le" value={formatProjectDate(project.updatedAt)} />
          {duration && <MetaRow icon={Timer} label="Durée estimée" value={duration} />}
        </div>

        {/* Progression — calculée uniquement sur les jalons réels du dossier */}
        <div className="mt-auto border-t border-border/25 pt-2.5">
          <div className="mb-1.5 flex items-center justify-between text-[10px]">
            <span className="font-medium uppercase tracking-wider text-muted-foreground">
              Progression
            </span>
            <span className="font-semibold text-foreground">
              {progress.percent}%
              <span className="ml-1 font-normal text-muted-foreground">
                ({progress.done}/{progress.total})
              </span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className={cn("h-full rounded-full transition-all", status.accent)}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        {/* CTA — ouvre le projet existant (aucune copie, aucun doublon) */}
        <span className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/20 transition-all group-hover:from-emerald-500 group-hover:to-teal-500">
          Ouvrir le projet
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}

export default function MyProjects() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<MyProjectsFilter>("all");
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

  const counts = useMemo(() => countByFilter(projects ?? []), [projects]);
  const visible = useMemo(
    () => (projects ?? []).filter((project) => projectMatchesFilter(project, filter)),
    [projects, filter],
  );

  const loading = projects === undefined;

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.04] via-background to-background pb-16">
      {/* En-tête sticky : titre + action de création */}
      <header className="sticky top-0 z-40 border-b border-border/20 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              aria-label="Retour"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all hover:bg-muted/50 active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <LayoutGrid className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold leading-tight sm:text-base">Mes projets</h1>
              <p className="text-[10px] leading-tight text-muted-foreground">
                {loading
                  ? "Chargement…"
                  : `${counts.all} projet${counts.all > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {canCreateProject && (
            <Button
              size="sm"
              onClick={() => navigate("/dashboard/new")}
              className="h-9 shrink-0 gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-xs text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nouveau projet</span>
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        {/* Compteurs par statut */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile
            icon={LayoutGrid}
            label="Tous"
            value={loading ? "—" : counts.all}
            tone="bg-slate-500/10 text-slate-600 dark:text-slate-300"
          />
          <StatTile
            icon={HardHat}
            label="En cours"
            value={loading ? "—" : counts.active}
            tone="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          />
          <StatTile
            icon={Sparkles}
            label="Terminés"
            value={loading ? "—" : counts.completed}
            tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <StatTile
            icon={FolderOpen}
            label="Archivés"
            value={loading ? "—" : counts.archived}
            tone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
        </div>

        {/* Filtres — défilement horizontal fluide sur mobile */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {MY_PROJECTS_FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                aria-pressed={active}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all active:scale-[0.97]",
                  active
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {item.label}
                <span className="ml-1.5 text-[10px] text-muted-foreground">
                  {loading ? "" : counts[item.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Résultats */}
        <section className="mt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              <p className="text-xs">Chargement de vos projets…</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-300/40 bg-emerald-50/40 px-4 py-12 text-center dark:border-emerald-800/30 dark:bg-emerald-950/20">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                <HardHat className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
              </div>
              <p className="text-sm font-medium">
                {counts.all === 0 ? "Aucun projet pour le moment" : "Aucun projet dans ce filtre"}
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                {counts.all === 0
                  ? "Créez votre premier projet : l'IA estime la surface, les matériaux et le coût — marché tunisien 2026."
                  : "Changez de filtre pour retrouver vos autres projets."}
              </p>
              {counts.all === 0 && canCreateProject && (
                <Button
                  size="sm"
                  onClick={() => navigate("/dashboard/new")}
                  className="mt-4 gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-xs text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Nouveau projet
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
