// ============================================================================
// AI SITE INTELLIGENCE — alertes & prédictions
// ----------------------------------------------------------------------------
// Deux familles de projections, calculées à partir des données réelles :
//   • AI Delay Prediction  — date de fin probable, phases critiques, causes ;
//   • AI Budget Overrun Prediction — coût final estimé, écart projeté.
// Aucune donnée inventée : si l'avancement est insuffisant, l'interface dit
// « non calculable » au lieu d'afficher un chiffre trompeur. Toute projection
// est présentée comme une estimation, jamais comme une certitude.
// ============================================================================

import {
  AlertTriangle,
  CalendarClock,
  Gauge,
  Info,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { formatSiteDate, formatTND } from "@/lib/siteTracking";
import { AI_SEVERITY_LABELS, type AiSeverity } from "@/lib/siteIntelligence";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPI } from "@/components/ui/kpi";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { AiWorkspace } from "./types";

export function AiPredictionSection({ data }: { data: AiWorkspace }) {
  const risk = data.metrics.progress;
  const budget = data.metrics.budget;
  const criticalPhases = data.comparison.filter((row) => row.status === "retard");
  const criticalAnomalies = data.anomalies.filter(
    (anomaly) =>
      (anomaly.status === "nouveau" || anomaly.status === "en_cours") &&
      (anomaly.severity === "critique" || anomaly.severity === "eleve"),
  );

  const projectedOverrun =
    budget && risk.budget.projectedFinalCost != null
      ? risk.budget.projectedFinalCost - budget.revised
      : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KPI
          label="Score de risque"
          value={`${risk.riskScore}/100`}
          hint={risk.riskLabel}
          tone={risk.riskScore >= 50 ? "danger" : risk.riskScore >= 25 ? "warning" : "success"}
          icon={<Gauge className="h-3.5 w-3.5" />}
        />
        <KPI
          label="Retard projeté"
          value={`${risk.schedule.delayDays} j`}
          hint="Estimation, non contractuelle"
          tone={risk.schedule.delayDays > 14 ? "danger" : risk.schedule.delayDays > 0 ? "warning" : "success"}
          icon={<CalendarClock className="h-3.5 w-3.5" />}
        />
        <KPI
          label="Coût final projeté"
          value={risk.budget.projectedFinalCost ? formatTND(risk.budget.projectedFinalCost) : "—"}
          hint={projectedOverrun != null ? `${projectedOverrun > 0 ? "Dépassement" : "Marge"} de ${formatTND(Math.abs(projectedOverrun))}` : "Données insuffisantes"}
          tone={projectedOverrun != null && projectedOverrun > 0 ? "danger" : "success"}
          icon={<Wallet className="h-3.5 w-3.5" />}
        />
        <KPI
          label="Phases critiques"
          value={criticalPhases.length}
          hint="En retard sur le planning"
          tone={criticalPhases.length > 0 ? "warning" : "success"}
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <CalendarClock className="h-3.5 w-3.5 text-emerald-600" /> AI Delay Prediction
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Délai estimé à partir de l'avancement validé, du planning et des retards constatés.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Info2 label="Fin planifiée" value={formatSiteDate(data.site.expectedEndDate)} />
              <Info2
                label="Fin probable (estimation)"
                value={
                  risk.schedule.projectedEndDate
                    ? formatSiteDate(risk.schedule.projectedEndDate)
                    : "Non calculable"
                }
              />
              <Info2 label="Indice de délai (SPI)" value={`${risk.schedule.spi}`} />
              <Info2 label="Confiance des données" value={risk.confidence} />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Avancement validé</span>
                <span>{risk.schedule.actualProgressPct} %</span>
              </div>
              <Progress value={risk.schedule.actualProgressPct} className="h-1.5" />
              <div className="mb-1 mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Avancement prévu</span>
                <span>{risk.schedule.plannedProgressPct} %</span>
              </div>
              <Progress value={risk.schedule.plannedProgressPct} className="h-1.5 bg-slate-100" />
            </div>
            {risk.schedule.lateTasks.length > 0 && (
              <div className="rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] text-rose-900">
                <p className="font-medium">Phases en retard</p>
                <p className="mt-0.5">{risk.schedule.lateTasks.join(" · ")}</p>
              </div>
            )}
            <p className="rounded bg-amber-50 px-2 py-1 text-[9.5px] leading-relaxed text-amber-900">
              <Info className="mr-1 inline h-3 w-3" />
              {risk.schedule.projectedEndDate
                ? "Date probable calculée en prolongeant l'écart constaté. Elle peut évoluer avec chaque pointage et ne constitue pas un engagement."
                : "Aucune projection de date : l'avancement validé est insuffisant pour extrapoler sans inventer de donnée."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Wallet className="h-3.5 w-3.5 text-emerald-600" /> AI Budget Overrun Prediction
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Comparaison budget / dépenses réelles et projection du coût final.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {!budget ? (
              <p className="rounded-lg border border-dashed px-3 py-5 text-center text-[11px] text-muted-foreground">
                Votre accès ne comprend pas la permission budget : aucune donnée financière n'est
                transmise au module.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <Info2 label="Budget révisé" value={formatTND(budget.revised)} />
                  <Info2 label="Dépensé" value={formatTND(budget.spent)} />
                  <Info2
                    label="Coût final projeté"
                    value={
                      risk.budget.projectedFinalCost
                        ? formatTND(risk.budget.projectedFinalCost)
                        : "Non calculable"
                    }
                  />
                  <Info2
                    label="Écart projeté"
                    value={
                      risk.budget.projectedVariance != null
                        ? formatTND(risk.budget.projectedVariance)
                        : "—"
                    }
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Consommation</span>
                    <span>{budget.consumedPct} %</span>
                  </div>
                  <Progress
                    value={Math.min(100, budget.consumedPct)}
                    className={cn("h-1.5", budget.consumedPct > 100 && "bg-rose-100")}
                  />
                </div>
                {risk.budget.overBudgetCategories.length > 0 && (
                  <div className="rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] text-rose-900">
                    <p className="font-medium">Postes les plus lourds</p>
                    <ul className="mt-0.5 space-y-0.5">
                      {risk.budget.overBudgetCategories.map((row) => (
                        <li key={row.category}>
                          {row.label} — {formatTND(row.amount)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="rounded bg-amber-50 px-2 py-1 text-[9.5px] leading-relaxed text-amber-900">
                  <Info className="mr-1 inline h-3 w-3" />
                  {risk.budget.projectedFinalCost
                    ? "Projection fondée sur les dépenses réelles rapportées à l'avancement validé. Elle reste une estimation."
                    : "Projection indisponible : avancement ou dépenses réelles trop faibles pour extrapoler."}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Causes potentielles identifiées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {risk.causes.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Aucune cause de risque mesurable avec les données actuelles.
              </p>
            ) : (
              risk.causes.map((cause, index) => (
                <p key={index} className="flex items-start gap-1.5 text-[11px]">
                  <TrendingDown className="mt-0.5 h-3 w-3 shrink-0 text-rose-500" />
                  {cause}
                </p>
              ))
            )}
            {risk.materialRisks.length > 0 && (
              <div className="mt-1 space-y-0.5 rounded bg-muted/40 px-2 py-1.5 text-[10px]">
                <p className="font-medium">Approvisionnements à risque</p>
                {risk.materialRisks.slice(0, 4).map((row) => (
                  <p key={row.name} className="text-muted-foreground">
                    {row.name} — couverture {row.coveragePct} % ({row.alert === "rupture" ? "rupture" : "sous-commande"})
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Actions recommandées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {risk.recommendations.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Poursuivre le suivi hebdomadaire : aucune action prioritaire détectée.
              </p>
            ) : (
              risk.recommendations.map((recommendation, index) => (
                <p key={index} className="flex items-start gap-1.5 text-[11px]">
                  <TrendingUp className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                  {recommendation}
                </p>
              ))
            )}
            {criticalAnomalies.length > 0 && (
              <div className="mt-1 rounded bg-rose-50 px-2 py-1.5 text-[10px] text-rose-900">
                <p className="font-medium">Anomalies graves à traiter</p>
                <ul className="mt-0.5 space-y-0.5">
                  {criticalAnomalies.slice(0, 4).map((anomaly) => (
                    <li key={anomaly._id}>
                      [{AI_SEVERITY_LABELS[anomaly.severity as AiSeverity] ?? anomaly.severity}] {anomaly.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="text-[9.5px]">
          SPI {risk.schedule.spi} · délai
        </Badge>
        {risk.budget.cpi != null && (
          <Badge variant="outline" className="text-[9.5px]">
            CPI {risk.budget.cpi} · coût
          </Badge>
        )}
        <Badge variant="outline" className="text-[9.5px]">
          {data.metrics.usage.analyses30d} analyse(s) sur 30 jours
        </Badge>
        <Badge variant="outline" className="text-[9.5px]">
          Coût IA cumulé {data.metrics.usage.costUsd.toFixed(4)} USD
        </Badge>
      </div>
    </div>
  );
}

function Info2({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-muted/30 px-1.5 py-1">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  );
}
