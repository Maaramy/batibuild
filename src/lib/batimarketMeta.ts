// ============================================================================
// BatiMarket — catalogue partagé (module SANS aucune dépendance).
//
// ⚠️ Ce fichier est importé par le navigateur ET par le backend Convex : il ne
// doit donc JAMAIS importer `src/convex/schema.ts` (cf. le garde-fou
// src/lib/clientBundleGuards.test.ts) ni quoi que ce soit d'autre.
// ============================================================================

// ============================================================================
// Catégories / sous-catégories — marché tunisien de la construction
// ============================================================================

export interface BatiMarketSubCategory {
  slug: string;
  label: string;
}

export interface BatiMarketCategory {
  slug: string;
  label: string;
  labelAr: string;
  /** Icône lucide (le shim d'icônes doit l'exporter). */
  icon: string;
  subcategories: BatiMarketSubCategory[];
}

export const BATIMARKET_CATEGORIES: BatiMarketCategory[] = [
  {
    slug: "gros_oeuvre",
    label: "Gros œuvre",
    labelAr: "الأشغال الكبرى",
    icon: "Blocks",
    subcategories: [
      { slug: "ciment", label: "Ciment" },
      { slug: "beton", label: "Béton" },
      { slug: "sable", label: "Sable" },
      { slug: "gravier", label: "Gravier" },
      { slug: "briques", label: "Briques" },
      { slug: "blocs", label: "Blocs" },
      { slug: "fer_a_beton", label: "Fer à béton" },
      { slug: "treillis_soude", label: "Treillis soudé" },
      { slug: "poutrelles", label: "Poutrelles" },
      { slug: "hourdis", label: "Hourdis" },
    ],
  },
  {
    slug: "second_oeuvre",
    label: "Second œuvre",
    labelAr: "الأشغال الثانوية",
    icon: "Layers",
    subcategories: [
      { slug: "platre", label: "Plâtre" },
      { slug: "plaques_de_platre", label: "Plaques de plâtre" },
      { slug: "mortier", label: "Mortier" },
      { slug: "colle", label: "Colle" },
      { slug: "enduits", label: "Enduits" },
      { slug: "isolation", label: "Isolation" },
      { slug: "etancheite", label: "Étanchéité" },
    ],
  },
  {
    slug: "revetement",
    label: "Revêtement",
    labelAr: "التغليف",
    icon: "LayoutGrid",
    subcategories: [
      { slug: "carrelage", label: "Carrelage" },
      { slug: "faience", label: "Faïence" },
      { slug: "marbre", label: "Marbre" },
      { slug: "parquet", label: "Parquet" },
      { slug: "pierre", label: "Pierre" },
      { slug: "revetement_mural", label: "Revêtement mural" },
    ],
  },
  {
    slug: "plomberie",
    label: "Plomberie",
    labelAr: "السباكة",
    icon: "Droplets",
    subcategories: [
      { slug: "tubes", label: "Tubes" },
      { slug: "raccords", label: "Raccords" },
      { slug: "robinetterie", label: "Robinetterie" },
      { slug: "sanitaires", label: "Sanitaires" },
      { slug: "chauffe_eau", label: "Chauffe-eau" },
      { slug: "accessoires", label: "Accessoires" },
    ],
  },
  {
    slug: "electricite",
    label: "Électricité",
    labelAr: "الكهرباء",
    icon: "Zap",
    subcategories: [
      { slug: "cables", label: "Câbles" },
      { slug: "disjoncteurs", label: "Disjoncteurs" },
      { slug: "tableaux_electriques", label: "Tableaux électriques" },
      { slug: "prises", label: "Prises" },
      { slug: "interrupteurs", label: "Interrupteurs" },
      { slug: "eclairage", label: "Éclairage" },
      { slug: "accessoires", label: "Accessoires" },
    ],
  },
  {
    slug: "menuiserie",
    label: "Menuiserie",
    labelAr: "النجارة",
    icon: "DoorOpen",
    subcategories: [
      { slug: "portes", label: "Portes" },
      { slug: "fenetres", label: "Fenêtres" },
      { slug: "aluminium", label: "Aluminium" },
      { slug: "pvc", label: "PVC" },
      { slug: "bois", label: "Bois" },
      { slug: "quincaillerie", label: "Quincaillerie" },
    ],
  },
  {
    slug: "peinture",
    label: "Peinture",
    labelAr: "الدهن",
    icon: "Paintbrush",
    subcategories: [
      { slug: "peinture_interieure", label: "Peinture intérieure" },
      { slug: "peinture_exterieure", label: "Peinture extérieure" },
      { slug: "primaire", label: "Primaire" },
      { slug: "vernis", label: "Vernis" },
      { slug: "accessoires", label: "Accessoires" },
    ],
  },
  {
    slug: "outillage",
    label: "Outillage",
    labelAr: "العدة",
    icon: "Wrench",
    subcategories: [
      { slug: "outillage_manuel", label: "Outillage manuel" },
      { slug: "outillage_electrique", label: "Outillage électrique" },
      { slug: "machines", label: "Machines" },
      { slug: "equipements_chantier", label: "Équipements de chantier" },
    ],
  },
  {
    slug: "equipements_chantier",
    label: "Équipements de chantier",
    labelAr: "تجهيزات الورشة",
    icon: "HardHat",
    subcategories: [
      { slug: "echafaudage", label: "Échafaudage" },
      { slug: "coffrage", label: "Coffrage" },
      { slug: "securite", label: "Sécurité" },
      { slug: "signalisation", label: "Signalisation" },
      { slug: "manutention", label: "Manutention" },
    ],
  },
  {
    slug: "jardin_exterieur",
    label: "Jardin / extérieur",
    labelAr: "الحدائق والخارج",
    icon: "Palmtree",
    subcategories: [
      { slug: "piscines", label: "Piscines" },
      { slug: "equipements_piscine", label: "Équipements piscine" },
      { slug: "amenagement_exterieur", label: "Aménagement extérieur" },
    ],
  },
];

