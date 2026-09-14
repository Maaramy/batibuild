import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import {
  forumAttachmentValidator,
  forumAudienceValidator,
  forumRequestTypeValidator,
  forumStatusValidator,
} from "./schema";

// ============================================================================
// Forum d'Assistance — publications, réponses, signalements
//
// Sécurité (côté serveur, jamais frontend) :
//   - lecture : l'utilisateur ne voit que les publications auxquelles son
//     audience donne droit (public / experts / fournisseurs), l'auteur et le
//     staff (admin / modérateur) voient tout ;
//   - écriture : création = tout utilisateur authentifié ; modification /
//     statut / suppression = auteur (ou staff) ; réponse = autorisé à lire ;
//     signalement = tout utilisateur authentifié, une seule fois par cible.
// ============================================================================

// ----------------------------------------------------------------------------
// Types & constantes
// ----------------------------------------------------------------------------

export const FORUM_REQUEST_TYPE_LABELS: Record<string, string> = {
  intervention: "Demande d'intervention",
  consultation: "Consultation d'expert",
  material_price: "Demande de prix de matériaux",
};

export const FORUM_AUDIENCE_LABELS: Record<string, string> = {
  public: "Tout le monde",
  experts: "Experts uniquement",
  suppliers: "Fournisseurs uniquement",
};

export const FORUM_STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
};

const MAX_ATTACHMENTS = 5;

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/** Staff de la plateforme : voit tout le contenu du forum. */
function isStaff(user: Doc<"users"> | null): boolean {
  return user?.role === "admin" || user?.role === "moderator";
}

