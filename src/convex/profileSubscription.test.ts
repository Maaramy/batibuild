/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { DAY_MS } from "./subscriptionPeriods.js";
import {
  expectedPlanForProfile,
  planBelongsToProfile,
  PROFILE_SUBSCRIPTION_ERROR_MARKER,
} from "./profileSubscription.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// Helpers
// ============================================================================

const NOW = Date.now();

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
      name: overrides.name ?? "Client Test",
      email: overrides.email ?? "client@test.com",
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

async function setProPrice(t: ReturnType<typeof convexTest>, price: number | null) {
  const adminId = await createUser(t, { role: "admin", email: "admin-setprice@test.com" });
  await asUser(t, adminId).mutation(api.payments.updatePlanPricing, {
    plan: "pro",
    price,
  });
  return adminId;
}

// ============================================================================
// Logique pure
// ============================================================================

describe("planBelongsToProfile / expectedPlanForProfile", () => {
  it("associe chaque profil à son forfait exact", () => {
    expect(expectedPlanForProfile("client")).toBe("pro");
    expect(expectedPlanForProfile("supplier")).toBe("supplier");
    expect(expectedPlanForProfile("expert")).toBe("expert");
    // Particulier / sans profil explicite : offre Client Pro par défaut.
    expect(expectedPlanForProfile(null)).toBe("pro");
    expect(expectedPlanForProfile(undefined)).toBe("pro");
  });

  it("accepte l'absence de forfait (free) pour tous les profils", () => {
    expect(planBelongsToProfile("free", "client")).toBe(true);
    expect(planBelongsToProfile("free", "expert")).toBe(true);
    expect(planBelongsToProfile(null, "supplier")).toBe(true);
    expect(planBelongsToProfile(undefined, "expert")).toBe(true);
  });

  it("refuse tout forfait croisé", () => {
    expect(planBelongsToProfile("expert", "client")).toBe(false);
    expect(planBelongsToProfile("supplier", "client")).toBe(false);
    expect(planBelongsToProfile("pro", "expert")).toBe(false);
    expect(planBelongsToProfile("supplier", "expert")).toBe(false);
    expect(planBelongsToProfile("pro", "supplier")).toBe(false);
    expect(planBelongsToProfile("expert", "supplier")).toBe(false);
  });

  it("accepte la correspondance exacte", () => {
    expect(planBelongsToProfile("pro", "client")).toBe(true);
    expect(planBelongsToProfile("expert", "expert")).toBe(true);
    expect(planBelongsToProfile("supplier", "supplier")).toBe(true);
  });
});

// ============================================================================
// createSubscription — achat bloqué si forfait ≠ profil
// ============================================================================

describe("createSubscription — compatibilité profil ↔ forfait", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    await setProPrice(t, 80);
  });

  it("refuse l'offre Client Pro à un profil Expert", async () => {
    const userId = await createUser(t, { email: "expert@test.com", userRole: "expert" });
    await expect(
      asUser(t, userId).mutation(api.subscriptions.createSubscription, {
        plan: "pro",
        paymentMethod: "d17",
        amount: 80,
        currency: "TND",
      }),
    ).rejects.toThrow(PROFILE_SUBSCRIPTION_ERROR_MARKER);
  });

  it("refuse l'offre Fournisseur à un profil Client Pro", async () => {
    const userId = await createUser(t, { email: "clientpro@test.com", userRole: "client" });
    await expect(
      asUser(t, userId).mutation(api.subscriptions.createSubscription, {
        plan: "supplier",
        amount: 0,
      }),
    ).rejects.toThrow(PROFILE_SUBSCRIPTION_ERROR_MARKER);
  });

  it("refuse l'offre Client Pro à un profil Fournisseur", async () => {
    const userId = await createUser(t, { email: "fournisseur@test.com", userRole: "supplier" });
    await expect(
      asUser(t, userId).mutation(api.subscriptions.createSubscription, {
        plan: "pro",
        paymentMethod: "d17",
        amount: 80,
        currency: "TND",
      }),
    ).rejects.toThrow(PROFILE_SUBSCRIPTION_ERROR_MARKER);
  });

  it("accepte l'offre correspondant exactement au profil", async () => {
    const userId = await createUser(t, { email: "ok-expert@test.com", userRole: "expert" });
    await asUser(t, userId).mutation(api.subscriptions.createSubscription, {
      plan: "expert",
      paymentMethod: "d17",
      amount: 120,
      currency: "TND",
    });
    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    // Demande acceptée : le règlement (D17) reste à valider par l'administrateur.
    expect(status?.status).toBe("pending");
    expect(status?.planCompatible).toBe(true);
  });

  it("les comptes legacy sans userRole n'ont plus d'abonnement Client Pro mensuel : cotisation", async () => {
    const userId = await createUser(t, { email: "legacy@test.com" });

    // Client Pro n'est plus un abonnement mensuel : la souscription mensuelle
    // est refusée, même pour un compte historique sans profil explicite.
    await expect(
      asUser(t, userId).mutation(api.subscriptions.createSubscription, {
        plan: "pro",
        paymentMethod: "d17",
        amount: 80,
        currency: "TND",
      }),
    ).rejects.toThrow(/cotisation/);

    // Les droits Client Pro s'achètent par une cotisation de projets, dont le
    // prix est FIGÉ à la commande et dont les crédits n'arrivent qu'après
    // validation du paiement.
    const order = await asUser(t, userId).mutation(
      api.clientProCredits.requestClientProCotisation,
      { projects: 1, paymentMethod: "d17" },
    );
    expect(order.projects).toBe(1);
    expect(order.price).toBeGreaterThan(0);

    const credits = await asUser(t, userId).query(api.clientProCredits.getMyClientProCredits);
    expect(credits?.balance.paidGranted).toBe(0);
  });
});

