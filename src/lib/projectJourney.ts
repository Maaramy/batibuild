/**
 * PARCOURS DU PROJET — modèle des étapes du Journey
 *
 * Modèle unique des étapes affichées dans le parcours : il ne contient AUCUN
 * calcul, aucune donnée de projet et aucune règle métier — uniquement les liens
 * vers les modules déjà existants de batibuild, le libellé de chaque étape et
 * la clé du rapport PDF associé (lorsqu'un rapport existe).
 *
 * CLASSIFICATION CENTRALE — le groupe est déterminé UNIQUEMENT par le type de
 * projet enregistré (`category`). Le nom du projet, sa description ou le
 * parcours choisi par l'utilisateur n'interviennent jamais :
 *
 *   - **Groupes A et D** — parcours complet avec plans architecturaux AI
 *     (5 étapes) :
 *     * Groupe A : Maison, Appartement, Villa, Immeuble, Local, Studio,
 *       Duplex, Résidence touristique, Projet immobilier neuf, Rénovation
 *       complète ;
 *     * Groupe D (locaux professionnels) : Local commercial, Bureau, Entrepôt,
 *       Restaurant, Café.
 *       1. Coût estimatif
 *       2. Plans architecturaux AI
 *       3. Aide à la décision (Client Pro)
 *       4. Mise en relation
 *       5. Exécution & Suivi
 *   - **Groupes B et C** — parcours simplifié (2 étapes) :
 *     * Groupe B : Rénovation cuisine, Rénovation salle de bain, Piscine,
 *       Extension bâtiment ;
 *     * Groupe C : tous les autres projets.
 *       1. Coût estimatif
 *       2. Mise en relation
 *     Ni « Aide à la décision », ni « Plans architecturaux AI », ni
 *     « Exécution & Suivi » : ces étapes intermédiaires ne sont ni rendues, ni
 *     atteignables (URL directe ou bouton de retour).
 *
 * Les distinctions suivantes sont IMPÉRATIVES et reposent sur une comparaison
 * de type canonique (jamais sur une recherche de sous-chaîne) :
 *   « Local » (A) ≠ « Local commercial » (D) ;
 *   « Rénovation complète » (A) ≠ « Rénovation cuisine » / « Rénovation salle
 *   de bain » (B) ;
 *   « Extension bâtiment » (B).
 *
 * Un projet n'appartient qu'à UN seul groupe. Une étape absente du groupe n'est
 * jamais rendue : ni libellé, ni lien, ni indicateur de progression. Les étapes
 * réservées sont également refusées en accès direct (`canAccessJourneyStep`,
 * utilisé par les pages Plans, Aide à la décision et Exécution). Les groupes A
 * et D conservent les cinq étapes ; les groupes B et C partagent exactement le
 * même parcours en deux étapes.
 *
 * Chaque lien conserve le contexte du projet (`?project=…` ou `/:id`) : la
 * navigation ne recrée jamais de projet et ne perd aucune donnée.
 *
 * Les étapes sont également pilotées par les feature flags de l'administration
 * (`featureFlags` Convex) : une étape dont le module est désactivé disparaît du
 * Journey (les autres conservent leur ordre) et réapparaît dès réactivation.
 * Sans état de flags fourni, toutes les étapes restent affichées.
 *
 * La page « Résultat de l'analyse IA » utilise en plus un parcours dédié
 * (`buildAiMaterialsResultJourney`) : « Coût estimatif → Liste prix →
 * Fournisseur ».
 */

import { resolveProjectType } from "../convex/projectTypes";

export type ProjectJourneyGroup = "A" | "B" | "C" | "D";

/** Groupes au parcours complet (5 étapes, dont les plans architecturaux AI). */
export const FULL_JOURNEY_GROUPS: readonly ProjectJourneyGroup[] = ["A", "D"];

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

/* ---------------------------------------------------------------------------- *
 * CLASSIFICATION CENTRALE PAR TYPE DE PROJET
 * ---------------------------------------------------------------------------- */

