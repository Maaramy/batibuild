import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Building2,
  CalendarRange,
  Camera,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Circle,
  ClipboardCheck,
  Clock,
  Download,
  DraftingCompass,
  FileCheck,
  FileText,
  Gauge,
  HardHat,
  KeyRound,
  Loader2,
  Map,
  MapPin,
  Plus,
  Rocket,
  Search,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { Roadmap, RoadmapProjectInput, RoadmapPhase, PhaseItem } from "@/convex/roadmapEngine";
import { exportRoadmapPdf } from "@/lib/roadmapReportPdf";

const fmtTnd = (n: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(n);

const fmtDate = (ts: number) => new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

const PHASE_ICONS: Record<string, LucideIcon> = {
  Map,
  Search,
  DraftingCompass,
  FileCheck,
  Wallet,
  Building2,
  CalendarRange,
  HardHat,
  Camera,
  KeyRound,
};

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

// ─── Contenu générable des documents ────────────────────────────────────────

function buildDocumentContent(roadmap: Roadmap, input: RoadmapProjectInput, docId: string): string {
  const L: string[] = [];
  const h = (t: string) => L.push(`\n## ${t}\n`);
  const meta = `${roadmap.project.name} · ${roadmap.project.categoryLabel}${roadmap.project.regionLabel ? ` · ${roadmap.project.regionLabel}` : ""} · ${fmtDate(Date.now())}\n`;

  switch (docId) {
    case "cahier_des_charges":
      h("Cahier des charges");
      L.push(meta);
      L.push(`Surface construite : ${roadmap.project.surface ?? "—"} m² · ${roadmap.project.floors ?? 1} niveau(x).`);
      L.push(`Budget de référence : ${fmtTnd(roadmap.budget.totalCost)}.`);
      h("Étapes de construction");
      roadmap.construction.forEach((c) => {
        L.push(`• ${c.title} (${c.dureeJours} j, ${fmtTnd(c.budgetEstime)})`);
        L.push(`  Travaux : ${c.travaux.join(" ; ")}`);
        L.push(`  Contrôles : ${c.controles.join(" ; ")}`);
      });
      break;
    case "checklist_chantier":
      h("Checklist chantier");
      L.push(meta);
      roadmap.construction.forEach((c) => L.push(`[ ] ${c.title} — ${c.controles.join(" ; ")}`));
      h("Démarches administratives");
      roadmap.adminSteps.forEach((a) => L.push(`[ ] ${a.title} (${a.organisme})`));
      break;
    case "planning":
      h("Planning des travaux");
      L.push(meta);
      roadmap.planning.forEach((t) =>
        L.push(`• ${t.title} — ${t.durationDays} j (J+${t.startDay} → J+${t.endDay}) · ${t.responsible} · ${fmtTnd(t.cost)}`),
      );
      break;
    case "budget_previsionnel":
      h("Budget prévisionnel");
      L.push(meta);
      roadmap.budget.scenarios.forEach((s) => {
        L.push(`\nScénario ${s.label} — ${fmtTnd(s.totalCost)} (${fmtTnd(s.costPerM2)}/m²)`);
        s.rows.forEach((r) => L.push(`  ${r.label} : ${r.pct} % — ${fmtTnd(r.amount)}`));
      });
      break;
    case "rapport_avancement":
      h("Rapport d'avancement");
      L.push(meta);
      L.push(`Progression globale : ${roadmap.progress} %.`);
      L.push(`Tâches : ${roadmap.summary.tasksDone}/${roadmap.summary.tasksTotal} terminées.`);
      roadmap.phases.forEach((p) => L.push(`Phase ${p.number} — ${p.title} : ${p.progress} %`));
      break;
    case "rapport_controle":
      h("Rapport de contrôle");
      L.push(meta);
      L.push(`Dépenses consommées : ${fmtTnd(roadmap.summary.budgetConsumed)} sur ${fmtTnd(roadmap.summary.plannedBudget)}.`);
      roadmap.control.issues.forEach((i) => L.push(`[${i.severity.toUpperCase()}] ${i.title} — ${i.status}`));
      roadmap.control.observations.forEach((o) => L.push(`• ${o.text} (${fmtDate(o.createdAt)})`));
      break;
    case "liste_materiaux":
      h("Liste des matériaux");
      L.push(meta);
      const breakdown = input.costEstimate?.breakdown ?? [];
      if (!breakdown.length) {
        L.push("Aucun quantitatif disponible — lancez l'estimation du projet pour obtenir la liste détaillée.");
      }
      breakdown.forEach((b) => {
        L.push(`\n${b.label} — ${fmtTnd(b.estimatedCost)}`);
        (b.items ?? []).forEach((it) => L.push(`  ${it.name} : ${it.quantity} ${it.unit} × ${it.unitPrice} = ${fmtTnd(it.totalPrice)}`));
      });
      break;
    case "demande_devis":
      h("Demande de devis");
      L.push(meta);
      L.push("Objet : consultation pour les lots suivants — veuillez fournir prix unitaires et délais.");
      roadmap.construction.forEach((c) => L.push(`• Lot ${c.order} : ${c.title} (${c.materiaux.join(", ")})`));
      L.push("\nCritères de sélection :");
      roadmap.companyCriteria.forEach((c) => L.push(`  ${c.label} : ${c.detail}`));
      break;
    case "comparatif_devis":
      h("Comparatif des devis");
      L.push(meta);
      L.push(`Tableau à remplir par lot :\n${roadmap.companyCriteria.map((c) => `| ${c.label}`).join("")}`);
      roadmap.companyCriteria.forEach((c) => L.push(`- ${c.label} : ${c.detail}`));
      break;
    case "pv_reception":
      h("Procès-verbal de réception");
      L.push(meta);
      L.push("Le soussigné, maître d'ouvrage, et l'entrepreneur, déclarent procéder à la réception des travaux.");
      L.push("Réserves éventuelles : ..........");
      L.push("Délai de levée des réserves : ..........");
      L.push("Signatures : ..........");
      break;
    case "liste_reserves":
      h("Liste des réserves");
      L.push(meta);
      L.push("[ ] Réserve — localisation : .......... / délai de levée : ..........");
      roadmap.construction.forEach((c) => L.push(`[ ] Vérifier : ${c.controles.join(" ; ")}`));
      break;
    case "rapport_final":
      h("Rapport final du projet");
      L.push(meta);
      L.push(`Progression finale : ${roadmap.progress} % · Budget : ${fmtTnd(roadmap.summary.plannedBudget)} · Durée : ${roadmap.summary.plannedDurationDays} jours.`);
      L.push(`Coût final probable (IA) : ${fmtTnd(roadmap.predictions.finalCost.estimate)} (confiance ${roadmap.predictions.finalCost.confidence} %).`);
      roadmap.phases.forEach((p) => L.push(`Phase ${p.number} — ${p.title} : ${p.progress} %`));
      break;
    default:
      h("Document");
      L.push(meta);
      L.push("Document généré depuis la feuille de route du projet.");
  }
  return L.join("\n");
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function PhaseIcon({ name, className }: { name: string; className?: string }) {
  const Icon = PHASE_ICONS[name] ?? Circle;
  return <Icon className={className} />;
}

function PhaseList({ items, phaseId, onToggle }: { items: PhaseItem[]; phaseId: string; onToggle: (itemId: string) => void }) {
  if (!items.length) return <p className="text-xs text-muted-foreground/70 py-2">Aucun élément.</p>;
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <label
          key={item.id}
          className="flex items-start gap-2.5 rounded-lg border border-border/30 bg-muted/10 px-2.5 py-2 transition-colors hover:bg-muted/25 cursor-pointer"
        >
          <Checkbox
            checked={item.status === "done"}
            onCheckedChange={() => onToggle(item.id)}
            className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-medium leading-snug ${item.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>
              {item.label}
              {item.auto && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full border border-primary/25 bg-primary/5 px-1.5 py-px text-[9px] font-semibold text-primary">
                  <Sparkles className="h-2 w-2" /> auto
                </span>
              )}
              {item.warning && (
                <span className="ml-1.5 text-[9px] font-medium text-amber-600 dark:text-amber-400" title="À vérifier par un professionnel / autorité">
                  ⚠ à vérifier
                </span>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground/70 leading-snug mt-0.5">{item.detail}</p>
          </div>
        </label>
      ))}
    </div>
  );
}

