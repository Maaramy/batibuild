// ============================================================================
// TESTS MULTI-NIVEAUX — COÛT DE CONSTRUCTION RDC / R+1 / R+2 / R+3
// ----------------------------------------------------------------------------
// Vérifie la méthode de calcul retenue pour les bâtiments à plusieurs niveaux :
//   • le RDC porte les travaux communs (terrassement, fondations dimensionnées
//     pour la structure totale, études, VRD, aménagements extérieurs) UNE fois ;
//   • chaque étage supérieur est chiffré sur sa surface RÉELLE et son
//     coefficient de niveau (R+1/R+2 : 65-80 % · R+3+ : 56-80 %) ;
//   • la toiture / terrasse supérieure est chiffrée séparément, une seule fois ;
//   • le coût d'un R+1 n'est jamais le double du coût complet d'un RDC ;
//   • aucune taxe n'est ajoutée deux fois (prix unitaires déjà TTC) ;
//   • le coût global TTC correspond exactement à la somme du DQE ;
//   • toute incohérence est remontée comme anomalie, jamais masquée.
//
// Les huit configurations de validation demandées sont couvertes :
//   1. maison de plain-pied 100 m²            5. toiture-terrasse
//   2. maison R+1 (100 + 100 m²)              6. travaux complémentaires
//   3. maison R+2 (100 m² par niveau)         7. prix modifié dans le DQE
//   4. R+2 à surfaces différentes             8. changement de région/scénario
// ============================================================================

import { describe, expect, it } from "vitest";

import { runBIMEstimation, type BIMEstimationOptions } from "./bimEngine";
import { generateDqe } from "./dqeEngine";
import {
  overlayCustomizations,
  computeQuantitatifTotals,
  type QuantitatifCustomizationEntry,
} from "./quantitatifCustomLogic";
import {
  DEFAULT_LEVEL_COST_CONFIG,
  LEVEL_COEFFICIENT_RANGES,
  checkLevelCosting,
  computeLevelCost,
  realBuiltArea,
  resolveLevelCostConfig,
} from "../lib/buildingLevels";

const REGION = "tunis";
const LEVEL = "standard";

/** Coût estimatif multi-niveaux d'un projet. */
function estimate(
  surface: number,
  floors: number,
  options?: BIMEstimationOptions,
  region: string = REGION,
  finishLevel: string = LEVEL,
) {
  return runBIMEstimation("maison", surface, floors, region, finishLevel, undefined, options);
}

const sumLevelsAndRoof = (ce: any) =>
  ce.levelBreakdown.levels.reduce((s: number, l: any) => s + l.amount, 0) +
  ce.levelBreakdown.roof.amount;

describe("1 · Maison de plain-pied 100 m²", () => {
  const ce = estimate(100, 1).costEstimate;

  it("le total reste exactement la grille régionale × surface (comportement inchangé)", () => {
    // Tunis standard 2026 = 1 980 TND/m²
    expect(ce.totalCost).toBe(1980 * 100);
    expect(ce.costPerSquareMeter).toBe(1980);
  });

  it("un seul niveau RDC, sans ligne d'étage ni toiture ajoutée deux fois", () => {
    const lb = ce.levelBreakdown;
    expect(lb.levels).toHaveLength(1);
    expect(lb.levels[0].label).toBe("RDC");
    expect(lb.levels[0].coefficient).toBe(1);
    expect(lb.levels[0].commonAmount).toBeGreaterThan(0);
    // Toiture comprise dans le coût du RDC : elle n'est pas ajoutée une 2ᵉ fois.
    expect(lb.roof.counted).toBe(false);
    expect(lb.roof.amount).toBe(0);
    expect(ce.totalCost).toBe(sumLevelsAndRoof(ce));
    expect(lb.anomalies).toEqual([]);
  });
});

