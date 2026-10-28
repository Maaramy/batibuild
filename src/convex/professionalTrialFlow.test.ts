/// <reference types="vite/client" />

// ============================================================================
// PARCOURS COMPLET DES PÉRIODES D'ESSAI EXPERT / FOURNISSEUR
// ----------------------------------------------------------------------------
// Ces tests couvrent la CAUSE des défauts signalés, pas seulement l'affichage :
//   1. l'activation de l'essai depuis « Abonnements mensuels — prix et
//      configuration » ouvre réellement la campagne et démarre l'essai ;
//   2. les durées Expert et Fournisseur sont indépendantes ;
//   3. l'essai désactivé n'accorde plus rien aux nouveaux profils ;
//   4. une demande de paiement en attente ne bloque pas et ne révoque pas
//      l'essai en cours ;
//   5. le prix est décidé par le serveur : un montant client absent ou nul
//      n'ouvre jamais gratuitement un forfait payant ;
//   6. la validation du paiement rétablit immédiatement les services et la
//      visibilité, sans attendre le cron.
// ============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";

const modules = import.meta.glob("./**/*.*s");

const DAY_MS = 24 * 60 * 60 * 1000;

let emailSeq = 0;
const nextEmail = (prefix: string) => `${prefix}-${++emailSeq}@test.com`;

type T = ReturnType<typeof convexTest>;

