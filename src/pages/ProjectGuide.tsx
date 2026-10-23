import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import SiteDiagnostic from "@/components/SiteDiagnostic";
import BudgetAllocation from "@/components/BudgetAllocation";
import { CostEvolutionCard } from "@/components/CostEvolutionCard";
import { Gantt, PhaseIcon, PhaseList, RoadmapOverview } from "@/components/ProjectGuideSections";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ClientProPaywall } from "@/components/ClientProPaywall";
import { ProjectJourneyNav } from "@/components/ProjectJourneyNav";
import { ProjectStepUnavailable } from "@/components/ProjectStepUnavailable";
import { canAccessJourneyStep } from "@/lib/projectJourney";
import { usePdfGate } from "@/hooks/use-pdf-gate";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  CalendarRange,
  Camera,
  CheckCircle2,
  CheckSquare,
  Clock,
  Download,
  FileCheck,
  FileText,
  Gauge,
  HardHat,
  Layers,
  Loader2,
  MapPin,
  Plus,
  Rocket,
  Ruler,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { Roadmap, RoadmapProjectInput } from "@/convex/roadmapEngine";
import { exportRoadmapPdf } from "@/lib/roadmapReportPdf";
import { fmtDate, fmtTnd } from "@/lib/projectGuideFormat";
import { buildDocumentContent, downloadText } from "@/lib/projectGuideDocuments";
import {
  EXECUTION_STATUS_CLASSES,
  EXECUTION_STATUS_LABELS,
  doneTaskIds,
  executionPhaseStatus,
  executionTaskStatus,
  type ExecutionTaskStatus,
} from "@/lib/projectGuideStatus";
import {
  executionContextFromProject,
  playbookForCategory,
  resolvePlaybookTasks,
} from "@/convex/roadmapPlaybooks";

const DAY_MS = 24 * 60 * 60 * 1000;

const SCENARIO_STYLES: Record<string, { active: string; badge: string; dot: string }> = {
  economique: {
    active: "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  standard: {
    active: "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    dot: "bg-blue-500",
  },
  premium: {
    active: "border-violet-500/50 bg-violet-500/10 text-violet-700 dark:text-violet-400",
    badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
    dot: "bg-violet-500",
  },
};

const JOURNEY = [
  { label: "Terrain", phase: "phase_01" },
  { label: "Faisabilité", phase: "phase_02" },
  { label: "Architecture", phase: "phase_03" },
  { label: "Études", phase: "phase_03" },
  { label: "Autorisations", phase: "phase_04" },
  { label: "Budget", phase: "phase_05" },
  { label: "Matériaux", phase: "phase_05" },
  { label: "Entreprises", phase: "phase_06" },
  { label: "Planning", phase: "phase_07" },
  { label: "Construction", phase: "phase_08" },
  { label: "Contrôle", phase: "phase_09" },
  { label: "Réception", phase: "phase_10" },
];

// ─── Page principale ─────────────────────────────────────────────────────────

