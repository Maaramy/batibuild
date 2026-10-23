import { describe, it, expect } from "vitest";
import {
  EXPERT_PROFESSIONS,
  PROFESSION_SPECIALTIES,
  PROFESSIONNEL_SPECIALTY_GROUPS,
  SPECIALTY_LABELS,
} from "./expertProfileOptions";

describe("Formulaire expert — liste des professions", () => {
  it("ne propose plus Plombier ni Électricien comme professions", () => {
    const values = EXPERT_PROFESSIONS.map((p) => p.value);
    expect(values).not.toContain("plombier");
    expect(values).not.toContain("electricien");
  });

  it("ajoute la catégorie « Professionnel »", () => {
    const professionnel = EXPERT_PROFESSIONS.find((p) => p.value === "professionnel");
    expect(professionnel?.label).toBe("Professionnel");
    expect(professionnel?.icon).toBeTruthy();
  });

  it("conserve les professions historiques hors métiers techniques", () => {
    const values = EXPERT_PROFESSIONS.map((p) => p.value);
    expect(values).toEqual([
      "architecte",
      "bureau_etudes",
      "ingenieur",
      "promoteur_immobilier",
      "professionnel",
    ]);
  });

  it("associe le champ Spécialité de « Professionnel » à ses métiers", () => {
    const specialties = PROFESSION_SPECIALTIES.professionnel;
    expect(specialties).toBeDefined();
    expect(specialties).toContain("plombier");
    expect(specialties).toContain("electricien");
    expect(PROFESSIONNEL_SPECIALTY_GROUPS).toHaveLength(4);
    // Tous les métiers proposés ont un libellé.
    for (const key of specialties) {
      expect(SPECIALTY_LABELS[key]).toBeTruthy();
    }
  });

  it("garde les spécialités historiques pour les profils existants", () => {
    expect(PROFESSION_SPECIALTIES.plombier.length).toBeGreaterThan(0);
    expect(PROFESSION_SPECIALTIES.electricien.length).toBeGreaterThan(0);
  });
});