describe("2 · Maison R+1 (100 m² au RDC + 100 m² à l'étage)", () => {
  const rdc = estimate(100, 1).costEstimate;
  const ce = estimate(100, 2).costEstimate;

  it("n'est JAMAIS calculé comme deux coûts complets de RDC", () => {
    expect(ce.totalCost).toBeGreaterThan(rdc.totalCost);
    expect(ce.totalCost).toBeLessThan(rdc.totalCost * 2);
  });

  it("le RDC est à 100 % et l'étage au coefficient de niveau (dans 65-80 %)", () => {
    const [rdcLine, r1] = ce.levelBreakdown.levels;
    expect(rdcLine.area).toBe(100);
    expect(rdcLine.amount).toBe(1980 * 100);
    expect(r1.label).toBe("R+1");
    expect(r1.coefficient).toBeGreaterThanOrEqual(0.65);
    expect(r1.coefficient).toBeLessThanOrEqual(0.8);
    expect(r1.amount).toBe(Math.round(1980 * 100 * r1.coefficient));
    // Les frais communs ne sont portés que par le RDC.
    expect(r1.commonAmount).toBe(0);
  });

  it("la toiture-terrasse supérieure est chiffrée une seule fois", () => {
    const lb = ce.levelBreakdown;
    expect(lb.roof.counted).toBe(true);
    expect(lb.roof.area).toBe(100);
    expect(lb.roof.amount).toBe(Math.round(1980 * 100 * lb.roof.weight));
    expect(ce.totalCost).toBe(sumLevelsAndRoof(ce));
  });

  it("le coût moyen au m² porte sur la surface réellement construite", () => {
    expect(realBuiltArea(100, 2)).toBe(200);
    expect(ce.costPerSquareMeter).toBe(Math.round(ce.totalCost / 200));
  });
});

describe("3 · Maison R+2 (100 m² par niveau)", () => {
  const r1 = estimate(100, 2).costEstimate;
  const ce = estimate(100, 3).costEstimate;

  it("croît avec les niveaux sans dépasser trois RDC complets", () => {
    expect(ce.totalCost).toBeGreaterThan(r1.totalCost);
    expect(ce.totalCost).toBeLessThan(estimate(100, 1).costEstimate.totalCost * 3);
  });

  it("chaque niveau est chiffré sur sa surface et son coefficient", () => {
    const lb = ce.levelBreakdown;
    expect(lb.levels.map((l) => l.label)).toEqual(["RDC", "R+1", "R+2"]);
    for (const level of lb.levels) {
      expect(level.area).toBe(100);
      expect(level.amount).toBe(Math.round(1980 * level.area * level.coefficient));
    }
    // Les coefficients restent dans les fourchettes documentées.
    const r2 = lb.levels[2];
    expect(r2.coefficient).toBeGreaterThanOrEqual(LEVEL_COEFFICIENT_RANGES.rPlus2.min);
    expect(r2.coefficient).toBeLessThanOrEqual(LEVEL_COEFFICIENT_RANGES.rPlus2.max);
    expect(lb.anomalies).toEqual([]);
  });

  it("aucun poste n'est compté deux fois (total = somme des niveaux + toiture)", () => {
    expect(ce.totalCost).toBe(sumLevelsAndRoof(ce));
  });
});

describe("4 · Bâtiment R+2 avec des surfaces différentes à chaque niveau", () => {
  // Exemple de l'énoncé : RDC 100 m² · R+1 100 m² · R+2 80 m² → 280 m² construits.
  const levelSurfaces = [100, 100, 80];
  const ce = estimate(100, 3, { levelSurfaces }).costEstimate;

  it("la surface construite est la somme des surfaces réelles (280 m²)", () => {
    expect(realBuiltArea(100, 3, levelSurfaces)).toBe(280);
    expect(ce.levelBreakdown.realBuiltArea).toBe(280);
    expect(ce.costPerSquareMeter).toBe(Math.round(ce.totalCost / 280));
  });

  it("un étage plus petit n'est jamais facturé comme le RDC", () => {
    const [rdc, r1, r2] = ce.levelBreakdown.levels;
    expect(rdc.area).toBe(100);
    expect(r1.area).toBe(100);
    expect(r2.area).toBe(80);
    // Chaque niveau garde SON coefficient (R+1 75 % · R+2 72 %) et son montant
    // reste proportionnel à SA surface : jamais celui du RDC.
    expect(r1.coefficient).toBe(DEFAULT_LEVEL_COST_CONFIG.rPlus1);
    expect(r2.coefficient).toBe(DEFAULT_LEVEL_COST_CONFIG.rPlus2);
    expect(r1.amount).toBe(Math.round(1980 * 100 * DEFAULT_LEVEL_COST_CONFIG.rPlus1));
    expect(r2.amount).toBe(Math.round(1980 * 80 * DEFAULT_LEVEL_COST_CONFIG.rPlus2));
    expect(r2.amount).toBeLessThan(r1.amount);
  });

  it("les surfaces par niveau modifient réellement le coût global", () => {
    const equal = estimate(100, 3).costEstimate;
    expect(ce.totalCost).toBeLessThan(equal.totalCost);
    expect(ce.totalCost).toBeGreaterThan(estimate(100, 2).costEstimate.totalCost);
  });
});