async function createUser(
  t: T,
  overrides: {
    role?: string;
    userRole?: "client" | "supplier" | "expert";
    trialClaimedAt?: number;
    trialStartDate?: number;
    trialEndDate?: number;
    subscriptionPlan?: string;
    subscriptionStartDate?: number;
    subscriptionEndDate?: number;
  } = {},
) {
  const now = Date.now();
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Utilisateur Test",
      email: nextEmail("user"),
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

const asUser = (t: T, userId: string) => t.withIdentity({ subject: userId });

async function asAdmin(t: T) {
  const adminId = await createUser(t, { role: "admin" });
  return asUser(t, adminId);
}

/** Profil Expert complet (publiable dès qu'un droit valide existe). */
async function insertExpertProfile(
  t: T,
  userId: Id<"users">,
  overrides: {
    subscriptionStatus?: "active" | "trial" | "inactive" | "expired" | "pending";
    subscriptionEndDate?: number;
    isVisible?: boolean;
    visibilitySuspendedBy?: "admin" | "entitlement";
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
      visibilitySuspendedBy: overrides.visibilitySuspendedBy,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

/** Profil Fournisseur complet. */
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

/** Enregistrement d'un forfait professionnel, comme le fait l'administration. */
const savePlan = (
  adminT: ReturnType<typeof asUser>,
  plan: "expert" | "supplier",
  trialEnabled: boolean,
  trialDays: number,
) =>
  adminT.mutation(api.payments.updateProfessionalPlanConfig, {
    plan,
    price: 120,
    trialEnabled,
    trialDays,
    includedServices: [],
    autoRenew: true,
    reminderDays: 3,
  });

const profileOf = (t: T, id: any) => t.run(async (ctx) => ctx.db.get(id));
const userOf = (t: T, id: Id<"users">) => t.run(async (ctx) => ctx.db.get(id));

async function activeExpertIds(t: T) {
  return (await t.query(api.expertProfiles.getActiveExperts)).map((e) => e._id);
}

async function activeSupplierIds(t: T) {
  return (await t.query(api.supplierProfiles.getActiveSuppliers)).map((s) => s._id);
}

// ============================================================================
// 1 → 3. Activation depuis l'administration
// ============================================================================

describe("activation de l'essai depuis « Abonnements mensuels »", () => {
  let t: T;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("démarre et publie l'essai Expert d'un profil déjà inscrit", async () => {
    const adminT = await asAdmin(t);
    const userId = await createUser(t, { userRole: "expert" });
    const profileId = await insertExpertProfile(t, userId, { subscriptionStatus: "inactive" });

    // Avant l'enregistrement : aucun essai, profil absent de l'annuaire.
    expect((await userOf(t, userId))?.trialClaimedAt).toBeUndefined();
    expect(await activeExpertIds(t)).not.toContain(profileId);

    await savePlan(adminT, "expert", true, 10);

    // La configuration enregistrée pilote réellement la campagne.
    const pricing = await t.query(api.payments.getPublicPricing);
    expect(pricing.expertTrialEnabled).toBe(true);
    expect(pricing.expertTrialDays).toBe(10);

    // Rechargement de l'administration : les paramètres enregistrés persistent.
    const adminView = await adminT.query(api.payments.getProfessionalPlansAdmin);
    expect(adminView?.expert.trialEnabled).toBe(true);
    expect(adminView?.expert.trialDays).toBe(10);
    expect(adminView?.supplier.trialEnabled).toBe(false);

    const user = await userOf(t, userId);
    expect(user?.trialClaimedAt).toBeGreaterThan(0);
    expect(user?.trialEndDate! - user?.trialStartDate!).toBe(10 * DAY_MS);

    const profile = await profileOf(t, profileId);
    expect(profile?.subscriptionStatus).toBe("trial");
    expect(profile?.isVisible).toBe(true);
    expect(await activeExpertIds(t)).toContain(profileId);
  });

  it("affiche le forfait, les dates et les jours restants côté utilisateur", async () => {
    const adminT = await asAdmin(t);
    const userId = await createUser(t, { userRole: "expert" });
    await insertExpertProfile(t, userId, { subscriptionStatus: "inactive" });

    await savePlan(adminT, "expert", true, 10);

    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(status?.status).toBe("trialing");
    expect(status?.isActive).toBe(true);
    expect(status?.requiresPayment).toBe(false);
    // Nom du forfait, pas un libellé générique.
    expect(status?.planName).toBe("Essai Expert");
    expect(status?.profileRole).toBe("expert");
    expect(status?.trialDaysRemaining).toBe(10);
    expect(status?.trialDaysTotal).toBe(10);
    expect(status?.trialStartDate).toBeGreaterThan(0);
    // Date à partir de laquelle le paiement devient obligatoire.
    expect(status?.endDate).toBe(status?.trialEndDate);
    expect(status?.endDate! - Date.now()).toBeGreaterThan(9 * DAY_MS);
  });

  it("gère les durées Expert et Fournisseur indépendamment", async () => {
    const adminT = await asAdmin(t);
    const expertId = await createUser(t, { userRole: "expert" });
    const supplierId = await createUser(t, { userRole: "supplier" });
    const expertProfileId = await insertExpertProfile(t, expertId, {});
    const supplierProfileId = await insertSupplierProfile(t, supplierId, {});

    await savePlan(adminT, "expert", true, 10);
    await savePlan(adminT, "supplier", true, 5);

    const expertStatus = await asUser(t, expertId).query(
      api.subscriptionStatus.getMySubscriptionStatus,
    );
    const supplierStatus = await asUser(t, supplierId).query(
      api.subscriptionStatus.getMySubscriptionStatus,
    );

    expect(expertStatus?.planName).toBe("Essai Expert");
    expect(expertStatus?.trialDaysRemaining).toBe(10);
    expect(supplierStatus?.planName).toBe("Essai Fournisseur");
    expect(supplierStatus?.trialDaysRemaining).toBe(5);

    expect(await activeExpertIds(t)).toContain(expertProfileId);
    expect(await activeSupplierIds(t)).toContain(supplierProfileId);
  });

  it("essai désactivé : aucun nouvel essai n'est accordé", async () => {
    const adminT = await asAdmin(t);
    const userId = await createUser(t, { userRole: "expert" });
    const profileId = await insertExpertProfile(t, userId, { subscriptionStatus: "inactive" });

    await savePlan(adminT, "expert", false, 10);

    const pricing = await t.query(api.payments.getPublicPricing);
    expect(pricing.expertTrialEnabled).toBe(false);

    expect((await userOf(t, userId))?.trialClaimedAt).toBeUndefined();
    const profile = await profileOf(t, profileId);
    expect(profile?.subscriptionStatus).toBe("inactive");
    expect(await activeExpertIds(t)).not.toContain(profileId);

    // Un compte qui demande explicitement l'essai est refusé côté serveur.
    const started = await asUser(t, userId).mutation(api.subscriptionStatus.startMyTrial);
    expect(started.started).toBe(false);
  });
});

// ============================================================================
// 4. Demande de paiement en attente et essai
// ============================================================================

describe("demande de paiement en attente et période d'essai", () => {
  let t: T;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("ne bloque pas le démarrage de l'essai", async () => {
    const userId = await createUser(t, { userRole: "expert" });
    const adminT = await asAdmin(t);

    // Demande de règlement AVANT tout essai : elle reste « pending ».
    await asUser(t, userId).mutation(api.subscriptions.createSubscription, {
      plan: "expert",
      paymentMethod: "d17",
      amount: 120,
      currency: "TND",
    });

    // L'administrateur ouvre ensuite l'essai : la demande en attente ne doit
    // pas empêcher le démarrage.
    await savePlan(adminT, "expert", true, 10);

    const started = await asUser(t, userId).mutation(api.subscriptionStatus.startMyTrial);
    expect(started.started).toBe(true);
    expect((await userOf(t, userId))?.trialEndDate).toBeGreaterThan(Date.now());
  });

  it("une demande de paiement pendant l'essai ne masque pas le profil", async () => {
    const adminT = await asAdmin(t);
    const userId = await createUser(t, { userRole: "supplier" });
    const profileId = await insertSupplierProfile(t, userId, {});

    await savePlan(adminT, "supplier", true, 5);
    expect(await activeSupplierIds(t)).toContain(profileId);

    // Demande de règlement depuis l'espace Fournisseur : elle passe « pending »
    // mais l'essai en cours doit rester visible et actif.
    await asUser(t, userId).mutation(api.supplierProfiles.requestSubscription, {
      paymentMethod: "d17",
    });

    expect((await profileOf(t, profileId))?.subscriptionStatus).toBe("pending");
    expect(await activeSupplierIds(t)).toContain(profileId);

    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(status?.status).toBe("trialing");
    expect(status?.isActive).toBe(true);
  });

  it("ne révoque pas les droits d'un essai déjà actif", async () => {
    const adminT = await asAdmin(t);
    const userId = await createUser(t, { userRole: "expert" });
    await insertExpertProfile(t, userId, {});

    await savePlan(adminT, "expert", true, 10);

    await asUser(t, userId).mutation(api.subscriptions.createSubscription, {
      plan: "expert",
      paymentMethod: "bank_transfer",
      amount: 120,
      currency: "TND",
    });

    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    // L'essai continue jusqu'à son échéance ; la demande attend la validation.
    expect(status?.status).toBe("trialing");
    expect(status?.isActive).toBe(true);
    expect(status?.trialDaysRemaining).toBe(10);
  });
});

// ============================================================================
// 5. Prix décidé côté serveur
// ============================================================================

describe("createSubscription — tarif décidé par le serveur", () => {
  let t: T;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  const subscriptionOf = async (userId: Id<"users">) =>
    t.run(async (ctx) =>
      (await ctx.db.query("subscriptions").collect()).find((s) => s.userId === userId),
    );

  it("un montant absent n'active pas gratuitement un forfait payant", async () => {
    const userId = await createUser(t, { userRole: "expert" });

    await asUser(t, userId).mutation(api.subscriptions.createSubscription, { plan: "expert" });

    const sub = await subscriptionOf(userId);
    expect(sub?.status).toBe("pending");
    expect(sub?.amount).toBe(120);

    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(status?.isActive).toBe(false);
  });

  it("un montant nul envoyé par le client n'accorde pas 30 jours gratuits", async () => {
    const userId = await createUser(t, { userRole: "supplier" });

    await asUser(t, userId).mutation(api.subscriptions.createSubscription, {
      plan: "supplier",
      paymentMethod: "d17",
      amount: 0,
      currency: "TND",
    });

    const sub = await subscriptionOf(userId);
    expect(sub?.status).toBe("pending");
    expect(sub?.amount).toBe(120);
    expect((await userOf(t, userId))?.subscriptionEndDate).toBeUndefined();
  });
});

// ============================================================================
// 6. Validation du paiement → services et visibilité rétablis immédiatement
// ============================================================================

describe("validation du paiement et visibilité", () => {
  let t: T;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("réaffiche le profil Expert dès la validation, sans attendre le cron", async () => {
    const now = Date.now();
    const adminT = await asAdmin(t);
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
      visibilitySuspendedBy: "entitlement",
    });
    expect(await activeExpertIds(t)).not.toContain(profileId);

    const subscriptionId = await asUser(t, userId).mutation(
      api.subscriptions.createSubscription,
      { plan: "expert", paymentMethod: "d17", amount: 120, currency: "TND" },
    );

    // Tant que le règlement n'est pas confirmé : aucune activation.
    expect((await profileOf(t, profileId))?.subscriptionStatus).toBe("expired");

    await adminT.mutation(api.subscriptions.adminApproveSubscription, { subscriptionId });

    const profile = await profileOf(t, profileId);
    expect(profile?.subscriptionStatus).toBe("active");
    expect(profile?.isVisible).toBe(true);
    expect(await activeExpertIds(t)).toContain(profileId);

    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(status?.status).toBe("active");
    expect(status?.isActive).toBe(true);
    expect(status?.subscriptionDaysRemaining).toBe(30);
  });
});
