import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  X, FileText, FileJson, Loader2, Printer, Download,
  Ruler, DoorOpen, Wind, Layers3, AlertTriangle, Sparkles,
  ThumbsUp, ThumbsDown, Gauge, CircleDollarSign, Users, CalendarDays, Trees,
} from "lucide-react";
import type { GeneratedPlan, PlanRequest } from "@/convex/planEngine";
import { FloorPlan2D } from "@/components/plans/FloorPlanView";
import { buildPlanSheet, formatTnd, type PlanBimResult } from "@/lib/planSheet";
import { exportPlanSheetPdf, exportPlanJson } from "@/lib/planExport";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================================
// Fiche descriptive d'un plan architectural (section 7 du module).
// Présentation professionnelle imprimable : cartouche, chiffres clés, tableau
// des pièces, scores IA, estimation de coût (6 postes), points forts/faibles.
// Export : PDF (jsPDF + autoTable) et JSON.
// ============================================================================

const DISCLAIMER =
  "Plan généré automatiquement par Intelligence Artificielle à titre indicatif. Ce plan ne constitue pas un document architectural ou administratif officiel. Il doit être vérifié, adapté et validé par un architecte ou un professionnel habilité avant toute réalisation ou utilisation administrative.";

function scoreIndicatorClass(v: number) {
  // Classes Tailwind littérales (JIT) appliquées à l'indicateur enfant du Progress
  if (v >= 85) return "[&>div]:bg-emerald-500";
  if (v >= 70) return "[&>div]:bg-violet-500";
  if (v >= 55) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-red-500";
}

