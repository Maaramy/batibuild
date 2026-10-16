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
} from "@/convex/quantitatifCustomLogic";
import {
  electricityAmount,
  electricityPriceM2,
  resolveElectricityPrices,
  type ElectricityPrices,
} from "@/lib/electricityPricing";

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
  /** Poste « Électricité » du devis (barème 2026), ou `null`. */
  electricity: PdfElectricitySummary | null;
}

/**
 * Poste « Électricité » tel qu'il doit figurer dans le devis PDF : le barème
 * appliqué (niveau de qualité, prix au m²) et le montant RÉELLEMENT facturé
 * dans le quantitatif imprimé. Le montant est toujours celui des lignes
 * électriques du devis — jamais un second calcul qui contredirait le tableau.
 */
export interface PdfElectricitySummary {
  /** Niveau de qualité du barème (`Économique`, `Standard`, `Premium`). */
  scenarioLabel: string;
  /** Prix au m² du barème appliqué (TND TTC). */
  priceM2: number;
  /** Le montant correspond-il exactement au barème × surface (projet) ? */
  matchesBareme: boolean;
  /** Surface de référence du poste (m² construits). */
  surface: number;
  /** Coefficient régional appliqué au barème (base Médenine = 1). */
  regionFactor: number;
  /** Montant du poste facturé dans le devis (TND). */
  amount: number;
  /** Provision d'électricité déjà comprise dans le coût de marché, retirée (TND). */
  provision: number;
}

/** Préfixe des lignes du poste électrique dans le Quantitatif détaillé. */
const ELECTRICITY_LINE_PREFIX = "Électricité — ";

/** Montant du poste électrique tel qu'il figure dans les lots du devis. */
function electricityAmountFromLots(lots: any[] | undefined): number | null {
  let amount = 0;
  let found = false;
  for (const lot of lots ?? []) {
    for (const line of lot?.lines ?? []) {
      const designation = String(line?.designation ?? line?.name ?? "");
      if (line?.sousLot === "Électricité" || designation.startsWith(ELECTRICITY_LINE_PREFIX)) {
        amount += Math.round(Number(line?.total) || 0);
        found = true;
      }
    }
  }
  return found ? amount : null;
}

/**
 * Résout le poste « Électricité » du devis PDF. Le niveau de qualité est celui
 * du scénario exporté quand c'est un scénario budgétaire (le barème du niveau
 * s'applique alors), sinon celui du projet. Le montant provient des lignes
 * électriques du quantitatif imprimé, pour ne jamais afficher deux montants
 * contradictoires dans le même devis.
 *
 * Fonction pure : ne modifie ni `ce`, ni les lots transmis.
 */
export function resolvePdfElectricity(input: {
  scenario: string;
  ce: any;
  dqeLots?: any[];
}): PdfElectricitySummary | null {
  const stored = input.ce?.electricity;
  if (!stored) return null;

  const prices: ElectricityPrices = resolveElectricityPrices(stored.prices);
  const storedScenario = String(stored.scenario ?? "standard");
  const scenario =
    input.scenario === "economique" || input.scenario === "premium"
      ? input.scenario
      : storedScenario;
  const priceM2 = electricityPriceM2(prices, scenario);
  const surface = Math.round(Number(stored.surface) || 0);
  const regionFactor =
    Number(stored.regionFactor) > 0 ? Number(stored.regionFactor) : 1;
  const baremeAmount = electricityAmount({
    surface,
    scenario,
    prices,
    regionFactor,
  });
  const fromLots = electricityAmountFromLots(input.dqeLots);
  const amount = fromLots ?? baremeAmount;

  const scenarioLabel =
    scenario === "economique" ? "Économique" : scenario === "premium" ? "Premium" : "Standard";

  return {
    scenarioLabel,
    priceM2,
    matchesBareme: fromLots === null || amount === baremeAmount,
    surface,
    regionFactor,
    amount,
    provision: Math.max(0, Math.round(Number(stored.provision) || 0)),
  };
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
  return (lots ?? []).map((lot: any) => ({
    ...lot,
    subtotal: Math.round((Number(lot?.subtotal) || 0) * factor),
    lines: (lot?.lines ?? []).map((line: any) => {
      const total = Math.round((Number(line?.total) || 0) * factor);
      return {
        ...line,
        total,
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
      // Le poste électrique suit les articles du scénario personnalisé : son
      // montant est celui des lignes électriques effectivement imprimées.
      electricity: resolvePdfElectricity({
        scenario,
        ce,
        dqeLots: copyPersonalizedLots(personalized.lots),
      }),
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
    electricity: resolvePdfElectricity({ scenario, ce, dqeLots }),
  };
}
