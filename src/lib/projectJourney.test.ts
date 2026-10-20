import { describe, it, expect } from "vitest";
import { PROJECT_TYPES } from "@/convex/projectTypes";
import {
  PROJECT_JOURNEY_GROUP_A,
  PROJECT_JOURNEY_GROUP_B,
  MATERIALS_PAGE_PATH,
  SUPPLIERS_DIRECTORY_PATH,
  buildAiMaterialsResultJourney,
  buildProjectJourney,
  canAccessJourneyStep,
  costEstimateLoadingSteps,
  projectJourneyGroup,
} from "./projectJourney";

// ============================================================================
// PARCOURS DU PROJET — trois groupes, déduits du seul type enregistré
//
//   Groupe A (plans architecturaux AI) : coût → aide à la décision → plans IA
//     → mise en relation → exécution & suivi (5 étapes).
//   Groupe B (sans plans AI) : coût → aide à la décision → mise en relation
//     → exécution & suivi (4 étapes).
//   Groupe C (tous les autres) : coût → mise en relation (2 étapes).
//
// « Type de projet » n'est plus une étape du parcours : le type est le critère
// de classification, pas une étape à parcourir.
// ============================================================================

const GROUP_A_LABELS = [
  "Coût estimatif",
  "Aide à la décision",
  "Plans architecturaux AI",
  "Mise en relation",
  "Exécution & Suivi",
];
const GROUP_A_KEYS = ["cost", "decision", "plans", "consult", "execution"];

const GROUP_B_LABELS = [
  "Coût estimatif",
  "Aide à la décision",
  "Mise en relation",
  "Exécution & Suivi",
];
const GROUP_B_KEYS = ["cost", "decision", "consult", "execution"];

const GROUP_C_LABELS = ["Coût estimatif", "Mise en relation"];
const GROUP_C_KEYS = ["cost", "consult"];

const PID = "proj_1";
const SUPPLIER_HREF = `${SUPPLIERS_DIRECTORY_PATH}?from=materials&region=Tunis`;

/** Types officiellement attendus dans chaque groupe. */
const EXPECTED_GROUP_A = [
  "maison",
  "appartement",
  "villa",
  "immeuble",
  "local",
  "studio",
  "duplex",
  "residence_touristique",
  "projet_neuf",
  "renovation_complete",
];

const EXPECTED_GROUP_B = [
  "local_commercial",
  "entrepot",
  "cafe",
  "restaurant",
  "renovation_cuisine",
  "renovation_salle_de_bain",
  "piscine",
  "extension_batiment",
];

