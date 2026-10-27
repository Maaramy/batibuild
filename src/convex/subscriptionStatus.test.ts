/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api, internal } from "./_generated/api.js";
import {
  DAY_MS,
  MONTHLY_DURATION_DAYS,
  TRIAL_DURATION_DAYS,
  computeSubscriptionSnapshot,
  daysRemainingUntil,
} from "./subscriptionPeriods.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// Helpers
// ============================================================================

const NOW = Date.UTC(2026, 0, 15, 12, 0, 0);

async function createUser(
  t: ReturnType<typeof convexTest>,
  overrides: {
    role?: string;
    email?: string;
    name?: string;
    userRole?: "client" | "supplier" | "expert";
    trialClaimedAt?: number;
    trialStartDate?: number;
    trialEndDate?: number;
    subscriptionStartDate?: number;
    subscriptionEndDate?: number;
  } = {},
) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: overrides.name ?? "Client Test",
      email: overrides.email ?? "client@test.com",
      role: overrides.role ?? "user",
      status: "active",
      userRole: overrides.userRole,
      subscriptionPlan: "free",
      image: undefined,
      company: undefined,
      phone: undefined,
      subscriptionEndDate: overrides.subscriptionEndDate,
      trialClaimedAt: overrides.trialClaimedAt,
      trialStartDate: overrides.trialStartDate,
      trialEndDate: overrides.trialEndDate,
      subscriptionStartDate: overrides.subscriptionStartDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

/**
 * Active ou désactive la PÉRIODE D'ESSAI gratuite (source de vérité serveur).
 *
 * L'ancienne « Offre gratuite » Client Pro (prix null/0) a été supprimée :
 * le prix Client Pro n'active plus ni l'essai ni un accès gratuit.
 */
async function setTrialEnabled(t: ReturnType<typeof convexTest>, enabled: boolean) {
  const adminId = await createUser(t, { role: "admin", email: "admin@test.com" });
  await asUser(t, adminId).mutation(api.trialConfig.updateTrialConfig, {
    enabled,
    durationDays: TRIAL_DURATION_DAYS,
    validFrom: null,
    validUntil: null,
    eligibleProfiles: ["expert", "supplier"],
    modules: ["estimation", "pdf"],
    newAccountsOnly: false,
  });
  return adminId;
}

async function notificationsFor(t: ReturnType<typeof convexTest>, userId: string) {
  return t.run(async (ctx) => {
    const all = await ctx.db.query("notifications").collect();
    return all.filter((n) => n.userId === userId);
  });
}

// ============================================================================
// Logique pure — règles de priorité essai / abonnement
// ============================================================================

