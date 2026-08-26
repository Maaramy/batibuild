import { TUNISIA_2026_CATALOG } from "./materialCatalog2026";
import { PROJECT_TYPES, PROJECT_TYPE_LABELS } from "./projectTypes";

// ============================================================================
// PROFESSIONAL BIM COST ESTIMATION ENGINE
// Tunisia 2026 - Market-Based Pricing (Top-Down)
// 6 Macro-Categories, 40+ Project Types
// ============================================================================
// Methodology:
// - Base cost = REAL Tunisian market price per m² × surface
// - Distributed across 6 macro-categories using specified percentages
// - Material items generated pro-rata within each category
// - 3 budget scenarios based on quality level
// ============================================================================

// Tunisian 2026 Market Prices (TND) - Unit prices for material items.
// The keys are the internal price references used by the itemized generators;
// they are mapped to the official 2026 material categories (MATERIAL_CATEGORY_2026)
// via P_CATEGORY_MAP so the price database and the BIM engine stay aligned.
export const P = {
  // ── Terrassement et granulats ─────────────────────────────────────────
  sand: { construction: 36, fine: 32, remblai: 28 },
  gravel: { "15_25mm": 49.2, "8_15mm": 57.6 },
  // ── Liants, ciments et mortiers (Base_Materiaux 2026 — TTC) ───────────
  // CPC / CEM II sac 50 kg : 13.2,85 TND · CPA / CEM I sac 50 kg : 14.4,85 TND
  // HRS 42,5 sac 50 kg : 16.8,50 TND
  cement: { bag42_5: 12.683333, bag32_5: 11.883333, hrs_42_5: 18.5 },
  // ── Bétons et préfabrication ──────────────────────────────────────────
  concrete: { ready_mix_250: 168, ready_mix_300: 188, ready_mix_350: 265 },
  // ── Acier et métaux de structure (COMAF / INTERMETAL / SIDENOR) ────────
  // Rond Ø6 : 1.2,625 TND/barre · Ø8 : 12,75 · Ø10 : 22.8 · Ø12 : 24
  // Ø14 : 34.8,40 · Ø16 : 45.6,30 · Treillis 150×150×4 : 4.8,384 TND/m²
  steel: { t6_m: 0.758333, t8_m: 1.116667, t10_m: 1.683333, t12_ton: 3080, t14_ton: 3160, treillis_m2: 15 },
  // ── Maçonnerie et éléments de plancher (Bâtiment El Baraka) ───────────
  // Brique creuse 12 cm : 0,85 · 8 cm : 0,78 · 6 cm : 0,50
  // Hourdis terre cuite H16 : 0,27 TND/pièce
  bricks: { hollow_10: 0.683333, hollow_15: 0.516667, hourdis_16: 1.016667, noot_6: 0.4, parpaing_15: 0.883333, parpaing_20: 1.041667, pleine_22x11x7: 0.55 },
  // ── Bois, panneaux et coffrage (COMAF) ────────────────────────────────
  // Bois blanc autrichien madrier : 1.2 599 TND/m³
  wood: { formwork_m3: 1279, framing_m3: 656, chevron_m: 12 },
  // ── Étanchéité et protection (Sika / Astral) ─────────────────────────
  // Sikalastic 220 W seau 7 kg : 162 TND
  roofing: { tile_m2: 15, steel_sheet_m2: 23, waterproof_m2: 17, insulation_m2: 26 },
  // ── Isolation thermique et acoustique ──────────────────────────────────
  insulation: { laine_m2: 3, polyst_m2: 7, xps_m2: 16 },
  // ── Revêtements de sols et murs (COMAF / Arkan) ──────────────────────
  // Grès cérame : 36-80 TND/m² · Ciment-colle FM ECO : 10.8,57 TND/sac
  tiles: { floor_m2: 24, wall_m2: 20, marble_m2: 96, granite_m2: 108, ext_m2: 27, plinthe_ml: 8 },
  // ── Peintures, enduits et finitions (Astral / Ripolin / Espace 2F) ────
  // Aquastral Mat 20 kg : 76.8,94 TND · Astralatex 23 kg : 90 TND
  // Ripolatex Mat 500 40 kg : 114 TND
  paint: { interior_l: 17, exterior_l: 20, primer_l: 18 },
  // ── Menuiseries (Chantier.tn / Arkan / Meuble Mansour) ───────────────
  // Fenêtre alu série 40 simple vitrage 120×120 : 450 TND
  // Fenêtre alu série 40 double vitrage 120×120 : 524.4 TND
  // Fenêtre alu série 67 coulissante 140×120 : 572.4 TND
  // Porte intérieure chêne + cadre : 978 TND
  // Porte d'entrée frêne C1 : 2.4 850 TND
  doors: { simple: 256, double: 440, metal: 440, garage: 1040, sliding: 850 },
  windows: { alu_simple: 300, alu_double: 349, pvc: 336, iron_grille: 176, roller_shutter: 304, alu_coulissante: 477 },
  // ── Vitrage et produits verriers ──────────────────────────────────────
  glass: { clear_m2: 22, double_m2: 54, tempered_m2: 115 },
  // ── Équipements (Bricola / BStore / Espace 2F) ───────────────────────
  // Câbles : fil rigide 1,5 mm² : 90 TND/100 m · 2,5 mm² : 142.8 TND/100 m
  // Disjoncteur DPN 2×16A : 14.4,20 TND
  // Disjoncteur diff 2×20A/30mA : 80.4,90 TND
  // Réservoir encastré GROHE 10L : 540 TND
  plumbing: { pvc_110: 12, pvc_50: 5, copper_m: 17, geyser: 384, wc: 224, lavabo: 128, douche: 288, evier: 240 },
  electrical: { cable_1_5_m: 1.2, cable_2_5_m: 1.916667, cable_6_m: 3.841667, breaker: 41, panel: 168, led_light: 30, socket: 7, switch: 7 },
  hvac: { split_12000: 1080, split_18000: 1440, vmc: 350 },
  solar: { panel_450w: 440, onduleur: 2000, batterie_10kwh: 3200 },
  // ── Main-d'œuvre, transport et engins ────────────────────────────────
  labor: { worker_day: 52, mason_day: 64, electrician_day: 60, plumber_day: 60, painter_day: 52, tiler_day: 80 },
  transport: { truck_trip: 140, mixer_m3: 24, benne: 200 },
  equipment: { excavator_day: 232, compactor_day: 168, mixer_day: 95 },
};

// ============================================================================
// OFFICIAL 2026 MATERIAL CATEGORIES (source : « Base de données des matériaux
// de construction – Tunisie 2026 », version du 14 août 2026)
// refs = références recensées · observed = prix observés en ligne ·
// confident = références à confiance élevée · avgPrice = prix moyen TTC (TND)
// Les compteurs (refs / observed / confident / avgPrice) sont DÉRIVÉS du
// catalogue officiel (TUNISIA_2026_CATALOG) : toute référence ajoutée dans le
// catalogue est automatiquement reflétée ici et sur la page des prix.
// ============================================================================
const MATERIAL_CATEGORY_DEFS = [
  { slug: "terrassement_granulats", label: "Terrassement et granulats" },
  { slug: "liants_ciments_mortiers", label: "Liants, ciments et mortiers" },
  { slug: "betons_prefabrication", label: "Bétons et préfabrication" },
  { slug: "acier_metaux_structure", label: "Acier et métaux de structure" },
  { slug: "maconnerie_plancher", label: "Maçonnerie et éléments de plancher" },
  { slug: "bois_panneaux_coffrage", label: "Bois, panneaux et coffrage" },
  { slug: "etancheite_protection", label: "Étanchéité et protection" },
  { slug: "isolation_thermique", label: "Isolation thermique et acoustique" },
  { slug: "cloisons_platre_plafonds", label: "Cloisons, plâtre et plafonds" },
  { slug: "toitures_bardages_facades", label: "Toitures, bardages et façades" },
  { slug: "revetements_sols_murs", label: "Revêtements de sols et murs" },
  { slug: "peintures_enduits_finitions", label: "Peintures, enduits et finitions" },
  { slug: "menuiseries", label: "Menuiseries" },
  { slug: "vitrage_verriers", label: "Vitrage et produits verriers" },
  { slug: "chimie_construction", label: "Chimie de construction" },
  { slug: "quincaillerie_fixations", label: "Quincaillerie et fixations" },
  { slug: "eclairage", label: "Éclairage" },
  { slug: "cvc_chauffage_ventilation", label: "CVC, chauffage et ventilation" },
  { slug: "energies_renouvelables", label: "Énergies renouvelables" },
  { slug: "securite_incendie_surete", label: "Sécurité incendie et sûreté" },
  { slug: "voirie_reseaux_drainage", label: "Voirie, réseaux divers et drainage" },
  { slug: "amenagements_exterieurs", label: "Aménagements extérieurs" },
  { slug: "materiaux_durables_biosources", label: "Matériaux durables et biosourcés" },
] as const;

function deriveCategoryStats() {
  const acc = new Map<
    string,
    { refs: number; observed: number; confident: number; totalPrice: number }
  >();
  for (const item of TUNISIA_2026_CATALOG) {
    const cur = acc.get(item.category) || {
      refs: 0,
      observed: 0,
      confident: 0,
      totalPrice: 0,
    };
    cur.refs += 1;
    if (item.quality === "observé_en_ligne") cur.observed += 1;
    if ((item.confidence ?? 0) >= 0.8) cur.confident += 1;
    cur.totalPrice += item.unitPrice;
    acc.set(item.category, cur);
  }
  return acc;
}

const CATEGORY_STATS = deriveCategoryStats();

export const MATERIAL_CATEGORY_2026 = MATERIAL_CATEGORY_DEFS.map((c) => {
  const s = CATEGORY_STATS.get(c.slug) || {
    refs: 0,
    observed: 0,
    confident: 0,
    totalPrice: 0,
  };
  return {
    slug: c.slug,
    label: c.label,
    refs: s.refs,
    observed: s.observed,
    confident: s.confident,
    avgPrice: s.refs > 0 ? Math.round((s.totalPrice / s.refs) * 1000) / 1000 : 0,
  };
});

/** Libellé d'une catégorie officielle 2026 (slug → label français). */
export const MATERIAL_CATEGORY_LABELS: Record<string, string> =
  Object.fromEntries(MATERIAL_CATEGORY_2026.map((c) => [c.slug, c.label]));

/** Métadonnées officielles 2026 par slug. */
export const MATERIAL_CATEGORY_META: Record<string, (typeof MATERIAL_CATEGORY_2026)[number]> =
  Object.fromEntries(MATERIAL_CATEGORY_2026.map((c) => [c.slug, c]));

/** Slug officiel d'un groupe de prix interne P (pour le regroupement UI). */
export const P_CATEGORY_MAP: Record<string, string> = {
  sand: "terrassement_granulats",
  gravel: "terrassement_granulats",
  cement: "liants_ciments_mortiers",
  concrete: "betons_prefabrication",
  steel: "acier_metaux_structure",
  bricks: "maconnerie_plancher",
  wood: "bois_panneaux_coffrage",
  roofing: "etancheite_protection",
  insulation: "isolation_thermique",
  tiles: "revetements_sols_murs",
  paint: "peintures_enduits_finitions",
  doors: "menuiseries",
  windows: "menuiseries",
  glass: "vitrage_verriers",
  plumbing: "equipements",
  electrical: "equipements",
  hvac: "cvc_chauffage_ventilation",
  solar: "energies_renouvelables",
};

// ============================================================================
// LIEN MOTEUR BIM ↔ CATALOGUE OFFICIEL 2026
// Les libellés, unités et prix unitaires des postes du « Quantitatif détaillé »
// sont résolus depuis TUNISIA_2026_CATALOG (source unique partagée avec la
// page « Prix des matériaux » et la base de données materialPrices). Les postes
// sans équivalent catalogue (main-d'œuvre, transport, engins, études…)
// conservent leurs prix internes de référence P.
// ============================================================================

/**
 * Normalise un libellé pour la comparaison (minuscules, sans accents, sans
 * ponctuation). Les symboles × et x des dimensions (ex. « 16×50 » vs « 16x50 »)
 * sont unifiés pour que les postes BIM et les références du catalogue 2026
 * correspondent quelle que soit la saisie.
 */
const normKey = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/×/g, "x")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Index du catalogue officiel 2026 par libellé normalisé. */
const CATALOG_BY_NAME = new Map<string, (typeof TUNISIA_2026_CATALOG)[number]>();
for (const item of TUNISIA_2026_CATALOG) {
  CATALOG_BY_NAME.set(normKey(item.name), item);
}

/**
 * Correspondance postes BIM → références officielles 2026 pour les libellés qui
 * ne correspondent pas exactement (même matériau, formulation différente).
 * qtyFactor convertit la quantité BIM dans l'unité de vente du catalogue
 * (ex. tonnes → barres de 12 m, m² de treillis → panneau, ml de câble → rouleau).
 */
const BIM_TO_CATALOG: Record<string, { name: string; qtyFactor?: number }> = {
  // Terrassement et gros œuvre
  "Terrassement & excavation piscine": { name: "Terrassement mécanique" },
  "Béton armé coque C25/30": { name: "Béton prêt à l'emploi 350 kg/m³" },
  "Béton de dalle industrielle C25/30": { name: "Béton prêt à l'emploi 350 kg/m³" },
  "Béton de fondation linéaire": { name: "Béton prêt à l'emploi 250 kg/m³" },
  "Béton de fondation massifs": { name: "Béton prêt à l'emploi 250 kg/m³" },
  "Acier à béton T12": { name: "Acier à béton T12 (tonne)" },
  "Acier à béton T10": { name: "Fer à béton HA T10 (barre 12 m)", qtyFactor: 135 },
  "Treillis soudé ST25": { name: "Treillis soudé ST25 (panneau)", qtyFactor: 1 / 6 },
  "Bois de coffrage": { name: "Bois de coffrage (m³)" },
  "Ciment CPJ 42.5 (Sac 50kg)": { name: "Ciment CPJ 42.5 (sac 50 kg)" },
  "Ciment CPJ 32.5 (Maçonnerie)": { name: "Ciment CPJ 32.5 (sac 50 kg)" },
  "Gravier 15/25mm": { name: "Gravier concassé 15/25" },
  "Poteau préfabriqué béton": { name: "Poteau béton préfabriqué" },
  "Terre végétale amendée": { name: "Terre végétale (apport)" },
  "Gravier concassé (drainage)": { name: "Gravier concassé 8/15" },
  "Graves non traitées (couche de forme)": { name: "Tout-venant 0/31.5" },
  // Second œuvre
  "Bordure béton 50x20": { name: "Bordure béton préfabriquée" },
  "Bordures béton T2": { name: "Bordure béton préfabriquée" },
  "Carrelage anti-dérapant (plage)": { name: "Carrelage extérieur antidérapant (m²)" },
  "Dalle grès cérame antidérapante 40x40": { name: "Carrelage extérieur antidérapant (m²)" },
  "Portail métallique à deux vantaux": { name: "Portail alu battant 2 vantaux" },
  "Étanchéité liquide bitumeuse (tête de mur)": { name: "Étanchéité liquide bitumeuse" },
  "Bardage métallique prélaqué": { name: "Bac acier nervuré (m²)" },
  "Enrobé bitumineux 5cm": { name: "Enrobé bitumineux (m²)" },
  "Carrelage sol grès cérame 60x60": { name: "Carrelage grès cérame 60×60 (m²)" },
  "Carrelage sol grès cérame 40x40": { name: "Carrelage sol 40×40 (m²)" },
  "Carrelage mural faïence 20x30": { name: "Faïence 20×30 (m²)" },
  "Plinthe céramique 8x30": { name: "Plinthe céramique (ml)" },
  "Peinture intérieure mate lessivable": { name: "Peinture intérieure mate (L)" },
  "Peinture intérieure mate": { name: "Peinture intérieure mate (L)" },
  "Peinture extérieure acrylique": { name: "Peinture extérieure acrylique (L)" },
  "Enduit de lissage prêt à gâcher": { name: "Enduit de lissage (kg)" },
  "Porte intérieure en bois pleine": { name: "Porte intérieure bois pleine" },
  "Porte d'entrée métallique blindée": { name: "Porte d'entrée métallique" },
  "Fenêtre coulissante alu simple vitrage": { name: "Fenêtre aluminium 90×120" },
  "Panneau de placoplâtre BA13": { name: "Plaque placoplâtre BA13 (m²)" },
  "Corniche en plâtre": { name: "Corniche en plâtre (ml)" },
  "Faux plafond dalles 60x60": { name: "Faux plafond dalles 60×60 (m²)" },
  "Pavé autobloquant 6cm": { name: "Pavé autobloquant (m²)" },
  // Équipements
  "Panneau photovoltaïque 450Wc monocristallin": { name: "Panneau photovoltaïque 450 Wc" },
  "Gazon en plaques": { name: "Gazon en plaques (m²)" },
  "Onduleur central": { name: "Onduleur central 5 kW" },
  "Goutte-à-goutte + tuyau PER": { name: "Tube PER Ø16 (ml)" },
  "Tuyau PER Ø16": { name: "Tube PER Ø16 (ml)" },
  "Tuyau PVC Ø100 évacuation": { name: "Tube PVC évacuation Ø110 (ml)" },
  "Câble électrique 2.5mm²": { name: "Câble électrique 3×2.5 mm² (rouleau 100 m)", qtyFactor: 1 / 100 },
  "Câble électrique 2.5mm² (rouleau 100m)": { name: "Câble électrique 3×2.5 mm² (rouleau 100 m)", qtyFactor: 1 / 100 },
  "Câble solaire DC 6mm²": { name: "Câble solaire 6 mm² (ml)" },
  "Disjoncteur divisionnaire 20A": { name: "Disjoncteur modulaire 16 A" },
  "Prise de courant 2P+T encastrée": { name: "Prise de courant 2P+T" },
  "Luminaire LED haute baie 150W": { name: "Projecteur LED haute baie 150 W" },
  "WC complet avec réservoir": { name: "WC à l'anglaise complet" },
  "WC public + lave-mains": { name: "WC à l'anglaise complet" },
  "Lavabo vasque + robinetterie": { name: "Lavabo céramique" },
  "Vitrine aluminium + porte coulissante": { name: "Baie coulissante alu 2 vantaux" },
  "Porte sectionnelle industrielle 3x3": { name: "Porte garage sectionnelle 2.5×2.1" },
  "Étanchéité toiture bac acier": { name: "Étanchéité liquide bitumeuse" },
  "Peinture antirouille supports": { name: "Antirouille métal (L)" },
  "Climatisation split 12000 BTU": { name: "Climatiseur split 12000 BTU" },
  "Motorisation portail coulissant 600kg": { name: "Motorisation portail 600 kg" },
  "Éclairage LED extérieur sur poteaux": { name: "Éclairage jardin sur poteaux" },
};

