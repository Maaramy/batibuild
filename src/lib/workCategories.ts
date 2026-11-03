// ============================================================================
// MODE DE CONSTRUCTION — catégories de travaux du tunnel de création
// ----------------------------------------------------------------------------
// Étape « Mode de construction » (immédiatement après « Détails du projet ») :
// l'utilisateur coche les tâches qu'il souhaite construire. La sélection est
// enregistrée sur le projet (`projects.workCategories`) et l'estimation du coût
// de construction s'ajuste EXACTEMENT sur ces catégories.
//
// Les identifiants sont ceux des lots du moteur « Quantitatif détaillé »
// (`buildDqeLots` dans src/convex/dqeEngine.ts) : la sélection filtre donc les
// lots réels, sans table de correspondance approximative. Aucun import du
// moteur ici : le catalogue est statique pour ne pas alourdir le bundle client.
//
// RÈGLE DE COMPATIBILITÉ : un projet sans sélection enregistrée (tous les
// projets existants) n'est JAMAIS filtré — `active` vaut `false`.
// ============================================================================

/** Une catégorie de travaux proposée à l'utilisateur. */
export interface WorkCategoryOption {
  /** Identifiant du lot du moteur DQE (« gros_oeuvre », « vrd »…). */
  id: string;
  /** Libellé court affiché dans la liste. */
  label: string;
  /** Courte description : ce que couvre réellement la catégorie. */
  description: string;
  /** Cochée par défaut dans le tunnel. */
  defaultSelected: boolean;
}

/** Les deux catégories pré-sélectionnées exigées par le tunnel. */
export const DEFAULT_WORK_CATEGORY_IDS: readonly string[] = ["gros_oeuvre", "second_oeuvre"];

/**
 * Libellés + descriptions par identifiant de lot. Un même lot porte le même
 * sens dans tous les gabarits (« gros_oeuvre » reste le gros œuvre).
 */
