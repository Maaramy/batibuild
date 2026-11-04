/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api, internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// PUSH NOTIFICATIONS ANDROID — tests du module
// ----------------------------------------------------------------------------
// Aucun réseau : la configuration Firebase est simulée (présence des
// variables), les actions d'envoi ne sont jamais exécutées, et les résultats
// FCM sont enregistrés par `markDeliveryResult` comme le ferait l'action.
// ============================================================================

type T = ReturnType<typeof convexTest>;

const FIREBASE_ENV = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_SERVICE_ACCOUNT_JSON",
  "FIREBASE_SERVICE_ACCOUNT",
];

function clearFirebaseEnv() {
  for (const key of FIREBASE_ENV) delete process.env[key];
}

function configureFakeFirebase() {
  process.env.FIREBASE_PROJECT_ID = "batibuild-test";
  process.env.FIREBASE_CLIENT_EMAIL = "test@batibuild-test.iam.gserviceaccount.com";
  process.env.FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----";
}

async function createUser(
  t: T,
  overrides: {
    name?: string;
    email: string;
    role?: string;
    userRole?: "client" | "expert" | "supplier";
    pushOptOut?: boolean;
    clientProPaidProjectsGranted?: number;
    clientProPaidProjectsUsed?: number;
    status?: "active" | "disabled";
  },
): Promise<Id<"users">> {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: overrides.name ?? "Utilisateur Test",
      email: overrides.email,
      role: (overrides.role ?? "user") as any,
      status: overrides.status ?? "active",
      userRole: overrides.userRole ?? "client",
      pushOptOut: overrides.pushOptOut,
      clientProPaidProjectsGranted: overrides.clientProPaidProjectsGranted,
      clientProPaidProjectsUsed: overrides.clientProPaidProjectsUsed,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

function asUser(t: T, userId: Id<"users"> | string) {
  return t.withIdentity({ subject: userId });
}

async function registerToken(
  t: T,
  userId: Id<"users">,
  token: string,
  options: { deviceId?: string; permissionStatus?: "granted" | "denied" | "default" } = {},
) {
  return asUser(t, userId).mutation(api.push.registerPushToken, {
    fcmToken: token,
    platform: "android",
    deviceId: options.deviceId ?? `device-${token.slice(-6)}`,
    permissionStatus: options.permissionStatus ?? "granted",
  });
}

async function saveDraft(
  t: T,
  adminId: Id<"users">,
  overrides: Record<string, unknown> = {},
): Promise<Id<"pushCampaigns">> {
  const result = await asUser(t, adminId).mutation(api.push.saveCampaign, {
    campaignName: "Campagne push test",
    category: "client_pro",
    title: "⭐ Votre avis compte !",
    message: "Aidez-nous à améliorer Batibuild. Évaluez votre expérience sur 5 étoiles.",
    actionLabel: "Donner mon avis",
    destination: "/dashboard",
    targetAudience: "all_android",
    ...overrides,
  } as any);
  return (result as any).campaignId as Id<"pushCampaigns">;
}

describe("module Push Notifications", () => {
  let t: T;

  beforeEach(() => {
    clearFirebaseEnv();
    t = convexTest(schema, modules);
  });

  it("1. réservé aux administrateurs (lecture, écriture, envoi, test)", async () => {
    const adminId = await createUser(t, {
      name: "Admin",
      email: "admin@test.tn",
      role: "admin",
    });
    const userId = await createUser(t, { email: "client@test.tn" });
    const campaignId = await saveDraft(t, adminId);

    expect(await asUser(t, userId).query(api.push.listCampaigns, {})).toEqual([]);
    expect(await asUser(t, userId).query(api.push.getDashboardStats, {})).toBeNull();
    expect(await asUser(t, userId).query(api.push.getTokenSummary, {})).toBeNull();

    await expect(
      asUser(t, userId).mutation(api.push.saveCampaign, {
        campaignName: "Pirate",
        category: "client_pro",
        title: "x",
        message: "x",
        targetAudience: "all_android",
      } as any),
    ).rejects.toThrow(/administrateur/i);

    await expect(
      asUser(t, userId).mutation(api.push.startCampaign, { campaignId }),
    ).rejects.toThrow(/administrateur/i);

    await expect(
      asUser(t, userId).mutation(api.push.sendTestNotification, { campaignId }),
    ).rejects.toThrow(/administrateur/i);
  });

  it("2. enregistrement / rotation / autorisation / consentement des appareils", async () => {
    const userId = await createUser(t, { email: "client@test.tn" });
    const tokenA = "fcm-token-aaaaaaaaaaaaaaaa";
    const tokenB = "fcm-token-bbbbbbbbbbbbbbbb";

    await registerToken(t, userId, tokenA, { deviceId: "device-1" });
    let tokens = await t.run(async (ctx) => ctx.db.query("pushTokens").collect());
    expect(tokens).toHaveLength(1);
    expect(tokens[0].isActive).toBe(true);

    // Même appareil, nouveau token (rotation Firebase) → l'ancien est désactivé.
    await asUser(t, userId).mutation(api.push.refreshPushToken, {
      oldToken: tokenA,
      newToken: tokenB,
      deviceId: "device-1",
    });
    tokens = await t.run(async (ctx) => ctx.db.query("pushTokens").collect());
    expect(tokens).toHaveLength(2);
    expect(tokens.find((token) => token.fcmToken === tokenA)?.isActive).toBe(false);
    expect(tokens.find((token) => token.fcmToken === tokenB)?.isActive).toBe(true);

    // Autorisation retirée : l'appareil n'est plus éligible.
    await asUser(t, userId).mutation(api.push.updatePushPermission, {
      fcmToken: tokenB,
      permissionStatus: "denied",
    });

    const adminId = await createUser(t, { email: "admin2@test.tn", role: "admin" });
    await saveDraft(t, adminId);
    const preview = await asUser(t, adminId).query(api.push.previewAudience, {
      audience: "all_android",
    });
    expect(preview?.total).toBe(0);

    // Consentement utilisateur : coupé puis réactivé.
    await asUser(t, userId).mutation(api.push.setPushOptOut, { optOut: true });
    const status = await asUser(t, userId).query(api.push.getMyPushStatus, {});
    expect(status?.optOut).toBe(true);
    await asUser(t, userId).mutation(api.push.setPushOptOut, { optOut: false });
    expect((await asUser(t, userId).query(api.push.getMyPushStatus, {}))?.optOut).toBe(false);
  });

  it("3. ciblage : clients Pro, experts, fournisseurs, inscrits, sélection", async () => {
    const adminId = await createUser(t, { email: "admin3@test.tn", role: "admin" });
    const active = await createUser(t, {
      name: "Actif",
      email: "actif@test.tn",
      clientProPaidProjectsGranted: 2,
    });
    const inactive = await createUser(t, { name: "Inactif", email: "inactif@test.tn" });
    const expert = await createUser(t, {
      name: "Expert",
      email: "expert@test.tn",
      userRole: "expert",
    });
    const supplier = await createUser(t, {
      name: "Fournisseur",
      email: "fournisseur@test.tn",
      userRole: "supplier",
    });
    const optedOut = await createUser(t, {
      name: "Désinscrit",
      email: "optout@test.tn",
      clientProPaidProjectsGranted: 1,
      pushOptOut: true,
    });
    const staff = await createUser(t, {
      name: "Modérateur",
      email: "modo@test.tn",
      role: "moderator",
    });

    for (const [index, userId] of [active, inactive, expert, supplier, optedOut, staff].entries()) {
      await registerToken(t, userId, `fcm-token-segment-${index}-abcdef`, {
        deviceId: `device-seg-${index}`,
      });
    }

    const expertProfileUser = await t.run(async (ctx) =>
      ctx.db.insert("expertProfiles", {
        userId: expert,
        fullName: "Expert Test",
        speciality: "Architecte",
        city: "Tunis",
        subscriptionStatus: "active",
        subscriptionEndDate: Date.now() + 86_400_000,
      } as any),
    );
    expect(expertProfileUser).toBeTruthy();

    const audience = async (key: string, userIds?: Id<"users">[]) =>
      (
        await asUser(t, adminId).query(api.push.previewAudience, {
          audience: key,
          userIds,
        })
      )?.total ?? 0;

    expect(await audience("all_android")).toBe(4);
    expect(await audience("client_pro_all")).toBe(2);
    expect(await audience("client_pro_active")).toBe(1);
    expect(await audience("client_pro_inactive")).toBe(1);
    expect(await audience("expert_all")).toBe(1);
    expect(await audience("expert_active")).toBe(1);
    expect(await audience("supplier_all")).toBe(1);
    expect(await audience("selected", [inactive, supplier])).toBe(2);
  });

  it("4. validation : limites de longueur, destination, sélection obligatoire", async () => {
    const adminId = await createUser(t, { email: "admin4@test.tn", role: "admin" });
    const userId = await createUser(t, { email: "client4@test.tn" });
    await registerToken(t, userId, "fcm-token-validation-123456");

    await expect(saveDraft(t, adminId, { title: "x".repeat(80) })).rejects.toThrow(
      /65 caractères/,
    );
    await expect(saveDraft(t, adminId, { message: "x".repeat(200) })).rejects.toThrow(
      /180 caractères/,
    );
    await expect(saveDraft(t, adminId, { destination: "javascript:alert(1)" })).rejects.toThrow(
      /Destination invalide/,
    );
    await expect(
      saveDraft(t, adminId, { targetAudience: "selected", selectedUserIds: [] }),
    ).rejects.toThrow(/Sélectionnez au moins un utilisateur/);
  });

  it("5. envoi : configuration Firebase requise, un seul token par utilisateur", async () => {
    const adminId = await createUser(t, { email: "admin5@test.tn", role: "admin" });
    const userId = await createUser(t, { email: "client5@test.tn" });
    await registerToken(t, userId, "fcm-token-first-aaaaaaaa", { deviceId: "device-a" });
    await registerToken(t, userId, "fcm-token-second-bbbbbbb", { deviceId: "device-b" });

    const campaignId = await saveDraft(t, adminId);

    await expect(
      asUser(t, adminId).mutation(api.push.startCampaign, { campaignId }),
    ).rejects.toThrow(/Firebase Cloud Messaging non configuré/);

    configureFakeFirebase();
    const result = await asUser(t, adminId).mutation(api.push.startCampaign, { campaignId });
    expect(result.recipients).toBe(1);

    const logs = await t.run(async (ctx) => ctx.db.query("pushLogs").collect());
    expect(logs).toHaveLength(1);
    expect(logs[0].deliveryStatus).toBe("pending");
    expect(logs[0].token).toMatch(/^[0-9a-f]{48}$/);

    const campaign = await t.run(async (ctx) => ctx.db.get(campaignId));
    expect(campaign?.status).toBe("sending");
    expect(campaign?.audienceCount).toBe(1);
  });

  it("6. lots : consentement retiré ignoré, résultat FCM et token invalide désactivé", async () => {
    const adminId = await createUser(t, { email: "admin6@test.tn", role: "admin" });
    const kept = await createUser(t, { email: "kept@test.tn" });
    const removed = await createUser(t, { email: "removed@test.tn" });
    await registerToken(t, kept, "fcm-token-kept-aaaaaaaaaa", { deviceId: "device-kept" });
    await registerToken(t, removed, "fcm-token-removed-bbbbbbbb", { deviceId: "device-removed" });

    const campaignId = await saveDraft(t, adminId);
    configureFakeFirebase();
    await asUser(t, adminId).mutation(api.push.startCampaign, { campaignId });

    // L'utilisateur se désinscrit APRÈS le lancement : son envoi est ignoré.
    await asUser(t, removed).mutation(api.push.setPushOptOut, { optOut: true });
    await t.mutation(internal.push.deliverBatch, { campaignId });

    const logs = await t.run(async (ctx) => ctx.db.query("pushLogs").collect());
    const skipped = logs.find((log) => log.userId === removed);
    expect(skipped?.deliveryStatus).toBe("skipped");

    const pending = logs.find((log) => log.userId === kept);
    expect(pending?.deliveryStatus).toBe("pending");

    await t.mutation(internal.push.markDeliveryResult, {
      logId: pending!._id,
      ok: false,
      error: "UNREGISTERED",
      invalidToken: true,
      token: pending!.deviceToken,
    });

    const failed = await t.run(async (ctx) => ctx.db.get(pending!._id));
    expect(failed?.deliveryStatus).toBe("failed");
    const token = await t.run(async (ctx) =>
      ctx.db
        .query("pushTokens")
        .withIndex("by_token", (q) => q.eq("fcmToken", pending!.deviceToken))
        .unique(),
    );
    expect(token?.isActive).toBe(false);
  });

  it("7. programmation : suspension, annulation, expiration", async () => {
    const adminId = await createUser(t, { email: "admin7@test.tn", role: "admin" });
    const userId = await createUser(t, { email: "client7@test.tn" });
    await registerToken(t, userId, "fcm-token-schedule-1234567");
    configureFakeFirebase();

    const campaignId = await saveDraft(t, adminId);
    await asUser(t, adminId).mutation(api.push.scheduleCampaign, {
      campaignId,
      scheduledAt: Date.now() + 3_600_000,
    });
    expect((await t.run(async (ctx) => ctx.db.get(campaignId)))?.status).toBe("scheduled");

    await asUser(t, adminId).mutation(api.push.suspendCampaign, { campaignId });
    expect((await t.run(async (ctx) => ctx.db.get(campaignId)))?.status).toBe("suspended");

    await asUser(t, adminId).mutation(api.push.cancelCampaign, { campaignId });
    expect((await t.run(async (ctx) => ctx.db.get(campaignId)))?.status).toBe("cancelled");

    // Une campagne expirée ne peut pas partir.
    const expiredId = await saveDraft(t, adminId, {
      campaignName: "Expirée",
      expiresAt: Date.now() - 1000,
    });
    await expect(
      asUser(t, adminId).mutation(api.push.startCampaign, { campaignId: expiredId }),
    ).rejects.toThrow(/expirée/);

    // Programmation dans le passé refusée.
    const secondId = await saveDraft(t, adminId, { campaignName: "Passé" });
    await expect(
      asUser(t, adminId).mutation(api.push.scheduleCampaign, {
        campaignId: secondId,
        scheduledAt: Date.now() + 1000,
      }),
    ).rejects.toThrow(/une minute dans le futur/);
  });

  it("8. cron : lance les campagnes arrivées à échéance, échoue les expirées", async () => {
    const adminId = await createUser(t, { email: "admin8@test.tn", role: "admin" });
    const userId = await createUser(t, { email: "client8@test.tn" });
    await registerToken(t, userId, "fcm-token-cron-aaaaaaaaaa");
    configureFakeFirebase();

    const dueId = await saveDraft(t, adminId, { campaignName: "Due" });
    const expiredId = await saveDraft(t, adminId, { campaignName: "Expirée cron" });
    await t.run(async (ctx) => {
      await ctx.db.patch(dueId, {
        status: "scheduled",
        scheduledAt: Date.now() - 60_000,
      });
      await ctx.db.patch(expiredId, {
        status: "scheduled",
        scheduledAt: Date.now() - 60_000,
        expiresAt: Date.now() - 30_000,
      });
    });

    await t.mutation(internal.push.processScheduledCampaigns, {});

    expect((await t.run(async (ctx) => ctx.db.get(dueId)))?.status).toBe("sending");
    expect((await t.run(async (ctx) => ctx.db.get(expiredId)))?.status).toBe("failed");
    const logs = await t.run(async (ctx) => ctx.db.query("pushLogs").collect());
    expect(logs).toHaveLength(1);
  });

  it("9. suivi : ouverture, clic, conversion, idempotence et statistiques", async () => {
    const adminId = await createUser(t, { email: "admin9@test.tn", role: "admin" });
    const userId = await createUser(t, { email: "client9@test.tn", name: "Client Neuf" });
    await registerToken(t, userId, "fcm-token-tracking-123456");
    configureFakeFirebase();

    const campaignId = await saveDraft(t, adminId, {
      campaignName: "Conversion",
      destination: "/dashboard/new",
    });
    await asUser(t, adminId).mutation(api.push.startCampaign, { campaignId });
    const log = await t.run(async (ctx) => ctx.db.query("pushLogs").first());
    await t.mutation(internal.push.markDeliveryResult, {
      logId: log!._id,
      ok: true,
      messageId: "projects/batibuild/messages/1",
    });

    const open = await t.mutation(api.push.recordPushEvent, {
      token: log!.token,
      kind: "open",
    });
    expect(open).toEqual({ ok: true, destination: "/dashboard/new" });
    await t.mutation(api.push.recordPushEvent, { token: log!.token, kind: "open" });

    const click = await t.mutation(api.push.recordPushEvent, {
      token: log!.token,
      kind: "click",
    });
    expect(click.ok).toBe(true);

    const updated = await t.run(async (ctx) => ctx.db.get(log!._id));
    expect(updated?.openedAt).toBeTruthy();
    expect(updated?.clickedAt).toBeTruthy();
    expect(updated?.convertedAt).toBeTruthy();

    // Un jeton inconnu ne produit aucun événement et ne casse rien.
    expect(
      await t.mutation(api.push.recordPushEvent, { token: "inconnu", kind: "click" }),
    ).toEqual({ ok: false, destination: "/dashboard" });

    const stats = await asUser(t, adminId).query(api.push.getDashboardStats, {});
    expect(stats?.totals.sent).toBe(1);
    expect(stats?.totals.delivered).toBe(1);
    expect(stats?.totals.opened).toBe(1);
    expect(stats?.totals.clicked).toBe(1);
    expect(stats?.totals.conversions).toBe(1);
    expect(stats?.totals.androidUsers).toBe(1);
    expect(stats?.totals.authorizedUsers).toBe(1);

    const detail = await asUser(t, adminId).query(api.push.getCampaign, { campaignId });
    expect(detail?.campaign.stats.delivered).toBe(1);
    expect(detail?.logs[0]?.convertedAt).toBeTruthy();
  });

  it("10. désabonnement par jeton (lien) et suppression de campagne", async () => {
    const adminId = await createUser(t, { email: "admin10@test.tn", role: "admin" });
    const userId = await createUser(t, { email: "client10@test.tn" });
    await registerToken(t, userId, "fcm-token-unsub-aaaaaaaaaa");
    configureFakeFirebase();

    const campaignId = await saveDraft(t, adminId);
    await asUser(t, adminId).mutation(api.push.startCampaign, { campaignId });
    const log = await t.run(async (ctx) => ctx.db.query("pushLogs").first());

    const result = await t.mutation(internal.push.unsubscribeByToken, { token: log!.token });
    expect(result.ok).toBe(true);
    expect((await t.run(async (ctx) => ctx.db.get(userId)))?.pushOptOut).toBe(true);

    // Une campagne déjà envoyée ne peut pas être supprimée en cours d'envoi.
    const campaign = await t.run(async (ctx) => ctx.db.get(campaignId));
    if (campaign?.status === "sending") {
      await asUser(t, adminId).mutation(api.push.cancelCampaign, { campaignId });
    }
    await asUser(t, adminId).mutation(api.push.deleteCampaign, { campaignId });
    expect(await t.run(async (ctx) => ctx.db.get(campaignId))).toBeNull();
    expect(await t.run(async (ctx) => ctx.db.query("pushLogs").collect())).toHaveLength(0);
  });
});
