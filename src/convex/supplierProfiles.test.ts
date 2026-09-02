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
  email = "user@test.com",
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      name: "Test User",
      email,
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

async function createTestSupplierProfile(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{
    companyName: string;
    subscriptionStatus: string;
    isVisible: boolean;
    specialties: string[];
    subscriptionEndDate: number;
  }> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("supplierProfiles", {
      userId: undefined as any,
      companyName: overrides.companyName ?? "Test Supplier",
      phone: "+216 99 111 111",
      email: "supplier@test.com",
      address: "Tunis, Tunisia",
      specialties: overrides.specialties ?? ["ciment"],
      regions: ["tunis"],
      plan: "monthly",
      subscriptionStatus: (overrides.subscriptionStatus as any) ?? "active",
      subscriptionEndDate: overrides.subscriptionEndDate,
      isVisible: overrides.isVisible ?? true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

/** Enable the free supplier plan (« Offre gratuite ») via paymentConfig */
async function enableFreeSupplierPlan(t: ReturnType<typeof convexTest>) {
  const adminId = await createTestUser(t, "admin@test.com");
  await t.run(async (ctx) => {
    await ctx.db.insert("paymentConfig", {
      bankName: "Bank",
      bankTitulaire: "Test",
      bankRib: "RIB",
      bankIban: "IBAN",
      bankSwift: "SWIFT",
      d17MerchantName: "Merchant",
      d17Phone: "+216 00 000 000",
      d17Email: "d17@test.com",
      d17Notice: "Notice",
      currency: "TND",
      supplierPrice: 0, // null / 0 = offre gratuite
      updatedAt: Date.now(),
      updatedBy: adminId as any,
    });
  });
}

// ============================================================================
// getRandomBySpecialty — query
// ============================================================================

describe("supplierProfiles.getRandomBySpecialty", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns only suppliers matching the exact specialty", async () => {
    await createTestSupplierProfile(t, {
      companyName: "Cimenterie A",
      specialties: ["ciment"],
    });
    await createTestSupplierProfile(t, {
      companyName: "Quincaillerie B",
      specialties: ["bois"],
    });

    const result = await t.query(api.supplierProfiles.getRandomBySpecialty, {
      specialty: "ciment",
      limit: 1,
    });

    expect(result).toHaveLength(1);
    expect(result[0].companyName).toBe("Cimenterie A");
  });

  it("excludes invisible suppliers", async () => {
    await createTestSupplierProfile(t, {
      companyName: "Masqué",
      specialties: ["ciment"],
      isVisible: false,
    });

    const result = await t.query(api.supplierProfiles.getRandomBySpecialty, {
      specialty: "ciment",
      limit: 1,
    });

    expect(result).toEqual([]);
  });

  it("excludes inactive and expired suppliers", async () => {
    await createTestSupplierProfile(t, {
      companyName: "Inactif",
      subscriptionStatus: "inactive",
      specialties: ["ciment"],
    });
    await createTestSupplierProfile(t, {
      companyName: "Expiré",
      subscriptionStatus: "active",
      subscriptionEndDate: Date.now() - 24 * 60 * 60 * 1000, // expired yesterday
      specialties: ["ciment"],
    });

    const result = await t.query(api.supplierProfiles.getRandomBySpecialty, {
      specialty: "ciment",
      limit: 5,
    });

    expect(result).toEqual([]);
  });

  it("includes trial suppliers (they can receive quote requests)", async () => {
    await createTestSupplierProfile(t, {
      companyName: "Essai",
      subscriptionStatus: "trial",
      specialties: ["ciment"],
    });

    const result = await t.query(api.supplierProfiles.getRandomBySpecialty, {
      specialty: "ciment",
      limit: 1,
    });

    expect(result).toHaveLength(1);
    expect(result[0].companyName).toBe("Essai");
  });

  it("keeps active suppliers with no expiration date eligible", async () => {
    await createTestSupplierProfile(t, {
      companyName: "Sans expiration",
      subscriptionStatus: "active",
      specialties: ["ciment"],
    });

    const result = await t.query(api.supplierProfiles.getRandomBySpecialty, {
      specialty: "ciment",
      limit: 1,
    });

    expect(result).toHaveLength(1);
    expect(result[0].companyName).toBe("Sans expiration");
  });

  it("falls back to any visible supplier only when fallbackToAny is true", async () => {
    await createTestSupplierProfile(t, {
      companyName: "Généraliste",
      specialties: ["bois"],
    });

    // No exact match + no fallback → empty
    const strict = await t.query(api.supplierProfiles.getRandomBySpecialty, {
      specialty: "plomberie",
      limit: 1,
    });
    expect(strict).toEqual([]);

    // No exact match + fallback → returns a visible supplier
    const fallback = await t.query(api.supplierProfiles.getRandomBySpecialty, {
      specialty: "plomberie",
      limit: 1,
      fallbackToAny: true,
    });
    expect(fallback).toHaveLength(1);
    expect(fallback[0].companyName).toBe("Généraliste");
  });

  it("respects the limit", async () => {
    await createTestSupplierProfile(t, { companyName: "A", specialties: ["ciment"] });
    await createTestSupplierProfile(t, { companyName: "B", specialties: ["ciment"] });
    await createTestSupplierProfile(t, { companyName: "C", specialties: ["ciment"] });

    const result = await t.query(api.supplierProfiles.getRandomBySpecialty, {
      specialty: "ciment",
      limit: 2,
    });

    expect(result).toHaveLength(2);
  });

  it("treats every visible supplier as eligible when the free plan is enabled", async () => {
    await enableFreeSupplierPlan(t);
    await createTestSupplierProfile(t, {
      companyName: "Inactif mais visible",
      subscriptionStatus: "inactive",
      specialties: ["ciment"],
    });

    const result = await t.query(api.supplierProfiles.getRandomBySpecialty, {
      specialty: "ciment",
      limit: 1,
    });

    expect(result).toHaveLength(1);
    expect(result[0].companyName).toBe("Inactif mais visible");
  });
});