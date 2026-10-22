// ============================================================================
// RÈGLES DE PLAN — CAFÉ / SALLE DE CAFÉ
// ----------------------------------------------------------------------------
// Ce module porte les règles propres au type de projet « Café » :
//
//   • la SALLE CAFÉ (clients) occupe 70 % à 80 % de la surface couverte du
//     niveau, avec une cible de 75 % (70 % pour les petites surfaces, où les
//     locaux de service ont des minimums réels) ;
//   • le COMPTOIR est un équipement INTÉRIEUR à la salle : il n'est jamais une
//     pièce, jamais une surface ajoutée au total. Sa géométrie est calculée ici,
//     une seule fois, et consommée par le rendu 2D (mobilier) et par la
//     validation du plan ;
//   • le comptoir est adossé au mur qui donne sur l'espace de préparation
//     lorsqu'il existe : le personnel dispose d'une zone de travail derrière le
//     comptoir (plan de travail + passage) et rejoint la préparation par la
//     porte de ce mur, jamais bloquée par le mobilier.
//
// Aucun autre type de projet n'utilise ces règles : le restaurant conserve son
// programme et son comptoir-bar actuels.
// ============================================================================

import type { FloorPlan, PlanRoom, WallSide } from "./floorPlanEngine";

/** Cible de la part de surface couverte occupée par la salle café. */
export const CAFE_SALLE_SHARE_TARGET = 0.75;
/** Borne basse admise (les petits cafés descendent à 70 %). */
export const CAFE_SALLE_SHARE_MIN = 0.7;
/** Borne haute admise. */
export const CAFE_SALLE_SHARE_MAX = 0.8;

/** Profondeur du plan de travail adossé au mur (m). */
export const CAFE_WORKTOP_DEPTH = 0.5;
/** Largeur du comptoir client (m). */
export const CAFE_COUNTER_DEPTH = 0.6;
/** Passage du personnel entre le plan de travail et le comptoir (m). */
export const CAFE_STAFF_AISLE = 0.9;
/** Dégagement client devant le comptoir (m). */
export const CAFE_CLIENT_AISLE = 1.0;

const TOL = 0.002;
const WALLS: WallSide[] = ["N", "S", "E", "W"];

