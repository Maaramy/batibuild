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
 * Les étapes sont également pilotées par les feature flags de l'administration
 * (`featureFlags` Convex) : une étape dont le module est désactivé disparaît de
 * la barre (les autres conservent leur ordre) et réapparaît dès réactivation.
 * Sans état de flags fourni, toutes les étapes restent affichées.
 *
 * La page « Résultat de l'analyse IA » utilise en plus un parcours dédié
 * (`buildAiMaterialsResultJourney`) : « Coût estimatif → Liste prix →
 * Fournisseur ». « Liste prix » ouvre la page « Matériaux de construction » et
 * « Fournisseur » l'annuaire des fournisseurs pré-filtré par l'analyse.
 */

import { INVESTMENT_ELIGIBLE_TYPES, resolveProjectType } from "@/convex/projectTypes";

export type ProjectJourneyGroup = "A" | "B";

/**
 * État des feature flags (map `getFlagsMap` de Convex). Une clé absente ou un
 * état non chargé = fonctionnalité considérée comme activée (comportement
 * identique au repli local de `use-feature-flags`).
 */
export type ProjectJourneyFlags = Record<string, boolean> | null | undefined;

/** Clés de feature flags qui pilotent les étapes du parcours. */
export const JOURNEY_FLAG_KEYS = {
  cost: "construction_cost_estimation",
  plans: "architectural_plans",
  materials: "ai_materials",
  priceList: "ai_materials",
  investment: "investment_project",
} as const;

/**
 * Une étape est affichée si le flag qui pilote son module est activé.
 * Sans état fourni (chargement en cours, appel historique sans flags), toutes
 * les étapes restent affichées — aucune régression.
 */
function isFlagEnabled(flags: ProjectJourneyFlags, key: string): boolean {
  return flags?.[key] ?? true;
}

/** Filtre les étapes dont le module est désactivé (l'ordre est conservé). */
function filterDisabledSteps(
  steps: ProjectJourneyStep[],
  flags: ProjectJourneyFlags,
): ProjectJourneyStep[] {
  return steps.filter((step) => {
    const flagKey = JOURNEY_FLAG_KEYS[step.key as keyof typeof JOURNEY_FLAG_KEYS];
    return !flagKey || isFlagEnabled(flags, flagKey);
  });
}

export type ProjectJourneyStepKey =
  | "cost"
  | "plans"
  | "materials"
  | "priceList"
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
 *
 * `flags` (optionnel) : état des feature flags de l'administration — les
 * étapes correspondant à un module désactivé sont retirées de la barre (l'ordre
 * des étapes restantes est conservé) et reviennent dès réactivation.
 */
export function buildProjectJourney(
  category: string | null | undefined,
  projectId: string | null | undefined,
  flags?: ProjectJourneyFlags,
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
    return filterDisabledSteps(
      [
        cost,
        consult,
        {
          key: "suppliers",
          label: "Fournisseurs",
          path: SUPPLIERS_DIRECTORY_PATH,
          href: `/dashboard/suppliers-directory?project=${pid}`,
        },
      ],
      flags,
    );

  // Groupe A — parcours complet.
  return filterDisabledSteps(
    [
      cost,
      {
        key: "plans",
        label: "Plan IA",
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
        label: "Exécution & suivi",
        path: "/dashboard/guide",
        href: `/dashboard/guide?project=${pid}`,
      },
      {
        key: "investment",
        label: "Investissement",
        path: "/dashboard/investments",
        href: `/dashboard/investments?project=${pid}`,
      },
    ],
    flags,
  );
}

/** Route de l'annuaire des fournisseurs (page des fournisseurs trouvés). */
export const SUPPLIERS_DIRECTORY_PATH = "/dashboard/suppliers-directory";

/** Route de la liste des prix — page « Matériaux de construction ». */
export const MATERIALS_PAGE_PATH = "/dashboard/materials";

/**
 * PARCOURS AFFICHÉ SUR LA PAGE « RÉSULTAT DE L'ANALYSE IA »
 *
 * Cette page ne déroule pas le parcours complet : elle suit un ordre fixe,
 * **identique pour tous les types de projet** (le type n'intervient pas) :
 *
 *   1. « Coût estimatif » → résultats d'estimation du projet ;
 *   2. « Liste prix » → page existante « Matériaux de construction » ;
 *   3. « Fournisseur » → annuaire des fournisseurs trouvés par l'analyse
 *      (filtré par région et par spécialités lorsqu'un lien est fourni).
 */
export function buildAiMaterialsResultJourney(
  projectId: string | null | undefined,
  supplierHref?: string | null,
  flags?: ProjectJourneyFlags,
): ProjectJourneyStep[] {
  const raw = (projectId ?? "").trim();
  if (!raw) return [];
  const pid = encodeURIComponent(raw);

  return filterDisabledSteps(
    [
      {
        key: "cost",
        label: "Coût estimatif",
        path: `/dashboard/project/${pid}`,
        href: `/dashboard/project/${pid}`,
      },
      {
        key: "priceList",
        label: "Liste prix",
        path: MATERIALS_PAGE_PATH,
        href: `${MATERIALS_PAGE_PATH}?project=${pid}`,
      },
      {
        key: "supplier",
        label: "Fournisseur",
        path: SUPPLIERS_DIRECTORY_PATH,
        // Annuaire pré-filtré par l'analyse lorsqu'il est fourni.
        href: (supplierHref ?? "").trim() || SUPPLIERS_DIRECTORY_PATH,
      },
    ],
    flags,
  );
}
