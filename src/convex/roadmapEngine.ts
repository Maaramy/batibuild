// ============================================================================
// Moteur du Guide Construction A-Z — pur et testable.
// Génère une feuille de route complète et personnalisée à partir d'un projet
// de construction existant (résultat d'estimation). Les données pays/région/
// démarches sont séparées dans roadmapData.ts.
// ============================================================================

import {
  TERRAIN_ITEMS,
  FEASIBILITY_ITEMS,
  TECHNICAL_STUDIES,
  TUNISIA_ADMIN_STEPS,
  CONSTRUCTION_STEPS,
  CONTROL_ITEMS,
  RECEPTION_ITEMS,
  DOCUMENT_TYPES,
  COMPANY_CRITERIA,
  type AdminStep,
} from "./roadmapData";

// ─── Types ───────────────────────────────────────────────────────────────────

export type StepStatus = "todo" | "done";

export interface PhaseItem {
  id: string;
  label: string;
  detail: string;
  status: StepStatus;
  auto?: boolean;
  warning?: boolean; // à vérifier par un professionnel / autorité
}

export interface RoadmapPhase {
  id: string;
  number: number;
  title: string;
  icon: string;
  description: string;
  items: PhaseItem[];
  progress: number; // 0-100
  status: StepStatus | "in_progress";
}

export interface BudgetRow {
  key: string;
  label: string;
  amount: number;
  pct: number;
}

export interface BudgetScenario {
  key: "economique" | "standard" | "premium";
  label: string;
  totalCost: number;
  costPerM2: number;
  multiplier: number;
  rows: BudgetRow[];
}

export interface PlanningTask {
  id: string;
  title: string;
  phase: string;
  durationDays: number;
  startDay: number;
  endDay: number;
  dependencies: string[];
  responsible: string;
  cost: number;
  progress: number; // 0-100
  status: "todo" | "in_progress" | "done";
}

export interface ConstructionStep {
  id: string;
  order: number;
  title: string;
  objectif: string;
  travaux: string[];
  materiaux: string[];
  mainOeuvre: string[];
  outillage: string[];
  controles: string[];
  risques: string[];
  budgetEstime: number;
  dureeJours: number;
  conditions: string[];
  status: StepStatus;
}

export interface OmissionStatus {
  green: string[];
  orange: string[];
  red: string[];
  priorityActions: string[];
}

export interface Prediction {
  label: string;
  value: string;
  confidence: number; // 0-100
  explanation: string;
}

export interface Predictions {
  budgetOverrun: Prediction;
  delay: Prediction;
  costEvolution: { label: string; cost: number }[];
  finalCost: { estimate: number; confidence: number; assumptions: string[] };
}

export interface ControlPhoto {
  id: string;
  url?: string;
  storageId?: string;
  caption: string;
  addedAt: number;
}

export interface ControlIssue {
  id: string;
  title: string;
  severity: "info" | "warning" | "critical";
  description: string;
  status: "ouvert" | "résolu";
  createdAt: number;
}

export interface ControlObservation {
  id: string;
  text: string;
  createdAt: number;
}

export interface ControlExpense {
  id: string;
  label: string;
  amount: number;
  category: string;
  date: number;
}

export interface RoadmapDocument {
  id: string;
  title: string;
  description: string;
  generatedAt?: number;
}

// ─── Diagnostic IA du chantier (Phase 09 — détection des anomalies) ──────────

export interface SiteAnomaly {
  id: string;
  type: "budget" | "qualite" | "delai" | "documentation" | "suivi";
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  recommendation: string;
}

export interface SiteRiskAnalysis {
  score: number; // 0-100 (plus élevé = plus risqué)
  level: "faible" | "modéré" | "élevé";
  anomalies: SiteAnomaly[];
  strengths: string[];
  summary: string;
  updatedAt: number;
}

export interface SiteControlData {
  photos: ControlPhoto[];
  issues: ControlIssue[];
  observations: ControlObservation[];
  expenses: ControlExpense[];
}

export interface RoadmapControl extends SiteControlData {
  risk: SiteRiskAnalysis;
}

export interface RoadmapSummary {
  plannedBudget: number;
  budgetConsumed: number;
  budgetGap: number; // + = dépassement, − = reste
  plannedDurationDays: number;
  startDate: number;
  endDate: number;
  tasksTotal: number;
  tasksDone: number;
  tasksInProgress: number;
  nextTaskId: string | null;
  alerts: { severity: "info" | "warning" | "critical"; message: string }[];
}

export interface Roadmap {
  version: number;
  country: string;
  currency: string;
  generatedAt: number;
  progress: number; // 0-100
  project: {
    id: string;
    name: string;
    category: string;
    categoryLabel: string;
    region?: string;
    regionLabel?: string;
    surface?: number;
    surfaceTotale?: number;
    floors?: number;
    bedrooms?: number;
  };
  summary: RoadmapSummary;
  phases: RoadmapPhase[];
  adminSteps: (AdminStep & { status: StepStatus })[];
  budget: {
    selected: "economique" | "standard" | "premium";
    scenarios: BudgetScenario[];
    totalCost: number;
  };
  planning: PlanningTask[];
  construction: ConstructionStep[];
  omissions: OmissionStatus;
  predictions: Predictions;
  documents: RoadmapDocument[];
  control: RoadmapControl;
  nextSteps: string[];
  companyCriteria: typeof COMPANY_CRITERIA;
  disclaimer: string;
}

// Input minimal du projet (sous-ensemble de la table `projects`)
export interface RoadmapProjectInput {
  _id: string;
  name: string;
  category: string;
  region?: string;
  surface?: number;
  surfaceTotale?: number;
  floors?: number;
  bedrooms?: number;
  files?: { name: string; type: string }[];
  aiAnalysis?: { confidence?: number; estimatedDuration?: string };
  costEstimate?: {
    totalCost: number;
    costPerSquareMeter?: number;
    contingencyPercentage?: number;
    contingencyBuffer?: number;
    breakdown?: {
      category: string;
      label: string;
      estimatedCost: number;
      percentage: number;
      items?: { name: string; quantity: number; unit: string; unitPrice: number; totalPrice: number }[];
    }[];
    budgetScenarios?: {
      economique: { totalCost: number; costPerM2: number; label: string; multiplier: number };
      standard: { totalCost: number; costPerM2: number; label: string; multiplier: number };
      premium: { totalCost: number; costPerM2: number; label: string; multiplier: number };
    };
  };
  providerRecommendations?: { providers?: { type: string; label: string; priority: string }[] };
}

