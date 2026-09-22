import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// PROJECT INTELLIGENCE — stockage segmenté des extensions Batibuild
// ============================================================================
// Couche d'extension (EXTEND, DON'T REPLACE) : un document par (user, project)
// dans la table additive `projectIntelligence`. Chaque segment est indépendant
// et optionnel :
//   finance     → instantané du suivi financier (notes, seuils d'alerte)
//   purchases   → statuts « À acheter / Commandé / Reçu » (dérivés du DQE)
//   guide       → progression des étapes du guide A→Z
//   planning    → ancrage calendaire + avancement du planning auto
//   variants    → simulations de variantes (copies, jamais le projet original)
//   quotes      → devis comparés (saisis utilisateur, lecture seule)
//   copilot     → historique des questions/réponses du copilote
//   dismissedAlerts → alertes fermées par l'utilisateur
//
// Toute écriture est vérifiée côté serveur : seul le PROPRIÉTAIRE du projet
// accède à ses données. Ces modules ne remplacent aucun moteur existant : les
// moteurs (estimation, DQE, matériaux, planning roadmap…) restent inchangés et
// restent la source de vérité ; ici ne vivent que des données dérivées et des
// préférences utilisateur.

/** Segments autorisés (clés du payload `data`). */
const SEGMENTS = [
  "finance",
  "purchases",
  "guide",
  "planning",
  "variants",
  "quotes",
  "copilot",
  "dismissedAlerts",
] as const;

type SegmentKey = (typeof SEGMENTS)[number];

function isSegmentKey(key: string): key is SegmentKey {
  return (SEGMENTS as readonly string[]).includes(key);
}

/** Lit (ou initialement crée) le document d'intelligence d'un projet. */
export const getIntelligence = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user.subject) return null;

    const doc = await ctx.db
      .query("projectIntelligence")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();
    return doc ?? null;
  },
});

/**
 * Écrit (merge) un segment du payload. Le document est créé à la première
 * écriture (upsert). Seul le propriétaire du projet peut écrire.
 */
export const setSegment = mutation({
  args: {
    projectId: v.id("projects"),
    segment: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Non authentifié");
    if (!isSegmentKey(args.segment)) {
      throw new Error(`Segment inconnu : ${args.segment}`);
    }

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user.subject) {
      throw new Error("Accès refusé : projet introuvable ou non autorisé");
    }

    const now = Date.now();
    const doc = await ctx.db
      .query("projectIntelligence")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();

    if (doc) {
      const data = { ...(doc.data as Record<string, unknown>) };
      data[args.segment] = args.value;
      await ctx.db.patch(doc._id, { data, updatedAt: now });
      return { _id: doc._id };
    }

    const id = await ctx.db.insert("projectIntelligence", {
      userId: project.userId,
      projectId: args.projectId,
      data: { [args.segment]: args.value },
      createdAt: now,
      updatedAt: now,
    });
    return { _id: id };
  },
});

/** Supprime un segment (reset d'un module d'extension, jamais des données d'origine). */
export const clearSegment = mutation({
  args: { projectId: v.id("projects"), segment: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Non authentifié");
    if (!isSegmentKey(args.segment)) {
      throw new Error(`Segment inconnu : ${args.segment}`);
    }

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user.subject) {
      throw new Error("Accès refusé : projet introuvable ou non autorisé");
    }

    const doc = await ctx.db
      .query("projectIntelligence")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();
    if (!doc) return { ok: true };

    const data = { ...(doc.data as Record<string, unknown>) };
    delete data[args.segment];
    await ctx.db.patch(doc._id, { data, updatedAt: Date.now() });
    return { ok: true };
  },
});
