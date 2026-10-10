import { describe, it, expect } from "vitest";
import { budgetLevel, preselectCategories, STANDING_OPTIONS } from "./materialPreselection";

const IDS = ["beton", "ciment", "carrelage", "marbre", "piscine"];

describe("budgetLevel", () => {
  it("mappe le coût au m² vers un niveau national", () => {
    expect(budgetLevel(undefined)).toBeNull();
    expect(budgetLevel(0)).toBeNull();
    expect(budgetLevel(1400)).toBe(0);
    expect(budgetLevel(1800)).toBe(1);
    expect(budgetLevel(2500)).toBe(2);
    expect(budgetLevel(3500)).toBe(3);
  });
});

describe("preselectCategories", () => {
  it("ne retient que les catégories du standing quand le budget est inconnu", () => {
    const eco = preselectCategories({ categoryIds: IDS, standing: "economique" });
    expect(eco.categoryIds).toEqual(["beton", "ciment"]);
    expect(eco.reason).toContain("Économique");

    const luxe = preselectCategories({ categoryIds: IDS, standing: "luxe" });
    expect(luxe.categoryIds).toEqual(IDS);
  });

  it("reste prudent : le budget peut limiter le standing", () => {
    const res = preselectCategories({ categoryIds: IDS, standing: "premium", budgetPerM2: 1400 });
    expect(res.level).toBe(0);
    expect(res.categoryIds).toEqual(["beton", "ciment"]);
    expect(res.reason).toContain("TND/m²");
  });

  it("retombe sur toutes les catégories si aucune ne correspond", () => {
    const res = preselectCategories({ categoryIds: ["piscine"], standing: "economique" });
    expect(res.categoryIds).toEqual(["piscine"]);
  });

  it("propose les 5 standings", () => {
    expect(STANDING_OPTIONS).toHaveLength(5);
  });
});