// ─── Labels ──────────────────────────────────────────────────────────────────

export const ROADMAP_CATEGORY_LABELS: Record<string, string> = {
  maison: "Maison",
  villa: "Villa",
  appartement: "Appartement",
  studio: "Studio",
  duplex: "Duplex",
  immeuble: "Immeuble résidentiel",
  local_commercial: "Local commercial",
  bureau: "Bureau",
  entrepot: "Entrepôt",
  residence_touristique: "Résidence touristique",
  projet_neuf: "Projet neuf",
};

const REGION_LABEL: Record<string, string> = {
  tunis: "Tunis", ariana: "Ariana", ben_arous: "Ben Arous", manouba: "Manouba",
  nabeul: "Nabeul", zaghouan: "Zaghouan", bizerte: "Bizerte", beja: "Béja",
  jendouba: "Jendouba", le_kef: "Le Kef", siliana: "Siliana", kairouan: "Kairouan",
  kasserine: "Kasserine", sidi_bouzid: "Sidi Bouzid", sousse: "Sousse",
  monastir: "Monastir", mahdia: "Mahdia", sfax: "Sfax", gabes: "Gabès",
  medenine: "Médenine", tataouine: "Tataouine", gafsa: "Gafsa", tozeur: "Tozeur",
  kebili: "Kébili",
};

const BUDGET_LABELS: Record<string, string> = {
  gros_oeuvre: "Gros œuvre",
  second_oeuvre: "Second œuvre & matériaux",
  equipements: "Équipements",
  main_oeuvre: "Main-d'œuvre",
  transport: "Transport",
  etudes_imprevus: "Études & permis",
};

const round = (n: number) => Math.round(n);

// ─── Génération ─────────────────────────────────────────────────────────────

export function generateRoadmap(project: RoadmapProjectInput): Roadmap {
  const generatedAt = Date.now();
  const ce = project.costEstimate;
  const total = ce?.totalCost ?? (project.surface ? project.surface * 1400 : 150_000);
  const surface = project.surface ?? 100;
  const floors = project.floors ?? 1;

  // ── Budget (Phase 05) ─────────────────────────────────────────────────────
  const scenarios = buildBudgetScenarios(ce, total, surface, project.region);
  const selected: Roadmap["budget"]["selected"] = "standard";

  // ── Phases 01-03 (contenu + remplissage automatique) ─────────────────────
  const terrainItems: PhaseItem[] = TERRAIN_ITEMS.map((t) => ({
    id: t.id,
    label: t.label,
    detail: t.detail,
    status: "todo",
    auto: t.auto,
    warning: t.id === "sol" || t.id === "urbanisme",
  }));
  if (project.region) {
    const sit = terrainItems.find((i) => i.id === "situation");
    if (sit) {
      sit.status = "done";
      sit.detail = `${REGION_LABEL[project.region] ?? project.region} — localisation renseignée depuis le projet.`;
    }
  }
  if (project.surfaceTotale || project.surface) {
    const s = terrainItems.find((i) => i.id === "surface");
    if (s) {
      s.status = "done";
      s.detail = project.surfaceTotale
        ? `Terrain : ${project.surfaceTotale} m² · Surface construite : ${project.surface ?? "—"} m² · ${floors} niveau(x).`
        : `Surface construite : ${project.surface} m² · ${floors} niveau(x).`;
    }
  }

  const feasibilityItems: PhaseItem[] = FEASIBILITY_ITEMS.map((f) => ({
    id: f.id,
    label: f.label,
    detail: f.detail,
    status: "todo",
    auto: f.auto,
  }));
  if (ce) {
    const fi = feasibilityItems.find((i) => i.id === "faisabilite");
    if (fi) { fi.status = "done"; fi.detail = "Coût estimé disponible — le projet est financièrement définissable."; }
    const bp = feasibilityItems.find((i) => i.id === "budget_preliminaire");
    if (bp) {
      bp.status = "done";
      bp.detail = `Fourchette : ${fmtTnd(scenarios[0].totalCost)} (économique) → ${fmtTnd(scenarios[2].totalCost)} (premium).`;
    }
    const sc = feasibilityItems.find((i) => i.id === "surface_constructible");
    if (sc && project.surfaceTotale) {
      sc.status = "done";
      sc.detail = `≈ ${round(project.surfaceTotale * 0.4)} m² constructibles estimés (COS ~0.4 à confirmer par la municipalité).`;
    }
    const pl = feasibilityItems.find((i) => i.id === "planning");
    if (pl) { pl.status = "done"; pl.detail = `Durée estimée des travaux : ${estimateDurationDays(total, surface, floors)} jours (hors démarches).`; }
  }

  const studyItems: PhaseItem[] = TECHNICAL_STUDIES.map((s) => ({
    id: s.id,
    label: s.label,
    detail: `${s.detail} — ${s.requirement}.`,
    status: "todo",
    warning: true,
  }));

  // ── Phase 04 — Démarches administratives (Tunisie) ────────────────────────
  const adminSteps: (AdminStep & { status: StepStatus })[] = TUNISIA_ADMIN_STEPS.map((a) => ({
    ...a,
    status: "todo",
  }));

  // ── Phase 05 — Budget ─────────────────────────────────────────────────────
  const budget = {
    selected,
    scenarios,
    totalCost: scenarios[1].totalCost,
  };

  // ── Phase 07 — Planning (Gantt) ───────────────────────────────────────────
  const planning = buildPlanning(total, surface, floors);

  // ── Phase 08 — Étapes de construction ─────────────────────────────────────
  const construction = buildConstructionSteps(total, planning);

  // ── Phases assemblées ─────────────────────────────────────────────────────
  const phases = buildPhases({
    terrainItems,
    feasibilityItems,
    studyItems,
    adminSteps,
    budget,
    planning,
    construction,
    control: CONTROL_ITEMS,
    reception: RECEPTION_ITEMS,
    hasProviders: !!project.providerRecommendations?.providers?.length,
  });

  // ── Vérification du projet (omissions) ────────────────────────────────────
  const omissions = buildOmissions(project, adminSteps, construction);

  // ── IA prédictive ─────────────────────────────────────────────────────────
  const predictions = buildPredictions(project, scenarios, planning, construction);

  // ── Synthèse / tableau de bord ────────────────────────────────────────────
  const progress = computeProgress(phases, planning, construction, adminSteps);
  const summary = buildSummary(project, budget, planning, progress);

  const nextSteps = buildNextSteps(phases, adminSteps, planning, omissions);

  // Diagnostic IA du chantier (Phase 09) — état initial
  const initialControl: SiteControlData = { photos: [], issues: [], observations: [], expenses: [] };
  const risk = buildSiteRiskAnalysis(budget, planning, construction, initialControl, progress, {
    now: generatedAt,
    startDate: summary.startDate,
    plannedDurationDays: summary.plannedDurationDays,
  });

  return {
    version: 1,
    country: "tunisie",
    currency: "TND",
    generatedAt,
    progress,
    project: {
      id: project._id,
      name: project.name,
      category: project.category,
      categoryLabel: ROADMAP_CATEGORY_LABELS[project.category] ?? project.category,
      region: project.region,
      regionLabel: project.region ? REGION_LABEL[project.region] : undefined,
      surface,
      surfaceTotale: project.surfaceTotale,
      floors,
      bedrooms: project.bedrooms,
    },
    summary,
    phases,
    adminSteps,
    budget,
    planning,
    construction,
    omissions,
    predictions,
    documents: DOCUMENT_TYPES.map((d) => ({ id: d.id, title: d.title, description: d.description })),
    control: { ...initialControl, risk },
    nextSteps,
    companyCriteria: COMPANY_CRITERIA,
    disclaimer:
      "Ce guide est généré automatiquement par IA à partir des données du projet. Il ne remplace pas l'avis d'un architecte, d'un ingénieur, d'un bureau d'études ou des autorités compétentes : vérifiez toujours les exigences réglementaires locales (Tunisie) avant toute décision.",
  };
}

