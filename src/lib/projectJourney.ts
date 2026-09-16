/**
 * PARCOURS DU PROJET — « OÙ SUIS-JE DANS MON PROJET ? »
 *
 * Modèle unique des étapes affichées dans la barre de navigation du parcours :
 * il ne contient AUCUN calcul, aucune donnée de projet et aucune règle métier —
 * uniquement les liens vers les modules déjà existants de BatiBuild.
 *
 * Le groupe est déterminé automatiquement à partir du type de projet
 * enregistré (`resolveProjectType` gère aussi les anciens slugs et les
 * libellés libres) :
 *
 *   - **Groupe A** — projets neufs / immobiliers (maison, villa, appartement,
 *     studio, duplex, immeuble, local commercial, bureau, entrepôt, résidence
 *     touristique, projet immobilier neuf) : parcours complet en 5 étapes
 *     (coût estimatif → plans → choix matériaux → exécution → consultation) ;
 *   - **Groupe B** — tous les autres types (rénovation, extension, piscine,
 *     restaurant, café, travaux techniques…) : 2 étapes seulement
 *     (coût estimatif → consultation).
 *
 * Chaque lien conserve le contexte du projet (`?project=…` ou `/:id`) : la
 * navigation ne recrée jamais de projet et ne perd aucune donnée.
 */

import { INVESTMENT_ELIGIBLE_TYPES, resolveProjectType } from "@/convex/projectTypes";

export type ProjectJourneyGroup = "A" | "B";

export type ProjectJourneyStepKey = "cost" | "plans" | "materials" | "execution" | "consult";

export interface ProjectJourneyStep {
  key: ProjectJourneyStepKey;
  /** Libellé affiché dans la barre. */
  label: string;
  /**
   * Route cible **sans** le contexte projet : sert uniquement à identifier
   * l'étape actuellement consultée (comparaison avec la route affichée).
   */
  path: string;
  /** Lien de navigation complet, contexte du projet inclus. */
  href: string;
}

/** Groupe A : types de projet au parcours complet (5 étapes). */
export const PROJECT_JOURNEY_GROUP_A: readonly string[] = INVESTMENT_ELIGIBLE_TYPES;

/** Groupe du projet déduit de son type enregistré (jamais choisi par l'utilisateur). */
export function projectJourneyGroup(category: string | null | undefined): ProjectJourneyGroup {
  const resolved = resolveProjectType((category ?? "").trim());
  return resolved && PROJECT_JOURNEY_GROUP_A.includes(resolved) ? "A" : "B";
}

const CONSULT_LABELS: Record<ProjectJourneyGroup, string> = {
  A: "Consultation expert / entreprise",
  B: "Consultation pro / expert / entreprise",
};

/**
 * Étapes du parcours pour un projet donné, dans l'ordre officiel.
 * Retourne un tableau vide si l'identifiant du projet est absent (la barre
 * n'est alors pas affichée plutôt que d'afficher des liens sans contexte).
 */
export function buildProjectJourney(
  category: string | null | undefined,
  projectId: string | null | undefined,
): ProjectJourneyStep[] {
  const raw = (projectId ?? "").trim();
  if (!raw) return [];
  const pid = encodeURIComponent(raw);
  const group = projectJourneyGroup(category);

  const cost: ProjectJourneyStep = {
    key: "cost",
    label: "Coût estimatif",
    path: `/dashboard/project/${pid}`,
    href: `/dashboard/project/${pid}`,
  };

  const consult: ProjectJourneyStep = {
    key: "consult",
    label: CONSULT_LABELS[group],
    path: "/dashboard/professionals-directory",
    href: `/dashboard/professionals-directory?project=${pid}`,
  };

  // Groupe B — parcours réduit.
  if (group === "B") return [cost, consult];

  // Groupe A — parcours complet.
  return [
    cost,
    {
      key: "plans",
      label: "Plans",
      path: `/dashboard/plans/${pid}`,
      href: `/dashboard/plans/${pid}`,
    },
    {
      key: "materials",
      label: "Choix matériaux",
      path: "/dashboard/ai-materials",
      href: `/dashboard/ai-materials?project=${pid}`,
    },
    {
      key: "execution",
      label: "Exécution (Guide de A à Z)",
      path: "/dashboard/guide",
      href: `/dashboard/guide?project=${pid}`,
    },
    consult,
  ];
}
