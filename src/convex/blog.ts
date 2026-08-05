import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ============================================================================
// Blog — public posts + admin management
// ============================================================================

export const BLOG_CATEGORIES = [
  "Conseils construction",
  "Prix & Marché",
  "Rénovation",
  "Architecture",
  "Financement",
  "Actualités",
] as const;

/** Normalize a string into a URL-friendly slug (handles French accents). */
export function slugify(text: string): string {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "article";
}

async function requireAdmin(ctx: any) {
  const user = await getCurrentUser(ctx);
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

// ============================================================================
// Public queries
// ============================================================================

/** List published posts (public). Optional category filter + search. */
export const getPublishedPosts = query({
  args: {
    category: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100);
    let posts = await ctx.db
      .query("blogPosts")
      .withIndex("by_status_published", (q) => q.eq("status", "published"))
      .order("desc")
      .collect();

    if (args.category && args.category !== "all") {
      posts = posts.filter((p) => p.category === args.category);
    }
    if (args.search) {
      const q = args.search.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          (p.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }

    return posts.slice(0, limit);
  },
});

/** Get a single published post by slug (public). */
export const getPostBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("blogPosts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!post || post.status !== "published") return null;
    return post;
  },
});

/** Distinct categories from published posts (public). */
export const getBlogCategories = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("blogPosts")
      .withIndex("by_status_published", (q) => q.eq("status", "published"))
      .collect();
    const counts = new Map<string, number>();
    for (const p of posts) {
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  },
});

/** Recently published posts for the blog sidebar (public). */
export const getRecentPosts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 4, 20);
    return await ctx.db
      .query("blogPosts")
      .withIndex("by_status_published", (q) => q.eq("status", "published"))
      .order("desc")
      .take(limit);
  },
});

// ============================================================================
// Admin queries
// ============================================================================

/** All posts with any status (admin only). */
export const getAllPosts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const posts = await ctx.db.query("blogPosts").order("desc").collect();
    return posts;
  },
});