describe("projectJourneyGroup — classification centrale", () => {
  it("classe en groupe A les 10 types avec plans architecturaux AI", () => {
    for (const type of EXPECTED_GROUP_A) {
      expect(projectJourneyGroup(type), type).toBe("A");
      expect(buildProjectJourney(type, PID).map((s) => s.key), type).toEqual(
        GROUP_A_KEYS,
      );
    }
  });

  it("classe en groupe B les 8 types sans plans architecturaux AI", () => {
    for (const type of EXPECTED_GROUP_B) {
      expect(projectJourneyGroup(type), type).toBe("B");
      expect(buildProjectJourney(type, PID).map((s) => s.key), type).toEqual(
        GROUP_B_KEYS,
      );
    }
  });

  it("classe en groupe C tous les autres types du catalogue", () => {
    for (const type of [
      "bureau",
      "peinture_interieure",
      "electricite_complete",
      "plomberie_complete",
    ]) {
      expect(projectJourneyGroup(type), type).toBe("C");
      expect(buildProjectJourney(type, PID).map((s) => s.key), type).toEqual(
        GROUP_C_KEYS,
      );
    }
  });

  it("applique les distinctions impératives entre types proches", () => {
    // « Local » (bâtiment) ≠ « Local commercial ».
    expect(projectJourneyGroup("local")).toBe("A");
    expect(projectJourneyGroup("Local")).toBe("A");
    expect(projectJourneyGroup("local_commercial")).toBe("B");
    expect(projectJourneyGroup("Local commercial")).toBe("B");

    // Rénovation complète (A) ≠ rénovations ciblées (B).
    expect(projectJourneyGroup("renovation_complete")).toBe("A");
    expect(projectJourneyGroup("Rénovation complète")).toBe("A");
    expect(projectJourneyGroup("renovation_cuisine")).toBe("B");
    expect(projectJourneyGroup("renovation_salle_de_bain")).toBe("B");
    expect(projectJourneyGroup("Rénovation Cuisine")).toBe("B");
    expect(projectJourneyGroup("Rénovation salle de bain")).toBe("B");

    // Extension bâtiment : groupe B.
    expect(projectJourneyGroup("extension_batiment")).toBe("B");
    expect(projectJourneyGroup("Extension bâtiment")).toBe("B");
  });

  it("un projet n'appartient qu'à un seul groupe (listes disjointes)", () => {
    const overlap = PROJECT_JOURNEY_GROUP_A.filter((type) =>
      PROJECT_JOURNEY_GROUP_B.includes(type),
    );
    expect(overlap).toEqual([]);
    for (const type of [...PROJECT_JOURNEY_GROUP_A, ...PROJECT_JOURNEY_GROUP_B]) {
      const groups = (["A", "B", "C"] as const).filter(
        (group) =>
          (group === "A" && PROJECT_JOURNEY_GROUP_A.includes(type)) ||
          (group === "B" && PROJECT_JOURNEY_GROUP_B.includes(type)),
      );
      expect(groups, type).toHaveLength(1);
    }
  });

  it("les listes officielles contiennent exactement 10 et 8 types", () => {
    expect(PROJECT_JOURNEY_GROUP_A.slice().sort()).toEqual(
      EXPECTED_GROUP_A.slice().sort(),
    );
    expect(PROJECT_JOURNEY_GROUP_A).toHaveLength(10);
    expect(PROJECT_JOURNEY_GROUP_B.slice().sort()).toEqual(
      EXPECTED_GROUP_B.slice().sort(),
    );
    expect(PROJECT_JOURNEY_GROUP_B).toHaveLength(8);
  });

  it("le NOM du projet ne modifie jamais la classification (seul le type compte)", () => {
    // La fonction ne reçoit que la catégorie : deux noms différents pour le
    // même type restent dans le même groupe, et un nom trompeur ne change rien.
    for (const name of [
      "Ma villa à Djerba",
      "Local commercial rénové",
      "Rénovation cuisine de mon appartement",
      "Projet vide",
    ]) {
      expect(projectJourneyGroup("maison"), name).toBe("A");
      expect(projectJourneyGroup("renovation_cuisine"), name).toBe("B");
      expect(projectJourneyGroup("bureau"), name).toBe("C");
    }
  });

  it("reconnaît aussi les anciens slugs enregistrés", () => {
    expect(projectJourneyGroup("maison_r_plus_1")).toBe("A");
    expect(projectJourneyGroup("maison_r_plus_2")).toBe("A");
    expect(projectJourneyGroup("maison_hote")).toBe("A");
    // Atelier / ancien local commercial → groupe B.
    expect(projectJourneyGroup("atelier")).toBe("B");
    expect(projectJourneyGroup("boutique_commerciale")).toBe("B");
    // Anciens slugs de piscine : le parcours reste celui d'une piscine.
    expect(projectJourneyGroup("piscine_beton")).toBe("B");
    expect(projectJourneyGroup("piscine_coque")).toBe("B");
    // Ancien bureau → groupe C.
    expect(projectJourneyGroup("bureau_cabinet")).toBe("C");
  });

  it("retombe sur le groupe C pour un type absent ou inconnu", () => {
    for (const category of [null, undefined, "", "   ", "type_inexistant"]) {
      expect(projectJourneyGroup(category), String(category)).toBe("C");
    }
  });

  it("chaque type du catalogue obtient exactement le parcours de son groupe", () => {
    for (const type of PROJECT_TYPES) {
      const group = projectJourneyGroup(type);
      const expected =
        group === "A" ? GROUP_A_KEYS : group === "B" ? GROUP_B_KEYS : GROUP_C_KEYS;
      expect(buildProjectJourney(type, PID).map((s) => s.key), type).toEqual(
        expected,
      );
    }
  });
});

