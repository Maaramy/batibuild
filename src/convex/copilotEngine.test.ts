import { describe, expect, it } from "vitest";
import {
  analyzeBudget,
  analyzeDqe,
  buildRecommendations,
  catalogByCategory,
  catalogQuestions,
  computePreparationScore,
  PREPARATION_WEIGHTS,
  type CopilotProjectContext,
} from "./aiCopilotEngine";
import { FutureAICopilot, RuleBasedCopilot, getCopilotEngine } from "./copilotEngine";

function makeContext(overrides: Partial<CopilotProjectContext> = {}): CopilotProjectContext {
  return {
    projectId: "proj1" as any,
    name: "Villa S+3",
    category: "villa",
    region: "Tunis",
    city: "Tunis",
    surface: 240,
    floors: 4,
    rooms: { bedrooms: 4, bathrooms: 3, kitchens: 1, livingRooms: 2 },
    status: "analyzed",
    currency: "TND",
    cost: null,
    dqe: null,
    materials: null,
    plans: { has2D: false, has3D: false, saved: false },
    roadmap: null,
    professionals: {
      quotes: 0,
      appointments: 0,
      pendingAppointments: 0,
      recommendedProviders: 0,
    },
    investments: 0,
    anomalies: [],
    estimatedDuration: null,
    optimizationTips: [],
    technicalRecommendations: [],
    memory: [],
    ...overrides,
  };
}

const COST = {
  totalCost: 285000,
  costPerSquareMeter: 1187,
  contingencyPercentage: 8,
  breakdown: [
    { label: "Gros œuvre", estimatedCost: 142500, percentage: 50, items: 12 },
    { label: "Second œuvre", estimatedCost: 85500, percentage: 30, items: 9 },
  ],
  scenarios: [],
};

const noSpace = (s: string) => s.replace(/[\s\u202f\u00a0]/g, "");

describe("CopilotEngine — abstraction (aucun service IA externe)", () => {
  it("le moteur par défaut est le moteur à règles", () => {
    const engine = getCopilotEngine();
    expect(engine.kind).toBe("rule-based");
    expect(engine).toBeInstanceOf(RuleBasedCopilot);
  });

  it("produit une analyse locale sans narrative IA (aucun appel réseau)", async () => {
    const engine = new RuleBasedCopilot();
    const res = await engine.answer({
      question: "Analyser mon budget",
      context: makeContext({ cost: COST }),
    });
    expect(res.engine).toBe("rule-based");
    expect(res.narrative).toBeUndefined();
    expect(res.facts.length).toBeGreaterThan(0);
  });

  it("le mode « preparation » est résolu localement par le moteur", async () => {
    const res = await new RuleBasedCopilot().answer({
      question: "Indice de préparation",
      context: makeContext({ cost: COST }),
      mode: "preparation",
    });
    expect(res.title).toBe("Indice de préparation du projet");
    expect(res.facts.find((f) => f.label === "Indice de préparation")).toBeDefined();
  });

  it("le moteur IA futur ne fait aucun appel et retombe sur le moteur local", async () => {
    const res = await new FutureAICopilot().answer({
      question: "Où en est mon projet ?",
      context: makeContext({ cost: COST }),
    });
    expect(res.engine).toBe("rule-based");
    expect(res.narrative).toBeUndefined();
  });
});

