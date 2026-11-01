/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// Helpers
// ============================================================================

async function createUser(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{ role: string; email: string; name: string }> = {},
) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: overrides.name ?? "Utilisateur Test",
      email: overrides.email ?? "user@test.com",
      role: overrides.role ?? "user",
      status: "active",
      subscriptionPlan: "free",
      phone: "+216 99 000 000",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

const as = (t: ReturnType<typeof convexTest>, userId: string) =>
  t.withIdentity({ subject: userId });

// ============================================================================

describe("platformReviews — soumission d'un avis", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createUser(t);
  });

  it("enregistre une note AVEC commentaire", async () => {
    const res = await as(t, userId).mutation(api.platformReviews.submitReview, {
      rating: 4,
      comment: "Très bon outil d'estimation, les prix tunisiens sont justes.",
    });

    expect(res.success).toBe(true);
    expect(res.created).toBe(true);
    expect(res.updated).toBe(false);

    const stored = await t.run(async (ctx) => ctx.db.get(res.reviewId));
    expect(stored).not.toBeNull();
    expect(stored!.rating).toBe(4);
    expect(stored!.comment).toBe("Très bon outil d'estimation, les prix tunisiens sont justes.");
    expect(stored!.userId).toBe(userId);
    expect(stored!.createdAt).toBeGreaterThan(0);
    expect(stored!.updatedAt).toBe(stored!.createdAt);
  });

  it("enregistre une note SANS commentaire (commentaire facultatif)", async () => {
    const res = await as(t, userId).mutation(api.platformReviews.submitReview, { rating: 3 });

    expect(res.created).toBe(true);

    const stored = await t.run(async (ctx) => ctx.db.get(res.reviewId));
    expect(stored!.rating).toBe(3);
    expect(stored!.comment).toBeUndefined();
  });

  it("normalise un commentaire vide en commentaire absent", async () => {
    const res = await as(t, userId).mutation(api.platformReviews.submitReview, {
      rating: 5,
      comment: "   ",
    });

    const stored = await t.run(async (ctx) => ctx.db.get(res.reviewId));
    expect(stored!.comment).toBeUndefined();
  });

  it("rejette une note hors bornes (0 et 6)", async () => {
    await expect(
      as(t, userId).mutation(api.platformReviews.submitReview, { rating: 0 }),
    ).rejects.toThrow("La note doit être comprise entre 1 et 5");
    await expect(
      as(t, userId).mutation(api.platformReviews.submitReview, { rating: 6 }),
    ).rejects.toThrow("La note doit être comprise entre 1 et 5");
  });

  it("rejette une note non entière (3.5)", async () => {
    await expect(
      as(t, userId).mutation(api.platformReviews.submitReview, { rating: 3.5 }),
    ).rejects.toThrow("La note doit être un entier entre 1 et 5");
  });

  it("rejette un commentaire trop long", async () => {
    await expect(
      as(t, userId).mutation(api.platformReviews.submitReview, {
        rating: 3,
        comment: "a".repeat(1001),
      }),
    ).rejects.toThrow("ne doit pas dépasser 1000 caractères");
  });

  it("refuse la soumission d'un utilisateur non authentifié", async () => {
    await expect(
      t.mutation(api.platformReviews.submitReview, { rating: 5 }),
    ).rejects.toThrow("Non authentifié");
  });
});