/** L'utilisateur dispose-t-il d'un profil expert ? */
async function isExpertUser(
  ctx: any,
  user: Doc<"users">,
): Promise<boolean> {
  if (user.userRole === "expert") return true;
  const profile = await ctx.db
    .query("expertProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
    .first();
  return profile !== null;
}

/** L'utilisateur dispose-t-il d'un profil fournisseur ? */
async function isSupplierUser(
  ctx: any,
  user: Doc<"users">,
): Promise<boolean> {
  if (user.userRole === "supplier") return true;
  const profile = await ctx.db
    .query("supplierProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
    .first();
  return profile !== null;
}

/** Droit de lecture d'un post (appliqué côté serveur sur chaque requête). */
async function canViewPost(
  ctx: any,
  user: Doc<"users"> | null,
  post: Doc<"forumPosts">,
): Promise<boolean> {
  if (!user) return false;
  if (post.authorId === user._id) return true;
  if (isStaff(user)) return true;
  if (post.audience === "public") return true;
  if (post.audience === "experts") return await isExpertUser(ctx, user);
  if (post.audience === "suppliers") return await isSupplierUser(ctx, user);
  return false;
}

/** Insère une notification interne (best-effort, ne bloque jamais le flux). */
async function pushNotification(
  ctx: any,
  params: {
    userId: Id<"users">;
    type: "forum_new_request" | "forum_reply" | "forum_reported";
    title: string;
    message: string;
    link?: string;
  },
) {
  try {
    await ctx.db.insert("notifications", {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      read: false,
      createdAt: Date.now(),
    });
  } catch {
    // best-effort
  }
}

/** Suppression best-effort des fichiers stockés d'une liste de pièces jointes. */
async function deleteAttachments(
  ctx: any,
  attachments: Array<{ storageId: Id<"_storage"> }> | undefined,
) {
  for (const a of attachments ?? []) {
    try {
      await ctx.storage.delete(a.storageId);
    } catch {
      // best-effort
    }
  }
}

/** Infos publiques d'un auteur (profil expert / fournisseur inclus). */
async function buildAuthorInfo(ctx: any, userId: Id<"users">) {
  const u = await ctx.db.get(userId);
  if (!u) return null;
  const info: Record<string, any> = {
    _id: u._id,
    name: u.name ?? null,
    image: u.image ?? null,
    userRole: u.userRole ?? null,
  };
  if (u.userRole === "supplier") {
    const p = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", u._id))
      .first();
    if (p) {
      info.companyName = p.companyName;
      info.logo = p.logo ?? null;
      info.profession = (p.specialties ?? [])[0] ?? null;
    }
  } else if (u.userRole === "expert") {
    const p = await ctx.db
      .query("expertProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", u._id))
      .first();
    if (p) {
      info.companyName = p.companyName ?? null;
      info.displayName = p.displayName ?? null;
      info.logo = p.logo ?? null;
      info.profession = p.profession ?? null;
    }
  }
  return info;
}

/** Filtre d'appartenance (toutes les conditions sont optionnelles et combinables). */
function matchesFilters(
  post: Doc<"forumPosts">,
  f: {
    requestType?: string;
    status?: string;
    audience?: string;
    specialty?: string;
    materialCategory?: string;
    dateFrom?: number;
    dateTo?: number;
    search?: string;
  },
): boolean {
  if (f.requestType && post.requestType !== f.requestType) return false;
  if (f.status && post.status !== f.status) return false;
  if (f.audience && post.audience !== f.audience) return false;
  if (f.specialty && post.specialty !== f.specialty) return false;
  if (
    f.materialCategory &&
    post.materialCategory !== f.materialCategory
  )
    return false;
  if (f.dateFrom && post.createdAt < f.dateFrom) return false;
  if (f.dateTo && post.createdAt > f.dateTo) return false;
  if (f.search) {
    const q = f.search.trim().toLowerCase();
    if (!q) return true;
    if (post.title.toLowerCase().includes(q)) return true;
    if (post.description.toLowerCase().includes(q)) return true;
    return false;
  }
  return true;
}

// ----------------------------------------------------------------------------
// Queries — utilisateur
// ----------------------------------------------------------------------------

/**
 * Liste paginée des publications **visibles** par l'utilisateur courant.
 *
 * Pagination par curseur sur l'index `by_created` ; les filtres combinables
 * (type, statut, audience, spécialité, matériau, dates, recherche) sont
 * appliqués côté serveur après la page indexée. La recherche fonctionne sur
 * le titre et la description.
 */
export const listPosts = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
    requestType: v.optional(forumRequestTypeValidator),
    status: v.optional(forumStatusValidator),
    audience: v.optional(forumAudienceValidator),
    specialty: v.optional(v.string()),
    materialCategory: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    sort: v.optional(
      v.union(
        v.literal("recent"),
        v.literal("oldest"),
        v.literal("most_replies"),
        v.literal("last_activity"),
      ),
    ),
    authorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { posts: [], nextCursor: null, isDone: true };

    const limit = Math.min(Math.max(args.limit ?? 12, 1), 30);
    const asc = args.sort === "oldest";
    const base = ctx.db
      .query("forumPosts")
      .withIndex("by_created")
      .order(asc ? "asc" : "desc");

    const f = {
      requestType: args.requestType,
      status: args.status,
      audience: args.audience,
      specialty: args.specialty,
      materialCategory: args.materialCategory,
      dateFrom: args.dateFrom,
      dateTo: args.dateTo,
      search: args.search,
    };

    // Candidats à trier en mémoire (classements non indexés) : on collecte
    // jusqu'à `limit * 2` correspondances puis on trie et on coupe.
    const want = args.sort === "most_replies" || args.sort === "last_activity"
      ? limit * 2
      : limit;

    let cursor: string | null = args.cursor ?? null;
    let collected: Doc<"forumPosts">[] = [];
    let nextCursor: string | null = args.cursor ?? null;
    let isDone = false;
    let scannedPages = 0;
    const maxPages = 40;

    while (collected.length < want && !isDone && scannedPages < maxPages) {
      const res = await base.paginate({ cursor, numItems: 24 });
      scannedPages += 1;
      isDone = res.isDone;
      nextCursor = res.continueCursor === cursor ? null : res.continueCursor;
      if (res.page.length === 0) {
        isDone = true;
        break;
      }
      for (const post of res.page) {
        if (args.authorId && post.authorId !== args.authorId) continue;
        const visible = await canViewPost(ctx, user, post);
        if (!visible) continue;
        if (!matchesFilters(post, f)) continue;
        collected.push(post);
      }
      cursor = nextCursor;
    }

    if (args.sort === "most_replies") {
      const counts = new Map<string, number>();
      for (const p of collected) {
        const replies = await ctx.db
          .query("forumReplies")
          .withIndex("by_post", (q: any) => q.eq("postId", p._id))
          .collect();
        counts.set(p._id, replies.length);
      }
      collected.sort(
        (a, b) => (counts.get(b._id) ?? 0) - (counts.get(a._id) ?? 0),
      );
    } else if (args.sort === "last_activity") {
      collected.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
    }

    const page = collected.slice(0, limit);
    const posts = await Promise.all(
      page.map(async (post) => {
        const [author, replies] = await Promise.all([
          buildAuthorInfo(ctx, post.authorId),
          ctx.db
            .query("forumReplies")
            .withIndex("by_post", (q: any) => q.eq("postId", post._id))
            .collect(),
        ]);
        return {
          ...post,
          author,
          replyCount: replies.length,
          attachmentCount: post.attachments?.length ?? 0,
        };
      }),
    );

    return {
      posts,
      nextCursor: isDone ? null : nextCursor,
      isDone,
    };
  },
});

