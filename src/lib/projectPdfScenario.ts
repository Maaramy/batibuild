// ============================================================================
// DEVIS PDF — RÉSOLUTION DU SCÉNARIO EXPORTÉ
// ----------------------------------------------------------------------------
// Logique pure (aucune dépendance jsPDF / React) extraite de `projectPdf.ts`
// pour être testable : elle décide quelles valeurs alimentent le devis PDF
// selon le scénario demandé.
//
// Deux familles de scénarios :
//   · Économique / Standard / Premium → quantitatif du moteur mis à l'échelle
//     du scénario (comportement historique, inchangé).
//   · « Personnalisé » → quantitatif du scénario de référence auquel sont
//     superposées les modifications d'articles de l'utilisateur. Le total du
//     devis est alors celui du scénario personnalisé.
//
// Si aucun scénario personnalisé n'existe, rien n'est ajouté au devis : le
// libellé « Personnalisé » n'apparaît jamais.
// ============================================================================

import {
  PERSONALIZED_SCENARIO_KEY,
  PERSONALIZED_SCENARIO_LABEL,
} from "../convex/quantitatifCustomLogic";
import { normalizeLaborLots } from "./laborLot";

/** Scénario « Personnalisé » préparé par la page projet (articles modifiés). */
export interface PersonalizedScenarioData {
  /** Lots du quantitatif déjà mis à l'échelle du scénario de référence + modifs. */
  lots: any[];
  totals: {
    materiaux: number;
    mainOeuvre: number;
    equipements: number;
    transport: number;
    etudes: number;
    total: number;
    costPerM2: number;
  };
  /** Nombre d'articles modifiés par l'utilisateur. */
  modifiedCount: number;
}

/** Valeurs prêtes à être dessinées dans le devis PDF. */
export interface PdfScenarioValues {
  /** Le devis représente-t-il le scénario « Personnalisé » ? */
  isPersonalized: boolean;
  /** Libellé du scénario (`Personnalisé`, `Standard`, …). */
  scenarioLabel: string;
  /** Coût total du devis (TTC). */
  totalCost: number;
  /** Coût au m² du devis. */
  costPerM2: number;
  /** Répartition par catégorie BIM (montants cohérents avec `totalCost`). */
  breakdown: any[];
  /** Lots du quantitatif détaillé, prêts à l'affichage. */
  dqeLots: any[];
  /** Ventilation par nature du quantitatif détaillé (ou `null`). */
  dqeTotals: {
    materiaux: number;
    mainOeuvre: number;
    equipements: number;
    transport: number;
    etudes: number;
    total: number;
  } | null;
  /** Nombre d'articles modifiés (0 hors scénario personnalisé). */
  modifiedCount: number;
}

/**
 * Le scénario demandé est-il le scénario « Personnalisé » ? Il n'existe que
 * s'il porte au moins un article modifié (des lots exploitables).
 */
export function isPersonalizedPdfScenario(
  scenario: string,
  personalized?: PersonalizedScenarioData | null,
): boolean {
  return (
    scenario === PERSONALIZED_SCENARIO_KEY &&
    (personalized?.lots?.length ?? 0) > 0
  );
}

/** Libellé affiché du scénario exporté. */
export function pdfScenarioLabel(
  scenario: string,
  personalized?: PersonalizedScenarioData | null,
): string {
  if (isPersonalizedPdfScenario(scenario, personalized)) {
    return PERSONALIZED_SCENARIO_LABEL;
  }
  if (scenario === "economique") return "Économique";
  if (scenario === "premium") return "Premium";
  return "Standard";
}

/**
 * Répartition par catégorie BIM rendue cohérente avec le total du devis.
 * Le scénario personnalisé n'a pas de découpage BIM propre : la répartition est
 * mise à l'échelle du total personnalisé pour ne jamais afficher deux totaux
 * contradictoires dans le même devis.
 */
export function scaleBreakdownToTotal(
  breakdown: any[] | undefined,
  targetTotal: number,
  baseTotal: number,
): any[] {
  const list = breakdown ?? [];
  if (!list.length) return list;
  const ratio = baseTotal > 0 ? targetTotal / baseTotal : 1;
  if (ratio === 1) return list;
  return list.map((cat: any) => ({
    ...cat,
    estimatedCost: Math.round((Number(cat?.estimatedCost) || 0) * ratio),
    items: (cat?.items ?? []).map((item: any) => ({
      ...item,
      totalPrice: Math.round((Number(item?.totalPrice) || 0) * ratio),
    })),
  }));
}

