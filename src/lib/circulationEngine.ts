// ============================================================================
// CIRCULATION — VALIDATEUR ET OPTIMISEUR GÉOMÉTRIQUES (2D = 3D)
// ----------------------------------------------------------------------------
// Contrôle et correction AUTOMATIQUES des circulations de chaque niveau :
// couloirs, halls, paliers, passages de liaison, portes praticables.
//
// Le module travaille sur la GÉOMÉTRIE RÉELLE du plan (rectangles des pièces,
// murs mitoyens, portes, fenêtres et mobilier généré) — pas sur l'affichage :
//
//   · un passage existe seulement si les DEUX pièces portent une porte qui se
//     recouvre sur le mur mitoyen (aucune porte orpheline, aucun mur percé
//     d'un seul côté) ;
//   · une pièce est accessible si un cheminement de passages relie sa porte à
//     l'entrée (ou à la cage d'escalier pour un étage) ;
//   · la largeur libre d'un couloir est mesurée par transformée de distance
//     dans sa géométrie, mobilier compris (un meuble qui rétrécit le passage
//     est donc réellement détecté) ;
//   · le dégagement devant chaque porte est contrôlé dans la pièce, sur la
//     profondeur réelle du battant ;
//   · les portes qui se heurtent (battants qui se recouvrent) et les
//     ouvertures superposées dans un même mur sont signalées.
//
// `analyzeCirculation` produit le rapport ; `optimizeCirculation` corrige ce
// qui est corrigeable SANS toucher aux dimensions, aux surfaces ni aux
// fonctions des pièces : il n'ajoute / ne déplace que des PORTES. Les surfaces
// du tableau, la surface couverte, le quantitatif et les métrés restent donc
// strictement identiques (aucune pièce créée, déplacée ou redimensionnée).
//
// Les objectifs dimensionnels sont ceux du cahier des charges : couloir
// 1,00–1,20 m lorsque la surface le permet, jamais moins de 0,90 m pour un
// passage principal. En dessous de 0,75 m le passage est considéré comme
// impraticable. Les exigences d'évacuation des ERP (cafés, restaurants) sont
// contrôlées séparément par `evacuationPlan` et reprises dans la validation.
// ============================================================================

import type {
  DoorSpec,
  FloorPlan,
  PlanRoom,
  RoomKind,
  WallSide,
} from "./floorPlanEngine";
import { roomFurniture } from "./furniture";

/** Largeur visée d'un couloir (m) lorsque la surface le permet. */
export const CIRCULATION_TARGET_WIDTH = 1.0;
/** Largeur minimale d'un passage principal (m). */
export const CIRCULATION_MIN_WIDTH = 0.9;
/** Largeur en dessous de laquelle un passage n'est plus praticable (m). */
export const CIRCULATION_ABSOLUTE_MIN_WIDTH = 0.75;
/** Largeur minimale d'une porte intérieure (m). */
export const CIRCULATION_MIN_DOOR_WIDTH = 0.7;
/** Largeur d'une porte accessible / d'entrée (m). */
export const CIRCULATION_ACCESSIBLE_DOOR_WIDTH = 0.8;
/** Au-delà, un couloir étroit est signalé comme inutilement long (m). */
export const CIRCULATION_MAX_CORRIDOR_LENGTH = 6;
/** Profondeur de dégagement contrôlée devant une porte (m). */
export const CIRCULATION_DOOR_CLEARANCE = 0.9;
/** Résolution de la mesure géométrique des largeurs (m). */
const RES = 0.1;
/** Tolérance géométrique (coordonnées arrondies au millimètre). */
const TOL = 0.03;
/** Recouvrement minimal de deux portes mitoyennes pour être praticable (m). */
const MIN_PASSAGE_WIDTH = 0.45;

/** Pièces de circulation (couloirs, halls, paliers, attentes). */
const CIRCULATION_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>([
  "couloir",
  "hall",
  "escalier",
  "attente",
]);

/** Pièces privées : on ne traverse pas une chambre pour desservir une autre pièce. */
const PRIVATE_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>([
  "chambre",
  "sdb",
  "wc",
  "sanitaire",
]);

/** Pièces d'eau : une salle de bain derrière une chambre est une suite, pas un défaut. */
const WET_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>([
  "sdb",
  "wc",
  "sanitaire",
]);

/** Pièces publiques : elles peuvent servir de circulation en plan ouvert. */
const PUBLIC_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>([
  "sejour",
  "reception",
  "openspace",
  "salle_client",
  "salle_cafe",
  "vente",
  "attente",
  "hall",
  "couloir",
]);

/** Pièces sans porte par nature (bassin, patio extérieur). */
const NO_DOOR_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>(["bassin", "patio"]);

/** Pièces sanitaires : règles d'hygiène strictes en restauration. */
const SANITARY_ROOM_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>([
  "sdb",
  "wc",
  "sanitaire",
]);

/** Zones de production / réserves d'un café ou restaurant. */
const PRODUCTION_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>([
  "cuisine",
  "cuisine_pro",
  "plonge",
  "chambre_froide",
  "stockage",
  "logistique",
]);

const FOOD_SERVICE_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>([
  "salle_cafe",
  "salle_client",
]);

function isFoodServicePlan(plan: FloorPlan): boolean {
  return plan.rooms.some((r) => FOOD_SERVICE_KINDS.has(r.kind));
}

/**
 * Une porte peut-elle relier ces deux pièces sans violer les règles métier ?
 * En restauration, un sanitaire n'ouvre QUE sur la salle ou une circulation :
 * jamais sur la cuisine, la plonge, une réserve ou une chambre froide.
 */
function canAddDoor(plan: FloorPlan, a: PlanRoom, b: PlanRoom): boolean {
  const sanitaryA = SANITARY_ROOM_KINDS.has(a.kind);
  const sanitaryB = SANITARY_ROOM_KINDS.has(b.kind);
  if (!sanitaryA && !sanitaryB) return true;
  const other = sanitaryA ? b : a;
  if (isFoodServicePlan(plan)) {
    return (
      PUBLIC_KINDS.has(other.kind) ||
      other.kind === "couloir" ||
      other.kind === "hall" ||
      other.kind === "attente"
    );
  }
  return !PRODUCTION_KINDS.has(other.kind);
}

/** Un passage praticable existe-t-il déjà entre ces deux pièces ? */
function hasPassageBetween(a: PlanRoom, b: PlanRoom): boolean {
  const boundary = boundaryBetween(a, b);
  if (!boundary) return false;
  for (const da of a.doors) {
    if (da.wall !== boundary.aWall) continue;
    const ia = openingInterval(a, da);
    for (const db of b.doors) {
      if (db.wall !== boundary.bWall) continue;
      const ib = openingInterval(b, db);
      const overlap =
        Math.min(ia.to, ib.to) - Math.max(ia.from, ib.from);
      if (overlap >= MIN_PASSAGE_WIDTH) return true;
    }
  }
  return false;
}

export type CirculationSeverity = "critical" | "warning";

