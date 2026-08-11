import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FloorPlan2D } from "@/components/plans/FloorPlanView";
import { PlanViewerModal } from "@/components/plans/PlanViewerModal";
import { generatePlans, bienTypeLabel } from "@/convex/planEngine";
import type { PlanRequest, GeneratedPlan } from "@/convex/planEngine";
import { exportPlanPdf } from "@/lib/planExport";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Landmark,
  FlaskConical,
  ArrowRight,
  Sparkles,
  Eye,
  FileText,
  Loader2,
  Gauge,
  Ruler,
  BedDouble,
  Bath,
  LayoutGrid,
  PenTool,
} from "lucide-react";
import { useMemo, useState } from "react";

// ============================================================================
// Page publique — exemple de plans architecturaux générés par l'IA
// Plans calculés par le vrai moteur procédural (generatePlans), à titre de démo.
// ============================================================================

const DEMO_REQUEST: PlanRequest = {
  bienType: "maison",
  surfaceTotale: 400,
  surfaceCouverte: 150,
  floors: 1,
  bedrooms: 3,
  bathrooms: 2,
  wcs: 1,
  hasSalon: true,
  hasSalleAManger: true,
  hasCuisine: true,
  hasBuanderie: true,
  hasDressing: true,
  hasBureau: true,
  hasLocalTechnique: false,
  hasGarage: true,
  hasParking: false,
  hasTerrasse: true,
  hasBalcon: false,
  hasJardin: true,
  hasPiscine: false,
  orientation: "sud",
  entreePosition: "sud",
  facades: 2,
  standing: "standard",
  style: "moderne",
  seed: 2026,
};

export default function DemoPlan() {
  usePageSEO({
    title: "Exemple de plans architecturaux générés par IA - batibuild App",
    description: "Découvrez des exemples de plans architecturaux 2D générés par l'IA batibuild App : agencement des pièces, dimensions, scores d'optimisation — adaptés au marché tunisien.",
  });
  const navigate = useNavigate();

  const plans = useMemo(() => generatePlans(DEMO_REQUEST), []);
  const featured = useMemo(() => plans.slice(0, 4), [plans]);

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadPdf = async (plan: GeneratedPlan) => {
    setDownloading(plan.key);
    try {
      await exportPlanPdf(plan);
      toast.success(`Plan ${String(plan.index).padStart(2, "0")} téléchargé en PDF`);
    } catch (err: any) {
      toast.error(err?.message || "Échec du PDF");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Public top bar */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-3 sm:px-5 lg:px-6 py-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm font-bold hover:opacity-80 transition-opacity"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Landmark className="h-4 w-4" />
            </span>
            batibuild App
          </button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px]">
              <FlaskConical className="h-3 w-3" />
              Exemple de démonstration
            </Badge>
            <Button
              size="sm"
              className="gap-1.5 h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => navigate("/auth?returnTo=/dashboard/plans/new")}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Générer mes plans
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-3 sm:px-5 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-xl font-bold flex items-center gap-2">
              <PenTool className="h-5 w-5 text-indigo-600" />
              {bienTypeLabel("maison")} — 150 m² · 3 chambres · R+0
            </h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              Exemple de plans générés par le vrai moteur d'intelligence artificielle batibuild App
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
          <span className="flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400 shrink-0">
            <FlaskConical className="h-3.5 w-3.5" />
            Plans de démonstration
          </span>
          Ces plans sont générés automatiquement par le moteur batibuild App à partir d'une maison fictive (Tunis).
          Lancez votre propre génération pour des plans adaptés à votre terrain.
        </div>

        {/* ── Grille de plans ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {featured.map((plan) => (
            <Card key={plan.key} className="group flex flex-col overflow-hidden border border-border/40 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 active:scale-[0.99]">
              <CardContent className="flex items-start justify-between gap-2 p-3 pb-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{plan.name}</p>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> {plan.stats.construite.toFixed(0)} m²</span>
                    <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {plan.stats.nbChambres} ch</span>
                    <span className="flex items-center gap-1"><Bath className="h-3 w-3" /> {plan.stats.nbSdb} sdb</span>
                    <span className="flex items-center gap-1 text-emerald-600"><LayoutGrid className="h-3 w-3" /> {plan.stats.tauxUtilisation}% util.</span>
                  </div>
                </div>
                <Badge className="bg-violet-600/90 text-white border-0 text-[9px] gap-0.5 shrink-0">
                  <Gauge className="h-2.5 w-2.5" /> {plan.scores.global}/100
                </Badge>
              </CardContent>

              {/* Image du plan — ratio carré, pleine largeur, sans déformation */}
              <div className="relative aspect-square w-full overflow-hidden bg-white dark:bg-slate-100/90">
                <div className="absolute inset-0 flex items-center justify-center">
                  <FloorPlan2D plan={plan} compact showDimensions={false} fit />
                </div>
              </div>

              <CardContent className="p-3 mt-auto">
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    size="sm"
                    className="h-10 sm:h-8 text-[10px] sm:text-[11px] gap-1 px-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => setViewerIndex(plan.index - 1)}
                    title="Voir le plan en plein écran"
                    aria-label={`Voir le plan ${plan.index}`}
                  >
                    <Eye className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Voir le plan</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 sm:h-8 text-[10px] sm:text-[11px] gap-1 px-1"
                    onClick={() => downloadPdf(plan)}
                    disabled={downloading === plan.key}
                    title="Télécharger en PDF (haute résolution)"
                    aria-label={`Télécharger le plan ${plan.index} en PDF`}
                  >
                    {downloading === plan.key ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <FileText className="h-3.5 w-3.5 shrink-0" />} <span className="truncate">PDF</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── CTA ── */}
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-transparent p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm sm:text-base font-semibold">Envie de plans pour votre terrain ?</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              10 variantes générées en quelques secondes, avec scores IA, fiche technique et export PDF net.
            </p>
          </div>
          <Button size="sm" className="gap-1.5 h-9 sm:h-10 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0" onClick={() => navigate("/auth?returnTo=/dashboard/plans/new")}>
            <Sparkles className="h-4 w-4" />
            Générer mes plans gratuitement
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Visionneuse plein écran */}
      {viewerIndex !== null && plans[viewerIndex] && (
        <PlanViewerModal
          plan={plans[viewerIndex]}
          plans={plans}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          open
          onClose={() => setViewerIndex(null)}
          request={DEMO_REQUEST}
          bim={null}
        />
      )}
    </main>
  );
}