/** Nombre de publications visibles (en-tête du forum). Borne à 2 000 balayés. */
export const getPostCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;
    const recent = await ctx.db
      .query("forumPosts")
      .withIndex("by_created")
      .order("desc")
      .take(2000);
    let n = 0;
    for (const post of recent) {
      if (await canViewPost(ctx, user, post)) n += 1;
    }
    return n;
  },
});

/**
 * Détail d'une publication + toutes ses réponses (avec auteur et pièces
 * jointes résolues). Renvoie `null` si l'utilisateur n'a pas le droit de
 * lecture, ou si la publication n'existe pas.
 */
export const getPostDetail = query({
  args: { postId: v.id("forumPosts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const post = await ctx.db.get(args.postId);
    if (!post) return null;
    if (!(await canViewPost(ctx, user, post))) return null;

    const [author, replies] = await Promise.all([
      buildAuthorInfo(ctx, post.authorId),
      ctx.db
        .query("forumReplies")
        .withIndex("by_post", (q: any) => q.eq("postId", post._id))
        .order("asc")
        .collect(),
    ]);

    const repliesWithMeta = await Promise.all(
      replies.map(async (r) => {
        const replyAuthor = await buildAuthorInfo(ctx, r.authorId);
        const attachments = await Promise.all(
          (r.attachments ?? []).map(async (a) => ({
            ...a,
            url:
              (await ctx.storage.getUrl(a.storageId as Id<"_storage">)) ??
              undefined,
          })),
        );
        return { ...r, author: replyAuthor, attachments };
      }),
    );

    const postAttachments = await Promise.all(
      (post.attachments ?? []).map(async (a) => ({
        ...a,
        url:
          (await ctx.storage.getUrl(a.storageId as Id<"_storage">)) ??
          undefined,
      })),
    );

    return {
      post: { ...post, author, attachmentCount: post.attachments?.length ?? 0 },
      attachments: postAttachments,
      replies: repliesWithMeta,
    };
  },
});

// ----------------------------------------------------------------------------
// Queries — administration (staff uniquement)
// ----------------------------------------------------------------------------

/** Toutes les publications (admin / modérateur), même non autorisées. */
export const adminListPosts = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
    status: v.optional(forumStatusValidator),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || !isStaff(user)) {
      return { posts: [], nextCursor: null, isDone: true };
    }
    const limit = Math.min(Math.max(args.limit ?? 15, 1), 50);
    const base = ctx.db
      .query("forumPosts")
      .withIndex("by_created")
      .order("desc");
    let cursor: string | null = args.cursor ?? null;
    let collected: Doc<"forumPosts">[] = [];
    let nextCursor: string | null = args.cursor ?? null;
    let isDone = false;
    let scannedPages = 0;
    const maxPages = 40;

    while (collected.length < limit && !isDone && scannedPages < maxPages) {
      const res = await base.paginate({ cursor, numItems: 30 });
      scannedPages += 1;
      isDone = res.isDone;
      nextCursor = res.continueCursor === cursor ? null : res.continueCursor;
      if (res.page.length === 0) {
        isDone = true;
        break;
      }
      for (const post of res.page) {
        if (args.status && post.status !== args.status) continue;
        if (args.search) {
          const q = args.search.trim().toLowerCase();
          if (
            q &&
            !post.title.toLowerCase().includes(q) &&
            !post.description.toLowerCase().includes(q)
          ) {
            continue;
          }
        }
        collected.push(post);
      }
      cursor = nextCursor;
    }

    const page = collected.slice(0, limit);
    const posts = await Promise.all(
      page.map(async (post) => {
        const [author, replies] = await Promise.all([
          buildAuthorInfo(ctx, post.authorId),
          ctx.db
            .query("forumReplies")
            .withIndex("by_post", (q: any) => q.eq("postId", post._id))
            .collect(),
        ]);
        return {
          ...post,
          author,
          replyCount: replies.length,
          attachmentCount: post.attachments?.length ?? 0,
        };
      }),
    );
    return { posts, nextCursor: isDone ? null : nextCursor, isDone };
  },
});

