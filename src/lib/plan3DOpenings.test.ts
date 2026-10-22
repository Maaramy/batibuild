import { describe, expect, it } from "vitest";

import { generateFloorPlans } from "./floorPlanEngine";
import {
  doorLeafRotation,
  interiorOpenings3D,
  solidSpans3D,
  type InteriorDoor3D,
} from "./plan3DOpenings";

const TOL = 0.02;

const groundPlan = (category: string) =>
  generateFloorPlans({ category, surface: 130, floors: 1 })[0].floors[0];

describe("ouvertures 3D — portes intérieures", () => {
  it("extrait les portes intérieures des pièces et écarte les issues de façade", () => {
    const plan = groundPlan("maison");
    const interior = interiorOpenings3D(plan);
    expect(interior.doors.length).toBeGreaterThan(0);
    // Toutes les portes retenues sont sur une cloison, jamais sur l'enveloppe.
    for (const door of interior.doors) {
      const max = door.wall === "W" || door.wall === "E" ? plan.length : plan.width;
      expect(door.line).toBeGreaterThan(TOL);
      expect(Math.abs(door.line - max)).toBeGreaterThan(TOL);
    }
    // Les portes d'entrée / secours / service restent dans l'enveloppe.
    expect(interior.doors.some((d) => d.width <= 0)).toBe(false);
  });

  it("ne laisse aucun mur plein traverser une ouverture de porte", () => {
    for (const category of ["maison", "bureau", "entrepot", "cafe"] as const) {
      const plan = groundPlan(category);
      const interior = interiorOpenings3D(plan);
      for (const door of interior.doors) {
        const vertical = door.wall === "W" || door.wall === "E";
        const line = door.line;
        const max = vertical ? plan.width : plan.length;
        const openings = vertical
          ? interior.vertical.get(line) ?? []
          : interior.horizontal.get(line) ?? [];
        const solids = solidSpans3D(0, max, openings);
        for (const solid of solids) {
          const overlap = door.a < solid.b - TOL && door.a + door.width > solid.a + TOL;
          expect(overlap, `${category} porte ${line}:${door.a}`).toBe(false);
        }
      }
    }
  });

  it("oriente les battants vers l'intérieur de la pièce", () => {
    const door = (wall: InteriorDoor3D["wall"], inward: 1 | -1): InteriorDoor3D => ({
      wall,
      line: 4,
      a: 1,
      width: 0.9,
      inward,
    });
    expect(Math.sign(doorLeafRotation(door("W", 1)))).toBe(1);
    expect(Math.sign(doorLeafRotation(door("E", -1)))).toBe(-1);
    expect(Math.sign(doorLeafRotation(door("N", 1)))).toBe(-1);
    expect(Math.sign(doorLeafRotation(door("S", -1)))).toBe(1);
  });
});
