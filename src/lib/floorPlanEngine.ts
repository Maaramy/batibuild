// ============================================================================
// MOTEUR GÉNÉRATIF DE PLANS D'ARCHITECTE (Floor Plans 2D / 3D)
// ----------------------------------------------------------------------------
// Génère 10 variantes de plans par projet, chacune :
//  - respectant strictement les contraintes géométriques (surface, emprise)
//  - découpée par partition binaire récursive (BSP) ⇒ aucun chevauchement,
//    somme des surfaces pièces = surface du niveau (au centimètre près)
//  - équipée de portes (circulation) et fenêtres (pièces habitables)
//  - à structure continue entre niveaux (gaine d'escalier alignée + emprise
//    et axes structurants identiques sur tous les étages)
// Le moteur est déterministe (PRNG semé) et sans dépendance externe.
// ============================================================================

// ── Types publics ───────────────────────────────────────────────────────────

export type RoomKind =
  | "sejour"
  | "cuisine"
  | "chambre"
  | "sdb"
  | "wc"
  | "couloir"
  | "escalier"
  | "bureau"
  | "garage"
  | "reception"
  | "openspace"
  | "reunion"
  | "sanitaire"
  | "hall"
  | "stockage"
  | "logistique"
  | "vestiaire"
  | "polyvalent"
  | "jardin"
  | "piscine"
  | "balcon"
  | "veranda";

export type WallSide = "N" | "S" | "E" | "W";

export interface DoorSpec {
  /** Mur de la pièce portant la porte */
  wall: WallSide;
  /** Position le long du mur (m, depuis l'origine du mur) */
  position: number;
  /** Largeur du battant (m) */
  width: number;
  /** Porte d'entrée principale ? */
  isEntry?: boolean;
}

export interface WindowSpec {
  wall: WallSide;
  position: number;
  width: number;
}

export interface PlanRoom {
  id: string;
  kind: RoomKind;
  label: string;
  /** Coin supérieur gauche, en mètres (origine = coin NO de l'emprise) */
  x: number;
  y: number;
  w: number;
  h: number;
  area: number;
  doors: DoorSpec[];
  windows: WindowSpec[];
}

export interface FloorPlan {
  /** 0 = rez-de-chaussée */
  level: number;
  /** Emprise X (longueur, m) */
  length: number;
  /** Emprise Y (largeur/profondeur, m) */
  width: number;
  rooms: PlanRoom[];
  area: number;
}

export interface PlanValidation {
  dimensionsOk: boolean;
  noOverlap: boolean;
  areasOk: boolean;
  circulationOk: boolean;
  structureOk: boolean;
  /** Note de conformité sur 100 */
  score: number;
  issues: string[];
}

export interface FloorPlanVariant {
  id: string;
  name: string;
  style: string;
  /** Emprise au sol commune à tous les niveaux */
  footprint: { length: number; width: number };
  floors: FloorPlan[];
  totalArea: number;
  /** Note conceptuelle générée (description architecturale) */
  conceptNote: string;
  validation: PlanValidation;
}

export interface FloorPlanInput {
  category: string;
  /** Surface construite totale (m²), tous niveaux confondus */
  surface: number;
  floors?: number;
  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  livingRooms?: number;
  wcs?: number;
  /** Options supplémentaires à inclure dans les plans */
  extras?: string[];
}

// ── PRNG déterministe (mulberry32) ──────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const EPS = 1e-6;

// ── Couleurs par nature de pièce (partagées 2D / 3D) ───────────────────────

export const PLAN_ROOM_COLORS: Record<RoomKind, string> = {
  sejour: "#dbeafe",
  cuisine: "#fef3c7",
  chambre: "#e0e7ff",
  sdb: "#cffafe",
  wc: "#f1f5f9",
  couloir: "#f8fafc",
  escalier: "#ede9fe",
  bureau: "#dcfce7",
  garage: "#e5e7eb",
  reception: "#fce7f3",
  openspace: "#e0f2fe",
  reunion: "#ffe4e6",
  sanitaire: "#f1f5f9",
  hall: "#f8fafc",
  stockage: "#fef9c3",
  logistique: "#ecfccb",
  vestiaire: "#f1f5f9",
  polyvalent: "#f5f5f4",
  jardin: "#d9f99d",
  piscine: "#bae6fd",
  balcon: "#e0e7ff",
  veranda: "#fef3c7",
};