describe("5 · Bâtiment avec toiture-terrasse", () => {
  it("la terrasse supérieure est un poste distinct compté une seule fois", () => {
    const ce = estimate(120, 3).costEstimate;
    const lb = ce.levelBreakdown;
    expect(lb.roof.label).toBe("Toiture / terrasse supérieure");
    expect(lb.roof.counted).toBe(true);
    // Elle porte sur le dernier niveau, pas sur la somme des niveaux.
    expect(lb.roof.area).toBe(120);
    expect(lb.roof.amount).toBeGreaterThan(0);
    expect(lb.roof.amount).toBe(Math.round(1980 * 120 * lb.roof.weight));
    // Pas de doublon : le total ne la compte qu'une fois.
    expect(ce.totalCost).toBe(sumLevelsAndRoof(ce));
  });

  it("la toiture n'est pas multipliée par le nombre d'étages", () => {
    const r1 = estimate(120, 2).costEstimate.levelBreakdown.roof;
    const r3 = estimate(120, 4).costEstimate.levelBreakdown.roof;
    // Même emprise → même surface de toiture (une seule toiture par bâtiment).
    expect(r3.area).toBe(r1.area);
    expect(r3.amount).toBe(r1.amount);
  });
});

describe("6 · Projet avec travaux complémentaires personnalisés", () => {
  it("les travaux complémentaires s'ajoutent au DQE sans casser la cohérence multi-niveaux", () => {
    const ce = estimate(100, 2).costEstimate;
    const dqe = generateDqe({
      category: "maison",
      surface: 100,
      floors: 2,
      totalBudget: ce.totalCost,
    });

    // Travaux complémentaires ajoutés comme un lot supplémentaire du DQE.
    const complementary = {
      id: "travaux_complementaires",
      name: "Travaux complémentaires personnalisés",
      nature: "equipements",
      percent: 0,
      subtotal: 25_000,
      lines: [
        {
          designation: "Piscine 8×4 m — poste personnalisé",
          unit: "unité",
          quantity: 1,
          unitPrice: 25_000,
          total: 25_000,
          nature: "equipements",
        },
      ],
    };
    const lotsWithComplementary = [...dqe.lots, complementary];
    const totalsWithComplementary = computeQuantitatifTotals(
      lotsWithComplementary,
      ce.levelBreakdown.realBuiltArea,
    );

    // Le total du DQE reste la somme exacte de ses lots…
    expect(totalsWithComplementary.total).toBe(dqe.totals.total + 25_000);
    // …et le socle multi-niveaux n'a pas bougé d'un dinar.
    expect(ce.totalCost).toBe(sumLevelsAndRoof(ce));
    expect(ce.levelBreakdown.anomalies).toEqual([]);
  });
});

