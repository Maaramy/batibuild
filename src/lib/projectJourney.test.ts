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

const GROUP_A_LABELS = [
  "Coût estimatif",
  "Plans",
  "Choix matériaux",
  "Consultation",
  "Exécution",
  "Investissement",
];

const GROUP_B_LABELS = ["Coût estimatif", "Consultation", "Fournisseurs"];

const PID = "proj_1";
const SUPPLIER_HREF = `${SUPPLIERS_DIRECTORY_PATH}?from=materials&region=Tunis`;

describe("projectJourneyGroup — groupe déduit du type de projet", () => {
  it("classe en groupe A les projets neufs / immobiliers", () => {
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

  it("le groupe A correspond aux 11 types éligibles (aucun type oublié du catalogue)", () => {
    const groupA = PROJECT_TYPES.filter((t) => PROJECT_JOURNEY_GROUP_A.includes(t));
    expect(groupA).toHaveLength(11);
    // Chaque type officiel obtient bien une barre non vide.
    for (const type of PROJECT_TYPES) {
      expect(buildProjectJourney(type, PID).length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("buildProjectJourney — ordre des étapes", () => {
  it("Maison : 6 étapes dans l'ordre officiel", () => {
    expect(buildProjectJourney("maison", PID).map((s) => s.label)).toEqual(GROUP_A_LABELS);
  });

  it("Villa : même structure que Maison", () => {
    expect(buildProjectJourney("villa", PID).map((s) => s.label)).toEqual(GROUP_A_LABELS);
  });

  it("Appartement : même structure que Maison", () => {
    expect(buildProjectJourney("appartement", PID).map((s) => s.label)).toEqual(GROUP_A_LABELS);
  });

  it("le parcours du groupe A se termine par consultation, exécution puis investissement", () => {
    const keys = buildProjectJourney("maison", PID).map((s) => s.key);
    expect(keys.indexOf("consult")).toBeLessThan(keys.indexOf("execution"));
    expect(keys.indexOf("execution")).toBeLessThan(keys.indexOf("investment"));
  });

  it("Rénovation : coût estimatif + consultation + fournisseurs", () => {
    expect(buildProjectJourney("renovation_complete", PID).map((s) => s.label)).toEqual(
      GROUP_B_LABELS,
    );
  });

  it("Cuisine : coût estimatif + consultation + fournisseurs", () => {
    expect(buildProjectJourney("renovation_cuisine", PID).map((s) => s.label)).toEqual(
      GROUP_B_LABELS,
    );
  });

  it("Salle de bain : coût estimatif + consultation + fournisseurs", () => {
    expect(buildProjectJourney("renovation_salle_de_bain", PID).map((s) => s.label)).toEqual(
      GROUP_B_LABELS,
    );
  });

  it("la barre est masquée (aucune étape) sans identifiant de projet", () => {
    expect(buildProjectJourney("maison", null)).toEqual([]);
    expect(buildProjectJourney("maison", undefined)).toEqual([]);
    expect(buildProjectJourney("maison", "   ")).toEqual([]);
  });
});

describe("buildProjectJourney — liens et contexte du projet", () => {
  it("chaque étape pointe vers le module correspondant", () => {
    const steps = buildProjectJourney("villa", PID);
    expect(steps.map((s) => s.key)).toEqual([
      "cost",
      "plans",
      "materials",
      "consult",
      "execution",
      "investment",
    ]);
    expect(steps.map((s) => s.href)).toEqual([
      "/dashboard/project/proj_1",
      "/dashboard/plans/proj_1",
      "/dashboard/ai-materials?project=proj_1",
      "/dashboard/professionals-directory?project=proj_1",
      "/dashboard/guide?project=proj_1",
      "/dashboard/investments?project=proj_1",
    ]);
  });

  it("groupe B : l'étape Fournisseurs pointe vers l'annuaire des fournisseurs avec le projet", () => {
    const steps = buildProjectJourney("renovation_complete", PID);
    expect(steps.map((s) => s.key)).toEqual(["cost", "consult", "suppliers"]);
    expect(steps.map((s) => s.href)).toEqual([
      `/dashboard/project/${PID}`,
      `/dashboard/professionals-directory?project=${PID}`,
      `/dashboard/suppliers-directory?project=${PID}`,
    ]);
  });

  it("le projet est conservé dans tous les liens (aucune donnée perdue)", () => {
    for (const category of ["maison", "extension_batiment"]) {
      const steps = buildProjectJourney(category, "proj_old");
      expect(steps.every((s) => s.href.includes("proj_old"))).toBe(true);
      expect(steps.every((s) => s.path.startsWith("/dashboard/"))).toBe(true);
    }
  });

  it("les routes de repérage de l'étape active sont uniques", () => {
    const steps = buildProjectJourney("maison", PID);
    expect(new Set(steps.map((s) => s.path)).size).toBe(steps.length);
  });
});

describe("buildProjectJourney — filtrage par feature flags de l'administration", () => {
  it("sans état de flags, toutes les étapes s'affichent (comportement par défaut)", () => {
    expect(buildProjectJourney("maison", PID, undefined).map((s) => s.key)).toEqual([
      "cost",
      "plans",
      "materials",
      "consult",
      "execution",
      "investment",
    ]);
    expect(buildProjectJourney("maison", PID, null).map((s) => s.key)).toHaveLength(6);
  });

  it("« Plans » disparaît quand architectural_plans est désactivé (ordre conservé)", () => {
    const flags = { architectural_plans: false };
    expect(buildProjectJourney("maison", PID, flags).map((s) => s.key)).toEqual([
      "cost",
      "materials",
      "consult",
      "execution",
      "investment",
    ]);
  });

  it("« Choix matériaux » disparaît quand ai_materials est désactivé", () => {
    const flags = { ai_materials: false };
    expect(buildProjectJourney("maison", PID, flags).map((s) => s.key)).toEqual([
      "cost",
      "plans",
      "consult",
      "execution",
      "investment",
    ]);
  });

  it("« Investissement » disparaît quand investment_project est désactivé", () => {
    const flags = { investment_project: false };
    expect(buildProjectJourney("maison", PID, flags).map((s) => s.key)).toEqual([
      "cost",
      "plans",
      "materials",
      "consult",
      "execution",
    ]);
  });

  it("« Coût estimatif » disparaît quand construction_cost_estimation est désactivé (groupe A et B)", () => {
    const flags = { construction_cost_estimation: false };
    expect(buildProjectJourney("maison", PID, flags).map((s) => s.key)).toEqual([
      "plans",
      "materials",
      "consult",
      "execution",
      "investment",
    ]);
    expect(buildProjectJourney("renovation_complete", PID, flags).map((s) => s.key)).toEqual([
      "consult",
      "suppliers",
    ]);
  });

  it("toutes les étapes gérées par un flag disparaissent ensemble (groupe B)", () => {
    const flags = { construction_cost_estimation: false };
    expect(buildProjectJourney("piscine", PID, flags).map((s) => s.key)).toEqual([
      "consult",
      "suppliers",
    ]);
  });

  it("les étapes non pilotées par un flag (consult, execution, suppliers) restent toujours affichées", () => {
    const flags = {
      construction_cost_estimation: false,
      architectural_plans: false,
      ai_materials: false,
      investment_project: false,
    };
    expect(buildProjectJourney("maison", PID, flags).map((s) => s.key)).toEqual([
      "consult",
      "execution",
    ]);
  });

  it("réactiver le flag restaure l'étape à sa place d'origine", () => {
    const off = buildProjectJourney("maison", PID, { architectural_plans: false });
    const back = buildProjectJourney("maison", PID, { architectural_plans: true });
    expect(off.map((s) => s.key)).not.toContain("plans");
    expect(back.map((s) => s.key)).toEqual([
      "cost",
      "plans",
      "materials",
      "consult",
      "execution",
      "investment",
    ]);
  });

  it("« Investissement » : désactivation → aucun vestige, réactivation → retour exact (groupe A)", () => {
    // Désactivé : l'étape disparaît entièrement (pas d'espace réservé), les
    // autres conservent leur ordre et leurs liens.
    const off = buildProjectJourney("villa", PID, { investment_project: false });
    expect(off.map((s) => s.key)).toEqual([
      "cost",
      "plans",
      "materials",
      "consult",
      "execution",
    ]);
    expect(off.some((s) => /invest/i.test(s.label))).toBe(false);
    expect(off.some((s) => s.href.includes("/dashboard/investments"))).toBe(false);
    // Réactivé : l'étape réapparaît en dernière position avec son lien d'origine.
    const on = buildProjectJourney("villa", PID, { investment_project: true });
    expect(on.map((s) => s.key)).toEqual([
      "cost",
      "plans",
      "materials",
      "consult",
      "execution",
      "investment",
    ]);
    expect(on[on.length - 1].href).toBe(`/dashboard/investments?project=${PID}`);
  });

  it("le contexte projet reste conservé après filtrage", () => {
    const steps = buildProjectJourney("maison", PID, { architectural_plans: false });
    expect(steps.every((s) => s.href.includes(PID))).toBe(true);
  });

  it("les routes de repérage restent uniques après filtrage", () => {
    const steps = buildProjectJourney("maison", PID, { ai_materials: false });
    expect(new Set(steps.map((s) => s.path)).size).toBe(steps.length);
  });

  it("invariant : le parcours n'est jamais vide avec un projet valide, même tous flags désactivés", () => {
    const allOff = {
      construction_cost_estimation: false,
      architectural_plans: false,
      ai_materials: false,
      investment_project: false,
    };
    // Consultation / Exécution / Fournisseurs ne dépendent d'aucun flag.
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

  it("barre masquée sans identifiant de projet (aucune étape)", () => {
    expect(buildAiMaterialsResultJourney(null, SUPPLIER_HREF)).toEqual([]);
    expect(buildAiMaterialsResultJourney("  ")).toEqual([]);
  });
});
