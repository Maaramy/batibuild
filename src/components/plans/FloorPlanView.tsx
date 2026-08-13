import { useMemo } from "react";
import type { GeneratedPlan, PlacedRoom, FurnitureItem } from "@/convex/planEngine";
import { roomColor } from "@/convex/planEngine";

// ============================================================================
// Rendu SVG d'un plan architectural — style « plan d'architecte » classique :
// fond blanc, murs extérieurs en double trait avec ouvertures (portes,
// fenêtres), cloisons fines, pièces teintées, MOBILIER & équipements dessinés,
// cotes extérieures + dimensions intérieures, boussole, cartouche.
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

// Couleurs du mobilier (professionnel, discret)
const F_STROKE = "#64748b";
const F_FILL = "#f1f5f9";

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

function Dimensions({ width, depth, compact = false }: { width: number; depth: number; compact?: boolean }) {
  const m = compact ? 0.55 : 1.05;
  const fs = compact ? 0.28 : 0.4;
  const tick = (x1: number, y1: number, x2: number, y2: number) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK_SOFT} strokeWidth={0.045} />
  );
  const label = (x: number, y: number, txt: string, rotate = 0) => (
    <text
      x={x} y={y} textAnchor="middle" fontSize={fs} fill={INK} fontWeight={600}
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
      <text x={x + w / 2} y={y + h / 2 + 0.12} textAnchor="middle" fontSize={Math.min(w, h) * 0.36} fill="#3730a3" fontWeight={700}>
        Esc
      </text>
    </g>
  );
}

// ─── Pièce (teinte douce + étiquette + dimensions intérieures) ──────────────

