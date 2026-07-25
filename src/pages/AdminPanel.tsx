import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useState, useEffect } from "react";
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

  const pendingSubs = useQuery(api.subscriptions.getPendingSubscriptions) || [];
  const approveSub = useMutation(api.subscriptions.adminApproveSubscription);
  const rejectSub = useMutation(api.subscriptions.adminRejectSubscription);

  const createMaterial = useMutation(api.materials.createMaterialPrice);
  const updateMaterial = useMutation(api.materials.updateMaterialPrice);
  const deleteMaterial = useMutation(api.materials.deleteMaterialPrice);

  // Check if user is admin
  if (user && user.role !== "admin") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Card className="border border-border/50">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-lg font-bold mb-2">Accès refusé</h2>
            <p className="text-sm text-muted-foreground mb-4">Vous n'avez pas les droits d'administration.</p>
            <Button onClick={() => navigate("/dashboard")}>Retour au tableau de bord</Button>
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
            </TabsList>
          </div>

          {/* Admin Dashboard */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total projets</p>
                      <p className="text-2xl font-bold mt-1">{allProjects.length}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Coût total estimé</p>
                      <p className="text-2xl font-bold mt-1">{new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(totalCost)}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Matériaux</p>
                      <p className="text-2xl font-bold mt-1">{materialPrices.length}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                      <Package className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Catégories</p>
                      <p className="text-2xl font-bold mt-1">{materialCategories.length}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Aperçu des catégories de matériaux</CardTitle>
                <CardDescription>Nombre d'articles par catégorie</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {materialCategories.map((cat: any) => (
                    <div key={cat.category} className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
                      <p className="text-lg font-bold">{cat.count}</p>
                      <p className="text-xs text-muted-foreground">{categoryLabels[cat.category] || cat.category}</p>
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
              <CardHeader>
                <CardTitle className="text-base">Gestion des utilisateurs</CardTitle>
                <CardDescription>Liste des utilisateurs inscrits</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  Interface de gestion des utilisateurs en cours de développement.
                </p>
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
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                    {user?.name ? user.name.charAt(0).toUpperCase() : "?"}
                                  </div>
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
        </Tabs>
      </div>
    </main>
  );
}
