import { describe, expect, it } from "vitest";

import {
  TECHNICAL_DESIGNATIONS,
  referenceRoomsFor,
  technicalLaborUnitPrice,
  technicalObservation,
  technicalProfileFor,
  technicalQuantity,
  technicalUnitPrice,
} from "./dqeTechnicalLots";
import {
  ELECTRICITY_BAREME_M2,
  ELECTRICITY_LABOR_M2,
  PLUMBING_BAREME_M2,
  PLUMBING_LABOR_M2,
} from "./technicalBareme";

// ============================================================================
// RÈGLES PARTAGÉES PLOMBERIE / ÉLECTRICITÉ — tous les types de projet
// ----------------------------------------------------------------------------
// Vérifie que la quantité d'un poste technique suit TOUJOURS la surface
// réellement construite du projet (jamais une quantité de référence figée) et
// qu'elle s'adapte aux équipements sanitaires réellement déclarés.
// ============================================================================

describe("technicalProfileFor — classement des types de projet", () => {
  it("résidentiel (maisons, villas, appartements, studios, duplex, immeubles)", () => {
    for (const cat of [
      "maison",
      "villa",
      "appartement",
      "studio",
      "duplex",
      "immeuble",
      "projet_neuf",
      "residence_touristique",
      "maison_r_plus_1",
      "",
    ]) {
      expect(technicalProfileFor(cat), cat).toBe("residentiel");
    }
  });

  it("commercial (locaux, boutiques, bureaux, restaurants, cafés, hôtels)", () => {
    for (const cat of [
      "local_commercial",
      "boutique_commerciale",
      "bureau",
      "bureau_cabinet",
      "restaurant",
      "cafe",
      "hotel",
    ]) {
      expect(technicalProfileFor(cat), cat).toBe("commercial");
    }
  });

  it("industriel (entrepôts, ateliers, usines, garages, bâtiments agricoles)", () => {
    for (const cat of [
      "entrepot",
      "atelier",
      "usine",
      "batiment_agricole",
      "garage",
    ]) {
      expect(technicalProfileFor(cat), cat).toBe("industriel");
    }
  });

  it("rénovation (complète, salle de bain, cuisine, peinture)", () => {
    for (const cat of [
      "renovation_complete",
      "renovation_salle_de_bain",
      "renovation_cuisine",
      "peinture_interieure",
    ]) {
      expect(technicalProfileFor(cat), cat).toBe("renovation");
    }
  });
});

describe("technicalQuantity — surface construite, jamais 100 m² de référence", () => {
  it("sans équipements déclarés, la quantité EST la surface construite", () => {
    for (const area of [6, 80, 100, 120, 200, 480]) {
      expect(technicalQuantity("plomberie", { builtArea: area })).toBe(area);
      expect(technicalQuantity("electricite", { builtArea: area })).toBe(area);
    }
  });

  it("aucune quantité n'est figée sur un projet de référence", () => {
    const petit = technicalQuantity("electricite", { builtArea: 35 });
    const grand = technicalQuantity("electricite", { builtArea: 350 });
    expect(petit).toBe(35);
    expect(grand).toBe(350);
    expect(grand).toBe(petit * 10);
  });

  it("une surface nulle ou invalide donne une quantité nulle", () => {
    expect(technicalQuantity("plomberie", { builtArea: 0 })).toBe(0);
    expect(technicalQuantity("plomberie", { builtArea: -20 })).toBe(0);
    expect(technicalQuantity("plomberie", { builtArea: Number.NaN })).toBe(0);
  });

  it("les équipements de référence (densité surface) ne majorent rien", () => {
    const area = 160;
    const ref = referenceRoomsFor(area);
    expect(
      technicalQuantity("plomberie", { builtArea: area, rooms: ref }),
    ).toBe(area);
    expect(
      technicalQuantity("electricite", { builtArea: area, rooms: ref }),
    ).toBe(area);
  });

  it("des équipements SUPPLÉMENTAIRES majorent la quantité (plomberie > électricité)", () => {
    const area = 100;
    const rooms = { bathrooms: 3, kitchens: 2, wcs: 3 };
    const plomberie = technicalQuantity("plomberie", { builtArea: area, rooms });
    const electricite = technicalQuantity("electricite", { builtArea: area, rooms });
    const ref = referenceRoomsFor(area);

    expect(plomberie).toBeGreaterThan(area);
    expect(electricite).toBeGreaterThan(area);
    expect(plomberie).toBeGreaterThan(electricite);
    // 2 SdB + 1 cuisine + 2 WC de plus que la référence : 28 + 10 + 14 = 52 m².
    expect(plomberie).toBe(area + (rooms.bathrooms - ref.bathrooms) * 14 + 10 + (rooms.wcs - ref.wcs) * 7);
  });

  it("moins d'équipements que la référence ne réduit jamais la quantité", () => {
    const area = 200;
    expect(
      technicalQuantity("plomberie", {
        builtArea: area,
        rooms: { bathrooms: 0, kitchens: 0, wcs: 0 },
      }),
    ).toBe(area);
  });

  it("un champ absent n'est jamais interprété comme zéro équipement", () => {
    const area = 100;
    expect(
      technicalQuantity("plomberie", { builtArea: area, rooms: { bathrooms: 3 } }),
    ).toBeGreaterThan(area);
    expect(
      technicalQuantity("plomberie", { builtArea: area, rooms: {} }),
    ).toBe(area);
  });
});

