import { describe, it, expect } from "vitest";
import {
  generateRoadmap,
  buildPlanning,
  estimateDurationDays,
  computeProgress,
  buildSiteRiskAnalysis,
  rebalanceBudgetRows,
  fmtTnd,
  fmtDays,
  type RoadmapProjectInput,
  type SiteControlData,
  type StepStatus,
} from "./roadmapEngine";
import { TUNISIA_ADMIN_STEPS, CONSTRUCTION_STEPS } from "./roadmapData";

// ── Projet complet type (résultat d'estimation) ──
function fullProject(): RoadmapProjectInput {
  return {
    _id: "proj_1",
    name: "Villa test à Nabeul",
    category: "villa",
    region: "nabeul",
    surface: 180,
    surfaceTotale: 600,
    floors: 2,
    bedrooms: 4,
    files: [{ name: "photo.jpg", type: "image/jpeg" }],
    aiAnalysis: { confidence: 0.82, estimatedDuration: "6 mois" },
    costEstimate: {
      totalCost: 320000,
      costPerSquareMeter: 1778,
      contingencyBuffer: 16000,
      contingencyPercentage: 5,
      breakdown: [
        { category: "gros_oeuvre", label: "Gros œuvre", estimatedCost: 128000, percentage: 40, items: [{ name: "Béton dosé", quantity: 120, unit: "m³", unitPrice: 380, totalPrice: 45600 }] },
        { category: "second_oeuvre", label: "Second œuvre & matériaux", estimatedCost: 96000, percentage: 30, items: [] },
      ],
      budgetScenarios: {
        economique: { totalCost: 272000, costPerM2: 1511, label: "Économique", multiplier: 0.85 },
        standard: { totalCost: 320000, costPerM2: 1778, label: "Standard", multiplier: 1 },
        premium: { totalCost: 416000, costPerM2: 2311, label: "Premium", multiplier: 1.3 },
      },
    },
    providerRecommendations: { providers: [{ type: "entreprise_generale", label: "Entreprise générale", priority: "essentiel" }] },
  };
}

const minimalProject = (): RoadmapProjectInput => ({
  _id: "proj_2",
  name: "Projet minimal",
  category: "maison",
});

describe("generateRoadmap", () => {
  it("génère les 10 phases, 15 démarches et 18 étapes de construction", () => {
    const r = generateRoadmap(fullProject());
    expect(r.phases).toHaveLength(10);
    expect(r.adminSteps).toHaveLength(TUNISIA_ADMIN_STEPS.length);
    expect(r.construction).toHaveLength(CONSTRUCTION_STEPS.length);
    expect(r.budget.scenarios).toHaveLength(3);
    expect(r.documents.length).toBeGreaterThanOrEqual(12);
  });

  it("ordonne les scénarios budgétaires : économique < standard < premium", () => {
    const r = generateRoadmap(fullProject());
    const [eco, std, pre] = r.budget.scenarios;
    expect(eco.totalCost).toBeLessThan(std.totalCost);
    expect(std.totalCost).toBeLessThan(pre.totalCost);
    expect(eco.costPerM2).toBeLessThan(pre.costPerM2);
  });

  it("importe les informations du projet (surface, région, catégorie)", () => {
    const r = generateRoadmap(fullProject());
    expect(r.project.surface).toBe(180);
    expect(r.project.surfaceTotale).toBe(600);
    expect(r.project.regionLabel).toBe("Nabeul");
    expect(r.project.categoryLabel).toBe("Villa");
    const terrain = r.phases.find((p) => p.id === "phase_01")!;
    const situation = terrain.items.find((i) => i.id === "situation");
    const surface = terrain.items.find((i) => i.id === "surface");
    expect(situation?.status).toBe("done");
    expect(surface?.status).toBe("done");
    expect(r.progress).toBeGreaterThan(0);
  });

  it("fonctionne avec un projet minimal (fallbacks)", () => {
    const r = generateRoadmap(minimalProject());
    expect(r.budget.totalCost).toBeGreaterThan(0);
    expect(r.planning.length).toBeGreaterThan(0);
    expect(r.omissions.red.length).toBeGreaterThan(0);
    expect(r.summary.plannedDurationDays).toBeGreaterThan(0);
  });

  it("prévoit un budget par poste dont la somme ≈ 100 %", () => {
    const r = generateRoadmap(fullProject());
    for (const s of r.budget.scenarios) {
      const total = s.rows.reduce((a, row) => a + row.pct, 0);
      expect(total).toBeGreaterThanOrEqual(98);
      expect(total).toBeLessThanOrEqual(102);
    }
  });
});