describe("platformReviews — un seul avis actif par utilisateur", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createUser(t);
  });

  it("MODIFIE l'avis existant au lieu d'en créer un second", async () => {
    const first = await as(t, userId).mutation(api.platformReviews.submitReview, {
      rating: 2,
      comment: "Moyen.",
    });
    expect(first.created).toBe(true);

    const second = await as(t, userId).mutation(api.platformReviews.submitReview, {
      rating: 5,
      comment: "Finalement excellent après la mise à jour des prix.",
    });

    expect(second.updated).toBe(true);
    expect(second.created).toBe(false);

    const all = await t.run(async (ctx) => ctx.db.query("platformReviews").collect());
    expect(all).toHaveLength(1);
    expect(all[0].rating).toBe(5);
    expect(all[0].comment).toBe("Finalement excellent après la mise à jour des prix.");
  });

  it("ignore une soumission identique (anti double-clic accidentel)", async () => {
    const first = await as(t, userId).mutation(api.platformReviews.submitReview, {
      rating: 4,
      comment: "Satisfait.",
    });

    const dup = await as(t, userId).mutation(api.platformReviews.submitReview, {
      rating: 4,
      comment: "Satisfait.",
    });

    expect(dup.alreadyRecorded).toBe(true);
    expect(dup.updated).toBe(false);
    expect(dup.created).toBe(false);
    expect(dup.reviewId).toEqual(first.reviewId);

    const all = await t.run(async (ctx) => ctx.db.query("platformReviews").collect());
    expect(all).toHaveLength(1);
  });

  it("conserve un avis distinct par utilisateur", async () => {
    const otherId = await createUser(t, { email: "other@test.com" });

    await as(t, userId).mutation(api.platformReviews.submitReview, { rating: 1 });
    await as(t, otherId).mutation(api.platformReviews.submitReview, { rating: 5 });

    const all = await t.run(async (ctx) => ctx.db.query("platformReviews").collect());
    expect(all).toHaveLength(2);
  });
});

describe("platformReviews — getMyReview (confidentialité de l'avis personnel)", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createUser(t);
  });

  it("retourne null sans avis", async () => {
    const mine = await as(t, userId).query(api.platformReviews.getMyReview, {});
    expect(mine).toBeNull();
  });

  it("retourne l'avis de l'utilisateur connecté", async () => {
    await as(t, userId).mutation(api.platformReviews.submitReview, {
      rating: 4,
      comment: "Bien.",
    });

    const mine = await as(t, userId).query(api.platformReviews.getMyReview, {});
    expect(mine).toEqual(
      expect.objectContaining({ rating: 4, comment: "Bien." }),
    );
  });

  it("ne retourne JAMAIS l'avis d'un autre utilisateur", async () => {
    const otherId = await createUser(t, { email: "autre@test.com" });
    await as(t, otherId).mutation(api.platformReviews.submitReview, {
      rating: 1,
      comment: "Commentaire privé de l'autre.",
    });

    const mine = await as(t, userId).query(api.platformReviews.getMyReview, {});
    expect(mine).toBeNull();
  });
});

describe("platformReviews — calcul de la moyenne (getReviewStats)", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createUser(t, { role: "admin", email: "admin@test.com" });
  });

  const seed = async (ratings: number[]) => {
    for (const [i, rating] of ratings.entries()) {
      const id = await createUser(t, { email: `u${i}@test.com`, name: `User ${i}` });
      await as(t, id).mutation(api.platformReviews.submitReview, { rating });
    }
  };

  it("moyenne = somme des notes / nombre total d'évaluations", async () => {
    await seed([5, 4, 3, 2, 1]);

    const stats = await as(t, adminId).query(api.platformReviews.getReviewStats, {});
    // (5+4+3+2+1) / 5 = 3
    expect(stats.total).toBe(5);
    expect(stats.average).toBe(3);
  });

  it("moyenne arrondie à 2 décimales", async () => {
    await seed([5, 4, 4]);

    const stats = await as(t, adminId).query(api.platformReviews.getReviewStats, {});
    expect(stats.total).toBe(3);
    expect(stats.average).toBe(4.33);
  });

  it("répartition et pourcentage de satisfaction (notes 4 et 5)", async () => {
    await seed([5, 5, 4, 3, 2, 1]);

    const stats = await as(t, adminId).query(api.platformReviews.getReviewStats, {});
    expect(stats.distribution).toEqual({ "1": 1, "2": 1, "3": 1, "4": 1, "5": 2 });
    expect(stats.satisfactionPct).toBe(50); // 3 notes >= 4 sur 6
  });

  it("statistiques vides par défaut", async () => {
    const stats = await as(t, adminId).query(api.platformReviews.getReviewStats, {});
    expect(stats.total).toBe(0);
    expect(stats.average).toBe(0);
    expect(stats.satisfactionPct).toBe(0);
    expect(stats.trend).toEqual([]);
  });

  it("évolution dans le temps : regroupe par jour", async () => {
    await seed([5, 4]);
    await t.run(async (ctx) => {
      const all = await ctx.db.query("platformReviews").collect();
      // Rétrodate un avis à la veille pour obtenir deux jours distincts.
      await ctx.db.patch(all[1]._id, { createdAt: all[1].createdAt - 86_400_000 });
    });

    const stats = await as(t, adminId).query(api.platformReviews.getReviewStats, {});
    expect(stats.trend).toHaveLength(2);
    expect(stats.trend[0].count).toBe(1);
    expect(stats.trend[1].count).toBe(1);
    expect(stats.trend.map((d) => d.day).sort()).toEqual([...stats.trend.map((d) => d.day)]);
  });
});

