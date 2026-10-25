/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api, internal } from "./_generated/api.js";
import { DEFAULT_TRIAL_MODULES } from "../lib/subscriptionPlans.js";

// ============================================================================
// PÉRIODE D'ESSAI GRATUITE — configuration administrable
// ----------------------------------------------------------------------------
// Remplace l'ancien forfait « Free ». Ces tests couvrent les scénarios exigés :
// inscription avec/sans essai, durée modifiable, expiration, abonnement payant
// avant l'expiration, comptes legacy « free », profils, modules protégés
// (PDF) et permissions administrateur.
// ============================================================================

const modules = import.meta.glob("./**/*.*s");
const DAY_MS = 24 * 60 * 60 * 1000;

let emailSeq = 0;
const nextEmail = (prefix: string) => `${prefix}-${++emailSeq}@test.com`;

async function createUser(
  t: ReturnType<typeof convexTest>,
  overrides: {
    role?: string;
    email?: string;
    name?: string;
    userRole?: "client" | "supplier" | "expert";
    subscriptionPlan?: string;
    trialClaimedAt?: number;
    trialStartDate?: number;
    trialEndDate?: number;
  } = {},
) {
  return t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert("users", {
      name: overrides.name ?? "Client Test",
      email: overrides.email ?? nextEmail("user"),
      role: overrides.role ?? "user",
      status: "active",
      userRole: overrides.userRole,
      image: undefined,
      company: undefined,
      phone: undefined,
      subscriptionPlan: overrides.subscriptionPlan as never,
      trialClaimedAt: overrides.trialClaimedAt,
      trialStartDate: overrides.trialStartDate,
      trialEndDate: overrides.trialEndDate,
      createdAt: now,
      updatedAt: now,
    });
  });
}

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

async function asAdmin(t: ReturnType<typeof convexTest>) {
  const adminId = await createUser(t, { role: "admin", email: nextEmail("admin") });
  return { adminId, adminT: asUser(t, adminId) };
}

const BASE_CONFIG = {
  enabled: true,
  durationDays: 14,
  validFrom: null as number | null,
  validUntil: null as number | null,
  eligibleProfiles: ["client", "supplier", "expert"],
  modules: [...DEFAULT_TRIAL_MODULES],
  newAccountsOnly: false,
};

// ============================================================================
// Configuration administrable
// ============================================================================

describe("trialConfig — configuration administrable", () => {
  let t: ReturnType<typeof convexTest>;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("aucune configuration → essai désactivé, 7 jours par défaut", async () => {
    const publicConfig = await t.query(api.trialConfig.getPublicTrialConfig);
    expect(publicConfig.enabled).toBe(false);
    expect(publicConfig.durationDays).toBe(7);
  });

  it("un non-admin ne peut pas modifier la configuration", async () => {
    const userId = await createUser(t);
    await expect(
      asUser(t, userId).mutation(api.trialConfig.updateTrialConfig, BASE_CONFIG),
    ).rejects.toThrow(/Admin/);
  });

  it("l'admin enregistre la durée, l'activation et les modules", async () => {
    const { adminT } = await asAdmin(t);

    await adminT.mutation(api.trialConfig.updateTrialConfig, {
      ...BASE_CONFIG,
      durationDays: 21,
      modules: ["estimation", "pdf"],
    });

    const stored = await adminT.query(api.trialConfig.getTrialConfig);
    expect(stored?.config.enabled).toBe(true);
    expect(stored?.config.durationDays).toBe(21);
    expect(stored?.config.modules).toEqual(["estimation", "pdf"]);

    const publicConfig = await t.query(api.trialConfig.getPublicTrialConfig);
    expect(publicConfig.enabled).toBe(true);
    expect(publicConfig.durationDays).toBe(21);
    expect(publicConfig.modules).toEqual(["estimation", "pdf"]);
  });

  it("refuse une durée hors bornes (1 à 365 jours)", async () => {
    const { adminT } = await asAdmin(t);

    await expect(
      adminT.mutation(api.trialConfig.updateTrialConfig, { ...BASE_CONFIG, durationDays: 0 }),
    ).rejects.toThrow(/entre 1 et 365/);

    await expect(
      adminT.mutation(api.trialConfig.updateTrialConfig, { ...BASE_CONFIG, durationDays: 400 }),
    ).rejects.toThrow(/entre 1 et 365/);
  });

  it("refuse une date de fin antérieure à la date de début", async () => {
    const { adminT } = await asAdmin(t);
    const now = Date.now();

    await expect(
      adminT.mutation(api.trialConfig.updateTrialConfig, {
        ...BASE_CONFIG,
        validFrom: now,
        validUntil: now - DAY_MS,
      }),
    ).rejects.toThrow(/postérieure/);
  });

  it("refuse un module ou un profil inconnu", async () => {
    const { adminT } = await asAdmin(t);

    await expect(
      adminT.mutation(api.trialConfig.updateTrialConfig, {
        ...BASE_CONFIG,
        modules: ["module_inexistant"],
      }),
    ).rejects.toThrow(/Module inconnu/);

    await expect(
      adminT.mutation(api.trialConfig.updateTrialConfig, {
        ...BASE_CONFIG,
        eligibleProfiles: ["visiteur"],
      }),
    ).rejects.toThrow(/Profil inconnu/);
  });

  it("la réinitialisation revient aux valeurs par défaut sans supprimer les données", async () => {
    const { adminT } = await asAdmin(t);
    const userId = await createUser(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, { ...BASE_CONFIG, durationDays: 30 });

    await adminT.mutation(api.trialConfig.resetTrialConfig, {});

    const stored = await adminT.query(api.trialConfig.getTrialConfig);
    expect(stored?.config.enabled).toBe(false);
    expect(stored?.config.durationDays).toBe(7);
    expect(await t.run(async (ctx) => ctx.db.get(userId as never))).not.toBeNull();
  });
});