function RoomBlock({ room, isUpper, compact }: { room: PlacedRoom; isUpper?: boolean; compact?: boolean }) {
  const { cx, cy } = roomCenter(room);
  const base = roomColor(room.type);
  const fill = `${base}7a`;
  const label = abbreviateRoomName(room.name, room.type);
  const fontSize = compact
    ? Math.min(0.8, Math.max(0.34, Math.min(room.w, room.h) * 0.3))
    : Math.max(0.24, Math.min(room.w, room.h) * 0.26);
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
          fontSize={fontSize * 0.72}
          fill={INK_SOFT}
          fontWeight={600}
          style={{ pointerEvents: "none" }}
        >
          {room.area.toFixed(1)} m²
        </text>
      )}
      {!compact && room.h >= 2.4 && (
        <text
          x={cx} y={cy + fontSize * 2 + 0.28}
          textAnchor="middle"
          fontSize={Math.max(0.2, fontSize * 0.52)}
          fill={INK_SOFT}
          style={{ pointerEvents: "none", fontVariantNumeric: "tabular-nums" }}
        >
          {room.w.toFixed(2)} × {room.h.toFixed(2)}
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

// ─── Libellés de cotes : largeurs des portes et des fenêtres ───────────────

function DoorWindowLabels({ plan }: { plan: GeneratedPlan }) {
  const { width, depth } = plan;
  const fs = 0.24;
  const labels: { x: number; y: number; txt: string; rotate?: number }[] = [];
  for (const d of plan.doors ?? []) {
    const onTop = Math.abs(d.y) < 0.4;
    const onBottom = Math.abs(d.y + d.h - depth) < 0.4;
    const onLeft = Math.abs(d.x) < 0.4;
    if (onTop) labels.push({ x: d.x + d.w / 2, y: d.y + 0.6, txt: `${d.w.toFixed(2)} m` });
    else if (onBottom) labels.push({ x: d.x + d.w / 2, y: d.y - 0.32, txt: `${d.w.toFixed(2)} m` });
    else if (onLeft) labels.push({ x: d.x + 0.62, y: d.y + d.h / 2 + 0.09, txt: `${d.h.toFixed(2)} m` });
    else labels.push({ x: d.x - 0.32, y: d.y + d.h / 2 + 0.09, txt: `${d.h.toFixed(2)} m` });
  }
  for (const wn of plan.windows ?? []) {
    if (wn.vertical) {
      if (wn.x < 0.1) labels.push({ x: wn.x + 0.62, y: wn.y + wn.w / 2 + 0.09, txt: `${wn.w.toFixed(2)} m` });
      else labels.push({ x: wn.x - 0.32, y: wn.y + wn.w / 2 + 0.09, txt: `${wn.w.toFixed(2)} m` });
    } else {
      if (wn.y < 0.1) labels.push({ x: wn.x + wn.w / 2, y: wn.y + 0.62, txt: `${wn.w.toFixed(2)} m` });
      else labels.push({ x: wn.x + wn.w / 2, y: wn.y - 0.32, txt: `${wn.w.toFixed(2)} m` });
    }
  }
  return (
    <g>
      {labels.map((l, i) => (
        <text
          key={i}
          x={l.x} y={l.y}
          textAnchor="middle"
          fontSize={fs}
          fill={INK_SOFT}
          fontWeight={600}
          style={{ pointerEvents: "none", fontVariantNumeric: "tabular-nums" }}
        >
          {l.txt}
        </text>
      ))}
    </g>
  );
}

// ─── Murs extérieurs en double trait, coupés par les ouvertures ─────────────

function ExteriorWalls({ width, depth, doors, windows }: {
  width: number; depth: number;
  doors: GeneratedPlan["doors"]; windows: GeneratedPlan["windows"];
}) {
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

// ============================================================================
// MOBILIER & ÉQUIPEMENTS — symboles 2D professionnels
// ============================================================================

function FurnitureSymbol({ f }: { f: FurnitureItem }) {
  const { x, y, w, h, angle } = f;
  const cx = x + w / 2, cy = y + h / 2;
  const st = 0.04;
  const th = st * 0.75;
  const deg = ((angle * 180) / Math.PI).toFixed(1);
  const rot = `rotate(${deg} ${cx.toFixed(3)} ${cy.toFixed(3)})`;
  const rect = (ox: number, oy: number, ww: number, hh: number, extra: React.SVGProps<SVGRectElement> = {}) => (
    <rect x={ox} y={oy} width={ww} height={hh} fill={F_FILL} stroke={F_STROKE} strokeWidth={st} rx={0.06} {...extra} />
  );

  let body: React.ReactNode = null;
  switch (f.kind) {
    case "lit":
      body = (
        <g>
          {rect(x, y, w, h, { rx: 0.16 })}
          <rect x={x + 0.1} y={y + 0.08} width={Math.min(0.55, w * 0.28)} height={h - 0.16} rx={0.1} fill="#e2e8f0" stroke={F_STROKE} strokeWidth={th} />
          <rect x={x + 0.1 + Math.min(0.55, w * 0.28) + 0.05} y={y + 0.08} width={Math.min(0.55, w * 0.28)} height={h - 0.16} rx={0.1} fill="#e2e8f0" stroke={F_STROKE} strokeWidth={th} />
          <line x1={x + 0.08} y1={y + h * 0.66} x2={x + w - 0.08} y2={y + h * 0.66} stroke={F_STROKE} strokeWidth={th} />
        </g>
      );
      break;
    case "table_chevet":
      body = <g>{rect(x, y, w, h)}<rect x={x + 0.09} y={y + 0.09} width={w - 0.18} height={h - 0.18} fill="none" stroke={F_STROKE} strokeWidth={th} rx={0.04} /></g>;
      break;
    case "armoire":
    case "penderie":
      body = (
        <g>
          {rect(x, y, w, h)}
          <line x1={x + w / 2} y1={y + 0.07} x2={x + w / 2} y2={y + h - 0.07} stroke={F_STROKE} strokeWidth={th} />
          {f.kind === "penderie" && <circle cx={x + w * 0.25} cy={y + h * 0.3} r={0.07} fill="none" stroke={F_STROKE} strokeWidth={th} />}
          {f.kind === "penderie" && <circle cx={x + w * 0.5} cy={y + h * 0.3} r={0.07} fill="none" stroke={F_STROKE} strokeWidth={th} />}
        </g>
      );
      break;
    case "etageres":
      body = (
        <g>
          {rect(x, y, w, h)}
          <line x1={x + 0.06} y1={y + h / 3} x2={x + w - 0.06} y2={y + h / 3} stroke={F_STROKE} strokeWidth={th} />
          <line x1={x + 0.06} y1={y + (2 * h) / 3} x2={x + w - 0.06} y2={y + (2 * h) / 3} stroke={F_STROKE} strokeWidth={th} />
        </g>
      );
      break;
    case "plan_travail":
      body = (
        <g>
          {rect(x, y, w, h, { fill: "#f8fafc" })}
          <line x1={x} y1={y + h} x2={x + w} y2={y} stroke={F_STROKE} strokeWidth={th} />
          <line x1={x + w * 0.25} y1={y + h} x2={x + w * 0.75} y2={y} stroke={F_STROKE} strokeWidth={th} />
        </g>
      );
      break;
    case "evier":
      body = <g>{rect(x, y, w, h)}<circle cx={cx} cy={cy} r={Math.min(w, h) * 0.28} fill="#e0f2fe" stroke={F_STROKE} strokeWidth={th} /></g>;
      break;
    case "plaque":
      body = (
        <g>
          {rect(x, y, w, h)}
          {[[0.28, 0.3], [0.72, 0.3], [0.28, 0.7], [0.72, 0.7]].map(([fx, fy], i) => (
            <circle key={i} cx={x + w * fx} cy={y + h * fy} r={0.07} fill="none" stroke={F_STROKE} strokeWidth={th} />
          ))}
        </g>
      );
      break;
    case "four":
      body = (
        <g>
          {rect(x, y, w, h)}
          <rect x={x + 0.08} y={y + 0.12} width={w - 0.16} height={h * 0.55} fill="none" stroke={F_STROKE} strokeWidth={th} />
          <line x1={x + w * 0.5} y1={y + 0.78 * h} x2={x + w * 0.62} y2={y + 0.78 * h} stroke={F_STROKE} strokeWidth={th} />
        </g>
      );
      break;
    case "frigo":
      body = (
        <g>
          {rect(x, y, w, h)}
          <line x1={x + w * 0.5} y1={y + 0.05} x2={x + w * 0.5} y2={y + h * 0.5} stroke={F_STROKE} strokeWidth={th} />
          <line x1={x + w * 0.3} y1={y + h * 0.62} x2={x + w * 0.3} y2={y + h * 0.86} stroke={F_STROKE} strokeWidth={th} />
        </g>
      );
      break;
    case "ilot":
      body = <g>{rect(x, y, w, h)}<rect x={x + 0.1} y={y + 0.1} width={w - 0.2} height={h - 0.2} fill="none" stroke={F_STROKE} strokeWidth={th} strokeDasharray="0.12 0.08" /></g>;
      break;
    case "douche":
      body = (
        <g>
          {rect(x, y, w, h)}
          <line x1={x} y1={y + h} x2={x + w} y2={y} stroke={F_STROKE} strokeWidth={th} />
          <circle cx={cx} cy={cy} r={0.12} fill="#e0f2fe" stroke={F_STROKE} strokeWidth={th} />
        </g>
      );
      break;
    case "baignoire":
      body = (
        <g>
          {rect(x, y, w, h, { rx: 0.3 })}
          <rect x={x + 0.1} y={y + 0.08} width={w - 0.2} height={h - 0.16} rx={0.22} fill="none" stroke={F_STROKE} strokeWidth={th} />
        </g>
      );
      break;
    case "lavabo":
      body = <g>{rect(x, y, w, h, { rx: 0.3 })}<rect x={x + 0.1} y={y + 0.12} width={w - 0.2} height={h - 0.24} rx={0.18} fill="#e0f2fe" stroke={F_STROKE} strokeWidth={th} /></g>;
      break;
    case "wc":
      body = (
        <g>
          <rect x={x + w * 0.12} y={y} width={w * 0.76} height={h * 0.24} fill={F_FILL} stroke={F_STROKE} strokeWidth={st} rx={0.04} />
          <rect x={x + w * 0.18} y={y + h * 0.24} width={w * 0.64} height={h * 0.7} fill="#e0f2fe" stroke={F_STROKE} strokeWidth={th} rx={0.16} />
        </g>
      );
      break;
    case "miroir":
      body = <g><rect x={x} y={y} width={w} height={h} fill="#e0f2fe" stroke={F_STROKE} strokeWidth={th} rx={0.05} /><line x1={x + 0.06} y1={y + h - 0.06} x2={x + w - 0.06} y2={y + 0.06} stroke={F_STROKE} strokeWidth={th * 0.7} /></g>;
      break;
    case "canape":
      body = (
        <g>
          {rect(x, y, w, h, { rx: 0.12 })}
          <line x1={x + 0.06} y1={y + h * 0.28} x2={x + w - 0.06} y2={y + h * 0.28} stroke={F_STROKE} strokeWidth={th * 1.3} />
          <rect x={x + 0.04} y={y + h * 0.28} width={0.18} height={h * 0.7} rx={0.05} fill="none" stroke={F_STROKE} strokeWidth={th} />
          <rect x={x + w - 0.22} y={y + h * 0.28} width={0.18} height={h * 0.7} rx={0.05} fill="none" stroke={F_STROKE} strokeWidth={th} />
        </g>
      );
      break;
    case "fauteuil":
      body = (
        <g>
          {rect(x, y, w, h, { rx: 0.1 })}
          <line x1={x + 0.06} y1={y + h * 0.3} x2={x + w - 0.06} y2={y + h * 0.3} stroke={F_STROKE} strokeWidth={th * 1.3} />
        </g>
      );
      break;
    case "table_basse":
      body = <g>{rect(x, y, w, h)}<rect x={x + 0.1} y={y + 0.1} width={w - 0.2} height={h - 0.2} fill="none" stroke={F_STROKE} strokeWidth={th} /></g>;
      break;
    case "meuble_tv":
      body = (
        <g>
          {rect(x, y, w, h, { fill: "#f8fafc" })}
          <line x1={x + w * 0.18} y1={y + h * 0.28} x2={x + w * 0.82} y2={y + h * 0.28} stroke={F_STROKE} strokeWidth={th * 1.4} />
        </g>
      );
      break;
    case "table":
      body = <g>{rect(x, y, w, h)}<rect x={x + 0.1} y={y + 0.1} width={w - 0.2} height={h - 0.2} fill="none" stroke={F_STROKE} strokeWidth={th} /></g>;
      break;
    case "chaise":
      body = (
        <g>
          {rect(x, y, w, h, { rx: 0.08 })}
          <line x1={x + 0.05} y1={y + h * 0.28} x2={x + w - 0.05} y2={y + h * 0.28} stroke={F_STROKE} strokeWidth={th * 1.3} />
        </g>
      );
      break;
    case "bureau":
      body = (
        <g>
          {rect(x, y, w, h)}
          <rect x={x + 0.08} y={y + 0.1} width={w - 0.16} height={h * 0.28} fill="none" stroke={F_STROKE} strokeWidth={th} />
        </g>
      );
      break;
    case "bibliotheque":
      body = (
        <g>
          {rect(x, y, w, h)}
          <line x1={x + 0.06} y1={y + h / 3} x2={x + w - 0.06} y2={y + h / 3} stroke={F_STROKE} strokeWidth={th} />
          <line x1={x + 0.06} y1={y + (2 * h) / 3} x2={x + w - 0.06} y2={y + (2 * h) / 3} stroke={F_STROKE} strokeWidth={th} />
        </g>
      );
      break;
    case "machine_laver":
    case "seche_linge":
      body = <g>{rect(x, y, w, h)}<circle cx={cx} cy={cy} r={Math.min(w, h) * 0.3} fill="none" stroke={F_STROKE} strokeWidth={th * 1.2} /></g>;
      break;
    case "voiture":
      body = (
        <g>
          {rect(x, y, w, h, { rx: 0.28, fill: "#e2e8f0" })}
          <line x1={x + w * 0.3} y1={y + 0.1} x2={x + w * 0.52} y2={y + 0.1} stroke={F_STROKE} strokeWidth={th * 1.4} />
          <rect x={x + w * 0.16} y={y + h * 0.34} width={w * 0.2} height={h * 0.32} rx={0.04} fill="none" stroke={F_STROKE} strokeWidth={th} />
          <rect x={x + w * 0.64} y={y + h * 0.34} width={w * 0.2} height={h * 0.32} rx={0.04} fill="none" stroke={F_STROKE} strokeWidth={th} />
        </g>
      );
      break;
    case "porte_garage":
      body = (
        <g>
          <rect x={x} y={y} width={w} height={h} fill="#eef2ff" stroke={F_STROKE} strokeWidth={st} />
          <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={F_STROKE} strokeWidth={th * 1.4} />
        </g>
      );
      break;
    case "parasol":
      body = <g><circle cx={cx} cy={cy} r={Math.min(w, h) / 2} fill="#fef9c3" stroke={F_STROKE} strokeWidth={th} /><circle cx={cx} cy={cy} r={0.05} fill={F_STROKE} /></g>;
      break;
    case "table_exterieur":
      body = <g><circle cx={cx} cy={cy} r={Math.min(w, h) / 2} fill={F_FILL} stroke={F_STROKE} strokeWidth={st} /><circle cx={cx} cy={cy} r={Math.min(w, h) * 0.16} fill="none" stroke={F_STROKE} strokeWidth={th} /></g>;
      break;
    default:
      body = rect(x, y, w, h);
  }
  return <g transform={rot}>{body}</g>;
}

function FurnitureLayer({ plan }: { plan: GeneratedPlan }) {
  const items = plan.furniture ?? [];
  return (
    <g>
      {items.map((f) => (
        <FurnitureSymbol key={f.id} f={f} />
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
    ? `${-0.55} ${-0.55} ${maxW + 1.65} ${maxD + 1.65}`
    : `${-1.9} ${-1.9} ${maxW + 5.6} ${maxD + 5.4}`;

  const quality = plan.quality;
  const qualityColor = !quality ? INK_SOFT : quality.score >= 85 ? "#059669" : quality.score >= 60 ? "#d97706" : "#dc2626";

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
          <text x={r.x + r.w / 2} y={r.y + r.h / 2} textAnchor="middle" fontSize={compact ? 0.42 : 0.34} fill="#57534e" fontWeight={600} style={{ pointerEvents: "none", letterSpacing: "0.02em" }}>
            {abbreviateRoomName(r.name, r.type)}
          </text>
          <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 0.48} textAnchor="middle" fontSize={compact ? 0.34 : 0.28} fill="#78716c" style={{ pointerEvents: "none" }}>
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
          pos.x = wn.x < 0 ? -0.05 : plan.width - 0.11;
        } else {
          pos.y = wn.y < 0 ? -0.05 : plan.depth - 0.11;
        }
        return <WindowBlock key={wn.id} x={pos.x} y={pos.y} w={wn.w} vertical={wn.vertical} />;
      })}

      {/* Portes */}
      {doors.map((d) => (
        <DoorBlock key={d.id} x={d.x} y={d.y} w={d.w} h={d.h} angle={d.angle} exterior={d.exterior} />
      ))}

      {/* Mobilier & équipements */}
      <FurnitureLayer plan={plan} />

      {/* Largeurs des portes et fenêtres */}
      {showDimensions && !compact && <DoorWindowLabels plan={plan} />}

      {/* Dimensions extérieures */}
      {showDimensions && <Dimensions width={plan.width} depth={plan.depth} compact={compact} />}

      {/* Boussole */}
      {showNorth && <NorthArrow x={plan.width - 1.1} y={plan.depth - 1.1} />}

      {/* Cartouche (non compact) */}
      {!compact && (
        <g>
          <rect x={maxW - 9.2} y={maxD + 1.9} width={9.6} height={2.4} fill="#f8fafc" stroke={LINE} strokeWidth={0.05} rx={0.1} />
          <text x={maxW - 8.7} y={maxD + 2.45} fontSize={0.48} fill={INK} fontWeight={800} style={{ letterSpacing: "0.01em" }}>
            Plan {String(plan.index).padStart(2, "0")} — {plan.name}
          </text>
          <text x={maxW - 8.7} y={maxD + 2.9} fontSize={0.38} fill={INK_SOFT}>
            Surface construite {plan.stats.construite.toFixed(0)} m² · {plan.levels} niveau{plan.levels > 1 ? "x" : ""} · Échelle 1:100
          </text>
          <text x={maxW - 8.7} y={maxD + 3.35} fontSize={0.34} fill={INK_SOFT}>
            RDC {plan.stats.construite.toFixed(0)} m² · Qualité IA {quality ? `${quality.score}/100` : "—"}
          </text>
          <text x={maxW - 8.7} y={maxD + 3.75} fontSize={0.32} fill="#94a3b8">
            Plan généré automatiquement par IA
          </text>
          <circle cx={maxW - 2.15} cy={maxD + 2.1} r={0.3} fill="#ffffff" stroke={qualityColor} strokeWidth={0.07} />
          <text x={maxW - 2.15} y={maxD + 2.19} textAnchor="middle" fontSize={0.34} fill={qualityColor} fontWeight={800}>
            {quality ? quality.score : "—"}
          </text>
        </g>
      )}
    </svg>
  );
}

// ============================================================================
// Vue 3D isométrique (extrusion des pièces + mobilier)
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

// Hauteur d'extrusion du mobilier en 3D (m)
const F_HEIGHT: Record<string, number> = {
  lit: 0.5, table_chevet: 0.5, armoire: 1.9, penderie: 1.8, etageres: 1.6,
  plan_travail: 0.9, evier: 0.9, plaque: 0.9, frigo: 1.8, four: 0.9, ilot: 0.9,
  douche: 0.15, baignoire: 0.55, lavabo: 0.85, wc: 0.45, miroir: 0.6,
  canape: 0.42, fauteuil: 0.42, table_basse: 0.42, meuble_tv: 0.5,
  table: 0.75, chaise: 0.45, bureau: 0.75, bibliotheque: 1.8,
  machine_laver: 0.85, seche_linge: 0.85, voiture: 1.4, porte_garage: 0,
  parasol: 0, table_exterieur: 0.75,
};

// Pièces « ouvertes » (parapet bas, sans toiture) — pas d'extrusion pleine hauteur
const LOW_WALL = new Set(["parking", "terrasse", "piscine", "jardin", "balcon"]);

const GLASS3D = "#7dd3fc";
const DARK3D = "#0f172a";

type FaceKey = "fx" | "fy";

interface IsoCtx {
  ox: number; oy: number; scale: number; planeW: number; planeD: number;
}

/** Projection d'un point sur une face verticale (t le long du mur, z la hauteur). */
function facePoint(face: FaceKey, t: number, z: number, c: IsoCtx) {
  return face === "fx"
    ? isoProject(c.planeW, t, z, c.ox, c.oy, c.scale)
    : isoProject(t, c.planeD, z, c.ox, c.oy, c.scale);
}

/** Polygone d'un rectangle sur une face verticale (ouverture, vitrage, porte…). */
function facePoly(face: FaceKey, t0: number, t1: number, z0: number, z1: number, c: IsoCtx): string {
  const a = facePoint(face, t0, z0, c);
  const b = facePoint(face, t1, z0, c);
  const e = facePoint(face, t1, z1, c);
  const d = facePoint(face, t0, z1, c);
  return `${a.px.toFixed(1)},${a.py.toFixed(1)} ${b.px.toFixed(1)},${b.py.toFixed(1)} ${e.px.toFixed(1)},${e.py.toFixed(1)} ${d.px.toFixed(1)},${d.py.toFixed(1)}`;
}

/** Hauteur d'extrusion d'une pièce (parapet pour les espaces ouverts). */
function roomH(r: PlacedRoom, wallH: number): number {
  return r.exterior && LOW_WALL.has(r.type) ? 0.4 : wallH;
}

// ─── Mobilier 3D (3 faces, en volume) ───────────────────────────────────────

function Furniture3D({ plan, ox, oy, scale, level, zBase }: {
  plan: GeneratedPlan; ox: number; oy: number; scale: number; level: number; zBase: number;
}) {
  const items = (plan.furniture ?? []).filter((f) => f.level === level && (F_HEIGHT[f.kind] ?? 0) > 0.05);
  if (items.length === 0) return null;
  return (
    <g>
      {items.map((f) => {
        const h = F_HEIGHT[f.kind] ?? 0.5;
        const p0 = { x: f.x, y: f.y, z: zBase };
        const p1 = { x: f.x + f.w, y: f.y, z: zBase };
        const p2 = { x: f.x + f.w, y: f.y + f.h, z: zBase };
        const p3 = { x: f.x, y: f.y + f.h, z: zBase };
        const r0 = { ...p0, z: zBase + h };
        const r1 = { ...p1, z: zBase + h };
        const r2 = { ...p2, z: zBase + h };
        const r3 = { ...p3, z: zBase + h };
        return (
          <g key={f.id}>
            <polygon points={isoPoly([p2, p3, r3, r2], ox, oy, scale)} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1.2} />
            <polygon points={isoPoly([p3, p0, r0, r3], ox, oy, scale)} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1.2} />
            <polygon points={isoPoly([r0, r1, r2, r3], ox, oy, scale)} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1.2} />
          </g>
        );
      })}
    </g>
  );
}

