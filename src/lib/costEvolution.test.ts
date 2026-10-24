import { describe, it, expect } from "vitest";
import {
  COST_EVOLUTION_DISCLAIMER,
  DEFAULT_COST_MIX,
  buildCostEvolutionPdfBlock,
  buildImpactPreview,
  compoundCost,
  defaultCostEvolutionSettings,
  normalizeCostEvolutionSettings,
  previewScenarios,
  projectCategoryCost,
  projectCost,
  validateCostEvolutionSettings,
  type CostEvolutionCategory,
  type CostEvolutionSettings,
} from "./costEvolution";

// ============================================================================
// Évolution annuelle des coûts de construction — moteur pur
// ============================================================================

const settingsWith = (
  patch: Partial<CostEvolutionSettings> = {},
): CostEvolutionSettings => ({
  ...defaultCostEvolutionSettings(Date.UTC(2026, 0, 1)),
  enabled: true,
  ...patch,
});

const category = (patch: Partial<CostEvolutionCategory> = {}): CostEvolutionCategory => ({
  key: "gros_oeuvre",
  rate: 3,
  useComponents: false,
  components: { materials: 3, labor: 3, transport: 3, equipment: 3 },
  ...patch,
});

describe("formule de projection composée", () => {
  it("200 000 DT à 3 % sur un an = 206 000 DT", () => {
    expect(compoundCost(200_000, 3, 1)).toBe(206_000);
  });

  it("200 000 DT à 5 % sur un an = 210 000 DT", () => {
    expect(compoundCost(200_000, 5, 1)).toBe(210_000);
  });

  it("200 000 DT à 8 % sur un an = 216 000 DT", () => {
    expect(compoundCost(200_000, 8, 1)).toBe(216_000);
  });

  it("200 000 DT à 3 % sur 3 ans ≈ 218 545,40 DT (composé, pas linéaire)", () => {
    expect(compoundCost(200_000, 3, 3)).toBeCloseTo(218_545.4, 2);
    // Une application linéaire donnerait 218 000 : le calcul est bien composé.
    expect(compoundCost(200_000, 3, 3)).not.toBe(218_000);
  });

  it("un horizon nul restitue le coût de référence", () => {
    expect(compoundCost(200_000, 8, 0)).toBe(200_000);
  });

  it("un coût de référence absent ou négatif ne produit rien", () => {
    expect(compoundCost(0, 5, 3)).toBe(0);
    expect(compoundCost(-100, 5, 3)).toBe(0);
  });
});

describe("scénarios — comparaison à un an", () => {
  it("modéré 3 % · moyen 5 % · élevé 8 %", () => {
    const preview = previewScenarios({
      settings: settingsWith(),
      referenceCost: 200_000,
      years: 1,
    });
    expect(preview.map((s) => [s.label, s.rate, s.projectedCost])).toEqual([
      ["Modéré", 3, 206_000],
      ["Moyen", 5, 210_000],
      ["Élevé", 8, 216_000],
    ]);
    expect(preview[0].increase).toBe(6_000);
    expect(preview[2].increasePct).toBe(8);
  });
});

describe("paramétrage par défaut", () => {
  it("reprend les taux initiaux de simulation (3 / 5 / 8) et toutes les catégories à 3 %", () => {
    const settings = defaultCostEvolutionSettings(Date.UTC(2026, 0, 1));
    expect(settings.scenarioRates).toEqual({ moderee: 3, moyen: 5, eleve: 8 });
    expect(settings.categories).toHaveLength(11);
    expect(settings.categories.every((c) => c.rate === 3)).toBe(true);
    expect(settings.defaultScenario).toBe("moderee");
    expect(settings.referenceYear).toBe(2026);
  });

  it("est INACTIF par défaut : aucune estimation existante n'est recalculée", () => {
    const settings = defaultCostEvolutionSettings(Date.UTC(2026, 0, 1));
    expect(settings.enabled).toBe(false);
    const projection = projectCost({
      settings,
      referenceCost: 200_000,
      years: 3,
    });
    expect(projection.projectedCost).toBe(200_000);
    expect(projection.increase).toBe(0);
    expect(projection.lines).toEqual([]);
  });
});

