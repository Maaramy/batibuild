// ============================================================================
// QUANTITÉS DE PEINTURE — « Quantitatif détaillé », catégorie Second œuvre
// ----------------------------------------------------------------------------
// Projet de référence : 100 m² de surface construite → 10 seaux de peinture
// intérieure et 7 seaux de peinture extérieure, au seau de 20 litres, 3 couches.
//
// Ces valeurs sont des DONNÉES de référence configurables par l'administrateur
// (table `bimConfig`) : elles pilotent réellement les quantités et les montants
// des deux postes de peinture du Quantitatif détaillé, le devis, les scénarios
// budgétaires et les rapports — sans modification du code source.
//
// Règles appliquées (aucune autre) :
//   • quantité intérieure = 10 seaux pour 100 m² · extérieure = 7 seaux ;
//   • surface de référence configurable (100 m² par défaut) ;
//   • au-delà de la surface de référence, la quantité suit une règle de
//     PROPORTIONNALITÉ activable (désactivée = quantités de référence fixes),
//     avec ARRONDI À L'ENTIER SUPÉRIEUR (2 seaux entamés = 2 seaux facturés) ;
//   • volume du seau configurable (20 litres par défaut) → litres affichés
//     dans la désignation/observations, jamais utilisés comme unité de calcul ;
//   • montant d'une ligne = QUANTITÉ × PRIX UNITAIRE DU SEAU (aucun coefficient
//     régional, aucune majoration cachée sur les quantités) ;
//   • sous-total peinture = montant intérieur + montant extérieur, intégré au
//     sous-total du lot « Second œuvre et finitions » et donc au coût global.
//
// Module PUR (aucun accès Convex, React ou DOM) : partagé par le générateur du
// Quantitatif détaillé (`dqeEngine`), la configuration administrateur
// (`bimConfig`) et le panneau d'administration (`BIMSettings`).
// ============================================================================

/** Paramètres du module de peinture (un seul endroit, deux postes du DQE). */
export interface PaintQuantitiesConfig {
  /** Quantité intérieure de référence (seaux pour `referenceSurface` m²). */
  interiorBuckets: number;
  /** Quantité extérieure de référence (seaux pour `referenceSurface` m²). */
  exteriorBuckets: number;
  /** Volume d'un seau, en litres (unité de référence du poste). */
  bucketLiters: number;
  /** Surface construite de référence, en m² (base des quantités ci-dessus). */
  referenceSurface: number;
  /** Nombre de couches de référence. */
  coats: number;
  /**
   * true  → quantités proportionnelles à la surface construite (arrondi à
   *         l'entier supérieur : 150 m² → 15 seaux intérieurs, 11 extérieurs) ;
   * false → quantités de référence conservées quelle que soit la surface.
   */
  proportional: boolean;
  /** Prix unitaire du seau de peinture intérieure (TND / seau). */
  interiorBucketPrice: number;
  /** Prix unitaire du seau de peinture extérieure (TND / seau). */
  exteriorBucketPrice: number;
}

/** Surface construite de référence du barème (100 m²). */
export const PAINT_REFERENCE_SURFACE_M2 = 100;
/** Quantité intérieure de référence pour 100 m² (10 seaux). */
export const PAINT_REFERENCE_INTERIOR_BUCKETS = 10;
/** Quantité extérieure de référence pour 100 m² (7 seaux). */
export const PAINT_REFERENCE_EXTERIOR_BUCKETS = 7;
/** Volume du seau de référence (20 litres). */
export const PAINT_REFERENCE_BUCKET_LITERS = 20;
/** Nombre de couches de référence (3). */
export const PAINT_REFERENCE_COATS = 3;

/**
 * Fourchettes admises (hypothèses de départ à calibrer sur les devis réels —
 * ce ne sont pas des tarifs officiels du marché).
 */
export const PAINT_QUANTITY_RANGES = {
  interiorBuckets: { min: 1, max: 50 },
  exteriorBuckets: { min: 1, max: 50 },
  bucketLiters: { min: 1, max: 50 },
  referenceSurface: { min: 20, max: 1000 },
  coats: { min: 1, max: 6 },
  interiorBucketPrice: { min: 20, max: 400 },
  exteriorBucketPrice: { min: 20, max: 500 },
} as const;

