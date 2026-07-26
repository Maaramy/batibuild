import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Check,
  ChevronRight,
  Cpu,
  DollarSign,
  Edit,
  HardHat,
  Loader2,
  MoreHorizontal,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  TrendingUp,
  Users,
  X,
  Package,
  Shield,
  UserCheck,
  Banknote,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Mail,
  Phone,
  Crown,
  CreditCard,
  Activity,
  UserPlus,
  RefreshCw,
  Smartphone,
  Globe,
  FileText,
  Calendar,
  NotebookPen,
  CheckCheck,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { motion } from "framer-motion";

// ============================================================================
// Admin Panel
// ============================================================================

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  const allProjects = useQuery(api.projects.getAllProjects) || [];
  const materialPrices = useQuery(api.materials.getMaterialPrices, {}) || [];
  const materialCategories = useQuery(api.materials.getMaterialCategories) || [];

  // New material form
  const [showNewMaterial, setShowNewMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    category: "ciment",
    unit: "",
    unitPrice: 0,
    currency: "TND",
  });
  const [editingMaterial, setEditingMaterial] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [userSearch, setUserSearch] = useState("");
  const [subSearch, setSubSearch] = useState("");

  const pendingSubs = useQuery(api.subscriptions.getPendingSubscriptions) || [];
  const allSubsWithUsers = useQuery(api.subscriptions.getAllSubscriptionsWithUsers) || [];
  const allUsers = useQuery(api.users.getAllUsers) || [];

  const approveSub = useMutation(api.subscriptions.adminApproveSubscription);
  const rejectSub = useMutation(api.subscriptions.adminRejectSubscription);
  const updateUserRole = useMutation(api.users.adminUpdateUserRole);
  const updateUserPlan = useMutation(api.users.adminUpdateUserPlan);
  const deleteUser = useMutation(api.users.deleteUser);
  const toggleUserStatus = useMutation(api.users.toggleUserStatus);
  const batchDeleteUsers = useMutation(api.users.batchDeleteUsers);

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  const adminLogs = useQuery(api.users.getAdminLogs, { limit: 100 }) || [];

  const createMaterial = useMutation(api.materials.createMaterialPrice);
  const updateMaterial = useMutation(api.materials.updateMaterialPrice);
  const deleteMaterial = useMutation(api.materials.deleteMaterialPrice);

  // Handle user deletion
  useEffect(() => {
    if (!deletingUserId) return;
    const doDelete = async () => {
      try {
        await deleteUser({ userId: deletingUserId as any });
        toast.success("Utilisateur supprimé avec succès");
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de la suppression");
      }
      setDeletingUserId(null);
    };
    doDelete();
  }, [deletingUserId, deleteUser]);

  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedUserIds.size === 0) return;
    if (!window.confirm(`⚠️ Supprimer définitivement ${selectedUserIds.size} utilisateur(s) ?\n\nToutes leurs données seront supprimées. Cette action est irréversible.`)) return;

    setBatchDeleting(true);
    try {
      const result = await batchDeleteUsers({ userIds: Array.from(selectedUserIds) as any });
      if (result.deleted?.length) {
        toast.success(`${result.deleted.length} utilisateur(s) supprimé(s)`);
      }
      if (result.errors?.length) {
        toast.error(result.errors.join(", "));
      }
      setSelectedUserIds(new Set());
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
    setBatchDeleting(false);
  };

  // Toggle select all
  const toggleSelectAll = () => {
    const filtered = allUsers.filter((u: any) =>
      userSearch
        ? (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
          (u.email || "").toLowerCase().includes(userSearch.toLowerCase())
        : true
    );
    if (selectedUserIds.size === filtered.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filtered.map((u: any) => u._id)));
    }
  };

  // Check if user is admin
  if (user && user.role !== "admin") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Card className="border border-border/50 max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <Shield className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-lg font-bold">Accès refusé</h2>
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas les droits d'administration.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Retour au tableau de bord
              </Button>
              <Button onClick={() => navigate("/admin")}>
                <Shield className="h-4 w-4 mr-2" />
                Administration
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Connectez-vous avec un compte administrateur sur la page d'administration.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const handleCreateMaterial = async () => {
    if (!newMaterial.name || !newMaterial.unit || !newMaterial.unitPrice) return;
    await createMaterial({
      ...newMaterial,
      category: newMaterial.category as any,
    });
    setShowNewMaterial(false);
    setNewMaterial({ name: "", category: "ciment", unit: "", unitPrice: 0, currency: "TND" });
  };

  const handleUpdateMaterial = async (id: string) => {
    const vals = editValues[id];
    if (!vals) return;
    await updateMaterial({
      id: id as any,
      unitPrice: vals.unitPrice,
      name: vals.name,
      unit: vals.unit,
    });
    setEditingMaterial(null);
    setEditValues({});
  };

  const filteredMaterials = materialPrices.filter((m: any) =>
    searchQuery ? m.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const categoryLabels: Record<string, string> = {
    ciment: "Ciment",
    sable: "Sable",
    gravier: "Gravier",
    briques: "Briques",
    parpaings: "Parpaings",
    beton: "Béton",
    acier: "Acier",
    bois: "Bois",
    peinture: "Peinture",
    carrelage: "Carrelage",
    marbre: "Marbre",
    plomberie: "Plomberie",
    electricite: "Électricité",
    portes: "Portes",
    fenetres: "Fenêtres",
    toiture: "Toiture",
    etancheite: "Étanchéité",
    isolation: "Isolation",
    revetements: "Revêtements",
    main_oeuvre: "Main-d'œuvre",
    location_engins: "Location engins",
    transport: "Transport",
    terrassement: "Terrassement",
    fondations: "Fondations",
    finition: "Finition",
    divers: "Divers",
  };

  const totalCost = allProjects.reduce((sum: number, p: any) => sum + (p.costEstimate?.totalCost || 0), 0);

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 h-8 sm:h-9 shrink-0" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Retour</span>
            </Button>
            <div className="h-4 w-px bg-border shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              <h1 className="text-sm font-semibold truncate">Administration</h1>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
            Admin
          </Badge>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 mb-4 sm:mb-6">
            <TabsList className="bg-background border border-border/50 p-1 w-fit min-w-max">
              <TabsTrigger value="dashboard" className="text-xs gap-1.5">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden xs:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="materials" className="text-xs gap-1.5">
                <Package className="h-4 w-4" />
                <span className="hidden xs:inline">Matériaux</span>
              </TabsTrigger>
              <TabsTrigger value="projects" className="text-xs gap-1.5">
                <Building2 className="h-4 w-4" />
                <span className="hidden xs:inline">Projets</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs gap-1.5">
                <Users className="h-4 w-4" />
                <span className="hidden xs:inline">Utilisateurs</span>
              </TabsTrigger>
              <TabsTrigger value="virements" className="text-xs gap-1.5 relative">
                <Banknote className="h-4 w-4" />
                <span className="hidden xs:inline">Virements</span>
                {pendingSubs.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                    {pendingSubs.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="text-xs gap-1.5">
                <CreditCard className="h-4 w-4" />
                <span className="hidden xs:inline">Abonnements</span>
              </TabsTrigger>
              <TabsTrigger value="journal" className="text-xs gap-1.5">
                <NotebookPen className="h-4 w-4" />
                <span className="hidden xs:inline">Journal</span>
              </TabsTrigger>
              <TabsTrigger value="paiement" className="text-xs gap-1.5">
                <Banknote className="h-4 w-4" />
                <span className="hidden xs:inline">Paiement</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Admin Dashboard */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Utilisateurs</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">{allUsers.length}</p>
                    </div>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] sm:text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Crown className="h-3 w-3 text-amber-500" />{allUsers.filter((u: any) => u.role === "admin").length} admin</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">{allUsers.filter((u: any) => u.subscriptionPlan === "pro").length} Pro</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Total projets</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">{allProjects.length}</p>
                    </div>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] sm:text-[10px] text-muted-foreground">
                    <span>{allProjects.filter((p: any) => p.status === "completed").length} terminés</span>
                    <span>•</span>
                    <span>{allProjects.filter((p: any) => p.status === "draft").length} brouillons</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Abonnés Pro</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">{allSubsWithUsers.filter((s: any) => s.status === "active").length}</p>
                    </div>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                      <Crown className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] sm:text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{pendingSubs.length} en attente</span>
                    <span>•</span>
                    <span>{allSubsWithUsers.filter((s: any) => s.status === "canceled").length} annulés</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Revenus estimés</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">
                        {new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(allSubsWithUsers.filter((s: any) => s.status === "active").length * 79)}
                      </p>
                    </div>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] sm:text-[10px] text-muted-foreground">
                    <span>{allSubsWithUsers.filter((s: any) => s.status === "active").length * 79} TND/mois</span>
                    <span>•</span>
                    <span>{materialPrices.length} matériaux</span>
                  </div>
                </CardContent>
              </Card>
              {/* Payment method breakdown */}
              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Moyens de paiement</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">
                        {allSubsWithUsers.filter((s: any) => s.paymentMethod === "bank_transfer" || s.paymentMethod === "d17").length}
                      </p>
                    </div>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                      <Smartphone className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] sm:text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Banknote className="h-3 w-3" /> Virement: {allSubsWithUsers.filter((s: any) => s.paymentMethod === "bank_transfer").length}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><Smartphone className="h-3 w-3" /> D17: {allSubsWithUsers.filter((s: any) => s.paymentMethod === "d17").length}</span>
                  </div>
                </CardContent>
              </Card>
              {/* Activation rate */}
              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Taux d'activation</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">
                        {(() => {
                          const total = allSubsWithUsers.filter((s: any) => s.plan === "pro").length;
                          const active = allSubsWithUsers.filter((s: any) => s.status === "active").length;
                          if (total === 0) return "0%";
                          return Math.round((active / total) * 100) + "%";
                        })()}
                      </p>
                    </div>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
                      <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] sm:text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><ThumbsUp className="h-3 w-3 text-emerald-500" />{allSubsWithUsers.filter((s: any) => s.status === "active").length} actifs</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><Clock className="h-3 w-3 text-amber-500" />{pendingSubs.length} en attente</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">Projets récents</CardTitle>
                  <CardDescription className="text-[10px]">Les 5 derniers projets créés</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-1.5">
                    {allProjects.slice(0, 5).map((p: any) => (
                      <div key={p._id} className="flex items-center justify-between py-1.5 border-b border-border/5 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs truncate max-w-[150px]">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={p.status === "completed" ? "default" : "secondary"} className="text-[8px] h-4 px-1.5">
                            {p.status === "completed" ? "Terminé" : p.status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">Abonnements (30 jours)</CardTitle>
                  <CardDescription className="text-[10px]">Récapitulatif des abonnements</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: "Actifs", count: allSubsWithUsers.filter((s: any) => s.status === "active").length, color: "text-emerald-600", bg: "bg-emerald-100" },
                      { label: "En attente", count: pendingSubs.length, color: "text-amber-600", bg: "bg-amber-100" },
                      { label: "Annulés", count: allSubsWithUsers.filter((s: any) => s.status === "canceled").length, color: "text-red-500", bg: "bg-red-100" },
                    ].map((s) => (
                      <div key={s.label} className="text-center p-2 rounded-lg bg-muted/20 border border-border/10">
                        <p className={cn("text-lg font-bold", s.color)}>{s.count}</p>
                        <p className="text-[9px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {allSubsWithUsers.filter((s: any) => s.status === "active" || s.status === "pending").slice(0, 4).map((sub: any) => (
                      <div key={sub._id} className="flex items-center justify-between py-1 border-b border-border/5 last:border-0">
                        <span className="text-xs truncate max-w-[130px]">{sub.user?.name || "Anonyme"}</span>
                        <Badge variant={sub.status === "active" ? "default" : "outline"} className={cn("text-[8px] h-4 px-1.5", sub.status === "pending" && "border-amber-300 text-amber-600")}>
                          {sub.status === "active" ? "Actif" : "En attente"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-sm sm:text-base">Aperçu des catégories de matériaux</CardTitle>
                <CardDescription className="text-xs">Nombre d'articles par catégorie</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                  {materialCategories.map((cat: any) => (
                    <div key={cat.category} className="p-2 sm:p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
                      <p className="text-base sm:text-lg font-bold">{cat.count}</p>
                      <p className="text-[9px] sm:text-xs text-muted-foreground">{categoryLabels[cat.category] || cat.category}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Materials Management */}
          <TabsContent value="materials">
            <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6">
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base">Gestion des prix des matériaux</CardTitle>
                <CardDescription className="text-xs">Base de données des prix du marché tunisien</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-32 sm:w-48 pl-9 text-sm"
                  />
                </div>
                <Button size="sm" className="gap-1.5 h-9 shrink-0" onClick={() => setShowNewMaterial(!showNewMaterial)}>
                  <Plus className="h-4 w-4" />
                  <span className="hidden xs:inline">Ajouter</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                {/* New material form */}
                {showNewMaterial && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-4 p-4 rounded-xl bg-muted/30 border border-border/30 space-y-3"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Nom</label>
                        <Input value={newMaterial.name} onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })} placeholder="Ciment CPJ 42.5" className="h-9 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Catégorie</label>
                        <select
                          value={newMaterial.category}
                          onChange={(e) => setNewMaterial({ ...newMaterial, category: e.target.value })}
                          className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm"
                        >
                          {Object.entries(categoryLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Unité</label>
                        <Input value={newMaterial.unit} onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })} placeholder="sacs" className="h-9 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Prix unitaire</label>
                        <Input type="number" value={newMaterial.unitPrice} onChange={(e) => setNewMaterial({ ...newMaterial, unitPrice: parseFloat(e.target.value) })} placeholder="12" className="h-9 text-sm" />
                      </div>
                      <div className="flex items-end gap-2">
                        <Button size="sm" onClick={handleCreateMaterial} className="h-9">
                          <Check className="h-4 w-4 mr-1" />
                          Ajouter
                        </Button>
                        <Button size="sm" variant="ghost" className="h-9" onClick={() => setShowNewMaterial(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Materials table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2.5 px-2 font-medium text-muted-foreground text-xs">Nom</th>
                      <th className="text-left py-2.5 px-2 font-medium text-muted-foreground text-xs">Catégorie</th>
                      <th className="text-right py-2.5 px-2 font-medium text-muted-foreground text-xs">Unité</th>
                      <th className="text-right py-2.5 px-2 font-medium text-muted-foreground text-xs">Prix (TND)</th>
                      <th className="text-right py-2.5 px-2 font-medium text-muted-foreground text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaterials.map((material: any) => (
                      <tr key={material._id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-2">
                          {editingMaterial === material._id ? (
                            <Input
                              value={editValues[material._id]?.name || material.name}
                              onChange={(e) => setEditValues({ ...editValues, [material._id]: { ...editValues[material._id], name: e.target.value } })}
                              className="h-8 text-sm"
                            />
                          ) : (
                            <span className="font-medium">{material.name}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          <Badge variant="secondary" className="text-xs font-normal">
                            {categoryLabels[material.category] || material.category}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {editingMaterial === material._id ? (
                            <Input
                              value={editValues[material._id]?.unit || material.unit}
                              onChange={(e) => setEditValues({ ...editValues, [material._id]: { ...editValues[material._id], unit: e.target.value } })}
                              className="h-8 text-sm w-20 ml-auto"
                            />
                          ) : (
                            material.unit
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right font-medium">
                          {editingMaterial === material._id ? (
                            <Input
                              type="number"
                              value={editValues[material._id]?.unitPrice ?? material.unitPrice}
                              onChange={(e) => setEditValues({ ...editValues, [material._id]: { ...editValues[material._id], unitPrice: parseFloat(e.target.value) } })}
                              className="h-8 text-sm w-24 ml-auto"
                            />
                          ) : (
                            `${material.unitPrice.toFixed(3)} TND`
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {editingMaterial === material._id ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500" onClick={() => handleUpdateMaterial(material._id)}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingMaterial(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingMaterial(material._id)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={async () => {
                                  if (confirm("Supprimer ce matériau ?")) {
                                    await deleteMaterial({ id: material._id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Management */}
          <TabsContent value="projects">
            <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Gestion des projets</CardTitle>
                <CardDescription>Tous les projets des utilisateurs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-2.5 px-2 font-medium text-muted-foreground text-xs">Projet</th>
                        <th className="text-left py-2.5 px-2 font-medium text-muted-foreground text-xs">Type</th>
                        <th className="text-center py-2.5 px-2 font-medium text-muted-foreground text-xs">Statut</th>
                        <th className="text-right py-2.5 px-2 font-medium text-muted-foreground text-xs">Estimation</th>
                        <th className="text-right py-2.5 px-2 font-medium text-muted-foreground text-xs">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allProjects.map((project: any) => (
                        <tr key={project._id} className="border-b border-border/20 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/dashboard/project/${project._id}`)}>
                          <td className="py-2.5 px-2 font-medium">{project.name}</td>
                          <td className="py-2.5 px-2 text-muted-foreground">{project.category}</td>
                          <td className="py-2.5 px-2 text-center">
                            <Badge variant={project.status === "completed" ? "default" : "secondary"} className="text-xs font-normal">
                              {project.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-2 text-right font-medium">
                            {project.costEstimate
                              ? new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(project.costEstimate.totalCost)
                              : "-"}
                          </td>
                          <td className="py-2.5 px-2 text-right text-muted-foreground">
                            {new Date(project.createdAt).toLocaleDateString("fr-FR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Management */}
          <TabsContent value="users">
            <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6">
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-base">Gestion des utilisateurs</CardTitle>
                  <CardDescription className="text-xs">{allUsers.length} utilisateur(s) inscrit(s)</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {selectedUserIds.size > 0 && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-9 text-xs gap-1.5"
                      onClick={handleBatchDelete}
                      disabled={batchDeleting}
                    >
                      {batchDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Supprimer ({selectedUserIds.size})
                    </Button>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="h-9 w-full sm:w-56 pl-9 text-sm"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="w-8 py-2.5 px-2 sm:px-3">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.size > 0 && selectedUserIds.size === allUsers.filter((u: any) =>
                              userSearch ? (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) || (u.email || "").toLowerCase().includes(userSearch.toLowerCase()) : true
                            ).length}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 rounded border-border/50 accent-primary cursor-pointer"
                          />
                        </th>
                        <th className="text-left py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Utilisateur</th>
                        <th className="text-left py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Email</th>
                        <th className="text-center py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Statut</th>
                        <th className="text-center py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Rôle</th>
                        <th className="text-center py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Abonnement</th>
                        <th className="text-right py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Inscription</th>
                        <th className="text-right py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers
                        .filter((u: any) =>
                          userSearch
                            ? (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
                              (u.email || "").toLowerCase().includes(userSearch.toLowerCase())
                            : true
                        )
                        .map((u: any) => {
                          const userInitial = (u.name || u.email || "?").charAt(0).toUpperCase();
                          const isAdmin = u.role === "admin";
                          const isPro = u.subscriptionPlan === "pro";
                          const isDisabled = u.status === "disabled";
                          const isSelected = selectedUserIds.has(u._id);

                          return (
                            <tr key={u._id} className={cn(
                              "border-b border-border/20 hover:bg-muted/20 transition-colors",
                              isDisabled && "opacity-50"
                            )}>
                              <td className="py-3 px-2 sm:px-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const next = new Set(selectedUserIds);
                                    if (next.has(u._id)) next.delete(u._id);
                                    else next.add(u._id);
                                    setSelectedUserIds(next);
                                  }}
                                  className="h-4 w-4 rounded border-border/50 accent-primary cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-2 sm:px-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className={cn("h-8 w-8 shrink-0 border",
                                isAdmin ? "border-amber-200" : "border-border/40"
                              )}>
                                <AvatarImage src={u.image || ""} alt="Photo" className="object-cover" />
                                <AvatarFallback className={cn("text-xs font-bold",
                                  isAdmin ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"
                                )}>
                                  {userInitial}
                                </AvatarFallback>
                              </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
                                      {u.name || "Anonyme"}
                                    </p>
                                    {u.company && (
                                      <p className="text-[9px] text-muted-foreground truncate">{u.company}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-muted-foreground hidden sm:table-cell">
                                <span className="text-xs truncate max-w-[180px] block">{u.email || "—"}</span>
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-center">
                                {isDisabled ? (
                                  <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[8px] h-4.5">
                                    Désactivé
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[8px] h-4.5">
                                    Actif
                                  </Badge>
                                )}
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-center">
                                <select
                                  value={u.role || "user"}
                                  onChange={async (e) => {
                                    try {
                                      await updateUserRole({ userId: u._id, role: e.target.value as any });
                                      toast.success(`Rôle de ${u.name || "l'utilisateur"} mis à jour`);
                                    } catch {
                                      toast.error("Erreur lors de la mise à jour");
                                    }
                                  }}
                                  className={cn(
                                    "h-7 rounded-lg border px-2 text-[9px] font-medium cursor-pointer focus:outline-none focus:ring-1",
                                    isAdmin
                                      ? "bg-amber-50 border-amber-200 text-amber-700"
                                      : "bg-muted/30 border-border/40 text-muted-foreground"
                                  )}
                                >
                                  <option value="user">Utilisateur</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-center">
                                <select
                                  value={u.subscriptionPlan || "free"}
                                  onChange={async (e) => {
                                    try {
                                      await updateUserPlan({ userId: u._id, plan: e.target.value as any });
                                      toast.success(`Abonnement de ${u.name || "l'utilisateur"} mis à jour`);
                                    } catch {
                                      toast.error("Erreur lors de la mise à jour");
                                    }
                                  }}
                                  className={cn(
                                    "h-7 rounded-lg border px-2 text-[9px] font-medium cursor-pointer focus:outline-none focus:ring-1",
                                    isPro
                                      ? "bg-blue-50 border-blue-200 text-blue-700"
                                      : "bg-muted/30 border-border/40 text-muted-foreground"
                                  )}
                                >
                                  <option value="free">Gratuit</option>
                                  <option value="pro">Pro (79 TND)</option>
                                </select>
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-right hidden sm:table-cell">
                                <span className="text-[10px] text-muted-foreground">
                                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString("fr-FR") : "—"}
                                </span>
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {isAdmin && (
                                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[8px] h-4.5">
                                      <Crown className="h-2.5 w-2.5 mr-0.5" />
                                      Admin
                                    </Badge>
                                  )}
                                  {isPro && (
                                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[8px] h-4.5">
                                      Pro
                                    </Badge>
                                  )}
                                  <button
                                    onClick={async () => {
                                      const newStatus = isDisabled ? "active" : "disabled";
                                      const action = isDisabled ? "réactivé" : "désactivé";
                                      try {
                                        await toggleUserStatus({ userId: u._id, status: newStatus as any });
                                        toast.success(`${u.name || "Utilisateur"} ${action} avec succès`);
                                      } catch (err: any) {
                                        toast.error(err.message || "Erreur");
                                      }
                                    }}
                                    className={cn(
                                      "flex h-7 w-7 items-center justify-center rounded-lg active:scale-95 transition-all",
                                      isDisabled
                                        ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                    )}
                                    title={isDisabled ? "Réactiver le compte" : "Désactiver le compte"}
                                  >
                                    {isDisabled ? (
                                      <ToggleRight className="h-3.5 w-3.5" />
                                    ) : (
                                      <ToggleLeft className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => {
                                      const name = u.name || u.email || "cet utilisateur";
                                      if (window.confirm(`⚠️ Supprimer définitivement ${name} ?\n\nToutes ses données (projets, abonnements, notifications) seront supprimées. Cette action est irréversible.`)) {
                                        setDeletingUserId(u._id);
                                      }
                                    }}
                                    disabled={deletingUserId === u._id}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50"
                                    title="Supprimer l'utilisateur"
                                  >
                                    {deletingUserId === u._id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                {allUsers.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Aucun utilisateur trouvé</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Virements Bancaires */}
          <TabsContent value="virements">
            <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-sm sm:text-base">Validation des virements bancaires</CardTitle>
                    <CardDescription className="text-xs">
                      {pendingSubs.length > 0
                        ? `${pendingSubs.length} abonnement(s) en attente de validation`
                        : "Aucun virement en attente"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                {pendingSubs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex justify-center mb-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                        <Check className="h-8 w-8 text-emerald-600" />
                      </div>
                    </div>
                    <p className="text-sm font-semibold">Tout est à jour</p>
                    <p className="text-xs text-muted-foreground mt-1">Aucun virement en attente de validation.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="text-left py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Client</th>
                          <th className="text-left py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Contact</th>
                          <th className="text-center py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Offre</th>
                          <th className="text-center py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Reçu</th>
                          <th className="text-right py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Montant</th>
                          <th className="text-right py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Date</th>
                          <th className="text-right py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingSubs.map((sub: any) => {
                          const user = sub.user;
                          const subDate = new Date(sub.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          });

                          return (
                            <tr key={sub._id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                              <td className="py-3 px-2 sm:px-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8 shrink-0 border border-border/40">
                                    <AvatarImage src={user?.image || ""} alt="Photo" className="object-cover" />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                      {user?.name ? user.name.charAt(0).toUpperCase() : "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[180px]">
                                      {user?.name || "Anonyme"}
                                    </p>
                                    {user?.company && (
                                      <p className="text-[9px] text-muted-foreground truncate">{user.company}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-muted-foreground hidden sm:table-cell">
                                <div className="space-y-0.5">
                                  {user?.email && (
                                    <div className="flex items-center gap-1 text-xs">
                                      <Mail className="h-3 w-3 shrink-0" />
                                      <span className="truncate max-w-[160px]">{user.email}</span>
                                    </div>
                                  )}
                                  {user?.phone && (
                                    <div className="flex items-center gap-1 text-xs">
                                      <Phone className="h-3 w-3 shrink-0" />
                                      <span>{user.phone}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-center">
                                <Badge className="bg-blue-500/10 text-blue-600 border-blue-200/30 text-[9px]">
                                  {sub.plan === "pro" ? "Pro" : sub.plan}
                                </Badge>
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-center hidden sm:table-cell">
                                {sub.paymentProofUrl ? (
                                  <a
                                    href={sub.paymentProofUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative inline-flex items-center justify-center"
                                    title="Voir le reçu de paiement"
                                  >
                                    <div className="h-10 w-10 rounded-lg border border-border/40 bg-muted/20 overflow-hidden hover:ring-2 hover:ring-primary/30 transition-all">
                                      <img
                                        src={sub.paymentProofUrl}
                                        alt="Reçu"
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = "none";
                                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                                        }}
                                      />
                                      <div className="hidden absolute inset-0 flex items-center justify-center bg-muted/50 text-[8px] text-muted-foreground">
                                        PDF
                                      </div>
                                    </div>
                                  </a>
                                ) : (
                                  <span className="text-[9px] text-muted-foreground/50">—</span>
                                )}
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-right hidden sm:table-cell">
                                <span className="font-semibold text-xs">
                                  {sub.amount ? `${sub.amount} TND` : "79 TND"}
                                </span>
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-right text-muted-foreground hidden sm:table-cell">
                                <div className="flex items-center gap-1 justify-end text-xs">
                                  <Clock className="h-3 w-3" />
                                  {subDate}
                                </div>
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={async () => {
                                      try {
                                        await approveSub({ subscriptionId: sub._id });
                                        toast.success(`Abonnement ${user?.name || ""} activé avec succès`);
                                      } catch (err) {
                                        toast.error("Erreur lors de l'activation");
                                      }
                                    }}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 active:scale-95 transition-all"
                                    title="Approuver le virement"
                                  >
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Annuler la demande de ${user?.name || "cet utilisateur"} ?`)) return;
                                      try {
                                        await rejectSub({ subscriptionId: sub._id });
                                        toast.success("Demande annulée");
                                      } catch (err) {
                                        toast.error("Erreur lors de l'annulation");
                                      }
                                    }}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-500 hover:bg-red-200 active:scale-95 transition-all"
                                    title="Refuser le virement"
                                  >
                                    <ThumbsDown className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Subscriptions History */}
          <TabsContent value="subscriptions">
            <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6">
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-base">Historique des abonnements</CardTitle>
                  <CardDescription className="text-xs">{allSubsWithUsers.length} abonnement(s) au total</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Actifs: {allSubsWithUsers.filter((s: any) => s.status === "active").length}</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Attente: {pendingSubs.length}</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> Annulés: {allSubsWithUsers.filter((s: any) => s.status === "canceled").length}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                {allSubsWithUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Aucun abonnement</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="text-left py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Client</th>
                          <th className="text-left py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Email</th>
                          <th className="text-center py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Offre</th>
                          <th className="text-center py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Statut</th>
                          <th className="text-right py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Paiement</th>
                          <th className="text-right py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Date</th>
                          <th className="text-right py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Fin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allSubsWithUsers.map((sub: any) => {
                          const statusColors: Record<string, string> = {
                            active: "bg-emerald-50 text-emerald-700 border-emerald-200",
                            pending: "bg-amber-50 text-amber-700 border-amber-200",
                            canceled: "bg-red-50 text-red-600 border-red-200",
                            expired: "bg-slate-100 text-slate-500 border-slate-200",
                          };
                          const statusLabels: Record<string, string> = {
                            active: "Actif",
                            pending: "En attente",
                            canceled: "Annulé",
                            expired: "Expiré",
                          };
                          const payLabels: Record<string, string> = {
                            bank_transfer: "Virement",
                            admin: "Admin",
                          };

                          return (
                            <tr key={sub._id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                              <td className="py-3 px-2 sm:px-3">
                                <span className="text-xs sm:text-sm font-medium">{sub.user?.name || "Anonyme"}</span>
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-muted-foreground hidden sm:table-cell">
                                <span className="text-xs">{sub.user?.email || "—"}</span>
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-center">
                                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[9px]">
                                  {sub.plan === "pro" ? "Pro" : sub.plan}
                                </Badge>
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-center">
                                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium border", statusColors[sub.status] || "")}>
                                  {statusLabels[sub.status] || sub.status}
                                </span>
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-right hidden sm:table-cell">
                                <span className="text-[10px] text-muted-foreground">
                                  {payLabels[sub.paymentMethod] || sub.paymentMethod || "—"}
                                </span>
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-right hidden sm:table-cell">
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(sub.createdAt).toLocaleDateString("fr-FR")}
                                </span>
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-right">
                                <span className="text-[10px] text-muted-foreground">
                                  {sub.endDate ? new Date(sub.endDate).toLocaleDateString("fr-FR") : "—"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Action Logs */}
          <TabsContent value="journal">
            <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6">
                <div className="flex items-center gap-2 min-w-0">
                  <NotebookPen className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <CardTitle className="text-sm sm:text-base">Journal d'activité</CardTitle>
                    <CardDescription className="text-xs">{adminLogs.length} action(s) enregistrée(s)</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                {adminLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <NotebookPen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Aucune action enregistrée</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">Les actions des administrateurs apparaîtront ici.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="text-left py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Admin</th>
                          <th className="text-left py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Action</th>
                          <th className="text-left py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Cible</th>
                          <th className="text-left py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs hidden md:table-cell">Détails</th>
                          <th className="text-right py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminLogs.map((log: any) => {
                          const actionLabels: Record<string, { label: string; icon: any; color: string }> = {
                            delete_user: { label: "Suppression utilisateur", icon: Trash2, color: "text-red-500" },
                            batch_delete_users: { label: "Suppression groupée", icon: Trash2, color: "text-red-500" },
                            toggle_user_status: { label: "Statut utilisateur", icon: ToggleLeft, color: "text-amber-500" },
                            update_user_role: { label: "Rôle modifié", icon: Crown, color: "text-amber-500" },
                            update_user_plan: { label: "Abonnement modifié", icon: CreditCard, color: "text-blue-500" },
                            approve_subscription: { label: "Abonnement activé", icon: ThumbsUp, color: "text-emerald-500" },
                            reject_subscription: { label: "Abonnement refusé", icon: ThumbsDown, color: "text-red-500" },
                            create_material: { label: "Matériau ajouté", icon: Plus, color: "text-emerald-500" },
                            update_material: { label: "Matériau modifié", icon: Edit, color: "text-blue-500" },
                            delete_material: { label: "Matériau supprimé", icon: Trash2, color: "text-red-500" },
                          };
                          const info = actionLabels[log.action] || { label: log.action, icon: Activity, color: "text-slate-400" };
                          const Icon = info.icon;

                          return (
                            <tr key={log._id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                              <td className="py-2.5 px-2 sm:px-3">
                                <span className="font-medium">{log.adminName || "Admin"}</span>
                              </td>
                              <td className="py-2.5 px-2 sm:px-3">
                                <span className={cn("inline-flex items-center gap-1 text-xs", info.color)}>
                                  <Icon className="h-3 w-3" />
                                  {info.label}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 sm:px-3 text-muted-foreground hidden sm:table-cell">
                                <span className="text-xs">{log.targetUserEmail || "—"}</span>
                              </td>
                              <td className="py-2.5 px-2 sm:px-3 text-muted-foreground hidden md:table-cell">
                                <span className="text-xs truncate max-w-[200px] block">{log.details || "—"}</span>
                              </td>
                              <td className="py-2.5 px-2 sm:px-3 text-right">
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(log.createdAt).toLocaleDateString("fr-FR", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Configuration */}
          <TabsContent value="paiement">
            <PaymentConfigSection />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

// ============================================================================
// Payment Configuration Section
// ============================================================================

function PaymentConfigSection() {
  const config = useQuery(api.payments.getPaymentConfigAdmin);
  const updateConfig = useMutation(api.payments.updatePaymentConfig);
  const seedConfig = useMutation(api.payments.seedDefaultPaymentConfig);
  
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [form, setForm] = useState<Record<string, string | number>>({});
  
  // Initialize form when config loads
  const initialized = useRef(false);
  useEffect(() => {
    if (config && !initialized.current) {
      const initial: Record<string, string | number> = {};
      Object.entries(config).forEach(([key, val]) => {
        if (typeof val === "string" || typeof val === "number") {
          initial[key] = val;
        }
      });
      setForm(initial);
      initialized.current = true;
    }
  }, [config]);

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfig({
        bankName: form.bankName as string,
        bankTitulaire: form.bankTitulaire as string,
        bankRib: form.bankRib as string,
        bankIban: form.bankIban as string,
        bankSwift: form.bankSwift as string,
        d17MerchantName: form.d17MerchantName as string,
        d17Phone: form.d17Phone as string,
        d17Email: form.d17Email as string,
        d17Notice: form.d17Notice as string,
        proPrice: Number(form.proPrice) || 79,
        supplierPrice: Number(form.supplierPrice) || 120,
        currency: form.currency as string || "TND",
      });
      toast.success("Configuration de paiement mise à jour !");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await seedConfig();
      toast.success(result.message);
      initialized.current = true;
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setSeeding(false);
    }
  };

  // Get the API object
  const api2 = api;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Virement bancaire */}
      <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
        <CardHeader className="p-5">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-sm">Virement bancaire</CardTitle>
              <CardDescription className="text-xs">Coordonnées affichées aux utilisateurs</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Banque</label>
            <Input value={form.bankName || ""} onChange={(e) => handleChange("bankName", e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Titulaire</label>
            <Input value={form.bankTitulaire || ""} onChange={(e) => handleChange("bankTitulaire", e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">RIB</label>
            <Input value={form.bankRib || ""} onChange={(e) => handleChange("bankRib", e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">IBAN</label>
            <Input value={form.bankIban || ""} onChange={(e) => handleChange("bankIban", e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Swift/BIC</label>
            <Input value={form.bankSwift || ""} onChange={(e) => handleChange("bankSwift", e.target.value)} className="h-9 text-sm" />
          </div>
        </CardContent>
      </Card>

      {/* D17 Poste Tunisienne */}
      <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
        <CardHeader className="p-5">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-sm">D17 (Poste Tunisienne)</CardTitle>
              <CardDescription className="text-xs">Coordonnées D17 affichées aux utilisateurs</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Bénéficiaire</label>
            <Input value={form.d17MerchantName || ""} onChange={(e) => handleChange("d17MerchantName", e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Téléphone D17</label>
            <Input value={form.d17Phone || ""} onChange={(e) => handleChange("d17Phone", e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Email</label>
            <Input value={form.d17Email || ""} onChange={(e) => handleChange("d17Email", e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Notice d'information</label>
            <textarea
              value={form.d17Notice || ""}
              onChange={(e) => handleChange("d17Notice", e.target.value)}
              className="h-16 w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-xs resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Prix */}
      <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
        <CardHeader className="p-5">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-sm">Prix des abonnements</CardTitle>
              <CardDescription className="text-xs">Montants affichés dans les pages de paiement</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Abonnement Pro (TND/mois)</label>
            <Input type="number" value={form.proPrice || 79} onChange={(e) => handleChange("proPrice", e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Abonnement Fournisseur (TND/mois)</label>
            <Input type="number" value={form.supplierPrice || 120} onChange={(e) => handleChange("supplierPrice", e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Devise</label>
            <Input value={form.currency || "TND"} onChange={(e) => handleChange("currency", e.target.value)} className="h-9 text-sm" />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
        <CardHeader className="p-5">
          <CardTitle className="text-sm">Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-3">
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-9 text-xs gap-1.5" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Enregistrer la configuration
            </Button>
            <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5" onClick={handleSeed} disabled={seeding}>
              {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Valeurs par défaut
            </Button>
          </div>
          {config && (
            <p className="text-[9px] text-muted-foreground">
              Dernière mise à jour : {new Date(config.updatedAt).toLocaleString("fr-FR")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