function Gantt({ roadmap }: { roadmap: Roadmap }) {
  const maxDays = Math.max(1, ...roadmap.planning.map((t) => t.endDay));
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px] space-y-1">
        {roadmap.planning.map((task) => (
          <div key={task.id} className="flex items-center gap-2">
            <div className="w-44 shrink-0 truncate text-[11px] font-medium text-foreground/80" title={task.title}>
              {task.title}
            </div>
            <div className="relative h-5 flex-1 rounded-md bg-muted/40 overflow-hidden">
              <div
                className={`absolute top-0 h-full rounded-md ${
                  task.status === "done" ? "bg-emerald-500/80" : task.status === "in_progress" ? "bg-amber-500/80" : "bg-blue-500/70"
                }`}
                style={{ left: `${(task.startDay / maxDays) * 100}%`, width: `${Math.max(2, (task.durationDays / maxDays) * 100)}%` }}
                title={`${task.title} : J+${task.startDay} → J+${task.endDay} · ${task.responsible}`}
              />
            </div>
            <div className="w-16 shrink-0 text-right text-[10px] text-muted-foreground tabular-nums">
              J+{task.endDay}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground/60">
        Jours ouvrés estimés (J+0 = démarrage). Dépendances enchaînées dans l'ordre logique — J+{maxDays} au total.
      </p>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function ProjectGuide() {
  usePageSEO({
    title: "Guide construction A-Z - batibuild App",
    description: "Feuille de route complète et personnalisée de votre projet de construction : phases, démarches, budget, planning, contrôle et IA prédictive.",
  });
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const paramProject = params.get("project");

  const projects = useQuery(api.projects.getUserProjects, {}) ?? [];
  const [projectId, setProjectId] = useState<string | null>(paramProject);
  const roadmapData = useQuery(api.roadmap.getRoadmap, projectId ? { projectId: projectId as any } : "skip");

  const generate = useMutation(api.roadmap.generateRoadmapForProject);
  const toggleItem = useMutation(api.roadmap.togglePhaseItem);
  const updateTask = useMutation(api.roadmap.updatePlanningTask);
  const setScenario = useMutation(api.roadmap.setBudgetScenario);
  const updateAllocation = useMutation(api.roadmap.updateBudgetAllocation);
  const addExpense = useMutation(api.roadmap.addControlExpense);
  const deleteExpense = useMutation(api.roadmap.deleteControlExpense);
  const addIssue = useMutation(api.roadmap.addControlIssue);
  const resolveIssue = useMutation(api.roadmap.resolveControlIssue);
  const addObservation = useMutation(api.roadmap.addControlObservation);
  const addPhoto = useMutation(api.roadmap.addControlPhoto);
  const deletePhoto = useMutation(api.roadmap.deleteControlPhoto);
  const generateDocument = useMutation(api.roadmap.generateDocument);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const [tab, setTab] = useState("apercu");
  const [generating, setGenerating] = useState(false);
  const [expense, setExpense] = useState({ label: "", amount: "", category: "Gros œuvre" });
  const [issue, setIssue] = useState({ title: "", severity: "warning" as "info" | "warning" | "critical", description: "" });
  const [observation, setObservation] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!projectId && projects.length > 0) setProjectId(projects[0]._id);
  }, [projects, projectId]);

  const selectedProject = projects.find((p) => p._id === projectId) ?? null;
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
      await addPhoto({ roadmapId, storageId, caption: photoCaption || file.name });
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
              <CardTitle className="text-lg">Créez d'abord un projet de construction</CardTitle>
              <CardDescription className="text-xs max-w-md mx-auto">
                Le Guide A-Z s'appuie sur les résultats de votre estimation. Lancez un premier projet pour générer votre feuille de route complète avec l'IA.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Button className="gap-2" onClick={() => navigate("/dashboard/new")}>
                <Plus className="h-4 w-4" /> Créer un projet de construction
              </Button>
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
                    <MapPin className="h-3 w-3 shrink-0" /> {p.category} · {p.surface ? `${p.surface} m²` : "surface non définie"}
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
                  { label: "Étapes chantier", value: "18" },
                  { label: "Documents", value: "12" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border/30 bg-muted/15 p-2.5 text-center">
                    <p className="text-base font-bold text-cyan-600 dark:text-cyan-400">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <Button className="w-full h-11 gap-2 text-sm bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white" onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                {generating ? "Génération de la feuille de route…" : "🚀 Démarrer mon projet de construction avec IA"}
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
  const nextTask = roadmap.planning.find((t) => t.status === "todo");

  return (
    <main className="min-h-screen bg-background pb-10">
      <div className="mx-auto max-w-6xl px-3 sm:px-5 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* En-tête */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/dashboard")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Rocket className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold tracking-tight truncate">Mon projet de A à Z</h1>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                {roadmap.project.name} · {roadmap.project.categoryLabel}
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
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => exportRoadmapPdf(roadmap)}>
              <Download className="h-3.5 w-3.5" /> Rapport PDF
            </Button>
          </div>
        </div>

        {/* Parcours (barre de progression UX) */}
        <div className="rounded-xl border border-border/40 bg-background/50 p-3 sm:p-4 overflow-x-auto scrollbar-none">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Target className="h-3 w-3" /> Où suis-je dans mon projet ?
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

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Card className="border-border/40 bg-background/50">
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Gauge className="h-3 w-3" /> Progression globale
              </p>
              <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums">{roadmap.progress}%</p>
              <Progress value={roadmap.progress} className="mt-2 h-1.5 [&>div]:bg-gradient-to-r [&>div]:from-cyan-500 [&>div]:to-emerald-500" />
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-background/50">
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Wallet className="h-3 w-3" /> Budget prévu
              </p>
              <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums">{fmtTnd(roadmap.summary.plannedBudget)}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{fmtTnd(activeScenario.costPerM2)}/m² · scénario {activeScenario.label}</p>
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-background/50">
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Consommé / écart
              </p>
              <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums">{fmtTnd(roadmap.summary.budgetConsumed)}</p>
              <p className={`mt-1 text-[10px] font-medium ${roadmap.summary.budgetGap > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {roadmap.summary.budgetGap > 0 ? `+${fmtTnd(roadmap.summary.budgetGap)} consommé` : `${fmtTnd(Math.abs(roadmap.summary.budgetGap))} de marge`}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-background/50">
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ClipboardCheck className="h-3 w-3" /> Tâches
              </p>
              <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums">
                {roadmap.summary.tasksDone}
                <span className="text-sm text-muted-foreground font-medium">/{roadmap.summary.tasksTotal}</span>
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground truncate">
                {nextTask ? `Prochaine : ${nextTask.title}` : "Toutes les tâches sont terminées"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alertes */}
        {roadmap.summary.alerts.length > 0 && (
          <div className="space-y-1.5">
            {roadmap.summary.alerts.map((a, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px] ${
                  a.severity === "critical" ? "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400" : a.severity === "warning" ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400" : "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400"
                }`}
              >
                {a.severity === "critical" ? <XCircle className="h-3.5 w-3.5 shrink-0 mt-px" /> : a.severity === "warning" ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" /> : <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-px" />}
                <span>{a.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Prochaines étapes */}
        <Card className="border-border/40 bg-background/50">
          <CardHeader className="p-3 sm:p-4 pb-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan-600" /> Que dois-je faire maintenant ?
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-2 space-y-1">
            {roadmap.nextSteps.map((s, i) => (
              <p key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-[9px] font-bold text-cyan-600">{i + 1}</span>
                {s}
              </p>
            ))}
          </CardContent>
        </Card>

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
              { id: "documents", label: "Documents", icon: FileText },
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
                  <p className="text-[9px] text-muted-foreground">{fmtTnd(s.costPerM2)}/m² · ×{s.multiplier}</p>
                </button>
              ))}
            </div>
            <Card className="border-border/40 bg-background/50">
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm">Répartition du budget — {activeScenario.label}</CardTitle>
                <CardDescription className="text-[10px]">
                  Ajustez les pourcentages en temps réel : les autres postes sont recalculés automatiquement.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 space-y-2">
                {activeScenario.rows.map((row) => (
                  <div key={row.key} className="rounded-lg border border-border/30 bg-muted/10 p-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-xs font-medium truncate">{row.label}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-semibold tabular-nums text-foreground/70">{fmtTnd(row.amount)}</span>
                        <span className="text-[10px] font-bold tabular-nums text-cyan-600 w-10 text-right">{row.pct}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={row.pct}
                        onChange={(e) => roadmapId && updateAllocation({ roadmapId, rowKey: row.key, pct: Number(e.target.value) }).catch(() => {})}
                        className="flex-1 h-1.5 cursor-pointer accent-cyan-600"
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2 text-xs">
                  <span className="font-medium text-muted-foreground">Total {activeScenario.label}</span>
                  <span className="font-bold tabular-nums">{fmtTnd(activeScenario.totalCost)}</span>
                </div>
              </CardContent>
            </Card>
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
            <div className="space-y-1.5">
              {roadmap.planning.map((task) => (
                <Card key={task.id} className="border-border/40 bg-background/50">
                  <CardContent className="p-2.5 sm:p-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold truncate ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                        <p className="text-[10px] text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                          <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {task.durationDays} j</span>
                          <span className="flex items-center gap-1"><CalendarRange className="h-2.5 w-2.5" /> J+{task.startDay} → J+{task.endDay}</span>
                          <span>{task.responsible}</span>
                          <span className="font-medium text-foreground/70">{fmtTnd(task.cost)}</span>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Construction ── */}
          <TabsContent value="construction" className="space-y-2">
            <Accordion type="single" collapsible className="w-full">
              {roadmap.construction.map((c) => (
                <AccordionItem key={c.id} value={c.id} className="border-border/40 bg-background/50 rounded-xl mb-1.5 border px-1">
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
                        <p className="text-[10px] text-muted-foreground">{c.dureeJours} j · {fmtTnd(c.budgetEstime)}</p>
                      </div>
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
              ))}
            </Accordion>
          </TabsContent>

          {/* ── Contrôle ── */}
          <TabsContent value="controle" className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              {/* Photos */}
              <Card className="border-border/40 bg-background/50">
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Camera className="h-4 w-4 text-cyan-600" /> Photos du chantier</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 space-y-2">
                  <div className="flex gap-2">
                    <Input placeholder="Légende (optionnel)" value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)} className="h-9 text-xs" />
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
                        {["Gros œuvre", "Second œuvre", "Matériaux", "Main-d'œuvre", "Équipements", "Transport", "Études & permis", "Imprévus"].map((c) => (
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
            <Card className="border-border/40 bg-background/50">
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-cyan-600" /> Évolution probable des coûts (24 mois)</CardTitle>
                <CardDescription className="text-[10px]">Base : scénario standard · inflation ≈ 6 %/an · saisonnalité du marché tunisien.</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <CostEvolution points={roadmap.predictions.costEvolution} />
              </CardContent>
            </Card>
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
    </main>
  );
}

// ─── Petits composants ───────────────────────────────────────────────────────

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

function CostEvolution({ points }: { points: { label: string; cost: number }[] }) {
  const shown = useMemo(() => {
    const step = Math.max(1, Math.ceil(points.length / 13));
    return points.filter((_, i) => i % step === 0 || i === points.length - 1);
  }, [points]);
  const min = Math.min(...shown.map((p) => p.cost));
  const max = Math.max(...shown.map((p) => p.cost));
  const range = Math.max(1, max - min);
  return (
    <div className="flex items-end gap-1 h-28">
      {shown.map((p, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1 group" title={`${p.label} : ${fmtTnd(p.cost)}`}>
          <span className="text-[9px] font-semibold tabular-nums text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity">{fmtTnd(p.cost)}</span>
          <div
            className="w-full rounded-t bg-gradient-to-t from-cyan-500/70 to-blue-500/70 transition-all group-hover:from-cyan-500 group-hover:to-blue-500"
            style={{ height: `${Math.max(8, ((p.cost - min) / range) * 100)}%` }}
          />
          <span className="text-[8px] text-muted-foreground/60 whitespace-nowrap">{p.label}</span>
        </div>
      ))}
    </div>
  );
}
