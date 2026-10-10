// ============================================================================
// TRAVAUX COMPLÉMENTAIRES — « Travaux complémentaires personnalisés »
// ----------------------------------------------------------------------------
// Aucune dépendance Convex / React : ce module regroupe la logique pure qui
// relie les travaux sélectionnés par l'utilisateur (liste PRÉDÉFINIE) au
// « Quantitatif détaillé » du résultat d'estimation « Coût de construction ».
//
// Règles :
//   • Les travaux ne sont proposés que pour certains types de projet ET une
//     surface couverte ≥ 120 m² (`isComplementaryWorkEligible`).
//   • CHAQUE travail sélectionné forme SA PROPRE catégorie (« Piscine »,
//     « Garage », …) structurée exactement comme « Gros œuvre » et
//     « Second œuvre et finitions » : mêmes colonnes, mêmes alignements, mêmes
//     espacements, regroupement par nature (postes) et articles détaillés.
//     Aucune icône, aucun style ni structure spécifiques.
//   • Les catégories sont insérées à la suite de « Second œuvre et finitions »,
//     IMMÉDIATEMENT AVANT « Aménagement extérieur ».
//   • Elles n'alimentent que le scénario « Personnalisé » : les scénarios
//     Économique / Standard / Premium ne sont jamais modifiés. Il en va de même
//     dans « Répartition » et « Détail par catégorie » (`buildChartBreakdown`,
//     qui n'ajoute les parts qu'en présence de travaux sélectionnés).
//   • Aucun montant n'est inventé ici : chaque ligne vient du chiffrage
//     automatique du moteur (`customWorksEngine`), lui-même basé sur le
//     moteur BIM et la base de prix officielle. Quantités, unités, prix
//     unitaires et montants sont repris À L'IDENTIQUE.
// ============================================================================

import {
  EXTERIOR_LOT_ID,
  EXTERIOR_LOT_MATCH,
  complementaryWorkLotId,
  getCustomWorkDef,
  isComplementaryWorkLotId,
} from "./customWorksCatalog";
import type { CustomWorkEstimate } from "../convex/customWorksEngine";

/** Article d'un lot du Quantitatif détaillé. */
export interface QuantitatifLotLine {
  designation: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  nature: string;
}

/**
 * Lot du Quantitatif détaillé (structure tolérante du moteur DQE) : les lots
 * d'origine sont acceptés tels quels, seuls `id`, `name` et `subtotal` sont lus.
 */
export interface QuantitatifLotLike {
  id?: string;
  name?: string;
  /** Part du lot dans le total (%), recalculée après insertion. */
  percent?: number;
  /** Sous-total du lot (TND). */
  subtotal?: number;
  lines?: QuantitatifLotLine[];
  /** Catégorie générée par un travail complémentaire (jamais personnalisable). */
  customWorks?: boolean;
}

const round1 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 10) / 10;
const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