/** Signalements (admin / modérateur), avec la cible et le signalant. */
export const adminListReports = query({
  args: { status: v.optional(v.union(v.literal("pending"), v.literal("reviewed"), v.literal("dismissed"))) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || !isStaff(user)) return [];

    const rows = args.status
      ? await ctx.db
          .query("forumReports")
          .withIndex("by_status", (q: any) => q.eq("status", args.status))
          .order("desc")
          .collect()
      : await ctx.db
          .query("forumReports")
          .withIndex("by_created")
          .order("desc")
          .collect();

    return await Promise.all(
      rows.slice(0, 100).map(async (report) => {
        const reporter = await ctx.db.get(report.reporterId);
        const post = report.postId ? await ctx.db.get(report.postId) : null;
        const reply = report.replyId ? await ctx.db.get(report.replyId) : null;
        return {
          ...report,
          reporterName: reporter?.name ?? reporter?.email ?? "Utilisateur",
          postTitle: post?.title ?? null,
          postAuthorId: post?.authorId ?? null,
          replySnippet: reply?.content?.slice(0, 120) ?? null,
        };
      }),
    );
  },
});

// ----------------------------------------------------------------------------
// Mutations — utilisateur
// ----------------------------------------------------------------------------

/** Création d'une demande (tout utilisateur authentifié). */
export const createPost = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    requestType: forumRequestTypeValidator,
    specialty: v.optional(v.string()),
    materialCategory: v.optional(v.string()),
    materialName: v.optional(v.string()),
    audience: forumAudienceValidator,
    location: v.optional(
      v.object({
        region: v.optional(v.string()),
        city: v.optional(v.string()),
        zone: v.optional(v.string()),
      }),
    ),
    budget: v.optional(v.number()),
    attachments: v.optional(v.array(forumAttachmentValidator)),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Authentification requise");
    if (user.status === "disabled") throw new ConvexError("Compte désactivé");

    const title = args.title.trim();
    const description = args.description.trim();
    if (title.length < 3) {
      throw new ConvexError("Le titre doit contenir au moins 3 caractères.");
    }
    if (title.length > 140) {
      throw new ConvexError("Le titre ne peut pas dépasser 140 caractères.");
    }
    if (description.length < 5) {
      throw new ConvexError(
        "La description doit contenir au moins 5 caractères.",
      );
    }
    if (description.length > 5000) {
      throw new ConvexError(
        "La description ne peut pas dépasser 5 000 caractères.",
      );
    }
    if (args.audience === "experts" && !args.specialty) {
      throw new ConvexError(
        "Choisissez la spécialité de l'expert ciblé pour cette audience.",
      );
    }
    if (args.requestType === "material_price" && !args.materialCategory) {
      throw new ConvexError(
        "Choisissez une catégorie de matériau pour cette demande de prix.",
      );
    }
    if ((args.attachments?.length ?? 0) > MAX_ATTACHMENTS) {
      throw new ConvexError(
        `Maximum ${MAX_ATTACHMENTS} pièces jointes par demande.`,
      );
    }
    if (args.budget !== undefined && (args.budget < 0 || args.budget > 1_000_000_000)) {
      throw new ConvexError("Budget indicatif invalide.");
    }

    const now = Date.now();
    const postId = await ctx.db.insert("forumPosts", {
      authorId: user._id,
      title,
      description,
      requestType: args.requestType,
      specialty: args.specialty,
      materialCategory: args.materialCategory,
      materialName: args.materialName,
      audience: args.audience,
      location: args.location,
      budget: args.budget,
      status: "open",
      attachments: args.attachments,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    });

    // Notifications ciblées (voir section 10 du cahier des charges).
    await notifyTargetedUsers(ctx, {
      postId: postId as Id<"forumPosts">,
      post: {
        authorId: user._id,
        audience: args.audience,
        specialty: args.specialty,
        materialCategory: args.materialCategory,
        title,
      },
    });

    return postId;
  },
});

