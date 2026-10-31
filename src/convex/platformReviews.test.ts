/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// Helpers
// ============================================================================

async function createTestUser(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{ role: string; name: string; email: string; status: string }> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? "test@test.com",
      role: (overrides.role ?? "user") as any,
      status: (overrides.status ?? "active") as any,
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

async function allReviews(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => ctx.db.query("platformReviews").collect());
}

// ============================================================================
// getMyReview — accès limité à son propre avis
// ============================================================================

describe("platformReviews.getMyReview", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns null when not authenticated", async () => {
    await expect(t.query(api.platformReviews.getMyReview, {})).resolves.toBeNull();
  });

  it("returns null when the user has not rated yet", async () => {
    const userId = await createTestUser(t);
    await expect(
      asUser(t, userId).query(api.platformReviews.getMyReview, {}),
    ).resolves.toBeNull();
  });

  it("never returns another user's review", async () => {
    const alice = await createTestUser(t, { name: "Alice", email: "alice@test.com" });
    const bob = await createTestUser(t, { name: "Bob", email: "bob@test.com" });

    await asUser(t, alice).mutation(api.platformReviews.submitReview, {
      rating: 5,
      comment: "Avis privé d'Alice",
    });

    const bobReview = await asUser(t, bob).query(
      api.platformReviews.getMyReview,
      {},
    );
    expect(bobReview).toBeNull();

    const aliceReview = await asUser(t, alice).query(
      api.platformReviews.getMyReview,
      {},
    );
    expect(aliceReview?.rating).toBe(5);
    expect(aliceReview?.comment).toBe("Avis privé d'Alice");
  });
});

// ============================================================================
// submitReview — création, validation et mise à jour
// ============================================================================

describe("platformReviews.submitReview", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("rejects when not authenticated", async () => {
    await expect(
      t.mutation(api.platformReviews.submitReview, { rating: 4 }),
    ).rejects.toThrow("Authentification requise");
  });

  it("rejects a disabled account", async () => {
    const userId = await createTestUser(t, { status: "disabled" });
    await expect(
      asUser(t, userId).mutation(api.platformReviews.submitReview, { rating: 4 }),
    ).rejects.toThrow("désactivé");
  });

  it("rejects out-of-range or non-integer ratings", async () => {
    const userId = await createTestUser(t);
    const user = asUser(t, userId);

    await expect(
      user.mutation(api.platformReviews.submitReview, { rating: 0 }),
    ).rejects.toThrow("1 à 5");
    await expect(
      user.mutation(api.platformReviews.submitReview, { rating: 6 }),
    ).rejects.toThrow("1 à 5");
    await expect(
      user.mutation(api.platformReviews.submitReview, { rating: 3.5 }),
    ).rejects.toThrow("1 à 5");
  });

  it("saves a rating with a comment", async () => {
    const userId = await createTestUser(t);

    const result = await asUser(t, userId).mutation(
      api.platformReviews.submitReview,
      { rating: 4, comment: "  Très bon outil  " },
    );

    expect(result.created).toBe(true);
    expect(result.rating).toBe(4);

    const review = await asUser(t, userId).query(
      api.platformReviews.getMyReview,
      {},
    );
    expect(review).toMatchObject({ rating: 4, comment: "Très bon outil" });
  });

  it("saves a rating without a comment", async () => {
    const userId = await createTestUser(t);

    await asUser(t, userId).mutation(api.platformReviews.submitReview, {
      rating: 3,
    });

    const review = await asUser(t, userId).query(
      api.platformReviews.getMyReview,
      {},
    );
    expect(review?.rating).toBe(3);
    expect(review?.comment).toBe("");
  });

  it("caps the comment length at 1000 characters", async () => {
    const userId = await createTestUser(t);
    const long = "a".repeat(1200);

    await asUser(t, userId).mutation(api.platformReviews.submitReview, {
      rating: 5,
      comment: long,
    });

    const review = await asUser(t, userId).query(
      api.platformReviews.getMyReview,
      {},
    );
    expect(review?.comment).toHaveLength(1000);
  });

  it("updates the existing review instead of creating a duplicate", async () => {
    const userId = await createTestUser(t);
    const user = asUser(t, userId);

    await user.mutation(api.platformReviews.submitReview, {
      rating: 2,
      comment: "Premier avis",
    });
    const second = await user.mutation(api.platformReviews.submitReview, {
      rating: 5,
      comment: "Deuxième avis",
    });

    expect(second.created).toBe(false);
    const rows = await allReviews(t);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.rating).toBe(5);
    expect(rows[0]!.comment).toBe("Deuxième avis");
  });

  it("keeps one review per user even with two distinct accounts", async () => {
    const alice = await createTestUser(t, { email: "alice@test.com" });
    const bob = await createTestUser(t, { email: "bob@test.com" });

    await asUser(t, alice).mutation(api.platformReviews.submitReview, { rating: 5 });
    await asUser(t, bob).mutation(api.platformReviews.submitReview, { rating: 1 });

    const rows = await allReviews(t);
    expect(rows).toHaveLength(2);
  });
});

