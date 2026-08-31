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

// ============================================================================
// getMyQuotas — système de quota supprimé (accès illimité pour tous)
// ============================================================================

describe("getMyQuotas — système de quota supprimé", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("accès illimité même sans abonnement", async () => {
    const userId = await createTestUser(t);
    const userT = t.withIdentity({ subject: userId });

    const quotas = await userT.query(api.subscriptions.getMyQuotas);

    expect(quotas).not.toBeNull();
    expect(quotas!.construction.limit).toBe(Infinity);
    expect(quotas!.construction.used).toBe(0);
    expect(quotas!.construction.reached).toBe(false);
    expect(quotas!.construction.downloads.allowed).toBe(true);
    expect(quotas!.investment.limit).toBe(Infinity);
    expect(quotas!.investment.reached).toBe(false);
  });
});

// ============================================================================
// createSubscription — essai gratuit (tous profils, désactivé par défaut)
// ============================================================================

describe("createSubscription — essai gratuit", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("essai désactivé par défaut : virement → statut pending, pas d'essai", async () => {
    const userId = await createTestUser(t);
    const userT = t.withIdentity({ subject: userId });

    const subId = await userT.mutation(api.subscriptions.createSubscription, {
      plan: "free",
      paymentMethod: "bank_transfer",
      amount: 80,
      currency: "TND",
    });

    const sub = await t.run((ctx) => ctx.db.get(subId));
    expect(sub!.status).toBe("pending");
    expect(sub!.isTrial).toBeFalsy();
  });

  it("essai activé par l'admin : statut actif + isTrial pour le forfait Client (tous profils)", async () => {
    const adminId = await createTestUser(t, { role: "admin" });
    const adminT = t.withIdentity({ subject: adminId });
    await adminT.mutation(api.subscriptions.adminUpdateTrialConfig, { enabled: true, durationDays: 60 });

    const userId = await createTestUser(t);
    const userT = t.withIdentity({ subject: userId });

    const subId = await userT.mutation(api.subscriptions.createSubscription, {
      plan: "free",
      paymentMethod: "bank_transfer",
      amount: 80,
      currency: "TND",
    });

    const sub = await t.run((ctx) => ctx.db.get(subId));
    expect(sub!.status).toBe("active");
    expect(sub!.isTrial).toBe(true);

    // Durée de l'essai : 60 jours
    const days = ((sub!.endDate ?? 0) - sub!.startDate) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThanOrEqual(59);
    expect(days).toBeLessThanOrEqual(61);
  });
});
