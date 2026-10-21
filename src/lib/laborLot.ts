// ============================================================================
// QUANTITATIF DÉTAILLÉ — MAIN-D'ŒUVRE EN LOTS
// ----------------------------------------------------------------------------
// Tous les postes de main-d'œuvre sont facturés au LOT : leur quantité vaut
// 1 lot (ou N lots lorsqu'un poste en prévoit plusieurs) et leur prix unitaire
// est le montant du lot. Le montant de la ligne (TTC / HT / TVA) ne change
// JAMAIS : il est conservé à l'identique, seule sa présentation en lots change.
//
// La base de calcul d'origine (m², seau, jour…) reste enregistrée dans
// `referenceQuantity` / `referenceUnit` / `referenceUnitPrice` : les barèmes
// restent auditables, sans être affichés comme quantité du poste.
//
// Fonctions pures, partagées par le moteur DQE, le calcul des scénarios, les
// personnalisations, les travaux complémentaires, l'interface et les PDF.
// ============================================================================

/** Unité unique des postes de main-d'œuvre. */
export const LABOR_LOT_UNIT = "lot";

/** Nature d'un poste de main-d'œuvre dans le DQE. */
export const LABOR_NATURE = "main_oeuvre";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** La nature de la ligne est-elle de la main-d'œuvre ? */
export function isLaborNature(nature: unknown): boolean {
  return String(nature ?? "").trim() === LABOR_NATURE;
}

/**
 * Nombre de lots d'une quantité déjà exprimée en lots (défaut : 1).
 * Une quantité historique exprimée en m² / jour n'est jamais convertie en
 * « Lot 250 » : le poste devient 1 lot.
 */
function lotsFromQuantity(quantity: unknown, unit: unknown): number {
  if (String(unit ?? "").trim() !== LABOR_LOT_UNIT) return 1;
  const n = Number(quantity);
  return Number.isFinite(n) && n >= 1 ? Math.max(1, Math.round(n)) : 1;
}

/** Libellé de quantité d'un lot : « Lot 1 », « Lot 2 », … */
export function formatLaborLot(quantity: unknown): string {
  const n = Number(quantity);
  const lots = Number.isFinite(n) && n >= 1 ? Math.max(1, Math.round(n)) : 1;
  return `Lot ${lots}`;
}

/**
 * Quantité affichée dans le Quantitatif détaillé :
 *   • main-d'œuvre → « Lot N » ;
 *   • tout autre poste → « quantité unité » (inchangé).
 */
export function formatQuantitatifQuantity(
  quantity: unknown,
  unit: unknown,
  nature?: unknown,
): string {
  if (isLaborNature(nature)) return formatLaborLot(quantity);
  const q = Number(quantity);
  return `${Number.isFinite(q) ? q : 0} ${String(unit ?? "")}`.trim();
}

/**
 * Convertit un poste de main-d'œuvre (ou sa part de main-d'œuvre incluse dans
 * un poste matériau) en lot, SANS toucher à son montant :
 *   • quantité = nombre de lots (1 par défaut) ;
 *   • unité = « lot » ;
 *   • prix unitaire = montant du lot (total / nombre de lots).
 *
 * Les postes qui ne relèvent pas de la main-d'œuvre sont retournés tels quels
 * (mêmes quantités, unités, prix et montants). Fonction idempotente.
 */
export function normalizeLaborLine<T extends Record<string, any>>(line: T): T {
  if (!line || typeof line !== "object") return line;
  const laborLine = isLaborNature(line.nature);
  const hasLabor = !!(line.labor && typeof line.labor === "object");
  if (!laborLine && !hasLabor) return line;

  const out: any = { ...line };

  if (laborLine) {
    const baseQuantity = Number(line.quantity);
    const baseUnit = String(line.unit ?? "");
    const baseUnitPrice = Number(line.unitPrice) || 0;
    const total = Number.isFinite(Number(line.total))
      ? Number(line.total)
      : round2((Number.isFinite(baseQuantity) ? baseQuantity : 0) * baseUnitPrice);
    const lots = lotsFromQuantity(baseQuantity, baseUnit);
    if (line.referenceQuantity === undefined) {
      out.referenceQuantity = baseQuantity;
      out.referenceUnit = baseUnit;
      out.referenceUnitPrice = baseUnitPrice;
    }
    out.unit = LABOR_LOT_UNIT;
    out.quantity = lots;
    out.unitPrice = round2(total / lots);
    out.total = total;
  }

  if (hasLabor) {
    const base = line.labor;
    const baseQuantity = Number(base.quantity);
    const baseUnit = String(base.unit ?? "");
    const baseUnitPrice = Number(base.unitPrice) || 0;
    const total = Number.isFinite(Number(base.total))
      ? Number(base.total)
      : round2((Number.isFinite(baseQuantity) ? baseQuantity : 0) * baseUnitPrice);
    const lots = lotsFromQuantity(baseQuantity, baseUnit);
    out.labor = {
      ...base,
      ...(base.referenceQuantity === undefined
        ? {
            referenceQuantity: baseQuantity,
            referenceUnit: baseUnit,
            referenceUnitPrice: baseUnitPrice,
          }
        : {}),
      unit: LABOR_LOT_UNIT,
      quantity: lots,
      unitPrice: round2(total / lots),
      total,
    };
  }

  return out;
}

/**
 * Applique la règle des lots à toutes les lignes d'un ensemble de lots DQE.
 * Les sous-totaux et le total général restent identiques (les montants des
 * lignes ne sont jamais modifiés).
 */
export function normalizeLaborLots<T extends Record<string, any>>(
  lots: readonly T[] | null | undefined,
): T[] {
  return (lots ?? []).map((lot) => {
    const lines = (lot as any)?.lines;
    if (!Array.isArray(lines)) return lot;
    return { ...lot, lines: lines.map(normalizeLaborLine) } as T;
  });
}
