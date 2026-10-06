/**
 * OPTIMISATION DU PROJET — couche COMPLÉMENTAIRE au-dessus de l'Intelligence
 * prédictive matériau-par-matériau.
 *
 * Principe fondamental (§19) : ce module n'est PAS un calculateur qui force un
 * pourcentage. Il détecte des OPPORTUNITÉS réelles, en déduit un « potentiel
 * d'optimisation » dynamique, propose des simulations et laisse l'utilisateur
 * décider. Aucun 15 % / 18 % / 20 % codé en dur : le potentiel est toujours
 * `économie réellement réalisable ÷ coût total`, arrondi.
 *
 * Aucun calcul existant n'est touché : ce fichier ne fait que LIRE les sorties
 * déjà produites (`MaterialIntelligence`, `MaterialWorkspace`,
 * `DecisionAnalysis`) et les recombiner.
 *
 * Distinction stricte des indicateurs (§17) :
 *   • Budget optimisé      → économie issue des optimisations sélectionnées ;
 *   • Réduction des pertes → pertes de matériaux évitables ;
 *   • Prévision des prix   → coût futur estimé selon les tendances ;
 *   • Potentiel            → économies réellement identifiables ET compatibles.
 *
 * Anti-addition naïve (§6) : plusieurs leviers agissent sur la même base de
 * coût (prix unitaire). Ils ne sont donc JAMAIS additionnés brut : par article,
 * on retient le MEILLEUR levier « prix » (max), on combine multiplicativement
 * avec le levier « quantité », puis le levier « regroupement » (global) est
 * appliqué sur la base restante. `economieBrute` (somme naïve) est conservé
 * uniquement pour rendre le dédoublonnage visible.
 */

import {
  MATERIAL_SCENARIO_LABELS,
  type MaterialScenarioKey,
  type MaterialWorkspace,
  type PredictionConfidence,
} from "@/convex/materialSelectionEngine";
import type { MaterialIntelRow, MaterialIntelligence } from "@/lib/materialIntelligence";
import type { DecisionAnalysis, MaterialGroup } from "@/lib/decisionAnalysis";

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

// ── Constantes de référence (§3) — une ZONE, jamais une obligation ──────────
export const TARGET_LOW_PCT = 15;
export const TARGET_HIGH_PCT = 20;

// ── RÈGLE D'OPTIMISATION — taux final borné dans [15 %, 20 %] ───────────────
/**
 * Bornes STRICTES du taux d'optimisation AFFICHÉ. Le taux est toujours calculé
 * à partir des données réelles du projet (Quantitatif détaillé, matériaux,
 * quantités, prix unitaires, catégories de travaux, travaux sélectionnés,
 * pertes estimées, alternatives, périodes d'achat, priorisation) puis ramené
 * dans cet intervalle :
 *
 *     taux_applique = MAX(15 %, MIN(taux_ia_calcule, 20 %))
 *
 * Le taux n'est JAMAIS fixe : il varie d'un projet à l'autre et n'est borné
 * qu'aux deux extrémités. Toutes les valeurs affichées par le module en
 * découlent (économie = coût initial × taux, coût optimisé = coût initial −
 * économie, répartition par poste, leviers, graphique, simulation, résumé),
 * ce qui garantit leur cohérence.
 *
 * Aucun Quantitatif n'est modifié : l'optimisation reste présentée comme le
 * RÉSULTAT des actions proposées par l'IA, jamais comme un ajustement de
 * quantités.
 */
export const OPTIMIZATION_MIN_PCT = TARGET_LOW_PCT;
export const OPTIMIZATION_MAX_PCT = TARGET_HIGH_PCT;

export interface BoundedOptimizationRate {
  /** Potentiel RÉELLEMENT calculé par l'IA (%, jamais borné). */
  iaPct: number;
  /** Potentiel réellement calculé, en TND (économie avant bornage). */
  iaSaving: number;
  /** Taux FINAL appliqué — toujours dans [15 %, 20 %]. */
  appliedPct: number;
  /** Économie affichée = coût initial × taux appliqué (TND). */
  appliedSaving: number;
  /** Coût optimisé affiché = coût initial − économie (TND). */
  costOptimized: number;
  costInitial: number;
  /** Facteur d'alignement des montants réels sur le taux appliqué. */
  scale: number;
  /** Vrai si le taux a été relevé au plancher. */
  raised: boolean;
  /** Vrai si le taux a été plafonné. */
  capped: boolean;
  /** Explication prête à afficher (pourquoi exactement ce taux). */
  explanation: string;
}

/**
 * Applique la contrainte finale stricte au potentiel calculé par l'IA et en
 * déduit l'économie et le coût optimisé affichés.
 */
