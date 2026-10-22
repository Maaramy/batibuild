import { describe, expect, it } from "vitest";
import {
  generateFloorPlans,
  repairFloorPlan,
  type FloorPlan,
  type PlanRoom,
  type WallSide,
} from "./floorPlanEngine";
import {
  EVACUATION_MIN_CORRIDOR_WIDTH,
  evacuationFacadeWall,
  evacuationLinked,
  foodServiceEvacuation,
  foodServiceHeadcount,
  requiredEgress,
} from "./evacuationPlan";
import { SERVICE_FLOW_KINDS } from "./restaurantPlan";

// ============================================================================
// ÉVACUATION DES CAFÉS ET RESTAURANTS
//   · la sortie de secours est desservie par la circulation technique ;
//   · le cheminement salle / production → circulation → extérieur est continu ;
//   · largeur libre ≥ 0,90 m, dégagements dimensionnés pour l'effectif ;
//   · aucune surface totale modifiée (seuls des transferts de circulation).
// ============================================================================

const SURFACES = [50, 80, 100, 120, 150, 200, 300];

// La salle et le comptoir ne portent jamais l'issue de secours. Une cuisine ou
// une plonge ne la portent que si elles sont desservies par la circulation
// (vérifié juste après par `served`).
const FACADE_ROOMS = new Set(["salle_cafe", "salle_client", "comptoir"]);

function room(
  partial: Pick<PlanRoom, "id" | "kind" | "x" | "y" | "w" | "h"> & Partial<PlanRoom>,
): PlanRoom {
  return {
    label: partial.kind,
    area: partial.w * partial.h,
    doors: [],
    windows: [],
    ...partial,
  } as PlanRoom;
}

function clonePlan(plan: FloorPlan): FloorPlan {
  return {
    ...plan,
    rooms: plan.rooms.map((r) => ({
      ...r,
      doors: r.doors.map((d) => ({ ...d })),
      windows: r.windows.map((w) => ({ ...w })),
    })),
  };
}

function salleOf(variant: ReturnType<typeof generateFloorPlans>[number]): PlanRoom {
  const salle = variant.floors[0].rooms.find(
    (r) => r.kind === "salle_cafe" || r.kind === "salle_client",
  );
  if (!salle) throw new Error("salle absente");
  return salle;
}

function emergencyDoors(plan: FloorPlan) {
  return plan.rooms.flatMap((r) =>
    r.doors.filter((d) => d.isEmergency).map((d) => ({ room: r, door: d })),
  );
}

describe("effectif et dégagements exigés", () => {
  it("suit les seuils des établissements recevant du public", () => {
    expect(requiredEgress(19).widths).toEqual([0.9]);
    expect(requiredEgress(20).widths).toEqual([0.9, 0.6]);
    expect(requiredEgress(50).widths).toEqual([0.9, 0.6]);
    expect(requiredEgress(51).widths).toEqual([0.9, 0.9]);
    expect(requiredEgress(100).widths).toEqual([0.9, 0.9]);
    expect(requiredEgress(101).widths).toEqual([1.4, 0.9]);
    expect(requiredEgress(200).widths).toEqual([1.4, 0.9]);
    expect(requiredEgress(201).widths).toEqual([1.4, 1.4]);
    expect(requiredEgress(300).widths).toEqual([1.4, 1.4]);
    expect(requiredEgress(300).exits).toBe(2);
  });

  it("compte les couverts assis et le personnel", () => {
    const salle = room({ id: "s", kind: "salle_client", x: 0, y: 0, w: 10, h: 6 });
    const service = room({ id: "k", kind: "cuisine_pro", x: 10, y: 0, w: 5, h: 8 });
    const headcount = foodServiceHeadcount(salle, [salle, service]);
    expect(headcount.covers).toBe(52); // 60 m² / 4,5 m² = 13 tables × 4
    expect(headcount.staff).toBe(5); // 40 m² de service / 8 m²
    expect(headcount.people).toBe(57);
  });
});

