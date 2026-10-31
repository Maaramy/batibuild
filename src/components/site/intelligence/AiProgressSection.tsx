// ============================================================================
// AI SITE INTELLIGENCE — suivi de l'avancement
// ----------------------------------------------------------------------------
// Trois mesures distinctes et jamais confondues :
//   • estimée par l'IA (proposition),
//   • déclarée par le terrain,
//   • validée par le responsable (seule valeur officielle, portée par la tâche).
// L'IA ne peut pas écrire l'avancement validé : la validation est un geste
// humain explicite, tracé dans l'historique.
// ============================================================================

import { useState } from "react";
import { useMutation } from "convex/react";
import {
  BadgeCheck,
  Bot,
  Check,
  ClipboardCheck,
  Loader2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatSiteDate } from "@/lib/siteTracking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KPI } from "@/components/ui/kpi";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { canValidateAi, canWriteAi, type AiWorkspace } from "./types";

const sourceMeta: Record<string, { label: string; icon: typeof Bot; className: string }> = {
  ai: { label: "IA (estimation)", icon: Bot, className: "border-sky-300 text-sky-700 bg-sky-50" },
  declared: {
    label: "Déclaré",
    icon: UserRound,
    className: "border-amber-300 text-amber-800 bg-amber-50",
  },
  validated: {
    label: "Validé",
    icon: BadgeCheck,
    className: "border-emerald-300 text-emerald-700 bg-emerald-50",
  },
};

