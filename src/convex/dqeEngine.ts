// ============================================================================
// MOTEUR DQE — DEVIS QUANTITATIF ESTIMATIF (Quantitatif détaillé)
// ============================================================================
// Modèle de référence : « Modèle Google Sheets — Quantitatif détaillé »
// (maison 120 m²) — lots : Frais Préliminaires et Études · Gros œuvre ·
// Second œuvre et Finitions · Aménagements extérieurs · VRD et Raccordements.
//
// Chaque type de projet dispose de son propre découpage en lots / sous-lots.
// Les lignes du DQE reprennent la structure du modèle :
//   Lot / Sous-lot · Désignation des travaux · Description technique · Unité ·
//   Quantité · Prix unitaire · Montant · Observations
// avec :
//   Montant = Quantité × Prix unitaire
// puis sous-total par lot, total des lots, coût matériaux / main-d'œuvre /
// équipements / transport / études, coût total estimatif et coût moyen au m².
//
// Les budgets des lots sont dérivés du budget total du moteur BIM (prix du
// marché tunisien 2026 par région), puis les prix unitaires sont calés pour
// que chaque lot tombe exactement sur son sous-total (méthode identique au
// finalisateur du moteur BIM). Les prix en direct de la base materialPrices
// (lorsqu'un index est fourni) écrasent les prix de référence internes.
// ============================================================================

import { TUNISIA_2026_CATALOG } from "./materialCatalog2026";
import { resolveProjectType } from "./projectTypes";

export type DqeNature =
  | "materiaux"
  | "main_oeuvre"
  | "equipements"
  | "transport"
  | "etudes";

export interface DqeLine {
  designation: string; // Désignation des travaux
  description?: string; // Description technique
  sousLot?: string; // Sous-lot
  unit: string; // Unité
  quantity: number; // Quantité
  unitPrice: number; // Prix unitaire (TND)
  total: number; // Montant = Quantité × P.U.
  nature: DqeNature;
  observations?: string;
}

export interface DqeLot {
  id: string;
  name: string; // Lot / catégorie de travaux
  nature: DqeNature;
  subtotal: number; // Sous-total du lot
  percent: number; // % du coût total
  lines: DqeLine[];
}

export interface DqeResult {
  lots: DqeLot[];
  totals: {
    materiaux: number;
    mainOeuvre: number;
    equipements: number;
    transport: number;
    etudes: number;
    total: number;
    costPerM2: number;
  };
  referenceSurface: number;
  referenceTotal: number;
  generatedAt: number;
}

// ── Template d'une ligne du DQE ─────────────────────────────────────────────
interface LineTpl {
  d: string; // désignation
  desc?: string; // description technique
  sl?: string; // sous-lot
  u: string; // unité
  q: number; // quantité de référence (surface de référence 120 m²)
  qMode?: "area" | "fixed"; // area = proportionnelle à la surface
  up: number; // prix unitaire de référence (TND)
  n: DqeNature;
  obs?: string; // observations
}

interface LotTpl {
  id: string;
  name: string;
  nature: DqeNature;
  percent: number;
  lines: LineTpl[];
}

const REF_SURFACE = 120;

const roundQty = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);

// ── Normalisation de libellé (comparaison catalogue 2026) ──────────────────
const normKey = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/×/g, "x")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const CATALOG_BY_NAME = new Map<string, (typeof TUNISIA_2026_CATALOG)[number]>();
for (const item of TUNISIA_2026_CATALOG) {
  CATALOG_BY_NAME.set(normKey(item.name), item);
}

/** Désignations DQE → références du catalogue officiel 2026 (prix & unité). */
const DQE_TO_CATALOG: Record<string, string> = {
  "Revêtements de sol (carrelage grès cérame premier choix)": "Carrelage grès cérame 60×60 (m²)",
  "Revêtements muraux SDB/Cuisine (faïence)": "Faïence 20×30 (m²)",
  "Peinture intérieure (3 couches, finition standard)": "Peinture intérieure mate (L)",
  "Peinture extérieure (façade, monocouche acrylique)": "Peinture extérieure acrylique (L)",
  "Menuiserie intérieure (portes en bois semi-massif/stratifié)": "Porte intérieure bois pleine",
  "Menuiserie extérieure (porte d'entrée en bois massif)": "Porte d'entrée métallique",
  "Ciment CPJ 42.5": "Ciment CPJ 42.5 (sac 50 kg)",
  "Ciment CPJ 32.5": "Ciment CPJ 32.5 (sac 50 kg)",
  "Sable de construction 0/4": "Sable de construction (m³)",
  "Gravier 15/25mm": "Gravier concassé 15/25",
  "Acier à béton T12": "Acier à béton T12 (tonne)",
  "Treillis soudé ST25": "Treillis soudé ST25 (panneau)",
  "Brique creuse 10cm": "Brique creuse 10 (m²)",
  "Parpaing creux 20cm": "Parpaing creux 20 (m²)",
  "Portail d'accès (métallique, coulissant/battant manuel)": "Portail alu battant 2 vantaux",
  "Gazon en plaques": "Gazon en plaques (m²)",
  "Pavé autobloquant 6cm": "Pavé autobloquant (m²)",
  "Bordure béton 50x20": "Bordure béton préfabriquée",
  "Panneau photovoltaïque 450Wc": "Panneau photovoltaïque 450 Wc",
  // ── Nouvelles désignations enrichies (août 2026) ──
  "Isolant sous dalle (polystyrène expansé 80 mm)": "Polystyrène expansé 80 mm (m²)",
  "Prises et interrupteurs (norme NF)": "Prise 2P+T",
  "VMC (ventilation mécanique contrôlée)": "VMC",
};

/** Prix en direct (base materialPrices) indexés par libellé normalisé. */
export type DqeLivePriceMap = Map<string, { unit: string; unitPrice: number }>;

/**
 * Référence du catalogue officiel 2026 associée à une désignation du
 * « Quantitatif détaillé » (utilisée notamment pour proposer des articles
 * compatibles lors de la personnalisation d'un article).
 */
export function resolveCatalogReference(designation: string) {
  const catName = DQE_TO_CATALOG[designation] ?? designation;
  return CATALOG_BY_NAME.get(normKey(catName));
}

/** Clé de comparaison des libellés (identique au moteur DQE). */
export function normalizeDesignationKey(s: string): string {
  return normKey(s);
}

/**
 * Résout le prix unitaire d'une désignation DQE : prix en direct de la base si
 * disponible, sinon référence catalogue 2026, sinon prix interne de référence.
 */
function resolveUnitPrice(designation: string, refUp: number, live?: DqeLivePriceMap): { up: number; unit?: string } {
  if (live) {
    const catName = DQE_TO_CATALOG[designation] ?? designation;
    const liveItem = live.get(normKey(catName));
    if (liveItem && liveItem.unitPrice > 0) return { up: liveItem.unitPrice, unit: liveItem.unit };
  }
  const catName = DQE_TO_CATALOG[designation];
  const catalog = catName ? CATALOG_BY_NAME.get(normKey(catName)) : undefined;
  if (catalog) return { up: catalog.unitPrice, unit: catalog.unit };
  return { up: refUp };
}

// ════════════════════════════════════════════════════════════════════════
// GABARITS DE LOTS PAR TYPE DE PROJET
// ════════════════════════════════════════════════════════════════════════

const lot = (id: string, name: string, nature: DqeNature, percent: number, lines: LineTpl[]): LotTpl => ({
  id,
  name,
  nature,
  percent,
  lines,
});

/** Lot « Frais Préliminaires et Études » (tous les projets). */
function etudesLot(percent: number): LotTpl {
  return lot("frais_preliminaires", "Frais Préliminaires et Études", "etudes", percent, [
    { d: "Étude architecturale et permis de construire", desc: "Plans d'architecture, dossier de permis, suivi administratif.", u: "lot", q: 1, qMode: "fixed", up: 4000, n: "etudes" },
    { d: "Étude structurelle (béton armé)", desc: "Calculs de structure, plans de ferraillage, notes de calcul.", u: "lot", q: 1, qMode: "fixed", up: 3500, n: "etudes" },
    { d: "Étude des sols (géotechnique)", desc: "Sondage, essais de laboratoire, rapport géotechnique G12.", u: "lot", q: 1, qMode: "fixed", up: 2500, n: "etudes" },
    { d: "Honoraires OPC / Suivi de chantier", desc: "Ordonnancement, pilotage et coordination des travaux.", u: "lot", q: 1, qMode: "fixed", up: 4000, n: "etudes" },
  ]);
}

/** Lot « Gros œuvre » — résidentiel (modèle de référence du Google Sheets).
 * @param floors Nombre d'étages (1 = maison RDC, 2 = R+1, 3 = R+2).
 * Les quantités de structures, armatures et planchers sont proportionnelles
 * au nombre de niveaux pour refléter la réalité constructive.
 */
