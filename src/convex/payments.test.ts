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
  overrides: Partial<{ role: string; name: string; email: string }> = {},
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
      phone: undefined,
      subscriptionEndDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

function asAdmin(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

// ============================================================================
// getPlanPricing — query
// ============================================================================

describe("getPlanPricing", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("retourne null pour un utilisateur non-admin", async () => {
    const userId = await createTestUser(t, { role: "user" });
    const adminT = asAdmin(t, userId);
    const result = await adminT.query(api.payments.getPlanPricing);
    expect(result).toBeNull();
  });

  it("retourne null si aucun utilisateur connecté", async () => {
    // No identity set → not authenticated
    const result = await t.query(api.payments.getPlanPricing);
    expect(result).toBeNull();
  });

  it("retourne les valeurs par défaut quand aucun paymentConfig n'existe", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    const result = await adminT.query(api.payments.getPlanPricing);

    expect(result).not.toBeNull();
    expect(result!.startPrice).toBe(80);
    expect(result!.proPrice).toBe(0);
    expect(result!.expertPrice).toBe(120);
    expect(result!.supplierPrice).toBe(120);
    expect(result!.freeProjectLimit).toBe(1000000);
    expect(result!.proProjectLimit).toBe(1000000);
    expect(result!.expertProjectLimit).toBe(1000000);
    expect(result!.freeInvestmentLimit).toBe(1000000);
    expect(result!.proInvestmentLimit).toBe(1000000);
    expect(result!.expertInvestmentLimit).toBe(1000000);
    expect(result!.freeDownloadLimit).toBe(1000000);
    expect(result!.proDownloadLimit).toBe(1000000);
    expect(result!.expertDownloadLimit).toBe(1000000);
  });

  it("retourne les valeurs personnalisées depuis un paymentConfig existant", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    // Create a paymentConfig with custom values
    await t.run(async (ctx) => {
      await ctx.db.insert("paymentConfig", {
        proPrice: 99,
        expertPrice: 399,
        supplierPrice: 150,
        currency: "TND",
        freeProjectLimit: 5,
        proProjectLimit: 20,
        expertProjectLimit: 200,
        freeDownloadLimit: 1,
        proDownloadLimit: 25,
        expertDownloadLimit: 250,
        bankName: "",
        bankTitulaire: "",
        bankRib: "",
        bankIban: "",
        bankSwift: "",
        d17MerchantName: "",
        d17Phone: "",
        d17Email: "",
        d17Notice: "",
        updatedAt: Date.now(),
      });
    });

    const result = await adminT.query(api.payments.getPlanPricing);

    expect(result).not.toBeNull();
    expect(result!.proPrice).toBe(99);
    expect(result!.expertPrice).toBe(399);
    expect(result!.supplierPrice).toBe(150);
    expect(result!.proProjectLimit).toBe(20);
    expect(result!.expertDownloadLimit).toBe(250);
  });

  it("fusionne correctement une config partielle avec les valeurs par défaut", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    // Insert config with only some fields (simulating partial initial data)
    await t.run(async (ctx) => {
      await ctx.db.insert("paymentConfig", {
        proPrice: 89,
        expertPrice: 350,
        currency: "TND",
        bankName: "",
        bankTitulaire: "",
        bankRib: "",
        bankIban: "",
        bankSwift: "",
        d17MerchantName: "",
        d17Phone: "",
        d17Email: "",
        d17Notice: "",
        updatedAt: Date.now(),
      } as any);
    });

    const result = await adminT.query(api.payments.getPlanPricing);

    expect(result).not.toBeNull();
    expect(result!.proPrice).toBe(89);             // from config
    expect(result!.expertPrice).toBe(350);          // from config
    expect(result!.supplierPrice).toBe(120);         // fallback to default
    expect(result!.freeProjectLimit).toBe(1000000);        // fallback to default
    expect(result!.proProjectLimit).toBe(1000000);         // fallback to default
  });
});

// ============================================================================
// updatePlanPricing — mutation
// ============================================================================

