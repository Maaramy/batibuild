// ── Ventilation TTC alignée ─────────────────────────────────────────────────
// Les 6 catégories de la grille tarifaire fixe + la ligne « Imprévus &
// contingence » sont exprimées sur le COÛT TOTAL TTC : la somme des montants
// vaut exactement le total affiché et la somme des pourcentages vaut 100 %.
// Ceci garantit une parfaite cohérence entre « Répartition » (camembert),
// « Détail par catégorie » et « Quantitatif détaillé » — aucune moyenne
// nationale ni ajustement automatique, uniquement la grille du classeur.

export interface TtcBreakdownItem {
  category: string;
  label: string;
  estimatedCost: number;
  /** Part du coût total TTC en % (somme = 100). */
  pctTTC: number;
  items?: any[];
  [key: string]: any;
}

/**
 * Construit la ventilation complète (catégories + contingence) alignée sur le
 * coût total TTC d'un scénario.
 *
 * @param breakdown Catégories de la grille (déjà scalées pour le scénario).
 * @param ttcTotal  Coût total TTC du scénario (grille + imprévus).
 */
export function buildTtcBreakdown(
  breakdown: any[],
  ttcTotal: number,
): TtcBreakdownItem[] {
  const ttc = Math.max(1, ttcTotal || 0);
  const cats = (breakdown ?? []).map((c) => ({ ...c, items: c.items ?? [] }));
  const baseSum = cats.reduce((s, c) => s + (c.estimatedCost || 0), 0);
  // La contingence absorbe l'écart d'arrondi pour tomber EXACTEMENT sur le
  // total TTC affiché (méthode identique au finalisateur du moteur BIM).
  const contingency = Math.max(0, ttc - baseSum);
  const items: TtcBreakdownItem[] = [
    ...cats,
    {
      category: "contingence",
      label: "Imprévus & contingence",
      estimatedCost: contingency,
      items: [],
    },
  ];
  // Pourcentages sur le TTC ; la dernière ligne prend la différence
  // (somme des pourcentages = 100 exactement).
  let pctSum = 0;
  return items.map((it, i) => {
    const pct =
      i === items.length - 1
        ? Math.max(0, Math.round((100 - pctSum) * 10) / 10)
        : Math.round(((it.estimatedCost || 0) / ttc) * 1000) / 10;
    pctSum += pct;
    return { ...it, pctTTC: pct };
  });
}
