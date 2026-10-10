import { describe, it, expect } from "vitest";

import {
  EXPERT_CATEGORIES,
  EXPERT_OTHER_CATEGORY,
  EXPERT_PROFESSION_LABELS,
  expertCategoryOf,
} from "./expertCategories";

// ============================================================================
// CATÉGORIES D'EXPERTS — regroupement normalisé (données partagées)
// ============================================================================

describe("EXPERT_PROFESSION_LABELS", () => {
  it("donne le libellé officiel de chaque profession", () => {
    expect(EXPERT_PROFESSION_LABELS.architecte).toBe("Architecte");
    expect(EXPERT_PROFESSION_LABELS.bureau_etudes).toBe("Bureau d'études");
    expect(EXPERT_PROFESSION_LABELS.ingenieur).toBe("Ingénieur");
    expect(EXPERT_PROFESSION_LABELS.promoteur_immobilier).toBe(
      "Promoteur immobilier",
    );
    expect(EXPERT_PROFESSION_LABELS.plombier).toBe("Plombier");
    expect(EXPERT_PROFESSION_LABELS.electricien).toBe("Électricien");
  });
});

describe("expertCategoryOf", () => {
  it("classe chaque profession dans sa catégorie officielle", () => {
    expect(expertCategoryOf("architecte").key).toBe("architectes");
    expect(expertCategoryOf("ingenieur").key).toBe("ingenieurs");
    expect(expertCategoryOf("bureau_etudes").key).toBe("bureaux_etudes");
    expect(expertCategoryOf("electricien").key).toBe("electricite");
    expect(expertCategoryOf("plombier").key).toBe("plomberie");
    expect(expertCategoryOf("promoteur_immobilier").key).toBe("promoteurs");
  });

  it("retombe sur « Autre spécialité » pour une profession inconnue ou absente", () => {
    expect(expertCategoryOf("geometre").key).toBe("autre_specialite");
    expect(expertCategoryOf("").key).toBe("autre_specialite");
    expect(expertCategoryOf(null).key).toBe("autre_specialite");
    expect(expertCategoryOf(undefined).key).toBe("autre_specialite");
  });

  it("les catégories sont normalisées : clés et icônes uniques", () => {
    const keys = [...EXPERT_CATEGORIES.map((c) => c.key), EXPERT_OTHER_CATEGORY.key];
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of EXPERT_CATEGORIES) {
      expect(c.icon.length).toBeGreaterThan(0);
      expect(c.label.length).toBeGreaterThan(0);
    }
  });
});