export function AiProgressSection({
  data,
  siteId,
}: {
  data: AiWorkspace;
  siteId: Id<"siteProjects">;
}) {
  const recordProgress = useMutation(api.siteIntelligence.recordProgress);
  const validateProgress = useMutation(api.siteIntelligence.validateProgress);
  const rejectProgress = useMutation(api.siteIntelligence.rejectProgress);
  const canWrite = canWriteAi(data);
  const canValidate = canValidateAi(data);

  const [phaseKey, setPhaseKey] = useState(data.tasks[0]?.phaseKey ?? "");
  const [percent, setPercent] = useState("0");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const pending = data.progressRecords.filter((record) => record.status === "pending");
  const history = data.progressRecords.filter((record) => record.status !== "pending").slice(0, 15);

  const submit = async () => {
    const value = Number(percent);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      toast.error("Le pourcentage doit être compris entre 0 et 100.");
      return;
    }
    setBusy("declare");
    try {
      await recordProgress({
        siteId,
        phaseKey,
        percent: value,
        note: note.trim() || undefined,
      });
      toast.success("Avancement déclaré : en attente de validation.");
      setNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Déclaration impossible.");
    } finally {
      setBusy(null);
    }
  };

  const act = async (id: Id<"siteProgressRecords">, kind: "validate" | "reject") => {
    setBusy(id);
    try {
      if (kind === "validate") {
        await validateProgress({ recordId: id });
        toast.success("Avancement validé : la tâche est mise à jour.");
      } else {
        await rejectProgress({ recordId: id, reason: "Écarté par le responsable" });
        toast.success("Pointage écarté.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KPI
          label="Validé (officiel)"
          value={`${data.summary.validated} %`}
          hint="Pondéré par phase"
          tone="success"
          icon={<BadgeCheck className="h-3.5 w-3.5" />}
        />
        <KPI
          label="Prévu"
          value={`${data.summary.planned} %`}
          hint="Planning à date"
          icon={<ClipboardCheck className="h-3.5 w-3.5" />}
        />
        <KPI
          label="Déclaré terrain"
          value={data.summary.declared > 0 ? `${data.summary.declared} %` : "—"}
          hint="En attente de validation"
          tone="warning"
          icon={<UserRound className="h-3.5 w-3.5" />}
        />
        <KPI
          label="Estimé par IA"
          value={data.summary.ai != null ? `${data.summary.ai} %` : "—"}
          hint={data.summary.ai != null ? "Indicatif, non validé" : "Aucune analyse exploitable"}
          icon={<Bot className="h-3.5 w-3.5" />}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Déclarer un avancement</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              La déclaration n'écrase jamais le taux validé : elle attend une validation.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {!canWrite ? (
              <p className="rounded-lg border border-dashed px-3 py-4 text-center text-[11px] text-muted-foreground">
                Votre accès ne permet pas de déclarer un avancement sur ce chantier.
              </p>
            ) : (
              <>
                <div>
                  <Label className="text-[11px]">Phase</Label>
                  <Select value={phaseKey} onValueChange={setPhaseKey}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Phase" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.tasks.map((task) => (
                        <SelectItem key={task._id} value={task.phaseKey} className="text-xs">
                          {task.name} · {task.progress} %
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px]">Avancement constaté (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={percent}
                    onChange={(event) => setPercent(event.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Observation (facultative)</Label>
                  <Textarea
                    rows={2}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Coulage terminé, cure en cours…"
                    className="text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-8 w-full gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-500"
                  disabled={busy !== null}
                  onClick={submit}
                >
                  {busy === "declare" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ClipboardCheck className="h-3.5 w-3.5" />
                  )}
                  Envoyer pour validation
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Pointages en attente</CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {pending.length}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {pending.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-8 text-center text-[11px] text-muted-foreground">
                Aucun pointage en attente. Les analyses IA et les déclarations terrain apparaissent ici.
              </p>
            ) : (
              pending.map((record) => {
                const meta = sourceMeta[record.source] ?? sourceMeta.declared;
                const Icon = meta.icon;
                return (
                  <div
                    key={record._id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className={cn("gap-1 text-[9px]", meta.className)}>
                          <Icon className="h-2.5 w-2.5" />
                          {meta.label}
                        </Badge>
                        <span className="text-[11px] font-medium">
                          {data.tasks.find((task) => task.phaseKey === record.phaseKey)?.name ??
                            record.phaseKey}
                        </span>
                        <span className="text-[11px] font-semibold tabular-nums">
                          {Math.round(record.percent)} %
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {formatSiteDate(record.date)}
                        {record.note ? ` · ${record.note}` : ""}
                      </p>
                    </div>
                    {canValidate ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="h-6 gap-1 bg-emerald-600 px-2 text-[10px] text-white hover:bg-emerald-500"
                          disabled={busy !== null}
                          onClick={() => act(record._id, "validate")}
                        >
                          {busy === record._id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Valider
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 gap-1 px-2 text-[10px]"
                          disabled={busy !== null}
                          onClick={() => act(record._id, "reject")}
                        >
                          <X className="h-3 w-3" /> Écarter
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Validation réservée au responsable</span>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Avancement pondéré par phase</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Poids issus du planning (quantités / coûts prévisionnels lorsqu'ils existent). Le total
            est une moyenne pondérée, pas une moyenne simple.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Phase</TableHead>
                <TableHead className="text-right text-[10px]">Poids</TableHead>
                <TableHead className="text-right text-[10px]">Prévu</TableHead>
                <TableHead className="text-right text-[10px]">Validé</TableHead>
                <TableHead className="text-right text-[10px]">Déclaré</TableHead>
                <TableHead className="text-right text-[10px]">IA</TableHead>
                <TableHead className="text-[10px]">Reste</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row.phaseKey}>
                  <TableCell className="py-1.5 text-[11px] font-medium">{row.name}</TableCell>
                  <TableCell className="py-1.5 text-right text-[11px] tabular-nums">{row.weight}</TableCell>
                  <TableCell className="py-1.5 text-right text-[11px] tabular-nums">{row.planned} %</TableCell>
                  <TableCell className="py-1.5 text-right text-[11px] font-semibold tabular-nums text-emerald-700">
                    {row.validated} %
                  </TableCell>
                  <TableCell className="py-1.5 text-right text-[11px] tabular-nums">
                    {row.declared != null ? `${row.declared} %` : "—"}
                  </TableCell>
                  <TableCell className="py-1.5 text-right text-[11px] tabular-nums">
                    {row.ai != null ? `${row.ai} %` : "—"}
                  </TableCell>
                  <TableCell className="w-28 py-1.5">
                    <Progress value={row.validated} className="h-1.5" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Historique des pointages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {history.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Aucun pointage traité pour le moment.</p>
          ) : (
            history.map((record) => {
              const meta = sourceMeta[record.source] ?? sourceMeta.declared;
              return (
                <div
                  key={record._id}
                  className="flex items-center justify-between gap-2 border-b border-border/40 py-1 text-[10.5px] last:border-0"
                >
                  <span className="truncate">
                    {formatSiteDate(record.date)} · {record.phaseKey}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Badge variant="outline" className={cn("text-[9px]", meta.className)}>
                      {meta.label}
                    </Badge>
                    <span className="tabular-nums">{Math.round(record.percent)} %</span>
                    <span className="text-muted-foreground">
                      {record.status === "validated" ? "validé" : record.status === "rejected" ? "écarté" : "en attente"}
                    </span>
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