export type CirculationIssueCode =
  | "no-entry"
  | "room-without-door"
  | "room-unreachable"
  | "door-orphan"
  | "door-overlap"
  | "door-too-narrow"
  | "door-swing-conflict"
  | "door-blocked"
  | "corridor-too-narrow"
  | "corridor-dead-end"
  | "corridor-too-long"
  | "private-passage";

export interface CirculationIssue {
  code: CirculationIssueCode;
  severity: CirculationSeverity;
  message: string;
  roomId?: string;
  roomLabel?: string;
}

export interface CorridorReport {
  roomId: string;
  label: string;
  kind: RoomKind;
  /** Largeur libre mesurée dans la géométrie (m), mobilier compris. */
  width: number;
  /** Longueur de distribution (m). */
  length: number;
  /** Nombre de passages (portes raccordées des deux côtés). */
  passages: number;
  deadEnd: boolean;
  obstructed: boolean;
  ok: boolean;
}

/** Rapport compact conservé dans la validation d'un plan (affichage, tests). */
export interface CirculationSummary {
  ok: boolean;
  /** Nombre d'espaces de circulation contrôlés (couloirs, halls, paliers). */
  corridors: number;
  /** Largeur libre minimale mesurée sur les circulations (m). */
  minCorridorWidth: number;
  /** Largeur minimale des portes du niveau (m). */
  minDoorWidth: number;
  /** Pièces essentielles non desservies par un cheminement (libellés). */
  unreachable: string[];
  /** Portes qui se heurtent ou ouvertures superposées. */
  conflicts: number;
  /** Portes dont le dégagement est obstrué par du mobilier. */
  blockedDoors: number;
  /** Pièces desservies uniquement en traversant une pièce privée. */
  privatePassages: number;
  /**
   * Points de vigilance non bloquants (couloir sous 1,00 m, porte étroite,
   * accès par une pièce privée, battants proches…). Le plan reste validé,
   * mais ces remarques sont affichées à l'utilisateur.
   */
  notes: string[];
}

export interface CirculationReport extends CirculationSummary {
  score: number;
  issues: CirculationIssue[];
  corridorsDetail: CorridorReport[];
  rooms: number;
  reachableRooms: number;
  entryFound: boolean;
  /** Portes praticables (raccordées des deux côtés). */
  passages: number;
  reachableRoomIds: string[];
}

export interface CirculationOptions {
  /** Type de projet (aucun effet sur la géométrie, traçabilité). */
  category?: string | null;
  /**
   * Le niveau doit-il comporter une porte d'entrée sur façade ?
   * `true` pour un bâtiment au rez-de-chaussée, jamais pour une piscine.
   */
  requireEntry?: boolean;
  /**
   * Déplacer les ouvertures superposées (défaut : true). La réparation d'un
   * plan déjà dessiné passe `false` pour rester strictement une correction
   * d'accès, sans retoucher les baies validées.
   */
  repairOpenings?: boolean;
}

export interface CirculationFix {
  code:
    | CirculationIssueCode
    | "entry-added"
    | "door-added"
    | "door-moved"
    | "corridor-widened";
  message: string;
  roomId?: string;
}

// ── Petites géométries ──────────────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;

function wallLength(room: PlanRoom, wall: WallSide): number {
  return wall === "N" || wall === "S" ? room.w : room.h;
}

/** Intervalle global d'une ouverture le long de son mur (axe X ou Y). */
function openingInterval(
  room: PlanRoom,
  opening: { wall: WallSide; position: number; width: number },
): { axis: "x" | "y"; from: number; to: number } {
  const horizontal = opening.wall === "N" || opening.wall === "S";
  const origin = horizontal ? room.x : room.y;
  return {
    axis: horizontal ? "x" : "y",
    from: origin + opening.position,
    to: origin + opening.position + opening.width,
  };
}

interface Boundary {
  /** Axe le long duquel court le mur mitoyen. */
  axis: "x" | "y";
  /** Mur correspondant dans `a`. */
  aWall: WallSide;
  /** Mur correspondant dans `b`. */
  bWall: WallSide;
  /** Coordonnée du mur (X pour un mur vertical, Y pour un mur horizontal). */
  at: number;
  from: number;
  to: number;
  length: number;
}

/** Mur mitoyen réel entre deux pièces (null si elles ne se touchent pas). */
function boundaryBetween(a: PlanRoom, b: PlanRoom): Boundary | null {
  const touchesVertically =
    Math.abs(a.x + a.w - b.x) < TOL || Math.abs(b.x + b.w - a.x) < TOL;
  if (touchesVertically) {
    const from = Math.max(a.y, b.y);
    const to = Math.min(a.y + a.h, b.y + b.h);
    const length = to - from;
    if (length >= 0.6) {
      const aIsLeft = Math.abs(b.x + b.w - a.x) < TOL;
      return {
        axis: "y",
        at: aIsLeft ? a.x : a.x + a.w,
        aWall: aIsLeft ? "W" : "E",
        bWall: aIsLeft ? "E" : "W",
        from,
        to,
        length,
      };
    }
  }
  const touchesHorizontally =
    Math.abs(a.y + a.h - b.y) < TOL || Math.abs(b.y + b.h - a.y) < TOL;
  if (touchesHorizontally) {
    const from = Math.max(a.x, b.x);
    const to = Math.min(a.x + a.w, b.x + b.w);
    const length = to - from;
    if (length >= 0.6) {
      const aIsTop = Math.abs(b.y + b.h - a.y) < TOL;
      return {
        axis: "x",
        at: aIsTop ? a.y : a.y + a.h,
        aWall: aIsTop ? "N" : "S",
        bWall: aIsTop ? "S" : "N",
        from,
        to,
        length,
      };
    }
  }
  return null;
}

function onFacade(room: PlanRoom, side: WallSide, plan: FloorPlan): boolean {
  if (side === "N") return Math.abs(room.y) < TOL;
  if (side === "S") return Math.abs(room.y + room.h - plan.width) < TOL;
  if (side === "W") return Math.abs(room.x) < TOL;
  return Math.abs(room.x + room.w - plan.length) < TOL;
}

function facadeWalls(room: PlanRoom, plan: FloorPlan): WallSide[] {
  return (["N", "S", "E", "W"] as WallSide[]).filter((s) => onFacade(room, s, plan));
}

interface Passage {
  a: PlanRoom;
  b: PlanRoom;
  boundary: Boundary;
  width: number;
}

/** Passage praticable : deux portes mitoyennes qui se recouvrent. */
function passagesOf(plan: FloorPlan): Passage[] {
  const rooms = plan.rooms;
  const out: Passage[] = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];
      const boundary = boundaryBetween(a, b);
      if (!boundary) continue;
      const doorsA = a.doors.filter((d) => d.wall === boundary.aWall && d.width > 0.2);
      const doorsB = b.doors.filter((d) => d.wall === boundary.bWall && d.width > 0.2);
      let best = 0;
      for (const da of doorsA) {
        const ia = openingInterval(a, da);
        for (const db of doorsB) {
          const ib = openingInterval(b, db);
          const lo = Math.max(Math.max(ia.from, ib.from), boundary.from);
          const hi = Math.min(Math.min(ia.to, ib.to), boundary.to);
          best = Math.max(best, hi - lo);
        }
      }
      if (best >= MIN_PASSAGE_WIDTH) out.push({ a, b, boundary, width: best });
    }
  }
  return out;
}

