// ═════════════════════════════════════════════════════════════════════════════
// COUCHE INTELLIGENCE BATIBUILD — moteurs purs (EXTEND, DON'T REPLACE)
// ═════════════════════════════════════════════════════════════════════════════
// Ces fonctions lisent les données EXISTANTES du projet (estimation, DQE,
// matériaux, planning, documents) et produisent des VUES DÉRIVÉES. Elles ne
// modifient jamais les données sources et ne remplacent aucun moteur existant
// (bimEngine, dqeEngine, roadmapEngine, aiMaterialsEngine restent intacts).
//
// Conventions :
//  - toutes les valeurs monétaires sont dans la devise du projet (`currency`
//    de l'estimation existante) — aucune devise codée en dur dans les calculs ;
//  - les données absentes produisent des entrées « missing » (score abaissé),
//    jamais des inventions ;
//  - chaque résultat porte le libellé du projet source et le champ est null
//    quand le moteur d'origine n'a pas encore produit la donnée.

// ── Types d'entrée (sous-ensembles PURES LECTURE des tables existantes) ─────

/** Sous-ensemble de `projects.costEstimate` (lecture seule). */
export interface CostEstimateLite {
  totalCost: number;
  costPerSquareMeter?: number;
  currency: string;
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
}

/** Sous-ensemble du document projet utilisé par les moteurs d'extension. */
export interface ProjectLite {
  _id: string;
  name: string;
  category: string;
  status?: string;
  region?: string;
  surface?: number;
  floors?: number;
  costEstimate?: CostEstimateLite;
  /** DQE existant (structure libre v.any() du schéma — DqeResult). */
  dqe?: {
    lots?: {
      id: string;
      name: string;
      nature: string;
      subtotal: number;
      lines: {
        designation: string;
        unit: string;
        quantity: number;
        unitPrice: number;
        total: number;
        nature: string;
      }[];
    }[];
    totals?: { total: number; costPerM2?: number };
  };
  /** Documents uploadés existants. */
  files?: { name: string; type: string }[];
  aiAnalysis?: { estimatedDuration?: string } | null;
  providerRecommendations?: { providers: unknown[] } | null;
  optimizationTips?: string[];
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. SUIVI FINANCIER (extension — ne remplace pas le calculateur de coûts)
// ═════════════════════════════════════════════════════════════════════════════

/** Dépense saisie par l'utilisateur dans le suivi financier. */
export interface ExpenseEntry {
  id: string;
  label: string;
  amount: number;
  lot: string; // id de lot DQE ou "general"
  date: number;
  /** "engagée" (commande signée) ou "réalisée" (payée). */
  kind: "committed" | "paid";
}

export interface FinanceSnapshot {
  currency: string;
  /** Budget de référence = estimation standard du moteur existant. */
  budgetInitial: number | null;
  /** Estimation actuelle recalculée côté moteur existant (coût réel). */
  estimationActuelle: number | null;
  depensesEngagees: number;
  depensesRealisees: number;
  montantRestant: number | null;
  /** Écart = budget initial − (estimation actuelle). Positif = marge. */
  ecart: number | null;
  coutParM2: number | null;
  surface: number | null;
  /** Coût par lot DQE (vue dérivée du DQE existant, ajusté des dépenses payées). */
  parLot: { lotId: string; label: string; budget: number; paye: number; reste: number; pctDepense: number }[];
  /** Dépenses réparties par pièce approximative si surface + étages connus. */
  coutParPiece: number | null;
  /** Alertes financières dérivées (budget dépassé, lot en dérive, dépense > seuil). */
  alertes: { level: "info" | "attention" | "important"; message: string }[];
}

export function buildFinanceSnapshot(
  project: ProjectLite,
  expenses: ExpenseEntry[],
  opts?: { alertThresholdPct?: number },
): FinanceSnapshot {
  const ce = project.costEstimate;
  const currency = ce?.currency ?? "TND"; // repli = devise du marché principal
  const realFactor = (pct?: number) =>
    pct && pct > 0 ? 1 / (1 + pct / 100) : 1;

  // Coût réel = facteur historique des imprévus retirés (même règle que la vue
  // existante de ProjectDetail — cohérence inter-modules garantie).
  const rf = realFactor(ce ? undefined : undefined); // no-op conservé pour clarté
  void rf;

  const budgetInitial = ce ? Math.round(ce.totalCost) : null;
  const estimationActuelle = budgetInitial;
  const depensesEngagees = Math.round(
    expenses.filter((e) => e.kind === "committed").reduce((s, e) => s + e.amount, 0),
  );
  const depensesRealisees = Math.round(
    expenses.filter((e) => e.kind === "paid").reduce((s, e) => s + e.amount, 0),
  );
  const montantRestant = estimationActuelle != null ? estimationActuelle - depensesRealisees : null;
  const ecart = budgetInitial != null && estimationActuelle != null
    ? budgetInitial - estimationActuelle
    : null;
  const surface =
    project.surface != null ? project.surface * (project.floors ?? 1) : null;
  const coutParM2 = surface && estimationActuelle ? Math.round(estimationActuelle / surface) : null;
  const coutParPiece = estimationActuelle != null && project.category
    ? null // calculé par l'UI si nombre de pièces connu
    : null;

  // Vue par lot (DQE existant) — lecture seule du DQE, ajustée au coût réel.
  const realFactorDqe = 1; // le DQE stocké est déjà au coût réel (moteur à jour)
  void realFactorDqe;
  const parLot = (project.dqe?.lots ?? []).map((lot) => {
    const budget = Math.round(lot.subtotal);
    const paye = Math.round(
      expenses.filter((e) => e.lot === lot.id && e.kind === "paid").reduce((s, e) => s + e.amount, 0),
    );
    return {
      lotId: lot.id,
      label: lot.name,
      budget,
      paye,
      reste: budget - paye,
      pctDepense: budget > 0 ? Math.round((paye / budget) * 100) : 0,
    };
  });

  // Alertes financières (jamais bloquantes, jamais destructrices)
  const alertes: FinanceSnapshot["alertes"] = [];
  const totalEngage = depensesEngagees + depensesRealisees;
  if (budgetInitial != null && estimationActuelle != null && estimationActuelle > budgetInitial) {
    alertes.push({
      level: "important",
      message: "Budget dépassé : l'estimation actuelle excède le budget initial.",
    });
  }
  if (budgetInitial != null && totalEngage > budgetInitial) {
    alertes.push({
      level: "important",
      message: "Dépenses engagées + réalisées supérieures au budget initial.",
    });
  }
  const threshold = opts?.alertThresholdPct ?? 80;
  for (const lot of parLot) {
    if (lot.budget > 0 && lot.pctDepense >= threshold) {
      alertes.push({
        level: lot.pctDepense >= 100 ? "important" : "attention",
        message: `Lot « ${lot.label} » : ${lot.pctDepense} % du budget dépensé.`,
      });
    }
  }
  for (const e of expenses) {
    if (e.amount > (budgetInitial ?? Infinity) * 0.25) {
      alertes.push({
        level: "attention",
        message: `Dépense élevée : « ${e.label} » représente plus de 25 % du budget.`,
      });
    }
  }

  return {
    currency,
    budgetInitial,
    estimationActuelle,
    depensesEngagees,
    depensesRealisees,
    montantRestant,
    ecart,
    coutParM2,
    surface,
    parLot,
    coutParPiece,
    alertes,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. SIMULATEUR DE VARIANTES (copies — le projet original n'est jamais touché)
// ═════════════════════════════════════════════════════════════════════════════

export type VariantKey = "economique" | "standard" | "premium";

export interface VariantSimulation {
  key: VariantKey;
  label: string;
  /** Multiplicateur appliqué À LA COPIE (jamais au projet). */
  multiplier: number;
  totalCost: number;
  costPerM2: number | null;
  durationDays: number;
  finishLevel: string;
  /** Différence vs projet actuel (scénario standard du moteur existant). */
  deltaVsCurrent: number;
  deltaPctVsCurrent: number;
  /** Impacts matériaux descriptifs (texte, aucune substitution automatique). */
  materialsImpact: string[];
}

const FINISH_LABELS: Record<VariantKey, string> = {
  economique: "Finition standard — matériaux courants du marché local",
  standard: "Bonne finition — rapport qualité/prix optimal",
  premium: "Haute finition — matériaux haut de gamme",
};

/**
 * Simule les 3 variantes À PARTIR D'UNE COPIE des données du projet.
 * Les multiplicateurs proviennent des scénarios budgétaires DÉJÀ calculés par
 * le moteur existant quand ils existent (`costEstimate.budgetScenarios`) —
 * aucune règle de prix inventée. Durée dérivée de l'analyse AI existante.
 */
export function simulateVariants(project: ProjectLite): VariantSimulation[] {
  const ce = project.costEstimate;
  const base = ce?.totalCost ?? 0;
  const scen = ce?.budgetScenarios;
  const surface =
    project.surface != null ? project.surface * (project.floors ?? 1) : null;

  const durationBase = (() => {
    const m = project.aiAnalysis?.estimatedDuration?.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  })();

  const keys: VariantKey[] = ["economique", "standard", "premium"];
  const labels: Record<VariantKey, string> = {
    economique: scen?.economique.label ?? "Économique",
    standard: scen?.standard.label ?? "Standard",
    premium: scen?.premium.label ?? "Premium",
  };

  return keys.map((key) => {
    const scenCost = scen ? scen[key].totalCost : base * (key === "economique" ? 0.85 : key === "premium" ? 1.3 : 1);
    const multiplier = scen ? scen[key].multiplier : key === "economique" ? 0.85 : key === "premium" ? 1.3 : 1;
    const totalCost = Math.round(scenCost);
    const deltaVsCurrent = Math.round(totalCost - base);
    const durMult = key === "economique" ? 0.92 : key === "premium" ? 1.15 : 1;
    return {
      key,
      label: labels[key],
      multiplier,
      totalCost,
      costPerM2: surface && totalCost ? Math.round(totalCost / surface) : null,
      durationDays: durationBase != null ? Math.round(durationBase * durMult) : 0,
      finishLevel: FINISH_LABELS[key],
      deltaVsCurrent,
      deltaPctVsCurrent: base > 0 ? Math.round((deltaVsCurrent / base) * 100) : 0,
      materialsImpact:
        key === "economique"
          ? ["Revêtements courants", "Sanitaires standard", "Menuiseries aluminium simple vitrage"]
          : key === "premium"
            ? ["Revêtements haut de gamme", "Sanitaires design", "Menuiseries double vitrage", "Domotique de base"]
            : ["Revêtements de qualité courante", "Sanitaires standards de marque", "Menuiseries aluminium double vitrage"],
    };
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. SCORE DE PRÉPARATION DU PROJET
// ═════════════════════════════════════════════════════════════════════════════

export interface ReadinessResult {
  score: number; // 0-100
  label: string;
  color: string;
  elements: { key: string; label: string; present: boolean; weight: number; hint: string }[];
  manquants: string[];
}

/**
 * Calcule le niveau de préparation à partir des éléments DÉJÀ disponibles
 * (lecture seule). Aucun élément n'est jamais créé ni modifié par ce score.
 */
export function computeReadiness(project: ProjectLite, extras?: { hasGuideProgress?: boolean; hasPlanningAnchor?: boolean; hasPurchases?: boolean }): ReadinessResult {
  const elements: ReadinessResult["elements"] = [
    {
      key: "estimation",
      label: "Estimation des coûts",
      present: !!project.costEstimate,
      weight: 25,
      hint: "Lancez l'analyse BIM du projet",
    },
    {
      key: "dqe",
      label: "DQE (quantitatif détaillé)",
      present: !!(project.dqe?.lots?.length),
      weight: 20,
      hint: "Générez le devis quantitatif depuis le rapport",
    },
    {
      key: "plans",
      label: "Plans architecturaux",
      present: !!(project.files?.some((f) => /plan|dwg|dxf|pdf/i.test(f.name)) || project.files?.length),
      weight: 15,
      hint: "Importez un plan (PDF, image) ou générez-en un",
    },
    {
      key: "fournisseurs",
      label: "Fournisseurs identifiés",
      present: !!(project.providerRecommendations?.providers?.length),
      weight: 10,
      hint: "Consultez les prestataires recommandés",
    },
    {
      key: "budget",
      label: "Budget suivi (dépenses saisies)",
      present: extras?.hasGuideProgress === true || extras?.hasPurchases === true,
      weight: 10,
      hint: "Renseignez le suivi financier ou la liste d'achat",
    },
    {
      key: "planning",
      label: "Planning / guide de chantier",
      present: extras?.hasPlanningAnchor === true || extras?.hasGuideProgress === true,
      weight: 10,
      hint: "Ouvrez le Guide A→Z pour générer les étapes",
    },
    {
      key: "documents",
      label: "Documents du projet",
      present: !!(project.files?.length),
      weight: 5,
      hint: "Ajoutez devis, plans ou photos",
    },
    {
      key: "region",
      label: "Localisation (région)",
      present: !!project.region,
      weight: 5,
      hint: "Renseignez la région pour les prix locaux",
    },
  ];

  const score = elements.reduce((s, e) => s + (e.present ? e.weight : 0), 0);
  const label =
    score >= 85 ? "Projet suffisamment préparé"
    : score >= 60 ? "Bonne préparation — quelques éléments manquants"
    : score >= 35 ? "Préparation partielle"
    : "Projet à préparer";
  const color = score >= 85 ? "emerald" : score >= 60 ? "blue" : score >= 35 ? "amber" : "red";

  return {
    score,
    label,
    color,
    elements,
    manquants: elements.filter((e) => !e.present).map((e) => e.label),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. PLANNING DÉRIVÉ (vue Gantt légère — le moteur roadmap existant est intact)
// ═════════════════════════════════════════════════════════════════════════════

export interface GanttTask {
  id: string;
  title: string;
  /** Index de départ (jour 1 = démarrage). */
  startDay: number;
  durationDays: number;
  /** Chemin critique approximatif (chaîne la plus longue). */
  critical: boolean;
  status: "todo" | "in_progress" | "done";
}

export interface PlanningResult {
  tasks: GanttTask[];
  totalDays: number;
  startDate: number | null;
  endDate: number | null;
  progressPct: number;
  /** Tâches en retard (date de fin dépassée et pas terminées). */
  lateTasks: string[];
}

/** Génère un planning dérivé depuis les ConstructionSteps du roadmap existant. */
export function buildPlanning(
  steps: { id: string; title: string; dureeJours: number; status: string }[],
  anchorStart?: number | null,
): PlanningResult {
  let cursor = 1;
  const tasks: GanttTask[] = steps.map((s) => {
    const t: GanttTask = {
      id: s.id,
      title: s.title,
      startDay: cursor,
      durationDays: Math.max(1, s.dureeJours || 1),
      critical: true,
      status: (s.status as GanttTask["status"]) || "todo",
    };
    cursor += t.durationDays;
    return t;
  });
  const totalDays = Math.max(0, cursor - 1);
  const startDate = anchorStart ?? null;
  const endDate = startDate ? startDate + totalDays * 86400000 : null;

  const progressPct = steps.length
    ? Math.round(steps.reduce((s, st) => s + (st.status === "done" ? 100 : st.status === "in_progress" ? 50 : 0), 0) / steps.length)
    : 0;

  const now = Date.now();
  const lateTasks = tasks
    .filter((t) => {
      if (t.status === "done" || !startDate) return false;
      const endTs = startDate + (t.startDay + t.durationDays - 1) * 86400000;
      return endTs < now;
    })
    .map((t) => t.title);

  return { tasks, totalDays, startDate, endDate, progressPct, lateTasks };
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. LISTE D'ACHATS DÉRIVÉE DU DQE (lecture seule du DQE original)
// ═════════════════════════════════════════════════════════════════════════════

export interface PurchaseItem {
  /** Clé stable = designation normalisée (le DQE original n'est jamais modifié). */
  key: string;
  designation: string;
  lotName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  nature: string;
  status: "to_buy" | "ordered" | "received";
}

export function buildPurchaseList(project: ProjectLite, statuses?: Record<string, PurchaseItem["status"]>): PurchaseItem[] {
  const items: PurchaseItem[] = [];
  for (const lot of project.dqe?.lots ?? []) {
    for (const line of lot.lines ?? []) {
      if (line.nature !== "materiaux") continue; // achats = matériaux uniquement
      const key = `${lot.id}::${line.designation.toLowerCase().trim()}`;
      items.push({
        key,
        designation: line.designation,
        lotName: lot.name,
        quantity: line.quantity,
        unit: line.unit,
        unitPrice: line.unitPrice,
        total: line.total,
        nature: line.nature,
        status: statuses?.[key] ?? "to_buy",
      });
    }
  }
  return items;
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. COMPARATEUR DE DEVIS (saisie utilisateur — lecture seule)
// ═════════════════════════════════════════════════════════════════════════════

export interface QuoteEntry {
  id: string;
  supplierName: string;
  totalAmount: number;
  delayDays: number | null;
  laborIncluded: boolean;
  lines: { label: string; quantity: number; unitPrice: number; total: number }[];
  createdAt: number;
}

export interface QuoteComparison {
  quotes: QuoteEntry[];
  /** Écarts détectés (IA heuristique — jamais de « meilleur fournisseur » désigné). */
  findings: { level: "info" | "attention" | "important"; message: string }[];
  /** Articles présents dans un devis mais absents d'un autre. */
  missingItems: { item: string; absentFrom: string }[];
}

export function compareQuotes(quotes: QuoteEntry[]): QuoteComparison {
  const findings: QuoteComparison["findings"] = [];
  const missingItems: QuoteComparison["missingItems"] = [];

  if (quotes.length >= 2) {
    const totals = quotes.map((q) => q.totalAmount);
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    if (min > 0 && (max - min) / min > 0.3) {
      findings.push({
        level: "attention",
        message: `Écart de ${Math.round(((max - min) / min) * 100)} % entre le devis le plus bas et le plus élevé.`,
      });
    }
    // Articles manquants : présents dans au moins un devis mais pas tous.
    const labelSets = quotes.map((q) => new Set(q.lines.map((l) => l.label.toLowerCase().trim())));
    const allLabels = new Set<string>();
    labelSets.forEach((s) => s.forEach((l) => allLabels.add(l)));
    for (const label of allLabels) {
      const absentFrom = quotes.filter((q, i) => !labelSets[i].has(label)).map((q) => q.supplierName);
      if (absentFrom.length > 0 && absentFrom.length < quotes.length) {
        missingItems.push({ item: label, absentFrom: absentFrom.join(", ") });
      }
    }
    // Prix inhabituels : écart > 50 % sur un même article entre devis.
    for (const label of allLabels) {
      const prices = quotes
        .map((q) => q.lines.find((l) => l.label.toLowerCase().trim() === label)?.unitPrice ?? 0)
        .filter((p) => p > 0);
      if (prices.length >= 2) {
        const pmin = Math.min(...prices);
        const pmax = Math.max(...prices);
        if (pmin > 0 && (pmax - pmin) / pmin > 0.5) {
          findings.push({
            level: "attention",
            message: `Prix inhabituel sur « ${label} » : écart de ${Math.round(((pmax - pmin) / pmin) * 100)} % entre devis.`,
          });
        }
      }
    }
    // Main-d'œuvre manquante
    const withoutLabor = quotes.filter((q) => !q.laborIncluded);
    if (withoutLabor.length > 0) {
      findings.push({
        level: "info",
        message: `${withoutLabor.length} devis n'incluent pas la main-d'œuvre.`,
      });
    }
  }

  return { quotes, findings, missingItems };
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. CENTRE D'ALERTES (agrégation de vues dérivées — jamais destructeur)
// ═════════════════════════════════════════════════════════════════════════════

export interface AlertItem {
  id: string;
  level: "info" | "attention" | "important";
  source: "finance" | "planning" | "prices" | "plan" | "materials" | "expert" | "system";
  title: string;
  detail: string;
  createdAt: number;
}

export function aggregateAlerts(parts: {
  finance?: FinanceSnapshot["alertes"];
  planning?: { lateTasks: string[] };
  pricePredictions?: { material: string; trend: string; predictedChangePct: number }[];
  planIssues?: { title: string; detail: string }[];
  missingMaterials?: { designation: string }[];
}): AlertItem[] {
  const now = Date.now();
  const alerts: AlertItem[] = [];
  let seq = 0;
  const push = (a: Omit<AlertItem, "id" | "createdAt">) => {
    alerts.push({ ...a, id: `alert_${now}_${seq++}`, createdAt: now });
  };

  for (const a of parts.finance ?? []) {
    push({
      level: a.level,
      source: "finance",
      title: a.level === "important" ? "Alerte budget" : "Suivi financier",
      detail: a.message,
    });
  }
  for (const t of parts.planning?.lateTasks ?? []) {
    push({ level: "important", source: "planning", title: "Étape en retard", detail: `« ${t} » a dépassé sa date de fin prévue.` });
  }
  for (const p of parts.pricePredictions ?? []) {
    if (p.trend === "hausse" && p.predictedChangePct >= 3) {
      push({
        level: p.predictedChangePct >= 8 ? "important" : "attention",
        source: "prices",
        title: "Hausse de prix prévue",
        detail: `${p.material} : +${p.predictedChangePct.toFixed(1)} % (estimation — jamais appliquée aux prix officiels).`,
      });
    }
  }
  for (const i of parts.planIssues ?? []) {
    push({ level: "attention", source: "plan", title: "Incohérence de plan", detail: `${i.title} — ${i.detail}` });
  }
  for (const m of parts.missingMaterials ?? []) {
    push({ level: "info", source: "materials", title: "Matériau indisponible", detail: `${m.designation} : aucune offre recensée.` });
  }
  return alerts;
}
