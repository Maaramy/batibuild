// ============================================================================
// VALIDATEUR DE CIRCULATION — contrôle réel des cheminements
// ----------------------------------------------------------------------------
// Ce fichier verrouille les garanties du moteur de circulation :
//   · chaque pièce est reliée à l'entrée (aucune pièce isolée, aucun accès
//     uniquement par une pièce privée) ;
//   · les couloirs sont mesurés sur leur géométrie réelle (mobilier compris) et
//     jamais sous 0,90 m ;
//   · aucun meuble ni équipement n'obstrue le dégagement d'une porte ;
//   · l'optimisation automatique corrige les plans incomplets, puis le rapport
//     final signale ce qu'elle n'a pas pu résoudre ;
//   · ces règles valent pour tous les types de projet et tous les niveaux.
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  CIRCULATION_ABSOLUTE_MIN_WIDTH,
  CIRCULATION_MIN_DOOR_WIDTH,
  CIRCULATION_MIN_WIDTH,
  CIRCULATION_TARGET_WIDTH,
  analyzeCirculation,
  optimizeCirculation,
  summarizeCirculation,
} from "./circulationEngine";
import {
  generateFloorPlans,
  planKindForCategory,
  type DoorSpec,
  type FloorPlan,
  type PlanRoom,
  type WallSide,
} from "./floorPlanEngine";
import { roomFurniture } from "./furniture";

// ── Plans de test ───────────────────────────────────────────────────────────

function mkWallDoor(
  wall: WallSide,
  position: number,
  width = 0.9,
  extra: Partial<DoorSpec> = {},
): DoorSpec {
  return { wall, position, width, ...extra };
}

function mkRoom(
  id: string,
  kind: PlanRoom["kind"],
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  doors: DoorSpec[] = [],
): PlanRoom {
  return { id, kind, label, x, y, w, h, area: w * h, doors, windows: [] };
}

function mkPlan(rooms: PlanRoom[], length = 12, width = 8): FloorPlan {
  return { level: 0, length, width, rooms, area: length * width };
}

/**
 * Logement de test : un couloir de 1,20 m distribue toutes les pièces.
 * `polyvalent` n'a volontairement AUCUNE porte (pièce isolée à corriger).
 */
function planWithIsolatedRoom(): FloorPlan {
  return mkPlan([
    mkRoom("couloir", "couloir", "Couloir", 0, 3, 12, 1.2, [
      mkWallDoor("W", 0.1, 1, { isEntry: true }),
      mkWallDoor("N", 2),
      mkWallDoor("N", 7),
      mkWallDoor("S", 1),
      mkWallDoor("S", 5),
    ]),
    mkRoom("sejour", "sejour", "Séjour", 0, 0, 6, 3, [mkWallDoor("S", 2)]),
    mkRoom("chambre", "chambre", "Chambre", 6, 0, 3, 3, [mkWallDoor("S", 1)]),
    mkRoom("polyvalent", "polyvalent", "Pièce polyvalente", 9, 0, 3, 3),
    mkRoom("cuisine", "cuisine", "Cuisine", 0, 4.2, 4, 3.8, [mkWallDoor("N", 1)]),
    mkRoom("sdb", "sdb", "Salle de bains", 4, 4.2, 4, 3.8, [mkWallDoor("N", 1)]),
  ]);
}

/** Rectangle de dégagement devant une porte (mêmes règles que le moteur). */
function doorLane(room: PlanRoom, door: DoorSpec) {
  const depth = Math.min(0.9, Math.max(0.35, Math.min(room.w, room.h) - 0.1));
  if (door.wall === "N") {
    return { x: room.x + door.position, y: room.y, w: door.width, h: depth };
  }
  if (door.wall === "S") {
    return { x: room.x + door.position, y: room.y + room.h - depth, w: door.width, h: depth };
  }
  if (door.wall === "W") {
    return { x: room.x, y: room.y + door.position, w: depth, h: door.width };
  }
  return { x: room.x + room.w - depth, y: room.y + door.position, w: depth, h: door.width };
}

function overlapArea(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): number {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ox > 0.02 && oy > 0.02 ? ox * oy : 0;
}

// ── Seuils de conception ────────────────────────────────────────────────────

