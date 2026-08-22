import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Store, Users, TrendingUp, TrendingDown, Minus,
  Sparkles, Package, Download, MapPin, Layers, CalendarDays,
} from "lucide-react";
import { usePageSEO } from "@/hooks/use-page-seo";
import { generateMaterialReportPdf } from "@/lib/materialReportPdf";
import { SupplierRecommendedCard } from "@/components/SupplierRecommendedCard";
import { useAuth } from "@/hooks/use-auth";

const PROFILE_META: Record<string, { label: string; color: string; icon: any; badge: string }> = {
  economique: { label: "Économique", color: "emerald", icon: TrendingDown, badge: "Meilleur prix" },
  equilibre: { label: "Équilibrée", color: "blue", icon: Minus, badge: "Meilleur rapport qualité/prix" },
  premium: { label: "Premium", color: "violet", icon: TrendingUp, badge: "Meilleure performance" },
};

const COLOR_MAP: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

const fmtTnd = (n: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(n);

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function AiMaterialsResults() {
  usePageSEO({ title: "Résultats Analyse IA - Matériaux | batibuild App", description: "Consultez les recommandations de matériaux générées par l'IA pour votre projet." });
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const analysis = useQuery(
    api.aiMaterials.getCopilotAnalysisById,
    analysisId ? { analysisId: analysisId as any } : "skip",
  );

  if (analysis === undefined) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="h-6 w-6" />
      </main>
    );
  }

  if (!analysis) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">Analyse introuvable.</p>
          <Button variant="outline" onClick={() => navigate("/dashboard/ai-materials")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
          </Button>
        </div>
      </main>
    );
  }

  const result = analysis.results?.recommend;
  if (!result) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">Analyse sans résultats.</p>
          <Button variant="outline" onClick={() => navigate("/dashboard/ai-materials")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
          </Button>
        </div>
      </main>
    );
  }

  const input = analysis.input || {};

  const handleDownloadPdf = async () => {
    try {
      await generateMaterialReportPdf(result);
    } catch {
      /* ignore */
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-12">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard/ai-materials")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 hover:bg-muted/50 active:scale-95 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">Résultats de l'analyse IA</h1>
            <p className="text-[11px] text-muted-foreground">
              {fmtDate(analysis.createdAt)} · {result.categories?.length || 0} catégorie{result.categories?.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleDownloadPdf}>
              <Download className="h-3.5 w-3.5" /> PDF
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => navigate("/dashboard/suppliers")}>
              <Store className="h-3.5 w-3.5" /> Fournisseurs
            </Button>
          </div>
        </div>

        {/* Context summary */}
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {input.context?.region && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {input.context.region}</span>
              )}
              {input.context?.surface && (
                <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {input.context.surface} m²</span>
              )}
              {input.categories && (
                <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {input.categories.length} catégories</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cost summary */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.03] to-background">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-lg font-black text-primary">{fmtTnd(result.cost?.total || 0)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Économique</p>
                <p className="text-sm font-bold text-emerald-600">{fmtTnd(result.profiles?.economique?.totalCost || 0)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Premium</p>
                <p className="text-sm font-bold text-violet-600">{fmtTnd(result.profiles?.premium?.totalCost || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profiles */}
        {result.profiles && Object.entries(result.profiles).map(([key, profile]: [string, any]) => {
          const meta = PROFILE_META[key];
          if (!meta || !profile) return null;
          const Icon = meta.icon;
          return (
            <motion.div key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className={`border-${meta.color}-200/50`}>
                <CardHeader className="pb-2 p-4">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-${meta.color}-100`}>
                      <Icon className={`h-3.5 w-3.5 text-${meta.color}-600`} />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{meta.label}</CardTitle>
                      <p className="text-[10px] text-muted-foreground">{meta.badge}</p>
                    </div>
                    <Badge className={`ml-auto text-[9px] ${COLOR_MAP[meta.color]}`}>{fmtTnd(profile.totalCost || 0)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {profile.categories && (
                    <div className="space-y-2">
                      {profile.categories.map((cat: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border/20 bg-muted/10 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{cat.label || cat.categoryId}</p>
                            {cat.materials && (
                              <p className="text-[10px] text-muted-foreground truncate">
                                {cat.materials.map((m: any) => m.name).join(", ")}
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-bold tabular-nums shrink-0">{fmtTnd(cat.totalCost || 0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {/* Supplier cards per category */}
        {result.categories && result.categories.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Store className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Prestataires recommandés</h2>
            </div>
            <div className="space-y-4">
              {result.categories.map((cat: any) => {
                const equilibreSol = cat.solutions?.find((s: any) => s.profile === "equilibre");
                if (!equilibreSol) return null;
                const mat = equilibreSol.material;
                const mats = [{ name: mat.name, quantity: mat.quantity ?? 0, unit: mat.unit ?? "" }];
                return (
                  <SupplierRecommendedCard
                    key={cat.categoryId}
                    categoryKey={cat.categoryId}
                    categoryLabel={cat.label}
                    materials={mats}
                    currentUserId={user?._id as string | undefined}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* CTA: View all suppliers */}
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="lg"
            className="gap-2 text-sm"
            onClick={() => navigate("/dashboard/suppliers")}
          >
            <Store className="h-4 w-4" />
            Afficher la liste des fournisseurs
          </Button>
        </div>

        {/* Back to analysis */}
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate("/dashboard/ai-materials")}>
            <ArrowLeft className="h-3 w-3" /> Nouvelle analyse
          </Button>
        </div>
      </div>
    </main>
  );
}
