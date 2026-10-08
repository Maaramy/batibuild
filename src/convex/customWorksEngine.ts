// ============================================================================
// TRAVAUX PERSONNALISÉS — moteur de chiffrage automatique.
// ----------------------------------------------------------------------------
// Logique pure (aucun accès Convex) : l'utilisateur choisit des travaux dans
// une liste prédéfinie, le moteur les chiffre À PARTIR DES DONNÉES RÉELLES du
// projet (surface, niveaux, région…) et du SCÉNARIO BUDGÉTAIRE actif.
//
// Réutilise le moteur BIM (`runBIMEstimation`) : mêmes quantités dérivées,
// mêmes matériaux, mêmes prix unitaires, même main-d'œuvre, mêmes données de
// prix que l'estimation du projet. Aucun montant n'est saisi à la main.
//
// Exception : les PANNEAUX SOLAIRES ne sont jamais chiffrés au m². Leur coût =
// nombre de panneaux × prix unitaire système TTC POSÉ d'un panneau (matériel +
// pose + raccordement), décomposé selon la structure du moteur BIM.
// ============================================================================

import { PROJECT_PCT, runBIMEstimation } from "./bimEngine";
import {
  SOLAR_PANEL_TYPE,
  getCustomWorkDef,
  normalizeCustomWorkKeys,
  normalizeSolarPanelCount,
  resolveCustomWorkSurface,
  scenarioToFinishLevel,
  solarPanelUnitPrice,
  type CustomWorkDef,
  type CustomWorkIconName,
  type CustomWorkKey,
  type CustomWorkProjectContext,
} from "../lib/customWorksCatalog";

/** Nature d'un article (regroupement du Quantitatif). */
export type CustomWorkNature =
  | "materiaux"
  | "equipements"
  | "main_oeuvre"
  | "transport"
  | "etudes";

export interface CustomWorkLine {
  designation: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  nature: CustomWorkNature;
}

export interface CustomWorkEstimate {
  key: CustomWorkKey;
  label: string;
  /**
   * Nom du composant d'icône lucide-react du travail (même bibliothèque que
   * toute la plateforme). Résolu en composant par `CustomWorkIcon` côté client.
   */
  icon: CustomWorkIconName;
  /** Catégorie du moteur BIM ayant servi au chiffrage. */
  category: string;
  /** Surface chiffrée (déduite du projet) — 0 pour les panneaux solaires. */
  surface: number;
  /** Nombre de panneaux retenus (poste solaire uniquement). */
  panelCount?: number;
  /** Prix unitaire système TTC POSÉ d'UN panneau, en TND (poste solaire). */
  panelUnitPrice?: number;
  /** Unité de la quantité affichée (poste solaire : « panneaux »). */
  quantityUnit?: string;
  /** Niveau de finition appliqué (scénario budgétaire). */
  finishLevel: string;
  /** Matériaux (structure + second œuvre). */
  materials: number;
  /** Équipements. */
  equipments: number;
  /** Main-d'œuvre. */
  labor: number;
  /** Transport. */
  transport: number;
  /** Études & frais. */
  studies: number;
  /** Coût total du travail (somme des natures ci-dessus). */
  total: number;
  /** Détail article par article (quantité, unité, prix unitaire, montant). */
  lines: CustomWorkLine[];
}

export interface CustomWorksRollup {
  works: CustomWorkEstimate[];
  /** Total des travaux personnalisés sélectionnés (TND). */
  total: number;
}

/** Catégories du moteur BIM → nature du Quantitatif. */
const CATEGORY_NATURE: Record<string, CustomWorkNature> = {
  gros_oeuvre: "materiaux",
  second_oeuvre: "materiaux",
  equipements: "equipements",
  main_oeuvre: "main_oeuvre",
  transport: "transport",
  etudes_imprevus: "etudes",
};

const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

/**
 * Structure du poste solaire, reprise du moteur BIM (catégorie
 * « installation_solaire ») : [gros œuvre, second œuvre, équipements,
 * main-d'œuvre, transport, études]. Elle sert à décomposer le prix unitaire
 * TTC POSÉ (matériel + pose + raccordement) en natures du Quantitatif.
 */
const SOLAR_STRUCTURE_KEYS = [
  "gros_oeuvre",
  "second_oeuvre",
  "equipements",
  "main_oeuvre",
  "transport",
  "etudes_imprevus",
] as const;

/** Libellés système des lignes du poste solaire (quantités en panneaux). */
const SOLAR_LINE_LABELS: Record<CustomWorkNature, string> = {
  materiaux: "Structure de fixation, câblage DC/AC et protections",
  equipements: SOLAR_PANEL_TYPE.label,
  main_oeuvre: "Pose & raccordement par un électricien photovoltaïque",
  transport: "Livraison et manutention",
  etudes: "Études, mise en service et garanties",
};

/** Ordre d'affichage des natures dans le poste solaire. */
const SOLAR_NATURE_ORDER: CustomWorkNature[] = [
  "materiaux",
  "equipements",
  "main_oeuvre",
  "transport",
  "etudes",
];

/**
 * Panneaux solaires — chiffrage UNIQUEMENT au nombre de panneaux :
 *
 *     coût total = nombre de panneaux × prix unitaire d'un panneau POSÉ
 *
 * Le prix unitaire est défini par le système pour le type de panneau retenu,
 * TTC POSÉ : fourniture + pose + raccordement (`solarPanelUnitPrice`). Aucune
 * surface, aucun m² n'intervient. Le montant est ensuite décomposé selon la
 * structure du moteur BIM (matériaux, équipements, main-d'œuvre, transport,
 * études) et la quantité renvoyée est exprimée EN PANNEAUX.
 */