const WORK_CATEGORY_TEXT: Record<string, { label: string; description: string }> = {
  frais_preliminaires: {
    label: "Études & frais préliminaires",
    description: "Plans d'exécution, permis de bâtir, étude de sol et frais administratifs.",
  },
  gros_oeuvre: {
    label: "Gros œuvre (fondations, structures)",
    description: "Terrassement, fondations, structure béton armé, murs porteurs et dalles.",
  },
  second_oeuvre: {
    label: "Second œuvre et finitions",
    description: "Cloisons, enduits, revêtements, menuiseries, peinture et finitions intérieures.",
  },
  amenagements_exterieurs: {
    label: "Aménagements extérieurs",
    description: "Clôture, portail, cour, terrasses et espaces verts autour du bâtiment.",
  },
  vrd: {
    label: "VRD et raccordements",
    description: "Voirie, réseaux d'eau, assainissement, électricité et raccordements au domaine public.",
  },
  terrassement: {
    label: "Terrassement",
    description: "Décapage, fouilles, remblais et évacuation des terres.",
  },
  depose_demolition: {
    label: "Dépose et démolition",
    description: "Démolition des ouvrages existants, dépose et évacuation des gravats.",
  },
  depose: {
    label: "Dépose et démolition",
    description: "Retrait des équipements et revêtements existants avant reprise.",
  },
  structure: {
    label: "Structure béton armé",
    description: "Ferraillage, coffrage et coulage de la structure porteuse.",
  },
  etancheite: {
    label: "Étanchéité",
    description: "Étanchéité des parois, dalles et points singuliers (cuvelage, relevés).",
  },
  equipements: {
    label: "Équipements techniques",
    description: "Climatisation, ventilation, sanitaires et appareils techniques.",
  },
  plomberie: {
    label: "Plomberie",
    description: "Alimentation en eau, évacuations et raccordements sanitaires.",
  },
  electricite: {
    label: "Électricité",
    description: "Tableau, câblage, appareillage, éclairage et mise à la terre.",
  },
  ventilation: {
    label: "Ventilation",
    description: "Extraction d'air, gaines et bouches de ventilation.",
  },
  carrelage: {
    label: "Carrelage et faïence",
    description: "Pose des revêtements de sol et de mur, plinthes et joints.",
  },
  sanitaires: {
    label: "Sanitaires",
    description: "WC, lavabos, douches, baignoires et appareils sanitaires.",
  },
  robinetterie: {
    label: "Robinetterie",
    description: "Mitigeurs, robinets et accessoires de salle de bain.",
  },
  peinture: {
    label: "Peinture",
    description: "Préparation des supports, impression et peinture des murs et plafonds.",
  },
  preparation: {
    label: "Préparation et protection",
    description: "Protection des ouvrages, rebouchage et préparation des supports.",
  },
  finition: {
    label: "Finitions",
    description: "Reprises, joints, retouches et finitions de détail.",
  },
  nettoyage_finition: {
    label: "Nettoyage et finition",
    description: "Nettoyage de fin de chantier et remise en état avant livraison.",
  },
  nettoyage: {
    label: "Nettoyage",
    description: "Nettoyage final des locaux et évacuation des déchets.",
  },
  filtration: {
    label: "Filtration et hydraulique",
    description: "Pompe, filtre, traitement de l'eau et réseau hydraulique.",
  },
  amenagements: {
    label: "Margelles, plage et abords",
    description: "Margelles, plage de piscine et aménagements autour du bassin.",
  },
  main_oeuvre: {
    label: "Main-d'œuvre",
    description: "Main-d'œuvre spécialisée facturée séparément des fournitures.",
  },
  facade: {
    label: "Façade et vitrine",
    description: "Ravalement, habillage de façade et vitrine commerciale.",
  },
  amenagement: {
    label: "Aménagement intérieur",
    description: "Agencement des espaces, comptoirs, cloisons et mobilier fixe.",
  },
  enseignes: {
    label: "Enseignes et équipements",
    description: "Enseigne, éclairage commercial et équipements d'exploitation.",
  },
  cloisons: {
    label: "Cloisons et faux plafonds",
    description: "Cloisons de distribution, doublages et faux plafonds.",
  },
  revetements: {
    label: "Revêtements",
    description: "Revêtements de sol et de mur des espaces professionnels.",
  },
  menuiserie: {
    label: "Menuiserie",
    description: "Portes, fenêtres et menuiseries intérieures et extérieures.",
  },
  cvc: {
    label: "CVC",
    description: "Chauffage, ventilation et climatisation des locaux.",
  },
  charpente: {
    label: "Charpente et couverture",
    description: "Charpente métallique, couverture et bardage.",
  },
  portes: {
    label: "Portes et sécurité",
    description: "Portes sectionnelles, issues de secours et dispositifs de sécurité.",
  },
  divers: {
    label: "VRD et divers",
    description: "Raccordements, voiries et petits ouvrages divers.",
  },
  tableau: {
    label: "Tableau électrique et protection",
    description: "Tableau, disjoncteurs et protections différentielles.",
  },
  cablage: {
    label: "Câblage et gaines",
    description: "Passage de câbles, gaines et boîtes de dérivation.",
  },
  appareillage: {
    label: "Appareillage",
    description: "Interrupteurs, prises et commandes.",
  },
  eclairage: {
    label: "Points lumineux",
    description: "Luminaires, points lumineux et commandes d'éclairage.",
  },
  terre: {
    label: "Mise à la terre",
    description: "Piquets, barrettes et liaisons de mise à la terre.",
  },
  essais: {
    label: "Essais et mise en service",
    description: "Vérifications, essais et mise en service des installations.",
  },
  alimentation: {
    label: "Alimentation en eau",
    description: "Tuyauteries d'alimentation, nourrices et vannes.",
  },
  evacuation: {
    label: "Évacuation",
    description: "Réseaux d'évacuation des eaux usées et ventilations primaires.",
  },
  chauffe_eau: {
    label: "Chauffe-eau",
    description: "Production d'eau chaude sanitaire et raccordements.",
  },
  coque: {
    label: "Coque préfabriquée",
    description: "Bassin préfabriqué, livraison et pose.",
  },
};

/** Lots du gabarit résidentiel (11 types de construction neuf). */
const RESIDENTIAL_LOTS = [
  "frais_preliminaires",
  "gros_oeuvre",
  "second_oeuvre",
  "amenagements_exterieurs",
  "vrd",
] as const;

/** Lots du gabarit commercial (restaurant, café, local commercial). */
const COMMERCIAL_LOTS = [
  "frais_preliminaires",
  "gros_oeuvre",
  "facade",
  "amenagement",
  "electricite",
  "plomberie",
  "enseignes",
  "vrd",
] as const;

/**
 * Catégories réellement produites par le moteur DQE pour chaque type de projet
 * (relevées sur `buildDqeLots`) : l'étape n'affiche donc jamais une catégorie
 * qui n'existe pas dans l'estimation du type choisi.
 */