describe("Copilote — indice de préparation (score déterministe)", () => {
  it("le barème totalise bien 100 points", () => {
    const sum = Object.values(PREPARATION_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it("ne compte que les éléments réellement présents", () => {
    const empty = computePreparationScore(makeContext());
    expect(empty.total).toBe(PREPARATION_WEIGHTS.projectInfo);
    expect(empty.missing).toContain("Estimation des coûts");
    expect(empty.missing).toContain("Plan 2D");
    expect(empty.missing).toContain("Planning");
  });

  it("atteint 100 lorsque tous les éléments du barème sont renseignés", () => {
    const full = computePreparationScore(
      makeContext({
        cost: COST,
        dqe: { grandTotal: 240000, lots: [{ name: "Gros œuvre", subtotal: 240000, lines: 10 }] },
        materials: { analyzedAt: 1, totalCost: 1000, missingData: [], categories: [] },
        plans: { has2D: true, has3D: true, saved: true },
        professionals: {
          quotes: 1,
          appointments: 1,
          pendingAppointments: 0,
          recommendedProviders: 1,
        },
        planning: { total: 10, done: 2, inProgress: 1, late: false, nextTask: "Fondations" },
        documents: 3,
      }),
    );
    expect(full.total).toBe(100);
    expect(full.missing).toEqual([]);
  });
});

describe("Copilote — budget réel (dépenses vs budget prévu)", () => {
  it("signale un dépassement calculé, en montant et en pourcentage", () => {
    const answer = analyzeBudget(
      makeContext({ cost: COST, budget: { planned: 300000, consumed: 330000, gap: 30000 } }),
    );
    expect(answer.content).toContain("dépasse le budget prévu");
    expect(noSpace(answer.content)).toContain("30000TND");
    expect(noSpace(answer.content)).toContain("+10%");
    expect(answer.facts.find((f) => f.label === "Dépenses enregistrées")).toBeDefined();
  });

  it("affiche la marge restante lorsqu'il n'y a pas de dépassement", () => {
    const answer = analyzeBudget(
      makeContext({ cost: COST, budget: { planned: 300000, consumed: 265000, gap: -35000 } }),
    );
    expect(answer.content).not.toContain("dépasse le budget prévu");
    expect(answer.facts.find((f) => f.label === "Écart (marge restante)")).toBeDefined();
  });

  it("reste honnête sans estimation : phrase exacte + éléments manquants", () => {
    const answer = analyzeBudget(makeContext({ budget: { planned: 100, consumed: 50, gap: -50 } }));
    expect(answer.content).toContain("n'est pas encore disponible dans votre projet");
    expect(answer.missing).toContain("Estimation des coûts");
  });
});

describe("Copilote — DQE détaillé", () => {
  it("remonte les articles sans prix / sans quantité et l'article le plus coûteux", () => {
    const answer = analyzeDqe(
      makeContext({
        dqe: { grandTotal: 240000, lots: [{ name: "Gros œuvre", subtotal: 240000, lines: 10 }] },
        dqeArticles: {
          total: 142,
          withoutPrice: 3,
          withoutQuantity: 1,
          topItem: "Béton armé",
          topItemCost: 42000,
        },
      }),
    );
    expect(answer.facts.find((f) => f.label === "Articles sans prix")?.value).toBe("3");
    expect(answer.facts.find((f) => f.label === "Article le plus coûteux")?.value).toContain(
      "Béton armé",
    );
    expect(answer.missing).toContain("3 article(s) DQE sans prix");
  });
});

describe("Copilote — recommandations par règles", () => {
  it("propose les étapes manquantes d'un projet vide", () => {
    const ids = buildRecommendations(makeContext()).map((r) => r.id);
    expect(ids).toContain("no-estimation");
    expect(ids).toContain("no-plan");
    expect(ids).toContain("no-dqe");
    expect(ids).toContain("no-materials");
    expect(ids).toContain("no-planning");
  });

  it("alerte en cas de dépassement budgétaire réel", () => {
    const recs = buildRecommendations(
      makeContext({ cost: COST, budget: { planned: 300000, consumed: 330000, gap: 30000 } }),
    );
    const overrun = recs.find((r) => r.id === "budget-overrun");
    expect(overrun?.emoji).toBe("⚠️");
    expect(noSpace(overrun?.message ?? "")).toContain("30000TND");
  });

  it("ne propose pas l'estimation quand elle existe déjà", () => {
    const ids = buildRecommendations(makeContext({ cost: COST })).map((r) => r.id);
    expect(ids).not.toContain("no-estimation");
  });
});

describe("Copilote — catalogue de questions prédéfinies", () => {
  it("n'expose que les questions dont la condition est satisfaite", () => {
    const empty = catalogQuestions(makeContext()).map((q) => q.id);
    expect(empty).toContain("project_status");
    expect(empty).toContain("plans_analysis");
    expect(empty).not.toContain("budget_analysis");
    expect(empty).not.toContain("dqe_analysis");
    expect(empty).not.toContain("planning_view");

    const withCost = catalogQuestions(makeContext({ cost: COST })).map((q) => q.id);
    expect(withCost).toContain("budget_analysis");
  });

  it("groupe les questions disponibles par catégorie", () => {
    const groups = catalogByCategory(makeContext({ cost: COST }));
    const categories = groups.map((g) => g.category);
    expect(categories).toContain("Projet");
    expect(categories).toContain("Budget");
    for (const g of groups) expect(g.questions.length).toBeGreaterThan(0);
  });
});
