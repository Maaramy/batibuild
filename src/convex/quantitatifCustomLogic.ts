// ============================================================================
// PERSONNALISATION DU « QUANTITATIF DÉTAILLÉ » — logique pure partagée
// ----------------------------------------------------------------------------
// Aucune dépendance Convex / React : ce module est utilisé aussi bien par les
// fonctions backend (queries & mutations de `quantitatifCustom.ts`) que par la
// page projet (affichage, superposition, recalculs).
//
// Principe : les scénarios Économique / Standard / Premium ne sont JAMAIS
// modifiés. Les modifications d'articles sont stockées à part puis superposées
// à la copie affichée du quantitatif, ce qui produit le scénario
// « Personnalisé » (scénario de référence + modifications utilisateur).
// ============================================================================

/** Scénarios budgétaires d'origine (jamais écrasés). */
export type BudgetScenarioKey = "economique" | "standard" | "premium";

export const BUDGET_SCENARIO_KEYS: BudgetScenarioKey[] = [
  "economique",
  "standard",
  "premium",
];

export const BUDGET_SCENARIO_LABELS: Record<BudgetScenarioKey, string> = {
  economique: "Économique",
  standard: "Standard",
  premium: "Premium",
};

/** Clé du scénario dérivé (affiché uniquement s'il existe des modifications). */
export const PERSONALIZED_SCENARIO_KEY = "personnalise";

export const PERSONALIZED_SCENARIO_LABEL = "Personnalisé";

/**
 * Catégories du « Quantitatif détaillé » ouvertes à la personnalisation.
 * Toute autre catégorie reste strictement non modifiable.
 */
export const EDITABLE_LOT_IDS = [
  "frais_preliminaires",
  "gros_oeuvre",
  "second_oeuvre",
  "amenagements_exterieurs",
] as const;

export const EDITABLE_LOT_LABELS: Record<string, string> = {
  frais_preliminaires: "Frais Préliminaires et Études",
  gros_oeuvre: "Gros œuvre (fondations, structures)",
  second_oeuvre: "Second œuvre et finitions",
  amenagements_exterieurs: "Aménagements extérieurs",
};

/** La catégorie (lot) est-elle autorisée à la modification d'articles ? */
export function isEditableLot(lotId?: string | null): boolean {
  return !!lotId && (EDITABLE_LOT_IDS as readonly string[]).includes(lotId);
}

/** Libellé de la catégorie autorisée (retombe sur le nom du lot). */
export function editableLotLabel(lotId?: string | null, fallback?: string): string {
  if (!lotId) return fallback ?? "";
  return EDITABLE_LOT_LABELS[lotId] ?? fallback ?? lotId;
}

/** Identifiant stable d'un article dans le quantitatif. */
export function quantitatifLineKey(lotId: string, lineIndex: number): string {
  return `${lotId}::${lineIndex}`;
}

export interface QuantitatifCustomizationEntry {
  lineKey: string;
  lotId: string;
  lotName: string;
  lineIndex: number;
  baseDesignation: string;
  designation: string;
  unit: string;
  quantity: number;
  /** Prix unitaire au niveau de référence « Standard » du moteur. */
  unitPrice: number;
  nature: string;
  priceScenario: BudgetScenarioKey;
  replacedArticle: boolean;
  updatedAt: number;
}

/** Index des personnalisations par clé d'article. */
export function indexCustomizations(
  entries?: QuantitatifCustomizationEntry[] | null,
): Map<string, QuantitatifCustomizationEntry> {
  const map = new Map<string, QuantitatifCustomizationEntry>();
  for (const e of entries ?? []) map.set(e.lineKey, e);
  return map;
}

interface LotModIndex {
  byIndex: Map<number, QuantitatifCustomizationEntry>;
  byDesignation: Map<string, QuantitatifCustomizationEntry>;
}

/** Index des personnalisations par lot (position + désignation d'origine). */
function buildLotModIndex(
  entries: QuantitatifCustomizationEntry[],
): Map<string, LotModIndex> {
  const map = new Map<string, LotModIndex>();
  for (const m of entries) {
    let lotIndex = map.get(m.lotId);
    if (!lotIndex) {
      lotIndex = { byIndex: new Map(), byDesignation: new Map() };
      map.set(m.lotId, lotIndex);
    }
    lotIndex.byIndex.set(m.lineIndex, m);
    if (m.baseDesignation) lotIndex.byDesignation.set(m.baseDesignation, m);
  }
  return map;
}

