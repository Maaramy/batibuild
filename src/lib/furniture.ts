// ============================================================================
// AMÉNAGEMENT INTÉRIEUR — mobilier par nature de pièce (plans 2D & 3D)
// ----------------------------------------------------------------------------
// Génère, pour chaque pièce d'un plan, des primitives géométriques (rectangles,
// cercles, lignes) représentant le mobilier : lits + chevets + armoire, canapé +
// table basse + meuble TV + coin repas, cuisine équipée (plan de travail,
// évier, plaque, frigo, table), sanitaires (baignoire/douche, lavabo, WC),
// hall d'entrée (meuble, patères, tapis), buanderie (lave-linge,
// sèche-linge, bac), bureau, voitures, postes open-space, table de réunion,
// rayonnages…
// Les placements respectent les dégagements de portes (arc de gissement) et
// évitent les fenêtres pour les meubles hauts. Déterministe, sans dépendance.
// ============================================================================

import type { FloorPlan, PlanRoom, WallSide } from "./floorPlanEngine";
import {
  cafeCounterPlacement,
  cafeDoorClearances,
  cafeRectsOverlap,
  type CafeRect,
} from "./cafePlan";
import { restaurantCounterPlacement } from "./restaurantPlan";


// ── Primitives ───────────────────────────────────────────────────────────────

export type MatTag = "wood" | "fabric" | "white" | "metal";

export interface RectPrim {
  t: "r";
  x: number;
  y: number;
  w: number;
  h: number;
  /** Rayon des coins (m) */
  rx?: number;
  /** Hauteur d'extrusion 3D (m) */
  ht?: number;
  m?: MatTag;
  /** Contour pointillé (tapis…) */
  dash?: boolean;
  /** Pas de remplissage */
  noFill?: boolean;
  /** Ne pas extruder en 3D */
  flat?: boolean;
}

export interface CirclePrim {
  t: "c";
  x: number;
  y: number;
  r: number;
  ht?: number;
  m?: MatTag;
  flat?: boolean;
  /** Contour seul (symboles : vidange, brûleurs…) */
  noFill?: boolean;
}

