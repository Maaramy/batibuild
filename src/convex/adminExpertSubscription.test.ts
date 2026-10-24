/// <reference types="vite/client" />

// ============================================================================
// PROFIL EXPERT ↔ ABONNEMENT EXPERT — INSCRIPTION + ADMINISTRATION
// ----------------------------------------------------------------------------
// Couvre les scénais obligatoires :
//   1. un nouvel utilisateur s'inscrit avec le profil Expert ;
//   2. l'inscription enregistre le compte et le profil dans Convex ;
//   3. l'administrateur attribue l'abonnement Expert (Admin → Utilisateurs) ;
//   4. le profil reste Expert et l'abonnement devient Expert, actif ;
//   5. la compatibilité reste correcte après reconnexion (source serveur) ;
//   6. un utilisateur Client conserve son profil et ses droits ;
//   7. une incompatibilité renvoie un message explicite, sans changer le profil ;
//   8. la désactivation de l'abonnement (« Aucun ») ne touche pas au profil ;
//   9. la liste Admin expose le profil résolu, l'abonnement de référence et la
//      compatibilité — c'est ce qui alimente le « ! » de la colonne Inscription.
// Le champ `userRole` n'est JAMAIS modifié silencieusement.

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";

const modules = import.meta.glob("./**/*.*s");

const DAY_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// Helpers
// ============================================================================

async function createUser(
  t: ReturnType<typeof convexTest>,
  overrides: {
    role?: string;
    email?: string;
    name?: string;
    userRole?: "client" | "supplier" | "expert";
    subscriptionPlan?: string;
  } = {},
) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: overrides.name ?? "Utilisateur Test",
      email: overrides.email ?? "user@test.com",
      role: overrides.role ?? "user",
      status: "active",
      subscriptionPlan: overrides.subscriptionPlan ?? "free",
      userRole: overrides.userRole,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

async function createAdmin(t: ReturnType<typeof convexTest>, email: string) {
  return createUser(t, { role: "admin", email, name: "Admin Test" });
}