// ─── Boîte 3D d'une pièce (2 faces visibles) ────────────────────────────────

function RoomBox3D({ room, baseZ, wallH, c }: { room: PlacedRoom; baseZ: number; wallH: number; c: IsoCtx }) {
  const H = roomH(room, wallH);
  const x0 = room.x, x1 = room.x + room.w, y0 = room.y, y1 = room.y + room.h;
  const p0 = { x: x0, y: y0, z: baseZ };
  const p1 = { x: x1, y: y0, z: baseZ };
  const p2 = { x: x1, y: y1, z: baseZ };
  const p3 = { x: x0, y: y1, z: baseZ };
  const r0 = { ...p0, z: baseZ + H };
  const r1 = { ...p1, z: baseZ + H };
  const r2 = { ...p2, z: baseZ + H };
  const r3 = { ...p3, z: baseZ + H };
  return (
    <g>
      {/* face avant-droite */}
      <polygon points={isoPoly([p2, p3, r3, r2], c.ox, c.oy, c.scale)} fill={room.color} stroke="#64748b" strokeWidth={1.4} />
      {/* face avant-gauche (ombragée) */}
      <polygon points={isoPoly([p3, p0, r0, r3], c.ox, c.oy, c.scale)} fill="rgba(15,23,42,0.15)" stroke="#64748b" strokeWidth={1.4} />
    </g>
  );
}

