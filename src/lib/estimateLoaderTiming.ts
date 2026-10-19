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
 * Garde-fou : au-delà de ce délai sans résultats réels observables, le
 * chargement passe en erreur avec une action « Réessayer » — il ne peut donc
 * jamais rester bloqué indéfiniment, même si une promesse ne se résout pas.
 */
export const ESTIMATE_ANALYSIS_TIMEOUT_MS = 90_000;

/**
 * L'écran peut-il rendre la main ? Uniquement lorsque l'animation de 4 s est
 * terminée ET que les données réelles sont disponibles. La disponibilité réelle
 * prime sur une erreur précédente : si le calcul a fini par aboutir, les
 * résultats doivent s'afficher (aucun résultat fictif, aucune attente infinie).
 */
export function isEstimateResultReady(
  introDone: boolean,
  dataReady: boolean,
): boolean {
  return introDone && dataReady;
}

/** Forme minimale du projet lue dans Convex pour constater la fin du calcul. */
export interface EstimateProjectSnapshot {
  status?: string;
  costEstimate?: unknown;
  aiAnalysis?: unknown;
}

/**
 * Les résultats réels sont-ils réellement enregistrés ? Source de vérité : le
 * document projet relu par la requête réactive, jamais la seule résolution de
 * la mutation (qui peut être lente, interrompue ou incomplète).
 */
export function isEstimateProjectReady(
  project: EstimateProjectSnapshot | null | undefined,
): boolean {
  return Boolean(
    project &&
      project.status === "completed" &&
      project.costEstimate &&
      project.aiAnalysis,
  );
}

/** Phase réellement affichée par l'écran de chargement. */
export type EstimateFlowPhase = "loading" | "waiting" | "error" | "complete";

/**
 * Machine à états explicite, sans dépendance circulaire :
 *   - `loading`  : animation initiale en cours ;
 *   - `waiting`  : animation terminée, données réelles pas encore disponibles ;
 *   - `complete` : animation terminée ET données disponibles ;
 *   - `error`    : erreur réelle (le message est affiché, avec « Réessayer »).
 */
export function resolveEstimateFlowPhase({
  introDone,
  dataReady,
  error,
}: {
  introDone: boolean;
  dataReady: boolean;
  error: string | null;
}): EstimateFlowPhase {
  // Les données réelles gagnent toujours : dès qu'elles existent, l'écran
  // termine (ou continue simplement l'animation puis termine) sans erreur.
  if (dataReady) return introDone ? "complete" : "loading";
  if (error) return "error";
  return introDone ? "waiting" : "loading";
}

/** Message explicite présenté à l'utilisateur lorsqu'une tentative échoue. */
export function describeEstimateError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (/abonnement|client\s*pro|acc[eè]s|access|unauthor/i.test(raw)) {
    return raw.trim() ||
      "Votre accès Client Pro ne permet pas de lancer l'estimation. Vérifiez votre abonnement puis réessayez.";
  }
  if (/network|connexion|offline|websocket|fetch|timeout/i.test(raw)) {
    return "La connexion a été interrompue pendant le calcul. Vérifiez votre réseau puis réessayez : vos données de projet sont conservées.";
  }
  return "Le calcul de l'estimation a échoué. Vos données de projet sont conservées — réessayez sans recréer le projet.";
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