// ============================================================================
// adminStats — statistiques réservées aux administrateurs
// ============================================================================

describe("platformReviews.adminStats", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function seedThreeReviews() {
    const u1 = await createTestUser(t, { email: "u1@test.com" });
    const u2 = await createTestUser(t, { email: "u2@test.com" });
    const u3 = await createTestUser(t, { email: "u3@test.com" });

    await asUser(t, u1).mutation(api.platformReviews.submitReview, {
      rating: 5,
      comment: "Excellent",
    });
    await asUser(t, u2).mutation(api.platformReviews.submitReview, { rating: 4 });
    await asUser(t, u3).mutation(api.platformReviews.submitReview, {
      rating: 3,
      comment: "Moyen",
    });
  }

  it("is hidden from regular users and moderators", async () => {
    const user = await createTestUser(t, { role: "user" });
    const moderator = await createTestUser(t, { role: "moderator" });

    await expect(
      asUser(t, user).query(api.platformReviews.adminStats, {}),
    ).resolves.toBeNull();
    await expect(
      asUser(t, moderator).query(api.platformReviews.adminStats, {}),
    ).resolves.toBeNull();
  });

  it("is hidden from unauthenticated visitors", async () => {
    await expect(t.query(api.platformReviews.adminStats, {})).resolves.toBeNull();
  });

  it("computes the exact average, distribution and satisfaction rate", async () => {
    await seedThreeReviews();
    const admin = await createTestUser(t, { role: "admin" });

    const stats = await asUser(t, admin).query(api.platformReviews.adminStats, {});

    expect(stats).not.toBeNull();
    // (5 + 4 + 3) / 3 = 4
    expect(stats!.average).toBe(4);
    expect(stats!.total).toBe(3);
    expect(stats!.distribution).toEqual([0, 0, 1, 1, 1]);
    expect(stats!.satisfied).toBe(2);
    // 2 notes >= 4 sur 3 = 66.7 %
    expect(stats!.satisfaction).toBe(66.7);
    expect(stats!.withComment).toBe(2);
  });

  it("returns zeroed statistics when there is no review", async () => {
    const admin = await createTestUser(t, { role: "admin" });

    const stats = await asUser(t, admin).query(api.platformReviews.adminStats, {});

    expect(stats).toMatchObject({ total: 0, average: 0, satisfaction: 0 });
    expect(stats!.distribution).toEqual([0, 0, 0, 0, 0]);
    expect(stats!.lastSubmittedAt).toBeNull();
  });

  it("recomputes the average when a review is updated", async () => {
    const admin = await createTestUser(t, { role: "admin" });
    const user = await createTestUser(t, { email: "update@test.com" });

    await asUser(t, user).mutation(api.platformReviews.submitReview, { rating: 1 });
    await asUser(t, user).mutation(api.platformReviews.submitReview, { rating: 5 });

    const stats = await asUser(t, admin).query(api.platformReviews.adminStats, {});
    expect(stats!.total).toBe(1);
    expect(stats!.average).toBe(5);
  });
});

