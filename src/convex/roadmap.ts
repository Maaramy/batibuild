// ============================================================================
// Guide Construction A-Z — API Convex.
// Persiste la feuille de route générée par roadmapEngine.ts (une par projet)
// et expose les mutations de suivi : cocher des étapes, planning, budget,
// contrôle du chantier, documents.
// ============================================================================

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  generateRoadmap,
  computeProgress,
  buildSummary,
  buildNextSteps,
  buildOmissions,
  buildExecution,
  buildSiteRiskAnalysis,
  ensureCurrentRoadmap,
  phaseProgress,
  phaseStatus,
  rebalanceBudgetRows,
  fmtTnd,
  stripImprevusFromRoadmap,
  type Roadmap,
  type RoadmapProjectInput,
  type StepStatus,
} from "./roadmapEngine";
import { executionContextFromProject, playbookForCategory } from "./roadmapPlaybooks";
import { getCurrentUser } from "./users";
import { requireClientProAccess } from "./access";

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Feuille de route d'un projet (résultats + entrée) — propriétaire uniquement. */
export const getRoadmap = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const doc = await ctx.db
      .query("projectRoadmaps")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", args.projectId))
      .first();
    if (!doc) return null;
    const input = doc.input as RoadmapProjectInput;
    const stored = doc.results as Roadmap;
    // Compatibilité : une feuille de route enregistrée avant la suppression des
    // imprévus est ramenée au coût réel, puis ses champs calculés (budget,
    // résumé, risques) sont recalculés comme lors d'une mise à jour (Phase 05).
    const clean = stripImprevusFromRoadmap(stored, input);
    // Trame obsolète (autre type de projet / ancienne version) : une feuille de
    // route encore vierge est régénérée avec la trame du type réel, sans
    // jamais écraser une progression déjà saisie.
    const current = ensureCurrentRoadmap(clean, input);
    const results = current === clean ? derive(clean, input) : derive(current, input);
    return { roadmapId: doc._id, input, results };
  },
});