export const BATIMARKET_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  BATIMARKET_CATEGORIES.map((c) => [c.slug, c.label]),
);

export const BATIMARKET_SUBCATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  BATIMARKET_CATEGORIES.flatMap((c) => c.subcategories.map((s) => [s.slug, s.label])),
);

export function batimarketCategoryLabel(slug: string | undefined): string {
  if (!slug) return "—";
  return BATIMARKET_CATEGORY_LABELS[slug] ?? slug;
}

export function batimarketSubcategoryLabel(slug: string | undefined): string {
  if (!slug) return "";
  return BATIMARKET_SUBCATEGORY_LABELS[slug] ?? slug;
}

export function batimarketSubcategories(category: string): BatiMarketSubCategory[] {
  return BATIMARKET_CATEGORIES.find((c) => c.slug === category)?.subcategories ?? [];
}

// ============================================================================
// Unités de vente
// ============================================================================

export const BATIMARKET_UNITS = [
  "piece",
  "m2",
  "m3",
  "kg",
  "tonne",
  "sac",
  "litre",
  "rouleau",
  "carton",
  "palette",
  "lot",
] as const;

export type BatiMarketUnit = (typeof BATIMARKET_UNITS)[number];

export const BATIMARKET_UNIT_LABELS: Record<string, string> = {
  piece: "pièce",
  m2: "m²",
  m3: "m³",
  kg: "kg",
  tonne: "tonne",
  sac: "sac",
  litre: "litre",
  rouleau: "rouleau",
  carton: "carton",
  palette: "palette",
  lot: "lot",
};

export function batimarketUnitLabel(unit: string | undefined): string {
  if (!unit) return "";
  return BATIMARKET_UNIT_LABELS[unit] ?? unit;
}