interface Blocker {
  x: number;
  y: number;
  w: number;
  h: number;
}

function rectHas(blocker: Blocker, x: number, y: number): boolean {
  return (
    x >= blocker.x &&
    x <= blocker.x + blocker.w &&
    y >= blocker.y &&
    y <= blocker.y + blocker.h
  );
}

/**
 * Mobilier réellement bloquant (meubles pleins, appareils) — les tapis, tracés
 * et symboles non remplis ne bloquent jamais la circulation.
 */
function blockersOf(plan: FloorPlan): Blocker[] {
  const out: Blocker[] = [];
  for (const room of plan.rooms) {
    if (room.w < 0.3 || room.h < 0.3) continue;
    let prims;
    try {
      prims = roomFurniture(room, plan);
    } catch {
      continue;
    }
    for (const prim of prims) {
      if (prim.t === "r") {
        if (prim.noFill || prim.dash) continue;
        if (prim.w < 0.12 || prim.h < 0.12) continue;
        out.push({
          x: prim.x + 0.02,
          y: prim.y + 0.02,
          w: Math.max(0, prim.w - 0.04),
          h: Math.max(0, prim.h - 0.04),
        });
      } else if (prim.t === "c") {
        if (prim.noFill || prim.r < 0.15) continue;
        out.push({
          x: prim.x - prim.r,
          y: prim.y - prim.r,
          w: prim.r * 2,
          h: prim.r * 2,
        });
      }
    }
  }
  return out;
}

function isBlockedAt(blockers: Blocker[], x: number, y: number): boolean {
  return blockers.some((b) => rectHas(b, x, y));
}

/**
 * Largeur libre d'une pièce de circulation, mesurée sur sa géométrie réelle
 * (transformée de distance), mobilier compris. Ne dépasse jamais la largeur
 * nominale du rectangle.
 */
function clearWidth(room: PlanRoom, blockers: Blocker[]): number {
  const nominal = Math.min(room.w, room.h);
  const cols = Math.max(1, Math.ceil(room.w / RES));
  const rows = Math.max(1, Math.ceil(room.h / RES));
  const walk = new Uint8Array(cols * rows);
  const dist = new Int16Array(cols * rows).fill(-1);
  const queue: number[] = [];

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = room.x + (i + 0.5) * RES;
      const y = room.y + (j + 0.5) * RES;
      if (isBlockedAt(blockers, x, y)) continue;
      walk[j * cols + i] = 1;
    }
  }

  // Sources : toute cellule libre au contact d'un mur ou d'un meuble.
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const idx = j * cols + i;
      if (!walk[idx]) continue;
      const nearEdge =
        i === 0 ||
        j === 0 ||
        i === cols - 1 ||
        j === rows - 1 ||
        !walk[idx - 1] ||
        !walk[idx + 1] ||
        !walk[idx - cols] ||
        !walk[idx + cols];
      if (nearEdge) {
        dist[idx] = 0;
        queue.push(idx);
      }
    }
  }

  let head = 0;
  let maxDist = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const d = dist[idx];
    if (d > maxDist) maxDist = d;
    const i = idx % cols;
    const j = Math.floor(idx / cols);
    const neighbours = [
      i > 0 ? idx - 1 : -1,
      i + 1 < cols ? idx + 1 : -1,
      j > 0 ? idx - cols : -1,
      j + 1 < rows ? idx + cols : -1,
    ];
    for (const n of neighbours) {
      if (n < 0 || !walk[n] || dist[n] !== -1) continue;
      dist[n] = d + 1;
      queue.push(n);
    }
  }

  if (maxDist === 0) return 0;
  const measured = (maxDist + 1) * 2 * RES;
  return round2(Math.min(nominal, Math.max(RES, measured)));
}

/** Rectangle de dégagement devant une porte, à l'intérieur de la pièce. */
function approachRect(
  room: PlanRoom,
  door: DoorSpec,
  depth: number,
): { x: number; y: number; w: number; h: number } {
  const d = Math.min(depth, Math.max(0.3, Math.min(room.w, room.h) - 0.1));
  if (door.wall === "N") {
    return { x: room.x + door.position, y: room.y, w: door.width, h: d };
  }
  if (door.wall === "S") {
    return {
      x: room.x + door.position,
      y: room.y + room.h - d,
      w: door.width,
      h: d,
    };
  }
  if (door.wall === "W") {
    return { x: room.x, y: room.y + door.position, w: d, h: door.width };
  }
  return {
    x: room.x + room.w - d,
    y: room.y + door.position,
    w: d,
    h: door.width,
  };
}

/**
 * Largeur libre réellement praticable devant une porte (m).
 *
 * On mesure, à plusieurs profondeurs dans la pièce, la plus longue bande
 * continue libre en travers du battant : un meuble latéral ne bloque pas la
 * porte, un meuble placé devant la réduit réellement le passage. C'est la
 * grandeur qui compte pour l'usager (largeur de passage), pas un taux de
 * remplissage de surface.
 */
function doorLaneWidth(
  room: PlanRoom,
  door: DoorSpec,
  blockers: Blocker[],
): number {
  const maxDepth = Math.min(
    CIRCULATION_DOOR_CLEARANCE,
    Math.max(0.35, Math.min(room.w, room.h) - 0.1),
  );
  const depths = [0.3, 0.55, 0.8]
    .map((d) => Math.min(d, maxDepth))
    .filter((d, i, arr) => arr.indexOf(d) === i);
  const steps = Math.max(6, Math.round(door.width / 0.05));
  let best = 0;
  for (const depth of depths) {
    const lateral = door.wall === "N" || door.wall === "S";
    const fixedX =
      door.wall === "W"
        ? room.x + depth
        : room.x + room.w - depth;
    const fixedY =
      door.wall === "N" ? room.y + depth : room.y + room.h - depth;
    let run = 0;
    let longest = 0;
    // Mesure sur toute la largeur du battant : un passage entièrement libre
    // vaut exactement la largeur de la porte, sans abattement forfaitaire.
    const stepM = door.width / steps;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = lateral
        ? room.x + door.position + door.width * t
        : fixedX;
      const y = lateral
        ? fixedY
        : room.y + door.position + door.width * t;
      if (isBlockedAt(blockers, x, y)) {
        run = 0;
      } else {
        run++;
        longest = Math.max(longest, run);
      }
    }
    const width = Math.min(door.width, longest * stepM);
    best = Math.max(best, width);
  }
  return round2(best);
}

/** Emprise du battant d'une porte ouverte dans sa pièce. */
function swingBox(room: PlanRoom, door: DoorSpec) {
  return approachRect(room, door, Math.min(door.width, 1.2));
}

function overlapArea(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): number {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ox > 0 && oy > 0 ? ox * oy : 0;
}