/** Liste des feuilles de route de l'utilisateur (pour le tableau de bord). */
export const listRoadmaps = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const docs = await ctx.db.query("projectRoadmaps").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    return docs
      .map((d) => {
        const r = d.results as Roadmap;
        return {
          roadmapId: d._id,
          projectId: d.projectId,
          projectName: r.project?.name ?? "",
          categoryLabel: r.project?.categoryLabel ?? "",
          progress: r.progress ?? 0,
          updatedAt: d.updatedAt ?? d.createdAt,
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// ─── Génération ──────────────────────────────────────────────────────────────

/** Génère (ou régénère) la feuille de route A-Z d'un projet d'estimation. */
export const generateRoadmapForProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous pour générer une feuille de route.");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Suivi de A à Z");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Projet introuvable.");
    if (project.userId !== user._id && user.role !== "admin") {
      throw new Error("Ce projet ne vous appartient pas.");
    }

    const input: RoadmapProjectInput = {
      _id: project._id,
      name: project.name,
      category: project.category,
      region: project.region,
      surface: project.surface,
      surfaceTotale: project.surfaceTotale,
      floors: project.floors,
      levelSurfaces: project.levelSurfaces,
      bedrooms: project.bedrooms,
      bathrooms: project.bathrooms,
      kitchens: project.kitchens,
      livingRooms: project.livingRooms,
      wcs: project.wcs,
      pools: project.pools,
      selectedScenario: project.selectedScenario,
      files: project.files?.map((f) => ({ name: f.name, type: f.type })) ?? [],
      aiAnalysis: project.aiAnalysis
        ? {
            confidence: project.aiAnalysis.confidence,
            estimatedDuration: project.aiAnalysis.estimatedDuration,
          }
        : undefined,
      costEstimate: project.costEstimate ?? undefined,
      providerRecommendations: project.providerRecommendations ?? undefined,
    };

    const results = generateRoadmap(input);
    const now = Date.now();

    const existing = await ctx.db
      .query("projectRoadmaps")
      .withIndex("by_user_project", (q) => q.eq("userId", user._id).eq("projectId", args.projectId))
      .first();

    let roadmapId;
    if (existing) {
      await ctx.db.patch(existing._id, { input, results, updatedAt: now });
      roadmapId = existing._id;
    } else {
      roadmapId = await ctx.db.insert("projectRoadmaps", {
        userId: user._id,
        projectId: args.projectId,
        input,
        results,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { roadmapId, results };
  },
});

export const deleteRoadmap = mutation({
  args: { roadmapId: v.id("projectRoadmaps") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Suivi de A à Z");
    const doc = await ctx.db.get(args.roadmapId);
    if (!doc) throw new Error("Feuille de route introuvable.");
    if (doc.userId !== user._id && user.role !== "admin") throw new Error("Accès refusé.");
    await ctx.db.delete(args.roadmapId);
    return { ok: true };
  },
});

// ─── Dérivation (recalcul des champs calculés après chaque mise à jour) ─────

function derive(stored: Roadmap, input: RoadmapProjectInput): Roadmap {
  // Trame du type de projet : une feuille de route vierge générée avec une
  // autre trame est remplacée avant tout calcul (progression préservée sinon).
  const r = ensureCurrentRoadmap(stored, input);
  const phases = r.phases.map((p) => {
    if (p.id === "phase_04") {
      const items = r.adminSteps.map((a) => ({
        id: a.id,
        label: a.title,
        detail: `${a.organisme} · ${a.delai} · ${fmtTnd(a.frais)}`,
        status: a.status,
        warning: true,
      }));
      return { ...p, items, progress: phaseProgress(items), status: phaseStatus(items) };
    }
    if (p.id === "phase_08") {
      const items = r.construction.map((c) => ({
        id: c.id,
        label: c.title,
        detail: `${c.phaseTitle ?? "Travaux"} · ${c.dureeJours} jours · ${fmtTnd(c.budgetEstime)}`,
        status: c.status,
      }));
      return { ...p, items, progress: phaseProgress(items), status: phaseStatus(items) };
    }
    return { ...p, progress: phaseProgress(p.items), status: phaseStatus(p.items) };
  });

  const budget = {
    ...r.budget,
    totalCost: r.budget.scenarios.find((s) => s.key === r.budget.selected)?.totalCost ?? r.budget.totalCost,
  };

  const progress = computeProgress(phases, r.planning, r.construction, r.adminSteps);
  const consumed = r.control.expenses.reduce((acc, e) => acc + e.amount, 0);
  const summary = {
    // Le démarrage estimé reste celui enregistré : les échéances ne glissent pas
    // à chaque modification (sinon « En retard » ne serait jamais détecté).
    ...buildSummary(input, budget, r.planning, progress, r.summary?.startDate),
    budgetConsumed: consumed,
    budgetGap: consumed - budget.totalCost,
  };
  if (consumed > budget.totalCost) {
    summary.alerts = [
      { severity: "critical" as const, message: `Dépenses consommées (${fmtTnd(consumed)}) supérieures au budget prévu (${fmtTnd(budget.totalCost)}).` },
      ...summary.alerts.filter((a) => a.severity !== "critical" || !a.message.startsWith("Dépenses consommées")),
    ];
  }

  const omissions = buildOmissions(input, r.adminSteps, r.construction);
  const nextSteps = buildNextSteps(phases, r.adminSteps, r.planning, omissions);

  // Diagnostic IA du chantier — recomputé à chaque mise à jour du suivi
  const control = {
    ...r.control,
    risk: buildSiteRiskAnalysis(budget, r.planning, r.construction, r.control, progress, {
      now: Date.now(),
      startDate: summary.startDate,
      plannedDurationDays: summary.plannedDurationDays,
    }),
  };

  // Phases d'exécution : avancement et budget recalculés depuis les étapes.
  const execution = r.execution
    ? buildExecution(
        playbookForCategory(input.category),
        executionContextFromProject(input),
        r.construction,
        r.planning,
      )
    : r.execution;

  return { ...r, phases, budget, progress, summary, omissions, nextSteps, control, execution };
}

function assertOwner(doc: { userId: string }, user: { _id: string; role?: string | null }) {
  if (doc.userId !== user._id && user.role !== "admin") throw new Error("Accès refusé.");
}

async function loadOwned(ctx: any, roadmapId: string, user: { _id: string; role?: string | null }) {
  const doc = await ctx.db.get(roadmapId);
  if (!doc) throw new Error("Feuille de route introuvable.");
  assertOwner(doc, user);
  return doc;
}

/**
 * Ajoute une entrée au journal des modifications (60 dernières), affiché dans
 * l'onglet « Contrôle » du suivi. Aucune donnée métier n'est modifiée ici.
 */
function withHistory(r: Roadmap, action: string, detail?: string): Roadmap {
  const entry = {
    id: `hist_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    at: Date.now(),
    action,
    ...(detail ? { detail } : {}),
  };
  return {
    ...r,
    control: {
      ...r.control,
      history: [entry, ...(r.control.history ?? [])].slice(0, 60),
    },
  };
}

// ─── Suivi des phases ────────────────────────────────────────────────────────

/** Coche / décoche un élément d'une phase (démarches, études, construction…). */
export const togglePhaseItem = mutation({
  args: { roadmapId: v.id("projectRoadmaps"), phaseId: v.string(), itemId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Suivi de A à Z");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const input = doc.input as RoadmapProjectInput;
    // Trame du type de projet : une feuille de route encore vierge est adaptée
    // avant toute modification (une progression existante est conservée).
    const r = ensureCurrentRoadmap(doc.results as Roadmap, input);

    const flip = (status: StepStatus): StepStatus => (status === "done" ? "todo" : "done");

    let next: Roadmap = { ...r, phases: [...r.phases], adminSteps: [...r.adminSteps], construction: [...r.construction] };

    if (args.phaseId === "phase_04") {
      const idx = next.adminSteps.findIndex((a) => a.id === args.itemId);
      if (idx >= 0) {
        next.adminSteps = [...next.adminSteps];
        next.adminSteps[idx] = { ...next.adminSteps[idx], status: flip(next.adminSteps[idx].status) };
      }
    } else if (args.phaseId === "phase_08") {
      const idx = next.construction.findIndex((c) => c.id === args.itemId);
      if (idx >= 0) {
        next.construction = [...next.construction];
        next.construction[idx] = { ...next.construction[idx], status: flip(next.construction[idx].status) };
        // Date réelle de fin : seule une étape cochée en porte une.
        const doneNow = next.construction[idx].status === "done";
        next.construction[idx] = {
          ...next.construction[idx],
          completedAt: doneNow ? Date.now() : undefined,
        };
        // Synchronise la tâche de planning correspondante (même id)
        const tIdx = next.planning.findIndex((t) => t.id === args.itemId);
        if (tIdx >= 0) {
          next.planning = [...next.planning];
          const t = next.planning[tIdx];
          next.planning[tIdx] = {
            ...t,
            status: doneNow ? "done" : "todo",
            progress: doneNow ? 100 : 0,
            completedAt: doneNow ? Date.now() : undefined,
          };
        }
      }
    } else {
      const phase = next.phases.find((p) => p.id === args.phaseId);
      if (phase) {
        const pIdx = next.phases.indexOf(phase);
        const items = phase.items.map((it) => (it.id === args.itemId ? { ...it, status: flip(it.status) } : it));
        next.phases = [...next.phases];
        next.phases[pIdx] = { ...phase, items };
      }
    }

    const changedItem =
      args.phaseId === "phase_04"
        ? next.adminSteps.find((a) => a.id === args.itemId)
        : args.phaseId === "phase_08"
          ? next.construction.find((c) => c.id === args.itemId)
          : next.phases.flatMap((p) => p.items).find((i) => i.id === args.itemId);
    const doneNow = changedItem?.status === "done";
    const label = changedItem && "title" in changedItem ? changedItem.title : changedItem?.label ?? args.itemId;

    const derived = derive(
      withHistory(next, doneNow ? "Étape terminée" : "Étape réouverte", label),
      input,
    );
    await ctx.db.patch(doc._id, { results: derived, updatedAt: Date.now() });
    return derived;
  },
});

/** Met à jour l'avancement d'une tâche du planning (et son statut). */
export const updatePlanningTask = mutation({
  args: { roadmapId: v.id("projectRoadmaps"), taskId: v.string(), progress: v.number(), status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Suivi de A à Z");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const input = doc.input as RoadmapProjectInput;
    // Trame du type de projet : une feuille de route encore vierge est adaptée
    // avant toute modification (une progression existante est conservée).
    const r = ensureCurrentRoadmap(doc.results as Roadmap, input);

    const tIdx = r.planning.findIndex((t) => t.id === args.taskId);
    if (tIdx < 0) throw new Error("Tâche introuvable.");
    const planning = [...r.planning];
    const completedAt = args.status === "done" ? Date.now() : undefined;
    planning[tIdx] = {
      ...planning[tIdx],
      progress: Math.max(0, Math.min(100, Math.round(args.progress))),
      status: args.status,
      completedAt,
    };

    // Synchronise l'étape de construction correspondante
    const construction = r.construction.map((c) =>
      c.id === args.taskId
        ? {
            ...c,
            status: args.status === "done" ? ("done" as StepStatus) : ("todo" as StepStatus),
            completedAt,
          }
        : c,
    );

    const derived = derive(
      withHistory(
        { ...r, planning, construction },
        args.status === "done" ? "Tâche terminée" : "Avancement mis à jour",
        `${planning[tIdx].title} — ${planning[tIdx].progress} %`,
      ),
      input,
    );
    await ctx.db.patch(doc._id, { results: derived, updatedAt: Date.now() });
    return derived;
  },
});

// ─── Budget (Phase 05) ───────────────────────────────────────────────────────

/** Change le scénario de budget actif (Économique / Standard / Premium). */
export const setBudgetScenario = mutation({
  args: { roadmapId: v.id("projectRoadmaps"), scenario: v.union(v.literal("economique"), v.literal("standard"), v.literal("premium")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Suivi de A à Z");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const input = doc.input as RoadmapProjectInput;
    // Trame du type de projet : une feuille de route encore vierge est adaptée
    // avant toute modification (une progression existante est conservée).
    const r = ensureCurrentRoadmap(doc.results as Roadmap, input);
    const scenarioLabel = r.budget.scenarios.find((s) => s.key === args.scenario)?.label ?? args.scenario;
    const derived = derive(
      withHistory(
        { ...r, budget: { ...r.budget, selected: args.scenario } },
        "Scénario budgétaire modifié",
        scenarioLabel,
      ),
      input,
    );
    await ctx.db.patch(doc._id, { results: derived, updatedAt: Date.now() });
    return derived;
  },
});

/** Ajuste en temps réel le pourcentage d'un poste budgétaire (les autres sont normalisés). */
export const updateBudgetAllocation = mutation({
  args: { roadmapId: v.id("projectRoadmaps"), rowKey: v.string(), pct: v.number() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Suivi de A à Z");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const input = doc.input as RoadmapProjectInput;
    // Trame du type de projet : une feuille de route encore vierge est adaptée
    // avant toute modification (une progression existante est conservée).
    const r = ensureCurrentRoadmap(doc.results as Roadmap, input);

    const scenarioIdx = r.budget.scenarios.findIndex((s) => s.key === r.budget.selected);
    const scenarios = [...r.budget.scenarios];
    const sc = scenarios[scenarioIdx];
    scenarios[scenarioIdx] = {
      ...sc,
      rows: rebalanceBudgetRows(sc.rows, args.rowKey, args.pct, sc.totalCost),
    };

    const derived = derive(
      withHistory(
        { ...r, budget: { ...r.budget, scenarios } },
        "Répartition budgétaire ajustée",
        `${args.rowKey} — ${args.pct} %`,
      ),
      input,
    );
    await ctx.db.patch(doc._id, { results: derived, updatedAt: Date.now() });
    return derived;
  },
});

// ─── Contrôle du chantier (Phase 09) ─────────────────────────────────────────

export const addControlExpense = mutation({
  args: { roadmapId: v.id("projectRoadmaps"), label: v.string(), amount: v.number(), category: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Suivi de A à Z");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const input = doc.input as RoadmapProjectInput;
    // Trame du type de projet : une feuille de route encore vierge est adaptée
    // avant toute modification (une progression existante est conservée).
    const r = ensureCurrentRoadmap(doc.results as Roadmap, input);
    const expense = { id: `exp_${Date.now()}_${Math.floor(Math.random() * 1000)}`, label: args.label, amount: args.amount, category: args.category, date: Date.now() };
    const derived = derive(
      withHistory(
        { ...r, control: { ...r.control, expenses: [...r.control.expenses, expense] } },
        "Dépense enregistrée",
        `${args.label} — ${fmtTnd(args.amount)}`,
      ),
      input,
    );
    await ctx.db.patch(doc._id, { results: derived, updatedAt: Date.now() });
    return derived;
  },
});

export const deleteControlExpense = mutation({
  args: { roadmapId: v.id("projectRoadmaps"), expenseId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Suivi de A à Z");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const input = doc.input as RoadmapProjectInput;
    // Trame du type de projet : une feuille de route encore vierge est adaptée
    // avant toute modification (une progression existante est conservée).
    const r = ensureCurrentRoadmap(doc.results as Roadmap, input);
    const removed = r.control.expenses.find((e) => e.id === args.expenseId);
    const derived = derive(
      withHistory(
        { ...r, control: { ...r.control, expenses: r.control.expenses.filter((e) => e.id !== args.expenseId) } },
        "Dépense supprimée",
        removed ? `${removed.label} — ${fmtTnd(removed.amount)}` : undefined,
      ),
      input,
    );
    await ctx.db.patch(doc._id, { results: derived, updatedAt: Date.now() });
    return derived;
  },
});

export const addControlIssue = mutation({
  args: { roadmapId: v.id("projectRoadmaps"), title: v.string(), severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Suivi de A à Z");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const input = doc.input as RoadmapProjectInput;
    // Trame du type de projet : une feuille de route encore vierge est adaptée
    // avant toute modification (une progression existante est conservée).
    const r = ensureCurrentRoadmap(doc.results as Roadmap, input);
    const issue = { id: `iss_${Date.now()}_${Math.floor(Math.random() * 1000)}`, title: args.title, severity: args.severity, description: args.description ?? "", status: "ouvert" as const, createdAt: Date.now() };
    const derived = derive(
      withHistory(
        { ...r, control: { ...r.control, issues: [issue, ...r.control.issues] } },
        "Problème signalé",
        args.title,
      ),
      input,
    );
    await ctx.db.patch(doc._id, { results: derived, updatedAt: Date.now() });
    return derived;
  },
});

export const resolveControlIssue = mutation({
  args: { roadmapId: v.id("projectRoadmaps"), issueId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Suivi de A à Z");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const input = doc.input as RoadmapProjectInput;
    // Trame du type de projet : une feuille de route encore vierge est adaptée
    // avant toute modification (une progression existante est conservée).
    const r = ensureCurrentRoadmap(doc.results as Roadmap, input);
    const issues = r.control.issues.map((i) => (i.id === args.issueId ? { ...i, status: i.status === "résolu" ? ("ouvert" as const) : ("résolu" as const) } : i));
    const issue = issues.find((i) => i.id === args.issueId);
    const derived = derive(
      withHistory(
        { ...r, control: { ...r.control, issues } },
        issue?.status === "résolu" ? "Problème résolu" : "Problème réouvert",
        issue?.title,
      ),
      input,
    );
    await ctx.db.patch(doc._id, { results: derived, updatedAt: Date.now() });
    return derived;
  },
});

export const addControlObservation = mutation({
  args: { roadmapId: v.id("projectRoadmaps"), text: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Suivi de A à Z");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const input = doc.input as RoadmapProjectInput;
    // Trame du type de projet : une feuille de route encore vierge est adaptée
    // avant toute modification (une progression existante est conservée).
    const r = ensureCurrentRoadmap(doc.results as Roadmap, input);
    const obs = { id: `obs_${Date.now()}_${Math.floor(Math.random() * 1000)}`, text: args.text, createdAt: Date.now() };
    const derived = derive(
      withHistory(
        { ...r, control: { ...r.control, observations: [obs, ...r.control.observations] } },
        "Observation ajoutée",
        args.text.slice(0, 80),
      ),
      input,
    );
    await ctx.db.patch(doc._id, { results: derived, updatedAt: Date.now() });
    return derived;
  },
});

export const addControlPhoto = mutation({
  args: {
    roadmapId: v.id("projectRoadmaps"),
    storageId: v.optional(v.id("_storage")),
    url: v.optional(v.string()),
    caption: v.string(),
    stage: v.optional(v.union(v.literal("avant"), v.literal("pendant"), v.literal("apres"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Suivi de A à Z");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const input = doc.input as RoadmapProjectInput;
    // Trame du type de projet : une feuille de route encore vierge est adaptée
    // avant toute modification (une progression existante est conservée).
    const r = ensureCurrentRoadmap(doc.results as Roadmap, input);
    const photo = {
      id: `ph_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      storageId: args.storageId,
      url: args.url,
      caption: args.caption,
      addedAt: Date.now(),
      stage: args.stage,
    };
    const stageLabel =
      args.stage === "avant" ? "avant travaux" : args.stage === "apres" ? "après travaux" : "pendant les travaux";
    const derived = derive(
      withHistory(
        { ...r, control: { ...r.control, photos: [...r.control.photos, photo] } },
        "Photo ajoutée",
        `${args.caption} — ${stageLabel}`,
      ),
      input,
    );
    await ctx.db.patch(doc._id, { results: derived, updatedAt: Date.now() });
    return derived;
  },
});

export const deleteControlPhoto = mutation({
  args: { roadmapId: v.id("projectRoadmaps"), photoId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Suivi de A à Z");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const input = doc.input as RoadmapProjectInput;
    // Trame du type de projet : une feuille de route encore vierge est adaptée
    // avant toute modification (une progression existante est conservée).
    const r = ensureCurrentRoadmap(doc.results as Roadmap, input);
    const derived = derive(
      withHistory(
        { ...r, control: { ...r.control, photos: r.control.photos.filter((p) => p.id !== args.photoId) } },
        "Photo supprimée",
      ),
      input,
    );
    await ctx.db.patch(doc._id, { results: derived, updatedAt: Date.now() });
    return derived;
  },
});

// ─── Documents ───────────────────────────────────────────────────────────────

/** Marque un document comme généré (l'export se fait côté client). */
export const generateDocument = mutation({
  args: { roadmapId: v.id("projectRoadmaps"), documentId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Suivi de A à Z");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const r = doc.results as Roadmap;
    const documents = r.documents.map((d) => (d.id === args.documentId ? { ...d, generatedAt: Date.now() } : d));
    await ctx.db.patch(doc._id, { results: { ...r, documents }, updatedAt: Date.now() });
    return { ok: true };
  },
});