// ─── Budget ─────────────────────────────────────────────────────────────────

function buildBudgetScenarios(
  ce: RoadmapProjectInput["costEstimate"],
  total: number,
  surface: number,
  region?: string,
): BudgetScenario[] {
  const s = ce?.budgetScenarios;
  const raw = [
    { key: "economique" as const, label: "Économique", totalCost: s?.economique.totalCost ?? round(total * 0.85), costPerM2: s?.economique.costPerM2 ?? round((total * 0.85) / Math.max(surface, 1)), multiplier: s?.economique.multiplier ?? 0.85 },
    { key: "standard" as const, label: "Standard", totalCost: s?.standard.totalCost ?? total, costPerM2: s?.standard.costPerM2 ?? round(total / Math.max(surface, 1)), multiplier: s?.standard.multiplier ?? 1 },
    { key: "premium" as const, label: "Premium", totalCost: s?.premium.totalCost ?? round(total * 1.3), costPerM2: s?.premium.costPerM2 ?? round((total * 1.3) / Math.max(surface, 1)), multiplier: s?.premium.multiplier ?? 1.3 },
  ];

  return raw.map((sc) => {
    const rows = buildAllocationRows(ce, sc.totalCost, region);
    return { ...sc, rows };
  });
}

function buildAllocationRows(ce: RoadmapProjectInput["costEstimate"], totalCost: number, _region?: string): BudgetRow[] {
  const breakdown = ce?.breakdown ?? [];
  const rows: BudgetRow[] = [];
  for (const b of breakdown) {
    const label = BUDGET_LABELS[b.category] ?? b.label;
    const amount = b.estimatedCost ?? 0;
    if (amount > 0) rows.push({ key: b.category, label, amount: round(amount), pct: round((amount / Math.max(totalCost, 1)) * 100) });
  }
  // Autorisations administratives (frais indicatifs Phase 04)
  const autorisations = round(TUNISIA_ADMIN_STEPS.reduce((sum, a) => sum + a.frais, 0));
  rows.push({ key: "autorisations", label: "Autorisations administratives", amount: autorisations, pct: round((autorisations / Math.max(totalCost, 1)) * 100) });
  // Imprévus
  const imprévus = ce?.contingencyBuffer ?? round(totalCost * (ce?.contingencyPercentage ?? 0.05));
  rows.push({ key: "imprevus", label: "Marge pour imprévus", amount: round(imprévus), pct: round((imprévus / Math.max(totalCost, 1)) * 100) });

  // Normaliser les pourcentages pour que la somme ≈ 100 %
  const sum = rows.reduce((acc, r) => acc + r.pct, 0);
  if (sum > 0 && sum !== 100 && rows.length > 0) {
    let diff = 100 - sum;
    let i = rows.length - 1;
    while (diff !== 0) {
      const step = diff > 0 ? 1 : -1;
      rows[i] = { ...rows[i], pct: rows[i].pct + step };
      diff -= step;
      i = (i - 1 + rows.length) % rows.length;
    }
  }
  return rows;
}

/**
 * Ajuste en temps réel le pourcentage d'un poste budgétaire : les autres postes
 * sont renormalisés pour que la somme reste ≈ 100 %, l'ordre d'origine est
 * conservé et les montants sont recalculés depuis le total du scénario.
 * Pure et déterministe (Phase 05 — répartition modifiable).
 */
