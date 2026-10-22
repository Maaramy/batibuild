import { describe, expect, it } from "vitest";
import {
  generateFloorPlans,
  repairFloorPlan,
  summarizeSurfaces,
  validatePlan,
  type FloorPlanVariant,
  type PlanRoom,
} from "./floorPlanEngine";
import { roomFurniture } from "./furniture";
import {
  RESTAURANT_SALLE_SHARE,
  RESTAURANT_SALLE_SHARE_MAX,
  RESTAURANT_SALLE_SHARE_MIN,
  isRestaurantCategory,
  restaurantCounterPlacement,
  restaurantCounterToKitchen,
  restaurantKitchenNeighbour,
} from "./restaurantPlan";

// ============================================================================
// PLANS RESTAURANT — règles propres au type « Restaurant »
//   · salle de restauration = 60 % de la surface couverte ;
//   · bar DANS la salle, jamais une pièce ni une surface ajoutée ;
//   · cuisine professionnelle mitoyenne du bar, porte de service + passe-plat ;
//   · surfaces exactes (somme des locaux = surface couverte) ;
//   · aucun changement pour les autres types de projet.
// ============================================================================

const SURFACES = [50, 80, 100, 150, 300];

function restaurantVariants(surface: number): FloorPlanVariant[] {
  return generateFloorPlans({ category: "restaurant", surface, floors: 1 });
}

function cloneVariant(variant: FloorPlanVariant): FloorPlanVariant {
  return {
    ...variant,
    floors: variant.floors.map((f) => ({
      ...f,
      rooms: f.rooms.map((r) => ({
        ...r,
        doors: r.doors.map((d) => ({ ...d })),
        windows: r.windows.map((w) => ({ ...w })),
      })),
    })),
  };
}

function salleOf(variant: FloorPlanVariant): PlanRoom | undefined {
  return variant.floors[0].rooms.find((r) => r.kind === "salle_client");
}

function coveredOf(variant: FloorPlanVariant): number {
  return variant.floors[0].rooms
    .filter((r) => !r.exterior)
    .reduce((s, r) => s + r.area, 0);
}

describe("classification et part de surface du restaurant", () => {
  it("reconnaît uniquement le type Restaurant", () => {
    expect(isRestaurantCategory("restaurant")).toBe(true);
    expect(isRestaurantCategory("Restaurant")).toBe(true);
    expect(isRestaurantCategory("  RESTAURANT ")).toBe(true);
    expect(isRestaurantCategory("cafe")).toBe(false);
    expect(isRestaurantCategory("local_commercial")).toBe(false);
    expect(isRestaurantCategory(null)).toBe(false);
  });

  it("fixe la salle de restauration à 60 % de la surface couverte", () => {
    expect(RESTAURANT_SALLE_SHARE).toBe(0.6);
    expect(RESTAURANT_SALLE_SHARE_MIN).toBeLessThan(RESTAURANT_SALLE_SHARE);
    expect(RESTAURANT_SALLE_SHARE_MAX).toBeGreaterThan(RESTAURANT_SALLE_SHARE);
  });
});

