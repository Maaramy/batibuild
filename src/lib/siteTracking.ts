// ============================================================================
// GESTION & SUIVI DE CHANTIER — moteur métier pur (sans React ni Convex)
// ----------------------------------------------------------------------------
// Ce module ne contient AUCUNE donnée utilisateur : il traduit un chantier
// (phases, tâches, dépenses, matériaux) en indicateurs vérifiables. Il est
// partagé par le backend Convex (contrôle des droits, rapports, prévisions) et
// par l'interface (affichage), ce qui garantit que les deux racontent toujours
// la même histoire.
//
// Deux familles de calculs, volontairement séparées :
//   • RÉEL      — quantités saisies (avancement, dépenses, livraisons) ;
//   • PRÉVISION — projections algorithmiques (retard probable, coût final).
// Les secondes sont toujours renvoyées avec `isEstimate: true` et une marge de
// confiance : l'interface ne peut pas les présenter comme des certitudes.
// ============================================================================

import { PROJECT_TYPE_LABELS, type ProjectType } from "../convex/projectTypes";

// ============================================================================
// 1. PHASES DE CHANTIER ADAPTÉES AU TYPE DE PROJET
// ============================================================================

export interface PhaseTemplate {
  key: string;
  label: string;
  /** Poids dans l'avancement global (la somme des poids vaut 100). */
  weight: number;
  /** Phase précédente dont dépend son démarrage (null = démarrage libre). */
  dependsOn: string | null;
}

const RESIDENTIAL: PhaseTemplate[] = [
  { key: "installation", label: "Installation du chantier", weight: 4, dependsOn: null },
  { key: "terrassement", label: "Terrassement et fondations", weight: 10, dependsOn: "installation" },
  { key: "gros_oeuvre", label: "Gros œuvre", weight: 18, dependsOn: "terrassement" },
  { key: "elevation", label: "Élévation et maçonnerie", weight: 14, dependsOn: "gros_oeuvre" },
  { key: "charpente", label: "Charpente et toiture", weight: 10, dependsOn: "elevation" },
  { key: "techniques", label: "Électricité et plomberie", weight: 12, dependsOn: "charpente" },
  { key: "enduits", label: "Enduits et revêtements", weight: 10, dependsOn: "techniques" },
  { key: "menuiserie", label: "Menuiserie", weight: 8, dependsOn: "enduits" },
  { key: "peinture", label: "Peinture et finitions", weight: 7, dependsOn: "menuiserie" },
  { key: "exterieurs", label: "Aménagements extérieurs", weight: 4, dependsOn: "peinture" },
  { key: "reception", label: "Réception finale", weight: 3, dependsOn: "exterieurs" },
];

/** Locaux professionnels : mêmes phases, aménagements extérieurs réduits. */
function commercialPhases(): PhaseTemplate[] {
  return RESIDENTIAL.map((phase) =>
    phase.key === "exterieurs" ? { ...phase, weight: 2 } : phase,
  ).map((phase) =>
    phase.key === "reception" ? { ...phase, weight: 5 } : phase,
  );
}

/** Rénovation / extension : pas de terrassement complet, démolition en tête. */
const RENOVATION: PhaseTemplate[] = [
  { key: "installation", label: "Installation et protection du chantier", weight: 5, dependsOn: null },
  { key: "demolition", label: "Démolition et dépose", weight: 12, dependsOn: "installation" },
  { key: "structure", label: "Structure et reprise du bâti", weight: 20, dependsOn: "demolition" },
  { key: "techniques", label: "Électricité et plomberie", weight: 18, dependsOn: "structure" },
  { key: "enduits", label: "Enduits et revêtements", weight: 16, dependsOn: "techniques" },
  { key: "menuiserie", label: "Menuiserie et équipements", weight: 14, dependsOn: "enduits" },
  { key: "finitions", label: "Peinture et finitions", weight: 10, dependsOn: "menuiserie" },
  { key: "reception", label: "Réception finale", weight: 5, dependsOn: "finitions" },
];

