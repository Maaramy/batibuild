// ============================================================================
// RÈGLES DE PLAN — WC ET SANITAIRES DES CAFÉS ET RESTAURANTS
// ----------------------------------------------------------------------------
// Ce module porte les règles d'implantation des sanitaires, communes aux deux
// typologies de restauration (aucun autre type de projet ne l'utilise) :
//
//   • les sanitaires sont un BLOC CONTIGU adossé à la salle (café ou
//     restauration) : le client y accède directement depuis la salle, sans
//     traverser la cuisine professionnelle ni la réserve ;
//   • aucune porte de WC ne s'ouvre sur un local de production ou de stockage
//     alimentaire (cuisine professionnelle, plonge, chambre froide, réserve) ;
//   • le bloc reste à proximité de la cuisine lorsque la configuration le
//     permet (mitoyenneté de cloison), mais les circulations restent séparées :
//     la porte « client » et la porte « personnel » ne se confondent jamais ;
//   • les dimensions s'adaptent à la surface réellement disponible : bloc plus
//     ou moins profond, cabines plus ou moins larges, sans jamais modifier la
//     surface totale du projet ni les parts de salle et de cuisine ;
//   • le WC accessible (PMR) reçoit une giration de 1,50 m dès que le budget de
//     surface des sanitaires le permet (sinon il reste le plus spacieux
//     possible, conformément au principe « si possible »).
//
// Aucun rendu n'est fait ici : les mêmes données de plan alimentent le 2D, le
// 3D, le tableau des surfaces et le quantitatif, donc une seule géométrie.
// ============================================================================

import type { PlanRoom, RoomKind, WallSide } from "./floorPlanEngine";

/** Pièces sanitaires (clients / personnel). */
export const SANITARY_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>([
  "sanitaire",
  "wc",
]);

/** Salles « clients » des typologies de restauration. */
export const FOOD_SALLE_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>([
  "salle_cafe",
  "salle_client",
]);

/**
 * Locaux de production, de lavage et de stockage alimentaire : une porte de WC
 * ne doit jamais s'y ouvrir (hygiène, marche en avant).
 */
export const FOOD_PREP_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>([
  "cuisine_pro",
  "plonge",
  "chambre_froide",
  "stockage",
]);

/** Profondeur (m) d'une cabine sanitaire : mini / cible / maxi. */
export const SANITARY_DEPTH_MIN = 1.5;
export const SANITARY_DEPTH_MAX = 2.5;
/**
 * Largeur minimale d'une cabine : elle doit porter une porte (0,70 m) ET
 * rester un mur mitoyen lisible (≥ 0,90 m de mur partagé avec la salle).
 */
export const SANITARY_MIN_WIDTH = 0.95;
/** Largeur minimale d'un WC PMR (giration 1,50 m). */
export const SANITARY_PMR_WIDTH = 1.5;
/** Surface minimale d'un WC PMR : giration de 1,50 m (1,50 × 1,50 m). */
export const SANITARY_PMR_MIN_AREA = 2.25;
/** Largeur de la porte d'un sanitaire. */
export const SANITARY_DOOR_WIDTH = 0.8;

const TOL = 0.002;

export function isSalleKind(kind: RoomKind): boolean {
  return FOOD_SALLE_KINDS.has(kind);
}

export function isSanitaryKind(kind: RoomKind): boolean {
  return SANITARY_KINDS.has(kind);
}

export function isFoodPrepKind(kind: RoomKind): boolean {
  return FOOD_PREP_KINDS.has(kind);
}

/** Mur mitoyen entre deux pièces (null si elles ne se touchent pas). */
export function sanitarySharedWall(a: PlanRoom, b: PlanRoom): WallSide | null {
  const touchesEW =
    Math.abs(a.x + a.w - b.x) < TOL || Math.abs(b.x + b.w - a.x) < TOL;
  if (touchesEW) {
    const overlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (overlap >= 0.9) return Math.abs(a.x + a.w - b.x) < TOL ? "E" : "W";
  }
  const touchesNS =
    Math.abs(a.y + a.h - b.y) < TOL || Math.abs(b.y + b.h - a.y) < TOL;
  if (touchesNS) {
    const overlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    if (overlap >= 0.9) return Math.abs(a.y + a.h - b.y) < TOL ? "S" : "N";
  }
  return null;
}

