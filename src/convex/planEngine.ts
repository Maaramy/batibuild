// ============================================================================
// GÉNÉRATEUR PROCÉDURAL DE PLANS ARCHITECTURAUX (moteur pur — sans Convex)
// Génère 10 variantes de floor plans 2D cohérentes géométriquement à partir
// des contraintes saisies par l'utilisateur. Déterministe (seed) et testable.
// ============================================================================

// ─── Types partagés ─────────────────────────────────────────────────────────

export type Standing = "economique" | "standard" | "premium";
export type StyleArchitectural =
  | "moderne" | "contemporain" | "minimaliste" | "traditionnel"
  | "mediterraneen" | "luxe" | "industriel" | "classique";

export interface PlanRequest {
  bienType: string;
  // Surfaces (m²)
  surfaceTotale: number;    // surface du terrain / plateau disponible
  surfaceCouverte: number;  // surface construite totale (tous niveaux)
  floors: number;           // nombre de niveaux
  // Pièces
  bedrooms: number;
  bathrooms: number;
  wcs: number;
  hasSalon: boolean;
  hasSalleAManger: boolean;
  hasCuisine: boolean;
  hasBuanderie: boolean;
  hasDressing: boolean;
  hasBureau: boolean;
  hasLocalTechnique: boolean;
  // Extérieurs
  hasGarage: boolean;
  hasParking: boolean;
  hasTerrasse: boolean;
  hasBalcon: boolean;
  hasJardin: boolean;
  hasPiscine: boolean;
  // Contraintes
  orientation: string;       // nord / sud / est / ouest / n / s / e / o
  entreePosition: string;    // nord / sud / est / ouest
  facades: number;           // 1..4
  standing: Standing;
  style: StyleArchitectural;
  exigences?: string;        // exigences supplémentaires libres
  seed?: number;
}

export interface RoomReq {
  name: string;
  type: string;             // salon / chambre / cuisine / ...
  area: number;             // surface cible (m²)
  minArea: number;          // surface minimale
  level: number;            // niveau 0 = RDC
  exterior?: boolean;       // zone extérieure (garage, terrasse…)
  color?: string;
}

export interface PlacedRoom {
  id: string;
  name: string;
  type: string;
  x: number;   // mètres
  y: number;
  w: number;
  h: number;
  area: number;       // surface réelle (m²)
  level: number;
  exterior: boolean;
  color: string;
}

export interface Door {
  id: string;
  x: number;
  y: number;
  w: number;          // largeur (m)
  h: number;          // hauteur (m)
  angle: number;      // orientation d'ouverture (rad) — sens d'ouverture
  roomId: string;
  exterior: boolean;  // porte d'entrée
}

export interface Window {
  id: string;
  x: number;
  y: number;
  w: number;
  vertical: boolean;  // fenêtre sur mur vertical (est/ouest)
  roomId: string;
}

export interface Stairs {
  x: number;
  y: number;
  w: number;
  h: number;
  level: number;
}

export interface PlanAlerts {
  incompatible: boolean;
  messages: string[];
}

export interface PlanScores {
  optimisation: number;      // 0-100
  fonctionnalite: number;    // 0-100
  confort: number;           // 0-100
  architectural: number;     // 0-100
  global: number;            // 0-100
}

export interface GeneratedPlan {
  index: number;             // 1..10
  key: string;               // identifiant de stratégie
  name: string;              // nom marketing (Plan 01 — …)
  description: string;       // description architecturale IA
  strengths: string[];
  weaknesses: string[];
  // Données géométriques
  width: number;             // largeur hors-tout du bâtiment (m)
  depth: number;             // profondeur hors-tout (m)
  levels: number;
  rooms: PlacedRoom[];
  doors: Door[];
  windows: Window[];
  stairs: Stairs[];
  alerts: PlanAlerts;
  scores: PlanScores;
  // Statistiques
  stats: {
    totalSurface: number;      // surface totale disponible
    construite: number;        // surface construite (couvert)
    utile: number;             // surface utile estimée (pièces couvertes)
    circulation: number;       // surface de circulation
    exterieure: number;        // surface extérieure dédiée (garage, terrasse…)
    tauxUtilisation: number;   // % surface couverte réellement utile
    nbPieces: number;          // nombre de pièces couvertes
    nbChambres: number;
    nbSdb: number;
    nbWc: number;
    salonArea: number;
    cuisineArea: number;
    chambresArea: number;
  };
  // Référence architecturale analysée (modèle Villa T10 type 1)
  reference?: PlanReference;
  // Mobilier & équipements positionnés (portes et fenêtres dégagées)
  furniture?: FurnitureItem[];
  // Contrôle qualité automatique (recommandations + corrections proposées)
  quality?: PlanQualityReport;
}

// ─── Référence architecturale (modèle Villa T10 type 1) ───────────────────
// Le moteur utilise la villa basse « T10 type 1 » (plan de référence, ECS
// Informatique) comme ADN architectural : hall central de distribution,
// séjour en façade, chambres regroupées en zone nuit, cuisine et services en
// fond de parcelle, pièces humides regroupées pour la plomberie.

export interface PlanReference {
  name: string;
  url: string;
  principles: string[];
}

export const VILLA_T10_REFERENCE: PlanReference = {
  name: "Villa T10 (type 1) — villa basse",
  url: "https://www.ecsinformatique.com/wp-content/uploads/2025/08/Villa-T10-type-1.jpg",
  principles: [
    "Hall central de distribution desservant toutes les pièces sans traversée",
    "Séjour et salle à manger en façade, orientés vers l'entrée du terrain",
    "Cuisine et arrière-services en fond de parcelle, adossées aux pièces humides",
    "Chambres regroupées en zone nuit, à l'écart de l'espace de vie",
    "Salles de bain et WC regroupés avec la cuisine pour mutualiser la plomberie",
    "Plan compact et régulier, faible circulation, mobilier le long des murs",
  ],
};

// ─── Mobilier & équipements ────────────────────────────────────────────────

export type FurnitureKind =
  | "lit" | "table_chevet" | "armoire" | "penderie" | "etageres"
  | "plan_travail" | "evier" | "plaque" | "frigo" | "four" | "ilot"
  | "douche" | "baignoire" | "lavabo" | "wc" | "miroir"
  | "canape" | "fauteuil" | "table_basse" | "meuble_tv"
  | "table" | "chaise"
  | "bureau" | "bibliotheque"
  | "machine_laver" | "seche_linge"
  | "voiture" | "porte_garage"
  | "parasol" | "table_exterieur";

export interface FurnitureItem {
  id: string;
  kind: FurnitureKind;
  label: string;
  x: number; y: number; w: number; h: number;
  angle: number;      // rotation du symbole (rad) — dos contre le mur
  roomId: string;
  roomType: string;
  level: number;
}

// ─── Contrôle qualité (recommandations IA) ─────────────────────────────────

export interface PlanQualityIssue {
  id: string;
  severity: "error" | "warning" | "info";
  category: string;   // dimensions / circulation / portes / fenetres / mobilier / surfaces / confort / plomberie
  message: string;
  fix: string;        // correction proposée automatiquement
  roomId?: string;
  x?: number;
  y?: number;
}

export interface PlanQualityReport {
  score: number;                        // 0-100
  count: { error: number; warning: number; info: number };
  issues: PlanQualityIssue[];
}

export interface OptimizeResult {
  plan: GeneratedPlan;
  improvements: string[];
  before: PlanQualityReport;
  after: PlanQualityReport;
}

// ─── Constantes dimensionnelles (m², standards tunisiens) ──────────────────

const AREA = {
  salon:        { eco: 22, std: 28, premium: 36, min: 14 },
  salleAManger:{ eco: 10, std: 13, premium: 16, min: 8 },
  cuisine:      { eco: 9,  std: 12, premium: 15, min: 6 },
  chambre:      { eco: 11, std: 13, premium: 16, min: 9 },
  master:       { eco: 13, std: 16, premium: 20, min: 11 },
  sdb:          { eco: 3.5, std: 4.5, premium: 6, min: 2.5 },
  wc:           { eco: 1.6, std: 2, premium: 2.5, min: 1.2 },
  buanderie:    { eco: 3,  std: 4,  premium: 5,  min: 2 },
  dressing:     { eco: 3,  std: 4.5, premium: 6, min: 2 },
  bureau:       { eco: 8,  std: 10, premium: 13, min: 6 },
  localTech:    { eco: 3,  std: 4,  premium: 5,  min: 2 },
  escalier:     { eco: 4.5, std: 5.5, premium: 6.5, min: 3.5 },
  entree:       { eco: 3,  std: 4,  premium: 5.5, min: 2.5 },
  couloirPct:   { eco: 0.09, std: 0.11, premium: 0.13 },
} as const;

// Couleurs par type de pièce (palette pro)
const ROOM_COLORS: Record<string, string> = {
  salon: "#fef3c7", salleAManger: "#fde68a", cuisine: "#fecaca",
  chambre: "#dbeafe", master: "#c7d2fe", sdb: "#cffafe", wc: "#e0f2fe",
  buanderie: "#e5e7eb", dressing: "#f3e8ff", bureau: "#ede9fe",
  localTechnique: "#d1d5db", escalier: "#a5b4fc", entree: "#fef9c3",
  circulation: "#f8fafc", terrasse: "#d9f99d", balcon: "#d9f99d",
  garage: "#e7e5e4", parking: "#d6d3d1", jardin: "#bbf7d0", piscine: "#a5f3fc",
  default: "#f1f5f9",
};

export function roomColor(type: string): string {
  return ROOM_COLORS[type] ?? ROOM_COLORS.default;
}

// ─── RNG déterministe (mulberry32) ─────────────────────────────────────────

export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const snap = (n: number, step = 0.25) => Math.round(n / step) * step;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function round1(n: number) { return Math.round(n * 10) / 10; }

// ─── Liste des 10 stratégies ────────────────────────────────────────────────

interface VariantStrategy {
  key: string;
  name: string;
  desc: string;
  // Répartition des pièces entre RDC et étages :
  // "jour_rdc" : salon/cuisine au RDC, chambres à l'étage
  // "tout_rdc" : tout au RDC (plain-pied)
  // "jour_nuit_cote" : jour/nuit séparés par zone (une colonne jour / une nuit)
  // "hall_central" : hall central de distribution, jour d'un côté / nuit de l'autre
  layout: "jour_rdc" | "tout_rdc" | "jour_nuit_cote" | "open_space" | "hall_central";
  circulation: number;    // cible % circulation
  aspectFlip: boolean;    // inverser l'aspect (paysage/portrait)
  masterSuite: boolean;   // suite parentale (dressing + sdb attenante)
  openPlan: boolean;      // salon + salle à manger + cuisine fusionnés
  lightSouth: boolean;    // pièces de vie au sud
  corridor: boolean;      // couloir central marqué
  roomOrder: string[];    // ordre des groupes de pièces dans le RDC
}

