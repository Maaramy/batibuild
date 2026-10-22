// ============================================================================
// AFFICHAGE DES PLANS 3D — RÈGLE MÉTIER CENTRALE
// ----------------------------------------------------------------------------
// La vue 3D des plans architecturaux est autorisée pour :
//
//   · les quatre typologies de logement historiques (maison, villa, studio,
//     appartement) ;
//   · les cinq locaux professionnels du Groupe D (local commercial, bureau,
//     entrepôt, restaurant, café) — même parcours et mêmes plans AI que le
//     Groupe A.
//
// Et cela À TOUS LES NIVEAUX : RDC, R+1, R+2, R+3… Chaque niveau possède sa
// propre vue 3D, construite depuis son `FloorPlan` réel. Aucune surface n'est
// dupliquée ni divisée : le niveau affiché est celui du plan 2D correspondant.
//
// Une vue 3D GLOBALE du bâtiment est proposée en plus des vues par niveau
// lorsque le projet comporte plusieurs niveaux (`allowsPlan3DBuilding`).
//
// Restent hors 3D : les types sans plans architecturaux AI (Groupes B et C) et
// la piscine, qui n'est pas un bâtiment à étages (son rendu dédié existe déjà
// dans le moteur 3D). Les plans 2D, les surfaces et les dimensions ne sont pas
// modifiés par cette règle.
//
// Source unique utilisée par l'interface (onglets « Vue 3D » et « Vue 3D
// globale ») et par l'aperçu automatique des plans : aucun autre écran ne doit
// décider seul.
// ============================================================================

import { normalizeLegacyCategory, resolveProjectType } from "@/convex/projectTypes";

/**
 * Types de projets autorisés à afficher une vue 3D, à chaque niveau.
 * Les cinq derniers appartiennent au Groupe D (locaux professionnels).
 */
export const PLAN_3D_CATEGORIES = [
  "maison",
  "villa",
  "studio",
  "appartement",
  "local_commercial",
  "bureau",
  "entrepot",
  "restaurant",
  "cafe",
] as const;

export type Plan3DCategory = (typeof PLAN_3D_CATEGORIES)[number];

/** Types du Groupe D (locaux professionnels) explicitement couverts. */
export const PLAN_3D_GROUP_D_CATEGORIES = [
  "local_commercial",
  "bureau",
  "entrepot",
  "restaurant",
  "cafe",
] as const satisfies readonly Plan3DCategory[];

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

/** Ce type de projet autorise-t-il une vue 3D ? */
export function allowsPlan3D(category: string | null | undefined): boolean {
  const canonical = canonicalCategory(category);
  return (PLAN_3D_CATEGORIES as readonly string[]).includes(canonical);
}

/**
 * Ce niveau précis peut-il être affiché en 3D ?
 *
 * `level === 0` correspond au rez-de-chaussée (RDC) ; 1 = R+1, 2 = R+2, etc.
 * Tous les niveaux d'un type autorisé sont rendus en 3D, chacun avec sa propre
 * géométrie. Un niveau absent ou négatif est refusé.
 */
export function allowsPlan3DLevel(
  category: string | null | undefined,
  level: number | null | undefined,
): boolean {
  if (!allowsPlan3D(category)) return false;
  return typeof level === "number" && Number.isFinite(level) && level >= 0;
}

/**
 * Une vue 3D globale du bâtiment est-elle pertinente ?
 * Elle n'a de sens qu'à partir de deux niveaux réels : un RDC seul est déjà
 * entièrement couvert par sa vue 3D de niveau.
 */
export function allowsPlan3DBuilding(
  category: string | null | undefined,
  floors: number | null | undefined,
): boolean {
  if (!allowsPlan3D(category)) return false;
  return typeof floors === "number" && Number.isFinite(floors) && floors >= 2;
}