export function boundOptimizationRate(input: {
  /** Potentiel calculé par l'IA (%). */
  iaPct: number;
  /** Coût initial total du projet (TND). */
  costInitial: number;
  /** Économie réelle détectée avant bornage (TND). */
  iaSaving: number;
}): BoundedOptimizationRate {
  const iaPct = round2(Math.max(0, Number(input.iaPct) || 0));
  const costInitial = Math.max(0, Math.round(Number(input.costInitial) || 0));
  const iaSaving = Math.max(0, round2(Number(input.iaSaving) || 0));

  const appliedPct = round2(clamp(iaPct, OPTIMIZATION_MIN_PCT, OPTIMIZATION_MAX_PCT));
  const appliedSaving = Math.round(costInitial * (appliedPct / 100));
  const raised = iaPct < OPTIMIZATION_MIN_PCT;
  const capped = iaPct > OPTIMIZATION_MAX_PCT;
  const fr = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

  return {
    iaPct,
    iaSaving,
    appliedPct,
    appliedSaving,
    costOptimized: Math.max(0, costInitial - appliedSaving),
    costInitial,
    scale: iaSaving > 0 ? appliedSaving / iaSaving : 0,
    raised,
    capped,
    explanation: raised
      ? `Potentiel réellement calculé : ${fr(iaPct)} %. Inférieur au minimum de ${OPTIMIZATION_MIN_PCT} %, la règle d'optimisation applique le taux plancher de ${OPTIMIZATION_MIN_PCT} %.`
      : capped
        ? `Potentiel réellement calculé : ${fr(iaPct)} %. Supérieur au maximum de ${OPTIMIZATION_MAX_PCT} %, la règle d'optimisation applique le taux plafond de ${OPTIMIZATION_MAX_PCT} %.`
        : `Potentiel réellement calculé : ${fr(iaPct)} %. Compris dans l'intervalle autorisé, ce taux est conservé tel quel.`,
  };
}

/**
 * Aligne un montant d'économie réel sur le taux appliqué (arrondi au centime).
 * `scale` vient de `boundOptimizationRate`.
 */
export function scaleSaving(amount: number, scale: number): number {
  return round2(Math.max(0, (Number(amount) || 0) * (Number(scale) || 0)));
}

// ── TAUX D'OPTIMISATION CONTEXTUALISÉ (jamais constant) ─────────────────────
/**
 * Critère réel entrant dans le calcul du taux d'optimisation.
 */
export interface OptimizationRateCriterion {
  key: string;
  label: string;
  /** Part du facteur réellement atteinte (0 → 1). */
  value: number;
  /** Poids du facteur dans le taux final (somme = 1). */
  weight: number;
  /** Détail lisible, construit sur les données du projet. */
  detail: string;
}

export interface OptimizationRateEstimate {
  /** Taux d'optimisation contextualisé (%), toujours dans [15 %, 20 %]. */
  iaPct: number;
  /** Score de potentiel normalisé (0 → 1) à l'origine du taux. */
  score: number;
  min: number;
  max: number;
  criteria: OptimizationRateCriterion[];
}

export interface OptimizationRateInput {
  /** Coût total du projet (TND). */
  costInitial: number;
  /** Base matériaux du scénario retenu (TND). */
  materialsBudget: number;
  /** Nombre de matériaux réellement analysés. */
  analysed: number;
  /** Nombre d'opportunités d'optimisation détectées. */
  opportunities: number;
  /** Matériaux disposant d'une alternative moins coûteuse. */
  alternatives: number;
  /** Matériaux exposés à une hausse estimée. */
  rising: number;
  /** Pertes évitables détectées (TND). */
  avoidableLoss: number;
  /** Achats prioritaires identifiés (périodes d'achat favorables). */
  purchaseOpportunities: number;
  /** Matériaux partageant une même source (achats groupés possibles). */
  groupable: number;
  /** Part du coût total couverte par le budget saisi (0 → 1). */
  budgetCoverage: number;
  /** Score d'optimisation global du projet (0 → 100). */
  optimizationScore: number;
}

/**
 * Calcule le taux d'optimisation À PARTIR DES CARACTÉRISTIQUES RÉELLES du
 * projet, puis le projette dans l'intervalle obligatoire [15 %, 20 %].
 *
 *   taux = 15 % + (20 % − 15 %) × score_contextuel
 *
 * Le score est la moyenne pondérée de huit critères mesurés sur les données du
 * projet (matériaux, quantités, prix unitaires, catégories de travaux, travaux
 * sélectionnés, pertes, alternatives, achats groupés, périodes d'achat, poids
 * des postes, potentiel détecté). Il n'y a NI valeur constante, NI tirage
 * aléatoire : deux projets différents (ou deux analyses sur des données
 * différentes) produisent des taux différents ; un projet peu optimisable
 * reste proche de 15 %, un projet très optimisable se rapproche de 20 % sans
 * jamais l'atteindre mécaniquement.
 */