export default function ProjectGuide() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const paramProject = params.get("project");

  const projectsQuery = useQuery(api.projects.getUserProjects, {});
  // Tableau stable : évite de recalculer le filtre (et de relancer l'effet de
  // sélection) à chaque rendu pendant le chargement de la liste.
  const allProjects = useMemo(() => projectsQuery ?? [], [projectsQuery]);
  const [projectId, setProjectId] = useState<string | null>(paramProject);

  // « Exécution & Suivi » n'appartient qu'aux parcours complets (groupes A et
  // D) : seuls ces projets sont proposés ici. Un projet des groupes B ou C
  // (coût estimatif → mise en relation) conserve toutes ses données, mais ne
  // peut pas ouvrir cette étape, même par une URL directe.
  const projects = useMemo(
    () => allProjects.filter((p) => canAccessJourneyStep(p.category, "execution")),
    [allProjects],
  );
  const requestedProject = allProjects.find((p) => p._id === projectId) ?? null;
  const executionAllowed =
    !!requestedProject && canAccessJourneyStep(requestedProject.category, "execution");
  const blockedByGroup = !!requestedProject && !executionAllowed;

  // Aucune lecture de feuille de route pour une étape non autorisée.
  const roadmapData = useQuery(
    api.roadmap.getRoadmap,
    projectId && executionAllowed ? { projectId: projectId as any } : "skip",
  );

  const generate = useMutation(api.roadmap.generateRoadmapForProject);
  const toggleItem = useMutation(api.roadmap.togglePhaseItem);
  const updateTask = useMutation(api.roadmap.updatePlanningTask);
  const setScenario = useMutation(api.roadmap.setBudgetScenario);
  const addExpense = useMutation(api.roadmap.addControlExpense);
  const deleteExpense = useMutation(api.roadmap.deleteControlExpense);
  const addIssue = useMutation(api.roadmap.addControlIssue);
  const resolveIssue = useMutation(api.roadmap.resolveControlIssue);
  const addObservation = useMutation(api.roadmap.addControlObservation);
  const addPhoto = useMutation(api.roadmap.addControlPhoto);
  const deletePhoto = useMutation(api.roadmap.deleteControlPhoto);
  const generateDocument = useMutation(api.roadmap.generateDocument);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  // Téléchargement PDF : contrôle centralisé (réservé au forfait payant Client Pro).
  const pdfGate = usePdfGate();

  const [tab, setTab] = useState("apercu");
  const [generating, setGenerating] = useState(false);
  const [expense, setExpense] = useState({ label: "", amount: "", category: "Gros œuvre" });
  const [issue, setIssue] = useState({ title: "", severity: "warning" as "info" | "warning" | "critical", description: "" });
  const [observation, setObservation] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoStage, setPhotoStage] = useState<"avant" | "pendant" | "apres">("pendant");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!projectId && projects.length > 0) setProjectId(projects[0]._id);
  }, [projects, projectId]);

  const selectedProject = projects.find((p) => p._id === projectId) ?? null;

  usePageSEO({
    title: "Guide construction A-Z - batibuild",
    description: "Feuille de route complète et personnalisée de votre projet de construction : phases, démarches, budget, planning, contrôle et IA prédictive.",
  });

  const roadmap: Roadmap | null = roadmapData?.results ?? null;
  const input: RoadmapProjectInput | null = roadmapData?.input ?? null;
  const roadmapId = roadmapData?.roadmapId ?? null;
  const loading = roadmapData === undefined;

  const handleGenerate = async () => {
    if (!projectId) return;
    setGenerating(true);
    try {
      await generate({ projectId: projectId as any });
      toast.success("Feuille de route générée avec succès 🚀");
      setTab("apercu");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la génération.");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggle = (phaseId: string, itemId: string) => {
    if (!roadmapId) return;
    toggleItem({ roadmapId, phaseId, itemId }).catch((err: any) => toast.error(err.message || "Erreur"));
  };

  const handleTaskProgress = (taskId: string, progress: number) => {
    if (!roadmapId) return;
    const status = progress >= 100 ? ("done" as const) : progress > 0 ? ("in_progress" as const) : ("todo" as const);
    updateTask({ roadmapId, taskId, progress, status }).catch((err: any) => toast.error(err.message || "Erreur"));
  };

  const handlePhotoUpload = async (file: File) => {
    if (!roadmapId) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!res.ok) throw new Error("Upload échoué");
      const { storageId } = await res.json();
      await addPhoto({ roadmapId, storageId, caption: photoCaption || file.name, stage: photoStage });
      toast.success("Photo ajoutée au suivi du chantier");
      setPhotoCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleDocument = async (docId: string) => {
    if (!roadmap || !input) return;
    const doc = roadmap.documents.find((d) => d.id === docId);
    const content = buildDocumentContent(roadmap, input, docId);
    downloadText(`batibuild_${docId}.txt`, content);
    if (roadmapId) {
      generateDocument({ roadmapId, documentId: docId }).catch(() => {});
      toast.success(`« ${doc?.title ?? docId} » généré`);
    }
  };

  // ── Écran : étape réservée au parcours complet (accès direct refusé) ────
  if (blockedByGroup) {
    return (
      <main className="min-h-screen bg-background pb-10">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <ProjectStepUnavailable
            stepLabel="Exécution & suivi"
            projectName={requestedProject?.name}
            backHref={`/dashboard/project/${requestedProject?._id ?? ""}`}
            consultHref={
              requestedProject
                ? `/dashboard/professionals-directory?project=${requestedProject._id}`
                : null
            }
          />
        </div>
      </main>
    );
  }

  // ── Écran : aucun projet ────────────────────────────────────────────────
  if (projects.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
            <ArrowLeft className="h-3.5 w-3.5" /> Retour au tableau de bord
          </button>
          <Card className="mt-6 border-dashed border-border/50 bg-background/50">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 text-cyan-600 dark:text-cyan-400">
                <Rocket className="h-7 w-7" />
              </div>
              <CardTitle className="text-lg">
                {allProjects.length > 0
                  ? "Exécution & suivi indisponible pour vos projets"
                  : "Créez d'abord un projet de construction"}
              </CardTitle>
              <CardDescription className="text-xs max-w-md mx-auto">
                {allProjects.length > 0
                  ? "Cette étape est réservée aux projets du parcours complet (maison, appartement, villa, immeuble, local, studio, duplex, résidence touristique, projet immobilier neuf, rénovation complète). Vos projets du parcours simplifié restent disponibles pour l'estimation et la mise en relation."
                  : "Le Guide A-Z s'appuie sur les résultats de votre estimation. Lancez un premier projet pour générer votre feuille de route complète avec l'IA."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              {allProjects.length > 0 ? (
                <Button className="gap-2" onClick={() => navigate("/dashboard")}>
                  <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
                </Button>
              ) : (
                <Button className="gap-2" onClick={() => navigate("/dashboard/new")}>
                  <Plus className="h-4 w-4" /> Créer un projet de construction
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // ── Écran : sélection de projet ──────────────────────────────────────────
  if (!selectedProject) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
            <ArrowLeft className="h-3.5 w-3.5" /> Retour au tableau de bord
          </button>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 text-cyan-600 dark:text-cyan-400">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">Guide construction A-Z avec IA</h1>
              <p className="text-xs text-muted-foreground">Choisissez le projet à accompagner de A à Z.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-2">
            {projects.map((p) => (
              <button
                key={p._id}
                onClick={() => {
                  setProjectId(p._id);
                  navigate(`/dashboard/guide?project=${p._id}`, { replace: true });
                }}
                className="group flex items-center gap-3 rounded-xl border border-border/40 bg-background/50 p-3.5 text-left transition-all hover:border-cyan-500/40 hover:bg-cyan-500/5 cursor-pointer"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground group-hover:text-cyan-600">
                  <HardHat className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 shrink-0" /> {p.category}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-cyan-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ── Chargement ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-600 mx-auto" />
          <p className="mt-3 text-sm font-medium">Chargement du guide…</p>
        </div>
      </main>
    );
  }

  // ── Écran : génération ───────────────────────────────────────────────────
  if (!roadmap) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
            <ArrowLeft className="h-3.5 w-3.5" /> Retour au tableau de bord
          </button>
          <Card className="relative mt-6 overflow-hidden border border-cyan-500/25 bg-background/50">
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500" />
            <CardHeader className="text-center pt-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-emerald-500/10 text-cyan-600 dark:text-cyan-400">
                <Rocket className="h-8 w-8" />
              </div>
              <Badge variant="outline" className="mx-auto w-fit gap-1 border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-[10px]">
                <Sparkles className="h-3 w-3" /> Copilote numérique de construction
              </Badge>
              <CardTitle className="text-xl sm:text-2xl max-w-lg mx-auto leading-tight">
                Démarrer mon projet de construction avec IA
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
                L'IA analyse votre projet <strong className="text-foreground">{selectedProject.name}</strong> et génère une feuille de route
                personnalisée : 10 phases de A à Z, démarches administratives tunisiennes, budget à 3 scénarios, planning de chantier,
                détection des oublis, IA prédictive et documents prêts à l'emploi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Phases A-Z", value: "10" },
                  { label: "Démarches TN", value: "15" },
                  {
                    label: "Tâches d'exécution",
                    value: String(
                      resolvePlaybookTasks(
                        playbookForCategory(selectedProject.category),
                        executionContextFromProject(selectedProject),
                      ).length,
                    ),
                  },
                  { label: "Documents", value: "12" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border/30 bg-muted/15 p-2.5 text-center">
                    <p className="text-base font-bold text-cyan-600 dark:text-cyan-400">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-[10px] font-medium text-cyan-700 dark:text-cyan-400">
                Trame « {playbookForCategory(selectedProject.category).label} » — phases, tâches et
                équipements adaptés à ce type de projet.
              </p>
              <Button className="w-full h-9 gap-1.5 text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white" onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                {generating ? "Génération…" : "Démarrer mon projet avec IA"}
              </Button>
              <p className="text-center text-[10px] text-muted-foreground/60 leading-relaxed">
                Les données de prix, réglementations et démarches sont séparées du moteur IA et mises à jour indépendamment. Toute information réglementaire reste à vérifier auprès des autorités compétentes.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // ── Feuille de route : tableau de bord ───────────────────────────────────
  const activeScenario = roadmap.budget.scenarios.find((s) => s.key === roadmap.budget.selected) ?? roadmap.budget.scenarios[1];
  const maxDays = Math.max(1, ...roadmap.planning.map((t) => t.endDay));

  // Statuts calculés depuis les dates et dépendances réellement enregistrées.
  const doneIds = doneTaskIds(roadmap.planning);
  const taskStatusById = new Map(
    roadmap.planning.map((t) => [
      t.id,
      executionTaskStatus(t, { startDate: roadmap.summary.startDate, doneTaskIds: doneIds }),
    ]),
  );
  const nextTask = roadmap.planning.find((t) => taskStatusById.get(t.id) !== "done");

  // Contexte réel du projet : type, niveaux et surfaces issus des données.
  const levels = roadmap.execution?.levels ?? roadmap.project.levels ?? [];
  const levelSurfaces = levels.map((l) => `${l.label}${l.surface ? ` ${l.surface} m²` : ""}`).join(" · ");
  const remainingBudget = roadmap.summary.plannedBudget - roadmap.summary.budgetConsumed;

  // Groupes du planning : phases d'exécution de la trame du type de projet.
  // Repli sur une phase unique pour une feuille de route enregistrée avant
  // l'arrivée des trames par type (la progression reste intacte).
  const executionGroups = roadmap.execution?.phases?.length
    ? roadmap.execution.phases
    : [
        {
          key: "global" as const,
          title: "Planning des travaux",
          description: "Tâches enregistrées pour ce projet.",
          taskIds: roadmap.planning.map((t) => t.id),
          progress: 0,
          status: "todo" as const,
          startDay: 0,
          endDay: maxDays,
          budget: roadmap.summary.plannedBudget,
        },
      ];

  return (
    <main className="min-h-screen bg-background pb-10">
        <ClientProPaywall>
      {pdfGate.dialog}
      <div className="mx-auto max-w-6xl px-3 sm:px-5 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* En-tête — l'en-tête projet unifié remplace l'ancien en-tête de
            fonctionnalité : « Nom du projet : Mon projet de A à Z ». */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/dashboard")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Rocket className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold tracking-tight truncate">
                {roadmap.project.name}
                <span className="font-normal text-muted-foreground"> : Mon projet de A à Z</span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                {roadmap.project.categoryLabel}
                {roadmap.project.regionLabel ? ` · ${roadmap.project.regionLabel}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1 lg:pb-0">
            <Select value={selectedProject._id} onValueChange={(v) => setProjectId(v)}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue placeholder="Changer de projet" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p._id} value={p._id} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Régénérer
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => pdfGate.requestPdfDownload(() => exportRoadmapPdf(roadmap))}>
              <Download className="h-3.5 w-3.5" /> Rapport PDF
            </Button>
          </div>
        </div>

        {/* Contexte du projet — le type, la surface, les niveaux et le scénario
            pilotent la trame d'exécution : ils restent visibles en permanence. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <ContextTile
            icon={HardHat}
            label="Type de projet"
            value={roadmap.project.categoryLabel}
            hint={`Trame : ${roadmap.execution?.label ?? "générique"}`}
          />
          <ContextTile
            icon={Ruler}
            label="Surface couverte"
            value={roadmap.project.surface ? `${roadmap.project.surface} m²` : "—"}
            hint={roadmap.project.surfaceTotale ? `Terrain : ${roadmap.project.surfaceTotale} m²` : undefined}
          />
          <ContextTile
            icon={Layers}
            label="Niveaux"
            value={`${roadmap.project.floors ?? 1} niveau${(roadmap.project.floors ?? 1) > 1 ? "x" : ""}`}
            hint={levelSurfaces || "RDC"}
          />
          <ContextTile
            icon={Wallet}
            label="Scénario budgétaire"
            value={roadmap.project.scenarioLabel ?? activeScenario.label}
            hint={fmtTnd(activeScenario.totalCost)}
          />
          <ContextTile
            icon={CalendarRange}
            label="Reste à dépenser"
            value={fmtTnd(remainingBudget)}
            hint={`${fmtTnd(roadmap.summary.budgetConsumed)} dépensés sur ${fmtTnd(roadmap.summary.plannedBudget)}`}
          />
        </div>

        {/* Journey du projet — parcours linéaire persistant (PDF par étape +
            « Suivant → »). L'en-tête projet est déjà affiché juste au-dessus. */}
        {selectedProject && (
          <ProjectJourneyNav
            projectId={selectedProject._id}
            category={selectedProject.category}
            showProjectHeader={false}
            maxWidthClassName="max-w-6xl"
          />
        )}

        {/* Parcours (barre de progression UX) */}
        <div className="rounded-xl border border-border/40 bg-background/50 p-3 sm:p-4 overflow-x-auto scrollbar-none">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Target className="h-3 w-3" /> Progression des phases
          </p>
          <div className="flex min-w-[760px] items-center">
            {JOURNEY.map((step, i) => {
              const phase = roadmap.phases.find((p) => p.id === step.phase);
              const done = phase?.status === "done";
              const active = phase?.status === "in_progress";
              return (
                <div key={i} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold transition-colors ${
                        done ? "border-emerald-500 bg-emerald-500 text-white" : active ? "border-cyan-500 bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" : "border-border/50 bg-muted/20 text-muted-foreground/50"
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className={`text-[9px] font-medium whitespace-nowrap ${done ? "text-emerald-600 dark:text-emerald-400" : active ? "text-cyan-600 dark:text-cyan-400" : "text-muted-foreground/50"}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < JOURNEY.length - 1 && <div className={`h-px flex-1 mb-4 ${done ? "bg-emerald-500/60" : "bg-border/60"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        <RoadmapOverview roadmap={roadmap} activeScenario={activeScenario} nextTask={nextTask} />

        {/* Onglets */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-3">
          <TabsList className="w-full sm:w-auto h-auto flex-wrap justify-start bg-muted/30 p-1">
            {[
              { id: "apercu", label: "Phases A-Z", icon: Rocket },
              { id: "demarches", label: "Démarches", icon: FileCheck },
              { id: "budget", label: "Budget", icon: Wallet },
              { id: "planning", label: "Planning", icon: CalendarRange },
              { id: "construction", label: "Construction", icon: HardHat },
              { id: "controle", label: "Contrôle", icon: Camera },
              { id: "verification", label: "Vérification", icon: CheckSquare },
              { id: "ia", label: "IA prédictive", icon: Sparkles },
              { id: "documents", label: "Documents", icon: FileText }
            ].map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="gap-1.5 text-[11px] data-[state=active]:bg-background">
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Phases ── */}
          <TabsContent value="apercu" className="space-y-2">
            {roadmap.phases.map((phase) => (
              <Card key={phase.id} className="border-border/40 bg-background/50">
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${phase.status === "done" ? "bg-emerald-500/10 text-emerald-600" : phase.status === "in_progress" ? "bg-cyan-500/10 text-cyan-600" : "bg-muted/40 text-muted-foreground"}`}>
                      <PhaseIcon name={phase.icon} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight">
                        Phase {String(phase.number).padStart(2, "0")} — {phase.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{phase.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold tabular-nums">{phase.progress}%</span>
                      <Progress value={phase.progress} className="hidden sm:block w-16 h-1.5" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-1">
                  <PhaseList items={phase.items} phaseId={phase.id} onToggle={(itemId) => handleToggle(phase.id, itemId)} />
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Démarches ── */}
          <TabsContent value="demarches" className="space-y-2">
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              Checklist adaptée à la Tunisie (gouvernorats, municipalités, SONEDE, STEG, Conservation foncière…). Les organismes, délais et frais sont indicatifs —
              vérifiez toujours les exigences auprès des autorités compétentes avant de vous engager.
            </div>
            {roadmap.adminSteps.map((a) => (
              <Card key={a.id} className={`border-border/40 bg-background/50 ${a.status === "done" ? "opacity-70" : ""}`}>
                <CardContent className="p-3 sm:p-4">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <Checkbox checked={a.status === "done"} onCheckedChange={() => handleToggle("phase_04", a.id)} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <p className={`text-xs font-semibold ${a.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                          {a.order}. {a.title}
                        </p>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-px bg-background/60">
                          {a.organisme}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                        <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {a.delai}</span>
                        <span className="font-medium text-foreground/70">{fmtTnd(a.frais)}</span>
                      </p>
                      {a.note && <p className="text-[10px] text-muted-foreground/70 mt-1 leading-snug">💡 {a.note}</p>}
                    </div>
                  </label>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Budget ── */}
          <TabsContent value="budget" className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {roadmap.budget.scenarios.map((s) => (
                <button
                  key={s.key}
                  onClick={() => roadmapId && setScenario({ roadmapId, scenario: s.key }).catch(() => {})}
                  className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${roadmap.budget.selected === s.key ? SCENARIO_STYLES[s.key].active : "border-border/40 bg-background/50 hover:border-border/70"}`}
                >
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold">
                    <span className={`h-2 w-2 rounded-full ${SCENARIO_STYLES[s.key].dot}`} /> {s.label}
                  </p>
                  <p className="mt-1 text-sm font-bold tabular-nums">{fmtTnd(s.totalCost)}</p>
                  <p className="text-[9px] text-muted-foreground">{fmtTnd(s.costPerM2)}/m²</p>
                </button>
              ))}
            </div>
            <BudgetAllocation roadmap={roadmap} />
          </TabsContent>

          {/* ── Planning ── */}
          <TabsContent value="planning" className="space-y-3">
            <Card className="border-border/40 bg-background/50">
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm">Diagramme de Gantt — {maxDays} jours de travaux</CardTitle>
                <CardDescription className="text-[10px]">
                  Démarrage estimé au {fmtDate(roadmap.summary.startDate)} · fin estimée au {fmtDate(roadmap.summary.endDate)}.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <Gantt roadmap={roadmap} />
              </CardContent>
            </Card>
            <div className="space-y-3">
              {executionGroups.map((group) => {
                const groupTasks = roadmap.planning.filter((t) => group.taskIds.includes(t.id));
                if (groupTasks.length === 0) return null;
                const statuses = groupTasks.map((t) => taskStatusById.get(t.id) ?? "todo");
                const progress = Math.round(groupTasks.reduce((a, t) => a + t.progress, 0) / groupTasks.length);
                return (
                  <Card key={group.key} className="border-border/40 bg-background/50">
                    <CardHeader className="p-3 sm:p-4 pb-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-tight">{group.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {groupTasks.length} tâche(s) · J+{group.startDay} → J+{group.endDay} ·{" "}
                            {fmtTnd(groupTasks.reduce((a, t) => a + t.cost, 0))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={executionPhaseStatus(statuses)} />
                          <span className="text-[11px] font-bold tabular-nums">{progress}%</span>
                        </div>
                      </div>
                      <Progress value={progress} className="mt-2 h-1 [&>div]:bg-cyan-500" />
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-1 space-y-1.5">
                      {groupTasks.map((task) => (
                        <div key={task.id} className="rounded-lg border border-border/30 bg-muted/10 p-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className={`text-xs font-semibold truncate ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                                  {task.title}
                                </p>
                                <StatusBadge status={taskStatusById.get(task.id) ?? "todo"} />
                              </div>
                              <p className="text-[10px] text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {task.durationDays} j</span>
                                <span className="flex items-center gap-1">
                                  <CalendarRange className="h-2.5 w-2.5" />{" "}
                                  {fmtDate(roadmap.summary.startDate + task.startDay * DAY_MS)} →{" "}
                                  {fmtDate(roadmap.summary.startDate + task.endDay * DAY_MS)}
                                </span>
                                <span>{task.responsible}</span>
                                <span className="font-medium text-foreground/70">{fmtTnd(task.cost)}</span>
                                {task.completedAt && (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    Réalisé le {fmtDate(task.completedAt)}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={10}
                                value={task.progress}
                                onChange={(e) => handleTaskProgress(task.id, Number(e.target.value))}
                                className="w-28 h-1.5 cursor-pointer accent-cyan-600"
                              />
                              <span className="w-9 text-right text-[11px] font-bold tabular-nums">{task.progress}%</span>
                            </div>
                          </div>
                          <Progress value={task.progress} className="mt-2 h-1 [&>div]:bg-cyan-500" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Construction — phases propres au type de projet ── */}
          <TabsContent value="construction" className="space-y-3">
            <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/[0.04] p-3">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <HardHat className="h-4 w-4 text-cyan-600" /> {roadmap.execution?.title ?? "Travaux"}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {roadmap.execution?.description ?? "Travaux enregistrés pour ce projet."}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                {roadmap.execution?.taskCount ?? roadmap.construction.length} tâche(s) ·{" "}
                {roadmap.execution?.totalDays ?? maxDays} jours estimés ·{" "}
                {roadmap.project.surface ? `${roadmap.project.surface} m²` : "surface non renseignée"}
                {levelSurfaces ? ` · ${levelSurfaces}` : ""}
              </p>
            </div>

            {roadmap.materials && roadmap.materials.length > 0 && (
              <Card className="border-border/40 bg-background/50">
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-600" /> Matériaux prévus — issus de l'estimation
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    Quantités réellement chiffrées dans le devis du projet ({roadmap.materials.length} référence(s)).
                    Les états commandé / livré / utilisé sont saisis dans le suivi des matériaux du projet.
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-64 overflow-y-auto p-3 sm:p-4 pt-0">
                  <div className="grid gap-1 sm:grid-cols-2">
                    {roadmap.materials.map((m) => (
                      <div key={`${m.name}-${m.unit}`} className="flex items-center justify-between gap-2 rounded-md border border-border/30 bg-muted/10 px-2 py-1.5">
                        <span className="min-w-0 truncate text-[11px]" title={`${m.name} — ${m.category}`}>{m.name}</span>
                        <span className="shrink-0 text-[10px] font-semibold tabular-nums text-muted-foreground">
                          {m.quantity} {m.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {executionGroups.map((group) => {
              const groupSteps = roadmap.construction.filter((c) => group.taskIds.includes(c.id));
              if (groupSteps.length === 0) return null;
              const groupPlan = roadmap.planning.filter((t) => group.taskIds.includes(t.id));
              const progress = groupPlan.length
                ? Math.round(groupPlan.reduce((a, t) => a + t.progress, 0) / groupPlan.length)
                : Math.round((groupSteps.filter((c) => c.status === "done").length / groupSteps.length) * 100);
              const status = executionPhaseStatus(groupPlan.map((t) => taskStatusById.get(t.id) ?? "todo"));
              return (
                <Card key={group.key} className="border-border/40 bg-background/50">
                  <CardHeader className="p-3 sm:p-4 pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight">{group.title}</p>
                        <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{group.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={status as ExecutionTaskStatus} />
                        <span className="text-[11px] font-bold tabular-nums">{progress}%</span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span>{groupSteps.length} tâche(s)</span>
                      <span>J+{group.startDay} → J+{group.endDay}</span>
                      <span className="font-medium text-foreground/70">{fmtTnd(group.budget)}</span>
                    </div>
                    <Progress value={progress} className="mt-2 h-1 [&>div]:bg-cyan-500" />
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-1">
                    <Accordion type="single" collapsible className="w-full">
                      {groupSteps.map((c) => {
                        const plan = roadmap.planning.find((t) => t.id === c.id);
                        return (
                          <AccordionItem key={c.id} value={c.id} className="border-border/40 rounded-xl mb-1.5 border px-1">
                            <AccordionTrigger className="px-2">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <Checkbox
                                  checked={c.status === "done"}
                                  onCheckedChange={() => handleToggle("phase_08", c.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="shrink-0"
                                />
                                <div className="min-w-0 flex-1 text-left">
                                  <p className={`text-xs font-semibold truncate ${c.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                                    {c.order}. {c.title}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {c.dureeJours} j · {fmtTnd(c.budgetEstime)}
                                    {c.levelSurface ? ` · ${c.levelSurface} m²` : ""}
                                    {plan ? ` · ${plan.responsible}` : ""}
                                    {c.completedAt ? ` · terminé le ${fmtDate(c.completedAt)}` : ""}
                                  </p>
                                </div>
                                <StatusBadge status={taskStatusById.get(c.id) ?? (c.status === "done" ? "done" : "todo")} />
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-2">
                              <div className="space-y-3 text-[11px]">
                                <Section label="Objectif" items={[c.objectif]} />
                                <Section label="Travaux à réaliser" items={c.travaux} />
                                <Section label="Matériaux nécessaires" items={c.materiaux} />
                                <Section label="Main-d'œuvre" items={c.mainOeuvre} />
                                <Section label="Outillage" items={c.outillage} />
                                <Section label="Contrôles qualité" items={c.controles} tone="emerald" />
                                <Section label="Risques" items={c.risques} tone="red" />
                                <Section label="Conditions de validation" items={c.conditions} tone="amber" />
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ── Contrôle ── */}
          <TabsContent value="controle" className="space-y-3">
            <SiteDiagnostic roadmap={roadmap} />
            <div className="grid md:grid-cols-2 gap-3">
              {/* Photos */}
              <Card className="border-border/40 bg-background/50">
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Camera className="h-4 w-4 text-cyan-600" /> Photos du chantier</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Input placeholder="Légende (optionnel)" value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)} className="h-9 min-w-0 flex-1 text-xs" />
                    <Select value={photoStage} onValueChange={(v) => setPhotoStage(v as "avant" | "pendant" | "apres")}>
                      <SelectTrigger className="h-9 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="avant" className="text-xs">Avant</SelectItem>
                        <SelectItem value="pendant" className="text-xs">Pendant</SelectItem>
                        <SelectItem value="apres" className="text-xs">Après</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-9 shrink-0 gap-1.5 text-xs" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Ajouter
                    </Button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
                  </div>
                  {roadmap.control.photos.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/60 py-2">Aucune photo. Documentez chaque étape clé pour la traçabilité et l'assurance.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {roadmap.control.photos.map((p) => (
                        <div key={p.id} className="group relative overflow-hidden rounded-lg border border-border/30">
                          {p.url ? (
                            <img src={p.url} alt={p.caption} className="h-20 w-full object-cover" />
                          ) : (
                            <div className="flex h-20 items-center justify-center bg-muted/20 text-muted-foreground/50 text-[9px]">Photo</div>
                          )}
                          {p.stage && (
                            <span className="absolute top-1 left-1 rounded bg-black/60 px-1 py-px text-[8px] font-medium text-white">
                              {p.stage === "apres" ? "Après" : p.stage === "avant" ? "Avant" : "Pendant"}
                            </span>
                          )}
                          {p.caption && <p className="truncate px-1.5 py-0.5 text-[9px] bg-background/90">{p.caption}</p>}
                          <button
                            onClick={() => roadmapId && deletePhoto({ roadmapId, photoId: p.id }).catch(() => {})}
                            className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Problèmes */}
              <Card className="border-border/40 bg-background/50">
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Problèmes signalés</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 space-y-2">
                  <div className="space-y-1.5">
                    <Input placeholder="Titre du problème" value={issue.title} onChange={(e) => setIssue({ ...issue, title: e.target.value })} className="h-9 text-xs" />
                    <div className="flex gap-1.5">
                      <Select value={issue.severity} onValueChange={(v) => setIssue({ ...issue, severity: v as any })}>
                        <SelectTrigger className="h-9 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info" className="text-xs">Info</SelectItem>
                          <SelectItem value="warning" className="text-xs">Avertissement</SelectItem>
                          <SelectItem value="critical" className="text-xs">Critique</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="h-9 flex-1 gap-1.5 text-xs"
                        disabled={!issue.title.trim()}
                        onClick={() => {
                          if (!roadmapId) return;
                          addIssue({ roadmapId, title: issue.title.trim(), severity: issue.severity, description: issue.description })
                            .then(() => setIssue({ title: "", severity: "warning", description: "" }))
                            .catch((err: any) => toast.error(err.message || "Erreur"));
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" /> Signaler
                      </Button>
                    </div>
                  </div>
                  {roadmap.control.issues.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/60 py-2">Aucun problème signalé.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {roadmap.control.issues.map((i) => (
                        <div key={i.id} className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 ${i.status === "résolu" ? "border-emerald-500/25 bg-emerald-500/5" : i.severity === "critical" ? "border-red-500/30 bg-red-500/5" : i.severity === "warning" ? "border-amber-500/30 bg-amber-500/5" : "border-border/30 bg-muted/10"}`}>
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-medium ${i.status === "résolu" ? "line-through text-muted-foreground" : ""}`}>{i.title}</p>
                            {i.description && <p className="text-[10px] text-muted-foreground mt-0.5">{i.description}</p>}
                            <p className="text-[9px] text-muted-foreground/60 mt-0.5">{fmtDate(i.createdAt)}</p>
                          </div>
                          <button
                            onClick={() => roadmapId && resolveIssue({ roadmapId, issueId: i.id }).catch(() => {})}
                            className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-medium cursor-pointer transition-colors ${i.status === "résolu" ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10" : "border-border/40 text-muted-foreground hover:text-foreground"}`}
                          >
                            {i.status === "résolu" ? "Résolu" : "Résoudre"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Observations */}
              <Card className="border-border/40 bg-background/50">
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><CheckSquare className="h-4 w-4 text-blue-600" /> Observations</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 space-y-2">
                  <div className="flex gap-2">
                    <Input placeholder="Noter une observation de chantier…" value={observation} onChange={(e) => setObservation(e.target.value)} className="h-9 text-xs" />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 shrink-0 gap-1.5 text-xs"
                      disabled={!observation.trim()}
                      onClick={() => {
                        if (!roadmapId) return;
                        addObservation({ roadmapId, text: observation.trim() })
                          .then(() => setObservation(""))
                          .catch((err: any) => toast.error(err.message || "Erreur"));
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {roadmap.control.observations.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/60 py-2">Aucune observation.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {roadmap.control.observations.map((o) => (
                        <div key={o.id} className="rounded-lg border border-border/30 bg-muted/10 px-2.5 py-2">
                          <p className="text-[11px] leading-snug">{o.text}</p>
                          <p className="text-[9px] text-muted-foreground/60 mt-0.5">{fmtDate(o.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dépenses */}
              <Card className="border-border/40 bg-background/50">
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Wallet className="h-4 w-4 text-emerald-600" /> Dépenses du chantier</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    <Input placeholder="Libellé" value={expense.label} onChange={(e) => setExpense({ ...expense, label: e.target.value })} className="h-9 text-xs" />
                    <Input placeholder="Montant TND" type="number" min={0} value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value })} className="h-9 text-xs" />
                    <Select value={expense.category} onValueChange={(v) => setExpense({ ...expense, category: v })}>
                      <SelectTrigger className="h-9 col-span-2 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Gros œuvre", "Second œuvre", "Matériaux", "Main-d'œuvre", "Équipements", "Transport", "Études & permis"].map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-9 gap-1.5 text-xs"
                    disabled={!expense.label.trim() || !expense.amount}
                    onClick={() => {
                      if (!roadmapId) return;
                      addExpense({ roadmapId, label: expense.label.trim(), amount: Number(expense.amount), category: expense.category })
                        .then(() => setExpense({ label: "", amount: "", category: "Gros œuvre" }))
                        .catch((err: any) => toast.error(err.message || "Erreur"));
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Enregistrer la dépense
                  </Button>
                  {roadmap.control.expenses.length > 0 && (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto">
                      {roadmap.control.expenses.map((e) => (
                        <div key={e.id} className="group flex items-center gap-2 rounded-lg border border-border/30 bg-muted/10 px-2.5 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium truncate">{e.label}</p>
                            <p className="text-[9px] text-muted-foreground">{e.category} · {fmtDate(e.date)}</p>
                          </div>
                          <span className="text-[11px] font-bold tabular-nums">{fmtTnd(e.amount)}</span>
                          <button onClick={() => roadmapId && deleteExpense({ roadmapId, expenseId: e.id }).catch(() => {})} className="text-muted-foreground/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2 text-xs">
                    <span className="font-medium text-muted-foreground">Total consommé</span>
                    <span className="font-bold tabular-nums">{fmtTnd(roadmap.summary.budgetConsumed)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Historique des modifications */}
              <Card className="border-border/40 bg-background/50 md:col-span-2">
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" /> Historique des modifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  {(roadmap.control.history ?? []).length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/60 py-2">
                      Aucune modification enregistrée. Chaque étape cochée, dépense, photo ou observation
                      viendra alimenter cet historique.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {(roadmap.control.history ?? []).map((h) => (
                        <div key={h.id} className="flex items-start gap-2 rounded-lg border border-border/30 bg-muted/10 px-2.5 py-1.5">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] leading-snug">
                              <span className="font-semibold">{h.action}</span>
                              {h.detail ? ` — ${h.detail}` : ""}
                            </p>
                            <p className="text-[9px] text-muted-foreground/60">{fmtDate(h.at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Vérification ── */}
          <TabsContent value="verification" className="space-y-3">
            <div className="grid md:grid-cols-3 gap-2">
              <Card className="border-emerald-500/25 bg-emerald-500/[0.03]">
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Complets</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 space-y-1">
                  {roadmap.omissions.green.length === 0 && <p className="text-[10px] text-muted-foreground/60">Aucun élément complet pour l'instant.</p>}
                  {roadmap.omissions.green.map((g, i) => (
                    <p key={i} className="flex items-start gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3 shrink-0 mt-px" /> {g}</p>
                  ))}
                </CardContent>
              </Card>
              <Card className="border-amber-500/25 bg-amber-500/[0.03]">
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400"><AlertTriangle className="h-4 w-4" /> À vérifier</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 space-y-1">
                  {roadmap.omissions.orange.length === 0 && <p className="text-[10px] text-muted-foreground/60">Rien à vérifier.</p>}
                  {roadmap.omissions.orange.map((o, i) => (
                    <p key={i} className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400"><AlertTriangle className="h-3 w-3 shrink-0 mt-px" /> {o}</p>
                  ))}
                </CardContent>
              </Card>
              <Card className="border-red-500/25 bg-red-500/[0.03]">
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400"><XCircle className="h-4 w-4" /> Manquants / problèmes</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 space-y-1">
                  {roadmap.omissions.red.length === 0 && <p className="text-[10px] text-muted-foreground/60">Aucun élément manquant.</p>}
                  {roadmap.omissions.red.map((r, i) => (
                    <p key={i} className="flex items-start gap-1.5 text-[11px] text-red-600 dark:text-red-400"><XCircle className="h-3 w-3 shrink-0 mt-px" /> {r}</p>
                  ))}
                </CardContent>
              </Card>
            </div>
            <Card className="border-border/40 bg-background/50">
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-cyan-600" /> Actions prioritaires</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 space-y-1.5">
                {roadmap.omissions.priorityActions.map((a, i) => (
                  <p key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-[9px] font-bold text-cyan-600">{i + 1}</span>
                    {a}
                  </p>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── IA prédictive ── */}
          <TabsContent value="ia" className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-2">
              <PredictionCard icon={TrendingUp} title={roadmap.predictions.budgetOverrun.label} value={roadmap.predictions.budgetOverrun.value} confidence={roadmap.predictions.budgetOverrun.confidence} explanation={roadmap.predictions.budgetOverrun.explanation} tone="amber" />
              <PredictionCard icon={Clock} title={roadmap.predictions.delay.label} value={roadmap.predictions.delay.value} confidence={roadmap.predictions.delay.confidence} explanation={roadmap.predictions.delay.explanation} tone="red" />
            </div>
            <CostEvolutionCard points={roadmap.predictions.costEvolution} />
            <Card className="border-border/40 bg-background/50">
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Gauge className="h-4 w-4 text-violet-600" /> Coût final probable</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 space-y-2">
                <div className="flex flex-wrap items-end gap-3">
                  <p className="text-2xl font-bold tabular-nums">{fmtTnd(roadmap.predictions.finalCost.estimate)}</p>
                  <Badge variant="outline" className="text-[10px] border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    Confiance {roadmap.predictions.finalCost.confidence}%
                  </Badge>
                </div>
                <Progress value={roadmap.predictions.finalCost.confidence} className="h-1.5 [&>div]:bg-violet-500" />
                <div className="rounded-lg border border-border/30 bg-muted/10 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Hypothèses utilisées</p>
                  <ul className="space-y-1">
                    {roadmap.predictions.finalCost.assumptions.map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-violet-500" /> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Documents ── */}
          <TabsContent value="documents" className="space-y-2">
            {roadmap.documents.map((d) => (
              <Card key={d.id} className="border-border/40 bg-background/50">
                <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{d.title}</p>
                    <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{d.description}</p>
                  </div>
                  {d.generatedAt && <Badge variant="outline" className="shrink-0 text-[9px] border-emerald-500/30 bg-emerald-500/10 text-emerald-600">Généré</Badge>}
                  <Button size="sm" variant="outline" className="shrink-0 h-8 gap-1.5 text-xs" onClick={() => handleDocument(d.id)}>
                    <Download className="h-3.5 w-3.5" /> Générer
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Avertissement */}
        <div className="rounded-xl border border-border/40 bg-background/50 p-3 sm:p-4">
          <p className="text-[10px] leading-relaxed text-muted-foreground/70">{roadmap.disclaimer}</p>
        </div>
      </div>
            </ClientProPaywall>
</main>
  );
}

// ─── Petits composants ───────────────────────────────────────────────────────

/** Tuile de contexte : type, surface, niveaux, scénario, budget. */
function ContextTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/50 p-2.5">
      <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0" /> {label}
      </p>
      <p className="mt-0.5 text-xs font-bold leading-tight">{value}</p>
      {hint && (
        <p className="mt-0.5 truncate text-[9px] text-muted-foreground/70" title={hint}>
          {hint}
        </p>
      )}
    </div>
  );
}

/** Statut calculé d'une tâche ou d'une phase (jamais enregistré en base). */
function StatusBadge({ status }: { status: ExecutionTaskStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-1.5 py-px text-[9px] font-semibold ${EXECUTION_STATUS_CLASSES[status]}`}
    >
      {EXECUTION_STATUS_LABELS[status]}
    </span>
  );
}

function Section({ label, items, tone = "default" }: { label: string; items: string[]; tone?: "default" | "emerald" | "red" | "amber" }) {
  const dot = tone === "emerald" ? "bg-emerald-500" : tone === "red" ? "bg-red-500" : tone === "amber" ? "bg-amber-500" : "bg-muted-foreground/40";
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <ul className="space-y-0.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground/80 leading-snug">
            <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${dot}`} /> {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PredictionCard({ icon: Icon, title, value, confidence, explanation, tone }: { icon: LucideIcon; title: string; value: string; confidence: number; explanation: string; tone: "amber" | "red" }) {
  return (
    <Card className={`border-border/40 ${tone === "amber" ? "bg-amber-500/[0.03] border-amber-500/20" : "bg-red-500/[0.03] border-red-500/20"}`}>
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className={`h-4 w-4 ${tone === "amber" ? "text-amber-600" : "text-red-600"}`} /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 space-y-2">
        <div className="flex items-center gap-2">
          <Badge className={`text-[11px] capitalize ${tone === "amber" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30" : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30"}`}>{value}</Badge>
          <span className="text-[10px] text-muted-foreground">confiance {confidence}%</span>
        </div>
        <Progress value={confidence} className={`h-1.5 ${tone === "amber" ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"}`} />
        <p className="text-[11px] text-muted-foreground leading-snug">{explanation}</p>
      </CardContent>
    </Card>
  );
}