function grosOeuvreLot(percent: number, opts?: { toiture?: boolean; escalier?: boolean; floors?: number }): LotTpl {
  const f = opts?.floors || 1;
  // Multiplicateurs structure proportionnels aux étages :
  // fondations = ×1 (quel que soit le nb de niveaux)
  // murs, armatures, planchers = ×facteur
  const wallFactor = Math.round(100 + (f - 1) * 55) / 100;   // R+1: 1.55, R+2: 2.10
  const structFactor = Math.round(100 + (f - 1) * 60) / 100;  // R+1: 1.60, R+2: 2.20
  const slabCount = f; // 1 dalle par niveau (RDC = 1, R+1 = 2, R+2 = 3)
  const escalierUp = f === 1 ? 3500 : f === 2 ? 5500 : 7500; // escalier plus complexe pour R+1/R+2
  const escalierDesc = f === 1
    ? "1 volée droite ou quart tournant, finition brute."
    : f === 2
      ? "2 volées avec palier, béton armé, finition brute."
      : "3 volées avec paliers, béton armé, finition brute.";

  const lines: LineTpl[] = [
    { d: "Terrassement et fondations", desc: "Fouilles, remblais, radier / semelles filantes.", u: "m²", q: 120, up: 75, n: "materiaux", obs: "Selon étude de sol" },
    { d: "Soubassement et dallage", desc: "Hérisson, film polyane, isolant, dalle béton.", u: "m²", q: 120, up: 68, n: "materiaux" },
    { d: "Murs porteurs et refends", desc: "Briques 12T / 8T, parpaings, chaînages verticaux.", u: "m²", q: Math.round(120 * wallFactor), up: 120, n: "materiaux", obs: f > 1 ? `${f} niveaux — murs cumulés` : undefined },
    { d: "Poteaux, poutres et chaînages", desc: "Béton armé C25/30, acier T12, coffrage.", u: "m²", q: Math.round(120 * structFactor), up: 88, n: "materiaux", obs: f > 1 ? `${f} niveaux — structures renforcées` : undefined },
    { d: "Planchers", desc: "Dalle pleine ou corps creux (hourdis + poutrelles).", u: "m²", q: Math.round(120 * slabCount), up: 105, n: "materiaux", obs: slabCount > 1 ? `${slabCount} dalles (1 par niveau)` : undefined },
    { d: "Escalier (béton armé)", desc: escalierDesc, u: "unité", q: 1, qMode: "fixed", up: escalierUp, n: "materiaux" },
    { d: "Isolant sous dalle (polystyrène expansé 80 mm)", desc: "Film PE + polystyrène 20 kg/m³, joints bandés.", u: "m²", q: 120, up: 18, n: "materiaux" },
    { d: "Joint bitumineux d'étanchéité soubassement", desc: "Bande bitumineuse autocollante sur radier.", u: "ml", q: 45, up: 12, n: "materiaux" },
    { d: "Béton de propreté (C12/15 — 5 cm)", desc: "Dalle de propreté avant hérisson.", u: "m²", q: 120, up: 18, n: "materiaux" },
    { d: "Coffrage permanent (banchage)", desc: "Coffrage perdu pour murs porteurs en béton.", u: "m²", q: Math.round(40 * wallFactor), up: 35, n: "materiaux", obs: f > 1 ? `${f} niveaux` : undefined },
  ];
  if (opts?.toiture !== false) {
    lines.push({
      d: "Toiture (dalle inaccessible, étanchéité multicouche, protection lourde)",
      desc: "Étanchéité bicouche + gravillons, relevés, noues.",
      u: "m²", q: 120, up: 95, n: "materiaux",
    });
  }
  if (opts?.escalier === false) {
    lines.splice(5, 1);
  }
  return lot("gros_oeuvre", "Gros œuvre (fondations, structures)", "materiaux", percent, lines);
}

/** Lot « Second œuvre et Finitions » — résidentiel.
 * @param floors Nombre d'étages (1 = maison RDC, 2 = R+1, 3 = R+2).
 * Les quantités de menuiserie, peinture, garde-corps et finitions
 * d'escalier sont proportionnelles au nombre de niveaux.
 */
function secondOeuvreLot(percent: number, floors?: number): LotTpl {
  const f = floors || 1;
  // Portes intérieures : ~3 par niveau (chambres + SDB + cuisine)
  const doorCount = f === 1 ? 6 : f === 2 ? 9 : 12;
  // Surface de peinture intérieure ≈ surface murale × nb niveaux
  const paintSurf = Math.round(300 * (1 + (f - 1) * 0.55));
  // Enduits intérieurs proportionnels aux murs cumulés
  const enduitSurf = Math.round(300 * (1 + (f - 1) * 0.55));
  // Garde-corps escalier + balcons
  const gardeCorps = f === 1 ? 10 : f === 2 ? 18 : 25;
  const gardeCorpsDesc = f === 1
    ? "Main courante, garde-corps balcons."
    : `Main courante + garde-corps escalier ${f} niveaux et balcons.`;
  // Finition escalier
  const escalierFinition = f === 1 ? 800 : f === 2 ? 1500 : 2200;
  const escalierFinitionDesc = f === 1
    ? "Revêtement sol escalier (pierre ou carrelage)."
    : `Revêtement sol escalier ${f} volées (pierre ou carrelage).`;
  // Peinture extérieure proportionnelle à la façade
  const paintExtSurf = f === 1 ? 80 : f === 2 ? 130 : 180;

  return lot("second_oeuvre", "Second œuvre et finitions", "materiaux", percent, [
    { d: "Enduits intérieurs (ciment, plâtre)", desc: "Enduit au mortier puis enduit de lissage.", u: "m²", q: enduitSurf, up: 16, n: "materiaux", obs: f > 1 ? `${f} niveaux` : undefined },
    { d: "Revêtements de sol (carrelage grès cérame premier choix)", desc: "Pose collée, joints, plinthes.", u: "m²", q: 120, up: 45, n: "materiaux" },
    { d: "Revêtements muraux SDB/Cuisine (faïence)", desc: "Faïence 20×30 sur zones humides.", u: "m²", q: 40, up: 40, n: "materiaux" },
    { d: "Menuiserie extérieure (fenêtres et portes-fenêtres PVC double vitrage)", desc: "Fourniture et pose, seuils, habillages.", u: "m²", q: 15, up: 620, n: "materiaux" },
    { d: "Menuiserie extérieure (porte d'entrée en bois massif)", desc: "Porte blindée + serrure multipoints.", u: "unité", q: 1, qMode: "fixed", up: 1200, n: "materiaux" },
    { d: "Menuiserie intérieure (portes en bois semi-massif/stratifié)", desc: "Blocs-portes avec paumelles et poignées.", u: "unité", q: doorCount, qMode: "fixed", up: 450, n: "materiaux", obs: `${doorCount} portes (${f} niveau${f > 1 ? 'x' : ''})` },
    { d: "Peinture intérieure (3 couches, finition standard)", desc: "Sous-couche + 2 couches de finition.", u: "m²", q: paintSurf, up: 8, n: "materiaux", obs: f > 1 ? `${f} niveaux` : undefined },
    { d: "Peinture extérieure (façade, monocouche acrylique)", desc: "Impression puis monocouche acrylique.", u: "m²", q: paintExtSurf, up: 12, n: "materiaux", obs: f > 1 ? `Façade ${f} niveaux` : undefined },
    { d: "Plomberie sanitaire", desc: "Alimentation, évacuation, chauffe-eau, appareils inclus.", u: "lot", q: 1, qMode: "fixed", up: 14000, n: "equipements" },
    { d: "Électricité", desc: "Installation complète : tableaux, prises, interrupteurs, luminaires basiques.", u: "lot", q: 1, qMode: "fixed", up: 16000, n: "equipements" },
    { d: "Climatisation (pré-installation)", desc: "Gaines, réservations et support de groupe.", u: "lot", q: 1, qMode: "fixed", up: 2500, n: "equipements" },
    { d: "Cuisine équipée", desc: "Meubles hauts et bas, plan de travail, évier.", u: "lot", q: 1, qMode: "fixed", up: 9000, n: "equipements" },
    { d: "Garde-corps (balcons/escalier, fer forgé/inox)", desc: gardeCorpsDesc, u: "ml", q: gardeCorps, up: 150, n: "materiaux" },
    { d: "Finition escalier", desc: escalierFinitionDesc, u: "unité", q: 1, qMode: "fixed", up: escalierFinition, n: "materiaux" },
    { d: "Faux plafonds (plaque de plâtre)", desc: "Ossature métallique + BA13 + joints.", u: "m²", q: 50, up: 45, n: "materiaux" },
    { d: "Luminaires intérieurs (LED encastrés)", desc: "Spots LED encastrés + appliques.", u: "unité", q: 12, up: 45, n: "equipements", obs: f > 1 ? `${12 + (f-1)*4} points` : undefined },
    { d: "Prises et interrupteurs (norme NF)", desc: "Prises 2P+T, interrupteurs, va-et-vient.", u: "unité", q: 25, up: 18, n: "equipements", obs: f > 1 ? `${25 + (f-1)*8} points` : undefined },
    { d: "Miroir et accessoires SDB", desc: "Miroir, porte-serviettes, patère, range-médicaments.", u: "lot", q: 1, qMode: "fixed", up: 350, n: "materiaux" },
    { d: "Seuils de portes (marbre ou granit)", desc: "Seuils 90 cm en pierre naturelle.", u: "unité", q: doorCount, qMode: "fixed", up: 45, n: "materiaux", obs: `${doorCount} seuils` },
    { d: "Joints silicone sanitaire", desc: "Joints d'étanchéité SDB, cuisine, fenêtres.", u: "lot", q: 1, qMode: "fixed", up: 120, n: "materiaux" },
    { d: "VMC (ventilation mécanique contrôlée)", desc: "Extracteur hygroréglable + gaine + grille.", u: "lot", q: 1, qMode: "fixed", up: 650, n: "equipements" },
    { d: "Couloirs et circulations (peinture + plinthes)", desc: "Peinture + plinthes PVC sur circulations.", u: "ml", q: f === 1 ? 12 : f === 2 ? 18 : 24, up: 35, n: "materiaux", obs: f > 1 ? `${f} niveaux` : undefined },
  ]);
}

