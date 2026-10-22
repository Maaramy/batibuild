import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { generateFloorPlans } from "@/lib/floorPlanEngine";
import { FloorPlan3DBuilding, STOREY_HEIGHT, storeyElevation } from "./FloorPlan3DBuilding";

describe("FloorPlan3DBuilding — vue globale du bâtiment", () => {
  it("affiche le type de projet et la plage de niveaux réelle", () => {
    const variant = generateFloorPlans({
      category: "bureau",
      surface: 120,
      floors: 2,
      levelSurfaces: [120, 100],
    })[0];
    const html = renderToStaticMarkup(
      <FloorPlan3DBuilding plans={variant.floors} site={variant.site} category="bureau" />,
    );
    expect(html).toContain("Vue 3D globale");
    expect(html).toContain("Bureau");
    expect(html).toContain("RDC → R+1");
    expect(html).toContain("2 niveaux");
  });

  it("empile chaque niveau à sa cote réelle", () => {
    expect(storeyElevation(0)).toBe(0);
    expect(storeyElevation(1)).toBeCloseTo(STOREY_HEIGHT, 6);
    expect(storeyElevation(2)).toBeCloseTo(STOREY_HEIGHT * 2, 6);
    expect(storeyElevation(-1)).toBe(0);
  });
});
