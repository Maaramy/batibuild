// ============================================================================
// CALENDRIER DU CHANTIER — vues Jour / Semaine / Mois
// ----------------------------------------------------------------------------
// Lecture seule : le calendrier se contente d'afficher les phases déjà
// chargées par `siteTracking.getSite` (mêmes données, mêmes permissions). Il
// n'ajoute aucune requête, aucune mutation et ne modifie pas le Gantt.
//
// Conçu mobile first : une seule colonne, aucune largeur fixe, aucun débordement
// horizontal de la page. La grille mensuelle reste tactile (cases ≥ 38 px sur un
// écran de 320 px, la limite physique de 7 colonnes) et la liste des phases
// offre, elle, des cibles pleine largeur.
// ============================================================================

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { taskProgress, formatSiteDate } from "@/lib/siteTracking";
import {
  addCalendarDays,
  addCalendarMonths,
  formatCalendarDay,
  formatCalendarMonth,
  formatCalendarWeek,
  isSameDay,
  isSameMonth,
  monthGrid,
  startOfDay,
  startOfMonth,
  tasksOfDay,
  weekDays,
  type CalendarTaskShape,
} from "@/lib/siteCalendar";
import { cn } from "@/lib/utils";

export type CalendarTask = CalendarTaskShape & {
  _id: string;
  name: string;
  progress?: number;
  status?: string;
};

type CalendarView = "day" | "week" | "month";

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
];

const WEEKDAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"];

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminée",
  blocked: "Bloquée",
};

/** Pastille de statut : mêmes codes couleur que le reste du module. */
function statusDotClass(task: CalendarTask): string {
  if (task.status === "done") return "bg-emerald-500";
  if (task.status === "blocked") return "bg-rose-500";
  if (task.status === "in_progress") return "bg-amber-500";
  return "bg-muted-foreground/40";
}

function TaskRow({ task }: { task: CalendarTask }) {
  const progress = taskProgress(task);
  return (
    <div className="rounded-lg border border-border/50 bg-card p-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 break-words text-xs font-medium">{task.name}</p>
        <Badge variant="outline" className="shrink-0 text-[9px]">
          {TASK_STATUS_LABELS[task.status ?? ""] ?? "À faire"}
        </Badge>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span className="min-w-0 truncate tabular-nums">
          {formatSiteDate(task.startDate)} → {formatSiteDate(task.endDate)}
        </span>
        <span className="shrink-0 font-medium text-foreground tabular-nums">{progress} %</span>
      </div>
      <Progress value={progress} className="mt-1 h-1" />
    </div>
  );
}

