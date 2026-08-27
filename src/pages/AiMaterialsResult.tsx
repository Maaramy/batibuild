import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { ArrowLeft, Loader2, Sparkles, ShieldCheck, Info, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { RecommendResult } from "@/convex/aiMaterialsEngine";
import { AiAnalysisResults } from "@/components/ai/AiAnalysisResults";
import { usePageSEO } from "@/hooks/use-page-seo";

/** Durée fixe de l'écran de chargement : 3 secondes. */
const LOADING_DURATION_MS = 3000;

export default function AiMaterialsResult() {
  usePageSEO({
    title: "Résultat de l'analyse IA - batibuild App",
    description: "Résultats de votre analyse de matériaux par IA : recommandation, coût estimatif et fournisseurs.",
  });
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // Écran de chargement fixe de 3 secondes
  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      setProgress(Math.min(100, ((Date.now() - start) / LOADING_DURATION_MS) * 100));
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

  const analysis = useQuery(
    api.aiMaterials.getCopilotAnalysis,
    loading || !id ? "skip" : { analysisId: id as any },
  );

  const result: RecommendResult | null = (analysis?.results?.recommend as RecommendResult) ?? null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/20 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => navigate("/dashboard/ai-materials")}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-border/50 shrink-0" />
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-600 shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">Résultat de l'analyse IA</h1>
              <p className="text-[9px] text-muted-foreground leading-tight truncate">Assistant Matériaux · Prix Tunisie 2026 · Copilot</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/dashboard/suppliers-directory")}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-all border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 active:scale-95 shrink-0"
          >
            <Store className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Afficher la liste des fournisseurs</span>
            <span className="sm:hidden">Fournisseurs</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-5 space-y-5">
        {/* ── Écran de chargement (3 secondes) ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30">
                <Loader2 className="h-9 w-9 animate-spin text-emerald-600" />
              </div>
            </div>
            <h2 className="text-lg font-bold tracking-tight">Analyse des matériaux en cours…</h2>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
              Croisement du catalogue 2026, des offres fournisseurs et de votre projet — cela ne prend que quelques instants.
            </p>
            {/* Barre de progression */}
            <div className="mt-6 w-64 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : !analysis ? (
          /* Analyse introuvable ou non autorisée */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 mb-4">
              <Info className="h-6 w-6 text-amber-600" />
            </div>
            <h2 className="text-base font-bold tracking-tight">Analyse introuvable</h2>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
              Cette analyse n'existe pas ou n'est pas accessible avec votre compte.
            </p>
            <Button size="sm" className="mt-4" onClick={() => navigate("/dashboard/ai-materials")}>
              Retour à l'assistant matériaux
            </Button>
          </div>
        ) : !result ? (
          /* Analyse sans recommandation */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 mb-4">
              <Info className="h-6 w-6 text-amber-600" />
            </div>
            <h2 className="text-base font-bold tracking-tight">Analyse sans recommandation enregistrée</h2>
            <Button size="sm" className="mt-4" onClick={() => navigate("/dashboard/ai-materials")}>
              Relancer une analyse
            </Button>
          </div>
        ) : (
          /* ── Résultats (structure et design conservés) ── */
          <AiAnalysisResults result={result} />
        )}

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