export function rebalanceBudgetRows(rows: BudgetRow[], targetKey: string, pct: number, totalCost: number): BudgetRow[] {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const target = rows.find((r) => r.key === targetKey);
  if (!target || totalCost <= 0) return rows;

  const others = rows.filter((r) => r.key !== targetKey);
  const otherSum = others.reduce((a, o) => a + o.pct, 0);
  const nextPct = new Map<string, number>([[targetKey, clamped]]);

  if (otherSum > 0) {
    const scale = Math.max(0, 100 - clamped) / otherSum;
    const normalized = others.map((o) => ({ key: o.key, pct: Math.round(o.pct * scale) }));
    // Répartit l'arrondi restant un point à la fois sur les autres postes
    let diff = 100 - clamped - normalized.reduce((a, o) => a + o.pct, 0);
    let i = normalized.length - 1;
    while (diff !== 0 && normalized.length > 0) {
      const step = diff > 0 ? 1 : -1;
      const next = normalized[i].pct + step;
      if (next >= 0) normalized[i] = { ...normalized[i], pct: next };
      diff -= step;
      i = (i - 1 + normalized.length) % normalized.length;
    }
    for (const o of normalized) nextPct.set(o.key, o.pct);
  } else {
    for (const o of others) nextPct.set(o.key, 0);
  }

  return rows.map((r) => {
    const p = nextPct.get(r.key) ?? r.pct;
    return { ...r, pct: p, amount: Math.round((totalCost * p) / 100) };
  });
}

// ─── Planning (Phase 07) ─────────────────────────────────────────────────────

const RESPONSIBLES = ["Entreprise générale", "Maçon", "Coffreur/Ferrailleur", "Charpentier", "Étancheur", "Plâtrier", "Menuisier", "Électricien", "Plombier", "Carreleur", "Peintre", "Paysagiste"];

export function buildPlanning(totalCost: number, surface: number, floors: number): PlanningTask[] {
  const totalDays = estimateDurationDays(totalCost, surface, floors);
  let cursor = 0;
  const tasks: PlanningTask[] = [];
  CONSTRUCTION_STEPS.forEach((step, i) => {
    const durationDays = Math.max(2, Math.round(totalDays * step.weight));
    const dependencies = i > 0 ? [tasks[i - 1].id] : [];
    const cost = round(totalCost * (step.weight * 1.0));
    tasks.push({
      id: step.id,
      title: step.title,
      phase: `Phase 08 — Construction`,
      durationDays,
      startDay: cursor,
      endDay: cursor + durationDays,
      dependencies,
      responsible: RESPONSIBLES[i % RESPONSIBLES.length] ?? "Entreprise générale",
      cost,
      progress: 0,
      status: "todo",
    });
    cursor += durationDays;
  });
  return tasks;
}

export function estimateDurationDays(totalCost: number, surface: number, floors: number): number {
  const base = Math.max(60, Math.round(surface * 0.55 + floors * 20));
  const costFactor = Math.max(0.85, Math.min(1.3, totalCost / Math.max(surface, 1) / 1400));
  return Math.round(base * costFactor);
}

// ─── Étapes de construction (Phase 08) ───────────────────────────────────────

export function buildConstructionSteps(totalCost: number, planning: PlanningTask[]): ConstructionStep[] {
  return CONSTRUCTION_STEPS.map((t) => {
    const task = planning.find((p) => p.id === t.id);
    return {
      id: t.id,
      order: t.order,
      title: t.title,
      objectif: t.objectif,
      travaux: t.travaux,
      materiaux: t.materiaux,
      mainOeuvre: t.mainOeuvre,
      outillage: t.outillage,
      controles: t.controles,
      risques: t.risques,
      budgetEstime: task?.cost ?? round(totalCost * t.weight),
      dureeJours: task?.durationDays ?? 5,
      conditions: t.conditions,
      status: "todo",
    };
  });
}

// ─── Phases ──────────────────────────────────────────────────────────────────

interface PhaseInputs {
  terrainItems: PhaseItem[];
  feasibilityItems: PhaseItem[];
  studyItems: PhaseItem[];
  adminSteps: (AdminStep & { status: StepStatus })[];
  budget: Roadmap["budget"];
  planning: PlanningTask[];
  construction: ConstructionStep[];
  control: { id: string; label: string; detail: string }[];
  reception: { id: string; label: string; detail: string }[];
  hasProviders: boolean;
}

export function phaseStatus(items: PhaseItem[]): StepStatus | "in_progress" {
  if (items.length === 0) return "todo";
  if (items.every((i) => i.status === "done")) return "done";
  if (items.some((i) => i.status === "done")) return "in_progress";
  return "todo";
}

export function phaseProgress(items: PhaseItem[]): number {
  if (items.length === 0) return 0;
  return Math.round((items.filter((i) => i.status === "done").length / items.length) * 100);
}

