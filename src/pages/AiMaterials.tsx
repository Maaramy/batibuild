import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { ClientProPaywall } from "@/components/ClientProPaywall";
import { projectTypeLabel } from "@/convex/projectTypes";
import { useQuery, useMutation, useAction } from "convex/react";
import { useNavigate, useSearchParams } from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { usePageSEO } from "@/hooks/use-page-seo";
import { ProjectJourneyNav } from "@/components/ProjectJourneyNav";
import {
  Sparkles, HardHat, Loader2, Check, Trash2, MapPin, Ruler,
  Wand2, ShieldCheck, RefreshCw, CircleDollarSign, Building2, Info,
  Blocks, Search, X, MoreHorizontal, ExternalLink, AlertCircle, CalendarDays,
  LayoutGrid, FilterX,
} from "lucide-react";
import type { ProjectContext } from "@/convex/aiMaterialsEngine";
import type { AiMaterialsProjectData, DqeNeedPoste } from "@/convex/aiMaterials";
import { REGION_LABELS } from "@/lib/projectPdf";
import {
  AI_MATERIALS_STATUS_LABEL,
  buildAiMaterialsHistoryEntry,
  filterAiMaterialsHistory,
  type AiMaterialsHistoryEntry,
  type AiMaterialsHistoryStatus,
} from "@/lib/aiMaterialsHistory";