/**
 * Résout un poste BIM vers sa référence officielle 2026 (nom, unité, prix,
 * facteur de conversion de quantité) lorsqu'un équivalent catalogue existe.
 * Si livePrices est fourni (prix en direct depuis la base materialPrices),
 * le prix unitaire (et l'unité) du catalogue est remplacé par la valeur en
 * base — les modifications de prix faites dans le panneau admin se reflètent
 * ainsi automatiquement dans les nouvelles estimations.
 */
function resolveCatalogItem(bimName: string, livePrices?: LivePriceMap) {
  const alias = BIM_TO_CATALOG[bimName];
  const catName = alias?.name ?? bimName;
  const item = CATALOG_BY_NAME.get(normKey(catName));
  if (!item) return undefined;
  const live = livePrices?.get(normKey(item.name));
  return {
    name: item.name,
    unit: live?.unit ?? item.unit,
    unitPrice: live?.unitPrice ?? item.unitPrice,
    qtyFactor: alias?.qtyFactor ?? 1,
  };
}

/** Prix en direct (base materialPrices) indexés par libellé normalisé. */
export type LivePriceMap = Map<string, { unit: string; unitPrice: number }>;

/**
 * Construit l'index des prix en direct depuis les lignes materialPrices
 * de la base. Le prix unitaire de la base écrase celui du catalogue statique.
 */
export function buildLivePriceMap(
  rows: { name: string; unit: string; unitPrice: number }[],
): LivePriceMap {
  const map: LivePriceMap = new Map();
  for (const row of rows) {
    const key = normKey(row.name);
    if (row.unitPrice > 0 && !map.has(key)) {
      map.set(key, { unit: row.unit, unitPrice: row.unitPrice });
    }
  }
  return map;
}

// ============================================================================
// CONTEXTE « PRIX EN DIRECT » PAR REQUÊTE
// Le moteur BIM résout les prix des postes matériaux depuis la base de données
// materialPrices (prix en direct) lorsqu'un index est fourni pour la requête en
// cours. Le contexte est porté par un état module (restauré après l'exécution)
// pour que les générateurs (gros œuvre, second œuvre, équipements) et
// finalizeItems y accèdent sans changer leur signature.
// ============================================================================
let LIVE_PRICES: LivePriceMap | undefined;

/**
 * Exécute fn avec l'index des prix en direct de la base (par requête).
 * Le contexte précédent est restauré quoi qu'il arrive (try/finally).
 */
export function withLivePrices<T>(map: LivePriceMap | undefined, fn: () => T): T {
  const prev = LIVE_PRICES;
  LIVE_PRICES = map;
  try {
    return fn();
  } finally {
    LIVE_PRICES = prev;
  }
}

type RawBimItem = { n: string; q: number; u: string; up: number };

/**
 * Convertit les postes bruts d'un générateur en lignes « Quantitatif détaillé »
 * (libellé, unité et prix unitaire alignés sur le catalogue officiel 2026),
 * puis met les montants à l'échelle pour coller au budget de la catégorie.
 * scaleQty = true recalcule aussi les quantités (gros œuvre / second œuvre).
 * livePrices (optionnel) : prix en direct depuis la base materialPrices.
 */
function finalizeItems(items: RawBimItem[], targetBudget: number, scaleQty = false, livePrices?: LivePriceMap) {
  // Prix en direct : priorité à l'argument explicite, sinon au contexte de la requête.
  const lp = livePrices ?? LIVE_PRICES;
  const resolved = items.map((i) => {
    const cat = resolveCatalogItem(i.n, lp);
    const qty = Math.round(i.q * (cat?.qtyFactor ?? 1) * 100) / 100 || 1;
    const up = cat?.unitPrice ?? i.up;
    return {
      name: cat?.name ?? i.n,
      unit: cat?.unit ?? i.u,
      unitPrice: up,
      quantity: qty,
      rawTotal: Math.round(qty * up),
    };
  });
  const rawTotal = resolved.reduce((s, i) => s + i.rawTotal, 0);
  const scale = rawTotal > 0 ? targetBudget / rawTotal : 1;
  return resolved.map((i) => ({
    name: i.name,
    unit: i.unit,
    unitPrice: i.unitPrice,
    quantity: scaleQty ? Math.round(i.quantity * scale * 10) / 10 || 1 : i.quantity,
    totalPrice: Math.round(i.rawTotal * scale),
  }));
}

/** Correspondance des anciennes catégories (legacy) vers les catégories officielles 2026. */
export const LEGACY_MATERIAL_CATEGORY_MAP: Record<string, string> = {
  ciment: "liants_ciments_mortiers",
  sable: "terrassement_granulats",
  gravier: "terrassement_granulats",
  granulats: "terrassement_granulats",
  briques: "maconnerie_plancher",
  parpaings: "maconnerie_plancher",
  blocs: "maconnerie_plancher",
  beton: "betons_prefabrication",
  acier: "acier_metaux_structure",
  fer_a_beton: "acier_metaux_structure",
  bois: "bois_panneaux_coffrage",
  coffrage: "bois_panneaux_coffrage",
  etancheite: "etancheite_protection",
  isolation: "isolation_thermique",
  cloisons: "cloisons_platre_plafonds",
  toiture: "toitures_bardages_facades",
  revetements: "revetements_sols_murs",
  peinture: "peintures_enduits_finitions",
  carrelage: "revetements_sols_murs",
  faience: "revetements_sols_murs",
  marbre: "revetements_sols_murs",
  pierre_naturelle: "revetements_sols_murs",
  menuiserie_aluminium: "menuiseries",
  menuiserie_pvc: "menuiseries",
  portes: "menuiseries",
  fenetres: "menuiseries",
  cuisines: "menuiseries",
  dressings: "menuiseries",
  quincaillerie: "quincaillerie_fixations",
  outillage: "quincaillerie_fixations",
  eclairage: "eclairage",
  climatisation: "cvc_chauffage_ventilation",
  chauffage: "cvc_chauffage_ventilation",
  plomberie: "equipements",
  sanitaire: "equipements",
  electricite: "equipements",
  amenagement_exterieur: "amenagements_exterieurs",
  piscines: "amenagements_exterieurs",
  jardins: "amenagements_exterieurs",
  location_engins: "equipements",
  terrassement: "terrassement_granulats",
  fondations: "terrassement_granulats",
  finition: "peintures_enduits_finitions",
  divers: "quincaillerie_fixations",
};

/** Normalise n'importe quelle catégorie (nouvelle ou legacy) vers le slug officiel 2026. */
export function normalizeMaterialCategory(category: string): string {
  return MATERIAL_CATEGORY_LABELS[category]
    ? category
    : LEGACY_MATERIAL_CATEGORY_MAP[category] || category;
}

export const MACRO_LABELS: Record<string, string> = {
  gros_oeuvre: "Gros œuvre (fondations, structures)",
  second_oeuvre: "Second œuvre et finitions",
  equipements: "Équipements techniques",
  main_oeuvre: "Main-d'œuvre",
  transport: "Transports & autres",
  etudes_imprevus: "Études, permis & imprévus",
};

export const MACRO_COLORS: Record<string, string> = {
  gros_oeuvre: "#3b82f6",
  second_oeuvre: "#f59e0b",
  equipements: "#8b5cf6",
  main_oeuvre: "#22c55e",
  transport: "#a3e635",
  etudes_imprevus: "#ef4444",
};

type Percentages = [number, number, number, number, number, number];

// ============================================================================
// PRIX MARCHÉ PAR TYPE DE PROJET (TND/m²)
// Source : feuille « Coût de construction au m² – Tunisie 2026 » (19/08/2026).
// Les valeurs ci-dessous sont des prix RELATIFS entre types de projet ; elles
// sont mises à l'échelle pour que maison/std = BASE_NATIONALE_STANDARD_M2
// (base nationale « Standard » : 1 780 DT/m², maison neuve conventionnelle).
// ============================================================================

const RELATIVE_PRICE_M2: Record<string, { eco: number, std: number, premium: number }> = {
  // Maisons & Villa (Marché tunisien 2026 - fournitures + main d'œuvre)
  // NB : les anciens types « Maison R+1 » / « Maison R+2 » ont été supprimés
  // du catalogue — le nombre de niveaux est désormais choisi manuellement et
  // les anciens slugs sont remappés vers « maison » / « villa ».
  maison:             { eco: 720, std: 1056, premium: 1728 },
  villa:              { eco: 864, std: 1296, premium: 2112 },
  immeuble_residentiel:{ eco: 912, std: 1344, premium: 2112 },
  immeuble:           { eco: 912, std: 1344, premium: 2112 },
  appartement:        { eco: 960, std: 1440, premium: 2304 },
  studio:             { eco: 912, std: 1344, premium: 2112 },
  duplex:             { eco: 1008, std: 1488, premium: 2352 },
  residence_touristique:{ eco: 960, std: 1392, premium: 2208 },
  projet_neuf:        { eco: 912, std: 1344, premium: 2112 },
  maison_hote:        { eco: 912, std: 1344, premium: 2208 },

  // Piscine & Extérieur
  piscine:            { eco: 720, std: 1056, premium: 1728 },
  piscine_beton:      { eco: 720, std: 1056, premium: 1728 },
  piscine_coque:      { eco: 576, std: 864, premium: 1440 },
  jardin:             { eco: 77, std: 125, premium: 240 },
  amenagement_paysager:{ eco: 86, std: 134, premium: 269 },
  garage:             { eco: 480, std: 720, premium: 1152 },
  cloture:            { eco: 269, std: 432, premium: 720 },
  mur_de_separation:  { eco: 269, std: 432, premium: 672 },
  cuisine_exterieure: { eco: 720, std: 1056, premium: 1728 },
  terrasse:           { eco: 307, std: 480, premium: 816 },
  pergola:            { eco: 432, std: 672, premium: 1056 },
  toiture:            { eco: 269, std: 384, premium: 624 },
  extension_batiment: { eco: 768, std: 1152, premium: 1920 },

  // Commercial & Industriel
  entrepot:           { eco: 432, std: 672, premium: 1056 },
  local_commercial:   { eco: 720, std: 1056, premium: 1728 },
  boutique_commerciale:{ eco: 720, std: 1056, premium: 1728 },
  bureau:             { eco: 816, std: 1200, premium: 2016 },
  bureau_cabinet:     { eco: 816, std: 1200, premium: 2016 },
  ferme:              { eco: 432, std: 624, premium: 960 },
  batiment_agricole:  { eco: 432, std: 624, premium: 960 },
  serre_agricole:     { eco: 211, std: 336, premium: 528 },
  parking:            { eco: 192, std: 307, premium: 480 },
  aire_de_jeux:       { eco: 125, std: 221, premium: 384 },

  // Institutionnel
  mosquee:            { eco: 912, std: 1344, premium: 2208 },
  ecole:              { eco: 864, std: 1296, premium: 2016 },
  hotel:              { eco: 1152, std: 1728, premium: 2880 },
  restaurant:         { eco: 960, std: 1440, premium: 2400 },
  cafe:               { eco: 912, std: 1344, premium: 2112 },

  // Industrie
  atelier:            { eco: 336, std: 499, premium: 816 },
  usine:              { eco: 480, std: 720, premium: 1152 },
  depot:              { eco: 307, std: 461, premium: 720 },

  // Énergie
  installation_solaire:{ eco: 1920, std: 2880, premium: 4320 },
  chateau_d_eau:      { eco: 1152, std: 1632, premium: 2592 },
  systeme_irrigation: { eco: 173, std: 307, premium: 480 },

  // VRD
  route:              { eco: 125, std: 211, premium: 365 },
  trottoir:           { eco: 96, std: 173, premium: 307 },

  // Rénovation (Marché tunisien 2026)
  renovation_interieure:    { eco: 307, std: 528, premium: 960 },
  renovation_complete:      { eco: 288, std: 480, premium: 864 },
  renovation_exterieure:   { eco: 250, std: 432, premium: 768 },
  renovation_salle_de_bain: { eco: 1248, std: 1920, premium: 3360 },
  renovation_cuisine:       { eco: 1248, std: 1920, premium: 3360 },
  renovation_facade:        { eco: 221, std: 336, premium: 576 },
  peinture_interieure:      { eco: 13, std: 20, premium: 36 },

  // Démolition
  demolition:                { eco: 86, std: 125, premium: 211 },
  installations_sanitaires:  { eco: 960, std: 1536, premium: 2880 },
  plomberie_complete:        { eco: 106, std: 173, premium: 307 },
  installations_electricite: { eco: 173, std: 307, premium: 528 },
  electricite_complete:      { eco: 115, std: 202, premium: 365 },
};

/** Base nationale « Standard » — maison neuve conventionnelle (feuille 2026). */
export const BASE_NATIONALE_STANDARD_M2 = 1780;

const _PRICE_SCALE = BASE_NATIONALE_STANDARD_M2 / RELATIVE_PRICE_M2.maison.std;
const _scalePriceRow = (r: { eco: number; std: number; premium: number }) => ({
  eco: Math.round(r.eco * _PRICE_SCALE),
  std: Math.round(r.std * _PRICE_SCALE),
  premium: Math.round(r.premium * _PRICE_SCALE),
});

export const MARKET_PRICE_M2: Record<string, { eco: number; std: number; premium: number }> =
  Object.fromEntries(
    Object.entries(RELATIVE_PRICE_M2).map(([k, v]) => [k, _scalePriceRow(v)]),
  );