// ============================================================================
// Snapshot — champs de compatibilité
// ============================================================================

describe("getMySubscriptionStatus — compatibilité exposée", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("signale une combinaison incompatible existante (Expert + Fournisseur)", async () => {
    const userId = await createUser(t, { email: "mismatch@test.com", userRole: "expert" });
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: userId as any,
        plan: "supplier",
        status: "active",
        startDate: NOW - DAY_MS,
        endDate: NOW + 10 * DAY_MS,
        amount: 120,
        currency: "TND",
        createdAt: NOW - DAY_MS,
        updatedAt: NOW - DAY_MS,
      });
    });

    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(status?.planCompatible).toBe(false);
    expect(status?.profileRole).toBe("expert");
    expect(status?.expectedPlan).toBe("expert");
    expect(status?.activePlan).toBe("supplier");
    expect(status?.profileRoleLabel).toBe("Expert");
    expect(status?.activePlanLabel).toBe("Fournisseur");
  });

  it("est compatible sans forfait (free)", async () => {
    const userId = await createUser(t, { email: "free@test.com", userRole: "supplier" });
    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(status?.planCompatible).toBe(true);
    expect(status?.expectedPlan).toBe("supplier");
  });
});

// ============================================================================
// Accès Client Pro — gating par profil
// ============================================================================

describe("checkClientProAccess — règle profil", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("un abonnement Expert actif n'accorde AUCUN droit Client Pro", async () => {
    // Gratuité initiale désactivée : la décision ne dépend que du forfait
    // professionnel, qui ne doit jamais ouvrir les services Client Pro.
    const adminId = await createUser(t, { role: "admin", email: "admin-expert-access@test.com" });
    await asUser(t, adminId).mutation(api.clientProCredits.updateClientProCreditConfig, {
      freeGrantEnabled: false,
      freeProjects: 0,
      cotisationPrice: 80,
      cotisationProjects: 1,
      tiers: [],
      refundOnDelete: false,
      allowStacking: true,
    });

    const userId = await createUser(t, { email: "exp-access@test.com", userRole: "expert" });
    await t.run(async (ctx) => {
      await ctx.db.patch(userId as any, {
        subscriptionPlan: "expert",
        subscriptionStartDate: NOW,
        subscriptionEndDate: NOW + 10 * DAY_MS,
        subscriptionStatus: "active",
      });
    });

    const access = await asUser(t, userId).query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("no_credits");
    // L'Expert conserve son propre forfait : rien n'est supprimé ni dégradé.
    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(status?.isActive).toBe(true);
    expect(status?.planCompatible).toBe(true);
  });

  it("refuse un Client Pro dont le forfait actif ne correspond pas au profil", async () => {
    // Compte client avec un abonnement « supplier » actif en base (donnée corrompue).
    const userId = await createUser(t, { email: "corrupt@test.com", userRole: "client" });
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: userId as any,
        plan: "supplier",
        status: "active",
        startDate: NOW - DAY_MS,
        endDate: NOW + 10 * DAY_MS,
        amount: 120,
        currency: "TND",
        createdAt: NOW - DAY_MS,
        updatedAt: NOW - DAY_MS,
      });
    });

    const access = await asUser(t, userId).query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("plan_not_allowed_for_profile");
  });

  it("accorde les services à un Client Pro compatible", async () => {
    const userId = await createUser(t, { email: "ok-access@test.com", userRole: "client" });
    await t.run(async (ctx) => {
      await ctx.db.patch(userId as any, {
        subscriptionPlan: "pro",
        subscriptionStartDate: NOW,
        subscriptionEndDate: NOW + 10 * DAY_MS,
        subscriptionStatus: "active",
      });
    });

    const access = await asUser(t, userId).query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(true);
    expect(access.reason).toBe("ok");
  });
});

