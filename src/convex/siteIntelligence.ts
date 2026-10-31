import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { analyzeSiteRisk, budgetSummary } from "../lib/siteTracking";
import {
  AI_DISCLAIMER,
  AI_RETENTION_DAYS,
  anomalyKey,
  buildTimeline,
  comparePlanning,
  confidenceLabel,
  detectAnomalies,
  phaseProgressRows,
  progressSummary,
  type AiSeverity,
  type AiTask,
  type AnomalyDraft,
} from "../lib/siteIntelligence";
import {
  accessFor,
  loadSite,
  logAction,
  requireSiteOwner,
  requireSitePermission,
  type SiteContext,
} from "./siteTracking";

// ============================================================================
// BatiBuild AI SITE INTELLIGENCE — backend Convex
// ----------------------------------------------------------------------------
// • S'appuie sur `siteProjects` / `siteTasks` / `siteExpenses` / `siteMaterials`
//   / `siteInspections` : AUCUNE duplication des données du chantier.
// • Les images vivent dans le stockage Convex (`_storage`), jamais en base64.
// • L'IA ne valide JAMAIS un avancement : elle produit une ESTIMATION. Seul un
//   humain habilité valide, et cette validation est explicite.
// • Sans fournisseur configuré, aucune fausse analyse : le mode démonstration
//   est distinct, marqué `mode: "demo"`, confiance nulle et avertissement.
// ============================================================================

const DAY = 86_400_000;
const MAX_IMAGES_PER_SESSION = 12;
const MAX_IMAGES_PER_ANALYSIS = 6;
const DAILY_ANALYSIS_LIMIT = 30;

const severityValidator = v.union(
  v.literal("faible"),
  v.literal("moyen"),
  v.literal("eleve"),
  v.literal("critique"),
);

const anomalyTypeValidator = v.union(
  v.literal("absence_evolution"),
  v.literal("retard_phase"),
  v.literal("incoherence_planning"),
  v.literal("non_conformite_potentielle"),
  v.literal("modification_non_prevue"),
  v.literal("ecart_quantites"),
  v.literal("risque_budgetaire"),
  v.literal("suivi_insuffisant"),
);

const anomalyStatusValidator = v.union(
  v.literal("nouveau"),
  v.literal("en_cours"),
  v.literal("resolu"),
  v.literal("ecarte"),
);

const reportKindValidator = v.union(
  v.literal("journalier"),
  v.literal("hebdomadaire"),
  v.literal("mensuel"),
  v.literal("progression"),
  v.literal("anomalies"),
  v.literal("planning_realisation"),
);

function isAdmin(user: Doc<"users"> | null): boolean {
  return !!user && user.role === "admin";
}

/** Le fournisseur IA est facultatif : sans clé, le module le dit clairement. */
function providerInfo() {
  const key = process.env.OPENAI_API_KEY;
  return {
    available: !!key,
    provider: key ? "openai" : "none",
    model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini",
    demoAllowed: process.env.ALLOW_AI_DEMO !== "false",
    maxImagesPerAnalysis: MAX_IMAGES_PER_ANALYSIS,
    dailyLimit: DAILY_ANALYSIS_LIMIT,
    retentionDays: AI_RETENTION_DAYS,
  };
}

/** Lecture : propriétaire, admin, ou intervenant avec « ai » ou « quality ». */
async function requireAiView(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users"> | null,
  siteId: Id<"siteProjects">,
): Promise<SiteContext> {
  const context = await loadSite(ctx, user, siteId);
  if (
    context.isOwner ||
    isAdmin(user) ||
    context.permissions.includes("ai") ||
    context.permissions.includes("quality")
  ) {
    if (context.isOwner && !isAdmin(user)) {
      const access = await accessFor(ctx, user);
      if (!access.allowed) throw new Error("SITE_ACCESS_REQUIRED:Cotisation requise.");
    }
    return context;
  }
  throw new Error("PERMISSION_DENIED:Le module d'intelligence de chantier ne vous est pas ouvert.");
}

/** Écriture terrain : propriétaire, admin ou permission « ai ». */
async function requireAiWrite(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users"> | null,
  siteId: Id<"siteProjects">,
): Promise<SiteContext> {
  const context = await loadSite(ctx, user, siteId);
  if (context.isOwner || isAdmin(user) || context.permissions.includes("ai")) {
    if (context.isOwner && !isAdmin(user)) {
      const access = await accessFor(ctx, user);
      if (!access.allowed) throw new Error("SITE_ACCESS_REQUIRED:Cotisation requise.");
    }
    return context;
  }
  throw new Error("PERMISSION_DENIED:Vous ne pouvez pas alimenter le suivi intelligent de ce chantier.");
}

