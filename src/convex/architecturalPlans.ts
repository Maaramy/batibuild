// ============================================================================
// Générateur de plans architecturaux — persistance (Convex)
// CRUD + historique de versions + favoris + duplication.
// ============================================================================

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { checkQuota, consumeQuota, releaseQuota } from "./subscriptions";
import { generatePlans, regenerateVariant } from "./planEngine";
import type { PlanRequest, GeneratedPlan } from "./planEngine";

const MAX_VERSIONS = 20;

type PlanDoc = {
  _id: any;
  userId: any;
  name: string;
  bienType: string;
  request: PlanRequest;
  plans: GeneratedPlan[];
  selectedIndex?: number;
  favorite?: boolean;
  versions?: { v: number; createdAt: number; plans: GeneratedPlan[] }[];
  createdAt: number;
  updatedAt: number;
};

// ─── Queries ────────────────────────────────────────────────────────────────

/** Liste des plans du connecté (sans les données lourdes des versions). */
export const getMyPlans = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const docs = await ctx.db
      .query("architecturalPlans")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return docs
      .sort((a: any, b: any) => b.createdAt - a.createdAt)
      .map((d: any) => ({
        _id: d._id,
        name: d.name,
        bienType: d.bienType,
        favorite: !!d.favorite,
        selectedIndex: d.selectedIndex ?? 1,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        // Aperçu : premier plan pour la miniature + stats agrégées
        preview: d.plans?.[0]
          ? {
              index: d.plans[0].index,
              name: d.plans[0].name,
              levels: d.plans[0].levels,
              stats: d.plans[0].stats,
              scores: d.plans[0].scores,
              rooms: d.plans[0].rooms,
              doors: d.plans[0].doors,
              windows: d.plans[0].windows,
              stairs: d.plans[0].stairs,
              width: d.plans[0].width,
              depth: d.plans[0].depth,
            }
          : null,
        versionsCount: Array.isArray(d.versions) ? d.versions.length : 0,
      }));
  },
});

/** Détail complet d'un plan (toutes les variantes + historique). */
export const getPlan = query({
  args: { planId: v.id("architecturalPlans") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const doc = await ctx.db.get(args.planId);
    if (!doc || doc.userId !== user._id) return null;
    return doc as unknown as PlanDoc;
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Crée un plan sauvegardé (10 variantes générées + version initiale). */
export const createPlan = mutation({
  args: {
    name: v.string(),
    request: v.any(),
    plans: v.any(),
    selectedIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    // ── Quota plans architecturaux par forfait (paiement unique) ──
    const quota = await checkQuota(ctx, user, "plans");
    if (!quota.allowed) {
      const planLabel = quota.plan === "free" ? "Start" : quota.plan === "pro" ? "Pro" : "Expert";
      throw new Error(
        `LIMITE_ATTEINTE:Vous avez atteint la limite de ${quota.limit} plan(s) d'architecture offerte avec le forfait ${planLabel}. ` +
        `Forfaits à paiement unique : passez à une offre supérieure ou rachetez un forfait pour augmenter vos quotas.`
      );
    }

    const now = Date.now();
    const request = args.request as PlanRequest;
    const plans = (args.plans as GeneratedPlan[]) ?? generatePlans(request);
    const id = await ctx.db.insert("architecturalPlans", {
      userId: user._id,
      name: args.name || `${bienTypeFr(request.bienType)} — ${now}`,
      bienType: request.bienType,
      request,
      plans,
      selectedIndex: args.selectedIndex ?? 1,
      favorite: false,
      versions: [{ v: 1, createdAt: now, plans }],
      createdAt: now,
      updatedAt: now,
    });

    await consumeQuota(ctx, user, "plans");

    return id;
  },
});

/** Renomme un plan. */
export const renamePlan = mutation({
  args: { planId: v.id("architecturalPlans"), name: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const doc = await ctx.db.get(args.planId);
    if (!doc || doc.userId !== user._id) throw new Error("Plan introuvable");
    await ctx.db.patch(args.planId, { name: args.name.trim() || doc.name, updatedAt: Date.now() });
    return { success: true };
  },
});

/** Supprime un plan. */
export const deletePlan = mutation({
  args: { planId: v.id("architecturalPlans") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const doc = await ctx.db.get(args.planId);
    if (!doc || doc.userId !== user._id) throw new Error("Plan introuvable");
    await ctx.db.delete(args.planId);
    return { success: true };
  },
});

// ============================================================================
// Administration — liste & suppression (les quotas sont libérés)
// ============================================================================

/** Tous les plans avec infos utilisateur (admin / modérateur). */
export const getAllPlans = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) return [];
    const docs = await ctx.db.query("architecturalPlans").order("desc").collect();
    return await Promise.all(
      docs.map(async (doc) => {
        const u = await ctx.db.get(doc.userId);
        return {
          ...doc,
          user: u
            ? { _id: u._id, name: u.name, email: u.email, image: u.image }
            : null,
        };
      }),
    );
  },
});

/** Suppression groupée (admin) — libère les quotas des propriétaires. */
export const adminDeletePlans = mutation({
  args: { planIds: v.array(v.id("architecturalPlans")) },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized");
    let deleted = 0;
    for (const id of args.planIds) {
      const doc = await ctx.db.get(id);
      if (doc) {
        await ctx.db.delete(id);
        try { await releaseQuota(ctx, doc.userId, "plans", 1); } catch { /* non bloquant */ }
        deleted++;
      }
    }
    return { deleted };
  },
});