/**
 * Groupe A — projets avec plans architecturaux AI (5 étapes).
 * Liste fermée, distincte des autres éligibilités de la plateforme : elle
 * appartient EXCLUSIVEMENT au Project Journey.
 */
export const PROJECT_JOURNEY_GROUP_A: readonly string[] = [
  "maison",
  "appartement",
  "villa",
  "immeuble",
  // « Local » (projet de bâtiment) — DISTINCT de « Local commercial » (D).
  "local",
  "studio",
  "duplex",
  "residence_touristique",
  "projet_neuf",
  "renovation_complete",
];

/**
 * Groupe D — locaux professionnels : parcours complet en 5 étapes, identique
 * à celui du groupe A (coût estimatif → plans architecturaux AI →
 * aide à la décision → mise en relation → exécution & suivi).
 *
 * Ces cinq types sont des bâtiments à usage professionnel : plans AI et
 * accompagnement de chantier leur sont aussi utiles qu'à un logement.
 */
export const PROJECT_JOURNEY_GROUP_D: readonly string[] = [
  // « Local commercial » — DISTINCT de « Local » (A).
  "local_commercial",
  "bureau",
  "entrepot",
  "restaurant",
  "cafe",
];

/**
 * Groupe B — projets au parcours simplifié (2 étapes) : coût estimatif puis
 * mise en relation. Aucune étape intermédiaire (aide à la décision, plans
 * architecturaux AI, exécution & suivi).
 */
export const PROJECT_JOURNEY_GROUP_B: readonly string[] = [
  "renovation_cuisine",
  "renovation_salle_de_bain",
  "piscine",
  "extension_batiment",
];

/** Normalise un libellé libre : minuscules, sans accents ni séparateurs. */
function normalizeCategoryLabel(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_.-]+/g, "");
}

/**
 * Libellés libres reconnus pour la classification, en plus des slugs et des
 * alias du catalogue. La comparaison se fait sur le libellé NORMALISÉ (sans
 * accents, espaces ni séparateurs) : chaque libellé désigne UN seul type, ce
 * qui garantit qu'une « Rénovation cuisine » n'est jamais confondue avec une
 * « Rénovation complète », ni un « Local commercial » avec un « Local ».
 */
const JOURNEY_LABEL_ALIASES: Record<string, string> = {
  local: "local",
  localcommercial: "local_commercial",
  renovationcomplete: "renovation_complete",
  renovationcuisine: "renovation_cuisine",
  renovationsalledebain: "renovation_salle_de_bain",
  extensionbatiment: "extension_batiment",
};

/**
 * Type canonique utilisé UNIQUEMENT pour la classification du parcours.
 *
 * - les slugs officiels et les anciens slugs sont résolus par
 *   `resolveProjectType` (source unique du catalogue) ;
 * - « Local » est reconnu comme type à part entière (groupe A), sans être
 *   confondu avec « Local commercial » ;
 * - les anciens slugs de piscine (`piscine_beton`, `piscine_coque`) restent
 *   des projets « piscine » (groupe B) — la résolution métier les remappe vers
 *   « villa » pour les moteurs, ce qui ne doit pas changer leur parcours.
 */
function journeyCategory(category: string | null | undefined): string {
  const raw = (category ?? "").trim();
  if (!raw) return "";
  const normalized = normalizeCategoryLabel(raw);
  if (normalized.startsWith("piscine")) return "piscine";
  const alias = JOURNEY_LABEL_ALIASES[normalized];
  if (alias) return alias;
  return resolveProjectType(raw) ?? "";
}

/**
 * Groupe du projet déduit de son type enregistré (jamais choisi par
 * l'utilisateur, jamais du nom du projet).
 */
export function projectJourneyGroup(
  category: string | null | undefined,
): ProjectJourneyGroup {
  const canonical = journeyCategory(category);
  if (PROJECT_JOURNEY_GROUP_A.includes(canonical)) return "A";
  if (PROJECT_JOURNEY_GROUP_D.includes(canonical)) return "D";
  if (PROJECT_JOURNEY_GROUP_B.includes(canonical)) return "B";
  // Tout type absent des autres listes appartient au groupe C.
  return "C";
}

