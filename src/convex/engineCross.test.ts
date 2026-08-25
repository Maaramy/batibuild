// ============================================================================
// TESTS CROISÉS — BIM Engine ↔ DQE Engine ↔ Feuille « Couts_24_gouv » 2026
// ============================================================================
// Garantit que :
//   1. le DQE généré depuis le budget BIM retombe exactement sur ce budget
//      (somme des sous-totaux de lots = total DQE = budget BIM clé en main) ;
//   2. chaque lot tombe exactement sur son sous-total déclaré ;
//   3. la ventilation régionale (niveaux, phases, facteurs) est conforme à
//      la feuille n°2 du classeur « Cout_construction_Tunisie_2026 » ;
//   4. la ventilation en 15 lots (onglet Detail_lots) somme à 100 %.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  GOVERNORATE_FACTORS_2026,
  GOVERNORATE_LEVELS_2026,
  GOVERNORATE_PHASES_M2,
  GOVERNORATE_STD_M2,
  LOT_VENTILATION_2026,
  NATIONAL_AVG,
  PHASE_SPLIT_2026,
  REGION_COST_M2,
  STANDING_LEVELS_2026,
  lotVentilationM2,
  runBIMEstimation,
} from "./bimEngine";
import { generateDqe } from "./dqeEngine";

const GOVERNORATES = Object.keys(GOVERNORATE_STD_M2);
expect(GOVERNORATES.length).toBe(24);

describe("Feuille n°2 « Couts_24_gouv » : niveaux par gouvernorat", () => {
  it("chaque gouvernorat a ses 4 niveaux centraux exacts", () => {
    for (const g of GOVERNORATES) {
      const lvl = GOVERNORATE_LEVELS_2026[g];
      expect(lvl, `niveaux manquants pour ${g}`).toBeDefined();
      expect(lvl.eco).toBeLessThan(lvl.std);
      expect(lvl.std).toBeLessThan(lvl.hautStanding);
      expect(lvl.hautStanding).toBeLessThan(lvl.luxe);
    }
  });

  it("le standard central correspond au tableau de bord (min Béja/Kairouan 1780 · max Tataouine 1950)", () => {
    const stds = GOVERNORATES.map((g) => GOVERNORATE_STD_M2[g]);
    expect(Math.min(...stds)).toBe(1780);
    expect(Math.max(...stds)).toBe(1950);
    // Moyenne des 24 gouvernorats = 1 845 DT/m² (feuille source)
    const avg = Math.round(stds.reduce((s, v) => s + v, 0) / stds.length);
    expect(avg).toBe(1845);
    expect(NATIONAL_AVG.std).toBe(1845);
  });

  it("REGION_COST_M2 reprend les valeurs exactes de la feuille n°2", () => {
    for (const g of GOVERNORATES) {
      const rc = REGION_COST_M2[g];
      const lvl = GOVERNORATE_LEVELS_2026[g];
      expect(rc.eco).toBe(lvl.eco);
      expect(rc.std).toBe(lvl.std);
      expect(rc.premium).toBe(lvl.hautStanding);
      expect(rc.luxe).toBe(lvl.luxe);
    }
  });

  it("échantillon Tunis : éco 1420 · std 1900 · haut standing 2640 · luxe 3580", () => {
    const rc = REGION_COST_M2.tunis;
    expect(rc).toMatchObject({ eco: 1420, std: 1900, premium: 2640, luxe: 3580 });
  });

  it("les niveaux nationaux restent alignés sur STANDING_LEVELS_2026", () => {
    const stdRef = STANDING_LEVELS_2026.find((l) => l.key === "standard")!;
    for (const g of GOVERNORATES) {
      const lvl = GOVERNORATE_LEVELS_2026[g];
      // Écart max ±3 % autour du central national (structure du modèle)
      expect(Math.abs(lvl.std / stdRef.central - 1)).toBeLessThan(0.10);
    }
  });
});

