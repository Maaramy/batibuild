import { describe, it, expect } from "vitest";
import {
  AI_DISCLAIMER,
  DEMO_DISCLAIMER,
  anomalyKey,
  buildDemoAnalysis,
  comparePlanning,
  confidenceLabel,
  demoAnomalies,
  detectAnomalies,
  parseAiAnalysis,
  phaseProgressRows,
  progressSummary,
  reportPeriod,
  weightedPercent,
  type AiTask,
  type AnomalyInput,
  type ProgressRecordLike,
} from "./siteIntelligence";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 15);
const PHASES = ["fondations", "structure", "toiture"];

const task = (phaseKey: string, overrides: Partial<AiTask> = {}): AiTask => ({
  phaseKey,
  name: `Phase ${phaseKey}`,
  weight: 1,
  progress: 0,
  startDate: NOW - 30 * DAY,
  endDate: NOW + 30 * DAY,
  ...overrides,
});

const record = (overrides: Partial<ProgressRecordLike> = {}): ProgressRecordLike => ({
  phaseKey: "fondations",
  percent: 50,
  source: "declared",
  status: "pending",
  date: NOW - DAY,
  ...overrides,
});

// ── Analyse IA : validation stricte ────────────────────────────────────────

describe("parseAiAnalysis", () => {
  it("accepte une réponse complète et normalise les valeurs", () => {
    const parsed = parseAiAnalysis(
      {
        phaseKey: "structure",
        elements: ["Poteaux", "Poutres"],
        worksObserved: ["Coffrage du niveau 1"],
        worksRemaining: ["Coulage"],
        changes: ["Ouverture ajoutée"],
        anomalies: [{ label: "Fissure", severity: "CRITIQUE", evidence: "Voile nord" }],
        progressEstimate: 150,
        confidence: 85,
        summary: "Structure du niveau 1 en cours.",
      },
      PHASES,
      2,
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.progressEstimate).toBe(100); // borné
    expect(parsed!.confidence).toBeCloseTo(0.85); // 85 → 0,85
    expect(parsed!.anomalies[0].severity).toBe("critique");
  });

  it("refuse une phase inconnue — une analyse ne peut pas cibler une phase inventée", () => {
    expect(
      parseAiAnalysis({ phaseKey: "piscine", elements: ["X"] }, PHASES, 1),
    ).toBeNull();
  });

  it("refuse une réponse sans observation exploitable", () => {
    expect(parseAiAnalysis({ phaseKey: "structure", elements: [], worksObserved: [] }, PHASES, 1)).toBeNull();
    expect(parseAiAnalysis(null, PHASES, 1)).toBeNull();
    expect(parseAiAnalysis({ phaseKey: "structure" }, PHASES, 0)).toBeNull();
  });

  it("ignore les anomalies sans libellé et borne la confiance", () => {
    const parsed = parseAiAnalysis(
      {
        phaseKey: "fondations",
        elements: ["Semelles"],
        anomalies: [{ label: "", severity: "critique" }, { label: "Nid de gravier", severity: "inconnu" }],
        confidence: -3,
        progressEstimate: -20,
      },
      PHASES,
      1,
    );
    expect(parsed!.anomalies).toHaveLength(1);
    expect(parsed!.anomalies[0].severity).toBe("faible");
    expect(parsed!.confidence).toBe(0);
    expect(parsed!.progressEstimate).toBe(0);
  });

  it("la démonstration est explicitement marquée et sans confiance", () => {
    const demo = buildDemoAnalysis({ phaseKey: "fondations", progress: 50, imageCount: 2 });
    expect(demo.confidence).toBe(0);
    expect(demo.summary).toBe(DEMO_DISCLAIMER);
    expect(DEMO_DISCLAIMER.toLowerCase()).toContain("démonstration");
    expect(AI_DISCLAIMER.toLowerCase()).toContain("ne prouve jamais");
    expect(AI_DISCLAIMER.toLowerCase()).toContain("vérification humaine");
  });
});

// ── Avancement pondéré ─────────────────────────────────────────────────────