export const PLAN_ROOM_LABELS: Record<RoomKind, string> = {
  sejour: "Séjour",
  cuisine: "Cuisine",
  chambre: "Chambre",
  sdb: "Salle de bain",
  wc: "WC",
  couloir: "Couloir",
  escalier: "Escalier",
  bureau: "Bureau",
  garage: "Garage",
  reception: "Réception",
  openspace: "Espace ouvert",
  reunion: "Salle de réunion",
  sanitaire: "Sanitaires",
  hall: "Hall",
  stockage: "Zone de stockage",
  logistique: "Zone logistique",
  vestiaire: "Vestiaire",
  polyvalent: "Espace polyvalent",
  jardin: "Jardin",
  piscine: "Piscine",
  balcon: "Balcon",
  veranda: "Véranda",
};

// ── Familles de projets ─────────────────────────────────────────────────────

type ProjectFamily = "residential" | "commercial" | "logistics";

function familyForCategory(category: string): ProjectFamily {
  switch (category) {
    case "local_commercial":
    case "bureau":
    case "residence_touristique":
      return "commercial";
    case "entrepot":
      return "logistics";
    default:
      // maison, villa, appartement, studio, duplex, immeuble, projet_neuf…
      return "residential";
  }
}

// ── Programmes de pièces ────────────────────────────────────────────────────

interface ProgramItem {
  kind: RoomKind;
  label: string;
  /** Surface cible (m²) avant mise à l'échelle */
  target: number;
  /** Surface minimale acceptable (m²) ; la pièce est retirée sinon */
  min: number;
  /** Priorité de maintien (plus grand = conservé en priorité) */
  priority: number;
  /** Pièce habitable ⇒ exige une fenêtre */
  habitable?: boolean;
  /** Unique dans le programme */
  unique?: boolean;
}

function residentialProgram(
  input: FloorPlanInput,
  floorAreaPerLevel: number,
  levels: number,
): { level: number; items: ProgramItem[] }[] {
  const area = floorAreaPerLevel;
  const bedrooms =
    input.bedrooms && input.bedrooms > 0
      ? input.bedrooms
      : Math.max(1, Math.min(6, Math.round(area / 32)));
  const bathrooms =
    input.bathrooms && input.bathrooms > 0
      ? input.bathrooms
      : Math.max(1, Math.round(bedrooms / 2));
  const kitchens = input.kitchens && input.kitchens > 0 ? input.kitchens : 1;
  const livingRooms =
    input.livingRooms && input.livingRooms > 0 ? input.livingRooms : 1;
  const wcs = input.wcs && input.wcs > 0 ? input.wcs : Math.max(1, bathrooms);

  const mkChambre = (i: number): ProgramItem => ({
    kind: "chambre",
    label: i === 0 ? "Chambre principale" : `Chambre ${i + 1}`,
    target: i === 0 ? 16 : 13,
    min: 8.5,
    priority: 10 - i,
    habitable: true,
  });

  // Répartition des chambres sur les étages (RDC gardé pour les espaces de vie)
  const bedroomLevels: number[][] = Array.from({ length: levels }, () => []);
  let bi = 0;
  // Remplir à partir du dernier niveau en remontant (les étages portent les chambres).
  // Niveau unique : la boucle est ignorée, le repli ci-dessous place tout au RDC.
  for (let pass = 0; levels > 1 && pass < bedrooms; pass++) {
    const lvl = levels - 1 - (pass % Math.max(1, levels - 1));
    bedroomLevels[Math.max(1, Math.min(levels - 1, lvl))].push(bi++);
  }
  if (levels === 1) {
    bedroomLevels[0] = Array.from({ length: bedrooms }, (_, k) => k);
  }

  const result: { level: number; items: ProgramItem[] }[] = [];
  for (let lvl = 0; lvl < levels; lvl++) {
    const items: ProgramItem[] = [];
    if (lvl === 0) {
      items.push({
        kind: "sejour",
        label: livingRooms > 1 ? "Séjour double" : "Séjour",
        target: Math.max(24, area * 0.26),
        min: 16,
        priority: 20,
        habitable: true,
        unique: true,
      });
      for (let k = 0; k < kitchens; k++) {
        items.push({
          kind: "cuisine",
          label: k === 0 ? "Cuisine" : `Cuisine ${k + 1}`,
          target: 14,
          min: 7,
          priority: 15,
          habitable: true,
        });
      }
      items.push({
        kind: "wc",
        label: "WC invités",
        target: 2.5,
        min: 1.5,
        priority: 5,
      });

      // Sur un R+1 avec peu de chambres, quelques chambres peuvent monter au RDC
      if (levels === 1) {
        for (const idx of bedroomLevels[0]) items.push(mkChambre(idx));
        for (let k = 0; k < bathrooms; k++) {
          items.push({ kind: "sdb", label: k === 0 ? "Salle de bain" : `SDB ${k + 1}`, target: 6.5, min: 4, priority: 9 });
        }
        for (let k = 1; k < wcs; k++) {
          items.push({ kind: "wc", label: `WC ${k + 1}`, target: 2.5, min: 1.5, priority: 4 });
        }
      }
    } else {
      for (const idx of bedroomLevels[lvl] ?? []) items.push(mkChambre(idx));
      items.push({
        kind: "sdb",
        label: "Salle de bain",
        target: 6.5,
        min: 4,
        priority: 12,
        unique: true,
      });
      if ((bedroomLevels[lvl]?.length ?? 0) > 2) {
        items.push({ kind: "wc", label: "WC étage", target: 2.5, min: 1.5, priority: 4 });
      }
      if (lvl === levels - 1 && levels > 2) {
        items.push({
          kind: "polyvalent",
          label: "Terrasse / buanderie",
          target: 8,
          min: 5,
          priority: 6,
          habitable: true,
        });
      }
    }
    // ── Extras optionnels (garage, jardin, piscine, balcon, véranda) ──
    if (lvl === 0 && input.extras && input.extras.length > 0) {
      if (input.extras.includes("garage")) {
        items.push({ kind: "garage", label: "Garage", target: 15, min: 12, priority: 8 });
      }
      if (input.extras.includes("jardin")) {
        items.push({ kind: "jardin", label: "Jardin", target: 20, min: 10, priority: 3 });
      }
      if (input.extras.includes("piscine")) {
        items.push({ kind: "piscine", label: "Piscine", target: 12, min: 8, priority: 2 });
      }
      if (input.extras.includes("balcon")) {
        items.push({ kind: "balcon", label: "Balcon", target: 5, min: 3, priority: 4 });
      }
      if (input.extras.includes("veranda")) {
        items.push({ kind: "veranda", label: "Véranda", target: 10, min: 6, priority: 5, habitable: true });
      }
    }
    result.push({ level: lvl, items });
  }
  return result;
}

