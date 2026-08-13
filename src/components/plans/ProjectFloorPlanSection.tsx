import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Sparkles, RefreshCw, Ruler, Gauge, TriangleAlert, Info,
  LayoutGrid, ClipboardList, ThumbsUp, ThumbsDown, Check, X, Loader2,
  DoorOpen, Wind, Layers3, Maximize2, Box, Download, Building2,
  ChevronDown, Boxes, Footprints, Layers, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generatePlans,
  bienTypeLabel,
  type PlanRequest,
  type GeneratedPlan,
} from "@/convex/planEngine";
import { FloorPlan2D, FloorPlan3D } from "@/components/plans/FloorPlanView";
import { exportPlanPdf } from "@/lib/planExport";

// ============================================================================
// Moteur de génération de plans architecturaux dans la page résultat de
// construction.
//
// À partir des caractéristiques du projet (catégorie, surface, niveaux,
// chambres, salles de bain, cuisines, salons, garages, description…), le
// moteur procédural `planEngine` génère 10 variantes de Floor Plans 2D
// cohérentes, dans le respect des dimensions saisies. Chaque plan est vérifié
// automatiquement (surfaces, proportions, circulation, portes & fenêtres,
// chevauchements, murs, accessibilité, niveaux, utilisation de la surface) et
// accompagné d'une fiche descriptive : composition des pièces en m² +
// description architecturale générée par l'IA.
// ============================================================================

// ─── Types de projet éligibles à un plan d'aménagement intérieur ────────────

const PLAN_CAPABLE_CATEGORIES = new Set([
  "maison", "maison_r+1", "villa", "appartement", "studio", "duplex",
  "immeuble", "immeuble_residentiel", "local_commercial", "bureau",
  "entrepot", "residence_touristique", "projet_neuf",
  "hotel", "restaurant", "cafe", "atelier", "usine", "depot", "ferme",
  "ecole", "mosquee", "serre_agricole",
  "renovation_interieure", "renovation_exterieure",
  "renovation_salle_de_bain", "renovation_cuisine", "renovation_facade",
]);

export function isPlanCapableCategory(category?: string): boolean {
  return !!category && PLAN_CAPABLE_CATEGORIES.has(category);
}

// ─── Construction de la requête du moteur à partir du projet ────────────────

export interface ProjectPlanSource {
  category?: string;
  surface?: number;
  surfaceTotale?: number;
  floors?: number;
  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  livingRooms?: number;
  garages?: number;
  wcs?: number;
  description?: string;
}

function roundInt(n: number): number {
  return Math.round(n);
}

export function buildPlanRequest(project: ProjectPlanSource): PlanRequest | null {
  const surface = project.surface && project.surface > 0 ? project.surface : 100;
  if (!surface || surface <= 0) return null;
  const floors = Math.max(1, Math.min(3, roundInt(project.floors ?? 1)));
  const bedrooms = Math.max(
    1,
    Math.min(10, roundInt(project.bedrooms ?? (surface >= 210 ? 4 : surface >= 135 ? 3 : surface >= 80 ? 2 : 1))),
  );
  const bathrooms = Math.max(1, Math.min(6, roundInt(project.bathrooms ?? (floors > 1 ? 2 : 1))));
  return {
    bienType: project.category ?? "maison",
    // Surface totale du terrain : saisie par l'utilisateur (champ obligatoire)
    // ou estimée à partir de la surface couverte (emprise + reculs).
    surfaceTotale: project.surfaceTotale && project.surfaceTotale > 0
      ? roundInt(project.surfaceTotale)
      : roundInt(surface * 2.4 + 80),
    surfaceCouverte: roundInt(surface),
    floors,
    bedrooms,
    bathrooms,
    wcs: Math.max(0, Math.min(6, roundInt(project.wcs ?? 1))),
    hasSalon: (project.livingRooms ?? 1) > 0,
    hasSalleAManger: true,
    hasCuisine: (project.kitchens ?? 1) > 0,
    hasBuanderie: true,
    hasDressing: false,
    hasBureau: false,
    hasLocalTechnique: false,
    hasGarage: (project.garages ?? 0) > 0,
    hasParking: false,
    hasTerrasse: true,
    hasBalcon: floors > 1,
    hasJardin: true,
    hasPiscine: false,
    orientation: "sud",
    entreePosition: "sud",
    facades: 2,
    standing: "standard",
    style: "moderne",
    exigences: project.description
      ? `Projet de construction : ${project.description}`
      : undefined,
  };
}