function buildPhases(input: PhaseInputs): RoadmapPhase[] {
  const p01: RoadmapPhase = {
    id: "phase_01",
    number: 1,
    title: "Analyse du terrain",
    icon: "Map",
    description: "Connaître précisément le terrain avant toute décision : situation, dimensions, sol, réseaux et contraintes.",
    items: input.terrainItems,
    progress: phaseProgress(input.terrainItems),
    status: phaseStatus(input.terrainItems),
  };

  const p02: RoadmapPhase = {
    id: "phase_02",
    number: 2,
    title: "Études et faisabilité",
    icon: "Search",
    description: "Valider la faisabilité technique, urbanistique et financière du projet.",
    items: input.feasibilityItems,
    progress: phaseProgress(input.feasibilityItems),
    status: phaseStatus(input.feasibilityItems),
  };

  const p03: RoadmapPhase = {
    id: "phase_03",
    number: 3,
    title: "Études techniques",
    icon: "DraftingCompass",
    description: "Les études techniques à lancer (bureaux d'études agréés) avant le dépôt du permis.",
    items: input.studyItems,
    progress: phaseProgress(input.studyItems),
    status: phaseStatus(input.studyItems),
  };

  const p04: RoadmapPhase = {
    id: "phase_04",
    number: 4,
    title: "Autorisations et démarches administratives",
    icon: "FileCheck",
    description: "Checklist adaptée à la Tunisie — à vérifier auprès des autorités compétentes.",
    items: input.adminSteps.map((a) => ({
      id: a.id,
      label: a.title,
      detail: `${a.organisme} · ${a.delai} · ${fmtTnd(a.frais)}`,
      status: a.status,
      warning: true,
    })),
    progress: input.adminSteps.length
      ? Math.round((input.adminSteps.filter((a) => a.status === "done").length / input.adminSteps.length) * 100)
      : 0,
    status: input.adminSteps.every((a) => a.status === "done")
      ? "done"
      : input.adminSteps.some((a) => a.status === "done")
        ? "in_progress"
        : "todo",
  };

  const p05: RoadmapPhase = {
    id: "phase_05",
    number: 5,
    title: "Budget et financement",
    icon: "Wallet",
    description: "Budget prévisionnel par poste, trois scénarios et répartition ajustable.",
    items: [
      { id: "scenarios", label: "Scénarios économiques définis", detail: "Économique · Standard · Premium — issus de l'estimation du projet.", status: "done", auto: true },
      { id: "allocation", label: "Répartition du budget validée", detail: "Gros œuvre, second œuvre, main-d'œuvre, imprévus…", status: "todo" },
      { id: "financement", label: "Plan de financement établi", detail: "Apport, crédit bancaire, aides — à confirmer avec votre banque.", status: "todo" },
    ],
    progress: 33,
    status: "in_progress",
  };

  const p06: RoadmapPhase = {
    id: "phase_06",
    number: 6,
    title: "Consultation et sélection des entreprises",
    icon: "Building2",
    description: "Rechercher, comparer et sélectionner vos partenaires (entreprises, architectes, fournisseurs).",
    items: [
      ...(input.hasProviders
        ? [{ id: "providers", label: "Prestataires recommandés disponibles", detail: "Recommandations générées depuis l'estimation du projet.", status: "done" as StepStatus, auto: true }]
        : [{ id: "providers", label: "Générer les recommandations de prestataires", detail: "Relancez l'estimation pour obtenir des entreprises recommandées.", status: "todo" as StepStatus }]),
      { id: "consultation", label: "Consultation de plusieurs offres", detail: "Demander au minimum 3 devis par lot.", status: "todo" },
      { id: "comparaison", label: "Comparaison des devis", detail: "Prix, spécialité, localisation, expérience, évaluations, disponibilité.", status: "todo" },
      { id: "contrats", label: "Contrats signés", detail: "Contrat de travaux + assurance décennale de l'entreprise.", status: "todo" },
    ],
    progress: input.hasProviders ? 25 : 0,
    status: input.hasProviders ? "in_progress" : "todo",
  };

  const p07: RoadmapPhase = {
    id: "phase_07",
    number: 7,
    title: "Planification des travaux",
    icon: "CalendarRange",
    description: "Planning prévisionnel : tâches, durées, dépendances, responsables et coûts.",
    items: [
      { id: "planning_genere", label: "Planning généré automatiquement", detail: `${input.planning.length} tâches · ${input.planning.reduce((a, t) => a + t.durationDays, 0)} jours de travaux.`, status: "done", auto: true },
      { id: "planning_valide", label: "Planning validé avec l'entreprise", detail: "Dates de début et jalons clés confirmés.", status: "todo" },
      { id: "jalons", label: "Jalons de contrôle définis", detail: "Points d'arrêt : fondations, hors d'eau, finitions.", status: "todo" },
    ],
    progress: 33,
    status: "in_progress",
  };

  const p08: RoadmapPhase = {
    id: "phase_08",
    number: 8,
    title: "Construction",
    icon: "HardHat",
    description: "Déroulement des travaux dans l'ordre logique, étape par étape.",
    items: input.construction.map((c) => ({
      id: c.id,
      label: c.title,
      detail: `${c.dureeJours} jours · ${fmtTnd(c.budgetEstime)}`,
      status: c.status,
    })),
    progress: input.construction.length
      ? Math.round((input.construction.filter((c) => c.status === "done").length / input.construction.length) * 100)
      : 0,
    status: input.construction.every((c) => c.status === "done")
      ? "done"
      : input.construction.some((c) => c.status === "done")
        ? "in_progress"
        : "todo",
  };

  const p09: RoadmapPhase = {
    id: "phase_09",
    number: 9,
    title: "Contrôle du chantier",
    icon: "Camera",
    description: "Suivi intelligent du chantier : photos, problèmes, dépenses, prévu/réalisé.",
    items: input.control.map((c) => ({
      id: c.id,
      label: c.label,
      detail: c.detail,
      status: "todo",
    })),
    progress: 0,
    status: "todo",
  };

  const p10: RoadmapPhase = {
    id: "phase_10",
    number: 10,
    title: "Réception et livraison",
    icon: "KeyRound",
    description: "Réceptionner les travaux, lever les réserves et obtenir la conformité.",
    items: input.reception.map((r) => ({
      id: r.id,
      label: r.label,
      detail: r.detail,
      status: "todo",
    })),
    progress: 0,
    status: "todo",
  };

  return [p01, p02, p03, p04, p05, p06, p07, p08, p09, p10];
}

// ─── Vérification du projet (omissions) ──────────────────────────────────────

export function buildOmissions(
  project: RoadmapProjectInput,
  adminSteps: (AdminStep & { status: StepStatus })[],
  construction: ConstructionStep[],
): OmissionStatus {
  const green: string[] = [];
  const orange: string[] = [];
  const red: string[] = [];
  const priorityActions: string[] = [];

  if (project.surface) { green.push(`Surface construite renseignée : ${project.surface} m²`); } else { red.push("Surface construite manquante — indispensable pour le chiffrage."); }
  if (project.region) { green.push(`Localisation renseignée : ${REGION_LABEL[project.region] ?? project.region}`); } else { orange.push("Localisation non renseignée — les démarches et prix dépendent de la région."); }
  if (project.costEstimate?.totalCost) {
    green.push(`Estimation du coût disponible : ${fmtTnd(project.costEstimate.totalCost)}`);
    if (project.costEstimate.budgetScenarios) green.push("Les trois scénarios de budget sont définis.");
  } else {
    red.push("Estimation de coût absente — lancez d'abord l'estimation du projet.");
  }
  if (project.surfaceTotale) {
    green.push(`Surface du terrain renseignée : ${project.surfaceTotale} m²`);
  }
  if (project.surfaceTotale && !project.costEstimate?.breakdown?.length) {
    orange.push("Surface constructible à vérifier auprès de la municipalité (COS).");
  }
  if (project.files?.length) { green.push(`${project.files.length} document(s) importé(s) (photos, plans).`); } else { orange.push("Aucun document importé — ajoutez des photos ou un plan du terrain."); }

  const titre = adminSteps.find((a) => a.id === "titre");
  if (titre?.status !== "done") orange.push("Vérifier le titre de propriété (Conservation foncière).");

  const permis = adminSteps.find((a) => a.id === "permis");
  if (permis?.status !== "done") orange.push("Permis de construire : démarche à engager (Phase 04).");

  const geo = adminSteps.find((a) => a.id === "geotechnique");
  if (geo?.status !== "done") orange.push("Étude géotechnique prévue mais non réalisée — obligatoire avant fondations.");

  if (!construction.some((c) => c.status === "done")) orange.push("Aucune étape de construction démarrée — le planning des travaux est prêt.");

  // Actions prioritaires
  if (red.length > 0) priorityActions.push(...red.slice(0, 3).map((r) => `Résoudre : ${r}`));
  priorityActions.push("Engager la vérification du titre de propriété et le bornage du terrain.");
  priorityActions.push("Déposer le dossier de permis de construire auprès de la municipalité.");
  priorityActions.push("Lancer l'étude géotechnique et les études techniques (bureaux d'études agréés).");
  priorityActions.push("Demander au minimum 3 devis par lot auprès d'entreprises recommandées.");

  return { green, orange, red, priorityActions };
}

