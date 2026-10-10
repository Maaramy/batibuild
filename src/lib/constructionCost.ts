// ============================================================================
// COÛT DE CONSTRUCTION — CORRECTION DES ANCIENNES ESTIMATIONS
//
// Source unique du passage « estimation enregistrée → coût réel » : les
// estimations créées avant la suppression de la marge d'imprévus portent
// encore une majoration (`contingencyPercentage`) dans leurs montants. Les
// pages qui affichent le coût réel (Aide à la décision, résultat d'estimation)
// réutilisent ces helpers pour retrouver exactement le même montant.
//
// Module pur (aucun accès Convex ni React), donc testable et utilisable partout.
// ============================================================================

/** Clés des scénarios budgétaires enregistrés sur l'estimation. */
export type BudgetScenarioKey = "economique" | "standard" | "premium";

/** Scénario budgétaire tel qu'enregistré dans `projects.costEstimate`. */
export interface BudgetScenarioLike {
  totalCost?: number | null;
}

/** Partie de `projects.costEstimate` nécessaire à la correction du coût. */
export interface CostEstimateLike {
  totalCost?: number | null;
  contingencyBuffer?: number | null;
  contingencyPercentage?: number | null;
  budgetScenarios?: {
    economique?: BudgetScenarioLike | null;
    standard?: BudgetScenarioLike | null;
    premium?: BudgetScenarioLike | null;
  } | null;
}

/**
 * Facteur correctif des estimations enregistrées avant la suppression des
 * imprévus : le moteur n'ajoute plus de marge, mais les anciennes estimations
 * portent encore une majoration (`contingencyPercentage`). Vaut 1 quand aucune
 * correction n'est nécessaire.
 */
export function legacyContingencyFactor(ce: CostEstimateLike | null | undefined): number {
  const pct = ce?.contingencyPercentage ?? 0;
  return pct > 0 ? 1 / (1 + pct / 100) : 1;
}

/**
 * Renvoie l'estimation au coût réel (majoration d'imprévus retirée) sans
 * modifier l'objet d'origine. L'objet est renvoyé tel quel si aucune
 * correction n'est nécessaire.
 */
export function withRealConstructionCost<T extends CostEstimateLike>(
  ce: T | null | undefined,
): T | null | undefined {
  if (!ce) return ce;
  const factor = legacyContingencyFactor(ce);
  if (factor === 1) return ce;
  const real = (n: number) => Math.round(n * factor);
  const scenarios = ce.budgetScenarios;
  const scale = (s: BudgetScenarioLike | null | undefined) =>
    s && typeof s.totalCost === "number" ? { ...s, totalCost: real(s.totalCost) } : s;
  return {
    ...ce,
    totalCost: typeof ce.totalCost === "number" ? real(ce.totalCost) : ce.totalCost,
    budgetScenarios: scenarios
      ? {
          economique: scale(scenarios.economique),
          standard: scale(scenarios.standard),
          premium: scale(scenarios.premium),
        }
      : scenarios,
    contingencyBuffer: 0,
    contingencyPercentage: 0,
  } as T;
}
