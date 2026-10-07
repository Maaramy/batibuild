/**
 * CAPACITÉ DE CONSTRUCTION — moteur « Aide à la décision » lié au projet.
 *
 * Principe : l'utilisateur saisit un budget disponible (TND) et le moteur
 * répond par une simulation DÉTERMINISTE de ce qui peut réellement être
 * construit, calculée à partir du « Quantitatif » du projet :
 *   • Funding séquentiel dans l'ordre de priorité des chantiers
 *     (études → fondations → gros œuvre → second œuvre → finitions →
 *     aménagements extérieurs) ;
 *   • trois scénarios dynamiques : budget actuel, budget augmenté d'un palier
 *     fixe (10 000 TND), projet complet ;
 *   • un seuil minimal de budget saisi (MIN_BUDGET_TND) en dessous duquel
 *     l'analyse n'est pas produite ;
 *   • une phrase récapitulative et une recommandation construites à partir des
 *     montants réellement calculés — aucun montant ni pourcentage codé en dur.
 *
 * Ce module ne modifie NI le coût estimatif NI le moteur d'optimisation :
 * il ne fait que LIRE la décomposition existante du projet.
 */

// ── Types d'entrée ─────────────────────────────────────────────────────────

export interface CategoryBreakdownItem {
  category: string;
  label: string;
  estimatedCost: number;
  percentage: number;
}

export interface QuantitatifLotLine {
  designation: string;
  /** Sous-lot du Quantitatif détaillé (ex. « Fondations »). */
  subcategory?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  total?: number;
}

export interface QuantitatifLot {
  id: string;
  name: string;
  subtotal: number;
  lines?: QuantitatifLotLine[];
}

/**
 * Correspondance lot du Quantitatif → catégorie de coût (« Estimation du coût
 * de construction »). Elle permet de retrouver, pour une catégorie, les
 * sous-catégories et articles réellement chiffrés dans le projet.
 */
const LOT_TO_CATEGORY: Record<string, string> = {
  // ── Études / frais préliminaires ──
  frais_preliminaires: "etudes",
  etudes: "etudes",
  etudes_imprevus: "etudes",
  // ── Gros œuvre : terrassement, fondations, structure, enveloppe ──
  gros_oeuvre: "gros_oeuvre",
  terrassement: "gros_oeuvre",
  terrassement_granulats: "gros_oeuvre",
  terre: "gros_oeuvre",
  preparation: "gros_oeuvre",
  fondations: "gros_oeuvre",
  structure: "gros_oeuvre",
  coque: "gros_oeuvre",
  maconnerie: "gros_oeuvre",
  etancheite: "gros_oeuvre",
  charpente: "gros_oeuvre",
  toiture: "gros_oeuvre",
  facade: "gros_oeuvre",
  // ── Second œuvre : cloisons, revêtements, menuiseries, finitions ──
  second_oeuvre: "second_oeuvre",
  cloisons: "second_oeuvre",
  revetements: "second_oeuvre",
  carrelage: "second_oeuvre",
  peinture: "second_oeuvre",
  finition: "second_oeuvre",
  finitions: "second_oeuvre",
  nettoyage: "second_oeuvre",
  nettoyage_finition: "second_oeuvre",
  menuiserie: "second_oeuvre",
  portes: "second_oeuvre",
  // ── Équipements : fluides, électricité, cuisine ──
  equipements: "equipements",
  plomberie: "equipements",
  electricite: "equipements",
  cablage: "equipements",
  eclairage: "equipements",
  appareillage: "equipements",
  tableau: "equipements",
  alimentation: "equipements",
  robinetterie: "equipements",
  evacuation: "equipements",
  sanitaires: "equipements",
  chauffe_eau: "equipements",
  froid: "equipements",
  ventilation: "equipements",
  cvc: "equipements",
  filtration: "equipements",
  meubles: "equipements",
  cuisine_pro: "equipements",
  plan_travail: "equipements",
  // ── Aménagements extérieurs ──
  amenagements_exterieurs: "amenagements_exterieurs",
  amenagements: "amenagements_exterieurs",
  amenagement: "amenagements_exterieurs",
  exterior: "amenagements_exterieurs",
  // ── Transports / divers ──
  transport: "transport",
  vrd: "transport",
  depose: "main_oeuvre",
  depose_demolition: "main_oeuvre",
  main_oeuvre: "main_oeuvre",
  essais: "main_oeuvre",
  // ── Lots de finition à rattacher aux aménagements (non listés ci-dessus) ──
  enseignes: "amenagements_exterieurs",
  divers: "transport",
};

