import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { ClientProPaywall } from "@/components/ClientProPaywall";
import { projectTypeLabel } from "@/convex/projectTypes";
import { useQuery, useMutation, useAction } from "convex/react";
import { useNavigate, useSearchParams } from "react-router";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { usePageSEO } from "@/hooks/use-page-seo";
import {
ArrowLeft, Sparkles, HardHat, Loader2, Store, Scale, Check, Trash2, Clock, MapPin, Ruler, Wand2, ShieldCheck, RefreshCw, CircleDollarSign, Building2, Info
} from "lucide-react";
import { ProjectContext } from "@/convex/aiMaterialsEngine";
import { REGION_LABELS } from "@/lib/projectPdf";

// ── Helpers ──────────────────────────────────────────────────────────────────
const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const fmtTnd = (n: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// ═══════════════════════════════════════════════════════════════════════════
// PAGE — AI MATERIALS COPILOT
// ═══════════════════════════════════════════════════════════════════════════
export default function AiMaterials() {
  usePageSEO({
    title: "Assistant Matériaux IA - batibuild App",
    description: "Assistant intelligent de choix des matériaux de construction par IA : recommandation comparative, prix du marché tunisien 2026, fournisseurs, optimisation du budget.",
  });
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const paramProject = params.get("project");
  useAuth();
  const projects = useQuery(api.projects.getUserProjects, {}) || [];
  const catStats = useQuery(api.aiMaterials.getCopilotCategories) || [];
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
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  // Pré-sélectionner uniquement les catégories correspondant aux résultats BIM réels
  useEffect(() => {
    if (catStats.length > 0 && selectedCats.length === 0) {
      const CORE_CATEGORY_IDS = new Set([
        // Gros oeuvre
        "ciment", "acier", "briques", "blocs_beton", "beton",
        // Second oeuvre
        "bois", "carrelage", "faience", "peinture", "enduit", "menuiserie", "portes", "revetements_sol",
        // Equipements
        "sanitaires", "robinetterie", "electricite", "plomberie", "chauffage", "climatisation",
      ]);
      setSelectedCats(catStats.filter((c) => CORE_CATEGORY_IDS.has(c.id)).map((c) => c.id));
    }
  }, [catStats]);

  const [enhance, setEnhance] = useState(true);

  // ── Résultats ──
  const [analyzing, setAnalyzing] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

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
    const res = doc.results?.recommend;
    if (!res) return toast.error("Analyse sans recommandation enregistrée.");
    setSavedId(doc._id);
    // Redirection vers la page dédiée de résultat
    navigate(`/dashboard/ai-materials/result/${doc._id}`);
  };

  const noProjects = projects.length === 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background pb-12">
        <ClientProPaywall>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/20 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-12 sm:h-14">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => navigate("/dashboard")}
              className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted/50 active:scale-95 transition-all shrink-0">
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <div className="h-3 w-px bg-border/50 shrink-0" />
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-600 shrink-0">
              <Sparkles className="h-3 w-3" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-semibold leading-tight">Assistant Matériaux IA</h1>
              <p className="text-[8px] text-muted-foreground leading-tight">Choix des matériaux · Prix Tunisie 2026 · Copilot</p>
            </div>
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

        {/* ÉTAPE 2 — CATÉGORIES */}
        <Card className="border border-border/40 overflow-hidden rounded-xl">
          <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 text-xs font-bold">2</div>
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

        {/* ÉTAPE 3 — LANCER L'ANALYSE */}
        <Card className="border border-border/40 overflow-hidden rounded-xl">
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
                <Button className="gap-2 h-9" disabled={analyzing} onClick={handleAnalyze}>
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {analyzing ? "Analyse en cours..." : "Lancer l'analyse IA"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
            </ClientProPaywall>
</main>
  );
}