// ============================================================================
// Statuts (commandes, fournisseurs, produits, livraison)
// ============================================================================

export const BATIMARKET_ORDER_STATUSES = [
  "new",
  "confirmed",
  "preparing",
  "shipped",
  "delivering",
  "delivered",
  "canceled",
] as const;

export type BatiMarketOrderStatus = (typeof BATIMARKET_ORDER_STATUSES)[number];

export const BATIMARKET_ORDER_STATUS_LABELS: Record<BatiMarketOrderStatus, string> = {
  new: "Nouvelle commande",
  confirmed: "Confirmée",
  preparing: "En préparation",
  shipped: "Expédiée",
  delivering: "En livraison",
  delivered: "Livrée",
  canceled: "Annulée",
};

/** Progression linéaire d'une commande (les statuts annulés sortent du flux). */
export const BATIMARKET_ORDER_FLOW: BatiMarketOrderStatus[] = [
  "new",
  "confirmed",
  "preparing",
  "shipped",
  "delivering",
  "delivered",
];

export function nextOrderStatus(
  status: BatiMarketOrderStatus,
): BatiMarketOrderStatus | null {
  const i = BATIMARKET_ORDER_FLOW.indexOf(status);
  if (i < 0 || i >= BATIMARKET_ORDER_FLOW.length - 1) return null;
  return BATIMARKET_ORDER_FLOW[i + 1];
}

export function orderStatusLabel(status: string): string {
  return BATIMARKET_ORDER_STATUS_LABELS[status as BatiMarketOrderStatus] ?? status;
}

export const BATIMARKET_SUPPLIER_STATUSES = [
  "pending",
  "review",
  "active",
  "suspended",
] as const;

export type BatiMarketSupplierStatus = (typeof BATIMARKET_SUPPLIER_STATUSES)[number];

export const BATIMARKET_SUPPLIER_STATUS_LABELS: Record<BatiMarketSupplierStatus, string> = {
  pending: "En attente",
  review: "Vérification",
  active: "Actif",
  suspended: "Suspendu",
};

export function supplierStatusLabel(status: string): string {
  return BATIMARKET_SUPPLIER_STATUS_LABELS[status as BatiMarketSupplierStatus] ?? status;
}

export const BATIMARKET_PRODUCT_STATUSES = ["draft", "active", "suspended", "archived"] as const;
export type BatiMarketProductStatus = (typeof BATIMARKET_PRODUCT_STATUSES)[number];

export const BATIMARKET_PRODUCT_STATUS_LABELS: Record<BatiMarketProductStatus, string> = {
  draft: "Brouillon",
  active: "En ligne",
  suspended: "Suspendu",
  archived: "Archivé",
};

export const BATIMARKET_AVAILABILITIES = ["disponible", "sur_commande", "rupture"] as const;
export type BatiMarketAvailability = (typeof BATIMARKET_AVAILABILITIES)[number];

export const BATIMARKET_AVAILABILITY_LABELS: Record<BatiMarketAvailability, string> = {
  disponible: "Disponible",
  sur_commande: "Sur commande",
  rupture: "Rupture",
};

export const BATIMARKET_DELIVERY_MODES = [
  "fixed",
  "per_item",
  "free_above",
  "pickup",
] as const;
export type BatiMarketDeliveryMode = (typeof BATIMARKET_DELIVERY_MODES)[number];

export const BATIMARKET_DELIVERY_MODE_LABELS: Record<BatiMarketDeliveryMode, string> = {
  fixed: "Tarif fixe",
  per_item: "Tarif selon quantité",
  free_above: "Gratuit à partir d'un montant",
  pickup: "Retrait chez le fournisseur",
};

// ============================================================================
// Prix & TVA (HT → TTC)
// ============================================================================

/** Taux de TVA par défaut appliqué en Tunisie sur les matériaux de construction. */
export const BATIMARKET_DEFAULT_VAT_RATE = 19;