// ============================================================================
// Démarrage de l'essai — inscription, durée, éligibilité
// ============================================================================

describe("période d'essai — démarrage", () => {
  let t: ReturnType<typeof convexTest>;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("essai activé → l'inscription démarre l'essai avec la durée configurée", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, { ...BASE_CONFIG, durationDays: 14 });

    const userId = await createUser(t);
    const res = await t.mutation(internal.subscriptionStatus.startTrialOnSignup, {
      userId: userId as never,
    });

    expect(res.started).toBe(true);
    const user = await t.run(async (ctx) => ctx.db.get(userId as never));
    expect(user?.subscriptionStatus).toBe("trialing");
    expect(user?.trialDaysTotal).toBe(14);
    expect(user?.trialEndDate! - user?.trialStartDate!).toBe(14 * DAY_MS);
  });

  it("essai désactivé → aucun essai n'est accordé", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, { ...BASE_CONFIG, enabled: false });

    const userId = await createUser(t);
    const res = await t.mutation(internal.subscriptionStatus.startTrialOnSignup, {
      userId: userId as never,
    });

    expect(res.started).toBe(false);
    expect(res.reason).toBe("trial_disabled");

    const user = await t.run(async (ctx) => ctx.db.get(userId as never));
    expect(user?.trialClaimedAt).toBeUndefined();
  });

  it("l'admin modifie la durée : les nouveaux essais suivent, les essais en cours sont conservés", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, { ...BASE_CONFIG, durationDays: 7 });

    const first = await createUser(t);
    await t.mutation(internal.subscriptionStatus.startTrialOnSignup, { userId: first as never });
    const firstBefore = await t.run(async (ctx) => ctx.db.get(first as never));

    // L'administrateur allonge la durée.
    await adminT.mutation(api.trialConfig.updateTrialConfig, { ...BASE_CONFIG, durationDays: 30 });

    const second = await createUser(t);
    await t.mutation(internal.subscriptionStatus.startTrialOnSignup, { userId: second as never });
    const firstAfter = await t.run(async (ctx) => ctx.db.get(first as never));
    const secondUser = await t.run(async (ctx) => ctx.db.get(second as never));

    // L'essai en cours n'est pas réécrit ; le nouveau dure 30 jours.
    expect(firstAfter?.trialEndDate).toBe(firstBefore?.trialEndDate);
    expect(firstAfter?.trialDaysTotal).toBe(7);
    expect(secondUser?.trialDaysTotal).toBe(30);
  });

  it("un compte ne peut jamais bénéficier d'un second essai", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, BASE_CONFIG);

    const userId = await createUser(t);
    const first = await t.mutation(internal.subscriptionStatus.startTrialOnSignup, {
      userId: userId as never,
    });
    expect(first.started).toBe(true);

    const second = await asUser(t, userId).mutation(api.subscriptionStatus.startMyTrial, {});
    expect(second.started).toBe(false);
    expect(second.reason).toBe("already_used");
  });

  it("fenêtre globale fermée → aucun essai n'est démarré", async () => {
    const { adminT } = await asAdmin(t);
    const now = Date.now();
    await adminT.mutation(api.trialConfig.updateTrialConfig, {
      ...BASE_CONFIG,
      validFrom: now - 30 * DAY_MS,
      validUntil: now - DAY_MS,
    });

    const userId = await createUser(t);
    const res = await t.mutation(internal.subscriptionStatus.startTrialOnSignup, {
      userId: userId as never,
    });
    expect(res.started).toBe(false);
    expect(res.reason).toBe("campaign_closed");
  });

  it("un essai démarré ne dépasse jamais la fin de la campagne", async () => {
    const { adminT } = await asAdmin(t);
    const now = Date.now();
    await adminT.mutation(api.trialConfig.updateTrialConfig, {
      ...BASE_CONFIG,
      durationDays: 30,
      validUntil: now + 3 * DAY_MS,
    });

    const userId = await createUser(t);
    const res = await t.mutation(internal.subscriptionStatus.startTrialOnSignup, {
      userId: userId as never,
    });
    expect(res.started).toBe(true);
    expect(res.trialEndDate).toBeLessThanOrEqual(now + 3 * DAY_MS + 5000);
  });

  it("profils éligibles : un fournisseur exclu ne reçoit pas d'essai", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, {
      ...BASE_CONFIG,
      eligibleProfiles: ["client"],
    });

    const supplier = await createUser(t, { userRole: "supplier", email: nextEmail("sup") });
    const res = await t.mutation(internal.subscriptionStatus.startTrialOnSignup, {
      userId: supplier as never,
    });
    expect(res.started).toBe(false);
    expect(res.reason).toBe("profile_not_eligible");
  });

  it("profils éligibles : client, fournisseur et expert reçoivent l'essai quand ils sont cochés", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, BASE_CONFIG);

    for (const userRole of ["client", "supplier", "expert"] as const) {
      const userId = await createUser(t, { userRole, email: nextEmail(userRole) });
      const res = await t.mutation(internal.subscriptionStatus.startTrialOnSignup, {
        userId: userId as never,
      });
      expect(res.started).toBe(true);
    }
  });

  it("essai réservé aux nouveaux inscrits : le rattrapage est refusé", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, {
      ...BASE_CONFIG,
      newAccountsOnly: true,
    });

    const existing = await createUser(t, { email: nextEmail("ancien") });
    const catchUp = await asUser(t, existing).mutation(api.subscriptionStatus.startMyTrial, {});
    expect(catchUp.started).toBe(false);
    expect(catchUp.reason).toBe("existing_account_only");

    const signup = await t.mutation(internal.subscriptionStatus.startTrialOnSignup, {
      userId: existing as never,
    });
    expect(signup.started).toBe(true);
  });
});