// ─── IA prédictive ───────────────────────────────────────────────────────────

export function buildPredictions(
  project: RoadmapProjectInput,
  scenarios: BudgetScenario[],
  planning: PlanningTask[],
  _construction: ConstructionStep[],
): Predictions {
  const standard = scenarios[1]?.totalCost ?? 0;
  const premium = scenarios[2]?.totalCost ?? standard * 1.3;
  const spread = standard > 0 ? (premium - standard) / standard : 0.3;
  const confidence = Math.round((project.aiAnalysis?.confidence ?? 0.55) * 100);

  // Risque de dépassement du budget
  const overrunScore = Math.min(95, Math.round(10 + spread * 55 + (project.surfaceTotale ? 0 : 12)));
  const overrunLevel = overrunScore < 35 ? "faible" : overrunScore < 60 ? "modéré" : "élevé";
  const budgetOverrun: Prediction = {
    label: "Risque de dépassement du budget",
    value: overrunLevel,
    confidence,
    explanation:
      spread > 0.25
        ? "L'écart entre le scénario standard et premium est important : des surcoûts sont probables. Prévoyez la marge pour imprévus et verrouillez les prix des matériaux tôt."
        : "L'écart entre scénarios est raisonnable. Le risque de dépassement reste modéré tant que la marge pour imprévus est conservée et que les devis sont fermes.",
  };

  // Risque de retard
  const delayScore = Math.min(95, Math.round(15 + (project.floors ?? 1) * 8 + (planning.length * 0.5)));
  const delayLevel = delayScore < 35 ? "faible" : delayScore < 60 ? "modéré" : "élevé";
  const delay: Prediction = {
    label: "Risque de retard",
    value: delayLevel,
    confidence,
    explanation:
      delayLevel === "faible"
        ? "Le planning est linéaire avec peu de dépendances croisées. Un retard de quelques jours reste possible sur les intempéries et les approvisionnements."
        : "Plusieurs facteurs (niveaux, tâches, autorisations) peuvent décaler le planning. Verrouillez les autorisations avant le démarrage et contractualisez des pénalités de retard.",
  };

  // Évolution probable des coûts (24 mois)
  const months = 24;
  const seasonality = (m: number) => 1 + 0.02 * Math.sin((m / 12) * Math.PI * 2) + (m % 12 >= 2 && m % 12 <= 4 ? 0.015 : 0) + (m % 12 >= 6 && m % 12 <= 8 ? 0.01 : 0);
  const inflation = 0.005; // ≈ 6 %/an
  const costEvolution = Array.from({ length: months + 1 }, (_, m) => ({
    label: m === 0 ? "Aujourd'hui" : `M+${m}`,
    cost: round(standard * seasonality(m) * Math.pow(1 + inflation, m)),
  }));

  // Coût final probable
  const overrunFactor = overrunScore / 100;
  const finalEstimate = round(standard * (1 + overrunFactor * 0.12));
  const completeness = [
    !!project.surface,
    !!project.region,
    !!project.costEstimate?.totalCost,
    !!project.costEstimate?.budgetScenarios,
    !!project.surfaceTotale,
    (project.files?.length ?? 0) > 0,
  ].filter(Boolean).length;
  const finalConfidence = Math.min(92, Math.round(55 + completeness * 7));
  const assumptions = [
    "Les prix du marché tunisien 2026 (base materialPrices) restent stables à ±2 %/trimestre.",
    "Le scénario standard de l'estimation est retenu comme budget de référence.",
    "Aucun sinistre majeur, intempérie prolongée ou arrêt de chantier.",
    "Les honoraires (architecte, bureaux d'études) respectent les fourchettes du guide (Phase 04).",
    "Les autorisations sont obtenues dans les délais réglementaires.",
  ];

  return { budgetOverrun, delay, costEvolution, finalCost: { estimate: finalEstimate, confidence: finalConfidence, assumptions } };
}

// ─── Diagnostic IA du chantier (Phase 09) ────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
const SEV_ORDER: Record<SiteAnomaly["severity"], number> = { info: 0, warning: 1, critical: 2 };

/** Catégorie de dépense (saisie) → poste budgétaire (Phase 05). */
const EXPENSE_CATEGORY_KEY: Record<string, string> = {
  "Gros œuvre": "gros_oeuvre",
  "Second œuvre": "second_oeuvre",
  Matériaux: "second_oeuvre",
  "Main-d'œuvre": "main_oeuvre",
  Équipements: "equipements",
  Transport: "transport",
  "Études & permis": "etudes_imprevus",
  Imprévus: "imprevus",
};

/**
 * Analyse en temps réel des données de contrôle du chantier (dépenses, problèmes,
 * photos, planning) et détection des anomalies / risques potentiels.
 * Pure et déterministe : recomputée à chaque mutation de suivi.
 */