/**
 * Ce groupe suit-il le parcours complet (5 étapes) ?
 * Source unique des gardes « étape présente dans le parcours » côté pages et
 * côté serveur (aide à la décision, rapports PDF, actions rapides).
 */
export function isFullJourneyGroup(group: ProjectJourneyGroup): boolean {
  return FULL_JOURNEY_GROUPS.includes(group);
}

/**
 * Groupes autorisés pour chaque étape du parcours.
 *
 * Source unique utilisée par la navigation ET par les pages cibles : une étape
 * absente du groupe du projet est refusée même par une URL enregistrée ou un
 * lien direct.
 */
export const JOURNEY_STEP_GROUPS: Partial<
  Record<ProjectJourneyStepKey, readonly ProjectJourneyGroup[]>
> = {
  cost: ["A", "B", "C", "D"],
  // Les groupes B et C s'arrêtent au coût estimatif puis à la mise en relation.
  // Les groupes A et D ont le parcours complet.
  decision: ["A", "D"],
  plans: ["A", "D"],
  consult: ["A", "B", "C", "D"],
  execution: ["A", "D"],
};

/** Étapes réservées au parcours complet (groupes A et D) — plans AI. */
export const GROUP_A_ONLY_STEPS = ["plans"] as const;

/** Une étape est-elle autorisée pour ce projet ? (source unique) */
export function canAccessJourneyStep(
  category: string | null | undefined,
  step: ProjectJourneyStepKey,
): boolean {
  const allowed = JOURNEY_STEP_GROUPS[step];
  // Étape historique / inconnue : aucune restriction (aucune page ne l'utilise).
  if (!allowed) return true;
  return allowed.includes(projectJourneyGroup(category));
}

/** Cette étape fait-elle partie du parcours du groupe ? */
export function isJourneyStepInGroup(
  group: ProjectJourneyGroup,
  step: ProjectJourneyStepKey,
): boolean {
  const allowed = JOURNEY_STEP_GROUPS[step];
  return !allowed || allowed.includes(group);
}

/**
 * ÉTAPES DE CHARGEMENT DU CALCUL « COÛT ESTIMATIF »
 *
 * Liste affichée par l'écran de chargement animé pendant le calcul et la
 * génération des résultats de l'estimation : elle reprend EXACTEMENT les étapes
 * du parcours réel du projet, sans étape supplémentaire.
 *
 * Le composant de chargement et son design ne sont pas modifiés : seule cette
 * liste, sélectionnée d'après le type de projet, change.
 */
export const COST_ESTIMATE_LOADING_STEPS: Record<
  ProjectJourneyGroup,
  readonly string[]
> = {
  A: [
    "Coût estimatif",
    "Plans architecturaux AI",
    "Aide à la décision",
    "Mise en relation",
    "Exécution & Suivi",
  ],
  D: [
    "Coût estimatif",
    "Plans architecturaux AI",
    "Aide à la décision",
    "Mise en relation",
    "Exécution & Suivi",
  ],
  B: ["Coût estimatif", "Mise en relation"],
  C: ["Coût estimatif", "Mise en relation"],
};

/** Étapes de chargement de l'estimation pour un type de projet donné. */
export function costEstimateLoadingSteps(
  category: string | null | undefined,
): string[] {
  return [...COST_ESTIMATE_LOADING_STEPS[projectJourneyGroup(category)]];
}

/**
 * ÉTAPES DE CHARGEMENT « AIDE À LA DÉCISION »
 *
 * Même écran, même design et même animation que le chargement des résultats
 * d'estimation (`EstimateLoadingScreen`) ; seuls les intitulés décrivent le
 * traitement réellement exécuté par le module d'aide à la décision : analyse du
 * quantitatif, prix & matériaux, capacité de construction, plan de construction
 * et optimisation budgétaire. Aucun montant n'est calculé ici.
 */
