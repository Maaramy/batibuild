// ============================================================================
// BARÈME 2026 — LOTS TECHNIQUES (PEINTURE · PLOMBERIE · ÉLECTRICITÉ)
// ----------------------------------------------------------------------------
// Source unique des prix et des quantités des trois corps d'état techniques.
// Ce module est PUR (aucune dépendance Convex / React) : il est utilisé par le
// moteur du « Quantitatif détaillé » (src/convex/dqeEngine.ts) ET par la grille
// des prix marché par type de projet (src/convex/bimEngine.ts), afin que les
// deux affichages ne puissent jamais diverger.
//
// Convention de prix : tous les montants sont TTC, en dinars tunisiens.
//   • Peinture : quantités exprimées en SEAUX de 20 litres, avec la
//     main-d'œuvre incluse dans le prix du seau (la part « main-d'œuvre » est
//     exposée séparément pour l'affichage, sans jamais être recomptée).
//   • Plomberie / Électricité : prix au m² de surface construite, main-d'œuvre
//     incluse (part « main-d'œuvre » exposée séparément, jamais recomptée).
// ============================================================================

export type TechnicalScenario = "economique" | "standard" | "premium";

/** Contenance d'un seau de peinture (litres). */
export const PAINT_BUCKET_LITERS = 20;

export type PaintKind = "interieure" | "exterieure";

export interface PaintBaremeConfig {
  /** Libellé du poste. */
  label: string;
  /** Nombre de seaux de 20 L nécessaires pour 100 m² de surface construite. */
  bucketsPer100m2: number;
  /** Surface peinte (m²) par m² de surface construite. */
  paintedM2PerBuiltM2: number;
  /** Fourniture (peinture + sous-couche) par seau de 20 L, TND. */
  materialPerBucket: number;
  /** Main-d'œuvre de mise en peinture, TND/m² peint. */
  laborPerM2: number;
}

/**
 * Barème peinture — 100 m² de surface construite :
 *   • intérieure : 18 seaux de 20 L (250 m² de murs/plafonds peints) ;
 *   • extérieure : 12 seaux de 20 L (80 m² de façade).
 */
export const PAINT_BAREME: Record<PaintKind, PaintBaremeConfig> = {
  interieure: {
    label: "Peinture intérieure",
    bucketsPer100m2: 18,
    paintedM2PerBuiltM2: 2.5,
    materialPerBucket: 107,
    laborPerM2: 4,
  },
  exterieure: {
    label: "Peinture extérieure",
    bucketsPer100m2: 12,
    paintedM2PerBuiltM2: 0.8,
    materialPerBucket: 140,
    laborPerM2: 5,
  },
};

/** Nombre de seaux de 20 L pour une surface construite (arrondi au 1/10). */
export function paintBucketsForArea(kind: PaintKind, builtArea: number): number {
  const raw = (PAINT_BAREME[kind].bucketsPer100m2 * Math.max(0, builtArea)) / 100;
  return Math.round(raw * 10) / 10;
}

/** Surface effectivement peinte (murs / plafonds / façade), en m². */
export function paintSurfaceForArea(kind: PaintKind, builtArea: number): number {
  const raw = PAINT_BAREME[kind].paintedM2PerBuiltM2 * Math.max(0, builtArea);
  return Math.round(raw * 10) / 10;
}

/**
 * Prix TTC d'un seau de 20 L, main-d'œuvre INCLUSE.
 * La main-d'œuvre par seau est dérivée de la surface peinte : elle est donc
 * identique quelle que soit la surface de référence (le ratio est constant).
 */
export function paintAllInPerBucket(kind: PaintKind): number {
  const cfg = PAINT_BAREME[kind];
  const laborPerBucket = (cfg.paintedM2PerBuiltM2 * cfg.laborPerM2 * 100) / cfg.bucketsPer100m2;
  return Math.round((cfg.materialPerBucket + laborPerBucket) * 100) / 100;
}

/** Part « main-d'œuvre » d'un seau de 20 L (incluse dans le prix du seau). */
export function paintLaborPerBucket(kind: PaintKind): number {
  const cfg = PAINT_BAREME[kind];
  return Math.round(((cfg.paintedM2PerBuiltM2 * cfg.laborPerM2 * 100) / cfg.bucketsPer100m2) * 100) / 100;
}

/**
 * Surface de référence des deux lots techniques complets (m² de surface
 * construite) : les prix du marché tunisien sont donnés pour 100 m².
 */
export const TECHNICAL_REFERENCE_SURFACE_M2 = 100;

/**
 * Références TTC du scénario Standard pour 100 m² construits — valeurs du
 * marché tunisien des types de travaux « Plomberie complète » et « Électricité
 * complète » :
 *   • Plomberie complète : 9 400 TND TTC / 100 m² ;
 *   • Électricité complète : 7 200 TND TTC / 100 m².
 *
 * Ces montants sont DÉJÀ TTC : la TVA ne leur est jamais ajoutée une seconde
 * fois. Les tarifs au m² en découlent par division, jamais par saisie séparée,
 * pour qu'aucun barème ne puisse diverger de ces références.
 */
export const PLUMBING_REFERENCE_TTC = 9_400;
export const ELECTRICITY_REFERENCE_TTC = 7_200;

/** Tarif de référence au m² (TTC) du scénario Standard : 94 et 72 DT/m². */
export const PLUMBING_REFERENCE_M2 =
  PLUMBING_REFERENCE_TTC / TECHNICAL_REFERENCE_SURFACE_M2;
export const ELECTRICITY_REFERENCE_M2 =
  ELECTRICITY_REFERENCE_TTC / TECHNICAL_REFERENCE_SURFACE_M2;

/**
 * Barème plomberie complète — DT/m² de surface construite (TTC, main-d'œuvre
 * incluse) : Économique 60 · Standard 94 (9 400 TTC / 100 m²) · Premium 115.
 * Les scénarios Économique et Premium conservent leur barème.
 */
export const PLUMBING_BAREME_M2: Record<TechnicalScenario, number> = {
  economique: 60,
  standard: PLUMBING_REFERENCE_M2,
  premium: 115,
};

/** Part main-d'œuvre du barème plomberie (incluse dans le prix au m²). */
export const PLUMBING_LABOR_M2: Record<TechnicalScenario, number> = {
  economique: 25,
  standard: 35,
  premium: 47,
};

/**
 * Barème électricité complète — DT/m² de surface construite (TTC,
 * main-d'œuvre incluse) : Économique 35 · Standard 72 (7 200 TTC / 100 m²) ·
 * Premium 100. Les scénarios Économique et Premium conservent leur barème.
 */
export const ELECTRICITY_BAREME_M2: Record<TechnicalScenario, number> = {
  economique: 35,
  standard: ELECTRICITY_REFERENCE_M2,
  premium: 100,
};

/** Part main-d'œuvre du barème électricité (incluse dans le prix au m²). */
export const ELECTRICITY_LABOR_M2: Record<TechnicalScenario, number> = {
  economique: 14,
  standard: 25,
  premium: 38,
};
