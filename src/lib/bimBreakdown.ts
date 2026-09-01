// ── Répartition / Détail = Quantitatif détaillé (référence unique) ─────────
// Les lots du « Quantitatif détaillé » sont la référence unique des prix et
// des pourcentages. « Répartition » (camembert) et « Détail par catégorie »
// affichent exactement les mêmes montants que les lots DQE ; les pourcentages
// sont recalculés depuis ces montants pour que la somme vaille exactement
// 100 % (la dernière ligne absorbe l'écart d'arrondi).

export interface BreakdownPctItem {
  /** Libellé affiché (nom du lot / catégorie). */
  label: string;
  /** Montant — même valeur que celle affichée dans le quantitatif. */
  amount: number;
  [key: string]: any;
}

export interface BreakdownPctResult extends BreakdownPctItem {
  /** Part du total en % (somme = 100 exactement). */
  pct: number;
}

/**
 * Calcule les pourcentages d'une ventilation à partir des montants, sur le
 * total des montants fournis (somme des pourcentages = 100 exactement).
 */
export function computeBreakdownPct(
  items: BreakdownPctItem[],
): BreakdownPctResult[] {
  const total = Math.max(
    1,
    (items ?? []).reduce((s, it) => s + (it.amount || 0), 0),
  );
  let pctSum = 0;
  return (items ?? []).map((it, i) => {
    const pct =
      i === items.length - 1
        ? Math.max(0, Math.round((100 - pctSum) * 10) / 10)
        : Math.round(((it.amount || 0) / total) * 1000) / 10;
    pctSum += pct;
    return { ...it, pct };
  });
}