/** Taux de TVA proposés dans les formulaires. */
export const BATIMARKET_VAT_RATES = [0, 7, 13, 19] as const;

export const BATIMARKET_CURRENCY = "TND";

/** Arrondit à 3 décimales (millimes tunisiens) pour éviter les dérives flottantes. */
export function round3(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

/** Montant HT d'une ligne (quantité × prix unitaire HT). */
export function lineHT(quantity: number, unitPriceHT: number): number {
  return round3((Number(quantity) || 0) * (Number(unitPriceHT) || 0));
}

/** Montant de TVA d'une ligne HT. */
export function tvaAmount(amountHT: number, vatRate: number): number {
  return round3((Number(amountHT) || 0) * ((Number(vatRate) || 0) / 100));
}

/** Montant TTC d'une ligne HT. */
export function ttcFromHT(amountHT: number, vatRate: number): number {
  return round3((Number(amountHT) || 0) + tvaAmount(amountHT, vatRate));
}

/** Totaux d'un ensemble de lignes (HT, TVA, TTC) — TVA calculée ligne par ligne. */
export interface BatiMarketTotals {
  ht: number;
  vat: number;
  ttc: number;
}

export function computeTotals(
  lines: Array<{ quantity: number; unitPriceHT: number; vatRate: number }>,
): BatiMarketTotals {
  let ht = 0;
  let vat = 0;
  for (const line of lines) {
    const amountHT = lineHT(line.quantity, line.unitPriceHT);
    ht += amountHT;
    vat += tvaAmount(amountHT, line.vatRate);
  }
  return { ht: round3(ht), vat: round3(vat), ttc: round3(ht + vat) };
}

/** Frais de livraison d'une règle donnée. */
export function deliveryFeeFor(
  mode: BatiMarketDeliveryMode | string,
  params: {
    fee?: number;
    freeAbove?: number;
    subtotalHT: number;
    quantity: number;
  },
): number {
  const fee = Number(params.fee) || 0;
  switch (mode) {
    case "pickup":
      return 0;
    case "per_item":
      return round3(fee * Math.max(1, Number(params.quantity) || 0));
    case "free_above":
      return params.freeAbove && params.subtotalHT >= params.freeAbove ? 0 : fee;
    case "fixed":
    default:
      return round3(fee);
  }
}

/** Formatage monétaire tunisien : « 1 234,500 TND ». */
export function formatTND(value: number | undefined | null): string {
  const n = Number(value) || 0;
  return `${n.toLocaleString("fr-FR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} ${BATIMARKET_CURRENCY}`;
}

/** Formatage compact : « 1 250 TND » (sans millimes) pour les cartes produits. */
export function formatTNDShort(value: number | undefined | null): string {
  const n = Number(value) || 0;
  return `${n.toLocaleString("fr-FR", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 3,
    maximumFractionDigits: 3,
  })} ${BATIMARKET_CURRENCY}`;
}

// ============================================================================
// Caractéristiques techniques (clés proposées dans le formulaire produit)
// ============================================================================

export const BATIMARKET_SPEC_SUGGESTIONS = [
  "Dimensions",
  "Diamètre",
  "Épaisseur",
  "Poids",
  "Marque",
  "Origine",
  "Résistance",
  "Couleur",
  "Garantie",
  "Conditionnement",
] as const;

// ============================================================================
// Tri / affichage catalogue
// ============================================================================

export const BATIMARKET_SORTS = [
  "recent",
  "price_asc",
  "price_desc",
  "popular",
  "rating",
] as const;

export type BatiMarketSort = (typeof BATIMARKET_SORTS)[number];

export const BATIMARKET_SORT_LABELS: Record<BatiMarketSort, string> = {
  recent: "Nouveautés",
  price_asc: "Prix croissant",
  price_desc: "Prix décroissant",
  popular: "Les plus vus",
  rating: "Mieux notés",
};