export function SiteCalendar({ tasks }: { tasks: CalendarTask[] }) {
  const today = useMemo(() => startOfDay(Date.now()), []);
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState(today);
  const [selected, setSelected] = useState(today);

  const title =
    view === "day"
      ? formatCalendarDay(cursor)
      : view === "week"
        ? formatCalendarWeek(cursor)
        : formatCalendarMonth(cursor);

  const shift = (direction: 1 | -1) => {
    if (view === "day") {
      setCursor((current) => addCalendarDays(current, direction));
      return;
    }
    if (view === "week") {
      setCursor((current) => addCalendarDays(current, 7 * direction));
      return;
    }
    setCursor((current) => {
      const next = addCalendarMonths(current, direction);
      setSelected(next);
      return next;
    });
  };

  const goToday = () => {
    setCursor(today);
    setSelected(today);
  };

  const changeView = (next: CalendarView) => {
    setView(next);
    // En semaine / mois, on repart de la journée sélectionnée pour rester
    // cohérent : le titre et la liste décrivent toujours la même période.
    setCursor(selected);
  };

  const grid = useMemo(() => monthGrid(view === "month" ? cursor : startOfMonth(cursor)), [cursor, view]);
  const week = useMemo(() => weekDays(cursor), [cursor]);
  const selectedTasks = useMemo(() => tasksOfDay(tasks, selected), [tasks, selected]);
  const dayTasks = useMemo(() => tasksOfDay(tasks, cursor), [tasks, cursor]);

  return (
    <div className="space-y-3">
      {/* Barre de navigation : deux flèches + « Aujourd'hui », titre qui se
          tronque plutôt que de pousser la page. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Période précédente"
            className="grid h-10 w-10 place-items-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Période suivante"
            className="grid h-10 w-10 place-items-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="min-w-0 flex-1 truncate text-xs font-semibold capitalize sm:text-sm">{title}</p>
        <button
          type="button"
          onClick={goToday}
          className="shrink-0 rounded-lg border border-border/60 bg-card px-3 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:scale-95"
        >
          Aujourd'hui
        </button>
      </div>

      {/* Sélecteur de vue : trois segments pleine largeur, jamais hors écran. */}
      <div role="group" aria-label="Affichage du calendrier" className="grid grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1">
        {VIEWS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={view === item.value}
            onClick={() => changeView(item.value)}
            className={cn(
              "rounded-md px-2 py-1 text-[11px] font-medium transition-colors sm:text-xs",
              view === item.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Vue MOIS : grille 7 colonnes + détail du jour choisi ── */}
      {view === "month" && (
        <>
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {WEEKDAY_INITIALS.map((initial, index) => (
              <span
                key={`${initial}-${index}`}
                aria-hidden
                className="pb-1 text-center text-[10px] font-medium uppercase text-muted-foreground"
              >
                {initial}
              </span>
            ))}
            {grid.map((day) => {
              const cellTasks = tasksOfDay(tasks, day);
              const outside = !isSameMonth(day, cursor);
              const isSelected = isSameDay(day, selected);
              const isToday = isSameDay(day, today);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelected(day)}
                  aria-label={`${formatCalendarDay(day)} — ${cellTasks.length} phase(s)`}
                  aria-current={isToday ? "date" : undefined}
                  className={cn(
                    "relative flex min-h-10 flex-col items-center justify-center gap-0.5 rounded-md border text-[11px] tabular-nums transition-colors sm:min-h-14 sm:text-xs",
                    isSelected
                      ? "border-emerald-500/60 bg-emerald-50 font-semibold text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                      : "border-transparent hover:bg-muted/60",
                    isToday && !isSelected && "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
                    outside && "opacity-40",
                  )}
                >
                  <span>{new Date(day).getDate()}</span>
                  {cellTasks.length > 0 && (
                    <span className="flex items-center gap-0.5">
                      {cellTasks.slice(0, 3).map((task, index) => (
                        <span key={`${task._id}-${index}`} className={cn("h-1 w-1 rounded-full", statusDotClass(task))} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-[11px] font-medium capitalize text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" /> {formatCalendarDay(selected)}
            </p>
            {selectedTasks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                Aucune phase planifiée ce jour-là.
              </p>
            ) : (
              selectedTasks.map((task) => <TaskRow key={task._id} task={task} />)
            )}
          </div>
        </>
      )}

      {/* ── Vue SEMAINE : une ligne par jour (aucune colonne écrasée) ── */}
      {view === "week" && (
        <div className="space-y-2">
          {week.map((day) => {
            const dayTasks = tasksOfDay(tasks, day);
            const isToday = isSameDay(day, today);
            return (
              <div key={day} className="space-y-1">
                <p
                  className={cn(
                    "flex items-center justify-between gap-2 text-[11px] font-medium capitalize",
                    isToday ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground",
                  )}
                >
                  <span className="min-w-0 truncate">
                    {new Date(day).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })}
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums">
                    {dayTasks.length} phase(s)
                  </span>
                </p>
                {dayTasks.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border/40 px-2.5 py-1.5 text-[10px] text-muted-foreground">
                    Libre
                  </p>
                ) : (
                  dayTasks.map((task) => <TaskRow key={task._id} task={task} />)
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Vue JOUR : liste simple, la plus lisible sur smartphone ── */}
      {view === "day" && (
        <div className="space-y-1.5">
          {dayTasks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
              Aucune phase planifiée ce jour-là.
            </p>
          ) : (
            dayTasks.map((task) => <TaskRow key={task._id} task={task} />)
          )}
        </div>
      )}
    </div>
  );
}