// ─── Toiture (ceinture de mur + toit blanc) ─────────────────────────────────

function Roof3D({ room, baseZ, wallH, c }: { room: PlacedRoom; baseZ: number; wallH: number; c: IsoCtx }) {
  const H = roomH(room, wallH);
  if (H < wallH - 0.15) return null; // espaces ouverts : pas de toiture
  const z = baseZ + H;
  return (
    <g>
      <polygon
        points={isoPoly([
          { x: room.x, y: room.y, z },
          { x: room.x + room.w, y: room.y, z },
          { x: room.x + room.w, y: room.y + room.h, z },
          { x: room.x, y: room.y + room.h, z },
        ], c.ox, c.oy, c.scale)}
        fill="#64748b" stroke="#64748b" strokeWidth={5} strokeLinejoin="round"
      />
      <polygon
        points={isoPoly([
          { x: room.x + 0.11, y: room.y + 0.11, z },
          { x: room.x + room.w - 0.11, y: room.y + 0.11, z },
          { x: room.x + room.w - 0.11, y: room.y + room.h - 0.11, z },
          { x: room.x + 0.11, y: room.y + room.h - 0.11, z },
        ], c.ox, c.oy, c.scale)}
        fill="#ffffff" fillOpacity={0.94} stroke="#cbd5e1" strokeWidth={1.1}
      />
    </g>
  );
}

