import { describe, it, expect } from "vitest";

import {
  ARCHITECTURAL_PLAN_TYPES,
  ARCHITECTURAL_SPECS,
  allArchitecturalSpecs,
  architecturalSpecFor,
  specSignature,
  type ArchitecturalPlanType,
} from "./architecturalSpecs";
import {
  generateFloorPlans,
  VARIANTS_PER_PROJECT,
  type FloorPlanVariant,
} from "./floorPlanEngine";
import {
  generateElectricalPlan,
  generatePlumbingPlan,
} from "./technicalPlanEngine";
import { generateDqe } from "../convex/dqeEngine";

const SPECS = ARCHITECTURAL_PLAN_TYPES.map((category) => ARCHITECTURAL_SPECS[category]);

function plansFor(category: ArchitecturalPlanType, surface?: number): FloorPlanVariant[] {
  const spec = ARCHITECTURAL_SPECS[category];
  return generateFloorPlans({
    category,
    surface: surface ?? spec.surface.default,
    floors: spec.levels.default,
    plotArea: Math.max(600, spec.surface.default * 2.5),
  });
}

const EPS = 0.01;

describe("spécifications architecturales — 14 types", () => {
  it("chaque type dispose d'une spécification complète et propre", () => {
    expect(allArchitecturalSpecs()).toHaveLength(14);
    // Aucune signature dupliquée : aucun type ne réutilise le programme d'un
    // autre (test de non-généricité).
    expect(new Set(SPECS.map(specSignature)).size).toBe(14);

    for (const spec of SPECS) {
      expect(spec.category).toBe(spec.category.toLowerCase());
      expect(spec.spaces.length).toBeGreaterThanOrEqual(4);
      expect(spec.circulation.length).toBeGreaterThan(40);
      expect(spec.equipment.length).toBeGreaterThanOrEqual(2);
      expect(spec.exterior.length).toBeGreaterThanOrEqual(1);
      expect(spec.technical.plumbing.length).toBeGreaterThan(40);
      expect(spec.technical.electrical.length).toBeGreaterThan(40);
      expect(spec.regulation.length).toBeGreaterThanOrEqual(2);
      expect(spec.requiredKinds.length).toBeGreaterThanOrEqual(4);
      expect(spec.questions.length).toBeGreaterThanOrEqual(2);
      expect(spec.assumptions.length).toBeGreaterThanOrEqual(1);
      expect(spec.organization.length).toBeGreaterThan(120);
      expect(spec.levels.min).toBeGreaterThanOrEqual(1);
      expect(spec.levels.max).toBeGreaterThanOrEqual(spec.levels.min);
      expect(spec.surface.min).toBeLessThan(spec.surface.max);
    }
  });

  it("résout les slugs legacy vers la bonne spécification", () => {
    expect(architecturalSpecFor("maison_r_plus_1")?.category).toBe("maison");
    expect(architecturalSpecFor("boutique_commerciale")?.category).toBe("local_commercial");
    expect(architecturalSpecFor("piscine")).toBeNull();
    expect(architecturalSpecFor("")).toBeNull();
  });

  it("pose des questions spécifiques au type (jamais un formulaire unique)", () => {
    const expected: Partial<Record<ArchitecturalPlanType, string>> = {
      maison: "bedrooms",
      appartement: "kitchenOpen",
      villa: "pool",
      immeuble: "unitsPerFloor",
      local_commercial: "salesArea",
      studio: "sleeping",
      duplex: "split",
      bureau: "workstations",
      entrepot: "clearHeight",
      residence_touristique: "capacity",
      projet_neuf: "buildings",
      restaurant: "covers",
      cafe: "counterLength",
      renovation_complete: "existingState",
    };
    for (const category of ARCHITECTURAL_PLAN_TYPES) {
      const spec = ARCHITECTURAL_SPECS[category];
      const ids = spec.questions.map((q) => q.id);
      expect(ids).toContain(expected[category]);
      // Chaque question porte une hypothèse par défaut exploitable.
      for (const question of spec.questions) {
        expect(question.hint.length).toBeGreaterThan(15);
        expect(question.defaultValue).not.toBeUndefined();
      }
    }
  });
});

