/**
 * ACCÈS RAPIDES D'UN PROJET (liste des projets du Dashboard).
 *
 * Construit les liens vers les modules liés à un projet :
 *
 *   - **Plans AI** → `/dashboard/plans/:id` : le résultat « Plans
 *     architecturaux IA » du projet ;
 *   - **Décision** → `/dashboard/decision/:id` : les résultats « Aide à la
 *     décision » (intelligence prédictive) du projet ;
 *   - **Expert** → `/dashboard/professionals-directory?project=…` : la mise en
 *     relation (annuaire des experts / fournisseurs) avec le contexte du
 *     projet (elle charge le projet et pré-remplit les demandes de devis) ;
 *   - **Démarche** → `/dashboard/guide?project=…` : la page « Exécution &
 *     Suivi » (guide de construction A-Z) ouverte sur le projet concerné.
 *
 * Les routes sont celles qui EXISTENT déjà (`src/main.tsx`) : aucune page n'est
 * créée ni dupliquée, aucun calcul n'est refait ici. La fonction est pure et
 * sans dépendance React, donc testable telle quelle.
 */

export type ProjectQuickActionKey = "plan" | "decision" | "expert" | "guide";

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
  plan: "hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400",
  decision:
    "hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400",
  expert:
    "hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400",
  guide:
    "hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400",
} as const;

export function buildProjectQuickActions(project: ProjectForQuickActions): ProjectQuickAction[] {
  return [
    {
      key: "plan",
      label: "Plans AI",
      href: `/dashboard/plans/${project._id}`,
      tone: TONES.plan,
    },
    {
      key: "decision",
      label: "Décision",
      href: `/dashboard/decision/${project._id}`,
      tone: TONES.decision,
    },
    {
      key: "expert",
      label: "Expert",
      href: `/dashboard/professionals-directory?project=${project._id}`,
      tone: TONES.expert,
    },
    {
      key: "guide",
      label: "Démarche",
      href: `/dashboard/guide?project=${project._id}`,
      tone: TONES.guide,
    },
  ];
}
