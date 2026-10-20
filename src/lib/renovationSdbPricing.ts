// ============================================================================
// DQE « RÉNOVATION SALLE DE BAIN » — BASE DE PRIX ET QUANTITÉS 2026
// ----------------------------------------------------------------------------
// SOURCE UNIQUE du chiffrage d'une rénovation de salle de bain :
//   • prix de FOURNITURE et de MAIN-D'ŒUVRE distincts, par article/prestation ;
//   • grille propre à chaque scénario (Économique / Standard / Premium) : les
//     écarts viennent des articles et de leurs prix, jamais d'un pourcentage
//     global appliqué au total ;
//   • quantités calculées à partir de la surface réelle de la pièce (sol,
//     périmètre, hauteur de faïence, surfaces mouillées, rendements colle /
//     joint), avec marges de coupe ;
//   • TVA par ligne (19 % — taux de droit commun en Tunisie), total HT, TVA et
//     total TTC ;
//   • postes optionnels (douche italienne, baignoire, démolition de cloisons,
//     grand format, extracteur…) facturés UNIQUEMENT s'ils sont sélectionnés.
//
// ⚠️ HONNÊTETÉ DES PRIX : la base ci-dessous est une base interne BatiBuild
// datée (SDB_PRICE_BASE). Les fourchettes correspondent aux prix couramment
// observés en Tunisie en 2026 (carrelage 15–80 TND/m², faïence 20–50 TND/m²,
// pose 15–30 TND/m², sanitaires et robinetterie de gamme courante), mais elles
// ne proviennent PAS d'un flux fournisseur connecté : aucune synchronisation
// « temps réel » n'est revendiquée. Les prix réellement vérifiés auprès d'un
// fournisseur doivent être saisis dans l'administration (`materialPrices`,
// champ `lastUpdated`, `region`, `notes` = source) : ils remplacent alors le
// prix de référence de la ligne correspondante (`resolvePrice`).
//
// Ce module ne contient AUCUN accès aux données : il est pur et testable.
// ============================================================================

/** Scénarios de finition (mêmes clés que le moteur BIM). */
export type SdbScenario = "economique" | "standard" | "premium";

/** Nature comptable d'une ligne (identique à `DqeNature`). */
export type SdbNature =
  | "materiaux"
  | "main_oeuvre"
  | "equipements"
  | "transport"
  | "etudes";

/**
 * Métadonnées de la base de prix — affichées à l'utilisateur : date, périmètre
 * et caractère NON temps réel de la base.
 */
export const SDB_PRICE_BASE = {
  label: "Base BatiBuild — rénovation salle de bain (Tunisie 2026)",
  /** Date de référence de la grille (millésime des prix). */
  updatedAt: "2026-01-15",
  scope: "Tunisie — base nationale (Tunis), ajustable par coefficient régional",
  /**
   * `false` : aucun flux fournisseur n'est connecté. Les prix sont des
   * références internes à confirmer par devis.
   */
  connectedToMarketFeed: false,
  note:
    "Prix de référence indicatifs (fournitures + main-d'œuvre, HT). " +
    "À confirmer par devis fournisseurs / artisans avant usage contractuel.",
} as const;

/** Taux de TVA appliqué à chaque ligne (Tunisie, taux de droit commun). */
export const SDB_VAT_RATE = 19;

/** Options réellement sélectionnées par le client. */
export interface SdbOptions {
  /** Équipement de douche retenu. */
  shower: "receveur" | "italienne" | "baignoire";
  /** Faïence murale (false = murs peints uniquement). */
  wallCladding: boolean;
  /** WC inclus dans la rénovation. */
  toilet: boolean;
  /** Meuble sous vasque. */
  vanity: boolean;
  /** Miroir. */
  mirror: boolean;
  /** Paroi / cabine de douche. */
  partition: boolean;
  /** Extracteur d'air (ventilation). */
  extractor: boolean;
  /** Démolition localisée de cloisons / supports. */
  localizedDemolition: boolean;
  /** Faïence grand format (grès cérame) à la place de la faïence courante. */
  grandFormat: boolean;
}

/** Configuration par défaut d'une salle de bain résidentielle standard. */
export const SDB_DEFAULT_OPTIONS: SdbOptions = {
  shower: "receveur",
  wallCladding: true,
  toilet: true,
  vanity: true,
  mirror: true,
  partition: true,
  extractor: true,
  localizedDemolition: false,
  grandFormat: false,
};