export const PROJECT_PCT: Record<string, Percentages> = {
  // Types résidentiels neufs : alignés sur la répartition par phases de la
  // feuille « Coût au m² – Tunisie 2026 » — Gros œuvre 43 % · Second œuvre +
  // Finitions & équipements ≈ 44 % (SO 31 + EQ 13) · solde main-d'œuvre /
  // transport / études-imprévus 13 %. La contingence de 12 % est appliquée
  // en sus (DEFAULT_CONTINGENCY_PCT).
  maison: [43, 31, 13, 6, 3, 4],
  villa: [43, 31, 13, 6, 3, 4],
  immeuble_residentiel: [45, 29, 13, 6, 3, 4],
  immeuble: [45, 29, 13, 6, 3, 4],
  appartement: [29, 39, 20, 5, 2, 5],
  studio: [26, 42, 20, 5, 2, 5],
  duplex: [42, 32, 13, 6, 3, 4],
  residence_touristique: [28, 35, 25, 5, 2, 5],
  projet_neuf: [43, 31, 13, 6, 3, 4],
  maison_hote: [40, 33, 14, 6, 3, 4],
  piscine: [43, 20, 25, 5, 2, 5],
  piscine_beton: [43, 20, 25, 5, 2, 5],
  piscine_coque: [35, 15, 30, 12, 3, 5],
  jardin: [18, 25, 45, 5, 2, 5],
  amenagement_paysager: [20, 25, 43, 5, 2, 5],
  garage: [48, 25, 10, 10, 2, 5],
  cloture: [58, 20, 5, 10, 2, 5],
  mur_de_separation: [60, 18, 5, 10, 2, 5],
  cuisine_exterieure: [30, 30, 28, 5, 2, 5],
  terrasse: [45, 28, 15, 5, 2, 5],
  pergola: [35, 25, 28, 5, 2, 5],
  toiture: [55, 20, 13, 5, 2, 5],
  extension_batiment: [40, 28, 15, 10, 2, 5],
  entrepot: [53, 20, 10, 10, 2, 5],
  local_commercial: [33, 35, 20, 5, 2, 5],
  boutique_commerciale: [33, 35, 20, 5, 2, 5],
  bureau: [28, 40, 20, 5, 2, 5],
  bureau_cabinet: [28, 40, 20, 5, 2, 5],
  ferme: [50, 20, 15, 8, 2, 5],
  batiment_agricole: [50, 20, 15, 8, 2, 5],
  serre_agricole: [30, 20, 40, 3, 2, 5],
  parking: [55, 18, 10, 10, 2, 5],
  aire_de_jeux: [25, 20, 43, 5, 2, 5],
  mosquee: [40, 30, 15, 8, 2, 5],
  ecole: [42, 28, 15, 8, 2, 5],
  hotel: [28, 35, 25, 5, 2, 5],
  restaurant: [23, 40, 30, 3, 2, 2],
  cafe: [22, 40, 31, 3, 2, 2],
  atelier: [45, 25, 18, 5, 2, 5],
  usine: [48, 20, 20, 5, 2, 5],
  depot: [55, 18, 10, 10, 2, 5],
  installation_solaire: [13, 10, 65, 5, 2, 5],
  chateau_d_eau: [52, 18, 15, 8, 2, 5],
  systeme_irrigation: [20, 15, 53, 5, 2, 5],
  route: [57, 15, 10, 10, 3, 5],
  trottoir: [52, 20, 10, 10, 3, 5],
  renovation_interieure: [10, 48, 30, 5, 2, 5],
  renovation_complete: [12, 48, 28, 5, 2, 5],
  renovation_exterieure: [35, 40, 8, 7, 3, 7],
  renovation_salle_de_bain: [20, 33, 35, 5, 2, 5],
  renovation_cuisine: [15, 33, 40, 5, 2, 5],
  renovation_facade: [30, 48, 10, 5, 2, 5],
  peinture_interieure: [0, 85, 5, 5, 2, 3],
  demolition: [15, 0, 35, 35, 10, 5],
  installations_sanitaires: [0, 20, 70, 5, 2, 3],
  plomberie_complete: [0, 20, 70, 5, 2, 3],
  installations_electricite: [0, 20, 70, 5, 2, 3],
  electricite_complete: [0, 20, 70, 5, 2, 3],
};

const CATEGORY_LABEL: Record<string, string> = {
  maison: "Maison", villa: "Villa",
  immeuble_residentiel: "Immeuble résidentiel", immeuble: "Immeuble",
  appartement: "Appartement", studio: "Studio", duplex: "Duplex",
  residence_touristique: "Résidence touristique", projet_neuf: "Projet immobilier neuf",
  maison_hote: "Maison d'hôte",
  piscine: "Piscine", piscine_beton: "Piscine béton", piscine_coque: "Piscine coque",
  jardin: "Jardin", amenagement_paysager: "Aménagement paysager",
  garage: "Garage", cloture: "Clôture", mur_de_separation: "Mur de séparation",
  cuisine_exterieure: "Cuisine extérieure", terrasse: "Terrasse", pergola: "Pergola",
  toiture: "Toiture", extension_batiment: "Extension de bâtiment", entrepot: "Entrepôt",
  local_commercial: "Local commercial", boutique_commerciale: "Boutique commerciale",
  bureau: "Bureau", bureau_cabinet: "Bureau & cabinet", ferme: "Ferme",
  batiment_agricole: "Bâtiment agricole", serre_agricole: "Serre agricole",
  parking: "Parking", aire_de_jeux: "Aire de jeux",
  mosquee: "Mosquée", ecole: "École", hotel: "Hôtel", restaurant: "Restaurant",
  cafe: "Café", atelier: "Atelier", usine: "Usine", depot: "Dépôt",
  installation_solaire: "Installation solaire", chateau_d_eau: "Château d'eau",
  systeme_irrigation: "Système d'irrigation", route: "Route", trottoir: "Trottoir",
  renovation_interieure: "Rénovation intérieure", renovation_complete: "Rénovation complète",
  renovation_exterieure: "Rénovation extérieure",
  renovation_salle_de_bain: "Rénovation salle de bain",
  renovation_cuisine: "Rénovation cuisine", renovation_facade: "Rénovation façade",
  peinture_interieure: "Peinture intérieure",
  demolition: "Démolition", installations_sanitaires: "Installations sanitaires",
  plomberie_complete: "Plomberie complète", installations_electricite: "Installations électricité",
  electricite_complete: "Électricité complète",
};

// ============================================================================
// CATALOGUE OFFICIEL DES 11 TYPES DE BIEN (source unique du moteur BIM)
// Synchronisé avec le formulaire « Nouveau projet » (src/convex/projectTypes.ts),
// le module d'investissement et le générateur du Quantitatif détaillé (DQE).
// Les libellés rétro-compatibles des anciens types (maison R+1, piscine,
// jardin, bureau…) restent supportés par MARKET_PRICE_M2 / PROJECT_PCT pour
// recalculer les projets enregistrés, mais ne sont plus proposés dans
// l'interface.
// ============================================================================
export const BIM_CATEGORIES = PROJECT_TYPES;

export type BIMCategory = (typeof BIM_CATEGORIES)[number];

/** Libellé français d'un type de bien du catalogue officiel. */
export const BIM_CATEGORY_LABELS = PROJECT_TYPE_LABELS;

// ============================================================================
// COÛTS RÉGIONAUX DE CONSTRUCTION (TND/m² — clé en main)
// Source : feuille « Coût de construction au m² – Tunisie 2026 »
// (référence du 19/08/2026, tableau de bord des 24 gouvernorats) et feuille
// n°2 « Couts_24_gouv » : valeurs centrales EXACTES par gouvernorat pour les
// niveaux Économique · Standard · Haut standing · Luxe, plus facteurs
// régionaux (matériaux / main-d'œuvre / logistique), ventilation GO/SO/Fini
// et découpage en 15 lots de l'onglet « Detail_lots ».
// Fourchettes nationales : Éco 1200-1500 · Std 1600-2000 · Haut 2200-2800.
// ============================================================================

/** Niveau « Standard central » par gouvernorat (TND/m², feuille 2026). */
export const GOVERNORATE_STD_M2: Record<string, number> = {
  tataouine: 1950, kebili: 1920, tunis: 1900, tozeur: 1900,
  medenine: 1890, nabeul: 1880, sousse: 1880, ariana: 1870,
  ben_arous: 1850, monastir: 1840, gafsa: 1840,
  kasserine: 1830, mahdia: 1830, gabes: 1830, manouba: 1830,
  le_kef: 1820, bizerte: 1820, sfax: 1820, sidi_bouzid: 1820,
  jendouba: 1810, siliana: 1800, zaghouan: 1790, kairouan: 1780, beja: 1780,
};

/** Niveaux de standing nationaux (feuille « Coût au m² – Tunisie 2026 »). */
export const STANDING_LEVELS_2026 = [
  { key: "economique", label: "Économique", min: 1200, central: 1340, max: 1500 },
  { key: "standard", label: "Standard", min: 1600, central: 1780, max: 2000 },
  { key: "haut_standing", label: "Haut standing", min: 2200, central: 2470, max: 2800 },
  { key: "luxe", label: "Luxe", min: 3000, central: 3360, max: 4000 },
] as const;

/** Répartition par grande phase – standard central : Gros œuvre 43 % · Second œuvre 34 % · Finitions & équipements 23 %. */
export const PHASE_SPLIT_2026 = { gros_oeuvre: 43, second_oeuvre: 34, finitions_equipements: 23 };

/** Contingence par défaut (feuille 2026). */
export const DEFAULT_CONTINGENCY_PCT = 12;

/**
 * Feuille n°2 « Couts_24_gouv » — valeurs centrales EXACTES par gouvernorat
 * et par niveau de standing (TND/m²) : Économique · Standard · Haut standing ·
 * Luxe. Ces valeurs remplacent les ratios nationaux dérivés.
 */
export const GOVERNORATE_LEVELS_2026: Record<
  string,
  { eco: number; std: number; hautStanding: number; luxe: number }
> = {
  tunis: { eco: 1420, std: 1900, hautStanding: 2640, luxe: 3580 },
  ariana: { eco: 1410, std: 1870, hautStanding: 2600, luxe: 3540 },
  ben_arous: { eco: 1380, std: 1850, hautStanding: 2560, luxe: 3490 },
  manouba: { eco: 1370, std: 1830, hautStanding: 2540, luxe: 3450 },
  nabeul: { eco: 1410, std: 1880, hautStanding: 2610, luxe: 3550 },
  zaghouan: { eco: 1340, std: 1790, hautStanding: 2490, luxe: 3380 },
  bizerte: { eco: 1370, std: 1820, hautStanding: 2530, luxe: 3440 },
  beja: { eco: 1340, std: 1780, hautStanding: 2470, luxe: 3360 },
  jendouba: { eco: 1360, std: 1810, hautStanding: 2510, luxe: 3410 },
  le_kef: { eco: 1370, std: 1820, hautStanding: 2530, luxe: 3440 },
  siliana: { eco: 1350, std: 1800, hautStanding: 2500, luxe: 3400 },
  sousse: { eco: 1410, std: 1880, hautStanding: 2610, luxe: 3540 },
  monastir: { eco: 1380, std: 1840, hautStanding: 2560, luxe: 3480 },
  mahdia: { eco: 1370, std: 1830, hautStanding: 2540, luxe: 3460 },
  sfax: { eco: 1360, std: 1820, hautStanding: 2530, luxe: 3440 },
  kairouan: { eco: 1340, std: 1780, hautStanding: 2480, luxe: 3370 },
  kasserine: { eco: 1370, std: 1830, hautStanding: 2550, luxe: 3460 },
  sidi_bouzid: { eco: 1360, std: 1820, hautStanding: 2520, luxe: 3430 },
  gabes: { eco: 1370, std: 1830, hautStanding: 2540, luxe: 3460 },
  medenine: { eco: 1420, std: 1890, hautStanding: 2630, luxe: 3570 },
  tataouine: { eco: 1460, std: 1950, hautStanding: 2700, luxe: 3680 },
  gafsa: { eco: 1380, std: 1840, hautStanding: 2560, luxe: 3480 },
  tozeur: { eco: 1420, std: 1900, hautStanding: 2640, luxe: 3580 },
  kebili: { eco: 1440, std: 1920, hautStanding: 2670, luxe: 3630 },
};

/**
 * Feuille n°2 « Couts_24_gouv » — facteurs régionaux : matériaux,
 * main-d'œuvre, marché/logistique et coefficient régional global.
 */
export const GOVERNORATE_FACTORS_2026: Record<
  string,
  { materiaux: number; mainOeuvre: number; logistique: number; coefficient: number }
> = {
  tunis: { materiaux: 1.0, mainOeuvre: 1.12, logistique: 1.12, coefficient: 1.054 },
  ariana: { materiaux: 1.0, mainOeuvre: 1.1, logistique: 1.08, coefficient: 1.041 },
  ben_arous: { materiaux: 0.99, mainOeuvre: 1.08, logistique: 1.05, coefficient: 1.025 },
  manouba: { materiaux: 1.0, mainOeuvre: 1.04, logistique: 1.02, coefficient: 1.014 },
  nabeul: { materiaux: 1.02, mainOeuvre: 1.07, logistique: 1.08, coefficient: 1.045 },
  zaghouan: { materiaux: 1.0, mainOeuvre: 0.97, logistique: 1.01, coefficient: 0.995 },
  bizerte: { materiaux: 1.01, mainOeuvre: 1.0, logistique: 1.03, coefficient: 1.012 },
  beja: { materiaux: 1.0, mainOeuvre: 0.94, logistique: 1.02, coefficient: 0.989 },
  jendouba: { materiaux: 1.02, mainOeuvre: 0.94, logistique: 1.04, coefficient: 1.004 },
  le_kef: { materiaux: 1.03, mainOeuvre: 0.93, logistique: 1.07, coefficient: 1.013 },
  siliana: { materiaux: 1.02, mainOeuvre: 0.92, logistique: 1.05, coefficient: 1.001 },
  sousse: { materiaux: 1.01, mainOeuvre: 1.08, logistique: 1.08, coefficient: 1.042 },
  monastir: { materiaux: 1.0, mainOeuvre: 1.06, logistique: 1.04, coefficient: 1.023 },
  mahdia: { materiaux: 1.02, mainOeuvre: 0.99, logistique: 1.04, coefficient: 1.017 },
  sfax: { materiaux: 0.99, mainOeuvre: 1.04, logistique: 1.03, coefficient: 1.011 },
  kairouan: { materiaux: 1.01, mainOeuvre: 0.93, logistique: 1.01, coefficient: 0.99 },
  kasserine: { materiaux: 1.04, mainOeuvre: 0.92, logistique: 1.08, coefficient: 1.018 },
  sidi_bouzid: { materiaux: 1.03, mainOeuvre: 0.92, logistique: 1.06, coefficient: 1.009 },
  gabes: { materiaux: 1.02, mainOeuvre: 0.99, logistique: 1.04, coefficient: 1.017 },
  medenine: { materiaux: 1.05, mainOeuvre: 1.01, logistique: 1.1, coefficient: 1.05 },
  tataouine: { materiaux: 1.1, mainOeuvre: 0.96, logistique: 1.18, coefficient: 1.081 },
  gafsa: { materiaux: 1.03, mainOeuvre: 0.96, logistique: 1.08, coefficient: 1.023 },
  tozeur: { materiaux: 1.07, mainOeuvre: 0.95, logistique: 1.14, coefficient: 1.054 },
  kebili: { materiaux: 1.09, mainOeuvre: 0.94, logistique: 1.17, coefficient: 1.069 },
};

/**
 * Feuille n°2 « Couts_24_gouv » — coût moyen par grande phase au niveau
 * standard central (TND/m²). Complète PHASE_SPLIT_2026 avec les valeurs
 * régionales exactes du modèle.
 */
export const GOVERNORATE_PHASES_M2: Record<
  string,
  { grosOeuvre: number; secondOeuvre: number; finitionsEquipements: number }
