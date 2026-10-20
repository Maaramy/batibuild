// ============================================================================
// MATÉRIAUX DU PROJET — contexte partagé de la mise en relation
// ----------------------------------------------------------------------------
// UN SEUL calcul, utilisé par la page « Mise en relation » (classement des
// fournisseurs), qui repart des articles réels du projet dès qu'elle reçoit
// `?from=materials&project=…`. La page « Matériaux utilisés » a été supprimée :
// ce hook ne sert plus qu'à la mise en relation, sans changer les quantités ni
// les prix du moteur d'estimation.
//
// Le hook ne crée aucune donnée : il lit le projet, le quantitatif, la
// personnalisation et les travaux complémentaires via les requêtes Convex
// existantes (permissions déjà contrôlées côté serveur), puis applique
// exactement la même résolution budgétaire que « Coût estimatif » et
// « Aide à la décision » (`resolveEstimationBudget`).
// ============================================================================

import { useMemo } from "react";
import { useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { realBuiltArea } from "@/lib/buildingLevels";
import { isComplementaryWorkEligible } from "@/lib/customWorksCatalog";
import { resolveEstimationBudget, type EstimationBudget } from "@/lib/estimationBudget";
import {
  BUDGET_SCENARIO_LABELS,
  PERSONALIZED_SCENARIO_KEY,
  PERSONALIZED_SCENARIO_LABEL,
  scaleDqeLots,
  type BudgetScenarioKey,
} from "@/convex/quantitatifCustomLogic";
import { legacyContingencyFactor } from "@/lib/constructionCost";
import { normalizeLegacyCategory } from "@/convex/projectTypes";
import { regionLabel } from "@/lib/providerRegions";
import {
  buildMaterialUsage,
  type MaterialUsageResult,
} from "@/lib/materialUsage";

export interface ProjectMaterialUsage {
  project: any | null | undefined;
  loading: boolean;
  usage: MaterialUsageResult;
  budget: EstimationBudget;
  builtSurface: number;
  scenarioKey: string;
  scenarioLabel: string;
  regionLabel: string | null;
  /** Liste des articles, au format attendu par la demande de devis. */
  materials: Array<{ name: string; quantity: number; unit: string }>;
  complementaryWorksEligible: boolean;
}

/**
 * Calcule les matériaux réellement nécessaires au projet pour le scénario
 * demandé (par défaut, le scénario enregistré sur le projet).
 */
export function useProjectMaterialUsage(
  projectId: string | null | undefined,
  scenarioOverride?: string | null,
): ProjectMaterialUsage {
  const id = typeof projectId === "string" && projectId.trim() ? projectId.trim() : null;

  const project = useQuery(
    api.projects.getProject,
    id ? { projectId: id as Id<"projects"> } : "skip",
  );
  const customization = useQuery(
    api.quantitatifCustom.getCustomization,
    id ? { projectId: id as Id<"projects"> } : "skip",
  );
  const customWorksData = useQuery(
    api.customWorks.getProjectCustomWorks,
    id ? { projectId: id as Id<"projects"> } : "skip",
  );

  // Surface réellement construite : somme des surfaces de chaque niveau.
  const builtSurface = project?.surface
    ? realBuiltArea(project.surface, project.floors || 1, project.levelSurfaces)
    : 0;

  const complementaryWorksEligible = isComplementaryWorkEligible(
    normalizeLegacyCategory(project?.category as string),
    project?.surface,
  );

  // Scénario demandé : paramètre d'URL (transmis depuis le tableau) ou scénario
  // enregistré du projet. Aucun montant par défaut n'est inventé.
  const selectedScenario =
    (scenarioOverride ?? "").trim() ||
    (typeof project?.selectedScenario === "string" ? project.selectedScenario : null);

  const budget = useMemo(
    () =>
      resolveEstimationBudget({
        costEstimate: project?.costEstimate ?? null,
        dqeLots: ((project as any)?.dqe?.lots ?? []) as any[],
        builtSurface,
        selectedScenario,
        baseScenario: (customization?.baseScenario ?? "standard") as BudgetScenarioKey,
        modifications: (customization?.modifications ?? []) as any,
        removedPostes: (customization?.removedPostes ?? []) as any,
        complementaryWorks: complementaryWorksEligible ? customWorksData?.works ?? [] : [],
      }),
    [
      project,
      builtSurface,
      selectedScenario,
      customization,
      customWorksData,
      complementaryWorksEligible,
    ],
  );

  // Facteur de prix du scénario affiché (scénario / Standard). Pour le scénario
  // « Personnalisé », on part de son scénario de référence : les travaux
  // complémentaires sont ajoutés séparément, jamais comptés deux fois.
  const scenarioFactor = useMemo(() => {
    const standard = budget.scenarios?.standard?.totalCost ?? 0;
    if (standard <= 0) return 1;
    if (budget.selectedKey === PERSONALIZED_SCENARIO_KEY) {
      const baseKey = (customization?.baseScenario ?? "standard") as BudgetScenarioKey;
      const base = budget.scenarios?.[baseKey]?.totalCost ?? 0;
      return base > 0 ? base / standard : 1;
    }
    const total = budget.scenarios?.[budget.selectedKey as BudgetScenarioKey]?.totalCost ?? 0;
    return total > 0 ? total / standard : 1;
  }, [budget, customization]);

  const complementaryWorks = useMemo(
    () =>
      budget.selectedKey === PERSONALIZED_SCENARIO_KEY && complementaryWorksEligible
        ? (customWorksData?.works ?? [])
        : [],
    [budget.selectedKey, complementaryWorksEligible, customWorksData],
  );

  // Quantitatif final transmis au tableau : scénario appliqué, modifications
  // d'articles et travaux complémentaires compris (scénario Personnalisé).
  const dqeLotsForUsage = useMemo(() => {
    const raw = ((project as any)?.dqe?.lots ?? []) as any[];
    if (!raw.length) return [];
    if (budget.selectedKey === PERSONALIZED_SCENARIO_KEY && budget.personalized) {
      return budget.personalized.lots;
    }
    return scaleDqeLots(
      raw,
      scenarioFactor * legacyContingencyFactor(project?.costEstimate as any),
    );
  }, [project, budget.selectedKey, budget.personalized, scenarioFactor]);

  const usage = useMemo(
    () =>
      buildMaterialUsage({
        costEstimate: project?.costEstimate ?? null,
        dqeLots: dqeLotsForUsage,
        scenarioFactor,
        complementaryWorks,
        builtArea: builtSurface,
      }),
    [project, dqeLotsForUsage, scenarioFactor, complementaryWorks, builtSurface],
  );

  // Le scénario « Personnalisé » n'est affiché que s'il existe réellement.
  const scenarioKey =
    budget.selectedKey === PERSONALIZED_SCENARIO_KEY
      ? PERSONALIZED_SCENARIO_KEY
      : budget.selectedKey;
  const scenarioLabel =
    scenarioKey === PERSONALIZED_SCENARIO_KEY
      ? PERSONALIZED_SCENARIO_LABEL
      : BUDGET_SCENARIO_LABELS[scenarioKey as BudgetScenarioKey] ?? scenarioKey;

  const materials = useMemo(
    () =>
      usage.rows.map((row) => ({
        name: row.article,
        quantity: row.quantity,
        unit: row.unit,
      })),
    [usage],
  );

  return {
    project,
    loading: project === undefined,
    usage,
    budget,
    builtSurface,
    scenarioKey,
    scenarioLabel,
    regionLabel: project?.region ? regionLabel(project.region) : null,
    materials,
    complementaryWorksEligible,
  };
}
