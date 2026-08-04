/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

async function createUser(
  t: ReturnType<typeof convexTest>,
  role: "admin" | "user" | "moderator" = "admin",
  email = "admin@test.com",
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      name: "Test User",
      email,
      role,
      status: "active",
      subscriptionPlan: "free",
      image: undefined,
      company: undefined,
      phone: undefined,
      subscriptionEndDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

const POST_ARGS = {
  title: "Combien coûte une villa en Tunisie ?",
  excerpt: "Un guide complet des prix au m² pour construire une villa en 2026.",
  contentHtml: "<h2>Introduction</h2><p>Contenu de l'article.</p>",
  category: "Prix & Marché",
  tags: ["villa", "prix"],
  status: "published" as const,
};

describe("blog slugify & auth", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("non-admin est rejeté à la création", async () => {
    const userId = await createUser(t, "user", "user@test.com");
    const userT = t.withIdentity({ subject: userId });
    await expect(userT.mutation(api.blog.createPost, POST_ARGS)).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("un modérateur ne peut pas créer d'article (admin uniquement)", async () => {
    const userId = await createUser(t, "moderator", "mod@test.com");
    const modT = t.withIdentity({ subject: userId });
    await expect(modT.mutation(api.blog.createPost, POST_ARGS)).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("getPublishedPosts et getPostBySlug sont publics", async () => {
    const adminId = await createUser(t);
    const adminT = t.withIdentity({ subject: adminId });
    await adminT.mutation(api.blog.createPost, POST_ARGS);

    const posts = await t.query(api.blog.getPublishedPosts, {});
    expect(posts.length).toBe(1);
    expect(posts[0].title).toBe(POST_ARGS.title);

    const bySlug = await t.query(api.blog.getPostBySlug, { slug: posts[0].slug });
    expect(bySlug?.slug).toBe(posts[0].slug);
  });
});

describe("blog lifecycle", () => {
  let t: ReturnType<typeof convexTest>;
  let adminT: ReturnType<typeof convexTest>;
  let adminId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createUser(t);
    adminT = t.withIdentity({ subject: adminId }) as any;
  });

  it("crée un article publié avec slug normalisé", async () => {
    const res = await adminT.mutation(api.blog.createPost, POST_ARGS);
    expect(res.slug).toBe("combien-coute-une-villa-en-tunisie");

    const posts = await t.query(api.blog.getPublishedPosts, {});
    expect(posts).toHaveLength(1);
    expect(posts[0].status).toBe("published");
    expect(posts[0].publishedAt).toBeTruthy();
  });

  it("dépublie puis republie un article", async () => {
    const res = await adminT.mutation(api.blog.createPost, POST_ARGS);
    const id = res.id;

    await adminT.mutation(api.blog.togglePublish, { id });
    let posts = await t.query(api.blog.getPublishedPosts, {});
    expect(posts).toHaveLength(0);

    const draft = await adminT.query(api.blog.getAllPosts, {});
    expect(draft).toHaveLength(1);
    expect(draft[0].status).toBe("draft");

    await adminT.mutation(api.blog.togglePublish, { id });
    posts = await t.query(api.blog.getPublishedPosts, {});
    expect(posts).toHaveLength(1);
  });

  it("met à jour un article (titre, catégorie, SEO)", async () => {
    const res = await adminT.mutation(api.blog.createPost, POST_ARGS);
    await adminT.mutation(api.blog.updatePost, {
      id: res.id,
      title: "Nouveau titre",
      seoTitle: "SEO Villa Tunisie",
      seoDescription: "Description SEO",
      featured: true,
    });

    const posts = await adminT.query(api.blog.getAllPosts, {});
    expect(posts[0].title).toBe("Nouveau titre");
    expect(posts[0].seoTitle).toBe("SEO Villa Tunisie");
    expect(posts[0].featured).toBe(true);
  });

  it("incrémente les vues", async () => {
    const res = await adminT.mutation(api.blog.createPost, POST_ARGS);
    await t.mutation(api.blog.incrementViews, { id: res.id });
    await t.mutation(api.blog.incrementViews, { id: res.id });

    const posts = await t.query(api.blog.getPublishedPosts, {});
    expect(posts[0].views).toBe(2);
  });

  it("supprime un article", async () => {
    const res = await adminT.mutation(api.blog.createPost, POST_ARGS);
    await adminT.mutation(api.blog.deletePost, { id: res.id });

    const posts = await t.query(api.blog.getPublishedPosts, {});
    expect(posts).toHaveLength(0);
  });

  it("filtre par catégorie et par recherche", async () => {
    await adminT.mutation(api.blog.createPost, POST_ARGS);
    await adminT.mutation(api.blog.createPost, {
      ...POST_ARGS,
      title: "Rénover sa cuisine pas cher",
      excerpt: "Des astuces pour moderniser sa cuisine sans exploser le budget.",
      category: "Rénovation",
      tags: ["cuisine"],
      status: "published",
    });

    const byCat = await t.query(api.blog.getPublishedPosts, { category: "Rénovation" });
    expect(byCat).toHaveLength(1);
    expect(byCat[0].title).toContain("cuisine");

    const bySearch = await t.query(api.blog.getPublishedPosts, { search: "villa" });
    expect(bySearch).toHaveLength(1);

    const categories = await t.query(api.blog.getBlogCategories, {});
    expect(categories.map((c) => c.name).sort()).toEqual(
      ["Prix & Marché", "Rénovation"].sort(),
    );
  });

  it("refuse la mise à jour d'un article inexistant", async () => {
    const res = await adminT.mutation(api.blog.createPost, POST_ARGS);
    await adminT.mutation(api.blog.deletePost, { id: res.id });
    await expect(
      adminT.mutation(api.blog.updatePost, {
        id: res.id,
        title: "X",
      }),
    ).rejects.toThrow("Article introuvable");
  });
});
