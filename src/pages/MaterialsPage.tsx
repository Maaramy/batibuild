import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { useState } from "react";
import { ArrowLeft, HardHat, Search, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

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

export default function MaterialsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const materialPrices = useQuery(api.materials.getMaterialPrices, {}) || [];
  const categories = useQuery(api.materials.getMaterialCategories) || [];

  const filteredMaterials = materialPrices.filter((m: any) => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || m.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedByCategory = filteredMaterials.reduce((acc: any, m: any) => {
    if (!acc[m.category]) acc[m.category] = [];
    acc[m.category].push(m);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center h-16">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div className="ml-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-sm">Prix des matériaux - Tunisie</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un matériau..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={activeCategory === "all" ? "default" : "outline"}
              size="sm"
              className="whitespace-nowrap"
              onClick={() => setActiveCategory("all")}
            >
              Tous
            </Button>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <Button
                key={key}
                variant={activeCategory === key ? "default" : "outline"}
                size="sm"
                className="whitespace-nowrap"
                onClick={() => setActiveCategory(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Materials Grid */}
        <div className="space-y-6">
          {Object.entries(groupedByCategory).length === 0 ? (
            <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <HardHat className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">Aucun matériau trouvé</p>
                <p className="text-xs text-muted-foreground">Essayez de modifier votre recherche</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedByCategory).map(([category, materials]: [string, any]) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden">
                  <CardHeader className="pb-3 border-b border-border/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{categoryLabels[category] || category}</CardTitle>
                        <CardDescription>{materials.length} matériaux</CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {materials.length} articles
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/20 bg-muted/20">
                          <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Matériau</th>
                          <th className="text-right py-2.5 px-4 font-medium text-muted-foreground text-xs">Unité</th>
                          <th className="text-right py-2.5 px-4 font-medium text-muted-foreground text-xs">Prix (TND)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materials.map((material: any) => (
                          <tr key={material._id} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 px-4 font-medium">{material.name}</td>
                            <td className="py-2.5 px-4 text-right text-muted-foreground">{material.unit}</td>
                            <td className="py-2.5 px-4 text-right font-semibold">{material.unitPrice.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