// ============================================================================
// Expiration et droits pendant l'essai
// ============================================================================

describe("période d'essai — expiration et droits", () => {
  let t: ReturnType<typeof convexTest>;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("essai actif → accès autorisé ; essai expiré → accès bloqué et paiement requis", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, BASE_CONFIG);

    const now = Date.now();
    const active = await createUser(t, {
      email: nextEmail("actif"),
      trialClaimedAt: now - DAY_MS,
      trialStartDate: now - DAY_MS,
      trialEndDate: now + 6 * DAY_MS,
    });
    const accessActive = await asUser(t, active).query(api.access.checkClientProAccess);
    expect(accessActive.allowed).toBe(true);
    expect(accessActive.status).toBe("trialing");

    const expired = await createUser(t, {
      email: nextEmail("expire"),
      trialClaimedAt: now - 10 * DAY_MS,
      trialStartDate: now - 10 * DAY_MS,
      trialEndDate: now - DAY_MS,
    });
    const accessExpired = await asUser(t, expired).query(api.access.checkClientProAccess);
    expect(accessExpired.allowed).toBe(false);
    expect(accessExpired.reason).toBe("trial_expired");
    expect(accessExpired.requiresPayment).toBe(true);
  });

  it("les rapports PDF suivent le module configuré (jamais accordés par défaut)", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, {
      ...BASE_CONFIG,
      modules: ["estimation"],
    });

    const now = Date.now();
    const userId = await createUser(t, {
      email: nextEmail("pdf"),
      trialClaimedAt: now - DAY_MS,
      trialStartDate: now - DAY_MS,
      trialEndDate: now + 6 * DAY_MS,
    });

    const denied = await asUser(t, userId).query(api.access.canDownloadPdf);
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe("trial_no_module");

    // L'administrateur ouvre le module PDF : l'essai en cours y donne accès.
    await adminT.mutation(api.trialConfig.updateTrialConfig, {
      ...BASE_CONFIG,
      modules: ["estimation", "pdf"],
    });
    const allowed = await asUser(t, userId).query(api.access.canDownloadPdf);
    expect(allowed.allowed).toBe(true);
  });

  it("un abonnement payant attribué avant l'expiration remplace l'essai", async () => {
    const { adminId, adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, BASE_CONFIG);

    const now = Date.now();
    const userId = await createUser(t, {
      email: nextEmail("abonne"),
      userRole: "client",
      trialClaimedAt: now - DAY_MS,
      trialStartDate: now - DAY_MS,
      trialEndDate: now + 6 * DAY_MS,
    });

    // Attribution manuelle par l'administrateur (Client Pro).
    await asUser(t, adminId).mutation(api.users.adminUpdateUserPlan, {
      userId: userId as never,
      plan: "pro",
    });

    const snapshot = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(snapshot?.status).toBe("active");
    expect(snapshot?.type).toBe("monthly");

    const user = await t.run(async (ctx) => ctx.db.get(userId as never));
    // L'essai est consommé et ne sera jamais rejoué.
    expect(user?.trialClaimedAt).toBeTruthy();
    expect(user?.trialEndDate).toBeUndefined();
  });
});

