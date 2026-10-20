import { useMutation } from "convex/react";
import { useNavigate } from "react-router";
import {
  ArrowUpRight,
  Blocks,
  Building2,
  Clock,
  HardHat,
  Heart,
  Loader2,
  MoreHorizontal,
  PencilRuler,
  Rocket,
  Trash2,
  Users,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { projectTypeLabel } from "@/convex/projectTypes";
import { buildProjectQuickActions } from "@/lib/projectQuickActions";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { projectJourneyGroup } from "@/lib/projectJourney";

// ============================================================================
// Cartes réutilisables du tableau de bord (extraites de `Dashboard.tsx`)
// ============================================================================
// `Dashboard.tsx` dépasse la taille maximale manipulable par les outils
// d'édition ; extraire ces composants le fait repasser sous la limite ET rend
// ces cartes réutilisables ailleurs (aucun changement de rendu).

/**
 * Icônes des accès rapides — famille **lucide**, la même que le reste de la
 * plateforme (aucune image externe) :
 *   Matériaux → `Blocks` (briques / cubes) · Démarche → `Rocket` (guide de
 *   construction A-Z, la même icône que sur la page projet) ·
 *   Expert → `Users` · Plan AI → `PencilRuler` (plan / règle).
 */
export const PROJECT_QUICK_ICONS: Record<string, any> = {
  materials: Blocks,
  guide: Rocket,
  expert: Users,
  plan: PencilRuler,
};

export function ProjectCard({ project }: { project: any }) {
  const navigate = useNavigate();
  const toggleFavorite = useMutation(api.projects.toggleFavorite);
  const deleteProject = useMutation(api.projects.deleteProject);

  // ACCÈS RAPIDES — modules liés au projet (routes + contexte du projet).
  // Voir `@/lib/projectQuickActions` (construction des liens, testée).
  const { isEnabled: isFeatureEnabled } = useFeatureFlags();
  // Groupe réel du projet (classification centrale) : seuls les projets du
  // groupe A disposent des plans AI et de l'exécution & suivi ; les groupes B
  // et C n'ont que le coût estimatif puis la mise en relation.
  const journeyGroup = projectJourneyGroup(project.category);
  const quickActions = buildProjectQuickActions(project).filter((a) => {
    // « Plan AI » et « Démarche » (Exécution & Suivi) n'existent que pour le
    // groupe A : aucun lien résiduel vers une étape absente du parcours.
    if ((a.key === "plan" || a.key === "guide") && journeyGroup !== "A") {
      return false;
    }
    // Feature flags : les modules désactivés par l'admin disparaissent des
    // cartes (aucun accès visuel résiduel). Même configuration centrale que
    // les gardes de routes et le parcours du projet — aucun lien résiduel
    // vers une page devenue inaccessible.
    if (a.key === "plan") return isFeatureEnabled("architectural_plans");
    if (a.key === "materials") return isFeatureEnabled("ai_materials");
    if (a.key === "guide") return isFeatureEnabled("construction_guide");
    return true;
  });

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    analyzing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    archived: "bg-slate-100 text-slate-500 dark:bg-slate-900/30 dark:text-slate-400",
  };

  const statusLabels: Record<string, string> = {
    draft: "Brouillon",
    analyzing: "Analyse...",
    completed: "Terminé",
    archived: "Archivé",
  };

  return (
    <Card
      className="group relative border border-border/40 hover:border-primary/20 transition-all duration-200 hover:shadow-md bg-background/50 backdrop-blur-sm cursor-pointer overflow-hidden active:scale-[0.98]"
      onClick={() => navigate(`/dashboard/project/${project._id}`)}
    >
      <div className={`absolute top-0 left-0 w-[3px] h-full ${project.status === 'completed' ? 'bg-emerald-500' : project.status === 'analyzing' ? 'bg-blue-500' : project.status === 'draft' ? 'bg-yellow-500' : 'bg-slate-500'}`} />
      <div className="p-3 sm:p-4 pl-4 sm:pl-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium ${statusColors[project.status] || statusColors.draft}`}>
                {statusLabels[project.status] || project.status}
              </span>
              {project.isFavorite && <Heart className="h-3 w-3 fill-red-400 text-red-400 shrink-0" />}
            </div>
            <h3 className="text-sm sm:text-base font-semibold truncate mt-1">{project.name}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 opacity-70 hover:opacity-100">
                <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 sm:w-40">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleFavorite({ projectId: project._id }); }} className="cursor-pointer gap-2 text-xs sm:text-sm">
                <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${project.isFavorite ? 'fill-red-400 text-red-400' : ''}`} />
                {project.isFavorite ? "Retirer favori" : "Favori"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/project/${project._id}`); }} className="cursor-pointer gap-2 text-xs sm:text-sm">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Ouvrir
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async (e) => {
                  e.stopPropagation();
                  if (project.status === 'completed') {
                    alert("Les projets terminés ne peuvent pas être supprimés.");
                    return;
                  }
                  if (confirm("Supprimer ?")) await deleteProject({ projectId: project._id });
                }}
                className={cn(
                  "cursor-pointer gap-2 text-xs sm:text-sm",
                  project.status === 'completed'
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : "text-destructive focus:text-destructive"
                )}
                disabled={project.status === 'completed'}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {project.status === 'completed' ? "Non supprimable" : "Supprimer"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground mb-2 flex-wrap">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[70px] sm:max-w-none">{projectTypeLabel(project.category)}</span>
          </span>
          {project.surface && (
            <span className="flex items-center gap-1">
              <HardHat className="h-3 w-3 shrink-0" />
              {project.surface}m²
            </span>
          )}
          <span className="flex items-center gap-1 text-muted-foreground/60">
            <Clock className="h-3 w-3 shrink-0" />
            {new Date(project.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </span>
        </div>

        {/* ─── Accès rapides : modules réellement accessibles au projet ───
          * « Plan AI » et « Démarche » (Exécution & Suivi) réservés au groupe A :
          * les groupes B et C ne conservent que les modules de leur parcours
          * (coût estimatif → mise en relation). Aucun lien direct vers une étape
          * absente du parcours.
          */}
        {quickActions.length > 0 && (
        <div className="pt-2 border-t border-border/20">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 mb-1.5">
            Accès rapides
          </p>
          {/* Rangée scrollable sur petit écran : aucun bouton n'est coupé. */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            {quickActions.map((a) => {
              const Icon = PROJECT_QUICK_ICONS[a.key];
              return (
                <button
                  key={a.key}
                  type="button"
                  title={a.label}
                  aria-label={`${a.label} — ${project.name}`}
                  onClick={(e) => {
                    // La carte entière ouvre le projet : on isole le bouton.
                    e.stopPropagation();
                    navigate(a.href);
                  }}
                  className={cn(
                    "flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border/40 bg-muted/20 px-2",
                    "text-[10px] sm:text-[11px] font-medium text-muted-foreground transition-all",
                    "active:scale-95",
                    a.tone,
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        )}

        {project.costEstimate ? (
          <div className="flex items-center justify-between pt-2 border-t border-border/20">
            <div>
              <span className="text-[10px] text-muted-foreground">Estimation</span>
              <p className="text-sm sm:text-base font-bold text-primary">
                {new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(project.costEstimate.totalCost)}
              </p>
            </div>
            {project.costEstimate.costPerSquareMeter && (
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground">Prix/m²</span>
                <p className="text-xs sm:text-sm font-semibold">
                  {new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(project.costEstimate.costPerSquareMeter)}
                </p>
              </div>
            )}
          </div>
        ) : project.status === "draft" ? (
          <div className="pt-2 border-t border-border/20">
            <p className="text-[10px] sm:text-xs text-muted-foreground">En attente d'analyse</p>
          </div>
        ) : project.status === "analyzing" ? (
          <div className="pt-2 border-t border-border/20">
            <div className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">Analyse...</span>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

// ============================================================================
// Mini Stat (compact chip with icon)
// ============================================================================

export function MiniStat({ icon: Icon, label, value, tone }: any) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-muted/20 px-3 py-2">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone?.bg ?? "bg-primary/10"}`}>
        <Icon className={`h-3.5 w-3.5 ${tone?.text ?? "text-primary"}`} />
      </div>
      <div className="min-w-0">
        <p className="label-overline truncate">{label}</p>
        <p className="text-sm font-bold truncate tabular-nums">{value}</p>
      </div>
    </div>
  );
}
