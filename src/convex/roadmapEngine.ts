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
  CONTROL_ITEMS,
  RECEPTION_ITEMS,
  DOCUMENT_TYPES,
  COMPANY_CRITERIA,
  type AdminStep,
} from "./roadmapData";
import { projectTypeLabel } from "./projectTypes";
import { realBuiltArea } from "../lib/buildingLevels";
import {
  resolveRoadmapQuantitatif,
  type RoadmapQuantitatif,
  type RoadmapQuantitatifSource,
  type RoadmapScenarioKey,
  type RoadmapBudgetRow,
} from "./roadmapQuantitatif";
import {
  EXECUTION_PHASE_ORDER,
  EXECUTION_PHASES,
  estimatePlaybookDuration,
  executionContextFromProject,
  playbookForCategory,
  resolvePlaybookTasks,
  type ExecutionContext,
  type ExecutionPhaseKey,
  type ExecutionPlaybook,
  type ResolvedPlaybookTask,
} from "./roadmapPlaybooks";

/** Version de la trame de feuille de route (structure d'exécution par type). */
export const ROADMAP_VERSION = 2;

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

/** Ligne budgétaire = une catégorie du Quantitatif détaillé. */
export type BudgetRow = RoadmapBudgetRow;

export interface BudgetScenario {
  /** Trois scénarios budgétaires + le scénario « Personnalisé » s'il existe. */
  key: RoadmapScenarioKey;
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
  /** Phase d'exécution métier (préparation, structure, finitions…). */
  phaseKey?: ExecutionPhaseKey;
  durationDays: number;
  startDay: number;
  endDay: number;
  dependencies: string[];
  responsible: string;
  cost: number;
  progress: number; // 0-100
  status: "todo" | "in_progress" | "done";
  /** Niveau concerné (RDC, R+1…) quand la tâche est dépliée. */
  levelLabel?: string;
  levelSurface?: number;
  /** Date réelle de fin (renseignée quand la tâche est terminée). */
  completedAt?: number;
}

/** Matériau prévu, repris des articles réellement chiffrés du quantitatif. */
export interface RoadmapMaterial {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  /** Prix unitaire du quantitatif détaillé (TND). */
  unitPrice?: number;
  /** Montant du poste dans le quantitatif détaillé (TND). */
  total?: number;
}

/** Phase d'exécution calculée pour le type de projet (dates, budget, avancement). */
export interface ExecutionPhaseSummary {
  key: ExecutionPhaseKey;
  title: string;
  description: string;
  taskIds: string[];
  progress: number;
  status: StepStatus | "in_progress";
  startDay: number;
  endDay: number;
  budget: number;
}

export interface RoadmapExecution {
  /** Clé de la trame utilisée (une trame par type de projet). */
  key: string;
  label: string;
  title: string;
  description: string;
  taskCount: number;
  totalDays: number;
  phases: ExecutionPhaseSummary[];
  /** Niveaux réels du projet, avec leur surface couverte quand elle est connue. */
  levels: { label: string; surface?: number }[];
}

