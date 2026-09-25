import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import {
  CLIENT_QUOTE_LINK,
  quoteMessagingLink,
  notifyQuoteParty,
} from "./quoteRequests";
import { scheduleEmailEvent, splitName } from "./emailNotifications";

// ============================================================================
// RÉPONSES AUX DEMANDES DE DEVIS — messages de la conversation
//
// Le fournisseur répond directement depuis la conversation de sa messagerie.
// Trois natures de message sont possibles, toutes affichées au client dans sa
// propre messagerie :
//   • « quote »         → devis chiffré (statut « Devis envoyé ») ;
//   • « refusal »       → refus de la demande (statut « Refusée ») ;
//   • « clarification » → demande de précisions (statut « En cours »).
//
// Les réponses historiques (sans `kind`) sont considérées comme des devis :
// aucune donnée n'est modifiée ni supprimée.
//
// Un devis chiffré déclenche en plus un e-mail automatique au client (modèle
// « Devis reçu ») : il est prévenu même sans être connecté. Le refus et la
// demande de précisions restent couverts par la notification de la messagerie.
// ============================================================================

export type QuoteResponseKind = "quote" | "refusal" | "clarification";

// ============================================================================
// Mutations
// ============================================================================

/** Supplier sends a response with optional file attachment */
export const sendResponse = mutation({
  args: {
    quoteRequestId: v.id("quoteRequests"),
    message: v.string(),
    kind: v.optional(
      v.union(
        v.literal("quote"),
        v.literal("refusal"),
        v.literal("clarification")
      )
    ),
    totalAmount: v.optional(v.number()),
    attachmentStorageId: v.optional(v.id("_storage")),
    attachmentFileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Utilisateur non connecté");

    // Verify supplier owns this quote
    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) throw new Error("Profil fournisseur introuvable");

    const quote = await ctx.db.get(args.quoteRequestId);
    if (!quote) throw new Error("Demande de devis introuvable");
    if (quote.supplierId !== profile._id) {
      throw new Error("Non autorisé");
    }

    const kind: QuoteResponseKind = args.kind ?? "quote";

    // Get attachment URL if storage ID provided
    let attachmentUrl: string | undefined;
    if (args.attachmentStorageId) {
      attachmentUrl = (await ctx.storage.getUrl(args.attachmentStorageId)) ?? undefined;
    }

    const responseId = await ctx.db.insert("quoteResponses", {
      quoteRequestId: args.quoteRequestId,
      supplierId: profile._id,
      userId: quote.userId,
      kind,
      message: args.message,
      totalAmount: kind === "quote" ? args.totalAmount : undefined,
      attachmentUrl,
      attachmentStorageId: args.attachmentStorageId,
      attachmentFileName: args.attachmentFileName,
      createdAt: Date.now(),
    });

    // Le statut de la demande reflète la nature de la réponse.
    const status: "responded" | "refused" | "in_progress" =
      kind === "refusal"
        ? "refused"
        : kind === "clarification"
          ? "in_progress"
          : "responded";

    await ctx.db.patch(args.quoteRequestId, {
      status,
      updatedAt: Date.now(),
    });

    // Le client est notifié dans sa messagerie (onglet « Devis fournisseurs »).
    const label = quote.projectName || quote.category;
    await notifyQuoteParty(ctx, {
      userId: quote.userId,
      type: "quote_update",
      title:
        kind === "refusal"
          ? "Demande refusée"
          : kind === "clarification"
            ? "Précisions demandées"
            : "Devis reçu",
      message:
        kind === "refusal"
          ? `${profile.companyName} ne peut pas donner suite à votre demande « ${label} ».`
          : kind === "clarification"
            ? `${profile.companyName} vous demande des précisions sur votre demande « ${label} ».`
            : `${profile.companyName} a répondu à votre demande « ${label} ».`,
      link: quoteMessagingLink(CLIENT_QUOTE_LINK, args.quoteRequestId),
    });

    // E-mail automatique au client pour un devis chiffré (modèle personnalisable
    // dans l'espace admin → E-mails).
    if (kind === "quote") {
      const clientUser = await ctx.db.get(quote.userId);
      const to = quote.userEmail || clientUser?.email;
      if (to && clientUser?.emailNotifications !== false) {
        const { nom, prenom } = splitName(clientUser?.name || quote.userName);
        await scheduleEmailEvent(ctx, {
          to,
          recipientName: clientUser?.name || quote.userName,
          templateKey: "quote_received",
          vars: {
            nom,
            prenom,
            entreprise: profile.companyName,
            nomProjet: quote.projectName || quote.category,
            typeProjet: quote.category,
            montantDevis:
              typeof args.totalAmount === "number"
                ? `${args.totalAmount.toLocaleString("fr-FR")} TND`
                : "—",
            message: args.message,
            lienConnexion: quoteMessagingLink(
              CLIENT_QUOTE_LINK,
              args.quoteRequestId,
            ),
          },
          dedupeKey: `quote_received:${responseId}`,
        });
      }
    }

    return responseId;
  },
});

// ============================================================================
// Queries
// ============================================================================

/** Get responses for a quote request */
export const getByQuote = query({
  args: { quoteRequestId: v.id("quoteRequests") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const quote = await ctx.db.get(args.quoteRequestId);
    if (!quote) return [];

    // Verify access
    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const isSupplierOwner = profile && quote.supplierId === profile._id;
    const isUserOwner = quote.userId === user._id;
    const isAdmin = user.role === "admin" || user.role === "moderator";

    if (!isSupplierOwner && !isUserOwner && !isAdmin) {
      return [];
    }

    const responses = await ctx.db
      .query("quoteResponses")
      .withIndex("by_quote", (q) => q.eq("quoteRequestId", args.quoteRequestId))
      .order("desc")
      .collect();

    return responses;
  },
});

/**
 * Get every response sent by the supplier on their received requests — alimente
 * l'affichage des conversations dans la messagerie du fournisseur.
 */
export const getBySupplier = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const profile = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) return [];

    return await ctx.db
      .query("quoteResponses")
      .withIndex("by_supplier", (q) => q.eq("supplierId", profile._id))
      .order("desc")
      .collect();
  },
});

/** Get all responses received by the current user */
export const getMyResponses = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const responses = await ctx.db
      .query("quoteResponses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    // Enrichissement : nom + logo + téléphone du fournisseur qui a répondu,
    // pour l'affichage des cartes de réponse dans la messagerie.
    const supplierIds = [...new Set(responses.map((r) => r.supplierId))];
    const suppliers = await Promise.all(supplierIds.map((id) => ctx.db.get(id)));
    const suppliersById = new Map(supplierIds.map((id, i) => [id, suppliers[i]]));

    return responses.map((r) => {
      const supplier = suppliersById.get(r.supplierId);
      return {
        ...r,
        supplierName: supplier?.companyName ?? "Fournisseur",
        supplierLogo: supplier?.logo,
        supplierPhone: supplier?.phone,
      };
    });
  },
});

/** Count responses from suppliers not yet consulted by the current user (client badge) */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    const responses = await ctx.db
      .query("quoteResponses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return responses.filter((r) => r.readAt === undefined).length;
  },
});

/** Mark all supplier responses received by the current user as consulted */
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;

    const responses = await ctx.db
      .query("quoteResponses")
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
