import { describe, it, expect } from "vitest";
import {
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPE_ICONS,
  PROJECT_TYPE_GROUPS,
  ROOM_ELIGIBLE_TYPES,
  SINGLE_LEVEL_TYPES,
  LEGACY_PROJECT_TYPE_MAP,
  LEGACY_TYPE_LABELS,
  projectTypeLabel,
  resolveProjectType,
  investmentTypeForProject,
  inferFloorsFromCategory,
} from "./projectTypes";
import { INVESTMENT_TYPES } from "./investmentTypes";

describe("inferFloorsFromCategory — niveaux par défaut du moteur BIM", () => {
  it("Maison R+1 → 2 niveaux · Maison R+2 → 3 niveaux", () => {
    expect(inferFloorsFromCategory("maison_r_plus_1")).toBe(2);
    expect(inferFloorsFromCategory("maison_r_plus_2")).toBe(3);
  });

  it("les types simples restent à 1 niveau", () => {
    expect(inferFloorsFromCategory("maison")).toBe(1);
    expect(inferFloorsFromCategory("villa")).toBe(1);
    expect(inferFloorsFromCategory(undefined)).toBe(1);
    expect(inferFloorsFromCategory("")).toBe(1);
  });

  it("duplex → 2 niveaux, types mono-niveaux forcés à 1", () => {
    expect(inferFloorsFromCategory("duplex")).toBe(2);
    for (const t of SINGLE_LEVEL_TYPES) {
      expect(inferFloorsFromCategory(t)).toBe(1);
    }
  });
});

// ============================================================================
// Contrat du catalogue officiel des types de projet (13 types)
// Aligné sur les types de bien du module Investissement
// (à l'exception de « terrain constructible »).
// ============================================================================

describe("PROJECT_TYPES — catalogue officiel (13 types)", () => {
  it("contient exactement les 13 types de projet du catalogue", () => {
    expect(PROJECT_TYPES).toEqual([
      "maison",
      "maison_r_plus_1",
      "maison_r_plus_2",
      "villa",
      "appartement",
      "studio",
      "duplex",
      "immeuble",
      "local_commercial",
      "bureau",
      "entrepot",
      "residence_touristique",
      "projet_neuf",
    ]);
  });

  it("chaque type possède un libellé, une icône et un groupe d'affichage", () => {
    for (const t of PROJECT_TYPES) {
      expect(PROJECT_TYPE_LABELS[t], t).toBeTruthy();
      expect(PROJECT_TYPE_ICONS[t], t).toBeTruthy();
    }
    const grouped = PROJECT_TYPE_GROUPS.flatMap((g) => g.types);
    expect(grouped).toHaveLength(PROJECT_TYPES.length);
    expect(new Set(grouped).size).toBe(PROJECT_TYPES.length);
  });

  it("les configs de composition couvrent uniquement des types officiels", () => {
    const official = new Set(PROJECT_TYPES as readonly string[]);
    for (const t of ROOM_ELIGIBLE_TYPES) expect(official.has(t), t).toBe(true);
    for (const t of SINGLE_LEVEL_TYPES) expect(official.has(t), t).toBe(true);
  });

  it("chaque type officiel est couvert par le mapping vers investissement", () => {
    const investmentWithoutTerrain = INVESTMENT_TYPES.filter((t) => t !== "terrain");
    // Les types officiels (13) incluent R+1/R+2 qui ne sont pas dans INVESTMENT_TYPES
    // mais tous les types officiels ont un équivalent d'investissement
    for (const t of PROJECT_TYPES) {
      expect(investmentTypeForProject(t), t).toBeDefined();
    }
  });
});