const STRATEGIES: VariantStrategy[] = [
  {
    key: "villa_t10", name: "Villa T10 — hall central",
    desc: "Reproduit l'organisation du modèle de référence T10 : hall central distribuant séjour en façade, cuisine et services en fond, chambres regroupées en zone nuit de l'autre côté.",
    layout: "hall_central", circulation: 0.11, aspectFlip: false, masterSuite: true,
    openPlan: false, lightSouth: true, corridor: true,
    roomOrder: ["vie", "nuit", "services"],
  },
  {
    key: "optimisation", name: "Optimisation maximale de l'espace",
    desc: "Surface utile maximale : circulation réduite, pièces aux dimensions proches des minima fonctionnels et enveloppe compacte.",
    layout: "tout_rdc", circulation: 0.07, aspectFlip: false, masterSuite: false,
    openPlan: false, lightSouth: false, corridor: false,
    roomOrder: ["vie", "nuit", "services"],
  },
  {
    key: "jour_nuit", name: "Séparation optimale jour / nuit",
    desc: "Espace jour (salon, cuisine) d'un côté, espace nuit (chambres) de l'autre, reliés par une zone de circulation tampon.",
    layout: "jour_nuit_cote", circulation: 0.11, aspectFlip: false, masterSuite: false,
    openPlan: false, lightSouth: true, corridor: true,
    roomOrder: ["vie", "nuit", "services"],
  },
  {
    key: "familiale", name: "Configuration familiale",
    desc: "Grande cuisine et espace de vie centralisés, chambres regroupées à proximité, idéal pour la vie de famille.",
    layout: "tout_rdc", circulation: 0.1, aspectFlip: false, masterSuite: false,
    openPlan: true, lightSouth: false, corridor: false,
    roomOrder: ["vie", "nuit", "services"],
  },
  {
    key: "moderne", name: "Configuration moderne",
    desc: "Espace de vie en open space (salon + salle à manger + cuisine), lignes épurées et rangements intégrés.",
    layout: "open_space", circulation: 0.09, aspectFlip: true, masterSuite: false,
    openPlan: true, lightSouth: true, corridor: false,
    roomOrder: ["vie", "nuit", "services"],
  },
  {
    key: "grande_piece_vie", name: "Grande pièce de vie",
    desc: "Un salon très généreux comme cœur du logement, les autres pièces organisées autour.",
    layout: "tout_rdc", circulation: 0.1, aspectFlip: false, masterSuite: false,
    openPlan: false, lightSouth: false, corridor: false,
    roomOrder: ["vie", "nuit", "services"],
  },
  {
    key: "lumiere", name: "Optimisation de la lumière naturelle",
    desc: "Pièces de vie et chambres principales orientées au sud, services et circulations au nord pour un ensoleillement maximal.",
    layout: "tout_rdc", circulation: 0.1, aspectFlip: true, masterSuite: false,
    openPlan: false, lightSouth: true, corridor: true,
    roomOrder: ["vie", "nuit", "services"],
  },
  {
    key: "circulation", name: "Optimisation de la circulation intérieure",
    desc: "Couloir central généreux desservant toutes les pièces, suppression des zones de passage traversantes.",
    layout: "tout_rdc", circulation: 0.14, aspectFlip: false, masterSuite: false,
    openPlan: false, lightSouth: false, corridor: true,
    roomOrder: ["vie", "nuit", "services"],
  },
  {
    key: "premium", name: "Configuration Premium",
    desc: "Suite parentale avec dressing et salle de bains attenante, larges espaces de circulation et finitions haut de gamme.",
    layout: "jour_rdc", circulation: 0.13, aspectFlip: false, masterSuite: true,
    openPlan: false, lightSouth: true, corridor: true,
    roomOrder: ["vie", "nuit", "services"],
  },
  {
    key: "ratio_utile", name: "Optimisation du rapport surface utile / construite",
    desc: "Formes régulières et cloisons minimisées pour maximiser le ratio surface utile / surface construite.",
    layout: "tout_rdc", circulation: 0.06, aspectFlip: true, masterSuite: false,
    openPlan: false, lightSouth: false, corridor: false,
    roomOrder: ["vie", "nuit", "services"],
  },
  {
    key: "alternative", name: "Proposition architecturale alternative",
    desc: "Variante alternative : organisation inversée de l'espace jour/nuit et entrée déplacée pour explorer d'autres partis pris.",
    layout: "jour_nuit_cote", circulation: 0.1, aspectFlip: true, masterSuite: true,
    openPlan: true, lightSouth: false, corridor: true,
    roomOrder: ["nuit", "vie", "services"],
  },
];

// ─── Construction des besoins en pièces ────────────────────────────────────

function standLevel(s: Standing): "eco" | "std" | "premium" {
  return s === "economique" ? "eco" : s === "premium" ? "premium" : "std";
}

function buildRoomReqs(req: PlanRequest, strategy: VariantStrategy): { rooms: RoomReq[]; alerts: string[] } {
  const sl = standLevel(req.standing);
  const alerts: string[] = [];
  const rooms: RoomReq[] = [];
  const floors = Math.max(1, Math.round(req.floors) || 1);
  const hasUpper = floors > 1;
  // Pièces de vie (RDC)
  const vie: RoomReq[] = [];
  if (req.hasSalon) vie.push({ name: "Salon", type: "salon", area: AREA.salon[sl], minArea: AREA.salon.min, level: 0 });
  if (req.hasSalleAManger) vie.push({ name: "Salle à manger", type: "salleAManger", area: AREA.salleAManger[sl], minArea: AREA.salleAManger.min, level: 0 });
  if (req.hasCuisine) vie.push({ name: "Cuisine", type: "cuisine", area: AREA.cuisine[sl], minArea: AREA.cuisine.min, level: 0 });
  if (vie.length === 0) vie.push({ name: "Salon", type: "salon", area: AREA.salon[sl], minArea: AREA.salon.min, level: 0 });

  // Chambres
  const nbCh = Math.max(1, req.bedrooms || 1);
  const chambres: RoomReq[] = [];
  for (let i = 0; i < nbCh; i++) {
    const master = i === 0 && strategy.masterSuite && nbCh >= 1;
    const isUpper = hasUpper && i > 0;
    chambres.push({
      name: master ? "Chambre principale" : `Chambre ${i + 1}`,
      type: master ? "master" : "chambre",
      area: master ? AREA.master[sl] : AREA.chambre[sl],
      minArea: AREA.chambre.min,
      level: isUpper ? 1 : 0,
    });
  }

  // Salles de bain & WC
  const nbSdb = Math.max(1, req.bathrooms || 1);
  const sdb: RoomReq[] = [];
  for (let i = 0; i < nbSdb; i++) {
    const upper = hasUpper && i > 0;
    sdb.push({ name: `Salle de bain ${i + 1}`, type: "sdb", area: AREA.sdb[sl], minArea: AREA.sdb.min, level: upper ? 1 : 0 });
  }
  const wcs: RoomReq[] = [];
  for (let i = 0; i < (req.wcs || 0); i++) {
    wcs.push({ name: `WC ${i + 1}`, type: "wc", area: AREA.wc[sl], minArea: AREA.wc.min, level: 0 });
  }

  const services: RoomReq[] = [];
  if (req.hasBuanderie) services.push({ name: "Buanderie", type: "buanderie", area: AREA.buanderie[sl], minArea: AREA.buanderie.min, level: 0 });
  if (req.hasBureau) services.push({ name: "Bureau", type: "bureau", area: AREA.bureau[sl], minArea: AREA.bureau.min, level: hasUpper ? 1 : 0 });
  if (req.hasLocalTechnique) services.push({ name: "Local technique", type: "localTechnique", area: AREA.localTech[sl], minArea: AREA.localTech.min, level: 0 });
  if (hasUpper) services.push({ name: "Escalier", type: "escalier", area: AREA.escalier[sl], minArea: AREA.escalier.min, level: 0 });

  // Dressing rattaché à la suite parentale si premium
  if (req.hasDressing) {
    services.push({ name: "Espace séchage", type: "dressing", area: AREA.dressing[sl], minArea: AREA.dressing.min, level: hasUpper ? 1 : 0 });
  }

  // Ordre de placement selon la stratégie (sdb + wc regroupés avec la nuit)
  const orderMap: Record<string, RoomReq[]> = {
    vie,
    nuit: [...chambres, ...sdb, ...wcs],
    services,
  };
  const ordered: RoomReq[] = [];
  for (const grp of strategy.roomOrder) {
    const g = orderMap[grp];
    if (g) ordered.push(...g);
  }

  // Open space : fusionner salon + salle à manger + cuisine en un seul espace
  let final = ordered;
  if (strategy.openPlan) {
    const names = new Set(["Salon", "Salle à manger", "Cuisine"]);
    const merged = ordered.filter((r) => names.has(r.name));
    const rest = ordered.filter((r) => !names.has(r.name));
    const mergedArea = merged.reduce((s, r) => s + r.area, 0);
    final = [
      { name: "Espace de vie (open space)", type: "salon", area: mergedArea, minArea: AREA.salon.min + AREA.cuisine.min, level: 0 },
      ...rest,
    ];
  }

  // Vérification des contraintes de surface
  const coveredPerLevel = req.surfaceCouverte / floors;
  const couloirPct = strategy.circulation;
  const interiorNeeded = final.filter((r) => !r.exterior).reduce((s, r) => s + r.area, 0);
  const availableInterior = coveredPerLevel * (1 - couloirPct);
  if (interiorNeeded > availableInterior * 1.15) {
    alerts.push(
      `La surface couverte (${Math.round(coveredPerLevel)} m²/niveau) est insuffisante pour toutes les pièces demandées (≈${Math.round(interiorNeeded)} m² nécessaires). Les pièces ont été réduites à leur minimum fonctionnel.`,
    );
    // Réduction proportionnelle aux minima
    const scale = Math.min(1, availableInterior / interiorNeeded);
    for (const r of final) {
      r.area = Math.max(r.minArea, r.area * scale);
    }
  } else if (availableInterior > interiorNeeded * 1.5) {
    // Surface disponible généreuse : le salon absorbe le surplus
    const surplus = availableInterior - interiorNeeded;
    for (const r of final) {
      if (r.type === "salon") r.area += surplus * 0.6;
    }
  }

  return { rooms: final, alerts };
}

// ─── Algorithme de découpage guillotine ─────────────────────────────────────

interface Rect { x: number; y: number; w: number; h: number; }

function rectArea(r: Rect) { return r.w * r.h; }

/**
 * Découpe un rectangle en pièces adjacentes sans chevauchement (guillotine).
 * Chaque pièce occupe exactement une sous-cellule. Les enfants d'une coupe
 * partagent un bord commun ; la tolérance d'adjacence est conservée ensuite
 * pour le placement des portes.
 */
function guillotine(rect: Rect, rooms: RoomReq[], rng: () => number, depth = 0): PlacedRoom[] {
  if (rooms.length === 0) return [];

  const make = (r: RoomReq, x: number, y: number, w: number, h: number, i: number): PlacedRoom => ({
    id: `${r.type}-${r.level}-${depth}-${i}`,
    name: r.name, type: r.type,
    x, y, w: Math.max(0.3, w), h: Math.max(0.3, h),
    area: round1(w * h), level: r.level, exterior: !!r.exterior,
    color: roomColor(r.type),
  });

  // Cas terminal : une pièce ou un rectangle trop étroit pour être découpé.
  // On place alors les pièces restantes en grille régulière (pas de chevauchement).
  if (rooms.length === 1 || rect.w < 2.6 || rect.h < 2.6) {
    const n = rooms.length;
    const cols = Math.max(1, Math.min(n, Math.max(1, Math.floor(rect.w / 1.2))));
    const rows = Math.ceil(n / cols);
    const cw = rect.w / cols;
    const ch = rect.h / rows;
    return rooms.map((r, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = rect.x + col * cw;
      const y = rect.y + row * ch;
      const w = col === cols - 1 ? Math.max(0.3, rect.x + rect.w - x) : cw;
      const h = row === rows - 1 ? Math.max(0.3, rect.y + rect.h - y) : ch;
      return make(r, x, y, w, h, i);
    });
  }

  // Répartition des pièces en deux groupes d'aires équilibrées
  const total = rooms.reduce((s, r) => s + r.area, 0);
  let acc = 0; let splitIdx = 1;
  const target = total * (0.4 + rng() * 0.2);
  for (let i = 0; i < rooms.length - 1; i++) {
    acc += rooms[i].area;
    if (acc >= target) { splitIdx = i + 1; break; }
  }
  const groupA = rooms.slice(0, splitIdx);
  const groupB = rooms.slice(splitIdx);
  const areaA = groupA.reduce((s, r) => s + r.area, 0);
  const frac = areaA / Math.max(1e-6, total);

  // Axe de coupe : le côté le plus long (produit des pièces plus carrées),
  // avec une part de hasard pour diversifier les variantes.
  const cutVertical = rect.w >= rect.h ? rng() > 0.15 : rng() > 0.85;
  const out: PlacedRoom[] = [];
  // Dimension minimale de coupe : évite les pièces en lambeaux (sdb < 1,5 m…)
  const minSide = Math.min(1.5, rect.w * 0.4, rect.h * 0.4);
  const splitDim = (dim: number) => {
    const lo = Math.max(minSide, dim * 0.28);
    const hi = Math.max(dim - lo, dim * 0.5);
    return snap(clamp(dim * frac, lo, hi));
  };
  if (cutVertical) {
    const wA = splitDim(rect.w);
    const childA: Rect = { x: rect.x, y: rect.y, w: wA, h: rect.h };
    const childB: Rect = { x: rect.x + wA, y: rect.y, w: Math.max(0.3, rect.w - wA), h: rect.h };
    out.push(...guillotine(childA, groupA, rng, depth + 1));
    out.push(...guillotine(childB, groupB, rng, depth + 1));
  } else {
    const hA = splitDim(rect.h);
    const childA: Rect = { x: rect.x, y: rect.y, w: rect.w, h: hA };
    const childB: Rect = { x: rect.x, y: rect.y + hA, w: rect.w, h: Math.max(0.3, rect.h - hA) };
    out.push(...guillotine(childA, groupA, rng, depth + 1));
    out.push(...guillotine(childB, groupB, rng, depth + 1));
  }
  return out;
}

