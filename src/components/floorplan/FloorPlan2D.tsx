import { useMemo } from "react";
import type { PlanVariant, PlanRoom } from "@/lib/floorPlanEngine";
import { ROOM_COLORS } from "@/lib/floorPlanEngine";

interface FloorPlan2DProps {
  variant: PlanVariant;
  width?: number;
  height?: number;
}

const INK = "#292524";
const DIMC = "#78716c";
const PAPER = "#fafaf9";
const EXT = 3;
const INT = 1.5;
const PAD = 40;

export function FloorPlan2D({ variant, width = 480, height = 400 }: FloorPlan2DProps) {
  const { rooms, length: L, width: W } = variant;

  const viewBox = useMemo(() => {
    const pad = PAD;
    return `${-pad} ${-pad} ${L + pad * 2} ${W + pad * 2}`;
  }, [L, W]);

  return (
    <svg
      viewBox={viewBox}
      width={width}
      height={height}
      className="w-full h-auto"
      style={{ maxWidth: width }}
    >
      {/* Background */}
      <rect x={-PAD} y={-PAD} width={L + PAD * 2} height={W + PAD * 2} fill={PAPER} />

      {/* Room fills */}
      {rooms.map((r) => (
        <rect
          key={`f-${r.id}`}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          fill={ROOM_COLORS[r.kind] ?? "#f5f5f4"}
          stroke={INK}
          strokeWidth={INT}
        />
      ))}

      {/* Room labels */}
      {rooms.map((r) => {
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const showArea = r.w > 1.8 && r.h > 1.2;
        const showDims = r.w > 2.5 && r.h > 1.8;
        const fontSize = Math.min(1.0, r.w * 0.15);

        return (
          <g key={`l-${r.id}`} textAnchor="middle">
            <text
              x={cx}
              y={showArea ? cy - fontSize * 0.3 : cy + fontSize * 0.3}
              fontSize={fontSize}
              fontWeight={700}
              fill={INK}
            >
              {r.label}
            </text>
            {showArea && (
              <text
                x={cx}
                y={cy + fontSize * 0.9}
                fontSize={fontSize * 0.75}
                fill={DIMC}
              >
                {r.area.toFixed(1)} m²
              </text>
            )}
            {showDims && (
              <text
                x={cx}
                y={cy + fontSize * 1.7}
                fontSize={fontSize * 0.6}
                fill={DIMC}
              >
                {r.w.toFixed(1)} × {r.h.toFixed(1)} m
              </text>
            )}
          </g>
        );
      })}

      {/* Door openings */}
      {rooms.map((r) =>
        r.doors.map((d, i) => {
          const pos = getOpeningPos(r, d.wall, d.position);
          return (
            <g key={`d-${r.id}-${i}`}>
              <line
                x1={pos.x1}
                y1={pos.y1}
                x2={pos.x2}
                y2={pos.y2}
                stroke="#15803d"
                strokeWidth={0.8}
              />
              <path
                d={pos.arc}
                fill="none"
                stroke={DIMC}
                strokeWidth={0.5}
                strokeDasharray="0.3 0.3"
              />
            </g>
          );
        }),
      )}

      {/* Window openings */}
      {rooms.map((r) =>
        r.windows.map((w, i) => {
          const pos = getWindowPos(r, w.wall, w.position, w.width);
          return (
            <g key={`w-${r.id}-${i}`}>
              <line
                x1={pos.x1}
                y1={pos.y1}
                x2={pos.x2}
                y2={pos.y2}
                stroke="#2563eb"
                strokeWidth={1.0}
              />
              <line
                x1={pos.x1}
                y1={pos.y1}
                x2={pos.x2}
                y2={pos.y2}
                stroke="white"
                strokeWidth={0.4}
              />
            </g>
          );
        }),
      )}

      {/* Outer walls – thicker */}
      <rect
        x={0}
        y={0}
        width={L}
        height={W}
        fill="none"
        stroke={INK}
        strokeWidth={EXT}
      />

      {/* Dimension chains */}
      <DimChain x1={0} y1={-12} x2={L} y2={-12} label={`${L.toFixed(1)} m`} />
      <DimChain x1={-12} y1={0} x2={-12} y2={W} label={`${W.toFixed(1)} m`} vertical />
    </svg>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getOpeningPos(room: PlanRoom, wall: string, position: number) {
  const doorW = 0.9;
  switch (wall) {
    case "N":
      return {
        x1: room.x + position,
        y1: room.y,
        x2: room.x + position + doorW,
        y2: room.y,
        arc: `M ${room.x + position + doorW} ${room.y} A ${doorW} ${doorW} 0 0 0 ${room.x + position} ${room.y + doorW}`,
      };
    case "S":
      return {
        x1: room.x + position,
        y1: room.y + room.h,
        x2: room.x + position + doorW,
        y2: room.y + room.h,
        arc: `M ${room.x + position + doorW} ${room.y + room.h} A ${doorW} ${doorW} 0 0 1 ${room.x + position} ${room.y + room.h - doorW}`,
      };
    case "W":
      return {
        x1: room.x,
        y1: room.y + position,
        x2: room.x,
        y2: room.y + position + doorW,
        arc: `M ${room.x} ${room.y + position + doorW} A ${doorW} ${doorW} 0 0 1 ${room.x + doorW} ${room.y + position}`,
      };
    default: // E
      return {
        x1: room.x + room.w,
        y1: room.y + position,
        x2: room.x + room.w,
        y2: room.y + position + doorW,
        arc: `M ${room.x + room.w} ${room.y + position + doorW} A ${doorW} ${doorW} 0 0 0 ${room.x + room.w - doorW} ${room.y + position}`,
      };
  }
}

function getWindowPos(room: PlanRoom, wall: string, position: number, winW: number) {
  switch (wall) {
    case "N":
      return {
        x1: room.x + position,
        y1: room.y,
        x2: room.x + position + winW,
        y2: room.y,
      };
    case "S":
      return {
        x1: room.x + position,
        y1: room.y + room.h,
        x2: room.x + position + winW,
        y2: room.y + room.h,
      };
    case "W":
      return {
        x1: room.x,
        y1: room.y + position,
        x2: room.x,
        y2: room.y + position + winW,
      };
    default: // E
      return {
        x1: room.x + room.w,
        y1: room.y + position,
        x2: room.x + room.w,
        y2: room.y + position + winW,
      };
  }
}

function DimChain({
  x1, y1, x2, y2, label, vertical,
}: {
  x1: number; y1: number; x2: number; y2: number; label: string; vertical?: boolean;
}) {
  const tick = 2;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  return (
    <g stroke={DIMC} strokeWidth={0.4}>
      {vertical ? (
        <>
          <line x1={x1} y1={y1} x2={x2} y2={y2} />
          <line x1={x1 - tick} y1={y1} x2={x1 + tick} y2={y1} />
          <line x1={x2 - tick} y1={y2} x2={x2 + tick} y2={y2} />
          <text
            x={x1 - 3}
            y={my}
            textAnchor="middle"
            fontSize={3}
            fill={DIMC}
            transform={`rotate(-90 ${x1 - 3} ${my})`}
          >
            {label}
          </text>
        </>
      ) : (
        <>
          <line x1={x1} y1={y1} x2={x2} y2={y2} />
          <line x1={x1} y1={y1 - tick} x2={x1} y2={y1 + tick} />
          <line x1={x2} y1={y2 - tick} x2={x2} y2={y2 + tick} />
          <text x={mx} y={y1 - 3} textAnchor="middle" fontSize={3} fill={DIMC}>
            {label}
          </text>
        </>
      )}
    </g>
  );
}
