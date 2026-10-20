// ============================================================================
// AUDIT MATÉRIAUX — MAISON RDC 100 m² (TUNIS, STANDARD)
// ----------------------------------------------------------------------------
// Recalcul physique des 23 articles matériaux du projet à partir de la
// surface construite, des ouvrages standard et des rendements techniques.
//
// Le module est PUR (aucune dépendance Convex / React) et ne modifie aucune
// donnée enregistrée. Il produit un audit ligne par ligne, avec :
//   • la quantité physique recalculée et son unité ;
//   • le prix unitaire TTC retenu (et son équivalent HT) ;
//   • le montant recalculé ;
//   • le statut (corrigé / à valider / conservé) et la justification.
//
// Les plans cotés, la note de calcul structure et les devis fournisseurs ne
// sont pas disponibles : les quantités qui en dépendent sont marquées
// « à valider ». Aucune valeur n'est remplacée en base par ce module.
// ============================================================================

export type MaterialAuditStatus = "corrige" | "a_valider" | "conserve";

export type MaterialAuditCategory = "gros_oeuvre" | "second_oeuvre";

export interface MaterialAuditLine {
  key: string;
  article: string;
  category: MaterialAuditCategory;
  quantity: number;
  unit: string;
  /** Prix unitaire TTC retenu (TND). */
  unitPriceTTC: number;
  /** Prix unitaire HT calculé (TTC / 1,19), TND. */
  unitPriceHT: number;
  /** Montant recalculé TTC (quantité × prix unitaire TTC). */
  totalTTC: number;
  status: MaterialAuditStatus;
  justification: string;
  /** Donnée manquante qui empêche de figer la quantité. */
  missingData?: string;
}

export interface ResidentialMaterialAuditInput {
  /** Surface couverte du RDC (m²). */
  surface: number;
  /** Nombre de niveaux (1 = RDC). */
  floors: number;
  /** Surface réellement construite, tous niveaux (m²). */
  builtArea: number;
}

export interface ResidentialMaterialAuditResult {
  lines: MaterialAuditLine[];
  totals: {
    grosOeuvre: number;
    secondOeuvre: number;
    general: number;
  };
  assumptions: string[];
  missingData: string[];
}

const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const round1 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 10) / 10;
const roundQty = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 10) / 10;
const ceilQty = (n: number) => Math.ceil((Number.isFinite(n) ? n : 0) - 1e-9);

/** TVA tunisienne de référence (19 %). */
export const TUNISIA_VAT_RATE = 0.19;

/** Prix TTC → HT. Les prix du catalogue sont TTC. */
export function priceHT(priceTTC: number): number {
  return round2(priceTTC / (1 + TUNISIA_VAT_RATE));
}

/** Hypothèses géométriques et techniques de l'audit (RDC 100 m²). */
export interface ResidentialAuditAssumptions {
  wallHeight: number;
  externalPerimeter: number;
  openingsM2: number;
  internalWallLength: number;
  internalOpeningsM2: number;
  parpaingPerM2: number;
  brickPerM2: number;
  hourdisPerM2: number;
  foundationConcreteM3: number;
  slabConcreteM3: number;
  steelKgPerM2: number;
  cement42Bags: number;
  cement32Bags: number;
  sandM3: number;
  gravelM3: number;
  trellisM2: number;
  trellisPanelM2: number;
  formworkM3: number;
  excavationM3: number;
  floorTileM2: number;
  faienceM2: number;
  paintInteriorL: number;
  paintExteriorL: number;
  enduitKg: number;
  skirtingMl: number;
  interiorDoors: number;
  entranceDoors: number;
  windows: number;
  grilles: number;
  waterproofM2: number;
}