// ============================================================================
// adminList — liste détaillée, filtres, recherche, tri
// ============================================================================

describe("platformReviews.adminList", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function seed() {
    const alice = await createTestUser(t, {
      name: "Alice Martin",
      email: "alice@test.com",
    });
    const bob = await createTestUser(t, { name: "Bob Slimani", email: "bob@test.com" });

    await asUser(t, alice).mutation(api.platformReviews.submitReview, {
      rating: 5,
      comment: "Rapports PDF très utiles",
    });
    await asUser(t, bob).mutation(api.platformReviews.submitReview, {
      rating: 2,
      comment: "Estimation du budget trop lente",
    });
    return { alice, bob };
  }

  it("is hidden from regular users", async () => {
    await seed();
    const outsider = await createTestUser(t, { email: "outsider@test.com" });

    await expect(
      asUser(t, outsider).query(api.platformReviews.adminList, {}),
    ).resolves.toBeNull();
  });

  it("returns every review with the account identity for admins", async () => {
    await seed();
    const admin = await createTestUser(t, { role: "admin" });

    const rows = await asUser(t, admin).query(api.platformReviews.adminList, {});

    expect(rows).not.toBeNull();
    expect(rows).toHaveLength(2);
    const alice = rows!.find((row) => row.userEmail === "alice@test.com");
    expect(alice?.userName).toBe("Alice Martin");
    expect(alice?.rating).toBe(5);
    expect(alice?.comment).toBe("Rapports PDF très utiles");
    expect(typeof alice?.userId).toBe("string");
  });

  it("filters by rating", async () => {
    await seed();
    const admin = await createTestUser(t, { role: "admin" });

    const rows = await asUser(t, admin).query(api.platformReviews.adminList, {
      rating: 2,
    });
    expect(rows).toHaveLength(1);
    expect(rows![0]!.comment).toContain("budget");
  });

  it("searches comments and user identity", async () => {
    await seed();
    const admin = await createTestUser(t, { role: "admin" });

    const byComment = await asUser(t, admin).query(
      api.platformReviews.adminList,
      { search: "rapports" },
    );
    expect(byComment).toHaveLength(1);
    expect(byComment![0]!.userEmail).toBe("alice@test.com");

    const byName = await asUser(t, admin).query(api.platformReviews.adminList, {
      search: "slimani",
    });
    expect(byName).toHaveLength(1);
    expect(byName![0]!.rating).toBe(2);
  });

  it("sorts by date, newest first by default", async () => {
    const admin = await createTestUser(t, { role: "admin" });
    const first = await createTestUser(t, { email: "first@test.com" });
    const second = await createTestUser(t, { email: "second@test.com" });

    await asUser(t, first).mutation(api.platformReviews.submitReview, {
      rating: 3,
    });
    // Horodatage distinct garanti pour un tri déterministe
    await t.run(async (ctx) => {
      const rows = await ctx.db.query("platformReviews").collect();
      await ctx.db.patch(rows[0]!._id, {
        createdAt: Date.now() - 60_000,
        updatedAt: Date.now() - 60_000,
      });
    });
    await asUser(t, second).mutation(api.platformReviews.submitReview, {
      rating: 4,
    });

    const recent = await asUser(t, admin).query(api.platformReviews.adminList, {
      sort: "recent",
    });
    expect(recent!.map((row) => row.userEmail)).toEqual([
      "second@test.com",
      "first@test.com",
    ]);

    const oldest = await asUser(t, admin).query(api.platformReviews.adminList, {
      sort: "oldest",
    });
    expect(oldest!.map((row) => row.userEmail)).toEqual([
      "first@test.com",
      "second@test.com",
    ]);
  });
});