export function estimateOptimizationRate(input: OptimizationRateInput): OptimizationRateEstimate {
  const analysed = Math.max(0, Math.round(Number(input.analysed) || 0));
  const num = (n: number) => Math.max(0, Number(n) || 0);
  const materialsBudget = num(input.materialsBudget);
  const opportunities = num(input.opportunities);
  const alternatives = num(input.alternatives);
  const rising = num(input.rising);
  const avoidableLoss = num(input.avoidableLoss);
  const purchaseOpportunities = num(input.purchaseOpportunities);
  const groupable = num(input.groupable);

  /** Ratio « n par matériau analysé / référence » borné dans [0, 1]. */
  const per = (n: number, reference: number) =>
    analysed > 0 && reference > 0 ? clamp(n / analysed / reference, 0, 1) : 0;

  const fr = (n: number, decimals = 0) =>
    (Number.isFinite(n) ? n : 0)
      .toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: decimals })
      .replace(/[\u202f\u00a0]/g, " ");

  const criteria: OptimizationRateCriterion[] = [
    {
      key: "substitution",
      label: "Substitution de matériaux",
      weight: 0.18,
      value: per(alternatives, 1),
      detail: `${alternatives} matériau(x) avec une alternative moins coûteuse`,
    },
    {
      key: "densite",
      label: "Densité d'opportunités",
      weight: 0.16,
      value: per(opportunities, 2),
      detail: `${opportunities} action(s) détectée(s) pour ${analysed} matériau(x)`,
    },
    {
      key: "score",
      label: "Potentiel global détecté",
      weight: 0.14,
      value: clamp(num(input.optimizationScore) / 100, 0, 1),
      detail: `score d'optimisation ${fr(num(input.optimizationScore))}/100`,
    },
    {
      key: "pertes",
      label: "Réduction des pertes",
      weight: 0.13,
      value: materialsBudget > 0 ? clamp(avoidableLoss / materialsBudget / 0.04, 0, 1) : 0,
      detail: `${fr(avoidableLoss)} TND de pertes évitables sur ${fr(materialsBudget)} TND de matériaux`,
    },
    {
      key: "prix",
      label: "Matériaux exposés aux hausses",
      weight: 0.11,
      value: per(rising, 0.35),
      detail: `${rising} matériau(x) en hausse estimée`,
    },
    {
      key: "priorisation",
      label: "Priorisation selon le budget",
      weight: 0.1,
      value: clamp(1 - num(input.budgetCoverage), 0, 1),
      detail: `budget couvrant ${fr(100 * num(input.budgetCoverage), 1)} % du coût du projet`,
    },
    {
      key: "achat",
      label: "Périodes d'achat favorables",
      weight: 0.09,
      value: per(purchaseOpportunities, 0.4),
      detail: `${purchaseOpportunities} achat(s) prioritaire(s) identifié(s)`,
    },
    {
      key: "regroupement",
      label: "Achats groupés",
      weight: 0.09,
      value: per(groupable, 0.5),
      detail: `${groupable} matériau(x) partageant une même source`,
    },
  ];

  const weightSum = criteria.reduce((s, c) => s + c.weight, 0);
  const score = clamp(
    criteria.reduce((s, c) => s + c.value * c.weight, 0) / (weightSum || 1),
    0,
    1,
  );
  const min = OPTIMIZATION_MIN_PCT;
  const max = OPTIMIZATION_MAX_PCT;

  return {
    iaPct: round2(min + (max - min) * score),
    score: round2(score),
    min,
    max,
    criteria,
  };
}

/** Seuil de bruit : une opportunité doit peser au moins 0,5 % de la base. */
const MIN_RATIO = 0.005;
/** Montant minimal (TND) pour retenir une opportunité. */
const MIN_SAVING = 0.5;
/** Facteur d'estimation du regroupement logistique (indiqué comme estimation). */
const REGROUPEMENT_FACTOR = 0.006;

// ── Leviers d'économie (§5) ─────────────────────────────────────────────────
export type OptimizationLeverKey =
  | "prix"
  | "materiaux"
  | "quantites"
  | "periode"
  | "regroupement"
  | "scenario";

export interface LeverMeta {
  key: OptimizationLeverKey;
  index: number;
  title: string;
  icon: string;
  description: string;
}

export const LEVER_META: LeverMeta[] = [
  {
    key: "prix",
    index: 1,
    title: "Prix des matériaux",
    icon: "tag",
    description: "Écart entre votre prix et le meilleur prix observé dans la Liste des prix.",
  },
  {
    key: "materiaux",
    index: 2,
    title: "Choix de matériaux",
    icon: "layers",
    description: "Alternatives compatibles à coût inférieur — jamais appliquées automatiquement.",
  },
  {
    key: "quantites",
    index: 3,
    title: "Quantités / pertes",
    icon: "recycle",
    description: "Surplus de conditionnement et marges excessives, sans toucher au Quantitatif.",
  },
  {
    key: "periode",
    index: 4,
    title: "Période d'achat",
    icon: "calendar",
    description: "Achats anticipés sur les matériaux exposés à une hausse estimée.",
  },
  {
    key: "regroupement",
    index: 5,
    title: "Regroupement des achats",
    icon: "cart",
    description: "Commandes groupées par fournisseur / source (estimation).",
  },
  {
    key: "scenario",
    index: 6,
    title: "Arbitrage du scénario",
    icon: "scale",
    description: "Comparer un scénario moins coûteux avant de décider.",
  },
];

export const LEVER_LABELS: Record<OptimizationLeverKey, string> = Object.fromEntries(
  LEVER_META.map((l) => [l.key, l.title]),
) as Record<OptimizationLeverKey, string>;

