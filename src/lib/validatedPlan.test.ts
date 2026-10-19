import { describe, expect, it } from "vitest";
import { generateFloorPlans } from "./floorPlanEngine";
import {
  countRoomsByKind,
  planDraftFromVariant,
  planProjectFields,
  validatedPlanSummary,
  type ValidatedPlanDraft,
  type ValidatedPlanFloor,
} from "./validatedPlan";

const room = (kind: string, label: string, w: number, h: number) => ({
  id: `${kind}-${label}`,
  kind,
  label,
  w,
  h,
  area: Math.round(w * h * 1000) / 1000,
});

const floor = (level: number, rooms: ReturnType<typeof room>[]): ValidatedPlanFloor => ({
  level,
  area: Math.round(rooms.reduce((sum, r) => sum + r.area, 0) * 100) / 100,
  rooms,
});

const draft = (floors: ValidatedPlanFloor[]): ValidatedPlanDraft => ({
  variantId: "plan-v1",
  variantName: "Variante 1 · Optimisée",
  score: 95,
  footprint: { length: 10, width: 10 },
  totalArea: Math.round(floors.reduce((sum, f) => sum + f.area, 0) * 100) / 100,
  floors,
});

describe("planDraftFromVariant — instantané du plan validé", () => {
  it("conserve les niveaux, les dimensions et les surfaces des pièces", () => {
    const variants = generateFloorPlans({
      category: "maison",
      surface: 200,
      floors: 2,
      bedrooms: 4,
      bathrooms: 2,
      kitchens: 1,
      livingRooms: 1,
      wcs: 1,
    });
    const variant = variants[0];
    const snapshot = planDraftFromVariant(variant);

    expect(snapshot.variantId).toBe(variant.id);
    expect(snapshot.variantName).toBe(variant.name);
    expect(snapshot.floors).toHaveLength(2);
    expect(snapshot.floors.map((f) => f.level)).toEqual([0, 1]);

    const sourceRooms = variant.floors.flatMap((f) => f.rooms);
    const snapshotRooms = snapshot.floors.flatMap((f) => f.rooms);
    expect(snapshotRooms).toHaveLength(sourceRooms.length);
    for (const source of sourceRooms) {
      const copy = snapshotRooms.find((r) => r.id === source.id);
      expect(copy, source.id).toBeTruthy();
      expect(copy!.label).toBe(source.label);
      expect(copy!.kind).toBe(source.kind);
      expect(copy!.w).toBeCloseTo(source.w, 2);
      expect(copy!.h).toBeCloseTo(source.h, 2);
      expect(copy!.area).toBeCloseTo(source.area, 2);
    }
  });

  it("calcule la surface totale à partir des niveaux, jamais du libellé", () => {
    const snapshot = planDraftFromVariant(
      generateFloorPlans({ category: "maison", surface: 180, floors: 2 })[0],
    );
    const sum = snapshot.floors.reduce((s, f) => s + f.area, 0);
    expect(snapshot.totalArea).toBeCloseTo(sum, 2);
    // Le moteur répartit la surface construite entre les niveaux.
    expect(snapshot.totalArea).toBeCloseTo(180, 0);
  });

  it("produit un instantané indépendant de la variante (aucune référence partagée)", () => {
    const variant = generateFloorPlans({ category: "maison", surface: 100 })[0];
    const snapshot = planDraftFromVariant(variant);
    snapshot.floors[0].rooms[0].w = 99;
    expect(variant.floors[0].rooms[0].w).not.toBe(99);
  });
});

describe("planProjectFields — géométrie transmise aux étapes suivantes", () => {
  it("dérive la surface du RDC, les niveaux et les surfaces par niveau", () => {
    const plan = draft([
      floor(0, [room("sejour", "Séjour", 6, 5), room("cuisine", "Cuisine", 3, 3)]),
      floor(1, [room("chambre", "Chambre 1", 4, 4), room("chambre", "Chambre 2", 3.5, 4)]),
    ]);

    const fields = planProjectFields(plan);
    expect(fields.surface).toBe(39);
    expect(fields.floors).toBe(2);
    expect(fields.levelSurfaces).toEqual([39, 30]);
    expect(fields.kitchens).toBe(1);
    expect(fields.livingRooms).toBe(1);
    expect(fields.bedrooms).toBe(2);
  });

  it("compte les pièces par type sur tous les niveaux", () => {
    const plan = draft([
      floor(0, [
        room("sejour", "Séjour", 6, 5),
        room("cuisine", "Cuisine", 3, 3),
        room("sdb", "SDB", 2, 2),
        room("wc", "WC", 1.5, 1.5),
        room("garage", "Garage", 5, 5),
      ]),
      floor(1, [
        room("chambre", "Chambre 1", 4, 4),
        room("chambre", "Chambre 2", 4, 4),
        room("sdb", "SDB étage", 2, 2),
      ]),
    ]);

    const counts = countRoomsByKind(plan.floors);
    expect(counts).toMatchObject({
      bedrooms: 2,
      bathrooms: 2,
      kitchens: 1,
      livingRooms: 1,
      wcs: 1,
      garages: 1,
      total: 8,
    });
    expect(planProjectFields(plan)).toMatchObject({
      bedrooms: 2,
      bathrooms: 2,
      kitchens: 1,
      livingRooms: 1,
      wcs: 1,
      garages: 1,
    });
  });

  it("ordonne les niveaux même si le plan les fournit dans le désordre", () => {
    const plan = draft([
      floor(1, [room("chambre", "Chambre", 4, 4)]),
      floor(0, [room("sejour", "Séjour", 5, 4)]),
    ]);
    const fields = planProjectFields(plan);
    expect(fields.surface).toBe(20);
    expect(fields.levelSurfaces).toEqual([20, 16]);
  });

  it("refuse un plan sans niveau ou avec une surface nulle", () => {
    expect(() => planProjectFields(draft([]))).toThrow(/aucun niveau/i);
    expect(() =>
      planProjectFields(
        draft([
          {
            level: 0,
            area: 0,
            rooms: [{ id: "r", kind: "sejour", label: "Séjour", w: 0, h: 0, area: 0 }],
          },
        ]),
      ),
    ).toThrow(/surface positive/i);
  });

  it("refuse plus de 5 niveaux", () => {
    const plan = draft(
      Array.from({ length: 6 }, (_, level) =>
        floor(level, [room("chambre", `Chambre ${level}`, 3, 3)]),
      ),
    );
    expect(() => planProjectFields(plan)).toThrow(/5 niveaux/i);
  });
});

describe("validatedPlanSummary — lecture affichable", () => {
  it("résume les surfaces, niveaux, pièces et l'emprise", () => {
    const plan = draft([
      floor(0, [room("sejour", "Séjour", 6, 5), room("cuisine", "Cuisine", 3, 3)]),
      floor(1, [room("chambre", "Chambre", 4, 4)]),
    ]);
    expect(validatedPlanSummary(plan)).toEqual({
      surface: 39,
      levels: 2,
      rooms: 3,
      totalArea: 55,
      footprintLabel: "10 × 10 m",
    });
  });

  it("retourne null sans plan", () => {
    expect(validatedPlanSummary(null)).toBeNull();
    expect(validatedPlanSummary(undefined)).toBeNull();
  });
});
