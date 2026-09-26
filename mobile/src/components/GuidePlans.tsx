import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Circle, Line, Path, Polygon, Rect } from "react-native-svg";

import {
  Box,
  DARK,
  Icon,
  Lbl,
  LIGHT,
  Scene,
  VIEW_W,
  type IllusPalette,
  type IllusProps,
} from "./GuideIllustrations";
import {
  GUIDE_ROOM_COLORS,
  GUIDE_ROOM_LABELS,
  getGuidePlan,
  type DoorSpec,
  type GuideRoom,
  type WindowSpec,
} from "./guidePlans";

/**
 * APERÇUS RÉELS DE PLANS — étape « Plans AI » du guide de première utilisation.
 *
 * Trois vues D'UN MÊME plan réellement généré par le moteur (porté dans
 * `guidePlans.ts`, identique à celui de la plateforme) :
 *   1. « Plan 2D »      → pièces, murs, portes, fenêtres ;
 *   2. « Dimensions »   → cotes d'emprise et cotes de pièces ;
 *   3. « Vue 3D »       → extrusion isométrique du même plan.
 *
 * Les trois vues s'enchaînent automatiquement (comme sur la plateforme) : le
 * plan affiché est TOUJOURS le plan réel, jamais un dessin approximatif.
 * L'illustration est mise à l'échelle UNIFORME (« contain ») : aucune
 * déformation, aucun débordement, sur tous les écrans Android.
 *
 * PÉRIMÈTRE : mobile uniquement.
 */

const PLAN = getGuidePlan();

type Fit = { scale: number; ox: number; oy: number };

/** Mise à l'échelle UNIFORME (aucune déformation) et centrage dans une boîte. */
function fit(
  box: { x: number; y: number; w: number; h: number },
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): Fit {
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);
  const scale = Math.min(box.w / spanX, box.h / spanY);
  return {
    scale,
    ox: box.x + (box.w - spanX * scale) / 2 - minX * scale,
    oy: box.y + (box.h - spanY * scale) / 2 - minY * scale,
  };
}

/** Ouvre une porte : trou dans le mur + battant + arc de débattement. */
function doorGeometry(room: GuideRoom, d: DoorSpec, f: Fit) {
  const w = d.width * f.scale;
  const X = (v: number) => f.ox + v * f.scale;
  const Y = (v: number) => f.oy + v * f.scale;

  if (d.wall === "N") {
    const hx = X(room.x + d.position);
    const hy = Y(room.y);
    return {
      gap: [hx, hy, hx + w, hy] as [number, number, number, number],
      path: `M${hx} ${hy} L${hx} ${hy + w} A${w} ${w} 0 0 1 ${hx - w} ${hy}`,
    };
  }
  if (d.wall === "S") {
    const hx = X(room.x + d.position);
    const hy = Y(room.y + room.h);
    return {
      gap: [hx, hy, hx + w, hy] as [number, number, number, number],
      path: `M${hx} ${hy} L${hx} ${hy - w} A${w} ${w} 0 0 1 ${hx + w} ${hy}`,
    };
  }
  if (d.wall === "W") {
    const hx = X(room.x);
    const hy = Y(room.y + d.position);
    return {
      gap: [hx, hy, hx, hy + w] as [number, number, number, number],
      path: `M${hx} ${hy} L${hx + w} ${hy} A${w} ${w} 0 0 1 ${hx} ${hy + w}`,
    };
  }
  const hx = X(room.x + room.w);
  const hy = Y(room.y + d.position);
  return {
    gap: [hx, hy, hx, hy + w] as [number, number, number, number],
    path: `M${hx} ${hy} L${hx - w} ${hy} A${w} ${w} 0 0 1 ${hx} ${hy - w}`,
  };
}

/** Segment de fenêtre sur le mur concerné (coordonnées de la scène). */
function windowGeometry(room: GuideRoom, win: WindowSpec, f: Fit) {
  const X = (v: number) => f.ox + v * f.scale;
  const Y = (v: number) => f.oy + v * f.scale;
  const a = win.position;
  const b = win.position + win.width;
  switch (win.wall) {
    case "N":
      return { x1: X(room.x + a), y1: Y(room.y), x2: X(room.x + b), y2: Y(room.y) };
    case "S":
      return { x1: X(room.x + a), y1: Y(room.y + room.h), x2: X(room.x + b), y2: Y(room.y + room.h) };
    case "W":
      return { x1: X(room.x), y1: Y(room.y + a), x2: X(room.x), y2: Y(room.y + b) };
    default:
      return {
        x1: X(room.x + room.w),
        y1: Y(room.y + a),
        x2: X(room.x + room.w),
        y2: Y(room.y + b),
      };
  }
}

