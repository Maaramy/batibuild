// ============================================================================
// IMPACT RÉGIONAL & COMPARATIF RÉGIONAL — validation sur les QUATRE scénarios
// ----------------------------------------------------------------------------
// Un même projet (même surface couverte, mêmes quantités du quantitatif) est
// testé en Économique · Standard · Premium · Personnalisé. On vérifie que :
//
//   1. l'impact régional change dès que le scénario change les prix (et les
//      quantités pour le scénario Personnalisé) ;
//   2. le comparatif régional est recalculé immédiatement (aucune valeur mise en
//      cache : la fonction est pure, deux appels identiques donnent le même
//      résultat et un changement de scénario un résultat différent) ;
//   3. le scénario Personnalisé tient compte des modifications du DQE ;
//   4. les résultats restent cohérents entre le BIM, le DQE et l'estimation
//      globale (la région active retombe EXACTEMENT sur le total affiché) ;
//   5. aucun coefficient régional n'est appliqué deux fois ;
//   6. un changement de scénario ne modifie pas les résultats si les prix et
//      les quantités sont identiques.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  GOVERNORATE_FACTORS_2026,
  GOVERNORATE_LABELS,
  NATIONAL_AVG,
  REGION_COST_M2,
  projectPriceRatio,
  runBIMEstimation,
} from "../convex/bimEngine";
import { generateDqe } from "../convex/dqeEngine";
import {
  budgetScenarioFactor,
  computeQuantitatifTotals,
  overlayCustomizations,
  scaleDqeLots,
  type BudgetScenarioKey,
  type QuantitatifCustomizationEntry,
} from "../convex/quantitatifCustomLogic";
import { realBuiltArea } from "./buildingLevels";
import {
  REFERENCE_REGION,
  checkRegionImpact,
  computeRegionImpact,
  gridPriceM2,
  nationalAvgPriceM2,
  type RegionImpact,
} from "./regionImpact";

// ── Projet de référence : IDENTIQUE dans les quatre scénarios ────────────────
const CATEGORY = "maison";
const SURFACE = 120;
const FLOORS = 2;
const REGION = "tunis";
const BUILT_SURFACE = realBuiltArea(SURFACE, FLOORS);

const eco = runBIMEstimation(CATEGORY, SURFACE, FLOORS, REGION, "economique");
const standard = runBIMEstimation(CATEGORY, SURFACE, FLOORS, REGION, "standard");
const premium = runBIMEstimation(CATEGORY, SURFACE, FLOORS, REGION, "premium");
const scenarios = standard.costEstimate.budgetScenarios;
const dqe = generateDqe({
  category: CATEGORY,
  surface: SURFACE,
  floors: FLOORS,
  totalBudget: standard.costEstimate.totalCost,
});

/** Le quantitatif du projet au niveau du scénario de référence, sans modification. */
function quantitatifFor(baseScenarioKey: BudgetScenarioKey) {
  const baseFactor = budgetScenarioFactor(scenarios, baseScenarioKey);
  const lots = scaleDqeLots(dqe.lots as any[], baseFactor);
  return { baseFactor, lots, totals: computeQuantitatifTotals(lots, BUILT_SURFACE) };
}

/**
 * Scénario « Personnalisé » : quantitatif du scénario de référence, puis
 * superposition d'une modification d'article — exactement le même pipeline que
 * la page de résultat (`scaleDqeLots` → `overlayCustomizations` →
 * `computeQuantitatifTotals`).
 */
