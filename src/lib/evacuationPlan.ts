// ============================================================================
// ÉVACUATION — SORTIE DE SECOURS DES CAFÉS ET RESTAURANTS
// ----------------------------------------------------------------------------
// La sortie de secours d'un café ou d'un restaurant ne s'ouvre jamais
// directement dans la salle clientèle ni dans le comptoir/bar : elle est
// desservie par la CIRCULATION TECHNIQUE (couloir de service) ou par un local
// de service relié à cette circulation. Une cuisine ou une plonge ne peuvent la
// porter que si elles sont elles-mêmes desservies par cette circulation. Le cheminement
// salle → circulation → extérieur est continu (portes réelles des deux côtés
// des cloisons), dégagé (0,90 m de largeur libre) et sans passage par un WC.
//
// Le nombre et la largeur des dégagements suivent l'effectif prévu (couverts
// assis + personnel), d'après les seuils des établissements recevant du public
// repris en pratique en Tunisie pour les ERP (loi n° 2009-11 du 2 mars 2009 :
// 5e catégorie ≤ 50 personnes, 4e catégorie 51–300 ; valeurs de dégagements du
// règlement ERP de référence, à confirmer par la Protection civile pour chaque
// dossier) :
//
//   effectif      dégagements exigés
//   < 20          1 × 0,90 m
//   20 – 50       2 (0,90 m + 0,60 m) ou 1 × 1,40 m direct sur l'extérieur
//   51 – 100      2 × 0,90 m (ou 1,40 + 0,60)
//   101 – 200     1,40 m + 0,90 m
//   201 – 300     2 × 1,40 m
//
// La distance de cheminement reste sous 25 / 30 / 50 m selon l'effectif et le
// choix de sorties. Aucun rendu ici : les mêmes données alimentent le 2D et le
// 3D, donc une seule géométrie.
// ============================================================================

import type { FloorPlan, PlanRoom, RoomKind, WallSide } from "./floorPlanEngine";

/** Largeur libre minimale d'une circulation d'évacuation (m). */
export const EVACUATION_MIN_CORRIDOR_WIDTH = 0.9;
/** Largeur minimale d'une porte d'évacuation (m). */
export const EVACUATION_MIN_DOOR_WIDTH = 0.8;
/** Densité de salle retenue pour l'effectif : ~4,5 m² par table de 4 couverts. */
export const FOOD_TABLE_AREA = 4.5;
export const FOOD_COVERS_PER_TABLE = 4;
export const FOOD_MAX_TABLES = 24;
/** Surface de service par membre du personnel (m²). */
export const FOOD_STAFF_AREA = 8;
export const FOOD_STAFF_MIN = 2;
export const FOOD_STAFF_MAX = 12;

const TOL = 0.002;

/** Circulations utilisables pour rejoindre une sortie de secours. */
export const EVACUATION_CIRCULATION_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>([
  "couloir",
  "hall",
  "escalier",
]);

/** Zones de production : la sortie de secours ne s'y ouvre pas directement. */
export const EVACUATION_PREP_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>([
  "cuisine_pro",
  "plonge",
]);

/**
 * Locaux qui ne peuvent JAMAIS porter la sortie de secours : la salle
 * clientèle et le comptoir/bar restent distincts de la circulation technique.
 * La cuisine et la plonge ne la portent que si elles sont elles-mêmes desservies
 * par la circulation de service (voir `exitOnCirculation`).
 */
const EXCLUDED_EXIT_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>([
  "salle_cafe",
  "salle_client",
  "comptoir",
]);

/** Un WC ne fait pas partie d'un cheminement d'évacuation. */
const SANITARY_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>(["sanitaire", "wc"]);

// ── Effectif et dégagements exigés ──────────────────────────────────────────

export interface FoodServiceHeadcount {
  /** Couverts assis (tables de 4). */
  covers: number;
  /** Personnel de production / service. */
  staff: number;
  /** Effectif total à évacuer. */
  people: number;
}

