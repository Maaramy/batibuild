import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
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
  Home,
  Building2,
  Search,
  ArrowUpRight,
  Euro,
  Users,
  Download,
  Moon,
  Sun,
  CreditCard,
  ChevronRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

// ============================================================================
// Project Card
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
    analyzing: "Analyse en cours",
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
    <Card className="group relative border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 bg-background/50 backdrop-blur-sm cursor-pointer overflow-hidden"
      onClick={() => navigate(`/dashboard/project/${project._id}`)}
    >
      {/* Status indicator */}
      <div className={`absolute top-0 left-0 w-1 h-full ${project.status === 'completed' ? 'bg-emerald-500' : project.status === 'analyzing' ? 'bg-blue-500' : project.status === 'draft' ? 'bg-yellow-500' : 'bg-slate-500'}`} />
      
      <div className="p-5 pl-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[project.status] || statusColors.draft}`}>
                {statusLabels[project.status] || project.status}
              </span>
              {project.isFavorite && (
                <Heart className="h-3.5 w-3.5 fill-red-400 text-red-400" />
              )}
            </div>
            <h3 className="text-base font-semibold truncate mt-1">{project.name}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleFavorite({ projectId: project._id }); }} className="cursor-pointer gap-2">
                <Heart className={`h-4 w-4 ${project.isFavorite ? 'fill-red-400 text-red-400' : ''}`} />
                {project.isFavorite ? "Retirer favori" : "Ajouter favori"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/project/${project._id}`); }} className="cursor-pointer gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Ouvrir
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm("Supprimer ce projet ?")) {
                    await deleteProject({ projectId: project._id });
                  }
                }}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {categoryLabels[project.category] || project.category}
          </span>
          {project.surface && (
            <span className="flex items-center gap-1">
              <HardHat className="h-3 w-3" />
              {project.surface} m²
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(project.createdAt).toLocaleDateString("fr-FR")}
          </span>
        </div>

        {project.costEstimate && (
          <div className="flex items-center justify-between pt-3 border-t border-border/30">
            <div>
              <span className="text-xs text-muted-foreground">Estimation</span>
              <p className="text-lg font-bold text-primary">
                {new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(project.costEstimate.totalCost)}
              </p>
            </div>
            {project.costEstimate.costPerSquareMeter && (
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Prix/m²</span>
                <p className="text-sm font-semibold">
                  {new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(project.costEstimate.costPerSquareMeter)}
                </p>
              </div>
            )}
          </div>
        )}

        {!project.costEstimate && project.status === "draft" && (
          <div className="pt-3 border-t border-border/30">
            <p className="text-xs text-muted-foreground">En attente d'analyse</p>
          </div>
        )}

        {project.status === "analyzing" && (
          <div className="pt-3 border-t border-border/30">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Analyse en cours...</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// Stats Card
// ============================================================================

function StatsCard({ icon: Icon, label, value, sublabel, gradient, iconColor }: any) {
  return (
    <Card className="border border-border/50 bg-background/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} ${iconColor}`}>
            <Icon className="h-5 w-5" />
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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => setMounted(true), []);

  const projects = useQuery(api.projects.getUserProjects, {}) || [];
  const stats = useQuery(api.projects.getProjectStats) || {
    totalProjects: 0,
    completedProjects: 0,
    analyzingProjects: 0,
    draftProjects: 0,
    totalEstimatedCost: 0,
    averageCostPerProject: 0,
    recentProjects: [],
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Filter projects
  const filteredProjects = projects.filter((p: any) => {
    if (activeTab === "favorites") return p.isFavorite;
    if (activeTab === "completed") return p.status === "completed";
    if (activeTab === "drafts") return p.status === "draft";
    if (activeTab === "analyzing") return p.status === "analyzing";
    return true;
  }).filter((p: any) =>
    searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const formatter = new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 0,
  });

  return (
    <main className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-border/50 bg-background/80 backdrop-blur-sm hidden lg:flex flex-col">
        <div className="p-5 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HardHat className="h-4 w-4" />
            </div>
            <div>
              <span className="text-base font-semibold">BuildEase</span>
              <p className="text-[10px] text-muted-foreground">Tableau de bord</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { icon: LayoutDashboard, label: "Tableau de bord", active: true, onClick: () => {} },
            { icon: Plus, label: "Nouveau projet", onClick: () => navigate("/dashboard/new") },
            { icon: Star, label: "Projets favoris", onClick: () => setActiveTab("favorites") },
            { icon: BarChart3, label: "Comparer", onClick: () => {} },
            { icon: FileText, label: "Rapports", onClick: () => {} },
            { icon: TrendingUp, label: "Prix matériaux", onClick: () => navigate("/dashboard/materials") },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                item.active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border/30 space-y-2">
          <button
            onClick={() => navigate("/dashboard/settings")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <Settings className="h-4 w-4 shrink-0" />
            Paramètres
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 border-b border-border/30 bg-background/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-3 lg:gap-4">
              <button className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-border/50">
                <HardHat className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-base font-semibold">Tableau de bord</h1>
                <p className="text-xs text-muted-foreground">
                  {user?.name ? `Bienvenue, ${user.name}` : "Gérez vos projets"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 relative"
                onClick={() => {}}
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
              </Button>
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-background/80 backdrop-blur-sm text-foreground/80 hover:text-foreground transition-all"
                >
                  <Sun className={`h-4 w-4 transition-all ${theme === "dark" ? "rotate-90 scale-0" : "rotate-0 scale-100"}`} />
                  <Moon className={`absolute h-4 w-4 transition-all ${theme === "dark" ? "rotate-0 scale-100" : "-rotate-90 scale-0"}`} />
                </button>
              )}
              <Avatar className="h-8 w-8 border border-border/50 cursor-pointer">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              icon={HardHat}
              label="Total projets"
              value={stats.totalProjects}
              gradient="from-blue-500/20 to-cyan-500/20"
              iconColor="text-blue-600 dark:text-blue-400"
            />
            <StatsCard
              icon={CheckCircle2}
              label="Projets terminés"
              value={stats.completedProjects}
              gradient="from-emerald-500/20 to-teal-500/20"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />
            <StatsCard
              icon={TrendingUp}
              label="Coût total estimé"
              value={formatter.format(stats.totalEstimatedCost)}
              gradient="from-violet-500/20 to-purple-500/20"
              iconColor="text-violet-600 dark:text-violet-400"
            />
            <StatsCard
              icon={BarChart3}
              label="Moyenne par projet"
              value={formatter.format(stats.averageCostPerProject)}
              gradient="from-amber-500/20 to-orange-500/20"
              iconColor="text-amber-600 dark:text-amber-400"
            />
          </div>

          {/* Projects section */}
          <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6">
              <div>
                <CardTitle className="text-lg">Mes projets</CardTitle>
                <CardDescription>Gérez et suivez vos estimations</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-full sm:w-48 rounded-lg border border-border/50 bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <Button size="sm" className="gap-1.5 h-9" onClick={() => navigate("/dashboard/new")}>
                  <Plus className="h-4 w-4" />
                  Nouveau projet
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 sm:px-6">
                <TabsList className="mb-4 bg-transparent border-b border-border/30 rounded-none p-0 h-auto w-full justify-start gap-6">
                  {[
                    { value: "all", label: "Tous" },
                    { value: "completed", label: "Terminés" },
                    { value: "analyzing", label: "En cours" },
                    { value: "drafts", label: "Brouillons" },
                    { value: "favorites", label: "Favoris" },
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="px-0 py-2.5 text-sm data-[state=active]:text-primary data-[state=active]:shadow-none relative rounded-none bg-transparent after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="px-4 sm:px-6 pb-6">
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <HardHat className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium mb-1">Aucun projet trouvé</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Créez votre premier projet pour commencer
                    </p>
                    <Button size="sm" onClick={() => navigate("/dashboard/new")}>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Nouveau projet
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredProjects.map((project: any) => (
                      <ProjectCard key={project._id} project={project} />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-border/50 bg-background/50 backdrop-blur-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
              onClick={() => navigate("/dashboard/new")}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Nouveau projet</p>
                  <p className="text-xs text-muted-foreground">Créer une estimation</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/50 bg-background/50 backdrop-blur-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
              onClick={() => navigate("/dashboard/materials")}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Prix matériaux</p>
                  <p className="text-xs text-muted-foreground">Base de données</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/50 bg-background/50 backdrop-blur-sm hover:shadow-md transition-all duration-300 cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Abonnement</p>
                  <p className="text-xs text-muted-foreground">Gérer votre offre</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/50 bg-background/50 backdrop-blur-sm hover:shadow-md transition-all duration-300 cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:bg-violet-500/20 transition-colors">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Rapports</p>
                  <p className="text-xs text-muted-foreground">Exporter les données</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
