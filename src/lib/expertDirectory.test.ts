import { describe, it, expect } from "vitest";
import {
  expertMatchesProfession,
  expertMatchesSearch,
  expertMatchesSpecialty,
  expertProfessionOptions,
  expertSpecialtyOptions,
} from "./expertDirectory";

const plombier = {
  profession: "professionnel",
  specialties: ["plombier", "installateur_sanitaires"],
  displayName: "Sami Ben Salah",
  companyName: "SBS Travaux",
  description: "Dépannage et installations sanitaires",
};

const piscinier = {
  profession: "professionnel",
  specialties: ["piscinier"],
  displayName: "Karim",
  description: "Construction de piscines",
};

const architecte = {
  profession: "architecte",
  specialties: ["conception_architecturale"],
  displayName: "Leïla",
};

// Profil historique non encore migré (donnée existante).
const legacyElectricien = {
  profession: "electricien",
  specialties: ["tableau_electrique"],
  displayName: "Ancien électricien",
};

describe("Annuaire experts — recherche libre", () => {
  it("trouve un professionnel par sa spécialité", () => {
    expect(expertMatchesSearch(plombier, "Plombier")).toBe(true);
    expect(expertMatchesSearch(piscinier, "Piscinier")).toBe(true);
    expect(expertMatchesSearch(architecte, "Plombier")).toBe(false);
  });

  it("ignore les accents et la casse", () => {
    expect(expertMatchesSearch(legacyElectricien, "electricien")).toBe(true);
    expect(expertMatchesSearch(legacyElectricien, "ÉLECTRICIEN")).toBe(true);
    expect(expertMatchesSearch(plombier, "sami")).toBe(true);
  });

  it("une recherche vide ne filtre rien", () => {
    expect(expertMatchesSearch(plombier, "")).toBe(true);
  });
});

describe("Annuaire experts — filtres", () => {
  it("rattache les professions historiques à « Professionnel »", () => {
    expect(expertMatchesProfession(legacyElectricien, "professionnel")).toBe(true);
    expect(expertMatchesProfession(plombier, "professionnel")).toBe(true);
    expect(expertMatchesProfession(architecte, "professionnel")).toBe(false);
    expect(expertMatchesProfession(architecte, "architecte")).toBe(true);
  });

  it("filtre par spécialité (métier)", () => {
    expect(expertMatchesSpecialty(piscinier, "piscinier")).toBe(true);
    expect(expertMatchesSpecialty(plombier, "piscinier")).toBe(false);
    expect(expertMatchesSpecialty(plombier, "")).toBe(true);
  });

  it("propose les professions présentes, sans doublon, dans l'ordre officiel", () => {
    expect(
      expertProfessionOptions([plombier, architecte, legacyElectricien, piscinier]),
    ).toEqual(["architecte", "professionnel"]);
  });

  it("propose les spécialités présentes, triées par libellé", () => {
    expect(expertSpecialtyOptions([plombier, piscinier])).toEqual([
      "installateur_sanitaires",
      "piscinier",
      "plombier",
    ]);
  });
});