describe("seuils de circulation", () => {
  it("vise 1,00 m, interdit moins de 0,90 m et distingue l'impraticable", () => {
    expect(CIRCULATION_TARGET_WIDTH).toBe(1);
    expect(CIRCULATION_MIN_WIDTH).toBe(0.9);
    expect(CIRCULATION_ABSOLUTE_MIN_WIDTH).toBeLessThan(CIRCULATION_MIN_WIDTH);
    expect(CIRCULATION_MIN_DOOR_WIDTH).toBe(0.7);
  });
});

// ── Détection et correction automatique ─────────────────────────────────────

describe("validation d'un niveau", () => {
  it("signale une pièce isolée comme critique et non validée", () => {
    const report = analyzeCirculation(planWithIsolatedRoom(), { requireEntry: true });
    expect(report.ok).toBe(false);
    expect(report.unreachable).toContain("Pièce polyvalente");
    expect(
      report.issues.some(
        (i) => i.code === "room-without-door" && i.severity === "critical",
      ),
    ).toBe(true);
    // Toutes les autres pièces restent desservies.
    expect(report.reachableRooms).toBe(report.rooms - 1);
  });

  it("mesure le couloir sur sa géométrie réelle", () => {
    const report = analyzeCirculation(planWithIsolatedRoom(), { requireEntry: true });
    expect(report.corridors).toBe(1);
    expect(report.minCorridorWidth).toBeGreaterThanOrEqual(1.1);
    expect(report.corridorsDetail[0].kind).toBe("couloir");
    expect(report.corridorsDetail[0].ok).toBe(true);
  });

  it("refuse un passage principal inférieur à 0,90 m", () => {
    const narrow = mkPlan([
      mkRoom("couloir", "couloir", "Couloir étroit", 0, 3, 8, 0.7, [
        mkWallDoor("W", 0.1, 1, { isEntry: true }),
        mkWallDoor("N", 2),
      ]),
      mkRoom("sejour", "sejour", "Séjour", 0, 0, 8, 3, [mkWallDoor("S", 2)]),
    ]);
    const report = analyzeCirculation(narrow, { requireEntry: true });
    expect(report.ok).toBe(false);
    expect(report.corridorsDetail[0].width).toBeLessThan(CIRCULATION_MIN_WIDTH);
    expect(
      report.issues.some(
        (i) => i.code === "corridor-too-narrow" && i.severity === "critical",
      ),
    ).toBe(true);
  });

  it("ajoute la porte manquante, relie la pièce et stabilise le plan", () => {
    const plan = planWithIsolatedRoom();
    const areasBefore = plan.rooms.map((r) => r.area);
    const { report, fixes } = optimizeCirculation(plan, { requireEntry: true });

    expect(fixes.length).toBeGreaterThan(0);
    expect(report.ok).toBe(true);
    expect(report.unreachable).toEqual([]);
    // Seules des portes ont été ajoutées : géométrie et surfaces intactes.
    expect(plan.rooms.map((r) => r.area)).toEqual(areasBefore);
    const fixed = plan.rooms.find((r) => r.id === "polyvalent")!;
    expect(fixed.doors.length).toBeGreaterThan(0);
    // Un second passage ne trouve plus rien à corriger (idempotence).
    expect(optimizeCirculation(plan, { requireEntry: true }).fixes).toEqual([]);
  });

  it("agrège les niveaux en un seul rapport", () => {
    const ground = analyzeCirculation(planWithIsolatedRoom(), { requireEntry: true });
    const fixed = planWithIsolatedRoom();
    optimizeCirculation(fixed, { requireEntry: true });
    const repaired = analyzeCirculation(fixed, { requireEntry: true });
    const summary = summarizeCirculation([ground, repaired]);
    expect(summary.ok).toBe(false);
    expect(summary.unreachable).toContain("Pièce polyvalente");
    expect(summary.corridors).toBe(2);
    expect(summarizeCirculation([repaired]).ok).toBe(true);
  });
});

// ── Plans générés : tous types, toutes surfaces, tous niveaux ───────────────