/**
 * Effectif prévu d'un café ou restaurant : couverts assis (même densité que le
 * mobilier réellement dessiné : 4,5 m² par table de 4) + personnel
 * (1 personne par 8 m² de locaux de service).
 */
export function foodServiceHeadcount(
  salle: PlanRoom,
  rooms: readonly PlanRoom[],
): FoodServiceHeadcount {
  const tables = Math.max(
    1,
    Math.min(FOOD_MAX_TABLES, Math.floor(salle.area / FOOD_TABLE_AREA)),
  );
  const covered = rooms.filter((r) => !r.exterior).reduce((s, r) => s + r.area, 0);
  const serviceArea = Math.max(0, covered - salle.area);
  const staff = Math.max(
    FOOD_STAFF_MIN,
    Math.min(FOOD_STAFF_MAX, Math.ceil(serviceArea / FOOD_STAFF_AREA)),
  );
  const covers = tables * FOOD_COVERS_PER_TABLE;
  return { covers, staff, people: covers + staff };
}

export interface EgressRequirement {
  /** Nombre de dégagements exigés. */
  exits: number;
  /** Largeurs exigées, de la plus grande à la plus petite (m). */
  widths: number[];
  /** Distance maximale de cheminement (m). */
  maxTravel: number;
}

/** Nombre, largeurs et distance de cheminement exigés pour un effectif. */
export function requiredEgress(people: number): EgressRequirement {
  if (people < 20) return { exits: 1, widths: [0.9], maxTravel: 25 };
  if (people <= 50) return { exits: 2, widths: [0.9, 0.6], maxTravel: 25 };
  if (people <= 100) return { exits: 2, widths: [0.9, 0.9], maxTravel: 30 };
  if (people <= 200) return { exits: 2, widths: [1.4, 0.9], maxTravel: 50 };
  return { exits: 2, widths: [1.4, 1.4], maxTravel: 50 };
}

// ── Géométrie : murs, portes, parcours ──────────────────────────────────────

/** Le mur `wall` de `room` est-il une façade du niveau ? */
export function evacuationFacadeWall(
  room: PlanRoom,
  wall: WallSide,
  plan: Pick<FloorPlan, "length" | "width">,
): boolean {
  if (wall === "N") return Math.abs(room.y) < TOL;
  if (wall === "S") return Math.abs(room.y + room.h - plan.width) < TOL;
  if (wall === "W") return Math.abs(room.x) < TOL;
  return Math.abs(room.x + room.w - plan.length) < TOL;
}

interface Boundary {
  len: number;
  wallA: WallSide;
  wallB: WallSide;
  startA: number;
  startB: number;
}

function boundary(a: PlanRoom, b: PlanRoom): Boundary | null {
  const touchesEW =
    Math.abs(a.x + a.w - b.x) < TOL || Math.abs(b.x + b.w - a.x) < TOL;
  if (touchesEW) {
    const start = Math.max(a.y, b.y);
    const end = Math.min(a.y + a.h, b.y + b.h);
    const len = end - start;
    if (len >= 0.9) {
      const aIsLeft = Math.abs(b.x + b.w - a.x) < TOL;
      return {
        len,
        wallA: aIsLeft ? "W" : "E",
        wallB: aIsLeft ? "E" : "W",
        startA: start - a.y,
        startB: start - b.y,
      };
    }
  }
  const touchesNS =
    Math.abs(a.y + a.h - b.y) < TOL || Math.abs(b.y + b.h - a.y) < TOL;
  if (touchesNS) {
    const start = Math.max(a.x, b.x);
    const end = Math.min(a.x + a.w, b.x + b.w);
    const len = end - start;
    if (len >= 0.9) {
      const aIsTop = Math.abs(b.y + b.h - a.y) < TOL;
      return {
        len,
        wallA: aIsTop ? "N" : "S",
        wallB: aIsTop ? "S" : "N",
        startA: start - a.x,
        startB: start - b.x,
      };
    }
  }
  return null;
}

