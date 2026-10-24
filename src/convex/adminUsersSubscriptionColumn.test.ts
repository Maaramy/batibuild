/// <reference types="vite/client" />

// ============================================================================
// COLONNE « ABONNEMENT » — ADMIN → UTILISATEURS
// ----------------------------------------------------------------------------
// Règle : dès qu'un abonnement est ACTIVÉ pour l'un des forfaits payants
// (Client Pro, Expert, Fournisseur), la colonne « Abonnement » de la page
// Administration → Utilisateurs doit afficher le forfait correspondant.
//
//   - Client Pro  : activation via `subscriptions` (statut actif) ;
//   - Expert      : activation via le profil Expert (et désormais aussi
//                   synchronisée sur le compte + `subscriptions`) ;
//   - Fournisseur : activation via le profil Fournisseur (idem).
//
// Le repli « profil actif » couvre les comptes DÉJÀ activés avant la
// synchronisation : aucune migration de données existantes n'est nécessaire.

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";

const modules = import.meta.glob("./**/*.*s");

const DAY_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// Helpers
// ============================================================================

async function createUser(
  t: ReturnType<typeof convexTest>,
  overrides: {
    role?: string;
    email?: string;
    name?: string;
    userRole?: "client" | "supplier" | "expert";
    subscriptionPlan?: string;
  } = {},
) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: overrides.name ?? "Utilisateur Test",
      email: overrides.email ?? "user@test.com",
      role: overrides.role ?? "user",
      status: "active",
      subscriptionPlan: overrides.subscriptionPlan ?? "free",
      userRole: overrides.userRole,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

async function createAdmin(t: ReturnType<typeof convexTest>, email: string) {
  return createUser(t, { role: "admin", email, name: "Admin Test" });
}

/** Ligne de la colonne « Abonnement » pour un compte donné. */
async function userRow(
  t: ReturnType<typeof convexTest>,
  adminId: string,
  userId: string,
) {
  const rows = await asUser(t, adminId).query(api.users.getAllUsers);
  const row = rows.find((u: any) => u._id === userId);
  expect(row).toBeDefined();
  return row as any;
}

/** Libellé exact affiché par la colonne (même mapping que l'interface). */
function columnLabel(plan: string | null | undefined): string {
  return plan === "supplier"
    ? "Fournisseur"
    : plan === "expert"
      ? "Expert"
      : plan === "pro"
        ? "Client Pro"
        : "Aucun";
}