/** Le type de projet est-il « Café » (et seulement lui) ? */
export function isCafeCategory(category: string | null | undefined): boolean {
  const normalized = String(category ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return normalized === "cafe";
}

/**
 * Part de la surface couverte réservée à la salle café.
 * 75 % est la cible ; les surfaces inférieures à 80 m² passent à 70 % pour
 * laisser aux sanitaires, à la réserve et à la préparation des surfaces
 * réellement utilisables (le total reste dans la fourchette 70–80 %).
 */
export function cafeSalleShare(area: number): number {
  // `Math.round` évite qu'un écart d'arrondi au millimètre (79,999 m²) fasse
  // basculer un café de 80 m² d'une cible à l'autre.
  return Math.round(area) < 80 ? CAFE_SALLE_SHARE_MIN : CAFE_SALLE_SHARE_TARGET;
}

export interface CafeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Comptoir du café : équipement de la salle, jamais une pièce. */
export interface CafeCounterPlacement {
  /** Mur de la salle le long duquel le comptoir est implanté. */
  wall: WallSide;
  /** Comptoir client (le bar). */
  counter: CafeRect;
  /** Plan de travail adossé au mur, derrière le comptoir. */
  worktop: CafeRect;
  /** Passage du personnel entre le plan de travail et le comptoir. */
  staffAisle: CafeRect;
  /** Dégagement client devant le comptoir (allée de service). */
  clientAisle: CafeRect;
  /** Surface du comptoir — INCLUSE dans la salle, jamais ajoutée au total. */
  counterArea: number;
}

function wallLen(room: PlanRoom, wall: WallSide): number {
  return wall === "N" || wall === "S" ? room.w : room.h;
}

/** Le mur `wall` de `room` est-il en façade du niveau ? */
function onFacade(room: PlanRoom, wall: WallSide, plan: FloorPlan): boolean {
  if (wall === "N") return Math.abs(room.y) < TOL;
  if (wall === "S") return Math.abs(room.y + room.h - plan.width) < TOL;
  if (wall === "W") return Math.abs(room.x) < TOL;
  return Math.abs(room.x + room.w - plan.length) < TOL;
}

/** Mur mitoyen entre deux pièces (ou null). */
function sharedWall(a: PlanRoom, b: PlanRoom): WallSide | null {
  const touchEW =
    Math.abs(a.x + a.w - b.x) < TOL || Math.abs(b.x + b.w - a.x) < TOL;
  if (touchEW) {
    const overlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (overlap >= 1.1) {
      return Math.abs(a.x + a.w - b.x) < TOL ? "E" : "W";
    }
  }
  const touchNS =
    Math.abs(a.y + a.h - b.y) < TOL || Math.abs(b.y + b.h - a.y) < TOL;
  if (touchNS) {
    const overlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    if (overlap >= 1.1) {
      return Math.abs(a.y + a.h - b.y) < TOL ? "S" : "N";
    }
  }
  return null;
}

/** Intervalles libres d'un mur, portes exclues (avec marge). */
function freeSpans(room: PlanRoom, wall: WallSide): { a: number; b: number }[] {
  const len = wallLen(room, wall);
  const margin = 0.2;
  const blocked = room.doors
    .filter((d) => d.wall === wall)
    .map((d) => ({
      a: Math.max(0, d.position - margin),
      b: Math.min(len, d.position + d.width + margin),
    }))
    .sort((p, q) => p.a - q.a);
  const spans: { a: number; b: number }[] = [];
  let cursor = 0;
  for (const b of blocked) {
    if (b.a > cursor) spans.push({ a: cursor, b: b.a });
    cursor = Math.max(cursor, b.b);
  }
  if (cursor < len) spans.push({ a: cursor, b: len });
  return spans.filter((s) => s.b - s.a >= 1.2);
}

/** Rectangles de dégagement des portes, côté intérieur de la pièce. */
export function cafeDoorClearances(room: PlanRoom): CafeRect[] {
  return room.doors.map((d) => {
    const depth = Math.max(0.95, d.width + 0.15);
    switch (d.wall) {
      case "N":
        return { x: room.x + d.position, y: room.y, w: d.width, h: depth };
      case "S":
        return {
          x: room.x + d.position,
          y: room.y + room.h - depth,
          w: d.width,
          h: depth,
        };
      case "W":
        return { x: room.x, y: room.y + d.position, w: depth, h: d.width };
      default:
        return {
          x: room.x + room.w - depth,
          y: room.y + d.position,
          w: depth,
          h: d.width,
        };
    }
  });
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/**
 * Implantation du comptoir à l'intérieur de la salle café.
 *
 * Priorité au mur mitoyen de l'espace de préparation (`cuisine_pro` / `plonge`) :
 * le personnel passe derrière le comptoir puis rejoint directement la
 * préparation, sans traverser la salle. Le comptoir est placé dans le plus
 * grand intervalle libre du mur (aucune porte bloquée) et reste entièrement
 * contenu dans la salle.
 */
export function cafeCounterPlacement(
  salle: PlanRoom,
  rooms: readonly PlanRoom[],
  plan?: FloorPlan,
): CafeCounterPlacement | null {
  const neighbours = rooms.filter((r) => r !== salle && !r.exterior);
  const prepWalls = new Set<WallSide>();
  for (const r of neighbours) {
    if (r.kind !== "cuisine_pro" && r.kind !== "plonge") continue;
    const wall = sharedWall(salle, r);
    if (wall) prepWalls.add(wall);
  }

  // Priorité : mur de la préparation, puis murs intérieurs (le comptoir d'un
  // café est un bar intérieur, pas une terrasse), puis façades en dernier
  // recours lorsque la salle occupe tout le bâtiment.
  const nonFacade = plan
    ? WALLS.filter((w) => !onFacade(salle, w, plan))
    : [...WALLS];
  const candidateWalls: WallSide[] = [
    ...new Set<WallSide>([
      ...WALLS.filter((w) => prepWalls.has(w)),
      ...nonFacade,
      ...WALLS,
    ]),
  ];

  let best: CafeCounterPlacement | null = null;
  for (const wall of candidateWalls) {
    const isPrepWall = prepWalls.has(wall);
    const spans = freeSpans(salle, wall);
    if (spans.length === 0) continue;
    const span = spans.reduce((a, b) => (b.b - b.a > a.b - a.a ? b : a));
    const usable = span.b - span.a;
    const length = Math.min(3.8, usable);
    if (length < 1.6) continue;

    const depth = wall === "N" || wall === "S" ? salle.h : salle.w;
    const minimum = CAFE_WORKTOP_DEPTH + CAFE_COUNTER_DEPTH + 0.6;
    if (depth < minimum) continue;
    const staffAisle = Math.min(
      CAFE_STAFF_AISLE,
      Math.max(0.6, depth - CAFE_WORKTOP_DEPTH - CAFE_COUNTER_DEPTH - 0.9),
    );

    const start = span.a + (usable - length) / 2;
    const placement = buildPlacement(salle, wall, start, length, staffAisle);
    if (!placement) continue;
    // Le mur de la préparation est prioritaire : le comptoir s'y adosse dès
    // qu'une implantation valide existe, quelle que soit sa longueur.
    if (isPrepWall) return placement;
    if (!best || placement.counterArea > best.counterArea) best = placement;
  }
  return best;
}

function buildPlacement(
  salle: PlanRoom,
  wall: WallSide,
  start: number,
  length: number,
  staffAisle: number,
): CafeCounterPlacement | null {
  const worktopD = CAFE_WORKTOP_DEPTH;
  const counterD = CAFE_COUNTER_DEPTH;
  const x = wall === "W" || wall === "E" ? 0 : salle.x + start;
  const y = wall === "N" || wall === "S" ? 0 : salle.y + start;

  let worktop: CafeRect;
  let staff: CafeRect;
  let counter: CafeRect;
  let client: CafeRect;
  const clientDepth = Math.max(
    0.6,
    (wall === "N" || wall === "S" ? salle.h : salle.w) -
      worktopD -
      counterD -
      staffAisle,
  );

  switch (wall) {
    case "N": {
      const wy = salle.y + 0.02;
      worktop = { x, y: wy, w: length, h: worktopD };
      staff = { x, y: wy + worktopD, w: length, h: staffAisle };
      counter = { x, y: staff.y + staffAisle, w: length, h: counterD };
      client = { x, y: counter.y + counterD, w: length, h: clientDepth };
      break;
    }
    case "S": {
      const wy = salle.y + salle.h - 0.02 - worktopD;
      worktop = { x, y: wy, w: length, h: worktopD };
      staff = { x, y: wy - staffAisle, w: length, h: staffAisle };
      counter = { x, y: staff.y - counterD, w: length, h: counterD };
      client = { x, y: counter.y - clientDepth, w: length, h: clientDepth };
      break;
    }
    case "W": {
      const wx = salle.x + 0.02;
      worktop = { x: wx, y, w: worktopD, h: length };
      staff = { x: wx + worktopD, y, w: staffAisle, h: length };
      counter = { x: staff.x + staffAisle, y, w: counterD, h: length };
      client = { x: counter.x + counterD, y, w: clientDepth, h: length };
      break;
    }
    default: {
      const wx = salle.x + salle.w - 0.02 - worktopD;
      worktop = { x: wx, y, w: worktopD, h: length };
      staff = { x: wx - staffAisle, y, w: staffAisle, h: length };
      counter = { x: staff.x - counterD, y, w: counterD, h: length };
      client = { x: counter.x - clientDepth, y, w: clientDepth, h: length };
      break;
    }
  }

  const inside = (r: CafeRect) =>
    r.x >= salle.x - TOL &&
    r.y >= salle.y - TOL &&
    r.x + r.w <= salle.x + salle.w + TOL &&
    r.y + r.h <= salle.y + salle.h + TOL;
  if (!inside(counter) || !inside(worktop) || !inside(staff)) return null;

  return {
    wall,
    counter,
    worktop,
    staffAisle: staff,
    clientAisle: client,
    counterArea: Math.round(counter.w * counter.h * 1000) / 1000,
  };
}

/** Rectangles se chevauchent-ils (tolérance géométrique) ? */
export function cafeRectsOverlap(a: CafeRect, b: CafeRect): boolean {
  return (
    a.x + a.w > b.x + TOL &&
    b.x + b.w > a.x + TOL &&
    a.y + a.h > b.y + TOL &&
    b.y + b.h > a.y + TOL
  );
}