describe("plans générés — 10 variantes par type", () => {
  for (const category of ARCHITECTURAL_PLAN_TYPES) {
    const spec = ARCHITECTURAL_SPECS[category];

    it(`${spec.label} : 10 variantes valides, dimensionnées et distinctes`, () => {
      const variants = plansFor(category);
      expect(variants).toHaveLength(VARIANTS_PER_PROJECT);
      expect(new Set(variants.map((v) => v.styleId)).size).toBe(VARIANTS_PER_PROJECT);
      expect(new Set(variants.map((v) => v.name)).size).toBe(VARIANTS_PER_PROJECT);

      // 10 partis réellement différents : emprises ET programmes changent.
      const footprints = new Set(
        variants.map((v) => `${v.footprint.length.toFixed(2)}x${v.footprint.width.toFixed(2)}`),
      );
      expect(footprints.size).toBeGreaterThanOrEqual(5);
      const programs = new Set(
        variants.map((v) =>
          [...new Set(v.floors.flatMap((f) => f.rooms.map((r) => r.kind)))].sort().join(","),
        ),
      );
      expect(programs.size).toBeGreaterThanOrEqual(2);
      // Les 10 plans sont réellement différents : aucune géométrie dupliquée.
      const geometries = new Set(
        variants.map((v) =>
          JSON.stringify(
            v.floors.map((f) =>
              f.rooms.map((r) => [r.kind, r.x, r.y, r.w, r.h, r.label]),
            ),
          ),
        ),
      );
      expect(geometries.size).toBe(VARIANTS_PER_PROJECT);

      for (const variant of variants) {
        // Le programme propre au type est présent dans CHAQUE variante.
        const kinds = new Set(variant.floors.flatMap((f) => f.rooms.map((r) => r.kind)));
        for (const kind of spec.requiredKinds) {
          expect(kinds.has(kind), `${category} / ${variant.styleId} : ${kind} manquant`).toBe(true);
        }
        const labels = variant.floors.flatMap((f) => f.rooms.map((r) => r.label));
        for (const signature of spec.signature) {
          expect(
            labels.some((label) => label.includes(signature)),
            `${category} / ${variant.styleId} : libellé « ${signature} » absent`,
          ).toBe(true);
        }

        // Validation spatiale.
        expect(variant.validation.noOverlap, `${category} ${variant.id}`).toBe(true);
        expect(variant.validation.areasOk).toBe(true);
        expect(variant.validation.circulationOk).toBe(true);
        expect(variant.validation.dimensionsOk).toBe(true);
        expect(variant.validation.structureOk).toBe(true);
        expect(variant.validation.exteriorOk).toBe(true);
        expect(variant.validation.surfacesOk).toBe(true);
        expect(variant.validation.score).toBeGreaterThanOrEqual(80);

        // Somme des pièces = surface du niveau (au cm près).
        for (const floor of variant.floors) {
          const sum = floor.rooms.reduce((s, r) => s + r.area, 0);
          expect(Math.abs(sum - floor.area)).toBeLessThan(EPS);
          for (const room of floor.rooms) {
            expect(room.w).toBeGreaterThan(0);
            expect(room.h).toBeGreaterThan(0);
            expect(room.x).toBeGreaterThanOrEqual(-EPS);
            expect(room.y).toBeGreaterThanOrEqual(-EPS);
            expect(room.x + room.w).toBeLessThanOrEqual(floor.length + EPS);
            expect(room.y + room.h).toBeLessThanOrEqual(floor.width + EPS);
          }
        }

        // Surfaces : utile, construite, communes et extérieures séparées.
        const s = variant.surfaces;
        expect(s.interior + s.complementary).toBeCloseTo(s.built, 1);
        expect(s.built).toBeCloseTo(variant.totalArea, 1);
        expect(s.useful ?? s.interior).toBeLessThanOrEqual(s.interior + EPS);
        expect(s.built / variant.floors.length).toBeGreaterThan(
          (spec.surface.default / variant.floors.length) * 0.9,
        );
        expect(s.exterior).toBeCloseTo(s.plot - s.groundBuilt, 1);
        expect(s.garden).toBeGreaterThanOrEqual(0);
        if (category === "immeuble" || category === "projet_neuf") {
          expect(s.common ?? 0).toBeGreaterThan(0);
        }
      }
    });
  }

  it("respecte le nombre de niveaux imposé par chaque type", () => {
    for (const category of ARCHITECTURAL_PLAN_TYPES) {
      const spec = ARCHITECTURAL_SPECS[category];
      const variants = plansFor(category);
      for (const variant of variants) {
        expect(variant.floors).toHaveLength(spec.levels.default);
        if (spec.levels.default > 1) {
          // Escalier continu et emprise identique sur tous les étages.
          const stair = variant.floors[0].rooms.find((r) => r.kind === "escalier");
          expect(stair).toBeDefined();
          for (const floor of variant.floors.slice(1)) {
            const other = floor.rooms.find((r) => r.kind === "escalier");
            expect(other).toBeDefined();
            expect(other!.x).toBeCloseTo(stair!.x, 3);
            expect(other!.y).toBeCloseTo(stair!.y, 3);
            expect(floor.length).toBeCloseTo(variant.floors[0].length, 6);
            expect(floor.width).toBeCloseTo(variant.floors[0].width, 6);
          }
        } else {
          expect(
            variant.floors[0].rooms.some((r) => r.kind === "escalier"),
          ).toBe(false);
        }
        // Chaque niveau est nommé par le moteur (et non par l'interface).
        for (const floor of variant.floors) {
          expect(floor.label).toBeTruthy();
        }
      }
    }
  });

  it("les surfaces s'adaptent réellement à la surface demandée (métrique)", () => {
    for (const category of ARCHITECTURAL_PLAN_TYPES) {
      const spec = ARCHITECTURAL_SPECS[category];
      const small = plansFor(category, spec.surface.min)[0];
      const large = plansFor(category, spec.surface.max)[0];
      expect(
        large.surfaces.built,
        `${category} : ${large.surfaces.built} vs ${small.surfaces.built}`,
      ).toBeGreaterThan(small.surfaces.built * 1.15);
      // Aucun double comptage : bâtie = somme des niveaux, hors extérieurs.
      const sumFloors = large.floors.reduce(
        (s, f) => s + f.rooms.filter((r) => !r.exterior).reduce((a, r) => a + r.area, 0),
        0,
      );
      expect(large.surfaces.built).toBeCloseTo(sumFloors, 1);
      // Le plan de masse ne compte que l'emprise au sol, pas tous les étages.
      expect(large.site.building.area).toBeCloseTo(large.surfaces.footprint, 1);
    }
  });

  it("aucun type ne réutilise le programme d'un autre", () => {
    const fingerprints = new Set<string>();
    for (const category of ARCHITECTURAL_PLAN_TYPES) {
      const variant = plansFor(category)[0];
      const fingerprint = [
        ...new Set(variant.floors.flatMap((f) => f.rooms.map((r) => r.label))),
      ]
        .sort()
        .join("|");
      fingerprints.add(fingerprint);
    }
    expect(fingerprints.size).toBe(ARCHITECTURAL_PLAN_TYPES.length);
  });
});

