import { describe, it, expect } from "vitest";
import { PROJECT_TYPES } from "@/convex/projectTypes";
import {
  PROJECT_JOURNEY_GROUP_A,
  MATERIALS_PAGE_PATH,
  SUPPLIERS_DIRECTORY_PATH,
  buildAiMaterialsResultJourney,
  buildProjectJourney,
  canAccessJourneyStep,
  costEstimateLoadingSteps,
  projectJourneyGroup,
} from "./projectJourney";

// Ordre officiel du parcours groupe A (6 étapes) : type → coût → aide à la
// décision → plans IA → mise en relation → exécution & suivi. L'étape
// « Matériaux utilisés » a été supprimée : elle n'apparaît nulle part.
const GROUP_A_LABELS = [
  "Type de projet",
  "Coût estimatif",
  "Aide à la décision",
  "Plans architecturaux AI",
  "Mise en relation",
  "Exécution & suivi",
];

const GROUP_A_KEYS = ["type", "cost", "decision", "plans", "consult", "execution"];

// Ordre officiel du parcours groupe B (3 étapes) : type → coût → mise en
// relation. Ni « Aide à la décision », ni « Plans architecturaux AI », ni
// « Exécution & suivi ».
const GROUP_B_LABELS = ["Type de projet", "Coût estimatif", "Mise en relation"];

const GROUP_B_KEYS = ["type", "cost", "consult"];

const PID = "proj_1";
const SUPPLIER_HREF = `${SUPPLIERS_DIRECTORY_PATH}?from=materials&region=Tunis`;

describe("projectJourneyGroup — groupe déduit du type de projet", () => {
  it("classe en groupe A les 14 types du parcours complet", () => {
    for (const type of [
      "maison",
      "appartement",
      "villa",
      "immeuble",
      "local_commercial",
      "studio",
      "duplex",
      "bureau",
      "entrepot",
      "residence_touristique",
      "projet_neuf",
      "restaurant",
      "cafe",
      "renovation_complete",
    ]) {
      expect(projectJourneyGroup(type), type).toBe("A");
      expect(buildProjectJourney(type, PID).map((s) => s.key), type).toEqual(GROUP_A_KEYS);
    }
  });

  it("classe en groupe B tous les autres types (piscine, clôture, jardin, extension, cuisine…)", () => {
    for (const type of [
      "extension_batiment",
      "renovation_cuisine",
      "renovation_salle_de_bain",
      "peinture_interieure",
      "piscine",
      "electricite_complete",
      "plomberie_complete",
      "cloture",
      "jardin",
      "amenagement_paysager",
      "terrasse",
      "pergola",
      "demolition",
    ]) {
      expect(projectJourneyGroup(type), type).toBe("B");
      expect(buildProjectJourney(type, PID).map((s) => s.key), type).toEqual(GROUP_B_KEYS);
    }
  });

  it("reconnaît aussi les anciens slugs enregistrés", () => {
    expect(projectJourneyGroup("maison_r_plus_1")).toBe("A");
    expect(projectJourneyGroup("maison_r_plus_2")).toBe("A");
    expect(projectJourneyGroup("atelier")).toBe("A");
  });

  it("reconnaît les libellés libres du groupe A (restaurant, café, rénovation complète)", () => {
    expect(projectJourneyGroup("Restaurant")).toBe("A");
    expect(projectJourneyGroup("Café")).toBe("A");
    expect(projectJourneyGroup("Rénovation complète")).toBe("A");
    expect(projectJourneyGroup("Projet immobilier neuf")).toBe("A");
    expect(projectJourneyGroup("Local commercial")).toBe("A");
    expect(projectJourneyGroup("Résidence touristique")).toBe("A");
  });

  it("retombe sur le groupe B pour un type absent ou inconnu", () => {
    expect(projectJourneyGroup(null)).toBe("B");
    expect(projectJourneyGroup(undefined)).toBe("B");
    expect(projectJourneyGroup("")).toBe("B");
    expect(projectJourneyGroup("type_inexistant")).toBe("B");
  });

  it("la liste officielle du groupe A contient exactement les 14 types demandés", () => {
    const expected = [
      "maison",
      "appartement",
      "villa",
      "immeuble",
      "local_commercial",
      "studio",
      "duplex",
      "bureau",
      "entrepot",
      "residence_touristique",
      "projet_neuf",
      "restaurant",
      "cafe",
      "renovation_complete",
    ];
    expect(PROJECT_JOURNEY_GROUP_A.slice().sort()).toEqual(expected.slice().sort());
    expect(PROJECT_JOURNEY_GROUP_A).toHaveLength(14);
  });

  it("chaque type du catalogue obtient exactement le parcours de son groupe", () => {
    for (const type of PROJECT_TYPES) {
      const keys = buildProjectJourney(type, PID).map((s) => s.key);
      expect(keys, type).toEqual(
        projectJourneyGroup(type) === "A" ? GROUP_A_KEYS : GROUP_B_KEYS,
      );
    }
  });
});

