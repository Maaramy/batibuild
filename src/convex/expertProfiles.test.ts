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

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

const baseProfileArgs = {
  profession: "architecte" as const,
  displayName: "Ahmed Architecte",
  phone: "+216 99 222 222",
  email: "ahmed@test.com",
  specialties: ["residential", "interior"],
  regions: ["tunis", "sousse"],
};

// ============================================================================
// createProfile — mutation
// ============================================================================

describe("expertProfiles.createProfile", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("rejects if not authenticated", async () => {
    await expect(
      t.mutation(api.expertProfiles.createProfile, baseProfileArgs),
    ).rejects.toThrow("Non authentifié");
  });

  it("creates a profile for authenticated user", async () => {
    const userId = await createTestUser(t, {
      name: "Ahmed",
      email: "ahmed@test.com",
    });
    const userT = asUser(t, userId);

    const result = await userT.mutation(
      api.expertProfiles.createProfile,
      baseProfileArgs,
    );

    expect(result.success).toBe(true);
    expect(result.profileId).toBeTruthy();

    const profile = await t.run(async (ctx) => ctx.db.get(result.profileId));
    expect(profile).toBeTruthy();
    expect(profile!.userId).toBe(userId);
    expect(profile!.profession).toBe("architecte");
    expect(profile!.displayName).toBe("Ahmed Architecte");
    expect(profile!.subscriptionStatus).toBe("inactive");
    expect(profile!.isVisible).toBe(true);
  });

  it("rejects duplicate profile creation", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    await userT.mutation(api.expertProfiles.createProfile, baseProfileArgs);

    await expect(
      userT.mutation(api.expertProfiles.createProfile, baseProfileArgs),
    ).rejects.toThrow("Profil expert déjà existant");
  });

  it("rejects all profession types except the union", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    await expect(
      userT.mutation(api.expertProfiles.createProfile, {
        ...baseProfileArgs,
        profession: "invalid_profession" as any,
      }),
    ).rejects.toThrow();
  });

  it("accepts all valid professions", async () => {
    const professions = [
      "architecte",
      "bureau_etudes",
      "ingenieur",
      "promoteur_immobilier",
      "plombier",
      "electricien",
    ] as const;

    for (const profession of professions) {
      const userId = await createTestUser(t, {
        email: `${profession}@test.com`,
      });
      const userT = asUser(t, userId);

      const result = await userT.mutation(api.expertProfiles.createProfile, {
        ...baseProfileArgs,
        profession,
        displayName: `Expert ${profession}`,
        email: `${profession}@test.com`,
      });

      expect(result.success).toBe(true);
    }
  });
});

// ============================================================================
// updateProfile — mutation
// ============================================================================

describe("expertProfiles.updateProfile", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("rejects if not authenticated", async () => {
    await expect(
      t.mutation(api.expertProfiles.updateProfile, {
        displayName: "Updated",
      }),
    ).rejects.toThrow("Non authentifié");
  });

  it("updates profile fields", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    await userT.mutation(api.expertProfiles.createProfile, baseProfileArgs);

    await userT.mutation(api.expertProfiles.updateProfile, {
      displayName: "Ahmed Updated",
      phone: "+216 99 333 333",
    });

    const profile = await t.run(async (ctx) => {
      const profiles = await ctx.db
        .query("expertProfiles")
        .collect();
      return profiles.find((p: any) => p.userId === userId);
    });

    expect(profile!.displayName).toBe("Ahmed Updated");
    expect(profile!.phone).toBe("+216 99 333 333");
  });

  it("rejects update for non-existent profile", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    await expect(
      userT.mutation(api.expertProfiles.updateProfile, {
        displayName: "No Profile",
      }),
    ).rejects.toThrow("Profil expert introuvable");
  });
});

// ============================================================================
// getMyProfile — query
// ============================================================================

describe("expertProfiles.getMyProfile", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns null for unauthenticated user", async () => {
    const result = await t.query(api.expertProfiles.getMyProfile);
    expect(result).toBeNull();
  });

  it("returns null if user has no profile", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    const result = await userT.query(api.expertProfiles.getMyProfile);
    expect(result).toBeNull();
  });

  it("returns profile with effectiveStatus", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    await userT.mutation(api.expertProfiles.createProfile, baseProfileArgs);

    const profile = await userT.query(api.expertProfiles.getMyProfile);
    expect(profile).toBeTruthy();
    expect(profile!.effectiveStatus).toBe("inactive"); // trial→inactive
    expect(profile!.displayName).toBe("Ahmed Architecte");
  });

  it("normalise un ancien tarif Expert à 0 TND avant de créer une demande", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    await userT.mutation(api.expertProfiles.createProfile, baseProfileArgs);
    await t.run(async (ctx) => {
      await ctx.db.insert("paymentConfig", {
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
        expertPrice: 0,
        currency: "TND",
        updatedAt: Date.now(),
        updatedBy: userId as any,
      });
    });

    await userT.mutation(api.expertProfiles.requestSubscription, {
      paymentMethod: "d17",
    });

    const profile = await userT.query(api.expertProfiles.getMyProfile);
    expect(profile!.subscriptionStatus).toBe("pending");
    expect(profile!.paymentAmount).toBe(120);
  });
});

// ============================================================================
// hasExpertProfile — query
// ============================================================================

describe("expertProfiles.hasExpertProfile", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns false if no profile", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    const result = await userT.query(api.expertProfiles.hasExpertProfile);
    expect(result).toBe(false);
  });

  it("returns true if profile exists", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    await userT.mutation(api.expertProfiles.createProfile, baseProfileArgs);

    const result = await userT.query(api.expertProfiles.hasExpertProfile);
    expect(result).toBe(true);
  });
});

// ============================================================================
// toggleVisibility — mutation
// ============================================================================

describe("expertProfiles.toggleVisibility", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("toggles profile visibility", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    await userT.mutation(api.expertProfiles.createProfile, baseProfileArgs);

    const result1 = await userT.mutation(api.expertProfiles.toggleVisibility);
    expect(result1.isVisible).toBe(false);

    const result2 = await userT.mutation(api.expertProfiles.toggleVisibility);
    expect(result2.isVisible).toBe(true);
  });
});

// ============================================================================
// deleteProfile — mutation
// ============================================================================

describe("expertProfiles.deleteProfile", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("deletes the profile", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    await userT.mutation(api.expertProfiles.createProfile, baseProfileArgs);

    const result = await userT.mutation(api.expertProfiles.deleteProfile);
    expect(result.success).toBe(true);

    const profiles = await t.run(async (ctx) => {
      return ctx.db
        .query("expertProfiles")
        .collect();
    });

    const profile = profiles.find((p: any) => p.userId === userId);
    expect(profile).toBeUndefined();
  });
});
