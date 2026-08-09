import { useState, useCallback, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X, Download, FileImage, FileText, FileArchive, Loader2,
  ZoomIn, ZoomOut, Maximize2, RefreshCw, ChevronLeft, ChevronRight,
  Box, LayoutGrid, AlertTriangle, Star, StarOff, Gauge, ClipboardList,
} from "lucide-react";
import type { GeneratedPlan, PlanRequest } from "@/convex/planEngine";
import { FloorPlanView } from "@/components/plans/FloorPlanView";
import { PlanSheetModal } from "@/components/plans/PlanSheetModal";
import { exportPlanImage, exportPlanPdf } from "@/lib/planExport";
import type { PlanBimResult } from "@/lib/planSheet";
import { toast } from "sonner";

const DISCLAIMER =
  "Plan généré automatiquement par Intelligence Artificielle à titre indicatif. Ce plan ne constitue pas un document architectural ou administratif officiel. Il doit être vérifié, adapté et validé par un architecte ou un professionnel habilité avant toute réalisation ou utilisation administrative.";

export function PlanViewerModal({
  plan,
  plans,
  index,
  onIndexChange,
  open,
  onClose,
  favorite,
  onToggleFavorite,
  onOpenEdit,
  request,
  bim,
}: {
  plan: GeneratedPlan;
  plans: GeneratedPlan[];
  index: number;
  onIndexChange: (i: number) => void;
  open: boolean;
  onClose: () => void;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  onOpenEdit?: () => void;
  request?: PlanRequest | null;
  bim?: PlanBimResult | null;
}) {
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ sx: 0, sy: 0, px: 0, py: 0 });
  const [downloading, setDownloading] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [index, open, mode]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((z) => Math.min(5, Math.max(0.5, z * factor)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setPan({
      x: dragRef.current.px + (e.clientX - dragRef.current.sx),
      y: dragRef.current.py + (e.clientY - dragRef.current.sy),
    });
  };
  const onPointerUp = () => setDragging(false);

  const download = async (format: "png" | "jpg") => {
    setDownloading(format);
    try {
      await exportPlanImage(plan, { format, scale: 2.5 });
      toast.success(`Plan téléchargé en ${format.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err?.message || "Échec du téléchargement");
    } finally {
      setDownloading(null);
    }
  };

  const downloadPdf = async () => {
    setDownloading("pdf");
    try {
      await exportPlanPdf(plan);
      toast.success("PDF haute résolution téléchargé");
    } catch (err: any) {
      toast.error(err?.message || "Échec du PDF");
    } finally {
      setDownloading(null);
    }
  };

  const stats = plan.stats;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[98vw] h-[94vh] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogTitle className="sr-only">
          Plan {String(plan.index).padStart(2, "0")} — {plan.name}
        </DialogTitle>

        {/* Barre supérieure */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                Plan {String(plan.index).padStart(2, "0")} — {plan.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {stats.construite.toFixed(0)} m² · {plan.levels} niveau{plan.levels > 1 ? "x" : ""} · Score IA {plan.scores.global}/100
              </p>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex gap-1 text-[9px]">
              <Gauge className="h-3 w-3" /> {plan.scores.global}/100
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "2d" | "3d")} className="hidden sm:block">
              <TabsList className="h-8">
                <TabsTrigger value="2d" className="h-7 px-2.5 text-xs gap-1"><LayoutGrid className="h-3.5 w-3.5" />2D</TabsTrigger>
                <TabsTrigger value="3d" className="h-7 px-2.5 text-xs gap-1"><Box className="h-3.5 w-3.5" />3D</TabsTrigger>
              </TabsList>
            </Tabs>
            {onToggleFavorite && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleFavorite} title="Favori">
                {favorite ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : <StarOff className="h-4 w-4 text-muted-foreground" />}
              </Button>
            )}
            {onOpenEdit && (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onOpenEdit}>
                <RefreshCw className="h-3.5 w-3.5" /> Modifier
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setSheetOpen(true)}>
              <ClipboardList className="h-3.5 w-3.5" /> Fiche
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={downloadPdf} disabled={downloading === "pdf"}>
              {downloading === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} PDF
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => download("png")} disabled={!!downloading}>
              {downloading === "png" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} PNG
            </Button>
          </div>
        </div>

        {/* Zone de visualisation avec zoom / pan */}
        <div
          className="relative flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950/60"
          onWheel={handleWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
          >
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: dragging ? "none" : "transform 0.08s ease-out" }} className="max-w-[92%] max-h-[92%]">
              <FloorPlanView plan={plan} mode={mode} showDimensions whiteBg />
            </div>
          </div>

          {/* Contrôles zoom */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
            <Button variant="secondary" size="icon" className="h-8 w-8 shadow-md" onClick={() => setZoom((z) => Math.min(5, z * 1.3))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="h-8 w-8 shadow-md" onClick={() => setZoom((z) => Math.max(0.5, z / 1.3))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="h-8 w-8 shadow-md" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation entre plans */}
          <Button
            variant="secondary" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 shadow-md"
            onClick={() => onIndexChange((index - 2 + plans.length) % plans.length)}
            disabled={plans.length < 2}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 shadow-md"
            onClick={() => onIndexChange(index % plans.length)}
            disabled={plans.length < 2}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <Badge variant="secondary" className="shadow-md text-[10px]">
              {index + 1} / {plans.length}
            </Badge>
          </div>

          {/* Bandeau d'avertissement */}
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-auto sm:max-w-xl sm:mx-auto flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50/95 dark:bg-amber-950/85 px-3 py-2 shadow-lg">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[9px] sm:text-[10px] leading-snug text-amber-800 dark:text-amber-200">
              {DISCLAIMER}
            </p>
          </div>
        </div>

        {/* Fiche descriptive */}
        {sheetOpen && (
          <PlanSheetModal
            plan={plan}
            request={request ?? null}
            bim={bim ?? null}
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
          />
        )}

        {/* Panneau de stats rapide */}
        <div className="shrink-0 border-t border-border/40 px-4 py-2.5 flex items-center gap-3 sm:gap-5 overflow-x-auto scrollbar-none text-[10px] sm:text-xs">
          <span className="text-muted-foreground shrink-0">Surface utile <strong className="text-foreground">{stats.utile.toFixed(0)} m²</strong></span>
          <span className="text-muted-foreground shrink-0">Circulation <strong className="text-foreground">{stats.circulation.toFixed(0)} m²</strong></span>
          <span className="text-muted-foreground shrink-0">Chambres <strong className="text-foreground">{stats.nbChambres}</strong></span>
          <span className="text-muted-foreground shrink-0">SDB <strong className="text-foreground">{stats.nbSdb}</strong></span>
          <span className="text-muted-foreground shrink-0">WC <strong className="text-foreground">{stats.nbWc}</strong></span>
          <span className="text-muted-foreground shrink-0">Pièces <strong className="text-foreground">{stats.nbPieces}</strong></span>
          <span className="text-muted-foreground shrink-0">Taux utilisation <strong className="text-emerald-600">{stats.tauxUtilisation}%</strong></span>
          <span className="ml-auto hidden sm:flex items-center gap-1 text-muted-foreground shrink-0">
            <FileArchive className="h-3.5 w-3.5" />
            JPG / PNG / PDF / ZIP disponibles
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