describe("resolveProjectType — résolution des slugs (nouveaux & anciens)", () => {
  it("retourne le slug tel quel pour un type officiel", () => {
    for (const t of PROJECT_TYPES) {
      expect(resolveProjectType(t)).toBe(t);
    }
  });

  it("résout les anciens slugs ayant un équivalent officiel", () => {
    expect(resolveProjectType("immeuble_residentiel")).toBe("immeuble");
    // maison_r_plus_1 et maison_r_plus_2 sont maintenant des types officiels
    // (ils retournent eux-mêmes via resolveProjectType)
    expect(resolveProjectType("boutique_commerciale")).toBe("local_commercial");
    expect(resolveProjectType("bureau_cabinet")).toBe("bureau");
    expect(resolveProjectType("atelier")).toBe("entrepot");
    expect(resolveProjectType("maison_hote")).toBe("residence_touristique");
    expect(resolveProjectType("renovation_complete")).toBe("projet_neuf");
    expect(resolveProjectType("piscine_beton")).toBe("villa");
    expect(resolveProjectType("garage")).toBe("local_commercial");
    expect(resolveProjectType("restaurant")).toBe("local_commercial");
    expect(resolveProjectType("batiment_agricole")).toBe("entrepot");
  });

  it("retourne null pour les anciens slugs sans équivalent officiel", () => {
    expect(resolveProjectType("jardin")).toBeNull();
    expect(resolveProjectType("slug_inconnu")).toBeNull();
    expect(resolveProjectType("demolition")).toBeNull();
  });
});

describe("projectTypeLabel — libellés d'affichage (nouveaux & anciens)", () => {
  it("affiche le libellé français des types officiels", () => {
    expect(projectTypeLabel("maison")).toBe("Maison");
    expect(projectTypeLabel("immeuble")).toBe("Immeuble");
    expect(projectTypeLabel("local_commercial")).toBe("Local commercial");
    expect(projectTypeLabel("residence_touristique")).toBe("Résidence touristique");
  });

  it("affiche le libellé des anciens types enregistrés", () => {
    expect(projectTypeLabel("maison_r_plus_1")).toBe("Maison R+1");
    expect(projectTypeLabel("jardin")).toBe("Jardin");
    expect(projectTypeLabel("installations_sanitaires")).toBe("Installations sanitaires");
  });

  it("retombe sur le slug brut pour un type inconnu", () => {
    expect(projectTypeLabel("slug_inconnu")).toBe("slug_inconnu");
  });

  it("tout slug de LEGACY_PROJECT_TYPE_MAP possède un libellé affichable", () => {
    for (const slug of Object.keys(LEGACY_PROJECT_TYPE_MAP)) {
      expect(projectTypeLabel(slug).length, slug).toBeGreaterThan(0);
    }
    for (const slug of Object.keys(LEGACY_TYPE_LABELS)) {
      expect(projectTypeLabel(slug).length, slug).toBeGreaterThan(0);
    }
  });
});

describe("investmentTypeForProject — lien direct avec le module Investissement", () => {
  it("les types officiels mappent vers des types d'investissement valides", () => {
    const investmentSet = new Set(INVESTMENT_TYPES);
    for (const t of PROJECT_TYPES) {
      const inv = investmentTypeForProject(t);
      expect(investmentSet.has(inv as any), `${t} → ${inv}`).toBe(true);
    }
  });

  it("les anciens types sont mappés vers l'équivalent le plus proche", () => {
    expect(investmentTypeForProject("maison_r_plus_1")).toBe("maison");
    expect(investmentTypeForProject("maison_r_plus_2")).toBe("villa");
    expect(investmentTypeForProject("boutique_commerciale")).toBe("local_commercial");
    expect(investmentTypeForProject("bureau_cabinet")).toBe("bureau");
    expect(investmentTypeForProject("atelier")).toBe("entrepot");
    expect(investmentTypeForProject("maison_hote")).toBe("residence_touristique");
    expect(investmentTypeForProject("renovation_complete")).toBe("projet_neuf");
    expect(investmentTypeForProject("piscine_beton")).toBe("villa");
    expect(investmentTypeForProject("garage")).toBe("local_commercial");
    expect(investmentTypeForProject("restaurant")).toBe("local_commercial");
  });

  it("retombe sur « appartement » pour un type inconnu", () => {
    expect(investmentTypeForProject("slug_inconnu")).toBe("appartement");
  });
});