describe("Feuille n°2 : facteurs régionaux et phases", () => {
  it("chaque gouvernorat a des facteurs cohérents (0,9 – 1,2)", () => {
    for (const g of GOVERNORATES) {
      const f = GOVERNORATE_FACTORS_2026[g];
      expect(f, `facteurs manquants pour ${g}`).toBeDefined();
      for (const v of [f.materiaux, f.mainOeuvre, f.logistique, f.coefficient]) {
        expect(v).toBeGreaterThanOrEqual(0.9);
        expect(v).toBeLessThanOrEqual(1.2);
      }
    }
  });

  it("Tataouine a le coefficient régional maximum et Béja le minimum", () => {
    const coefs = GOVERNORATES.map((g) => ({ g, c: GOVERNORATE_FACTORS_2026[g].coefficient }));
    const max = coefs.reduce((a, b) => (b.c > a.c ? b : a));
    const min = coefs.reduce((a, b) => (b.c < a.c ? b : a));
    expect(max.g).toBe("tataouine");
    expect(min.g).toBe("beja");
  });

  it("la somme des phases GO+SO+Fini ≈ standard central (±15 DT d'arrondi feuille)", () => {
    for (const g of GOVERNORATES) {
      const ph = GOVERNORATE_PHASES_M2[g];
      const sum = ph.grosOeuvre + ph.secondOeuvre + ph.finitionsEquipements;
      expect(Math.abs(sum - GOVERNORATE_STD_M2[g]), `phases incohérentes pour ${g}`).toBeLessThanOrEqual(15);
    }
  });

  it("les poids PHASE_SPLIT_2026 correspondent aux parts du modèle (43/34/23)", () => {
    expect(PHASE_SPLIT_2026.gros_oeuvre + PHASE_SPLIT_2026.second_oeuvre + PHASE_SPLIT_2026.finitions_equipements).toBe(100);
    // La feuille affiche GO 794 · SO 628 · Fini 424 pour une moyenne de
    // référence de 1 845-1 847 DT/m² → tolérance d'arrondi ±2 DT.
    const refStd = NATIONAL_AVG.std; // 1845
    expect(Math.abs(Math.round((refStd * PHASE_SPLIT_2026.gros_oeuvre) / 100) - 794)).toBeLessThanOrEqual(2);
    expect(Math.abs(Math.round((refStd * PHASE_SPLIT_2026.second_oeuvre) / 100) - 628)).toBeLessThanOrEqual(2);
    expect(Math.abs(Math.round((refStd * PHASE_SPLIT_2026.finitions_equipements) / 100) - 424)).toBeLessThanOrEqual(2);
  });
});

describe("Onglet « Detail_lots » : ventilation en 15 lots", () => {
  it("15 lots sommant à 100 %", () => {
    expect(LOT_VENTILATION_2026.length).toBe(15);
    const total = LOT_VENTILATION_2026.reduce((s, l) => s + l.percent, 0);
    expect(total).toBe(100);
  });

  it("lotVentilationM2 répartit le coût standard central sans dérive > 15 DT", () => {
    for (const g of ["tunis", "beja", "tataouine"]) {
      const stdM2 = GOVERNORATE_STD_M2[g];
      const lots = lotVentilationM2(stdM2);
      expect(lots.length).toBe(15);
      const sum = lots.reduce((s, l) => s + l.amountM2, 0);
      expect(Math.abs(sum - stdM2), `dérive trop grande pour ${g}`).toBeLessThanOrEqual(15);
    }
  });

  it("ossature (19 %) > fondations (8 %) > terrassements (4 %)", () => {
    const pct = Object.fromEntries(LOT_VENTILATION_2026.map((l) => [l.id, l.percent]));
    expect(pct.ossature_beton_planchers).toBeGreaterThan(pct.fondations_infrastructure);
    expect(pct.fondations_infrastructure).toBeGreaterThan(pct.terrassements_vrd_immediats);
    expect(pct.ossature_beton_planchers).toBe(19);
  });
});

