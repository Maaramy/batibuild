// ============================================================================
// CATÉGORIES D'EXPERTS — regroupement normalisé (7 catégories).
// ----------------------------------------------------------------------------
// Module partagé, sans dépendance Convex : chaque expert est classé par sa
// profession RÉELLE (données du profil, jamais modifiées). « Autre spécialité »
// est le repli pour toute profession hors des six catégories officielles :
// aucune fiche n'est inventée.
//
// Utilisé par le parcours public (« de l'idée à l'investissement ») pour la
// répartition réelle des experts inscrits par catégorie.
// ============================================================================

export interface ExpertCategoryDef {
  key: string;
  /** Emoji d'en-tête du groupe. */
  icon: string;
  label: string;
  /** Professions officielles rattachées à la catégorie. */
  professions: string[];
}

export const EXPERT_CATEGORIES: ExpertCategoryDef[] = [
  { key: "architectes", icon: "🏗️", label: "Architectes", professions: ["architecte"] },
  { key: "ingenieurs", icon: "🏢", label: "Ingénieurs", professions: ["ingenieur"] },
  { key: "bureaux_etudes", icon: "📐", label: "Bureaux d'études", professions: ["bureau_etudes"] },
  { key: "electricite", icon: "⚡", label: "Experts électricité", professions: ["electricien"] },
  { key: "plomberie", icon: "💧", label: "Experts plomberie / CVC", professions: ["plombier"] },
  { key: "promoteurs", icon: "🏠", label: "Promoteurs immobiliers", professions: ["promoteur_immobilier"] },
];

export const EXPERT_OTHER_CATEGORY: ExpertCategoryDef = {
  key: "autre_specialite",
  icon: "🧰",
  label: "Autre spécialité",
  professions: [],
};

/** Catégorie affichée d'un expert d'après sa profession réelle. */
export function expertCategoryOf(
  profession: string | null | undefined,
): ExpertCategoryDef {
  return (
    EXPERT_CATEGORIES.find((c) => c.professions.includes(profession ?? "")) ??
    EXPERT_OTHER_CATEGORY
  );
}

/** Libellés des professions experts — affiché à la place du mot « Expert ». */
export const EXPERT_PROFESSION_LABELS: Record<string, string> = {
  architecte: "Architecte",
  bureau_etudes: "Bureau d'études",
  ingenieur: "Ingénieur",
  promoteur_immobilier: "Promoteur immobilier",
  plombier: "Plombier",
  electricien: "Électricien",
};
