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
      "materials",
      "investment",
      "execution",
    ]);
  });

  it("Groupe B — seule la section « Coût estimatif » est présente", () => {
    for (const type of [
      "studio",
      "renovation_complete",
      "extension_batiment",
      "piscine",
      "plomberie_complete",
    ]) {
      expect(keys(type), type).toEqual(["cost"]);
    }
  });

  it("Groupe B — les autres étapes ne réapparaissent jamais, même flags activés", () => {
    const modules = visibleReportModules(allEnabled, "renovation_complete");
    expect(modules).toHaveLength(1);
    expect(modules[0].key).toBe("cost");
    expect(modules[0].label).toBe("Coût estimatif");
  });

  it("le groupe est déduit du type, sans sélection manuelle", () => {
    expect(REPORT_MODULE_KEYS_BY_GROUP.A).toHaveLength(5);
    expect(reportModuleKeysForGroup("B")).toEqual(["cost"]);
  });

  it("un type inconnu reste en Groupe B (rapport d'estimation uniquement)", () => {
    expect(keys("")).toEqual(["cost"]);
    expect(keys("type_inexistant")).toEqual(["cost"]);
  });

  it("le feature flag reste prioritaire : Coût estimatif désactivé → aucune section (Groupe B)", () => {
    expect(
      visibleReportModules(
        (flag) => flag !== "construction_cost_estimation",
        "renovation_complete",
      ),
    ).toEqual([]);
  });

  it("le nombre de rapports disponibles d'un projet Groupe B ne dépasse jamais 1", () => {
    const project = {
      _id: "p1",
      category: "renovation_complete",
      surface: 120,
      costEstimate: {},
    };
    const statuses = reportStatuses(project, {
      materialsAnalysisId: "m1",
      roadmapId: "r1",
      investmentAnalysisId: "i1",
    });
    const modules = visibleReportModules(allEnabled, project.category);
    expect(countAvailableReports(modules, statuses)).toBe(1);
  });
});
