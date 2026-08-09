import { useMemo } from "react";
import type { GeneratedPlan, PlacedRoom } from "@/convex/planEngine";
import { roomColor } from "@/convex/planEngine";

// ============================================================================
// Rendu SVG professionnel d'un plan architectural (échelle métrique).
// Le plan est rendu dans un repère métrique (1 unité = 1 mètre), puis mis à
// l'échelle par viewBox. Exportable tel quel en PNG/JPG/PDF.
// ============================================================================

const WALL_W = 0.16;   // épaisseur mur extérieur (m)
const WALL_I = 0.1;    // épaisseur cloison (m)

function roomCenter(r: PlacedRoom) {
  return { cx: r.x + r.w / 2, cy: r.y + r.h / 2 };
}

// ─── Cartouche / dimensionnement ────────────────────────────────────────────

function Dimensions({ width, depth }: { width: number; depth: number }) {
  const margin = 1.1;
  const wLen = width;
  const dLen = depth;
  return (
    <g>
      {/* Cote largeur (bas) */}
      <line x1={0} y1={depth + margin * 0.5} x2={width} y2={depth + margin * 0.5} stroke="#334155" strokeWidth={0.05} />
      <line x1={0} y1={depth + margin * 0.2} x2={0} y2={depth + margin * 0.85} stroke="#334155" strokeWidth={0.05} />
      <line x1={width} y1={depth + margin * 0.2} x2={width} y2={depth + margin * 0.85} stroke="#334155" strokeWidth={0.05} />
      <text x={wLen / 2} y={depth + margin * 0.72} textAnchor="middle" fontSize={0.55} fill="#334155" fontWeight={600}>
        {wLen.toFixed(2)} m
      </text>
      {/* Cote profondeur (droite) */}
      <line x1={width + margin * 0.5} y1={0} x2={width + margin * 0.5} y2={depth} stroke="#334155" strokeWidth={0.05} />
      <line x1={width + margin * 0.2} y1={0} x2={width + margin * 0.85} y2={0} stroke="#334155" strokeWidth={0.05} />
      <line x1={width + margin * 0.2} y1={depth} x2={width + margin * 0.85} y2={depth} stroke="#334155" strokeWidth={0.05} />
      <text x={width + margin * 0.68} y={dLen / 2} textAnchor="middle" fontSize={0.55} fill="#334155" fontWeight={600} transform={`rotate(90 ${width + margin * 0.68} ${dLen / 2})`}>
        {dLen.toFixed(2)} m
      </text>
    </g>
  );
}

function NorthArrow({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={0.85} fill="none" stroke="#64748b" strokeWidth={0.07} />
      <polygon points="0,-0.6 0.3,0.25 0,0.08 -0.3,0.25" fill="#3b82f6" />
      <text y={-1.05} textAnchor="middle" fontSize={0.42} fill="#3b82f6" fontWeight={700}>N</text>
    </g>
  );
}

// ─── Escalier ───────────────────────────────────────────────────────────────

function StairBlock({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const steps = Math.max(3, Math.floor((w + h) / 0.6));
  const lines: number[] = [];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    lines.push(t);
  }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#eef2ff" stroke="#6366f1" strokeWidth={0.08} />
      {lines.map((t, i) => (
        <line
          key={i}
          x1={x + t * w} y1={y}
          x2={x + t * w - (h * 0.6) * (w / h)} y2={y + h}
          stroke="#818cf8" strokeWidth={0.06}
          style={{ display: w / h > 1.6 ? undefined : "none" }}
        />
      ))}
      <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke="#6366f1" strokeWidth={0.06} />
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke="#6366f1" strokeWidth={0.06} />
      <text x={x + w / 2} y={y + h / 2} textAnchor="middle" fontSize={Math.min(w, h) * 0.45} fill="#4338ca" fontWeight={700}>
        Esc
      </text>
    </g>
  );
}

// ─── Pièce (murs, étiquette, surface) ───────────────────────────────────────