function personalizedScenario(opts: {
  baseScenarioKey: BudgetScenarioKey;
  priceMultiplier?: number;
}) {
  const { baseFactor, lots: scaled } = quantitatifFor(opts.baseScenarioKey);
  const lot = scaled.find((l: any) => l.id === "gros_oeuvre") ?? scaled[0];
  const line = lot.lines[0];

  const withoutModification = computeQuantitatifTotals(scaled, BUILT_SURFACE);
  if (!opts.priceMultiplier) {
    return { lots: scaled, totals: withoutModification, modifiedCount: 0, line };
  }

  // Le prix unitaire d'une personnalisation est exprimé au niveau de référence
  // « Standard » du moteur : on repart donc du prix affiché du scénario, ramené
  // au niveau de référence, puis on applique la modification.
  const entry: QuantitatifCustomizationEntry = {
    lineKey: `${lot.id}:0`,
    lotId: lot.id,
    lotName: lot.name,
    lineIndex: 0,
    baseDesignation: line.designation,
    designation: line.designation,
    unit: line.unit,
    quantity: line.quantity,
    unitPrice: (line.unitPrice / baseFactor) * opts.priceMultiplier,
    nature: line.nature,
    priceScenario: opts.baseScenarioKey,
    replacedArticle: false,
    updatedAt: Date.now(),
  };
  const overlay = overlayCustomizations(scaled, [entry], {
    scaleFactor: baseFactor,
    realCostFactor: 1,
  });
  return {
    lots: overlay.lots,
    totals: computeQuantitatifTotals(overlay.lots, BUILT_SURFACE),
    modifiedCount: overlay.modifiedCount,
    line,
  };
}

/** Impact régional d'un scénario, exactement comme la page de résultat. */
function impactOf(activeTotal: number, scenario: string, scenarioLabel?: string): RegionImpact {
  const impact = computeRegionImpact({
    region: REGION,
    scenario,
    scenarioLabel,
    gridPrices: REGION_COST_M2,
    labels: GOVERNORATE_LABELS,
    referenceRegion: REFERENCE_REGION,
    nationalAvg: NATIONAL_AVG,
    activeTotal,
    realBuiltArea: BUILT_SURFACE,
    equivalentArea: standard.costEstimate.levelBreakdown?.equivalentArea,
  });
  expect(impact, `impact régional attendu pour ${scenario}`).toBeDefined();
  return impact!;
}

// ── Les quatre scénarios, même projet, même surface ──────────────────────────
const personalizedNoMod = personalizedScenario({ baseScenarioKey: "standard" });
const personalizedModified = personalizedScenario({
  baseScenarioKey: "standard",
  priceMultiplier: 1.2,
});

// ── Totaux RÉELS affichés (identiques à `simulateAnalysis`) ──────────────────
// Le lot « Second œuvre et finitions » est facturé à la somme réelle de ses
// postes : le standard vaut le total du DQE, les deux autres scénarios suivent
// le même rapport que la grille.
const scenarioRatio =
  standard.costEstimate.totalCost > 0
    ? dqe.totals.total / standard.costEstimate.totalCost
    : 1;
const alignTotal = (n: number) => Math.round(n * scenarioRatio);

const SCENARIOS = {
  economique: {
    total: alignTotal(eco.costEstimate.totalCost),
    impact: impactOf(alignTotal(eco.costEstimate.totalCost), "economique"),
    label: "Économique",
  },
  standard: {
    total: dqe.totals.total,
    impact: impactOf(dqe.totals.total, "standard"),
    label: "Standard",
  },
  premium: {
    total: alignTotal(premium.costEstimate.totalCost),
    impact: impactOf(alignTotal(premium.costEstimate.totalCost), "premium"),
    label: "Premium",
  },
  personnalise: {
    total: personalizedModified.totals.total,
    impact: impactOf(
      personalizedModified.totals.total,
      "standard",
      "Personnalisé · base Standard",
    ),
    label: "Personnalisé",
  },
} as const;

const SCENARIO_KEYS = ["economique", "standard", "premium", "personnalise"] as const;

