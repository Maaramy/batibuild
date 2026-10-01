import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type {
  JourneyModule,
  JourneyState,
  JourneyStepStatus,
} from "@/convex/journey";

/**
 * État du parcours du projet (toutes les étapes) — lecture seule.
 * Renvoie `undefined` tant que la requête n'est pas résolue (ou sans projet).
 */
export function useJourneyState(
  projectId: string | null | undefined,
): JourneyState | undefined {
  return useQuery(
    api.journey.getJourneyState,
    projectId ? { projectId: projectId as never } : "skip",
  );
}

export interface JourneyStepInfo {
  /** Statut affiché : none · running · done · stale. */
  status: JourneyStepStatus;
  /** Analyse terminée et à jour → afficher directement le résultat sauvegardé. */
  isDone: boolean;
  /** Analyse terminée mais données du projet modifiées → proposer une actualisation. */
  isStale: boolean;
  /** Analyse en cours. */
  isRunning: boolean;
  /** Un résultat sauvegardé existe (même obsolète). */
  hasResult: boolean;
  analyzedAt: number;
  resultRef?: string;
}

/**
 * État d'UNE étape du parcours pour un projet donné.
 *
 * Règle d'usage : `isDone` (✓) → afficher directement le résultat sauvegardé,
 * ne PAS relancer l'analyse ; `isStale` (⚠) → afficher l'ancien résultat et
 * proposer « Actualiser l'analyse » ; `status === "none"` (○) → formulaire.
 */
export function useJourneyStep(
  projectId: string | null | undefined,
  module: JourneyModule,
): JourneyStepInfo {
  const state = useJourneyState(projectId);
  const step = state?.modules?.[module];
  const status: JourneyStepStatus = step?.status ?? "none";
  const analyzedAt = step?.analyzedAt ?? 0;
  return {
    status,
    isDone: status === "done",
    isStale: status === "stale",
    isRunning: status === "running",
    hasResult: status === "done" || status === "stale",
    analyzedAt,
    resultRef: step?.resultRef,
  };
}
