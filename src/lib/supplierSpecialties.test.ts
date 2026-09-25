import { describe, it, expect } from "vitest";
import {
  SUPPLIER_SPECIALTIES,
  SUPPLIER_SPECIALTIES_LABELS,
  REMOVED_SUPPLIER_SPECIALTIES,
  keepSupplierSpecialties,
} from "./supplierSpecialties";

// ============================================================================
// Spécialités fournisseur — les métiers de maîtrise d'œuvre / promotion
// (architecte, bureau d'études, ingénieur, géomètre, promoteur immobilier) ne
// font plus partie de l'espace Fournisseur : ils appartiennent à l'espace
// Expert. Ces tests verrouillent la non-régression.
// ============================================================================

describe("SUPPLIER_SPECIALTIES — métiers retirés", () => {
  it("ne propose plus aucune des spécialités retirées", () => {
    const list = SUPPLIER_SPECIALTIES as readonly string[];
    for (const removed of REMOVED_SUPPLIER_SPECIALTIES) {
      expect(list).not.toContain(removed);
      expect(SUPPLIER_SPECIALTIES_LABELS[removed]).toBeUndefined();
    }
  });

  it("conserve les spécialités matériaux / services", () => {
    const list = SUPPLIER_SPECIALTIES as readonly string[];
    expect(list).toContain("gros_oeuvre");
    expect(list).toContain("carrelage");
    expect(list).toContain("plomberie");
    expect(list).toContain("location_engins");
    expect(SUPPLIER_SPECIALTIES_LABELS.gros_oeuvre).toBe("Gros œuvre");
    expect(SUPPLIER_SPECIALTIES_LABELS.location_engins).toBe("Location d'engins");
  });
});

describe("keepSupplierSpecialties", () => {
  it("écarte les valeurs historiques sans toucher aux autres", () => {
    expect(
      keepSupplierSpecialties(["architecte", "carrelage", "geometre"]),
    ).toEqual(["carrelage"]);
    expect(keepSupplierSpecialties(["bureau_etudes", "ingenieur"])).toEqual([]);
  });

  it("laisse intactes les valeurs hors liste retirée", () => {
    expect(keepSupplierSpecialties(["ciment", "carrelage"])).toEqual([
      "ciment",
      "carrelage",
    ]);
  });

  it("gère les listes absentes ou vides", () => {
    expect(keepSupplierSpecialties(undefined)).toEqual([]);
    expect(keepSupplierSpecialties(null)).toEqual([]);
    expect(keepSupplierSpecialties([])).toEqual([]);
  });
});
