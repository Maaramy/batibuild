import { describe, it, expect } from "vitest";
import {
  buildMaterialProfile,
  extractDimensions,
  mergeCharacteristics,
  packagingForUnit,
} from "./materialProfiles";

describe("extractDimensions", () => {
  it("extrait une dimension à 3 valeurs", () => {
    expect(extractDimensions("Bloc béton creux 20×20×40")).toBe("20 × 20 × 40 cm");
  });

  it("accepte le séparateur x minuscule ou majuscule", () => {
    expect(extractDimensions("Carrelage 60x60")).toBe("60 × 60 cm");
    expect(extractDimensions("Fenêtre 90X120")).toBe("90 × 120 cm");
  });

  it("normalise la virgule décimale", () => {
    expect(extractDimensions("Profilé 2,5x10")).toBe("2.5 × 10 cm");
  });

  it("retourne null quand aucune dimension n'est présente", () => {
    expect(extractDimensions("Ciment CPJ 42.5 (sac 50 kg)")).toBeNull();
  });
});

describe("packagingForUnit", () => {
  it("décrit le conditionnement d'un sac", () => {
    expect(packagingForUnit("sac")).toContain("Sac");
  });

  it("retombe sur un texte générique pour une unité inconnue", () => {
    expect(packagingForUnit("zing")).toContain("Conditionnement standard");
  });
});

describe("mergeCharacteristics", () => {
  it("surcharge les valeurs dérivées par label", () => {
    const merged = mergeCharacteristics(
      [
        { label: "Unité de vente", value: "sac" },
        { label: "Marque", value: "Fabricant A" },
      ],
      [{ label: "Marque", value: "Fabricant B" }],
    );
    expect(merged).toHaveLength(2);
    expect(merged.find((c) => c.label === "Marque")?.value).toBe("Fabricant B");
  });

  it("retourne les valeurs dérivées sans surcharge", () => {
    const derived = [{ label: "Unité de vente", value: "m³" }];
    expect(mergeCharacteristics(derived)).toBe(derived);
  });
});

describe("buildMaterialProfile", () => {
  const base = {
    name: "Ciment CPJ 42.5 (sac 50 kg)",
    category: "liants_ciments_mortiers",
    unit: "sac",
    currency: "TND",
    brand: "Ciments du Sud",
    sku: "MAT-0001",
    priceQuality: "publication_2026",
    availability: "disponible" as const,
  };

  it("dérive une fiche complète même sans saisie admin", () => {
    const profile = buildMaterialProfile(base);
    expect(profile.categoryLabel).toBe("Liants, ciments et mortiers");
    expect(profile.enriched).toBe(false);
    expect(profile.norms.length).toBeGreaterThan(0);
    expect(profile.certifications.length).toBeGreaterThan(0);
    expect(profile.usageAdvice.length).toBeGreaterThan(0);
    expect(profile.characteristics.map((c) => c.label)).toContain("Unité de vente");
    expect(profile.characteristics.find((c) => c.label === "Marque")?.value).toBe("Ciments du Sud");
    expect(profile.characteristics.find((c) => c.label === "Référence")?.value).toBe("MAT-0001");
  });

  it("normalise une catégorie legacy vers la catégorie officielle 2026", () => {
    const profile = buildMaterialProfile({ ...base, category: "ciment" });
    expect(profile.categorySlug).toBe("liants_ciments_mortiers");
  });

  it("priorise les surcharges admin et marque la fiche comme enrichie", () => {
    const profile = buildMaterialProfile({
      ...base,
      norms: ["Norme interne X"],
      certifications: ["Certif Y"],
      packaging: "Sac de 50 kg sur palette Europe",
      compatibility: ["Sable 0/4"],
      usageAdvice: "Conseil surcharge",
      characteristics: [{ label: "Classe", value: "CEM II/A" }],
    });
    expect(profile.enriched).toBe(true);
    expect(profile.norms).toEqual(["Norme interne X"]);
    expect(profile.certifications).toEqual(["Certif Y"]);
    expect(profile.packaging).toBe("Sac de 50 kg sur palette Europe");
    expect(profile.compatibility).toEqual(["Sable 0/4"]);
    expect(profile.usageAdvice).toBe("Conseil surcharge");
    expect(profile.characteristics.find((c) => c.label === "Classe")?.value).toBe("CEM II/A");
  });

  it("ajoute les dimensions au libellé pour les produits dimensionnés", () => {
    const profile = buildMaterialProfile({
      name: "Bloc béton creux 20×20×40",
      category: "maconnerie_plancher",
      unit: "pièce",
    });
    expect(profile.characteristics.find((c) => c.label === "Dimensions")?.value).toBe(
      "20 × 20 × 40 cm",
    );
  });
});