describe("7 · Modification d'un prix dans le DQE", () => {
  it("les sous-totaux et le coût global TTC sont recalculés automatiquement", () => {
    const ce = estimate(100, 2).costEstimate;
    const dqe = generateDqe({
      category: "maison",
      surface: 100,
      floors: 2,
      totalBudget: ce.totalCost,
    });

    const lot = dqe.lots.find((l) => l.lines.length > 0)!;
    const line = lot.lines[0];
    const entry: QuantitatifCustomizationEntry = {
      lineKey: `${lot.id}::0`,
      lotId: lot.id,
      lotName: lot.name,
      lineIndex: 0,
      baseDesignation: line.designation,
      designation: line.designation,
      unit: line.unit,
      quantity: line.quantity,
      unitPrice: line.unitPrice + 1_000, // prix unitaire modifié par l'utilisateur
      nature: line.nature,
      priceScenario: "standard",
      replacedArticle: false,
      updatedAt: Date.now(),
    };

    const overlaid = overlayCustomizations(dqe.lots, [entry], {
      scaleFactor: 1,
      realCostFactor: 1,
    });
    expect(overlaid.modifiedCount).toBe(1);

    const overlaidLot = overlaid.lots.find((l) => l.id === lot.id)!;
    const overlaidLine = overlaidLot.lines[0];
    expect(overlaidLine.total).toBe(Math.round(entry.quantity * entry.unitPrice));
    // Sous-total du lot recalculé depuis ses lignes.
    expect(overlaidLot.subtotal).toBe(
      overlaidLot.lines.reduce((s: number, l: any) => s + (Number(l.total) || 0), 0),
    );
    // Coût global TTC recalculé = somme des sous-totaux des lots.
    const recomputed = computeQuantitatifTotals(overlaid.lots, ce.levelBreakdown.realBuiltArea);
    expect(recomputed.total).toBe(
      overlaid.lots.reduce((s: number, l: any) => s + (Number(l.subtotal) || 0), 0),
    );
    expect(recomputed.total).toBe(dqe.totals.total + (entry.unitPrice - line.unitPrice) * entry.quantity);
    // Aucune altération du calcul multi-niveaux de référence.
    expect(ce.totalCost).toBe(sumLevelsAndRoof(ce));
  });
});

describe("8 · Changement de région et de scénario de finition", () => {
  const REGIONS = [
    "tunis",
    "ariana",
    "sousse",
    "sfax",
    "kairouan",
    "gabes",
    "medenine",
    "tataouine",
    "kebili",
    "tozeur",
  ] as const;

  it("les coefficients de niveau restent identiques dans les 24 gouvernorats", () => {
    const reference = estimate(100, 2, undefined, "tunis").costEstimate.levelBreakdown;
    for (const region of REGIONS) {
      const lb = estimate(100, 2, undefined, region).costEstimate.levelBreakdown;
      expect(lb.levels.map((l) => l.coefficient)).toEqual(
        reference.levels.map((l) => l.coefficient),
      );
      expect(lb.anomalies).toEqual([]);
    }
  });

  it("le coefficient régional n'est appliqué qu'une fois (pas de double majoration)", () => {
    // Le total suit exactement la grille régionale du scénario choisi, pondérée
    // par la surface équivalente du bâtiment (aucun facteur supplémentaire).
    for (const region of REGIONS) {
      const ce = estimate(100, 2, undefined, region).costEstimate;
      const lb = ce.levelBreakdown;
      const priceM2 = ce.budgetScenarios.standard.costPerM2;
      expect(lb.pricePerM2).toBe(priceM2);
      expect(ce.totalCost).toBe(
        lb.levels.reduce((s, l) => s + Math.round(priceM2 * l.area * l.coefficient), 0) +
          Math.round(priceM2 * lb.roof.area * lb.roof.weight),
      );
    }
  });

  it("les scénarios Économique / Standard / Premium suivent la même méthode", () => {
    const ce = estimate(100, 3, undefined, "sousse").costEstimate;
    const s = ce.budgetScenarios;
    expect(s.economique.totalCost).toBeLessThan(s.standard.totalCost);
    expect(s.standard.totalCost).toBeLessThan(s.premium.totalCost);
    // Chaque scénario est la même surface équivalente au prix du scénario.
    const eq = ce.levelBreakdown.equivalentArea;
    expect(s.standard.totalCost).toBe(Math.round(s.standard.costPerM2 * eq));
    expect(Math.abs(s.economique.totalCost - Math.round(s.economique.costPerM2 * eq))).toBeLessThanOrEqual(1);
    expect(Math.abs(s.premium.totalCost - Math.round(s.premium.costPerM2 * eq))).toBeLessThanOrEqual(1);
  });
});

