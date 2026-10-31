import { describe, expect, it } from "vitest";

import {
  analyzeSiteRisk,
  budgetSummary,
  formatSiteDate,
  formatTND,
  lateTasks,
  materialLine,
  phasesForProjectType,
  plannedProgressAt,
  schedulePhases,
  taskProgress,
  weightedProgress,
} from "./siteTracking";

const DAY = 86_400_000;
const START = Date.UTC(2026, 0, 5);
const END = Date.UTC(2026, 11, 20);

describe("phases & planning", () => {
  it("donne un parcours résidentiel complet et spécifique par type", () => {
    const villa = phasesForProjectType("villa");
    expect(villa.length).toBeGreaterThanOrEqual(10);
    expect(villa[0].label).toMatch(/installation/i);
    expect(villa.some((phase) => phase.label.includes("Charpente"))).toBe(true);

    // Les types techniques suivent un parcours différent, avec le bon nombre
    // de phases mais jamais le même intitulé de départ.
    const electricite = phasesForProjectType("electricite_complete");
    const plomberie = phasesForProjectType("plomberie_complete");
    // Le tronc commun (installation, préparation) est partagé, le cœur du
    // parcours est propre au métier.
    expect(electricite.map((phase) => phase.label).join("|")).not.toBe(
      plomberie.map((phase) => phase.label).join("|"),
    );
  });

  it("planifie toutes les phases dans la période, sans dépassement", () => {
    const phases = phasesForProjectType("villa");
    const planned = schedulePhases(phases, START, END);
    expect(planned).toHaveLength(phases.length);
    expect(planned[0].startDate).toBe(START);
    expect(planned[planned.length - 1].endDate).toBe(END);
    for (let i = 1; i < planned.length; i++) {
      expect(planned[i].startDate).toBeGreaterThanOrEqual(planned[i - 1].startDate);
      expect(planned[i].endDate).toBeGreaterThanOrEqual(planned[i].startDate);
    }
  });

  it("gère une période très courte sans produire de date incohérente", () => {
    const planned = schedulePhases(phasesForProjectType("villa"), START, START + DAY);
    for (const phase of planned) {
      expect(phase.endDate).toBeGreaterThanOrEqual(phase.startDate);
      expect(phase.endDate).toBeLessThanOrEqual(START + DAY);
    }
  });
});

describe("avancement", () => {
  const tasks = [
    { weight: 3, progress: 100, status: "done", startDate: START, endDate: START + 10 * DAY },
    { weight: 1, progress: 0, status: "todo", startDate: START + 10 * DAY, endDate: START + 30 * DAY },
  ];

  it("déduit l'avancement du statut quand il n'est pas saisi", () => {
    expect(taskProgress({ status: "done" })).toBe(100);
    expect(taskProgress({ status: "in_progress" })).toBe(50);
    expect(taskProgress({ status: "todo" })).toBe(0);
    expect(taskProgress({ progress: 37 })).toBe(37);
  });

  it("pondère l'avancement global par le poids des phases", () => {
    expect(weightedProgress(tasks)).toBe(75);
    expect(weightedProgress([])).toBe(0);
  });

  it("compare l'avancement réel à l'avancement attendu", () => {
    // À mi-parcours de la première phase (50 % de la tâche de poids 3).
    const at = START + 5 * DAY;
    const expected = plannedProgressAt(tasks, at);
    expect(expected).toBeGreaterThan(0);
    expect(expected).toBeLessThan(75);
    expect(plannedProgressAt(tasks, START - DAY)).toBe(0);
    expect(plannedProgressAt(tasks, START + 40 * DAY)).toBe(100);
  });

  it("liste uniquement les tâches non terminées dont l'échéance est passée", () => {
    const named = [
      { name: "Terminée", weight: 1, progress: 100, status: "done", endDate: START - 2 * DAY },
      { name: "Retard", weight: 1, progress: 0, status: "todo", endDate: START - DAY },
      { name: "À venir", weight: 1, progress: 0, status: "todo", endDate: START + 5 * DAY },
    ];
    const late = lateTasks(named, START);
    expect(late).toHaveLength(1);
    expect(late[0].name).toBe("Retard");
  });
});

