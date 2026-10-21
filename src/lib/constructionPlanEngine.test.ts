import { describe, expect, it } from "vitest";

import type {
  BudgetAnalysis,
  BudgetArticleLine,
  BudgetCategoryLine,
  QuantitatifLot,
} from "@/lib/budgetEngine";
import {
  BUDGET_STEP_DELTAS,
  CANONICAL_WORKS,
  CUSTOM_WORK_RANK,
  buildConstructionPlan,
  compareScenarioCapacity,
  customWorkRank,
  deriveWorks,
  estimateBuildableSurface,
  normalizeWorkLabel,
  planBudgetSteps,
  type WorkItem,
} from "@/lib/constructionPlanEngine";

// ── Fixtures ───────────────────────────────────────────────────────────────

function art(
  designation: string,
  estimatedCost: number,
  quantity?: number,
  unit?: string,
): BudgetArticleLine {
  return { designation, estimatedCost, fundedAmount: 0, realizationPct: 0, quantity, unit };
}

function sub(
  id: string,
  label: string,
  cost: number,
  articles: BudgetArticleLine[] = [],
): BudgetCategoryLine["subcategories"][number] {
  return {
    subcategoryId: id,
    subcategoryLabel: label,
    estimatedCost: cost,
    fundedAmount: 0,
    pctOfCategory: 100,
    realizationPct: 0,
    status: "report",
    articles,
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
      sub("g1", "Fondations et longrines", 12000, [
        art("Semelles filantes béton armé", 8000, 120, "m²"),
        art("Longrines BA", 4000, 60, "m"),
      ]),
      sub("g2", "Structure et poteaux", 25000, [
        art("Poteaux béton armé", 10000, 24, "u"),
        art("Poutres et hourdis", 15000, 1, "lot"),
      ]),
      sub("g3", "Maçonnerie / murs", 18000, [art("Maçonnerie briques 11 cm", 18000, 1, "lot")]),
    ]),
    cat("second_oeuvre", "Second œuvre", 38000, [
      sub("s1", "Toiture", 15000),
      sub("s2a", "Revêtements sol carrelage", 8000),
      sub("s2b", "Revêtements sol parquet", 5000),
      sub("s3", "Peinture intérieure", 10000),
    ]),
    cat("equipements", "Équipements", 18000, [
      sub("q1", "Installation électrique", 9000),
      sub("q2", "Plomberie & sanitaires", 7000),
      sub("q3", "Équipements techniques", 2000),
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
  it("regroupe les sous-lots sur les postes canoniques, hors Équipements exclus", () => {
    const works = deriveWorks(makeAnalysis());
    const total = works.reduce((s, w) => s + w.cost, 0);
    // 120 000 − 2 000 TND de postes « Équipements » (exclus du plan).
    expect(Math.round(total)).toBe(118000);
    expect(works.some((w) => normalizeWorkLabel(w.label).includes("equipement"))).toBe(false);
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
    // Hors poste « Aménagements extérieurs » toujours proposé (à chiffrer).
    const others = works.filter((w) => w.id !== "w:amenagement_exterieur");
    expect(others).toHaveLength(1);
    expect(others[0].label).toBe("Benne Grue auxiliaire");
    expect(others[0].cost).toBe(3000);
  });

  it("expose la liste canonique demandée (11 postes + études, second œuvre et transports)", () => {
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
      "second_oeuvre",
      "transport",
      "amenagement_exterieur",
    ]);
  });
});

// ── buildConstructionPlan ──────────────────────────────────────────────────

