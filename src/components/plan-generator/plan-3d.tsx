// ============================================================================
// Vue 3D isométrique du bâtiment (BudgetBati — « Générateur de plans IA »)
// ----------------------------------------------------------------------------
// Extrusion axonométrique du plan d'étage : volume empilé par étage, façades
// avec fenêtres / portes / vitrines, et toit dessiné à partir du zoning des
// pièces. Rendu 100 % SVG (aucune dépendance 3D, aucun WebGL) : le résultat
// s'exporte comme le plan 2D en PNG / JPG / PDF.
//
// Les helpers géométriques (rotateYaw, projectIso, isFaceVisible, fitViewBox)
// sont purs et couverts par des tests unitaires (plan-3d.test.ts).
// ============================================================================

import { useMemo } from "react";
import type { PlanLayout, Room } from "./plan-engine";

// ─── Constantes de projection (axonométrie isométrique) ─────────────────────
const SX = 0.866; // cos(30°)
const SY = 0.5; // sin(30°)
const SZ = 0.92; // compression de l'axe vertical

const FLOOR_H = 3.0; // hauteur d'étage réelle (m)
const WIN_SILL = 1.0; // appui de fenêtre (m)
const WIN_H = 1.4; // hauteur de fenêtre (m)
const DOOR_H = 2.2; // hauteur de porte (m)

const VB_W = 780; // viewBox (largeur)
const VB_H = 600; // viewBox (hauteur)
const HDR = 64; // bandeau d'en-tête
const DISC = 58; // bandeau d'avertissement
const PAD = 44; // marge autour du volume

// ─── Géométrie pure (exportée et testée) ────────────────────────────────────

/** Rotation horizontale (lacet) autour de l'axe vertical (degrés). */
export function rotateYaw(x: number, y: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c - y * s, x * s + y * c];
}

/** Projection axonométrique : (rx, ry) plan roté → (px, py) écran, z vers le haut. */
export function projectIso(rx: number, ry: number, z: number): [number, number] {
  return [(rx - ry) * SX, (rx + ry) * SY - z * SZ];
}

/**
 * Une face verticale de normale (nx, ny) — après rotation du lacet — est
 * visible lorsque sa normale pointe vers le spectateur : (n.x + n.y) > 0.
 */
export function isFaceVisible(nx: number, ny: number): boolean {
  return nx + ny > 0.0001;
}

/** Échelle + translation pour faire tenir des points dans une boîte (viewport). */
export function fitViewBox(
  points: [number, number][],
  vbW: number,
  vbH: number,
  pad: number,
): { k: number; tx: number; ty: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);
  const k = Math.min((vbW - pad * 2) / bw, (vbH - pad * 2) / bh);
  const tx = (vbW - (minX + maxX) * k) / 2;
  const ty = (vbH - (minY + maxY) * k) / 2;
  return { k, tx, ty };
}

// ─── Palette des pièces (même logique que le plan 2D) ───────────────────────

const ROOM_FILLS = ["#ffffff", "#f8fafc", "#f1f5f9", "#fdf2f8", "#f0fdf4", "#f5f3ff"];

function fillForRoom(r: Room, i: number): string {
  switch (r.kind) {
    case "corridor":
      return "#eef2f7";
    case "wet":
      return "#eff6ff";
    case "terrace":
    case "balcon":
      return "#fefce8";
    case "shopfloor":
      return "#f8fafc";
    case "quai":
      return "#e2e8f0";
    case "priere":
      return "#fdfaf3";
    case "stairs":
      return "#f5f3ff";
    default:
      return ROOM_FILLS[i % ROOM_FILLS.length];
  }
}

// ─── Primitives de rendu ────────────────────────────────────────────────────

type OpenPrim = {
  pts: [number, number][];
  fill: string;
  stroke?: string;
  sw?: number;
};

type LinePrim = { pts: [number, number][]; stroke: string; sw: number };