/** Lots techniques seuls (électricité / plomberie complètes). */
const TECHNICAL: PhaseTemplate[] = [
  { key: "installation", label: "Installation du chantier", weight: 8, dependsOn: null },
  { key: "preparation", label: "Préparation et dépose", weight: 15, dependsOn: "installation" },
  { key: "reseaux", label: "Réseaux et canalisations", weight: 35, dependsOn: "preparation" },
  { key: "equipements", label: "Pose des équipements", weight: 27, dependsOn: "reseaux" },
  { key: "essais", label: "Essais et mise en service", weight: 10, dependsOn: "equipements" },
  { key: "reception", label: "Réception finale", weight: 5, dependsOn: "essais" },
];

/** Piscine : ouvrage extérieur, pas de gros œuvre de bâtiment. */
const POOL: PhaseTemplate[] = [
  { key: "installation", label: "Installation du chantier", weight: 6, dependsOn: null },
  { key: "terrassement", label: "Terrassement et fouilles", weight: 18, dependsOn: "installation" },
  { key: "structure", label: "Structure et étanchéité", weight: 30, dependsOn: "terrassement" },
  { key: "techniques", label: "Filtration et hydraulique", weight: 20, dependsOn: "structure" },
  { key: "finitions", label: "Revêtements et margelles", weight: 18, dependsOn: "techniques" },
  { key: "reception", label: "Mise en eau et réception", weight: 8, dependsOn: "finitions" },
];

const RESIDENTIAL_TYPES: readonly string[] = [
  "maison",
  "villa",
  "appartement",
  "studio",
  "duplex",
  "immeuble",
  "projet_neuf",
  "residence_touristique",
];

const COMMERCIAL_TYPES: readonly string[] = [
  "local_commercial",
  "bureau",
  "entrepot",
  "restaurant",
  "cafe",
];

const RENOVATION_TYPES: readonly string[] = [
  "renovation_complete",
  "renovation_cuisine",
  "renovation_salle_de_bain",
  "extension_batiment",
];

/**
 * Phases par défaut d'un type de projet. Un type inconnu (donnée historique)
 * reçoit le planning résidentiel complet : aucun chantier ne reste sans plan.
 */
export function phasesForProjectType(type: string | null | undefined): PhaseTemplate[] {
  const key = (type ?? "").trim();
  if (RESIDENTIAL_TYPES.includes(key)) return RESIDENTIAL;
  if (COMMERCIAL_TYPES.includes(key)) return commercialPhases();
  if (RENOVATION_TYPES.includes(key)) return RENOVATION;
  if (key === "electricite_complete" || key === "plomberie_complete") return TECHNICAL;
  if (key === "piscine") return POOL;
  return RESIDENTIAL;
}

/** Catégories de travaux proposées pour les dépenses (libellés métier). */
export const EXPENSE_CATEGORIES = [
  "installation",
  "terrassement",
  "gros_oeuvre",
  "elevation",
  "charpente",
  "techniques",
  "enduits",
  "menuiserie",
  "peinture",
  "exterieurs",
  "main_oeuvre",
  "materiaux",
  "equipement",
  "divers",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  installation: "Installation de chantier",
  terrassement: "Terrassement / fondations",
  gros_oeuvre: "Gros œuvre",
  elevation: "Élévation / maçonnerie",
  charpente: "Charpente / toiture",
  techniques: "Électricité / plomberie",
  enduits: "Enduits / revêtements",
  menuiserie: "Menuiserie",
  peinture: "Peinture / finitions",
  exterieurs: "Aménagements extérieurs",
  main_oeuvre: "Main-d'œuvre",
  materiaux: "Matériaux",
  equipement: "Équipements",
  divers: "Dépenses diverses",
};

export type ExpenseNature = "materiaux" | "main_oeuvre" | "equipement" | "autre";

export const EXPENSE_NATURE_LABELS: Record<ExpenseNature, string> = {
  materiaux: "Matériaux",
  main_oeuvre: "Main-d'œuvre",
  equipement: "Équipements",
  autre: "Autre",
};

// ============================================================================
// 2. PLANNING — génération et avancement
// ============================================================================

export interface PlannedPhase {
  phaseKey: string;
  name: string;
  weight: number;
  dependsOn: string | null;
  startDate: number;
  endDate: number;
}

