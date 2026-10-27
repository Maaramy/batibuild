/// <reference types="vite/client" />

// ============================================================================
// ACTIVATION ET VISIBILITÉ AUTOMATIQUES — PROFILS EXPERT / FOURNISSEUR
// ----------------------------------------------------------------------------
// Scénarios obligatoires couverts :
//   1. un nouvel Expert pendant une période d'essai active → profil actif ;
//   2. un nouveau Fournisseur pendant une période d'essai active → profil actif ;
//   3. l'activation de l'essai par l'administrateur → essai démarré et profil
//      rendu visible pour les comptes professionnels déjà inscrits ;
//   4. fin de l'essai SANS abonnement → profil inactif et invisible (données,
//      profil et notifications conservés, opération idempotente) ;
//   5. fin de l'essai AVEC abonnement payé valide → profil maintenu actif et
//      visible, réaligné sur l'échéance payée (aucune interruption) ;
//   6. paiement confirmé après expiration → profil réactivé et à nouveau
//      proposé dans la mise en relation, sans doublon ni perte de données ;
//   7. période d'essai désactivée par l'administrateur → aucun nouvel essai ;
//   8. abonnement échu ou demande de paiement en attente → aucune activation
//      indue (la demande en attente survit à l'administrateur).
// La source de vérité est toujours serveur : chaque assertion lit Convex.
// ============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api, internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";

const modules = import.meta.glob("./**/*.*s");

const DAY_MS = 24 * 60 * 60 * 1000;

let emailSeq = 0;
const nextEmail = (prefix: string) => `${prefix}-${++emailSeq}@test.com`;

type T = ReturnType<typeof convexTest>;

// ============================================================================
// Helpers
// ============================================================================

