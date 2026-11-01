import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { getCurrentUser } from "./users";
import type { Doc } from "./_generated/dataModel";

// ============================================================================
// Avis « Notez BatiBuild » — satisfaction de la plateforme
// ============================================================================
//
// CONFIDENTIALITÉ (exigence absolue) :
//   • les notes et les commentaires ne sont lisibles QUE par un administrateur
//     (`role === "admin"`) — vérifié CÔTÉ SERVEUR dans chaque handler ;
//   • aucun commentaire ni note individuelle n'est exposé publiquement ;
//   • un utilisateur ne lit QUE son propre avis (`getMyReview`).
//
// Règles produit :
//   • note entière de 1 à 5 (obligatoire), commentaire facultatif ;
//   • UN SEUL avis actif par utilisateur : la seconde soumission met à jour
//     l'avis existant au lieu d'en créer un second ;
//   • une resoumission identique est ignorée (anti double-clic), elle ne
//     crée ni ne modifie rien.

/** Note minimale acceptée. */
export const MIN_RATING = 1;
/** Note maximale acceptée. */
export const MAX_RATING = 5;
/** Longueur maximale du commentaire (caractères). */
export const MAX_COMMENT_LENGTH = 1000;

/**
 * Contrôle d'accès serveur : administrateur strict.
 *
 * Les modérateurs n'y ont PAS accès : les avis contiennent des opinions
 * nominatives des utilisateurs, ressort administratif (cf. Factures).
 */
async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Non authentifié");
  if (user.role !== "admin") throw new Error("Accès réservé aux administrateurs");
  return user;
}

/** Valide et normalise la note (entier strict entre 1 et 5). */
function normalizeRating(rating: number): number {
  if (!Number.isInteger(rating)) throw new Error("La note doit être un entier entre 1 et 5");
  if (rating < MIN_RATING || rating > MAX_RATING) {
    throw new Error(`La note doit être comprise entre ${MIN_RATING} et ${MAX_RATING}`);
  }
  return rating;
}

/** Normalise le commentaire : trim, longueur bornée, `undefined` si vide. */
function normalizeComment(comment: string | undefined): string | undefined {
  if (comment === undefined || comment === null) return undefined;
  const trimmed = comment.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Le commentaire ne doit pas dépasser ${MAX_COMMENT_LENGTH} caractères`);
  }
  return trimmed;
}

// ============================================================================
// Côté utilisateur
// ============================================================================

/**
 * Enregistre l'avis de l'utilisateur (création ou modification).
 *
 * Idempotence : une soumission strictement identique à l'avis déjà enregistré
 * est ignorée (renvoie `alreadyRecorded: true`) — protège contre les doubles
 * clics et les re-envois accidentels sans jamais créer de second avis.
 */
export const submitReview = mutation({
  args: {
    rating: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");

    const rating = normalizeRating(args.rating);
    const comment = normalizeComment(args.comment);

    const existing = await ctx.db
      .query("platformReviews")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    // Double-clic / re-envoi accidentel : identique → aucune écriture.
    if (existing && existing.rating === rating && existing.comment === comment) {
      return {
        success: true,
        created: false,
        updated: false,
        alreadyRecorded: true,
        reviewId: existing._id,
      };
    }

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { rating, comment, updatedAt: now });
      return { success: true, created: false, updated: true, alreadyRecorded: false, reviewId: existing._id };
    }

    const reviewId = await ctx.db.insert("platformReviews", {
      userId: user._id,
      rating,
      comment,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, created: true, updated: false, alreadyRecorded: false, reviewId };
  },
});

/** Avis de l'utilisateur connecté (le sien uniquement) — null s'il n'y en a pas. */
export const getMyReview = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const review = await ctx.db
      .query("platformReviews")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!review) return null;
    return {
      rating: review.rating,
      comment: review.comment ?? "",
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  },
});

// ============================================================================
// Côté administrateur — STRICTEMENT réservé aux administrateurs
// ============================================================================

export interface ReviewStats {
  /** Moyenne générale (somme des notes / nombre d'évaluations), 0 si vide. */
  average: number;
  /** Nombre total d'évaluations. */
  total: number;
  /** Répartition 1 → 5. */
  distribution: Record<string, number>;
  /** Part des notes 4 et 5 (en %, 0 si aucune évaluation). */
  satisfactionPct: number;
  /** Évolution dans le temps (par jour, croissant). */
  trend: { day: string; count: number; average: number }[];
}

/**
 * Statistiques agrégées : moyenne, total, répartition, satisfaction et
 * évolution journalière. Calculées à la volée à partir de l'index `by_date`,
 * donc toujours à jour après création, modification ou suppression.
 */
export const getReviewStats = query({
  args: {},
  handler: async (ctx): Promise<ReviewStats> => {
    await requireAdmin(ctx);

    const reviews = await ctx.db
      .query("platformReviews")
      .withIndex("by_date")
      .collect();

    const total = reviews.length;
    const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    let sum = 0;
    let satisfied = 0;

    const byDay = new Map<string, { count: number; sum: number }>();

    for (const r of reviews) {
      sum += r.rating;
      distribution[String(r.rating)] = (distribution[String(r.rating)] ?? 0) + 1;
      if (r.rating >= 4) satisfied += 1;

      const d = new Date(r.createdAt);
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const bucket = byDay.get(day) ?? { count: 0, sum: 0 };
      bucket.count += 1;
      bucket.sum += r.rating;
      byDay.set(day, bucket);
    }

    const trend = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, b]) => ({
        day,
        count: b.count,
        average: Math.round((b.sum / b.count) * 100) / 100,
      }));

    return {
      average: total > 0 ? Math.round((sum / total) * 100) / 100 : 0,
      total,
      distribution,
      satisfactionPct: total > 0 ? Math.round((satisfied / total) * 100) : 0,
      trend,
    };
  },
});

export interface ReviewListItem {
  _id: string;
  rating: number;
  comment: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
  userName: string;
  userEmail: string;
}

/**
 * Liste des avis pour l'administration : filtre par note, recherche plein
 * texte (nom, e-mail, commentaire) et tri par date. Trié du plus récent au
 * plus ancien par défaut.
 */
export const listReviews = query({
  args: {
    rating: v.optional(v.number()),
    search: v.optional(v.string()),
    sortDesc: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<ReviewListItem[]> => {
    await requireAdmin(ctx);

    let reviews = await ctx.db.query("platformReviews").withIndex("by_date").collect();

    if (args.rating !== undefined && args.rating !== null) {
      const wanted = normalizeRating(args.rating);
      reviews = reviews.filter((r) => r.rating === wanted);
    }

    const needle = (args.search ?? "").trim().toLowerCase();
    const items: ReviewListItem[] = [];
    for (const r of reviews) {
      const user = await ctx.db.get(r.userId);
      const userName = user?.name ?? "Anonyme";
      const userEmail = user?.email ?? "";
      if (needle) {
        const haystack = `${userName} ${userEmail} ${r.comment ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) continue;
      }
      items.push({
        _id: r._id,
        rating: r.rating,
        comment: r.comment ?? "",
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        userId: r.userId,
        userName,
        userEmail,
      });
    }

    items.sort((a, b) => (args.sortDesc === false ? a.createdAt - b.createdAt : b.createdAt - a.createdAt));
    return items;
  },
});

/** Supprime un avis inapproprié — administrateur uniquement. */
export const deleteReview = mutation({
  args: { reviewId: v.id("platformReviews") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new Error("Avis introuvable");
    await ctx.db.delete(args.reviewId);
    return { success: true };
  },
});