const DAY = 86_400_000;

/**
 * Répartit une période globale sur les phases, au prorata de leur poids, en
 * chaîne (chaque phase démarre à la fin de celle dont elle dépend). Les dates
 * restent dans la période demandée : aucune phase ne « sort » du chantier.
 */
export function schedulePhases(
  phases: PhaseTemplate[],
  startDate: number,
  endDate: number,
): PlannedPhase[] {
  const start = Math.min(startDate, endDate);
  const totalDays = Math.max(1, Math.round((endDate - start) / DAY));
  const totalWeight = phases.reduce((sum, phase) => sum + phase.weight, 0) || 1;
  let cursor = start;
  return phases.map((phase, index) => {
    const share = phase.weight / totalWeight;
    const isLast = index === phases.length - 1;
    const duration = Math.max(1, Math.round(totalDays * share));
    const phaseEnd = isLast ? endDate : Math.min(endDate, cursor + duration * DAY);
    const planned: PlannedPhase = {
      phaseKey: phase.key,
      name: phase.label,
      weight: phase.weight,
      dependsOn: phase.dependsOn,
      startDate: cursor,
      endDate: phaseEnd,
    };
    cursor = phaseEnd;
    return planned;
  });
}

export interface TaskProgressInput {
  weight?: number | null;
  progress?: number | null;
  status?: string | null;
  startDate?: number | null;
  endDate?: number | null;
}

const clampPct = (value: number) => Math.max(0, Math.min(100, value));

/** Avancement d'une tâche : `progress` saisi, sinon déduit de son statut. */
export function taskProgress(task: TaskProgressInput): number {
  if (typeof task.progress === "number") return clampPct(task.progress);
  if (task.status === "done") return 100;
  if (task.status === "in_progress") return 50;
  return 0;
}

/** Avancement physique global (moyenne pondérée par le poids des tâches). */
export function weightedProgress(tasks: TaskProgressInput[]): number {
  if (tasks.length === 0) return 0;
  const totalWeight = tasks.reduce((sum, task) => sum + Math.max(0.0001, task.weight ?? 1), 0);
  const done = tasks.reduce(
    (sum, task) => sum + Math.max(0.0001, task.weight ?? 1) * taskProgress(task),
    0,
  );
  return Math.round((done / totalWeight) * 10) / 10;
}

/**
 * Avancement théorique attendu à une date donnée, d'après le planning
 * (0 avant le premier démarrage, 100 après la dernière échéance).
 */
export function plannedProgressAt(tasks: TaskProgressInput[], at: number): number {
  const dated = tasks.filter(
    (task) =>
      typeof task.startDate === "number" &&
      typeof task.endDate === "number" &&
      (task.endDate as number) > (task.startDate as number),
  );
  if (dated.length === 0) return 0;
  const totalWeight = dated.reduce((sum, task) => sum + Math.max(0.0001, task.weight ?? 1), 0);
  const expected = dated.reduce((sum, task) => {
    const start = task.startDate as number;
    const end = task.endDate as number;
    const ratio = at <= start ? 0 : at >= end ? 1 : (at - start) / (end - start);
    return sum + Math.max(0.0001, task.weight ?? 1) * ratio * 100;
  }, 0);
  return Math.round((expected / totalWeight) * 10) / 10;
}

/** Tâches en retard : non terminées alors que leur échéance est passée. */
export function lateTasks<T extends TaskProgressInput & { name?: string }>(
  tasks: T[],
  at: number,
): T[] {
  return tasks.filter(
    (task) =>
      typeof task.endDate === "number" &&
      (task.endDate as number) < at &&
      taskProgress(task) < 100,
  );
}

// ============================================================================
// 3. BUDGET
// ============================================================================

export interface ExpenseInput {
  amount: number;
  category?: string | null;
  nature?: string | null;
  date?: number | null;
}

export interface MaterialCostInput {
  plannedQty?: number | null;
  deliveredQty?: number | null;
  unitPrice?: number | null;
}

