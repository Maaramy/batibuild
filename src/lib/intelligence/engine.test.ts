import { describe, expect, it } from "vitest";
import {
  aggregateAlerts, buildFinanceSnapshot, buildPlanning, buildPurchaseList,
  compareQuotes, computeReadiness, simulateVariants, type ProjectLite,
} from "./engine";
import { askCopilot, buildCopilotContext } from "./copilot";

// ── Projet de test (structure = sous-ensemble en lecture seule de `projects`)
const makeProject = (over: Partial<ProjectLite> = {}): ProjectLite => ({
  _id: "p1",
  name: "Villa Test",
  category: "villa",
  region: "tunis",
  surface: 200,
  floors: 2,
  files: [{ name: "plan-villa.pdf", type: "application/pdf" }],
  costEstimate: {
    totalCost: 400000,
    costPerSquareMeter: 1000,
    currency: "TND",
    breakdown: [
      { category: "materiaux", label: "Gros œuvre", estimatedCost: 200000, percentage: 50 },
      { category: "main_oeuvre", label: "Main-d'œuvre", estimatedCost: 120000, percentage: 30 },
      { category: "etudes", label: "Études", estimatedCost: 80000, percentage: 20 },
    ],
    budgetScenarios: {
      economique: { totalCost: 340000, costPerM2: 850, label: "Économique", multiplier: 0.85 },
      standard: { totalCost: 400000, costPerM2: 1000, label: "Standard", multiplier: 1 },
      premium: { totalCost: 520000, costPerM2: 1300, label: "Premium", multiplier: 1.3 },
    },
  },
  dqe: {
    lots: [
      {
        id: "lot1",
        name: "Terrassements",
        nature: "materiaux",
        subtotal: 50000,
        lines: [
          { designation: "Ciment 35 MPa", unit: "sac", quantity: 400, unitPrice: 18, total: 7200, nature: "materiaux" },
          { designation: "Main-d'œuvre terrassement", unit: "j", quantity: 10, unitPrice: 120, total: 1200, nature: "main_oeuvre" },
        ],
      },
      {
        id: "lot2",
        name: "Gros œuvre",
        nature: "materiaux",
        subtotal: 150000,
        lines: [
          { designation: "Rond à béton Ø10", unit: "ml", quantity: 2000, unitPrice: 2.5, total: 5000, nature: "materiaux" },
        ],
      },
    ],
    totals: { total: 400000, costPerM2: 1000 },
  },
  providerRecommendations: { providers: [{}, {}] },
  optimizationTips: ["Regrouper les commandes de ciment"],
  ...over,
});

// ══════════════ Finance ══════════════

describe("buildFinanceSnapshot", () => {
  it("calcule les indicateurs clés sans dépense", () => {
    const f = buildFinanceSnapshot(makeProject(), []);
    expect(f.currency).toBe("TND");
    expect(f.budgetInitial).toBe(400000);
    expect(f.depensesRealisees).toBe(0);
    expect(f.montantRestant).toBe(400000);
    expect(f.coutParM2).toBe(1000); // 200 m² × 2 étages = 400 m² → 400000/400
    expect(f.ecart).toBe(0);
  });

  it("additionne les dépenses engagées et réalisées séparément", () => {
    const f = buildFinanceSnapshot(makeProject(), [
      { id: "1", label: "Ciment", amount: 5000, lot: "lot1", date: 0, kind: "paid" },
      { id: "2", label: "Commande fer", amount: 3000, lot: "lot2", date: 0, kind: "committed" },
    ]);
    expect(f.depensesRealisees).toBe(5000);
    expect(f.depensesEngagees).toBe(3000);
    expect(f.montantRestant).toBe(395000);
  });

  it("répartit les dépenses payées par lot DQE", () => {
    const f = buildFinanceSnapshot(makeProject(), [
      { id: "1", label: "Ciment", amount: 5000, lot: "lot1", date: 0, kind: "paid" },
    ]);
    const lot1 = f.parLot.find((l) => l.lotId === "lot1");
    expect(lot1?.paye).toBe(5000);
    expect(lot1?.reste).toBe(45000);
    expect(lot1?.pctDepense).toBe(10);
  });

  it("génère une alerte quand un lot dépasse le seuil", () => {
    const f = buildFinanceSnapshot(
      makeProject(),
      [{ id: "1", label: "Tout", amount: 48000, lot: "lot1", date: 0, kind: "paid" }],
      { alertThresholdPct: 80 },
    );
    expect(f.alertes.some((a) => a.message.includes("Terrassements"))).toBe(true);
  });

  it("ne génère aucune alerte pour un projet vierge de dépenses", () => {
    const f = buildFinanceSnapshot(makeProject(), []);
    expect(f.alertes).toHaveLength(0);
  });
});

