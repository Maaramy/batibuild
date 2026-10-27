/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";
import { DAY_MS, MONTHLY_DURATION_DAYS } from "./subscriptionPeriods.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// CLIENT PRO — AUCUNE OFFRE GRATUITE PERMANENTE
// ----------------------------------------------------------------------------
// L'ancienne logique « Offre gratuite Client Pro active — sans échéance ni
// paiement » est SUPPRIMÉE. Les droits Client Pro résultent désormais :
//   • d'une période d'accès TEMPORAIRE configurée par l'administrateur (essai
//     Client Pro, avec échéance) ;
//   • de la COTISATION par crédits de projets (gratuité initiale limitée puis
//     packs payants, attribués seulement après confirmation du paiement) ;
//   • d'un abonnement mensuel client HISTORIQUE encore valide (paiements déjà
//     confirmés : aucune révocation rétroactive).
//
// Ces tests couvrent les scénarios de validation obligatoires :
//   1. aucun accès Client Pro automatique/permanent sans paiement ;
//   2. expiration des droits à la fin de la période temporaire ;
//   3. activation seulement après paiement confirmé (durée achetée) ;
//   4. statut stable après actualisation / reconnexion ;
//   5. projets et données existants conservés.
// ============================================================================

async function createUser(
  t: ReturnType<typeof convexTest>,
  overrides: {
    role?: string;
    email?: string;
    userRole?: "client" | "supplier" | "expert";
    subscriptionPlan?: string;
    subscriptionStartDate?: number;
    subscriptionEndDate?: number;
    subscriptionStatus?: string;
  } = {},
): Promise<Id<"users">> {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Client Pro Test",
      email: overrides.email ?? `client-${Math.random()}@test.com`,
      role: overrides.role ?? "user",
      status: "active",
      userRole: overrides.userRole ?? "client",
      subscriptionPlan: overrides.subscriptionPlan,
      subscriptionStartDate: overrides.subscriptionStartDate,
      subscriptionEndDate: overrides.subscriptionEndDate,
      subscriptionStatus: overrides.subscriptionStatus as never,
      image: undefined,
      company: undefined,
      phone: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

function asUser(t: ReturnType<typeof convexTest>, userId: Id<"users"> | string) {
  return t.withIdentity({ subject: userId });
}

/** Administrateur : configure la cotisation Client Pro (crédits de projets). */
async function configureCotisation(
  t: ReturnType<typeof convexTest>,
  overrides: {
    freeGrantEnabled?: boolean;
    freeProjects?: number;
    cotisationPrice?: number;
    cotisationProjects?: number;
    tiers?: { projects: number; price: number }[];
  } = {},
) {
  const adminId = await createUser(t, { role: "admin", email: `admin-${Math.random()}@test.com` });
  await asUser(t, adminId).mutation(api.clientProCredits.updateClientProCreditConfig, {
    freeGrantEnabled: overrides.freeGrantEnabled ?? true,
    freeProjects: overrides.freeProjects ?? 1,
    cotisationPrice: overrides.cotisationPrice ?? 80,
    cotisationProjects: overrides.cotisationProjects ?? 1,
    tiers: overrides.tiers ?? [{ projects: 5, price: 350 }],
    refundOnDelete: false,
    allowStacking: true,
  });
  return adminId;
}

/** Création de projet réelle (mutation publique, mêmes règles que le site). */
function createProject(userT: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>, name = "") {
  return userT.mutation(api.projects.createProject, {
    name,
    category: "maison",
    region: "tunis",
    surface: 150,
  });
}

/**
 * Document `paymentConfig` HISTORIQUE portant l'ancienne « Offre gratuite »
 * Client Pro (`proPrice: null`). Il ne doit plus accorder AUCUN accès.
 */
async function insertLegacyFreeOfferConfig(
  t: ReturnType<typeof convexTest>,
  adminId: Id<"users">,
) {
  await t.run(async (ctx) =>
    ctx.db.insert("paymentConfig", {
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
      proPrice: null, // ancienne « offre gratuite » Client Pro (sans échéance)
      clientProEnabled: true,
      updatedAt: Date.now(),
      updatedBy: adminId,
    } as any),
  );
}

describe("Client Pro — suppression de l'offre gratuite permanente", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("1. un utilisateur sans abonnement n'obtient pas d'accès Client Pro permanent", async () => {
    const admin = await createUser(t, { role: "admin", email: "admin1@test.com" });
    await insertLegacyFreeOfferConfig(t, admin);
    // Gratuité initiale désactivée : aucun droit ne peut être accordé.
    await configureCotisation(t, { freeGrantEnabled: false, freeProjects: 0 });

    const userId = await createUser(t, { userRole: "client", email: "nofree@test.com" });

    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(status?.status).toBe("none");
    expect(status?.isActive).toBe(false);
    expect(status?.requiresPayment).toBe(true);
    // Le champ « offre gratuite » n'existe plus (plus aucun statut « actif sans échéance »).
    expect(Object.prototype.hasOwnProperty.call(status ?? {}, "freeOffer")).toBe(false);

    const access = await asUser(t, userId).query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(false);
    expect(access.reason).not.toBe("ok");

    const credits = await asUser(t, userId).query(api.clientProCredits.getMyClientProCredits);
    expect(credits?.balance.remaining).toBe(0);
    expect(credits?.entitled).toBe(false);
  });

  it("1bis. la gratuité initiale reste LIMITÉE et non renouvelable", async () => {
    await configureCotisation(t, { freeGrantEnabled: true, freeProjects: 1 });
    const userId = await createUser(t, { userRole: "client", email: "limited@test.com" });
    const userT = asUser(t, userId);

    // Le premier projet est accessible immédiatement (quota gratuit = 1).
    await createProject(userT, "Premier projet");

    // La gratuité n'est PAS permanente : le projet suivant exige une cotisation.
    await expect(createProject(userT, "Deuxième projet")).rejects.toThrow(
      /CLIENT_PRO_CREDITS_REQUIRED:/,
    );

    // Aucune recharge automatique, même après plusieurs relectures (« actualisation »).
    for (let i = 0; i < 2; i += 1) {
      const credits = await userT.query(api.clientProCredits.getMyClientProCredits);
      expect(credits?.balance.freeGranted).toBe(1);
      expect(credits?.balance.remaining).toBe(0);
      expect(credits?.freeGranted).toBe(true);
    }
  });

  it("2. à la fin de la période temporaire, les droits Client Pro expirent sans paiement confirmé", async () => {
    const now = Date.now();
    const userId = await createUser(t, {
      email: "expired@test.com",
      subscriptionPlan: "pro",
      subscriptionStartDate: now - (MONTHLY_DURATION_DAYS + 2) * DAY_MS,
      subscriptionEndDate: now - 2 * DAY_MS,
      subscriptionStatus: "active",
    });

    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(status?.status).toBe("expired");
    expect(status?.isActive).toBe(false);
    expect(status?.requiresPayment).toBe(true);

    const access = await asUser(t, userId).query(api.access.checkClientProAccess);
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("expired");
  });

  it("3. un paiement confirmé attribue EXACTEMENT les projets achetés", async () => {
    const adminId = await configureCotisation(t, { freeProjects: 0 });
    const userId = await createUser(t, { userRole: "client", email: "paid@test.com" });
    const userT = asUser(t, userId);

    const order = await userT.mutation(api.clientProCredits.requestClientProCotisation, {
      projects: 5,
      paymentMethod: "d17",
    });
    expect(order.projects).toBe(5);
    expect(order.price).toBe(350);

    // Tant que le paiement n'est pas confirmé : aucun crédit, aucun accès.
    const before = await userT.query(api.clientProCredits.getMyClientProCredits);
    expect(before?.balance.paidGranted).toBe(0);
    expect((await userT.query(api.access.checkClientProAccess)).allowed).toBe(false);

    await asUser(t, adminId).mutation(api.clientProCredits.adminApproveClientProOrder, {
      orderId: order.orderId,
    });

    const after = await userT.query(api.clientProCredits.getMyClientProCredits);
    expect(after?.balance.paidGranted).toBe(5);
    expect(after?.balance.paidRemaining).toBe(5);
    expect((await userT.query(api.access.checkClientProAccess)).allowed).toBe(true);

    // Double validation : aucun crédit supplémentaire (« sans double attribution »).
    await asUser(t, adminId).mutation(api.clientProCredits.adminApproveClientProOrder, {
      orderId: order.orderId,
    });
    const duplicated = await userT.query(api.clientProCredits.getMyClientProCredits);
    expect(duplicated?.balance.paidGranted).toBe(5);

    // Aucun abonnement mensuel Client Pro n'a été créé.
    const subs = await t.run(async (ctx) => ctx.db.query("subscriptions").collect());
    expect(subs.filter((s) => s.userId === userId)).toHaveLength(0);
  });

  it("4. le statut et le solde restent corrects après actualisation et reconnexion", async () => {
    const adminId = await configureCotisation(t, { freeProjects: 1 });
    const userId = await createUser(t, { userRole: "client", email: "stable@test.com" });
    const userT = asUser(t, userId);
    await createProject(userT, "Projet du quota");

    const order = await userT.mutation(api.clientProCredits.requestClientProCotisation, {
      projects: 1,
      paymentMethod: "d17",
    });
    await asUser(t, adminId).mutation(api.clientProCredits.adminApproveClientProOrder, {
      orderId: order.orderId,
    });

    const first = await userT.query(api.clientProCredits.getMyClientProCredits);
    // « Actualisation » : même requête rejouée.
    const refreshed = await userT.query(api.clientProCredits.getMyClientProCredits);
    // « Reconnexion » : nouvelle session, même utilisateur.
    const reconnected = await asUser(t, userId).query(api.clientProCredits.getMyClientProCredits);

    expect(refreshed?.balance).toEqual(first?.balance);
    expect(reconnected?.balance.paidGranted).toBe(1);
    expect(reconnected?.balance.remaining).toBe(1);
    expect((await asUser(t, userId).query(api.access.checkClientProAccess)).allowed).toBe(true);
  });

  it("5. les projets et données existants sont conservés après expiration", async () => {
    const now = Date.now();
    const userId = await createUser(t, {
      email: "keep@test.com",
      subscriptionPlan: "pro",
      subscriptionStartDate: now - 40 * DAY_MS,
      subscriptionEndDate: now - 5 * DAY_MS,
      subscriptionStatus: "active",
    });
    const projectId = await t.run(async (ctx) =>
      ctx.db.insert("projects", {
        userId,
        name: "Villa conservée",
        category: "villa",
        status: "completed",
        createdAt: now,
        updatedAt: now,
      }),
    );

    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(status?.status).toBe("expired");
    expect(await t.run(async (ctx) => ctx.db.get(projectId))).not.toBeNull();
    expect(await t.run(async (ctx) => ctx.db.get(userId))).not.toBeNull();
  });

  it("les crédits gratuits ne sont jamais accordés deux fois au même compte", async () => {
    await configureCotisation(t, { freeProjects: 2 });
    const userId = await createUser(t, { userRole: "client", email: "once@test.com" });
    const userT = asUser(t, userId);

    await createProject(userT, "Un");
    const first = await userT.query(api.clientProCredits.getMyClientProCredits);
    expect(first?.balance.freeGranted).toBe(2);
    expect(first?.balance.remaining).toBe(1);

    // Changement de profil, déconnexion/reconnexion : aucun nouveau crédit.
    await t.run(async (ctx) => ctx.db.patch(userId, { userRole: "client", company: "Test SARL" }));
    const after = await asUser(t, userId).query(api.clientProCredits.getMyClientProCredits);
    expect(after?.balance.freeGranted).toBe(2);
    expect(after?.freeGrantedAt).toBe(first?.freeGrantedAt);
  });

  it("un Expert qui paie la cotisation obtient les droits Client Pro SANS perdre son profil", async () => {
    const adminId = await configureCotisation(t, { freeProjects: 0 });
    const userId = await createUser(t, { userRole: "expert", email: "expert-pro@test.com" });
    const userT = asUser(t, userId);

    // Aucun droit Client Pro par le seul profil professionnel.
    expect((await userT.query(api.access.checkClientProAccess)).allowed).toBe(false);

    const order = await userT.mutation(api.clientProCredits.requestClientProCotisation, {
      projects: 1,
      paymentMethod: "d17",
    });
    await asUser(t, adminId).mutation(api.clientProCredits.adminApproveClientProOrder, {
      orderId: order.orderId,
    });

    expect((await userT.query(api.access.checkClientProAccess)).allowed).toBe(true);

    // Le profil professionnel est intact et aucun abonnement mensuel n'a été créé.
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.userRole).toBe("expert");
    const subs = await t.run(async (ctx) => ctx.db.query("subscriptions").collect());
    expect(subs.filter((s) => s.userId === userId)).toHaveLength(0);
  });

  it("les paramètres enregistrés par l'administrateur restent identiques après relecture", async () => {
    const adminId = await configureCotisation(t, {
      freeGrantEnabled: true,
      freeProjects: 3,
      cotisationPrice: 95,
      cotisationProjects: 2,
      tiers: [
        { projects: 6, price: 400 },
        { projects: 12, price: 750 },
      ],
    });
    const adminT = asUser(t, adminId);

    for (let i = 0; i < 3; i += 1) {
      const stored = await adminT.query(api.clientProCredits.getClientProCreditConfig);
      expect(stored?.config.freeProjects).toBe(3);
      expect(stored?.config.cotisationPrice).toBe(95);
      expect(stored?.config.cotisationProjects).toBe(2);
      expect(stored?.packages).toEqual([
        { projects: 2, price: 95 },
        { projects: 6, price: 400 },
        { projects: 12, price: 750 },
      ]);
    }

    // Une nouvelle session administrateur (reconnexion) relit les mêmes valeurs.
    const secondAdmin = await createUser(t, { role: "admin", email: "admin-2@test.com" });
    const reloaded = await asUser(t, secondAdmin).query(api.clientProCredits.getClientProCreditConfig);
    expect(reloaded?.config.freeProjects).toBe(3);
    expect(reloaded?.config.cotisationPrice).toBe(95);
  });

  it("l'administrateur ne peut pas réactiver une offre gratuite Client Pro (prix null/0)", async () => {
    const adminId = await createUser(t, { role: "admin", email: "admin5@test.com" });

    await expect(
      asUser(t, adminId).mutation(api.payments.updatePlanPricing, { plan: "pro", price: null }),
    ).rejects.toThrow(/Client Pro est payant/);
    await expect(
      asUser(t, adminId).mutation(api.payments.updatePlanPricing, { plan: "pro", price: 0 }),
    ).rejects.toThrow(/Client Pro est payant/);

    // Le tarif Client Pro reste administrable (montant strictement positif).
    await asUser(t, adminId).mutation(api.payments.updatePlanPricing, { plan: "pro", price: 95 });
    expect((await t.query(api.payments.getPublicPricing)).proPrice).toBe(95);
  });

  it("un prix Client Pro historique null est lu comme la valeur initiale (jamais gratuit)", async () => {
    const adminId = await createUser(t, { role: "admin", email: "admin6@test.com" });
    await insertLegacyFreeOfferConfig(t, adminId);

    const pricing = await t.query(api.payments.getPublicPricing);
    expect(pricing.proPrice).toBe(80);
  });

  it("aucun abonnement mensuel Client Pro ne peut être souscrit (ni activé sans montant)", async () => {
    const userId = await createUser(t, { email: "nomontant@test.com" });

    await expect(
      asUser(t, userId).mutation(api.subscriptions.createSubscription, { plan: "pro" }),
    ).rejects.toThrow(/cotisation/);
    await expect(
      asUser(t, userId).mutation(api.subscriptions.createSubscription, {
        plan: "pro",
        paymentMethod: "d17",
        amount: 80,
        currency: "TND",
      }),
    ).rejects.toThrow(/cotisation/);

    const subs = await t.run(async (ctx) => ctx.db.query("subscriptions").collect());
    expect(subs).toHaveLength(0);
  });
});
