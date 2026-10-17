// ============================================================================
// COÛT DE CONSTRUCTION À PLUSIEURS NIVEAUX — SOURCE UNIQUE DE CALCUL
// ----------------------------------------------------------------------------
// Problème corrigé : le moteur appliquait le coût COMPLET du rez-de-chaussée à
// chaque étage (`total = prix/m² × surface × nombre de niveaux`), ce qui
// revenait à facturer plusieurs fois les frais communs (fondations, études,
// VRD, aménagements extérieurs) et à surestimer le budget des R+1 / R+2 / R+3.
//
// Méthode retenue (pratique du bâtiment en Tunisie, 2026) :
//
//   Coût total = Coût RDC (frais communs + RDC, comptés UNE fois)
//              + Σ Coût des étages supérieurs (coefficient par niveau)
//              + Toiture / terrasse supérieure (UNE fois, sur le dernier niveau)
//
//   • Le RDC porte 100 % du prix au m² : il comprend les travaux communs à tout
//     le bâtiment (terrassement, fondations dimensionnées pour la structure
//     totale, études et permis, VRD et raccordements, aménagements extérieurs)
//     ainsi que sa propre toiture en cas de bâtiment de plain-pied.
//   • Chaque étage supérieur est estimé par sa SURFACE RÉELLE × le prix au m²
//     × un COEFFICIENT de niveau (65-80 % pour R+1 et R+2, 56-80 % à partir de
//     R+3). Le coefficient exprime la part comparable des travaux de l'étage :
//     ni fondations, ni terrassement, ni VRD, ni études, ni aménagements
//     extérieurs — ces postes ne sont donc JAMAIS comptés deux fois.
//   • La toiture ou la terrasse supérieure est chiffrée SÉPARÉMENT, une seule
//     fois, sur la surface du dernier niveau.
//   • Les fondations et la structure ne font l'objet d'aucun abattement
//     automatique : elles sont portées par le RDC (une fois) et par le
//     coefficient des étages, jamais divisées forfaitairement.
//
// Module PUR (aucun accès Convex, React ou DOM) : il est utilisé par le moteur
// BIM (`bimEngine`), le générateur du Quantitatif détaillé (`dqeEngine`) et les
// pages qui affichent la surface bâtie. Les coefficients sont configurables par
// l'administrateur (table `bimConfig`) sans modifier le code source.
// ============================================================================

/** Coefficients de coût par niveau, appliqués au prix au m² du RDC. */
export interface LevelCostConfig {
  /** Rez-de-chaussée — 100 % (référence : porte les frais communs). */
  rdc: number;
  /** R+1 — 65 à 80 %. */
  rPlus1: number;
  /** R+2 — 65 à 80 %. */
  rPlus2: number;
  /** R+3 et suivants — 56 à 80 %. */
  rPlus3AndAbove: number;
  /**
   * Part du prix au m² du RDC correspondant aux travaux COMMUNS à tout le
   * bâtiment (terrassement, fondations dimensionnées pour la structure totale,
   * études et permis, VRD et raccordements, aménagements extérieurs). Ces
   * travaux sont comptés une seule fois et ne sont jamais multipliés par le
   * nombre de niveaux. Sert de garde-fou : un coefficient d'étage supérieur à
   * `1 - commonShare` signalerait un double comptage des frais fixes.
   */
  commonShare: number;
  /** Poids de la toiture / terrasse supérieure (comptée une seule fois). */
  roofWeight: number;
}

/**
 * Fourchettes admises (hypothèses de départ à calibrer sur les DQE et devis
 * réels — ce ne sont pas des tarifs officiels du marché).
 */
export const LEVEL_COEFFICIENT_RANGES = {
  rdc: { min: 1, max: 1 },
  rPlus1: { min: 0.65, max: 0.8 },
  rPlus2: { min: 0.65, max: 0.8 },
  rPlus3AndAbove: { min: 0.56, max: 0.8 },
  commonShare: { min: 0.1, max: 0.4 },
  roofWeight: { min: 0.02, max: 0.15 },
} as const;