describe("plans techniques issus de la variante", () => {
  for (const category of ARCHITECTURAL_PLAN_TYPES) {
    it(`${ARCHITECTURAL_SPECS[category].label} : plomberie et électricité cohérentes avec les pièces`, () => {
      const variant = plansFor(category)[0];
      for (const floor of variant.floors) {
        const plumbing = generatePlumbingPlan({
          level: floor.level,
          floor,
          floors: variant.floors,
        });
        expect(plumbing.fixtures.length).toBeGreaterThan(0);
        expect(plumbing.pipes.length).toBeGreaterThan(0);
        expect(plumbing.quantities.length).toBeGreaterThan(0);
        const roomById = new Map(floor.rooms.map((r) => [r.id, r]));
        for (const fixture of plumbing.fixtures) {
          const room = roomById.get(fixture.roomId);
          expect(room, `appareil ${fixture.label} sans pièce`).toBeDefined();
          expect(fixture.x).toBeGreaterThanOrEqual(room!.x - 0.2);
          expect(fixture.x).toBeLessThanOrEqual(room!.x + room!.w + 0.2);
          expect(fixture.y).toBeGreaterThanOrEqual(room!.y - 0.2);
          expect(fixture.y).toBeLessThanOrEqual(room!.y + room!.h + 0.2);
        }

        const electrical = generateElectricalPlan({
          level: floor.level,
          floor,
          floors: variant.floors,
        });
        expect(electrical.points.length).toBeGreaterThan(0);
        expect(electrical.circuits.length).toBeGreaterThan(0);
        expect(electrical.quantities.length).toBeGreaterThan(0);
        for (const point of electrical.points) {
          // Les éclairages extérieurs sont posés 0,55 m devant la façade.
          const margin = point.kind === "luminaire_ext" ? 0.6 : 0.01;
          expect(point.x).toBeGreaterThanOrEqual(-margin);
          expect(point.x).toBeLessThanOrEqual(floor.length + margin);
          expect(point.y).toBeGreaterThanOrEqual(-margin);
          expect(point.y).toBeLessThanOrEqual(floor.width + margin);
        }
        // Tout local humide du plan reçoit au moins un appareil sanitaire.
        const wetRoomIds = new Set(
          floor.rooms
            .filter((r) => ["sdb", "wc", "sanitaire", "cuisine", "cuisine_pro", "plonge"].includes(r.kind))
            .map((r) => r.id),
        );
        if (wetRoomIds.size > 0) {
          expect(plumbing.fixtures.some((f) => wetRoomIds.has(f.roomId))).toBe(true);
        }
      }
    });
  }
});