describe("plans restaurant — salle, bar, cuisine et surfaces", () => {
  for (const surface of SURFACES) {
    it(`${surface} m² : salle 60 %, bar inclus, cuisine mitoyenne, surfaces exactes`, () => {
      for (const variant of restaurantVariants(surface)) {
        const fp = variant.floors[0];
        const rooms = fp.rooms.filter((r) => !r.exterior);
        const salle = salleOf(variant);
        const covered = coveredOf(variant);
        const label = `${surface} m² / ${variant.styleId}`;

        // Un seul niveau, une seule salle, aucun bar-pièce.
        expect(variant.floors, label).toHaveLength(1);
        expect(rooms.filter((r) => r.kind === "salle_client"), label).toHaveLength(1);
        expect(rooms.some((r) => r.kind === "comptoir"), label).toBe(false);
        expect(salle, label).toBeTruthy();
        if (!salle) continue;

        // Part de la salle dans la surface couverte : 60 %.
        const share = salle.area / covered;
        expect(share, label).toBeGreaterThanOrEqual(RESTAURANT_SALLE_SHARE_MIN);
        expect(share, label).toBeLessThanOrEqual(RESTAURANT_SALLE_SHARE_MAX);
        expect(Math.abs(share - RESTAURANT_SALLE_SHARE), label).toBeLessThan(0.01);

        // Somme des locaux = surface couverte (aucune surface perdue ni doublée).
        expect(Math.abs(covered - fp.area), label).toBeLessThanOrEqual(0.05);

        // Bar entièrement dans la salle, jamais une surface en plus.
        const placement = restaurantCounterPlacement(salle, rooms, fp);
        expect(placement, label).toBeTruthy();
        if (!placement) continue;
        expect(placement.counter.x, label).toBeGreaterThanOrEqual(salle.x - 0.01);
        expect(placement.counter.y, label).toBeGreaterThanOrEqual(salle.y - 0.01);
        expect(placement.counter.x + placement.counter.w, label).toBeLessThanOrEqual(
          salle.x + salle.w + 0.01,
        );
        expect(placement.counter.y + placement.counter.h, label).toBeLessThanOrEqual(
          salle.y + salle.h + 0.01,
        );
        expect(placement.counterArea, label).toBeLessThan(salle.area);
        expect(salle.area + (covered - salle.area), label).toBeCloseTo(covered, 2);

        // Cuisine mitoyenne, à moins de 2 m du bar, avec passe-plat.
        const kitchen = restaurantKitchenNeighbour(salle, rooms);
        expect(kitchen, label).toBeTruthy();
        expect(placement.kitchen, label).toBe(kitchen);
        const distance = restaurantCounterToKitchen(placement);
        expect(distance, label).not.toBeNull();
        expect(distance ?? 99, label).toBeLessThanOrEqual(2);
        expect(placement.passePlat, label).toBeTruthy();
        expect(placement.passePlat?.width ?? 0, label).toBeGreaterThanOrEqual(0.9);

        // Accès : entrée sur la salle, portes sur les locaux de service.
        expect(salle.doors.some((d) => d.isEntry), label).toBe(true);
        for (const kind of [
          "cuisine_pro",
          "plonge",
          "stockage",
          "chambre_froide",
          "sanitaire",
          "wc",
        ]) {
          const room = rooms.find((r) => r.kind === kind);
          expect(room, `${label} / ${kind}`).toBeTruthy();
          expect(room?.doors.length ?? 0, `${label} / ${kind}`).toBeGreaterThan(0);
        }

        // Validation automatique du plan.
        const validation = validatePlan(variant, {
          category: "restaurant",
          surface,
          floors: 1,
        });
        expect(validation.restaurant, label).toBeTruthy();
        expect(validation.restaurant?.salleShareOk, label).toBe(true);
        expect(validation.restaurant?.counterInsideSalle, label).toBe(true);
        expect(validation.restaurant?.counterCountedOnce, label).toBe(true);
        expect(validation.restaurant?.kitchenNearCounter, label).toBe(true);
        expect(validation.restaurant?.serviceLinkOk, label).toBe(true);
        expect(validation.restaurant?.passePlatOk, label).toBe(true);
        expect(validation.restaurant?.accessOk, label).toBe(true);
        expect(validation.restaurant?.ok, label).toBe(true);
        expect(validation.cafe, label).toBeUndefined();
        expect(validation.noOverlap, label).toBe(true);
        expect(validation.areasOk, label).toBe(true);
        expect(validation.circulationOk, label).toBe(true);
        expect(validation.issues, label).toEqual([]);
      }
    });
  }

  it("un restaurant est toujours un plan de plain-pied, même si 2 niveaux sont demandés", () => {
    for (const variant of generateFloorPlans({ category: "restaurant", surface: 120, floors: 2 })) {
      expect(variant.floors).toHaveLength(1);
      expect(variant.floors[0].rooms.filter((r) => r.kind === "salle_client")).toHaveLength(1);
    }
  });

  it("le tableau des surfaces affiche la salle sans ligne « bar »", () => {
    const variant = restaurantVariants(120)[0];
    const rows = summarizeSurfaces(variant.floors[0]).filter((r) => r.kind !== "patio");
    const salle = rows.find((r) => r.kind === "salle_client");
    expect(salle).toBeTruthy();
    expect(salle?.label).toBe("Salle de restauration");
    expect(rows.some((r) => r.kind === "comptoir")).toBe(false);
    const total = rows.reduce((s, r) => s + r.area, 0);
    expect(salle!.area / total).toBeCloseTo(RESTAURANT_SALLE_SHARE, 2);
    expect(Math.abs(total - variant.floors[0].area)).toBeLessThanOrEqual(0.05);
  });

  it("le plan réparé (affiché par la page Plans) conserve la salle et les surfaces", () => {
    for (const surface of SURFACES) {
      const variant = restaurantVariants(surface)[0];
      const fp = repairFloorPlan({
        ...variant.floors[0],
        rooms: variant.floors[0].rooms.map((r) => ({
          ...r,
          doors: [...r.doors],
          windows: [...r.windows],
        })),
      });
      const rooms = fp.rooms.filter((r) => !r.exterior);
      const salle = rooms.find((r) => r.kind === "salle_client");
      const covered = rooms.reduce((s, r) => s + r.area, 0);
      expect(salle, String(surface)).toBeTruthy();
      expect((salle?.area ?? 0) / covered, String(surface)).toBeCloseTo(
        RESTAURANT_SALLE_SHARE,
        2,
      );
      expect(Math.abs(covered - fp.area), String(surface)).toBeLessThanOrEqual(0.05);
    }
  });

  it("génération déterministe (mêmes données 2D / surfaces à chaque appel)", () => {
    const a = restaurantVariants(100);
    const b = restaurantVariants(100);
    expect(
      a.map((v) => v.floors[0].rooms.map((r) => `${r.kind}:${r.area}`)),
    ).toEqual(b.map((v) => v.floors[0].rooms.map((r) => `${r.kind}:${r.area}`)));
  });
});