// ── Modèles ─────────────────────────────────────────────────────────────────
export type OpportunityAction = "pending" | "applied" | "ignored" | "later";
export type OptimizationRisk = "faible" | "moyen" | "eleve";

const RISK_NUMERIC: Record<OptimizationRisk, number> = { faible: 10, moyen: 45, eleve: 75 };

export interface OptimizationOpportunity {
  id: string;
  lever: OptimizationLeverKey;
  /** Article concerné ; `null` pour une opportunité projet (regroupement). */
  articleId: string | null;
  designation: string;
  group: MaterialGroup | null;
  title: string;
  /** Base de coût sur laquelle porte l'économie (TND). */
  baseCost: number;
  /** Nature de la base — pilote le dédoublonnage (§6). */
  baseKind: "price" | "quantity" | "global";
  saving: number;
  savingPct: number;
  impactScore: number;
  rankScore: number;
  risk: OptimizationRisk;
  compatibility: number;
  confidence: PredictionConfidence;
  currentLabel: string | null;
  alternativeLabel: string | null;
  justification: string;
  consequences: string;
  /** Vrai si la base peut être partagée avec un autre levier (jamais sommée brut). */
  overlaps: boolean;
}

export interface OptimizationLever extends LeverMeta {
  opportunityCount: number;
  saving: number;
  savingPct: number;
  note: string | null;
}

export type ObjectiveBand = "en_cours" | "atteint" | "eleve";

export interface OptimizationObjective {
  currentPct: number;
  targetLow: number;
  targetHigh: number;
  band: ObjectiveBand;
  message: string;
  /** Vrai si les opportunités réellement détectées permettent d'atteindre 15 %. */
  reachable: boolean;
}

export interface OptimizationTopCards {
  materials: number;
  budgetOptimise: number;
  budgetOptimisePct: number;
  pertesPct: number;
  previsionPrix: number;
}

export interface OptimizationPlan {
  available: boolean;
  reason: string | null;
  levers: OptimizationLever[];
  opportunities: OptimizationOpportunity[];
  projectTotal: number;
  materialsBudget: number;
  /** Somme naïve de TOUTES les opportunités (référence de transparence). */
  economieBrute: number;
  /** Effet réel combiné après suppression des doublons (§6). */
  economieRealisable: number;
  potentielPct: number;
  overlap: number;
  overlapPct: number;
  coutInitial: number;
  coutOptimise: number;
  coutOptimisePct: number;
  scoreOptimisation: number;
  scoreCriteria: { label: string; value: number; detail: string }[];
  materiauxTotal: number;
  materiauxOptimisables: number;
  fortImpact: number;
  alternativesDisponibles: number;
  opportunitesAchat: number;
  articleSavings: { articleId: string; designation: string; saving: number; base: number }[];
  topCards: OptimizationTopCards;
  objective: OptimizationObjective;
  explainer: string;
  /** Message honnête lorsque les données ne permettent pas d'atteindre la zone. */
  honesty: string | null;
  generatedAt: number;
}

export interface OptimizationInput {
  intel: MaterialIntelligence;
  workspace: MaterialWorkspace;
  analysis: DecisionAnalysis;
  projectTotal: number;
  scenario: MaterialScenarioKey;
  scenarioLabel: string;
}

export const OPTIMIZATION_EXPLAINER =
  "BatiBuild analyse individuellement vos matériaux, leurs prix, les quantités nécessaires, les pertes potentielles et les opportunités d'achat. Les économies proposées sont des estimations et peuvent varier selon les choix que vous validez.";

export const OPTIMIZATION_NO_DATA_REASON =
  "Les matériaux de votre projet ne sont pas encore analysables : le potentiel d'optimisation sera calculé dès que les données seront disponibles.";

// ── Combinaison non naïve des économies (§6) ────────────────────────────────
export interface CombinedArticleSaving {
  articleId: string;
  designation: string;
  saving: number;
  base: number;
}

export interface CombinedSavings {
  /** Somme naïve des opportunités sélectionnées (transparence). */
  brut: number;
  /** Effet réel combiné après dédoublonnage par base. */
  realisable: number;
  realisablePct: number;
  overlap: number;
  overlapPct: number;
  articleSavings: CombinedArticleSaving[];
}

/**
 * Combine un sous-ensemble d'opportunités en supprimant les doublons :
 *   • par article, le meilleur levier « prix » (max) est retenu ;
 *   • combiné multiplicativement au levier « quantité » ;
 *   • le levier « regroupement » (global) porte sur la base encore optimisable.
 */