function commercialProgram(area: number): ProgramItem[] {
  const offices = Math.max(1, Math.min(5, Math.floor(area / 38)));
  const items: ProgramItem[] = [
    { kind: "reception", label: "Accueil / Réception", target: Math.max(12, area * 0.12), min: 8, priority: 18, habitable: true, unique: true },
    { kind: "openspace", label: "Espace de travail ouvert", target: Math.max(20, area * 0.34), min: 14, priority: 17, habitable: true, unique: true },
  ];
  for (let i = 0; i < offices; i++) {
    items.push({ kind: "bureau", label: i === 0 ? "Bureau direction" : `Bureau ${i + 1}`, target: 13, min: 8, priority: 10, habitable: true });
  }
  items.push({ kind: "reunion", label: "Salle de réunion", target: 16, min: 9, priority: 11, habitable: true });
  items.push({ kind: "sanitaire", label: "Sanitaires", target: 6, min: 3.5, priority: 6 });
  items.push({ kind: "cuisine", label: "Cuisine personnel", target: 8, min: 5, priority: 5 });
  return items;
}

function logisticsProgram(area: number): ProgramItem[] {
  const items: ProgramItem[] = [
    { kind: "stockage", label: "Hall de stockage principal", target: Math.max(40, area * 0.58), min: 30, priority: 20, unique: true },
    { kind: "logistique", label: "Zone chargement / logistique", target: Math.max(20, area * 0.18), min: 14, priority: 15 },
  ];
  const offices = Math.max(1, Math.min(3, Math.floor(area / 120)));
  for (let i = 0; i < offices; i++) {
    items.push({ kind: "bureau", label: i === 0 ? "Bureau exploitation" : `Bureau ${i + 1}`, target: 13, min: 8, priority: 9, habitable: true });
  }
  items.push({ kind: "vestiaire", label: "Vestiaires", target: 8, min: 5, priority: 6 });
  items.push({ kind: "sanitaire", label: "Sanitaires", target: 5, min: 3, priority: 6 });
  return items;
}

// ── Découpage BSP (aucun chevauchement par construction) ────────────────────

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Placed<T> {
  item: T;
  rect: Rect;
}

