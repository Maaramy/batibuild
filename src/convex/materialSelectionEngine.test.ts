/// <reference types="vite/client" />

import { describe, it, expect } from "vitest";
import { generateDqe } from "./dqeEngine.js";
import {
  acceptAllRecommendations,
  affectedArticles,
  buildMaterialWorkspace,
  buildScenarioContexts,
  buildScenarioMaterialLines,
  catalogReferenceFor,
  materialLinesFromLots,
  materialsOnly,
  materialsTotal,
  packageRuleFor,
  packagingForLine,
  predictiveRecommendations,
  projectMaterialsStatus,
  quantitativeVersion,
  quantitatifForScenario,
  recalculateSelection,
  resolveActiveScenario,
  scorePriceQuality,
  selectVariant,
  selectionLineState,
  selectionMaterialsTotal,
  selectionScore,
  validateSelection,
  variantsForLine,
  isStale,
  priceVersion,
  type MaterialLine,
  type MaterialSelectionEntry,
} from "./materialSelectionEngine.js";

// ============================================================================
// Helpers
// ============================================================================

const SCENARIOS = {
  economique: { label: "Économique", totalCost: 80_000, costPerM2: 800, multiplier: 0.8 },
  standard: { label: "Standard", totalCost: 100_000, costPerM2: 1_000, multiplier: 1 },
  premium: { label: "Premium", totalCost: 125_000, costPerM2: 1_250, multiplier: 1.25 },
};

const COST = { budgetScenarios: SCENARIOS, totalCost: 100_000, costPerSquareMeter: 1_000 };

function villaDqe() {
  return generateDqe({ category: "villa", surface: 150, floors: 2, totalBudget: 100_000 }).lots;
}

function syntheticLots() {
  return [
    {
      id: "gros_oeuvre",
      name: "Gros œuvre",
      lines: [
        {
          designation: "Ciment CPJ 42.5",
          unit: "sacs",
          quantity: 120,
          unitPrice: 16.5,
          nature: "materiaux",
          sousLot: "Fondations",
        },
        {
          designation: "Main d'œuvre maçonnerie",
          unit: "h",
          quantity: 40,
          unitPrice: 12,
          nature: "main_oeuvre",
        },
        {
          designation: "Article sans prix",
          unit: "u",
          quantity: 0,
          unitPrice: 0,
          nature: "materiaux",
        },
      ],
    },
  ] as any[];
}

// ============================================================================
// §1–§3 — Source unique : Quantitatif détaillé
// ============================================================================

describe("materialLinesFromLots — fidélité au Quantitatif détaillé", () => {
  it("reprend la désignation, l'unité et la quantité EXACTES du Quantitatif", () => {
    const lines = materialLinesFromLots(syntheticLots(), "standard");
    const cement = lines.find((l) => l.designation === "Ciment CPJ 42.5")!;
    expect(cement).toBeTruthy();
    expect(cement.designation).toBe("Ciment CPJ 42.5");
    expect(cement.unit).toBe("sacs");
    expect(cement.quantity).toBe(120);
    expect(cement.articleId).toBe("gros_oeuvre::0");
    expect(cement.source).toBe("quantitatif_detaille");
    expect(cement.lotName).toBe("Gros œuvre");
  });

  it("calcule total = quantité × prix unitaire", () => {
    const lines = materialLinesFromLots(syntheticLots(), "standard");
    for (const l of lines) {
      expect(l.total).toBeCloseTo(l.quantity * l.unitPrice, 6);
    }
  });

  it("ne considère comme matériaux que la nature « materiaux »", () => {
    const lines = materialLinesFromLots(syntheticLots(), "standard");
    const mats = materialsOnly(lines);
    expect(mats).toHaveLength(2);
    expect(mats.some((l) => l.designation === "Main d'œuvre maçonnerie")).toBe(false);
  });

  it("détecte l'absence de prix sans l'inventer", () => {
    const lines = materialLinesFromLots(syntheticLots(), "standard");
    const noPrice = lines.find((l) => l.designation === "Article sans prix")!;
    expect(noPrice.priceAvailable).toBe(false);
    expect(noPrice.unitPrice).toBe(0);
  });

  it("résout la référence catalogue officielle et en déduit la qualité", () => {
    const lines = materialLinesFromLots(syntheticLots(), "standard");
    const cement = lines.find((l) => l.designation === "Ciment CPJ 42.5")!;
    expect(cement.qualityAvailable).toBe(true);
    expect(cement.quality).toBe("standard");
    expect(cement.materialId).toBeTruthy();
    expect(cement.catalogName).toContain("Ciment");
  });
});

