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
  INVESTMENT_ELIGIBLE_TYPES,
  INVESTMENT_INELIGIBLE_TYPES,
  isInvestmentEligible,
  projectHasPool,
} from "./projectTypes";
import { INVESTMENT_TYPES } from "./investmentTypes";

describe("inferFloorsFromCategory — niveaux par défaut du moteur BIM", () => {
  it("anciens slugs supprimés (legacy) : Maison R+1 → 2 niveaux · R+2 → 3", () => {
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
// Contrat du catalogue officiel des types de projet (11 types)
// Aligné sur les types de bien du module Investissement
// (à l'exception de « terrain constructible »).
// NB : « Maison R+1 » et « Maison R+2 » ont été supprimés — le nombre de
// niveaux est désormais choisi manuellement dans le formulaire.
// ============================================================================

describe("projectHasPool — piscine réellement présente dans le projet", () => {
  it("maison / appartement sans champ pools → pas de piscine", () => {
    expect(projectHasPool("maison", undefined)).toBe(false);
    expect(projectHasPool("appartement", undefined)).toBe(false);
    expect(projectHasPool("local_commercial", undefined)).toBe(false);
  });

  it("le champ pools explicitement renseigné est prioritaire", () => {
    expect(projectHasPool("maison", 0)).toBe(false);
    expect(projectHasPool("maison", 1)).toBe(true);
    // Une villa avec pools = 0 ne doit pas présélectionner la piscine.
    expect(projectHasPool("villa", 0)).toBe(false);
    expect(projectHasPool("villa", 1)).toBe(true);
  });

  it("villa / résidence touristique → piscine par défaut ; projet « piscine » → toujours", () => {
    expect(projectHasPool("villa", undefined)).toBe(true);
    expect(projectHasPool("residence_touristique", undefined)).toBe(true);
    expect(projectHasPool("piscine", 0)).toBe(true);
    expect(projectHasPool("piscine_coque", undefined)).toBe(true);
  });
});

describe("PROJECT_TYPES — catalogue officiel (21 types)", () => {
  it("contient exactement les 21 types de projet du catalogue", () => {
    expect(PROJECT_TYPES).toEqual([
      "maison",
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
      "renovation_complete",
      "extension_batiment",
      "renovation_cuisine",
      "renovation_salle_de_bain",
      "peinture_interieure",
      "piscine",
      "restaurant",
      "cafe",
      "electricite_complete",
      "plomberie_complete",
    ]);
    // Les anciens types « Maison R+1 » / « Maison R+2 » ne font plus partie
    // du catalogue officiel.
    expect(PROJECT_TYPES).not.toContain("maison_r_plus_1");
    expect(PROJECT_TYPES).not.toContain("maison_r_plus_2");
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
    // Tous les types officiels ont un équivalent d'investissement
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
    // maison_r_plus_1 et maison_r_plus_2 sont supprimés du catalogue :
    // ils sont remappés vers leurs équivalents officiels.
    expect(resolveProjectType("maison_r_plus_1")).toBe("maison");
    expect(resolveProjectType("maison_r_plus_2")).toBe("villa");
    expect(resolveProjectType("boutique_commerciale")).toBe("local_commercial");
    expect(resolveProjectType("bureau_cabinet")).toBe("bureau");
    expect(resolveProjectType("atelier")).toBe("entrepot");
    expect(resolveProjectType("maison_hote")).toBe("residence_touristique");
    // Les anciens slugs de rénovation/travaux sont désormais des types officiels
    expect(resolveProjectType("renovation_complete")).toBe("renovation_complete");
    expect(resolveProjectType("piscine_beton")).toBe("villa");
    expect(resolveProjectType("garage")).toBe("local_commercial");
    expect(resolveProjectType("restaurant")).toBe("restaurant");
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
    // renovation_complete est maintenant un type officiel → mappe vers projet_neuf via PROJECT_TO_INVESTMENT_TYPE
    expect(investmentTypeForProject("renovation_complete")).toBe("projet_neuf");
    expect(investmentTypeForProject("piscine_beton")).toBe("villa");
    expect(investmentTypeForProject("garage")).toBe("local_commercial");
    // restaurant est maintenant un type officiel → mappe vers local_commercial
    expect(investmentTypeForProject("restaurant")).toBe("local_commercial");
  });

  it("retombe sur « appartement » pour un type inconnu", () => {
    expect(investmentTypeForProject("slug_inconnu")).toBe("appartement");
  });
});

// ============================================================================
// Restriction Investissement — 11 éligibles / 10 exclus

describe("INVESTMENT_ELIGIBLE_TYPES / INVESTMENT_INELIGIBLE_TYPES", () => {
  it("les 10 types immobiliers sont éligibles (studio exclu → groupe B)", () => {
    const expected = [
      "maison", "villa", "appartement", "duplex", "immeuble",
      "local_commercial", "bureau", "entrepot", "residence_touristique", "projet_neuf",
    ];
    expect(INVESTMENT_ELIGIBLE_TYPES).toEqual(expected);
  });

  it("le studio n'est ni éligible investissement, ni dupliqué dans une liste d'exclusion", () => {
    expect(isInvestmentEligible("studio")).toBe(false);
    expect(INVESTMENT_INELIGIBLE_TYPES).not.toContain("studio");
    // Le classement reste « tout le reste = groupe B » : aucune double appartenance.
    expect(INVESTMENT_ELIGIBLE_TYPES).not.toContain("studio");
  });

  it("les 10 types rénovation/travaux sont exclus", () => {
    const expected = [
      "renovation_complete", "extension_batiment", "renovation_cuisine",
      "renovation_salle_de_bain", "peinture_interieure", "piscine",
      "restaurant", "cafe", "electricite_complete", "plomberie_complete",
    ];
    expect(INVESTMENT_INELIGIBLE_TYPES).toEqual(expected);
  });

  it("aucun chevauchement entre les deux listes", () => {
    const overlap = INVESTMENT_ELIGIBLE_TYPES.filter((t) =>
      INVESTMENT_INELIGIBLE_TYPES.includes(t)
    );
    expect(overlap).toEqual([]);
  });

  it("la somme couvre PROJECT_TYPES sauf le studio (groupe B sans analyse investissement)", () => {
    const all = [...INVESTMENT_ELIGIBLE_TYPES, ...INVESTMENT_INELIGIBLE_TYPES].sort();
    const expected = [...PROJECT_TYPES].sort().filter((t) => t !== "studio");
    expect(all).toEqual(expected);
    expect(INVESTMENT_ELIGIBLE_TYPES).not.toContain("studio");
  });
});

describe("isInvestmentEligible", () => {
  it("les 10 types éligibles retournent true", () => {
    for (const t of INVESTMENT_ELIGIBLE_TYPES) {
      expect(isInvestmentEligible(t), `${t}`).toBe(true);
    }
  });

  it("les 10 types exclus retournent false", () => {
    for (const t of INVESTMENT_INELIGIBLE_TYPES) {
      expect(isInvestmentEligible(t), `${t}`).toBe(false);
    }
  });

  it("les slugs legacy mappent correctement", () => {
    expect(isInvestmentEligible("maison_r_plus_1")).toBe(true);
    expect(isInvestmentEligible("boutique_commerciale")).toBe(true);
    // piscine_beton → villa (legacy map), villa est investissable
    expect(isInvestmentEligible("piscine_beton")).toBe(true);
  });

  it("un type inconnu est exclu par défaut (non investissable)", () => {
    expect(isInvestmentEligible("slug_inconnu")).toBe(false);
  });
});
