/**
 * PARCOURS DU PROJET — barre d'étapes de la navigation
 *
 * Modèle unique des étapes affichées dans la barre du parcours : il ne contient
 * AUCUN calcul, aucune donnée de projet et aucune règle métier — uniquement les
 * liens vers les modules déjà existants de BatiBuild.
 *
 * Le groupe est déterminé automatiquement à partir du type de projet enregistré
 * (`resolveProjectType` gère aussi les anciens slugs et les libellés libres) :
 *
 *   - **Groupe A** — projets neufs / immobiliers (maison, villa, appartement,
 *     studio, duplex, immeuble, local commercial, bureau, entrepôt, résidence
 *     touristique, projet immobilier neuf) : parcours complet en 6 étapes
 *     (coût estimatif → plans → choix matériaux → consultation → exécution →
 *     investissement) ;
 *   - **Groupe B** — tous les autres types (rénovation, extension, piscine,
 *     restaurant, café, travaux techniques…) : 3 étapes seulement
 *     (coût estimatif → consultation → fournisseurs).
 *
 * Chaque lien conserve le contexte du projet (`?project=…` ou `/:id`) : la
 * navigation ne recrée jamais de projet et ne perd aucune donnée.
 *
 * La page « Résultat de l'analyse IA » utilise en plus un parcours dédié
 * (`buildAiMaterialsResultJourney`) : le groupe A y remplace ses étapes par
 * « Coût estimatif → Fournisseur », le lien Fournisseur ouvrant l'annuaire des
 * fournisseurs pré-filtré par l'analyse.
 */

import { INVESTMENT_ELIGIBLE_TYPES, resolveProjectType } from "@/convex/projectTypes";

export type ProjectJourneyGroup = "A" | "B";

export type ProjectJourneyStepKey =
  | "cost"
  | "plans"
  | "materials"
  | "consult"
  | "execution"
  | "investment"
  | "supplier"
  | "suppliers";

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

/** Groupe A : types de projet au parcours complet. */
export const PROJECT_JOURNEY_GROUP_A: readonly string[] = INVESTMENT_ELIGIBLE_TYPES;

/** Groupe du projet déduit de son type enregistré (jamais choisi par l'utilisateur). */
export function projectJourneyGroup(category: string | null | undefined): ProjectJourneyGroup {
  const resolved = resolveProjectType((category ?? "").trim());
  return resolved && PROJECT_JOURNEY_GROUP_A.includes(resolved) ? "A" : "B";
}

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
    label: "Consultation",
    path: "/dashboard/professionals-directory",
    href: `/dashboard/professionals-directory?project=${pid}`,
  };

  // Groupe B — coût estimatif → consultation → fournisseurs.
  if (group === "B")
    return [
      cost,
      consult,
      {
        key: "suppliers",
        label: "Fournisseurs",
        path: SUPPLIERS_DIRECTORY_PATH,
        href: `/dashboard/suppliers-directory?project=${pid}`,
      },
    ];

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
    consult,
    {
      key: "execution",
      label: "Exécution",
      path: "/dashboard/guide",
      href: `/dashboard/guide?project=${pid}`,
    },
    {
      key: "investment",
      label: "Investissement",
      path: "/dashboard/investments",
      href: `/dashboard/investments?project=${pid}`,
    },
  ];
}

/** Route de l'annuaire des fournisseurs (page des fournisseurs trouvés). */
export const SUPPLIERS_DIRECTORY_PATH = "/dashboard/suppliers-directory";

/**
 * PARCOURS AFFICHÉ SUR LA PAGE « RÉSULTAT DE L'ANALYSE IA »
 *
 * Cette page ne déroule pas le parcours complet : elle met en avant le lien vers
 * l'annuaire des fournisseurs (les fournisseurs trouvés par l'analyse, filtrés
 * par région et par spécialités).
 *
 *   - **Groupe A** : « Coût estimatif → Fournisseur » ;
 *   - **Groupe B** : « Coût estimatif → Consultation » (inchangé ici : la page
 *     elle-même est déjà centrée sur les fournisseurs trouvés par l'analyse).
 */
export function buildAiMaterialsResultJourney(
  category: string | null | undefined,
  projectId: string | null | undefined,
  supplierHref?: string | null,
): ProjectJourneyStep[] {
  const raw = (projectId ?? "").trim();
  if (!raw) return [];
  const pid = encodeURIComponent(raw);

  const cost: ProjectJourneyStep = {
    key: "cost",
    label: "Coût estimatif",
    path: `/dashboard/project/${pid}`,
    href: `/dashboard/project/${pid}`,
  };

  // Groupe B — parcours réduit (la page est déjà centrée sur les fournisseurs).
  if (projectJourneyGroup(category) !== "A") {
    return [
      cost,
      {
        key: "consult",
        label: "Consultation",
        path: "/dashboard/professionals-directory",
        href: `/dashboard/professionals-directory?project=${pid}`,
      },
    ];
  }

  // Groupe A — « Coût estimatif → Fournisseur ».
  const href = (supplierHref ?? "").trim() || SUPPLIERS_DIRECTORY_PATH;
  return [
    cost,
    {
      key: "supplier",
      label: "Fournisseur",
      path: SUPPLIERS_DIRECTORY_PATH,
      href,
    },
  ];
}
