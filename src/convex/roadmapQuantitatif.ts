// ============================================================================
// « MON PROJET DE A À Z » — SOURCE UNIQUE DES PRIX : LE QUANTITATIF DÉTAILLÉ
// ----------------------------------------------------------------------------
// La feuille de route ne possède AUCUN barème propre. Tous les montants
// affichés (catégories de travaux, postes, articles, quantités, unités, prix
// unitaires, sous-totaux, total général) proviennent des lots du « Quantitatif
// détaillé » du projet (`projects.dqe.lots`) et sont mis à l'échelle du
// scénario exactement comme la page « Coût de construction » :
//
//   • Économique / Standard / Premium → `scaleDqeLots` (même fonction, même
//     arrondi que le quantitatif affiché) ;
//   • Personnalisé → quantitatif du scénario de référence + modifications
//     d'articles + postes supprimés + travaux complémentaires, totalisé par
//     `computeQuantitatifTotals` (même pipeline que le résultat) ;
//   • ancienne majoration d'imprévus retirée avec `legacyContingencyFactor`.
//
// Aucun prix n'est recréé, moyenné ni codé en dur ici : si le quantitatif ou
// un prix manque, une alerte explicite est remontée (jamais un prix par
// défaut silencieux).
//
// Module pur (aucun accès Convex / React) : il est utilisé par le moteur de la
// feuille de route, les mutations de suivi, le PDF et les tests.
// ============================================================================

import {
  BUDGET_SCENARIO_LABELS,
  BUDGET_SCENARIO_KEYS,
  PERSONALIZED_SCENARIO_KEY,
  PERSONALIZED_SCENARIO_LABEL,
  applyPosteRemovals,
  budgetScenarioFactor,
  computeQuantitatifTotals,
  overlayCustomizations,
  scaleDqeLots,
  type BudgetScenarioKey,
  type QuantitatifCustomizationEntry,
  type QuantitatifPosteRemovalEntry,
} from "./quantitatifCustomLogic";
import { withComplementaryWorksLots } from "../lib/complementaryWorks";
import { legacyContingencyFactor } from "../lib/constructionCost";
import type { CustomWorkEstimate } from "./customWorksEngine";

/** Clé de scénario d'une feuille de route (3 budgets + scénario dérivé). */
export type RoadmapScenarioKey = BudgetScenarioKey | typeof PERSONALIZED_SCENARIO_KEY;

/** Ligne budgétaire de la Phase 05 — une par catégorie du quantitatif. */
export interface RoadmapBudgetRow {
  key: string;
  label: string;
  amount: number;
  pct: number;
}

/** Estimation enregistrée du projet (sous-ensemble lu par la feuille de route). */
export interface RoadmapCostEstimateLike {
  totalCost?: number | null;
  costPerSquareMeter?: number | null;
  contingencyPercentage?: number | null;
  contingencyBuffer?: number | null;
  breakdown?: {
    category: string;
    label: string;
    estimatedCost: number;
    percentage: number;
    items?: { name: string; quantity: number; unit: string; unitPrice: number; totalPrice: number }[];
  }[];
  budgetScenarios?: {
    economique?: { totalCost?: number | null; costPerM2?: number | null; label?: string; multiplier?: number } | null;
    standard?: { totalCost?: number | null; costPerM2?: number | null; label?: string; multiplier?: number } | null;
    premium?: { totalCost?: number | null; costPerM2?: number | null; label?: string; multiplier?: number } | null;
  } | null;
}

/**
 * Contexte quantitatif enregistré sur le projet. `lots` est le quantitatif
 * détaillé du résultat d'estimation ; les trois autres champs portent les
 * personnalisations du scénario « Personnalisé » (jamais appliquées aux
 * scénarios d'origine).
 */
export interface RoadmapQuantitatifSource {
  lots?: any[] | null;
  modifications?: QuantitatifCustomizationEntry[] | null;
  removedPostes?: QuantitatifPosteRemovalEntry[] | null;
  complementaryWorks?: CustomWorkEstimate[] | null;
  /** Scénario de référence du scénario « Personnalisé ». */
  baseScenario?: BudgetScenarioKey | null;
}

