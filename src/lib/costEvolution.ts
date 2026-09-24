/**
 * Helpers purs du graphique « Évolution probable des coûts (24 mois) ».
 *
 * Aucune dépendance React : l'échantillonnage et la lecture d'un point sont
 * testables isolément, le composant ne fait que l'affichage.
 */

export interface CostEvolutionPoint {
  /** Libellé fourni par le moteur (« Aujourd'hui », « M+1 », …). */
  label: string;
  /** Coût projeté en TND. */
  cost: number;
}

/**
 * Points conservés au maximum. Le référentiel en produit 25 (aujourd'hui + 24
 * mois) ; au-delà de quelques colonnes, les barres deviennent illisibles sur
 * mobile, donc on échantillonne uniformément en gardant le premier et le
 * dernier mois.
 */
export const COST_EVOLUTION_MAX_POINTS = 13;

/**
 * Échantillonne les points en conservant le premier et le dernier (pas
 * uniforme), sans jamais dépasser `maxPoints` et sans muter l'entrée.
 * Renvoie le tableau d'origine si aucun échantillonnage n'est nécessaire.
 */
export function sampleCostEvolutionPoints<T extends CostEvolutionPoint>(
  points: T[],
  maxPoints: number = COST_EVOLUTION_MAX_POINTS,
): T[] {
  if (maxPoints < 2 || points.length <= maxPoints) return points;

  const lastIndex = points.length - 1;
  const step = Math.ceil(lastIndex / (maxPoints - 1));
  const sampled = points.filter((_, i) => i % step === 0);
  if (sampled[sampled.length - 1] !== points[lastIndex]) {
    sampled.push(points[lastIndex]);
  }
  return sampled;
}

/**
 * Variation en % du point `index` par rapport au premier point (aujourd'hui).
 * `null` si la référence est absente ou nulle (aucun pourcentage calculable).
 */
export function costEvolutionDeltaPct(
  points: readonly CostEvolutionPoint[],
  index: number,
): number | null {
  if (index <= 0 || index >= points.length) return null;
  const base = points[0]?.cost;
  const current = points[index]?.cost;
  if (!base || current === undefined) return null;
  return ((current - base) / base) * 100;
}

/**
 * Libellé court affiché sous les barres sur mobile : « Aujourd'hui » est trop
 * large pour une colonne d'une trentaine de pixels, « M+n » l'est déjà.
 */
export function compactCostEvolutionLabel(label: string): string {
  return label === "Aujourd'hui" ? "Auj." : label;
}

/** Compteur lisible d'un axe : 561200 → « 561 k ». */
export function compactCostValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
      Math.round(value / 1000),
    )} k`;
  }
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
}
