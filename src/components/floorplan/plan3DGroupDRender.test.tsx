import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { generateFloorPlans } from "@/lib/floorPlanEngine";
import { FloorPlan3D } from "./FloorPlan3D";
import { FloorPlan3DHD } from "./FloorPlan3DHD";
import { FloorPlan3DLegacy } from "./FloorPlan3DLegacy";

const GROUP_D = ["local_commercial", "bureau", "entrepot", "restaurant", "cafe"] as const;

describe("rendu 3D — Groupe D et niveaux RDC+", () => {
  it.each(GROUP_D)("%s : les deux moteurs 3D rendent le niveau sans erreur", (category) => {
    const plan = generateFloorPlans({ category, surface: 120, floors: 1 })[0].floors[0];
    for (const Component of [FloorPlan3DLegacy, FloorPlan3DHD]) {
      const html = renderToStaticMarkup(<Component plan={plan} />);
      expect(html).toContain("rounded-lg");
      expect(html.length).toBeGreaterThan(500);
    }
    // Le dispatcher (flag 3D amélioré) doit également produire une vue.
    const html = renderToStaticMarkup(<FloorPlan3D plan={plan} />);
    expect(html.length).toBeGreaterThan(500);
  });

  it("bureau R+2 : chaque niveau possède sa propre vue 3D", () => {
    const variant = generateFloorPlans({
      category: "bureau",
      surface: 150,
      floors: 3,
      levelSurfaces: [150, 120, 100],
    })[0];
    expect(variant.floors).toHaveLength(3);
    for (const floor of variant.floors) {
      const html = renderToStaticMarkup(<FloorPlan3DLegacy plan={floor} />);
      expect(html).toContain("rounded-lg");
      // Le niveau rendu est bien celui du plan (étiquette et surface réelles).
      expect(floor.level).toBeGreaterThanOrEqual(0);
      expect(floor.rooms.length).toBeGreaterThan(0);
    }
    // Chaque niveau a sa propre emprise et sa propre surface couverte.
    expect(new Set(variant.floors.map((f) => `${f.length}x${f.width}`)).size).toBeGreaterThan(1);
    expect(new Set(variant.floors.map((f) => Math.round(f.area))).size).toBe(3);
  });
});