describe("mobilier du restaurant — bar, tables et cuisine", () => {
  it("le bar et les tables restent dans la salle, le bar est dessiné à sa position", () => {
    const variant = restaurantVariants(150).find((v) => v.styleId === "contemporain") ??
      restaurantVariants(150)[0];
    const fp = variant.floors[0];
    const salle = salleOf(variant)!;
    const placement = restaurantCounterPlacement(salle, fp.rooms, fp)!;
    const prims = roomFurniture(salle, fp);

    const counter = prims.find(
      (p) =>
        p.t === "r" &&
        Math.abs(p.x - placement.counter.x) < 0.001 &&
        Math.abs(p.y - placement.counter.y) < 0.001 &&
        Math.abs(p.w - placement.counter.w) < 0.001 &&
        Math.abs(p.h - placement.counter.h) < 0.001,
    );
    expect(counter).toBeTruthy();

    for (const p of prims) {
      if (p.t === "l") {
        expect(p.x1).toBeGreaterThanOrEqual(salle.x - 0.01);
        expect(p.y1).toBeGreaterThanOrEqual(salle.y - 0.01);
        expect(p.x1).toBeLessThanOrEqual(salle.x + salle.w + 0.01);
        expect(p.y1).toBeLessThanOrEqual(salle.y + salle.h + 0.01);
        continue;
      }
      if (p.t === "c") {
        expect(p.x - p.r).toBeGreaterThanOrEqual(salle.x - 0.01);
        expect(p.y - p.r).toBeGreaterThanOrEqual(salle.y - 0.01);
        expect(p.x + p.r).toBeLessThanOrEqual(salle.x + salle.w + 0.01);
        expect(p.y + p.r).toBeLessThanOrEqual(salle.y + salle.h + 0.01);
        continue;
      }
      expect(p.x).toBeGreaterThanOrEqual(salle.x - 0.01);
      expect(p.y).toBeGreaterThanOrEqual(salle.y - 0.01);
      expect(p.x + p.w).toBeLessThanOrEqual(salle.x + salle.w + 0.01);
      expect(p.y + p.h).toBeLessThanOrEqual(salle.y + salle.h + 0.01);
    }

    const tables = prims.filter(
      (p) => p.t === "r" && Math.abs(p.w - 0.8) < 0.001 && Math.abs(p.h - 0.8) < 0.001,
    );
    const chairs = prims.filter((p) => p.t === "c");
    expect(tables.length).toBeGreaterThan(0);
    expect(chairs.length).toBeGreaterThanOrEqual(tables.length);

    // Aucune table ne chevauche le bar, le plan de travail ni le passage du
    // personnel ; aucun mobilier ne bloque un débattement de porte.
    const overlaps = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
      a.x + a.w > b.x + 0.002 &&
      b.x + b.w > a.x + 0.002 &&
      a.y + a.h > b.y + 0.002 &&
      b.y + b.h > a.y + 0.002;
    for (const table of tables) {
      if (table.t !== "r") continue;
      expect(overlaps(table, placement.counter)).toBe(false);
      expect(overlaps(table, placement.worktop)).toBe(false);
      expect(overlaps(table, placement.staffAisle)).toBe(false);
    }
    for (const p of prims) {
      if (p.t === "l") continue;
      const box = p.t === "c"
        ? { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 }
        : p;
      for (const door of salle.doors) {
        const depth = Math.max(0.95, door.width + 0.15);
        const clearance =
          door.wall === "N"
            ? { x: salle.x + door.position, y: salle.y, w: door.width, h: depth }
            : door.wall === "S"
              ? { x: salle.x + door.position, y: salle.y + salle.h - depth, w: door.width, h: depth }
              : door.wall === "W"
                ? { x: salle.x, y: salle.y + door.position, w: depth, h: door.width }
                : { x: salle.x + salle.w - depth, y: salle.y + door.position, w: depth, h: door.width };
        expect(overlaps(box, clearance)).toBe(false);
      }
    }
  });

  it("la cuisine professionnelle est aménagée et reste dans ses murs", () => {
    const variant = restaurantVariants(150)[0];
    const fp = variant.floors[0];
    const cuisine = fp.rooms.find((r) => r.kind === "cuisine_pro")!;
    const prims = roomFurniture(cuisine, fp);
    expect(prims.length).toBeGreaterThan(2);
    for (const p of prims) {
      if (p.t === "c") {
        expect(p.x - p.r).toBeGreaterThanOrEqual(cuisine.x - 0.01);
        expect(p.y - p.r).toBeGreaterThanOrEqual(cuisine.y - 0.01);
        expect(p.x + p.r).toBeLessThanOrEqual(cuisine.x + cuisine.w + 0.01);
        expect(p.y + p.r).toBeLessThanOrEqual(cuisine.y + cuisine.h + 0.01);
      }
    }
  });
});