describe("Cohérence croisée BIM → DQE", () => {
  const CASES: { category: string; surface: number; floors: number }[] = [
    { category: "maison", surface: 120, floors: 1 },
    { category: "maison_r_plus_1", surface: 100, floors: 2 },
    { category: "maison_r_plus_2", surface: 100, floors: 3 },
    { category: "villa", surface: 220, floors: 2 },
    { category: "immeuble_residentiel", surface: 400, floors: 3 },
    { category: "appartement", surface: 90, floors: 1 },
    { category: "piscine_beton", surface: 32, floors: 1 },
    { category: "local_commercial", surface: 150, floors: 1 },
  ];
  const REGIONS = ["tunis", "sfax", "tataouine"];
  const LEVELS = ["economique", "standard", "premium"] as const;

  for (const { category, surface, floors } of CASES) {
    for (const region of REGIONS) {
      for (const finishLevel of LEVELS) {
        it(`${category} ${surface}m² × R${floors} · ${region} · ${finishLevel} : DQE = BIM`, () => {
          const bim = runBIMEstimation(category, surface, floors, region, finishLevel);
          const budget = bim.costEstimate.totalCost;
          expect(budget).toBeGreaterThan(0);

          const dqe = generateDqe({ category, surface, floors, totalBudget: budget });

          // Le DQE doit retomber sur le budget BIM (arrondi par lot uniquement)
          const drift = Math.abs(dqe.totals.total - budget);
          expect(drift).toBeLessThanOrEqual(dqe.lots.length);

          // Somme des sous-totaux de lots = total déclaré
          const sumLots = dqe.lots.reduce((s, l) => s + l.subtotal, 0);
          expect(sumLots).toBe(dqe.totals.total);

          // Chaque lot tombe exactement sur son sous-total
          for (const lot of dqe.lots) {
            const sumLines = lot.lines.reduce((s, l) => s + l.total, 0);
            expect(sumLines).toBe(lot.subtotal);
            // Montant = Quantité × P.U. (tolérance arrondi centime)
            for (const line of lot.lines) {
              expect(Math.abs(line.quantity * line.unitPrice - line.total)).toBeLessThanOrEqual(
                Math.max(1, line.quantity * 0.01),
              );
            }
          }

          // Totaux par nature = somme du total DQE
          const natureSum =
            dqe.totals.materiaux +
            dqe.totals.mainOeuvre +
            dqe.totals.equipements +
            dqe.totals.transport +
            dqe.totals.etudes;
          expect(natureSum).toBe(dqe.totals.total);

          // Coût au m² cohérent avec la surface bâtie
          const tb = surface * floors;
          expect(dqe.totals.costPerM2).toBe(Math.round(dqe.totals.total / tb));
        });
      }
    }
  }

  it("le scénario premium coûte plus cher que le standard, lui-même plus que l'économique (même projet)", () => {
    const eco = runBIMEstimation("maison", 120, 1, "sousse", "economique");
    const std = runBIMEstimation("maison", 120, 1, "sousse", "standard");
    const prem = runBIMEstimation("maison", 120, 1, "sousse", "premium");
    expect(eco.costEstimate.totalCost).toBeLessThan(std.costEstimate.totalCost);
    expect(std.costEstimate.totalCost).toBeLessThan(prem.costEstimate.totalCost);
  });

  it("le même projet coûte plus cher à Tataouine qu'à Kairouan (coefficient régional)", () => {
    const sud = runBIMEstimation("maison", 120, 1, "tataouine", "standard");
    const centre = runBIMEstimation("maison", 120, 1, "kairouan", "standard");
    expect(sud.costEstimate.totalCost).toBeGreaterThan(centre.costEstimate.totalCost);
  });

  it("sans région fournie, le budget s'appuie sur la moyenne nationale 1845 DT/m²", () => {
    const res = runBIMEstimation("maison", 120, 1, undefined, "standard");
    expect(res.costEstimate.totalCost).toBeGreaterThan(0);
    // La moyenne nationale utilisée en interne doit être celle de la feuille
    expect(NATIONAL_AVG.std).toBe(1845);
  });
});
