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
    expect(keys("villa")).toEqual([
      "cost",
      "plans",
      "decision",
      "materials",
      "execution",
    ]);
  });

  it("Groupe A — le studio, le local et la rénovation complète suivent le parcours complet", () => {
    for (const type of ["studio", "local", "renovation_complete"]) {
      expect(keys(type), type).toEqual([
        "cost",
        "plans",
        "decision",
        "materials",
        "execution",
      ]);
    }
  });

  it("Groupe D — les 5 locaux professionnels ont le rapport complet", () => {
    for (const type of [
      "local_commercial",
      "bureau",
      "entrepot",
      "restaurant",
      "cafe",
    ]) {
      expect(keys(type), type).toEqual([
        "cost",
        "plans",
        "decision",
        "materials",
        "execution",
      ]);
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
      "materials",
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
      materialsAnalysisId: "m1",
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
});