/**
 * Motifs de repli : si un lot du Quantitatif n'est pas listé ci-dessus, on
 * le rattache à sa catégorie par mots-clés. Aucun article n'est donc perdu.
 */
const LOT_KEYWORDS: Array<{ match: RegExp; category: string }> = [
  { match: /(etude|frais| prelim)/i, category: "etudes" },
  { match: /(terrassement|terre|fondation|structur|maconner|coque|charpente|toiture|facade|etancheite)/i, category: "gros_oeuvre" },
  { match: /(second|clois|revet|carrel|peintur|finition|nettoyage|menuiser|porte)/i, category: "second_oeuvre" },
  { match: /(plomber|electri|cablage|eclairage|appareil|sanitair|chauffe|ventil|cvc|filtration|meuble|cuisine|plan_travail|robinetterie|alimentation|evacuation|equipement)/i, category: "equipements" },
  { match: /(amenagement|exterieur|exterior|enseigne)/i, category: "amenagements_exterieurs" },
  { match: /(vrd|transport|divers)/i, category: "transport" },
  { match: /(depose|main_oeuvre|essai)/i, category: "main_oeuvre" },
];

function categoryForLot(lotId: string): string | null {
  const key = String(lotId ?? "").toLowerCase();
  const direct = LOT_TO_CATEGORY[key];
  if (direct) return direct;
  const fallback = LOT_KEYWORDS.find((k) => k.match.test(key));
  return fallback ? fallback.category : null;
}

/** Priorité des chantiers : un projet se construit dans cet ordre. */
const CATEGORY_PRIORITY: Array<{ key: string; rank: number }> = [
  { key: "etudes", rank: 1 },
  { key: "etudes_imprevus", rank: 2 },
  { key: "frais_preliminaires", rank: 1 },
  { key: "terrassement_granulats", rank: 3 },
  { key: "fondations", rank: 3 },
  { key: "gros_oeuvre", rank: 4 },
  { key: "second_oeuvre", rank: 5 },
  { key: "finitions", rank: 6 },
  { key: "amenagements_exterieurs", rank: 7 },
  { key: "equipements", rank: 8 },
  { key: "transport", rank: 9 },
];

const DEFAULT_RANK = 50;

export function categoryPriority(category: string): number {
  const key = String(category ?? "").toLowerCase();
  return CATEGORY_PRIORITY.find((c) => c.key === key)?.rank ?? DEFAULT_RANK;
}

// ── Types de sortie ────────────────────────────────────────────────────────

export type BudgetStatus = "realisable" | "partiel" | "report";

/** Niveau « article » du Quantitatif détaillé. */
export interface BudgetArticleLine {
  designation: string;
  estimatedCost: number;
  fundedAmount: number;
  /** % de réalisation de l'article (0 → 100). */
  realizationPct: number;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
}

/** Niveau « sous-catégorie » (sous-lot du Quantitatif). */
export interface BudgetSubcategoryLine {
  subcategoryId: string;
  subcategoryLabel: string;
  estimatedCost: number;
  fundedAmount: number;
  /** % du coût de la catégorie que représente cette sous-catégorie. */
  pctOfCategory: number;
  /** % de réalisation de la sous-catégorie (0 → 100). */
  realizationPct: number;
  status: BudgetStatus;
  articles: BudgetArticleLine[];
}

export interface BudgetCategoryLine {
  categoryId: string;
  categoryLabel: string;
  estimatedCost: number;
  /** % du coût total du projet. */
  pctOfTotal: number;
  /** Budget cumulé nécessaire pour atteindre ET terminer ce chantier. */
  budgetNeeded: number;
  /** Part du budget réellement allouée à ce chantier. */
  fundedAmount: number;
  /** % de réalisation de la catégorie (0 → 100). */
  realizationPct: number;
  status: BudgetStatus;
  priority: number;
  /** Sous-catégories du Quantitatif rattachées à cette catégorie. */
  subcategories: BudgetSubcategoryLine[];
}

export type BudgetScenarioKey = "actuel" | "plus_palier" | "complet";