async function insertActiveSubscription(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  plan: "pro" | "expert" | "supplier",
  options: { startDate?: number; endDate?: number } = {},
) {
  const now = options.startDate ?? Date.now();
  return t.run(async (ctx) =>
    ctx.db.insert("subscriptions", {
      userId,
      plan,
      status: "active",
      startDate: now,
      endDate: options.endDate ?? now + 30 * DAY_MS,
      paymentMethod: "admin",
      amount: 0,
      currency: "TND",
      monthlyDownloadCount: 0,
      downloadLimit: 10,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

// ============================================================================
// 1. Forfaits payants activés → forfait affiché
// ============================================================================

describe("Colonne Abonnement — forfait affiché quand l'abonnement est activé", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createAdmin(t, "admin-colonne@test.com");
  });

  it("affiche « Client Pro » quand l'abonnement Client Pro est actif", async () => {
    const userId = await createUser(t, { email: "pro@test.com" });
    await insertActiveSubscription(t, userId, "pro");

    const row = await userRow(t, adminId, userId);
    expect(row.referencePlan).toBe("pro");
    expect(columnLabel(row.referencePlan)).toBe("Client Pro");
    expect(row.profileSubscriptionCompatible).toBe(true);
  });

  it("affiche « Expert » quand l'abonnement Expert est approuvé par l'administration", async () => {
    const userId = await createUser(t, { email: "expert@test.com", userRole: "expert" });
    const profileId = await t.run(async (ctx) =>
      ctx.db.insert("expertProfiles", {
        userId,
        profession: "architecte",
        displayName: "Cabinet Expert",
        phone: "+216 22 333 444",
        email: "expert@test.com",
        specialties: [],
        regions: ["tunis"],
        plan: "none",
        subscriptionStatus: "pending",
        paymentMethod: "bank_transfer",
        paymentAmount: 150,
        isVisible: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    await asUser(t, adminId).mutation(api.expertProfiles.adminApproveExpertSubscription, {
      profileId,
    });

    // Le forfait est désormais écrit partout : compte, abonnement actif, profil.
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.subscriptionPlan).toBe("expert");
    expect(user?.subscriptionStatus).toBe("active");

    const subs = (await t.run(async (ctx) =>
      ctx.db.query("subscriptions").collect(),
    )).filter((s) => s.userId === userId);
    expect(subs).toHaveLength(1);
    expect(subs[0].plan).toBe("expert");
    expect(subs[0].status).toBe("active");

    const row = await userRow(t, adminId, userId);
    expect(row.referencePlan).toBe("expert");
    expect(columnLabel(row.referencePlan)).toBe("Expert");
    expect(row.profileSubscriptionCompatible).toBe(true);
  });

  it("affiche « Fournisseur » quand l'abonnement Fournisseur est approuvé par l'administration", async () => {
    const userId = await createUser(t, { email: "fournisseur@test.com", userRole: "supplier" });
    const profileId = await t.run(async (ctx) =>
      ctx.db.insert("supplierProfiles", {
        userId,
        companyName: "Matériaux Test",
        phone: "+216 99 111 111",
        email: "fournisseur@test.com",
        address: "Tunis",
        specialties: ["ciment"],
        regions: ["tunis"],
        plan: "none",
        subscriptionStatus: "pending",
        paymentMethod: "d17",
        paymentAmount: 120,
        isVisible: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    await asUser(t, adminId).mutation(api.supplierProfiles.adminApproveSupplierSubscription, {
      profileId,
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.subscriptionPlan).toBe("supplier");
    expect(user?.subscriptionStatus).toBe("active");

    const subs = (await t.run(async (ctx) =>
      ctx.db.query("subscriptions").collect(),
    )).filter((s) => s.userId === userId);
    expect(subs).toHaveLength(1);
    expect(subs[0].plan).toBe("supplier");
    expect(subs[0].status).toBe("active");

    const row = await userRow(t, adminId, userId);
    expect(row.referencePlan).toBe("supplier");
    expect(columnLabel(row.referencePlan)).toBe("Fournisseur");
    expect(row.profileSubscriptionCompatible).toBe(true);
  });

  it("affiche « Aucun » tant qu'aucun forfait n'est activé", async () => {
    const userId = await createUser(t, { email: "gratuit@test.com" });

    const row = await userRow(t, adminId, userId);
    expect(columnLabel(row.referencePlan)).toBe("Aucun");
    expect(row.profileSubscriptionCompatible).toBe(true);
  });
});

// ============================================================================
// 2. Données existantes (aucune migration) + priorité de l'actif
// ============================================================================

describe("Colonne Abonnement — comptes déjà activés et priorité de l'abonnement actif", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createAdmin(t, "admin-historique@test.com");
  });

  it("affiche « Expert » pour un compte Expert activé avant la synchronisation (sans abonnement enregistré)", async () => {
    const userId = await createUser(t, { email: "expert-historique@test.com" });
    await t.run(async (ctx) =>
      ctx.db.insert("expertProfiles", {
        userId,
        profession: "ingenieur",
        displayName: "Expert Historique",
        phone: "+216 21 111 111",
        email: "expert-historique@test.com",
        specialties: [],
        regions: ["ariana"],
        plan: "monthly",
        subscriptionStatus: "active",
        subscriptionStartDate: Date.now() - 10 * DAY_MS,
        subscriptionEndDate: Date.now() + 20 * DAY_MS,
        isVisible: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    const row = await userRow(t, adminId, userId);
    expect(row.referencePlan).toBe("expert");
    expect(columnLabel(row.referencePlan)).toBe("Expert");
    expect(row.profileSubscriptionCompatible).toBe(true);
  });

  it("affiche « Fournisseur » pour un compte Fournisseur activé avant la synchronisation", async () => {
    const userId = await createUser(t, { email: "fournisseur-historique@test.com" });
    await t.run(async (ctx) =>
      ctx.db.insert("supplierProfiles", {
        userId,
        companyName: "Fournisseur Historique",
        phone: "+216 98 000 000",
        email: "fournisseur-historique@test.com",
        address: "Sfax",
        specialties: ["bois"],
        regions: ["sfax"],
        plan: "monthly",
        subscriptionStatus: "active",
        subscriptionStartDate: Date.now() - 10 * DAY_MS,
        subscriptionEndDate: Date.now() + 20 * DAY_MS,
        isVisible: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    const row = await userRow(t, adminId, userId);
    expect(row.referencePlan).toBe("supplier");
    expect(columnLabel(row.referencePlan)).toBe("Fournisseur");
    expect(row.profileSubscriptionCompatible).toBe(true);
  });

  it("affiche le forfait ACTIF plutôt qu'un ancien abonnement expiré", async () => {
    const userId = await createUser(t, {
      email: "expert-ancien-pro@test.com",
      userRole: "expert",
      subscriptionPlan: "pro",
    });
    // Ancien abonnement Client Pro EXPIRÉ (historique conservé tel quel).
    await insertActiveSubscription(t, userId, "pro", {
      startDate: Date.now() - 90 * DAY_MS,
      endDate: Date.now() - 60 * DAY_MS,
    });
    // Profil Expert activé (ancien flux d'activation, sans abonnement enregistré).
    await t.run(async (ctx) =>
      ctx.db.insert("expertProfiles", {
        userId,
        profession: "promoteur_immobilier",
        displayName: "Expert Renouvelé",
        phone: "+216 23 333 333",
        email: "expert-ancien-pro@test.com",
        specialties: [],
        regions: ["tunis"],
        plan: "monthly",
        subscriptionStatus: "active",
        subscriptionEndDate: Date.now() + 20 * DAY_MS,
        isVisible: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    const row = await userRow(t, adminId, userId);
    expect(row.referencePlan).toBe("expert");
    expect(columnLabel(row.referencePlan)).toBe("Expert");
  });

  it("n'écrase pas un abonnement payé existant lors d'une activation Expert", async () => {
    const userId = await createUser(t, { email: "double-abo@test.com", userRole: "expert" });
    // Abonnement Client Pro payé il y a 5 jours : il reste actif et intact.
    const proSubId = await insertActiveSubscription(t, userId, "pro", {
      startDate: Date.now() - 5 * DAY_MS,
      endDate: Date.now() + 25 * DAY_MS,
    });
    const profileId = await t.run(async (ctx) =>
      ctx.db.insert("expertProfiles", {
        userId,
        profession: "architecte",
        displayName: "Double Abo",
        phone: "+216 24 444 444",
        email: "double-abo@test.com",
        specialties: [],
        regions: ["tunis"],
        plan: "none",
        subscriptionStatus: "pending",
        isVisible: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    await asUser(t, adminId).mutation(api.expertProfiles.adminApproveExpertSubscription, {
      profileId,
    });

    // L'abonnement Client Pro payé est conservé intact (historique, mise à jour possible).
    const proSub = await t.run(async (ctx) => ctx.db.get(proSubId));
    expect(proSub?.plan).toBe("pro");
    expect(proSub?.status).toBe("active");

    // Le forfait le plus récemment activé est celui qui s'affiche.
    const row = await userRow(t, adminId, userId);
    expect(row.referencePlan).toBe("expert");
    expect(columnLabel(row.referencePlan)).toBe("Expert");
  });

  it("reste vide pour un utilisateur non administrateur", async () => {
    const userId = await createUser(t, { email: "simple@test.com" });
    await insertActiveSubscription(t, userId, "pro");

    const rows = await asUser(t, userId).query(api.users.getAllUsers);
    expect(rows).toEqual([]);
  });
});
