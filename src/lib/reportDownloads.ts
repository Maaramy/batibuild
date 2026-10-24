/**
 * TÉLÉCHARGEMENTS DES RAPPORTS PDF
 *
 * Chaque fonction réutilise EXACTEMENT le générateur du module concerné
 * (devis estimatif, plan IA, aide à la décision, guide construction A-Z) :
 * le PDF téléchargé depuis « Rapports
 * PDF » est donc le rapport réellement généré pour ce projet, avec le branding
 * centralisé (`src/lib/pdfBranding.ts` — nom batibuild, logo officiel, en-tête
 * blanc).
 *
 * Les données proviennent soit du projet lui-même (coût, plan), soit des
 * artefacts persistés côté serveur, rechargés via des requêtes Convex qui
 * vérifient l'utilisateur et l'appartenance du rapport (matériaux,
 * exécution).
 */

import type { ConvexReactClient } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  inferFloorsFromCategory,
  normalizeLegacyCategory,
  projectTypeLabel,
} from "@/convex/projectTypes";
import {
  BUDGET_SCENARIO_LABELS,
  PERSONALIZED_SCENARIO_KEY,
  PERSONALIZED_SCENARIO_LABEL,
  budgetScenarioFactor,
  computeQuantitatifTotals,
  overlayCustomizations,
  scaleDqeLots,
  type BudgetScenarioKey,
  type QuantitatifCustomizationEntry,
} from "@/convex/quantitatifCustomLogic";
import { buildBudgetAnalysis } from "./budgetEngine";
import { realBuiltArea } from "./buildingLevels";
import { resolveEstimationBudget } from "./estimationBudget";
import { exportDecisionSupportPdf } from "./decisionSupportPdf";
import { regionLabel } from "./providerRegions";
import { generateFloorPlans, repairFloorPlan } from "./floorPlanEngine";
import { downloadFloorPlanPdf } from "./floorPlanPdf";
import { generateProjectPdf } from "./projectPdf";
import { normalizeCostEvolutionSettings } from "./costEvolution";
import { exportRoadmapPdf } from "./roadmapReportPdf";

/** Forme minimale d'un projet utilisée par les générateurs. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProjectLike = any;

/**
 * Retire la marge d'imprévus historiquement enregistrée (les estimations
 * antérieures portent encore une majoration) — même règle que la page projet,
 * afin que le montant du PDF corresponde au coût réel affiché.
 */
function realCostEstimate(storedCe: ProjectLike): ProjectLike {
  const legacyPct = storedCe?.contingencyPercentage ?? 0;
  if (!storedCe || legacyPct <= 0) return storedCe;
  const factor = 1 / (1 + legacyPct / 100);
  const real = (n: number) => Math.round(n * factor);
  const s = storedCe.budgetScenarios;
  return {
    ...storedCe,
    totalCost: real(storedCe.totalCost),
    budgetScenarios: s
      ? {
          economique: { ...s.economique, totalCost: real(s.economique.totalCost) },
          standard: { ...s.standard, totalCost: real(s.standard.totalCost) },
          premium: { ...s.premium, totalCost: real(s.premium.totalCost) },
        }
      : s,
    contingencyBuffer: 0,
    contingencyPercentage: 0,
  };
}

/** Contexte de téléchargement du devis estimatif / quantitatif détaillé. */
export interface CostReportParams {
  convex: ConvexReactClient;
  project: ProjectLike;
  projectId: string;
  /** Mutation quota plateforme (`api.subscriptions.consumeDownload`). */
  consumeDownload: () => Promise<unknown>;
  onProgress?: (step: number) => void;
}

/**
 * Devis estimatif. Rejoue le scénario « Standard » enrichi du quantitatif
 * enregistré et, s'il existe, du scénario « Personnalisé » (articles modifiés
 * du Quantitatif détaillé).
 */
