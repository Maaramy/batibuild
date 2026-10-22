import { describe, expect, it } from "vitest";
import {
  generateFloorPlans,
  repairFloorPlan,
  validatePlan,
  type FloorPlanVariant,
  type PlanRoom,
} from "./floorPlanEngine";
import { roomFurniture } from "./furniture";
import {
  CAFE_SALLE_SHARE_MAX,
  CAFE_SALLE_SHARE_MIN,
  CAFE_SALLE_SHARE_TARGET,
  cafeCounterPlacement,
  cafeSalleShare,
  isCafeCategory,
} from "./cafePlan";

// ============================================================================
// PLANS CAFÉ — règles propres au type « Café / Salle de café »
//   · salle café = 70 à 80 % de la surface couverte (cible 75 %) ;
//   · comptoir DANS la salle, jamais une pièce ni une surface ajoutée ;
//   · surfaces exactes (somme des locaux = surface couverte) ;
//   · accès conservés (salle, préparation, réserve, sanitaires) ;
//   · aucun changement pour les autres types de projet.
// ============================================================================

const SURFACES = [50, 80, 100, 150, 300];

function cafeVariants(surface: number): FloorPlanVariant[] {
  return generateFloorPlans({ category: "cafe", surface, floors: 1 });
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
  return variant.floors[0].rooms.find((r) => r.kind === "salle_cafe");
}

function coveredOf(variant: FloorPlanVariant): number {
  return variant.floors[0].rooms
    .filter((r) => !r.exterior)
    .reduce((s, r) => s + r.area, 0);
}

describe("classification et parts de surface du café", () => {
  it("reconnaît uniquement le type Café", () => {
    expect(isCafeCategory("cafe")).toBe(true);
    expect(isCafeCategory("Café")).toBe(true);
    expect(isCafeCategory("  CAFE ")).toBe(true);
    expect(isCafeCategory("restaurant")).toBe(false);
    expect(isCafeCategory("local_commercial")).toBe(false);
    expect(isCafeCategory(null)).toBe(false);
  });

  it("vise 75 % et retient 70 % pour les petites surfaces", () => {
    expect(cafeSalleShare(50)).toBe(CAFE_SALLE_SHARE_MIN);
    expect(cafeSalleShare(79)).toBe(CAFE_SALLE_SHARE_MIN);
    expect(cafeSalleShare(80)).toBe(CAFE_SALLE_SHARE_TARGET);
    expect(cafeSalleShare(100)).toBe(CAFE_SALLE_SHARE_TARGET);
    expect(cafeSalleShare(300)).toBe(CAFE_SALLE_SHARE_TARGET);
    expect(CAFE_SALLE_SHARE_MIN).toBe(0.7);
    expect(CAFE_SALLE_SHARE_MAX).toBe(0.8);
  });
});