function RoomBlock({ room, isUpper, compact }: { room: PlacedRoom; isUpper?: boolean; compact?: boolean }) {
  const { cx, cy } = roomCenter(room);
  const fill = room.exterior ? `${roomColor(room.type)}55` : `${roomColor(room.type)}cc`;
  // En mode compact (cartes), labels plus grands pour une lecture nette.
  const fontSize = compact
    ? Math.min(1.15, Math.max(0.45, Math.min(room.w, room.h) * 0.4))
    : Math.max(0.32, Math.min(room.w, room.h) * 0.34);
  const stroke = room.exterior ? "#a8a29e" : "#475569";
  return (
    <g>
      <rect
        x={room.x} y={room.y} width={room.w} height={room.h}
        fill={fill}
        stroke={stroke}
        strokeWidth={room.exterior ? WALL_I : WALL_I}
        rx={0.06}
      />
      {room.exterior && (
        <rect
          x={room.x + 0.1} y={room.y + 0.1} width={room.w - 0.2} height={room.h - 0.2}
          fill="none" stroke="#a8a29e" strokeWidth={0.04} strokeDasharray="0.28 0.18"
        />
      )}
      {/* Nom + surface */}
      <text x={cx} y={cy - (room.h >= 1.6 ? 0.12 : 0)} textAnchor="middle" fontSize={fontSize} fill="#1e293b" fontWeight={700} style={{ pointerEvents: "none" }}>
        {room.name}
      </text>
      {room.h >= 1.8 && (
        <text x={cx} y={cy + fontSize + 0.12} textAnchor="middle" fontSize={fontSize * 0.82} fill="#475569" style={{ pointerEvents: "none" }}>
          {room.area.toFixed(1)} m²
        </text>
      )}
      {isUpper && (
        <text x={room.x + 0.18} y={room.y + 0.42} fontSize={compact ? 0.45 : 0.34} fill="#7c3aed" fontWeight={700}>▲</text>
      )}
    </g>
  );
}

// ─── Porte (avec sens d'ouverture) ──────────────────────────────────────────

function DoorBlock({ x, y, w, h, angle, exterior }: { x: number; y: number; w: number; h: number; angle: number; exterior: boolean }) {
  // Positionne le battant : pivot au coin du mur, arc de 90°
  const pivot = { x: x + (angle % Math.PI === 0 ? 0 : 0), y: y + (angle % Math.PI === 0 ? 0 : 0) };
  const arcStart = { x: x + w, y };
  const arcEnd = { x, y: y + h };
  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h}
        fill="#fff" stroke={exterior ? "#0f766e" : "#64748b"} strokeWidth={exterior ? 0.09 : 0.07}
      />
      {/* Battant */}
      <line x1={pivot.x} y1={pivot.y} x2={arcStart.x} y2={arcStart.y} stroke="#334155" strokeWidth={0.07} />
      {/* Arc d'ouverture */}
      <path
        d={`M ${arcStart.x} ${arcStart.y} A ${w} ${h} 0 0 1 ${arcEnd.x} ${arcEnd.y}`}
        fill="none" stroke={exterior ? "#0f766e" : "#94a3b8"} strokeWidth={0.05} strokeDasharray="0.1 0.08"
      />
      <line x1={pivot.x} y1={pivot.y} x2={arcEnd.x} y2={arcEnd.y} stroke="#94a3b8" strokeWidth={0.05} />
      {exterior && <circle cx={pivot.x} cy={pivot.y} r={0.09} fill="#0f766e" />}
    </g>
  );
}

// ─── Fenêtre ────────────────────────────────────────────────────────────────