> = {
  tunis: { grosOeuvre: 820, secondOeuvre: 650, finitionsEquipements: 440 },
  ariana: { grosOeuvre: 800, secondOeuvre: 640, finitionsEquipements: 430 },
  ben_arous: { grosOeuvre: 800, secondOeuvre: 630, finitionsEquipements: 430 },
  manouba: { grosOeuvre: 790, secondOeuvre: 620, finitionsEquipements: 420 },
  nabeul: { grosOeuvre: 810, secondOeuvre: 640, finitionsEquipements: 430 },
  zaghouan: { grosOeuvre: 770, secondOeuvre: 610, finitionsEquipements: 410 },
  bizerte: { grosOeuvre: 780, secondOeuvre: 620, finitionsEquipements: 420 },
  beja: { grosOeuvre: 770, secondOeuvre: 610, finitionsEquipements: 410 },
  jendouba: { grosOeuvre: 780, secondOeuvre: 620, finitionsEquipements: 420 },
  le_kef: { grosOeuvre: 780, secondOeuvre: 620, finitionsEquipements: 420 },
  siliana: { grosOeuvre: 770, secondOeuvre: 610, finitionsEquipements: 410 },
  sousse: { grosOeuvre: 810, secondOeuvre: 640, finitionsEquipements: 430 },
  monastir: { grosOeuvre: 790, secondOeuvre: 630, finitionsEquipements: 420 },
  mahdia: { grosOeuvre: 790, secondOeuvre: 620, finitionsEquipements: 420 },
  sfax: { grosOeuvre: 780, secondOeuvre: 620, finitionsEquipements: 420 },
  kairouan: { grosOeuvre: 770, secondOeuvre: 610, finitionsEquipements: 410 },
  kasserine: { grosOeuvre: 790, secondOeuvre: 620, finitionsEquipements: 420 },
  sidi_bouzid: { grosOeuvre: 780, secondOeuvre: 620, finitionsEquipements: 420 },
  gabes: { grosOeuvre: 790, secondOeuvre: 620, finitionsEquipements: 420 },
  medenine: { grosOeuvre: 810, secondOeuvre: 640, finitionsEquipements: 430 },
  tataouine: { grosOeuvre: 840, secondOeuvre: 660, finitionsEquipements: 450 },
  gafsa: { grosOeuvre: 790, secondOeuvre: 630, finitionsEquipements: 420 },
  tozeur: { grosOeuvre: 820, secondOeuvre: 650, finitionsEquipements: 440 },
  kebili: { grosOeuvre: 830, secondOeuvre: 650, finitionsEquipements: 440 },
};

/**
 * Onglet « Detail_lots » — ventilation indicative du coût standard central
 * en 15 lots (% du coût standard central). La somme vaut 100 %.
 */
export const LOT_VENTILATION_2026: { id: string; label: string; percent: number }[] = [
  { id: "installation_securite", label: "Installation, implantation et sécurité", percent: 2 },
  { id: "terrassements_vrd_immediats", label: "Terrassements et VRD immédiats", percent: 4 },
  { id: "fondations_infrastructure", label: "Fondations et infrastructure", percent: 8 },
  { id: "ossature_beton_planchers", label: "Ossature béton armé, planchers et escaliers", percent: 19 },
  { id: "maconnerie_enduits_chapes", label: "Maçonnerie, enduits et chapes", percent: 10 },
  { id: "etancheite_isolation", label: "Étanchéité et isolation", percent: 5 },
  { id: "menuiseries_alu_bois", label: "Menuiseries aluminium et bois", percent: 10 },
  { id: "electricite_courants_faibles", label: "Électricité et courants faibles", percent: 7 },
  { id: "plomberie_reseaux_sanitaires", label: "Plomberie et réseaux sanitaires", percent: 7 },
  { id: "climatisation_chauffage", label: "Climatisation et chauffage", percent: 5 },
  { id: "revetements_sols_murs", label: "Revêtements sols et murs", percent: 8 },
  { id: "peinture_faux_plafonds", label: "Peinture et faux plafonds", percent: 5 },
  { id: "sanitaires_robinetterie", label: "Sanitaires et robinetterie", percent: 4 },
  { id: "cuisine_rangements", label: "Cuisine et rangements de base", percent: 4 },
  { id: "divers_reception", label: "Divers, essais, nettoyage et réception", percent: 2 },
];

/** Ventilation en TND/m² des 15 lots pour un coût standard central donné. */
export function lotVentilationM2(stdCentralM2: number): { id: string; label: string; percent: number; amountM2: number }[] {
  return LOT_VENTILATION_2026.map((l) => ({
    ...l,
    amountM2: Math.round((stdCentralM2 * l.percent) / 100),
  }));
}

const _STD_REF = STANDING_LEVELS_2026[1].central; // 1780
const _range10 = (lo: number, hi: number) =>
  `${Math.round(lo / 10) * 10}-${Math.round(hi / 10) * 10}`;

// Coût régional : niveaux centraux EXACTS de la feuille n°2 (Couts_24_gouv) ;
// les fourchettes bas/haut restent déduites des fourchettes nationales.
function _regionCost(g: string, stdM2: number) {
  const lvl = GOVERNORATE_LEVELS_2026[g];
  const f = stdM2 / _STD_REF;
  return {
    eco: lvl ? lvl.eco : Math.round(STANDING_LEVELS_2026[0].central * f),
    std: stdM2,
    premium: lvl ? lvl.hautStanding : Math.round(STANDING_LEVELS_2026[2].central * f),
    luxe: lvl ? lvl.luxe : Math.round(STANDING_LEVELS_2026[3].central * f),
    ecoRange: _range10(1200 * f, 1500 * f),
    stdRange: _range10(1600 * f, 2000 * f),
    premiumRange: _range10(2200 * f, 2800 * f),
  };
}

export const REGION_COST_M2: Record<string, { eco: number; std: number; premium: number; luxe: number; ecoRange: string; stdRange: string; premiumRange: string }> =
  Object.fromEntries(
    Object.entries(GOVERNORATE_STD_M2).map(([g, std]) => [g, _regionCost(g, std)]),
  );

// National average : moyenne des 24 gouvernorats (= 1 845 DT/m² en standard,
// conforme à la « Moyenne standard – 24 gouvernorats » de la feuille source).
export const NATIONAL_AVG = (() => {
  const vals = Object.values(REGION_COST_M2);
  const avg = (k: "eco" | "std" | "premium") =>
    Math.round(vals.reduce((s, v) => s + v[k], 0) / vals.length);
  return { eco: avg("eco"), std: avg("std"), premium: avg("premium") };
})();

// Cache les fourchettes de prix par région pour l'affichage UI
export const REGION_RANGES: Record<string, { eco: string; std: string; premium: string }> = {};
const _regKeys = Object.keys(REGION_COST_M2);
for (const _rk of _regKeys) {
  REGION_RANGES[_rk] = {
    eco: REGION_COST_M2[_rk].ecoRange,
    std: REGION_COST_M2[_rk].stdRange,
    premium: REGION_COST_M2[_rk].premiumRange,
  };
}

// ============================================================================
// MATERIAL CALCULATORS (Generate items with realistic quantities)
// ============================================================================

// Profil technique d'un type de projet → guide les quantités générées
function catProfile(cat: string): string {
  if (["piscine", "piscine_beton", "piscine_coque"].includes(cat)) return "pool";
  if (["jardin", "amenagement_paysager", "aire_de_jeux"].includes(cat)) return "garden";
  if (["cloture", "mur_de_separation"].includes(cat)) return "fence";
  if (cat === "installation_solaire") return "solar";
  if (cat === "electricite_complete") return "electrical";
  if (cat === "plomberie_complete") return "plumbing";
  if (cat === "peinture_interieure") return "paint";
  if (["usine", "depot", "entrepot", "atelier", "chateau_d_eau", "serre_agricole", "batiment_agricole"].includes(cat)) return "industrial";
  if (["local_commercial", "boutique_commerciale", "bureau", "bureau_cabinet", "hotel", "maison_hote", "restaurant", "cafe", "residence_touristique"].includes(cat)) return "commercial";
  if (["parking", "route", "trottoir"].includes(cat)) return "parking";
  if (cat.startsWith("renovation")) return "renovation";
  return "residential";
}

function genGOItems(surface: number, floors: number, cat: string, targetBudget: number, wallFactor = 1, livePrices?: LivePriceMap) {
  const tb = surface * (floors || 1);
  const profile = catProfile(cat);
  const isSmall = ["cloture","mur_de_separation","trottoir","pergola","terrasse","garage"].includes(cat);
  const isHeavy = ["immeuble_residentiel","immeuble","usine","depot","entrepot","chateau_d_eau","mosquee","ecole"].includes(cat);
  const d = isSmall ? 0.5 : isHeavy ? 1.3 : 1;
  const dW = d * wallFactor; // cloisons supplémentaires selon le nb de pièces

  let items: any[];
  if (profile === "pool") {
    if (cat === "piscine_coque") {
      // Piscine coque : pas de coque béton armé → terrassement + assise + remblais
      items = [
        {n:"Terrassement & excavation piscine", q:Math.round(tb*0.8*10)/10, u:"m³", up:25},
        {n:"Béton de propreté 150kg/m³", q:Math.round(tb*0.08*10)/10, u:"m³", up:90},
        {n:"Lit de sable de pose", q:Math.round(tb*0.1*10)/10, u:"m³", up:P.sand.fine},
        {n:"Remblai latéral stabilisé", q:Math.round(tb*0.2*10)/10, u:"m³", up:40},
        {n:"Ciment CPJ 42.5 (Sac 50kg)", q:Math.round(tb*0.6), u:"sacs", up:P.cement.bag42_5},
        {n:"Sable de construction 0/4", q:Math.round(tb*0.12*10)/10, u:"m³", up:P.sand.construction},
        {n:"Gravier 15/25mm", q:Math.round(tb*0.1*10)/10, u:"m³", up:P.gravel["15_25mm"]},
        {n:"Fouilles en rigole", q:Math.round(tb*0.08), u:"m³", up:18},
      ];
    } else {
      // Piscine béton : pas de maçonnerie de logement → excavation + coque béton armé
      items = [
        {n:"Terrassement & excavation piscine", q:Math.round(tb*0.8*10)/10, u:"m³", up:25},
        {n:"Béton de propreté 150kg/m³", q:Math.round(tb*0.1*10)/10, u:"m³", up:90},
        {n:"Béton armé coque C25/30", q:Math.round(tb*0.35*10)/10, u:"m³", up:265},
        {n:"Acier à béton T12", q:Math.round(tb*0.018*100)/100, u:"tonnes", up:P.steel.t12_ton},
        {n:"Treillis soudé ST25", q:Math.round(tb*0.15), u:"m²", up:P.steel.treillis_m2},
        {n:"Ciment CPJ 42.5 (Sac 50kg)", q:Math.round(tb*1.5), u:"sacs", up:P.cement.bag42_5},
        {n:"Sable de construction 0/4", q:Math.round(tb*0.15*10)/10, u:"m³", up:P.sand.construction},
        {n:"Gravier 15/25mm", q:Math.round(tb*0.15*10)/10, u:"m³", up:P.gravel["15_25mm"]},
        {n:"Bois de coffrage", q:Math.round(tb*0.03*100)/100, u:"m³", up:P.wood.formwork_m3},
        {n:"Fouilles en rigole", q:Math.round(tb*0.1), u:"m³", up:18},
      ];
    }
  } else if (profile === "paint") {
    // Peinture intérieure : pas de gros œuvre → préparations légères
    items = [
      {n:"Enduit de lissage prêt à gâcher", q:Math.round(tb*2.5), u:"kg", up:1.2},
      {n:"Ciment CPJ 42.5 (Sac 50kg)", q:Math.round(tb*0.15), u:"sacs", up:P.cement.bag42_5},
      {n:"Sable de construction 0/4", q:Math.round(tb*0.02*10)/10, u:"m³", up:P.sand.construction},
    ];
  } else if (profile === "electrical" || profile === "plumbing") {
    // Corps d'état spécialisés : pas de gros œuvre
    items = [
      {n:"Fouilles et saignées", q:Math.round(tb*0.02), u:"ml", up:15},
    ];
  } else if (profile === "garden") {
    // Jardin / paysager : pas de gros œuvre lourd → terrassement + terre végétale
    items = [
      {n:"Terre végétale amendée", q:Math.round(tb*0.2*10)/10, u:"m³", up:35},
      {n:"Gravier concassé (drainage)", q:Math.round(tb*0.12*10)/10, u:"m³", up:28},
      {n:"Sable de construction 0/4", q:Math.round(tb*0.1*10)/10, u:"m³", up:P.sand.construction},
      {n:"Béton de propreté 150kg/m³", q:Math.round(tb*0.06*10)/10, u:"m³", up:90},
      {n:"Ciment CPJ 42.5 (Sac 50kg)", q:Math.round(tb*0.8), u:"sacs", up:P.cement.bag42_5},
      {n:"Parpaing creux 20cm", q:Math.round(tb*4), u:"unités", up:P.bricks.parpaing_20},
      {n:"Fouilles en rigole", q:Math.round(tb*0.08), u:"m³", up:18},
    ];
  } else if (profile === "fence") {
    // Clôture / mur : fondations linéaires + parpaings + poteaux
    items = [
      {n:"Béton de fondation linéaire", q:Math.round(tb*0.12*10)/10, u:"m³", up:210},
      {n:"Acier à béton T10", q:Math.round(tb*0.008*100)/100, u:"tonnes", up:P.steel.t12_ton},
      {n:"Parpaing creux 20cm", q:Math.round(tb*10*dW), u:"unités", up:P.bricks.parpaing_20},
      {n:"Brique pleine 22x11x7", q:Math.round(tb*18*dW), u:"unités", up:P.bricks.pleine_22x11x7},
      {n:"Ciment CPJ 42.5 (Sac 50kg)", q:Math.round(tb*1.2), u:"sacs", up:P.cement.bag42_5},
      {n:"Sable de construction 0/4", q:Math.round(tb*0.15*10)/10, u:"m³", up:P.sand.construction},
      {n:"Poteau préfabriqué béton", q:Math.max(4,Math.round(tb/4)), u:"unités", up:120},
      {n:"Fouilles en rigole", q:Math.round(tb*0.1), u:"m³", up:18},
    ];
  } else if (profile === "solar") {
    // Solaire : pas de maçonnerie → fondations massifs + supports + câbles
    items = [
      {n:"Béton de fondation massifs", q:Math.round(tb*0.08*10)/10, u:"m³", up:210},
      {n:"Acier à béton T10", q:Math.round(tb*0.005*100)/100, u:"tonnes", up:P.steel.t12_ton},
      {n:"Support aluminium fixation panneaux", q:Math.round(tb*0.4), u:"m²", up:45},
      {n:"Câble solaire DC 6mm²", q:Math.round(tb*1.2), u:"ml", up:3},
      {n:"Ciment CPJ 42.5 (Sac 50kg)", q:Math.round(tb*0.3), u:"sacs", up:P.cement.bag42_5},
      {n:"Sable de construction 0/4", q:Math.round(tb*0.05*10)/10, u:"m³", up:P.sand.construction},
      {n:"Fouilles en rigole", q:Math.round(tb*0.05), u:"m³", up:18},
    ];
  } else if (profile === "industrial") {
    // Industriel : dalle industrielle + charpente, pas de cloisons fines
    items = [
      {n:"Béton de dalle industrielle C25/30", q:Math.round(tb*0.22*10)/10, u:"m³", up:265},
      {n:"Acier à béton T12", q:Math.round(tb*0.014*100)/100, u:"tonnes", up:P.steel.t12_ton},
      {n:"Treillis soudé ST25", q:Math.round(tb*0.15), u:"m²", up:P.steel.treillis_m2},
      {n:"Ciment CPJ 42.5 (Sac 50kg)", q:Math.round(tb*1.5), u:"sacs", up:P.cement.bag42_5},
      {n:"Sable de construction 0/4", q:Math.round(tb*0.15*10)/10, u:"m³", up:P.sand.construction},
      {n:"Gravier 15/25mm", q:Math.round(tb*0.15*10)/10, u:"m³", up:P.gravel["15_25mm"]},
      {n:"Parpaing creux 20cm", q:Math.round(tb*8), u:"unités", up:P.bricks.parpaing_20},
      {n:"Bois de coffrage", q:Math.round(tb*0.02*100)/100, u:"m³", up:P.wood.formwork_m3},
      {n:"Fouilles en rigole", q:Math.round(tb*0.08), u:"m³", up:18},
    ];
  } else if (profile === "parking") {
    // Parking / route : pas de bâtiment → couche de forme + béton
    items = [
      {n:"Graves non traitées (couche de forme)", q:Math.round(tb*0.2*10)/10, u:"m³", up:35},
      {n:"Béton de propreté 150kg/m³", q:Math.round(tb*0.08*10)/10, u:"m³", up:90},
      {n:"Acier à béton T12", q:Math.round(tb*0.008*100)/100, u:"tonnes", up:P.steel.t12_ton},
      {n:"Treillis soudé ST25", q:Math.round(tb*0.1), u:"m²", up:P.steel.treillis_m2},
      {n:"Ciment CPJ 42.5 (Sac 50kg)", q:Math.round(tb*1.0), u:"sacs", up:P.cement.bag42_5},
      {n:"Sable de construction 0/4", q:Math.round(tb*0.12*10)/10, u:"m³", up:P.sand.construction},
      {n:"Gravier 15/25mm", q:Math.round(tb*0.1*10)/10, u:"m³", up:P.gravel["15_25mm"]},
      {n:"Fouilles en rigole", q:Math.round(tb*0.06), u:"m³", up:18},
    ];
  } else if (profile === "commercial") {
    // Commercial / bureau / resto : maçonnerie classique sans hourdis de toiture
    items = [
      {n:"Ciment CPJ 42.5 (Sac 50kg)", q:Math.round(tb*3.5*d), u:"sacs", up:P.cement.bag42_5},
      {n:"Sable de construction 0/4", q:Math.round(tb*0.25*d*10)/10, u:"m³", up:P.sand.construction},
      {n:"Gravier 15/25mm", q:Math.round(tb*0.15*d*10)/10, u:"m³", up:P.gravel["15_25mm"]},
      {n:"Acier à béton T12", q:Math.round(tb*0.02*d*100)/100, u:"tonnes", up:P.steel.t12_ton},
      {n:"Treillis soudé ST25", q:Math.round(tb*0.12), u:"m²", up:P.steel.treillis_m2},
      {n:"Brique creuse 10cm", q:Math.round(tb*45*dW), u:"unités", up:P.bricks.hollow_10},
      {n:"Béton prêt à l'emploi 300kg/m³", q:Math.round(tb*0.25*d*10)/10, u:"m³", up:P.concrete.ready_mix_300},
      {n:"Bois de coffrage", q:Math.round(tb*0.04*100)/100, u:"m³", up:P.wood.formwork_m3},
      {n:"Fouilles en rigole", q:Math.round(tb*0.1), u:"m³", up:18},
      {n:"Parpaing creux 20cm", q:Math.round(tb*12*dW), u:"unités", up:P.bricks.parpaing_20},
    ];
  } else {
    // Résidentiel / rénovation : structure classique tunisienne
    // Facteur multi-niveaux : pour R+1 (floors=2) et R+2 (floors=3),
    // les structures sont plus robustes (plus de dalles, escalier, armatures)
    const sf = floors <= 1 ? 1 : floors === 2 ? 1.5 : 2.0;
    const slabCount = Math.max(1, floors || 1);
    items = [
      {n:"Ciment CPJ 42.5 (Sac 50kg)", q:Math.round(tb*3.5*d*sf), u:"sacs", up:P.cement.bag42_5},
      {n:"Ciment CPJ 32.5 (Maçonnerie)", q:Math.round(tb*1.0*d*sf), u:"sacs", up:P.cement.bag32_5},
      {n:"Sable de construction 0/4", q:Math.round(tb*0.25*d*sf*10)/10, u:"m³", up:P.sand.construction},
      {n:"Gravier 15/25mm", q:Math.round(tb*0.15*d*sf*10)/10, u:"m³", up:P.gravel["15_25mm"]},
      {n:"Acier à béton T12", q:Math.round(tb*0.02*d*sf*100)/100, u:"tonnes", up:P.steel.t12_ton},
      {n:"Treillis soudé ST25", q:Math.round(tb*0.12*sf), u:"m²", up:P.steel.treillis_m2},
      {n:"Brique creuse 10cm", q:Math.round(tb*45*dW*sf), u:"unités", up:P.bricks.hollow_10},
      {n:"Hourdis 16x50", q:Math.round(tb*7*d*slabCount), u:"unités", up:P.bricks.hourdis_16},
      {n:"Béton prêt à l'emploi 300kg/m³", q:Math.round(tb*0.25*d*sf*10)/10, u:"m³", up:P.concrete.ready_mix_300},
      {n:"Bois de coffrage", q:Math.round(tb*0.04*sf*100)/100, u:"m³", up:P.wood.formwork_m3},
      {n:"Fouilles en rigole", q:Math.round(tb*0.1), u:"m³", up:18},
      {n:"Parpaing creux 20cm", q:Math.round(tb*12*dW*sf), u:"unités", up:P.bricks.parpaing_20},
    ];
    if (floors >= 2) {
      const escUp = floors === 2 ? 5500 : 7500;
      items.push({n:"Escalier béton armé (volée)", q:1, u:"unité", up:escUp});
    }
  }
  return finalizeItems(items, targetBudget, true, livePrices);
}