describe("avancement pondéré", () => {
  it("pondère par le poids de phase, sans simple moyenne", () => {
    const rows = phaseProgressRows(
      [
        task("fondations", { weight: 3, progress: 100 }),
        task("structure", { weight: 1, progress: 0 }),
      ],
      [],
      NOW,
    );
    expect(weightedPercent(rows, (row) => row.validated)).toBe(75);

    const summary = progressSummary(rows);
    expect(summary.validated).toBe(75);
    expect(summary.remainingTasks).toBe(1);
  });

  it("conserve la traçabilité IA / déclaré / validé et ignore les refus", () => {
    const rows = phaseProgressRows(
      [task("structure", { progress: 40 })],
      [
        record({ phaseKey: "structure", source: "ai", percent: 60, date: NOW - 3 * DAY }),
        record({ phaseKey: "structure", source: "declared", percent: 55, date: NOW - 2 * DAY }),
        record({
          phaseKey: "structure",
          source: "declared",
          percent: 95,
          status: "rejected",
          date: NOW - DAY,
        }),
      ],
      NOW,
    );
    expect(rows[0].ai).toBe(60);
    expect(rows[0].declared).toBe(55);
    expect(rows[0].validated).toBe(40);
    expect(rows[0].remaining).toBe(60);

    const summary = progressSummary(rows);
    expect(summary.ai).toBe(60);
    expect(summary.declared).toBe(55);
    expect(summary.validated).toBe(40);
  });

  it("calcule l'écart au planning et les phases critiques", () => {
    const rows = phaseProgressRows(
      [task("fondations", { progress: 10, startDate: NOW - 30 * DAY, endDate: NOW })],
      [],
      NOW,
    );
    expect(rows[0].planned).toBe(100);
    expect(rows[0].delta).toBe(-90);
    expect(progressSummary(rows).criticalPhases).toBe(1);
    expect(progressSummary(rows).gap).toBe(-90);
  });
});

describe("comparePlanning", () => {
  it("distingue terminée, en avance, à jour et en retard", () => {
    const tasks: AiTask[] = [
      task("fondations", { progress: 100 }),
      task("structure", { progress: 80 }),
      task("toiture", { progress: 50 }),
      task("menuiserie", { progress: 0, endDate: NOW - 5 * DAY }),
    ];
    const rows = phaseProgressRows(tasks, [], NOW);
    const comparison = comparePlanning(rows, tasks, NOW);

    expect(comparison.map((row) => row.status)).toEqual([
      "terminee",
      "en_avance",
      "a_jour",
      "retard",
    ]);
    expect(comparison[3].delayDays).toBe(5);
    expect(comparison[0].delayDays).toBe(0);
  });
});

// ── Anomalies déterministes ────────────────────────────────────────────────

const baseInput = (overrides: Partial<AnomalyInput> = {}): AnomalyInput => ({
  now: NOW,
  startDate: NOW - 60 * DAY,
  expectedEndDate: NOW + 60 * DAY,
  budgetInitial: 100000,
  tasks: [task("fondations", { endDate: NOW - 20 * DAY })],
  rows: phaseProgressRows([task("fondations", { endDate: NOW - 20 * DAY })], [], NOW),
  expenses: [],
  materials: [],
  inspections: [],
  sessions: [{ date: NOW - 5 * DAY, imageCount: 3 }],
  analyses: [],
  projectedFinalCost: null,
  ...overrides,
});

