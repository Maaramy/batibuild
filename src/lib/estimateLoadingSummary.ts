// ============================================================================
// RÉSUMÉ RÉEL AFFICHÉ PENDANT LE CHARGEMENT DU COÛT ESTIMATIF
// ----------------------------------------------------------------------------
// L'écran de chargement des résultats ne doit montrer aucune donnée fictive :
// ce module produit les mêmes valeurs que la page finale « Coût estimatif »
// (mêmes fonctions de calcul, même résolveur de budget) à partir du document
// projet déjà disponible (`getUserProjects`), des personnalisations et des
// travaux complémentaires enregistrés.
//
// Il ne calcule rien de nouveau : il RÉUTILISE
//   • `resolveEstimationBudget` (source unique des montants TTC) ;
//   • `realBuiltArea` (surface réellement construite) ;
//   • `scaleDqeLots` / `buildChartBreakdownFromLots` (quantitatif affiché) ;
//   • le chiffrage « rénovation salle de bain » quand il s'applique.
//
// Les valeurs encore indisponibles restent `null` : l'interface conserve leur
// emplacement avec un indicateur de chargement discret, jamais une estimation
// approximative. Module pur (aucun accès React ni Convex), donc testable.
// ============================================================================

import { realBuiltArea } from "./buildingLevels";
import { resolveEstimationBudget } from "./estimationBudget";
import {
  buildChartBreakdown,
  buildChartBreakdownFromLots,
  type ChartBreakdownEntry,
} from "./complementaryWorks";
import { legacyContingencyFactor } from "./constructionCost";
import {
  correctEnduitLissageBimItems,
  isEnduitLissageName,
} from "./enduitLissage";
import { regionCostFactor } from "./regionImpact";
import { REGION_COST_M2 } from "@/convex/bimEngine";
import {
  BUDGET_SCENARIO_LABELS,
  PERSONALIZED_SCENARIO_KEY,
  PERSONALIZED_SCENARIO_LABEL,
  scaleDqeLots,
  type BudgetScenarioKey,
  type QuantitatifCustomizationEntry,
  type QuantitatifPosteRemovalEntry,
} from "@/convex/quantitatifCustomLogic";
import type { CustomWorkEstimate } from "@/convex/customWorksEngine";
import { normalizeLegacyCategory, projectTypeLabel } from "@/convex/projectTypes";
import { regionLabel as labelRegion } from "@/lib/providerRegions";
import {
  buildSdbEstimate,
  buildSdbPriceResolver,
  isRenovationSdb,
  resolveSdbVatRate,
  sdbDqeLots,
  type SdbAdminPriceRow,
  type SdbScenario,
} from "@/lib/renovationSdbPricing";

/** Estimation enregistrée, telle que lue dans le document projet. */
export interface LoadingCostEstimateLike {
  totalCost?: number | null;
  contingencyPercentage?: number | null;
  breakdown?: readonly LoadingCostCategoryLike[] | null;
  budgetScenarios?: {
    economique?: { totalCost?: number | null; costPerM2?: number | null } | null;
    standard?: { totalCost?: number | null; costPerM2?: number | null } | null;
    premium?: { totalCost?: number | null; costPerM2?: number | null } | null;
  } | null;
}

export interface LoadingCostCategoryLike {
  category?: string | null;
  label?: string | null;
  estimatedCost?: number | null;
  percentage?: number | null;
  items?: readonly {
    name?: string | null;
    quantity?: number | null;
    unitPrice?: number | null;
    totalPrice?: number | null;
  }[] | null;
}

/** Document projet minimal (lecture seule, aucune donnée inventée). */
export interface LoadingProjectLike {
  name?: string | null;
  category?: string | null;
  region?: string | null;
  surface?: number | null;
  floors?: number | null;
  levelSurfaces?: number[] | null;
  selectedScenario?: string | null;
  costEstimate?: LoadingCostEstimateLike | null;
  dqe?: { lots?: readonly any[] | null } | null;
}

export interface LoadingCustomizationLike {
  baseScenario?: string | null;
  modifications?: readonly QuantitatifCustomizationEntry[] | null;
  removedPostes?: readonly QuantitatifPosteRemovalEntry[] | null;
}

/** Ligne de la répartition des coûts (montant réel + part). */
export interface LoadingCostRow {
  label: string;
  category?: string;
  amount: number;
  percentage: number;
  color?: string;
  icon?: string;
}

