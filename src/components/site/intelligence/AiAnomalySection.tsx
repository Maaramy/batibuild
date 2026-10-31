// ============================================================================
// AI SITE INTELLIGENCE — détection des anomalies
// ----------------------------------------------------------------------------
// Anomalies issues de règles déterministes (retards, écarts, quantités,
// budget, suivi photo) et d'analyses visuelles. Chaque anomalie porte sa
// gravité, ses éléments justificatifs et une recommandation. Une anomalie
// visuelle reste un POINT À VÉRIFIER, jamais une non-conformité établie.
// ============================================================================

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldQuestion,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatSiteDate } from "@/lib/siteTracking";
import {
  AI_ANOMALY_TYPE_LABELS,
  AI_SEVERITY_LABELS,
  type AiAnomalyType,
  type AiSeverity,
} from "@/lib/siteIntelligence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPI } from "@/components/ui/kpi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { canWriteAi, type AiWorkspace } from "./types";

const SEVERITY_CLASSES: Record<string, string> = {
  critique: "border-rose-400 bg-rose-50 text-rose-700",
  eleve: "border-orange-400 bg-orange-50 text-orange-700",
  moyen: "border-amber-400 bg-amber-50 text-amber-800",
  faible: "border-slate-300 bg-slate-50 text-slate-600",
};

const STATUS_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  en_cours: "En cours",
  resolu: "Résolu",
  ecarte: "Écarté",
};