/** Bande de mur correspondant à une ouverture (pour percer le trou). */
function wallBand(room: GuideRoom, wall: DoorSpec["wall"], posStart: number, len: number, f: Fit) {
  const X = (v: number) => f.ox + v * f.scale;
  const Y = (v: number) => f.oy + v * f.scale;
  switch (wall) {
    case "N":
      return { x1: X(room.x + posStart), y1: Y(room.y), x2: X(room.x + posStart + len), y2: Y(room.y) };
    case "S":
      return {
        x1: X(room.x + posStart),
        y1: Y(room.y + room.h),
        x2: X(room.x + posStart + len),
        y2: Y(room.y + room.h),
      };
    case "W":
      return { x1: X(room.x), y1: Y(room.y + posStart), x2: X(room.x), y2: Y(room.y + posStart + len) };
    default:
      return {
        x1: X(room.x + room.w),
        y1: Y(room.y + posStart),
        x2: X(room.x + room.w),
        y2: Y(room.y + posStart + len),
      };
  }
}

/** Murs, portes et fenêtres du plan réel (commun aux vues 2D et cotée). */
function PlanGeometry({ f, p, withOpenings = true }: { f: Fit; p: IllusPalette; withOpenings?: boolean }) {
  const X = (v: number) => f.ox + v * f.scale;
  const Y = (v: number) => f.oy + v * f.scale;
  return (
    <>
      {/* Cloisons : un contour par pièce — les murs mitoyens se superposent
          EXACTEMENT (même coordonnée) : aucune déformation, aucun décalage. */}
      {PLAN.rooms.map((r) => (
        <Rect
          key={`w-${r.id}`}
          x={X(r.x)}
          y={Y(r.y)}
          width={r.w * f.scale}
          height={r.h * f.scale}
          fill="none"
          stroke={p.strong}
          strokeWidth={1.6}
        />
      ))}

      {/* Murs extérieurs */}
      <Rect
        x={X(0)}
        y={Y(0)}
        width={PLAN.length * f.scale}
        height={PLAN.width * f.scale}
        fill="none"
        stroke={p.ink}
        strokeWidth={3.4}
        opacity={0.88}
      />

      {withOpenings &&
        PLAN.rooms.map((r) => (
          <React.Fragment key={`o-${r.id}`}>
            {r.windows.map((win, i) => {
              const g = windowGeometry(r, win, f);
              return (
                <React.Fragment key={`win-${i}`}>
                  <Line {...g} stroke={p.panel} strokeWidth={4.6} strokeLinecap="butt" />
                  <Line {...g} stroke={p.blue} strokeWidth={2.8} strokeLinecap="butt" />
                </React.Fragment>
              );
            })}
            {r.doors.map((d, i) => {
              const band = wallBand(r, d.wall, d.position, d.width, f);
              const geo = doorGeometry(r, d, f);
              return (
                <React.Fragment key={`door-${i}`}>
                  <Line
                    {...band}
                    stroke={p.panel}
                    strokeWidth={d.isEntry ? 4.4 : 3.6}
                    strokeLinecap="butt"
                  />
                  <Path
                    d={geo.path}
                    fill="none"
                    stroke={d.isEntry ? p.brand : p.ink}
                    strokeWidth={d.isEntry ? 1.8 : 1.2}
                    opacity={d.isEntry ? 0.95 : 0.6}
                  />
                </React.Fragment>
              );
            })}
          </React.Fragment>
        ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Étape 2 — « Plan 2D »                                               */
/* ------------------------------------------------------------------ */

const BOX_2D = { x: 40, y: 52, w: 240, h: 132 };

export function IllusPlan2D({ width, theme }: IllusProps) {
  const p = theme.dark ? DARK : LIGHT;
  const s = width / VIEW_W;
  const f = fit(BOX_2D, 0, 0, PLAN.length, PLAN.width);

  return (
    <Scene
      width={width}
      id="p2d"
      p={p}
      labels={
        <>
          {PLAN.rooms.map((r) => {
            const cw = r.w * f.scale;
            const ch = r.h * f.scale;
            if (cw < 32 || ch < 24) return null;
            const cx = f.ox + (r.x + r.w / 2) * f.scale;
            const cy = f.oy + (r.y + r.h / 2) * f.scale;
            const bw = Math.max(Math.min(cw - 3, 74), 28);
            const bh = 17;
            return (
              <Box key={r.id} s={s} x={cx - bw / 2} y={cy - bh / 2} w={bw} h={bh} gap={0}>
                <Lbl s={s} size={7} color={p.ink} weight="700" spacing={0.1}>
                  {GUIDE_ROOM_LABELS[r.kind]}
                </Lbl>
                <Lbl s={s} size={6.5} color={p.muted} weight="600">
                  {r.area.toFixed(1)} m²
                </Lbl>
              </Box>
            );
          })}

          <Box s={s} x={16} y={13} w={158} h={22} row gap={6}>
            <Icon s={s} size={13} color={p.brand} name="pencilRuler" />
            <Lbl s={s} size={9.5} color={p.ink} weight="700">
              Plan 2D généré
            </Lbl>
          </Box>

          <Box s={s} x={16} y={203} w={288} h={24} row gap={7}>
            <Icon s={s} size={12} color={p.brand} name="layers" />
            <Lbl s={s} size={8.5} color={p.muted} weight="600">
              {PLAN.rooms.length} pièces · {PLAN.length.toFixed(1)} × {PLAN.width.toFixed(1)} m
            </Lbl>
          </Box>
        </>
      }
    >
      <Circle cx={296} cy={36} r={62} fill={p.blueSoft} opacity={0.35} />
      <Circle cx={22} cy={224} r={56} fill={p.brandSoft} opacity={0.35} />

      {/* Fonds des pièces — teintes exactes du moteur de la plateforme */}
      {PLAN.rooms.map((r) => (
        <Rect
          key={`f-${r.id}`}
          x={f.ox + r.x * f.scale}
          y={f.oy + r.y * f.scale}
          width={r.w * f.scale}
          height={r.h * f.scale}
          fill={GUIDE_ROOM_COLORS[r.kind]}
        />
      ))}

      <PlanGeometry f={f} p={p} />
    </Scene>
  );
}

/* ------------------------------------------------------------------ */
/* Étape 2 — « Plan coté » (dimensions)                                */
/* ------------------------------------------------------------------ */

const BOX_DIM = { x: 54, y: 66, w: 202, h: 96 };
const TICK = 3.2;

/** Chaîne de cotes : ligne + graduations + valeur (le cas échéant). */
function DimensionLine({
  x1,
  y1,
  x2,
  y2,
  label,
  labelLeft = false,
  p,
  s,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  /** Cote verticale : valeur placée à gauche de la ligne (hors du plan). */
  labelLeft?: boolean;
  p: IllusPalette;
  s: number;
}) {
  const vertical = Math.abs(x2 - x1) < 0.01;
  return (
    <>
      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={p.muted} strokeWidth={0.9} />
      <Line
        x1={vertical ? x1 - TICK : x1}
        y1={vertical ? y1 : y1 - TICK}
        x2={vertical ? x1 + TICK : x1}
        y2={vertical ? y1 : y1 + TICK}
        stroke={p.muted}
        strokeWidth={0.9}
      />
      <Line
        x1={vertical ? x2 - TICK : x2}
        y1={vertical ? y2 : y2 - TICK}
        x2={vertical ? x2 + TICK : x2}
        y2={vertical ? y2 : y2 + TICK}
        stroke={p.muted}
        strokeWidth={0.9}
      />
      {label ? (
        vertical ? (
          <Box
            s={s}
            x={labelLeft ? x1 - 45 : x1 + 5}
            y={(y1 + y2) / 2 - 7}
            w={40}
            h={14}
            align={labelLeft ? "flex-end" : "flex-start"}
          >
            <Lbl s={s} size={7.5} color={p.brandDeep} weight="700">
              {label}
            </Lbl>
          </Box>
        ) : (
          <Box s={s} x={(x1 + x2) / 2 - 24} y={y1 - 15} w={48} h={14}>
            <Lbl s={s} size={7.5} color={p.brandDeep} weight="700">
              {label}
            </Lbl>
          </Box>
        )
      ) : null}
    </>
  );
}

export function IllusPlanDimensions({ width, theme }: IllusProps) {
  const p = theme.dark ? DARK : LIGHT;
  const s = width / VIEW_W;
  const f = fit(BOX_DIM, 0, 0, PLAN.length, PLAN.width);
  const X = (v: number) => f.ox + v * f.scale;
  const Y = (v: number) => f.oy + v * f.scale;

  const bottom = Y(PLAN.width);
  const right = X(PLAN.length);
  const chainTopY = Y(0) - 13;
  const chainLeftX = X(0) - 13;

  const topRooms = PLAN.rooms.filter((r) => Math.abs(r.y) < 0.002).sort((a, b) => a.x - b.x);
  const leftRooms = PLAN.rooms.filter((r) => Math.abs(r.x) < 0.002).sort((a, b) => a.y - b.y);

  return (
    <Scene
      width={width}
      id="pdim"
      p={p}
      labels={
        <>
          {PLAN.rooms.map((r) => {
            const cw = r.w * f.scale;
            const ch = r.h * f.scale;
            if (cw < 36 || ch < 26) return null;
            const cx = X(r.x + r.w / 2);
            const cy = Y(r.y + r.h / 2);
            return (
              <Box key={r.id} s={s} x={cx - 30} y={cy - 8} w={60} h={16} gap={0}>
                <Lbl s={s} size={6.8} color={p.ink} weight="700" spacing={0.1}>
                  {GUIDE_ROOM_LABELS[r.kind]}
                </Lbl>
                <Lbl s={s} size={6.2} color={p.muted} weight="600">
                  {r.w.toFixed(1)} × {r.h.toFixed(1)}
                </Lbl>
              </Box>
            );
          })}

          <Box s={s} x={16} y={13} w={158} h={22} row gap={6}>
            <Icon s={s} size={13} color={p.brand} name="ruler" />
            <Lbl s={s} size={9.5} color={p.ink} weight="700">
              Plan coté
            </Lbl>
          </Box>

          <Box s={s} x={16} y={203} w={288} h={24} row gap={7}>
            <Icon s={s} size={12} color={p.indigo} name="building" />
            <Lbl s={s} size={8.5} color={p.muted} weight="600">
              Surface {PLAN.area.toFixed(0)} m² · cotes en mètres
            </Lbl>
          </Box>
        </>
      }
    >
      <Circle cx={286} cy={214} r={56} fill={p.indigoSoft} opacity={0.4} />
      <Circle cx={24} cy={42} r={52} fill={p.brandSoft} opacity={0.35} />

      {/* Pièces légèrement teintées : la cotation reste parfaitement lisible */}
      {PLAN.rooms.map((r) => (
        <Rect
          key={`f-${r.id}`}
          x={X(r.x)}
          y={Y(r.y)}
          width={r.w * f.scale}
          height={r.h * f.scale}
          fill={GUIDE_ROOM_COLORS[r.kind]}
          opacity={0.5}
        />
      ))}

      <PlanGeometry f={f} p={p} withOpenings={false} />

      {/* Lignes d'attache vers les cotes d'emprise (placées HORS du plan) */}
      <Line x1={X(0)} y1={bottom} x2={X(0)} y2={bottom + 24} stroke={p.line} strokeWidth={0.8} />
      <Line x1={right} y1={bottom} x2={right} y2={bottom + 24} stroke={p.line} strokeWidth={0.8} />
      <Line x1={right} y1={Y(0)} x2={right + 22} y2={Y(0)} stroke={p.line} strokeWidth={0.8} />
      <Line x1={right} y1={bottom} x2={right + 22} y2={bottom} stroke={p.line} strokeWidth={0.8} />

      {/* Emprise hors-tout */}
      <DimensionLine
        x1={X(0)}
        y1={bottom + 18}
        x2={right}
        y2={bottom + 18}
        label={`${PLAN.length.toFixed(2)} m`}
        p={p}
        s={s}
      />
      <DimensionLine
        x1={right + 10}
        y1={Y(0)}
        x2={right + 10}
        y2={bottom}
        label={`${PLAN.width.toFixed(2)} m`}
        p={p}
        s={s}
      />

      {/* Chaîne haute : largeur de chaque pièce en façade nord */}
      {topRooms.map((r) => {
        const a = X(r.x);
        const b = X(r.x + r.w);
        return (
          <DimensionLine
            key={`t-${r.id}`}
            x1={a}
            y1={chainTopY}
            x2={b}
            y2={chainTopY}
            label={b - a > 34 ? r.w.toFixed(1) : undefined}
            p={p}
            s={s}
          />
        );
      })}

      {/* Chaîne gauche : profondeur de chaque pièce en façade ouest */}
      {leftRooms.map((r) => {
        const a = Y(r.y);
        const b = Y(r.y + r.h);
        return (
          <DimensionLine
            key={`l-${r.id}`}
            x1={chainLeftX}
            y1={a}
            x2={chainLeftX}
            y2={b}
            label={b - a > 34 ? r.h.toFixed(1) : undefined}
            labelLeft
            p={p}
            s={s}
          />
        );
      })}
    </Scene>
  );
}

/* ------------------------------------------------------------------ */
/* Étape 2 — « Vue 3D » (extrusion isométrique du plan réel)            */
/* ------------------------------------------------------------------ */

const WALL_H = 2.6; // hauteur sous plafond (m) — même valeur que le moteur
const BOX_3D = { x: 40, y: 52, w: 240, h: 130 };
const MARGIN_3D = 1.8; // terrain autour de l'emprise (m)

function isoPoint(x: number, y: number, z: number): [number, number] {
  return [(x - y) * 0.866, (x + y) * 0.5 - z];
}

/** Éclaircit / assombrit une couleur hexadécimale (0 = noir, 1 = couleur). */
function shade(hex: string, factor: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

export function IllusPlan3D({ width, theme }: IllusProps) {
  const p = theme.dark ? DARK : LIGHT;
  const s = width / VIEW_W;

  // Boîte englobante projetée : terrain + volumes (z = 0 et z = WALL_H).
  const pts: [number, number][] = [];
  for (const [x, y] of [
    [-MARGIN_3D, -MARGIN_3D],
    [PLAN.length + MARGIN_3D, -MARGIN_3D],
    [PLAN.length + MARGIN_3D, PLAN.width + MARGIN_3D],
    [-MARGIN_3D, PLAN.width + MARGIN_3D],
  ] as const) {
    pts.push(isoPoint(x, y, 0));
  }
  for (const [x, y] of [
    [0, 0],
    [PLAN.length, 0],
    [PLAN.length, PLAN.width],
    [0, PLAN.width],
  ] as const) {
    pts.push(isoPoint(x, y, 0), isoPoint(x, y, WALL_H));
  }
  const f = fit(
    BOX_3D,
    Math.min(...pts.map((q) => q[0])),
    Math.min(...pts.map((q) => q[1])),
    Math.max(...pts.map((q) => q[0])),
    Math.max(...pts.map((q) => q[1])),
  );
  const P = (x: number, y: number, z: number): [number, number] => {
    const [px, py] = isoPoint(x, y, z);
    return [f.ox + px * f.scale, f.oy + py * f.scale];
  };
  const poly = (arr: [number, number][]) => arr.map(([x, y]) => `${x},${y}`).join(" ");

  // Du plus lointain au plus proche (peintre) : x + y croissant.
  const ordered = [...PLAN.rooms].sort((a, b) => a.x + a.y - (b.x + b.y));

  return (
    <Scene
      width={width}
      id="p3d"
      p={p}
      labels={
        <>
          <Box s={s} x={16} y={13} w={158} h={22} row gap={6}>
            <Icon s={s} size={13} color={p.brand} name="building" />
            <Lbl s={s} size={9.5} color={p.ink} weight="700">
              Vue 3D réelle
            </Lbl>
          </Box>

          <Box s={s} x={16} y={203} w={288} h={24} row gap={7}>
            <Icon s={s} size={12} color={p.brand} name="ruler" />
            <Lbl s={s} size={8.5} color={p.muted} weight="600">
              {PLAN.rooms.length} volumes · hauteur {WALL_H.toFixed(1)} m
            </Lbl>
          </Box>
        </>
      }
    >
      <Circle cx={286} cy={40} r={60} fill={p.blueSoft} opacity={0.4} />
      <Circle cx={24} cy={216} r={54} fill={p.brandSoft} opacity={0.4} />

      {/* Terrain */}
      <Polygon
        points={poly([
          P(-MARGIN_3D, -MARGIN_3D, 0),
          P(PLAN.length + MARGIN_3D, -MARGIN_3D, 0),
          P(PLAN.length + MARGIN_3D, PLAN.width + MARGIN_3D, 0),
          P(-MARGIN_3D, PLAN.width + MARGIN_3D, 0),
        ])}
        fill={p.panelAlt}
        stroke={p.line}
        strokeWidth={0.8}
      />

      {/* Volumes : faces sud et est, puis toit */}
      {ordered.map((r) => {
        const color = GUIDE_ROOM_COLORS[r.kind];
        const warm = r.kind === "sejour" || r.kind === "cuisine";
        const top: [number, number][] = [
          P(r.x, r.y, WALL_H),
          P(r.x + r.w, r.y, WALL_H),
          P(r.x + r.w, r.y + r.h, WALL_H),
          P(r.x, r.y + r.h, WALL_H),
        ];
        const south: [number, number][] = [
          P(r.x, r.y + r.h, 0),
          P(r.x + r.w, r.y + r.h, 0),
          P(r.x + r.w, r.y + r.h, WALL_H),
          P(r.x, r.y + r.h, WALL_H),
        ];
        const east: [number, number][] = [
          P(r.x + r.w, r.y, 0),
          P(r.x + r.w, r.y + r.h, 0),
          P(r.x + r.w, r.y + r.h, WALL_H),
          P(r.x + r.w, r.y, WALL_H),
        ];
        return (
          <React.Fragment key={r.id}>
            <Polygon
              points={poly(south)}
              fill={shade(color, warm ? 0.7 : 0.64)}
              stroke={p.ink}
              strokeWidth={0.5}
              opacity={0.96}
            />
            <Polygon
              points={poly(east)}
              fill={shade(color, 0.54)}
              stroke={p.ink}
              strokeWidth={0.5}
              opacity={0.96}
            />
            <Polygon
              points={poly(top)}
              fill={warm ? color : shade(color, 0.92)}
              stroke={p.ink}
              strokeWidth={0.6}
              opacity={0.98}
            />
          </React.Fragment>
        );
      })}
    </Scene>
  );
}

/* ------------------------------------------------------------------ */
/* Étape 2 — séquence automatique des trois vues                       */
/* ------------------------------------------------------------------ */

const PHASES = [
  { key: "plan2d", Cmp: IllusPlan2D },
  { key: "dims", Cmp: IllusPlanDimensions },
  { key: "3d", Cmp: IllusPlan3D },
] as const;

const PHASE_MS = 1400;

/**
 * Enchaîne automatiquement les trois vues du MÊME plan réel
 * (2D → coté → 3D), avec un fondu court et un repère de position.
 */
export function IllusPlanPreview({ width, theme }: IllusProps) {
  const p = theme.dark ? DARK : LIGHT;
  const s = width / VIEW_W;
  const [phase, setPhase] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const id = setInterval(() => setPhase((v) => (v + 1) % PHASES.length), PHASE_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fade.setValue(0);
    const anim = Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [phase, fade]);

  const Current = PHASES[phase].Cmp;

  return (
    <View style={{ width }}>
      <Animated.View style={{ opacity: fade }}>
        <Current width={width} theme={theme} />
      </Animated.View>

      {/* Indicateur de séquence : 3 barrettes (une par vue) — compact, jamais
          tronqué, aligné sur la ligne d'en-tête. */}
      <View
        style={[styles.sequence, { top: 20 * s, right: 16 * s, gap: 4 * s }]}
        pointerEvents="none"
      >
        {PHASES.map((ph, i) => (
          <View
            key={ph.key}
            style={{
              width: 16 * s,
              height: 3.5 * s,
              borderRadius: 2 * s,
              backgroundColor: i === phase ? p.brand : p.line,
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sequence: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
});
