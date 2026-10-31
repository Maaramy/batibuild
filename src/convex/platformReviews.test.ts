/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// Test Helpers
// ============================================================================

async function createTestUser(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{
    role: string;
    name: string;
    email: string;
    status: string;
  }> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? "test@test.com",
      role: overrides.role ?? "user",
      status: overrides.status ?? "active",
      subscriptionPlan: "free",
      image: undefined,
      company: undefined,
      phone: "+216 99 000 000",
      subscriptionEndDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

// ============================================================================
// getMyReview — lecture strictement personnelle
// ============================================================================

describe("platformReviews.getMyReview", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns null when not authenticated", async () => {
    await expect(t.query(api.platformReviews.getMyReview, {})).resolves.toBeNull();
  });

  it("returns null when the user has no review", async () => {
    const userId = await createTestUser(t);
    const me = asUser(t, userId);
    await expect(me.query(api.platformReviews.getMyReview, {})).resolves.toBeNull();
  });

  it("only ever returns the caller's own review", async () => {
    const aliceId = await createTestUser(t, { email: "alice@test.com" });
    const bobId = await createTestUser(t, { email: "bob@test.com" });

    await asUser(t, bobId).mutation(api.platformReviews.submitReview, {
      rating: 2,
      comment: "Avis de Bob",
    });

    const alice = await asUser(t, aliceId).query(
      api.platformReviews.getMyReview,
      {},
    );
    expect(alice).toBeNull();

    const bob = await asUser(t, bobId).query(api.platformReviews.getMyReview, {});
    expect(bob?.rating).toBe(2);
    expect(bob?.comment).toBe("Avis de Bob");
  });
});

// ============================================================================
// submitReview — création, validation, mise à jour
// ============================================================================

describe("platformReviews.submitReview", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("rejects unauthenticated submissions", async () => {
    await expect(
      t.mutation(api.platformReviews.submitReview, { rating: 5 }),
    ).rejects.toThrow();
  });

  it.each([0, 6, 3.5, -1])("rejects invalid rating %s", async (rating) => {
    const userId = await createTestUser(t);
    await expect(
      asUser(t, userId).mutation(api.platformReviews.submitReview, { rating }),
    ).rejects.toThrow();
  });

  it("stores a rating with an optional comment", async () => {
    const userId = await createTestUser(t);
    const me = asUser(t, userId);

    const result = await me.mutation(api.platformReviews.submitReview, {
      rating: 5,
      comment: "  Excellent outil  ",
    });
    expect(result.created).toBe(true);
    expect(result.rating).toBe(5);
    expect(result.comment).toBe("Excellent outil");

    const stored = await t.run(async (ctx) => {
      return ctx.db.query("platformReviews").collect();
    });
    expect(stored).toHaveLength(1);
    expect(stored[0].rating).toBe(5);
    expect(stored[0].comment).toBe("Excellent outil");
  });

  it("accepts a submission without comment and drops blank comments", async () => {
    const userId = await createTestUser(t);
    const me = asUser(t, userId);

    await me.mutation(api.platformReviews.submitReview, { rating: 3 });
    let stored = await t.run(async (ctx) =>
      ctx.db.query("platformReviews").collect(),
    );
    expect(stored[0].comment).toBeUndefined();

    await me.mutation(api.platformReviews.submitReview, {
      rating: 4,
      comment: "   ",
    });
    stored = await t.run(async (ctx) => ctx.db.query("platformReviews").collect());
    expect(stored).toHaveLength(1);
    expect(stored[0].comment).toBeUndefined();
    expect(stored[0].rating).toBe(4);
  });

  it("truncates an over-long comment to 1000 characters", async () => {
    const userId = await createTestUser(t);
    const me = asUser(t, userId);

    await me.mutation(api.platformReviews.submitReview, {
      rating: 4,
      comment: "x".repeat(1500),
    });

    const stored = await t.run(async (ctx) =>
      ctx.db.query("platformReviews").collect(),
    );
    expect(stored[0].comment).toHaveLength(1000);
  });

  it("updates the existing review instead of creating a duplicate", async () => {
    const userId = await createTestUser(t);
    const me = asUser(t, userId);

    const first = await me.mutation(api.platformReviews.submitReview, {
      rating: 2,
      comment: "Bof",
    });
    const second = await me.mutation(api.platformReviews.submitReview, {
      rating: 5,
      comment: "Finalement très bien",
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);

    const stored = await t.run(async (ctx) =>
      ctx.db.query("platformReviews").collect(),
    );
    expect(stored).toHaveLength(1);
    expect(stored[0].rating).toBe(5);
    expect(stored[0].comment).toBe("Finalement très bien");
  });

  it("refuses a disabled account", async () => {
    const userId = await createTestUser(t, { status: "disabled" });
    await expect(
      asUser(t, userId).mutation(api.platformReviews.submitReview, { rating: 5 }),
    ).rejects.toThrow();
  });
});

