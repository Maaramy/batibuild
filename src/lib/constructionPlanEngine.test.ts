import { describe, expect, it } from "vitest";

import type { BudgetAnalysis, BudgetCategoryLine } from "@/lib/budgetEngine";
import {
  BUDGET_STEP_DELTAS,
  CANONICAL_WORKS,
  buildConstructionPlan,
  compareScenarioCapacity,
  deriveWorks,
  estimateBuildableSurface,
  normalizeWorkLabel,
  planBudgetSteps,
} from "@/lib/constructionPlanEngine";

// ── Fixtures ───────────────────────────────────────────────────────────────

function sub(
  id: string,
  label: string,
  cost: number,
): BudgetCategoryLine["subcategories"][number] {
  return {
    subcategoryId: id,
    subcategoryLabel: label,
    estimatedCost: cost,
    fundedAmount: 0,
    pctOfCategory: 100,
    realizationPct: 0,
    status: "report",
    articles: [],
  };
}

function cat(
  id: string,
  label: string,
  cost: number,
  subs: BudgetCategoryLine["subcategories"],
): BudgetCategoryLine {
  return {
    categoryId: id,
    categoryLabel: label,
    estimatedCost: cost,
    pctOfTotal: 0,
    budgetNeeded: cost,
    fundedAmount: 0,
    realizationPct: 0,
    status: "report",
    priority: 5,
    subcategories: subs,
  };
}

/** Analyse de référence : 120 000 TND de poste de chantier. */
function makeAnalysis(): BudgetAnalysis {
  const breakdown = [
    cat("etudes", "Études & frais préliminaires", 5000, [sub("e1", "Études de sol", 5000)]),
    cat("gros_oeuvre", "Gros œuvre", 55000, [
      sub("g1", "Fondations et longrines", 12000),
      sub("g2", "Structure et poteaux", 25000),
      sub("g3", "Maçonnerie / murs", 18000),
    ]),
    cat("second_oeuvre", "Second œuvre", 38000, [
      sub("s1", "Toiture", 15000),
      sub("s2", "Revêtements sol", 13000),
      sub("s3", "Peinture intérieure", 10000),
    ]),
    cat("equipements", "Équipements", 18000, [
      sub("q1", "Installation électrique", 10000),
      sub("q2", "Plomberie & sanitaires", 8000),
    ]),
    cat("amenagements_exterieurs", "Aménagements extérieurs", 4000, [sub("a1", "Clôture & portail", 4000)]),
  ];
  return {
    available: true,
    projectId: "p1",
    userId: "u1",
    projectName: "Villa test",
    scenarioLabel: "Standard",
    projectTotal: 120000,
    availableBudget: 60000,
    usedBudget: 60000,
    remainingBudget: 0,
    projectReachablePct: 50,
    budgetUsedPct: 100,
    selectedCostSharePct: 50,
    gapToProjectTotal: 60000,
    gapToNextCategory: 0,
    nextCategoryLabel: "",
    optimalCombination: "",
    breakdown,
    statusSummary: { realisable: [], partiel: [], report: [] },
    scenarios: [],
    recommendation: "",
    summarySentence: "",
    generatedAt: 0,
  } as BudgetAnalysis;
}

// ── normalize / derive ─────────────────────────────────────────────────────

describe("normalizeWorkLabel", () => {
  it("retire les accents, les parenthèses et minuscules", () => {
    expect(normalizeWorkLabel("Gros œuvre (fondations, structures)")).toBe("gros oeuvre");
    expect(normalizeWorkLabel("Installation ÉLECTRIQUE")).toBe("installation electrique");
  });
});

describe("deriveWorks", () => {
  it("regroupe les sous-lots sur les postes canoniques sans perte de coût", () => {
    const works = deriveWorks(makeAnalysis());
    const total = works.reduce((s, w) => s + w.cost, 0);
    expect(Math.round(total)).toBe(120000);
    const ids = works.map((w) => w.id);
    expect(ids).toContain("w:fondations");
    expect(ids).toContain("w:gros_oeuvre");
    expect(ids).toContain("w:murs");
    expect(ids).toContain("w:toiture");
    expect(ids).toContain("w:electricite");
    expect(ids).toContain("w:plomberie");
    expect(ids).toContain("w:revetements");
    expect(ids).toContain("w:peinture");
    expect(ids).toContain("w:amenagement_exterieur");
  });

  it("trie les postes dans l'ordre de construction", () => {
    const works = deriveWorks(makeAnalysis());
    const order = works.map((w) => w.id);
    expect(order.indexOf("w:fondations")).toBeLessThan(order.indexOf("w:gros_oeuvre"));
    expect(order.indexOf("w:gros_oeuvre")).toBeLessThan(order.indexOf("w:murs"));
    expect(order.indexOf("w:toiture")).toBeLessThan(order.indexOf("w:electricite"));
    expect(order.indexOf("w:electricite")).toBeLessThan(order.indexOf("w:revetements"));
    expect(order.indexOf("w:revetements")).toBeLessThan(order.indexOf("w:peinture"));
  });

  it("conserve un poste non reconnu sous son libellé d'origine", () => {
    const analysis = makeAnalysis();
    analysis.breakdown = [cat("transport", "Transport & divers", 3000, [sub("t1", "Benne Grue auxiliaire", 3000)])];
    const works = deriveWorks(analysis);
    expect(works).toHaveLength(1);
    expect(works[0].label).toBe("Benne Grue auxiliaire");
    expect(works[0].cost).toBe(3000);
  });

  it("expose la liste canonique demandée (11 postes + études)", () => {
    expect(CANONICAL_WORKS.map((w) => w.id)).toEqual([
      "etudes",
      "fondations",
      "dalle_planchers",
      "gros_oeuvre",
      "murs",
      "toiture",
      "electricite",
      "plomberie",
      "menuiserie",
      "revetements",
      "peinture",
      "amenagement_exterieur",
    ]);
  });
});

