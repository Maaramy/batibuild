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
    // Client Pro est payant par défaut (80 TND/mois)
    expect(result!.proPrice).toBe(80);
    expect(result!.expertPrice).toBe(120);
    expect(result!.supplierPrice).toBe(120);
    expect(result!.freeProjectLimit).toBe(0);
    expect(result!.proProjectLimit).toBe(1000000);
    expect(result!.expertProjectLimit).toBe(1000000);
    expect(result!.freeDownloadLimit).toBe(0);
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
    // Champ ABSENT → valeur INITIALE du forfait : un champ manquant n'est jamais
    // interprété comme « gratuit » (cause de la perte du prix enregistré par
    // l'administrateur — voir `convex/planPricing.test.ts`).
    expect(result!.supplierPrice).toBe(120);
    expect(result!.freeProjectLimit).toBe(0);             // always 0 (no free quota)
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
    expect(result!.freeProjectLimit).toBe(0);  // free limits always 0
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

  it("enregistre le prix et les limites du forfait", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    await adminT.mutation(api.payments.updatePlanPricing, {
      plan: "pro",
      price: 130,
      projectLimit: 6,
      downloadLimit: 6,
    });

    const result = await adminT.query(api.payments.getPlanPricing);
    expect(result!.startPrice).toBe(80);
    expect(result!.proPrice).toBe(130);
    expect(result!.proProjectLimit).toBe(6);
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
    expect(config!.proPrice).toBe(80);
    expect(config!.expertPrice).toBe(120);
    expect(config!.supplierPrice).toBe(120);
    expect(config!.currency).toBe("TND");
  });
});

// ============================================================================
// checkClientProAccess — switch « Offre gratuite » de l'admin
// ============================================================================
// Critère d'acceptation : quand l'administrateur active l'« Offre gratuite »
// sur le forfait Client Pro (prix null), les services de la plateforme
// (projets de construction, matériaux IA, plans architecturaux, suivi de A à Z)
// sont automatiquement activés, sans paiement.

describe("checkClientProAccess — Offre gratuite (switch admin)", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function createProUser(email: string, withPaidSub = false, expired = false) {
    return t.run(async (ctx) => {
      const now = Date.now();
      const endDate = expired ? now - 1000 : now + 30 * 24 * 60 * 60 * 1000;
      const userId = await ctx.db.insert("users", {
        name: "Client Pro",
        email,
        role: "user",
        status: "active",
        subscriptionPlan: "pro",
        image: undefined,
        company: undefined,
        phone: undefined,
        subscriptionEndDate: withPaidSub ? endDate : undefined,
        createdAt: now,
        updatedAt: now,
      });
      if (withPaidSub) {
        await ctx.db.insert("subscriptions", {
          userId,
          kind: "construction",
          plan: "pro",
          status: "active",
          startDate: now - 1000,
          endDate,
          paymentMethod: "card",
          paymentId: "pay-test",
          amount: 80,
          currency: "TND",
          monthlyDownloadCount: 0,
          downloadLimit: Infinity,
          createdAt: now,
          updatedAt: now,
        });
      }
      return userId;
    });
  }

  /** Désactive la gratuité initiale (aucun crédit accordé à l'inscription). */
  async function disableFreeGrant() {
    const adminId = await createTestUser(t, { role: "admin" });
    await asAdmin(t, adminId).mutation(api.clientProCredits.updateClientProCreditConfig, {
      freeGrantEnabled: false,
      freeProjects: 0,
      cotisationPrice: 80,
      cotisationProjects: 1,
      tiers: [],
      refundOnDelete: false,
      allowStacking: true,
    });
  }

  it("client sans cotisation : seule la gratuité initiale ouvre l'accès (crédits limités)", async () => {
    const userId = await createProUser("client@test.com");
    const userT = t.withIdentity({ subject: userId });

    const access = await userT.query(api.access.checkClientProAccess);
    // Gratuité initiale (1 projet par défaut) : accès accordé en crédits,
    // jamais un accès permanent ni un abonnement mensuel.
    expect(access.allowed).toBe(true);
    expect(access.credits?.entitled).toBe(true);
    expect(access.credits?.remaining).toBe(1);
  });

  it("abonnement Client Pro expiré et gratuité initiale désactivée : accès refusé", async () => {
    await disableFreeGrant();
    const userId = await createProUser("expired@test.com", true, true);
    const userT = t.withIdentity({ subject: userId });

    const access = await userT.query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("expired");
  });

  it("abonnement payant actif : accès accordé", async () => {
    const userId = await createProUser("paid@test.com", true);
    const userT = t.withIdentity({ subject: userId });

    const access = await userT.query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(true);
    expect(access.reason).toBe("ok");
  });

  it("l'« Offre gratuite » Client Pro ne peut plus être activée (prix null/0 refusé)", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    // L'accès permanent sans échéance ni paiement a été supprimé : l'admin ne
    // peut plus rendre Client Pro gratuit.
    await expect(
      adminT.mutation(api.payments.updatePlanPricing, {
        plan: "pro",
        price: null,
      }),
    ).rejects.toThrow(/Client Pro est payant/);

    // Le prix Client Pro reste payant (valeur initiale ou prix enregistré).
    const pricing = await adminT.query(api.payments.getPublicPricing);
    expect(pricing.proPrice).toBeGreaterThan(0);
  });

  it("un compte sans forfait payé n'obtient aucun accès Client Pro automatique", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    // Impossible d'activer une offre gratuite Client Pro (prix 0 refusé).
    await expect(
      adminT.mutation(api.payments.updatePlanPricing, {
        plan: "pro",
        price: 0,
      }),
    ).rejects.toThrow(/Client Pro est payant/);

    // Gratuité initiale désactivée : un compte neuf n'obtient aucun droit.
    await adminT.mutation(api.clientProCredits.updateClientProCreditConfig, {
      freeGrantEnabled: false,
      freeProjects: 0,
      cotisationPrice: 80,
      cotisationProjects: 1,
      tiers: [],
      refundOnDelete: false,
      allowStacking: true,
    });
    const userId = await createTestUser(t, { role: "user", email: "fresh@test.com" });
    const userT = t.withIdentity({ subject: userId });
    const access = await userT.query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("no_credits");
  });

  it("prix Client Pro payant : l'accès passe uniquement par la cotisation", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);

    await adminT.mutation(api.payments.updatePlanPricing, {
      plan: "pro",
      price: 80,
    });

    const userId = await createProUser("paidagain@test.com");
    const userT = t.withIdentity({ subject: userId });
    const access = await userT.query(api.access.checkClientProAccess);
    // Aucun abonnement mensuel Client Pro n'existe : l'accès vient des crédits.
    expect(access.credits?.remaining).toBe(1);
  });
});

