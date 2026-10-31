// ============================================================================
// AI SITE INTELLIGENCE — rapports intelligents
// ----------------------------------------------------------------------------
// Six rapports professionnels exportés en PDF (logo BatiBuild, mise en page
// identique aux autres rapports du module). Chaque génération enregistre un
// instantané des indicateurs : l'historique reste consultable et auditable.
// Les photos sont incluses si leur lecture réussit ; sinon le rapport est
// produit sans elles, sans jamais prétendre le contraire.
// ============================================================================

import { useState } from "react";
import { useMutation } from "convex/react";
import { CheckCircle2, Download, FileText, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatSiteDate } from "@/lib/siteTracking";
import {
  AI_REPORTS,
  reportPeriod,
  type AiReportKind,
} from "@/lib/siteIntelligence";
import { exportAiSiteReportPdf, type AiReportPhoto } from "@/lib/siteIntelligencePdf";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AiWorkspace } from "./types";

async function imageToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("lecture impossible"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const todayInput = () => new Date().toISOString().slice(0, 10);

export function AiReportsSection({
  data,
  siteId,
}: {
  data: AiWorkspace;
  siteId: Id<"siteProjects">;
}) {
  const saveReport = useMutation(api.siteIntelligence.saveMonitoringReport);
  const canReport = data.isOwner || data.permissions.includes("reports");
  const [kind, setKind] = useState<AiReportKind>("progression");
  const [day, setDay] = useState(todayInput());
  const [observations, setObservations] = useState("");
  const [withPhotos, setWithPhotos] = useState(true);
  const [busy, setBusy] = useState<AiReportKind | null>(null);

  const generate = async (reportKind: AiReportKind) => {
    setBusy(reportKind);
    try {
      const period = reportPeriod(
        reportKind,
        Date.now(),
        data.site.startDate,
        new Date(`${day}T12:00:00`).getTime(),
      );

      const periodSessions = data.sessions.filter(
        (session) => session.date >= period.start && session.date <= period.end,
      );
      const candidateImages = periodSessions.flatMap((session) =>
        session.images.map((image) => ({
          image,
          caption: `${formatSiteDate(image.capturedAt)} · ${session.title}`,
        })),
      );

      let photos: AiReportPhoto[] = [];
      if (withPhotos && candidateImages.length > 0) {
        const selected = candidateImages.slice(0, 4);
        const loaded = await Promise.all(
          selected.map(async (entry) => {
            const dataUrl = await imageToDataUrl(entry.image.url ?? "");
            return dataUrl ? { dataUrl, caption: entry.caption } : null;
          }),
        );
        photos = loaded.filter((item): item is AiReportPhoto => item !== null);
      }

      exportAiSiteReportPdf(reportKind, {
        site: data.site,
        isOwner: data.isOwner,
        summary: data.summary,
        rows: data.comparison,
        anomalies: data.anomalies.map((anomaly) => ({
          type: anomaly.type,
          severity: anomaly.severity,
          title: anomaly.title,
          description: anomaly.description,
          recommendation: anomaly.recommendation,
          status: anomaly.status,
          detectedAt: anomaly.detectedAt,
          phaseKey: anomaly.phaseKey,
          requiresHumanCheck: anomaly.requiresHumanCheck,
        })),
        sessions: data.sessions.map((session) => ({
          title: session.title,
          date: session.date,
          phaseKey: session.phaseKey,
          imageCount: session.imageCount,
          notes: session.notes,
        })),
        risk: {
          riskLabel: data.metrics.progress.riskLabel,
          riskScore: data.metrics.progress.riskScore,
          confidence: data.metrics.progress.confidence,
          schedule: data.metrics.progress.schedule,
          budget: {
            revised: data.metrics.budget?.revised ?? 0,
            spent: data.metrics.budget?.spent ?? 0,
            projectedFinalCost: data.metrics.progress.budget.projectedFinalCost,
            projectedVariance: data.metrics.progress.budget.projectedVariance,
          },
          causes: data.metrics.progress.causes,
          recommendations: data.metrics.progress.recommendations,
        },
        period,
        observations,
        photos,
      });

      await saveReport({
        siteId,
        kind: reportKind,
        periodStart: period.start,
        periodEnd: period.end,
        imageIds: photos.length > 0 ? candidateImagesForSave(data, period).slice(0, photos.length) : [],
        snapshot: {
          validated: data.summary.validated,
          planned: data.summary.planned,
          gap: data.summary.gap,
          anomalies: data.anomalies.length,
          openAnomalies: data.metrics.openAnomalies,
          riskScore: data.metrics.progress.riskScore,
          photos: photos.length,
          observations,
        },
      });

      toast.success(
        photos.length === 0 && withPhotos
          ? "Rapport généré sans photos (lecture des images indisponible)."
          : "Rapport généré.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Génération impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <FileText className="h-3.5 w-3.5" /> Générateur de rapports intelligents
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Logo BatiBuild, indicateurs, avancement par phase, anomalies, risques et photos. Chaque
            rapport est enregistré dans l'historique du chantier.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-[11px]">Journée de référence (rapport journalier)</Label>
              <Input
                type="date"
                value={day}
                max={todayInput()}
                onChange={(event) => setDay(event.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px]">Observations du responsable</Label>
              <Textarea
                rows={2}
                value={observations}
                onChange={(event) => setObservations(event.target.value)}
                placeholder="Points marquants, arbitrages, consignes…"
                className="text-xs"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={withPhotos}
              onChange={(event) => setWithPhotos(event.target.checked)}
              className="h-3.5 w-3.5 accent-emerald-600"
            />
            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
            Joindre jusqu'à 4 photos de la période
          </label>

          {!canReport && (
            <p className="rounded-lg border border-dashed px-3 py-2 text-[10.5px] text-muted-foreground">
              La génération est réservée aux profils disposant de la permission « Rapports ». Vous
              pouvez consulter l'historique ci-dessous.
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {AI_REPORTS.map((report) => (
              <div
                key={report.kind}
                className={`flex flex-col justify-between rounded-lg border p-2.5 ${
                  kind === report.kind ? "border-emerald-400 bg-emerald-50/40" : "border-border/60"
                }`}
              >
                <div>
                  <p className="text-[11.5px] font-medium">{report.label}</p>
                  <p className="text-[10px] text-muted-foreground">{report.hint}</p>
                </div>
                <Button
                  size="sm"
                  variant={kind === report.kind ? "default" : "outline"}
                  className={`mt-2 h-7 gap-1 text-[10.5px] ${
                    kind === report.kind ? "bg-emerald-600 text-white hover:bg-emerald-500" : ""
                  }`}
                  disabled={!canReport || busy !== null}
                  onClick={() => {
                    setKind(report.kind);
                    void generate(report.kind);
                  }}
                >
                  {busy === report.kind ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  PDF
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Historique des rapports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {data.reports.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-5 text-center text-[11px] text-muted-foreground">
              Aucun rapport encore généré pour ce chantier.
            </p>
          ) : (
            data.reports.map((report) => {
              const snapshot = (report.snapshot ?? {}) as {
                validated?: number;
                openAnomalies?: number;
                photos?: number;
              };
              return (
                <div
                  key={report._id}
                  className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/40 py-1.5 text-[10.5px] last:border-0"
                >
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    {AI_REPORTS.find((item) => item.kind === report.kind)?.label ?? report.kind}
                    <Badge variant="outline" className="text-[9px]">
                      {formatSiteDate(report.periodStart)} → {formatSiteDate(report.periodEnd)}
                    </Badge>
                  </span>
                  <span className="text-muted-foreground">
                    {snapshot.validated != null ? `${snapshot.validated} % validé · ` : ""}
                    {snapshot.openAnomalies != null ? `${snapshot.openAnomalies} anomalie(s) · ` : ""}
                    {snapshot.photos ? `${snapshot.photos} photo(s) · ` : ""}
                    généré le {formatSiteDate(report.createdAt)}
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function candidateImagesForSave(data: AiWorkspace, period: { start: number; end: number }) {
  return data.sessions
    .filter((session) => session.date >= period.start && session.date <= period.end)
    .flatMap((session) => session.images.map((image) => image._id));
}
