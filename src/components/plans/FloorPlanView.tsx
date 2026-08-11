import { useMemo } from "react";
import type { GeneratedPlan, PlacedRoom } from "@/convex/planEngine";
import { roomColor } from "@/convex/planEngine";

// ============================================================================
// Rendu SVG d'un plan architectural — style « plan d'architecte » classique :
// fond blanc, murs extérieurs en double trait avec ouvertures (portes,
// fenêtres), cloisons fines, pièces teintées, cotes sur les 4 côtés, boussole.
// Le plan est rendu dans un repère métrique (1 unité = 1 mètre), puis mis à
// l'échelle par viewBox. Exportable tel quel en PNG/JPG/PDF haute résolution.
// ============================================================================

const WALL_OUTER = 0.06;  // trait extérieur du mur double (m)
const WALL_INNER = 0.055; // trait intérieur du mur double (m)
const WALL_GAP = 0.1;     // écart entre les deux traits du mur double (m)
const WALL_I = 0.08;      // épaisseur des cloisons intérieures (m)

// Encre du dessin (classique, noir bleuté)
const INK = "#1f2937";
const INK_SOFT = "#6b7280";
const LINE = "#d1d5db";
const ACCENT = "#0e7490";   // boussole / teinte technique
const GLASS = "#bae6fd";    // fenêtres

function roomCenter(r: PlacedRoom) {
  return { cx: r.x + r.w / 2, cy: r.y + r.h / 2 };
}

// ─── Abréviations des pièces ────────────────────────────────────────────────

function roomNumSuffix(name: string): string {
  const m = name.match(/(\d+)\s*$/);
  return m ? ` ${m[1]}` : "";
}

export function abbreviateRoomName(name: string, type: string): string {
  switch (type) {
    case "salon": return "S";
    case "salleAManger": return "SàM";
    case "cuisine": return "Cui";
    case "chambre": return `Ch${roomNumSuffix(name)}`;
    case "master": return "Ch. prin.";
    case "sdb": return `SDB${roomNumSuffix(name)}`;
    case "wc": return `WC${roomNumSuffix(name)}`;
    case "buanderie": return "Buan";
    case "dressing": return "Séch";
    case "bureau": return "Bur";
    case "localTechnique": return "Loc. tech";
    case "escalier": return "Esc";
    case "circulation": return "Circ";
    case "entree": return "Entrée";
    case "garage": return "Gar.";
    case "parking": return "Park.";
    case "terrasse": return "Ter.";
    case "balcon": return "Balc.";
    case "jardin": return "Jard.";
    case "piscine": return "Pisc.";
    default: return name;
  }
}

// ─── Cotes sur les 4 côtés ──────────────────────────────────────────────────

