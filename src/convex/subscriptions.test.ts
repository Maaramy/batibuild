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

async function createSubscription(
  t: ReturnType<typeof convexTest>,
  userId: string,
  overrides: Partial<{ plan: string; status: string; startDate: number; endDate: number }> = {},
) {
  const now = Date.now();
  return t.run(async (ctx) => {
    return ctx.db.insert("subscriptions", {
      userId: userId as any,
      plan: (overrides.plan ?? "free") as any,
      status: (overrides.status ?? "active") as any,
      startDate: overrides.startDate ?? now,
      endDate: overrides.endDate ?? now + 30 * 24 * 60 * 60 * 1000,
      paymentMethod: "bank_transfer",
      amount: 80,
      currency: "TND",
      monthlyDownloadCount: 0,
      downloadLimit: Infinity,
      createdAt: now,
      updatedAt: now,
    });
  });
}

// ============================================================================
// getMyQuotas — accès payant obligatoire (pas d'accès gratuit permanent)
// ============================================================================

describe("getMyQuotas — palier gratuit vs forfait payant", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("sans abonnement actif : palier gratuit plafonné (1 projet, pas de téléchargements)", async () => {
    const userId = await createTestUser(t);
    const userT = t.withIdentity({ subject: userId });

    const quotas = await userT.query(api.subscriptions.getMyQuotas);

    expect(quotas).not.toBeNull();
    expect(quotas!.construction.limit).toBe(1); // palier gratuit plafonné (plus d'accès illimité)
    expect(quotas!.investment.limit).toBe(1);
    expect(quotas!.construction.downloads.allowed).toBe(false);
    expect(quotas!.construction.reached).toBe(false); // 0 utilisé < 1
  });

  it("forfait Client payant (plan free, abonnement actif) : accès illimité", async () => {
    const userId = await createTestUser(t);
    await createSubscription(t, userId, { plan: "free", status: "active" });
    const userT = t.withIdentity({ subject: userId });

    const quotas = await userT.query(api.subscriptions.getMyQuotas);

    expect(quotas).not.toBeNull();
    expect(quotas!.construction.limit).toBe(Infinity);
    expect(quotas!.investment.limit).toBe(Infinity);
    expect(quotas!.construction.downloads.allowed).toBe(true);
    expect(quotas!.construction.reached).toBe(false);
  });

  it("abonnement expiré : retour au palier gratuit plafonné", async () => {
    const userId = await createTestUser(t);
    await createSubscription(t, userId, {
      plan: "free",
      status: "active",
      endDate: Date.now() - 1000, // échéance dépassée → renouvellement requis
    });
    const userT = t.withIdentity({ subject: userId });

    const quotas = await userT.query(api.subscriptions.getMyQuotas);

    expect(quotas!.construction.limit).toBe(1);
    expect(quotas!.construction.downloads.allowed).toBe(false);
  });
});