/** Suppression d'un seul plan (admin) — libère le quota du propriétaire. */
export const adminDeletePlan = mutation({
  args: { planId: v.id("architecturalPlans") },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized");
    const doc = await ctx.db.get(args.planId);
    if (!doc) throw new Error("Plan introuvable");
    await ctx.db.delete(args.planId);
    try { await releaseQuota(ctx, doc.userId, "plans", 1); } catch { /* non bloquant */ }
    return { deleted: 1 };
  },
});

/** Bascule favori. */
export const toggleFavorite = mutation({
  args: { planId: v.id("architecturalPlans") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const doc = await ctx.db.get(args.planId);
    if (!doc || doc.userId !== user._id) throw new Error("Plan introuvable");
    await ctx.db.patch(args.planId, { favorite: !doc.favorite, updatedAt: Date.now() });
    return { success: true };
  },
});

/** Duplique un plan (copie indépendante, nouvelle version). */
export const duplicatePlan = mutation({
  args: { planId: v.id("architecturalPlans"), name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const doc = await ctx.db.get(args.planId);
    if (!doc || doc.userId !== user._id) throw new Error("Plan introuvable");
    const now = Date.now();
    const id = await ctx.db.insert("architecturalPlans", {
      userId: user._id,
      name: args.name || `${doc.name} (copie)`,
      bienType: doc.bienType,
      request: doc.request,
      plans: doc.plans,
      selectedIndex: doc.selectedIndex ?? 1,
      favorite: false,
      versions: [{ v: 1, createdAt: now, plans: doc.plans }],
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Enregistre une nouvelle version des plans (régénération, modification).
 * Conserve un historique plafonné à MAX_VERSIONS.
 */
export const saveNewVersion = mutation({
  args: {
    planId: v.id("architecturalPlans"),
    plans: v.any(),
    request: v.optional(v.any()),
    selectedIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const doc = await ctx.db.get(args.planId);
    if (!doc || doc.userId !== user._id) throw new Error("Plan introuvable");
    const now = Date.now();
    const versions = Array.isArray(doc.versions) ? [...doc.versions] : [{ v: 1, createdAt: doc.createdAt, plans: doc.plans }];
    const nextV = (versions[versions.length - 1]?.v ?? 0) + 1;
    versions.push({ v: nextV, createdAt: now, plans: args.plans });
    const trimmed = versions.slice(-MAX_VERSIONS);
    await ctx.db.patch(args.planId, {
      plans: args.plans,
      request: (args.request as PlanRequest | undefined) ?? doc.request,
      selectedIndex: args.selectedIndex ?? doc.selectedIndex ?? 1,
      versions: trimmed,
      updatedAt: now,
    });
    return { success: true, version: nextV };
  },
});

/** Restaure une ancienne version. */
export const restoreVersion = mutation({
  args: { planId: v.id("architecturalPlans"), version: v.number() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const doc = await ctx.db.get(args.planId);
    if (!doc || doc.userId !== user._id) throw new Error("Plan introuvable");
    const versions = Array.isArray(doc.versions) ? doc.versions : [];
    const target = versions.find((ver: any) => ver.v === args.version);
    if (!target) throw new Error("Version introuvable");
    const now = Date.now();
    const nextV = (versions[versions.length - 1]?.v ?? 0) + 1;
    // Restaurer crée une nouvelle version (l'historique reste intact)
    const trimmed = [...versions, { v: nextV, createdAt: now, plans: target.plans }].slice(-MAX_VERSIONS);
    await ctx.db.patch(args.planId, {
      plans: target.plans,
      selectedIndex: doc.selectedIndex ?? 1,
      versions: trimmed,
      updatedAt: now,
    });
    return { success: true, version: nextV };
  },
});

/**
 * Régénère une variante précise côté serveur après modification des
 * contraintes (utilisé quand l'utilisateur « Modifie » un plan).
 */
export const regenerateOneVariant = mutation({
  args: {
    planId: v.id("architecturalPlans"),
    variantIndex: v.number(),
    request: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const doc = await ctx.db.get(args.planId);
    if (!doc || doc.userId !== user._id) throw new Error("Plan introuvable");
    const request = args.request as PlanRequest;
    const plans = Array.isArray(doc.plans) ? [...doc.plans] : [];
    const current = plans[args.variantIndex - 1];
    const newPlan = regenerateVariant(
      request,
      current?.key ?? "",
      args.variantIndex,
      request.seed ?? 2026,
    );
    plans[args.variantIndex - 1] = newPlan;
    await ctx.db.patch(args.planId, {
      plans,
      request,
      selectedIndex: args.variantIndex,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

function bienTypeFr(value: string): string {
  const map: Record<string, string> = {
    maison: "Maison", villa: "Villa", appartement: "Appartement",
    studio: "Studio", duplex: "Duplex", immeuble: "Immeuble",
    local_commercial: "Local commercial", bureau: "Bureau",
    entrepot: "Entrepôt", residence_touristique: "Résidence touristique",
    projet_neuf: "Projet immobilier neuf",
    // Rétro-compatibilité (anciens plans enregistrés)
    residence: "Résidence", mixte: "Projet mixte", autre: "Projet",
  };
  return map[value] ?? value;
}
