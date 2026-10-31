// ============================================================================
// AI SITE INTELLIGENCE — tableau de bord intelligent
// ----------------------------------------------------------------------------
// Indicateurs, évolution réelle, planning vs réalisation, anomalies et
// recommandations. Chaque chiffre provient du serveur ; les projections sont
// étiquetées « estimation » et les recommandations disent d'où elles viennent
// (diagnostic déterministe, jamais une prédiction présentée comme certaine).
// ============================================================================

import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CalendarClock,
  CheckCircle2,
  Gauge,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { formatSiteDate, formatTND, plannedProgressAt } from "@/lib/siteTracking";
import { AI_SEVERITY_LABELS, type AiSeverity } from "@/lib/siteIntelligence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPI } from "@/components/ui/kpi";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { AiSection, AiWorkspace } from "./types";

const evolutionConfig = {
  validated: { label: "Validé", color: "#059669" },
  planned: { label: "Prévu", color: "#94a3b8" },
  declared: { label: "Déclaré", color: "#0ea5e9" },
} satisfies ChartConfig;

const phaseConfig = {
  validated: { label: "Validé", color: "#059669" },
  planned: { label: "Prévu", color: "#cbd5e1" },
} satisfies ChartConfig;

const severityColors: Record<string, string> = {
  critique: "#be123c",
  eleve: "#ea580c",
  moyen: "#f59e0b",
  faible: "#64748b",
};

