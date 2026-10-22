// ============================================================================
// PLANS 3D — SCÉNARIOS DU GROUPE D ET DES NIVEAUX RDC+
// ----------------------------------------------------------------------------
// Vérifie, sur les vrais plans générés par le moteur :
//   1. un projet du Groupe D au RDC ;
//   2. un projet du Groupe D avec RDC et R+1 ;
//   3. un projet du Groupe D avec plusieurs étages ;
//   4. la correspondance des surfaces entre plan 2D, plan 3D et tableau ;
//   5. la navigation entre niveaux et la vue 3D globale.
// Aucune surface n'est recalculée ici : on compare uniquement les données
// produites par le moteur, celles-là mêmes que consomment les deux rendus.
// ============================================================================
import { describe, expect, it } from "vitest";

import { generateFloorPlans, summarizeSurfaces } from "./floorPlanEngine";
import type { FloorPlan } from "./floorPlanEngine";
import { roomFurniture } from "./furniture";
import {
  allowsPlan3D,
  allowsPlan3DLevel,
  allowsPlan3DBuilding,
} from "./plan3dAccess";
import { planBuildingLabel } from "./planPresentation";
import { isMultiLevelCategory } from "@/convex/projectTypes";

const GROUP_D = ["local_commercial", "bureau", "entrepot", "restaurant", "cafe"] as const;

/** Surface couverte du niveau : pièces fermées, hors extérieurs. */
const builtArea = (plan: FloorPlan) =>
  plan.rooms.filter((room) => !room.exterior).reduce((sum, room) => sum + room.area, 0);

/** Total du tableau des surfaces affiché sous le plan (patio exclu). */
const tableArea = (plan: FloorPlan) =>
  summarizeSurfaces(plan)
    .filter((row) => row.kind !== "patio")
    .reduce((sum, row) => sum + row.area, 0);

const firstVariant = (category: string, surface: number, floors: number, levelSurfaces?: number[]) =>
  generateFloorPlans({ category, surface, floors, levelSurfaces })[0];

describe("1 · Groupe D au RDC", () => {
  it.each(GROUP_D)("%s : une vue 3D au RDC, sans vue globale", (category) => {
    const variant = firstVariant(category, 120, 1);
    expect(variant.floors).toHaveLength(1);
    const ground = variant.floors[0];
    expect(ground.level).toBe(0);
    expect(allowsPlan3D(category)).toBe(true);
    expect(allowsPlan3DLevel(category, ground.level)).toBe(true);
    expect(allowsPlan3DBuilding(category, variant.floors.length)).toBe(false);
  });
});

describe("2 · Groupe D avec RDC et R+1", () => {
  it.each(["local_commercial", "bureau", "entrepot"] as const)(
    "%s : deux niveaux réels, deux vues 3D et une vue globale",
    (category) => {
      const variant = firstVariant(category, 120, 2, [120, 100]);
      expect(variant.floors).toHaveLength(2);
      expect(variant.floors.map((f) => f.level)).toEqual([0, 1]);
      for (const floor of variant.floors) {
        expect(allowsPlan3DLevel(category, floor.level), `${category} R+${floor.level}`).toBe(true);
      }
      expect(allowsPlan3DBuilding(category, variant.floors.length)).toBe(true);
      // Le formulaire doit réellement permettre de saisir l'étage.
      expect(isMultiLevelCategory(category), category).toBe(true);

      // Surfaces couvertes réelles : le RDC garde 120 m², l'étage 100 m².
      expect(builtArea(variant.floors[0])).toBeCloseTo(120, 0);
      expect(builtArea(variant.floors[1])).toBeCloseTo(100, 0);
      // L'escalier est présent dans le niveau qui distribue l'étage.
      expect(variant.floors[0].rooms.some((room) => room.kind === "escalier")).toBe(true);
    },
  );

  it("conserve les programmes de plain-pied du restaurant et du café", () => {
    for (const category of ["restaurant", "cafe"] as const) {
      const variant = firstVariant(category, 180, 2);
      expect(variant.floors, category).toHaveLength(1);
      expect(allowsPlan3DLevel(category, 0)).toBe(true);
      expect(allowsPlan3DBuilding(category, variant.floors.length)).toBe(false);
      // Restaurant et café restent des programmes de plain-pied.
      expect(isMultiLevelCategory(category), category).toBe(false);
    }
  });
});