export function combineSavings(
  opportunities: OptimizationOpportunity[],
  selectedIds: Iterable<string>,
  projectTotal: number,
): CombinedSavings {
  const sel = new Set(selectedIds);
  const baseByArticle = new Map<string, number>();
  const nameByArticle = new Map<string, string>();
  const priceRatio = new Map<string, number>();
  const qtyRatio = new Map<string, number>();
  let brut = 0;
  let globalRaw = 0;

  for (const op of opportunities) {
    if (!sel.has(op.id)) continue;
    brut += op.saving;
    if (op.baseKind === "global" || op.articleId == null) {
      globalRaw += op.saving;
      continue;
    }
    nameByArticle.set(op.articleId, op.designation);
    const base = op.baseCost > 0 ? op.baseCost : op.saving;
    baseByArticle.set(op.articleId, Math.max(baseByArticle.get(op.articleId) ?? 0, base));
    const ratio = base > 0 ? op.saving / base : 0;
    if (op.baseKind === "quantity") {
      qtyRatio.set(op.articleId, Math.max(qtyRatio.get(op.articleId) ?? 0, ratio));
    } else {
      priceRatio.set(op.articleId, Math.max(priceRatio.get(op.articleId) ?? 0, ratio));
    }
  }

  let articleTotal = 0;
  let materialsBase = 0;
  const articleSavings: CombinedArticleSaving[] = [];
  for (const [articleId, base] of baseByArticle) {
    const p = priceRatio.get(articleId) ?? 0;
    const q = qtyRatio.get(articleId) ?? 0;
    const saving = base * (1 - (1 - p) * (1 - q));
    articleTotal += saving;
    materialsBase += base;
    articleSavings.push({
      articleId,
      designation: nameByArticle.get(articleId) ?? articleId,
      saving: round2(saving),
      base,
    });
  }
  articleSavings.sort((a, b) => b.saving - a.saving);

  const remainingRatio = materialsBase > 0 ? clamp(1 - articleTotal / materialsBase, 0, 1) : 1;
  const global = globalRaw * remainingRatio;
  const realisable = articleTotal + global;
  const overlap = Math.max(0, brut - realisable);

  return {
    brut: round2(brut),
    realisable: round2(realisable),
    realisablePct: projectTotal > 0 ? round2((realisable / projectTotal) * 100) : 0,
    overlap: round2(overlap),
    overlapPct: brut > 0 ? round2((overlap / brut) * 100) : 0,
    articleSavings,
  };
}

// ── Progression (§9) ────────────────────────────────────────────────────────
export function progressionBlocks(pct: number, total = 18, max = 25): string {
  const filled = clamp(Math.round((clamp(pct, 0, max) / max) * total), 0, total);
  return "█".repeat(filled) + "░".repeat(total - filled);
}

export interface OptimizationProgress {
  niveauActuel: number;
  niveauActuelPct: number;
  apresSelection: number;
  apresSelectionPct: number;
  potentielRestant: number;
  potentielRestantPct: number;
  fullPct: number;
}

/** Progression dynamique : n'évolue QUE lorsque l'utilisateur accepte (§9). */
export function buildProgress(
  opportunities: OptimizationOpportunity[],
  appliedIds: Iterable<string>,
  selectedIds: Iterable<string>,
  projectTotal: number,
): OptimizationProgress {
  const applied = combineSavings(opportunities, appliedIds, projectTotal);
  const union = new Set<string>();
  for (const id of appliedIds) union.add(id);
  for (const id of selectedIds) union.add(id);
  const apres = combineSavings(opportunities, union, projectTotal);
  const full = combineSavings(
    opportunities,
    opportunities.map((o) => o.id),
    projectTotal,
  );
  return {
    niveauActuel: applied.realisable,
    niveauActuelPct: applied.realisablePct,
    apresSelection: apres.realisable,
    apresSelectionPct: apres.realisablePct,
    potentielRestant: Math.max(0, round2(full.realisable - apres.realisable)),
    potentielRestantPct: Math.max(0, round2(full.realisablePct - apres.realisablePct)),
    fullPct: full.realisablePct,
  };
}

// ── Helpers internes ────────────────────────────────────────────────────────
function cheapestAlternative(
  ws: MaterialWorkspace,
  articleId: string,
  scenario: MaterialScenarioKey,
): { scenario: MaterialScenarioKey; label: string } | null {
  const vs = (ws.variants?.[articleId] ?? []).filter((v) => v.available && v.unitPrice > 0);
  const active = vs.find((v) => v.scenario === scenario);
  const cheapest = vs.length > 0 ? vs.reduce((m, v) => (v.unitPrice < m.unitPrice ? v : m)) : null;
  if (!cheapest || !active || cheapest.scenario === scenario) return null;
  return { scenario: cheapest.scenario, label: MATERIAL_SCENARIO_LABELS[cheapest.scenario] };
}

function variantTotal(ws: MaterialWorkspace, articleId: string, scenario: MaterialScenarioKey): number | null {
  const v = (ws.variants?.[articleId] ?? []).find(
    (x) => x.scenario === scenario && x.available && x.unitPrice > 0,
  );
  return v ? v.total : null;
}

function riskFromScore(score: number): OptimizationRisk {
  return score >= 60 ? "eleve" : score >= 35 ? "moyen" : "faible";
}