/** Notifie les experts / fournisseurs correspondant à l'audience choisie. */
async function notifyTargetedUsers(
  ctx: any,
  params: {
    postId: Id<"forumPosts">;
    post: {
      authorId: Id<"users">;
      audience: "public" | "experts" | "suppliers";
      specialty?: string;
      materialCategory?: string;
      title: string;
    };
  },
) {
  if (params.post.audience === "public") return; // pas de notifications de masse

  const candidates = await ctx.db
    .query("users")
    .filter((q: any) =>
      q.eq(
        q.field("userRole"),
        params.post.audience === "experts" ? "expert" : "supplier",
      ),
    )
    .take(200);

  const matching: Id<"users">[] = [];
  for (const c of candidates) {
    if (c._id === params.post.authorId) continue;
    if (params.post.audience === "experts") {
      const profile = await ctx.db
        .query("expertProfiles")
        .withIndex("by_user", (q: any) => q.eq("userId", c._id))
        .first();
      if (!profile) continue;
      const spec = params.post.specialty?.toLowerCase() ?? "";
      if (
        spec &&
        (profile.specialties.some(
          (s: string) => s.toLowerCase() === spec,
        ) ||
          profile.profession?.toLowerCase() === spec)
      ) {
        matching.push(c._id);
      }
    } else {
      const profile = await ctx.db
        .query("supplierProfiles")
        .withIndex("by_user", (q: any) => q.eq("userId", c._id))
        .first();
      if (!profile) continue;
      const cat = params.post.materialCategory?.toLowerCase() ?? "";
      if (
        cat &&
        profile.specialties.some(
          (s: string) => s.toLowerCase() === cat,
        )
      ) {
        matching.push(c._id);
      }
    }
  }

  // Si aucune correspondance précise, notifier un échantillon (borne fixe)
  // afin que la demande ne reste jamais invisible.
  const targets =
    matching.length > 0
      ? matching
      : candidates
          .filter((c: Doc<"users">) => c._id !== params.post.authorId)
          .slice(0, 50)
          .map((c: Doc<"users">) => c._id);

  const isExperts = params.post.audience === "experts";
  for (const uid of targets) {
    await pushNotification(ctx, {
      userId: uid,
      type: "forum_new_request",
      title: isExperts
        ? "Nouvelle demande d'assistance"
        : "Nouvelle demande de prix",
      message: isExperts
        ? "Une nouvelle demande correspondant à votre spécialité vient d'être publiée."
        : "Une nouvelle demande correspondant à votre domaine vient d'être publiée.",
      link: `/forum/${params.postId}`,
    });
  }
}

/** Réponse à une demande — réservée aux utilisateurs autorisés à la lire. */
export const createReply = mutation({
  args: {
    postId: v.id("forumPosts"),
    content: v.string(),
    attachments: v.optional(v.array(forumAttachmentValidator)),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Authentification requise");
    if (user.status === "disabled") throw new ConvexError("Compte désactivé");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new ConvexError("Demande introuvable.");
    if (!(await canViewPost(ctx, user, post))) {
      throw new ConvexError("Vous n'avez pas accès à cette demande.");
    }
    if (post.status === "resolved") {
      throw new ConvexError(
        "Cette demande est résolue : vous ne pouvez plus y répondre.",
      );
    }

    const content = args.content.trim();
    if (content.length === 0 && (args.attachments?.length ?? 0) === 0) {
      throw new ConvexError("Votre réponse est vide.");
    }
    if (content.length > 5000) {
      throw new ConvexError(
        "La réponse ne peut pas dépasser 5 000 caractères.",
      );
    }
    if ((args.attachments?.length ?? 0) > MAX_ATTACHMENTS) {
      throw new ConvexError(
        `Maximum ${MAX_ATTACHMENTS} pièces jointes par réponse.`,
      );
    }

    const now = Date.now();
    await ctx.db.insert("forumReplies", {
      postId: args.postId,
      authorId: user._id,
      content,
      attachments: args.attachments,
      createdAt: now,
    });
    await ctx.db.patch(args.postId, { lastActivityAt: now });

    // Notifications : auteur + participants (jamais soi-même).
    if (post.authorId !== user._id) {
      await pushNotification(ctx, {
        userId: post.authorId,
        type: "forum_reply",
        title: "Nouvelle réponse à votre demande",
        message: "Un professionnel a répondu à votre demande.",
        link: `/forum/${args.postId}`,
      });
    }
    const otherParticipants = await ctx.db
      .query("forumReplies")
      .withIndex("by_post", (q: any) => q.eq("postId", args.postId))
      .collect();
    const notified = new Set<Id<"users">>([post.authorId, user._id]);
    for (const r of otherParticipants) {
      if (notified.has(r.authorId)) continue;
      notified.add(r.authorId);
      await pushNotification(ctx, {
        userId: r.authorId,
        type: "forum_reply",
        title: "Nouvelle réponse à votre demande",
        message: "Une nouvelle réponse a été ajoutée à la discussion.",
        link: `/forum/${args.postId}`,
      });
    }

    return { success: true };
  },
});