/** Une porte du local s'ouvre-t-elle sur le mur partagé avec `other` ? */
function doorOnSharedWall(room: PlanRoom, other: PlanRoom): boolean {
  const wall = sanitarySharedWall(room, other);
  if (!wall) return false;
  const horizontal = wall === "N" || wall === "S";
  const start = horizontal ? Math.max(room.x, other.x) : Math.max(room.y, other.y);
  const end = horizontal
    ? Math.min(room.x + room.w, other.x + other.w)
    : Math.min(room.y + room.h, other.y + other.h);
  const origin = horizontal ? room.x : room.y;
  return room.doors.some(
    (d) =>
      d.wall === wall &&
      origin + d.position < end - TOL &&
      origin + d.position + d.width > start + TOL,
  );
}

export interface SanitaryRoomCheck {
  label: string;
  area: number;
  /**
   * Mur DU SANITAIRE mitoyen de la salle (null = sanitaire non desservi par la
   * salle). C'est sur ce mur que la porte client doit être percée.
   */
  salleWall: WallSide | null;
  /** Le sanitaire ouvre directement sur la salle. */
  doorOnSalle: boolean;
  /** Le sanitaire ouvre sur la cuisine, la plonge, la réserve ou le froid. */
  opensOnFood: boolean;
  /** Dimensions compatibles avec une giration PMR (1,50 m). */
  accessible: boolean;
}

export interface SanitaryAccessReport {
  rooms: SanitaryRoomCheck[];
  /** Au moins un sanitaire accessible aux personnes à mobilité réduite. */
  pmrOk: boolean;
  /** Tous les sanitaires sont desservis par la salle, hors production. */
  ok: boolean;
  issues: string[];
}

/**
 * Contrôle d'implantation des sanitaires d'un niveau de café / restaurant.
 *
 * L'accès est valide lorsque CHAQUE sanitaire partage un mur avec la salle et
 * ouvre dessus, sans aucune porte vers un local de production ou de stockage
 * alimentaire. Le WC PMR est réputé accessible dès qu'un `wc` offre une
 * giration de 1,50 m (largeur franche) et 2,40 m² de surface utile.
 */
export function sanitaryAccessReport(
  salle: PlanRoom | null,
  rooms: readonly PlanRoom[],
): SanitaryAccessReport {
  const sanitary = rooms.filter((r) => !r.exterior && SANITARY_KINDS.has(r.kind));
  const prep = rooms.filter((r) => !r.exterior && FOOD_PREP_KINDS.has(r.kind));
  const checks: SanitaryRoomCheck[] = sanitary.map((room) => {
    const salleWall = salle ? sanitarySharedWall(room, salle) : null;
    const doorOnSalle = !!salle && doorOnSharedWall(room, salle);
    return {
      label: room.label,
      area: Math.round(room.area * 100) / 100,
      salleWall,
      doorOnSalle,
      opensOnFood: prep.some((p) => doorOnSharedWall(room, p)),
      accessible:
        room.kind === "wc" &&
        Math.max(room.w, room.h) >= SANITARY_PMR_WIDTH - TOL &&
        Math.min(room.w, room.h) >= SANITARY_DEPTH_MIN - TOL &&
        room.area >= SANITARY_PMR_MIN_AREA - TOL,
    };
  });

  const issues: string[] = [];
  const missingAccess = checks.filter((c) => !c.doorOnSalle);
  if (missingAccess.length > 0) {
    issues.push(
      `Sanitaires non desservis par la salle : ${missingAccess
        .map((c) => c.label)
        .join(", ")}`,
    );
  }
  const onFood = checks.filter((c) => c.opensOnFood);
  if (onFood.length > 0) {
    issues.push(
      `Porte de sanitaire ouverte sur la production : ${onFood
        .map((c) => c.label)
        .join(", ")}`,
    );
  }

  return {
    rooms: checks,
    pmrOk: checks.some((c) => c.accessible),
    ok: checks.length > 0 && issues.length === 0,
    issues,
  };
}