function WindowBlock({ x, y, w, vertical }: { x: number; y: number; w: number; vertical: boolean }) {
  const wl = vertical ? 0.1 : w;
  const hl = vertical ? w : 0.1;
  return (
    <g>
      <rect x={x} y={y} width={wl} height={hl} fill="#e0f2fe" stroke="#0ea5e9" strokeWidth={0.06} />
      <line x1={x} y1={y + hl / 2} x2={x + wl} y2={y + hl / 2} stroke="#0ea5e9" strokeWidth={0.05} />
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
    ? `${-0.45} ${-0.45} ${maxW + 1.15} ${maxD + 1.15}`
    : `${-0.6} ${-0.6} ${maxW + 4.2} ${maxD + 3.6}`;

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
        <pattern id={`hatch-${plan.index}`} width="0.5" height="0.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="0.5" stroke="#cbd5e1" strokeWidth="0.06" />
        </pattern>
      </defs>

      {/* Extérieurs (jardin, terrasse…) */}
      {plan.rooms.filter((r) => r.exterior).map((r) => (
        <g key={r.id}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={`${roomColor(r.type)}33`} stroke="#a8a29e" strokeWidth={0.08} strokeDasharray="0.3 0.2" />
          <text x={r.x + r.w / 2} y={r.y + r.h / 2} textAnchor="middle" fontSize={compact ? 0.55 : 0.42} fill="#57534e" fontWeight={600} style={{ pointerEvents: "none" }}>
            {r.name}
          </text>
          <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 0.5} textAnchor="middle" fontSize={compact ? 0.44 : 0.34} fill="#78716c" style={{ pointerEvents: "none" }}>
            {r.area.toFixed(1)} m²
          </text>
        </g>
      ))}

      {/* Sol des pièces + murs */}
      {plan.rooms.filter((r) => !r.exterior).map((r) => (
        <RoomBlock key={r.id} room={r} isUpper={r.level > 0} compact={compact} />
      ))}

      {/* Escaliers */}
      {plan.stairs.map((s, i) => (
        <StairBlock key={i} x={s.x} y={s.y} w={s.w} h={s.h} />
      ))}

      {/* Fenêtres */}
      {windows.map((wn) => (
        <WindowBlock key={wn.id} x={wn.x} y={wn.y} w={wn.w} vertical={wn.vertical} />
      ))}

      {/* Portes */}
      {doors.map((d) => (
        <DoorBlock key={d.id} x={d.x} y={d.y} w={d.w} h={d.h} angle={d.angle} exterior={d.exterior} />
      ))}

      {/* Murs extérieurs (trait double) */}
      <rect x={0} y={0} width={plan.width} height={plan.depth} fill="none" stroke="#1e293b" strokeWidth={WALL_W} />
      <rect x={WALL_W / 2} y={WALL_W / 2} width={plan.width - WALL_W} height={plan.depth - WALL_W} fill="none" stroke="#1e293b" strokeWidth={0.03} />

      {/* Dimensions */}
      {showDimensions && <Dimensions width={plan.width} depth={plan.depth} />}

      {/* Boussole */}
      {showNorth && <NorthArrow x={plan.width - 1.1} y={plan.depth - 1.1} />}

      {/* Cartouche (non compact) */}
      {!compact && (
        <g>
          <rect x={maxW - 8.6} y={maxD + 1.5} width={9} height={1.9} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={0.05} rx={0.1} />
          <text x={maxW - 8.1} y={maxD + 2.05} fontSize={0.48} fill="#0f172a" fontWeight={800}>
            Plan {String(plan.index).padStart(2, "0")} — {plan.name}
          </text>
          <text x={maxW - 8.1} y={maxD + 2.5} fontSize={0.38} fill="#475569">
            Surface construite {plan.stats.construite.toFixed(0)} m² · {plan.levels} niveau{plan.levels > 1 ? "x" : ""} · Échelle 1:100
          </text>
          <text x={maxW - 8.1} y={maxD + 2.9} fontSize={0.34} fill="#94a3b8">
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
        fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1}
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
              fill={col} stroke="#64748b" strokeWidth={1}
            />
            {/* Face gauche (sud-ouest) */}
            <polygon
              points={isoPoly([pts[3], pts[0], roof[0], roof[3]], ox, oy, scale)}
              fill="#00000022" stroke="#64748b" strokeWidth={1}
            />
            {/* Toit */}
            <polygon
              points={isoPoly([roof[0], roof[1], roof[2], roof[3]], ox, oy, scale)}
              fill="#ffffffaa" stroke="#64748b" strokeWidth={1}
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
            <text x={px} y={py} textAnchor="middle" fontSize={9} fill="#334155" fontWeight={700}>
              {r.name}
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