export interface BudgetScenarioLine {
  scenario: BudgetScenarioKey;
  label: string;
  budget: number;
  /** Coût du projet effectivement finançable avec ce budget. */
  fundedCost: number;
  remaining: number;
  progressPct: number;
  reachableCategories: string[];
  partialCategories: string[];
  deferredCategories: string[];
  /** Chantiers qui deviennent possibles grâce à ce scénario. */
  additionalCategories: string[];
  /** % du coût total restant à financer sur ce scénario. */
  remainingToFundPct: number;
  /** Montant du projet non couvert par ce scénario. */
  remainingToFund: number;
  headline: string;
}

export interface BudgetAnalysis {
  available: boolean;
  reason?: string;
  projectId: string;
  userId: string;
  projectName: string;
  scenarioLabel: string;
  surface?: number;
  /** Coût total du scénario retenu (identique au « Coût estimatif »). */
  projectTotal: number;
  availableBudget: number;
  usedBudget: number;
  remainingBudget: number;
  /** % du coût total du projet finançable avec le budget saisi. */
  projectReachablePct: number;
  /** % du budget effectivement consommé. */
  budgetUsedPct: number;
  /**
   * Part du COÛT TOTAL correspondant aux travaux effectivement sélectionnables
   * (réalisables + partiellement réalisables) avec le budget saisi.
   */
  selectedCostSharePct: number;
  /** Montant du coût total du projet qui reste à financer. */
  gapToProjectTotal: number;
  /** Budget encore nécessaire pour terminer le chantier prioritaire suivant. */
  gapToNextCategory: number;
  /** Libellé du chantier prioritaire suivant (le suivant dans la priorisation). */
  nextCategoryLabel: string;
  /** Combinaison optimale de catégories conseillée par l'IA. */
  optimalCombination: string;
  /** Coût au m², quand la surface du projet est connue. */
  perUnitEstimate?: number;
  breakdown: BudgetCategoryLine[];
  statusSummary: {
    realisable: BudgetCategoryLine[];
    partiel: BudgetCategoryLine[];
    report: BudgetCategoryLine[];
  };
  scenarios: BudgetScenarioLine[];
  recommendation: string;
  summarySentence: string;
  generatedAt: number;
}

export interface BudgetAnalysisInput {
  projectId: string;
  userId: string;
  projectName: string;
  scenarioLabel: string;
  projectTotal: number;
  budgetAvailable: number;
  breakdown: CategoryBreakdownItem[];
  lots?: QuantitatifLot[];
  surface?: number;
  /**
   * Coût au m² ENREGISTRÉ du scénario courant (page résultat « Estimation du
   * coût de construction ») — source de vérité pour l'affichage ¤/m². Repli
   * sur `projectTotal / surface` uniquement si non fourni.
   */
  costPerM2?: number;
}

/** Écart du scénario « budget augmenté », en TND. */
export const BUDGET_SIMULATION_STEP_TND = 10000;

/**
 * Budget minimal saisissable (TND) : en dessous, la simulation perdrait son
 * sens (aucun chantier structurel n'est finançable).
 */
export const MIN_BUDGET_TND = 25000;

// ── Helpers ────────────────────────────────────────────────────────────────

const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const round1 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 10) / 10;

/** Format fr-FR à espaces ordinaires (aucun caractère insécable parasite). */
function frNumber(n: number, fractionDigits = 0): string {
  const safe = Number.isFinite(n) ? n : 0;
  return safe
    .toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: fractionDigits })
    .replace(/[\u202f\u00a0]/g, " ");
}

export const formatTndAmount = (n: number) => `${frNumber(Math.round(n))} TND`;
export const formatPercent = (n: number) => `${frNumber(round1(n), 1)} %`;

interface SimulatedScenario {
  lines: BudgetCategoryLine[];
  fundedCost: number;
  remaining: number;
}

/**
 * Allocation séquentielle : on sème le budget dans l'ordre de priorité des
 * chantiers. Un chantier est « réalisable » s'il est entièrement financé,
 * « partiel » s'il est entamé mais non terminé, « report » s'il est hors
 * budget. Rien n'est inventé : seuls les montants du Quantitatif sont utilisés.
 */
/** % de réalisation d'un poste (0 → 100), jamais codé en dur. */
function realizationPct(estimatedCost: number, fundedAmount: number): number {
  if (estimatedCost <= 0) return 0;
  return round1(Math.max(0, Math.min(100, (fundedAmount / estimatedCost) * 100)));
}

