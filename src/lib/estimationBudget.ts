// ============================================================================
// BUDGET DE L'ESTIMATION — SOURCE UNIQUE DES MONTANTS TTC
// ----------------------------------------------------------------------------
// Une seule fonction pure produit le montant du scénario affiché, utilisée à
// l'identique par :
//   • la page « Résultat de l'estimation du coût de construction » ;
//   • la page « Aide à la décision ».
//
// Elle applique exactement les règles officielles de l'estimation :
//   • retrait de la majoration d'imprévus des anciennes estimations ;
//   • scénarios Économique / Standard / Premium issus du moteur de coûts ;
//   • scénario « Personnalisé » = quantitatif du scénario de référence mis à
//     l'échelle, modifications d'articles, postes supprimés et travaux
//     complémentaires, totalisés par `computeQuantitatifTotals`.
//
// Aucun montant n'est inventé, moyenné ou recalé : le montant retourné est
// celui qui doit être affiché, au dinar près, sur les deux pages.
// ============================================================================

import {
  PERSONALIZED_SCENARIO_KEY,
  applyPosteRemovals,
  budgetScenarioFactor,
  computeQuantitatifTotals,
  overlayCustomizations,
  scaleDqeLots,
  type BudgetScenarioKey,
  type QuantitatifCustomizationEntry,
  type QuantitatifPosteRemovalEntry,
} from "@/convex/quantitatifCustomLogic";
import { withComplementaryWorksLots } from "@/lib/complementaryWorks";
import type { CustomWorkEstimate } from "@/convex/customWorksEngine";
import { legacyContingencyFactor, type CostEstimateLike } from "@/lib/constructionCost";

/** Clés affichables d'un montant d'estimation. */
export type EstimationScenarioKey = BudgetScenarioKey | typeof PERSONALIZED_SCENARIO_KEY;

export interface EstimationScenarioAmount {
  key: BudgetScenarioKey;
  totalCost: number;
  costPerM2: number;
}

export interface PersonalizedEstimate {
  /** Lots du scénario « Personnalisé » (déjà modifiés et totalisés). */
  lots: any[];
  totals: {
    total: number;
    costPerM2: number;
    materiaux: number;
    mainOeuvre: number;
    equipements: number;
    transport: number;
    etudes: number;
  };
  modifiedCount: number;
  removedCount: number;
}

export interface EstimationBudget {
  /** Scénarios budgétaires officiels, imprévus retirés. */
  scenarios: Record<BudgetScenarioKey, EstimationScenarioAmount> | null;
  /** Coût global de l'estimation, imprévus retirés. */
  totalCost: number;
  /** Scénario « Personnalisé » — `null` s'il ne porte aucune modification. */
  personalized: PersonalizedEstimate | null;
  /** Scénario réellement affiché (persisté sur le projet). */
  selectedKey: EstimationScenarioKey;
  /** Montant TTC du scénario affiché — LA valeur de référence des deux pages. */
  selectedTotal: number;
  /** Coût au m² du scénario affiché (même base, même arrondi). */
  selectedCostPerM2: number;
  /** Signature de version : un changement de quantitatif/prix/scénario la modifie. */
  version: string;
}

export interface EstimationBudgetInput {
  /** Estimation enregistrée du projet (`projects.costEstimate`). */
  costEstimate: CostEstimateLike | null | undefined;
  /** Quantitatif détaillé enregistré (`projects.dqe.lots`). */
  dqeLots: any[] | null | undefined;
  /** Surface réellement construite (m²) — base du coût au m². */
  builtSurface?: number;
  /** Scénario enregistré sur le projet (`projects.selectedScenario`). */
  selectedScenario?: string | null;
  /** Scénario de référence du scénario « Personnalisé ». */
  baseScenario?: BudgetScenarioKey | null;
  /** Modifications d'articles enregistrées. */
  modifications?: readonly QuantitatifCustomizationEntry[] | null;
  /** Postes supprimés enregistrés. */
  removedPostes?: readonly QuantitatifPosteRemovalEntry[] | null;
  /** Travaux complémentaires éligibles et sélectionnés. */
  complementaryWorks?: readonly CustomWorkEstimate[] | null;
}

const SCENARIO_KEYS: BudgetScenarioKey[] = ["economique", "standard", "premium"];

const num = (n: unknown): number => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

const isScenarioKey = (value: unknown): value is BudgetScenarioKey =>
  typeof value === "string" && (SCENARIO_KEYS as string[]).includes(value);

/**
 * Montant TTC du scénario affiché, calculé une seule fois pour les deux pages.
 * Retourne exactement les mêmes nombres que l'estimation officielle.
 */