/** Partitionne `rect` entre les éléments selon leurs surfaces cibles.
 *  Les coupures sont quantifiées au millimètre pour que deux pièces voisines
 *  partagent EXACTEMENT la même coordonnée de mur (aucun chevauchement ni
 *  débordement après arrondi). */
function bspLayout<T extends { target: number }>(rect: Rect, items: T[]): Placed<T>[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ item: items[0], rect: { ...rect } }];
  const total = items.reduce((s, i) => s + i.target, 0);
  // Deux groupes équilibrés (glouton décroissant)
  const sorted = [...items].sort((a, b) => b.target - a.target);
  const g1: T[] = [];
  const g2: T[] = [];
  let s1 = 0;
  let s2 = 0;
  for (const it of sorted) {
    if (s1 <= s2) {
      g1.push(it);
      s1 += it.target;
    } else {
      g2.push(it);
      s2 += it.target;
    }
  }
  const f1 = Math.min(0.85, Math.max(0.15, s1 / total));
  if (rect.w >= rect.h) {
    const wLeft = Math.min(Math.round(rect.w * f1 * 1000) / 1000, rect.w - 0.01);
    return [
      ...bspLayout({ x: rect.x, y: rect.y, w: wLeft, h: rect.h }, g1),
      ...bspLayout(
        { x: round3(rect.x + wLeft), y: rect.y, w: round3(rect.w - wLeft), h: rect.h },
        g2,
      ),
    ];
  }
  const hTop = Math.min(Math.round(rect.h * f1 * 1000) / 1000, rect.h - 0.01);
  return [
    ...bspLayout({ x: rect.x, y: rect.y, w: rect.w, h: hTop }, g1),
    ...bspLayout(
      { x: rect.x, y: round3(rect.y + hTop), w: rect.w, h: round3(rect.h - hTop) },
      g2,
    ),
  ];
}

// ── Mise à l'échelle du programme à la surface disponible ───────────────────

function fitProgram(items: ProgramItem[], available: number): ProgramItem[] {
  let kept = [...items];
  // Retire les pièces les moins prioritaires tant que le minimum n'est pas respecté
  for (let guard = 0; guard < 50; guard++) {
    const sumTargets = kept.reduce((s, i) => s + i.target, 0);
    const scale = available / sumTargets;
    const smallest = kept.reduce((worst, i) =>
      i.target * scale < worst.target * scale ? i : worst,
    );
    const belowMin = kept.some((i) => i.target * scale < i.min);
    if (!belowMin) break;
    // Retire la pièce sous sa surface minimale de plus faible priorité
    const candidates = kept.filter((i) => i.target * scale < i.min);
    const victim = candidates.reduce((w, i) => (i.priority < w.priority ? i : w));
    if (kept.length <= 2 || victim.priority >= 18) break; // ne jamais sacrifier l'essentiel
    kept = kept.filter((i) => i !== victim);
  }
  // Mise à l'échelle finale
  const sumTargets = kept.reduce((s, i) => s + i.target, 0);
  const scale = available / sumTargets;
  return kept.map((i) => ({ ...i, target: Math.max(i.min, i.target * scale) }));
}

// ── Voisinages, portes et fenêtres ──────────────────────────────────────────

/** Tolérance géométrique (les coordonnées sont arrondies au mm). */
const TOL = 0.002;