// ─── Libellés ───────────────────────────────────────────────────────────────

const ROOM_LABELS: Record<string, string> = {
  salon: "Salon",
  salleAManger: "Salle à manger",
  cuisine: "Cuisine",
  chambre: "Chambre",
  master: "Chambre principale",
  sdb: "Salle de bain",
  wc: "WC",
  buanderie: "Buanderie",
  dressing: "Espace séchage",
  bureau: "Bureau",
  localTechnique: "Local technique",
  escalier: "Escalier",
  circulation: "Entrée & circulation",
  entree: "Entrée",
  garage: "Garage",
  parking: "Parking",
  terrasse: "Terrasse",
  balcon: "Balcon",
  jardin: "Jardin",
  piscine: "Piscine",
};

const LEVEL_LABELS: Record<number, string> = {
  0: "RDC",
  1: "Étage 1",
  2: "Étage 2",
};

const CHECK_LABELS: Record<string, { label: string; icon: any }> = {
  surface: { label: "Cohérence surface totale / pièces", icon: Ruler },
  dimensions: { label: "Compatibilité longueur / largeur", icon: Maximize2 },
  circulation: { label: "Circulation entre les pièces", icon: Footprints },
  portes: { label: "Position logique des portes", icon: DoorOpen },
  fenetres: { label: "Position logique des fenêtres", icon: Wind },
  chevauchement: { label: "Absence de chevauchement", icon: Layers },
  murs: { label: "Cohérence des murs et cloisons", icon: Box },
  acces: { label: "Accessibilité des espaces", icon: DoorOpen },
  niveaux: { label: "Compatibilité entre les niveaux", icon: Layers3 },
  optimisation: { label: "Utilisation optimale de la surface", icon: LayoutGrid },
};

// ─── Vérification automatique du plan ───────────────────────────────────────

type CheckStatus = "ok" | "warning" | "error";

interface AutoCheck {
  key: keyof typeof CHECK_LABELS;
  status: CheckStatus;
  detail: string;
}

const EDGE_EPS = 0.45;

function sharedEdgeLength(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): number {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (Math.abs(a.y + a.h - b.y) < EDGE_EPS || Math.abs(a.y - (b.y + b.h)) < EDGE_EPS) return Math.max(0, ox);
  if (Math.abs(a.x + a.w - b.x) < EDGE_EPS || Math.abs(a.x - (b.x + b.w)) < EDGE_EPS) return Math.max(0, oy);
  return 0;
}

