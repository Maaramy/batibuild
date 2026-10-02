// ═══════════════════════════════════════════════════════════════════════════
// PRÉ-SÉLECTION INTELLIGENTE DES MATÉRIAUX
// ═══════════════════════════════════════════════════════════════════════════
// À partir de l'estimation des coûts d'un projet, on ne présélectionne pas
// aveuglément tous les matériaux : on retient les catégories réellement
// pertinentes au regard du **standing** souhaité et du **budget** estimé
// (TND/m², niveaux nationaux Tunisie 2026). L'utilisateur reste libre
// d'ajouter ou de retirer chaque matériau ensuite.
// ═══════════════════════════════════════════════════════════════════════════

export type StandingOption = { value: string; label: string };

/** Standings proposés (libellés alignés sur le moteur BIM). */
export const STANDING_OPTIONS: StandingOption[] = [
  { value: "economique", label: "Économique" },
  { value: "standard", label: "Standard" },
  { value: "bon_standing", label: "Bon standing" },
  { value: "premium", label: "Premium" },
  { value: "luxe", label: "Luxe" },
];

const STANDING_LABELS: Record<string, string> = Object.fromEntries(
  STANDING_OPTIONS.map((o) => [o.value, o.label]),
);

/** Indice de niveau (0-3) porté par chaque standing. */
const STANDING_INDEX: Record<string, number> = {
  economique: 0,
  standard: 1,
  bon_standing: 2,
  premium: 3,
  luxe: 3,
};

/**
 * Niveau minimal (0-3) à partir duquel une catégorie du copilot devient
 * pertinente. `0` = indispensable, `3` = équipement optionnel / haut de gamme.
 */
const CATEGORY_MIN_LEVEL: Record<string, number> = {
  // Niveau 0 — structure, clos-couvert et réseaux indispensables
  beton: 0, ciment: 0, acier: 0, briques: 0, blocs_beton: 0, mortier: 0,
  enduit: 0, etancheite: 0, isolation_thermique: 0, bois: 0, menuiserie: 0,
  portes: 0, aluminium: 0, pvc: 0, verre: 0, electricite: 0, plomberie: 0,
  // Niveau 1 — finitions courantes
  carrelage: 1, faience: 1, peinture: 1, revetements_sol: 1,
  sanitaires: 1, robinetterie: 1,
  // Niveau 2 — confort / qualité supérieure
  pierre_naturelle: 2, marbre: 2, chauffage: 2, climatisation: 2,
  isolation_acoustique: 2, amenagement_exterieur: 2,
  // Niveau 3 — équipements optionnels / haut de gamme
  piscine: 3, panneaux_solaires: 3, equipements_energetiques: 3, autres: 3,
};

const DEFAULT_MIN_LEVEL = 2;

/** Seuils de budget (TND/m²) — barème national Tunisie 2026. */
const BUDGET_THRESHOLDS = [1500, 2100, 2900];

/** Niveau de budget déduit du coût estimé au m² (null si indisponible). */
export function budgetLevel(budgetPerM2?: number): number | null {
  if (budgetPerM2 === undefined || !Number.isFinite(budgetPerM2) || budgetPerM2 <= 0) {
    return null;
  }
  for (let i = 0; i < BUDGET_THRESHOLDS.length; i++) {
    if (budgetPerM2 < BUDGET_THRESHOLDS[i]) return i;
  }
  return BUDGET_THRESHOLDS.length;
}

export type PreselectionInput = {
  /** Identifiants des catégories disponibles (issues de l'estimation). */
  categoryIds: string[];
  /** Standing visé pour le projet (défaut « standard »). */
  standing?: string;
  /** Coût estimé au m² (TND), optionnel. */
  budgetPerM2?: number;
};

export type PreselectionResult = {
  categoryIds: string[];
  /** Niveau retenu (0-3), déterminé par le plus prudent du standing et du budget. */
  level: number;
  /** Explication lisible affichée à l'utilisateur. */
  reason: string;
};

/**
 * Retient les catégories pertinentes pour le standing et le budget du projet.
 * Le niveau retenu est le plus prudent des deux sources : on ne propose pas de
 * postes de confort que le budget estimé ne couvre pas.
 */
export function preselectCategories(input: PreselectionInput): PreselectionResult {
  const standingKey = input.standing && STANDING_LABELS[input.standing] ? input.standing : "standard";
  const standingIdx = STANDING_INDEX[standingKey] ?? 1;
  const bud = budgetLevel(input.budgetPerM2);
  const level = bud === null ? standingIdx : Math.min(standingIdx, bud);

  let picked = input.categoryIds.filter((id) => (CATEGORY_MIN_LEVEL[id] ?? DEFAULT_MIN_LEVEL) <= level);
  // Repli sûr : jamais de présélection vide si des catégories existent.
  if (picked.length === 0) picked = [...input.categoryIds];

  const standingLabel = STANDING_LABELS[standingKey];
  const reason =
    bud === null
      ? `Pré-sélection selon le standing « ${standingLabel} » (niveau ${level + 1}/4).`
      : `Pré-sélection selon le standing « ${standingLabel} » et le budget estimé (${Math.round(
          input.budgetPerM2 as number,
        )} TND/m²) — niveau ${level + 1}/4.`;

  return { categoryIds: picked, level, reason };
}