describe("1 · l'impact régional change avec le scénario (mêmes quantités, autres prix)", () => {
  it("les quatre scénarios donnent quatre coûts totaux distincts, dans l'ordre attendu", () => {
    expect(new Set(SCENARIO_KEYS.map((k) => SCENARIOS[k].total)).size).toBe(4);
    expect(SCENARIOS.economique.total).toBeLessThan(SCENARIOS.standard.total);
    expect(SCENARIOS.standard.total).toBeLessThan(SCENARIOS.premium.total);
    // Personnalisé (base Standard + un prix unitaire majoré de 20 %) > Standard
    expect(SCENARIOS.personnalise.total).toBeGreaterThan(SCENARIOS.standard.total);
  });

  it("le prix au m² régional de l'impact suit le niveau du scénario", () => {
    const grille = REGION_COST_M2[REGION];
    expect(SCENARIOS.economique.impact.priceM2).toBe(grille.eco);
    expect(SCENARIOS.standard.impact.priceM2).toBe(grille.std);
    expect(SCENARIOS.premium.impact.priceM2).toBe(grille.premium);
    // Le scénario Personnalisé part du niveau de son scénario de référence.
    expect(SCENARIOS.personnalise.impact.priceM2).toBe(grille.std);
  });

  it("les écarts régionaux en dinars changent avec le scénario", () => {
    const ecarts = SCENARIO_KEYS.map((k) => SCENARIOS[k].impact.difference);
    expect(new Set(ecarts).size).toBe(4);
    // Écart = total actif − total à la région de référence : il suit le total.
    for (const key of SCENARIO_KEYS) {
      const { impact, total } = SCENARIOS[key];
      expect(impact.total).toBe(total);
      expect(impact.difference).toBe(total - impact.totalReference);
      expect(impact.totalReference).toBeGreaterThan(0);
    }
    expect(SCENARIOS.economique.impact.totalReference).toBeLessThan(
      SCENARIOS.premium.impact.totalReference,
    );
  });

  it("le comparatif régional reste le même projet, avec les mêmes quantités", () => {
    for (const key of SCENARIO_KEYS) {
      const { impact } = SCENARIOS[key];
      expect(impact.regions.length).toBe(Object.keys(REGION_COST_M2).length);
      expect(impact.realBuiltArea).toBe(BUILT_SURFACE);
      expect(impact.equivalentArea).toBe(
        standard.costEstimate.levelBreakdown?.equivalentArea,
      );
      expect(checkRegionImpact(impact)).toEqual([]);
    }
  });
});

describe("2 · le comparatif régional est recalculé immédiatement", () => {
  it("le comparatif est dérivé du scénario passé : aucun résultat mis en cache", () => {
    const base = {
      region: REGION,
      gridPrices: REGION_COST_M2,
      labels: GOVERNORATE_LABELS,
      referenceRegion: REFERENCE_REGION,
      nationalAvg: NATIONAL_AVG,
      realBuiltArea: BUILT_SURFACE,
    };
    const asEconomique = computeRegionImpact({ ...base, scenario: "economique", activeTotal: 200_000 })!;
    const asPremium = computeRegionImpact({ ...base, scenario: "premium", activeTotal: 200_000 })!;

    // Même projet, même total de départ : le comparatif suit le NIVEAU du
    // scénario (prix de la grille) et non un résultat mis en cache.
    expect(asEconomique.priceM2).toBe(REGION_COST_M2[REGION].eco);
    expect(asPremium.priceM2).toBe(REGION_COST_M2[REGION].premium);
    expect(asEconomique.scenario).toBe("economique");
    expect(asPremium.scenario).toBe("premium");
    // Le comparatif est calculé sur le total du scénario passé, pas sur l'autre.
    expect(asEconomique.regions.find((r) => r.isActive)!.totalCost).toBe(asEconomique.total);
    expect(asPremium.regions.find((r) => r.isActive)!.totalCost).toBe(asPremium.total);
    const ecoSud = asEconomique.regions.find((r) => r.region === "tataouine")!;
    const premiumSud = asPremium.regions.find((r) => r.region === "tataouine")!;
    expect(premiumSud.priceM2).toBeGreaterThan(ecoSud.priceM2);

    // Deux appels identiques renvoient exactement le même comparatif (aucun état).
    const again = computeRegionImpact({ ...base, scenario: "premium", activeTotal: 200_000 })!;
    expect(again).toStrictEqual(asPremium);
  });

  it("chaque région affiche total TTC, coût/m², écart en dinars, écart en % et coefficient", () => {
    for (const key of SCENARIO_KEYS) {
      for (const row of SCENARIOS[key].impact.regions) {
        expect(row.totalCost).toBeGreaterThan(0);
        expect(row.priceM2).toBeGreaterThan(0);
        expect(Number.isFinite(row.costPerM2)).toBe(true);
        expect(Number.isFinite(row.deltaAmount)).toBe(true);
        expect(Number.isFinite(row.deltaPct)).toBe(true);
        expect(row.factor).toBeGreaterThan(0);
        // Coût au m² = total / surface réellement construite.
        expect(row.costPerM2).toBe(Math.round(row.totalCost / BUILT_SURFACE));
        // Écart en dinars par rapport à la région de référence.
        const ref = SCENARIOS[key].impact.regions.find((r) => r.isReference)!;
        expect(row.deltaAmount).toBe(row.totalCost - ref.totalCost);
        expect(row.deltaPct).toBe(Math.round((row.factor - 1) * 1000) / 10);
        // Multiplicateur réellement appliqué au total affiché (1 = région active).
        expect(row.appliedFactor).toBeCloseTo(row.priceM2 / SCENARIOS[key].impact.priceM2, 4);
      }
    }
  });
});

