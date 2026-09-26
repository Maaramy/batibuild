// ============================================================================
// GÉNÉRATEUR DE PLANS RÉELS — PORTAGE MOBILE POUR LE GUIDE DE DÉMARRAGE
// ----------------------------------------------------------------------------
// Ce fichier est un PORTAGE FIDÈLE, allégé et sans dépendance, du moteur de
// plans de la plateforme (`src/lib/floorPlanEngine.ts`) : mêmes types, même
// algorithme de partition binaire récursive (BSP), même programme résidentiel,
// mêmes règles de portes / fenêtres, mêmes arrondis au millimètre.
//
// Il est utilisé UNIQUEMENT par l'écran de première utilisation, pour afficher
// de VRAIS plans d'architecte (2D, cotés, 3D) — aucun plan dessiné à la main,
// aucune image générique. Les plans sont DÉTERMINISTES : le même projet produit
// toujours exactement le même plan.
//
// PÉRIMÈTRE : mobile uniquement. La plateforme Web, son moteur et son backend
// ne sont pas modifiés.
// ============================================================================

export type GuideRoomKind =
  | "sejour"
  | "cuisine"
  | "chambre"
  | "sdb"
  | "wc"
  | "couloir"
  | "escalier"
  | "garage"
  | "buanderie";

export type WallSide = "N" | "S" | "E" | "W";

export interface DoorSpec {
  wall: WallSide;
  /** Position le long du mur (m, depuis l'origine du mur). */
  position: number;
  /** Largeur du battant (m). */
  width: number;
  /** Porte d'entrée principale ? */
  isEntry?: boolean;
}

export interface WindowSpec {
  wall: WallSide;
  position: number;
  width: number;
}

export interface GuideRoom {
  id: string;
  kind: GuideRoomKind;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  area: number;
  doors: DoorSpec[];
  windows: WindowSpec[];
}

export interface GuidePlan {
  level: number;
  length: number;
  width: number;
  rooms: GuideRoom[];
  area: number;
}

/** Teintes des pièces — EXACTEMENT celles du moteur de la plateforme. */
export const GUIDE_ROOM_COLORS: Record<GuideRoomKind, string> = {
  sejour: "#dbeafe",
  cuisine: "#fef3c7",
  chambre: "#e0e7ff",
  sdb: "#cffafe",
  wc: "#f1f5f9",
  couloir: "#f8fafc",
  escalier: "#ede9fe",
  garage: "#e5e7eb",
  buanderie: "#fef9c3",
};

export const GUIDE_ROOM_LABELS: Record<GuideRoomKind, string> = {
  sejour: "Séjour",
  cuisine: "Cuisine",
  chambre: "Chambre",
  sdb: "Salle de bain",
  wc: "WC",
  couloir: "Couloir",
  escalier: "Escalier",
  garage: "Garage",
  buanderie: "Buanderie",
};

// ── Utilitaires ─────────────────────────────────────────────────────────────

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ProgramItem {
  kind: GuideRoomKind;
  label: string;
  target: number;
  min: number;
  priority: number;
  habitable?: boolean;
}

interface Placed<T> {
  item: T;
  rect: Rect;
}

/**
 * Partitionne `rect` entre les éléments selon leurs surfaces cibles.
 * Coupures quantifiées au millimètre : deux pièces voisines partagent
 * EXACTEMENT la même coordonnée de mur (aucun chevauchement ni débordement).
 */
function bspLayout<T extends { target: number }>(rect: Rect, items: T[]): Placed<T>[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ item: items[0], rect: { ...rect } }];
  const total = items.reduce((s, i) => s + i.target, 0);
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
    const split = round3(Math.round(rect.w * f1 * 1000) / 1000);
    return [
      ...bspLayout({ x: rect.x, y: rect.y, w: split, h: rect.h }, g1),
      ...bspLayout(
        { x: round3(rect.x + split), y: rect.y, w: round3(rect.w - split), h: rect.h },
        g2,
      ),
    ];
  }
  const split = round3(Math.round(rect.h * f1 * 1000) / 1000);
  return [
    ...bspLayout({ x: rect.x, y: rect.y, w: rect.w, h: split }, g1),
    ...bspLayout(
      { x: rect.x, y: round3(rect.y + split), w: rect.w, h: round3(rect.h - split) },
      g2,
    ),
  ];
}