/**
 * Reconstitue la hiérarchie « Quantitatif détaillé » (sous-catégories +
 * articles) d'une catégorie, et y répartit le montant financé par ordre
 * d'importance technique : le budget est consommé sous-catégorie par
 * sous-catégorie, puis article par article.
 *
 * Les articles viennent du Quantitatif réel du projet — aucun montant n'est
 * inventé. Si une catégorie n'a pas de détail exploitable, une seule
 * sous-catégorie agrégée reprend le montant de la catégorie (l'interface
 * affiche alors un seul niveau, sans article).
 */
function buildHierarchy(
  cat: CategoryBreakdownItem,
  lots: QuantitatifLot[],
  categoryFunded: number,
): BudgetSubcategoryLine[] {
  const cost = Math.max(0, Number(cat.estimatedCost) || 0);

  // Regroupement des articles par sous-lot, dans l'ordre du Quantitatif.
  const groups = new Map<string, { label: string; lines: BudgetArticleLine[]; total: number }>();
  for (const lot of lots) {
    if (categoryForLot(lot.id) !== cat.category) continue;
    for (const line of lot.lines ?? []) {
      const total =
        Number.isFinite(Number(line.total)) && Number(line.total) > 0
          ? Number(line.total)
          : (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
      if (total <= 0) continue;
      const label = String(line.subcategory ?? lot.name ?? cat.label).trim() || cat.label;
      const entry = groups.get(label) ?? { label, lines: [], total: 0 };
      entry.lines.push({
        designation: String(line.designation ?? "").trim() || "Article",
        estimatedCost: round2(total),
        fundedAmount: 0,
        realizationPct: 0,
        quantity: line.quantity,
        unit: line.unit,
        unitPrice: line.unitPrice,
      });
      entry.total = round2(entry.total + total);
      groups.set(label, entry);
    }
  }

  // Aucune ligne exploitable → un niveau agrégé, sans article détaillé.
  if (groups.size === 0) {
    if (cost <= 0) return [];
    const pctOfCategory = 100;
    return [
      {
        subcategoryId: `${cat.category}__global`,
        subcategoryLabel: cat.label,
        estimatedCost: round2(cost),
        fundedAmount: round2(categoryFunded),
        pctOfCategory,
        realizationPct: realizationPct(cost, categoryFunded),
        status:
          categoryFunded >= cost ? "realisable" : categoryFunded > 0 ? "partiel" : "report",
        articles: [],
      },
    ];
  }

  // Les sous-catégories sont ordonnées par importance (coût décroissant, puis
  // ordre du Quantitatif) : c'est l'ordre dans lequel le budget est engagé.
  // Les montants sont STRICTEMENT ceux du Quantitatif enregistré (résultat
  // « Estimation du coût de construction ») : aucune remise à l'échelle. Si le
  // détail ne recouvre pas tout le coût de la catégorie, l'écart reste visible
  // dans le % de réalisation (aucun montant ajouté ni modifié).
  const orderedGroups = [...groups.values()].sort((a, b) => b.total - a.total);

  let left = round2(categoryFunded);
  return orderedGroups.map((g, idx) => {
    const subCost = round2(g.total);
    let subFunded: number;
    if (left >= subCost) {
      subFunded = subCost;
    } else if (left > 0) {
      subFunded = left;
    } else {
      subFunded = 0;
    }
    left = round2(Math.max(0, left - subFunded));

    let articleLeft = subFunded;
    const articles = g.lines.map((line) => {
      const lineCost = line.estimatedCost;
      const articleFunded =
        articleLeft >= lineCost ? lineCost : articleLeft > 0 ? articleLeft : 0;
      articleLeft = round2(Math.max(0, articleLeft - articleFunded));
      return {
        ...line,
        estimatedCost: lineCost,
        fundedAmount: round2(articleFunded),
        realizationPct: realizationPct(lineCost, articleFunded),
      };
    });

    return {
      subcategoryId: `${cat.category}__${idx}`,
      subcategoryLabel: g.label,
      estimatedCost: subCost,
      fundedAmount: round2(subFunded),
      pctOfCategory: cost > 0 ? round1((subCost / cost) * 100) : 0,
      realizationPct: realizationPct(subCost, subFunded),
      status:
        subFunded >= subCost && subCost > 0 ? "realisable" : subFunded > 0 ? "partiel" : "report",
      articles,
    };
  });
}

function simulateScenario(
  ordered: CategoryBreakdownItem[],
  projectTotal: number,
  budget: number,
  lots: QuantitatifLot[],
): SimulatedScenario {
  let remaining = Math.max(0, budget);
  let cumulative = 0;
  let fundedCost = 0;

  const lines = ordered.map((cat) => {
    const cost = Math.max(0, Number(cat.estimatedCost) || 0);
    cumulative += cost;

    let fundedAmount: number;
    let status: BudgetStatus;
    if (cost > 0 && remaining >= cost) {
      fundedAmount = cost;
      status = "realisable";
    } else if (cost > 0 && remaining > 0) {
      fundedAmount = remaining;
      status = "partiel";
    } else {
      fundedAmount = 0;
      status = "report";
    }

    remaining = round2(Math.max(0, remaining - fundedAmount));
    fundedCost = round2(fundedCost + fundedAmount);

    return {
      categoryId: cat.category,
      categoryLabel: cat.label,
      estimatedCost: round2(cost),
      pctOfTotal: projectTotal > 0 ? round1((cost / projectTotal) * 100) : 0,
      budgetNeeded: round2(cumulative),
      fundedAmount: round2(fundedAmount),
      realizationPct: realizationPct(cost, fundedAmount),
      status,
      priority: categoryPriority(cat.category),
      subcategories: buildHierarchy(cat, lots, fundedAmount),
    };
  });

  return { lines, fundedCost, remaining: round2(remaining) };
}

/** Bloc de progression ASCII (aucune valeur codée en dur : dérivé du %). */
export function budgetProgressionBlocks(pct: number, total = 24, max = 100): string {
  const filled = Math.max(0, Math.min(total, Math.round((Math.max(0, Math.min(max, pct)) / max) * total)));
  return "\u2588".repeat(filled) + "\u2591".repeat(total - filled);
}

function toScenario(
  key: BudgetScenarioKey,
  label: string,
  budget: number,
  sim: SimulatedScenario,
  projectTotal: number,
): BudgetScenarioLine {
  const reachableCategories = sim.lines.filter((l) => l.status === "realisable").map((l) => l.categoryLabel);
  const partialCategories = sim.lines.filter((l) => l.status === "partiel").map((l) => l.categoryLabel);
  const deferredCategories = sim.lines.filter((l) => l.status === "report").map((l) => l.categoryLabel);
  const progressPct = projectTotal > 0 ? round1((sim.fundedCost / projectTotal) * 100) : 0;
  const remainingToFund = round2(Math.max(0, projectTotal - sim.fundedCost));
  const remainingToFundPct = projectTotal > 0 ? round1((remainingToFund / projectTotal) * 100) : 0;

  // Chantiers qui deviennent réalisables grâce au budget de ce scénario.
  const additionalCategories =
    key === "actuel"
      ? []
      : sim.lines
          .filter((l) => l.status !== "report")
          .map((l) => l.categoryLabel)
          .filter((label) => !reachableCategories.includes(label));

  const headline = deferredCategories.length
    ? `${formatPercent(progressPct)} du projet finançable \u00b7 ${formatTndAmount(sim.remaining)} disponibles`
    : `Projet complet finan\u00e7able \u00b7 ${formatTndAmount(sim.remaining)} disponibles`;

  return {
    scenario: key,
    label,
    budget: round2(budget),
    fundedCost: sim.fundedCost,
    remaining: sim.remaining,
    progressPct,
    reachableCategories,
    partialCategories,
    deferredCategories,
    additionalCategories,
    remainingToFund,
    remainingToFundPct,
    headline,
  };
}

// ── Moteur principal ───────────────────────────────────────────────────────

export function buildBudgetAnalysis(input: BudgetAnalysisInput): BudgetAnalysis {
  const projectTotal = Math.max(0, Number(input.projectTotal) || 0);
  const budget = Math.max(0, Number(input.budgetAvailable) || 0);
  const breakdown = (input.breakdown ?? []).filter(
    (c) => c && Number(c.estimatedCost) > 0,
  );
  const lots = input.lots ?? [];
  const ordered = [...breakdown].sort(
    (a, b) => categoryPriority(a.category) - categoryPriority(b.category),
  );

  const base = {
    projectId: input.projectId,
    userId: input.userId,
    projectName: input.projectName,
    scenarioLabel: input.scenarioLabel,
    surface: input.surface,
    projectTotal: round2(projectTotal),
    availableBudget: round2(budget),
    generatedAt: Date.now(),
  };

  if (breakdown.length === 0) {
    return {
      ...base,
      available: false,
      reason:
        "Aucun Quantitatif d\u00e9taill\u00e9 n'est disponible pour ce projet. " +
        "Effectuez d'abord l'estimation du co\u00fbt de construction : l'analyse du budget s'appuie enti\u00e8rement sur ses donn\u00e9es.",
      usedBudget: 0,
      remainingBudget: round2(budget),
      projectReachablePct: 0,
      budgetUsedPct: 0,
      selectedCostSharePct: 0,
      gapToProjectTotal: round2(projectTotal),
      gapToNextCategory: 0,
      nextCategoryLabel: "",
      optimalCombination: "",
      breakdown: [],
      statusSummary: { realisable: [], partiel: [], report: [] },
      scenarios: [],
      recommendation: "",
      summarySentence: "",
    };
  }

  if (budget <= 0) {
    return {
      ...base,
      available: false,
      reason:
        "Budget saisi : 0 TND. Indiquez le budget r\u00e9ellement disponible pour ce projet afin d'obtenir une simulation de construction.",
      usedBudget: 0,
      remainingBudget: 0,
      projectReachablePct: 0,
      budgetUsedPct: 0,
      selectedCostSharePct: 0,
      gapToProjectTotal: 0,
      gapToNextCategory: 0,
      nextCategoryLabel: "",
      optimalCombination: "",
      breakdown: [],
      statusSummary: { realisable: [], partiel: [], report: [] },
      scenarios: [],
      recommendation: "",
      summarySentence: "",
    };
  }

  if (budget < MIN_BUDGET_TND) {
    return {
      ...base,
      available: false,
      reason:
        `Budget saisi : ${formatTndAmount(budget)}. ` +
        `La simulation de construction s'active \u00e0 partir de ${formatTndAmount(MIN_BUDGET_TND)} TND, ` +
        "montant minimum pour engager un chantier structurant de ce projet.",
      usedBudget: 0,
      remainingBudget: round2(budget),
      projectReachablePct: 0,
      budgetUsedPct: 0,
      selectedCostSharePct: 0,
      gapToProjectTotal: round2(projectTotal),
      gapToNextCategory: 0,
      nextCategoryLabel: "",
      optimalCombination: "",
      breakdown: [],
      statusSummary: { realisable: [], partiel: [], report: [] },
      scenarios: [],
      recommendation: "",
      summarySentence: "",
    };
  }

  const current = simulateScenario(ordered, projectTotal, budget, lots);
  const boostedBudget = round2(budget + BUDGET_SIMULATION_STEP_TND);
  const scenarios: BudgetScenarioLine[] = [
    toScenario("actuel", "Budget actuel", budget, current, projectTotal),
    toScenario(
      "plus_palier",
      `+ ${frNumber(BUDGET_SIMULATION_STEP_TND)} TND`,
      boostedBudget,
      simulateScenario(ordered, projectTotal, boostedBudget, lots),
      projectTotal,
    ),
    toScenario(
      "complet",
      "Projet complet",
      projectTotal,
      simulateScenario(ordered, projectTotal, projectTotal, lots),
      projectTotal,
    ),
  ];

  const realisable = current.lines.filter((l) => l.status === "realisable");
  const partiel = current.lines.filter((l) => l.status === "partiel");
  const report = current.lines.filter((l) => l.status === "report");

  const projectReachablePct =
    projectTotal > 0 ? round1((current.fundedCost / projectTotal) * 100) : 0;
  const budgetUsedPct = budget > 0 ? round1((current.fundedCost / budget) * 100) : 0;
  /** Coût des chantiers réellement sélectionnables (budget du projet). */
  const selectedCost = round2(
    [...realisable, ...partiel].reduce((sum, l) => sum + l.fundedAmount, 0),
  );
  const selectedCostSharePct =
    projectTotal > 0 ? round1((selectedCost / projectTotal) * 100) : 0;
  const gapToProjectTotal = round2(Math.max(0, projectTotal - current.fundedCost));

  // Phrase r\u00e9capitulative : uniquement des montants calcul\u00e9s.
  const builtPart = [
    ...realisable.map((l) => `\u00ab ${l.categoryLabel} \u00bb`),
    ...partiel.map(
      (l) =>
        `\u00ab ${l.categoryLabel} \u00bb (${formatPercent(l.estimatedCost > 0 ? (l.fundedAmount / l.estimatedCost) * 100 : 0)} financ\u00e9)`,
    ),
  ].join(", ");
  const deferredPart = report.length
    ? ` ${report.length} poste${report.length > 1 ? "s" : ""} \u00e0 reporter (${report
        .map((l) => l.categoryLabel)
        .join(", ")}).`
    : " Aucun poste n\u2019est \u00e0 reporter.";

  const summarySentence =
    `Avec un budget de ${formatTndAmount(budget)}, vous financez ${formatPercent(projectReachablePct)} ` +
    `du projet \u00ab ${input.projectName} \u00bb (sc\u00e9nario ${input.scenarioLabel}) : ` +
    (builtPart || "aucun chantier entam\u00e9") +
    `.` +
    deferredPart;

  // Recommandation : elle suit la prioritisation, jamais un montant fixe.
  const pivot = partiel[0] ?? realisable[realisable.length - 1] ?? report[0];
  const nextDeferred = report[0];
  /** Chantier prioritaire suivant : celui qu'il reste \u00e0 financer en priorit\u00e9. */
  const nextCategory = partiel[0] ?? report[0] ?? null;
  const gapToNextCategory = nextCategory
    ? round2(Math.max(0, nextCategory.estimatedCost - nextCategory.fundedAmount))
    : 0;

  /** Combinaison optimale : s\u00e9lection maximisant le co\u00fbt couvert sans d\u00e9passer le budget. */
  const optimalCombination =
    [...realisable, ...partiel]
      .map((l) => `${l.categoryLabel} (${formatTndAmount(l.fundedAmount)})`)
      .join(" + ") || "Aucun chantier finan\u00e7able";

  const recommendationParts: string[] = [];
  if (pivot) {
    recommendationParts.push(
      partiel.length
        ? `Priorit\u00e9 au \u00ab ${pivot.categoryLabel} \u00bb : ${formatTndAmount(budget)} financent l\u2019int\u00e9gralit\u00e9 de vos postes ant\u00e9rieurs et ${formatPercent(
            (pivot.fundedAmount / pivot.estimatedCost) * 100,
          )} de ce chantier.`
        : `Priorit\u00e9 au \u00ab ${pivot.categoryLabel} \u00bb : ce chantier est le plus structurant de votre projet et votre budget le couvre.`,
    );
  }
  if (nextCategory && gapToNextCategory > 0) {
    recommendationParts.push(
      `Il manque ${formatTndAmount(gapToNextCategory)} pour terminer \u00ab ${nextCategory.categoryLabel} \u00bb, ` +
        `soit un budget cumul\u00e9 de ${formatTndAmount(nextCategory.budgetNeeded)}.`,
    );
  }
  if (nextDeferred) {
    recommendationParts.push(
      `Le poste \u00ab ${nextDeferred.categoryLabel} \u00bb (${formatTndAmount(nextDeferred.estimatedCost)}) ` +
        `reste \u00e0 financer : pr\u00e9voyez ${formatTndAmount(gapToProjectTotal)} de plus pour livrer le projet \u00e0 100 %. ` +
        "S\u00e9curisez les travaux structurels avant d'engager les d\u00e9penses de finition.",
    );
  }
  recommendationParts.push(
    `R\u00e9partition conseill\u00e9e pour \u00e9viter les d\u00e9penses inutiles : ${optimalCombination}.`,
  );
  const recommendation = recommendationParts.join(" ");

  return {
    ...base,
    available: true,
    usedBudget: current.fundedCost,
    remainingBudget: current.remaining,
    projectReachablePct,
    budgetUsedPct,
    selectedCostSharePct,
    gapToProjectTotal,
    gapToNextCategory,
    nextCategoryLabel: nextCategory?.categoryLabel ?? "",
    optimalCombination,
    // Coût au m² : valeur du scénario transmise par la page (imprévus retirés) ;
    // repli sur total ÷ surface seulement si elle n'est pas fournie.
    perUnitEstimate:
      Number(input.costPerM2) > 0
        ? round2(Number(input.costPerM2))
        : input.surface && input.surface > 0
          ? round2(projectTotal / input.surface)
          : undefined,
    breakdown: current.lines,
    statusSummary: { realisable, partiel, report },
    scenarios,
    recommendation,
    summarySentence,
  };
}