/** Valeurs par défaut (dans les fourchettes ci-dessus). */
export const DEFAULT_LEVEL_COST_CONFIG: LevelCostConfig = {
  rdc: 1,
  rPlus1: 0.75,
  rPlus2: 0.72,
  rPlus3AndAbove: 0.68,
  commonShare: 0.22,
  roofWeight: 0.06,
};

/** Date de validité par défaut des coefficients (référence 2026). */
export const LEVEL_COEFFICIENTS_VALIDITY_2026 = {
  from: Date.UTC(2026, 0, 1),
  until: Date.UTC(2026, 11, 31),
};

export type LevelAnomalySeverity = "faible" | "moyenne" | "élevée";

/** Incohérence détectée sur le calcul multi-niveaux. */
export interface LevelAnomaly {
  code: string;
  severity: LevelAnomalySeverity;
  message: string;
  recommendation: string;
}

/** Détail chiffré d'un niveau du bâtiment. */
export interface LevelCostLine {
  /** 1 = RDC, 2 = R+1, 3 = R+2, … */
  index: number;
  label: string;
  /** Surface couverte réelle du niveau (m²). */
  area: number;
  /** Coefficient appliqué au prix au m² du RDC. */
  coefficient: number;
  /** Frais communs portés par ce niveau (uniquement le RDC). */
  commonAmount: number;
  /** Coût du niveau (hors toiture), en TND. */
  amount: number;
}

/** Détail chiffré de la toiture / terrasse supérieure. */
export interface RoofCostLine {
  label: string;
  area: number;
  weight: number;
  amount: number;
  /**
   * false = toiture déjà comprise dans le coût du RDC (bâtiment de plain-pied) :
   * elle n'est donc pas ajoutée une seconde fois.
   */
  counted: boolean;
}

/** Résultat complet du calcul multi-niveaux (source unique de vérité). */
export interface LevelCostResult {
  config: LevelCostConfig;
  pricePerM2: number;
  /** Surface réellement construite (somme des surfaces de tous les niveaux). */
  realBuiltArea: number;
  /** Surface équivalente pondérée par les coefficients (base de facturation). */
  equivalentArea: number;
  levels: LevelCostLine[];
  roof: RoofCostLine;
  /** Frais communs comptés une seule fois (déjà inclus dans le RDC). */
  common: { share: number; amount: number; countedOnce: boolean };
  /**
   * Ajustements explicites comptés UNE seule fois en plus des niveaux et de la
   * toiture (ex. « Second œuvre et finitions » facturé à la somme réelle de ses
   * postes). Vide tant qu'aucun ajustement n'est appliqué.
   */
  costAdjustments?: { label: string; amount: number }[];
  /** Coût total TTC = Σ niveaux + toiture + ajustements explicites. */
  total: number;
  /** Coût moyen au m² sur la surface réelle construite. */
  costPerM2Real: number;
  /** Anomalies détectées (aucune si le calcul est cohérent). */
  anomalies: LevelAnomaly[];
}

/**
 * Prix unitaires TTC (le catalogue 2026 et la base `materialPrices` sont déjà
 * TTC) : aucun taux de TVA n'est ajouté par le moteur multi-niveaux.
 * Exposé pour la vérification automatique des taxes.
 */
export const TAXES_INCLUDED_IN_UNIT_PRICES = true;

const clampNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const round0 = (n: number) => Math.round(n);

/** Libellé français d'un niveau : 1 = RDC, 2 = R+1, … */
export function levelLabel(index: number): string {
  return index <= 1 ? "RDC" : `R+${index - 1}`;
}

/** Libellés des niveaux d'un bâtiment (RDC, R+1, R+2, …). */
export function levelLabels(floors: number): string[] {
  const n = Math.max(1, Math.floor(floors || 1));
  return Array.from({ length: n }, (_, i) => levelLabel(i + 1));
}

const range = (key: keyof typeof LEVEL_COEFFICIENT_RANGES) => LEVEL_COEFFICIENT_RANGES[key];

