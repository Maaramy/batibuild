// ============================================================================
// TESTS UNITAIRES — MODULE MULTI-NIVEAUX (source unique de calcul)
// Vérifie les invariants du calcul, les surfaces réelles par niveau et la
// détection automatique des anomalies (aucune incohérence masquée).
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  DEFAULT_LEVEL_COST_CONFIG,
  LEVEL_COEFFICIENT_RANGES,
  TAXES_INCLUDED_IN_UNIT_PRICES,
  checkDqeConsistency,
  checkLevelCosting,
  coefficientForLevel,
  computeLevelCost,
  levelBreakdownSummary,
  levelLabels,
  normalizeLevelSurfaces,
  realBuiltArea,
  resolveLevelCostConfig,
} from "./buildingLevels";

const PRICE = 1980; // Tunis standard 2026 (TND/m²)

describe("coefficients de niveau", () => {
  it("les valeurs par défaut sont dans les fourchettes 65-80 % / 56-80 %", () => {
    expect(DEFAULT_LEVEL_COST_CONFIG.rdc).toBe(1);
    expect(DEFAULT_LEVEL_COST_CONFIG.rPlus1).toBeGreaterThanOrEqual(
      LEVEL_COEFFICIENT_RANGES.rPlus1.min,
    );
    expect(DEFAULT_LEVEL_COST_CONFIG.rPlus1).toBeLessThanOrEqual(
      LEVEL_COEFFICIENT_RANGES.rPlus1.max,
    );
    expect(DEFAULT_LEVEL_COST_CONFIG.rPlus2).toBeGreaterThanOrEqual(
      LEVEL_COEFFICIENT_RANGES.rPlus2.min,
    );
    expect(DEFAULT_LEVEL_COST_CONFIG.rPlus2).toBeLessThanOrEqual(
      LEVEL_COEFFICIENT_RANGES.rPlus2.max,
    );
    expect(DEFAULT_LEVEL_COST_CONFIG.rPlus3AndAbove).toBeGreaterThanOrEqual(0.56);
    expect(DEFAULT_LEVEL_COST_CONFIG.rPlus3AndAbove).toBeLessThanOrEqual(0.8);
  });

  it("le coefficient dépend du rang du niveau (RDC, R+1, R+2, R+3+)", () => {
    const cfg = resolveLevelCostConfig();
    expect(coefficientForLevel(1, cfg)).toBe(cfg.rdc);
    expect(coefficientForLevel(2, cfg)).toBe(cfg.rPlus1);
    expect(coefficientForLevel(3, cfg)).toBe(cfg.rPlus2);
    expect(coefficientForLevel(4, cfg)).toBe(cfg.rPlus3AndAbove);
    expect(coefficientForLevel(7, cfg)).toBe(cfg.rPlus3AndAbove);
  });

  it("les surcharges administrateur remplacent les défauts, les invalides sont ignorées", () => {
    const cfg = resolveLevelCostConfig({ rPlus1: 0.68, commonShare: 0 });
    expect(cfg.rPlus1).toBe(0.68);
    expect(cfg.commonShare).toBe(DEFAULT_LEVEL_COST_CONFIG.commonShare); // 0 → défaut
    expect(cfg.rPlus2).toBe(DEFAULT_LEVEL_COST_CONFIG.rPlus2);
    expect(levelLabels(3)).toEqual(["RDC", "R+1", "R+2"]);
  });
});

describe("surfaces réelles par niveau", () => {
  it("un niveau non renseigné reprend la surface du RDC", () => {
    expect(normalizeLevelSurfaces(100, 3)).toEqual([100, 100, 100]);
    expect(realBuiltArea(100, 3)).toBe(300);
  });

  it("une surface d'étage différente n'est jamais remplacée par celle du RDC", () => {
    expect(normalizeLevelSurfaces(100, 3, [100, 100, 80])).toEqual([100, 100, 80]);
    expect(realBuiltArea(100, 3, [100, 100, 80])).toBe(280);
    // Champs partiels : seuls les niveaux renseignés sont conservés.
    expect(normalizeLevelSurfaces(120, 3, [120, 90])).toEqual([120, 90, 120]);
  });
});

