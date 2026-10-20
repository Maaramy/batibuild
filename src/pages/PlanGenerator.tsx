import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Building2,
  ChevronDown,
  Compass,
  Download,
  Droplets,
  Info,
  Layers3,
  Lightbulb,
  Loader2,
  Map as MapIcon,
  Maximize2,
  Ruler,
  ScanLine,
  Trees,
  Waves,
  Zap,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ClientProPaywall } from "@/components/ClientProPaywall";
import {
  EstimateLoadingScreen,
  ESTIMATE_LOADING_DURATION_MS,
} from "@/components/EstimateLoadingScreen";
import { ProjectJourneyNav } from "@/components/ProjectJourneyNav";
import { usePdfGate } from "@/hooks/use-pdf-gate";
import {
  projectTypeLabel,
  inferFloorsFromCategory,
  normalizeLegacyCategory,
} from "@/convex/projectTypes";
import { isComplementaryWorkEligible } from "@/lib/customWorksCatalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TechnicalPlansPanel } from "@/components/floorplan/TechnicalPlansPanel";
import {
  generateFloorPlans,
  summarizeSurfaces,
  repairFloorPlan,
  VARIANTS_PER_PROJECT,
} from "@/lib/floorPlanEngine";
import type { FloorPlan, FloorPlanVariant } from "@/lib/floorPlanEngine";
import { FloorPlan2D } from "@/components/floorplan/FloorPlan2D";
import { FloorPlan3D } from "@/components/floorplan/FloorPlan3D";
import { SiteLegend, SitePlan2D } from "@/components/floorplan/SitePlan2D";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { usePageSEO } from "@/hooks/use-page-seo";
import { cn } from "@/lib/utils";
import { analyzeFloorPlan } from "@/lib/planAnalysis";
import type { FloorPlanAnalysis } from "@/lib/planAnalysis";
import { downloadFloorPlanPdf } from "@/lib/floorPlanPdf";
import {
  resolvePlanPagePhase,
  resolvePlanPageView,
} from "@/lib/planPageState";

/**
 * Six étapes du parcours de préparation des plans : même nombre d'étapes que
 * l'écran « Coût estimatif », donc même logo, mêmes animations, même barre de
 * progression et même disposition responsive (aucun second design).
 */
const LOADING_STEPS = [
  "Récupération du projet",
  "Lecture du programme architectural",
  "Analyse de la surface réelle",
  "Composition des espaces",
  "Variantes architecturales 2D / 3D",
  "Validation des plans",
] as const;