export async function downloadCostReport({
  convex,
  project,
  projectId,
  consumeDownload,
  onProgress,
}: CostReportParams): Promise<void> {
  const storedCe = project?.costEstimate;
  if (!storedCe) throw new Error("report-unavailable");

  const ce = realCostEstimate(storedCe);
  const realCostFactor =
    storedCe?.contingencyPercentage > 0
      ? 1 / (1 + storedCe.contingencyPercentage / 100)
      : 1;
  const ai = project?.aiAnalysis;
  const scenarios = ce?.budgetScenarios;
  const dqe = project?.dqe ?? storedCe?.dqe;

  // Scénario « Personnalisé » : scénario de référence + modifications d'articles.
  const customization = await convex.query(api.quantitatifCustom.getCustomization, {
    projectId: projectId as never,
  });
  const entries = (customization?.modifications ?? []) as QuantitatifCustomizationEntry[];
  const builtSurface = project?.surface ? project.surface * (project.floors || 1) : 0;
  let personalized: ProjectLike = null;
  if (entries.length && dqe?.lots?.length) {
    const baseFactor = budgetScenarioFactor(scenarios, customization!.baseScenario);
    const scaled = scaleDqeLots(dqe.lots, baseFactor * realCostFactor);
    const overlay = overlayCustomizations(scaled, entries, {
      scaleFactor: baseFactor,
      realCostFactor,
    });
    if (overlay.modifiedCount) {
      personalized = {
        lots: overlay.lots,
        totals: computeQuantitatifTotals(overlay.lots, builtSurface),
        modifiedCount: overlay.modifiedCount,
      };
    }
  }

  // Barème d'évolution annuelle des coûts : section facultative du devis,
  // ajoutée seulement si l'administrateur a activé le mécanisme.
  const costEvolutionConfig = await convex.query(api.costEvolution.getConfig, {});

  await generateProjectPdf({
    project,
    ce,
    ai,
    scenarios,
    scenario: "standard",
    dqe,
    dqeScaleFactor: 1,
    personalized,
    costEvolutionSettings: normalizeCostEvolutionSettings(costEvolutionConfig),
    costEvolutionYears: 1,
    onStart: () => undefined,
    onProgress: onProgress ?? (() => undefined),
    onSuccess: () => undefined,
    onFinish: () => undefined,
    consumeDownload,
  });
}

/** Plan IA — recomposition déterministe du projet, puis export du meilleur plan. */
export async function downloadPlansReport(project: ProjectLike): Promise<void> {
  const surface = typeof project?.surface === "number" ? project.surface : 0;
  if (surface <= 0) throw new Error("report-unavailable");

  const variants = generateFloorPlans({
    category: project.category as string,
    surface,
    floors: Math.max(
      1,
      Math.min(5, project.floors ?? inferFloorsFromCategory(project.category)),
    ),
    // Mêmes surfaces par niveau que la page des plans : le PDF ne peut pas
    // afficher d'autres surfaces que celles de l'écran.
    levelSurfaces: project.levelSurfaces ?? undefined,
    bedrooms: project.bedrooms ?? undefined,
    bathrooms: project.bathrooms ?? undefined,
    kitchens: project.kitchens ?? undefined,
    livingRooms: project.livingRooms ?? undefined,
    wcs: project.wcs ?? undefined,
    plotArea: project.surfaceTotale ?? undefined,
    pools: project.pools ?? undefined,
    garages: project.garages ?? undefined,
  }).map((variant) => ({
    ...variant,
    floors: variant.floors.map((f) =>
      repairFloorPlan({
        ...f,
        rooms: f.rooms.map((r) => ({ ...r, doors: [...r.doors], windows: [...r.windows] })),
      }),
    ),
  }));

  if (!variants.length) throw new Error("report-unavailable");
  const best = variants.reduce(
    (a, b) => (b.validation.score > a.validation.score ? b : a),
    variants[0],
  );
  const floor = best.floors[0];
  if (!floor) throw new Error("report-unavailable");
  const floorLabel = floor.level === 0 ? "Rez-de-chaussée" : `Niveau ${floor.level}`;

  await downloadFloorPlanPdf({
    plan: floor,
    projectName: project.name ?? "Projet",
    variantName: best.name,
    floorLabel,
    surfaces: best.surfaces,
    site: best.site,
  });
}