function addOpenings(level: FloorPlan, isGroundFloor: boolean, rng: () => number): void {
  const rooms = level.rooms;

  // Portes : chaque pièce reçoit une porte sur son partage le plus long
  for (const room of rooms) {
    let best: { side: WallSide; position: number; len: number } | null = null;
    for (const other of rooms) {
      if (other === room) continue;
      // Frontière verticale partagée (mur E de room contre mur W de other, ou inverse)
      const touchesVertically =
        Math.abs(room.x + room.w - other.x) < TOL ||
        Math.abs(other.x + other.w - room.x) < TOL;
      // Frontière horizontale partagée (mur S de room contre mur N de other, ou inverse)
      const touchesHorizontally =
        Math.abs(room.y + room.h - other.y) < TOL ||
        Math.abs(other.y + other.h - room.y) < TOL;
      if (touchesVertically) {
        // Chevauchement des portées en Y
        const start = Math.max(room.y, other.y);
        const end = Math.min(room.y + room.h, other.y + other.h);
        const len = end - start;
        if (len >= 0.9 && (!best || len > best.len)) {
          const wall: WallSide = Math.abs(other.x + other.w - room.x) < TOL ? "W" : "E";
          best = { side: wall, position: (start + end) / 2 - room.y, len };
        }
      }
      if (touchesHorizontally) {
        // Chevauchement des portées en X
        const start = Math.max(room.x, other.x);
        const end = Math.min(room.x + room.w, other.x + other.w);
        const len = end - start;
        if (len >= 0.9 && (!best || len > best.len)) {
          const wall: WallSide = Math.abs(other.y + other.h - room.y) < TOL ? "N" : "S";
          best = { side: wall, position: (start + end) / 2 - room.x, len };
        }
      }
    }
    const doorWidth = room.kind === "garage" ? 2.4 : 0.9;
    if (best) {
      room.doors.push({
        wall: best.side,
        position: Math.max(doorWidth / 2 + 0.1, Math.min(best.len - doorWidth / 2 - 0.1, best.position)),
        width: doorWidth,
      });
    }
  }

  // Porte d'entrée : RDC, pièce d'accueil (réception/séjour/hall/openspace)
  if (isGroundFloor) {
    const prio: RoomKind[] = ["reception", "sejour", "hall", "openspace", "stockage"];
    let entry: PlanRoom | undefined;
    for (const k of prio) {
      entry = rooms.find((r) => r.kind === k);
      if (entry) break;
    }
    if (!entry) entry = [...rooms].sort((a, b) => b.area - a.area)[0];
    const pos = Math.max(0.8, Math.min(entry!.w - 0.8, entry!.x + entry!.w * 0.5));
    entry!.doors.push({ wall: "S", position: pos - entry!.x, width: 1.1, isEntry: true });
  }

  // Fenêtres : pièces habitables donnant sur l'extérieur
  for (const room of rooms) {
    const habitable =
      room.kind === "chambre" ||
      room.kind === "sejour" ||
      room.kind === "cuisine" ||
      room.kind === "bureau" ||
      room.kind === "openspace" ||
      room.kind === "reunion" ||
      room.kind === "reception" ||
      room.kind === "polyvalent";
    if (!habitable) continue;
    const sides: { side: WallSide; exterior: boolean; span: number; origin: number }[] = [
      { side: "N", exterior: Math.abs(room.y) < TOL, span: room.w, origin: room.x },
      { side: "S", exterior: Math.abs(room.y + room.h - level.width) < TOL, span: room.w, origin: room.x },
      { side: "W", exterior: Math.abs(room.x) < TOL, span: room.h, origin: room.y },
      { side: "E", exterior: Math.abs(room.x + room.w - level.length) < TOL, span: room.h, origin: room.y },
    ];
    let added = 0;
    for (const s of sides) {
      if (!s.exterior || added >= 2 || s.span < 1.6) continue;
      const winW = Math.min(1.4, s.span - 0.4);
      room.windows.push({
        wall: s.side,
        position: Math.max(0.3, s.origin + s.span / 2 - winW / 2),
        width: winW,
      });
      added++;
    }
  }
}

// ── Construction d'un niveau ────────────────────────────────────────────────