/** Lot « Aménagements extérieurs ». */
function amenagementsLot(percent: number): LotTpl {
  return lot("amenagements_exterieurs", "Aménagements extérieurs", "materiaux", percent, [
    { d: "Clôture (muret bas + grillage rigide)", desc: "Muret en parpaings + grillage rigide sur poteaux.", u: "ml", q: 50, up: 130, n: "materiaux" },
    { d: "Portail d'accès (métallique, coulissant/battant manuel)", desc: "Portail 2 vantaux avec motorisation.", u: "unité", q: 1, qMode: "fixed", up: 2500, n: "materiaux" },
    { d: "Portillon piéton (métallique)", desc: "Portillon 1 vantail + paumelles renforcées.", u: "unité", q: 1, qMode: "fixed", up: 800, n: "materiaux" },
    { d: "Allées et terrasses (dalles/pavés extérieurs)", desc: "Pavés autobloquants sur lit de sable.", u: "m²", q: 30, up: 80, n: "materiaux" },
    { d: "Plantation et gazon (terrain 200 m²)", desc: "Préparation sol, gazon en plaques, arbustes.", u: "m²", q: 80, up: 25, n: "materiaux" },
    { d: "Éclairage extérieur (LED solaire)", desc: "Bornes solaires, bandeau LED terrasse.", u: "lot", q: 1, qMode: "fixed", up: 900, n: "equipements" },
    { d: "Drainage périphérique", desc: "Fossette, grilles, réseau pluvial à proximité.", u: "ml", q: 30, up: 35, n: "materiaux" },
  ]);
}

/** Lot « VRD (Voirie et Réseaux Divers) et Raccordements ». */
function vrdLot(percent: number): LotTpl {
  return lot("vrd", "Transports & autres", "transport", percent, [
    { d: "Raccordement Eau Potable (SONEDE)", desc: "Dossier, tranchée, compteur.", u: "lot", q: 1, qMode: "fixed", up: 900, n: "transport" },
    { d: "Raccordement Électricité (STEG)", desc: "Dossier, tranchée, compteur.", u: "lot", q: 1, qMode: "fixed", up: 1200, n: "transport" },
    { d: "Raccordement Assainissement (ONAS)", desc: "Dossier, branchement, regards.", u: "lot", q: 1, qMode: "fixed", up: 1000, n: "transport" },
    { d: "Fosse septique et épandage", desc: "Fosse toutes eaux + lit d'épandage (si non raccordé ONAS).", u: "lot", q: 1, qMode: "fixed", up: 3500, n: "transport", obs: "Si non raccordé ONAS" },
    { d: "Téléphone / Internet (TT)", desc: "Dossier et raccordement fibre/ADSL.", u: "lot", q: 1, qMode: "fixed", up: 400, n: "transport" },
    { d: "Raccordement gaz (TGM)", desc: "Dossier, tranchée, compteur, régulation.", u: "lot", q: 1, qMode: "fixed", up: 1500, n: "transport", obs: "Si gaz disponible" },
    { d: "Réseau pluvial (tuyauterie PVC Ø200)", desc: "Canalisation, regards de visite.", u: "ml", q: 20, up: 45, n: "transport" },
    { d: "Bornes de délimitation de terrain", desc: "Bornes béton ou métal, peinture signalétique.", u: "unité", q: 4, qMode: "fixed", up: 80, n: "transport" },
  ]);
}

// ── Résidentiel : gabarit 5 lots du modèle de référence ─────────────────────
function residentialLots(cat: string, floors?: number): LotTpl[] {
  const pct: Record<string, [number, number, number, number, number]> = {
    maison: [5.6, 47.7, 39.1, 5.3, 2.3],
    villa: [5, 44, 42, 6.5, 2.5],
    appartement: [4, 42, 45, 5.5, 3.5],
    studio: [4, 40, 46, 6, 4],
    duplex: [4.5, 44, 43, 5.5, 3],
    immeuble: [4.5, 52, 35, 5, 3.5],
    residence_touristique: [5, 42, 42, 7, 4],
    projet_neuf: [4.5, 52, 35, 5, 3.5],
    immeuble_residentiel: [4.5, 52, 35, 5, 3.5],
    maison_hote: [5, 42, 42, 7, 4],
  };
  const [pe, pgo, pso, pam, pvrd] = pct[cat] ?? pct.maison;
  return [
    etudesLot(pe),
    grosOeuvreLot(pgo, { floors }),
    secondOeuvreLot(pso, floors),
    amenagementsLot(pam),
    vrdLot(pvrd),
  ];
}

// ── Rénovation complète ─────────────────────────────────────────────────────
function renovationCompleteLots(): LotTpl[] {
  return [
    etudesLot(5),
    lot("depose_demolition", "Dépose et démolition", "main_oeuvre", 8, [
      { d: "Dépose des revêtements et menuiseries existants", desc: "Carrelage, faïence, portes, fenêtres, faux plafonds.", u: "m²", q: 120, up: 18, n: "main_oeuvre" },
      { d: "Démolition des cloisons et doublages", desc: "Cloisons non porteuses, évacuation des gravats.", u: "m³", q: 18, up: 45, n: "main_oeuvre" },
      { d: "Dépose sanitaire et électrique", desc: "WC, lavabos, radiateurs, tableaux, câblages.", u: "lot", q: 1, qMode: "fixed", up: 1500, n: "main_oeuvre" },
      { d: "Évacuation des gravats", desc: "Location benne 8 m³ et transport.", u: "bennes", q: 4, up: 200, n: "transport" },
    ]),
    lot("gros_oeuvre", "Gros œuvre — reprises et réparations", "materiaux", 20, [
      { d: "Reprise des murs et enduits", desc: "Rebouchage, arase, enduit de réparation.", u: "m²", q: 120, up: 22, n: "materiaux" },
      { d: "Réparation des planchers et dalles", desc: "Ragréage, traitement fissures, chape.", u: "m²", q: 120, up: 28, n: "materiaux" },
      { d: "Ciment CPJ 42.5", desc: "Mortiers et réparations.", u: "sacs", q: 120, up: 16.5, n: "materiaux" },
      { d: "Sable de construction 0/4", desc: "Mortiers et chapes.", u: "m³", q: 10, up: 45, n: "materiaux" },
      { d: "Étanchéité des parties humides", desc: "Traitement SDB, cuisines et toitures.", u: "m²", q: 40, up: 25, n: "materiaux" },
    ]),
    lot("second_oeuvre", "Second œuvre et finitions", "materiaux", 42, [
      { d: "Revêtements de sol (carrelage grès cérame premier choix)", desc: "Pose collée, joints, plinthes.", u: "m²", q: 120, up: 45, n: "materiaux" },
      { d: "Revêtements muraux SDB/Cuisine (faïence)", desc: "Faïence 20×30.", u: "m²", q: 40, up: 40, n: "materiaux" },
      { d: "Menuiserie extérieure (fenêtres PVC double vitrage)", desc: "Fourniture et pose.", u: "m²", q: 15, up: 620, n: "materiaux" },
      { d: "Menuiserie intérieure (portes)", desc: "Blocs-portes neufs.", u: "unité", q: 6, qMode: "fixed", up: 450, n: "materiaux" },
      { d: "Peinture intérieure (3 couches)", desc: "Sous-couche + finition.", u: "m²", q: 300, up: 8, n: "materiaux" },
      { d: "Faux plafonds (plaque de plâtre)", desc: "Ossature + BA13.", u: "m²", q: 50, up: 45, n: "materiaux" },
      { d: "Plomberie sanitaire", desc: "Alimentation, évacuation, chauffe-eau.", u: "lot", q: 1, qMode: "fixed", up: 9000, n: "equipements" },
      { d: "Électricité", desc: "Mise aux normes, tableaux, points lumineux.", u: "lot", q: 1, qMode: "fixed", up: 11000, n: "equipements" },
    ]),
    lot("equipements", "Équipements techniques", "equipements", 20, [
      { d: "Cuisine équipée", desc: "Meubles hauts et bas, plan de travail, évier.", u: "lot", q: 1, qMode: "fixed", up: 8000, n: "equipements" },
      { d: "Sanitaires neufs", desc: "WC, lavabos, robinetterie.", u: "lot", q: 1, qMode: "fixed", up: 3500, n: "equipements" },
      { d: "Chauffe-eau électrique 80L", desc: "Fourniture et pose.", u: "unité", q: 1, qMode: "fixed", up: 480, n: "equipements" },
      { d: "Climatisation (pré-installation)", desc: "Gaines et réservations.", u: "lot", q: 1, qMode: "fixed", up: 2000, n: "equipements" },
    ]),
    lot("nettoyage_finition", "Nettoyage et finition", "main_oeuvre", 5, [
      { d: "Nettoyage fin de chantier", desc: "Nettoyage complet, enlèvement des déchets.", u: "m²", q: 120, up: 6, n: "main_oeuvre" },
      { d: "Retouches et livraison", desc: "Retouches peinture, réglages, remise des clés.", u: "lot", q: 1, qMode: "fixed", up: 800, n: "main_oeuvre" },
    ]),
  ];
}

