/**
 * ANALYSE DES TRAVAUX — répartition des économies réelles par poste.
 *
 * L'IA d'optimisation raisonne MATÉRIAU PAR MATÉRIAU (`buildOptimizationPlan`)
 * tandis que le Quantitatif détaillé est structuré en POSTES de travaux
 * (Gros œuvre, Second œuvre, Équipements…). Ce module fait le pont entre les
 * deux, SANS inventer de montant :
 *
 *   1. chaque poste du Quantitatif est relié à ses matériaux réels (via les
 *      articles de ses sous-catégories et la table d'intelligence matériaux) ;
 *   2. les économies déjà calculées par le moteur d'optimisation sont
 *      rattachées au poste de leur matériau ;
 *   3. les économies non rattachables (regroupement des achats, matériaux hors
 *      détail) sont réparties au prorata de la base matériaux RÉELLE de chaque
 *      poste (repli sur le coût du poste si aucun matériau n'est chiffré), de
 *      sorte que la somme des postes reste ÉGALE à l'économie globale.
 *
 * Aucun taux cible n'est utilisé ici : seuls les montants réels circulent.
 */

import type { BudgetCategoryLine } from "@/lib/budgetEngine";
import { normalizeMaterialName, type MaterialIntelRow } from "@/lib/materialIntelligence";
import type { OptimizationPlan } from "@/lib/optimizationEngine";

export interface WorkPosteAnalysis {
  /** Identifiant du poste (catégorie du Quantitatif). */
  key: string;
  /** Libellé lisible (sans le complément entre parenthèses). */
  label: string;
  /** Coût actuel du poste (montant réel du Quantitatif). */
  currentCost: number;
  /** Part du coût total du projet (%). */
  pctOfTotal: number;
  /** Économie estimée rattachée au poste (TND). */
  saving: number;
  /** % d'optimisation possible du poste (économie / coût du poste). */
  optimPct: number;
  /** Coût optimisé du poste — jamais négatif. */
  optimizedCost: number;
  /** Base matériaux réelle du poste (TND). */
  materialBase: number;
  /** Nombre de matériaux réellement rattachés au poste. */
  materialCount: number;
  /** Pertes évitables détectées sur le poste (TND). */
  lossValue: number;
  /** Nombre de matériaux du poste disposant d'une alternative moins coûteuse. */
  alternatives: number;
  /** Fournisseurs / sources distincts identifiés sur le poste. */
  suppliers: string[];
  /** Nombre de matériaux du poste exposés à une hausse estimée. */
  risingCount: number;
  /** Matériaux les plus lourds du poste (ordre décroissant de coût). */
  topRows: MaterialIntelRow[];
}

export interface WorkPostesInput {
  /** Catégories réelles du Quantitatif détaillé (postes de travaux). */
  breakdown: BudgetCategoryLine[];
  /** Analyse matériau par matériau du projet. */
  rows: MaterialIntelRow[];
  /** Économies réelles par article, calculées par le moteur d'optimisation. */
  articleSavings: OptimizationPlan["articleSavings"];
  /** Économie globale réellement retenue après dédoublonnage (TND). */
  totalSaving: number;
  /** Nombre maximum de matériaux conservés dans le détail d'un poste. */
  topCount?: number;
}

/** Libellé court : « Gros œuvre (fondations, structure) » → « Gros œuvre ». */
function shortLabel(label: string): string {
  const cleaned = String(label ?? "").replace(/\s*\([^()]*\)\s*$/, "").trim();
  return cleaned.length > 0 ? cleaned : String(label ?? "");
}

export function buildWorkPostes(input: WorkPostesInput): WorkPosteAnalysis[] {
  const { breakdown, rows, articleSavings, totalSaving } = input;
  const topCount = Math.max(1, input.topCount ?? 4);

  // Index matériaux + économies par désignation normalisée (les désignations
  // viennent du MÊME Quantitatif que les articles du détail : la table de
  // correspondance est donc fiable, sans approximation hasardeuse).
  const rowByKey = new Map<string, MaterialIntelRow>();
  for (const r of rows) {
    const key = normalizeMaterialName(r.designation);
    if (key && !rowByKey.has(key)) rowByKey.set(key, r);
  }
  const savingByKey = new Map<string, number>();
  for (const a of articleSavings) {
    const key = normalizeMaterialName(a.designation);
    if (key) savingByKey.set(key, (savingByKey.get(key) ?? 0) + a.saving);
  }

  const draft = (breakdown ?? []).map((cat) => {
    const keys = new Set<string>();
    for (const sub of cat.subcategories ?? []) {
      for (const art of sub.articles ?? []) {
        const key = normalizeMaterialName(art.designation);
        if (key) keys.add(key);
      }
    }
    const found = Array.from(keys)
      .map((k) => rowByKey.get(k))
      .filter((r): r is MaterialIntelRow => !!r);
    const materialBase = found.reduce((s, r) => s + r.currentTotal, 0);
    const matchedSaving = Array.from(keys).reduce((s, k) => s + (savingByKey.get(k) ?? 0), 0);
    return {
      key: cat.categoryId,
      label: shortLabel(cat.categoryLabel),
      currentCost: Math.max(0, cat.estimatedCost),
      pctOfTotal: cat.pctOfTotal,
      materialBase,
      matchedSaving,
      materialCount: found.length,
      lossValue: found.reduce((s, r) => s + r.lossValue, 0),
      alternatives: found.filter((r) => r.potentialSaving > 0).length,
      suppliers: Array.from(
        new Set(found.map((r) => (r.supplier || r.sourceType || "").trim()).filter(Boolean)),
      ),
      risingCount: found.filter((r) => r.trend === "hausse").length,
      topRows: [...found].sort((a, b) => b.currentTotal - a.currentTotal).slice(0, topCount),
    };
  });

  // Répartition du reste (regroupement des achats + économies non rattachées)
  // au prorata de la base réelle de chaque poste.
  const matchedTotal = draft.reduce((s, d) => s + d.matchedSaving, 0);
  const remainder = Math.max(0, (Number(totalSaving) || 0) - matchedTotal);
  const weightBase = draft.reduce((s, d) => s + d.materialBase, 0);
  const weightCost = draft.reduce((s, d) => s + d.currentCost, 0);
  const totalWeight = weightBase > 0 ? weightBase : weightCost;

  return draft.map((d) => {
    const weight = weightBase > 0 ? d.materialBase : d.currentCost;
    const share = totalWeight > 0 ? remainder * (weight / totalWeight) : 0;
    const saving = Math.min(d.currentCost, d.matchedSaving + share);
    return {
      key: d.key,
      label: d.label,
      currentCost: d.currentCost,
      pctOfTotal: d.pctOfTotal,
      saving,
      optimPct: d.currentCost > 0 ? (saving / d.currentCost) * 100 : 0,
      optimizedCost: Math.max(0, d.currentCost - saving),
      materialBase: d.materialBase,
      materialCount: d.materialCount,
      lossValue: d.lossValue,
      alternatives: d.alternatives,
      suppliers: d.suppliers,
      risingCount: d.risingCount,
      topRows: d.topRows,
    };
  });
}