export interface BudgetSummary {
  /** Budget de départ validé à la création du chantier. */
  initial: number;
  /** Budget révisé (avenants) — égal au budget initial s'il n'a pas été revu. */
  revised: number;
  /** Dépenses réellement engagées (saisies). */
  spent: number;
  /** Valeur des matériaux livrés (quantité livrée × prix unitaire). */
  materialsDeliveredValue: number;
  /** Écart budgétaire : négatif = dépassement. */
  variance: number;
  variancePct: number;
  /** Part du budget consommée (0-100, peut dépasser 100). */
  consumedPct: number;
  byCategory: { category: string; label: string; amount: number; sharePct: number }[];
  byNature: { nature: ExpenseNature; label: string; amount: number }[];
}

export function budgetSummary(input: {
  budgetInitial: number;
  budgetRevised?: number | null;
  expenses: ExpenseInput[];
  materials?: MaterialCostInput[];
}): BudgetSummary {
  const initial = Math.max(0, input.budgetInitial ?? 0);
  const revised = Math.max(0, input.budgetRevised ?? initial);
  const spent = Math.round(
    input.expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0),
  );
  const materialsDeliveredValue = Math.round(
    (input.materials ?? []).reduce(
      (sum, material) =>
        sum + (material.deliveredQty ?? 0) * (material.unitPrice ?? 0),
      0,
    ),
  );

  const byCategoryMap = new Map<string, number>();
  for (const expense of input.expenses) {
    const key = expense.category || "divers";
    byCategoryMap.set(key, (byCategoryMap.get(key) ?? 0) + (Number(expense.amount) || 0));
  }
  const byCategory = [...byCategoryMap.entries()]
    .map(([category, amount]) => ({
      category,
      label:
        EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] ??
        (category === "divers" ? EXPENSE_CATEGORY_LABELS.divers : category),
      amount: Math.round(amount),
      sharePct: spent > 0 ? Math.round((amount / spent) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const natureMap = new Map<ExpenseNature, number>();
  for (const expense of input.expenses) {
    const nature = (expense.nature ?? "autre") as ExpenseNature;
    natureMap.set(nature, (natureMap.get(nature) ?? 0) + (Number(expense.amount) || 0));
  }
  const byNature = (["materiaux", "main_oeuvre", "equipement", "autre"] as ExpenseNature[]).map(
    (nature) => ({
      nature,
      label: EXPENSE_NATURE_LABELS[nature],
      amount: Math.round(natureMap.get(nature) ?? 0),
    }),
  );

  const variance = Math.round(revised - spent);
  return {
    initial,
    revised,
    spent,
    materialsDeliveredValue,
    variance,
    variancePct: revised > 0 ? Math.round((variance / revised) * 1000) / 10 : 0,
    consumedPct: revised > 0 ? Math.round((spent / revised) * 1000) / 10 : 0,
    byCategory,
    byNature,
  };
}

// ============================================================================
// 4. MATÉRIAUX
// ============================================================================

export interface MaterialTrackingInput {
  name: string;
  unit?: string | null;
  plannedQty?: number | null;
  orderedQty?: number | null;
  deliveredQty?: number | null;
  consumedQty?: number | null;
  unitPrice?: number | null;
}

export type MaterialAlert = "rupture" | "sous_commande" | "surplus" | "ok";

export interface MaterialLine extends MaterialTrackingInput {
  remainingQty: number;
  /** Part du besoin couverte par les livraisons (%). */
  coveragePct: number;
  valueOrdered: number;
  alert: MaterialAlert;
  alertLabel: string;
}

/**
 * Ligne de suivi d'un matériau. Une « rupture » est signalée dès que le reste
 * à livrer ne couvre pas le besoin restant à consommer — c'est le seul signal
 * bloquant pour le chantier.
 */
export function materialLine(material: MaterialTrackingInput): MaterialLine {
  const planned = Math.max(0, material.plannedQty ?? 0);
  const ordered = Math.max(0, material.orderedQty ?? 0);
  const delivered = Math.max(0, material.deliveredQty ?? 0);
  const consumed = Math.max(0, material.consumedQty ?? 0);
  const remaining = Math.max(0, planned - consumed);
  const coverage = planned > 0 ? Math.round((delivered / planned) * 1000) / 10 : 0;
  const stock = Math.max(0, delivered - consumed);

  let alert: MaterialAlert = "ok";
  if (planned > 0 && stock < remaining && delivered < planned) {
    alert = ordered >= planned ? "sous_commande" : "rupture";
  } else if (planned > 0 && delivered > planned * 1.2) {
    alert = "surplus";
  }

  const alertLabel =
    alert === "rupture"
      ? "Rupture : quantités insuffisantes"
      : alert === "sous_commande"
        ? "En attente de livraison"
        : alert === "surplus"
          ? "Surplus livré"
          : "Approvisionné";

  return {
    ...material,
    plannedQty: planned,
    orderedQty: ordered,
    deliveredQty: delivered,
    consumedQty: consumed,
    unitPrice: material.unitPrice ?? 0,
    remainingQty: remaining,
    coveragePct: coverage,
    valueOrdered: Math.round(ordered * (material.unitPrice ?? 0)),
    alert,
    alertLabel,
  };
}

// ============================================================================
// 5. PRÉVISION DES RISQUES (algorithmique — jamais une certitude)
// ============================================================================

export const RISK_DISCLAIMER =
  "Prévision algorithmique calculée à partir des données saisies : ce n'est pas une certitude. " +
  "Elle évolue à chaque mise à jour du chantier et ne remplace pas l'avis d'un professionnel.";

export type RiskLevel = "faible" | "modere" | "eleve" | "critique";

export interface RiskTaskInput extends TaskProgressInput {
  name: string;
  phaseKey?: string | null;
}

export interface SiteRiskInput {
  today: number;
  startDate: number;
  expectedEndDate: number;
  tasks: RiskTaskInput[];
  budgetInitial: number;
  budgetRevised?: number | null;
  expenses: ExpenseInput[];
  materials?: MaterialTrackingInput[];
}

export interface RiskProjection {
  isEstimate: true;
  disclaimer: string;
  computedAt: number;
  riskScore: number;
  riskLevel: RiskLevel;
  riskLabel: string;
  confidence: "faible" | "moyenne" | "bonne";
  schedule: {
    actualProgressPct: number;
    plannedProgressPct: number;
    /** Indice de performance du délai (< 1 = en retard sur le planning). */
    spi: number;
    delayDays: number;
    projectedEndDate: number | null;
    lateTaskCount: number;
    lateTasks: string[];
  };
  budget: {
    revised: number;
    spent: number;
    /** Indice de performance des coûts (< 1 = dépense plus vite que l'avancement). */
    cpi: number | null;
    projectedFinalCost: number | null;
    projectedVariance: number | null;
    projectedVariancePct: number | null;
    overBudgetCategories: { category: string; label: string; amount: number }[];
  };
  materialRisks: { name: string; alert: MaterialAlert; coveragePct: number }[];
  causes: string[];
  recommendations: string[];
}

const riskLevelFor = (score: number): { level: RiskLevel; label: string } => {
  if (score >= 75) return { level: "critique", label: "Risque critique" };
  if (score >= 50) return { level: "eleve", label: "Risque élevé" };
  if (score >= 25) return { level: "modere", label: "Risque modéré" };
  return { level: "faible", label: "Risque faible" };
};

/**
 * Analyse le chantier et produit :
 *   • les indices SPI (délai) et CPI (coût), calculés uniquement si les données
 *     le permettent (aucune valeur inventée quand tout est vide) ;
 *   • une date de fin et un coût final PROJETÉS, explicitement marqués comme
 *     estimations ;
 *   • un score de risque 0-100 et des recommandations concrètes.
 */
export function analyzeSiteRisk(input: SiteRiskInput): RiskProjection {
  const today = input.today;
  const tasks = input.tasks ?? [];
  const actualProgress = weightedProgress(tasks);
  const plannedProgress = plannedProgressAt(tasks, today);
  const late = lateTasks(tasks, today);

  // SPI borné : un chantier à l'arrêt ne produit pas une division par zéro.
  const spi =
    plannedProgress > 0
      ? Math.round((actualProgress / plannedProgress) * 100) / 100
      : actualProgress > 0
        ? 1
        : 0;

  // Projection de fin : on prolonge l'écart constaté sur la durée restante.
  const totalPlannedDays = Math.max(1, Math.round((input.expectedEndDate - input.startDate) / DAY));
  const elapsedDays = Math.max(0, Math.round((today - input.startDate) / DAY));
  let projectedEndDate: number | null = null;
  if (actualProgress >= 99.5) {
    projectedEndDate = today;
  } else if (actualProgress > 0 && elapsedDays > 0) {
    const projectedTotalDays = Math.min(
      totalPlannedDays * 5,
      Math.round(elapsedDays / (actualProgress / 100)),
    );
    projectedEndDate = input.startDate + projectedTotalDays * DAY;
  } else if (today > input.startDate) {
    // Aucun avancement alors que le chantier a démarré : la fin ne peut pas
    // être tenue, mais on ne prétend pas connaître la nouvelle date.
    projectedEndDate = null;
  }
  const delayDays =
    projectedEndDate != null
      ? Math.max(0, Math.round((projectedEndDate - input.expectedEndDate) / DAY))
      : 0;

  const budget = budgetSummary({
    budgetInitial: input.budgetInitial,
    budgetRevised: input.budgetRevised,
    expenses: input.expenses,
    materials: input.materials?.map((material) => ({
      plannedQty: material.plannedQty,
      deliveredQty: material.deliveredQty,
      unitPrice: material.unitPrice,
    })),
  });

  // Coût final projeté : dépenses réelles rapportées à l'avancement constaté.
  let projectedFinalCost: number | null = null;
  if (actualProgress >= 99.5) {
    projectedFinalCost = budget.spent;
  } else if (actualProgress >= 5 && budget.spent > 0) {
    projectedFinalCost = Math.round(budget.spent / (actualProgress / 100));
  }
  const projectedVariance =
    projectedFinalCost != null ? Math.round(budget.revised - projectedFinalCost) : null;
  const projectedVariancePct =
    projectedFinalCost != null && budget.revised > 0
      ? Math.round(((budget.revised - projectedFinalCost) / budget.revised) * 1000) / 10
      : null;

  const cpi =
    budget.spent > 0 && actualProgress > 0
      ? Math.round(((budget.revised * (actualProgress / 100)) / budget.spent) * 100) / 100
      : null;

  // Catégories déjà au-delà de leur enveloppe : signalées seulement quand une
  // référence existe (budget réparti par catégorie non fourni → aucune alerte
  // inventée). On retient les 3 postes les plus lourds.
  const overBudgetCategories = budget.byCategory
    .filter((row) => budget.revised > 0 && row.amount > budget.revised * 0.4)
    .slice(0, 3)
    .map((row) => ({ category: row.category, label: row.label, amount: row.amount }));

  const materialRisks = (input.materials ?? [])
    .map((material) => materialLine(material))
    .filter((line) => line.alert === "rupture" || line.alert === "sous_commande")
    .map((line) => ({ name: line.name, alert: line.alert, coveragePct: line.coveragePct }));

  // ── Score de risque (0-100) ───────────────────────────────────────────────
  let score = 0;
  const scheduleBehind = plannedProgress - actualProgress;
  if (plannedProgress > 0) {
    score += Math.max(0, Math.min(40, scheduleBehind * 1.2));
  }
  if (late.length > 0) {
    score += Math.min(20, late.length * 6);
  }
  if (budget.revised > 0) {
    const overspend = budget.spent / budget.revised - actualProgress / 100;
    score += Math.max(0, Math.min(25, overspend * 80));
  }
  const dangerousMaterials = materialRisks.filter((row) => row.alert === "rupture").length;
  score += Math.min(15, dangerousMaterials * 5);

  const riskScore = Math.max(0, Math.min(100, Math.round(score)));
  const { level, label } = riskLevelFor(riskScore);

  // Confiance : dépend du volume de données réellement saisies.
  const datedTasks = tasks.filter((task) => task.startDate != null && task.endDate != null).length;
  const confidence: RiskProjection["confidence"] =
    datedTasks >= 4 && budget.spent > 0
      ? "bonne"
      : datedTasks >= 1 || budget.spent > 0
        ? "moyenne"
        : "faible";

  // ── Causes probables ─────────────────────────────────────────────────────
  const causes: string[] = [];
  if (plannedProgress > 0 && scheduleBehind > 10) {
    causes.push(
      `Avancement physique de ${actualProgress} % contre ${plannedProgress} % attendus à cette date.`,
    );
  }
  if (late.length > 0) {
    causes.push(
      `${late.length} tâche(s) dépassent leur échéance : ${late
        .slice(0, 3)
        .map((task) => task.name)
        .join(", ")}.`,
    );
  }
  if (cpi != null && cpi < 0.9) {
    causes.push(
      "Les dépenses progressent plus vite que les travaux : le coût engagé dépasse la valeur produite.",
    );
  }
  if (dangerousMaterials > 0) {
    causes.push(
      `${dangerousMaterials} matériau(x) en rupture d'approvisionnement peuvent bloquer les phases en cours.`,
    );
  }
  if (actualProgress === 0 && today > input.startDate) {
    causes.push("Aucun avancement n'est enregistré alors que la date de démarrage est passée.");
  }
  if (causes.length === 0) {
    causes.push("Aucun écart significatif détecté entre le planning et les données saisies.");
  }

  // ── Recommandations ─────────────────────────────────────────────────────
  const recommendations: string[] = [];
  if (delayDays > 0 || (plannedProgress > 0 && scheduleBehind > 10)) {
    recommendations.push(
      "Reprogrammer les tâches en retard et renforcer les équipes sur les phases critiques du cheminement.",
    );
  }
  if (cpi != null && cpi < 0.95) {
    recommendations.push(
      "Revoir les engagements de dépenses par catégorie et geler les postes non prioritaires jusqu'à retour dans l'enveloppe.",
    );
  }
  if (dangerousMaterials > 0) {
    recommendations.push(
      "Lancer les commandes des matériaux en rupture et sécuriser un fournisseur de secours.",
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "Poursuivre le suivi quotidien : les indicateurs actuels ne montrent pas de dérive.",
    );
  }

  return {
    isEstimate: true,
    disclaimer: RISK_DISCLAIMER,
    computedAt: today,
    riskScore,
    riskLevel: level,
    riskLabel: label,
    confidence,
    schedule: {
      actualProgressPct: actualProgress,
      plannedProgressPct: plannedProgress,
      spi,
      delayDays,
      projectedEndDate,
      lateTaskCount: late.length,
      lateTasks: late.slice(0, 8).map((task) => task.name),
    },
    budget: {
      revised: budget.revised,
      spent: budget.spent,
      cpi,
      projectedFinalCost,
      projectedVariance,
      projectedVariancePct,
      overBudgetCategories,
    },
    materialRisks,
    causes,
    recommendations,
  };
}

// ============================================================================
// 6. FORMATAGE (partagé UI / rapports PDF)
// ============================================================================

export const formatTND = (value: number | null | undefined): string => {
  const amount = Math.round(Number(value) || 0);
  const sign = amount < 0 ? "-" : "";
  const digits = Math.abs(amount).toString();
  let out = "";
  for (let i = digits.length - 1, count = 1; i >= 0; i--, count++) {
    out = digits[i] + (count > 1 && (count - 1) % 3 === 0 ? "." : "") + out;
  }
  return `${sign}${out} TND`;
};

export const formatSiteDate = (timestamp: number | null | undefined): string => {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const toDayStart = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const addDays = (timestamp: number, days: number): number => timestamp + days * DAY;

export const phaseLabelFor = (key: string | null | undefined): string => {
  if (!key) return "Phase";
  const all = [...RESIDENTIAL, ...RENOVATION, ...TECHNICAL, ...POOL];
  return all.find((phase) => phase.key === key)?.label ?? key;
};

/** Convertit un type de projet BatiBuild en libellé lisible. */
export function siteTypeLabel(type: string | null | undefined): string {
  if (!type) return "Projet";
  return PROJECT_TYPE_LABELS[type as ProjectType] ?? type;
}