export default function PlanGenerator() {
  usePageSEO({
    title: "Plans d'architecte IA - batibuild",
    description:
      "10 variantes de plans d'architecte 2D et 3D générées par IA pour votre projet de construction en Tunisie.",
  });
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Identifiant réel du projet transmis par le Journey (`/dashboard/plans/:id`).
  // Aucun identifiant n'est créé côté page : sans identifiant, aucune requête
  // n'est envoyée et la page affiche l'état « projet introuvable ».
  const projectId = (id ?? "").trim();

  const hasProjectId = projectId.length > 0;

  // ── Écran de chargement partagé avec « Coût estimatif de construction » ──
  // Durée initiale identique (4 000 ms) ; les requêtes Convex sont lancées
  // IMMÉDIATEMENT, en parallèle de l'animation. L'animation ne retarde ni
  // n'interrompt jamais le chargement des données.
  const [introDone, setIntroDone] = useState(false);
  // `true` uniquement lorsque l'animation est terminée ET que les données
  // requises sont disponibles : la page des plans n'apparaît jamais avant.
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Nouveau projet (navigation d'un projet à l'autre sans démontage de la
    // page) : on repart de l'animation complète, jamais d'un écran à moitié
    // chargé ni des données du projet précédent.
    setIntroDone(false);
    setRevealed(false);
    // Borné à la durée exacte de l'animation : le message « Projet
    // introuvable » ne peut donc jamais s'afficher pendant le chargement.
    const timer = window.setTimeout(
      () => setIntroDone(true),
      ESTIMATE_LOADING_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [projectId]);

  const handleLoaderComplete = useCallback(() => setRevealed(true), []);

  // ── Récupération du projet : requêtes lancées IMMÉDIATEMENT, en parallèle de
  // l'écran d'introduction. Ce dernier ne doit jamais retarder ni interrompre
  // le chargement Convex, sinon la première réponse (`undefined`) serait prise
  // à tort pour un projet inexistant.
  const project = useQuery(
    api.projects.getProject,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  // ── Plans techniques enregistrés (plomberie / électricité) ──
  // Même contrôle d'accès côté serveur que le projet : aucune donnée d'un
  // autre projet ne peut être chargée ici.
  const savedTechnicalPlans = useQuery(
    api.technicalPlans.getProjectTechnicalPlans,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  // Onglets de la page : plan architectural + les deux plans techniques.
  const [planTab, setPlanTab] = useState<"architecture" | "plomberie" | "electricite">(
    "architecture",
  );
  const [techVariantId, setTechVariantId] = useState<string | null>(null);

  // Changement de projet sans démontage de la page : on repart de l'onglet
  // architectural et d'aucune variante technique mémorisée, pour ne jamais
  // réutiliser un état (ou des positions) appartenant au projet précédent.
  useEffect(() => {
    setTechVariantId(null);
    setPlanTab("architecture");
  }, [projectId]);

  // ── Travaux complémentaires sélectionnés par l'utilisateur ──
  // Source unique (enregistrée côté serveur, partagée avec le résultat
  // « Coût de construction ») : aucune liste indépendante n'est créée. Chaque
  // travail devient un besoin / une contrainte du programme architectural.
  const customWorks = useQuery(
    api.customWorks.getProjectCustomWorks,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  // États distincts : `undefined` (requête en cours) ≠ `null` (projet
  // réellement introuvable ou inaccessible). Voir `@/lib/planPageState`.
  // Données requises : le projet ET ses travaux complémentaires (les plans en
  // dépendent) — `undefined` signifie « requête encore en cours ».
  const dataReady = project !== undefined && customWorks !== undefined;
  const phase = resolvePlanPagePhase({
    // Sans identifiant, aucune requête n'est envoyée : inutile de faire patienter
    // l'utilisateur derrière une animation.
    introLoading: !introDone && hasProjectId,
    projectId,
    project,
    customWorks,
  });
  const view = resolvePlanPageView({ phase, revealed });
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
    return generateFloorPlans({
      category: project.category as string,
      surface: project.surface ?? 120,
      floors: Math.max(1, Math.min(4, project.floors ?? inferFloorsFromCategory(project.category))),
      bedrooms: project.bedrooms ?? undefined,
      bathrooms: project.bathrooms ?? undefined,
      kitchens: project.kitchens ?? undefined,
      livingRooms: project.livingRooms ?? undefined,
      wcs: project.wcs ?? undefined,
      works: worksEligible ? planWorks : [],
      // Parcelle réelle du projet (surfaceTotale) : le plan de masse s'y
      // conforme. Sans valeur, une parcelle de référence est estimée ET
      // signalée comme telle dans la carte de variante.
      plotArea: project.surfaceTotale ?? undefined,
      pools: project.pools ?? undefined,
      garages: project.garages ?? undefined,
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
  const selectProjectPlan = useMutation(api.projects.selectProjectPlan);
  const simulateAnalysis = useMutation(api.projects.simulateAnalysis);
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const selectedPlanId = project?.planSelection?.variantId ?? null;

  const handleSelectPlan = useCallback(
    async (variant: FloorPlanVariant) => {
      if (!projectId || savingPlanId) return;
      setSavingPlanId(variant.id);
      try {
        await selectProjectPlan({
          projectId: projectId as Id<"projects">,
          variantId: variant.id,
          styleId: variant.styleId,
          name: variant.name,
          builtArea: variant.surfaces.built,
          levelSurfaces: variant.floors.map((f) =>
            Number(
              f.rooms
                .filter((r) => !r.exterior)
                .reduce((s, r) => s + r.area, 0)
                .toFixed(2),
            ),
          ),
          footprint: variant.footprint,
        });
        // Les surfaces du plan retenu deviennent la référence : le coût et le
        // quantitatif sont recalculés avec ces surfaces réelles par niveau.
        try {
          await simulateAnalysis({ projectId: projectId as Id<"projects"> });
        } catch (err) {
          console.warn("Recalcul du coût après sélection du plan impossible :", err);
        }
      } catch (err) {
        console.error("Enregistrement du plan de référence impossible :", err);
      } finally {
        setSavingPlanId(null);
      }
    },
    [projectId, savingPlanId, selectProjectPlan, simulateAnalysis],
  );

  const bestScore = useMemo(
    () => Math.max(0, ...variants.map((v) => v.validation.score)),
    [variants],
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background pb-12">
        <ClientProPaywall>
      {/* Parcours du projet — l'étape « Plans architecturaux AI » ouvre le
          parcours du groupe A : cette page affiche donc son étape dédiée, avec
          « Suivant → : Coût estimatif » pour enchaîner sans perdre les données
          du projet. `featureLabel` sert de repli tant que le projet n'est pas
          encore chargé. */}
      <ProjectJourneyNav
        projectId={projectId || undefined}
        category={project?.category}
        featureLabel="Plans architecturaux AI"
        maxWidthClassName="max-w-7xl"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-5 space-y-5">
        {/* ── Chargement harmonisé avec « Coût estimatif de construction » ── */}
        {view === "loading" ? (
          <EstimateLoadingScreen
            // Un projet différent repart d'une animation complète, comme à
            // l'ouverture directe de la page.
            key={projectId}
            projectName={project?.name}
            pending={!dataReady}
            onComplete={handleLoaderComplete}
            durationMs={ESTIMATE_LOADING_DURATION_MS}
            steps={LOADING_STEPS}
            title="BatiBuild prépare vos plans architecturaux"
            description="Type de projet, région, surface réelle, niveaux et travaux complémentaires — les variantes 2D / 3D se préparent."
            progressLabel="Progression de la préparation des plans"
            readyLabel="Plans prêts, affichage…"
            waitingLabel="Récupération des données du projet…"
            waitingDetail="Chargement du projet et de ses travaux complémentaires…"
          />
        ) : view === "not-found" ? (
          /* ── Projet introuvable (réponse serveur confirmée, après l'animation) ── */
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
        ) : project ? (
          <>
            {/* ── Trois plans : architectural, plomberie, électricité ── */}
            <Tabs
              value={planTab}
              onValueChange={(value) =>
                setPlanTab(value as "architecture" | "plomberie" | "electricite")
              }
              className="gap-4"
            >
              <TabsList className="h-auto w-full justify-start overflow-x-auto p-1 sm:w-fit">
                <TabsTrigger value="architecture" className="h-8 gap-1.5 px-3 text-[11px] sm:text-xs">
                  <Layers3 className="h-3.5 w-3.5" /> Plan architectural
                </TabsTrigger>
                <TabsTrigger value="plomberie" className="h-8 gap-1.5 px-3 text-[11px] sm:text-xs">
                  <Droplets className="h-3.5 w-3.5" /> Plan de plomberie
                </TabsTrigger>
                <TabsTrigger value="electricite" className="h-8 gap-1.5 px-3 text-[11px] sm:text-xs">
                  <Zap className="h-3.5 w-3.5" /> Plan électrique
                </TabsTrigger>
              </TabsList>

              <TabsContent value="architecture" className="space-y-5">
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
                <VariantCard
                  key={variant.id}
                  variant={variant}
                  index={i}
                  projectName={project.name}
                  isReference={selectedPlanId === variant.id}
                  selecting={savingPlanId === variant.id}
                  onSelectPlan={() => handleSelectPlan(variant)}
                  onOpenTechnical={(variantId, kind) => {
                    setTechVariantId(variantId);
                    setPlanTab(kind);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              ))}
            </div>

            <p className="text-center text-[10px] text-muted-foreground/70 pt-1 leading-relaxed">
              « Retenir ce plan » enregistre ses surfaces réelles par niveau : elles servent de
              référence au coût estimatif, aux quantitatifs et aux métrés des étapes suivantes.
              La surface demandée du projet n'est pas réécrite.
            </p>
            <p className="text-center text-[10px] text-muted-foreground/60 pt-1">
              Plans générés algorithmiquement à titre indicatif — validation par un architecte
              inscrit à l'ordre requise avant dépôt du permis de bâtir. Les règles d'urbanisme
              (reculs, coefficient d'occupation, hauteur) restent à vérifier auprès du service
              compétent.
            </p>
              </TabsContent>

              <TabsContent value="plomberie">
                <TechnicalPlansPanel
                  projectId={projectId}
                  projectName={project.name}
                  project={{
                    description: project.description,
                    bathrooms: project.bathrooms,
                    kitchens: project.kitchens,
                    wcs: project.wcs,
                    dqe: project.dqe as { lots?: any[] } | undefined,
                  }}
                  variants={variants}
                  kind="plomberie"
                  key={`plomberie-${projectId}`}
                  savedPlans={savedTechnicalPlans}
                  initialVariantId={techVariantId ?? selectedPlanId ?? undefined}
                />
              </TabsContent>

              <TabsContent value="electricite">
                <TechnicalPlansPanel
                  projectId={projectId}
                  projectName={project.name}
                  project={{
                    description: project.description,
                    bathrooms: project.bathrooms,
                    kitchens: project.kitchens,
                    wcs: project.wcs,
                    dqe: project.dqe as { lots?: any[] } | undefined,
                  }}
                  variants={variants}
                  kind="electricite"
                  key={`electricite-${projectId}`}
                  savedPlans={savedTechnicalPlans}
                  initialVariantId={techVariantId ?? selectedPlanId ?? undefined}
                />
              </TabsContent>
            </Tabs>
          </>
        ) : null}
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
  isReference = false,
  selecting = false,
  onSelectPlan,
  onOpenTechnical,
}: {
  variant: FloorPlanVariant;
  index: number;
  projectName: string;
  isReference?: boolean;
  selecting?: boolean;
  onSelectPlan?: () => void;
  onOpenTechnical?: (variantId: string, kind: "plomberie" | "electricite") => void;
}) {
  const [floorIdx, setFloorIdx] = useState(0);
  const [view, setView] = useState<"2d" | "mass" | "3d">("2d");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  // Téléchargement PDF : contrôle centralisé (réservé au forfait payant Client Pro).
  const pdfGate = usePdfGate();
  // Sélection partagée 2D ↔ 3D : cliquer une pièce dans l'une des vues la
  // met en surbrillance dans l'autre (même identifiant de pièce).
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const floor: FloorPlan = variant.floors[Math.min(floorIdx, variant.floors.length - 1)];
  // Tableau des surfaces INTÉRIEURES : le patio extérieur est présenté dans
  // le plan de masse et la catégorie « extérieure », jamais dans le bâti.
  const surfaces = useMemo(() => {
    const rows = summarizeSurfaces(floor).filter((s) => s.kind !== "patio");
    const total = rows.reduce((s, r) => s + r.area, 0) || 1;
    return rows.map((r) => ({
      ...r,
      sharePct: Math.round((r.area / total) * 1000) / 10,
    }));
  }, [floor]);
  const builtLevelArea = useMemo(
    () => floor.rooms.filter((r) => !r.exterior).reduce((s, r) => s + r.area, 0),
    [floor],
  );
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
          surfaces: variant.surfaces,
          site: variant.site,
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
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-primary/80 mb-0.5">
                {variant.style}
              </p>
              <CardTitle className="text-sm font-bold tracking-tight">{variant.name}</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{variant.tagline}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge variant="outline" className={cn("text-[10px]", scoreColor)}>
                Note {v.score}/100
              </Badge>
              {isReference && (
                <Badge className="text-[9px] gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                  <BadgeCheck className="h-3 w-3" /> Plan retenu
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-[11px] text-muted-foreground">
            <span>
              Emprise{" "}
              <span className="font-medium text-foreground tabular-nums">
                {variant.footprint.length.toFixed(1)} × {variant.footprint.width.toFixed(1)} m
              </span>
            </span>
            <span>
              Surface bâtie{" "}
              <span className="font-medium text-foreground tabular-nums">
                {variant.surfaces.built.toFixed(1)} m²
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
            <Tabs value={view} onValueChange={(val) => setView(val as "2d" | "mass" | "3d")}>
              <TabsList className="h-7">
                <TabsTrigger value="2d" className="text-[11px] h-6 px-2.5">Plan 2D</TabsTrigger>
                <TabsTrigger value="mass" className="text-[11px] h-6 px-2.5 gap-1">
                  <MapIcon className="h-3 w-3" /> Plan de masse
                </TabsTrigger>
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

          {/* Plan 2D, plan de masse ou 3D — sélection de pièce synchronisée */}
          {view === "mass" ? (
            <div className="space-y-2">
              <div className="rounded-md border bg-white p-1 shadow-sm">
                <SitePlan2D site={variant.site} />
              </div>
              <SiteLegend site={variant.site} />
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded-md border bg-background/70 px-2 py-1.5">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Parcelle</p>
                  <p className="text-xs font-semibold tabular-nums">{variant.site.plot.area.toFixed(0)} m²</p>
                </div>
                <div className="rounded-md border bg-background/70 px-2 py-1.5">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Bâti au sol</p>
                  <p className="text-xs font-semibold tabular-nums">{variant.surfaces.groundBuilt.toFixed(0)} m²</p>
                </div>
                <div className="rounded-md border bg-background/70 px-2 py-1.5">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Jardin</p>
                  <p className="text-xs font-semibold tabular-nums">{variant.surfaces.garden.toFixed(0)} m²</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
                <Compass className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{variant.site.orientationLabel}.</span>
              </p>
              {variant.site.constraints.length > 0 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.06] px-2.5 py-2 space-y-1">
                  <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                    Contraintes de parcelle
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[10px] leading-relaxed text-amber-800/90 dark:text-amber-200/80">
                    {variant.site.constraints.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : view === "2d" ? (
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
              site={variant.site}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
            />
          )}

          {/* Info pièce sélectionnée (synchro 2D ↔ 3D) — masquée en plan de masse */}
          {view !== "mass" && selectedRoom && (
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

          {/* Actions : sélection du plan de référence, export PDF, analyse */}
          <div className="flex flex-wrap items-center gap-2">
            {onSelectPlan && (
              <Button
                size="sm"
                variant={isReference ? "secondary" : "default"}
                onClick={onSelectPlan}
                disabled={isReference || selecting}
                className="gap-1.5"
              >
                {selecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <BadgeCheck className="h-3.5 w-3.5" />
                )}
                {isReference ? "Plan de référence" : selecting ? "Enregistrement…" : "Retenir ce plan"}
              </Button>
            )}
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
            {onOpenTechnical && (
              <div className="ml-auto flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 px-2 text-[10px] text-sky-700 hover:bg-sky-500/10 hover:text-sky-800 dark:text-sky-300"
                  onClick={() => onOpenTechnical(variant.id, "plomberie")}
                >
                  <Droplets className="h-3.5 w-3.5" /> Plomberie
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 px-2 text-[10px] text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-300"
                  onClick={() => onOpenTechnical(variant.id, "electricite")}
                >
                  <Zap className="h-3.5 w-3.5" /> Électricité
                </Button>
              </div>
            )}
          </div>

          {/* Les trois catégories de surfaces — jamais additionnées */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            <div className="rounded-lg border bg-background/70 px-2.5 py-2">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3 w-3 text-emerald-600" />
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Habitable intérieure
                </p>
              </div>
              <p className="text-sm font-bold tabular-nums mt-0.5">
                {variant.surfaces.interior.toFixed(1)} <span className="text-[10px] font-medium">m²</span>
              </p>
              <p className="text-[9px] text-muted-foreground">Pièces fermées, tous niveaux</p>
            </div>
            <div className="rounded-lg border bg-background/70 px-2.5 py-2">
              <div className="flex items-center gap-1.5">
                <Layers3 className="h-3 w-3 text-sky-600" />
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Bâtie complémentaire
                </p>
              </div>
              <p className="text-sm font-bold tabular-nums mt-0.5">
                {variant.surfaces.complementary.toFixed(1)} <span className="text-[10px] font-medium">m²</span>
              </p>
              <p className="text-[9px] text-muted-foreground">Garage, locaux couverts</p>
            </div>
            <div className="rounded-lg border border-lime-600/25 bg-lime-500/[0.05] px-2.5 py-2">
              <div className="flex items-center gap-1.5">
                <Trees className="h-3 w-3 text-lime-700" />
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Extérieure aménagée
                </p>
              </div>
              <p className="text-sm font-bold tabular-nums mt-0.5">
                {variant.surfaces.exterior.toFixed(1)} <span className="text-[10px] font-medium">m²</span>
              </p>
              <p className="text-[9px] text-muted-foreground">
                Jardin {variant.surfaces.garden.toFixed(0)} m²
                {variant.site.elements.some((e) => e.kind === "piscine") ? " · piscine incluse" : ""}
              </p>
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground/80 -mt-1">
            Les surfaces extérieures ne sont jamais additionnées à la surface habitable ni à la
            surface bâtie.
          </p>

          {/* Parti architectural : avantages et caractéristiques */}
          <div className="rounded-lg border bg-muted/20 px-3 py-2.5 space-y-2">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="h-3 w-3 text-amber-600" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Parti architectural
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{variant.description}</p>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-700 mb-1">
                Avantages
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
                {variant.advantages.map((a) => (
                  <li key={a} className="text-[10px] leading-snug text-muted-foreground flex gap-1.5">
                    <span className="text-emerald-600 mt-0.5">✓</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-1">
              {variant.characteristics.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-border bg-background px-2 py-0.5 text-[9px] text-muted-foreground"
                >
                  {c}
                </span>
              ))}
            </div>
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
                  <td className="px-3 py-1.5 font-semibold">Total bâti du niveau</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-bold">
                    {builtLevelArea.toFixed(1)} m²
                  </td>
                  <td className="px-3 py-1.5" />
                </tr>
                {floor.rooms.some((r) => r.exterior) && (
                  <tr className="border-t border-lime-600/20 bg-lime-500/[0.05]">
                    <td className="px-3 py-1.5 text-[10px] text-lime-800 dark:text-lime-300">
                      Patio extérieur (hors surface bâtie)
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-[10px]">
                      {floor.rooms.filter((r) => r.exterior).reduce((s, r) => s + r.area, 0).toFixed(1)} m²
                    </td>
                    <td className="px-3 py-1.5" />
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Source de la parcelle */}
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
            <Waves className="h-3 w-3 text-sky-600" />
            <span>
              {variant.site.plot.source === "projet"
                ? `Plan de masse établi sur la parcelle du projet (${variant.site.plot.area.toFixed(0)} m²).`
                : `Parcelle de référence estimée (${variant.site.plot.area.toFixed(0)} m²) : à confirmer avant permis de bâtir.`}
            </span>
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
              { ok: v.exteriorOk, label: "Extérieurs séparés" },
              { ok: v.surfacesOk, label: "Surfaces cohérentes" },
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