// ── Rénovation Cuisine ──────────────────────────────────────────────────────
/**
 * Gabarit « Rénovation Cuisine » — MÊME structure et MÊMES mécanismes de
 * calcul que les autres types de projet de la plateforme : quatre sections
 * (Frais Préliminaires et Études · Gros œuvre · Second œuvre et finitions ·
 * Aménagements extérieurs), mêmes unités, sous-total par section et
 * Montant = Quantité × Prix unitaire.
 *
 * Les quatre identifiants de section sont ceux de `EDITABLE_LOT_IDS`
 * (`quantitatifCustomLogic`) : le quantitatif de ce type est donc
 * personnalisable exactement comme celui d'un projet neuf — superposition du
 * scénario « Personnalisé », aide à la décision, DQE et rapport PDF inclus.
 *
 * Spécificités d'une rénovation (aucun poste de construction neuve) :
 *   • la section « Gros œuvre » ne contient QUE des travaux de rénovation
 *     (dépose, évacuation des gravats, reprises de cloisons et de maçonnerie) :
 *     ni fondations, ni structure béton armé, ni plancher, ni permis de
 *     construire, ni étude géotechnique — ces postes ne sont pas applicables ;
 *   • la section « Aménagements extérieurs » est conservée pour respecter la
 *     structure commune de la plateforme, mais reste VIDE et à 0 % du budget :
 *     une rénovation de cuisine standard n'engendre aucun aménagement
 *     extérieur, donc aucun montant n'est facturé à ce titre.
 *
 * Quantités de référence : elles suivent la convention du moteur (surface de
 * référence 120 m², `quantity = référence × surface / 120`) et sont exprimées
 * pour qu'une cuisine courante (≈ 10-20 m² saisie) affiche des quantités
 * physiques réalistes (« 3 ml » de meubles, « 12 m² » de sol…). Les montants
 * restent ceux des budgets de section : aucune quantité n'est extrapolée.
 */
function renovationCuisineLots(): LotTpl[] {
  return [
    // ── A. Frais préliminaires et études ──
    lot("frais_preliminaires", "Frais Préliminaires et Études", "etudes", 5, [
      { d: "Visite et diagnostic de l'existant", desc: "Relevé sur site, contrôle des réseaux et des supports avant travaux.", sl: "Préliminaires", u: "forfait", q: 1, qMode: "fixed", up: 350, n: "etudes" },
      { d: "Protection des zones conservées", desc: "Bâchage et protection des sols, murs et éléments conservés.", sl: "Préliminaires", u: "m²", q: 150, up: 6, n: "main_oeuvre" },
      { d: "Préparation et organisation du chantier", desc: "Installation de chantier, protection des accès, tri et évacuation des emballages.", sl: "Préliminaires", u: "forfait", q: 1, qMode: "fixed", up: 450, n: "main_oeuvre" },
      { d: "Prestations complémentaires (relevé de cotes, plans de cuisine)", desc: "Plans d'implantation et d'élévation, calepinage de la cuisine.", sl: "Études complémentaires", u: "forfait", q: 1, qMode: "fixed", up: 400, n: "etudes", obs: "Selon nécessité du projet" },
    ]),
    // ── B. Gros œuvre — dépose, évacuation et reprises uniquement ──
    lot("gros_oeuvre", "Gros œuvre", "materiaux", 15, [
      { d: "Dépose de la cuisine existante", desc: "Meubles, plan de travail, évier, appareils, revêtements muraux.", sl: "Dépose et démolition", u: "lot", q: 1, qMode: "fixed", up: 600, n: "main_oeuvre" },
      { d: "Démolition des revêtements et doublages", desc: "Piquage du carrelage et de la faïence existants.", sl: "Dépose et démolition", u: "m²", q: 200, up: 18, n: "main_oeuvre" },
      { d: "Modification des cloisons ou ouvertures", desc: "Création ou suppression de cloison, reprise d'ouverture et linteau.", sl: "Cloisons et ouvertures", u: "ml", q: 30, up: 85, n: "materiaux", obs: "Selon nécessité du projet" },
      { d: "Évacuation des gravats", desc: "Benne et transport vers décharge agréée.", sl: "Évacuation des gravats", u: "bennes", q: 20, up: 200, n: "transport" },
      { d: "Reprise des murs et enduits", desc: "Mise à niveau, rebouchage, enduit de lissage.", sl: "Reprises de maçonnerie", u: "m²", q: 200, up: 20, n: "materiaux" },
      { d: "Ragréage du sol", desc: "Chape de ragréage autolissante.", sl: "Reprises de maçonnerie", u: "m²", q: 120, up: 25, n: "materiaux" },
    ]),
    // ── C. Second œuvre et finitions ──
    lot("second_oeuvre", "Second œuvre et finitions", "materiaux", 80, [
      { d: "Alimentation eau (PER/PER-AL)", desc: "Réseau neuf vers évier et lave-vaisselle.", sl: "Plomberie de cuisine", u: "ml", q: 120, up: 8, n: "equipements" },
      { d: "Évacuation (PVC Ø40/Ø50)", desc: "Évacuation évier, lave-vaisselle, siphon.", sl: "Plomberie de cuisine", u: "ml", q: 80, up: 12, n: "equipements" },
      { d: "Arrivées et robinets d'arrêt", desc: "Robinets d'arrêt encastrés.", sl: "Plomberie de cuisine", u: "unité", q: 3, qMode: "fixed", up: 60, n: "equipements" },
      { d: "Points électriques cuisine", desc: "Prises dédiées, éclairage sous meubles, hotte.", sl: "Électricité", u: "points", q: 80, up: 90, n: "equipements" },
      { d: "Câblage et gaines", desc: "Câble 3×2.5 mm², gaines ICTA.", sl: "Électricité", u: "ml", q: 200, up: 6, n: "equipements" },
      { d: "Revêtement de sol (carrelage grès cérame)", desc: "Pose collée, joints.", sl: "Sols", u: "m²", q: 120, up: 45, n: "materiaux" },
      { d: "Faïence murale (20×30)", desc: "Faïence (crédence) jusqu'à 60 cm au-dessus du plan.", sl: "Murs et crédence", u: "m²", q: 200, up: 40, n: "materiaux" },
      { d: "Peinture des murs et plafonds", desc: "2 couches finition lessivable.", sl: "Murs et crédence", u: "m²", q: 200, up: 8, n: "materiaux" },
      { d: "Meubles hauts et bas", desc: "Cuisine équipée sur mesure ou standard.", sl: "Mobilier de cuisine", u: "ml", q: 30, up: 650, n: "equipements" },
      { d: "Hotte aspirante", desc: "Hotte 60 cm avec évacuation.", sl: "Mobilier de cuisine", u: "unité", q: 1, qMode: "fixed", up: 350, n: "equipements" },
      { d: "Plan de travail (stratifié ou quartz)", desc: "Découpe évier, retour mural.", sl: "Plan de travail et crédence", u: "ml", q: 30, up: 450, n: "materiaux" },
      { d: "Évier inox 1 bac + égouttoir", desc: "Fourniture et pose.", sl: "Évier et robinetterie", u: "unité", q: 1, qMode: "fixed", up: 350, n: "equipements" },
      { d: "Robinetterie évier", desc: "Mitigeur col de cygne.", sl: "Évier et robinetterie", u: "unité", q: 1, qMode: "fixed", up: 180, n: "equipements" },
      { d: "Four / table de cuisson / réfrigérateur", desc: "Fourniture des appareils encastrés.", sl: "Équipements intégrés", u: "lot", q: 1, qMode: "fixed", up: 3500, n: "equipements" },
      { d: "Raccordements des équipements intégrés", desc: "Branchements eau, électricité et évacuation des appareils encastrés.", sl: "Équipements intégrés", u: "unité", q: 3, qMode: "fixed", up: 65, n: "equipements" },
    ]),
    // ── D. Aménagements extérieurs — section conservée, aucune dépense ──
    lot("amenagements_exterieurs", "Aménagements extérieurs", "materiaux", 0, []),
  ];
}