function doorOn(room: PlanRoom, wall: WallSide, from: number, to: number): boolean {
  return room.doors.some(
    (d) =>
      d.wall === wall &&
      d.width > 0.5 &&
      d.position < to + 0.05 &&
      d.position + d.width > from - 0.05,
  );
}

/** Deux locaux communiquent-ils réellement (porte des deux côtés du mur) ? */
export function evacuationLinked(a: PlanRoom, b: PlanRoom): boolean {
  const shared = boundary(a, b);
  if (!shared) return false;
  return (
    doorOn(a, shared.wallA, shared.startA, shared.startA + shared.len) &&
    doorOn(b, shared.wallB, shared.startB, shared.startB + shared.len)
  );
}

/** Porte extérieure repérée sur une façade. */
export interface FacadeExit {
  room: PlanRoom;
  wall: WallSide;
  position: number;
  width: number;
}

/** Toutes les portes de façade d'un niveau (entrée, secours, service). */
export function facadeDoors(rooms: readonly PlanRoom[], plan: FloorPlan): FacadeExit[] {
  const out: FacadeExit[] = [];
  for (const room of rooms) {
    if (room.exterior) continue;
    for (const door of room.doors) {
      if (door.width <= 0.01) continue;
      if (!evacuationFacadeWall(room, door.wall, plan)) continue;
      out.push({ room, wall: door.wall, position: door.position, width: door.width });
    }
  }
  return out;
}

// ── Contrôle d'évacuation ───────────────────────────────────────────────────

export interface FoodServiceEvacuation {
  /** Effectif retenu et détail couverts / personnel. */
  people: number;
  covers: number;
  staff: number;
  /** Dégagements exigés par l'effectif. */
  requiredExits: number;
  requiredWidths: number[];
  /** Largeurs réellement disponibles (entrée + sortie de secours). */
  providedWidths: number[];
  /** La sortie de secours existe et s'ouvre sur l'extérieur. */
  exitExists: boolean;
  /** La sortie est desservie par la circulation technique / couloir de service. */
  exitOnCirculation: boolean;
  /** Cheminement continu jusqu'à l'extérieur (aucun local clos, aucun WC). */
  pathContinuous: boolean;
  /** Largeur libre du cheminement ≥ 0,90 m et porte ≥ 0,80 m. */
  clearWidthOk: boolean;
  /** Nombre et largeurs de dégagements conformes à l'effectif. */
  egressOk: boolean;
  /** Distance de cheminement admissible. */
  travelOk: boolean;
  /** Le cheminement salle → sortie évite la cuisine et les zones de préparation. */
  avoidsPrep: boolean;
  ok: boolean;
  issues: string[];
}

/**
 * Contrôle de la sortie de secours d'un café ou restaurant.
 *
 * La sortie de secours doit s'ouvrir sur une CIRCULATION (couloir/hall) ou sur
 * un local de service relié à cette circulation par une porte réelle. Le
 * parcours est calculé de la salle jusqu'à la sortie en empruntant les portes
 * percées des deux côtés des cloisons ; un WC n'est jamais un passage. On
 * vérifie ensuite la continuité, la largeur libre, le nombre et la largeur des
 * dégagements pour l'effectif, et la distance de cheminement.
 */