describe("computeLevelCost — méthode de calcul", () => {
  it("plain-pied : 100 % du prix au m², toiture comprise une seule fois", () => {
    const r = computeLevelCost({ surface: 100, floors: 1, pricePerM2: PRICE });
    expect(r.total).toBe(PRICE * 100);
    expect(r.roof.counted).toBe(false);
    expect(r.roof.amount).toBe(0);
    expect(r.common.countedOnce).toBe(true);
    expect(r.common.amount).toBe(Math.round(PRICE * 100 * r.config.commonShare));
    expect(r.anomalies).toEqual([]);
  });

  it("R+1 : total strictement inférieur à deux RDC complets", () => {
    const rdc = computeLevelCost({ surface: 100, floors: 1, pricePerM2: PRICE });
    const r1 = computeLevelCost({ surface: 100, floors: 2, pricePerM2: PRICE });
    expect(r1.total).toBe(
      Math.round(PRICE * 100 * r1.config.rdc) + Math.round(PRICE * 100 * r1.config.rPlus1) + r1.roof.amount,
    );
    expect(r1.total).toBeGreaterThan(rdc.total);
    expect(r1.total).toBeLessThan(rdc.total * 2);
    expect(r1.levels[1].commonAmount).toBe(0); // frais communs portés une seule fois
  });

  it("la toiture est chiffrée une seule fois, sur le dernier niveau", () => {
    const r = computeLevelCost({ surface: 120, floors: 3, pricePerM2: PRICE });
    expect(r.roof.area).toBe(120);
    expect(r.roof.amount).toBe(Math.round(PRICE * 120 * r.config.roofWeight));
    expect(r.total).toBe(
      r.levels.reduce((s, l) => s + l.amount, 0) + r.roof.amount,
    );
  });

  it("le coût moyen au m² porte sur la surface réellement construite", () => {
    const r = computeLevelCost({ surface: 100, floors: 2, pricePerM2: PRICE });
    expect(r.realBuiltArea).toBe(200);
    expect(r.costPerM2Real).toBe(Math.round(r.total / 200));
    expect(r.equivalentArea).toBeCloseTo(100 + 75 + 6, 1);
  });

  it("les taxes ne sont jamais ajoutées deux fois (prix unitaires TTC)", () => {
    expect(TAXES_INCLUDED_IN_UNIT_PRICES).toBe(true);
    const r = computeLevelCost({ surface: 100, floors: 2, pricePerM2: PRICE });
    // Aucun terme de taxe : le total est la somme des niveaux + toiture.
    expect(r.total).toBe(r.levels.reduce((s, l) => s + l.amount, 0) + r.roof.amount);
    expect(r.anomalies.map((a) => a.code)).not.toContain("taxes_incoherentes");
  });
});

describe("checkLevelCosting — vérification automatique des anomalies", () => {
  it("aucune anomalie sur un R+2 conforme", () => {
    expect(checkLevelCosting(computeLevelCost({ surface: 100, floors: 3, pricePerM2: PRICE }))).toEqual(
      [],
    );
  });

  it("détecte un coefficient d'étage qui dupliquerait les frais communs", () => {
    const r = computeLevelCost({
      surface: 100,
      floors: 2,
      pricePerM2: PRICE,
      config: { rPlus1: 0.8, commonShare: 0.25 },
    });
    const codes = r.anomalies.map((a) => a.code);
    expect(codes).toContain("frais_fixes_dupliques_R+1");
    expect(r.anomalies.find((a) => a.code === "frais_fixes_dupliques_R+1")!.severity).toBe("élevée");
  });

  it("détecte des coefficients hors fourchette", () => {
    const r = computeLevelCost({
      surface: 100,
      floors: 3,
      pricePerM2: PRICE,
      config: { rPlus3AndAbove: 0.4 },
    });
    expect(r.anomalies.map((a) => a.code)).toContain("coefficient_hors_fourchette");
  });

  it("détecte une surface nulle et une multiplication abusive du RDC", () => {
    const r = computeLevelCost({ surface: 0, floors: 2, pricePerM2: PRICE });
    expect(r.anomalies.map((a) => a.code)).toContain("surface_nulle");
    // Le total nul ne dépasse jamais le coût complet du RDC × niveaux.
    expect(r.total).toBe(0);
  });

  it("contrôle la cohérence coût estimatif ↔ Quantitatif détaillé", () => {
    expect(checkDqeConsistency(100_000, 100_000, 5)).toEqual([]);
    expect(checkDqeConsistency(100_000, 99_995, 5)).toEqual([]);
    const anomalies = checkDqeConsistency(100_000, 90_000, 5);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].code).toBe("dqe_ecart");
    expect(anomalies[0].severity).toBe("élevée");
  });

  it("le résumé détaille chaque niveau, la toiture et le total", () => {
    const r = computeLevelCost({ surface: 100, floors: 2, pricePerM2: PRICE });
    const summary = levelBreakdownSummary(r);
    expect(summary).toContain("RDC 100 m² × 100 %");
    expect(summary).toContain("R+1 100 m² × 75 %");
    expect(summary).toContain("Toiture / terrasse supérieure 100 m²");
    expect(summary).toContain(`Total ${r.total} TND`);
  });
});