/** Clés numériques éditables (les fourchettes ne portent pas sur `proportional`). */
export const PAINT_NUMERIC_KEYS = [
  "interiorBuckets",
  "exteriorBuckets",
  "bucketLiters",
  "referenceSurface",
  "coats",
  "interiorBucketPrice",
  "exteriorBucketPrice",
] as const;

export type PaintNumericKey = (typeof PAINT_NUMERIC_KEYS)[number];

/**
 * Valeurs par défaut du barème. Le prix du seau découle du catalogue officiel
 * Tunisie 2026 (peinture intérieure mate ≈ 5,33 TND/L · extérieure acrylique
 * ≈ 7 TND/L) ramené à 20 litres : 107 TND et 140 TND le seau.
 */
export const DEFAULT_PAINT_QUANTITIES: PaintQuantitiesConfig = {
  interiorBuckets: PAINT_REFERENCE_INTERIOR_BUCKETS,
  exteriorBuckets: PAINT_REFERENCE_EXTERIOR_BUCKETS,
  bucketLiters: PAINT_REFERENCE_BUCKET_LITERS,
  referenceSurface: PAINT_REFERENCE_SURFACE_M2,
  coats: PAINT_REFERENCE_COATS,
  proportional: true,
  interiorBucketPrice: 107,
  exteriorBucketPrice: 140,
};

/** Paramètres par défaut, sérialisés pour la base (JSON). */
export const DEFAULT_PAINT_QUANTITIES_JSON = JSON.stringify(DEFAULT_PAINT_QUANTITIES);

/** Désignations des deux postes du Quantitatif détaillé (stables). */
export const PAINT_LINE_DESIGNATIONS = {
  interior: "Peinture intérieure (murs et plafonds)",
  exterior: "Peinture extérieure (façades)",
} as const;

export type PaintLineRole = keyof typeof PAINT_LINE_DESIGNATIONS;

/** Clé de comparaison des libellés (même normalisation que le moteur DQE). */
export function paintDesignationKey(label: string): string {
  return String(label ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/×/g, "x")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Rôle de peinture d'une désignation, ou `null` si la ligne n'est pas un poste
 * de peinture intérieure/extérieure. Les libellés hérités du gabarit
 * (« Peinture intérieure (3 couches, finition standard) », « Peinture
 * extérieure (façade, monocouche acrylique) », « Peinture intérieure (3
 * couches) ») sont reconnus comme les libellés définitifs : une ligne existante
 * est donc MISE À JOUR, jamais dupliquée.
 */
export function paintLineRole(designation: string): PaintLineRole | null {
  const key = paintDesignationKey(designation);
  if (key.startsWith("peintureinterieure")) return "interior";
  if (key.startsWith("peintureexterieure")) return "exterior";
  return null;
}

/** Rôle de peinture d'une ligne (gabarit `{ d }` ou ligne du DQE `{ designation }`). */
export function paintRoleOfLine(line: {
  d?: string;
  designation?: string;
} | null | undefined): PaintLineRole | null {
  if (!line) return null;
  return paintLineRole(line.designation ?? line.d ?? "");
}

/** La ligne porte-t-elle le libellé définitif (poste au seau) ? */
function isCanonicalPaintLine(line: { d?: string; designation?: string }): boolean {
  const role = paintRoleOfLine(line);
  if (!role) return false;
  return (
    paintDesignationKey(line.designation ?? line.d ?? "") ===
    paintDesignationKey(PAINT_LINE_DESIGNATIONS[role])
  );
}

/**
 * Garde-fou anti-doublon : au plus UN poste de peinture intérieure et UN poste
 * de peinture extérieure par liste de lignes. Quand plusieurs lignes portent le
 * même poste, la ligne DÉFINITIVE (poste au seau) est conservée et les lignes
 * héritées sont retirées — l'existant est donc mis à jour, jamais recréé à
 * côté. Une liste sans doublon est retournée à l'identique.
 */
export function dedupePaintLines<T extends { d?: string; designation?: string }>(
  lines: T[],
): T[] {
  const list = lines ?? [];
  const firstIndex: Partial<Record<PaintLineRole, number>> = {};
  const removed = new Set<number>();
  list.forEach((line, index) => {
    const role = paintRoleOfLine(line);
    if (!role) return;
    const previous = firstIndex[role];
    if (previous === undefined) {
      firstIndex[role] = index;
      return;
    }
    if (isCanonicalPaintLine(line) && !isCanonicalPaintLine(list[previous])) {
      removed.add(previous);
      firstIndex[role] = index;
      return;
    }
    removed.add(index);
  });
  return removed.size > 0 ? list.filter((_, index) => !removed.has(index)) : list;
}

/**
 * Remplace (ou insère) les deux postes de peinture dans une liste de lignes.
 *
 * Les lignes de peinture déjà présentes — quel que soit leur libellé hérité —
 * sont retirées puis remplacées par les deux lignes canoniques, à la position
 * de la première ligne remplacée. Il ne peut donc jamais y avoir de doublon :
 * les postes existants sont mis à jour, jamais recréés à côté.
 */
export function replacePaintLines<T extends { d: string }>(
  lines: T[],
  paintLines: Record<PaintLineRole, T>,
): T[] {
  const list = lines ?? [];
  const kept: T[] = [];
  let insertAt = -1;
  for (const line of list) {
    if (paintLineRole(line?.d) !== null) {
      if (insertAt < 0) insertAt = kept.length;
      continue;
    }
    kept.push(line);
  }
  const inserted = [paintLines.interior, paintLines.exterior];
  if (insertAt < 0) return [...kept, ...inserted];
  return [...kept.slice(0, insertAt), ...inserted, ...kept.slice(insertAt)];
}

const clampNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** Arrondi à l'entier supérieur, tolérant aux erreurs de virgule flottante. */
const ceilBuckets = (n: number) => Math.max(0, Math.ceil(n - 1e-9));

/**
 * Lit la configuration de peinture stockée en JSON par l'administrateur. Toute
 * valeur absente ou invalide est ignorée (repli sur les défauts) ; les autres
 * sont conservées telles quelles et BORNÉES à l'enregistrement.
 */
export function parsePaintQuantities(raw?: string | null): Partial<PaintQuantitiesConfig> | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return undefined;
    const source = parsed as Record<string, unknown>;
    const out: Partial<PaintQuantitiesConfig> = {};
    for (const key of PAINT_NUMERIC_KEYS) {
      const value = source[key];
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        out[key] = value;
      }
    }
    if (typeof source.proportional === "boolean") {
      out.proportional = source.proportional;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  } catch {
    return undefined;
  }
}