describe("computeSubscriptionSnapshot", () => {
  const base = {
    now: NOW,
    isAdmin: false,
    trialEnabled: true,
    planPrice: null as number | null,
    plan: null as string | null,
  };

  it("essai activé + essai jamais utilisé → essai disponible (à démarrer)", () => {
    const snap = computeSubscriptionSnapshot({ ...base, trialEligible: true });
    expect(snap.status).toBe("trial_available");
    expect(snap.type).toBe("trial");
    expect(snap.isActive).toBe(true);
    expect(snap.trialShouldStart).toBe(true);
    expect(snap.trialDaysTotal).toBe(7);
    expect(snap.trialDaysRemaining).toBe(0);
    expect(snap.requiresPayment).toBe(false);
  });

  it("essai actif → accès autorisé, jours restants calculés depuis l'horloge serveur", () => {
    const snap = computeSubscriptionSnapshot({
      ...base,
      trialClaimedAt: NOW - 3 * DAY_MS,
      trialStartDate: NOW - 3 * DAY_MS,
      trialEndDate: NOW - 3 * DAY_MS + TRIAL_DURATION_DAYS * DAY_MS,
    });
    expect(snap.status).toBe("trialing");
    expect(snap.isActive).toBe(true);
    expect(snap.requiresPayment).toBe(false);
    expect(snap.trialDaysRemaining).toBe(4);
    expect(snap.startDate).toBe(NOW - 3 * DAY_MS);
    expect(snap.endDate).toBe(NOW - 3 * DAY_MS + TRIAL_DURATION_DAYS * DAY_MS);
  });

  it("essai expiré → accès payant requis et jamais renouvelé automatiquement", () => {
    const snap = computeSubscriptionSnapshot({
      ...base,
      trialClaimedAt: NOW - 9 * DAY_MS,
      trialStartDate: NOW - 9 * DAY_MS,
      trialEndDate: NOW - 2 * DAY_MS,
    });
    expect(snap.status).toBe("trial_expired");
    expect(snap.isActive).toBe(false);
    expect(snap.requiresPayment).toBe(true);
    expect(snap.trialDaysRemaining).toBe(0);
  });

  it("essai consommé mais fenêtre effacée (souscription passée) → toujours « Essai expiré », pas de second essai", () => {
    const snap = computeSubscriptionSnapshot({
      ...base,
      trialClaimedAt: NOW - 30 * DAY_MS,
    });
    expect(snap.status).toBe("trial_expired");
    expect(snap.trialUsed).toBe(true);
    expect(snap.requiresPayment).toBe(true);
  });

  it("abonnement mensuel actif → accès autorisé sur 30 jours", () => {
    const snap = computeSubscriptionSnapshot({
      ...base,
      plan: "pro",
      subscriptionPlan: "pro",
      subscriptionPrice: 80,
      subscriptionStartDate: NOW,
      subscriptionEndDate: NOW + MONTHLY_DURATION_DAYS * DAY_MS,
    });
    expect(snap.status).toBe("active");
    expect(snap.type).toBe("monthly");
    expect(snap.isActive).toBe(true);
    expect(snap.requiresPayment).toBe(false);
    expect(snap.subscriptionDaysTotal).toBe(30);
    expect(snap.subscriptionDaysRemaining).toBe(30);
    expect(snap.planName).toBe("Client Pro");
    expect(snap.price).toBe(80);
  });

  it("un abonnement actif prime sur un essai encore ouvert", () => {
    const snap = computeSubscriptionSnapshot({
      ...base,
      plan: "pro",
      subscriptionPlan: "pro",
      trialClaimedAt: NOW - 1 * DAY_MS,
      trialStartDate: NOW - 1 * DAY_MS,
      trialEndDate: NOW + 6 * DAY_MS,
      subscriptionStartDate: NOW,
      subscriptionEndDate: NOW + MONTHLY_DURATION_DAYS * DAY_MS,
    });
    expect(snap.status).toBe("active");
    expect(snap.type).toBe("monthly");
  });

  it("abonnement mensuel expiré → renouvellement obligatoire", () => {
    const snap = computeSubscriptionSnapshot({
      ...base,
      plan: "pro",
      subscriptionPlan: "pro",
      subscriptionStartDate: NOW - 31 * DAY_MS,
      subscriptionEndDate: NOW - 1 * DAY_MS,
    });
    expect(snap.status).toBe("expired");
    expect(snap.isActive).toBe(false);
    expect(snap.requiresPayment).toBe(true);
    expect(snap.subscriptionDaysRemaining).toBe(0);
  });

  it("paiement en attente → pas d'accès, mais aucun renouvellement à exiger", () => {
    const snap = computeSubscriptionSnapshot({ ...base, pendingPayment: true, plan: "pro" });
    expect(snap.status).toBe("pending");
    expect(snap.isActive).toBe(false);
    expect(snap.requiresPayment).toBe(false);
  });

  it("profil Client Pro : essai activé mais jamais disponible, souscription requise", () => {
    const snap = computeSubscriptionSnapshot({ ...base, trialEligible: false, planPrice: 80 });
    expect(snap.status).toBe("none");
    expect(snap.trialShouldStart).toBe(false);
    expect(snap.isActive).toBe(false);
    expect(snap.requiresPayment).toBe(true);
  });

  it("essai désactivé et jamais accordé → aucun accès", () => {
    const snap = computeSubscriptionSnapshot({ ...base, trialEnabled: false, planPrice: 80 });
    expect(snap.status).toBe("none");
    expect(snap.type).toBe("none");
    expect(snap.isActive).toBe(false);
    expect(snap.requiresPayment).toBe(true);
    expect(snap.price).toBe(80);
  });

  it("administrateur → accès toujours autorisé", () => {
    const snap = computeSubscriptionSnapshot({ ...base, isAdmin: true, trialEnabled: false });
    expect(snap.status).toBe("admin");
    expect(snap.isActive).toBe(true);
    expect(snap.requiresPayment).toBe(false);
  });

  it("ancien plan « free » enregistré (forfait supprimé) → aucun droit accordé", () => {
    const snap = computeSubscriptionSnapshot({
      ...base,
      trialEnabled: false,
      plan: "free",
      planPrice: 80,
    });
    expect(snap.status).toBe("none");
    expect(snap.type).toBe("none");
    expect(snap.isActive).toBe(false);
    expect(snap.requiresPayment).toBe(true);
  });

  it("la durée de l'essai est celle configurée par l'administrateur", () => {
    const snap = computeSubscriptionSnapshot({
      ...base,
      trialDaysTotal: 21,
      trialClaimedAt: NOW - 2 * DAY_MS,
      trialStartDate: NOW - 2 * DAY_MS,
      trialEndDate: NOW + 19 * DAY_MS,
    });
    expect(snap.status).toBe("trialing");
    expect(snap.trialDaysTotal).toBe(21);
    expect(snap.trialDaysRemaining).toBe(19);
  });

  it("abonnement mensuel payant actif prime sur l'essai enregistré", () => {
    const snap = computeSubscriptionSnapshot({
      ...base,
      trialClaimedAt: NOW - DAY_MS,
      trialEndDate: NOW + 6 * DAY_MS,
      subscriptionPlan: "pro",
      subscriptionPrice: 80,
      subscriptionStartDate: NOW,
      subscriptionEndDate: NOW + MONTHLY_DURATION_DAYS * DAY_MS,
    });
    expect(snap.status).toBe("active");
    expect(snap.type).toBe("monthly");
  });
});