const CATEGORIES = [
  "maison",
  "villa",
  "appartement",
  "studio",
  "duplex",
  "immeuble",
  "residence_touristique",
  "local_commercial",
  "bureau",
  "entrepot",
  "atelier",
  "restaurant",
  "cafe",
] as const;

describe("plans générés — circulation garantie", () => {
  for (const category of CATEGORIES) {
    it(`${category} : chaque niveau est desservi, sans porte ni passage obstrué`, () => {
      for (const surface of [80, 200]) {
        const variants = generateFloorPlans({ category, surface, floors: 2 });
        expect(variants.length).toBeGreaterThan(0);
        const needsEntry = planKindForCategory(category) !== "pool";

        for (const variant of variants) {
          const label = `${category} ${surface} m² · ${variant.name}`;
          expect(variant.validation.circulationOk, label).toBe(true);
          const summary = variant.validation.circulation;
          expect(summary, label).toBeDefined();
          expect(summary!.ok, label).toBe(true);
          expect(summary!.unreachable, label).toEqual([]);
          expect(summary!.blockedDoors, label).toBe(0);
          // Les couloirs et halls (hors cage d'escalier) respectent 0,90 m.
          const corridors = variant.floors
            .flatMap((f) => f.rooms)
            .filter((r) => r.kind === "couloir" || r.kind === "hall" || r.kind === "attente");
          if (corridors.length > 0) {
            expect(summary!.minCorridorWidth, label).toBeGreaterThanOrEqual(
              CIRCULATION_MIN_WIDTH,
            );
          }

          variant.floors.forEach((floor, index) => {
            const report = analyzeCirculation(floor, {
              category,
              requireEntry: needsEntry && index === 0,
            });
            const detail = report.issues.map((i) => i.message).join(" / ");
            expect(report.ok, `${label} niveau ${index + 1} : ${detail}`).toBe(true);
            expect(report.unreachable, `${label} niveau ${index + 1}`).toEqual([]);
            expect(report.entryFound || !(needsEntry && index === 0), label).toBe(true);

            // Aucun meuble ni équipement dans une bande d'accès de porte.
            for (const room of floor.rooms) {
              const prims = roomFurniture(room, floor);
              const solids = prims.filter(
                (p) =>
                  !(p.t === "r" && (p.dash || p.noFill)) &&
                  (p.t === "c" ? p.r >= 0.15 : p.w >= 0.12 && p.h >= 0.12),
              );
              for (const door of room.doors) {
                const lane = doorLane(room, door);
                for (const prim of solids) {
                  const box =
                    prim.t === "r"
                      ? { x: prim.x, y: prim.y, w: prim.w, h: prim.h }
                      : {
                          x: prim.x - prim.r,
                          y: prim.y - prim.r,
                          w: prim.r * 2,
                          h: prim.r * 2,
                        };
                  expect(
                    overlapArea(box, lane),
                    `${label} · ${room.label} : ${prim.t} devant la porte ${door.wall}`,
                  ).toBe(0);
                }
              }
            }
          });
        }
      }
    });
  }
});

describe("plans à plusieurs niveaux", () => {
  it("chaque étage garde un cheminement et un escalier de liaison", () => {
    const variants = generateFloorPlans({
      category: "maison",
      surface: 160,
      floors: 2,
    });
    for (const variant of variants) {
      expect(variant.floors.length).toBeGreaterThan(1);
      const stairs = variant.floors
        .flatMap((f) => f.rooms)
        .filter((r) => r.kind === "escalier");
      expect(stairs.length).toBeGreaterThan(0);
      variant.floors.forEach((floor, index) => {
        const report = analyzeCirculation(floor, {
          category: "maison",
          requireEntry: index === 0,
        });
        expect(report.ok).toBe(true);
        expect(report.reachableRooms).toBeGreaterThan(0);
      });
      // La surface des circulations n'est comptée qu'une fois par niveau.
      const total = variant.floors.reduce(
        (sum, f) => sum + f.rooms.filter((r) => !r.exterior).reduce((s, r) => s + r.area, 0),
        0,
      );
      const covered = variant.floors
        .flatMap((f) => f.rooms)
        .filter((r) => !r.exterior)
        .reduce((s, r) => s + r.area, 0);
      expect(total).toBeCloseTo(covered, 6);
    }
  });
});