export interface LinePrim {
  t: "l";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type Prim = RectPrim | CirclePrim | LinePrim;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Iv {
  a: number;
  b: number;
}

const R = (b: Box, o: Omit<RectPrim, "t" | "x" | "y" | "w" | "h"> = {}): Prim => ({
  t: "r",
  ...b,
  ...o,
});
const C = (
  x: number,
  y: number,
  r: number,
  o: Partial<CirclePrim> = {},
): Prim => ({ t: "c", x, y, r, ...o });
const L = (x1: number, y1: number, x2: number, y2: number): Prim => ({
  t: "l",
  x1,
  y1,
  x2,
  y2,
});

// ── Helpers géométriques ─────────────────────────────────────────────────────

function wallLen(room: PlanRoom, wall: WallSide): number {
  return wall === "N" || wall === "S" ? room.w : room.h;
}

function mergeIvs(list: Iv[]): Iv[] {
  if (!list.length) return [];
  const s = [...list].sort((p, q) => p.a - q.a);
  const out: Iv[] = [{ ...s[0] }];
  for (const iv of s.slice(1)) {
    const last = out[out.length - 1];
    if (iv.a <= last.b) last.b = Math.max(last.b, iv.b);
    else out.push({ ...iv });
  }
  return out;
}

/** Intervalles occupés sur un mur : portes (+ arc de gissement) et fenêtres. */
function wallBlocks(
  room: PlanRoom,
  wall: WallSide,
  opts: { swing?: boolean; win?: boolean },
): Iv[] {
  const out: Iv[] = [];
  for (const d of room.doors) {
    if (d.wall !== wall) continue;
    const extra = opts.swing === false ? 0.08 : d.width * 1.05;
    out.push({ a: d.position - 0.12, b: d.position + d.width + extra });
  }
  if (opts.win) {
    for (const w of room.windows) {
      if (w.wall !== wall) continue;
      out.push({ a: w.position - 0.08, b: w.position + w.width + 0.08 });
    }
  }
  return out;
}

/** Plus grand espace libre sur un mur, ou null si < need. */
function bestSpan(
  room: PlanRoom,
  wall: WallSide,
  need: number,
  opts: { win?: boolean } = {},
): Iv | null {
  const spans = mergeIvs(wallBlocks(room, wall, opts)).length
    ? freeSpans(wallLen(room, wall), wallBlocks(room, wall, opts))
    : [{ a: 0, b: wallLen(room, wall) }];
  const ok = spans.filter((s) => s.b - s.a >= need);
  if (!ok.length) return null;
  return ok.reduce((p, q) => (q.b - q.a > p.b - p.a ? q : p));
}

function freeSpans(len: number, blocks: Iv[]): Iv[] {
  const merged = mergeIvs(blocks.filter((b) => b.a < len && b.b > 0));
  const spans: Iv[] = [];
  let cur = 0;
  for (const b of merged) {
    if (b.a > cur) spans.push({ a: cur, b: Math.min(b.a, len) });
    cur = Math.max(cur, b.b);
  }
  if (cur < len) spans.push({ a: cur, b: len });
  return spans.filter((s) => s.b - s.a > 0.05);
}

/** Boîte adossée au mur `wall`, centrée à `mid` le long du mur, à `dist` du nu. */
function againstWall(
  room: PlanRoom,
  wall: WallSide,
  mid: number,
  dist: number,
  thick: number,
  long_: number,
): Box {
  const horiz = wall === "N" || wall === "S";
  const x = horiz
    ? room.x + mid - long_ / 2
    : wall === "W"
      ? room.x + dist
      : room.x + room.w - dist - thick;
  const y = horiz
    ? wall === "N"
      ? room.y + dist
      : room.y + room.h - dist - thick
    : room.y + mid - long_ / 2;
  return { x, y, w: horiz ? long_ : thick, h: horiz ? thick : long_ };
}

function inside(room: PlanRoom, b: Box): boolean {
  return (
    b.x >= room.x - 0.01 &&
    b.y >= room.y - 0.01 &&
    b.x + b.w <= room.x + room.w + 0.01 &&
    b.y + b.h <= room.y + room.h + 0.01
  );
}

function pushIf(room: PlanRoom, out: Prim[], box: Box, o: Omit<RectPrim, "t" | "x" | "y" | "w" | "h"> = {}) {
  if (box.w < 0.15 || box.h < 0.15 || !inside(room, box)) return null;
  out.push(R(box, o));
  return box;
}

function wallsByLength(room: PlanRoom): WallSide[] {
  return (["N", "S", "W", "E"] as WallSide[]).sort(
    (a, b) => wallLen(room, b) - wallLen(room, a),
  );
}

/** Centre d'une boîte de longueur `len` collée au bout du span le plus proche d'un coin. */
function spanEndMid(span: Iv, len: number, wallTotal: number): number {
  return span.a < wallTotal - span.b ? span.a + len / 2 : span.b - len / 2;
}

/** Un meuble déjà posé occupe-t-il la boîte ? (tapis et lignes ignorés) */
function overlapsPlaced(out: Prim[], b: Box, gap = 0.12): boolean {
  return out.some((p) => {
    if (p.t === "l") return false;
    if (p.t === "r" && p.dash && p.noFill) return false;
    const box: Box =
      p.t === "r"
        ? { x: p.x, y: p.y, w: p.w, h: p.h }
        : { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 };
    return (
      b.x + b.w + gap > box.x &&
      box.x + box.w + gap > b.x &&
      b.y + b.h + gap > box.y &&
      box.y + box.h + gap > b.y
    );
  });
}

/** Table + chaises, au premier emplacement libre qui les accueille entièrement. */
function placeDiningTable(room: PlanRoom, out: Prim[], tw: number, th: number): boolean {
  if (tw < 1.0 || th < 0.7) return false;
  for (const fy of [0.5, 0.34, 0.66]) {
    for (const fx of [0.5, 0.3, 0.7]) {
      const cx = room.x + room.w * fx;
      const cy = room.y + room.h * fy;
      const table: Box = { x: cx - tw / 2, y: cy - th / 2, w: tw, h: th };
      // Dégagement des chaises sur les deux longs côtés.
      const withChairs: Box = { x: table.x, y: table.y - 0.52, w: tw, h: th + 1.04 };
      if (!inside(room, withChairs) || overlapsPlaced(out, withChairs, 0.12)) continue;
      out.push(R(table, { m: "wood", ht: 0.74, rx: 0.06 }));
      const seats = Math.max(2, Math.min(3, Math.floor(tw / 0.62)));
      for (let i = 0; i < seats; i++) {
        const px = table.x + (tw * (i + 1)) / (seats + 1);
        out.push(C(px, table.y - 0.32, 0.2, { m: "fabric", ht: 0.45 }));
        out.push(C(px, table.y + th + 0.32, 0.2, { m: "fabric", ht: 0.45 }));
      }
      return true;
    }
  }
  return false;
}

// ── Chambre : lit + chevets + armoire + coin bureau ──────────────────────────

function genChambre(room: PlanRoom, out: Prim[]) {
  const dbl = Math.min(room.w, room.h) >= 2.9;
  const bedW = dbl ? 1.6 : 1.0;
  const bedL = dbl ? 2.0 : 1.9;

  let bedWall: WallSide | null = null;
  let bedBox: Box | null = null;
  for (const wall of wallsByLength(room)) {
    const span = bestSpan(room, wall, bedW + 0.9);
    if (!span) continue;
    const mid = (span.a + span.b) / 2;
    const bed = againstWall(room, wall, mid, 0.05, bedW, bedL);
    if (!pushIf(room, out, bed, { m: "fabric", ht: 0.5, rx: 0.06 })) continue;
    bedWall = wall;
    bedBox = bed;

    // Oreillers côté tête de lit
    const horiz = wall === "N" || wall === "S";
    const pillowThick = 0.32;
    const pillowDist = 0.05 + 0.06;
    if (dbl) {
      for (const side of [-1, 1]) {
        const pm = mid + side * (bedW / 4 + 0.01);
        pushIf(
          room,
          out,
          againstWall(room, wall, pm, pillowDist, pillowThick, bedW / 2 - 0.08),
          { m: "white", ht: 0.18, rx: 0.07 },
        );
      }
    } else {
      pushIf(
        room,
        out,
        againstWall(room, wall, mid, pillowDist, pillowThick, bedW - 0.16),
        { m: "white", ht: 0.18, rx: 0.07 },
      );
    }
    // Rabat de couverture (ligne)
    if (bedBox && horiz) {
      const yLine =
        wall === "N" ? bedBox.y + bedL * 0.34 : bedBox.y + bedBox.h - bedL * 0.34;
      out.push(L(bedBox.x + 0.04, yLine, bedBox.x + bedBox.w - 0.04, yLine));
    } else if (bedBox) {
      const xLine =
        wall === "W" ? bedBox.x + bedL * 0.34 : bedBox.x + bedBox.w - bedL * 0.34;
      out.push(L(xLine, bedBox.y + 0.04, xLine, bedBox.y + bedBox.h - 0.04));
    }

    // Chevets
    for (const side of [-1, 1]) {
      const nm = mid + side * (bedW / 2 + 0.26);
      pushIf(room, out, againstWall(room, wall, nm, 0.05, 0.38, 0.38), {
        m: "wood",
        ht: 0.5,
      });
    }
    break;
  }
  if (!bedWall) return;

  // Armoire (mur différent, sans fenêtre si possible)
  for (const wall of wallsByLength(room)) {
    if (wall === bedWall) continue;
    const span = bestSpan(room, wall, 1.1, { win: true });
    if (!span) continue;
    const len = Math.min(span.b - span.a - 0.12, 2.2);
    const wr = againstWall(room, wall, (span.a + span.b) / 2, 0.03, 0.62, len);
    if (!pushIf(room, out, wr, { m: "wood", ht: 2.1 })) continue;
    if (wall === "N" || wall === "S") {
      const yRail = wall === "N" ? wr.y + wr.h / 2 : wr.y + wr.h / 2;
      out.push(L(wr.x + 0.08, yRail, wr.x + wr.w - 0.08, yRail));
    } else {
      out.push(L(wr.x + wr.w / 2, wr.y + 0.08, wr.x + wr.w / 2, wr.y + wr.h - 0.08));
    }
    break;
  }

  // Coin bureau dans les grandes chambres
  if (room.area >= 13) {
    for (const wall of wallsByLength(room)) {
      if (wall === bedWall) continue;
      const span = bestSpan(room, wall, 1.45, { win: true });
      if (!span) continue;
      const desk = againstWall(room, wall, (span.a + span.b) / 2, 0.04, 0.55, 1.3);
      if (!pushIf(room, out, desk, { m: "wood", ht: 0.73 })) continue;
      // Chaise devant le bureau
      const horiz = wall === "N" || wall === "S";
      const cm = (span.a + span.b) / 2;
      const cx = horiz ? room.x + cm : wall === "W" ? desk.x + desk.w + 0.32 : desk.x - 0.32;
      const cy = horiz
        ? wall === "N"
          ? desk.y + desk.h + 0.32
          : desk.y - 0.32
        : room.y + cm;
      out.push(C(cx, cy, 0.21, { m: "fabric", ht: 0.45 }));
      break;
    }
  }
}

// ── Séjour : canapé + table basse + tapis + meuble TV ────────────────────────

function genSejour(room: PlanRoom, out: Prim[], plan?: FloorPlan) {
  // Le mur le plus long d'un séjour traversant peut être saturé de portes :
  // on essaie tous les murs avant de laisser la pièce sans mobilier.
  let wall: WallSide | null = null;
  let span: Iv | null = null;
  let sofaLen = 0;
  let sofa: Box | null = null;
  for (const candidate of wallsByLength(room)) {
    const free = bestSpan(room, candidate, 1.6);
    if (!free) continue;
    const avail = free.b - free.a - 0.2;
    const len = Math.min(Math.max(avail * 0.55, 1.6), 3.0);
    const placed = pushIf(
      room,
      out,
      againstWall(room, candidate, (free.a + free.b) / 2, 0.05, 0.88, len),
      { m: "fabric", ht: 0.75, rx: 0.09 },
    );
    if (!placed) continue;
    wall = candidate;
    span = free;
    sofaLen = len;
    sofa = placed;
    break;
  }
  if (!wall || !span || !sofa) return;
  const mid = (span.a + span.b) / 2;

  // Accoudoirs + dossier
  if (sofaLen >= 2) {
    const horiz = wall === "N" || wall === "S";
    for (const end of [-1, 1]) {
      const em = mid + end * (sofaLen / 2 - 0.11);
      pushIf(room, out, againstWall(room, wall, em, 0.05, 0.88, 0.2), {
        m: "fabric",
        ht: 0.55,
        rx: 0.06,
      });
    }
    if (horiz) {
      const yBack = wall === "N" ? sofa.y + 0.18 : sofa.y + sofa.h - 0.18;
      out.push(L(sofa.x + 0.22, yBack, sofa.x + sofa.w - 0.22, yBack));
    } else {
      const xBack = wall === "W" ? sofa.x + 0.18 : sofa.x + sofa.w - 0.18;
      out.push(L(xBack, sofa.y + 0.22, xBack, sofa.y + sofa.h - 0.22));
    }
  }

  // Tapis (pointillé)
  pushIf(
    room,
    out,
    againstWall(room, wall, mid, 1.0, Math.min(1.35, room.h / 3), sofaLen + 0.5),
    { dash: true, noFill: true, flat: true },
  );

  // Table basse face au canapé
  pushIf(
    room,
    out,
    againstWall(room, wall, mid, 0.05 + 0.88 + 0.38, 0.55, Math.min(sofaLen * 0.65, 1.15)),
    { m: "wood", ht: 0.4, rx: 0.04 },
  );

  // Meuble TV face au canapé, puis sur le premier autre mur libre : le mur
  // opposé peut être entièrement occupé par les portes.
  const opp: WallSide = wall === "N" ? "S" : wall === "S" ? "N" : wall === "W" ? "E" : "W";
  for (const candidate of [opp, ...wallsByLength(room).filter((w) => w !== opp && w !== wall)]) {
    const os =
      bestSpan(room, candidate, 1.2, { win: true }) ?? bestSpan(room, candidate, 1.2);
    if (!os) continue;
    const len = Math.min(os.b - os.a - 0.12, 1.8);
    if (!pushIf(room, out, againstWall(room, candidate, (os.a + os.b) / 2, 0.03, 0.38, len), { m: "wood", ht: 0.5 })) continue;
    break;
  }

  // Fauteuil dans les grands séjours
  if (room.area >= 20) {
    const horiz = wall === "N" || wall === "S";
    const ax = horiz ? room.x + span.a + sofaLen + 0.55 : wall === "W" ? room.x + 1.35 : room.x + room.w - 1.35;
    const ay = horiz ? (wall === "N" ? room.y + 1.75 : room.y + room.h - 1.75) : room.y + span.a + sofaLen + 0.55;
    out.push(C(ax, ay, 0.38, { m: "fabric", ht: 0.7 }));
  }

  // Coin repas dans un grand séjour qui n'a pas de salle à manger dédiée.
  const hasDiningRoom = plan?.rooms.some(
    (r) => r.id !== room.id && r.label.toLowerCase().includes("manger"),
  );
  if (room.area >= 22 && !hasDiningRoom) {
    placeDiningTable(room, out, Math.min(1.6, room.w * 0.4), 0.9);
  }
}

/** Plaque de cuisson 4 feux posée sur un plan de travail. */
function pushHob(room: PlanRoom, out: Prim[], wall: WallSide, mid: number, CD: number): boolean {
  const hob = againstWall(room, wall, mid, 0.02 + (CD - 0.52) / 2, 0.52, 0.52);
  if (!pushIf(room, out, hob, { m: "metal", ht: 0.92 })) return false;
  const hx = hob.x + hob.w / 2;
  const hy = hob.y + hob.h / 2;
  for (const dx of [-0.125, 0.125])
    for (const dy of [-0.125, 0.125])
      out.push(C(hx + dx, hy + dy, 0.082, { flat: true, noFill: true }));
  return true;
}

// ── Cuisine équipée : plan de travail en L, évier, plaque, frigo, table ──────

function genCuisine(room: PlanRoom, out: Prim[]) {
  const CD = 0.6; // profondeur plan de travail
  // Mur principal : le premier mur (du plus long au plus court) qui laisse
  // 1,40 m libres entre les portes.
  let P: WallSide | null = null;
  let spanP: Iv | null = null;
  for (const wall of wallsByLength(room)) {
    const span = bestSpan(room, wall, 1.4);
    if (!span) continue;
    P = wall;
    spanP = span;
    break;
  }
  if (!P || !spanP) return;

  const adjacents: WallSide[] = P === "N" || P === "S" ? ["W", "E"] : ["N", "S"];
  const doorsOn = (w: WallSide) => room.doors.filter((d) => d.wall === w).length;
  // Retours d'angle possibles, du plus dégagé au plus encombré.
  const runs = adjacents
    .map((wall) => ({ wall, span: bestSpan(room, wall, 0.8) }))
    .filter((r): r is { wall: WallSide; span: Iv } => r.span !== null)
    .sort(
      (a, b) =>
        b.span.b - b.span.a - (a.span.b - a.span.a) || doorsOn(a.wall) - doorsOn(b.wall),
    );
  const S_ = runs[0]?.wall ?? adjacents[0];

  // Quel bout du mur P touche le mur secondaire S_ ?
  const cornerNearStart =
    (P === "N" || P === "S") ? S_ === "W" : S_ === "N";
  const runPLen = spanP.b - spanP.a - 0.04;
  const counterP = againstWall(room, P, (spanP.a + spanP.b) / 2, 0.02, CD, runPLen);
  if (!pushIf(room, out, counterP, { m: "white", ht: 0.92 })) return;

  // Évier (double bac) sur le run principal
  const sinkMid = cornerNearStart ? spanP.b - runPLen * 0.3 : spanP.a + runPLen * 0.3;
  const sink = againstWall(room, P, sinkMid, 0.02 + (CD - 0.48) / 2, 0.48, 0.82);
  pushIf(room, out, sink, { m: "metal", ht: 0.92, rx: 0.05 });
  if (sink.w >= sink.h) {
    out.push(L(sink.x + sink.w / 2, sink.y + 0.05, sink.x + sink.w / 2, sink.y + sink.h - 0.05));
  } else {
    out.push(L(sink.x + 0.05, sink.y + sink.h / 2, sink.x + sink.w - 0.05, sink.y + sink.h / 2));
  }

  // Frigo au bout opposé au coin partagé
  const fridgeMid = cornerNearStart ? spanP.a + 0.38 : spanP.b - 0.38;
  const fridge = againstWall(room, P, fridgeMid, 0.02, 0.66, 0.72);
  pushIf(room, out, fridge, { m: "metal", ht: 1.85 });

  // Retour d'angle + plaque de cuisson : on essaie les deux murs adjacents,
  // le premier qui offre une longueur utile suffisante (frigo et portes pris
  // en compte) reçoit le plan de travail secondaire et les 4 feux.
  let hobPlaced = false;
  for (const { wall: runWall, span: spanS } of runs) {
    const totalS = wallLen(room, runWall);
    // Le point d'origine du mur adjacent touche-t-il le mur principal ?
    const atStart = cornerAlong(runWall, P);
    const lo = atStart ? CD + 0.08 : 0.08;
    const hi = atStart ? totalS - 0.08 : totalS - (CD + 0.08);
    const from = Math.max(lo, spanS.a + 0.04);
    const len = Math.min(1.7, Math.min(spanS.b, hi) - 0.04 - from);
    if (len < 0.8) continue;
    const midS = from + len / 2;
    const counterS = againstWall(room, runWall, midS, 0.02, CD, len);
    if (!pushIf(room, out, counterS, { m: "white", ht: 0.92 })) continue;
    hobPlaced = pushHob(room, out, runWall, midS, CD);
    break;
  }
  // Sans retour d'angle possible, les 4 feux prennent place sur le plan de
  // travail principal : une cuisine équipée ne peut pas en être dépourvue.
  if (!hobPlaced) pushHob(room, out, P, (spanP.a + spanP.b) / 2, CD);
  function cornerAlong(w: WallSide, ofWall: WallSide): boolean {
    // Le début du mur w (coordonnée 0) touche-t-il le mur ofWall ?
    if (w === "W") return ofWall === "N";
    if (w === "E") return ofWall === "N";
    return ofWall === "W"; // N / S
  }

  // Table + chaises si la cuisine est assez grande pour les accueillir.
  if (room.area >= 11) {
    placeDiningTable(room, out, Math.min(1.15, room.w - 1.4), 0.75);
  }
}

// ── Sanitaires : baignoire ou douche + lavabo + WC ───────────────────────────

function genSdb(room: PlanRoom, out: Prim[]) {
  const walls = wallsByLength(room);
  const used = new Set<WallSide>();
  const tubOk = Math.min(room.w, room.h) >= 1.55 && Math.max(room.w, room.h) >= 2.35;

  let placedTub = false;
  if (tubOk) {
    for (const wall of walls) {
      const span = bestSpan(room, wall, 1.75);
      if (!span) continue;
      const mid = spanEndMid(span, 1.72, wallLen(room, wall));
      const tub = againstWall(room, wall, mid, 0.03, 0.74, 1.68);
      if (!pushIf(room, out, tub, { m: "white", ht: 0.56, rx: 0.12 })) continue;
      // Cuve intérieure + vidange
      pushIf(
        room,
        out,
        {
          x: tub.x + 0.11,
          y: tub.y + 0.11,
          w: tub.w - 0.22,
          h: tub.h - 0.22,
        },
        { m: "white", ht: 0.5, rx: 0.14 },
      );
      out.push(C(tub.x + tub.w / 2, tub.y + tub.h / 2, 0.045, { flat: true, noFill: true }));
      used.add(wall);
      placedTub = true;
      break;
    }
  }
  if (!placedTub) {
    // Douche 90 × 90 en angle
    for (const wall of walls) {
      const span = bestSpan(room, wall, 0.95);
      if (!span) continue;
      const mid = spanEndMid(span, 0.9, wallLen(room, wall));
      const sh = againstWall(room, wall, mid, 0.03, 0.88, 0.88);
      if (!pushIf(room, out, sh, { m: "white", ht: 0.12, rx: 0.05 })) continue;
      out.push(L(sh.x, sh.y, sh.x + sh.w, sh.y + sh.h));
      out.push(L(sh.x + sh.w, sh.y, sh.x, sh.y + sh.h));
      out.push(C(sh.x + sh.w / 2, sh.y + sh.h / 2, 0.05, { flat: true, noFill: true }));
      used.add(wall);
      break;
    }
  }

  // Lavabo
  for (const wall of walls) {
    if (used.has(wall)) continue;
    const span = bestSpan(room, wall, 0.62, { win: true });
    if (!span) continue;
    const bas = againstWall(room, wall, (span.a + span.b) / 2, 0.03, 0.44, 0.58);
    if (!pushIf(room, out, bas, { m: "white", ht: 0.85, rx: 0.1 })) continue;
    out.push(C(bas.x + bas.w / 2, bas.y + bas.h / 2, 0.035, { flat: true, noFill: true }));
    used.add(wall);
    break;
  }

  // WC : réservoir + cuvette
  for (const wall of walls) {
    if (used.has(wall)) continue;
    const span = bestSpan(room, wall, 0.85);
    if (!span) continue;
    const mid = spanEndMid(span, 0.42, wallLen(room, wall));
    const tank = againstWall(room, wall, mid, 0.02, 0.2, 0.42);
    if (!pushIf(room, out, tank, { m: "white", ht: 0.75 })) continue;
    const horiz = wall === "N" || wall === "S";
    const bowl: Box = horiz
      ? {
          x: tank.x + tank.w / 2 - 0.19,
          y: wall === "N" ? tank.y + tank.h : tank.y - 0.5,
          w: 0.38,
          h: 0.5,
        }
      : {
          x: wall === "W" ? tank.x + tank.h : tank.x - 0.5,
          y: tank.y + tank.h / 2 - 0.19,
          w: 0.5,
          h: 0.38,
        };
    pushIf(room, out, bowl, { m: "white", ht: 0.4, rx: 0.17 });
    break;
  }
}

function genWc(room: PlanRoom, out: Prim[]) {
  genSdbLimited(room, out);
}
function genSdbLimited(room: PlanRoom, out: Prim[]) {
  // WC seul + mini-lave-mains
  const walls = wallsByLength(room);
  for (const wall of walls) {
    const span = bestSpan(room, wall, 0.85);
    if (!span) continue;
    const mid = spanEndMid(span, 0.42, wallLen(room, wall));
    const tank = againstWall(room, wall, mid, 0.02, 0.2, 0.42);
    if (!pushIf(room, out, tank, { m: "white", ht: 0.75 })) continue;
    const horiz = wall === "N" || wall === "S";
    const bowl: Box = horiz
      ? {
          x: tank.x + tank.w / 2 - 0.19,
          y: wall === "N" ? tank.y + tank.h : tank.y - 0.5,
          w: 0.38,
          h: 0.5,
        }
      : {
          x: wall === "W" ? tank.x + tank.h : tank.x - 0.5,
          y: tank.y + tank.h / 2 - 0.19,
          w: 0.5,
          h: 0.38,
        };
    pushIf(room, out, bowl, { m: "white", ht: 0.4, rx: 0.17 });
    break;
  }
  if (room.area >= 2) {
    for (const wall of walls) {
      const span = bestSpan(room, wall, 0.5);
      if (!span) continue;
      pushIf(
        room,
        out,
        againstWall(room, wall, (span.a + span.b) / 2, 0.03, 0.32, 0.42),
        { m: "white", ht: 0.8, rx: 0.08 },
      );
      break;
    }
  }
}

// ── Bureau : bureau + chaise + bibliothèque ──────────────────────────────────

function genBureau(room: PlanRoom, out: Prim[]) {
  const walls = wallsByLength(room);
  for (const wall of walls) {
    const span = bestSpan(room, wall, 1.5);
    if (!span) continue;
    const mid = (span.a + span.b) / 2;
    const desk = againstWall(room, wall, mid, 0.04, 0.62, 1.4);
    if (!pushIf(room, out, desk, { m: "wood", ht: 0.73 })) continue;
    const horiz = wall === "N" || wall === "S";
    const cx = horiz ? room.x + mid : wall === "W" ? desk.x + desk.w + 0.33 : desk.x - 0.33;
    const cy = horiz
      ? wall === "N"
        ? desk.y + desk.h + 0.33
        : desk.y - 0.33
      : room.y + mid;
    out.push(C(cx, cy, 0.22, { m: "fabric", ht: 0.46 }));
    // Écran posé sur le bureau
    pushIf(room, out, againstWall(room, wall, mid, 0.14, 0.06, 0.6), {
      m: "metal",
      ht: 0.42,
    });
    break;
  }
  for (const wall of walls) {
    const span = bestSpan(room, wall, 0.8, { win: true });
    if (!span) continue;
    pushIf(
      room,
      out,
      againstWall(room, wall, (span.a + span.b) / 2, 0.03, 0.3, Math.min(span.b - span.a - 0.12, 1.8)),
      { m: "wood", ht: 1.9 },
    );
    break;
  }
}

// ── Garage : véhicules ───────────────────────────────────────────────────────

function genGarage(room: PlanRoom, out: Prim[]) {
  const horiz = room.w >= room.h;
  const along = horiz ? room.w : room.h;
  const cross = horiz ? room.h : room.w;
  const nCars = cross >= 5.2 ? 2 : 1;
  const carL = Math.min(4.4, along - 0.7);
  const carW = Math.min(1.78, cross / nCars - 0.55);
  if (carL < 2.6 || carW < 1.2) return;
  for (let i = 0; i < nCars; i++) {
    // `cross` suit la profondeur du garage, `along` sa longueur : les deux
    // axes d'origine sont pris sur la bonne coordonnée de la pièce.
    const cCross =
      (horiz ? room.y : room.x) + (cross * (i + 1)) / (nCars + 1);
    const cAlong = (horiz ? room.x : room.y) + along / 2;
    const car: Box = horiz
      ? { x: cAlong - carL / 2, y: cCross - carW / 2, w: carL, h: carW }
      : { x: cCross - carW / 2, y: cAlong - carL / 2, w: carW, h: carL };
    out.push(R(car, { m: "metal", ht: 0.85, rx: 0.4 }));
    // Pare-brise / lunette
    if (horiz) {
      out.push(L(car.x + carL * 0.24, car.y + 0.08, car.x + carL * 0.24, car.y + car.h - 0.08));
      out.push(L(car.x + carL * 0.76, car.y + 0.08, car.x + carL * 0.76, car.y + car.h - 0.08));
    } else {
      out.push(L(car.x + 0.08, car.y + carL * 0.24, car.x + car.w - 0.08, car.y + carL * 0.24));
      out.push(L(car.x + 0.08, car.y + carL * 0.76, car.x + car.w - 0.08, car.y + carL * 0.76));
    }
  }
}

// ── Réception : comptoir + sièges d'attente ──────────────────────────────────

function genReception(room: PlanRoom, out: Prim[]) {
  const walls = wallsByLength(room);
  const wall = walls[0];
  const span = bestSpan(room, wall, 2.2);
  if (span) {
    const mid = spanEndMid(span, 2.2, wallLen(room, wall));
    const counter = againstWall(room, wall, mid, 0.03, 0.65, 2.2);
    pushIf(room, out, counter, { m: "wood", ht: 1.05 });
    // Retour perpendiculaire
    const horiz = wall === "N" || wall === "S";
    const ret: Box = horiz
      ? {
          x: mid > wallLen(room, wall) / 2 ? counter.x - 0.62 : counter.x + counter.w,
          y: wall === "N" ? counter.y : counter.y + counter.h - 0.62,
          w: 0.62,
          h: 0.62,
        }
      : {
          x: wall === "W" ? counter.x : counter.x + counter.w - 0.62,
          y: mid > wallLen(room, wall) / 2 ? counter.y - 0.62 : counter.y + counter.h,
          w: 0.62,
          h: 0.62,
        };
    pushIf(room, out, ret, { m: "wood", ht: 1.05 });
  }
  // Sièges d'attente face au comptoir
  for (let i = 0; i < 3; i++) {
    const sx = room.x + room.w / 2 + (i - 1) * 0.72;
    const sy = wall === "N" ? room.y + room.h - 0.75 : room.y + 0.75;
    const px = wall === "W" ? room.x + room.w - 0.75 : wall === "E" ? room.x + 0.75 : sx;
    const py = wall === "N" || wall === "S" ? sy : room.y + room.h / 2 + (i - 1) * 0.72;
    if (px > room.x + 0.3 && py > room.y + 0.3) {
      out.push(C(px, py, 0.25, { m: "fabric", ht: 0.45 }));
    }
  }
}

// ── Open space : postes de travail en rangées ────────────────────────────────

function genOpenspace(room: PlanRoom, out: Prim[]) {
  const cols = Math.max(1, Math.floor((room.w - 0.7) / 1.75));
  const rows = Math.max(1, Math.floor((room.h - 0.9) / 1.9));
  const n = Math.min(cols * rows, 10);
  const cw = room.w / cols;
  const rh = room.h / rows;
  let k = 0;
  for (let r = 0; r < rows && k < n; r++) {
    for (let c = 0; c < cols && k < n; c++) {
      const cx = room.x + cw * (c + 0.5);
      const cy = room.y + rh * (r + 0.5);
      const desk: Box = { x: cx - 0.68, y: cy - 0.5, w: 1.36, h: 0.66 };
      out.push(R(desk, { m: "wood", ht: 0.73 }));
      out.push(C(cx, cy + 0.5 + 0.22, 0.2, { m: "fabric", ht: 0.45 }));
      // Écran
      out.push(R({ x: cx - 0.3, y: cy - 0.44, w: 0.6, h: 0.06 }, { m: "metal", ht: 0.42 }));
      k++;
    }
  }
}

// ── Salle de réunion : table centrale + chaises ──────────────────────────────

function genReunion(room: PlanRoom, out: Prim[]) {
  const tw = Math.min(room.w * 0.52, 3.2);
  const th = Math.min(room.h * 0.36, 1.25);
  const cx = room.x + room.w / 2;
  const cy = room.y + room.h / 2;
  out.push(R({ x: cx - tw / 2, y: cy - th / 2, w: tw, h: th }, { m: "wood", ht: 0.74, rx: 0.08 }));
  const nLong = Math.min(Math.floor(tw / 0.78), 4);
  for (let i = 0; i < nLong; i++) {
    const px = cx - tw / 2 + (tw * (i + 0.5)) / nLong;
    out.push(C(px, cy - th / 2 - 0.32, 0.21, { m: "fabric", ht: 0.45 }));
    out.push(C(px, cy + th / 2 + 0.32, 0.21, { m: "fabric", ht: 0.45 }));
  }
  if (tw > 2) {
    out.push(C(cx - tw / 2 - 0.32, cy, 0.21, { m: "fabric", ht: 0.45 }));
    out.push(C(cx + tw / 2 + 0.32, cy, 0.21, { m: "fabric", ht: 0.45 }));
  }
}

// ── Stockage / logistique : rayonnages ───────────────────────────────────────

function genStockage(room: PlanRoom, out: Prim[]) {
  const horiz = room.w >= room.h;
  const along = horiz ? room.w : room.h;
  const cross = horiz ? room.h : room.w;
  const depth = 1.05;
  const aisle = 1.25;
  const n = Math.min(Math.floor((cross - 0.35) / (depth + aisle)) + 1, 4);
  if (n < 1) return;
  const rackLen = Math.min(along - 0.5, 6);
  const pitch = cross / (n + 0.35);
  for (let i = 0; i < n; i++) {
    const cCross = (cross * (i + 0.85)) / (n + 0.7);
    const rack: Box = horiz
      ? { x: room.x + (along - rackLen) / 2, y: room.y + cCross - depth / 2, w: rackLen, h: depth }
      : { x: room.x + cCross - depth / 2, y: room.y + (along - rackLen) / 2, w: depth, h: rackLen };
    if (!inside(room, rack)) continue;
    out.push(R(rack, { m: "metal", ht: 2.0 }));
    if (horiz) {
      out.push(L(rack.x + 0.1, rack.y + depth / 2, rack.x + rack.w - 0.1, rack.y + depth / 2));
    } else {
      out.push(L(rack.x + depth / 2, rack.y + 0.1, rack.x + depth / 2, rack.y + rack.h - 0.1));
    }
  }
  void pitch;
}

// ── Salle à manger : table + chaises ─────────────────────────────────────────

function genSalleManger(room: PlanRoom, out: Prim[]) {
  const tw = Math.min(1.9, room.w - 1.4);
  const th = Math.min(0.95, room.h - 1.4);
  if (tw < 1.0 || th < 0.6) return;
  const cx = room.x + room.w / 2;
  const cy = room.y + room.h / 2;
  pushIf(room, out, { x: cx - tw / 2, y: cy - th / 2, w: tw, h: th }, {
    m: "wood",
    ht: 0.74,
    rx: 0.06,
  });
  const chairs = Math.max(2, Math.min(3, Math.floor(tw / 0.62)));
  for (let i = 0; i < chairs; i++) {
    const px = cx - tw / 2 + (tw * (i + 1)) / (chairs + 1);
    out.push(C(px, cy - th / 2 - 0.32, 0.2, { m: "fabric", ht: 0.45 }));
    out.push(C(px, cy + th / 2 + 0.32, 0.2, { m: "fabric", ht: 0.45 }));
  }
}

// ── Espace de vente : rayonnages périphériques + gondole centrale ───────────

function genVente(room: PlanRoom, out: Prim[]) {
  const walls = wallsByLength(room);
  // Rayonnages adossés aux deux plus longs murs libres (portes respectées).
  let placed = 0;
  for (const wall of walls) {
    if (placed >= 2) break;
    const span = bestSpan(room, wall, 1.6);
    if (!span) continue;
    const len = Math.min(span.b - span.a - 0.1, 5.2);
    const shelf = againstWall(room, wall, (span.a + span.b) / 2, 0.06, 0.42, len);
    if (!pushIf(room, out, shelf, { m: "metal", ht: 1.9 })) continue;
    if (shelf.w >= shelf.h) {
      out.push(L(shelf.x + 0.06, shelf.y + shelf.h / 2, shelf.x + shelf.w - 0.06, shelf.y + shelf.h / 2));
    } else {
      out.push(L(shelf.x + shelf.w / 2, shelf.y + 0.06, shelf.x + shelf.w / 2, shelf.y + shelf.h - 0.06));
    }
    placed++;
  }
  // Gondole centrale, dans le sens de la profondeur la plus grande.
  const gw = Math.min(room.w * 0.5, 2.4);
  const gh = Math.min(room.h * 0.28, 1.2);
  if (room.w >= 3.2 && room.h >= 3.2) {
    pushIf(
      room,
      out,
      { x: room.x + (room.w - gw) / 2, y: room.y + (room.h - gh) / 2, w: gw, h: gh },
      { m: "wood", ht: 1.45 },
    );
  }
  // Comptoir de caisse près de l'entrée (plus petit mur libre).
  for (const wall of walls) {
    const span = bestSpan(room, wall, 1.2);
    if (!span) continue;
    const counter = againstWall(room, wall, span.b - 0.35, 0.05, 0.62, 1.1);
    if (pushIf(room, out, counter, { m: "wood", ht: 1.02 })) break;
  }
}

// ── Salle café : comptoir intégré + tables et chaises ───────────────────────
//
// Le comptoir est un ÉQUIPEMENT de la salle (jamais une pièce) : il est adossé
// au mur de l'espace de préparation lorsqu'il existe, avec le plan de travail
// et le passage du personnel derrière, puis les tables et chaises sont
// réparties autour sans bloquer le comptoir, les portes ni les allées.

function inflate(r: CafeRect, d: number): CafeRect {
  return { x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d };
}

function clampToRoom(room: PlanRoom, r: CafeRect): CafeRect {
  const x = Math.max(r.x, room.x);
  const y = Math.max(r.y, room.y);
  const right = Math.min(r.x + r.w, room.x + room.w);
  const bottom = Math.min(r.y + r.h, room.y + room.h);
  return { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) };
}