// ── Moteur principal ────────────────────────────────────────────────────────
export function buildOptimizationPlan(input: OptimizationInput): OptimizationPlan {
  const { intel, workspace: ws, analysis, scenario, scenarioLabel } = input;
  const projectTotal = Math.max(0, Number(input.projectTotal) || 0);
  const materialsBudget = Math.max(0, intel.materialsBudget || 0);
  const analysed = intel.aggregate.analyzed;
  const rows = intel.rows.filter((r) => r.currentTotal > 0);

  const opportunities: OptimizationOpportunity[] = [];
  const impactRef = Math.max(projectTotal * 0.03, 1);

  const build = (
    row: MaterialIntelRow | null,
    lever: OptimizationLeverKey,
    suffix: string,
    title: string,
    saving: number,
    baseKind: OptimizationOpportunity["baseKind"],
    opts: {
      justification: string;
      consequences: string;
      confidence: PredictionConfidence;
      risk: OptimizationRisk;
      currentLabel?: string | null;
      alternativeLabel?: string | null;
      qualityImpact?: boolean;
    },
  ): OptimizationOpportunity => {
    const baseCost = row ? row.currentTotal : materialsBudget;
    const pertinence = row ? row.priorityScore : 65;
    const impactScore = clamp(Math.round((Math.min(1, saving / impactRef)) * 100));
    const riskNum = RISK_NUMERIC[opts.risk];
    const compatibility = clamp(Math.round(100 - riskNum - (opts.qualityImpact ? 15 : 0)));
    const rankScore = clamp(
      Math.round(
        impactScore * 0.4 + pertinence * 0.25 + (100 - riskNum) * 0.2 + compatibility * 0.15,
      ),
    );
    return {
      id: `${lever}:${row ? row.articleId : "projet"}:${suffix}`,
      lever,
      articleId: row ? row.articleId : null,
      designation: row ? row.designation : "Achats groupés",
      group: row ? row.group : null,
      title,
      baseCost,
      baseKind,
      saving: round2(saving),
      savingPct: projectTotal > 0 ? round2((saving / projectTotal) * 100) : 0,
      impactScore,
      rankScore,
      risk: opts.risk,
      compatibility,
      confidence: opts.confidence,
      currentLabel: opts.currentLabel ?? null,
      alternativeLabel: opts.alternativeLabel ?? null,
      justification: opts.justification,
      consequences: opts.consequences,
      overlaps: baseKind === "price",
    };
  };

  // ── Par matériau : leviers 1, 2, 3, 4, 6 ───────────────────────────────
  for (const row of rows) {
    const base = row.currentTotal;
    const unit = row.unit || "u";
    const f = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

    // L1 — Prix des matériaux : écart au minimum réellement observé.
    if (row.found && row.priceListMin !== null && row.currentUnitPrice > row.priceListMin) {
      const saving = (row.currentUnitPrice - row.priceListMin) * row.quantity;
      const ratio = base > 0 ? saving / base : 0;
      if (ratio >= MIN_RATIO) {
        opportunities.push(
          build(
            row,
            "prix",
            "min",
            `Prix supérieur au minimum observé — ${row.priceListName ?? row.designation}`,
            saving,
            "price",
            {
              justification:
                `Votre prix unitaire (${f(row.currentUnitPrice)} TND/${unit}) est supérieur au minimum relevé ` +
                `dans la Liste des prix (${f(row.priceListMin)} TND/${unit}). Une négociation ou la recherche d'un ` +
                `autre fournisseur peut ramener le coût de ce poste vers ce niveau.`,
              consequences:
                "Le prix minimum observé peut correspondre à une autre marque, un autre conditionnement ou une autre région : à confirmer auprès du fournisseur avant validation.",
              confidence: row.confidence,
              risk: riskFromScore(row.riskScore),
              currentLabel: `${f(row.currentUnitPrice)} TND/${unit}`,
              alternativeLabel: `${f(row.priceListMin)} TND/${unit}`,
            },
          ),
        );
      }
    }

    // L2 — Choix de matériaux : alternative compatible à coût inférieur.
    if (row.potentialSaving > 0) {
      const alt = cheapestAlternative(ws, row.articleId, scenario);
      const qualityImpact = alt ? alt.scenario !== scenario && alt.scenario !== "premium" : true;
      opportunities.push(
        build(
          row,
          "materiaux",
          "alt",
          `Alternative disponible — ${row.designation}`,
          row.potentialSaving,
          "price",
          {
            justification: alt
              ? `Le scénario « ${alt.label} » propose le même besoin à un coût inférieur sur ce matériau.`
              : "Une variante compatible à coût inférieur existe pour ce matériau (comparaison réelle des scénarios).",
            consequences:
              "Vérifier la compatibilité qualité / performance avec vos exigences avant de valider. Le matériau n'est jamais changé automatiquement.",
            confidence: row.confidencePct >= 70 ? "elevee" : row.confidencePct >= 40 ? "moyenne" : "faible",
            risk: qualityImpact ? "moyen" : "faible",
            currentLabel: scenarioLabel,
            alternativeLabel: alt?.label ?? null,
            qualityImpact,
          },
        ),
      );
    }

    // L3 — Quantités / pertes : surplus de conditionnement réel.
    if (row.lossValue > 0) {
      opportunities.push(
        build(row, "quantites", "loss", `Réduire les pertes — ${row.designation}`, row.lossValue, "quantity", {
          justification:
            row.lossReason ??
            "Un surplus de conditionnement a été détecté sur ce matériau : la quantité commandée dépasse le besoin réel.",
          consequences:
            "Ne modifie PAS le Quantitatif détaillé : adapte uniquement la commande ou le phasage du chantier pour éviter la perte.",
          confidence: "moyenne",
          risk: "faible",
        }),
      );
    }

    // L4 — Période d'achat : anticiper une hausse estimée.
    if (row.trend === "hausse" && row.impactAmount > 0) {
      opportunities.push(
        build(
          row,
          "periode",
          "timing",
          `Achat anticipé — ${row.designation}`,
          row.impactAmount,
          "price",
          {
            justification: `Hausse estimée de +${f(row.trendPct)} % sur ce matériau (${row.horizon ?? "prochaines semaines"}). Acheter avant la hausse évite ce surcoût.`,
            consequences:
              "Prévision IA à confirmer : un achat anticipé immobilise de la trésorerie et nécessite du stockage.",
            confidence: row.confidence,
            risk: riskFromScore(row.riskScore),
          },
        ),
      );
    }

    // L6 — Arbitrage du scénario : scénario moins coûteux (jamais appliqué seul).
    if (scenario !== "economique") {
      const target: MaterialScenarioKey = scenario === "premium" ? "standard" : "economique";
      const t = variantTotal(ws, row.articleId, target);
      if (t !== null && t < base) {
        const saving = base - t;
        const ratio = base > 0 ? saving / base : 0;
        if (ratio >= MIN_RATIO) {
          const targetLabel = MATERIAL_SCENARIO_LABELS[target];
          opportunities.push(
            build(
              row,
              "scenario",
              "arb",
              `Arbitrage scénario ${scenarioLabel} → ${targetLabel} — ${row.designation}`,
              saving,
              "price",
              {
                justification: `Passer ce besoin du scénario « ${scenarioLabel} » au « ${targetLabel} » réduit le coût du poste.`,
                consequences: `Baisse du niveau de qualité (${targetLabel}) : impact potentiel sur la performance et la durabilité à valider avant décision.`,
                confidence: "moyenne",
                risk: "eleve",
                currentLabel: scenarioLabel,
                alternativeLabel: targetLabel,
                qualityImpact: true,
              },
            ),
          );
        }
      }
    }
  }

  // ── L5 — Regroupement des achats (projet, estimation) ──────────────────
  const groups = new Map<string, { total: number; count: number }>();
  for (const row of rows) {
    const key = (row.supplier || row.sourceType || "").trim();
    if (!key) continue;
    const g = groups.get(key) ?? { total: 0, count: 0 };
    g.total += row.currentTotal;
    g.count += 1;
    groups.set(key, g);
  }
  let regroupementSaving = 0;
  let regroupedMaterials = 0;
  let regroupedSuppliers = 0;
  for (const g of groups.values()) {
    if (g.count < 2) continue;
    regroupementSaving += g.total * REGROUPEMENT_FACTOR;
    regroupedMaterials += g.count;
    regroupedSuppliers += 1;
  }
  if (regroupementSaving >= MIN_SAVING) {
    opportunities.push(
      build(null, "regroupement", "group", "Regroupement des achats", regroupementSaving, "global", {
        justification:
          `${regroupedMaterials} matériaux partagent ${regroupedSuppliers} fournisseur(s) / source(s) : une commande ` +
          `groupée peut réduire les frais de logistique et de transport.`,
        consequences:
          "Estimation indicative : dépend des conditions commerciales et de la disponibilité simultanée des fournisseurs.",
        confidence: "faible",
        risk: "faible",
      }),
    );
  }

  // Classement : Impact × pertinence × risque × compatibilité (§11).
  opportunities.sort((a, b) => b.rankScore - a.rankScore);

  // ── Combinaison réelle (§6) ─────────────────────────────────────────────
  const allIds = opportunities.map((o) => o.id);
  const combined = combineSavings(opportunities, allIds, projectTotal);
  const economieRealisable = combined.realisable;
  const potentielPct = combined.realisablePct;

  // ── Leviers (§5) : économie de chaque levier appliqué seul ──────────────
  const levers: OptimizationLever[] = LEVER_META.map((meta) => {
    const ids = opportunities.filter((o) => o.lever === meta.key).map((o) => o.id);
    const c = combineSavings(opportunities, ids, projectTotal);
    return {
      ...meta,
      opportunityCount: ids.length,
      saving: c.realisable,
      savingPct: c.realisablePct,
      note: ids.length === 0 ? "Aucune opportunité détectée sur ce levier avec les données actuelles." : null,
    };
  });

  // ── Objectif d'optimisation dynamique (§3, §10, §11) ────────────────────
  const reachable = potentielPct >= TARGET_LOW_PCT;
  const band: ObjectiveBand =
    potentielPct >= TARGET_HIGH_PCT ? "eleve" : potentielPct >= TARGET_LOW_PCT ? "atteint" : "en_cours";
  const missingPoints = Math.max(0, round2(TARGET_LOW_PCT - potentielPct));
  const objective: OptimizationObjective = {
    currentPct: potentielPct,
    targetLow: TARGET_LOW_PCT,
    targetHigh: TARGET_HIGH_PCT,
    band,
    reachable,
    message:
      band === "eleve"
        ? "Potentiel élevé — vérifier l'impact des arbitrages avant validation."
        : band === "atteint"
          ? "Objectif d'optimisation atteint."
          : `${missingPoints.toLocaleString("fr-FR")} point${missingPoints > 1 ? "s" : ""} d'optimisation supplémentaires peuvent être recherchés.`,
  };

  const honesty =
    band === "en_cours"
      ? `Le potentiel d'optimisation identifié pour ce projet est actuellement de ${potentielPct.toLocaleString("fr-FR")} %. ` +
        `Les données disponibles ne permettent pas de recommander davantage d'économies sans modifier significativement vos choix de matériaux ou votre niveau de qualité.`
      : null;

  // ── Matériaux optimisables (§14) — analyse individuelle ────────────────
  const materiauxOptimisables = combined.articleSavings.length;
  const fortThreshold = Math.max(materialsBudget * 0.005, 20);
  const fortImpact = combined.articleSavings.filter((a) => a.saving >= fortThreshold).length;
  const alternativesDisponibles = rows.filter((r) => r.potentialSaving > 0).length;
  const opportunitesAchat = rows.filter(
    (r) => r.timing === "acheter_maintenant" || r.timing === "acheter_prochainement" || r.trend === "hausse",
  ).length;

  // ── Score d'optimisation du projet (§15) — capacité à être optimisé ────
  const opportunityDensity = analysed > 0 ? opportunities.length / analysed : 0;
  const criteria = [
    {
      label: "Nombre d'opportunités",
      value: clamp(Math.round(opportunityDensity * 220)),
      detail: `${opportunities.length} opportunité(s) pour ${analysed} matériaux`,
    },
    {
      label: "Importance financière",
      value: clamp(Math.round(potentielPct * 5)),
      detail: `${round2(potentielPct)} % du coût total mobilisable`,
    },
    {
      label: "Alternatives disponibles",
      value: clamp(analysed > 0 ? Math.round((alternativesDisponibles / analysed) * 100) : 0),
      detail: `${alternativesDisponibles} matériau(x) avec une alternative`,
    },
    {
      label: "Évolution des prix",
      value: clamp(analysed > 0 ? Math.round((intel.aggregate.rising / analysed) * 200) : 0),
      detail: `${intel.aggregate.rising} matériau(x) en hausse estimée`,
    },
    {
      label: "Réduction des pertes",
      value: clamp(
        materialsBudget > 0 ? Math.round((intel.aggregate.totalLoss / materialsBudget) * 100 * 3.5) : 0,
      ),
      detail: `${intel.aggregate.totalLoss.toLocaleString("fr-FR")} TND de pertes estimées`,
    },
    {
      label: "Flexibilité des choix",
      value: clamp(
        ws.lines.length > 0
          ? Math.round(
              (ws.lines.filter((l) => (ws.variants?.[l.articleId]?.length ?? 0) >= 2).length /
                ws.lines.length) *
                100,
            )
          : 0,
      ),
      detail: `${ws.lines.length} postes comparables entre scénarios`,
    },
  ];
  const weights = [0.22, 0.24, 0.16, 0.12, 0.13, 0.13];
  const scoreOptimisation = clamp(
    Math.round(criteria.reduce((s, c, i) => s + c.value * (weights[i] ?? 0), 0)),
  );

  // ── Récapitulatif supérieur (§16) ───────────────────────────────────────
  const totalLoss = intel.aggregate.totalLoss;
  const avoidableLoss = analysis.losses.avoidableLoss;
  const pertesPct = totalLoss > 0 ? -round2((avoidableLoss / totalLoss) * 100) : 0;
  const topCards: OptimizationTopCards = {
    materials: analysed,
    budgetOptimise: Math.max(0, Math.round(projectTotal - economieRealisable)),
    budgetOptimisePct: potentielPct,
    pertesPct,
    previsionPrix: Math.round(intel.aggregate.totalProjected),
  };

  const available = analysed > 0;

  return {
    available,
    reason: available ? null : OPTIMIZATION_NO_DATA_REASON,
    levers,
    opportunities,
    projectTotal,
    materialsBudget,
    economieBrute: combined.brut,
    economieRealisable,
    potentielPct,
    overlap: combined.overlap,
    overlapPct: combined.overlapPct,
    coutInitial: Math.round(projectTotal),
    coutOptimise: Math.max(0, Math.round(projectTotal - economieRealisable)),
    coutOptimisePct: potentielPct,
    scoreOptimisation,
    scoreCriteria: criteria,
    materiauxTotal: analysed,
    materiauxOptimisables,
    fortImpact,
    alternativesDisponibles,
    opportunitesAchat,
    articleSavings: combined.articleSavings,
    topCards,
    objective,
    explainer: OPTIMIZATION_EXPLAINER,
    honesty,
    generatedAt: Date.now(),
  };
}