describe("3 · le scénario Personnalisé tient compte des modifications du DQE", () => {
  it("une modification d'article du quantitatif remonte dans le total ET dans l'impact régional", () => {
    expect(personalizedModified.modifiedCount).toBeGreaterThan(0);
    expect(personalizedModified.totals.total).toBeGreaterThan(
      personalizedNoMod.totals.total,
    );

    const impactSansMod = impactOf(
      personalizedNoMod.totals.total,
      "standard",
      "Personnalisé · base Standard",
    );
    const impactAvecMod = SCENARIOS.personnalise.impact;

    expect(impactAvecMod.total).toBe(personalizedModified.totals.total);
    expect(impactAvecMod.total).toBeGreaterThan(impactSansMod.total);
    expect(impactAvecMod.difference).toBeGreaterThan(impactSansMod.difference);
    // Le comparatif reste proportionnel au nouveau total : seule la région
    // change d'une ligne à l'autre.
    const active = impactAvecMod.regions.find((r) => r.isActive)!;
    expect(active.totalCost).toBe(personalizedModified.totals.total);
  });

  it("modifier le DQE du scénario Personnalisé ne touche PAS les autres scénarios", () => {
    const standardBefore = impactOf(standard.costEstimate.totalCost, "standard");
    personalizedScenario({ baseScenarioKey: "standard", priceMultiplier: 1.75 });
    const standardAfter = impactOf(standard.costEstimate.totalCost, "standard");
    expect(standardAfter).toStrictEqual(standardBefore);
  });

  it("le scénario Personnalisé garde le niveau de prix de son scénario de référence", () => {
    for (const base of ["economique", "standard", "premium"] as const) {
      const person = personalizedScenario({ baseScenarioKey: base, priceMultiplier: 1.2 });
      const impact = impactOf(person.totals.total, base, `Personnalisé · base ${base}`);
      expect(impact.scenario).toBe(base);
      expect(impact.priceM2).toBe(REGION_COST_M2[REGION][base === "economique" ? "eco" : base === "premium" ? "premium" : "std"]);
      expect(impact.scenarioLabel).toContain("Personnalisé");
    }
  });
});

