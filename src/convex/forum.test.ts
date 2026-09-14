/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// Helpers
// ============================================================================

async function insertUser(
  t: ReturnType<typeof convexTest>,
  overrides: Record<string, any> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? `user-${Math.random().toString(36).slice(2)}@test.com`,
      userRole: overrides.userRole ?? "client",
      role: overrides.role ?? "user",
      status: "active",
      subscriptionPlan: "free",
      phone: "+216 99 000 000",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    });
  });
}

async function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

const BASE_POST = {
  title: "Besoin d'un électricien pour rénovation",
  description:
    "Je recherche un professionnel pour refaire l'installation électrique complète de mon appartement à Tunis.",
  requestType: "intervention",
  audience: "public",
};

async function createPost(
  t: ReturnType<typeof convexTest>,
  userId: string,
  overrides: Record<string, any> = {},
) {
  const client = asUser(t, userId);
  return client.mutation(api.forum.createPost, {
    ...BASE_POST,
    ...overrides,
  });
}

// ============================================================================
// createPost
// ============================================================================

describe("forum.createPost", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("rejects unauthenticated users", async () => {
    await expect(
      t.mutation(api.forum.createPost, {
        ...BASE_POST,
        audience: "public",
      }),
    ).rejects.toThrow();
  });

  it("validates title and description", async () => {
    const uid = await insertUser(t);
    await expect(
      createPost(t, uid, { title: "ab" }),
    ).rejects.toThrow("titre");
    await expect(
      createPost(t, uid, { description: "abc" }),
    ).rejects.toThrow("description");
  });

  it("requires a specialty for expert-only audience", async () => {
    const uid = await insertUser(t);
    await expect(
      createPost(t, uid, { audience: "experts" }),
    ).rejects.toThrow("spécialité");
  });

  it("requires a material category for material price requests", async () => {
    const uid = await insertUser(t);
    await expect(
      createPost(t, uid, {
        requestType: "material_price",
        audience: "public",
      }),
    ).rejects.toThrow("catégorie de matériau");
  });

  it("creates a public post with status open", async () => {
    const uid = await insertUser(t);
    const postId = await createPost(t, uid, { specialty: "electricite" });
    const post = await t.run(async (ctx) => ctx.db.get(postId));
    expect(post).not.toBeNull();
    expect(post!.status).toBe("open");
    expect(post!.audience).toBe("public");
    expect(post!.authorId).toBe(uid);
  });
});

// ============================================================================
// Audience permissions (backend enforced)
// ============================================================================