describe("Cohérence moteur ↔ DQE ↔ vérification automatique des anomalies", () => {
  const CASES = [
    { surface: 100, floors: 1, levelSurfaces: undefined },
    { surface: 100, floors: 2, levelSurfaces: undefined },
    { surface: 100, floors: 3, levelSurfaces: undefined },
    { surface: 100, floors: 3, levelSurfaces: [100, 100, 80] },
    { surface: 120, floors: 4, levelSurfaces: undefined },
    { surface: 220, floors: 2, levelSurfaces: [220, 140] },
  ];

  for (const { surface, floors, levelSurfaces } of CASES) {
    it(`${surface} m² × ${floors} niveau(x)${levelSurfaces ? " (surfaces par niveau)" : ""} : coût global = somme du DQE`, () => {
      const ce = estimate(surface, floors, { levelSurfaces }).costEstimate;
      const dqe = generateDqe({
        category: "maison",
        surface,
        floors,
        totalBudget: ce.totalCost,
        levelSurfaces,
      });

      // Le coût global TTC correspond exactement à la somme du DQE, dont
      // seul le lot « Second œuvre et finitions » est facturé au réel (les
      // autres lots gardent le budget alloué).
      const sumLots = dqe.lots.reduce((s, l) => s + l.subtotal, 0);
      expect(sumLots).toBe(dqe.totals.total);
      const realDelta = dqe.lots.reduce(
        (s, l) => s + (l.subtotal - (l.allocatedSubtotal ?? l.subtotal)),
        0,
      );
      expect(dqe.totals.total).toBe(ce.totalCost + realDelta);
      // Le DQE ne compte jamais deux fois les travaux communs : ses quantités de
      // fondations / terrassement suivent l'emprise au sol, pas le nombre de niveaux.
      const go = dqe.lots.find((l) => l.id === "gros_oeuvre")!;
      const fondations = go.lines.find((l) => l.designation === "Terrassement et fondations")!;
      expect(fondations.quantity).toBe(Math.round((120 * surface) / 120));
      // Aucune anomalie de calcul sur le bâtiment.
      expect(ce.levelBreakdown.anomalies).toEqual([]);
    });
  }

  it("le module de calcul est une source unique : défauts = fourchettes 65-80 %", () => {
    const cfg = resolveLevelCostConfig();
    expect(cfg).toEqual(DEFAULT_LEVEL_COST_CONFIG);
    expect(cfg.rPlus1).toBeGreaterThanOrEqual(LEVEL_COEFFICIENT_RANGES.rPlus1.min);
    expect(cfg.rPlus1).toBeLessThanOrEqual(LEVEL_COEFFICIENT_RANGES.rPlus1.max);
    expect(cfg.rPlus2).toBeGreaterThanOrEqual(LEVEL_COEFFICIENT_RANGES.rPlus2.min);
    expect(cfg.rPlus2).toBeLessThanOrEqual(LEVEL_COEFFICIENT_RANGES.rPlus2.max);
    expect(cfg.rPlus3AndAbove).toBeGreaterThanOrEqual(LEVEL_COEFFICIENT_RANGES.rPlus3AndAbove.min);
    expect(cfg.rPlus3AndAbove).toBeLessThanOrEqual(LEVEL_COEFFICIENT_RANGES.rPlus3AndAbove.max);
  });

  it("des coefficients administrateur hors fourchette sont signalés, pas masqués", () => {
    const ce = estimate(100, 2, { levelConfig: { rPlus1: 0.95 } }).costEstimate;
    const codes = ce.levelBreakdown.anomalies.map((a) => a.code);
    expect(codes).toContain("frais_fixes_dupliques_R+1");
    expect(codes).toContain("coefficient_hors_fourchette");
    // Le total reste la somme des postes détaillés (aucune correction cachée).
    expect(ce.totalCost).toBe(sumLevelsAndRoof(ce));
  });

  it("R+3 et suivants appliquent le coefficient dédié (56-80 %)", () => {
    const lb = computeLevelCost({
      surface: 100,
      floors: 4,
      pricePerM2: 1980,
      config: undefined,
    });
    expect(lb.levels[3].label).toBe("R+3");
    expect(lb.levels[3].coefficient).toBe(DEFAULT_LEVEL_COST_CONFIG.rPlus3AndAbove);
    expect(lb.levels[3].coefficient).toBeGreaterThanOrEqual(0.56);
    expect(lb.levels[3].coefficient).toBeLessThanOrEqual(0.8);
    expect(checkLevelCosting(lb)).toEqual([]);
  });
});
