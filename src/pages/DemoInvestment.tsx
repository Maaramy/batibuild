import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Landmark,
  Download,
  Loader2,
  Sparkles,
  FlaskConical,
  ArrowRight,
  FileSpreadsheet,
} from "lucide-react";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useNavigate } from "react-router";
import { generatePdf, exportCsv, TYPE_META } from "@/components/investment/shared";
import type { AnalysisRun, InvestmentType } from "@/components/investment/shared";
import { ResultsView } from "@/components/investment/results-view";

// ============================================================================
// Page publique — exemple de résultats d'analyse immobilière
// Données calculées par le vrai moteur (getDemoAnalysis), à titre de démo.
// ============================================================================

export default function DemoInvestment() {
  usePageSEO({
    title: "Exemple d'analyse de rentabilité immobilière - batibuild App",
    description: "Découvrez un exemple complet d'analyse de rentabilité immobilière en Tunisie : score IA, Return on Investment, flux de trésorerie, prévisions, scénarios et comparaison — calculés par le moteur batibuild App.",
  });
  const navigate = useNavigate();

  const demo = useQuery(api.investments.getDemoAnalysis);
  const zones = useQuery(api.investments.getInvestmentZones) || [];

  const loading = demo === undefined;
  const run: AnalysisRun | null = demo
    ? {
        _id: "demo",
        input: (demo as any).input,
        results: (demo as any).results,
        aiInsights: (demo as any).aiInsights,
      }
    : null;

  return (
    <main className="min-h-screen bg-background">
      {/* Public top bar */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-2 px-3 sm:px-5 lg:px-6 py-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold hover:opacity-80 transition-opacity min-w-0"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Landmark className="h-4 w-4" />
            </span>
            <span className="truncate">batibuild App</span>
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Badge variant="outline" className="hidden sm:inline-flex gap-1 border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px]">
              <FlaskConical className="h-3 w-3" />
              Exemple de démonstration
            </Badge>
            <Button
              size="sm"
              className="gap-1.5 h-9 sm:h-8 px-2.5 sm:px-3 text-[10px] sm:text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => navigate("/dashboard/investments")}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Analyser mon investissement</span>
              <span className="sm:hidden">Analyser</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-3 sm:px-5 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {loading && (
          <div className="rounded-2xl border border-border/40 bg-background/50 p-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm font-medium">Calcul de l'exemple d'analyse…</p>
            <p className="text-xs text-muted-foreground mt-1">Le moteur IA exécute une analyse réelle sur des données de démonstration</p>
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
                  Exemple de tableau de bord décisionnel — calculé par le vrai moteur d'intelligence artificielle
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  variant="outline"
                  onClick={() => run && exportCsv(run)}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  CSV
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => run && generatePdf(run)}
                >
                  <Download className="h-3.5 w-3.5" />
                  Rapport PDF
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
              <span className="flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400 shrink-0">
                <FlaskConical className="h-3.5 w-3.5" />
                Analyse de démonstration
              </span>
              Ces chiffres sont générés automatiquement par le moteur batibuild App à partir d'un bien fictif
              (local commercial à Tunis). Lancez votre propre analyse pour des résultats personnalisés.
            </div>

            <ResultsView run={run} zones={zones} />
          </>
        )}
      </div>
    </main>
  );
}