/** Validation : propriétaire, admin, ou intervenant habilité au contrôle qualité. */
async function requireAiValidator(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users"> | null,
  siteId: Id<"siteProjects">,
): Promise<SiteContext> {
  const context = await loadSite(ctx, user, siteId);
  if (context.isOwner || isAdmin(user) || context.permissions.includes("quality")) {
    if (context.isOwner && !isAdmin(user)) {
      const access = await accessFor(ctx, user);
      if (!access.allowed) throw new Error("SITE_ACCESS_REQUIRED:Cotisation requise.");
    }
    return context;
  }
  throw new Error("PERMISSION_DENIED:Seul le responsable ou un intervenant qualité peut valider.");
}

async function tasksOf(ctx: QueryCtx | MutationCtx, siteId: Id<"siteProjects">) {
  return await ctx.db
    .query("siteTasks")
    .withIndex("by_site_order", (q) => q.eq("siteId", siteId))
    .collect();
}

function toAiTasks(tasks: Doc<"siteTasks">[]): AiTask[] {
  return tasks.map((task) => ({
    phaseKey: task.phaseKey,
    name: task.name,
    weight: task.weight,
    progress: task.progress,
    startDate: task.startDate,
    endDate: task.endDate,
  }));
}

// ── Diagnostic d'anomalies (déterministe, exécuté côté serveur) ─────────────

async function computeAnomalyDrafts(
  ctx: QueryCtx | MutationCtx,
  site: Doc<"siteProjects">,
): Promise<AnomalyDraft[]> {
  const [tasks, records, expenses, materials, inspections, sessions, analyses] = await Promise.all([
    tasksOf(ctx, site._id),
    ctx.db.query("siteProgressRecords").withIndex("by_site", (q) => q.eq("siteId", site._id)).collect(),
    ctx.db.query("siteExpenses").withIndex("by_site", (q) => q.eq("siteId", site._id)).collect(),
    ctx.db.query("siteMaterials").withIndex("by_site", (q) => q.eq("siteId", site._id)).collect(),
    ctx.db.query("siteInspections").withIndex("by_site", (q) => q.eq("siteId", site._id)).collect(),
    ctx.db.query("siteMonitoringSessions").withIndex("by_site", (q) => q.eq("siteId", site._id)).collect(),
    ctx.db.query("siteAiAnalyses").withIndex("by_site", (q) => q.eq("siteId", site._id)).collect(),
  ]);

  const now = Date.now();
  const aiTasks = toAiTasks(tasks);
  const rows = phaseProgressRows(aiTasks, records, now);
  const risk = analyzeSiteRisk({
    today: now,
    startDate: site.startDate,
    expectedEndDate: site.expectedEndDate,
    tasks: aiTasks.map((task) => ({ ...task, status: "in_progress" })),
    budgetInitial: site.budgetInitial,
    budgetRevised: site.budgetRevised,
    expenses: expenses.map((expense) => ({
      amount: expense.amount,
      category: expense.category,
      nature: expense.nature,
      date: expense.date,
    })),
  });

  return detectAnomalies({
    now,
    startDate: site.startDate,
    expectedEndDate: site.expectedEndDate,
    budgetInitial: site.budgetInitial,
    budgetRevised: site.budgetRevised,
    tasks: aiTasks,
    rows,
    expenses: expenses.map((expense) => ({ amount: expense.amount, date: expense.date })),
    materials: materials.map((material) => ({
      name: material.name,
      plannedQty: material.plannedQty,
      orderedQty: material.orderedQty,
      deliveredQty: material.deliveredQty,
    })),
    inspections: inspections.map((inspection) => ({
      phaseKey: inspection.phaseKey,
      status: inspection.status,
    })),
    sessions: sessions.map((session) => ({ date: session.date, imageCount: session.imageCount })),
    analyses: analyses
      .filter((analysis) => analysis.mode !== "unavailable")
      .map((analysis) => ({
        phaseKey: analysis.phaseKey,
        visualAnomalies: analysis.visualAnomalies.map((item) => ({
          label: item.label,
          severity: item.severity as AiSeverity,
        })),
        changes: analysis.mode === "demo" ? [] : analysis.changes,
        createdAt: analysis.createdAt,
      })),
    projectedFinalCost: risk.budget.projectedFinalCost,
  });
}

