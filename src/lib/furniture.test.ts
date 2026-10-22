import { describe, expect, it } from "vitest";

import { generateFloorPlans, type FloorPlan, type PlanRoom } from "./floorPlanEngine";
import { roomFurniture, type RectPrim } from "./furniture";

// Variante 1 : « Contemporain », la première variante du moteur maison.
function contemporain(surface = 100, floors = 1) {
  return generateFloorPlans({ category: "maison", surface, floors })[0];
}

function prims(room: PlanRoom, floor: FloorPlan) {
  return roomFurniture(room, floor);
}

function rects(room: PlanRoom, floor: FloorPlan): RectPrim[] {
  return prims(room, floor).filter((p): p is RectPrim => p.t === "r");
}

function room(floor: FloorPlan, kind: string, label?: string): PlanRoom {
  const found = floor.rooms.find(
    (r) => r.kind === kind && (!label || r.label.includes(label)),
  );
  if (!found) throw new Error(`Pièce ${kind} absente du plan`);
  return found;
}

// Circulation : aucune pièce de ces natures ne porte de mobilier.
const CIRCULATION = new Set(["couloir", "escalier", "patio", "jardin", "bassin", "terrasse"]);

describe("Équipement des pièces — variante 1 « Contemporain »", () => {
  it("équipe toutes les pièces habitables, sur un ou deux niveaux", () => {
    for (const floors of [1, 2]) {
      const variant = contemporain(100, floors);
      for (const floor of variant.floors) {
        for (const piece of floor.rooms) {
          if (piece.exterior || CIRCULATION.has(piece.kind)) continue;
          expect(
            prims(piece, floor).length,
            `${piece.label} (niveau ${floor.level})`,
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  it("meuble le séjour : canapé, tapis, table basse, coin repas", () => {
    const floor = contemporain().floors[0];
    const sejour = room(floor, "sejour");
    const items = prims(sejour, floor);

    // Canapé adossé à un mur (0,88 m de profondeur).
    expect(
      items.some((p) => p.t === "r" && p.m === "fabric" && Math.min(p.w, p.h) >= 0.85),
    ).toBe(true);
    // Tapis et table basse.
    expect(items.some((p) => p.t === "r" && p.dash && p.noFill)).toBe(true);
    expect(
      items.some(
        (p) => p.t === "r" && p.m === "wood" && Math.min(p.w, p.h) >= 0.5 && Math.min(p.w, p.h) <= 0.6,
      ),
    ).toBe(true);
    // Table de repas + chaises dans un séjour sans salle à manger dédiée.
    expect(
      items.some((p) => p.t === "r" && p.m === "wood" && Math.max(p.w, p.h) >= 1.4),
    ).toBe(true);
    expect(items.filter((p) => p.t === "c" && p.ht === 0.45).length).toBeGreaterThanOrEqual(2);
  });

  it("équipe la cuisine : plan de travail, évier, frigo, 4 feux, table", () => {
    const floor = contemporain().floors[0];
    const cuisine = room(floor, "cuisine");
    const items = prims(cuisine, floor);
    const rectsOf = rects(cuisine, floor);

    // Plan de travail + évier + frigo.
    expect(rectsOf.some((p) => p.m === "white" && p.ht === 0.92)).toBe(true);
    expect(rectsOf.some((p) => p.m === "metal" && p.ht === 0.92)).toBe(true);
    expect(rectsOf.some((p) => p.m === "metal" && p.ht === 1.85)).toBe(true);
    // Les 4 feux de la plaque de cuisson.
    expect(items.filter((p) => p.t === "c" && p.r === 0.082).length).toBe(4);
    // Table + chaises.
    expect(rectsOf.some((p) => p.m === "wood" && p.ht === 0.74)).toBe(true);
    expect(items.filter((p) => p.t === "c" && p.ht === 0.45).length).toBeGreaterThanOrEqual(2);
  });

  it("équipe le hall d'entrée et la buanderie", () => {
    const floor = contemporain().floors[0];

    // Hall : meuble d'entrée, tapis de porte, patères.
    const hall = room(floor, "hall");
    const hallRects = rects(hall, floor);
    expect(hallRects.some((p) => p.m === "wood" && p.ht === 1.05)).toBe(true);
    expect(hallRects.some((p) => p.dash && p.noFill)).toBe(true);
    expect(hallRects.some((p) => p.m === "wood" && p.ht === 1.4)).toBe(true);

    // Buanderie : lave-linge + sèche-linge + bac.
    const buanderie = room(floor, "buanderie");
    const laundry = prims(buanderie, floor);
    const laundryRects = rects(buanderie, floor);
    expect(laundryRects.filter((p) => p.m === "white" && p.ht === 0.86).length).toBe(2);
    expect(laundryRects.some((p) => p.m === "metal" && p.ht === 0.88)).toBe(true);
    // Hublots des deux appareils.
    expect(laundry.filter((p) => p.t === "c" && p.r === 0.19).length).toBe(2);
  });

  it("ne place aucun équipement hors de sa pièce", () => {
    for (const floors of [1, 2]) {
      const variant = contemporain(100, floors);
      for (const floor of variant.floors) {
        for (const piece of floor.rooms) {
          for (const p of prims(piece, floor)) {
            if (p.t === "l") continue;
            const minX = p.t === "r" ? p.x : p.x - p.r;
            const minY = p.t === "r" ? p.y : p.y - p.r;
            const maxX = p.t === "r" ? p.x + p.w : p.x + p.r;
            const maxY = p.t === "r" ? p.y + p.h : p.y + p.r;
            expect(minX, `${piece.label} : équipement hors limite ouest`).toBeGreaterThanOrEqual(
              piece.x - 0.02,
            );
            expect(minY, `${piece.label} : équipement hors limite nord`).toBeGreaterThanOrEqual(
              piece.y - 0.02,
            );
            expect(maxX, `${piece.label} : équipement hors limite est`).toBeLessThanOrEqual(
              piece.x + piece.w + 0.02,
            );
            expect(maxY, `${piece.label} : équipement hors limite sud`).toBeLessThanOrEqual(
              piece.y + piece.h + 0.02,
            );
          }
        }
      }
    }
  });
});