export function defaultResidentialAuditAssumptions(
  surface: number,
): ResidentialAuditAssumptions {
  const footprint = Math.max(0, surface);
  return {
    // 10 × 10 m : périmètre 40 m, hauteur 3,00 m, ouvertures 10,74 m².
    wallHeight: 3,
    externalPerimeter: 40,
    openingsM2: 10.74,
    // 3 chambres + séjour + cuisine + SDB + WC : ~35 ml de cloisons.
    internalWallLength: 35,
    internalOpeningsM2: 10.5,
    parpaingPerM2: 10,
    brickPerM2: 17,
    // Hourdis 16×50 : un élément tous les 0,50 m → 2 pièces/m².
    hourdisPerM2: 2,
    // Fondations filantes 40 ml × 0,60 × 0,80 ≈ 19,2 m³.
    foundationConcreteM3: round1(footprint * 0.192),
    // Dalle/plancher 20 cm : 0,19 m³/m² (20 cm moins la nervure).
    slabConcreteM3: round1(footprint * 0.19),
    // Ratio structurel RDC : 35 kg d'acier par m² construit.
    steelKgPerM2: 35,
    // Ciments séparés : mortiers de maçonnerie, enduits et chape.
    cement42Bags: 200,
    cement32Bags: 110,
    // Sable des mortiers/enduits/chape (le sable du béton prêt est inclus).
    sandM3: 48,
    // Aucun gravier séparé : tout le béton structurel est prêt à l'emploi.
    gravelM3: 0,
    trellisM2: round1(footprint * 1.1),
    // Panneau standard ST25 : 6,00 × 2,40 m = 14,4 m².
    trellisPanelM2: 14.4,
    formworkM3: round1(footprint * 0.045),
    excavationM3: round1(footprint * 0.19),
    // Sol : surface + 5 % de chutes.
    floorTileM2: round1(footprint * 1.05),
    faienceM2: 33,
    // Murs + plafonds : 2,5 m² par m² construit, 2 couches, 8 m²/L + 10 %.
    paintInteriorL: round1(((footprint * 2.5 * 2) / 8) * 1.1),
    // Façade : 80 m², 2 couches, 8 m²/L + 10 %.
    paintExteriorL: round1(((footprint * 0.8 * 2) / 8) * 1.1),
    // 2 couches × 1,2 kg/m²/couche sur 2,5 m²/m².
    enduitKg: round1(footprint * 2.5 * 2 * 1.2),
    skirtingMl: 80,
    interiorDoors: 5,
    entranceDoors: 1,
    windows: 8,
    grilles: 8,
    waterproofM2: round1(footprint * 1.0),
  };
}

interface PriceBook {
  cement42: number;
  cement32: number;
  sand: number;
  gravel: number;
  steel: number;
  trellisPanel: number;
  brick: number;
  hourdis: number;
  readyMix: number;
  formwork: number;
  excavation: number;
  parpaing: number;
  floorTile: number;
  faience: number;
  paintInteriorBucket: number;
  paintExteriorBucket: number;
  enduitBucket: number;
  skirting: number;
  interiorDoor: number;
  entranceDoor: number;
  window: number;
  grille: number;
  waterproof: number;
}

/** Prix TTC du marché tunisien (catalogue 2026 + base matériaux). */
export const PROJECT_23_PRICES: PriceBook = {
  cement42: 14.7,
  cement32: 11.2,
  sand: 33.5,
  gravel: 41,
  steel: 2800,
  // Prix marché d'un panneau ST25 6,00 × 2,40 m (14,4 m²), TTC.
  // Le catalogue à 31 TND correspond à un prix au m², pas au panneau.
  trellisPanel: 250,
  brick: 0.38,
  hourdis: 1.02,
  readyMix: 247.5,
  formwork: 576,
  excavation: 18,
  parpaing: 2,
  floorTile: 17.6,
  faience: 47.5,
  paintInteriorBucket: 81.78,
  paintExteriorBucket: 106.47,
  enduitBucket: 60.56,
  skirting: 9.5,
  interiorDoor: 750,
  entranceDoor: 925,
  window: 248,
  grille: 176,
  waterproof: 17.6,
};

const line = (
  key: string,
  article: string,
  category: MaterialAuditCategory,
  quantity: number,
  unit: string,
  unitPriceTTC: number,
  status: MaterialAuditStatus,
  justification: string,
  missingData?: string,
): MaterialAuditLine => ({
  key,
  article,
  category,
  quantity: roundQty(quantity),
  unit,
  unitPriceTTC: round2(unitPriceTTC),
  unitPriceHT: priceHT(unitPriceTTC),
  totalTTC: round2(roundQty(quantity) * unitPriceTTC),
  status,
  justification,
  ...(missingData ? { missingData } : {}),
});

/**
 * Audit des 23 articles d'une maison RDC 100 m² à Tunis, scénario Standard.
 * Les quantités sont physiques (aucun calage sur un budget cible).
 */
