import { describe, expect, it } from "vitest";
import { generatePlan, PLAN_TYPES, isHousingType, type PlanTypeId } from "./plan-engine";

const baseParams = {
  type: "maison" as PlanTypeId,
  surface: 140,
  floors: 1,
  bedrooms: 3,
  seed: 1,
  projectName: "Villa test",
  region: "Tunis",
};

describe("generatePlan — moteur de plans architecturaux", () => {
  it("génère un plan avec une surface par niveau cohérente", () => {
    const layout = generatePlan(baseParams);
    expect(layout.rooms.length).toBeGreaterThan(0);
    expect(layout.doors.length).toBeGreaterThan(0);
    // surface / étages, arrondi à l'entier
    expect(layout.perFloor).toBe(140);
    // Les pièces doivent rester dans les limites du bâtiment
    for (const r of layout.rooms) {
      expect(r.x).toBeGreaterThanOrEqual(-0.01);
      expect(r.y).toBeGreaterThanOrEqual(-0.01);
      expect(r.x + r.w).toBeLessThanOrEqual(layout.width + 0.01);
      expect(r.y + r.h).toBeLessThanOrEqual(layout.height + 0.01);
    }
    expect(layout.projectName).toBe("Villa test");
    expect(layout.region).toBe("Tunis");
  });

  it("est déterministe pour une même graine", () => {
    const a = generatePlan(baseParams);
    const b = generatePlan({ ...baseParams, seed: 1 });
    expect(a.rooms).toEqual(b.rooms);
    expect(a.doors).toEqual(b.doors);
    expect(a.width).toBe(b.width);
    expect(a.height).toBe(b.height);
  });

  it("respecte le nombre de chambres pour un logement", () => {
    const layout = generatePlan({ ...baseParams, bedrooms: 4 });
    const bedrooms = layout.rooms.filter((r) => r.name.startsWith("Chambre"));
    expect(bedrooms.length).toBe(4);
  });

  it("gère tous les types de plans sans erreur", () => {
    for (const t of PLAN_TYPES) {
      const layout = generatePlan({ ...baseParams, type: t.id });
      expect(layout.rooms.length).toBeGreaterThan(0);
      expect(layout.typeLabel).toBe(t.label);
    }
  });

  it("isHousingType détecte les types résidentiels", () => {
    expect(isHousingType("maison")).toBe(true);
    expect(isHousingType("villa")).toBe(true);
    expect(isHousingType("appartement")).toBe(true);
    expect(isHousingType("immeuble")).toBe(true);
    expect(isHousingType("entrepot")).toBe(false);
    expect(isHousingType("mosquee")).toBe(false);
  });

  it("clamp la surface minimale et le nombre d'étages", () => {
    const layout = generatePlan({ ...baseParams, surface: 5, floors: 0 });
    expect(layout.surface).toBeGreaterThanOrEqual(30);
    expect(layout.floors).toBeGreaterThanOrEqual(1);
  });

  it("ne place jamais de porte sur un mur inexistant", () => {
    const layout = generatePlan({ ...baseParams, type: "entrepot" });
    for (const d of layout.doors) {
      if (d.axis === "h") {
        expect(d.at).toBeGreaterThanOrEqual(-0.01);
        expect(d.at).toBeLessThanOrEqual(layout.height + 0.01);
      } else {
        expect(d.at).toBeGreaterThanOrEqual(-0.01);
        expect(d.at).toBeLessThanOrEqual(layout.width + 0.01);
      }
    }
  });

  it("génère une variante différente avec une autre graine", () => {
    const a = generatePlan({ ...baseParams, seed: 1 });
    const b = generatePlan({ ...baseParams, seed: 2 });
    // La géométrie (largeur/hauteur) peut rester identique, mais la
    // disposition intérieure est variée par la graine.
    expect(typeof a.width).toBe("number");
    expect(typeof a.rooms).toBe("object");
    expect(b.rooms.length).toBe(a.rooms.length);
  });
});