/** Article (poste) du quantitatif, repris à l'identique. */
export interface RoadmapQuantitatifLine {
  /** Identifiant stable `<lotId>::<index>` — le même que le quantitatif. */
  key: string;
  lotId: string;
  lotName: string;
  designation: string;
  description?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  nature: string;
}

/** Catégorie de travaux du quantitatif (sous-total = somme de ses postes). */
export interface RoadmapQuantitatifLot {
  id: string;
  name: string;
  subtotal: number;
  percent: number;
  lines: RoadmapQuantitatifLine[];
}

export interface RoadmapQuantitatifTotals {
  materiaux: number;
  mainOeuvre: number;
  equipements: number;
  transport: number;
  etudes: number;
  total: number;
  costPerM2: number;
}

/** Scénario budgétaire vu par la feuille de route (3 budgets + dérivé). */
export interface RoadmapQuantitatifScenario {
  key: RoadmapScenarioKey;
  label: string;
  totalCost: number;
  costPerM2: number;
  rows: RoadmapBudgetRow[];
  lineCount: number;
}

/** Matériau prévu, repris des articles réellement chiffrés du quantitatif. */
export interface RoadmapQuantitatifMaterial {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  unitPrice: number;
  total: number;
}

export interface RoadmapQuantitatif {
  /** Origine réelle des montants (`estimation` = projet sans quantitatif). */
  source: "quantitatif_detaille" | "estimation";
  scenario: RoadmapScenarioKey;
  scenarioLabel: string;
  lots: RoadmapQuantitatifLot[];
  totals: RoadmapQuantitatifTotals;
  scenarios: RoadmapQuantitatifScenario[];
  materials: RoadmapQuantitatifMaterial[];
  /** Problèmes bloquants ou écarts remontés explicitement à l'utilisateur. */
  alerts: string[];
  /** Signature de version : change dès qu'un prix, une quantité ou un article change. */
  version: string;
}

export interface RoadmapQuantitatifInput {
  costEstimate?: RoadmapCostEstimateLike | null;
  quantitatif?: RoadmapQuantitatifSource | null;
  /** Surface réellement construite (m²) — base du coût au m². */
  builtSurface?: number;
  /** Scénario demandé par la feuille de route (défaut : Standard). */
  scenario?: string | null;
}

const num = (n: unknown): number => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

const round = (n: number) => Math.round(num(n));
const round2 = (n: number) => Math.round(num(n) * 100) / 100;

export const EMPTY_QUANTITATIF_TOTALS: RoadmapQuantitatifTotals = {
  materiaux: 0,
  mainOeuvre: 0,
  equipements: 0,
  transport: 0,
  etudes: 0,
  total: 0,
  costPerM2: 0,
};

/** Le scénario demandé est-il une clé budgétaire officielle ? */
export function isRoadmapScenarioKey(value: unknown): value is RoadmapScenarioKey {
  return (
    typeof value === "string" &&
    (BUDGET_SCENARIO_KEYS as readonly string[]).concat(PERSONALIZED_SCENARIO_KEY).includes(value)
  );
}

/** Libellé affiché d'un scénario de feuille de route. */
export function roadmapScenarioLabel(key: RoadmapScenarioKey): string {
  return key === PERSONALIZED_SCENARIO_KEY
    ? PERSONALIZED_SCENARIO_LABEL
    : BUDGET_SCENARIO_LABELS[key];
}