describe("forum audience permissions", () => {
  let t: ReturnType<typeof convexTest>;
  let authorId: string;
  let clientId: string;
  let expertId: string;
  let supplierId: string;
  let adminId: string;
  let expertPostId: string;
  let supplierPostId: string;
  let publicPostId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    authorId = await insertUser(t);
    clientId = await insertUser(t, { userRole: "client", email: "client@test.com" });
    expertId = await insertUser(t, { userRole: "expert", email: "expert@test.com" });
    supplierId = await insertUser(t, { userRole: "supplier", email: "supplier@test.com" });
    adminId = await insertUser(t, { role: "admin", userRole: "client", email: "admin@test.com" });

    // Profils liés (les « rôles » plateforme sont aussi dérivés des profils).
    await t.run(async (ctx) => {
      await ctx.db.insert("expertProfiles", {
        userId: expertId,
        profession: "electricien",
        displayName: "Expert Élec",
        phone: "1",
        email: "expert@test.com",
        specialties: ["electricite"],
        regions: ["tunis"],
        plan: "monthly",
        subscriptionStatus: "active",
        isVisible: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("supplierProfiles", {
        userId: supplierId,
        companyName: "Brico TN",
        phone: "2",
        email: "supplier@test.com",
        address: "Tunis",
        specialties: ["electricite", "beton"],
        regions: ["tunis"],
        plan: "monthly",
        subscriptionStatus: "active",
        isVisible: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    expertPostId = await createPost(t, authorId, {
      audience: "experts",
      specialty: "electricite",
    });
    supplierPostId = await createPost(t, authorId, {
      audience: "suppliers",
      requestType: "material_price",
      materialCategory: "beton",
    });
    publicPostId = await createPost(t, authorId, {});
  });

  it("hides expert-only posts from clients, shows them to experts", async () => {
    // Client : le post expert n'apparaît pas.
    const clientList = await asUser(t, clientId).query(api.forum.listPosts, {});
    expect(clientList.posts.map((p: any) => p._id)).not.toContain(expertPostId);

    // Expert : le post expert apparaît, le post fournisseur non.
    const expertList = await asUser(t, expertId).query(api.forum.listPosts, {});
    const ids = expertList.posts.map((p: any) => p._id);
    expect(ids).toContain(expertPostId);
    expect(ids).not.toContain(supplierPostId);

    // Fournisseur : inverse.
    const supplierList = await asUser(t, supplierId).query(api.forum.listPosts, {});
    const supplierIds = supplierList.posts.map((p: any) => p._id);
    expect(supplierIds).toContain(supplierPostId);
    expect(supplierIds).not.toContain(expertPostId);

    // Auteur et admin voient tout.
    const authorList = await asUser(t, authorId).query(api.forum.listPosts, {});
    expect(authorList.posts.map((p: any) => p._id)).toEqual(
      expect.arrayContaining([expertPostId, supplierPostId, publicPostId]),
    );
    const adminList = await asUser(t, adminId).query(api.forum.listPosts, {});
    expect(adminList.posts.map((p: any) => p._id)).toEqual(
      expect.arrayContaining([expertPostId, supplierPostId]),
    );
  });

  it("detail is null for unauthorized users", async () => {
    const detail = await asUser(t, clientId).query(api.forum.getPostDetail, {
      postId: expertPostId as any,
    });
    expect(detail).toBeNull();
    const expertDetail = await asUser(t, expertId).query(
      api.forum.getPostDetail,
      { postId: expertPostId as any },
    );
    expect(expertDetail?.post._id).toBe(expertPostId);
  });

  it("counts only visible posts", async () => {
    const clientCount = await asUser(t, clientId).query(api.forum.getPostCount, {});
    expect(clientCount).toBe(2); // public + supplier? non : public + rien d'expert → public + aucun
    const expertCount = await asUser(t, expertId).query(api.forum.getPostCount, {});
    expect(expertCount).toBe(2); // public + expert
  });
});

// ============================================================================
// Replies & status
// ============================================================================

describe("forum replies and status", () => {
  let t: ReturnType<typeof convexTest>;
  let authorId: string;
  let expertId: string;
  let otherClientId: string;
  let postId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    authorId = await insertUser(t);
    expertId = await insertUser(t, { userRole: "expert", email: "e@t.com" });
    otherClientId = await insertUser(t, { userRole: "client", email: "c@t.com" });
    await t.run(async (ctx) => {
      await ctx.db.insert("expertProfiles", {
        userId: expertId,
        profession: "architecte",
        displayName: "Arch",
        phone: "1",
        email: "e@t.com",
        specialties: ["architecte"],
        regions: ["tunis"],
        plan: "monthly",
        subscriptionStatus: "active",
        isVisible: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    postId = await createPost(t, authorId, {
      audience: "experts",
      specialty: "architecte",
    });
  });

  it("rejects replies from users who cannot see the post", async () => {
    await expect(
      asUser(t, otherClientId).mutation(api.forum.createReply, {
        postId: postId as any,
        content: "Je réponds",
      }),
    ).rejects.toThrow("accès");
  });

  it("rejects replies on resolved posts", async () => {
    await asUser(t, authorId).mutation(api.forum.updatePostStatus, {
      postId: postId as any,
      status: "resolved",
    });
    await expect(
      asUser(t, expertId).mutation(api.forum.createReply, {
        postId: postId as any,
        content: "Trop tard",
      }),
    ).rejects.toThrow("résolue");
  });

  it("allows the author to reply and notifies participants", async () => {
    await asUser(t, expertId).mutation(api.forum.createReply, {
      postId: postId as any,
      content: "Bonjour, je peux vous aider.",
    });
    const detail = await asUser(t, authorId).query(api.forum.getPostDetail, {
      postId: postId as any,
    });
    expect(detail?.replies.length).toBe(1);
    expect(detail?.replies[0].content).toContain("Bonjour");

    // Notification envoyée à l'auteur.
    const notifs = await t.run(async (ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_user", (q: any) => q.eq("userId", authorId))
        .collect(),
    );
    expect(notifs.some((n) => n.type === "forum_reply")).toBe(true);
  });

  it("only the author or staff can change the status", async () => {
    // L'auteur peut.
    await asUser(t, authorId).mutation(api.forum.updatePostStatus, {
      postId: postId as any,
      status: "in_progress",
    });
    // Un autre utilisateur ne peut pas.
    await expect(
      asUser(t, expertId).mutation(api.forum.updatePostStatus, {
        postId: postId as any,
        status: "resolved",
      }),
    ).rejects.toThrow("auteur");
  });
});

// ============================================================================
// Deletion, reports & admin moderation
// ============================================================================

describe("forum deletion, reports and moderation", () => {
  let t: ReturnType<typeof convexTest>;
  let authorId: string;
  let clientId: string;
  let adminId: string;
  let postId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    authorId = await insertUser(t);
    clientId = await insertUser(t, { userRole: "client", email: "c2@t.com" });
    adminId = await insertUser(t, { role: "admin", email: "a2@t.com" });
    postId = await createPost(t, authorId, {});
  });

  it("only the author or staff can delete a post", async () => {
    await expect(
      asUser(t, clientId).mutation(api.forum.deletePost, {
        postId: postId as any,
      }),
    ).rejects.toThrow("supprimer");
    await asUser(t, adminId).mutation(api.forum.deletePost, {
      postId: postId as any,
    });
    const gone = await t.run(async (ctx) => ctx.db.get(postId as any));
    expect(gone).toBeNull();
  });

  it("prevents duplicate pending reports", async () => {
    await asUser(t, clientId).mutation(api.forum.reportPost, {
      postId: postId as any,
      reason: "Contenu suspect à vérifier",
    });
    await expect(
      asUser(t, clientId).mutation(api.forum.reportPost, {
        postId: postId as any,
        reason: "Encore ce contenu",
      }),
    ).rejects.toThrow("déjà signalé");
  });

  it("staff can list and resolve reports; non-staff cannot", async () => {
    await asUser(t, clientId).mutation(api.forum.reportPost, {
      postId: postId as any,
      reason: "Contenu suspect à vérifier",
    });
    const adminReports = await asUser(t, adminId).query(
      api.forum.adminListReports,
      {},
    );
    expect(adminReports.length).toBe(1);
    expect(adminReports[0].postTitle).toContain("électricien");

    const clientReports = await asUser(t, clientId).query(
      api.forum.adminListReports,
      {},
    );
    expect(clientReports.length).toBe(0);

    await expect(
      asUser(t, clientId).mutation(api.forum.adminResolveReport, {
        reportId: adminReports[0]._id as any,
        status: "dismissed",
      }),
    ).rejects.toThrow();
    await asUser(t, adminId).mutation(api.forum.adminResolveReport, {
      reportId: adminReports[0]._id as any,
      status: "dismissed",
    });
    const after = await asUser(t, adminId).query(api.forum.adminListReports, {
      status: "dismissed",
    });
    expect(after.length).toBe(1);
  });

  it("adminListPosts is staff-only", async () => {
    const clientRes = await asUser(t, clientId).query(
      api.forum.adminListPosts,
      {},
    );
    expect(clientRes.posts.length).toBe(0);
    const adminRes = await asUser(t, adminId).query(api.forum.adminListPosts, {});
    expect(adminRes.posts.length).toBe(1);
  });
});