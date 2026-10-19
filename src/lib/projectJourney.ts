/**
 * PARCOURS DU PROJET — modèle des étapes du Journey
 *
 * Modèle unique des étapes affichées dans le parcours : il ne contient AUCUN
 * calcul, aucune donnée de projet et aucune règle métier — uniquement les liens
 * vers les modules déjà existants de batibuild, le libellé de chaque étape et
 * la clé du rapport PDF associé (lorsqu'un rapport existe).
 *
 * Le groupe est déterminé automatiquement à partir du type de projet enregistré
 * (`resolveProjectType` gère aussi les anciens slugs et les libellés libres) :
 *
 *   - **Groupe A** — projets neufs / immobiliers (maison, villa, appartement,
 *     studio, duplex, immeuble, local commercial, bureau, entrepôt,
 *     résidence touristique, projet immobilier neuf) : parcours complet en 6
 *     étapes :
 *       1. Coût estimatif
 *       2. Matériaux utilisés
 *       3. Aide à la décision
 *       4. Plans architecturaux AI
 *       5. Mise en relation
 *       6. Exécution & suivi
 *   - **Groupe B** — tous les autres types (rénovation, extension, piscine,
 *     restaurant, café, travaux techniques…) : parcours simplifié en 4 étapes
 *     (coût estimatif → matériaux utilisés → aide à la décision → mise en
 *     relation).
 *
 * Une étape absente du groupe n'est jamais rendue : ni libellé, ni lien, ni
 * indicateur de progression — il n'y a donc aucun espace vide ni entrée
 * désactivée. La classification ne dépend que du type de projet enregistré
 * (aucune intervention de l'administrateur) et se recalcule à chaque changement
 * de catégorie.
 *
 * Chaque lien conserve le contexte du projet (`?project=…` ou `/:id`) : la
 * navigation ne recrée jamais de projet et ne perd aucune donnée.
 *
 * Les étapes sont également pilotées par les feature flags de l'administration
 * (`featureFlags` Convex) : une étape dont le module est désactivé disparaît du
 * Journey (les autres conservent leur ordre) et réapparaît dès réactivation. Le
 * nombre total d'étapes affiché par le Journey est recalculé automatiquement à
 * partir des étapes réellement visibles. Sans état de flags fourni, toutes les
 * étapes restent affichées.
 *
 * La page « Résultat de l'analyse IA » utilise en plus un parcours dédié
 * (`buildAiMaterialsResultJourney`) : « Coût estimatif → Liste prix →
 * Fournisseur ».
 */

import { resolveProjectType } from "@/convex/projectTypes";

export type ProjectJourneyGroup = "A" | "B";

/** Clé d'un module de rapport PDF du Journey (voir `reportRegistry`). */
export type ProjectJourneyReportKey =
  | "cost"
  | "plans"
  | "materials"
  | "execution";

/**
 * État des feature flags (map `getFlagsMap` de Convex). Une clé absente ou un
 * état non chargé = fonctionnalité considérée comme activée (comportement
 * identique au repli local de `use-feature-flags`).
 */
export type ProjectJourneyFlags = Record<string, boolean> | null | undefined;