/**
 * Aide à la décision — rapport de capacité de construction.
 *
 * Le rapport est reconstruit à partir des MÊMES sources que la page :
 * contexte budgétaire serveur (`getProjectBudgetContext`), budget réellement
 * analysé (`getBudgetAnalysis`) et résolveur officiel des montants TTC. Aucun
 * rapport n'est produit si aucun budget n'a encore été analysé.
 */
export async function downloadDecisionSupportReport(
  convex: ConvexReactClient,
  projectId: string,
): Promise<void> {
  const [project, context, saved, customization, customWorks] = await Promise.all([
    convex.query(api.projects.getProject, { projectId: projectId as never }),
    convex.query(api.decisionSupport.getProjectBudgetContext, {
      projectId: projectId as never,
    }),
    convex.query(api.decisionSupport.getBudgetAnalysis, {
      projectId: projectId as never,
    }),
    convex.query(api.quantitatifCustom.getCustomization, {
      projectId: projectId as never,
    }),
    convex.query(api.customWorks.getProjectCustomWorks, {
      projectId: projectId as never,
    }),
  ]);

  const budgetAvailable = Number(saved?.budgetAvailable);
  if (!project || !context || !Number.isFinite(budgetAvailable) || budgetAvailable <= 0) {
    throw new Error("report-unavailable");
  }

  const surface = Number((project as ProjectLike)?.surface) || 0;
  const floors = Number((project as ProjectLike)?.floors) || 1;
  const builtSurface = surface > 0
    ? realBuiltArea(surface, floors, (project as ProjectLike)?.levelSurfaces)
    : 0;
  const storedScenario = (project as ProjectLike)?.selectedScenario;
  const baseScenario = (customization?.baseScenario ??
    (["economique", "standard", "premium"].includes(storedScenario)
      ? storedScenario
      : "standard")) as BudgetScenarioKey;

  // Même résolveur que la page : scénario affiché (y compris Personnalisé).
  const budget = resolveEstimationBudget({
    costEstimate: (project as ProjectLike)?.costEstimate ?? null,
    dqeLots: ((project as ProjectLike)?.dqe?.lots ?? []) as any[],
    builtSurface,
    selectedScenario: storedScenario ?? null,
    baseScenario,
    modifications: (customization?.modifications ?? []) as any,
    removedPostes: (customization?.removedPostes ?? []) as any,
    complementaryWorks: (customWorks?.works ?? []) as any,
  });

  if (budget.selectedTotal <= 0) throw new Error("report-unavailable");

  const scenarioLabel =
    budget.selectedKey === PERSONALIZED_SCENARIO_KEY
      ? PERSONALIZED_SCENARIO_LABEL
      : BUDGET_SCENARIO_LABELS[budget.selectedKey as BudgetScenarioKey];

  const analysis = buildBudgetAnalysis({
    projectId,
    userId: context.userId,
    projectName: (project as ProjectLike)?.name ?? context.projectName ?? "Projet",
    scenarioLabel,
    projectTotal: budget.selectedTotal,
    costPerM2: budget.selectedCostPerM2,
    budgetAvailable,
    breakdown: context.breakdown as any,
    lots: context.lots as any,
    surface: context.surface,
  });
  if (!analysis.available) throw new Error("report-unavailable");

  const region = (project as ProjectLike)?.region
    ? regionLabel((project as ProjectLike).region)
    : "";
  const projectContext = [
    projectTypeLabel(normalizeLegacyCategory((project as ProjectLike)?.category)),
    region,
    context.surface ? `${context.surface} m²` : null,
    scenarioLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  exportDecisionSupportPdf({ analysis, projectContext });
}

/** Exécution & suivi — guide construction A-Z (feuille de route enregistrée). */
export async function downloadExecutionReport(
  convex: ConvexReactClient,
  projectId: string,
): Promise<void> {
  const data = await convex.query(api.roadmap.getRoadmap, {
    projectId: projectId as never,
  });
  if (!data?.results) throw new Error("report-unavailable");
  exportRoadmapPdf(data.results);
}
