import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { getFreePlanStatus, isProfilePaymentActive } from "./access";
import { validateQuoteAttachment } from "../lib/quoteAttachments";
import { QUOTE_MOTIF_OTHER, resolveQuoteMotif } from "../lib/quoteMotifs";
import { scheduleEmailEvent, splitName } from "./emailNotifications";

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
//
// Le fournisseur reçoit en plus un e-mail automatique (modèle « Demande de
// devis ») : il est prévenu même lorsqu'il n'est pas connecté à la plateforme.
// ============================================================================

/** Lien vers la messagerie, onglet adapté au destinataire. */
export const SUPPLIER_QUOTE_LINK = "/dashboard/messages?tab=requests";
export const CLIENT_QUOTE_LINK = "/dashboard/messages?tab=quotes";

/** Lien profond vers une demande précise (`?request=<id>`). */
export function quoteMessagingLink(base: string, requestId?: string): string {
  return requestId ? `${base}&request=${requestId}` : base;
}

/** Coordonnées du client, regroupées pour les modèles d'e-mail. */
function clientContact(phone?: string, email?: string): string {
  return [phone, email].filter(Boolean).join(" · ") || "—";
}

/**
 * Résumé lisible d'une demande (motif + matériaux) : alimente la variable
 * `{{DétailsDemande}}` du modèle d'e-mail envoyé au fournisseur.
 */
export function quoteRequestSummary(request: {
  motif?: string;
  motifOther?: string;
  materials: { name: string; quantity: number; unit: string }[];
}): string {
  const parts: string[] = [];
  const motif = resolveQuoteMotif(request.motif, request.motifOther);
  if (motif) parts.push(motif);
  if (request.materials.length > 0) {
    parts.push(
      request.materials.map((m) => `${m.name} × ${m.quantity} ${m.unit}`).join(", "),
    );
  }
  return parts.join(" · ") || "—";
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
/** Pièce jointe telle que stockée avec la demande. */
export interface QuoteAttachment {
  storageId: Id<"_storage">;
  name: string;
  type: string;
  size: number;
}

/**
 * Enrichit les demandes avec l'URL de consultation/téléchargement de chaque
 * pièce jointe, résolue côté serveur depuis Convex Storage.
 */
async function withAttachmentUrls<T extends { attachments?: QuoteAttachment[] }>(
  ctx: any,
  request: T,
): Promise<T & { attachments?: { storageId: string; name: string; type: string; size: number; url?: string }[] }> {
  if (!request.attachments || request.attachments.length === 0) return request;
  const attachments = await Promise.all(
    request.attachments.map(async (a) => ({
      storageId: a.storageId as string,
      name: a.name,
      type: a.type,
      size: a.size,
      url: (await ctx.storage.getUrl(a.storageId)) ?? undefined,
    })),
  );
  return { ...request, attachments };
}

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
    // Motif obligatoire : sans lui, la demande n'est pas envoyée.
    motif: v.string(),
    motifOther: v.optional(v.string()),
    // Pièces jointes facultatives (déjà téléversées dans Convex Storage).
    attachments: v.optional(
      v.array(
        v.object({
          storageId: v.id("_storage"),
          name: v.string(),
          type: v.string(),
          size: v.number(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Utilisateur non connecté");

    // Le motif est obligatoire ; « Autre » exige une précision écrite.
    const motif = args.motif?.trim();
    if (!motif) throw new Error("Le motif de la demande est obligatoire");
    const motifOther = args.motifOther?.trim();
    if (motif === QUOTE_MOTIF_OTHER && !motifOther) {
      throw new Error("Précisez le motif de votre demande");
    }

    // Dernier rempart : les pièces jointes doivent respecter formats et tailles.
    for (const a of args.attachments ?? []) {
      const error = validateQuoteAttachment(a);
      if (error) throw new Error(error);
    }

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
      motif,
      motifOther: motif === QUOTE_MOTIF_OTHER ? motifOther : undefined,
      attachments: args.attachments,
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
    const messagingLink = quoteMessagingLink(SUPPLIER_QUOTE_LINK, quoteId);
    await notifyQuoteParty(ctx, {
      userId: supplier.userId,
      type: "quote_request",
      title: "Nouvelle demande de devis",
      message: `${user.name || "Un client"} vous a envoyé une demande de devis${
        args.projectName ? ` pour « ${args.projectName} »` : ""
      }.`,
      link: messagingLink,
    });

    // E-mail automatique au fournisseur (modèle personnalisable dans l'espace
    // admin → E-mails). Le lien pointe directement sur la conversation.
    const supplierUser = await ctx.db.get(supplier.userId);
    const to = supplier.email || supplierUser?.email;
    if (to && supplierUser?.emailNotifications !== false) {
      const { nom, prenom } = splitName(user.name);
      await scheduleEmailEvent(ctx, {
        to,
        recipientName: supplier.companyName,
        templateKey: "quote_request_sent",
        vars: {
          nom,
          prenom,
          expediteur: user.name || "—",
          typeDemande: "Demande de devis",
          statut: "En attente de votre réponse",
          nomEntreprise: supplier.companyName,
          entreprise: supplier.companyName,
          nomProjet: args.projectName || args.category,
          typeProjet: args.category,
          detailsDemande: `${quoteRequestSummary(args)} · ${clientContact(user.phone, user.email)}`,
          lienConnexion: messagingLink,
        },
        dedupeKey: `quote_request_sent:${quoteId}`,
      });
    }

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

    return await Promise.all(requests.map((r) => withAttachmentUrls(ctx, r)));
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

    return await Promise.all(requests.map((r) => withAttachmentUrls(ctx, r)));
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

    return await withAttachmentUrls(ctx, quote);
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
