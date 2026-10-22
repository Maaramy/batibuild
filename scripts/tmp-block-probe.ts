import { generateFloorPlans } from "../src/lib/floorPlanEngine";
import { roomFurniture } from "../src/lib/furniture";

const variants = generateFloorPlans({ category: "maison", surface: 200, floors: 2 } as any);
const v = variants.find((x) => x.name.includes("Modulaire"))!;
for (const fp of v.floors) {
  for (const room of fp.rooms) {
    if (room.kind !== "buanderie") continue;
    console.log("floor", fp.level, JSON.stringify({ x: room.x, y: room.y, w: room.w, h: room.h }));
    console.log("doors", JSON.stringify(room.doors));
    for (const p of roomFurniture(room, fp)) {
      console.log(" ", p.t, JSON.stringify(p));
    }
  }
}
