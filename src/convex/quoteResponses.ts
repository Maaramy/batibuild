import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ============================================================================
// Mutations
// ============================================================================

/** Supplier sends a response with optional file attachment */
export const sendResponse = mutation({
  args: {
    quoteRequestId: v.id("quoteRequests"),
    message: v.string(),
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

    // Get attachment URL if storage ID provided
    let attachmentUrl: string | undefined;
    if (args.attachmentStorageId) {
      attachmentUrl = await ctx.storage.getUrl(args.attachmentStorageId) ?? undefined;
    }

    const responseId = await ctx.db.insert("quoteResponses", {
      quoteRequestId: args.quoteRequestId,
      supplierId: profile._id,
      userId: quote.userId,
      message: args.message,
      totalAmount: args.totalAmount,
      attachmentUrl,
      attachmentStorageId: args.attachmentStorageId,
      attachmentFileName: args.attachmentFileName,
      createdAt: Date.now(),
    });

    // Update quote status to responded
    await ctx.db.patch(args.quoteRequestId, {
      status: "responded",
      updatedAt: Date.now(),
    });

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