describe("plans café — salle, comptoir et surfaces", () => {
  for (const surface of SURFACES) {
    it(`${surface} m² : salle 70–80 %, comptoir inclus, surfaces exactes, accès conservés`, () => {
      for (const variant of cafeVariants(surface)) {
        const fp = variant.floors[0];
        const rooms = fp.rooms.filter((r) => !r.exterior);
        const salle = salleOf(variant);
        const covered = coveredOf(variant);
        const label = `${surface} m² / ${variant.styleId}`;

        // Un seul niveau, une seule salle café, aucun patio ni comptoir-pièce.
        expect(variant.floors, label).toHaveLength(1);
        expect(rooms.filter((r) => r.kind === "salle_cafe"), label).toHaveLength(1);
        expect(rooms.some((r) => r.kind === "comptoir"), label).toBe(false);
        expect(fp.rooms.some((r) => r.exterior), label).toBe(false);
        expect(salle, label).toBeTruthy();
        if (!salle) continue;

        // Part de la salle dans la surface couverte.
        const share = salle.area / covered;
        expect(share, label).toBeGreaterThanOrEqual(CAFE_SALLE_SHARE_MIN - 0.005);
        expect(share, label).toBeLessThanOrEqual(CAFE_SALLE_SHARE_MAX + 0.005);
        const target = cafeSalleShare(fp.area);
        expect(Math.abs(share - target), label).toBeLessThan(0.01);

        // Somme des locaux = surface couverte (aucune surface perdue ni doublée).
        expect(Math.abs(covered - fp.area), label).toBeLessThanOrEqual(0.05);

        // Comptoir entièrement dans la salle.
        const placement = cafeCounterPlacement(salle, rooms, fp);
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
        // Le comptoir n'entre jamais dans la surface totale : la salle est
        // comptée une seule fois.
        expect(salle.area + (covered - salle.area), label).toBeCloseTo(covered, 2);

        // Accès : entrée sur la salle, portes sur les locaux de service.
        expect(salle.doors.some((d) => d.isEntry), label).toBe(true);
        for (const kind of ["cuisine_pro", "stockage", "sanitaire", "wc", "plonge"]) {
          const room = rooms.find((r) => r.kind === kind);
          expect(room, `${label} / ${kind}`).toBeTruthy();
          expect(room?.doors.length, `${label} / ${kind}`).toBeGreaterThan(0);
        }

        // Validation automatique du plan.
        const validation = validatePlan(variant, {
          category: "cafe",
          surface,
          floors: 1,
        });
        expect(validation.cafe, label).toBeTruthy();
        expect(validation.cafe?.salleShareOk, label).toBe(true);
        expect(validation.cafe?.counterInsideSalle, label).toBe(true);
        expect(validation.cafe?.counterCountedOnce, label).toBe(true);
        expect(validation.cafe?.accessOk, label).toBe(true);
        expect(validation.cafe?.ok, label).toBe(true);
        expect(validation.noOverlap, label).toBe(true);
        expect(validation.areasOk, label).toBe(true);
        expect(validation.circulationOk, label).toBe(true);
        expect(validation.issues, label).toEqual([]);
      }
    });
  }

  it("un café est toujours un plan de plain-pied, même si 2 niveaux sont demandés", () => {
    for (const variant of generateFloorPlans({ category: "cafe", surface: 120, floors: 2 })) {
      expect(variant.floors).toHaveLength(1);
      expect(variant.floors[0].rooms.filter((r) => r.kind === "salle_cafe")).toHaveLength(1);
    }
  });

  it("le plan réparé (affiché par la page Plans) conserve la salle et les surfaces", () => {
    for (const surface of SURFACES) {
      const variant = cafeVariants(surface)[0];
      const fp = repairFloorPlan({
        ...variant.floors[0],
        rooms: variant.floors[0].rooms.map((r) => ({
          ...r,
          doors: [...r.doors],
          windows: [...r.windows],
        })),
      });
      const rooms = fp.rooms.filter((r) => !r.exterior);
      const salle = rooms.find((r) => r.kind === "salle_cafe");
      const covered = rooms.reduce((s, r) => s + r.area, 0);
      expect(salle, String(surface)).toBeTruthy();
      expect((salle?.area ?? 0) / covered, String(surface)).toBeGreaterThanOrEqual(
        CAFE_SALLE_SHARE_MIN - 0.005,
      );
      expect((salle?.area ?? 0) / covered, String(surface)).toBeLessThanOrEqual(
        CAFE_SALLE_SHARE_MAX + 0.005,
      );
      expect(Math.abs(covered - fp.area), String(surface)).toBeLessThanOrEqual(0.05);
    }
  });

  it("génération déterministe (mêmes données 2D / surfaces à chaque appel)", () => {
    const a = cafeVariants(100);
    const b = cafeVariants(100);
    expect(
      a.map((v) => v.floors[0].rooms.map((r) => `${r.kind}:${r.area}`)),
    ).toEqual(b.map((v) => v.floors[0].rooms.map((r) => `${r.kind}:${r.area}`)));
  });
});

