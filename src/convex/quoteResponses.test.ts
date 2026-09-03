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
    phone: string;
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
      company: undefined,
      phone: overrides.phone ?? "+216 99 000 000",
      subscriptionEndDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

async function createTestSupplierProfile(
  t: ReturnType<typeof convexTest>,
  userId: string,
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("supplierProfiles", {
      userId: userId as any,
      companyName: "Test Supplier",
      phone: "+216 99 111 111",
      email: "supplier@test.com",
      address: "Tunis, Tunisia",
      specialties: ["ciment"],
      regions: ["tunis"],
      plan: "trial",
      subscriptionStatus: "active",
      isVisible: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

async function createTestQuote(
  t: ReturnType<typeof convexTest>,
  userId: string,
  supplierId: string,
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("quoteRequests", {
      userId: userId as any,
      supplierId: supplierId as any,
      category: "ciment",
      materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
      userPhone: "+216 99 000 000",
      userEmail: "user@test.com",
      userName: "Test User",
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

// ============================================================================
// sendResponse — mutation
// ============================================================================

describe("quoteResponses.sendResponse", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("rejects if not authenticated", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const buyerId = await createTestUser(t, { email: "buyer@test.com" });
    const quoteId = await createTestQuote(t, buyerId, supplierId as string);

    // Call without identity
    await expect(
      t.mutation(api.quoteResponses.sendResponse, {
        quoteRequestId: quoteId,
        message: "Bonjour",
      }),
    ).rejects.toThrow("Utilisateur non connecté");
  });

  it("rejects if user has no supplier profile", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const buyerId = await createTestUser(t, { email: "buyer@test.com" });
    const quoteId = await createTestQuote(t, buyerId, supplierId as string);

    // A user without supplier profile tries to respond
    const regularUserId = await createTestUser(t, { email: "regular@test.com" });
    const regularT = asUser(t, regularUserId);

    await expect(
      regularT.mutation(api.quoteResponses.sendResponse, {
        quoteRequestId: quoteId,
        message: "Bonjour",
      }),
    ).rejects.toThrow("Profil fournisseur introuvable");
  });

  it("rejects if supplier does not own the quote", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);

    const buyerId = await createTestUser(t, { email: "buyer@test.com" });
    const quoteId = await createTestQuote(t, buyerId, supplierId as string);

    // Another supplier tries to respond
    const otherSupplierUserId = await createTestUser(t, {
      email: "other@test.com",
    });
    const otherSupplierId = await createTestSupplierProfile(
      t,
      otherSupplierUserId,
    );
    const otherT = asUser(t, otherSupplierUserId);

    await expect(
      otherT.mutation(api.quoteResponses.sendResponse, {
        quoteRequestId: quoteId,
        message: "Voici le devis",
      }),
    ).rejects.toThrow("Non autorisé");
  });

  it("supplier can respond to their own quote", async () => {
    const supplierUserId = await createTestUser(t, {
      name: "Supplier",
      email: "supplier@test.com",
    });
    const supplierId = await createTestSupplierProfile(t, supplierUserId);

    const buyerId = await createTestUser(t, { email: "buyer@test.com" });
    const quoteId = await createTestQuote(t, buyerId, supplierId as string);

    const supplierT = asUser(t, supplierUserId);
    const responseId = await supplierT.mutation(
      api.quoteResponses.sendResponse,
      {
        quoteRequestId: quoteId,
        message: "Voici votre devis",
        totalAmount: 5000,
      },
    );

    expect(responseId).toBeTruthy();

    // Check quote status updated to "responded"
    const quote = await t.run(async (ctx) => ctx.db.get(quoteId));
    expect(quote!.status).toBe("responded");

    // Check response was created
    const response = await t.run(async (ctx) => ctx.db.get(responseId));
    expect(response).toBeTruthy();
    expect(response!.message).toBe("Voici votre devis");
    expect(response!.totalAmount).toBe(5000);
    expect(response!.supplierId).toBe(supplierId);
    expect(response!.userId).toBe(buyerId);
  });
});

// ============================================================================
// getByQuote — query
// ============================================================================

describe("quoteResponses.getByQuote", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns responses for an authorized user", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);

    const buyerId = await createTestUser(t, { email: "buyer@test.com" });
    const quoteId = await createTestQuote(t, buyerId, supplierId as string);

    // Supplier responds
    const supplierT = asUser(t, supplierUserId);
    await supplierT.mutation(api.quoteResponses.sendResponse, {
      quoteRequestId: quoteId,
      message: "Devis prêt",
      totalAmount: 3000,
    });

    // Buyer can see the response
    const buyerT = asUser(t, buyerId);
    const responses = await buyerT.query(api.quoteResponses.getByQuote, {
      quoteRequestId: quoteId,
    });

    expect(responses).toHaveLength(1);
    expect(responses[0].message).toBe("Devis prêt");
  });

  it("returns empty for unauthorized user", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);

    const buyerId = await createTestUser(t, { email: "buyer@test.com" });
    const quoteId = await createTestQuote(t, buyerId, supplierId as string);

    const thirdUserId = await createTestUser(t, { email: "third@test.com" });
    const thirdT = asUser(t, thirdUserId);

    const responses = await thirdT.query(api.quoteResponses.getByQuote, {
      quoteRequestId: quoteId,
    });
    expect(responses).toEqual([]);
  });
});

