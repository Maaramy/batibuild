import { describe, expect, it } from "vitest";
import {
  generateFloorPlans,
  summarizeSurfaces,
  validatePlan,
  type FloorPlanVariant,
  type PlanRoom,
} from "./floorPlanEngine";
import {
  FOOD_PREP_KINDS,
  SANITARY_DEPTH_MIN,
  SANITARY_KINDS,
  SANITARY_PMR_MIN_AREA,
  SANITARY_PMR_WIDTH,
  isFoodPrepKind,
  isSalleKind,
  isSanitaryKind,
  sanitaryAccessReport,
  sanitarySharedWall,
} from "./sanitaryPlan";

// ============================================================================
// WC ET SANITAIRES DES CAFÉS ET RESTAURANTS
//   · bloc contigu adossé à la salle : accès client direct, sans passer par la
//     cuisine professionnelle ni la réserve ;
//   · aucune porte de sanitaire sur la production / le stockage alimentaire ;
//   · proximité de la cuisine conservée (cloison mitoyenne, circulations
//     séparées) ;
//   · dimensions adaptées à la surface disponible, WC PMR si le budget le
//     permet ;
//   · aucune surface ajoutée ni perdue : le tableau des surfaces et le plan
//     restent la même donnée, et les autres types de projets sont inchangés.
// ============================================================================

const SURFACES = [50, 80, 100, 150, 300];
const CATEGORIES = ["restaurant", "cafe"] as const;

function variants(category: string, surface: number): FloorPlanVariant[] {
  return generateFloorPlans({ category, surface, floors: 1 });
}

function roomsOf(variant: FloorPlanVariant): PlanRoom[] {
  return variant.floors[0].rooms.filter((r) => !r.exterior);
}

function salleOf(variant: FloorPlanVariant): PlanRoom | undefined {
  return roomsOf(variant).find((r) => isSalleKind(r.kind));
}

function sanitairesOf(variant: FloorPlanVariant): PlanRoom[] {
  return roomsOf(variant).filter((r) => isSanitaryKind(r.kind));
}

function coveredOf(variant: FloorPlanVariant): number {
  return roomsOf(variant).reduce((s, r) => s + r.area, 0);
}

describe("règles sanitaires — classification", () => {
  it("reconnaît les sanitaires, la salle et les locaux de production", () => {
    expect([...SANITARY_KINDS].sort()).toEqual(["sanitaire", "wc"]);
    expect(isSanitaryKind("wc")).toBe(true);
    expect(isSanitaryKind("sanitaire")).toBe(true);
    expect(isSanitaryKind("cuisine_pro")).toBe(false);
    expect(isSalleKind("salle_client")).toBe(true);
    expect(isSalleKind("salle_cafe")).toBe(true);
    expect(isSalleKind("sejour")).toBe(false);
    expect(isFoodPrepKind("cuisine_pro")).toBe(true);
    expect(isFoodPrepKind("plonge")).toBe(true);
    expect(isFoodPrepKind("chambre_froide")).toBe(true);
    expect(isFoodPrepKind("stockage")).toBe(true);
    expect(isFoodPrepKind("sanitaire")).toBe(false);
    expect([...FOOD_PREP_KINDS]).toHaveLength(4);
  });

  it("mesure une mitoyenneté réelle (mur partagé) uniquement", () => {
    const room = (over: Partial<PlanRoom>): PlanRoom =>
      ({
        id: "r",
        kind: "sanitaire",
        label: "WC",
        x: 0,
        y: 0,
        w: 2,
        h: 2,
        area: 4,
        doors: [],
        windows: [],
        ...over,
      }) as PlanRoom;
    const salle = room({ id: "s", kind: "salle_client", label: "Salle", x: 0, y: 0, w: 5, h: 6 });
    expect(sanitarySharedWall(salle, room({ x: 5, y: 1, w: 1.5, h: 2 }))).toBe("E");
    expect(sanitarySharedWall(salle, room({ x: 1, y: 6, w: 2, h: 1.5 }))).toBe("S");
    expect(sanitarySharedWall(salle, room({ x: 6, y: 1, w: 1.5, h: 2 }))).toBeNull();
  });

  it("signale un sanitaire mal desservi ou ouvert sur la production", () => {
    const base = {
      id: "x",
      kind: "sanitaire" as const,
      label: "WC",
      y: 0,
      w: 1.2,
      h: 2,
      area: 2.4,
      windows: [],
    };
    // Salle à l'ouest, cuisine à l'est, WC entre les deux (mur mitoyen de 2 m).
    const salle = { ...base, id: "s", kind: "salle_client" as const, label: "Salle", x: 0, h: 6, w: 5, doors: [] };
    const cuisine = { ...base, id: "c", kind: "cuisine_pro" as const, label: "Cuisine", x: 6.2, h: 6, w: 3, doors: [] };

    const ok = { ...base, id: "w1", x: 5, doors: [{ wall: "W" as const, position: 0.2, width: 0.8 }] };
    expect(sanitaryAccessReport(salle, [salle, cuisine, ok]).ok).toBe(true);

    const onKitchen = { ...base, id: "w2", x: 5, doors: [{ wall: "E" as const, position: 0.2, width: 0.8 }] };
    const bad = sanitaryAccessReport(salle, [salle, cuisine, onKitchen]);
    expect(bad.ok).toBe(false);
    expect(bad.rooms[0].opensOnFood).toBe(true);
    expect(bad.issues.join(" ")).toMatch(/production/);

    const noDoor = { ...base, id: "w3", x: 5, doors: [] };
    const missing = sanitaryAccessReport(salle, [salle, cuisine, noDoor]);
    expect(missing.ok).toBe(false);
    expect(missing.issues.join(" ")).toMatch(/non desservis/);
  });
});