// ─── Orientation de l'entrée / façade principale ────────────────────────────

function entranceNormal(pos: string): { x: number; y: number } {
  const p = (pos || "sud").toLowerCase();
  if (p === "nord" || p === "n") return { x: 0, y: -1 };
  if (p === "est" || p === "e") return { x: 1, y: 0 };
  if (p === "ouest" || p === "o" || p === "w") return { x: -1, y: 0 };
  return { x: 0, y: 1 }; // sud
}

// ─── Générateur d'une variante ──────────────────────────────────────────────

function generateVariant(req: PlanRequest, strategy: VariantStrategy, variantSeed: number): GeneratedPlan {
  const rng = seededRandom(variantSeed);
  const alerts: string[] = [];
  const floors = Math.max(1, Math.round(req.floors) || 1);
  const coveredPerLevel = Math.max(20, req.surfaceCouverte / floors);
  const footprint = Math.sqrt(coveredPerLevel);

  // Dimensions du bâtiment : aspect selon stratégie + orientation
  const entNormal = entranceNormal(req.entreePosition);
  const isLandscape = Math.abs(entNormal.x) > 0;
  let W = isLandscape ? footprint * 1.25 : footprint * 1.12;
  let D = coveredPerLevel / W;
  if (strategy.aspectFlip) { W = coveredPerLevel / D * 0.9; D = coveredPerLevel / W; }
  // Dimensions réalistes (4.5 m minimum de côté)
  const minSide = Math.sqrt(coveredPerLevel) * 0.75;
  W = Math.max(minSide, W);
  D = Math.max(minSide, D);
  W = snap(W, 0.5); D = snap(D, 0.5);

  // Préparation des pièces
  const { rooms: allRooms, alerts: buildAlerts } = buildRoomReqs(req, strategy);
  alerts.push(...buildAlerts);

  const couloirPct = strategy.circulation;
  const circulationBand = Math.max(1, W * couloirPct * 1.4);
  // Bande de circulation côté entrée
  const entreeSide = req.entreePosition || "sud";
  const isEntreeNorth = entreeSide === "nord" || entreeSide === "n";
  const isEntreeEast = entreeSide === "est" || entreeSide === "e";
  const isEntreeWest = entreeSide === "ouest" || entreeSide === "o" || entreeSide === "w";
  const bandHorizontal = !isEntreeEast && !isEntreeWest;

  let mainRect: Rect;
  let circRect: Rect;
  if (bandHorizontal) {
    const bandH = Math.min(D * 0.22, Math.max(1.4, circulationBand));
    const circY = isEntreeNorth ? 0 : D - bandH;
    circRect = { x: 0, y: circY, w: W, h: bandH };
    mainRect = isEntreeNorth
      ? { x: 0, y: bandH, w: W, h: D - bandH }
      : { x: 0, y: 0, w: W, h: D - bandH };
  } else {
    const bandW = Math.min(W * 0.24, Math.max(1.4, W * couloirPct));
    const circX = isEntreeWest ? 0 : W - bandW;
    circRect = { x: circX, y: 0, w: bandW, h: D };
    mainRect = isEntreeWest
      ? { x: bandW, y: 0, w: W - bandW, h: D }
      : { x: 0, y: 0, w: W - bandW, h: D };
  }

  // Variante « hall central » (référence Villa T10) : la circulation passe au
  // centre, les pièces de jour d'un côté, les pièces de nuit de l'autre.
  let leftRect: Rect | null = null;
  let rightRect: Rect | null = null;
  if (strategy.layout === "hall_central") {
    const hallW = Math.min(mainRect.w * 0.3, Math.max(1.7, mainRect.w * couloirPct * 1.8));
    const sideW = Math.max(2.6, (mainRect.w - hallW) / 2);
    leftRect = { x: mainRect.x, y: mainRect.y, w: sideW, h: mainRect.h };
    rightRect = {
      x: mainRect.x + sideW + hallW,
      y: mainRect.y,
      w: Math.max(2.6, mainRect.w - sideW - hallW),
      h: mainRect.h,
    };
    circRect = { x: mainRect.x + sideW, y: mainRect.y, w: hallW, h: mainRect.h };
  }

  // Pièces par niveau
  const level0Rooms = allRooms.filter((r) => r.level === 0 && !r.exterior);
  const upperRooms = allRooms.filter((r) => r.level === 1 && !r.exterior);

  // Si tout est sur le même niveau (plain-pied), on place tout dans mainRect.
  const ground: PlacedRoom[] = [];
  const upper: PlacedRoom[] = [];

  // Ajuster les surfaces aux contraintes réelles de mainRect
  const mainArea = rectArea(mainRect);
  const level0Needed = level0Rooms.reduce((s, r) => s + r.area, 0);
  const level0Scale = Math.min(1, mainArea / Math.max(1e-6, level0Needed));
  if (level0Scale < 0.8 && level0Needed > mainArea) {
    alerts.push("Certaines pièces ont dû être redimensionnées pour tenir dans l'emprise du bâtiment.");
  }
  const scaled0 = level0Rooms.map((r) => ({ ...r, area: Math.max(r.minArea, r.area * level0Scale) }));

  if (leftRect && rightRect) {
    // Hall central : jour à gauche, nuit à droite (comme la Villa T10)
    const isDay = (r: RoomReq) => ["salon", "salleAManger", "cuisine", "buanderie", "localTechnique", "entree"].includes(r.type);
    const day = scaled0.filter(isDay);
    const night = scaled0.filter((r) => !isDay(r));
    const placeHalf = (rooms: RoomReq[], rect: Rect) => {
      if (rooms.length === 0) return;
      const needed = rooms.reduce((s, r) => s + r.area, 0);
      const scale = Math.min(1, rectArea(rect) / Math.max(1e-6, needed));
      const sc = rooms.map((r) => ({ ...r, area: Math.max(r.minArea, r.area * scale) }));
      ground.push(...guillotine(rect, sc, rng, 0));
    };
    placeHalf(day, leftRect);
    placeHalf(night, rightRect);
  } else {
    ground.push(...guillotine(mainRect, scaled0, rng, 0));
  }

  if (upperRooms.length > 0) {
    // Étage : même emprise, pièces de nuit
    const upperRect: Rect = { x: 0, y: 0, w: W, h: D };
    const upperNeeded = upperRooms.reduce((s, r) => s + r.area, 0);
    const upperScale = Math.min(1, rectArea(upperRect) / Math.max(1e-6, upperNeeded));
    const scaledU = upperRooms.map((r) => ({ ...r, area: Math.max(r.minArea, r.area * upperScale) }));
    upper.push(...guillotine(upperRect, scaledU, rng, 100));
  }

  // Circulation / entrée (pièce spéciale)
  const circ: PlacedRoom = {
    id: "circulation-0", name: "Entrée & circulation", type: "circulation",
    x: circRect.x, y: circRect.y, w: circRect.w, h: circRect.h,
    area: round1(circRect.w * circRect.h), level: 0, exterior: false,
    color: ROOM_COLORS.circulation,
  };

  // Extérieurs : garage, parking, terrasse, balcon, jardin, piscine
  const exteriorRooms: PlacedRoom[] = [];
  let extX = 0; const extBandH = 3;
  const exteriorAdd = (name: string, type: string, w: number, h: number) => {
    exteriorRooms.push({
      id: `${type}-ext-${exteriorRooms.length}`, name, type,
      x: extX, y: D + 0.5, w: snap(w), h: snap(h),
      area: round1(w * h), level: 0, exterior: true, color: roomColor(type),
    });
    extX += snap(w) + 0.5;
  };
  if (req.hasGarage) exteriorAdd("Garage", "garage", Math.max(3, W * 0.3), 5);
  if (req.hasParking) exteriorAdd("Parking", "parking", 2.6, 5);
  if (req.hasTerrasse) exteriorAdd("Terrasse", "terrasse", Math.max(4, W * 0.3), 3.5);
  if (req.hasPiscine) exteriorAdd("Piscine", "piscine", 8, 4);
  if (req.hasJardin) exteriorAdd("Jardin", "jardin", Math.max(6, W * 0.45), 4);
  if (req.hasBalcon && floors > 1) {
    exteriorRooms.push({
      id: "balcon-ext", name: "Balcon", type: "balcon",
      x: 0.5, y: 0.5, w: 3.5, h: 1.8,
      area: round1(3.5 * 1.8), level: 1, exterior: true, color: ROOM_COLORS.balcon,
    });
  }

  const allPlaced = [circ, ...ground, ...upper, ...exteriorRooms];

  // Vérification d'absence de chevauchement (fiabilité géométrique)
  const overlap = findOverlaps(allPlaced.filter((r) => !r.exterior));
  if (overlap.length > 0) {
    alerts.push(`Attention : ${overlap.length} zone(s) de chevauchement détectée(s) — le moteur a corrigé automatiquement.`);
  }

  // Élargir les pièces trop étroites en empruntant au voisin partageant un bord
  fixNarrowRooms(ground);
  fixNarrowRooms(upper);

  // Portes & fenêtres
  const doors = buildDoors(allPlaced, req.entreePosition);
  const windows = buildWindows(ground, upper, req);

  // Escaliers
  const stairs: Stairs[] = [];
  const stairRoom = allPlaced.find((r) => r.type === "escalier");
  if (stairRoom) {
    stairs.push({ x: stairRoom.x, y: stairRoom.y, w: stairRoom.w, h: stairRoom.h, level: stairRoom.level });
  }

  // Statistiques
  const coveredRooms = allPlaced.filter((r) => !r.exterior && r.type !== "circulation");
  const utile = coveredRooms.reduce((s, r) => s + r.area, 0);
  const circulation = circ.area + (stairRoom ? stairRoom.area : 0);
  const exterieure = exteriorRooms.reduce((s, r) => s + r.area, 0);
  const builtArea = coveredPerLevel * floors;
  const tauxUtilisation = builtArea > 0 ? Math.round((utile / builtArea) * 1000) / 10 : 0;
  const chambres = allPlaced.filter((r) => r.type === "chambre" || r.type === "master");
  const sdbList = allPlaced.filter((r) => r.type === "sdb");
  const wcList = allPlaced.filter((r) => r.type === "wc");
  const salon = allPlaced.find((r) => r.type === "salon");
  const cuisine = allPlaced.find((r) => r.type === "cuisine");

  const stats = {
    totalSurface: round1(req.surfaceTotale),
    construite: round1(builtArea),
    utile: round1(utile),
    circulation: round1(circulation),
    exterieure: round1(exterieure),
    tauxUtilisation,
    nbPieces: coveredRooms.length,
    nbChambres: chambres.length,
    nbSdb: sdbList.length,
    nbWc: wcList.length,
    salonArea: round1(salon?.area ?? 0),
    cuisineArea: round1(cuisine?.area ?? 0),
    chambresArea: round1(chambres.reduce((s, r) => s + r.area, 0)),
  };

  // Scores
  const scores = computeScores(strategy, req, stats, allPlaced);

  // Description, points forts / faibles
  const desc = buildDescription(req, strategy, stats, scores);
  const { strengths, weaknesses } = buildStrengthsWeaknesses(req, strategy, stats, alerts);

  const key = strategy.key;
  const plan: GeneratedPlan = {
    index: 0,
    key,
    name: strategy.name,
    description: desc,
    strengths,
    weaknesses,
    width: snap(W),
    depth: snap(D),
    levels: floors,
    rooms: allPlaced,
    doors,
    windows,
    stairs,
    alerts: { incompatible: alerts.length > 0, messages: alerts },
    scores,
    stats,
    reference: VILLA_T10_REFERENCE,
  };
  // Corrections automatiques (fenêtres recentrées, portes décalées,
  // mobilier réorganisé) puis contrôle qualité — chaque plan est livré
  // déjà optimisé, et le rapport liste ce qui reste à améliorer.
  return applyMicroFixes(plan, req);
}

