import { describe, it, expect } from "vitest";
import {
  EXPERT_PROFESSION_LABELS,
  PROFESSIONNEL_SPECIALTIES,
  PROFESSIONNEL_SPECIALTY_GROUPS,
  expertProfessionLabel,
  expertSpecialtyLabel,
  normalizeExpertProfession,
  normalizeExpertText,
} from "./expertProfessions";

describe("Catégorie « Professionnel » — spécialités", () => {
  it("propose les 44 métiers techniques demandés, sans doublon", () => {
    expect(PROFESSIONNEL_SPECIALTIES).toHaveLength(44);
    expect(new Set(PROFESSIONNEL_SPECIALTIES).size).toBe(44);
    expect(PROFESSIONNEL_SPECIALTY_GROUPS.map((g) => g.label)).toEqual([
      "Plomberie et installations techniques",
      "Gros œuvre et structure",
      "Second œuvre et finitions",
      "Aménagements et équipements",
    ]);
  });

  it("contient les métiers historiquement proposés comme professions", () => {
    expect(PROFESSIONNEL_SPECIALTIES).toContain("plombier");
    expect(PROFESSIONNEL_SPECIALTIES).toContain("electricien");
    // Métiers cités dans les exemples de recherche.
    expect(PROFESSIONNEL_SPECIALTIES).toContain("piscinier");
    expect(PROFESSIONNEL_SPECIALTIES).toContain("carreleur");
    expect(PROFESSIONNEL_SPECIALTIES).toContain("macon");
  });

  it("possède un libellé lisible pour chaque métier", () => {
    for (const key of PROFESSIONNEL_SPECIALTIES) {
      expect(expertSpecialtyLabel(key)).not.toBe(key);
    }
    expect(expertSpecialtyLabel("plombier")).toBe("Plombier");
    expect(expertSpecialtyLabel("electricien")).toBe("Électricien");
    expect(expertSpecialtyLabel("piscinier")).toBe("Piscinier");
    expect(expertSpecialtyLabel("installateur_cvc")).toBe(
      "Installateur de climatisation et ventilation (CVC)",
    );
    expect(expertSpecialtyLabel("poseur_paves_dallages")).toBe(
      "Poseur de pavés et dallages extérieurs",
    );
  });
});

describe("Professions experts — libellés et valeurs historiques", () => {
  it("expose la catégorie Professionnel", () => {
    expect(EXPERT_PROFESSION_LABELS.professionnel).toBe("Professionnel");
  });

  it("rattache plombier / electricien à « Professionnel »", () => {
    expect(normalizeExpertProfession("plombier")).toBe("professionnel");
    expect(normalizeExpertProfession("electricien")).toBe("professionnel");
    expect(normalizeExpertProfession("architecte")).toBe("architecte");
    expect(normalizeExpertProfession("professionnel")).toBe("professionnel");
    expect(normalizeExpertProfession(undefined)).toBe("architecte");
  });

  it("conserve le libellé des profils historiques", () => {
    expect(expertProfessionLabel("plombier")).toBe("Plombier");
    expect(expertProfessionLabel("electricien")).toBe("Électricien");
    expect(expertProfessionLabel("professionnel")).toBe("Professionnel");
  });
});

describe("Recherche — accents ignorés", () => {
  it("normalise casse et accents", () => {
    expect(normalizeExpertText("Électricien")).toBe("electricien");
    expect(normalizeExpertText("  Maçon   ")).toBe("macon");
    expect(normalizeExpertText(undefined)).toBe("");
  });
});
