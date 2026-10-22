// ============================================================================
// AFFICHAGE DES PLANS 3D — RÈGLE MÉTIER CENTRALE
// ----------------------------------------------------------------------------
// La vue 3D des plans architecturaux n'est autorisée que pour QUATRE types de
// projets (maison, villa, studio, appartement) et UNIQUEMENT au rez-de-chaussée.
//
//   · tous les autres types (duplex, immeuble, local, résidence touristique,
//     projet neuf, rénovation complète, etc.) n'ont AUCUNE vue 3D, quel que
//     soit leur nombre de niveaux ;
//   · les types autorisés n'ont de vue 3D que pour le niveau RDC : les niveaux
//     R+1, R+2, R+3… restent en 2D / plan de masse.
//
// Source unique utilisée par l'interface (onglet « Vue 3D ») et par l'aperçu
// automatique des plans : aucun autre écran ne doit décider seul. Les plans 2D,
// les surfaces et les dimensions ne sont pas modifiés par cette règle.
// ============================================================================

import { normalizeLegacyCategory, resolveProjectType } from "@/convex/projectTypes";

/** Types de projets autorisés à afficher une vue 3D (RDC uniquement). */
export const PLAN_3D_CATEGORIES = ["maison", "villa", "studio", "appartement"] as const;

export type Plan3DCategory = (typeof PLAN_3D_CATEGORIES)[number];

/**
 * Type canonique du projet pour la règle 3D.
 *
 * Réutilise la résolution du catalogue (slugs officiels, anciens slugs et
 * libellés libres comme « Maison R+2 »). Les anciens slugs de piscine restent
 * des piscines : `resolveProjectType` les remappe vers « villa » pour les
 * moteurs de calcul, ce qui ne doit jamais ouvrir une vue 3D.
 */
function canonicalCategory(category: string | null | undefined): string {
  const raw = (category ?? "").trim();
  if (!raw) return "";
  const normalized = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
  if (normalized.startsWith("piscine")) return "piscine";
  // Les « + » des libellés (« Maison R+2 ») sont retirés pour retrouver les
  // alias du catalogue (« maisonr2 » → villa).
  return resolveProjectType(normalizeLegacyCategory(raw.replace(/\+/g, ""))) ?? "";
}

/** Ce type de projet autorise-t-il une vue 3D (au RDC) ? */
export function allowsPlan3D(category: string | null | undefined): boolean {
  const canonical = canonicalCategory(category);
  return (PLAN_3D_CATEGORIES as readonly string[]).includes(canonical);
}

/**
 * Ce niveau précis peut-il être affiché en 3D ?
 * `level === 0` correspond au rez-de-chaussée (RDC). Tout niveau supérieur
 * (R+1, R+2, R+3…) est refusé, même pour un type autorisé.
 */
export function allowsPlan3DLevel(
  category: string | null | undefined,
  level: number | null | undefined,
): boolean {
  return allowsPlan3D(category) && level === 0;
}
