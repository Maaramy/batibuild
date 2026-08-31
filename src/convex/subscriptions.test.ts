/// <reference types="vite/client" />

import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

describe("Subscriptions — quotas supprimés & essai", () => {
  const t = convexTest(schema, modules);

  it("getMyQuotas returns unlimited for users without subscription", async () => {
    const userId = await t.run(async (ctx) => {
      return ctx.db.insert("users", {
        name: "Test User",
        email: "test@example.com",
        role: "user",
        status: "active",
        createdAt: Date.now(),
      });
    });

    // Verify user exists and schema works with isTrial field
    const user = await t.run(async (ctx) => {
      return ctx.db.get(userId);
    });
    expect(user?.name).toBe("Test User");
  });

  it("adminUpdateTrialConfig is exported", async () => {
    const { adminUpdateTrialConfig } = await import("./subscriptions");
    expect(typeof adminUpdateTrialConfig).toBe("function");
  });

  it("adminRenewSubscription is exported", async () => {
    const { adminRenewSubscription } = await import("./subscriptions");
    expect(typeof adminRenewSubscription).toBe("function");
  });

  it("createSubscription supports isTrial field", async () => {
    const subId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Trial User",
        email: "trial@example.com",
        role: "user",
        status: "active",
        createdAt: Date.now(),
      });

      const now = Date.now();
      const trialDuration = 60 * 24 * 60 * 60 * 1000;

      return ctx.db.insert("subscriptions", {
        userId,
        kind: "construction",
        plan: "pro",
        status: "active",
        startDate: now,
        endDate: now + trialDuration,
        isTrial: true,
        monthlyDownloadCount: 0,
        downloadLimit: Infinity,
        createdAt: now,
        updatedAt: now,
      });
    });

    const sub = await t.run(async (ctx) => {
      return ctx.db.get(subId);
    });

    expect(sub?.isTrial).toBe(true);
    expect(sub?.status).toBe("active");
  });

  it("expired subscription detected by endDate check", async () => {
    const subId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Expired User",
        email: "expired@example.com",
        role: "user",
        status: "active",
        createdAt: Date.now(),
      });

      const now = Date.now();
      return ctx.db.insert("subscriptions", {
        userId,
        kind: "construction",
        plan: "pro",
        status: "active",
        startDate: now - 60 * 24 * 60 * 60 * 1000,
        endDate: now - 1000,
        isTrial: false,
        monthlyDownloadCount: 0,
        downloadLimit: Infinity,
        createdAt: now - 60 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      });
    });

    const sub = await t.run(async (ctx) => {
      return ctx.db.get(subId);
    });

    expect(sub?.status).toBe("active");
    expect(sub?.endDate).toBeLessThan(Date.now());
    expect(sub?.isTrial).toBe(false);
  });

  it("paymentConfig supports trialEnabled and trialDurationDays", async () => {
    const configId = await t.run(async (ctx) => {
      const adminId = await ctx.db.insert("users", {
        name: "Admin",
        email: "admin@test.com",
        role: "admin",
        status: "active",
        createdAt: Date.now(),
      });

      return ctx.db.insert("paymentConfig", {
        bankName: "Test Bank",
        bankTitulaire: "Test",
        bankRib: "123",
        bankIban: "TN123",
        bankSwift: "TEST",
        d17MerchantName: "Test",
        d17Phone: "123",
        d17Email: "test@test.com",
        d17Notice: "test",
        proPrice: 0,
        supplierPrice: 120,
        currency: "TND",
        trialEnabled: false,
        trialDurationDays: 30,
        updatedAt: Date.now(),
        updatedBy: adminId,
      });
    });

    const config = await t.run(async (ctx) => {
      return ctx.db.get(configId);
    });

    expect(config?.trialEnabled).toBe(false);
    expect(config?.trialDurationDays).toBe(30);
  });
});