/** Mise à l'échelle du programme à la surface réellement disponible. */
function fitProgram(items: ProgramItem[], available: number): ProgramItem[] {
  let kept = [...items];
  for (let guard = 0; guard < 50; guard++) {
    const sumTargets = kept.reduce((s, i) => s + i.target, 0);
    const scale = available / sumTargets;
    const belowMin = kept.some((i) => i.target * scale < i.min);
    if (!belowMin) break;
    const candidates = kept.filter((i) => i.target * scale < i.min);
    const victim = candidates.reduce((w, i) => (i.priority < w.priority ? i : w));
    if (kept.length <= 2 || victim.priority >= 18) break;
    kept = kept.filter((i) => i !== victim);
  }
  const sumTargets = kept.reduce((s, i) => s + i.target, 0);
  const scale = available / sumTargets;
  return kept.map((i) => ({ ...i, target: Math.max(i.min, i.target * scale) }));
}

const TOL = 0.002;

function makeRoom(
  id: string,
  kind: GuideRoomKind,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
): GuideRoom {
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

/** Frontière partagée par deux pièces (mur mitoyen réel). */
interface Boundary {
  a: number;
  b: number;
  /** Mur concerné côté pièce `a` / côté pièce `b` (position relative au mur). */
  wallA: WallSide;
  posA: number;
  wallB: WallSide;
  posB: number;
  /** Longueur réellement mitoyenne (m). */
  len: number;
}

/** Recense tous les murs mitoyens entre pièces (chevauchement ≥ 0,9 m). */
function sharedBoundaries(rooms: GuideRoom[]): Boundary[] {
  const out: Boundary[] = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const A = rooms[i];
      const B = rooms[j];
      // Mur vertical : bord droit de A contre bord gauche de B (ou l'inverse)
      const aToB = Math.abs(A.x + A.w - B.x) < TOL;
      const bToA = Math.abs(B.x + B.w - A.x) < TOL;
      if (aToB || bToA) {
        const start = Math.max(A.y, B.y);
        const end = Math.min(A.y + A.h, B.y + B.h);
        const len = end - start;
        if (len >= 0.9) {
          const mid = (start + end) / 2;
          out.push({
            a: i,
            b: j,
            wallA: aToB ? "E" : "W",
            posA: mid - A.y,
            wallB: aToB ? "W" : "E",
            posB: mid - B.y,
            len,
          });
        }
      }
      // Mur horizontal : bord bas de A contre bord haut de B (ou l'inverse)
      const aUnderB = Math.abs(A.y + A.h - B.y) < TOL;
      const bUnderA = Math.abs(B.y + B.h - A.y) < TOL;
      if (aUnderB || bUnderA) {
        const start = Math.max(A.x, B.x);
        const end = Math.min(A.x + A.w, B.x + B.w);
        const len = end - start;
        if (len >= 0.9) {
          const mid = (start + end) / 2;
          out.push({
            a: i,
            b: j,
            wallA: aUnderB ? "S" : "N",
            posA: mid - A.x,
            wallB: aUnderB ? "N" : "S",
            posB: mid - B.x,
            len,
          });
        }
      }
    }
  }
  return out;
}

/** Ce mur de la pièce appartient-il à l'enveloppe extérieure du bâtiment ? */
function isExterior(room: GuideRoom, side: WallSide, level: GuidePlan): boolean {
  if (side === "N") return Math.abs(room.y) < TOL;
  if (side === "S") return Math.abs(room.y + room.h - level.width) < TOL;
  if (side === "W") return Math.abs(room.x) < TOL;
  return Math.abs(room.x + room.w - level.length) < TOL;
}