describe("3 · Groupe D avec plusieurs étages", () => {
  it("bureau R+2 : trois niveaux, chacun avec sa propre géométrie", () => {
    const variant = firstVariant("bureau", 150, 3, [150, 120, 100]);
    expect(variant.floors).toHaveLength(3);
    expect(variant.floors.map((f) => f.level)).toEqual([0, 1, 2]);
    for (const floor of variant.floors) {
      expect(allowsPlan3DLevel("bureau", floor.level)).toBe(true);
      expect(floor.rooms.length).toBeGreaterThan(0);
      // La gaine d'escalier est alignée sur tous les niveaux (structure
      // continue) : même position, même surface, d'un étage à l'autre.
      if (floor.level < 2) {
        expect(floor.rooms.some((room) => room.kind === "escalier")).toBe(true);
      }
    }
    expect(allowsPlan3DBuilding("bureau", variant.floors.length)).toBe(true);

    const shaft = (floor: FloorPlan) => floor.rooms.find((room) => room.kind === "escalier");
    const groundShaft = shaft(variant.floors[0]);
    const firstShaft = shaft(variant.floors[1]);
    expect(groundShaft).toBeDefined();
    expect(firstShaft).toBeDefined();
    expect(firstShaft!.x).toBeCloseTo(groundShaft!.x, 1);
    expect(firstShaft!.y).toBeCloseTo(groundShaft!.y, 1);
  });

  it("entrepôt et local commercial acceptent aussi plusieurs niveaux", () => {
    for (const category of ["entrepot", "local_commercial"] as const) {
      const variant = firstVariant(category, 180, 3, [180, 150, 130]);
      expect(variant.floors, category).toHaveLength(3);
      expect(allowsPlan3DBuilding(category, variant.floors.length), category).toBe(true);
    }
  });
});

describe("4 · Correspondance des surfaces 2D / 3D / tableau", () => {
  it.each(GROUP_D)("%s : surfaces identiques dans les deux rendus", (category) => {
    for (const variant of generateFloorPlans({
      category,
      surface: 150,
      floors: 2,
      levelSurfaces: [150, 120],
    }).slice(0, 2)) {
      for (const floor of variant.floors) {
        // Le plan 2D et le plan 3D consomment le MÊME FloorPlan : le tableau
        // des surfaces et la surface couverte doivent donc coïncider.
        expect(tableArea(floor)).toBeCloseTo(builtArea(floor), 2);
        expect(floor.area).toBeCloseTo(
          floor.rooms.reduce((sum, room) => sum + room.area, 0),
          2,
        );
        expect(builtArea(floor)).toBeGreaterThan(0);
      }
      // Le total du bâtiment = somme des surfaces réelles de tous les niveaux.
      expect(variant.surfaces.built).toBeCloseTo(
        variant.floors.reduce((sum, floor) => sum + builtArea(floor), 0),
        1,
      );
    }
  });

  it("aucune surface d'étage n'est dupliquée ni divisée", () => {
    const variant = firstVariant("bureau", 120, 2, [120, 80]);
    const total = variant.floors.reduce((sum, floor) => sum + builtArea(floor), 0);
    // 120 + 80 = 200 m² couverts — et non 100 m² par niveau ni 400 m².
    expect(total).toBeCloseTo(200, 0);
    expect(variant.surfaces.built).toBeCloseTo(200, 1);
  });
});

describe("5 · Navigation entre niveaux et vue globale", () => {
  it("nomme explicitement le bâtiment complet et sa plage de niveaux", () => {
    expect(planBuildingLabel(2)).toBe("Bâtiment complet · RDC → R+1");
    expect(planBuildingLabel(3)).toBe("Bâtiment complet · RDC → R+2");
    expect(planBuildingLabel(1)).toBe("Bâtiment complet");
  });

  it("chaque niveau du Groupe D porte du mobilier ou des équipements", () => {
    for (const category of GROUP_D) {
      const variant = firstVariant(category, 150, 2);
      for (const floor of variant.floors) {
        const primitives = floor.rooms.reduce(
          (sum, room) => sum + roomFurniture(room, floor).length,
          0,
        );
        expect(primitives, `${category} niveau ${floor.level}`).toBeGreaterThan(0);
      }
    }
  });
});
