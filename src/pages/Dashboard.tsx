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
  Home,
  Shield,
  Store,
  User,
  AlertTriangle,
  Landmark,
  Wallet,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { usePageSEO } from "@/hooks/use-page-seo";

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

  const categoryLabels: Record<string, string> = {
    maison: "Maison",
    villa: "Villa",
    piscine: "Piscine",
    jardin: "Jardin",
    garage: "Garage",
    immeuble_residentiel: "Immeuble",
    bureau: "Bureau",
    renovation_interieure: "Rénovation",
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
            <span className="truncate max-w-[70px] sm:max-w-none">{categoryLabels[project.category] || project.category}</span>
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
// Stats Card (compact mobile version)
// ============================================================================

function StatsCard({ icon: Icon, label, value, gradient, iconColor }: any) {
  return (
    <Card className="border border-border/40 bg-background/50 backdrop-blur-sm hover:shadow-sm transition-shadow duration-200">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">{label}</p>
            <p className="text-sm sm:text-lg lg:text-xl font-bold mt-0.5 truncate">{value}</p>
          </div>
          <div className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} ${iconColor}`}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function Dashboard() {
  usePageSEO({ title: "Tableau de bord - BudgetBati", description: "Gérez vos projets de construction et suivez vos estimations sur BudgetBati." });
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const projects = useQuery(api.projects.getUserProjects, {}) || [];
  const stats = useQuery(api.projects.getProjectStats) || {
    totalProjects: 0, completedProjects: 0, analyzingProjects: 0, draftProjects: 0,
    totalEstimatedCost: 0, averageCostPerProject: 0, recentProjects: [],
  };
  const planLimits = useQuery(api.projects.getPlanLimits) || { free: 3, pro: 10, expert: 100 };
  const downloadInfo = useQuery(api.subscriptions.checkDownloadAllowed);
  const remainingDownloads = downloadInfo?.remaining ?? 0;
  const downloadLimit = downloadInfo?.limit ?? 0;
  const isProAllowed = downloadInfo?.reason === "ok" || downloadInfo?.reason === "limite_atteinte";

  // ── Project limit counter & 80% warning ──
  const userPlan = (user as any)?.subscriptionPlan ?? "free";
  const projectLimit = userPlan === "free" ? planLimits.free : userPlan === "pro" ? planLimits.pro : planLimits.expert ?? 100;
  const usedProjects = stats.totalProjects;
  const usagePercent = projectLimit !== Infinity ? Math.round((usedProjects / projectLimit) * 100) : 0;
  const isNearLimit = usagePercent >= 80 && projectLimit !== Infinity;

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const filteredProjects = projects.filter((p: any) => {
    if (activeTab === "favorites") return p.isFavorite;
    if (activeTab === "completed") return p.status === "completed";
    if (activeTab === "drafts") return p.status === "draft";
    if (activeTab === "analyzing") return p.status === "analyzing";
    return true;
  }).filter((p: any) =>
    searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const formatter = new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 });

  const sidebarContent = (
    <>
      <div className="p-4 sm:p-5 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HardHat className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div>
            <span className="text-sm sm:text-base font-semibold">BuildEase</span>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">Tableau de bord</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 sm:p-4 space-y-0.5">
        {[
          { icon: LayoutDashboard, label: "Tableau de bord", active: true, onClick: () => setMobileSidebarOpen(false) },
          { icon: Plus, label: "Nouveau projet", onClick: () => { navigate("/dashboard/new"); setMobileSidebarOpen(false); } },
          { icon: Star, label: "Projets favoris", onClick: () => { setActiveTab("favorites"); setMobileSidebarOpen(false); } },
          { icon: BarChart3, label: "Comparer", onClick: () => setMobileSidebarOpen(false) },
          { icon: TrendingUp, label: "Prix matériaux", onClick: () => { navigate("/dashboard/materials"); setMobileSidebarOpen(false); } },
          { icon: Store, label: "Espace fournisseur", onClick: () => { navigate("/dashboard/supplier"); setMobileSidebarOpen(false); } },
          { icon: Landmark, label: "Analyse immobilière", onClick: () => { navigate("/dashboard/investments"); setMobileSidebarOpen(false); } },
          { icon: User, label: "Mon profil", onClick: () => { navigate("/dashboard/profile"); setMobileSidebarOpen(false); } },
          ...(user?.role === "admin" || user?.role === "moderator" ? [{ icon: Shield, label: "Administration", onClick: () => { navigate("/dashboard/admin"); setMobileSidebarOpen(false); } }] : []),
        ].map((item) => (
          <button key={item.label} onClick={item.onClick}
            className={`w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm transition-all ${item.active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </button>
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
        <header className="sticky top-0 z-30 border-b border-border/30 bg-background/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-3 sm:px-5 lg:px-6 h-12 sm:h-14 lg:h-16">
            <div className="flex items-center gap-2 lg:gap-3 min-w-0">
              <button onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 active:bg-muted/50">
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-semibold truncate">Dashboard</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {user?.name ? `Bienvenue, ${user.name.split(' ')[0]}` : "Gérez vos projets"}
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
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            <StatsCard icon={HardHat} label="Total projets" value={stats.totalProjects}
              gradient="from-blue-500/20 to-cyan-500/20" iconColor="text-blue-600 dark:text-blue-400" />
            <StatsCard icon={CheckCircle2} label="Terminés" value={stats.completedProjects}
              gradient="from-emerald-500/20 to-teal-500/20" iconColor="text-emerald-600 dark:text-emerald-400" />
            <StatsCard icon={TrendingUp} label="Coût total" value={formatter.format(stats.totalEstimatedCost)}
              gradient="from-violet-500/20 to-purple-500/20" iconColor="text-violet-600 dark:text-violet-400" />
            <StatsCard icon={BarChart3} label="Moyenne" value={formatter.format(stats.averageCostPerProject)}
              gradient="from-amber-500/20 to-orange-500/20" iconColor="text-amber-600 dark:text-amber-400" />
          </div>

          {/* ── Investment analysis CTA (redessiné, placé en haut du dashboard) ── */}
          <Card
            className="group relative border border-indigo-500/25 bg-gradient-to-br from-indigo-600/15 via-blue-500/10 to-emerald-500/10 dark:from-indigo-950/60 dark:via-blue-950/30 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/15 active:scale-[0.99]"
            onClick={() => navigate("/dashboard/investments")}
          >
            <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl dark:bg-indigo-500/25" />
            <div className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/20" />
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />
            <CardContent className="relative p-4 sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                  <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 group-hover:rotate-3 transition-transform">
                    <Landmark className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm sm:text-base lg:text-lg font-bold">L'immobilier devient plus intelligent : analysez, anticipez et maximisez la valeur de vos investissements grâce à l'IA.</p>
                      <Badge className="gap-1 border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[9px]">
                        <Sparkles className="h-3 w-3" />
                        Conseiller IA
                      </Badge>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      Return on Investment, flux de trésorerie, prévisions, scénarios et score d'investissement — marché tunisien 2026
                    </p>
                    {/* Feature chips */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {[
                        { icon: TrendingUp, label: "Return on Investment & rendement", cls: "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" },
                        { icon: Wallet, label: "Flux de trésorerie", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
                        { icon: BarChart3, label: "Prévisions 10 ans", cls: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400" },
                        { icon: Layers, label: "3 scénarios", cls: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400" },
                      ].map((chip) => (
                        <span key={chip.label} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] sm:text-[10px] font-medium ${chip.cls}`}>
                          <chip.icon className="h-3 w-3" />
                          {chip.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-300">Seulement à 120 TND</span>
                  </span>
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-semibold shrink-0">
                    <span className="hidden sm:inline">Lancer l'analyse</span>
                    <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Plan Counter Card (Free/Pro/Expert) ── */}
          {(projectLimit !== Infinity || userPlan === "expert") && stats.totalProjects > 0 && (
            <Card className={`border ${isNearLimit ? 'border-amber-200/60 dark:border-amber-800/40' : 'border-border/40'} bg-background/50 backdrop-blur-sm overflow-hidden`}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg ${
                      userPlan === "expert"
                        ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400'
                        : isNearLimit
                        ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-gradient-to-br from-primary/20 to-primary/10 text-primary'
                    }`}>
                      <HardHat className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-medium">
                          {userPlan === "free" ? "Forfait Start" : userPlan === "expert" ? "Forfait Expert" : "Forfait Pro"}
                        </p>
                        {userPlan === "expert" && (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-400/30 text-[8px] px-1.5 py-0">
                            320 TND/mois
                          </Badge>
                        )}
                        {userPlan === "pro" && (
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-200/30 text-[8px] px-1.5 py-0">
                            79 TND/mois
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        <span className={`font-semibold tabular-nums ${isNearLimit ? 'text-amber-600 dark:text-amber-400' : 'text-primary'}`}>
                          {usedProjects}
                        </span>
                        <span className="text-muted-foreground/50"> / </span>
                        <span className="tabular-nums">{projectLimit}</span>
                        {" "}projets utilisés
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {userPlan !== "expert" && (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/dashboard/pricing?plan=${userPlan === "free" ? "pro" : "expert"}`)}
                        className="h-7 gap-1 px-2.5 text-[10px] sm:text-xs bg-yellow-400 hover:bg-yellow-500 text-black border-0 shadow-sm"
                      >
                        {userPlan === "free" ? "Passez à Pro" : "Passez à Expert"}
                        <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    )}
                    <div className={`text-xs sm:text-sm font-bold tabular-nums ${
                      isNearLimit ? 'text-amber-600 dark:text-amber-400' : 'text-primary'
                    }`}>
                      {usagePercent}%
                    </div>
                  </div>
                </div>
                {/* Usage bar */}
                <div className="mt-2.5 sm:mt-3 relative h-2 sm:h-2.5 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                      userPlan === "expert"
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                        : isNearLimit
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                        : 'bg-gradient-to-r from-primary/60 to-primary'
                    }`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
                {userPlan === "free" && usagePercent >= 70 && (
                  <a href="/dashboard/pricing"
                    className="mt-2 inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Passer à l'offre Pro <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
                {/* Downloads info for Pro/Expert */}
                {isProAllowed && downloadLimit > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-border/20 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                      <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span>
                        <span className={`font-semibold tabular-nums ${remainingDownloads === 0 ? 'text-amber-600' : ''}`}>{remainingDownloads}</span>
                        <span className="text-muted-foreground/50"> / </span>
                        <span className="tabular-nums">{downloadLimit}</span>
                        {" "}téléchargements restants
                      </span>
                    </div>
                    {remainingDownloads === 0 && (
                      <span className="text-[9px] text-amber-600 font-medium">Épuisé</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── 80% Warning Banner ── */}
          {isNearLimit && (
            <Card className="border border-amber-200/70 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 backdrop-blur-sm">
              <CardContent className="p-3 sm:p-4 flex items-start gap-2.5 sm:gap-3">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 mt-0.5">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Limite de projets presque atteinte
                  </p>
                  <p className="text-[10px] sm:text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                    Vous avez utilisé <strong>{usagePercent}%</strong> de votre limite de <strong>{projectLimit} projets</strong>.
                    {userPlan === "free"
                      ? " Passez à l'offre Pro pour créer jusqu'à 10 projets."
                      : " Contactez l'administrateur pour augmenter votre limite si nécessaire."
                    }
                  </p>
                  {userPlan === "free" && (
                    <div className="mt-1.5 flex gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-[10px] sm:text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                        onClick={() => navigate("/dashboard/pricing")}>
                        Voir les offres
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Progression Indicator ── */}
          {stats.totalProjects > 0 && (
            <Card className="border border-border/40 bg-background/50 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400">
                      <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium">Progression</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{stats.completedProjects}</span>
                        <span className="text-muted-foreground/50"> / </span>
                        <span className="tabular-nums">{stats.totalProjects}</span>
                        {" "}projets terminés
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-xs sm:text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {Math.round((stats.completedProjects / stats.totalProjects) * 100)}%
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-2.5 sm:mt-3 relative h-2 sm:h-2.5 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700 ease-out"
                    style={{ width: `${Math.round((stats.completedProjects / stats.totalProjects) * 100)}%` }}
                  />
                  {stats.analyzingProjects > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 opacity-60"
                      style={{
                        width: `${Math.round(((stats.analyzingProjects + stats.completedProjects) / stats.totalProjects) * 100)}%`,
                      }}
                    />
                  )}
                  {/* Shimmer effect */}
                  <div className="absolute inset-y-0 left-0 w-6 rounded-full bg-white/20 animate-shimmer"
                    style={{
                      width: `${Math.round((stats.completedProjects / stats.totalProjects) * 100)}%`,
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s infinite',
                    }}
                  />
                </div>
                {/* Legend */}
                <div className="mt-1.5 flex items-center gap-3 text-[8px] sm:text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-emerald-500" />
                    Terminés ({stats.completedProjects})
                  </span>
                  {stats.analyzingProjects > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm bg-blue-400" />
                      En cours ({stats.analyzingProjects})
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-muted-foreground/30" />
                    Restants ({stats.totalProjects - stats.completedProjects - stats.analyzingProjects})
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Projects section */}
          <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 sm:p-4 lg:p-5">
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base lg:text-lg">Mes projets</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs lg:text-sm">
                  {filteredProjects.length} projet{filteredProjects.length > 1 ? 's' : ''}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input type="text" placeholder="Rechercher..." value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 sm:h-9 w-full sm:w-36 lg:w-44 rounded-lg border border-border/40 bg-background pl-8 pr-2.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <Button size="sm" className="gap-1 h-8 sm:h-9 text-xs sm:text-sm shrink-0" onClick={() => navigate("/dashboard/new")}>
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Nouveau</span>
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
                    <p className="text-sm sm:text-base font-medium mb-1">Aucun projet</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-3">Créez votre premier projet</p>
                    <Button size="sm" className="text-xs" onClick={() => navigate("/dashboard/new")}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Nouveau projet
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                    {filteredProjects.map((project: any) => (
                      <ProjectCard key={project._id} project={project} />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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
              <Card className="border border-border/40 bg-background/50 backdrop-blur-sm hover:shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.98] shrink-0 w-[160px] sm:w-auto">
                <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">Rapports</p>
                    <p className="text-[10px] text-muted-foreground truncate">Export</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>


    </main>
  );
}
