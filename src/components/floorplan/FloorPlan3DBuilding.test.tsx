import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { generateFloorPlans } from "@/lib/floorPlanEngine";
import { FloorPlan3DBuilding, STOREY_HEIGHT, storeyElevation } from "./FloorPlan3DBuilding";

const variant = generateFloorPlans({
  category: "bureau",
  surface: 120,
  floors: 2,
  levelSurfaces: [120, 100],
})[0];

describe("FloorPlan3DBuilding — vue globale du bâtiment", () => {
  it("affiche le type de projet, la plage de niveaux et le nombre d'étages", () => {
    const html = renderToStaticMarkup(
      <FloorPlan3DBuilding plans={variant.floors} site={variant.site} category="bureau" />,
    );
    expect(html).toContain("Vue 3D globale");
    expect(html).toContain("Bureau");
    expect(html).toContain("RDC → R+1");
    expect(html).toContain("2 niveaux");
    expect(html).toContain("Ajuster");
  });

  it("empile les niveaux à leur cote réelle, sans modifier les surfaces", () => {
    expect(storeyElevation(0)).toBe(0);
    expect(storeyElevation(1)).toBe(STOREY_HEIGHT);
    expect(storeyElevation(3)).toBe(3 * STOREY_HEIGHT);
    // Le composant reçoit exactement les niveaux du moteur : leurs surfaces
    // couvertes restent celles calculées pour la 2D.
    expect(variant.floors).toHaveLength(2);
    expect(
      variant.floors[0].rooms.filter((r) => !r.exterior).reduce((s, r) => s + r.area, 0),
    ).toBeCloseTo(120, 0);
    expect(
      variant.floors[1].rooms.filter((r) => !r.exterior).reduce((s, r) => s + r.area, 0),
    ).toBeCloseTo(100, 0);
  });
});