// ─── Fenêtres & porte d'entrée sur les façades visibles ─────────────────────

function Openings3D({ plan, baseZ, wallH, c, level }: {
  plan: GeneratedPlan; baseZ: number; wallH: number; c: IsoCtx; level: number;
}) {
  const roomsById = new Map(plan.rooms.map((r) => [r.id, r]));
  const wins = (plan.windows ?? []).filter((w) => roomsById.get(w.roomId)?.level === level);
  const doors = (plan.doors ?? []).filter((d) => d.exterior && roomsById.get(d.roomId)?.level === level);
  return (
    <g>
      {wins.map((w) => {
        const room = roomsById.get(w.roomId)!;
        const isEast = w.vertical && w.x > c.planeW - 1.3 && room.x + room.w >= c.planeW - 0.3;
        const isSouth = !w.vertical && w.y > c.planeD - 1.3 && room.y + room.h >= c.planeD - 0.3;
        if (!isEast && !isSouth) return null;
        const t0 = isEast ? Math.max(room.y, w.y) : Math.max(room.x, w.x);
        const t1 = isEast ? Math.min(room.y + room.h, w.y + w.w) : Math.min(room.x + room.w, w.x + w.w);
        if (t1 - t0 < 0.25) return null;
        const zA = baseZ + 0.95;
        const zB = baseZ + 2.02;
        const face: FaceKey = isEast ? "fx" : "fy";
        return (
          <g key={w.id}>
            <polygon points={facePoly(face, t0, t1, zA, zB, c)} fill={DARK3D} stroke="#334155" strokeWidth={0.9} />
            <polygon points={facePoly(face, t0 + 0.07, t1 - 0.07, zA + 0.08, zB - 0.08, c)} fill={GLASS3D} stroke="#0e7490" strokeWidth={0.55} />
            <polygon points={facePoly(face, t0 + 0.03, t1 - 0.03, zA + 0.03, zB - 0.03, c)} fill="none" stroke="#0e7490" strokeWidth={0.45} />
          </g>
        );
      })}
      {doors.map((d) => {
        const isEast = Math.abs(d.x - c.planeW) < 0.6 && d.x > c.planeW - 1.2;
        const isSouth = Math.abs(d.y + d.h - c.planeD) < 0.6 && d.y + d.h > c.planeD - 1.2;
        if (!isEast && !isSouth) return null;
        const t0 = isEast ? d.y : d.x;
        const t1 = isEast ? d.y + d.h : d.x + d.w;
        const zA = baseZ + 0.02;
        const zB = baseZ + 2.1;
        const face: FaceKey = isEast ? "fx" : "fy";
        return (
          <g key={d.id}>
            <polygon points={facePoly(face, t0 - 0.05, t1 + 0.05, zA - 0.03, zB + 0.06, c)} fill={DARK3D} stroke="#1e293b" strokeWidth={0.9} />
            <polygon points={facePoly(face, t0, t1, zA, zB, c)} fill="#b45309" stroke="#78350f" strokeWidth={0.6} />
            <polygon points={facePoly(face, t0 + 0.06, t1 - 0.06, zA + 0.06, zB - 0.06, c)} fill="none" stroke="#f59e0b" strokeWidth={0.4} />
          </g>
        );
      })}
    </g>
  );
}