describe("materialsTotal — total global = Σ des lignes (§2)", () => {
  it("retourne la somme exacte des prix totaux", () => {
    const lines = materialLinesFromLots(syntheticLots(), "standard");
    const expected = lines.reduce((s, l) => s + l.total, 0);
    expect(materialsTotal(lines)).toBeCloseTo(expected, 6);
    // Matériaux uniquement : ciment 120 × 16.5 = 1980 ; main d'œuvre exclue.
    expect(materialsTotal(materialsOnly(lines))).toBeCloseTo(1980, 6);
  });

  it("gère les entrées vides", () => {
    expect(materialsTotal([])).toBe(0);
    expect(materialsTotal(null)).toBe(0);
    expect(materialsTotal(undefined)).toBe(0);
  });
});

// ============================================================================
// §4 — Synchronisation avec les 3 scénarios
// ============================================================================

describe("Scénarios — synchronisation avec le Coût estimatif", () => {
  it("expose les trois scénarios du projet avec leurs facteurs réels", () => {
    const contexts = buildScenarioContexts(COST);
    expect(contexts.map((c) => c.key)).toEqual(["economique", "standard", "premium"]);
    expect(contexts.find((c) => c.key === "standard")!.factor).toBeCloseTo(1, 6);
    expect(contexts.find((c) => c.key === "economique")!.factor).toBeCloseTo(0.8, 6);
    expect(contexts.find((c) => c.key === "premium")!.factor).toBeCloseTo(1.25, 6);
    expect(contexts.find((c) => c.key === "standard")!.reference).toBe(true);
  });

  it("applique le facteur du scénario au Quantitatif (scaleDqeLots partagé)", () => {
    const lots = villaDqe();
    const standard = materialsTotal(materialLinesFromLots(quantitatifForScenario(lots, SCENARIOS, "standard"), "standard"));
    const eco = materialsTotal(materialLinesFromLots(quantitatifForScenario(lots, SCENARIOS, "economique"), "economique"));
    const prem = materialsTotal(materialLinesFromLots(quantitatifForScenario(lots, SCENARIOS, "premium"), "premium"));
    expect(eco).toBeLessThan(standard);
    expect(prem).toBeGreaterThan(standard);
    // Les rapports respectent les facteurs du Coût estimatif (aux arrondis près).
    expect(eco / standard).toBeGreaterThan(0.75);
    expect(eco / standard).toBeLessThan(0.85);
    expect(prem / standard).toBeGreaterThan(1.15);
    expect(prem / standard).toBeLessThan(1.35);
  });

  it("ne modifie jamais le Quantitatif d'origine (immuabilité)", () => {
    const lots = villaDqe();
    const snapshot = JSON.stringify(lots);
    quantitatifForScenario(lots, SCENARIOS, "premium");
    buildScenarioMaterialLines(lots, SCENARIOS, "economique");
    expect(JSON.stringify(lots)).toBe(snapshot);
  });

  it("résout le scénario actif : persisté si disponible, sinon Standard", () => {
    const contexts = buildScenarioContexts(COST);
    expect(resolveActiveScenario("premium", contexts)).toBe("premium");
    expect(resolveActiveScenario("inconnu", contexts)).toBe("standard");
    expect(resolveActiveScenario(null, contexts)).toBe("standard");
  });
});

// ============================================================================
// §5 — Tableau matériaux & variantes (Éco ↔ Std ↔ Premium)
// ============================================================================