describe("budget", () => {
  it("calcule dépenses, écart et répartition", () => {
    const summary = budgetSummary({
      budgetInitial: 200000,
      budgetRevised: 220000,
      expenses: [
        { amount: 40000, category: "gros_oeuvre", nature: "materiaux" },
        { amount: 10000, category: "main_oeuvre", nature: "main_oeuvre" },
      ],
      materials: [{ plannedQty: 100, deliveredQty: 100, unitPrice: 50 }],
    });
    expect(summary.revised).toBe(220000);
    expect(summary.spent).toBe(50000);
    expect(summary.variance).toBe(170000);
    expect(summary.materialsDeliveredValue).toBe(5000);
    expect(summary.byCategory[0].amount).toBe(40000);
    expect(summary.byNature.find((row) => row.nature === "main_oeuvre")!.amount).toBe(10000);
  });

  it("signale un dépassement sans masquer le montant réel", () => {
    const summary = budgetSummary({
      budgetInitial: 1000,
      expenses: [{ amount: 1500, category: "divers", nature: "autre" }],
    });
    expect(summary.variance).toBe(-500);
    expect(summary.consumedPct).toBe(150);
  });
});

describe("matériaux", () => {
  it("signale une rupture quand la livraison ne couvre pas le besoin", () => {
    const line = materialLine({ name: "Ciment", plannedQty: 100, orderedQty: 40, deliveredQty: 20, consumedQty: 10, unitPrice: 10 });
    expect(line.alert).toBe("rupture");
    expect(line.remainingQty).toBe(90);
    expect(line.valueOrdered).toBe(400);
  });

  it("signale une sous-commande quand tout est commandé mais pas livré", () => {
    const line = materialLine({ name: "Acier", plannedQty: 100, orderedQty: 100, deliveredQty: 40, consumedQty: 0 });
    expect(line.alert).toBe("sous_commande");
  });

  it("ne signale rien quand le besoin est couvert", () => {
    const line = materialLine({ name: "Sable", plannedQty: 100, orderedQty: 100, deliveredQty: 100, consumedQty: 90 });
    expect(line.alert).toBe("ok");
    expect(line.coveragePct).toBe(100);
  });
});

describe("prévisions de risque", () => {
  const base = {
    today: START + 60 * DAY,
    startDate: START,
    expectedEndDate: END,
    budgetInitial: 200000,
    expenses: [{ amount: 60000, category: "gros_oeuvre", nature: "materiaux" }],
  };

  it("ne présente jamais une projection comme une certitude", () => {
    const risk = analyzeSiteRisk({
      ...base,
      tasks: [{ name: "Fondations", weight: 1, progress: 100, startDate: START, endDate: START + 30 * DAY }],
    });
    expect(risk.isEstimate).toBe(true);
    expect(risk.disclaimer).toMatch(/pas une certitude/i);
    expect(["faible", "moyenne", "bonne"]).toContain(risk.confidence);
  });

  it("détecte un retard et projette une fin plus tardive", () => {
    const risk = analyzeSiteRisk({
      ...base,
      tasks: [
        { name: "Gros œuvre", weight: 3, progress: 20, startDate: START, endDate: START + 45 * DAY },
        { name: "Second œuvre", weight: 1, progress: 0, startDate: START + 45 * DAY, endDate: END },
      ],
    });
    expect(risk.schedule.spi).toBeLessThan(1);
    expect(risk.schedule.projectedEndDate).not.toBeNull();
    expect(risk.schedule.delayDays).toBeGreaterThan(0);
    expect(risk.riskScore).toBeGreaterThan(0);
    expect(risk.causes.length).toBeGreaterThan(0);
    expect(risk.recommendations.length).toBeGreaterThan(0);
  });

  it("n'invente aucune projection quand aucun avancement n'est saisi", () => {
    const risk = analyzeSiteRisk({
      ...base,
      tasks: [{ name: "Fondations", weight: 1, progress: 0, startDate: START, endDate: END }],
    });
    expect(risk.budget.projectedFinalCost).toBeNull();
    expect(risk.schedule.spi).toBe(0);
  });

  it("classe un chantier sans retard en risque faible", () => {
    const risk = analyzeSiteRisk({
      ...base,
      today: START + 10 * DAY,
      tasks: [
        { name: "Études", weight: 1, progress: 100, startDate: START, endDate: START + 5 * DAY },
        { name: "Travaux", weight: 3, progress: 40, startDate: START + 5 * DAY, endDate: START + 90 * DAY },
      ],
    });
    expect(risk.schedule.delayDays).toBe(0);
    expect(risk.riskScore).toBeLessThan(50);
  });
});

describe("formatage", () => {
  it("formate les montants en dinars", () => {
    expect(formatTND(1500)).toContain("1");
    expect(formatTND(1500)).toContain("TND");
    expect(formatTND(null)).toBe("—");
  });

  it("formate les dates en français", () => {
    expect(formatSiteDate(START)).toMatch(/2026/);
    expect(formatSiteDate(null)).toBe("—");
  });
});