describe("plans café / restaurant — implantation des sanitaires", () => {
  for (const category of CATEGORIES) {
    for (const surface of SURFACES) {
      it(`${category} ${surface} m² : sanitaires adossés à la salle, jamais sur la production`, () => {
        for (const variant of variants(category, surface)) {
          const rooms = roomsOf(variant);
          const salle = salleOf(variant);
          const sanitaires = sanitairesOf(variant);
          const label = `${category} ${surface} / ${variant.styleId}`;

          expect(salle, label).toBeTruthy();
          if (!salle) continue;
          // Le programme comporte toujours un WC et un bloc sanitaire.
          expect(sanitaires.length, label).toBeGreaterThanOrEqual(2);
          expect(sanitaires.some((r) => r.kind === "wc"), label).toBe(true);

          for (const room of sanitaires) {
            // 1. Mitoyenneté de la salle : accès client direct.
            expect(sanitarySharedWall(salle, room), `${label} / ${room.label}`).not.toBeNull();
            // 2. Une porte sur la salle, et une seule : le WC ne se traverse pas.
            const report = sanitaryAccessReport(salle, rooms);
            const check = report.rooms.find((c) => c.label === room.label)!;
            expect(check.doorOnSalle, `${label} / ${room.label}`).toBe(true);
            expect(check.opensOnFood, `${label} / ${room.label}`).toBe(false);
            expect(
              room.doors.filter((d) => d.wall === (check.salleWall ?? "N")),
              `${label} / ${room.label}`,
            ).toHaveLength(1);
            // 3. Le sanitaire reste utilisable (largeur de passage).
            expect(Math.min(room.w, room.h), `${label} / ${room.label}`).toBeGreaterThanOrEqual(0.9);
          }

          // 4. Proximité de la cuisine : un local de production est mitoyen de
          //    la salle, à côté du bloc sanitaire.
          const kitchen = rooms.find((r) => r.kind === "cuisine_pro");
          expect(kitchen, label).toBeTruthy();
          expect(sanitarySharedWall(salle, kitchen!), label).not.toBeNull();

          // 5. Aucune surface ajoutée ni perdue par le bloc sanitaire.
          expect(Math.abs(coveredOf(variant) - variant.floors[0].area), label).toBeLessThanOrEqual(0.05);
          const surfaces = summarizeSurfaces(variant.floors[0]);
          const sanitaryRows = surfaces.filter((s) => s.kind === "wc" || s.kind === "sanitaire");
          expect(sanitaryRows.length, label).toBe(sanitaires.length);
          const sanitaryTotal = sanitaryRows.reduce((s, r) => s + r.area, 0);
          expect(
            Math.abs(sanitaryTotal - sanitaires.reduce((s, r) => s + r.area, 0)),
            label,
          ).toBeLessThanOrEqual(0.01);

          // 6. La validation le contrôle réellement.
          const validation = validatePlan(variant, { category, surface, floors: 1 });
          expect(validation.issues, label).toEqual([]);
          const rule = category === "cafe" ? validation.cafe : validation.restaurant;
          expect(rule?.sanitaryAccessOk, label).toBe(true);
          expect(rule?.ok, label).toBe(true);
        }
      });
    }
  }

  it("le WC accessible PMR est prévu dès que la surface le permet", () => {
    for (const category of CATEGORIES) {
      // Le budget des sanitaires ne permet une giration de 1,50 m qu'à partir
      // d'environ 80 m² pour un restaurant (40 % de service) et 100 m² pour un
      // café (25 % de service) : en dessous, le WC reste le plus spacieux
      // possible, sans être déclaré accessible (règle « si possible »).
      for (const surface of category === "restaurant" ? [80, 100, 150, 300] : [100, 150, 300]) {
        for (const variant of variants(category, surface)) {
          const wc = roomsOf(variant).find((r) => r.kind === "wc")!;
          const label = `${category} ${surface} / ${variant.styleId}`;
          expect(Math.max(wc.w, wc.h), label).toBeGreaterThanOrEqual(SANITARY_PMR_WIDTH - 0.01);
          expect(Math.min(wc.w, wc.h), label).toBeGreaterThanOrEqual(SANITARY_DEPTH_MIN - 0.01);
          expect(wc.area, label).toBeGreaterThanOrEqual(SANITARY_PMR_MIN_AREA - 0.01);
          const rule = category === "cafe"
            ? validatePlan(variant, { category, surface, floors: 1 }).cafe
            : validatePlan(variant, { category, surface, floors: 1 }).restaurant;
          expect(rule?.pmrOk, label).toBe(true);
        }
      }
    }
  });

  it("un WC n'ouvre jamais sur la cuisine, la plonge, la réserve ou le froid", () => {
    for (const category of CATEGORIES) {
      for (const surface of [50, 100, 300]) {
        for (const variant of variants(category, surface)) {
          const rooms = roomsOf(variant);
          const prep = rooms.filter((r) => isFoodPrepKind(r.kind));
          for (const room of rooms.filter((r) => isSanitaryKind(r.kind))) {
            for (const p of prep) {
              const wall = sanitarySharedWall(room, p);
              if (!wall) continue;
              const horizontal = wall === "N" || wall === "S";
              const origin = horizontal ? room.x : room.y;
              const start = horizontal ? Math.max(room.x, p.x) : Math.max(room.y, p.y);
              const end = horizontal
                ? Math.min(room.x + room.w, p.x + p.w)
                : Math.min(room.y + room.h, p.y + p.h);
              const door = room.doors.find(
                (d) =>
                  d.wall === wall &&
                  origin + d.position < end - 0.002 &&
                  origin + d.position + d.width > start + 0.002,
              );
              expect(door, `${category}/${surface}/${variant.styleId} ${room.label} → ${p.label}`).toBeUndefined();
            }
          }
        }
      }
    }
  });

  it("réorganise les sanitaires sans toucher aux parts de salle ni aux totaux", () => {
    for (const category of CATEGORIES) {
      for (const surface of SURFACES) {
        for (const variant of variants(category, surface)) {
          const salle = salleOf(variant)!;
          const share = salle.area / coveredOf(variant);
          const target = category === "restaurant" ? 0.6 : null;
          const label = `${category} ${surface} / ${variant.styleId}`;
          if (target !== null) expect(share, label).toBeCloseTo(target, 2);
          else {
            expect(share, label).toBeGreaterThanOrEqual(0.69);
            expect(share, label).toBeLessThanOrEqual(0.81);
          }
          // Somme des locaux = surface couverte du niveau (aucune surface double).
          expect(
            Math.abs(coveredOf(variant) - variant.floors[0].length * variant.floors[0].width),
            label,
          ).toBeLessThanOrEqual(0.05);
        }
      }
    }
  });

  it("les autres types de projets restent hors de ces règles", () => {
    for (const category of ["maison", "local_commercial", "bureau", "entrepot"]) {
      for (const variant of generateFloorPlans({ category, surface: 120, floors: 1 })) {
        const validation = validatePlan(variant, { category, surface: 120, floors: 1 });
        expect(validation.cafe, category).toBeUndefined();
        expect(validation.restaurant, category).toBeUndefined();
        expect(roomsOf(variant).some((r) => r.kind === "salle_client"), category).toBe(false);
        expect(roomsOf(variant).some((r) => r.kind === "salle_cafe"), category).toBe(false);
      }
    }
  });
});
