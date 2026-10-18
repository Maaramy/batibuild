// ============================================================================
// PLAN DE CONSTRUCTION — règles d'affichage (aucun doublon de libellé)
// ----------------------------------------------------------------------------
// Le cas signalé : le lot du Quantitatif s'appelle comme le poste, donc la
// sous-catégorie unique reprend le nom du poste (« Gros œuvre » sous
// « Gros œuvre »). Ces tests verrouillent la règle qui l'empêche.
// ============================================================================

import { describe, expect, it } from "vitest";

import { isSameWorkLabel, resolveWorkLevels } from "@/lib/planWorkLevels";

describe("isSameWorkLabel — deux libellés désignent-ils le même poste ?", () => {
  it("ignore le complément entre parenthèses du libellé canonique", () => {
    // Le poste s'appelle « Gros œuvre (structure) » et la sous-catégorie
    // « Gros œuvre » : c'est le doublon affiché à supprimer.
    expect(isSameWorkLabel("Gros œuvre (structure)", "Gros œuvre")).toBe(true);
  });

  it("ignore la casse, les accents, les ligatures et la ponctuation", () => {
    expect(isSameWorkLabel("GROS ŒUVRE", "Gros oeuvre")).toBe(true);
    expect(isSameWorkLabel("Gros œuvre", "gros-œuvre")).toBe(true);
    expect(isSameWorkLabel("Études & frais préliminaires", "etudes & frais preliminaires")).toBe(true);
  });

  it("distingue deux libellés réellement différents", () => {
    expect(isSameWorkLabel("Études & frais préliminaires", "Études & permis")).toBe(false);
    expect(isSameWorkLabel("", "")).toBe(false);
  });
});

describe("resolveWorkLevels — niveaux d'affichage d'un poste", () => {
  it("aplatit un poste dont l'unique sous-catégorie porte son nom", () => {
    const levels = resolveWorkLevels({
      label: "Gros œuvre (structure)",
      parts: [
        {
          id: "part:gros_oeuvre",
          label: "Gros œuvre",
          articles: [
            { id: "a1", label: "Terrassement et fondations", cost: 11_101, pct: 100 },
            { id: "a2", label: "Murs porteurs et refends", cost: 17_761, pct: 100 },
          ],
        },
      ],
    });

    expect(levels.showSubLevel).toBe(false);
    // Aucun second affichage du nom du poste.
    expect(levels.directLabel).toBeNull();
    expect(levels.directArticles.map((a) => a.label)).toEqual([
      "Terrassement et fondations",
      "Murs porteurs et refends",
    ]);
  });

  it("conserve le nom d'une sous-catégorie unique réellement différente", () => {
    const levels = resolveWorkLevels({
      label: "Études & frais préliminaires",
      parts: [
        {
          id: "part:etudes",
          label: "Études & permis",
          articles: [{ id: "a1", label: "Permis de bâtir", cost: 7_920, pct: 100 }],
        },
      ],
    });

    expect(levels.showSubLevel).toBe(false);
    // Le nom « Études & permis » reste affiché sous le poste : rien n'est perdu.
    expect(levels.directLabel).toBe("Études & permis");
    expect(levels.directArticles.length).toBe(1);
  });

  it("garde le niveau sous-catégories quand le poste en compte plusieurs", () => {
    const levels = resolveWorkLevels({
      label: "Gros œuvre (structure)",
      parts: [
        { id: "part:a", label: "Gros œuvre" },
        { id: "part:b", label: "Structure et poteaux" },
      ],
    });

    expect(levels.showSubLevel).toBe(true);
    expect(levels.directLabel).toBeNull();
    expect(levels.directArticles).toEqual([]);
  });

  it("n'annonce rien pour un poste sans sous-catégorie", () => {
    const levels = resolveWorkLevels({ label: "Fondations" });
    expect(levels.showSubLevel).toBe(false);
    expect(levels.directLabel).toBeNull();
    expect(levels.directArticles).toEqual([]);
  });
});
