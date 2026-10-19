import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronDown,
  Compass,
  Download,
  Info,
  Layers3,
  Lightbulb,
  Loader2,
  Maximize2,
  Ruler,
  ScanLine,
  Sparkles,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { ClientProPaywall } from "@/components/ClientProPaywall";
import { ProjectJourneyNav } from "@/components/ProjectJourneyNav";
import { usePdfGate } from "@/hooks/use-pdf-gate";
import {
  projectTypeLabel,
  inferFloorsFromCategory,
  normalizeLegacyCategory,
} from "@/convex/projectTypes";
import { isComplementaryWorkEligible } from "@/lib/customWorksCatalog";
import { realBuiltArea } from "@/lib/buildingLevels";
import { planDraftFromVariant, validatedPlanSummary } from "@/lib/validatedPlan";
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
  repairFloorPlan,
  VARIANTS_PER_PROJECT,
} from "@/lib/floorPlanEngine";
import type { FloorPlan, FloorPlanVariant } from "@/lib/floorPlanEngine";
import { FloorPlan2D } from "@/components/floorplan/FloorPlan2D";
import { FloorPlan3D } from "@/components/floorplan/FloorPlan3D";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { usePageSEO } from "@/hooks/use-page-seo";
import { cn } from "@/lib/utils";
import { analyzeFloorPlan } from "@/lib/planAnalysis";
import type { FloorPlanAnalysis } from "@/lib/planAnalysis";
import { downloadFloorPlanPdf } from "@/lib/floorPlanPdf";

/** Durée fixe de l'écran de chargement : 3 secondes. */
const LOADING_DURATION_MS = 3000;

const LOADING_STEPS = [
  "Analyse des caractéristiques du projet…",
  "Génération des variantes architecturales…",
  "Validation spatiale (surfaces, circulation, structure)…",
];