describe("variantsForLine — comparaison des scénarios", () => {
  it("conserve la quantité et fait varier le prix unitaire selon le scénario", () => {
    const lots = villaDqe();
    const standard = materialLinesFromLots(quantitatifForScenario(lots, SCENARIOS, "standard"), "standard");
    const contexts = buildScenarioContexts(COST);
    const line = standard.find((l) => l.priceAvailable)!;
    const variants = variantsForLine(line, line.unitPrice, contexts, "standard");
    expect(variants).toHaveLength(3);
    for (const v of variants) {
      expect(v.quantity).toBe(line.quantity);
      expect(v.total).toBeCloseTo(v.quantity * v.unitPrice, 6);
    }
    const eco = variants.find((v) => v.scenario === "economique")!;
    const prem = variants.find((v) => v.scenario === "premium")!;
    expect(eco.unitPrice).toBeLessThan(prem.unitPrice);
    expect(variants.find((v) => v.scenario === "standard")!.recommended).toBe(true);
  });
});

// ============================================================================
// §7 — Rapport qualité / prix
// ============================================================================

describe("scorePriceQuality — rapport qualité/prix", () => {
  it("n'évalue pas et signale un prix manquant (§12)", () => {
    const lines = materialLinesFromLots(syntheticLots(), "standard");
    const noPrice = lines.find((l) => l.designation === "Article sans prix")!;
    const score = scorePriceQuality(noPrice, [], "standard");
    expect(score.level).toBe("a_optimiser");
    expect(score.score).toBe(0);
    expect(score.signals).toContain("Prix non disponible");
  });

  it("produit un niveau dans la plage attendue avec des données réelles", () => {
    const lines = materialLinesFromLots(syntheticLots(), "standard");
    const cement = lines.find((l) => l.designation === "Ciment CPJ 42.5")!;
    const score = scorePriceQuality(cement, [], "standard");
    expect(["excellent", "bon", "moyen", "a_optimiser"]).toContain(score.level);
    expect(score.score).toBeGreaterThan(0);
    expect(score.reason.length).toBeGreaterThan(10);
    expect(score.signals.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// §6 — Intelligence prédictive
// ============================================================================

describe("predictiveRecommendations — IA prédictive", () => {
  it("signale les données manquantes sans inventer de montant", () => {
    const lines = materialLinesFromLots(syntheticLots(), "standard");
    const recs = predictiveRecommendations(lines, {}, "standard");
    const missing = recs.find((r) => r.articleId === "gros_oeuvre::2")!;
    expect(missing).toBeTruthy();
    expect(missing.kind).toBe("missing_data");
    expect(missing.savings).toBeUndefined();
  });

  it("propose une alternative chiffrée à partir des variantes réelles", () => {
    const lots = villaDqe();
    const standard = materialLinesFromLots(quantitatifForScenario(lots, SCENARIOS, "standard"), "standard");
    const contexts = buildScenarioContexts(COST);
    const line = materialsOnly(standard).find((l) => l.priceAvailable)!;
    const variants: Record<string, any> = {
      [line.articleId]: variantsForLine(line, line.unitPrice, contexts, "standard"),
    };
    const recs = predictiveRecommendations(standard, variants, "standard");
    const rec = recs.find((r) => r.articleId === line.articleId)!;
    expect(rec).toBeTruthy();
    expect(["economy_available", "keep", "premium_impact"]).toContain(rec.kind);
    expect(rec.basis.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// §17.14 — Conditionnements
// ============================================================================

describe("Conditionnements", () => {
  it("lit le conditionnement depuis la désignation officielle", () => {
    expect(packageRuleFor("Ciment CPJ 42.5 (sac 50 kg)")).toEqual({
      size: 50,
      unit: "sac",
      needUnit: "kg",
    });
    expect(packageRuleFor("Treillis soudé ST25 (panneau)")?.unit).toBe("panneau");
    expect(packageRuleFor("Pavé autobloquant (m²)")).toBeNull();
  });

  it("convertit une quantité en kg vers des sacs (arrondi supérieur) et chiffre le surcoût", () => {
    const line: MaterialLine = {
      articleId: "x::0",
      lotId: "x",
      lotName: "X",
      category: "",
      designation: "Ciment CPJ 42.5",
      unit: "kg",
      quantity: 120,
      unitPrice: 0.3,
      total: 36,
      scenario: "standard",
      quality: "standard",
      nature: "materiaux",
      isMaterial: true,
      priceAvailable: true,
      qualityAvailable: true,
      catalogUnitPrice: 14.7,
      packageRule: { size: 50, unit: "sac", needUnit: "kg" },
      source: "quantitatif_detaille",
    };
    const pkg = packagingForLine(line)!;
    expect(pkg).toBeTruthy();
    expect(pkg.purchasedQty).toBe(3); // ceil(120 / 50)
    expect(pkg.coveredQty).toBe(150);
    expect(pkg.surplus).toBe(30);
    expect(pkg.purchasedCost).toBeCloseTo(44.1, 6);
  });

  it("ne convertit pas lorsque la quantité est déjà dans l'unité de conditionnement", () => {
    const lines = materialLinesFromLots(syntheticLots(), "standard");
    const cement = lines.find((l) => l.designation === "Ciment CPJ 42.5")!;
    expect(packagingForLine(cement)).toBeNull(); // unité « sacs » = déjà conditionné
  });
});

// ============================================================================
// §16–§17 — Sélection finale & validation
// ============================================================================

describe("Sélection finale — états, validation, confirmation", () => {
  it("bloque une sélection incomplète et autorise la confirmation une fois complète", () => {
    const lines = materialsOnly(materialLinesFromLots(syntheticLots(), "standard")).filter(
      (l) => l.priceAvailable,
    );
    const full = acceptAllRecommendations(lines, "standard");

    const partial: Record<string, MaterialSelectionEntry | undefined> = { ...full };
    delete partial["gros_oeuvre::0"];
    const ko = validateSelection({
      lines,
      selections: partial,
      scenario: "standard",
      scenarioAvailable: true,
      budgetMaterials: 2000,
    });
    expect(ko.canConfirm).toBe(false);
    expect(ko.blocking.some((i) => i.code === "incomplete_selection")).toBe(true);

    const ok = validateSelection({
      lines,
      selections: full,
      scenario: "standard",
      scenarioAvailable: true,
      budgetMaterials: 2000,
    });
    expect(ok.canConfirm).toBe(true);
    expect(ok.missingCount).toBe(0);
    expect(ok.acceptedRecommendations).toBe(1);
  });

  it("bloque lorsque le prix d'un article obligatoire est absent", () => {
    const lines = materialsOnly(materialLinesFromLots(syntheticLots(), "standard"));
    const selections = acceptAllRecommendations(lines, "standard");
    const v = validateSelection({
      lines,
      selections,
      scenario: "standard",
      scenarioAvailable: true,
      budgetMaterials: 2000,
    });
    expect(v.blocking.some((i) => i.code === "missing_price")).toBe(true);
    expect(v.canConfirm).toBe(false);
  });

  it("bloque un Quantitatif vide et un scénario indisponible", () => {
    const empty = validateSelection({
      lines: [],
      selections: {},
      scenario: "standard",
      scenarioAvailable: true,
      budgetMaterials: 0,
    });
    expect(empty.blocking.some((i) => i.code === "empty_quantitatif")).toBe(true);

    const noScenario = validateSelection({
      lines: [],
      selections: {},
      scenario: "premium",
      scenarioAvailable: false,
      budgetMaterials: 0,
    });
    expect(noScenario.blocking.some((i) => i.code === "scenario_unavailable")).toBe(true);
  });

  it("avertit lors d'un choix personnalisé différent du scénario de référence", () => {
    const lines = materialsOnly(materialLinesFromLots(syntheticLots(), "standard")).filter(
      (l) => l.priceAvailable,
    );
    const selections = acceptAllRecommendations(lines, "standard");
    selections["gros_oeuvre::0"].scenario = "premium";
    selections["gros_oeuvre::0"].userSelected = true;
    const v = validateSelection({
      lines,
      selections,
      scenario: "standard",
      scenarioAvailable: true,
      budgetMaterials: 5000,
      recommendedScenario: "standard",
    });
    expect(v.customizedCount).toBe(1);
    expect(v.warnings.some((i) => i.code === "custom_choice")).toBe(true);
    expect(v.canConfirm).toBe(true);
  });
});

describe("recalculateSelection — recalcul officiel (§18.4→§18.5)", () => {
  it("recalcule le total par somme des lignes, jamais par delta", () => {
    const lines = materialsOnly(materialLinesFromLots(syntheticLots(), "standard"));
    const selections = acceptAllRecommendations(lines, "standard");
    const ref = recalculateSelection(lines, selections, "standard");
    expect(ref.materialsTotal).toBeCloseTo(materialsTotal(lines), 6);
    expect(ref.impact).toBeCloseTo(0, 6);
  });

  it("répercute une modification de quantité et de prix unitaire", () => {
    const lines = materialsOnly(materialLinesFromLots(syntheticLots(), "standard"));
    const selections = acceptAllRecommendations(lines, "standard");
    selections["gros_oeuvre::0"].selectedQuantity = 200;
    selections["gros_oeuvre::0"].unitPrice = 20;
    const rec = recalculateSelection(lines, selections, "standard");
    const line = rec.lines.find((l) => l.articleId === "gros_oeuvre::0")!;
    expect(line.totalPrice).toBeCloseTo(4000, 6);
    expect(line.quantityDelta).toBeCloseTo(80, 6);
    expect(rec.materialsTotal).toBeCloseTo(4000, 6);
  });

  it("ignore les articles disparus du Quantitatif (sélection obsolète)", () => {
    const lines = materialsOnly(materialLinesFromLots(syntheticLots(), "standard"));
    const selections = acceptAllRecommendations(lines, "standard");
    selections["disparu::9"] = { ...selections["gros_oeuvre::0"], articleId: "disparu::9" };
    const rec = recalculateSelection(lines, selections, "standard");
    expect(rec.lines.some((l) => l.articleId === "disparu::9")).toBe(false);
  });
});

describe("selectVariant & états de ligne", () => {
  it("sélectionne une variante et recalcule le prix total", () => {
    const lines = materialsOnly(materialLinesFromLots(syntheticLots(), "standard"));
    const cement = lines.find((l) => l.designation === "Ciment CPJ 42.5")!;
    const contexts = buildScenarioContexts(COST);
    const eco = variantsForLine(cement, cement.unitPrice, contexts, "standard").find(
      (v) => v.scenario === "economique",
    )!;
    const entry = selectVariant(cement, eco, true);
    expect(entry.scenario).toBe("economique");
    expect(entry.totalPrice).toBeCloseTo(cement.quantity * eco.unitPrice, 6);
    expect(selectionLineState(entry, "standard")).toBe("modifie_utilisateur");
  });
});

// ============================================================================
// §17.18 / §17.24 — Score global & statuts
// ============================================================================

describe("Score & statut global", () => {
  it("calcule un score borné et un libellé", () => {
    const lines = materialsOnly(materialLinesFromLots(syntheticLots(), "standard"));
    const selections = acceptAllRecommendations(lines, "standard");
    const validation = validateSelection({
      lines,
      selections,
      scenario: "standard",
      scenarioAvailable: true,
      budgetMaterials: 5000,
    });
    const score = selectionScore({
      materialsTotal: 1980,
      budgetMaterials: 5000,
      validation,
      averagePriceQuality: 70,
    });
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
    expect(score.label.length).toBeGreaterThan(0);
  });

  it("déduit le statut global des données réelles", () => {
    expect(
      projectMaterialsStatus({ requiredCount: 5, selectedCount: 5, validated: true, stale: false, blocking: 0 }),
    ).toBe("valides");
    expect(
      projectMaterialsStatus({ requiredCount: 5, selectedCount: 2, validated: false, stale: false, blocking: 0 }),
    ).toBe("en_cours");
    expect(
      projectMaterialsStatus({ requiredCount: 5, selectedCount: 5, validated: false, stale: true, blocking: 0 }),
    ).toBe("a_reviser");
    expect(
      projectMaterialsStatus({ requiredCount: 5, selectedCount: 5, validated: false, stale: false, blocking: 1 }),
    ).toBe("blocage");
  });
});

// ============================================================================
// §18.17 — Versions & détection d'obsolescence
// ============================================================================

describe("Versions & obsolescence", () => {
  it("produit une empreinte déterministe et détecte un changement", () => {
    const lots = syntheticLots();
    const v1 = quantitativeVersion(lots);
    expect(quantitativeVersion(lots)).toBe(v1);
    const modified = JSON.parse(JSON.stringify(lots));
    modified[0].lines[0].quantity = 200;
    expect(quantitativeVersion(modified)).not.toBe(v1);
  });

  it("détecte une sélection obsolète via quantitativeVersion / priceVersion", () => {
    const lots = syntheticLots();
    const current = { quantitativeVersion: quantitativeVersion(lots), priceVersion: priceVersion(lots) };
    expect(isStale(null, current)).toBe(false);
    expect(isStale({ ...current }, current)).toBe(false);
    expect(isStale({ quantitativeVersion: "autre", priceVersion: current.priceVersion }, current)).toBe(true);
  });

  it("liste les articles ajoutés / modifiés / supprimés", () => {
    const a = materialLinesFromLots(syntheticLots(), "standard");
    const b = a.filter((l) => l.articleId !== "gros_oeuvre::0");
    const diff = affectedArticles(a, b);
    expect(diff.removed).toContain("Ciment CPJ 42.5");
    expect(diff.added).toHaveLength(0);
  });
});

// ============================================================================
// Espace de travail complet
// ============================================================================

describe("buildMaterialWorkspace — payload unique UI ↔ serveur", () => {
  it("construit un espace de travail cohérent à partir d'un vrai Quantitatif", () => {
    const ws = buildMaterialWorkspace({
      rawLots: villaDqe(),
      costEstimate: COST,
      scenario: "standard",
    });
    expect(ws.hasQuantitatif).toBe(true);
    expect(ws.scenario).toBe("standard");
    expect(ws.referenceScenario).toBe("standard");
    expect(ws.lines.length).toBeGreaterThan(0);
    expect(ws.lines.every((l) => l.isMaterial)).toBe(true);
    expect(ws.materialsTotal).toBeCloseTo(materialsTotal(ws.lines), 6);
    expect(ws.referenceTotal).toBeCloseTo(ws.materialsTotal, 6);
    expect(Object.keys(ws.variants).length).toBe(ws.lines.length);
    expect(ws.quantitativeVersion.length).toBeGreaterThan(0);
    expect(ws.priceVersion.length).toBeGreaterThan(0);
    expect(ws.budget.projectTotal).toBe(100_000);
  });

  it("synchronise le total avec le scénario sélectionné", () => {
    const standard = buildMaterialWorkspace({ rawLots: villaDqe(), costEstimate: COST, scenario: "standard" });
    const premium = buildMaterialWorkspace({ rawLots: villaDqe(), costEstimate: COST, scenario: "premium" });
    expect(premium.materialsTotal).toBeGreaterThan(standard.materialsTotal);
    expect(premium.referenceTotal).toBeCloseTo(standard.materialsTotal, 6);
  });

  it("gère proprement l'absence de Quantitatif", () => {
    const ws = buildMaterialWorkspace({ rawLots: [], costEstimate: COST, scenario: "standard" });
    expect(ws.hasQuantitatif).toBe(false);
    expect(ws.lines).toHaveLength(0);
    expect(ws.materialsTotal).toBe(0);
    expect(ws.recommendations).toHaveLength(0);
  });

  it("résout une référence catalogue pour la majorité des lignes réelles", () => {
    const ws = buildMaterialWorkspace({ rawLots: villaDqe(), costEstimate: COST, scenario: "standard" });
    const resolved = ws.lines.filter((l) => l.qualityAvailable).length;
    expect(resolved).toBeGreaterThan(0);
    expect(catalogReferenceFor("Ciment CPJ 42.5")).toBeTruthy();
  });
});