// ── buildConstructionPlan ──────────────────────────────────────────────────

describe("buildConstructionPlan", () => {
  it("finance séquentiellement dans l'ordre de construction (60 000 / 120 000)", () => {
    const works = deriveWorks(makeAnalysis());
    const plan = buildConstructionPlan({ works, budget: 60000, selectedIds: null });

    expect(plan.selectedCost).toBe(120000);
    expect(plan.funded).toBe(60000);
    expect(plan.globalPct).toBe(50);
    expect(plan.remainingToComplete).toBe(60000);
    expect(plan.extraBudgetRecommended).toBe(60000);

    // Études (5 000) + Fondations (12 000) + Gros œuvre structure (25 000) = 42 000
    const etudes = plan.works.find((w) => w.id === "w:etudes");
    expect(etudes?.status).toBe("realisable");
    const fondations = plan.works.find((w) => w.id === "w:fondations");
    expect(fondations?.status).toBe("realisable");

    // Les postes ultérieurs ne reçoivent plus rien (allocation séquentielle).
    const peinture = plan.works.find((w) => w.id === "w:peinture");
    expect(peinture?.status).toBe("report");
    expect(plan.deferredLabels.length).toBeGreaterThan(0);
  });

  it("borne le % global à [0, 100] et le pécule restant", () => {
    const works = deriveWorks(makeAnalysis());
    const plan = buildConstructionPlan({ works, budget: 500000, selectedIds: null });
    expect(plan.globalPct).toBe(100);
    expect(plan.remainingBudget).toBe(500000 - 120000);
    expect(plan.remainingToComplete).toBe(0);
    expect(plan.extraBudgetRecommended).toBe(0);
    expect(plan.deferredLabels).toHaveLength(0);
    expect(plan.fullLabels.length).toBe(plan.works.length);
  });

  it("produit une phrase « Que puis-je construire ? » à partir des montants calculés", () => {
    const works = deriveWorks(makeAnalysis());
    const plan = buildConstructionPlan({ works, budget: 60000, selectedIds: null });
    expect(plan.answerSentence).toContain("60 000 TND");
    expect(plan.answerSentence).toContain("Fondations");
    expect(plan.answerSentence).toMatch(/être reporté/i);
    expect(plan.answerSentence).toContain("supplémentaires");
  });

  it("exclut les postes non sélectionnés et libère leur budget", () => {
    const works = deriveWorks(makeAnalysis());
    const all = buildConstructionPlan({ works, budget: 60000, selectedIds: null });
    const noPeinture = buildConstructionPlan({
      works,
      budget: 60000,
      selectedIds: works.filter((w) => w.id !== "w:peinture").map((w) => w.id),
    });
    expect(noPeinture.excludedWorks.map((w) => w.id)).toContain("w:peinture");
    expect(noPeinture.selectedCost).toBe(all.selectedCost - 10000);
    // Le budget est réalloué : le % global du programme sélectionné est ≥.
    expect(noPeinture.globalPct).toBeGreaterThanOrEqual(all.globalPct);
  });

  it("n'exploite que les ids réellement présents", () => {
    const works = deriveWorks(makeAnalysis());
    const plan = buildConstructionPlan({ works, budget: 60000, selectedIds: ["w:inconnu"] });
    expect(plan.works).toHaveLength(0);
    expect(plan.globalPct).toBe(0);
    expect(plan.answerSentence).toContain("aucun poste");
  });

  it("classe les priorités IA et détecte le risque de reprise", () => {
    const works = deriveWorks(makeAnalysis());
    // L'utilisateur exclut les fondations mais garde la peinture → risque.
    const plan = buildConstructionPlan({
      works,
      budget: 80000,
      selectedIds: works.filter((w) => w.id !== "w:fondations").map((w) => w.id),
    });
    expect(plan.aiPriorities.length).toBe(plan.works.length);
    expect(plan.aiPriorities[0].order).toBe(1);
    // Un poste financé alors que « Fondations » (dépendance) est exclu → risque.
    const risky = plan.aiPriorities.filter((p) => p.reason.includes("Risque de reprise"));
    expect(risky.length).toBeGreaterThan(0);
    expect(risky.some((p) => p.reason.includes("Fondations"))).toBe(true);
    const peinture = plan.aiPriorities.find((p) => p.id === "w:peinture");
    if (peinture && peinture.pct > 0) {
      expect(peinture.reason).toContain("Risque de reprise");
    }
    for (const p of plan.aiPriorities) {
      expect(p.reason.length).toBeGreaterThan(10);
      expect(p.sharePct).toBeGreaterThanOrEqual(0);
      expect(p.sharePct).toBeLessThanOrEqual(100);
    }
  });

  it("donne une prochaine étape concrète quand un poste est partiel", () => {
    const works = deriveWorks(makeAnalysis());
    // 47 000 TND : études + fondations + structure (42 000) puis 5 000 sur le poste suivant.
    const plan = buildConstructionPlan({ works, budget: 47000, selectedIds: null });
    const partial = plan.partialWorks[0];
    expect(partial).toBeDefined();
    expect(plan.nextStep).toContain("Terminer");
    expect(plan.nextStep).toContain(partial!.label);
  });
});

