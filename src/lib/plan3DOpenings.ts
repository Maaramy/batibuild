// ============================================================================
// OUVERTURES 3D — lecture unique des portes et fenêtres du plan
// ----------------------------------------------------------------------------
// Les renderers 2D et 3D consomment le même `FloorPlan`. Ce module extrait les
// ouvertures réellement dessinées sur les cloisons intérieures (portes et
// fenêtres de cour/patio) et fournit la position des battants de porte, afin
// que chaque moteur 3D perce exactement les mêmes murs que le plan 2D.
//
// Les murs extérieurs restent traités par les renderers (façades, allèges,
// linteaux, baies) : ici on ne décrit que les séparations intérieures.
// ============================================================================

import type { DoorSpec, FloorPlan, PlanRoom, WallSide } from "./floorPlanEngine";

const TOL = 0.02;

export type Opening3DKind = "door" | "window";

export interface Opening3D {
  /** Début de l'ouverture le long du mur (m). */
  a: number;
  /** Fin de l'ouverture le long du mur (m). */
  b: number;
  kind: Opening3DKind;
}

/** Battant de porte intérieure : position et sens d'ouverture. */
export interface InteriorDoor3D {
  wall: WallSide;
  /** Coordonnée fixe du mur : x pour W/E, z pour N/S. */
  line: number;
  /** Début de l'ouverture sur l'axe du mur. */
  a: number;
  width: number;
  /** +1 : s'ouvre vers les coordonnées croissantes, -1 vers décroissantes. */
  inward: 1 | -1;
}

export interface InteriorOpenings3D {
  vertical: Map<number, Opening3D[]>;
  horizontal: Map<number, Opening3D[]>;
  doors: InteriorDoor3D[];
}

const near = (a: number, b: number) => Math.abs(a - b) <= TOL;

/** Fusionne les intervalles qui se chevauchent ; une porte prime sur une fenêtre. */
export function mergeOpenings3D(list: Opening3D[]): Opening3D[] {
  if (list.length === 0) return [];
  const sorted = [...list].sort((p, q) => p.a - q.a);
  const out: Opening3D[] = [{ ...sorted[0] }];
  for (const iv of sorted.slice(1)) {
    const last = out[out.length - 1];
    if (iv.a <= last.b + TOL) {
      last.b = Math.max(last.b, iv.b);
      if (iv.kind === "door") last.kind = "door";
    } else {
      out.push({ ...iv });
    }
  }
  return out;
}

/** Morceaux pleins d'un segment après retrait des ouvertures. */
export function solidSpans3D(from: number, to: number, openings: Opening3D[]): Opening3D[] {
  const out: Opening3D[] = [];
  let cursor = from;
  for (const op of mergeOpenings3D(openings)) {
    if (op.b <= cursor + TOL) continue;
    if (op.a > cursor + TOL) out.push({ a: cursor, b: Math.min(op.a, to), kind: "door" });
    cursor = Math.max(cursor, op.b);
  }
  if (cursor < to - TOL) out.push({ a: cursor, b: to, kind: "door" });
  return out;
}

const isEnvelopeLine = (line: number, max: number) => line <= TOL || Math.abs(line - max) <= TOL;

/**
 * Ouvertures des cloisons intérieures du niveau. Une porte de façade
 * (`isEntry`, `isEmergency`, `isService`) n'est jamais reportée ici : elle est
 * percée dans l'enveloppe par le renderer.
 */
export function interiorOpenings3D(plan: FloorPlan): InteriorOpenings3D {
  const vertical = new Map<number, Opening3D[]>();
  const horizontal = new Map<number, Opening3D[]>();
  const doors: InteriorDoor3D[] = [];
  const seen = new Set<string>();

  const push = (map: Map<number, Opening3D[]>, line: number, opening: Opening3D) => {
    const list = map.get(line);
    if (list) list.push(opening);
    else map.set(line, [opening]);
  };

  const addDoor = (room: PlanRoom, door: DoorSpec) => {
    if (door.isEntry || door.isEmergency || door.isService) return;
    const verticalWall = door.wall === "W" || door.wall === "E";
    const line = verticalWall
      ? door.wall === "W"
        ? room.x
        : room.x + room.w
      : door.wall === "N"
        ? room.y
        : room.y + room.h;
    const max = verticalWall ? plan.length : plan.width;
    if (isEnvelopeLine(line, max)) return;
    const a = (verticalWall ? room.y : room.x) + door.position;
    // Une même porte peut être décrite par les deux pièces qu'elle relie :
    // la clé purement géométrique évite un double battant.
    const key = `${line.toFixed(2)}:${a.toFixed(2)}:${door.width.toFixed(2)}`;
    if (seen.has(key)) return;
    seen.add(key);
    push(verticalWall ? vertical : horizontal, line, {
      a,
      b: a + door.width,
      kind: "door",
    });
    doors.push({
      wall: door.wall,
      line,
      a,
      width: door.width,
      inward: door.wall === "W" || door.wall === "N" ? 1 : -1,
    });
  };

  for (const room of plan.rooms) {
    if (room.exterior) continue;
    for (const door of room.doors) addDoor(room, door);
    for (const win of room.windows) {
      const verticalWall = win.wall === "W" || win.wall === "E";
      const line = verticalWall
        ? win.wall === "W"
          ? room.x
          : room.x + room.w
        : win.wall === "N"
          ? room.y
          : room.y + room.h;
      const max = verticalWall ? plan.length : plan.width;
      if (isEnvelopeLine(line, max)) continue;
      const a = (verticalWall ? room.y : room.x) + win.position;
      push(verticalWall ? vertical : horizontal, line, {
        a,
        b: a + win.width,
        kind: "window",
      });
    }
  }

  for (const [line, list] of vertical) vertical.set(line, mergeOpenings3D(list));
  for (const [line, list] of horizontal) horizontal.set(line, mergeOpenings3D(list));
  return { vertical, horizontal, doors };
}

/** Rotation du battant autour de sa charnière (radians, 32° d'ouverture). */
export function doorLeafRotation(door: InteriorDoor3D): number {
  const angle = (32 * Math.PI) / 180;
  if (door.wall === "W" || door.wall === "E") return door.inward * angle;
  return -door.inward * angle;
}

export { near as near3D };