describe("rebalanceBudgetRows (répartition modifiable en temps réel)", () => {
  it("renormalise les autres postes pour conserver 100 %", () => {
    const r = generateRoadmap(fullProject());
    const sc = r.budget.scenarios.find((s) => s.key === "standard")!;
    const rows = rebalanceBudgetRows(sc.rows, sc.rows[0].key, 50, sc.totalCost);
    expect(rows.find((row) => row.key === sc.rows[0].key)?.pct).toBe(50);
    expect(rows.reduce((a, row) => a + row.pct, 0)).toBe(100);
    expect(rows.reduce((a, row) => a + row.amount, 0)).toBe(sc.totalCost);
  });

  it("préserve l'ordre des postes et recalcule les montants", () => {
    const r = generateRoadmap(fullProject());
    const sc = r.budget.scenarios.find((s) => s.key === "premium")!;
    const keys = sc.rows.map((row) => row.key);
    const rows = rebalanceBudgetRows(sc.rows, keys[keys.length - 1], 15, sc.totalCost);
    expect(rows.map((row) => row.key)).toEqual(keys);
    expect(rows[keys.length - 1].pct).toBe(15);
    expect(rows[keys.length - 1].amount).toBe(Math.round((sc.totalCost * 15) / 100));
    expect(Math.abs(rows.reduce((a, row) => a + row.amount, 0) - sc.totalCost)).toBeLessThanOrEqual(2);
  });

  it("gère les extrêmes (0 % et 100 %)", () => {
    const r = generateRoadmap(fullProject());
    const sc = r.budget.scenarios[0];
    const keys = sc.rows.map((row) => row.key);
    const a = rebalanceBudgetRows(sc.rows, keys[0], 100, sc.totalCost);
    expect(a.find((row) => row.key === keys[0])?.pct).toBe(100);
    expect(a.filter((row) => row.key !== keys[0]).every((row) => row.pct === 0)).toBe(true);
    const b = rebalanceBudgetRows(sc.rows, keys[0], 0, sc.totalCost);
    expect(b.find((row) => row.key === keys[0])?.pct).toBe(0);
    expect(b.reduce((acc, row) => acc + row.pct, 0)).toBe(100);
  });

  it("retourne les lignes inchangées pour un poste inconnu ou un total nul", () => {
    const r = generateRoadmap(fullProject());
    const sc = r.budget.scenarios[1];
    expect(rebalanceBudgetRows(sc.rows, "inconnu", 50, sc.totalCost)).toEqual(sc.rows);
    expect(rebalanceBudgetRows(sc.rows, sc.rows[0].key, 50, 0)).toEqual(sc.rows);
  });
});

describe("buildPlanning / estimateDurationDays", () => {
  it("enchaîne les tâches sans chevauchement et avec dépendances", () => {
    const tasks = buildPlanning(320000, 180, 2);
    expect(tasks.length).toBe(CONSTRUCTION_STEPS.length);
    for (let i = 1; i < tasks.length; i++) {
      expect(tasks[i].startDay).toBe(tasks[i - 1].endDay);
      expect(tasks[i].dependencies).toContain(tasks[i - 1].id);
    }
    expect(tasks[0].startDay).toBe(0);
    const total = tasks.reduce((a, t) => a + t.durationDays, 0);
    expect(tasks[tasks.length - 1].endDay).toBe(total);
  });

  it("estime une durée raisonnable selon la surface", () => {
    const d1 = estimateDurationDays(200000, 100, 1);
    const d2 = estimateDurationDays(800000, 300, 3);
    expect(d1).toBeGreaterThanOrEqual(60);
    expect(d2).toBeGreaterThan(d1);
  });
});

describe("computeProgress", () => {
  it("retourne un pourcentage entre 0 et 100 et 100 quand tout est terminé", () => {
    const r = generateRoadmap(fullProject());
    expect(r.progress).toBeGreaterThanOrEqual(0);
    expect(r.progress).toBeLessThanOrEqual(100);

    const done = r.phases.map((p) => ({ ...p, items: p.items.map((i) => ({ ...i, status: "done" as StepStatus })), progress: 100, status: "done" as const }));
    const tasksDone = r.planning.map((t) => ({ ...t, progress: 100, status: "done" as const }));
    const constructionDone = r.construction.map((c) => ({ ...c, status: "done" as StepStatus }));
    const adminDone = r.adminSteps.map((a) => ({ ...a, status: "done" as StepStatus }));
    expect(computeProgress(done as any, tasksDone, constructionDone, adminDone)).toBe(100);
  });
});

describe("buildOmissions", () => {
  it("signale les éléments complets pour un projet riche", () => {
    const r = generateRoadmap(fullProject());
    expect(r.omissions.green.length).toBeGreaterThanOrEqual(3);
    expect(r.omissions.priorityActions.length).toBeGreaterThan(0);
  });

  it("signale les éléments manquants pour un projet minimal", () => {
    const r = generateRoadmap(minimalProject());
    expect(r.omissions.red.some((x) => x.includes("Surface construite manquante"))).toBe(true);
    expect(r.omissions.red.some((x) => x.includes("Estimation de coût absente"))).toBe(true);
    expect(r.omissions.orange.some((x) => x.includes("Localisation non renseignée"))).toBe(true);
  });
});