function genSalleCafe(room: PlanRoom, plan: FloorPlan, out: Prim[]) {
  const placement = cafeCounterPlacement(room, plan.rooms, plan);
  if (!placement) return;
  const { counter, worktop, staffAisle } = placement;

  // Plan de travail adossé au mur, derrière le comptoir.
  pushIf(room, out, worktop, { m: "metal", ht: 0.9 });
  // Ligne de crédence (étagère haute).
  if (worktop.w >= worktop.h) {
    out.push(
      L(
        worktop.x + 0.06,
        worktop.y + worktop.h / 2,
        worktop.x + worktop.w - 0.06,
        worktop.y + worktop.h / 2,
      ),
    );
  } else {
    out.push(
      L(
        worktop.x + worktop.w / 2,
        worktop.y + 0.06,
        worktop.x + worktop.w / 2,
        worktop.y + worktop.h - 0.06,
      ),
    );
  }

  // Comptoir client (le bar), dans la même surface que la salle.
  pushIf(room, out, counter, { m: "wood", ht: 1.05, rx: 0.04 });
  if (counter.w >= counter.h) {
    out.push(L(counter.x + 0.08, counter.y + 0.12, counter.x + counter.w - 0.08, counter.y + 0.12));
  } else {
    out.push(L(counter.x + 0.12, counter.y + 0.08, counter.x + 0.12, counter.y + counter.h - 0.08));
  }

  // Équipements sur le plan de travail : machine à café et caisse.
  const along = worktop.w >= worktop.h;
  const machine: CafeRect = along
    ? { x: worktop.x + 0.12, y: worktop.y + 0.06, w: 0.42, h: Math.max(0.2, worktop.h - 0.12) }
    : { x: worktop.x + 0.06, y: worktop.y + 0.12, w: Math.max(0.2, worktop.w - 0.12), h: 0.42 };
  pushIf(room, out, machine, { m: "metal", ht: 0.52 });
  const till: CafeRect = along
    ? {
        x: worktop.x + worktop.w - 0.44,
        y: worktop.y + 0.08,
        w: 0.32,
        h: Math.max(0.2, worktop.h - 0.16),
      }
    : {
        x: worktop.x + 0.08,
        y: worktop.y + worktop.h - 0.44,
        w: Math.max(0.2, worktop.w - 0.16),
        h: 0.32,
      };
  pushIf(room, out, till, { m: "white", ht: 0.18 });

  // Zones interdites aux tables : comptoir, travail, passage personnel, allée
  // client et débattement des portes (aucun accès bloqué).
  const forbidden: CafeRect[] = [
    inflate(counter, 0.15),
    inflate(worktop, 0.15),
    inflate(staffAisle, 0.1),
    inflate(clampToRoom(room, placement.clientAisle), 0.15),
    ...cafeDoorClearances(room).map((r) => inflate(r, 0.1)),
  ];

  const size = 0.6;
  const chair = 0.42;
  const freeArea = Math.max(0, room.area - placement.counterArea);
  const maxTables = Math.max(1, Math.min(12, Math.floor(freeArea / 4.2)));
  const tables: CafeRect[] = [];

  const clearOfForbidden = (r: CafeRect) => !forbidden.some((z) => cafeRectsOverlap(r, z));
  const clearOfTables = (r: CafeRect) =>
    !tables.some((t) => cafeRectsOverlap(inflate(r, 0.1), inflate(t, 0.55)));

  const margin = 0.5;
  for (let y = room.y + margin; y + size <= room.y + room.h - margin; y += 1.7) {
    for (let x = room.x + margin; x + size <= room.x + room.w - margin; x += 1.7) {
      if (tables.length >= maxTables) break;
      const table: CafeRect = { x, y, w: size, h: size };
      if (!clearOfForbidden(table) || !clearOfTables(table)) continue;

      // Chaises de part et d'autre de la table, uniquement si elles restent
      // dans la salle et hors des zones de circulation protégées.
      const horizontal: CafeRect[] = [
        { x: table.x - chair - 0.06, y: y + (size - chair) / 2, w: chair, h: chair },
        { x: table.x + size + 0.06, y: y + (size - chair) / 2, w: chair, h: chair },
      ];
      const vertical: CafeRect[] = [
        { x: x + (size - chair) / 2, y: table.y - chair - 0.06, w: chair, h: chair },
        { x: x + (size - chair) / 2, y: table.y + size + 0.06, w: chair, h: chair },
      ];
      const chairs = [horizontal, vertical].find((set) =>
        set.every(
          (c) => inside(room, c) && clearOfForbidden(c) && !cafeRectsOverlap(c, table),
        ),
      );
      if (!chairs) continue;

      tables.push(table);
      pushIf(room, out, table, { m: "wood", ht: 0.74, rx: 0.08 });
      for (const c of chairs) {
        out.push(C(c.x + c.w / 2, c.y + c.h / 2, chair / 2, { m: "fabric", ht: 0.45 }));
      }
    }
  }
}