// ============================================================================
// Migration de l'ancien forfait « Free » (supprimé)
// ============================================================================

describe("migration de l'ancien forfait Free", () => {
  let t: ReturnType<typeof convexTest>;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("convertit les comptes « free » sans perdre leurs données", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, BASE_CONFIG);

    const userId = await createUser(t, {
      email: nextEmail("legacy"),
      subscriptionPlan: "free",
    });
    const projectId = await t.run(async (ctx) => {
      const now = Date.now();
      return ctx.db.insert("projects", {
        userId,
        name: "Projet historique",
        category: "villa",
        status: "completed",
        createdAt: now,
        updatedAt: now,
      });
    });

    const preview = await adminT.query(api.subscriptionStatus.getFreePlanMigrationPreview);
    expect(preview?.total).toBe(1);

    const res = await adminT.mutation(api.subscriptionStatus.migrateLegacyFreePlanUsers, {});
    expect(res.migrated).toBe(1);
    expect(res.trialsStarted).toBe(1);

    const user = await t.run(async (ctx) => ctx.db.get(userId as never));
    expect(user?.subscriptionPlan).toBeUndefined();
    expect(user?.trialClaimedAt).toBeTruthy();
    expect(await t.run(async (ctx) => ctx.db.get(projectId))).not.toBeNull();

    // Idempotent : plus aucun candidat au second passage.
    const again = await adminT.mutation(api.subscriptionStatus.migrateLegacyFreePlanUsers, {});
    expect(again.candidates).toBe(0);
    expect(again.migrated).toBe(0);
  });

  it("conserve un abonnement payant actif et ne démarre aucun essai", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, BASE_CONFIG);

    const now = Date.now();
    const userId = await createUser(t, {
      email: nextEmail("legacy-pro"),
      subscriptionPlan: "free",
    });
    await t.run(async (ctx) =>
      ctx.db.insert("subscriptions", {
        userId,
        plan: "pro",
        status: "active",
        startDate: now - DAY_MS,
        endDate: now + 20 * DAY_MS,
        amount: 80,
        currency: "TND",
        monthlyDownloadCount: 0,
        downloadLimit: 1000,
        createdAt: now,
        updatedAt: now,
      }),
    );

    const res = await adminT.mutation(api.subscriptionStatus.migrateLegacyFreePlanUsers, {});
    expect(res.paidPreserved).toBe(1);
    expect(res.trialsStarted).toBe(0);

    const user = await t.run(async (ctx) => ctx.db.get(userId as never));
    expect(user?.subscriptionPlan).toBe("pro");
  });

  it("un non-admin ne peut pas lancer la migration", async () => {
    const userId = await createUser(t);
    await expect(
      asUser(t, userId).mutation(api.subscriptionStatus.migrateLegacyFreePlanUsers, {}),
    ).rejects.toThrow(/Admin/);
  });

  it("la migration en simulation n'écrit rien", async () => {
    const { adminT } = await asAdmin(t);
    const userId = await createUser(t, { email: nextEmail("dry"), subscriptionPlan: "free" });

    const res = await adminT.mutation(api.subscriptionStatus.migrateLegacyFreePlanUsers, {
      dryRun: true,
    });
    expect(res.candidates).toBe(1);
    expect(res.migrated).toBe(0);

    const user = await t.run(async (ctx) => ctx.db.get(userId as never));
    expect(user?.subscriptionPlan).toBe("free");
    expect(user?.trialClaimedAt).toBeUndefined();
  });
});