export default function PlanGenerator() {
  usePageSEO({
    title: "Plans d'architecte IA - batibuild",
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

  // Validation d'un plan : seule écriture du parcours. Le plan validé devient
  // la source des surfaces / niveaux / pièces des étapes suivantes.
  const validateProjectPlan = useMutation(api.projects.validateProjectPlan);
  const simulateAnalysis = useMutation(api.projects.simulateAnalysis);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  // ── Travaux complémentaires sélectionnés par l'utilisateur ──
  // Source unique (enregistrée côté serveur, partagée avec le résultat
  // « Coût de construction ») : aucune liste indépendante n'est créée. Chaque
  // travail devient un besoin / une contrainte du programme architectural.
  const customWorks = useQuery(
    api.customWorks.getProjectCustomWorks,
    loading || !id ? "skip" : { projectId: id as any },
  );
  const planWorks = useMemo(() => customWorks?.keys ?? [], [customWorks]);
  // Mêmes conditions d'accès que le résultat d'estimation : les travaux
  // complémentaires ne sont pris en compte que pour les projets éligibles
  // (les sept types autorisés : maison, villa, appartement, duplex, immeuble,
  // résidence touristique, projet immobilier neuf — ET surface ≥ 120 m²).
  const worksEligible = useMemo(
    () =>
      isComplementaryWorkEligible(
        normalizeLegacyCategory((project?.category ?? "") as string),
        project?.surface,
      ),
    [project?.category, project?.surface],
  );

  // ── Génération des 10 variantes (déterministe) + réparation architecturale
  // de chaque niveau : garantit murs continus, surfaces exactes, ouvertures
  // dans les murs, accès à toute pièce (2D et 3D partagent les mêmes données).
  const allVariants: FloorPlanVariant[] = useMemo(() => {
    if (!project) return [];
    // `generateFloorPlans` attend la surface CONSTRUITE de tous les niveaux.
    // `project.surface` est la surface couverte du RDC : on la convertit avec
    // les surfaces réelles par niveau, sinon un R+1 de 100 + 80 m² serait
    // dessiné comme deux niveaux de 90 m² au lieu de 100 + 80.
    const floors = Math.max(
      1,
      Math.min(4, project.floors ?? inferFloorsFromCategory(project.category)),
    );
    const totalBuiltArea = realBuiltArea(
      project.surface ?? 120,
      floors,
      project.levelSurfaces,
    );
    return generateFloorPlans({
      category: project.category as string,
      surface: totalBuiltArea,
      floors,
      bedrooms: project.bedrooms ?? undefined,
      bathrooms: project.bathrooms ?? undefined,
      kitchens: project.kitchens ?? undefined,
      livingRooms: project.livingRooms ?? undefined,
      wcs: project.wcs ?? undefined,
      works: worksEligible ? planWorks : [],
    }).map((variant) => ({
      ...variant,
      floors: variant.floors.map((f) =>
        repairFloorPlan({
          ...f,
          rooms: f.rooms.map((r) => ({ ...r, doors: [...r.doors], windows: [...r.windows] })),
        }),
      ),
    }));
  }, [project, planWorks, worksEligible]);

  const variants = allVariants;
  const bestScore = useMemo(
    () => Math.max(0, ...variants.map((v) => v.validation.score)),
    [variants],
  );

  // Plan déjà validé (source des étapes suivantes) et son résumé lisible.
  const validatedPlan = project?.validatedPlan ?? null;
  const validatedSummary = useMemo(
    () => validatedPlanSummary(validatedPlan),
    [validatedPlan],
  );

  const handleValidate = async (variant: FloorPlanVariant) => {
    if (!project || validatingId) return;
    setValidatingId(variant.id);
    try {
      // 1. Enregistre le plan : surfaces par niveau, niveaux, pièces, dimensions.
      await validateProjectPlan({
        projectId: project._id,
        plan: planDraftFromVariant(variant),
      });
      // 2. Recalcule immédiatement le coût et le quantitatif à partir du plan
      //    validé : « Matériaux utilisés » et « Aide à la décision » lisent
      //    ensuite ces résultats, sans ressaisir de surface.
      try {
        await simulateAnalysis({ projectId: project._id });
        toast.success("Plan validé : coût et quantités recalculés sur ses surfaces.");
      } catch {
        toast.success("Plan validé.");
        toast.error(
          "Le coût n'a pas pu être recalculé automatiquement. Relancez l'estimation depuis « Coût estimatif ».",
        );
      }
    } catch (error: any) {
      toast.error(error?.message || "Impossible de valider ce plan.");
    } finally {
      setValidatingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background pb-12">
        <ClientProPaywall>
      {/* Parcours du projet — « Plans architecturaux AI » est la PREMIÈRE étape
          du parcours : cette page n'a pas d'étape précédente, et « Suivant → »
          ouvre le coût estimatif. La validation du plan transmet ses surfaces,
          ses niveaux et ses pièces à toutes les étapes suivantes. */}
      <ProjectJourneyNav
        projectId={id}
        category={project?.category}
        featureLabel="Plans architecturaux AI"
        maxWidthClassName="max-w-7xl"
      />

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

            {/* ── Plan validé : données transmises aux étapes suivantes ── */}
            {validatedPlan && validatedSummary && (
              <Card className="border-emerald-500/30 bg-emerald-500/[0.04]">
                <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="text-xs font-semibold">
                      Plan validé · {validatedPlan.variantName}
                    </p>
                  </div>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {validatedSummary.surface} m² RDC ·{" "}
                    {validatedSummary.levels === 1
                      ? "1 niveau"
                      : `${validatedSummary.levels} niveaux`}{" "}
                    · {validatedSummary.totalArea} m² construits ·{" "}
                    {validatedSummary.rooms} pièces
                  </p>
                  <p className="w-full text-[10px] text-muted-foreground">
                    Ces surfaces, niveaux, dimensions de pièces et quantités alimentent
                    le coût estimatif, les matériaux utilisés et l'aide à la décision.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ── Grille des variantes ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {variants.map((variant, i) => (
                <VariantCard
                  key={variant.id}
                  variant={variant}
                  index={i}
                  projectName={project.name}
                  validated={validatedPlan?.variantId === variant.id}
                  validating={validatingId === variant.id}
                  validationBusy={validatingId != null}
                  onValidate={() => handleValidate(variant)}
                />
              ))}
            </div>

            <p className="text-center text-[10px] text-muted-foreground/60 pt-2">
              Plans générés algorithmiquement à titre indicatif — validation par un architecte
              inscrit à l'ordre requise avant dépôt du permis de bâtir.
            </p>
          </>
        )}
      </div>
            </ClientProPaywall>
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

function VariantCard({
  variant,
  index,
  projectName,
  validated,
  validating,
  validationBusy,
  onValidate,
}: {
  variant: FloorPlanVariant;
  index: number;
  projectName: string;
  /** Cette variante est le plan validé du projet. */
  validated: boolean;
  /** La validation de CETTE variante est en cours. */
  validating: boolean;
  /** Une validation est en cours (toutes variantes). */
  validationBusy: boolean;
  onValidate: () => void;
}) {
  const [floorIdx, setFloorIdx] = useState(0);
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  // Téléchargement PDF : contrôle centralisé (réservé au forfait payant Client Pro).
  const pdfGate = usePdfGate();
  // Sélection partagée 2D ↔ 3D : cliquer une pièce dans l'une des vues la
  // met en surbrillance dans l'autre (même identifiant de pièce).
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const floor: FloorPlan = variant.floors[Math.min(floorIdx, variant.floors.length - 1)];
  const surfaces = useMemo(() => summarizeSurfaces(floor), [floor]);
  const analysis = useMemo(() => analyzeFloorPlan(floor), [floor]);
  const floorLabel = floor.level === 0 ? "Rez-de-chaussée" : `Niveau ${floor.level}`;
  const v = variant.validation;
  const selectedRoom = selectedRoomId
    ? floor.rooms.find((r) => r.id === selectedRoomId) ?? null
    : null;

  const handleDownload = () => {
    if (pdfBusy) return;
    pdfGate.requestPdfDownload(async () => {
      setPdfBusy(true);
      try {
        await downloadFloorPlanPdf({
          plan: floor,
          projectName,
          variantName: variant.name,
          floorLabel,
        });
      } catch (err) {
        console.error("Erreur export PDF du plan :", err);
      } finally {
        setPdfBusy(false);
      }
    });
  };

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
      {pdfGate.dialog}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <CardTitle className="text-sm font-bold tracking-tight">{variant.name}</CardTitle>
              {validated && (
                <Badge
                  variant="outline"
                  className="shrink-0 border-emerald-500/40 bg-emerald-500/10 text-[9px] text-emerald-700 dark:text-emerald-300"
                >
                  <CheckCircle2 className="mr-1 h-2.5 w-2.5" /> Plan validé
                </Badge>
              )}
            </div>
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

          {/* Plan 2D ou 3D — sélection de pièce synchronisée entre les vues */}
          {view === "2d" ? (
            <div
              className="relative group cursor-zoom-in"
              role="button"
              tabIndex={0}
              aria-label="Afficher le plan 2D en plein écran"
              onClick={() => setPreviewOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setPreviewOpen(true);
                }
              }}
            >
              <FloorPlan2D
                plan={floor}
                selectedRoomId={selectedRoomId}
                onSelectRoom={setSelectedRoomId}
              />
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md border bg-background/90 px-2 py-1 text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100">
                <Maximize2 className="h-3 w-3" /> Plein écran
              </span>
            </div>
          ) : (
            <FloorPlan3D
              plan={floor}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
            />
          )}

          {/* Info pièce sélectionnée (synchro 2D ↔ 3D) */}
          {selectedRoom && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-violet-500/30 bg-violet-500/[0.05] px-3 py-2">
              <span className="text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                {selectedRoom.label}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {selectedRoom.area.toFixed(2)} m²
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {selectedRoom.w.toFixed(2)} × {selectedRoom.h.toFixed(2)} m
              </span>
              <button
                type="button"
                className="ml-auto text-[10px] font-medium text-violet-600 hover:underline cursor-pointer"
                onClick={() => setSelectedRoomId(null)}
              >
                Désélectionner
              </button>
            </div>
          )}

          {/* Actions : validation du plan (source des étapes suivantes),
              export PDF et analyse. */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={onValidate}
              disabled={validated || validationBusy}
              title={
                validated
                  ? "Ce plan alimente déjà le coût, les matériaux et l'aide à la décision"
                  : "Valider ce plan et transmettre ses surfaces, niveaux et pièces au parcours"
              }
            >
              {validating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {validated
                ? "Plan validé"
                : validating
                  ? "Validation…"
                  : "Valider ce plan"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={pdfBusy}
            >
              {pdfBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {pdfBusy ? "Génération…" : "Télécharger PDF"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowAnalysis((s) => !s)}
            >
              <ScanLine className="h-3.5 w-3.5" />
              Analyse & optimisation
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  showAnalysis && "rotate-180",
                )}
              />
            </Button>
          </div>

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

          {/* Analyse & optimisation d'architecte */}
          {showAnalysis && <AnalysisPanel analysis={analysis} floorLabel={floorLabel} />}
        </CardContent>
      </Card>

      {/* Plein écran du plan 2D */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-none w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] max-w-full p-4 sm:p-6 overflow-auto bg-transparent border-transparent">
          <DialogTitle className="sr-only">
            Plan 2D — {variant.name} · {floorLabel}
          </DialogTitle>
          <div className="flex items-center justify-between gap-2 mb-3 pr-10">
            <p className="text-sm font-semibold tracking-tight truncate">
              {variant.name} · {floorLabel} — Plan 2D
            </p>
          </div>
          <div className="mx-auto w-full max-w-6xl">
            <div className="rounded-md border bg-white p-2 shadow-sm">
              <FloorPlan2D plan={floor} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ── Panneau « Analyse & optimisation d'architecte » ─────────────────────────

const ZONE_STYLE: Record<string, { label: string; dot: string }> = {
  nuit: { label: "Zone nuit", dot: "bg-indigo-500" },
  jour: { label: "Zone jour", dot: "bg-amber-500" },
  service: { label: "Service / technique", dot: "bg-slate-500" },
  circulation: { label: "Circulations", dot: "bg-zinc-400" },
};

const SEV_STYLE: Record<string, string> = {
  info: "border-sky-500/25 bg-sky-500/[0.06] text-sky-600",
  warning: "border-amber-500/25 bg-amber-500/[0.06] text-amber-600",
  critical: "border-red-500/30 bg-red-500/[0.06] text-red-600",
};

function AnalysisPanel({
  analysis,
  floorLabel,
}: {
  analysis: FloorPlanAnalysis;
  floorLabel: string;
}) {
  const a = analysis;
  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] px-3 py-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ScanLine className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            Analyse & optimisation · {floorLabel}
          </span>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
        >
          Optimisation {a.score}/100
        </Badge>
      </div>

      {/* Zonage */}
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Zonage & circulation
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {a.zoning.groups
            .filter((g) => g.rooms.length > 0)
            .map((g) => (
              <div key={g.kind} className="rounded-md border bg-background/70 px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", ZONE_STYLE[g.kind].dot)} />
                  <span className="text-[10px] font-medium">{ZONE_STYLE[g.kind].label}</span>
                  <span className="ml-auto text-[10px] font-semibold tabular-nums">
                    {g.area.toFixed(1)} m²
                  </span>
                </div>
                <p className="mt-0.5 text-[9px] text-muted-foreground">
                  {g.rooms.map((r) => r.label).join(" · ")}
                </p>
              </div>
            ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-muted-foreground">
          <span>
            Circulations :{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {a.zoning.circulationM2.toFixed(1)} m² ({a.zoning.circulationPct.toFixed(0)}%)
            </span>
          </span>
          <span>
            Surface utile :{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {a.zoning.usefulM2.toFixed(1)} m²
            </span>
          </span>
        </div>
      </div>

      {/* Ergonomie + lumière */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
        <StatBox label="Haut. plafond" value={`${a.ergonomics.ceilingHeight.toFixed(2)} m`} />
        <StatBox
          label="Passage min."
          value={`${(a.ergonomics.minPassage * 100).toFixed(0)} cm`}
          ok={a.ergonomics.passable}
        />
        <StatBox label="Fenêtres" value={`${a.layout.totalWindows}`} />
        <StatBox label="Portes" value={`${a.layout.totalDoors}`} />
      </div>

      {/* Recommandations */}
      <div className="space-y-1.5">
        {a.recommendations.map((r) => (
          <div key={r.category + r.title} className={cn("rounded-md border px-2 py-1.5", SEV_STYLE[r.severity])}>
            <p className="text-[10px] font-semibold leading-tight">{r.title}</p>
            <p className="text-[10px] leading-relaxed opacity-90 mt-0.5">{r.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="rounded-md border bg-background/70 px-2 py-1.5">
      <p className="text-[9px] text-muted-foreground uppercase tracking-wide truncate">{label}</p>
      <p
        className={cn(
          "text-xs font-semibold tabular-nums",
          ok === false && "text-red-600",
          ok === true && "text-emerald-600",
        )}
      >
        {value}
      </p>
    </div>
  );
}
