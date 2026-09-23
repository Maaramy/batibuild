// ═══════════════════════════════════════════════════════════════════════════
// COPILOTE AI DU DASHBOARD — données serveur (extension indépendante)
// ───────────────────────────────────────────────────────────────────────────
// Nouvelles tables uniquement (aiCopilotMessages, aiCopilotMemory) : aucune
// table existante n'est modifiée. Sécurité : chaque lecture/écriture vérifie
// l'accès au projet (propriétaire ou admin) — les données d'un autre
// utilisateur ou d'un autre projet ne sont JAMAIS exposées.
//
// Le contexte projet retourné est COMPACT (résumés calculés côté serveur) :
// jamais les documents bruts (§ performance).
// ═══════════════════════════════════════════════════════════════════════════

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import type {
  CopilotProjectContext,
  DqeLot,
  CostLine,
  MaterialCategoryState,
  ScenarioLine,
} from "./aiCopilotEngine";

// ── Helpers ─────────────────────────────────────────────────────────────────

function num(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function arr(x: unknown): any[] {
  return Array.isArray(x) ? x : [];
}

/**
 * Accès projet vérifié. Retourne null si le projet est introuvable OU non
 * accessible (aucune donnée n'est alors exposée). Les écritures utilisent
 * `requireOwnedProjectOrThrow` qui lève une erreur explicite.
 */
async function loadAccessibleProject(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  projectId: Id<"projects">,
) {
  const project = await ctx.db.get(projectId);
  if (!project) return null;
  const user = await ctx.db.get(userId);
  if (project.userId !== userId && user?.role !== "admin") return null;
  return project;
}

async function requireOwnedProjectOrThrow(
  ctx: MutationCtx,
  userId: Id<"users">,
  projectId: Id<"projects">,
) {
  const project = await loadAccessibleProject(ctx, userId, projectId);
  if (!project) throw new Error("Projet introuvable ou accès refusé");
  return project;
}

// ── Contexte projet compact (le Copilote n'invente jamais une donnée) ───────

export const getProjectContext = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<CopilotProjectContext | null> => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const project = await loadAccessibleProject(ctx, user._id, args.projectId);
    if (!project) return null;

    const p = project as any;
    // Devise TOUJOURS issue des données du projet (jamais figée) — repli TND
    // uniquement si le projet n'en porte aucune.
    const cur: string =
      typeof p.costEstimate?.currency === "string" && p.costEstimate.currency
        ? p.costEstimate.currency
        : typeof p.currency === "string" && p.currency
          ? p.currency
          : "TND";

    // ── Estimation (moteur existant, jamais modifié) ──
    const ce = p.costEstimate ?? null;
    const cost = ce
      ? {
          totalCost: num(ce.totalCost) ?? 0,
          costPerSquareMeter: num(ce.costPerSquareMeter),
          contingencyPercentage: num(ce.contingencyPercentage) ?? 0,
          breakdown: arr(ce.breakdown).map((b: any): CostLine => ({
            label: String(b?.label ?? b?.category ?? "Lot"),
            estimatedCost: num(b?.estimatedCost) ?? 0,
            percentage: num(b?.percentage) ?? 0,
            items: arr(b?.items).length,
          })),
          scenarios: arr(ce.budgetScenarios).map((s: any): ScenarioLine => ({
            label: String(s?.label ?? s?.name ?? "Scénario"),
            totalCost: num(s?.totalCost) ?? 0,
            costPerSquareMeter: num(s?.costPerSquareMeter),
          })),
        }
      : null;

    // ── DQE (vue dérivée — le DQE original n'est pas modifié) ──
    let dqe: CopilotProjectContext["dqe"] = null;
    let dqeArticles: CopilotProjectContext["dqeArticles"] = null;
    const dqeLots = arr(p.dqe?.lots ?? p.dqe);
    if (dqeLots.length > 0) {
      let articles = 0;
      let withoutPrice = 0;
      let withoutQuantity = 0;
      let topItem: string | null = null;
      let topItemCost: number | null = null;
      const lots: DqeLot[] = dqeLots.map((lot: any) => {
        const lines = arr(lot?.lines ?? lot?.items);
        articles += lines.length;
        for (const l of lines) {
          const qte = num(l?.quantite) ?? num(l?.quantity) ?? null;
          const pu = num(l?.prixUnitaire) ?? num(l?.unitPrice) ?? num(l?.prix) ?? null;
          if (pu == null) withoutPrice += 1;
          if (qte == null) withoutQuantity += 1;
          const cost =
            num(l?.soustotal) ??
            num(l?.total) ??
            num(l?.subtotal) ??
            (qte != null && pu != null ? qte * pu : null);
          if (cost != null && (topItemCost == null || cost > topItemCost)) {
            topItemCost = cost;
            topItem = String(l?.designation ?? l?.name ?? l?.label ?? l?.description ?? "Article");
          }
        }
        const subtotal =
          num(lot?.soustotal) ??
          num(lot?.subtotal) ??
          lines.reduce((s: number, l: any) => {
            const direct =
              num(l?.soustotal) ?? num(l?.total) ?? num(l?.subtotal) ?? null;
            const qte = num(l?.quantite) ?? num(l?.quantity) ?? null;
            const pu = num(l?.prixUnitaire) ?? num(l?.unitPrice) ?? num(l?.prix) ?? null;
            return s + (direct ?? (qte != null && pu != null ? qte * pu : 0));
          }, 0);
        return {
          name: String(lot?.name ?? lot?.label ?? lot?.id ?? "Lot"),
          subtotal,
          lines: lines.length,
        };
      });
      dqe = {
        grandTotal: lots.reduce((s, l) => s + l.subtotal, 0),
        lots,
      };
      dqeArticles = { total: articles, withoutPrice, withoutQuantity, topItem, topItemCost };
    }

    // ── Matériaux (dernière analyse Matériaux AI liée au projet) ──
    const lastAnalysis = await ctx.db
      .query("aiMaterialAnalyses")
      .withIndex("by_user_project", (q) =>
        q.eq("userId", user._id).eq("projectId", args.projectId),
      )
      .order("desc")
      .first();

    let materials: CopilotProjectContext["materials"] = null;
    let materialIssues: CopilotProjectContext["materialIssues"] = null;
    if (lastAnalysis) {
      const results = lastAnalysis.results ?? {};
      const solCost = (s: any): number | null =>
        num(s?.materialCost) ??
        num(s?.estimatedCost) ??
        num(s?.totalCost) ??
        (num(s?.material?.materialCost) != null
          ? (num(s?.material?.materialCost) ?? 0) + (num(s?.material?.poseCost) ?? 0)
          : null);
      const categories: MaterialCategoryState[] = arr(results.categories).map((c: any) => {
        const solutions = arr(c?.solutions);
        const chosen =
          solutions.find((s: any) => s?.profile === "equilibre") ?? solutions[0] ?? null;
        const priced = solutions
          .map((s: any) => ({ s, cost: solCost(s) }))
          .filter((x: any) => x.cost != null)
          .sort((a: any, b: any) => a.cost - b.cost);
        const cheapest = priced[0] ?? null;
        const chosenCost = chosen ? solCost(chosen) : null;
        const saving =
          cheapest && cheapest.cost != null && chosenCost != null && cheapest.s !== chosen
            ? chosenCost - cheapest.cost
            : null;
        return {
          label: String(c?.label ?? c?.categoryId ?? "Catégorie"),
          chosenLabel: String(chosen?.material?.name ?? chosen?.profileLabel ?? "choix recommandé"),
          cheapestLabel:
            saving != null && saving > 0
              ? String(cheapest.s?.material?.name ?? "alternative")
              : null,
          cheapestSaving: saving != null && saving > 0 ? saving : null,
        };
      });
      materials = {
        analyzedAt: num(lastAnalysis.createdAt) ?? 0,
        totalCost: num(results.cost?.total),
        missingData: arr(results.missingData).map(String),
        categories,
      };

      // Signalements structurés : prix / fournisseur / disponibilité.
      let withoutPrice = 0;
      let withoutSupplier = 0;
      let unavailable = 0;
      for (const c of arr(results.categories)) {
        const solutions = arr(c?.solutions);
        const chosen =
          solutions.find((s: any) => s?.profile === "equilibre") ?? solutions[0] ?? null;
        if (!chosen) {
          withoutPrice += 1;
          continue;
        }
        if (solCost(chosen) == null) withoutPrice += 1;
        if (arr(chosen?.suppliers).length === 0) withoutSupplier += 1;
        const avail = String(chosen?.material?.availability ?? "").toLowerCase();
        if (avail.includes("rupture") || avail.includes("indisponible")) unavailable += 1;
      }
      materialIssues = {
        selected: categories.length,
        withoutPrice,
        withoutSupplier,
        unavailable,
      };
    }

    // ── Roadmap d'exécution ──
    const roadmapDoc = await ctx.db
      .query("projectRoadmaps")
      .withIndex("by_user_project", (q) =>
        q.eq("userId", user._id).eq("projectId", args.projectId),
      )
      .first();
    const roadmapSteps = arr(roadmapDoc?.results?.construction ?? roadmapDoc?.results?.steps);
    const roadmap = roadmapDoc
      ? {
          steps: roadmapSteps.map((s: any) => ({
            id: String(s?.id ?? ""),
            title: String(s?.title ?? s?.label ?? "Étape"),
            dureeJours: num(s?.dureeJours) ?? 1,
            status: String(s?.status ?? "todo"),
          })),
        }
      : null;

    // ── Suivi budgétaire réel (dépenses enregistrées vs budget prévu) ──
    const roadmapResults: any = roadmapDoc?.results ?? null;
    const roadmapSummary: any = roadmapResults?.summary ?? null;
    const budget =
      roadmapSummary != null
        ? {
            planned:
              num(roadmapSummary.plannedBudget) ?? num(roadmapResults?.budget?.totalCost) ?? 0,
            consumed: num(roadmapSummary.budgetConsumed) ?? 0,
            gap: num(roadmapSummary.budgetGap) ?? 0,
          }
        : roadmapResults?.budget != null
          ? { planned: num(roadmapResults.budget.totalCost) ?? 0, consumed: 0, gap: 0 }
          : null;

    // ── Planning d'exécution (compteurs, prochaine tâche, retard) ──
    const planningArr = arr(roadmapResults?.planning);
    const nextTaskId: any = roadmapSummary?.nextTaskId ?? null;
    const nextTaskDoc =
      (nextTaskId != null ? planningArr.find((t: any) => t?.id === nextTaskId) : null) ??
      planningArr.find((t: any) => String(t?.status ?? "todo") !== "done") ??
      null;
    const tasksDone = planningArr.filter((t: any) => String(t?.status) === "done").length;
    const plannedEnd = num(roadmapSummary?.endDate);
    const planning =
      planningArr.length > 0
        ? {
            total: planningArr.length,
            done: tasksDone,
            inProgress: planningArr.filter((t: any) => String(t?.status) === "in_progress").length,
            late: plannedEnd != null && Date.now() > plannedEnd && tasksDone < planningArr.length,
            nextTask: nextTaskDoc
              ? String(nextTaskDoc.title ?? nextTaskDoc.label ?? "Tâche")
              : null,
          }
        : null;

    // ── Éléments structurés du plan (détectés dans l'analyse, jamais devinés) ──
    const features = arr(p.aiAnalysis?.features);
    const featureQty = (names: string[]): number | null => {
      const f = features.find((x: any) =>
        names.some((n) => String(x?.type ?? "").toLowerCase().includes(n)),
      );
      if (!f || f.detected === false) return null;
      return num(f.quantity);
    };
    const planDetail = {
      doors: featureQty(["porte", "door"]),
      windows: featureQty(["fenetre", "fenêtre", "window", "baie"]),
    };

    // ── Professionnels : demandes, rendez-vous, recommandations ──
    const myQuotes = await ctx.db
      .query("quoteRequests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const myAppointments = await ctx.db
      .query("expertAppointments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const quotes = myQuotes.filter((q: any) => q.projectId === args.projectId);
    const appointments = myAppointments.filter((a: any) => a.projectId === args.projectId);
    const recommended = await ctx.db
      .query("projectRecommendedProviders")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // ── Investissements liés ──
    const myInvestments = await ctx.db
      .query("investmentAnalyses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const investments = myInvestments.filter((i: any) => i.projectId === args.projectId).length;

    // ── Mémoire du Copilote (liée à CE projet uniquement) ──
    const memoryDocs = await ctx.db
      .query("aiCopilotMemory")
      .withIndex("by_user_project", (q) =>
        q.eq("userId", user._id).eq("projectId", args.projectId),
      )
      .order("desc")
      .take(10);

    return {
      projectId: args.projectId,
      name: String(p.name ?? ""),
      category: String(p.category ?? ""),
      region: p.region != null ? String(p.region) : null,
      city: p.city != null ? String(p.city) : null,
      surface: num(p.surface),
      floors: num(p.floors),
      rooms: {
        bedrooms: num(p.bedrooms) ?? 0,
        bathrooms: num(p.bathrooms) ?? 0,
        kitchens: num(p.kitchens) ?? 0,
        livingRooms: num(p.livingRooms) ?? 0,
      },
      status: String(p.status ?? ""),
      currency: cur,
      cost,
      dqe,
      materials,
      plans: {
        has2D: p.plan2D != null || p.plan2d != null,
        has3D: p.plan3D != null || p.plan3d != null,
        saved: p.plan2D != null || p.plan2d != null || p.plan3D != null || p.plan3d != null,
      },
      roadmap,
      professionals: {
        quotes: quotes.length,
        appointments: appointments.length,
        pendingAppointments: appointments.filter((a: any) => a.status === "pending").length,
        recommendedProviders: recommended.length,
      },
      investments,
      anomalies: arr(p.aiAnalysis?.anomalies).map((a: any) => ({
        severity: String(a?.severity ?? "info"),
        description: String(a?.description ?? a?.message ?? ""),
      })),
      estimatedDuration:
        p.aiAnalysis?.estimatedDuration != null ? String(p.aiAnalysis.estimatedDuration) : null,
      optimizationTips: arr(p.optimizationTips).map(String),
      technicalRecommendations: arr(p.technicalRecommendations).map(String),
      memory: memoryDocs.map((m) => ({ note: m.note, kind: m.kind })),
      surfaceTotale: num(p.surfaceTotale),
      budget,
      planning,
      documents: arr(p.files).length,
      dqeArticles,
      materialIssues,
      planDetail,
    };
  },
});

// ── Historique de conversation STRICTEMENT par projet ───────────────────────

export const listMessages = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const project = await loadAccessibleProject(ctx, user._id, args.projectId);
    if (!project) return [];
    const msgs = await ctx.db
      .query("aiCopilotMessages")
      .withIndex("by_user_project", (q) =>
        q.eq("userId", user._id).eq("projectId", args.projectId),
      )
      .order("desc")
      .take(60);
    return msgs.reverse();
  },
});