export function buildSiteRiskAnalysis(
  budget: Roadmap["budget"],
  planning: PlanningTask[],
  construction: ConstructionStep[],
  control: SiteControlData,
  progress: number,
  opts: { now?: number; startDate?: number; plannedDurationDays?: number } = {},
): SiteRiskAnalysis {
  const now = opts.now ?? Date.now();
  const anomalies: SiteAnomaly[] = [];
  const strengths: string[] = [];
  const total = budget.totalCost;
  const consumed = control.expenses.reduce((acc, e) => acc + e.amount, 0);
  const active = budget.scenarios.find((s) => s.key === budget.selected) ?? budget.scenarios[1];

  // ── 1. Budget global ──
  if (consumed > 0 && total > 0) {
    const pct = Math.round((consumed / total) * 100);
    if (consumed > total) {
      anomalies.push({
        id: "budget_depasse",
        type: "budget",
        severity: "critical",
        title: "Dépassement du budget prévu",
        detail: `Dépenses consommées : ${fmtTnd(consumed)} pour un budget prévu de ${fmtTnd(total)} (${pct} %).`,
        recommendation: "Geler les dépenses non essentielles, renégocier les postes les plus lourds et revoir le scénario de budget retenu.",
      });
    } else if (consumed > total * 0.8 && progress < 85) {
      anomalies.push({
        id: "budget_alerte",
        type: "budget",
        severity: "warning",
        title: "Budget consommé à plus de 80 %",
        detail: `${pct} % du budget est consommé alors que l'avancement global est de ${progress} %.`,
        recommendation: "Auditer les dépenses restantes et verrouiller les devis des lots à venir.",
      });
    }
    // Dérive consommation vs avancement
    if (progress > 0) {
      const expected = total * (progress / 100);
      if (consumed > expected * 1.25) {
        anomalies.push({
          id: "consommation_avancement",
          type: "budget",
          severity: "warning",
          title: "La consommation dépasse l'avancement",
          detail: `Avancement de ${progress} % pour une consommation de ${pct} % du budget (écart > 25 %).`,
          recommendation: "Comparer les dépenses réalisées au planning et vérifier que les lots ne sont pas facturés avant exécution.",
        });
      }
    }
  }

  // ── 2. Postes budgétaires dépassés ──
  const byCategory = new Map<string, number>();
  for (const e of control.expenses) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  const rowByKey = new Map(active.rows.map((r) => [r.key, r]));
  let catCount = 0;
  for (const [cat, amount] of byCategory) {
    const key = EXPENSE_CATEGORY_KEY[cat];
    const row = key ? rowByKey.get(key) : undefined;
    if (row && amount > row.amount && catCount < 3) {
      catCount++;
      anomalies.push({
        id: `categorie_${key}`,
        type: "budget",
        severity: "warning",
        title: `Poste « ${cat} » dépassé`,
        detail: `${fmtTnd(amount)} consommés pour ${fmtTnd(row.amount)} alloués (${Math.round((amount / Math.max(row.amount, 1)) * 100)} %).`,
        recommendation: `Réaffecter la marge pour imprévus ou réduire le poste « ${row.label} ».`,
      });
    }
  }

  // ── 3. Problèmes signalés non résolus ──
  const openIssues = control.issues.filter((i) => i.status !== "résolu");
  const criticalOpen = openIssues.filter((i) => i.severity === "critical");
  const warningOpen = openIssues.filter((i) => i.severity === "warning");
  const infoOpen = openIssues.filter((i) => i.severity === "info");
  if (criticalOpen.length > 0) {
    anomalies.push({
      id: "probleme_critique",
      type: "qualite",
      severity: "critical",
      title: `${criticalOpen.length} problème(s) critique(s) non résolu(s)`,
      detail: criticalOpen.map((c) => c.title).join(" · "),
      recommendation: "Stopper le lot concerné, faire expertiser (bureau de contrôle) et lever la réserve avant de poursuivre.",
    });
  }
  if (warningOpen.length > 0) {
    anomalies.push({
      id: "probleme_alerte",
      type: "qualite",
      severity: "warning",
      title: `${warningOpen.length} avertissement(s) en attente`,
      detail: warningOpen.map((w) => w.title).join(" · "),
      recommendation: "Planifier la levée des avertissements avant le démarrage du lot suivant.",
    });
  }
  if (infoOpen.length > 2) {
    anomalies.push({
      id: "probleme_suivi",
      type: "qualite",
      severity: "info",
      title: `${infoOpen.length} points de suivi ouverts`,
      detail: "Plusieurs points de suivi s'accumulent sans décision.",
      recommendation: "Clôturer les points d'information rapidement pour garder un journal lisible.",
    });
  }
  if (control.issues.length > 0 && openIssues.length === 0) strengths.push("Tous les problèmes signalés ont été résolus.");

  // ── 4. Retard estimé (prévu vs réalisé) ──
  const plannedDays = opts.plannedDurationDays ?? planning.reduce((acc, t) => acc + t.durationDays, 0);
  if (opts.startDate && plannedDays > 0) {
    const elapsedDays = Math.max(0, (now - opts.startDate) / DAY_MS);
    const expectedElapsed = plannedDays * (progress / 100);
    const delayDays = Math.round(elapsedDays - expectedElapsed);
    if (delayDays > 30) {
      anomalies.push({
        id: "retard_chantier",
        type: "delai",
        severity: "critical",
        title: `Retard estimé de ${delayDays} jours`,
        detail: `Depuis le démarrage (${new Date(opts.startDate).toLocaleDateString("fr-FR")}), l'avancement devrait être de ${Math.round((elapsedDays / plannedDays) * 100)} % du planning ; il est de ${progress} %.`,
        recommendation: "Replanifier avec l'entreprise, renforcer les équipes sur le chemin critique et contractualiser des pénalités de retard.",
      });
    } else if (delayDays > 7) {
      anomalies.push({
        id: "retard_chantier",
        type: "delai",
        severity: "warning",
        title: `Retard estimé de ${delayDays} jours`,
        detail: "Le retard reste modéré mais risque de s'amplifier sur les lots suivants.",
        recommendation: "Identifier les tâches en glissement et ajuster le planning avant qu'elles ne bloquent le chemin critique.",
      });
    } else if (delayDays <= 0 && progress > 0) {
      strengths.push("Planning respecté — aucun retard estimé à ce jour.");
    }
  }

  // ── 5. Traçabilité (photos) ──
  const doneSteps = construction.filter((c) => c.status === "done").length;
  if (doneSteps > 0 && control.photos.length === 0) {
    anomalies.push({
      id: "tracabilite",
      type: "documentation",
      severity: "warning",
      title: "Chantier non documenté en photos",
      detail: `${doneSteps} étape(s) terminée(s) sans aucune photo archivée.`,
      recommendation: "Photographier systématiquement chaque étape (preuve pour l'assurance décennale et la levée des réserves).",
    });
  } else if (control.photos.length > 0) {
    strengths.push(`${control.photos.length} photo(s) archivée(s) pour la traçabilité du chantier.`);
  }

  // ── 6. Suivi encore vierge ──
  const hasControlData =
    control.expenses.length > 0 || control.issues.length > 0 || control.observations.length > 0 || control.photos.length > 0;
  if (!hasControlData) {
    anomalies.push({
      id: "suivi_vierge",
      type: "suivi",
      severity: "info",
      title: "Le suivi du chantier n'a pas démarré",
      detail: "Aucune dépense, photo, observation ou problème enregistré pour l'instant.",
      recommendation: "Enregistrez dès maintenant les dépenses et les photos de chaque étape pour activer le diagnostic IA.",
    });
  }

  // ── 7. Points forts ──
  if (consumed > 0 && total > 0 && consumed <= total * 0.8 && progress >= 50) {
    strengths.push("Budget maîtrisé : consommation sous 80 % du budget avec plus de 50 % d'avancement.");
  }

  // ── Score global ──
  const score = Math.min(
    100,
    anomalies.reduce((acc, a) => acc + (a.severity === "critical" ? 28 : a.severity === "warning" ? 12 : 4), 0),
  );
  const level: SiteRiskAnalysis["level"] = score < 25 ? "faible" : score < 50 ? "modéré" : "élevé";
  const top = [...anomalies].sort((a, b) => SEV_ORDER[b.severity] - SEV_ORDER[a.severity])[0];
  const summary = !top
    ? "Aucune anomalie détectée : le suivi du chantier est sain. Continuez à documenter chaque étape."
    : top.severity === "critical"
      ? `Action requise : ${top.title}.`
      : top.severity === "warning"
        ? `Point de vigilance : ${top.title}.`
        : `À surveiller : ${top.title}.`;

  return { score, level, anomalies, strengths, summary, updatedAt: now };
}

