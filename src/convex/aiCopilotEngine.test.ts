import { describe, expect, it } from "vitest";
import {
  NOT_AVAILABLE,
  analyzeBudget,
  analyzeDqe,
  analyzeJourney,
  analyzeMaterials,
  analyzePlans,
  analyzeRisks,
  buildOptimizationProposals,
  buildProjectSummary,
  computeJourney,
  detectPreference,
  optimizeProject,
  quickSuggestions,
  routeQuestion,
  runCopilotAnalysis,
  type CopilotProjectContext,
} from "./aiCopilotEngine";

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
    { label: "Finitions", estimatedCost: 57000, percentage: 20, items: 7 },
  ],
  scenarios: [],
};

describe("aiCopilotEngine — fiabilité (jamais inventer une donnée)", () => {
  it("signale NOT_AVAILABLE plutôt que d'inventer une donnée absente", () => {
    const answer = buildProjectSummary(makeContext());
    expect(answer.content).toContain("Estimation");
    expect(answer.facts.find((f) => f.label === "Estimation")?.value).toBe(NOT_AVAILABLE);
    expect(answer.facts.find((f) => f.label === "Coût au m²")?.value).toBe(NOT_AVAILABLE);
    expect(answer.facts.find((f) => f.label === "DQE")?.value).toBe(NOT_AVAILABLE);
    expect(answer.missing.length).toBeGreaterThan(0);
  });

  it("qualifie chaque affirmation (data / calculation / estimate / recommendation)", () => {
    const answer = buildProjectSummary(makeContext({ cost: COST }));
    for (const f of answer.facts) {
      expect(["data", "calculation", "estimate", "recommendation"]).toContain(f.kind);
    }
    expect(answer.facts.find((f) => f.label === "Estimation")?.kind).toBe("estimate");
    expect(answer.facts.find((f) => f.label === "Avancement")?.kind).toBe("calculation");
    expect(answer.facts.find((f) => f.label === "Surface")?.kind).toBe("data");
    expect(answer.facts.find((f) => f.label === "Prochaine action suggérée")?.kind).toBe(
      "recommendation",
    );
  });

  it("utilise la devise du projet (jamais codée en dur)", () => {
    const answer = analyzeBudget(makeContext({ cost: COST, currency: "TND" }));
    expect(answer.facts.find((f) => f.label === "Coût total estimé")?.value).toContain("TND");
    const eur = analyzeBudget(makeContext({ cost: COST, currency: "EUR" }));
    expect(eur.facts.find((f) => f.label === "Coût total estimé")?.value).toContain("EUR");
    expect(eur.facts.find((f) => f.label === "Coût total estimé")?.value).not.toContain("TND");
  });
});

describe("aiCopilotEngine — analyse du budget", () => {
  it("répond sans estimation : NOT_AVAILABLE + éléments manquants", () => {
    const answer = analyzeBudget(makeContext());
    expect(answer.content).toContain(NOT_AVAILABLE);
    expect(answer.missing).toContain("Estimation des coûts");
  });

  it("explique la concentration du budget sur les lots les plus lourds", () => {
    const answer = analyzeBudget(makeContext({ cost: COST }));
    expect(answer.content).toContain("Gros œuvre");
    expect(answer.facts.find((f) => f.label === "Lot « Gros œuvre »")?.value).toContain("50");
    // Séparateurs de milliers insécables : on compare sans espaces.
    const perM2 = answer.facts.find((f) => f.label === "Coût au m²")?.value ?? "";
    expect(perM2.replace(/[\s\u202f\u00a0]/g, "")).toContain("1187");
  });

  it("détecte les écarts estimation / DQE par lot concordant", () => {
    const answer = analyzeBudget(
      makeContext({
        cost: COST,
        dqe: {
          grandTotal: 240000,
          lots: [
            { name: "Gros œuvre", subtotal: 100000, lines: 10 },
            { name: "Second œuvre", subtotal: 85500, lines: 8 },
            { name: "Finitions", subtotal: 54500, lines: 6 },
          ],
        },
      }),
    );
    expect(answer.facts.find((f) => f.label === "Écart estimation / DQE")).toBeDefined();
    expect(answer.content).toContain("Gros œuvre");
    expect(answer.content).toContain("écart");
  });

  it("ne modifie jamais l'estimation (analyse 100 % en lecture)", () => {
    const cost = JSON.parse(JSON.stringify(COST));
    const before = JSON.stringify(cost);
    analyzeBudget(makeContext({ cost }));
    expect(JSON.stringify(cost)).toBe(before);
  });
});

