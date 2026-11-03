/// <reference types="vite/client" />

import { beforeEach, describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";
import { DAY_MS } from "./subscriptionPeriods.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// DEMANDES DE COTISATION — VUE ADMIN UNIFIÉE
// ----------------------------------------------------------------------------
// Une demande de virement bancaire ou D17 est écrite dans la table de son flux
// (cotisation Client Pro, profil Expert, profil Fournisseur, abonnement,
// cotisation du module Site). Elle doit TOUJOURS apparaître immédiatement dans
// l'onglet admin « Virements », quel que soit le flux, avec un identifiant
// unique, un compteur réactif et sans double validation.
// ============================================================================

type T = ReturnType<typeof convexTest>;

async function createUser(
  t: T,
  overrides: {
    role?: string;
    name?: string;
    email?: string;
    userRole?: "client" | "supplier" | "expert";
  } = {},
): Promise<Id<"users">> {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: overrides.name ?? "Client Test",
      email: overrides.email ?? `user-${Math.random()}@test.tn`,
      role: overrides.role ?? "user",
      status: "active",
      userRole: overrides.userRole ?? "client",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

function asUser(t: T, userId: Id<"users"> | string) {
  return t.withIdentity({ subject: userId });
}

/** Administrateur : cotisation Client Pro payante (5 projets = 350 TND). */
async function configureCotisation(t: T): Promise<Id<"users">> {
  const adminId = await createUser(t, { role: "admin", email: "admin@test.tn" });
  await asUser(t, adminId).mutation(api.clientProCredits.updateClientProCreditConfig, {
    freeGrantEnabled: false,
    freeProjects: 0,
    cotisationPrice: 80,
    cotisationProjects: 1,
    tiers: [{ projects: 5, price: 350 }],
    refundOnDelete: false,
    allowStacking: true,
  });
  return adminId;
}

/** Demande de cotisation Client Pro (virement ou D17). */
function requestCotisation(
  t: T,
  userId: Id<"users"> | string,
  paymentMethod: "bank_transfer" | "d17",
  projects = 5,
) {
  return asUser(t, userId).mutation(api.clientProCredits.requestClientProCotisation, {
    projects,
    paymentMethod,
  });
}

function pendingRequests(t: T, userId: Id<"users"> | string) {
  return asUser(t, userId).query(api.paymentRequests.getPendingPaymentRequests, {});
}

describe("demandes de cotisation — vue admin unifiée", () => {
  let t: T;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("1. une demande par virement bancaire apparaît immédiatement dans l'administration", async () => {
    const adminId = await configureCotisation(t);
    const userId = await createUser(t, { name: "Amine Ben Salah", email: "amine@test.tn" });

    const order = await requestCotisation(t, userId, "bank_transfer");

    const list = await pendingRequests(t, adminId);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      kind: "client_pro",
      recordId: String(order.orderId),
      userId: String(userId),
      userName: "Amine Ben Salah",
      userEmail: "amine@test.tn",
      profileType: "Client Pro",
      amount: 350,
      currency: "TND",
      paymentMethod: "bank_transfer",
      paymentFamily: "bank_transfer",
      status: "pending",
    });
    expect(list[0].formula).toContain("5 projets");
    expect(list[0].requestId).toBe(`client_pro:${order.orderId}`);
    // Le badge de l'onglet lit exactement la même liste (temps réel).
    expect(list.filter((r) => r.paymentFamily === "bank_transfer")).toHaveLength(1);
  });

  it("2. une demande par D17 apparaît immédiatement, classée D17", async () => {
    const adminId = await configureCotisation(t);
    const userId = await createUser(t, { email: "d17@test.tn" });

    await requestCotisation(t, userId, "d17");

    const list = await pendingRequests(t, adminId);
    expect(list).toHaveLength(1);
    expect(list[0].paymentMethod).toBe("d17");
    expect(list[0].paymentFamily).toBe("d17");
    expect(list[0].status).toBe("pending");
    // La méthode enregistrée correspond bien au filtre « Virement D17 ».
    expect(list.filter((r) => r.paymentFamily === "d17")).toHaveLength(1);
    expect(list.filter((r) => r.paymentFamily === "bank_transfer")).toHaveLength(0);
  });

  it("3. le compteur augmente à chaque demande, y compris simultanée", async () => {
    const adminId = await configureCotisation(t);
    const first = await createUser(t, { email: "a@test.tn" });
    const second = await createUser(t, { email: "b@test.tn" });
    const third = await createUser(t, { email: "c@test.tn" });

    expect(await pendingRequests(t, adminId)).toHaveLength(0);

    await requestCotisation(t, first, "bank_transfer", 1);
    expect(await pendingRequests(t, adminId)).toHaveLength(1);

    await requestCotisation(t, second, "d17", 1);
    await requestCotisation(t, third, "bank_transfer", 5);

    const list = await pendingRequests(t, adminId);
    expect(list).toHaveLength(3);
    expect(list.filter((r) => r.paymentFamily === "bank_transfer")).toHaveLength(2);
    expect(list.filter((r) => r.paymentFamily === "d17")).toHaveLength(1);
    expect(new Set(list.map((r) => r.requestId)).size).toBe(3);
  });

  it("4. après confirmation, la demande quitte la liste et les crédits sont attribués", async () => {
    const adminId = await configureCotisation(t);
    const userId = await createUser(t, { email: "confirm@test.tn" });
    const order = await requestCotisation(t, userId, "bank_transfer");

    expect(await pendingRequests(t, adminId)).toHaveLength(1);

    await asUser(t, adminId).mutation(api.clientProCredits.adminApproveClientProOrder, {
      orderId: order.orderId as never,
    });

    expect(await pendingRequests(t, adminId)).toHaveLength(0);
    const credits = await asUser(t, userId).query(api.clientProCredits.getMyClientProCredits);
    expect(credits?.balance.paidGranted).toBe(5);
  });

  it("5. après refus, la demande quitte la liste sans attribuer de crédit", async () => {
    const adminId = await configureCotisation(t);
    const userId = await createUser(t, { email: "refus@test.tn" });
    const order = await requestCotisation(t, userId, "d17");

    await asUser(t, adminId).mutation(api.clientProCredits.adminRejectClientProOrder, {
      orderId: order.orderId as never,
    });

    expect(await pendingRequests(t, adminId)).toHaveLength(0);
    const credits = await asUser(t, userId).query(api.clientProCredits.getMyClientProCredits);
    expect(credits?.balance.paidGranted).toBe(0);
  });

  it("6. les demandes déjà enregistrées restent accessibles", async () => {
    const adminId = await configureCotisation(t);
    const userId = await createUser(t, { email: "historique@test.tn" });
    const now = Date.now();

    // Abonnement « pending » antérieur (écrit avant l'agrégation).
    const legacyId = await t.run(async (ctx) =>
      ctx.db.insert("subscriptions", {
        userId,
        plan: "expert",
        status: "pending",
        startDate: now,
        endDate: now + 30 * DAY_MS,
        paymentMethod: "bank_transfer",
        amount: 120,
        currency: "TND",
        createdAt: now,
        updatedAt: now,
      }),
    );

    const list = await pendingRequests(t, adminId);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      kind: "subscription",
      recordId: String(legacyId),
      profileType: "Expert",
      paymentFamily: "bank_transfer",
      amount: 120,
    });
    expect(list[0].formula).toContain("abonnement mensuel");
  });

  it("7. un utilisateur non administrateur ne voit aucune demande", async () => {
    const adminId = await configureCotisation(t);
    const owner = await createUser(t, { email: "owner@test.tn" });
    const outsider = await createUser(t, { email: "outsider@test.tn" });

    await requestCotisation(t, owner, "bank_transfer");

    expect(await pendingRequests(t, adminId)).toHaveLength(1);
    // Un client ne peut ni lister les demandes, ni celles d'un autre compte.
    expect(await pendingRequests(t, owner)).toHaveLength(0);
    expect(await pendingRequests(t, outsider)).toHaveLength(0);
  });

  it("8. un utilisateur non administrateur ne peut pas confirmer un paiement", async () => {
    await configureCotisation(t);
    const owner = await createUser(t, { email: "payself@test.tn" });
    const outsider = await createUser(t, { email: "payout@test.tn" });
    const order = await requestCotisation(t, owner, "d17");

    await expect(
      asUser(t, owner).mutation(api.clientProCredits.adminApproveClientProOrder, {
        orderId: order.orderId as never,
      }),
    ).rejects.toThrow(/Unauthorized/);

    await expect(
      asUser(t, outsider).mutation(api.clientProCredits.adminApproveClientProOrder, {
        orderId: order.orderId as never,
      }),
    ).rejects.toThrow(/Unauthorized/);
  });

  it("9. les demandes Expert et Fournisseur sont visibles avec leur profil et leur justificatif", async () => {
    const adminId = await configureCotisation(t);
    const expertUserId = await createUser(t, {
      name: "Expert Test",
      email: "expert@test.tn",
      userRole: "expert",
    });
    const supplierUserId = await createUser(t, {
      name: "Fournisseur Test",
      email: "fournisseur@test.tn",
      userRole: "supplier",
    });
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("expertProfiles", {
        userId: expertUserId,
        profession: "architecte",
        displayName: "Expert Test",
        phone: "20000000",
        email: "expert@test.tn",
        specialties: [],
        regions: [],
        plan: "trial",
        subscriptionStatus: "inactive",
        isVisible: false,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("supplierProfiles", {
        userId: supplierUserId,
        companyName: "Fournisseur Test SARL",
        phone: "71000000",
        email: "fournisseur@test.tn",
        address: "Tunis",
        specialties: [],
        regions: [],
        plan: "none",
        subscriptionStatus: "inactive",
        isVisible: false,
        createdAt: now,
        updatedAt: now,
      });
    });

    await asUser(t, expertUserId).mutation(api.expertProfiles.requestSubscription, {
      paymentMethod: "d17",
    });
    await asUser(t, supplierUserId).mutation(api.supplierProfiles.requestSubscription, {
      paymentMethod: "bank_transfer",
    });

    // Justificatif du fournisseur (URL déjà stockée, comme dans le flux réel).
    await t.run(async (ctx) => {
      const profile = await ctx.db
        .query("supplierProfiles")
        .withIndex("by_user", (q) => q.eq("userId", supplierUserId))
        .first();
      if (profile) {
        await ctx.db.patch(profile._id, {
          paymentProofUrl: "https://files.test/recu.png",
          paymentProofFileName: "recu.png",
          paymentProofUploadedAt: now + 5,
        });
      }
    });

    const list = await pendingRequests(t, adminId);
    const expert = list.find((r) => r.kind === "expert");
    const supplier = list.find((r) => r.kind === "supplier");

    expect(expert).toMatchObject({
      profileType: "Expert",
      paymentFamily: "d17",
      userName: "Expert Test",
      status: "pending",
    });
    expect(supplier).toMatchObject({
      profileType: "Fournisseur",
      paymentFamily: "bank_transfer",
      userEmail: "fournisseur@test.tn",
      proofUrl: "https://files.test/recu.png",
      status: "pending",
    });
  });

  it("10. aucun doublon : identifiants uniques et double validation sans effet", async () => {
    const adminId = await configureCotisation(t);
    const userId = await createUser(t, { email: "double@test.tn" });
    const order = await requestCotisation(t, userId, "d17");

    const first = await pendingRequests(t, adminId);
    const second = await pendingRequests(t, adminId);
    expect(first.map((r) => r.requestId)).toEqual(second.map((r) => r.requestId));
    expect(new Set(first.map((r) => r.requestId)).size).toBe(1);

    await asUser(t, adminId).mutation(api.clientProCredits.adminApproveClientProOrder, {
      orderId: order.orderId as never,
    });
    // Deuxième confirmation : la transition est déjà consommée.
    await asUser(t, adminId).mutation(api.clientProCredits.adminApproveClientProOrder, {
      orderId: order.orderId as never,
    });

    expect(await pendingRequests(t, adminId)).toHaveLength(0);
    const credits = await asUser(t, userId).query(api.clientProCredits.getMyClientProCredits);
    expect(credits?.balance.paidGranted).toBe(5);

    const notifications = await t.run(async (ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    );
    // Une seule notification de confirmation, malgré la double validation.
    expect(
      notifications.filter((n) => n.title === "Cotisation Client Pro confirmée"),
    ).toHaveLength(1);
  });
});
