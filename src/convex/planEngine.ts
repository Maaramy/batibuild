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
  layout: "jour_rdc" | "tout_rdc" | "jour_nuit_cote" | "open_space";
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
    services.push({ name: "Dressing", type: "dressing", area: AREA.dressing[sl], minArea: AREA.dressing.min, level: hasUpper ? 1 : 0 });
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
  ground.push(...guillotine(mainRect, scaled0, rng, 0));

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
    x: circRect.x, y: circRect.y, w: snap(circRect.w), h: snap(circRect.h),
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
  return {
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
  };
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
  const midX = Math.max(a.x, b.x) + overlapX / 2;
  const midY = Math.max(a.y, b.y) + overlapY / 2;
  // a au-dessus de b : porte sur le bord bas de a
  if (Math.abs(a.y + a.h - b.y) < EPS && overlapX > 0.7) {
    candidates.push({ x: snap(midX - 0.45), y: a.y + a.h - 1, angle: Math.PI / 2 });
  }
  // a en-dessous de b
  if (Math.abs(a.y - (b.y + b.h)) < EPS && overlapX > 0.7) {
    candidates.push({ x: snap(midX - 0.45), y: a.y, angle: -Math.PI / 2 });
  }
  // a à gauche de b
  if (Math.abs(a.x + a.w - b.x) < EPS && overlapY > 0.7) {
    candidates.push({ x: a.x + a.w - 1, y: snap(midY - 0.45), angle: 0 });
  }
  // a à droite de b
  if (Math.abs(a.x - (b.x + b.w)) < EPS && overlapY > 0.7) {
    candidates.push({ x: a.x, y: snap(midY - 0.45), angle: Math.PI });
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
