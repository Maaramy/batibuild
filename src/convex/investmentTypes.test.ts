/// <reference types="vite/client" />

import { describe, it, expect } from "vitest";
import { estimateOccupancyRate, resolveZoneUtility } from "./investmentTypes.js";

describe("estimateOccupancyRate — estimation IA du taux d'occupation", () => {
  it("aucune localisation : mensuel ≈ 90 %, nuitée ≈ 55 %", () => {
    expect(estimateOccupancyRate({ rentMode: "mensuel" })).toBe(90);
    expect(estimateOccupancyRate({ rentMode: "nuit" })).toBe(55);
    expect(estimateOccupancyRate()).toBe(90); // rentMode absent → mensuel
  });

  it("Tunis : demande forte → occupation élevée, plus faible en nuitée", () => {
    expect(estimateOccupancyRate({ region: "tunis", rentMode: "mensuel" })).toBe(94);
    expect(estimateOccupancyRate({ region: "tunis", rentMode: "nuit" })).toBe(65);
  });

  it("quartier premium (Les Berges du Lac / Lac 2) : plafonne à 98 % en mensuel", () => {
    expect(
      estimateOccupancyRate({ region: "tunis", city: "Les Berges du Lac", quartier: "Lac 2", rentMode: "mensuel" }),
    ).toBe(98);
    expect(
      estimateOccupancyRate({ region: "tunis", city: "Les Berges du Lac", quartier: "Lac 2", rentMode: "nuit" }),
    ).toBe(74);
  });

  it("zone à faible demande (Kasserine) : occupation basse, plancher 38 % en nuitée", () => {
    expect(estimateOccupancyRate({ region: "kasserine", city: "Kasserine", rentMode: "mensuel" })).toBe(83);
    expect(estimateOccupancyRate({ region: "kasserine", city: "Kasserine", rentMode: "nuit" })).toBe(38);
  });

  it("le mode nuitée est toujours inférieur au mode mensuel pour une même localisation", () => {
    for (const region of ["tunis", "sousse", "nabeul", "medenine", "kasserine"]) {
      const m = estimateOccupancyRate({ region, rentMode: "mensuel" });
      const n = estimateOccupancyRate({ region, rentMode: "nuit" });
      expect(n).toBeLessThan(m);
      expect(m).toBeGreaterThanOrEqual(80);
      expect(m).toBeLessThanOrEqual(98);
      expect(n).toBeGreaterThanOrEqual(38);
      expect(n).toBeLessThanOrEqual(80);
    }
  });

  it("les zones premium ≥ zones moyennes ≥ zones à faible demande", () => {
    const lac = estimateOccupancyRate({ region: "tunis", city: "Les Berges du Lac", rentMode: "mensuel" });
    const tunis = estimateOccupancyRate({ region: "tunis", rentMode: "mensuel" });
    const kasserine = estimateOccupancyRate({ region: "kasserine", rentMode: "mensuel" });
    expect(lac).toBeGreaterThanOrEqual(tunis);
    expect(tunis).toBeGreaterThanOrEqual(kasserine);
  });

  it("la ville reconnue module le taux par rapport à la seule région", () => {
    const nabeul = estimateOccupancyRate({ region: "nabeul", rentMode: "nuit" });
    const hammamet = estimateOccupancyRate({ region: "nabeul", city: "Hammamet", rentMode: "nuit" });
    expect(hammamet).toBeGreaterThan(nabeul);
  });
});

describe("resolveZoneUtility", () => {
  it("reconnaît les zones premium et les villes connues", () => {
    expect(resolveZoneUtility("Les Berges du Lac")?.label).toBe("Les Berges du Lac");
    expect(resolveZoneUtility("Les Berges du Lac")?.utilityIndex).toBe(96);
    expect(resolveZoneUtility("Hammamet")).not.toBeNull();
    expect(resolveZoneUtility("Ville inconnue", "Quartier inconnu")).toBeNull();
  });

  it("la ville prime sur le quartier dans l'ordre des utilités reconnues", () => {
    const u = resolveZoneUtility("La Marsa", "Sidi Bou Saïd");
    expect(u?.label).toBe("La Marsa");
    expect(u?.utilityIndex).toBe(93);
  });
});