/**
 * Portes et fenêtres — mêmes règles de fond que la plateforme (géométrie
 * identique, portes sur les murs mitoyens, fenêtres sur les murs extérieurs des
 * pièces habitables), avec deux garanties de lisibilité pour l'aperçu :
 *  · la circulation forme un ARBRE COUVRANT : chaque pièce est accessible
 *    depuis le couloir (ou depuis la plus grande pièce), les portes étant
 *    posées sur des murs réellement mitoyens — aucune pièce isolée ;
 *  · la porte d'entrée est placée sur un mur EXTÉRIEUR de la pièce d'accueil.
 */
function addOpenings(level: GuidePlan, isGroundFloor: boolean): void {
  const rooms = level.rooms;
  const corridor = rooms.find((r) => r.kind === "couloir");

  // ── 1. Circulation : arbre couvrant (BFS) depuis le couloir — ou depuis la
  //      plus grande pièce s'il n'y a pas de couloir. Chaque pièce atteinte
  //      reçoit UNE porte sur un mur réellement mitoyen : toutes les pièces
  //      sont desservies, aucune ne reste isolée. ─────────────────────────────
  const boundaries = sharedBoundaries(rooms);
  const rootIdx = corridor
    ? rooms.indexOf(corridor)
    : rooms.reduce((best, r, i) => (r.area > rooms[best].area ? i : best), 0);
  const visited = new Set<number>([rootIdx]);
  const queue: number[] = [rootIdx];

  while (queue.length > 0) {
    const current = queue.shift() as number;
    const links = boundaries
      .filter((b) => b.a === current || b.b === current)
      .sort((x, y) => y.len - x.len);
    for (const link of links) {
      const other = link.a === current ? link.b : link.a;
      if (visited.has(other)) continue;
      visited.add(other);
      queue.push(other);

      // La porte est posée sur le mur de la pièce tout juste atteinte : un seul
      // percement par mur mitoyen ouvre les deux pièces (le trou est tracé sur
      // la cloison commune).
      const child = rooms[other];
      const wall: WallSide = link.a === current ? link.wallB : link.wallA;
      const pos = link.a === current ? link.posB : link.posA;
      const wallLen = wall === "N" || wall === "S" ? child.w : child.h;
      child.doors.push({
        wall,
        position: Math.max(0.55, Math.min(wallLen - 0.55, pos)),
        width: 0.9,
      });
    }
  }

  // ── 2. Porte d'entrée (RDC) : sur le plus grand mur EXTÉRIEUR de la pièce
  //      d'accueil (séjour, sinon couloir, sinon la plus grande pièce). ─────
  if (isGroundFloor) {
    const prio: GuideRoomKind[] = ["sejour", "couloir", "escalier"];
    let entry: GuideRoom | undefined;
    for (const k of prio) {
      entry = rooms.find((r) => r.kind === k);
      if (entry) break;
    }
    if (!entry) entry = [...rooms].sort((a, b) => b.area - a.area)[0];
    if (entry) {
      const target = entry;
      const facades: { side: WallSide; span: number }[] = (
        [
          { side: "S" as WallSide, span: target.w },
          { side: "N" as WallSide, span: target.w },
          { side: "W" as WallSide, span: target.h },
          { side: "E" as WallSide, span: target.h },
        ]
      )
        .filter((s) => isExterior(target, s.side, level))
        .sort((a, b) => b.span - a.span);
      const facade = facades[0];
      if (facade) {
        target.doors.push({
          wall: facade.side,
          position: Math.max(0.8, Math.min(facade.span - 0.8, facade.span / 2)),
          width: 1.1,
          isEntry: true,
        });
      }
    }
  }

  // Fenêtres des pièces habitables.
  for (const room of rooms) {
    const habitable =
      room.kind === "chambre" ||
      room.kind === "sejour" ||
      room.kind === "cuisine" ||
      room.kind === "buanderie";
    if (!habitable) continue;
    const sides: { side: WallSide; exterior: boolean; span: number }[] = [
      { side: "N", exterior: Math.abs(room.y) < TOL, span: room.w },
      { side: "S", exterior: Math.abs(room.y + room.h - level.width) < TOL, span: room.w },
      { side: "W", exterior: Math.abs(room.x) < TOL, span: room.h },
      { side: "E", exterior: Math.abs(room.x + room.w - level.length) < TOL, span: room.h },
    ];
    let added = 0;
    for (const s of sides) {
      if (!s.exterior || added >= 2 || s.span < 1.6) continue;
      const winW = Math.min(1.4, s.span - 0.4);
      // Position RELATIVE à l'origine du mur de la pièce (`r.x + position` pour
      // un mur nord/sud, `r.y + position` pour un mur est/ouest) — convention
      // exacte du rendu 2D. La valeur est centrée sur le mur puis ramenée dans
      // la longueur disponible : la fenêtre tombe toujours sur le bon mur.
      room.windows.push({
        wall: s.side,
        position: Math.max(0.3, Math.min(s.span - winW - 0.3, s.span / 2 - winW / 2)),
        width: winW,
      });
      added++;
    }
  }
}