/**
 * Retrouve la personnalisation d'une ligne. La position est utilisée en
 * priorité ; si le quantitatif a été régénéré et que la ligne a bougé, on se
 * rabat sur la désignation d'origine pour ne jamais appliquer une
 * modification à un autre article.
 */
function resolveMod(
  lotIndex: LotModIndex | undefined,
  line: any,
  lineIndex: number,
): QuantitatifCustomizationEntry | undefined {
  if (!lotIndex) return undefined;
  const byIdx = lotIndex.byIndex.get(lineIndex);
  if (byIdx && byIdx.baseDesignation === line?.designation) return byIdx;
  return lotIndex.byDesignation.get(line?.designation);
}

/**
 * Facteur d'un scénario budgétaire par rapport au scénario de référence
 * « Standard » — valeurs déjà utilisées par le moteur de calcul.
 */
export function budgetScenarioFactor(
  scenarios: any,
  scenario: BudgetScenarioKey | string,
): number {
  if (!scenarios?.standard?.totalCost) return 1;
  if (scenario === "standard") return 1;
  const sel = scenarios[scenario];
  if (!sel?.totalCost) return 1;
  return sel.totalCost / scenarios.standard.totalCost;
}

/** Prix unitaire d'un article pour un niveau de finition donné. */
export function unitPriceForScenario(
  standardLevelPrice: number,
  scenarios: any,
  scenario: BudgetScenarioKey,
): number {
  return Math.round(standardLevelPrice * budgetScenarioFactor(scenarios, scenario) * 100) / 100;
}

/**
 * Niveau « Standard » implicite d'un prix enregistré pour un autre scénario :
 * permet de basculer un article d'un niveau de finition à un autre sans
 * dérive cumulative.
 */
export function standardLevelFromPrice(
  price: number,
  scenarios: any,
  scenario: BudgetScenarioKey,
): number {
  const f = budgetScenarioFactor(scenarios, scenario) || 1;
  return price / f;
}

/**
 * Met une copie du quantitatif à l'échelle d'un scénario : montants des lignes,
 * prix unitaires dérivés et sous-totaux des lots. Le quantitatif d'origine
 * n'est jamais modifié (nouveaux objets).
 */
export function scaleDqeLots(lots: any[], factor: number): any[] {
  const list = lots ?? [];
  return list.map((lot: any) => ({
    ...lot,
    subtotal: Math.round((Number(lot?.subtotal) || 0) * factor),
    lines: (lot?.lines ?? []).map((line: any) => {
      const total = Math.round((Number(line?.total) || 0) * factor);
      return {
        ...line,
        total,
        unitPrice:
          Math.round((total / Math.max(1, Number(line?.quantity) || 1)) * 100) / 100,
      };
    }),
  }));
}

interface OverlayOptions {
  /** Facteur du scénario affiché (scénario / Standard). */
  scaleFactor: number;
  /** Facteur de correction des anciennes marges d'imprévus. */
  realCostFactor: number;
}

export interface OverlayResult {
  lots: any[];
  modifiedCount: number;
  /** Écart de total (nouveau − ancien), dans la devise du projet. */
  deltaTotal: number;
  grandTotal: number;
}

/**
 * Superpose les personnalisations sur une copie du quantitatif déjà mise à
 * l'échelle du scénario affiché. Les lots sans modification sont retournés tels
 * quels (aucune altération des scénarios d'origine).
 */
