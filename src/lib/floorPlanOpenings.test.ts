import { describe, expect, it } from "vitest";

import {
  generateFloorPlans,
  repairFloorPlan,
  type FloorPlan,
  type FloorPlanInput,
  type PlanRoom,
  type WallSide,
} from "./floorPlanEngine";

// ============================================================================
// OUVERTURES EXTÉRIEURES DES PLANS ARCHITECTURAUX (2D = 3D)
// ----------------------------------------------------------------------------
// Les 10 variantes doivent comporter une porte d'entrée, une porte de sortie
// de secours sur une AUTRE façade, et des fenêtres sur les façades des pièces
// concernées. Ces ouvertures sont de vraies données du plan (rendues à
// l'identique en 2D et en 3D), bornées à leur mur, sans superposition, et
// sans modifier aucune surface.
// ============================================================================

const TOL = 0.02;

const near = (a: number, b: number) => Math.abs(a - b) < TOL;

const wallLength = (room: PlanRoom, side: WallSide) =>
  side === "N" || side === "S" ? room.w : room.h;

const onFacade = (room: PlanRoom, side: WallSide, plan: FloorPlan) => {
  if (side === "N") return near(room.y, 0);
  if (side === "S") return near(room.y + room.h, plan.width);
  if (side === "W") return near(room.x, 0);
  return near(room.x + room.w, plan.length);
};

/** L'ouverture donne-t-elle sur une cour / un patio (espace extérieur) ? */
function facesCourtyard(
  room: PlanRoom,
  side: WallSide,
  position: number,
  width: number,
  plan: FloorPlan,
): boolean {
  const from = position;
  const to = position + width;
  return plan.rooms.some((other) => {
    if (!other.exterior || other === room) return false;
    if (side === "N") {
      return (
        near(other.y + other.h, room.y) &&
        other.x <= room.x + from + TOL &&
        other.x + other.w >= room.x + to - TOL
      );
    }
    if (side === "S") {
      return (
        near(other.y, room.y + room.h) &&
        other.x <= room.x + from + TOL &&
        other.x + other.w >= room.x + to - TOL
      );
    }
    if (side === "W") {
      return (
        near(other.x + other.w, room.x) &&
        other.y <= room.y + from + TOL &&
        other.y + other.h >= room.y + to - TOL
      );
    }
    return (
      near(other.x, room.x + room.w) &&
      other.y <= room.y + from + TOL &&
      other.y + other.h >= room.y + to - TOL
    );
  });
}

const clonePlan = (plan: FloorPlan): FloorPlan => ({
  ...plan,
  rooms: plan.rooms.map((room) => ({
    ...room,
    doors: room.doors.map((d) => ({ ...d })),
    windows: room.windows.map((w) => ({ ...w })),
  })),
});

const BUILD_PROGRAMMES: { label: string; input: FloorPlanInput }[] = [
  {
    label: "maison plain-pied",
    input: { category: "maison", surface: 120, floors: 1, bedrooms: 2, bathrooms: 1, wcs: 1 },
  },
  {
    label: "maison R+1",
    input: { category: "maison", surface: 150, floors: 2, bedrooms: 3, bathrooms: 2, wcs: 2 },
  },
  {
    label: "villa avec piscine et garage",
    input: {
      category: "villa",
      surface: 260,
      floors: 2,
      bedrooms: 4,
      bathrooms: 3,
      wcs: 3,
      pools: 1,
      garages: 1,
    },
  },
  {
    label: "immeuble R+2",
    input: { category: "immeuble", surface: 500, floors: 3, bedrooms: 6, bathrooms: 4, wcs: 4 },
  },
];

/** Variantes réparées exactement comme la page Plans architecturaux IA. */
function repairedVariants(input: FloorPlanInput) {
  return generateFloorPlans(input).map((variant) => ({
    ...variant,
    floors: variant.floors.map((floor) => repairFloorPlan(clonePlan(floor))),
  }));
}

