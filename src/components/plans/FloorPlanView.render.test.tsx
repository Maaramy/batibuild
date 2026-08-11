import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { generatePlans, type PlanRequest } from "@/convex/planEngine";
import { FloorPlan2D } from "./FloorPlanView";

const REQ: PlanRequest = {
  bienType: "maison",
  surfaceTotale: 400,
  surfaceCouverte: 150,
  floors: 1,
  bedrooms: 3,
  bathrooms: 2,
  wcs: 1,
  hasSalon: true,
  hasSalleAManger: true,
  hasCuisine: true,
  hasBuanderie: true,
  hasDressing: true,
  hasBureau: true,
  hasLocalTechnique: false,
  hasGarage: true,
  hasParking: false,
  hasTerrasse: true,
  hasBalcon: false,
  hasJardin: true,
  hasPiscine: false,
  orientation: "sud",
  entreePosition: "sud",
  facades: 2,
  standing: "standard",
  style: "moderne",
  seed: 2026,
};

describe("FloorPlan2D", () => {
  it("renders a valid SVG for each generated plan", () => {
    const plans = generatePlans(REQ);
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      const html = renderToStaticMarkup(<FloorPlan2D plan={plan} compact showDimensions={false} />);
      expect(html).toContain("<svg");
      expect(html).toContain(`aria-label="Plan architectural`);
      // No NaN in viewBox or coordinates
      expect(html).not.toMatch(/NaN/);
    }
  });

  it("renders the Espace séchage abbreviation", () => {
    const plans = generatePlans(REQ);
    const html = renderToStaticMarkup(<FloorPlan2D plan={plans[0]} compact showDimensions={false} />);
    expect(html).toContain("Séch");
  });

  it("renders dimensions on export mode without errors", () => {
    const plan = generatePlans(REQ)[0];
    const html = renderToStaticMarkup(<FloorPlan2D plan={plan} showDimensions whiteBg />);
    expect(html).toContain("<svg");
    expect(html).toContain("m</text>");
    expect(html).not.toMatch(/NaN/);
  });
});