describe("validation automatique — les règles restaurant sont réellement contrôlées", () => {
  it("refuse une salle qui n'occupe pas 60 % de la surface couverte", () => {
    const variant = cloneVariant(restaurantVariants(100)[0]);
    const salle = salleOf(variant)!;
    salle.kind = "polyvalent";
    const validation = validatePlan(variant, { category: "restaurant", surface: 100, floors: 1 });
    expect(validation.restaurant?.salleShareOk).toBe(false);
    expect(validation.restaurant?.ok).toBe(false);
    expect(validation.issues.join(" ")).toMatch(/Salle de restauration/);
  });

  it("refuse un bar modélisé comme pièce (surface comptée deux fois)", () => {
    const variant = cloneVariant(restaurantVariants(100)[0]);
    const stockage = variant.floors[0].rooms.find((r) => r.kind === "stockage")!;
    stockage.kind = "comptoir";
    stockage.label = "Bar";
    const validation = validatePlan(variant, { category: "restaurant", surface: 100, floors: 1 });
    expect(validation.restaurant?.counterCountedOnce).toBe(false);
    expect(validation.restaurant?.ok).toBe(false);
    expect(validation.issues.join(" ")).toMatch(/Bar compté deux fois/);
  });

  it("refuse une cuisine éloignée du bar (aucun accès de service)", () => {
    const variant = cloneVariant(restaurantVariants(150)[0]);
    const cuisine = variant.floors[0].rooms.find((r) => r.kind === "cuisine_pro")!;
    // Déplacer la cuisine hors de la salle : plus de mur mitoyen.
    cuisine.kind = "polyvalent";
    const stockage = variant.floors[0].rooms.find((r) => r.kind === "stockage")!;
    stockage.kind = "cuisine_pro";
    const validation = validatePlan(variant, { category: "restaurant", surface: 150, floors: 1 });
    expect(validation.restaurant?.kitchenNearCounter).toBe(false);
    expect(validation.restaurant?.ok).toBe(false);
  });
});

describe("aucun autre type de projet n'est modifié", () => {
  it("le café conserve sa salle unique et sa validation, sans règle restaurant", () => {
    for (const variant of generateFloorPlans({ category: "cafe", surface: 100, floors: 1 })) {
      const rooms = variant.floors[0].rooms;
      expect(rooms.some((r) => r.kind === "salle_cafe")).toBe(true);
      expect(rooms.some((r) => r.kind === "salle_client")).toBe(false);
      expect(variant.validation.cafe).toBeTruthy();
      expect(variant.validation.restaurant).toBeUndefined();
    }
  });

  it("une maison reste un logement, sans salle de restauration ni validation restaurant", () => {
    for (const variant of generateFloorPlans({ category: "maison", surface: 100, floors: 1 })) {
      const rooms = variant.floors[0].rooms;
      expect(rooms.some((r) => r.kind === "salle_client")).toBe(false);
      expect(variant.validation.restaurant).toBeUndefined();
    }
  });
});
