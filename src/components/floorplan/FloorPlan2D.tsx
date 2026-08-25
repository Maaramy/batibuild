import { useId, useMemo } from "react";
import type { FloorPlan } from "@/lib/floorPlanEngine";

// ── Palette par nature de pièce ──────────────────────────────────────────────

const ROOM_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  sejour: { fill: "#fef3c7", stroke: "#d97706", text: "#92400e" },
  cuisine: { fill: "#fee2e2", stroke: "#ef4444", text: "#991b1b" },
  chambre: { fill: "#dbeafe", stroke: "#3b82f6", text: "#1e40af" },
  sdb: { fill: "#cffafe", stroke: "#06b6d4", text: "#155e75" },
  wc: { fill: "#e0e7ff", stroke: "#6366f1", text: "#3730a3" },
  couloir: { fill: "#f4f4f5", stroke: "#a1a1aa", text: "#52525b" },
  escalier: { fill: "#fae8ff", stroke: "#c026d3", text: "#86198f" },
  bureau: { fill: "#dcfce7", stroke: "#22c55e", text: "#166534" },
  garage: { fill: "#e5e7eb", stroke: "#6b7280", text: "#374151" },
  reception: { fill: "#fef9c3", stroke: "#ca8a04", text: "#854d0e" },
  openspace: { fill: "#d1fae5", stroke: "#10b981", text: "#065f46" },
  reunion: { fill: "#fce7f3", stroke: "#ec4899", text: "#9d174d" },
  sanitaire: { fill: "#cffafe", stroke: "#06b6d4", text: "#155e75" },
  hall: { fill: "#f4f4f5", stroke: "#a1a1aa", text: "#52525b" },
  stockage: { fill: "#ffedd5", stroke: "#f97316", text: "#9a3412" },
  logistique: { fill: "#fff7ed", stroke: "#ea580c", text: "#9a3412" },
  vestiaire: { fill: "#ede9fe", stroke: "#8b5cf6", text: "#5b21b6" },
  polyvalent: { fill: "#f1f5f9", stroke: "#94a3b8", text: "#475569" },
};

const SCALE = 42; // px par mètre
const WALL = 3.5; // épaisseur visuelle des murs (px)

export function FloorPlan2D({ plan }: { plan: FloorPlan }) {
  const clipId = useId();
  const W = plan.length * SCALE;
  const H = plan.width * SCALE;
  const PAD = 18;

  const rooms = useMemo(
    () =>
      plan.rooms.map((r) => ({
        ...r,
        color: ROOM_COLORS[r.kind] ?? ROOM_COLORS.polyvalent,
      })),
    [plan],
  );

  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${W + PAD * 2} ${H + PAD * 2}`}
      className="w-full h-auto select-none"
      role="img"
      aria-label={`Plan 2D — ${plan.rooms.length} pièces`}
    >
      {/* Emprise extérieure */}
      <rect x={0} y={0} width={W} height={H} fill="#fafafa" />
      <clipPath id={clipId}>
        <rect x={0} y={0} width={W} height={H} />
      </clipPath>

      <g clipPath={`url(#${clipId})`}>
        {rooms.map((r) => {
          const rx = r.x * SCALE;
          const ry = r.y * SCALE;
          const rw = r.w * SCALE;
          const rh = r.h * SCALE;
          const big = rw > 52 && rh > 34;
          const mid = rw > 30 && rh > 20;
          return (
            <g key={r.id}>
              <rect
                x={rx}
                y={ry}
                width={rw}
                height={rh}
                fill={r.color.fill}
                stroke={r.color.stroke}
                strokeWidth={1}
              />
              {big && (
                <text
                  x={rx + rw / 2}
                  y={ry + rh / 2 - 4}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill={r.color.text}
                >
                  {r.label}
                </text>
              )}
              {big && (
                <text
                  x={rx + rw / 2}
                  y={ry + rh / 2 + 10}
                  textAnchor="middle"
                  fontSize={9}
                  fill={r.color.text}
                  opacity={0.75}
                >
                  {r.area.toFixed(1)} m²
                </text>
              )}
              {!big && mid && (
                <text
                  x={rx + rw / 2}
                  y={ry + rh / 2 + 3}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight={500}
                  fill={r.color.text}
                >
                  {r.label}
                </text>
              )}

              {/* Fenêtres : segment bleu clair en double trait */}
              {r.windows.map((win, i) => (
                <WindowMark key={`w${i}`} room={{ x: rx, y: ry, w: rw, h: rh }} wall={win.wall} position={win.position * SCALE} width={win.width * SCALE} />
              ))}
              {/* Portes : arc de battant */}
              {r.doors.map((door, i) => (
                <DoorMark key={`d${i}`} room={{ x: rx, y: ry, w: rw, h: rh }} wall={door.wall} position={door.position * SCALE} width={door.width * SCALE} isEntry={door.isEntry} />
              ))}
            </g>
          );
        })}
      </g>

      {/* Murs extérieurs */}
      <rect x={0} y={0} width={W} height={H} fill="none" stroke="#27272a" strokeWidth={WALL} />

      {/* Cotes */}
      <Dimension x1={0} y1={-PAD + 8} x2={W} y2={-PAD + 8} label={`${plan.length.toFixed(1)} m`} />
      <Dimension vertical x1={-PAD + 8} y1={0} x2={-PAD + 8} y2={H} label={`${plan.width.toFixed(1)} m`} />
    </svg>
  );
}

