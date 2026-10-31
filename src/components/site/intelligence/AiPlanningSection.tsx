// ============================================================================
// AI SITE INTELLIGENCE — comparaison planning / réalisation
// ----------------------------------------------------------------------------
// Diagramme de Gantt simplifié, barres de progression par phase et tableau des
// écarts. Les dates affichées sont celles du planning réel ; aucune date n'est
// inventée. Les retards sont calculés à partir de l'avancement VALIDÉ.
// ============================================================================

import { CalendarClock, GitCompareArrows } from "lucide-react";

import { formatSiteDate } from "@/lib/siteTracking";
import { PHASE_SCHEDULE_LABELS, type PhaseScheduleStatus } from "@/lib/siteIntelligence";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { AiWorkspace } from "./types";

const STATUS_CLASSES: Record<PhaseScheduleStatus, string> = {
  en_avance: "border-sky-300 bg-sky-50 text-sky-700",
  a_jour: "border-emerald-300 bg-emerald-50 text-emerald-700",
  retard: "border-rose-300 bg-rose-50 text-rose-700",
  terminee: "border-slate-300 bg-slate-50 text-slate-600",
};

export function AiPlanningSection({ data }: { data: AiWorkspace }) {
  const tasks = data.tasks;
  if (tasks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-3 py-8 text-center text-[11px] text-muted-foreground">
        Aucune phase planifiée pour ce chantier.
      </p>
    );
  }

  const minStart = Math.min(...tasks.map((task) => task.startDate), data.site.startDate);
  const maxEnd = Math.max(...tasks.map((task) => task.endDate), data.site.expectedEndDate);
  const span = Math.max(1, maxEnd - minStart);
  const todayPct = Math.min(100, Math.max(0, ((Date.now() - minStart) / span) * 100));

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <GitCompareArrows className="h-3.5 w-3.5" /> Diagramme de Gantt — planning et réalisé
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            La barre claire est la durée planifiée ; la partie pleine représente l'avancement validé.
            Le repère vertical indique aujourd'hui.
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-1 flex justify-between text-[9px] text-muted-foreground">
            <span>{formatSiteDate(minStart)}</span>
            <span>{formatSiteDate(maxEnd)}</span>
          </div>
          <div className="relative space-y-1.5">
            <div
              className="pointer-events-none absolute inset-y-0 z-10 w-px bg-rose-400/70"
              style={{ left: `${todayPct}%` }}
              aria-hidden
            />
            {tasks.map((task) => {
              const left = ((task.startDate - minStart) / span) * 100;
              const width = Math.max(2, ((task.endDate - task.startDate) / span) * 100);
              const row = data.comparison.find((item) => item.phaseKey === task.phaseKey);
              const status = (row?.status ?? "a_jour") as PhaseScheduleStatus;
              return (
                <div key={task._id} className="grid grid-cols-[minmax(90px,26%)_1fr] items-center gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[10.5px] font-medium">{task.name}</p>
                    <p className="truncate text-[9px] text-muted-foreground">
                      {task.progress} % validé · {task.weight} pts
                    </p>
                  </div>
                  <div className="relative h-5 rounded bg-muted/50">
                    <div
                      className="absolute inset-y-0.5 rounded bg-slate-200"
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <div
                        className={cn(
                          "h-full rounded",
                          status === "retard" ? "bg-rose-400" : status === "terminee" ? "bg-slate-400" : "bg-emerald-500",
                        )}
                        style={{ width: `${Math.min(100, task.progress)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Comparaison par phase</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Phase</TableHead>
                  <TableHead className="text-[10px]">Échéance</TableHead>
                  <TableHead className="text-right text-[10px]">Prévu</TableHead>
                  <TableHead className="text-right text-[10px]">Validé</TableHead>
                  <TableHead className="text-right text-[10px]">Écart</TableHead>
                  <TableHead className="text-[10px]">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.comparison.map((row) => {
                  const task = tasks.find((item) => item.phaseKey === row.phaseKey);
                  return (
                    <TableRow key={row.phaseKey}>
                      <TableCell className="py-1.5 text-[11px] font-medium">{row.name}</TableCell>
                      <TableCell className="py-1.5 text-[10.5px] text-muted-foreground">
                        {task ? formatSiteDate(task.endDate) : "—"}
                      </TableCell>
                      <TableCell className="py-1.5 text-right text-[11px] tabular-nums">{row.planned} %</TableCell>
                      <TableCell className="py-1.5 text-right text-[11px] font-semibold tabular-nums">
                        {row.validated} %
                      </TableCell>
                      <TableCell
                        className={cn(
                          "py-1.5 text-right text-[11px] tabular-nums",
                          row.delta < -10 ? "text-rose-600" : row.delta >= 5 ? "text-emerald-700" : "",
                        )}
                      >
                        {row.delta > 0 ? "+" : ""}
                        {row.delta} pts
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="outline" className={cn("text-[9px]", STATUS_CLASSES[row.status])}>
                            {PHASE_SCHEDULE_LABELS[row.status]}
                          </Badge>
                          {row.delayDays > 0 && (
                            <span className="text-[9px] text-rose-600">+{row.delayDays} j</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <CalendarClock className="h-3.5 w-3.5" /> Projection de fin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fin planifiée</span>
                <span className="font-medium">{formatSiteDate(data.site.expectedEndDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fin projetée (estimation)</span>
                <span className="font-medium">
                  {data.metrics.progress.schedule.projectedEndDate
                    ? formatSiteDate(data.metrics.progress.schedule.projectedEndDate)
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Retard projeté</span>
                <span
                  className={cn(
                    "font-medium",
                    data.metrics.progress.schedule.delayDays > 0 ? "text-rose-600" : "text-emerald-700",
                  )}
                >
                  {data.metrics.progress.schedule.delayDays} jour(s)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Indice de délai (SPI)</span>
                <span className="font-medium">{data.metrics.progress.schedule.spi}</span>
              </div>
              <p className="pt-1 text-[9.5px] leading-relaxed text-muted-foreground">
                Projection calculée à partir de l'avancement validé et du temps écoulé. Elle n'est ni
                contractuelle ni garantie.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Historique des modifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {data.progressRecords.length === 0 ? (
                <p className="text-[10.5px] text-muted-foreground">Aucun pointage enregistré.</p>
              ) : (
                data.progressRecords.slice(0, 8).map((record) => (
                  <div key={record._id} className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="truncate text-muted-foreground">
                      {formatSiteDate(record.date)} · {record.phaseKey}
                    </span>
                    <span className="tabular-nums">
                      {Math.round(record.percent)} %{" "}
                      <span className="text-muted-foreground">
                        ({record.source === "ai" ? "IA" : record.source === "declared" ? "déclaré" : "validé"})
                      </span>
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-1.5 rounded-xl border border-border/60 bg-card p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Barres de progression
        </p>
        {data.comparison.map((row) => (
          <div key={row.phaseKey} className="grid grid-cols-[minmax(80px,30%)_1fr_40px] items-center gap-2">
            <span className="truncate text-[10px]">{row.name}</span>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 rounded bg-slate-200" style={{ width: `${row.planned}%`, height: 2, top: "50%" }} />
              <Progress value={row.validated} className="h-1.5" />
            </div>
            <span className="text-right text-[9.5px] tabular-nums text-muted-foreground">{row.validated} %</span>
          </div>
        ))}
      </div>
    </div>
  );
}