// ── Salle de restauration : bar intégré + tables et chaises ────────────────
//
// Le bar est un ÉQUIPEMENT de la salle (jamais une pièce). Il est adossé au mur
// de la cuisine professionnelle, avec le plan de travail et le passage du
// personnel derrière, le passe-plat dans le mur, puis les tables réparties
// autour sans bloquer le bar, les portes ni les allées de circulation.

function genSalleRestaurant(room: PlanRoom, plan: FloorPlan, out: Prim[]) {
  const placement = restaurantCounterPlacement(room, plan.rooms, plan);
  if (!placement) return;
  const { counter, worktop, staffAisle, passePlat } = placement;

  // Passe / plan de travail adossé au mur de cuisine (transfert des plats).
  pushIf(room, out, worktop, { m: "metal", ht: 0.92 });
  const along = worktop.w >= worktop.h;
  out.push(
    along
      ? L(
          worktop.x + 0.08,
          worktop.y + worktop.h / 2,
          worktop.x + worktop.w - 0.08,
          worktop.y + worktop.h / 2,
        )
      : L(
          worktop.x + worktop.w / 2,
          worktop.y + 0.08,
          worktop.x + worktop.w / 2,
          worktop.y + worktop.h - 0.08,
        ),
  );

  // Passe-plat : percement du mur de cuisine, au-dessus du plan de travail.
  if (passePlat) {
    pushIf(room, out, passePlat.rect, { m: "metal", ht: 1.15 });
  }

  // Bar côté clients, dans la même surface que la salle.
  pushIf(room, out, counter, { m: "wood", ht: 1.1, rx: 0.04 });
  pushIf(
    room,
    out,
    along
      ? { x: counter.x + 0.06, y: counter.y + 0.1, w: counter.w - 0.12, h: 0.12 }
      : { x: counter.x + 0.1, y: counter.y + 0.06, w: 0.12, h: counter.h - 0.12 },
    { m: "white", ht: 1.12 },
  );

  // Zones interdites aux tables : bar, plan de travail, passage du personnel,
  // allée client et débattement des portes (aucun accès bloqué).
  const forbidden: CafeRect[] = [
    inflate(counter, 0.2),
    inflate(worktop, 0.15),
    inflate(staffAisle, 0.1),
    inflate(clampToRoom(room, placement.clientAisle), 0.15),
    ...cafeDoorClearances(room).map((r) => inflate(r, 0.1)),
  ];

  const size = 0.8;
  const chair = 0.45;
  const freeArea = Math.max(0, room.area - placement.counterArea);
  // Densité de salle : ~4,5 m² par table de 4 couverts, allées comprises.
  const maxTables = Math.max(1, Math.min(24, Math.floor(freeArea / 4.5)));
  const tables: CafeRect[] = [];
  const clearOfForbidden = (r: CafeRect) => !forbidden.some((z) => cafeRectsOverlap(r, z));
  const clearOfTables = (r: CafeRect) =>
    !tables.some((t) => cafeRectsOverlap(inflate(r, 0.12), inflate(t, 0.45)));

  const margin = 0.55;
  const pitch = 2.1;
  for (let y = room.y + margin; y + size <= room.y + room.h - margin; y += pitch) {
    for (let x = room.x + margin; x + size <= room.x + room.w - margin; x += pitch) {
      if (tables.length >= maxTables) break;
      const table: CafeRect = { x, y, w: size, h: size };
      if (!clearOfForbidden(table) || !clearOfTables(table)) continue;

      // Quatre couverts autour de la table (0,80 m). Si la place manque sur
      // un axe, on se rabat sur deux chaises, puis on abandonne la table.
      const horizontal: CafeRect[] = [
        { x: table.x - chair - 0.08, y: y + (size - chair) / 2, w: chair, h: chair },
        { x: table.x + size + 0.08, y: y + (size - chair) / 2, w: chair, h: chair },
      ];
      const vertical: CafeRect[] = [
        { x: x + (size - chair) / 2, y: table.y - chair - 0.08, w: chair, h: chair },
        { x: x + (size - chair) / 2, y: table.y + size + 0.08, w: chair, h: chair },
      ];
      const fits = (set: CafeRect[]) =>
        set.every(
          (c) => inside(room, c) && clearOfForbidden(c) && !cafeRectsOverlap(c, table),
        );
      const chairs = fits([...horizontal, ...vertical])
        ? [...horizontal, ...vertical]
        : [horizontal, vertical].filter(fits).flat();
      if (chairs.length < 2) continue;

      tables.push(table);
      pushIf(room, out, table, { m: "wood", ht: 0.74, rx: 0.06 });
      for (const c of chairs) {
        out.push(C(c.x + c.w / 2, c.y + c.h / 2, chair / 2, { m: "fabric", ht: 0.46 }));
      }
    }
  }
}