// ── Analyse ─────────────────────────────────────────────────────────────────

/**
 * Contrôle la circulation d'un niveau. Ne modifie rien.
 *
 * `requireEntry` : exige une porte d'entrée sur façade (bâtiment au RDC).
 * Les étages n'en ont pas : leur point de départ est la cage d'escalier.
 */
export function analyzeCirculation(
  plan: FloorPlan,
  options: CirculationOptions = {},
): CirculationReport {
  const issues: CirculationIssue[] = [];
  const rooms = plan.rooms.filter((r) => !r.exterior);
  const required = rooms.filter((r) => !NO_DOOR_KINDS.has(r.kind));
  const blockers = blockersOf(plan);
  const passages = passagesOf(plan);

  const adjacency = new Map<string, { room: PlanRoom; width: number }[]>();
  for (const room of rooms) adjacency.set(room.id, []);
  for (const p of passages) {
    adjacency.get(p.a.id)?.push({ room: p.b, width: p.width });
    adjacency.get(p.b.id)?.push({ room: p.a, width: p.width });
  }

  const entryRooms = rooms.filter((r) =>
    r.doors.some((d) => d.isEntry && onFacade(r, d.wall, plan)),
  );
  const entryFound = entryRooms.length > 0;

  if (options.requireEntry && !entryFound) {
    issues.push({
      code: "no-entry",
      severity: "critical",
      message: "Aucune porte d'entrée praticable sur façade au rez-de-chaussée",
    });
  }

  // Point de départ du cheminement : l'entrée principale, complétée par les
  // accès extérieurs appropriés (issue de secours, entrée de service). Un bloc
  // de production d'un restaurant est desservi par son entrée de service : il
  // ne doit pas être déclaré inaccessible pour autant.
  const rootRooms: PlanRoom[] = [];
  if (entryRooms.length > 0) rootRooms.push(...entryRooms);
  const outerAccess = rooms.filter((r) =>
    r.doors.some(
      (d) =>
        (d.isService || d.isEmergency) && onFacade(r, d.wall, plan),
    ),
  );
  for (const room of outerAccess) {
    if (!rootRooms.includes(room)) rootRooms.push(room);
  }
  if (rootRooms.length === 0 && plan.level > 0) {
    rootRooms.push(...rooms.filter((r) => r.kind === "escalier"));
  }
  if (rootRooms.length === 0) {
    rootRooms.push(...rooms.filter((r) => r.kind === "hall"));
  }
  if (rootRooms.length === 0) {
    const publicRoom = rooms
      .filter((r) => PUBLIC_KINDS.has(r.kind))
      .sort((a, b) => b.area - a.area)[0];
    if (publicRoom) rootRooms.push(publicRoom);
  }
  if (rootRooms.length === 0 && required.length > 0) {
    rootRooms.push([...required].sort((a, b) => b.area - a.area)[0]);
  }

  // Parcours des passages depuis l'accès.
  const parent = new Map<string, string | null>();
  const reached = new Set<string>();
  const queue: PlanRoom[] = [];
  for (const root of rootRooms) {
    if (reached.has(root.id)) continue;
    reached.add(root.id);
    parent.set(root.id, null);
    queue.push(root);
  }
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    for (const link of adjacency.get(current.id) ?? []) {
      if (reached.has(link.room.id)) continue;
      reached.add(link.room.id);
      parent.set(link.room.id, current.id);
      queue.push(link.room);
    }
  }

  const roomById = new Map(rooms.map((r) => [r.id, r]));

  for (const room of required) {
    if (room.doors.length === 0) {
      issues.push({
        code: "room-without-door",
        severity: "critical",
        message: `Pièce sans porte : ${room.label} (niveau ${plan.level + 1})`,
        roomId: room.id,
        roomLabel: room.label,
      });
      continue;
    }
    if (!reached.has(room.id)) {
      issues.push({
        code: "room-unreachable",
        severity: "critical",
        message: `Pièce inaccessible depuis l'entrée : ${room.label} (niveau ${plan.level + 1})`,
        roomId: room.id,
        roomLabel: room.label,
      });
    }
  }

  // Cheminement passant par une pièce privée (chambre traversée, etc.).
  const pathThroughPrivate = (room: PlanRoom): PlanRoom | null => {
    let current = parent.get(room.id) ?? null;
    const seen = new Set<string>([room.id]);
    while (current) {
      if (seen.has(current)) break;
      seen.add(current);
      const node = roomById.get(current);
      if (!node) break;
      if (PRIVATE_KINDS.has(node.kind)) return node;
      current = parent.get(current) ?? null;
    }
    return null;
  };

  for (const room of required) {
    if (!reached.has(room.id) || WET_KINDS.has(room.kind)) continue;
    const privateNode = pathThroughPrivate(room);
    if (privateNode) {
      issues.push({
        code: "private-passage",
        severity: "warning",
        message: `Accès à ${room.label} uniquement en traversant ${privateNode.label} (pièce privée) — niveau ${plan.level + 1}`,
        roomId: room.id,
        roomLabel: room.label,
      });
    }
  }

  // Portes : largeur, débouché, dégagement, heurts et superpositions.
  let conflicts = 0;
  let blockedDoors = 0;
  let minDoorWidth = Infinity;

  for (const room of rooms) {
    const doors = room.doors.filter((d) => d.width > 0.05);
    for (const door of doors) {
      minDoorWidth = Math.min(minDoorWidth, door.width);
      const exterior = onFacade(room, door.wall, plan);
      const ownInterval = openingInterval(room, door);
      // Une porte n'a de débouché que si la pièce voisine porte une porte qui
      // se recouvre réellement sur le même mur (aucune ouverture décorative).
      const matchesPassage = rooms.some((other) => {
        if (other === room) return false;
        const boundary = boundaryBetween(room, other);
        if (!boundary) return false;
        const ownWall = boundary.aWall;
        const otherWall = boundary.bWall;
        if (door.wall !== ownWall) return false;
        return other.doors.some((d) => {
          if (d.wall !== otherWall) return false;
          const otherInterval = openingInterval(other, d);
          const overlap =
            Math.min(ownInterval.to, otherInterval.to) -
            Math.max(ownInterval.from, otherInterval.from);
          return overlap >= MIN_PASSAGE_WIDTH;
        });
      });
      if (!exterior && !matchesPassage) {
        issues.push({
          code: "door-orphan",
          severity: "warning",
          message: `Porte sans débouché : ${room.label} (mur ${door.wall}, niveau ${plan.level + 1})`,
          roomId: room.id,
          roomLabel: room.label,
        });
      }
      if (door.width < 0.6) {
        issues.push({
          code: "door-too-narrow",
          severity: "critical",
          message: `Porte trop étroite (${door.width.toFixed(2)} m) : ${room.label}`,
          roomId: room.id,
          roomLabel: room.label,
        });
      } else if (door.width < 0.75) {
        issues.push({
          code: "door-too-narrow",
          severity: "warning",
          message: `Porte inférieure à 0,75 m (${door.width.toFixed(2)} m) : ${room.label}`,
          roomId: room.id,
          roomLabel: room.label,
        });
      }

      const lane = doorLaneWidth(room, door, blockers);
      if (lane < 0.55) {
        blockedDoors++;
        issues.push({
          code: "door-blocked",
          severity: "critical",
          message: `Porte obstruée par du mobilier : ${room.label} — ${lane.toFixed(2)} m de passage libre (niveau ${plan.level + 1})`,
          roomId: room.id,
          roomLabel: room.label,
        });
      } else if (lane < Math.min(door.width, CIRCULATION_ACCESSIBLE_DOOR_WIDTH) - 0.05) {
        blockedDoors++;
        issues.push({
          code: "door-blocked",
          severity: "warning",
          message: `Dégagement réduit devant la porte (${lane.toFixed(2)} m) : ${room.label}`,
          roomId: room.id,
          roomLabel: room.label,
        });
      }
    }

    // Superpositions d'ouvertures dans un même mur.
    const byWall = new Map<WallSide, { wall: WallSide; position: number; width: number; door: boolean }[]>();
    for (const d of room.doors) {
      (byWall.get(d.wall) ?? byWall.set(d.wall, []).get(d.wall)!).push({
        wall: d.wall,
        position: d.position,
        width: d.width,
        door: true,
      });
    }
    for (const w of room.windows) {
      (byWall.get(w.wall) ?? byWall.set(w.wall, []).get(w.wall)!).push({
        wall: w.wall,
        position: w.position,
        width: w.width,
        door: false,
      });
    }
    for (const [wall, openings] of byWall) {
      const sorted = [...openings].sort((a, b) => a.position - b.position);
      for (let i = 0; i + 1 < sorted.length; i++) {
        const a = sorted[i];
        const b = sorted[i + 1];
        if (a.position + a.width > b.position + 0.02) {
          conflicts++;
          issues.push({
            code: "door-overlap",
            severity: "warning",
            message: `Ouvertures superposées (mur ${wall}) : ${room.label}`,
            roomId: room.id,
            roomLabel: room.label,
          });
          break;
        }
      }
    }

    // Battants qui se heurtent : deux portes qui se font face (murs opposés)
    // et dont les débattements se rejoignent. Les portes de murs adjacents
    // s'ouvrent en angle et ne se heurtent pas.
    const opposite: Record<WallSide, WallSide> = { N: "S", S: "N", E: "W", W: "E" };
    for (let i = 0; i < doors.length; i++) {
      for (let j = i + 1; j < doors.length; j++) {
        if (doors[j].wall !== opposite[doors[i].wall]) continue;
        const boxA = swingBox(room, doors[i]);
        const boxB = swingBox(room, doors[j]);
        if (overlapArea(boxA, boxB) > 0.08) {
          conflicts++;
          issues.push({
            code: "door-swing-conflict",
            severity: "warning",
            message: `Portes qui se heurtent : ${room.label}`,
            roomId: room.id,
            roomLabel: room.label,
          });
        }
      }
    }
  }

  // Circulations : largeur libre, culs-de-sac, longueur.
  const corridorsDetail: CorridorReport[] = [];
  for (const room of rooms) {
    if (!CIRCULATION_KINDS.has(room.kind)) continue;
    const width = clearWidth(room, blockers);
    const incident = passages.filter((p) => p.a === room || p.b === room).length;
    const exteriorDoors = room.doors.filter((d) => onFacade(room, d.wall, plan)).length;
    const deadEnd =
      room.kind === "couloir" && incident <= 1 && exteriorDoors === 0;
    const obstructed = width < CIRCULATION_ABSOLUTE_MIN_WIDTH;
    const long = Math.max(room.w, room.h) > CIRCULATION_MAX_CORRIDOR_LENGTH;

    if (room.kind !== "escalier") {
      if (obstructed) {
        issues.push({
          code: "corridor-too-narrow",
          severity: "critical",
          message: `Passage impraticable (${width.toFixed(2)} m) : ${room.label} — niveau ${plan.level + 1}`,
          roomId: room.id,
          roomLabel: room.label,
        });
      } else if (width < CIRCULATION_MIN_WIDTH) {
        issues.push({
          code: "corridor-too-narrow",
          severity: "critical",
          message: `Passage inférieur à 0,90 m (${width.toFixed(2)} m) : ${room.label} — niveau ${plan.level + 1}`,
          roomId: room.id,
          roomLabel: room.label,
        });
      } else if (width < CIRCULATION_TARGET_WIDTH) {
        issues.push({
          code: "corridor-too-narrow",
          severity: "warning",
          message: `Couloir en dessous de l'objectif 1,00 m (${width.toFixed(2)} m) : ${room.label}`,
          roomId: room.id,
          roomLabel: room.label,
        });
      }
      if (deadEnd) {
        issues.push({
          code: "corridor-dead-end",
          severity: "critical",
          message: `Couloir en cul-de-sac : ${room.label} (niveau ${plan.level + 1})`,
          roomId: room.id,
          roomLabel: room.label,
        });
      } else if (long && width < 1.05) {
        issues.push({
          code: "corridor-too-long",
          severity: "warning",
          message: `Couloir long et étroit (${Math.max(room.w, room.h).toFixed(1)} m × ${width.toFixed(2)} m) : ${room.label}`,
          roomId: room.id,
          roomLabel: room.label,
        });
      }
    }

    corridorsDetail.push({
      roomId: room.id,
      label: room.label,
      kind: room.kind,
      width,
      length: round2(Math.max(room.w, room.h)),
      passages: incident,
      deadEnd,
      obstructed,
      ok:
        room.kind === "escalier"
          ? true
          : width >= CIRCULATION_MIN_WIDTH && !deadEnd,
    });
  }

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.length - criticalCount;
  const score = Math.max(40, 100 - criticalCount * 12 - warningCount * 2);
  const minCorridor = corridorsDetail
    .filter((c) => c.kind !== "escalier")
    .reduce((min, c) => Math.min(min, c.width), Infinity);

  const ordered = [
    ...issues.filter((i) => i.severity === "critical"),
    ...issues.filter((i) => i.severity === "warning"),
  ];

  return {
    ok: criticalCount === 0,
    score,
    issues: ordered,
    corridorsDetail,
    corridors: corridorsDetail.length,
    minCorridorWidth: Number.isFinite(minCorridor) ? round2(minCorridor) : 0,
    minDoorWidth: Number.isFinite(minDoorWidth) ? round2(minDoorWidth) : 0,
    unreachable: issues
      .filter((i) => i.code === "room-unreachable" || i.code === "room-without-door")
      .map((i) => i.roomLabel ?? i.message),
    conflicts,
    blockedDoors,
    privatePassages: issues.filter((i) => i.code === "private-passage").length,
    notes: ordered
      .filter((i) => i.severity === "warning")
      .map((i) => i.message)
      .slice(0, 6),
    rooms: rooms.length,
    reachableRooms: reached.size,
    entryFound,
    passages: passages.length,
    reachableRoomIds: [...reached],
  };
}

