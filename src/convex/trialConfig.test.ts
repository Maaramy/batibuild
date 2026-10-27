/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api, internal } from "./_generated/api.js";
import { DEFAULT_TRIAL_MODULES, TRIAL_MAX_DAYS } from "../lib/subscriptionPlans.js";

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
      // Profil par défaut des tests de démarrage : Fournisseur (éligible).
      // Les tests Client Pro passent explicitement `userRole: "client"`.
      userRole: overrides.userRole ?? "expert",
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
  eligibleProfiles: ["supplier", "expert"],
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

  it("accepte Client Pro dans les profils éligibles et enregistre sa durée dédiée", async () => {
    const { adminT } = await asAdmin(t);

    await adminT.mutation(api.trialConfig.updateTrialConfig, {
      ...BASE_CONFIG,
      eligibleProfiles: ["client", "expert"],
      clientProDurationDays: 21,
    });

    const stored = await adminT.query(api.trialConfig.getTrialConfig);
    expect(stored?.config.eligibleProfiles).toEqual(["client", "expert"]);
    expect(stored?.config.clientProDurationDays).toBe(21);
    // La durée commune n'est pas modifiée par la durée Client Pro.
    expect(stored?.config.durationDays).toBe(BASE_CONFIG.durationDays);
  });

  it("refuse une durée d'essai Client Pro hors bornes", async () => {
    const { adminT } = await asAdmin(t);

    await expect(
      adminT.mutation(api.trialConfig.updateTrialConfig, {
        ...BASE_CONFIG,
        clientProDurationDays: TRIAL_MAX_DAYS + 1,
      }),
    ).rejects.toThrow(/Client Pro/);

    await expect(
      adminT.mutation(api.trialConfig.updateTrialConfig, {
        ...BASE_CONFIG,
        clientProDurationDays: 0,
      }),
    ).rejects.toThrow(/Client Pro/);
  });

  it("une ancienne configuration incluant Client Pro est conservée telle quelle", async () => {
    const { adminT } = await asAdmin(t);

    // Document historique : Client Pro y figure déjà, la configuration doit
    // être respectée (plus aucune exclusion imposée par le code).
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
        currency: "TND",
        trialEnabled: true,
        trialEligibleProfiles: ["client", "supplier", "expert"],
        updatedAt: Date.now(),
      } as never);
    });

    const stored = await adminT.query(api.trialConfig.getTrialConfig);
    expect(stored?.config.eligibleProfiles).toEqual(["client", "supplier", "expert"]);

    const clientId = await createUser(t, { userRole: "client", email: nextEmail("legacy-client") });
    const res = await t.mutation(internal.subscriptionStatus.startTrialOnSignup, {
      userId: clientId as never,
    });
    expect(res.started).toBe(true);
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
      eligibleProfiles: ["expert"],
    });

    const supplier = await createUser(t, { userRole: "supplier", email: nextEmail("sup") });
    const res = await t.mutation(internal.subscriptionStatus.startTrialOnSignup, {
      userId: supplier as never,
    });
    expect(res.started).toBe(false);
    expect(res.reason).toBe("profile_not_eligible");
  });

  it("profils éligibles : fournisseur et expert reçoivent l'essai, Client Pro non coché est exclu", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, BASE_CONFIG);

    for (const userRole of ["supplier", "expert"] as const) {
      const userId = await createUser(t, { userRole, email: nextEmail(userRole) });
      const res = await t.mutation(internal.subscriptionStatus.startTrialOnSignup, {
        userId: userId as never,
      });
      expect(res.started).toBe(true);
    }

    const clientId = await createUser(t, { userRole: "client", email: nextEmail("client") });
    const clientRes = await t.mutation(internal.subscriptionStatus.startTrialOnSignup, {
      userId: clientId as never,
    });
    expect(clientRes.started).toBe(false);
    expect(clientRes.reason).toBe("profile_not_eligible");
  });

  it("tant que Client Pro n'est pas coché, son inscription ne démarre aucun essai", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, {
      ...BASE_CONFIG,
      durationDays: 30,
    });

    const clientId = await createUser(t, { userRole: "client", email: nextEmail("new-client") });
    const res = await t.mutation(internal.subscriptionStatus.startTrialOnSignup, {
      userId: clientId as never,
    });

    expect(res.started).toBe(false);
    const user = await t.run(async (ctx) => ctx.db.get(clientId as never));
    expect(user?.trialClaimedAt).toBeUndefined();
    expect(user?.trialEndDate).toBeUndefined();
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
    // Accès Client Pro : profil explicite « client ».
    const active = await createUser(t, {
      email: nextEmail("actif"),
      userRole: "client",
      trialClaimedAt: now - DAY_MS,
      trialStartDate: now - DAY_MS,
      trialEndDate: now + 6 * DAY_MS,
    });
    const accessActive = await asUser(t, active).query(api.access.checkClientProAccess);
    expect(accessActive.allowed).toBe(true);
    expect(accessActive.status).toBe("trialing");

    const expired = await createUser(t, {
      email: nextEmail("expire"),
      userRole: "client",
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
      userRole: "client",
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
// Essai Client Pro — activation, durée, expiration, passage au payant
// ============================================================================

describe("période d'essai — Client Pro", () => {
  let t: ReturnType<typeof convexTest>;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  const CLIENT_CONFIG = {
    ...BASE_CONFIG,
    durationDays: 7,
    eligibleProfiles: ["client"],
    clientProDurationDays: 21,
  };

  it("un nouvel inscrit Client Pro démarre l'essai avec la durée dédiée", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, CLIENT_CONFIG);

    const userId = await createUser(t, { userRole: "client", email: nextEmail("pro-essai") });
    const res = await t.mutation(internal.subscriptionStatus.startTrialOnSignup, {
      userId: userId as never,
    });

    expect(res.started).toBe(true);
    const user = await t.run(async (ctx) => ctx.db.get(userId as never));
    expect(user?.trialDaysTotal).toBe(21);
    expect(user?.trialEndDate! - user?.trialStartDate!).toBe(21 * DAY_MS);

    const snapshot = await asUser(t, userId).query(
      api.subscriptionStatus.getMySubscriptionStatus,
    );
    expect(snapshot?.status).toBe("trialing");
    expect(snapshot?.type).toBe("trial");
    expect(snapshot?.trialDaysRemaining).toBe(21);

    const access = await asUser(t, userId).query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(true);
  });

  it("sans durée dédiée, Client Pro suit la durée commune", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, {
      ...CLIENT_CONFIG,
      durationDays: 10,
      clientProDurationDays: null,
    });

    const userId = await createUser(t, { userRole: "client", email: nextEmail("pro-commun") });
    await t.mutation(internal.subscriptionStatus.startTrialOnSignup, {
      userId: userId as never,
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId as never));
    expect(user?.trialDaysTotal).toBe(10);
    expect(user?.trialEndDate! - user?.trialStartDate!).toBe(10 * DAY_MS);
  });

  it("les paramètres restent identiques après relecture (actualisation / reconnexion)", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, CLIENT_CONFIG);

    // Nouvelle session administrateur : même configuration enregistrée.
    const secondAdmin = await createUser(t, { role: "admin", email: nextEmail("admin2") });
    const reloaded = await asUser(t, secondAdmin).query(api.trialConfig.getTrialConfig);
    expect(reloaded?.config.enabled).toBe(true);
    expect(reloaded?.config.durationDays).toBe(7);
    expect(reloaded?.config.clientProDurationDays).toBe(21);
    expect(reloaded?.config.eligibleProfiles).toEqual(["client"]);

    // La page Abonnements (lecture publique) expose les mêmes valeurs.
    const pricing = await t.query(api.payments.getPublicPricing);
    expect(pricing.trialEnabled).toBe(true);
    expect(pricing.trialEligibleProfiles).toContain("client");
    expect(pricing.trialClientProDurationDays).toBe(21);
  });

  it("à l'expiration : accès Client Pro retiré, invitation à souscrire, projets conservés", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, CLIENT_CONFIG);

    const now = Date.now();
    const userId = await createUser(t, {
      userRole: "client",
      email: nextEmail("pro-expire"),
      trialClaimedAt: now - 9 * DAY_MS,
      trialStartDate: now - 9 * DAY_MS,
      trialEndDate: now - DAY_MS,
    });
    await t.run(async (ctx) =>
      ctx.db.patch(userId as never, { subscriptionStatus: "trialing" }),
    );
    const projectId = await t.run(async (ctx) =>
      ctx.db.insert("projects", {
        userId,
        name: "Projet conservé",
        category: "villa",
        createdAt: now - 5 * DAY_MS,
        updatedAt: now - 5 * DAY_MS,
      }),
    );

    await t.mutation(internal.subscriptionStatus.checkSubscriptionPeriods, {});

    const user = await t.run(async (ctx) => ctx.db.get(userId as never));
    expect(user?.subscriptionStatus).toBe("trial_expired");
    expect(user?.trialDaysRemaining).toBe(0);

    const snapshot = await asUser(t, userId).query(
      api.subscriptionStatus.getMySubscriptionStatus,
    );
    expect(snapshot?.status).toBe("trial_expired");
    expect(snapshot?.requiresPayment).toBe(true);

    const access = await asUser(t, userId).query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("trial_expired");

    const notifications = await t.run(async (ctx) =>
      (await ctx.db.query("notifications").collect()).filter((n) => n.userId === userId),
    );
    expect(
      notifications.some(
        (n) =>
          n.title === "Votre essai Client Pro est terminé" &&
          n.message.includes("forfait Client Pro mensuel"),
      ),
    ).toBe(true);

    // Aucun abonnement payant n'a été créé sans paiement.
    const subs = await t.run(async (ctx) =>
      (await ctx.db.query("subscriptions").collect()).filter((s) => s.userId === userId),
    );
    expect(subs.filter((s) => s.status === "active")).toHaveLength(0);

    // Les projets existants ne sont jamais supprimés.
    expect(await t.run(async (ctx) => ctx.db.get(projectId))).not.toBeNull();
  });

  it("après l'essai, seul un paiement confirmé active Client Pro (30 jours)", async () => {
    const { adminId, adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, CLIENT_CONFIG);

    const now = Date.now();
    const userId = await createUser(t, {
      userRole: "client",
      email: nextEmail("pro-paiement"),
      trialClaimedAt: now - 22 * DAY_MS,
      trialStartDate: now - 22 * DAY_MS,
      trialEndDate: now - DAY_MS,
    });
    await t.mutation(internal.subscriptionStatus.checkSubscriptionPeriods, {});

    const subscriptionId = await asUser(t, userId).mutation(
      api.subscriptions.createSubscription,
      { plan: "pro", paymentMethod: "d17", amount: 80, currency: "TND" },
    );

    // Demande envoyée : toujours aucun accès tant que le paiement n'est pas validé.
    const pending = await asUser(t, userId).query(
      api.subscriptionStatus.getMySubscriptionStatus,
    );
    expect(pending?.status).toBe("pending");
    expect(pending?.isActive).toBe(false);

    await asUser(t, adminId).mutation(api.subscriptions.adminApproveSubscription, {
      subscriptionId,
    });

    const active = await asUser(t, userId).query(
      api.subscriptionStatus.getMySubscriptionStatus,
    );
    expect(active?.status).toBe("active");
    expect(active?.isActive).toBe(true);
    expect(active?.subscriptionDaysRemaining).toBe(30);
    expect((await asUser(t, userId).query(api.access.checkClientProAccess)).allowed).toBe(true);
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

  it("convertit les comptes « free » sans perdre leurs données (aucun essai Client Pro)", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, BASE_CONFIG);

    const userId = await createUser(t, {
      email: nextEmail("legacy"),
      userRole: "client",
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
    // Client Pro : plus aucune période d'essai automatique, même en migration.
    expect(res.trialsStarted).toBe(0);

    const user = await t.run(async (ctx) => ctx.db.get(userId as never));
    expect(user?.subscriptionPlan).toBeUndefined();
    expect(user?.trialClaimedAt).toBeUndefined();
    expect(user?.subscriptionStatus).toBe("none");
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