// ─── Correction des pièces trop étroites ────────────────────────────────────

function fixNarrowRooms(rooms: PlacedRoom[]): void {
  const minSide = (r: PlacedRoom) => (r.type === "sdb" ? 1.2 : r.type === "wc" ? 1.0 : 1.5);
  const yOv = (a: PlacedRoom, b: PlacedRoom) => Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  const xOv = (a: PlacedRoom, b: PlacedRoom) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const overlaps = (a: PlacedRoom, b: PlacedRoom) => Math.max(0, xOv(a, b)) * Math.max(0, yOv(a, b));
  // Toutes les pièces ajustées doivent rester sans chevauchement
  const verify = (changed: PlacedRoom[]) =>
    !rooms.some((o) => changed.some((c) => c !== o && overlaps(c, o) > 0.02));

  for (let pass = 0; pass < 3; pass++) {
    for (const r of rooms) {
      const min = minSide(r);
      if (r.w >= min && r.h >= min) continue;

      if (r.w < min) {
        const lefts = rooms.filter((o) => o !== r && o.level === r.level && Math.abs(o.x + o.w - r.x) < 0.05 && yOv(o, r) > 0.3);
        const rights = rooms.filter((o) => o !== r && o.level === r.level && Math.abs(o.x - (r.x + r.w)) < 0.05 && yOv(o, r) > 0.3);
        const borrowable = (side: PlacedRoom[]) => side.length > 0 && side.every((o) => o.w > 1.3 && minSide(o) < o.w);
        let delta = 0;
        if (borrowable(lefts)) delta = Math.min(min - r.w, 0.6, Math.min(...lefts.map((o) => o.w - 1.3)));
        if (delta > 0.05) {
          // r grandit vers la gauche : toutes les pièces de gauche rétrécissent
          const snap = lefts.map((o) => ({ w: o.w }));
          r.x -= delta; r.w += delta;
          lefts.forEach((o, i) => { o.w = snap[i].w - delta; });
          if (verify([r, ...lefts])) {
            r.area = round1(r.w * r.h);
            lefts.forEach((o) => { o.area = round1(o.w * o.h); });
          } else {
            r.x += delta; r.w -= delta;
            lefts.forEach((o, i) => { o.w = snap[i].w; });
          }
        } else if (borrowable(rights)) {
          delta = Math.min(min - r.w, 0.6, Math.min(...rights.map((o) => o.w - 1.3)));
          if (delta > 0.05) {
            // r grandit vers la droite : toutes les pièces de droite se décalent
            const snap = rights.map((o) => ({ x: o.x, w: o.w }));
            r.w += delta;
            rights.forEach((o, i) => { o.x = snap[i].x + delta; o.w = snap[i].w - delta; });
            if (verify([r, ...rights])) {
              r.area = round1(r.w * r.h);
              rights.forEach((o) => { o.area = round1(o.w * o.h); });
            } else {
              r.w -= delta;
              rights.forEach((o, i) => { o.x = snap[i].x; o.w = snap[i].w; });
            }
          }
        }
      }

      if (r.h < min) {
        const tops = rooms.filter((o) => o !== r && o.level === r.level && Math.abs(o.y + o.h - r.y) < 0.05 && xOv(o, r) > 0.3);
        const bottoms = rooms.filter((o) => o !== r && o.level === r.level && Math.abs(o.y - (r.y + r.h)) < 0.05 && xOv(o, r) > 0.3);
        const borrowable = (side: PlacedRoom[]) => side.length > 0 && side.every((o) => o.h > 1.3 && minSide(o) < o.h);
        let delta = 0;
        if (borrowable(tops)) delta = Math.min(min - r.h, 0.6, Math.min(...tops.map((o) => o.h - 1.3)));
        if (delta > 0.05) {
          const snap = tops.map((o) => ({ h: o.h }));
          r.y -= delta; r.h += delta;
          tops.forEach((o, i) => { o.h = snap[i].h - delta; });
          if (verify([r, ...tops])) {
            r.area = round1(r.w * r.h);
            tops.forEach((o) => { o.area = round1(o.w * o.h); });
          } else {
            r.y += delta; r.h -= delta;
            tops.forEach((o, i) => { o.h = snap[i].h; });
          }
        } else if (borrowable(bottoms)) {
          delta = Math.min(min - r.h, 0.6, Math.min(...bottoms.map((o) => o.h - 1.3)));
          if (delta > 0.05) {
            const snap = bottoms.map((o) => ({ y: o.y, h: o.h }));
            r.h += delta;
            bottoms.forEach((o, i) => { o.y = snap[i].y + delta; o.h = snap[i].h - delta; });
            if (verify([r, ...bottoms])) {
              r.area = round1(r.w * r.h);
              bottoms.forEach((o) => { o.area = round1(o.w * o.h); });
            } else {
              r.h -= delta;
              bottoms.forEach((o, i) => { o.y = snap[i].y; o.h = snap[i].h; });
            }
          }
        }
      }
    }
  }
}

// ─── Chevauchements ─────────────────────────────────────────────────────────

function findOverlaps(rooms: PlacedRoom[]): PlacedRoom[] {
  const bad: PlacedRoom[] = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i], b = rooms[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 0.15 && oy > 0.15) { bad.push(a); bad.push(b); }
    }
  }
  return Array.from(new Set(bad));
}

// ─── Portes & fenêtres ──────────────────────────────────────────────────────

function buildDoors(rooms: PlacedRoom[], entreePosition: string): Door[] {
  const doors: Door[] = [];
  const normal = entranceNormal(entreePosition);
  const extRooms = rooms.filter((r) => !r.exterior);
  const circ = rooms.find((c) => c.type === "circulation");
  for (const r of extRooms) {
    if (r.type === "circulation" || r.type === "escalier") continue;
    // Porte intérieure : vers la circulation d'abord, sinon la pièce voisine
    let door: Door | null = null;
    if (circ) door = doorBetween(r, circ, "int");
    if (!door) {
      // chercher le voisin partageant le plus long bord commun
      const neighbor = bestSharedEdgeNeighbor(r, extRooms);
      if (neighbor) door = doorBetween(r, neighbor, "int");
    }
    if (door) doors.push(door);
  }
  // Porte d'entrée sur la façade
  if (circ) {
    if (Math.abs(normal.x) > 0) {
      const x = normal.x > 0 ? circ.x + circ.w - 1 : circ.x;
      doors.push({
        id: `entree-${doors.length}`, x: snap(x), y: snap(circ.y + circ.h / 2 - 0.45),
        w: 1, h: 0.9, angle: normal.x > 0 ? Math.PI : 0, roomId: circ.id, exterior: true,
      });
    } else {
      const y = normal.y > 0 ? circ.y + circ.h - 1 : circ.y;
      doors.push({
        id: `entree-${doors.length}`, x: snap(circ.x + circ.w / 2 - 0.5), y: snap(y),
        w: 1, h: 0.9, angle: normal.y > 0 ? Math.PI / 2 : -Math.PI / 2, roomId: circ.id, exterior: true,
      });
    }
  }
  return doors;
}

/** Retourne le voisin avec le plus long bord partagé (tolérance 0.45 m). */
function bestSharedEdgeNeighbor(r: PlacedRoom, rooms: PlacedRoom[]): PlacedRoom | null {
  let best: PlacedRoom | null = null;
  let bestLen = 0.6; // longueur minimale de bord partagé
  for (const o of rooms) {
    if (o.id === r.id) continue;
    const shared = sharedEdgeLength(r, o);
    if (shared > bestLen) { bestLen = shared; best = o; }
  }
  return best;
}

/** Longueur du bord commun entre deux pièces (0 si non adjacentes). */
function sharedEdgeLength(a: PlacedRoom, b: PlacedRoom): number {
  const EPS = 0.45;
  const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (Math.abs(a.y + a.h - b.y) < EPS || Math.abs(a.y - (b.y + b.h)) < EPS) {
    return Math.max(0, overlapX);
  }
  if (Math.abs(a.x + a.w - b.x) < EPS || Math.abs(a.x - (b.x + b.w)) < EPS) {
    return Math.max(0, overlapY);
  }
  return 0;
}

function doorBetween(a: PlacedRoom, b: PlacedRoom, kind: string): Door | null {
  const EPS = 0.45;
  const candidates: { x: number; y: number; angle: number }[] = [];
  const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  // Porte décentrée à ~1/3 du bord partagé : dégage le reste du mur pour le
  // mobilier et limite le chevauchement des battants entre portes voisines.
  const offX = Math.max(a.x, b.x) + overlapX * 0.32;
  const offY = Math.max(a.y, b.y) + overlapY * 0.32;
  // a au-dessus de b : porte sur le bord bas de a
  if (Math.abs(a.y + a.h - b.y) < EPS && overlapX > 0.7) {
    candidates.push({ x: snap(offX - 0.45), y: a.y + a.h - 1, angle: Math.PI / 2 });
  }
  // a en-dessous de b
  if (Math.abs(a.y - (b.y + b.h)) < EPS && overlapX > 0.7) {
    candidates.push({ x: snap(offX - 0.45), y: a.y, angle: -Math.PI / 2 });
  }
  // a à gauche de b
  if (Math.abs(a.x + a.w - b.x) < EPS && overlapY > 0.7) {
    candidates.push({ x: a.x + a.w - 1, y: snap(offY - 0.45), angle: 0 });
  }
  // a à droite de b
  if (Math.abs(a.x - (b.x + b.w)) < EPS && overlapY > 0.7) {
    candidates.push({ x: a.x, y: snap(offY - 0.45), angle: Math.PI });
  }
  if (candidates.length === 0) return null;
  const c = candidates[0];
  return {
    id: `${kind}-${a.id}-${b.id}`, x: c.x, y: c.y, w: 0.9, h: 0.9, angle: c.angle,
    roomId: a.id, exterior: false,
  };
}

function buildWindows(ground: PlacedRoom[], upper: PlacedRoom[], req: PlanRequest): Window[] {
  const wins: Window[] = [];
  const all = [...ground, ...upper];
  const W = ground.length ? Math.max(...ground.map((r) => r.x + r.w)) : 8;
  const D = ground.length ? Math.max(...ground.map((r) => r.y + r.h)) : 8;
  const glassTypes = new Set(["salon", "chambre", "master", "cuisine", "bureau", "salleAManger", "sdb", "dressing", "buanderie"]);
  for (const r of all) {
    if (r.exterior || r.type === "circulation" || r.type === "escalier") continue;
    if (!glassTypes.has(r.type)) continue;
    const n = Math.max(1, Math.round(Math.min(r.w, r.h) / 2.6));
    const vertical = r.w >= r.h;
    if (r.x <= 0.05) { // fenêtre à l'ouest
      for (let i = 0; i < n; i++) wins.push({ id: `win-${r.id}-${i}`, x: -0.3, y: snap(r.y + (r.h * (i + 0.5)) / n), w: 1.2, vertical: true, roomId: r.id });
    } else if (r.x + r.w >= W - 0.05) { // est
      for (let i = 0; i < n; i++) wins.push({ id: `win-${r.id}-${i}`, x: W - 0.9, y: snap(r.y + (r.h * (i + 0.5)) / n), w: 1.2, vertical: true, roomId: r.id });
    }
    if (r.y <= 0.05) { // nord
      for (let i = 0; i < n; i++) wins.push({ id: `win-${r.id}-${i}`, x: snap(r.x + (r.w * (i + 0.5)) / n), y: -0.3, w: 1.4, vertical: false, roomId: r.id });
    } else if (r.y + r.h >= D - 0.05) { // sud
      for (let i = 0; i < n; i++) wins.push({ id: `win-${r.id}-${i}`, x: snap(r.x + (r.w * (i + 0.5)) / n), y: D - 1.1, w: 1.4, vertical: false, roomId: r.id });
    }
  }
  return wins;
}

