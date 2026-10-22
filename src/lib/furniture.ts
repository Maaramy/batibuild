// ============================================================================
// AMÉNAGEMENT INTÉRIEUR — mobilier par nature de pièce (plans 2D & 3D)
// ----------------------------------------------------------------------------
// Génère, pour chaque pièce d'un plan, des primitives géométriques (rectangles,
// cercles, lignes) représentant le mobilier : lits + chevets + armoire, canapé +
// table basse + meuble TV, cuisine équipée (plan de travail, évier, plaque,
// frigo, table), sanitaires (baignoire/douche, lavabo, WC), bureau, voitures,
// postes open-space, table de réunion, rayonnages…
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

function genSejour(room: PlanRoom, out: Prim[]) {
  const walls = wallsByLength(room);
  const wall = walls[0];
  const span = bestSpan(room, wall, 1.6);
  if (!span) return;

  const avail = span.b - span.a - 0.2;
  const sofaLen = Math.min(Math.max(avail * 0.55, 1.6), 3.0);
  const mid = (span.a + span.b) / 2;
  const sofa = againstWall(room, wall, mid, 0.05, 0.88, sofaLen);
  if (!pushIf(room, out, sofa, { m: "fabric", ht: 0.75, rx: 0.09 })) return;

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

  // Meuble TV sur le mur opposé
  const opp: WallSide = wall === "N" ? "S" : wall === "S" ? "N" : wall === "W" ? "E" : "W";
  const os = bestSpan(room, opp, 1.2, { win: true }) ?? bestSpan(room, opp, 1.2);
  if (os) {
    pushIf(
      room,
      out,
      againstWall(room, opp, (os.a + os.b) / 2, 0.03, 0.38, Math.min(os.b - os.a - 0.12, 1.8)),
      { m: "wood", ht: 0.5 },
    );
  }

  // Fauteuil dans les grands séjours
  if (room.area >= 20) {
    const horiz = wall === "N" || wall === "S";
    const ax = horiz ? room.x + span.a + sofaLen + 0.55 : wall === "W" ? room.x + 1.35 : room.x + room.w - 1.35;
    const ay = horiz ? (wall === "N" ? room.y + 1.75 : room.y + room.h - 1.75) : room.y + span.a + sofaLen + 0.55;
    out.push(C(ax, ay, 0.38, { m: "fabric", ht: 0.7 }));
  }
}
// ── Cuisine équipée : plan de travail en L, évier, plaque, frigo, table ──────

function genCuisine(room: PlanRoom, out: Prim[]) {
  const CD = 0.6; // profondeur plan de travail
  const walls = wallsByLength(room);
  const P = walls[0];
  const adjacents: WallSide[] =
    P === "N" || P === "S" ? ["W", "E"] : ["N", "S"];
  const doorsOn = (w: WallSide) => room.doors.filter((d) => d.wall === w).length;
  const S_ = [...adjacents].sort((a, b) => doorsOn(a) - doorsOn(b))[0];

  const spanP = bestSpan(room, P, 1.4);
  if (!spanP) return;

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

  // Run secondaire (retour d'angle) + plaque de cuisson
  const totalS = wallLen(room, S_);
  const skip = CD + 0.08;
  const startAlong = cornerAlong(S_, P) ? skip : 0.06;
  const spanS = bestSpan(room, S_, 0.8);
  if (spanS) {
    const from = Math.max(startAlong, spanS.a + 0.04);
    const len = Math.min(1.7, spanS.b - 0.04 - from);
    if (len >= 0.8) {
      const midS = from + len / 2;
      const counterS = againstWall(room, S_, midS, 0.02, CD, len);
      pushIf(room, out, counterS, { m: "white", ht: 0.92 });
      // Plaque 4 feux au centre du retour
      const hobC = againstWall(room, S_, midS, 0.02 + (CD - 0.52) / 2, 0.52, 0.52);
      pushIf(room, out, hobC, { m: "metal", ht: 0.92 });
      const hcx = hobC.x + hobC.w / 2;
      const hcy = hobC.y + hobC.h / 2;
      for (const dx of [-0.125, 0.125])
        for (const dy of [-0.125, 0.125])
          out.push(C(hcx + dx, hcy + dy, 0.082, { flat: true, noFill: true }));
    }
  }
  function cornerAlong(w: WallSide, ofWall: WallSide): boolean {
    // Le début du mur w (coordonnée 0) touche-t-il le mur ofWall ?
    if (w === "N") return ofWall === "W";
    if (w === "S") return ofWall === "W";
    if (w === "W") return ofWall === "N";
    return ofWall === "N"; // E
  }
  void totalS;

  // Table + chaises si la cuisine est assez grande
  if (room.area >= 12) {
    const tw = 1.15;
    const th = 0.75;
    const shiftX = P === "W" ? CD + 0.55 : P === "E" ? -(CD + 0.55) : 0;
    const shiftY = P === "N" ? CD + 0.55 : P === "S" ? -(CD + 0.55) : 0;
    const cx = room.x + room.w / 2 + shiftX;
    const cy = room.y + room.h / 2 + shiftY;
    const tbl: Box = { x: cx - tw / 2, y: cy - th / 2, w: tw, h: th };
    if (inside(room, tbl)) {
      out.push(R(tbl, { m: "wood", ht: 0.74, rx: 0.04 }));
      out.push(C(cx - tw / 2 - 0.28, cy, 0.2, { m: "wood", ht: 0.45 }));
      out.push(C(cx + tw / 2 + 0.28, cy, 0.2, { m: "wood", ht: 0.45 }));
    }
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
    const cCross = room.y + (cross * (i + 1)) / (nCars + 1);
    const cAlong = room.x + along / 2;
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

// ── Dispatch par nature de pièce ─────────────────────────────────────────────

export function roomFurniture(room: PlanRoom, plan?: FloorPlan): Prim[] {
  const out: Prim[] = [];
  switch (room.kind) {
    case "chambre":
      genChambre(room, out);
      break;
    case "sejour":
      if (room.label.toLowerCase().includes("manger")) genSalleManger(room, out);
      else genSejour(room, out);
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
      // couloir, hall, escalier, vestiaire, polyvalent : circulation libre
      break;
  }
  return out;
}
