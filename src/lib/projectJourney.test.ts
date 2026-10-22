import { describe, it, expect } from "vitest";
import { PROJECT_TYPES } from "@/convex/projectTypes";
import {
  PROJECT_JOURNEY_GROUP_A,
  PROJECT_JOURNEY_GROUP_B,
  PROJECT_JOURNEY_GROUP_D,
  MATERIALS_PAGE_PATH,
  SUPPLIERS_DIRECTORY_PATH,
  buildAiMaterialsResultJourney,
  buildProjectJourney,
  canAccessJourneyStep,
  costEstimateLoadingSteps,
  decisionSupportLoadingSteps,
  isFullJourneyGroup,
  projectJourneyGroup,
} from "./projectJourney";

// ============================================================================
// PARCOURS DU PROJET — quatre groupes, déduits du seul type enregistré
//
//   Groupes A et D (plans architecturaux AI) : coût → aide à la décision →
//     plans IA → mise en relation → exécution & suivi (5 étapes).
//       · A : logements et bâtiments résidentiels ;
//       · D : locaux professionnels (local commercial, bureau, entrepôt,
//         restaurant, café).
//   Groupes B et C (parcours simplifié) : coût → mise en relation (2 étapes),
//     aucune étape intermédiaire.
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

// Les groupes B et C partagent le même parcours simplifié.
const GROUP_B_LABELS = ["Coût estimatif", "Mise en relation"];
const GROUP_B_KEYS = ["cost", "consult"];

const GROUP_C_LABELS = ["Coût estimatif", "Mise en relation"];
const GROUP_C_KEYS = ["cost", "consult"];

// Le groupe D suit exactement le parcours complet du groupe A.
const GROUP_D_LABELS = GROUP_A_LABELS;
const GROUP_D_KEYS = GROUP_A_KEYS;

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

const EXPECTED_GROUP_D = [
  "local_commercial",
  "bureau",
  "entrepot",
  "restaurant",
  "cafe",
];

