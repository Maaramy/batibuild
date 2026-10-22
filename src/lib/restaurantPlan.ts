// ============================================================================
// RÈGLES DE PLAN — RESTAURANT
// ----------------------------------------------------------------------------
// Ce module porte les règles propres au type de projet « Restaurant » :
//
//   • la SALLE DE RESTAURATION (clients) occupe 60 % de la surface couverte ;
//     le solde (40 %) reçoit la cuisine professionnelle, la plonge, la réserve,
//     les locaux techniques, les sanitaires et la circulation de service ;
//   • le COMPTOIR (bar) est un équipement INTÉRIEUR à la salle : jamais une
//     pièce, jamais une surface ajoutée au total. Sa géométrie est calculée ici,
//     une seule fois, et consommée par le rendu 2D et par la validation ;
//   • le comptoir est adossé au mur mitoyen de la cuisine professionnelle :
//     le personnel dispose d'un plan de travail (passe) + d'un passage derrière
//     le bar, et le Passe-plat est percé dans ce même mur, au-dessus du plan de
//     travail, pour le transfert des plats sans traverser la salle.
//
// Aucun autre type de projet n'utilise ces règles : le café conserve les
// siennes (`cafePlan.ts`) et les autres typologies ne changent pas.
// ============================================================================

import type { FloorPlan, PlanRoom, WallSide } from "./floorPlanEngine";
import {
  cafeDoorClearances as doorClearances,
  cafeRectsOverlap as rectsOverlap,
  type CafeRect as PlanRect,
} from "./cafePlan";

/** Part de la surface couverte réservée à la salle de restauration. */
export const RESTAURANT_SALLE_SHARE = 0.6;
/** Borne basse admise (contraintes réelles de configuration). */
export const RESTAURANT_SALLE_SHARE_MIN = 0.55;
/** Borne haute admise (la salle ne doit pas étouffer la cuisine). */
export const RESTAURANT_SALLE_SHARE_MAX = 0.65;

/** Profondeur du plan de travail / passe adossé au mur de cuisine (m). */
export const RESTAURANT_WORKTOP_DEPTH = 0.55;
/** Largeur du comptoir-bar côté clients (m). */
export const RESTAURANT_COUNTER_DEPTH = 0.7;
/** Passage du personnel entre le plan de travail et le bar (m). */
export const RESTAURANT_STAFF_AISLE = 0.9;
/** Dégagement client devant le bar (m). */
export const RESTAURANT_CLIENT_AISLE = 1.1;
/** Longueur minimale / maximale du bar (m). */
export const RESTAURANT_COUNTER_MIN_LENGTH = 1.4;
export const RESTAURANT_COUNTER_MAX_LENGTH = 5.5;
/** Largeur du passe-plat percé dans le mur cuisine ↔ salle (m). */
export const RESTAURANT_PASSE_PLAT_WIDTH = 1.2;

const TOL = 0.002;
const WALLS: WallSide[] = ["N", "S", "E", "W"];

