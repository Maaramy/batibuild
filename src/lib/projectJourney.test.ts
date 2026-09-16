import { describe, it, expect } from "vitest";
import { PROJECT_TYPES } from "@/convex/projectTypes";
import {
  PROJECT_JOURNEY_GROUP_A,
  buildProjectJourney,
  projectJourneyGroup,
} from "./projectJourney";

const GROUP_A_LABELS = [
  "Coût estimatif",
  "Plans",
  "Choix matériaux",
  "Exécution (Guide de A à Z)",
  "Consultation expert / entreprise",
];

const GROUP_B_LABELS = [
  "Coût estimatif",
  "Consultation pro / expert / entreprise",
];

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
  it("Maison : 5 étapes dans l'ordre officiel", () => {
    expect(buildProjectJourney("maison", PID).map((s) => s.label)).toEqual(GROUP_A_LABELS);
  });

  it("Villa : même structure que Maison", () => {
    expect(buildProjectJourney("villa", PID).map((s) => s.label)).toEqual(GROUP_A_LABELS);
  });

  it("Appartement : même structure que Maison", () => {
    expect(buildProjectJourney("appartement", PID).map((s) => s.label)).toEqual(GROUP_A_LABELS);
  });

  it("Rénovation : uniquement coût estimatif + consultation", () => {
    expect(buildProjectJourney("renovation_complete", PID).map((s) => s.label)).toEqual(
      GROUP_B_LABELS,
    );
  });

  it("Cuisine : uniquement coût estimatif + consultation", () => {
    expect(buildProjectJourney("renovation_cuisine", PID).map((s) => s.label)).toEqual(
      GROUP_B_LABELS,
    );
  });

  it("Salle de bain : uniquement coût estimatif + consultation", () => {
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
      "execution",
      "consult",
    ]);
    expect(steps.map((s) => s.href)).toEqual([
      "/dashboard/project/proj_1",
      "/dashboard/plans/proj_1",
      "/dashboard/ai-materials?project=proj_1",
      "/dashboard/guide?project=proj_1",
      "/dashboard/professionals-directory?project=proj_1",
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