describe("ouvertures extérieures — 10 variantes", () => {
  it("chaque rez-de-chaussée possède une entrée et une sortie de secours sur deux façades différentes", () => {
    for (const { label, input } of BUILD_PROGRAMMES) {
      const variants = repairedVariants(input);
      expect(variants).toHaveLength(10);

      for (const variant of variants) {
        const ground = variant.floors[0];
        const entries = ground.rooms.flatMap((room) =>
          room.doors.filter((d) => d.isEntry).map((door) => ({ room, door })),
        );
        const exits = ground.rooms.flatMap((room) =>
          room.doors.filter((d) => d.isEmergency).map((door) => ({ room, door })),
        );

        expect(entries, `${label} · ${variant.name} : une seule entrée`).toHaveLength(1);
        expect(exits.length, `${label} · ${variant.name} : sortie de secours`).toBeGreaterThanOrEqual(1);

        const entry = entries[0];
        const exit = exits[0];
        expect(onFacade(entry.room, entry.door.wall, ground)).toBe(true);
        expect(onFacade(exit.room, exit.door.wall, ground)).toBe(true);
        expect(exit.door.wall).not.toBe(entry.door.wall);
        expect(entry.door.width).toBeGreaterThanOrEqual(0.95);
        expect(exit.door.width).toBeGreaterThanOrEqual(0.7);

        for (const { room, door } of [entry, exit]) {
          expect(door.position).toBeGreaterThanOrEqual(-1e-9);
          expect(door.position + door.width).toBeLessThanOrEqual(
            wallLength(room, door.wall) + 1e-9,
          );
        }
      }
    }
  });

  it("les fenêtres sont sur une façade ou sur une cour, dans leur mur, sans superposition", () => {
    for (const { label, input } of BUILD_PROGRAMMES) {
      for (const variant of repairedVariants(input)) {
        for (const floor of variant.floors) {
          for (const room of floor.rooms) {
            const openings = [...room.doors, ...room.windows];
            // Toute ouverture tient dans la longueur réelle de son mur.
            for (const opening of openings) {
              expect(opening.width).toBeGreaterThan(0);
              expect(opening.position).toBeGreaterThanOrEqual(-1e-9);
              expect(opening.position + opening.width).toBeLessThanOrEqual(
                wallLength(room, opening.wall) + 1e-9,
              );
            }
            // Aucune ouverture ne recouvre une autre ouverture du même mur.
            for (let i = 0; i < openings.length; i++) {
              for (let j = i + 1; j < openings.length; j++) {
                const a = openings[i];
                const b = openings[j];
                if (a.wall !== b.wall) continue;
                const overlaps =
                  a.position < b.position + b.width - 0.01 &&
                  a.position + a.width > b.position + 0.01;
                expect(
                  overlaps,
                  `${label} · ${variant.name} · ${room.label} : ouvertures superposées (${a.wall})`,
                ).toBe(false);
              }
            }
            // Chaque fenêtre donne soit sur l'extérieur, soit sur une cour.
            for (const window of room.windows) {
              const exterior =
                onFacade(room, window.wall, floor) ||
                facesCourtyard(room, window.wall, window.position, window.width, floor);
              expect(
                exterior,
                `${label} · ${variant.name} · ${room.label} : fenêtre sans façade ni cour`,
              ).toBe(true);
            }
          }
        }
      }
    }
  });

  it("les ouvertures ne modifient ni dimensions ni surfaces du plan", () => {
    for (const { input } of BUILD_PROGRAMMES) {
      for (const variant of repairedVariants(input)) {
        for (const floor of variant.floors) {
          const withoutOpenings = clonePlan(floor);
          for (const room of withoutOpenings.rooms) {
            room.doors = [];
            room.windows = [];
          }
          const stripped = repairFloorPlan(withoutOpenings);
          expect(stripped.rooms).toHaveLength(floor.rooms.length);
          const geometry = (plan: FloorPlan) =>
            plan.rooms
              .map((r) => [r.id, r.x, r.y, r.w, r.h, r.area].map((v) => (typeof v === "number" ? v.toFixed(6) : v)).join("|"))
              .sort();
          expect(geometry(stripped)).toEqual(geometry(floor));
          expect(stripped.area).toBeCloseTo(floor.area, 6);
        }
      }
    }
  });
});
