// ============================================================================
// PLAN DE CONSTRUCTION — niveaux d'affichage d'un poste
// ----------------------------------------------------------------------------
// Une seule règle, PURE et testée, décide comment afficher un poste du plan de
// construction et empêche les libellés en double :
//
//   • UNE SEULE sous-catégorie qui porte le nom du poste (cas courant : le lot
//     du Quantitatif s'appelle comme le poste, ex. « Gros œuvre » sous
//     « Gros œuvre ») → le niveau intermédiaire est supprimé et les articles du
//     poste sont présentés directement : le nom n'apparaît qu'une fois ;
//   • UNE SEULE sous-catégorie réellement nommée autrement (ex. « Études &
//     permis » sous « Études & frais préliminaires ») → son nom est conservé et
//     affiché sous le poste : aucune information n'est perdue ;
//   • DEUX sous-catégories ou plus → c'est une vraie subdivision du poste, le
//     niveau « Sous-catégories du poste » est conservé.
//
// Aucun montant n'est calculé ici : le module décrit seulement l'affichage à
// partir des données déjà calculées par `constructionPlanEngine`.
// ============================================================================

/** Article affichable d'un poste (sous-ensemble structurel de `WorkPartArticle`). */
export interface PlanArticleLike {
  id: string;
  label: string;
  cost: number;
  /** % de réalisation de l'article (0 → 100). */
  pct: number;
  quantity?: number;
  unit?: string;
}

/** Sous-catégorie affichable d'un poste (sous-ensemble structurel de `WorkPart`). */
export interface PlanPartLike {
  id: string;
  label: string;
  articles?: readonly PlanArticleLike[];
}

/** Poste du plan, réduit à ce dont l'affichage a besoin. */
export interface PlanWorkLike {
  label: string;
  parts?: readonly PlanPartLike[];
}

/**
 * Clé de comparaison d'un libellé : complément entre parenthèses, casse,
 * accents, ligatures et ponctuation ignorés. « Gros œuvre (structure) »,
 * « Gros œuvre », « GROS ŒUVRE » et « Gros oeuvre » désignent donc le même
 * poste — ce qui est exactement le doublon à ne pas afficher.
 */
function labelKey(label: string): string {
  return label
    .replace(/\s*\([^()]*\)\s*$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

/** Deux libellés désignent-ils le même poste (doublon à ne pas afficher) ? */
export function isSameWorkLabel(a: string, b: string): boolean {
  const ka = labelKey(a);
  return ka.length > 0 && ka === labelKey(b);
}

/** Décision d'affichage d'un poste du plan de construction. */
export interface PlanWorkLevels {
  /** Faut-il afficher le niveau « Sous-catégories du poste » ? */
  showSubLevel: boolean;
  /**
   * Nom de la sous-catégorie unique, à afficher sous le poste — `null` quand il
   * répète le nom du poste (aucun doublon) ou qu'il n'y a pas de sous-catégorie
   * unique.
   */
  directLabel: string | null;
  /** Articles à présenter directement sous le poste (poste aplati). */
  directArticles: PlanArticleLike[];
}

export function resolveWorkLevels(work: PlanWorkLike): PlanWorkLevels {
  const parts = work.parts ?? [];

  // Vraie subdivision : le niveau intermédiaire est conservé.
  if (parts.length > 1) {
    return { showSubLevel: true, directLabel: null, directArticles: [] };
  }

  const only = parts[0];
  if (!only) return { showSubLevel: false, directLabel: null, directArticles: [] };

  return {
    showSubLevel: false,
    // Le nom de la sous-catégorie n'est repris que s'il apporte une information
    // différente de celle du poste.
    directLabel: isSameWorkLabel(work.label, only.label) ? null : only.label,
    directArticles: [...(only.articles ?? [])],
  };
}
