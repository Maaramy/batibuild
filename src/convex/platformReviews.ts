import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import type { Doc } from "./_generated/dataModel";

// ============================================================================
// « Notez BatiBuild » — avis et satisfaction des utilisateurs
// ----------------------------------------------------------------------------
// CONFIDENTIALITÉ : un utilisateur ne voit QUE son propre avis (`getMyReview`)
// et ne peut modifier QUE celui-ci (`submitReview`). Les commentaires et les
// statistiques détaillées ne sont servis qu'aux administrateurs, et le contrôle
// est fait ici, côté serveur — jamais dans l'interface seule.
//
// Un seul document par utilisateur : `by_user` est utilisé en lecture puis en
// `patch`, ce qui rend toute soumission supplémentaire idempotente (mise à jour
// de l'avis existant plutôt que doublon).
// ============================================================================

/** Longueur maximale d'un commentaire (contrôlée côté serveur). */
export const MAX_REVIEW_COMMENT_LENGTH = 1000;

/** Libellés officiels de l'échelle de notation. */
export const REVIEW_RATING_LABELS: Record<number, string> = {
  1: "Très insatisfait",
  2: "Insatisfait",
  3: "Moyen",
  4: "Satisfait",
  5: "Excellent",
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/** Administrateur actif uniquement (modérateur / agent support exclus). */
function isPlatformAdmin(user: Doc<"users"> | null): boolean {
  return !!user && user.role === "admin" && user.status !== "disabled";
}

/** Nettoie le commentaire : espaces superflus, taille bornée, vide = absent. */
function normalizeComment(raw: string | undefined): string | undefined {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MAX_REVIEW_COMMENT_LENGTH);
}

function assertValidRating(rating: number): void {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("La note doit être un nombre entier de 1 à 5 étoiles");
  }
}

// ----------------------------------------------------------------------------
// Utilisateur — son propre avis
// ----------------------------------------------------------------------------

/** Avis de l'utilisateur courant (ou null). Aucune donnée d'un autre compte. */
export const getMyReview = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const review = await ctx.db
      .query("platformReviews")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!review) return null;

    return {
      rating: review.rating,
      comment: review.comment ?? "",
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  },
});

/**
 * Crée ou met à jour l'avis de l'utilisateur courant.
 * Une soumission répétée met à jour l'avis existant : jamais de doublon.
 */
export const submitReview = mutation({
  args: {
    rating: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Authentification requise");
    if (user.status === "disabled") throw new Error("Ce compte est désactivé");

    assertValidRating(args.rating);
    const comment = normalizeComment(args.comment);
    const now = Date.now();

    const existing = await ctx.db
      .query("platformReviews")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        rating: args.rating,
        comment,
        updatedAt: now,
      });
      return {
        created: false,
        rating: args.rating,
        comment: comment ?? "",
        updatedAt: now,
      };
    }

    await ctx.db.insert("platformReviews", {
      userId: user._id,
      rating: args.rating,
      comment,
      createdAt: now,
      updatedAt: now,
    });

    return {
      created: true,
      rating: args.rating,
      comment: comment ?? "",
      updatedAt: now,
    };
  },
});

// ----------------------------------------------------------------------------
// Administration — statistiques agrégées + liste des avis
// ----------------------------------------------------------------------------

/** Statistiques globales — réservées aux administrateurs (null sinon). */
export const adminStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!isPlatformAdmin(user)) return null;

    const reviews = await ctx.db.query("platformReviews").collect();
    const total = reviews.length;
    const distribution = [1, 2, 3, 4, 5].map(
      (rating) => reviews.filter((r) => r.rating === rating).length,
    );
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const average = total ? Math.round((sum / total) * 100) / 100 : 0;
    const satisfied = distribution[3] + distribution[4];
    const satisfaction = total ? Math.round((satisfied / total) * 1000) / 10 : 0;

    return {
      total,
      average,
      distribution,
      satisfied,
      satisfaction,
      withComment: reviews.filter((r) => (r.comment ?? "").trim().length > 0)
        .length,
      lastSubmittedAt: total
        ? reviews.reduce((latest, r) => Math.max(latest, r.updatedAt), 0)
        : null,
    };
  },
});

/**
 * Liste complète des avis avec identité du compte — administrateurs uniquement.
 * Filtrage par note, recherche (commentaire / nom / e-mail / société / id) et
 * tri par date sont appliqués côté serveur.
 */
export const adminList = query({
  args: {
    rating: v.optional(
      v.union(
        v.literal(1),
        v.literal(2),
        v.literal(3),
        v.literal(4),
        v.literal(5),
      ),
    ),
    search: v.optional(v.string()),
    sort: v.optional(v.union(v.literal("recent"), v.literal("oldest"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!isPlatformAdmin(user)) return null;

    const rows = await ctx.db
      .query("platformReviews")
      .withIndex("by_created")
      .order(args.sort === "oldest" ? "asc" : "desc")
      .take(1000);

    const enriched = await Promise.all(
      rows.map(async (review) => {
        const owner = await ctx.db.get(review.userId);
        return {
          id: review._id,
          userId: review.userId,
          rating: review.rating,
          comment: review.comment ?? "",
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
          userName: owner?.name ?? null,
          userEmail: owner?.email ?? null,
          userCompany: owner?.company ?? null,
          userImage: owner?.image ?? null,
          userRole: owner?.role ?? null,
        };
      }),
    );

    const queryText = (args.search ?? "").trim().toLowerCase();

    return enriched
      .filter((row) => (args.rating ? row.rating === args.rating : true))
      .filter((row) => {
        if (!queryText) return true;
        const haystack = [
          row.comment,
          row.userName ?? "",
          row.userEmail ?? "",
          row.userCompany ?? "",
          row.userId,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(queryText);
      });
  },
});
