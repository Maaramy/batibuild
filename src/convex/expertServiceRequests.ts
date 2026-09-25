import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { scheduleEmailEvent, splitName } from "./emailNotifications";

// Liens profonds : le professionnel ouvre la demande reçue, l'utilisateur
// retrouve la réponse dans sa messagerie (onglet par défaut).
const EXPERT_REQUESTS_LINK = "/dashboard/messages?tab=received";
const CLIENT_MESSAGES_LINK = "/dashboard/messages";

/** Libellés partagés par les modèles d'e-mail (un seul modèle par événement). */
function requestTypeLabel(requestType: "devis" | "service"): string {
  return requestType === "devis" ? "Demande de devis d'expertise" : "Demande de service";
}

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

    // E-mail automatique à l'expert concerné (modèle personnalisable dans
    // l'espace admin → E-mails). Un seul envoi par demande : le `dedupeKey`
    // s'appuie sur l'identifiant de la demande.
    const expertUser = await ctx.db.get(expert.userId);
    const to = expert.email || expertUser?.email;
    if (to && expertUser?.emailNotifications !== false) {
      const { nom, prenom } = splitName(args.userName);
      const typeDemande = requestTypeLabel(args.requestType);
      const details = [
        args.serviceType,
        args.description,
        args.surface ? `${args.surface} m²` : null,
        [args.userPhone, args.userEmail].filter(Boolean).join(" · ") || null,
      ]
        .filter(Boolean)
        .join(" · ");

      await scheduleEmailEvent(ctx, {
        to,
        recipientName: expert.displayName,
        templateKey:
          args.requestType === "devis" ? "expert_quote_request" : "service_request_sent",
        vars: {
          nom,
          prenom,
          expediteur: args.userName || "—",
          typeDemande,
          statut: "En attente de votre réponse",
          entreprise: expert.displayName,
          nomEntreprise: expert.companyName || expert.displayName,
          nomProjet: args.projectName || "—",
          typeProjet: args.projectType || "—",
          motif: args.description,
          region: args.region || "—",
          detailsDemande: details || "—",
          lienConnexion: EXPERT_REQUESTS_LINK,
        },
        dedupeKey: `${
          args.requestType === "devis" ? "expert_quote_request" : "service_request_sent"
        }:${requestId}`,
      });
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

    const responseId = await ctx.db.insert("expertServiceResponses", {
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

    // E-mail automatique à l'utilisateur : réponse / changement de statut
    // (modèle personnalisable dans l'espace admin → E-mails). Un seul envoi
    // par réponse grâce au `dedupeKey`.
    const clientUser = await ctx.db.get(request.userId);
    const to = request.userEmail || clientUser?.email;
    if (to && clientUser?.emailNotifications !== false) {
      const { nom, prenom } = splitName(clientUser?.name || request.userName);
      const typeDemande = requestTypeLabel(request.requestType);

      await scheduleEmailEvent(ctx, {
        to,
        recipientName: clientUser?.name || request.userName,
        templateKey:
          request.requestType === "devis" ? "expert_quote_received" : "service_received",
        vars: {
          nom,
          prenom,
          expediteur: profile.displayName,
          entreprise: profile.displayName,
          typeDemande,
          statut: "Réponse reçue",
          nomProjet: request.projectName || "—",
          typeProjet: request.serviceType || "—",
          motif: request.description,
          region: request.region || "—",
          montantDevis:
            typeof args.totalAmount === "number"
              ? `${args.totalAmount.toLocaleString("fr-FR")} TND`
              : "—",
          message: args.message || "—",
          lienConnexion: CLIENT_MESSAGES_LINK,
        },
        dedupeKey: `${
          request.requestType === "devis" ? "expert_quote_received" : "service_received"
        }:${responseId}`,
      });
    }

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