describe("4 · cohérence BIM ↔ DQE ↔ estimation globale", () => {
  it("la région active retombe EXACTEMENT sur le total affiché, dans les quatre scénarios", () => {
    for (const key of SCENARIO_KEYS) {
      const { impact } = SCENARIOS[key];
      const active = impact.regions.find((r) => r.isActive)!;
      expect(active.totalCost).toBe(impact.total);
      expect(impact.coherent).toBe(true);
      expect(checkRegionImpact(impact)).toEqual([]);
    }
  });

  it("le quantitatif du projet tombe sur le total du scénario (source du Personnalisé)", () => {
    // Le standard affiché EST le total réel du quantitatif (Second œuvre au réel).
    expect(SCENARIOS.standard.total).toBe(dqe.totals.total);
    expect(personalizedNoMod.totals.total).toBe(dqe.totals.total);
  });

  it("l'impact régional calculé par le moteur BIM est celui du scénario du projet", () => {
    for (const [key, res] of [
      ["economique", eco],
      ["standard", standard],
      ["premium", premium],
    ] as const) {
      const impact = res.regionImpact!;
      expect(impact).toBeDefined();
      expect(impact.scenario).toBe(key);
      expect(impact.total).toBe(res.costEstimate.budgetScenarios[key].totalCost);
      expect(impact.regions.find((r) => r.isActive)!.totalCost).toBe(
        res.costEstimate.budgetScenarios[key].totalCost,
      );
      expect(impact.realBuiltArea).toBe(BUILT_SURFACE);
      expect(checkRegionImpact(impact)).toEqual([]);
    }
  });

  it("le coût au m² de la région active correspond au coût réellement affiché", () => {
    for (const [key, res] of [
      ["economique", eco],
      ["standard", standard],
      ["premium", premium],
    ] as const) {
      const impact = res.regionImpact!;
      const active = impact.regions.find((r) => r.isActive)!;
      const total = res.costEstimate.budgetScenarios[key].totalCost;
      // Coût au m² du résultat affiché (détail multi-niveaux) et coût au m² de
      // la ligne régionale : même surface construite, donc même montant.
      expect(active.costPerM2).toBe(Math.round(total / BUILT_SURFACE));
      expect(res.costEstimate.costPerSquareMeter).toBe(active.costPerM2);
    }
  });
});

describe("5 · aucun coefficient régional appliqué deux fois", () => {
  it("le coefficient de la région de référence vaut exactement 1", () => {
    for (const key of SCENARIO_KEYS) {
      const reference = SCENARIOS[key].impact.regions.find((r) => r.isReference)!;
      expect(reference.region).toBe(REFERENCE_REGION);
      expect(reference.factor).toBe(1);
      expect(reference.deltaAmount).toBe(0);
      expect(reference.deltaPct).toBe(0);
      expect(reference.totalCost).toBe(SCENARIOS[key].impact.totalReference);
    }
  });

  it("le rapport des totaux entre deux régions vaut la grille, appliquée UNE seule fois", () => {
    for (const key of SCENARIO_KEYS) {
      const { impact } = SCENARIOS[key];
      for (const row of impact.regions) {
        const grille = row.appliedFactor; // prix région / prix région active
        expect(row.totalCost / impact.total).toBeCloseTo(grille, 4);
        // Le coefficient de la région, base Médenine, est le même appliqué une fois.
        expect(row.factor / impact.factor).toBeCloseTo(grille, 6);
        // Une double application porterait le ratio au carré.
        if (Math.abs(grille - 1) > 0.02) {
          expect(Math.abs(row.totalCost / impact.total - grille * grille)).toBeGreaterThan(0.002);
        }
      }
    }
  });

  it("les facteurs composites de la feuille (matériaux / main-d'œuvre / logistique) ne sont PAS remultipliés", () => {
    const impact = SCENARIOS.standard.impact;
    const grilleTunis = gridPriceM2(REGION_COST_M2, REGION, "standard");
    const grilleReference = gridPriceM2(REGION_COST_M2, REFERENCE_REGION, "standard");
    const coefficientDocumente = GOVERNORATE_FACTORS_2026[REGION].coefficient;
    expect(impact.factor).toBeCloseTo(grilleTunis / grilleReference, 6);
    expect(impact.factor).not.toBeCloseTo((grilleTunis / grilleReference) * coefficientDocumente, 3);
  });

  it("la référence nationale du scénario est une moyenne des 24 gouvernorats, appliquée une fois", () => {
    for (const key of SCENARIO_KEYS) {
      const { impact } = SCENARIOS[key];
      const niveau =
        impact.scenario === "economique" ? "eco" : impact.scenario === "premium" ? "premium" : "std";
      expect(impact.nationalAvgPriceM2).toBe(NATIONAL_AVG[niveau]);
      expect(impact.totalNationalAvg).toBe(
        Math.round((impact.total * impact.nationalAvgPriceM2) / impact.priceM2),
      );
      // Le prix moyen national reste dans la fourchette des 24 régions.
      const prix = impact.regions.map((r) => r.priceM2);
      expect(impact.nationalAvgPriceM2).toBeGreaterThanOrEqual(Math.min(...prix) - 40);
      expect(impact.nationalAvgPriceM2).toBeLessThanOrEqual(Math.max(...prix) + 40);
    }
  });

  it("le prix moyen national projeté garde le ratio du type de projet", () => {
    const ratio = projectPriceRatio(CATEGORY);
    expect(ratio).toBeCloseTo(
      (standard.costEstimate.budgetScenarios.standard.costPerM2 ?? 0) /
        gridPriceM2(REGION_COST_M2, REGION, "standard"),
      2,
    );
    for (const key of SCENARIO_KEYS) {
      const { impact } = SCENARIOS[key];
      expect(impact.priceM2).toBe(gridPriceM2(REGION_COST_M2, REGION, impact.scenario));
      expect(nationalAvgPriceM2(NATIONAL_AVG, impact.scenario)).toBe(
        impact.nationalAvgPriceM2,
      );
    }
  });
});