export function AiDashboardSection({
  data,
  onNavigate,
}: {
  data: AiWorkspace;
  onNavigate: (section: AiSection) => void;
}) {
  const risk = data.metrics.progress;
  const budget = data.metrics.budget;
  const now = Date.now();

  // Courbe : les points réels + la courbe planifiée recalculée à chaque point.
  const evolution = data.timeline.map((point) => ({
    label: new Date(point.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    validated: point.validated,
    declared: point.declared,
    planned: plannedProgressAt(data.tasks, point.date),
  }));

  const phaseBars = data.rows.map((row) => ({
    name: row.name.length > 16 ? `${row.name.slice(0, 15)}…` : row.name,
    validated: row.validated,
    planned: row.planned,
  }));

  const anomaliesPie = data.metrics.anomalyBySeverity.filter((row) => row.count > 0);

  const insights = [
    ...risk.causes.map((cause) => ({ tone: "risk" as const, text: cause })),
    ...data.anomalies
      .filter((anomaly) => anomaly.status === "nouveau" || anomaly.status === "en_cours")
      .slice(0, 3)
      .map((anomaly) => ({
        tone: "anomaly" as const,
        text: `${anomaly.title} → ${anomaly.recommendation}`,
      })),
    ...risk.recommendations.map((recommendation) => ({
      tone: "action" as const,
      text: recommendation,
    })),
  ].slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        <KPI
          label="Avancement validé"
          value={`${data.summary.validated} %`}
          hint={`${data.summary.remainingTasks} phase(s) ouverte(s)`}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          tone="success"
        />
        <KPI
          label="Avancement prévu"
          value={`${data.summary.planned} %`}
          hint="Planning à date"
          icon={<CalendarClock className="h-3.5 w-3.5" />}
        />
        <KPI
          label="Écart"
          value={`${data.summary.gap > 0 ? "+" : ""}${data.summary.gap} pts`}
          hint={data.summary.gap < 0 ? "Retard sur le planning" : "À jour ou en avance"}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          tone={data.summary.gap < -10 ? "danger" : data.summary.gap < 0 ? "warning" : "success"}
        />
        <KPI
          label="Anomalies ouvertes"
          value={data.metrics.openAnomalies}
          hint={
            data.metrics.anomalyBySeverity.find((row) => row.severity === "critique")?.count
              ? `${data.metrics.anomalyBySeverity.find((row) => row.severity === "critique")!.count} critique(s)`
              : "Aucune critique"
          }
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          tone={data.metrics.openAnomalies > 0 ? "warning" : "success"}
        />
        <KPI
          label="Phases en retard"
          value={data.metrics.lateCount}
          hint="Échéance dépassée"
          icon={<Gauge className="h-3.5 w-3.5" />}
          tone={data.metrics.lateCount > 0 ? "danger" : "success"}
        />
        <KPI
          label="Budget consommé"
          value={budget ? `${budget.consumedPct} %` : "—"}
          hint={budget ? `${formatTND(budget.spent)} / ${formatTND(budget.revised)}` : "Accès budget non accordé"}
          tone={budget && budget.consumedPct > 100 ? "danger" : "default"}
        />
        <KPI
          label="Livraison projetée"
          value={
            risk.schedule.projectedEndDate ? formatSiteDate(risk.schedule.projectedEndDate) : "—"
          }
          hint={
            risk.schedule.projectedEndDate
              ? "Estimation, non contractuelle"
              : "Avancement insuffisant pour projeter"
          }
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          tone={(risk.schedule.delayDays ?? 0) > 0 ? "warning" : "default"}
        />
        <KPI
          label="Confiance données"
          value={risk.confidence}
          hint={`Risque estimé ${risk.riskScore}/100`}
          tone={risk.riskScore >= 50 ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">Évolution du chantier</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Avancement validé dans le temps, comparé au planning et aux déclarations terrain.
            </p>
          </CardHeader>
          <CardContent className="pt-1">
            {evolution.length === 0 ? (
              <EmptyInline
                text="Aucun pointage enregistré. Déclarez un avancement ou validez une analyse pour alimenter la courbe."
                action={{ label: "Saisir un avancement", onClick: () => onNavigate("progress") }}
              />
            ) : (
              <ChartContainer config={evolutionConfig} className="h-48 w-full">
                <AreaChart data={evolution} margin={{ left: -18, right: 6, top: 6, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ai-validated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={9} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={9} width={30} />
                  <Area
                    type="monotone"
                    dataKey="planned"
                    stroke="#94a3b8"
                    strokeDasharray="4 3"
                    fill="none"
                    strokeWidth={1.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="validated"
                    stroke="#059669"
                    fill="url(#ai-validated)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="declared"
                    stroke="#0ea5e9"
                    fill="none"
                    strokeWidth={1.3}
                  />
                  <ChartTooltipContent />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">Répartition des anomalies</CardTitle>
            <p className="text-[11px] text-muted-foreground">Anomalies ouvertes par gravité.</p>
          </CardHeader>
          <CardContent className="pt-1">
            {anomaliesPie.length === 0 ? (
              <EmptyInline
                text="Aucune anomalie ouverte. Lancez un diagnostic après chaque pointage."
                action={{ label: "Lancer un diagnostic", onClick: () => onNavigate("anomalies") }}
              />
            ) : (
              <ChartContainer config={{}} className="h-48 w-full">
                <PieChart>
                  <Pie data={anomaliesPie} dataKey="count" nameKey="severity" innerRadius={38} outerRadius={62}>
                    {anomaliesPie.map((row) => (
                      <Cell key={row.severity} fill={severityColors[row.severity] ?? "#64748b"} />
                    ))}
                  </Pie>
                  <ChartTooltipContent />
                </PieChart>
              </ChartContainer>
            )}
            {anomaliesPie.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {anomaliesPie.map((row) => (
                  <Badge key={row.severity} variant="outline" className="text-[9px]">
                    <span
                      className="mr-1 h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: severityColors[row.severity] ?? "#64748b" }}
                    />
                    {AI_SEVERITY_LABELS[row.severity as AiSeverity] ?? row.severity} · {row.count}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-1 pb-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm">Avancement par phase</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Validé (vert) contre prévu (gris) — pondération par le poids réel des phases.
            </p>
          </div>
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" onClick={() => onNavigate("planning")}>
            Comparaison détaillée <ArrowRight className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="pt-1">
          <ChartContainer config={phaseConfig} className="h-56 w-full">
            <BarChart data={phaseBars} margin={{ left: -20, right: 6, top: 6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={8} interval={0} angle={-18} textAnchor="end" height={40} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={9} width={30} />
              <Bar dataKey="planned" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
              <Bar dataKey="validated" fill="#059669" radius={[3, 3, 0, 0]} />
              <ChartTooltipContent />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Sparkle /> AI Insights & Recommandations
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Établies par le diagnostic déterministe à partir de vos données réelles. Aucune
              recommandation n'est une garantie de résultat.
            </p>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-1">
            {insights.length === 0 ? (
              <EmptyInline
                text="Rien à signaler pour le moment : aucune anomalie ni cause de risque détectée."
                action={{ label: "Actualiser le diagnostic", onClick: () => onNavigate("anomalies") }}
              />
            ) : (
              insights.map((insight, index) => (
                <div
                  key={`${insight.tone}-${index}`}
                  className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 text-[11px] leading-relaxed"
                >
                  {insight.tone === "action" ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  )}
                  <span>{insight.text}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Camera className="h-3.5 w-3.5" /> Surveillance photo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-1 text-[11px]">
            <Row label="Sessions enregistrées" value={`${data.metrics.monitoringSessions}`} />
            <Row
              label="Dernière inspection"
              value={data.metrics.lastSessionAt ? formatSiteDate(data.metrics.lastSessionAt) : "Aucune"}
            />
            <Row label="Analyses (30 j)" value={`${data.metrics.usage.analyses30d}`} />
            <Row
              label="Confiance dernière analyse"
              value={data.analyses[0] ? `${Math.round((data.analyses[0].confidence ?? 0) * 100)} %` : "—"}
            />
            <Row label="Coût IA cumulé" value={`${data.metrics.usage.costUsd.toFixed(4)} USD`} />
            <div className="pt-1">
              <p className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Avancement validé</span>
                <span>{data.summary.validated} %</span>
              </p>
              <Progress value={data.summary.validated} className="h-1.5" />
            </div>
            <Button size="sm" className="mt-1 h-7 w-full gap-1 text-[11px]" onClick={() => onNavigate("photos")}>
              <Camera className="h-3 w-3" /> Nouvelle inspection photo
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function Sparkle() {
  return <span className="text-emerald-600">✦</span>;
}

function EmptyInline({
  text,
  action,
}: {
  text: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center">
      <p className="mx-auto max-w-sm text-[11px] text-muted-foreground">{text}</p>
      {action && (
        <Button size="sm" variant="outline" className="mt-2 h-7 text-[11px]" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
