import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { ClientProPaywall } from "@/components/ClientProPaywall";
import { projectTypeLabel } from "@/convex/projectTypes";
import { useQuery, useMutation, useAction } from "convex/react";
import { useNavigate, useSearchParams } from "react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { usePageSEO } from "@/hooks/use-page-seo";
import { ProjectJourneyNav } from "@/components/ProjectJourneyNav";
import {
Sparkles, HardHat, Loader2, Store, Scale, Check, Trash2, MapPin, Ruler, Wand2, ShieldCheck, RefreshCw, CircleDollarSign, Building2, Info,
Blocks, Search, X, MoreHorizontal, ExternalLink, AlertCircle, CalendarDays, LayoutGrid, CheckCircle2, FilterX
} from "lucide-react";
import { ProjectContext } from "@/convex/aiMaterialsEngine";
import { PRIORITY_OPTIONS, preselectMaterials, type PreselectPriority } from "@/lib/materialPreselection";
import { REGION_LABELS } from "@/lib/projectPdf";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AI_MATERIALS_STATUS_LABEL,
  buildAiMaterialsHistoryEntry,
  filterAiMaterialsHistory,
  type AiMaterialsHistoryStatus,
} from "@/lib/aiMaterialsHistory";

// ── Helpers ──────────────────────────────────────────────────────────────────
const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const fmtTnd = (n: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });


// ═══════════════════════════════════════════════════════════════════════════
// HISTORIQUE DES ANALYSES — présentation (données, statuts et actions inchangés)
// ═══════════════════════════════════════════════════════════════════════════

/** Gamme utilisée dans l'analyse (libellés existants de la plateforme). */
const HISTORY_STANDING_LABELS: Record<string, string> = {
  economique: "Économique",
  equilibre: "Équilibrée",
  standard: "Standard",
  bon_standing: "Bon standing",
  premium: "Premium",
  luxe: "Luxe",
};