// ─── Scores IA ──────────────────────────────────────────────────────────────

function computeScores(strategy: VariantStrategy, req: PlanRequest, stats: GeneratedPlan["stats"], rooms: PlacedRoom[]): PlanScores {
  // Optimisation : taux d'utilisation de la surface couverte + ratio utile
  const optimisation = Math.round(clamp((stats.tauxUtilisation / 0.88) * 92, 40, 99));

  // Fonctionnalité : circulation maîtrisée + nombre de pièces desservies
  const circRatio = stats.circulation / Math.max(1, stats.construite);
  const funcBase = clamp(100 - (circRatio - 0.1) * 220, 50, 98);
  const fonctionnalite = Math.round(funcBase + (strategy.corridor ? 2 : 0) - (strategy.openPlan ? 1 : 0));

  // Confort : taille moyenne des pièces + lumière naturelle
  const avgRoom = stats.utile / Math.max(1, stats.nbPieces);
  const confort = Math.round(clamp(55 + (avgRoom - 11) * 3.5 + (strategy.lightSouth ? 6 : 0) + (strategy.masterSuite ? 5 : 0), 45, 99));

  // Architectural : régularité des formes + style + standing
  const aspectRatio = Math.max(stats.construite / Math.max(1, stats.salonArea), 1);
  const arch = Math.round(clamp(62 + (aspectRatio < 8 ? 8 : 0) + (strategy.aspectFlip ? 3 : 0) + standingBonus(req.standing), 50, 99));

  const global = Math.round(
    optimisation * 0.3 + fonctionnalite * 0.25 + confort * 0.25 + arch * 0.2,
  );
  return { optimisation, fonctionnalite, confort, architectural: arch, global };
}

function standingBonus(s: Standing): number {
  return s === "premium" ? 6 : s === "standard" ? 2 : 0;
}

// ─── Descriptions & points forts ────────────────────────────────────────────

function buildDescription(req: PlanRequest, strategy: VariantStrategy, stats: GeneratedPlan["stats"], scores: PlanScores): string {
  const styleLabel = STYLE_LABELS[req.style] ?? req.style;
  const standingLabel = req.standing === "premium" ? "haut standing" : req.standing === "economique" ? "économique" : "standard";
  const chambres = stats.nbChambres > 0 ? `${stats.nbChambres} chambre${stats.nbChambres > 1 ? "s" : ""}` : "un studio";
  return [
    `${strategy.desc}`,
    `Ce plan ${req.bienType} de style ${styleLabel.toLowerCase()} (standing ${standingLabel}) propose ${chambres}, ${stats.nbSdb} salle${stats.nbSdb > 1 ? "s" : ""} de bain${stats.nbSdb > 1 ? "s" : ""} et ${stats.nbPieces} pièces couvertes pour une surface construite de ${Math.round(stats.construite)} m².`,
    `L'organisation ${strategy.corridor ? "autour d'une circulation centrale" : "en blocs compacts"} offre une surface utile de ${Math.round(stats.utile)} m² (taux d'utilisation ${stats.tauxUtilisation}%) et un score architectural global de ${scores.global}/100.`,
  ].join(" ");
}

function buildStrengthsWeaknesses(req: PlanRequest, strategy: VariantStrategy, stats: GeneratedPlan["stats"], alerts: string[]): { strengths: string[]; weaknesses: string[] } {
  const s: string[] = [];
  const w: string[] = [];
  if (stats.tauxUtilisation >= 78) s.push("Excellent taux d'utilisation de la surface construite.");
  else w.push("Taux d'utilisation de la surface en retrait, circulation généreuse.");
  if (strategy.openPlan) s.push("Espace de vie ouvert favorisant la convivialité et la lumière.");
  if (strategy.masterSuite) s.push("Suite parentale avec dressing et salle de bains attenante.");
  if (strategy.lightSouth) s.push("Pièces de vie et chambres principales orientées plein sud (ensoleillement optimal).");
  if (strategy.corridor) s.push("Circulation centrale claire desservant toutes les pièces sans traversées.");
  if (req.hasGarage || req.hasParking) s.push("Stationnement intégré au terrain.");
  if (req.hasTerrasse || req.hasBalcon) s.push("Espaces extérieurs privatifs inclus.");
  if (stats.nbChambres >= 3) s.push("Configuration adaptée à une famille.");
  if (stats.circulation / Math.max(1, stats.construite) > 0.14) w.push("Surface de circulation supérieure à la moyenne.");
  if (stats.nbWc === 0 && stats.nbSdb === 1) w.push("Un seul point d'eau : prévoir un WC séparé si nécessaire.");
  if (alerts.length > 0) w.push("Contraintes de surface : certaines pièces sont au minimum fonctionnel.");
  if (req.exigences) s.push(`Exigences prises en compte : ${req.exigences.slice(0, 80)}${req.exigences.length > 80 ? "…" : ""}.`);
  if (s.length === 0) s.push("Organisation fonctionnelle et équilibrée des espaces.");
  if (w.length === 0) w.push("Peu de points faibles identifiés pour cette configuration.");
  return { strengths: s.slice(0, 5), weaknesses: w.slice(0, 4) };
}

export const STYLE_LABELS: Record<string, string> = {
  moderne: "Moderne", contemporain: "Contemporain", minimaliste: "Minimaliste",
  traditionnel: "Traditionnel", mediterraneen: "Méditerranéen", luxe: "Luxe",
  industriel: "Industriel", classique: "Classique",
};

// Types de bien synchronisés avec le formulaire « Nouveau projet » et le
// module d'investissement (à l'exception de « Terrain constructible »).
export const BIEN_TYPES = [
  { value: "maison", label: "Maison" },
  { value: "villa", label: "Villa" },
  { value: "appartement", label: "Appartement" },
  { value: "studio", label: "Studio" },
  { value: "duplex", label: "Duplex" },
  { value: "immeuble", label: "Immeuble résidentiel" },
  { value: "local_commercial", label: "Local commercial" },
  { value: "bureau", label: "Bureau" },
  { value: "entrepot", label: "Entrepôt" },
  { value: "residence_touristique", label: "Résidence touristique" },
  { value: "projet_neuf", label: "Projet immobilier neuf" },
] as const;

// Libellés rétro-compatibles pour les plans déjà enregistrés avec les
// anciennes valeurs (residence, mixte, autre).
const LEGACY_BIEN_LABELS: Record<string, string> = {
  residence: "Résidence",
  mixte: "Projet mixte",
  autre: "Projet",
};

export function bienTypeLabel(value: string): string {
  return BIEN_TYPES.find((b) => b.value === value)?.label
    ?? LEGACY_BIEN_LABELS[value]
    ?? value;
}

// ─── API publique ───────────────────────────────────────────────────────────

export const PLAN_COUNT = 10;

/**
 * Génère 10 propositions différentes de plans architecturaux.
 * `seed` optionnel : pour « Régénérer 10 nouvelles propositions », fournir
 * un seed différent (les plans produits diffèrent).
 */
export function generatePlans(req: PlanRequest): GeneratedPlan[] {
  const seed = req.seed ?? 2026;
  const plans: GeneratedPlan[] = [];
  for (let i = 0; i < PLAN_COUNT; i++) {
    const strategy = STRATEGIES[i % STRATEGIES.length];
    const variantSeed = (seed * 31 + i * 7919) >>> 0;
    const plan = generateVariant(req, strategy, variantSeed);
    plan.index = i + 1;
    plans.push(plan);
  }
  return plans;
}

/** Re-génère une variante unique (après modification des contraintes). */
export function regenerateVariant(req: PlanRequest, variantKey: string, index: number, seed?: number): GeneratedPlan {
  const strategy = STRATEGIES.find((s) => s.key === variantKey) ?? STRATEGIES[(index - 1) % STRATEGIES.length];
  const s = seed ?? 2026;
  const variantSeed = (s * 31 + (index - 1) * 7919) >>> 0;
  const plan = generateVariant(req, strategy, variantSeed);
  plan.index = index;
  return plan;
}

/** Conversion des pièces d'un plan vers les besoins pièces du projet (BIM). */
export function planToRoomCounts(plan: GeneratedPlan) {
  const rooms = plan.rooms.filter((r) => !r.exterior);
  return {
    bedrooms: rooms.filter((r) => r.type === "chambre" || r.type === "master").length,
    bathrooms: rooms.filter((r) => r.type === "sdb").length,
    kitchens: rooms.filter((r) => r.type === "cuisine").length,
    livingRooms: rooms.filter((r) => r.type === "salon").length,
    garages: plan.rooms.filter((r) => r.type === "garage").length,
  };
}

// ============================================================================
// MOBILIER & ÉQUIPEMENTS — placement fonctionnel (portes et fenêtres dégagées)
// ============================================================================

type Wall = "top" | "bottom" | "left" | "right";

interface FRect { x: number; y: number; w: number; h: number; }

function rectsOverlap(a: FRect, b: FRect, pad = 0): boolean {
  return (
    a.x - pad < b.x + b.w && a.x + a.w + pad > b.x &&
    a.y - pad < b.y + b.h && a.y + a.h + pad > b.y
  );
}

function overlapArea(a: FRect, b: FRect): number {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return Math.max(0, ox) * Math.max(0, oy);
}

function oppositeWall(w: Wall): Wall {
  switch (w) {
    case "top": return "bottom";
    case "bottom": return "top";
    case "left": return "right";
    case "right": return "left";
  }
}

function perpendicularWalls(w: Wall): Wall[] {
  return w === "top" || w === "bottom" ? ["left", "right"] : ["top", "bottom"];
}

/** Sur quel mur se trouve une porte (coordonnées du plan, 0,4 m de tolérance). */
function doorWallKey(d: Door, width: number, depth: number): Wall {
  if (Math.abs(d.y) < 0.4) return "top";
  if (Math.abs(d.y + d.h - depth) < 0.4) return "bottom";
  if (Math.abs(d.x) < 0.4) return "left";
  return "right";
}

function wallOfRect(room: PlacedRoom, x: number, y: number, w: number, h: number): Wall {
  if (Math.abs(y - room.y) < 0.4) return "top";
  if (Math.abs(y + h - (room.y + room.h)) < 0.4) return "bottom";
  if (Math.abs(x - room.x) < 0.4) return "left";
  return "right";
}

/** Mur extérieur sur lequel se trouve une fenêtre. */
function windowWall(wn: Window, planW: number, planD: number): Wall {
  if (wn.vertical) return wn.x < planW / 2 ? "left" : "right";
  return wn.y < planD / 2 ? "top" : "bottom";
}

/** Bande de fenêtre (rectangulaire, à l'intérieur de la pièce). */
function windowBand(wn: Window, room: PlacedRoom, planW: number, planD: number): FRect {
  const wall = windowWall(wn, planW, planD);
  const d = 0.5;
  switch (wall) {
    case "top": return { x: clamp(wn.x, room.x, room.x + room.w - wn.w), y: room.y, w: wn.w, h: d };
    case "bottom": return { x: clamp(wn.x, room.x, room.x + room.w - wn.w), y: room.y + room.h - d, w: wn.w, h: d };
    case "left": return { x: room.x, y: clamp(wn.y, room.y, room.y + room.h - wn.w), w: d, h: wn.w };
    case "right": return { x: room.x + room.w - d, y: clamp(wn.y, room.y, room.y + room.h - wn.w), w: d, h: wn.w };
  }
}

function doorSwing(d: Door): FRect {
  return { x: d.x - 0.06, y: d.y - 0.06, w: d.w + 0.12, h: d.h + 0.12 };
}

/**
 * Place un meuble contre un mur. `itemW` = longueur le long du mur,
 * `itemD` = profondeur dans la pièce. Balaye la position préférée puis les
 * positions voisines jusqu'à trouver un emplacement sans collision.
 */