describe("daysRemainingUntil", () => {
  it("arrondit au jour supérieur", () => {
    expect(daysRemainingUntil(NOW + 6.5 * DAY_MS, NOW)).toBe(7);
    expect(daysRemainingUntil(NOW + DAY_MS, NOW)).toBe(1);
  });

  it("ne renvoie jamais une valeur négative", () => {
    expect(daysRemainingUntil(NOW - DAY_MS, NOW)).toBe(0);
    expect(daysRemainingUntil(undefined, NOW)).toBe(0);
  });
});

// ============================================================================
// startMyTrial — 7 jours, une seule fois
// ============================================================================

describe("subscriptionStatus.startMyTrial", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("démarre 7 jours exactement et refuse un second essai (profil éligible)", async () => {
    await setTrialEnabled(t, true);
    const userId = await createUser(t, { userRole: "expert" });

    const first = await asUser(t, userId).mutation(api.subscriptionStatus.startMyTrial, {});
    expect(first.started).toBe(true);

    const stored = await t.run(async (ctx) => ctx.db.get(userId as any));
    expect(stored?.trialClaimedAt).toBeTruthy();
    expect(stored?.trialDaysTotal).toBe(TRIAL_DURATION_DAYS);
    expect(stored?.trialDaysRemaining).toBe(TRIAL_DURATION_DAYS);
    expect(stored?.trialEndDate! - stored?.trialStartDate!).toBe(TRIAL_DURATION_DAYS * DAY_MS);
    expect(stored?.subscriptionStatus).toBe("trialing");

    // Second appel (rafraîchissement, autre appareil) → jamais de prolongation
    const second = await asUser(t, userId).mutation(api.subscriptionStatus.startMyTrial, {});
    expect(second.started).toBe(false);
    expect(second.reason).toBe("already_used");

    const after = await t.run(async (ctx) => ctx.db.get(userId as any));
    expect(after?.trialEndDate).toBe(stored?.trialEndDate);
  });

  it("ne démarre rien quand la période d'essai est désactivée", async () => {
    await setTrialEnabled(t, false);
    const userId = await createUser(t, { userRole: "expert" });

    const res = await asUser(t, userId).mutation(api.subscriptionStatus.startMyTrial, {});
    expect(res.started).toBe(false);
    expect(res.reason).toBe("trial_disabled");

    const stored = await t.run(async (ctx) => ctx.db.get(userId as any));
    expect(stored?.trialClaimedAt).toBeUndefined();
  });

  it("un client non sélectionné par l'administrateur ne reçoit pas d'essai", async () => {
    await setTrialEnabled(t, true);
    const userId = await createUser(t, { userRole: "client" });

    const res = await asUser(t, userId).mutation(api.subscriptionStatus.startMyTrial, {});
    expect(res.started).toBe(false);
    expect(res.reason).toBe("profile_not_eligible");

    const stored = await t.run(async (ctx) => ctx.db.get(userId as any));
    expect(stored?.trialClaimedAt).toBeUndefined();
    expect(stored?.trialEndDate).toBeUndefined();
  });

  it("Client Pro non sélectionné : aucun statut « Essai disponible »", async () => {
    // Essai activé, mais profils éligibles limités à Expert : Client Pro exclu.
    const adminId = await createUser(t, { role: "admin", email: "admin-trial@test.com" });
    await asUser(t, adminId).mutation(api.trialConfig.updateTrialConfig, {
      enabled: true,
      durationDays: 14,
      validFrom: null,
      validUntil: null,
      eligibleProfiles: ["expert"],
      modules: ["estimation"],
      newAccountsOnly: false,
    });
    const userId = await createUser(t, { userRole: "client" });

    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(status?.status).toBe("none");
    expect(status?.isActive).toBe(false);
    expect(status?.trialShouldStart).toBe(false);
    expect(status?.trialEligible).toBe(false);
  });

  it("Client Pro sélectionné : « Essai disponible » et durée dédiée", async () => {
    const adminId = await createUser(t, { role: "admin", email: "admin-trial2@test.com" });
    await asUser(t, adminId).mutation(api.trialConfig.updateTrialConfig, {
      enabled: true,
      durationDays: 7,
      clientProDurationDays: 14,
      validFrom: null,
      validUntil: null,
      eligibleProfiles: ["client"],
      modules: ["estimation"],
      newAccountsOnly: false,
    });
    const userId = await createUser(t, { userRole: "client" });

    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(status?.status).toBe("trial_available");
    expect(status?.trialEligible).toBe(true);
    expect(status?.trialShouldStart).toBe(true);
    // Durée affichée avant le démarrage = durée Client Pro.
    expect(status?.trialDaysTotal).toBe(14);
  });
});

