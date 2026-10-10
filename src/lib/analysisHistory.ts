/**
 * STATUTS COMMUNS DES CARTES D'HISTORIQUE D'ANALYSES.
 *
 * Les cartes d'historique d'analyses (Investissement notamment) présentent
 * leurs analyses avec la même carte : le badge de statut est donc défini une
 * seule fois ici.
 *
 * Aucune valeur n'est inventée : chaque module dérive son statut de ses propres
 * données (résultats enregistrés ou non, analyse actuellement ouverte).
 */

export type AnalysisHistoryStatus = "completed" | "running" | "error";

/** Libellés affichés par le badge de statut. */
export const ANALYSIS_STATUS_LABEL: Record<AnalysisHistoryStatus, string> = {
  completed: "Terminée",
  running: "En cours",
  error: "Erreur",
};