describe("buildSiteRiskAnalysis (Diagnostic IA du chantier)", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = 1_800_000_000_000;
  const startDate = now - 40 * DAY; // chantier démarré il y a 40 jours

  it("détecte dépassement budgétaire, problème critique et retard", () => {
    const r = generateRoadmap(fullProject());
    const control: SiteControlData = {
      photos: [],
      issues: [{ id: "i1", title: "Fissure sur voile", severity: "critical", description: "", status: "ouvert", createdAt: now }],
      observations: [],
      expenses: [{ id: "e1", label: "Béton", amount: r.budget.totalCost + 50_000, category: "Gros œuvre", date: now }],
    };
    const analysis = buildSiteRiskAnalysis(r.budget, r.planning, r.construction, control, r.progress, {
      now,
      startDate,
      plannedDurationDays: r.summary.plannedDurationDays,
    });
    expect(analysis.anomalies.some((a) => a.id === "budget_depasse" && a.severity === "critical")).toBe(true);
    expect(analysis.anomalies.some((a) => a.id === "probleme_critique" && a.severity === "critical")).toBe(true);
    expect(analysis.anomalies.some((a) => a.id === "retard_chantier")).toBe(true);
    expect(analysis.score).toBeGreaterThanOrEqual(28);
    expect(["faible", "modéré", "élevé"]).toContain(analysis.level);
    expect(analysis.summary.length).toBeGreaterThan(0);
    expect(analysis.updatedAt).toBe(now);
  });

  it("signale un chantier sain : aucune anomalie critique, points forts présents", () => {
    const r = generateRoadmap(fullProject());
    const control: SiteControlData = {
      photos: [{ id: "p1", caption: "Fondations", addedAt: now }],
      issues: [{ id: "i1", title: "Joint à reprendre", severity: "warning", description: "", status: "résolu", createdAt: now }],
      observations: [{ id: "o1", text: "Béton conforme", createdAt: now }],
      expenses: [{ id: "e1", label: "Fondations", amount: 20_000, category: "Gros œuvre", date: now }],
    };
    const analysis = buildSiteRiskAnalysis(r.budget, r.planning, r.construction, control, r.progress, {
      now: startDate, // pas de temps écoulé → pas de retard
      startDate,
      plannedDurationDays: r.summary.plannedDurationDays,
    });
    expect(analysis.anomalies.filter((a) => a.severity === "critical")).toHaveLength(0);
    expect(analysis.strengths.length).toBeGreaterThan(0);
    expect(analysis.level).toBe("faible");
  });

  it("guide l'utilisateur quand le suivi est encore vierge", () => {
    const r = generateRoadmap(minimalProject());
    // Aucun temps écoulé depuis le démarrage → aucune anomalie de délai
    const analysis = buildSiteRiskAnalysis(r.budget, r.planning, r.construction, { photos: [], issues: [], observations: [], expenses: [] }, r.progress, { now: startDate, startDate });
    expect(analysis.anomalies.some((a) => a.id === "suivi_vierge" && a.severity === "info")).toBe(true);
    expect(analysis.score).toBeLessThan(25);
  });

  it("intègre le diagnostic dans la feuille de route générée", () => {
    const r = generateRoadmap(fullProject());
    expect(r.control.risk).toBeDefined();
    expect(r.control.risk.score).toBeGreaterThanOrEqual(0);
    expect(r.control.risk.score).toBeLessThanOrEqual(100);
  });
});

describe("IA prédictive", () => {
  it("produit des prévisions avec confiance et hypothèses", () => {
    const r = generateRoadmap(fullProject());
    expect(r.predictions.finalCost.estimate).toBeGreaterThan(0);
    expect(r.predictions.finalCost.confidence).toBeGreaterThanOrEqual(0);
    expect(r.predictions.finalCost.confidence).toBeLessThanOrEqual(100);
    expect(r.predictions.finalCost.assumptions.length).toBeGreaterThan(0);
    expect(r.predictions.costEvolution.length).toBe(25); // aujourd'hui + 24 mois
    expect(["faible", "modéré", "élevé"]).toContain(r.predictions.budgetOverrun.value);
    expect(["faible", "modéré", "élevé"]).toContain(r.predictions.delay.value);
  });
});

describe("formatage", () => {
  it("formate les montants en TND et les durées", () => {
    expect(fmtTnd(320000)).toContain("320");
    // L'ICU du runtime rend le dinar tunisien « TND » ou « DT » selon l'environnement
    expect(fmtTnd(320000)).toMatch(/TND|DT/);
    expect(fmtDays(45)).toBe("2 mois");
    expect(fmtDays(10)).toBe("10 jours");
  });
});
