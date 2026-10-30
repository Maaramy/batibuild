// ============================================================================
// EXTRACTION DES DONNÉES DU PROJET POUR L'ANALYSE DE RENTABILITÉ IMMOBILIÈRE
//
// Source unique de vérité du passage « Résultats d'estimation du coût de
// construction » → module Investissement. Les quatre champs du projet exploités
// par l'analyse de rentabilité sont extraits ici, puis le formulaire complet de
// l'analyse est construit à partir de ces champs :
//
//   1. Nom du projet         ← `projects.name`
//   2. Coût de construction  ← scénario retenu de l'estimation (`budgetScenarios`)
//   3. Surface (métrage)     ← `projects.surface` (surface couverte, m²)
//   4. Région du projet      ← `projects.region` (slug des 24 gouvernorats)
//
// Aucun calcul n'est modifié : les montants repris sont exactement ceux affichés
// sur la page des résultats (scénario sélectionné, et correctif des anciennes
// estimations encore majorées d'imprévus). Le type de bien d'investissement est
// déduit du type de projet enregistré — jamais choisi par l'utilisateur.
//
// Le module est pur (aucun accès Convex ni React) : il fonctionne aussi bien
// depuis la page des résultats (projet déjà chargé) que depuis l'analyse de
// rentabilité ouverte directement par URL (`?project=…`), y compris après
// actualisation de la page.
// ============================================================================

import { investmentTypeForProject } from "@/convex/projectTypes";
import type { FormState } from "@/components/investment/shared";

/** Région de repli du module Investissement (Grand Tunis) si le projet n'en a pas. */
export const DEFAULT_INVESTMENT_REGION = "tunis";

/** Clés des scénarios budgétaires enregistrés sur l'estimation. */
export type BudgetScenarioKey = "economique" | "standard" | "premium";

const BUDGET_SCENARIO_KEYS: readonly BudgetScenarioKey[] = ["economique", "standard", "premium"];

/** Scénario retenu par défaut (sélection par défaut de la page des résultats). */
export const DEFAULT_BUDGET_SCENARIO: BudgetScenarioKey = "standard";

/** Scénario budgétaire tel qu'enregistré dans `projects.costEstimate`. */
export interface BudgetScenarioLike {
  totalCost?: number | null;
}

/** Partie de `projects.costEstimate` nécessaire à l'extraction du coût. */
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

/** Champs du projet lus par l'extraction (compatible avec le document Convex). */
export interface ProjectInvestmentSource {
  name?: string | null;
  category?: string | null;
  region?: string | null;
  surface?: number | null;
  costEstimate?: CostEstimateLike | null;
}

/**
 * Les quatre données du projet transmises à l'analyse de rentabilité
 * immobilière. Chaque champ est `null` (ou 0) quand la donnée n'existe pas sur
 * le projet : le formulaire conserve alors sa valeur par défaut au lieu
 * d'afficher une donnée inventée.
 */
export interface ProjectInvestmentFields {
  /** 1. Nom du projet. */
  projectName: string | null;
  /** 2. Coût de construction estimé (TND, scénario retenu). */
  constructionCost: number;
  /** 3. Surface construite du projet (m²). */
  surface: number | null;
  /** 4. Région du projet (slug du gouvernorat). */
  region: string;
}

// ============================================================================
// Coût de construction
// ============================================================================

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

/**
 * Coût de construction du scénario retenu, avec l'ordre de repli déjà utilisé
 * par la page des résultats : scénario affiché → économique → standard → coût
 * total de l'estimation. Un scénario absent (lien du parcours ouvert sans
 * scénario) retombe sur le scénario par défaut de la page. Renvoie 0 si
 * l'estimation est absente.
 */
export function constructionCostForScenario(
  ce: CostEstimateLike | null | undefined,
  scenario?: string | null,
): number {
  const scenarios = ce?.budgetScenarios ?? null;
  const wanted = (scenario ?? "").trim();
  const primary = (BUDGET_SCENARIO_KEYS as readonly string[]).includes(wanted)
    ? (wanted as BudgetScenarioKey)
    : DEFAULT_BUDGET_SCENARIO;

  if (scenarios) {
    for (const key of [primary, "economique", "standard"] as const) {
      const total = scenarios[key]?.totalCost;
      if (typeof total === "number") return Math.round(total);
    }
  }
  return typeof ce?.totalCost === "number" ? Math.round(ce.totalCost) : 0;
}

// ============================================================================
// Extraction des quatre champs
// ============================================================================

/**
 * Extrait les données du projet pour l'analyse de rentabilité immobilière.
 *
 * @param project  projet enregistré (`projects`) ou `undefined` pendant le chargement.
 * @param ce       estimation de coût retenue : `project.costEstimate` corrigé
 *                 des anciennes majorations d'imprévus si nécessaire.
 * @param scenario clé du scénario budgétaire affiché (économique / standard / premium).
 */
export function extractProjectInvestmentFields(
  project: ProjectInvestmentSource | null | undefined,
  ce?: CostEstimateLike | null,
  scenario?: string | null,
): ProjectInvestmentFields {
  const name = (project?.name ?? "").trim();
  const surface = project?.surface;
  const region = (project?.region ?? "").trim();

  return {
    projectName: name || null,
    constructionCost: constructionCostForScenario(ce, scenario),
    surface:
      typeof surface === "number" && Number.isFinite(surface) && surface > 0 ? surface : null,
    region: region || DEFAULT_INVESTMENT_REGION,
  };
}

// ============================================================================
// Formulaire de l'analyse de rentabilité
// ============================================================================

/**
 * Construit le pré-remplissage du formulaire d'analyse à partir des quatre
 * champs extraits. Les valeurs restantes sont les valeurs par défaut du module
 * Investissement (loyer, charges, fiscalité, horizon…) : l'utilisateur les
 * ajuste avant de lancer l'analyse.
 */
export function buildInvestmentPrefill(
  fields: ProjectInvestmentFields,
  category?: string | null,
): Partial<FormState> {
  return {
    name: fields.projectName ?? undefined,
    investmentType: investmentTypeForProject(
      (category ?? "appartement").trim() || "appartement",
    ) as FormState["investmentType"],
    purchasePrice: fields.constructionCost,
    area: fields.surface ?? undefined,
    region: fields.region,
    city: "",
    quartier: "",
    rentMode: "mensuel",
    rentAmount: 1500,
    monthlyRent: 1500,
    occupancyRate: 95,
    annualCharges: 1200,
    insurance: 300,
    managementFees: 0,
    taxationPct: 10,
    renovationCost: 0,
    financingFees: 0,
    agencyFees: 0,
    furnishingCost: 0,
    acquisitionFeesPct: 6,
    annualAppreciationPct: 5,
    rentGrowthPct: 5,
    inflationPct: 6,
    horizonYears: 10,
  };
}

/**
 * Extraction complète depuis un projet brut (document Convex) : applique le
 * correctif des anciennes estimations, extrait les quatre champs, puis
 * construit le pré-remplissage. Utilisé quand l'analyse de rentabilité est
 * ouverte directement par URL — le projet est alors relu depuis la base et les
 * données sont retrouvées à l'identique, même après actualisation.
 */
export function investmentPrefillFromProject(
  project: ProjectInvestmentSource | null | undefined,
  scenario?: string | null,
): Partial<FormState> {
  const ce = withRealConstructionCost(project?.costEstimate ?? null);
  const fields = extractProjectInvestmentFields(project, ce, scenario);
  return buildInvestmentPrefill(fields, project?.category ?? null);
}
