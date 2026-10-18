// ============================================================================
// HELPERS PARTAGÉS — montants et lignes du Quantitatif détaillé
// ----------------------------------------------------------------------------
// Ce module ne contient plus de moteur : il ne conserve que les deux éléments
// réellement partagés par d'autres fonctionnalités de la plateforme :
//   • `QuantitatifLotLine` — forme d'une ligne du Quantitatif détaillé ;
//   • `formatTndAmount`    — montant en dinars, format fr-FR.
// ============================================================================

/** Ligne du Quantitatif détaillé (forme minimale lue par les autres modules). */
export interface QuantitatifLotLine {
  designation: string;
  /** Sous-lot du Quantitatif détaillé (ex. « Fondations »). */
  subcategory?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  total?: number;
}

/** Format fr-FR à espaces ordinaires (aucun caractère insécable parasite). */
function frNumber(n: number, fractionDigits = 0): string {
  const safe = Number.isFinite(n) ? n : 0;
  return safe
    .toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: fractionDigits })
    .replace(/[\u202f\u00a0]/g, " ");
}

export const formatTndAmount = (n: number) => `${frNumber(Math.round(n))} TND`;
