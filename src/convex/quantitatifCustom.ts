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
  lockedUnitPriceForScenario,
  quantitatifLineKey,
  resolveLockedArticle,
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
 *
 * La **quantité** et le **prix unitaire** sont verrouillés : ils ne sont jamais
 * acceptés depuis le client (aucun argument correspondant) mais relus dans le
 * quantitatif du projet, le prix unitaire étant décliné selon le scénario de
 * budget demandé. Seules les informations autorisées de l'article
 * (désignation, unité, niveau de finition, remplacement) sont enregistrées.
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

    // ── Verrouillage (quantité & prix unitaire) ──────────────────────────
    // Source de vérité : l'article de référence du quantitatif du projet. Une
    // tentative de contournement (client forgé, arguments supplémentaires) est
    // rejetée par la validation des arguments, et toute valeur de quantité ou
    // de prix unitaire envoyée serait ignorée par ce recalcul.
    const reference = resolveLockedArticle(
      (project as any)?.dqe?.lots,
      args.lotId,
      args.lineIndex,
      args.baseDesignation,
    );
    if (!reference) {
      throw new Error("Article de référence introuvable dans le quantitatif du projet");
    }
    const quantity = reference.quantity;
    const unitPrice = lockedUnitPriceForScenario(
      reference.unitPrice,
      (project as any)?.costEstimate?.budgetScenarios,
      args.priceScenario,
    );
    if (!(quantity > 0) || !(unitPrice > 0)) {
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
      quantity,
      unitPrice,
      nature: args.nature,
      priceScenario: args.priceScenario,
      replacedArticle: args.replacedArticle,
      updatedAt: now,
    };

    const noop = isNoopCustomization({
      baseDesignation: args.baseDesignation,
      designation: args.designation,
      unit: args.unit,
      baseUnit: reference.unit,
      quantity,
      baseQuantity: reference.quantity,
      unitPrice,
      baseUnitPrice: reference.unitPrice,
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