// ─── Synthèse / progrès / prochaines étapes ──────────────────────────────────

export function computeProgress(
  phases: RoadmapPhase[],
  planning: PlanningTask[],
  construction: ConstructionStep[],
  adminSteps: (AdminStep & { status: StepStatus })[],
): number {
  const phaseAvg = phases.length ? phases.reduce((a, p) => a + p.progress, 0) / phases.length : 0;
  const planningAvg = planning.length ? planning.reduce((a, t) => a + t.progress, 0) / planning.length : 0;
  const constructionAvg = construction.length ? construction.filter((c) => c.status === "done").length / construction.length * 100 : 0;
  const adminAvg = adminSteps.length ? adminSteps.filter((a) => a.status === "done").length / adminSteps.length * 100 : 0;
  return Math.round(phaseAvg * 0.5 + planningAvg * 0.25 + Math.max(constructionAvg, adminAvg) * 0.25);
}

export function buildSummary(
  project: RoadmapProjectInput,
  budget: Roadmap["budget"],
  planning: PlanningTask[],
  progress: number,
): RoadmapSummary {
  const plannedBudget = budget.totalCost;
  const budgetConsumed = 0;
  const plannedDurationDays = planning.reduce((a, t) => a + t.durationDays, 0);
  const startDate = Date.now() + 14 * 24 * 60 * 60 * 1000; // démarrage estimé +2 semaines
  const endDate = startDate + plannedDurationDays * 24 * 60 * 60 * 1000;
  const tasksTotal = planning.length;
  const tasksDone = planning.filter((t) => t.status === "done").length;
  const tasksInProgress = planning.filter((t) => t.status === "in_progress").length;
  const nextTask = planning.find((t) => t.status !== "done");
  const alerts: RoadmapSummary["alerts"] = [];
  if (!project.costEstimate) alerts.push({ severity: "critical", message: "Aucune estimation de coût — lancez l'estimation du projet." });

  if (progress > 0 && tasksInProgress > 0) alerts.push({ severity: "info", message: `${tasksInProgress} tâche(s) en cours — pensez à mettre à jour l'avancement.` });

  return {
    plannedBudget,
    budgetConsumed,
    budgetGap: budgetConsumed - plannedBudget,
    plannedDurationDays,
    startDate,
    endDate,
    tasksTotal,
    tasksDone,
    tasksInProgress,
    nextTaskId: nextTask?.id ?? null,
    alerts,
  };
}

export function buildNextSteps(
  phases: RoadmapPhase[],
  adminSteps: (AdminStep & { status: StepStatus })[],
  planning: PlanningTask[],
  omissions: OmissionStatus,
): string[] {
  const steps: string[] = [];
  const firstOpenPhase = phases.find((p) => p.status !== "done");
  if (firstOpenPhase) steps.push(`Phase ${String(firstOpenPhase.number).padStart(2, "0")} — ${firstOpenPhase.title} : ${firstOpenPhase.items.find((i) => i.status !== "done")?.label ?? "compléter la phase"}.`);
  const nextAdmin = adminSteps.find((a) => a.status !== "done");
  if (nextAdmin) steps.push(`Démarche administrative : ${nextAdmin.title} (${nextAdmin.organisme}).`);
  const nextTask = planning.find((t) => t.status === "todo");
  if (nextTask) steps.push(`Travaux : préparer « ${nextTask.title} » (${nextTask.durationDays} jours estimés).`);
  steps.push(...omissions.priorityActions.slice(0, 2));
  return steps.slice(0, 6);
}

// ─── Formatage partagé ───────────────────────────────────────────────────────

export function fmtTnd(n: number): string {
  return new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(n);
}

export function fmtDays(days: number): string {
  if (days >= 30) {
    const m = Math.round(days / 30);
    return `${m} mois`;
  }
  return `${days} jours`;
}
