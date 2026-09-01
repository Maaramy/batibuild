import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { getFreePlanStatus } from "./access";

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

    // « Offre gratuite » (switch admin) : tous les fournisseurs visibles reçoivent des demandes
    const free = await getFreePlanStatus(ctx);
    if (
      !free.supplierFree &&
      supplier.subscriptionStatus !== "active" &&
      supplier.subscriptionStatus !== "trial"
    ) {
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

    return quoteId;
  },
});

/** Mark a quote request as read/responded by the supplier */
export const updateStatus = mutation({
  args: {
    quoteRequestId: v.id("quoteRequests"),
    status: v.union(
      v.literal("pending"),
      v.literal("responded"),
      v.literal("closed")
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

    const isSupplierOwner = profile && quote.supplierId === profile._id;
    const isUserOwner = quote.userId === user._id;
    const isAdmin = user.role === "admin" || user.role === "moderator";

    if (!isSupplierOwner && !isUserOwner && !isAdmin) {
      throw new Error("Non autorisé");
    }

    await ctx.db.patch(args.quoteRequestId, {
      status: args.status,
      updatedAt: Date.now(),
    });
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