/** Résout la configuration depuis les valeurs par défaut + surcharges admin. */
export function resolveLevelCostConfig(overrides?: Partial<LevelCostConfig> | null): LevelCostConfig {
  const d = DEFAULT_LEVEL_COST_CONFIG;
  const o = overrides ?? {};
  const pick = (key: keyof LevelCostConfig) => {
    const raw = clampNumber((o as Record<string, unknown>)[key], d[key]);
    // Un coefficient négatif ou nul n'a aucun sens : repli sur la valeur par
    // défaut plutôt qu'un résultat absurde.
    return raw > 0 ? Math.round(raw * 10000) / 10000 : d[key];
  };
  return {
    rdc: pick("rdc"),
    rPlus1: pick("rPlus1"),
    rPlus2: pick("rPlus2"),
    rPlus3AndAbove: pick("rPlus3AndAbove"),
    commonShare: pick("commonShare"),
    roofWeight: pick("roofWeight"),
  };
}

/** Coefficient appliqué à un niveau (1 = RDC, 2 = R+1, 3 = R+2, ≥ 4 = R+3+). */
export function coefficientForLevel(index: number, config: LevelCostConfig): number {
  if (index <= 1) return config.rdc;
  if (index === 2) return config.rPlus1;
  if (index === 3) return config.rPlus2;
  return config.rPlus3AndAbove;
}

/**
 * Surfaces réelles de chaque niveau : les surfaces saisies sont conservées
 * (une surface se rapportant au niveau correspondant) ; les niveaux non
 * renseignés reprennent la surface du RDC. Une surface d'étage différente de
 * celle du RDC n'est donc jamais remplacée par celle du RDC.
 */
export function normalizeLevelSurfaces(
  surface: number,
  floors: number,
  levelSurfaces?: number[] | null,
): number[] {
  const n = Math.max(1, Math.floor(floors || 1));
  const base = clampNumber(surface, 0) > 0 ? Number(surface) : 0;
  const provided = Array.isArray(levelSurfaces) ? levelSurfaces : [];
  return Array.from({ length: n }, (_, i) => {
    const raw = clampNumber(provided[i], base);
    return raw > 0 ? Math.round(raw * 100) / 100 : base;
  });
}

/** Surface réellement construite (somme des surfaces de tous les niveaux). */
export function realBuiltArea(
  surface: number,
  floors: number,
  levelSurfaces?: number[] | null,
): number {
  return normalizeLevelSurfaces(surface, floors, levelSurfaces).reduce((s, a) => s + a, 0);
}

/**
 * Calcule le coût d'un bâtiment niveau par niveau à partir du prix au m² du
 * rez-de-chaussée (grille régionale 2026, TTC).
 *
 * « R+1 » n'est jamais le double d'un RDC : le RDC porte les frais communs une
 * seule fois et chaque étage n'est facturé que sur sa surface réelle et sa part
 * comparable de travaux.
 */
export function computeLevelCost(input: {
  surface: number;
  floors: number;
  pricePerM2: number;
  levelSurfaces?: number[] | null;
  config?: Partial<LevelCostConfig> | null;
}): LevelCostResult {
  const config = resolveLevelCostConfig(input.config);
  const floors = Math.max(1, Math.floor(input.floors || 1));
  const price = Math.max(0, clampNumber(input.pricePerM2, 0));
  const surfaces = normalizeLevelSurfaces(input.surface, floors, input.levelSurfaces);

  const levels: LevelCostLine[] = surfaces.map((area, i) => {
    const index = i + 1;
    const coefficient = coefficientForLevel(index, config);
    return {
      index,
      label: levelLabel(index),
      area,
      coefficient,
      // Les travaux communs ne sont portés que par le RDC : un étage
      // supplémentaire n'en porte aucun.
      commonAmount: index === 1 ? round0(price * area * config.commonShare) : 0,
      amount: round0(price * area * coefficient),
    };
  });

  // Toiture / terrasse supérieure : chiffrée une seule fois, sur le dernier
  // niveau. Un bâtiment de plain-pied porte déjà sa toiture dans le coût du
  // RDC (100 % du prix au m²) : elle n'est pas ajoutée deux fois.
  const topLevel = levels[levels.length - 1];
  const roofCounted = floors >= 2;
  const roof: RoofCostLine = {
    label: "Toiture / terrasse supérieure",
    area: topLevel?.area ?? 0,
    weight: config.roofWeight,
    amount: roofCounted ? round0(price * (topLevel?.area ?? 0) * config.roofWeight) : 0,
    counted: roofCounted,
  };

  const realArea = surfaces.reduce((s, a) => s + a, 0);
  const equivalentArea =
    Math.round(
      (surfaces.reduce((s, a, i) => s + a * coefficientForLevel(i + 1, config), 0) +
        (roofCounted ? (topLevel?.area ?? 0) * config.roofWeight : 0)) *
        100,
    ) / 100;
  const costAdjustments: { label: string; amount: number }[] = [];
  const total = levels.reduce((s, l) => s + l.amount, 0) + roof.amount;

  const result: LevelCostResult = {
    config,
    pricePerM2: price,
    realBuiltArea: realArea,
    equivalentArea,
    levels,
    roof,
    common: {
      share: config.commonShare,
      // Total des frais communs du bâtiment : comptés UNE fois (RDC).
      amount: levels.length > 0 ? levels[0].commonAmount : 0,
      countedOnce: true,
    },
    costAdjustments,
    total,
    costPerM2Real: realArea > 0 ? round0(total / realArea) : 0,
    anomalies: [],
  };

  result.anomalies = checkLevelCosting(result);
  return result;
}