// ── Rénovation salle de bain ────────────────────────────────────────────────
function renovationSdbLots(): LotTpl[] {
  return [
    lot("depose", "Dépose et démolition", "main_oeuvre", 8, [
      { d: "Dépose sanitaires et robinetterie", desc: "WC, lavabo, douche, miroir, accessoires.", u: "lot", q: 1, qMode: "fixed", up: 500, n: "main_oeuvre" },
      { d: "Démolition carrelage et faïence", desc: "Piquage des revêtements existants.", u: "m²", q: 20, up: 20, n: "main_oeuvre" },
      { d: "Évacuation des gravats", desc: "Benne et transport.", u: "bennes", q: 2, up: 200, n: "transport" },
    ]),
    lot("plomberie", "Plomberie", "equipements", 15, [
      { d: "Alimentation eau (PER)", desc: "Réseau neuf vers douche, lavabo, WC.", u: "ml", q: 15, up: 8, n: "equipements" },
      { d: "Évacuation (PVC Ø50/Ø100)", desc: "Évacuation douche, lavabo, WC.", u: "ml", q: 10, up: 14, n: "equipements" },
      { d: "Collecteur et robinets d'arrêt", desc: "Collecteur simple + arrêts.", u: "lot", q: 1, qMode: "fixed", up: 250, n: "equipements" },
    ]),
    lot("etancheite", "Étanchéité", "materiaux", 8, [
      { d: "Étanchéité liquide (sol et murs)", desc: "Membrane liquide sur zones humides.", u: "m²", q: 20, up: 30, n: "materiaux" },
    ]),
    lot("carrelage", "Carrelage et faïence", "materiaux", 22, [
      { d: "Carrelage sol (grès cérame antidérapant)", desc: "Pose collée, pente vers siphon.", u: "m²", q: 6, up: 50, n: "materiaux" },
      { d: "Faïence murale (20×30)", desc: "Faïence complète des murs.", u: "m²", q: 22, up: 40, n: "materiaux" },
      { d: "Ragréage et chape de pente", desc: "Préparation du support.", u: "m²", q: 6, up: 25, n: "materiaux" },
    ]),
    lot("sanitaires", "Sanitaires", "equipements", 15, [
      { d: "WC à l'anglaise complet", desc: "Réservoir, abattant, fixation.", u: "unité", q: 1, qMode: "fixed", up: 280, n: "equipements" },
      { d: "Lavabo vasque + meuble", desc: "Vasque, meuble, siphon.", u: "unité", q: 1, qMode: "fixed", up: 450, n: "equipements" },
      { d: "Receveur de douche 90×90", desc: "Receveur + paroi de douche.", u: "unité", q: 1, qMode: "fixed", up: 500, n: "equipements" },
    ]),
    lot("robinetterie", "Robinetterie", "equipements", 8, [
      { d: "Mitigeur douche + pommeau", desc: "Colonne de douche.", u: "unité", q: 1, qMode: "fixed", up: 300, n: "equipements" },
      { d: "Mitigeur lavabo", desc: "Mitigeur encastré ou apparent.", u: "unité", q: 1, qMode: "fixed", up: 150, n: "equipements" },
      { d: "Accessoires SDB", desc: "Porte-serviettes, porte-savon, miroir.", u: "lot", q: 1, qMode: "fixed", up: 200, n: "equipements" },
    ]),
    lot("electricite", "Électricité", "equipements", 8, [
      { d: "Points électriques SDB", desc: "Éclairage, prise rasoir, VMC.", u: "points", q: 4, up: 90, n: "equipements" },
    ]),
    lot("ventilation", "Ventilation", "equipements", 4, [
      { d: "VMC simple flux", desc: "Extracteur + gaine.", u: "unité", q: 1, qMode: "fixed", up: 250, n: "equipements" },
    ]),
    lot("peinture", "Peinture", "materiaux", 4, [
      { d: "Peinture des murs et plafonds", desc: "2 couches finition lessivable.", u: "m²", q: 30, up: 8, n: "materiaux" },
    ]),
    lot("equipements", "Équipements techniques", "equipements", 8, [
      { d: "Chauffe-eau électrique 80L", desc: "Fourniture et pose.", u: "unité", q: 1, qMode: "fixed", up: 480, n: "equipements" },
    ]),
  ];
}

// ── Peinture intérieure ─────────────────────────────────────────────────────
function peintureLots(): LotTpl[] {
  return [
    lot("preparation", "Préparation et protection", "materiaux", 15, [
      { d: "Protection des sols et mobiliers", desc: "Bâchage, adhésifs, protections.", u: "lot", q: 1, qMode: "fixed", up: 400, n: "materiaux" },
      { d: "Enduit de lissage", desc: "Rebouchage, lissage des murs et plafonds.", u: "kg", q: 150, up: 1.2, n: "materiaux" },
      { d: "Sous-couche", desc: "Impression / sous-couche acrylique.", u: "litres", q: 20, up: 18, n: "materiaux" },
    ]),
    lot("peinture", "Peinture murs et plafonds", "materiaux", 60, [
      { d: "Peinture intérieure (2 couches finition)", desc: "Peinture mate lessivable murs et plafonds.", u: "litres", q: 60, up: 22, n: "materiaux" },
      { d: "Peinture des menuiseries intérieures", desc: "Portes, encadrements, radiateurs.", u: "m²", q: 25, up: 12, n: "materiaux" },
    ]),
    lot("finition", "Finitions", "main_oeuvre", 20, [
      { d: "Main-d'œuvre peintre", desc: "Préparation, application, finitions.", u: "m²", q: 300, up: 8, n: "main_oeuvre" },
    ]),
    lot("nettoyage", "Nettoyage", "main_oeuvre", 5, [
      { d: "Nettoyage de finition", desc: "Nettoyage complet après travaux.", u: "lot", q: 1, qMode: "fixed", up: 300, n: "main_oeuvre" },
    ]),
  ];
}

// ── Piscine béton ───────────────────────────────────────────────────────────
function piscineBetonLots(): LotTpl[] {
  return [
    etudesLot(5),
    lot("terrassement", "Terrassement", "materiaux", 10, [
      { d: "Terrassement et excavation piscine", desc: "Fouille en pleine masse, talutage.", u: "m³", q: 96, up: 25, n: "materiaux" },
      { d: "Évacuation des terres", desc: "Bennes et transport.", u: "bennes", q: 12, up: 200, n: "transport" },
      { d: "Béton de propreté", desc: "Dosé à 150 kg/m³.", u: "m³", q: 8, up: 90, n: "materiaux" },
    ]),
    lot("structure", "Structure béton armé", "materiaux", 35, [
      { d: "Béton armé coque C25/30", desc: "Parois et fond de bassin.", u: "m³", q: 28, up: 265, n: "materiaux" },
      { d: "Acier à béton T12", desc: "Armatures des parois.", u: "tonnes", q: 1.4, up: 3850, n: "materiaux" },
      { d: "Treillis soudé ST25", desc: "Armatures de répartition.", u: "m²", q: 90, up: 15, n: "materiaux" },
      { d: "Bois de coffrage", desc: "Coffrage des parois et margelles.", u: "m³", q: 2.5, up: 720, n: "materiaux" },
      { d: "Ciment CPJ 42.5", desc: "Mortiers et reprises.", u: "sacs", q: 120, up: 16.5, n: "materiaux" },
      { d: "Sable de construction 0/4", desc: "Sable de remblai et mortiers.", u: "m³", q: 12, up: 45, n: "materiaux" },
    ]),
    lot("etancheite", "Étanchéité et revêtement", "materiaux", 18, [
      { d: "Étanchéité enduit piscine hydrofuge", desc: "Enduit ciment hydrofuge + peinture piscine.", u: "m²", q: 120, up: 30, n: "materiaux" },
      { d: "Carrelage piscine / mosaïque", desc: "Revêtement du bassin.", u: "m²", q: 90, up: 60, n: "materiaux" },
      { d: "Margelles piscine (granito / pierre)", desc: "Pourtour du bassin.", u: "ml", q: 24, up: 45, n: "materiaux" },
    ]),
    lot("filtration", "Filtration et hydraulique", "equipements", 12, [
      { d: "Pompe de filtration + filtre à sable", desc: "Local technique.", u: "forfait", q: 1, qMode: "fixed", up: 1800, n: "equipements" },
      { d: "Skimmer + buses de refoulement", desc: "Balancing + buse de fond.", u: "forfait", q: 1, qMode: "fixed", up: 400, n: "equipements" },
      { d: "Canalisations PVC Ø50/Ø110", desc: "Réseau hydraulique complet.", u: "ml", q: 30, up: 18, n: "equipements" },
    ]),
    lot("electricite", "Électricité", "equipements", 5, [
      { d: "Projecteurs LED piscine", desc: "Projecteurs subaquatiques 12V.", u: "unités", q: 2, up: 250, n: "equipements" },
      { d: "Câblage et tableau dédié", desc: "Alimentation filtration + éclairage.", u: "lot", q: 1, qMode: "fixed", up: 800, n: "equipements" },
    ]),
    lot("amenagements", "Margelles, plage et abords", "materiaux", 12, [
      { d: "Plage périphérique (carrelage antidérapant)", desc: "Dalle ou carrelage extérieur.", u: "m²", q: 40, up: 45, n: "materiaux" },
      { d: "Escalier inox + main courante", desc: "Accès sécurisé au bassin.", u: "unité", q: 1, qMode: "fixed", up: 600, n: "materiaux" },
    ]),
    lot("main_oeuvre", "Main-d'œuvre", "main_oeuvre", 3, [
      { d: "Main-d'œuvre spécialisée", desc: "Piscinier, terrassier, ferronnier.", u: "jours", q: 20, up: 80, n: "main_oeuvre" },
    ]),
  ];
}