export interface ConstructionStep {
  id: string;
  order: number;
  title: string;
  /** Phase d'exécution métier à laquelle appartient l'étape. */
  phaseKey?: ExecutionPhaseKey;
  phaseTitle?: string;
  responsible?: string;
  levelLabel?: string;
  levelSurface?: number;
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
  /** Date réelle de fin de l'étape (renseignée au cochage). */
  completedAt?: number;
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
  /** Moment du chantier documenté : avant, pendant ou après les travaux. */
  stage?: "avant" | "pendant" | "apres";
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

export interface ControlHistoryEntry {
  id: string;
  at: number;
  action: string;
  detail?: string;
}

export interface RoadmapControl extends SiteControlData {
  risk: SiteRiskAnalysis;
  /** Journal des modifications saisies depuis la dernière génération. */
  history?: ControlHistoryEntry[];
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
    bathrooms?: number;
    /** Libellé du scénario budgétaire retenu dans l'estimation. */
    scenarioLabel?: string;
    /** Niveaux réellement enregistrés (RDC, R+1…) et leur surface couverte. */
    levels?: { label: string; surface?: number }[];
  };
  summary: RoadmapSummary;
  phases: RoadmapPhase[];
  adminSteps: (AdminStep & { status: StepStatus })[];
  budget: {
    selected: RoadmapScenarioKey;
    scenarios: BudgetScenario[];
    totalCost: number;
  };
  /**
   * Quantitatif détaillé du projet — SOURCE UNIQUE des prix de la feuille de
   * route (catégories, postes, quantités, unités, prix unitaires, totaux).
   */
  quantitatif?: RoadmapQuantitatif;
  planning: PlanningTask[];
  construction: ConstructionStep[];
  /** Trame d'exécution du type de projet (absente des feuilles de route v1). */
  execution?: RoadmapExecution;
  /** Matériaux prévus issus des articles de l'estimation (jamais inventés). */
  materials?: RoadmapMaterial[];
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
  /** Surfaces couvertes réelles de chaque niveau (RDC en premier). */
  levelSurfaces?: number[];
  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  livingRooms?: number;
  wcs?: number;
  pools?: number;
  /** Scénario budgétaire réellement choisi dans « Coût estimatif ». */
  selectedScenario?: string;
  /** Quantitatif détaillé + personnalisations (source unique des prix). */
  quantitatif?: RoadmapQuantitatifSource;
  files?: { name: string; type: string }[];
  aiAnalysis?: { confidence?: number; estimatedDuration?: string };
  costEstimate?: {
    totalCost: number;
    costPerSquareMeter?: number;
    /** Conservés pour ramener au coût réel les feuilles de route générées avant la suppression des imprévus. */
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
  restaurant: "Restaurant",
  cafe: "Café",
  piscine: "Piscine",
  renovation_cuisine: "Rénovation cuisine",
  renovation_salle_de_bain: "Rénovation salle de bain",
  renovation_complete: "Rénovation complète",
  extension_batiment: "Extension bâtiment",
  electricite_complete: "Électricité complète",
  plomberie_complete: "Plomberie complète",
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

  // ── Trame d'exécution PROPRE AU TYPE DE PROJET ───────────────────────────
  // Le type enregistré résout la trame (phases, tâches, équipements, métiers) ;
  // les surfaces et niveaux réels du projet pilotent le dépliage et les durées.
  const playbook = playbookForCategory(project.category);
  const executionContext = executionContextFromProject(project);
  const playbookTasks = resolvePlaybookTasks(playbook, executionContext);

  // ── Budget (Phase 05) — scénario réellement retenu par le projet ─────────
  const scenarios = buildBudgetScenarios(ce, total, surface, project.region);
  const requestedScenario = project.selectedScenario;
  const selected: Roadmap["budget"]["selected"] =
    requestedScenario === "economique" || requestedScenario === "standard" || requestedScenario === "premium"
      ? requestedScenario
      : "standard";

  // ── Phases 01-03 (contenu + remplissage automatique) ─────────────────────
  const terrainIds = playbook.terrainIds.length > 0 ? playbook.terrainIds : TERRAIN_ITEMS.map((t) => t.id);
  const terrainItems: PhaseItem[] = TERRAIN_ITEMS.filter((t) => terrainIds.includes(t.id)).map((t) => ({
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

  // Études techniques réellement utiles au type de projet (une piscine n'a pas
  // besoin des mêmes études qu'un immeuble).
  const studyIds = playbook.studyIds.length > 0 ? playbook.studyIds : TECHNICAL_STUDIES.map((s) => s.id);
  const studyItems: PhaseItem[] = TECHNICAL_STUDIES.filter((s) => studyIds.includes(s.id)).map((s) => ({
    id: s.id,
    label: s.label,
    detail: `${s.detail} — ${s.requirement}.`,
    status: "todo",
    warning: true,
  }));

  // ── Phase 04 — Démarches administratives (Tunisie) ────────────────────────
  // Seules les démarches applicables sont présentées (pas de bornage ni de
  // permis de construire pour une rénovation de salle de bain par exemple).
  const adminIds = playbook.adminIds.length > 0 ? playbook.adminIds : TUNISIA_ADMIN_STEPS.map((a) => a.id);
  const adminSteps: (AdminStep & { status: StepStatus })[] = TUNISIA_ADMIN_STEPS.filter((a) =>
    adminIds.includes(a.id),
  ).map((a) => ({
    ...a,
    status: "todo",
  }));

  // ── Phase 05 — Budget ─────────────────────────────────────────────────────
  const budget = {
    selected,
    scenarios,
    totalCost: scenarios.find((s) => s.key === selected)?.totalCost ?? scenarios[1].totalCost,
  };

  // ── Phase 07 — Planning (Gantt) adapté au type de projet ──────────────────
  // Les tâches sont chiffrées sur le scénario RÉELLEMENT retenu : la somme des
  // lots reste égale au budget du scénario, sans écart avec l'estimation.
  const planning = buildPlanning(budget.totalCost, surface, floors, playbook, executionContext);

  // ── Phase 08 — Travaux d'exécution propres au type de projet ──────────────
  const construction = buildConstructionSteps(budget.totalCost, planning, playbookTasks);

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
    playbook,
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

  const base: Roadmap = {
    version: ROADMAP_VERSION,
    country: "tunisie",
    currency: "TND",
    generatedAt,
    progress,
    project: {
      id: project._id,
      name: project.name,
      category: project.category,
      categoryLabel: projectTypeLabel(project.category),
      region: project.region,
      regionLabel: project.region ? REGION_LABEL[project.region] : undefined,
      surface,
      surfaceTotale: project.surfaceTotale,
      floors,
      bedrooms: project.bedrooms,
      bathrooms: project.bathrooms,
      scenarioLabel: scenarios.find((s) => s.key === selected)?.label ?? "Standard",
      levels: buildLevels(project, floors),
    },
    summary,
    phases,
    adminSteps,
    budget,
    planning,
    construction,
    execution: buildExecution(playbook, executionContext, construction, planning),
    materials: buildMaterials(ce),
    omissions,
    predictions,
    documents: DOCUMENT_TYPES.map((d) => ({ id: d.id, title: d.title, description: d.description })),
    control: { ...initialControl, risk, history: [] },
    nextSteps,
    companyCriteria: COMPANY_CRITERIA,
    disclaimer:
      "Ce guide est généré automatiquement par IA à partir des données du projet. Il ne remplace pas l'avis d'un architecte, d'un ingénieur, d'un bureau d'études ou des autorités compétentes : vérifiez toujours les exigences réglementaires locales (Tunisie) avant toute décision.",
  };

  // ── Synchronisation des prix sur le Quantitatif détaillé ──────────────────
  // Dernière étape : tous les montants affichés (budget, planning, travaux,
  // matériaux) sont recalés sur le quantitatif du projet, au dinar près.
  return syncRoadmapQuantitatif(base, project, project.selectedScenario);
}

// ─── Synchronisation des prix sur le Quantitatif détaillé ────────────────────

/**
 * Recale TOUS les montants de la feuille de route sur le « Quantitatif
 * détaillé » du projet (source unique) :
 *   • budget (catégories, sous-totaux, total) et scénarios ;
 *   • coûts du planning et des étapes de travaux (même total, aucune double
 *     comptabilisation) ;
 *   • liste des matériaux (quantités, unités, prix unitaires, montants) ;
 *   • prédictions recalculées depuis les nouveaux montants.
 *
 * Les progressions, statuts, photos et dépenses saisis par l'utilisateur ne
 * sont jamais modifiés. Sans quantitatif enregistré, rien n'est inventé : la
 * répartition d'origine est conservée et l'absence est signalée.
 */
export function syncRoadmapQuantitatif(
  r: Roadmap,
  input: RoadmapProjectInput,
  scenario?: string,
): Roadmap {
  // Surface réellement construite (tous niveaux), MÊME base que le coût au m²
  // du quantitatif détaillé (`realBuiltArea` du moteur de coûts).
  const builtSurface = input.surface
    ? realBuiltArea(input.surface, input.floors ?? 1, input.levelSurfaces)
    : undefined;
  const quantitatif = resolveRoadmapQuantitatif({
    costEstimate: input.costEstimate ?? null,
    quantitatif: input.quantitatif ?? null,
    builtSurface,
    scenario: scenario ?? r.budget?.selected,
  });

  // Projet sans quantitatif : comportement historique conservé, alerte ajoutée.
  if (quantitatif.source !== "quantitatif_detaille") {
    return { ...r, quantitatif };
  }

  const standardTotal =
    quantitatif.scenarios.find((s) => s.key === "standard")?.totalCost ?? quantitatif.totals.total;
  const scenarios: BudgetScenario[] = quantitatif.scenarios.map((s) => ({
    key: s.key,
    label: s.label,
    totalCost: s.totalCost,
    costPerM2: s.costPerM2,
    multiplier: standardTotal > 0 ? Math.round((s.totalCost / standardTotal) * 100) / 100 : 1,
    rows: s.rows,
  }));

  const totalCost = quantitatif.totals.total;
  const budget: Roadmap["budget"] = {
    selected: quantitatif.scenario,
    scenarios,
    totalCost,
  };

  // Coûts des tâches : répartition proportionnelle conservée, somme EXACTEMENT
  // égale au total du quantitatif (aucun montant ajouté ni perdu).
  const planning = rescalePlanningCosts(r.planning ?? [], totalCost);
  const planById = new Map(planning.map((t) => [t.id, t]));
  const construction = (r.construction ?? []).map((c) => {
    const task = planById.get(c.id);
    return task ? { ...c, budgetEstime: task.cost, dureeJours: task.durationDays } : c;
  });

  // Phase 02 : fourchette budgétaire = montants réels du quantitatif.
  const ecoTotal = scenarios.find((s) => s.key === "economique")?.totalCost ?? totalCost;
  const premiumTotal = scenarios.find((s) => s.key === "premium")?.totalCost ?? totalCost;

  // Phase 08 : montants affichés dans les étapes = ceux du planning recalé.
  const phases = (r.phases ?? []).map((p) => {
    if (p.id === "phase_02") {
      return {
        ...p,
        items: p.items.map((it) =>
          it.id === "budget_preliminaire"
            ? {
                ...it,
                detail: `Fourchette : ${fmtTnd(ecoTotal)} (économique) → ${fmtTnd(premiumTotal)} (premium).`,
              }
            : it,
        ),
      };
    }
    if (p.id !== "phase_08") return p;
    const items: PhaseItem[] = construction.map((c) => ({
      id: c.id,
      label: c.title,
      detail: `${c.phaseTitle ?? "Travaux"} · ${c.dureeJours} j · ${fmtTnd(c.budgetEstime)}`,
      status: c.status,
    }));
    return { ...p, items, progress: phaseProgress(items), status: phaseStatus(items) };
  });

  const predictions = buildPredictions(input, scenarios, planning, construction);
  const summary = {
    ...r.summary,
    plannedBudget: totalCost,
    budgetGap: (r.summary?.budgetConsumed ?? 0) - totalCost,
  };

  const execution = r.execution
    ? buildExecution(
        playbookForCategory(input.category),
        executionContextFromProject(input),
        construction,
        planning,
      )
    : r.execution;

  return {
    ...r,
    quantitatif,
    budget,
    planning,
    construction,
    phases,
    execution,
    predictions,
    summary,
    materials: quantitatif.materials.map((m) => ({
      name: m.name,
      quantity: m.quantity,
      unit: m.unit,
      category: m.category,
      unitPrice: m.unitPrice,
      total: m.total,
    })),
  };
}

/**
 * Répartit un total sur les tâches du planning en conservant leurs poids
 * relatifs : la somme des coûts est exactement le total fourni.
 */
export function rescalePlanningCosts(planning: PlanningTask[], totalCost: number): PlanningTask[] {
  const list = planning ?? [];
  if (list.length === 0) return list;
  const current = list.reduce((acc, t) => acc + (Number(t.cost) || 0), 0);
  if (current === totalCost) return list;

  let allocated = 0;
  return list.map((t, index) => {
    if (index === list.length - 1) {
      return { ...t, cost: totalCost - allocated };
    }
    const cost =
      current > 0
        ? Math.round((Number(t.cost) || 0) * (totalCost / current))
        : Math.round(totalCost / list.length);
    allocated += cost;
    return { ...t, cost };
  });
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



/**
 * Compatibilité ascendante — supprime les imprévus d'une feuille de route
 * enregistrée avant leur suppression : ligne « Marge pour imprévus » retirée,
 * postes renormalisés à 100 %, budget ramené au coût réel, prédictions
 * recalculées et textes nettoyés. Pure et idempotente ; aucune donnée n'est
 * modifiée en base.
 */
export function stripImprevusFromRoadmap(r: Roadmap, input: RoadmapProjectInput): Roadmap {
  const legacyRow = r.budget.scenarios
    .flatMap((s) => s.rows ?? [])
    .find((row) => row.key === "imprevus");
  if (!legacyRow) return r; // feuille de route déjà sans imprévus

  const pct = input.costEstimate?.contingencyPercentage ?? 0;
  // Facteur exact de la majoration appliquée par l'ancien moteur (repli : part
  // de la ligne supprimée dans la répartition enregistrée).
  const factor = pct > 0 ? 1 / (1 + pct / 100) : 1 - Math.min(90, legacyRow.pct) / 100;

  const scenarios: BudgetScenario[] = r.budget.scenarios.map((s) => {
    const kept = (s.rows ?? []).filter((row) => row.key !== "imprevus");
    const totalCost = round(s.totalCost * factor);
    const keptSum = kept.reduce((a, row) => a + row.pct, 0);
    const rows: BudgetRow[] = kept.map((row) => ({
      ...row,
      pct: keptSum > 0 ? round((row.pct / keptSum) * 100) : row.pct,
    }));
    // Arrondi : la somme des postes doit couvrir 100 % du coût réel
    let diff = 100 - rows.reduce((a, row) => a + row.pct, 0);
    let i = rows.length - 1;
    while (diff !== 0 && rows.length > 0) {
      const step = diff > 0 ? 1 : -1;
      if (rows[i].pct + step >= 0) rows[i] = { ...rows[i], pct: rows[i].pct + step };
      diff -= step;
      i = (i - 1 + rows.length) % rows.length;
    }
    return {
      ...s,
      totalCost,
      costPerM2: round(s.costPerM2 * factor),
      rows: rows.map((row) => ({ ...row, amount: round((totalCost * row.pct) / 100) })),
    };
  });

  const textFixes: [string, string][] = [
    [
      "Prévoyez la marge pour imprévus et verrouillez les prix des matériaux tôt.",
      "Verrouillez les prix des matériaux et les devis d'entreprises tôt.",
    ],
    [
      "tant que la marge pour imprévus est conservée et que les devis sont fermes",
      "tant que les devis sont fermes et que le budget est suivi de près",
    ],
    [
      "main-d'œuvre, imprévus…",
      "main-d'œuvre, équipements…",
    ],
    [
      "Réaffecter la marge pour imprévus ou réduire le poste",
      "Réaffecter le budget d'un autre poste ou réduire le poste",
    ],
  ];
  const clean = (text: string) => textFixes.reduce((acc, [from, to]) => acc.split(from).join(to), text);

  return {
    ...r,
    phases: r.phases.map((p) => ({
      ...p,
      items: p.items.map((it) => (it.detail ? { ...it, detail: clean(it.detail) } : it)),
    })),
    budget: {
      ...r.budget,
      totalCost: round(r.budget.totalCost * factor),
      scenarios,
    },
    predictions: buildPredictions(input, scenarios, r.planning, r.construction),
    control: {
      ...r.control,
      risk: {
        ...r.control.risk,
        anomalies: r.control.risk.anomalies.map((a) => ({
          ...a,
          recommendation: clean(a.recommendation),
        })),
      },
    },
  };
}

/**
 * Planning du projet, construit à partir des tâches RÉELLES de la trame du
 * type de projet : durées et coûts proportionnels aux poids de la trame, budget
 * total identique à l'estimation (aucun montant ajouté).
 */
export function buildPlanning(
  totalCost: number,
  surface: number,
  floors: number,
  playbook: ExecutionPlaybook = playbookForCategory("maison"),
  context?: ExecutionContext,
): PlanningTask[] {
  const ctx: ExecutionContext = context ?? {
    surface,
    floors: Math.max(1, Math.round(floors)),
    hasPool: false,
    hasExterior: true,
  };
  const playbookTasks = resolvePlaybookTasks(playbook, ctx);
  const totalDays = estimatePlaybookDuration(playbook, ctx, totalCost);
  const weightSum = playbookTasks.reduce((acc, t) => acc + t.weight, 0) || 1;

  let cursor = 0;
  let allocated = 0;
  return playbookTasks.map((t, i) => {
    const durationDays = Math.max(1, Math.round((totalDays * t.weight) / weightSum));
    const cost =
      i === playbookTasks.length - 1
        ? Math.round(totalCost) - allocated
        : Math.round((totalCost * t.weight) / weightSum);
    allocated += cost;
    const task: PlanningTask = {
      id: t.resolvedId,
      title: t.displayTitle,
      phase: "Phase 08 — Construction",
      phaseKey: t.phase,
      durationDays,
      startDay: cursor,
      endDay: cursor + durationDays,
      dependencies: i > 0 ? [playbookTasks[i - 1].resolvedId] : [],
      responsible: t.responsible,
      cost,
      progress: 0,
      status: "todo",
      levelLabel: t.levelLabel,
      levelSurface: t.levelSurface,
    };
    cursor += durationDays;
    return task;
  });
}

export function estimateDurationDays(totalCost: number, surface: number, floors: number): number {
  const base = Math.max(60, Math.round(surface * 0.55 + floors * 20));
  const costFactor = Math.max(0.85, Math.min(1.3, totalCost / Math.max(surface, 1) / 1400));
  return Math.round(base * costFactor);
}

// ─── Étapes de construction (Phase 08) ───────────────────────────────────────

export function buildConstructionSteps(
  totalCost: number,
  planning: PlanningTask[],
  playbookTasks?: ResolvedPlaybookTask[],
): ConstructionStep[] {
  const tasks =
    playbookTasks ??
    resolvePlaybookTasks(playbookForCategory("maison"), {
      floors: 1,
      hasPool: false,
      hasExterior: true,
    });

  return tasks.map((t, index) => {
    const task = planning.find((p) => p.id === t.resolvedId);
    return {
      id: t.resolvedId,
      order: index + 1,
      title: t.displayTitle,
      phaseKey: t.phase,
      phaseTitle: EXECUTION_PHASES[t.phase].title,
      responsible: t.responsible,
      levelLabel: t.levelLabel,
      levelSurface: t.levelSurface,
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
  playbook: ExecutionPlaybook;
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
      { id: "allocation", label: "Répartition du budget validée", detail: "Gros œuvre, second œuvre, main-d'œuvre, équipements…", status: "todo" },
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
    title: input.playbook.executionTitle,
    icon: "HardHat",
    description: input.playbook.executionDescription,
    items: input.construction.map((c) => ({
      id: c.id,
      label: c.title,
      detail: `${c.phaseTitle ?? "Travaux"} · ${c.dureeJours} j · ${fmtTnd(c.budgetEstime)}`,
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

  // Seules les démarches réellement présentes dans la trame sont vérifiées.
  const titre = adminSteps.find((a) => a.id === "titre");
  if (titre && titre.status !== "done") orange.push("Vérifier le titre de propriété (Conservation foncière).");

  const permis = adminSteps.find((a) => a.id === "permis");
  if (permis && permis.status !== "done") orange.push("Permis de construire : démarche à engager (Phase 04).");

  const geo = adminSteps.find((a) => a.id === "geotechnique");
  if (geo && geo.status !== "done") orange.push("Étude géotechnique prévue mais non réalisée — obligatoire avant fondations.");

  if (!construction.some((c) => c.status === "done")) orange.push("Aucune étape de travaux démarrée — le planning est prêt.");

  // Actions prioritaires — adaptées aux démarches et travaux du projet.
  if (red.length > 0) priorityActions.push(...red.slice(0, 3).map((r) => `Résoudre : ${r}`));
  if (titre) priorityActions.push("Engager la vérification du titre de propriété et le bornage du terrain.");
  if (permis) priorityActions.push("Déposer le dossier de permis de construire auprès de la municipalité.");
  if (geo) priorityActions.push("Lancer l'étude géotechnique et les études techniques (bureaux d'études agréés).");
  priorityActions.push("Demander au minimum 3 devis par lot auprès d'entreprises recommandées.");
  const firstTask = construction[0];
  if (firstTask) priorityActions.push(`Préparer l'étape « ${firstTask.title} » (${firstTask.dureeJours} jours estimés).`);

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
        ? "L'écart entre le scénario standard et premium est important : des surcoûts sont probables. Verrouillez les prix des matériaux et les devis d'entreprises tôt."
        : "L'écart entre scénarios est raisonnable. Le risque de dépassement reste modéré tant que les devis sont fermes et que le budget est suivi de près.",
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
        recommendation: `Réaffecter le budget d'un autre poste ou réduire le poste « ${row.label} ».`,
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
  /** Démarrage déjà enregistré : il ne doit jamais glisser à chaque mise à jour. */
  startDateOverride?: number,
): RoadmapSummary {
  const plannedBudget = budget.totalCost;
  const budgetConsumed = 0;
  const plannedDurationDays = planning.reduce((a, t) => a + t.durationDays, 0);
  const startDate = startDateOverride ?? Date.now() + 14 * 24 * 60 * 60 * 1000; // démarrage estimé +2 semaines
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

// ─── Niveaux réels, phases d'exécution et matériaux prévus ─────────────────

const LEVEL_LABEL = (index: number) => (index === 0 ? "RDC" : `R+${index}`);

/** Niveaux enregistrés du projet (aucune surface inventée si elle est absente). */
export function buildLevels(
  project: Pick<RoadmapProjectInput, "surface" | "levelSurfaces">,
  floors: number,
): { label: string; surface?: number }[] {
  const count = Math.max(1, Math.round(floors));
  return Array.from({ length: count }, (_, i) => {
    const stored = project.levelSurfaces?.[i];
    const surface = typeof stored === "number" && stored > 0 ? stored : i === 0 ? project.surface : undefined;
    return { label: LEVEL_LABEL(i), surface: typeof surface === "number" && surface > 0 ? surface : undefined };
  });
}

/**
 * Phases d'exécution du projet : seules les phases réellement pourvues de
 * tâches par la trame apparaissent (une piscine n'affiche pas de phase
 * « planchers et escaliers »). Dates, budget et avancement sont calculés
 * depuis le planning et les étapes enregistrées.
 */
export function buildExecution(
  playbook: ExecutionPlaybook,
  ctx: ExecutionContext,
  construction: ConstructionStep[],
  planning: PlanningTask[],
): RoadmapExecution {
  const phases: ExecutionPhaseSummary[] = [];
  for (const key of EXECUTION_PHASE_ORDER) {
    const steps = construction.filter((c) => c.phaseKey === key);
    if (steps.length === 0) continue;
    const ids = new Set(steps.map((s) => s.id));
    const planTasks = planning.filter((p) => ids.has(p.id));
    const progress = planTasks.length
      ? Math.round(planTasks.reduce((acc, t) => acc + t.progress, 0) / planTasks.length)
      : Math.round((steps.filter((s) => s.status === "done").length / steps.length) * 100);
    const startDay = planTasks.length ? Math.min(...planTasks.map((t) => t.startDay)) : 0;
    const endDay = planTasks.length ? Math.max(...planTasks.map((t) => t.endDay)) : 0;
    phases.push({
      key,
      title: EXECUTION_PHASES[key].title,
      description: EXECUTION_PHASES[key].description,
      taskIds: steps.map((s) => s.id),
      progress,
      status: steps.every((s) => s.status === "done") ? "done" : progress > 0 ? "in_progress" : "todo",
      startDay,
      endDay,
      budget: steps.reduce((acc, s) => acc + s.budgetEstime, 0),
    });
  }

  return {
    key: playbook.key,
    label: playbook.label,
    title: playbook.executionTitle,
    description: playbook.executionDescription,
    taskCount: construction.length,
    totalDays: planning.reduce((acc, t) => acc + t.durationDays, 0),
    phases,
    levels: buildLevels(
      { levelSurfaces: ctx.levelSurfaces, surface: ctx.surface },
      ctx.floors,
    ),
  };
}

/** Matériaux prévus : uniquement les articles réellement chiffrés au devis. */
export function buildMaterials(
  ce: RoadmapProjectInput["costEstimate"],
): RoadmapMaterial[] {
  const byKey = new Map<string, RoadmapMaterial>();
  for (const lot of ce?.breakdown ?? []) {
    for (const item of lot.items ?? []) {
      if (!item?.name || typeof item.quantity !== "number" || item.quantity <= 0) continue;
      const unit = item.unit ?? "";
      const key = `${item.name}|${unit}`;
      const existing = byKey.get(key);
      byKey.set(key, {
        name: item.name,
        unit,
        quantity: round((existing?.quantity ?? 0) + item.quantity),
        category: existing?.category ?? lot.label,
      });
    }
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

// ─── Compatibilité des feuilles de route enregistrées ──────────────────────

/** Vrai si l'utilisateur n'a encore rien coché, saisi ni avancé. */
export function isRoadmapUntouched(r: Roadmap | null | undefined): boolean {
  if (!r) return true;
  if ((r.planning ?? []).some((t) => t.progress > 0 || t.status !== "todo")) return false;
  if ((r.construction ?? []).some((c) => c.status === "done")) return false;
  if ((r.adminSteps ?? []).some((a) => a.status === "done")) return false;
  // Les éléments `auto` sont remplis par le moteur depuis le projet (région,
  // surface, estimation) : ils ne traduisent aucune action de l'utilisateur.
  if ((r.phases ?? []).some((p) => p.items.some((i) => i.status === "done" && !i.auto))) return false;
  const c = r.control;
  if (c && (c.expenses.length > 0 || c.issues.length > 0 || c.photos.length > 0 || c.observations.length > 0)) {
    return false;
  }
  return true;
}

/** La trame enregistrée correspond-elle au type actuel du projet ? */
export function roadmapMatchesProject(r: Roadmap, input: RoadmapProjectInput): boolean {
  if (!r?.execution) return false;
  return r.version >= ROADMAP_VERSION && r.execution.key === playbookForCategory(input.category).key;
}

/**
 * Ramène une feuille de route à la trame du type de projet quand elle a été
 * générée avec une autre trame (ou l'ancienne version). Une feuille de route
 * déjà renseignée n'est JAMAIS écrasée : la progression de l'utilisateur est
 * conservée.
 */
export function ensureCurrentRoadmap(r: Roadmap, input: RoadmapProjectInput): Roadmap {
  if (roadmapMatchesProject(r, input)) return r;
  return isRoadmapUntouched(r) ? generateRoadmap(input) : r;
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
