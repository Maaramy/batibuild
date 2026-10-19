import { describe, it, expect } from "vitest";
import {
  MATERIAL_CATEGORY_TO_SUPPLIER_SPECIALTIES,
  articleSupplierSpecialties,
  categorySpecialties,
  matchSuppliersToMaterials,
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

const suppliers = [
  {
    _id: "s1",
    companyName: "Gros œuvre Tunis",
    specialties: ["macconnerie", "carrelage"],
    regions: ["tunis", "ariana"],
  },
  {
    _id: "s2",
    companyName: "Ciment Sfax",
    specialties: ["macconnerie"],
    regions: ["sfax"],
  },
  {
    _id: "s3",
    companyName: "Peinture Sousse",
    specialties: ["peinture"],
    regions: ["sousse"],
  },
  {
    _id: "s4",
    companyName: "Sans spécialité",
    specialties: [],
    regions: ["tunis"],
  },
];

const materials = [
  { name: "Ciment CPJ 42.5 (sac 50 kg)", quantity: 120, unit: "sacs" },
  { name: "Carrelage grès cérame 60×60 (m²)", quantity: 80, unit: "m²" },
  { name: "Peinture intérieure mate (L)", quantity: 60, unit: "L" },
];

describe("articleSupplierSpecialties", () => {
  it("relie chaque article réel aux spécialités fournisseur correspondantes", () => {
    expect(articleSupplierSpecialties("Ciment CPJ 42.5 (sac 50 kg)")).toContain("macconnerie");
    expect(articleSupplierSpecialties("Sable de construction (m³)")).toContain("terrassement");
    expect(articleSupplierSpecialties("Acier à béton T12 (tonne)")).toEqual(["ferraillage"]);
    expect(articleSupplierSpecialties("Carrelage grès cérame 60×60 (m²)")).toEqual(["carrelage"]);
    expect(articleSupplierSpecialties("Panneau photovoltaïque 450 Wc")).toContain(
      "energie_solaire",
    );
    expect(articleSupplierSpecialties("Porte intérieure bois pleine")).toContain("portes");
  });

  it("ne devine aucune spécialité pour un article inconnu", () => {
    expect(articleSupplierSpecialties("Article divers non répertorié")).toEqual([]);
    expect(articleSupplierSpecialties("")).toEqual([]);
  });

  it("n'émet que des spécialités valides", () => {
    for (const material of materials) {
      for (const sp of articleSupplierSpecialties(material.name)) {
        expect(KNOWN.has(sp), sp).toBe(true);
      }
    }
  });
});

describe("matchSuppliersToMaterials — classement des fournisseurs", () => {
  it("classe par couverture des articles, puis par région du chantier", () => {
    const result = matchSuppliersToMaterials(materials, suppliers, "tunis");

    // S1 couvre 2/3 des articles et intervient à Tunis → en tête.
    expect(result[0].supplier._id).toBe("s1");
    expect(result[0].coverage).toBeCloseTo(2 / 3, 5);
    expect(result[0].regionMatch).toBe(true);
    expect(result[0].partial).toBe(true);
    expect(result[0].missingArticles).toEqual(["Peinture intérieure mate (L)"]);

    // S2 et S3 couvrent 1/3 ; S2 est hors région, S3 aussi → ordre alphabétique.
    expect(result.map((m) => m.supplier._id).sort()).toEqual(["s1", "s2", "s3"]);
    expect(result.find((m) => m.supplier._id === "s2")!.regionMatch).toBe(false);
  });

  it("exclut tout fournisseur sans correspondance (jamais présenté comme disponible)", () => {
    const result = matchSuppliersToMaterials(materials, suppliers, "tunis");
    expect(result.some((m) => m.supplier._id === "s4")).toBe(false);
    expect(result.every((m) => m.matchedArticles.length > 0)).toBe(true);
  });

  it("signale explicitement une couverture partielle", () => {
    const result = matchSuppliersToMaterials(materials, suppliers, "tunis");
    const s2 = result.find((m) => m.supplier._id === "s2")!;
    expect(s2.partial).toBe(true);
    expect(s2.matchedArticles).toEqual(["Ciment CPJ 42.5 (sac 50 kg)"]);
    expect(s2.missingArticles).toHaveLength(2);
  });

  it("sans région de chantier, tous les fournisseurs correspondent à leur région déclarée", () => {
    const result = matchSuppliersToMaterials(materials, suppliers, null);
    expect(result.every((m) => m.regionMatch)).toBe(true);
  });

  it("privilégie un fournisseur local à couverture égale", () => {
    const local = {
      _id: "local",
      companyName: "Local",
      specialties: ["carrelage"],
      regions: ["tunis"],
    };
    const remote = {
      _id: "remote",
      companyName: "Remote",
      specialties: ["carrelage"],
      regions: ["sfax"],
    };
    const result = matchSuppliersToMaterials(materials, [remote, local], "tunis");
    expect(result.map((m) => m.supplier._id)).toEqual(["local", "remote"]);
  });

  it("renvoie une liste vide sans article recherché", () => {
    expect(matchSuppliersToMaterials([], suppliers, "tunis")).toEqual([]);
  });
});