// ── Cuisine professionnelle : préparation, cuisson, lavage, stockage ────────

function genCuisinePro(room: PlanRoom, out: Prim[]) {
  const walls = wallsByLength(room);
  const used = new Set<WallSide>();
  const CD = 0.65;

  for (const wall of walls) {
    if (used.size >= 2) break;
    const span = bestSpan(room, wall, 1.2);
    if (!span) continue;
    const len = Math.min(span.b - span.a - 0.06, 4.4);
    if (len < 1.2) continue;
    const mid = (span.a + span.b) / 2;
    const run = againstWall(room, wall, mid, 0.02, CD, len);
    if (!pushIf(room, out, run, { m: "metal", ht: 0.92 })) continue;
    used.add(wall);

    if (used.size === 1) {
      // Cuisson : fourneau 4 feux + plaque, à proximité du passe-plat.
      const hob = againstWall(
        room,
        wall,
        mid - len * 0.22,
        0.02 + (CD - 0.56) / 2,
        0.56,
        0.56,
      );
      if (pushIf(room, out, hob, { m: "metal", ht: 0.96 })) {
        const hx = hob.x + hob.w / 2;
        const hy = hob.y + hob.h / 2;
        for (const dx of [-0.13, 0.13]) {
          for (const dy of [-0.13, 0.13]) {
            out.push(C(hx + dx, hy + dy, 0.085, { flat: true, noFill: true }));
          }
        }
      }
      // Lavage : bac double sur le même plan de travail.
      const sink = againstWall(
        room,
        wall,
        mid + len * 0.26,
        0.02 + (CD - 0.46) / 2,
        0.46,
        0.82,
      );
      if (pushIf(room, out, sink, { m: "white", ht: 0.92, rx: 0.04 })) {
        if (sink.w >= sink.h) {
          out.push(
            L(sink.x + sink.w / 2, sink.y + 0.05, sink.x + sink.w / 2, sink.y + sink.h - 0.05),
          );
        } else {
          out.push(
            L(sink.x + 0.05, sink.y + sink.h / 2, sink.x + sink.w - 0.05, sink.y + sink.h / 2),
          );
        }
      }
    }
  }

  // Stockage / froid : armoires et frigos sur un mur libre, hors fenêtres.
  for (const wall of walls) {
    if (used.has(wall)) continue;
    const span = bestSpan(room, wall, 1.3, { win: true });
    if (!span) continue;
    const len = Math.min(span.b - span.a - 0.1, 3.2);
    if (len < 0.9) continue;
    pushIf(
      room,
      out,
      againstWall(room, wall, (span.a + span.b) / 2, 0.02, 0.7, len),
      { m: "metal", ht: 2 },
    );
    break;
  }
}

