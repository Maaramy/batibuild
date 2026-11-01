// ============================================================================
// CALENDRIER DU CHANTIER — repères de dates (jour, semaine, mois)
// ----------------------------------------------------------------------------
// Helpers PURS : aucun accès Convex, aucune écriture. Le calendrier de l'onglet
// Planning n'est qu'une lecture différente des phases déjà chargées — mêmes
// données, même autorisation, aucune mutation supplémentaire.
//
// Les semaines commencent le lundi (usage français / tunisien).
// ============================================================================

/** Une journée en millisecondes (utilisée pour les bornes d'intervalle). */
export const CALENDAR_DAY = 86_400_000;

/** Minuit local de la journée contenant `ts`. */
export function startOfDay(ts: number): number {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Décale d'un nombre de jours en heure LOCALE : le passage à l'heure d'été ne
 * décale donc pas les cases du calendrier.
 */
export function addCalendarDays(ts: number, days: number): number {
  const date = new Date(ts);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

/** Lundi de la semaine contenant `ts`. */
export function startOfWeek(ts: number): number {
  const day = startOfDay(ts);
  const weekday = (new Date(day).getDay() + 6) % 7; // lundi = 0 … dimanche = 6
  return addCalendarDays(day, -weekday);
}

/** Premier jour du mois contenant `ts`. */
export function startOfMonth(ts: number): number {
  const date = new Date(ts);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

/** Premier jour du mois décalé de `months` (négatif = mois précédents). */
export function addCalendarMonths(ts: number, months: number): number {
  const date = new Date(ts);
  return new Date(date.getFullYear(), date.getMonth() + months, 1).getTime();
}

/** Les 7 journées (lundi → dimanche) de la semaine contenant `ts`. */
export function weekDays(ts: number): number[] {
  const start = startOfWeek(ts);
  return Array.from({ length: 7 }, (_, index) => addCalendarDays(start, index));
}

/**
 * Grille de 6 semaines (42 cases) couvrant le mois de `ts` : les cases des mois
 * voisins sont incluses pour que la grille reste alignée sur les colonnes.
 */
export function monthGrid(ts: number): number[] {
  const first = startOfWeek(startOfMonth(ts));
  return Array.from({ length: 42 }, (_, index) => addCalendarDays(first, index));
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

export function isSameMonth(a: number, b: number): boolean {
  const left = new Date(a);
  const right = new Date(b);
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

export type CalendarTaskShape = { startDate: number; endDate: number };

/**
 * Une phase occupe une journée si son intervalle [début, fin] la chevauche.
 * Une phase d'un seul jour (début = fin) apparaît donc bien ce jour-là.
 */
export function taskCoversDay(task: CalendarTaskShape, day: number): boolean {
  const from = startOfDay(day);
  const to = addCalendarDays(from, 1);
  return task.startDate < to && task.endDate >= from;
}

/** Phases d'une journée, triées par date de démarrage puis de fin. */
export function tasksOfDay<T extends CalendarTaskShape>(tasks: T[], day: number): T[] {
  return tasks
    .filter((task) => taskCoversDay(task, day))
    .sort((a, b) => a.startDate - b.startDate || a.endDate - b.endDate);
}

/** « lundi 1 novembre 2026 » */
export function formatCalendarDay(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** « novembre 2026 » */
export function formatCalendarMonth(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

/** « 30 oct. → 5 nov. 2026 » */
export function formatCalendarWeek(ts: number): string {
  const days = weekDays(ts);
  const first = new Date(days[0]).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const last = new Date(days[6]).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${first} → ${last}`;
}
