// ═══════════════════════════════════════════════════════════════════════════
// COPILOTE AI DU DASHBOARD — moteur d'analyse déterministe (module pur)
// ───────────────────────────────────────────────────────────────────────────
// Extension indépendante (« EXTEND, DON'T REPLACE ») : ce moteur LIT un
// contexte projet compact et produit des analyses/recommandations. Il ne
// modifie AUCUNE donnée projet, ne remplace AUCUN moteur existant et
// n'invente JAMAIS une donnée absente (phrase exacte NOT_AVAILABLE).
//
// Chaque affirmation est qualifiée (§ fiabilité) :
//   - "data"           → donnée réellement enregistrée dans le projet ;
//   - "calculation"    → valeur calculée à partir de ces données ;
//   - "estimate"       → valeur estimée (moteur d'estimation existant) ;
//   - "recommendation" → suggestion du Copilote (à valider par l'utilisateur).
// ═══════════════════════════════════════════════════════════════════════════

import { INVESTMENT_ELIGIBLE_TYPES, resolveProjectType } from "./projectTypes";

/** Phrase exacte à prononcer lorsqu'une information manque (jamais inventer). */
export const NOT_AVAILABLE = "Cette information n'est pas encore disponible dans votre projet.";

// ── Types ──────────────────────────────────────────────────────────────────

export type FactKind = "data" | "calculation" | "estimate" | "recommendation";

export type CopilotFact = {
  label: string;
  value: string;
  kind: FactKind;
};

/** Cibles de navigation possibles (mappées vers les modules existants côté UI). */
export type CopilotActionTarget = "project" | "plans" | "materials" | "consult" | "guide";

export type CopilotAction = {
  id: string;
  label: string;
  /** "navigate" = ouvrir un module existant ; "confirm" = exige une confirmation. */
  kind: "navigate" | "confirm";
  target?: CopilotActionTarget;
  note?: string;
};

export type CopilotAnswer = {
  title: string;
  content: string;
  facts: CopilotFact[];
  actions: CopilotAction[];
  missing: string[];
};

export type CostLine = {
  label: string;
  estimatedCost: number;
  percentage: number;
  items: number;
};

export type ScenarioLine = {
  label: string;
  totalCost: number;
  costPerSquareMeter: number | null;
};

export type DqeLot = {
  name: string;
  subtotal: number;
  lines: number;
};

export type MaterialCategoryState = {
  label: string;
  chosenLabel: string;
  cheapestLabel: string | null;
  /** Économie potentielle (choix courant − alternative la moins chère), > 0. */
  cheapestSaving: number | null;
};

/** Contexte projet COMPACT — résumés uniquement, jamais les documents bruts. */
export type CopilotProjectContext = {
  projectId: string;
  name: string;
  category: string;
  region: string | null;
  city: string | null;
  surface: number | null;
  floors: number | null;
  rooms: { bedrooms: number; bathrooms: number; kitchens: number; livingRooms: number };
  status: string;
  currency: string;
  cost: null | {
    totalCost: number;
    costPerSquareMeter: number | null;
    contingencyPercentage: number;
    breakdown: CostLine[];
    scenarios: ScenarioLine[];
  };
  dqe: null | { grandTotal: number; lots: DqeLot[] };
  materials: null | {
    analyzedAt: number;
    totalCost: number | null;
    missingData: string[];
    categories: MaterialCategoryState[];
  };
  plans: { has2D: boolean; has3D: boolean; saved: boolean };
  roadmap: null | { steps: { id: string; title: string; dureeJours: number; status: string }[] };
  professionals: {
    quotes: number;
    appointments: number;
    pendingAppointments: number;
    recommendedProviders: number;
  };
  investments: number;
  anomalies: { severity: string; description: string }[];
  estimatedDuration: string | null;
  optimizationTips: string[];
  technicalRecommendations: string[];
  memory: { note: string; kind: string }[];
};

// ── Formatage (jamais de devise codée en dur) ───────────────────────────────

export function fmtMoney(value: number, currency: string): string {
  const rounded = Math.round(value);
  return `${rounded.toLocaleString("fr-FR")} ${currency}`;
}

