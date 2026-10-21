// ============================================================================
// PLAN 2D — PISCINE
// ----------------------------------------------------------------------------
// Un projet piscine ne doit pas être dessiné comme une maison : le bassin est
// rendu en eau (lignes d'eau) et non en pièce pochée, les plages restent des
// espaces extérieurs en pointillés.
// ============================================================================
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { FloorPlan2D } from "./FloorPlan2D";
import { generateFloorPlans } from "@/lib/floorPlanEngine";

describe("FloorPlan2D — plan de piscine", () => {
  const pool = generateFloorPlans({ category: "piscine", surface: 32, floors: 1 })[0].floors[0];

  it("affiche le bassin en eau et les plages en extérieur", () => {
    const html = renderToStaticMarkup(<FloorPlan2D plan={pool} />);
    expect(html).toContain("<svg");
    expect(html).toContain("BASSIN");
    expect(html).toContain("PLAGE NORD");
    // Lignes d'eau du bassin (trait bleu dédié).
    expect(html).toContain("#0284c7");
    // Les plages sont des espaces extérieurs (contour pointillé).
    expect(html).toContain("4 3");
  });

  it("n'invente ni porte ni fenêtre dans le bassin", () => {
    const basin = pool.rooms.find((r) => r.kind === "bassin")!;
    expect(basin.doors).toHaveLength(0);
    expect(basin.windows).toHaveLength(0);
  });
});