describe("platformReviews — actualisation après suppression", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: string;
  let userId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createUser(t, { role: "admin", email: "admin@test.com" });
    userId = await createUser(t, { email: "user@test.com" });
  });

  it("recalcule la moyenne et la répartition après suppression", async () => {
    const a = await as(t, userId).mutation(api.platformReviews.submitReview, { rating: 5 });
    const otherId = await createUser(t, { email: "u2@test.com" });
    await as(t, otherId).mutation(api.platformReviews.submitReview, { rating: 1 });

    let stats = await as(t, adminId).query(api.platformReviews.getReviewStats, {});
    expect(stats.total).toBe(2);
    expect(stats.average).toBe(3);

    await as(t, adminId).mutation(api.platformReviews.deleteReview, { reviewId: a.reviewId });

    stats = await as(t, adminId).query(api.platformReviews.getReviewStats, {});
    expect(stats.total).toBe(1);
    expect(stats.average).toBe(1);
    expect(stats.distribution).toEqual({ "1": 1, "2": 0, "3": 0, "4": 0, "5": 0 });
    expect(stats.satisfactionPct).toBe(0);
  });

  it("refuse la suppression d'un avis inexistant", async () => {
    // Id au bon format, mais dont le document a été retiré : la mutation doit
    // refuser plutôt que de réussir silencieusement.
    const ghostId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("platformReviews", {
        userId: userId as never,
        rating: 3,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.delete(id);
      return id;
    });

    await expect(
      as(t, adminId).mutation(api.platformReviews.deleteReview, { reviewId: ghostId }),
    ).rejects.toThrow("Avis introuvable");
  });
});

