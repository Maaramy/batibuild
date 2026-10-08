// ============================================================================
// TRAVAUX COMPLÉMENTAIRES — « Travaux personnalisés »
// ----------------------------------------------------------------------------
// Aucune dépendance Convex / React : ce module regroupe la logique pure qui
// relie les travaux sélectionnés par l'utilisateur (liste PRÉDÉFINIE) au
// « Quantitatif détaillé » du résultat d'estimation « Coût de construction ».
//
// Règles :
//   • Les travaux ne sont proposés que pour certains types de projet ET une
//     surface couverte ≥ 120 m² (`isComplementaryWorkEligible`).
//   • Ils forment UNE catégorie dédiée (« Travaux personnalisés ») positionnée
//     IMMÉDIATEMENT AVANT « Aménagement extérieur ».
//   • Cette catégorie n'alimente que le scénario « Personnalisé » : les
//     scénarios Économique / Standard / Premium ne sont jamais modifiés.
//   • Aucun montant n'est inventé ici : chaque ligne vient du chiffrage
//     automatique du moteur (`customWorksEngine`), lui-même basé sur le
//     moteur BIM et la base de prix officielle.
// ============================================================================

import {
  COMPLEMENTARY_WORKS_LOT_ID,
  COMPLEMENTARY_WORKS_LOT_NAME,
  EXTERIOR_LOT_ID,
  EXTERIOR_LOT_MATCH,
} from "./customWorksCatalog";
import type { CustomWorkEstimate } from "../convex/customWorksEngine";

/** Article d'un lot du Quantitatif détaillé. */
export interface QuantitatifLotLine {
  designation: string;
  description?: string;
  /**
   * Clé du travail complémentaire d'appartenance (ex. « piscine »). Purement
   * présentationnel : elle permet au Quantitatif d'afficher l'icône du travail
   * via `CustomWorkIcon`, comme le reste de la plateforme.
   */
  workKey?: string;
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
  /** Lot généré par les travaux complémentaires (jamais personnalisable). */
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
 * Construit la catégorie « Travaux personnalisés » à partir des travaux
 * chiffrés : un poste par travail (rappelé sur chaque article via sa
 * description) et les articles réels du moteur (quantité, unité, prix
 * unitaire, montant). Retourne `null` si aucun travail n'est sélectionné —
 * dans ce cas le Quantitatif reste strictement inchangé.
 */
export function buildComplementaryWorksLot(
  works: readonly CustomWorkEstimate[] | null | undefined,
): QuantitatifLotLike | null {
  const list = (works ?? []).filter((w) => w && (Number(w.total) || 0) > 0);
  if (list.length === 0) return null;

  const lines: QuantitatifLotLine[] = [];
  for (const work of list) {
    for (const line of work.lines ?? []) {
      const total = Number(line.total) || 0;
      if (total <= 0) continue;
      lines.push({
        designation: line.designation,
        // Poste d'appartenance : chaque travail garde ses propres articles.
        // L'icône n'est pas un texte : elle est rendue par `CustomWorkIcon`
        // (même bibliothèque que toute la plateforme) à partir de `workKey`.
        description: work.label,
        workKey: work.key,
        quantity: Number(line.quantity) || 0,
        unit: line.unit,
        unitPrice: Number(line.unitPrice) || 0,
        total,
        nature: line.nature,
      });
    }
  }
  if (lines.length === 0) return null;

  return {
    id: COMPLEMENTARY_WORKS_LOT_ID,
    name: COMPLEMENTARY_WORKS_LOT_NAME,
    percent: 0,
    subtotal: complementaryWorksTotal(list),
    lines,
    customWorks: true,
  };
}

/**
 * Insère la catégorie « Travaux personnalisés » IMMÉDIATEMENT AVANT
 * « Aménagement extérieur ». Aucun doublon n'est possible : un éventuel lot
 * portant déjà cet identifiant est retiré avant l'insertion. Sans travaux
 * sélectionnés, les lots sont retournés tels quels (aucune modification).
 */
export function withComplementaryWorksLot(
  lots: readonly QuantitatifLotLike[] | null | undefined,
  works: readonly CustomWorkEstimate[] | null | undefined,
): QuantitatifLotLike[] {
  const base = (lots ?? []) as QuantitatifLotLike[];
  const lot = buildComplementaryWorksLot(works);
  if (!lot) return base;

  // Aucun doublon : un lot portant déjà cet identifiant est retiré.
  const withoutDuplicate = base.filter((l) => l?.id !== COMPLEMENTARY_WORKS_LOT_ID);

  const exteriorIdx = withoutDuplicate.findIndex((l) => {
    if (String(l?.id ?? "") === EXTERIOR_LOT_ID) return true;
    return EXTERIOR_LOT_MATCH.test(normalizeLabel(l?.name));
  });
  // Repli : juste après « Second œuvre et finitions » ; dernier recours : à la fin.
  const secondIdx = withoutDuplicate.findIndex((l) =>
    normalizeLabel(l?.id).includes("second_oeuvre"),
  );
  const at =
    exteriorIdx >= 0 ? exteriorIdx : secondIdx >= 0 ? secondIdx + 1 : withoutDuplicate.length;

  const inserted: QuantitatifLotLike[] = [
    ...withoutDuplicate.slice(0, at),
    lot,
    ...withoutDuplicate.slice(at),
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
