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

  it("is locked: the user cannot change profile visibility", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    await userT.mutation(api.expertProfiles.createProfile, baseProfileArgs);

    // Règle produit : la visibilité est gérée automatiquement selon le
    // paiement — toute tentative utilisateur est rejetée.
    await expect(
      userT.mutation(api.expertProfiles.toggleVisibility),
    ).rejects.toThrow(/gérée automatiquement/);

    // Le profil n'a pas été modifié (il reste dans son état d'origine).
    const profile = await t.run(async (ctx) => {
      const all = await ctx.db.query("expertProfiles").collect();
      return all.find((p: any) => p.userId === userId);
    });
    expect(profile!.isVisible).toBe(true); // valeur posée à la création
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

// ============================================================================
// Logo persistence & legacy URL repair
// ============================================================================

describe("expertProfiles logo persistence", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("stores a raw logo URL (backward compat)", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    await userT.mutation(api.expertProfiles.createProfile, {
      ...baseProfileArgs,
      logo: "https://cdn.example/logo.png",
    });

    const profile = await userT.query(api.expertProfiles.getMyProfile);
    expect(profile!.logo).toBe("https://cdn.example/logo.png");
  });

  it("does not wipe the logo when updating unrelated fields", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    await userT.mutation(api.expertProfiles.createProfile, {
      ...baseProfileArgs,
      logo: "https://cdn.example/logo.png",
    });
    await userT.mutation(api.expertProfiles.updateProfile, {
      phone: "+216 99 333 333",
    });

    const profile = await userT.query(api.expertProfiles.getMyProfile);
    expect(profile!.logo).toBe("https://cdn.example/logo.png");
  });

  it("clearLogo removes the stored logo", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    await userT.mutation(api.expertProfiles.createProfile, {
      ...baseProfileArgs,
      logo: "https://cdn.example/logo.png",
    });
    await userT.mutation(api.expertProfiles.updateProfile, {
      clearLogo: true,
    });

    const profile = await userT.query(api.expertProfiles.getMyProfile);
    expect(profile!.logo).toBeUndefined();
  });

  it("legacy /api/storage logos survive profile reads without crashing", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    await userT.mutation(api.expertProfiles.createProfile, {
      ...baseProfileArgs,
      logo: "https://app.example/api/storage/abc123",
    });

    const profile = await userT.query(api.expertProfiles.getMyProfile);
    // Either healed to a real storage URL or kept as-is — never lost.
    expect(typeof profile!.logo).toBe("string");
  });
});

// ============================================================================
// Catégorie « Professionnel » — spécialité obligatoire & migration
// ============================================================================

describe("expertProfiles — catégorie Professionnel", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("exige au moins une spécialité à la création", async () => {
    const userId = await createTestUser(t, { email: "pro@test.com" });
    const userT = asUser(t, userId);

    await expect(
      userT.mutation(api.expertProfiles.createProfile, {
        ...baseProfileArgs,
        profession: "professionnel",
        specialties: [],
        email: "pro@test.com",
      }),
    ).rejects.toThrow(/spécialité/i);
  });

  it("accepte un professionnel avec sa spécialité", async () => {
    const userId = await createTestUser(t, { email: "pro2@test.com" });
    const userT = asUser(t, userId);

    const result = await userT.mutation(api.expertProfiles.createProfile, {
      ...baseProfileArgs,
      profession: "professionnel",
      specialties: ["plombier", "installateur_sanitaires"],
      email: "pro2@test.com",
    });
    expect(result.success).toBe(true);

    const profile = await t.run(async (ctx) => ctx.db.get(result.profileId));
    expect(profile!.profession).toBe("professionnel");
    expect(profile!.specialties).toEqual(["plombier", "installateur_sanitaires"]);
  });

  it("exige une spécialité lors du passage en Professionnel", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);
    await userT.mutation(api.expertProfiles.createProfile, baseProfileArgs);

    await expect(
      userT.mutation(api.expertProfiles.updateProfile, {
        profession: "professionnel",
        specialties: [],
      }),
    ).rejects.toThrow(/spécialité/i);

    // Les données existantes restent intactes.
    const profile = await userT.query(api.expertProfiles.getMyProfile);
    expect(profile!.profession).toBe("architecte");
    expect(profile!.specialties).toEqual(["residential", "interior"]);
  });

  it("réserve la migration aux administrateurs", async () => {
    const userId = await createTestUser(t);
    await expect(
      asUser(t, userId).mutation(api.expertProfiles.adminMigrateTechnicianProfessions, {}),
    ).rejects.toThrow(/Unauthorized/);
  });

  it("migre plombier / électricien vers Professionnel sans perdre leurs données", async () => {
    const adminId = await createTestUser(t, { role: "admin", email: "admin@test.com" });
    const userId = await createTestUser(t, { email: "legacy@test.com" });

    const now = Date.now();
    const legacyId = await t.run(async (ctx) =>
      ctx.db.insert("expertProfiles", {
        userId: userId as any,
        profession: "plombier",
        displayName: "Sami Plombier",
        phone: "+216 99 111 111",
        email: "legacy@test.com",
        specialties: ["reparation_fuites", "chauffe_eau"],
        regions: ["tunis"],
        plan: "none",
        subscriptionStatus: "inactive",
        isVisible: true,
        createdAt: now,
        updatedAt: now,
      }),
    );

    const result = await asUser(t, adminId).mutation(
      api.expertProfiles.adminMigrateTechnicianProfessions,
      {},
    );
    expect(result.migrated).toBe(1);

    const profile = await t.run(async (ctx) => ctx.db.get(legacyId));
    expect(profile!.profession).toBe("professionnel");
    // Métier ajouté + spécialités et régions historiques conservées.
    expect(profile!.specialties).toEqual([
      "plombier",
      "reparation_fuites",
      "chauffe_eau",
    ]);
    expect(profile!.regions).toEqual(["tunis"]);
    expect(profile!.displayName).toBe("Sami Plombier");

    // Idempotente : un second appel ne modifie plus rien.
    const again = await asUser(t, adminId).mutation(
      api.expertProfiles.adminMigrateTechnicianProfessions,
      {},
    );
    expect(again.migrated).toBe(0);
  });
});
