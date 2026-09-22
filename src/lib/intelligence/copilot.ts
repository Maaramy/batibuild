// ═════════════════════════════════════════════════════════════════════════════
// COPILOTE IA DU PROJET — moteur d'analyse contextuel (pur, sans Convex)
// ═════════════════════════════════════════════════════════════════════════════
// Répond aux questions de l'utilisateur à partir des données DÉJÀ PRÉSENTES du
// projet (estimation, DQE, matériaux, planning, documents, fournisseurs).
//
// GARDE-FOUS :
//  - ne modifie JAMAIS les données : toute suggestion d'action affiche une
//    intention (`actionSuggested`) que l'UI transforme en confirmation
//    explicite AVANT d'appeler une mutation EXISTANTE des modules d'origine ;
//  - n'invente aucune donnée : les réponses citent uniquement des valeurs
//    présentes dans le projet, ou indiquent clairement « donnée manquante » ;
//  - les analyses sont des aides à la décision, pas des validations d'ingénieur.
// ═════════════════════════════════════════════════════════════════════════════

import type { ProjectLite } from "./engine";
import { buildFinanceSnapshot, type ExpenseEntry } from "./engine";

export type CopilotActionSuggestion =
  | { kind: "open_tab"; tab: "finance" | "guide" | "planning" | "purchases" | "quotes" | "variants"; label: string }
  | { kind: "none"; label?: string };

export interface CopilotAnswer {
  question: string;
  /** Réponse structurée : plusieurs paragraphes courts. */
  paragraphs: string[];
  /** Chiffres clés cités dans la réponse (affichés en cartes). */
  stats: { label: string; value: string }[];
  /** Suggestion d'action — jamais exécutée sans validation utilisateur. */
  actionSuggested: CopilotActionSuggestion;
  /** Sources utilisées (transparence : d'où vient la réponse). */
  sources: string[];
  confidence: "haute" | "moyenne" | "faible";
}

interface CopilotContext {
  project: ProjectLite;
  projectName: string;
  expenses: ExpenseEntry[];
  currency: string;
  /** Progression du guide A→Z (0-100) si disponible. */
  guideProgressPct?: number;
  /** Étapes de roadmap restantes (titres), si le guide est généré. */
  remainingSteps?: string[];
}

const fmtCur = (n: number, currency: string) =>
  new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);

/**
 * Classification d'intention par mots-clés (rapide, sans réseau).
 * Les questions multi-intentions sont résolues par priorité : budget > coût >
 * matériaux > étapes > complétude.
 */
function detectIntent(q: string): "budget" | "reduce_cost" | "materials" | "steps" | "completeness" | "unknown" {
  const s = q.toLowerCase();
  if (/(pourquoi|budget).*(élev|cher|haut|grand)|budget.*(élev|cher|haut)/.test(s)) return "budget";
  if (/(r[ée]duire|baisser|diminuer|optimiser|économ)/.test(s) && /(co[uû]t|prix|budget|dépense)/.test(s)) return "reduce_cost";
  if (/mat[ée]ria/.test(s)) return "materials";
  if (/(étape|etape|prochaine|restant|planning|chronologie|ordre)/.test(s)) return "steps";
  if (/(incomplet|manquant|fini|pr[êe]t|pr[ée]paration|complet)/.test(s)) return "completeness";
  if (/budget|co[uû]t|prix|dépense/.test(s)) return "budget";
  return "unknown";
}