describe("buildProjectJourney — ordre obligatoire des étapes", () => {
  it("Maison : 6 étapes du groupe A dans le bon ordre", () => {
    expect(buildProjectJourney("maison", PID).map((s) => s.label)).toEqual(GROUP_A_LABELS);
  });

  it("Appartement : 6 étapes du groupe A dans le bon ordre", () => {
    expect(buildProjectJourney("appartement", PID).map((s) => s.label)).toEqual(
      GROUP_A_LABELS,
    );
  });

  it("Restaurant : 6 étapes du groupe A dans le bon ordre", () => {
    expect(buildProjectJourney("restaurant", PID).map((s) => s.label)).toEqual(
      GROUP_A_LABELS,
    );
  });

  it("Café : 6 étapes du groupe A dans le bon ordre", () => {
    expect(buildProjectJourney("cafe", PID).map((s) => s.label)).toEqual(GROUP_A_LABELS);
  });

  it("Rénovation complète : 6 étapes du groupe A dans le bon ordre", () => {
    expect(buildProjectJourney("renovation_complete", PID).map((s) => s.label)).toEqual(
      GROUP_A_LABELS,
    );
  });

  it("Villa et Studio : même structure que Maison", () => {
    for (const type of ["villa", "studio", "duplex", "immeuble", "bureau", "entrepot"]) {
      expect(buildProjectJourney(type, PID).map((s) => s.label), type).toEqual(
        GROUP_A_LABELS,
      );
    }
  });

  it("le parcours commence par le type de projet puis le coût estimatif", () => {
    const steps = buildProjectJourney("maison", PID);
    expect(steps[0].key).toBe("type");
    expect(steps[0].href).toBe(`/dashboard/project/${PID}#type-de-projet`);
    expect(steps[1].key).toBe("cost");
    expect(steps[1].href).toBe(`/dashboard/project/${PID}`);
    // « Aide à la décision » suit le coût ; les plans viennent après.
    const keys = steps.map((s) => s.key);
    expect(keys.indexOf("decision")).toBe(keys.indexOf("cost") + 1);
    expect(keys.indexOf("plans")).toBe(keys.indexOf("decision") + 1);
    expect(keys.indexOf("consult")).toBe(keys.indexOf("plans") + 1);
  });

  it("le parcours du groupe A se termine par mise en relation puis exécution & suivi", () => {
    const keys = buildProjectJourney("maison", PID).map((s) => s.key);
    expect(keys.indexOf("consult")).toBeLessThan(keys.indexOf("execution"));
    expect(keys[keys.length - 1]).toBe("execution");
  });

  it("l'étape « Matériaux utilisés » n'existe plus : aucune entrée, aucun lien", () => {
    for (const type of ["maison", "villa", "appartement", "renovation_complete"]) {
      const steps = buildProjectJourney(type, PID);
      expect(steps.map((s) => s.key), type).not.toContain("materialsUsed");
      expect(steps.some((s) => /mat[ée]riaux utilis/i.test(s.label)), type).toBe(false);
      expect(
        steps.some((s) => s.href.includes("/dashboard/materials-used")),
        type,
      ).toBe(false);
    }
  });

  it("Piscine, clôture, jardin : uniquement Type de projet, Coût estimatif et Mise en relation", () => {
    for (const type of ["piscine", "cloture", "jardin", "extension_batiment"]) {
      expect(buildProjectJourney(type, PID).map((s) => s.label), type).toEqual(
        GROUP_B_LABELS,
      );
      const keys = buildProjectJourney(type, PID).map((s) => s.key);
      expect(keys, type).not.toContain("decision");
      expect(keys, type).not.toContain("plans");
      expect(keys, type).not.toContain("execution");
    }
  });

  it("groupe B : aucune étape « Aide à la décision », « Plans », « Exécution » ni « Fournisseurs »", () => {
    const steps = buildProjectJourney("piscine", PID);
    expect(steps.some((s) => /plan/i.test(s.label))).toBe(false);
    expect(steps.some((s) => /ex[ée]cution/i.test(s.label))).toBe(false);
    expect(steps.some((s) => /fournisseur/i.test(s.label))).toBe(false);
    expect(steps.some((s) => s.href.includes("/dashboard/plans"))).toBe(false);
    expect(steps.some((s) => s.href.includes("/dashboard/guide"))).toBe(false);
    expect(steps.some((s) => s.href.includes("/dashboard/suppliers-directory"))).toBe(false);
    expect(steps.some((s) => s.href.includes("/dashboard/decision"))).toBe(false);
  });

  it("chaque étape du groupe B porte la clé du rapport PDF associé", () => {
    const byKey = Object.fromEntries(
      buildProjectJourney("piscine", PID).map((s) => [s.key, s.reportKey ?? null]),
    );
    expect(byKey).toMatchObject({
      type: null,
      cost: "cost",
      consult: null,
    });
    expect(byKey.decision).toBeUndefined();
  });

  it("le Journey est masqué (aucune étape) sans identifiant de projet", () => {
    expect(buildProjectJourney("maison", null)).toEqual([]);
    expect(buildProjectJourney("maison", undefined)).toEqual([]);
    expect(buildProjectJourney("maison", "   ")).toEqual([]);
  });
});