function genPlonge(room: PlanRoom, out: Prim[]) {
  for (const wall of wallsByLength(room)) {
    const span = bestSpan(room, wall, 1);
    if (!span) continue;
    const len = Math.min(span.b - span.a - 0.06, 2.8);
    if (len < 0.9) continue;
    const run = againstWall(room, wall, (span.a + span.b) / 2, 0.02, 0.62, len);
    if (!pushIf(room, out, run, { m: "metal", ht: 0.92 })) continue;

    // Double bac + lave-vaisselle professionnel.
    const sink = againstWall(room, wall, span.a + len * 0.34, 0.02 + 0.08, 0.46, 0.8);
    if (pushIf(room, out, sink, { m: "white", ht: 0.92, rx: 0.04 })) {
      out.push(
        L(sink.x + sink.w / 2, sink.y + 0.05, sink.x + sink.w / 2, sink.y + sink.h - 0.05),
      );
    }
    pushIf(
      room,
      out,
      againstWall(room, wall, span.a + len * 0.74, 0.02 + 0.07, 0.6, 0.6),
      { m: "metal", ht: 0.85 },
    );
    return;
  }
}

// ── Hall d'entrée : meuble à chaussures, patères et tapis ───────────────────

function genHall(room: PlanRoom, out: Prim[]) {
  // Meuble d'entrée (chaussures + vide-poche) sur le premier mur libre.
  for (const wall of wallsByLength(room)) {
    const span = bestSpan(room, wall, 1.0);
    if (!span) continue;
    const len = Math.min(1.2, span.b - span.a - 0.1);
    const bench = againstWall(room, wall, (span.a + span.b) / 2, 0.03, 0.35, len);
    if (!pushIf(room, out, bench, { m: "wood", ht: 1.05 })) continue;
    // Tiroirs / tablette du meuble.
    if (bench.w >= bench.h) {
      out.push(
        L(bench.x + 0.1, bench.y + bench.h / 2, bench.x + bench.w - 0.1, bench.y + bench.h / 2),
      );
    } else {
      out.push(
        L(bench.x + bench.w / 2, bench.y + 0.1, bench.x + bench.w / 2, bench.y + bench.h - 0.1),
      );
    }
    break;
  }

  // Tapis devant la porte d'entrée.
  const door = room.doors[0];
  if (door) {
    pushIf(
      room,
      out,
      againstWall(
        room,
        door.wall,
        door.position + door.width / 2,
        0.06,
        0.55,
        Math.max(0.5, Math.min(door.width - 0.1, 0.9)),
      ),
      { dash: true, noFill: true, flat: true },
    );
  }

  // Patères / miroir sur un autre mur resté libre.
  for (const wall of wallsByLength(room)) {
    const span = bestSpan(room, wall, 0.7);
    if (!span) continue;
    const peg = againstWall(room, wall, (span.a + span.b) / 2, 0.02, 0.12, 0.7);
    if (!inside(room, peg) || overlapsPlaced(out, peg, 0.02)) continue;
    out.push(R(peg, { m: "wood", ht: 1.4 }));
    break;
  }
}

