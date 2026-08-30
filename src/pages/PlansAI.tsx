import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Grid3x3, Box, Sparkles, Ruler, Layers, Building2 } from "lucide-react";
import { generateFloorPlanVariants, type PlanVariant } from "@/lib/floorPlanEngine";
import { ROOM_COLORS, ROOM_ICONS } from "@/lib/floorPlanEngine";
import { FloorPlan2D } from "@/components/floorplan/FloorPlan2D";
import { FloorPlan3D } from "@/components/floorplan/FloorPlan3D";

const LOADING_DURATION = 3000;

export default function PlansAI() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const project = useQuery(api.projects.getProject, { projectId: projectId as any });

  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");

  // Generate variants from project data
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

  const currentVariant = variants[selectedVariant];

  // Loading timer
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setLoading(false), LOADING_DURATION);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  // ── Loading screen ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="h-24 w-24 rounded-full border-4 border-muted animate-pulse" />
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
          <Sparkles className="absolute inset-0 m-auto h-10 w-10 text-primary animate-bounce" />
        </motion.div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Génération des plans architecturaux</h2>
          <p className="text-sm text-muted-foreground">
            L'IA analyse vos paramètres et crée 10 variantes optimisées…
          </p>
        </div>
        <motion.div
          className="w-48 h-1.5 rounded-full bg-muted overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: LOADING_DURATION / 1000, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
    );
  }

  // ── Results view ──
  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/30 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm sm:text-base font-bold tracking-tight truncate">
            Plans architecturaux IA
          </h1>
          <p className="text-[11px] text-muted-foreground truncate">
            {project.surface ?? 150} m² · {project.floors ?? 1} niveau{(project.floors ?? 1) > 1 ? "x" : ""} · {variants.length} variantes
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant={viewMode === "2d" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("2d")}
            className="gap-1.5 h-8 text-xs"
          >
            <Grid3x3 className="h-3.5 w-3.5" />
            2D
          </Button>
          <Button
            variant={viewMode === "3d" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("3d")}
            className="gap-1.5 h-8 text-xs"
          >
            <Box className="h-3.5 w-3.5" />
            3D
          </Button>
        </div>
      </div>

      {/* Variant selector strip */}
      <div className="px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {variants.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setSelectedVariant(i)}
              className={`shrink-0 rounded-xl border-2 px-3 py-2 text-xs font-semibold transition-all ${
                i === selectedVariant
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/40 hover:border-primary/40 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span>Plan {i + 1}</span>
                <Badge
                  variant={v.score >= 85 ? "default" : v.score >= 70 ? "secondary" : "outline"}
                  className="text-[9px] px-1.5 py-0"
                >
                  {v.score}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main plan view */}
      <AnimatePresence mode="wait">
        {currentVariant && (
          <motion.div
            key={`${currentVariant.id}-${viewMode}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="px-4"
          >
            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              {viewMode === "2d" ? (
                <div className="p-4 flex justify-center bg-white">
                  <FloorPlan2D variant={currentVariant} width={520} height={420} />
                </div>
              ) : (
                <div className="flex justify-center bg-white">
                  <FloorPlan3D variant={currentVariant} width={520} height={420} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fiche technique */}
      {currentVariant && (
        <div className="px-4 space-y-3">
          {/* Dimensions */}
          <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
              <Ruler className="h-4 w-4 text-primary" />
              Dimensions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <StatCard label="Longueur" value={`${currentVariant.length.toFixed(1)} m`} />
              <StatCard label="Largeur" value={`${currentVariant.width.toFixed(1)} m`} />
              <StatCard label="Surface/niveau" value={`${currentVariant.levelSurface} m²`} />
              <StatCard label="Niveaux" value={`${currentVariant.totalLevels}`} />
            </div>
          </div>

          {/* Tableau des surfaces */}
          <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Tableau des surfaces
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
                  {currentVariant.rooms
                    .sort((a, b) => b.area - a.area)
                    .map((room) => (
                      <tr key={room.id} className="border-b border-border/20 last:border-0">
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-sm shrink-0"
                              style={{ backgroundColor: ROOM_COLORS[room.kind] ?? "#e5e5e5" }}
                            />
                            <span>{room.label}</span>
                          </div>
                        </td>
                        <td className="text-right py-2 px-3 font-mono tabular-nums">
                          {room.area.toFixed(1)} m²
                        </td>
                        <td className="text-right py-2 pl-3 font-mono tabular-nums text-muted-foreground">
                          {currentVariant.totalArea > 0
                            ? ((room.area / currentVariant.totalArea) * 100).toFixed(1)
                            : "0"}%
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border/40 font-semibold">
                    <td className="py-2 pr-3">Total</td>
                    <td className="text-right py-2 px-3 font-mono tabular-nums">
                      {currentVariant.totalArea.toFixed(1)} m²
                    </td>
                    <td className="text-right py-2 pl-3">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Note conceptuelle IA */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              Note conceptuelle IA
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {currentVariant.description}
            </p>
          </div>

          {/* Score */}
          <div className="rounded-xl border border-border/40 bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Score qualité du plan</span>
              <Badge
                variant={currentVariant.score >= 85 ? "default" : currentVariant.score >= 70 ? "secondary" : "outline"}
                className="text-xs"
              >
                {currentVariant.score}/100
              </Badge>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                initial={{ width: 0 }}
                animate={{ width: `${currentVariant.score}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}
