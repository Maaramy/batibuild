import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Boxes,
  Building2,
  Compass,
  Info,
  Layers3,
  Lightbulb,
  Loader2,
  Ruler,
  Sparkles,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { projectTypeLabel, inferFloorsFromCategory } from "@/convex/projectTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  generateFloorPlans,
  summarizeSurfaces,
  VARIANTS_PER_PROJECT,
} from "@/lib/floorPlanEngine";
import type { FloorPlan, FloorPlanVariant } from "@/lib/floorPlanEngine";
import { FloorPlan2D } from "@/components/floorplan/FloorPlan2D";
import { FloorPlan3D } from "@/components/floorplan/FloorPlan3D";
import { usePageSEO } from "@/hooks/use-page-seo";
import { cn } from "@/lib/utils";

/** Durée fixe de l'écran de chargement : 3 secondes. */
const LOADING_DURATION_MS = 3000;

const LOADING_STEPS = [
  "Analyse des caractéristiques du projet…",
  "Génération des variantes architecturales…",
  "Validation spatiale (surfaces, circulation, structure)…",
];

export default function PlanGenerator() {
  usePageSEO({
    title: "Plans d'architecte IA - batibuild App",
    description:
      "10 variantes de plans d'architecte 2D et 3D générées par IA pour votre projet de construction en Tunisie.",
  });
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── Écran de chargement fixe (3 s) avant affichage des résultats ──
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / LOADING_DURATION_MS) * 100);
      setProgress(pct);
      setStepIdx(Math.min(LOADING_STEPS.length - 1, Math.floor((pct / 100) * LOADING_STEPS.length)));
    }, 50);
    const timer = setTimeout(() => {
      setLoading(false);
      clearInterval(tick);
    }, LOADING_DURATION_MS);
    return () => {
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, []);

  const project = useQuery(
    api.projects.getProject,
    loading || !id ? "skip" : { projectId: id as any },
  );

  // ── Génération des 10 variantes (déterministe) ──
  const allVariants: FloorPlanVariant[] = useMemo(() => {
    if (!project) return [];
    return generateFloorPlans({
      category: project.category as string,
      surface: project.surface ?? 120,
      floors: Math.max(1, Math.min(4, project.floors ?? inferFloorsFromCategory(project.category))),
      bedrooms: project.bedrooms ?? undefined,
      bathrooms: project.bathrooms ?? undefined,
      kitchens: project.kitchens ?? undefined,
      livingRooms: project.livingRooms ?? undefined,
      wcs: project.wcs ?? undefined,
    });
  }, [project]);

  const variants = allVariants;
  const bestScore = useMemo(
    () => Math.max(0, ...variants.map((v) => v.validation.score)),
    [variants],
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/20 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => navigate(`/dashboard/project/${id}`)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-border/50 shrink-0" />
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/10 text-violet-600 shrink-0">
              <Boxes className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight truncate">
                Plans d'architecte IA
              </h1>
              <p className="text-[9px] text-muted-foreground leading-tight truncate">
                {VARIANTS_PER_PROJECT} variantes 2D / 3D · Validation spatiale automatique
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-5 space-y-5">
        {/* ── Écran de chargement (3 secondes) ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-violet-500/10 animate-ping" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/10 border border-violet-500/30">
                <Loader2 className="h-9 w-9 animate-spin text-violet-600" />
              </div>
            </div>
            <h2 className="text-lg font-bold tracking-tight">
              Génération des plans d'architecte…
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Le moteur spatial compose, valide et note chaque variante avant affichage.
            </p>
            <div className="w-full max-w-sm mt-6 space-y-2">
              <Progress value={progress} className="h-1.5" />
              <motion.p
                key={stepIdx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5"
              >
                <Sparkles className="h-3 w-3 text-violet-500" />
                {LOADING_STEPS[stepIdx]}
              </motion.p>
            </div>
          </div>
        ) : !project ? (
          /* ── Projet introuvable ── */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Info className="h-8 w-8 text-muted-foreground mb-3" />
            <h2 className="text-base font-semibold">Projet introuvable</h2>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Ce projet n'existe pas ou n'est pas accessible.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Retour au tableau de bord
            </Button>
          </div>
        ) : (
          <>
            {/* ── Bandeau synthèse projet ── */}
            <Card className="border-primary/15 bg-gradient-to-r from-violet-500/[0.05] to-transparent">
              <CardContent className="py-4 px-4 sm:px-5 flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight truncate">{project.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {projectTypeLabel(project.category as string)}
                    </p>
                  </div>
                </div>
                <SynthStat icon={Ruler} label="Surface" value={`${project.surface ?? 120} m²`} />
                <SynthStat icon={Layers3} label="Niveaux" value={`${Math.max(1, project.floors ?? 1)}`} />
                <SynthStat icon={Compass} label="Variantes" value={`${variants.length}`} />
                <SynthStat
                  icon={BadgeCheck}
                  label="Meilleure note"
                  value={`${bestScore}/100`}
                  highlight={bestScore >= 90}
                />
              </CardContent>
            </Card>

            {/* ── Grille des variantes ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {variants.map((variant, i) => (
                <VariantCard key={variant.id} variant={variant} index={i} />
              ))}
            </div>

            <p className="text-center text-[10px] text-muted-foreground/60 pt-2">
              Plans générés algorithmiquement à titre indicatif — validation par un architecte
              inscrit à l'ordre requise avant dépôt du permis de bâtir.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

// ── Sous-composants ─────────────────────────────────────────────────────────

function SynthStat({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", highlight ? "text-emerald-600" : "text-muted-foreground")} />
      <div className="leading-tight">
        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={cn("text-xs font-semibold tabular-nums", highlight && "text-emerald-600")}>
          {value}
        </p>
      </div>
    </div>
  );
}

function VariantCard({ variant, index }: { variant: FloorPlanVariant; index: number }) {
  const [floorIdx, setFloorIdx] = useState(0);
  const [view, setView] = useState<"2d" | "3d">("2d");
  const floor: FloorPlan = variant.floors[Math.min(floorIdx, variant.floors.length - 1)];
  const surfaces = useMemo(() => summarizeSurfaces(floor), [floor]);
  const v = variant.validation;

  const scoreColor =
    v.score >= 90
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
      : v.score >= 75
        ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
        : "bg-red-500/10 text-red-600 border-red-500/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-sm font-bold tracking-tight">{variant.name}</CardTitle>
            <Badge variant="outline" className={cn("text-[10px] shrink-0", scoreColor)}>
              Note {v.score}/100
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
            <span>
              Emprise{" "}
              <span className="font-medium text-foreground tabular-nums">
                {variant.footprint.length.toFixed(1)} × {variant.footprint.width.toFixed(1)} m
              </span>
            </span>
            <span>
              Surface totale{" "}
              <span className="font-medium text-foreground tabular-nums">
                {variant.totalArea.toFixed(1)} m²
              </span>
            </span>
            <span>
              Niveaux{" "}
              <span className="font-medium text-foreground tabular-nums">{variant.floors.length}</span>
            </span>
          </div>
        </CardHeader>

        <CardContent className="px-4 space-y-3">
          {/* Sélecteur de vue + niveau */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Tabs value={view} onValueChange={(val) => setView(val as "2d" | "3d")}>
              <TabsList className="h-7">
                <TabsTrigger value="2d" className="text-[11px] h-6 px-2.5">Plan 2D</TabsTrigger>
                <TabsTrigger value="3d" className="text-[11px] h-6 px-2.5">Vue 3D</TabsTrigger>
              </TabsList>
            </Tabs>
            {variant.floors.length > 1 && (
              <div className="flex items-center gap-1">
                {variant.floors.map((f) => (
                  <button
                    key={f.level}
                    onClick={() => setFloorIdx(f.level)}
                    className={cn(
                      "h-6 px-2 rounded-md text-[10px] font-medium border transition-colors cursor-pointer",
                      f.level === floorIdx
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40",
                    )}
                  >
                    {f.level === 0 ? "RDC" : `N${f.level}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Plan 2D ou 3D */}
          {view === "2d" ? (
            <FloorPlan2D plan={floor} />
          ) : (
            <FloorPlan3D plan={floor} />
          )}

          {/* Fiche technique : tableau des surfaces */}
          <div className="rounded-lg border overflow-hidden">
            <div className="px-3 py-1.5 bg-muted/50 flex items-center gap-1.5">
              <Ruler className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Tableau des surfaces · {floor.level === 0 ? "Rez-de-chaussée" : `Niveau ${floor.level}`}
              </span>
            </div>
            <table className="w-full text-[11px]">
              <tbody>
                {surfaces.map((s) => (
                  <tr key={s.label} className="border-t border-border/50">
                    <td className="px-3 py-1.5">{s.label}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-medium w-20">
                      {s.area.toFixed(1)} m²
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground w-14">
                      {s.sharePct}%
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border bg-muted/30">
                  <td className="px-3 py-1.5 font-semibold">Total niveau</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-bold">
                    {floor.area.toFixed(1)} m²
                  </td>
                  <td className="px-3 py-1.5" />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Note conceptuelle */}
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.04] px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Lightbulb className="h-3 w-3 text-violet-600" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600">
                Note conceptuelle IA
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{variant.conceptNote}</p>
          </div>

          {/* Validation spatiale */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { ok: v.dimensionsOk, label: "Dimensions" },
              { ok: v.noOverlap, label: "Sans chevauchement" },
              { ok: v.areasOk, label: "Surfaces cohérentes" },
              { ok: v.circulationOk, label: "Circulation" },
              { ok: v.structureOk, label: "Structure continue" },
            ].map((c) => (
              <span
                key={c.label}
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-medium",
                  c.ok
                    ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-600"
                    : "border-red-500/25 bg-red-500/[0.06] text-red-600",
                )}
              >
                {c.ok ? "✓" : "✕"} {c.label}
              </span>
            ))}
          </div>
          {v.issues.length > 0 && (
            <ul className="text-[10px] text-muted-foreground list-disc pl-4 space-y-0.5">
              {v.issues.slice(0, 4).map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