/** Programme résidentiel R+0 (référence du guide : maison 150 m², 3 chambres). */
function residentialProgram(area: number): ProgramItem[] {
  return [
    {
      kind: "sejour",
      label: "Séjour",
      target: Math.max(24, area * 0.26),
      min: 16,
      priority: 20,
      habitable: true,
    },
    { kind: "cuisine", label: "Cuisine", target: 14, min: 7, priority: 15, habitable: true },
    { kind: "couloir", label: "Couloir", target: 10, min: 5, priority: 12 },
    { kind: "chambre", label: "Chambre principale", target: 16, min: 8.5, priority: 10 },
    { kind: "chambre", label: "Chambre 2", target: 13, min: 8.5, priority: 9 },
    { kind: "chambre", label: "Chambre 3", target: 13, min: 8.5, priority: 8 },
    { kind: "sdb", label: "Salle de bain", target: 7.5, min: 5, priority: 7 },
  ];
}

/**
 * Construit un niveau complet (partition BSP + portes/fenêtres + garde-fous).
 * Identique au moteur de la plateforme pour un projet mono-niveau.
 */
function buildLevel(levelIdx: number, length: number, width: number, items: ProgramItem[]): GuidePlan {
  const plan: GuidePlan = { level: levelIdx, length, width, rooms: [], area: length * width };
  let rid = 0;

  const placed = bspLayout({ x: 0, y: 0, w: length, h: width }, fitProgram(items, length * width));
  for (const p of placed) {
    plan.rooms.push(
      makeRoom(`R${rid++}`, p.item.kind, p.item.label, p.rect.x, p.rect.y, p.rect.w, p.rect.h),
    );
  }

  addOpenings(plan, levelIdx === 0);

  // Filet de sécurité géométrique (arrondis au mm).
  for (const r of plan.rooms) {
    r.x = round3(Math.max(0, r.x));
    r.y = round3(Math.max(0, r.y));
    if (r.x + r.w > length) r.w = round3(length - r.x);
    if (r.y + r.h > width) r.h = round3(width - r.y);
    r.area = round3(r.w * r.h);
  }
  return plan;
}

/** Projet de référence du guide : maison R+0 de 150 m² (emprise 15 × 10 m). */
export const GUIDE_PROJECT = {
  label: "Maison R+0",
  surface: 150,
  /** Ratio d'emprise (proche de la variante « Rationnelle » du moteur). */
  ratio: 1.5,
} as const;

let cached: GuidePlan | null = null;

/**
 * Plan RÉEL de référence, généré une seule fois (déterministe) puis mémoïsé.
 * Mêmes entrées → mêmes pièces, mêmes surfaces, mêmes ouvertures.
 */
export function getGuidePlan(): GuidePlan {
  if (cached) return cached;
  const length = round3(Math.sqrt(GUIDE_PROJECT.surface * GUIDE_PROJECT.ratio));
  const width = round3(Math.sqrt(GUIDE_PROJECT.surface / GUIDE_PROJECT.ratio));
  cached = buildLevel(0, length, width, residentialProgram(length * width));
  return cached;
}