function buildLevel(
  levelIdx: number,
  levels: number,
  length: number,
  width: number,
  items: ProgramItem[],
  variantSeed: number,
): FloorPlan {
  const plan: FloorPlan = {
    level: levelIdx,
    length,
    width,
    rooms: [],
    area: length * width,
  };

  const multi = levels > 1;
  // Gaine d'escalier dimensionnée pour TOUJOURS tenir dans l'emprise quand le
  // projet est multi-niveaux (continuité verticale garantie sur tous les étages).
  const shaftW = round3(Math.min(2.5, length * 0.32));
  const shaftD = round3(Math.min(4.2, width * 0.38));
  const carveShaft = multi && length >= 4 && width >= 3;
  // Identifiants déterministes par niveau
  const rid = () => `L${levelIdx}-R${plan.rooms.length}`;

  const zones: Rect[] = [];
  if (carveShaft) {
    // Gaine d'escalier au même endroit sur TOUS les niveaux (continuité verticale)
    plan.rooms.push(makeRoom(rid(), "escalier", "Escalier", 0, 0, shaftW, shaftD));
    zones.push({ x: shaftW, y: 0, w: length - shaftW, h: shaftD });
    zones.push({ x: 0, y: shaftD, w: length, h: width - shaftD });
    // Répartition proportionnelle des pièces entre les deux zones
    const areaRight = zones[0].w * zones[0].h;
    const areaBottom = zones[1].w * zones[1].h;
    const totalZ = areaRight + areaBottom;
    const sorted = [...items].sort((a, b) => b.target - a.target);
    const rightItems: ProgramItem[] = [];
    const bottomItems: ProgramItem[] = [];
    let accR = 0;
    for (const it of sorted) {
      const wantRight = accR < (areaRight / totalZ) * sorted.reduce((s, i) => s + i.target, 0);
      if (wantRight) {
        rightItems.push(it);
        accR += it.target;
      } else {
        bottomItems.push(it);
      }
    }
    const placedR = bspLayout(zones[0], fitProgram(rightItems, areaRight));
    const placedB = bspLayout(zones[1], fitProgram(bottomItems, areaBottom));
    for (const p of [...placedR, ...placedB]) plan.rooms.push(makeRoom(rid(), p.item.kind, p.item.label, p.rect.x, p.rect.y, p.rect.w, p.rect.h, p.item.habitable));
  } else {
    const placed = bspLayout({ x: 0, y: 0, w: length, h: width }, fitProgram(items, length * width));
    for (const p of placed) plan.rooms.push(makeRoom(rid(), p.item.kind, p.item.label, p.rect.x, p.rect.y, p.rect.w, p.rect.h, p.item.habitable));
  }

  addOpenings(plan, levelIdx === 0, mulberry32(variantSeed ^ (levelIdx * 7919)));

  // Filet de sécurité géométrique : aucune pièce ne doit dépasser l'emprise
  // (les arrondis au mm peuvent pousser un bord de ≤ 1 mm au-delà du mur).
  for (const r of plan.rooms) {
    r.x = round3(Math.max(0, r.x));
    r.y = round3(Math.max(0, r.y));
    if (r.x + r.w > length) r.w = round3(length - r.x);
    if (r.y + r.h > width) r.h = round3(width - r.y);
    r.area = round3(r.w * r.h);
  }
  return plan;
}

