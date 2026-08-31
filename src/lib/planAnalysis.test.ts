import { describe, expect, it } from "vitest";
import { generateFloorPlans } from "./floorPlanEngine";
import {
  analyzeFloorPlan,
  MIN_PASSAGE,
  MIN_PASSAGE_COMFORT,
  CEILING_HEIGHT,
} from "./planAnalysis";

const residential = generateFloorPlans({
  category: "maison",
  surface: 130,
  floors: 1,
  bedrooms: 3,
})[0];
const resPlan = residential.floors[0];

const cafe = generateFloorPlans({
  category: "cafe",
  surface: 110,
  floors: 1,
})[0];
const cafePlan = cafe.floors[0];

describe("analyzeFloorPlan — zonage", () => {
  it("répartit toutes les pièces dans des groupes et conserve la surface totale", () => {
    const a = analyzeFloorPlan(resPlan);
    const grouped = a.zoning.groups.reduce((s, g) => s + g.area, 0);
    expect(resPlan.area).toBeGreaterThan(0);
    expect(Math.abs(grouped - resPlan.area)).toBeLessThan(0.01);
    expect(a.zoning.groups.filter((g) => g.rooms.length > 0).length).toBeGreaterThan(1);
  });

  it("détecte les m² de circulation (couloirs / escaliers)", () => {
    const a = analyzeFloorPlan(resPlan);
    expect(a.zoning.circulationM2).toBeGreaterThanOrEqual(0);
    expect(a.zoning.circulationM2).toBeLessThan(resPlan.area);
    expect(Math.abs(a.zoning.usefulM2 - (resPlan.area - a.zoning.circulationM2))).toBeLessThan(0.01);
  });
});

describe("analyzeFloorPlan — ergonomie", () => {
  it("expose une hauteur sous plafond de référence et une largeur de passage", () => {
    const a = analyzeFloorPlan(resPlan);
    expect(a.ergonomics.ceilingHeight).toBe(CEILING_HEIGHT);
    expect(a.ergonomics.minPassage).toBeGreaterThan(0);
  });

  it("est cohérent avec le seuil de passage minimum", () => {
    const a = analyzeFloorPlan(resPlan);
    expect(a.ergonomics.passable).toBe(a.ergonomics.minPassage >= MIN_PASSAGE);
    // INFO: si le passage est très étroit, on doit lever une recommandation critique.
    const hasCritical =
      !a.ergonomics.passable &&
      a.recommendations.some(
        (r) => r.severity === "critical" && r.category === "ergonomie",
      );
    if (a.ergonomics.minPassage < MIN_PASSAGE_COMFORT) {
      expect(
        a.recommendations.some((r) => r.category === "ergonomie"),
      ).toBe(true);
    }
    expect(hasCritical).toBe(a.ergonomics.minPassage < MIN_PASSAGE);
  });
});

describe("analyzeFloorPlan — agencement & lumière", () => {
  it("compte les portes et fenêtres", () => {
    const a = analyzeFloorPlan(resPlan);
    expect(a.layout.totalDoors).toBeGreaterThan(0);
    expect(a.layout.totalWindows).toBeGreaterThan(0);
  });

  it("signale les pièces habitables sans fenêtre", () => {
    const a = analyzeFloorPlan(resPlan);
    const bad = resPlan.rooms
      .filter(
        (r) =>
          ["chambre", "sejour", "cuisine", "bureau", "openspace"].includes(r.kind) &&
          r.windows.length === 0,
      )
      .map((r) => r.label);
    expect(a.layout.roomsWithoutDaylight.map((r) => r.label).sort()).toEqual(
      [...bad].sort(),
    );
  });
});

describe("analyzeFloorPlan — périmètre & score", () => {
  it("génère un score borné et une note conceptuelle associée à la variante", () => {
    const a = analyzeFloorPlan(cafePlan);
    expect(a.score).toBeGreaterThanOrEqual(40);
    expect(a.score).toBeLessThanOrEqual(100);
    expect(cafe.conceptNote.length).toBeGreaterThan(20);
    expect(a.recommendations.length).toBeGreaterThan(0);
  });

  it("reste déterministe", () => {
    expect(analyzeFloorPlan(resPlan)).toEqual(analyzeFloorPlan(resPlan));
  });
});