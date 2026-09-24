import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { runBIMEstimation } from "@/convex/bimEngine";
import { formatTnd } from "@/lib/utils";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useNavigate } from "react-router";
import {
  Landmark,
  FlaskConical,
  ArrowRight,
  HardHat,
  Ruler,
  CalendarRange,
  ShieldCheck,
  Lightbulb,
  TrendingDown,
  Users,
  Sparkles,
  Gauge,
  Layers,
} from "lucide-react";
import { useMemo } from "react";

// ============================================================================
// Page publique — exemple de résultats d'estimation de construction
// Données calculées par le vrai moteur BIM (runBIMEstimation), à titre de démo.
// ============================================================================

const CATEGORY_COLORS: Record<string, string> = {
  gros_oeuvre: "bg-indigo-500",
  second_oeuvre: "bg-sky-500",
  equipements: "bg-emerald-500",
  main_oeuvre: "bg-amber-500",
  transport: "bg-rose-500",
  etudes_imprevus: "bg-slate-500",
};

export default function DemoProject() {
  usePageSEO({
    title: "Exemple d'estimation de construction - batibuild",
    description: "Découvrez un exemple complet d'estimation de coût de construction en Tunisie : coût total, prix au m², répartition détaillée, scénarios de budget et recommandations IA — calculés par le moteur batibuild.",
  });
  const navigate = useNavigate();

  const result = useMemo(
    () => runBIMEstimation("maison", 150, 1, "tunis", "standard"),
    []
  );

  const ce = result.costEstimate;
  const ai = result.aiAnalysis;
  const duration = ai.estimatedDuration;
  const total = ce.totalCost;
  const m2 = ce.costPerSquareMeter;
  const confidence = Math.round(ai.confidence * 100);
  const workers = ai.laborEstimate.totalWorkers;

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
            <span className="truncate">batibuild</span>
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Badge variant="outline" className="hidden sm:inline-flex gap-1 border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px]">
              <FlaskConical className="h-3 w-3" />
              Exemple de démonstration
            </Badge>
            <Button
              size="sm"
              className="gap-1.5 h-9 sm:h-8 px-2.5 sm:px-3 text-[10px] sm:text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => navigate("/dashboard")}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Estimer mon projet</span>
              <span className="sm:hidden">Estimer</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-3 sm:px-5 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-xl font-bold flex items-center gap-2">
              <HardHat className="h-5 w-5 text-indigo-600" />
              Maison R+0 — 150 m² · Tunis · Finition standard
            </h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              Exemple de rapport d'estimation — calculé par le vrai moteur d'intelligence artificielle batibuild
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
          <span className="flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400 shrink-0">
            <FlaskConical className="h-3.5 w-3.5" />
            Estimation de démonstration
          </span>
          Ces chiffres sont générés automatiquement par le moteur batibuild à partir des prix du marché tunisien 2026
          (ciment, sable, gravier, acier, main-d'œuvre…). Lancez votre propre estimation pour des résultats personnalisés.
        </div>

        {/* ── Chiffres clés ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-transparent">
            <CardContent className="p-4 sm:p-5">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Coût total estimé</p>
              <p className="text-xl sm:text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">{formatTnd(total)}</p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">TND · TVA non incluse</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-5">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Ruler className="h-3 w-3" /> Prix au m²</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatTnd(m2)} <span className="text-xs font-normal text-muted-foreground">/m²</span></p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">150 m² construits</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-5">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1"><CalendarRange className="h-3 w-3" /> Durée du chantier</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{duration}</p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">≈ {workers} ouvriers simultanés</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-5">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Gauge className="h-3 w-3" /> Indice de confiance IA</p>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-xl sm:text-2xl font-bold">{confidence}%</p>
                <Progress value={confidence} className="h-2 flex-1" />
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">Région + finition renseignées</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Scénarios de budget ── */}
        <div>
          <h2 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" /> Scénarios de budget
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.entries(ce.budgetScenarios).map(([key, s]) => (
              <Card key={key} className={key === "standard" ? "border-indigo-500/40 bg-indigo-500/5" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">{s.label}</p>
                    {key === "standard" && <Badge className="bg-indigo-600 text-white border-0 text-[9px]">Recommandé</Badge>}
                  </div>
                  <p className="text-lg sm:text-xl font-bold mt-1.5">{formatTnd(s.totalCost)}</p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">{formatTnd(s.costPerM2)} /m²</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Répartition détaillée ── */}
        <div>
          <h2 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-indigo-600" /> Répartition détaillée des coûts
          </h2>
          <Card>
            <CardContent className="p-4 sm:p-5 space-y-3.5">
              {ce.breakdown.map((b) => (
                <div key={b.category}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{b.label}</span>
                    <span className="text-muted-foreground">{formatTnd(b.estimatedCost)} · {b.percentage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${CATEGORY_COLORS[b.category] || "bg-indigo-500"}`} style={{ width: `${b.percentage}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs font-semibold">
                <span>Coût total des travaux</span>
                <span>{formatTnd(ce.totalCost)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Recommandations IA ── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="p-4 sm:p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" /> Suggestions d'optimisation du budget
              </h3>
              <ul className="space-y-2.5">
                {result.optimizationTips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                    <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Recommandations techniques
              </h3>
              <ul className="space-y-2.5">
                {result.technicalRecommendations.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                    <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-indigo-500" />
                Main-d'œuvre estimée : {workers} ouvriers · {ai.laborEstimate.totalDays} jours de travail
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── CTA ── */}
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-transparent p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm sm:text-base font-semibold">Prêt à estimer votre propre projet ?</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              Importez une photo, un plan ou saisissez vos dimensions — l'IA s'occupe du reste.
            </p>
          </div>
          <Button size="sm" className="gap-1.5 h-9 sm:h-10 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0" onClick={() => navigate("/auth?returnTo=/dashboard")}>
            <Sparkles className="h-4 w-4" />
            Commencer gratuitement
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}
