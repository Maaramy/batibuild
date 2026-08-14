import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { KNOWLEDGE_SEED } from "./aiKnowledge";
import { retrieveKnowledge } from "../lib/copilotEngine";
import { getCurrentUser } from "./users";

// ============================================================================
// Construction AI Copilot — couche base de données (queries & mutations)
// Les actions (sendMessage, generateReport) vivent dans aiCopilot.ts (node).
// ============================================================================

// ============================================================================
// Queries
// ============================================================================

/** Sessions de l'utilisateur, optionnellement filtrées par projet. */
export const listSessions = query({
  args: { projectId: v.optional(v.id("projects")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    if (args.projectId) {
      return await ctx.db
        .query("aiSessions")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", user._id).eq("projectId", args.projectId!),
        )
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("aiSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const getSession = query({
  args: { sessionId: v.id("aiSessions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) return null;
    return session;
  },
});

/** Messages d'une session (vérifie le propriétaire). */
export const listMessages = query({
  args: { sessionId: v.id("aiSessions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) return [];
    return await ctx.db
      .query("aiMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
  },
});

/** Mémoire contextuelle (par projet, ou globale si pas de projet). */
export const listMemories = query({
  args: { projectId: v.optional(v.id("projects")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    if (args.projectId) {
      return await ctx.db
        .query("aiMemories")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId!))
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("aiMemories")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

/** Toute la base de connaissances (utilisé par le RAG côté action). */
export const getAllKnowledge = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("aiKnowledgeBase").collect();
  },
});

/** Recherche dans la base de connaissances (interface + commandes rapides). */
export const searchKnowledge = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const kb = await ctx.db.query("aiKnowledgeBase").collect();
    return retrieveKnowledge(args.query, kb, args.limit ?? 6);
  },
});

/** Statistiques d'utilisation du copilote (interface). */
export const getCopilotStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { sessions: 0, messages: 0, memories: 0 };
    const sessions = await ctx.db
      .query("aiSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    let messages = 0;
    for (const s of sessions) {
      const msgs = await ctx.db
        .query("aiMessages")
        .withIndex("by_session", (q) => q.eq("sessionId", s._id))
        .collect();
      messages += msgs.length;
    }
    const memories = await ctx.db
      .query("aiMemories")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return { sessions: sessions.length, messages, memories: memories.length };
  },
});

// ============================================================================
// Mutations
// ============================================================================

export const createSession = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    // Vérifier l'accès au projet si fourni
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || (project.userId !== user._id && user.role !== "admin")) {
        throw new Error("Projet introuvable");
      }
    }

    const now = Date.now();
    const id = await ctx.db.insert("aiSessions", {
      userId: user._id,
      projectId: args.projectId,
      title: args.title ?? "Nouvelle conversation",
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const deleteSession = mutation({
  args: { sessionId: v.id("aiSessions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) throw new Error("Accès refusé");

    // Supprimer les messages puis la session
    const messages = await ctx.db
      .query("aiMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    for (const m of messages) await ctx.db.delete(m._id);
    await ctx.db.delete(args.sessionId);
  },
});

export const renameSession = mutation({
  args: { sessionId: v.id("aiSessions"), title: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) throw new Error("Accès refusé");
    await ctx.db.patch(args.sessionId, { title: args.title, updatedAt: Date.now() });
  },
});

export const addMemory = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    content: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || (project.userId !== user._id && user.role !== "admin")) {
        throw new Error("Projet introuvable");
      }
    }
    return await ctx.db.insert("aiMemories", {
      userId: user._id,
      projectId: args.projectId,
      category: args.category ?? "décision",
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

export const deleteMemory = mutation({
  args: { memoryId: v.id("aiMemories") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const memory = await ctx.db.get(args.memoryId);
    if (!memory || memory.userId !== user._id) throw new Error("Accès refusé");
    await ctx.db.delete(args.memoryId);
  },
});

/** Ajoute une note assistant dans une session (résultats d'analyse, rapports…). */
export const addAssistantNote = mutation({
  args: {
    sessionId: v.id("aiSessions"),
    content: v.string(),
    sources: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) throw new Error("Accès refusé");
    await ctx.db.insert("aiMessages", {
      sessionId: args.sessionId,
      role: "assistant",
      content: args.content,
      sources: args.sources,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.sessionId, {
      updatedAt: Date.now(),
      lastMessagePreview: args.content.slice(0, 80),
    });
  },
});

// ============================================================================
// Internal mutations (appelées depuis les actions node)
// ============================================================================

/** Insère la base de connaissances (idempotent). */
export const seedKnowledgeBase = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("aiKnowledgeBase").first();
    if (existing) return { seeded: false, count: 0 };
    const now = Date.now();
    for (const entry of KNOWLEDGE_SEED) {
      await ctx.db.insert("aiKnowledgeBase", {
        topic: entry.topic,
        keywords: entry.keywords,
        content: entry.content,
        source: entry.source,
        reliability: (entry.reliability as any) ?? "ESTIMATION",
        updatedAt: now,
      });
    }
    return { seeded: true, count: KNOWLEDGE_SEED.length };
  },
});

export const insertUserMessage = internalMutation({
  args: {
    sessionId: v.id("aiSessions"),
    content: v.string(),
    attachments: v.optional(
      v.array(
        v.object({
          name: v.string(),
          type: v.string(),
          storageId: v.optional(v.id("_storage")),
          url: v.optional(v.string()),
          size: v.optional(v.number()),
        }),
      ),
    ),
    level: v.optional(v.union(v.literal("simple"), v.literal("pro"), v.literal("expert"))),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiMessages", {
      sessionId: args.sessionId,
      role: "user",
      content: args.content,
      attachments: args.attachments ?? [],
      level: args.level,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.sessionId, { updatedAt: Date.now() });
  },
});

export const insertAssistantReply = internalMutation({
  args: {
    sessionId: v.id("aiSessions"),
    content: v.string(),
    sources: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiMessages", {
      sessionId: args.sessionId,
      role: "assistant",
      content: args.content,
      sources: args.sources,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.sessionId, {
      updatedAt: Date.now(),
      lastMessagePreview: args.content.slice(0, 80),
    });
  },
});
