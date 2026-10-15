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
  inferFloorsFromCategory,
  projectHasPool,
  CATEGORY_SURFACE_RULES,
  DEFAULT_SURFACE_RULE,
  surfaceRuleForCategory,
  normalizeSurface,
  isSurfaceInRange,
  surfaceForCategoryChange,
} from "./projectTypes";

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

// ============================================================================
// SURFACE COUVERTE — plages, pas et valeurs par défaut par type de projet
// ============================================================================

describe("surfaceRuleForCategory — plages par type de projet", () => {
  it("rénovation cuisine : 8 → 12 m², pas 1 m², défaut 10 m²", () => {
    expect(surfaceRuleForCategory("renovation_cuisine")).toEqual({
      min: 8,
      max: 12,
      step: 1,
      defaultValue: 10,
    });
  });

  it("rénovation salle de bain : 4 → 8 m², pas 1 m², défaut 5 m²", () => {
    expect(surfaceRuleForCategory("renovation_salle_de_bain")).toEqual({
      min: 4,
      max: 8,
      step: 1,
      defaultValue: 5,
    });
  });

  it("piscine : 15 → 50 m², pas 1 m², défaut 32 m² (slug legacy inclus)", () => {
    expect(surfaceRuleForCategory("piscine")).toEqual({
      min: 15,
      max: 50,
      step: 1,
      defaultValue: 32,
    });
    expect(surfaceRuleForCategory("piscine_coque")).toEqual(
      surfaceRuleForCategory("piscine"),
    );
  });

  it("tous les autres types : 50 → 300 m², pas 5 m², défaut 100 m²", () => {
    for (const t of ["maison", "villa", "appartement", "immeuble", "local_commercial", "restaurant"]) {
      expect(surfaceRuleForCategory(t), t).toEqual(DEFAULT_SURFACE_RULE);
    }
    expect(DEFAULT_SURFACE_RULE).toEqual({ min: 50, max: 300, step: 5, defaultValue: 100 });
    // Aucune catégorie : règle par défaut.
    expect(surfaceRuleForCategory("")).toEqual(DEFAULT_SURFACE_RULE);
    expect(surfaceRuleForCategory(undefined)).toEqual(DEFAULT_SURFACE_RULE);
    expect(surfaceRuleForCategory(null)).toEqual(DEFAULT_SURFACE_RULE);
  });

  it("chaque règle spécifique a des bornes cohérentes et un défaut inclus", () => {
    for (const [slug, rule] of Object.entries(CATEGORY_SURFACE_RULES)) {
      expect(rule.min, slug).toBeLessThan(rule.max);
      expect(rule.step, slug).toBeGreaterThan(0);
      expect(rule.defaultValue, slug).toBeGreaterThanOrEqual(rule.min);
      expect(rule.defaultValue, slug).toBeLessThanOrEqual(rule.max);
    }
  });
});

describe("normalizeSurface — jamais hors bornes, jamais NaN", () => {
  it("borne une surface trop basse / trop haute", () => {
    const cuisine = surfaceRuleForCategory("renovation_cuisine");
    expect(normalizeSurface(cuisine, 2)).toBe(8);
    expect(normalizeSurface(cuisine, 99)).toBe(12);
  });

  it("renvoie la valeur par défaut pour undefined / null / NaN / texte vide", () => {
    const sdb = surfaceRuleForCategory("renovation_salle_de_bain");
    expect(normalizeSurface(sdb, undefined)).toBe(5);
    expect(normalizeSurface(sdb, null)).toBe(5);
    expect(normalizeSurface(sdb, NaN)).toBe(5);
    expect(normalizeSurface(sdb, "")).toBe(5);
  });

  it("accepte une chaîne numérique et aligne sur le pas (5 m² par défaut)", () => {
    const generic = DEFAULT_SURFACE_RULE;
    expect(normalizeSurface(generic, "150")).toBe(150);
    expect(normalizeSurface(generic, 152)).toBe(150);
    expect(normalizeSurface(generic, 153)).toBe(155);
    expect(normalizeSurface(generic, 40)).toBe(50);
    expect(normalizeSurface(generic, 999)).toBe(300);
  });
});

describe("isSurfaceInRange — contrôle de plage", () => {
  it("vrai dans la plage, faux en dehors ou pour une valeur non numérique", () => {
    expect(isSurfaceInRange("renovation_cuisine", 8)).toBe(true);
    expect(isSurfaceInRange("renovation_cuisine", 12)).toBe(true);
    expect(isSurfaceInRange("renovation_cuisine", 7)).toBe(false);
    expect(isSurfaceInRange("renovation_cuisine", 13)).toBe(false);
    expect(isSurfaceInRange("maison", 45)).toBe(false);
    expect(isSurfaceInRange("maison", 50)).toBe(true);
    expect(isSurfaceInRange("maison", null)).toBe(false);
    expect(isSurfaceInRange("maison", "pas un nombre")).toBe(false);
  });
});

describe("surfaceForCategoryChange — surface toujours valide après un changement de type", () => {
  it("scénario 1 → cuisine depuis la plage par défaut : 10 m²", () => {
    expect(surfaceForCategoryChange("renovation_cuisine", 100)).toBe(10);
  });

  it("scénario 2 → salle de bain depuis cuisine (10 m²) : 5 m²", () => {
    expect(surfaceForCategoryChange("renovation_salle_de_bain", 10)).toBe(5);
  });

  it("scénario 3 → piscine depuis salle de bain (5 m²) : 32 m²", () => {
    expect(surfaceForCategoryChange("piscine", 5)).toBe(32);
  });

  it("scénario 4 → autre type depuis piscine (32 m²) : 100 m²", () => {
    expect(surfaceForCategoryChange("maison", 32)).toBe(100);
  });

  it("conserve la surface si elle reste dans la nouvelle plage (alignée sur le pas)", () => {
    // Autre type → autre type : la valeur courante valide est conservée.
    expect(surfaceForCategoryChange("villa", 120)).toBe(120);
    // Alignement sur le pas de 5 m².
    expect(surfaceForCategoryChange("villa", 122)).toBe(120);
    // Cuisine → cuisine : valeur encore dans la plage conservée.
    expect(surfaceForCategoryChange("renovation_cuisine", 9)).toBe(9);
  });

  it("le résultat est toujours dans la plage du type cible (défaut ou valeur conservée)", () => {
    const transitions = [100, 5, 10, 32, 8, 12, 4, 50, 15, 300, 51, 3, 999];
    for (const cat of ["renovation_cuisine", "renovation_salle_de_bain", "piscine", "maison"]) {
      const rule = surfaceRuleForCategory(cat);
      for (const current of transitions) {
        const next = surfaceForCategoryChange(cat, current);
        expect(next, `${cat} <- ${current}`).toBeGreaterThanOrEqual(rule.min);
        expect(next, `${cat} <- ${current}`).toBeLessThanOrEqual(rule.max);
        expect(Number.isFinite(next), `${cat} <- ${current}`).toBe(true);
      }
    }
  });
});