/** Met une copie du quantitatif à l'échelle d'un scénario budgétaire. */
function scaleDqeLotsForPdf(lots: any[] | undefined, factor: number): any[] {
  const scaled = (lots ?? []).map((lot: any) => ({
    ...lot,
    subtotal: Math.round((Number(lot?.subtotal) || 0) * factor),
    lines: (lot?.lines ?? []).map((line: any) => {
      const total = Math.round((Number(line?.total) || 0) * factor);
      const labor = line?.labor
        ? {
            ...line.labor,
            total: Math.round((Number(line.labor.total) || 0) * factor),
            unitPrice:
              Math.round((Number(line.labor.unitPrice) || 0) * factor * 100) / 100,
          }
        : undefined;
      return {
        ...line,
        total,
        ...(labor ? { labor } : {}),
        // Prix unitaire dérivé du montant mis à l'échelle (identique au devis
        // des scénarios budgétaires d'origine).
        unitPrice:
          Math.round(
            ((Number(line?.total) || 0) * factor) /
              Math.max(1, Number(line?.quantity) || 1) *
              100,
          ) / 100,
      };
    }),
  }));
  // Main-d'œuvre en lots : « N lot(s) », montants des lignes inchangés.
  return normalizeLaborLots(scaled);
}

/** Copie profonde légère des lignes d'un lot personnalisé (jamais de mutation). */
function copyPersonalizedLots(lots: any[]): any[] {
  return lots.map((lot: any) => ({
    ...lot,
    lines: (lot?.lines ?? []).map((line: any) => ({ ...line })),
  }));
}

/**
 * Résout toutes les valeurs du devis PDF pour le scénario demandé.
 * Fonction pure : elle ne modifie ni `ce`, ni `scenarios`, ni `dqe`.
 */
export function resolvePdfScenarioValues(input: {
  scenario: string;
  scenarios?: any;
  ce: any;
  dqe?: any;
  dqeScaleFactor?: number;
  personalized?: PersonalizedScenarioData | null;
}): PdfScenarioValues {
  const { scenario, scenarios, ce, dqe } = input;
  const personalized = input.personalized ?? null;
  const usePersonalized = isPersonalizedPdfScenario(scenario, personalized);
  const scenarioLabel = pdfScenarioLabel(scenario, personalized);

  // ── Facteur du scénario budgétaire par rapport au niveau « Standard » ──
  const scenarioData = scenarios?.[scenario];
  const isStandardScenario = scenario === "standard";
  const sf =
    isStandardScenario || !scenarios?.standard
      ? 1
      : (scenarioData?.totalCost || 0) / (scenarios.standard.totalCost || 1);

  if (usePersonalized && personalized) {
    const totalCost = personalized.totals.total;
    return {
      isPersonalized: true,
      scenarioLabel,
      totalCost,
      costPerM2: personalized.totals.costPerM2,
      // La répartition BIM est alignée sur le total personnalisé.
      breakdown: scaleBreakdownToTotal(ce.breakdown, totalCost, ce.totalCost),
      // Les lots personnalisés sont déjà superposés et à l'échelle : aucune
      // remise à l'échelle supplémentaire (pas de double application).
      dqeLots: copyPersonalizedLots(personalized.lots),
      dqeTotals: {
        materiaux: personalized.totals.materiaux,
        mainOeuvre: personalized.totals.mainOeuvre,
        equipements: personalized.totals.equipements,
        transport: personalized.totals.transport,
        etudes: personalized.totals.etudes,
        total: personalized.totals.total,
      },
      modifiedCount: personalized.modifiedCount,
    };
  }

  // ── Scénarios budgétaires d'origine ──
  const totalCost = scenarioData?.totalCost || ce.totalCost;
  const breakdown =
    sf === 1
      ? ce.breakdown
      : (ce.breakdown ?? []).map((cat: any) => ({
          ...cat,
          estimatedCost: Math.round((Number(cat?.estimatedCost) || 0) * sf),
          items: (cat?.items ?? []).map((item: any) => ({
            ...item,
            totalPrice: Math.round((Number(item?.totalPrice) || 0) * sf),
          })),
        }));

  const dqeLots = scaleDqeLotsForPdf(dqe?.lots, input.dqeScaleFactor ?? 1);
  const dqeTotals = dqe?.totals
    ? {
        materiaux: Math.round(
          (Number(dqe.totals.materiaux) || 0) * (input.dqeScaleFactor ?? 1),
        ),
        mainOeuvre: Math.round(
          (Number(dqe.totals.mainOeuvre) || 0) * (input.dqeScaleFactor ?? 1),
        ),
        equipements: Math.round(
          (Number(dqe.totals.equipements) || 0) * (input.dqeScaleFactor ?? 1),
        ),
        transport: Math.round(
          (Number(dqe.totals.transport) || 0) * (input.dqeScaleFactor ?? 1),
        ),
        etudes: Math.round(
          (Number(dqe.totals.etudes) || 0) * (input.dqeScaleFactor ?? 1),
        ),
        total: Math.round(
          (Number(dqe.totals.total) || 0) * (input.dqeScaleFactor ?? 1),
        ),
      }
    : null;

  return {
    isPersonalized: false,
    scenarioLabel,
    totalCost,
    costPerM2: scenarioData?.costPerM2 || ce.costPerSquareMeter || 0,
    breakdown,
    dqeLots,
    dqeTotals,
    modifiedCount: 0,
  };
}