export const addMessage = mutation({
  args: {
    projectId: v.id("projects"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    narrative: v.optional(v.string()),
    facts: v.optional(v.array(v.object({ label: v.string(), value: v.string(), kind: v.string() }))),
    actions: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          kind: v.string(),
          target: v.optional(v.string()),
          note: v.optional(v.string()),
        }),
      ),
    ),
    missing: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non autorisé");
    await requireOwnedProjectOrThrow(ctx, user._id, args.projectId);
    return await ctx.db.insert("aiCopilotMessages", {
      userId: user._id,
      projectId: args.projectId,
      role: args.role,
      content: args.content.slice(0, 8000),
      narrative: args.narrative?.slice(0, 4000),
      facts: args.facts?.slice(0, 20),
      actions: args.actions?.slice(0, 8),
      missing: args.missing?.slice(0, 12),
      createdAt: Date.now(),
    });
  },
});

export const clearHistory = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non autorisé");
    await requireOwnedProjectOrThrow(ctx, user._id, args.projectId);
    const msgs = await ctx.db
      .query("aiCopilotMessages")
      .withIndex("by_user_project", (q) =>
        q.eq("userId", user._id).eq("projectId", args.projectId),
      )
      .collect();
    for (const m of msgs) await ctx.db.delete(m._id);
    return { deleted: msgs.length };
  },
});

// ── Mémoire du Copilote (préférences/décisions liées au projet) ─────────────

export const listMemory = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const project = await loadAccessibleProject(ctx, user._id, args.projectId);
    if (!project) return [];
    const docs = await ctx.db
      .query("aiCopilotMemory")
      .withIndex("by_user_project", (q) =>
        q.eq("userId", user._id).eq("projectId", args.projectId),
      )
      .order("desc")
      .take(20);
    return docs;
  },
});

export const addMemory = mutation({
  args: {
    projectId: v.id("projects"),
    note: v.string(),
    kind: v.union(v.literal("preference"), v.literal("decision")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non autorisé");
    await requireOwnedProjectOrThrow(ctx, user._id, args.projectId);
    return await ctx.db.insert("aiCopilotMemory", {
      userId: user._id,
      projectId: args.projectId,
      note: args.note.slice(0, 500),
      kind: args.kind,
      createdAt: Date.now(),
    });
  },
});

export const removeMemory = mutation({
  args: { memoryId: v.id("aiCopilotMemory") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non autorisé");
    const doc = await ctx.db.get(args.memoryId);
    if (!doc || doc.userId !== user._id) throw new Error("Accès refusé");
    await ctx.db.delete(args.memoryId);
    return { deleted: true };
  },
});
