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
 *   - **Groupe A** — parcours complet en 6 étapes, exclusivement pour :
 *     Maison, Appartement, Villa, Immeuble, Local commercial, Studio, Duplex,
 *     Bureau, Entrepôt, Résidence touristique, Projet immobilier neuf,
 *     Restaurant, Café, Rénovation complète. Ordre obligatoire :
 *       1. Type de projet
 *       2. Coût estimatif
 *       3. Aide à la décision
 *       4. Plans architecturaux AI
 *       5. Mise en relation
 *       6. Exécution & suivi
 *   - **Groupe B** — TOUS les autres types (piscine, clôture, jardin, extension,
 *     cuisine, salle de bain, peinture, travaux techniques…) : parcours
 *     simplifié en 3 étapes :
 *       1. Type de projet
 *       2. Coût estimatif
 *       3. Mise en relation
 *     « Aide à la décision », « Plans architecturaux AI » et « Exécution &
 *     suivi » sont totalement absentes de ce parcours.
 *
 * L'étape « Matériaux utilisés » a été SUPPRIMÉE de l'application : elle
 * n'existe plus ni comme page, ni comme route, ni comme étape du parcours. Les
 * données qui l'alimentaient (quantitatif détaillé, articles, quantités, prix
 * TTC) restent intactes et continuent d'alimenter le coût estimatif, l'aide à
 * la décision et la mise en relation avec les fournisseurs.
 *
 * Les étapes « Aide à la décision », « Plans architecturaux AI » et
 * « Exécution & suivi » sont RÉSERVÉES au groupe A : elles ne sont ni
 * affichées, ni atteignables par « Suivant » pour un projet du groupe B.
 * L'accès direct à leurs URL est également refusé (voir
 * `canAccessJourneyStep`, utilisé par les pages Plans et Exécution, et
 * `decisionSupportAccess` pour l'aide à la décision, contrôlée aussi côté
 * serveur).
 *
 * Une étape absente du groupe n'est jamais rendue : ni libellé, ni lien, ni
 * indicateur de progression — il n'y a donc aucun espace vide ni entrée
 * désactivée. La classification ne dépend que du type de projet enregistré
 * (aucune intervention de l'administrateur) et se recalcule à chaque changement
 * de catégorie : modifier le type d'un projet met immédiatement à jour son
 * parcours, sans recréer le projet ni réinitialiser ses données.
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

import { resolveProjectType } from "../convex/projectTypes";

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
  | "type"
  | "cost"
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
 * Groupe A : les 14 types de projet au parcours complet (6 étapes).
 *
 * Liste fermée, distincte des autres éligibilités de la plateforme : elle
 * appartient EXCLUSIVEMENT au Project Journey. Toute catégorie absente de cette
 * liste appartient automatiquement au groupe B.
 */
export const PROJECT_JOURNEY_GROUP_A: readonly string[] = [
  "maison",
  "appartement",
  "villa",
  "immeuble",
  "local_commercial",
  "studio",
  "duplex",
  "bureau",
  "entrepot",
  "residence_touristique",
  "projet_neuf",
  "restaurant",
  "cafe",
  "renovation_complete",
];

/** Groupe du projet déduit de son type enregistré (jamais choisi par l'utilisateur). */
export function projectJourneyGroup(category: string | null | undefined): ProjectJourneyGroup {
  const resolved = resolveProjectType((category ?? "").trim());
  return resolved && PROJECT_JOURNEY_GROUP_A.includes(resolved) ? "A" : "B";
}

/** Étapes réservées au parcours complet (groupe A). */
export const GROUP_A_ONLY_STEPS = ["decision", "plans", "execution"] as const;

/**
 * Une étape est-elle autorisée pour ce projet ?
 *
 * Source unique utilisée par la navigation ET par les pages cibles : les
 * étapes « Aide à la décision », « Plans architecturaux AI » et « Exécution &
 * suivi » sont réservées au groupe A. Un projet du groupe B ne peut donc jamais
 * les atteindre, même par une URL enregistrée ou un lien direct.
 */
export function canAccessJourneyStep(
  category: string | null | undefined,
  step: ProjectJourneyStepKey,
): boolean {
  if (!(GROUP_A_ONLY_STEPS as readonly string[]).includes(step)) return true;
  return projectJourneyGroup(category) === "A";
}

/**
 * Libellés des étapes du parcours pour un type de projet, SANS contexte de
 * projet.
 *
 * Utilisé par les indicateurs de progression affichés avant que le projet
 * n'existe ou ne soit chargé (écran de chargement de la création) : un projet
 * du groupe B n'y voit jamais apparaître « Aide à la décision », « Plans
 * architecturaux AI » ni « Exécution & suivi ». L'ordre provient du même
 * constructeur que le Journey, donc aucune duplication de règle.
 */
export function projectJourneyStepLabels(
  category: string | null | undefined,
): string[] {
  // Identifiant de repère uniquement : seuls les libellés sont conservés.
  return buildProjectJourney(category, "projet").map((step) => step.label);
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

  // Étape 1 — type de projet et informations générales. Elle ouvre le parcours
  // pour les deux groupes. L'ancre `#type-de-projet` pointe vers la fiche
  // d'informations du projet (le type y est affiché), sans recréer de projet.
  const type: ProjectJourneyStep = {
    key: "type",
    label: "Type de projet",
    path: `/dashboard/project/${pid}#type-de-projet`,
    href: `/dashboard/project/${pid}#type-de-projet`,
    reportKey: null,
  };

  // Étape 2 — estimation détaillée du coût. Le chemin sans ancre sert de
  // repère d'étape active sur la page projet.
  const cost: ProjectJourneyStep = {
    key: "cost",
    label: "Coût estimatif",
    path: `/dashboard/project/${pid}`,
    href: `/dashboard/project/${pid}`,
    reportKey: "cost",
  };

  // Étape 4 (groupe A) — plans architecturaux + plans techniques. Réservée au
  // groupe A : la page refuse l'accès direct pour les autres types.
  const plans: ProjectJourneyStep = {
    key: "plans",
    label: "Plans architecturaux AI",
    path: `/dashboard/plans/${pid}`,
    href: `/dashboard/plans/${pid}`,
    reportKey: "plans",
  };

  // « Aide à la décision » est une page DÉDIÉE (`DECISION_PAGE_PATH`) qui
  // affiche uniquement le résultat déjà généré par l'Intelligence prédictive :
  // elle est retirée de la page de résultat « Coût estimatif ». Son lien
  // conserve le contexte du projet (`/:id`). Étape EXCLUSIVE au groupe A :
  // elle est absente du parcours du groupe B (accès refusé aussi côté serveur).
  // Les projets du groupe B comme les comptes sans Client Pro actif ne sont
  // jamais bloqués : le parcours saute directement à l'étape autorisée
  // suivante (« Mise en relation »).
  const decision: ProjectJourneyStep = {
    key: "decision",
    label: "Aide à la décision",
    path: `/dashboard/decision/${pid}`,
    href: `/dashboard/decision/${pid}`,
    // Aucun rapport PDF propre : l'étape affiche un résultat déjà calculé.
    reportKey: null,
  };

  const consult: ProjectJourneyStep = {
    key: "consult",
    label: "Mise en relation",
    path: "/dashboard/professionals-directory",
    href: `/dashboard/professionals-directory?project=${pid}`,
    reportKey: null,
  };

  // Étape 6 (groupe A) — suivi de l'avancement, du budget et de l'exécution.
  // Réservée au groupe A : la page refuse l'accès direct pour les autres types.
  const execution: ProjectJourneyStep = {
    key: "execution",
    label: "Exécution & suivi",
    path: "/dashboard/guide",
    href: `/dashboard/guide?project=${pid}`,
    reportKey: "execution",
  };

  // Groupe B — parcours simplifié : Type de projet → Coût estimatif → Mise en
  // relation. Ni « Aide à la décision », ni « Plans architecturaux AI », ni
  // « Exécution & suivi » : les étapes absentes ne sont PAS rendues (aucun
  // bouton, lien ou indicateur résiduel) et « Suivant » saute directement à
  // l'étape autorisée suivante, sans blocage du reste du projet.
  if (group === "B") {
    return filterDisabledSteps([type, cost, consult], flags);
  }

  // Groupe A — parcours complet (6 étapes), dans l'ordre obligatoire :
  //   1. Type de projet → 2. Coût estimatif → 3. Aide à la décision
  //   → 4. Plans architecturaux AI → 5. Mise en relation → 6. Exécution & suivi.
  return filterDisabledSteps([type, cost, decision, plans, consult, execution], flags);
}

/** Route de l'annuaire des fournisseurs (page des fournisseurs trouvés). */
export const SUPPLIERS_DIRECTORY_PATH = "/dashboard/suppliers-directory";

/** Route de la page dédiée « Aide à la décision » (Intelligence prédictive IA). */
export const DECISION_PAGE_PATH = "/dashboard/decision";

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