export function overlayCustomizations(
  scaledLots: any[],
  entries: QuantitatifCustomizationEntry[] | null | undefined,
  opts: OverlayOptions,
): OverlayResult {
  const lots = scaledLots ?? [];
  if (!entries?.length) {
    return {
      lots,
      modifiedCount: 0,
      deltaTotal: 0,
      grandTotal: lots.reduce((s, l) => s + (Number(l?.subtotal) || 0), 0),
    };
  }
  const byLot = buildLotModIndex(entries);
  const factor = (opts.scaleFactor || 1) * (opts.realCostFactor || 1);
  let modifiedCount = 0;
  let deltaTotal = 0;

  const overlaid = lots.map((lot: any) => {
    const lotMods = byLot.get(lot?.id);
    if (!lotMods || !lot?.lines?.length) return lot;
    const lines = lot.lines.map((line: any, idx: number) => {
      const mod = resolveMod(lotMods, line, idx);
      if (!mod) return line;
      modifiedCount += 1;
      const unitPrice = Math.round(mod.unitPrice * factor * 100) / 100;
      const total = Math.round(mod.quantity * mod.unitPrice * factor);
      deltaTotal += total - (Number(line.total) || 0);
      return {
        ...line,
        designation: mod.designation,
        unit: mod.unit,
        quantity: mod.quantity,
        unitPrice,
        total,
        customized: true,
      };
    });
    const subtotal = lines.reduce((s: number, l: any) => s + (Number(l.total) || 0), 0);
    return { ...lot, lines, subtotal };
  });

  if (!modifiedCount) return { lots, modifiedCount: 0, deltaTotal: 0, grandTotal: 0 };
  const grandTotal = overlaid.reduce((s, l: any) => s + (Number(l?.subtotal) || 0), 0);
  const withPercent = overlaid.map((l: any) => ({
    ...l,
    percent: grandTotal > 0 ? Math.round((Number(l.subtotal) / grandTotal) * 1000) / 10 : (l.percent ?? 0),
  }));
  return { lots: withPercent, modifiedCount, deltaTotal, grandTotal };
}

/**
 * Superpose les personnalisations sur le quantitatif **non mis à l'échelle**
 * (niveau de référence du moteur). Utilisé pour l'export PDF du scénario
 * « Personnalisé ».
 */
export function overlayRawCustomizations(
  rawLots: any[],
  entries: QuantitatifCustomizationEntry[] | null | undefined,
): any[] {
  const lots = rawLots ?? [];
  if (!entries?.length) return lots;
  const byLot = buildLotModIndex(entries);
  return lots.map((lot: any) => {
    const lotMods = byLot.get(lot?.id);
    if (!lotMods || !lot?.lines?.length) return lot;
    const lines = lot.lines.map((line: any, idx: number) => {
      const mod = resolveMod(lotMods, line, idx);
      if (!mod) return line;
      return {
        ...line,
        designation: mod.designation,
        unit: mod.unit,
        quantity: mod.quantity,
        unitPrice: Math.round(mod.unitPrice * 100) / 100,
        total: Math.round(mod.quantity * mod.unitPrice),
      };
    });
    return {
      ...lot,
      lines,
      subtotal: lines.reduce((s: number, l: any) => s + (Number(l.total) || 0), 0),
    };
  });
}

/** Totaux par nature recalculés depuis les lignes (après superposition). */
export function computeQuantitatifTotals(
  lots: any[],
  builtSurface: number,
): {
  materiaux: number;
  mainOeuvre: number;
  equipements: number;
  transport: number;
  etudes: number;
  total: number;
  costPerM2: number;
} {
  const rollup = (nature: string) =>
    (lots ?? []).reduce(
      (s: number, lot: any) =>
        s +
        (lot?.lines ?? [])
          .filter((l: any) => (l?.nature ?? "materiaux") === nature)
          .reduce((a: number, b: any) => a + (Number(b.total) || 0), 0),
      0,
    );
  const total = (lots ?? []).reduce((s: number, l: any) => s + (Number(l?.subtotal) || 0), 0);
  return {
    materiaux: rollup("materiaux"),
    mainOeuvre: rollup("main_oeuvre"),
    equipements: rollup("equipements"),
    transport: rollup("transport"),
    etudes: rollup("etudes"),
    total,
    costPerM2: builtSurface > 0 ? Math.round(total / builtSurface) : 0,
  };
}

/**
 * Une personnalisation est-elle « sans effet » (identique au scénario de
 * référence) ? Dans ce cas elle est supprimée plutôt que stockée.
 */
export function isNoopCustomization(input: {
  baseDesignation: string;
  designation: string;
  unit: string;
  baseUnit: string;
  quantity: number;
  baseQuantity: number;
  unitPrice: number;
  baseUnitPrice: number;
  priceScenario: BudgetScenarioKey;
}): boolean {
  return (
    input.priceScenario === "standard" &&
    input.designation === input.baseDesignation &&
    input.unit === input.baseUnit &&
    Math.abs(input.quantity - input.baseQuantity) < 1e-6 &&
    Math.abs(input.unitPrice - input.baseUnitPrice) < 0.01
  );
}
