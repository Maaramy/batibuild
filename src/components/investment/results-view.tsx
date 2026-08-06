import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Coins,
  Percent,
  Wallet,
  CalendarClock,
  ShieldAlert,
  Sparkles,
  Send,
  Loader2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  TrendingUp,
  Bot,
  Gauge,
  Star,
  Banknote,
  Layers as LayersIcon,
  Landmark as LandmarkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { RefObject } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";
import { ScoreGauge, Kpi, SectionHeading, TYPE_META, fmtTND, fmtNum, fmtPct, scoreTone } from "@/components/investment/shared";
import type { AnalysisRun, ChatMsg, InvestmentType, ZoneRow } from "@/components/investment/shared";

// ============================================================================
// Vue résultats réutilisable — tableau de bord décisionnel + onglets
// Utilisée par : page de résultats, page de partage public, page de démo.
// ============================================================================

export interface AssistantViewProps {
  chatMsgs: ChatMsg[];
  chatInput: string;
  setChatInput: (v: string) => void;
  chatBusy: boolean;
  sendChat: (t?: string) => void;
  chatEndRef: RefObject<HTMLDivElement | null>;
}

export function ResultsView({ run, zones, assistant }: {
  run: AnalysisRun;
  zones: ZoneRow[];
  assistant?: AssistantViewProps;
}) {
  const [activeTab, setActiveTab] = useState("apercu");
  const ind = run.results.indicators;
  const results = run.results;
  const aiInsights = run.aiInsights;

  const forecastChartData = (results.forecasts ?? []).map((p) => ({
    year: `An ${p.year}`,
    "Bénéfice cumulé": p.cumulativeProfit,
    "Valeur du bien": p.propertyValue,
  }));

  const comparisonChartData = (results.comparison ?? []).map((c) => ({
    name: c.label,
    "ROI 10 ans": c.roi10yPct,
    Score: c.score,
  }));

  // ── Évolution des loyers vs charges (rétro-compatible : déduite des
  // hypothèses fixes loyers +5 %/an, inflation 6 % si absente des points) ──
  const rentExpenseChartData = (results.forecasts ?? []).map((p) => ({
    year: `An ${p.year}`,
    "Loyers annuels": p.grossRent ?? Math.round(ind.grossAnnualRent * Math.pow(1.05, p.year)),
    "Charges d'exploitation": p.expenses ?? Math.round(ind.operatingExpenses * Math.pow(1.06, p.year)),
  }));

  // ── Comparaison visuelle des 3 scénarios ──
  const scenarioChartData = (results.scenarios ?? []).map((s) => ({
    name: s.label,
    "Valeur future": s.futureValue,
    "Revenus totaux": s.totalIncome,
    "Gain cumulé": s.cumulativeProfit,
  }));

  // ── Répartition des coûts (rétro-compatible avec les anciennes analyses) ──
  const costBreakdownData = [
    { name: "Prix d'achat", value: ind.purchasePrice, color: "#6366f1" },
    { name: "Frais d'acquisition", value: ind.acquisitionFees ?? 0, color: "#3b82f6" },
    { name: "Frais de financement", value: (ind as any).financingFees ?? 0, color: "#06b6d4" },
    { name: "Frais d'agence", value: (ind as any).agencyFees ?? 0, color: "#8b5cf6" },
    { name: "Aménagement", value: ind.renovationCost ?? 0, color: "#f59e0b" },
    { name: "Ameublement", value: (ind as any).furnishingCost ?? 0, color: "#10b981" },
  ].filter((d) => d.value > 0);
  const expenseBreakdown = [
    { name: "Charges annuelles", value: (ind as any).annualCharges ?? 0, color: "#3b82f6" },
    { name: "Assurance", value: (ind as any).insurance ?? 0, color: "#10b981" },
    { name: "Frais de gestion", value: (ind as any).managementFees ?? 0, color: "#8b5cf6" },
    { name: "Fiscalité", value: (ind as any).taxation ?? 0, color: "#ef4444" },
  ].filter((d) => d.value > 0);
  const expenseBreakdownData =
    expenseBreakdown.length > 0
      ? expenseBreakdown
      : ind.operatingExpenses > 0
        ? [{ name: "Charges d'exploitation", value: ind.operatingExpenses, color: "#6366f1" }]
        : [];

  const QUICK_QUESTIONS = [
    "Cet investissement est-il rentable ?",
    "Quel est le meilleur quartier pour investir ?",
    "Combien vais-je gagner dans 10 ans ?",
    "Quel est le risque de cet investissement ?",
  ];

  const tabItems = [
    { value: "apercu", label: "Aperçu IA", icon: Sparkles },
    { value: "indicateurs", label: "Indicateurs", icon: Percent },
    { value: "previsions", label: "Prévisions", icon: TrendingUp },
    { value: "scenarios", label: "Scénarios", icon: LayersIcon },
    { value: "comparaison", label: "Comparaison", icon: BarChart3 },
    { value: "zones", label: "Zones", icon: MapPin },
    ...(assistant ? [{ value: "assistant", label: "Assistant IA", icon: Bot }] : []),
  ];

  return (
    <>
      {/* ═══ Tableau de bord décisionnel ═══ */}
      <Card className="relative overflow-hidden border-border/40 bg-gradient-to-br from-indigo-950/50 via-background/90 to-background dark:from-indigo-900/45">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/20" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/15" />
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />
        <CardContent className="relative p-4 sm:p-6">
          <div className="flex flex-col xl:flex-row xl:items-center gap-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-sm">
                  <LandmarkIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold truncate">
                    {run.input?.name || TYPE_META[run.input?.investmentType as InvestmentType]?.label}
                  </h2>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {TYPE_META[run.input?.investmentType as InvestmentType]?.label} · {fmtTND(ind.purchasePrice)} · Loyer{" "}
                    {(run.input as any)?.rentMode === "nuit"
                      ? `${fmtTND((run.input as any)?.rentAmount ?? 0)}/nuit`
                      : `${fmtTND(ind.monthlyRent)}/mois`}
                  </p>
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="gap-1 border-primary/20 bg-primary/5 text-primary text-[10px]">
                  <MapPin className="h-3 w-3" />
                  {results.zone.name}
                </Badge>
                <Badge variant="outline" className="gap-1 border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px]">
                  <TrendingUp className="h-3 w-3" />
                  Rang {results.zone.rank}/24
                </Badge>
                <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                  <Sparkles className="h-3 w-3" />
                  Confiance IA : {results.aiConfidence}%
                </Badge>
              </div>
              <div className="mt-4">
                <ScoreGauge score={results.score.total} grade={results.score.grade} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 shrink-0 xl:w-[640px]">
              <Kpi icon={Coins} label="Coût total" value={fmtTND(ind.totalCost)} sub={`${fmtNum(ind.pricePerM2 ?? 0)} TND/m²`} tone="text-indigo-600 dark:text-indigo-400" />
              <Kpi icon={Percent} label="Rentabilité nette" value={fmtPct(ind.netYieldPct)} sub={`Brute ${fmtPct(ind.grossYieldPct)}`} tone="text-emerald-600 dark:text-emerald-400" />
              <Kpi icon={Wallet} label="Cash-flow mensuel" value={fmtTND(ind.monthlyCashflow)} sub={`${fmtTND(ind.annualCashflow)}/an`} tone="text-blue-600 dark:text-blue-400" />
              <Kpi icon={CalendarClock} label="Récupération" value={ind.paybackYears >= 99 ? "> 30 ans" : `${ind.paybackYears} ans`} sub={ind.paybackDateLabel} tone="text-amber-600 dark:text-amber-400" />
              <Kpi icon={TrendingUp} label="ROI 10 ans" value={fmtPct(ind.roi10yPct)} sub={`5 ans : ${fmtPct(ind.roi5yPct)}`} tone="text-violet-600 dark:text-violet-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Tabs (collante) ═══ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="sticky top-0 z-30 -mx-3 sm:mx-0 mb-4 border-b border-border/20 bg-background/85 px-3 py-2 backdrop-blur-md sm:px-0">
          <div className="overflow-x-auto scrollbar-none">
            <TabsList className="h-auto w-full justify-start gap-1 rounded-full bg-muted/40 p-1 min-w-max">
              {tabItems.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="gap-1.5 rounded-full text-[11px] sm:text-xs px-3 py-1.5 transition-all data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <t.icon className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline sm:inline">{t.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        {/* ── APERÇU IA ── */}
        {activeTab === "apercu" && (
          <div className="space-y-4">
            {aiInsights && (
              <Card className="border border-border/40 bg-background/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="border-b border-border/20 bg-gradient-to-r from-indigo-500/10 to-blue-500/5 p-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-sm">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm flex items-center gap-2">
                        Analyse de l'IA
                        {aiInsights.usedFallback && (
                          <Badge variant="outline" className="text-[9px] border-amber-500/30 bg-amber-500/10 text-amber-600">
                            Mode hors-ligne
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-[11px]">Synthèse du conseiller financier & immobilier</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="rounded-xl border-l-4 border-indigo-500 bg-muted/20 p-3">
                    <p className="text-xs sm:text-sm leading-relaxed text-foreground/90">{aiInsights.summary}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border/30 bg-muted/20 p-3 transition-colors hover:border-emerald-500/30">
                      <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Recommandations
                      </p>
                      <ul className="space-y-1">
                        {aiInsights.recommendations.slice(0, 4).map((r, i) => (
                          <li key={i} className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed flex gap-1.5">
                            <span className="text-emerald-500 mt-0.5">•</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-border/30 bg-muted/20 p-3 transition-colors hover:border-amber-500/30">
                      <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Risques
                      </p>
                      <ul className="space-y-1">
                        {aiInsights.risks.slice(0, 4).map((r, i) => (
                          <li key={i} className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed flex gap-1.5">
                            <span className="text-amber-500 mt-0.5">•</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-border/30 bg-muted/20 p-3 transition-colors hover:border-blue-500/30">
                      <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-1.5 flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" /> Notes de marché
                      </p>
                      <ul className="space-y-1">
                        {aiInsights.marketNotes.map((r, i) => (
                          <li key={i} className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed flex gap-1.5">
                            <span className="text-blue-500 mt-0.5">•</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <SectionHeading icon={MapPin} title={`Zone : ${results.zone.name}`} desc={`Rang ${results.zone.rank}/24 en attractivité en Tunisie`} />
                {(results.zone.city || results.zone.quartier) && (
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="gap-1 border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px]">
                      <MapPin className="h-3 w-3" />
                      {[results.zone.city, results.zone.quartier].filter(Boolean).join(" · ")}
                    </Badge>
                    {results.zone.utilityLabel && results.zone.utilityIndex !== undefined && (
                      <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                        <Sparkles className="h-3 w-3" />
                        {results.zone.utilityLabel} · Attractivité {results.zone.utilityIndex}/100
                      </Badge>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Kpi icon={Banknote} label="Prix moyen" value={`${fmtNum(results.zone.pricePerM2)} TND/m²`} />
                  <Kpi icon={TrendingUp} label="Loyer moyen" value={`${results.zone.rentPerM2} TND/m²/mois`} />
                  <Kpi icon={Star} label="Demande locative" value={`${results.zone.demandIndex}/100`} />
                  <Kpi icon={ShieldAlert} label="Indice de risque" value={`${results.zone.riskScore}/100`} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {results.zone.highlights.map((hx, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] border-border/40 bg-muted/20">
                      {hx}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <SectionHeading icon={Gauge} title="Détail du score IA" desc="Critères pondérés de la note finale" />
                <div className="space-y-2.5">
                  {results.score.criteria.map((c) => (
                    <div key={c.key}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">{c.label}</span>
                        <span className="font-semibold tabular-nums">{c.score}/100 <span className="text-muted-foreground/60 font-normal">(poids {c.weight}%)</span></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-700", scoreTone(results.score.total).ring === "#10b981" ? "bg-emerald-500" : scoreTone(results.score.total).ring === "#3b82f6" ? "bg-blue-500" : scoreTone(results.score.total).ring === "#f59e0b" ? "bg-amber-500" : "bg-red-500")}
                          style={{ width: `${c.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── INDICATEURS ── */}
        {activeTab === "indicateurs" && (
          <>
            <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <SectionHeading icon={Percent} title="Indicateurs financiers" desc="Calculs automatiques du moteur" />
                <div className="space-y-5">
                  <IndicatorsGroup
                    icon={Coins}
                    title="Acquisition & coûts"
                    color="text-indigo-600 dark:text-indigo-400"
                    rows={[
                      ["Prix d'achat", fmtTND(ind.purchasePrice)],
                      ["Frais d'acquisition", fmtTND(ind.acquisitionFees)],
                      ["Frais de financement", fmtTND((ind as any).financingFees ?? 0)],
                      ["Frais d'agence", fmtTND((ind as any).agencyFees ?? 0)],
                      ["Coût d'aménagement", fmtTND(ind.renovationCost ?? 0)],
                      ["Ameublement", fmtTND((ind as any).furnishingCost ?? 0)],
                      ["Coût total de l'investissement", fmtTND(ind.totalCost), true],
                    ]}
                  />
                  <IndicatorsGroup
                    icon={Wallet}
                    title="Revenus & charges"
                    color="text-emerald-600 dark:text-emerald-400"
                    rows={[
                      ["Revenus locatifs bruts annuels", fmtTND(ind.grossAnnualRent)],
                      ["Charges annuelles", fmtTND((ind as any).annualCharges ?? 0)],
                      ["Assurance", fmtTND((ind as any).insurance ?? 0)],
                      ["Frais de gestion", fmtTND((ind as any).managementFees ?? 0)],
                      ["Fiscalité", fmtTND((ind as any).taxation ?? 0)],
                      ["Total charges d'exploitation annuelles", `- ${fmtTND(ind.operatingExpenses)}`],
                      ["Revenu net annuel", fmtTND(ind.netAnnualIncome), true],
                      ["Cash-flow mensuel", fmtTND(ind.monthlyCashflow)],
                      ["Cash-flow annuel", fmtTND(ind.annualCashflow)],
                    ]}
                  />
                  <IndicatorsGroup
                    icon={Percent}
                    title="Rentabilité"
                    color="text-blue-600 dark:text-blue-400"
                    rows={[
                      ["Rentabilité brute", fmtPct(ind.grossYieldPct)],
                      ["Rentabilité nette", fmtPct(ind.netYieldPct), true],
                      ["ROI annuel", fmtPct(ind.roiAnnualPct)],
                      ["ROI sur 5 ans", fmtPct(ind.roi5yPct)],
                      ["ROI sur 10 ans", fmtPct(ind.roi10yPct)],
                      ["Prix au m²", ind.pricePerM2 ? fmtTND(ind.pricePerM2) : "—"],
                      ["Rapport prix / loyer annuel", `${fmtNum(ind.priceToRentRatio)}×`],
                      ["Taux d'occupation retenu", fmtPct(ind.occupancyRate)],
                    ]}
                  />
                  <IndicatorsGroup
                    icon={CalendarClock}
                    title="Horizon & confiance"
                    color="text-amber-600 dark:text-amber-400"
                    rows={[
                      ["Durée de récupération du capital", ind.paybackYears >= 99 ? "> 30 ans" : `${fmtNum(ind.paybackYears)} ans`],
                      ["Date estimée d'amortissement", ind.paybackDateLabel],
                      ["Indice de confiance de l'estimation", `${results.aiConfidence}%`, true],
                    ]}
                  />
                </div>
              </CardContent>
            </Card>

          <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <SectionHeading
                icon={BarChart3}
                title="Répartition des coûts"
                desc="Ventilation du coût total d'acquisition et des charges d'exploitation annuelles"
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <DonutBreakdown data={costBreakdownData} title="Coût total de l'investissement" centerLabel="Coût total" />
                <DonutBreakdown data={expenseBreakdownData} title="Charges d'exploitation annuelles" centerLabel="Charges / an" />
              </div>
            </CardContent>
          </Card>
          </>
        )}

        {/* ── PRÉVISIONS ── */}
        {activeTab === "previsions" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {results.forecastSummary.map((s) => (
                <Card key={s.horizon} className="border border-border/40 bg-background/50 backdrop-blur-sm overflow-hidden">
                  <div className={cn("h-1 w-full", s.horizon === 10 ? "bg-indigo-500" : s.horizon === 5 ? "bg-blue-500" : s.horizon === 3 ? "bg-emerald-500" : "bg-amber-500")} />
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">Horizon {s.label}</p>
                    <p className={cn("text-lg sm:text-xl font-extrabold tabular-nums mt-1", s.gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                      {fmtTND(s.gain)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Gain estimé</p>
                    <div className="mt-2 space-y-1 border-t border-border/20 pt-2 text-[10px] sm:text-[11px]">
                      <p className="flex justify-between"><span className="text-muted-foreground">Valeur future</span><span className="font-semibold tabular-nums">{fmtTND(s.futureValue)}</span></p>
                      <p className="flex justify-between"><span className="text-muted-foreground">Revenus cumulés</span><span className="font-semibold tabular-nums">{fmtTND(s.cumulativeProfit)}</span></p>
                      <p className="flex justify-between"><span className="text-muted-foreground">ROI</span><span className={cn("font-semibold tabular-nums", s.roiPct >= 0 ? "text-emerald-600" : "text-red-600")}>{fmtPct(s.roiPct)}</span></p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Projection sur {results.forecasts.length} ans
                </CardTitle>
                <CardDescription className="text-[11px]">Bénéfice cumulé et valeur du bien (TND)</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-72 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecastChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toLocaleString("fr-FR")}k` : `${v}`}
                        width={55}
                      />
                      <Tooltip
                        formatter={(value: any, name: any) => [fmtTND(Number(value)), name]}
                        contentStyle={{ borderRadius: 10, border: "1px solid rgba(99,102,241,0.2)", fontSize: 11, background: "rgba(255,255,255,0.96)" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                      <Area type="monotone" dataKey="Bénéfice cumulé" stroke="#10b981" strokeWidth={2.5} fill="url(#gProfit)" />
                      <Area type="monotone" dataKey="Valeur du bien" stroke="#6366f1" strokeWidth={2.5} fill="url(#gValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Évolution des loyers et des charges
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Loyers annuels bruts (croissance fixe +5 %/an) et charges d'exploitation (indexées sur l'inflation 6 %)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={rentExpenseChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gRent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gCharges" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toLocaleString("fr-FR")}k` : `${v}`}
                        width={55}
                      />
                      <Tooltip
                        formatter={(value: any, name: any) => [fmtTND(Number(value)), name]}
                        contentStyle={{ borderRadius: 10, border: "1px solid rgba(99,102,241,0.2)", fontSize: 11, background: "rgba(255,255,255,0.96)" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="Loyers annuels" stroke="#10b981" strokeWidth={2.5} fill="url(#gRent)" />
                      <Area type="monotone" dataKey="Charges d'exploitation" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gCharges)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── SCÉNARIOS ── */}
        {activeTab === "scenarios" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {results.scenarios.map((s) => (
                <Card
                  key={s.key}
                  className={cn(
                    "border bg-background/50 backdrop-blur-sm overflow-hidden transition-all hover:shadow-md",
                    s.key === "optimiste" ? "border-emerald-500/30" : s.key === "realiste" ? "border-blue-500/30" : "border-amber-500/30",
                  )}
                >
                  <div className={cn(
                    "px-4 py-2.5 flex items-center justify-between",
                    s.key === "optimiste" ? "bg-emerald-500/10" : s.key === "realiste" ? "bg-blue-500/10" : "bg-amber-500/10",
                  )}>
                    <span className="text-xs font-bold">
                      {s.key === "optimiste" ? "📈" : s.key === "realiste" ? "📊" : "🛡️"} Scénario {s.label}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px]",
                        s.key === "optimiste" ? "border-emerald-500/30 text-emerald-600" : s.key === "realiste" ? "border-blue-500/30 text-blue-600" : "border-amber-500/30 text-amber-600",
                      )}
                    >
                      Risque {s.riskLevel.toLowerCase()}
                    </Badge>
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-border/30 bg-muted/10 p-2.5">
                        <p className="text-[9px] text-muted-foreground">Valeur future</p>
                        <p className="text-sm font-bold tabular-nums">{fmtTND(s.futureValue)}</p>
                      </div>
                      <div className="rounded-lg border border-border/30 bg-muted/10 p-2.5">
                        <p className="text-[9px] text-muted-foreground">Revenus totaux</p>
                        <p className="text-sm font-bold tabular-nums">{fmtTND(s.totalIncome)}</p>
                      </div>
                      <div className="rounded-lg border border-border/30 bg-muted/10 p-2.5">
                        <p className="text-[9px] text-muted-foreground">Rentabilité nette</p>
                        <p className="text-sm font-bold tabular-nums text-emerald-600">{fmtPct(s.netYieldPct)}</p>
                      </div>
                      <div className="rounded-lg border border-border/30 bg-muted/10 p-2.5">
                        <p className="text-[9px] text-muted-foreground">ROI {results.forecasts.length} ans</p>
                        <p className={cn("text-sm font-bold tabular-nums", s.roiPct >= 0 ? "text-emerald-600" : "text-red-600")}>{fmtPct(s.roiPct)}</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                      <p className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Points de vigilance
                      </p>
                      <ul className="space-y-0.5">
                        {s.risks.map((r, i) => (
                          <li key={i} className="text-[10px] text-muted-foreground leading-relaxed flex gap-1">
                            <span className="text-amber-500 mt-0.5">•</span>{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Comparaison des scénarios
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Valeur future, revenus totaux et gain cumulé à l'horizon retenu — 3 scénarios du moteur IA
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scenarioChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toLocaleString("fr-FR")}k` : `${v}`}
                        width={55}
                      />
                      <Tooltip
                        formatter={(value: any, name: any) => [fmtTND(Number(value)), name]}
                        contentStyle={{ borderRadius: 10, border: "1px solid rgba(99,102,241,0.2)", fontSize: 11, background: "rgba(255,255,255,0.96)" }}
                        cursor={{ fill: "rgba(99,102,241,0.06)" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Valeur future" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={48} />
                      <Bar dataKey="Revenus totaux" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={48} />
                      <Bar dataKey="Gain cumulé" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {results.scenarios.map((s) => (
                    <div key={s.key} className="flex items-center gap-1.5 rounded-full border border-border/30 bg-muted/20 px-2.5 py-1 text-[10px]">
                      <span className={cn("h-2 w-2 rounded-full", s.key === "optimiste" ? "bg-emerald-500" : s.key === "realiste" ? "bg-blue-500" : "bg-amber-500")} />
                      <span className="font-medium">{s.label}</span>
                      <span className="text-muted-foreground tabular-nums">ROI {fmtPct(s.roiPct)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── COMPARAISON ── */}
        {activeTab === "comparaison" && (
          <div className="space-y-4">
            <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <SectionHeading
                  icon={BarChart3}
                  title="Comparaison avec d'autres investissements"
                  desc="Même budget dans la même zone — rendements benchmark du marché tunisien"
                />
                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                  <table className="w-full min-w-[640px] text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-border/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Type</th>
                        <th className="py-2 pr-3 font-medium">Revenu annuel</th>
                        <th className="py-2 pr-3 font-medium">Rentabilité nette</th>
                        <th className="py-2 pr-3 font-medium">ROI 10 ans</th>
                        <th className="py-2 pr-3 font-medium">Appréciation</th>
                        <th className="py-2 pr-3 font-medium">Risque</th>
                        <th className="py-2 font-medium text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.comparison.map((c) => (
                        <tr key={c.type} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 pr-3 font-medium">{c.label}</td>
                          <td className="py-2.5 pr-3 tabular-nums">{fmtTND(c.annualIncome)}</td>
                          <td className="py-2.5 pr-3 tabular-nums">
                            <span className={c.netYieldPct >= 6 ? "text-emerald-600 font-semibold" : ""}>{fmtPct(c.netYieldPct)}</span>
                          </td>
                          <td className="py-2.5 pr-3 tabular-nums">{fmtPct(c.roi10yPct)}</td>
                          <td className="py-2.5 pr-3 tabular-nums">{fmtPct(c.appreciationPct)}</td>
                          <td className="py-2.5 pr-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px]",
                                c.riskLevel === "Faible" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" :
                                c.riskLevel === "Moyen" ? "border-blue-500/30 bg-blue-500/10 text-blue-600" :
                                "border-amber-500/30 bg-amber-500/10 text-amber-600",
                              )}
                            >
                              {c.riskLevel}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-right">
                            <span className="font-bold tabular-nums">{c.score}</span>
                            <span className="text-muted-foreground/50 text-[10px]">/100</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Score comparé des types de biens
                </CardTitle>
                <CardDescription className="text-[11px]">Note IA sur 100 par type d'investissement</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={0} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <Tooltip
                        formatter={(value: any, name: any) => [`${value}/100`, name]}
                        contentStyle={{ borderRadius: 10, border: "1px solid rgba(99,102,241,0.2)", fontSize: 11, background: "rgba(255,255,255,0.96)" }}
                        cursor={{ fill: "rgba(99,102,241,0.06)" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Score" radius={[4, 4, 0, 0]} maxBarSize={42}>
                        {comparisonChartData.map((d, i) => (
                          <Cell key={i} fill={d.Score >= 70 ? "#10b981" : d.Score >= 55 ? "#6366f1" : "#f59e0b"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── ZONES ── */}
        {activeTab === "zones" && (
          <Card className="border border-border/40 bg-background/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <SectionHeading
                icon={MapPin}
                title="Meilleures zones d'investissement en Tunisie"
                desc="Classement par indice de demande et de risque — les 24 gouvernorats"
              />
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full min-w-[680px] text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">#</th>
                      <th className="py-2 pr-3 font-medium">Zone</th>
                      <th className="py-2 pr-3 font-medium">Prix/m²</th>
                      <th className="py-2 pr-3 font-medium">Loyer/m²/mois</th>
                      <th className="py-2 pr-3 font-medium">Demande</th>
                      <th className="py-2 pr-3 font-medium">Appréciation</th>
                      <th className="py-2 font-medium text-right">Risque</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map((z: any, i: number) => (
                      <tr
                        key={z.region}
                        className={cn(
                          "border-b border-border/20 last:border-0 transition-colors",
                          z.region === results.zone.region ? "bg-primary/5" : "hover:bg-muted/20",
                        )}
                      >
                        <td className="py-2 pr-3">
                          <span className={cn(
                            "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                            i === 0 ? "bg-amber-500/20 text-amber-600" : i < 5 ? "bg-blue-500/15 text-blue-600" : "bg-muted text-muted-foreground",
                          )}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-2 pr-3 font-medium">
                          {z.name}
                          {z.region === results.zone.region && (
                            <Badge className="ml-1.5 text-[8px] border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">Votre zone</Badge>
                          )}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{fmtNum(z.pricePerM2)} TND</td>
                        <td className="py-2 pr-3 tabular-nums">{z.rentPerM2} TND</td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-14 rounded-full bg-muted/50 overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", z.demandIndex >= 80 ? "bg-emerald-500" : z.demandIndex >= 60 ? "bg-blue-500" : "bg-amber-500")}
                                style={{ width: `${z.demandIndex}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{z.demandIndex}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{fmtPct(z.appreciationPct)}</td>
                        <td className={cn("py-2 text-right font-semibold tabular-nums", z.riskScore >= 40 ? "text-amber-600" : z.riskScore >= 30 ? "text-muted-foreground" : "text-emerald-600")}>
                          {z.riskScore}/100
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── ASSISTANT IA ── */}
        {assistant && activeTab === "assistant" && (
          <Card className="border border-border/40 bg-background/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-border/20">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm">Assistant IA Investisseur</CardTitle>
                  <CardDescription className="text-[11px]">
                    {run ? "Contexte : analyse en cours chargée" : "Conseil en investissement immobilier Tunisie"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-80 overflow-y-auto p-4 space-y-3 bg-muted/10">
                {assistant.chatMsgs.map((m, i) => (
                  <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap",
                        m.role === "user"
                          ? "bg-indigo-600 text-white rounded-br-sm"
                          : "bg-background border border-border/30 rounded-bl-sm shadow-sm",
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {assistant.chatBusy && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-background border border-border/30 px-4 py-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                <div ref={assistant.chatEndRef} />
              </div>
              <div className="border-t border-border/20 p-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => assistant.sendChat(q)}
                      disabled={assistant.chatBusy}
                      className="rounded-full border border-border/30 bg-muted/20 px-2.5 py-1 text-[10px] text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={assistant.chatInput}
                    onChange={(e) => assistant.setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && assistant.sendChat()}
                    placeholder="Posez votre question… (ex : quel bien offre le meilleur rendement ?)"
                    className="h-10 text-sm"
                  />
                  <Button
                    size="icon"
                    className="h-10 w-10 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => assistant.sendChat()}
                    disabled={assistant.chatBusy || !assistant.chatInput.trim()}
                  >
                    {assistant.chatBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </Tabs>
    </>
  );
}

function IndicatorsGroup({ icon: Icon, title, color, rows }: {
  icon: any;
  title: string;
  color: string;
  rows: ([string, string] | [string, string, boolean])[];
}) {
  return (
    <div>
      <p className={cn("mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide", color)}>
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map(([label, value, highlight]) => (
          <div
            key={label}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/20",
              highlight ? "border-primary/25 bg-primary/5" : "border-border/30 bg-muted/10",
            )}
          >
            <span className="text-[11px] sm:text-xs text-muted-foreground">{label}</span>
            <span className={cn("text-xs sm:text-sm font-bold tabular-nums", highlight ? "text-primary" : "")}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutBreakdown({ data, title, centerLabel }: {
  data: { name: string; value: number; color: string }[];
  title: string;
  centerLabel: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="rounded-xl border border-border/30 bg-muted/10 p-3">
      <p className="text-[11px] font-semibold mb-2">{title}</p>
      {data.length === 0 ? (
        <p className="text-[10px] text-muted-foreground py-8 text-center">Aucune donnée à afficher</p>
      ) : (
        <div className="relative">
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={74}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [fmtTND(Number(value)), ""]}
                contentStyle={{ borderRadius: 10, border: "1px solid rgba(99,102,241,0.2)", fontSize: 11, background: "rgba(255,255,255,0.96)" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wide">{centerLabel}</span>
            <span className="text-base font-extrabold tabular-nums">{fmtTND(total)}</span>
          </div>
        </div>
      )}
      {data.length > 0 && (
        <div className="mt-1.5 space-y-1">
          {data.map((d) => (
            <div key={d.name} className="flex items-center justify-between gap-2 text-[10px]">
              <span className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
                <span className="truncate">{d.name}</span>
              </span>
              <span className="font-semibold tabular-nums shrink-0">{fmtTND(d.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