/** Configuration effective = défauts fusionnés avec les surcharges valides. */
export function resolvePaintQuantities(
  overrides?: Partial<PaintQuantitiesConfig> | null,
): PaintQuantitiesConfig {
  const d = DEFAULT_PAINT_QUANTITIES;
  const o = overrides ?? {};
  const pick = (key: PaintNumericKey): number => {
    const raw = clampNumber((o as Record<string, unknown>)[key], d[key]);
    return raw > 0 ? raw : d[key];
  };
  const surface = pick("referenceSurface");
  return {
    interiorBuckets: Math.round(pick("interiorBuckets")),
    exteriorBuckets: Math.round(pick("exteriorBuckets")),
    bucketLiters: Math.round(pick("bucketLiters") * 100) / 100,
    referenceSurface: Math.round(surface * 100) / 100,
    coats: Math.round(pick("coats")),
    proportional:
      typeof o.proportional === "boolean" ? o.proportional : d.proportional,
    interiorBucketPrice: Math.round(pick("interiorBucketPrice") * 100) / 100,
    exteriorBucketPrice: Math.round(pick("exteriorBucketPrice") * 100) / 100,
  };
}

/** Clés numériques hors fourchette admise (aucune si la saisie est cohérente). */
export function paintOutOfRange(
  config: PaintQuantitiesConfig,
): { key: PaintNumericKey; value: number; min: number; max: number }[] {
  const out: { key: PaintNumericKey; value: number; min: number; max: number }[] = [];
  for (const key of PAINT_NUMERIC_KEYS) {
    const bounds = PAINT_QUANTITY_RANGES[key];
    const value = config[key];
    if (value < bounds.min || value > bounds.max) {
      out.push({ key, value, min: bounds.min, max: bounds.max });
    }
  }
  return out;
}