// ── Piscine coque ───────────────────────────────────────────────────────────
function piscineCoqueLots(): LotTpl[] {
  return [
    etudesLot(4),
    lot("terrassement", "Terrassement", "materiaux", 12, [
      { d: "Terrassement et excavation", desc: "Fouille adaptée à la coque.", u: "m³", q: 80, up: 25, n: "materiaux" },
      { d: "Évacuation des terres", desc: "Bennes et transport.", u: "bennes", q: 10, up: 200, n: "transport" },
      { d: "Lit de sable de pose", desc: "Assise de la coque.", u: "m³", q: 8, up: 45, n: "materiaux" },
    ]),
    lot("coque", "Coque préfabriquée", "materiaux", 42, [
      { d: "Coque polyester / fibre de verre", desc: "Coque monobloc avec escalier intégré.", u: "unité", q: 1, qMode: "fixed", up: 15000, n: "materiaux" },
      { d: "Remblai latéral", desc: "Remblai stabilisé autour de la coque.", u: "m³", q: 20, up: 40, n: "materiaux" },
      { d: "Mise à niveau et réglage", desc: "Réglage laser, ancrage.", u: "lot", q: 1, qMode: "fixed", up: 800, n: "main_oeuvre" },
    ]),
    lot("filtration", "Filtration et raccordements", "equipements", 12, [
      { d: "Pompe de filtration + filtre", desc: "Filtration à sable.", u: "forfait", q: 1, qMode: "fixed", up: 1500, n: "equipements" },
      { d: "Skimmer et buses", desc: "Équipements hydrauliques coque.", u: "forfait", q: 1, qMode: "fixed", up: 350, n: "equipements" },
      { d: "Canalisations PVC", desc: "Réseau hydraulique.", u: "ml", q: 25, up: 18, n: "equipements" },
    ]),
    lot("electricite", "Électricité", "equipements", 5, [
      { d: "Projecteurs LED piscine", desc: "Projecteurs subaquatiques.", u: "unités", q: 2, up: 250, n: "equipements" },
      { d: "Câblage et tableau dédié", desc: "Alimentation filtration + éclairage.", u: "lot", q: 1, qMode: "fixed", up: 700, n: "equipements" },
    ]),
    lot("amenagements", "Margelles, plage et abords", "materiaux", 12, [
      { d: "Margelles piscine", desc: "Pourtour du bassin.", u: "ml", q: 24, up: 45, n: "materiaux" },
      { d: "Plage périphérique", desc: "Carrelage extérieur antidérapant.", u: "m²", q: 40, up: 45, n: "materiaux" },
    ]),
    lot("main_oeuvre", "Main-d'œuvre", "main_oeuvre", 13, [
      { d: "Pose de la coque", desc: "Levage, mise en place, raccordements.", u: "jours", q: 6, up: 120, n: "main_oeuvre" },
      { d: "Terrassier / manœuvre", desc: "Excavation et remblais.", u: "jours", q: 10, up: 60, n: "main_oeuvre" },
    ]),
  ];
}

// ── Garage ──────────────────────────────────────────────────────────────────
function garageLots(): LotTpl[] {
  return [
    etudesLot(4),
    lot("terrassement", "Terrassement", "materiaux", 8, [
      { d: "Terrassement et fondations", desc: "Fouilles, semelles filantes.", u: "m²", q: 120, up: 40, n: "materiaux" },
      { d: "Dalle béton (hérisson + dalle)", desc: "Dalle 15 cm armée.", u: "m²", q: 120, up: 55, n: "materiaux" },
    ]),
    lot("gros_oeuvre", "Gros œuvre", "materiaux", 42, [
      { d: "Murs porteurs (parpaings 20cm)", desc: "Murs périphériques + chaînages.", u: "m²", q: 120, up: 85, n: "materiaux" },
      { d: "Poteaux, poutres et chaînages", desc: "Béton armé C25/30.", u: "m²", q: 120, up: 60, n: "materiaux" },
      { d: "Ciment CPJ 42.5", desc: "Mortiers et béton.", u: "sacs", q: 150, up: 16.5, n: "materiaux" },
      { d: "Sable et gravier", desc: "Granulats.", u: "m³", q: 18, up: 48, n: "materiaux" },
      { d: "Acier à béton T12", desc: "Armatures.", u: "tonnes", q: 0.8, up: 3850, n: "materiaux" },
    ]),
    lot("toiture", "Toiture et étanchéité", "materiaux", 15, [
      { d: "Toiture terrasse (dalle + étanchéité)", desc: "Dalle pleine + étanchéité multicouche.", u: "m²", q: 120, up: 90, n: "materiaux" },
    ]),
    lot("menuiserie", "Porte et menuiserie", "materiaux", 15, [
      { d: "Porte de garage sectionnelle", desc: "Porte sectionnelle 2.5×2.1 motorisée.", u: "unité", q: 1, qMode: "fixed", up: 1800, n: "materiaux" },
      { d: "Portillon piéton", desc: "Accès piéton intégré ou séparé.", u: "unité", q: 1, qMode: "fixed", up: 600, n: "materiaux" },
    ]),
    lot("electricite", "Électricité", "equipements", 8, [
      { d: "Installation électrique", desc: "Éclairage, prises, tableau dédié.", u: "lot", q: 1, qMode: "fixed", up: 1500, n: "equipements" },
    ]),
    lot("finition", "Finitions", "materiaux", 8, [
      { d: "Enduit et peinture", desc: "Enduit ciment + peinture.", u: "m²", q: 150, up: 18, n: "materiaux" },
    ]),
  ];
}

// ── Boutique commerciale / restaurant / café / bureau ───────────────────────
function commercialLots(cat: string): LotTpl[] {
  if (cat === "restaurant" || cat === "cafe") {
    const isResto = cat === "restaurant";
    return [
      etudesLot(5),
      lot("gros_oeuvre", "Gros œuvre et reprises", "materiaux", 35, [
        { d: "Reprise des murs, dalles et enduits", desc: "Mise à niveau du local.", u: "m²", q: 120, up: 45, n: "materiaux" },
        { d: "Ragréage et chape", desc: "Préparation des sols.", u: "m²", q: 120, up: 28, n: "materiaux" },
        { d: "Ciment CPJ 42.5", desc: "Mortiers.", u: "sacs", q: 60, up: 16.5, n: "materiaux" },
      ]),
      lot("amenagement", "Aménagement intérieur", "materiaux", 15, [
        { d: "Revêtement de sol (grès cérame)", desc: "Pose collée.", u: "m²", q: 120, up: 45, n: "materiaux" },
        { d: "Revêtements muraux (faïence / enduits décoratifs)", desc: "Zones humides + déco.", u: "m²", q: 60, up: 40, n: "materiaux" },
        { d: "Faux plafonds (dalles 60×60)", desc: "Ossature + dalles.", u: "m²", q: 100, up: 45, n: "materiaux" },
        { d: "Peinture intérieure", desc: "2 couches finition.", u: "m²", q: 200, up: 8, n: "materiaux" },
      ]),
      lot("cuisine_pro", "Cuisine professionnelle", "equipements", isResto ? 15 : 12, [
        { d: "Cuisine professionnelle inox", desc: "Plans, éviers, étagères.", u: "lot", q: 1, qMode: "fixed", up: 6000, n: "equipements" },
        { d: "Extraction et hotte", desc: "Hotte professionnelle + extraction.", u: "lot", q: 1, qMode: "fixed", up: 3500, n: "equipements" },
      ]),
      lot("froid", "Froid et équipements", "equipements", isResto ? 10 : 12, [
        { d: "Chambre froide / réfrigérateurs", desc: "Froid positif et négatif.", u: "lot", q: 1, qMode: "fixed", up: 5000, n: "equipements" },
        { d: "Équipement de service", desc: "Comptoir, caisses, mobilier.", u: "lot", q: 1, qMode: "fixed", up: 3000, n: "equipements" },
      ]),
      lot("electricite", "Électricité", "equipements", 8, [
        { d: "Installation électrique complète", desc: "Tableau, éclairage, prises 16A/32A.", u: "lot", q: 1, qMode: "fixed", up: 5000, n: "equipements" },
      ]),
      lot("plomberie", "Plomberie", "equipements", 7, [
        { d: "Réseau eau et évacuation", desc: "Alimentation + évacuation cuisine et WC.", u: "lot", q: 1, qMode: "fixed", up: 3000, n: "equipements" },
      ]),
      lot("cvc", "CVC et ventilation", "equipements", 5, [
        { d: "Climatisation", desc: "Splits ou centralisée.", u: "lot", q: 1, qMode: "fixed", up: 3500, n: "equipements" },
      ]),
      vrdLot(5),
    ];
  }

  if (cat === "boutique_commerciale" || cat === "local_commercial") {
    return [
      etudesLot(5),
      lot("gros_oeuvre", "Gros œuvre et reprises", "materiaux", 38, [
        { d: "Reprise des murs, dalles et enduits", desc: "Mise à niveau du local.", u: "m²", q: 120, up: 45, n: "materiaux" },
        { d: "Ragréage et chape", desc: "Préparation des sols.", u: "m²", q: 120, up: 28, n: "materiaux" },
        { d: "Ciment CPJ 42.5", desc: "Mortiers.", u: "sacs", q: 60, up: 16.5, n: "materiaux" },
      ]),
      lot("facade", "Façade et vitrine", "materiaux", 12, [
        { d: "Vitrine aluminium + porte coulissante", desc: "Devanture vitrée sécurisée.", u: "m²", q: 12, up: 900, n: "materiaux" },
        { d: "Habillage façade", desc: "Bardage / peinture façade.", u: "m²", q: 40, up: 60, n: "materiaux" },
      ]),
      lot("amenagement", "Aménagement intérieur", "materiaux", 15, [
        { d: "Revêtement de sol (grès cérame)", desc: "Pose collée.", u: "m²", q: 120, up: 45, n: "materiaux" },
        { d: "Faux plafonds (dalles 60×60)", desc: "Ossature + dalles.", u: "m²", q: 100, up: 45, n: "materiaux" },
        { d: "Peinture intérieure", desc: "2 couches finition.", u: "m²", q: 200, up: 8, n: "materiaux" },
      ]),
      lot("electricite", "Électricité", "equipements", 10, [
        { d: "Installation électrique complète", desc: "Tableau, éclairage, prises.", u: "lot", q: 1, qMode: "fixed", up: 4500, n: "equipements" },
      ]),
      lot("plomberie", "Plomberie", "equipements", 8, [
        { d: "Réseau eau et évacuation", desc: "WC clientèle + local.", u: "lot", q: 1, qMode: "fixed", up: 2500, n: "equipements" },
      ]),
      lot("enseignes", "Enseignes et équipements", "equipements", 7, [
        { d: "Enseigne lumineuse", desc: "Enseigne façade.", u: "lot", q: 1, qMode: "fixed", up: 1500, n: "equipements" },
      ]),
      vrdLot(5),
    ];
  }

  // bureau_cabinet
  return [
    etudesLot(5),
    lot("gros_oeuvre", "Gros œuvre et reprises", "materiaux", 36, [
      { d: "Reprise des murs, dalles et enduits", desc: "Mise à niveau du local.", u: "m²", q: 120, up: 45, n: "materiaux" },
      { d: "Ragréage et chape", desc: "Préparation des sols.", u: "m²", q: 120, up: 28, n: "materiaux" },
    ]),
    lot("cloisons", "Cloisons et faux plafonds", "materiaux", 12, [
      { d: "Cloisons en plaques de plâtre", desc: "Cloisons de bureaux et salles de réunion.", u: "m²", q: 80, up: 55, n: "materiaux" },
      { d: "Faux plafonds (dalles 60×60)", desc: "Ossature + dalles acoustiques.", u: "m²", q: 100, up: 45, n: "materiaux" },
    ]),
    lot("revetements", "Revêtements", "materiaux", 12, [
      { d: "Revêtement de sol (grès cérame / moquette)", desc: "Zones de circulation + bureaux.", u: "m²", q: 120, up: 50, n: "materiaux" },
      { d: "Peinture intérieure", desc: "2 couches finition.", u: "m²", q: 200, up: 8, n: "materiaux" },
    ]),
    lot("menuiserie", "Menuiserie", "materiaux", 8, [
      { d: "Portes intérieures", desc: "Blocs-portes.", u: "unités", q: 4, up: 450, n: "materiaux" },
      { d: "Porte d'entrée sécurisée", desc: "Porte métallique + contrôle d'accès.", u: "unité", q: 1, qMode: "fixed", up: 1200, n: "materiaux" },
    ]),
    lot("electricite", "Électricité et réseaux", "equipements", 10, [
      { d: "Installation électrique complète", desc: "Tableau, éclairage, prises, data.", u: "lot", q: 1, qMode: "fixed", up: 5000, n: "equipements" },
      { d: "Réseau informatique / VDI", desc: "Prises RJ45, baie de brassage.", u: "lot", q: 1, qMode: "fixed", up: 2000, n: "equipements" },
    ]),
    lot("cvc", "CVC", "equipements", 8, [
      { d: "Climatisation", desc: "Splits ou VRV.", u: "lot", q: 1, qMode: "fixed", up: 4000, n: "equipements" },
    ]),
    vrdLot(4),
  ];
}