export function foodServiceEvacuation(
  salle: PlanRoom,
  rooms: readonly PlanRoom[],
  plan: FloorPlan,
): FoodServiceEvacuation {
  const headcount = foodServiceHeadcount(salle, rooms);
  const requirement = requiredEgress(headcount.people);
  const active = rooms.filter((r) => !r.exterior);

  const exits: FacadeExit[] = [];
  for (const room of active) {
    for (const door of room.doors) {
      if (!door.isEmergency || door.width <= 0.01) continue;
      if (!evacuationFacadeWall(room, door.wall, plan)) continue;
      exits.push({ room, wall: door.wall, position: door.position, width: door.width });
    }
  }
  const entryDoor = salle.doors.find(
    (d) => d.isEntry && evacuationFacadeWall(salle, d.wall, plan),
  );
  const entry: FacadeExit | null = entryDoor
    ? { room: salle, wall: entryDoor.wall, position: entryDoor.position, width: entryDoor.width }
    : null;

  const exit = exits[0] ?? null;
  const providedWidths = [entry?.width ?? 0, exit?.width ?? 0]
    .filter((w) => w > 0)
    .sort((a, b) => b - a);

  const issues: string[] = [];

  // 1. La sortie existe-t-elle, et sur quel local s'ouvre-t-elle ?
  const exitRoom = exit?.room ?? null;
  const exitExists = !!exit;
  const circuitRooms = active.filter(
    (r) =>
      EVACUATION_CIRCULATION_KINDS.has(r.kind) &&
      (r === exitRoom || (exitRoom ? evacuationLinked(exitRoom, r) : false)),
  );
  const circulation = circuitRooms[0] ?? null;
  // La sortie s'ouvre sur la circulation, ou sur un local (service, cuisine)
  // RÉELLEMENT relié à cette circulation par une porte. Jamais la salle ni le
  // comptoir : la clientèle garde son issue principale, l'évacuation passe par
  // le couloir technique.
  const exitOnCirculation =
    !!exitRoom &&
    !EXCLUDED_EXIT_KINDS.has(exitRoom.kind) &&
    (EVACUATION_CIRCULATION_KINDS.has(exitRoom.kind) || !!circulation);

  // 2. Cheminement continu : la sortie doit desservir le bloc de production par
  //    des portes réelles, sans passer par la salle ni par un WC. Le cheminement
  //    public (depuis la salle) est mesuré en évitant les zones de préparation.
  const bfs = (
    start: PlanRoom,
    blocked: (room: PlanRoom) => boolean,
  ): Set<PlanRoom> => {
    const reached = new Set<PlanRoom>([start]);
    const queue: PlanRoom[] = [start];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const other of active) {
        if (reached.has(other) || other === current) continue;
        if (blocked(other)) continue;
        if (!evacuationLinked(current, other)) continue;
        reached.add(other);
        queue.push(other);
      }
    }
    return reached;
  };
  const noSalleNoSanitary = (room: PlanRoom) =>
    SANITARY_KINDS.has(room.kind) || room === salle;
  const anchor =
    active.find((r) => r.kind === "cuisine_pro") ??
    active.find((r) => r.kind === "plonge") ??
    null;
  const servicePath = exitRoom ? bfs(exitRoom, noSalleNoSanitary) : new Set<PlanRoom>();
  const pathContinuous = !!exitRoom && !!anchor && servicePath.has(anchor);
  // Cheminement du personnel (vestiaire, à défaut réserve) jusqu'à la sortie
  // en évitant cuisine et plonge : renseigné, non bloquant (« autant que
  // possible »). Pour la clientèle, l'issue principale reste l'entrée.
  const staffStart =
    active.find((r) => r.kind === "vestiaire") ??
    active.find((r) => r.kind === "stockage") ??
    salle;
  const staffPath = bfs(
    staffStart,
    (room) => SANITARY_KINDS.has(room.kind) || EVACUATION_PREP_KINDS.has(room.kind),
  );
  const avoidsPrep = !!exitRoom && staffPath.has(exitRoom);

  // 3. Largeur libre : la circulation et la porte de sortie.
  const narrow = (room: PlanRoom) =>
    Math.min(room.w, room.h) < EVACUATION_MIN_CORRIDOR_WIDTH - TOL;
  const exitDoorWidth = exit?.width ?? 0;
  const linkedCirculationDoor = (() => {
    if (!exitRoom || !circulation) return 0;
    const shared = boundary(exitRoom, circulation);
    if (!shared) return 0;
    const side = exitRoom.doors.find(
      (d) =>
        d.wall === shared.wallA &&
        d.position < shared.startA + shared.len + 0.05 &&
        d.position + d.width > shared.startA - 0.05,
    );
    return side?.width ?? 0;
  })();
  const exitIsCirculation = !!exitRoom && EVACUATION_CIRCULATION_KINDS.has(exitRoom.kind);
  const clearWidthOk =
    exitDoorWidth >= EVACUATION_MIN_DOOR_WIDTH - TOL &&
    (exitIsCirculation
      ? !!exitRoom && !narrow(exitRoom)
      : !!circulation &&
        !narrow(circulation) &&
        linkedCirculationDoor >= EVACUATION_MIN_DOOR_WIDTH - TOL);

  // 4. Dégagements : nombre et largeurs exigés par l'effectif.
  const required = [...requirement.widths].sort((a, b) => b - a);
  const egressOk =
    providedWidths.length >= requirement.exits &&
    required.every((w, i) => (providedWidths[i] ?? 0) >= w - 0.02);

  // 5. Distance de cheminement depuis le point le plus éloigné de la salle
  //    jusqu'à l'entrée (issue principale du public).
  const entryPoint = entry
    ? {
        x:
          entry.wall === "W" || entry.wall === "E"
            ? entry.wall === "W"
              ? salle.x
              : salle.x + salle.w
            : salle.x + entry.position + entry.width / 2,
        y:
          entry.wall === "N" || entry.wall === "S"
            ? entry.wall === "N"
              ? salle.y
              : salle.y + salle.h
            : salle.y + entry.position + entry.width / 2,
      }
    : null;
  let travel = 0;
  if (entryPoint) {
    for (const corner of [
      { x: salle.x, y: salle.y },
      { x: salle.x + salle.w, y: salle.y },
      { x: salle.x, y: salle.y + salle.h },
      { x: salle.x + salle.w, y: salle.y + salle.h },
    ]) {
      travel = Math.max(travel, Math.hypot(corner.x - entryPoint.x, corner.y - entryPoint.y));
    }
  }
  const travelOk = !!entryPoint && travel <= requirement.maxTravel + 0.5;

  // 6. Diagnostic lisible.
  if (!exitExists) {
    issues.push("Aucune sortie de secours extérieure");
  } else if (exitRoom && EXCLUDED_EXIT_KINDS.has(exitRoom.kind)) {
    issues.push(
      "Sortie de secours directement dans la salle ou le comptoir : elle doit être desservie par une circulation de service",
    );
  } else if (!exitOnCirculation) {
    issues.push(
      exitRoom && EVACUATION_PREP_KINDS.has(exitRoom.kind)
        ? "Sortie de secours dans la cuisine / la plonge, sans accès par une circulation de service"
        : "Sortie de secours non desservie par une circulation technique ou un couloir de service",
    );
  }
  if (exitExists && !pathContinuous) {
    issues.push(
      "Cheminement d'évacuation interrompu : la sortie de secours n'est pas reliée au bloc de production par une circulation continue",
    );
  }
  if (exitExists && exitOnCirculation && !clearWidthOk) {
    issues.push("Cheminement d'évacuation trop étroit (largeur libre minimale 0,90 m)");
  }
  if (!egressOk) {
    issues.push(
      `Dégagements insuffisants pour ${headcount.people} personnes : ${required
        .map((w) => `${w.toFixed(2)} m`)
        .join(" + ")} exigés`,
    );
  }
  if (!travelOk) {
    issues.push(
      `Distance de cheminement supérieure à ${requirement.maxTravel} m depuis la salle`,
    );
  }

  return {
    people: headcount.people,
    covers: headcount.covers,
    staff: headcount.staff,
    requiredExits: requirement.exits,
    requiredWidths: requirement.widths,
    providedWidths,
    exitExists,
    exitOnCirculation,
    pathContinuous,
    clearWidthOk,
    egressOk,
    travelOk,
    avoidsPrep,
    ok:
      exitExists &&
      exitOnCirculation &&
      pathContinuous &&
      clearWidthOk &&
      egressOk &&
      travelOk,
    issues,
  };
}
