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
import { api } from "@/convex/_generated/api";
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
  Users,
  Download,
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
  MapPin,
  Percent,
  Gauge,
  ChevronDown,
  Lock,
  RefreshCcw,
  Rocket,
  MessageSquare,
  ArrowLeftRight,
  Link,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "next-themes";
import { usePageSEO } from "@/hooks/use-page-seo";
import { TYPE_META, fmtTND, fmtPct } from "@/components/investment/shared";
import { REGION_LABELS } from "@/convex/investmentTypes";
import { projectTypeLabel } from "@/convex/projectTypes";
import { SupplierStatsInline } from "@/pages/SupplierStats";

// ============================================================================
// Project Card (compact for mobile)
// ============================================================================

function ProjectCard({ project }: { project: any }) {
  const navigate = useNavigate();
  const toggleFavorite = useMutation(api.projects.toggleFavorite);
  const deleteProject = useMutation(api.projects.deleteProject);

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
// ============================================================================

function InvestmentCard({ analysis }: { analysis: any }) {
  const navigate = useNavigate();
  const ind = analysis?.results?.indicators;
  const score = analysis?.results?.score;
  const input = analysis?.input ?? {};
  const typeLabel = TYPE_META[input.investmentType as keyof typeof TYPE_META]?.label ?? input.investmentType ?? "Investissement";
  const regionLabel = REGION_LABELS[input.region] ?? input.region ?? "";

  return (
    <Card
      className="group relative border border-border/40 hover:border-indigo-400/40 transition-all duration-200 hover:shadow-md hover:shadow-indigo-500/5 bg-background/50 backdrop-blur-sm cursor-pointer overflow-hidden active:scale-[0.98]"
      onClick={() => navigate(`/dashboard/investments/result/${analysis._id}`)}
    >
      <div className="absolute top-0 left-0 w-[3px] h-full bg-gradient-to-b from-indigo-500 to-blue-500" />
      <div className="p-3 sm:p-4 pl-4 sm:pl-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-300">
                {typeLabel}
              </span>
              {analysis.isFavorite && <Heart className="h-3 w-3 fill-red-400 text-red-400 shrink-0" />}
            </div>
            <h3 className="text-sm sm:text-base font-semibold truncate mt-1">{input.name || typeLabel}</h3>
          </div>
          {score && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {score.total}/100
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground mb-2 flex-wrap">
          {regionLabel && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {regionLabel}
            </span>
          )}
          {input.area && (
            <span className="flex items-center gap-1">
              <HardHat className="h-3 w-3 shrink-0" />
              {input.area} m²
            </span>
          )}
          <span className="flex items-center gap-1 text-muted-foreground/60">
            <Clock className="h-3 w-3 shrink-0" />
            {new Date(analysis.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </span>
        </div>

        {ind && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/20">
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground">Coût total</span>
              <p className="text-xs sm:text-sm font-bold truncate">{fmtTND(ind.totalCost)}</p>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground">Rendement net</span>
              <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">{fmtPct(ind.netYieldPct)}</p>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground">Cashflow</span>
              <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 truncate">{fmtTND(ind.monthlyCashflow)}/mois</p>
            </div>
          </div>
        )}
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

const PLAN_LABELS: Record<string, string> = { free: "Client", pro: "Client", expert: "Expert", supplier: "Fournisseur" };

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
        newRole === "supplier" ? "Fournisseur" : newRole === "expert" ? "Expert" : "Client"
      }`);
      window.location.reload();
    } catch (err) {
      toast.error("Erreur lors de la mise à jour du rôle");
    }
    setSavingRole(false);
  };

  useEffect(() => setMounted(true), []);

  const projects = useQuery(api.projects.getUserProjects, {}) || [];
  const analyses = useQuery(api.investments.listAnalyses) || [];
  const stats = useQuery(api.projects.getProjectStats) || {
    totalProjects: 0, completedProjects: 0, analyzingProjects: 0, draftProjects: 0,
    totalEstimatedCost: 0, averageCostPerProject: 0, recentProjects: [],
  };
  const quotas = useQuery(api.subscriptions.getMyQuotas); // OK
  const downloadInfo = useQuery(api.subscriptions.checkDownloadAllowed, {});

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
  // ── Quotas par type (construction · investissement) ──
  const construction = quotas?.construction;
  const investment = quotas?.investment;
  const constructionPlan = construction?.plan ?? "free";
  const investmentPlan = investment?.plan ?? "free";

  const usedProjects = stats.totalProjects;
  const projectLimit = construction?.limit ?? 1;
  // Affichage plafonné au quota du forfait : 1/1 (et non 2/1) quand la limite est dépassée.
  const displayUsedProjects = Math.min(usedProjects, projectLimit);
  const usagePercent = projectLimit >= 1000000 ? 0 : Math.min(100, Math.round((usedProjects / projectLimit) * 100));
  const isNearLimit = usagePercent >= 80 && projectLimit < 1000000;
  const projectsReached = (construction?.reached ?? false) || usedProjects >= projectLimit;

  const investLimit = investment?.limit ?? 1;
  const investUsagePct = investLimit >= 1000000 ? 0 : Math.min(100, Math.round((analyses.length / investLimit) * 100));
  const investReached = investment?.reached ?? analyses.length >= investLimit;
  const isInvestNearLimit = investUsagePct >= 80;

  const anyNearLimit = isNearLimit || isInvestNearLimit;

  // Téléchargements restants par type (forfaits construction / investissement)
  const constructionDownloads = construction?.downloads;
  const investmentDownloads = investment?.downloads;
  const remainingDownloads = constructionDownloads ? Math.max(0, (constructionDownloads.limit ?? 0) - (constructionDownloads.used ?? 0)) : 0;
  const downloadLimit = constructionDownloads?.limit ?? 0;
  const isProAllowed = constructionDownloads?.allowed === true;
  const remainingInvestDownloads = investmentDownloads ? Math.max(0, (investmentDownloads.limit ?? 0) - (investmentDownloads.used ?? 0)) : 0;
  const investDownloadLimit = investmentDownloads?.limit ?? 0;
  const isInvestDownloadAllowed = investmentDownloads?.allowed === true;

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
              { icon: BarChart3, label: "Comparer", onClick: () => setMobileSidebarOpen(false) },
              { icon: TrendingUp, label: "Prix matériaux", onClick: () => { navigate("/dashboard/materials"); setMobileSidebarOpen(false); } },
              { icon: Sparkles, label: "Assistant Matériaux IA", onClick: () => { navigate("/dashboard/ai-materials"); setMobileSidebarOpen(false); } },
              { icon: Landmark, label: "Investissements immobiliers", onClick: () => { navigate("/dashboard/investments"); setMobileSidebarOpen(false); } },
            ] : []),
            // Professional features — parent + submenu
            ...(viewMode === "supplier" ? [
              { icon: Store, label: "Espace fournisseur", isExpandable: true, onClick: () => { setProMenuOpen(!proMenuOpen); } },
            ] : []),
            ...(viewMode === "expert" ? [
              { icon: Briefcase, label: "Espace expert", isExpandable: true, onClick: () => { setProMenuOpen(!proMenuOpen); } },
            ] : []),
            // Sub-menu items (shown when expanded)
            ...(viewMode === "supplier" && proMenuOpen ? [
              { icon: FileText, label: "Devis reçus", isSubItem: true, onClick: () => { navigate("/dashboard/supplier/quotes"); setMobileSidebarOpen(false); } },
              { icon: BarChart3, label: "Statistiques", isSubItem: true, onClick: () => { navigate("/dashboard/supplier/stats"); setMobileSidebarOpen(false); } },
              { icon: Settings, label: "Mon profil fournisseur", isSubItem: true, onClick: () => { navigate("/dashboard/supplier"); setMobileSidebarOpen(false); } },
            ] : []),
            ...(viewMode === "expert" && proMenuOpen ? [
              { icon: FileText, label: "Services reçus", isSubItem: true, onClick: () => { navigate("/dashboard/expert/services"); setMobileSidebarOpen(false); } },
              { icon: BarChart3, label: "Statistiques", isSubItem: true, onClick: () => { navigate("/dashboard/expert/stats"); setMobileSidebarOpen(false); } },
              { icon: Settings, label: "Mon profil expert", isSubItem: true, onClick: () => { navigate("/dashboard/expert"); setMobileSidebarOpen(false); } },
            ] : []),
            { icon: MessageSquare, label: "Messagerie", onClick: () => { navigate("/dashboard/messages"); setMobileSidebarOpen(false); } },
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
                    {user?.userRole === "supplier" ? "Fournisseur" : user?.userRole === "expert" ? "Expert" : "Client"}
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
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 relative">
                <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary" />
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

          {/* ══════ PROFILE TYPE SELECTOR ══════ */}
          <Card className="border border-border/40 bg-card/60 shadow-soft">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-xs sm:text-sm font-semibold">Type de profil</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {([
                  { value: "client", label: "Client", icon: User, desc: "Estimer un projet" },
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
                  {/* Status & profile summary */}
                  <Card className="border-border/40 bg-background/50">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10">
                          <span className="text-sm font-bold text-primary/80">
                            {(supplierProfile?.companyName || "?").split(/\s+/).filter(Boolean).map((w: string) => w.charAt(0).toUpperCase()).slice(0, 2).join("")}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{supplierProfile?.companyName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className={`text-[9px] ${(supplierProfile as any)?.effectiveStatus === "active" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                              {(supplierProfile as any)?.effectiveStatus === "active" ? "Abonné Pro" : "Inactif"}
                            </Badge>
                            <button
                              onClick={() => setViewMode("client")}
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ArrowLeftRight className="h-3 w-3" />
                              Vue Client
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => navigate("/dashboard/supplier/quotes")}>
                            <FileText className="h-3 w-3" />
                            Devis
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Manage profile CTA */}
                  <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/dashboard/supplier")}>
                    <Settings className="h-4 w-4" />
                    Gérer mon profil fournisseur
                  </Button>

                  {/* Inline Stats */}
                  <SupplierStatsInline />
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
                  {/* Status & profile summary */}
                  <Card className="border-border/40 bg-background/50">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-violet-50 border border-violet-200">
                          <span className="text-sm font-bold text-violet-600">
                            {(expertProfile?.displayName || "?").split(/\s+/).filter(Boolean).map((w: string) => w.charAt(0).toUpperCase()).slice(0, 2).join("")}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{expertProfile?.displayName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className={`text-[9px] ${(expertProfile as any)?.effectiveStatus === "active" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                              {(expertProfile as any)?.effectiveStatus === "active" ? "Expert certifié" : "Inactif"}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {expertProfile?.profession === "architecte" ? "Architecte" : expertProfile?.profession === "ingenieur" ? "Ingénieur" : expertProfile?.profession === "bureau_etudes" ? "Bureau d'études" : "Promoteur"}
                            </span>
                            <button
                              onClick={() => setViewMode("client")}
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ArrowLeftRight className="h-3 w-3" />
                              Vue Client
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => navigate("/dashboard/expert/services")}>
                            <FileText className="h-3 w-3" />
                            Services
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => navigate("/dashboard/expert/stats")}>
                            <BarChart3 className="h-3 w-3" />
                            Stats
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
                </>
              )}
            </div>
          )}

          {/* ══════ CLIENT VIEW (standard dashboard) ══════ */}
          {viewMode === "client" && (
            <>
          {/* Quick actions - horizontal scroll on mobile */}
          <div className="overflow-x-auto scrollbar-none -mx-3 sm:mx-0 px-3 sm:px-0">
            <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 min-w-max sm:min-w-0">
              <Card className={`border border-border/40 bg-background/50 backdrop-blur-sm hover:shadow-sm transition-all duration-200 active:scale-[0.98] shrink-0 w-[160px] sm:w-auto ${projectsReached ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                onClick={() => { if (!projectsReached) navigate("/dashboard/new"); }}>
                <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {projectsReached ? <Lock className="h-4 w-4 sm:h-5 sm:w-5" /> : <Plus className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">{projectsReached ? "Limite atteinte" : "Nouveau projet"}</p>
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
                      Forfait <span className="font-semibold text-foreground">{PLAN_LABELS[constructionPlan] ?? "Client"}</span> · Accès illimité
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
                    {constructionPlan === "free" ? "Passer à Pro" : "Renouveler"}
                  </Button>
                </div>
              </div>

              {/* Subscription dates */}
              {quotas?.construction?.plan !== "free" ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-border/30 bg-card/40 px-3 py-2.5">
                    <p className="text-[9px] text-muted-foreground mb-1">Date de début</p>
                    <p className="text-xs sm:text-sm font-semibold text-foreground">
                      {new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/30 bg-card/40 px-3 py-2.5">
                    <p className="text-[9px] text-muted-foreground mb-1">Date de fin</p>
                    <p className="text-xs sm:text-sm font-semibold text-foreground">
                      {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                  <p className="text-[10px] sm:text-xs text-primary/80">
                    Passez à l'abonnement Client (80 TND/mois) pour un accès illimité à tous les outils.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Quota warnings par type (presque atteinte / atteinte) ── */}
          {(isNearLimit || projectsReached) && (
            <div className="space-y-2.5">
              {[
                {
                  show: isNearLimit || projectsReached,
                  reached: projectsReached,
                  type: "construction",
                  plan: constructionPlan,
                  title: projectsReached
                    ? "Limite de projets de construction atteinte"
                    : "Limite de projets de construction presque atteinte",
                  body: projectsReached
                    ? `Vous avez utilisé ${displayUsedProjects}/${projectLimit} projets de construction de votre forfait ${PLAN_LABELS[constructionPlan]}.`
                    : `Vous avez utilisé ${usagePercent}% de votre limite de ${projectLimit} projets de construction.`,
                },
              ]
                .filter((w) => w.show)
                .map((w, i) => {
                  const nextPlan = w.plan === "free" ? "pro" : w.plan === "pro" ? "expert" : null;
                  return (
                    <Card key={i} className="border border-amber-200/70 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 backdrop-blur-sm">
                      <CardContent className="p-3 sm:p-4 flex items-start gap-2.5 sm:gap-3">
                        <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 mt-0.5">
                          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-semibold text-amber-800 dark:text-amber-300">{w.title}</p>
                          <p className="text-[10px] sm:text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                            {w.body} {w.reached ? "Renouvelez vos quotas ou passez à une offre supérieure pour continuer." : "Pensez à renouveler ou à passer à une offre supérieure."}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <Button
                              size="sm"
                              className="h-7 gap-1 text-[10px] sm:text-xs bg-amber-500 hover:bg-amber-600 text-white border-0"
                              onClick={() => navigate("/dashboard/pricing")}>
                              <RefreshCcw className="h-3 w-3" />
                              Renouveler les quotas
                            </Button>
                            {nextPlan && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] sm:text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                                onClick={() => navigate(`/dashboard/pricing?plan=${nextPlan}`)}
                              >
                                Passer à {PLAN_LABELS[nextPlan]}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}

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
          <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 sm:p-4 lg:p-5">
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base lg:text-lg">Mes projets de construction</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs lg:text-sm">
                  {filteredProjects.length} projet{filteredProjects.length > 1 ? 's' : ''} de construction
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input type="text" placeholder="Rechercher..." value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 sm:h-9 w-full sm:w-36 lg:w-44 rounded-lg border border-border/40 bg-background pl-8 pr-2.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <Button size="sm" className="gap-1 h-8 sm:h-9 text-xs sm:text-sm shrink-0" onClick={() => navigate("/dashboard/new")} disabled={projectsReached} title={projectsReached ? "Quota de projets de construction atteint" : undefined}>
                  {projectsReached ? <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  <span className="hidden xs:inline">{projectsReached ? "Limite atteinte" : "Nouveau"}</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-none px-3 sm:px-4 lg:px-5">
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

              <div className="px-3 sm:px-4 lg:px-5 pb-3 sm:pb-4 lg:pb-5">
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-8 sm:py-10">
                    <div className="mx-auto mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-muted">
                      <HardHat className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm sm:text-base font-medium mb-1">Aucun projet de construction</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-3">Créez votre premier projet de construction</p>
                    <Button size="sm" className="text-xs" onClick={() => navigate("/dashboard/new")} disabled={projectsReached} title={projectsReached ? "Quota de projets de construction atteint" : undefined}>
                      {projectsReached ? <Lock className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                      {projectsReached ? "Limite atteinte" : "Nouveau projet"}
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
              </div>
            </CardContent>
          </Card>

          {/* ── Mes projets d'investissement enregistrés (avec statistiques) ── */}
          <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
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
                <Button size="sm" className="h-8 gap-1 text-xs sm:text-sm bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-blue-500" onClick={() => navigate("/dashboard/investments")} disabled={investReached} title={investReached ? "Quota d'analyses d'investissement atteint" : undefined}>
                  {investReached ? <Lock className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} {investReached ? "Limite atteinte" : "Nouvelle analyse"}
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
                    disabled={investReached}
                    title={investReached ? "Quota d'analyses d'investissement atteint" : undefined}
                  >
                    {investReached ? <Lock className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {investReached ? "Limite atteinte" : "Lancer une analyse"}
                    {!investReached && <ArrowUpRight className="h-3.5 w-3.5" />}
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
            </>
          )}

        </div>
      </div>


    </main>
  );
}