// ── Atelier / entrepôt / bâtiment agricole ──────────────────────────────────
function industrielLots(cat: string): LotTpl[] {
  const isAgri = cat === "batiment_agricole";
  return [
    etudesLot(5),
    lot("terrassement", "Terrassement", "materiaux", isAgri ? 8 : 10, [
      { d: "Terrassement et couche de forme", desc: "Nivellement, compactage, graves 0/31.5.", u: "m²", q: 120, up: 35, n: "materiaux" },
      { d: "Évacuation des terres", desc: "Bennes et transport.", u: "bennes", q: 6, up: 200, n: "transport" },
    ]),
    lot("gros_oeuvre", "Gros œuvre et dalle", "materiaux", isAgri ? 38 : 42, [
      { d: "Dalle industrielle (béton armé 15-20cm)", desc: "Dalle désactivée ou traitée.", u: "m²", q: 120, up: 90, n: "materiaux" },
      { d: "Fondations et longrines", desc: "Semelles filantes + longrines.", u: "m²", q: 120, up: 45, n: "materiaux" },
      { d: "Ciment CPJ 42.5", desc: "Béton et mortiers.", u: "sacs", q: 180, up: 16.5, n: "materiaux" },
      { d: "Acier à béton T12", desc: "Armatures.", u: "tonnes", q: 1.2, up: 3850, n: "materiaux" },
      { d: "Sable et gravier", desc: "Granulats.", u: "m³", q: 20, up: 48, n: "materiaux" },
    ]),
    lot("charpente", "Charpente et couverture", "materiaux", isAgri ? 14 : 15, [
      { d: "Charpente métallique / bois", desc: "Portiques ou fermes.", u: "m²", q: 120, up: 85, n: "materiaux" },
      { d: "Couverture (bac acier / tôle)", desc: "Bac acier prélaqué + accessoires.", u: "m²", q: 120, up: 55, n: "materiaux" },
      { d: "Étanchéité et faîtage", desc: "Étanchéité des rives et faîtage.", u: "m²", q: 120, up: 12, n: "materiaux" },
    ]),
    lot("electricite", "Électricité", "equipements", isAgri ? 10 : 12, [
      { d: "Installation électrique industrielle", desc: "Tableau, éclairage haute baie, prises triphasées.", u: "lot", q: 1, qMode: "fixed", up: 6000, n: "equipements" },
    ]),
    lot("portes", "Portes et sécurité", "materiaux", isAgri ? 8 : 8, [
      { d: "Porte sectionnelle industrielle", desc: "Porte 3×3 m motorisée.", u: "unité", q: 1, qMode: "fixed", up: 1800, n: "materiaux" },
      { d: "Portillon et clôture", desc: "Clôture grillagée + portillon.", u: "ml", q: 30, up: 90, n: "materiaux" },
    ]),
    lot("divers", isAgri ? "Eau et irrigation" : "VRD et divers", isAgri ? "equipements" : "transport", isAgri ? 12 : 8, [
      { d: isAgri ? "Réseau d'eau et irrigation" : "VRD et raccordements", desc: isAgri ? "Adduction, goutte-à-goutte ou aspersion." : "Raccordements eau, électricité, assainissement.", u: "lot", q: 1, qMode: "fixed", up: isAgri ? 4000 : 2500, n: isAgri ? "equipements" : "transport" },
    ]),
  ];
}

// ── Électricité complète ────────────────────────────────────────────────────
function electriciteLots(): LotTpl[] {
  return [
    lot("tableau", "Tableau électrique et protection", "equipements", 12, [
      { d: "Tableau électrique général", desc: "Tableau 13-24 modules avec peignes.", u: "unité", q: 1, qMode: "fixed", up: 420, n: "equipements" },
      { d: "Disjoncteur de branchement", desc: "Disjoncteur 30-60 A.", u: "unité", q: 1, qMode: "fixed", up: 120, n: "equipements" },
      { d: "Disjoncteurs divisionnaires", desc: "16/20/32 A pour chaque circuit.", u: "unités", q: 10, up: 52, n: "equipements" },
      { d: "Interrupteurs différentiels 30mA", desc: "Type AC / A.", u: "unités", q: 3, up: 90, n: "equipements" },
      { d: "Parafoudre type 2", desc: "Protection contre la foudre.", u: "unité", q: 1, qMode: "fixed", up: 180, n: "equipements" },
    ]),
    lot("cablage", "Câblage et gaines", "equipements", 25, [
      { d: "Câble électrique 1.5 mm² (éclairage)", desc: "Circuits éclairage.", u: "ml", q: 300, up: 1.5, n: "equipements" },
      { d: "Câble électrique 2.5 mm² (prises)", desc: "Circuits prises.", u: "ml", q: 400, up: 2.4, n: "equipements" },
      { d: "Câble 6 mm² (cuisson / chauffe-eau)", desc: "Circuits spécialisés.", u: "ml", q: 60, up: 4.8, n: "equipements" },
      { d: "Gaines ICTA / tubes IRL", desc: "Chemins de câbles.", u: "ml", q: 400, up: 2.5, n: "equipements" },
      { d: "Boîtes de dérivation", desc: "Boîtes encastrées + dominos.", u: "unités", q: 25, up: 8, n: "equipements" },
    ]),
    lot("appareillage", "Appareillage", "equipements", 20, [
      { d: "Interrupteurs", desc: "Simple et va-et-vient.", u: "unités", q: 12, up: 7, n: "equipements" },
      { d: "Prises de courant 2P+T", desc: "Prises encastrées.", u: "unités", q: 20, up: 9, n: "equipements" },
      { d: "Prises spécialisées (four, lave-linge)", desc: "Prises 20 A / 32 A.", u: "unités", q: 4, up: 25, n: "equipements" },
    ]),
    lot("eclairage", "Points lumineux", "equipements", 10, [
      { d: "Points d'éclairage", desc: "Plafonniers LED, spots.", u: "points", q: 15, up: 45, n: "equipements" },
      { d: "Éclairage extérieur", desc: "Projecteurs LED étanches.", u: "unités", q: 2, up: 80, n: "equipements" },
    ]),
    lot("terre", "Mise à la terre", "equipements", 8, [
      { d: "Prise de terre (piquet + boucle)", desc: "Piquet 2 m + boucle périphérique.", u: "lot", q: 1, qMode: "fixed", up: 600, n: "equipements" },
      { d: "Liaisons équipotentielles", desc: "SDB et cuisine.", u: "lot", q: 1, qMode: "fixed", up: 200, n: "equipements" },
    ]),
    lot("essais", "Essais et mise en service", "main_oeuvre", 5, [
      { d: "Mesures et essais", desc: "Rapport de conformité, contrôle.", u: "lot", q: 1, qMode: "fixed", up: 400, n: "main_oeuvre" },
    ]),
    lot("main_oeuvre", "Main-d'œuvre électricien", "main_oeuvre", 20, [
      { d: "Main-d'œuvre électricien", desc: "Pose, raccordement, mise en service.", u: "jours", q: 15, up: 80, n: "main_oeuvre" },
    ]),
  ];
}