async function createUser(
  t: T,
  overrides: {
    role?: string;
    email?: string;
    name?: string;
    userRole?: "client" | "supplier" | "expert";
    subscriptionPlan?: string;
    trialClaimedAt?: number;
    trialStartDate?: number;
    trialEndDate?: number;
    subscriptionStartDate?: number;
    subscriptionEndDate?: number;
  } = {},
) {
  const now = Date.now();
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: overrides.name ?? "Utilisateur Test",
      email: overrides.email ?? nextEmail("user"),
      role: overrides.role ?? "user",
      status: "active",
      userRole: overrides.userRole,
      subscriptionPlan: overrides.subscriptionPlan as never,
      trialClaimedAt: overrides.trialClaimedAt,
      trialStartDate: overrides.trialStartDate,
      trialEndDate: overrides.trialEndDate,
      subscriptionStartDate: overrides.subscriptionStartDate,
      subscriptionEndDate: overrides.subscriptionEndDate,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

function asUser(t: T, userId: string) {
  return t.withIdentity({ subject: userId });
}

async function asAdmin(t: T) {
  const adminId = await createUser(t, {
    role: "admin",
    email: nextEmail("admin"),
    name: "Admin Test",
  });
  return { adminId, adminT: asUser(t, adminId) };
}

/** Essai Expert (10 j) et Fournisseur (5 j) ouvert aux deux profils. */
const PROFESSIONAL_TRIAL = {
  enabled: true,
  durationDays: 7,
  validFrom: null,
  validUntil: null,
  eligibleProfiles: ["expert", "supplier"],
  modules: ["estimation", "pdf"],
  newAccountsOnly: false,
  expertTrialDays: 10,
  supplierTrialDays: 5,
};

/** Profil Expert complet (publiable dans l'annuaire si le droit est actif). */
async function insertExpertProfile(
  t: T,
  userId: Id<"users">,
  overrides: {
    subscriptionStatus?: "active" | "trial" | "inactive" | "expired" | "pending";
    subscriptionEndDate?: number;
    isVisible?: boolean;
  } = {},
) {
  const now = Date.now();
  return t.run(async (ctx) =>
    ctx.db.insert("expertProfiles", {
      userId,
      profession: "architecte",
      displayName: "Expert Test",
      companyName: "Cabinet Test",
      phone: "+216 22 111 222",
      email: nextEmail("expert-profil"),
      specialties: ["architecture"],
      regions: ["tunis"],
      plan: "none",
      subscriptionStatus: overrides.subscriptionStatus ?? "inactive",
      subscriptionEndDate: overrides.subscriptionEndDate,
      isVisible: overrides.isVisible ?? true,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

/** Profil Fournisseur complet (publiable dans l'annuaire si le droit est actif). */
async function insertSupplierProfile(
  t: T,
  userId: Id<"users">,
  overrides: {
    subscriptionStatus?: "active" | "trial" | "inactive" | "expired" | "pending";
    subscriptionEndDate?: number;
    isVisible?: boolean;
  } = {},
) {
  const now = Date.now();
  return t.run(async (ctx) =>
    ctx.db.insert("supplierProfiles", {
      userId,
      companyName: "Fournisseur Test",
      phone: "+216 22 333 444",
      email: nextEmail("fournisseur-profil"),
      address: "Tunis",
      specialties: ["carrelage"],
      regions: ["tunis"],
      plan: "none",
      subscriptionStatus: overrides.subscriptionStatus ?? "inactive",
      subscriptionEndDate: overrides.subscriptionEndDate,
      isVisible: overrides.isVisible ?? true,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

async function insertSubscription(
  t: T,
  userId: Id<"users">,
  plan: "pro" | "expert" | "supplier",
  endDate: number,
) {
  const now = Date.now();
  return t.run(async (ctx) =>
    ctx.db.insert("subscriptions", {
      userId,
      plan,
      status: "active",
      startDate: now,
      endDate,
      paymentMethod: "admin",
      amount: 120,
      currency: "TND",
      monthlyDownloadCount: 0,
      downloadLimit: 10,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

const profileOf = (t: T, id: any) => t.run(async (ctx) => ctx.db.get(id));
const userOf = (t: T, id: Id<"users">) => t.run(async (ctx) => ctx.db.get(id));

async function notificationsOf(t: T, userId: Id<"users">) {
  return t.run(async (ctx) =>
    (await ctx.db.query("notifications").collect()).filter((n) => n.userId === userId),
  );
}

async function activeExpertIds(t: T) {
  return (await t.query(api.expertProfiles.getActiveExperts)).map((e) => e._id);
}

async function activeSupplierIds(t: T) {
  return (await t.query(api.supplierProfiles.getActiveSuppliers)).map((s) => s._id);
}

// ============================================================================
// 1 & 2. Nouvel Expert / Nouveau Fournisseur pendant une période d'essai active
// ============================================================================

describe("inscription professionnelle pendant une période d'essai active", () => {
  let t: T;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("active et publie automatiquement le profil d'un nouvel Expert", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, PROFESSIONAL_TRIAL);

    // Inscription : le compte est créé, puis le profil est choisi.
    const userId = await createUser(t);
    await asUser(t, userId).mutation(api.users.setUserRole, { userRole: "expert" });

    // Puis le profil professionnel est enregistré.
    const created = await asUser(t, userId).mutation(api.expertProfiles.createProfile, {
      profession: "architecte",
      displayName: "Nouvel Expert",
      companyName: "Cabinet Neuf",
      phone: "+216 22 111 222",
      email: nextEmail("nouvel-expert"),
      specialties: ["architecture"],
      regions: ["tunis"],
    });

    const profile = await profileOf(t, created.profileId);
    expect(profile?.subscriptionStatus).toBe("trial");
    expect(profile?.plan).toBe("trial");
    expect(profile?.isVisible).toBe(true);
    // Durée réglée par l'administrateur pour l'essai Expert (10 jours).
    expect(profile?.subscriptionEndDate! - Date.now()).toBeGreaterThan(9 * DAY_MS);

    const user = await userOf(t, userId);
    expect(user?.trialClaimedAt).toBeGreaterThan(0);
    expect(user?.trialEndDate).toBe(profile?.subscriptionEndDate);

    // Visible dans l'annuaire et la mise en relation.
    expect(await activeExpertIds(t)).toContain(created.profileId);
  });

  it("active et publie automatiquement le profil d'un nouveau Fournisseur", async () => {
    const { adminT } = await asAdmin(t);
    await adminT.mutation(api.trialConfig.updateTrialConfig, PROFESSIONAL_TRIAL);

    const userId = await createUser(t);
    await asUser(t, userId).mutation(api.users.setUserRole, { userRole: "supplier" });

    const profileId = await asUser(t, userId).mutation(api.supplierProfiles.createProfile, {
      companyName: "Nouveau Fournisseur",
      phone: "+216 22 333 444",
      email: nextEmail("nouveau-fournisseur"),
      address: "Sousse",
      specialties: ["carrelage"],
      regions: ["sousse"],
    });

    const profile = await profileOf(t, profileId);
    expect(profile?.subscriptionStatus).toBe("trial");
    expect(profile?.isVisible).toBe(true);
    // Durée réglée par l'administrateur pour l'essai Fournisseur (5 jours).
    expect(profile?.subscriptionEndDate! - Date.now()).toBeGreaterThan(4 * DAY_MS);
    expect(profile?.subscriptionEndDate! - Date.now()).toBeLessThan(6 * DAY_MS);

    expect(await activeSupplierIds(t)).toContain(profileId);
  });
});

// ============================================================================
// 3. Activation par l'administrateur — comptes professionnels déjà inscrits
// ============================================================================

describe("activation de la période d'essai par l'administrateur", () => {
  let t: T;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("démarre l'essai et publie le profil d'un Expert déjà inscrit", async () => {
    const { adminT } = await asAdmin(t);
    const userId = await createUser(t, { userRole: "expert" });
    const profileId = await insertExpertProfile(t, userId, { subscriptionStatus: "inactive" });

    // Avant l'activation : aucun droit, profil absent de l'annuaire.
    expect(await activeExpertIds(t)).not.toContain(profileId);

    await adminT.mutation(api.trialConfig.updateTrialConfig, PROFESSIONAL_TRIAL);

    const user = await userOf(t, userId);
    expect(user?.trialClaimedAt).toBeGreaterThan(0);
    expect(user?.trialEndDate).toBeGreaterThan(Date.now());

    const profile = await profileOf(t, profileId);
    expect(profile?.subscriptionStatus).toBe("trial");
    expect(profile?.plan).toBe("trial");
    expect(profile?.isVisible).toBe(true);
    expect(profile?.subscriptionEndDate).toBe(user?.trialEndDate);

    expect(await activeExpertIds(t)).toContain(profileId);
  });
});

// ============================================================================
// 4 → 8. Fin d'essai, abonnement payé, paiement après expiration, désactivation
// ============================================================================

describe("fin de période d'essai et droits professionnels", () => {
  let t: T;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("sans abonnement : profil inactif et invisible, données conservées", async () => {
    const now = Date.now();
    const userId = await createUser(t, {
      userRole: "expert",
      trialClaimedAt: now - 12 * DAY_MS,
      trialStartDate: now - 12 * DAY_MS,
      trialEndDate: now - 2 * DAY_MS,
    });
    const profileId = await insertExpertProfile(t, userId, {
      subscriptionStatus: "trial",
      subscriptionEndDate: now - 2 * DAY_MS,
      isVisible: true,
    });

    // Dès l'échéance, l'annuaire l'exclut (contrôle à la lecture, avant même le
    // passage du cron) — mais le profil enregistré est encore marqué « trial ».
    expect(await activeExpertIds(t)).not.toContain(profileId);
    expect((await profileOf(t, profileId))?.subscriptionStatus).toBe("trial");

    const res = await t.mutation(internal.subscriptionStatus.checkSubscriptionPeriods, {});
    expect((res as any).profilesSuspended).toBe(1);

    const profile = await profileOf(t, profileId);
    expect(profile?.subscriptionStatus).toBe("expired");
    expect(profile?.isVisible).toBe(false);
    // Aucune suppression : profil, spécialité et coordonnées conservés.
    expect(profile?.displayName).toBe("Expert Test");
    expect(profile?.specialties).toEqual(["architecture"]);
    expect(profile?.phone).toBe("+216 22 111 222");

    const notifications = await notificationsOf(t, userId);
    expect(
      notifications.some((n) => n.title === "Votre profil est temporairement invisible"),
    ).toBe(true);

    // Invisible dans l'annuaire et la mise en relation.
    expect(await activeExpertIds(t)).not.toContain(profileId);

    // Idempotent : un second passage ne re-notifie pas.
    await t.mutation(internal.subscriptionStatus.checkSubscriptionPeriods, {});
    expect((await notificationsOf(t, userId)).length).toBe(notifications.length);
  });

  it("avec abonnement payé valide : profil maintenu actif et visible, sans interruption", async () => {
    const now = Date.now();
    const subscriptionEnd = now + 20 * DAY_MS;
    const userId = await createUser(t, {
      userRole: "supplier",
      subscriptionPlan: "supplier",
      trialClaimedAt: now - 10 * DAY_MS,
      trialStartDate: now - 10 * DAY_MS,
      trialEndDate: now - DAY_MS,
      subscriptionStartDate: now - DAY_MS,
      subscriptionEndDate: subscriptionEnd,
    });
    const profileId = await insertSupplierProfile(t, userId, {
      subscriptionStatus: "trial",
      subscriptionEndDate: now - DAY_MS,
      isVisible: true,
    });
    await insertSubscription(t, userId, "supplier", subscriptionEnd);

    await t.mutation(internal.subscriptionStatus.checkSubscriptionPeriods, {});

    const profile = await profileOf(t, profileId);
    expect(profile?.subscriptionStatus).toBe("active");
    expect(profile?.isVisible).toBe(true);
    // Réaligné sur l'échéance réellement payée.
    expect(profile?.subscriptionEndDate).toBe(subscriptionEnd);
    expect(await activeSupplierIds(t)).toContain(profileId);
  });

  it("paiement confirmé après expiration : profil réactivé, visible et proposé", async () => {
    const { adminId } = await asAdmin(t);
    const now = Date.now();
    const userId = await createUser(t, {
      userRole: "expert",
      trialClaimedAt: now - 12 * DAY_MS,
      trialStartDate: now - 12 * DAY_MS,
      trialEndDate: now - 2 * DAY_MS,
    });
    const profileId = await insertExpertProfile(t, userId, {
      subscriptionStatus: "expired",
      subscriptionEndDate: now - 2 * DAY_MS,
      isVisible: false,
    });

    expect(await activeExpertIds(t)).not.toContain(profileId);
    expect(
      await t.query(api.expertProfiles.getRandomByProfession, { profession: "architecte" }),
    ).toBeNull();

    // Paiement confirmé : l'administrateur attribue l'abonnement Expert.
    await asUser(t, adminId).mutation(api.users.adminUpdateUserPlan, {
      userId,
      plan: "expert",
    });

    const profile = await profileOf(t, profileId);
    expect(profile?.subscriptionStatus).toBe("active");
    expect(profile?.isVisible).toBe(true);
    expect(profile?.subscriptionEndDate).toBeGreaterThan(now);

    // Retour dans l'annuaire ET dans la mise en relation, sans doublon.
    expect(await activeExpertIds(t)).toContain(profileId);
    const suggestion = await t.query(api.expertProfiles.getRandomByProfession, {
      profession: "architecte",
    });
    expect(suggestion?._id).toBe(profileId);
    const profiles = await t.run(async (ctx) =>
      (await ctx.db.query("expertProfiles").collect()).filter((p) => p.userId === userId),
    );
    expect(profiles).toHaveLength(1);
  });

  it("période d'essai désactivée : aucun nouvel essai n'est accordé", async () => {
    const { adminT } = await asAdmin(t);
    const userId = await createUser(t, { userRole: "expert" });
    const profileId = await insertExpertProfile(t, userId, { subscriptionStatus: "inactive" });

    await adminT.mutation(api.trialConfig.updateTrialConfig, {
      ...PROFESSIONAL_TRIAL,
      enabled: false,
    });

    const user = await userOf(t, userId);
    expect(user?.trialClaimedAt).toBeUndefined();
    const profile = await profileOf(t, profileId);
    expect(profile?.subscriptionStatus).toBe("inactive");
    expect(await activeExpertIds(t)).not.toContain(profileId);

    // Un nouvel inscrit non plus.
    const newUserId = await createUser(t);
    await asUser(t, newUserId).mutation(api.users.setUserRole, { userRole: "expert" });
    const created = await asUser(t, newUserId).mutation(api.expertProfiles.createProfile, {
      profession: "architecte",
      displayName: "Expert Sans Essai",
      companyName: "Cabinet Sans Essai",
      phone: "+216 22 555 666",
      email: nextEmail("sans-essai"),
      specialties: ["architecture"],
      regions: ["tunis"],
    });

    expect((await userOf(t, newUserId))?.trialClaimedAt).toBeUndefined();
    const newProfile = await profileOf(t, created.profileId);
    expect(newProfile?.subscriptionStatus).toBe("inactive");
    expect(await activeExpertIds(t)).not.toContain(created.profileId);
  });

  it("abonnement échu ou demande en attente : aucune activation indue", async () => {
    const now = Date.now();

    // (a) Abonnement payé échu, échéance du profil dépassée → suspension.
    const expiredUserId = await createUser(t, {
      userRole: "supplier",
      subscriptionPlan: "supplier",
      subscriptionStartDate: now - 40 * DAY_MS,
      subscriptionEndDate: now - 10 * DAY_MS,
    });
    const expiredProfileId = await insertSupplierProfile(t, expiredUserId, {
      subscriptionStatus: "active",
      subscriptionEndDate: now - 10 * DAY_MS,
      isVisible: true,
    });
    await insertSubscription(t, expiredUserId, "supplier", now - 10 * DAY_MS);

    // (b) Demande de paiement en attente → jamais convertie automatiquement.
    const pendingUserId = await createUser(t, { userRole: "supplier" });
    const pendingProfileId = await insertSupplierProfile(t, pendingUserId, {
      subscriptionStatus: "pending",
      isVisible: false,
    });

    await t.mutation(internal.subscriptionStatus.checkSubscriptionPeriods, {});

    const expired = await profileOf(t, expiredProfileId);
    expect(expired?.subscriptionStatus).toBe("expired");
    expect(expired?.isVisible).toBe(false);

    const pending = await profileOf(t, pendingProfileId);
    expect(pending?.subscriptionStatus).toBe("pending");
    expect(pending?.isVisible).toBe(false);

    const actives = await activeSupplierIds(t);
    expect(actives).not.toContain(expiredProfileId);
    expect(actives).not.toContain(pendingProfileId);
  });
});