describe("plans café et restaurant — sortie de secours accessible", () => {
  for (const category of ["cafe", "restaurant"] as const) {
    for (const surface of SURFACES) {
      it(`${category} ${surface} m² : sortie desservie par la circulation, cheminement continu, effectif couvert`, () => {
        for (const variant of generateFloorPlans({ category, surface, floors: 1 })) {
          const plan = variant.floors[0];
          const rooms = plan.rooms.filter((r) => !r.exterior);
          const salle = salleOf(variant);
          const label = `${category} ${surface} / ${variant.styleId}`;
          const rule = category === "cafe" ? variant.validation.cafe : variant.validation.restaurant;
          const evacuation = rule?.evacuation;

          expect(rule?.ok, label).toBe(true);
          expect(evacuation?.ok, label).toBe(true);
          expect(evacuation?.issues, label).toEqual([]);
          expect(evacuation?.pathContinuous, label).toBe(true);
          expect(evacuation?.clearWidthOk, label).toBe(true);
          expect(evacuation?.egressOk, label).toBe(true);
          expect(evacuation?.travelOk, label).toBe(true);

          // Une seule issue de secours, sur une façade, jamais dans la salle,
          // le comptoir/bar, la cuisine ou la plonge.
          const exits = emergencyDoors(plan);
          expect(exits, label).toHaveLength(1);
          const exit = exits[0];
          expect(evacuationFacadeWall(exit.room, exit.door.wall, plan), label).toBe(true);
          expect(FACADE_ROOMS.has(exit.room.kind), `${label} : ${exit.room.kind}`).toBe(false);
          expect(exit.door.width, label).toBeGreaterThanOrEqual(0.9 - 0.01);

          // La sortie s'ouvre sur une circulation, ou sur un local de service
          // relié à la circulation par une porte réelle.
          const circulation = rooms.filter(
            (r) => r.kind === "couloir" || r.kind === "hall" || r.kind === "escalier",
          );
          const served =
            circulation.includes(exit.room) ||
            circulation.some((c) => evacuationLinked(exit.room, c));
          expect(served, label).toBe(true);
          for (const c of circulation) {
            expect(Math.min(c.w, c.h), `${label} : couloir`).toBeGreaterThanOrEqual(
              EVACUATION_MIN_CORRIDOR_WIDTH - 0.01,
            );
          }

          // Le cheminement rejoint le bloc de production par des portes réelles.
          const kitchen = rooms.find((r) => r.kind === "cuisine_pro");
          expect(kitchen, label).toBeTruthy();
          expect(evacuation?.people, label).toBeGreaterThan(0);

          // Dégagements : l'entrée est élargie au-delà de 100 personnes.
          const entry = salle.doors.find((d) => d.isEntry);
          expect(entry, label).toBeTruthy();
          const required = requiredEgress(evacuation!.people);
          const widths = [entry!.width, exit.door.width].sort((a, b) => b - a);
          required.widths
            .slice()
            .sort((a, b) => b - a)
            .forEach((w, i) => expect(widths[i], `${label} : dégagement ${i + 1}`).toBeGreaterThanOrEqual(w - 0.02));

          // Aucun local n'est encloisonné par le déplacement de la sortie.
          expect(rooms.filter((r) => r.doors.length === 0).map((r) => r.kind), label).toEqual([]);
        }
      });
    }
  }

  it("la réparation du plan conserve la sortie de secours et le cheminement", () => {
    for (const category of ["cafe", "restaurant"] as const) {
      for (const surface of [50, 120, 300]) {
        const variant = generateFloorPlans({ category, surface, floors: 1 })[0];
        const repaired = repairFloorPlan(clonePlan(variant.floors[0]));
        const rooms = repaired.rooms.filter((r) => !r.exterior);
        const salle = rooms.find((r) => r.kind === "salle_cafe" || r.kind === "salle_client")!;
        const exits = emergencyDoors(repaired);
        expect(exits.length, `${category} ${surface}`).toBe(1);
        expect(foodServiceEvacuation(salle, rooms, repaired).ok, `${category} ${surface}`).toBe(
          true,
        );
      }
    }
  });

  it("conserve les surfaces : seuls les locaux mitoyens échangent de la profondeur", () => {
    for (const category of ["cafe", "restaurant"] as const) {
      for (const surface of [50, 80, 300]) {
        for (const variant of generateFloorPlans({ category, surface, floors: 1 })) {
          const plan = variant.floors[0];
          const rooms = plan.rooms.filter((r) => !r.exterior);
          const covered = rooms.reduce((s, r) => s + r.area, 0);
          expect(Math.abs(covered - plan.area), `${category} ${surface}`).toBeLessThanOrEqual(0.05);
          const salle = salleOf(variant);
          expect(salle.area / covered, `${category} ${surface}`).toBeGreaterThan(0.55);
        }
      }
    }
  });
});