// ══════════════ Variantes ══════════════

describe("simulateVariants", () => {
  it("produit 3 variantes issues des scénarios du moteur existant", () => {
    const v = simulateVariants(makeProject());
    expect(v.map((x) => x.key)).toEqual(["economique", "standard", "premium"]);
    expect(v.find((x) => x.key === "economique")!.totalCost).toBe(340000);
    expect(v.find((x) => x.key === "premium")!.totalCost).toBe(520000);
    expect(v.find((x) => x.key === "standard")!.deltaVsCurrent).toBe(0);
  });

  it("ne modifie pas le projet (multiplicateurs appliqués à une copie)", () => {
    const p = makeProject();
    simulateVariants(p);
    expect(p.costEstimate!.totalCost).toBe(400000); // inchangé
  });
});

// ══════════════ Readiness ══════════════

describe("computeReadiness", () => {
  it("projet complet → score haut et libellé positif", () => {
    const r = computeReadiness(makeProject(), { hasGuideProgress: true, hasPlanningAnchor: true, hasPurchases: true });
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.label).toBe("Projet suffisamment préparé");
    expect(r.manquants).toHaveLength(0);
  });

  it("projet vide → score bas avec éléments manquants listés", () => {
    const r = computeReadiness({ _id: "x", name: "Vide", category: "villa" });
    expect(r.score).toBeLessThanOrEqual(15);
    expect(r.manquants).toContain("Estimation des coûts");
    expect(r.manquants).toContain("DQE (quantitatif détaillé)");
  });
});

// ══════════════ Planning ══════════════

describe("buildPlanning", () => {
  const steps = [
    { id: "s1", title: "Préparation", dureeJours: 5, status: "done" },
    { id: "s2", title: "Fondations", dureeJours: 10, status: "in_progress" },
    { id: "s3", title: "Structure", dureeJours: 20, status: "todo" },
  ];

  it("enchâîne les tâches sans chevauchement", () => {
    const p = buildPlanning(steps, null);
    expect(p.totalDays).toBe(35);
    expect(p.tasks[1].startDay).toBe(6);
    expect(p.tasks[2].startDay).toBe(16);
  });

  it("calcule la progression (100/50/0 pondérés)", () => {
    const p = buildPlanning(steps, null);
    expect(p.progressPct).toBe(50); // (100 + 50 + 0) / 3
  });

  it("détecte les retards quand l'ancrage est dans le passé", () => {
    const past = Date.now() - 60 * 86400000;
    const p = buildPlanning(steps, past);
    expect(p.lateTasks).toContain("Structure");
  });
});

// ══════════════ Achats ══════════════

describe("buildPurchaseList", () => {
  it("dérive les matériaux du DQE, sans les autres natures", () => {
    const items = buildPurchaseList(makeProject());
    expect(items.map((i) => i.designation)).toEqual(["Ciment 35 MPa", "Rond à béton Ø10"]);
  });

  it("applique les statuts sauvegardés sans toucher le DQE", () => {
    const p = makeProject();
    const key = "lot1::ciment 35 mpa";
    const items = buildPurchaseList(p, { [key]: "received" });
    expect(items.find((i) => i.key === key)!.status).toBe("received");
    expect(p.dqe!.lots![0].lines[0]).toEqual({
      designation: "Ciment 35 MPa", unit: "sac", quantity: 400, unitPrice: 18, total: 7200, nature: "materiaux",
    });
  });
});

// ══════════════ Comparateur de devis ══════════════

describe("compareQuotes", () => {
  it("détecte les écarts de total > 30 %", () => {
    const c = compareQuotes([
      { id: "a", supplierName: "A", totalAmount: 100000, delayDays: 30, laborIncluded: true, lines: [], createdAt: 0 },
      { id: "b", supplierName: "B", totalAmount: 150000, delayDays: 40, laborIncluded: true, lines: [], createdAt: 0 },
    ]);
    expect(c.findings.some((f) => f.message.includes("50 %"))).toBe(true);
  });

  it("signale la main-d'œuvre manquante sans désigner de meilleur fournisseur", () => {
    const c = compareQuotes([
      { id: "a", supplierName: "A", totalAmount: 100000, delayDays: null, laborIncluded: false, lines: [], createdAt: 0 },
      { id: "b", supplierName: "B", totalAmount: 100000, delayDays: null, laborIncluded: true, lines: [], createdAt: 0 },
    ]);
    expect(c.findings.some((f) => f.message.includes("main-d'œuvre"))).toBe(true);
    expect(c.findings.every((f) => !/meilleur/i.test(f.message))).toBe(true);
  });

  it("un seul devis → aucune conclusion hasardeuse", () => {
    const c = compareQuotes([
      { id: "a", supplierName: "A", totalAmount: 100000, delayDays: 30, laborIncluded: true, lines: [], createdAt: 0 },
    ]);
    expect(c.findings).toHaveLength(0);
    expect(c.missingItems).toHaveLength(0);
  });
});