describe("prix unitaires — barème national, main-d'œuvre incluse", () => {
  it("plomberie : 60 / 85 / 115 DT/m² (Éco / Standard / Premium)", () => {
    expect(technicalUnitPrice("plomberie", "economique")).toBe(PLUMBING_BAREME_M2.economique);
    expect(technicalUnitPrice("plomberie", "standard")).toBe(PLUMBING_BAREME_M2.standard);
    expect(technicalUnitPrice("plomberie", "premium")).toBe(PLUMBING_BAREME_M2.premium);
    expect(technicalUnitPrice("plomberie")).toBe(85);
  });

  it("électricité : 35 / 65 / 100 DT/m² (Éco / Standard / Premium)", () => {
    expect(technicalUnitPrice("electricite", "economique")).toBe(ELECTRICITY_BAREME_M2.economique);
    expect(technicalUnitPrice("electricite", "standard")).toBe(ELECTRICITY_BAREME_M2.standard);
    expect(technicalUnitPrice("electricite", "premium")).toBe(ELECTRICITY_BAREME_M2.premium);
    expect(technicalUnitPrice("electricite")).toBe(65);
  });

  it("la part main-d'œuvre reste inférieure au prix du poste (jamais recomptée)", () => {
    for (const scenario of ["economique", "standard", "premium"] as const) {
      expect(technicalLaborUnitPrice("plomberie", scenario)).toBe(PLUMBING_LABOR_M2[scenario]);
      expect(technicalLaborUnitPrice("electricite", scenario)).toBe(ELECTRICITY_LABOR_M2[scenario]);
      expect(technicalLaborUnitPrice("plomberie", scenario)).toBeLessThan(
        technicalUnitPrice("plomberie", scenario),
      );
      expect(technicalLaborUnitPrice("electricite", scenario)).toBeLessThan(
        technicalUnitPrice("electricite", scenario),
      );
    }
  });
});

describe("technicalObservation — données du projet uniquement", () => {
  it("cite la surface construite et les équipements déclarés", () => {
    const observation = technicalObservation("plomberie", {
      builtArea: 200,
      quantity: 256,
      rooms: { bathrooms: 5, kitchens: 3, wcs: 4 },
      profile: "residentiel",
    });
    expect(observation).toContain("200 m² construits");
    expect(observation).toContain("5 SdB");
    expect(observation).toContain("m² équivalents");
  });

  it("aucun équipement déclaré : aucune mention d'équipement", () => {
    const observation = technicalObservation("electricite", {
      builtArea: 90,
      quantity: 90,
    });
    expect(observation).toContain("90 m² construits");
    expect(observation).not.toContain("SdB");
  });

  it("les libellés de poste sont ceux du DQE", () => {
    expect(TECHNICAL_DESIGNATIONS.plomberie).toBe("Plomberie sanitaire");
    expect(TECHNICAL_DESIGNATIONS.electricite).toBe("Électricité");
  });
});