/**
 * Contrôle automatique des anomalies du calcul multi-niveaux. Aucune anomalie
 * n'est masquée : chaque incohérence est remontée avec sa gravité, puis
 * affichée dans l'interface d'administration.
 */
export function checkLevelCosting(result: LevelCostResult): LevelAnomaly[] {
  const anomalies: LevelAnomaly[] = [];
  const { config, levels, roof, pricePerM2: price } = result;

  // 1. Aucun poste compté deux fois : le total EST la somme des niveaux + toiture
  //    (+ les ajustements explicites, chacun compté une seule fois).
  const sumLevels = levels.reduce((s, l) => s + l.amount, 0);
  const sumAdjustments = (result.costAdjustments ?? []).reduce(
    (s, a) => s + (Number(a.amount) || 0),
    0,
  );
  if (result.total !== sumLevels + roof.amount + sumAdjustments) {
    anomalies.push({
      code: "double_comptage",
      severity: "élevée",
      message:
        "Le coût total ne correspond pas à la somme des niveaux et de la toiture : un poste est compté deux fois (ou manquant).",
      recommendation:
        "Vérifier les coefficients de niveau et la part des frais communs dans le panneau d'administration BIM.",
    });
  }

  // 2. Le coût de chaque niveau correspond à sa surface et à ses travaux.
  for (const level of levels) {
    const expected = round0(price * level.area * level.coefficient);
    if (Math.abs(level.amount - expected) > 1) {
      anomalies.push({
        code: `niveau_incoherent_${level.label}`,
        severity: "moyenne",
        message: `Le coût du ${level.label} (${level.amount} TND) ne correspond pas à sa surface (${level.area} m²) × coefficient ${level.coefficient}.`,
        recommendation: "Recalculer l'estimation du projet.",
      });
    }
  }

  // 3. Frais fixes / fondations : jamais multipliés par le nombre de niveaux.
  const maxUpperCoefficient = 1 - config.commonShare;
  for (const level of levels) {
    if (level.index > 1 && level.coefficient > maxUpperCoefficient + 1e-9) {
      anomalies.push({
        code: `frais_fixes_dupliques_${level.label}`,
        severity: "élevée",
        message: `Le coefficient du ${level.label} (${Math.round(level.coefficient * 100)} %) dépasse la part non commune du RDC (${Math.round(maxUpperCoefficient * 100)} %) : les frais communs (fondations, études, VRD) sont comptés deux fois.`,
        recommendation:
          "Baisser le coefficient de l'étage ou augmenter la part des frais communs, puis recalculer les estimations.",
      });
    }
  }

  // 4. Toiture : chiffrée une seule fois, sur la configuration réelle.
  if (roof.counted && roof.amount <= 0 && roof.area > 0 && price > 0) {
    anomalies.push({
      code: "toiture_absente",
      severity: "moyenne",
      message: "Bâtiment à étages sans coût de toiture / terrasse supérieure.",
      recommendation: "Vérifier le poids de toiture des coefficients multi-niveaux.",
    });
  }
  if (roof.counted && roof.area <= 0) {
    anomalies.push({
      code: "toiture_sans_surface",
      severity: "moyenne",
      message: "La toiture est chiffrée sans surface de dernier niveau.",
      recommendation: "Renseigner la surface réelle du dernier niveau.",
    });
  }

  // 5. Pas de multiplication abusive du coût complet du RDC.
  if (levels.length > 1) {
    const rdcArea = levels[0]?.area ?? 0;
    const fullRdcMultiplication = round0(price * rdcArea * levels.length);
    if (result.total >= fullRdcMultiplication) {
      anomalies.push({
        code: "multiplication_rdc",
        severity: "élevée",
        message:
          "Le bâtiment est facturé comme plusieurs rez-de-chaussée complets (coût du RDC × nombre de niveaux).",
        recommendation:
          "Les étages doivent utiliser les coefficients multi-niveaux (65-80 %), pas le coût complet du RDC.",
      });
    }
  }

  // 6. Aucun niveau facturé pour une surface nulle.
  const zeroArea = levels.filter((l) => l.area <= 0).map((l) => l.label);
  if (zeroArea.length > 0) {
    anomalies.push({
      code: "surface_nulle",
      severity: "moyenne",
      message: `Surface nulle pour : ${zeroArea.join(", ")}.`,
      recommendation: "Renseigner la surface couverte réelle de chaque niveau.",
    });
  }

  // 7. Coefficients hors des fourchettes documentées (56-80 %).
  const outOfRange: string[] = [];
  for (const [key, bounds] of Object.entries(LEVEL_COEFFICIENT_RANGES)) {
    const value = config[key as keyof LevelCostConfig];
    if (value < (bounds as { min: number }).min || value > (bounds as { max: number }).max) {
      outOfRange.push(`${key} = ${value}`);
    }
  }
  if (outOfRange.length > 0) {
    anomalies.push({
      code: "coefficient_hors_fourchette",
      severity: "moyenne",
      message: `Coefficients hors fourchette recommandée (${outOfRange.join(", ")}).`,
      recommendation:
        "RDC 100 % · R+1 et R+2 65-80 % · R+3 et suivants 56-80 % : ces fourchettes sont des hypothèses de départ à calibrer sur les DQE réels.",
    });
  }

  // 8. Taxes : aucun taux ajouté par le moteur (prix unitaires TTC).
  if (!TAXES_INCLUDED_IN_UNIT_PRICES) {
    anomalies.push({
      code: "taxes_incoherentes",
      severity: "élevée",
      message: "Un taux de taxe est appliqué alors que les prix unitaires sont déjà TTC.",
      recommendation: "Retirer le taux ajouté ou repasser les prix unitaires en HT.",
    });
  }

  return anomalies;
}