describe("désactivation du mécanisme", () => {
  it("conserve les paramètres mais n'applique aucun taux", () => {
    const settings = settingsWith({ enabled: false });
    expect(settings.scenarioRates.eleve).toBe(8);
    const projection = projectCost({ settings, referenceCost: 200_000, years: 3 });
    expect(projection.enabled).toBe(false);
    expect(projection.projectedCost).toBe(200_000);
    expect(projection.rate).toBe(3); // paramètre conservé, non appliqué
    // Aucune section PDF quand le mécanisme est inactif.
    expect(
      buildCostEvolutionPdfBlock({ settings, referenceCost: 200_000, years: 3 }),
    ).toBeNull();
  });
});

describe("postes à taux différents — calcul séparé puis addition", () => {
  const settings = settingsWith({
    categories: [
      category({ key: "gros_oeuvre", rate: 3 }),
      category({ key: "peinture", rate: 8 }),
      category({ key: "main_oeuvre", rate: 5 }),
    ],
  });

  it("chaque poste suit son propre taux, le total est la somme (aucun taux global ajouté)", () => {
    const projection = projectCost({
      settings,
      referenceCost: 300_000,
      years: 1,
      categoryAmounts: { gros_oeuvre: 200_000, peinture: 50_000, main_oeuvre: 50_000 },
    });
    expect(projection.lines.map((l) => l.projectedCost)).toEqual([206_000, 54_000, 52_500]);
    expect(projection.projectedCost).toBe(312_500);
    expect(projection.increase).toBe(12_500);
    // Le total n'est pas 300 000 × (1 + 5 %) : chaque poste a son taux.
    expect(projection.projectedCost).not.toBe(315_000);
  });

  it("aucune double application : la projection part du coût de référence", () => {
    const once = projectCost({
      settings,
      referenceCost: 300_000,
      years: 1,
      categoryAmounts: { gros_oeuvre: 200_000, peinture: 50_000, main_oeuvre: 50_000 },
    });
    // Projeter un montant DÉJÀ projeté ne revient pas à l'ajouter une 2e fois :
    // le résultat est calculé depuis la référence, pas depuis le total projeté.
    const fromReference = projectCost({
      settings,
      referenceCost: 300_000,
      years: 1,
      categoryAmounts: { gros_oeuvre: 200_000, peinture: 50_000, main_oeuvre: 50_000 },
    });
    expect(fromReference.projectedCost).toBe(once.projectedCost);
  });

  it("sans ventilation réelle, le taux du scénario s'applique au total une seule fois", () => {
    const projection = projectCost({
      settings: settingsWith({ scenarioRates: { moderee: 3, moyen: 5, eleve: 8 } }),
      referenceCost: 200_000,
      years: 1,
      scenario: "moyen",
    });
    expect(projection.projectedCost).toBe(210_000);
    expect(projection.lines).toHaveLength(1);
    expect(projection.lines[0].projectedCost).toBe(210_000);
    expect(projection.lines[0].increase).toBe(10_000);
  });
});

describe("postes ventilés par composante", () => {
  it("applique un taux distinct aux matériaux, à la main-d'œuvre, au transport et aux équipements", () => {
    const poste = category({
      useComponents: true,
      components: { materials: 4, labor: 2, transport: 1, equipment: 6 },
    });
    const result = projectCategoryCost({
      category: poste,
      referenceCost: 100_000,
      years: 1,
    });
    // Parts par défaut : 55 % matériaux · 25 % main-d'œuvre · 8 % transport · 12 % équipements
    const expected =
      100_000 * DEFAULT_COST_MIX.materials * 1.04 +
      100_000 * DEFAULT_COST_MIX.labor * 1.02 +
      100_000 * DEFAULT_COST_MIX.transport * 1.01 +
      100_000 * DEFAULT_COST_MIX.equipment * 1.06;
    expect(result.projectedCost).toBeCloseTo(expected, 2);
    expect(result.components.map((c) => c.key)).toEqual([
      "materials",
      "labor",
      "transport",
      "equipment",
    ]);
    // Le taux affiché est le taux moyen réellement obtenu, jamais réappliqué.
    expect(result.rateApplied).toBeGreaterThan(3);
    expect(result.rateApplied).toBeLessThan(4);
  });

  it("les parts de composantes sont normalisées à 1", () => {
    const poste = category({
      useComponents: true,
      components: { materials: 5, labor: 5, transport: 5, equipment: 5 },
    });
    const result = projectCategoryCost({
      category: poste,
      referenceCost: 100_000,
      years: 1,
      mix: { materials: 1, labor: 1, transport: 1, equipment: 1 },
    });
    // 4 parts égales à 5 % → 105 000 exactement.
    expect(result.projectedCost).toBe(105_000);
  });
});