// ─── Étiquette des pièces (pastille lisible) ────────────────────────────────

function RoomLabel3D({ room, z, c, isUpper }: { room: PlacedRoom; z: number; c: IsoCtx; isUpper?: boolean }) {
  const { px, py } = isoProject(room.x + room.w / 2, room.y + room.h / 2, z, c.ox, c.oy, c.scale);
  const abbr = abbreviateRoomName(room.name, room.type);
  const text = isUpper ? `▲ ${abbr}` : abbr;
  const w = Math.max(46, text.length * 7.6 + 18);
  return (
    <g transform={`translate(${px.toFixed(1)},${py.toFixed(1)})`}>
      <rect x={-w / 2} y={-13} width={w} height={26} rx={6} fill="#ffffff" stroke="#cbd5e1" strokeWidth={1.1} />
      <text x={0} y={1.5} textAnchor="middle" fontSize={13} fontWeight={700} fill={isUpper ? "#6d28d9" : "#0f172a"} style={{ letterSpacing: "0.02em" }}>
        {text}
      </text>
      <text x={0} y={15.5} textAnchor="middle" fontSize={10} fontWeight={600} fill="#475569">
        {room.area.toFixed(1)} m²
      </text>
    </g>
  );
}

export function FloorPlan3D({ plan }: { plan: GeneratedPlan }) {
  const wallH = plan.scores && plan.scores.global > 80 ? 3.1 : 2.9;
  const slab = 0.2;     // épaisseur de la dalle du niveau supérieur
  const gap = 0.55;     // vide entre les deux niveaux
  const upperZ0 = wallH + gap;
  const scale = 42;     // échelle d'extrusion (agrandie)

  const rooms = plan.rooms ?? [];
  if (rooms.length === 0) {
    return (
      <svg viewBox="0 0 800 600" className="w-full h-auto" role="img" aria-label={`Vue 3D du plan ${plan.name}`} />
    );
  }

  const ground = rooms.filter((r) => r.level === 0);
  const groundInt = ground.filter((r) => !r.exterior);
  const upper = rooms.filter((r) => r.level === 1);
  const hasUpper = upper.length > 0;

  // Façades du bâtiment (zone couverte) — plan des fenêtres/portes
  const planeW = Math.max(plan.width, ...groundInt.map((r) => r.x + r.w));
  const planeD = Math.max(plan.depth, ...groundInt.map((r) => r.y + r.h));
  // Emprise totale de la scène (zone couverte + extérieurs : garage, terrasse…)
  const maxW = Math.max(planeW, ...rooms.map((r) => r.x + r.w));
  const maxD = Math.max(planeD, ...rooms.map((r) => r.y + r.h));

  // Zone couverte du RDC (dalle du bâtiment)
  const gx0 = groundInt.length ? Math.min(...groundInt.map((r) => r.x)) : 0;
  const gy0 = groundInt.length ? Math.min(...groundInt.map((r) => r.y)) : 0;
  const gx1 = groundInt.length ? Math.max(...groundInt.map((r) => r.x + r.w)) : planeW;
  const gy1 = groundInt.length ? Math.max(...groundInt.map((r) => r.y + r.h)) : planeD;

  // Niveau supérieur
  const ux0 = hasUpper ? Math.min(...upper.map((r) => r.x)) : 0;
  const uy0 = hasUpper ? Math.min(...upper.map((r) => r.y)) : 0;
  const ux1 = hasUpper ? Math.max(...upper.map((r) => r.x + r.w)) : 0;
  const uy1 = hasUpper ? Math.max(...upper.map((r) => r.y + r.h)) : 0;
  const uBase = upperZ0 + slab;

  const ox = 0;
  const oy = 0;
  const c: IsoCtx = { ox, oy, scale, planeW, planeD };

  // Tri « arrière → avant » pour un rendu correct
  const sortedGround = [...ground].sort((a, b) => a.x + a.y - (b.x + b.y));
  const sortedUpper = [...upper].sort((a, b) => a.x + a.y - (b.x + b.y));

  // — Bornes projetées : viewBox auto-ajusté (le plan occupe tout l'espace) —
  const bounds: { px: number; py: number }[] = [];
  const pushBox = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
    bounds.push(
      isoProject(x0, y0, z0, ox, oy, scale), isoProject(x1, y0, z0, ox, oy, scale),
      isoProject(x1, y1, z0, ox, oy, scale), isoProject(x0, y1, z0, ox, oy, scale),
      isoProject(x0, y0, z1, ox, oy, scale), isoProject(x1, y0, z1, ox, oy, scale),
      isoProject(x1, y1, z1, ox, oy, scale), isoProject(x0, y1, z1, ox, oy, scale),
    );
  };
  pushBox(-1.5, -1.5, 0, maxW + 1.8, maxD + 1.8, 0);          // sol
  pushBox(gx0, gy0, 0, gx1 + 0.5, gy1 + 0.5, 0.15);           // dalle du bâtiment (+ plinthe)
  pushBox(gx0 + 1.6, gy0 - 1.6, 0, gx1 + 1.6, gy1 - 1.6, 0);  // ombre portée
  for (const r of rooms) pushBox(r.x, r.y, 0, r.x + r.w, r.y + r.h, roomH(r, wallH));
  if (hasUpper) {
    pushBox(ux0, uy0, upperZ0, ux1, uy1, uBase);              // dalle supérieure
    for (const r of upper) pushBox(r.x, r.y, uBase, r.x + r.w, r.y + r.h, uBase + roomH(r, wallH));
  }
  for (const f of plan.furniture ?? []) {
    const h = F_HEIGHT[f.kind] ?? 0.5;
    const zb = f.level === 1 && hasUpper ? uBase : 0;
    pushBox(f.x, f.y, zb, f.x + f.w, f.y + f.h, zb + h);
  }
  const labelZ = (r: PlacedRoom) => (r.level === 1 && hasUpper ? uBase : 0) + roomH(r, wallH) + 0.35;
  for (const r of rooms) {
    if (LOW_WALL.has(r.type)) continue;
    const { px, py } = isoProject(r.x + r.w / 2, r.y + r.h / 2, labelZ(r), ox, oy, scale);
    bounds.push({ px: px - 40, py: py - 16 }, { px: px + 40, py: py - 16 }, { px: px - 40, py: py + 16 }, { px: px + 40, py: py + 16 });
  }

  const pad = 40;
  const minX = Math.min(...bounds.map((p) => p.px)) - pad;
  const minY = Math.min(...bounds.map((p) => p.py)) - pad;
  const maxX = Math.max(...bounds.map((p) => p.px)) + pad;
  const maxY = Math.max(...bounds.map((p) => p.py)) + pad;
  const viewBox = `${minX.toFixed(0)} ${minY.toFixed(0)} ${(maxX - minX).toFixed(0)} ${(maxY - minY).toFixed(0)}`;

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      style={{ background: "transparent", fontFamily: "'Inter', sans-serif" }}
      role="img"
      aria-label={`Vue 3D du plan ${plan.name}`}
    >
      <defs>
        {/* Quadrillage fin « papier millimétré » du sol */}
        <pattern id={`grid3d-${plan.index}-${plan.key}`} width="0.5" height="0.5" patternUnits="userSpaceOnUse">
          <path d="M 0.5 0 L 0 0 0 0.5" fill="none" stroke="#e2e8f0" strokeWidth="0.04" />
        </pattern>
      </defs>

      {/* Ombre portée (lumière depuis la gauche) */}
      <polygon
        points={isoPoly([
          { x: gx0 + 1.6, y: gy0 - 1.6, z: 0 },
          { x: gx1 + 1.6, y: gy0 - 1.6, z: 0 },
          { x: gx1 + 1.6, y: gy1 - 1.6, z: 0 },
          { x: gx0 + 1.6, y: gy1 - 1.6, z: 0 },
        ], ox, oy, scale)}
        fill="rgba(15,23,42,0.08)" stroke="none"
      />

      {/* Sol (quadrillé) */}
      <polygon
        points={isoPoly([
          { x: -1.5, y: -1.5, z: 0 },
          { x: maxW + 1.8, y: -1.5, z: 0 },
          { x: maxW + 1.8, y: maxD + 1.8, z: 0 },
          { x: -1.5, y: maxD + 1.8, z: 0 },
        ], ox, oy, scale)}
        fill={`url(#grid3d-${plan.index}-${plan.key})`} stroke="#e2e8f0" strokeWidth={1.2}
      />

      {/* Plinthe de la dalle du bâtiment (faces visibles) */}
      <polygon
        points={isoPoly([
          { x: gx1 + 0.5, y: gy0, z: 0 },
          { x: gx1 + 0.5, y: gy1 + 0.5, z: 0 },
          { x: gx1 + 0.5, y: gy1 + 0.5, z: 0.15 },
          { x: gx1 + 0.5, y: gy0, z: 0.15 },
        ], ox, oy, scale)}
        fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1}
      />
      <polygon
        points={isoPoly([
          { x: gx0, y: gy1 + 0.5, z: 0 },
          { x: gx1 + 0.5, y: gy1 + 0.5, z: 0 },
          { x: gx1 + 0.5, y: gy1 + 0.5, z: 0.15 },
          { x: gx0, y: gy1 + 0.5, z: 0.15 },
        ], ox, oy, scale)}
        fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1}
      />

      {/* Dalle du bâtiment */}
      <polygon
        points={isoPoly([
          { x: gx0, y: gy0, z: 0.15 },
          { x: gx1 + 0.5, y: gy0, z: 0.15 },
          { x: gx1 + 0.5, y: gy1 + 0.5, z: 0.15 },
          { x: gx0, y: gy1 + 0.5, z: 0.15 },
        ], ox, oy, scale)}
        fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1.2}
      />

      {/* RDC : boîtes des pièces */}
      {sortedGround.map((r) => <RoomBox3D key={r.id} room={r} baseZ={0} wallH={wallH} c={c} />)}
      {/* RDC : fenêtres & porte d'entrée sur les façades visibles */}
      <Openings3D plan={plan} baseZ={0} wallH={wallH} c={c} level={0} />
      {/* RDC : toitures (ceinture de mur + toit) */}
      {sortedGround.map((r) => <Roof3D key={`rf-${r.id}`} room={r} baseZ={0} wallH={wallH} c={c} />)}

      {/* Niveau supérieur */}
      {hasUpper && (
        <g>
          {/* dalle supérieure flottante */}
          <polygon points={isoPoly([{ x: ux0, y: uy0, z: upperZ0 }, { x: ux1, y: uy0, z: upperZ0 }, { x: ux1, y: uy0, z: uBase }, { x: ux0, y: uy0, z: uBase }], ox, oy, scale)} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
          <polygon points={isoPoly([{ x: ux0, y: uy1, z: upperZ0 }, { x: ux1, y: uy1, z: upperZ0 }, { x: ux1, y: uy1, z: uBase }, { x: ux0, y: uy1, z: uBase }], ox, oy, scale)} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1} />
          <polygon points={isoPoly([{ x: ux0, y: uy0, z: uBase }, { x: ux1, y: uy0, z: uBase }, { x: ux1, y: uy1, z: uBase }, { x: ux0, y: uy1, z: uBase }], ox, oy, scale)} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1} />
          {sortedUpper.map((r) => <RoomBox3D key={r.id} room={r} baseZ={uBase} wallH={wallH} c={c} />)}
          <Openings3D plan={plan} baseZ={uBase} wallH={wallH} c={c} level={1} />
          {sortedUpper.map((r) => <Roof3D key={`rf-${r.id}`} room={r} baseZ={uBase} wallH={wallH} c={c} />)}
        </g>
      )}

      {/* Mobilier 3D (RDC puis niveau supérieur) */}
      <Furniture3D plan={plan} ox={ox} oy={oy} scale={scale} level={0} zBase={0} />
      {hasUpper && <Furniture3D plan={plan} ox={ox} oy={oy} scale={scale} level={1} zBase={uBase} />}

      {/* Étiquettes des pièces */}
      {rooms.map((r) => {
        if (LOW_WALL.has(r.type)) return null;
        return <RoomLabel3D key={`lbl-${r.id}`} room={r} z={labelZ(r)} c={c} isUpper={r.level === 1 && hasUpper} />;
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
