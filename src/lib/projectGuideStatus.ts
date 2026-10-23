// ============================================================================
// STATUTS D'EXÉCUTION — statut lisible d'une tâche ou d'une phase
// ----------------------------------------------------------------------------
// Le statut enregistré ne connaît que « à faire / en cours / terminé ». Le suivi
// de chantier ajoute deux états calculés à partir des DATES du planning :
//   • « En retard » : l'échéance estimée est dépassée et la tâche n'est pas finie ;
//   • « En attente » : une tâche précédente n'est pas terminée.
// Aucun état n'est enregistré en base : tout est dérivé, sans progression fictive.
// ============================================================================

import type { PlanningTask } from "@/convex/roadmapEngine";

export type ExecutionTaskStatus = "todo" | "in_progress" | "waiting" | "late" | "done";

export const EXECUTION_STATUS_LABELS: Record<ExecutionTaskStatus, string> = {
  todo: "À faire",
  in_progress: "En cours",
  waiting: "En attente",
  late: "En retard",
  done: "Terminé",
};

/** Classes Tailwind alignées sur la charte (mêmes teintes que le Guide). */
export const EXECUTION_STATUS_CLASSES: Record<ExecutionTaskStatus, string> = {
  todo: "border-border/50 bg-muted/20 text-muted-foreground",
  in_progress: "border-cyan-500/35 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  waiting: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  late: "border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-300",
  done: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const DAY_MS = 24 * 60 * 60 * 1000;

export interface TaskStatusOptions {
  /** Démarrage estimé du chantier (`summary.startDate`). */
  startDate?: number;
  /** Horodatage courant (injecté dans les tests). */
  today?: number;
  /** Identifiants des tâches terminées (pour les dépendances). */
  doneTaskIds?: ReadonlySet<string>;
}

/** Date de fin estimée d'une tâche du planning (J+0 = startDate). */
export function taskDueDate(startDate: number | undefined, task: Pick<PlanningTask, "endDay">): number | undefined {
  if (typeof startDate !== "number" || !Number.isFinite(startDate)) return undefined;
  return startDate + task.endDay * DAY_MS;
}

/**
 * Statut d'affichage d'une tâche :
 *   terminé > en retard (échéance dépassée) > en cours > en attente > à faire.
 */
export function executionTaskStatus(
  task: Pick<PlanningTask, "id" | "status" | "progress" | "endDay" | "dependencies">,
  options: TaskStatusOptions = {},
): ExecutionTaskStatus {
  const today = options.today ?? Date.now();
  if (task.status === "done" || task.progress >= 100) return "done";

  const due = taskDueDate(options.startDate, task);
  const overdue = due !== undefined && due < today;

  if (task.status === "in_progress" || task.progress > 0) {
    return overdue ? "late" : "in_progress";
  }
  if (overdue) return "late";

  const deps = task.dependencies ?? [];
  if (deps.length > 0 && options.doneTaskIds && deps.some((d) => !options.doneTaskIds!.has(d))) {
    return "waiting";
  }
  return "todo";
}

/** Statut d'une phase à partir des statuts de ses tâches. */
export function executionPhaseStatus(
  statuses: readonly ExecutionTaskStatus[],
): ExecutionTaskStatus {
  if (statuses.length === 0) return "todo";
  if (statuses.every((s) => s === "done")) return "done";
  if (statuses.some((s) => s === "late")) return "late";
  if (statuses.some((s) => s === "in_progress")) return "in_progress";
  if (statuses.some((s) => s === "waiting")) return "waiting";
  return "todo";
}

/** Identifiants des tâches terminées (utilisé pour les dépendances). */
export function doneTaskIds(tasks: readonly Pick<PlanningTask, "id" | "status" | "progress">[]): Set<string> {
  return new Set(tasks.filter((t) => t.status === "done" || t.progress >= 100).map((t) => t.id));
}
