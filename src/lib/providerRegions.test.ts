import { describe, it, expect } from "vitest";
import { TUNISIA_REGION_LABELS, regionLabel } from "./providerRegions";
import { TUNISIA_REGIONS } from "@/components/expert/expertProfileOptions";

// Les deux fiches professionnelles (expert et fournisseur) affichent les mêmes
// libellés de régions : ce test fige la table et le repli pour éviter qu'une
// région brute (« beja ») ne réapparaisse dans l'interface.
describe("providerRegions", () => {
  it("expose un libellé pour chaque gouvernorat de la liste officielle", () => {
    expect(Object.keys(TUNISIA_REGION_LABELS)).toHaveLength(TUNISIA_REGIONS.length);
    for (const region of TUNISIA_REGIONS) {
      expect(TUNISIA_REGION_LABELS[region.value]).toBe(region.label);
    }
  });

  it("traduit les régions utilisées par les profils", () => {
    expect(regionLabel("beja")).toBe("Béja");
    expect(regionLabel("tunis")).toBe("Tunis");
    expect(regionLabel("medenine")).toBe("Médenine");
  });

  it("retombe sur la valeur brute pour une région inconnue", () => {
    expect(regionLabel("atlantide")).toBe("atlantide");
    expect(regionLabel("")).toBe("");
  });
});