/** Normalise un libellé (minuscules, accents retirés) pour la comparaison. */
function normalizeLabel(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Total des travaux complémentaires sélectionnés (TND). */
export function complementaryWorksTotal(works: readonly CustomWorkEstimate[]): number {
  return round2((works ?? []).reduce((sum, w) => sum + (Number(w?.total) || 0), 0));
}

/**
 * Construit UNE catégorie par travail complémentaire sélectionné, avec
 * EXACTEMENT la structure des catégories du moteur DQE (« Gros œuvre »,
 * « Second œuvre et finitions ») :
 *   • titre de la catégorie  = libellé du travail (`Piscine`, `Garage`, …) ;
 *   • sous-total             = coût total du travail chiffré par le moteur ;
 *   • articles               = les lignes réelles du moteur, regroupées par
 *                              nature (postes) lors de l'affichage.
 *
 * Les quantités, unités, prix unitaires et montants sont repris tels quels :
 * aucun calcul n'est refait ici. Retourne un tableau vide si aucun travail
 * n'est sélectionné — le Quantitatif reste alors strictement inchangé.
 */
export function buildComplementaryWorksLots(
  works: readonly CustomWorkEstimate[] | null | undefined,
): QuantitatifLotLike[] {
  const list = (works ?? []).filter((w) => w && (Number(w.total) || 0) > 0);
  const lots: QuantitatifLotLike[] = [];

  for (const work of list) {
    const lines: QuantitatifLotLine[] = [];
    for (const line of work.lines ?? []) {
      const total = Number(line.total) || 0;
      if (total <= 0) continue;
      lines.push({
        designation: line.designation,
        quantity: Number(line.quantity) || 0,
        unit: line.unit,
        unitPrice: Number(line.unitPrice) || 0,
        total,
        nature: line.nature,
      });
    }
    if (lines.length === 0) continue;
    lots.push({
      id: complementaryWorkLotId(work.key),
      name: work.label,
      percent: 0,
      // Le sous-total est le coût du travail tel que chiffré par le moteur : la
      // somme des catégories reste égale au total des travaux complémentaires.
      subtotal: round2(Number(work.total) || 0),
      lines,
      customWorks: true,
    });
  }

  return lots;
}

/**
 * Part d'une catégorie dans « Répartition » / « Détail par catégorie ».
 * Structure tolérante : les catégories du moteur BIM sont acceptées telles
 * quelles, seuls `label` et `estimatedCost` sont lus.
 */
export interface ChartBreakdownEntry {
  /** Catégorie du moteur BIM, ou identifiant du travail complémentaire. */
  category?: string;
  label: string;
  estimatedCost: number;
  /** Part de la catégorie (%), recalculée quand des travaux sont ajoutés. */
  percentage?: number;
  /** Couleur de la part (renseignée pour les travaux complémentaires). */
  color?: string;
  /** Clé du travail complémentaire, si la part provient d'un travail. */
  workKey?: string;
  /** Nom du composant d'icône lucide du travail (`CustomWorkIcon`). */
  icon?: string;
}

/**
 * Composition affichée de « Répartition » et « Détail par catégorie » :
 *   • aucun travail complémentaire sélectionné → le tableau d'origine est
 *     retourné TEL QUEL (référence inchangée) : les scénarios Économique /
 *     Standard / Premium ne sont jamais touchés ;
 *   • travaux sélectionnés → une part par travail (libellé, coût, couleur et
 *     icône du travail) est ajoutée à la répartition, comme une catégorie de
 *     travaux supplémentaire, et les pourcentages sont recalculés sur le total
 *     affiché pour que la somme des parts reste égale à 100 %.
 *
 * Aucun montant n'est recalculé : `estimatedCost` est repris tel quel.
 */
export function buildChartBreakdown(
  breakdown: readonly ChartBreakdownEntry[] | null | undefined,
  works: readonly CustomWorkEstimate[] | null | undefined,
): ChartBreakdownEntry[] {
  const base = (breakdown ?? []) as ChartBreakdownEntry[];

  const added: ChartBreakdownEntry[] = (works ?? [])
    .filter((w) => w && (Number(w.total) || 0) > 0)
    .map((w) => {
      const def = getCustomWorkDef(w.key);
      return {
        category: complementaryWorkLotId(w.key),
        label: w.label,
        estimatedCost: round2(Number(w.total) || 0),
        percentage: 0,
        color: def?.color,
        workKey: w.key,
        icon: w.icon ?? def?.icon,
      };
    });

  if (added.length === 0) return base;

  const entries = [...base, ...added];
  const total = entries.reduce((s, e) => s + (Number(e.estimatedCost) || 0), 0);
  if (total <= 0) return entries;
  return entries.map((e) => ({
    ...e,
    percentage: round1(((Number(e.estimatedCost) || 0) / total) * 100),
  }));
}

/**
 * Insère les catégories de travaux complémentaires IMMÉDIATEMENT AVANT
 * « Aménagement extérieur ». Aucun doublon n'est possible : les catégories de
 * travaux complémentaires déjà présentes sont retirées avant l'insertion.
 * Sans travail sélectionné, les lots sont retournés tels quels (aucune
 * modification, pas même la recopie du tableau).
 */
export function withComplementaryWorksLots(
  lots: readonly QuantitatifLotLike[] | null | undefined,
  works: readonly CustomWorkEstimate[] | null | undefined,
): QuantitatifLotLike[] {
  const base = (lots ?? []) as QuantitatifLotLike[];
  const added = buildComplementaryWorksLots(works);
  if (added.length === 0) return base;

  // Aucun doublon : toute catégorie de travaux déjà présente est retirée.
  const withoutDuplicates = base.filter((l) => !isComplementaryWorkLotId(l?.id));

  const exteriorIdx = withoutDuplicates.findIndex((l) => {
    if (String(l?.id ?? "") === EXTERIOR_LOT_ID) return true;
    return EXTERIOR_LOT_MATCH.test(normalizeLabel(l?.name));
  });
  // Repli : juste après « Second œuvre et finitions » ; dernier recours : à la fin.
  const secondIdx = withoutDuplicates.findIndex((l) =>
    normalizeLabel(l?.id).includes("second_oeuvre"),
  );
  const at =
    exteriorIdx >= 0 ? exteriorIdx : secondIdx >= 0 ? secondIdx + 1 : withoutDuplicates.length;

  const inserted: QuantitatifLotLike[] = [
    ...withoutDuplicates.slice(0, at),
    ...added,
    ...withoutDuplicates.slice(at),
  ];

  // Pourcentages recalculés sur le nouveau total (comme la superposition du
  // scénario Personnalisé) : la répartition reste cohérente.
  const grandTotal = inserted.reduce((s, l) => s + (Number(l?.subtotal) || 0), 0);
  if (grandTotal <= 0) return inserted;
  return inserted.map((l) => ({
    ...l,
    percent: round1(((Number(l?.subtotal) || 0) / grandTotal) * 100),
  }));
}
