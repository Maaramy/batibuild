import { generateFloorPlans } from "../src/lib/floorPlanEngine";
import { roomFurniture } from "../src/lib/furniture";

const variants = generateFloorPlans({
  category: "villa",
  surface: 180,
  floors: 1,
  plotArea: 600,
  pools: 1,
  works: ["piscine", "jardin", "cuisine_exterieure", "garage"],
} as any);

const v = variants.find((x) => x.styleId === "minimaliste")!;
const f = v.floors[0];

for (const room of f.rooms) {
  for (const p of roomFurniture(room, f)) {
    if (p.t !== "r" || p.noFill || p.dash) continue;
    if (p.w > 1.5 && p.h > 3) {
      console.log("ROOM", room.kind, room.label, room.x, room.y, room.w, room.h);
      console.log("PRIM", p);
    }
  }
}
