/**
 * TIMING DE L'ÉCRAN DE CHARGEMENT « ESTIMATION »
 *
 * Animation d'introduction de 4 000 ms exactement, répartie sur les 6 étapes
 * officielles du parcours Journey. La logique est pure (aucun timer) afin
 * d'être testable et de garantir une durée totale fixe, indépendante de la
 * durée réelle du calcul.
 */

/** Durée totale de l'animation d'introduction (4 secondes exactement). */
export const ESTIMATE_INTRO_MS = 4000;

/** Étapes du parcours, dans l'ordre officiel du Journey. */
export const ESTIMATE_JOURNEY_STEPS = [
  "Coût estimatif",
  "Matériaux utilisés",
  "Aide à la décision",
  "Plans architecturaux AI",
  "Mise en relation",
  "Exécution & Suivi",
] as const;

export type EstimateJourneyStep = (typeof ESTIMATE_JOURNEY_STEPS)[number];

/**
 * L'écran peut-il rendre la main ? Uniquement lorsque l'animation de 4 s est
 * terminée ET que le calcul réel a répondu. Si le calcul est plus rapide,
 * l'animation va quand même jusqu'au bout ; s'il est plus lent, l'écran reste
 * affiché en attente (aucun résultat fictif, aucune navigation prématurée).
 */
export function isEstimateLoadingComplete(
  introDone: boolean,
  pending: boolean,
): boolean {
  return introDone && !pending;
}

export interface EstimateIntroState {
  /** Progression affichée, de 0 à 100. */
  progress: number;
  /** Nombre d'étapes terminées (0 à 6). */
  completed: number;
  /** Index de l'étape active, `-1` lorsque l'introduction est terminée. */
  activeIndex: number;
  /** `true` à partir de 4 000 ms (fin de l'animation, jamais avant). */
  done: boolean;
}

/**
 * État de l'introduction pour un temps écoulé donné.
 *
 * - 0 ms → étape 1 active, progression 0 % ;
 * - chaque étape dure 4 000 / 6 ≈ 666,7 ms ;
 * - 4 000 ms → 100 %, 6 étapes terminées, aucune étape active ;
 * - au-delà, l'état est figé (aucune prolongation de l'animation).
 */
export function estimateIntroState(elapsedMs: number): EstimateIntroState {
  const total = ESTIMATE_JOURNEY_STEPS.length;
  const elapsed = Number.isFinite(elapsedMs)
    ? Math.min(Math.max(elapsedMs, 0), ESTIMATE_INTRO_MS)
    : 0;

  if (elapsed >= ESTIMATE_INTRO_MS) {
    return { progress: 100, completed: total, activeIndex: -1, done: true };
  }

  const segment = ESTIMATE_INTRO_MS / total;
  const activeIndex = Math.min(total - 1, Math.floor(elapsed / segment));
  return {
    // `floor` : 100 % est atteint exactement à 4 000 ms, jamais avant.
    progress: Math.floor((elapsed / ESTIMATE_INTRO_MS) * 100),
    completed: activeIndex,
    activeIndex,
    done: false,
  };
}