function genSOItems(surface: number, floors: number, cat: string, targetBudget: number, rooms?: { total?: number }, livePrices?: LivePriceMap) {
  const tb = surface * (floors || 1);
  const profile = catProfile(cat);
  const isRenov = cat.startsWith("renovation");
  const tileQty = Math.round(tb * (isRenov ? 0.5 : 0.65));
  const paintL = Math.round(tb * (isRenov ? 0.4 : 0.3));
  // Une porte intérieure par pièce principale ; les fenêtres suivent les pièces
  const doorC = Math.max(1, rooms?.total ?? Math.round(tb / 45));
  const winC = Math.max(1, Math.round((rooms?.total ?? Math.round(tb / 30)) * 1.4));

  let items: any[] = [];
  if (profile === "pool") {
    // Piscine : pas de fenêtres alu ni de portes → margelles, revêtement, plage
    items = [
      {n:"Revêtement liner PVC armé", q:Math.round(tb*1.05), u:"m²", up:85},
      {n:"Margelles piscine granito 60x40", q:Math.round(tb*0.3), u:"ml", up:40},
      {n:"Carrelage anti-dérapant (plage)", q:Math.round(tb*0.4), u:"m²", up:32},
      {n:"Étanchéité enduit piscine hydrofuge", q:Math.round(tb*1.2), u:"m²", up:18},
      {n:"Peinture piscine (bassin)", q:Math.round(tb*0.6), u:"litres", up:22},
      {n:"Escalier inox + main courante", q:1, u:"unité", up:380},
      {n:"Plinthe piscine 60x20", q:Math.round(tb*0.25), u:"ml", up:12},
    ];
  } else if (profile === "garden") {
    // Jardin / paysager : pas de menuiserie → pavés, gazon, bordures
    items = [
      {n:"Gazon en plaques", q:Math.round(tb*0.55), u:"m²", up:14},
      {n:"Pavé autobloquant 6cm", q:Math.round(tb*0.3), u:"m²", up:32},
      {n:"Gravier décoratif 10/20", q:Math.round(tb*0.12), u:"m³", up:45},
      {n:"Bordure béton 50x20", q:Math.round(tb*0.15), u:"ml", up:9},
      {n:"Terre végétale amendée", q:Math.round(tb*0.08*10)/10, u:"m³", up:35},
      {n:"Dalle grès cérame antidérapante 40x40", q:Math.round(tb*0.18), u:"m²", up:32},
    ];
  } else if (profile === "fence") {
    // Clôture / mur : pas de fenêtres → enduit, crépi, portail
    items = [
      {n:"Enduit de façade ciment", q:Math.round(tb*1.1), u:"m²", up:12},
      {n:"Peinture extérieure acrylique", q:Math.round(tb*0.3), u:"litres", up:26},
      {n:"Crénelage + chaperon béton", q:Math.round(tb*0.2), u:"ml", up:18},
      {n:"Portail métallique à deux vantaux", q:Math.max(1,Math.round(tb/10)), u:"unités", up:850},
      {n:"Étanchéité liquide bitumeuse (tête de mur)", q:Math.round(tb*0.15), u:"m²", up:22},
    ];
  } else if (profile === "solar") {
    // Solaire : pas de finitions intérieures → étanchéité + chemins de câbles
    items = [
      {n:"Étanchéité liquide bitumeuse", q:Math.round(tb*0.3), u:"m²", up:22},
      {n:"Peinture antirouille supports", q:Math.round(tb*0.1), u:"litres", up:18},
      {n:"Chemin de câbles galvanisé", q:Math.round(tb*0.2), u:"ml", up:18},
      {n:"Goulotte PVC 40x60", q:Math.round(tb*0.15), u:"ml", up:8},
    ];
  } else if (profile === "industrial") {
    // Industriel : pas de tuiles ni fenêtres alu résidentielles
    items = [
      {n:"Peinture époxy sol atelier", q:Math.round(tb*0.6), u:"m²", up:35},
      {n:"Porte sectionnelle industrielle 3x3", q:Math.max(1,Math.round(tb/250)), u:"unités", up:1800},
      {n:"Étanchéité toiture bac acier", q:Math.round(tb*0.6), u:"m²", up:20},
      {n:"Bardage métallique prélaqué", q:Math.round(tb*0.35), u:"m²", up:45},
      {n:"Peinture intérieure mate", q:Math.round(tb*0.2), u:"litres", up:22},
    ];
  } else if (profile === "parking") {
    // Parking / route : pas de bâtiment → enrobé, marquage, bordures
    items = [
      {n:"Enrobé bitumineux 5cm", q:Math.round(tb*0.85), u:"m²", up:45},
      {n:"Bordures béton T2", q:Math.round(tb*0.1), u:"ml", up:9},
      {n:"Peinture marquage au sol", q:Math.round(tb*0.04), u:"litres", up:18},
      {n:"Caniveau béton préfabriqué", q:Math.round(tb*0.06), u:"ml", up:25},
    ];
  } else if (profile === "commercial") {
    // Commercial / bureau / resto : vitrine au lieu de fenêtres résidentielles
    items = [
      {n:"Carrelage sol grès cérame 60x60", q:Math.round(tb*0.7), u:"m²", up:26},
      {n:"Peinture intérieure mate lessivable", q:paintL, u:"litres", up:22},
      {n:"Vitrine aluminium + porte coulissante", q:Math.max(1,Math.round(tb/40)), u:"unités", up:1400},
      {n:"Faux plafond dalles 60x60", q:Math.round(tb*0.5), u:"m²", up:25},
      {n:"Enduit de lissage prêt à gâcher", q:Math.round(tb*2.0), u:"kg", up:1.2},
      {n:"Étanchéité liquide bitumeuse", q:Math.round(tb*0.25), u:"m²", up:22},
    ];
  } else {
    // Résidentiel / rénovation : finitions classiques tunisiennes
    const doorMultiplier = floors <= 1 ? 1 : floors === 2 ? 1.5 : 2.0;
    const multiDoorC = Math.max(1, Math.round(doorC * doorMultiplier));
    items = [
      {n:"Carrelage sol grès cérame 40x40", q:tileQty, u:"m²", up:22},
      {n:"Carrelage mural faïence 20x30", q:Math.round(tileQty*0.25), u:"m²", up:18},
      {n:"Peinture intérieure mate lessivable", q:paintL, u:"litres", up:22},
      {n:"Peinture extérieure acrylique", q:Math.round(paintL*0.2), u:"litres", up:26},
      {n:"Enduit de lissage prêt à gâcher", q:Math.round(tb*2.0), u:"kg", up:1.2},
      {n:"Plinthe céramique 8x30", q:Math.round(tb*0.35), u:"ml", up:8},
      {n:"Porte intérieure en bois pleine", q:Math.max(1,multiDoorC), u:"unités", up:320},
      {n:"Porte d'entrée métallique blindée", q:1, u:"unité", up:550},
      {n:"Fenêtre coulissante alu simple vitrage", q:Math.max(2,winC), u:"unités", up:310},
      {n:"Grille de protection métallique", q:Math.max(2,winC), u:"unités", up:220},
      {n:"Étanchéité liquide bitumeuse", q:Math.round(tb*0.25), u:"m²", up:22},
    ];
    if (floors >= 2) {
      items.push({n:"Garde-corps inox/fer forgé (escalier+balcons)", q:floors === 2 ? 18 : 25, u:"ml", up:150});
    }
    if (isRenov) {
      items.push({n:"Panneau de placoplâtre BA13", q:Math.round(tb*0.15), u:"m²", up:20});
      items.push({n:"Corniche en plâtre", q:Math.round(tb*0.2), u:"ml", up:8});
    }
  }
  return finalizeItems(items, targetBudget, true);
}

function genEQItems(surface: number, floors: number, cat: string, targetBudget: number, rooms?: { bathrooms?: number; kitchens?: number; total?: number }) {
  const tb = surface * (floors || 1);
  const items: any[] = [];
  const profile = catProfile(cat);
  const isPool = cat === "piscine";
  const isSolar = cat === "installation_solaire";
  const doorC = Math.max(1, Math.round(tb / 40));
  // Sanitaires dimensionnés selon le nombre de salles de bain + cuisine
  const bathrooms = Math.max(1, rooms?.bathrooms ?? 1);
  const kitchens = Math.max(1, rooms?.kitchens ?? 1);
  const saniC = Math.max(1, bathrooms + kitchens - 1);

  if (isPool) {
    items.push({n:"Pompe de filtration + filtre à sable", q:1, u:"forfait", up:1200},
      {n:"Projecteur LED piscine", q:2, u:"unités", up:250},
      {n:"Skimmer + buses de refoulement", q:1, u:"forfait", up:300},
      {n:"Chauffage électrique piscine 9kW", q:1, u:"unité", up:1800},
      {n:"Robot nettoyeur piscine", q:1, u:"unité", up:700});
  } else if (isSolar) {
    const panels = Math.round(surface * 0.3);
    items.push({n:"Panneau photovoltaïque 450Wc monocristallin", q:panels, u:"unités", up:550},
      {n:"Onduleur central", q:1, u:"unité", up:2500},
      {n:"Coffret de protection DC/AC", q:1, u:"unité", up:400},
      {n:"Batterie de stockage lithium 10kWh", q:Math.max(1,Math.round(panels/8)), u:"unités", up:3200});
  } else if (profile === "garden") {
    // Jardin / paysager : arrosage automatique + éclairage extérieur, pas de sanitaires
    items.push(
      {n:"Programmateur d'arrosage automatique", q:1, u:"unité", up:180},
      {n:"Goutte-à-goutte + tuyau PER", q:Math.round(tb*0.4), u:"ml", up:4},
      {n:"Turbine d'arrosage", q:Math.max(2,Math.round(tb/25)), u:"unités", up:35},
      {n:"Projecteur LED extérieur étanche", q:Math.max(2,Math.round(tb/30)), u:"unités", up:80},
      {n:"Câble électrique 2.5mm²", q:Math.round(tb*0.5), u:"ml", up:1.5},
      {n:"Pompe de jardin + crépine", q:1, u:"unité", up:350});
  } else if (profile === "fence") {
    // Clôture : motorisation portail + interphone + éclairage
    items.push(
      {n:"Motorisation portail coulissant 600kg", q:1, u:"forfait", up:900},
      {n:"Interphone / vidéophone", q:1, u:"unité", up:180},
      {n:"Éclairage LED extérieur sur poteaux", q:Math.max(2,Math.round(tb/15)), u:"unités", up:70},
      {n:"Câble électrique 2.5mm²", q:Math.round(tb*0.4), u:"ml", up:1.5});
  } else if (profile === "industrial" || profile === "parking") {
    // Industriel / parking : éclairage haute baie + distribution électrique
    items.push(
      {n:"Luminaire LED haute baie 150W", q:Math.max(2,Math.round(tb/40)), u:"unités", up:180},
      {n:"Tableau électrique industriel", q:1, u:"unité", up:450},
      {n:"Câble électrique 2.5mm²", q:Math.round(tb*0.8), u:"ml", up:1.5},
      {n:"Prise industrielle triphasée 32A", q:Math.max(2,Math.round(tb/60)), u:"unités", up:60});
  } else if (profile === "commercial") {
    // Commercial / bureau / resto : clim + éclairage pro, sanitaires réduits
    items.push(
      {n:"Climatisation split 12000 BTU", q:Math.max(1,Math.round(tb/40)), u:"unités", up:1350},
      {n:"Luminaire LED encastré 60x60", q:Math.max(2,Math.round(tb/6)), u:"unités", up:45},
      {n:"WC public + lave-mains", q:Math.max(1,Math.round(tb/80)), u:"unités", up:350},
      {n:"Câble électrique 2.5mm²", q:Math.round(tb*1.5), u:"ml", up:1.5},
      {n:"Disjoncteur divisionnaire 20A", q:Math.max(2,Math.round(tb/60)), u:"unités", up:12});
  } else {
    // Résidentiel / rénovation : sanitaires + électricité domestique
    items.push(
      {n:"WC complet avec réservoir", q:bathrooms, u:"unités", up:240},
      {n:"Lavabo vasque + robinetterie", q:saniC, u:"unités", up:140},
      {n:"Chauffe-eau électrique 80L", q:Math.max(1,Math.round(bathrooms*0.6)), u:"unités", up:400},
      {n:"Receveur de douche 90x90", q:bathrooms, u:"unités", up:200},
      {n:"Tuyau PER Ø16", q:Math.round(tb*0.5), u:"ml", up:4},
      {n:"Tuyau PVC Ø100 évacuation", q:Math.round(tb*0.05), u:"ml", up:15},
      {n:"Câble électrique 2.5mm² (rouleau 100m)", q:Math.round(tb*2), u:"ml", up:1.5},
      {n:"Disjoncteur divisionnaire 20A", q:Math.max(2,Math.round((rooms?.total ?? doorC)*0.5)), u:"unités", up:12},
      {n:"Tableau électrique 13 modules", q:1, u:"unité", up:150},
      {n:"Prise de courant 2P+T encastrée", q:Math.max(4,doorC*2), u:"unités", up:9},
      {n:"Interrupteur va-et-vient", q:Math.max(3,doorC*1.5), u:"unités", up:7},
      {n:"Luminaire LED plafonnier", q:Math.max(2,doorC*2), u:"unités", up:30});
  }
  return finalizeItems(items, targetBudget, false);
}