export function auditResidentialMaterials(
  input: ResidentialMaterialAuditInput,
  assumptions: ResidentialAuditAssumptions = defaultResidentialAuditAssumptions(
    input.surface,
  ),
  prices: PriceBook = PROJECT_23_PRICES,
): ResidentialMaterialAuditResult {
  const a = assumptions;
  const surface = Math.max(0, input.surface);
  const builtArea = Math.max(surface, input.builtArea || surface);

  const externalWallM2 = Math.max(
    0,
    a.externalPerimeter * a.wallHeight - a.openingsM2,
  );
  const internalWallM2 = Math.max(
    0,
    a.internalWallLength * a.wallHeight - a.internalOpeningsM2,
  );
  const parpaingQty = ceilQty(externalWallM2 * a.parpaingPerM2 * 1.05);
  const brickQty = ceilQty(internalWallM2 * a.brickPerM2 * 1.05);
  const hourdisQty = ceilQty(surface * a.hourdisPerM2 * 1.05);
  const readyMixM3 = round1(a.foundationConcreteM3 + a.slabConcreteM3);
  const steelTonnes = round2((builtArea * a.steelKgPerM2) / 1000);
  const trellisPanels = ceilQty(a.trellisM2 / a.trellisPanelM2);
  const paintInteriorBuckets = ceilQty(a.paintInteriorL / 20);
  const paintExteriorBuckets = ceilQty(a.paintExteriorL / 20);
  const enduitBuckets = ceilQty(a.enduitKg / 20);

  const lines: MaterialAuditLine[] = [
    line(
      "ciment_42",
      "Ciment CPJ 42.5 (sac 50 kg)",
      "gros_oeuvre",
      a.cement42Bags,
      "sac",
      prices.cement42,
      "a_valider",
      "Ciment des mortiers, enduits et chapes uniquement : le ciment du béton prêt à l'emploi (38,2 m³ à 300 kg/m³) est déjà compris dans la ligne béton. La quantité séparée est donc ramenée à 200 sacs au lieu de 1 059,1.",
      "Note de calcul des mortiers et dosages exacts par ouvrage.",
    ),
    line(
      "ciment_32",
      "Ciment CPJ 32.5 (sac 50 kg)",
      "gros_oeuvre",
      a.cement32Bags,
      "sac",
      prices.cement32,
      "a_valider",
      "Ciment de maçonnerie pour 1 148 parpaings et 1 687 briques : 110 sacs, au lieu de 302,6 issus du calage budgétaire.",
      "Dosage du mortier de montage et dimensions exactes des murs.",
    ),
    line(
      "sable",
      "Sable de construction 0/4",
      "gros_oeuvre",
      a.sandM3,
      "m³",
      prices.sand,
      "a_valider",
      "Sable des mortiers, enduits et chape (48 m³). Le sable contenu dans les 38 m³ de béton prêt n'est pas recompté.",
      "Plans de maçonnerie et épaisseurs d'enduit.",
    ),
    line(
      "gravier",
      "Gravier concassé 15/25",
      "gros_oeuvre",
      a.gravelM3,
      "m³",
      prices.gravel,
      "corrige",
      "Aucun gravier séparé : les 38 m³ de béton structurel sont fournis prêt à l'emploi. Les 45,4 m³ initiaux doublonnaient le gravier déjà inclus dans le béton.",
    ),
    line(
      "acier",
      "Acier à béton T12 (tonne)",
      "gros_oeuvre",
      steelTonnes,
      "tonne",
      prices.steel,
      "a_valider",
      `Ratio structurel RDC de ${a.steelKgPerM2} kg/m² × ${builtArea} m² = ${steelTonnes} t. Les 6,1 t initiales (61 kg/m²) ne sont justifiées par aucune note de calcul.`,
      "Note de calcul béton armé (ferraillage fondations, poteaux, poutres, dalle).",
    ),
    line(
      "treillis",
      "Treillis soudé ST25 (panneau)",
      "gros_oeuvre",
      trellisPanels,
      "panneau",
      prices.trellisPanel,
      "a_valider",
      `Panneau standard 6,00 × 2,40 m = ${a.trellisPanelM2} m² : ${a.trellisM2} m² ÷ ${a.trellisPanelM2} m² = ${trellisPanels} panneaux. Le prix catalogue de 31 TND est un prix au m², pas un prix de panneau ; le prix marché d'un panneau est retenu à 250 TND.`,
      "Format réel et prix fournisseur du panneau (le catalogue mélange prix au m² et prix au panneau).",
    ),
    line(
      "brique",
      "Brique creuse 10 cm",
      "gros_oeuvre",
      brickQty,
      "pièce",
      prices.brick,
      "a_valider",
      `Cloisons intérieures : ${round1(internalWallM2)} m² × ${a.brickPerM2} pièces/m² + 5 % = ${brickQty} pièces. Les 17 020,7 pièces initiales correspondent à un calage budgétaire, pas à un métré.`,
      "Plan de cloisonnement et hauteurs réelles.",
    ),
    line(
      "hourdis",
      "Hourdis 16×50",
      "gros_oeuvre",
      hourdisQty,
      "pièce",
      prices.hourdis,
      "corrige",
      `Toiture 100 m² : hourdis 16×50 à raison de ${a.hourdisPerM2} pièces/m² + 5 % = ${hourdisQty} pièces. Les 2 118,1 pièces initiales sont techniquement impossibles (21 pièces/m²).`,
    ),
    line(
      "beton_pret",
      "Béton prêt à l'emploi 300 kg/m³",
      "gros_oeuvre",
      readyMixM3,
      "m³",
      prices.readyMix,
      "a_valider",
      `Fondations filantes (${a.foundationConcreteM3} m³) + dalle/plancher 20 cm (${a.slabConcreteM3} m³) = ${readyMixM3} m³. Les 75,6 m³ initiaux (0,756 m³/m²) sont surdimensionnés.`,
      "Note de calcul structure et épaisseurs réelles des dalles.",
    ),
    line(
      "bois_coffrage",
      "Bois de coffrage (m³)",
      "gros_oeuvre",
      a.formworkM3,
      "m³",
      prices.formwork,
      "a_valider",
      `Coffrage des fondations, poteaux, poutres et rives : ${a.formworkM3} m³ (0,045 m³/m²). Les 12,1 m³ initiaux sont issus du calage budgétaire.`,
      "Plan de coffrage et réemplois.",
    ),
    line(
      "fouilles",
      "Fouilles en rigole",
      "gros_oeuvre",
      a.excavationM3,
      "m³",
      prices.excavation,
      "a_valider",
      `Fouilles filantes sur 40 ml (0,60 × 0,80 m) : ${a.excavationM3} m³. Les 30,3 m³ initiaux supposent une profondeur ou une largeur non justifiée.`,
      "Rapport géotechnique et cotes de fondation.",
    ),
    line(
      "parpaing",
      "Parpaing creux 20 cm",
      "gros_oeuvre",
      parpaingQty,
      "pièce",
      prices.parpaing,
      "a_valider",
      `Murs extérieurs : ${round1(externalWallM2)} m² × ${a.parpaingPerM2} pièces/m² + 5 % = ${parpaingQty} pièces. Les 4 538,9 pièces initiales représentent 45 pièces/m² de plancher.`,
      "Plan de masse, longueur réelle des murs et ouvertures.",
    ),
    line(
      "carrelage",
      "Carrelage sol 40×40 (m²)",
      "second_oeuvre",
      a.floorTileM2,
      "m²",
      prices.floorTile,
      "corrige",
      `Sol carrelé : ${surface} m² + 5 % de chutes = ${a.floorTileM2} m². Les 148,8 m² initiaux ajoutent 49 % sans surface correspondante.`,
    ),
    line(
      "faience",
      "Faïence 20×30 (m²)",
      "second_oeuvre",
      a.faienceM2,
      "m²",
      prices.faience,
      "a_valider",
      "SDB + cuisine + WC : 33 m², quantité du DQE conservée. Les 36,6 m² initiaux ajoutent 11 % de chutes non justifiées.",
      "Plan des pièces humides et hauteurs de faïence.",
    ),
    line(
      "peinture_int",
      "Peinture intérieure mate (L)",
      "second_oeuvre",
      paintInteriorBuckets,
      "seau 20 L",
      prices.paintInteriorBucket,
      "corrige",
      `Murs + plafonds : 250 m² × 2 couches ÷ 8 m²/L = ${a.paintInteriorL} L, soit ${paintInteriorBuckets} seaux de 20 L. Les 68,7 seaux initiaux représentaient 1 374 L, soit 22 couches.`,
    ),
    line(
      "peinture_ext",
      "Peinture extérieure acrylique (L)",
      "second_oeuvre",
      paintExteriorBuckets,
      "seau 20 L",
      prices.paintExteriorBucket,
      "corrige",
      `Façade : 80 m² × 2 couches ÷ 8 m²/L = ${a.paintExteriorL} L, soit ${paintExteriorBuckets} seaux de 20 L. Les 13,7 seaux initiaux étaient surdimensionnés.`,
    ),
    line(
      "enduit",
      "Enduit de lissage (kg)",
      "second_oeuvre",
      enduitBuckets,
      "seau 20 kg",
      prices.enduitBucket,
      "a_valider",
      `Murs + plafonds : 250 m² × 2 couches × 1,2 kg/m² = ${a.enduitKg} kg, soit ${enduitBuckets} seaux de 20 kg. La quantité initiale (30 seaux) est conservée ; le prix unitaire (60,56 TND/seau, soit 3,03 TND/kg) reste à comparer au marché.`,
      "Rendement réel, conditionnement et prix fournisseur du produit choisi.",
    ),
    line(
      "plinthe",
      "Plinthe céramique (ml)",
      "second_oeuvre",
      a.skirtingMl,
      "ml",
      prices.skirting,
      "conserve",
      `Périmètre des pièces carrelées : ${a.skirtingMl} ml. La quantité initiale (80,1 ml) est cohérente.`,
    ),
    line(
      "porte_int",
      "Porte intérieure bois pleine",
      "second_oeuvre",
      a.interiorDoors,
      "pièce",
      prices.interiorDoor,
      "corrige",
      `5 portes intérieures (3 chambres + SDB + WC), conformément au DQE. Les 6 portes initiales ajoutaient une porte sans pièce correspondante.`,
    ),
    line(
      "porte_entree",
      "Porte d'entrée métallique",
      "second_oeuvre",
      a.entranceDoors,
      "pièce",
      prices.entranceDoor,
      "corrige",
      "Une seule entrée principale. Les 2 portes initiales doublonnaient la porte d'entrée.",
    ),
    line(
      "fenetre",
      "Fenêtre aluminium 90×120",
      "second_oeuvre",
      a.windows,
      "pièce",
      prices.window,
      "a_valider",
      `8 fenêtres de 0,90 × 1,20 m = 8,64 m² d'ouvertures. Le DQE annonce 13 m² : un plan de menuiseries est nécessaire pour trancher.`,
      "Plan des menuiseries et dimensions des baies.",
    ),
    line(
      "grille",
      "Grille de protection métallique",
      "second_oeuvre",
      a.grilles,
      "pièce",
      prices.grille,
      "conserve",
      `Une grille par fenêtre : ${a.grilles} pièces, identique à la quantité initiale.`,
    ),
    line(
      "etancheite",
      "Étanchéité liquide bitumeuse",
      "second_oeuvre",
      a.waterproofM2,
      "m²",
      prices.waterproof,
      "corrige",
      `Toiture-terrasse : ${a.waterproofM2} m². Les 57,2 m² initiaux ne couvraient que 57 % de la surface à protéger.`,
    ),
  ];

  const grosOeuvre = round2(
    lines
      .filter((l) => l.category === "gros_oeuvre")
      .reduce((s, l) => s + l.totalTTC, 0),
  );
  const secondOeuvre = round2(
    lines
      .filter((l) => l.category === "second_oeuvre")
      .reduce((s, l) => s + l.totalTTC, 0),
  );

  return {
    lines,
    totals: {
      grosOeuvre,
      secondOeuvre,
      general: round2(grosOeuvre + secondOeuvre),
    },
    assumptions: [
      "Emprise rectangulaire 10 × 10 m, hauteur de mur 3,00 m.",
      "Ouvertures extérieures : 1 porte d'entrée + 8 fenêtres 0,90 × 1,20 m.",
      "Cloisons intérieures : 35 ml, 5 portes intérieures.",
      "Structure RDC : fondations filantes 0,60 × 0,80 m, dalle 20 cm, acier 35 kg/m².",
      "Béton structurel entièrement prêt à l'emploi (300 kg/m³).",
      "Peinture : 2 couches, rendement 8 m²/L ; enduit : 2 couches, 1,2 kg/m²/couche.",
      "Prix TTC du marché tunisien 2026 ; TVA 19 % ; livraison non ajoutée séparément.",
    ],
    missingData: [
      "Plans cotés (niveaux, pièces, ouvertures).",
      "Note de calcul structure et ferraillage.",
      "Détails des fondations et épaisseurs de dalles.",
      "Plan des menuiseries (dimensions et nombre de baies).",
      "Devis fournisseurs HT/TVA/livraison et conditionnements réels.",
    ],
  };
}
