import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { useState, useMemo } from "react";
import {
  ArrowLeft, TrendingUp, TrendingDown, Search, HardHat,
  Package, Clock, BarChart3, RefreshCw, DollarSign,
  Shield, Calendar, Loader2, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { usePageSEO } from "@/hooks/use-page-seo";

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

const categoryColors: Record<string, string> = {
  ciment: "from-blue-500/10 to-blue-500/5 text-blue-600",
  sable: "from-yellow-500/10 to-yellow-500/5 text-yellow-600",
  gravier: "from-stone-500/10 to-stone-500/5 text-stone-600",
  briques: "from-red-500/10 to-red-500/5 text-red-600",
  parpaings: "from-orange-500/10 to-orange-500/5 text-orange-600",
  beton: "from-slate-500/10 to-slate-500/5 text-slate-600",
  acier: "from-gray-500/10 to-gray-500/5 text-gray-600",
  bois: "from-amber-700/10 to-amber-700/5 text-amber-700",
  peinture: "from-cyan-500/10 to-cyan-500/5 text-cyan-600",
  carrelage: "from-emerald-500/10 to-emerald-500/5 text-emerald-600",
  plomberie: "from-sky-500/10 to-sky-500/5 text-sky-600",
  electricite: "from-yellow-600/10 to-yellow-600/5 text-yellow-600",
  portes: "from-brown-500/10 to-brown-500/5 text-brown-600",
  fenetres: "from-indigo-500/10 to-indigo-500/5 text-indigo-600",
  toiture: "from-rose-500/10 to-rose-500/5 text-rose-600",
  main_oeuvre: "from-purple-500/10 to-purple-500/5 text-purple-600",
};

const fmt = (n: number) => new Intl.NumberFormat("fr-TN", {
  style: "currency", currency: "TND", maximumFractionDigits: 3,
}).format(n);

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export default function MaterialsPage() {
  usePageSEO({ title: "Prix des matériaux 2026 - batibuild App", description: "Consultez les prix actualisés des matériaux de construction en Tunisie pour 2026." });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const materialPrices = useQuery(api.materials.getMaterialPrices, {}) || [];
  const categories = useQuery(api.materials.getMaterialCategories) || [];
  const refreshPrices = useMutation(api.materials.refreshMaterialPrices);
  
  const isAdmin = user?.role === "admin";

  const handleRefreshPrices = async () => {
    if (!isAdmin) return;
    setRefreshing(true);
    try {
      const result = await refreshPrices();
      toast.success(`${result.updated} / ${result.total} prix mis à jour avec les fluctuations du marché`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour");
    }
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const now = Date.now();
    const monthAgo = now - 30 * 24 * 3600 * 1000;
    const recentUpdated = materialPrices.filter((m: any) => m.lastUpdated > monthAgo);
    return {
      total: materialPrices.length,
      categories: categories.length,
      recent: recentUpdated.length,
      avgPrice: materialPrices.length > 0
        ? Math.round(materialPrices.reduce((s: number, m: any) => s + m.unitPrice, 0) / materialPrices.length * 100) / 100
        : 0,
    };
  }, [materialPrices, categories]);

  const filteredMaterials = materialPrices.filter((m: any) => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || m.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedByCategory = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const m of filteredMaterials) {
      if (!map[m.category]) map[m.category] = [];
      map[m.category].push(m);
    }
    return map;
  }, [filteredMaterials]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.02] via-background to-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/20 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => navigate("/dashboard")}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-border/50 shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
              <div>
                <h1 className="text-sm font-semibold truncate">Prix des matériaux 2026</h1>
                <p className="text-[9px] text-muted-foreground leading-tight">Marché tunisien — Mise à jour mensuelle</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs border-emerald-200/60 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                disabled={refreshing}
                onClick={handleRefreshPrices}
              >
                {refreshing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Mise à jour
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          {[
            { icon: Package, label: "Matériaux suivis", value: `${stats.total}`, color: "from-blue-500/10 to-blue-500/5 text-blue-600" },
            { icon: BarChart3, label: "Catégories", value: `${stats.categories}`, color: "from-violet-500/10 to-violet-500/5 text-violet-600" },
            { icon: DollarSign, label: "Prix moyen", value: fmt(stats.avgPrice).replace("TND", "TND").trim(), color: "from-emerald-500/10 to-emerald-500/5 text-emerald-600" },
            { icon: RefreshCw, label: "Mis à jour (30j)", value: `${stats.recent}`, color: "from-amber-500/10 to-amber-500/5 text-amber-600" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 p-3 sm:p-4 rounded-xl bg-gradient-to-br from-background to-muted/20 border border-border/30 shadow-xs">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br", s.color)}>
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-muted-foreground/60 leading-tight">{s.label}</p>
                <p className="text-xs sm:text-sm font-bold truncate">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un matériau..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9 rounded-xl border-border/40"
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 border",
              activeCategory === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background text-muted-foreground border-border/40 hover:border-border hover:bg-muted/30"
            )}
          >
            <Package className="h-3 w-3" />
            Tous
          </button>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 border",
                activeCategory === key
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border/40 hover:border-border hover:bg-muted/30"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Materials Grid */}
        <div className="space-y-4">
          {Object.entries(groupedByCategory).length === 0 ? (
            <Card className="border border-border/50">
              <CardContent className="p-10 text-center">
                <HardHat className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium">Aucun matériau trouvé</p>
                <p className="text-xs text-muted-foreground mt-1">Essayez de modifier votre recherche</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedByCategory).map(([category, materials]: [string, any[]]) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Card className="border border-border/40 shadow-sm overflow-hidden rounded-xl">
                  <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br text-[9px]", categoryColors[category] || "bg-muted/30")}>
                          {materials.length}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">{categoryLabels[category] || category}</CardTitle>
                          <CardDescription className="text-[9px]">{materials.length} matériaux</CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[9px] font-normal">{materials.length} articles</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/10 bg-muted/20">
                            <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Matériau</th>
                            <th className="text-right py-2.5 px-4 font-medium text-muted-foreground hidden sm:table-cell">Unité</th>
                            <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">Prix (TND)</th>
                            <th className="text-right py-2.5 px-4 font-medium text-muted-foreground hidden sm:table-cell">Dernière MAJ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {materials.map((material: any) => {
                            const daysSinceUpdate = Math.floor((Date.now() - material.lastUpdated) / (24 * 3600 * 1000));
                            return (
                              <tr key={material._id} className="border-b border-border/5 hover:bg-muted/10 transition-colors">
                                <td className="py-2.5 px-4 font-medium truncate max-w-[180px] sm:max-w-none">{material.name}</td>
                                <td className="py-2.5 px-4 text-right text-muted-foreground hidden sm:table-cell">{material.unit}</td>
                                <td className="py-2.5 px-4 text-right font-semibold font-mono text-sm">{material.unitPrice.toFixed(3)}</td>
                                <td className="py-2.5 px-4 text-right hidden sm:table-cell">
                                  <span className={cn(
                                    "text-[9px]",
                                    daysSinceUpdate < 30 ? "text-emerald-600" : "text-amber-600"
                                  )}>
                                    {daysSinceUpdate < 1 ? "Aujourd'hui" : `Il y a ${daysSinceUpdate}j`}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-2 text-[9px] text-muted-foreground/50 pt-2">
          <RefreshCw className="h-3 w-3" />
          <span>Prix mis à jour automatiquement chaque mois — Tunisie 2026</span>
        </div>
      </div>
    </main>
  );
}
