import { describe, it, expect } from "vitest";
import {
  generateFloorPlans,
  summarizeSurfaces,
  VARIANTS_PER_PROJECT,
} from "./floorPlanEngine";

const EPS = 1e-6;

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return (
    a.x + a.w > b.x + EPS &&
    b.x + b.w > a.x + EPS &&
    a.y + a.h > b.y + EPS &&
    b.y + b.h > a.y + EPS
  );
}

describe("generateFloorPlans", () => {
  const maison = generateFloorPlans({
    category: "maison",
    surface: 150,
    floors: 2,
    bedrooms: 3,
    bathrooms: 2,
    wcs: 2,
  });

  it("génère exactement 10 variantes", () => {
    expect(maison).toHaveLength(VARIANTS_PER_PROJECT);
    expect(VARIANTS_PER_PROJECT).toBe(10);
  });

  it("respecte la surface demandée (±6 % par niveau)", () => {
    for (const v of maison) {
      expect(v.validation.dimensionsOk).toBe(true);
      for (const fp of v.floors) {
        expect(fp.length * fp.width).toBeGreaterThan(150 / 2 * 0.94);
        expect(fp.length * fp.width).toBeLessThan(150 / 2 * 1.06);
      }
    }
  });

  it("aucun chevauchement de pièces et pièces contenues dans l'emprise", () => {
    for (const v of maison) {
      expect(v.validation.noOverlap).toBe(true);
      for (const fp of v.floors) {
        for (let i = 0; i < fp.rooms.length; i++) {
          const r = fp.rooms[i];
          expect(r.w).toBeGreaterThan(0);
          expect(r.h).toBeGreaterThan(0);
          expect(r.x).toBeGreaterThanOrEqual(-EPS);
          expect(r.y).toBeGreaterThanOrEqual(-EPS);
          expect(r.x + r.w).toBeLessThanOrEqual(fp.length + EPS);
          expect(r.y + r.h).toBeLessThanOrEqual(fp.width + EPS);
          for (let j = i + 1; j < fp.rooms.length; j++) {
            expect(overlaps(r, fp.rooms[j])).toBe(false);
          }
        }
      }
    }
  });

  it("la somme des surfaces des pièces égale la surface du niveau (±2 %)", () => {
    for (const v of maison) {
      expect(v.validation.areasOk).toBe(true);
      for (const fp of v.floors) {
        const sum = fp.rooms.reduce((s, r) => s + r.area, 0);
        expect(Math.abs(sum - fp.area) / fp.area).toBeLessThan(0.02);
      }
    }
  });

  it("chaque pièce dispose d'une porte et le RDC d'une entrée", () => {
    for (const v of maison) {
      expect(v.validation.circulationOk).toBe(true);
      for (const fp of v.floors) {
        for (const r of fp.rooms) {
          expect(r.doors.length).toBeGreaterThanOrEqual(1);
        }
      }
      expect(v.floors[0].rooms.some((r) => r.doors.some((d) => d.isEntry))).toBe(true);
    }
  });

  it("les pièces habitables ont au moins une fenêtre", () => {
    const habitable = new Set(["chambre", "sejour", "cuisine", "bureau"]);
    for (const v of maison) {
      for (const fp of v.floors) {
        for (const r of fp.rooms) {
          if (habitable.has(r.kind)) {
            expect(r.windows.length).toBeGreaterThanOrEqual(1);
          }
        }
      }
    }
  });

  it("continuité structurelle en R+1 : emprise et gaine escalier alignées", () => {
    for (const v of maison) {
      expect(v.floors).toHaveLength(2);
      expect(v.validation.structureOk).toBe(true);
      const stair0 = v.floors[0].rooms.find((r) => r.kind === "escalier");
      const stair1 = v.floors[1].rooms.find((r) => r.kind === "escalier");
      expect(stair0).toBeDefined();
      expect(stair1).toBeDefined();
      expect(stair1!.x).toBeCloseTo(stair0!.x, 3);
      expect(stair1!.y).toBeCloseTo(stair0!.y, 3);
      expect(stair1!.w).toBeCloseTo(stair0!.w, 3);
      expect(stair1!.h).toBeCloseTo(stair0!.h, 3);
    }
  });

  it("les variantes sont distinctes (emprises différentes)", () => {
    const keys = new Set(maison.map((v) => `${v.footprint.length.toFixed(2)}x${v.footprint.width.toFixed(2)}`));
    expect(keys.size).toBeGreaterThanOrEqual(8);
  });

  it("chaque variante porte une note conceptuelle non vide", () => {
    for (const v of maison) {
      expect(v.conceptNote.length).toBeGreaterThan(80);
      expect(v.validation.score).toBeGreaterThanOrEqual(90);
    }
  });

  it("fiche technique : summarizeSurfaces couvre toutes les pièces", () => {
    const v = maison[0];
    const sum0 = v.floors[0].rooms.reduce((s, r) => s + r.area, 0);
    const table = summarizeSurfaces(v.floors[0]);
    const totalTable = table.reduce((s, r) => s + r.area, 0);
    expect(table).toHaveLength(v.floors[0].rooms.length);
    expect(totalTable).toBeCloseTo(sum0, 1);
    expect(table.reduce((s, r) => s + r.sharePct, 0)).toBeCloseTo(100, 0);
  });

  it("fonctionne pour une villa de plain-pied sans compte de pièces fourni", () => {
    const villa = generateFloorPlans({ category: "villa", surface: 120 });
    expect(villa).toHaveLength(10);
    for (const v of villa) {
      expect(v.floors).toHaveLength(1);
      expect(v.validation.circulationOk).toBe(true);
      // Des chambres dérivées automatiquement
      expect(v.floors[0].rooms.some((r) => r.kind === "chambre")).toBe(true);
    }
  });

  it("fonctionne pour un local commercial", () => {
    const bureau = generateFloorPlans({
      category: "local_commercial",
      surface: 200,
      floors: 1,
    });
    for (const v of bureau) {
      expect(v.validation.score).toBeGreaterThanOrEqual(85);
      const kinds = new Set(v.floors[0].rooms.map((r) => r.kind));
      expect(kinds.has("reception")).toBe(true);
      expect(kinds.has("openspace")).toBe(true);
    }
  });

  it("fonctionne pour un entrepôt", () => {
    const wh = generateFloorPlans({ category: "entrepot", surface: 400 });
    for (const v of wh) {
      expect(v.validation.noOverlap).toBe(true);
      expect(v.floors[0].rooms.some((r) => r.kind === "stockage")).toBe(true);
    }
  });

  it("est déterministe (mêmes plans pour les mêmes entrées)", () => {
    const again = generateFloorPlans({
      category: "maison",
      surface: 150,
      floors: 2,
      bedrooms: 3,
      bathrooms: 2,
      wcs: 2,
    });
    expect(JSON.stringify(again.map((v) => v.floors))).toBe(JSON.stringify(maison.map((v) => v.floors)));
  });

  it("intègre les travaux complémentaires sélectionnés comme besoins du projet", () => {
    const base = {
      category: "maison",
      surface: 150,
      floors: 1,
      bedrooms: 3,
      bathrooms: 2,
      wcs: 2,
    };
    const withWorks = generateFloorPlans({
      ...base,
      works: ["garage", "cuisine_exterieure", "piscine", "jardin", "solaire"],
    });

    for (const v of withWorks) {
      expect(v.validation.noOverlap).toBe(true);
      const kinds = new Set(v.floors[0].rooms.map((r) => r.kind));
      // Garage sélectionné → espace intégré au programme.
      expect(kinds.has("garage")).toBe(true);
      // Cuisine extérieure sélectionnée → zone dédiée.
      expect(v.floors[0].rooms.some((r) => r.label.includes("Cuisine extérieure"))).toBe(true);
      // Les contraintes extérieures (piscine, jardin, solaire) sont prises en compte.
      expect(v.conceptNote).toContain("Contraintes du projet prises en compte");
      expect(v.conceptNote).toContain("piscine");
      expect(v.conceptNote).toContain("panneaux solaires");
    }

    // Sans travail complémentaire, le programme reste inchangé.
    const withoutWorks = generateFloorPlans(base);
    for (const v of withoutWorks) {
      expect(v.floors[0].rooms.some((r) => r.kind === "garage")).toBe(false);
      expect(v.conceptNote).not.toContain("Contraintes du projet prises en compte");
    }
  });
});
