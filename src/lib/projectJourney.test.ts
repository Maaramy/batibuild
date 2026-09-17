import { describe, it, expect } from "vitest";
import { PROJECT_TYPES } from "@/convex/projectTypes";
import {
  PROJECT_JOURNEY_GROUP_A,
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

describe("buildAiMaterialsResultJourney — page « Résultat de l'analyse IA »", () => {
  const SUPPLIER_HREF = `${SUPPLIERS_DIRECTORY_PATH}?from=materials&region=Tunis`;

  it("groupe A : coût estimatif puis fournisseur", () => {
    const steps = buildAiMaterialsResultJourney("maison", PID, SUPPLIER_HREF);
    expect(steps.map((s) => s.label)).toEqual(["Coût estimatif", "Fournisseur"]);
    expect(steps.map((s) => s.key)).toEqual(["cost", "supplier"]);
  });

  it("groupe A : l'étape Fournisseur ouvre l'annuaire pré-filtré des fournisseurs trouvés", () => {
    const steps = buildAiMaterialsResultJourney("villa", PID, SUPPLIER_HREF);
    expect(steps[1].href).toBe(SUPPLIER_HREF);
    expect(steps[1].path).toBe(SUPPLIERS_DIRECTORY_PATH);
    expect(steps[0].href).toBe(`/dashboard/project/${PID}`);
  });

  it("groupe A : annuaire sans pré-filtre si aucun lien n'est fourni", () => {
    const steps = buildAiMaterialsResultJourney("appartement", PID);
    expect(steps[1].href).toBe(SUPPLIERS_DIRECTORY_PATH);
  });

  it("groupe B : coût estimatif puis consultation (la page est déjà centrée fournisseurs)", () => {
    for (const category of ["renovation_complete", "renovation_cuisine"]) {
      const steps = buildAiMaterialsResultJourney(category, PID, SUPPLIER_HREF);
      expect(steps.map((s) => s.label), category).toEqual(["Coût estimatif", "Consultation"]);
      expect(steps[1].href).toBe(`/dashboard/professionals-directory?project=${PID}`);
    }
  });

  it("barre masquée sans identifiant de projet (aucune étape)", () => {
    expect(buildAiMaterialsResultJourney("maison", null)).toEqual([]);
    expect(buildAiMaterialsResultJourney("maison", "  ")).toEqual([]);
  });
});
