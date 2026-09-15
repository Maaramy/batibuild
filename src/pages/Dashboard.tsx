import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { LogoMark } from "@/components/Logo";
import { AvatarWithInitials } from "@/components/AvatarWithInitials";
import { api } from "@/convex/_generated/api";
import { ClientProPaywall } from "@/components/ClientProPaywall";
import { AnnouncementCarousel } from "@/components/announcements/AnnouncementCarousel";
import { ProfileCompletionBanner } from "@/components/ProfileCompletionBanner";
import { useQuery, useMutation } from "convex/react";
import {
  LayoutDashboard,
  Plus,
  HardHat,
  LogOut,
  TrendingUp,
  Clock,
  CheckCircle2,
  FileText,
  Star,
  MoreHorizontal,
  Trash2,
  Heart,
  BarChart3,
  Settings,
  Bell,
  Building2,
  Search,
  ArrowUpRight,
  Moon,
  Sun,
  CreditCard,
  Loader2,
  Menu,
  X,
  Shield,
  Store,
  Briefcase,
  User,
  AlertTriangle,
  Landmark,
  Wallet,
  Sparkles,
  Headset,
  MapPin,
  Percent,
  Gauge,
  ChevronDown,
  Rocket,
  MessageSquare,
  Blocks,
  Users,
  PencilRuler,
  Link,
  Eye,
  MousePointerClick,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "next-themes";
import { usePageSEO } from "@/hooks/use-page-seo";
import { TYPE_META, fmtTND, fmtPct } from "@/components/investment/shared";
import { REGION_LABELS } from "@/convex/investmentTypes";
import { projectTypeLabel } from "@/convex/projectTypes";
import { buildProjectQuickActions } from "@/lib/projectQuickActions";
import { buildInvestmentHistoryEntry } from "@/lib/investmentHistory";
import { ANALYSIS_STATUS_LABEL, type AnalysisHistoryStatus } from "@/lib/analysisHistory";

// ============================================================================
// Project Card (compact for mobile)
// ============================================================================

/**
 * Icônes des accès rapides — famille **lucide**, la même que le reste de la
 * plateforme (aucune image externe) :
 *   Matériaux → `Blocks` (briques / cubes) · Démarche → `Rocket` (guide de
 *   construction A-Z, la même icône que sur la page projet) ·
 *   Expert → `Users` · Plan AI → `PencilRuler` (plan / règle).
 */
const PROJECT_QUICK_ICONS: Record<string, any> = {
  materials: Blocks,
  guide: Rocket,
  expert: Users,
  plan: PencilRuler,
  // ProMarket — même icône que l'accès ProMarket de l'en-tête et du menu.
  promarket: Store,
};

function ProjectCard({ project }: { project: any }) {
  const navigate = useNavigate();
  const toggleFavorite = useMutation(api.projects.toggleFavorite);
  const deleteProject = useMutation(api.projects.deleteProject);

  // ACCÈS RAPIDES — modules liés au projet (routes + contexte du projet).
  // Voir `@/lib/projectQuickActions` (construction des liens, testée).
  const quickActions = buildProjectQuickActions(project);


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

        {/* ─── Accès rapides : modules du projet (contexte transmis) ─── */}
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

function MiniStat({ icon: Icon, label, value, tone }: any) {
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

function InvestmentCard({ analysis }: { analysis: any }) {
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
      className="group flex h-full cursor-pointer flex-col gap-0 rounded-xl border border-border/40 bg-card/60 p-3 transition-all duration-200 hover:border-indigo-400/40 hover:bg-card hover:shadow-sm active:scale-[0.98]"
      onClick={open}
    >
      {/* Icône du module + nom + date + menu ⋯ */}
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/15 to-blue-500/10 text-indigo-600 dark:text-indigo-400">
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
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-medium text-indigo-600 dark:text-indigo-300">
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
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
              style={{ width: `${Math.max(0, Math.min(100, entry.score))}%` }}
            />
          </div>
          <span className="shrink-0 text-[10px] font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
            {entry.score}/100
          </span>
        </div>
      )}

      {/* Action principale — alignée en bas de carte */}
      <div className="mt-auto pt-2.5">
        <Button
          size="sm"
          className="h-9 w-full gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 text-xs text-white shadow-sm shadow-indigo-600/20 hover:from-indigo-500 hover:to-blue-500 active:scale-[0.98]"
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

function StatsCard({ icon: Icon, label, value, gradient, iconColor }: any) {
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

const PLAN_LABELS: Record<string, string> = { pro: "Client Pro", expert: "Expert", supplier: "Fournisseur" };

// Nom du forfait actif : plan d'abonnement, sinon offre dérivée du profil utilisateur.
function getActivePlanLabel(user?: { subscriptionPlan?: string | null; userRole?: string | null } | null): string {
  const plan = user?.subscriptionPlan;
  if (plan && plan !== "free") {
    return PLAN_LABELS[plan] ?? "Client Pro";
  }
  if (user?.userRole === "supplier") return "Fournisseur";
  if (user?.userRole === "expert") return "Expert";
  return "Client Pro";
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function Dashboard() {
  usePageSEO({ title: "Tableau de bord - batibuild App", description: "Gérez vos projets de construction et suivez vos estimations sur batibuild App." });
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // « Voir plus / Voir moins » — 3 éléments par défaut
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllInvestments, setShowAllInvestments] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  // Role switch view mode: client | supplier | expert
  const [viewMode, setViewMode] = useState<"client" | "supplier" | "expert">(
    user?.userRole === "supplier" ? "supplier" : user?.userRole === "expert" ? "expert" : "client",
  );
  // Sub-menu expansion state for professional sidebar
  const [proMenuOpen, setProMenuOpen] = useState(true);

  const setUserRole = useMutation(api.users.setUserRole);

  // Role change handler (same as ProfilePage)
  const handleRoleChange = async (newRole: string) => {
    if (newRole === (user as any)?.userRole) return;
    setSavingRole(true);
    try {
      await setUserRole({ userRole: newRole as any });
      toast.success(`Profil mis à jour : ${
        newRole === "supplier" ? "Fournisseur" : newRole === "expert" ? "Expert" : "Client Pro"
      }`);
      window.location.reload();
    } catch (err) {
      toast.error("Erreur lors de la mise à jour du rôle");
    }
    setSavingRole(false);
  };

  useEffect(() => setMounted(true), []);

  const announcements = useQuery(api.announcements.getAnnouncementsForUser) || [];
  const projects = useQuery(api.projects.getUserProjects, {}) || [];
  const analyses = useQuery(api.investments.listAnalyses) || [];
  const stats = useQuery(api.projects.getProjectStats) || {
    totalProjects: 0, completedProjects: 0, analyzingProjects: 0, draftProjects: 0,
    totalEstimatedCost: 0, averageCostPerProject: 0, recentProjects: [],
  };

  // ── Role switch: supplier/expert profile queries ──
  const isSupplier = user?.userRole === "supplier";
  const isExpert = user?.userRole === "expert";
  const supplierProfile = useQuery(
    api.supplierProfiles.getMyProfile,
    isSupplier ? {} : "skip",
  );
  const hasSupplierProfile = useQuery(
    api.supplierProfiles.hasSupplierProfile,
    isSupplier ? {} : "skip",
  );
  const expertProfile = useQuery(
    api.expertProfiles.getMyProfile,
    isExpert ? {} : "skip",
  );
  const hasExpertProfile = useQuery(
    api.expertProfiles.hasExpertProfile,
    isExpert ? {} : "skip",
  );
  // ── Real-time stats (expert + supplier) ──
  const expertKPIs = useQuery(
    api.expertStats.getExpertKPIs,
    isExpert ? { period: "30d" } : "skip",
  );
  const supplierKPIs = useQuery(
    api.supplierStats.getSupplierKPIs,
    isSupplier ? { period: "30d" } : "skip",
  );
  // ── Badges temps réel : demandes non consultées ──
  const expertUnread = useQuery(
    api.expertServiceRequests.unreadCount,
    isExpert ? {} : "skip",
  );
  const supplierUnread = useQuery(
    api.quoteRequests.unreadCount,
    isSupplier ? {} : "skip",
  );
  // ── Badges côté client : réponses fournisseurs / experts non consultées ──
  const supplierResponsesUnread = useQuery(api.quoteResponses.unreadCount);
  const expertResponsesUnread = useQuery(
    api.expertServiceRequests.responsesUnreadCount,
  );
  const clientUnread = (supplierResponsesUnread ?? 0) + (expertResponsesUnread ?? 0);
  const totalUnread = (supplierUnread ?? 0) + (expertUnread ?? 0) + clientUnread;
  // ── Badge Support : messages de support non lus (badge rouge du menu) ──
  const supportUnread = useQuery(api.support.myUnreadTotal) ?? 0;
  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const costSeries = useMemo(() => {
    const byMonth = new Map<string, { label: string; total: number }>();
    (projects as any[]).forEach((p) => {
      const total = p.costEstimate?.totalCost;
      if (!total) return;
      const d = new Date(p.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = byMonth.get(key) ?? {
        label: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
        total: 0,
      };
      cur.total += total;
      byMonth.set(key, cur);
    });
    return [...byMonth.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([, v]) => v);
  }, [projects]);

  // ── Statistiques des projets d'investissement enregistrés ──
  const investStats = useMemo(() => {
    let totalBudget = 0;
    const yields: number[] = [];
    let bestScore = 0;
    let favorites = 0;
    (analyses as any[]).forEach((a) => {
      totalBudget += a.results?.indicators?.totalCost ?? 0;
      if (typeof a.results?.indicators?.netYieldPct === "number") yields.push(a.results.indicators.netYieldPct);
      bestScore = Math.max(bestScore, a.results?.score?.total ?? 0);
      if (a.isFavorite) favorites++;
    });
    return {
      totalBudget,
      avgYield: yields.length ? yields.reduce((s, v) => s + v, 0) / yields.length : 0,
      bestScore,
      favorites,
    };
  }, [analyses]);

  const filteredProjects = projects.filter((p: any) => {
    if (activeTab === "favorites") return p.isFavorite;
    if (activeTab === "completed") return p.status === "completed";
    if (activeTab === "drafts") return p.status === "draft";
    if (activeTab === "analyzing") return p.status === "analyzing";
    return true;
  }).filter((p: any) =>
    searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  // ── Tranches affichées (3 par défaut + « Voir plus ») ──
  const visibleProjects = showAllProjects ? filteredProjects : filteredProjects.slice(0, 3);
  const visibleInvestments = showAllInvestments ? analyses : analyses.slice(0, 3);
  const projectFavorites = projects.filter((p: any) => p.isFavorite).length;

  const formatter = new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 });

  const sidebarContent = (
    <>
      <div className="p-4 sm:p-5 border-b border-border/30">
        <div className="flex items-center gap-2">
          <LogoMark className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg" />
          <div>
            <span className="text-sm sm:text-base font-semibold">batibuild App</span>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">Tableau de bord</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 sm:p-4 space-y-0.5">
        {/* Role switch button for professionals */}
        {(isSupplier || isExpert) && (
          <div className="mb-2">
            <div className="flex items-center gap-1 rounded-lg border border-border/40 bg-muted/20 p-0.5">
              <button
                onClick={() => { setViewMode(isSupplier ? "supplier" : "expert"); setMobileSidebarOpen(false); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] sm:text-xs font-medium transition-all",
                  viewMode !== "client" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                )}>
                {isSupplier ? <Store className="h-3 w-3" /> : <Briefcase className="h-3 w-3" />}
                {isSupplier ? "Fournisseur" : "Expert"}
              </button>
              <button
                onClick={() => { setViewMode("client"); setMobileSidebarOpen(false); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] sm:text-xs font-medium transition-all",
                  viewMode === "client" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                )}>
                <User className="h-3 w-3" />
                Client
              </button>
            </div>
          </div>
        )}        {(() => {
          const inClientMode = viewMode === "client";
          return [
            { icon: LayoutDashboard, label: "Tableau de bord", active: true, onClick: () => setMobileSidebarOpen(false) },
            // Client features — only visible in client mode
            ...(inClientMode ? [
              { icon: Plus, label: "Nouveau projet", onClick: () => { navigate("/dashboard/new"); setMobileSidebarOpen(false); } },
              { icon: Rocket, label: "Démarche de construction", onClick: () => { navigate("/dashboard/guide"); setMobileSidebarOpen(false); } },
              { icon: Star, label: "Projets favoris", onClick: () => { setActiveTab("favorites"); setMobileSidebarOpen(false); } },
              { icon: TrendingUp, label: "Prix matériaux", onClick: () => { navigate("/dashboard/materials"); setMobileSidebarOpen(false); } },
              { icon: Sparkles, label: "Assistant Matériaux IA", onClick: () => { navigate("/dashboard/ai-materials"); setMobileSidebarOpen(false); } },
              { icon: Landmark, label: "Investissements immobiliers", onClick: () => { navigate("/dashboard/investments"); setMobileSidebarOpen(false); } },
              { icon: Store, label: "ProMarket", onClick: () => { navigate("/promarket"); setMobileSidebarOpen(false); } },
              { icon: Briefcase, label: "Espace professionnel ProMarket", onClick: () => { navigate("/promarket/pro-space"); setMobileSidebarOpen(false); } },
            ] : []),
            // Professional features — parent + submenu
            ...(viewMode === "supplier" ? [
              { icon: Store, label: "Espace fournisseur", isExpandable: true, badge: supplierUnread ?? 0, onClick: () => { setProMenuOpen(!proMenuOpen); } },
            ] : []),
            ...(viewMode === "expert" ? [
              { icon: Briefcase, label: "Espace expert", isExpandable: true, badge: expertUnread ?? 0, onClick: () => { setProMenuOpen(!proMenuOpen); } },
            ] : []),
            // Sub-menu items (shown when expanded)
            ...(viewMode === "supplier" && proMenuOpen ? [
              { icon: FileText, label: "Devis reçus", isSubItem: true, badge: supplierUnread ?? 0, onClick: () => { navigate("/dashboard/supplier/quotes"); setMobileSidebarOpen(false); } },
              { icon: BarChart3, label: "Statistiques", isSubItem: true, onClick: () => { navigate("/dashboard/supplier/stats"); setMobileSidebarOpen(false); } },
              { icon: Settings, label: "Mon profil fournisseur", isSubItem: true, onClick: () => { navigate("/dashboard/supplier"); setMobileSidebarOpen(false); } },
            ] : []),
            ...(viewMode === "expert" && proMenuOpen ? [
              { icon: FileText, label: "Devis reçus", isSubItem: true, badge: expertUnread ?? 0, onClick: () => { navigate("/dashboard/expert/services"); setMobileSidebarOpen(false); } },
              { icon: BarChart3, label: "Statistiques", isSubItem: true, onClick: () => { navigate("/dashboard/expert/stats"); setMobileSidebarOpen(false); } },
              { icon: Settings, label: "Mon profil expert", isSubItem: true, onClick: () => { navigate("/dashboard/expert"); setMobileSidebarOpen(false); } },
            ] : []),
            { icon: MessageSquare, label: "Messagerie", badge: clientUnread, onClick: () => { navigate("/dashboard/messages"); setMobileSidebarOpen(false); } },
            { icon: Headset, label: "Support", badge: supportUnread, onClick: () => { navigate("/dashboard/support"); setMobileSidebarOpen(false); } },
            { icon: User, label: "Mon profil", onClick: () => { navigate("/dashboard/profile"); setMobileSidebarOpen(false); } },
            ...(user?.role === "admin" || user?.role === "moderator" ? [{ icon: Shield, label: "Administration", onClick: () => { navigate("/dashboard/admin"); setMobileSidebarOpen(false); } }] : []),
          ];
        })().map((item) => (
          <div key={item.label}>
            <button onClick={item.onClick}
              className={`w-full flex items-center gap-2 sm:gap-3 ${'isSubItem' in item && item.isSubItem ? 'pl-9 sm:pl-10' : 'px-2.5 sm:px-3'} py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm transition-all ${
                'active' in item && item.active ? "bg-primary/10 text-primary font-medium"
                : 'isExpandable' in item && item.isExpandable ? "text-foreground font-medium"
                : 'isSubItem' in item && item.isSubItem ? "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}>
              <div className="relative shrink-0">
                {'icon' in item && <item.icon className="h-4 w-4" />}
                {'badge' in item && typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white shadow-sm">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="flex-1 text-left truncate">{item.label}</span>
              {'badge' in item && typeof item.badge === 'number' && item.badge > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
              {'isExpandable' in item && item.isExpandable && (
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${proMenuOpen ? 'rotate-180' : ''}`} />
              )}
            </button>
          </div>
        ))}
      </nav>
      <div className="p-3 sm:p-4 border-t border-border/30 space-y-1.5">
        <button onClick={() => navigate("/dashboard/settings")}
          className="w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
          <Settings className="h-4 w-4 shrink-0" />
          Paramètres
        </button>
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all">
          <LogOut className="h-4 w-4 shrink-0" />
          Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <main className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative w-64 sm:w-72 h-full bg-background border-r border-border/50 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex justify-end p-2">
              <button onClick={() => setMobileSidebarOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted/50">
                <X className="h-4 w-4" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-56 lg:w-64 border-r border-border/40 bg-background/80 backdrop-blur-sm hidden lg:flex flex-col z-40">
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="lg:pl-56 xl:pl-64">
        {/* Top header */}
        <header className="glass-header sticky top-0 z-30">
          <div className="flex items-center justify-between px-3 sm:px-5 lg:px-6 h-12 sm:h-14 lg:h-16">
            <div className="flex items-center gap-2 lg:gap-3 min-w-0">
              <button onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 active:bg-muted/50">
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm sm:text-base font-semibold truncate">
                    {viewMode === "supplier" ? "Espace Fournisseur" : viewMode === "expert" ? "Espace Expert" : "Dashboard"}
                  </h1>
                  <Badge
                    variant="secondary"
                    className={`text-[8px] sm:text-[9px] px-1.5 py-0 h-4 sm:h-[18px] font-semibold shrink-0 ${
                      user?.userRole === "supplier"
                        ? "bg-amber-500/10 text-amber-600 border-amber-200/30 dark:text-amber-400"
                        : user?.userRole === "expert"
                        ? "bg-blue-500/10 text-blue-600 border-blue-200/30 dark:text-blue-400"
                        : "bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {user?.userRole === "supplier" ? "Fournisseur" : user?.userRole === "expert" ? "Expert" : "Client Pro"}
                  </Badge>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {viewMode === "supplier"
                    ? (supplierProfile ? "Statistiques et devis" : "Créez votre profil fournisseur")
                    : viewMode === "expert"
                      ? (expertProfile ? "Statistiques et services" : "Créez votre profil expert")
                      : user?.name ? `Bienvenue, ${user.name.split(' ')[0]}` : "Gérez vos projets de construction"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* ProMarket — accès direct depuis l'en-tête */}
              <Button
                variant="ghost"
                size="icon"
                aria-label="ProMarket"
                title="ProMarket — Trouvez le bon professionnel près de chez vous"
                className="h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 cursor-pointer"
                onClick={() => navigate("/promarket")}
              >
                <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={totalUnread > 0 ? `${totalUnread} nouvelle(s) demande(s) de devis` : "Notifications"}
                className="h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 relative cursor-pointer"
                onClick={() => {
                  const proUnread = (supplierUnread ?? 0) + (expertUnread ?? 0);
                  // Réponses fournisseur/expert non lues → messagerie d'abord
                  if (clientUnread > 0 && proUnread === 0) {
                    navigate("/dashboard/messages");
                    return;
                  }
                  if (viewMode === "supplier" && hasSupplierProfile) navigate("/dashboard/supplier/quotes");
                  else if (viewMode === "expert" && hasExpertProfile) navigate("/dashboard/expert/services");
                  else navigate("/dashboard/messages");
                }}
              >
                <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {totalUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] sm:text-[9px] font-bold text-white animate-in zoom-in-50">
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </span>
                )}
              </Button>
              {mounted && (
                <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="inline-flex h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 items-center justify-center rounded-lg border border-border/40 text-foreground/70 hover:text-foreground active:bg-muted/50 transition-all">
                  <Sun className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-all ${theme === "dark" ? "rotate-90 scale-0" : "rotate-0 scale-100"}`} />
                  <Moon className={`absolute h-3.5 w-3.5 sm:h-4 sm:w-4 transition-all ${theme === "dark" ? "rotate-0 scale-100" : "-rotate-90 scale-0"}`} />
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 border border-border/40 cursor-pointer">
                    <AvatarImage src={user?.image || ""} alt="Photo" className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary text-[9px] sm:text-[10px] lg:text-xs">
                      {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 border-b border-border/20">
                    <p className="text-xs font-medium truncate">{user?.name || "Utilisateur"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email || ""}</p>
                  </div>
                  <DropdownMenuItem onClick={() => navigate("/dashboard/profile")} className="cursor-pointer gap-2 text-xs">
                    <User className="h-3.5 w-3.5" />
                    Mon profil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard/pricing")} className="cursor-pointer gap-2 text-xs">
                    <CreditCard className="h-3.5 w-3.5" />
                    Abonnement
                  </DropdownMenuItem>
                  {(user?.role === "admin" || user?.role === "moderator") && (
                    <DropdownMenuItem onClick={() => navigate("/dashboard/admin")} className="cursor-pointer gap-2 text-xs">
                      <Shield className="h-3.5 w-3.5" />
                      Administration
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive">
                    <LogOut className="h-3.5 w-3.5" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="p-3 sm:p-5 lg:p-6 xl:p-8 space-y-3 sm:space-y-4 lg:space-y-6">
          {/* ══════ PROFIL INCOMPLET (nom / téléphone manquants) ══════ */}
          <ProfileCompletionBanner />


          {/* ══════ NOTIFICATION BANNERS (Supplier / Expert) ══════ */}
          {isSupplier && (
            <>
              {!hasSupplierProfile ? (
                <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Store className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">Créez votre profil Fournisseur pour activer le service.</p>
                  </div>
                  <Button size="sm" className="h-8 shrink-0 gap-1.5 text-xs" onClick={() => navigate("/dashboard/supplier")}>
                    <Link className="h-3.5 w-3.5" />
                    Créer
                  </Button>
                </div>
              ) : supplierProfile && (
                !(supplierProfile as any).companyName ||
                !(supplierProfile as any).phone ||
                !(supplierProfile as any).email ||
                !(supplierProfile as any).address ||
                ((supplierProfile as any).specialties?.length ?? 0) === 0 ||
                ((supplierProfile as any).regions?.length ?? 0) === 0
              ) ? (
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/30 dark:bg-amber-950/30">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">Complétez votre profil Fournisseur.</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1.5 text-xs" onClick={() => navigate("/dashboard/supplier")}>
                    <Link className="h-3.5 w-3.5" />
                    Compléter
                  </Button>
                </div>
              ) : supplierProfile && (supplierProfile as any).effectiveStatus !== "active" ? (
                <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-800/30 dark:bg-orange-950/30">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40">
                    <CreditCard className="h-4.5 w-4.5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">Effectuez le paiement pour activer votre profil.</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1.5 text-xs" onClick={() => navigate("/dashboard/supplier")}>
                    <Link className="h-3.5 w-3.5" />
                    Payer
                  </Button>
                </div>
              ) : null}
            </>
          )}

          {isExpert && (
            <>
              {!hasExpertProfile ? (
                <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-800/30 dark:bg-violet-950/30">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
                    <Briefcase className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">Créez votre profil Expert pour activer le service.</p>
                  </div>
                  <Button size="sm" className="h-8 shrink-0 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => navigate("/dashboard/expert")}>
                    <Link className="h-3.5 w-3.5" />
                    Créer
                  </Button>
                </div>
              ) : expertProfile && (
                !(expertProfile as any).displayName ||
                !(expertProfile as any).profession ||
                !(expertProfile as any).phone ||
                !(expertProfile as any).email ||
                ((expertProfile as any).specialties?.length ?? 0) === 0
              ) ? (
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/30 dark:bg-amber-950/30">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">Complétez votre profil Expert.</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1.5 text-xs" onClick={() => navigate("/dashboard/expert")}>
                    <Link className="h-3.5 w-3.5" />
                    Compléter
                  </Button>
                </div>
              ) : expertProfile && (expertProfile as any).effectiveStatus !== "active" ? (
                <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-800/30 dark:bg-orange-950/30">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40">
                    <CreditCard className="h-4.5 w-4.5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">Effectuez le paiement pour activer votre profil.</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1.5 text-xs" onClick={() => navigate("/dashboard/expert")}>
                    <Link className="h-3.5 w-3.5" />
                    Payer
                  </Button>
                </div>
              ) : null}
            </>
          )}

          {/* ══════ COMMUNICATIONS (équipe BatiBuild) ══════ */}
          <AnnouncementCarousel
            announcements={announcements}
            title="Communications"
            description="Communications officielles de la plateforme"
          />

          {/* ══════ PROFILE TYPE SELECTOR ══════ */}
          <Card className="border border-border/40 bg-card/60 shadow-soft">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-xs sm:text-sm font-semibold">Type de profil</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {([
                  { value: "client", label: "Client Pro", icon: User, desc: "Estimer un projet" },
                  { value: "supplier", label: "Fournisseur", icon: Store, desc: "Vendre des matériaux" },
                  { value: "expert", label: "Expert", icon: Briefcase, desc: "Services d'expertise" },
                ] as const).map((opt) => {
                  const isActive = (user as any)?.userRole === opt.value || (!(user as any)?.userRole && opt.value === "client");
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleRoleChange(opt.value)}
                      disabled={savingRole || isActive}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 sm:py-4 text-center transition-all ${
                        isActive
                          ? "border-primary bg-primary/5 shadow-sm cursor-default"
                          : "border-transparent bg-primary/[0.03] hover:bg-primary/[0.06] hover:border-primary/20 cursor-pointer"
                      }`}
                    >
                      <div className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg transition-colors ${
                        isActive ? "bg-primary text-white" : "bg-primary/10 text-foreground/60"
                      }`}>
                        <opt.icon className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-semibold">{opt.label}</span>
                      <span className="text-[8px] sm:text-[9px] leading-tight text-muted-foreground/60 hidden sm:block">{opt.desc}</span>
                      {isActive && (
                        <span className="text-[8px] sm:text-[9px] text-primary font-medium">Actif</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ══════ SUPPLIER VIEW ══════ */}
          {viewMode === "supplier" && (
            <div className="space-y-4">
              {!hasSupplierProfile ? (
                /* No profile — CTA to create */
                <Card className="border-dashed border-2 border-primary/30">
                  <CardContent className="p-6 sm:p-8 text-center space-y-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                      <Store className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold">Créez votre profil fournisseur</h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                        Inscrivez votre entreprise pour être visible par les clients et recevoir des demandes de devis.
                      </p>
                    </div>
                    <Button onClick={() => navigate("/dashboard/supplier")} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Créer mon profil fournisseur
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                /* Profile exists — compact stats + quick links */
                <>
                  {/* Status & profile summary — mobile-friendly */}
                  <Card className="border-border/40 bg-background/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AvatarWithInitials
                          logo={supplierProfile?.logo}
                          name={supplierProfile?.companyName || "Fournisseur"}
                          size="md"
                          className="h-12 w-12 text-sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate">{supplierProfile?.companyName}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <Badge variant="outline" className={`text-[9px] ${(supplierProfile as any)?.effectiveStatus === "active" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                              {(supplierProfile as any)?.effectiveStatus === "active" ? "Abonné Pro" : "Inactif"}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {((supplierProfile as any)?.specialties?.length ?? 0)} spécialités · {((supplierProfile as any)?.regions?.length ?? 0)} régions
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Action buttons row */}
                      <div className="flex items-center gap-1.5 mt-3">
                        <button
                          onClick={() => navigate("/dashboard/supplier/quotes")}
                          className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
                        >
                          <FileText className="h-3 w-3" />
                          Devis
                        </button>
                        <button
                          onClick={() => setViewMode("client")}
                          className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
                        >
                          <User className="h-3 w-3" />
                          Vue Client
                        </button>
                        <div className="ml-auto">
                          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => navigate("/dashboard/supplier")}>
                            <Settings className="h-3 w-3" />
                            Profil
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Manage profile CTA */}
                  <Button variant="outline" className="w-full gap-2 border-violet-200 text-violet-700 hover:bg-violet-50" onClick={() => navigate("/dashboard/supplier")}>
                    <Settings className="h-4 w-4" />
                    Gérer mon profil fournisseur
                  </Button>
                  {/* Stats inline under Gérer mon profil fournisseur */}
                  <Card className="border-border/40 bg-background/50">
                    <CardContent className="p-3">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Vues du profil", value: supplierKPIs?.views ?? 0, icon: Eye, color: "text-blue-600 bg-blue-50" },
                          { label: "Demandes reçues", value: supplierKPIs?.requestsReceived ?? 0, icon: MessageSquare, color: "text-violet-600 bg-violet-50" },
                          { label: "Réponses envoyées", value: supplierKPIs?.responsesSent ?? 0, icon: MousePointerClick, color: "text-emerald-600 bg-emerald-50" },
                          { label: "Taux de réponse", value: supplierKPIs ? `${supplierKPIs.responseRate}%` : "0%", icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
                        ].map((kpi) => (
                          <div key={kpi.label} className="flex items-center gap-2 rounded-xl border border-border/30 bg-muted/10 px-3 py-2.5">
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${kpi.color}`}>
                              <kpi.icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-base font-bold leading-none">{kpi.value}</p>
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{kpi.label}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
                        Données en cours de collecte
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ══════ EXPERT VIEW ══════ */}
          {viewMode === "expert" && (
            <div className="space-y-4">
              {!hasExpertProfile ? (
                /* No profile — CTA to create */
                <Card className="border-dashed border-2 border-violet-500/30">
                  <CardContent className="p-6 sm:p-8 text-center space-y-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
                      <Briefcase className="h-7 w-7 text-violet-600" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold">Créez votre profil expert</h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                        Inscription en tant qu'architecte, ingénieur, bureau d'études ou promoteur — recevez des demandes de devis.
                      </p>
                    </div>
                    <Button onClick={() => navigate("/dashboard/expert")} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
                      <Plus className="h-4 w-4" />
                      Créer mon profil expert
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                /* Profile exists — compact stats + quick links */
                <>
                  {/* Status & profile summary — mobile-friendly */}
                  <Card className="border-border/40 bg-background/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AvatarWithInitials
                          logo={expertProfile?.logo}
                          name={expertProfile?.displayName || "Expert"}
                          size="md"
                          className="h-12 w-12 text-sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate">{expertProfile?.displayName}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <Badge variant="outline" className={`text-[9px] ${(expertProfile as any)?.effectiveStatus === "active" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                              {(expertProfile as any)?.effectiveStatus === "active" ? "Expert certifié" : "Inactif"}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {((expertProfile?.profession as string) === "architecte" ? "Architecte" : (expertProfile?.profession as string) === "ingenieur" ? "Ingénieur" : (expertProfile?.profession as string) === "bureau_etudes" ? "Bureau d'études" : (expertProfile?.profession as string) === "plombier" ? "Plombier" : (expertProfile?.profession as string) === "electricien" ? "Électricien" : "Promoteur")}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Action buttons row */}
                      <div className="flex items-center gap-1.5 mt-3">
                        <button
                          onClick={() => navigate("/dashboard/expert/services")}
                          className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
                        >
                          <FileText className="h-3 w-3" />
                          Devis
                        </button>
                        <button
                          onClick={() => setViewMode("client")}
                          className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
                        >
                          <User className="h-3 w-3" />
                          Vue Client
                        </button>
                        <div className="ml-auto">
                          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => navigate("/dashboard/expert")}>
                            <Settings className="h-3 w-3" />
                            Profil
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Manage profile CTA */}
                  <Button variant="outline" className="w-full gap-2 border-violet-200 text-violet-700 hover:bg-violet-50" onClick={() => navigate("/dashboard/expert")}>
                    <Settings className="h-4 w-4" />
                    Gérer mon profil expert
                  </Button>
                  {/* Stats inline under Gérer mon profil expert */}
                  <Card className="border-border/40 bg-background/50">
                    <CardContent className="p-3">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Vues du profil", value: expertKPIs?.views ?? 0, icon: Eye, color: "text-blue-600 bg-blue-50" },
                          { label: "Demandes reçues", value: expertKPIs?.requestsReceived ?? 0, icon: MessageSquare, color: "text-violet-600 bg-violet-50" },
                          { label: "Réponses envoyées", value: expertKPIs?.responsesSent ?? 0, icon: MousePointerClick, color: "text-emerald-600 bg-emerald-50" },
                          { label: "Taux de réponse", value: expertKPIs ? `${expertKPIs.responseRate}%` : "0%", icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
                        ].map((kpi) => (
                          <div key={kpi.label} className="flex items-center gap-2 rounded-xl border border-border/30 bg-muted/10 px-3 py-2.5">
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${kpi.color}`}>
                              <kpi.icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-base font-bold leading-none">{kpi.value}</p>
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{kpi.label}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
                        Données en cours de collecte
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ══════ CLIENT VIEW (standard dashboard) ══════ */}
          {viewMode === "client" && (
            <>
              <ClientProPaywall>
          {/* Quick actions - horizontal scroll on mobile */}
          <div className="overflow-x-auto scrollbar-none -mx-3 sm:mx-0 px-3 sm:px-0">
            <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 min-w-max sm:min-w-0">
              <Card className="border border-border/40 bg-background/50 backdrop-blur-sm hover:shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.98] shrink-0 w-[160px] sm:w-auto"
                onClick={() => navigate("/dashboard/new")}>
                <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">Nouveau projet</p>
                    <p className="text-[10px] text-muted-foreground truncate">Estimation</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border/40 bg-background/50 backdrop-blur-sm hover:shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.98] shrink-0 w-[160px] sm:w-auto"
                onClick={() => navigate("/dashboard/investments")}>
                <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Landmark className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">Nouveau investissement</p>
                    <p className="text-[10px] text-muted-foreground truncate">Analyse immobilière</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border/40 bg-background/50 backdrop-blur-sm hover:shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.98] shrink-0 w-[160px] sm:w-auto"
                onClick={() => navigate("/dashboard/materials")}>
                <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">Prix</p>
                    <p className="text-[10px] text-muted-foreground truncate">Matériaux 2026</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border/40 bg-background/50 backdrop-blur-sm hover:shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.98] shrink-0 w-[160px] sm:w-auto"
                onClick={() => navigate("/dashboard/pricing")}>
                <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">Abonnement</p>
                    <p className="text-[10px] text-muted-foreground truncate">Offres</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/40 bg-background/50 backdrop-blur-sm hover:shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.98] shrink-0 w-[160px] sm:w-auto"
                onClick={() => navigate("/dashboard/ai-materials")}>
                <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">Assistant IA</p>
                    <p className="text-[10px] text-muted-foreground truncate">Choix des matériaux</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border/40 bg-background/50 backdrop-blur-sm hover:shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.98] shrink-0 w-[160px] sm:w-auto"
                onClick={() => navigate("/dashboard/guide")}>
                <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                    <Rocket className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">Démarche</p>
                    <p className="text-[10px] text-muted-foreground truncate">Projet de A à Z</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            <StatsCard icon={HardHat} label="Projets constr." value={stats.totalProjects}
              gradient="from-blue-500/20 to-cyan-500/20" iconColor="text-blue-600 dark:text-blue-400" />
            <StatsCard icon={CheckCircle2} label="Terminés" value={stats.completedProjects}
              gradient="from-emerald-500/20 to-teal-500/20" iconColor="text-emerald-600 dark:text-emerald-400" />
            <StatsCard icon={TrendingUp} label="Coût total" value={formatter.format(stats.totalEstimatedCost)}
              gradient="from-teal-500/20 to-emerald-500/20" iconColor="text-teal-600 dark:text-teal-400" />
            <StatsCard icon={BarChart3} label="Moyenne" value={formatter.format(stats.averageCostPerProject)}
              gradient="from-amber-500/20 to-orange-500/20" iconColor="text-amber-600 dark:text-amber-400" />
          </div>

          {/* ── Subscription Card (Monthly Plan) ── */}
          <Card className="border border-border/40 bg-background/50 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                    <HardHat className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-medium">Mon abonnement</p>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200/30 text-[8px] px-1.5 py-0">30 jours</Badge>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Forfait <span className="font-semibold text-foreground">{getActivePlanLabel(user)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/dashboard/pricing")}
                    className="h-7 gap-1 px-2.5 text-[10px] sm:text-xs"
                  >
                    <CreditCard className="h-3 w-3" />
                    "Abonnement"
                  </Button>
                </div>
              </div>


            </CardContent>
          </Card>

          {/* ── Évolution des coûts (Recharts) ── */}
          {costSeries.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border border-border/40 bg-card/60 shadow-soft">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 lg:p-5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm sm:text-base lg:text-lg">Évolution des coûts</CardTitle>
                      <CardDescription className="text-[10px] sm:text-xs lg:text-sm">
                        {costSeries.length} mois de données
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-5 pt-0">
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={costSeries}>
                      <defs>
                        <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: number) => [fmtTND(value), "Coût"]}
                        contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                      />
                      <Area type="monotone" dataKey="total" stroke="var(--primary)" fill="url(#costGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Projects section */}
          <Card className="border border-border/40 bg-background/50 backdrop-blur-sm shadow-none">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 sm:p-4 lg:p-5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <HardHat className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-base lg:text-lg">Mes projets de construction</CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs lg:text-sm">
                    {projects.length} projet{projects.length > 1 ? "s" : ""} de construction
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" className="h-8 gap-1 text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500" onClick={() => navigate("/dashboard/new")}>
                  <Plus className="h-3.5 w-3.5" /> Nouveau projet
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-5 pt-0">
              {/* Statistiques */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                <MiniStat icon={HardHat} label="Projets" value={stats.totalProjects} tone={{ bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" }} />
                <MiniStat icon={Clock} label="En cours" value={stats.analyzingProjects} tone={{ bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" }} />
                <MiniStat icon={TrendingUp} label="Coût estimé" value={formatter.format(stats.totalEstimatedCost)} tone={{ bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400" }} />
                <MiniStat icon={Heart} label="Favoris" value={projectFavorites} tone={{ bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400" }} />
              </div>

              {/* Recherche */}
              <div className="relative mb-3 sm:max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input type="text" placeholder="Rechercher un projet..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border/40 bg-background pl-8 pr-2.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>

              {/* Filtres */}
              <div className="overflow-x-auto scrollbar-none">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-3 bg-transparent border-b border-border/20 rounded-none p-0 h-auto w-full justify-start gap-3 sm:gap-4 lg:gap-6 min-w-max">
                    {[
                      { value: "all", label: "Tous" },
                      { value: "completed", label: "Terminés" },
                      { value: "analyzing", label: "En cours" },
                      { value: "drafts", label: "Brouillons" },
                      { value: "favorites", label: "Favoris" },
                    ].map((tab) => (
                      <TabsTrigger key={tab.value} value={tab.value}
                        className="px-0 py-1.5 sm:py-2 text-[10px] sm:text-xs lg:text-sm data-[state=active]:text-primary data-[state=active]:shadow-none relative rounded-none bg-transparent after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-primary after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform">
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              {filteredProjects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-emerald-300/40 dark:border-emerald-800/30 bg-emerald-50/40 dark:bg-emerald-950/20 text-center py-6 sm:py-8 px-4">
                  <div className="mx-auto mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-emerald-500/10">
                    <HardHat className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-300" />
                  </div>
                  <p className="text-sm sm:text-base font-medium mb-1">Aucun projet de construction</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-3 max-w-md mx-auto">
                    Importez une photo, un plan PDF, une image satellite ou un croquis : l'IA estime les surfaces, les matériaux et le coût — marché tunisien 2026.
                  </p>
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-600/40 transition-all active:scale-[0.97]"
                    onClick={() => navigate("/dashboard/new")}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Nouveau projet
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                    {visibleProjects.map((project: any) => (
                      <ProjectCard key={project._id} project={project} />
                    ))}
                  </div>
                  {filteredProjects.length > 3 && (
                    <div className="mt-3 text-center">
                      <Button variant="outline" size="sm" className="h-9 gap-1 text-xs" onClick={() => setShowAllProjects((v) => !v)}>
                        {showAllProjects ? "Voir moins" : `Voir plus (${filteredProjects.length})`}
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAllProjects ? "rotate-180" : ""}`} />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Mes projets d'investissement enregistrés (avec statistiques) ── */}
          <Card className="border border-border/40 bg-background/50 backdrop-blur-sm shadow-none">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 sm:p-4 lg:p-5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                  <Landmark className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-base lg:text-lg">Mes projets d'investissement</CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs lg:text-sm">
                    {analyses.length} analyse{analyses.length > 1 ? "s" : ""} enregistrée{analyses.length > 1 ? "s" : ""}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" className="h-8 gap-1 text-xs sm:text-sm bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-blue-500" onClick={() => navigate("/dashboard/investments")}>
                  <Plus className="h-3.5 w-3.5" /> Nouvelle analyse
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-5 pt-0">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                <MiniStat icon={Wallet} label="Budget investi" value={fmtTND(investStats.totalBudget)} tone={{ bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400" }} />
                <MiniStat icon={Percent} label="Rendement net moyen" value={fmtPct(investStats.avgYield)} tone={{ bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" }} />
                <MiniStat icon={Gauge} label="Meilleur score" value={investStats.bestScore ? `${investStats.bestScore}/100` : "—"} tone={{ bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" }} />
                <MiniStat icon={Heart} label="Favoris" value={investStats.favorites} tone={{ bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400" }} />
              </div>

              {analyses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-indigo-300/40 dark:border-indigo-800/30 bg-indigo-50/40 dark:bg-indigo-950/20 text-center py-6 sm:py-8 px-4">
                  <div className="mx-auto mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-indigo-500/10">
                    <Landmark className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <p className="text-sm sm:text-base font-medium mb-1">Aucun projet d'investissement</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-3 max-w-md mx-auto">
                    Analysez un bien immobilier, comparez les scénarios et enregistrez vos prévisions, rendements et score IA — marché tunisien 2026.
                  </p>
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-blue-500 hover:shadow-indigo-600/40 transition-all active:scale-[0.97]"
                    onClick={() => navigate("/dashboard/investments")}

                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Lancer une analyse
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                    {visibleInvestments.map((a: any) => (
                      <InvestmentCard key={a._id} analysis={a} />
                    ))}
                  </div>
                  {analyses.length > 3 && (
                    <div className="mt-3 text-center">
                      <Button variant="outline" size="sm" className="h-9 gap-1 text-xs" onClick={() => setShowAllInvestments((v) => !v)}>
                        {showAllInvestments ? "Voir moins" : `Voir plus (${analyses.length})`}
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAllInvestments ? "rotate-180" : ""}`} />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
              </ClientProPaywall>
            </>
          )}

        </div>
      </div>


    </main>
  );
}
