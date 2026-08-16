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
  buildSiteRiskAnalysis,
  phaseProgress,
  phaseStatus,
  rebalanceBudgetRows,
  fmtTnd,
  type Roadmap,
  type RoadmapProjectInput,
  type StepStatus,
} from "./roadmapEngine";
import { getCurrentUser } from "./users";

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
    return { roadmapId: doc._id, input: doc.input as RoadmapProjectInput, results: doc.results as Roadmap };
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
      bedrooms: project.bedrooms,
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
    const doc = await ctx.db.get(args.roadmapId);
    if (!doc) throw new Error("Feuille de route introuvable.");
    if (doc.userId !== user._id && user.role !== "admin") throw new Error("Accès refusé.");
    await ctx.db.delete(args.roadmapId);
    return { ok: true };
  },
});

// ─── Dérivation (recalcul des champs calculés après chaque mise à jour) ─────

function derive(r: Roadmap, input: RoadmapProjectInput): Roadmap {
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
        detail: `${c.dureeJours} jours · ${fmtTnd(c.budgetEstime)}`,
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
    ...buildSummary(input, budget, r.planning, progress),
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

  return { ...r, phases, budget, progress, summary, omissions, nextSteps, control };
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

// ─── Suivi des phases ────────────────────────────────────────────────────────

/** Coche / décoche un élément d'une phase (démarches, études, construction…). */
export const togglePhaseItem = mutation({
  args: { roadmapId: v.id("projectRoadmaps"), phaseId: v.string(), itemId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const r = doc.results as Roadmap;
    const input = doc.input as RoadmapProjectInput;

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
      }
      // Synchronise la tâche de planning correspondante (même id)
      const tIdx = next.planning.findIndex((t) => t.id === args.itemId);
      if (tIdx >= 0) {
        next.planning = [...next.planning];
        const t = next.planning[tIdx];
        const done = next.construction[idx].status === "done";
        next.planning[tIdx] = { ...t, status: done ? "done" : "todo", progress: done ? 100 : 0 };
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

    const derived = derive(next, input);
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
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const r = doc.results as Roadmap;
    const input = doc.input as RoadmapProjectInput;

    const tIdx = r.planning.findIndex((t) => t.id === args.taskId);
    if (tIdx < 0) throw new Error("Tâche introuvable.");
    const planning = [...r.planning];
    planning[tIdx] = { ...planning[tIdx], progress: Math.max(0, Math.min(100, Math.round(args.progress))), status: args.status };

    // Synchronise l'étape de construction correspondante
    const construction = r.construction.map((c) =>
      c.id === args.taskId ? { ...c, status: args.status === "done" ? ("done" as StepStatus) : ("todo" as StepStatus) } : c,
    );

    const derived = derive({ ...r, planning, construction }, input);
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
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const r = doc.results as Roadmap;
    const input = doc.input as RoadmapProjectInput;
    const derived = derive({ ...r, budget: { ...r.budget, selected: args.scenario } }, input);
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
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const r = doc.results as Roadmap;
    const input = doc.input as RoadmapProjectInput;

    const scenarioIdx = r.budget.scenarios.findIndex((s) => s.key === r.budget.selected);
    const scenarios = [...r.budget.scenarios];
    const sc = scenarios[scenarioIdx];
    scenarios[scenarioIdx] = {
      ...sc,
      rows: rebalanceBudgetRows(sc.rows, args.rowKey, args.pct, sc.totalCost),
    };

    const derived = derive({ ...r, budget: { ...r.budget, scenarios } }, input);
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
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const r = doc.results as Roadmap;
    const input = doc.input as RoadmapProjectInput;
    const expense = { id: `exp_${Date.now()}_${Math.floor(Math.random() * 1000)}`, label: args.label, amount: args.amount, category: args.category, date: Date.now() };
    const derived = derive({ ...r, control: { ...r.control, expenses: [...r.control.expenses, expense] } }, input);
    await ctx.db.patch(doc._id, { results: derived, updatedAt: Date.now() });
    return derived;
  },
});

export const deleteControlExpense = mutation({
  args: { roadmapId: v.id("projectRoadmaps"), expenseId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const r = doc.results as Roadmap;
    const input = doc.input as RoadmapProjectInput;
    const derived = derive({ ...r, control: { ...r.control, expenses: r.control.expenses.filter((e) => e.id !== args.expenseId) } }, input);
    await ctx.db.patch(doc._id, { results: derived, updatedAt: Date.now() });
    return derived;
  },
});

export const addControlIssue = mutation({
  args: { roadmapId: v.id("projectRoadmaps"), title: v.string(), severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const r = doc.results as Roadmap;
    const input = doc.input as RoadmapProjectInput;
    const issue = { id: `iss_${Date.now()}_${Math.floor(Math.random() * 1000)}`, title: args.title, severity: args.severity, description: args.description ?? "", status: "ouvert" as const, createdAt: Date.now() };
    const derived = derive({ ...r, control: { ...r.control, issues: [issue, ...r.control.issues] } }, input);
    await ctx.db.patch(doc._id, { results: derived, updatedAt: Date.now() });
    return derived;
  },
});

export const resolveControlIssue = mutation({
  args: { roadmapId: v.id("projectRoadmaps"), issueId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const r = doc.results as Roadmap;
    const input = doc.input as RoadmapProjectInput;
    const issues = r.control.issues.map((i) => (i.id === args.issueId ? { ...i, status: i.status === "résolu" ? ("ouvert" as const) : ("résolu" as const) } : i));
    const derived = derive({ ...r, control: { ...r.control, issues } }, input);
    await ctx.db.patch(doc._id, { results: derived, updatedAt: Date.now() });
    return derived;
  },
});

export const addControlObservation = mutation({
  args: { roadmapId: v.id("projectRoadmaps"), text: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const r = doc.results as Roadmap;
    const input = doc.input as RoadmapProjectInput;
    const obs = { id: `obs_${Date.now()}_${Math.floor(Math.random() * 1000)}`, text: args.text, createdAt: Date.now() };
    const derived = derive({ ...r, control: { ...r.control, observations: [obs, ...r.control.observations] } }, input);
    await ctx.db.patch(doc._id, { results: derived, updatedAt: Date.now() });
    return derived;
  },
});

export const addControlPhoto = mutation({
  args: { roadmapId: v.id("projectRoadmaps"), storageId: v.optional(v.id("_storage")), url: v.optional(v.string()), caption: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const r = doc.results as Roadmap;
    const input = doc.input as RoadmapProjectInput;
    const photo = { id: `ph_${Date.now()}_${Math.floor(Math.random() * 1000)}`, storageId: args.storageId, url: args.url, caption: args.caption, addedAt: Date.now() };
    const derived = derive({ ...r, control: { ...r.control, photos: [...r.control.photos, photo] } }, input);
    await ctx.db.patch(doc._id, { results: derived, updatedAt: Date.now() });
    return derived;
  },
});

export const deleteControlPhoto = mutation({
  args: { roadmapId: v.id("projectRoadmaps"), photoId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Connectez-vous.");
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const r = doc.results as Roadmap;
    const input = doc.input as RoadmapProjectInput;
    const derived = derive({ ...r, control: { ...r.control, photos: r.control.photos.filter((p) => p.id !== args.photoId) } }, input);
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
    const doc = await loadOwned(ctx, args.roadmapId, user);
    const r = doc.results as Roadmap;
    const documents = r.documents.map((d) => (d.id === args.documentId ? { ...d, generatedAt: Date.now() } : d));
    await ctx.db.patch(doc._id, { results: { ...r, documents }, updatedAt: Date.now() });
    return { ok: true };
  },
});