function buildAutoChecks(plan: GeneratedPlan): AutoCheck[] {
  const interior = plan.rooms.filter((r) => !r.exterior && r.type !== "circulation");
  const circ = plan.rooms.find((r) => r.type === "circulation");
  const built = plan.stats.construite || 1;
  const sumRooms = interior.reduce((s, r) => s + r.area, 0);
  const circArea = circ?.area ?? 0;
  const wallLoss = Math.max(0, built - (sumRooms + circArea));
  const gapRatio = wallLoss / built;
  const circRatio = circArea / built;

  const issues = plan.quality?.issues ?? [];
  const byCat = (cat: string) => issues.filter((i) => i.category === cat);
  const anyError = (cat: string) => byCat(cat).some((i) => i.severity === "error");

  // Chevauchements entre pièces
  let overlapCount = 0;
  for (let i = 0; i < plan.rooms.length; i++) {
    for (let j = i + 1; j < plan.rooms.length; j++) {
      const a = plan.rooms[i];
      const b = plan.rooms[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 0.15 && oy > 0.15) overlapCount++;
    }
  }

  // Murs / cloisons : toute pièce intérieure doit partager un bord avec une
  // autre pièce (ou avec le périmètre du bâtiment) — pas de pièce flottante.
  let floating = 0;
  for (const r of interior) {
    const touchesPerimeter =
      r.x <= EDGE_EPS ||
      r.y <= EDGE_EPS ||
      r.x + r.w >= plan.width - EDGE_EPS ||
      r.y + r.h >= plan.depth - EDGE_EPS;
    if (touchesPerimeter) continue;
    const sharesWall = interior.some((o) => o.id !== r.id && sharedEdgeLength(r, o) >= 0.8);
    if (!sharesWall) floating++;
  }

  // Accessibilité : chaque pièce dispose d'une porte
  const noDoor = interior.filter((r) => !plan.doors.some((d) => d.roomId === r.id));

  // Niveaux : un étage habité doit être relié par un escalier
  const upperRooms = plan.rooms.filter((r) => r.level > 0 && !r.exterior);
  const levelsOk = plan.levels <= 1 || plan.stairs.length > 0 || upperRooms.length === 0;

  const doorIssues = byCat("portes");
  const windowIssues = byCat("fenetres");
  const dimIssues = byCat("dimensions");

  const statusOf = (errors: boolean, warns: boolean): CheckStatus =>
    errors ? "error" : warns ? "warning" : "ok";

  return [
    {
      key: "surface",
      status: statusOf(gapRatio > 0.2, gapRatio > 0.12),
      detail: `${sumRooms.toFixed(0)} m² de pièces + ${circArea.toFixed(0)} m² de circulation pour ${built.toFixed(0)} m² construits (${Math.round(gapRatio * 100)}% de perte en murs & gaines)`,
    },
    {
      key: "dimensions",
      status: statusOf(anyError("dimensions"), dimIssues.length > 0),
      detail: `Emprise ${plan.width.toFixed(2)} × ${plan.depth.toFixed(2)} m · ${dimIssues.length > 0 ? `${dimIssues.length} point(s) d'attention sur les proportions` : "proportions fonctionnelles"} `,
    },
    {
      key: "circulation",
      status: statusOf(circRatio > 0.2, circRatio > 0.17),
      detail: `${Math.round(circRatio * 100)}% de la surface en circulation (recommandé 5–17 %) · ${plan.doors.length} accès`,
    },
    {
      key: "portes",
      status: statusOf(anyError("portes"), doorIssues.length > 0),
      detail: `${plan.doors.length} porte(s) positionnée(s) sur les murs de liaison${doorIssues.length > 0 ? ` · ${doorIssues.length} vérification(s) à affiner` : " · battants dégagés"}`,
    },
    {
      key: "fenetres",
      status: statusOf(anyError("fenetres"), windowIssues.length > 0),
      detail: `${plan.windows.length} ouverture(s) extérieure(s)${windowIssues.length > 0 ? ` · ${windowIssues.length} vérification(s) à affiner` : " · éclairage naturel assuré"}`,
    },
    {
      key: "chevauchement",
      status: overlapCount === 0 ? "ok" : "error",
      detail: overlapCount === 0 ? "Aucun chevauchement entre les pièces" : `${overlapCount} zone(s) de chevauchement détectée(s)`,
    },
    {
      key: "murs",
      status: floating === 0 ? "ok" : "warning",
      detail: floating === 0 ? "Cloisons continues : toutes les pièces sont contiguës" : `${floating} pièce(s) sans liaison avec les cloisons`,
    },
    {
      key: "acces",
      status: noDoor.length === 0 ? "ok" : "error",
      detail: noDoor.length === 0 ? "Chaque pièce est desservie par au moins une porte" : `${noDoor.length} pièce(s) sans accès`,
    },
    {
      key: "niveaux",
      status: levelsOk ? "ok" : "warning",
      detail:
        plan.levels > 1
          ? `${plan.levels} niveaux reliés par ${plan.stairs.length} escalier(s)`
          : "Projet plain-pied (1 niveau)",
    },
    {
      key: "optimisation",
      status: plan.stats.tauxUtilisation >= 78 ? "ok" : plan.stats.tauxUtilisation >= 65 ? "warning" : "error",
      detail: `${plan.stats.tauxUtilisation}% de la surface construite est réellement utile`,
    },
  ];
}

// ─── Rendu d'une pièce (table de composition) ───────────────────────────────

function roomDisplayName(room: { name: string; type: string }): string {
  return room.type === "circulation" ? room.name : (ROOM_LABELS[room.type] ?? room.name);
}

// ============================================================================
// Section principale
// ============================================================================