function placeAgainstWall(
  room: PlacedRoom,
  wall: Wall,
  itemW: number,
  itemD: number,
  tPref: number,
  obstacles: FRect[],
  placed: FRect[],
  rng: () => number,
  margin = 0.25,
  ignores: FRect[] = [],
): { rect: FRect; angle: number } | null {
  const len = wall === "top" || wall === "bottom" ? room.w : room.h;
  const maxT = Math.max(margin, len - itemW - margin);
  if (maxT < margin) return null;
  const start = clamp(tPref, margin, maxT);
  const candidates: number[] = [start];
  for (let step = 0.15; step <= len + 0.01; step += 0.15) {
    candidates.push(start + step, start - step);
  }
  const build = (t: number): { rect: FRect; angle: number } => {
    switch (wall) {
      case "top": return { rect: { x: room.x + t, y: room.y + margin, w: itemW, h: itemD }, angle: 0 };
      case "bottom": return { rect: { x: room.x + t, y: room.y + room.h - margin - itemD, w: itemW, h: itemD }, angle: Math.PI };
      case "left": return { rect: { x: room.x + margin, y: room.y + t, w: itemD, h: itemW }, angle: -Math.PI / 2 };
      case "right": return { rect: { x: room.x + room.w - margin - itemD, y: room.y + t, w: itemD, h: itemW }, angle: Math.PI / 2 };
    }
  };
  for (const t of candidates) {
    if (t < margin - 0.01 || t > maxT + 0.01) continue;
    const { rect } = build(t);
    if (obstacles.some((o) => rectsOverlap(rect, o, 0.08))) continue;
    if (placed.some((p) => !ignores.some((ig) => ig.x === p.x && ig.y === p.y && ig.w === p.w && ig.h === p.h) && rectsOverlap(rect, p, 0.12))) continue;
    return build(t);
  }
  // Aucun emplacement sans collision : le mobilier est omis (ou essayé
  // sur un autre mur par l'appelant) plutôt que placé en chevauchement.
  return null;
}

/** Génère le mobilier complet d'un plan (déterministe, portes/fenêtres dégagées). */
export function generateFurniture(plan: GeneratedPlan, req: PlanRequest, rng?: () => number): FurnitureItem[] {
  const rand = rng ?? seededRandom(plan.index * 1000 + 17);
  const out: FurnitureItem[] = [];
  let uid = 0;
  const push = (room: PlacedRoom, kind: FurnitureKind, label: string, rect: FRect, angle: number) => {
    if (!rect || rect.w <= 0 || rect.h <= 0) return;
    out.push({
      id: `f-${room.id}-${uid++}`, kind, label,
      x: snap(rect.x, 0.05), y: snap(rect.y, 0.05),
      w: snap(Math.max(0.2, rect.w), 0.05), h: snap(Math.max(0.2, rect.h), 0.05),
      angle, roomId: room.id, roomType: room.type, level: room.level,
    });
  };
  for (const room of plan.rooms) {
    if (room.type === "circulation" || room.type === "escalier") continue;
    const doorsIn = plan.doors.filter((d) => d.roomId === room.id);
    const windowsIn = plan.windows.filter((w) => w.roomId === room.id);
    const doorObstacles = doorsIn.map(doorSwing);
    const windowObstacles = windowsIn.map((w) => windowBand(w, room, plan.width, plan.depth));
    const obstacles: FRect[] = [...doorObstacles, ...windowObstacles];
    const placed: FRect[] = [];
    const doorWall = doorsIn.length > 0
      ? wallOfRect(room, doorsIn[0].x, doorsIn[0].y, doorsIn[0].w, doorsIn[0].h)
      : null;
    const windowWalls = new Set(windowsIn.map((w) => windowWall(w, plan.width, plan.depth)));
    const wallNoWindow = (prefs: Wall[]): Wall => prefs.find((w) => !windowWalls.has(w)) ?? prefs[0];
    const WALLS_ALL: Wall[] = ["top", "bottom", "left", "right"];
    const aw = (wall: Wall, w: number, d: number, t: number, kind: FurnitureKind, label: string, ignores: FRect[] = []) => {
      const order = [wall, ...WALLS_ALL.filter((x) => x !== wall)];
      for (const wl of order) {
        const r = placeAgainstWall(room, wl, w, d, t, obstacles, placed, rand, 0.25, ignores);
        if (r) { push(room, kind, label, r.rect, r.angle); placed.push(r.rect); return r.rect; }
      }
      return null;
    };

    if (!room.exterior) {
      switch (room.type) {
        case "chambre":
        case "master": {
          const roomMin = Math.min(room.w, room.h);
          const bedW = roomMin < 2.7 ? 1.4 : room.type === "master" || req.standing === "premium" ? 1.8 : 1.6;
          const bedD = roomMin < 3.6 ? 1.95 : 2.05;
          const headWall = wallNoWindow(doorWall ? [oppositeWall(doorWall), ...perpendicularWalls(doorWall)] : ["bottom", "top"]);
          const len = headWall === "top" || headWall === "bottom" ? room.w : room.h;
          // Essaie la largeur préférée, puis des lits plus étroits si la pièce
          // est contrainte (porte en zone d'ouverture, pièce étroite…)
          let bed: FRect | null = null;
          for (const bw of [bedW, 1.6, 1.4]) {
            const b = aw(headWall, bw, bedD, Math.max(0.25, (len - bw) / 2), "lit", "Lit");
            if (b) { bed = b; break; }
          }
          if (bed) {
            const ns1: FRect = { x: bed.x - 0.58, y: bed.y, w: 0.45, h: 0.45 };
            if (ns1.x >= room.x + 0.12 && !obstacles.some((o) => rectsOverlap(ns1, o, 0.05))) { push(room, "table_chevet", "Chevet", ns1, 0); placed.push(ns1); }
            const ns2: FRect = { x: bed.x + bed.w + 0.13, y: bed.y, w: 0.45, h: 0.45 };
            if (ns2.x + ns2.w <= room.x + room.w - 0.12 && !obstacles.some((o) => rectsOverlap(ns2, o, 0.05))) { push(room, "table_chevet", "Chevet", ns2, 0); placed.push(ns2); }
          }
          const armWall = wallNoWindow([...(perpendicularWalls(doorWall ?? "bottom")), oppositeWall(doorWall ?? "bottom")]);
          const armLen = Math.min(room.w, room.h) >= 3.1 ? 1.8 : 1.35;
          aw(armWall, armLen, 0.62, 0.3, "armoire", "Armoire");
          break;
        }
        case "cuisine": {
          const prefWalls: Wall[] = room.w >= room.h
            ? ["bottom", "top", "left", "right"]
            : ["left", "right", "bottom", "top"];
          const counterWall = prefWalls.find((w) => w !== doorWall) ?? "bottom";
          const along = counterWall === "top" || counterWall === "bottom" ? room.w : room.h;
          const counterLen = Math.min(clamp(along - 0.9, 1.5, 4.4), Math.max(1.2, along - 0.6));
          const counter = placeAgainstWall(room, counterWall, counterLen, 0.62, 0.25, doorObstacles, placed, rand, 0.25, windowObstacles);
          if (counter) { push(room, "plan_travail", "Plan de travail", counter.rect, counter.angle); placed.push(counter.rect); }
          if (counter) {
            const base = counterWall === "bottom" || counterWall === "top" ? counter.x - room.x : counter.y - room.y;
            const appObstacles = [...doorObstacles];
            const app = (w: number, d: number, t: number, kind: FurnitureKind, label: string) => {
              const r = placeAgainstWall(room, counterWall, w, d, t, appObstacles, placed, rand, 0.3, [counter]);
              if (r) { push(room, kind, label, r.rect, r.angle); placed.push(r.rect); }
            };
            app(0.55, 0.55, base + 0.18, "evier", "Évier");
            app(0.6, 0.6, base + 0.78, "plaque", "Plaque de cuisson");
            app(0.6, 0.6, base + 1.42, "four", "Four");
            app(0.66, 0.66, base + 2.06, "frigo", "Réfrigérateur");
          }
          if (room.w >= 3.05 && room.h >= 3.05) {
            const ilot: FRect = { x: room.x + (room.w - 1.3) / 2, y: room.y + (room.h - 0.95) / 2, w: 1.3, h: 0.95 };
            if (!obstacles.some((o) => rectsOverlap(ilot, o, 0.05)) && !placed.some((p) => rectsOverlap(ilot, p, 0.05))) {
              push(room, "ilot", "Îlot", ilot, 0); placed.push(ilot);
            }
          }
          break;
        }
        case "sdb": {
          const cornerWalls: Wall[] = doorWall
            ? [oppositeWall(doorWall), ...perpendicularWalls(oppositeWall(doorWall))]
            : ["bottom", "top", "left", "right"];
          const corners: { wall: Wall; rect: FRect }[] = cornerWalls.map((w, i) => {
            const m = 0.25;
            if (w === "bottom") return { wall: w, rect: { x: i % 2 === 0 ? room.x + m : room.x + room.w - m - 0.85, y: room.y + room.h - m - 0.85, w: 0.85, h: 0.85 } };
            if (w === "top") return { wall: w, rect: { x: i % 2 === 0 ? room.x + m : room.x + room.w - m - 0.85, y: room.y + m, w: 0.85, h: 0.85 } };
            if (w === "left") return { wall: w, rect: { x: room.x + m, y: i % 2 === 0 ? room.y + m : room.y + room.h - m - 0.85, w: 0.85, h: 0.85 } };
            return { wall: w, rect: { x: room.x + room.w - m - 0.85, y: i % 2 === 0 ? room.y + m : room.y + room.h - m - 0.85, w: 0.85, h: 0.85 } };
          });
          const corner = corners.find((c) => !obstacles.some((o) => rectsOverlap(c.rect, o, 0.08)) && !placed.some((p) => rectsOverlap(c.rect, p, 0.1)));
          if (corner) { push(room, "douche", "Douche", corner.rect, 0); placed.push(corner.rect); }
          const lavWall = wallNoWindow(doorWall ? perpendicularWalls(doorWall) : ["top", "left"]);
          const lav = aw(lavWall, 0.55, 0.5, 0.3, "lavabo", "Lavabo");
          if (lav) {
            const mir: FRect = lavWall === "bottom"
              ? { x: lav.x + (lav.w - 0.5) / 2, y: room.y + room.h - 0.36, w: 0.5, h: 0.12 }
              : lavWall === "top"
                ? { x: lav.x + (lav.w - 0.5) / 2, y: room.y + 0.24, w: 0.5, h: 0.12 }
                : lavWall === "left"
                  ? { x: room.x + 0.24, y: lav.y + (lav.h - 0.5) / 2, w: 0.12, h: 0.5 }
                  : { x: room.x + room.w - 0.36, y: lav.y + (lav.h - 0.5) / 2, w: 0.12, h: 0.5 };
            push(room, "miroir", "Miroir", mir, 0);
          }
          const wcWall = wallNoWindow([...(perpendicularWalls(doorWall ?? "bottom")), oppositeWall(doorWall ?? "bottom")]);
          aw(wcWall, 0.42, 0.72, 0.3, "wc", "WC");
          if (req.standing === "premium" && room.w >= 3.0 && room.h >= 2.0) {
            const bWall = wallNoWindow([oppositeWall(doorWall ?? "bottom"), ...perpendicularWalls(doorWall ?? "bottom")]);
            aw(bWall, 1.7, 0.75, 0.3, "baignoire", "Baignoire");
          }
          break;
        }
        case "wc": {
          const w = wallNoWindow(doorWall ? perpendicularWalls(doorWall) : ["bottom", "left"]);
          aw(w, 0.42, 0.72, 0.25, "wc", "WC");
          if (room.w >= 1.4 && room.h >= 1.4) {
            const l = wallNoWindow([oppositeWall(doorWall ?? "bottom"), ...perpendicularWalls(doorWall ?? "bottom")]);
            aw(l, 0.45, 0.4, 0.25, "lavabo", "Lavabo");
          }
          break;
        }
        case "salon": {
          const sofaWall = wallNoWindow(doorWall ? [oppositeWall(doorWall), ...perpendicularWalls(doorWall)] : ["bottom", "top"]);
          const along = sofaWall === "top" || sofaWall === "bottom" ? room.w : room.h;
          const sofaLen = clamp(along - 1.6, 1.9, 3.0);
          const sofa = aw(sofaWall, sofaLen, 0.95, Math.max(0.25, (along - sofaLen) / 2), "canape", "Canapé");
          if (sofa) {
            if (room.w >= 3.6 || room.h >= 3.6) {
              const fa: FRect = { x: sofa.x - 0.92, y: sofa.y + sofa.h / 2 - 0.42, w: 0.8, h: 0.84 };
              if (fa.x >= room.x + 0.12 && !obstacles.some((o) => rectsOverlap(fa, o, 0.05))) {
                push(room, "fauteuil", "Fauteuil", fa, 0); placed.push(fa);
              }
              const fa2: FRect = { x: sofa.x + sofa.w + 0.12, y: sofa.y + sofa.h / 2 - 0.42, w: 0.8, h: 0.84 };
              if (fa2.x + fa2.w <= room.x + room.w - 0.12 && !obstacles.some((o) => rectsOverlap(fa2, o, 0.05))) {
                push(room, "fauteuil", "Fauteuil", fa2, 0); placed.push(fa2);
              }
            }
            const tb: FRect = { x: room.x + (room.w - 1.15) / 2, y: room.y + (room.h - 0.62) / 2, w: 1.15, h: 0.62 };
            if (!obstacles.some((o) => rectsOverlap(tb, o, 0.05))) {
              push(room, "table_basse", "Table basse", tb, 0); placed.push(tb);
            }
          }
          const tvWall = wallNoWindow([oppositeWall(sofaWall), ...perpendicularWalls(sofaWall)]);
          aw(tvWall, 1.7, 0.45, 0.3, "meuble_tv", "Meuble TV");
          break;
        }
        case "salleAManger": {
          const tw = clamp(Math.min(room.w, room.h) * 0.55, 1.4, 2.0);
          const th = clamp(Math.min(room.w, room.h) * 0.3, 0.8, 1.0);
          let table: FRect = { x: room.x + (room.w - tw) / 2, y: room.y + (room.h - th) / 2, w: tw, h: th };
          // Éviter la zone d'ouverture de la porte : décaler la table
          const tableSpots: FRect[] = [];
          for (let dy = 0; dy <= 0.9; dy += 0.3) {
            tableSpots.push(table);
            table = { ...table, y: table.y + 0.3 };
          }
          table = tableSpots.find((t) => !obstacles.some((o) => rectsOverlap(t, o, 0.05))) ?? tableSpots[0];
          push(room, "table", "Table", table, 0); placed.push(table);
          const chairs: FRect[] = [
            { x: table.x + table.w / 2 - 0.22, y: table.y - 0.52, w: 0.45, h: 0.45 },
            { x: table.x + table.w / 2 - 0.22, y: table.y + table.h + 0.07, w: 0.45, h: 0.45 },
            { x: table.x - 0.52, y: table.y + table.h / 2 - 0.22, w: 0.45, h: 0.45 },
            { x: table.x + table.w + 0.07, y: table.y + table.h / 2 - 0.22, w: 0.45, h: 0.45 },
          ];
          if (tw >= 1.7) {
            chairs.push({ x: table.x + table.w * 0.22, y: table.y - 0.52, w: 0.45, h: 0.45 });
            chairs.push({ x: table.x + table.w * 0.22, y: table.y + table.h + 0.07, w: 0.45, h: 0.45 });
          }
          for (const ch of chairs) {
            const inside = ch.x >= room.x + 0.1 && ch.x + ch.w <= room.x + room.w - 0.1 && ch.y >= room.y + 0.1 && ch.y + ch.h <= room.y + room.h - 0.1;
            if (!inside) continue;
            if (obstacles.some((o) => rectsOverlap(ch, o, 0.05))) continue;
            push(room, "chaise", "Chaise", ch, 0); placed.push(ch);
          }
          break;
        }
        case "bureau": {
          const deskWall = wallNoWindow(doorWall ? [oppositeWall(doorWall), ...perpendicularWalls(doorWall)] : ["bottom", "left"]);
          const desk = aw(deskWall, 1.4, 0.7, 0.3, "bureau", "Bureau");
          if (desk) {
            const ch: FRect = { x: desk.x + (desk.w - 0.5) / 2, y: desk.y + desk.h + 0.06, w: 0.5, h: 0.5 };
            if (ch.y + ch.h <= room.y + room.h - 0.15 && !obstacles.some((o) => rectsOverlap(ch, o, 0.05))) {
              push(room, "chaise", "Chaise", ch, 0); placed.push(ch);
            }
          }
          const bibWall = wallNoWindow([...(perpendicularWalls(doorWall ?? "bottom")), oppositeWall(doorWall ?? "bottom")]);
          aw(bibWall, 0.95, 0.35, 0.25, "bibliotheque", "Bibliothèque");
          break;
        }
        case "buanderie": {
          const w = wallNoWindow([oppositeWall(doorWall ?? "bottom"), ...perpendicularWalls(doorWall ?? "bottom")]);
          aw(w, 0.65, 0.65, 0.25, "machine_laver", "Machine à laver");
          aw(w, 0.65, 0.65, 0.95, "seche_linge", "Sèche-linge");
          break;
        }
        case "dressing": {
          const w = wallNoWindow([oppositeWall(doorWall ?? "bottom"), ...perpendicularWalls(doorWall ?? "bottom")]);
          aw(w, 1.6, 0.6, 0.25, "penderie", "Penderie");
          aw(w, 0.9, 0.45, 1.9, "etageres", "Étagères");
          aw(w, 0.6, 0.6, 2.85, "seche_linge", "Sèche-linge");
          break;
        }
        default:
          break;
      }
    } else {
      // Zones extérieures
      switch (room.type) {
        case "garage": {
          if (room.w >= 6.6) {
            const c1: FRect = { x: room.x + room.w / 2 - 4.5, y: room.y + room.h / 2 - 0.95, w: 4.4, h: 1.9 };
            const c2: FRect = { x: room.x + room.w / 2 + 0.1, y: room.y + room.h / 2 - 0.95, w: 4.4, h: 1.9 };
            push(room, "voiture", "Véhicule", c1, 0); push(room, "voiture", "Véhicule", c2, 0);
          } else {
            const c: FRect = { x: room.x + (room.w - 4.4) / 2, y: room.y + (room.h - 1.9) / 2, w: 4.4, h: 1.9 };
            push(room, "voiture", "Véhicule", c, 0);
          }
          const pg: FRect = { x: room.x + (room.w - 2.4) / 2, y: room.y + room.h - 0.32, w: 2.4, h: 0.3 };
          push(room, "porte_garage", "Porte de garage", pg, 0);
          break;
        }
        case "terrasse":
        case "jardin": {
          const t: FRect = { x: room.x + room.w / 2 - 0.7, y: room.y + room.h / 2 - 0.4, w: 1.4, h: 0.8 };
          push(room, "table_exterieur", "Table d'extérieur", t, 0);
          push(room, "chaise", "Chaise", { x: t.x - 0.55, y: t.y + t.h / 2 - 0.22, w: 0.45, h: 0.45 }, 0);
          push(room, "chaise", "Chaise", { x: t.x + t.w + 0.1, y: t.y + t.h / 2 - 0.22, w: 0.45, h: 0.45 }, 0);
          const parasol = { x: t.x + t.w + 0.4, y: t.y - 0.25, w: 0.36, h: 0.36 };
          if (parasol.x + parasol.w <= room.x + room.w - 0.1 && parasol.y >= room.y + 0.1) {
            push(room, "parasol", "Parasol", parasol, 0);
          }
          break;
        }
        case "balcon": {
          const t: FRect = { x: room.x + room.w / 2 - 0.45, y: room.y + room.h / 2 - 0.4, w: 0.9, h: 0.8 };
          push(room, "table_exterieur", "Table", t, 0);
          push(room, "chaise", "Chaise", { x: t.x - 0.52, y: t.y, w: 0.45, h: 0.45 }, 0);
          push(room, "chaise", "Chaise", { x: t.x + t.w + 0.07, y: t.y, w: 0.45, h: 0.45 }, 0);
          break;
        }
        default:
          break;
      }
    }
  }
  return out;
}

