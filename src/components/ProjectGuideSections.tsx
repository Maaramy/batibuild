import {
  AlertTriangle,
  Building2,
  CalendarRange,
  Camera,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  DraftingCompass,
  FileCheck,
  Gauge,
  HardHat,
  KeyRound,
  Map,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import type { PhaseItem, Roadmap } from "@/convex/roadmapEngine";
import { fmtTnd } from "@/lib/projectGuideFormat";

// ─── Sous-composants du Guide construction A-Z ──────────────────────────────

const PHASE_ICONS: Record<string, LucideIcon> = {
  Map,
  Search,
  DraftingCompass,
  FileCheck,
  Wallet,
  Building2,
  CalendarRange,
  HardHat,
  Camera,
  KeyRound,
};

export function PhaseIcon({ name, className }: { name: string; className?: string }) {
  const Icon = PHASE_ICONS[name] ?? Circle;
  return <Icon className={className} />;
}

export function PhaseList({ items, onToggle }: { items: PhaseItem[]; phaseId: string; onToggle: (itemId: string) => void }) {
  if (!items.length) return <p className="text-xs text-muted-foreground/70 py-2">Aucun élément.</p>;
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <label
          key={item.id}
          className="flex items-start gap-2.5 rounded-lg border border-border/30 bg-muted/10 px-2.5 py-2 transition-colors hover:bg-muted/25 cursor-pointer"
        >
          <Checkbox
            checked={item.status === "done"}
            onCheckedChange={() => onToggle(item.id)}
            className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-medium leading-snug ${item.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>
              {item.label}
              {item.auto && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full border border-primary/25 bg-primary/5 px-1.5 py-px text-[9px] font-semibold text-primary">
                  <Sparkles className="h-2 w-2" /> auto
                </span>
              )}
              {item.warning && (
                <span className="ml-1.5 text-[9px] font-medium text-amber-600 dark:text-amber-400" title="À vérifier par un professionnel / autorité">
                  ⚠ à vérifier
                </span>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground/70 leading-snug mt-0.5">{item.detail}</p>
          </div>
        </label>
      ))}
    </div>
  );
}

export function RoadmapOverview({
  roadmap,
  activeScenario,
  nextTask,
}: {
  roadmap: Roadmap;
  activeScenario: Roadmap["budget"]["scenarios"][number];
  nextTask: Roadmap["planning"][number] | undefined;
}) {
  return (
    <>
      {/* KPIs */}
      {/* 1 colonne sur très petit écran, 2 dès 360 px, 4 sur ordinateur :
          les montants restent lisibles sans jamais élargir la page. */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Card className="border-border/40 bg-background/50">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Gauge className="h-3 w-3" /> Progression globale
            </p>
            <p className="mt-1 text-lg sm:text-2xl font-bold tabular-nums">{roadmap.progress}%</p>
            <Progress value={roadmap.progress} className="mt-2 h-1.5 [&>div]:bg-gradient-to-r [&>div]:from-cyan-500 [&>div]:to-emerald-500" />
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-background/50">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Wallet className="h-3 w-3" /> Budget prévu
            </p>
            <p className="mt-1 break-words text-lg font-bold tabular-nums sm:text-2xl">
              {fmtTnd(roadmap.summary.plannedBudget)}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">{fmtTnd(activeScenario.costPerM2)}/m² · scénario {activeScenario.label}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-background/50">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Consommé / écart
            </p>
            <p className="mt-1 break-words text-lg font-bold tabular-nums sm:text-2xl">
              {fmtTnd(roadmap.summary.budgetConsumed)}
            </p>
            <p className={`mt-1 text-[10px] font-medium ${roadmap.summary.budgetGap > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {roadmap.summary.budgetGap > 0 ? `+${fmtTnd(roadmap.summary.budgetGap)} consommé` : `${fmtTnd(Math.abs(roadmap.summary.budgetGap))} de marge`}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-background/50">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <ClipboardCheck className="h-3 w-3" /> Tâches
            </p>
            <p className="mt-1 text-lg sm:text-2xl font-bold tabular-nums">
              {roadmap.summary.tasksDone}
              <span className="text-sm text-muted-foreground font-medium">/{roadmap.summary.tasksTotal}</span>
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground truncate">
              {nextTask ? `Prochaine : ${nextTask.title}` : "Toutes les tâches sont terminées"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertes */}
      {roadmap.summary.alerts.length > 0 && (
        <div className="space-y-1.5">
          {roadmap.summary.alerts.map((a, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px] ${
                a.severity === "critical" ? "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400" : a.severity === "warning" ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400" : "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400"
              }`}
            >
              {a.severity === "critical" ? <XCircle className="h-3.5 w-3.5 shrink-0 mt-px" /> : a.severity === "warning" ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" /> : <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-px" />}
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Prochaines étapes */}
      <Card className="border-border/40 bg-background/50">
        <CardHeader className="p-3 sm:p-4 pb-1">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-cyan-600" /> Que dois-je faire maintenant ?
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-2 space-y-1">
          {roadmap.nextSteps.map((s, i) => (
            <p key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-[9px] font-bold text-cyan-600">{i + 1}</span>
              {s}
            </p>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

export function Gantt({ roadmap }: { roadmap: Roadmap }) {
  const maxDays = Math.max(1, ...roadmap.planning.map((t) => t.endDay));
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px] space-y-1">
        {roadmap.planning.map((task) => (
          <div key={task.id} className="flex items-center gap-2">
            <div className="w-44 shrink-0 truncate text-[11px] font-medium text-foreground/80" title={task.title}>
              {task.title}
            </div>
            <div className="relative h-5 flex-1 rounded-md bg-muted/40 overflow-hidden">
              <div
                className={`absolute top-0 h-full rounded-md ${
                  task.status === "done" ? "bg-emerald-500/80" : task.status === "in_progress" ? "bg-amber-500/80" : "bg-blue-500/70"
                }`}
                style={{ left: `${(task.startDay / maxDays) * 100}%`, width: `${Math.max(2, (task.durationDays / maxDays) * 100)}%` }}
                title={`${task.title} : J+${task.startDay} → J+${task.endDay} · ${task.responsible}`}
              />
            </div>
            <div className="w-16 shrink-0 text-right text-[10px] text-muted-foreground tabular-nums">
              J+{task.endDay}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground/60">
        Jours ouvrés estimés (J+0 = démarrage). Dépendances enchaînées dans l'ordre logique — J+{maxDays} au total.
      </p>
    </div>
  );
}
