import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowLeft, Grid3x3, Box, Sparkles, Ruler, Layers, Download, ShieldCheck, ShieldAlert,
} from "lucide-react";
import { generateFloorPlanVariants, ROOM_COLORS } from "@/lib/floorPlanEngine";
import { FloorPlan2D } from "@/components/floorplan/FloorPlan2D";
import { FloorPlan3D } from "@/components/floorplan/FloorPlan3D";
import { exportPlanToPdf } from "@/lib/planPdfExport";
import { toast } from "sonner";

const LOADING_DURATION = 3000;

export default function PlansAI() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const project = useQuery(api.projects.getProject, { projectId: projectId as any });

  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [exporting, setExporting] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const variants = useMemo(() => {
    if (!project) return [];
    return generateFloorPlanVariants({
      category: project.category ?? "maison",
      surface: project.surface ?? 150,
      floors: project.floors,
      bedrooms: project.bedrooms,
      bathrooms: project.bathrooms,
      kitchens: project.kitchens,
      livingRooms: project.livingRooms,
    });
  }, [project]);

  const current = variants[selected];

  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => setLoading(false), LOADING_DURATION);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const handleExportPdf = async () => {
    if (!current || !svgRef.current) return;
    setExporting(true);
    try {
      await exportPlanToPdf(current, svgRef.current);
      toast.success("PDF exporté avec succès");
    } catch {
      toast.error("Erreur lors de l'export PDF");
    } finally {
      setExporting(false);
    }
  };

  if (!project) {
    return <div className="flex items-center justify-center h-64"><Spinner className="h-8 w-8 text-muted-foreground" /></div>;
  }

  // ── Loader (3s exact) ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }} className="relative">
          <div className="h-24 w-24 rounded-full border-4 border-muted animate-pulse" />
          <motion.div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
            animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
          <Sparkles className="absolute inset-0 m-auto h-10 w-10 text-primary animate-bounce" />
        </motion.div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Génération des plans architecturaux</h2>
          <p className="text-sm text-muted-foreground">L'IA analyse vos paramètres et crée 10 variantes optimisées…</p>
        </div>
        <div className="w-48 h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div className="h-full bg-primary rounded-full" initial={{ width: "0%" }} animate={{ width: "100%" }}
            transition={{ duration: LOADING_DURATION / 1000, ease: "easeInOut" }} />
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/30 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm sm:text-base font-bold tracking-tight truncate">Plans architecturaux IA</h1>
          <p className="text-[11px] text-muted-foreground truncate">
            {project.surface ?? 150} m² · {project.floors ?? 1} niveau{(project.floors ?? 1) > 1 ? "x" : ""} · {variants.length} variantes
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant={viewMode === "2d" ? "default" : "outline"} size="sm"
            onClick={() => setViewMode("2d")} className="gap-1.5 h-8 text-xs">
            <Grid3x3 className="h-3.5 w-3.5" /> 2D
          </Button>
          <Button variant={viewMode === "3d" ? "default" : "outline"} size="sm"
            onClick={() => setViewMode("3d")} className="gap-1.5 h-8 text-xs">
            <Box className="h-3.5 w-3.5" /> 3D
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting}
            className="gap-1.5 h-8 text-xs">
            <Download className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Variant selector */}
      <div className="px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {variants.map((v, i) => (
            <button key={v.id} onClick={() => setSelected(i)}
              className={`shrink-0 rounded-xl border-2 px-3 py-2 text-xs font-semibold transition-all ${
                i === selected ? "border-primary bg-primary/10 text-primary" : "border-border/40 hover:border-primary/40 text-muted-foreground"
              }`}>
              <div className="flex items-center gap-1.5">
                <span>Plan {i + 1}</span>
                <Badge variant={v.score >= 85 ? "default" : v.score >= 70 ? "secondary" : "outline"}
                  className="text-[9px] px-1.5 py-0">{v.score}</Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Plan view */}
      <AnimatePresence mode="wait">
        {current && (
          <motion.div key={`${current.id}-${viewMode}`} initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }} className="px-4">
            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              {viewMode === "2d" ? (
                <div className="p-4 flex justify-center bg-white">
                  <div ref={(el) => {
                    if (el) { const svg = el.querySelector("svg"); if (svg) svgRef.current = svg as unknown as SVGSVGElement; }
                  }}>
                    <FloorPlan2D variant={current} width={520} height={420} />
                  </div>
                </div>
              ) : (
                <div className="flex justify-center bg-white">
                  <FloorPlan3D variant={current} width={520} height={420} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fiche technique */}
      {current && (
        <div className="px-4 space-y-3">
          {/* Validation badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <ValidationBadge ok={current.validation.noOverlap} label="Sans chevauchement" />
            <ValidationBadge ok={current.validation.areaSumOk} label="Somme surfaces" />
            <ValidationBadge ok={current.validation.connectivityOk} label="Connexité" />
            <ValidationBadge ok={current.validation.multiLevelAligned} label="Multi-niveaux" />
          </div>

          {/* Dimensions */}
          <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
              <Ruler className="h-4 w-4 text-primary" /> Dimensions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <Stat label="Longueur" value={`${current.length.toFixed(1)} m`} />
              <Stat label="Largeur" value={`${current.width.toFixed(1)} m`} />
              <Stat label="Surface/niveau" value={`${current.levelSurface} m²`} />
              <Stat label="Niveaux" value={`${current.totalLevels}`} />
            </div>
          </div>

          {/* Surface table */}
          <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Tableau des surfaces
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">Pièce</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Surface</th>
                    <th className="text-right py-2 pl-3 font-semibold text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody>
                  {[...current.rooms].sort((a, b) => b.area - a.area).map((r) => (
                    <tr key={r.id} className="border-b border-border/20 last:border-0">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: ROOM_COLORS[r.kind] ?? "#e5e5e5" }} />
                          <span>{r.label}</span>
                        </div>
                      </td>
                      <td className="text-right py-2 px-3 font-mono tabular-nums">{r.area.toFixed(1)} m²</td>
                      <td className="text-right py-2 pl-3 font-mono tabular-nums text-muted-foreground">
                        {current.totalArea > 0 ? ((r.area / current.totalArea) * 100).toFixed(1) : "0"}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border/40 font-semibold">
                    <td className="py-2 pr-3">Total</td>
                    <td className="text-right py-2 px-3 font-mono tabular-nums">{current.totalArea.toFixed(1)} m²</td>
                    <td className="text-right py-2 pl-3">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* AI note */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" /> Note conceptuelle IA
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">{current.description}</p>
          </div>

          {/* Score */}
          <div className="rounded-xl border border-border/40 bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Score qualité du plan</span>
              <Badge variant={current.score >= 85 ? "default" : current.score >= 70 ? "secondary" : "outline"} className="text-xs">
                {current.score}/100
              </Badge>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                initial={{ width: 0 }} animate={{ width: `${current.score}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}

function ValidationBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium ${
      ok ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
         : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
    }`}>
      {ok ? <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> : <ShieldAlert className="h-3.5 w-3.5 shrink-0" />}
      <span className="truncate">{label}</span>
    </div>
  );
}