describe("buildProjectJourney — ordre obligatoire des étapes", () => {
  it("Groupe A — 5 étapes, dans l'ordre officiel", () => {
    expect(buildProjectJourney("maison", PID).map((s) => s.label)).toEqual(
      GROUP_A_LABELS,
    );
    for (const type of EXPECTED_GROUP_A) {
      expect(buildProjectJourney(type, PID).map((s) => s.label), type).toEqual(
        GROUP_A_LABELS,
      );
    }
  });

  it("Groupe B — 4 étapes, sans Plans architecturaux AI", () => {
    for (const type of EXPECTED_GROUP_B) {
      const steps = buildProjectJourney(type, PID);
      expect(steps.map((s) => s.label), type).toEqual(GROUP_B_LABELS);
      expect(steps.map((s) => s.key), type).not.toContain("plans");
      expect(steps.some((s) => /plans? architecturaux/i.test(s.label)), type).toBe(
        false,
      );
    }
  });

  it("Groupe C — 2 étapes : coût estimatif puis mise en relation", () => {
    for (const type of ["bureau", "peinture_interieure", "type_inexistant"]) {
      const steps = buildProjectJourney(type, PID);
      expect(steps.map((s) => s.label), type).toEqual(GROUP_C_LABELS);
      expect(steps.map((s) => s.key), type).toEqual(GROUP_C_KEYS);
      expect(steps.some((s) => /aide à la décision/i.test(s.label)), type).toBe(
        false,
      );
      expect(steps.some((s) => /ex[ée]cution/i.test(s.label)), type).toBe(false);
      expect(steps.some((s) => /plans?/i.test(s.label)), type).toBe(false);
    }
  });

  it("commence toujours par le coût estimatif et se termine par la mise en relation (groupe C)", () => {
    const steps = buildProjectJourney("bureau", PID);
    expect(steps[0].href).toBe(`/dashboard/project/${PID}`);
    expect(steps[steps.length - 1].href).toBe(
      `/dashboard/professionals-directory?project=${PID}`,
    );
  });

  it("groupe A : coût → décision → plans → mise en relation → exécution", () => {
    const keys = buildProjectJourney("villa", PID).map((s) => s.key);
    expect(keys).toEqual(GROUP_A_KEYS);
    expect(keys.indexOf("decision")).toBe(keys.indexOf("cost") + 1);
    expect(keys.indexOf("plans")).toBe(keys.indexOf("decision") + 1);
    expect(keys.indexOf("consult")).toBe(keys.indexOf("plans") + 1);
    expect(keys.indexOf("execution")).toBe(keys.indexOf("consult") + 1);
  });

  it("groupe B : coût → décision → mise en relation → exécution", () => {
    const keys = buildProjectJourney("piscine", PID).map((s) => s.key);
    expect(keys).toEqual(GROUP_B_KEYS);
    expect(keys.indexOf("decision")).toBe(keys.indexOf("cost") + 1);
    expect(keys.indexOf("consult")).toBe(keys.indexOf("decision") + 1);
    expect(keys.indexOf("execution")).toBe(keys.indexOf("consult") + 1);
  });

  it("« Type de projet » n'est plus une étape du parcours", () => {
    for (const type of PROJECT_TYPES) {
      const steps = buildProjectJourney(type, PID);
      expect(steps.map((s) => s.key), type).not.toContain("type");
      expect(
        steps.some((s) => s.label === "Type de projet"),
        type,
      ).toBe(false);
    }
  });

  it("« Matériaux utilisés » n'existe plus : aucune entrée, aucun lien", () => {
    for (const type of ["maison", "piscine", "bureau"]) {
      const steps = buildProjectJourney(type, PID);
      expect(steps.some((s) => s.href.includes("/dashboard/materials-used")), type).toBe(
        false,
      );
    }
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
    expect(steps.map((s) => s.href)).toEqual([
      `/dashboard/project/${PID}`,
      `/dashboard/decision/${PID}`,
      `/dashboard/plans/${PID}`,
      `/dashboard/professionals-directory?project=${PID}`,
      `/dashboard/guide?project=${PID}`,
    ]);
  });

  it("chaque étape du groupe B pointe vers le module correspondant", () => {
    const steps = buildProjectJourney("restaurant", PID);
    expect(steps.map((s) => s.href)).toEqual([
      `/dashboard/project/${PID}`,
      `/dashboard/decision/${PID}`,
      `/dashboard/professionals-directory?project=${PID}`,
      `/dashboard/guide?project=${PID}`,
    ]);
  });

  it("chaque étape du groupe C pointe vers le module correspondant", () => {
    const steps = buildProjectJourney("bureau", PID);
    expect(steps.map((s) => s.href)).toEqual([
      `/dashboard/project/${PID}`,
      `/dashboard/professionals-directory?project=${PID}`,
    ]);
  });

  it("chaque étape porte la clé du rapport PDF associé (décision et mise en relation sans rapport)", () => {
    const byKey = Object.fromEntries(
      buildProjectJourney("maison", PID).map((s) => [s.key, s.reportKey ?? null]),
    );
    expect(byKey).toMatchObject({
      cost: "cost",
      decision: null,
      plans: "plans",
      consult: null,
      execution: "execution",
    });
    expect(byKey.type).toBeUndefined();
  });

  it("le projet est conservé dans tous les liens", () => {
    for (const category of ["maison", "piscine", "bureau"]) {
      const steps = buildProjectJourney(category, "proj_old");
      expect(steps.every((s) => s.href.includes("proj_old")), category).toBe(true);
      expect(steps.every((s) => s.path.startsWith("/dashboard/")), category).toBe(
        true,
      );
    }
  });

  it("les repères du parcours sont uniques (aucune destination dupliquée)", () => {
    const steps = buildProjectJourney("maison", PID);
    expect(new Set(steps.map((s) => s.path)).size).toBe(steps.length);
    expect(new Set(steps.map((s) => s.href)).size).toBe(steps.length);
  });
});

