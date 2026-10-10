import { useMutation } from "convex/react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowUpRight,
  Blocks,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  HardHat,
  Heart,
  Loader2,
  MapPin,
  MoreHorizontal,
  PencilRuler,
  Rocket,
  Trash2,
  TrendingUp,
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
import { TYPE_META, fmtTND, fmtPct } from "@/components/investment/shared";
import { REGION_LABELS } from "@/convex/investmentTypes";
import { projectTypeLabel } from "@/convex/projectTypes";
import { buildProjectQuickActions } from "@/lib/projectQuickActions";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { projectJourneyGroup } from "@/lib/projectJourney";
import { buildInvestmentHistoryEntry } from "@/lib/investmentHistory";
import { ANALYSIS_STATUS_LABEL, type AnalysisHistoryStatus } from "@/lib/analysisHistory";

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
  const quickActions = buildProjectQuickActions(project).filter((a) => {
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

        {/* ─── Accès rapides : modules du projet (Groupe A uniquement) ───
          * Maison, villa, appartement, studio, duplex, immeuble, local
          * commercial, bureau, entrepôt, résidence touristique, projet
          * immobilier neuf. Les projets du Groupe B (rénovation, cuisine,
          * salle de bain, piscine…) n'affichent pas cette section : leur
          * parcours passe par la barre d'étapes de la page projet.
          */}
        {projectJourneyGroup(project.category) === "A" && (
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

// ============================================================================
// Investment Analysis Card (projet d'investissement enregistré)
// Même style de carte que l'historique des analyses Matériaux AI.
// ============================================================================

/** Style du badge de statut — mêmes couleurs que les cartes d'historique Matériaux AI. */
const INVESTMENT_STATUS_STYLE: Record<AnalysisHistoryStatus, { icon: any; className: string }> = {
  completed: {
    icon: CheckCircle2,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  running: {
    icon: Loader2,
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  error: {
    icon: AlertTriangle,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-500",
  },
};

/** Date longue, même format que les cartes d'historique Matériaux AI. */
function fmtLongDate(ts: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function InvestmentCard({ analysis }: { analysis: any }) {
  const navigate = useNavigate();
  const toggleFavorite = useMutation(api.investments.toggleFavorite);
  const deleteAnalysis = useMutation(api.investments.deleteAnalysis);

  // Mêmes données qu'avant (indicators / score / input), simplement présentées.
  const entry = buildInvestmentHistoryEntry(analysis);
  const badge = INVESTMENT_STATUS_STYLE[entry.status];
  const StatusIcon = badge.icon;
  const typeLabel = entry.investmentType
    ? TYPE_META[entry.investmentType as keyof typeof TYPE_META]?.label ?? entry.investmentType
    : "Investissement";
  const regionLabel = entry.region ? REGION_LABELS[entry.region] ?? entry.region : null;
  const open = () => navigate(`/dashboard/investments/result/${entry.id}`);

  return (
    <Card
      className="group flex h-full cursor-pointer flex-col gap-0 rounded-xl border border-border/40 bg-card/60 p-3 transition-all duration-200 hover:border-emerald-400/40 hover:bg-card hover:shadow-sm active:scale-[0.98]"
      onClick={open}
    >
      {/* Icône du module + nom + date + menu ⋯ */}
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold leading-tight" title={entry.name || typeLabel}>
            {entry.name || typeLabel}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
            <CalendarDays className="h-2.5 w-2.5 shrink-0" />
            Analyse réalisée le {fmtLongDate(entry.createdAt)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Actions de l'analyse"
              className="h-8 w-8 shrink-0 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 sm:h-7 sm:w-7"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          {/* Le menu est rendu dans un portail : on isole les clics du clic carte. */}
          <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem className="cursor-pointer gap-2 text-xs" onClick={open}>
              <ArrowUpRight className="h-3.5 w-3.5" /> Voir l'analyse
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-xs"
              onClick={() => toggleFavorite({ analysisId: entry.id as any })}
            >
              <Heart className={cn("h-3.5 w-3.5", entry.isFavorite && "fill-red-400 text-red-400")} />
              {entry.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive"
              onClick={async () => {
                await deleteAnalysis({ analysisId: entry.id as any });
                toast.success("Analyse supprimée");
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Statut + contexte du bien */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold",
          badge.className,
        )}>
          <StatusIcon className={cn("h-2.5 w-2.5", entry.status === "running" && "animate-spin")} />
          {ANALYSIS_STATUS_LABEL[entry.status]}
        </span>
        {entry.isFavorite && (
          <Heart className="h-2.5 w-2.5 shrink-0 fill-red-400 text-red-400" />
        )}
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-300">
          {typeLabel}
        </span>
        {regionLabel && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/20 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
            <MapPin className="h-2.5 w-2.5" />
            {regionLabel}
          </span>
        )}
        {entry.area ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/20 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
            <HardHat className="h-2.5 w-2.5" />
            {entry.area} m²
          </span>
        ) : null}
      </div>

      {/* Résumé — exactement les mêmes indicateurs qu'avant */}
      {entry.hasResults && (
        <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-lg bg-muted/30 px-2.5 py-2">
          <div className="min-w-0">
            <span className="block text-[9px] text-muted-foreground">Coût total</span>
            <p className="truncate text-xs font-bold tabular-nums">
              {entry.totalCost !== null ? fmtTND(entry.totalCost) : "—"}
            </p>
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] text-muted-foreground">Rendement net</span>
            <p className="truncate text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {entry.netYieldPct !== null ? fmtPct(entry.netYieldPct) : "—"}
            </p>
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] text-muted-foreground">Cashflow</span>
            <p className="truncate text-xs font-bold tabular-nums text-blue-600 dark:text-blue-400">
              {entry.monthlyCashflow !== null ? `${fmtTND(entry.monthlyCashflow)}/mois` : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Score IA (valeur inchangée, mise en évidence) */}
      {entry.score !== null && (
        <div className="mt-2 flex items-center gap-2">
          <span className="shrink-0 text-[10px] text-muted-foreground">Score IA</span>
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
              style={{ width: `${Math.max(0, Math.min(100, entry.score))}%` }}
            />
          </div>
          <span className="shrink-0 text-[10px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {entry.score}/100
          </span>
        </div>
      )}

      {/* Action principale — alignée en bas de carte */}
      <div className="mt-auto pt-2.5">
        <Button
          size="sm"
          className="h-9 w-full gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-xs text-white shadow-sm shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98]"
          onClick={(e) => { e.stopPropagation(); open(); }}
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          Voir l'analyse
        </Button>
      </div>
    </Card>
  );
}

// ============================================================================
// Stats Card (compact mobile version)
// ============================================================================

export function StatsCard({ icon: Icon, label, value, gradient, iconColor }: any) {
  return (
    <Card className="group border border-border/40 bg-card/60 shadow-soft transition-all duration-200 hover:border-primary/25 hover:shadow-soft-lg">
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="label-overline truncate">{label}</p>
            <p className="text-base sm:text-lg lg:text-2xl font-black mt-1 truncate tabular-nums">{value}</p>
          </div>
          <div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} ${iconColor} transition-transform duration-200 group-hover:scale-105`}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