export function resolveEstimationBudget(input: EstimationBudgetInput): EstimationBudget {
  const stored = input.costEstimate ?? null;
  // Même correction que le résultat : les anciennes estimations portent encore
  // une majoration d'imprévus que l'on retire, au dinar près.
  const factor = legacyContingencyFactor(stored);
  const real = (n: unknown) => Math.round(num(n) * factor);

  const storedScenarios = (stored?.budgetScenarios ?? null) as Record<
    BudgetScenarioKey,
    { totalCost?: number | null; costPerM2?: number | null }
  > | null;
  const scenarios = storedScenarios
    ? {
        economique: {
          key: "economique" as const,
          totalCost: real(storedScenarios.economique?.totalCost),
          costPerM2: real(storedScenarios.economique?.costPerM2 ?? 0),
        },
        standard: {
          key: "standard" as const,
          totalCost: real(storedScenarios.standard?.totalCost),
          costPerM2: real(storedScenarios.standard?.costPerM2 ?? 0),
        },
        premium: {
          key: "premium" as const,
          totalCost: real(storedScenarios.premium?.totalCost),
          costPerM2: real(storedScenarios.premium?.costPerM2 ?? 0),
        },
      }
    : null;

  const totalCost = real(stored?.totalCost);

  const rawLots = Array.isArray(input.dqeLots) ? input.dqeLots : [];
  const modifications = [...(input.modifications ?? [])];
  const removedPostes = [...(input.removedPostes ?? [])];
  const complementaryWorks = input.complementaryWorks ?? [];
  const baseScenario: BudgetScenarioKey = isScenarioKey(input.baseScenario)
    ? input.baseScenario
    : "standard";

  const hasPersonalized =
    rawLots.length > 0 &&
    (modifications.length > 0 || removedPostes.length > 0 || complementaryWorks.length > 0);

  let personalized: PersonalizedEstimate | null = null;
  if (hasPersonalized && scenarios) {
    const baseFactor = budgetScenarioFactor(scenarios, baseScenario);
    // Même pipeline que le résultat : quantitatif du scénario de référence
    // (imprévus retirés), modifications d'articles, postes supprimés, travaux
    // complémentaires, puis totalisation officielle.
    const scaled = scaleDqeLots(rawLots, baseFactor * factor);
    const overlay = modifications.length
      ? overlayCustomizations(scaled, modifications, {
          scaleFactor: baseFactor,
          realCostFactor: factor,
        })
      : { lots: scaled, modifiedCount: 0 };
    const removal = applyPosteRemovals(overlay.lots, removedPostes);
    const lots = withComplementaryWorksLots(removal.lots, complementaryWorks);
    const totals = computeQuantitatifTotals(lots, input.builtSurface ?? 0);
    personalized = {
      lots,
      totals: {
        total: num(totals.total),
        costPerM2: num(totals.costPerM2),
        materiaux: num(totals.materiaux),
        mainOeuvre: num(totals.mainOeuvre),
        equipements: num(totals.equipements),
        transport: num(totals.transport),
        etudes: num(totals.etudes),
      },
      modifiedCount: modifications.length,
      removedCount: removedPostes.length,
    };
  }

  // Scénario affiché : celui enregistré sur le projet. « Personnalisé » n'est
  // retenu que s'il existe réellement, sinon on retombe sur son scénario de
  // référence — jamais sur un autre scénario ni sur un montant par défaut.
  const storedKey = input.selectedScenario;
  const selectedKey: EstimationScenarioKey =
    storedKey === PERSONALIZED_SCENARIO_KEY && personalized
      ? PERSONALIZED_SCENARIO_KEY
      : isScenarioKey(storedKey)
        ? storedKey
        : baseScenario;

  const selectedTotal =
    selectedKey === PERSONALIZED_SCENARIO_KEY && personalized
      ? personalized.totals.total
      : scenarios
        ? scenarios[selectedKey as BudgetScenarioKey].totalCost
        : personalized && storedKey === PERSONALIZED_SCENARIO_KEY
          ? personalized.totals.total
          : totalCost;

  const selectedCostPerM2 =
    selectedKey === PERSONALIZED_SCENARIO_KEY && personalized
      ? personalized.totals.costPerM2
      : scenarios
        ? scenarios[selectedKey as BudgetScenarioKey].costPerM2
        : 0;

  // Version de calcul : toute modification du quantitatif, du scénario ou des
  // personnalisations produit une signature différente (aucun cache périmé).
  const version = [
    (stored as any)?.priceVersion ?? "",
    (stored as any)?.quantitativeVersion ?? "",
    storedKey ?? "",
    baseScenario,
    rawLots.length,
    modifications.length,
    removedPostes.length,
    complementaryWorks.length,
    totalCost,
  ].join("|");

  return {
    scenarios,
    totalCost,
    personalized,
    selectedKey,
    selectedTotal,
    selectedCostPerM2,
    version,
  };
}
