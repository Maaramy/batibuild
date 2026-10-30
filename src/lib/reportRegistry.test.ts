import { describe, it, expect } from "vitest";
import {
  REPORT_MODULE_KEYS_BY_GROUP,
  countAvailableReports,
  reportModuleKeysForGroup,
  reportStatuses,
  visibleReportModules,
  type ReportModuleKey,
} from "./reportRegistry";

const allEnabled = () => true;
const keys = (category: string): ReportModuleKey[] =>
  visibleReportModules(allEnabled, category).map((m) => m.key);

describe("règle du rapport PDF selon le groupe du projet", () => {
  it("Groupe A — rapport complet, dans l'ordre du registre", () => {
    expect(keys("villa")).toEqual(["cost", "plans", "decision", "investment", "execution"]);
  });

  it("Groupe A — le studio, le local et la rénovation complète suivent le parcours complet", () => {
    // Le module Investissement ne s'applique pas à ces types (bien non
    // investissable au sens du module : studio, local, rénovation) : la section
    // « Investissement immobilier » est donc absente, comme avant.
    for (const type of ["studio", "local", "renovation_complete"]) {
      expect(keys(type), type).toEqual(["cost", "plans", "decision", "execution"]);
    }
  });

  it("Groupe A / D — la section Investissement accompagne les biens éligibles", () => {
    for (const type of [
      "villa",
      "appartement",
      "maison",
      "immeuble",
      "duplex",
      "local_commercial",
      "bureau",
      "entrepot",
      "residence_touristique",
      "projet_neuf",
    ]) {
      expect(keys(type), type).toContain("investment");
    }
    // Types hors du périmètre du module (restaurant, café, studio…)
    for (const type of ["restaurant", "cafe", "studio"]) {
      expect(keys(type), type).not.toContain("investment");
    }
  });

  it("Groupe D — les locaux professionnels ont le rapport complet", () => {
    for (const type of ["local_commercial", "bureau", "entrepot"]) {
      expect(keys(type), type).toEqual([
        "cost",
        "plans",
        "decision",
        "investment",
        "execution",
      ]);
    }
    for (const type of ["restaurant", "cafe"]) {
      expect(keys(type), type).toEqual(["cost", "plans", "decision", "execution"]);
    }
  });

  it("Groupes B et C — seule la section « Coût estimatif » est présente", () => {
    for (const type of [
      "extension_batiment",
      "piscine",
      "renovation_cuisine",
      "renovation_salle_de_bain",
      "electricite_complete",
      "plomberie_complete",
      "cloture",
    ]) {
      expect(keys(type), type).toEqual(["cost"]);
    }
  });

  it("Groupes B et C — les autres étapes ne réapparaissent jamais, même flags activés", () => {
    for (const type of ["piscine", "electricite_complete"]) {
      const modules = visibleReportModules(allEnabled, type);
      expect(modules.map((m) => m.key), type).toEqual(["cost"]);
      expect(modules.map((m) => m.label), type).toEqual(["Coût estimatif"]);
    }
  });

  it("le groupe est déduit du type, sans sélection manuelle", () => {
    expect(REPORT_MODULE_KEYS_BY_GROUP.A).toHaveLength(5);
    expect(REPORT_MODULE_KEYS_BY_GROUP.D).toHaveLength(5);
    expect(REPORT_MODULE_KEYS_BY_GROUP.B).toHaveLength(1);
    expect(REPORT_MODULE_KEYS_BY_GROUP.C).toHaveLength(1);
    expect(reportModuleKeysForGroup("D")).toEqual([
      "cost",
      "plans",
      "decision",
      "investment",
      "execution",
    ]);
    expect(reportModuleKeysForGroup("B")).toEqual(["cost"]);
    expect(reportModuleKeysForGroup("C")).toEqual(["cost"]);
  });

  it("un type inconnu reste en Groupe C (rapport d'estimation uniquement)", () => {
    expect(keys("")).toEqual(["cost"]);
    expect(keys("type_inexistant")).toEqual(["cost"]);
  });

  it("le feature flag reste prioritaire : Coût estimatif désactivé → aucune section (Groupe C)", () => {
    expect(
      visibleReportModules(
        (flag) => flag !== "construction_cost_estimation",
        "electricite_complete",
      ),
    ).toEqual([]);
  });

  it("le nombre de rapports disponibles d'un projet Groupe C ne dépasse jamais 1", () => {
    const project = {
      _id: "p1",
      category: "electricite_complete",
      surface: 120,
      costEstimate: {},
    };
    const statuses = reportStatuses(project, {
      roadmapId: "r1",
      budgetAnalysisId: "b1",
    });
    const modules = visibleReportModules(allEnabled, project.category);
    expect(countAvailableReports(modules, statuses)).toBe(1);
  });

  it("Aide à la décision — rapport disponible seulement après une analyse de budget", () => {
    const project = { _id: "p1", category: "maison", surface: 120, costEstimate: {} };
    expect(reportStatuses(project, {}).decision).toBe("not_executed");
    expect(reportStatuses(project, { budgetAnalysisId: "b1" }).decision).toBe(
      "available",
    );
  });

  it("aucun rapport « Matériaux AI » ne subsiste dans le centre de rapports", () => {
    for (const type of ["villa", "local_commercial", "piscine"]) {
      expect(keys(type)).not.toContain("materials");
    }
  });

  it("Investissement — rapport disponible seulement après une analyse enregistrée", () => {
    const project = { _id: "p1", category: "villa", surface: 120, costEstimate: {} };
    expect(reportStatuses(project, {}).investment).toBe("not_executed");
    expect(
      reportStatuses(project, { investmentAnalysisId: "i1" }).investment,
    ).toBe("available");
  });

  it("« Aide à la décision » est pilotable par son propre feature flag", () => {
    expect(
      visibleReportModules((flag) => flag !== "decision_support", "villa").map(
        (m) => m.key,
      ),
    ).toEqual(["cost", "plans", "investment", "execution"]);
  });
});