// ── Helpers ──────────────────────────────────────────────────────────────────
const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const fmtTnd = (n: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** TVA appliquée aux besoins (marché tunisien 2026) — même taux que le moteur. */
const TVA = 0.19;

/**
 * Solution retenue = scénario budgétaire du Quantitatif détaillé. Chaque
 * solution produit son propre résultat (quantités identiques, prix recalculés).
 */
export type AiSolutionId = "economique" | "standard" | "premium";

const SOLUTION_ID_LABEL: Record<AiSolutionId, string> = {
  economique: "Économique",
  standard: "Standard",
  premium: "Premium",
};

const SOLUTION_IDS: AiSolutionId[] = ["economique", "standard", "premium"];

const SOLUTION_HINT: Record<AiSolutionId, string> = {
  economique: "Matériaux de base, finitions simples",
  standard: "Bon compromis courant (référence du DQE)",
  premium: "Matériaux et finitions haut de gamme",
};

/** Statut de compatibilité d'un besoin par rapport au choix retenu. */
type Compatibility = "compatible" | "incompatible" | "unnecessary";

const COMPATIBILITY_STYLE: Record<Compatibility, { className: string; label: string }> = {
  compatible: { className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700", label: "Compatible" },
  incompatible: { className: "border-red-500/40 bg-red-500/10 text-red-700", label: "Incompatible" },
  unnecessary: { className: "border-amber-500/40 bg-amber-500/10 text-amber-700", label: "Non retenu" },
};

/** Besoin du DQE enrichi : prix de la solution retenue, TVA et compatibilité. */
interface DerivedNeed extends DqeNeedPoste {
  factor: number;
  scaledUnitPrice: number;
  scaledTotal: number;
  tva: number;
  totalTTC: number;
  selected: boolean;
  compatibility: Compatibility;
}

/** Applique le facteur de la solution retenue à un besoin du DQE. */
function deriveNeed(
  need: DqeNeedPoste,
  factor: number,
  selected: boolean,
): DerivedNeed {
  const scaledUnitPrice = Math.round(need.unitPrice * factor * 100) / 100;
  const scaledTotal = Math.round(need.total * factor);
  const tva = Math.round(scaledTotal * TVA);
  const compatibility: Compatibility = !selected
    ? "unnecessary"
    : need.nature === "materiaux" && !!need.suggestedCategoryId
      ? "compatible"
      : "incompatible";
  return {
    ...need,
    factor,
    scaledUnitPrice,
    scaledTotal,
    tva,
    totalTTC: scaledTotal + tva,
    selected,
    compatibility,
  };
}

// ── Historique (interface) ───────────────────────────────────────────────────
const HISTORY_FILTERS: { value: AiMaterialsHistoryStatus | "all"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "completed", label: "Terminées" },
  { value: "running", label: "En cours" },
  { value: "error", label: "Erreurs" },
];

const HISTORY_STATUS_STYLE: Record<
  AiMaterialsHistoryStatus,
  { className: string; icon: typeof Check }
> = {
  completed: { className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700", icon: Check },
  running: { className: "border-sky-500/40 bg-sky-500/10 text-sky-700", icon: RefreshCw },
  error: { className: "border-red-500/40 bg-red-500/10 text-red-700", icon: AlertCircle },
};

const HISTORY_STANDING_LABELS: Record<string, string> = {
  economique: "Économique",
  standard: "Standard",
  premium: "Premium",
};

// ═══════════════════════════════════════════════════════════════════════════
// PAGE — AI MATERIALS COPILOT
// Chaîne de dépendances : Projet → DQE → Solution retenue → Besoins →
// Matériaux AI → Pré-sélection. Tout est recalculé quand l'un d'eux change.
// ═══════════════════════════════════════════════════════════════════════════
export default function AiMaterials() {
  usePageSEO({
    title: "Assistant Matériaux IA - batibuild",
    description: "Assistant intelligent de choix des matériaux de construction par IA : recommandation comparative, prix du marché tunisien 2026, fournisseurs, optimisation du budget.",
  });
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const paramProject = params.get("project");

  const analyzeStepRef = useRef<HTMLDivElement | null>(null);

  const projects = useQuery(api.projects.getUserProjects, {}) || [];

  // ── Projet sélectionné ──
  const [projectId, setProjectId] = useState<string>(paramProject || "");

  // ── Solution retenue (scénario budgétaire) ──
  const [solution, setSolution] = useState<AiSolutionId>("standard");

  // ── Sélections manuelles (conservées lors des recalculs) ──
  // Clé = identifiant stable du besoin (`lotId::index`). Absente → la
  // pré-sélection du serveur s'applique ; présente → choix explicite du client.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  // ── Analyse ──
  const [analyzing, setAnalyzing] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [enhance, setEnhance] = useState(true);

  // ── Historique ──
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyStatus, setHistoryStatus] = useState<AiMaterialsHistoryStatus | "all">("all");

  const recommendMaterials = useAction(api.aiMaterialsActions.recommendMaterials);
  const saveCopilotAnalysis = useMutation(api.aiMaterials.saveCopilotAnalysis);
  const deleteCopilotAnalysis = useMutation(api.aiMaterials.deleteCopilotAnalysis);

  // ── Source du besoin : Quantitatif détaillé du projet (réactif) ──
  const projectData = useQuery(
    api.aiMaterials.getAiMaterialsProjectData,
    projectId ? { projectId: projectId as any } : "skip",
  );

  // ── Analyses enregistrées (historique réel) ──
  const historyDocs = useQuery(api.aiMaterials.getCopilotAnalyses, {}) ?? [];

  const project = useMemo(
    () => (projects.find((p: any) => p._id === projectId) as any) || null,
    [projects, projectId],
  );

  // Changement de projet → les choix manuels précédents ne s'appliquent plus.
  useEffect(() => {
    setOverrides({});
  }, [projectId]);

  // ── Besoins recalculés : DQE × solution retenue × pré-sélection ──
  const factor = projectData?.budgetScenarios?.[solution]?.factor ?? 1;

  const isSelected = (need: DqeNeedPoste) =>
    overrides[need.key] ?? need.preSelected;

  const needsByCategory = useMemo(() => {
    if (!projectData) return [];
    return projectData.needsByCategory.map((cat) => ({
      ...cat,
      needs: cat.needs.map((need) => deriveNeed(need, factor, isSelected(need))),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectData, factor, overrides]);

  const allNeeds = useMemo(
    () => needsByCategory.flatMap((c) => c.needs),
    [needsByCategory],
  );

  const selectedNeeds = useMemo(
    () => allNeeds.filter((n) => n.selected),
    [allNeeds],
  );

  const totals = useMemo(() => {
    const selectedTotal = selectedNeeds.reduce((s, n) => s + n.scaledTotal, 0);
    const selectedTTC = selectedNeeds.reduce((s, n) => s + n.totalTTC, 0);
    const dqeTotal = allNeeds.reduce((s, n) => s + n.scaledTotal, 0);
    return {
      selectedTotal,
      selectedTTC,
      dqeTotal,
      count: selectedNeeds.length,
    };
  }, [selectedNeeds, allNeeds]);

  const preSelectedCount = allNeeds.filter((n) => n.preSelected).length;
  const manualCount = allNeeds.filter((n) => overrides[n.key] !== undefined).length;

  // ── Catégories envoyées au moteur : issues des besoins sélectionnés ──
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const n of selectedNeeds) if (n.suggestedCategoryId) set.add(n.suggestedCategoryId);
    return [...set];
  }, [selectedNeeds]);

  const projectCtx = useMemo<ProjectContext>(() => {
    const proj = project as any;
    return {
      projectName: proj?.name,
      projectCategory: proj?.category,
      region: proj?.region,
      surface: Number(proj?.surface) || 0,
      floors: Number(proj?.floors) || 1,
      rooms: {
        bathrooms: proj?.bathrooms,
        kitchens: proj?.kitchens,
        bedrooms: proj?.bedrooms,
      },
      terrainSurface: proj?.surfaceTotale,
      standing: solution as ProjectContext["standing"],
      budgetMode: "moyen",
    };
  }, [project, solution]);

  const selectProject = (id: string) => {
    setProjectId(id);
    setSavedId(null);
  };

  const toggleNeed = (need: DqeNeedPoste) => {
    setOverrides((prev) => ({ ...prev, [need.key]: !isSelected(need) }));
  };

  const selectAll = () => {
    const next: Record<string, boolean> = {};
    for (const n of allNeeds) next[n.key] = true;
    setOverrides(next);
  };

  const clearAll = () => {
    const next: Record<string, boolean> = {};
    for (const n of allNeeds) next[n.key] = false;
    setOverrides(next);
  };

  const resetToPreSelection = () => setOverrides({});

  const goToAnalyzeStep = () => {
    analyzeStepRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // ── Analyse IA ──
  const handleAnalyze = async () => {
    if (!projectId) return toast.error("Choisissez un projet.");
    if (!projectData || allNeeds.length === 0) {
      return toast.error("Aucun besoin calculé à partir du Quantitatif détaillé.");
    }
    if (categories.length === 0) {
      return toast.error("Sélectionnez au moins un matériau reconnu dans le catalogue.");
    }
    setAnalyzing(true);
    try {
      const result = await recommendMaterials({
        projectId: projectId as any,
        context: projectCtx,
        categories,
        enhanceWithAI: enhance,
      });
      let analysisId: string | null = null;
      try {
        analysisId = await saveCopilotAnalysis({
          projectId: projectId as any,
          input: {
            context: projectCtx,
            categories,
            solution,
            selectedNeedKeys: selectedNeeds.map((n) => n.key),
            enhance,
          },
          results: { recommend: result },
        });
        setSavedId(analysisId);
      } catch {
        // La sauvegarde est optionnelle : le résultat reste affichable.
      }
      toast.success("Analyse terminée.");
      if (analysisId) {
        navigate(`/dashboard/ai-materials/result/${analysisId}`);
      } else {
        toast.error("Analyse non enregistrée : impossible d'afficher le résultat.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'analyse");
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Historique ──
  const historyEntries = useMemo<AiMaterialsHistoryEntry[]>(
    () => historyDocs.map((doc: any) => buildAiMaterialsHistoryEntry(doc, savedId)),
    [historyDocs, savedId],
  );

  const visibleHistory = useMemo(
    () => filterAiMaterialsHistory(historyEntries, { query: historyQuery, status: historyStatus }),
    [historyEntries, historyQuery, historyStatus],
  );

  const historyCounters = useMemo(
    () => ({
      all: historyEntries.length,
      completed: historyEntries.filter((e) => e.status === "completed").length,
      running: historyEntries.filter((e) => e.status === "running").length,
      error: historyEntries.filter((e) => e.status === "error").length,
    }),
    [historyEntries],
  );

  const loadAnalysis = (entry: AiMaterialsHistoryEntry) => {
    if (!entry.hasRecommendation) return toast.error("Analyse sans recommandation enregistrée.");
    setSavedId(entry.id);
    navigate(`/dashboard/ai-materials/result/${entry.id}`);
  };

  const noProjects = projects.length === 0;
  const dqeMissing = !!projectId && projectData === null;
  const loadingNeeds = !!projectId && projectData === undefined;

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background pb-12">
      <ClientProPaywall>
        <ProjectJourneyNav
          projectId={project?._id ?? null}
          category={project?.category}
          featureLabel="Assistant Matériaux IA"
          maxWidthClassName="max-w-7xl"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden rounded-2xl border border-emerald-900/20 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 text-white p-5 sm:p-8"
          >
            <div className="pointer-events-none absolute inset-0 blueprint-grid opacity-40" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  AI Materials Copilot · batibuild
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">Quel est le meilleur matériau pour mon projet ?</h2>
              <p className="mt-1.5 text-xs sm:text-sm text-emerald-100/80 max-w-2xl">
                Les besoins sont calculés automatiquement depuis le Quantitatif détaillé du projet et la
                solution retenue. L'IA croise ensuite le catalogue 2026 et les offres fournisseurs pour
                proposer la meilleure solution, le coût estimé et les fournisseurs au meilleur prix.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { icon: CircleDollarSign, text: "Budget & standing" },
                  { icon: RefreshCw, text: "Recalcul automatique" },
                  { icon: Blocks, text: "Pré-sélection DQE" },
                  { icon: Wand2, text: "Optimisation IA" },
                ].map((b, i) => (
                  <Badge key={i} className="gap-1.5 border-emerald-400/30 bg-white/10 text-emerald-50 py-1.5 px-3">
                    <b.icon className="h-3 w-3" /> {b.text}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ÉTAPE 1 — PROJET */}
          <Card className="border border-border/40 overflow-hidden rounded-xl">
            <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-bold">1</div>
                <div>
                  <CardTitle className="text-sm font-semibold">Mon projet</CardTitle>
                  <CardDescription className="text-[10px]">Choisissez un projet — le Quantitatif détaillé et ses besoins sont importés automatiquement</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              {noProjects ? (
                <div className="rounded-xl border border-dashed border-border/60 p-6 sm:p-8 text-center">
                  <Building2 className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm font-medium">Aucun projet de construction trouvé</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">Créez d'abord un projet pour importer automatiquement son Quantitatif détaillé.</p>
                  <Button size="sm" onClick={() => navigate("/dashboard/new")} className="h-8 gap-1.5 text-xs">
                    <HardHat className="h-3.5 w-3.5" /> Créer un projet de construction
                  </Button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {projects.map((p: any) => (
                    <button
                      key={p._id}
                      onClick={() => selectProject(p._id)}
                      className={cn(
                        "text-left rounded-xl border p-3 transition-all cursor-pointer",
                        projectId === p._id
                          ? "border-emerald-500/60 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                          : "border-border/40 hover:border-border hover:bg-muted/30",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <HardHat className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-xs font-semibold truncate">{p.name}</span>
                        {projectId === p._id && <Check className="h-3.5 w-3.5 text-emerald-600 ml-auto shrink-0" />}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 text-[9px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded bg-muted/40 px-1.5 py-0.5">
                          <Building2 className="h-2.5 w-2.5" /> {projectTypeLabel(p.category)}
                        </span>
                        {p.surface && (
                          <span className="inline-flex items-center gap-1 rounded bg-muted/40 px-1.5 py-0.5">
                            <Ruler className="h-2.5 w-2.5" /> {p.surface} m²
                          </span>
                        )}
                        {p.region && (
                          <span className="inline-flex items-center gap-1 rounded bg-muted/40 px-1.5 py-0.5">
                            <MapPin className="h-2.5 w-2.5" /> {REGION_LABELS[p.region] || p.region}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ÉTAPE 2 — SOLUTION RETENUE */}
          <Card className="border border-border/40 overflow-hidden rounded-xl">
            <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 text-xs font-bold">2</div>
                <div>
                  <CardTitle className="text-sm font-semibold">Solution retenue</CardTitle>
                  <CardDescription className="text-[10px]">Scénario budgétaire du projet qui sert de référence au calcul des matériaux et des prix.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {SOLUTION_IDS.map((s) => {
                  const f = projectData?.budgetScenarios?.[s]?.factor ?? 1;
                  return (
                    <button
                      key={s}
                      onClick={() => setSolution(s)}
                      className={cn(
                        "flex items-start justify-between gap-2 rounded-xl border px-3 py-3 text-left transition-all cursor-pointer",
                        solution === s
                          ? "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20"
                          : "border-border/40 hover:border-border hover:bg-muted/30",
                      )}
                    >
                      <span>
                        <span className="block text-sm font-semibold">{SOLUTION_ID_LABEL[s]}</span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">{SOLUTION_HINT[s]}</span>
                        {projectData && (
                          <span className="mt-1 inline-block text-[10px] font-medium text-amber-700">
                            ×{f.toFixed(2)}
                          </span>
                        )}
                      </span>
                      {solution === s && <Check className="h-4 w-4 shrink-0 text-amber-600" />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Par défaut, la <span className="font-semibold text-foreground">Solution Standard</span> (référence du
                Quantitatif détaillé) est utilisée. Changer de solution recalcule immédiatement les prix unitaires et
                les totaux des besoins, sans perdre vos choix manuels.
              </p>
            </CardContent>
          </Card>

          {/* ÉTAPE 3 — BESOINS DU QUANTITATIF DÉTAILLÉ */}
          <Card className="border border-border/40 overflow-hidden rounded-xl">
            <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 text-xs font-bold">3</div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Besoins du Quantitatif détaillé</CardTitle>
                    <CardDescription className="text-[10px]">Source unique des besoins : catégories de travaux et quantités calculées du projet.</CardDescription>
                  </div>
                </div>
                {projectData && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/5 px-2.5 py-1 text-[10px] font-medium text-violet-700">
                    <Info className="h-3 w-3" />
                    Provenance DQE · généré le {projectData.generatedAt ? fmtDate(projectData.generatedAt) : "—"}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              {!projectId ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 px-4 py-8 text-center">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Sélectionnez un projet pour charger son Quantitatif détaillé.</p>
                </div>
              ) : loadingNeeds ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 px-4 py-8 text-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Chargement du Quantitatif détaillé…</p>
                </div>
              ) : dqeMissing || allNeeds.length === 0 ? (
                <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/[0.04] px-4 py-8 text-center">
                  <AlertCircle className="mx-auto mb-2 h-8 w-8 text-amber-600/60" />
                  <p className="text-sm font-medium">Aucun besoin calculé pour ce projet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Lancez d'abord l'analyse du projet pour générer son Quantitatif détaillé (DQE).
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {needsByCategory.map((cat) => (
                    <div key={cat.id}>
                      <div className="mb-2 flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-muted-foreground">{cat.label}</h4>
                        <span className="text-[10px] text-muted-foreground/60">{cat.needs.length} poste(s)</span>
                      </div>
                      <div className="space-y-2">
                        {cat.needs.map((need) => (
                          <div
                            key={need.key}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border/30 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium">{need.designation}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {need.quantity} {need.unit} × {fmtTnd(need.scaledUnitPrice)} · {need.nature}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">
                              {fmtTnd(need.scaledTotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ÉTAPE 4 — MATÉRIAUX AI (pré-sélection + compatibilité) */}
          <Card className="border border-border/40 overflow-hidden rounded-xl">
            <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-bold">4</div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Matériaux AI</CardTitle>
                    <CardDescription className="text-[10px]">
                      Pré-sélection automatique depuis le DQE — {preSelectedCount} poste(s) proposé(s), {totals.count} retenu(s).
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={selectAll}>
                    <Check className="h-3 w-3" /> Tout sélectionner
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={clearAll}>
                    <X className="h-3 w-3" /> Tout désélectionner
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={resetToPreSelection}>
                    <RefreshCw className="h-3 w-3" /> Pré-sélection
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              {allNeeds.length === 0 ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 px-4 py-8 text-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Aucun matériau calculé pour le moment.</p>
                </div>
              ) : (
                <>
                  {/* Récapitulatif */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-xl border border-border/40 bg-muted/10 p-3">
                      <p className="text-[10px] text-muted-foreground">Postes retenus</p>
                      <p className="text-sm font-bold tabular-nums">{totals.count} / {allNeeds.length}</p>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-muted/10 p-3">
                      <p className="text-[10px] text-muted-foreground">Total HT retenu</p>
                      <p className="text-sm font-bold tabular-nums">{fmtTnd(totals.selectedTotal)}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                      <p className="text-[10px] text-muted-foreground">Total TTC retenu</p>
                      <p className="text-sm font-bold tabular-nums text-emerald-700">{fmtTnd(totals.selectedTTC)}</p>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-muted/10 p-3">
                      <p className="text-[10px] text-muted-foreground">Choix manuels</p>
                      <p className="text-sm font-bold tabular-nums">{manualCount}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {allNeeds.map((need) => {
                      const style = COMPATIBILITY_STYLE[need.compatibility];
                      return (
                        <div
                          key={need.key}
                          className={cn(
                            "flex flex-col gap-3 rounded-xl border p-3 transition-all sm:flex-row sm:items-center sm:justify-between",
                            need.selected
                              ? need.compatibility === "compatible"
                                ? "border-emerald-500/30 bg-emerald-500/5"
                                : "border-red-500/30 bg-red-500/5"
                              : "border-border/40 bg-muted/10",
                          )}
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <label className="mt-0.5 flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={need.selected}
                                onChange={() => toggleNeed(need)}
                                className="h-4 w-4 accent-emerald-600"
                                aria-label={`Choisir ${need.designation}`}
                              />
                            </label>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-xs font-semibold">{need.designation}</p>
                                {overrides[need.key] !== undefined && (
                                  <Badge className="gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
                                    <Check className="h-2.5 w-2.5" /> Choix manuel
                                  </Badge>
                                )}
                                {need.suggestedCategoryLabel && (
                                  <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-medium text-violet-700">
                                    {need.suggestedCategoryLabel}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {need.poste}{need.sousPoste ? ` · ${need.sousPoste}` : ""} · {need.nature}
                              </p>
                              <p className="text-[10px] text-muted-foreground/70">
                                Besoin DQE : {need.quantity} {need.unit} × {fmtTnd(need.scaledUnitPrice)} ={" "}
                                {fmtTnd(need.scaledTotal)} HT · TVA {fmtTnd(need.tva)} · TTC {fmtTnd(need.totalTTC)}
                              </p>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center gap-1 self-start rounded-full border px-2 py-0.5 text-[9px] font-semibold sm:self-center",
                              style.className,
                            )}
                          >
                            {need.compatibility === "compatible" && <Check className="h-2.5 w-2.5" />}
                            {need.compatibility === "incompatible" && <AlertCircle className="h-2.5 w-2.5" />}
                            {need.compatibility === "unnecessary" && <X className="h-2.5 w-2.5" />}
                            {style.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Lancer l'analyse */}
          <div ref={analyzeStepRef} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={enhance}
                onChange={(e) => setEnhance(e.target.checked)}
                className="accent-emerald-600"
              />
              <span className="text-xs text-muted-foreground">Enrichir les explications avec l'IA générative</span>
            </label>
            <div className="sm:ml-auto">
              <Button
                className="gap-2 h-9"
                disabled={analyzing || allNeeds.length === 0 || categories.length === 0}
                onClick={handleAnalyze}
              >
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {analyzing ? "Analyse en cours..." : "Lancer l'analyse IA"}
              </Button>
            </div>
          </div>

          {/* Historique */}
          <Card className="border border-border/40 overflow-hidden rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-600">
                  <Blocks className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    Historique des analyses
                    {historyEntries.length > 0 && (
                      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                        {historyEntries.length}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-[10px]">Vos analyses enregistrées (sauvegardées automatiquement après chaque analyse)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              {historyEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/[0.15] px-6 py-10 text-center">
                  <div className="relative mb-3">
                    <div className="absolute inset-0 rounded-2xl bg-emerald-500/10 blur-xl" />
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-border/40 bg-background text-emerald-600 shadow-sm">
                      <Blocks className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold">Aucune analyse de matériaux</p>
                  <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-muted-foreground">
                    Vos analyses Matériaux AI apparaîtront ici.
                  </p>
                  <Button
                    className="mt-4 h-9 gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.97]"
                    onClick={goToAnalyzeStep}
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    Analyser les matériaux
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative sm:max-w-xs sm:flex-1">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={historyQuery}
                        onChange={(e) => setHistoryQuery(e.target.value)}
                        placeholder="Rechercher un projet, une région…"
                        aria-label="Rechercher dans l'historique des analyses"
                        className="h-9 rounded-lg pl-8 pr-8 text-xs sm:h-8"
                      />
                      {historyQuery && (
                        <button
                          type="button"
                          onClick={() => setHistoryQuery("")}
                          aria-label="Effacer la recherche"
                          className="absolute right-2 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className="-mx-0.5 flex items-center gap-1 overflow-x-auto px-0.5 scrollbar-none">
                      {HISTORY_FILTERS.map((f) => {
                        const count = f.value === "all" ? historyCounters.all : historyCounters[f.value];
                        const active = historyStatus === f.value;
                        return (
                          <button
                            key={f.value}
                            type="button"
                            onClick={() => setHistoryStatus(f.value)}
                            aria-pressed={active}
                            className={cn(
                              "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[10px] font-medium transition-all active:scale-95 sm:h-7 sm:px-2.5",
                              active
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "border-border/40 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground",
                            )}
                          >
                            {f.label}
                            <span className={cn(
                              "tabular-nums text-[9px] font-semibold",
                              active ? "text-emerald-600/80 dark:text-emerald-400/80" : "text-muted-foreground/60",
                            )}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {visibleHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 px-4 py-8 text-center">
                      <p className="text-[11px] text-muted-foreground">Aucune analyse ne correspond à ces critères.</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-[11px]"
                        onClick={() => { setHistoryQuery(""); setHistoryStatus("all"); }}
                      >
                        <FilterX className="h-3 w-3" /> Réinitialiser les filtres
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                      {visibleHistory.map((entry, index) => {
                        const badge = HISTORY_STATUS_STYLE[entry.status];
                        const StatusIcon = badge.icon;
                        const summary = [
                          entry.standing ? (HISTORY_STANDING_LABELS[entry.standing] ?? entry.standing) : null,
                          entry.surface ? `${entry.surface} m²` : null,
                          entry.region ? (REGION_LABELS[entry.region] ?? entry.region) : null,
                        ].filter(Boolean).join(" · ");

                        return (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: Math.min(index, 6) * 0.035, ease: "easeOut" }}
                            className="h-full"
                          >
                            <div className={cn(
                              "group flex h-full flex-col rounded-xl border bg-card/60 p-3 transition-all duration-200",
                              savedId === entry.id
                                ? "border-emerald-500/50 bg-emerald-500/[0.04] ring-1 ring-emerald-500/20"
                                : "border-border/40 hover:border-primary/25 hover:bg-card hover:shadow-sm",
                            )}>
                              <div className="flex items-start gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-600">
                                  <Blocks className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-semibold leading-tight" title={entry.projectName}>
                                    {entry.projectName}
                                  </p>
                                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <CalendarDays className="h-2.5 w-2.5 shrink-0" />
                                    Analyse réalisée le {fmtDate(entry.createdAt)}
                                  </p>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label="Actions de l'analyse"
                                      className="h-8 w-8 shrink-0 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 sm:h-7 sm:w-7"
                                    >
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem className="cursor-pointer gap-2 text-xs" onClick={() => loadAnalysis(entry)}>
                                      <ExternalLink className="h-3.5 w-3.5" /> Voir l'analyse
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="cursor-pointer gap-2 text-xs" onClick={() => loadAnalysis(entry)}>
                                      <RefreshCw className="h-3.5 w-3.5" /> Charger les résultats
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive"
                                      onClick={async () => {
                                        await deleteCopilotAnalysis({ analysisId: entry.id as any });
                                        if (savedId === entry.id) setSavedId(null);
                                        toast.success("Analyse supprimée");
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" /> Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                <span className={cn(
                                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold",
                                  badge.className,
                                )}>
                                  <StatusIcon className={cn("h-2.5 w-2.5", entry.status === "running" && "animate-spin")} />
                                  {AI_MATERIALS_STATUS_LABEL[entry.status]}
                                </span>
                                {entry.materialCount !== null && entry.materialCount > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/20 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                                    <Blocks className="h-2.5 w-2.5" />
                                    {entry.materialCount} matériaux analysés
                                  </span>
                                )}
                                {entry.categoryCount > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/20 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                                    <LayoutGrid className="h-2.5 w-2.5" />
                                    {entry.categoryCount} catégories
                                  </span>
                                )}
                              </div>

                              {summary && (
                                <p className="mt-2 truncate text-[10px] text-muted-foreground/80" title={summary}>{summary}</p>
                              )}

                              {entry.totalCost !== null && entry.totalCost > 0 && (
                                <div className="mt-2 flex items-baseline justify-between gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5">
                                  <span className="text-[9px] text-muted-foreground">Budget matériaux estimé</span>
                                  <span className="text-xs font-bold text-primary">{fmtTnd(entry.totalCost)}</span>
                                </div>
                              )}

                              <div className="mt-auto pt-2.5">
                                <Button
                                  size="sm"
                                  className="h-9 w-full gap-1.5 rounded-lg text-xs active:scale-[0.98]"
                                  onClick={() => loadAnalysis(entry)}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Voir l'analyse
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Pied de page */}
          <div className="rounded-xl border border-border/30 bg-muted/10 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-muted-foreground/70">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Les prix ne sont jamais inventés : toutes les valeurs proviennent du catalogue 2026 et des offres fournisseurs (données datées).
            </span>
            <span className="flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              Pour les éléments structurels, la validation d'un professionnel qualifié reste requise.
            </span>
          </div>
        </div>
      </ClientProPaywall>
    </main>
  );
}
