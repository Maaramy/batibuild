import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { getFreePlanStatus, isProfilePaymentActive } from "./access";

// ============================================================================
// DEMANDES DE DEVIS FOURNISSEUR — source unique
//
// Depuis la refonte, la MESSAGERIE est l'unique point d'entrée et de gestion des
// demandes de devis fournisseur. Le modèle de données ne change pas : une
// demande (`quoteRequests`) est une conversation, ses réponses
// (`quoteResponses`) en sont les messages. Aucune donnée n'est migrée et
// l'historique existant reste accessible — les anciennes demandes s'affichent
// simplement dans la messagerie du fournisseur (onglet « Demandes de devis »).
//
// Notifications : à chaque étape, la partie concernée — jamais l'auteur de
// l'action — reçoit une notification du centre de notifications, avec un lien
// profond vers la conversation exacte.
// ============================================================================

/** Lien vers la messagerie, onglet adapté au destinataire. */
export const SUPPLIER_QUOTE_LINK = "/dashboard/messages?tab=requests";
export const CLIENT_QUOTE_LINK = "/dashboard/messages?tab=quotes";

/** Lien profond vers une demande précise (`?request=<id>`). */
export function quoteMessagingLink(base: string, requestId?: string): string {
  return requestId ? `${base}&request=${requestId}` : base;
}

/** Statuts possibles d'une demande (identique au schéma). */
export type QuoteRequestStatus =
  | "pending"
  | "in_progress"
  | "responded"
  | "accepted"
  | "refused"
  | "closed"
  | "expired";

/**
 * Notification insérée dans le système existant (table `notifications`).
 * Best-effort : l'échec d'une notification ne bloque jamais la demande.
 */
export async function notifyQuoteParty(
  ctx: any,
  args: {
    userId: Id<"users">;
    type: "quote_request" | "quote_update";
    title: string;
    message: string;
    link?: string;
  },
) {
  try {
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      read: false,
      link: args.link,
      createdAt: Date.now(),
    });
  } catch {
    /* la notification ne doit jamais bloquer le flux */
  }
}

// ============================================================================
// Mutations
// ============================================================================

/** Create a quote request from a user to a supplier */
export const create = mutation({
  args: {
    supplierId: v.id("supplierProfiles"),
    projectId: v.optional(v.id("projects")),
    projectName: v.optional(v.string()),
    category: v.string(),
    materials: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        unit: v.string(),
      })
    ),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Utilisateur non connecté");

    // Verify supplier exists and is active
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) throw new Error("Fournisseur introuvable");
    if (!supplier.isVisible) throw new Error("Ce fournisseur n'est pas actif");

    // Paiement obligatoire : sans offre gratuite ni abonnement actif non
    // expiré, le profil reste strictement invisible et ne reçoit aucune demande.
    const free = await getFreePlanStatus(ctx);
    if (!(await isProfilePaymentActive(ctx, free.supplierFree, supplier, Date.now()))) {
      throw new Error("Ce fournisseur n'est pas actif");
    }

    const now = Date.now();
    const quoteId = await ctx.db.insert("quoteRequests", {
      userId: user._id,
      supplierId: args.supplierId,
      projectId: args.projectId,
      projectName: args.projectName,
      category: args.category,
      materials: args.materials,
      userPhone: user.phone ?? "",
      userEmail: user.email ?? "",
      userName: user.name ?? "",
      message: args.message,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Track analytics contact event
    try {
      await ctx.db.insert("supplierAnalytics", {
        supplierId: args.supplierId,
        date: now,
        eventType: "contact",
        source: "direct",
      });
    } catch (e) { /* optional */ }

    // Notifie le fournisseur : la demande apparaît immédiatement dans sa
    // messagerie (onglet « Demandes de devis ») avec un lien profond.
    const label = args.projectName || args.category;
    await notifyQuoteParty(ctx, {
      userId: supplier.userId,
      type: "quote_request",
      title: "Nouvelle demande de devis",
      message: `${user.name || "Un client"} vous a envoyé une demande de devis${
        args.projectName ? ` pour « ${args.projectName} »` : ""
      }.`,
      link: quoteMessagingLink(SUPPLIER_QUOTE_LINK, quoteId),
    });

    return quoteId;
  },
});

/**
 * Change le statut d'une demande de devis.
 *
 * Les deux parties peuvent faire évoluer le statut : le fournisseur (En cours /
 * Devis envoyé / Refusée / Expirée) et le client (Acceptée / Refusée /
 * Clôturée). La partie qui n'a pas agi est notifiée. Les administrateurs
 * peuvent intervenir pour débloquer une demande.
 */