// ── planBudgetSteps ────────────────────────────────────────────────────────

describe("planBudgetSteps", () => {
  it("propose les paliers +10 000 / +20 000 / +30 000 TND", () => {
    const works = deriveWorks(makeAnalysis());
    const steps = planBudgetSteps({ works, budget: 60000, selectedIds: null });
    expect(steps.map((s) => s.delta)).toEqual(BUDGET_STEP_DELTAS);
    expect(steps.map((s) => s.budget)).toEqual([70000, 80000, 90000]);
    for (const step of steps) {
      expect(step.globalPct).toBeGreaterThanOrEqual(50);
      expect(step.extraPct).toBeGreaterThanOrEqual(0);
    }
    // +10 000 TND sur 120 000 → 60 000 → 70 000 : 58,3 % du programme.
    expect(steps[0].globalPct).toBeCloseTo(58.3, 0);
  });

  it("signale les travaux supplémentaires rendus réalisables", () => {
    const works = deriveWorks(makeAnalysis());
    const steps = planBudgetSteps({ works, budget: 60000, selectedIds: null });
    const allAdditional = steps.flatMap((s) => s.additionalFullLabels);
    expect(allAdditional.length).toBeGreaterThan(0);
    // Les études sont déjà finançables à 60 000 : jamais « supplémentaires ».
    expect(allAdditional).not.toContain("Études & frais préliminaires");
  });
});

// ── compareScenarioCapacity / surface ──────────────────────────────────────

describe("compareScenarioCapacity", () => {
  it("calcule la capacité sur chaque scénario d'estimation", () => {
    const rows = compareScenarioCapacity(60000, [
      { key: "economique", label: "Économique", totalCost: 90000 },
      { key: "standard", label: "Standard", totalCost: 120000 },
      { key: "premium", label: "Premium", totalCost: 180000 },
    ]);
    expect(rows.map((r) => r.capacityPct)).toEqual([66.7, 50, 33.3]);
    expect(rows.map((r) => r.missing)).toEqual([30000, 60000, 120000]);
    expect(rows.every((r) => r.perSqm === undefined)).toBe(true);
  });

  it("borne la capacité à 100 % et fournit le coût au m² si la surface est connue", () => {
    const rows = compareScenarioCapacity(200000, [{ key: "standard", label: "Standard", totalCost: 120000 }], 85);
    expect(rows[0].capacityPct).toBe(100);
    expect(rows[0].missing).toBe(0);
    expect(rows[0].perSqm).toBeCloseTo(1411.76, 1);
  });

  it("ignore les scénarios sans coût", () => {
    expect(compareScenarioCapacity(60000, [{ key: "x", label: "X", totalCost: 0 }])).toHaveLength(0);
  });
});

describe("estimateBuildableSurface", () => {
  it("estime la surface théorique réalisable", () => {
    // 120 000 TND pour 85 m² → 1 411,76 TND/m² → 60 000 TND ≈ 43 m².
    expect(estimateBuildableSurface(60000, 120000 / 85)).toBe(43);
    expect(estimateBuildableSurface(0, 1000)).toBe(0);
  });

  it("renvoie null sans prix au m²", () => {
    expect(estimateBuildableSurface(60000)).toBeNull();
    expect(estimateBuildableSurface(60000, 0)).toBeNull();
    expect(estimateBuildableSurface(60000, Number.NaN)).toBeNull();
  });
});