// ── Marqueurs openings ───────────────────────────────────────────────────────

type Box = { x: number; y: number; w: number; h: number };

function WindowMark({ room, wall, position, width }: { room: Box; wall: string; position: number; width: number }) {
  const t = 7;
  let line: React.ReactNode;
  if (wall === "N") line = <line x1={room.x + position} y1={room.y} x2={room.x + position + width} y2={room.y} />;
  else if (wall === "S") line = <line x1={room.x + position} y1={room.y + room.h} x2={room.x + position + width} y2={room.y + room.h} />;
  else if (wall === "W") line = <line x1={room.x} y1={room.y + position} x2={room.x} y2={room.y + position + width} />;
  else line = <line x1={room.x + room.w} y1={room.y + position} x2={room.x + room.w} y2={room.y + position + width} />;
  return (
    <g stroke="#38bdf8" strokeWidth={t} strokeLinecap="butt" opacity={0.9}>
      {line}
      <line
        x1={wall === "N" ? room.x + position : wall === "W" ? room.x : wall === "E" ? room.x + room.w : room.x + position}
        y1={wall === "N" ? room.y : wall === "S" ? room.y + room.h : room.y + position}
        x2={
          wall === "N"
            ? room.x + position + width
            : wall === "E"
              ? room.x + room.w
              : wall === "W"
                ? room.x
                : room.x + position + width
        }
        y2={wall === "N" ? room.y : wall === "S" ? room.y + room.h : room.y + position + width}
        stroke="#ffffff"
        strokeWidth={t - 4}
      />
    </g>
  );
}

function DoorMark({ room, wall, position, width, isEntry }: { room: Box; wall: string; position: number; width: number; isEntry?: boolean }) {
  // Charnière au début de l'ouverture · vantail perpendiculaire au mur ·
  // arc quart-de-cercle vers l'intérieur de la pièce.
  let hx = 0, hy = 0, lx = 0, ly = 0, ex = 0, ey = 0, sweep = 0;
  if (wall === "N") { hx = room.x + position; hy = room.y; lx = hx + width; ly = hy; ex = hx; ey = hy + width; sweep = 1; }
  else if (wall === "S") { hx = room.x + position; hy = room.y + room.h; lx = hx + width; ly = hy; ex = hx; ey = hy - width; sweep = 0; }
  else if (wall === "W") { hx = room.x; hy = room.y + position; lx = hx; ly = hy + width; ex = hx + width; ey = hy; sweep = 0; }
  else { hx = room.x + room.w; hy = room.y + position; lx = hx; ly = hy + width; ex = hx - width; ey = hy; sweep = 1; }
  const color = isEntry ? "#16a34a" : "#71717a";
  return (
    <g>
      {/* Vantail */}
      <line x1={hx} y1={hy} x2={lx} y2={ly} stroke={color} strokeWidth={1.4} opacity={0.9} />
      {/* Trajectoire du battant */}
      <path
        d={`M ${lx} ${ly} A ${Math.abs(width)} ${Math.abs(width)} 0 0 ${sweep} ${ex} ${ey}`}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        opacity={0.85}
      />
      <circle cx={hx} cy={hy} r={2.2} fill={color} />
    </g>
  );
}

function Dimension({
  x1, y1, x2, y2, label, vertical,
}: { x1: number; y1: number; x2: number; y2: number; label: string; vertical?: boolean }) {
  return (
    <g stroke="#a1a1aa" strokeWidth={1}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} markerStart="none" />
      <line
        x1={vertical ? x1 - 4 : x1}
        y1={vertical ? y1 : y1 - 4}
        x2={vertical ? x1 + 4 : x1}
        y2={vertical ? y1 : y1 + 4}
      />
      <line
        x1={vertical ? x2 - 4 : x2}
        y1={vertical ? y2 : y2 - 4}
        x2={vertical ? x2 + 4 : x2}
        y2={vertical ? y2 : y2 + 4}
      />
      <text
        x={(x1 + x2) / 2}
        y={(y1 + y2) / 2 - 4}
        textAnchor="middle"
        fontSize={9}
        fill="#71717a"
        stroke="none"
        transform={vertical ? `rotate(-90 ${(x1 + x2) / 2} ${(y1 + y2) / 2})` : undefined}
      >
        {label}
      </text>
    </g>
  );
}