export function PlanSheetModal({
  plan,
  request,
  bim,
  open,
  onClose,
}: {
  plan: GeneratedPlan;
  request?: PlanRequest | null;
  bim?: PlanBimResult | null;
  open: boolean;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<"pdf" | "json" | null>(null);

  const sheet = useMemo(() => buildPlanSheet(plan, request ?? null, bim ?? null), [plan, request, bim]);

  const downloadPdf = async () => {
    setBusy("pdf");
    try {
      await exportPlanSheetPdf(sheet, plan);
      toast.success("Fiche descriptive téléchargée (PDF)");
    } catch (err: any) {
      toast.error(err?.message || "Échec de l'export PDF");
    } finally {
      setBusy(null);
    }
  };

  const downloadJson = () => {
    setBusy("json");
    try {
      exportPlanJson(plan, `plan-${String(plan.index).padStart(2, "0")}-${sheet.meta.bienType}`);
      toast.success("Fiche technique téléchargée (JSON)");
    } finally {
      setBusy(null);
    }
  };

  const totalBreakdown = (sheet.cost?.breakdown ?? []).reduce((s, b) => s + b.estimatedCost, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">
          Fiche descriptive — Plan {String(plan.index).padStart(2, "0")} {plan.name}
        </DialogTitle>

        {/* Cartouche */}
        <div className="shrink-0 bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">
                Fiche descriptive — Plan {String(plan.index).padStart(2, "0")}
              </p>
              <p className="text-[10px] text-white/80 truncate">{plan.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" variant="secondary" className="h-9 sm:h-8 text-xs gap-1 bg-white/15 hover:bg-white/25 text-white border-0" onClick={downloadJson} disabled={busy != null} aria-label="Télécharger la fiche en JSON">
              {busy === "json" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileJson className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">JSON</span>
            </Button>
            <Button size="sm" className="h-9 sm:h-8 text-xs gap-1" onClick={downloadPdf} disabled={busy != null} aria-label="Télécharger la fiche en PDF">
              {busy === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/15" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 print:p-0">
          {/* Métadonnées */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-[9px]">{sheet.meta.bienType}</Badge>
            <Badge variant="secondary" className="text-[9px]">{sheet.meta.style}</Badge>
            <Badge variant="secondary" className="text-[9px]">Standing {sheet.meta.standing}</Badge>
            <Badge variant="secondary" className="text-[9px]">{sheet.meta.floors} niveau{sheet.meta.floors > 1 ? "x" : ""}</Badge>
            <Badge variant="secondary" className="text-[9px]">Entrée {sheet.meta.entree}</Badge>
            {sheet.meta.orientation !== "—" && <Badge variant="secondary" className="text-[9px]">Orientation {sheet.meta.orientation}</Badge>}
            <Badge variant="secondary" className="text-[9px]">{sheet.meta.facades} façade(s)</Badge>
            <span className="ml-auto text-[9px] text-muted-foreground">Généré le {sheet.meta.generatedAt}</span>
          </div>

          {/* Description + aperçu */}
          <div className="grid sm:grid-cols-[1fr_220px] gap-4">
            <div className="rounded-xl border border-border/40 p-3.5 bg-card/40">
              <p className="text-xs font-bold mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" /> Description de la proposition
              </p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">{sheet.description}</p>
              {sheet.alerts.length > 0 && (
                <div className="mt-2.5 rounded-lg border border-amber-300/60 bg-amber-50/70 dark:bg-amber-950/25 px-2.5 py-2">
                  {sheet.alerts.map((a, i) => (
                    <p key={i} className="text-[10px] text-amber-800 dark:text-amber-200 flex gap-1.5">
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" /> {a}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-border/40 bg-white dark:bg-slate-100/90 overflow-hidden">
              <FloorPlan2D plan={plan} compact showDimensions={false} />
            </div>
          </div>

          {/* Chiffres clés */}
          <div>
            <p className="text-xs font-bold mb-2 flex items-center gap-1.5">
              <Ruler className="h-3.5 w-3.5 text-violet-500" /> Chiffres clés
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {sheet.keyFigures.map((f) => (
                <div key={f.label} className="rounded-xl border border-border/40 bg-card/40 px-3 py-2.5">
                  <p className="text-[9px] text-muted-foreground truncate">{f.label}</p>
                  <p className="text-sm font-bold tabular-nums truncate">{f.value}</p>
                  {f.hint && <p className="text-[8px] text-muted-foreground/70 truncate">{f.hint}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Scores */}
          <div>
            <p className="text-xs font-bold mb-2 flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-violet-500" /> Évaluation par l'IA
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {sheet.scores.map((s) => (
                <div key={s.key} className="rounded-xl border border-border/40 bg-card/40 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground">{s.label}</span>
                    <span className={cn("text-xs font-bold tabular-nums", s.key === "global" ? "text-violet-600" : "")}>{s.value}/100</span>
                  </div>
                  <Progress value={s.value} className={cn("h-1.5", s.key === "global" ? "[&>div]:bg-violet-600" : scoreIndicatorClass(s.value))} />
                </div>
              ))}
            </div>
          </div>

          {/* Pièces */}
          <div>
            <p className="text-xs font-bold mb-2 flex items-center gap-1.5">
              <DoorOpen className="h-3.5 w-3.5 text-violet-500" /> Composition des pièces ({sheet.rooms.length})
            </p>
            <div className="rounded-xl border border-border/40 overflow-x-auto">
              <table className="w-full min-w-[440px] text-[11px]">
                <thead>
                  <tr className="bg-muted/60 text-left text-[10px] text-muted-foreground uppercase tracking-wide">
                    <th className="px-3 py-2 font-semibold w-10">N°</th>
                    <th className="px-3 py-2 font-semibold">Pièce</th>
                    <th className="px-3 py-2 font-semibold w-24">Niveau</th>
                    <th className="px-3 py-2 font-semibold w-24 text-right">Surface</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.rooms.map((r, i) => (
                    <tr key={i} className="border-t border-border/40">
                      <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{i + 1}</td>
                      <td className="px-3 py-1.5 font-medium">{r.name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.levelLabel}</td>
                      <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{r.area.toFixed(1)} m²</td>
                    </tr>
                  ))}
                  {sheet.rooms.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">Aucune pièce</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {sheet.exteriorZones.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sheet.exteriorZones.map((z, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-700 dark:text-emerald-300">
                    <Trees className="h-3 w-3" /> {z.name} — {z.area.toFixed(1)} m²
                  </span>
                ))}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><DoorOpen className="h-3 w-3" /> {sheet.counts.doors} portes</span>
              <span className="flex items-center gap-1"><Wind className="h-3 w-3" /> {sheet.counts.windows} fenêtres</span>
              <span className="flex items-center gap-1"><Layers3 className="h-3 w-3" /> {sheet.counts.stairs} escalier{sheet.counts.stairs > 1 ? "s" : ""}</span>
              <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> Emprise {sheet.dimensions.width} × {sheet.dimensions.depth} m</span>
            </div>
          </div>

          {/* Coût */}
          {sheet.cost && (
            <div>
              <p className="text-xs font-bold mb-2 flex items-center gap-1.5">
                <CircleDollarSign className="h-3.5 w-3.5 text-emerald-600" /> Estimation du coût (marché tunisien)
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5">
                  <p className="text-[10px] text-muted-foreground">Coût total estimé</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatTnd(sheet.cost.totalCost)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {sheet.cost.costPerSquareMeter > 0 && <>{formatTnd(sheet.cost.costPerSquareMeter)}/m² · </>}
                    {sheet.cost.confidence != null && <>confiance {sheet.cost.confidence}%</>}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {sheet.cost.duration && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-white/60 dark:bg-emerald-950/30 px-2 py-0.5 text-[9px] font-medium">
                        <CalendarDays className="h-3 w-3" /> {sheet.cost.duration}
                      </span>
                    )}
                    {sheet.cost.labor && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-white/60 dark:bg-emerald-950/30 px-2 py-0.5 text-[9px] font-medium">
                        <Users className="h-3 w-3" /> {sheet.cost.labor.totalWorkers} ouvriers / {sheet.cost.labor.totalDays} j
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-border/40 overflow-x-auto">
                  <table className="w-full min-w-[360px] text-[11px]">
                    <thead>
                      <tr className="bg-muted/60 text-left text-[10px] text-muted-foreground uppercase tracking-wide">
                        <th className="px-3 py-2 font-semibold">Poste</th>
                        <th className="px-3 py-2 font-semibold w-14 text-right">%</th>
                        <th className="px-3 py-2 font-semibold w-24 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.cost.breakdown.map((b) => (
                        <tr key={b.category} className="border-t border-border/40">
                          <td className="px-3 py-1.5 font-medium">{b.label}</td>
                          <td className="px-3 py-1.5 text-right text-muted-foreground tabular-nums">{b.percentage}%</td>
                          <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{formatTnd(b.estimatedCost)}</td>
                        </tr>
                      ))}
                      {sheet.cost.breakdown.length > 0 && (
                        <tr className="border-t border-border/40 bg-muted/40">
                          <td className="px-3 py-1.5 font-bold">Total (hors imprévus)</td>
                          <td className="px-3 py-1.5" />
                          <td className="px-3 py-1.5 text-right font-bold tabular-nums">{formatTnd(totalBreakdown)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {sheet.cost.scenarios.standard > 0 && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Scénarios budgétaires : Économique <strong className="tabular-nums">{formatTnd(sheet.cost.scenarios.economique)}</strong> · Standard <strong className="tabular-nums text-emerald-700 dark:text-emerald-400">{formatTnd(sheet.cost.scenarios.standard)}</strong> · Premium <strong className="tabular-nums">{formatTnd(sheet.cost.scenarios.premium)}</strong>
                </p>
              )}
            </div>
          )}

          {/* Points forts / faibles */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/15 p-3.5">
              <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-1.5">
                <ThumbsUp className="h-3.5 w-3.5" /> Points forts
              </p>
              <ul className="space-y-1">
                {sheet.strengths.map((s, i) => (
                  <li key={i} className="text-[10px] text-muted-foreground flex gap-1.5">
                    <span className="text-emerald-500 shrink-0">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/15 p-3.5">
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-1.5">
                <ThumbsDown className="h-3.5 w-3.5" /> Points d'attention
              </p>
              <ul className="space-y-1">
                {sheet.weaknesses.map((w, i) => (
                  <li key={i} className="text-[10px] text-muted-foreground flex gap-1.5">
                    <span className="text-amber-500 shrink-0">•</span> {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Avertissement */}
          <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50/70 dark:bg-amber-950/25 px-3 py-2.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[9px] leading-snug text-amber-800 dark:text-amber-200">{DISCLAIMER}</p>
          </div>

          <div className="flex items-center justify-between border-t border-border/40 pt-3">
            <span className="text-[9px] text-muted-foreground flex items-center gap-1">
              <Printer className="h-3 w-3" /> Export PDF professionnel disponible
            </span>
            <Button size="sm" className="h-9 sm:h-8 text-xs gap-1" onClick={downloadPdf} disabled={busy != null}>
              {busy === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} Télécharger la fiche (PDF)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
