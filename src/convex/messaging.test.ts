/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// MESSAGERIE — pastille rouge (compteur de messages non lus)
//
// Vérifie la SOURCE UNIQUE utilisée par le menu web et par la barre de
// navigation native de l'application Android :
//   - seules les conversations de l'utilisateur connecté sont comptées ;
//   - une conversation lue ne compte plus (la pastille disparaît) ;
//   - les conversations d'un AUTRE utilisateur ne sont jamais comptées ;
//   - côté professionnel, les demandes / rendez-vous / urgences reçus comptent.
// ============================================================================

async function createTestUser(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      name: "Test User",
      email: `user-${Math.random().toString(36).slice(2)}@test.com`,
      role: "user",
      status: "active",
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

async function createSupplierProfile(t: ReturnType<typeof convexTest>, userId: string) {
  return t.run(async (ctx) =>
    ctx.db.insert("supplierProfiles", {
      userId: userId as any,
      companyName: "Test Supplier",
      phone: "+216 99 111 111",
      email: "supplier@test.com",
      address: "Tunis",
      specialties: ["ciment"],
      regions: ["tunis"],
      plan: "trial",
      subscriptionStatus: "active",
      isVisible: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

async function createExpertProfile(t: ReturnType<typeof convexTest>, userId: string) {
  return t.run(async (ctx) =>
    ctx.db.insert("expertProfiles", {
      userId: userId as any,
      profession: "architecte",
      displayName: "Expert Test",
      phone: "+216 99 222 222",
      email: "expert@test.com",
      specialties: ["plans"],
      regions: ["tunis"],
      plan: "trial",
      subscriptionStatus: "active",
      isVisible: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

/** Réponse fournisseur reçue par un client (`readAt` optionnel = non lu). */
async function insertSupplierResponse(
  t: ReturnType<typeof convexTest>,
  userId: string,
  supplierId: string,
  readAt?: number,
) {
  return t.run(async (ctx) => {
    const requestId = await ctx.db.insert("quoteRequests", {
      userId: userId as any,
      supplierId: supplierId as any,
      category: "ciment",
      materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
      userPhone: "+216 99 000 000",
      userEmail: "user@test.com",
      userName: "Test User",
      status: "responded",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return ctx.db.insert("quoteResponses", {
      quoteRequestId: requestId,
      supplierId: supplierId as any,
      userId: userId as any,
      message: "Voici mon devis",
      readAt,
      createdAt: Date.now(),
    });
  });
}

/** Réponse expert reçue par un client (`readAt` optionnel = non lu). */
async function insertExpertResponse(
  t: ReturnType<typeof convexTest>,
  userId: string,
  expertId: string,
  readAt?: number,
) {
  return t.run(async (ctx) => {
    const requestId = await ctx.db.insert("expertServiceRequests", {
      userId: userId as any,
      expertId: expertId as any,
      requestType: "devis",
      serviceType: "plans",
      description: "Besoin de plans",
      userPhone: "+216 99 000 000",
      userEmail: "user@test.com",
      userName: "Test User",
      status: "responded",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return ctx.db.insert("expertServiceResponses", {
      serviceRequestId: requestId,
      expertId: expertId as any,
      userId: userId as any,
      message: "Voici ma proposition",
      readAt,
      createdAt: Date.now(),
    });
  });
}

describe("messaging.unreadCount", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns 0 without a session (nothing is exposed)", async () => {
    const count = await t.query(api.messaging.unreadCount, {});
    expect(count).toBe(0);
  });

  it("returns 0 for a fresh user with no conversation", async () => {
    const userId = await createTestUser(t);
    const count = await asUser(t, userId).query(api.messaging.unreadCount, {});
    expect(count).toBe(0);
  });

  it("counts unread supplier and expert answers received by the client", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createSupplierProfile(t, supplierUserId);
    const expertUserId = await createTestUser(t);
    const expertId = await createExpertProfile(t, expertUserId);
    const userId = await createTestUser(t);

    await insertSupplierResponse(t, userId, supplierId);
    await insertSupplierResponse(t, userId, supplierId);
    await insertExpertResponse(t, userId, expertId);

    const count = await asUser(t, userId).query(api.messaging.unreadCount, {});
    expect(count).toBe(3);
  });

  it("ignores conversations already read (badge disappears)", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createSupplierProfile(t, supplierUserId);
    const expertUserId = await createTestUser(t);
    const expertId = await createExpertProfile(t, expertUserId);
    const userId = await createTestUser(t);

    await insertSupplierResponse(t, userId, supplierId, Date.now());
    await insertExpertResponse(t, userId, expertId);

    const count = await asUser(t, userId).query(api.messaging.unreadCount, {});
    expect(count).toBe(1);
  });

  it("never counts another user's unread conversations (security)", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createSupplierProfile(t, supplierUserId);
    const ownerId = await createTestUser(t);
    const otherId = await createTestUser(t);

    await insertSupplierResponse(t, ownerId, supplierId);

    expect(await asUser(t, ownerId).query(api.messaging.unreadCount, {})).toBe(1);
    expect(await asUser(t, otherId).query(api.messaging.unreadCount, {})).toBe(0);
  });

  it("counts a supplier's new quote requests (managed in the messagerie)", async () => {
    // Depuis la refonte, les demandes de devis reçues par un fournisseur sont
    // gérées DANS la messagerie : elles alimentent donc la pastille rouge.
    // Les demandes de SERVICE reçues par un expert, elles, gardent leur propre
    // compteur (`expertServiceRequests.unreadCount`).
    const supplierUserId = await createTestUser(t);
    const supplierId = await createSupplierProfile(t, supplierUserId);
    const expertUserId = await createTestUser(t);
    const expertId = await createExpertProfile(t, expertUserId);
    const buyerId = await createTestUser(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("quoteRequests", {
        userId: buyerId as any,
        supplierId: supplierId as any,
        category: "ciment",
        materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
        userPhone: "+216 99 000 000",
        userEmail: "buyer@test.com",
        userName: "Buyer",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("expertServiceRequests", {
        userId: buyerId as any,
        expertId: expertId as any,
        requestType: "service",
        serviceType: "plans",
        description: "Besoin d'un plan",
        userPhone: "+216 99 000 000",
        userEmail: "buyer@test.com",
        userName: "Buyer",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    expect(await asUser(t, supplierUserId).query(api.messaging.unreadCount, {})).toBe(1);
    expect(await asUser(t, expertUserId).query(api.messaging.unreadCount, {})).toBe(0);
  });

  it("clears the supplier badge once the received requests tab has been consulted", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createSupplierProfile(t, supplierUserId);
    const buyerId = await createTestUser(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("quoteRequests", {
        userId: buyerId as any,
        supplierId: supplierId as any,
        category: "ciment",
        materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
        userPhone: "+216 99 000 000",
        userEmail: "buyer@test.com",
        userName: "Buyer",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const supplierT = asUser(t, supplierUserId);
    expect(await supplierT.query(api.messaging.unreadCount, {})).toBe(1);

    // Même mutation que celle exécutée à l'ouverture de l'onglet « Demandes de devis ».
    await supplierT.mutation(api.quoteRequests.markAllRead, {});

    expect(await supplierT.query(api.messaging.unreadCount, {})).toBe(0);
  });

  it("counts received appointments and urgent requests for an expert", async () => {
    const expertUserId = await createTestUser(t);
    const expertId = await createExpertProfile(t, expertUserId);
    const clientId = await createTestUser(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("expertAppointments", {
        userId: clientId as any,
        expertId: expertId as any,
        preferredDate: Date.now() + 86_400_000,
        preferredTime: "10:00",
        reason: "Visite de chantier",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("expertUrgentRequests", {
        userId: clientId as any,
        expertId: expertId as any,
        description: "Fuite d'eau urgente",
        userPhone: "+216 99 000 000",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    expect(await asUser(t, expertUserId).query(api.messaging.unreadCount, {})).toBe(2);
  });

  it("clears the expert badge once the received tab has been consulted", async () => {
    const expertUserId = await createTestUser(t);
    const expertId = await createExpertProfile(t, expertUserId);
    const clientId = await createTestUser(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("expertAppointments", {
        userId: clientId as any,
        expertId: expertId as any,
        preferredDate: Date.now() + 86_400_000,
        preferredTime: "10:00",
        reason: "Visite de chantier",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const expertT = asUser(t, expertUserId);
    expect(await expertT.query(api.messaging.unreadCount, {})).toBe(1);

    // Même mutation que celle exécutée à l'ouverture de l'onglet « Demandes reçues ».
    await expertT.mutation(api.expertAvailability.markAllRead, {});

    expect(await expertT.query(api.messaging.unreadCount, {})).toBe(0);
  });

  it("drops back to 0 once the messagerie has been consulted (existing read mutations)", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createSupplierProfile(t, supplierUserId);
    const expertUserId = await createTestUser(t);
    const expertId = await createExpertProfile(t, expertUserId);
    const userId = await createTestUser(t);

    await insertSupplierResponse(t, userId, supplierId);
    await insertExpertResponse(t, userId, expertId);
    const userT = asUser(t, userId);
    expect(await userT.query(api.messaging.unreadCount, {})).toBe(2);

    // Mêmes mutations que celles exécutées à l'ouverture de la messagerie.
    await userT.mutation(api.quoteResponses.markAllRead, {});
    await userT.mutation(api.expertServiceRequests.responsesMarkAllRead, {});

    expect(await userT.query(api.messaging.unreadCount, {})).toBe(0);
  });
});
