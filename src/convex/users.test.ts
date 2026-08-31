/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

// ============================================================================
// Test Helpers
// ============================================================================

const modules = import.meta.glob("./**/*.*s");

async function createTestUser(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{
    role: string;
    name: string;
    email: string;
    phone: string | undefined;
    company: string | undefined;
  }> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? "test@test.com",
      role: overrides.role ?? "user",
      status: "active",
      subscriptionPlan: "free",
      image: undefined,
      company: overrides.company,
      phone: overrides.phone,
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
// updateProfile — mutation
// ============================================================================

describe("updateProfile", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  // ── Auth guards ──

  it("rejette avec 'Non connecté' si aucun utilisateur connecté", async () => {
    await expect(
      t.mutation(api.users.updateProfile, { name: "Nouveau nom" }),
    ).rejects.toThrow("Non connecté");
  });

  // ── Single field updates ──

  it("met à jour uniquement le nom", async () => {
    const userId = await createTestUser(t, {
      name: "Ancien nom",
      email: "user@test.com",
    });
    const userT = asUser(t, userId);

    const result = await userT.mutation(api.users.updateProfile, {
      name: "Nouveau nom",
    });

    expect(result).toEqual({ success: true });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user!.name).toBe("Nouveau nom");
    expect(user!.email).toBe("user@test.com"); // unchanged
    expect(user!.phone).toBeUndefined(); // unchanged
    expect(user!.company).toBeUndefined(); // unchanged
  });

  it("met à jour uniquement le téléphone", async () => {
    const userId = await createTestUser(t, {
      name: "Test User",
      email: "user@test.com",
    });
    const userT = asUser(t, userId);

    await userT.mutation(api.users.updateProfile, {
      phone: "+216 55 123 456",
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user!.phone).toBe("+216 55 123 456");
    expect(user!.name).toBe("Test User"); // unchanged
  });

  it("met à jour uniquement l'entreprise", async () => {
    const userId = await createTestUser(t, {
      name: "Test User",
      email: "user@test.com",
    });
    const userT = asUser(t, userId);

    await userT.mutation(api.users.updateProfile, {
      company: "Ma Société SARL",
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user!.company).toBe("Ma Société SARL");
    expect(user!.name).toBe("Test User"); // unchanged
    expect(user!.phone).toBeUndefined(); // unchanged
  });

  // ── Multi-field updates ──

  it("met à jour tous les champs simultanément", async () => {
    const userId = await createTestUser(t, {
      name: "Ancien",
      email: "user@test.com",
    });
    const userT = asUser(t, userId);

    await userT.mutation(api.users.updateProfile, {
      name: "Jean Dupont",
      company: "Dupont Construction",
      phone: "+216 22 333 444",
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user!.name).toBe("Jean Dupont");
    expect(user!.company).toBe("Dupont Construction");
    expect(user!.phone).toBe("+216 22 333 444");
  });

  // ── Undefined values (should not clear existing data) ──

  it("ne supprime pas le téléphone existant quand il n'est pas fourni", async () => {
    const userId = await createTestUser(t, {
      name: "Test",
      email: "user@test.com",
      phone: "+216 99 999 999",
    });
    const userT = asUser(t, userId);

    await userT.mutation(api.users.updateProfile, {
      name: "Mis à jour",
      // phone non fourni
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user!.name).toBe("Mis à jour");
    expect(user!.phone).toBe("+216 99 999 999"); // preserved
  });

  it("ne supprime pas l'entreprise existante quand elle n'est pas fournie", async () => {
    const userId = await createTestUser(t, {
      name: "Test",
      email: "user@test.com",
      company: "SARL Test",
    });
    const userT = asUser(t, userId);

    await userT.mutation(api.users.updateProfile, {
      name: "Mis à jour",
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user!.company).toBe("SARL Test"); // preserved
  });

  // ── Explicit undefined (should not clear existing data) ──

  it("ne supprime pas les champs quand undefined est passé explicitement", async () => {
    const userId = await createTestUser(t, {
      name: "Original Name",
      email: "user@test.com",
      phone: "+216 11 222 333",
      company: "Original SARL",
    });
    const userT = asUser(t, userId);

    await userT.mutation(api.users.updateProfile, {
      name: "Updated Name",
      phone: undefined,
      company: undefined,
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user!.name).toBe("Updated Name");
    expect(user!.phone).toBe("+216 11 222 333"); // preserved (undefined === pas de changement)
    expect(user!.company).toBe("Original SARL"); // preserved
  });

  // ── Phone and company can be set from undefined to a value ──

  it("peut définir un téléphone et une entreprise qui étaient undefined", async () => {
    const userId = await createTestUser(t, {
      name: "User",
      email: "user@test.com",
      phone: undefined,
      company: undefined,
    });
    const userT = asUser(t, userId);

    await userT.mutation(api.users.updateProfile, {
      phone: "+216 77 888 999",
      company: "Nouvelle Entreprise",
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user!.phone).toBe("+216 77 888 999");
    expect(user!.company).toBe("Nouvelle Entreprise");
    expect(user!.name).toBe("User"); // unchanged
  });

  // ── Return value ──

  it("retourne { success: true } après une mise à jour réussie", async () => {
    const userId = await createTestUser(t, {
      name: "Test",
      email: "user@test.com",
    });
    const userT = asUser(t, userId);

    const result = await userT.mutation(api.users.updateProfile, {
      name: "Success Test",
    });

    expect(result).toEqual({ success: true });
  });
});

// ============================================================================
// getCurrentUser — (testé indirectement via updateProfile)
// ============================================================================

describe("getCurrentUser (via updateProfile)", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("renvoie l'utilisateur connecté pour updateProfile (non-admin)", async () => {
    const userId = await createTestUser(t, {
      name: "Simple User",
      email: "simple@test.com",
      role: "user",
    });
    const userT = asUser(t, userId);

    await userT.mutation(api.users.updateProfile, {
      name: "Simple User Updated",
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user!.name).toBe("Simple User Updated");
  });

  it("ne peut pas modifier le profil d'un autre utilisateur avec updateProfile", async () => {
    const userIdA = await createTestUser(t, {
      name: "User A",
      email: "a@test.com",
    });
    const userIdB = await createTestUser(t, {
      name: "User B",
      email: "b@test.com",
    });
    const userAT = asUser(t, userIdA);

    // User A essaie de modifier son propre profil (le seul qu'il peut modifier)
    await userAT.mutation(api.users.updateProfile, {
      name: "User A Modifié",
    });

    // Vérifier que seul User A a été modifié
    const userA = await t.run(async (ctx) => ctx.db.get(userIdA));
    const userB = await t.run(async (ctx) => ctx.db.get(userIdB));
    expect(userA!.name).toBe("User A Modifié");
    expect(userB!.name).toBe("User B"); // unchanged
  });
});

// ============================================================================
// Moderator role — admin panel access
// ============================================================================

describe("Moderator role", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("permet au modérateur de lister tous les utilisateurs", async () => {
    const adminId = await createTestUser(t, { role: "admin", email: "admin@test.com" });
    const moderatorId = await createTestUser(t, { role: "moderator", email: "mod@test.com" });
    await createTestUser(t, { role: "user", email: "user@test.com" });

    const moderatorT = asUser(t, moderatorId);
    const users = await moderatorT.query(api.users.getAllUsers);

    expect(users.length).toBe(3);
  });

  it("refuse getAllUsers à un utilisateur simple", async () => {
    await createTestUser(t, { role: "admin", email: "admin@test.com" });
    const userId = await createTestUser(t, { role: "user", email: "user@test.com" });

    const userT = asUser(t, userId);
    const users = await userT.query(api.users.getAllUsers);
    expect(users).toEqual([]);
  });

  it("permet au modérateur de désactiver un utilisateur", async () => {
    const moderatorId = await createTestUser(t, { role: "moderator", email: "mod@test.com" });
    const targetId = await createTestUser(t, { role: "user", email: "user@test.com" });

    const moderatorT = asUser(t, moderatorId);
    await moderatorT.mutation(api.users.toggleUserStatus, {
      userId: targetId as any,
      status: "disabled",
    });

    const target = await t.run(async (ctx) => ctx.db.get(targetId));
    expect(target!.status).toBe("disabled");
  });

  it("refuse le changement de rôle à un modérateur (admin uniquement)", async () => {
    const moderatorId = await createTestUser(t, { role: "moderator", email: "mod@test.com" });
    const targetId = await createTestUser(t, { role: "user", email: "user@test.com" });

    const moderatorT = asUser(t, moderatorId);
    await expect(
      moderatorT.mutation(api.users.adminUpdateUserRole, {
        userId: targetId as any,
        role: "admin",
      }),
    ).rejects.toThrow("Unauthorized: Admin access required");
  });

  it("refuse la mise à jour du plan à un modérateur (admin uniquement)", async () => {
    const moderatorId = await createTestUser(t, { role: "moderator", email: "mod@test.com" });
    const targetId = await createTestUser(t, { role: "user", email: "user@test.com" });

    const moderatorT = asUser(t, moderatorId);
    await expect(
      moderatorT.mutation(api.users.adminUpdateUserPlan, {
        userId: targetId as any,
        plan: "expert",
      }),
    ).rejects.toThrow("Unauthorized: Admin access required");
  });

  it("crée une demande en attente pour une attribution admin, sans activer l'accès", async () => {
    const adminId = await createTestUser(t, { role: "admin", email: "admin@test.com" });
    const targetId = await createTestUser(t, { role: "user", email: "target@test.com" });

    const adminT = asUser(t, adminId);
    await adminT.mutation(api.users.adminUpdateUserPlan, {
      userId: targetId as any,
      plan: "supplier",
    });

    const target = await t.run(async (ctx) => ctx.db.get(targetId));
    const subscriptions = await t.run(async (ctx) =>
      (await ctx.db.query("subscriptions").collect()).filter((subscription) => subscription.userId === targetId),
    );

    expect(target!.subscriptionPlan).toBe("supplier");
    expect(target!.subscriptionEndDate).toBeUndefined();
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0].status).toBe("pending");
    expect(subscriptions[0].amount).toBe(120);
  });

  it("permet au modérateur de supprimer un utilisateur", async () => {
    const moderatorId = await createTestUser(t, { role: "moderator", email: "mod@test.com" });
    const targetId = await createTestUser(t, { role: "user", email: "user@test.com" });

    const moderatorT = asUser(t, moderatorId);
    await moderatorT.mutation(api.users.deleteUser, {
      userId: targetId as any,
    });

    const target = await t.run(async (ctx) => ctx.db.get(targetId));
    expect(target).toBeNull();
  });
});