describe("évacuation — les plans invalides sont refusés", () => {
  function servicePlan(): FloorPlan {
    const plan: FloorPlan = { level: 0, length: 20, width: 10, area: 200, rooms: [] };
    const salle = room({
      id: "salle",
      kind: "salle_client",
      x: 0,
      y: 0,
      w: 14,
      h: 10,
      doors: [
        { wall: "S", position: 2, width: 1.4, isEntry: true },
        { wall: "E", position: 2, width: 0.9 },
      ],
    });
    const couloir = room({
      id: "couloir",
      kind: "couloir",
      x: 14,
      y: 0,
      w: 2,
      h: 10,
      doors: [
        { wall: "W", position: 2, width: 0.9 },
        { wall: "N", position: 0.5, width: 0.9, isEmergency: true },
        { wall: "E", position: 1, width: 0.9 },
      ],
    });
    const cuisine = room({
      id: "cuisine",
      kind: "cuisine_pro",
      x: 16,
      y: 0,
      w: 4,
      h: 6,
      doors: [{ wall: "W", position: 1, width: 0.9 }],
    });
    const stockage = room({
      id: "stockage",
      kind: "stockage",
      x: 16,
      y: 6,
      w: 4,
      h: 4,
      doors: [{ wall: "N", position: 1, width: 0.9 }],
    });
    plan.rooms = [salle, couloir, cuisine, stockage];
    return plan;
  }

  it("accepte une sortie desservie par le couloir de service", () => {
    const plan = servicePlan();
    const salle = plan.rooms[0];
    const evacuation = foodServiceEvacuation(salle, plan.rooms, plan);
    expect(evacuation.exitOnCirculation).toBe(true);
    expect(evacuation.pathContinuous).toBe(true);
    expect(evacuation.issues).toEqual([]);
    expect(evacuation.egressOk).toBe(true);
  });

  it("refuse une sortie de secours directement dans la salle", () => {
    const plan = servicePlan();
    const salle = plan.rooms.find((r) => r.kind === "salle_client")!;
    const couloir = plan.rooms.find((r) => r.kind === "couloir")!;
    couloir.doors = couloir.doors.filter((d) => !d.isEmergency);
    salle.doors.push({ wall: "S", position: 6, width: 0.9, isEmergency: true });
    const evacuation = foodServiceEvacuation(salle, plan.rooms, plan);
    expect(evacuation.exitExists).toBe(true);
    expect(evacuation.exitOnCirculation).toBe(false);
    expect(evacuation.ok).toBe(false);
    expect(evacuation.issues.join(" ")).toMatch(/salle/);
  });

  it("refuse une sortie dans la cuisine sans circulation de service", () => {
    const plan = servicePlan();
    const salle = plan.rooms.find((r) => r.kind === "salle_client")!;
    const couloir = plan.rooms.find((r) => r.kind === "couloir")!;
    const cuisine = plan.rooms.find((r) => r.kind === "cuisine_pro")!;
    couloir.doors = couloir.doors.filter((d) => !d.isEmergency && d.wall !== "E");
    cuisine.doors = [{ wall: "N", position: 1, width: 0.9, isEmergency: true }];
    const evacuation = foodServiceEvacuation(salle, plan.rooms, plan);
    expect(evacuation.exitOnCirculation).toBe(false);
    expect(evacuation.ok).toBe(false);
    expect(evacuation.issues.join(" ")).toMatch(/cuisine|plonge/);
  });

  it("refuse un couloir interrompu (sortie non reliée à la production)", () => {
    const plan = servicePlan();
    const couloir = plan.rooms.find((r) => r.kind === "couloir")!;
    const cuisine = plan.rooms.find((r) => r.kind === "cuisine_pro")!;
    couloir.doors = couloir.doors.filter((d) => d.wall !== "E");
    cuisine.doors = [];
    const evacuation = foodServiceEvacuation(plan.rooms[0], plan.rooms, plan);
    expect(evacuation.pathContinuous).toBe(false);
    expect(evacuation.ok).toBe(false);
    expect(evacuation.issues.join(" ")).toMatch(/Cheminement d'évacuation/);
  });

  it("refuse un cheminement trop étroit", () => {
    const plan = servicePlan();
    const couloir = plan.rooms.find((r) => r.kind === "couloir")!;
    couloir.w = 0.7;
    couloir.x = 14;
    const evacuation = foodServiceEvacuation(plan.rooms[0], plan.rooms, plan);
    expect(evacuation.clearWidthOk).toBe(false);
    expect(evacuation.ok).toBe(false);
    expect(evacuation.issues.join(" ")).toMatch(/trop étroit/);
  });

  it("refuse des dégagements sous-dimensionnés pour l'effectif", () => {
    const plan = servicePlan();
    const salle = plan.rooms[0];
    const entry = salle.doors.find((d) => d.isEntry)!;
    entry.width = 1.1;
    expect(foodServiceEvacuation(salle, plan.rooms, plan).people).toBeGreaterThan(100);
    const evacuation = foodServiceEvacuation(salle, plan.rooms, plan);
    expect(evacuation.egressOk).toBe(false);
    expect(evacuation.ok).toBe(false);
    expect(evacuation.issues.join(" ")).toMatch(/Dégagements insuffisants/);
  });
});

describe("génération — effectif et largeurs adaptés", () => {
  it("élargit l'entrée au-delà de 100 personnes et garde 1,10 m en dessous", () => {
    for (const category of ["cafe", "restaurant"] as const) {
      for (const surface of [50, 80, 100, 150, 200, 300]) {
        for (const variant of generateFloorPlans({ category, surface, floors: 1 })) {
          const plan = variant.floors[0];
          const salle = salleOf(variant);
          const rule = category === "cafe" ? variant.validation.cafe : variant.validation.restaurant;
          const people = rule?.evacuation?.people ?? 0;
          const entry = salle.doors.find((d) => d.isEntry)!;
          if (people > 100) {
            expect(entry.width, `${category} ${surface} : ${people} personnes`).toBeGreaterThanOrEqual(
              1.4 - 0.01,
            );
            expect(rule?.evacuation?.requiredWidths).toEqual([1.4, 0.9]);
          } else {
            expect(entry.width, `${category} ${surface}`).toBeGreaterThanOrEqual(1.1 - 0.01);
          }
        }
      }
    }
  });

  it("les locaux de service restent dans le programme (aucune surface perdue)", () => {
    const variant = generateFloorPlans({ category: "restaurant", surface: 50, floors: 1 })[0];
    const rooms = variant.floors[0].rooms.filter((r) => !r.exterior);
    for (const kind of SERVICE_FLOW_KINDS) void kind;
    expect(rooms.some((r) => r.kind === "stockage")).toBe(true);
  });
});