// ============================================================================
// checkSubscriptionPeriods — cron quotidien
// ============================================================================

describe("subscriptionStatus.checkSubscriptionPeriods", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("passe l'essai en « Essai expiré », notifie et remet le compteur à zéro", async () => {
    const now = Date.now();
    const userId = await createUser(t, {
      trialClaimedAt: now - 8 * DAY_MS,
      trialStartDate: now - 8 * DAY_MS,
      trialEndDate: now - 1 * DAY_MS,
    });
    await t.run(async (ctx) =>
      ctx.db.patch(userId as any, { subscriptionStatus: "trialing", trialDaysRemaining: 1 }),
    );

    const res = await t.mutation(internal.subscriptionStatus.checkSubscriptionPeriods, {});
    expect((res as any).trialsExpired).toBe(1);

    const user = await t.run(async (ctx) => ctx.db.get(userId as any));
    expect(user?.subscriptionStatus).toBe("trial_expired");
    expect(user?.trialDaysRemaining).toBe(0);

    const notifications = await notificationsFor(t, userId);
    expect(
      notifications.some(
        (n) =>
          n.message ===
          "Votre période d'essai gratuit est terminée. Veuillez choisir une offre pour continuer à utiliser la plateforme.",
      ),
    ).toBe(true);

    // Idempotent : un second passage ne re-notifie pas
    const second = await t.mutation(internal.subscriptionStatus.checkSubscriptionPeriods, {});
    expect((second as any).trialsExpired).toBe(0);
    expect((await notificationsFor(t, userId)).length).toBe(notifications.length);
  });

  it("recalcule les jours restants d'un essai encore actif sans changer son statut", async () => {
    const now = Date.now();
    const userId = await createUser(t, {
      trialClaimedAt: now - 3 * DAY_MS,
      trialStartDate: now - 3 * DAY_MS,
      trialEndDate: now + 4 * DAY_MS,
    });

    await t.mutation(internal.subscriptionStatus.checkSubscriptionPeriods, {});

    const user = await t.run(async (ctx) => ctx.db.get(userId as any));
    expect(user?.subscriptionStatus).not.toBe("trial_expired");
    expect(user?.trialDaysRemaining).toBe(4);
  });
});