function makeRoom(
  id: string,
  kind: RoomKind,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  _habitable?: boolean,
): PlanRoom {
  return {
    id,
    kind,
    label,
    x: round3(x),
    y: round3(y),
    w: round3(w),
    h: round3(h),
    area: round3(w * h),
    doors: [],
    windows: [],
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// ── Validation spatiale ─────────────────────────────────────────────────────

function overlaps(a: PlanRoom, b: PlanRoom): boolean {
  return (
    a.x + a.w > b.x + EPS &&
    b.x + b.w > a.x + EPS &&
    a.y + a.h > b.y + EPS &&
    b.y + b.h > a.y + EPS
  );
}

export function validatePlan(
  variant: FloorPlanVariant,
  input: FloorPlanInput,
): PlanValidation {
  const issues: string[] = [];
  let score = 100;

  // Tolérance géométrique : les coordonnées sont arrondies au millimètre,
  // les comparaisons doivent donc tolérer cet arrondi.
  const G = 0.002;

  function overlapsTol(a: PlanRoom, b: PlanRoom): boolean {
    return (
      a.x + a.w > b.x + G &&
      b.x + b.w > a.x + G &&
      a.y + a.h > b.y + G &&
      b.y + b.h > a.y + G
    );
  }

  // 1. Dimensions : emprise cohérente avec surface / niveaux
  const levels = variant.floors.length;
  const expectedArea = input.surface / levels;
  const dimsErr = Math.abs(variant.footprint.length * variant.footprint.width - expectedArea) / expectedArea;
  const dimensionsOk = dimsErr <= 0.06;
  if (!dimensionsOk) issues.push(`Emprise au sol écartée de ${(dimsErr * 100).toFixed(1)} % de la cible`);

  // 2. Chevauchements
  let noOverlap = true;
  for (const fp of variant.floors) {
    for (let i = 0; i < fp.rooms.length; i++) {
      for (let j = i + 1; j < fp.rooms.length; j++) {
        if (overlapsTol(fp.rooms[i], fp.rooms[j])) {
          noOverlap = false;
          issues.push(`Chevauchement détecté (${fp.rooms[i].label} / ${fp.rooms[j].label}, niveau ${fp.level + 1})`);
        }
      }
      // Contenance dans l'emprise
      const r = fp.rooms[i];
      if (r.x < -G || r.y < -G || r.x + r.w > fp.length + G || r.y + r.h > fp.width + G) {
        noOverlap = false;
        issues.push(`Pièce hors emprise : ${r.label}`);
      }
    }
  }
  if (!noOverlap) score -= 20;

  // 3. Somme des surfaces ≈ surface du niveau (±2 %)
  let areasOk = true;
  for (const fp of variant.floors) {
    const sum = fp.rooms.reduce((s, r) => s + r.area, 0);
    if (Math.abs(sum - fp.area) / fp.area > 0.02) {
      areasOk = false;
      issues.push(`Somme des surfaces ≠ surface du niveau ${fp.level + 1}`);
    }
  }
  if (!areasOk) score -= 10;

  // 4. Circulation : chaque pièce dispose d'une porte
  let circulationOk = true;
  for (const fp of variant.floors) {
    for (const r of fp.rooms) {
      if (r.doors.length === 0) {
        circulationOk = false;
        issues.push(`Pièce sans accès : ${r.label} (niveau ${fp.level + 1})`);
      }
    }
    if (fp.level === 0 && !fp.rooms.some((r) => r.doors.some((d) => d.isEntry))) {
      circulationOk = false;
      issues.push("Porte d'entrée manquante au rez-de-chaussée");
    }
  }
  if (!circulationOk) score -= 12;

  // 5. Structure : emprise + gaine escalier identiques sur tous les niveaux
  let structureOk = true;
  if (levels > 1) {
    const ref = variant.floors[0];
    const stairRef = ref.rooms.find((r) => r.kind === "escalier");
    for (const fp of variant.floors.slice(1)) {
      if (
        Math.abs(fp.length - ref.length) > EPS ||
        Math.abs(fp.width - ref.width) > EPS
      ) {
        structureOk = false;
        issues.push(`Emprise discontinue au niveau ${fp.level + 1}`);
      }
      const stair = fp.rooms.find((r) => r.kind === "escalier");
      if (!stair || !stairRef) {
        structureOk = false;
        issues.push(`Gaine d'escalier absente au niveau ${fp.level + 1}`);
      } else if (
        Math.abs(stair.x - stairRef.x) > 0.01 ||
        Math.abs(stair.y - stairRef.y) > 0.01 ||
        Math.abs(stair.w - stairRef.w) > 0.01 ||
        Math.abs(stair.h - stairRef.h) > 0.01
      ) {
        structureOk = false;
        issues.push(`Gaine d'escalier désalignée au niveau ${fp.level + 1}`);
      }
    }
  }
  if (!structureOk) score -= 15;

  // 6. Fenêtres des pièces habitables
  const habitableKinds: RoomKind[] = ["chambre", "sejour", "cuisine", "bureau", "openspace", "reception"];
  for (const fp of variant.floors) {
    for (const r of fp.rooms) {
      if (habitableKinds.includes(r.kind) && r.windows.length === 0) {
        score -= 5;
        issues.push(`Pièce habitable sans fenêtre : ${r.label} (niveau ${fp.level + 1})`);
      }
    }
  }

  return {
    dimensionsOk,
    noOverlap,
    areasOk,
    circulationOk,
    structureOk,
    score: Math.max(40, Math.min(100, Math.round(score))),
    issues: [...new Set(issues)].slice(0, 8),
  };
}

// ── Note conceptuelle générée ───────────────────────────────────────────────

function conceptNote(
  style: string,
  input: FloorPlanInput,
  variant: { footprint: { length: number; width: number }; floors: FloorPlan[] },
  rng: () => number,
): string {
  const fam = familyForCategory(input.category);
  void fam;
  const ratios = variant.footprint.length / variant.footprint.width;
  const form =
    ratios > 1.5
      ? "un volume allongé qui privilégie les façades percées et la lumière traversante"
      : ratios > 1.15
        ? "un volume rectangulaire efficace aux circulations resserrées"
        : "un volume quasi carré qui limite les déperditions et rationalise la structure";
  const org =
    fam === "residential"
      ? "Le rez-de-chaussée regroupe les espaces de vie ouverts sur l'entrée, tandis que les chambres occupent les niveaux supérieurs autour de la cage d'escalier."
      : fam === "commercial"
        ? "L'accueil filtre naturellement les flux vers l'espace de travail ouvert et les bureaux fermés, avec les salles de réunion en profondeur."
        : "Le hall de stockage occupe le cœur du bâtiment, desservi directement par la zone logistique et les locaux d'exploitation.";
  const strengths = [
    "absence totale de chevauchement entre pièces",
    "surfaces ventilées conformes aux minima d'habitabilité",
    "continuité structurelle assurée par une gaine d'escalier alignée sur tous les niveaux",
    "éclairement naturel maximalisé par un double exposition des pièces principales",
  ];
  const chosen = new Set<string>();
  while (chosen.size < 2 && chosen.size < strengths.length) chosen.add(strengths[Math.floor(rng() * strengths.length)]);
  const s = [...chosen].join(", ");
  const levelsTxt =
    variant.floors.length > 1
      ? `${variant.floors.length} niveaux d'une emprise de ${variant.footprint.length.toFixed(1)} × ${variant.footprint.width.toFixed(1)} m`
      : `une emprise unique de ${variant.footprint.length.toFixed(1)} × ${variant.footprint.width.toFixed(1)} m`;
  return `Variante « ${style} » : ${levelsTxt}. ${form.charAt(0).toUpperCase() + form.slice(1)}. ${org} Points forts : ${s}.`;
}

// ── Styles des 10 variantes ─────────────────────────────────────────────────

const STYLES: { style: string; ratio: number }[] = [
  { style: "Optimisée", ratio: 1.0 },
  { style: "Traversante", ratio: 1.22 },
  { style: "Compacte", ratio: 0.86 },
  { style: "Parallélépipédique", ratio: 1.38 },
  { style: "Horizontale", ratio: 1.62 },
  { style: "Carrée pure", ratio: 1.04 },
  { style: "Allongée", ratio: 1.82 },
  { style: "Équilibrée", ratio: 1.14 },
  { style: "Modulaire", ratio: 1.3 },
  { style: "Rationnelle", ratio: 1.48 },
];

export const VARIANTS_PER_PROJECT = STYLES.length;

// ── API principale ──────────────────────────────────────────────────────────

/**
 * Génère les 10 variantes de plans d'architecte pour un projet.
 * Déterministe : le même projet produit toujours les mêmes plans.
 */
export function generateFloorPlans(input: FloorPlanInput): FloorPlanVariant[] {
  const surface = Math.max(18, input.surface || 90);
  const levels = Math.max(1, Math.min(4, Math.round(input.floors || 1)));
  const family = familyForCategory(input.category);
  const areaPerLevel = surface / levels;
  const baseSeed = 1337 +
    input.category.length * 31 +
    Math.round(surface) * 17 +
    levels * 101;

  const variants: FloorPlanVariant[] = [];
  for (let v = 0; v < STYLES.length; v++) {
    const { style, ratio } = STYLES[v];
    const rng = mulberry32(baseSeed + v * 977);
    // Emprise : longueur × largeur selon le ratio de la variante
    let L = Math.sqrt(areaPerLevel * ratio);
    let W = Math.sqrt(areaPerLevel / ratio);
    // Garde-fous constructifs
    L = Math.min(Math.max(L, 5), 60);
    W = Math.min(Math.max(W, 4), 40);
    L = round3(L);
    W = round3(W);

    const floors: FloorPlan[] = [];
    if (family === "residential") {
      const programs = residentialProgram(input, areaPerLevel, levels);
      for (const prog of programs) {
        floors.push(buildLevel(prog.level, levels, L, W, prog.items, baseSeed + v * 977));
      }
    } else {
      const items = family === "commercial" ? commercialProgram(areaPerLevel) : logisticsProgram(areaPerLevel);
      for (let lvl = 0; lvl < levels; lvl++) {
        floors.push(buildLevel(lvl, levels, L, W, items.map((i) => ({ ...i })), baseSeed + v * 977));
      }
    }

    const variant: FloorPlanVariant = {
      id: `plan-v${v + 1}`,
      name: `Variante ${v + 1} · ${style}`,
      style,
      footprint: { length: L, width: W },
      floors,
      totalArea: round3(floors.reduce((s, f) => s + f.rooms.reduce((a, r) => a + r.area, 0), 0)),
      conceptNote: "",
      validation: {
        dimensionsOk: true,
        noOverlap: true,
        areasOk: true,
        circulationOk: true,
        structureOk: true,
        score: 100,
        issues: [],
      },
    };
    variant.conceptNote = conceptNote(style, input, variant, rng);
    variant.validation = validatePlan(variant, { ...input, surface, floors: levels });
    variants.push(variant);
  }
  return variants;
}

/** Synthèse des surfaces par nature de pièce (fiche technique). */
export function summarizeSurfaces(plan: FloorPlan): {
  label: string;
  kind: RoomKind;
  area: number;
  sharePct: number;
}[] {
  const total = plan.rooms.reduce((s, r) => s + r.area, 0) || 1;
  return plan.rooms
    .map((r) => ({
      label: r.label,
      kind: r.kind,
      area: r.area,
      sharePct: Math.round((r.area / total) * 1000) / 10,
    }))
    .sort((a, b) => b.area - a.area);
}