export function ProjectFloorPlanSection({ project }: { project: ProjectPlanSource }) {
  const [seed, setSeed] = useState(2026);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [showChecks, setShowChecks] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const request = useMemo(() => buildPlanRequest(project), [project]);

  // 10 variantes déterministes — triées par score global (meilleure en premier)
  const plans = useMemo(() => {
    if (!request) return [] as GeneratedPlan[];
    const all = generatePlans({ ...request, seed });
    return [...all].sort((a, b) => b.scores.global - a.scores.global);
  }, [request, seed]);

  const plan = plans[Math.min(selectedIdx, plans.length - 1)];
  const checks = useMemo(() => (plan ? buildAutoChecks(plan) : []), [plan]);
  const quality = plan?.quality;

  if (!request || plans.length === 0) {
    return null;
  }

  const handleRegenerate = () => {
    if (generating) return;
    setGenerating(true);
    window.setTimeout(() => {
      setSeed((s) => s + 1);
      setSelectedIdx(0);
      setGenerating(false);
      toast.success("10 nouvelles propositions architecturales générées");
    }, 500);
  };

  const handleDownloadPdf = async () => {
    if (!plan || downloading) return;
    setDownloading(true);
    try {
      await exportPlanPdf(plan);
      toast.success(`Plan ${String(plan.index).padStart(2, "0")} téléchargé (PDF haute résolution)`);
    } catch (e: any) {
      toast.error(e?.message || "Échec de l'export PDF");
    } finally {
      setDownloading(false);
    }
  };

  const interior = plan.rooms.filter((r) => !r.exterior);
  const exteriors = plan.rooms.filter((r) => r.exterior);
  const sumInterior = interior.reduce((s, r) => s + r.area, 0);
  const sumExterior = exteriors.reduce((s, r) => s + r.area, 0);
  const scoreColor =
    !quality ? "text-slate-500" : quality.score >= 85 ? "text-emerald-600" : quality.score >= 60 ? "text-amber-600" : "text-red-600";

  const SCORE_ROWS = [
    { key: "optimisation", label: "Optimisation de l'espace", value: plan.scores.optimisation },
    { key: "fonctionnalite", label: "Fonctionnalité", value: plan.scores.fonctionnalite },
    { key: "confort", label: "Confort", value: plan.scores.confort },
    { key: "architectural", label: "Qualité architecturale", value: plan.scores.architectural },
  ] as const;

  return (
    <motion.div
      variants={{ initial: { opacity: 0, y: 12 }, animate: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.3 } }) }}
      initial="initial"
      animate="animate"
      className="rounded-xl border bg-card shadow-sm overflow-hidden"
    >
      {/* ── En-tête ── */}
      <div className="px-4 py-3 border-b border-border/40 flex flex-wrap items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/10 text-violet-600 shrink-0">
          <LayoutGrid className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-[13px] sm:text-sm font-semibold leading-snug break-words">Générateur de plans architecturaux IA</h3>
            <Badge className="text-[8px] bg-violet-100 text-violet-700 border-violet-200 gap-0.5 shrink-0">
              <Sparkles className="h-2.5 w-2.5" /> Floor Plan
            </Badge>
          </div>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 leading-snug break-words">
            Plans 2D générés automatiquement
            <span className="hidden sm:inline"> à partir des caractéristiques du projet ({bienTypeLabel(project.category ?? "projet")} · {Math.round(project.surface ?? 0)} m² · {plan.levels} niveau{plan.levels > 1 ? "x" : ""})</span>
          </p>
          <p className="sm:hidden text-[9px] text-muted-foreground mt-0.5 truncate max-w-full">
            {bienTypeLabel(project.category ?? "projet")} · {Math.round(project.surface ?? 0)} m² · {plan.levels} niveau{plan.levels > 1 ? "x" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex rounded-lg border border-border/40 overflow-hidden">
            {(["2d", "3d"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={cn(
                  "flex h-7 items-center gap-1 px-2.5 text-[10px] font-semibold transition-colors",
                  viewMode === m ? "bg-violet-600 text-white" : "hover:bg-muted/40 text-muted-foreground",
                )}
              >
                {m === "2d" ? <Box className="h-3 w-3" /> : <Boxes className="h-3 w-3" />}
                {m.toUpperCase()}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-[11px] gap-1 px-2.5"
            onClick={handleRegenerate}
            disabled={generating}
            title="Régénérer 10 nouvelles propositions"
          >
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            <span className="hidden sm:inline">Régénérer</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-[11px] gap-1 px-2.5"
            onClick={handleDownloadPdf}
            disabled={downloading}
            title="Télécharger le plan sélectionné en PDF"
          >
            {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        {/* ── Sélecteur de variantes ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {plans.map((p, i) => (
            <button
              key={`${p.index}-${p.key}-${seed}`}
              onClick={() => setSelectedIdx(i)}
              className={cn(
                "relative shrink-0 w-[104px] rounded-lg border-2 transition-all active:scale-[0.98] overflow-hidden text-left",
                i === selectedIdx
                  ? "border-violet-600/70 ring-1 ring-violet-600/30 shadow-sm"
                  : "border-border/40 hover:border-primary/40",
              )}
              title={`${p.name} — score ${p.scores.global}/100`}
            >
              <div className="aspect-square w-full bg-white dark:bg-slate-100/90">
                <FloorPlan2D plan={p} compact showDimensions={false} fit />
              </div>
              <div className="px-1.5 py-1 flex items-center justify-between gap-1 bg-card/90">
                <span className="text-[8px] font-semibold truncate">Plan {String(p.index).padStart(2, "0")}</span>
                <span className="text-[8px] font-bold text-violet-600 tabular-nums shrink-0">{p.scores.global}</span>
              </div>
              {i === selectedIdx && (
                <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-white">
                  <Check className="h-2.5 w-2.5" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* ── Plan principal ── */}
        <div className="rounded-xl border border-border/40 bg-white dark:bg-slate-100/90 overflow-hidden">
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-border/40 bg-muted/20">
            <Badge className="text-[9px] bg-violet-600/90 text-white border-0">Plan {String(plan.index).padStart(2, "0")}</Badge>
            <span className="text-[11px] font-semibold truncate">{plan.name}</span>
            <span className="ml-auto flex items-center gap-1 text-[9px] text-muted-foreground">
              <Ruler className="h-3 w-3" /> {plan.stats.construite.toFixed(0)} m² · {plan.width.toFixed(2)} × {plan.depth.toFixed(2)} m
            </span>
            <Badge className={cn("text-[9px] border-0", scoreColor, "bg-muted/40")}>
              <ShieldCheck className="h-2.5 w-2.5" /> Qualité {quality?.score ?? "—"}/100
            </Badge>
          </div>
          <div className="p-2 sm:p-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${plan.index}-${plan.key}-${viewMode}-${seed}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {viewMode === "2d" ? (
                  <FloorPlan2D plan={plan} showDimensions />
                ) : (
                  <FloorPlan3D plan={plan} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Fiche descriptive ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Composition des pièces */}
          <div className="rounded-xl border border-border/40 p-3.5 bg-card/40">
            <p className="text-xs font-bold mb-2 flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5 text-violet-500" /> Composition des pièces
              <span className="text-[9px] font-medium text-muted-foreground">({interior.length} pièce{interior.length > 1 ? "s" : ""})</span>
            </p>
            <div className="rounded-lg border border-border/40 overflow-x-auto">
              <table className="w-full min-w-[340px] text-[11px]">
                <thead>
                  <tr className="bg-muted/60 text-left text-[9px] text-muted-foreground uppercase tracking-wide">
                    <th className="px-2.5 py-1.5 font-semibold w-8">N°</th>
                    <th className="px-2.5 py-1.5 font-semibold">Pièce</th>
                    <th className="px-2.5 py-1.5 font-semibold w-16">Niveau</th>
                    <th className="px-2.5 py-1.5 font-semibold w-20 text-right">Surface</th>
                  </tr>
                </thead>
                <tbody>
                  {interior.map((r, i) => (
                    <tr key={r.id} className="border-t border-border/40">
                      <td className="px-2.5 py-1.5 text-muted-foreground tabular-nums">{i + 1}</td>
                      <td className="px-2.5 py-1.5 font-medium">{roomDisplayName(r)}</td>
                      <td className="px-2.5 py-1.5 text-muted-foreground">{LEVEL_LABELS[r.level] ?? `Niveau ${r.level + 1}`}</td>
                      <td className="px-2.5 py-1.5 text-right font-semibold tabular-nums">{r.area.toFixed(1)} m²</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border/40 bg-muted/40">
                    <td colSpan={3} className="px-2.5 py-1.5 text-[10px] font-bold">Surface utile totale</td>
                    <td className="px-2.5 py-1.5 text-right font-bold tabular-nums">{sumInterior.toFixed(1)} m²</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {exteriors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {exteriors.map((z) => (
                  <span
                    key={z.id}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-700 dark:text-emerald-300"
                  >
                    <Building2 className="h-2.5 w-2.5" /> {roomDisplayName(z)} — {z.area.toFixed(1)} m²
                  </span>
                ))}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Layers3 className="h-3 w-3" /> {plan.stairs.length} escalier{plan.stairs.length > 1 ? "s" : ""}</span>
              <span className="flex items-center gap-1"><Maximize2 className="h-3 w-3" /> Emprise {plan.width.toFixed(2)} × {plan.depth.toFixed(2)} m</span>
            </div>
          </div>

          {/* Description IA + points forts/faibles */}
          <div className="rounded-xl border border-border/40 p-3.5 bg-card/40 space-y-3">
            <div>
              <p className="text-xs font-bold mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" /> Description architecturale (IA)
              </p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">{plan.description}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-50/50 dark:bg-emerald-950/15 p-2.5">
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1">
                  <ThumbsUp className="h-3 w-3" /> Points forts
                </p>
                <ul className="space-y-1">
                  {plan.strengths.slice(0, 3).map((s, i) => (
                    <li key={i} className="text-[9px] text-muted-foreground flex gap-1.5 leading-snug">
                      <span className="text-emerald-500 shrink-0">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-amber-500/25 bg-amber-50/50 dark:bg-amber-950/15 p-2.5">
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-1">
                  <ThumbsDown className="h-3 w-3" /> Points d'attention
                </p>
                <ul className="space-y-1">
                  {plan.weaknesses.slice(0, 3).map((w, i) => (
                    <li key={i} className="text-[9px] text-muted-foreground flex gap-1.5 leading-snug">
                      <span className="text-amber-500 shrink-0">•</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SCORE_ROWS.map((s) => (
                <div key={s.key} className="rounded-lg border border-border/40 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[9px] font-medium text-muted-foreground truncate">{s.label}</span>
                    <span className="text-[10px] font-bold tabular-nums shrink-0">{s.value}</span>
                  </div>
                  <Progress value={s.value} className="h-1 [&>div]:bg-violet-500" />
                </div>
              ))}
              <div className="col-span-2 rounded-lg border border-violet-500/30 bg-violet-500/5 px-2.5 py-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold flex items-center gap-1">
                  <Gauge className="h-3.5 w-3.5 text-violet-600" /> Score architectural global
                </span>
                <span className="text-sm font-black text-violet-600 tabular-nums">{plan.scores.global}/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Contrôle qualité automatique ── */}
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <button
            onClick={() => setShowChecks((v) => !v)}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 hover:bg-muted/20 transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-semibold">Vérification automatique du plan</p>
              <p className="text-[9px] text-muted-foreground">
                {checks.filter((c) => c.status === "ok").length}/{checks.length} contrôles validés · {plan.rooms.length} pièces analysées
              </p>
            </div>
            <Badge
              className={cn(
                "text-[9px] border-0",
                !quality ? "bg-slate-500/80 text-white" : quality.score >= 85 ? "bg-emerald-600/90 text-white" : quality.score >= 60 ? "bg-amber-600/90 text-white" : "bg-red-600/90 text-white",
              )}
            >
              {quality?.score ?? "—"}/100
            </Badge>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showChecks && "rotate-180")} />
          </button>
          <AnimatePresence initial={false}>
            {showChecks && (
              <motion.div key="checks" initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="px-3.5 pb-3 pt-1 border-t border-border/40 grid sm:grid-cols-2 gap-1.5">
                  {checks.map((c) => {
                    const meta = CHECK_LABELS[c.key];
                    const Icon = meta.icon;
                    return (
                      <div
                        key={c.key}
                        className={cn(
                          "flex items-start gap-2 rounded-lg border px-2.5 py-2",
                          c.status === "ok" && "border-emerald-500/25 bg-emerald-500/5",
                          c.status === "warning" && "border-amber-500/30 bg-amber-500/5",
                          c.status === "error" && "border-red-500/30 bg-red-500/5",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5",
                            c.status === "ok" && "bg-emerald-100 text-emerald-600",
                            c.status === "warning" && "bg-amber-100 text-amber-600",
                            c.status === "error" && "bg-red-100 text-red-600",
                          )}
                        >
                          {c.status === "ok" ? (
                            <Check className="h-3 w-3" />
                          ) : c.status === "warning" ? (
                            <TriangleAlert className="h-3 w-3" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold flex items-center gap-1">
                            <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                            {meta.label}
                          </p>
                          <p className="text-[9px] text-muted-foreground leading-snug mt-0.5">{c.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-3.5 pb-3 flex items-start gap-2 text-[9px] text-muted-foreground/80">
                  <Info className="h-3 w-3 shrink-0 mt-0.5 text-violet-500" />
                  <span>
                    Plan généré automatiquement par IA à titre indicatif — il doit être validé par un architecte avant toute réalisation. Les surfaces affichées sont en mètres carrés (m²) hors épaisseur des murs.
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
