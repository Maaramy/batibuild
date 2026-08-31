/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

type TestConvex = ReturnType<typeof convexTest>;

type TestUserOptions = {
  role?: "admin" | "moderator" | "user";
  name?: string;
  email?: string;
};

async function createTestUser(t: TestConvex, options: TestUserOptions = {}) {
  return t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert("users", {
      name: options.name ?? "Test User",
      email: options.email ?? `test-${now}@example.com`,
      role: options.role ?? "user",
      status: "active",
      subscriptionPlan: "free",
      createdAt: now,
    });
  });
}

function asUser(t: TestConvex, userId: string) {
  return t.withIdentity({ subject: userId });
}

async function insertPaymentConfig(t: TestConvex, updatedBy: string, startPrice: number) {
  return t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert("paymentConfig", {
      bankName: "",
      bankTitulaire: "",
      bankRib: "",
      bankIban: "",
      bankSwift: "",
      d17MerchantName: "",
      d17Phone: "",
      d17Email: "",
      d17Notice: "",
      proPrice: 120,
      supplierPrice: 120,
      expertPrice: 120,
      startPrice,
      currency: "TND",
      freeProjectLimit: 0,
      proProjectLimit: 1000000,
      expertProjectLimit: 1000000,
      freeInvestmentLimit: 0,
      proInvestmentLimit: 1000000,
      expertInvestmentLimit: 1000000,
      freeDownloadLimit: 0,
      proDownloadLimit: 1000000,
      expertDownloadLimit: 1000000,
      trialEnabled: true,
      trialDurationDays: 60,
      updatedAt: now,
      updatedBy: updatedBy as any,
    });
  });
}

describe("Abonnements mensuels - paiement Client", () => {
  let t: TestConvex;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("crée le forfait Client en attente de validation, même avec un montant falsifié à 0", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    const subscriptionId = await userT.mutation(api.subscriptions.createSubscription, {
      plan: "free",
      paymentMethod: "bank_transfer",
      amount: 0,
      currency: "TND",
    });

    const subscription = await userT.query(api.subscriptions.getMySubscription);
    expect(subscription?._id).toBe(subscriptionId);
    expect(subscription?.plan).toBe("free");
    expect(subscription?.status).toBe("pending");
    expect(subscription?.amount).toBe(80);
    expect(subscription?.isTrial).toBe(false);
  });

  it("remplace un tarif Client historique nul par 80 TND côté serveur", async () => {
    const userId = await createTestUser(t);
    await insertPaymentConfig(t, userId, 0);
    const userT = asUser(t, userId);

    const subscriptionId = await userT.mutation(api.subscriptions.createSubscription, {
      plan: "free",
      paymentMethod: "d17",
      amount: 0,
    });

    const subscription = await userT.query(api.subscriptions.getMySubscription);
    expect(subscription?._id).toBe(subscriptionId);
    expect(subscription?.amount).toBe(80);
    expect(subscription?.status).toBe("pending");
  });

  it("refuse les droits d'un ancien abonnement actif à 0 TND, même marqué comme essai", async () => {
    const userId = await createTestUser(t);
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("subscriptions", {
        userId: userId as any,
        kind: "construction",
        plan: "free",
        status: "active",
        startDate: now - 24 * 60 * 60 * 1000,
        endDate: now + 29 * 24 * 60 * 60 * 1000,
        amount: 0,
        currency: "TND",
        isTrial: true,
        monthlyDownloadCount: 0,
        downloadLimit: 1000000,
        createdAt: now,
        updatedAt: now,
      });
    });

    const userT = asUser(t, userId);
    const quotas = await userT.query(api.subscriptions.getMyQuotas);

    expect(quotas?.construction.plan).toBe("free");
    expect(quotas?.construction.limit).toBe(0);
    expect(quotas?.construction.downloads.allowed).toBe(false);
    expect(quotas?.investment.downloads.allowed).toBe(false);
  });

  it("conserve l'accès d'un abonnement actif dont le tarif est strictement positif", async () => {
    const userId = await createTestUser(t);
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("subscriptions", {
        userId: userId as any,
        kind: "construction",
        plan: "free",
        status: "active",
        startDate: now - 24 * 60 * 60 * 1000,
        endDate: now + 29 * 24 * 60 * 60 * 1000,
        amount: 80,
        currency: "TND",
        isTrial: false,
        monthlyDownloadCount: 0,
        downloadLimit: 1000000,
        createdAt: now,
        updatedAt: now,
      });
    });

    const userT = asUser(t, userId);
    const quotas = await userT.query(api.subscriptions.getMyQuotas);

    expect(quotas?.construction.plan).toBe("free");
    expect(quotas?.construction.limit).toBe(Infinity);
    expect(quotas?.construction.downloads.allowed).toBe(true);
  });
});