describe("buildProjectJourney — liens, rapports et contexte du projet", () => {
  it("chaque étape du groupe A pointe vers le module correspondant", () => {
    const steps = buildProjectJourney("villa", PID);
    expect(steps.map((s) => s.key)).toEqual(GROUP_A_KEYS);
    expect(steps.map((s) => s.href)).toEqual([
      `/dashboard/project/${PID}#type-de-projet`,
      `/dashboard/project/${PID}`,
      `/dashboard/decision/${PID}`,
      `/dashboard/plans/${PID}`,
      `/dashboard/professionals-directory?project=${PID}`,
      `/dashboard/guide?project=${PID}`,
    ]);
  });

  it("chaque étape du groupe A porte la clé du rapport PDF associé (type, décision et mise en relation sans rapport)", () => {
    const byKey = Object.fromEntries(
      buildProjectJourney("maison", PID).map((s) => [s.key, s.reportKey ?? null]),
    );
    expect(byKey).toMatchObject({
      type: null,
      cost: "cost",
      decision: null,
      plans: "plans",
      consult: null,
      execution: "execution",
    });
  });

  it("groupe B : chaque étape conserve le contexte du projet", () => {
    const steps = buildProjectJourney("piscine", PID);
    expect(steps.map((s) => s.key)).toEqual(GROUP_B_KEYS);
    expect(steps.map((s) => s.href)).toEqual([
      `/dashboard/project/${PID}#type-de-projet`,
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

  it("les liens et repères du parcours sont uniques (aucune destination dupliquée)", () => {
    const steps = buildProjectJourney("maison", PID);
    expect(new Set(steps.map((s) => s.href)).size).toBe(steps.length);
    expect(new Set(steps.map((s) => s.path)).size).toBe(steps.length);
    expect(steps.filter((s) => s.path === `/dashboard/project/${PID}`)).toHaveLength(1);
  });
});

describe("canAccessJourneyStep — accès direct aux étapes réservées au groupe A", () => {
  it("groupe A : les six étapes sont autorisées", () => {
    for (const step of GROUP_A_KEYS) {
      expect(canAccessJourneyStep("maison", step as any), step).toBe(true);
      expect(canAccessJourneyStep("restaurant", step as any), step).toBe(true);
      expect(canAccessJourneyStep("renovation_complete", step as any), step).toBe(true);
    }
  });

  it("groupe B : plans, aide à la décision et exécution sont refusés", () => {
    for (const type of ["piscine", "cloture", "jardin", "extension_batiment", "cafe_inexistant"]) {
      expect(canAccessJourneyStep(type, "plans"), type).toBe(false);
      expect(canAccessJourneyStep(type, "decision"), type).toBe(false);
      expect(canAccessJourneyStep(type, "execution"), type).toBe(false);
      // Les étapes autorisées restent accessibles.
      expect(canAccessJourneyStep(type, "type"), type).toBe(true);
      expect(canAccessJourneyStep(type, "cost"), type).toBe(true);
      expect(canAccessJourneyStep(type, "consult"), type).toBe(true);
    }
  });

  it("un type inconnu ou absent est traité comme groupe B", () => {
    expect(canAccessJourneyStep(null, "plans")).toBe(false);
    expect(canAccessJourneyStep(undefined, "execution")).toBe(false);
    expect(canAccessJourneyStep("type_inexistant", "decision")).toBe(false);
  });

  it("les étapes de chargement de l'estimation suivent le groupe du type choisi", () => {
    // Groupe A : les 5 étapes officielles du chargement, dans le bon ordre.
    const GROUP_A_LOADING = [
      "Coût estimatif",
      "Aide à la décision",
      "Plans architecturaux AI",
      "Mise en relation",
      "Exécution & Suivi",
    ];
    for (const type of ["maison", "restaurant", "cafe", "renovation_complete"]) {
      expect(costEstimateLoadingSteps(type), type).toEqual(GROUP_A_LOADING);
    }
    // Groupe B : uniquement les 2 étapes autorisées, aucun vestige interdit.
    for (const type of ["piscine", "cloture", "jardin", "extension_batiment"]) {
      expect(costEstimateLoadingSteps(type), type).toEqual([
        "Coût estimatif",
        "Mise en relation",
      ]);
      expect(costEstimateLoadingSteps(type), type).not.toContain("Aide à la décision");
      expect(costEstimateLoadingSteps(type), type).not.toContain("Plans architecturaux AI");
      expect(costEstimateLoadingSteps(type), type).not.toContain("Exécution & Suivi");
    }
  });
});

describe("buildProjectJourney — filtrage par feature flags de l'administration", () => {
  it("sans état de flags, toutes les étapes s'affichent (comportement par défaut)", () => {
    expect(buildProjectJourney("maison", PID, undefined).map((s) => s.key)).toEqual(
      GROUP_A_KEYS,
    );
    expect(buildProjectJourney("maison", PID, null).map((s) => s.key)).toHaveLength(6);
  });

  it("« Plans » disparaît quand architectural_plans est désactivé (ordre conservé)", () => {
    const flags = { architectural_plans: false };
    expect(buildProjectJourney("maison", PID, flags).map((s) => s.key)).toEqual([
      "type",
      "cost",
      "decision",
      "consult",
      "execution",
    ]);
  });

  it("ai_materials n'influence pas les étapes du parcours principal", () => {
    expect(buildProjectJourney("maison", PID, { ai_materials: false }).map((s) => s.key)).toEqual(
      GROUP_A_KEYS,
    );
  });

  it("« Coût estimatif » et « Aide à la décision » disparaissent quand construction_cost_estimation est désactivé (groupe A et B)", () => {
    const flags = { construction_cost_estimation: false };
    expect(buildProjectJourney("maison", PID, flags).map((s) => s.key)).toEqual([
      "type",
      "plans",
      "consult",
      "execution",
    ]);
    expect(buildProjectJourney("piscine", PID, flags).map((s) => s.key)).toEqual([
      "type",
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
    expect(buildProjectJourney("piscine", PID, flags).map((s) => s.key)).toEqual([
      "type",
      "consult",
    ]);
  });

  it("« Exécution & suivi » disparaît quand construction_guide est désactivé", () => {
    const flags = { construction_guide: false };
    const steps = buildProjectJourney("maison", PID, flags);
    expect(steps.map((s) => s.key)).toEqual([
      "type",
      "cost",
      "decision",
      "plans",
      "consult",
    ]);
    expect(steps.some((s) => /ex[ée]cution/i.test(s.label))).toBe(false);
    expect(steps.some((s) => s.href.includes("/dashboard/guide"))).toBe(false);
  });

  it("les étapes non pilotées par un flag (type de projet, mise en relation) restent toujours affichées", () => {
    const flags = {
      construction_cost_estimation: false,
      architectural_plans: false,
      ai_materials: false,
      construction_guide: false,
    };
    expect(buildProjectJourney("maison", PID, flags).map((s) => s.key)).toEqual([
      "type",
      "consult",
    ]);
  });

  it("réactiver le flag restaure l'étape à sa place d'origine", () => {
    const off = buildProjectJourney("maison", PID, { architectural_plans: false });
    const back = buildProjectJourney("maison", PID, { architectural_plans: true });
    expect(off.map((s) => s.key)).not.toContain("plans");
    expect(back.map((s) => s.key)).toEqual(GROUP_A_KEYS);
  });

  it("le contexte projet reste conservé après filtrage et les liens restent uniques", () => {
    const steps = buildProjectJourney("maison", PID, { architectural_plans: false });
    expect(steps.every((s) => s.href.includes(PID))).toBe(true);
    expect(new Set(steps.map((s) => s.href)).size).toBe(steps.length);
  });

  it("invariant : le parcours n'est jamais vide avec un projet valide, même tous flags désactivés", () => {
    const allOff = {
      construction_cost_estimation: false,
      architectural_plans: false,
      ai_materials: false,
      construction_guide: false,
    };
    for (const type of PROJECT_TYPES) {
      expect(buildProjectJourney(type, PID, allOff).length, type).toBeGreaterThanOrEqual(2);
    }
    expect(buildAiMaterialsResultJourney(PID, SUPPLIER_HREF, allOff).map((s) => s.key)).toEqual([
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

  it("Journey masqué sans identifiant de projet (aucune étape)", () => {
    expect(buildAiMaterialsResultJourney(null, SUPPLIER_HREF)).toEqual([]);
    expect(buildAiMaterialsResultJourney("  ")).toEqual([]);
  });
});