// ============================================================================
// adminStats / adminList — réservés au rôle admin
// ============================================================================

describe("platformReviews admin access", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: string;
  let userId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createTestUser(t, {
      role: "admin",
      email: "admin@test.com",
      name: "Admin Bati",
    });
    userId = await createTestUser(t, { email: "client@test.com", name: "Client Un" });
  });

  it("hides stats and list from anonymous visitors", async () => {
    await expect(t.query(api.platformReviews.adminStats, {})).resolves.toBeNull();
    await expect(
      t.query(api.platformReviews.adminList, {}),
    ).resolves.toBeNull();
  });

  it("hides stats and list from a normal user", async () => {
    const me = asUser(t, userId);
    await expect(me.query(api.platformReviews.adminStats, {})).resolves.toBeNull();
    await expect(me.query(api.platformReviews.adminList, {})).resolves.toBeNull();
  });

  it("hides stats and list from a moderator and a support agent", async () => {
    const moderatorId = await createTestUser(t, {
      role: "moderator",
      email: "modo@test.com",
    });
    const supportId = await createTestUser(t, {
      role: "support_agent",
      email: "support@test.com",
    });

    await expect(
      asUser(t, moderatorId).query(api.platformReviews.adminStats, {}),
    ).resolves.toBeNull();
    await expect(
      asUser(t, supportId).query(api.platformReviews.adminList, {}),
    ).resolves.toBeNull();
  });

  it("computes average, distribution and satisfaction for admins", async () => {
    const bobId = await createTestUser(t, { email: "bob@test.com" });
    const caraId = await createTestUser(t, { email: "cara@test.com" });

    await asUser(t, userId).mutation(api.platformReviews.submitReview, {
      rating: 5,
      comment: "Parfait",
    });
    await asUser(t, bobId).mutation(api.platformReviews.submitReview, {
      rating: 4,
    });
    await asUser(t, caraId).mutation(api.platformReviews.submitReview, {
      rating: 3,
      comment: "Correct",
    });

    const stats = await asUser(t, adminId).query(
      api.platformReviews.adminStats,
      {},
    );
    expect(stats).not.toBeNull();
    expect(stats!.total).toBe(3);
    expect(stats!.average).toBe(4);
    expect(stats!.distribution).toEqual([0, 0, 1, 1, 1]);
    expect(stats!.satisfied).toBe(2);
    expect(stats!.satisfaction).toBe(66.7);
    expect(stats!.withComment).toBe(2);
  });

  it("returns the reviews with the account identity", async () => {
    await asUser(t, userId).mutation(api.platformReviews.submitReview, {
      rating: 4,
      comment: "Bien",
    });

    const list = await asUser(t, adminId).query(api.platformReviews.adminList, {});
    expect(list).not.toBeNull();
    expect(list).toHaveLength(1);
    expect(list![0].rating).toBe(4);
    expect(list![0].userName).toBe("Client Un");
    expect(list![0].userEmail).toBe("client@test.com");
    expect(list![0].userId).toBe(userId);
  });

  it("filters by rating, searches text and sorts by date", async () => {
    const bobId = await createTestUser(t, { email: "bob@test.com" });
    const admin = asUser(t, adminId);

    await asUser(t, userId).mutation(api.platformReviews.submitReview, {
      rating: 2,
      comment: "Trop lent",
    });
    await asUser(t, bobId).mutation(api.platformReviews.submitReview, {
      rating: 5,
      comment: "Rapide et clair",
    });

    const onlyFive = await admin.query(api.platformReviews.adminList, { rating: 5 });
    expect(onlyFive).toHaveLength(1);
    expect(onlyFive![0].comment).toBe("Rapide et clair");

    const searchSlow = await admin.query(api.platformReviews.adminList, {
      search: "lent",
    });
    expect(searchSlow).toHaveLength(1);
    expect(searchSlow![0].rating).toBe(2);

    const searchNothing = await admin.query(api.platformReviews.adminList, {
      search: "introuvable",
    });
    expect(searchNothing).toHaveLength(0);

    const recent = await admin.query(api.platformReviews.adminList, {
      sort: "recent",
    });
    const oldest = await admin.query(api.platformReviews.adminList, {
      sort: "oldest",
    });
    expect(recent).toHaveLength(2);
    expect(oldest).toHaveLength(2);
    expect(recent![0].id).toBe(oldest![1].id);
  });

  it("recomputes the average when a user updates their review", async () => {
    const admin = asUser(t, adminId);

    await asUser(t, userId).mutation(api.platformReviews.submitReview, {
      rating: 1,
    });
    let stats = await admin.query(api.platformReviews.adminStats, {});
    expect(stats!.average).toBe(1);

    await asUser(t, userId).mutation(api.platformReviews.submitReview, {
      rating: 5,
    });
    stats = await admin.query(api.platformReviews.adminStats, {});
    expect(stats!.total).toBe(1);
    expect(stats!.average).toBe(5);
  });
});