/** Profil expert existant mais `userRole` jamais écrit (compte legacy). */
async function createExpertProfile(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  email: string,
) {
  return t.run(async (ctx) =>
    ctx.db.insert("expertProfiles", {
      userId,
      profession: "architecte",
      displayName: "Expert Legacy",
      phone: "+216 22 333 444",
      email,
      specialties: [],
      regions: ["tunis"],
      plan: "none",
      subscriptionStatus: "inactive",
      isVisible: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

async function insertSubscription(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  plan: "pro" | "expert" | "supplier" | "free",
) {
  const now = Date.now();
  return t.run(async (ctx) =>
    ctx.db.insert("subscriptions", {
      userId,
      plan,
      status: "active",
      startDate: now,
      endDate: now + 30 * DAY_MS,
      paymentMethod: "admin",
      amount: 0,
      currency: "TND",
      monthlyDownloadCount: 0,
      downloadLimit: 10,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

async function getUser(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.run(async (ctx) => ctx.db.get(userId));
}

// ============================================================================
// 1→5. Inscription Expert puis attribution admin de l'abonnement Expert
// ============================================================================

describe("Inscription Expert + abonnement Expert attribué par l'administration", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("enregistre le profil Expert à l'inscription (flux Auth) puis conserve l'abonnement Expert", async () => {
    // Compte créé à l'inscription : pas encore de `userRole`.
    const userId = await createUser(t, { email: "nouvel-expert@test.com" });

    // Étape 1 — formulaire d'inscription : profil enregistré, puis type de profil.
    await asUser(t, userId).mutation(api.users.updateProfile, {
      name: "Nouvel Expert",
      phone: "+216 22 333 444",
    });
    const roleResult = await asUser(t, userId).mutation(api.users.setUserRole, {
      userRole: "expert",
    });
    expect(roleResult.success).toBe(true);
    expect(roleResult.compatibility.compatible).toBe(true); // aucun forfait payé
    expect(roleResult.compatibility.expectedPlan).toBe("expert");

    let user = await getUser(t, userId);
    expect(user?.name).toBe("Nouvel Expert");
    expect(user?.phone).toBe("+216 22 333 444");
    expect(user?.userRole).toBe("expert");

    // Étape 2 — Admin → Utilisateurs : attribution de l'abonnement Expert.
    const adminId = await createAdmin(t, "admin-expert@test.com");
    const res = await asUser(t, adminId).mutation(api.users.adminUpdateUserPlan, {
      userId,
      plan: "expert",
    });
    expect(res.planCompatible).toBe(true);
    expect(res.expectedPlan).toBe("expert");
    expect(res.message).toBeUndefined(); // rien à signaler : profil déjà Expert

    // Étape 4 — profil inchangé, abonnement Expert actif, enregistré partout.
    user = await getUser(t, userId);
    expect(user?.userRole).toBe("expert"); // profil conservé
    expect(user?.subscriptionPlan).toBe("expert");
    expect(user?.subscriptionStatus).toBe("active");
    expect(user?.subscriptionEndDate).toBeGreaterThan(Date.now());

    const subs = (await t.run(async (ctx) =>
      ctx.db.query("subscriptions").collect(),
    )).filter((s) => s.userId === userId);
    expect(subs.length).toBe(1);
    expect(subs[0].plan).toBe("expert");
    expect(subs[0].status).toBe("active");

    // Étape 5 — après reconnexion, la source de vérité reste cohérente.
    const compat = await asUser(t, userId).query(
      api.profileSubscription.getMyProfileSubscriptionCompatibility,
    );
    expect(compat!.compatible).toBe(true);
    expect(compat!.profileRole).toBe("expert");
    expect(compat!.activePlan).toBe("expert");
    expect(compat!.activePlanLabel).toBe("Expert");
  });

  it("attribue l'abonnement Expert à un profil Expert legacy (userRole absent) et rend le profil explicite", async () => {
    const userId = await createUser(t, { email: "legacy-expert@test.com" });
    await createExpertProfile(t, userId, "legacy-expert@test.com");

    const adminId = await createAdmin(t, "admin-legacy@test.com");
    const res = await asUser(t, adminId).mutation(api.users.adminUpdateUserPlan, {
      userId,
      plan: "expert",
    });

    // Profil résolu = Expert : attribution déclarée compatible.
    expect(res.planCompatible).toBe(true);
    expect(res.expectedPlan).toBe("expert");
    expect(res.profileAligned).toBe(true);
    expect(res.message).toContain("Expert"); // synchronisation signalée, pas silencieuse

    const user = await getUser(t, userId);
    expect(user?.userRole).toBe("expert"); // champ manquant rendu explicite
    expect(user?.subscriptionPlan).toBe("expert");

    // Traçabilité de l'alignement dans le journal admin.
    const logs = await t.run(async (ctx) =>
      ctx.db.query("adminLogs").order("desc").first(),
    );
    expect(logs?.details).toContain("Profil « Expert » confirmé");
  });

  it("n'aligne jamais silencieusement un profil incompatible", async () => {
    const userId = await createUser(t, {
      email: "client-vedette@test.com",
      userRole: "client",
    });
    const adminId = await createAdmin(t, "admin-mismatch@test.com");

    const res = await asUser(t, adminId).mutation(api.users.adminUpdateUserPlan, {
      userId,
      plan: "expert",
    });

    // Message explicite, sans toucher au profil.
    expect(res.planCompatible).toBe(false);
    expect(res.expectedPlan).toBe("pro");
    expect(res.profileAligned).toBe(false);
    expect(res.message).toContain("Client Pro");

    const user = await getUser(t, userId);
    expect(user?.userRole).toBe("client"); // profil inchangé silencieusement
    expect(user?.subscriptionPlan).toBe("expert"); // override admin assumé, signalé
  });

  it("désactive l'abonnement Expert sans toucher au profil Expert", async () => {
    const userId = await createUser(t, { email: "exp-desab@test.com" });
    await asUser(t, userId).mutation(api.users.setUserRole, { userRole: "expert" });
    const adminId = await createAdmin(t, "admin-desab@test.com");

    await asUser(t, adminId).mutation(api.users.adminUpdateUserPlan, {
      userId,
      plan: "expert",
    });
    const res = await asUser(t, adminId).mutation(api.users.adminUpdateUserPlan, {
      userId,
      plan: "free",
    });
    expect(res.planCompatible).toBe(true); // « free » est compatible avec tout profil

    const user = await getUser(t, userId);
    expect(user?.userRole).toBe("expert"); // profil conservé
    expect(user?.subscriptionPlan).toBe("free");

    const compat = await asUser(t, userId).query(
      api.profileSubscription.getMyProfileSubscriptionCompatibility,
    );
    expect(compat!.compatible).toBe(true);
    expect(compat!.profileRole).toBe("expert");
    expect(compat!.activePlan).toBeNull();
  });

  it("conserve le profil et les droits d'un utilisateur Client", async () => {
    const userId = await createUser(t, {
      email: "client-test@test.com",
      userRole: "client",
    });
    const adminId = await createAdmin(t, "admin-client@test.com");
    const res = await asUser(t, adminId).mutation(api.users.adminUpdateUserPlan, {
      userId,
      plan: "pro",
    });
    expect(res.planCompatible).toBe(true);
    expect(res.expectedPlan).toBe("pro");

    const user = await getUser(t, userId);
    expect(user?.userRole).toBe("client");
    expect(user?.subscriptionPlan).toBe("pro");
  });

  it("refuse l'attribution d'abonnement aux non-administrateurs", async () => {
    const userId = await createUser(t, { email: "exp-secu@test.com", userRole: "expert" });
    await expect(
      asUser(t, userId).mutation(api.users.adminUpdateUserPlan, {
        userId,
        plan: "expert",
      }),
    ).rejects.toThrow("Unauthorized");
  });
});

// ============================================================================
// 8/9. Liste Admin → Utilisateurs : vérité serveur affichée par la colonne
//      « Inscription » (le « ! » ne doit apparaître qu'en cas de vrai conflit)
// ============================================================================

describe("getAllUsers — profil résolu, abonnement de référence, compatibilité", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: Id<"users">;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createAdmin(t, "admin-liste@test.com");
  });

  it("expose la compatibilité calculée par le backend pour chaque compte", async () => {
    // (a) Expert + abonnement Expert → compatible.
    const expertOk = await createUser(t, { email: "a-expert@test.com", userRole: "expert" });
    await insertSubscription(t, expertOk, "expert");
    await t.run((ctx) => ctx.db.patch(expertOk, { subscriptionPlan: "expert" }));

    // (b) Expert + forfait par défaut Client Pro (inscription puis défaut) → conflit réel.
    const expertDefault = await createUser(t, {
      email: "b-expert@test.com",
      userRole: "expert",
      subscriptionPlan: "pro",
    });
    await insertSubscription(t, expertDefault, "pro");

    // (c) Compte legacy expert (profil expert, userRole absent) + Expert → compatible.
    const legacy = await createUser(t, { email: "c-legacy@test.com", subscriptionPlan: "expert" });
    await createExpertProfile(t, legacy, "c-legacy@test.com");
    await insertSubscription(t, legacy, "expert");

    // (d) Client sans forfait → compatible (aucun abonnement payé).
    await createUser(t, { email: "d-client@test.com", userRole: "client" });

    const users = await asUser(t, adminId).query(api.users.getAllUsers);
    const byEmail = (email: string): any => {
      const row = users.find((u: any) => u.email === email);
      if (!row) throw new Error(`Utilisateur introuvable : ${email}`);
      return row;
    };

    const a = byEmail("a-expert@test.com");
    expect(a.profileRole).toBe("expert");
    expect(a.referencePlan).toBe("expert");
    expect(a.profileSubscriptionCompatible).toBe(true);

    const b = byEmail("b-expert@test.com");
    expect(b.profileRole).toBe("expert");
    expect(b.referencePlan).toBe("pro");
    expect(b.profileSubscriptionCompatible).toBe(false); // seul « ! » légitime

    const c = byEmail("c-legacy@test.com");
    // Avant correction : userRole absent → attendu « pro » → « ! » à tort.
    expect(c.profileRole).toBe("expert");
    expect(c.referencePlan).toBe("expert");
    expect(c.profileSubscriptionCompatible).toBe(true);

    const d = byEmail("d-client@test.com");
    expect(d.profileRole).toBe("client");
    expect(d.profileSubscriptionCompatible).toBe(true);
  });

  it("reste vide pour un visiteur non administrateur", async () => {
    const userId = await createUser(t, { email: "anonyme@test.com" });
    const users = await asUser(t, userId).query(api.users.getAllUsers);
    expect(users).toEqual([]);
  });
});