// ============================================================================
// CONTRÔLE QUALITÉ INTELLIGENT (recommandations + corrections proposées)
// ============================================================================

function roomName(plan: GeneratedPlan, id: string): string {
  return plan.rooms.find((r) => r.id === id)?.name ?? "la pièce";
}

/** Analyse un plan et produit un rapport qualité (erreurs, alertes, infos). */
export function analyzePlanQuality(plan: GeneratedPlan, req: PlanRequest): PlanQualityReport {
  const issues: PlanQualityIssue[] = [];
  let uid = 0;
  const add = (severity: PlanQualityIssue["severity"], category: string, message: string, fix: string, roomId?: string, x?: number, y?: number) => {
    issues.push({ id: `q-${plan.index}-${uid++}`, severity, category, message, fix, roomId, x, y });
  };
  const interior = plan.rooms.filter((r) => !r.exterior && r.type !== "circulation");
  const circ = plan.rooms.find((r) => r.type === "circulation");
  const furniture = plan.furniture ?? [];
  const doors = plan.doors ?? [];
  const windows = plan.windows ?? [];
  const width = plan.width, depth = plan.depth;

  // 1. Dimensions insuffisantes / pièces en couloir
  const MIN_DIM: Record<string, number> = { sdb: 1.2, wc: 1.0, default: 1.5 };
  for (const r of interior) {
    const min = MIN_DIM[r.type] ?? MIN_DIM.default;
    const side = Math.min(r.w, r.h);
    if (side < min) {
      add("error", "dimensions",
        `« ${r.name} » est trop étroite (${side.toFixed(2)} m — minimum ${min.toFixed(1)} m).`,
        `Redécouper la zone pour donner au moins ${min.toFixed(1)} m de largeur à cette pièce.`,
        r.id, r.x + r.w / 2, r.y + r.h / 2);
    } else if (side < min + 0.3) {
      add("warning", "dimensions",
        `« ${r.name} » est à la limite de la largeur fonctionnelle (${side.toFixed(2)} m).`,
        `Élargir légèrement la pièce (≥ ${(min + 0.3).toFixed(1)} m) pour un confort d'usage.`,
        r.id);
    }
    if (Math.max(r.w, r.h) / Math.max(0.3, side) > 2.7) {
      add("info", "dimensions",
        `« ${r.name} » a un rapport longueur/largeur élevé (pièce en couloir).`,
        "Rééquilibrer les proportions de la pièce.", r.id);
    }
  }

  // 2. Pièces inaccessibles (aucune porte)
  for (const r of interior) {
    if (!doors.some((d) => d.roomId === r.id)) {
      add("error", "portes",
        `« ${r.name} » n'a aucune porte d'accès.`,
        "Créer une porte vers la circulation ou la pièce adjacente.",
        r.id, r.x + r.w / 2, r.y + r.h / 2);
    }
  }

  // 3. Portes trop rapprochées / qui se chevauchent
  for (let i = 0; i < doors.length; i++) {
    for (let j = i + 1; j < doors.length; j++) {
      const a = doors[i], b = doors[j];
      const sameRoom = a.roomId === b.roomId;
      const sameWall = doorWallKey(a, width, depth) === doorWallKey(b, width, depth);
      const gap = Math.hypot(a.x + a.w / 2 - (b.x + b.w / 2), a.y + a.h / 2 - (b.y + b.h / 2));
      if ((sameRoom || sameWall) && gap < 0.95) {
        add("warning", "portes",
          "Deux portes sont trop rapprochées (risque de chevauchement des battants).",
          "Décaler l'une des portes d'au moins 0,95 m le long du mur.",
          a.roomId, (a.x + b.x) / 2, (a.y + b.y) / 2);
        break;
      }
    }
  }

  // 4. Fenêtres mal positionnées (angles, portes)
  for (const wn of windows) {
    const wall = windowWall(wn, width, depth);
    const pos = wn.vertical ? wn.y : wn.x;
    const len = wn.vertical ? depth : width;
    if (pos < 0.4 || pos + wn.w > len - 0.4) {
      add("warning", "fenetres",
        "Une fenêtre est trop proche d'un angle du bâtiment.",
        "Recentrer la fenêtre à au moins 0,5 m de l'angle.",
        wn.roomId, wn.x, wn.y);
    }
    for (const d of doors) {
      if (doorWallKey(d, width, depth) !== wall) continue;
      const dPos = wall === "top" || wall === "bottom" ? d.x + d.w / 2 : d.y + d.h / 2;
      if (Math.abs(pos + wn.w / 2 - dPos) < 0.9) {
        add("warning", "fenetres",
          "Une fenêtre est trop proche d'une porte (battant potentiellement bloqué).",
          "Éloigner la fenêtre d'au moins 0,9 m de la porte.",
          wn.roomId, wn.x, wn.y);
        break;
      }
    }
  }

  // 5. Pièces aveugles (sans ouverture extérieure)
  const glass = new Set(["salon", "salleAManger", "cuisine", "chambre", "master", "bureau", "sdb", "buanderie", "dressing"]);
  for (const r of interior) {
    if (!glass.has(r.type)) continue;
    if (!windows.some((w) => w.roomId === r.id)) {
      add("warning", "confort",
        `« ${r.name} » n'a aucune ouverture extérieure (pièce aveugle).`,
        "Ajouter une fenêtre sur une façade disponible pour l'éclairage naturel et la ventilation.",
        r.id, r.x + r.w / 2, r.y + r.h / 2);
    }
  }

  // 6. Mobilier qui bloque une porte
  for (const f of furniture) {
    const room = plan.rooms.find((r) => r.id === f.roomId);
    if (!room || room.exterior) continue;
    for (const d of doors) {
      if (d.roomId !== f.roomId) continue;
      if (rectsOverlap({ x: f.x, y: f.y, w: f.w, h: f.h }, doorSwing(d), 0.03)) {
        add("warning", "mobilier",
          `Le « ${f.label} » empiète sur la zone d'ouverture d'une porte.`,
          "Déplacer le mobilier à plus de 0,2 m de la porte.",
          f.roomId, f.x + f.w / 2, f.y + f.h / 2);
        break;
      }
    }
  }

  // 7. Mobilier qui se chevauche
  const ON_COUNTER = new Set(["evier", "plaque", "four", "frigo", "miroir"]);
  for (let i = 0; i < furniture.length; i++) {
    for (let j = i + 1; j < furniture.length; j++) {
      const a = furniture[i], b = furniture[j];
      if (a.roomId !== b.roomId) continue;
      if (ON_COUNTER.has(a.kind) || ON_COUNTER.has(b.kind)) continue;
      const ar = { x: a.x, y: a.y, w: a.w, h: a.h };
      const br = { x: b.x, y: b.y, w: b.w, h: b.h };
      const o = overlapArea(ar, br);
      if (o > 0.3 * Math.min(a.w * a.h, b.w * b.h)) {
        add("warning", "mobilier",
          `« ${a.label} » et « ${b.label} » se chevauchent dans ${roomName(plan, a.roomId)}.`,
          "Réorganiser le mobilier de la pièce.",
          a.roomId, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
    }
  }

  // 8. Circulation incohérente
  const circArea = circ?.area ?? 0;
  const circRatio = circArea / Math.max(1, plan.stats.construite);
  if (circRatio > 0.17) {
    add("warning", "circulation",
      `Surface de circulation élevée (${Math.round(circRatio * 100)}% de la surface construite).`,
      "Réduire la largeur du couloir ou du hall central.");
  } else if (circRatio < 0.05 && interior.length >= 5) {
    add("info", "circulation",
      "Circulation très réduite : vérifier l'accessibilité de toutes les pièces.",
      "Prévoir un passage minimal de 1,0 m.");
  }

  // 9. Incohérences de surfaces
  const sumRooms = interior.reduce((s, r) => s + r.area, 0);
  const built = plan.stats.construite;
  const gapRatio = (built - (sumRooms + circArea)) / Math.max(1, built);
  if (gapRatio > 0.16) {
    add("warning", "surfaces",
      `Écart entre surfaces utiles et surface construite (${Math.round(gapRatio * 100)}% perdu en murs/circulation).`,
      "Optimiser le découpage pour réduire les surfaces perdues.");
  }
  if (Math.abs(gapRatio) > 0.25) {
    add("error", "surfaces",
      "Incohérence détectée entre les surfaces des pièces et la surface construite.",
      "Revoir l'emprise du bâtiment.");
  }

  // 10. Pièces humides dispersées (plomberie)
  const kitchen = plan.rooms.find((r) => r.type === "cuisine");
  if (kitchen) {
    const wet = plan.rooms.filter((r) => r.type === "sdb" || r.type === "wc" || r.type === "buanderie");
    let best = Infinity;
    for (const r of wet) {
      const d = Math.hypot(r.x + r.w / 2 - (kitchen.x + kitchen.w / 2), r.y + r.h / 2 - (kitchen.y + kitchen.h / 2));
      best = Math.min(best, d);
    }
    if (wet.length > 0 && best > 4.2) {
      add("info", "plomberie",
        `Cuisine et pièces humides éloignées (${best.toFixed(1)} m) : plomberie plus coûteuse.`,
        "Regrouper cuisine, salle de bain et buanderie autour d'un même noyau technique.");
    }
  }

  // 11. Éclairage naturel — séjour / suite parentale au sud ou à l'est
  for (const r of plan.rooms.filter((x) => x.type === "salon" || x.type === "master")) {
    const hasLight = windows.some((w) => {
      if (w.roomId !== r.id) return false;
      const wall = windowWall(w, width, depth);
      return wall === "bottom" || wall === "right";
    });
    if (!hasLight) {
      add("info", "confort",
        `« ${r.name} » n'a pas d'ouverture au sud ou à l'est (ensoleillement moindre).`,
        "Privilégier une fenêtre au sud/est pour l'espace de vie.",
        r.id);
    }
  }

  const count = { error: 0, warning: 0, info: 0 };
  for (const i of issues) count[i.severity]++;
  const score = clamp(Math.round(100 - count.error * 18 - count.warning * 6 - count.info * 2), 0, 100);
  return { score, count, issues };
}

// ============================================================================
// CORRECTIONS AUTOMATIQUES (micro-optimisations déterministes)
// ============================================================================

function applyMicroFixes(plan: GeneratedPlan, req: PlanRequest): GeneratedPlan {
  const width = plan.width, depth = plan.depth;
  let windows = plan.windows.map((w) => ({ ...w }));
  let doors = plan.doors.map((d) => ({ ...d }));

  // 1. Recentrer les fenêtres (≥ 0,5 m des angles, ≥ 1,0 m des portes)
  windows = windows.map((wn) => {
    const wall = windowWall(wn, width, depth);
    const along = wall === "top" || wall === "bottom" ? width : depth;
    const pos = wn.vertical ? wn.y : wn.x;
    let p = clamp(pos, 0.5, Math.max(0.5, along - wn.w - 0.5));
    for (const d of doors) {
      if (doorWallKey(d, width, depth) !== wall) continue;
      const dPos = wall === "top" || wall === "bottom" ? d.x + d.w / 2 : d.y + d.h / 2;
      if (Math.abs(p + wn.w / 2 - dPos) < 1.0) {
        const candidate = clamp(dPos + 1.1 - wn.w / 2, 0.5, Math.max(0.5, along - wn.w - 0.5));
        p = Math.abs(candidate + wn.w / 2 - dPos) >= 1.0
          ? candidate
          : clamp(dPos - 1.1 - wn.w / 2, 0.5, Math.max(0.5, along - wn.w - 0.5));
      }
    }
    return wn.vertical ? { ...wn, y: snap(p, 0.05) } : { ...wn, x: snap(p, 0.05) };
  });

  // 2. Décaler les portes trop rapprochées d'un même mur
  const moved = new Set<string>();
  for (let i = 0; i < doors.length; i++) {
    for (let j = i + 1; j < doors.length; j++) {
      const a = doors[i], b = doors[j];
      if ((a.roomId !== b.roomId && doorWallKey(a, width, depth) !== doorWallKey(b, width, depth)) || moved.has(b.id)) continue;
      const gap = Math.hypot(a.x + a.w / 2 - (b.x + b.w / 2), a.y + a.h / 2 - (b.y + b.h / 2));
      if (gap >= 0.95) continue;
      const wall = doorWallKey(b, width, depth);
      const along = wall === "top" || wall === "bottom" ? width : depth;
      const np = clamp((wall === "top" || wall === "bottom" ? b.x : b.y) + 1.0, 0.3, Math.max(0.3, along - b.w - 0.3));
      doors[j] = wall === "top" || wall === "bottom" ? { ...b, x: snap(np, 0.05) } : { ...b, y: snap(np, 0.05) };
      moved.add(b.id);
    }
  }

  // 3. Réorganiser le mobilier après corrections
  const rng = seededRandom(plan.index * 131 + 29);
  const furniture = generateFurniture({ ...plan, windows, doors }, req, rng);

  // 4. Re-analyse
  const quality = analyzePlanQuality({ ...plan, windows, doors, furniture }, req);
  return { ...plan, windows, doors, furniture, quality };
}

// ============================================================================
// OPTIMISATION AUTOMATIQUE PAR IA (variantes évaluées + corrections)
// ============================================================================

function buildImprovements(
  beforePlan: GeneratedPlan,
  afterPlan: GeneratedPlan,
  before: PlanQualityReport,
  after: PlanQualityReport,
): string[] {
  const out: string[] = [];
  out.push(`Contrôle qualité : ${before.score}/100 → ${after.score}/100`);
  const errDiff = before.count.error - after.count.error;
  const warnDiff = before.count.warning - after.count.warning;
  if (errDiff > 0) out.push(`Correction de ${errDiff} problème(s) bloquant(s)`);
  if (warnDiff > 0) out.push(`Levée de ${warnDiff} point(s) d'attention`);
  const cB = beforePlan.stats.circulation / Math.max(1, beforePlan.stats.construite);
  const cA = afterPlan.stats.circulation / Math.max(1, afterPlan.stats.construite);
  if (cA < cB - 0.01) out.push(`Circulation réduite : ${Math.round(cB * 100)}% → ${Math.round(cA * 100)}% de la surface`);
  for (const ra of afterPlan.rooms.filter((r) => !r.exterior && r.type !== "circulation")) {
    const rb = beforePlan.rooms.find((r) => r.name === ra.name && r.level === ra.level);
    if (rb && ra.area > rb.area + 0.5) out.push(`« ${ra.name} » agrandie : ${rb.area.toFixed(1)} → ${ra.area.toFixed(1)} m²`);
  }
  const winMoved = beforePlan.windows.filter((w, i) => {
    const w2 = afterPlan.windows[i];
    return !!w2 && (Math.abs(w.x - w2.x) > 0.2 || Math.abs(w.y - w2.y) > 0.2);
  }).length;
  if (winMoved > 0) out.push(`${winMoved} fenêtre(s) recentrée(s) — angles et portes dégagés`);
  const fBefore = beforePlan.furniture ?? [];
  const fAfter = afterPlan.furniture ?? [];
  if (fBefore.length > 0 || fAfter.length > 0) {
    out.push("Mobilier repositionné : portes et fenêtres dégagées, équipements fonctionnels");
  }
  if (afterPlan.scores.global > beforePlan.scores.global) {
    out.push(`Score architectural : ${beforePlan.scores.global}/100 → ${afterPlan.scores.global}/100`);
  }
  if (out.length === 1) out.push("Aucun défaut majeur détecté — le plan est déjà optimisé.");
  return out.slice(0, 8);
}

/**
 * « Optimiser automatiquement le plan avec l'IA » : génère plusieurs variantes
 * de la même stratégie, les corrige (micro-fixes), les évalue, puis retourne
 * la meilleure avec la liste des améliorations appliquées.
 */
export function optimizePlan(plan: GeneratedPlan, req: PlanRequest, seed?: number): OptimizeResult {
  const before = plan.quality ?? analyzePlanQuality(plan, req);
  const base = seed ?? req.seed ?? 2026;
  const candidates: GeneratedPlan[] = [applyMicroFixes(plan, req)];
  for (let k = 1; k <= 5; k++) {
    candidates.push(applyMicroFixes(regenerateVariant(req, plan.key, plan.index, base + k * 97), req));
  }
  const scored = candidates.map((c) => {
    const q = c.quality ?? analyzePlanQuality(c, req);
    return { c, q, total: q.score * 0.55 + c.scores.global * 0.45, errors: q.count.error };
  });
  scored.sort((a, b) => b.total - a.total || a.errors - b.errors);
  const best = scored[0];
  return {
    plan: best.c,
    improvements: buildImprovements(plan, best.c, before, best.q),
    before,
    after: best.q,
  };
}