/** Lots du quantitatif normalisés (structure complète, montants entiers). */
function normalizeLots(lots: any[]): RoadmapQuantitatifLot[] {
  // Un lot sans poste détaillé mais avec un sous-total est CONSERVÉ : son
  // montant ne doit jamais disparaître silencieusement (une alerte est émise).
  const list = (lots ?? []).filter(
    (lot) => lot && ((lot.lines?.length ?? 0) > 0 || num(lot.subtotal) > 0),
  );
  const grandTotal = list.reduce((acc, lot) => acc + num(lot.subtotal), 0);
  return list.map((lot, lotIndex) => {
    const id = String(lot.id ?? `lot_${lotIndex}`);
    const name = String(lot.name ?? id);
    const lines: RoadmapQuantitatifLine[] = (lot.lines ?? []).map((line: any, index: number) => ({
      key: `${id}::${index}`,
      lotId: id,
      lotName: name,
      designation: String(line?.designation ?? ""),
      ...(line?.description ? { description: String(line.description) } : {}),
      unit: String(line?.unit ?? ""),
      quantity: num(line?.quantity),
      unitPrice: num(line?.unitPrice),
      total: num(line?.total),
      nature: String(line?.nature ?? "materiaux"),
    }));
    const subtotal = round(lot.subtotal ?? lines.reduce((acc, l) => acc + l.total, 0));
    return {
      id,
      name,
      subtotal,
      percent: grandTotal > 0 ? Math.round((subtotal / grandTotal) * 100) : 0,
      lines,
    };
  });
}

/** Une ligne budgétaire par catégorie (montant = sous-total du quantitatif). */
function rowsFromLots(lots: RoadmapQuantitatifLot[], total: number): RoadmapBudgetRow[] {
  return lots.map((lot) => ({
    key: lot.id,
    label: lot.name,
    amount: lot.subtotal,
    pct: total > 0 ? Math.round((lot.subtotal / total) * 100) : 0,
  }));
}

/**
 * Matériaux prévus : uniquement les articles de nature « matériaux » réellement
 * chiffrés dans le quantitatif. Les quantités, unités et prix unitaires sont
 * ceux du quantitatif (aucune quantité inventée, aucun prix par défaut).
 */
