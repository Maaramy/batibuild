// ============================================================================
// TRAVAUX PERSONNALISÉS — moteur de chiffrage automatique.
// ----------------------------------------------------------------------------
// Logique pure (aucun accès Convex) : l'utilisateur choisit des travaux dans
// une liste prédéfinie, le moteur les chiffre À PARTIR DES DONNÉES RÉELLES du
// projet (surface, niveaux, région…) et du SCÉNARIO BUDGÉTAIRE actif.
//
// Réutilise le moteur BIM (`runBIMEstimation`) : mêmes quantités dérivées,
// mêmes matériaux, mêmes prix unitaires, même main-d'œuvre, mêmes données de
// prix que l'estimation du projet. Aucun montant ni prix n'est codé en dur.
// ============================================================================

import { runBIMEstimation } from "./bimEngine";
import {
  getCustomWorkDef,
  normalizeCustomWorkKeys,
  resolveCustomWorkSurface,
  resolveSolarPanelCount,
  scenarioToFinishLevel,
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
  emoji: string;
  /** Catégorie du moteur BIM ayant servi au chiffrage. */
  category: string;
  /** Surface chiffrée (déduite du projet). */
  surface: number;
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
 * Chiffre un travail personnalisé à partir des données du projet et du
 * scénario actif. Aucune valeur de prix n'est inventée : tout vient du moteur
 * BIM (catalogue 2026 / prix en direct lorsque disponibles).
 */
export function estimateCustomWork(
  key: CustomWorkKey,
  ctx: CustomWorkProjectContext,
  region: string | undefined,
  scenario?: string,
): CustomWorkEstimate {
  const def = getCustomWorkDef(key);
  if (!def) {
    throw new Error(`Travail personnalisé inconnu : ${key}`);
  }
  const finishLevel = scenarioToFinishLevel(scenario);
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

  // Panneaux solaires : la quantité de panneaux est calculée sur une base de
  // 2 m² par panneau (surface disponible ÷ 2 m²). Le montant du poste reste
  // celui du chiffrage (mêmes prix), seul le nombre de panneaux — donc le prix
  // unitaire — reflète cette base.
  if (key === "solaire") {
    const panels = resolveSolarPanelCount(surface);
    for (const line of lines) {
      if (line.nature === "equipements" && /photovolta/i.test(line.designation)) {
        line.quantity = panels;
        const unitPrice = line.total / panels;
        line.unitPrice = Math.round(unitPrice * 100) / 100;
      }
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
    emoji: def.emoji,
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
): CustomWorksRollup {
  // Dédoublonnage garanti : un même travail ne peut jamais être chiffré deux fois.
  const unique = normalizeCustomWorkKeys(keys);
  const works = unique.map((key) => estimateCustomWork(key, ctx, region, scenario));
  const total = round2(works.reduce((sum, w) => sum + w.total, 0));
  return { works, total };
}
