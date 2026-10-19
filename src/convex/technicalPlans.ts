// ============================================================================
// PLANS TECHNIQUES (PLOMBERIE / ÉLECTRICITÉ) — API Convex
// ----------------------------------------------------------------------------
// · Un document courant par projet + utilisateur + type + variante + niveau.
// · Chaque sauvegarde incrémente la version ET archive un instantané complet.
// · Toutes les lectures/écritures vérifient la propriété du projet : les
//   données d'un projet ne peuvent jamais être lues ou écrasées par un autre.
// · Les positions modifiées et les quantités viennent du moteur partagé
//   (`technicalPlanEngine`) ; le serveur ne recalcule aucun prix.
// ============================================================================

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { requireClientProAccess } from "./access";

const kindValidator = v.union(v.literal("plomberie"), v.literal("electricite"));

async function requireOwnedProject(ctx: QueryCtx | MutationCtx, projectId: Id<"projects">) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Utilisateur non authentifié");
  const project = await ctx.db.get(projectId);
  if (!project) throw new Error("Projet introuvable");
  if (project.userId !== user._id && user.role !== "admin") {
    throw new Error("Accès refusé à ce projet");
  }
  return { user, project };
}

/** Garde-fous de taille : empêche l'envoi d'un document arbitrairement gros. */
function validatePayload(overrides: unknown, quantities: unknown) {
  if (typeof overrides !== "object" || overrides === null || Array.isArray(overrides)) {
    throw new Error("Positions du plan invalides");
  }
  const keys = Object.keys(overrides as Record<string, unknown>);
  if (keys.length > 600) throw new Error("Trop de modifications pour un même plan");
  for (const key of keys) {
    const value = (overrides as Record<string, any>)[key];
    if (
      !value ||
      typeof value.x !== "number" ||
      typeof value.y !== "number" ||
      !Number.isFinite(value.x) ||
      !Number.isFinite(value.y)
    ) {
      throw new Error("Coordonnées de modification invalides");
    }
  }
  if (!Array.isArray(quantities) || quantities.length > 400) {
    throw new Error("Quantitatif du plan invalide");
  }
  // Plafond de taille : un plan légitime reste très en dessous de cette limite.
  if (JSON.stringify({ overrides, quantities }).length > 400_000) {
    throw new Error("Document de plan trop volumineux");
  }
}

// ── Lecture ─────────────────────────────────────────────────────────────────

/** Plans techniques enregistrés du projet (documents courants). */
export const getProjectTechnicalPlans = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const project = await ctx.db.get(projectId);
    if (!project) return [];
    if (project.userId !== user._id && user.role !== "admin") return [];

    const rows = await ctx.db
      .query("projectTechnicalPlans")
      .withIndex("by_project_user", (q) => q.eq("projectId", projectId).eq("userId", project.userId))
      .collect();

    return rows.map((row) => ({
      _id: row._id,
      kind: row.kind,
      variantId: row.variantId,
      level: row.level,
      version: row.version,
      overrides: row.overrides,
      quantities: row.quantities,
      summary: row.summary,
      note: row.note ?? null,
      updatedAt: row.updatedAt,
    }));
  },
});

/** Historique des versions pour un type de plan (20 plus récentes). */
export const getTechnicalPlanVersions = query({
  args: { projectId: v.id("projects"), kind: kindValidator },
  handler: async (ctx, { projectId, kind }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const project = await ctx.db.get(projectId);
    if (!project) return [];
    if (project.userId !== user._id && user.role !== "admin") return [];

    const rows = await ctx.db
      .query("projectTechnicalPlanVersions")
      .withIndex("by_project_user_kind", (q) =>
        q.eq("projectId", projectId).eq("userId", project.userId).eq("kind", kind),
      )
      .collect();

    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20)
      .map((row) => ({
        _id: row._id,
        variantId: row.variantId,
        level: row.level,
        version: row.version,
        note: row.note ?? null,
        createdAt: row.createdAt,
      }));
  },
});

// ── Écriture ────────────────────────────────────────────────────────────────

/**
 * Enregistre le plan courant et archive une version.
 * La version est TOUJOURS calculée côté serveur (jamais fournie par le client).
 */
export const saveTechnicalPlan = mutation({
  args: {
    projectId: v.id("projects"),
    kind: kindValidator,
    variantId: v.string(),
    level: v.number(),
    overrides: v.any(),
    quantities: v.any(),
    summary: v.any(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireOwnedProject(ctx, args.projectId);
    await requireClientProAccess(ctx, user, "plans techniques");
    if (!args.variantId.trim()) throw new Error("Variante de plan manquante");
    if (!Number.isInteger(args.level) || args.level < 0 || args.level > 20) {
      throw new Error("Niveau de plan invalide");
    }
    validatePayload(args.overrides, args.quantities);

    const existing = await ctx.db
      .query("projectTechnicalPlans")
      .withIndex("by_project_user_key", (q) =>
        q
          .eq("projectId", args.projectId)
          .eq("userId", user._id)
          .eq("kind", args.kind)
          .eq("variantId", args.variantId)
          .eq("level", args.level),
      )
      .first();

    const now = Date.now();
    const version = (existing?.version ?? 0) + 1;
    const note = args.note?.slice(0, 300);

    if (existing) {
      await ctx.db.patch(existing._id, {
        version,
        overrides: args.overrides,
        quantities: args.quantities,
        summary: args.summary,
        note,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("projectTechnicalPlans", {
        projectId: args.projectId,
        userId: user._id,
        kind: args.kind,
        variantId: args.variantId,
        level: args.level,
        version,
        overrides: args.overrides,
        quantities: args.quantities,
        summary: args.summary,
        note,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("projectTechnicalPlanVersions", {
      projectId: args.projectId,
      userId: user._id,
      kind: args.kind,
      variantId: args.variantId,
      level: args.level,
      version,
      overrides: args.overrides,
      quantities: args.quantities,
      summary: args.summary,
      note,
      createdAt: now,
    });

    return { version, updatedAt: now };
  },
});
