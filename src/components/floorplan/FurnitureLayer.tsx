import type { FloorPlan } from "@/lib/floorPlanEngine";
import { roomFurniture, type MatTag, type Prim } from "@/lib/furniture";

// ============================================================================
// CALQUE MOBILIER (SVG) — rendu du mobilier généré par lib/furniture.ts
// Style « dessin d'architecte » : remplissages très clairs + traits fins encre.
// ============================================================================

const INK_F = "#44403c";

const MAT_FILL: Record<MatTag, string> = {
  wood: "#faf3e2",
  fabric: "#eef2fb",
  white: "#ffffff",
  metal: "#eef1f4",
};

export function FurnitureLayer({ plan, S }: { plan: FloorPlan; S: number }) {
  return (
    <g>
      {plan.rooms.map((room) =>
        (room.exterior ? [] : roomFurniture(room)).map((p, i) => (
          <FurnPrim key={`${room.id}-f${i}`} p={p} S={S} />
        )),
      )}
    </g>
  );
}

function FurnPrim({ p, S }: { p: Prim; S: number }) {
  switch (p.t) {
    case "r":
      return (
        <rect
          x={p.x * S}
          y={p.y * S}
          width={p.w * S}
          height={p.h * S}
          rx={(p.rx ?? 0) * S}
          fill={p.noFill ? "none" : MAT_FILL[p.m ?? "wood"]}
          stroke={INK_F}
          strokeWidth={p.dash ? 0.7 : 0.8}
          strokeDasharray={p.dash ? "3 2.5" : undefined}
          strokeLinejoin="round"
        />
      );
    case "c":
      return (
        <circle
          cx={p.x * S}
          cy={p.y * S}
          r={p.r * S}
          fill={p.noFill ? "none" : MAT_FILL[p.m ?? "wood"]}
          stroke={INK_F}
          strokeWidth={0.7}
        />
      );
    case "l":
      return (
        <line
          x1={p.x1 * S}
          y1={p.y1 * S}
          x2={p.x2 * S}
          y2={p.y2 * S}
          stroke={INK_F}
          strokeWidth={0.6}
        />
      );
  }
}