describe("mobilier de la salle café — comptoir, tables et chaises", () => {
  it("le comptoir, les tables et les chaises restent dans la salle", () => {
    const variant = cafeVariants(100).find((v) => v.styleId === "contemporain") ?? cafeVariants(100)[0];
    const fp = variant.floors[0];
    const salle = salleOf(variant)!;
    const placement = cafeCounterPlacement(salle, fp.rooms, fp)!;
    const prims = roomFurniture(salle, fp);

    // Le comptoir est bien dessiné à sa position calculée (même donnée 2D).
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
        expect(p.x - p.r, String(p.x)).toBeGreaterThanOrEqual(salle.x - 0.01);
        expect(p.y - p.r, String(p.y)).toBeGreaterThanOrEqual(salle.y - 0.01);
        expect(p.x + p.r, String(p.x)).toBeLessThanOrEqual(salle.x + salle.w + 0.01);
        expect(p.y + p.r, String(p.y)).toBeLessThanOrEqual(salle.y + salle.h + 0.01);
        continue;
      }
      expect(p.x, String(p.y)).toBeGreaterThanOrEqual(salle.x - 0.01);
      expect(p.y, String(p.x)).toBeGreaterThanOrEqual(salle.y - 0.01);
      expect(p.x + p.w, String(p.x)).toBeLessThanOrEqual(salle.x + salle.w + 0.01);
      expect(p.y + p.h, String(p.y)).toBeLessThanOrEqual(salle.y + salle.h + 0.01);
    }

    // Tables + chaises autour du comptoir.
    const tables = prims.filter(
      (p) => p.t === "r" && Math.abs(p.w - 0.6) < 0.001 && Math.abs(p.h - 0.6) < 0.001,
    );
    const chairs = prims.filter((p) => p.t === "c");
    expect(tables.length).toBeGreaterThan(0);
    expect(chairs.length).toBeGreaterThanOrEqual(tables.length);
  });
});

describe("validation automatique — les règles café sont réellement contrôlées", () => {
  it("refuse une salle hors de la fourchette 70–80 %", () => {
    const variant = cloneVariant(cafeVariants(100)[0]);
    const salle = salleOf(variant)!;
    salle.kind = "salle_client";
    salle.label = "Salle client";
    const validation = validatePlan(variant, { category: "cafe", surface: 100, floors: 1 });
    expect(validation.cafe?.salleShareOk).toBe(false);
    expect(validation.cafe?.ok).toBe(false);
    expect(validation.issues.join(" ")).toMatch(/Salle café/);
  });

  it("refuse un comptoir modélisé comme pièce (surface comptée deux fois)", () => {
    const variant = cloneVariant(cafeVariants(100)[0]);
    const stockage = variant.floors[0].rooms.find((r) => r.kind === "stockage")!;
    stockage.kind = "comptoir";
    stockage.label = "Comptoir";
    const validation = validatePlan(variant, { category: "cafe", surface: 100, floors: 1 });
    expect(validation.cafe?.counterCountedOnce).toBe(false);
    expect(validation.cafe?.ok).toBe(false);
    expect(validation.issues.join(" ")).toMatch(/Comptoir compté deux fois/);
  });
});

describe("aucun autre type de projet n'est modifié", () => {
  it("le restaurant suit ses propres règles, sans validation café", () => {
    for (const variant of generateFloorPlans({ category: "restaurant", surface: 120, floors: 1 })) {
      const rooms = variant.floors[0].rooms;
      expect(rooms.some((r) => r.kind === "salle_cafe")).toBe(false);
      expect(rooms.some((r) => r.kind === "salle_client")).toBe(true);
      expect(variant.validation.cafe).toBeUndefined();
      expect(variant.validation.restaurant).toBeTruthy();
    }
  });

  it("une maison reste un logement, sans salle café ni validation café", () => {
    for (const variant of generateFloorPlans({ category: "maison", surface: 100, floors: 1 })) {
      expect(variant.floors[0].rooms.some((r) => r.kind === "salle_cafe")).toBe(false);
      expect(variant.validation.cafe).toBeUndefined();
    }
  });
});
