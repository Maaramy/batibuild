import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ============================================================================
// Mutations
// ============================================================================

/** Create a service request from a user to an expert */
export const create = mutation({
  args: {
    expertId: v.id("expertProfiles"),
    projectId: v.optional(v.id("projects")),
    projectName: v.optional(v.string()),
    requestType: v.union(v.literal("devis"), v.literal("service")),
    serviceType: v.string(),
    description: v.string(),
    projectType: v.optional(v.string()),
    totalTTC: v.optional(v.number()),
    surface: v.optional(v.number()),
    region: v.optional(v.string()),
    userPhone: v.string(),
    userEmail: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");

    const expert = await ctx.db.get(args.expertId);
    if (!expert) throw new Error("Expert introuvable");

    const now = Date.now();
    const requestId = await ctx.db.insert("expertServiceRequests", {
      userId: user._id,
      expertId: args.expertId,
      projectId: args.projectId,
      projectName: args.projectName,
      requestType: args.requestType,
      serviceType: args.serviceType,
      description: args.description,
      projectType: args.projectType,
      totalTTC: args.totalTTC,
      surface: args.surface,
      region: args.region,
      userPhone: args.userPhone,
      userEmail: args.userEmail,
      userName: args.userName,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Track analytics click
    try {
      await ctx.db.insert("expertAnalytics", {
        expertId: args.expertId,
        date: now,
        eventType: "contact",
        source: "direct",
      });
    } catch (e) {
      /* optional */
    }

    return { success: true, requestId };
  },
});

/** Respond to a service request (expert only) */
export const respond = mutation({
  args: {
    serviceRequestId: v.id("expertServiceRequests"),
    message: v.string(),
    totalAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");

    const profile = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) throw new Error("Profil expert introuvable");

    const request = await ctx.db.get(args.serviceRequestId);
    if (!request) throw new Error("Demande introuvable");
    if (request.expertId !== profile._id) throw new Error("Non autorisé");

    const now = Date.now();

    await ctx.db.insert("expertServiceResponses", {
      serviceRequestId: args.serviceRequestId,
      expertId: profile._id,
      userId: request.userId,
      message: args.message,
      totalAmount: args.totalAmount,
      createdAt: now,
    });

    await ctx.db.patch(args.serviceRequestId, {
      status: "responded",
      updatedAt: now,
    });

    return { success: true };
  },
});

// ============================================================================
// Queries
// ============================================================================

/** Get all service requests for the current expert */
export const getByExpert = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const profile = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) return [];

    const requests = await ctx.db
      .query("expertServiceRequests")
      .withIndex("by_expert", (q) => q.eq("expertId", profile._id))
      .order("desc")
      .collect();

    return requests;
  },
});

/** Get all service requests sent by the current user */
export const getMyRequests = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("expertServiceRequests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

/** Get responses for a specific service request */
export const getResponses = query({
  args: { serviceRequestId: v.id("expertServiceRequests") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("expertServiceResponses")
      .withIndex("by_request", (q) => q.eq("serviceRequestId", args.serviceRequestId))
      .order("desc")
      .collect();
  },
});

/** Get all expert responses received by the current user (client Messagerie) */
export const getMyResponses = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const responses = await ctx.db
      .query("expertServiceResponses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    // Enrichissement : nom + logo + téléphone de l'expert qui a répondu,
    // pour l'affichage des cartes de réponse dans la messagerie.
    const expertIds = [...new Set(responses.map((r) => r.expertId))];
    const experts = await Promise.all(expertIds.map((id) => ctx.db.get(id)));
    const expertsById = new Map(expertIds.map((id, i) => [id, experts[i]]));

    return responses.map((r) => {
      const expert = expertsById.get(r.expertId);
      return {
        ...r,
        expertName: expert?.displayName ?? "Expert",
        expertCompanyName: expert?.companyName,
        expertLogo: expert?.logo,
        expertPhone: expert?.phone,
      };
    });
  },
});

/** Count expert responses not yet consulted by the current user (client badge) */
export const responsesUnreadCount = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    const responses = await ctx.db
      .query("expertServiceResponses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return responses.filter((r) => r.readAt === undefined).length;
  },
});

/** Mark all expert responses received by the current user as consulted */
export const responsesMarkAllRead = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;

    const responses = await ctx.db
      .query("expertServiceResponses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const now = Date.now();
    for (const r of responses) {
      if (r.readAt === undefined) {
        await ctx.db.patch(r._id, { readAt: now });
      }
    }
  },
});

/** Get pending requests count for expert badge */
export const pendingCount = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    const profile = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) return 0;

    const all = await ctx.db
      .query("expertServiceRequests")
      .withIndex("by_expert", (q) => q.eq("expertId", profile._id))
      .collect();

    return all.filter((r) => r.status === "pending").length;
  },
});

/** Count unread (not yet consulted) requests for an expert — drives the red badge */
export const unreadCount = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    const profile = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) return 0;

    const all = await ctx.db
      .query("expertServiceRequests")
      .withIndex("by_expert", (q) => q.eq("expertId", profile._id))
      .collect();

    return all.filter((r) => r.readAt === undefined).length;
  },
});

/** Mark all of the expert's requests as consulted (clears the red badge) */
export const markAllRead = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;

    const profile = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) return;

    const all = await ctx.db
      .query("expertServiceRequests")
      .withIndex("by_expert", (q) => q.eq("expertId", profile._id))
      .collect();

    const now = Date.now();
    for (const r of all) {
      if (r.readAt === undefined) {
        await ctx.db.patch(r._id, { readAt: now });
      }
    }
  },
});
