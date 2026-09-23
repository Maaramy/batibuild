// ============================================================================
// PERSONNALISATION DU « QUANTITATIF DÉTAILLÉ » — backend Convex
// ----------------------------------------------------------------------------
// Les scénarios Économique / Standard / Premium d'origine ne sont jamais
// modifiés. Les modifications d'articles (prix, niveau de finition, article de
// remplacement) sont enregistrées dans une ligne dédiée par projet et par
// utilisateur, puis superposées côté affichage pour former le scénario
// « Personnalisé ».
// ============================================================================

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import {
  isEditableLot,
  isNoopCustomization,
  quantitatifLineKey,
} from "./quantitatifCustomLogic";
import { buildLivePriceIndex, getCompatibleArticles } from "./quantitatifCatalog";

const scenarioValidator = v.union(
  v.literal("economique"),
  v.literal("standard"),
  v.literal("premium"),
);

/** Projet accessible par l'utilisateur courant (propriétaire ou admin). */
async function requireOwnedProject(ctx: any, projectId: any) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Utilisateur non authentifié");
  const project = await ctx.db.get(projectId);
  if (!project) throw new Error("Projet introuvable");
  if (project.userId !== user._id && user.role !== "admin") {
    throw new Error("Accès refusé à ce projet");
  }
  return { user, project };
}

function findCustomization(ctx: any, projectId: any, userId: any) {
  return ctx.db
    .query("quantitatifCustomizations")
    .withIndex("by_project_user", (q: any) =>
      q.eq("projectId", projectId).eq("userId", userId),
    )
    .first();
}

// ────────────────────────────────────────────────────────────────────────────
// Lecture
// ────────────────────────────────────────────────────────────────────────────

/** Personnalisations enregistrées pour un projet (utilisateur courant). */
export const getCustomization = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;
    if (project.userId !== user._id && user.role !== "admin") return null;

    const doc = await findCustomization(ctx, args.projectId, project.userId);
    if (!doc) return null;
    return {
      baseScenario: doc.baseScenario,
      modifications: doc.modifications,
      modifiedCount: doc.modifications.length,
      updatedAt: doc.updatedAt,
    };
  },
});

/**
 * Articles compatibles avec un article du quantitatif (même usage, unité
 * compatible privilégiée). Réservé aux 4 catégories autorisées.
 */
export const getCompatibleArticlesForLine = query({
  args: {
    projectId: v.id("projects"),
    lotId: v.string(),
    designation: v.string(),
    unit: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { reference: null, articles: [] };
    const project = await ctx.db.get(args.projectId);
    if (!project) return { reference: null, articles: [] };
    if (project.userId !== user._id && user.role !== "admin") {
      return { reference: null, articles: [] };
    }
    if (!isEditableLot(args.lotId)) return { reference: null, articles: [] };

    // Prix administrables (table materialPrices) : le référentiel propose les
    // prix effectivement utilisés par le moteur de calcul.
    const rows = await ctx.db.query("materialPrices").collect();
    const live = buildLivePriceIndex(
      rows.map((r: any) => ({ name: r.name, unit: r.unit, unitPrice: r.unitPrice })),
    );
    return getCompatibleArticles(args.designation, args.unit, live);
  },
});

// ────────────────────────────────────────────────────────────────────────────
// Écriture
// ────────────────────────────────────────────────────────────────────────────

/**
 * Enregistre (ou met à jour) la personnalisation d'un article. Une sauvegarde
 * sans effet (identique au scénario de référence) supprime la personnalisation.
 */
export const saveItemCustomization = mutation({
  args: {
    projectId: v.id("projects"),
    lotId: v.string(),
    lotName: v.string(),
    lineIndex: v.number(),
    baseDesignation: v.string(),
    designation: v.string(),
    unit: v.string(),
    baseUnit: v.string(),
    quantity: v.number(),
    baseQuantity: v.number(),
    unitPrice: v.number(),
    baseUnitPrice: v.number(),
    nature: v.string(),
    priceScenario: scenarioValidator,
    replacedArticle: v.boolean(),
    /** Scénario de référence, utilisé à la création du scénario Personnalisé. */
    baseScenario: scenarioValidator,
  },
  handler: async (ctx, args) => {
    const { project } = await requireOwnedProject(ctx, args.projectId);
    if (!isEditableLot(args.lotId)) {
      throw new Error("Cette catégorie n'est pas modifiable");
    }
    if (!(args.quantity > 0) || !(args.unitPrice > 0)) {
      throw new Error("Quantité et prix unitaire doivent être positifs");
    }

    const lineKey = quantitatifLineKey(args.lotId, args.lineIndex);
    const now = Date.now();
    const doc = await findCustomization(ctx, args.projectId, project.userId);

    const entry = {
      lineKey,
      lotId: args.lotId,
      lotName: args.lotName,
      lineIndex: args.lineIndex,
      baseDesignation: args.baseDesignation,
      designation: args.designation,
      unit: args.unit,
      quantity: args.quantity,
      unitPrice: args.unitPrice,
      nature: args.nature,
      priceScenario: args.priceScenario,
      replacedArticle: args.replacedArticle,
      updatedAt: now,
    };

    const noop = isNoopCustomization({
      baseDesignation: args.baseDesignation,
      designation: args.designation,
      unit: args.unit,
      baseUnit: args.baseUnit,
      quantity: args.quantity,
      baseQuantity: args.baseQuantity,
      unitPrice: args.unitPrice,
      baseUnitPrice: args.baseUnitPrice,
      priceScenario: args.priceScenario,
    });

    const previous = doc?.modifications ?? [];
    const others = previous.filter((m: any) => m.lineKey !== lineKey);
    const modifications = noop ? others : [...others, entry];

    if (!doc) {
      if (!modifications.length) return { lineKey, removed: true, modifiedCount: 0 };
      await ctx.db.insert("quantitatifCustomizations", {
        projectId: args.projectId,
        userId: project.userId,
        baseScenario: args.baseScenario,
        modifications,
        updatedAt: now,
      });
      return { lineKey, removed: false, modifiedCount: modifications.length };
    }

    if (!modifications.length) {
      // Plus aucune modification : le scénario Personnalisé n'existe plus.
      await ctx.db.delete(doc._id);
      return { lineKey, removed: true, modifiedCount: 0 };
    }

    await ctx.db.patch(doc._id, { modifications, updatedAt: now });
    return { lineKey, removed: noop, modifiedCount: modifications.length };
  },
});

/** Supprime la personnalisation d'un article (réinitialisation ciblée). */
export const resetItemCustomization = mutation({
  args: { projectId: v.id("projects"), lineKey: v.string() },
  handler: async (ctx, args) => {
    const { project } = await requireOwnedProject(ctx, args.projectId);
    const doc = await findCustomization(ctx, args.projectId, project.userId);
    if (!doc) return { modifiedCount: 0 };
    const modifications = doc.modifications.filter(
      (m: any) => m.lineKey !== args.lineKey,
    );
    if (!modifications.length) {
      await ctx.db.delete(doc._id);
      return { modifiedCount: 0 };
    }
    await ctx.db.patch(doc._id, { modifications, updatedAt: Date.now() });
    return { modifiedCount: modifications.length };
  },
});

/** Réinitialise toutes les modifications (le scénario Personnalisé disparaît). */
export const resetAllCustomizations = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const { project } = await requireOwnedProject(ctx, args.projectId);
    const doc = await findCustomization(ctx, args.projectId, project.userId);
    if (doc) await ctx.db.delete(doc._id);
    return { modifiedCount: 0 };
  },
});