describe("updatePlanPricing", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("rejette les non-admins avec une erreur", async () => {
    const userId = await createTestUser(t, { role: "user" });
    const userT = asAdmin(t, userId);

    await expect(
      userT.mutation(api.payments.updatePlanPricing, { plan: "pro" }),
    ).rejects.toThrow("Unauthorized");
  });

  it("rejette si aucun utilisateur connecté", async () => {
    await expect(
      t.mutation(api.payments.updatePlanPricing, { plan: "pro" }),
    ).rejects.toThrow("Unauthorized");
  });

  it("crée une nouvelle config pour le plan pro avec les valeurs données", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    await adminT.mutation(api.payments.updatePlanPricing, {
      plan: "pro",
      price: 80,
      projectLimit: 10,
      downloadLimit: 10,
    });

    // Vérifier que la config a été créée
    const result = await adminT.query(api.payments.getPlanPricing);
    expect(result).not.toBeNull();
    expect(result!.proPrice).toBe(80);
    expect(result!.proProjectLimit).toBe(10);
    expect(result!.proDownloadLimit).toBe(10);
  });

  it("crée une nouvelle config pour le plan free", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    await adminT.mutation(api.payments.updatePlanPricing, {
      plan: "free",
      projectLimit: 5,
      downloadLimit: 0,
    });

    const result = await adminT.query(api.payments.getPlanPricing);
    expect(result).not.toBeNull();
    expect(result!.freeProjectLimit).toBe(5);
    expect(result!.freeDownloadLimit).toBe(0);
  });

  it("crée une nouvelle config pour le plan expert", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    await adminT.mutation(api.payments.updatePlanPricing, {
      plan: "expert",
      price: 320,
      projectLimit: 100,
      downloadLimit: 100,
    });

    const result = await adminT.query(api.payments.getPlanPricing);
    expect(result!.expertPrice).toBe(320);
    expect(result!.expertProjectLimit).toBe(100);
    expect(result!.expertDownloadLimit).toBe(100);
  });

  it("crée une nouvelle config pour le plan supplier", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    await adminT.mutation(api.payments.updatePlanPricing, {
      plan: "supplier",
      price: 120,
    });

    const result = await adminT.query(api.payments.getPlanPricing);
    expect(result!.supplierPrice).toBe(120);
  });

  it("enregistre un prix unique par forfait (tous les types couverts)", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    await adminT.mutation(api.payments.updatePlanPricing, {
      plan: "free",
      type: "construction",
      price: 80,
    } as any);
    await adminT.mutation(api.payments.updatePlanPricing, {
      plan: "pro",
      price: 130,
      projectLimit: 6,
      investmentLimit: 6,
      downloadLimit: 6,
    });

    const result = await adminT.query(api.payments.getPlanPricing);
    expect(result!.startPrice).toBe(80);
    expect(result!.proPrice).toBe(130);
    expect(result!.proProjectLimit).toBe(6);
    expect(result!.proInvestmentLimit).toBe(6);
    expect(result!.proDownloadLimit).toBe(6);
  });

  it("met à jour une config existante sans perdre les autres champs", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    // D'abord configurer pro
    await adminT.mutation(api.payments.updatePlanPricing, {
      plan: "pro",
      price: 80,
      projectLimit: 10,
      downloadLimit: 10,
    });

    // Puis configurer expert — les valeurs pro doivent être préservées
    await adminT.mutation(api.payments.updatePlanPricing, {
      plan: "expert",
      price: 320,
      projectLimit: 100,
      downloadLimit: 100,
    });

    const result = await adminT.query(api.payments.getPlanPricing);
    expect(result!.proPrice).toBe(80);         // preserved
    expect(result!.expertPrice).toBe(320);      // new
    expect(result!.proProjectLimit).toBe(10);   // preserved
    expect(result!.expertProjectLimit).toBe(100); // new
  });

  it("utilise les valeurs par défaut pour les champs non spécifiés", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    // Seulement un prix, pas de limite
    await adminT.mutation(api.payments.updatePlanPricing, {
      plan: "pro",
      price: 99,
    });

    const result = await adminT.query(api.payments.getPlanPricing);
    expect(result!.proPrice).toBe(99);
    // Project limit et download limit devraient avoir DEFAUT
    // Puisque update ne définit pas ces champs, ils prennent les defaults de création
    // DEFAULT_PLAN_PRICING (forfait Pro) : proProjectLimit: 5
    expect(result!.proProjectLimit).toBe(1000000);
  });
});

// ============================================================================
// getPaymentConfigAdmin — query
// ============================================================================