// ── Buanderie : lave-linge, sèche-linge, bac et ballon d'eau chaude ─────────

function genBuanderie(room: PlanRoom, out: Prim[]) {
  // Colonne de lavage : deux appareils de 60 cm côte à côte.
  let applianceWall: WallSide | null = null;
  for (const wall of wallsByLength(room)) {
    const span = bestSpan(room, wall, 1.26);
    if (!span) continue;
    const start = span.a + 0.04;
    const boxes: Box[] = [];
    for (let i = 0; i < 2; i++) {
      const box = againstWall(room, wall, start + 0.31 + i * 0.64, 0.03, 0.62, 0.62);
      if (!inside(room, box)) {
        boxes.length = 0;
        break;
      }
      boxes.push(box);
    }
    if (boxes.length < 2) continue;
    boxes.forEach((box) => {
      out.push(R(box, { m: "white", ht: 0.86, rx: 0.04 }));
      out.push(C(box.x + box.w / 2, box.y + box.h / 2, 0.19, { flat: true, noFill: true }));
    });
    applianceWall = wall;
    break;
  }

  // Bac / évier de buanderie sur un autre mur, hors des appareils.
  for (const wall of wallsByLength(room)) {
    if (wall === applianceWall) continue;
    const span = bestSpan(room, wall, 0.6);
    if (!span) continue;
    const sink = againstWall(room, wall, (span.a + span.b) / 2, 0.03, 0.46, 0.56);
    if (!inside(room, sink) || overlapsPlaced(out, sink, 0.04)) continue;
    out.push(R(sink, { m: "metal", ht: 0.88, rx: 0.04 }));
    out.push(C(sink.x + sink.w / 2, sink.y + sink.h / 2, 0.035, { flat: true, noFill: true }));
    break;
  }

  // Ballon d'eau chaude dans un angle resté libre.
  const corners: Box[] = [
    { x: room.x + 0.08, y: room.y + 0.08, w: 0.4, h: 0.4 },
    { x: room.x + room.w - 0.48, y: room.y + 0.08, w: 0.4, h: 0.4 },
    { x: room.x + 0.08, y: room.y + room.h - 0.48, w: 0.4, h: 0.4 },
    { x: room.x + room.w - 0.48, y: room.y + room.h - 0.48, w: 0.4, h: 0.4 },
  ];
  for (const corner of corners) {
    if (!inside(room, corner) || overlapsPlaced(out, corner, 0.06)) continue;
    out.push(C(corner.x + corner.w / 2, corner.y + corner.h / 2, 0.18, { m: "white", ht: 1.5 }));
    break;
  }
}

// ── Dégagement des portes ───────────────────────────────────────────────────

/**
 * Dégage le passage devant chaque porte : aucun meuble plein, appareil ou
 * équipement ne doit se trouver dans la bande d'accès (largeur du battant,
 * profondeur 0,90 m). Un meuble qui traverse cette bande est recadré de part
 * et d'autre ; les tapis et tracés (non bloquants) sont conservés.
 *
 * Cette règle est appliquée à la GÉOMÉTRIE du mobilier, donc identique en 2D,
 * en 3D, dans les PDF et pour le validateur de circulation.
 */