describe("aiCopilotEngine — DQE, matériaux, plans", () => {
  it("DQE absent → phrase exacte NOT_AVAILABLE", () => {
    expect(analyzeDqe(makeContext()).content).toContain(NOT_AVAILABLE);
  });

  it("DQE présent → totaux calculés depuis les lignes réelles", () => {
    const answer = analyzeDqe(
      makeContext({
        dqe: {
          grandTotal: 240000,
          lots: [
            { name: "Gros œuvre", subtotal: 140000, lines: 12 },
            { name: "Finitions", subtotal: 100000, lines: 8 },
          ],
        },
      }),
    );
    expect(answer.facts.find((f) => f.label === "Total DQE")?.value).toContain("240");
    expect(answer.facts.find((f) => f.label === "Nombre d'articles")?.value).toBe("20");
  });

  it("matériaux : quantifie l'économie d'une alternative réelle", () => {
    const answer = analyzeMaterials(
      makeContext({
        materials: {
          analyzedAt: 1,
          totalCost: 60000,
          missingData: [],
          categories: [
            {
              label: "Revêtements de sol",
              chosenLabel: "Carrelage grès cérame",
              cheapestLabel: "Carrelage standard",
              cheapestSaving: 4200,
            },
          ],
        },
      }),
    );
    expect(answer.content).toContain("Carrelage standard");
    const alt = answer.facts.find((f) => f.label === "Alternatives économiques");
    expect((alt?.value ?? "").replace(/[\s\u202f\u00a0]/g, "")).toContain("4200");
    expect(alt?.kind).toBe("calculation");
  });

  it("plans : calcule la cohérence des dimensions sans inventer de surfaces", () => {
    const answer = analyzePlans(makeContext({ floors: 4, surface: 240 }));
    expect(answer.facts.find((f) => f.label === "Surface par niveau")?.value).toContain("60");
    expect(answer.actions.map((a) => a.id)).toContain("plans-variant");
    // Pas de plan enregistré → jamais présenté comme disponible
    expect(answer.facts.find((f) => f.label === "Plan 2D / 3D")?.value).toContain(NOT_AVAILABLE);
  });
});

describe("aiCopilotEngine — parcours projet", () => {
  it("groupe A (villa) : étape actuelle = première étape incomplète", () => {
    const j = computeJourney(makeContext({ cost: COST }));
    expect(j.group).toBe("A");
    expect(j.stages.map((s) => s.key)).toEqual([
      "cost",
      "plans",
      "materials",
      "consult",
      "execution",
      "investment",
    ]);
    expect(j.current?.label).toBe("Plans");
    expect(j.next?.label).toBe("Choix matériaux");
  });

  it("groupe B (rénovation) : parcours réduit coût → consultation → fournisseurs", () => {
    const j = computeJourney(makeContext({ category: "rénovation" }));
    expect(j.group).toBe("B");
    expect(j.stages.map((s) => s.key)).toEqual(["cost", "consult", "suppliers"]);
  });

  it("« Où en suis-je ? » → étape actuelle, prochaine étape et action recommandée", () => {
    const answer = analyzeJourney(makeContext({ cost: COST }));
    const labels = answer.facts.map((f) => f.label);
    expect(labels).toContain("Étape actuelle");
    expect(labels).toContain("Prochaine étape");
    expect(labels).toContain("Action recommandée");
    expect(answer.actions[0].label).toBe("Continuer le Project Journey");
  });

  it("avancement = part des étapes complétées", () => {
    const j = computeJourney(
      makeContext({
        cost: COST,
        plans: { has2D: true, has3D: true, saved: true },
        materials: { analyzedAt: 1, totalCost: 1, missingData: [], categories: [] },
      }),
    );
    expect(j.progress).toBe(50);
  });
});