/** Style du badge de statut — couleurs du design system (clair + sombre). */
const HISTORY_STATUS_STYLE: Record<AiMaterialsHistoryStatus, { icon: any; className: string }> = {
  completed: {
    icon: CheckCircle2,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  running: {
    icon: Loader2,
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  error: {
    icon: AlertCircle,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-500",
  },
};

/** Filtres compacts de l'historique (filtrage purement côté interface). */
const HISTORY_FILTERS: Array<{ value: AiMaterialsHistoryStatus | "all"; label: string }> = [
  { value: "all", label: "Toutes" },
  { value: "completed", label: "Terminées" },
  { value: "running", label: "En cours" },
  { value: "error", label: "Erreur" },
];

// ═══════════════════════════════════════════════════════════════════════════
// PAGE — AI MATERIALS COPILOT
// ═══════════════════════════════════════════════════════════════════════════
export default function AiMaterials() {
  usePageSEO({
    title: "Assistant Matériaux IA - batibuild",
    description: "Assistant intelligent de choix des matériaux de construction par IA : recommandation comparative, prix du marché tunisien 2026, fournisseurs, optimisation du budget.",
  });
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const paramProject = params.get("project");
  useAuth();
  const projects = useQuery(api.projects.getUserProjects, {}) || [];
  const analyses = useQuery(api.aiMaterials.getCopilotAnalyses) || [];
  const saveAnalysis = useMutation(api.aiMaterials.saveCopilotAnalysis);
  const deleteAnalysis = useMutation(api.aiMaterials.deleteCopilotAnalysis);
  const recommendMaterials = useAction(api.aiMaterialsActions.recommendMaterials);

  // ── Formulaire ──
  const [projectId, setProjectId] = useState(paramProject || "");
  const [form, setForm] = useState({
    surface: 120,
    floors: 1,
    region: "tunis",
    standing: "standard",
  });

  // Priorité de la pré-sélection : prix, équilibre ou qualité.
  const [priority, setPriority] = useState<PreselectPriority>("equilibre");
  // Matériaux requis sélectionnés pour l'analyse (pré-sélectionnés par prix/qualité).
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);

  // Projet courant (contexte du parcours « Où suis-je dans mon projet ? »).
  const journeyProject = useMemo(
    () => projects.find((p: any) => p._id === projectId) as any,
    [projects, projectId],
  );

  // Matériaux réellement requis par le projet : issus de l'estimation des coûts
  // de construction (besoin calculé), rattachés aux catégories du copilot.
  const estimation = useQuery(
    api.aiMaterials.getCostEstimationCategories,
    journeyProject ? { projectId: journeyProject._id as any } : "skip",
  );
  const estimationCategories = useMemo<any[]>(
    () => (estimation?.hasEstimation ? (estimation.categories as any[]) : []),
    [estimation],
  );

  // Pré-sélection intelligente : meilleur rapport prix / qualité par catégorie,
  // recalculée quand le besoin calculé ou la priorité change.
  const preselection = useMemo(
    () => preselectMaterials({ categories: estimationCategories, priority }),
    [estimationCategories, priority],
  );

  // Appliquée une fois par (projet + priorité) : les ajustements manuels de
  // l'utilisateur restent maîtres tant que ni le projet ni la priorité ne changent.
  const selectionKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (estimation === undefined) return; // requête en cours de chargement
    const key = `${journeyProject?._id ?? ""}:${priority}`;
    if (selectionKeyRef.current === key) return;
    selectionKeyRef.current = key;
    setSelectedMaterialIds(preselection.materialIds);
  }, [estimation, preselection, journeyProject, priority]);

  // Catégories actives = celles dont au moins un matériau est sélectionné.
  const selectedCats = useMemo(
    () =>
      estimationCategories
        .filter((c) => c.materials.some((m: any) => selectedMaterialIds.includes(m.id)))
        .map((c) => c.id as string),
    [estimationCategories, selectedMaterialIds],
  );

  const [enhance, setEnhance] = useState(true);

  // ── Résultats ──
  const [analyzing, setAnalyzing] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  // ── Historique des analyses : état d'AFFICHAGE uniquement ──
  // Les analyses elles-mêmes viennent toujours de `api.aiMaterials.getCopilotAnalyses`.
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyStatus, setHistoryStatus] = useState<AiMaterialsHistoryStatus | "all">("all");
  const analyzeStepRef = useRef<HTMLDivElement | null>(null);

  /** Cartes d'historique dérivées des mêmes documents (aucune requête supplémentaire). */
  const historyEntries = useMemo(
    () => (analyses as any[]).map((a) => buildAiMaterialsHistoryEntry(a, savedId)),
    [analyses, savedId],
  );

  /** Documents d'origine conservés pour « Voir l'analyse » / « Supprimer ». */
  const historyDocs = useMemo(() => {
    const map = new Map<string, any>();
    for (const a of analyses as any[]) map.set(a._id, a);
    return map;
  }, [analyses]);

  const visibleHistory = useMemo(
    () => filterAiMaterialsHistory(historyEntries, { query: historyQuery, status: historyStatus }),
    [historyEntries, historyQuery, historyStatus],
  );

  const historyCounters = useMemo(() => ({
    all: historyEntries.length,
    completed: historyEntries.filter((e) => e.status === "completed").length,
    running: historyEntries.filter((e) => e.status === "running").length,
    error: historyEntries.filter((e) => e.status === "error").length,
  }), [historyEntries]);

  /** État vide : amène l'utilisateur au formulaire d'analyse déjà existant. */
  const goToAnalyzeStep = () => {
    analyzeStepRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const projectCtx = useMemo<ProjectContext>(() => {
    const proj = projects.find((p: any) => p._id === projectId) as any;
    if (!proj) return {
      region: form.region,
      surface: Number(form.surface) || 0,
      floors: Number(form.floors) || 1,
      standing: form.standing as ProjectContext["standing"],
      budgetMode: "moyen",
    };
    return {
      projectName: proj.name,
      projectCategory: proj.category,
      region: proj.region || form.region,
      surface: Number(proj.surface || form.surface) || 0,
      floors: Number(proj.floors || form.floors) || 1,
      standing: form.standing as ProjectContext["standing"],
      budgetMode: "moyen",
      rooms: { bathrooms: proj.bathrooms, kitchens: proj.kitchens, bedrooms: proj.bedrooms },
      terrainSurface: proj.surfaceTotale,
    };
  }, [projects, projectId, form]);

  const selectProject = (id: string) => {
    setProjectId(id);
    const proj = projects.find((p: any) => p._id === id) as any;
    if (proj) {
      setForm((f) => ({
        ...f,
        surface: proj.surface || f.surface,
        floors: proj.floors || f.floors || 1,
        region: proj.region || f.region,
      }));
    }
  };

  const handleAnalyze = async () => {
    if (selectedCats.length === 0) return toast.error("Sélectionnez au moins une catégorie de matériaux.");
    if (!projectId) return toast.error("Choisissez un projet.");
    setAnalyzing(true);
    try {
      const res = await recommendMaterials({
        projectId: projectId as any,
        context: projectCtx,
        categories: selectedCats,
        materialIds: selectedMaterialIds,
        enhanceWithAI: enhance,
      });
      // Sauvegarde automatique puis redirection vers la page dédiée de résultat
      let savedAnalysisId: string | undefined;
      try {
        savedAnalysisId = await saveAnalysis({
          projectId: projectId as any,
          input: { context: projectCtx, categories: selectedCats, useAI: true, enhance },
          results: { recommend: res },
        });
        setSavedId(savedAnalysisId);
      } catch {
        /* la sauvegarde est optionnelle */
      }
      toast.success("Analyse terminée.");
      if (savedAnalysisId) {
        navigate(`/dashboard/ai-materials/result/${savedAnalysisId}`);
      } else {
        toast.error("Impossible de rediriger : analyse non enregistrée.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'analyse");
    }
    setAnalyzing(false);
  };

  const loadAnalysis = (doc: any) => {
    const res = doc?.results?.recommend;
    if (!doc || !res) return toast.error("Analyse sans recommandation enregistrée.");
    setSavedId(doc._id);
    // Redirection vers la page dédiée de résultat
    navigate(`/dashboard/ai-materials/result/${doc._id}`);
  };

  const noProjects = projects.length === 0;

  const estimationMaterialCount = useMemo(
    () => estimationCategories.reduce((sum, c) => sum + c.materials.length, 0),
    [estimationCategories],
  );
  const allMaterialsSelected =
    estimationMaterialCount > 0 && selectedMaterialIds.length >= estimationMaterialCount;

  const toggleMaterial = (id: string) =>
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleCategory = (cat: any) => {
    const ids: string[] = cat.materials.map((m: any) => m.id);
    const all = ids.length > 0 && ids.every((id) => selectedMaterialIds.includes(id));
    setSelectedMaterialIds((prev) =>
      all ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids])),
    );
  };

  const toggleAllMaterials = () =>
    setSelectedMaterialIds(
      allMaterialsSelected
        ? []
        : estimationCategories.flatMap((c) => c.materials.map((m: any) => m.id as string)),
    );

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background pb-12">
        <ClientProPaywall>
      {/* En-tête : l'en-tête projet unifié du JourneyNav remplace l'ancien
          en-tête de fonctionnalité (« Assistant Matériaux IA »). */}
      {/* Journey du projet — parcours linéaire persistant (PDF par étape +
          « Suivant → »), dans le flux normal de la page. */}
      <ProjectJourneyNav
        projectId={journeyProject?._id ?? null}
        category={journeyProject?.category}
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
              L'IA analyse le catalogue 2026 et les offres fournisseurs pour vous proposer 3 solutions
              (Standard · Équilibrée · Premium), le coût total estimé, les fournisseurs au meilleur prix
              et l'optimisation de votre budget — adaptés au climat et au marché tunisien.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { icon: CircleDollarSign, text: "Budget & standing" },
                { icon: Scale, text: "3 solutions comparées" },
                { icon: Store, text: "Fournisseurs recensés" },
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
                <CardDescription className="text-[10px]">Choisissez un projet de construction existant — les informations sont importées automatiquement</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            {noProjects ? (
              <div className="rounded-xl border border-dashed border-border/60 p-6 sm:p-8 text-center">
                <Building2 className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm font-medium">Aucun projet de construction trouvé</p>
                <p className="text-xs text-muted-foreground mt-1 mb-3">Créez d'abord un projet pour importer automatiquement surface, type et localisation.</p>
                <Button size="sm" onClick={() => navigate("/dashboard/new")} className="h-8 gap-1.5 text-xs">
                  <HardHat className="h-3.5 w-3.5" /> Créer un projet de construction
                </Button>
              </div>
            ) : (
              <>
                {projects.length > 0 && (
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

              </>
            )}
          </CardContent>
        </Card>

        {/* ÉTAPE 2 — MATÉRIAUX REQUIS (besoin calculé du projet) */}
        <Card className="border border-border/40 overflow-hidden rounded-xl">
          <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 text-xs font-bold">2</div>
                <div>
                  <CardTitle className="text-sm font-semibold">Matériaux requis par votre estimation</CardTitle>
                  <CardDescription className="text-[10px]">
                    {estimation?.hasEstimation
                      ? `${selectedCats.length} catégorie(s) · ${selectedMaterialIds.length}/${estimationMaterialCount} matériau(x) sélectionné(s)`
                      : "Aligné sur le calcul des coûts de construction du projet"}
                  </CardDescription>
                </div>
              </div>
              {estimation?.hasEstimation && (
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={toggleAllMaterials}>
                  <RefreshCw className="h-3 w-3" />
                  {allMaterialsSelected ? "Tout désélectionner" : "Tout sélectionner"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            {!journeyProject ? (
              <div className="rounded-xl border border-dashed border-border/60 p-6 sm:p-8 text-center">
                <HardHat className="h-9 w-9 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm font-medium">Sélectionnez d'abord un projet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Les matériaux requis sont chargés depuis l'estimation des coûts de construction du projet choisi à l'étape 1.
                </p>
              </div>
            ) : !estimation?.hasEstimation ? (
              <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/[0.04] p-6 sm:p-8 text-center">
                <Info className="h-9 w-9 mx-auto mb-2 text-amber-500" />
                <p className="text-sm font-medium">Aucune estimation des coûts pour ce projet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-3 max-w-md mx-auto">
                  Pour analyser les matériaux réellement requis, lancez d'abord le calcul des coûts de construction — les matériaux seront alors chargés automatiquement.
                </p>
                <Button size="sm" className="h-8 gap-1.5 text-xs"
                  onClick={() => navigate(`/dashboard/project/${journeyProject._id}`)}>
                  <CircleDollarSign className="h-3.5 w-3.5" /> Lancer le calcul des coûts
                </Button>
              </div>
            ) : (
              <>
                {/* Pré-sélection intelligente (prix / qualité) */}
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-2.5 py-2">
                  <Wand2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span className="text-[10px] leading-tight text-muted-foreground">{preselection.reason}</span>
                  <label className="ml-auto flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                    Priorité
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as PreselectPriority)}
                      aria-label="Priorité de la pré-sélection (prix / qualité)"
                      className="h-7 rounded-lg border border-border/50 bg-background px-1.5 text-[10px] font-semibold text-foreground outline-none focus:border-emerald-500/60"
                    >
                      {PRIORITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="space-y-2">
                  {estimationCategories.map((c) => {
                    const selectedInCat = c.materials.filter((m: any) => selectedMaterialIds.includes(m.id)).length;
                    const allCatSelected = selectedInCat === c.materials.length && c.materials.length > 0;
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          "rounded-xl border p-2.5 transition-colors",
                          selectedInCat > 0 ? "border-emerald-500/40 bg-emerald-500/[0.03]" : "border-border/40",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => toggleCategory(c)}
                            className="flex items-center gap-2 text-left cursor-pointer">
                            <span className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] transition-all",
                              allCatSelected ? "border-emerald-500 bg-emerald-500 text-white"
                                : selectedInCat > 0 ? "border-emerald-500/60 bg-emerald-500/15 text-transparent"
                                : "border-border text-transparent",
                            )}>
                              <Check className="h-2.5 w-2.5" />
                            </span>
                            <span className={cn("text-xs font-semibold", selectedInCat > 0 ? "text-emerald-700 dark:text-emerald-400" : "")}>
                              {c.label}
                            </span>
                          </button>
                          <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                            {selectedInCat}/{c.materials.length} sélectionné(s)
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                          {c.materials.map((m: any) => {
                            const active = selectedMaterialIds.includes(m.id);
                            return (
                              <button key={m.id} type="button" onClick={() => toggleMaterial(m.id)}
                                className={cn(
                                  "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-all cursor-pointer",
                                  active ? "border-emerald-500/50 bg-emerald-500/5" : "border-border/40 hover:border-border hover:bg-muted/30",
                                )}
                              >
                                <span className={cn(
                                  "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[8px]",
                                  active ? "border-emerald-500 bg-emerald-500 text-white" : "border-border text-transparent",
                                )}>
                                  <Check className="h-2 w-2" />
                                </span>
                                <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{m.name}</span>
                                <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground">
                                  {m.quantity ? `${Math.round(m.quantity * 10) / 10} ${m.unit}` : m.unit}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Info className="h-3 w-3 shrink-0" />
                  Ces matériaux proviennent de l'estimation des coûts de construction de « {journeyProject.name} ». L'analyse n'étudiera que les matériaux sélectionnés.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* ÉTAPE 3 — LANCER L'ANALYSE */}
        <Card ref={analyzeStepRef} className="scroll-mt-24 border border-border/40 overflow-hidden rounded-xl">
          <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 text-xs font-bold">3</div>
              <div>
                <CardTitle className="text-sm font-semibold">Lancer l'analyse</CardTitle>
                <CardDescription className="text-[10px]">L'IA utilise le budget moyen par défaut pour toutes les estimations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} className="accent-emerald-600" />
                Enrichir les explications avec l'IA générative
              </label>
              <div className="sm:ml-auto">
                <Button
                  className="gap-2 h-9"
                  disabled={analyzing || !estimation?.hasEstimation || selectedMaterialIds.length === 0}
                  onClick={handleAnalyze}
                >
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {analyzing ? "Analyse en cours..." : "Lancer l'analyse IA"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Historique — refonte UI/UX (données, statuts, routes et actions inchangés) */}
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
              /* ── État vide ── */
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
                {/* ── Recherche & filtres (contrôles compacts) ── */}
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

                {/* ── Liste des analyses : cartes ── */}
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
                      const doc = historyDocs.get(entry.id);
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
                            {/* Icône + projet + date + menu ⋯ */}
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
                                  <DropdownMenuItem className="cursor-pointer gap-2 text-xs" onClick={() => loadAnalysis(doc)}>
                                    <ExternalLink className="h-3.5 w-3.5" /> Voir l'analyse
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="cursor-pointer gap-2 text-xs" onClick={() => loadAnalysis(doc)}>
                                    <RefreshCw className="h-3.5 w-3.5" /> Charger les résultats
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive"
                                    onClick={async () => {
                                      await deleteAnalysis({ analysisId: entry.id as any });
                                      if (savedId === entry.id) setSavedId(null);
                                      toast.success("Analyse supprimée");
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Statut + statistiques */}
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

                            {/* Résumé : gamme · surface · région */}
                            {summary && (
                              <p className="mt-2 truncate text-[10px] text-muted-foreground/80" title={summary}>{summary}</p>
                            )}

                            {/* Budget matériaux */}
                            {entry.totalCost !== null && entry.totalCost > 0 && (
                              <div className="mt-2 flex items-baseline justify-between gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5">
                                <span className="text-[9px] text-muted-foreground">Budget matériaux estimé</span>
                                <span className="text-xs font-bold text-primary">{fmtTnd(entry.totalCost)}</span>
                              </div>
                            )}

                            {/* Action principale — alignée en bas de carte */}
                            <div className="mt-auto pt-2.5">
                              <Button
                                size="sm"
                                className="h-9 w-full gap-1.5 rounded-lg text-xs active:scale-[0.98]"
                                onClick={() => loadAnalysis(doc)}
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
