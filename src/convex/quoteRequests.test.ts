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
  overrides: Partial<{
    subscriptionStatus: string;
    isVisible: boolean;
    companyName: string;
  }> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("supplierProfiles", {
      userId: userId as any,
      companyName: overrides.companyName ?? "Test Supplier",
      phone: "+216 99 111 111",
      email: "supplier@test.com",
      address: "Tunis, Tunisia",
      specialties: ["ciment", "bois"],
      regions: ["tunis"],
      plan: "trial",
      subscriptionStatus: (overrides.subscriptionStatus as any) ?? "active",
      isVisible: overrides.isVisible ?? true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

// ============================================================================
// create — mutation
// ============================================================================

describe("quoteRequests.create", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("rejects if not authenticated", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);

    // Call without identity (unauthenticated)
    await expect(
      t.mutation(api.quoteRequests.create, {
        supplierId: supplierId as any,
        category: "ciment",
        materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
      }),
    ).rejects.toThrow("Utilisateur non connecté");
  });

  it("rejects if supplier does not exist", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);
    const supplierUserId = await createTestUser(t, { email: "supplier@test.com" });
    const supplierId = await createTestSupplierProfile(t, supplierUserId);

    // Delete the supplier profile
    await t.run(async (ctx) => ctx.db.delete(supplierId));

    await expect(
      userT.mutation(api.quoteRequests.create, {
        supplierId: supplierId as any,
        category: "ciment",
        materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
      }),
    ).rejects.toThrow("Fournisseur introuvable");
  });

  it("rejects if supplier subscription is inactive", async () => {
    const userId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, userId, {
      subscriptionStatus: "inactive",
    });
    const buyerId = await createTestUser(t, {
      name: "Buyer",
      email: "buyer@test.com",
    });
    const buyerT = asUser(t, buyerId);

    await expect(
      buyerT.mutation(api.quoteRequests.create, {
        supplierId: supplierId as any,
        category: "ciment",
        materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
      }),
    ).rejects.toThrow("Ce fournisseur n'est pas actif");
  });

  it("creates a quote request for an active supplier", async () => {
    const supplierUserId = await createTestUser(t, {
      name: "Supplier",
      email: "supplier@test.com",
    });
    const supplierId = await createTestSupplierProfile(t, supplierUserId);

    const buyerId = await createTestUser(t, {
      name: "Buyer",
      email: "buyer@test.com",
    });
    const buyerT = asUser(t, buyerId);

    const quoteId = await buyerT.mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      category: "ciment",
      materials: [
        { name: "Ciment gris", quantity: 20, unit: "sac" },
        { name: "Sable", quantity: 5, unit: "m3" },
      ],
      message: "Bonjour, je souhaite un devis.",
    });

    expect(quoteId).toBeTruthy();

    const quote = await t.run(async (ctx) => ctx.db.get(quoteId));
    expect(quote).toBeTruthy();
    expect(quote!.userId).toBe(buyerId);
    expect(quote!.supplierId).toBe(supplierId);
    expect(quote!.category).toBe("ciment");
    expect(quote!.materials).toHaveLength(2);
    expect(quote!.status).toBe("pending");
    expect(quote!.userEmail).toBe("buyer@test.com");
  });

  it("creates a quote request for a trial supplier", async () => {
    const supplierUserId = await createTestUser(t, {
      name: "Trial Supplier",
      email: "trial@test.com",
    });
    const supplierId = await createTestSupplierProfile(t, supplierUserId, {
      subscriptionStatus: "trial",
    });

    const buyerId = await createTestUser(t, {
      name: "Buyer",
      email: "buyer@test.com",
    });
    const buyerT = asUser(t, buyerId);

    const quoteId = await buyerT.mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      category: "bois",
      materials: [{ name: "Planche", quantity: 10, unit: "piece" }],
    });

    expect(quoteId).toBeTruthy();
  });
});

// ============================================================================
// updateStatus — mutation
// ============================================================================