describe("buildConstructionPlan", () => {
  it("finance séquentiellement dans l'ordre de construction (60 000 / 120 000)", () => {
    const works = deriveWorks(makeAnalysis());
    const plan = buildConstructionPlan({ works, budget: 60000, selectedIds: null });

    expect(plan.selectedCost).toBe(118000);
    expect(plan.funded).toBe(60000);
    expect(plan.globalPct).toBe(50.8);
    expect(plan.remainingToComplete).toBe(58000);
    expect(plan.extraBudgetRecommended).toBe(58000);

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
    expect(plan.remainingBudget).toBe(500000 - 118000);
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

  it("expose les sous-catégories financées sous chaque poste", () => {
    const works = deriveWorks(makeAnalysis());
    const plan = buildConstructionPlan({ works, budget: 60000, selectedIds: null });

    // Poste mono-sous-lot.
    const fondations = plan.works.find((w) => w.id === "w:fondations");
    expect(fondations?.parts).toHaveLength(1);
    expect(fondations?.parts?.[0].label).toBe("Fondations et longrines");
    expect(fondations?.parts?.[0].status).toBe("realisable");

    // Poste multi-sous-lots.
    const revetements = plan.works.find((w) => w.id === "w:revetements");
    expect(revetements?.parts).toHaveLength(2);

    // Invariants : les sous-catégories couvrent exactement le poste (coût et
    // financement), triées par coût décroissant (règle du budgetEngine).
    for (const w of plan.works) {
      if (!w.parts || w.parts.length === 0) continue;
      const costSum = w.parts.reduce((s, p) => s + p.cost, 0);
      const fundedSum = w.parts.reduce((s, p) => s + p.funded, 0);
      expect(Math.abs(costSum - w.cost)).toBeLessThan(0.01);
      expect(Math.abs(fundedSum - w.funded)).toBeLessThan(0.01);
      for (let i = 1; i < w.parts.length; i += 1) {
        expect(w.parts[i - 1].cost).toBeGreaterThanOrEqual(w.parts[i].cost);
      }
    }

    // Poste partiel : seule la sous-catégorie en cours reçoit le solde.
    const partialPlan = buildConstructionPlan({ works, budget: 47000, selectedIds: null });
    const partial = partialPlan.works.find((w) => w.status === "partiel");
    expect(partial).toBeDefined();
    expect(partial?.parts).toHaveLength(1);
    expect(partial!.parts![0].funded).toBeGreaterThan(0);
    expect(partial!.parts![0].status).toBe("partiel");
    expect(partial!.parts![0].pct).toBeLessThan(100);
  });

  it("expose les articles de chaque sous-catégorie avec leur réalisation", () => {
    const works = deriveWorks(makeAnalysis());
    const plan = buildConstructionPlan({ works, budget: 60000, selectedIds: null });

    // Poste intégralement financé → ses articles aussi, dans l'ordre du Quantitatif.
    const fondations = plan.works.find((w) => w.id === "w:fondations");
    const fondParts = fondations!.parts![0];
    expect(fondParts.articles).toHaveLength(2);
    expect(fondParts.articles!.map((a) => a.label)).toEqual([
      "Semelles filantes béton armé",
      "Longrines BA",
    ]);
    expect(fondParts.articles!.every((a) => a.status === "realisable")).toBe(true);
    expect(fondParts.articles![0].quantity).toBe(120);
    expect(fondParts.articles![0].unit).toBe("m²");

    // Invariants : les articles couvrent exactement leur sous-catégorie.
    for (const w of plan.works) {
      for (const p of w.parts ?? []) {
        if (!p.articles || p.articles.length === 0) continue;
        const costSum = p.articles.reduce((s, a) => s + a.cost, 0);
        const fundedSum = p.articles.reduce((s, a) => s + a.funded, 0);
        expect(Math.abs(costSum - p.cost)).toBeLessThan(0.01);
        expect(Math.abs(fundedSum - p.funded)).toBeLessThan(0.01);
      }
    }

    // Sous-catégorie partiellement financée → article partiel aussi.
    const partialPlan = buildConstructionPlan({ works, budget: 47000, selectedIds: null });
    const murs = partialPlan.works.find((w) => w.id === "w:murs");
    const mursArticle = murs!.parts![0].articles![0];
    expect(mursArticle.status).toBe("partiel");
    expect(mursArticle.funded).toBeGreaterThan(0);
    expect(mursArticle.funded).toBeLessThan(mursArticle.cost);
    expect(mursArticle.pct).toBeLessThan(100);
  });

  it("exclut les postes « Équipements » du plan (coûts retirés)", () => {
    const works = deriveWorks(makeAnalysis());
    expect(works.some((w) => normalizeWorkLabel(w.label).includes("equipement"))).toBe(false);

    const plan = buildConstructionPlan({ works, budget: 60000, selectedIds: null });
    // 120 000 − 2 000 TND d'Équipements = 118 000 TND de programme.
    expect(plan.selectedCost).toBe(118000);
    expect(plan.deferredLabels.some((l) => normalizeWorkLabel(l).includes("equipement"))).toBe(false);
    expect(plan.aiPriorities.some((p) => normalizeWorkLabel(p.label).includes("equipement"))).toBe(false);
    expect(plan.answerSentence).not.toContain("quipement");
  });

  it("récupère « Aménagements extérieurs » depuis le Quantitatif détaillé", () => {
    const base = makeAnalysis();
    base.breakdown = base.breakdown.filter((c) => c.categoryId !== "amenagements_exterieurs");
    const lots: QuantitatifLot[] = [
      {
        id: "amenagements_exterieurs",
        name: "Aménagements extérieurs",
        subtotal: 4000,
        lines: [
          {
            designation: "Clôture et portail",
            subcategory: "Clôture",
            quantity: 40,
            unit: "m",
            unitPrice: 75,
            total: 3000,
          },
          { designation: "Gazon et massifs", subcategory: "Jardin", total: 1000 },
        ],
      },
    ];

    const works = deriveWorks(base, lots);
    const amen = works.find((w) => w.id === "w:amenagement_exterieur");
    expect(amen).toBeDefined();
    expect(amen!.cost).toBe(4000);
    expect(amen!.parts).toHaveLength(2);
    expect(amen!.parts!.map((p) => p.label).sort()).toEqual(["Clôture", "Jardin"]);
    const cloture = amen!.parts!.find((p) => p.label === "Clôture")!;
    expect(cloture.cost).toBe(3000);
    expect(cloture.articles).toHaveLength(1);
    expect(cloture.articles![0].label).toBe("Clôture et portail");
    expect(cloture.articles![0].quantity).toBe(40);

    // Le montant entre dans le plan : 114 000 (sans la catégorie) + 4 000.
    const plan = buildConstructionPlan({ works, budget: 60000, selectedIds: null });
    expect(plan.selectedCost).toBe(118000);
    expect(plan.deferredLabels).toContain("Aménagements extérieurs");
  });

  it("récupère Études, Second œuvre et Transports depuis le Quantitatif détaillé", () => {
    const base = makeAnalysis();
    base.breakdown = base.breakdown.filter(
      (c) => c.categoryId !== "etudes" && c.categoryId !== "second_oeuvre" && c.categoryId !== "transport",
    );
    const lots: QuantitatifLot[] = [
      {
        id: "frais_preliminaires",
        name: "Frais Préliminaires et Études",
        subtotal: 5000,
        lines: [
          { designation: "Étude de sol", subcategory: "Études", quantity: 1, unit: "forfait", total: 3000 },
          { designation: "Frais de dossier", subcategory: "Frais divers", total: 2000 },
        ],
      },
      {
        id: "second_oeuvre",
        name: "Second œuvre et finitions",
        subtotal: 3000,
        lines: [
          { designation: "Nettoyage fin de chantier", subcategory: "Nettoyage", total: 1000 },
          { designation: "Finitions diverses", subcategory: "Finitions", total: 2000 },
        ],
      },
      {
        id: "transport",
        name: "Transports & autres",
        subtotal: 1500,
        lines: [{ designation: "Transport gravats", subcategory: "Transport", total: 1500 }],
      },
    ];

    const works = deriveWorks(base, lots);
    const etudes = works.find((w) => w.id === "w:etudes");
    expect(etudes?.cost).toBe(5000);
    expect(etudes?.parts?.map((p) => p.label)).toEqual(["Études", "Frais divers"]);
    expect(etudes?.parts?.[0].articles?.[0].label).toBe("Étude de sol");

    const second = works.find((w) => w.id === "w:second_oeuvre");
    expect(second?.label).toBe("Second œuvre et finitions");
    expect(second?.cost).toBe(3000);
    expect(second?.parts?.map((p) => p.label)).toEqual(["Nettoyage", "Finitions"]);

    const transport = works.find((w) => w.id === "w:transport");
    expect(transport?.label).toBe("Transports & autres");
    expect(transport?.cost).toBe(1500);
    expect(transport?.parts?.[0].articles?.[0].cost).toBe(1500);
  });

  it("ajoute les ARTICLES des Études & frais préliminaires depuis le Quantitatif détaillé", () => {
    // Le poste existe déjà (montant global de la décomposition du coût) : ses
    // articles viennent du Quantitatif détaillé, sans changer son montant.
    const lots: QuantitatifLot[] = [
      {
        id: "frais_preliminaires",
        name: "Frais Préliminaires et Études",
        subtotal: 5000,
        lines: [
          { designation: "Étude de sol", subcategory: "Études", quantity: 1, unit: "forfait", total: 3000 },
          { designation: "Frais de dossier", subcategory: "Frais divers", total: 2000 },
        ],
      },
    ];

    const works = deriveWorks(makeAnalysis(), lots);
    const etudes = works.find((w) => w.id === "w:etudes")!;

    // Montant du poste inchangé (aucun double comptage).
    expect(etudes.cost).toBe(5000);
    expect(etudes.parts?.map((p) => p.label)).toEqual(["Études", "Frais divers"]);
    expect(etudes.parts?.map((p) => p.articles?.map((a) => a.label))).toEqual([
      ["Étude de sol"],
      ["Frais de dossier"],
    ]);
    // Les articles couvrent exactement le poste (allocation séquentielle).
    expect(etudes.parts!.reduce((s, p) => s + p.cost, 0)).toBe(5000);
    for (const part of etudes.parts!) {
      expect(part.articles!.reduce((s, a) => s + a.cost, 0)).toBe(part.cost);
    }

    const plan = buildConstructionPlan({ works, budget: 60000, selectedIds: null });
    const row = plan.works.find((w) => w.id === "w:etudes")!;
    expect(row.status).toBe("realisable");
    // Poste intégralement financé : chaque article l'est aussi.
    expect(row.parts?.flatMap((p) => p.articles ?? []).every((a) => a.status === "realisable")).toBe(true);
  });

  it("répartit le détail du Quantitatif sur le montant du poste quand ils diffèrent", () => {
    const lots: QuantitatifLot[] = [
      {
        id: "frais_preliminaires",
        name: "Frais Préliminaires et Études",
        subtotal: 9000,
        lines: [
          { designation: "Étude de sol", subcategory: "Études", total: 6000 },
          { designation: "Frais de dossier", subcategory: "Frais divers", total: 3000 },
        ],
      },
    ];

    const etudes = deriveWorks(makeAnalysis(), lots).find((w) => w.id === "w:etudes")!;
    // Le montant du poste reste celui de la décomposition du coût (5 000) :
    // les articles sont répartis au prorata, aucune ligne n'est inventée.
    expect(etudes.cost).toBe(5000);
    expect(etudes.parts!.map((p) => p.cost)).toEqual([3333.33, 1666.67]);
    expect(etudes.parts!.reduce((s, p) => s + p.cost, 0)).toBe(5000);
  });

  it("ne reprend pas le Quantitatif quand la décomposition du coût porte déjà le poste", () => {
    const lots: QuantitatifLot[] = [
      {
        id: "frais_preliminaires",
        name: "Frais Préliminaires et Études",
        subtotal: 9999,
        lines: [{ designation: "Étude", subcategory: "Études", total: 9999 }],
      },
    ];
    // La fixture porte déjà les Études à 5 000 TND : le lot (9 999) ne doit
    // pas être ajouté (pas de double comptage).
    const works = deriveWorks(makeAnalysis(), lots);
    expect(works.find((w) => w.id === "w:etudes")?.cost).toBe(5000);
  });

  it("propose toujours « Aménagements extérieurs », à chiffrer si absent", () => {
    const base = makeAnalysis();
    base.breakdown = base.breakdown.filter((c) => c.categoryId !== "amenagements_exterieurs");

    const works = deriveWorks(base);
    const amenagement = works.find((w) => w.id === "w:amenagement_exterieur");
    expect(amenagement).toBeDefined();
    expect(amenagement!.label).toBe("Aménagements extérieurs");
    expect(amenagement!.cost).toBe(0);

    const plan = buildConstructionPlan({ works, budget: 60000, selectedIds: null });
    const row = plan.works.find((w) => w.id === "w:amenagement_exterieur");
    expect(row).toBeDefined();
    expect(row!.status).toBe("report");
    // Poste non chiffré : ni « à reporter » ni priorité IA, aucun montant inventé.
    expect(plan.deferredLabels).not.toContain("Aménagements extérieurs");
    expect(plan.aiPriorities.some((p) => p.id === "w:amenagement_exterieur")).toBe(false);
    expect(plan.selectedCost).toBe(114000);
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
    // +10 000 TND sur 118 000 TND de programme → 70 000 → 59,3 % du programme.
    expect(steps[0].globalPct).toBeCloseTo(59.3, 0);
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

  it("intègre les travaux personnalisés (dont panneaux solaires) à chaque scénario", () => {
    const rows = compareScenarioCapacity(
      60000,
      [
        { key: "economique", label: "Économique", totalCost: 90000 },
        { key: "premium", label: "Premium", totalCost: 180000 },
      ],
      90,
      15000,
    );
    // Le montant est ajouté au scénario Économique comme aux autres.
    expect(rows[0].baseCost).toBe(90000);
    expect(rows[0].extraCost).toBe(15000);
    expect(rows[0].totalCost).toBe(105000);
    expect(rows[0].capacityPct).toBeCloseTo(57.1, 1);
    expect(rows[0].missing).toBe(45000);
    // Le coût au m² reste celui de la construction seule.
    expect(rows[0].perSqm).toBe(1000);
    expect(rows[1].totalCost).toBe(195000);

    // Sans travaux personnalisés : coût total = coût de construction.
    const plain = compareScenarioCapacity(60000, [
      { key: "standard", label: "Standard", totalCost: 120000 },
    ]);
    expect(plain[0].extraCost).toBe(0);
    expect(plain[0].baseCost).toBe(120000);
    expect(plain[0].totalCost).toBe(120000);
  });
});

// ── Travaux complémentaires en fin de plan ─────────────────────────────────

describe("travaux complémentaires — emplacement dans le plan", () => {
  /** Analyse réelle : la main-d'œuvre est une catégorie de la répartition. */
  function withLabor(): BudgetAnalysis {
    const base = makeAnalysis();
    base.breakdown = [
      ...base.breakdown,
      cat("main_oeuvre", "Main-d'œuvre", 9000, [sub("mo1", "Main-d'œuvre", 9000)]),
    ];
    return base;
  }

  /** Poste personnalisé tel que le construit la carte d'aide à la décision. */
  function customItem(label: string, catalogIndex: number, cost: number): WorkItem {
    return {
      id: `cw:${label}`,
      label,
      cost,
      rank: customWorkRank(catalogIndex),
      categoryId: "custom",
      custom: true,
      parts: [
        {
          id: `cw:${label}:mat`,
          label: "Matériaux",
          cost,
          articles: [
            { id: `cw:${label}:mat:0`, label: `Article ${label}`, cost, quantity: 120, unit: "m²" },
          ],
        },
      ],
    };
  }

  function worksWithCustom(): WorkItem[] {
    return [
      ...deriveWorks(withLabor()),
      customItem("Piscine", 0, 37000),
      customItem("Garage", 1, 18000),
      customItem("Cuisine extérieure", 2, 9000),
      customItem("Jardin", 3, 6000),
    ];
  }

  it("termine le plan par les travaux complémentaires, après la main-d'œuvre", () => {
    const works = worksWithCustom();
    const plan = buildConstructionPlan({ works, budget: 500000, selectedIds: null });
    const labels = plan.works.map((w) => w.label);
    const laborAt = labels.indexOf("Main-d'œuvre");

    expect(laborAt).toBeGreaterThanOrEqual(0);
    // Aucun travail complémentaire avant la main-d'œuvre.
    expect(labels.slice(0, laborAt + 1).every((l) => !["Piscine", "Garage", "Cuisine extérieure", "Jardin"].includes(l))).toBe(true);
    // Les travaux complémentaires terminent le plan, dans l'ordre du catalogue.
    expect(labels.slice(-4)).toEqual(["Piscine", "Garage", "Cuisine extérieure", "Jardin"]);
  });

  it("place « Main-d'œuvre » juste APRÈS « Second œuvre et finitions », catégories indépendantes", () => {
    const analysis = makeAnalysis();
    // Une catégorie « Second œuvre et finitions » agrégée (poste canonique) et
    // une catégorie « Main-d'œuvre » distincte : elles ne sont pas fusionnées.
    analysis.breakdown = [
      cat("second_oeuvre", "Second œuvre et finitions", 62000, []),
      // Deux sous-catégories de main-d'œuvre : elles restent groupées.
      cat("main_oeuvre", "Main-d'œuvre", 9000, [
        sub("mo1", "Main-d'œuvre", 9000),
        sub("mo2", "Dépose et démolition", 1500),
      ]),
      cat("revetements", "Revêtements", 8000, [sub("r1", "Carrelage sol", 8000)]),
    ];

    const works = deriveWorks(analysis);
    const labels = works.map((w) => w.label);
    const secondAt = labels.indexOf("Second œuvre et finitions");
    const laborAt = labels.indexOf("Main-d'œuvre");
    const revetementsAt = labels.indexOf("Revêtements");

    expect(secondAt).toBeGreaterThanOrEqual(0);
    // La main-d'œuvre suit immédiatement le second œuvre et reste groupée.
    expect(labels.slice(secondAt + 1, secondAt + 3)).toEqual(["Main-d'œuvre", "Dépose et démolition"]);
    expect(laborAt).toBe(secondAt + 1);
    expect(revetementsAt).toBeGreaterThan(laborAt);
    // Catégories indépendantes : deux postes, deux montants distincts.
    expect(works.find((w) => w.id === "w:second_oeuvre")?.cost).toBe(62000);
    expect(works.find((w) => w.label === "Main-d'œuvre")?.cost).toBe(9000);

    const plan = buildConstructionPlan({ works, budget: 500000, selectedIds: null });
    expect(plan.works.map((w) => w.id)).toEqual(works.map((w) => w.id));
  });

  it("garde les travaux complémentaires en dernière position, sans doublon", () => {
    const works = worksWithCustom();
    const plan = buildConstructionPlan({ works, budget: 500000, selectedIds: null });
    const ids = plan.works.map((w) => w.id);

    expect(new Set(ids).size).toBe(ids.length);
    const customIds = ids.filter((id) => id.startsWith("cw:"));
    expect(customIds).toHaveLength(4);
    // Les 4 derniers postes du plan sont exactement les travaux complémentaires.
    expect(ids.slice(-4)).toEqual(customIds);
  });

  it("conserve les montants : le total du programme inclut les travaux complémentaires", () => {
    const base = deriveWorks(withLabor());
    const works = worksWithCustom();
    const plan = buildConstructionPlan({ works, budget: 500000, selectedIds: null });
    const baseCost = base.reduce((s, w) => s + w.cost, 0);

    expect(plan.selectedCost).toBeCloseTo(baseCost + 37000 + 18000 + 9000 + 6000, 2);
    // Chaque travail complémentaire est compté une seule fois, à son montant.
    const customSum = plan.works.filter((w) => w.custom).reduce((s, w) => s + w.cost, 0);
    expect(customSum).toBe(70000);
    // Le budget est engagé dans l'ordre affiché : les travaux complémentaires
    // ne sont financés qu'après les postes de construction et la main-d'œuvre.
    const tight = buildConstructionPlan({ works, budget: baseCost, selectedIds: null });
    expect(tight.works.filter((w) => w.custom).every((w) => w.funded === 0)).toBe(true);
    expect(tight.funded).toBeCloseTo(baseCost, 2);
  });

  it("place aussi les travaux complémentaires après toute catégorie non reconnue", () => {
    // Catégorie sans rang dédié : rang maximal des postes dérivés (500 + index).
    const base = withLabor();
    base.breakdown = [
      ...base.breakdown,
      cat("divers_speciaux", "Travaux spéciaux", 3000, [sub("x1", "Poste spécial", 3000)]),
    ];
    const works = [...deriveWorks(base), customItem("Piscine", 0, 37000)];
    const plan = buildConstructionPlan({ works, budget: 500000, selectedIds: null });

    expect(CUSTOM_WORK_RANK).toBeGreaterThan(500);
    expect(plan.works[plan.works.length - 1].label).toBe("Piscine");
    expect(plan.works.some((w) => w.label === "Poste spécial")).toBe(true);
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