/** Opération de calcul réellement effectuée (ou non) pour ce projet. */
export interface LoadingCalculationStep {
  key: "quantities" | "prices" | "categories" | "total";
  label: string;
  done: boolean;
}

export interface EstimateLoadingSummary {
  /** Nom du projet (identique aux résultats). */
  projectName: string | null;
  /** Type de projet lisible (ex. « Villa »). */
  projectType: string | null;
  /** Région lisible (ex. « Tunis »). */
  region: string | null;
  /** Surface réellement construite (somme des niveaux). */
  builtSurface: number | null;
  /** Nombre de niveaux (1 = RDC). */
  floors: number | null;
  /** Scénario affiché (Économique / Standard / Premium / Personnalisé). */
  scenario: string | null;
  /** Budget total du scénario affiché — `null` tant qu'il n'est pas disponible. */
  total: number | null;
  /** Coût réel au m² — `null` tant qu'il n'est pas disponible. */
  costPerM2: number | null;
  /** Répartition réelle par catégorie (vide tant que rien n'est calculé). */
  breakdown: LoadingCostRow[];
  /** Progression réelle du calcul (4 opérations). */
  steps: LoadingCalculationStep[];
  /** `true` lorsque toutes les opérations et tous les montants sont disponibles. */
  ready: boolean;
}

export interface EstimateLoadingSummaryInput {
  /** Document projet déjà chargé (liste des projets) — `null` si inconnu. */
  project?: LoadingProjectLike | null;
  customization?: LoadingCustomizationLike | null;
  complementaryWorks?: readonly CustomWorkEstimate[] | null;
  /** `false` tant que les personnalisations ne sont pas arrivées. */
  customizationReady?: boolean;
  /** `false` tant que les travaux complémentaires ne sont pas arrivés. */
  complementaryWorksReady?: boolean;
  /** Prix administrés (rénovation salle de bain uniquement). */
  adminPrices?: readonly SdbAdminPriceRow[] | null;
  /** Taux de TVA réglé par l'administrateur. */
  sdbVatRate?: number | null;
}

const SCENARIO_KEYS: BudgetScenarioKey[] = ["economique", "standard", "premium"];

const CALCULATION_LABELS: Record<LoadingCalculationStep["key"], string> = {
  quantities: "Quantités des travaux",
  prices: "Prix des matériaux",
  categories: "Coûts par catégorie",
  total: "Total TTC",
};

const STEP_ORDER: LoadingCalculationStep["key"][] = [
  "quantities",
  "prices",
  "categories",
  "total",
];

const num = (n: unknown): number => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

const isScenarioKey = (value: unknown): value is BudgetScenarioKey =>
  typeof value === "string" && (SCENARIO_KEYS as string[]).includes(value);

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Libellé du scénario affiché, comme sur la page des résultats. */
export function loadingScenarioLabel(
  key: string | null | undefined,
): string | null {
  if (key === PERSONALIZED_SCENARIO_KEY) return PERSONALIZED_SCENARIO_LABEL;
  if (isScenarioKey(key)) return BUDGET_SCENARIO_LABELS[key];
  return null;
}

/**
 * Résumé réel du chargement. Les champs sont renseignés dès que la donnée
 * correspondante existe réellement ; sinon ils restent `null`/vides pour que
 * l'interface affiche un indicateur discret à la même place.
 */