/** Changement de statut — auteur de la demande ou staff uniquement. */
export const updatePostStatus = mutation({
  args: {
    postId: v.id("forumPosts"),
    status: forumStatusValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Authentification requise");
    const post = await ctx.db.get(args.postId);
    if (!post) throw new ConvexError("Demande introuvable.");
    if (post.authorId !== user._id && !isStaff(user)) {
      throw new ConvexError(
        "Seul l'auteur de la demande peut modifier son statut.",
      );
    }
    await ctx.db.patch(args.postId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/** Modification d'une publication — auteur uniquement. */
export const updatePost = mutation({
  args: {
    postId: v.id("forumPosts"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    specialty: v.optional(v.string()),
    materialCategory: v.optional(v.string()),
    materialName: v.optional(v.string()),
    location: v.optional(
      v.object({
        region: v.optional(v.string()),
        city: v.optional(v.string()),
        zone: v.optional(v.string()),
      }),
    ),
    budget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Authentification requise");
    const post = await ctx.db.get(args.postId);
    if (!post) throw new ConvexError("Demande introuvable.");
    if (post.authorId !== user._id) {
      throw new ConvexError("Seul l'auteur peut modifier cette demande.");
    }

    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) {
      const title = args.title.trim();
      if (title.length < 3) {
        throw new ConvexError("Le titre doit contenir au moins 3 caractères.");
      }
      patch.title = title;
    }
    if (args.description !== undefined) {
      const description = args.description.trim();
      if (description.length < 5) {
        throw new ConvexError(
          "La description doit contenir au moins 5 caractères.",
        );
      }
      patch.description = description;
    }
    if (args.specialty !== undefined) patch.specialty = args.specialty;
    if (args.materialCategory !== undefined) {
      patch.materialCategory = args.materialCategory;
    }
    if (args.materialName !== undefined) patch.materialName = args.materialName;
    if (args.location !== undefined) patch.location = args.location;
    if (args.budget !== undefined) patch.budget = args.budget;
    if (Object.keys(patch).length > 0) patch.updatedAt = Date.now();

    await ctx.db.patch(args.postId, patch);
    return { success: true };
  },
});

/** Suppression — auteur ou staff. Supprime réponses, signalements et fichiers. */
export const deletePost = mutation({
  args: { postId: v.id("forumPosts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Authentification requise");
    const post = await ctx.db.get(args.postId);
    if (!post) throw new ConvexError("Demande introuvable.");
    if (post.authorId !== user._id && !isStaff(user)) {
      throw new ConvexError("Vous ne pouvez pas supprimer cette demande.");
    }

    const replies = await ctx.db
      .query("forumReplies")
      .withIndex("by_post", (q: any) => q.eq("postId", args.postId))
      .collect();
    for (const r of replies) {
      await deleteAttachments(ctx, r.attachments as any);
      await ctx.db.delete(r._id);
    }
    const reports = await ctx.db
      .query("forumReports")
      .filter((q: any) => q.eq(q.field("postId"), args.postId))
      .collect();
    for (const report of reports) await ctx.db.delete(report._id);
    await deleteAttachments(ctx, post.attachments as any);
    await ctx.db.delete(args.postId);
    return { success: true };
  },
});

/** Suppression d'une réponse — auteur de la réponse, auteur du post ou staff. */
export const deleteReply = mutation({
  args: { replyId: v.id("forumReplies") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Authentification requise");
    const reply = await ctx.db.get(args.replyId);
    if (!reply) throw new ConvexError("Réponse introuvable.");
    const post = await ctx.db.get(reply.postId);
    if (!post) throw new ConvexError("Demande introuvable.");

    const allowed =
      reply.authorId === user._id ||
      post.authorId === user._id ||
      isStaff(user);
    if (!allowed) {
      throw new ConvexError("Vous ne pouvez pas supprimer cette réponse.");
    }
    await deleteAttachments(ctx, reply.attachments as any);
    await ctx.db.delete(args.replyId);
    return { success: true };
  },
});

/** Signalement d'une publication (une seule fois par utilisateur). */
export const reportPost = mutation({
  args: {
    postId: v.id("forumPosts"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Authentification requise");
    const post = await ctx.db.get(args.postId);
    if (!post) throw new ConvexError("Demande introuvable.");
    if (!(await canViewPost(ctx, user, post))) {
      throw new ConvexError("Vous n'avez pas accès à cette demande.");
    }
    const reason = args.reason.trim();
    if (reason.length < 5) {
      throw new ConvexError(
        "Veuillez préciser le motif du signalement (au moins 5 caractères).",
      );
    }
    const existing = await ctx.db
      .query("forumReports")
      .withIndex("by_reporter", (q: any) => q.eq("reporterId", user._id))
      .filter((q: any) =>
        q.eq(q.field("postId"), args.postId),
      )
      .collect();
    if (existing.some((r: any) => r.status === "pending")) {
      throw new ConvexError("Vous avez déjà signalé cette demande.");
    }
    await ctx.db.insert("forumReports", {
      postId: args.postId,
      reporterId: user._id,
      reason,
      status: "pending",
      createdAt: Date.now(),
    });

    // Alerte discrète du staff.
    const admins = await ctx.db
      .query("users")
      .filter((q: any) =>
        q.or(
          q.eq(q.field("role"), "admin"),
          q.eq(q.field("role"), "moderator"),
        ),
      )
      .take(20);
    for (const a of admins) {
      await pushNotification(ctx, {
        userId: a._id,
        type: "forum_reported",
        title: "Contenu signalé",
        message: `Une publication du forum a été signalée : « ${post.title.slice(0, 60)} »`,
        link: "/dashboard/admin?tab=forum",
      });
    }
    return { success: true };
  },
});

/** Signalement d'une réponse. */
export const reportReply = mutation({
  args: {
    replyId: v.id("forumReplies"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Authentification requise");
    const reply = await ctx.db.get(args.replyId);
    if (!reply) throw new ConvexError("Réponse introuvable.");
    const post = await ctx.db.get(reply.postId);
    if (!post) throw new ConvexError("Demande introuvable.");
    if (!(await canViewPost(ctx, user, post))) {
      throw new ConvexError("Vous n'avez pas accès à cette demande.");
    }
    const reason = args.reason.trim();
    if (reason.length < 5) {
      throw new ConvexError(
        "Veuillez préciser le motif du signalement (au moins 5 caractères).",
      );
    }
    const existing = await ctx.db
      .query("forumReports")
      .withIndex("by_reporter", (q: any) => q.eq("reporterId", user._id))
      .filter((q: any) => q.eq(q.field("replyId"), args.replyId))
      .collect();
    if (existing.some((r: any) => r.status === "pending")) {
      throw new ConvexError("Vous avez déjà signalé cette réponse.");
    }
    await ctx.db.insert("forumReports", {
      replyId: args.replyId,
      reporterId: user._id,
      reason,
      status: "pending",
      createdAt: Date.now(),
    });
    return { success: true };
  },
});

// ----------------------------------------------------------------------------
// Mutations — administration
// ----------------------------------------------------------------------------

/** Traitement d'un signalement (staff) : « traité » ou « rejeté ». */
export const adminResolveReport = mutation({
  args: {
    reportId: v.id("forumReports"),
    status: v.union(v.literal("reviewed"), v.literal("dismissed")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || !isStaff(user)) {
      throw new ConvexError("Accès réservé à l'administration.");
    }
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError("Signalement introuvable.");
    await ctx.db.patch(args.reportId, { status: args.status });
    return { success: true };
  },
});