/** Agrège les rapports des niveaux (une seule ligne dans la validation). */
export function summarizeCirculation(
  reports: readonly CirculationReport[],
): CirculationSummary {
  const corridors = reports.reduce((s, r) => s + r.corridors, 0);
  // Un niveau dont la seule circulation est la cage d'escalier n'a pas de
  // largeur de passage à comparer : elle ne doit pas ramener le minimum à 0.
  const corridorWidths = reports
    .map((r) => r.minCorridorWidth)
    .filter((w) => w > 0);
  const minCorridorWidth = corridorWidths.length
    ? Math.min(...corridorWidths)
    : 0;
  const doors = reports.map((r) => r.minDoorWidth).filter((w) => w > 0);
  return {
    ok: reports.every((r) => r.ok),
    corridors,
    minCorridorWidth: Number.isFinite(minCorridorWidth)
      ? round2(minCorridorWidth)
      : 0,
    minDoorWidth: doors.length ? round2(Math.min(...doors)) : 0,
    unreachable: reports.flatMap((r) => r.unreachable),
    conflicts: reports.reduce((s, r) => s + r.conflicts, 0),
    blockedDoors: reports.reduce((s, r) => s + r.blockedDoors, 0),
    privatePassages: reports.reduce((s, r) => s + r.privatePassages, 0),
    notes: [...new Set(
      reports.flatMap((r) =>
        r.issues.filter((i) => i.severity === "warning").map((i) => i.message),
      ),
    )].slice(0, 6),
  };
}