export function fmtPct(value: number): string {
  return `${(Math.round(value * 10) / 10).toLocaleString("fr-FR")} %`;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function projectLabel(ctx: CopilotProjectContext): string {
  const place = ctx.city || ctx.region;
  const surface = ctx.surface ? ` — ${ctx.surface.toLocaleString("fr-FR")} m²` : "";
  return `${ctx.name || "Projet"}${place ? ` — ${place}` : ""}${surface}`;
}

// ── Parcours projet (reflète l'ordre officiel du Project Journey) ───────────

export type JourneyStageKey =
  | "cost"
  | "plans"
  | "materials"
  | "consult"
  | "execution"
  | "investment"
  | "suppliers";

export type JourneyStage = {
  key: JourneyStageKey;
  label: string;
  done: boolean;
  detail: string;
};

export type JourneyState = {
  group: "A" | "B";
  stages: JourneyStage[];
  current: JourneyStage | null;
  next: JourneyStage | null;
  progress: number; // 0..100
  missing: string[];
};

function isDoneStatus(status: string): boolean {
  const s = norm(status);
  return s === "done" || s === "completed" || s === "termine" || s === "terminé" || s === "fini";
}

/** État du parcours calculé UNIQUEMENT depuis les données réellement présentes. */
export function computeJourney(ctx: CopilotProjectContext): JourneyState {
  const resolved = resolveProjectType((ctx.category ?? "").trim());
  const group: "A" | "B" = resolved && INVESTMENT_ELIGIBLE_TYPES.includes(resolved) ? "A" : "B";

  const costDone = !!ctx.cost;
  const plansDone = ctx.plans.saved;
  const materialsDone = !!ctx.materials;
  const consultDone = ctx.professionals.quotes > 0 || ctx.professionals.appointments > 0;
  const roadSteps = ctx.roadmap?.steps ?? [];
  const executionDone = roadSteps.length > 0 && roadSteps.every((s) => isDoneStatus(s.status));
  const investmentDone = ctx.investments > 0;
  const suppliersDone = ctx.professionals.recommendedProviders > 0 || ctx.professionals.quotes > 0;

  const stages: JourneyStage[] =
    group === "A"
      ? [
          {
            key: "cost",
            label: "Coût estimatif",
            done: costDone,
            detail: costDone
              ? `estimation disponible (${fmtMoney(ctx.cost!.totalCost, ctx.currency)})`
              : "estimation non réalisée",
          },
          {
            key: "plans",
            label: "Plans",
            done: plansDone,
            detail: plansDone
              ? "modèle enregistré"
              : "modèle 2D/3D non enregistré (générable dans le module Plans architecturaux AI)",
          },
          {
            key: "materials",
            label: "Choix matériaux",
            done: materialsDone,
            detail: materialsDone
              ? `analyse disponible (${ctx.materials!.categories.length} catégorie(s))`
              : "analyse Matériaux AI non réalisée",
          },
          {
            key: "consult",
            label: "Consultation",
            done: consultDone,
            detail: consultDone
              ? `${ctx.professionals.quotes} demande(s), ${ctx.professionals.appointments} rendez-vous`
              : "aucune demande ni rendez-vous enregistré",
          },
          {
            key: "execution",
            label: "Exécution",
            done: executionDone,
            detail:
              roadSteps.length > 0
                ? `${roadSteps.filter((s) => isDoneStatus(s.status)).length}/${roadSteps.length} étape(s) terminée(s)`
                : "roadmap non démarrée",
          },
          {
            key: "investment",
            label: "Investissement",
            done: investmentDone,
            detail: investmentDone
              ? `${ctx.investments} projet(s) d'investissement lié(s)`
              : "aucun projet d'investissement lié",
          },
        ]
      : [
          {
            key: "cost",
            label: "Coût estimatif",
            done: costDone,
            detail: costDone
              ? `estimation disponible (${fmtMoney(ctx.cost!.totalCost, ctx.currency)})`
              : "estimation non réalisée",
          },
          {
            key: "consult",
            label: "Consultation",
            done: consultDone,
            detail: consultDone
              ? `${ctx.professionals.quotes} demande(s), ${ctx.professionals.appointments} rendez-vous`
              : "aucune demande ni rendez-vous enregistré",
          },
          {
            key: "suppliers",
            label: "Fournisseurs",
            done: suppliersDone,
            detail: suppliersDone
              ? `${ctx.professionals.recommendedProviders} fournisseur(s) recommandé(s)`
              : "aucun fournisseur retenu",
          },
        ];

  const doneCount = stages.filter((s) => s.done).length;
  const current = stages.find((s) => !s.done) ?? null;
  const nextIdx = current ? stages.indexOf(current) + 1 : stages.length;
  const next = stages[nextIdx] ?? null;

  return {
    group,
    stages,
    current,
    next,
    progress: stages.length > 0 ? Math.round((doneCount / stages.length) * 100) : 0,
    missing: stages.filter((s) => !s.done).map((s) => s.label),
  };
}

// ── Suggestions rapides (adaptées aux données réellement disponibles) ───────

export type QuickSuggestion = { emoji: string; label: string; mode: CopilotMode };

export type CopilotMode =
  | "auto"
  | "summary"
  | "budget"
  | "dqe"
  | "materials"
  | "plans"
  | "journey"
  | "risks"
  | "optimize";

export function quickSuggestions(ctx: CopilotProjectContext): QuickSuggestion[] {
  const out: QuickSuggestion[] = [];
  out.push({ emoji: "📊", label: "Où en est mon projet ?", mode: "summary" });
  if (ctx.cost) out.push({ emoji: "💰", label: "Analyser mon budget", mode: "budget" });
  if (ctx.materials) out.push({ emoji: "🧱", label: "Optimiser mes matériaux", mode: "optimize" });
  out.push({ emoji: "📐", label: "Analyser mon plan", mode: "plans" });
  if (ctx.dqe) out.push({ emoji: "📋", label: "Analyser mon DQE", mode: "dqe" });
  out.push({ emoji: "📅", label: "Que dois-je faire maintenant ?", mode: "journey" });
  out.push({ emoji: "⚠️", label: "Quels sont les points à surveiller ?", mode: "risks" });
  if (ctx.cost && ctx.cost.breakdown.length > 0) {
    out.push({ emoji: "🚀", label: "Optimiser mon projet", mode: "optimize" });
  }
  return out;
}

// ── Analyse 1 : état du projet (§ résumé intelligent) ───────────────────────

export function buildProjectSummary(ctx: CopilotProjectContext): CopilotAnswer {
  const j = computeJourney(ctx);
  const facts: CopilotFact[] = [
    {
      label: "Étape actuelle",
      value: j.current ? `${j.current.label} — ${j.current.detail}` : "Parcours terminé",
      kind: "calculation",
    },
    { label: "Avancement", value: `${j.progress} % du parcours`, kind: "calculation" },
    { label: "Surface", value: ctx.surface ? `${ctx.surface.toLocaleString("fr-FR")} m²` : NOT_AVAILABLE, kind: "data" },
    {
      label: "Estimation",
      value: ctx.cost
        ? `${fmtMoney(ctx.cost.totalCost, ctx.currency)} (marché ${ctx.currency})`
        : NOT_AVAILABLE,
      kind: "estimate",
    },
    {
      label: "Coût au m²",
      value: ctx.cost?.costPerSquareMeter != null
        ? fmtMoney(ctx.cost.costPerSquareMeter, ctx.currency)
        : NOT_AVAILABLE,
      kind: "calculation",
    },
    {
      label: "DQE",
      value: ctx.dqe
        ? `disponible — ${ctx.dqe.lots.length} lot(s), ${fmtMoney(ctx.dqe.grandTotal, ctx.currency)}`
        : NOT_AVAILABLE,
      kind: "data",
    },
    {
      label: "Plan 2D / 3D",
      value: ctx.plans.saved
        ? `disponible (${ctx.plans.has2D ? "2D" : ""}${ctx.plans.has2D && ctx.plans.has3D ? " + " : ""}${ctx.plans.has3D ? "3D" : ""})`
        : `${NOT_AVAILABLE} Modèle générable dans Plans architecturaux AI.`,
      kind: "data",
    },
    {
      label: "Matériaux",
      value: ctx.materials
        ? `analyse disponible — ${ctx.materials.categories.length} catégorie(s)`
        : NOT_AVAILABLE,
      kind: "data",
    },
    {
      label: "Prochaine action suggérée",
      value: j.current
        ? `finaliser « ${j.current.label} » (${j.current.detail})`
        : "maintenir le suivi du chantier",
      kind: "recommendation",
    },
  ];

  const missing = j.missing.map((m) => `Parcours — ${m}`);
  if (!ctx.surface) missing.push("Surface du terrain");
  if (ctx.estimatedDuration == null) missing.push("Durée estimée du chantier");

  const content =
    `Votre projet « ${projectLabel(ctx)} » est actuellement à l'étape « ${j.current?.label ?? "terminé(e)"} » du parcours projet ` +
    `(${j.progress} % réalisé).\n` +
    (ctx.cost
      ? `Estimation disponible : ${fmtMoney(ctx.cost.totalCost, ctx.currency)} pour ${ctx.surface ?? "?"} m².\n`
      : `Estimation : ${NOT_AVAILABLE}\n`) +
    (j.next ? `Prochaine étape du parcours : « ${j.next.label} ».\n` : "") +
    (missing.length > 0
      ? `Éléments encore manquants : ${j.missing.join(", ") || "aucun"}.`
      : "Tous les éléments du parcours sont renseignés.");

  return {
    title: "État du projet",
    content,
    facts,
    missing,
    actions: [
      { id: "journey-open", label: "Continuer le Project Journey", kind: "navigate", target: "project" },
    ],
  };
}

// ── Analyse 2 : budget (§ pourquoi mon budget est élevé) ────────────────────

export function analyzeBudget(ctx: CopilotProjectContext): CopilotAnswer {
  if (!ctx.cost) {
    return {
      title: "Analyse du budget",
      content: `${NOT_AVAILABLE} L'estimation des coûts n'a pas encore été réalisée pour ce projet.`,
      facts: [],
      missing: ["Estimation des coûts"],
      actions: [{ id: "open-cost", label: "Ouvrir l'estimation", kind: "navigate", target: "project" }],
    };
  }

  const cost = ctx.cost;
  const cur = ctx.currency;
  const sorted = [...cost.breakdown].sort((a, b) => b.estimatedCost - a.estimatedCost);
  const top = sorted.slice(0, 3);
  const facts: CopilotFact[] = [
    { label: "Coût total estimé", value: fmtMoney(cost.totalCost, cur), kind: "estimate" },
    {
      label: "Coût au m²",
      value: cost.costPerSquareMeter != null ? fmtMoney(cost.costPerSquareMeter, cur) : NOT_AVAILABLE,
      kind: "calculation",
    },
    { label: "Surface", value: ctx.surface ? `${ctx.surface.toLocaleString("fr-FR")} m²` : NOT_AVAILABLE, kind: "data" },
    { label: "Marge de sécurité", value: `${fmtPct(cost.contingencyPercentage)} du budget`, kind: "data" },
    ...top.map((l) => ({
      label: `Lot « ${l.label} »`,
      value: `${fmtMoney(l.estimatedCost, cur)} (${fmtPct(l.percentage)})`,
      kind: "calculation" as FactKind,
    })),
  ];

  // Écarts estimation ↔ DQE (uniquement sur lots de libellés concordants).
  const missing: string[] = [];
  let ecartTotal: string | null = null;
  const ecartLots: string[] = [];
  if (ctx.dqe) {
    const diff = cost.totalCost - ctx.dqe.grandTotal;
    ecartTotal = `${diff >= 0 ? "+" : "−"}${fmtMoney(Math.abs(diff), cur)} (estimation vs DQE)`;
    facts.push({ label: "Écart estimation / DQE", value: ecartTotal, kind: "calculation" });
    for (const line of cost.breakdown) {
      const lot = ctx.dqe.lots.find((l) => norm(l.name).includes(norm(line.label)) || norm(line.label).includes(norm(l.name)));
      if (!lot) continue;
      const d = line.estimatedCost - lot.subtotal;
      if (Math.abs(d) > 0.1 * Math.max(line.estimatedCost, 1)) {
        ecartLots.push(
          `« ${line.label} » : estimation ${fmtMoney(line.estimatedCost, cur)} vs DQE ${fmtMoney(lot.subtotal, cur)} (écart ${d >= 0 ? "+" : "−"}${fmtMoney(Math.abs(d), cur)})`,
        );
      }
    }
  } else {
    missing.push("DQE (pour confronter l'estimation aux quantités réelles)");
  }

  // Matériaux les plus lourds (depuis l'analyse Matériaux AI si elle existe).
  let heavyMaterial: string | null = null;
  if (ctx.materials && ctx.materials.categories.length > 0 && ctx.materials.totalCost != null) {
    const withSaving = ctx.materials.categories.filter((c) => (c.cheapestSaving ?? 0) > 0);
    if (withSaving.length > 0) {
      heavyMaterial = withSaving.map((c) => `« ${c.label} » (choix : ${c.chosenLabel})`).slice(0, 3).join(", ");
      facts.push({
        label: "Matériaux substituables",
        value: heavyMaterial,
        kind: "calculation",
      });
    }
  }

  const topNames = top.map((l) => `« ${l.label} » (${fmtPct(l.percentage)})`).join(", ");
  const content =
    `Pourquoi votre budget est élevé : ${top.length > 0 ? `il est concentré sur ${topNames}, soit ` : ""}` +
    `${fmtPct(top.reduce((s, l) => s + l.percentage, 0))} du total (${fmtMoney(cost.totalCost, cur)}).\n` +
    (cost.costPerSquareMeter != null ? `Votre coût au m² ressort à ${fmtMoney(cost.costPerSquareMeter, cur)}.\n` : "") +
    (ecartLots.length > 0 ? `Postes présentant un écart important (estimation vs DQE) : ${ecartLots.join(" ; ")}.\n` : "") +
    `Où chercher des économies : sur les lots les plus lourds (${topNames}). ` +
    (ctx.optimizationTips.length > 0
      ? `Pistes déjà identifiées dans votre analyse : ${ctx.optimizationTips.slice(0, 2).join(" ; ")}. `
      : "") +
    `Aucune modification de votre estimation n'est effectuée sans votre validation.`;

  return {
    title: "Analyse du budget",
    content,
    facts,
    missing,
    actions: [
      ...(ctx.materials
        ? [{ id: "mat-open", label: "Voir dans Matériaux AI", kind: "navigate" as const, target: "materials" as const }]
        : []),
      { id: "budget-optimize", label: "Optimiser mon projet", kind: "navigate", target: "project" },
    ],
  };
}

// ── Analyse 3 : DQE ─────────────────────────────────────────────────────────

export function analyzeDqe(ctx: CopilotProjectContext): CopilotAnswer {
  if (!ctx.dqe) {
    return {
      title: "Analyse du DQE",
      content: `${NOT_AVAILABLE} Le DQE (décompte quantitatif et estimatif) n'a pas encore été généré pour ce projet.`,
      facts: [],
      missing: ["DQE"],
      actions: [{ id: "open-project", label: "Voir le projet", kind: "navigate", target: "project" }],
    };
  }

  const cur = ctx.currency;
  const lots = [...ctx.dqe.lots].sort((a, b) => b.subtotal - a.subtotal);
  const facts: CopilotFact[] = [
    { label: "Total DQE", value: fmtMoney(ctx.dqe.grandTotal, cur), kind: "data" },
    { label: "Nombre de lots", value: `${lots.length}`, kind: "data" },
    { label: "Nombre d'articles", value: `${lots.reduce((s, l) => s + l.lines, 0)}`, kind: "data" },
    ...lots.slice(0, 5).map((l) => ({
      label: `Lot « ${l.name} »`,
      value: `${fmtMoney(l.subtotal, cur)} — ${l.lines} article(s)`,
      kind: "data" as FactKind,
    })),
  ];
  if (ctx.cost) {
    const diff = ctx.cost.totalCost - ctx.dqe.grandTotal;
    facts.push({
      label: "Écart estimation / DQE",
      value: `${diff >= 0 ? "+" : "−"}${fmtMoney(Math.abs(diff), cur)}`,
      kind: "calculation",
    });
  }

  const heaviest = lots[0];
  return {
    title: "Analyse du DQE",
    content:
      `Votre DQE couvre ${lots.length} lot(s) pour un total de ${fmtMoney(ctx.dqe.grandTotal, cur)}.\n` +
      (heaviest ? `Le lot le plus lourd est « ${heaviest.name} » (${fmtMoney(heaviest.subtotal, cur)}).\n` : "") +
      (ctx.cost
        ? `Confronté à l'estimation (${fmtMoney(ctx.cost.totalCost, cur)}), l'écart est de ${fmtMoney(Math.abs(ctx.cost.totalCost - ctx.dqe.grandTotal), cur)}.`
        : `Pour confronter le DQE à l'estimation, réalisez d'abord l'estimation des coûts.`),
    facts,
    missing: ctx.cost ? [] : ["Estimation des coûts"],
    actions: [{ id: "dqe-project", label: "Voir le détail dans le projet", kind: "navigate", target: "project" }],
  };
}

// ── Analyse 4 : matériaux ───────────────────────────────────────────────────

export function analyzeMaterials(ctx: CopilotProjectContext): CopilotAnswer {
  if (!ctx.materials) {
    return {
      title: "Analyse des matériaux",
      content: `${NOT_AVAILABLE} L'analyse Matériaux AI n'a pas encore été lancée pour ce projet.`,
      facts: [],
      missing: ["Matériaux sélectionnés"],
      actions: [{ id: "mat-launch", label: "Voir dans Matériaux AI", kind: "navigate", target: "materials" }],
    };
  }

  const m = ctx.materials;
  const cur = ctx.currency;
  const missing: string[] = [...m.missingData];
  const facts: CopilotFact[] = [
    {
      label: "Coût matériaux estimé",
      value: m.totalCost != null ? fmtMoney(m.totalCost, cur) : NOT_AVAILABLE,
      kind: "estimate",
    },
    { label: "Catégories analysées", value: `${m.categories.length}`, kind: "data" },
  ];
  for (const c of m.categories.slice(0, 6)) {
    facts.push({
      label: c.label,
      value:
        c.cheapestSaving != null && c.cheapestSaving > 0 && c.cheapestLabel
          ? `${c.chosenLabel} — alternative « ${c.cheapestLabel} » −${fmtMoney(c.cheapestSaving, cur)}`
          : `${c.chosenLabel}`,
      kind: "data",
    });
  }
  const substitutable = m.categories.filter((c) => (c.cheapestSaving ?? 0) > 0 && c.cheapestLabel);
  if (substitutable.length > 0) {
    facts.push({
      label: "Alternatives économiques",
      value: `${substitutable.length} catégorie(s) — économie potentielle ${fmtMoney(
        substitutable.reduce((s, c) => s + (c.cheapestSaving ?? 0), 0),
        cur,
      )}`,
      kind: "calculation",
    });
  }

  return {
    title: "Analyse des matériaux",
    content:
      `Votre sélection couvre ${m.categories.length} catégorie(s) de matériaux${m.totalCost != null ? `, pour un coût estimé à ${fmtMoney(m.totalCost, cur)}` : ""}.\n` +
      (substitutable.length > 0
        ? `Des alternatives moins chères existent sur ${substitutable.length} catégorie(s) (ex. ${substitutable
            .slice(0, 2)
            .map((c) => `« ${c.label} » : ${c.chosenLabel} → ${c.cheapestLabel}`)
            .join(" ; ")}), sous réserve de disponibilité et de compatibilité technique.\n`
        : `Aucune substitution n'est ressortie de l'analyse actuelle sur les prix recensés.\n`) +
      (missing.length > 0 ? `Données manquantes signalées par l'analyse : ${missing.join(", ")}.` : `Aucune donnée manquante signalée.`),
    facts,
    missing,
    actions: [
      { id: "mat-open2", label: "Voir dans Matériaux AI", kind: "navigate", target: "materials" },
    ],
  };
}

// ── Analyse 5 : plans architecturaux ────────────────────────────────────────

export function analyzePlans(ctx: CopilotProjectContext): CopilotAnswer {
  const facts: CopilotFact[] = [
    { label: "Surface", value: ctx.surface ? `${ctx.surface.toLocaleString("fr-FR")} m²` : NOT_AVAILABLE, kind: "data" },
    { label: "Niveaux", value: ctx.floors ? `${ctx.floors}` : NOT_AVAILABLE, kind: "data" },
    {
      label: "Surface par niveau",
      value: ctx.surface && ctx.floors ? `${Math.round(ctx.surface / ctx.floors)} m² (moyenne)` : NOT_AVAILABLE,
      kind: "calculation",
    },
    {
      label: "Pièces principales",
      value: `${ctx.rooms.livingRooms} séjour(s), ${ctx.rooms.kitchens} cuisine(s), ${ctx.rooms.bedrooms} chambre(s), ${ctx.rooms.bathrooms} salle(s) d'eau`,
      kind: "data",
    },
    {
      label: "Plan 2D / 3D",
      value: ctx.plans.saved
        ? `enregistré (${ctx.plans.has2D ? "2D" : ""}${ctx.plans.has2D && ctx.plans.has3D ? " + " : ""}${ctx.plans.has3D ? "3D" : ""})`
        : `${NOT_AVAILABLE} Le modèle est généré à la demande dans le module Plans architecturaux AI.`,
      kind: "data",
    },
  ];

  const missing: string[] = [];
  if (!ctx.surface) missing.push("Surface du terrain");
  if (!ctx.floors) missing.push("Nombre de niveaux");

  const roomsCount = ctx.rooms.bedrooms + ctx.rooms.bathrooms + ctx.rooms.kitchens + ctx.rooms.livingRooms;
  if (ctx.surface && roomsCount > 0) {
    facts.push({
      label: "Surface moyenne par pièce",
      value: `${Math.round(ctx.surface / roomsCount)} m² (répartition indicative)`,
      kind: "calculation",
    });
  }

  const content =
    `Lecture de votre plan (${projectLabel(ctx)}) : ` +
    `${ctx.floors ?? "?"} niveau(s), ${roomsCount} pièce(s) principale(s).\n` +
    (ctx.surface && ctx.floors && ctx.floors > 1
      ? `Cohérence des dimensions : environ ${Math.round(ctx.surface / ctx.floors)} m² par niveau.\n`
      : "") +
    (ctx.surface && roomsCount > 0 && ctx.surface / roomsCount < 12
      ? `Attention : avec ${Math.round(ctx.surface / roomsCount)} m² par pièce en moyenne, la circulation risque d'être réduite — une variante redistribuant les surfaces est envisageable.\n`
      : `Aucune incohérence majeure de dimensions n'apparaît dans les données disponibles.\n`) +
    `Aucune modification du plan n'est effectuée automatiquement : toute variante est créée par vous dans le module Plans architecturaux AI.`;

  return {
    title: "Analyse du plan",
    content,
    facts,
    missing,
    actions: [{ id: "plans-variant", label: "Créer une variante", kind: "navigate", target: "plans" }],
  };
}

// ── Analyse 6 : parcours / « que dois-je faire maintenant ? » ───────────────

export function analyzeJourney(ctx: CopilotProjectContext): CopilotAnswer {
  const j = computeJourney(ctx);
  const roadSteps = ctx.roadmap?.steps ?? [];
  const doneSteps = roadSteps.filter((s) => isDoneStatus(s.status));
  const facts: CopilotFact[] = [
    {
      label: "Étape actuelle",
      value: j.current ? `${j.current.label} — ${j.current.detail}` : "Parcours terminé",
      kind: "calculation",
    },
    {
      label: "Prochaine étape",
      value: j.next ? `${j.next.label} — ${j.next.detail}` : "aucune (dernière étape atteinte)",
      kind: "calculation",
    },
    {
      label: "Action recommandée",
      value: j.current
        ? `finaliser « ${j.current.label} » : ${j.current.detail}`
        : "maintenir le suivi d'exécution",
      kind: "recommendation",
    },
    { label: "Avancement du parcours", value: `${j.progress} %`, kind: "calculation" },
  ];
  if (roadSteps.length > 0) {
    facts.push({
      label: "Roadmap d'exécution",
      value: `${doneSteps.length}/${roadSteps.length} étape(s) terminée(s), ${roadSteps.length - doneSteps.length} en attente`,
      kind: "calculation",
    });
  }

  const missing = j.missing.map((m) => `Parcours — ${m}`);
  if (roadSteps.length > 0) missing.push("Dates du planning (pour calculer les retards)");

  return {
    title: "Parcours projet",
    content:
      `Où en êtes-vous : étape « ${j.current?.label ?? "terminé(e)"} » sur ${j.stages.length} (${j.progress} %).\n` +
      `Prochaine étape : « ${j.next?.label ?? "—"} ».\n` +
      (roadSteps.length > 0
        ? `Roadmap : ${doneSteps.length} étape(s) terminée(s) sur ${roadSteps.length}.\n`
        : `Roadmap d'exécution : ${NOT_AVAILABLE}\n`) +
      `Action recommandée maintenant : ${j.current ? `finaliser « ${j.current.label} » (${j.current.detail})` : "poursuivre le suivi du chantier"}.`,
    facts,
    missing,
    actions: [{ id: "journey-continue", label: "Continuer le Project Journey", kind: "navigate", target: "project" }],
  };
}

// ── Analyse 7 : risques / points à surveiller ───────────────────────────────

export function analyzeRisks(ctx: CopilotProjectContext): CopilotAnswer {
  const risks: { text: string; severity: "important" | "attention" | "information" }[] = [];

  for (const a of ctx.anomalies.slice(0, 4)) {
    risks.push({ text: `Anomalie détectée dans l'analyse IA : ${a.description}`, severity: "important" });
  }
  if (ctx.cost && ctx.cost.contingencyPercentage < 5) {
    risks.push({
      text: `Marge de sécurité basse (${fmtPct(ctx.cost.contingencyPercentage)}) : un dépassement budgétaire est plus probable.`,
      severity: "attention",
    });
  }
  if (ctx.cost && !ctx.dqe) {
    risks.push({
      text: "Estimation sans DQE : les quantités réelles ne sont pas encore confrontées au budget.",
      severity: "attention",
    });
  }
  if (ctx.cost && ctx.dqe) {
    const diff = Math.abs(ctx.cost.totalCost - ctx.dqe.grandTotal);
    if (diff > 0.1 * Math.max(ctx.dqe.grandTotal, 1)) {
      risks.push({
        text: `Écart estimation/DQE supérieur à 10 % (${fmtMoney(diff, ctx.currency)}) : à réconcilier poste par poste.`,
        severity: "important",
      });
    }
  }
  const stuck = (ctx.roadmap?.steps ?? []).filter((s) => !isDoneStatus(s.status));
  if (stuck.length > 0 && ctx.investments > 0) {
    risks.push({
      text: `${stuck.length} étape(s) d'exécution en attente malgré un projet d'investissement lié.`,
      severity: "attention",
    });
  }
  for (const m of computeJourney(ctx).missing.slice(0, 3)) {
    risks.push({ text: `Donnée manquante : ${m}.`, severity: "information" });
  }

  const facts: CopilotFact[] = [
    { label: "Points de vigilance", value: `${risks.length}`, kind: "calculation" },
    ...risks.slice(0, 6).map((r) => ({
      label: r.severity === "important" ? "Important" : r.severity === "attention" ? "Attention" : "Information",
      value: r.text,
      kind: "recommendation" as FactKind,
    })),
  ];

  return {
    title: "Points à surveiller",
    content:
      risks.length > 0
        ? `J'ai identifié ${risks.length} point(s) de vigilance à partir des données de votre projet (les niveaux Important/Attention/Information sont rappelés ci-dessous).`
        : "Aucun point de vigilance majeur n'apparaît dans les données actuellement disponibles. Cette liste est calculée à partir de votre projet uniquement.",
    facts,
    missing: [],
    actions: [{ id: "risks-project", label: "Voir le projet", kind: "navigate", target: "project" }],
  };
}

// ── Analyse 8 : optimisation (« Optimise mon projet ») ──────────────────────

export type OptimizationProposal = {
  title: string;
  description: string;
  potentialSaving: number | null;
};

export function buildOptimizationProposals(ctx: CopilotProjectContext): OptimizationProposal[] {
  const cur = ctx.currency;
  const proposals: OptimizationProposal[] = [];

  if (ctx.materials) {
    for (const c of ctx.materials.categories) {
      if ((c.cheapestSaving ?? 0) > 0 && c.cheapestLabel) {
        proposals.push({
          title: `${c.label} : ${c.chosenLabel} → ${c.cheapestLabel}`,
          description:
            `Remplacer le matériau « ${c.chosenLabel} » par l'alternative « ${c.cheapestLabel} » pourrait réduire le coût estimatif d'environ ${fmtMoney(c.cheapestSaving ?? 0, cur)}, sous réserve de disponibilité et de compatibilité technique.`,
          potentialSaving: c.cheapestSaving ?? null,
        });
      }
    }
  }

  if (ctx.cost) {
    const sorted = [...ctx.cost.breakdown].sort((a, b) => b.estimatedCost - a.estimatedCost);
    const heavy = sorted[0];
    if (heavy && proposals.length === 0) {
      proposals.push({
        title: `Comparer les matériaux du lot « ${heavy.label} »`,
        description:
          `Le lot « ${heavy.label} » concentre ${fmtPct(heavy.percentage)} du budget (${fmtMoney(heavy.estimatedCost, cur)}). Lancer une comparaison Matériaux AI sur ce lot est le levier d'économie le plus probable.`,
        potentialSaving: null,
      });
    }
    for (const tip of ctx.optimizationTips.slice(0, 2)) {
      proposals.push({ title: "Piste identifiée par votre analyse", description: tip, potentialSaving: null });
    }
  }

  return proposals.slice(0, 4);
}

export function optimizeProject(ctx: CopilotProjectContext): CopilotAnswer {
  const proposals = buildOptimizationProposals(ctx);
  const cur = ctx.currency;
  const totalSaving = proposals.reduce((s, p) => s + (p.potentialSaving ?? 0), 0);

  const facts: CopilotFact[] = [
    {
      label: "Budget actuel",
      value: ctx.cost ? fmtMoney(ctx.cost.totalCost, cur) : NOT_AVAILABLE,
      kind: "estimate",
    },
  ];
  if (totalSaving > 0) {
    facts.push({
      label: "Économie potentielle identifiée",
      value: fmtMoney(totalSaving, cur),
      kind: "calculation",
    });
  }
  facts.push(...proposals.slice(0, 4).map((p) => ({
    label: "Optimisation proposée",
    value: p.title,
    kind: "recommendation" as FactKind,
  })));

  const actions: CopilotAction[] = [];
  if (ctx.materials) {
    actions.push({ id: "opt-detail", label: "Voir le détail", kind: "navigate", target: "materials" });
    actions.push({ id: "opt-simulate", label: "Simuler", kind: "navigate", target: "materials" });
  }
  actions.push({ id: "opt-apply", label: "Appliquer", kind: "confirm", target: "project" });

  return {
    title: "Optimisation proposée",
    content:
      proposals.length > 0
        ? proposals
            .map((p, i) => `${i + 1}. ${p.title} — ${p.description}`)
            .join("\n") +
          `\n\nCes pistes sont des recommandations (estimations) : rien n'est modifié dans votre projet sans votre confirmation explicite.`
        : `Aucune optimisation chiffrable n'apparaît dans les données actuellement disponibles (${NOT_AVAILABLE.toLowerCase()} Complétez l'estimation et l'analyse Matériaux AI pour obtenir des pistes chiffrées.)`,
    facts,
    missing: ctx.materials ? [] : ["Matériaux sélectionnés (pour chiffrer les substitutions)"],
    actions,
  };
}

// ── Routage des questions + préférences mémoire ─────────────────────────────

/** Détecte une préférence explicite à mémoriser (validation utilisateur requise). */
export function detectPreference(question: string): string | null {
  const q = norm(question);
  if (/\bretiens\b|je prefere|pour ce projet[, :]*(je veux|n'?utilise|evite|garde)|note que\b/.test(q)) {
    return question.trim();
  }
  return null;
}

export function routeQuestion(question: string): CopilotMode {
  const q = norm(question);
  if (/optimis/.test(q)) return "optimize";
  if (/\bbudget\b|cout|coute|cher|econom|marge|depasse|prix m|au m2|financ/.test(q)) return "budget";
  if (/\bdqe\b|quantitatif/.test(q)) return "dqe";
  if (/materia/.test(q)) return "materials";
  if (/\bplan\b|2d|3d|piece|chambre|disposition|circulation|niveau/.test(q)) return "plans";
  if (/etape|prochaine|maintenant|planning|avancement|ou en suis|retard|roadmap/.test(q)) return "journey";
  if (/risque|surveill|probleme|alert|attention|incomplet|manquant|veill/.test(q)) return "risks";
  return "summary";
}

/** Analyse déterministe complète (mode explicite ou routage par la question). */
export function runCopilotAnalysis(
  question: string,
  ctx: CopilotProjectContext,
  mode?: CopilotMode,
): CopilotAnswer {
  switch (mode && mode !== "auto" ? mode : routeQuestion(question)) {
    case "budget":
      return analyzeBudget(ctx);
    case "dqe":
      return analyzeDqe(ctx);
    case "materials":
      return analyzeMaterials(ctx);
    case "plans":
      return analyzePlans(ctx);
    case "journey":
      return analyzeJourney(ctx);
    case "risks":
      return analyzeRisks(ctx);
    case "optimize":
      return optimizeProject(ctx);
    default:
      return buildProjectSummary(ctx);
  }
}

// ── Digest compact pour l'enrichissement IA (§ performance) ─────────────────

export function buildContextDigest(ctx: CopilotProjectContext): string {
  const j = computeJourney(ctx);
  const lines: string[] = [];
  lines.push(`Projet : ${projectLabel(ctx)}`);
  lines.push(`Type : ${ctx.category || "?"} · Statut : ${ctx.status || "?"} · Pays/région : ${ctx.region ?? "?"} · Devise : ${ctx.currency}`);
  lines.push(`Pièces : ${ctx.rooms.livingRooms} séjour, ${ctx.rooms.kitchens} cuisine, ${ctx.rooms.bedrooms} chambre(s), ${ctx.rooms.bathrooms} sdb · Niveaux : ${ctx.floors ?? "?"}`);
  lines.push(
    `Estimation : ${ctx.cost ? `${fmtMoney(ctx.cost.totalCost, ctx.currency)} (${ctx.cost.costPerSquareMeter ? fmtMoney(ctx.cost.costPerSquareMeter, ctx.currency) + "/m²" : "coût/m² indispo"}), marge ${fmtPct(ctx.cost.contingencyPercentage)}` : "absente"}`,
  );
  if (ctx.cost) {
    for (const l of ctx.cost.breakdown.slice(0, 6)) {
      lines.push(`  · ${l.label} : ${fmtMoney(l.estimatedCost, ctx.currency)} (${fmtPct(l.percentage)})`);
    }
  }
  lines.push(
    `DQE : ${ctx.dqe ? `${ctx.dqe.lots.length} lot(s), ${fmtMoney(ctx.dqe.grandTotal, ctx.currency)}` : "absent"}`,
  );
  if (ctx.materials) {
    lines.push(`Matériaux : ${ctx.materials.categories.map((c) => `${c.label}→${c.chosenLabel}`).slice(0, 6).join(", ") || "analyse vide"}`);
  } else {
    lines.push("Matériaux : analyse absente");
  }
  lines.push(`Parcours : étape « ${j.current?.label ?? "terminé"} » (${j.progress} %), prochaine « ${j.next?.label ?? "—"} »`);
  lines.push(
    `Professionnels : ${ctx.professionals.quotes} demande(s), ${ctx.professionals.appointments} rdv (${ctx.professionals.pendingAppointments} en attente), ${ctx.professionals.recommendedProviders} fournisseur(s) recommandé(s)`,
  );
  if (ctx.anomalies.length > 0) lines.push(`Anomalies : ${ctx.anomalies.map((a) => a.description).slice(0, 3).join(" ; ")}`);
  if (ctx.optimizationTips.length > 0) lines.push(`Pistes d'optimisation : ${ctx.optimizationTips.slice(0, 3).join(" ; ")}`);
  if (ctx.memory.length > 0) lines.push(`Préférences mémorisées pour CE projet : ${ctx.memory.map((m) => m.note).slice(0, 5).join(" ; ")}`);
  const digest = lines.join("\n");
  return digest.length > 3000 ? digest.slice(0, 3000) + "…" : digest;
}