/** Le type de projet est-il « Restaurant » (et seulement lui) ? */
export function isRestaurantCategory(category: string | null | undefined): boolean {
  const normalized = String(category ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return normalized === "restaurant";
}

export interface RestaurantCounterPlacement {
  /** Mur de la salle le long duquel le bar est implanté. */
  wall: WallSide;
  /** Bar côté clients. */
  counter: PlanRect;
  /** Passe / plan de travail adossé au mur, derrière le bar. */
  worktop: PlanRect;
  /** Passage du personnel entre le plan de travail et le bar. */
  staffAisle: PlanRect;
  /** Dégagement client devant le bar. */
  clientAisle: PlanRect;
  /** Surface du bar — INCLUSE dans la salle, jamais ajoutée au total. */
  counterArea: number;
  /** Cuisine professionnelle associée (celle du mur d'implantation). */
  kitchen: PlanRoom | null;
  /** Ouverture de service (passe-plat) dans le mur cuisine ↔ salle. */
  passePlat: {
    wall: WallSide;
    position: number;
    width: number;
    /** Emprise du percement, dessinée à l'identique en 2D. */
    rect: PlanRect;
  } | null;
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
  return spans.filter((s) => s.b - s.a >= 1);
}

/** Cuisine professionnelle mitoyenne de la salle (la plus grande). */
export function restaurantKitchenNeighbour(
  salle: PlanRoom,
  rooms: readonly PlanRoom[],
): PlanRoom | null {
  const kitchens = rooms.filter(
    (r) => r !== salle && !r.exterior && r.kind === "cuisine_pro" && sharedWall(salle, r),
  );
  return kitchens.sort((a, b) => b.area - a.area)[0] ?? null;
}

/** Distance entre deux rectangles (0 s'ils se touchent). */
function rectDistance(a: PlanRect, b: PlanRect): number {
  const dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
  const dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
  return Math.hypot(dx, dy);
}

/** Distance du bar à la cuisine professionnelle (null si aucune cuisine). */
export function restaurantCounterToKitchen(
  placement: RestaurantCounterPlacement,
): number | null {
  if (!placement.kitchen) return null;
  return rectDistance(placement.counter, placement.kitchen);
}

/**
 * Implantation du bar à l'intérieur de la salle de restauration.
 *
 * Priorité absolue au mur mitoyen de la cuisine professionnelle : le bar est
 * dans l'axe du service (passe-plat + porte de service), le personnel travaille
 * derrière le comptoir et le client circule devant. Le bar reste entièrement
 * contenu dans la salle et n'ajoute aucune surface au total.
 */
export function restaurantCounterPlacement(
  salle: PlanRoom,
  rooms: readonly PlanRoom[],
  plan?: FloorPlan,
): RestaurantCounterPlacement | null {
  const kitchen = restaurantKitchenNeighbour(salle, rooms);
  const neighbours = rooms.filter((r) => r !== salle && !r.exterior);
  const serviceWalls = new Set<WallSide>();
  for (const r of neighbours) {
    if (r.kind !== "cuisine_pro" && r.kind !== "plonge") continue;
    const wall = sharedWall(salle, r);
    if (wall) serviceWalls.add(wall);
  }

  // Priorité : mur de la cuisine, puis murs intérieurs (le bar d'un restaurant
  // est un bar intérieur, pas une terrasse), puis façades en dernier recours.
  const nonFacade = plan
    ? WALLS.filter((w) => !onFacade(salle, w, plan))
    : [...WALLS];
  const candidateWalls: WallSide[] = [
    ...new Set<WallSide>([
      ...WALLS.filter((w) => serviceWalls.has(w)),
      ...nonFacade,
      ...WALLS,
    ]),
  ];

  // Dégagements des portes de la salle : le bar ne doit jamais s'implanter
  // dans le débattement d'une porte, y compris une entrée située sur un mur
  // perpendiculaire (l'extrémité du bar arrive alors devant le battant).
  const clearances = doorClearances(salle);
  const inDoorSwing = (placement: RestaurantCounterPlacement) =>
    clearances.some((c) => rectsOverlap(c, placement.counter));

  let best: RestaurantCounterPlacement | null = null;
  let relaxed: RestaurantCounterPlacement | null = null;
  for (const wall of candidateWalls) {
    const spans = freeSpans(salle, wall);
    if (spans.length === 0) continue;
    const span = spans.reduce((a, b) => (b.b - b.a > a.b - a.a ? b : a));
    const usable = span.b - span.a;
    const length = Math.min(RESTAURANT_COUNTER_MAX_LENGTH, usable - 0.02);
    if (length < RESTAURANT_COUNTER_MIN_LENGTH) continue;

    const depth = wall === "N" || wall === "S" ? salle.h : salle.w;
    const minimum = RESTAURANT_WORKTOP_DEPTH + RESTAURANT_COUNTER_DEPTH + 0.8;
    if (depth < minimum) continue;
    const staffAisle = Math.min(
      RESTAURANT_STAFF_AISLE,
      Math.max(
        0.6,
        depth - RESTAURANT_WORKTOP_DEPTH - RESTAURANT_COUNTER_DEPTH - 0.9,
      ),
    );

    // Trois implantations possibles dans l'intervalle libre : centrée, en fin
    // de mur (loin de l'entrée) puis en début de mur. La première qui ne
    // coupe aucun débattement de porte est retenue.
    const starts = [
      span.a + (usable - length) / 2,
      Math.max(span.a, span.b - length - 0.02),
      Math.min(span.b - length, span.a + 0.02),
    ];
    const kitchenNear = !!kitchen && sharedWall(salle, kitchen) === wall;
    for (const start of starts) {
      const placement = buildPlacement(salle, wall, start, length, staffAisle, kitchen, kitchenNear);
      if (!placement) continue;
      if (inDoorSwing(placement)) {
        if (!relaxed || placement.counterArea > relaxed.counterArea) relaxed = placement;
        continue;
      }
      // Le mur de la cuisine est prioritaire : le bar s'y adosse dès qu'une
      // implantation valide existe, quelle que soit sa longueur.
      if (kitchenNear) return placement;
      if (!best || placement.counterArea > best.counterArea) best = placement;
    }
  }
  return best ?? relaxed;
}

function buildPlacement(
  salle: PlanRoom,
  wall: WallSide,
  start: number,
  length: number,
  staffAisle: number,
  kitchen: PlanRoom | null,
  kitchenNear: boolean,
): RestaurantCounterPlacement | null {
  const worktopD = RESTAURANT_WORKTOP_DEPTH;
  const counterD = RESTAURANT_COUNTER_DEPTH;
  const x = wall === "W" || wall === "E" ? 0 : salle.x + start;
  const y = wall === "N" || wall === "S" ? 0 : salle.y + start;

  let worktop: PlanRect;
  let staff: PlanRect;
  let counter: PlanRect;
  let client: PlanRect;
  const depth = wall === "N" || wall === "S" ? salle.h : salle.w;
  // Allée client : bande de circulation de 1,10 m devant le bar. Le reste de
  // la salle reçoit les tables — toute la profondeur n'est pas une allée.
  const clientDepth = Math.max(
    0.6,
    Math.min(RESTAURANT_CLIENT_AISLE, depth - worktopD - counterD - staffAisle),
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

  const inside = (r: PlanRect) =>
    r.x >= salle.x - TOL &&
    r.y >= salle.y - TOL &&
    r.x + r.w <= salle.x + salle.w + TOL &&
    r.y + r.h <= salle.y + salle.h + TOL;
  if (!inside(counter) || !inside(worktop) || !inside(staff)) return null;

  // Passe-plat : percement dans le mur de cuisine, centré sur le bar et
  // au-dessus du plan de travail. Il ne consomme aucune surface.
  let passePlat: RestaurantCounterPlacement["passePlat"] = null;
  if (kitchenNear) {
    const width = Math.min(
      RESTAURANT_PASSE_PLAT_WIDTH,
      Math.max(0.9, length * 0.5),
    );
    const position = start + (length - width) / 2;
    const band = 0.18;
    const rect: PlanRect =
      wall === "N"
        ? { x: salle.x + position, y: salle.y + 0.01, w: width, h: band }
        : wall === "S"
          ? { x: salle.x + position, y: salle.y + salle.h - 0.01 - band, w: width, h: band }
          : wall === "W"
            ? { x: salle.x + 0.01, y: salle.y + position, w: band, h: width }
            : {
                x: salle.x + salle.w - 0.01 - band,
                y: salle.y + position,
                w: band,
                h: width,
              };
    passePlat = { wall, position, width, rect };
  }

  return {
    wall,
    counter,
    worktop,
    staffAisle: staff,
    clientAisle: client,
    counterArea: Math.round(counter.w * counter.h * 1000) / 1000,
    kitchen: kitchenNear ? kitchen : null,
    passePlat,
  };
}

/** Ouvertures à laisser libres devant les portes de la salle. */
export function restaurantDoorClearances(room: PlanRoom): PlanRect[] {
  return doorClearances(room);
}

/** Deux rectangles se chevauchent-ils (tolérance géométrique) ? */
export function restaurantRectsOverlap(a: PlanRect, b: PlanRect): boolean {
  return rectsOverlap(a, b);
}