const WORK_LOTS_BY_CATEGORY: Record<string, readonly string[]> = {
  // ── Construction neuve ──
  maison: RESIDENTIAL_LOTS,
  villa: RESIDENTIAL_LOTS,
  appartement: RESIDENTIAL_LOTS,
  studio: RESIDENTIAL_LOTS,
  duplex: RESIDENTIAL_LOTS,
  immeuble: RESIDENTIAL_LOTS,
  residence_touristique: RESIDENTIAL_LOTS,
  projet_neuf: RESIDENTIAL_LOTS,
  extension_batiment: RESIDENTIAL_LOTS,
  // Anciens slugs résidentiels (rétro-compatibilité)
  maison_r_plus_1: RESIDENTIAL_LOTS,
  maison_r_plus_2: RESIDENTIAL_LOTS,
  immeuble_residentiel: RESIDENTIAL_LOTS,
  // ── Locaux professionnels ──
  local_commercial: COMMERCIAL_LOTS,
  restaurant: COMMERCIAL_LOTS,
  cafe: COMMERCIAL_LOTS,
  boutique_commerciale: COMMERCIAL_LOTS,
  bureau: ["frais_preliminaires", "gros_oeuvre", "cloisons", "revetements", "menuiserie", "electricite", "cvc", "vrd"],
  entrepot: ["frais_preliminaires", "terrassement", "gros_oeuvre", "charpente", "electricite", "portes", "divers"],
  // ── Rénovation / réhabilitation ──
  renovation_complete: [
    "frais_preliminaires",
    "depose_demolition",
    "gros_oeuvre",
    "second_oeuvre",
    "equipements",
    "nettoyage_finition",
  ],
  renovation_cuisine: ["frais_preliminaires", "gros_oeuvre", "second_oeuvre", "amenagements_exterieurs"],
  renovation_salle_de_bain: [
    "depose",
    "plomberie",
    "etancheite",
    "carrelage",
    "sanitaires",
    "robinetterie",
    "electricite",
    "ventilation",
    "peinture",
    "equipements",
  ],
  peinture_interieure: ["preparation", "peinture", "finition", "nettoyage"],
  // ── Ouvrages spécialisés ──
  piscine: ["frais_preliminaires", "terrassement", "structure", "etancheite", "filtration", "electricite", "amenagements", "main_oeuvre"],
  piscine_beton: ["frais_preliminaires", "terrassement", "structure", "etancheite", "filtration", "electricite", "amenagements", "main_oeuvre"],
  piscine_coque: ["frais_preliminaires", "terrassement", "coque", "filtration", "electricite", "amenagements", "main_oeuvre"],
  garage: ["frais_preliminaires", "terrassement", "gros_oeuvre", "second_oeuvre", "vrd"],
  electricite_complete: ["tableau", "cablage", "appareillage", "eclairage", "terre", "essais", "main_oeuvre"],
  installations_electricite: ["tableau", "cablage", "appareillage", "eclairage", "terre", "essais", "main_oeuvre"],
  plomberie_complete: ["alimentation", "evacuation", "sanitaires", "chauffe_eau", "essais", "main_oeuvre"],
  installations_sanitaires: ["alimentation", "evacuation", "sanitaires", "chauffe_eau", "essais", "main_oeuvre"],
};

/** Identifiants connus pour un type de projet (gabarit résidentiel par défaut). */
export function workCategoryIdsForType(category?: string | null): readonly string[] {
  const key = (category ?? "").trim();
  return WORK_LOTS_BY_CATEGORY[key] ?? RESIDENTIAL_LOTS;
}

/** Catégories proposées à l'utilisateur, dans l'ordre du gabarit du type. */
export function workCategoryOptions(category?: string | null): WorkCategoryOption[] {
  return workCategoryIdsForType(category).map((id) => {
    const text = WORK_CATEGORY_TEXT[id] ?? { label: id, description: "" };
    return {
      id,
      label: text.label,
      description: text.description,
      defaultSelected: DEFAULT_WORK_CATEGORY_IDS.includes(id),
    };
  });
}

/**
 * Sélection par défaut : « Gros œuvre » et « Second œuvre et finitions ».
 * Un type qui ne produit aucune de ces deux catégories (piscine, électricité,
 * plomberie, salle de bain…) démarre avec toutes ses catégories cochées afin de
 * ne jamais amputer son estimation par défaut.
 */
