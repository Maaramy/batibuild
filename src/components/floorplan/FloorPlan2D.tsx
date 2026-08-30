import { useMemo } from "react";
import type { PlanVariant, PlanRoom, PlanOpening } from "@/lib/floorPlanEngine";
import { ROOM_COLORS } from "@/lib/floorPlanEngine";

interface FloorPlan2DProps {
  variant: PlanVariant;
  width?: number;
  height?: number;
}

const INK = "#292524";
const DIMC = "#78716c";
const PAPER = "#fafaf9";
const EXT = 2.5;
const INT = 1.2;
const PAD = 35;

export function FloorPlan2D({ variant, width = 480, height = 400 }: FloorPlan2DProps) {
  const { rooms, length: L, width: W } = variant;
  const vb = useMemo(() => `${-PAD} ${-PAD} ${L + PAD * 2} ${W + PAD * 2}`, [L, W]);

  return (
    <svg viewBox={vb} width={width} height={height} className="w-full h-auto" style={{ maxWidth: width }}>
      <rect x={-PAD} y={-PAD} width={L + PAD * 2} height={W + PAD * 2} fill={PAPER} />

      {/* Room fills */}
      {rooms.map((r) => (
        <rect key={`f-${r.id}`} x={r.x} y={r.y} width={r.w} height={r.h}
          fill={ROOM_COLORS[r.kind] ?? "#f5f5f4"} stroke={INK} strokeWidth={INT} />
      ))}

      {/* Labels */}
      {rooms.map((r) => {
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const showArea = r.w > 1.8 && r.h > 1.2;
        const showDims = r.w > 2.5 && r.h > 1.8;
        const fs = Math.min(1.0, r.w * 0.14);
        return (
          <g key={`l-${r.id}`} textAnchor="middle">
            <text x={cx} y={showArea ? cy - fs * 0.3 : cy + fs * 0.3} fontSize={fs} fontWeight={700} fill={INK}>
              {r.label}
            </text>
            {showArea && <text x={cx} y={cy + fs * 0.9} fontSize={fs * 0.75} fill={DIMC}>{r.area.toFixed(1)} m²</text>}
            {showDims && <text x={cx} y={cy + fs * 1.7} fontSize={fs * 0.6} fill={DIMC}>{r.w.toFixed(1)} × {r.h.toFixed(1)} m</text>}
          </g>
        );
      })}

      {/* Doors */}
      {rooms.map((r) => r.doors.map((d, i) => {
        const p = doorPos(r, d);
        return (
          <g key={`d-${r.id}-${i}`}>
            <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
              stroke={d.isEntry ? "#15803d" : "#44403c"} strokeWidth={0.9} />
            <path d={p.arc} fill="none" stroke={d.isEntry ? "#15803d" : DIMC}
              strokeWidth={0.5} strokeDasharray="0.3 0.3" />
          </g>
        );
      }))}

      {/* Windows */}
      {rooms.map((r) => r.windows.map((w, i) => {
        const p = winPos(r, w);
        return (
          <g key={`w-${r.id}-${i}`}>
            <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke="#2563eb" strokeWidth={1} />
            <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke="white" strokeWidth={0.4} />
          </g>
        );
      }))}

      {/* Outer walls */}
      <rect x={0} y={0} width={L} height={W} fill="none" stroke={INK} strokeWidth={EXT} />

      {/* Dimension chains */}
      <DimLine x1={0} y1={-10} x2={L} y2={-10} label={`${L.toFixed(1)} m`} />
      <DimLine x1={-10} y1={0} x2={-10} y2={W} label={`${W.toFixed(1)} m`} vertical />

      {/* Entry arrow */}
      {rooms.map((r) => r.doors.filter((d) => d.isEntry).map((d, i) => {
        const p = doorPos(r, d);
        const mx = (p.x1 + p.x2) / 2;
        const my = (p.y1 + p.y2) / 2;
        const dx = d.wall === "N" ? 0 : d.wall === "S" ? 0 : d.wall === "W" ? -3 : 3;
        const dy = d.wall === "N" ? -3 : d.wall === "S" ? 3 : 0;
        return (
          <g key={`e-${r.id}-${i}`}>
            <line x1={mx} y1={my} x2={mx + dx * 2} y2={my + dy * 2} stroke="#15803d" strokeWidth={0.6} />
            <circle cx={mx + dx * 2} cy={my + dy * 2} r={0.8} fill="#15803d" />
          </g>
        );
      }))}
    </svg>
  );
}

// ─── Geometry helpers ───────────────────────────────────────────────────────

function doorPos(r: PlanRoom, d: PlanOpening) {
  const dw = d.width;
  switch (d.wall) {
    case "N": return { x1: r.x + d.position, y1: r.y, x2: r.x + d.position + dw, y2: r.y,
      arc: `M ${r.x + d.position + dw} ${r.y} A ${dw} ${dw} 0 0 0 ${r.x + d.position} ${r.y + dw}` };
    case "S": return { x1: r.x + d.position, y1: r.y + r.h, x2: r.x + d.position + dw, y2: r.y + r.h,
      arc: `M ${r.x + d.position + dw} ${r.y + r.h} A ${dw} ${dw} 0 0 1 ${r.x + d.position} ${r.y + r.h - dw}` };
    case "W": return { x1: r.x, y1: r.y + d.position, x2: r.x, y2: r.y + d.position + dw,
      arc: `M ${r.x} ${r.y + d.position + dw} A ${dw} ${dw} 0 0 1 ${r.x + dw} ${r.y + d.position}` };
    default:  return { x1: r.x + r.w, y1: r.y + d.position, x2: r.x + r.w, y2: r.y + d.position + dw,
      arc: `M ${r.x + r.w} ${r.y + d.position + dw} A ${dw} ${dw} 0 0 0 ${r.x + r.w - dw} ${r.y + d.position}` };
  }
}

function winPos(r: PlanRoom, w: PlanOpening) {
  switch (w.wall) {
    case "N": return { x1: r.x + w.position, y1: r.y, x2: r.x + w.position + w.width, y2: r.y };
    case "S": return { x1: r.x + w.position, y1: r.y + r.h, x2: r.x + w.position + w.width, y2: r.y + r.h };
    case "W": return { x1: r.x, y1: r.y + w.position, x2: r.x, y2: r.y + w.position + w.width };
    default:  return { x1: r.x + r.w, y1: r.y + w.position, x2: r.x + r.w, y2: r.y + w.position + w.width };
  }
}

function DimLine({ x1, y1, x2, y2, label, vertical }: {
  x1: number; y1: number; x2: number; y2: number; label: string; vertical?: boolean;
}) {
  const t = 2;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return (
    <g stroke={DIMC} strokeWidth={0.4}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {vertical ? (
        <>
          <line x1={x1 - t} y1={y1} x2={x1 + t} y2={y1} />
          <line x1={x2 - t} y1={y2} x2={x2 + t} y2={y2} />
          <text x={x1 - 3} y={my} textAnchor="middle" fontSize={3} fill={DIMC}
            transform={`rotate(-90 ${x1 - 3} ${my})`}>{label}</text>
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - t} x2={x1} y2={y1 + t} />
          <line x1={x2} y1={y2 - t} x2={x2} y2={y2 + t} />
          <text x={mx} y={y1 - 3} textAnchor="middle" fontSize={3} fill={DIMC}>{label}</text>
        </>
      )}
    </g>
  );
}
