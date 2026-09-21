/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

// ============================================================================
// Suppression complète d'un utilisateur (cascade admin)
// ============================================================================

const modules = import.meta.glob("./**/*.*s");

async function createUser(
  t: ReturnType<typeof convexTest>,
  overrides: { name?: string; email?: string; role?: string } = {},
) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: overrides.name ?? "Client Test",
      email: overrides.email ?? `user${Math.random()}@test.com`,
      role: overrides.role ?? "user",
      status: "active",
      subscriptionPlan: "free",
      image: undefined,
      company: undefined,
      phone: undefined,
      subscriptionEndDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

const asUser = (t: ReturnType<typeof convexTest>, userId: string) =>
  t.withIdentity({ subject: userId });

/** Compte de données variées pour un utilisateur (projets, profils, abonnements…). */
async function seedUserData(
  t: ReturnType<typeof convexTest>,
  userId: string,
  overrides: { email?: string } = {},
) {
  const now = Date.now();
  return t.run(async (ctx) => {
    const email = overrides.email ?? "client@test.com";

    // Projets + fichier téléversé (référence storage simulée par un doc reports)
    const project1 = await ctx.db.insert("projects", {
      userId: userId as any,
      name: "Villa Test",
      category: "villa",
      status: "completed",
      files: [{ name: "plan.pdf", type: "application/pdf", storageId: undefined }],
      createdAt: now,
      updatedAt: now,
    });
    const project2 = await ctx.db.insert("projects", {
      userId: userId as any,
      name: "Rénovation Test",
      category: "renovation_complete",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    // Données dérivées du projet
    await ctx.db.insert("reports", {
      projectId: project1 as any,
      userId: userId as any,
      type: "pdf",
      generatedAt: now,
    });
    await ctx.db.insert("projectRoadmaps", {
      userId: userId as any,
      projectId: project1 as any,
      input: {},
      results: {},
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("investmentAnalyses", {
      userId: userId as any,
      projectId: project1 as any,
      input: {},
      results: {},
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("aiMaterialAnalyses", {
      userId: userId as any,
      projectId: project2 as any,
      input: {},
      results: {},
      createdAt: now,
    });

    // Profil expert + demande reçue d'un autre utilisateur
    const expertProfile = await ctx.db.insert("expertProfiles", {
      userId: userId as any,
      profession: "plombier",
      displayName: "Expert Test",
      phone: "+216 98 111 111",
      email,
      specialties: ["depannage_plomberie"],
      regions: ["tunis"],
      plan: "monthly",
      subscriptionStatus: "active",
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    });

    // Profil fournisseur + devis reçu
    const supplierProfile = await ctx.db.insert("supplierProfiles", {
      userId: userId as any,
      companyName: "Fournisseur Test",
      phone: "+216 98 222 222",
      email,
      address: "Tunis",
      specialties: ["ciment"],
      regions: ["tunis"],
      plan: "monthly",
      subscriptionStatus: "active",
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("quoteRequests", {
      userId: userId as any,
      supplierId: supplierProfile as any,
      category: "ciment",
      materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
      userPhone: "+216 98 000 000",
      userEmail: email,
      userName: "Client Test",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Abonnement + notification + ticket support
    await ctx.db.insert("subscriptions", {
      userId: userId as any,
      plan: "pro",
      status: "active",
      startDate: now,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("notifications", {
      userId: userId as any,
      type: "system",
      title: "Bienvenue",
      message: "Test",
      read: false,
      createdAt: now,
    });
    const ticket = await ctx.db.insert("supportTickets", {
      userId: userId as any,
      subject: "Problème",
      category: "technical",
      priority: "normal",
      status: "open",
      createdAt: now,
      lastActivityAt: now,
    });
    await ctx.db.insert("supportMessages", {
      ticketId: ticket as any,
      senderId: userId as any,
      senderRole: "user",
      body: "Bonjour",
      createdAt: now,
    });

    // Analytics fournisseur/expert
    await ctx.db.insert("supplierAnalytics", {
      supplierId: supplierProfile as any,
      date: now,
      eventType: "view",
    });
    await ctx.db.insert("expertAnalytics", {
      expertId: expertProfile as any,
      date: now,
      eventType: "view",
    });

    return { project1, project2, expertProfile, supplierProfile, ticket };
  });
}

/** Comptes auth du SDK (authAccounts / authSessions). */
async function seedAuth(
  t: ReturnType<typeof convexTest>,
  userId: string,
) {
  return t.run(async (ctx) => {
    const account = await ctx.db.insert("authAccounts", {
      userId: userId as any,
      provider: "password",
      providerAccountId: `pa_${Math.random().toString(36).slice(2)}`,
      secret: "x",
    } as any);
    const session = await ctx.db.insert("authSessions", {
      userId: userId as any,
      sessionId: `s_${Math.random().toString(36).slice(2)}`,
      expirationTime: Date.now() + 86400000,
    } as any);
    return { account, session };
  });
}

describe("deleteUser — cascade complète", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("supprime toutes les données liées : aucun orphelin ne reste en base", async () => {
    const adminId = await createUser(t, { role: "admin", email: "admin@test.com" });
    const targetId = await createUser(t, { email: "cible@test.com" });
    const seeded = await seedUserData(t, targetId, { email: "cible@test.com" });
    await seedAuth(t, targetId);

    await asUser(t, adminId).mutation(api.users.deleteUser, { userId: targetId as any });

    await t.run(async (ctx) => {
      expect(await ctx.db.get(targetId as any)).toBeNull();
      expect(await ctx.db.get(seeded.project1 as any)).toBeNull();
      expect(await ctx.db.get(seeded.project2 as any)).toBeNull();
      expect(await ctx.db.get(seeded.expertProfile as any)).toBeNull();
      expect(await ctx.db.get(seeded.supplierProfile as any)).toBeNull();
      expect(await ctx.db.get(seeded.ticket as any)).toBeNull();

      for (const table of [
        "reports",
        "projectRoadmaps",
        "investmentAnalyses",
        "aiMaterialAnalyses",
        "quoteRequests",
        "quoteResponses",
        "subscriptions",
        "notifications",
        "supportTickets",
        "supportMessages",
        "expertAnalytics",
        "supplierAnalytics",
        "expertRatings",
        "supplierRatings",
        "expertAppointments",
        "expertUrgentRequests",
        "expertServiceRequests",
        "expertServiceResponses",
        "authAccounts",
        "authSessions",
      ] as const) {
        const rows = await ctx.db.query(table).collect();
        const linked = rows.filter(
          (r: any) => r.userId === targetId || r.expertId === seeded.expertProfile || r.supplierId === seeded.supplierProfile,
        );
        expect(linked, table).toEqual([]);
      }

      // Aucune donnée liée à l'utilisateur par e-mail (history) ne reste.
      const emails = await ctx.db.query("emailHistory").collect();
      expect(emails.filter((e: any) => e.to === "cible@test.com")).toEqual([]);
    });
  });

  it("demandes de rendez-vous créées ET reçues sont supprimées (réciprocité)", async () => {
    const adminId = await createUser(t, { role: "admin", email: "admin@test.com" });
    const expertUserId = await createUser(t, { email: "expert@test.com" });
    const clientId = await createUser(t, { email: "client@test.com" });
    const now = Date.now();

    const expertProfile = await t.run(async (ctx) =>
      ctx.db.insert("expertProfiles", {
        userId: expertUserId as any,
        profession: "plombier",
        displayName: "Expert Pro",
        phone: "+216 98 333 333",
        email: "expert@test.com",
        specialties: ["depannage_plomberie"],
        regions: ["tunis"],
        plan: "monthly",
        subscriptionStatus: "active",
        isVisible: true,
        createdAt: now,
        updatedAt: now,
      }),
    );

    const now2 = Date.now();
    const appointment = await t.run(async (ctx) =>
      ctx.db.insert("expertAppointments", {
        userId: clientId as any,
        expertId: expertProfile as any,
        preferredDate: now2 + 86400000,
        preferredTime: "09:00",
        reason: "Consultation",
        status: "pending",
        createdAt: now2,
        updatedAt: now2,
      }),
    );

    // 1) Suppression du client → sa demande disparaît, l'expert reste.
    await asUser(t, adminId).mutation(api.users.deleteUser, { userId: clientId as any });
    await t.run(async (ctx) => {
      expect(await ctx.db.get(appointment as any)).toBeNull();
      expect(await ctx.db.get(expertProfile as any)).not.toBeNull();
      expect(await ctx.db.get(expertUserId as any)).not.toBeNull();
    });

    // 2) Suppression de l'expert → le profil disparaît (la demande était déjà partie).
    await asUser(t, adminId).mutation(api.users.deleteUser, { userId: expertUserId as any });
    await t.run(async (ctx) => {
      expect(await ctx.db.get(expertProfile as any)).toBeNull();
      expect(await ctx.db.get(expertUserId as any)).toBeNull();
    });
  });

  it("ne touche à aucune donnée des autres utilisateurs (isolation)", async () => {
    const adminId = await createUser(t, { role: "admin", email: "admin@test.com" });
    const targetId = await createUser(t, { email: "cible@test.com" });
    const otherId = await createUser(t, { email: "autre@test.com" });
    const now = Date.now();

    await seedUserData(t, targetId, { email: "cible@test.com" });

    const otherProject = await t.run(async (ctx) =>
      ctx.db.insert("projects", {
        userId: otherId as any,
        name: "Projet Autre",
        category: "maison",
        status: "draft",
        createdAt: now,
        updatedAt: now,
      }),
    );
    const otherSub = await t.run(async (ctx) =>
      ctx.db.insert("subscriptions", {
        userId: otherId as any,
        plan: "free",
        status: "active",
        startDate: now,
        createdAt: now,
        updatedAt: now,
      }),
    );
    const otherNotif = await t.run(async (ctx) =>
      ctx.db.insert("notifications", {
        userId: otherId as any,
        type: "system",
        title: "Autre",
        message: "x",
        read: false,
        createdAt: now,
      }),
    );

    await asUser(t, adminId).mutation(api.users.deleteUser, { userId: targetId as any });

    await t.run(async (ctx) => {
      expect(await ctx.db.get(otherId as any)).not.toBeNull();
      expect(await ctx.db.get(otherProject as any)).not.toBeNull();
      expect(await ctx.db.get(otherSub as any)).not.toBeNull();
      expect(await ctx.db.get(otherNotif as any)).not.toBeNull();
    });
  });

  it("refuse la suppression sans droits admin/moderator", async () => {
    const targetId = await createUser(t, { email: "cible@test.com" });
    const plainId = await createUser(t, { email: "simple@test.com" });

    await expect(
      asUser(t, plainId).mutation(api.users.deleteUser, { userId: targetId as any }),
    ).rejects.toThrow("Unauthorized: Admin access required");

    await t.run(async (ctx) => {
      expect(await ctx.db.get(targetId as any)).not.toBeNull();
    });
  });

  it("refuse l'auto-suppression et trace l'action dans les logs admin", async () => {
    const adminId = await createUser(t, { role: "admin", email: "admin@test.com" });
    const targetId = await createUser(t, { email: "cible@test.com" });
    await seedUserData(t, targetId, { email: "cible@test.com" });

    await expect(
      asUser(t, adminId).mutation(api.users.deleteUser, { userId: adminId as any }),
    ).rejects.toThrow("votre propre compte");

    await asUser(t, adminId).mutation(api.users.deleteUser, { userId: targetId as any });

    const logs = await t.run(async (ctx) =>
      ctx.db.query("adminLogs").withIndex("by_admin", (q: any) => q.eq("adminId", adminId as any)).collect(),
    );
    const deleteLog = logs.find((l: any) => l.action === "delete_user");
    expect(deleteLog).toBeDefined();
    expect(deleteLog!.targetUserEmail).toBe("cible@test.com");
  });

  it("batchDeleteUsers réutilise la cascade et isole les erreurs", async () => {
    const adminId = await createUser(t, { role: "admin", email: "admin@test.com" });
    const u1 = await createUser(t, { email: "batch1@test.com" });
    const u2 = await createUser(t, { email: "batch2@test.com" });
    await seedUserData(t, u1, { email: "batch1@test.com" });
    await seedAuth(t, u2);

    const result = await asUser(t, adminId).mutation(api.users.batchDeleteUsers, {
      userIds: [u1 as any, u2 as any, adminId as any],
    });

    expect(result.deleted).toHaveLength(2);
    expect(result.errors).toHaveLength(1); // auto-suppression refusée

    await t.run(async (ctx) => {
      expect(await ctx.db.get(u1 as any)).toBeNull();
      expect(await ctx.db.get(u2 as any)).toBeNull();
      expect(await ctx.db.get(adminId as any)).not.toBeNull();
      // Cascade u1 : aucun projet restant
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q: any) => q.eq("userId", u1 as any))
        .collect();
      expect(projects).toEqual([]);
    });
  });
});
