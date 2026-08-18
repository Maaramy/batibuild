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

// ════════════════════════════════════════════════════════════════════════
// Contrat du catalogue unifié des types de bien (11 types)
// Le type de bien du formulaire « Nouveau projet » est aligné sur le module
// Investissement (INVESTMENT_TYPES) à l'exception de « Terrain constructible »,
// qui n'est pas un projet de construction.
// ════════════════════════════════════════════════════════════════════════

describe("PROJECT_TYPES — catalogue unifié (11 types)", () => {
  it("contient exactement les 11 types de bien alignés sur l'investissement", () => {
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
    ]);
  });

  it("est aligné sur INVESTMENT_TYPES à l'exception de « terrain »", () => {
    const projectSet = new Set(PROJECT_TYPES as readonly string[]);
    // Chaque type de projet est un type d'investissement
    for (const t of PROJECT_TYPES) {
      expect(INVESTMENT_TYPES, t).toContain(t);
    }
    // La seule différence est « terrain » (terrain constructible)
    const missing = INVESTMENT_TYPES.filter((t) => !projectSet.has(t));
    expect(missing).toEqual(["terrain"]);
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
    expect(resolveProjectType("maison_hote")).toBe("residence_touristique");
    expect(resolveProjectType("boutique_commerciale")).toBe("local_commercial");
    expect(resolveProjectType("bureau_cabinet")).toBe("bureau");
    expect(resolveProjectType("atelier")).toBe("entrepot");
  });

  it("retourne null pour les anciens slugs sans équivalent officiel", () => {
    expect(resolveProjectType("jardin")).toBeNull();
    expect(resolveProjectType("renovation_complete")).toBeNull();
    expect(resolveProjectType("piscine_beton")).toBeNull();
    expect(resolveProjectType("installations_electricite")).toBeNull();
    expect(resolveProjectType("slug_inconnu")).toBeNull();
  });
});

describe("projectTypeLabel — libellés d'affichage (nouveaux & anciens)", () => {
  it("affiche le libellé français des types officiels", () => {
    expect(projectTypeLabel("maison")).toBe("Maison");
    expect(projectTypeLabel("immeuble")).toBe("Immeuble");
    expect(projectTypeLabel("projet_neuf")).toBe("Projet immobilier neuf");
  });

  it("affiche le libellé des anciens types enregistrés", () => {
    expect(projectTypeLabel("maison_r_plus_1")).toBe("Maison R+1");
    expect(projectTypeLabel("jardin")).toBe("Jardin");
    expect(projectTypeLabel("restaurant")).toBe("Restaurant");
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
  it("les types officiels correspondent 1:1 à leur type d'investissement", () => {
    for (const t of PROJECT_TYPES) {
      expect(investmentTypeForProject(t), t).toBe(t);
    }
  });

  it("les anciens types sont mappés vers l'équivalent le plus proche", () => {
    expect(investmentTypeForProject("maison_r_plus_1")).toBe("maison");
    expect(investmentTypeForProject("maison_hote")).toBe("residence_touristique");
    expect(investmentTypeForProject("restaurant")).toBe("local_commercial");
    expect(investmentTypeForProject("bureau_cabinet")).toBe("bureau");
    expect(investmentTypeForProject("atelier")).toBe("entrepot");
    expect(investmentTypeForProject("piscine")).toBe("villa");
    expect(investmentTypeForProject("renovation_complete")).toBe("appartement");
  });

  it("retombe sur « appartement » pour un type inconnu", () => {
    expect(investmentTypeForProject("slug_inconnu")).toBe("appartement");
  });
});