function estimateSolarPanels(
  def: CustomWorkDef,
  finishLevel: string,
  panelCount?: number,
): CustomWorkEstimate {
  const count = normalizeSolarPanelCount(panelCount);
  const unitPrice = solarPanelUnitPrice(finishLevel);
  const total = round2(count * unitPrice);

  // Décomposition du coût total selon la structure système du poste solaire.
  const pct = PROJECT_PCT[def.category] ?? ([13, 10, 65, 5, 2, 5] as const);
  const byNature: Record<CustomWorkNature, number> = {
    materiaux: 0,
    equipements: 0,
    main_oeuvre: 0,
    transport: 0,
    etudes: 0,
  };
  SOLAR_STRUCTURE_KEYS.forEach((key, i) => {
    const nature = CATEGORY_NATURE[key] ?? "materiaux";
    byNature[nature] = round2(byNature[nature] + total * (Number(pct[i]) || 0) / 100);
  });
  // Le reliquat d'arrondi reste sur la dernière nature : la somme des natures
  // vaut EXACTEMENT le coût total (nombre de panneaux × prix unitaire).
  const others = round2(
    byNature.materiaux + byNature.equipements + byNature.main_oeuvre + byNature.transport,
  );
  byNature.etudes = round2(total - others);

  // Un article par nature, quantifié EN PANNEAUX (jamais en m²).
  const lines: CustomWorkLine[] = SOLAR_NATURE_ORDER.filter(
    (nature) => byNature[nature] > 0,
  ).map((nature) => ({
    designation: SOLAR_LINE_LABELS[nature],
    quantity: count,
    unit: SOLAR_PANEL_TYPE.unit,
    unitPrice: round2(byNature[nature] / count),
    total: byNature[nature],
    nature,
  }));

  return {
    key: "solaire",
    label: def.label,
    icon: def.icon,
    category: def.category,
    // Aucun métrage : le poste solaire se chiffre au nombre de panneaux.
    surface: 0,
    panelCount: count,
    panelUnitPrice: unitPrice,
    quantityUnit: SOLAR_PANEL_TYPE.unit,
    finishLevel,
    materials: byNature.materiaux,
    equipments: byNature.equipements,
    labor: byNature.main_oeuvre,
    transport: byNature.transport,
    studies: byNature.etudes,
    total,
    lines,
  };
}

/**
 * Chiffre un travail personnalisé à partir des données du projet et du
 * scénario actif. Aucune valeur de prix n'est inventée : tout vient du moteur
 * BIM (catalogue 2026 / prix en direct lorsque disponibles), sauf les panneaux
 * solaires qui se chiffrent au nombre de panneaux × prix unitaire TTC posé
 * défini par le système (aucun m²).
 */
export function estimateCustomWork(
  key: CustomWorkKey,
  ctx: CustomWorkProjectContext,
  region: string | undefined,
  scenario?: string,
  panelCount?: number,
): CustomWorkEstimate {
  const def = getCustomWorkDef(key);
  if (!def) {
    throw new Error(`Travail personnalisé inconnu : ${key}`);
  }
  const finishLevel = scenarioToFinishLevel(scenario);

  // Panneaux solaires : nombre de panneaux × prix unitaire système (aucun m²).
  if (key === "solaire") {
    return estimateSolarPanels(def, finishLevel, panelCount);
  }

  const surface = resolveCustomWorkSurface(key, ctx);
  const result = runBIMEstimation(def.category, surface, 1, region, finishLevel);

  const byNature: Record<CustomWorkNature, number> = {
    materiaux: 0,
    equipements: 0,
    main_oeuvre: 0,
    transport: 0,
    etudes: 0,
  };
  const lines: CustomWorkLine[] = [];

  for (const cat of result.costEstimate.breakdown) {
    const nature = CATEGORY_NATURE[cat.category] ?? "materiaux";
    const cost = Math.max(0, Number(cat.estimatedCost) || 0);
    byNature[nature] = round2(byNature[nature] + cost);
    for (const item of cat.items ?? []) {
      lines.push({
        designation: String(item.name ?? "").trim() || "Article",
        quantity: Number(item.quantity) || 0,
        unit: String(item.unit ?? ""),
        unitPrice: Number(item.unitPrice) || 0,
        total: Number(item.totalPrice) || 0,
        nature,
      });
    }
  }

  const total = round2(
    byNature.materiaux +
      byNature.equipements +
      byNature.main_oeuvre +
      byNature.transport +
      byNature.etudes,
  );

  return {
    key,
    label: def.label,
    icon: def.icon,
    category: def.category,
    surface,
    finishLevel,
    materials: byNature.materiaux,
    equipments: byNature.equipements,
    labor: byNature.main_oeuvre,
    transport: byNature.transport,
    studies: byNature.etudes,
    total,
    lines,
  };
}

/**
 * Chiffre une sélection de travaux personnalisés (clés déjà normalisées et
 * dédoublonnées) et renvoie le récapitulatif + le total.
 */
export function estimateSelectedCustomWorks(
  keys: CustomWorkKey[],
  ctx: CustomWorkProjectContext,
  region: string | undefined,
  scenario?: string,
  solarPanelCount?: number,
): CustomWorksRollup {
  // Dédoublonnage garanti : un même travail ne peut jamais être chiffré deux fois.
  const unique = normalizeCustomWorkKeys(keys);
  const works = unique.map((key) => estimateCustomWork(key, ctx, region, scenario, solarPanelCount));
  const total = round2(works.reduce((sum, w) => sum + w.total, 0));
  return { works, total };
}
