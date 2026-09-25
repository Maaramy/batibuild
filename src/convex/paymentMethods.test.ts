/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

async function createTestUser(
  t: ReturnType<typeof convexTest>,
  role: string,
  email: string,
) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Test User",
      email,
      role,
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

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

async function createSupplierProfile(t: ReturnType<typeof convexTest>, userId: any) {
  return t.run(async (ctx) =>
    ctx.db.insert("supplierProfiles", {
      userId,
      companyName: "Matériaux Test",
      phone: "20123456",
      email: "supplier@test.com",
      address: "Tunis",
      specialties: ["ciment"],
      regions: ["tunis"],
      plan: "none",
      subscriptionStatus: "inactive",
      isVisible: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

// ============================================================================
// getPaymentMethodsAdmin
// ============================================================================

describe("getPaymentMethodsAdmin", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("retourne null pour un non-admin", async () => {
    const userId = await createTestUser(t, "user", "u@test.com");
    const res = await asUser(t, userId).query(api.payments.getPaymentMethodsAdmin);
    expect(res).toBeNull();
  });

  it("retourne null sans utilisateur connecté", async () => {
    const res = await t.query(api.payments.getPaymentMethodsAdmin);
    expect(res).toBeNull();
  });

  it("expose le catalogue complet avec son état pour un admin", async () => {
    const adminId = await createTestUser(t, "admin", "admin@test.com");
    const res = await asUser(t, adminId).query(api.payments.getPaymentMethodsAdmin);
    expect(res).not.toBeNull();
    const slugs = res!.methods.map((m: any) => m.slug);
    expect(slugs).toContain("bank_transfer");
    expect(slugs).toContain("d17");
    expect(slugs).toContain("card");
    const bank = res!.methods.find((m: any) => m.slug === "bank_transfer")!;
    expect(bank.enabled).toBe(true);
    expect(bank.label.length).toBeGreaterThan(0);
    expect(bank.description.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// updatePaymentMethodState
// ============================================================================

describe("updatePaymentMethodState", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("refuse un non-admin", async () => {
    const userId = await createTestUser(t, "user", "u2@test.com");
    await expect(
      asUser(t, userId).mutation(api.payments.updatePaymentMethodState, {
        slug: "d17",
        enabled: false,
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("refuse un slug inconnu", async () => {
    const adminId = await createTestUser(t, "admin", "admin2@test.com");
    await expect(
      asUser(t, adminId).mutation(api.payments.updatePaymentMethodState, {
        slug: "crypto",
        enabled: true,
      }),
    ).rejects.toThrow("inconnue");
  });

  it("refuse d'activer une méthode dont le module n'est pas connecté", async () => {
    const adminId = await createTestUser(t, "admin", "admin3@test.com");
    await expect(
      asUser(t, adminId).mutation(api.payments.updatePaymentMethodState, {
        slug: "card",
        enabled: true,
      }),
    ).rejects.toThrow("n'est pas encore connecté");
  });

  it("désactive une méthode et la retire des méthodes publiques", async () => {
    const adminId = await createTestUser(t, "admin", "admin4@test.com");
    const adminT = asUser(t, adminId);

    let pricing = await t.query(api.payments.getPublicPricing);
    expect((pricing as any).paymentMethods).toContain("d17");

    await adminT.mutation(api.payments.updatePaymentMethodState, {
      slug: "d17",
      enabled: false,
    });

    pricing = await t.query(api.payments.getPublicPricing);
    expect((pricing as any).paymentMethods).not.toContain("d17");
    // La méthode désactivée ne casse pas les autres.
    expect((pricing as any).paymentMethods).toContain("bank_transfer");

    const admin = await adminT.query(api.payments.getPaymentMethodsAdmin);
    const d17 = admin!.methods.find((m: any) => m.slug === "d17")!;
    expect(d17.enabled).toBe(false);
  });

  it("réactive une méthode désactivée", async () => {
    const adminId = await createTestUser(t, "admin", "admin5@test.com");
    const adminT = asUser(t, adminId);

    await adminT.mutation(api.payments.updatePaymentMethodState, {
      slug: "bank_transfer",
      enabled: false,
    });
    let pricing = await t.query(api.payments.getPublicPricing);
    expect((pricing as any).paymentMethods).toEqual(["d17"]);

    await adminT.mutation(api.payments.updatePaymentMethodState, {
      slug: "bank_transfer",
      enabled: true,
    });
    pricing = await t.query(api.payments.getPublicPricing);
    expect((pricing as any).paymentMethods).toEqual(["bank_transfer", "d17"]);
  });

  it("ne supprime aucune donnée de configuration existante", async () => {
    const adminId = await createTestUser(t, "admin", "admin6@test.com");
    const adminT = asUser(t, adminId);

    await adminT.mutation(api.payments.updatePaymentConfig, {
      bankName: "Banque de Tunisie",
      bankRib: "07 001 1234567890123 47",
    });
    await adminT.mutation(api.payments.updatePaymentMethodState, {
      slug: "d17",
      enabled: false,
    });

    const config = await adminT.query(api.payments.getPaymentConfigAdmin);
    expect(config!.bankName).toBe("Banque de Tunisie");
    expect(config!.bankRib).toBe("07 001 1234567890123 47");
  });
});

// ============================================================================
// Contrôle serveur des nouvelles transactions
// ============================================================================

describe("méthode désactivée — refus côté serveur", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("une demande d'abonnement Fournisseur avec une méthode désactivée est refusée", async () => {
    const adminId = await createTestUser(t, "admin", "admin7@test.com");
    const adminT = asUser(t, adminId);
    await adminT.mutation(api.payments.updatePaymentMethodState, {
      slug: "bank_transfer",
      enabled: false,
    });

    const userId = await createTestUser(t, "user", "sup-disabled@test.com");
    await createSupplierProfile(t, userId);
    const userT = asUser(t, userId);

    await expect(
      userT.mutation(api.supplierProfiles.requestSubscription, {
        paymentMethod: "bank_transfer",
      }),
    ).rejects.toThrow("PAYMENT_METHOD_DISABLED:");
  });

  it("une demande avec une méthode encore activée passe", async () => {
    const userId = await createTestUser(t, "user", "sup-ok@test.com");
    await createSupplierProfile(t, userId);
    const userT = asUser(t, userId);

    await userT.mutation(api.supplierProfiles.requestSubscription, {
      paymentMethod: "d17",
    });

    const profile = await userT.query(api.supplierProfiles.getMyProfile);
    expect(profile!.subscriptionStatus).toBe("pending");
    expect(profile!.paymentMethod).toBe("d17");
  });
});