export function AiAnomalySection({
  data,
  siteId,
}: {
  data: AiWorkspace;
  siteId: Id<"siteProjects">;
}) {
  const scan = useMutation(api.siteIntelligence.scanAnomalies);
  const setStatus = useMutation(api.siteIntelligence.setAnomalyStatus);
  const canWrite = canWriteAi(data);
  const [statusFilter, setStatusFilter] = useState("ouvertes");
  const [busy, setBusy] = useState<string | null>(null);

  const anomalies = useMemo(() => {
    const sorted = [...data.anomalies].sort(
      (a, b) =>
        (["critique", "eleve", "moyen", "faible"].indexOf(a.severity) -
          ["critique", "eleve", "moyen", "faible"].indexOf(b.severity)) ||
        b.detectedAt - a.detectedAt,
    );
    if (statusFilter === "ouvertes") {
      return sorted.filter((item) => item.status === "nouveau" || item.status === "en_cours");
    }
    if (statusFilter === "traitees") {
      return sorted.filter((item) => item.status === "resolu" || item.status === "ecarte");
    }
    return sorted;
  }, [data.anomalies, statusFilter]);

  const runScan = async () => {
    setBusy("scan");
    try {
      const result = await scan({ siteId });
      toast.success(
        result.inserted > 0
          ? `${result.inserted} nouvelle(s) anomalie(s) détectée(s).`
          : "Diagnostic terminé : aucune nouvelle anomalie.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Diagnostic impossible.");
    } finally {
      setBusy(null);
    }
  };

  const update = async (id: Id<"siteAnomalies">, status: "en_cours" | "resolu" | "ecarte") => {
    setBusy(id);
    try {
      await setStatus({ anomalyId: id, status });
      toast.success(
        status === "resolu" ? "Anomalie résolue." : status === "ecarte" ? "Anomalie écartée." : "Anomalie prise en charge.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mise à jour impossible.");
    } finally {
      setBusy(null);
    }
  };

  const open = data.anomalies.filter((item) => item.status === "nouveau" || item.status === "en_cours");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["critique", "eleve", "moyen", "faible"] as AiSeverity[]).map((severity) => {
          const count = data.metrics.anomalyBySeverity.find((row) => row.severity === severity)?.count ?? 0;
          return (
            <KPI
              key={severity}
              label={AI_SEVERITY_LABELS[severity]}
              value={count}
              hint="Anomalies ouvertes"
              tone={severity === "critique" && count > 0 ? "danger" : severity === "eleve" && count > 0 ? "warning" : "default"}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
            />
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <AlertOctagon className="h-3.5 w-3.5" /> Anomalies détectées
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              {open.length} anomalie(s) ouverte(s) sur {data.anomalies.length} enregistrée(s).
              Le diagnostic s'exécute sur vos données réelles, sans intervention de l'IA.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 w-[130px] text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ouvertes" className="text-xs">Ouvertes</SelectItem>
                <SelectItem value="traitees" className="text-xs">Traitées</SelectItem>
                <SelectItem value="toutes" className="text-xs">Toutes</SelectItem>
              </SelectContent>
            </Select>
            {canWrite && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-[11px]"
                disabled={busy === "scan"}
                onClick={runScan}
              >
                {busy === "scan" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Actualiser le diagnostic
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {anomalies.length === 0 ? (
            <div className="rounded-lg border border-dashed px-3 py-8 text-center">
              <CheckCircle2 className="mx-auto mb-1.5 h-5 w-5 text-emerald-500" />
              <p className="text-[11px] font-medium">Aucune anomalie dans cette vue</p>
              <p className="mx-auto mt-0.5 max-w-md text-[10.5px] text-muted-foreground">
                Lancez le diagnostic après chaque pointage ou inspection photo : retards, écarts de
                quantités, incohérences planning et risques budgétaires y sont recalculés.
              </p>
            </div>
          ) : (
            anomalies.map((anomaly) => (
              <div
                key={anomaly._id}
                className={cn(
                  "rounded-lg border px-2.5 py-2",
                  anomaly.status === "resolu" || anomaly.status === "ecarte"
                    ? "border-border/50 bg-muted/20 opacity-80"
                    : "border-border/70",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-1.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={cn("text-[9px]", SEVERITY_CLASSES[anomaly.severity])}>
                        {AI_SEVERITY_LABELS[anomaly.severity as AiSeverity] ?? anomaly.severity}
                      </Badge>
                      <Badge variant="outline" className="text-[9px]">
                        {AI_ANOMALY_TYPE_LABELS[anomaly.type as AiAnomalyType] ?? anomaly.type}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] text-muted-foreground">
                        {STATUS_LABELS[anomaly.status] ?? anomaly.status}
                      </Badge>
                      {anomaly.requiresHumanCheck && (
                        <Badge variant="outline" className="gap-1 border-sky-300 bg-sky-50 text-[9px] text-sky-700">
                          <ShieldQuestion className="h-2.5 w-2.5" /> Vérification humaine requise
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[11.5px] font-medium">{anomaly.title}</p>
                    <p className="text-[10.5px] leading-relaxed text-muted-foreground">{anomaly.description}</p>
                    {anomaly.evidence.length > 0 && (
                      <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                        Justificatifs : {anomaly.evidence.join(" · ")}
                      </p>
                    )}
                    <p className="mt-1 rounded bg-emerald-50/70 px-1.5 py-1 text-[10px] text-emerald-900">
                      Recommandation : {anomaly.recommendation}
                    </p>
                    <p className="mt-0.5 text-[9px] text-muted-foreground">
                      Détectée le {formatSiteDate(anomaly.detectedAt)}
                      {anomaly.phaseKey ? ` · phase ${anomaly.phaseKey}` : ""}
                      {anomaly.resolutionNote ? ` · ${anomaly.resolutionNote}` : ""}
                    </p>
                  </div>
                  {canWrite && anomaly.status !== "resolu" && anomaly.status !== "ecarte" && (
                    <div className="flex shrink-0 flex-wrap gap-1">
                      {anomaly.status === "nouveau" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px]"
                          disabled={busy !== null}
                          onClick={() => update(anomaly._id, "en_cours")}
                        >
                          Prendre en charge
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="h-6 gap-1 bg-emerald-600 px-2 text-[10px] text-white hover:bg-emerald-500"
                        disabled={busy !== null}
                        onClick={() => update(anomaly._id, "resolu")}
                      >
                        {busy === anomaly._id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        Résoudre
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 gap-1 px-2 text-[10px] text-muted-foreground"
                        disabled={busy !== null}
                        onClick={() => update(anomaly._id, "ecarte")}
                      >
                        <XCircle className="h-3 w-3" /> Écarter
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <p className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 text-[10px] leading-relaxed text-muted-foreground">
        Une anomalie visuelle est un signalement à vérifier, pas une non-conformité technique.
        Seule une inspection humaine sur site peut confirmer un défaut et déclencher une reprise.
      </p>
    </div>
  );
}