export const updateStatus = mutation({
  args: {
    quoteRequestId: v.id("quoteRequests"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("responded"),
      v.literal("accepted"),
      v.literal("refused"),
      v.literal("closed"),
      v.literal("expired")
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Utilisateur non connecté");

    const quote = await ctx.db.get(args.quoteRequestId);
    if (!quote) throw new Error("Demande de devis introuvable");

    // Only the supplier who owns this request or the user who created it can update
    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const isSupplierOwner = !!profile && quote.supplierId === profile._id;
    const isUserOwner = quote.userId === user._id;
    const isAdmin = user.role === "admin" || user.role === "moderator";

    if (!isSupplierOwner && !isUserOwner && !isAdmin) {
      throw new Error("Non autorisé");
    }

    if (quote.status === args.status) return;

    await ctx.db.patch(args.quoteRequestId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    const label = quote.projectName || quote.category;

    // Notifie la partie qui n'a pas agi.
    if (isUserOwner && !isSupplierOwner) {
      const supplier = await ctx.db.get(quote.supplierId);
      if (supplier) {
        await notifyQuoteParty(ctx, {
          userId: supplier.userId,
          type: "quote_update",
          title:
            args.status === "accepted"
              ? "Devis accepté"
              : args.status === "refused"
                ? "Devis refusé"
                : "Demande de devis mise à jour",
          message:
            args.status === "accepted"
              ? `Le client a accepté votre devis pour « ${label} ».`
              : args.status === "refused"
                ? `Le client a refusé votre devis pour « ${label} ».`
                : `La demande « ${label} » a changé de statut.`,
          link: quoteMessagingLink(SUPPLIER_QUOTE_LINK, quote._id),
        });
      }
    } else if (isSupplierOwner) {
      await notifyQuoteParty(ctx, {
        userId: quote.userId,
        type: "quote_update",
        title:
          args.status === "refused"
            ? "Demande refusée"
            : args.status === "responded"
              ? "Devis reçu"
              : "Demande de devis mise à jour",
        message:
          args.status === "refused"
            ? `Votre demande « ${label} » a été refusée par le fournisseur.`
            : args.status === "responded"
              ? `Vous avez reçu un devis pour « ${label} ».`
              : `Le statut de votre demande « ${label} » a changé.`,
        link: quoteMessagingLink(CLIENT_QUOTE_LINK, quote._id),
      });
    }
  },
});

// ============================================================================
// Queries
// ============================================================================

/** Get all quote requests for a supplier (Supplier Dashboard) */
export const getBySupplier = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Get supplier profile
    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) return [];

    const requests = await ctx.db
      .query("quoteRequests")
      .withIndex("by_supplier", (q) => q.eq("supplierId", profile._id))
      .order("desc")
      .collect();

    return requests;
  },
});

/** Get all quote requests for the current user (User Messages) */
export const getMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const requests = await ctx.db
      .query("quoteRequests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return requests;
  },
});

/** Get a single quote request by ID */
export const getById = query({
  args: { quoteRequestId: v.id("quoteRequests") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const quote = await ctx.db.get(args.quoteRequestId);
    if (!quote) return null;

    // Only the owner, supplier, or admin can view
    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const isSupplierOwner = profile && quote.supplierId === profile._id;
    const isUserOwner = quote.userId === user._id;
    const isAdmin = user.role === "admin" || user.role === "moderator";

    if (!isSupplierOwner && !isUserOwner && !isAdmin) {
      return null;
    }

    return quote;
  },
});

/** Count pending requests for a supplier (for badge) */
export const pendingCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) return 0;

    const pending = await ctx.db
      .query("quoteRequests")
      .withIndex("by_supplier", (q) => q.eq("supplierId", profile._id))
      .collect();

    return pending.filter((r) => r.status === "pending").length;
  },
});

/** Count unread (not yet consulted) requests for a supplier — drives the red badge */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) return 0;

    const all = await ctx.db
      .query("quoteRequests")
      .withIndex("by_supplier", (q) => q.eq("supplierId", profile._id))
      .collect();

    return all.filter((r) => r.readAt === undefined).length;
  },
});

/** Mark all of the supplier's quote requests as consulted (clears the red badge) */
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;

    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) return;

    const all = await ctx.db
      .query("quoteRequests")
      .withIndex("by_supplier", (q) => q.eq("supplierId", profile._id))
      .collect();

    const now = Date.now();
    for (const r of all) {
      if (r.readAt === undefined) {
        await ctx.db.patch(r._id, { readAt: now });
      }
    }
  },
});
