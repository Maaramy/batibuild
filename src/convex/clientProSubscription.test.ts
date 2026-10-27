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
//   • d'une période temporaire configurée par l'administrateur (avec échéance) ;
//   • ou d'un abonnement payant ACTIF, activé uniquement après confirmation
//     effective du paiement.
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
      email: overrides.email ?? "client@test.com",
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
    const adminId = await createUser(t, { role: "admin", email: "admin1@test.com" });
    await insertLegacyFreeOfferConfig(t, adminId);
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

  it("3. après un paiement confirmé, l'abonnement Client Pro est activé pour la durée achetée", async () => {
    const userId = await createUser(t, { email: "paid@test.com", userRole: "client" });
    const adminId = await createUser(t, { role: "admin", email: "admin3@test.com" });

    const subscriptionId = await asUser(t, userId).mutation(
      api.subscriptions.createSubscription,
      { plan: "pro", paymentMethod: "d17", amount: 80, currency: "TND" },
    );

    // Tant que le paiement n'est pas validé : aucun accès.
    const pending = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(pending?.status).toBe("pending");
    expect(pending?.isActive).toBe(false);
    expect((await asUser(t, userId).query(api.access.checkClientProAccess)).allowed).toBe(false);

    await asUser(t, adminId).mutation(api.subscriptions.adminApproveSubscription, {
      subscriptionId,
    });

    const active = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(active?.status).toBe("active");
    expect(active?.isActive).toBe(true);
    expect(active?.subscriptionDaysRemaining).toBe(MONTHLY_DURATION_DAYS);
    expect((await asUser(t, userId).query(api.access.checkClientProAccess)).allowed).toBe(true);
  });

  it("4. le statut reste correct après actualisation et reconnexion", async () => {
    const userId = await createUser(t, { email: "stable@test.com", userRole: "client" });
    const adminId = await createUser(t, { role: "admin", email: "admin4@test.com" });
    const subscriptionId = await asUser(t, userId).mutation(
      api.subscriptions.createSubscription,
      { plan: "pro", paymentMethod: "d17", amount: 80, currency: "TND" },
    );
    await asUser(t, adminId).mutation(api.subscriptions.adminApproveSubscription, {
      subscriptionId,
    });

    const first = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    // « Actualisation » : même requête rejouée.
    const refreshed = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    // « Reconnexion » : nouvelle session, même utilisateur.
    const reconnected = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);

    expect(refreshed?.status).toBe(first?.status);
    expect(refreshed?.isActive).toBe(first?.isActive);
    expect(reconnected?.status).toBe("active");
    expect(reconnected?.isActive).toBe(true);
    expect(reconnected?.subscriptionDaysRemaining).toBe(MONTHLY_DURATION_DAYS);
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

  it("l'administrateur ne peut pas réactiver une offre gratuite Client Pro (prix null/0)", async () => {
    const adminId = await createUser(t, { role: "admin", email: "admin5@test.com" });

    await expect(
      asUser(t, adminId).mutation(api.payments.updatePlanPricing, { plan: "pro", price: null }),
    ).rejects.toThrow(/Client Pro est payant/);
    await expect(
      asUser(t, adminId).mutation(api.payments.updatePlanPricing, { plan: "pro", price: 0 }),
    ).rejects.toThrow(/Client Pro est payant/);

    // Le tarif mensuel reste administrable (montant strictement positif).
    await asUser(t, adminId).mutation(api.payments.updatePlanPricing, { plan: "pro", price: 95 });
    expect((await t.query(api.payments.getPublicPricing)).proPrice).toBe(95);
  });

  it("un prix Client Pro historique null est lu comme la valeur initiale (jamais gratuit)", async () => {
    const adminId = await createUser(t, { role: "admin", email: "admin6@test.com" });
    await insertLegacyFreeOfferConfig(t, adminId);

    const pricing = await t.query(api.payments.getPublicPricing);
    expect(pricing.proPrice).toBe(80);
  });

  it("une souscription Client Pro sans montant est refusée (aucune activation gratuite)", async () => {
    const userId = await createUser(t, { email: "nomontant@test.com" });

    await expect(
      asUser(t, userId).mutation(api.subscriptions.createSubscription, { plan: "pro" }),
    ).rejects.toThrow(/Client Pro est payant/);

    const status = await asUser(t, userId).query(api.subscriptionStatus.getMySubscriptionStatus);
    expect(status?.isActive).toBe(false);
    expect(await asUser(t, userId).query(api.access.checkClientProAccess)).toMatchObject({
      allowed: false,
    });
  });
});