const EXPECTED_GROUP_B = [
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

  it("classe en groupe D les 5 locaux professionnels, avec les 5 étapes", () => {
    for (const type of EXPECTED_GROUP_D) {
      expect(projectJourneyGroup(type), type).toBe("D");
      expect(buildProjectJourney(type, PID).map((s) => s.key), type).toEqual(
        GROUP_D_KEYS,
      );
      expect(buildProjectJourney(type, PID).map((s) => s.label), type).toEqual(
        GROUP_D_LABELS,
      );
    }
  });

  it("classe en groupe B les 4 types au parcours simplifié", () => {
    for (const type of EXPECTED_GROUP_B) {
      expect(projectJourneyGroup(type), type).toBe("B");
      expect(buildProjectJourney(type, PID).map((s) => s.key), type).toEqual(
        GROUP_B_KEYS,
      );
    }
  });

  it("classe en groupe C tous les autres types du catalogue", () => {
    for (const type of [
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
    // « Local » (bâtiment, A) ≠ « Local commercial » (local professionnel, D).
    expect(projectJourneyGroup("local")).toBe("A");
    expect(projectJourneyGroup("Local")).toBe("A");
    expect(projectJourneyGroup("local_commercial")).toBe("D");
    expect(projectJourneyGroup("Local commercial")).toBe("D");

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
    const lists: [string, readonly string[]][] = [
      ["A", PROJECT_JOURNEY_GROUP_A],
      ["B", PROJECT_JOURNEY_GROUP_B],
      ["D", PROJECT_JOURNEY_GROUP_D],
    ];
    for (let i = 0; i < lists.length; i++) {
      for (let j = i + 1; j < lists.length; j++) {
        expect(
          lists[i][1].filter((type) => lists[j][1].includes(type)),
          `${lists[i][0]}/${lists[j][0]}`,
        ).toEqual([]);
      }
    }
    for (const type of [
      ...PROJECT_JOURNEY_GROUP_A,
      ...PROJECT_JOURNEY_GROUP_B,
      ...PROJECT_JOURNEY_GROUP_D,
    ]) {
      const groups = lists
        .filter(([, types]) => types.includes(type))
        .map(([group]) => group);
      expect(groups, type).toHaveLength(1);
    }
  });

  it("les listes officielles contiennent exactement 10, 5 et 4 types", () => {
    expect(PROJECT_JOURNEY_GROUP_A.slice().sort()).toEqual(
      EXPECTED_GROUP_A.slice().sort(),
    );
    expect(PROJECT_JOURNEY_GROUP_A).toHaveLength(10);
    expect(PROJECT_JOURNEY_GROUP_D.slice().sort()).toEqual(
      EXPECTED_GROUP_D.slice().sort(),
    );
    expect(PROJECT_JOURNEY_GROUP_D).toHaveLength(5);
    expect(PROJECT_JOURNEY_GROUP_B.slice().sort()).toEqual(
      EXPECTED_GROUP_B.slice().sort(),
    );
    expect(PROJECT_JOURNEY_GROUP_B).toHaveLength(4);
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
      expect(projectJourneyGroup("bureau"), name).toBe("D");
      expect(projectJourneyGroup("peinture_interieure"), name).toBe("C");
    }
  });

  it("reconnaît aussi les anciens slugs enregistrés", () => {
    expect(projectJourneyGroup("maison_r_plus_1")).toBe("A");
    expect(projectJourneyGroup("maison_r_plus_2")).toBe("A");
    expect(projectJourneyGroup("maison_hote")).toBe("A");
    // Atelier / ancien local commercial / ancien bureau → groupe D.
    expect(projectJourneyGroup("atelier")).toBe("D");
    expect(projectJourneyGroup("boutique_commerciale")).toBe("D");
    expect(projectJourneyGroup("bureau_cabinet")).toBe("D");
    // Anciens slugs de piscine : le parcours reste celui d'une piscine.
    expect(projectJourneyGroup("piscine_beton")).toBe("B");
    expect(projectJourneyGroup("piscine_coque")).toBe("B");
  });

  it("retombe sur le groupe C pour un type absent ou inconnu", () => {
    for (const category of [null, undefined, "", "   ", "type_inexistant"]) {
      expect(projectJourneyGroup(category), String(category)).toBe("C");
    }
  });

  it("chaque type du catalogue obtient exactement le parcours de son groupe", () => {
    for (const type of PROJECT_TYPES) {
      const group = projectJourneyGroup(type);
      const expected = isFullJourneyGroup(group) ? GROUP_A_KEYS : GROUP_B_KEYS;
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

  it("Groupe D — 5 étapes, dans l'ordre officiel (parcours complet)", () => {
    for (const type of EXPECTED_GROUP_D) {
      expect(buildProjectJourney(type, PID).map((s) => s.label), type).toEqual(
        GROUP_D_LABELS,
      );
      expect(buildProjectJourney(type, PID).map((s) => s.key), type).toEqual(
        GROUP_D_KEYS,
      );
    }
  });

  it("Groupes B et C — 2 étapes : coût estimatif puis mise en relation", () => {
    for (const type of [...EXPECTED_GROUP_B, "peinture_interieure"]) {
      const steps = buildProjectJourney(type, PID);
      expect(steps.map((s) => s.label), type).toEqual(GROUP_B_LABELS);
      expect(steps.map((s) => s.key), type).toEqual(GROUP_B_KEYS);
      expect(steps.map((s) => s.key), type).not.toContain("plans");
      expect(steps.map((s) => s.key), type).not.toContain("decision");
      expect(steps.map((s) => s.key), type).not.toContain("execution");
      expect(steps.some((s) => /plans? architecturaux/i.test(s.label)), type).toBe(
        false,
      );
    }
  });

  it("Groupe C — 2 étapes : coût estimatif puis mise en relation", () => {
    for (const type of ["peinture_interieure", "electricite_complete", "type_inexistant"]) {
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
    const steps = buildProjectJourney("peinture_interieure", PID);
    expect(steps[0].href).toBe(`/dashboard/project/${PID}`);
    expect(steps[steps.length - 1].href).toBe(
      `/dashboard/professionals-directory?project=${PID}`,
    );
  });

  it("groupes B et C : « Suivant » depuis le coût estimatif ouvre la mise en relation (tous les types)", () => {
    for (const type of PROJECT_TYPES) {
      if (isFullJourneyGroup(projectJourneyGroup(type))) continue;
      const steps = buildProjectJourney(type, PID);
      // Deux étapes exactement, dans l'ordre imposé.
      expect(steps.map((s) => s.key), type).toEqual(["cost", "consult"]);
      const next = steps[steps.findIndex((s) => s.key === "cost") + 1];
      expect(next.key, type).toBe("consult");
      expect(next.label, type).toBe("Mise en relation");
      // Le contexte du projet est conservé (aucune donnée perdue).
      expect(next.href, type).toBe(
        `/dashboard/professionals-directory?project=${PID}`,
      );
      // Aucune étape supprimée ne reste dans la navigation ni dans les liens.
      expect(steps.map((s) => s.key), type).not.toContain("decision");
      expect(steps.map((s) => s.key), type).not.toContain("plans");
      expect(steps.map((s) => s.key), type).not.toContain("execution");
      expect(
        steps.some((s) => s.href.includes("/dashboard/decision")),
        type,
      ).toBe(false);
      expect(steps.some((s) => s.href.includes("/dashboard/guide")), type).toBe(
        false,
      );
    }
  });

  it("groupe A : coût → décision → plans → mise en relation → exécution", () => {
    const keys = buildProjectJourney("villa", PID).map((s) => s.key);
    expect(keys).toEqual(GROUP_A_KEYS);
    expect(keys.indexOf("decision")).toBe(keys.indexOf("cost") + 1);
    expect(keys.indexOf("plans")).toBe(keys.indexOf("decision") + 1);
    expect(keys.indexOf("consult")).toBe(keys.indexOf("plans") + 1);
    expect(keys.indexOf("execution")).toBe(keys.indexOf("consult") + 1);
  });

  it("groupe D : coût → décision → plans → mise en relation → exécution", () => {
    for (const type of EXPECTED_GROUP_D) {
      const keys = buildProjectJourney(type, PID).map((s) => s.key);
      expect(keys, type).toEqual(GROUP_D_KEYS);
      expect(keys.indexOf("decision"), type).toBe(keys.indexOf("cost") + 1);
      expect(keys.indexOf("plans"), type).toBe(keys.indexOf("decision") + 1);
      expect(keys.indexOf("consult"), type).toBe(keys.indexOf("plans") + 1);
      expect(keys.indexOf("execution"), type).toBe(keys.indexOf("consult") + 1);
    }
  });

  it("groupe B : coût → mise en relation, sans étape intermédiaire", () => {
    const keys = buildProjectJourney("piscine", PID).map((s) => s.key);
    expect(keys).toEqual(GROUP_B_KEYS);
    expect(keys.indexOf("consult")).toBe(keys.indexOf("cost") + 1);
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

  it("chaque étape du groupe D pointe vers le module correspondant", () => {
    for (const type of EXPECTED_GROUP_D) {
      const steps = buildProjectJourney(type, PID);
      expect(steps.map((s) => s.href), type).toEqual([
        `/dashboard/project/${PID}`,
        `/dashboard/decision/${PID}`,
        `/dashboard/plans/${PID}`,
        `/dashboard/professionals-directory?project=${PID}`,
        `/dashboard/guide?project=${PID}`,
      ]);
    }
  });

  it("chaque étape du groupe B pointe vers le module correspondant", () => {
    const steps = buildProjectJourney("piscine", PID);
    expect(steps.map((s) => s.href)).toEqual([
      `/dashboard/project/${PID}`,
      `/dashboard/professionals-directory?project=${PID}`,
    ]);
  });

  it("chaque étape du groupe C pointe vers le module correspondant", () => {
    const steps = buildProjectJourney("peinture_interieure", PID);
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

  it("groupe B : décision, plans et exécution refusés", () => {
    for (const type of EXPECTED_GROUP_B) {
      expect(canAccessJourneyStep(type, "plans"), type).toBe(false);
      expect(canAccessJourneyStep(type, "decision"), type).toBe(false);
      expect(canAccessJourneyStep(type, "execution"), type).toBe(false);
      // Les deux étapes du parcours restent accessibles.
      for (const step of GROUP_B_KEYS) {
        expect(canAccessJourneyStep(type, step as any), `${type}:${step}`).toBe(
          true,
        );
      }
    }
  });

  it("groupe D : les cinq étapes sont autorisées", () => {
    for (const type of EXPECTED_GROUP_D) {
      for (const step of GROUP_D_KEYS) {
        expect(canAccessJourneyStep(type, step as any), `${type}:${step}`).toBe(
          true,
        );
      }
    }
  });

  it("groupe C : décision, plans et exécution refusés", () => {
    for (const type of ["peinture_interieure", "electricite_complete", "type_inexistant", null]) {
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
    for (const type of EXPECTED_GROUP_D) {
      expect(costEstimateLoadingSteps(type), type).toEqual(GROUP_D_LABELS);
    }
    for (const type of EXPECTED_GROUP_B) {
      expect(costEstimateLoadingSteps(type), type).toEqual(GROUP_B_LABELS);
      expect(costEstimateLoadingSteps(type), type).not.toContain(
        "Aide à la décision",
      );
      expect(costEstimateLoadingSteps(type), type).not.toContain(
        "Plans architecturaux AI",
      );
      expect(costEstimateLoadingSteps(type), type).not.toContain(
        "Exécution & Suivi",
      );
    }
    for (const type of ["peinture_interieure", "electricite_complete", null]) {
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

describe("decisionSupportLoadingSteps — étapes du chargement de l'aide à la décision", () => {
  it("décrit le traitement réel du module, dans l'ordre", () => {
    expect(decisionSupportLoadingSteps()).toEqual([
      "Analyse du Quantitatif",
      "Prix & matériaux",
      "Capacité de construction",
      "Plan de construction",
      "Optimisation budgétaire",
    ]);
  });

  it("renvoie un nouveau tableau à chaque appel (aucune mutation partagée)", () => {
    const steps = decisionSupportLoadingSteps();
    steps.push("Étape parasite");
    expect(decisionSupportLoadingSteps()).toHaveLength(5);
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
    expect(buildProjectJourney("restaurant", PID, null).map((s) => s.key)).toEqual(
      GROUP_D_KEYS,
    );
    expect(
      buildProjectJourney("peinture_interieure", PID, null).map((s) => s.key),
    ).toEqual(GROUP_C_KEYS);
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
    ]);
    expect(
      buildProjectJourney("peinture_interieure", PID, flags).map((s) => s.key),
    ).toEqual(["consult"]);
  });

  it("« Exécution & suivi » disparaît quand construction_guide est désactivé (groupes A et D)", () => {
    const flags = { construction_guide: false };
    expect(buildProjectJourney("maison", PID, flags).map((s) => s.key)).toEqual([
      "cost",
      "decision",
      "plans",
      "consult",
    ]);
    expect(buildProjectJourney("cafe", PID, flags).map((s) => s.key)).toEqual([
      "cost",
      "decision",
      "plans",
      "consult",
    ]);
    // Les groupes B et C n'ont pas cette étape : leur parcours reste inchangé.
    expect(buildProjectJourney("piscine", PID, flags).map((s) => s.key)).toEqual(
      GROUP_B_KEYS,
    );
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
