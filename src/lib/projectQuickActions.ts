/**
 * ACCÈS RAPIDES D'UN PROJET (liste des projets du Dashboard).
 *
 * Construit les liens vers les modules liés à un projet :
 *
 *   - **Démarche** → `/dashboard/guide?project=…` : le guide de construction A-Z
 *     s'ouvre sur le projet concerné ;
 *   - **Expert** → `/dashboard/professionals-directory?project=…` : la liste des
 *     experts s'ouvre avec le contexte du projet (elle charge le projet et
 *     pré-remplit les demandes de devis / service) ;
 *   - **Plan AI** → `/dashboard/plans/:id` : le générateur de plans du projet.
 *
 * Les routes sont celles qui EXISTENT déjà (`src/main.tsx`) : aucune page n'est
 * créée ni dupliquée, aucun calcul n'est refait ici. La fonction est pure et
 * sans dépendance React, donc testable telle quelle.
 */

export type ProjectQuickActionKey = "guide" | "expert" | "plan";

export type ProjectQuickAction = {
  key: ProjectQuickActionKey;
  label: string;
  href: string;
  /** Classes Tailwind de survol (teinte propre au module). */
  tone: string;
};

/** Champs du projet utilisés pour construire les liens. */
export type ProjectForQuickActions = {
  _id: string;
};

const TONES = {
  guide:
    "hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400",
  expert:
    "hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400",
  plan: "hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400",
} as const;

export function buildProjectQuickActions(project: ProjectForQuickActions): ProjectQuickAction[] {
  return [
    {
      key: "guide",
      label: "Démarche",
      href: `/dashboard/guide?project=${project._id}`,
      tone: TONES.guide,
    },
    {
      key: "expert",
      label: "Expert",
      href: `/dashboard/professionals-directory?project=${project._id}`,
      tone: TONES.expert,
    },
    {
      key: "plan",
      label: "Plan AI",
      href: `/dashboard/plans/${project._id}`,
      tone: TONES.plan,
    },
  ];
}