/** Réponse : pourquoi mon budget est-il élevé ? */
function answerBudget(ctx: CopilotContext): CopilotAnswer {
  const { project, currency } = ctx;
  const ce = project.costEstimate;
  if (!ce) {
    return {
      question: "budget",
      paragraphs: [
        `Le projet « ${ctx.projectName} » n'a pas encore d'estimation de coûts. Lancez l'analyse BIM pour obtenir un budget détaillé, puis je pourrai expliquer sa composition poste par poste.`,
      ],
      stats: [],
      actionSuggested: { kind: "none" },
      sources: [],
      confidence: "haute",
    };
  }
  const surface = project.surface != null ? project.surface * (project.floors ?? 1) : null;
  const costPerM2 = ce.costPerSquareMeter ?? (surface && ce.totalCost ? ce.totalCost / surface : null);
  const breakdown = [...(ce.breakdown ?? [])].sort((a, b) => b.estimatedCost - a.estimatedCost);
  const top3 = breakdown.slice(0, 3);
  const paragraphs: string[] = [];
  const stats: CopilotAnswer["stats"] = [];

  paragraphs.push(
    `Le budget total du projet s'élève à ${fmtCur(ce.totalCost, currency)}${surface ? ` pour ${surface.toFixed(0)} m² de surface couverte, soit ${fmtCur(costPerM2 ?? 0, currency)}/m²` : ""}.`,
  );
  if (top3.length > 0) {
    const share = top3.reduce((s, b) => s + b.percentage, 0);
    paragraphs.push(
      `Les trois premiers postes (${top3.map((b) => b.label).join(", ")}) représentent ${share.toFixed(0)} % du budget. ${
        top3[0].percentage >= 35
          ? `Le poste « ${top3[0].label} » est particulièrement élevé (${top3[0].percentage} %) : c'est le principal levier d'optimisation.`
          : "La répartition reste équilibrée entre les postes."
      }`,
    );
    for (const b of top3) {
      stats.push({ label: b.label, value: `${fmtCur(b.estimatedCost, currency)} · ${b.percentage} %` });
    }
  }
  if (project.region) {
    paragraphs.push(
      `Les prix utilisés tiennent compte de la région « ${project.region} » (indices régionaux appliqués par le moteur d'estimation existant).`,
    );
  }
  return {
    question: "budget",
    paragraphs,
    stats,
    actionSuggested: { kind: "open_tab", tab: "finance", label: "Ouvrir le suivi financier" },
    sources: ["Estimation du projet (coût détaillé)", "Analyse BIM"],
    confidence: top3.length > 0 ? "haute" : "moyenne",
  };
}

/** Réponse : comment réduire le coût ? */
function answerReduceCost(ctx: CopilotContext): CopilotAnswer {
  const { project, currency } = ctx;
  const ce = project.costEstimate;
  const paragraphs: string[] = [];
  const stats: CopilotAnswer["stats"] = [];
  const scen = ce?.budgetScenarios;

  if (ce && scen) {
    const eco = scen.economique;
    const saving = ce.totalCost - eco.totalCost;
    paragraphs.push(
      `En passant du scénario actuel au scénario « ${eco.label} », l'économie potentielle est de ${fmtCur(saving, currency)} (soit ${Math.round((saving / ce.totalCost) * 100)} %) — à valider selon votre niveau de finition souhaité.`,
    );
    stats.push({ label: "Économie potentielle (scénario économique)", value: fmtCur(saving, currency) });
  } else if (ce) {
    paragraphs.push(
      "Aucun scénario budgétaire alternatif n'est enregistré pour ce projet. Les recommandations d'optimisation générées lors de l'analyse restent applicables.",
    );
  }
  if (project.optimizationTips?.length) {
    paragraphs.push(`Optimisations déjà identifiées lors de l'analyse : ${project.optimizationTips.slice(0, 3).join(" · ")}.`);
  }
  // Poste le plus gros = levier n°1
  const top = [...(ce?.breakdown ?? [])].sort((a, b) => b.estimatedCost - a.estimatedCost)[0];
  if (top) {
    paragraphs.push(
      `Levier principal : le poste « ${top.label} » (${fmtCur(top.estimatedCost, currency)}, ${top.percentage} % du budget). Comparez les fournisseurs du module Matériaux AI et le comparateur de devis pour identifier des alternatives — aucune substitution ne sera faite automatiquement.`,
    );
  }
  paragraphs.push(
    "Comparez aussi les variantes Économique / Standard / Premium dans le simulateur (sur une copie du projet) et demandez plusieurs devis via le comparateur.",
  );
  return {
    question: "reduce_cost",
    paragraphs,
    stats,
    actionSuggested: { kind: "open_tab", tab: "variants", label: "Ouvrir le simulateur de variantes" },
    sources: ["Scénarios budgétaires", "Conseils d'optimisation de l'analyse"],
    confidence: scen ? "haute" : "moyenne",
  };
}