describe("detectAnomalies", () => {
  it("signale une phase dépassée avec une sévérité graduée", () => {
    const input = baseInput({ sessions: [{ date: NOW - 2 * DAY, imageCount: 2 }] });
    const anomalies = detectAnomalies(input);
    const delay = anomalies.find((anomaly) => anomaly.type === "retard_phase");
    expect(delay).toBeDefined();
    expect(delay!.severity).toBe("eleve"); // 20 jours
    expect(delay!.source).toBe("engine");
    expect(delay!.requiresHumanCheck).toBe(false);
  });

  it("ne signale rien quand tout est à jour et documenté", () => {
    const input = baseInput({
      tasks: [task("fondations", { progress: 100, endDate: NOW + 10 * DAY })],
      rows: phaseProgressRows([task("fondations", { progress: 100 })], [], NOW),
      sessions: [{ date: NOW - 1 * DAY, imageCount: 2 }],
    });
    expect(detectAnomalies(input)).toHaveLength(0);
  });

  it("détecte un dépassement budgétaire réel et le distingue d'une simple projection", () => {
    const real = detectAnomalies(
      baseInput({ expenses: [{ amount: 120000, date: NOW - 2 * DAY }] }),
    ).find((anomaly) => anomaly.type === "risque_budgetaire");
    expect(real).toBeDefined();
    expect(real!.severity).toBe("critique");
    expect(real!.requiresHumanCheck).toBe(false);

    const projected = detectAnomalies(baseInput({ projectedFinalCost: 130000 })).find(
      (anomaly) => anomaly.type === "risque_budgetaire",
    );
    expect(projected).toBeDefined();
    expect(projected!.requiresHumanCheck).toBe(true);
    expect(projected!.description.toLowerCase()).toContain("projection");
  });

  it("signale un écart de quantité livrée", () => {
    const anomalies = detectAnomalies(
      baseInput({
        materials: [{ name: "Ciment", plannedQty: 100, orderedQty: 140, deliveredQty: 130 }],
      }),
    );
    expect(anomalies.some((anomaly) => anomaly.type === "ecart_quantites")).toBe(true);
  });

  it("une session sans photo ne permet pas de conclure à une absence de travaux", () => {
    const anomalies = detectAnomalies(
      baseInput({
        sessions: [
          { date: NOW - 20 * DAY, imageCount: 2 },
          { date: NOW - 10 * DAY, imageCount: 0 },
        ],
      }),
    );
    // Une session vide est ignorée : l'absence de visibilité n'est pas une preuve.
    expect(anomalies.some((anomaly) => anomaly.type === "absence_evolution")).toBe(false);
  });

  it("exige une vérification humaine pour toute anomalie visuelle IA", () => {
    const anomalies = detectAnomalies(
      baseInput({
        analyses: [
          {
            phaseKey: "fondations",
            visualAnomalies: [{ label: "Fissure", severity: "eleve" }],
            changes: [],
            createdAt: NOW - DAY,
          },
        ],
      }),
    );
    const visual = anomalies.find((anomaly) => anomaly.source === "ai");
    expect(visual).toBeDefined();
    expect(visual!.requiresHumanCheck).toBe(true);
    expect(visual!.type).toBe("non_conformite_potentielle");
    expect(visual!.description).toContain("observation visuelle");
  });

  it("déduplique par clé stable entre deux scans", () => {
    const first = detectAnomalies(baseInput())[0];
    const second = detectAnomalies(baseInput())[0];
    expect(anomalyKey(first)).toBe(anomalyKey(second));
    expect(anomalyKey(first)).toContain("retard_phase");
  });

  it("le mode démonstration produit des anomalies étiquetées", () => {
    const rows = phaseProgressRows([task("fondations")], [], NOW);
    const demo = demoAnomalies(rows);
    expect(demo.length).toBeGreaterThan(0);
    expect(demo[0].title).toContain("[Démo]");
    expect(demo[0].description).toBe(DEMO_DISCLAIMER);
  });
});

// ── Périodes et libellés ──────────────────────────────────────────────────

describe("reportPeriod", () => {
  const start = Date.UTC(2026, 0, 5);

  it("borne le rapport journalier à la journée demandée", () => {
    const day = new Date(2026, 5, 15, 14, 30).getTime();
    const period = reportPeriod("journalier", NOW, start, day);
    const from = new Date(period.start);
    expect(from.getHours()).toBe(0);
    expect(period.end - period.start).toBe(DAY - 1);
    expect(period.label).toContain("15/06/2026");
  });

  it("calcule les fenêtres hebdomadaire et mensuelle depuis maintenant", () => {
    const week = reportPeriod("hebdomadaire", NOW, start);
    expect(week.end).toBe(NOW);
    expect(week.end - week.start).toBe(7 * DAY);

    const month = reportPeriod("mensuel", NOW, start);
    expect(month.end - month.start).toBe(30 * DAY);
  });

  it("couvre tout le chantier pour les rapports de synthèse", () => {
    for (const kind of ["progression", "anomalies", "planning_realisation"] as const) {
      const period = reportPeriod(kind, NOW, start);
      expect(period.start).toBe(start);
      expect(period.end).toBe(NOW);
    }
  });
});

describe("confidenceLabel", () => {
  it("qualifie la confiance sans jamais la présenter comme certitude", () => {
    expect(confidenceLabel(0)).toBe("Sans indice de confiance");
    expect(confidenceLabel(0.3)).toBe("Confiance faible");
    expect(confidenceLabel(0.6)).toBe("Confiance moyenne");
    expect(confidenceLabel(0.9)).toBe("Confiance élevée");
  });
});