// ══════════════ Alertes ══════════════

describe("aggregateAlerts", () => {
  it("agrège toutes les sources avec niveaux corrects", () => {
    const a = aggregateAlerts({
      finance: [{ level: "important", message: "Budget dépassé" }],
      planning: { lateTasks: ["Toiture"] },
      pricePredictions: [{ material: "Ciment", trend: "hausse", predictedChangePct: 5 }],
    });
    expect(a.some((x) => x.source === "finance" && x.level === "important")).toBe(true);
    expect(a.some((x) => x.source === "planning")).toBe(true);
    expect(a.some((x) => x.source === "prices")).toBe(true);
  });

  it("ignore les hausses de prix faibles (<3 %)", () => {
    const a = aggregateAlerts({
      pricePredictions: [{ material: "Ciment", trend: "hausse", predictedChangePct: 1 }],
    });
    expect(a).toHaveLength(0);
  });
});

// ══════════════ Copilote ══════════════

describe("askCopilot", () => {
  const ctx = () =>
    buildCopilotContext({
      project: makeProject(),
      projectName: "Villa Test",
      expenses: [],
      currency: "TND",
      remainingSteps: ["Structure", "Toiture"],
      guideProgressPct: 40,
    });

  it("explique le budget à partir des postes réels", () => {
    const a = askCopilot("Pourquoi mon budget est-il élevé ?", ctx());
    expect(a.paragraphs.join(" ")).toContain("Gros œuvre");
    expect(a.sources).toContain("Estimation du projet (coût détaillé)");
  });

  it("propose des réductions basées sur les scénarios existants", () => {
    const a = askCopilot("Comment réduire le coût du projet ?", ctx());
    expect(a.paragraphs.join(" ")).toContain("Économique");
    // Le formateur Intl utilise des espaces insécables : on teste via une regex
    expect(a.paragraphs.join(" ")).toMatch(/60\s000/); // 400000 - 340000
    expect(a.paragraphs.join(" ")).toContain("15 %");
  });

  it("cite les matériaux du DQE", () => {
    const a = askCopilot("Quels matériaux sont adaptés ?", ctx());
    expect(a.paragraphs.join(" ")).toContain("Ciment 35 MPa");
  });

  it("liste les étapes restantes du guide", () => {
    const a = askCopilot("Quelles étapes restent à réaliser ?", ctx());
    expect(a.paragraphs.join(" ")).toContain("Structure");
    expect(a.paragraphs.join(" ")).toContain("40 %");
  });

  it("identifie les éléments manquants d'un projet incomplet", () => {
    const a = askCopilot("Mon projet est-il incomplet ?", ctx());
    // Le projet de test n'a pas d'analyse IA → 1 élément manquant détecté
    expect(a.paragraphs.join(" ")).toContain("manquant");
    expect(a.paragraphs.join(" ")).toContain("analyse IA");
  });

  it("confirme qu'un projet complet est prêt pour l'exécution", () => {
    const c = buildCopilotContext({
      project: makeProject({ aiAnalysis: { estimatedDuration: "180 jours" } }),
      projectName: "Villa Test",
      expenses: [],
      currency: "TND",
    });
    const a = askCopilot("Mon projet est-il incomplet ?", c);
    expect(a.paragraphs.join(" ")).toContain("est complet");
  });

  it("ne modifie jamais rien : suggestions seulement", () => {
    const a = askCopilot("Comment réduire le coût du projet ?", ctx());
    expect(a.actionSuggested.kind).toBe("open_tab");
  });

  it("réponse de repli pour une question hors périmètre", () => {
    const a = askCopilot("Quel temps fera-t-il demain ?", ctx());
    expect(a.paragraphs.join(" ")).toContain("budget");
  });

  it("gère un projet sans estimation (aucune donnée inventée)", () => {
    const c = buildCopilotContext({ project: makeProject({ costEstimate: undefined }), projectName: "Vide", expenses: [], currency: "TND" });
    const a = askCopilot("Pourquoi mon budget est-il élevé ?", c);
    expect(a.paragraphs.join(" ")).toContain("n'a pas encore d'estimation");
  });
});