// ============================================================================
// Espaces Fournisseur / Expert — activation automatique via le switch gratuit
// ============================================================================
// Critère d'acceptation : quand l'administrateur active l'« Offre gratuite »
// sur le forfait Fournisseur ou Expert, l'espace correspondant est activé
// automatiquement, sans abonnement payant.

describe("Espaces Fournisseur / Expert — switch gratuit (activation automatique)", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function createUser(email: string) {
    return t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Test",
        email,
        role: "user",
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

  async function createSupplierProfile(userId: any) {
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

  async function createExpertProfile(userId: any) {
    return t.run(async (ctx) =>
      ctx.db.insert("expertProfiles", {
        userId,
        profession: "architecte",
        displayName: "Expert Test",
        phone: "20123456",
        email: "expert@test.com",
        specialties: ["etudes"],
        regions: ["tunis"],
        plan: "none",
        subscriptionStatus: "inactive",
        isVisible: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
  }

  it("fournisseur sans abonnement : espace inactif par défaut", async () => {
    const userId = await createUser("sup-inactive@test.com");
    await createSupplierProfile(userId);
    const userT = t.withIdentity({ subject: userId });

    const profile = await userT.query(api.supplierProfiles.getMyProfile);
    expect(profile!.effectiveStatus).toBe("inactive");

    const active = await userT.query(api.supplierProfiles.getActiveSuppliers);
    expect(active.some((s) => s.companyName === "Matériaux Test")).toBe(false);
  });

  it("switch gratuit Fournisseur activé : espace fournisseur activé automatiquement", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);
    await adminT.mutation(api.payments.updatePlanPricing, {
      plan: "supplier",
      price: null,
    });

    const userId = await createUser("sup-free@test.com");
    await createSupplierProfile(userId);
    const userT = t.withIdentity({ subject: userId });

    const profile = await userT.query(api.supplierProfiles.getMyProfile);
    expect(profile!.effectiveStatus).toBe("active");
    expect(profile!.planFree).toBe(true);
    expect(profile!.price).toBe(0);

    const active = await userT.query(api.supplierProfiles.getActiveSuppliers);
    expect(active.some((s) => s.companyName === "Matériaux Test")).toBe(true);
  });

  it("switch gratuit Expert activé : espace expert activé automatiquement", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = asAdmin(t, adminId);
    await adminT.mutation(api.payments.updatePlanPricing, {
      plan: "expert",
      price: null,
    });

    const userId = await createUser("exp-free@test.com");
    await createExpertProfile(userId);
    const userT = t.withIdentity({ subject: userId });

    const profile = await userT.query(api.expertProfiles.getMyProfile);
    expect(profile!.effectiveStatus).toBe("active");
    expect(profile!.planFree).toBe(true);

    const active = await userT.query(api.expertProfiles.getActiveExperts);
    expect(active.some((e) => e.displayName === "Expert Test")).toBe(true);
  });
});