describe("synchronisation avec le DQE", () => {
  it("les surfaces réelles du plan retenu alimentent le quantitatif", () => {
    for (const category of ARCHITECTURAL_PLAN_TYPES) {
      const spec = ARCHITECTURAL_SPECS[category];
      const variant = plansFor(category)[0];
      const levelSurfaces = variant.floors.map((f) =>
        Number(
          f.rooms
            .filter((r) => !r.exterior)
            .reduce((s, r) => s + r.area, 0)
            .toFixed(2),
        ),
      );
      const surface = spec.surface.default;
      const budget = Math.round(surface * 1200);
      const dqe = generateDqe({
        category,
        surface,
        floors: variant.floors.length,
        totalBudget: budget,
        levelSurfaces,
      });

      expect(dqe.lots.length).toBeGreaterThan(0);
      expect(dqe.referenceTotal).toBe(budget);
      expect(
        dqe.lots.reduce((s, l) => s + (l.allocatedSubtotal ?? l.subtotal), 0),
      ).toBe(budget);
      for (const lot of dqe.lots) {
        expect(lot.lines.length).toBeGreaterThan(0);
        for (const line of lot.lines) {
          // Montant = Quantité × P.U., à l'arrondi d'affichage près.
          expect(Math.abs(line.total - line.quantity * line.unitPrice)).toBeLessThan(2);
        }
      }
      expect(levelSurfaces.reduce((s, v) => s + v, 0)).toBeGreaterThan(0);
    }
  });

  it("une rénovation est chiffrée en travaux, jamais en construction neuve", () => {
    const variant = plansFor("renovation_complete")[0];
    const dqe = generateDqe({
      category: "renovation_complete",
      surface: 110,
      floors: 1,
      totalBudget: 132000,
      levelSurfaces: [110],
    });
    const designations = dqe.lots
      .flatMap((l) => l.lines.map((line) => line.designation.toLowerCase()))
      .join(" | ");
    expect(designations).toContain("démolition");
    expect(designations).not.toContain("terrassement");
    expect(designations).not.toContain("fondations");
    expect(variant.renovation?.costBasis).toBe("travaux");
  });
});

describe("rénovation complète : existant et projeté", () => {
  it("chaque variante compare l'existant et le projeté", () => {
    const variants = plansFor("renovation_complete");
    for (const variant of variants) {
      const reno = variant.renovation;
      expect(reno).toBeDefined();
      expect(reno!.existing.label).toBe("État existant");
      expect(reno!.projected.label).toBe("État projeté");
      expect(reno!.existing.length).toBeCloseTo(reno!.projected.length, 6);
      expect(reno!.existing.width).toBeCloseTo(reno!.projected.width, 6);
      expect(reno!.surfaces.before.built).toBeGreaterThan(0);
      expect(reno!.surfaces.after.built).toBeGreaterThan(0);
      expect(reno!.surfaces.after.useful).toBeGreaterThan(reno!.surfaces.before.useful);
      expect(reno!.partitions.removed.length).toBeGreaterThan(0);
      expect(reno!.partitions.created.length).toBeGreaterThan(0);
      expect(reno!.partitions.kept.length).toBeGreaterThan(0);
      expect(reno!.structural.length).toBeGreaterThanOrEqual(2);
      expect(reno!.scope.length).toBeGreaterThanOrEqual(4);
      expect(reno!.costBasis).toBe("travaux");
      expect(variant.conceptNote).toContain("Rénovation");
      expect(variant.floors).toHaveLength(1);
    }
  });

  it("une construction neuve n'embarque aucune comparaison de rénovation", () => {
    for (const category of ARCHITECTURAL_PLAN_TYPES) {
      if (category === "renovation_complete") continue;
      expect(plansFor(category)[0].renovation).toBeUndefined();
    }
  });
});