describe("canAccessJourneyStep — accès direct aux étapes", () => {
  it("groupe A : les cinq étapes sont autorisées", () => {
    for (const step of GROUP_A_KEYS) {
      expect(canAccessJourneyStep("maison", step as any), step).toBe(true);
      expect(canAccessJourneyStep("local", step as any), step).toBe(true);
    }
  });

  it("groupe B : Plans architecturaux AI refusés, les autres étapes autorisées", () => {
    for (const type of EXPECTED_GROUP_B) {
      expect(canAccessJourneyStep(type, "plans"), type).toBe(false);
      for (const step of GROUP_B_KEYS) {
        expect(canAccessJourneyStep(type, step as any), `${type}:${step}`).toBe(
          true,
        );
      }
    }
  });

  it("groupe C : décision, plans et exécution refusés", () => {
    for (const type of ["bureau", "electricite_complete", "type_inexistant", null]) {
      expect(canAccessJourneyStep(type, "plans"), String(type)).toBe(false);
      expect(canAccessJourneyStep(type, "decision"), String(type)).toBe(false);
      expect(canAccessJourneyStep(type, "execution"), String(type)).toBe(false);
      // Les deux étapes du parcours restent accessibles.
      expect(canAccessJourneyStep(type, "cost"), String(type)).toBe(true);
      expect(canAccessJourneyStep(type, "consult"), String(type)).toBe(true);
    }
  });

  it("les étapes de chargement de l'estimation suivent le groupe du type choisi", () => {
    for (const type of EXPECTED_GROUP_A) {
      expect(costEstimateLoadingSteps(type), type).toEqual(GROUP_A_LABELS);
    }
    for (const type of EXPECTED_GROUP_B) {
      expect(costEstimateLoadingSteps(type), type).toEqual(GROUP_B_LABELS);
      expect(costEstimateLoadingSteps(type), type).not.toContain(
        "Plans architecturaux AI",
      );
    }
    for (const type of ["bureau", "peinture_interieure", null]) {
      expect(costEstimateLoadingSteps(type), String(type)).toEqual(
        GROUP_C_LABELS,
      );
      expect(costEstimateLoadingSteps(type), String(type)).not.toContain(
        "Aide à la décision",
      );
      expect(costEstimateLoadingSteps(type), String(type)).not.toContain(
        "Exécution & Suivi",
      );
    }
  });
});

describe("buildProjectJourney — filtrage par feature flags de l'administration", () => {
  it("sans état de flags, toutes les étapes s'affichent (comportement par défaut)", () => {
    expect(buildProjectJourney("maison", PID, undefined).map((s) => s.key)).toEqual(
      GROUP_A_KEYS,
    );
    expect(buildProjectJourney("piscine", PID, null).map((s) => s.key)).toEqual(
      GROUP_B_KEYS,
    );
    expect(buildProjectJourney("bureau", PID, null).map((s) => s.key)).toEqual(
      GROUP_C_KEYS,
    );
  });

  it("« Plans » disparaît quand architectural_plans est désactivé (ordre conservé)", () => {
    const flags = { architectural_plans: false };
    expect(buildProjectJourney("maison", PID, flags).map((s) => s.key)).toEqual([
      "cost",
      "decision",
      "consult",
      "execution",
    ]);
  });

  it("« Coût estimatif » et « Aide à la décision » disparaissent quand construction_cost_estimation est désactivé", () => {
    const flags = { construction_cost_estimation: false };
    expect(buildProjectJourney("maison", PID, flags).map((s) => s.key)).toEqual([
      "plans",
      "consult",
      "execution",
    ]);
    expect(buildProjectJourney("piscine", PID, flags).map((s) => s.key)).toEqual([
      "consult",
      "execution",
    ]);
    expect(buildProjectJourney("bureau", PID, flags).map((s) => s.key)).toEqual([
      "consult",
    ]);
  });

  it("« Exécution & suivi » disparaît quand construction_guide est désactivé (groupes A et B)", () => {
    const flags = { construction_guide: false };
    expect(buildProjectJourney("maison", PID, flags).map((s) => s.key)).toEqual([
      "cost",
      "decision",
      "plans",
      "consult",
    ]);
    expect(buildProjectJourney("piscine", PID, flags).map((s) => s.key)).toEqual([
      "cost",
      "decision",
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
      expect(buildProjectJourney(type, PID, allOff).length, type).toBeGreaterThanOrEqual(
        1,
      );
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