/** Single post by id (admin only — used by the editor). */
export const getPostById = query({
  args: { id: v.id("blogPosts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});

// ============================================================================
// Admin mutations
// ============================================================================

type PostFields = {
  title: string;
  slug?: string;
  excerpt: string;
  contentHtml: string;
  coverStorageId?: string;
  category: string;
  tags?: string[];
  status: "draft" | "published";
  featured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  seoOgImage?: string;
};

/** Resolve a cover image: given an optional storage id, return its public URL. */
async function resolveCover(
  ctx: any,
  coverStorageId?: string,
  existingUrl?: string,
): Promise<{ url?: string; storageId?: any }> {
  if (!coverStorageId) {
    return { url: existingUrl, storageId: undefined };
  }
  const url = await ctx.storage.getUrl(coverStorageId);
  if (!url) throw new Error("Image introuvable");
  return { url, storageId: coverStorageId };
}

/** Create a blog post (admin only). */
export const createPost = mutation({
  args: {
    title: v.string(),
    excerpt: v.string(),
    contentHtml: v.string(),
    coverStorageId: v.optional(v.id("_storage")),
    category: v.string(),
    tags: v.optional(v.array(v.string())),
    status: v.union(v.literal("draft"), v.literal("published")),
    featured: v.optional(v.boolean()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    seoKeywords: v.optional(v.string()),
    seoOgImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    if (!args.title.trim() || !args.excerpt.trim() || !args.contentHtml.trim()) {
      throw new Error("Titre, résumé et contenu sont obligatoires");
    }

    // Ensure unique slug
    let slug = slugify(args.title);
    const existing = await ctx.db
      .query("blogPosts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existing) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const cover = await resolveCover(ctx, args.coverStorageId);
    const now = Date.now();
    const id = await ctx.db.insert("blogPosts", {
      title: args.title.trim(),
      slug,
      excerpt: args.excerpt.trim(),
      contentHtml: args.contentHtml,
      coverImage: cover.url,
      coverStorageId: cover.storageId,
      category: args.category || "Conseils construction",
      tags: args.tags ?? [],
      authorId: user._id,
      authorName: user.name || user.email || "Administrateur",
      authorImage: user.image,
      status: args.status,
      featured: args.featured ?? false,
      views: 0,
      seoTitle: args.seoTitle,
      seoDescription: args.seoDescription,
      seoKeywords: args.seoKeywords,
      seoOgImage: args.seoOgImage,
      publishedAt: args.status === "published" ? now : undefined,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("adminLogs", {
      adminId: user._id,
      adminName: user.name || "Admin",
      action: args.status === "published" ? "create_blog_post" : "update_blog_post",
      details: `Article créé : ${args.title}`,
      createdAt: now,
    } as any);

    return { id, slug };
  },
});

/** Update a blog post (admin only). */
export const updatePost = mutation({
  args: {
    id: v.id("blogPosts"),
    title: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    contentHtml: v.optional(v.string()),
    coverStorageId: v.optional(v.id("_storage")),
    removeCover: v.optional(v.boolean()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
    featured: v.optional(v.boolean()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    seoKeywords: v.optional(v.string()),
    seoOgImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const post = await ctx.db.get(args.id);
    if (!post) throw new Error("Article introuvable");

    const now = Date.now();
    const patch: Record<string, any> = { updatedAt: now };

    if (args.title !== undefined) {
      if (!args.title.trim()) throw new Error("Le titre est obligatoire");
      patch.title = args.title.trim();
      const slug = slugify(args.title);
      const clash = await ctx.db
        .query("blogPosts")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!clash || clash._id === post._id) patch.slug = slug;
    }
    if (args.excerpt !== undefined) patch.excerpt = args.excerpt.trim();
    if (args.contentHtml !== undefined) patch.contentHtml = args.contentHtml;
    if (args.category !== undefined) patch.category = args.category;
    if (args.tags !== undefined) patch.tags = args.tags;
    if (args.featured !== undefined) patch.featured = args.featured;
    if (args.seoTitle !== undefined) patch.seoTitle = args.seoTitle;
    if (args.seoDescription !== undefined) patch.seoDescription = args.seoDescription;
    if (args.seoKeywords !== undefined) patch.seoKeywords = args.seoKeywords;
    if (args.seoOgImage !== undefined) patch.seoOgImage = args.seoOgImage;

    if (args.removeCover) {
      patch.coverImage = undefined;
      patch.coverStorageId = undefined;
    } else if (args.coverStorageId !== undefined) {
      const cover = await resolveCover(ctx, args.coverStorageId, post.coverImage);
      patch.coverImage = cover.url;
      patch.coverStorageId = cover.storageId;
    }

    // Status transition: publishing sets publishedAt, unpublishing clears it
    if (args.status !== undefined && args.status !== post.status) {
      patch.status = args.status;
      if (args.status === "published" && !post.publishedAt) {
        patch.publishedAt = now;
      }
      if (args.status === "draft") {
        patch.publishedAt = undefined;
      }
    }

    await ctx.db.patch(post._id, patch);

    await ctx.db.insert("adminLogs", {
      adminId: user._id,
      adminName: user.name || "Admin",
      action:
        patch.status === "published"
          ? "publish_blog_post"
          : patch.status === "draft"
            ? "unpublish_blog_post"
            : "update_blog_post",
      details: `Article mis à jour : ${patch.title ?? post.title}`,
      createdAt: now,
    } as any);

    return { id: post._id, slug: patch.slug ?? post.slug };
  },
});

/** Delete a blog post (admin only). */
export const deletePost = mutation({
  args: { id: v.id("blogPosts") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const post = await ctx.db.get(args.id);
    if (!post) throw new Error("Article introuvable");

    if (post.coverStorageId) {
      try {
        await ctx.storage.delete(post.coverStorageId);
      } catch {
        // Non-blocking
      }
    }

    // Remove associated comments
    const comments = await ctx.db
      .query("blogComments")
      .withIndex("by_post_status", (q) => q.eq("postId", args.id))
      .collect();
    for (const c of comments) {
      await ctx.db.delete(c._id);
    }

    await ctx.db.delete(args.id);
    await ctx.db.insert("adminLogs", {
      adminId: user._id,
      adminName: user.name || "Admin",
      action: "delete_blog_post",
      details: `Article supprimé : ${post.title}`,
      createdAt: Date.now(),
    } as any);

    return { success: true };
  },
});

/** Toggle publish status (admin only). */
export const togglePublish = mutation({
  args: { id: v.id("blogPosts") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const post = await ctx.db.get(args.id);
    if (!post) throw new Error("Article introuvable");

    const now = Date.now();
    const next = post.status === "published" ? "draft" : "published";
    await ctx.db.patch(post._id, {
      status: next,
      publishedAt: next === "published" ? (post.publishedAt ?? now) : undefined,
      updatedAt: now,
    });

    await ctx.db.insert("adminLogs", {
      adminId: user._id,
      adminName: user.name || "Admin",
      action: next === "published" ? "publish_blog_post" : "unpublish_blog_post",
      details: `${next === "published" ? "Publié" : "Dépublié"} : ${post.title}`,
      createdAt: now,
    } as any);

    return { id: post._id, status: next };
  },
});

/** Increment the view counter (public, throttled client-side). */
export const incrementViews = mutation({
  args: { id: v.id("blogPosts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.id);
    if (!post) return;
    await ctx.db.patch(args.id, { views: (post.views ?? 0) + 1 });
  },
});

// ============================================================================
// Comments — public reading + authenticated posting + admin moderation
// ============================================================================

/**
 * Comments visible on a post: approved ones for everyone, plus the signed-in
 * author's own pending/rejected comments so they can see the moderation state.
 */
export const getCommentsByPostId = query({
  args: { postId: v.id("blogPosts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const comments = await ctx.db
      .query("blogComments")
      .withIndex("by_post_status", (q) => q.eq("postId", args.postId))
      .order("asc")
      .collect();
    return comments.filter(
      (c) => c.status === "approved" || (user && c.authorId === user._id),
    );
  },
});

/** All comments across every post, joined with post info (admin only). */
export const getAllComments = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const comments = await ctx.db.query("blogComments").order("desc").collect();
    const posts = await ctx.db.query("blogPosts").collect();
    const postMap = new Map(posts.map((p) => [p._id, p]));
    return comments.map((c) => ({
      ...c,
      postTitle: postMap.get(c.postId)?.title ?? "Article supprimé",
      postSlug: postMap.get(c.postId)?.slug ?? "",
    }));
  },
});

/** Post a comment (authenticated users). Created as "pending", awaiting moderation. */
export const addComment = mutation({
  args: { postId: v.id("blogPosts"), content: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Vous devez être connecté pour commenter");

    const content = args.content.trim();
    if (content.length < 3 || content.length > 2000) {
      throw new Error("Le commentaire doit contenir entre 3 et 2000 caractères");
    }

    const post = await ctx.db.get(args.postId);
    if (!post || post.status !== "published") {
      throw new Error("Article introuvable");
    }

    const id = await ctx.db.insert("blogComments", {
      postId: args.postId,
      authorId: user._id,
      authorName: user.name || user.email || "Anonyme",
      authorImage: user.image,
      content,
      status: "pending",
      createdAt: Date.now(),
    });
    return { id };
  },
});

/** Approve or reject a comment (admin only). */
export const moderateComment = mutation({
  args: {
    id: v.id("blogComments"),
    action: v.union(v.literal("approve"), v.literal("reject")),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const comment = await ctx.db.get(args.id);
    if (!comment) throw new Error("Commentaire introuvable");

    const status = args.action === "approve" ? "approved" : "rejected";
    await ctx.db.patch(args.id, { status });
    await ctx.db.insert("adminLogs", {
      adminId: user._id,
      adminName: user.name || "Admin",
      action: args.action === "approve" ? "approve_comment" : "reject_comment",
      details: `Commentaire ${args.action === "approve" ? "approuvé" : "rejeté"} de ${comment.authorName}`,
      createdAt: Date.now(),
    } as any);

    return { id: comment._id, status };
  },
});

/** Delete a comment (admin only). */
export const deleteComment = mutation({
  args: { id: v.id("blogComments") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const comment = await ctx.db.get(args.id);
    if (!comment) throw new Error("Commentaire introuvable");

    await ctx.db.delete(args.id);
    await ctx.db.insert("adminLogs", {
      adminId: user._id,
      adminName: user.name || "Admin",
      action: "delete_comment",
      details: `Commentaire supprimé de ${comment.authorName}`,
      createdAt: Date.now(),
    } as any);

    return { success: true };
  },
});