describe("aiCopilotEngine — risques et optimisation", () => {
  it("remonte les anomalies et la marge de sécurité basse", () => {
    const answer = analyzeRisks(
      makeContext({
        cost: { ...COST, contingencyPercentage: 2 },
        anomalies: [{ severity: "high", description: "Fondations à revoir" }],
      }),
    );
    expect(answer.content).toContain("point");
    expect(answer.facts.some((f) => f.value.includes("Fondations à revoir"))).toBe(true);
    expect(answer.facts.some((f) => f.value.includes("Marge de sécurité basse"))).toBe(true);
  });

  it("optimisation : propositions chiffrées depuis les écarts réels des matériaux", () => {
    const proposals = buildOptimizationProposals(
      makeContext({
        cost: COST,
        materials: {
          analyzedAt: 1,
          totalCost: 60000,
          missingData: [],
          categories: [
            {
              label: "Revêtements de sol",
              chosenLabel: "Carrelage grès cérame",
              cheapestLabel: "Carrelage standard",
              cheapestSaving: 4200,
            },
          ],
        },
      }),
    );
    expect(proposals[0].title).toContain("Carrelage standard");
    expect(proposals[0].potentialSaving).toBe(4200);
    expect(proposals[0].description).toContain("sous réserve de disponibilité");
  });

  it("« Appliquer » est TOUJOURS une action à confirmation explicite", () => {
    const answer = optimizeProject(makeContext({ cost: COST }));
    const apply = answer.actions.find((a) => a.label === "Appliquer");
    expect(apply?.kind).toBe("confirm");
    expect(answer.content).toContain("confirmation explicite");
  });
});

describe("aiCopilotEngine — routage et suggestions", () => {
  it("route les questions vers la bonne analyse", () => {
    expect(routeQuestion("Pourquoi mon budget est élevé ?")).toBe("budget");
    expect(routeQuestion("Optimise mon projet")).toBe("optimize");
    expect(routeQuestion("Analyse mon DQE")).toBe("dqe");
    expect(routeQuestion("Analyser mon plan")).toBe("plans");
    expect(routeQuestion("Où en suis-je ?")).toBe("journey");
    expect(routeQuestion("Quels sont les points à surveiller ?")).toBe("risks");
  });

  it("question libre → résumé du projet (pas de réponse générique)", () => {
    const answer = runCopilotAnalysis("bonjour ?", makeContext({ cost: COST }));
    expect(answer.title).toBe("État du projet");
    expect(answer.content).toContain("Villa S+3");
  });

  it("suggestions rapides adaptées aux données réellement disponibles", () => {
    const empty = quickSuggestions(makeContext()).map((s) => s.mode);
    expect(empty).not.toContain("budget");
    expect(empty).not.toContain("dqe");
    expect(empty).toContain("summary");

    const full = quickSuggestions(makeContext({ cost: COST, dqe: { grandTotal: 1, lots: [] } })).map(
      (s) => s.mode,
    );
    expect(full).toContain("budget");
    expect(full).toContain("dqe");
    expect(full).toContain("optimize");
  });

  it("détecte une préférence à mémoriser (validation utilisateur requise)", () => {
    expect(detectPreference("Pour ce projet, je préfère une finition standard.")).toBeTruthy();
    expect(detectPreference("Retiens que le budget est serré")).toBeTruthy();
    expect(detectPreference("Bonjour !")).toBeNull();
  });
});