/** Clés de feature flags qui pilotent les étapes du parcours. */
export const JOURNEY_FLAG_KEYS = {
  cost: "construction_cost_estimation",
  // « Matériaux utilisés » est dérivée du Quantitatif détaillé (DQE) et du
  // résultat d'estimation : elle suit donc l'activation du module de coût.
  materialsUsed: "construction_cost_estimation",
  // « Aide à la décision » est une page dédiée qui exploite le résultat déjà
  // calculé du « Coût estimatif » (Intelligence prédictive IA) : elle suit donc
  // l'activation du module de coût.
  decision: "construction_cost_estimation",
  plans: "architectural_plans",
  materials: "ai_materials",
  priceList: "ai_materials",
  execution: "construction_guide",
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
  | "materialsUsed"
  | "decision"
  | "plans"
  | "materials"
  | "priceList"
  | "consult"
  | "execution"
  | "supplier"
  | "suppliers";

export interface ProjectJourneyStep {
  key: ProjectJourneyStepKey;
  /** Libellé affiché dans le Journey. */
  label: string;
  /**
   * Route cible **sans** le contexte projet : sert uniquement à identifier
   * l'étape actuellement consultée (comparaison avec la route affichée).
   */
  path: string;
  /** Lien de navigation complet, contexte du projet inclus. */
  href: string;
  /**
   * Clé du module de rapport PDF associé à l'étape. `null` (ou absente)
   * lorsqu'aucun rapport n'existe pour cette étape : l'icône PDF est alors
   * affichée en état « non disponible » (jamais de faux rapport).
   */
  reportKey?: ProjectJourneyReportKey | null;
}

/**
 * Groupe A : types de projet au parcours complet (6 étapes).
 *
 * Liste fermée, distincte des autres éligibilités de la plateforme : elle
 * appartient EXCLUSIVEMENT au Project Journey. Toute catégorie absente de cette
 * liste appartient automatiquement au groupe B.
 */
export const PROJECT_JOURNEY_GROUP_A: readonly string[] = [
  "maison",
  "villa",
  "appartement",
  "studio",
  "duplex",
  "immeuble",
  "local_commercial",
  "bureau",
  "entrepot",
  "residence_touristique",
  "projet_neuf",
];

/** Groupe du projet déduit de son type enregistré (jamais choisi par l'utilisateur). */
export function projectJourneyGroup(category: string | null | undefined): ProjectJourneyGroup {
  const resolved = resolveProjectType((category ?? "").trim());
  return resolved && PROJECT_JOURNEY_GROUP_A.includes(resolved) ? "A" : "B";
}

/**
 * Étapes du parcours pour un projet donné, dans l'ordre officiel.
 * Retourne un tableau vide si l'identifiant du projet est absent (le Journey
 * n'est alors pas affiché plutôt que d'afficher des liens sans contexte).
 *
 * `flags` (optionnel) : état des feature flags de l'administration — les
 * étapes correspondant à un module désactivé sont retirées (l'ordre des étapes
 * restantes est conservé) et reviennent dès réactivation.
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
    reportKey: "cost",
  };

  // « Matériaux utilisés » — articles, quantités et prix réels du projet
  // (DQE / BIM + scénario actif). Le lien conserve le contexte du projet ; le
  // bouton « Trouver le bon fournisseur » transmet ensuite ce contexte à
  // l'annuaire des fournisseurs.
  const materialsUsed: ProjectJourneyStep = {
    key: "materialsUsed",
    label: "Matériaux utilisés",
    path: `${MATERIALS_USED_PAGE_PATH}/${pid}`,
    href: `${MATERIALS_USED_PAGE_PATH}/${pid}`,
    // Aucun rapport PDF propre : le tableau est dérivé de l'estimation.
    reportKey: null,
  };

  const consult: ProjectJourneyStep = {
    key: "consult",
    label: "Mise en relation",
    path: "/dashboard/professionals-directory",
    href: `/dashboard/professionals-directory?project=${pid}`,
    reportKey: null,
  };

  // « Aide à la décision » est une page DÉDIÉE (`DECISION_PAGE_PATH`) qui
  // affiche uniquement le résultat déjà généré par l'Intelligence prédictive :
  // elle est retirée de la page de résultat « Coût estimatif ». Son lien
  // conserve le contexte du projet (`/:id`). Étape commune aux DEUX groupes.
  const decision: ProjectJourneyStep = {
    key: "decision",
    label: "Aide à la décision",
    path: `/dashboard/decision/${pid}`,
    href: `/dashboard/decision/${pid}`,
    // Aucun rapport PDF propre : l'étape affiche un résultat déjà calculé.
    reportKey: null,
  };

  // Étape exclusive du groupe A : la génération des plans d'architecte IA
  // s'appuie uniquement sur les données déjà enregistrées du projet.
  const plans: ProjectJourneyStep = {
    key: "plans",
    label: "Plans architecturaux AI",
    path: `/dashboard/plans/${pid}`,
    href: `/dashboard/plans/${pid}`,
    reportKey: "plans",
  };

  // Étape exclusive du groupe A.
  const execution: ProjectJourneyStep = {
    key: "execution",
    label: "Exécution & suivi",
    path: "/dashboard/guide",
    href: `/dashboard/guide?project=${pid}`,
    reportKey: "execution",
  };

  // Groupe B — parcours simplifié : coût estimatif → matériaux utilisés →
  // aide à la décision → mise en relation. Ni « Plans architecturaux AI », ni
  // « Exécution & suivi » : les étapes absentes ne sont PAS rendues (aucun
  // bouton, lien ou indicateur résiduel).
  if (group === "B") {
    return filterDisabledSteps([cost, materialsUsed, decision, consult], flags);
  }

  // Groupe A — parcours complet (6 étapes) :
  //   1. Coût estimatif → 2. Matériaux utilisés → 3. Aide à la décision →
  //   4. Plans architecturaux AI → 5. Mise en relation →
  //   6. Exécution & suivi.
  return filterDisabledSteps(
    [cost, materialsUsed, decision, plans, consult, execution],
    flags,
  );
}

/** Route de l'annuaire des fournisseurs (page des fournisseurs trouvés). */
export const SUPPLIERS_DIRECTORY_PATH = "/dashboard/suppliers-directory";

/** Route de la page dédiée « Aide à la décision » (Intelligence prédictive IA). */
export const DECISION_PAGE_PATH = "/dashboard/decision";

/**
 * Route de la page « Matériaux utilisés » — tableau des articles réellement
 * nécessaires au projet (DQE / BIM + scénario actif). Le contexte projet est
 * ajouté en suffixe (`/:id`).
 */
export const MATERIALS_USED_PAGE_PATH = "/dashboard/materials-used";

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
        reportKey: "cost",
      },
      {
        key: "priceList",
        label: "Liste prix",
        path: MATERIALS_PAGE_PATH,
        href: `${MATERIALS_PAGE_PATH}?project=${pid}`,
        reportKey: null,
      },
      {
        key: "supplier",
        label: "Fournisseur",
        path: SUPPLIERS_DIRECTORY_PATH,
        // Annuaire pré-filtré par l'analyse lorsqu'il est fourni.
        href: (supplierHref ?? "").trim() || SUPPLIERS_DIRECTORY_PATH,
        reportKey: null,
      },
    ],
    flags,
  );
}