// ============================================================================
// getMyResponses — query
// ============================================================================

describe("quoteResponses.getMyResponses", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns responses received by the current user", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);

    const buyerId = await createTestUser(t, { email: "buyer@test.com" });
    const quoteId = await createTestQuote(t, buyerId, supplierId as string);

    const supplierT = asUser(t, supplierUserId);
    await supplierT.mutation(api.quoteResponses.sendResponse, {
      quoteRequestId: quoteId,
      message: "Réponse test",
    });

    const buyerT = asUser(t, buyerId);
    const responses = await buyerT.query(api.quoteResponses.getMyResponses, {});
    expect(responses).toHaveLength(1);
    expect(responses[0].userId).toBe(buyerId);
  });
});

// ============================================================================
// unreadCount & markAllRead — badge de notification côté client
// ============================================================================

describe("quoteResponses.unreadCount / markAllRead", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function sendResponses(count: number) {
    const supplierUserId = await createTestUser(t, { email: "sup@test.com" });
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const buyerId = await createTestUser(t, { email: "buyer@test.com" });
    const quoteId = await createTestQuote(t, buyerId, supplierId);
    const supplierT = asUser(t, supplierUserId);
    const buyerT = asUser(t, buyerId);

    for (let i = 0; i < count; i++) {
      await supplierT.mutation(api.quoteResponses.sendResponse, {
        quoteRequestId: quoteId,
        message: `Réponse ${i}`,
      });
    }
    return { buyerT, buyerId };
  }

  it("counts supplier responses not yet consulted by the buyer", async () => {
    const { buyerT } = await sendResponses(2);
    const count = await buyerT.query(api.quoteResponses.unreadCount, {});
    expect(count).toBe(2);
  });

  it("markAllRead clears the badge once the buyer consults the Messagerie", async () => {
    const { buyerT } = await sendResponses(2);
    await buyerT.mutation(api.quoteResponses.markAllRead, {});

    const count = await buyerT.query(api.quoteResponses.unreadCount, {});
    expect(count).toBe(0);

    const responses = await buyerT.query(api.quoteResponses.getMyResponses, {});
    expect(responses).toHaveLength(2);
    for (const r of responses) {
      expect(typeof r.readAt).toBe("number");
    }
  });

  it("markAllRead is idempotent and does not overwrite readAt", async () => {
    const { buyerT } = await sendResponses(1);
    await buyerT.mutation(api.quoteResponses.markAllRead, {});
    const first = await buyerT.query(api.quoteResponses.getMyResponses, {});
    const firstReadAt = first[0].readAt;

    await buyerT.mutation(api.quoteResponses.markAllRead, {});
    const second = await buyerT.query(api.quoteResponses.getMyResponses, {});
    expect(second[0].readAt).toBe(firstReadAt);
  });

  it("returns 0 for a buyer who received no response", async () => {
    const buyerId = await createTestUser(t, { email: "lonely@test.com" });
    const buyerT = asUser(t, buyerId);
    const count = await buyerT.query(api.quoteResponses.unreadCount, {});
    expect(count).toBe(0);
  });
});