describe("platformReviews — confidentialité et autorisations (serveur)", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: string;
  let userId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createUser(t, { role: "admin", email: "admin@test.com" });
    userId = await createUser(t, { email: "user@test.com" });
    await as(t, userId).mutation(api.platformReviews.submitReview, {
      rating: 2,
      comment: "Commentaire strictement privé.",
    });
  });

  it("un utilisateur standard ne peut PAS lire les statistiques d'administration", async () => {
    await expect(
      as(t, userId).query(api.platformReviews.getReviewStats, {}),
    ).rejects.toThrow("Accès réservé aux administrateurs");
  });

  it("un utilisateur standard ne peut PAS lister les avis des autres", async () => {
    await expect(
      as(t, userId).query(api.platformReviews.listReviews, {}),
    ).rejects.toThrow("Accès réservé aux administrateurs");
  });

  it("un modérateur ne peut PAS consulter les avis (admin strict)", async () => {
    const moderatorId = await createUser(t, { role: "moderator", email: "mod@test.com" });
    await expect(
      as(t, moderatorId).query(api.platformReviews.getReviewStats, {}),
    ).rejects.toThrow("Accès réservé aux administrateurs");
    await expect(
      as(t, moderatorId).query(api.platformReviews.listReviews, {}),
    ).rejects.toThrow("Accès réservé aux administrateurs");
    await expect(
      as(t, moderatorId).mutation(api.platformReviews.deleteReview, {
        reviewId: (await t.run(async (ctx) => {
          const r = await ctx.db.query("platformReviews").first();
          return r!._id;
        })) as never,
      }),
    ).rejects.toThrow("Accès réservé aux administrateurs");
  });

  it("un visiteur non authentifié n'accède à rien", async () => {
    await expect(t.query(api.platformReviews.getReviewStats, {})).rejects.toThrow(
      "Non authentifié",
    );
    await expect(t.query(api.platformReviews.listReviews, {})).rejects.toThrow("Non authentifié");
    await expect(t.query(api.platformReviews.getMyReview, {})).resolves.toBeNull();
  });

  it("l'administrateur lit la liste complète, enrichie de l'utilisateur", async () => {
    const list = await as(t, adminId).query(api.platformReviews.listReviews, {});
    expect(list).toHaveLength(1);
    expect(list[0].rating).toBe(2);
    expect(list[0].comment).toBe("Commentaire strictement privé.");
    expect(list[0].userName).toBe("Utilisateur Test");
    expect(list[0].userEmail).toBe("user@test.com");
  });
});

describe("platformReviews — filtrage, recherche et tri (admin)", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createUser(t, { role: "admin", email: "admin@test.com" });

    const a = await createUser(t, { email: "amine@test.com", name: "Amine Ben Ali" });
    await as(t, a).mutation(api.platformReviews.submitReview, {
      rating: 5,
      comment: "Excellent, je recommande.",
    });
    const b = await createUser(t, { email: "sara@test.com", name: "Sara Trabelsi" });
    await as(t, b).mutation(api.platformReviews.submitReview, {
      rating: 2,
      comment: "L'estimation était trop élevée.",
    });
    const c = await createUser(t, { email: "karim@test.com", name: "Karim Mansour" });
    await as(t, c).mutation(api.platformReviews.submitReview, { rating: 4 });
  });

  it("filtre par nombre d'étoiles", async () => {
    const list = await as(t, adminId).query(api.platformReviews.listReviews, { rating: 5 });
    expect(list).toHaveLength(1);
    expect(list[0].userName).toBe("Amine Ben Ali");
  });

  it("recherche par nom ou commentaire", async () => {
    const byName = await as(t, adminId).query(api.platformReviews.listReviews, { search: "sara" });
    expect(byName).toHaveLength(1);
    expect(byName[0].userEmail).toBe("sara@test.com");

    const byComment = await as(t, adminId).query(api.platformReviews.listReviews, {
      search: "recommande",
    });
    expect(byComment).toHaveLength(1);
    expect(byComment[0].rating).toBe(5);
  });

  it("trie par date (récent par défaut, ancien sur demande)", async () => {
    const desc = await as(t, adminId).query(api.platformReviews.listReviews, {});
    expect(desc).toHaveLength(3);
    expect(desc[0].createdAt).toBeGreaterThanOrEqual(desc[1].createdAt);
    expect(desc[1].createdAt).toBeGreaterThanOrEqual(desc[2].createdAt);

    const asc = await as(t, adminId).query(api.platformReviews.listReviews, { sortDesc: false });
    expect(asc[0].createdAt).toBeLessThanOrEqual(asc[1].createdAt);
  });

  it("un filtre de note hors bornes est refusé", async () => {
    await expect(
      as(t, adminId).query(api.platformReviews.listReviews, { rating: 9 }),
    ).rejects.toThrow("La note doit être comprise entre 1 et 5");
  });
});