export const DECISION_SUPPORT_LOADING_STEPS = [
  "Analyse du Quantitatif",
  "Prix & matériaux",
  "Capacité de construction",
  "Plan de construction",
  "Optimisation budgétaire",
] as const;

/** Étapes de chargement affichées par la page « Aide à la décision ». */
export function decisionSupportLoadingSteps(): string[] {
  return [...DECISION_SUPPORT_LOADING_STEPS];
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

  // ── Coût estimatif — première étape de TOUS les parcours. Le chemin sans
  // ancre sert de repère d'étape active sur la page projet.
  const cost: ProjectJourneyStep = {
    key: "cost",
    label: "Coût estimatif",
    path: `/dashboard/project/${pid}`,
    href: `/dashboard/project/${pid}`,
    reportKey: "cost",
  };

  // ── Plans architecturaux AI (groupes A et D uniquement) — deuxième étape.
  // La page et les plans exploitent les dimensions, les niveaux et les surfaces
  // calculées lors de l'estimation du coût.
  const plans: ProjectJourneyStep = {
    key: "plans",
    label: "Plans architecturaux AI",
    path: `/dashboard/plans/${pid}`,
    href: `/dashboard/plans/${pid}`,
    reportKey: "plans",
  };

  // ── Aide à la décision (groupes A et D uniquement) — troisième étape. Page
  // DÉDIÉE (`DECISION_PAGE_PATH`) qui affiche uniquement le résultat déjà généré
  // par l'Intelligence prédictive (montant exact du scénario choisi dans le coût
  // estimatif). Elle reste réservée aux abonnés Client Pro : la restriction
  // d'abonnement est vérifiée côté serveur (`decisionSupportAccess`), tandis que
  // l'absence de l'étape pour les groupes B et C est décidée ici.
  const decision: ProjectJourneyStep = {
    key: "decision",
    label: "Aide à la décision",
    path: `/dashboard/decision/${pid}`,
    href: `/dashboard/decision/${pid}`,
    // Aucun rapport PDF propre : l'étape affiche un résultat déjà calculé.
    reportKey: null,
  };

  // ── Mise en relation — quatrième étape : annuaire des professionnels, contexte
  // du projet conservé (le budget validé et les choix suivent le projet).
  const consult: ProjectJourneyStep = {
    key: "consult",
    label: "Mise en relation",
    path: "/dashboard/professionals-directory",
    href: `/dashboard/professionals-directory?project=${pid}`,
    reportKey: null,
  };

  // ── Exécution & suivi (groupes A et D uniquement) — suivi de l'avancement, du
  // budget et de l'exécution du projet sélectionné.
  const execution: ProjectJourneyStep = {
    key: "execution",
    label: "Exécution & Suivi",
    path: "/dashboard/guide",
    href: `/dashboard/guide?project=${pid}`,
    reportKey: "execution",
  };

  // Groupes B et C — parcours simplifié : Coût estimatif → Mise en relation.
  // Aucune étape « Aide à la décision », « Plans architecturaux AI » ou
  // « Exécution & Suivi » : elles ne sont ni rendues, ni atteignables (le
  // bouton « Suivant » du coût estimatif ouvre directement la mise en
  // relation).
  if (!isFullJourneyGroup(group)) {
    return filterDisabledSteps([cost, consult], flags);
  }

  // Groupes A et D — parcours complet en 5 étapes, dans l'ordre obligatoire :
  //   Coût estimatif → Plans architecturaux AI → Aide à la décision →
  //   Mise en relation → Exécution & Suivi.
  // « Suivant » depuis le coût estimatif ouvre donc directement les plans, et
  // « Suivant » depuis les plans ouvre l'aide à la décision.
  return filterDisabledSteps([cost, plans, decision, consult, execution], flags);
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
 * **identique pour tous les types de projet** (le groupe n'intervient pas) :
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