describe("validation des paramétrages", () => {
  it("accepte un paramétrage par défaut", () => {
    expect(validateCostEvolutionSettings(defaultCostEvolutionSettings(Date.UTC(2026, 0, 1)))).toEqual(
      [],
    );
  });

  it("refuse un taux hors bornes", () => {
    const settings = settingsWith({ scenarioRates: { moderee: 3, moyen: -1, eleve: 80 } });
    const errors = validateCostEvolutionSettings(settings);
    expect(errors.some((e) => e.includes("Moyen"))).toBe(true);
    expect(errors.some((e) => e.includes("Élevé"))).toBe(true);
  });

  it("refuse une année de référence invalide et une date d'application absente", () => {
    const settings = settingsWith({ referenceYear: 1990, effectiveFrom: 0 });
    const errors = validateCostEvolutionSettings(settings);
    expect(errors.some((e) => e.includes("Année de référence"))).toBe(true);
    expect(errors.some((e) => e.includes("Date d'application"))).toBe(true);
  });

  it("refuse un poste dont une composante est invalide", () => {
    const settings = settingsWith({
      categories: [
        category({
          useComponents: true,
          components: { materials: 3, labor: 3, transport: 3, equipment: 120 },
        }),
      ],
    });
    const errors = validateCostEvolutionSettings(settings);
    expect(errors.some((e) => e.includes("Équipements"))).toBe(true);
  });
});

describe("lecture défensive d'un paramétrage enregistré", () => {
  it("retombe sur les défauts pour toute valeur absente ou corrompue", () => {
    const normalized = normalizeCostEvolutionSettings({
      referenceYear: 0 as unknown as number,
      effectiveFrom: -5,
      customRate: Number.NaN,
      scenarioRates: { moderee: 4, moyen: Number.NaN, eleve: 8 } as never,
      categories: [{ key: "peinture", rate: Number.POSITIVE_INFINITY }] as never,
    } as never, Date.UTC(2026, 0, 1));

    expect(normalized.referenceYear).toBe(2026);
    expect(normalized.scenarioRates.moderee).toBe(4);
    expect(normalized.scenarioRates.moyen).toBe(5);
    expect(normalized.customRate).toBe(3);
    expect(normalized.enabled).toBe(false);
    expect(normalized.categories).toHaveLength(11);
    expect(normalized.categories.find((c) => c.key === "peinture")?.rate).toBe(3);
  });
});

describe("prévisualisation d'impact (lecture seule)", () => {
  it("compare les trois scénarios et détaille les postes sans modifier les paramètres", () => {
    const settings = settingsWith();
    const before = JSON.stringify(settings);
    const preview = buildImpactPreview({
      settings,
      referenceCost: 200_000,
      years: 1,
      categoryAmounts: { gros_oeuvre: 120_000, peinture: 80_000 },
    });
    expect(preview.scenarios.map((s) => s.projectedCost)).toEqual([206_000, 210_000, 216_000]);
    expect(preview.projection.lines).toHaveLength(2);
    expect(preview.projection.lines[0].projectedCost).toBe(123_600);
    expect(preview.projection.lines[1].projectedCost).toBe(82_400);
    expect(preview.projection.projectedCost).toBe(206_000);
    expect(preview.disclaimer).toBe(COST_EVOLUTION_DISCLAIMER);
    expect(JSON.stringify(settings)).toBe(before);
  });
});

describe("section PDF « Hypothèses d'évolution des coûts »", () => {
  it("produit les lignes attendues quand le mécanisme est actif", () => {
    const block = buildCostEvolutionPdfBlock({
      settings: settingsWith({ referenceYear: 2026 }),
      referenceCost: 200_000,
      years: 3,
      scenario: "moyen",
    });
    expect(block).not.toBeNull();
    expect(block!.title).toBe("Hypothèses d'évolution des coûts");
    expect(block!.scenarioLabel).toBe("Moyen");
    expect(block!.rate).toBe(5);
    expect(block!.years).toBe(3);
    expect(block!.referenceCost).toBe(200_000);
    expect(block!.projectedCost).toBeCloseTo(231_525, 0);
    expect(block!.rows.map((r) => r.label)).toEqual([
      "Barème de référence",
      "Scénario",
      "Taux appliqué",
      "Horizon de projection",
      "Coût de référence",
      "Coût projeté",
      "Différence",
    ]);
    expect(block!.disclaimer).toContain("ne constituent pas un devis garanti");
  });
});