/** Réponse : quels matériaux sont adaptés ? */
function answerMaterials(ctx: CopilotContext): CopilotAnswer {
  const { project, currency } = ctx;
  const paragraphs: string[] = [];
  const stats: CopilotAnswer["stats"] = [];
  const dqeLots = project.dqe?.lots ?? [];
  const materials = dqeLots
    .flatMap((l) => l.lines)
    .filter((l) => l.nature === "materiaux")
    .sort((a, b) => b.total - a.total);

  if (materials.length > 0) {
    const top = materials.slice(0, 5);
    const totalMat = materials.reduce((s, m) => s + m.total, 0);
    paragraphs.push(
      `Le DQE du projet recense ${materials.length} postes de matériaux pour ${fmtCur(totalMat, currency)}. Les principaux : ${top.map((m) => m.designation).join(", ")}.`,
    );
    for (const m of top.slice(0, 3)) {
      stats.push({ label: m.designation, value: `${m.quantity} ${m.unit} · ${fmtCur(m.total, currency)}` });
    }
    paragraphs.push(
      "Utilisez « Optimiser mon choix » dans Matériaux AI pour comparer prix, qualité, disponibilité et durabilité — l'IA présente des alternatives mais ne remplace rien sans votre confirmation.",
    );
  } else {
    paragraphs.push(
      "Aucun DQE détaillé n'est encore disponible : générez d'abord l'estimation avec quantitatif. En attendant, le module Matériaux AI peut recommander des matériaux adaptés à votre type de projet et à votre région.",
    );
  }
  return {
    question: "materials",
    paragraphs,
    stats,
    actionSuggested: { kind: "open_tab", tab: "purchases", label: "Voir la liste d'achat dérivée du DQE" },
    sources: materials.length > 0 ? ["DQE du projet"] : [],
    confidence: materials.length > 0 ? "haute" : "moyenne",
  };
}

/** Réponse : quelles étapes restent à réaliser ? */
function answerSteps(ctx: CopilotContext): CopilotAnswer {
  const remaining = ctx.remainingSteps ?? [];
  const progress = ctx.guideProgressPct ?? 0;
  const paragraphs: string[] = [];
  if (remaining.length > 0) {
    paragraphs.push(
      `Progression du chantier : ${progress} %. Il reste ${remaining.length} étape(s) : ${remaining.slice(0, 6).join(" → ")}${remaining.length > 6 ? " …" : ""}.`,
    );
  } else if (progress > 0) {
    paragraphs.push(`Toutes les étapes du guide sont marquées terminées (${progress} %). Pensez à la réception de chantier et aux documents finaux.`);
  } else {
    paragraphs.push(
      "Aucun guide d'exécution n'a encore été généré pour ce projet. Ouvrez « Guide de A à Z » : les étapes (préparation, structure, toiture, corps d'ouvrage secondaire, finitions, réception) sont créées automatiquement selon le type de projet, avec matériaux, contrôles et durées indicatives.",
    );
  }
  return {
    question: "steps",
    paragraphs,
    stats: remaining.length > 0 ? [{ label: "Étapes restantes", value: String(remaining.length) }, { label: "Progression", value: `${progress} %` }] : [],
    actionSuggested: { kind: "open_tab", tab: "guide", label: "Ouvrir le Guide de A à Z" },
    sources: remaining.length > 0 ? ["Guide d'exécution du projet"] : [],
    confidence: "haute",
  };
}

