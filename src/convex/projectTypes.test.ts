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
} from "./projectTypes";
import { INVESTMENT_TYPES } from "./investmentTypes";

// ============================================================================
// Contrat du catalogue officiel des types de projet (25 types)
// Le catalogue est classé en : Résidentiel (8), Rénovation & finitions (4),
// Équipements extérieurs (3), Commercial & tertiaire (7), Technique & artisanat (3).
// ============================================================================

describe("PROJECT_TYPES — catalogue officiel (25 types)", () => {
  it("contient exactement les 25 types de projet du catalogue", () => {
    expect(PROJECT_TYPES).toEqual([
      // Résidentiel
      "maison",
      "villa",
      "maison_r_plus_1",
      "maison_r_plus_2",
      "immeuble",
      "appartement",
      "studio",
      "duplex",
      // Rénovation & finitions
      "renovation_complete",
      "renovation_cuisine",
      "renovation_salle_de_bain",
      "peinture_interieure",
      // Équipements extérieurs
      "piscine_beton",
      "piscine_coque",
      "garage",
      // Commercial & tertiaire
      "boutique_commerciale",
      "restaurant",
      "cafe",
      "bureau_cabinet",
      "atelier",
      "entrepot",
      "maison_hote",
      // Technique & artisanat
      "batiment_agricole",
      "electricite_complete",
      "plomberie_complete",
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
});

describe("resolveProjectType — résolution des slugs (nouveaux & anciens)", () => {
  it("retourne le slug tel quel pour un type officiel", () => {
    for (const t of PROJECT_TYPES) {
      expect(resolveProjectType(t)).toBe(t);
    }
  });

  it("résout les anciens slugs ayant un équivalent officiel", () => {
    expect(resolveProjectType("immeuble_residentiel")).toBe("immeuble");
    expect(resolveProjectType("maison_hote")).toBe("maison_hote"); // Now official
    expect(resolveProjectType("local_commercial")).toBe("boutique_commerciale");
    expect(resolveProjectType("bureau")).toBe("bureau_cabinet");
    expect(resolveProjectType("atelier")).toBe("atelier"); // Now official
    expect(resolveProjectType("residence_touristique")).toBe("maison_hote");
    expect(resolveProjectType("projet_neuf")).toBe("immeuble");
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
    expect(projectTypeLabel("immeuble")).toBe("Immeuble résidentiel");
    expect(projectTypeLabel("boutique_commerciale")).toBe("Boutique commerciale");
    expect(projectTypeLabel("renovation_complete")).toBe("Rénovation complète");
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
  it("les types résidentiels correspondent à leur type d'investissement", () => {
    const residentialMap: Record<string, string> = {
      maison: "maison",
      villa: "villa",
      maison_r_plus_1: "maison",
      maison_r_plus_2: "maison",
      immeuble: "immeuble",
      appartement: "appartement",
      studio: "studio",
      duplex: "duplex",
    };
    for (const [t, expected] of Object.entries(residentialMap)) {
      expect(investmentTypeForProject(t), t).toBe(expected);
    }
  });

  it("les types renovation/piscine/garage mappent vers l'investissement le plus proche", () => {
    expect(investmentTypeForProject("renovation_complete")).toBe("appartement");
    expect(investmentTypeForProject("piscine_beton")).toBe("villa");
    expect(investmentTypeForProject("garage")).toBe("local_commercial");
    expect(investmentTypeForProject("restaurant")).toBe("local_commercial");
    expect(investmentTypeForProject("bureau_cabinet")).toBe("bureau");
    expect(investmentTypeForProject("atelier")).toBe("entrepot");
  });

  it("les anciens types sont mappés vers l'équivalent le plus proche", () => {
    expect(investmentTypeForProject("maison_r_plus_1")).toBe("maison");
    expect(investmentTypeForProject("local_commercial")).toBe("local_commercial");
    expect(investmentTypeForProject("bureau")).toBe("bureau");
    expect(investmentTypeForProject("piscine")).toBe("villa");
  });

  it("retombe sur « appartement » pour un type inconnu", () => {
    expect(investmentTypeForProject("slug_inconnu")).toBe("appartement");
  });
});