// ── Plomberie complète ──────────────────────────────────────────────────────
function plomberieLots(): LotTpl[] {
  return [
    lot("alimentation", "Alimentation en eau", "equipements", 20, [
      { d: "Tubes PER Ø16/Ø20", desc: "Réseau d'alimentation eau froide/chaude.", u: "ml", q: 80, up: 8, n: "equipements" },
      { d: "Tubes cuivre Ø12/Ø14", desc: "Colonnes montantes.", u: "ml", q: 20, up: 22, n: "equipements" },
      { d: "Raccords et vannes", desc: "Raccords à sertir, vannes d'arrêt.", u: "lot", q: 1, qMode: "fixed", up: 500, n: "equipements" },
      { d: "Collecteur d'alimentation", desc: "Collecteur PER multivoies.", u: "unité", q: 1, qMode: "fixed", up: 250, n: "equipements" },
    ]),
    lot("evacuation", "Évacuation", "equipements", 15, [
      { d: "Tubes PVC Ø40/Ø50", desc: "Évacuations appareils.", u: "ml", q: 25, up: 7, n: "equipements" },
      { d: "Tubes PVC Ø100/Ø110", desc: "Chutes et collecteurs.", u: "ml", q: 15, up: 15, n: "equipements" },
      { d: "Siphons et bouchons de visite", desc: "Accessoires d'évacuation.", u: "lot", q: 1, qMode: "fixed", up: 300, n: "equipements" },
    ]),
    lot("sanitaires", "Sanitaires et robinetterie", "equipements", 20, [
      { d: "WC à l'anglaise complet", desc: "Réservoir + abattant.", u: "unités", q: 2, up: 280, n: "equipements" },
      { d: "Lavabo + meuble", desc: "Vasque, meuble, siphon.", u: "unités", q: 2, up: 450, n: "equipements" },
      { d: "Receveur de douche + paroi", desc: "Receveur 90×90 + paroi.", u: "unité", q: 1, qMode: "fixed", up: 500, n: "equipements" },
      { d: "Mitigeurs", desc: "Douche, lavabo, évier.", u: "unités", q: 3, up: 200, n: "equipements" },
    ]),
    lot("chauffe_eau", "Chauffe-eau", "equipements", 10, [
      { d: "Chauffe-eau électrique 80L", desc: "Fourniture et pose + groupe de sécurité.", u: "unité", q: 1, qMode: "fixed", up: 480, n: "equipements" },
    ]),
    lot("essais", "Essais et mise en service", "main_oeuvre", 5, [
      { d: "Essais d'étanchéité", desc: "Épreuve du réseau à 10 bars.", u: "lot", q: 1, qMode: "fixed", up: 300, n: "main_oeuvre" },
    ]),
    lot("main_oeuvre", "Main-d'œuvre plombier", "main_oeuvre", 30, [
      { d: "Main-d'œuvre plombier", desc: "Pose, raccordement, mise en service.", u: "jours", q: 15, up: 80, n: "main_oeuvre" },
    ]),
  ];
}

// ════════════════════════════════════════════════════════════════════════
// SÉLECTION DU GABARIT PAR TYPE DE PROJET
// ════════════════════════════════════════════════════════════════════════

const RESIDENTIAL = new Set([
  // 11 types officiels — Résidentiel & tourisme
  "maison",
  "villa",
  "appartement",
  "studio",
  "duplex",
  "immeuble",
  "residence_touristique",
  "projet_neuf",
  // Anciens types résidentiels (rétro-compatibilité)
  "maison_r_plus_1",
  "maison_r_plus_2",
  "immeuble_residentiel",
]);

export function buildDqeLots(category: string, floors?: number): LotTpl[] {
  // D'abord, vérifier si le slug brut (ancien ou nouveau) a un gabarit dédié.
  // Cela permet aux anciens slugs spécialisés (renovation_complete, piscine, etc.)
  // de conserver leur gabarit spécifique même si resolveProjectType les mappe
  // vers un type résidentiel / commercial.
  switch (category) {
    case "renovation_complete":
      return renovationCompleteLots();
    case "renovation_cuisine":
      return renovationCuisineLots();
    case "renovation_salle_de_bain":
      return renovationSdbLots();
    case "peinture_interieure":
      return peintureLots();
    case "piscine_beton":
    case "piscine":
      return piscineBetonLots();
    case "piscine_coque":
      return piscineCoqueLots();
    case "garage":
      return garageLots();
    case "electricite_complete":
    case "installations_electricite":
      return electriciteLots();
    case "plomberie_complete":
    case "installations_sanitaires":
      return plomberieLots();
    case "restaurant":
    case "cafe":
      return commercialLots("local_commercial");
    case "boutique_commerciale":
      return commercialLots("local_commercial");
    case "bureau_cabinet":
      return commercialLots("bureau");
    case "atelier":
      return industrielLots("entrepot");
    case "batiment_agricole":
    case "ferme":
    case "serre_agricole":
      return industrielLots("entrepot");
  }

  // Ensuite, résoudre vers le type officiel pour les types standards.
  const resolved = resolveProjectType(category) ?? category;
  if (RESIDENTIAL.has(resolved)) return residentialLots(resolved, floors);
  switch (resolved) {
    case "local_commercial":
      return commercialLots("local_commercial");
    case "bureau":
      return commercialLots("bureau");
    case "entrepot":
      return industrielLots("entrepot");
    default:
      // Anciens slugs inconnus → gabarit résidentiel par défaut.
      return residentialLots("maison", floors);
  }
}

// ════════════════════════════════════════════════════════════════════════
// GÉNÉRATEUR DU DQE
// ════════════════════════════════════════════════════════════════════════

export interface DqeInput {
  category: string;
  surface: number;
  floors: number;
  totalBudget: number; // coût total des travaux (sans imprévus), TND
  livePrices?: DqeLivePriceMap;
}

export function generateDqe(input: DqeInput): DqeResult {
  const { category, surface, floors, totalBudget } = input;
  const tb = Math.max(1, surface * (floors || 1));
  const scale = tb / REF_SURFACE;
  const lotTpls = buildDqeLots(category, floors);
  const totalPct = lotTpls.reduce((s, l) => s + l.percent, 0);

  const lots: DqeLot[] = lotTpls.map((lt) => {
    const lotBudget = Math.round((totalBudget * lt.percent) / totalPct);
    // 1. Quantités & prix de référence
    const lines: DqeLine[] = lt.lines.map((tpl) => {
      const quantity = tpl.qMode === "fixed" ? tpl.q : roundQty(tpl.q * scale);
      const resolved = resolveUnitPrice(tpl.d, tpl.up, input.livePrices);
      return {
        designation: tpl.d,
        description: tpl.desc,
        sousLot: tpl.sl,
        unit: resolved.unit ?? tpl.u,
        quantity,
        unitPrice: resolved.up,
        total: Math.round(quantity * resolved.up),
        nature: tpl.n,
        observations: tpl.obs,
      };
    });
    // 2. Calage des prix pour tomber exactement sur le sous-total du lot
    const rawTotal = lines.reduce((s, l) => s + l.total, 0);
    const factor = rawTotal > 0 ? lotBudget / rawTotal : 1;
    const scaledLines = lines.map((l) => {
      const total = Math.round(l.total * factor);
      const quantity = l.quantity > 0 ? l.quantity : 1;
      return {
        ...l,
        unitPrice: Math.round((total / quantity) * 100) / 100,
        total,
      };
    });
    // Calage exact sur le sous-total du lot : l'écart d'arrondi est absorbé
    // par la dernière ligne pour que le lot tombe exactement sur son budget
    // (méthode identique au finalisateur du moteur BIM).
    let subtotal = scaledLines.reduce((s, l) => s + l.total, 0);
    const delta = lotBudget - subtotal;
    if (delta !== 0 && scaledLines.length > 0) {
      const last = scaledLines[scaledLines.length - 1];
      last.total += delta;
      last.unitPrice = Math.round((last.total / (last.quantity || 1)) * 100) / 100;
      subtotal += delta;
    }
    return {
      id: lt.id,
      name: lt.name,
      nature: lt.nature,
      percent: Math.round((lt.percent / totalPct) * 1000) / 10,
      subtotal,
      lines: scaledLines,
    };
  });

  const grandTotal = lots.reduce((s, l) => s + l.subtotal, 0);
  const rollup = (n: DqeNature) =>
    lots.reduce((s, l) => s + l.lines.filter((x) => x.nature === n).reduce((a, b) => a + b.total, 0), 0);

  return {
    lots,
    totals: {
      materiaux: rollup("materiaux"),
      mainOeuvre: rollup("main_oeuvre"),
      equipements: rollup("equipements"),
      transport: rollup("transport"),
      etudes: rollup("etudes"),
      total: grandTotal,
      costPerM2: tb > 0 ? Math.round(grandTotal / tb) : 0,
    },
    referenceSurface: REF_SURFACE,
    referenceTotal: Math.round(totalBudget),
    generatedAt: Date.now(),
  };
}