/** Réponse : quels éléments sont incomplets ? */
function answerCompleteness(ctx: CopilotContext): CopilotAnswer {
  const { project } = ctx;
  const missing: string[] = [];
  if (!project.costEstimate) missing.push("estimation des coûts");
  if (!project.dqe?.lots?.length) missing.push("DQE (quantitatif détaillé)");
  if (!project.files?.length) missing.push("plans et documents");
  if (!project.region) missing.push("région (prix locaux)");
  if (!project.aiAnalysis) missing.push("analyse IA");
  if ((project.providerRecommendations?.providers?.length ?? 0) === 0) missing.push("prestataires recommandés");
  if (!project.surface) missing.push("surface du projet");

  const paragraphs: string[] = [];
  if (missing.length === 0) {
    paragraphs.push(
      `Le projet « ${ctx.projectName} » est complet sur tous les critères suivis : estimation, DQE, documents, région, analyse IA et prestataires. Vous pouvez passer au suivi d'exécution (guide, planning, dépenses).`,
    );
  } else {
    paragraphs.push(
      `Le projet « ${ctx.projectName} » compte ${missing.length} élément(s) manquant(s) : ${missing.join(", ")}.`,
    );
    paragraphs.push(
      "Compléter ces éléments améliore la fiabilité des estimations, du planning dérivé et du score de préparation. Aucune donnée ne sera créée automatiquement.",
    );
  }
  const done = 7 - missing.length;
  return {
    question: "completeness",
    paragraphs,
    stats: [{ label: "Éléments complétés", value: `${done}/7` }],
    actionSuggested: { kind: "none" },
    sources: ["Fiche projet (lecture seule)"],
    confidence: "haute",
  };
}

/** Point d'entrée unique : répond à une question en langage naturel. */
export function askCopilot(question: string, ctx: CopilotContext): CopilotAnswer {
  const intent = detectIntent(question);
  switch (intent) {
    case "budget":
      return answerBudget(ctx);
    case "reduce_cost":
      return answerReduceCost(ctx);
    case "materials":
      return answerMaterials(ctx);
    case "steps":
      return answerSteps(ctx);
    case "completeness":
      return answerCompleteness(ctx);
    default:
      return {
        question,
        paragraphs: [
          "Je peux répondre aux questions suivantes sur ce projet :",
          "« Pourquoi mon budget est-il élevé ? » — « Comment réduire le coût du projet ? » — « Quels matériaux sont adaptés ? » — « Quelles étapes restent à réaliser ? » — « Quels éléments de mon projet sont incomplets ? »",
          "Toutes mes réponses s'appuient uniquement sur les données existantes du projet. Je ne modifie jamais rien sans votre validation explicite.",
        ],
        stats: [],
        actionSuggested: { kind: "none" },
        sources: [],
        confidence: "haute",
      };
  }
}

/** Questions suggérées (affichées comme raccourcis dans l'UI). */
export const COPILOT_SUGGESTED_QUESTIONS = [
  "Pourquoi mon budget est-il élevé ?",
  "Comment réduire le coût du projet ?",
  "Quels matériaux sont adaptés ?",
  "Quelles étapes restent à réaliser ?",
  "Quels éléments de mon projet sont incomplets ?",
] as const;

/** Fabrique le contexte copilote à partir des données projet + extensions. */
export function buildCopilotContext(args: {
  project: ProjectLite;
  projectName: string;
  expenses: ExpenseEntry[];
  currency: string;
  guideProgressPct?: number;
  remainingSteps?: string[];
}): CopilotContext {
  return {
    project: args.project,
    projectName: args.projectName,
    expenses: args.expenses,
    currency: args.currency,
    guideProgressPct: args.guideProgressPct,
    remainingSteps: args.remainingSteps,
  };
}

/** Réexport pratique pour l'UI (évite un import supplémentaire). */
export { buildFinanceSnapshot };