export function defaultWorkCategories(category?: string | null): string[] {
  const ids = workCategoryIdsForType(category);
  const defaults = ids.filter((id) => DEFAULT_WORK_CATEGORY_IDS.includes(id));
  return defaults.length > 0 ? [...defaults] : [...ids];
}

/** Sélection effective d'un projet, telle que l'estimation doit l'appliquer. */
export interface WorkSelection {
  /** `false` : projet sans sélection enregistrée → aucun filtrage. */
  active: boolean;
  /** Identifiants cochés. */
  selected: ReadonlySet<string>;
  /** Identifiants proposés pour le type (les autres ne sont jamais filtrés). */
  known: ReadonlySet<string>;
}

/**
 * Construit la sélection appliquée à l'estimation.
 * `stored` provient de `projects.workCategories` : absent ou vide → inactif.
 */
export function resolveWorkSelection(
  stored: readonly string[] | null | undefined,
  category?: string | null,
): WorkSelection {
  const known = new Set(workCategoryIdsForType(category));
  const list = (stored ?? []).filter((id) => typeof id === "string" && id.trim() !== "");
  if (list.length === 0) return { active: false, selected: new Set(), known };
  return { active: true, selected: new Set(list), known };
}

/**
 * Ne conserve que les lots sélectionnés. Les lots hors catalogue (travaux
 * complémentaires ajoutés par l'utilisateur, lots inconnus du gabarit) sont
 * TOUJOURS conservés : la sélection ne peut jamais faire disparaître un poste
 * qu'elle n'affiche pas.
 */
export function applyWorkSelectionToLots<T extends { id?: string } | null | undefined>(
  lots: readonly T[] | null | undefined,
  selection: WorkSelection,
): T[] {
  const list = (lots ?? []).filter((l): l is T => Boolean(l)) as T[];
  if (!selection.active) return list;
  return list.filter((lot) => {
    const id = (lot as { id?: string }).id ?? "";
    if (!selection.known.has(id)) return true; // lot hors catalogue : préservé
    return selection.selected.has(id);
  });
}

/** Somme des sous-totaux d'une liste de lots. */
export function lotsSubtotal(lots: readonly any[] | null | undefined): number {
  return (lots ?? []).reduce((sum, lot) => sum + (Number(lot?.subtotal) || 0), 0);
}

/**
 * Ratio appliqué aux montants du moteur (scénarios Économique / Standard /
 * Premium) : part des travaux sélectionnés dans le quantitatif complet.
 * `1` lorsqu'aucune sélection n'est active ou que le quantitatif est vide.
 */
export function workSelectionRatio(allLots: readonly any[] | null | undefined, keptLots: readonly any[] | null | undefined): number {
  const all = lotsSubtotal(allLots);
  if (!(all > 0)) return 1;
  return lotsSubtotal(keptLots) / all;
}

/**
 * Applique le ratio de sélection à une estimation enregistrée : total, coût au
 * m², scénarios budgétaires, répartition par catégorie. Utilisé pour que les
 * scénarios Économique / Standard / Premium restent cohérents avec les travaux
 * réellement sélectionnés. `ratio === 1` renvoie l'estimation inchangée.
 */
export function scaleCostEstimateForWorkSelection<T extends Record<string, any>>(
  costEstimate: T | null | undefined,
  ratio: number,
): T | null | undefined {
  if (!costEstimate || !(ratio > 0) || ratio === 1) return costEstimate;
  const scale = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? Math.round(value * ratio) : value;
  const scenarios = costEstimate.budgetScenarios as Record<string, any> | undefined;
  return {
    ...costEstimate,
    totalCost: scale(costEstimate.totalCost),
    costPerSquareMeter: scale(costEstimate.costPerSquareMeter),
    budgetScenarios: scenarios
      ? Object.fromEntries(
          Object.entries(scenarios).map(([key, scenario]) => [
            key,
            {
              ...scenario,
              totalCost: scale(scenario?.totalCost),
              costPerM2: scale(scenario?.costPerM2),
            },
          ]),
        )
      : scenarios,
    breakdown: Array.isArray(costEstimate.breakdown)
      ? costEstimate.breakdown.map((cat: any) => ({
          ...cat,
          estimatedCost: scale(cat?.estimatedCost),
          items: Array.isArray(cat?.items)
            ? cat.items.map((item: any) => ({
                ...item,
                totalPrice: scale(item?.totalPrice),
              }))
            : cat?.items,
        }))
      : costEstimate.breakdown,
  };
}
