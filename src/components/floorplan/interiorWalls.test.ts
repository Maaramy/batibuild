import { describe, expect, it } from "vitest";

import { courtyardWindows, cutSegment } from "./interiorWalls";
import type { FloorPlan, PlanRoom } from "@/lib/floorPlanEngine";

function room(partial: Partial<PlanRoom>): PlanRoom {
  return {
    id: "r",
    kind: "chambre",
    label: "Pièce",
    x: 0,
    y: 0,
    w: 4,
    h: 3,
    area: 12,
    doors: [],
    windows: [],
    ...partial,
  };
}

describe("courtyardWindows — cohérence 2D ↔ 3D", () => {
  const plan: FloorPlan = {
    level: 0,
    length: 10,
    width: 10,
    area: 100,
    rooms: [
      // Fenêtre de façade (mur ouest) : percée dans l'enveloppe 3D.
      room({
        id: "facade",
        x: 0,
        y: 0,
        w: 2,
        h: 3,
        windows: [{ wall: "W", position: 1, width: 1 }],
      }),
      // Pièce encloisonnée éclairée sur le patio (mur sud, ligne y = 5).
      room({
        id: "interieure",
        x: 2,
        y: 2,
        w: 4,
        h: 3,
        windows: [{ wall: "S", position: 1, width: 1.2 }],
      }),
      // Patio extérieur : aucune ouverture propre.
      room({ id: "patio", kind: "patio", x: 2, y: 5, w: 4, h: 2, exterior: true }),
    ],
  };

  it("ne retourne que les fenêtres des cloisons intérieures", () => {
    const { vertical, horizontal } = courtyardWindows(plan);
    expect(vertical).toHaveLength(0);
    expect(horizontal).toEqual([{ line: 5, a: 3, b: 4.2 }]);
  });

  it("ignore les fenêtres exactement sur l'enveloppe du bâtiment", () => {
    const onEdge = courtyardWindows(plan);
    expect(onEdge.vertical.some((o) => o.line === 0)).toBe(false);
  });
});

describe("cutSegment — percement sans superposition", () => {
  it("découpe le mur autour de l'ouverture", () => {
    const { solids, cuts } = cutSegment(0, 10, [{ a: 3, b: 5 }]);
    expect(cuts).toEqual([{ a: 3, b: 5 }]);
    expect(solids).toEqual([
      { a: 0, b: 3 },
      { a: 5, b: 10 },
    ]);
  });

  it("fusionne les ouvertures qui se chevauchent et borne au segment", () => {
    const { solids, cuts } = cutSegment(2, 8, [
      { a: 3, b: 5 },
      { a: 4, b: 6 },
      { a: 20, b: 30 },
    ]);
    expect(cuts).toEqual([{ a: 3, b: 6 }]);
    expect(solids).toEqual([
      { a: 2, b: 3 },
      { a: 6, b: 8 },
    ]);
  });

  it("gère une ouverture sur toute la longueur (aucun mur plein)", () => {
    const { solids, cuts } = cutSegment(0, 4, [{ a: 0, b: 4 }]);
    expect(solids).toHaveLength(0);
    expect(cuts).toEqual([{ a: 0, b: 4 }]);
  });
});