/** Géométrie réelle de la pièce, déduite de sa surface au sol (m²). */
export interface SdbGeometry {
  /** Surface au sol (m²) — surface saisie sur le projet. */
  floorArea: number;
  /** Périmètre développé (ml) — pièce supposée carrée : 4 × √surface. */
  perimeter: number;
  /** Hauteur de faïence retenue (m). */
  wallTileHeight: number;
  /** Surface de faïence nette (m²) : périmètre × hauteur − ouvertures. */
  wallArea: number;
  /** Surface de plafond (m²). */
  ceilingArea: number;
  /** Surface mouillée recevant le système d'étanchéité (m²). */
  wetArea: number;
}

/** Ouverture de porte déduite de la surface de faïence (m²). */
const DOOR_OPENING_M2 = 1.4;
/** Hauteur de faïence (m) — jusqu'au-dessus des zones humides. */
const WALL_TILE_HEIGHT = 2;
/** Marge de coupe carrelage / faïence (10 %). */
const TILE_WASTE = 0.1;
/** Rendement colle à carrelage (kg/m²). */
const ADHESIVE_KG_M2 = 4;
/** Rendement joint hydrofuge (kg/m²). */
const GROUT_KG_M2 = 0.5;

/** Géométrie d'une salle de bain de surface donnée. */
export function sdbGeometry(surface: number): SdbGeometry {
  const floorArea = Math.max(0.5, Number(surface) || 0);
  const perimeter = 4 * Math.sqrt(floorArea);
  const wallArea = Math.max(0, perimeter * WALL_TILE_HEIGHT - DOOR_OPENING_M2);
  return {
    floorArea,
    perimeter: round2(perimeter),
    wallTileHeight: WALL_TILE_HEIGHT,
    wallArea: round2(wallArea),
    ceilingArea: floorArea,
    // Sol complet + parois de la douche (2 × 0,9 m sur 2 m) : zone réellement
    // protégée par le système d'étanchéité.
    wetArea: round2(floorArea + 2 * 0.9 * 2),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function roundQty(n: number): number {
  return n >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Prix [Économique, Standard, Premium] d'un article, en TND HT. */
type PriceTrio = readonly [number, number, number];

/** Prix du scénario retenu. */
function pickPrice(trio: PriceTrio, scenario: SdbScenario): number {
  return scenario === "economique" ? trio[0] : scenario === "premium" ? trio[2] : trio[1];
}

/** Lots du DQE (ordre d'affichage = ordre des sections du cahier des charges). */
export type SdbLotId =
  | "depose"
  | "maconnerie"
  | "etancheite"
  | "carrelage"
  | "plomberie"
  | "sanitaires"
  | "electricite"
  | "finitions";

export const SDB_LOT_NAMES: Record<SdbLotId, string> = {
  depose: "Dépose et démolition",
  maconnerie: "Maçonnerie et préparation",
  etancheite: "Étanchéité",
  carrelage: "Revêtements",
  plomberie: "Plomberie et évacuation",
  sanitaires: "Sanitaires et mobilier",
  electricite: "Électricité et ventilation",
  finitions: "Finitions",
};

/** Ligne chiffrée du DQE salle de bain. */
export interface SdbLine {
  designation: string;
  description?: string;
  unit: string;
  quantity: number;
  /** Prix unitaire HT (fourniture + main-d'œuvre de la ligne). */
  unitPriceHT: number;
  /** Part main-d'œuvre du prix unitaire HT (0 = fourniture seule). */
  unitPriceLaborHT: number;
  /** Montant HT = quantité × prix unitaire HT. */
  totalHT: number;
  /** Part main-d'œuvre du montant HT (incluse dans `totalHT`). */
  laborHT: number;
  vatRate: number;
  vatAmount: number;
  /** Montant TTC = HT + TVA. */
  totalTTC: number;
  /** Prix unitaire TTC (affiché dans le quantitatif). */
  unitPriceTTC: number;
  nature: SdbNature;
  /** Provenance du prix : grille interne ou prix administré. */
  source: "grille_2026" | "prix_administre";
}

export interface SdbLot {
  id: SdbLotId;
  name: string;
  nature: SdbNature;
  lines: SdbLine[];
  subtotalHT: number;
  vatAmount: number;
  subtotalTTC: number;
}

export interface SdbTotals {
  materiaux: number;
  mainOeuvre: number;
  equipements: number;
  transport: number;
  etudes: number;
  totalHT: number;
  vatAmount: number;
  totalTTC: number;
  costPerM2TTC: number;
}

export interface SdbEstimate {
  lots: SdbLot[];
  totals: SdbTotals;
  geometry: SdbGeometry;
  scenario: SdbScenario;
  options: SdbOptions;
  vatRate: number;
  priceBase: typeof SDB_PRICE_BASE;
  /** Nombre de lignes dont le prix vient de l'administration (`materialPrices`). */
  adminPricedLines: number;
}

/**
 * Clé de comparaison d'un libellé d'article (accents, casse, ponctuation et
 * symbole « × » neutralisés) : « Faïence murale (20×30 ou 25×40) » et
 * « faience murale 20x30 ou 25x40 » désignent le MÊME article.
 */
export function normalizeSdbPriceKey(value: string): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/×/g, "x")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Prix administré tel que stocké dans `materialPrices` (prix TTC). */
export interface SdbAdminPriceRow {
  name: string;
  unitPrice: number;
  lastUpdated?: number;
}

/**
 * Résolveur de prix administrés : un article dont le libellé existe dans la
 * base `materialPrices` prend ce prix, les autres conservent la grille 2026.
 * Les prix administrés sont saisis TTC (convention de la plateforme) et
 * ramenés HT une seule fois, avant le calcul de la TVA de la ligne.
 * `undefined` si aucun prix administré n'est disponible.
 */
export function buildSdbPriceResolver(
  rows: readonly SdbAdminPriceRow[] | null | undefined,
): SdbPriceResolver | undefined {
  const byKey = new globalThis.Map<string, number>();
  for (const row of rows ?? []) {
    const price = Number(row?.unitPrice);
    if (!row?.name || !Number.isFinite(price) || price <= 0) continue;
    byKey.set(normalizeSdbPriceKey(row.name), price);
  }
  if (byKey.size === 0) return undefined;
  return (designation, fallbackHT) => {
    const adminTTC = byKey.get(normalizeSdbPriceKey(designation));
    return adminTTC != null
      ? { price: round2(adminTTC / (1 + SDB_VAT_RATE / 100)), source: "prix_administre" }
      : { price: fallbackHT, source: "grille_2026" };
  };
}

/**
 * Date de dernière mise à jour des prix administrés (la plus récente), en
 * millisecondes — `undefined` si la base ne contient aucune référence.
 */
export function latestSdbAdminPriceUpdate(
  rows: readonly SdbAdminPriceRow[] | null | undefined,
): number | undefined {
  let latest: number | undefined;
  for (const row of rows ?? []) {
    const ts = Number(row?.lastUpdated);
    if (!Number.isFinite(ts) || ts <= 0) continue;
    if (latest === undefined || ts > latest) latest = ts;
  }
  return latest;
}

/** Résolveur de prix administré (materialPrices) — facultatif. */
export type SdbPriceResolver = (
  designation: string,
  fallbackHT: number,
) => { price: number; source: "grille_2026" | "prix_administre" };

interface SdbItem {
  lot: SdbLotId;
  designation: string;
  description?: string;
  unit: string;
  /** Quantité physique (avant arrondi d'affichage). */
  quantity: (g: SdbGeometry, o: SdbOptions) => number;
  /** Prix de fourniture HT par unité (aucun = prestation pure). */
  supply?: PriceTrio;
  /** Coût de main-d'œuvre HT par unité (aucun = fourniture seule). */
  labor?: PriceTrio;
  /** Nature comptable de la fourniture. */
  nature: SdbNature;
  /** Poste optionnel : facturé seulement si la quantité est > 0. */
  optional?: boolean;
}

const tiledArea = (g: SdbGeometry, o: SdbOptions) =>
  g.floorArea * (1 + TILE_WASTE) +
  (o.wallCladding ? g.wallArea * (1 + TILE_WASTE) : 0);

/**
 * CATALOGUE DES POSTES — chaque article a son propre prix, distinct des autres.
 * Aucun « prix unique de catégorie » n'est appliqué : un mitigeur, un WC, un
 * sac de colle et une pose de faïence n'ont jamais le même prix unitaire.
 */
const SDB_ITEMS: readonly SdbItem[] = [
  // ── A. Dépose et démolition ──────────────────────────────────────────────
  {
    lot: "depose",
    designation: "Dépose sanitaires et robinetterie",
    description: "WC, lavabo, douche, miroir et accessoires — dépose soignée.",
    unit: "lot",
    quantity: () => 1,
    labor: [320, 360, 430],
    nature: "main_oeuvre",
  },
  {
    lot: "depose",
    designation: "Démolition carrelage et faïence",
    description: "Piquage des revêtements existants, y compris faïence murale.",
    unit: "m²",
    quantity: (g, o) => g.floorArea + (o.wallCladding ? g.wallArea : g.perimeter),
    labor: [10, 12, 15],
    nature: "main_oeuvre",
  },
  {
    lot: "depose",
    designation: "Démolition localisée des cloisons et supports",
    description: "Ouverture / reprise ponctuelle de cloison ou de support.",
    unit: "lot",
    quantity: (_g, o) => (o.localizedDemolition ? 1 : 0),
    labor: [320, 380, 460],
    nature: "main_oeuvre",
    optional: true,
  },
  {
    lot: "depose",
    designation: "Évacuation des gravats et nettoyage du chantier",
    description: "Benne, chargement et évacuation en décharge autorisée.",
    unit: "benne",
    quantity: (g) => (g.floorArea <= 8 ? 1 : 2),
    supply: [180, 220, 280],
    nature: "transport",
  },

  // ── B. Maçonnerie et préparation ─────────────────────────────────────────
  {
    lot: "maconnerie",
    designation: "Réparation et préparation des supports",
    description: "Rebouchage des saignées, reprise des murs avant revêtement.",
    unit: "m²",
    quantity: (g, o) => (o.wallCladding ? g.wallArea : g.perimeter * 1.2),
    supply: [6, 8, 11],
    labor: [5, 6, 7],
    nature: "materiaux",
  },
  {
    lot: "maconnerie",
    designation: "Ragréage et mise à niveau du sol",
    description: "Ragréage autolissant sur sol préparé (2 à 5 mm).",
    unit: "m²",
    quantity: (g) => g.floorArea,
    supply: [9, 12, 16],
    labor: [6, 7, 9],
    nature: "materiaux",
  },
  {
    lot: "maconnerie",
    designation: "Création de la pente d'évacuation de la douche",
    description: "Formation de pente vers le siphon / caniveau.",
    unit: "m²",
    quantity: (g, o) =>
      o.shower === "italienne" || o.shower === "receveur" ? Math.min(2, g.floorArea * 0.3) : 0,
    supply: [16, 22, 30],
    labor: [14, 18, 24],
    nature: "materiaux",
    optional: true,
  },
  {
    lot: "maconnerie",
    designation: "Enduits et reprises des murs",
    description: "Enduit de reprise sur les murs non carrelés.",
    unit: "m²",
    quantity: (g, o) => (o.wallCladding ? g.perimeter : g.wallArea),
    supply: [7, 9, 12],
    labor: [8, 10, 12],
    nature: "materiaux",
  },

  // ── C. Étanchéité ────────────────────────────────────────────────────────
  {
    lot: "etancheite",
    designation: "Primaire d'accrochage",
    description: "Primaire d'accrochage sur support minéral avant étanchéité.",
    unit: "m²",
    quantity: (g) => g.wetArea,
    supply: [3, 4, 6],
    labor: [2, 3, 4],
    nature: "materiaux",
  },
  {
    lot: "etancheite",
    designation: "Système d'étanchéité sous carrelage",
    description: "Membrane liquide (résine / SPE) sur sol et parois humides.",
    unit: "m²",
    quantity: (g) => g.wetArea,
    supply: [13, 18, 26],
    labor: [7, 9, 12],
    nature: "materiaux",
  },
  {
    lot: "etancheite",
    designation: "Bandes d'étanchéité pour angles et jonctions",
    description: "Bandes de renfort noyées dans la membrane aux points singuliers.",
    unit: "ml",
    quantity: (g) => g.perimeter + 4,
    supply: [4, 6, 9],
    labor: [3, 4, 5],
    nature: "materiaux",
  },
  {
    lot: "etancheite",
    designation: "Étanchéité spécifique de la douche et des traversées",
    description: "Renfort localisé autour du siphon et des traversées de canalisations.",
    unit: "unité",
    quantity: () => 1,
    supply: [55, 80, 130],
    labor: [40, 55, 75],
    nature: "materiaux",
  },

  // ── D. Revêtements ───────────────────────────────────────────────────────
  {
    lot: "carrelage",
    designation: "Carrelage de sol antidérapant (grès cérame)",
    description: "Grès cérame antidérapant (R10/R11) pour pièce humide.",
    unit: "m²",
    quantity: (g) => g.floorArea * (1 + TILE_WASTE),
    supply: [22, 34, 55],
    nature: "materiaux",
  },
  {
    lot: "carrelage",
    designation: "Faïence murale (20×30 ou 25×40)",
    description: "Faïence murale de gamme courante, pose droite.",
    unit: "m²",
    quantity: (g, o) => (o.wallCladding ? g.wallArea * (1 + TILE_WASTE) : 0),
    supply: [20, 32, 48],
    nature: "materiaux",
    optional: true,
  },
  {
    lot: "carrelage",
    designation: "Grès cérame grand format (faïence)",
    description: "Faïence / grès cérame grand format (60×120) — option haut de gamme.",
    unit: "m²",
    quantity: (g, o) =>
      o.wallCladding && o.grandFormat ? g.wallArea * (1 + TILE_WASTE) : 0,
    supply: [38, 58, 92],
    nature: "materiaux",
    optional: true,
  },
  {
    lot: "carrelage",
    designation: "Colle à carrelage adaptée au support",
    description: `${ADHESIVE_KG_M2} kg/m² — colle C2 pour pièces humides.`,
    unit: "kg",
    quantity: (g, o) => tiledArea(g, o) * ADHESIVE_KG_M2,
    supply: [1.1, 1.4, 1.8],
    nature: "materiaux",
  },
  {
    lot: "carrelage",
    designation: "Joints hydrofuges",
    description: `${GROUT_KG_M2} kg/m² — joint hydrofuge anti-moisissure.`,
    unit: "kg",
    quantity: (g, o) => tiledArea(g, o) * GROUT_KG_M2,
    supply: [5, 7, 9],
    nature: "materiaux",
  },
  {
    lot: "carrelage",
    designation: "Pose du carrelage de sol",
    description: "Pose collée sur chape, coupes et calepinage compris.",
    unit: "m²",
    quantity: (g) => g.floorArea,
    labor: [16, 20, 26],
    nature: "main_oeuvre",
  },
  {
    lot: "carrelage",
    designation: "Pose de la faïence murale",
    description: "Pose collée, coupes et alignements compris.",
    unit: "m²",
    quantity: (g, o) => (o.wallCladding ? g.wallArea : 0),
    labor: [18, 22, 28],
    nature: "main_oeuvre",
    optional: true,
  },
  {
    lot: "carrelage",
    designation: "Plinthes, profilés et finitions",
    description: "Plinthes assorties et profilés de finition (angles, niches).",
    unit: "ml",
    quantity: (g) => g.perimeter,
    supply: [7, 10, 15],
    nature: "materiaux",
  },
  {
    lot: "carrelage",
    designation: "Pose des plinthes et profilés",
    description: "Découpe et pose des plinthes et profilés.",
    unit: "ml",
    quantity: (g) => g.perimeter,
    labor: [5, 6, 8],
    nature: "main_oeuvre",
  },

  // ── E. Plomberie et évacuation ───────────────────────────────────────────
  {
    lot: "plomberie",
    designation: "Dépose et remplacement des canalisations nécessaires",
    description: "Remplacement des tronçons vétustes, sans reprise générale.",
    unit: "ml",
    quantity: () => 8,
    supply: [6, 8, 11],
    labor: [6, 7, 9],
    nature: "materiaux",
  },
  {
    lot: "plomberie",
    designation: "Alimentation eau (PER)",
    description: "Réseau neuf eau froide / eau chaude vers douche, lavabo et WC.",
    unit: "ml",
    quantity: () => 15,
    supply: [5, 7, 9],
    labor: [4, 5, 6],
    nature: "materiaux",
  },
  {
    lot: "plomberie",
    designation: "Évacuation (PVC Ø50/Ø100)",
    description: "Évacuations PVC des appareils et raccordement à la chute.",
    unit: "ml",
    quantity: () => 10,
    supply: [7, 9, 12],
    labor: [4, 5, 6],
    nature: "materiaux",
  },
  {
    lot: "plomberie",
    designation: "Collecteur et robinets d'arrêt",
    description: "Collecteur simple, robinets d'arrêt et raccords.",
    unit: "lot",
    quantity: () => 1,
    supply: [110, 170, 280],
    labor: [40, 55, 80],
    nature: "materiaux",
  },
  {
    lot: "plomberie",
    designation: "Siphons et bondes",
    description: "Siphons lavabo, WC et douche, bondes de sol.",
    unit: "unité",
    quantity: () => 3,
    supply: [22, 35, 60],
    labor: [12, 16, 22],
    nature: "materiaux",
  },
  {
    lot: "plomberie",
    designation: "Installation et raccordement du lavabo",
    description: "Pose, mise à niveau et raccordement eau / évacuation.",
    unit: "unité",
    quantity: () => 1,
    labor: [70, 90, 120],
    nature: "main_oeuvre",
  },
  {
    lot: "plomberie",
    designation: "Installation et raccordement du WC",
    description: "Pose, fixation et raccordement complet.",
    unit: "unité",
    quantity: (_g, o) => (o.toilet ? 1 : 0),
    labor: [90, 110, 150],
    nature: "main_oeuvre",
    optional: true,
  },
  {
    lot: "plomberie",
    designation: "Installation de la douche ou de la baignoire",
    description: "Pose et raccordement de l'équipement retenu.",
    unit: "unité",
    quantity: () => 1,
    labor: [160, 200, 280],
    nature: "main_oeuvre",
  },
  {
    lot: "plomberie",
    designation: "Mitigeur de lavabo",
    description: "Mitigeur mono-commande, cartouche céramique.",
    unit: "unité",
    quantity: () => 1,
    supply: [75, 160, 340],
    nature: "equipements",
  },
  {
    lot: "plomberie",
    designation: "Mitigeur de douche (colonne)",
    description: "Mitigeur / colonne de douche avec pommeau.",
    unit: "unité",
    quantity: (_g, o) => (o.shower === "baignoire" ? 0 : 1),
    supply: [160, 300, 620],
    nature: "equipements",
    optional: true,
  },
  {
    lot: "plomberie",
    designation: "Mitigeur de baignoire",
    description: "Mitigeur de baignoire avec inverseur.",
    unit: "unité",
    quantity: (_g, o) => (o.shower === "baignoire" ? 1 : 0),
    supply: [180, 340, 650],
    nature: "equipements",
    optional: true,
  },
  {
    lot: "plomberie",
    designation: "Essais d'étanchéité et contrôle des raccordements",
    description: "Épreuve du réseau, contrôle des évacuations et mise en service.",
    unit: "lot",
    quantity: () => 1,
    labor: [90, 120, 170],
    nature: "main_oeuvre",
  },

  // ── F. Sanitaires et mobilier ────────────────────────────────────────────
  {
    lot: "sanitaires",
    designation: "WC (à poser ou suspendu)",
    description:
      "Économique / Standard : WC à poser complet. Premium : WC suspendu avec bâti-support.",
    unit: "unité",
    quantity: (_g, o) => (o.toilet ? 1 : 0),
    supply: [190, 330, 620],
    nature: "equipements",
    optional: true,
  },
  {
    lot: "sanitaires",
    designation: "Lavabo ou vasque",
    description: "Lavabo céramique ou vasque à poser, selon la gamme.",
    unit: "unité",
    quantity: () => 1,
    supply: [95, 190, 420],
    nature: "equipements",
  },
  {
    lot: "sanitaires",
    designation: "Meuble sous vasque",
    description: "Meuble suspendu avec rangements, gamme assortie.",
    unit: "unité",
    quantity: (_g, o) => (o.vanity ? 1 : 0),
    supply: [170, 330, 690],
    nature: "equipements",
    optional: true,
  },
  {
    lot: "sanitaires",
    designation: "Miroir",
    description: "Miroir avec éclairage intégré (premium).",
    unit: "unité",
    quantity: (_g, o) => (o.mirror ? 1 : 0),
    supply: [40, 85, 170],
    nature: "equipements",
    optional: true,
  },
  {
    lot: "sanitaires",
    designation: "Receveur de douche 90×90",
    description: "Receveur extra-plat avec bonde.",
    unit: "unité",
    quantity: (_g, o) => (o.shower === "receveur" ? 1 : 0),
    supply: [160, 290, 580],
    nature: "equipements",
    optional: true,
  },
  {
    lot: "sanitaires",
    designation: "Douche à l'italienne (caniveau + pente)",
    description: "Receveur linéaire encastré, caniveau inox et finition.",
    unit: "unité",
    quantity: (_g, o) => (o.shower === "italienne" ? 1 : 0),
    supply: [380, 600, 980],
    nature: "equipements",
    optional: true,
  },
  {
    lot: "sanitaires",
    designation: "Baignoire",
    description: "Baignoire acrylique, tablier et vidage.",
    unit: "unité",
    quantity: (_g, o) => (o.shower === "baignoire" ? 1 : 0),
    supply: [450, 750, 1400],
    nature: "equipements",
    optional: true,
  },
  {
    lot: "sanitaires",
    designation: "Paroi ou cabine de douche",
    description: "Paroi vitrée 8 mm, profilés et joints.",
    unit: "unité",
    quantity: (_g, o) => (o.shower === "baignoire" || !o.partition ? 0 : 1),
    supply: [220, 420, 800],
    nature: "equipements",
    optional: true,
  },
  {
    lot: "sanitaires",
    designation: "Accessoires sanitaires",
    description: "Porte-serviettes, porte-savon, crochets, distributeur.",
    unit: "lot",
    quantity: () => 1,
    supply: [90, 160, 320],
    nature: "equipements",
  },

  // ── G. Électricité et ventilation ────────────────────────────────────────
  {
    lot: "electricite",
    designation: "Points électriques SDB",
    description:
      "1 point lumineux, 1 prise rasoir / sèche-serviettes et 2 commandes.",
    unit: "points",
    quantity: () => 4,
    supply: [55, 70, 95],
    labor: [18, 22, 28],
    nature: "equipements",
  },
  {
    lot: "electricite",
    designation: "Mise à la terre et vérification de la sécurité électrique",
    description: "Liaison équipotentielle, essais et contrôle des protections.",
    unit: "lot",
    quantity: () => 1,
    labor: [90, 120, 170],
    nature: "main_oeuvre",
  },
  {
    lot: "electricite",
    designation: "Extracteur d'air",
    description: "Ventilation mécanique simple flux, gaine et grille.",
    unit: "unité",
    quantity: (_g, o) => (o.extractor ? 1 : 0),
    supply: [150, 190, 280],
    labor: [50, 70, 100],
    nature: "equipements",
    optional: true,
  },

  // ── H. Finitions ─────────────────────────────────────────────────────────
  {
    lot: "finitions",
    designation: "Joints silicone sanitaires",
    description: "Joints de silicone anti-moisissure autour des équipements.",
    unit: "ml",
    quantity: (g) => g.perimeter + 4,
    supply: [4, 6, 9],
    labor: [2, 3, 4],
    nature: "materiaux",
  },
  {
    lot: "finitions",
    designation: "Peinture adaptée aux pièces humides",
    description: "Peinture satinée lessivable sur plafond et murs non carrelés.",
    unit: "m²",
    quantity: (g, o) => g.ceilingArea + (o.wallCladding ? g.perimeter * 0.4 : g.wallArea),
    supply: [5, 8, 11],
    labor: [4, 5, 7],
    nature: "materiaux",
  },
  {
    lot: "finitions",
    designation: "Retouches et nettoyage final",
    description: "Reprises de finition, nettoyage complet et évacuation des emballages.",
    unit: "lot",
    quantity: () => 1,
    labor: [90, 120, 170],
    nature: "main_oeuvre",
  },
];

const LOT_ORDER: readonly SdbLotId[] = [
  "depose",
  "maconnerie",
  "etancheite",
  "carrelage",
  "plomberie",
  "sanitaires",
  "electricite",
  "finitions",
];

/**
 * Construit la ligne chiffrée d'un poste.
 * `unitPriceHT` = fourniture + main-d'œuvre ; la part main-d'œuvre est
 * conservée séparément (`laborHT`) pour l'affichage, jamais recomptée.
 */
function buildLine(
  item: SdbItem,
  geometry: SdbGeometry,
  options: SdbOptions,
  scenario: SdbScenario,
  regionFactor: number,
  resolvePrice?: SdbPriceResolver,
): SdbLine | null {
  const rawQty = item.quantity(geometry, options);
  const quantity = roundQty(rawQty);
  if (!(quantity > 0)) return null;

  let supplyHT = item.supply ? pickPrice(item.supply, scenario) : 0;
  let source: SdbLine["source"] = "grille_2026";
  if (supplyHT > 0) {
    supplyHT = round2(supplyHT * regionFactor);
    if (resolvePrice) {
      const resolved = resolvePrice(item.designation, supplyHT);
      supplyHT = round2(resolved.price);
      source = resolved.source;
    }
  }
  const laborHT = item.labor ? round2(pickPrice(item.labor, scenario) * regionFactor) : 0;
  const unitPriceHT = round2(supplyHT + laborHT);
  if (!(unitPriceHT > 0)) return null;

  const totalHT = round2(quantity * unitPriceHT);
  const vatAmount = round2((totalHT * SDB_VAT_RATE) / 100);
  const totalTTC = round2(totalHT + vatAmount);

  return {
    designation: item.designation,
    description: item.description,
    unit: item.unit,
    quantity,
    unitPriceHT,
    unitPriceLaborHT: laborHT,
    totalHT,
    laborHT: round2(quantity * laborHT),
    vatRate: SDB_VAT_RATE,
    vatAmount,
    totalTTC,
    // 4 décimales : sur de grandes quantités (colle, joint en kg), un prix
    // arrondi au centime ferait diverger « Quantité × P.U. » du montant.
    unitPriceTTC: round4(totalTTC / quantity),
    nature: item.nature,
    source,
  };
}

/** Totaux par nature, HT, TVA et TTC d'un ensemble de lots. */
function totalsOf(lots: readonly SdbLot[], surface: number): SdbTotals {
  const totals: SdbTotals = {
    materiaux: 0,
    mainOeuvre: 0,
    equipements: 0,
    transport: 0,
    etudes: 0,
    totalHT: 0,
    vatAmount: 0,
    totalTTC: 0,
    costPerM2TTC: 0,
  };
  for (const lot of lots) {
    for (const line of lot.lines) {
      const labor = line.laborHT;
      const own = line.totalHT - labor;
      if (line.nature === "main_oeuvre") {
        // Les lignes de prestation sont intégralement de la main-d'œuvre.
        totals.mainOeuvre += line.totalHT;
      } else {
        totals[line.nature] += own;
        totals.mainOeuvre += labor;
      }
      totals.totalHT += line.totalHT;
      totals.vatAmount += line.vatAmount;
      totals.totalTTC += line.totalTTC;
    }
  }
  totals.totalHT = round2(totals.totalHT);
  totals.vatAmount = round2(totals.vatAmount);
  totals.totalTTC = round2(totals.totalTTC);
  totals.materiaux = round2(totals.materiaux);
  totals.mainOeuvre = round2(totals.mainOeuvre);
  totals.equipements = round2(totals.equipements);
  totals.transport = round2(totals.transport);
  totals.etudes = round2(totals.etudes);
  totals.costPerM2TTC = surface > 0 ? Math.round(totals.totalTTC / surface) : 0;
  return totals;
}

/**
 * Chiffrage complet d'une rénovation de salle de bain.
 *
 * @param surface surface au sol réelle de la pièce (m²)
 * @param scenario scénario de finition (grille de prix propre)
 * @param options équipements réellement sélectionnés (les postes non retenus
 *        ne sont jamais facturés)
 * @param regionFactor coefficient régional appliqué une seule fois aux prix
 * @param resolvePrice prix administré (materialPrices) prioritaire s'il existe
 */
export function buildSdbEstimate(params: {
  surface: number;
  scenario?: SdbScenario;
  options?: Partial<SdbOptions>;
  regionFactor?: number;
  resolvePrice?: SdbPriceResolver;
}): SdbEstimate {
  const scenario = params.scenario ?? "standard";
  const options: SdbOptions = { ...SDB_DEFAULT_OPTIONS, ...(params.options ?? {}) };
  const regionFactor =
    Number.isFinite(params.regionFactor) && (params.regionFactor ?? 0) > 0
      ? (params.regionFactor as number)
      : 1;
  const geometry = sdbGeometry(params.surface);

  const lots: SdbLot[] = LOT_ORDER.map((id) => {
    const lines = SDB_ITEMS.filter((item) => item.lot === id)
      .map((item) =>
        buildLine(item, geometry, options, scenario, regionFactor, params.resolvePrice),
      )
      .filter((line): line is SdbLine => line !== null);
    const subtotalHT = round2(lines.reduce((s, l) => s + l.totalHT, 0));
    const vatAmount = round2(lines.reduce((s, l) => s + l.vatAmount, 0));
    return {
      id,
      name: SDB_LOT_NAMES[id],
      nature: lines[0]?.nature ?? "materiaux",
      lines,
      subtotalHT,
      vatAmount,
      subtotalTTC: round2(subtotalHT + vatAmount),
    };
  }).filter((lot) => lot.lines.length > 0);

  return {
    lots,
    totals: totalsOf(lots, geometry.floorArea),
    geometry,
    scenario,
    options,
    vatRate: SDB_VAT_RATE,
    priceBase: SDB_PRICE_BASE,
    adminPricedLines: lots.reduce(
      (n, l) => n + l.lines.filter((line) => line.source === "prix_administre").length,
      0,
    ),
  };
}

/**
 * Lots prêts pour l'affichage du « Quantitatif détaillé » et du devis PDF.
 * `unitPrice` / `total` sont TTC (convention du DQE) ; `totalHT`, `vatRate` et
 * `vatAmount` portent la décomposition fiscale de chaque ligne.
 */
export function sdbDqeLots(estimate: SdbEstimate): {
  id: string;
  name: string;
  nature: SdbNature;
  percent: number;
  subtotal: number;
  lines: {
    designation: string;
    description?: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    total: number;
    nature: SdbNature;
    totalHT: number;
    vatRate: number;
    vatAmount: number;
  }[];
}[] {
  const total = estimate.totals.totalTTC;
  return estimate.lots.map((lot) => ({
    id: lot.id,
    name: lot.name,
    nature: lot.nature,
    percent: total > 0 ? Math.round((lot.subtotalTTC / total) * 1000) / 10 : 0,
    subtotal: Math.round(lot.subtotalTTC),
    lines: lot.lines.map((l) => ({
      designation: l.designation,
      description: l.description,
      unit: l.unit,
      quantity: l.quantity,
      unitPrice: l.unitPriceTTC,
      total: Math.round(l.totalTTC),
      nature: l.nature,
      totalHT: l.totalHT,
      vatRate: l.vatRate,
      vatAmount: l.vatAmount,
    })),
  }));
}

/** Totaux TTC des trois scénarios, pour une même salle de bain. */
export function sdbScenarioTotals(
  surface: number,
  regionFactor = 1,
  options?: Partial<SdbOptions>,
): Record<SdbScenario, SdbTotals> {
  return {
    economique: buildSdbEstimate({ surface, scenario: "economique", options, regionFactor })
      .totals,
    standard: buildSdbEstimate({ surface, scenario: "standard", options, regionFactor })
      .totals,
    premium: buildSdbEstimate({ surface, scenario: "premium", options, regionFactor })
      .totals,
  };
}

/** Le type de projet est-il une rénovation de salle de bain ? */
export function isRenovationSdb(category: string | null | undefined): boolean {
  return (category ?? "").trim() === "renovation_salle_de_bain";
}
