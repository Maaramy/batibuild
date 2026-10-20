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
    expect(keys("villa")).toEqual(["cost", "plans", "materials", "execution"]);
  });

  it("Groupe A — le studio, le local et la rénovation complète suivent le parcours complet", () => {
    for (const type of ["studio", "local", "renovation_complete"]) {
      expect(keys(type), type).toEqual(["cost", "plans", "materials", "execution"]);
    }
  });

  it("Groupe B — coût estimatif et exécution, sans plans architecturaux AI", () => {
    for (const type of [
      "extension_batiment",
      "piscine",
      "restaurant",
      "cafe",
      "renovation_cuisine",
      "local_commercial",
    ]) {
      expect(keys(type), type).toEqual(["cost", "execution"]);
    }
  });

  it("Groupe B — les autres étapes ne réapparaissent jamais, même flags activés", () => {
    const modules = visibleReportModules(allEnabled, "piscine");
    expect(modules.map((m) => m.key)).toEqual(["cost", "execution"]);
    expect(modules.map((m) => m.label)).toEqual([
      "Coût estimatif",
      "Exécution & suivi",
    ]);
  });

  it("Groupe C — seule la section « Coût estimatif » est présente", () => {
    for (const type of ["bureau", "peinture_interieure", "plomberie_complete", "cloture"]) {
      expect(keys(type), type).toEqual(["cost"]);
    }
  });

  it("le groupe est déduit du type, sans sélection manuelle", () => {
    expect(REPORT_MODULE_KEYS_BY_GROUP.A).toHaveLength(4);
    expect(REPORT_MODULE_KEYS_BY_GROUP.B).toHaveLength(2);
    expect(REPORT_MODULE_KEYS_BY_GROUP.C).toHaveLength(1);
    expect(reportModuleKeysForGroup("B")).toEqual(["cost", "execution"]);
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
        "bureau",
      ),
    ).toEqual([]);
  });

  it("le nombre de rapports disponibles d'un projet Groupe C ne dépasse jamais 1", () => {
    const project = {
      _id: "p1",
      category: "bureau",
      surface: 120,
      costEstimate: {},
    };
    const statuses = reportStatuses(project, {
      materialsAnalysisId: "m1",
      roadmapId: "r1",
    });
    const modules = visibleReportModules(allEnabled, project.category);
    expect(countAvailableReports(modules, statuses)).toBe(1);
  });
});