function Dimensions({ width, depth }: { width: number; depth: number }) {
  const m = 1.05;
  const tick = (x1: number, y1: number, x2: number, y2: number) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK_SOFT} strokeWidth={0.045} />
  );
  const label = (x: number, y: number, txt: string, rotate = 0) => (
    <text
      x={x} y={y} textAnchor="middle" fontSize={0.5} fill={INK} fontWeight={600}
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
      style={{ letterSpacing: "0.02em", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {txt}
    </text>
  );
  return (
    <g>
      {/* ── Cote bas ── */}
      <line x1={0} y1={depth + m * 0.45} x2={width} y2={depth + m * 0.45} stroke={INK_SOFT} strokeWidth={0.045} />
      {tick(0, depth + m * 0.15, 0, depth + m * 0.8)}
      {tick(width, depth + m * 0.15, width, depth + m * 0.8)}
      {label(width / 2, depth + m * 0.72, `${width.toFixed(2)} m`)}
      {/* ── Cote haut ── */}
      <line x1={0} y1={-m * 0.45} x2={width} y2={-m * 0.45} stroke={INK_SOFT} strokeWidth={0.045} />
      {tick(0, -m * 0.15, 0, -m * 0.8)}
      {tick(width, -m * 0.15, width, -m * 0.8)}
      {label(width / 2, -m * 0.72, `${width.toFixed(2)} m`)}
      {/* ── Cote droite ── */}
      <line x1={width + m * 0.45} y1={0} x2={width + m * 0.45} y2={depth} stroke={INK_SOFT} strokeWidth={0.045} />
      {tick(width + m * 0.15, 0, width + m * 0.8, 0)}
      {tick(width + m * 0.15, depth, width + m * 0.8, depth)}
      {label(width + m * 0.7, depth / 2, `${depth.toFixed(2)} m`, 90)}
      {/* ── Cote gauche ── */}
      <line x1={-m * 0.45} y1={0} x2={-m * 0.45} y2={depth} stroke={INK_SOFT} strokeWidth={0.045} />
      {tick(-m * 0.15, 0, -m * 0.8, 0)}
      {tick(-m * 0.15, depth, -m * 0.8, depth)}
      {label(-m * 0.7, depth / 2, `${depth.toFixed(2)} m`, 90)}
    </g>
  );
}

function NorthArrow({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={0.75} fill="#ffffff" fillOpacity={0.9} stroke={INK_SOFT} strokeWidth={0.06} />
      <polygon points="0,-0.52 0.26,0.22 0,0.06 -0.26,0.22" fill={ACCENT} />
      <text y={-0.95} textAnchor="middle" fontSize={0.4} fill={ACCENT} fontWeight={700}>N</text>
    </g>
  );
}

// ─── Escalier ───────────────────────────────────────────────────────────────

function StairBlock({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const steps = Math.max(3, Math.floor((w + h) / 0.6));
  const lines: number[] = [];
  for (let i = 1; i < steps; i++) lines.push(i / steps);
  const slim = w / h > 1.6;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#eef2ff" stroke="#4338ca" strokeWidth={0.07} rx={0.05} />
      {lines.map((t, i) => (
        <line
          key={i}
          x1={x + t * w} y1={y}
          x2={x + t * w - (h * 0.6) * (w / h)} y2={y + h}
          stroke="#6366f1" strokeWidth={0.05}
          style={{ display: slim ? undefined : "none" }}
        />
      ))}
      <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke="#4338ca" strokeWidth={0.05} />
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke="#4338ca" strokeWidth={0.05} />
      <text x={x + w / 2} y={y + h / 2 + 0.12} textAnchor="middle" fontSize={Math.min(w, h) * 0.42} fill="#3730a3" fontWeight={700}>
        Esc
      </text>
    </g>
  );
}

// ─── Pièce (teinte douce + étiquette) ───────────────────────────────────────

function RoomBlock({ room, isUpper, compact }: { room: PlacedRoom; isUpper?: boolean; compact?: boolean }) {
  const { cx, cy } = roomCenter(room);
  const base = roomColor(room.type);
  const fill = `${base}7a`;
  const label = abbreviateRoomName(room.name, room.type);
  const fontSize = compact
    ? Math.min(0.95, Math.max(0.4, Math.min(room.w, room.h) * 0.36))
    : Math.max(0.3, Math.min(room.w, room.h) * 0.32);
  return (
    <g>
      <rect
        x={room.x} y={room.y} width={room.w} height={room.h}
        fill={fill}
        stroke={INK}
        strokeWidth={room.exterior ? 0.05 : WALL_I}
        rx={0.04}
      />
      {room.exterior && (
        <rect
          x={room.x + 0.09} y={room.y + 0.09} width={room.w - 0.18} height={room.h - 0.18}
          fill="none" stroke="#94a3b8" strokeWidth={0.04} strokeDasharray="0.26 0.16"
        />
      )}
      <text
        x={cx} y={cy - (room.h >= 1.6 ? 0.08 : 0)}
        textAnchor="middle"
        fontSize={fontSize}
        fill={INK}
        fontWeight={700}
        style={{ pointerEvents: "none", letterSpacing: "0.015em" }}
      >
        {label}
      </text>
      {room.h >= 1.8 && (
        <text
          x={cx} y={cy + fontSize + 0.14}
          textAnchor="middle"
          fontSize={fontSize * 0.8}
          fill={INK_SOFT}
          fontWeight={600}
          style={{ pointerEvents: "none" }}
        >
          {room.area.toFixed(1)} m²
        </text>
      )}
      {isUpper && (
        <text x={room.x + 0.16} y={room.y + 0.4} fontSize={compact ? 0.42 : 0.32} fill="#6d28d9" fontWeight={700}>▲</text>
      )}
    </g>
  );
}

// ─── Porte (ouverture dans le mur + battant + arc) ─────────────────────────

function DoorBlock({ x, y, w, h, angle, exterior }: { x: number; y: number; w: number; h: number; angle: number; exterior: boolean }) {
  const pivot = { x, y };
  const arcStart = { x: x + w, y };
  const arcEnd = { x, y: y + h };
  return (
    <g>
      {/* Ouverture (découpe du mur) */}
      <rect x={x} y={y} width={w} height={h} fill="#ffffff" stroke="none" />
      {/* Battant */}
      <line x1={pivot.x} y1={pivot.y} x2={arcStart.x} y2={arcStart.y} stroke={INK} strokeWidth={0.07} />
      {/* Arc d'ouverture */}
      <path
        d={`M ${arcStart.x} ${arcStart.y} A ${w} ${h} 0 0 1 ${arcEnd.x} ${arcEnd.y}`}
        fill="none" stroke={exterior ? ACCENT : "#94a3b8"} strokeWidth={0.05}
      />
      {/* Ligne de fermeture */}
      <line x1={pivot.x} y1={pivot.y} x2={arcEnd.x} y2={arcEnd.y} stroke="#9ca3af" strokeWidth={0.04} />
      {exterior && <circle cx={pivot.x} cy={pivot.y} r={0.07} fill={ACCENT} />}
    </g>
  );
}

// ─── Fenêtre (double trait dans le mur) ─────────────────────────────────────
// La fenêtre est centrée sur le mur (bande d'épaisseur 0.16 m) et s'étend sur
// `w` mètres le long du mur. `vertical` = fenêtre sur un mur est/ouest.

function WindowBlock({ x, y, w, vertical }: { x: number; y: number; w: number; vertical: boolean }) {
  const thick = 0.16; // épaisseur de la baie (perpendiculaire au mur)
  const t = 0.05;
  return (
    <g>
      {/* Découpe blanche dans le mur */}
      <rect x={x} y={y} width={vertical ? thick : w} height={vertical ? w : thick} fill="#ffffff" stroke="none" />
      {vertical ? (
        <>
          <line x1={x + t} y1={y + 0.03} x2={x + t} y2={y + w - 0.03} stroke={ACCENT} strokeWidth={0.045} />
          <line x1={x + thick - t} y1={y + 0.03} x2={x + thick - t} y2={y + w - 0.03} stroke={ACCENT} strokeWidth={0.045} />
          <line x1={x + thick / 2} y1={y + 0.04} x2={x + thick / 2} y2={y + w - 0.04} stroke={GLASS} strokeWidth={0.06} />
        </>
      ) : (
        <>
          <line x1={x + 0.03} y1={y + t} x2={x + w - 0.03} y2={y + t} stroke={ACCENT} strokeWidth={0.045} />
          <line x1={x + 0.03} y1={y + thick - t} x2={x + w - 0.03} y2={y + thick - t} stroke={ACCENT} strokeWidth={0.045} />
          <line x1={x + 0.04} y1={y + thick / 2} x2={x + w - 0.04} y2={y + thick / 2} stroke={GLASS} strokeWidth={0.06} />
        </>
      )}
    </g>
  );
}

// ─── Murs extérieurs en double trait, coupés par les ouvertures ─────────────

function ExteriorWalls({ width, depth, doors, windows }: {
  width: number; depth: number;
  doors: GeneratedPlan["doors"]; windows: GeneratedPlan["windows"];
}) {
  // Ouvertures par côté (intervalles le long du mur)
  const cut = 0.08; // marge de découpe autour de chaque ouverture
  const openings = {
    top: [] as [number, number][],
    bottom: [] as [number, number][],
    left: [] as [number, number][],
    right: [] as [number, number][],
  };
  for (const wn of windows) {
    const span: [number, number] = wn.vertical
      ? [wn.y - cut, wn.y + wn.w + cut]
      : [wn.x - cut, wn.x + wn.w + cut];
    // vertical → mur est/ouest ; sinon → mur nord/sud
    if (wn.vertical) {
      if (wn.x < -0.1) openings.left.push(span);
      else openings.right.push(span);
    } else {
      if (wn.y < -0.1) openings.top.push(span);
      else openings.bottom.push(span);
    }
  }
  for (const d of doors) {
    if (!d.exterior) continue;
    // Porte extérieure sur le pourtour
    if (Math.abs(d.y) < 0.4) openings.top.push([d.x - cut, d.x + d.w + cut]);
    else if (Math.abs(d.y + d.h - depth) < 0.4) openings.bottom.push([d.x - cut, d.x + d.w + cut]);
    else if (Math.abs(d.x) < 0.4) openings.left.push([d.y - cut, d.y + d.h + cut]);
    else openings.right.push([d.y - cut, d.y + d.h + cut]);
  }

  const segments = (len: number, spans: [number, number][]): [number, number][] => {
    const sorted = [...spans].sort((a, b) => a[0] - b[0]);
    const segs: [number, number][] = [];
    let cursor = 0;
    for (const [a, b] of sorted) {
      const s = Math.max(0, Math.min(len, a));
      const e = Math.max(0, Math.min(len, b));
      if (s > cursor) segs.push([cursor, s]);
      cursor = Math.max(cursor, e);
    }
    if (cursor < len) segs.push([cursor, len]);
    return segs.filter(([a, b]) => b - a > 0.02);
  };

  const topSegs = segments(width, openings.top);
  const bottomSegs = segments(width, openings.bottom);
  const leftSegs = segments(depth, openings.left);
  const rightSegs = segments(depth, openings.right);

  // Trait extérieur + trait intérieur du mur double
  const double = (s: number, e: number, along: "x" | "y", at: number, gapDir: 1 | -1, outer: boolean) => {
    const g = outer ? 0 : gapDir * WALL_GAP;
    if (along === "x") {
      return (
        <g key={`${at}-${outer}-${s}-${e}`}>
          <line x1={s} y1={at + g} x2={e} y2={at + g} stroke={INK} strokeWidth={outer ? WALL_OUTER : WALL_INNER} />
        </g>
      );
    }
    return (
      <g key={`${at}-${outer}-${s}-${e}`}>
        <line x1={at + g} y1={s} x2={at + g} y2={e} stroke={INK} strokeWidth={outer ? WALL_OUTER : WALL_INNER} />
      </g>
    );
  };

  return (
    <g>
      {/* Haut */}
      {topSegs.map(([s, e]) => (
        <g key={`t-${s}-${e}`}>
          {double(s, e, "x", 0, 1, true)}
          {double(s, e, "x", 0, 1, false)}
        </g>
      ))}
      {/* Bas */}
      {bottomSegs.map(([s, e]) => (
        <g key={`b-${s}-${e}`}>
          {double(s, e, "x", depth, -1, true)}
          {double(s, e, "x", depth, -1, false)}
        </g>
      ))}
      {/* Gauche */}
      {leftSegs.map(([s, e]) => (
        <g key={`l-${s}-${e}`}>
          {double(s, e, "y", 0, 1, true)}
          {double(s, e, "y", 0, 1, false)}
        </g>
      ))}
      {/* Droite */}
      {rightSegs.map(([s, e]) => (
        <g key={`r-${s}-${e}`}>
          {double(s, e, "y", width, -1, true)}
          {double(s, e, "y", width, -1, false)}
        </g>
      ))}
    </g>
  );
}

// ─── Vue 2D complète ────────────────────────────────────────────────────────

export interface FloorPlanViewProps {
  plan: GeneratedPlan;
  showDimensions?: boolean;
  showNorth?: boolean;
  compact?: boolean;      // masque cartouche et libellés lourds
  whiteBg?: boolean;      // fond blanc (exports)
  fit?: boolean;          // remplit le conteneur (h-full) sans rogner le plan
}

export function FloorPlan2D({ plan, showDimensions = true, showNorth = true, compact = false, whiteBg = false, fit = false }: FloorPlanViewProps) {
  const maxW = plan.rooms.reduce((m, r) => Math.max(m, r.x + r.w), plan.width);
  const maxD = plan.rooms.reduce((m, r) => Math.max(m, r.y + r.h), plan.depth);

  const windows = plan.windows ?? [];
  const doors = plan.doors ?? [];

  // En compact : cadre resserré → le plan occupe presque tout le SVG (plus grand, plus net).
  const viewBox = compact
    ? `${-0.5} ${-0.5} ${maxW + 1.3} ${maxD + 1.3}`
    : `${-1.9} ${-1.9} ${maxW + 5.6} ${maxD + 5.4}`;

  return (
    <svg
      viewBox={viewBox}
      className={fit ? "w-full h-full" : "w-full h-auto"}
      preserveAspectRatio="xMidYMid meet"
      style={{ background: whiteBg ? "#ffffff" : "transparent", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
      role="img"
      aria-label={`Plan architectural ${plan.name}`}
    >
      <defs>
        {/* Quadrillage fin « papier millimétré » (exports / fiche) */}
        <pattern id={`grid-${plan.index}`} width="0.5" height="0.5" patternUnits="userSpaceOnUse">
          <path d="M 0.5 0 L 0 0 0 0.5" fill="none" stroke="#f1f5f9" strokeWidth="0.04" />
        </pattern>
      </defs>

      {whiteBg && (
        <rect x={-0.2} y={-0.2} width={maxW + 0.4} height={maxD + 0.4} fill={`url(#grid-${plan.index})`} />
      )}

      {/* Extérieurs (jardin, terrasse…) */}
      {plan.rooms.filter((r) => r.exterior).map((r) => (
        <g key={r.id}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={`${roomColor(r.type)}2e`} stroke="#94a3b8" strokeWidth={0.07} strokeDasharray="0.3 0.2" rx={0.04} />
          <text x={r.x + r.w / 2} y={r.y + r.h / 2} textAnchor="middle" fontSize={compact ? 0.5 : 0.4} fill="#57534e" fontWeight={600} style={{ pointerEvents: "none", letterSpacing: "0.02em" }}>
            {abbreviateRoomName(r.name, r.type)}
          </text>
          <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 0.48} textAnchor="middle" fontSize={compact ? 0.42 : 0.34} fill="#78716c" style={{ pointerEvents: "none" }}>
            {r.area.toFixed(1)} m²
          </text>
        </g>
      ))}

      {/* Sol des pièces + cloisons */}
      {plan.rooms.filter((r) => !r.exterior).map((r) => (
        <RoomBlock key={r.id} room={r} isUpper={r.level > 0} compact={compact} />
      ))}

      {/* Escaliers */}
      {plan.stairs.map((s, i) => (
        <StairBlock key={i} x={s.x} y={s.y} w={s.w} h={s.h} />
      ))}

      {/* Murs extérieurs (double trait avec ouvertures) */}
      <ExteriorWalls width={plan.width} depth={plan.depth} doors={doors} windows={windows} />

      {/* Fenêtres — recentrées sur le mur correspondant */}
      {windows.map((wn) => {
        const pos = { x: wn.x, y: wn.y };
        if (wn.vertical) {
          // mur ouest / est
          pos.x = wn.x < 0 ? -0.05 : plan.width - 0.11;
        } else {
          // mur nord / sud
          pos.y = wn.y < 0 ? -0.05 : plan.depth - 0.11;
        }
        return <WindowBlock key={wn.id} x={pos.x} y={pos.y} w={wn.w} vertical={wn.vertical} />;
      })}

      {/* Portes */}
      {doors.map((d) => (
        <DoorBlock key={d.id} x={d.x} y={d.y} w={d.w} h={d.h} angle={d.angle} exterior={d.exterior} />
      ))}

      {/* Dimensions */}
      {showDimensions && <Dimensions width={plan.width} depth={plan.depth} />}

      {/* Boussole */}
      {showNorth && <NorthArrow x={plan.width - 1.1} y={plan.depth - 1.1} />}

      {/* Cartouche (non compact) */}
      {!compact && (
        <g>
          <rect x={maxW - 9.2} y={maxD + 1.9} width={9.6} height={2} fill="#f8fafc" stroke={LINE} strokeWidth={0.05} rx={0.1} />
          <text x={maxW - 8.7} y={maxD + 2.45} fontSize={0.48} fill={INK} fontWeight={800} style={{ letterSpacing: "0.01em" }}>
            Plan {String(plan.index).padStart(2, "0")} — {plan.name}
          </text>
          <text x={maxW - 8.7} y={maxD + 2.9} fontSize={0.38} fill={INK_SOFT}>
            Surface construite {plan.stats.construite.toFixed(0)} m² · {plan.levels} niveau{plan.levels > 1 ? "x" : ""} · Échelle 1:100
          </text>
          <text x={maxW - 8.7} y={maxD + 3.3} fontSize={0.34} fill="#94a3b8">
            Plan généré automatiquement par IA — document non contractuel, à valider par un architecte.
          </text>
        </g>
      )}
    </svg>
  );
}

// ============================================================================
// Vue 3D isométrique (extrusion simple des pièces)
// ============================================================================

function isoProject(x: number, y: number, z: number, ox: number, oy: number, scale: number) {
  // Projection isométrique standard : X → droite/bas, Y → gauche/bas, Z → haut
  const px = ox + (x - y) * scale * Math.cos(Math.PI / 6);
  const py = oy + (x + y) * scale * Math.sin(Math.PI / 6) - z * scale;
  return { px, py };
}

function isoPoly(pts: { x: number; y: number; z: number }[], ox: number, oy: number, scale: number): string {
  return pts
    .map((p) => {
      const { px, py } = isoProject(p.x, p.y, p.z, ox, oy, scale);
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");
}

export function FloorPlan3D({ plan }: { plan: GeneratedPlan }) {
  const wallH = plan.scores && plan.scores.global > 80 ? 3.1 : 2.9;
  const margin = 2;
  const maxW = plan.rooms.reduce((m, r) => Math.max(m, r.x + r.w), plan.width);
  const maxD = plan.rooms.reduce((m, r) => Math.max(m, r.y + r.h), plan.depth);
  const scale = 30;
  const ox = margin + (maxD - maxW) * scale * Math.cos(Math.PI / 6);
  const oy = margin + (maxD + maxW) * scale * Math.sin(Math.PI / 6) - wallH * scale * 0.9;

  const interior = plan.rooms.filter((r) => !r.exterior && r.level === 0);
  // Tri par profondeur (peintre) : dessin des pièces éloignées en premier
  const sorted = [...interior].sort((a, b) => (a.x + a.y) - (b.x + b.y));

  return (
    <svg
      viewBox={`0 0 ${margin * 2 + (maxW + maxD) * scale * Math.cos(Math.PI / 6) * 1.6} ${margin * 2 + (maxW + maxD) * scale * 0.62 + wallH * scale}`}
      className="w-full h-auto"
      style={{ background: "transparent", fontFamily: "'Inter', sans-serif" }}
      role="img"
      aria-label={`Vue 3D du plan ${plan.name}`}
    >
      {/* Base / sol */}
      <polygon
        points={isoPoly(
          [
            { x: 0, y: 0, z: 0 },
            { x: maxW, y: 0, z: 0 },
            { x: maxW, y: maxD, z: 0 },
            { x: 0, y: maxD, z: 0 },
          ],
          ox, oy, scale,
        )}
        fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={1}
      />

      {/* Pièces : faces avant + gauche + toit */}
      {sorted.map((r) => {
        const col = roomColor(r.type);
        const pts = [
          { x: r.x, y: r.y, z: 0 },
          { x: r.x + r.w, y: r.y, z: 0 },
          { x: r.x + r.w, y: r.y + r.h, z: 0 },
          { x: r.x, y: r.y + r.h, z: 0 },
        ];
        const roof = pts.map((p) => ({ ...p, z: wallH }));
        return (
          <g key={r.id}>
            {/* Face avant (sud-est) */}
            <polygon
              points={isoPoly([pts[2], pts[3], roof[3], roof[2]], ox, oy, scale)}
              fill={col} stroke="#94a3b8" strokeWidth={0.8}
            />
            {/* Face gauche (sud-ouest) */}
            <polygon
              points={isoPoly([pts[3], pts[0], roof[0], roof[3]], ox, oy, scale)}
              fill="#00000014" stroke="#94a3b8" strokeWidth={0.8}
            />
            {/* Toit */}
            <polygon
              points={isoPoly([roof[0], roof[1], roof[2], roof[3]], ox, oy, scale)}
              fill="#ffffffd9" stroke="#94a3b8" strokeWidth={0.8}
            />
          </g>
        );
      })}

      {/* Étiquette au-dessus de chaque pièce */}
      {sorted.map((r) => {
        const c = { x: r.x + r.w / 2, y: r.y + r.h / 2, z: wallH + 0.3 };
        const { px, py } = isoProject(c.x, c.y, c.z, ox, oy, scale);
        return (
          <g key={`lbl-${r.id}`}>
            <text x={px} y={py} textAnchor="middle" fontSize={9} fill="#0f172a" fontWeight={700} style={{ letterSpacing: "0.02em" }}>
              {abbreviateRoomName(r.name, r.type)}
            </text>
            <text x={px} y={py + 11} textAnchor="middle" fontSize={8} fill="#64748b">
              {r.area.toFixed(1)} m²
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================================
// Sélecteur 2D / 3D
// ============================================================================

export function FloorPlanView({
  plan,
  mode = "2d",
  showDimensions = true,
  whiteBg = false,
  compact = false,
}: {
  plan: GeneratedPlan;
  mode?: "2d" | "3d";
  showDimensions?: boolean;
  whiteBg?: boolean;
  compact?: boolean;
}) {
  const view = useMemo(
    () => (mode === "3d" ? <FloorPlan3D plan={plan} /> : <FloorPlan2D plan={plan} showDimensions={showDimensions} whiteBg={whiteBg} compact={compact} />),
    [plan, mode, showDimensions, whiteBg, compact],
  );
  return view;
}
