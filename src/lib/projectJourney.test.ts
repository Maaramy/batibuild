import { describe, it, expect } from "vitest";
import { PROJECT_TYPES } from "@/convex/projectTypes";
import {
  PROJECT_JOURNEY_GROUP_A,
  MATERIALS_PAGE_PATH,
  SUPPLIERS_DIRECTORY_PATH,
  buildAiMaterialsResultJourney,
  buildProjectJourney,
  projectJourneyGroup,
} from "./projectJourney";

// Ordre officiel du parcours groupe A : coût → plans → mise en relation →
// exécution & suivi.
const GROUP_A_LABELS = [
  "Coût estimatif",
  "Plans architecturaux AI",
  "Mise en relation",
  "Exécution & suivi",
];

const GROUP_A_KEYS = ["cost", "plans", "consult", "execution"];

// Ordre officiel du parcours groupe B : coût → mise en relation (aucun plans,
// aucune exécution, aucune fournisseurs).
const GROUP_B_LABELS = ["Coût estimatif", "Mise en relation"];

const GROUP_B_KEYS = ["cost", "consult"];

const PID = "proj_1";
const SUPPLIER_HREF = `${SUPPLIERS_DIRECTORY_PATH}?from=materials&region=Tunis`;

describe("projectJourneyGroup — groupe déduit du type de projet", () => {
  it("classe en groupe A les 11 types du parcours complet", () => {
    for (const type of [
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
    ]) {
      expect(projectJourneyGroup(type), type).toBe("A");
      expect(buildProjectJourney(type, PID).map((s) => s.key), type).toEqual(GROUP_A_KEYS);
    }
  });

  it("classe en groupe B la rénovation, les équipements et les travaux techniques", () => {
    for (const type of [
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
    ]) {
      expect(projectJourneyGroup(type), type).toBe("B");
    }
  });

  it("reconnaît aussi les anciens slugs enregistrés", () => {
    expect(projectJourneyGroup("maison_r_plus_1")).toBe("A");
    expect(projectJourneyGroup("maison_r_plus_2")).toBe("A");
    expect(projectJourneyGroup("atelier")).toBe("A");
  });

  it("retombe sur le groupe B pour un type absent ou inconnu", () => {
    expect(projectJourneyGroup(null)).toBe("B");
    expect(projectJourneyGroup(undefined)).toBe("B");
    expect(projectJourneyGroup("")).toBe("B");
    expect(projectJourneyGroup("type_inexistant")).toBe("B");
  });

  it("le groupe A correspond aux 11 types du parcours complet", () => {
    const groupA = PROJECT_TYPES.filter((t) => PROJECT_JOURNEY_GROUP_A.includes(t));
    expect(groupA).toHaveLength(11);
    expect(groupA).toContain("studio");
    // Chaque type officiel obtient bien un parcours non vide.
    for (const type of PROJECT_TYPES) {
      expect(buildProjectJourney(type, PID).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("chaque type du catalogue obtient exactement le parcours de son groupe", () => {
    for (const type of PROJECT_TYPES) {
      const keys = buildProjectJourney(type, PID).map((s) => s.key);
      expect(keys, type).toEqual(
        projectJourneyGroup(type) === "A" ? GROUP_A_KEYS : GROUP_B_KEYS,
      );
    }
  });

  it("classification officielle des 11 types du Groupe A et de tous les autres en Groupe B", () => {
    const EXPECTED_GROUP_A = [
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
    ];
    // Groupe A : exactement les 11 types demandés, dans l'ordre du catalogue.
    expect(PROJECT_JOURNEY_GROUP_A.slice().sort()).toEqual(EXPECTED_GROUP_A.slice().sort());
    expect(PROJECT_TYPES.filter((t) => projectJourneyGroup(t) === "A")).toEqual(
      PROJECT_TYPES.filter((t) => EXPECTED_GROUP_A.includes(t)),
    );

    // Groupe B : TOUS les autres types du catalogue (aucun oubli, aucun doublon).
    const groupB = PROJECT_TYPES.filter((t) => projectJourneyGroup(t) === "B");
    expect(groupB.length).toBeGreaterThan(0);
    for (const type of groupB) {
      expect(EXPECTED_GROUP_A, type).not.toContain(type);
      expect(buildProjectJourney(type, PID).map((s) => s.key), type).toEqual(GROUP_B_KEYS);
    }
    expect(groupB).toContain("renovation_complete");
    expect(groupB).toContain("piscine");
    expect(groupB).toContain("restaurant");
    // Types explicitement hors Groupe A.
    for (const type of ["studio", "local_commercial", "bureau", "entrepot"]) {
      expect(PROJECT_TYPES, type).toContain(type);
    }
  });
});

describe("buildProjectJourney — ordre des étapes", () => {
  it("Maison : 4 étapes dans l'ordre officiel", () => {
    expect(buildProjectJourney("maison", PID).map((s) => s.label)).toEqual(GROUP_A_LABELS);
  });

  it("Villa : même structure que Maison", () => {
    expect(buildProjectJourney("villa", PID).map((s) => s.label)).toEqual(GROUP_A_LABELS);
  });

  it("Appartement : même structure que Maison", () => {
    expect(buildProjectJourney("appartement", PID).map((s) => s.label)).toEqual(GROUP_A_LABELS);
  });

  it("place « Plans architecturaux AI » juste après le coût estimatif", () => {
    const keys = buildProjectJourney("maison", PID).map((s) => s.key);
    expect(keys.indexOf("plans")).toBe(keys.indexOf("cost") + 1);
    expect(keys.indexOf("plans")).toBeLessThan(keys.indexOf("consult"));
  });

  it("le parcours du groupe A se termine par mise en relation puis exécution & suivi", () => {
    const keys = buildProjectJourney("maison", PID).map((s) => s.key);
    expect(keys.indexOf("consult")).toBeLessThan(keys.indexOf("execution"));
    expect(keys[keys.length - 1]).toBe("execution");
  });

  it("le Journey ne comporte plus d'étape « Choix matériaux »", () => {
    for (const type of ["maison", "villa", "appartement"]) {
      const steps = buildProjectJourney(type, PID);
      expect(steps.some((s) => /mat[ée]riaux/i.test(s.label))).toBe(false);
      expect(steps.some((s) => s.href.includes("/dashboard/ai-materials"))).toBe(false);
    }
  });

  it("Rénovation : coût estimatif → mise en relation", () => {
    expect(buildProjectJourney("renovation_complete", PID).map((s) => s.label)).toEqual(
      GROUP_B_LABELS,
    );
  });

  it("Cuisine : coût estimatif → mise en relation", () => {
    expect(buildProjectJourney("renovation_cuisine", PID).map((s) => s.label)).toEqual(
      GROUP_B_LABELS,
    );
  });

  it("Salle de bain : coût estimatif → mise en relation", () => {
    expect(buildProjectJourney("renovation_salle_de_bain", PID).map((s) => s.label)).toEqual(
      GROUP_B_LABELS,
    );
  });

  it("le parcours du groupe B se limite au coût puis à la mise en relation", () => {
    const keys = buildProjectJourney("piscine", PID).map((s) => s.key);
    expect(keys).toEqual(GROUP_B_KEYS);
    expect(keys.indexOf("cost")).toBe(0);
    expect(keys[keys.length - 1]).toBe("consult");
  });

  it("groupe B : aucune étape « Plans », « Exécution » ni « Fournisseurs »", () => {
    const steps = buildProjectJourney("piscine", PID);
    expect(steps.some((s) => /plan/i.test(s.label))).toBe(false);
    expect(steps.some((s) => /ex[ée]cution/i.test(s.label))).toBe(false);
    expect(steps.some((s) => /fournisseur/i.test(s.label))).toBe(false);
    expect(steps.some((s) => s.href.includes("/dashboard/plans"))).toBe(false);
    expect(steps.some((s) => s.href.includes("/dashboard/guide"))).toBe(false);
    expect(steps.some((s) => s.href.includes("/dashboard/suppliers-directory"))).toBe(false);
  });

  it("chaque étape du groupe B porte la clé du rapport PDF associé", () => {
    const byKey = Object.fromEntries(
      buildProjectJourney("renovation_complete", PID).map((s) => [s.key, s.reportKey ?? null]),
    );
    expect(byKey).toMatchObject({
      cost: "cost",
      consult: null,
    });
  });

  it("le Journey est masqué (aucune étape) sans identifiant de projet", () => {
    expect(buildProjectJourney("maison", null)).toEqual([]);
    expect(buildProjectJourney("maison", undefined)).toEqual([]);
    expect(buildProjectJourney("maison", "   ")).toEqual([]);
  });
});

describe("buildProjectJourney — liens, rapports et contexte du projet", () => {
  it("chaque étape pointe vers le module correspondant (exécution en dernière position)", () => {
    const steps = buildProjectJourney("villa", PID);
    expect(steps.map((s) => s.key)).toEqual(GROUP_A_KEYS);
    expect(steps.map((s) => s.href)).toEqual([
      "/dashboard/project/proj_1",
      "/dashboard/plans/proj_1",
      "/dashboard/professionals-directory?project=proj_1",
      "/dashboard/guide?project=proj_1",
    ]);
  });

  it("chaque étape du groupe A porte la clé du rapport PDF associé (mise en relation sans rapport)", () => {
    const byKey = Object.fromEntries(
      buildProjectJourney("maison", PID).map((s) => [s.key, s.reportKey ?? null]),
    );
    expect(byKey).toMatchObject({
      cost: "cost",
      plans: "plans",
      consult: null,
      execution: "execution",
    });
  });

  it("groupe B : chaque étape conserve le contexte du projet", () => {
    const steps = buildProjectJourney("renovation_complete", PID);
    expect(steps.map((s) => s.key)).toEqual(GROUP_B_KEYS);
    expect(steps.map((s) => s.href)).toEqual([
      `/dashboard/project/${PID}`,
      `/dashboard/professionals-directory?project=${PID}`,
    ]);
  });

  it("le projet est conservé dans tous les liens (aucune donnée perdue)", () => {
    for (const category of ["maison", "extension_batiment"]) {
      const steps = buildProjectJourney(category, "proj_old");
      expect(steps.every((s) => s.href.includes("proj_old"))).toBe(true);
      expect(steps.every((s) => s.path.startsWith("/dashboard/"))).toBe(true);
    }
  });

  it("les liens du parcours sont uniques (aucune destination dupliquée)", () => {
    const steps = buildProjectJourney("maison", PID);
    // Chaque étape a une route de repérage et un lien distincts.
    expect(new Set(steps.map((s) => s.href)).size).toBe(steps.length);
    expect(new Set(steps.map((s) => s.path)).size).toBe(steps.length);
    expect(steps.filter((s) => s.path === `/dashboard/project/${PID}`)).toHaveLength(1);
  });
});

describe("buildProjectJourney — filtrage par feature flags de l'administration", () => {
  it("sans état de flags, toutes les étapes s'affichent (comportement par défaut)", () => {
    expect(buildProjectJourney("maison", PID, undefined).map((s) => s.key)).toEqual(
      GROUP_A_KEYS,
    );
    expect(buildProjectJourney("maison", PID, null).map((s) => s.key)).toHaveLength(4);
  });

  it("« Plans » disparaît quand architectural_plans est désactivé (ordre conservé)", () => {
    const flags = { architectural_plans: false };
    expect(buildProjectJourney("maison", PID, flags).map((s) => s.key)).toEqual([
      "cost",
      "consult",
      "execution",
    ]);
  });

  it("ai_materials n'influence plus le parcours groupe A (plus d'étape matériaux)", () => {
    expect(buildProjectJourney("maison", PID, { ai_materials: false }).map((s) => s.key)).toEqual(
      GROUP_A_KEYS,
    );
  });

  it("« Coût estimatif » disparaît quand construction_cost_estimation est désactivé (groupe A et B)", () => {
    const flags = { construction_cost_estimation: false };
    expect(buildProjectJourney("maison", PID, flags).map((s) => s.key)).toEqual([
      "plans",
      "consult",
      "execution",
    ]);
    expect(buildProjectJourney("renovation_complete", PID, flags).map((s) => s.key)).toEqual([
      "consult",
    ]);
  });

  it("groupe B : l'étape « Plans architecturaux AI » n'existe jamais, quel que soit le flag", () => {
    const steps = buildProjectJourney("piscine", PID, { architectural_plans: false });
    expect(steps.map((s) => s.key)).toEqual(GROUP_B_KEYS);
    expect(steps.some((s) => s.href.includes("/dashboard/plans"))).toBe(false);
  });

  it("toutes les étapes gérées par un flag disparaissent ensemble (groupe B)", () => {
    const flags = { construction_cost_estimation: false, architectural_plans: false };
    expect(buildProjectJourney("piscine", PID, flags).map((s) => s.key)).toEqual(["consult"]);
  });

  it("« Exécution & suivi » disparaît quand construction_guide est désactivé", () => {
    const flags = { construction_guide: false };
    const steps = buildProjectJourney("maison", PID, flags);
    expect(steps.map((s) => s.key)).toEqual([
      "cost",
      "plans",
      "consult",
    ]);
    // Aucun vestige : ni libellé, ni lien vers le guide.
    expect(steps.some((s) => /ex[ée]cution/i.test(s.label))).toBe(false);
    expect(steps.some((s) => s.href.includes("/dashboard/guide"))).toBe(false);
  });

  it("les étapes non pilotées par un flag (mise en relation) restent toujours affichées", () => {
    const flags = {
      construction_cost_estimation: false,
      architectural_plans: false,
      ai_materials: false,
      construction_guide: false,
    };
    expect(buildProjectJourney("maison", PID, flags).map((s) => s.key)).toEqual([
      "consult",
    ]);
  });

  it("réactiver le flag restaure l'étape à sa place d'origine", () => {
    const off = buildProjectJourney("maison", PID, { architectural_plans: false });
    const back = buildProjectJourney("maison", PID, { architectural_plans: true });
    expect(off.map((s) => s.key)).not.toContain("plans");
    expect(back.map((s) => s.key)).toEqual(GROUP_A_KEYS);
  });

  it("groupe A : « Exécution & suivi » referme le parcours", () => {
    const steps = buildProjectJourney("villa", PID);
    expect(steps.map((s) => s.key)).toEqual(GROUP_A_KEYS);
    expect(steps[steps.length - 1].href).toBe(`/dashboard/guide?project=${PID}`);
  });

  it("groupe B : seules les 3 étapes officielles apparaissent", () => {
    const steps = buildProjectJourney("renovation_complete", PID);
    expect(steps.map((s) => s.key)).toEqual(GROUP_B_KEYS);
  });

  it("le contexte projet reste conservé après filtrage", () => {
    const steps = buildProjectJourney("maison", PID, { architectural_plans: false });
    expect(steps.every((s) => s.href.includes(PID))).toBe(true);
  });

  it("les liens restent uniques après filtrage", () => {
    const steps = buildProjectJourney("maison", PID, { ai_materials: false });
    expect(new Set(steps.map((s) => s.href)).size).toBe(steps.length);
  });

  it("invariant : le parcours n'est jamais vide avec un projet valide, même tous flags désactivés", () => {
    const allOff = {
      construction_cost_estimation: false,
      architectural_plans: false,
      ai_materials: false,
      construction_guide: false,
    };
    // Mise en relation / Fournisseurs ne dépendent d'aucun flag.
    for (const type of PROJECT_TYPES) {
      expect(buildProjectJourney(type, PID, allOff).length, type).toBeGreaterThanOrEqual(1);
    }
    // Parcours dédié « Résultat IA » : seule l'étape Fournisseur subsiste.
    expect(buildAiMaterialsResultJourney(PID, SUPPLIER_HREF, allOff).map((s) => s.key)).toEqual([
      "supplier",
    ]);
  });
});

describe("buildAiMaterialsResultJourney — filtrage par feature flags", () => {
  it("« Liste prix » disparaît quand ai_materials est désactivé (« Fournisseur » reste)", () => {
    const off = buildAiMaterialsResultJourney(PID, SUPPLIER_HREF, { ai_materials: false });
    expect(off.map((s) => s.key)).toEqual(["cost", "supplier"]);
  });

  it("« Coût estimatif » disparaît quand construction_cost_estimation est désactivé", () => {
    const steps = buildAiMaterialsResultJourney(PID, SUPPLIER_HREF, {
      construction_cost_estimation: false,
    });
    expect(steps.map((s) => s.key)).toEqual(["priceList", "supplier"]);
  });

  it("sans flags fournis, l'ordre complet est conservé", () => {
    expect(buildAiMaterialsResultJourney(PID, SUPPLIER_HREF).map((s) => s.key)).toEqual([
      "cost",
      "priceList",
      "supplier",
    ]);
  });
});

describe("buildAiMaterialsResultJourney — page « Résultat de l'analyse IA »", () => {
  it("ordre strict : coût estimatif, liste prix, fournisseur", () => {
    const steps = buildAiMaterialsResultJourney(PID, SUPPLIER_HREF);
    expect(steps.map((s) => s.label)).toEqual([
      "Coût estimatif",
      "Liste prix",
      "Fournisseur",
    ]);
    expect(steps.map((s) => s.key)).toEqual(["cost", "priceList", "supplier"]);
  });

  it("« Liste prix » ouvre la page Matériaux de construction, « Fournisseur » l'annuaire pré-filtré", () => {
    const steps = buildAiMaterialsResultJourney(PID, SUPPLIER_HREF);
    expect(steps[0].href).toBe(`/dashboard/project/${PID}`);
    expect(steps[1].href).toBe(`${MATERIALS_PAGE_PATH}?project=${PID}`);
    expect(steps[1].path).toBe(MATERIALS_PAGE_PATH);
    expect(steps[2].href).toBe(SUPPLIER_HREF);
    expect(steps[2].path).toBe(SUPPLIERS_DIRECTORY_PATH);
    // Le contexte du projet est conservé sur les deux premières étapes.
    expect(steps.slice(0, 2).every((s) => s.href.includes(PID))).toBe(true);
  });

  it("« Fournisseur » sans lien fourni → annuaire sans pré-filtre", () => {
    const steps = buildAiMaterialsResultJourney(PID);
    expect(steps[2].href).toBe(SUPPLIERS_DIRECTORY_PATH);
  });

  it("même ordre pour tous les types de projet (le groupe n'intervient pas)", () => {
    const labels = ["Coût estimatif", "Liste prix", "Fournisseur"];
    for (const type of PROJECT_TYPES) {
      const steps = buildAiMaterialsResultJourney(PID, SUPPLIER_HREF);
      expect(steps.map((s) => s.label), type).toEqual(labels);
    }
  });

  it("les routes de repérage de l'étape active restent uniques", () => {
    const steps = buildAiMaterialsResultJourney(PID, SUPPLIER_HREF);
    expect(new Set(steps.map((s) => s.path)).size).toBe(steps.length);
  });

  it("Journey masqué sans identifiant de projet (aucune étape)", () => {
    expect(buildAiMaterialsResultJourney(null, SUPPLIER_HREF)).toEqual([]);
    expect(buildAiMaterialsResultJourney("  ")).toEqual([]);
  });
});