export function buildEstimateLoadingSummary(
  input: EstimateLoadingSummaryInput,
): EstimateLoadingSummary {
  const project = input.project ?? null;
  const storedCe = project?.costEstimate ?? null;
  const factor = legacyContingencyFactor(storedCe);
  const real = (n: unknown) => Math.round(num(n) * factor);

  const surface = num(project?.surface);
  const floors = Math.max(1, Math.floor(num(project?.floors) || 1));
  const builtSurface = surface > 0 ? realBuiltArea(surface, floors, project?.levelSurfaces) : 0;

  // ── Scénario affiché (même règle que la page des résultats) ─────────────
  const storedScenarioKey = project?.selectedScenario ?? null;
  const rawLots = (project?.dqe?.lots ?? []) as any[];
  const modifications = [...(input.customization?.modifications ?? [])];
  const removedPostes = [...(input.customization?.removedPostes ?? [])];
  const complementaryWorks = [...(input.complementaryWorks ?? [])];
  const customizationReady = input.customizationReady !== false;
  const worksReady = input.complementaryWorksReady !== false;

  const baseScenarioKey: BudgetScenarioKey = isScenarioKey(
    input.customization?.baseScenario,
  )
    ? (input.customization!.baseScenario as BudgetScenarioKey)
    : isScenarioKey(storedScenarioKey)
      ? storedScenarioKey
      : "standard";

  const hasPersonalizedInputs =
    modifications.length > 0 || removedPostes.length > 0 || complementaryWorks.length > 0;
  const isPersonalized =
    storedScenarioKey === PERSONALIZED_SCENARIO_KEY && hasPersonalizedInputs;
  // Même règle que la page finale : « Personnalisé » affiche son scénario de
  // référence ; un scénario enregistré valide est conservé ; sinon Standard.
  const effectiveScenario: BudgetScenarioKey =
    storedScenarioKey === PERSONALIZED_SCENARIO_KEY
      ? baseScenarioKey
      : isScenarioKey(storedScenarioKey)
        ? storedScenarioKey
        : "standard";

  // Personnalisé demandé mais données de personnalisation encore en cours :
  // aucun montant ne peut être annoncé sans risquer d'être faux.
  const personalizedPending =
    storedScenarioKey === PERSONALIZED_SCENARIO_KEY &&
    (!customizationReady || !worksReady);

  // ── Estimation : scénarios corrigés des anciennes majorations d'imprévus ─
  const correctedScenarios = storedCe?.budgetScenarios
    ? {
        economique: {
          totalCost: real(storedCe.budgetScenarios.economique?.totalCost),
          costPerM2: real(storedCe.budgetScenarios.economique?.costPerM2 ?? 0),
        },
        standard: {
          totalCost: real(storedCe.budgetScenarios.standard?.totalCost),
          costPerM2: real(storedCe.budgetScenarios.standard?.costPerM2 ?? 0),
        },
        premium: {
          totalCost: real(storedCe.budgetScenarios.premium?.totalCost),
          costPerM2: real(storedCe.budgetScenarios.premium?.costPerM2 ?? 0),
        },
      }
    : null;

  const budget = resolveEstimationBudget({
    costEstimate: storedCe,
    dqeLots: rawLots,
    builtSurface,
    selectedScenario: storedScenarioKey,
    baseScenario: baseScenarioKey,
    modifications,
    removedPostes,
    complementaryWorks,
  });

  const sdbVatRate = resolveSdbVatRate(input.sdbVatRate ?? undefined);
  const sdbLots = isRenovationSdb(project?.category) && builtSurface > 0
    ? sdbDqeLots(
        buildSdbEstimate({
          surface: builtSurface,
          scenario: effectiveScenario as SdbScenario,
          regionFactor: regionCostFactor(
            REGION_COST_M2,
            project?.region,
            effectiveScenario,
          ),
          vatRate: sdbVatRate,
          resolvePrice: buildSdbPriceResolver(input.adminPrices, sdbVatRate),
        }),
      )
    : null;

  const standardTotal = correctedScenarios?.standard.totalCost ?? 0;
  const effectiveTotal = correctedScenarios
    ? correctedScenarios[effectiveScenario].totalCost
    : 0;
  const scaleFactor =
    standardTotal > 0 && effectiveScenario !== "standard"
      ? effectiveTotal / standardTotal
      : 1;

  const scaledBreakdown = (storedCe?.breakdown ?? []).map((cat) => {
    const corrected = {
      ...cat,
      items: correctEnduitLissageBimItems(cat.items as any, builtSurface),
    };
    if (scaleFactor === 1) return corrected;
    return {
      ...corrected,
      estimatedCost: Math.round(num(cat.estimatedCost) * scaleFactor),
      items: (corrected.items as any[])?.map((item: any) => {
        const totalPrice = Math.round(num(item.totalPrice) * scaleFactor);
        if (!isEnduitLissageName(item.name)) return { ...item, totalPrice };
        return {
          ...item,
          unitPrice: Math.round((totalPrice / (num(item.quantity) || 1)) * 100) / 100,
          totalPrice,
        };
      }),
    };
  });

  // ── Quantitatif réellement affiché (lots) ───────────────────────────────
  const quantitatifLots: any[] =
    isPersonalized && budget.personalized
      ? budget.personalized.lots
      : sdbLots
        ? sdbLots
        : rawLots.length
          ? scaleDqeLots(rawLots, scaleFactor * factor)
          : [];

  // ── Montants affichés, au dinar près (mêmes branches que la page) ───────
  const sdbTotal = sdbLots
    ? sdbLots.reduce((s: number, lot: any) => s + num(lot?.subtotal), 0)
    : null;

  const rawTotal =
    isPersonalized && budget.personalized
      ? budget.personalized.totals.total
      : sdbTotal != null
        ? sdbTotal
        : correctedScenarios
          ? correctedScenarios[effectiveScenario].totalCost
          : 0;

  const rawCostPerM2 =
    isPersonalized && budget.personalized
      ? budget.personalized.totals.costPerM2
      : sdbTotal != null
        ? builtSurface > 0
          ? Math.round(sdbTotal / builtSurface)
          : 0
        : correctedScenarios
          ? correctedScenarios[effectiveScenario].costPerM2
          : 0;

  const total = personalizedPending || rawTotal <= 0 ? null : rawTotal;
  const costPerM2 =
    personalizedPending || rawCostPerM2 <= 0 ? null : Math.round(rawCostPerM2);

  // ── Répartition : mêmes parts que « Répartition » / « Détail par catégorie »
  const chartBreakdown: ChartBreakdownEntry[] = quantitatifLots.length
    ? buildChartBreakdownFromLots(quantitatifLots)
    : isPersonalized && budget.personalized
      ? buildChartBreakdown(scaledBreakdown as any, complementaryWorks)
      : (scaledBreakdown as any);

  const breakdown: LoadingCostRow[] = personalizedPending
    ? []
    : chartBreakdown
        .filter((row) => num(row.estimatedCost) > 0)
        .map((row) => ({
          label: row.label,
          ...(row.category ? { category: row.category } : {}),
          amount: num(row.estimatedCost),
          percentage: round1(num(row.percentage)),
          ...(row.color ? { color: row.color } : {}),
          ...(row.icon ? { icon: row.icon } : {}),
        }));

  // ── Progression réelle : chaque opération est constatée sur les données ──
  const hasQuantities =
    quantitatifLots.some((lot) => (lot?.lines?.length ?? 0) > 0) ||
    (storedCe?.breakdown ?? []).some((cat) => (cat.items?.length ?? 0) > 0);
  const hasPrices =
    quantitatifLots.some((lot) =>
      (lot?.lines ?? []).some(
        (line: any) => num(line?.unitPrice) > 0 || num(line?.total) > 0,
      ),
    ) ||
    (storedCe?.breakdown ?? []).some((cat) =>
      (cat.items ?? []).some(
        (item) => num(item?.unitPrice) > 0 || num(item?.totalPrice) > 0,
      ),
    );
  const hasCategories = breakdown.length > 0;
  const hasTotal = total != null;

  const availability: Record<LoadingCalculationStep["key"], boolean> = {
    quantities: !personalizedPending && hasQuantities,
    prices: !personalizedPending && hasPrices,
    categories: hasCategories,
    total: hasTotal,
  };

  const steps: LoadingCalculationStep[] = STEP_ORDER.map((key) => ({
    key,
    label: CALCULATION_LABELS[key],
    done: availability[key],
  }));

  const category = normalizeLegacyCategory(project?.category as string);
  const projectType =
    project?.category != null && String(project.category).trim() !== ""
      ? projectTypeLabel(category)
      : null;
  const region =
    project?.region != null && String(project.region).trim() !== ""
      ? labelRegion(project.region)
      : null;
  const scenario = personalizedPending
    ? PERSONALIZED_SCENARIO_LABEL
    : loadingScenarioLabel(budget.selectedKey) ??
      loadingScenarioLabel(storedScenarioKey) ??
      BUDGET_SCENARIO_LABELS[effectiveScenario];

  return {
    projectName: project?.name?.trim() ? project.name.trim() : null,
    projectType,
    region,
    builtSurface: builtSurface > 0 ? builtSurface : null,
    floors: project?.floors != null ? floors : surface > 0 ? 1 : null,
    scenario,
    total,
    costPerM2,
    breakdown,
    steps,
    ready: steps.every((step) => step.done),
  };
}