function clearDoorLanes(room: PlanRoom, prims: Prim[]): Prim[] {
  if (room.doors.length === 0) return prims;
  const LANE = 0.9;
  const lanes = room.doors.map((door) => {
    const lateral = door.wall === "N" || door.wall === "S";
    const depth = Math.min(LANE, Math.max(0.35, Math.min(room.w, room.h) - 0.1));
    if (door.wall === "N") {
      return { x: room.x + door.position, y: room.y, w: door.width, h: depth, lateral };
    }
    if (door.wall === "S") {
      return {
        x: room.x + door.position,
        y: room.y + room.h - depth,
        w: door.width,
        h: depth,
        lateral,
      };
    }
    if (door.wall === "W") {
      return { x: room.x, y: room.y + door.position, w: depth, h: door.width, lateral };
    }
    return {
      x: room.x + room.w - depth,
      y: room.y + door.position,
      w: depth,
      h: door.width,
      lateral,
    };
  });

  const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => {
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return ox > 0.02 && oy > 0.02 ? ox * oy : 0;
  };

  const boxOf = (p: Prim) =>
    p.t === "r"
      ? { x: p.x, y: p.y, w: p.w, h: p.h }
      : p.t === "c"
        ? { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 }
        : null;
  const original = new Map<Prim, { x: number; y: number; w: number; h: number }>();
  for (const p of prims) {
    const b = boxOf(p);
    if (b) original.set(p, b);
  }

  // Symboles posés sur un meuble (foyer de cuisson, tambour de machine à laver,
  // brûleurs…) : ils doivent suivre le meuble s'il est déplacé, et disparaître
  // avec lui s'il est retiré.
  const isSymbol = (p: Prim) =>
    p.t !== "l" && (p.noFill === true || (p.t === "r" && p.dash === true));
  const symbols = prims.filter(isSymbol);
  const anchorOf = new Map<Prim, Prim | null>();
  for (const symbol of symbols) {
    const sb = boxOf(symbol);
    const cx = sb ? sb.x + sb.w / 2 : NaN;
    const cy = sb ? sb.y + sb.h / 2 : NaN;
    let anchor: Prim | null = null;
    let bestArea = Infinity;
    for (const candidate of prims) {
      if (candidate === symbol || isSymbol(candidate)) continue;
      const cb = boxOf(candidate);
      if (!cb) continue;
      if (cx < cb.x - 0.01 || cx > cb.x + cb.w + 0.01) continue;
      if (cy < cb.y - 0.01 || cy > cb.y + cb.h + 0.01) continue;
      const area = cb.w * cb.h;
      if (area < bestArea) {
        bestArea = area;
        anchor = candidate;
      }
    }
    anchorOf.set(symbol, anchor);
  }

  const out: Prim[] = [];
  for (const prim of prims) {
    if (prim.t === "l") {
      out.push(prim);
      continue;
    }
    if (isSymbol(prim)) {
      // Symbole solidaire d'un meuble : il est replacé plus bas avec lui.
      if (anchorOf.get(prim)) continue;
      out.push(prim);
      continue;
    }
    const box =
      prim.t === "r"
        ? { x: prim.x, y: prim.y, w: prim.w, h: prim.h }
        : { x: prim.x - prim.r, y: prim.y - prim.r, w: prim.r * 2, h: prim.r * 2 };
    // Autres meubles pleins : un équipement ne doit pas être déplacé sur eux.
    const others = prims
      .filter(
        (other) =>
          other !== prim &&
          other.t !== "l" &&
          !other.noFill &&
          !(other.t === "r" && other.dash),
      )
      .map((other) =>
        other.t === "r"
          ? { x: other.x, y: other.y, w: other.w, h: other.h }
          : other.t === "c"
            ? { x: other.x - other.r, y: other.y - other.r, w: other.r * 2, h: other.r * 2 }
            : null,
      )
      .filter((box): box is Box => box !== null);
    if (lanes.every((lane) => overlap(box, lane) === 0)) {
      out.push(prim);
      continue;
    }
    // Meuble ou symbole posé dans une bande d'accès : le placer hors de
    // TOUTES les bandes (pas seulement de celle qui l'a révélé), sinon le
    // retirer. Un meuble décalé devant une autre porte est aussi gênant.
    const candidateRects: Box[] = [];
    for (const lane of lanes) {
      if (overlap(box, lane) === 0) continue;
      if (lane.lateral) {
        const leftW = lane.x - box.x - 0.05;
        const rightX = lane.x + lane.w + 0.05;
        const rightW = box.x + box.w - rightX;
        if (leftW >= 0.12) candidateRects.push({ x: box.x, y: box.y, w: leftW, h: box.h });
        if (rightW >= 0.12) candidateRects.push({ x: rightX, y: box.y, w: rightW, h: box.h });
        candidateRects.push({ x: lane.x + lane.w + 0.06, y: box.y, w: box.w, h: box.h });
        candidateRects.push({ x: lane.x - 0.06 - box.w, y: box.y, w: box.w, h: box.h });
      } else {
        const topH = lane.y - box.y - 0.05;
        const bottomY = lane.y + lane.h + 0.05;
        const bottomH = box.y + box.h - bottomY;
        if (topH >= 0.12) candidateRects.push({ x: box.x, y: box.y, w: box.w, h: topH });
        if (bottomH >= 0.12) candidateRects.push({ x: box.x, y: bottomY, w: box.w, h: bottomH });
        candidateRects.push({ x: box.x, y: lane.y + lane.h + 0.06, w: box.w, h: box.h });
        candidateRects.push({ x: box.x, y: lane.y - 0.06 - box.h, w: box.w, h: box.h });
      }
    }
    const clearsEveryLane = (r: Box) => lanes.every((lane) => overlap(r, lane) === 0);
    const fits = (r: Box) =>
      prim.t === "r" &&
      r.w >= 0.12 &&
      r.h >= 0.12 &&
      inside(room, r) &&
      clearsEveryLane(r) &&
      !others.some((other) => overlap(r, other) > 0.01);
    // On privilégie la plus grande surface conservée, puis le moindre décalage.
    const score = (r: Box) =>
      r.w * r.h - 0.02 * (Math.abs(r.x - box.x) + Math.abs(r.y - box.y));
    let best: Box | null = null;
    for (const candidateRect of candidateRects) {
      if (!fits(candidateRect)) continue;
      if (!best || score(candidateRect) > score(best)) best = candidateRect;
    }
    if (!best) continue;
    prim.x = best.x;
    prim.y = best.y;
    if (prim.t === "r") {
      prim.w = best.w;
      prim.h = best.h;
      if (prim.rx !== undefined) prim.rx = Math.min(prim.rx, best.w / 2, best.h / 2);
    }    out.push(prim);
  }

  for (const symbol of symbols) {
    const anchor = anchorOf.get(symbol);
    if (!anchor) continue; // symbole libre : déjà traité dans la boucle
    if (!out.includes(anchor)) continue; // meuble retiré → symbole retiré
    const from = original.get(anchor);
    const to = boxOf(anchor);
    if (from && to && symbol.t !== "l") {
      symbol.x = Math.round((symbol.x + (to.x - from.x)) * 1000) / 1000;
      symbol.y = Math.round((symbol.y + (to.y - from.y)) * 1000) / 1000;
    }
    out.push(symbol);
  }

  return out;
}

// ── Dispatch par nature de pièce ─────────────────────────────────────────────

export function roomFurniture(room: PlanRoom, plan?: FloorPlan): Prim[] {
  const out: Prim[] = [];
  switch (room.kind) {
    case "chambre":
      genChambre(room, out);
      break;
    case "sejour":
      if (room.label.toLowerCase().includes("manger")) genSalleManger(room, out);
      else genSejour(room, out, plan);
      break;
    case "cuisine":
      genCuisine(room, out);
      break;
    case "sdb":
    case "sanitaire":
      genSdb(room, out);
      break;
    case "wc":
      genWc(room, out);
      break;
    case "hall":
      genHall(room, out);
      break;
    case "buanderie":
      genBuanderie(room, out);
      break;
    case "bureau":
      genBureau(room, out);
      break;
    case "garage":
      genGarage(room, out);
      break;
    case "reception":
      genReception(room, out);
      break;
    case "openspace":
      genOpenspace(room, out);
      break;
    case "reunion":
      genReunion(room, out);
      break;
    case "stockage":
    case "logistique":
      genStockage(room, out);
      break;
    case "vente":
      genVente(room, out);
      break;
    case "salle_cafe":
      if (plan) genSalleCafe(room, plan, out);
      break;
    case "salle_client":
      if (plan) genSalleRestaurant(room, plan, out);
      break;
    case "cuisine_pro":
      genCuisinePro(room, out);
      break;
    case "plonge":
      genPlonge(room, out);
      break;
    case "chambre_froide":
      genStockage(room, out);
      break;
    case "local_technique":
      // Groupe de filtration + pompe du bassin.
      pushIf(room, out, { x: room.x + 0.25, y: room.y + 0.25, w: 0.7, h: 0.55 }, { m: "metal", ht: 0.85 });
      pushIf(
        room,
        out,
        { x: room.x + room.w - 0.85, y: room.y + 0.25, w: 0.6, h: 0.6 },
        { m: "white", ht: 0.95 },
      );
      break;
    default:
      // couloir, escalier, vestiaire, polyvalent : circulation libre
      break;
  }
  // Aucun meuble ni équipement dans une bande d'accès de porte.
  return clearDoorLanes(room, out);
}