describe("getPaymentConfigAdmin", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("retourne null pour un non-admin", async () => {
    const userId = await createTestUser(t, { role: "user" });
    const userT = asAdmin(t, userId);

    const result = await userT.query(api.payments.getPaymentConfigAdmin);
    expect(result).toBeNull();
  });

  it("retourne null si aucun utilisateur connecté", async () => {
    const result = await t.query(api.payments.getPaymentConfigAdmin);
    expect(result).toBeNull();
  });

  it("retourne null pour un admin sans config en base", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    const result = await adminT.query(api.payments.getPaymentConfigAdmin);
    expect(result).toBeNull();
  });

  it("retourne la config complète pour un admin quand la config existe", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    await adminT.mutation(api.payments.updatePlanPricing, {
      plan: "pro",
      price: 80,
      projectLimit: 10,
      downloadLimit: 10,
    });

    const result = await adminT.query(api.payments.getPaymentConfigAdmin);
    expect(result).not.toBeNull();
    expect(result!.proPrice).toBe(80);
    expect(result!.proProjectLimit).toBe(10);
    expect(result!.updatedAt).toBeGreaterThan(0);
  });
});

// ============================================================================
// updatePaymentConfig — mutation
// ============================================================================

describe("updatePaymentConfig", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("rejette les non-admins avec une erreur", async () => {
    const userId = await createTestUser(t, { role: "user" });
    const userT = asAdmin(t, userId);

    await expect(
      userT.mutation(api.payments.updatePaymentConfig, {}),
    ).rejects.toThrow("Unauthorized");
  });

  it("crée une nouvelle config avec les coordonnées bancaires", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    await adminT.mutation(api.payments.updatePaymentConfig, {
      bankName: "Banque de Tunisie",
      bankTitulaire: "GALISKON PROJECT",
      bankRib: "07 001 1234567890123 47",
      bankIban: "TN59 0700 1123 4567 8901 2347",
      bankSwift: "BTBK TN TT",
    });

    const config = await adminT.query(api.payments.getPaymentConfigAdmin);
    expect(config).not.toBeNull();
    expect(config!.bankName).toBe("Banque de Tunisie");
    expect(config!.bankTitulaire).toBe("GALISKON PROJECT");
    expect(config!.bankRib).toBe("07 001 1234567890123 47");
    expect(config!.bankIban).toBe("TN59 0700 1123 4567 8901 2347");
    expect(config!.bankSwift).toBe("BTBK TN TT");
  });

  it("crée une nouvelle config avec les infos D17", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    await adminT.mutation(api.payments.updatePaymentConfig, {
      d17MerchantName: "GALISKON PROJECT",
      d17Phone: "+216 XX XXX XXX",
      d17Email: "paiement@batibuild.app",
      d17Notice: "Paiement via D17",
    });

    const config = await adminT.query(api.payments.getPaymentConfigAdmin);
    expect(config).not.toBeNull();
    expect(config!.d17MerchantName).toBe("GALISKON PROJECT");
    expect(config!.d17Phone).toBe("+216 XX XXX XXX");
    expect(config!.d17Email).toBe("paiement@batibuild.app");
    expect(config!.d17Notice).toBe("Paiement via D17");
  });

  it("met à jour partiellement une config existante", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    // Créer config initiale avec banque
    await adminT.mutation(api.payments.updatePaymentConfig, {
      bankName: "Banque A",
      bankTitulaire: "Titulaire A",
      bankRib: "RIB A",
    });

    // Mettre à jour seulement un champ
    await adminT.mutation(api.payments.updatePaymentConfig, {
      bankName: "Banque B",
    });

    const config = await adminT.query(api.payments.getPaymentConfigAdmin);
    expect(config!.bankName).toBe("Banque B");
    expect(config!.bankTitulaire).toBe("Titulaire A"); // preserved
    expect(config!.bankRib).toBe("RIB A"); // preserved
  });

  it("inclut les valeurs par défaut des prix dans une nouvelle config", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    await adminT.mutation(api.payments.updatePaymentConfig, {
      bankName: "BT",
    });

    const config = await adminT.query(api.payments.getPaymentConfigAdmin);
    expect(config!.proPrice).toBe(0);
    expect(config!.expertPrice).toBe(120);
    expect(config!.supplierPrice).toBe(120);
    expect(config!.currency).toBe("TND");
  });
});