function genMOItems(surface: number, floors: number, cat: string, targetBudget: number, rooms?: { total?: number; bathrooms?: number; kitchens?: number }) {
  const tb = surface * (floors || 1);
  const profile = catProfile(cat);
  const ih = ["immeuble_residentiel","immeuble","usine","mosquee","ecole","hotel"].includes(cat) ? 1.2 : 1;
  // Plus de pièces = plus de points électriques & sanitaires à poser
  const roomFactor = rooms?.total ? Math.min(1.4, Math.max(0.7, rooms.total / 6)) : 1;
  const saniFactor = rooms?.bathrooms ? Math.min(1.3, Math.max(0.8, ((rooms.bathrooms || 1) + (rooms.kitchens || 1)) / 3)) : 1;
  // Chef de chantier & maçon qualifié regroupés sur une même ligne (encadrement + gros œuvre)
  const groupMaconChef = (maconQ: number, chefQ: number) => ({
    n: "Chef de chantier & Maçon qualifié",
    q: Math.round((maconQ + chefQ) * 10) / 10,
    u: "jours",
    up: Math.round((maconQ * 80 + chefQ * 100) / (maconQ + chefQ)),
  });
  const groupedMaconChef = groupMaconChef((tb / 15) * ih, (tb / 100) * ih);

  let items: any[] = [];
  if (profile === "pool") {
    // Piscine : piscinier, terrassier, carreleur ; pas de maçon de logement
    items = [
      {n:"Piscinier (coque & étanchéité)", q:Math.round(tb/10*10)/10, u:"jours", up:85},
      {n:"Terrassier / pelleteur", q:Math.round(tb/20*10)/10, u:"jours", up:60},
      {n:"Ferronnier (armatures)", q:Math.round(tb/40*10)/10, u:"jours", up:70},
      {n:"Carreleur piscine", q:Math.round(tb/30*10)/10, u:"jours", up:80},
      {n:"Plombier (filtration & hydraulique)", q:Math.round(tb/50*10)/10, u:"jours", up:75},
      {n:"Électricien (éclairage & équipements)", q:Math.round(tb/70*10)/10, u:"jours", up:75},
      {n:"Chef de chantier", q:Math.round(tb/120*10)/10, u:"jours", up:100},
    ];
  } else if (profile === "garden") {
    items = [
      groupMaconChef(tb / 40, tb / 150),
      {n:"Jardinier paysagiste", q:Math.round(tb/25*10)/10, u:"jours", up:65},
      {n:"Terrassier", q:Math.round(tb/30*10)/10, u:"jours", up:55},
      {n:"Électricien (arrosage & éclairage)", q:Math.round(tb/80*10)/10, u:"jours", up:75},
      {n:"Plombier (réseau arrosage)", q:Math.round(tb/70*10)/10, u:"jours", up:75},
    ];
  } else if (profile === "solar") {
    items = [
      groupMaconChef(tb / 60, tb / 90),
      {n:"Électricien photovoltaïque", q:Math.round(tb/18*10)/10, u:"jours", up:85},
      {n:"Manœuvre", q:Math.round(tb/25*10)/10, u:"jours", up:55},
      {n:"Monteur charpente/supports", q:Math.round(tb/22*10)/10, u:"jours", up:70},
    ];
  } else if (profile === "fence" || profile === "parking") {
    items = [
      groupedMaconChef,
      {n:"Manœuvre", q:Math.round(tb/12*ih*10)/10, u:"jours", up:55},
      {n:"Électricien", q:Math.round(tb/60*ih*roomFactor*10)/10, u:"jours", up:75},
      {n:"Soudeur (portail / structures)", q:Math.round(tb/70*10)/10, u:"jours", up:80},
      {n:"Carreleur / paveur", q:Math.round(tb/45*ih*10)/10, u:"jours", up:80},
    ];
  } else if (profile === "industrial") {
    items = [
      groupedMaconChef,
      {n:"Manœuvre", q:Math.round(tb/12*ih*10)/10, u:"jours", up:55},
      {n:"Électricien industriel", q:Math.round(tb/50*ih*roomFactor*10)/10, u:"jours", up:80},
      {n:"Soudeur / métallier", q:Math.round(tb/45*10)/10, u:"jours", up:85},
      {n:"Carreleur / solier", q:Math.round(tb/45*ih*10)/10, u:"jours", up:80},
      {n:"Peintre en bâtiment", q:Math.round(tb/60*ih*10)/10, u:"jours", up:65},
    ];
  } else if (profile === "commercial") {
    items = [
      groupedMaconChef,
      {n:"Manœuvre", q:Math.round(tb/12*ih*10)/10, u:"jours", up:55},
      {n:"Électricien", q:Math.round(tb/55*ih*roomFactor*10)/10, u:"jours", up:75},
      {n:"Plombier", q:Math.round(tb/75*ih*saniFactor*10)/10, u:"jours", up:75},
      {n:"Faux plafonniste", q:Math.round(tb/50*10)/10, u:"jours", up:70},
      {n:"Carreleur", q:Math.round(tb/45*ih*10)/10, u:"jours", up:80},
      {n:"Peintre en bâtiment", q:Math.round(tb/60*ih*10)/10, u:"jours", up:65},
    ];
  } else {
    // Résidentiel / rénovation : corps de métiers classiques
    items = [
      groupedMaconChef,
      {n:"Manœuvre", q:Math.round(tb/12*ih*10)/10, u:"jours", up:55},
      {n:"Électricien", q:Math.round(tb/60*ih*roomFactor*10)/10, u:"jours", up:75},
      {n:"Plombier", q:Math.round(tb/80*ih*saniFactor*10)/10, u:"jours", up:75},
      {n:"Carreleur", q:Math.round(tb/45*ih*10)/10, u:"jours", up:80},
      {n:"Peintre en bâtiment", q:Math.round(tb/60*ih*10)/10, u:"jours", up:65},
    ];
  }
  return finalizeItems(items, targetBudget, false);
}

function genTRItems(surface: number, floors: number, targetBudget: number, cat = "maison") {
  const tb = surface * (floors || 1);
  const profile = catProfile(cat);
  let items: any[];
  if (profile === "pool" || profile === "garden") {
    // Piscine / jardin : beaucoup de terre à évacuer / apporter, peu de béton
    items = [
      {n:"Transport matériaux (benne 10t)", q:Math.max(2,Math.round(tb/25)), u:"voyages", up:170},
      {n:"Évacuation terre excavée (benne 8m³)", q:Math.max(2,Math.round(tb/35)), u:"bennes", up:200},
      {n:"Location tractopelle", q:Math.max(2,Math.round(tb/60)), u:"jours", up:280},
      {n:"Apport terre végétale (camion 8m³)", q:Math.max(1,Math.round(tb/80)), u:"camions", up:250},
    ];
  } else {
    items = [
      {n:"Transport matériaux (benne 10t)", q:Math.max(2,Math.round(tb/30)), u:"voyages", up:170},
      {n:"Pompe à béton stationnaire", q:Math.round(tb*0.25), u:"m³", up:28},
      {n:"Location tractopelle", q:Math.max(1,Math.round(tb/100)), u:"jours", up:280},
      {n:"Évacuation gravats (benne 8m³)", q:Math.max(1,Math.round(tb/60)), u:"bennes", up:200},
    ];
  }
  return finalizeItems(items, targetBudget, false);
}

function genEIItems(totalBudget: number, targetBudget: number) {
  const items = [
    {n:"Permis de construire + taxe voirie", q:1, u:"forfait", up:Math.round(Math.min(totalBudget*0.015, 4000))},
    {n:"Honoraires architecte/BET", q:1, u:"forfait", up:Math.round(totalBudget*0.03)},
    {n:"Assurance chantier tous risques", q:1, u:"forfait", up:Math.round(totalBudget*0.008)},
    {n:"Étude de sol G12", q:1, u:"forfait", up:2500},
    {n:"Raccordement eau potable (SONEDE)", q:1, u:"forfait", up:1000},
    {n:"Raccordement électricité (STEG)", q:1, u:"forfait", up:1200},
  ];
  return finalizeItems(items, targetBudget, false);
}

function estimateDuration(s: number, fl: number, cat: string, roomsFactor = 1): string {
  const tb = s * (fl || 1);
  const adj = (base: number) => Math.max(1, Math.round(base * roomsFactor));
  if (cat.startsWith("renovation")) return `${adj(Math.round(tb/40))} mois`;
  if (["pergola","terrasse","cloture","mur_de_separation","trottoir","garage"].includes(cat)) return `${adj(Math.round(tb/60))} mois`;
  if (cat==="piscine") return `${adj(Math.max(2, Math.round(s/12)))} mois`;
  if (["jardin","amenagement_paysager","aire_de_jeux"].includes(cat)) return `${adj(Math.round(tb/100))} mois`;
  if (cat==="installation_solaire") return `${adj(Math.round(tb/80))} mois`;
  return `${adj(Math.max(2, Math.round(tb/40*(fl||1))))} mois`;
}

function detectAnomalies(cat: string, s: number, fl: number) {
  const a: any[] = [];
  if (s > 500 && (!fl || fl===1)) a.push({type:"Dimension excessive",severity:"moyenne",desc:`Surface ${s}m² sur un seul niveau.`,rec:"Envisager un étage pour réduire emprise au sol."});
  if (fl && fl >= 5) a.push({type:"Hauteur importante",severity:"élevée",desc:`${fl} étages = ascenseur obligatoire.`,rec:"Prévoir ascenseur PMR et voies d'évacuation incendie."});
  if (s < 20 && !["terrasse","pergola","garage","piscine"].includes(cat)) a.push({type:"Surface insuffisante",severity:"faible",desc:`${s}m² très réduit pour ce projet.`,rec:"Vérifier les dimensions saisies."});
  if (cat==="piscine" && s > 150) a.push({type:"Piscine très grande",severity:"moyenne",desc:`${s}m² coûts d'entretien élevés.`,rec:"Chauffage solaire pour réduire coûts énergétiques."});
  if (cat==="toiture" && s < 30) a.push({type:"Petite surface de toiture",severity:"faible",desc:`${s}m² - vérifier rentabilité.`,rec:"Regrouper avec d'autres travaux."});
  return a.map(x => ({type:x.type,severity:x.severity,description:x.desc,recommendation:x.rec}));
}

function getMethods(cat: string): string[] {
  if (cat==="piscine") return ["Béton projeté gunite","Coffrage traditionnel","Revêtement carrelage","Filtration à sable"];
  if (cat==="installation_solaire") return ["Structures alu toiture","Raccordement STEG","Compteur bidirectionnel"];
  if (cat.startsWith("renovation")) return ["Démolition sélective","Nettoyage/reprise support","Enduit projeté","Peinture acrylique"];
  if (["jardin","amenagement_paysager"].includes(cat)) return ["Terrassement mécanique","Irrigation goutte-à-goutte","Plantation manuelle"];
  return ["Fondations semelles filantes","Maçonnerie briques creuses","Dalle pleine béton armé","Enduit traditionnel","Carrelage collé"];
}

// ============================================================================
// PROVIDER RECOMMENDATION ENGINE
// ============================================================================

const PROVIDER_LABELS: Record<string, { icon: string; label: string }> = {
  architecte: { icon: "Building2", label: "Architecte" },
  bureau_etudes: { icon: "FileText", label: "Bureau d'études techniques" },
  ingenieur_structure: { icon: "HardHat", label: "Ingénieur structure" },
  entreprise_generale: { icon: "Building2", label: "Entreprise générale de construction" },
  macon: { icon: "HardHat", label: "Maçon" },
  coffreur: { icon: "HardHat", label: "Coffreur" },
  ferrailleur: { icon: "HardHat", label: "Ferrailleur" },
  carreleur: { icon: "Paintbrush", label: "Carreleur" },
  marbrier: { icon: "Paintbrush", label: "Marbrier" },
  peintre: { icon: "Paintbrush", label: "Peintre en bâtiment" },
  platrier: { icon: "Paintbrush", label: "Plâtrier" },
  menuisier_bois: { icon: "Paintbrush", label: "Menuisier bois" },
  menuisier_aluminium: { icon: "Paintbrush", label: "Menuisier aluminium" },
  vitrier: { icon: "Paintbrush", label: "Vitrier" },
  plombier: { icon: "Wrench", label: "Plombier / Fontainier" },
  electricien: { icon: "Zap", label: "Électricien" },
  climatisation: { icon: "Wind", label: "Climatisation / Chauffage" },
  etancheite: { icon: "Shield", label: "Entreprise d'étanchéité" },
  pisciniste: { icon: "Droplets", label: "Pisciniste" },
  paysagiste: { icon: "Leaf", label: "Paysagiste" },
  demolition: { icon: "TriangleAlert", label: "Entreprise de démolition" },
  terrassement: { icon: "Truck", label: "Entreprise de terrassement" },
  location_engins: { icon: "Truck", label: "Loueur d'engins" },
  transporteur: { icon: "Truck", label: "Transporteur de matériaux" },
  beton_ready: { icon: "Truck", label: "Centrale à béton prêt à l'emploi" },
  ciment: { icon: "Package", label: "Fournisseur de ciment" },
  acier: { icon: "Package", label: "Fournisseur d'acier" },
  briques: { icon: "Package", label: "Fournisseur de briques et parpaings" },
  carrelage: { icon: "Package", label: "Fournisseur de carrelage et revêtements" },
  sanitaire: { icon: "Package", label: "Fournisseur de sanitaires" },
  cuisine: { icon: "Package", label: "Fournisseur de cuisines" },
  solaire: { icon: "Sun", label: "Fournisseur d'énergie solaire" },
  portes_fenetres: { icon: "Package", label: "Fournisseur de portes et fenêtres" },
  quincaillerie: { icon: "Package", label: "Quincaillerie / Matériaux de construction" },
  promoteur: { icon: "Building2", label: "Promoteur immobilier" },
};