describe("6 · prix et quantités identiques → résultats identiques", () => {
  it("un scénario Personnalisé sans modification donne exactement les résultats du scénario de référence", () => {
    const referenceImpact = impactOf(
      personalizedNoMod.totals.total,
      "standard",
      "Personnalisé · base Standard",
    );
    expect(referenceImpact.total).toBe(SCENARIOS.standard.impact.total);
    expect(referenceImpact.totalReference).toBe(SCENARIOS.standard.impact.totalReference);
    expect(referenceImpact.difference).toBe(SCENARIOS.standard.impact.difference);
    expect(referenceImpact.differencePct).toBe(SCENARIOS.standard.impact.differencePct);
    expect(referenceImpact.regions.map((r) => r.totalCost)).toEqual(
      SCENARIOS.standard.impact.regions.map((r) => r.totalCost),
    );
  });

  it("aucune variation artificielle : mêmes entrées, mêmes sorties (quatre fois de suite)", () => {
    const outputs = Array.from({ length: 4 }, () =>
      impactOf(SCENARIOS.premium.total, "premium"),
    );
    for (const out of outputs) expect(out).toStrictEqual(outputs[0]);
  });

  it("sans région ou sans total, aucun impact n'est inventé", () => {
    const base = {
      scenario: "standard" as const,
      gridPrices: REGION_COST_M2,
      labels: GOVERNORATE_LABELS,
      referenceRegion: REFERENCE_REGION,
      realBuiltArea: BUILT_SURFACE,
    };
    expect(computeRegionImpact({ ...base, region: undefined, activeTotal: 100_000 })).toBeUndefined();
    expect(computeRegionImpact({ ...base, region: REGION, activeTotal: 0 })).toBeUndefined();
    expect(computeRegionImpact({ ...base, region: "region_inconnue", activeTotal: 100_000 })).toBeUndefined();
    // La région de référence seule ne produit pas de comparatif (aucun écart nul
    // présenté comme un impact régional).
    expect(
      computeRegionImpact({ ...base, region: REFERENCE_REGION, activeTotal: 100_000 }),
    ).toBeUndefined();
  });
});
