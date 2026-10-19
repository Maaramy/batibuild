/**
 * ÉTATS DE LA PAGE « PLANS ARCHITECTURAUX AI »
 *
 * Une seule fonction décide ce que la page affiche, afin que l'état `undefined`
 * de Convex (requête encore en cours) ne soit JAMAIS confondu avec `null`
 * (projet réellement introuvable ou inaccessible).
 *
 *   - `intro`     : écran d'introduction de génération (4 s, identique à
 *                   l'estimation de coût de construction), les requêtes Convex
 *                   sont déjà lancées en parallèle ;
 *   - `loading`   : requête du projet ou des travaux complémentaires encore en
 *                   cours — squelette affiché, jamais de message d'erreur ;
 *   - `not-found` : l'identifiant est absent ou la requête a répondu `null` ;
 *   - `ready`     : projet chargé, les plans peuvent être affichés.
 */

export type PlanPagePhase = "intro" | "loading" | "not-found" | "ready";

export interface PlanPageStateInput {
  /** Écran d'introduction (durée fixe) affiché au montage de la page. */
  introLoading: boolean;
  /** Identifiant réel du projet issu de l'URL (`/dashboard/plans/:id`). */
  projectId: string | null | undefined;
  /** Résultat de `api.projects.getProject` : `undefined` = en cours. */
  project: unknown;
  /** Résultat de `api.customWorks.getProjectCustomWorks` : `undefined` = en cours. */
  customWorks: unknown;
}

export function resolvePlanPagePhase({
  introLoading,
  projectId,
  project,
  customWorks,
}: PlanPageStateInput): PlanPagePhase {
  const hasProjectId =
    typeof projectId === "string" && projectId.trim().length > 0;

  if (introLoading) return "intro";
  if (!hasProjectId) return "not-found";
  if (project === undefined) return "loading";
  if (project === null) return "not-found";
  // Les plans intègrent les travaux complémentaires enregistrés : attendre leur
  // chargement évite d'afficher une première version des plans puis de la
  // remplacer (aucun résultat intermédiaire n'est affiché).
  if (customWorks === undefined) return "loading";
  return "ready";
}

/**
 * Vue réellement rendue par la page.
 *
 *   - `loading`   : écran de chargement partagé (animation de 4 s puis attente
 *                   discrète si nécessaire) — jamais de message d'erreur tant
 *                   qu'une requête est en cours ;
 *   - `not-found` : le serveur a répondu `null` (ou aucun identifiant) ;
 *   - `plans`     : animation terminée ET données disponibles.
 *
 * `revealed` provient de `onComplete` de l'écran de chargement : il garantit
 * que les plans ne remplacent jamais l'animation avant sa fin, même lorsque
 * les données arrivent immédiatement.
 */
export type PlanPageView = "loading" | "not-found" | "plans";

export function resolvePlanPageView({
  phase,
  revealed,
}: {
  phase: PlanPagePhase;
  revealed: boolean;
}): PlanPageView {
  if (phase === "not-found") return "not-found";
  if (phase !== "ready" || !revealed) return "loading";
  return "plans";
}