const REGION_CITIES: Record<string, { name: string; cities: string[] }> = {
  tunis: { name: "Tunis", cities: ["Tunis", "La Marsa", "Carthage", "Le Bardo", "El Menzah", "L'Ariana (limitrophe)"] },
  ariana: { name: "Ariana", cities: ["Ariana", "La Soukra", "Raoued", "Ettadhamen", "Mnihla"] },
  ben_arous: { name: "Ben Arous", cities: ["Ben Arous", "Rades", "Ezzahra", "Hammam Lif", "Bou Kornine", "Megrine"] },
  nabeul: { name: "Nabeul", cities: ["Nabeul", "Hammamet", "Dar Chaabane", "Menzel Bouzelfa", "Kélibia"] },
  sousse: { name: "Sousse", cities: ["Sousse", "Msaken", "Hammam Sousse", "Kalâa Kebira", "Enfidha"] },
  sfax: { name: "Sfax", cities: ["Sfax", "Sakiet Ezzit", "Sakiet Eddaïer", "Kerkennah"] },
  bizerte: { name: "Bizerte", cities: ["Bizerte", "Menzel Bourguiba", "Mateur", "Utique", "Ras Jebel"] },
  kairouan: { name: "Kairouan", cities: ["Kairouan", "Hajeb El Ayoun"] },
  monastir: { name: "Monastir", cities: ["Monastir", "Moknine", "Jemmal", "Ksar Hellal", "Bekalta"] },
  mahdia: { name: "Mahdia", cities: ["Mahdia", "Chebba", "El Jem", "Ksour Essef"] },
  gabes: { name: "Gabès", cities: ["Gabès", "Métouia", "El Hamma"] },
  gafsa: { name: "Gafsa", cities: ["Gafsa", "El Ksar", "Métlaoui"] },
  medenine: { name: "Médenine", cities: ["Médenine", "Djerba (Houmt Souk)", "Zarzis", "Ben Gardane"] },
  beja: { name: "Béja", cities: ["Béja", "Medjez El Bab", "Téboursouk"] },
  jendouba: { name: "Jendouba", cities: ["Jendouba", "Tabarka", "Ghardimaou", "Bou Salem"] },
  le_kef: { name: "Le Kef", cities: ["Le Kef", "Tajerouine", "Dahmani"] },
  siliana: { name: "Siliana", cities: ["Siliana", "Bou Arada", "Gaâfour"] },
  kasserine: { name: "Kasserine", cities: ["Kasserine", "Sbeitla", "Fériana"] },
  sidi_bouzid: { name: "Sidi Bouzid", cities: ["Sidi Bouzid", "Ouled Haffouz"] },
  zaghouan: { name: "Zaghouan", cities: ["Zaghouan", "El Fahs"] },
  tozeur: { name: "Tozeur", cities: ["Tozeur", "Nefta"] },
  kebili: { name: "Kébili", cities: ["Kébili", "Douz", "Souk Lahad"] },
  tataouine: { name: "Tataouine", cities: ["Tataouine", "Remada"] },
  manouba: { name: "La Manouba", cities: ["La Manouba", "Oued Ellil", "Djedeida"] },
};

/**
 * Generate AI-based provider recommendations based on project characteristics.
 * Uses project type, region, budget, surface, and finish level.
 */
