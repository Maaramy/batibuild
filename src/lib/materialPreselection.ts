/**
 * Pré-sélection intelligente des matériaux **requis par le projet**.
 *
 * Point de départ : les matériaux réellement nécessaires à l'estimation des
 * coûts de construction (le « besoin calculé » du projet). L'objectif est de
 * retenir automatiquement, dans chaque catégorie, les matériaux offrant le
 * meilleur compromis **prix / qualité**, afin que l'utilisateur démarre son
 * analyse sur une sélection pertinente plutôt que sur la totalité du catalogue.
 *
 * - La **qualité** combine l'indice de confiance du matériau et la fiabilité de
 *   la source de son prix (relevé terrain / publication 2026).
 * - Le **prix** est normalisé à l'intérieur de chaque catégorie : le matériau le
 *   moins cher obtient 100, le plus cher 0.
 * - La **priorité** (« prix » / « équilibre » / « qualité ») règle le poids
 *   relatif des deux axes.
 */

export type PreselectPriority = "prix" | "equilibre" | "qualite";

export const PRIORITY_OPTIONS: { value: PreselectPriority; label: string; hint: string }[] = [
  { value: "prix", label: "Prix", hint: "Favorise les matériaux les plus économiques" },
  { value: "equilibre", label: "Équilibré", hint: "Meilleur rapport prix / qualité" },
  { value: "qualite", label: "Qualité", hint: "Favorise les matériaux les mieux notés" },
];

export type PreselectMaterial = {
  id: string;
  unitPrice: number;
  confidenceIndex?: number;
  priceQuality?: string;
};

export type PreselectCategory = {
  id: string;
  materials: PreselectMaterial[];
};

export type PreselectionInput = {
  categories: PreselectCategory[];
  priority?: PreselectPriority;
};

export type PreselectionResult = {
  materialIds: string[];
  categoryIds: string[];
  reason: string;
};

const QUALITY_WEIGHT: Record<PreselectPriority, number> = {
  prix: 0.35,
  equilibre: 0.5,
  qualite: 0.65,
};

const clamp100 = (n: number) => Math.max(0, Math.min(100, n));

/** Score qualité 0-100 : indice de confiance + fiabilité de la source du prix. */
export function qualityScore(m: PreselectMaterial): number {
  const conf = typeof m.confidenceIndex === "number" ? m.confidenceIndex : 0.5;
  let bonus = 0;
  if (m.priceQuality === "observé_en_ligne") bonus = 6;
  else if (m.priceQuality === "publication_2026") bonus = 4;
  return clamp100(conf * 100 + bonus);
}

/** Score prix 0-100, relatif à la catégorie : le matériau le moins cher obtient 100. */
export function priceScore(unitPrice: number, min: number, max: number): number {
  if (!(max > min)) return 70;
  return clamp100((100 * (max - unitPrice)) / (max - min));
}

/** Valeur globale d'un matériau (0-100) selon la priorité choisie. */
export function materialValue(
  m: PreselectMaterial,
  priority: PreselectPriority,
  min: number,
  max: number,
): number {
  const w = QUALITY_WEIGHT[priority];
  return Math.round(w * qualityScore(m) + (1 - w) * priceScore(m.unitPrice, min, max));
}

/**
 * Retient, pour chaque catégorie du besoin calculé, les matériaux dont la valeur
 * prix/qualité est au moins égale à la moyenne de la catégorie — avec au minimum
 * le meilleur matériau de la catégorie. Les catégories sans matériau exploitable
 * sont ignorées.
 */
export function preselectMaterials(input: PreselectionInput): PreselectionResult {
  const priority = input.priority ?? "equilibre";
  const materialIds: string[] = [];
  const categoryIds: string[] = [];
  let total = 0;

  for (const cat of input.categories) {
    const mats = cat.materials.filter((m) => Number.isFinite(m.unitPrice) && m.unitPrice > 0);
    if (mats.length === 0) continue;
    total += mats.length;
    const prices = mats.map((m) => m.unitPrice);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const scored = mats
      .map((m) => ({ m, value: materialValue(m, priority, min, max) }))
      .sort((a, b) => b.value - a.value || a.m.unitPrice - b.m.unitPrice);
    const avg = scored.reduce((s, r) => s + r.value, 0) / scored.length;
    const kept = scored.filter((r) => r.value >= avg);
    const chosen = kept.length > 0 ? kept : [scored[0]];
    for (const r of chosen) materialIds.push(r.m.id);
    categoryIds.push(cat.id);
  }

  const reason =
    materialIds.length === 0
      ? "Aucun matériau requis par l'estimation des coûts."
      : `Pré-sélection prix / qualité : ${materialIds.length} matériau(x) retenu(s) sur ${total}.`;

  return { materialIds, categoryIds, reason };
}