// ============================================================================
// Contrôle d'accès Client Pro — essai gratuit
// ============================================================================

describe("checkClientProAccess — essai gratuit (7 jours)", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("essai actif → accès accordé", async () => {
    // Aucune « Offre gratuite » ici : le test porte sur le seul essai.
    const now = Date.now();
    const userId = await createUser(t, {
      trialClaimedAt: now - DAY_MS,
      trialStartDate: now - DAY_MS,
      trialEndDate: now + 6 * DAY_MS,
    });
    await t.run(async (ctx) => ctx.db.patch(userId as any, { subscriptionStatus: "trialing" }));

    const access = await asUser(t, userId).query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(true);
    expect(access.reason).toBe("ok");
    expect(access.status).toBe("trialing");
  });

  it("essai expiré → accès refusé avec la raison « trial_expired »", async () => {
    // Aucune « Offre gratuite » ici : un essai expiré exige une souscription.
    const now = Date.now();
    const userId = await createUser(t, {
      trialClaimedAt: now - 8 * DAY_MS,
      trialStartDate: now - 8 * DAY_MS,
      trialEndDate: now - DAY_MS,
    });
    await t.run(async (ctx) =>
      ctx.db.patch(userId as any, { subscriptionStatus: "trial_expired" }),
    );

    const access = await asUser(t, userId).query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("trial_expired");
    expect(access.requiresPayment).toBe(true);
  });
});

// ============================================================================
// Souscription — l'abonnement mensuel désactive l'essai
// ----------------------------------------------------------------------------
// Client Pro n'est PLUS un abonnement mensuel (il fonctionne par cotisation de
// crédits de projets) : le forfait mensuel de ces tests est donc l'abonnement
// PROFESSIONNEL (Expert), seul modèle mensuel restant.
// ============================================================================