/** Unité de référence du poste : le seau configuré (« seau de 20 litres »). */
export function paintBucketUnit(config?: Partial<PaintQuantitiesConfig> | null): string {
  const liters = resolvePaintQuantities(config).bucketLiters;
  const label = Number.isInteger(liters) ? String(liters) : String(liters).replace(".", ",");
  return `seau de ${label} litres`;
}

/** Détail chiffré d'un poste de peinture du Quantitatif détaillé. */
export interface PaintLinePlan {
  role: PaintLineRole;
  designation: string;
  unit: string;
  /** Quantité retenue (seaux entiers). */
  quantity: number;
  /** Volume total correspondant (litres). */
  liters: number;
  /** Prix unitaire du seau (TND) — indépendant des coefficients régionaux. */
  unitPrice: number;
  /** Montant de la ligne = quantité × prix unitaire du seau. */
  amount: number;
  /**
   * Description technique affichée sous la désignation dans le Quantitatif
   * détaillé : volume total (litres), nombre de couches et surface de référence.
   */
  description: string;
  /** Observations affichées dans le Quantitatif (quantité, couches, surface). */
  observations: string;
}

/** Plan complet des deux postes de peinture pour une surface construite. */
export interface PaintQuantityPlan {
  config: PaintQuantitiesConfig;
  /** Surface construite retenue (m²). */
  surface: number;
  /** true si la proportionnalité a réellement été appliquée. */
  proportional: boolean;
  interior: PaintLinePlan;
  exterior: PaintLinePlan;
  /** Sous-total peinture = montant intérieur + montant extérieur. */
  subtotal: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Quantités et montants des deux postes de peinture pour une surface construite.
 *
 * Quantités : références pour 100 m² (10 et 7 seaux) ; hors de la surface de
 * référence, `ceil(surface / surfaceRéférence × quantitéRéférence)` lorsque la
 * proportionnalité est activée, sinon les quantités de référence sont conservées.
 * Aucun coefficient régional n'entre dans ce calcul.
 */
export function paintQuantityPlan(
  builtSurface: number,
  config?: Partial<PaintQuantitiesConfig> | null,
): PaintQuantityPlan {
  const cfg = resolvePaintQuantities(config);
  const surface = clampNumber(builtSurface, 0);
  const unit = paintBucketUnit(cfg);
  const ratio = cfg.referenceSurface > 0 ? surface / cfg.referenceSurface : 0;

  const buckets = (reference: number) =>
    cfg.proportional && ratio > 0 ? ceilBuckets(ratio * reference) : reference;

  const build = (role: PaintLineRole, reference: number, price: number): PaintLinePlan => {
    const quantity = Math.max(1, buckets(reference));
    const liters = Math.round(quantity * cfg.bucketLiters * 100) / 100;
    const rule = cfg.proportional
      ? `quantité proportionnelle à la surface construite (arrondi supérieur) — ${reference} seaux pour ${cfg.referenceSurface} m²`
      : `quantité de référence fixe — ${reference} seaux pour ${cfg.referenceSurface} m²`;
    return {
      role,
      designation: PAINT_LINE_DESIGNATIONS[role],
      unit,
      quantity,
      liters,
      unitPrice: price,
      // Montant = quantité × prix unitaire du seau : aucune majoration cachée.
      amount: Math.round(quantity * price),
      description:
        `Volume total : ${liters} L (${quantity} seaux × ${cfg.bucketLiters} L) · ` +
        `${cfg.coats} couches · surface de référence ${cfg.referenceSurface} m² construits.`,
      observations: `${cfg.coats} couches · ${liters} L · ${rule}`,
    };
  };

  const interior = build("interior", cfg.interiorBuckets, cfg.interiorBucketPrice);
  const exterior = build("exterior", cfg.exteriorBuckets, cfg.exteriorBucketPrice);

  return {
    config: cfg,
    surface: Math.round(surface * 100) / 100,
    proportional: cfg.proportional,
    interior,
    exterior,
    subtotal: interior.amount + exterior.amount,
  };
}

/** Sous-total peinture (intérieur + extérieur) d'un plan. */
export function paintSubtotal(plan: PaintQuantityPlan): number {
  return round2(plan.subtotal);
}

/** Note affichée avec le barème : hypothèses de paramétrage, pas un tarif. */
export const PAINT_PRICING_NOTE =
  "Quantités et prix du seau paramétrés par l'administrateur (hypothèses de paramétrage, pas des tarifs officiels du marché).";
