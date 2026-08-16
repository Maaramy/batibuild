import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation, useAction } from "convex/react";
import { useNavigate } from "react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { usePageSEO } from "@/hooks/use-page-seo";
import {
  ArrowLeft, Sparkles, HardHat, Loader2, FileDown, Store, MessageSquare,
  PiggyBank, Zap, Scale, Check, Trash2, Clock, MapPin, Ruler, Layers,
  TrendingDown, TrendingUp, Minus, Wand2, Gauge, CalendarDays, ShieldCheck,
  RefreshCw, ChevronDown, ChevronUp, BadgeCheck, Crown, CircleDollarSign,
  CircleDot, Building2, Info, SlidersHorizontal, Trophy,
} from "lucide-react";
import {
  COPILOT_CATEGORIES,
  STANDING_LEVELS,
  BUDGET_MODES,
  buildAssistantContext,
  MaterialScores,
  RecommendResult,
  ProjectContext,
} from "@/convex/aiMaterialsEngine";
import { generateMaterialReportPdf } from "@/lib/materialReportPdf";
import { REGION_LABELS } from "@/lib/projectPdf";

// ── Helpers ──────────────────────────────────────────────────────────────────
const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const fmtTnd = (n: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(n);

const fmtNum = (n: number, digits = 2) =>
  new Intl.NumberFormat("fr-TN", { maximumFractionDigits: digits }).format(n);

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const PROFILE_META: Record<string, { label: string; color: string; icon: any; badge: string }> = {
  economique: { label: "Économique", color: "emerald", icon: TrendingDown, badge: "Meilleur prix" },
  equilibre: { label: "Équilibrée", color: "blue", icon: Minus, badge: "Meilleur rapport qualité/prix" },
  premium: { label: "Premium", color: "violet", icon: TrendingUp, badge: "Meilleure performance" },
};

const PROFILE_TEXT: Record<string, string> = {
  economique: "text-emerald-600 dark:text-emerald-400",
  equilibre: "text-blue-600 dark:text-blue-400",
  premium: "text-violet-600 dark:text-violet-400",
};

const CRITERIA: { key: keyof MaterialScores; label: string }[] = [
  { key: "prix", label: "Prix" },
  { key: "qualite", label: "Qualité" },
  { key: "durabilite", label: "Durabilité" },
  { key: "isolationThermique", label: "Isolation thermique" },
  { key: "isolationAcoustique", label: "Isolation acoustique" },
  { key: "resistance", label: "Résistance" },
  { key: "entretien", label: "Entretien" },
  { key: "disponibilite", label: "Disponibilité" },
  { key: "impactEnvironnemental", label: "Impact environnemental" },
];

const PROJECT_LABELS: Record<string, string> = {
  maison: "Maison", villa: "Villa", appartement: "Appartement", studio: "Studio",
  duplex: "Duplex", immeuble: "Immeuble", local_commercial: "Local commercial",
  bureau: "Bureau", entrepot: "Entrepôt", residence_touristique: "Résidence touristique",
  projet_neuf: "Projet immobilier neuf",
};

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-blue-600 dark:text-blue-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE — AI MATERIALS COPILOT
// ═══════════════════════════════════════════════════════════════════════════
export default function AiMaterials() {
  usePageSEO({
    title: "Assistant Matériaux IA - batibuild App",
    description: "Assistant intelligent de choix des matériaux de construction par IA : recommandation comparative, prix du marché tunisien 2026, fournisseurs, optimisation du budget.",
  });
  const navigate = useNavigate();
  const { user } = useAuth();
  const projects = useQuery(api.projects.getUserProjects, {}) || [];
  const catStats = useQuery(api.aiMaterials.getCopilotCategories) || [];
  const analyses = useQuery(api.aiMaterials.getCopilotAnalyses) || [];
  const saveAnalysis = useMutation(api.aiMaterials.saveCopilotAnalysis);
  const deleteAnalysis = useMutation(api.aiMaterials.deleteCopilotAnalysis);
  const recommendMaterials = useAction(api.aiMaterialsActions.recommendMaterials);
  const compareCopilotMaterials = useAction(api.aiMaterialsActions.compareCopilotMaterials);
  const optimizeCopilotBudget = useAction(api.aiMaterialsActions.optimizeCopilotBudget);
  const improveCopilotPerformance = useAction(api.aiMaterialsActions.improveCopilotPerformance);
  const askMaterialsAssistant = useAction(api.aiMaterialsActions.askMaterialsAssistant);

  // ── Formulaire ──
  const [projectId, setProjectId] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [form, setForm] = useState({
    surface: 120,
    floors: 1,
    region: "tunis",
    city: "",
    quarter: "",
    standing: "standard",
    year: new Date().getFullYear(),
    budgetMode: "moyen",
    budgetAmount: 120000,
  });
  const [priorities, setPriorities] = useState({ price: 50, quality: 50, isolation: 50, durability: 50, eco: 50 });
  const [selectedCats, setSelectedCats] = useState<string[]>([
    "ciment", "beton", "briques", "isolation_thermique", "carrelage", "peinture", "menuiserie", "electricite", "plomberie", "sanitaires",
  ]);
  const [useAI, setUseAI] = useState(true);
  const [enhance, setEnhance] = useState(true);
  const copilotMaterialsQuery = useQuery(api.aiMaterials.getCopilotMaterials, { categories: selectedCats });
  const catalog = copilotMaterialsQuery ?? null;

  // ── Résultats ──
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [optimization, setOptimization] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [compSel, setCompSel] = useState<string[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [budgetInput, setBudgetInput] = useState(0);
  const [savedId, setSavedId] = useState<string | null>(null);

  // ── Chat ──
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([
    {
      role: "assistant",
      content:
        "Bonjour ! Je suis votre Assistant Matériaux IA 🏗️. Posez-moi vos questions sur les matériaux, les prix tunisiens 2026, l'isolation, les fournisseurs ou le budget de votre projet.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  const projectCtx = useMemo<ProjectContext>(() => {
    const proj = projects.find((p: any) => p._id === projectId) as any;
    const effective = manualMode ? form : { ...form, surface: form.surface || proj?.surface || 0, floors: form.floors || proj?.floors || 1, region: form.region || proj?.region || "tunis" };
    return {
      projectName: !manualMode && proj ? proj.name : undefined,
      projectCategory: !manualMode && proj ? proj.category : undefined,
      region: effective.region,
      city: effective.city,
      quarter: effective.quarter,
      surface: Number(effective.surface) || 0,
      floors: Number(effective.floors) || 1,
      year: Number(effective.year) || new Date().getFullYear(),
      standing: effective.standing as ProjectContext["standing"],
      budgetMode: effective.budgetMode as ProjectContext["budgetMode"],
      budgetAmount: Number(effective.budgetAmount) || undefined,
      priorities,
      rooms: !manualMode && proj ? { bathrooms: proj.bathrooms, kitchens: proj.kitchens, bedrooms: proj.bedrooms } : undefined,
      terrainSurface: !manualMode && proj ? proj.surfaceTotale : undefined,
    };
  }, [projects, projectId, manualMode, form, priorities]);

  const selectedProject = projects.find((p: any) => p._id === projectId) as any;

  const selectProject = (id: string) => {
    setProjectId(id);
    setManualMode(false);
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
    if (!manualMode && !projectId) return toast.error("Choisissez un projet (ou activez la saisie manuelle).");
    setAnalyzing(true);
    setResult(null);
    setOptimization(null);
    setPerformance(null);
    setComparison(null);
    try {
      const res = await recommendMaterials({
        projectId: manualMode ? undefined : (projectId as any),
        context: projectCtx,
        categories: selectedCats,
        enhanceWithAI: enhance,
      });
      setResult(res);
      setBudgetInput(Math.max(1000, Math.round(res.cost.total * 0.85)));
      // Comparateur multi-matériaux : réinitialiser la sélection
      setCompSel([]);
      // Sauvegarde automatique de l'analyse
      try {
        const id = await saveAnalysis({
          projectId: manualMode ? undefined : (projectId as any),
          input: { context: projectCtx, categories: selectedCats, useAI, enhance },
          results: { recommend: res },
        });
        setSavedId(id);
      } catch {
        /* la sauvegarde est optionnelle */
      }
      toast.success("Analyse terminée — recommandations générées.");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'analyse");
    }
    setAnalyzing(false);
  };

  const runOptimize = async () => {
    if (!result || budgetInput <= 0) return;
    setBusy((b) => ({ ...b, optimize: true }));
    try {
      const res = await optimizeCopilotBudget({ result, budgetAmount: budgetInput });
      setOptimization(res);
      toast.success(`Économie potentielle : ${fmtTnd(res.savings)}`);
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
    setBusy((b) => ({ ...b, optimize: false }));
  };

  const runPerformance = async () => {
    if (!result) return;
    setBusy((b) => ({ ...b, performance: true }));
    try {
      const res = await improveCopilotPerformance({ result });
      setPerformance(res);
      toast.success(res.improvements.length ? `${res.improvements.length} amélioration(s) suggérée(s)` : "Aucune amélioration nécessaire — votre sélection est déjà performante.");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
    setBusy((b) => ({ ...b, performance: false }));
  };

  const runCompare = async () => {
    if (compSel.length < 2) return toast.error("Sélectionnez entre 2 et 5 matériaux à comparer.");
    setBusy((b) => ({ ...b, compare: true }));
    try {
      const res = await compareCopilotMaterials({ ids: compSel });
      setComparison(res);
      toast.success("Comparaison générée.");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
    setBusy((b) => ({ ...b, compare: false }));
  };

  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || busy.chat) return;
    setChat((c) => [...c, { role: "user", content: q }]);
    setChatInput("");
    setBusy((b) => ({ ...b, chat: true }));
    try {
      const projectText = buildAssistantContext(null, projectCtx);
      const analysisText = result ? buildAssistantContext(result, projectCtx) : "";
      const res = await askMaterialsAssistant({
        question: q,
        projectContext: projectText,
        analysisContext: analysisText,
      });
      setChat((c) => [...c, { role: "assistant", content: res.answer }]);
    } catch (err: any) {
      setChat((c) => [...c, { role: "assistant", content: "Désolé, une erreur est survenue. Réessayez." }]);
    }
    setBusy((b) => ({ ...b, chat: false }));
  };

  const loadAnalysis = (doc: any) => {
    const res = doc.results?.recommend;
    if (!res) return toast.error("Analyse sans recommandation enregistrée.");
    setResult(res);
    setOptimization(doc.results?.optimization || null);
    setPerformance(doc.results?.performance || null);
    setComparison(doc.results?.comparison || null);
    if (doc.input?.categories) setSelectedCats(doc.input.categories);
    if (doc.input?.context) {
      const c = doc.input.context;
      setForm((f) => ({ ...f, ...(c.surface ? { surface: c.surface } : {}), ...(c.floors ? { floors: c.floors } : {}), region: c.region || f.region, standing: c.standing || f.standing, budgetMode: c.budgetMode || f.budgetMode, budgetAmount: c.budgetAmount || f.budgetAmount, year: c.year || f.year }));
      if (c.priorities) setPriorities(c.priorities);
    }
    setProjectId(doc.projectId || "");
    setManualMode(!doc.projectId);
    setSavedId(doc._id);
    setBudgetInput(Math.round((res.cost?.total || 0) * 0.85));
    toast.success("Analyse chargée.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePdf = () => {
    if (!result) return;
    try {
      generateMaterialReportPdf({ result, optimization: optimization || undefined, performance: performance || undefined, comparison: comparison || undefined });
      toast.success("Rapport PDF généré.");
    } catch (err: any) {
      toast.error("Erreur PDF : " + err.message);
    }
  };

  const noProjects = !analyzing && projects.length === 0 && !manualMode;

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/20 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => navigate("/dashboard")}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-border/50 shrink-0" />
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-600 shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">Assistant Matériaux IA</h1>
              <p className="text-[9px] text-muted-foreground leading-tight truncate">Choix des matériaux · Prix Tunisie 2026 · Copilot</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {result && (
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handlePdf}>
                <FileDown className="h-3.5 w-3.5" />
                Rapport PDF
              </Button>
            )}
          </div>
        </div>
      </header>

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
                AI Materials Copilot · Batibuild
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">Quel est le meilleur matériau pour mon projet ?</h2>
            <p className="mt-1.5 text-xs sm:text-sm text-emerald-100/80 max-w-2xl">
              L'IA analyse le catalogue 2026 et les offres fournisseurs pour vous proposer 3 solutions
              (Économique · Équilibrée · Premium), le coût total estimé, les fournisseurs au meilleur prix
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
                <div className="flex flex-wrap justify-center gap-2">
                  <Button size="sm" onClick={() => navigate("/dashboard/new")} className="h-8 gap-1.5 text-xs">
                    <HardHat className="h-3.5 w-3.5" /> Créer un projet
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setManualMode(true)}>
                    Saisie manuelle
                  </Button>
                </div>
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
                          !manualMode && projectId === p._id
                            ? "border-emerald-500/60 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                            : "border-border/40 hover:border-border hover:bg-muted/30",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <HardHat className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-xs font-semibold truncate">{p.name}</span>
                          {!manualMode && projectId === p._id && <Check className="h-3.5 w-3.5 text-emerald-600 ml-auto shrink-0" />}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5 text-[9px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1 rounded bg-muted/40 px-1.5 py-0.5">
                            <Building2 className="h-2.5 w-2.5" /> {PROJECT_LABELS[p.category] || p.category}
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
                {projects.length > 0 && (
                  <button
                    onClick={() => setManualMode(!manualMode)}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
                  >
                    {manualMode ? "← Utiliser un projet existant" : "ou saisir manuellement les informations"}
                  </button>
                )}
                {manualMode && (
                  <div className="rounded-xl border border-border/30 bg-muted/10 p-3 text-[11px] text-muted-foreground">
                    Mode manuel : renseignez la surface, le niveau de standing et le budget ci-dessous (étape 2).
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ÉTAPE 2 — CONTEXTE */}
        <Card className="border border-border/40 overflow-hidden rounded-xl">
          <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 text-xs font-bold">2</div>
              <div>
                <CardTitle className="text-sm font-semibold">Mon besoin</CardTitle>
                <CardDescription className="text-[10px]">Contexte du projet — surface, localisation, standing et année prévue</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Surface (m²)</label>
                <Input type="number" min={1} value={form.surface || ""}
                  onChange={(e) => setForm({ ...form, surface: Number(e.target.value) })} className="h-9 text-sm rounded-lg" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Niveaux</label>
                <Input type="number" min={1} max={12} value={form.floors || ""}
                  onChange={(e) => setForm({ ...form, floors: Number(e.target.value) })} className="h-9 text-sm rounded-lg" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Gouvernorat</label>
                <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}
                  className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm">
                  {Object.entries(REGION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Année de construction</label>
                <Input type="number" min={2025} max={2035} value={form.year || ""}
                  onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} className="h-9 text-sm rounded-lg" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Ville</label>
                <Input placeholder="ex. La Marsa" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="h-9 text-sm rounded-lg" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Quartier / zone</label>
                <Input placeholder="ex. Centre-ville" value={form.quarter} onChange={(e) => setForm({ ...form, quarter: e.target.value })} className="h-9 text-sm rounded-lg" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-2 block">Niveau de standing</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {STANDING_LEVELS.map((s) => (
                  <button key={s.id}
                    onClick={() => setForm({ ...form, standing: s.id })}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left transition-all cursor-pointer",
                      form.standing === s.id ? "border-blue-500/60 bg-blue-500/5 ring-1 ring-blue-500/20" : "border-border/40 hover:border-border hover:bg-muted/30",
                    )}
                  >
                    <span className={cn("text-xs font-semibold", form.standing === s.id ? "text-blue-600 dark:text-blue-400" : "")}>{s.label}</span>
                    <span className="block text-[9px] text-muted-foreground mt-0.5 leading-tight">{s.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ÉTAPE 3 — CATÉGORIES */}
        <Card className="border border-border/40 overflow-hidden rounded-xl">
          <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 text-xs font-bold">3</div>
                <div>
                  <CardTitle className="text-sm font-semibold">Sélection des catégories de matériaux</CardTitle>
                  <CardDescription className="text-[10px]">{selectedCats.length} sélectionnée(s) · {catStats.length} catégories disponibles</CardDescription>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                onClick={() => setSelectedCats(selectedCats.length === catStats.length ? [] : catStats.map((c) => c.id))}>
                <RefreshCw className="h-3 w-3" />
                {selectedCats.length === catStats.length ? "Tout désélectionner" : "Tout sélectionner"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
              {catStats.map((c) => {
                const active = selectedCats.includes(c.id);
                return (
                  <button key={c.id}
                    onClick={() => setSelectedCats(active ? selectedCats.filter((x) => x !== c.id) : [...selectedCats, c.id])}
                    className={cn(
                      "relative flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer",
                      active ? "border-emerald-500/60 bg-emerald-500/5 ring-1 ring-emerald-500/20" : "border-border/40 hover:border-border hover:bg-muted/30",
                    )}
                  >
                    <span className={cn("absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full border text-[9px] transition-all",
                      active ? "bg-emerald-500 border-emerald-500 text-white" : "border-border text-transparent")}>
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    <span className={cn("text-xs font-semibold leading-tight pr-4", active ? "text-emerald-700 dark:text-emerald-400" : "")}>{c.label}</span>
                    <span className="text-[9px] text-muted-foreground">{c.count} matériaux en base</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ÉTAPE 4 — BUDGET & PRIORITÉS + ANALYSE */}
        <Card className="border border-border/40 overflow-hidden rounded-xl">
          <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 text-xs font-bold">4</div>
              <div>
                <CardTitle className="text-sm font-semibold">Mon budget & mes priorités</CardTitle>
                <CardDescription className="text-[10px]">L'IA recherche le meilleur rapport valeur/prix — jamais le matériau le plus cher automatiquement</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-2 block">Budget</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {BUDGET_MODES.map((b) => (
                  <button key={b.id}
                    onClick={() => setForm({ ...form, budgetMode: b.id })}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left transition-all cursor-pointer",
                      form.budgetMode === b.id ? "border-violet-500/60 bg-violet-500/5 ring-1 ring-violet-500/20" : "border-border/40 hover:border-border hover:bg-muted/30",
                    )}
                  >
                    <span className={cn("block text-xs font-semibold", form.budgetMode === b.id ? "text-violet-600 dark:text-violet-400" : "")}>{b.label}</span>
                    <span className="block text-[9px] text-muted-foreground leading-tight mt-0.5">{b.hint}</span>
                  </button>
                ))}
              </div>
              {form.budgetMode === "personnalise" && (
                <div className="mt-3 max-w-xs">
                  <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Budget maximum (TND)</label>
                  <Input type="number" min={1000} value={form.budgetAmount || ""}
                    onChange={(e) => setForm({ ...form, budgetAmount: Number(e.target.value) })} className="h-9 text-sm rounded-lg" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <label className="text-[10px] font-medium text-muted-foreground">Priorités (0-100) — l'assistant adapte ses recommandations</label>
              </div>
              <div className="grid sm:grid-cols-5 gap-3">
                {([
                  ["price", "Prix"],
                  ["quality", "Qualité"],
                  ["isolation", "Isolation"],
                  ["durability", "Durabilité"],
                  ["eco", "Écologie"],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold">{priorities[key]}</span>
                    </div>
                    <input
                      type="range" min={0} max={100} step={5}
                      value={priorities[key]}
                      onChange={(e) => setPriorities({ ...priorities, [key]: Number(e.target.value) })}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} className="accent-emerald-600" />
                Enrichir les explications avec l'IA générative
              </label>
              <div className="sm:ml-auto">
                <Button className="gap-2 h-9" disabled={analyzing} onClick={handleAnalyze}>
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {analyzing ? "Analyse en cours..." : "Lancer l'analyse IA"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── RÉSULTATS ── */}
        {analyzing && (
          <Card className="border border-border/40">
            <CardContent className="p-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-3" />
              <p className="text-sm font-semibold">Analyse des matériaux en cours...</p>
              <p className="text-xs text-muted-foreground mt-1">Croisement du catalogue 2026, des offres fournisseurs et de votre projet — cela prend quelques secondes.</p>
            </CardContent>
          </Card>
        )}

        {result && !analyzing && (
          <>
            {/* Recommandation finale */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border border-emerald-500/30 bg-gradient-to-br from-emerald-50/60 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 overflow-hidden rounded-xl">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      <Sparkles className="h-3 w-3" /> Notre recommandation
                    </Badge>
                    <Badge variant="outline" className="gap-1.5 text-[10px]">
                      <Gauge className="h-3 w-3" /> Score {result.recommendation.score}/100
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-base sm:text-xl font-extrabold tracking-tight">
                      Solution {result.recommendation.solution === "economique" ? "A" : result.recommendation.solution === "equilibre" ? "B" : "C"} — {PROFILE_META[result.recommendation.solution]?.label}
                    </h3>
                    <span className="text-xs text-muted-foreground">· {result.recommendation.materialName} ({result.recommendation.categoryLabel})</span>
                  </div>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">{result.recommendation.explanation}</p>
                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    {result.recommendation.advantages.length > 0 && (
                      <ul className="space-y-1">
                        {result.recommendation.advantages.slice(0, 3).map((a, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                            <Check className="h-3 w-3 mt-0.5 shrink-0" /> {a}
                          </li>
                        ))}
                      </ul>
                    )}
                    {result.recommendation.limits.length > 0 && (
                      <ul className="space-y-1">
                        {result.recommendation.limits.slice(0, 3).map((l, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                            <Info className="h-3 w-3 mt-0.5 shrink-0" /> {l}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <p className="mt-3 text-[10px] text-muted-foreground/70 italic">
                    Recommandation générée le {fmtDate(result.generatedAt)} — aide à la décision fondée sur le catalogue 2026 et les offres recensées.
                    Elle ne remplace pas la validation d'un ingénieur ou d'un architecte.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Coût total */}
            <Card className="border border-border/40 overflow-hidden rounded-xl">
              <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <CircleDollarSign className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Coût total estimatif</CardTitle>
                    <CardDescription className="text-[10px]">Matériaux recommandés · Pose · Transport · Déchets · Accessoires · TVA 19%</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 lg:col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total estimé (probable)</p>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{fmtTnd(result.cost.total)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{fmtTnd(result.cost.perM2)} / m² construit</p>
                  </div>
                  <div className="rounded-xl border border-border/40 p-3.5">
                    <p className="text-[10px] text-muted-foreground">Fourchette</p>
                    <p className="text-sm font-bold mt-1">{fmtTnd(result.cost.min)}</p>
                    <p className="text-xs text-muted-foreground">— minimum —</p>
                    <p className="text-sm font-bold mt-1 text-amber-600">{fmtTnd(result.cost.max)}</p>
                    <p className="text-xs text-muted-foreground">— maximum —</p>
                  </div>
                  <div className="rounded-xl border border-border/40 p-3.5">
                    <p className="text-[10px] text-muted-foreground">Prix indicatif du marché</p>
                    <p className="text-sm font-bold mt-1 flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> {fmtDate(result.cost.priceDate || result.generatedAt)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-2">Dernière mise à jour des données</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
                  {[
                    { label: "Matériaux", value: result.cost.materials },
                    { label: "Pose", value: result.cost.pose },
                    { label: "Transport", value: result.cost.transport },
                    { label: "Déchets", value: result.cost.waste },
                    { label: "Accessoires", value: result.cost.accessories },
                    { label: "TVA", value: result.cost.tva },
                    { label: "Total", value: result.cost.total, strong: true },
                  ].map((row, i) => (
                    <div key={i} className={cn("rounded-lg border px-2.5 py-2", row.strong ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/30 bg-muted/10")}>
                      <p className="text-[9px] text-muted-foreground">{row.label}</p>
                      <p className={cn("text-xs font-bold", row.strong ? "text-emerald-600" : "")}>{fmtTnd(row.value)}</p>
                    </div>
                  ))}
                </div>
                {result.missingData.length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                    <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <Info className="h-3 w-3" /> Données non disponibles (signalées, jamais inventées)
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {result.missingData.map((m, i) => (
                        <li key={i} className="text-[10px] text-muted-foreground">• {m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Solutions par catégorie */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                  <Layers className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-sm sm:text-base font-bold tracking-tight">Recommandations par catégorie — 3 solutions comparées</h2>
              </div>
              {result.categories.map((cat) => {
                const recProfile = result.recommendation.solution;
                const cheapest = [...cat.solutions].sort((a, b) => a.material.band.avg - b.material.band.avg)[0];
                const bestPerf = [...cat.solutions].sort(
                  (a, b) => b.scores.isolationThermique + b.scores.isolationAcoustique - (a.scores.isolationThermique + a.scores.isolationAcoustique),
                )[0];
                return (
                  <motion.div key={cat.categoryId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border border-border/40 overflow-hidden rounded-xl">
                      <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <HardHat className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <CardTitle className="text-sm font-semibold">{cat.label}</CardTitle>
                              <CardDescription className="text-[10px]">{cat.candidatesCount} matériaux analysés dans la base</CardDescription>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[9px] gap-1">
                              <CircleDot className="h-2.5 w-2.5 text-emerald-600" /> Meilleur rapport qualité/prix : {PROFILE_META[cat.bestValue]?.label}
                            </Badge>
                            {cat.bestSupplier ? (
                              <Badge variant="outline" className="text-[9px] gap-1 border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400">
                                <Trophy className="h-2.5 w-2.5" /> Meilleur fournisseur : {cat.bestSupplier.name} — dès {fmtTnd(cat.bestSupplier.price)}
                                {cat.bestSupplier.governorate ? ` · ${cat.bestSupplier.governorate}` : ""}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-5 space-y-3">
                        <div className="grid md:grid-cols-3 gap-3">
                          {cat.solutions.map((s) => {
                            const meta = PROFILE_META[s.profile];
                            const isRec = s.profile === recProfile;
                            const isCheapest = cheapest && s.material.id === cheapest.material.id;
                            const isBestPerf = bestPerf && s.material.id === bestPerf.material.id;
                            return (
                              <div key={s.profile} className={cn(
                                "relative rounded-xl border p-3.5 flex flex-col transition-all",
                                isRec ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20" : "border-border/40 bg-background",
                              )}>
                                {isRec && (
                                  <Badge className="absolute -top-2 left-3 gap-1 border-emerald-500/40 bg-emerald-500 text-white text-[9px]">
                                    <Sparkles className="h-2.5 w-2.5" /> Recommandé par IA
                                  </Badge>
                                )}
                                <div className="flex items-center justify-between gap-2">
                                  <span className={cn("text-xs font-bold uppercase tracking-wide", PROFILE_TEXT[s.profile])}>
                                    {meta.label}
                                  </span>
                                  <span className="text-lg font-black tabular-nums">{s.scores.noteGlobale}<span className="text-[10px] text-muted-foreground">/100</span></span>
                                </div>
                                <p className="mt-1 text-sm font-semibold leading-snug">{s.material.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {fmtTnd(s.material.band.avg)}/{s.material.unit} · Qté {fmtNum(s.material.quantity)} {s.material.quantityUnit}
                                  {s.material.brand ? ` · ${s.material.brand}` : ""}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {isCheapest && <Badge className="text-[8px] gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/30"><TrendingDown className="h-2.5 w-2.5" /> Meilleur prix</Badge>}
                                  {cat.bestValue === s.profile && <Badge className="text-[8px] gap-1 bg-blue-500/10 text-blue-700 border-blue-500/30"><BadgeCheck className="h-2.5 w-2.5" /> {PROFILE_META.equilibre.badge}</Badge>}
                                  {isBestPerf && s.profile !== cat.bestValue && <Badge className="text-[8px] gap-1 bg-violet-500/10 text-violet-700 border-violet-500/30"><Crown className="h-2.5 w-2.5" /> {PROFILE_META.premium.badge}</Badge>}
                                </div>
                                <div className="mt-2 grid grid-cols-5 gap-1 text-center">
                                  {CRITERIA.map((c) => (
                                    <div key={c.key} className="rounded bg-muted/30 py-1" title={c.label}>
                                      <p className="text-[8px] text-muted-foreground truncate">{c.label.split(" ")[0]}</p>
                                      <p className={cn("text-[10px] font-bold", scoreColor(s.scores[c.key]))}>{s.scores[c.key]}</p>
                                    </div>
                                  ))}
                                </div>
                                <ul className="mt-2 space-y-0.5 flex-1">
                                  {s.pros.slice(0, 2).map((p, i) => (
                                    <li key={i} className="flex items-start gap-1 text-[10px] text-muted-foreground">
                                      <Check className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" /> {p}
                                    </li>
                                  ))}
                                </ul>
                                {s.suppliers.length > 0 && (
                                  <div className="mt-2 rounded-lg border border-border/30 bg-muted/10 px-2.5 py-1.5">
                                    <p className="text-[9px] font-semibold text-muted-foreground flex items-center gap-1">
                                      <Store className="h-2.5 w-2.5" /> Fournisseurs dès {s.suppliers[0].price.toFixed(2)} TND
                                    </p>
                                    {s.suppliers.slice(0, 2).map((sup, i) => (
                                      <p key={i} className="text-[9px] text-muted-foreground truncate">
                                        {sup.name} {sup.governorate ? `· ${sup.governorate}` : ""}
                                      </p>
                                    ))}
                                  </div>
                                )}
                                <p className="mt-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border-t border-border/20 pt-1.5">
                                  Total pose incluse : {fmtTnd(s.material.totalCost)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                        {/* Tableau comparatif de la catégorie */}
                        <div className="overflow-x-auto rounded-xl border border-border/30">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border/10 bg-muted/20">
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Critère (sur 100)</th>
                                {cat.solutions.map((s) => (
                                  <th key={s.profile} className="py-2 px-3 text-right font-semibold">{PROFILE_META[s.profile].label}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {CRITERIA.map((c) => (
                                <tr key={c.key} className="border-b border-border/5">
                                  <td className="py-1.5 px-3 text-muted-foreground">{c.label}</td>
                                  {cat.solutions.map((s) => (
                                    <td key={s.profile} className={cn("py-1.5 px-3 text-right font-semibold tabular-nums", scoreColor(s.scores[c.key]))}>
                                      {s.scores[c.key]}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                              <tr>
                                <td className="py-2 px-3 font-bold">Note globale</td>
                                {cat.solutions.map((s) => (
                                  <td key={s.profile} className={cn("py-2 px-3 text-right font-black tabular-nums", scoreColor(s.scores.noteGlobale))}>
                                    {s.scores.noteGlobale}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Outils IA */}
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Optimiser le budget */}
              <Card className="border border-border/40 overflow-hidden rounded-xl">
                <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-5 py-3 sm:py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                      <PiggyBank className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">Optimiser mon budget avec l'IA</CardTitle>
                      <CardDescription className="text-[10px]">Réduisez le coût sans dégrader excessivement qualité, sécurité et confort</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex gap-2">
                    <Input type="number" min={1000} value={budgetInput || ""}
                      onChange={(e) => setBudgetInput(Number(e.target.value))}
                      placeholder="Budget maximum (TND)" className="h-9 text-sm rounded-lg" />
                    <Button size="sm" className="h-9 gap-1.5 text-xs shrink-0" disabled={busy.optimize} onClick={runOptimize}>
                      {busy.optimize ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                      Optimiser
                    </Button>
                  </div>
                  {optimization && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-[9px] text-muted-foreground">Budget initial</p>
                          <p className="text-xs font-bold">{fmtTnd(optimization.originalTotal)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Budget optimisé</p>
                          <p className="text-xs font-bold text-emerald-600">{fmtTnd(optimization.optimizedTotal)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Économie</p>
                          <p className="text-xs font-bold text-emerald-600">{fmtTnd(optimization.savings)} <span className="text-[9px]">({optimization.savingsPct}%)</span></p>
                        </div>
                      </div>
                      {optimization.changes.length > 0 ? (
                        <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                          {optimization.changes.map((c: any, i: number) => (
                            <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                              <TrendingDown className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />
                              <span><b>{c.categoryLabel}</b> : {c.from} → {c.to} (−{fmtTnd(c.saving)})</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">Aucune substitution nécessaire : votre sélection est déjà au meilleur rapport valeur/prix.</p>
                      )}
                      {optimization.summary && <p className="text-[10px] text-muted-foreground italic">{optimization.summary}</p>}
                      <p className="text-[9px] text-amber-700 dark:text-amber-400/80 italic">{optimization.note}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Améliorer la performance */}
              <Card className="border border-border/40 overflow-hidden rounded-xl">
                <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-5 py-3 sm:py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
                      <Zap className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">Améliorer la performance énergétique</CardTitle>
                      <CardDescription className="text-[10px]">Réduire les pertes thermiques et le besoin de climatisation</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <Button size="sm" className="h-9 gap-1.5 text-xs" disabled={busy.performance} onClick={runPerformance}>
                    {busy.performance ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    Analyser les améliorations
                  </Button>
                  {performance && (
                    <div className="space-y-2">
                      {performance.improvements.length > 0 ? (
                        <>
                          <ul className="space-y-1.5">
                            {performance.improvements.map((imp: any, i: number) => (
                              <li key={i} className="rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2 text-[10px] text-muted-foreground">
                                <b>{imp.categoryLabel}</b> : {imp.from} → {imp.to}
                                <span className="block text-sky-700 dark:text-sky-400 mt-0.5">{imp.benefit} · économie estimée {imp.estimatedSavingPct}%</span>
                              </li>
                            ))}
                          </ul>
                          <ul className="space-y-0.5">
                            {performance.assumptions.map((a: string, i: number) => (
                              <li key={i} className="flex items-start gap-1 text-[9px] text-muted-foreground/80 italic">
                                <Info className="h-2.5 w-2.5 mt-0.5 shrink-0" /> {a}
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">Aucune amélioration nécessaire : votre sélection est déjà la plus performante sur le plan thermique/acoustique.</p>
                      )}
                      <p className="text-[9px] text-muted-foreground/70 italic">{performance.note}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Comparateur multi-matériaux */}
            <Card className="border border-border/40 overflow-hidden rounded-xl">
              <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                    <Scale className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Comparer ces matériaux avec l'IA</CardTitle>
                    <CardDescription className="text-[10px]">Sélectionnez jusqu'à 5 matériaux pour une comparaison technique et financière détaillée</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3">
                {catalog ? (
                  <>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                      {catalog.materials.map((m) => {
                        const active = compSel.includes(m._id);
                        const disabled = !active && compSel.length >= 5;
                        return (
                          <button key={m._id}
                            onClick={() => setCompSel(active ? compSel.filter((x) => x !== m._id) : compSel.length < 5 ? [...compSel, m._id] : compSel)}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all cursor-pointer",
                              active ? "border-violet-500/60 bg-violet-500/5" : disabled ? "opacity-40 cursor-not-allowed" : "border-border/40 hover:border-border hover:bg-muted/30",
                            )}
                          >
                            <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[9px]",
                              active ? "bg-violet-500 border-violet-500 text-white" : "border-border")}>
                              {active && <Check className="h-2.5 w-2.5" />}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[11px] font-medium truncate">{m.name}</span>
                              <span className="block text-[9px] text-muted-foreground">{fmtTnd(m.unitPrice)}/{m.unit}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{compSel.length}/5 sélectionné(s)</span>
                      <div className="ml-auto">
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" disabled={busy.compare || compSel.length < 2} onClick={runCompare}>
                          {busy.compare ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scale className="h-3.5 w-3.5" />}
                          Comparer avec l'IA
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Lancez d'abord une analyse pour charger les matériaux des catégories sélectionnées.</p>
                )}
                {comparison && (
                  <div className="space-y-3">
                    {comparison.narrative && (
                      <p className="rounded-xl border border-violet-500/30 bg-violet-500/5 px-3.5 py-2.5 text-[11px] text-muted-foreground leading-relaxed">{comparison.narrative}</p>
                    )}
                    <div className="overflow-x-auto rounded-xl border border-border/30">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/10 bg-muted/20">
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Critère</th>
                            {comparison.materials.map((m: any) => (
                              <th key={m.id} className="py-2 px-3 text-right font-semibold max-w-[140px]">{m.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-border/5">
                            <td className="py-1.5 px-3 text-muted-foreground">Prix moyen</td>
                            {comparison.materials.map((m: any) => (
                              <td key={m.id} className="py-1.5 px-3 text-right font-semibold tabular-nums">{m.band.avg.toFixed(2)} TND{m.unit ? "/" + m.unit : ""}</td>
                            ))}
                          </tr>
                          <tr className="border-b border-border/5">
                            <td className="py-1.5 px-3 text-muted-foreground">Fourchette</td>
                            {comparison.materials.map((m: any) => (
                              <td key={m.id} className="py-1.5 px-3 text-right text-[10px] tabular-nums text-muted-foreground">{m.band.min.toFixed(2)} – {m.band.max.toFixed(2)}</td>
                            ))}
                          </tr>
                          {CRITERIA.map((c) => (
                            <tr key={c.key} className="border-b border-border/5">
                              <td className="py-1.5 px-3 text-muted-foreground">{c.label}</td>
                              {comparison.materials.map((m: any) => (
                                <td key={m.id} className={cn("py-1.5 px-3 text-right font-semibold tabular-nums", scoreColor(m.scores[c.key]))}>{m.scores[c.key]}</td>
                              ))}
                            </tr>
                          ))}
                          <tr>
                            <td className="py-2 px-3 font-bold">Note globale</td>
                            {comparison.materials.map((m: any) => (
                              <td key={m.id} className={cn("py-2 px-3 text-right font-black tabular-nums", scoreColor(m.scores.noteGlobale))}>{m.scores.noteGlobale}</td>
                            ))}
                          </tr>
                          {comparison.materials.map((m: any) => m.lifetime || m.technical?.length || m.financial?.length ? null : null)}
                        </tbody>
                      </table>
                    </div>
                    {comparison.recommendation?.name && (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-2.5">
                        <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3" /> Recommandation : {comparison.recommendation.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{comparison.recommendation.reason}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chat assistant */}
            <Card className="border border-border/40 overflow-hidden rounded-xl">
              <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Demandez conseil à votre Assistant Matériaux IA</CardTitle>
                    <CardDescription className="text-[10px]">Questions en langage naturel, réponses fondées sur le catalogue 2026 et votre projet</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 mb-3">
                  {chat.map((m, i) => (
                    <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-line",
                        m.role === "user"
                          ? "bg-emerald-600 text-white"
                          : "bg-muted/40 border border-border/40 text-foreground",
                      )}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {busy.chat && (
                    <div className="flex justify-start">
                      <div className="rounded-xl border border-border/40 bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" /> Réflexion...
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                    placeholder="Ex. Quel isolant choisir pour une villa à Tunis ? / Quel matériau avec un budget de 50 000 DT ?"
                    className="min-h-[44px] max-h-28 text-sm rounded-lg"
                    rows={2}
                  />
                  <Button size="icon" className="h-[44px] w-[44px] shrink-0" disabled={busy.chat || !chatInput.trim()} onClick={sendChat}>
                    {busy.chat ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Historique */}
        <Card className="border border-border/40 overflow-hidden rounded-xl">
          <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Historique des analyses</CardTitle>
                <CardDescription className="text-[10px]">Vos analyses enregistrées (sauvegardées automatiquement après chaque analyse)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            {analyses.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Aucune analyse enregistrée pour le moment.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {analyses.map((a) => (
                  <div key={a._id} className={cn(
                    "rounded-xl border p-3 transition-all",
                    savedId === a._id ? "border-emerald-500/50 bg-emerald-500/5" : "border-border/40 hover:border-border",
                  )}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold truncate">{a.input?.context?.projectName || "Analyse manuelle"}</p>
                      {savedId === a._id && <Badge className="text-[8px] gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/30 shrink-0"><Check className="h-2 w-2" /> En cours</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {fmtDate(a.createdAt)} · {(a.results?.recommend?.categories || []).length} catégories
                      {a.results?.recommend?.cost ? ` · ${fmtTnd(a.results.recommend.cost.total)}` : ""}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1 px-2" onClick={() => loadAnalysis(a)}>
                        <RefreshCw className="h-2.5 w-2.5" /> Charger
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[9px] gap-1 px-2 text-destructive" onClick={async () => {
                        await deleteAnalysis({ analysisId: a._id });
                        if (savedId === a._id) setSavedId(null);
                        toast.success("Analyse supprimée");
                      }}>
                        <Trash2 className="h-2.5 w-2.5" /> Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
    </main>
  );
}
