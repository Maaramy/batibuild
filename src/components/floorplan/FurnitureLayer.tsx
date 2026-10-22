import type { FloorPlan } from "@/lib/floorPlanEngine";
import { roomFurniture, type MatTag, type Prim } from "@/lib/furniture";

// ============================================================================
// CALQUE MOBILIER (SVG) — rendu du mobilier généré par lib/furniture.ts
// Style « maquette d'architecte » : bois de chêne, textiles lin, appareils
// blancs et inox, traits fins. Même palette que les meubles de la vue 3D.
// ============================================================================

const INK_F = "#6B5B47";

const MAT_FILL: Record<MatTag, string> = {
  wood: "#D9B183",
  fabric: "#E9E0CD",
  white: "#FDFCF9",
  metal: "#D5DBDE",
};

export function FurnitureLayer({ plan, S }: { plan: FloorPlan; S: number }) {
  return (
    <g>
      {plan.rooms.map((room) =>
        (room.exterior ? [] : roomFurniture(room, plan)).map((p, i) => (
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
