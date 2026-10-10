import { describe, it, expect } from "vitest";
import {
  MATERIAL_CATEGORY_TO_SUPPLIER_SPECIALTIES,
  categorySpecialties,
} from "./supplierMatch";
import { SUPPLIER_SPECIALTIES } from "@/lib/supplierSpecialties";

const KNOWN = new Set<string>(SUPPLIER_SPECIALTIES);

describe("categorySpecialties", () => {
  it("mappe les catégories directes vers la spécialité fournisseur correspondante", () => {
    expect(categorySpecialties(["beton"])).toEqual(["beton"]);
    expect(categorySpecialties(["carrelage"])).toEqual(["carrelage"]);
    expect(categorySpecialties(["electricite"])).toEqual(["electricite"]);
  });

  it("déduplique et préserve l'ordre des spécialités en entrée", () => {
    expect(categorySpecialties(["piscine", "piscine", "etancheite"])).toEqual([
      "piscines",
      "etancheite",
    ]);
    expect(categorySpecialties(["bois", "aluminium"])).toEqual([
      "menuserie_bois",
      "charpente",
      "aluminium",
    ]);
  });

  it("ignore les catégories sans correspondance (ex. autres)", () => {
    expect(categorySpecialties(["autres", "ciment"])).toEqual([
      "gros_oeuvre",
      "macconnerie",
    ]);
    expect(categorySpecialties(["autres"])).toEqual([]);
    expect(categorySpecialties([])).toEqual([]);
    expect(categorySpecialties(["inconnue"])).toEqual([]);
  });

  it("n'émet que des spécialités valides de l'annuaire fournisseurs", () => {
    for (const mapped of Object.values(MATERIAL_CATEGORY_TO_SUPPLIER_SPECIALTIES)) {
      for (const sp of mapped) {
        expect(KNOWN.has(sp), `« ${sp} » n'est pas une spécialité fournisseur connue`).toBe(
          true,
        );
      }
    }
    // La forme « piscine » (catégorie matériaux) ne doit jamais fuir telle quelle :
    expect(MATERIAL_CATEGORY_TO_SUPPLIER_SPECIALTIES.piscine).toEqual(["piscines"]);
  });
});