/**
 * Contrôle de cohérence entre le coût estimatif et le Quantitatif détaillé
 * (DQE) : le coût global TTC doit correspondre à la somme des postes du DQE.
 */
export function checkDqeConsistency(
  bimTotal: number,
  dqeTotal: number,
  lotCount: number,
): LevelAnomaly[] {
  const drift = Math.abs(dqeTotal - bimTotal);
  if (drift > Math.max(2, lotCount)) {
    return [
      {
        code: "dqe_ecart",
        severity: "élevée",
        message: `Le Quantitatif détaillé (${dqeTotal} TND) ne correspond pas au coût estimatif (${bimTotal} TND) : écart de ${drift} TND.`,
        recommendation:
          "Recalculer l'estimation du projet : le DQE doit toujours retomber sur le coût global TTC.",
      },
    ];
  }
  return [];
}

/** Résumé lisible du calcul multi-niveaux (interface & rapports). */
export function levelBreakdownSummary(result: LevelCostResult): string {
  const parts = result.levels.map(
    (l) => `${l.label} ${l.area} m² × ${Math.round(l.coefficient * 100)} % = ${l.amount} TND`,
  );
  if (result.roof.counted) {
    parts.push(
      `${result.roof.label} ${result.roof.area} m² × ${Math.round(result.roof.weight * 100)} % = ${result.roof.amount} TND`,
    );
  }
  parts.push(`Total ${result.total} TND`);
  return parts.join(" · ");
}