// ── Optimisation automatique ────────────────────────────────────────────────

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Referme une ouverture dans la longueur réelle de son mur. */
function clampDoor(room: PlanRoom, door: DoorSpec): void {
  const len = wallLength(room, door.wall);
  door.width = Math.max(0.5, Math.min(door.width, Math.max(0.5, len - 0.12)));
  door.position = Math.max(
    0,
    Math.min(door.position, Math.max(0, len - door.width)),
  );
}

/** Retire les portes nulles ou dupliquées d'une pièce. */
function sanitizeRoom(room: PlanRoom): void {
  const seen = new Set<string>();
  room.doors = room.doors.filter((d) => {
    if (!Number.isFinite(d.width) || !Number.isFinite(d.position)) return false;
    clampDoor(room, d);
    if (d.width <= 0.05) return false;
    const key = `${d.wall}|${round3(d.position)}|${round3(d.width)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Intervalles occupés le long d'un mur mitoyen, dans le repère global.
 * Seules les ouvertures réellement percées dans CE mur comptent : une porte du
 * mur perpendiculaire ne doit jamais bloquer la pose d'une nouvelle porte.
 */
function occupiedOnWall(
  sides: readonly { room: PlanRoom; wall: WallSide }[],
  from: number,
  to: number,
  exclude?: { room: PlanRoom; opening: unknown },
): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  for (const { room, wall } of sides) {
    for (const opening of [...room.doors, ...room.windows]) {
      if (opening.wall !== wall) continue;
      if (exclude && exclude.room === room && exclude.opening === opening) continue;
      const interval = openingInterval(room, opening);
      const lo = Math.max(from, interval.from);
      const hi = Math.min(to, interval.to);
      if (hi > lo) out.push({ from: lo, to: hi });
    }
  }
  return out.sort((a, b) => a.from - b.from);
}

/** Cherche un intervalle libre de `width` entre `from` et `to`. */
function freeGap(
  occupied: { from: number; to: number }[],
  from: number,
  to: number,
  width: number,
  preferred?: number,
): number | null {
  const gaps: { from: number; to: number }[] = [];
  let cursor = from;
  for (const iv of occupied) {
    if (iv.from - cursor >= width) gaps.push({ from: cursor, to: iv.from });
    cursor = Math.max(cursor, iv.to);
  }
  if (to - cursor >= width) gaps.push({ from: cursor, to });
  if (gaps.length === 0) return null;
  if (preferred != null) {
    let best = gaps[0];
    let bestDistance = Infinity;
    for (const gap of gaps) {
      const center = (gap.from + gap.to) / 2;
      const distance = Math.abs(center - preferred);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = gap;
      }
    }
    return round3(
      Math.min(Math.max(preferred - width / 2, best.from), best.to - width),
    );
  }
  const largest = gaps.sort((a, b) => b.to - b.from - (a.to - a.from))[0];
  return round3(largest.from + (largest.to - largest.from - width) / 2);
}

/**
 * Ajoute une porte IDENTIQUE sur les deux pièces d'un mur mitoyen, dans un
 * espace libre des deux murs (aucune superposition avec une fenêtre existante).
 */
function addPairedDoor(
  a: PlanRoom,
  b: PlanRoom,
  boundary: Boundary,
  desiredWidth = 0.9,
): boolean {
  const width = Math.min(desiredWidth, boundary.length - 0.12);
  if (width < 0.6) return false;
  const occupied = occupiedOnWall(
    [
      { room: a, wall: boundary.aWall },
      { room: b, wall: boundary.bWall },
    ],
    boundary.from,
    boundary.to,
  );
  const start = freeGap(
    occupied,
    boundary.from,
    boundary.to,
    width,
    (boundary.from + boundary.to) / 2,
  );
  if (start == null) return false;
  const originA = boundary.axis === "x" ? a.x : a.y;
  const originB = boundary.axis === "x" ? b.x : b.y;
  a.doors.push({
    wall: boundary.aWall,
    position: round3(start - originA),
    width: round3(width),
  });
  b.doors.push({
    wall: boundary.bWall,
    position: round3(start - originB),
    width: round3(width),
  });
  return true;
}

/** Ajoute une porte d'entrée sur la meilleure façade libre. */
function addEntryDoor(plan: FloorPlan): boolean {
  const rooms = plan.rooms.filter((r) => !r.exterior);
  const candidates = rooms
    .filter((r) => facadeWalls(r, plan).length > 0)
    .sort((a, b) => {
      const rank = (r: PlanRoom) =>
        r.kind === "hall"
          ? 0
          : PUBLIC_KINDS.has(r.kind)
            ? 1
            : PRIVATE_KINDS.has(r.kind)
              ? 3
              : 2;
      return rank(a) - rank(b) || b.area - a.area;
    });
  for (const room of candidates) {
    for (const wall of facadeWalls(room, plan)) {
      const len = wallLength(room, wall);
      const width = Math.min(1.0, len - 0.4);
      if (width < 0.8) continue;
      const horizontal = wall === "N" || wall === "S";
      const origin = horizontal ? room.x : room.y;
      const occupied = occupiedOnWall([{ room, wall }], origin, origin + len);
      const position = freeGap(occupied, origin, origin + len, width);
      if (position == null) continue;
      room.doors.push({
        wall,
        position: round3(position - origin),
        width: round3(width),
        isEntry: true,
      });
      return true;
    }
  }
  return false;
}

/**
 * Corrige les ouvertures superposées d'un mur en déplaçant la fenêtre
 * (ou la porte non structurelle) dans un espace libre ; jamais de perte
 * d'accès : une porte n'est retirée que si la pièce en conserve une autre.
 */
function fixOverlaps(plan: FloorPlan): CirculationFix[] {
  const fixes: CirculationFix[] = [];
  for (const room of plan.rooms) {
    for (const wall of ["N", "S", "E", "W"] as WallSide[]) {
      const len = wallLength(room, wall);
      const doors = room.doors.filter((d) => d.wall === wall);
      const windows = room.windows.filter((w) => w.wall === wall);
      if (doors.length + windows.length < 2) continue;

      const overlaps = (
        a: { position: number; width: number },
        b: { position: number; width: number },
      ) => a.position + a.width > b.position + 0.02 && b.position + b.width > a.position + 0.02;

      // 1. Fenêtres en conflit : elles sont déplacées (aucun accès perdu).
      for (const window of windows) {
        const blocker = [...doors, ...windows].find(
          (other) => other !== window && overlaps(window, other),
        );
        if (!blocker) continue;
        const horizontal = wall === "N" || wall === "S";
        const origin = horizontal ? room.x : room.y;
        const occupied = occupiedOnWall([{ room, wall }], origin, origin + len, {
          room,
          opening: window,
        });
        const start = freeGap(occupied, origin, origin + len, window.width);
        if (start == null) continue;
        window.position = round3(start - origin);
        fixes.push({
          code: "door-moved",
          message: `Fenêtre déplacée pour dégager le passage (${room.label})`,
          roomId: room.id,
        });
      }

      // 2. Portes en conflit : déplacement dans un espace libre si possible.
      for (const door of doors) {
        const blocker = [...doors, ...windows].find(
          (other) => other !== door && overlaps(door, other),
        );
        if (!blocker) continue;
        const horizontal = wall === "N" || wall === "S";
        const origin = horizontal ? room.x : room.y;
        const occupied = occupiedOnWall([{ room, wall }], origin, origin + len, {
          room,
          opening: door,
        });
        const start = freeGap(
          occupied,
          origin,
          origin + len,
          door.width,
          origin + door.position,
        );
        if (start == null) continue;
        door.position = round3(start - origin);
        fixes.push({
          code: "door-moved",
          message: `Porte repositionnée pour ne pas heurter une ouverture (${room.label})`,
          roomId: room.id,
        });
      }
    }
  }
  return fixes;
}

/** Choisit le meilleur voisin pour raccorder une pièce inaccessible. */
function bestNeighbour(
  plan: FloorPlan,
  room: PlanRoom,
  reachable: ReadonlySet<string>,
): { room: PlanRoom; boundary: Boundary } | null {
  const candidates: { room: PlanRoom; boundary: Boundary; score: number }[] = [];
  for (const other of plan.rooms) {
    if (other === room || other.exterior) continue;
    const boundary = boundaryBetween(room, other);
    if (!boundary || boundary.length < 0.7) continue;
    let score = boundary.length;
    if (reachable.has(other.id)) score += 100;
    if (CIRCULATION_KINDS.has(other.kind)) score += 40;
    else if (PUBLIC_KINDS.has(other.kind)) score += 20;
    if (PRIVATE_KINDS.has(other.kind)) score -= 15;
    if (other.kind === "wc" || other.kind === "sanitaire") score -= 40;
    candidates.push({ room: other, boundary, score });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}

/**
 * Décale les ouvertures d'une pièce pour qu'elles restent à la même place dans
 * le bâtiment quand l'origine de la pièce bouge (déplacement de cloison).
 */
function keepOpeningsInPlace(room: PlanRoom, dx: number, dy: number): void {
  for (const opening of [...room.doors, ...room.windows]) {
    opening.position = round3(
      opening.wall === "N" || opening.wall === "S"
        ? opening.position - dx
        : opening.position - dy,
    );
  }
}

/**
 * Élargit un passage trop étroit en déplaçant la cloison qu'il partage avec la
 * pièce voisine, SANS changer l'emprise du niveau : la largeur nécessaire est
 * prise à la pièce la plus vaste, jamais inventée. Les surfaces des deux pièces
 * sont recalculées et les ouvertures conservent leur position réelle.
 */
function widenNarrowCirculation(plan: FloorPlan): CirculationFix[] {
  const fixes: CirculationFix[] = [];
  for (const room of plan.rooms) {
    if (room.exterior || !CIRCULATION_KINDS.has(room.kind)) continue;
    if (room.kind === "escalier") continue;
    const narrowX = room.w < room.h;
    const width = narrowX ? room.w : room.h;
    if (width >= CIRCULATION_MIN_WIDTH) continue;
    const shortfall = round3(
      Math.min(CIRCULATION_MIN_WIDTH - width + 0.01, 0.35),
    );

    // Voisin qui partage toute la longueur de la cloison à déplacer : les deux
    // pièces doivent se superposer exactement sur l'autre axe, sinon la
    // correction laisserait un trou ou un recouvrement dans le niveau.
    const neighbours: { room: PlanRoom; side: "before" | "after" }[] = [];
    for (const other of plan.rooms) {
      if (other === room || other.exterior) continue;
      if (narrowX) {
        if (
          Math.abs(other.y - room.y) > TOL ||
          Math.abs(other.y + other.h - (room.y + room.h)) > TOL ||
          other.w < 1.2
        ) {
          continue;
        }
        if (Math.abs(other.x - (room.x + room.w)) < TOL) {
          neighbours.push({ room: other, side: "after" });
        } else if (Math.abs(other.x + other.w - room.x) < TOL) {
          neighbours.push({ room: other, side: "before" });
        }
      } else {
        if (
          Math.abs(other.x - room.x) > TOL ||
          Math.abs(other.x + other.w - (room.x + room.w)) > TOL ||
          other.h < 1.2
        ) {
          continue;
        }
        if (Math.abs(other.y - (room.y + room.h)) < TOL) {
          neighbours.push({ room: other, side: "after" });
        } else if (Math.abs(other.y + other.h - room.y) < TOL) {
          neighbours.push({ room: other, side: "before" });
        }
      }
    }
    const target = neighbours.sort((a, b) => b.room.area - a.room.area)[0];
    if (!target) continue;
    const other = target.room;

    if (narrowX) {
      if (target.side === "after") {
        room.w = round3(room.w + shortfall);
        other.x = round3(other.x + shortfall);
        other.w = round3(other.w - shortfall);
        keepOpeningsInPlace(other, shortfall, 0);
      } else {
        room.x = round3(room.x - shortfall);
        room.w = round3(room.w + shortfall);
        other.w = round3(other.w - shortfall);
        keepOpeningsInPlace(room, -shortfall, 0);
      }
    } else if (target.side === "after") {
      room.h = round3(room.h + shortfall);
      other.y = round3(other.y + shortfall);
      other.h = round3(other.h - shortfall);
      keepOpeningsInPlace(other, 0, shortfall);
    } else {
      room.y = round3(room.y - shortfall);
      room.h = round3(room.h + shortfall);
      other.h = round3(other.h - shortfall);
      keepOpeningsInPlace(room, 0, -shortfall);
    }
    room.area = round3(room.w * room.h);
    other.area = round3(other.w * other.h);
    sanitizeRoom(room);
    sanitizeRoom(other);
    fixes.push({
      code: "corridor-widened",
      message: `Passage élargi à ${CIRCULATION_MIN_WIDTH.toFixed(2)} m : ${room.label} (surface prise sur ${other.label})`,
      roomId: room.id,
    });
  }
  return fixes;
}

/**
 * Optimisation automatique de la circulation d'un niveau (en place).
 *
 * Ne modifie QUE des portes (ajout / déplacement) : dimensions, surfaces,
 * fonctions et nombre de pièces restent strictement inchangés. Les corrections
 * sont relancées jusqu'à stabilisation (3 passes maximum), puis le rapport
 * final signale les problèmes qui n'ont pas pu être résolus.
 */
export function optimizeCirculation(
  plan: FloorPlan,
  options: CirculationOptions = {},
): { report: CirculationReport; fixes: CirculationFix[] } {
  const fixes: CirculationFix[] = [];
  const requireEntry = options.requireEntry === true;
  const foodService = isFoodServicePlan(plan);
  const repairOpenings = options.repairOpenings !== false;

  for (let pass = 0; pass < 3; pass++) {
    for (const room of plan.rooms) sanitizeRoom(room);
    // Passages sous 0,90 m : la cloison mitoyenne est déplacée dans l'emprise
    // existante, avant tout autre contrôle.
    fixes.push(...widenNarrowCirculation(plan));
    // En restauration, les ouvertures (passe-plat, bar, service) sont déjà
    // calées par les règles du type : on ne les déplace pas.
    if (repairOpenings && !foodService) fixes.push(...fixOverlaps(plan));

    if (requireEntry && plan.level === 0) {
      const hasEntry = plan.rooms.some((r) =>
        r.doors.some((d) => d.isEntry && onFacade(r, d.wall, plan)),
      );
      if (!hasEntry && addEntryDoor(plan)) {
        fixes.push({
          code: "entry-added",
          message: "Porte d'entrée ajoutée sur la façade principale",
        });
      }
    }

    const report = analyzeCirculation(plan, { ...options, requireEntry });
    let changed = false;

    // 1. Toute pièce inaccessible est raccordée à un voisin atteignable.
    //    En restauration, l'implantation (bar, passe-plat, flux de service) est
    //    déjà traitée par les règles du type : aucune porte n'est ajoutée ici,
    //    ce qui préserverait mal un linéaire de bar ou un passe-plat.
    for (const issue of report.issues) {
      if (foodService) break;
      if (issue.code !== "room-unreachable" && issue.code !== "room-without-door") {
        continue;
      }
      const room = plan.rooms.find((r) => r.id === issue.roomId);
      if (!room) continue;
      const reachable = new Set(report.reachableRoomIds);
      const neighbour = bestNeighbour(plan, room, reachable);
      if (!neighbour) continue;
      if (!canAddDoor(plan, room, neighbour.room)) continue;
      if (hasPassageBetween(room, neighbour.room)) continue;
      if (addPairedDoor(room, neighbour.room, neighbour.boundary, 0.9)) {
        fixes.push({
          code: "door-added",
          message: `Porte ajoutée entre ${room.label} et ${neighbour.room.label}`,
          roomId: room.id,
        });
        changed = true;
      }
    }

    // 2. Accès à une pièce traversant une pièce privée : une porte directe est
    //    ajoutée si un espace de circulation ou public est mitoyen. En
    //    restauration, les flux de service sont déjà contrôlés par leurs
    //    propres règles (aucune porte sanitaire ↔ production n'est ajoutée).
    for (const issue of report.issues) {
      if (foodService || issue.code !== "private-passage") continue;
      const room = plan.rooms.find((r) => r.id === issue.roomId);
      if (!room) continue;
      // Une pièce déjà reliée à une circulation n'a pas besoin d'une porte de
      // plus : on évite de multiplier les ouvrants dans une même pièce.
      if (
        plan.rooms.some(
          (other) =>
            other !== room &&
            !other.exterior &&
            (CIRCULATION_KINDS.has(other.kind) || PUBLIC_KINDS.has(other.kind)) &&
            hasPassageBetween(room, other),
        )
      ) {
        continue;
      }
      const reachable = new Set(report.reachableRoomIds);
      const candidates = plan.rooms
        .filter(
          (other) =>
            other !== room &&
            !other.exterior &&
            (CIRCULATION_KINDS.has(other.kind) || PUBLIC_KINDS.has(other.kind)) &&
            reachable.has(other.id) &&
            canAddDoor(plan, room, other) &&
            !hasPassageBetween(room, other),
        )
        .map((other) => ({ room: other, boundary: boundaryBetween(room, other) }))
        .filter(
          (c): c is { room: PlanRoom; boundary: Boundary } => !!c.boundary,
        )
        .sort((a, b) => b.boundary.length - a.boundary.length);
      let added = false;
      for (const candidate of candidates) {
        if (addPairedDoor(room, candidate.room, candidate.boundary, 0.9)) {
          fixes.push({
            code: "door-added",
            message: `Accès direct ajouté entre ${room.label} et ${candidate.room.label}`,
            roomId: room.id,
          });
          added = true;
          changed = true;
          break;
        }
      }
      if (added) break;
    }

    // 3. Couloir en cul-de-sac : une porte est ouverte vers une pièce mitoyenne
    //    qu'il peut desservir, pour en faire une vraie distribution.
    for (const issue of report.issues) {
      if (foodService || issue.code !== "corridor-dead-end") continue;
      const corridor = plan.rooms.find((r) => r.id === issue.roomId);
      if (!corridor) continue;
      const candidates = plan.rooms
        .filter(
          (other) =>
            other !== corridor &&
            !other.exterior &&
            !CIRCULATION_KINDS.has(other.kind),
        )
        .map((other) => {
          const boundary = boundaryBetween(corridor, other);
          const rank =
            PUBLIC_KINDS.has(other.kind)
              ? 3
              : other.kind === "wc" || other.kind === "sanitaire"
                ? 0
                : PRIVATE_KINDS.has(other.kind)
                  ? 1
                  : 2;
          return { room: other, boundary, score: rank * 10 + (boundary?.length ?? 0) };
        })
        .filter(
          (c): c is { room: PlanRoom; boundary: Boundary; score: number } =>
            !!c.boundary,
        )
        .sort((a, b) => b.score - a.score);
      for (const candidate of candidates) {
        if (!canAddDoor(plan, corridor, candidate.room)) continue;
        if (hasPassageBetween(corridor, candidate.room)) continue;
        if (addPairedDoor(corridor, candidate.room, candidate.boundary, 0.9)) {
          fixes.push({
            code: "door-added",
            message: `Couloir raccordé à ${candidate.room.label}`,
            roomId: corridor.id,
          });
          changed = true;
          break;
        }
      }
    }

    if (!changed) break;
  }

  for (const room of plan.rooms) sanitizeRoom(room);
  return {
    report: analyzeCirculation(plan, { ...options, requireEntry }),
    fixes,
  };
}