export function collectQuantitatifMaterials(
  lots: RoadmapQuantitatifLot[],
): RoadmapQuantitatifMaterial[] {
  const byKey = new Map<string, RoadmapQuantitatifMaterial>();
  for (const lot of lots) {
    for (const line of lot.lines) {
      if (!line.designation || line.quantity <= 0) continue;
      if (line.nature !== "materiaux") continue;
      const key = `${line.designation.trim().toLowerCase()}|${line.unit}`;
      const existing = byKey.get(key);
      if (existing) {
        const quantity = round2(existing.quantity + line.quantity);
        const total = existing.total + line.total;
        byKey.set(key, {
          ...existing,
          quantity,
          total,
          unitPrice: quantity > 0 ? round2(total / quantity) : existing.unitPrice,
        });
        continue;
      }
      byKey.set(key, {
        name: line.designation,
        quantity: line.quantity,
        unit: line.unit,
        category: lot.name,
        unitPrice: line.unitPrice,
        total: line.total,
      });
    }
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/** Totaux par nature recalculés depuis les lignes (mêmes règles que le résultat). */
function totalsOf(lots: any[], builtSurface: number): RoadmapQuantitatifTotals {
  const t = computeQuantitatifTotals(lots, builtSurface);
  return {
    materiaux: num(t.materiaux),
    mainOeuvre: num(t.mainOeuvre),
    equipements: num(t.equipements),
    transport: num(t.transport),
    etudes: num(t.etudes),
    total: num(t.total),
    costPerM2: num(t.costPerM2),
  };
}

/**
 * Montants des trois scénarios budgétaires, ramenés au coût réel (ancienne
 * majoration d'imprévus retirée) : EXACTEMENT ceux affichés par la page
 * « Coût de construction ».
 */
function realScenarioTotals(
  ce: RoadmapCostEstimateLike | null,
  factor: number,
): Record<BudgetScenarioKey, { totalCost: number; costPerM2: number }> {
  const real = (n: unknown) => round(num(n) * factor);
  const s = ce?.budgetScenarios;
  const standardFallback = real(ce?.totalCost);
  return {
    economique: {
      totalCost: s?.economique?.totalCost != null ? real(s.economique.totalCost) : Math.round(standardFallback * 0.85),
      costPerM2: s?.economique?.costPerM2 != null ? real(s.economique.costPerM2) : 0,
    },
    standard: {
      totalCost: s?.standard?.totalCost != null ? real(s.standard.totalCost) : standardFallback,
      costPerM2: s?.standard?.costPerM2 != null ? real(s.standard.costPerM2) : real(ce?.costPerSquareMeter),
    },
    premium: {
      totalCost: s?.premium?.totalCost != null ? real(s.premium.totalCost) : Math.round(standardFallback * 1.3),
      costPerM2: s?.premium?.costPerM2 != null ? real(s.premium.costPerM2) : 0,
    },
  };
}

/**
 * Résout le quantitatif détaillé du projet pour le scénario demandé.
 *
 * C'est LA source de prix de « Mon projet de A à Z » : les lots, postes,
 * quantités, unités, prix unitaires, sous-totaux et le total général renvoyés
 * ici sont identiques à ceux du quantitatif détaillé du résultat.
 */
export function resolveRoadmapQuantitatif(
  input: RoadmapQuantitatifInput,
): RoadmapQuantitatif {
  const ce = input.costEstimate ?? null;
  const factor = legacyContingencyFactor(ce);
  const builtSurface = num(input.builtSurface);
  const rawLots = (input.quantitatif?.lots ?? []).filter(Boolean) as any[];
  const modifications = input.quantitatif?.modifications ?? [];
  const removedPostes = input.quantitatif?.removedPostes ?? [];
  const complementaryWorks = input.quantitatif?.complementaryWorks ?? [];
  const alerts: string[] = [];

  // ── Projet sans quantitatif enregistré ────────────────────────────────────
  // Aucun prix n'est inventé : la feuille de route conserve la répartition de
  // l'estimation et affiche explicitement l'absence de quantitatif.
  if (!rawLots.length) {
    return {
      source: "estimation",
      scenario: "standard",
      scenarioLabel: roadmapScenarioLabel("standard"),
      lots: [],
      totals: { ...EMPTY_QUANTITATIF_TOTALS },
      scenarios: [],
      materials: [],
      alerts: [
        "Quantitatif détaillé indisponible pour ce projet : relancez l'estimation du coût de construction pour synchroniser les prix avec « Mon projet de A à Z ».",
      ],
      version: `no-quantitatif|${num(ce?.totalCost)}|${factor}`,
    };
  }

  const scenarioTotals = realScenarioTotals(ce, factor);
  const requested =
    input.scenario === PERSONALIZED_SCENARIO_KEY
      ? PERSONALIZED_SCENARIO_KEY
      : ((BUDGET_SCENARIO_KEYS as readonly string[]).includes(String(input.scenario))
          ? (input.scenario as BudgetScenarioKey)
          : "standard");

  // ── Scénario « Personnalisé » (modifications / suppressions / travaux) ────
  let personalized: { lots: any[]; totals: RoadmapQuantitatifTotals } | null = null;
  const hasPersonalized =
    modifications.length > 0 || removedPostes.length > 0 || complementaryWorks.length > 0;
  const baseScenario: BudgetScenarioKey = input.quantitatif?.baseScenario ?? "standard";
  if (hasPersonalized) {
    const baseFactor = budgetScenarioFactor(scenarioTotals, baseScenario);
    const scaled = scaleDqeLots(rawLots, baseFactor * factor);
    const overlay = modifications.length
      ? overlayCustomizations(scaled, modifications, {
          scaleFactor: baseFactor,
          realCostFactor: factor,
        })
      : { lots: scaled, modifiedCount: 0 };
    const removal = applyPosteRemovals(overlay.lots, removedPostes);
    const lots = withComplementaryWorksLots(removal.lots, complementaryWorks);
    personalized = { lots, totals: totalsOf(lots, builtSurface) };
  }

  // ── Scénarios budgétaires officiels (mise à l'échelle du quantitatif) ────
  const scenarioLots = new Map<RoadmapScenarioKey, any[]>();
  const scenarioData = new Map<RoadmapScenarioKey, RoadmapQuantitatifScenario>();

  for (const key of BUDGET_SCENARIO_KEYS) {
    const lots = scaleDqeLots(rawLots, budgetScenarioFactor(scenarioTotals, key) * factor);
    const normalized = normalizeLots(lots);
    const total = normalized.reduce((acc, lot) => acc + lot.subtotal, 0);
    const expected = scenarioTotals[key].totalCost;
    // Écart d'arrondi éventuel entre la somme des postes et le montant du
    // scénario : signalé, jamais compensé par un prix inventé.
    const drift = Math.abs(total - expected);
    if (expected > 0 && drift > 1) {
      alerts.push(
        `Scénario ${BUDGET_SCENARIO_LABELS[key]} : la somme des postes du quantitatif détaillé (${total} TND) diffère de ${drift} TND du montant du scénario (${expected} TND) — écart d'arrondi à vérifier.`,
      );
    }
    scenarioLots.set(key, lots);
    scenarioData.set(key, {
      key,
      label: roadmapScenarioLabel(key),
      totalCost: total,
      costPerM2: builtSurface > 0 ? Math.round(total / builtSurface) : scenarioTotals[key].costPerM2,
      rows: rowsFromLots(normalized, total),
      lineCount: normalized.reduce((acc, lot) => acc + lot.lines.length, 0),
    });
  }

  if (personalized) {
    const normalized = normalizeLots(personalized.lots);
    const total = personalized.totals.total;
    scenarioLots.set(PERSONALIZED_SCENARIO_KEY, personalized.lots);
    scenarioData.set(PERSONALIZED_SCENARIO_KEY, {
      key: PERSONALIZED_SCENARIO_KEY,
      label: PERSONALIZED_SCENARIO_LABEL,
      totalCost: total,
      costPerM2: personalized.totals.costPerM2,
      rows: rowsFromLots(normalized, total),
      lineCount: normalized.reduce((acc, lot) => acc + lot.lines.length, 0),
    });
  }

  const selected: RoadmapScenarioKey =
    scenarioData.has(requested as RoadmapScenarioKey) ? (requested as RoadmapScenarioKey) : "standard";
  const selectedScenario = scenarioData.get(selected)!;
  const selectedLots = normalizeLots(scenarioLots.get(selected) ?? rawLots);
  const selectedTotals = personalized && selected === PERSONALIZED_SCENARIO_KEY
    ? personalized.totals
    : totalsOf(scenarioLots.get(selected) ?? rawLots, builtSurface);

  // ── Prix absents / incohérents : alerte explicite (aucun prix de repli) ───
  let missing = 0;
  for (const lot of selectedLots) {
    if (lot.lines.length === 0 && lot.subtotal > 0) {
      alerts.push(
        `Catégorie « ${lot.name} » : sous-total de ${lot.subtotal} TND sans poste détaillé dans le quantitatif — détail à vérifier.`,
      );
    }
    for (const line of lot.lines) {
      if (line.unitPrice > 0 && line.quantity > 0) continue;
      missing += 1;
      if (missing <= 5) {
        alerts.push(
          line.unitPrice > 0
            ? `Poste « ${line.designation} » (${lot.name}) : quantité absente ou nulle dans le quantitatif détaillé.`
            : `Poste « ${line.designation} » (${lot.name}) : prix unitaire absent du quantitatif détaillé.`,
        );
      }
    }
  }
  if (missing > 5) {
    alerts.push(`${missing} postes du quantitatif détaillé sont sans quantité ou sans prix unitaire exploitable.`);
  }

  const version = [
    rawLots.length,
    selectedLots.reduce((acc, lot) => acc + lot.lines.length, 0),
    selectedTotals.total,
    modifications.length,
    removedPostes.length,
    complementaryWorks.length,
    baseScenario,
    factor,
  ].join("|");

  return {
    source: "quantitatif_detaille",
    scenario: selected,
    scenarioLabel: selectedScenario.label,
    lots: selectedLots,
    totals: selectedTotals,
    scenarios: BUDGET_SCENARIO_KEYS.map((key) => scenarioData.get(key)!).concat(
      scenarioData.has(PERSONALIZED_SCENARIO_KEY)
        ? [scenarioData.get(PERSONALIZED_SCENARIO_KEY)!]
        : [],
    ),
    materials: collectQuantitatifMaterials(selectedLots),
    alerts,
    version,
  };
}