/** Persiste les anomalies nouvelles en évitant les doublons déjà traités. */
async function syncAnomalies(
  ctx: MutationCtx,
  siteId: Id<"siteProjects">,
  userId: Id<"users">,
  drafts: AnomalyDraft[],
  analysisId?: Id<"siteAiAnalyses">,
): Promise<number> {
  const existing = await ctx.db
    .query("siteAnomalies")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();
  const known = new Set(existing.map((row) => row.dedupeKey));
  const now = Date.now();
  let inserted = 0;

  for (const draft of drafts) {
    const key = anomalyKey(draft);
    if (known.has(key)) continue;
    known.add(key);
    await ctx.db.insert("siteAnomalies", {
      siteId,
      type: draft.type,
      severity: draft.severity,
      title: draft.title,
      description: draft.description,
      phaseKey: draft.phaseKey ?? undefined,
      evidence: draft.evidence,
      recommendation: draft.recommendation,
      status: "nouveau",
      source: draft.source,
      requiresHumanCheck: draft.requiresHumanCheck,
      dedupeKey: key,
      analysisId,
      detectedAt: now,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
    inserted++;
  }
  return inserted;
}

// ── Lecture de l'espace de travail IA ─────────────────────────────────────

export const getAiWorkspace = query({
  args: { siteId: v.id("siteProjects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const context = await requireAiView(ctx, user, args.siteId);
    const { site, isOwner, permissions } = context;
    const can = (permission: string) => isOwner || isAdmin(user) || permissions.includes(permission as any);

    const [tasks, records, sessions, analyses, anomalies, reports, expenses, materials] =
      await Promise.all([
        tasksOf(ctx, site._id),
        ctx.db
          .query("siteProgressRecords")
          .withIndex("by_site", (q) => q.eq("siteId", site._id))
          .order("desc")
          .collect(),
        ctx.db
          .query("siteMonitoringSessions")
          .withIndex("by_site_date", (q) => q.eq("siteId", site._id))
          .order("desc")
          .collect(),
        ctx.db
          .query("siteAiAnalyses")
          .withIndex("by_site_created", (q) => q.eq("siteId", site._id))
          .order("desc")
          .take(40),
        ctx.db
          .query("siteAnomalies")
          .withIndex("by_site_detected", (q) => q.eq("siteId", site._id))
          .order("desc")
          .collect(),
        ctx.db
          .query("siteMonitoringReports")
          .withIndex("by_site_created", (q) => q.eq("siteId", site._id))
          .order("desc")
          .take(20),
        ctx.db.query("siteExpenses").withIndex("by_site", (q) => q.eq("siteId", site._id)).collect(),
        ctx.db.query("siteMaterials").withIndex("by_site", (q) => q.eq("siteId", site._id)).collect(),
      ]);

    // Photos : une URL signée par image, résolue à la lecture (jamais stockée).
    const imageRows = await Promise.all(
      sessions.map(async (session) => {
        const images = await ctx.db
          .query("siteMonitoringImages")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect();
        return {
          session,
          images: await Promise.all(
            images.map(async (image) => ({
              ...image,
              url: await ctx.storage.getUrl(image.storageId),
            })),
          ),
        };
      }),
    );

    const now = Date.now();
    const aiTasks = toAiTasks(tasks);
    const rows = phaseProgressRows(aiTasks, records, now);
    const summary = progressSummary(rows);
    const comparison = comparePlanning(rows, aiTasks, now);
    const timeline = buildTimeline(records as any, site.startDate, now);

    const showBudget = can("budget");
    const budget = showBudget
      ? budgetSummary({
          budgetInitial: site.budgetInitial,
          budgetRevised: site.budgetRevised,
          expenses: expenses.map((expense) => ({
            amount: expense.amount,
            category: expense.category,
            nature: expense.nature,
          })),
          materials: materials.map((material) => ({
            plannedQty: material.plannedQty,
            deliveredQty: material.deliveredQty,
            unitPrice: material.unitPrice,
          })),
        })
      : null;

    const risk = analyzeSiteRisk({
      today: now,
      startDate: site.startDate,
      expectedEndDate: site.expectedEndDate,
      tasks: aiTasks,
      budgetInitial: site.budgetInitial,
      budgetRevised: site.budgetRevised,
      expenses: showBudget
        ? expenses.map((expense) => ({
            amount: expense.amount,
            category: expense.category,
            nature: expense.nature,
            date: expense.date,
          }))
        : [],
      materials: showBudget
        ? materials.map((material) => ({
            name: material.name,
            unit: material.unit,
            plannedQty: material.plannedQty,
            orderedQty: material.orderedQty,
            deliveredQty: material.deliveredQty,
            consumedQty: material.consumedQty,
            unitPrice: material.unitPrice,
          }))
        : [],
    });

    const openAnomalies = anomalies.filter(
      (anomaly) => anomaly.status === "nouveau" || anomaly.status === "en_cours",
    );
    const anomalyBySeverity = (["critique", "eleve", "moyen", "faible"] as const).map(
      (severity) => ({
        severity,
        count: openAnomalies.filter((anomaly) => anomaly.severity === severity).length,
      }),
    );

    const usage = analyses.reduce(
      (acc, analysis) => ({
        tokens: acc.tokens + (analysis.tokenInput ?? 0) + (analysis.tokenOutput ?? 0),
        costUsd: acc.costUsd + (analysis.costUsd ?? 0),
      }),
      { tokens: 0, costUsd: 0 },
    );
    const monthAnalyses = analyses.filter((analysis) => analysis.createdAt > now - 30 * DAY);

    return {
      site: {
        _id: site._id,
        name: site.name,
        category: site.category,
        region: site.region ?? null,
        surface: site.surface ?? null,
        startDate: site.startDate,
        expectedEndDate: site.expectedEndDate,
        status: site.status,
        budgetInitial: showBudget ? site.budgetInitial : null,
      },
      isOwner,
      permissions,
      tasks,
      rows,
      comparison,
      summary,
      timeline,
      metrics: {
        progress: risk,
        budget,
        lateCount: comparison.filter((row) => row.status === "retard").length,
        anomalyBySeverity,
        openAnomalies: openAnomalies.length,
        monitoringSessions: sessions.length,
        lastSessionAt: sessions[0]?.date ?? null,
        usage: {
          analyses30d: monthAnalyses.length,
          tokens: usage.tokens,
          costUsd: Math.round(usage.costUsd * 10_000) / 10_000,
        },
        confidence: analyses[0] ? confidenceLabel(analyses[0].confidence) : null,
      },
      sessions: imageRows.map(({ session, images }) => ({
        ...session,
        images: images.filter((image) => image.url),
      })),
      analyses,
      progressRecords: records.slice(0, 200),
      anomalies,
      reports,
      provider: providerInfo(),
    };
  },
});

// ── Contexte envoyé au fournisseur IA (aucune donnée hors du chantier) ─────

export const getAnalysisContext = query({
  args: {
    siteId: v.id("siteProjects"),
    imageIds: v.array(v.id("siteMonitoringImages")),
    phaseKey: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    await requireAiWrite(ctx, user, args.siteId);
    if (args.imageIds.length === 0) throw new Error("Sélectionnez au moins une photo.");
    if (args.imageIds.length > MAX_IMAGES_PER_ANALYSIS) {
      throw new Error(`Une analyse est limitée à ${MAX_IMAGES_PER_ANALYSIS} photos.`);
    }

    const site = await ctx.db.get(args.siteId);
    if (!site) throw new Error("Chantier introuvable");
    const tasks = await tasksOf(ctx, site._id);
    const phaseKeys = tasks.map((task) => task.phaseKey);
    if (!phaseKeys.includes(args.phaseKey)) {
      throw new Error("Phase inconnue sur ce chantier.");
    }

    const images = [];
    for (const imageId of args.imageIds) {
      const image = await ctx.db.get(imageId);
      if (!image || image.siteId !== args.siteId) {
        throw new Error("Photo introuvable sur ce chantier.");
      }
      const url = await ctx.storage.getUrl(image.storageId);
      if (!url) continue;
      images.push({
        _id: image._id,
        url,
        capturedAt: image.capturedAt,
        phaseKey: image.phaseKey ?? null,
        notes: image.notes ?? null,
      });
    }
    if (images.length === 0) throw new Error("Les photos sélectionnées sont introuvables.");

    const recent = await ctx.db
      .query("siteAiAnalyses")
      .withIndex("by_site_created", (q) => q.eq("siteId", args.siteId))
      .order("desc")
      .take(60);
    const mine24h = recent.filter(
      (analysis) => analysis.createdBy === user._id && analysis.createdAt > Date.now() - DAY,
    ).length;

    const task = tasks.find((item) => item.phaseKey === args.phaseKey);
    const latest = recent.find((analysis) => analysis.phaseKey === args.phaseKey);

    return {
      site: {
        name: site.name,
        category: site.category,
        surface: site.surface ?? null,
        region: site.region ?? null,
      },
      phase: {
        key: args.phaseKey,
        name: task?.name ?? args.phaseKey,
        declaredProgress: task?.progress ?? 0,
        plannedStart: task?.startDate ?? site.startDate,
        plannedEnd: task?.endDate ?? site.expectedEndDate,
      },
      previous: latest
        ? {
            createdAt: latest.createdAt,
            elements: latest.elements,
            worksObserved: latest.worksObserved,
            summary: latest.summary,
          }
        : null,
      images,
      usedToday: mine24h,
      dailyLimit: DAILY_ANALYSIS_LIMIT,
      phaseKeys,
      provider: providerInfo(),
    };
  },
});

export const generateMonitoringUploadUrl = mutation({
  args: { siteId: v.id("siteProjects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireAiWrite(ctx, user, args.siteId);
    return await ctx.storage.generateUploadUrl();
  },
});

// ── Sessions & photos ──────────────────────────────────────────────────────

export const createMonitoringSession = mutation({
  args: {
    siteId: v.id("siteProjects"),
    title: v.string(),
    date: v.number(),
    phaseKey: v.optional(v.string()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    images: v.array(
      v.object({
        storageId: v.id("_storage"),
        fileName: v.optional(v.string()),
        contentType: v.optional(v.string()),
        sizeBytes: v.optional(v.number()),
        capturedAt: v.optional(v.number()),
        phaseKey: v.optional(v.string()),
        notes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const context = await requireAiWrite(ctx, user, args.siteId);
    if (args.images.length === 0) throw new Error("Ajoutez au moins une photo.");
    if (args.images.length > MAX_IMAGES_PER_SESSION) {
      throw new Error(`Une session est limitée à ${MAX_IMAGES_PER_SESSION} photos.`);
    }
    const title = args.title.trim();
    if (title.length < 2) throw new Error("Donnez un titre à la session.");

    const now = Date.now();
    const sessionId = await ctx.db.insert("siteMonitoringSessions", {
      siteId: args.siteId,
      title,
      date: args.date,
      phaseKey: args.phaseKey,
      location: args.location?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      imageCount: args.images.length,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    for (const image of args.images) {
      await ctx.db.insert("siteMonitoringImages", {
        siteId: args.siteId,
        sessionId,
        storageId: image.storageId,
        fileName: image.fileName,
        contentType: image.contentType,
        sizeBytes: image.sizeBytes,
        capturedAt: image.capturedAt ?? args.date,
        phaseKey: image.phaseKey ?? args.phaseKey,
        notes: image.notes?.trim() || undefined,
        uploadedBy: user._id,
        purgeAfter: now + AI_RETENTION_DAYS * DAY,
        createdAt: now,
      });
    }

    void context;
    await logAction(ctx, args.siteId, user._id, "monitoring_session_created", title);
    await syncAnomalies(ctx, args.siteId, user._id, await computeAnomalyDrafts(ctx, context.site));
    return sessionId;
  },
});

export const deleteMonitoringSession = mutation({
  args: { sessionId: v.id("siteMonitoringSessions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session introuvable");
    const context = await loadSite(ctx, user, session.siteId);
    if (!context.isOwner && !isAdmin(user) && session.createdBy !== user._id) {
      throw new Error("PERMISSION_DENIED:Vous ne pouvez pas supprimer cette session.");
    }
    const images = await ctx.db
      .query("siteMonitoringImages")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();
    for (const image of images) {
      await ctx.storage.delete(image.storageId).catch(() => undefined);
      await ctx.db.delete(image._id);
    }
    await ctx.db.delete(session._id);
    await logAction(ctx, session.siteId, user._id, "monitoring_session_deleted", session.title);
    return { success: true };
  },
});

/** Politique de conservation : suppression explicite des photos expirées. */
export const purgeExpiredMonitoringImages = mutation({
  args: { siteId: v.id("siteProjects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireSiteOwner(ctx, user, args.siteId);
    const now = Date.now();
    const images = await ctx.db
      .query("siteMonitoringImages")
      .withIndex("by_purge", (q) => q.lte("purgeAfter", now))
      .collect();
    let deleted = 0;
    for (const image of images) {
      if (image.siteId !== args.siteId) continue;
      await ctx.storage.delete(image.storageId).catch(() => undefined);
      await ctx.db.delete(image._id);
      deleted++;
    }
    if (deleted > 0 && user) {
      await logAction(ctx, args.siteId, user._id, "monitoring_images_purged", `${deleted} photo(s)`);
    }
    return { deleted };
  },
});

// ── Persistance d'une analyse (appelée par l'action IA) ────────────────────

export const recordAnalysis = mutation({
  args: {
    siteId: v.id("siteProjects"),
    sessionId: v.optional(v.id("siteMonitoringSessions")),
    imageIds: v.array(v.id("siteMonitoringImages")),
    mode: v.union(v.literal("ai"), v.literal("demo"), v.literal("engine")),
    provider: v.string(),
    model: v.optional(v.string()),
    phaseKey: v.string(),
    elements: v.array(v.string()),
    worksObserved: v.array(v.string()),
    worksRemaining: v.array(v.string()),
    changes: v.array(v.string()),
    visualAnomalies: v.array(
      v.object({ label: v.string(), severity: v.string(), evidence: v.string() }),
    ),
    progressEstimate: v.number(),
    confidence: v.number(),
    summary: v.string(),
    tokenInput: v.optional(v.number()),
    tokenOutput: v.optional(v.number()),
    costUsd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const context = await requireAiWrite(ctx, user, args.siteId);
    const site = context.site;

    const task = await ctx.db
      .query("siteTasks")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect()
      .then((rows) => rows.find((row) => row.phaseKey === args.phaseKey));
    if (!task) throw new Error("Phase inconnue sur ce chantier.");

    for (const imageId of args.imageIds) {
      const image = await ctx.db.get(imageId);
      if (!image || image.siteId !== args.siteId) throw new Error("Photo hors chantier.");
    }

    const now = Date.now();
    const analysisId = await ctx.db.insert("siteAiAnalyses", {
      siteId: args.siteId,
      sessionId: args.sessionId,
      imageIds: args.imageIds,
      mode: args.mode,
      provider: args.provider,
      model: args.model,
      phaseKey: args.phaseKey,
      elements: args.elements.slice(0, 20),
      worksObserved: args.worksObserved.slice(0, 20),
      worksRemaining: args.worksRemaining.slice(0, 20),
      changes: args.changes.slice(0, 12),
      visualAnomalies: args.visualAnomalies.slice(0, 8).map((item) => ({
        label: item.label.slice(0, 160),
        severity: item.severity,
        evidence: item.evidence.slice(0, 240),
      })),
      progressEstimate: Math.max(0, Math.min(100, args.progressEstimate)),
      confidence: Math.max(0, Math.min(1, args.confidence)),
      summary: args.summary.slice(0, 1200),
      isEstimate: true,
      disclaimer: AI_DISCLAIMER,
      tokenInput: args.tokenInput,
      tokenOutput: args.tokenOutput,
      costUsd: args.costUsd,
      createdBy: user._id,
      createdAt: now,
    });

    for (const imageId of args.imageIds) {
      await ctx.db.patch(imageId, { analysisId });
    }

    // L'IA PROPOSE un pointage estimé, en attente de validation humaine : elle
    // ne touche jamais `siteTasks.progress`.
    await ctx.db.insert("siteProgressRecords", {
      siteId: args.siteId,
      phaseKey: args.phaseKey,
      source: "ai",
      percent: Math.max(0, Math.min(100, args.progressEstimate)),
      status: "pending",
      note: args.mode === "demo" ? "Estimation de démonstration (aucune image analysée)" : "Estimation IA à confirmer",
      taskId: task._id,
      analysisId,
      recordedBy: user._id,
      date: now,
      createdAt: now,
    });

    await logAction(
      ctx,
      args.siteId,
      user._id,
      "ai_analysis_recorded",
      `${args.phaseKey} — ${args.mode}`,
    );
    const drafts = await computeAnomalyDrafts(ctx, site);
    await syncAnomalies(ctx, args.siteId, user._id, drafts, analysisId);
    return analysisId;
  },
});

// ── Avancement : déclaration puis validation humaine ──────────────────────

export const recordProgress = mutation({
  args: {
    siteId: v.id("siteProjects"),
    phaseKey: v.string(),
    percent: v.number(),
    note: v.optional(v.string()),
    date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const context = await requireAiWrite(ctx, user, args.siteId);
    if (!Number.isFinite(args.percent) || args.percent < 0 || args.percent > 100) {
      throw new Error("Le pourcentage doit être compris entre 0 et 100.");
    }
    const task = await ctx.db
      .query("siteTasks")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect()
      .then((rows) => rows.find((row) => row.phaseKey === args.phaseKey));
    if (!task) throw new Error("Phase inconnue sur ce chantier.");

    const now = Date.now();
    const id = await ctx.db.insert("siteProgressRecords", {
      siteId: args.siteId,
      phaseKey: args.phaseKey,
      source: "declared",
      percent: args.percent,
      previousPercent: task.progress,
      status: "pending",
      note: args.note?.trim() || undefined,
      taskId: task._id,
      recordedBy: user._id,
      date: args.date ?? now,
      createdAt: now,
    });
    await logAction(ctx, args.siteId, user._id, "progress_declared", `${args.phaseKey} → ${args.percent} %`);
    await syncAnomalies(ctx, args.siteId, user._id, await computeAnomalyDrafts(ctx, context.site));
    return id;
  },
});

export const validateProgress = mutation({
  args: {
    recordId: v.id("siteProgressRecords"),
    percent: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const record = await ctx.db.get(args.recordId);
    if (!record) throw new Error("Pointage introuvable");
    if (record.status === "validated") return { success: true, alreadyValidated: true };
    await requireAiValidator(ctx, user, record.siteId);

    const value =
      args.percent != null && Number.isFinite(args.percent) ? args.percent : record.percent;
    if (value < 0 || value > 100) throw new Error("Le pourcentage doit être compris entre 0 et 100.");

    const now = Date.now();
    await ctx.db.patch(record._id, {
      status: "validated",
      percent: value,
      validatedBy: user._id,
      validatedAt: now,
    });

    // La tâche porte l'avancement VALIDÉ : l'IA et les déclarations passent
    // toujours par cette validation explicite.
    const task =
      (record.taskId ? await ctx.db.get(record.taskId) : null) ??
      (await ctx.db
        .query("siteTasks")
        .withIndex("by_site", (q) => q.eq("siteId", record.siteId))
        .collect()
        .then((rows) => rows.find((row) => row.phaseKey === record.phaseKey) ?? null));
    if (task) {
      await ctx.db.patch(task._id, {
        progress: value,
        status: value >= 100 ? "done" : value > 0 ? "in_progress" : "todo",
        updatedAt: now,
      });
    }

    await ctx.db.insert("siteProgressRecords", {
      siteId: record.siteId,
      phaseKey: record.phaseKey,
      source: "validated",
      percent: value,
      previousPercent: record.percent,
      status: "validated",
      note: args.note?.trim() || undefined,
      taskId: task?._id,
      recordedBy: user._id,
      date: now,
      createdAt: now,
      validatedBy: user._id,
      validatedAt: now,
    });

    await logAction(
      ctx,
      record.siteId,
      user._id,
      "progress_validated",
      `${record.phaseKey} → ${value} %`,
    );
    const site = await ctx.db.get(record.siteId);
    if (site) {
      await syncAnomalies(ctx, record.siteId, user._id, await computeAnomalyDrafts(ctx, site));
    }
    return { success: true };
  },
});

export const rejectProgress = mutation({
  args: { recordId: v.id("siteProgressRecords"), reason: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const record = await ctx.db.get(args.recordId);
    if (!record) throw new Error("Pointage introuvable");
    if (record.status !== "pending") throw new Error("Ce pointage a déjà été traité.");
    await requireAiValidator(ctx, user, record.siteId);
    await ctx.db.patch(record._id, {
      status: "rejected",
      rejectionReason: args.reason.trim().slice(0, 400) || "Non justifié",
      validatedBy: user._id,
      validatedAt: Date.now(),
    });
    await logAction(ctx, record.siteId, user._id, "progress_rejected", record.phaseKey);
    return { success: true };
  },
});

// ── Anomalies ──────────────────────────────────────────────────────────────

export const scanAnomalies = mutation({
  args: { siteId: v.id("siteProjects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const context = await requireAiView(ctx, user, args.siteId);
    const drafts = await computeAnomalyDrafts(ctx, context.site);
    const inserted = await syncAnomalies(ctx, args.siteId, user._id, drafts);
    return { inserted, detected: drafts.length };
  },
});

export const setAnomalyStatus = mutation({
  args: {
    anomalyId: v.id("siteAnomalies"),
    status: anomalyStatusValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const anomaly = await ctx.db.get(args.anomalyId);
    if (!anomaly) throw new Error("Anomalie introuvable");
    // L'entrepreneur peut signaler « en cours » ; clôturer ou écarter une
    // anomalie exige le contrôle qualité (ou le responsable).
    if (args.status === "resolu" || args.status === "ecarte") {
      await requireAiValidator(ctx, user, anomaly.siteId);
    } else {
      await requireAiWrite(ctx, user, anomaly.siteId);
    }
    const now = Date.now();
    const closing = args.status === "resolu" || args.status === "ecarte";
    await ctx.db.patch(anomaly._id, {
      status: args.status,
      resolutionNote: args.note?.trim() || anomaly.resolutionNote,
      resolvedBy: closing ? user._id : undefined,
      resolvedAt: closing ? now : undefined,
      updatedAt: now,
    });
    await logAction(ctx, anomaly.siteId, user._id, "anomaly_status", `${anomaly.title} → ${args.status}`);
    return { success: true };
  },
});

export const createAnomaly = mutation({
  args: {
    siteId: v.id("siteProjects"),
    type: anomalyTypeValidator,
    severity: severityValidator,
    title: v.string(),
    description: v.string(),
    phaseKey: v.optional(v.string()),
    recommendation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    await requireAiWrite(ctx, user, args.siteId);
    if (args.title.trim().length < 3) throw new Error("Intitulé trop court.");
    const now = Date.now();
    return await ctx.db.insert("siteAnomalies", {
      siteId: args.siteId,
      type: args.type,
      severity: args.severity,
      title: args.title.trim().slice(0, 180),
      description: args.description.trim().slice(0, 1200),
      phaseKey: args.phaseKey,
      evidence: ["Anomalie signalée par un utilisateur"],
      recommendation: args.recommendation?.trim() || "Vérifier sur site et documenter la décision.",
      status: "nouveau",
      source: "human",
      requiresHumanCheck: true,
      dedupeKey: anomalyKey({
        type: args.type,
        phaseKey: args.phaseKey,
        title: `${args.title.trim()}-${now}`,
      }),
      detectedAt: now,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ── Rapports intelligents ─────────────────────────────────────────────────

export const saveMonitoringReport = mutation({
  args: {
    siteId: v.id("siteProjects"),
    kind: reportKindValidator,
    periodStart: v.number(),
    periodEnd: v.number(),
    snapshot: v.any(),
    imageIds: v.array(v.id("siteMonitoringImages")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    await requireSitePermission(ctx, user, args.siteId, "reports");
    const now = Date.now();
    const id = await ctx.db.insert("siteMonitoringReports", {
      siteId: args.siteId,
      kind: args.kind,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      snapshot: args.snapshot,
      imageIds: args.imageIds.slice(0, 12),
      generatedBy: user._id,
      createdAt: now,
    });
    await logAction(ctx, args.siteId, user._id, "monitoring_report_saved", args.kind);
    return id;
  },
});

/** Coût et volume d'analyses sur un chantier (transparence budgétaire). */
export const getAiUsage = query({
  args: { siteId: v.id("siteProjects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireAiView(ctx, user, args.siteId);
    const analyses = await ctx.db
      .query("siteAiAnalyses")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
    return {
      total: analyses.length,
      byMode: {
        ai: analyses.filter((a) => a.mode === "ai").length,
        demo: analyses.filter((a) => a.mode === "demo").length,
        unavailable: analyses.filter((a) => a.mode === "unavailable").length,
      },
      tokens: analyses.reduce((sum, a) => sum + (a.tokenInput ?? 0) + (a.tokenOutput ?? 0), 0),
      costUsd:
        Math.round(analyses.reduce((sum, a) => sum + (a.costUsd ?? 0), 0) * 10_000) / 10_000,
      provider: providerInfo(),
    };
  },
});

// Types utiles au frontend et aux tests.
export type { AiSeverity };
