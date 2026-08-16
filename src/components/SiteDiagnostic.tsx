import { AlertTriangle, CheckCircle2, Circle, Sparkles, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Roadmap } from "@/convex/roadmapEngine";

// Diagnostic IA du chantier (Phase 09 — détection des anomalies)
// Analyse en temps réel : dépenses, problèmes, photos, planning → score de risque.
export default function SiteDiagnostic({ roadmap }: { roadmap: Roadmap }) {
  const risk = roadmap.control.risk;
  if (!risk) return null;
  const tone =
    risk.level === "élevé"
      ? {
          border: "border-red-500/30",
          bg: "bg-red-500/[0.04]",
          text: "text-red-600 dark:text-red-400",
          bar: "[&>div]:bg-red-500",
          badge: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
        }
      : risk.level === "modéré"
        ? {
            border: "border-amber-500/30",
            bg: "bg-amber-500/[0.04]",
            text: "text-amber-600 dark:text-amber-400",
            bar: "[&>div]:bg-amber-500",
            badge: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
          }
        : {
            border: "border-emerald-500/30",
            bg: "bg-emerald-500/[0.04]",
            text: "text-emerald-600 dark:text-emerald-400",
            bar: "[&>div]:bg-emerald-500",
            badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          };
  return (
    <Card className={`border ${tone.border} ${tone.bg}`}>
      <CardHeader className="p-3 sm:p-4 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className={`h-4 w-4 ${tone.text}`} /> Diagnostic IA du chantier
          </CardTitle>
          <Badge variant="outline" className={`ml-auto text-[10px] capitalize ${tone.badge}`}>
            Risque {risk.level} · {risk.score}/100
          </Badge>
        </div>
        <CardDescription className="text-[10px] leading-relaxed">
          L'IA analyse en temps réel les dépenses, problèmes, photos et le planning pour signaler les anomalies et risques potentiels.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-3">
        <Progress value={risk.score} className={`h-1.5 ${tone.bar}`} />
        <p className={`text-[11px] font-medium leading-snug ${tone.text}`}>{risk.summary}</p>

        {risk.anomalies.length > 0 && (
          <div className="space-y-1.5">
            {risk.anomalies.map((a) => (
              <div
                key={a.id}
                className={`rounded-lg border px-2.5 py-2 ${
                  a.severity === "critical"
                    ? "border-red-500/30 bg-red-500/5"
                    : a.severity === "warning"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-blue-500/30 bg-blue-500/5"
                }`}
              >
                <p
                  className={`flex items-center gap-1.5 text-[11px] font-semibold ${
                    a.severity === "critical"
                      ? "text-red-600 dark:text-red-400"
                      : a.severity === "warning"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {a.severity === "critical" ? <XCircle className="h-3 w-3 shrink-0" /> : a.severity === "warning" ? <AlertTriangle className="h-3 w-3 shrink-0" /> : <Circle className="h-3 w-3 shrink-0" />}
                  {a.title}
                </p>
                <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{a.detail}</p>
                <p className="text-[10px] text-foreground/70 leading-snug mt-0.5 flex items-start gap-1">
                  <span className="shrink-0">💡</span> {a.recommendation}
                </p>
              </div>
            ))}
          </div>
        )}

        {risk.strengths.length > 0 && (
          <div className="space-y-1">
            {risk.strengths.map((s, i) => (
              <p key={i} className="flex items-start gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 leading-snug">
                <CheckCircle2 className="h-3 w-3 shrink-0 mt-px" /> {s}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