// ============================================================================
// Profils Expert / Fournisseur — réservation par rôle
// ============================================================================

describe("requireProfileRole (via mutations profils)", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("refuse la création d'un profil expert à un profil Fournisseur", async () => {
    const userId = await createUser(t, { email: "wrong-role@test.com", userRole: "supplier" });
    await expect(
      asUser(t, userId).mutation(api.expertProfiles.createProfile, {
        profession: "architecte",
        displayName: "Ahmed Architecte",
        phone: "+216 99 222 222",
        email: "ahmed@test.com",
        specialties: ["residential"],
        regions: ["tunis"],
      }),
    ).rejects.toThrow(PROFILE_SUBSCRIPTION_ERROR_MARKER);
  });

  it("refuse la création d'un profil fournisseur à un profil Expert", async () => {
    const userId = await createUser(t, { email: "wrong-role2@test.com", userRole: "expert" });
    await expect(
      asUser(t, userId).mutation(api.supplierProfiles.createProfile, {
        companyName: "Matériaux SARL",
        phone: "+216 99 111 111",
        email: "contact@mat.test",
        address: "Tunis",
        specialties: ["ciment"],
        regions: ["tunis"],
      }),
    ).rejects.toThrow(PROFILE_SUBSCRIPTION_ERROR_MARKER);
  });

  it("crée le profil expert et aligne userRole pour un compte legacy", async () => {
    const userId = await createUser(t, { email: "legacy-expert@test.com" });
    const result = await asUser(t, userId).mutation(api.expertProfiles.createProfile, {
      profession: "architecte",
      displayName: "Legacy Expert",
      phone: "+216 99 333 333",
      email: "legacy-expert@test.com",
      specialties: ["structure"],
      regions: ["sousse"],
    });
    expect(result.success).toBe(true);
    const user = await t.run(async (ctx) => ctx.db.get(userId as any));
    expect(user?.userRole).toBe("expert");
  });
});

// ============================================================================
// setUserRole — compatibilité retournée après changement de profil
// ============================================================================

describe("setUserRole — information de compatibilité", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("retourne compatible=false quand l'abonnement actif ne suit pas le changement", async () => {
    const userId = await createUser(t, { email: "switch@test.com", userRole: "client" });
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: userId as any,
        plan: "pro",
        status: "active",
        startDate: NOW - DAY_MS,
        endDate: NOW + 10 * DAY_MS,
        amount: 80,
        currency: "TND",
        createdAt: NOW - DAY_MS,
        updatedAt: NOW - DAY_MS,
      });
    });

    const result = await asUser(t, userId).mutation(api.users.setUserRole, {
      userRole: "expert",
    });
    expect(result.success).toBe(true);
    expect(result.compatibility.compatible).toBe(false);
    expect(result.compatibility.expectedPlanLabel).toBe("Expert");
    expect(result.compatibility.activePlanLabel).toBe("Client Pro");
  });

  it("retourne compatible=true quand aucune offre n'est souscrite", async () => {
    const userId = await createUser(t, { email: "switch2@test.com", userRole: "client" });
    const result = await asUser(t, userId).mutation(api.users.setUserRole, {
      userRole: "supplier",
    });
    expect(result.compatibility.compatible).toBe(true);
  });
});