type FacePrim = {
  edge: number;
  pts: [number, number][];
  visible: boolean;
  fill: string;
  stroke: string;
  depth: number;
  openings: OpenPrim[];
  lines: LinePrim[];
};

const polyStr = (pts: [number, number][]) =>
  pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

const fmtM = (n: number) => `${n.toFixed(2).replace(".", ",")} m`;

// ─── Composant principal ─────────────────────────────────────────────────────

export function Plan3dSvg({
  layout,
  yaw,
  disclaimer,
}: {
  layout: PlanLayout;
  yaw: number;
  disclaimer: string[];
}) {
  const { width: W, height: H, floors, rooms } = layout;
  const H3 = Math.max(3, floors * FLOOR_H);

  // ── Calcul de la scène (purement déterministe, re-calculé au lacet) ──
  const scene = useMemo(() => {
    // Sommets de l'emprise au sol : plan (x, y↓) → 3D (x, -y)
    const C: [number, number][] = [
      [0, 0],
      [W, 0],
      [W, -H],
      [0, -H],
    ];
    const EDGES = [
      { a: 0, b: 1, nx: 0, ny: -1 }, // bord « y = 0 » du plan
      { a: 1, b: 2, nx: 1, ny: 0 }, // bord « x = W » du plan
      { a: 2, b: 3, nx: 0, ny: 1 }, // bord « y = H » du plan
      { a: 3, b: 0, nx: -1, ny: 0 }, // bord « x = 0 » du plan
    ];

    const proj3 = (x: number, y: number, z: number): [number, number] => {
      const [rx, ry] = rotateYaw(x, y, yaw);
      return projectIso(rx, ry, z);
    };
    const ptOnEdge = (e: number, t: number): [number, number] => {
      const [ax, ay] = C[EDGES[e].a];
      const [bx, by] = C[EDGES[e].b];
      return [ax + (bx - ax) * t, ay + (by - ay) * t];
    };
    const paramOnEdge = (e: number, x: number, y: number): number => {
      const [ax, ay] = C[EDGES[e].a];
      const [bx, by] = C[EDGES[e].b];
      const vx = bx - ax;
      const vy = by - ay;
      const len2 = vx * vx + vy * vy || 1;
      return Math.min(1, Math.max(0, ((x - ax) * vx + (y - ay) * vy) / len2));
    };
    const edgeForWindow = (axis: string, at: number): number => {
      if (axis === "h") {
        if (Math.abs(at - 0) < 0.05) return 0;
        if (Math.abs(at - H) < 0.05) return 2;
      } else {
        if (Math.abs(at - W) < 0.05) return 1;
        if (Math.abs(at - 0) < 0.05) return 3;
      }
      return -1;
    };

    // Ouvertures (fenêtres / portes extérieures) regroupées par arête
    const windowsByEdge: { t1: number; t2: number }[][] = [[], [], [], []];
    for (const w of layout.windows) {
      const e = edgeForWindow(w.axis, w.at);
      if (e < 0) continue;
      const p1 = w.axis === "h" ? ([w.from, w.at] as [number, number]) : ([w.at, w.from] as [number, number]);
      const p2 = w.axis === "h" ? ([w.to, w.at] as [number, number]) : ([w.at, w.to] as [number, number]);
      windowsByEdge[e].push({ t1: paramOnEdge(e, p1[0], p1[1]), t2: paramOnEdge(e, p2[0], p2[1]) });
    }
    const doorsByEdge: { t1: number; t2: number }[][] = [[], [], [], []];
    for (const d of layout.doors) {
      const e = edgeForWindow(d.axis, d.at);
      if (e < 0) continue;
      const c = (d.from + d.to) / 2;
      const c1 = c - d.len / 2;
      const c2 = c + d.len / 2;
      const p1 = d.axis === "h" ? ([c1, d.at] as [number, number]) : ([d.at, c1] as [number, number]);
      const p2 = d.axis === "h" ? ([c2, d.at] as [number, number]) : ([d.at, c2] as [number, number]);
      doorsByEdge[e].push({ t1: paramOnEdge(e, p1[0], p1[1]), t2: paramOnEdge(e, p2[0], p2[1]) });
    }
    const glassByEdge = [false, false, false, false];
    const glassMap = { top: 0, bottom: 2, left: 3, right: 1 } as const;
    for (const r of rooms) {
      for (const ge of r.glassEdge ?? []) glassByEdge[glassMap[ge]] = true;
    }

    // Faces (triées loin → près)
    const faces: FacePrim[] = EDGES.map((ed, ei) => {
      const [rnx, rny] = rotateYaw(ed.nx, ed.ny, yaw);
      const visible = isFaceVisible(rnx, rny);
      const pA0 = proj3(C[ed.a][0], C[ed.a][1], 0);
      const pB0 = proj3(C[ed.b][0], C[ed.b][1], 0);
      const pAH = proj3(C[ed.a][0], C[ed.a][1], H3);
      const pBH = proj3(C[ed.b][0], C[ed.b][1], H3);
      const openings: OpenPrim[] = [];
      const lines: LinePrim[] = [];

      if (visible) {
        // Façade vitrée (vitrine)
        if (glassByEdge[ei]) {
          const span = Math.hypot(C[ed.b][0] - C[ed.a][0], C[ed.b][1] - C[ed.a][1]);
          const mCount = Math.max(1, Math.floor(span / 1.2));
          for (let m = 1; m < mCount; m++) {
            const t = m / mCount;
            const px = C[ed.a][0] + (C[ed.b][0] - C[ed.a][0]) * t;
            const py = C[ed.a][1] + (C[ed.b][1] - C[ed.a][1]) * t;
            lines.push({
              pts: [proj3(px, py, 0), proj3(px, py, H3)],
              stroke: "#7dd3fc",
              sw: 0.9,
            });
          }
          openings.push({ pts: [pA0, pB0, pBH, pAH], fill: "rgba(125, 211, 252, 0.7)", stroke: "#38bdf8", sw: 1.1 });
        }
        // Fenêtres (répétées à chaque étage)
        for (const wnd of windowsByEdge[ei]) {
          for (let k = 0; k < floors; k++) {
            const z1 = k * FLOOR_H + WIN_SILL;
            const z2 = z1 + WIN_H;
            const a1 = ptOnEdge(ei, wnd.t1);
            const b1 = ptOnEdge(ei, wnd.t2);
            openings.push({
              pts: [
                proj3(a1[0], a1[1], z1),
                proj3(b1[0], b1[1], z1),
                proj3(b1[0], b1[1], z2),
                proj3(a1[0], a1[1], z2),
              ],
              fill: "#dbeafe",
              stroke: "#60a5fa",
              sw: 0.9,
            });
          }
        }
        // Portes extérieures (rez-de-chaussée)
        for (const dr of doorsByEdge[ei]) {
          const a1 = ptOnEdge(ei, dr.t1);
          const b1 = ptOnEdge(ei, dr.t2);
          openings.push({
            pts: [
              proj3(a1[0], a1[1], 0),
              proj3(b1[0], b1[1], 0),
              proj3(b1[0], b1[1], DOOR_H),
              proj3(a1[0], a1[1], DOOR_H),
            ],
            fill: "#cbd5e1",
            stroke: "#64748b",
            sw: 1,
          });
        }
        // Séparateurs d'étage
        for (let k = 1; k < floors; k++) {
          const z = k * FLOOR_H;
          lines.push({
            pts: [proj3(C[ed.a][0], C[ed.a][1], z), proj3(C[ed.b][0], C[ed.b][1], z)],
            stroke: "#cbd5e1",
            sw: 1.2,
          });
        }
      }

      return {
        edge: ei,
        pts: [pA0, pB0, pBH, pAH],
        visible,
        fill: visible ? "#f1f5f9" : "#e2e8f0",
        stroke: "#94a3b8",
        depth: (pA0[1] + pB0[1]) / 2,
        openings,
        lines,
      };
    });
    faces.sort((f1, f2) => f1.depth - f2.depth);

    // Plinthe / sol
    const cx = W / 2;
    const cy = -H / 2;
    const GROW = 1.06;
    const plate = C.map(([x, y]) => {
      const gx = cx + (x - cx) * GROW;
      const gy = cy + (y - cy) * GROW;
      return proj3(gx, gy, -0.06);
    });

    // Toit : zoning des pièces
    const roofPts = C.map(([x, y]) => proj3(x, y, H3));
    const roomPolys = rooms.map((r, i) => ({
      pts: (
        [
          [r.x, r.y],
          [r.x + r.w, r.y],
          [r.x + r.w, r.y + r.h],
          [r.x, r.y + r.h],
        ] as [number, number][]
      ).map(([x, y]) => proj3(x, -y, H3)),
      fill: fillForRoom(r, i),
    }));

    // Étiquettes d'étage sur la face la plus proche
    const front = [...faces].filter((f) => f.visible).pop();
    const labels: { x: number; y: number; text: string }[] = [];
    if (front) {
      const fi = front.edge;
      const [rnx, rny] = rotateYaw(EDGES[fi].nx, EDGES[fi].ny, yaw);
      const outX = rnx - rny;
      const outY = rnx + rny;
      for (let k = 0; k < floors; k++) {
        const z = k * FLOOR_H + FLOOR_H / 2;
        const [mx, my] = proj3(...ptOnEdge(fi, 0.5), z);
        const [rax, ray] = proj3(C[EDGES[fi].a][0], C[EDGES[fi].a][1], z);
        const [rbx, rby] = proj3(C[EDGES[fi].b][0], C[EDGES[fi].b][1], z);
        let dx = rbx - rax;
        let dy = rby - ray;
        const dl = Math.hypot(dx, dy) || 1;
        dx /= dl;
        dy /= dl;
        const px = -dy;
        const py = dx;
        const sign = px * outX + py * outY >= 0 ? 1 : -1;
        labels.push({
          x: mx + px * 20 * sign,
          y: my + py * 20 * sign,
          text: k === 0 ? "RDC" : `R+${k}`,
        });
      }
    }

    // Points pour le cadrage automatique
    const fitPts: [number, number][] = [
      ...plate,
      ...C.map(([x, y]) => proj3(x, y, 0)),
      ...C.map(([x, y]) => proj3(x, y, H3)),
    ];

    return { faces, plate, roofPts, roomPolys, labels, fitPts };
  }, [W, H, floors, rooms, yaw, H3]);

  const fit = useMemo(() => {
    const f = fitViewBox(scene.fitPts, VB_W, VB_H - HDR - DISC, PAD);
    return { k: f.k, tx: f.tx, ty: f.ty + HDR };
  }, [scene]);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={VB_W}
      height={VB_H}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="block w-full h-auto"
      fontFamily="'Segoe UI', system-ui, -apple-system, sans-serif"
      role="img"
      aria-label={`Vue 3D du bâtiment ${layout.typeLabel} générée par IA`}
    >
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="#ffffff" />

      {/* ═══ Header ═══ */}
      <rect x="0" y="0" width={VB_W} height={HDR} fill="#0f172a" />
      <rect x="0" y={HDR - 3} width={VB_W} height="3" fill="#3b82f6" />
      <rect x="18" y="16" width="14" height="14" rx="3" fill="#3b82f6" />
      <path d="M 21 18 l 4 4 M 29 18 l -4 4" stroke="#0f172a" strokeWidth="1.4" />
      <text x="40" y="26" fill="#ffffff" fontSize="16" fontWeight="700">
        BudgetBati
      </text>
      <text x="40" y="40" fill="#cbd5e1" fontSize="10">
        Générateur de plans — Vue 3D du bâtiment
      </text>
      <text x={VB_W - 18} y="22" fill="#ffffff" fontSize="13" fontWeight="700" textAnchor="end">
        {layout.projectName}
      </text>
      <text x={VB_W - 18} y="38" fill="#cbd5e1" fontSize="10" textAnchor="end">
        {layout.typeLabel} · {fmtM(W)} × {fmtM(H)} au sol · {floors} niveau{floors > 1 ? "x" : ""}
        {layout.region ? ` · ${layout.region}` : ""}
      </text>
      <text x={VB_W - 18} y="54" fill="#94a3b8" fontSize="9.5" textAnchor="end">
        Généré le {layout.generatedAt} · échelle indicative
      </text>
      <rect x="18" y="50" width="70" height="16" rx="8" fill="#3b82f6" opacity="0.18" />
      <text x="53" y="61" fill="#60a5fa" fontSize="9" fontWeight="700" textAnchor="middle">
        VUE 3D
      </text>

      {/* ═══ Scène 3D ═══ */}
      <g transform={`translate(${fit.tx} ${fit.ty}) scale(${fit.k})`}>
        {/* Plinthe / sol */}
        <polygon points={polyStr(scene.plate)} fill="#eef2f7" stroke="#cbd5e1" strokeWidth={1 / fit.k} strokeLinejoin="round" />

        {/* Faces (triées loin → près) */}
        {scene.faces.map((f, i) => (
          <g key={`face-${i}`}>
            <polygon points={polyStr(f.pts)} fill={f.fill} stroke={f.stroke} strokeWidth={1 / fit.k} strokeLinejoin="round" />
            {f.openings.map((o, j) => (
              <polygon
                key={`open-${j}`}
                points={polyStr(o.pts)}
                fill={o.fill}
                stroke={o.stroke ?? "none"}
                strokeWidth={(o.sw ?? 1) / fit.k}
                strokeLinejoin="round"
              />
            ))}
            {f.lines.map((ln, j) => (
              <line
                key={`ln-${j}`}
                x1={ln.pts[0][0]}
                y1={ln.pts[0][1]}
                x2={ln.pts[1][0]}
                y2={ln.pts[1][1]}
                stroke={ln.stroke}
                strokeWidth={ln.sw / fit.k}
              />
            ))}
          </g>
        ))}

        {/* Toit : zoning des pièces */}
        {scene.roomPolys.map((r, i) => (
          <polygon key={`room-${i}`} points={polyStr(r.pts)} fill={r.fill} stroke="#cbd5e1" strokeWidth={0.8 / fit.k} strokeLinejoin="round" />
        ))}
        <polygon points={polyStr(scene.roofPts)} fill="none" stroke="#64748b" strokeWidth={1.6 / fit.k} strokeLinejoin="round" />

        {/* Étiquettes d'étage */}
        {scene.labels.map((l, i) => (
          <text
            key={`lvl-${i}`}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10 / fit.k}
            fontWeight="700"
            fill="#475569"
            stroke="#ffffff"
            strokeWidth={2.5 / fit.k}
            paintOrder="stroke"
          >
            {l.text}
          </text>
        ))}
      </g>

      {/* Annotation hauteur */}
      <text x={VB_W - 18} y={VB_H - DISC - 10} textAnchor="end" fontSize="10" fill="#475569" fontWeight="600">
        Hauteur ≈ {fmtM(H3)} · {floors} niveau{floors > 1 ? "x" : ""} · échelle indicative 1 : 100
      </text>

      {/* ═══ Avertissement légal (bandeau) ═══ */}
      <g>
        <rect x="0" y={VB_H - DISC} width={VB_W} height={DISC} fill="#fffbeb" />
        <rect x="0" y={VB_H - DISC} width={VB_W} height="2.5" fill="#f59e0b" />
        <text x="18" y={VB_H - DISC + 20} fontSize="11.5" fontWeight="700" fill="#92400e">
          ⚠ Avertissement — Plan indicatif généré par Intelligence Artificielle
        </text>
        {disclaimer.map((line, i) => (
          <text key={i} x="18" y={VB_H - DISC + 38 + i * 15} fontSize="10.5" fill="#b45309">
            {line}
          </text>
        ))}
      </g>
    </svg>
  );
}