describe("quoteRequests.updateStatus", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("rejects if not authenticated", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const buyerId = await createTestUser(t, { email: "buyer@test.com" });
    const buyerT = asUser(t, buyerId);

    const quoteId = await buyerT.mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      category: "ciment",
      materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
    });

    // Call without identity
    await expect(
      t.mutation(api.quoteRequests.updateStatus, {
        quoteRequestId: quoteId,
        status: "responded",
      }),
    ).rejects.toThrow("Utilisateur non connecté");
  });

  it("allows the quote creator to update status", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const buyerId = await createTestUser(t, {
      name: "Buyer",
      email: "buyer@test.com",
    });
    const buyerT = asUser(t, buyerId);

    const quoteId = await buyerT.mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      category: "ciment",
      materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
    });

    await buyerT.mutation(api.quoteRequests.updateStatus, {
      quoteRequestId: quoteId,
      status: "closed",
    });

    const quote = await t.run(async (ctx) => ctx.db.get(quoteId));
    expect(quote!.status).toBe("closed");
  });

  it("rejects unauthorized user from updating", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const buyerId = await createTestUser(t, {
      name: "Buyer",
      email: "buyer@test.com",
    });
    const buyerT = asUser(t, buyerId);

    const quoteId = await buyerT.mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      category: "ciment",
      materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
    });

    const thirdUserId = await createTestUser(t, {
      name: "Third Party",
      email: "third@test.com",
    });
    const thirdT = asUser(t, thirdUserId);

    await expect(
      thirdT.mutation(api.quoteRequests.updateStatus, {
        quoteRequestId: quoteId,
        status: "responded",
      }),
    ).rejects.toThrow("Non autorisé");
  });
});

// ============================================================================
// getBySupplier — query
// ============================================================================

describe("quoteRequests.getBySupplier", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns empty if not authenticated", async () => {
    const result = await t.query(api.quoteRequests.getBySupplier, {});
    expect(result).toEqual([]);
  });

  it("returns quotes for the current supplier", async () => {
    const supplierUserId = await createTestUser(t, {
      name: "Supplier",
      email: "supplier@test.com",
    });
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const supplierT = asUser(t, supplierUserId);

    const buyerId = await createTestUser(t, {
      name: "Buyer",
      email: "buyer@test.com",
    });
    const buyerT = asUser(t, buyerId);

    await buyerT.mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      category: "ciment",
      materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
    });

    const quotes = await supplierT.query(api.quoteRequests.getBySupplier, {});
    expect(quotes).toHaveLength(1);
    expect(quotes[0].supplierId).toBe(supplierId);
  });

  it("returns empty array for a user without supplier profile", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    const quotes = await userT.query(api.quoteRequests.getBySupplier, {});
    expect(quotes).toEqual([]);
  });
});

// ============================================================================
// getMyRequests — query
// ============================================================================

describe("quoteRequests.getMyRequests", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns quotes created by the current user", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);

    const buyerId = await createTestUser(t, {
      name: "Buyer",
      email: "buyer@test.com",
    });
    const buyerT = asUser(t, buyerId);

    await buyerT.mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      category: "bois",
      materials: [{ name: "Bois", quantity: 5, unit: "planche" }],
    });

    const requests = await buyerT.query(api.quoteRequests.getMyRequests, {});
    expect(requests).toHaveLength(1);
    expect(requests[0].userId).toBe(buyerId);
  });
});

// ============================================================================
// pendingCount — query
// ============================================================================

describe("quoteRequests.pendingCount", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("counts pending quotes for the supplier", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const supplierT = asUser(t, supplierUserId);

    const buyerId = await createTestUser(t, {
      name: "Buyer",
      email: "buyer@test.com",
    });
    const buyerT = asUser(t, buyerId);

    // Create 3 pending quotes
    for (let i = 0; i < 3; i++) {
      await buyerT.mutation(api.quoteRequests.create, {
        supplierId: supplierId as any,
        category: "ciment",
        materials: [{ name: "Item", quantity: 1, unit: "kg" }],
      });
    }

    const count = await supplierT.query(api.quoteRequests.pendingCount, {});
    expect(count).toBe(3);
  });

  it("returns 0 for a user without supplier profile", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    const count = await userT.query(api.quoteRequests.pendingCount, {});
    expect(count).toBe(0);
  });
});
