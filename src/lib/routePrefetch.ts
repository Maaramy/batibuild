// ============================================================================
// PRÉCHARGEMENT DES MODULES DE ROUTE (WEB UNIQUEMENT).
//
// Les pages de batibuild sont chargées à la demande (`lazy()` dans
// `src/main.tsx`) : le premier affichage d'une page attend donc le
// téléchargement de son module. Pour un utilisateur qui REVIENT, on peut
// anticiper ce téléchargement pendant un temps mort du navigateur
// (`requestIdleCallback`), sans jamais retarder l'affichage en cours.
//
// Ce préchargement ne change aucune route, aucune donnée et aucun rendu : il
// réchauffe simplement le cache de modules. Il est volontairement limité au
// navigateur Web (`IS_WEB_BROWSER`) : l'application Android conserve son
// propre comportement.
// ============================================================================
import { IS_WEB_BROWSER } from "./runtime";

/** Pages préchargeables — mêmes modules que les `lazy()` de `src/main.tsx`. */
export type PrefetchTarget = "auth" | "dashboard";

/** Chargeurs de modules. Les identifiants de module étant identiques à ceux du
 *  routeur, Vite réutilise EXACTEMENT les mêmes fragments. */
export const ROUTE_LOADERS: Record<PrefetchTarget, () => Promise<unknown>> = {
  auth: () => import("../pages/Auth.tsx"),
  dashboard: () => import("../pages/Dashboard.tsx"),
};

/** Planificateur de tâche de fond (injectable dans les tests). */
export type IdleScheduler = (task: () => void) => void;

const defaultScheduler: IdleScheduler = (task) => {
  const idle = (
    globalThis as { requestIdleCallback?: (cb: () => void, options?: { timeout?: number }) => void }
  ).requestIdleCallback;
  if (typeof idle === "function") {
    idle(task, { timeout: 3000 });
    return;
  }
  setTimeout(task, 1200);
};

/** Cibles déjà planifiées (évite tout travail répété). */
const scheduled = new Set<PrefetchTarget>();

/**
 * Planifie le préchargement d'une page pendant un temps mort.
 * Sans effet dans l'application Android, ou si le module est déjà planifié.
 */
export function scheduleRoutePrefetch(
  target: PrefetchTarget,
  options: { enabled?: boolean; scheduler?: IdleScheduler } = {},
): boolean {
  if (!(options.enabled ?? IS_WEB_BROWSER)) return false;
  if (scheduled.has(target)) return false;

  const load = ROUTE_LOADERS[target];
  if (!load) return false;

  scheduled.add(target);
  (options.scheduler ?? defaultScheduler)(() => {
    // Un échec reste silencieux : le module sera simplement chargé par la route.
    void load().catch(() => {});
  });
  return true;
}

/** Réinitialise l'état de planification (tests). */
export function resetRoutePrefetchState(): void {
  scheduled.clear();
}
