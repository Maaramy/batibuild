/**
 * ACCÈS RAPIDES D'UN PROJET (liste des projets du Dashboard).
 *
 * Construit les 4 liens vers les modules liés à un projet :
 *
 *   - **Matériaux** → `/dashboard/ai-materials?project=…` : la page de l'assistant
 *     Matériaux IA s'ouvre avec le projet déjà sélectionné ;
 *   - **Démarche** → `/dashboard/guide?project=…` : le guide de construction A-Z
 *     s'ouvre sur le projet concerné ;
 *   - **Expert** → `/dashboard/professionals-directory?project=…` : la liste des
 *     experts s'ouvre avec le contexte du projet (elle charge le projet et
 *     pré-remplit les demandes de devis / service) ;
 *   - **Plan AI** → `/dashboard/plans/:id` : le générateur de plans du projet ;
 *   - **ProMarket** → `/promarket/search?project=…` : la marketplace de services
 *     professionnels, ouverte avec le contexte du projet (l'annuaire recherche
 *     les professionnels pertinents pour ce chantier).
 *
 * Les routes sont celles qui EXISTENT déjà (`src/main.tsx`) : aucune page n'est
 * créée ni dupliquée, aucun calcul n'est refait ici. La fonction est pure et
 * sans dépendance React, donc testable telle quelle.
 */

export type ProjectQuickActionKey =
  | "materials"
  | "guide"
  | "expert"
  | "plan"
  | "promarket";

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
  materials:
    "hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400",
  guide:
    "hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400",
  expert:
    "hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400",
  plan: "hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400",
  promarket:
    "hover:border-primary/50 hover:bg-primary/10 hover:text-primary",
} as const;

export function buildProjectQuickActions(project: ProjectForQuickActions): ProjectQuickAction[] {
  return [
    {
      key: "materials",
      label: "Matériaux",
      href: `/dashboard/ai-materials?project=${project._id}`,
      tone: TONES.materials,
    },
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
    {
      key: "promarket",
      label: "ProMarket",
      // ProMarket recherche les professionnels en conservant le contexte projet
      // (la page de recherche lit le paramètre `project`).
      href: `/promarket/search?project=${project._id}`,
      tone: TONES.promarket,
    },
  ];
}
