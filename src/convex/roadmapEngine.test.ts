import { describe, it, expect } from "vitest";
import {
  generateRoadmap,
  buildPlanning,
  estimateDurationDays,
  computeProgress,
  buildSiteRiskAnalysis,
  rebalanceBudgetRows,
  stripImprevusFromRoadmap,
  fmtTnd,
  fmtDays,
  type RoadmapProjectInput,
  type SiteControlData,
  type StepStatus,
} from "./roadmapEngine";
import { TUNISIA_ADMIN_STEPS } from "./roadmapData";
import {
  executionContextFromProject,
  playbookForCategory,
  resolvePlaybookTasks,
} from "./roadmapPlaybooks";
import { ensureCurrentRoadmap, ROADMAP_VERSION } from "./roadmapEngine";

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
  it("génère les 10 phases, les démarches de la trame et les étapes du type de projet", () => {
    const project = fullProject();
    const r = generateRoadmap(project);
    const expectedTasks = resolvePlaybookTasks(
      playbookForCategory(project.category),
      executionContextFromProject(project),
    );
    expect(r.phases).toHaveLength(10);
    // Une villa suit la trame « résidentiel » : toutes les démarches tunisiennes.
    expect(r.adminSteps).toHaveLength(TUNISIA_ADMIN_STEPS.length);
    expect(r.construction).toHaveLength(expectedTasks.length);
    expect(r.budget.scenarios).toHaveLength(3);
    expect(r.documents.length).toBeGreaterThanOrEqual(12);
    expect(r.execution?.key).toBe("residentiel");
    expect(r.execution?.phases.length).toBeGreaterThan(0);
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
    const expected = resolvePlaybookTasks(playbookForCategory("maison"), {
      surface: 180,
      floors: 2,
      hasPool: false,
      hasExterior: true,
    });
    expect(tasks.length).toBe(expected.length);
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

describe("suppression des imprévus", () => {
  it("ne génère plus aucune ligne « Marge pour imprévus »", () => {
    const r = generateRoadmap(fullProject());
    for (const s of r.budget.scenarios) {
      expect(s.rows.some((row) => row.key === "imprevus")).toBe(false);
      expect(s.rows.reduce((a, row) => a + row.pct, 0)).toBe(100);
    }
  });

  it("le budget reprend le montant réel de l'estimation (aucune majoration)", () => {
    const input = fullProject();
    const r = generateRoadmap(input);
    expect(r.budget.scenarios[1].totalCost).toBe(input.costEstimate!.budgetScenarios!.standard.totalCost);
    expect(r.budget.totalCost).toBe(input.costEstimate!.totalCost);
  });

  it("nettoie une feuille de route enregistrée avant la suppression (idempotent)", () => {
    const input = fullProject();
    const modern = generateRoadmap(input);
    // Reconstitue l'ancien format : budget majoré + ligne « Marge pour imprévus »
    const pct = input.costEstimate?.contingencyPercentage ?? 0;
    const factor = 1 + pct / 100;
    const imprévusPct = Math.round((1 - 1 / factor) * 100);
    const legacy = {
      ...modern,
      phases: modern.phases.map((p) =>
        p.id === "phase_05"
          ? {
              ...p,
              items: p.items.map((i) =>
                i.id === "allocation"
                  ? { ...i, detail: "Gros œuvre, second œuvre, main-d'œuvre, imprévus…" }
                  : i,
              ),
            }
          : p,
      ),
      budget: {
        ...modern.budget,
        totalCost: Math.round(modern.budget.totalCost * factor),
        scenarios: modern.budget.scenarios.map((s) => ({
          ...s,
          totalCost: Math.round(s.totalCost * factor),
          costPerM2: Math.round(s.costPerM2 * factor),
          rows: [
            ...s.rows.map((row) => ({ ...row, pct: Math.round((row.pct / 100) * (100 - imprévusPct)) })),
            {
              key: "imprevus",
              label: "Marge pour imprévus",
              amount: Math.round(s.totalCost * (pct / 100)),
              pct: imprévusPct,
            },
          ],
        })),
      },
    };

    const cleaned = stripImprevusFromRoadmap(legacy, input);

    for (const s of cleaned.budget.scenarios) {
      expect(s.rows.some((row) => row.key === "imprevus")).toBe(false);
      expect(s.rows.reduce((a, row) => a + row.pct, 0)).toBe(100);
      const original = modern.budget.scenarios.find((o) => o.key === s.key)!;
      expect(s.totalCost).toBe(original.totalCost);
      expect(Math.abs(s.rows.reduce((a, row) => a + row.amount, 0) - s.totalCost)).toBeLessThanOrEqual(3);
    }
    expect(cleaned.budget.totalCost).toBe(modern.budget.totalCost);

    // Plus aucune mention d'imprévus dans les textes affichés
    const texts = [
      ...cleaned.phases.flatMap((p) => p.items.map((i) => i.detail ?? "")),
      cleaned.predictions.budgetOverrun.explanation,
      ...cleaned.control.risk.anomalies.map((a) => a.recommendation),
    ].join(" | ");
    expect(texts).not.toMatch(/imprévu/i);

    // Idempotente : une seconde passe ne change plus rien
    expect(stripImprevusFromRoadmap(cleaned, input)).toEqual(cleaned);
  });
});

// ============================================================================
// STRUCTURES D'EXÉCUTION PAR TYPE DE PROJET
// ----------------------------------------------------------------------------
// Chaque type enregistré doit produire SA propre trame : phases, tâches,
// démarches et études adaptées, sans jamais mélanger deux métiers.
// ============================================================================

describe("trames d'exécution par type de projet", () => {
  const baseProject = (category: string, extra: Partial<RoadmapProjectInput> = {}): RoadmapProjectInput => ({
    _id: `proj_${category}`,
    name: `Projet ${category}`,
    category,
    region: "ariana",
    surface: 100,
    surfaceTotale: 300,
    floors: 1,
    costEstimate: {
      totalCost: 120_000,
      costPerSquareMeter: 1200,
      breakdown: [
        {
          category: "gros_oeuvre",
          label: "Gros œuvre",
          estimatedCost: 60_000,
          percentage: 50,
          items: [
            { name: "Béton dosé 350", quantity: 24, unit: "m³", unitPrice: 380, totalPrice: 9120 },
            { name: "Acier HA", quantity: 1200, unit: "kg", unitPrice: 4, totalPrice: 4800 },
          ],
        },
        { category: "second_oeuvre", label: "Second œuvre", estimatedCost: 60_000, percentage: 50 },
      ],
      budgetScenarios: {
        economique: { totalCost: 102_000, costPerM2: 1020, label: "Économique", multiplier: 0.85 },
        standard: { totalCost: 120_000, costPerM2: 1200, label: "Standard", multiplier: 1 },
        premium: { totalCost: 156_000, costPerM2: 1560, label: "Premium", multiplier: 1.3 },
      },
    },
    ...extra,
  });

  const titles = (r: ReturnType<typeof generateRoadmap>) => r.construction.map((c) => c.title).join(" | ");

  const CATEGORIES = [
    "maison",
    "villa",
    "appartement",
    "studio",
    "duplex",
    "immeuble",
    "local_commercial",
    "bureau",
    "entrepot",
    "cafe",
    "restaurant",
    "residence_touristique",
    "piscine",
    "renovation_cuisine",
    "renovation_salle_de_bain",
  ] as const;

  it.each(CATEGORIES)("« %s » : structure cohérente, unique et chiffrée", (category) => {
    const project = baseProject(category);
    const r = generateRoadmap(project);
    const playbook = playbookForCategory(category);

    expect(r.version).toBe(ROADMAP_VERSION);
    expect(r.execution?.key).toBe(playbook.key);
    expect(r.construction.length).toBeGreaterThan(0);
    expect(r.planning.length).toBe(r.construction.length);

    // Aucune tâche en double, aucun groupe vide.
    const taskTitles = r.construction.map((c) => c.title);
    expect(new Set(taskTitles).size).toBe(taskTitles.length);
    expect(r.execution!.phases.every((p) => p.taskIds.length > 0)).toBe(true);
    expect(r.execution!.phases.reduce((acc, p) => acc + p.taskIds.length, 0)).toBe(r.construction.length);

    // Planning et étapes partagent les mêmes identifiants, dans le même ordre.
    expect(r.planning.map((t) => t.id)).toEqual(r.construction.map((c) => c.id));
    for (let i = 1; i < r.planning.length; i++) {
      expect(r.planning[i].startDay).toBe(r.planning[i - 1].endDay);
    }

    // Budget réparti sans ajouter ni perdre un dinar.
    const constructionBudget = r.construction.reduce((acc, c) => acc + c.budgetEstime, 0);
    expect(Math.abs(constructionBudget - r.budget.totalCost)).toBeLessThanOrEqual(2);

    // Les articles réellement chiffrés remontent en matériaux prévus.
    expect(r.materials?.some((m) => m.name === "Béton dosé 350" && m.quantity === 24)).toBe(true);
  });

  it("n'utilise jamais la trame d'un autre type de projet", () => {
    const piscine = generateRoadmap(baseProject("piscine", { surface: 32 }));
    expect(titles(piscine)).toMatch(/Filtration/);
    expect(titles(piscine)).not.toMatch(/Escalier|Charpente|Cloisons/);

    const cuisine = generateRoadmap(baseProject("renovation_cuisine", { surface: 10 }));
    expect(titles(cuisine)).toMatch(/Meubles et plan de travail/);
    expect(titles(cuisine)).not.toMatch(/Terrassement|Fondations/);

    const sdb = generateRoadmap(baseProject("renovation_salle_de_bain", { surface: 5 }));
    expect(titles(sdb)).toMatch(/Étanchéité de la pièce humide/);
    expect(titles(sdb)).not.toMatch(/Terrassement|Fondations/);

    const restaurant = generateRoadmap(baseProject("restaurant", { surface: 150 }));
    expect(titles(restaurant)).toMatch(/Extraction et ventilation de cuisine/);
    expect(titles(restaurant)).toMatch(/Cuisine professionnelle/);

    const cafe = generateRoadmap(baseProject("cafe", { surface: 80 }));
    expect(titles(cafe)).toMatch(/Comptoir/);
    expect(titles(cafe)).not.toMatch(/Cuisson|Chambre froide/);

    const entrepot = generateRoadmap(baseProject("entrepot", { surface: 400 }));
    expect(titles(entrepot)).toMatch(/portes industrielles/i);
    expect(titles(entrepot)).not.toMatch(/Chambre froide|Cuisine/);

    const studio = generateRoadmap(baseProject("studio", { surface: 25 }));
    expect(titles(studio)).toMatch(/optimisation des espaces/);
    expect(titles(studio)).not.toMatch(/Terrassement|Fondations/);
  });

  it("déplie les tâches par niveau avec les surfaces réelles (immeuble)", () => {
    const project = baseProject("immeuble", {
      surface: 300,
      floors: 3,
      levelSurfaces: [120, 90, 70],
    });
    const r = generateRoadmap(project);
    const elevation = r.construction.filter((c) => c.title.startsWith("Structure et élévation —"));
    expect(elevation).toHaveLength(3);
    expect(elevation.map((c) => c.levelLabel)).toEqual(["RDC", "R+1", "R+2"]);
    expect(elevation.map((c) => c.levelSurface)).toEqual([120, 90, 70]);
    expect(titles(r)).toMatch(/Ascenseur/);
    expect(r.execution?.levels.map((l) => l.surface)).toEqual([120, 90, 70]);
  });

  it("adapte les démarches et les études techniques au type de projet", () => {
    const adminIds = (category: string) =>
      generateRoadmap(baseProject(category)).adminSteps.map((a) => a.id);
    const studyIds = (category: string) =>
      generateRoadmap(baseProject(category)).phases.find((p) => p.id === "phase_03")!.items.map((i) => i.id);

    // Une villa conserve le parcours administratif complet.
    expect(adminIds("villa")).toContain("bornage");
    expect(adminIds("villa")).toContain("geotechnique");

    // Une rénovation de salle de bain n'a ni bornage ni étude géotechnique.
    expect(adminIds("renovation_salle_de_bain")).not.toContain("bornage");
    expect(adminIds("renovation_salle_de_bain")).not.toContain("geotechnique");
    expect(studyIds("renovation_salle_de_bain")).not.toContain("geotechnique");
    expect(studyIds("renovation_salle_de_bain")).toContain("plomberie");

    // Un projet d'électricité ne liste que l'étude électrique.
    expect(studyIds("electricite_complete")).toEqual(["electricite"]);
  });

  it("reprend le scénario budgétaire réellement choisi dans l'estimation", () => {
    const standard = generateRoadmap(baseProject("maison"));
    expect(standard.budget.selected).toBe("standard");

    const premium = generateRoadmap(baseProject("maison", { selectedScenario: "premium" }));
    expect(premium.budget.selected).toBe("premium");
    expect(premium.budget.totalCost).toBe(156_000);
    expect(premium.project.scenarioLabel).toBe("Premium");
    // Les lots sont chiffrés sur le scénario retenu : aucun écart de budget.
    expect(premium.construction.reduce((acc, c) => acc + c.budgetEstime, 0)).toBe(156_000);
  });

  it("préserve la progression d'une feuille de route déjà renseignée", () => {
    const project = baseProject("maison");
    const current = generateRoadmap(project);
    current.planning[0] = { ...current.planning[0], progress: 40, status: "in_progress" };

    // Le type change : la trame ne correspond plus, mais l'utilisateur a avancé.
    const changed = ensureCurrentRoadmap(current, { ...project, category: "piscine" });
    expect(changed).toBe(current);

    // Feuille de route vierge : elle est régénérée avec la trame du nouveau type.
    const fresh = generateRoadmap(project);
    const upgraded = ensureCurrentRoadmap(fresh, { ...project, category: "piscine" });
    expect(upgraded).not.toBe(fresh);
    expect(upgraded.execution?.key).toBe("piscine");
  });

  it("conserve une structure commune (10 phases) tout en adaptant la phase 08", () => {
    const piscine = generateRoadmap(baseProject("piscine"));
    expect(piscine.phases).toHaveLength(10);
    const phase08 = piscine.phases.find((p) => p.id === "phase_08")!;
    expect(phase08.title).toBe("Construction de piscine");
    expect(phase08.items.length).toBe(piscine.construction.length);
    expect(phase08.items[0].detail).toMatch(/\d+ j/);
  });
});
