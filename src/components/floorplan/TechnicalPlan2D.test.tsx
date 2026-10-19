import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { TechnicalPlan2D } from "./TechnicalPlan2D";
import { generateFloorPlans, repairFloorPlan } from "@/lib/floorPlanEngine";
import { generateElectricalPlan, generatePlumbingPlan } from "@/lib/technicalPlanEngine";

const ALL_LAYERS = {
  architecture: true,
  eau_froide: true,
  eau_chaude: true,
  evacuation: true,
  ventilation: true,
  appareils: true,
  accessoires: true,
  diametres: true,
  cotes: true,
  eclairage: true,
  prises: true,
  specialises: true,
  climatisation: true,
  cheminements: true,
  tableau: true,
  calibres: true,
};

function floorPlan() {
  const variants = generateFloorPlans({
    category: "maison",
    surface: 100,
    floors: 1,
    bedrooms: 2,
    bathrooms: 1,
    kitchens: 1,
    wcs: 1,
  });
  const variant = variants[0];
  return repairFloorPlan({
    ...variant.floors[0],
    rooms: variant.floors[0].rooms.map((r) => ({
      ...r,
      doors: [...r.doors],
      windows: [...r.windows],
    })),
  });
}

describe("TechnicalPlan2D — rendu SVG", () => {
  const plan = floorPlan();
  const plumbing = generatePlumbingPlan({
    level: 0,
    floor: plan,
    floors: [plan],
    context: { dishwasher: true, laundry: true },
  });
  const electrical = generateElectricalPlan({
    level: 0,
    floor: plan,
    floors: [plan],
    context: { airConditioning: true },
  });

  it("superpose la plomberie au plan architectural avec la légende technique", () => {
    const html = renderToStaticMarkup(
      <TechnicalPlan2D plan={plan} technical={plumbing} layers={ALL_LAYERS} />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain(plan.length.toFixed(2));
    expect(html).toContain("Lavabo");
    expect(html).toContain("Colonne de chute");
    expect(html).toContain("Ø20");
    expect(html).toContain("CUISINE");
  });

  it("masque le fond architectural sans perdre les réseaux", () => {
    const html = renderToStaticMarkup(
      <TechnicalPlan2D
        plan={plan}
        technical={plumbing}
        layers={{ ...ALL_LAYERS, architecture: false }}
      />,
    );
    expect(html).not.toContain("CUISINE");
    expect(html).toContain("Lavabo");
  });

  it("rend le plan électrique avec tableau, circuits et calibres calculés", () => {
    const html = renderToStaticMarkup(
      <TechnicalPlan2D plan={plan} technical={electrical} layers={ALL_LAYERS} />,
    );
    expect(html).toContain("TGBT");
    expect(html).toContain("VA foisonnés");
    expect(html).toMatch(/\d+ A · [\d.,]+ mm²/);
  });
});
