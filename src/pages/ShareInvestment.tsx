import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Landmark,
  Download,
  Loader2,
  SearchX,
  Sparkles,
  Share2,
  ArrowRight,
  FileSpreadsheet,
} from "lucide-react";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useParams, useNavigate } from "react-router";
import { generatePdf, exportCsv, TYPE_META } from "@/components/investment/shared";
import type { AnalysisRun, InvestmentType } from "@/components/investment/shared";
import { ResultsView } from "@/components/investment/results-view";

// ============================================================================
// Page publique — analyse partagée (lecture seule)
// ============================================================================

export default function ShareInvestment() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const doc = useQuery(api.investments.getSharedAnalysis, token ? { token } : "skip");
  const zones = useQuery(api.investments.getInvestmentZones) || [];

  const loading = !doc && doc === undefined && !!token;
  const notFound = doc === null || !token;

  const run: AnalysisRun | null = doc
    ? {
        _id: (doc as any)._id,
        input: (doc as any).input,
        results: (doc as any).results,
        aiInsights: (doc as any).aiInsights,
      }
    : null;

  usePageSEO({
    title: run
      ? `Analyse partagée : ${run.input?.name || TYPE_META[run.input.investmentType as InvestmentType]?.label} - batibuild`
      : "Analyse immobilière partagée - batibuild",
    description: run
      ? `Analyse de rentabilité immobilière partagée : score IA ${run.results.score.total}/100, rentabilité nette ${run.results.indicators.netYieldPct}%, Return on Investment 10 ans ${run.results.indicators.roi10yPct}%.`
      : "Consultez une analyse de rentabilité immobilière partagée par son auteur sur batibuild.",
  });

  return (
    <main className="min-h-screen bg-background">
      {/* Public top bar */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-3 sm:px-5 lg:px-6 py-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm font-bold hover:opacity-80 transition-opacity"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Landmark className="h-4 w-4" />
            </span>
            batibuild
          </button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px]">
              <Share2 className="h-3 w-3" />
              Analyse partagée
            </Badge>
            <Button
              size="sm"
              className="gap-1.5 h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => navigate("/dashboard/investments")}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Créer ma propre analyse
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-3 sm:px-5 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {loading && (
          <div className="rounded-2xl border border-border/40 bg-background/50 p-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm font-medium">Chargement de l'analyse partagée…</p>
          </div>
        )}

        {notFound && (
          <div className="rounded-2xl border border-dashed border-border/40 bg-background/50 p-10 sm:p-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground">
              <SearchX className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-semibold mb-1">Lien de partage invalide ou expiré</h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Cette analyse n'est plus accessible : le lien a peut-être été arrêté par son auteur ou a expiré.
              Créez votre propre analyse pour découvrir le tableau de bord décisionnel complet.
            </p>
            <Button
              className="mt-6 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => navigate("/dashboard/investments")}
            >
              <Sparkles className="h-4 w-4" />
              Analyser un investissement
            </Button>
          </div>
        )}

        {run && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-base sm:text-xl font-bold">
                  {run.input?.name || TYPE_META[run.input.investmentType as InvestmentType]?.label}
                </h1>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  Analyse partagée en lecture seule · marché tunisien 2026
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  variant="outline"
                  onClick={() => exportCsv(run!)}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  CSV
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => generatePdf(run!)}
                >
                  <Download className="h-3.5 w-3.5" />
                  Rapport PDF
                </Button>
              </div>
            </div>
            <ResultsView run={run} zones={zones} />
          </>
        )}
      </div>
    </main>
  );
}