export function generateProviderRecommendations(
  category: string,
  region: string,
  budget: number,
  surface: number,
  floors: number,
  finishLevel?: string
) {
  const regionInfo = REGION_CITIES[region] || { name: region, cities: [region] };
  const categoryLabel = CATEGORY_LABEL[category] || category;
  const isHighBudget = budget > 300000;
  const isLargeProject = surface > 200 || floors > 2;
  const isPremium = finishLevel === "premium" || finishLevel === "luxe";

  // Define which providers are needed per project type
  const providerMap: Record<string, string[]> = {
    maison: ["architecte","entreprise_generale","macon","coffreur","ferrailleur","carreleur","plombier","electricien","peintre","menuisier_bois","menuisier_aluminium","vitrier","etancheite","terrassement","transporteur","beton_ready","ciment","acier","briques","carrelage","sanitaire","portes_fenetres","quincaillerie"],
    villa: ["architecte","bureau_etudes","ingenieur_structure","entreprise_generale","macon","coffreur","ferrailleur","carreleur","marbrier","plombier","electricien","climatisation","peintre","menuisier_aluminium","vitrier","etancheite","paysagiste","terrassement","transporteur","beton_ready","ciment","acier","briques","carrelage","sanitaire","cuisine","portes_fenetres","quincaillerie"],
    piscine: ["architecte","pisciniste","terrassement","plombier","electricien","carreleur","marbrier","etancheite","beton_ready","ciment","acier","quincaillerie","transporteur"],
    jardin: ["paysagiste","terrassement","plombier","transporteur","quincaillerie"],
    amenagement_paysager: ["paysagiste","terrassement","plombier","electricien","transporteur","quincaillerie"],
    garage: ["entreprise_generale","macon","coffreur","ferrailleur","carreleur","electricien","etancheite","terrassement","beton_ready","ciment","acier","briques","portes_fenetres","transporteur"],
    cloture: ["macon","ferrailleur","terrassement","ciment","briques","transporteur"],
    terrasse: ["entreprise_generale","macon","carreleur","marbrier","etancheite","ciment","carrelage","transporteur"],
    pergola: ["menuisier_aluminium","menuisier_bois","macon","ciment","quincaillerie"],
    toiture: ["menuisier_bois","etancheite","ciment","briques","transporteur"],
    renovation_interieure: ["architecte","entreprise_generale","macon","carreleur","peintre","platrier","plombier","electricien","menuisier_bois","menuisier_aluminium","vitrier","sanitaire","carrelage","portes_fenetres","quincaillerie","transporteur","demolition"],
    renovation_salle_de_bain: ["architecte","plombier","electricien","carreleur","marbrier","menuisier_bois","sanitaire","carrelage","etancheite","quincaillerie","demolition"],
    renovation_cuisine: ["architecte","plombier","electricien","carreleur","menuisier_bois","cuisine","sanitaire","carrelage","quincaillerie","demolition"],
    renovation_facade: ["entreprise_generale","macon","peintre","etancheite","ciment","transporteur"],
    demolition: ["entreprise_generale","demolition","terrassement","location_engins","transporteur"],
    bureau: ["architecte","bureau_etudes","entreprise_generale","macon","coffreur","ferrailleur","carreleur","peintre","platrier","electricien","climatisation","plombier","menuisier_aluminium","vitrier","sanitaire","portes_fenetres","quincaillerie"],
    local_commercial: ["architecte","bureau_etudes","entreprise_generale","macon","coffreur","ferrailleur","carreleur","peintre","electricien","plombier","climatisation","menuisier_aluminium","vitrier","portes_fenetres","quincaillerie"],
    restaurant: ["architecte","bureau_etudes","entreprise_generale","plombier","electricien","climatisation","carreleur","peintre","cuisine","sanitaire","portes_fenetres","quincaillerie"],
    cafe: ["architecte","entreprise_generale","plombier","electricien","climatisation","carreleur","peintre","cuisine","portes_fenetres"],
    hotel: ["architecte","bureau_etudes","ingenieur_structure","entreprise_generale","climatisation","electricien","plombier","carreleur","marbrier","paysagiste","peintre","menuisier_aluminium","vitrier","etancheite","cuisine","solaire","portes_fenetres"],
    immeuble_residentiel: ["architecte","bureau_etudes","ingenieur_structure","entreprise_generale","macon","coffreur","ferrailleur","carreleur","peintre","plombier","electricien","etancheite","terrassement","beton_ready","ciment","acier","briques","carrelage","sanitaire","portes_fenetres","quincaillerie","transporteur"],
    appartement: ["architecte","entreprise_generale","macon","carreleur","peintre","platrier","plombier","electricien","menuisier_bois","menuisier_aluminium","vitrier","climatisation","carrelage","sanitaire","cuisine","portes_fenetres"],
    installation_solaire: ["ingenieur_structure","electricien","solaire","terrassement","transporteur"],
    studio: ["architecte","entreprise_generale","macon","carreleur","peintre","platrier","plombier","electricien","menuisier_bois","menuisier_aluminium","vitrier","climatisation","carrelage","sanitaire","cuisine","portes_fenetres"],
    duplex: ["architecte","bureau_etudes","entreprise_generale","macon","coffreur","ferrailleur","carreleur","peintre","platrier","plombier","electricien","menuisier_bois","menuisier_aluminium","vitrier","climatisation","carrelage","sanitaire","cuisine","portes_fenetres"],
    immeuble: ["architecte","bureau_etudes","ingenieur_structure","entreprise_generale","macon","coffreur","ferrailleur","carreleur","peintre","plombier","electricien","etancheite","terrassement","beton_ready","ciment","acier","briques","carrelage","sanitaire","portes_fenetres","quincaillerie","transporteur"],
    residence_touristique: ["architecte","bureau_etudes","ingenieur_structure","entreprise_generale","climatisation","electricien","plombier","carreleur","marbrier","paysagiste","peintre","menuisier_aluminium","vitrier","etancheite","cuisine","solaire","portes_fenetres"],
    projet_neuf: ["architecte","bureau_etudes","ingenieur_structure","entreprise_generale","macon","coffreur","ferrailleur","carreleur","peintre","plombier","electricien","climatisation","menuisier_aluminium","vitrier","etancheite","terrassement","beton_ready","ciment","acier","briques","carrelage","sanitaire","portes_fenetres","quincaillerie","transporteur"],
    mosquee: ["architecte","bureau_etudes","entreprise_generale","macon","coffreur","ferrailleur","carreleur","marbrier","electricien","plombier","peintre","menuisier_bois","menuisier_aluminium","vitrier","etancheite","ciment","acier","briques","carrelage","sanitaire","portes_fenetres"],
    ecole: ["architecte","bureau_etudes","entreprise_generale","macon","coffreur","ferrailleur","carreleur","peintre","plombier","electricien","climatisation","etancheite","terrassement","beton_ready","ciment","acier","briques","carrelage","sanitaire","portes_fenetres"],
    usine: ["architecte","bureau_etudes","ingenieur_structure","entreprise_generale","terrassement","beton_ready","ciment","acier","electricien","plombier","etancheite","location_engins","transporteur"],
    entrepot: ["entreprise_generale","terrassement","beton_ready","ciment","acier","electricien","etancheite","portes_fenetres","location_engins"],
    ferme: ["entreprise_generale","macon","terrassement","plombier","electricien","ciment","briques","acier","transporteur"],
    serre_agricole: ["entreprise_generale","terrassement","plombier","solaire","acier","transporteur"],
    parking: ["entreprise_generale","terrassement","beton_ready","ciment","acier","electricien","etancheite","location_engins"],
    route: ["entreprise_generale","terrassement","beton_ready","ciment","acier","location_engins","transporteur"],
    trottoir: ["macon","terrassement","ciment","briques","transporteur"],
    atelier: ["entreprise_generale","macon","electricien","ciment","acier","briques","portes_fenetres"],
    depot: ["entreprise_generale","terrassement","beton_ready","ciment","acier","electricien","portes_fenetres"],
    installation_sanitaires: ["plombier","electricien","carreleur","sanitaire","quincaillerie"],
    installations_electricite: ["electricien","quincaillerie"],
    chateau_d_eau: ["ingenieur_structure","entreprise_generale","beton_ready","ciment","acier","etancheite","plombier"],
    systeme_irrigation: ["plombier","paysagiste","terrassement","transporteur"],
  };

  const providerKeys = providerMap[category] || ["entreprise_generale","macon","electricien","plombier","ciment","acier","transporteur"];

  // Generate recommendations with reasons
  const recommendations = providerKeys.map((key) => {
    const info = PROVIDER_LABELS[key] || { icon: "Package", label: key };
    let reason = "";
    let priority: "essentiel" | "recommande" | "optionnel" = "recommande";

    // Determine reason based on provider type and project
    switch (key) {
      case "entreprise_generale":
        reason = isLargeProject
          ? "Projet d'envergure nécessitant une coordination générale des travaux"
          : "Pour superviser l'ensemble du chantier et garantir la conformité";
        priority = "essentiel";
        break;
      case "architecte":
        reason = isPremium || isLargeProject
          ? "Projet haut de gamme ou complexe nécessitant une conception architecturale"
          : "Pour les plans d'exécution et le suivi architectural";
        priority = isLargeProject ? "essentiel" : "recommande";
        break;
      case "bureau_etudes":
        reason = floors > 1 ? "Études techniques pour bâtiment à étages (structure, fluides)" : "Dimensionnement et calculs techniques";
        priority = floors > 2 ? "essentiel" : "recommande";
        break;
      case "ingenieur_structure":
        reason = floors > 1 ? "Calcul de structure R+${floors} obligatoire" : "Vérification de la structure porteuse";
        priority = floors > 1 ? "essentiel" : "recommande";
        break;
      case "macon":
        reason = `Maçonnerie pour ${surface}m² de ${categoryLabel}`;
        priority = "essentiel";
        break;
      case "coffreur":
        reason = surface > 100 ? "Volume de béton armé important nécessitant un coffrage professionnel" : "Coffrage des éléments en béton armé";
        priority = surface > 100 ? "essentiel" : "recommande";
        break;
      case "ferrailleur":
        reason = surface > 100 ? "Ferraillage important pour fondations et dalles" : "Mise en place des armatures";
        priority = surface > 100 ? "essentiel" : "recommande";
        break;
      case "carreleur":
        reason = `Revêtement de sol et murs pour ${surface}m²`;
        priority = "essentiel";
        break;
      case "marbrier":
        reason = isPremium ? "Finition haut de gamme : marbre pour escaliers, plans de travail" : "Fourniture et pose de marbre";
        priority = isPremium ? "recommande" : "optionnel";
        break;
      case "peintre":
        reason = "Peinture intérieure et extérieure, finition";
        priority = "essentiel";
        break;
      case "platrier":
        reason = "Cloisons en placo, faux plafonds, isolation";
        priority = "essentiel";
        break;
      case "plombier":
        reason = surface > 100 ? "Réseau d'eau et d'assainissement complet" : "Installation sanitaire";
        priority = "essentiel";
        break;
      case "electricien":
        reason = surface > 100 ? "Installation électrique complète (NF C 15-100)" : "Mise aux normes électriques";
        priority = "essentiel";
        break;
      case "climatisation":
        reason = isPremium || category === "bureau" || category === "restaurant" || category === "hotel"
          ? "Climatisation centrale ou multi-splits pour confort optimal"
          : "Prévoir les gaines techniques pour climatisation future";
        priority = isPremium || category === "bureau" || category === "hotel" ? "recommande" : "optionnel";
        break;
      case "menuisier_aluminium":
        reason = "Fenêtres, portes coulissantes, garde-corps en aluminium";
        priority = "essentiel";
        break;
      case "menuisier_bois":
        reason = "Portes intérieures, placards, boiseries";
        priority = "recommande";
        break;
      case "vitrier":
        reason = category === "bureau" || category === "local_commercial"
          ? "Vitrage sécurisé et façade vitrée"
          : "Double vitrage pour fenêtres et baies";
        priority = "essentiel";
        break;
      case "etancheite":
        reason = `Étanchéité des toitures et des parties humides`;
        priority = "essentiel";
        break;
      case "pisciniste":
        reason = `Construction de piscine ${surface}m²`;
        priority = "essentiel";
        break;
      case "paysagiste":
        reason = "Aménagement des espaces extérieurs, plantations";
        priority = "recommande";
        break;
      case "terrassement":
        reason = surface > 200
          ? "Terrassement de grande envergure pour fondations"
          : "Préparation du terrain et fouilles";
        priority = "essentiel";
        break;
      case "demolition":
        reason = "Démolition sélective des éléments existants avant rénovation";
        priority = "essentiel";
        break;
      case "location_engins":
        reason = surface > 300 ? "Nécessite des engins de chantier (pelle, compacteur)" : "Location de petite et moyenne engins";
        priority = surface > 300 ? "essentiel" : "optionnel";
        break;
      case "transporteur":
        reason = `Transport des matériaux vers ${regionInfo.name}`;
        priority = "essentiel";
        break;
      case "beton_ready":
        reason = `Fourniture de béton prêt à l'emploi pour ${Math.round(surface * 0.25)}m³`;
        priority = "essentiel";
        break;
      case "ciment":
        reason = `Approvisionnement en ciment CPJ 42.5 et 32.5`;
        priority = "essentiel";
        break;
      case "acier":
        reason = `Fourniture d'acier à béton (T12, T14, treillis soudé)`;
        priority = "essentiel";
        break;
      case "briques":
        reason = "Briques creuses, hourdis, parpaings pour maçonnerie";
        priority = "essentiel";
        break;
      case "carrelage":
        reason = isPremium
          ? "Carrelage grès cérame, marbre et pierre naturelle — finition haut de gamme"
          : "Carrelage sol et mural, faïence";
        priority = "essentiel";
        break;
      case "sanitaire":
        reason = "WC, lavabos, douches, robinetterie";
        priority = "essentiel";
        break;
      case "cuisine":
        reason = "Cuisine équipée ou semi-équipée";
        priority = category === "restaurant" || category === "renovation_cuisine" ? "essentiel" : "optionnel";
        break;
      case "solaire":
        reason = "Installation de panneaux photovoltaïques, chauffe-eau solaire";
        priority = "essentiel";
        break;
      case "portes_fenetres":
        reason = "Portes intérieures, portes d'entrée, fenêtres et grilles";
        priority = "essentiel";
        break;
      case "quincaillerie":
        reason = "Quincaillerie, outillage, matériaux de construction courants";
        priority = "essentiel";
        break;
      default:
        reason = `Prestation pour ${categoryLabel}`;
    }

    return {
      type: key,
      label: info.label,
      icon: info.icon,
      reason,
      priority,
      regionProximity: regionInfo.name,
      localCities: regionInfo.cities.slice(0, 3),
    };
  });

  // Sort by priority: essentiel first, then recommande, then optionnel
  const priorityOrder = { essentiel: 0, recommande: 1, optionnel: 2 };
  recommendations.sort(
    (a, b) =>
      (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
  );

  const essentialCount = recommendations.filter((r) => r.priority === "essentiel").length;
  const recommendedCount = recommendations.filter((r) => r.priority === "recommande").length;

  return {
    providers: recommendations,
    stats: {
      total: recommendations.length,
      essential: essentialCount,
      recommended: recommendedCount,
    },
    regionInfo: {
      name: regionInfo.name,
      cities: regionInfo.cities,
      advice: `Privilégiez les prestataires locaux (${regionInfo.name}) pour réduire les coûts de transport et faciliter le suivi de chantier.`
    },
  };
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

export interface RoomCounts {
  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  livingRooms?: number;
  garages?: number;
  wcs?: number;
  pools?: number;
}

export function runBIMEstimation(
  category: string, surface: number, floors: number,
  region?: string, finishLevel?: string,
  rooms?: RoomCounts
) {
  const pct = PROJECT_PCT[category] || [35, 30, 15, 10, 3, 7];
  const marketPrices = MARKET_PRICE_M2[category] || { eco: 1000, std: 1500, premium: 2500 };

  // Nouveau système : prix régionaux directs (TND/m²) basés sur le marché tunisien 2026
  const fLevel = finishLevel || "standard";
  const regionCosts = region ? (REGION_COST_M2[region] || null) : null;

  // Prix de base par m² = prix régional OU moyenne nationale
  let baseRegionM2: number;
  let baseRegionLabel: string;
  if (regionCosts) {
    if (fLevel === "economique") baseRegionM2 = regionCosts.eco;
    else if (fLevel === "premium") baseRegionM2 = regionCosts.premium;
    else baseRegionM2 = regionCosts.std;
    baseRegionLabel = regionCosts.ecoRange + " / " + regionCosts.stdRange + " / " + regionCosts.premiumRange;
  } else {
    if (fLevel === "economique") baseRegionM2 = NATIONAL_AVG.eco;
    else if (fLevel === "premium") baseRegionM2 = NATIONAL_AVG.premium;
    else baseRegionM2 = NATIONAL_AVG.std;
    baseRegionLabel = "";
  }

  // Ratio du type de projet par rapport à une maison de référence
  const maisonStd = MARKET_PRICE_M2["maison"]?.std || 1100;
  const projectStd = marketPrices.std || 1500;
  const projectRatio = projectStd / maisonStd;

  // Prix final par m² = prix régional × ratio du type de projet
  const finalPriceM2 = Math.round(baseRegionM2 * projectRatio);

  const tb = surface * (floors || 1);

  // ── Nombre de pièces : impact sur le prix au m² ──
  // Défauts réalistes : maison tunisienne type (~1 pièce / 35-45 m²)
  const bedrooms = rooms?.bedrooms ?? Math.max(1, Math.round(tb / 45));
  const bathrooms = rooms?.bathrooms ?? Math.max(1, Math.round(tb / 80));
  const kitchens = rooms?.kitchens ?? 1;
  const livingRooms = rooms?.livingRooms ?? Math.max(1, Math.round(tb / 75));
  const garages = rooms?.garages ?? 0;
  const wcs = rooms?.wcs ?? Math.max(1, Math.round(tb / 90));
  const pools = rooms?.pools ?? 0;
  const totalRooms = bedrooms + bathrooms + kitchens + livingRooms + garages + wcs + pools;
  // Référence : ~1 pièce pour 28 m² (logement tunisien type)
  const stdRooms = Math.max(3, Math.round(tb / 28));
  // Plus de pièces pour la même surface = plus de cloisons, portes & équipements
  const roomsFactor = Math.min(1.12, Math.max(0.92, 1 + (totalRooms - stdRooms) * 0.02));
  const wallFactor = Math.min(1.25, Math.max(0.8, totalRooms / Math.max(1, stdRooms)));

  const finalTotal = Math.round(finalPriceM2 * roomsFactor * tb);
  const costM2 = tb > 0 ? Math.round(finalTotal / tb) : 0;

  const keys = ["gros_oeuvre","second_oeuvre","equipements","main_oeuvre","transport","etudes_imprevus"];
  const labels = ["Gros œuvre","Second œuvre","Équipements","Main-d'œuvre","Transport","Études, permis & imprévus"];

  // Generate category budgets from percentages
  const categoryBudgets: Record<string, number> = {};
  keys.forEach((k, i) => {
    categoryBudgets[k] = Math.round(finalTotal * (pct[i] / 100));
  });
  // Adjust for rounding
  const sum = keys.reduce((s, k) => s + categoryBudgets[k], 0);
  categoryBudgets.main_oeuvre = Math.max(1, categoryBudgets.main_oeuvre - (sum - finalTotal));

  // Generate itemized lists per category
  const roomInfo = { bedrooms, bathrooms, kitchens, livingRooms, garages, wcs, pools, total: totalRooms };
  const genMap: Record<string, (s: number, f: number, c: string, b: number, r: typeof roomInfo) => any[]> = {
    gros_oeuvre: (s, f, c, b, r) => genGOItems(s, f, c, b, wallFactor),
    second_oeuvre: genSOItems,
    equipements: genEQItems,
    main_oeuvre: (s: number, f: number, c: string, b: number, r: typeof roomInfo) => genMOItems(s, f, c, b, r),
    transport: (s: number, f: number, c: string, b: number, r) => genTRItems(s, f, b, c),
    etudes_imprevus: (s: number, f: number, c: string, b: number, r) => genEIItems(finalTotal, b),
  };

  const breakdown = keys.map((k, i) => {
    const budget = categoryBudgets[k];
    const items = genMap[k](surface, floors, category, budget, roomInfo);
    const itemTotal = items.reduce((s, it) => s + it.totalPrice, 0);
    // Scale items to match budget exactly
    const scale = itemTotal > 0 ? budget / itemTotal : 1;
    const scaledItems = items.map(it => ({
      ...it,
      totalPrice: Math.round(it.totalPrice * scale),
    }));
    const finalItemTotal = scaledItems.reduce((s, it) => s + it.totalPrice, 0);
    return {
      category: k, label: labels[i],
      estimatedCost: finalItemTotal, percentage: pct[i],
      items: scaledItems,
    };
  });

  const contingencyPct = 5;
  const buffer = Math.round(finalTotal * contingencyPct / 100);
  const totalWithBuffer = finalTotal + buffer;
  const finalCostM2 = tb > 0 ? Math.round(totalWithBuffer / tb) : 0;

  // Budget scenarios using region-specific prices
  const regionForScenarios = regionCosts || null;
  const scenarioEcoPrice = regionForScenarios ? regionForScenarios.eco * projectRatio : NATIONAL_AVG.eco * projectRatio;
  const scenarioStdPrice = regionForScenarios ? regionForScenarios.std * projectRatio : NATIONAL_AVG.std * projectRatio;
  const scenarioPremiumPrice = regionForScenarios ? regionForScenarios.premium * projectRatio : NATIONAL_AVG.premium * projectRatio;
  const totalEco = Math.round(scenarioEcoPrice * tb);
  const totalPremium = Math.round(scenarioPremiumPrice * tb);
  const scenarios = {
    economique: { label:"Économique", totalCost: totalEco + Math.round(totalEco * contingencyPct / 100), costPerM2: Math.round(scenarioEcoPrice), multiplier: scenarioEcoPrice / scenarioStdPrice },
    standard: { label:"Standard", totalCost: totalWithBuffer, costPerM2: finalCostM2, multiplier: 1.0 },
    premium: { label:"Premium", totalCost: totalPremium + Math.round(totalPremium * contingencyPct / 100), costPerM2: Math.round(scenarioPremiumPrice), multiplier: scenarioPremiumPrice / scenarioStdPrice },
  };

  // Confidence index
  let confidence = 0.90;
  if (!region) confidence -= 0.05;
  if (!finishLevel) confidence -= 0.03;
  if (surface <= 0) confidence -= 0.20;
  if (surface < 30) confidence -= 0.10;
  if (!MARKET_PRICE_M2[category]) confidence -= 0.10;
  confidence = Math.max(0.3, Math.min(1.0, confidence));

  const laborTotal = breakdown[3]?.estimatedCost || 0;
  const avgWorkerCost = 55;
  const totalDays = laborTotal > 0 ? Math.round(laborTotal / avgWorkerCost) : 0;
  const avgWorkers = Math.max(1, Math.round(totalDays / 22));

  const anomalies = detectAnomalies(category, surface, floors);
  // Durée du chantier : plus de pièces = finitions & second œuvre plus longs
  const durationRoomsFactor = Math.min(1.3, Math.max(0.9, 1 + (totalRooms - stdRooms) * 0.03));
  const duration = estimateDuration(surface, floors, category, durationRoomsFactor);

  // Optimization tips with region context
  const tips = generateTips(category, surface, region, finishLevel, costM2);

  // Region impact info for UI — comparatif entre régions
  const regionLabel = region ? ({
    tunis: "Tunis", ariana: "Ariana", ben_arous: "Ben Arous", manouba: "Manouba",
    nabeul: "Nabeul", zaghouan: "Zaghouan", bizerte: "Bizerte", beja: "Béja",
    jendouba: "Jendouba", le_kef: "Le Kef", siliana: "Siliana", kairouan: "Kairouan",
    kasserine: "Kasserine", sidi_bouzid: "Sidi Bouzid", sousse: "Sousse",
    monastir: "Monastir", mahdia: "Mahdia", sfax: "Sfax", gabes: "Gabès",
    medenine: "Médenine", tataouine: "Tataouine", gafsa: "Gafsa", tozeur: "Tozeur",
    kebili: "Kébili",
  } as Record<string, string>)[region] : undefined;

  // Calcule les totaux pour chaque région (affichage comparatif)
  const regionTotals: Record<string, number> = {};
  if (region) {
    const fLevelKey = fLevel === "economique" ? "eco" : fLevel === "premium" ? "premium" : "std";
    for (const [regKey, regCost] of Object.entries(REGION_COST_M2)) {
      const regPrice = (fLevelKey === "eco" ? regCost.eco : fLevelKey === "premium" ? regCost.premium : regCost.std) * projectRatio;
      regionTotals[regKey] = Math.round(regPrice * tb) + Math.round(Math.round(regPrice * tb) * contingencyPct / 100);
    }
  }

  const regionImpact = region ? {
    region,
    regionLabel: regionLabel || region,
    basePriceM2: finalPriceM2,
    priceRange: baseRegionLabel,
    totalWithRegion: totalWithBuffer,
    totalNationalAvg: Math.round(NATIONAL_AVG[fLevel === "economique" ? "eco" : fLevel === "premium" ? "premium" : "std"] * projectRatio * tb) + buffer,
    difference: totalWithBuffer - (Math.round(NATIONAL_AVG[fLevel === "economique" ? "eco" : fLevel === "premium" ? "premium" : "std"] * projectRatio * tb) + buffer),
    regionTotals,
  } : undefined;

  return {
    costEstimate: {
      totalCost: totalWithBuffer,
      costPerSquareMeter: finalCostM2,
      currency: "TND",
      breakdown,
      contingencyBuffer: buffer,
      contingencyPercentage: contingencyPct,
      budgetScenarios: scenarios,
      // Prix moyen TTC par m² toutes régions (référence comparative)
      avgRegionPriceM2: Math.round(NATIONAL_AVG.std * projectRatio),
    },
    aiAnalysis: {
      category: CATEGORY_LABEL[category] || category,
      confidence,
      dimensions: { detected: surface > 0, estimatedArea: surface },
      features: [],
      anomalies,
      constructionMethods: getMethods(category),
      estimatedDuration: duration,
      laborEstimate: { totalWorkers: avgWorkers, totalDays, estimatedCost: laborTotal },
      rawAnalysis: "Analyse BIM basée sur les prix du marché tunisien 2026",
    },
    optimizationTips: tips,
    technicalRecommendations: generateTechRecs(category, surface, floors),
    regionImpact,
  };
}

function generateTips(cat: string, s: number, reg?: string, fLvl?: string, costM2?: number): string[] {
  const t: string[] = [];
  t.push("Privilégiez les matériaux locaux (ciment Bizerte, carrelage Kairouan, marbre Thala) pour réduire le transport.");
  if (s > 200) t.push("Pour plus de 200m², négociez des remises de 5-10% auprès des fournisseurs en gros.");
  if (cat==="maison"||cat==="villa") {
    t.push("Un plan carré est 15% plus économique qu'un plan complexe. Optimisez le ratio surface/volume.");
    t.push("Utilisez des briques alvéolaires 10cm pour les cloisons : 20% moins cher et meilleure isolation.");
  }
  if (cat==="piscine") {
    t.push("Revêtement liner plutôt que mosaïque : économie de 30% sur le budget revêtement.");
    t.push("Pompe à vitesse variable : réduit de 40% la consommation électrique.");
  }
  if (cat==="residence_touristique") {
    t.push("Pour une résidence touristique, privilégiez un mobilier résistant et une gestion locative professionnelle pour maximiser l'occupation saisonnière.");
  }
  if (cat==="projet_neuf") {
    t.push("Pour un projet neuf vendu sur plan, intégrez les frais de commercialisation et de notaire dans votre budget.");
  }
  if (cat.startsWith("renovation")) {
    t.push("Conservez les structures existantes (murs porteurs, charpente) quand c'est possible.");
    t.push("Peinture lessivable dans les pièces humides : durée de vie doublée.");
  }
  if (reg) {
    const regCost = REGION_COST_M2[reg];
    if (regCost) {
      const ecoMid = regCost.eco;
      if (ecoMid >= 1400) t.push(`Région ${reg} : prix élevés (${regCost.stdRange} TND/m²). Achetez les matériaux dans les régions intérieures pour économiser.`);
      else if (ecoMid >= 1300) t.push(`Région ${reg} : prix modérés (${regCost.stdRange} TND/m²). Comparez les fournisseurs locaux.`);
      else t.push(`Région ${reg} : prix avantageux (${regCost.stdRange} TND/m²). Idéal pour optimiser votre budget construction.`);
    }
  }
  if (costM2 && costM2 > 1800) t.push("Budget premium : envisagez un suivi par un maître d'œuvre pour optimiser les finitions.");
  t.push("Regroupez vos achats (ciment + sable + gravier) pour obtenir des remises de 5-8%.");
  return t.slice(0, 8);
}

function generateTechRecs(cat: string, s: number, fl: number): string[] {
  const r: string[] = [];
  if (fl >= 3) {
    r.push("Étude de sol G2 obligatoire pour plus de 3 étages (NT 47.01).");
    r.push("Béton dosé à 350 kg/m³ minimum pour les éléments porteurs verticaux.");
  }
  if (s > 150) {
    r.push("Prévoyez des joints de dilatation tous les 25-30 mètres.");
    r.push("Drainage périphérique (drain français) pour protéger les fondations.");
  }
  if (cat==="piscine") r.push("Utilisez des aciers galvanisés ou inox pour les parties immergées.", "Test d'étanchéité de 72 heures minimum avant mise en eau.");
  if (cat==="toiture") r.push("Pente minimale de 27% pour les tuiles canal. Isolation R ≥ 2.5 m².K/W.");
  if (cat==="installation_solaire") r.push("Orientation sud avec inclinaison de 30-35° (optimal pour la Tunisie).", "Installez un parafoudre et une mise à la terre conforme à la NF C 15-100.");
  if (cat.startsWith("renovation")) r.push("Vérifiez la présence d'amiante avant toute démolition.", "Renforcez les planchers si le changement d'usage le nécessite.");
  r.push("Norme tunisienne NT 47.01 : charge d'exploitation maison 150 kg/m², bureau 250 kg/m².");
  r.push("Prévoyez un vide sanitaire d'au moins 30 cm pour l'aération et l'isolation.");
  return r.slice(0, 8);
}