describe("createSubscription — période mensuelle de 30 jours", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("virement bancaire en attente : aucun accès tant que l'admin n'a pas validé", async () => {
    const userId = await createUser(t, { userRole: "expert", email: "pending@test.com" });

    await asUser(t, userId).mutation(api.subscriptions.createSubscription, {
      plan: "expert",
      paymentMethod: "bank_transfer",
      amount: 80,
      currency: "TND",
    });

    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(status?.status).toBe("pending");
    expect(status?.isActive).toBe(false);
    expect(status?.requiresPayment).toBe(false);

    const access = await asUser(t, userId).query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("pending");
  });

  it("renouvellement par virement : l'abonné garde l'accès jusqu'à la fin de sa période payée", async () => {
    const now = Date.now();
    const userId = await createUser(t, { userRole: "expert", email: "renew@test.com" });

    // Abonnement payant encore valable 10 jours.
    await asUser(t, userId).mutation(api.subscriptions.createSubscription, {
      plan: "expert",
      paymentMethod: "d17",
      amount: 80,
      currency: "TND",
    });
    await t.run(async (ctx) =>
      ctx.db.patch(userId as any, { subscriptionEndDate: now + 10 * DAY_MS }),
    );

    // Renouvellement par virement, en attente de validation.
    await asUser(t, userId).mutation(api.subscriptions.createSubscription, {
      plan: "expert",
      paymentMethod: "bank_transfer",
      amount: 80,
      currency: "TND",
    });

    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    // La période payée en cours n'est pas écourtée par le paiement en attente.
    expect(status?.isActive).toBe(true);
    expect(status?.subscriptionDaysRemaining).toBe(10);

    const access = await asUser(t, userId).query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(true);
  });

  it("virement refusé par l'admin : aucun abonnement mensuel accordé", async () => {
    const adminId = await createUser(t, { role: "admin", email: "admin2@test.com" });
    const userId = await createUser(t, { userRole: "expert", email: "rejected@test.com" });

    const subId = await asUser(t, userId).mutation(api.subscriptions.createSubscription, {
      plan: "expert",
      paymentMethod: "bank_transfer",
      amount: 80,
      currency: "TND",
    });

    await asUser(t, adminId).mutation(api.subscriptions.adminRejectSubscription, {
      subscriptionId: subId,
    });

    // Aucune période payée : la demande refusée n'ouvre AUCUN droit mensuel.
    const subs = await t.run(async (ctx) =>
      (await ctx.db.query("subscriptions").collect()).filter((s) => s.userId === userId),
    );
    expect(subs.filter((s) => s.status === "active")).toHaveLength(0);

    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(status?.status).not.toBe("active");
    expect(status?.isActive).toBe(false);
  });

  it("paiement D17 : justificatif attendu, activation par l'administrateur", async () => {
    const userId = await createUser(t, { userRole: "expert", email: "d17-manuel@test.com" });

    // D17 suit la même procédure que le virement : demande en attente.
    const subscriptionId = await asUser(t, userId).mutation(
      api.subscriptions.createSubscription,
      { plan: "expert", paymentMethod: "d17", amount: 80, currency: "TND" },
    );

    const pending = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(pending?.status).toBe("pending");
    expect((await asUser(t, userId).query(api.access.checkClientProAccess)).reason).toBe(
      "pending",
    );

    // Le client joint sa capture d'écran D17 (pièce jointe du règlement).
    const storageId = await t.run(async (ctx) => ctx.storage.store(new Blob(["capture"])));
    await asUser(t, userId).mutation(api.subscriptions.uploadPaymentProof, {
      subscriptionId,
      storageId,
      url: "https://example.test/d17.png",
      fileName: "capture-d17.png",
    });
    const withProof = await asUser(t, userId).query(api.subscriptions.getMySubscription);
    expect(withProof?.paymentProofFileName).toBe("capture-d17.png");

    // Aucune activation automatique : validation manuelle par l'admin.
    const adminId = await createUser(t, { role: "admin", email: "admin-d17@test.com" });
    await asUser(t, adminId).mutation(api.subscriptions.adminApproveSubscription, {
      subscriptionId,
    });

    const active = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(active?.status).toBe("active");
    expect((await asUser(t, userId).query(api.access.checkClientProAccess)).allowed).toBe(true);
  });

  it("désactive l'essai et ouvre 30 jours d'abonnement", async () => {
    await setTrialEnabled(t, true);
    const now = Date.now();
    const userId = await createUser(t, {
      userRole: "expert",
      trialClaimedAt: now - DAY_MS,
      trialStartDate: now - DAY_MS,
      trialEndDate: now + 6 * DAY_MS,
    });

    // Paiement D17 : la demande reste en attente jusqu'à la validation admin.
    const subscriptionId = await asUser(t, userId).mutation(
      api.subscriptions.createSubscription,
      {
        plan: "expert",
        paymentMethod: "d17",
        amount: 80,
        currency: "TND",
      },
    );
    const adminId = await createUser(t, { role: "admin", email: "admin-period@test.com" });
    await asUser(t, adminId).mutation(api.subscriptions.adminApproveSubscription, {
      subscriptionId,
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId as any));
    expect(user?.subscriptionStatus).toBe("active");
    expect(user?.subscriptionDaysTotal).toBe(MONTHLY_DURATION_DAYS);
    expect(user?.subscriptionDaysRemaining).toBe(MONTHLY_DURATION_DAYS);
    // L'essai est désactivé mais reste « consommé » : jamais rejoué.
    expect(user?.trialEndDate).toBeUndefined();
    expect(user?.trialClaimedAt).toBeTruthy();

    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(status?.status).toBe("active");
    expect(status?.subscriptionDaysRemaining).toBe(MONTHLY_DURATION_DAYS);
  });
});
