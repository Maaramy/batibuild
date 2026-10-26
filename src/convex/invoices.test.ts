/// <reference types="vite/client" />

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { DAY_MS } from "./subscriptionPeriods.js";
import { endOfDay, formatInvoiceNumber, startOfDay } from "../lib/invoiceStatus.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// FACTURATION — tests d'intégration Convex.
//
// Vérifie les promesses faites à l'utilisateur et à l'administration :
//   • un paiement (ou un renouvellement) CRÉE automatiquement une facture ;
//   • les numéros sont uniques et séquentiels ;
//   • les statuts payé / en attente / annulé / remboursé sont respectés ;
//   • une facture n'est JAMAIS supprimée, même après annulation ;
//   • un abonné ne voit QUE ses factures, un non-admin ne voit rien du tout.
// ============================================================================

const CURRENT_YEAR = new Date().getFullYear();

async function createUser(
  t: ReturnType<typeof convexTest>,
  overrides: {
    role?: string;
    email?: string;
    name?: string;
    company?: string;
    userRole?: "client" | "supplier" | "expert";
    subscriptionPlan?: string;
  } = {},
) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: overrides.name ?? "Client Test",
      email: overrides.email ?? "client@test.com",
      role: overrides.role ?? "user",
      status: "active",
      subscriptionPlan: overrides.subscriptionPlan ?? "free",
      userRole: overrides.userRole,
      company: overrides.company,
      // Les tests n'envoient aucun e-mail : le module de facturation ne doit
      // jamais en dépendre.
      emailNotifications: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

/**
 * Soumet une demande d'abonnement payante (virement ou D17). Aucune méthode
 * n'étant encaissée automatiquement, la souscription reste « en attente »
 * jusqu'à la validation de l'administrateur.
 */
async function subscribe(
  t: ReturnType<typeof convexTest>,
  userId: string,
  overrides: {
    plan?: "pro" | "supplier" | "expert";
    paymentMethod?: string;
    amount?: number;
    paymentId?: string;
    userRole?: "client" | "supplier" | "expert";
  } = {},
) {
  return asUser(t, userId).mutation(api.subscriptions.createSubscription, {
    plan: overrides.plan ?? "pro",
    paymentMethod: overrides.paymentMethod ?? "d17",
    amount: overrides.amount ?? 80,
    currency: "TND",
    paymentId: overrides.paymentId,
  });
}

let approverCount = 0;

/**
 * Souscrit un forfait payant puis fait valider le règlement par un
 * administrateur : la facture n'est « payée » qu'après cette validation.
 */
async function subscribeConfirmed(
  t: ReturnType<typeof convexTest>,
  userId: string,
  overrides: Parameters<typeof subscribe>[2] = {},
) {
  const subscriptionId = await subscribe(t, userId, overrides);
  approverCount += 1;
  const approverId = await createUser(t, {
    role: "admin",
    email: `approbateur${approverCount}@test.tn`,
  });
  await asUser(t, approverId).mutation(api.subscriptions.adminApproveSubscription, {
    subscriptionId,
  });
  return subscriptionId;
}

async function myInvoices(t: ReturnType<typeof convexTest>, userId: string) {
  return asUser(t, userId).query(api.invoices.getMyInvoices);
}

/** Configuration de facturation (TVA + coordonnées de l'émetteur). */
async function configureBilling(
  t: ReturnType<typeof convexTest>,
  adminId: string,
  config: Record<string, unknown>,
) {
  return asUser(t, adminId).mutation(api.payments.updatePaymentConfig, config as never);
}

/* ------------------------------------------------------------------ *
 * Génération automatique
 * ------------------------------------------------------------------ */

describe("facturation — génération automatique", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("crée automatiquement une facture payée lors d'un paiement confirmé", async () => {
    const userId = await createUser(t, { name: "Amine Ben Salah", email: "amine@test.tn" });
    await subscribeConfirmed(t, userId, { paymentMethod: "d17", amount: 80 });

    const invoices = await myInvoices(t, userId);
    expect(invoices).toHaveLength(1);

    const invoice = invoices[0];
    expect(invoice.invoiceNumber).toBe(formatInvoiceNumber(CURRENT_YEAR, 1));
    expect(invoice.status).toBe("paid");
    expect(invoice.amountTTC).toBe(80);
    // Aucune TVA par défaut : HT = TTC, montant non inventé.
    expect(invoice.amountHT).toBe(80);
    expect(invoice.taxAmount).toBe(0);
    expect(invoice.taxRate).toBe(0);
    expect(invoice.currency).toBe("TND");
    expect(invoice.profileType).toBe("client");
    expect(invoice.plan).toBe("pro");
    expect(invoice.paymentMethod).toBe("d17");
    expect(invoice.issueDate).toBeGreaterThan(0);
    expect(invoice.paymentDate).toBeGreaterThan(0);
    // Période de l'abonnement facturée (30 jours).
    expect(invoice.billingPeriodEnd - invoice.billingPeriodStart).toBe(30 * DAY_MS);
    expect(invoice.description).toContain("Client Pro");
    // Instantané du client : la facture reste nominative.
    expect(invoice.customerName).toBe("Amine Ben Salah");
    expect(invoice.customerEmail).toBe("amine@test.tn");
    // Coordonnées de facturation figées (nom de marque par défaut, sans données inventées).
    expect(invoice.issuer?.name).toBe("batibuild");
    expect(invoice.issuer?.taxId).toBeUndefined();
  });

  it("numérote les factures de façon unique et séquentielle", async () => {
    const first = await createUser(t, { email: "un@test.tn" });
    const second = await createUser(t, { email: "deux@test.tn" });
    const third = await createUser(t, { email: "trois@test.tn" });

    await subscribe(t, first);
    await subscribe(t, second);
    await subscribe(t, third);

    const numbers = (
      await Promise.all([first, second, third].map((id) => myInvoices(t, id)))
    ).map((rows) => rows[0].invoiceNumber);

    expect(numbers).toEqual([
      formatInvoiceNumber(CURRENT_YEAR, 1),
      formatInvoiceNumber(CURRENT_YEAR, 2),
      formatInvoiceNumber(CURRENT_YEAR, 3),
    ]);
    expect(new Set(numbers).size).toBe(3);
  });

  it("transmet la référence de transaction du paiement", async () => {
    const userId = await createUser(t);
    await subscribe(t, userId, { paymentId: "TRX-2026-0009" });
    const [invoice] = await myInvoices(t, userId);
    expect(invoice.transactionId).toBe("TRX-2026-0009");
  });

  it("n'émet aucune facture pour un forfait gratuit", async () => {
    const userId = await createUser(t);
    // Aucun montant réglé → aucun document comptable.
    await asUser(t, userId).mutation(api.subscriptions.createSubscription, { plan: "pro" });
    expect(await myInvoices(t, userId)).toHaveLength(0);
  });

  it("applique la TVA configurée sans changer le prix payé", async () => {
    const adminId = await createUser(t, { role: "admin", email: "admin-tva@test.tn" });
    await configureBilling(t, adminId, { vatRate: 19 });

    const userId = await createUser(t, { email: "tva@test.tn" });
    await subscribe(t, userId, { amount: 119 });

    const [invoice] = await myInvoices(t, userId);
    expect(invoice.amountTTC).toBe(119);
    expect(invoice.amountHT).toBe(100);
    expect(invoice.taxAmount).toBe(19);
    expect(invoice.taxRate).toBe(19);

    // Le taux est FIGÉ : le modifier ne réécrit pas l'historique.
    await configureBilling(t, adminId, { vatRate: 7 });
    const [unchanged] = await myInvoices(t, userId);
    expect(unchanged.taxRate).toBe(19);
    expect(unchanged.amountHT).toBe(100);
  });

  it("reprend les coordonnées de facturation de la plateforme", async () => {
    const adminId = await createUser(t, { role: "admin", email: "admin-coord@test.tn" });
    await configureBilling(t, adminId, {
      companyLegalName: "batibuild SARL",
      companyAddress: "12 rue du Chantier, Tunis",
      companyTaxId: "1234567/A/M/000",
      companyEmail: "facturation@batibuild.app",
      paymentTerms: "Paiement à 30 jours.",
    });

    const userId = await createUser(t, { email: "coord@test.tn" });
    await subscribe(t, userId);
    const [invoice] = await myInvoices(t, userId);

    expect(invoice.issuer).toMatchObject({
      name: "batibuild SARL",
      address: "12 rue du Chantier, Tunis",
      taxId: "1234567/A/M/000",
      email: "facturation@batibuild.app",
      terms: "Paiement à 30 jours.",
    });
  });

  it("refuse un taux de TVA hors bornes", async () => {
    const adminId = await createUser(t, { role: "admin", email: "admin-bornes@test.tn" });
    await expect(configureBilling(t, adminId, { vatRate: 150 })).rejects.toThrow(/entre 0 et 100/);
  });
});

/* ------------------------------------------------------------------ *
 * Paiement → facture (statuts)
 * ------------------------------------------------------------------ */

describe("facturation — cycle de vie des statuts", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createUser(t, { role: "admin", email: "admin@test.tn" });
  });

  it("créée « en attente » pour un virement, puis « payée » à la validation", async () => {
    const userId = await createUser(t, { email: "virement@test.tn" });
    await subscribe(t, userId, { paymentMethod: "bank_transfer", amount: 120 });

    const [pending] = await myInvoices(t, userId);
    expect(pending.status).toBe("pending");
    expect(pending.paymentDate).toBeUndefined();

    const sub = await asUser(t, userId).query(api.subscriptions.getMySubscription);
    await asUser(t, adminId).mutation(api.subscriptions.adminApproveSubscription, {
      subscriptionId: sub!._id,
    });

    const [paid] = await myInvoices(t, userId);
    expect(paid.status).toBe("paid");
    expect(paid.paymentDate).toBeGreaterThan(0);
    // Toujours une seule facture : la validation met à jour, elle ne duplique pas.
    expect(paid.invoiceNumber).toBe(pending.invoiceNumber);
  });

  it("annule la facture non payée quand la demande est refusée — sans la supprimer", async () => {
    const userId = await createUser(t, { email: "refus@test.tn" });
    await subscribe(t, userId, { paymentMethod: "bank_transfer" });

    const sub = await asUser(t, userId).query(api.subscriptions.getMySubscription);
    await asUser(t, adminId).mutation(api.subscriptions.adminRejectSubscription, {
      subscriptionId: sub!._id,
    });

    const invoices = await myInvoices(t, userId);
    expect(invoices).toHaveLength(1);
    expect(invoices[0].status).toBe("cancelled");
    expect(invoices[0].paymentDate).toBeUndefined();
  });

  it("suit la vérification du reçu de paiement (payée ↔ en attente)", async () => {
    const userId = await createUser(t, { email: "recu@test.tn" });
    await subscribe(t, userId, { paymentMethod: "bank_transfer" });
    const sub = await asUser(t, userId).query(api.subscriptions.getMySubscription);

    await asUser(t, adminId).mutation(api.subscriptions.markReceiptVerified, {
      subscriptionId: sub!._id,
      verified: true,
    });
    expect((await myInvoices(t, userId))[0].status).toBe("paid");

    await asUser(t, adminId).mutation(api.subscriptions.markReceiptVerified, {
      subscriptionId: sub!._id,
      verified: false,
    });
    const [backToPending] = await myInvoices(t, userId);
    expect(backToPending.status).toBe("pending");
    expect(backToPending.paymentDate).toBeUndefined();
  });

  it("n'annule jamais une facture déjà payée lors de la résiliation de l'abonnement", async () => {
    const userId = await createUser(t, { email: "resilie@test.tn" });
    await subscribeConfirmed(t, userId, { paymentMethod: "d17", amount: 80 });

    await asUser(t, userId).mutation(api.subscriptions.cancelSubscription, {});

    const invoices = await myInvoices(t, userId);
    expect(invoices).toHaveLength(1);
    // L'historique de facturation est conservé : la facture payée reste payée.
    expect(invoices[0].status).toBe("paid");
  });

  it("annule la facture en attente lors de la résiliation de l'abonnement", async () => {
    const userId = await createUser(t, { email: "resilie2@test.tn" });
    await subscribe(t, userId, { paymentMethod: "bank_transfer" });

    await asUser(t, userId).mutation(api.subscriptions.cancelSubscription, {});

    const invoices = await myInvoices(t, userId);
    expect(invoices).toHaveLength(1);
    expect(invoices[0].status).toBe("cancelled");
  });

  it("permet à l'administrateur de passer une facture en remboursée", async () => {
    const userId = await createUser(t, { email: "rembourse@test.tn" });
    await subscribeConfirmed(t, userId, { paymentMethod: "d17", amount: 120 });
    const [invoice] = await myInvoices(t, userId);

    await asUser(t, adminId).mutation(api.invoices.adminUpdateInvoiceStatus, {
      invoiceId: invoice._id,
      status: "refunded",
    });

    const [refunded] = await myInvoices(t, userId);
    expect(refunded.status).toBe("refunded");
    // Remboursée : le paiement n'est plus encaissé.
    expect(refunded.paymentDate).toBeUndefined();

    const { stats } = await asUser(t, adminId).query(api.invoices.adminListInvoices, {});
    expect(stats.byStatus.refunded).toBe(1);
    expect(stats.collectedTTC).toBe(0);
    expect(stats.refundedTTC).toBe(120);
  });
});

/* ------------------------------------------------------------------ *
 * Renouvellement
 * ------------------------------------------------------------------ */

describe("facturation — renouvellement", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("génère une NOUVELLE facture sans écraser la précédente", async () => {
    const userId = await createUser(t, { email: "renouvellement@test.tn" });
    await subscribeConfirmed(t, userId, { amount: 80 });
    await subscribeConfirmed(t, userId, { amount: 80 });

    const invoices = await myInvoices(t, userId);
    expect(invoices).toHaveLength(2);

    const numbers = invoices.map((i) => i.invoiceNumber);
    expect(new Set(numbers).size).toBe(2);
    expect(numbers).toContain(formatInvoiceNumber(CURRENT_YEAR, 1));
    expect(numbers).toContain(formatInvoiceNumber(CURRENT_YEAR, 2));

    // Les deux factures sont conservées, chacune avec sa propre période.
    for (const invoice of invoices) {
      expect(invoice.status).toBe("paid");
      expect(invoice.amountTTC).toBe(80);
      expect(invoice.billingPeriodEnd - invoice.billingPeriodStart).toBe(30 * DAY_MS);
    }
  });

  it("conserve l'historique complet d'un abonné fidèle", async () => {
    const userId = await createUser(t, { email: "fidele@test.tn" });
    for (let i = 0; i < 5; i += 1) await subscribeConfirmed(t, userId, { amount: 120 });

    const invoices = await myInvoices(t, userId);
    expect(invoices).toHaveLength(5);
    expect(new Set(invoices.map((i) => i.invoiceNumber)).size).toBe(5);
    // Tri : la plus récente d'abord.
    expect(invoices[0].issueDate).toBeGreaterThanOrEqual(invoices[4].issueDate);
  });
});

/* ------------------------------------------------------------------ *
 * Sécurité
 * ------------------------------------------------------------------ */

describe("facturation — sécurité et permissions", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createUser(t, { role: "admin", email: "admin-secu@test.tn" });
  });

  it("n'expose à un abonné QUE ses propres factures", async () => {
    const alice = await createUser(t, { email: "alice@test.tn", name: "Alice" });
    const bob = await createUser(t, { email: "bob@test.tn", name: "Bob" });
    await subscribe(t, alice, { amount: 80 });
    await subscribe(t, bob, { amount: 120 });

    const aliceInvoices = await myInvoices(t, alice);
    const bobInvoices = await myInvoices(t, bob);

    expect(aliceInvoices).toHaveLength(1);
    expect(bobInvoices).toHaveLength(1);
    expect(aliceInvoices[0].userId).toBe(alice);
    expect(aliceInvoices[0].customerEmail).toBe("alice@test.tn");
    expect(aliceInvoices[0].invoiceNumber).not.toBe(bobInvoices[0].invoiceNumber);
  });

  it("ne renvoie rien à un visiteur non connecté", async () => {
    const userId = await createUser(t, { email: "anonyme@test.tn" });
    await subscribe(t, userId);
    expect(await t.query(api.invoices.getMyInvoices)).toEqual([]);
  });

  it("réserve la liste complète aux administrateurs (modérateur refusé)", async () => {
    const userId = await createUser(t, { email: "client-secu@test.tn" });
    await subscribe(t, userId);
    const moderatorId = await createUser(t, { role: "moderator", email: "modo@test.tn" });

    // Client, modérateur et visiteur : aucune donnée de facturation.
    for (const actor of [t, asUser(t, userId), asUser(t, moderatorId)]) {
      const result = await actor.query(api.invoices.adminListInvoices, {});
      expect(result.invoices).toEqual([]);
      expect(result.stats.count).toBe(0);
      expect(result.stats.billedTTC).toBe(0);
    }

    const admin = await asUser(t, adminId).query(api.invoices.adminListInvoices, {});
    expect(admin.invoices).toHaveLength(1);
    expect(admin.invoices[0].account?.email).toBe("client-secu@test.tn");
  });

  it("refuse la modification d'un statut à tout non-administrateur", async () => {
    const userId = await createUser(t, { email: "intrus@test.tn" });
    await subscribeConfirmed(t, userId);
    const moderatorId = await createUser(t, { role: "moderator", email: "modo2@test.tn" });
    const [invoice] = await myInvoices(t, userId);

    await expect(
      asUser(t, userId).mutation(api.invoices.adminUpdateInvoiceStatus, {
        invoiceId: invoice._id,
        status: "cancelled",
      }),
    ).rejects.toThrow(/Unauthorized/);
    await expect(
      asUser(t, moderatorId).mutation(api.invoices.adminUpdateInvoiceStatus, {
        invoiceId: invoice._id,
        status: "cancelled",
      }),
    ).rejects.toThrow(/Unauthorized/);
    await expect(
      t.mutation(api.invoices.adminUpdateInvoiceStatus, {
        invoiceId: invoice._id,
        status: "cancelled",
      }),
    ).rejects.toThrow(/Unauthorized/);

    // Le statut n'a pas bougé.
    expect((await myInvoices(t, userId))[0].status).toBe("paid");
  });

  it("refuse à un tiers l'archivage du PDF d'une autre facture", async () => {
    const alice = await createUser(t, { email: "alice-pdf@test.tn" });
    const bob = await createUser(t, { email: "bob-pdf@test.tn" });
    await subscribe(t, alice);
    const [invoice] = await myInvoices(t, alice);

    const storageId = await t.run(async (ctx) => ctx.storage.store(new Blob(["pdf"])));

    await expect(
      asUser(t, bob).mutation(api.invoices.archiveInvoicePdf, {
        invoiceId: invoice._id,
        storageId,
      }),
    ).rejects.toThrow(/Accès refusé/);

    // Le propriétaire peut archiver sa copie, et une copie archivée n'est jamais
    // remplacée.
    await asUser(t, alice).mutation(api.invoices.archiveInvoicePdf, {
      invoiceId: invoice._id,
      storageId,
    });
    const second = await t.run(async (ctx) => ctx.storage.store(new Blob(["pdf2"])));
    const result = await asUser(t, alice).mutation(api.invoices.archiveInvoicePdf, {
      invoiceId: invoice._id,
      storageId: second,
    });
    expect(result.alreadyArchived).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * Filtres et statistiques administrateur
 * ------------------------------------------------------------------ */

describe("facturation — filtres et statistiques administrateur", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createUser(t, { role: "admin", email: "admin-filtres@test.tn" });
  });

  it("agrège chiffre d'affaires et statuts", async () => {
    const a = await createUser(t, { email: "a@test.tn" });
    const b = await createUser(t, { email: "b@test.tn" });
    const c = await createUser(t, { email: "c@test.tn" });

    await subscribeConfirmed(t, a, { amount: 80 }); // payée
    await subscribe(t, b, { amount: 120, paymentMethod: "bank_transfer" }); // en attente
    const cSub = await subscribeConfirmed(t, c, { amount: 120 }); // payée puis remboursée
    const [cInvoice] = await myInvoices(t, c);
    await asUser(t, adminId).mutation(api.invoices.adminUpdateInvoiceStatus, {
      invoiceId: cInvoice._id,
      status: "refunded",
    });

    const { invoices, stats } = await asUser(t, adminId).query(
      api.invoices.adminListInvoices,
      {},
    );

    expect(invoices).toHaveLength(3);
    expect(stats.count).toBe(3);
    expect(stats.byStatus).toEqual({ paid: 1, pending: 1, cancelled: 0, refunded: 1 });
    // CA facturé = payées + en attente ; l'encaissé exclut le remboursement.
    expect(stats.billedTTC).toBe(200);
    expect(stats.collectedTTC).toBe(80);
    expect(stats.pendingTTC).toBe(120);
    expect(stats.refundedTTC).toBe(120);
    expect(cSub).toBeTruthy();
  });

  it("filtre par statut, profil, abonnement, recherche et période", async () => {
    const client = await createUser(t, { email: "client-pro@test.tn", name: "Karim" });
    const supplier = await createUser(t, {
      email: "fournisseur@test.tn",
      name: "Med Bâtiment",
      userRole: "supplier",
    });
    await subscribeConfirmed(t, client, { amount: 80, plan: "pro" });
    await subscribeConfirmed(t, supplier, { amount: 120, plan: "supplier" });

    const asAdmin = asUser(t, adminId);
    const all = await asAdmin.query(api.invoices.adminListInvoices, {});
    expect(all.invoices).toHaveLength(2);

    // Statut
    const pending = await asAdmin.query(api.invoices.adminListInvoices, { status: "pending" });
    expect(pending.invoices).toHaveLength(0);
    const paid = await asAdmin.query(api.invoices.adminListInvoices, { status: "paid" });
    expect(paid.invoices).toHaveLength(2);

    // Type de profil
    const supplierOnly = await asAdmin.query(api.invoices.adminListInvoices, {
      profileType: "supplier",
    });
    expect(supplierOnly.invoices).toHaveLength(1);
    expect(supplierOnly.invoices[0].profileType).toBe("supplier");
    expect(supplierOnly.stats.collectedTTC).toBe(120);

    // Abonnement
    const proOnly = await asAdmin.query(api.invoices.adminListInvoices, { plan: "pro" });
    expect(proOnly.invoices).toHaveLength(1);
    expect(proOnly.invoices[0].plan).toBe("pro");
    // « all » = aucun filtre (valeur envoyée par « tous les abonnements »).
    expect((await asAdmin.query(api.invoices.adminListInvoices, { plan: "all" })).invoices).toHaveLength(2);
    expect((await asAdmin.query(api.invoices.adminListInvoices, { status: "all" })).invoices).toHaveLength(2);
    expect(
      (await asAdmin.query(api.invoices.adminListInvoices, { profileType: "all" })).invoices,
    ).toHaveLength(2);

    // Recherche par numéro, nom et e-mail (accents ignorés)
    const byNumber = await asAdmin.query(api.invoices.adminListInvoices, {
      search: all.invoices[1].invoiceNumber,
    });
    expect(byNumber.invoices).toHaveLength(1);
    expect(
      (await asAdmin.query(api.invoices.adminListInvoices, { search: "med batiment" })).invoices,
    ).toHaveLength(1);
    expect(
      (await asAdmin.query(api.invoices.adminListInvoices, { search: "client-pro@" })).invoices,
    ).toHaveLength(1);

    // Période : aujourd'hui contient tout, une plage passée ne contient rien.
    const now = Date.now();
    expect(
      (
        await asAdmin.query(api.invoices.adminListInvoices, {
          from: startOfDay(now),
          to: endOfDay(now),
        })
      ).invoices,
    ).toHaveLength(2);
    expect(
      (
        await asAdmin.query(api.invoices.adminListInvoices, {
          from: now - 60 * DAY_MS,
          to: now - 30 * DAY_MS,
        })
      ).invoices,
    ).toHaveLength(0);
  });

  it("journalise le changement de statut d'une facture", async () => {
    const userId = await createUser(t, { email: "journal@test.tn" });
    await subscribe(t, userId);
    const [invoice] = await myInvoices(t, userId);

    await asUser(t, adminId).mutation(api.invoices.adminUpdateInvoiceStatus, {
      invoiceId: invoice._id,
      status: "cancelled",
    });

    const logs = await t.run(async (ctx) => ctx.db.query("adminLogs").collect());
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("update_invoice_status");
    expect(logs[0].details).toContain(invoice.invoiceNumber);
  });
});

/* ------------------------------------------------------------------ *
 * Fournisseur & Expert — mêmes factures, autres profils
 * ------------------------------------------------------------------ */

describe("facturation — abonnements Fournisseur et Expert", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createUser(t, { role: "admin", email: "admin-pro@test.tn" });
  });

  async function createSupplierProfile(
    userId: string,
    options: {
      paymentAmount?: number;
      subscriptionStatus?: "pending" | "inactive" | "active";
    } = {},
  ) {
    return t.run(async (ctx) =>
      ctx.db.insert("supplierProfiles", {
        userId: userId as never,
        companyName: "Med Bâtiment SARL",
        phone: "+216 20 000 000",
        email: "contact@medbat.tn",
        address: "Zone Industrielle, Sousse",
        specialties: [],
        regions: [],
        plan: "none",
        subscriptionStatus: options.subscriptionStatus ?? "pending",
        paymentMethod: "bank_transfer",
        paymentAmount: options.paymentAmount ?? 120,
        isVisible: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
  }

  it("émet une facture Fournisseur payée à l'approbation du paiement", async () => {
    const userId = await createUser(t, { email: "fournisseur-fact@test.tn", userRole: "supplier" });
    const profileId = await createSupplierProfile(userId);

    await asUser(t, adminId).mutation(api.supplierProfiles.adminApproveSupplierSubscription, {
      profileId,
    });

    const invoices = await myInvoices(t, userId);
    expect(invoices).toHaveLength(1);
    expect(invoices[0].profileType).toBe("supplier");
    expect(invoices[0].plan).toBe("supplier");
    expect(invoices[0].status).toBe("paid");
    expect(invoices[0].amountTTC).toBe(120);
    expect(invoices[0].paymentMethod).toBe("bank_transfer");
    // Le client facturé est la société fournisseur.
    expect(invoices[0].customerCompany).toBe("Med Bâtiment SARL");
    expect(invoices[0].customerAddress).toBe("Zone Industrielle, Sousse");
  });

  it("ne duplique pas la facture quand le reçu est vérifié après approbation", async () => {
    const userId = await createUser(t, { email: "fournisseur-idem@test.tn", userRole: "supplier" });
    const profileId = await createSupplierProfile(userId);

    const asAdmin = asUser(t, adminId);
    await asAdmin.mutation(api.supplierProfiles.adminApproveSupplierSubscription, { profileId });
    await asAdmin.mutation(api.supplierProfiles.adminVerifySupplierReceipt, {
      profileId,
      verified: true,
    });

    const invoices = await myInvoices(t, userId);
    expect(invoices).toHaveLength(1);
    expect(invoices[0].status).toBe("paid");
  });

  it("n'émet pas de facture pour un abonnement fournisseur gratuit", async () => {
    const userId = await createUser(t, { email: "fournisseur-gratuit@test.tn", userRole: "supplier" });
    const profileId = await createSupplierProfile(userId, { paymentAmount: 0 });

    await asUser(t, adminId).mutation(api.supplierProfiles.adminApproveSupplierSubscription, {
      profileId,
    });

    expect(await myInvoices(t, userId)).toHaveLength(0);
  });

  it("émet une facture en attente dès la demande, puis l'annule si la demande est refusée", async () => {
    const userId = await createUser(t, { email: "fournisseur-refus@test.tn", userRole: "supplier" });
    const profileId = await createSupplierProfile(userId, { subscriptionStatus: "inactive" });
    const asAdmin = asUser(t, adminId);

    // Demande de paiement : la facture apparaît immédiatement, en attente.
    await asUser(t, userId).mutation(api.supplierProfiles.requestSubscription, {
      paymentMethod: "bank_transfer",
    });
    const [pending] = await myInvoices(t, userId);
    expect(pending.status).toBe("pending");
    expect(pending.profileType).toBe("supplier");
    expect(pending.amountTTC).toBe(120);
    // Période mensuelle complète (30 jours), jamais une période vide.
    expect(pending.billingPeriodEnd - pending.billingPeriodStart).toBe(30 * DAY_MS);

    // Refus de la demande : la facture non payée est annulée, jamais supprimée.
    await asAdmin.mutation(api.supplierProfiles.adminRejectSupplierSubscription, { profileId });

    const invoices = await myInvoices(t, userId);
    expect(invoices).toHaveLength(1);
    expect(invoices[0].status).toBe("cancelled");
    expect(invoices[0].invoiceNumber).toBe(pending.invoiceNumber);
  });

  it("met à jour la facture du même terme à l'approbation (aucun doublon)", async () => {
    const userId = await createUser(t, { email: "fournisseur-terme@test.tn", userRole: "supplier" });
    const profileId = await createSupplierProfile(userId, { subscriptionStatus: "inactive" });

    await asUser(t, userId).mutation(api.supplierProfiles.requestSubscription, {
      paymentMethod: "d17",
    });
    const [pending] = await myInvoices(t, userId);

    await asUser(t, adminId).mutation(api.supplierProfiles.adminApproveSupplierSubscription, {
      profileId,
    });

    const invoices = await myInvoices(t, userId);
    expect(invoices).toHaveLength(1);
    expect(invoices[0].invoiceNumber).toBe(pending.invoiceNumber);
    expect(invoices[0].status).toBe("paid");
    expect(invoices[0].paymentDate).toBeGreaterThan(0);
  });

  it("génère une NOUVELLE facture au renouvellement fournisseur", async () => {
    const userId = await createUser(t, { email: "fournisseur-renouv@test.tn", userRole: "supplier" });
    const profileId = await createSupplierProfile(userId, { subscriptionStatus: "inactive" });
    const asAdmin = asUser(t, adminId);

    // Terme 1 : demande → approbation.
    await asUser(t, userId).mutation(api.supplierProfiles.requestSubscription, {
      paymentMethod: "d17",
    });
    await asAdmin.mutation(api.supplierProfiles.adminApproveSupplierSubscription, { profileId });
    const [first] = await myInvoices(t, userId);
    expect(first.status).toBe("paid");

    // Terme 2 (renouvellement) : nouvelle demande → nouvelle facture, puis
    // validation du paiement sur CE nouveau terme.
    await asUser(t, userId).mutation(api.supplierProfiles.requestSubscription, {
      paymentMethod: "d17",
    });
    const afterRenewalRequest = await myInvoices(t, userId);
    expect(afterRenewalRequest).toHaveLength(2);
    expect(afterRenewalRequest[0].status).toBe("pending");

    await asAdmin.mutation(api.supplierProfiles.adminApproveSupplierSubscription, { profileId });

    const invoices = await myInvoices(t, userId);
    expect(invoices).toHaveLength(2);
    expect(new Set(invoices.map((i) => i.invoiceNumber)).size).toBe(2);
    expect(invoices.every((i) => i.status === "paid")).toBe(true);
    // La première facture est intacte : ni remplacée, ni écrasée.
    expect(invoices.find((i) => i.invoiceNumber === first.invoiceNumber)?.amountTTC).toBe(120);
  });

  it("émet une facture Expert en attente puis payée à l'approbation", async () => {
    const userId = await createUser(t, { email: "expert-fact@test.tn", userRole: "expert" });
    const profileId = await t.run(async (ctx) =>
      ctx.db.insert("expertProfiles", {
        userId: userId as never,
        displayName: "Ing. Sonia Trabelsi",
        phone: "+216 21 111 111",
        email: "sonia@expert.tn",
        address: "Avenue Habib Bourguiba, Tunis",
        specialties: [],
        regions: [],
        plan: "none",
        subscriptionStatus: "pending",
        paymentMethod: "d17",
        // Valeur initiale du forfait Expert (`DEFAULT_PLAN_PRICES.expert`) :
        // le montant facturé est celui affiché par l'administration (120 TND).
        paymentAmount: 120,
        isVisible: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    // Demande de paiement → facture « en attente ».
    await asUser(t, userId).mutation(api.expertProfiles.requestSubscription, {
      paymentMethod: "bank_transfer",
    });
    const [pending] = await myInvoices(t, userId);
    expect(pending.status).toBe("pending");
    expect(pending.profileType).toBe("expert");

    // Approbation → la MÊME facture passe en « payée ».
    await asUser(t, adminId).mutation(api.expertProfiles.adminApproveExpertSubscription, {
      profileId,
    });

    const invoices = await myInvoices(t, userId);
    expect(invoices).toHaveLength(1);
    expect(invoices[0].invoiceNumber).toBe(pending.invoiceNumber);
    expect(invoices[0].profileType).toBe("expert");
    expect(invoices[0].plan).toBe("expert");
    // 120 TND = valeur initiale du forfait Expert, identique à celle affichée
    // dans l'administration (l'ancien repli 150 TND n'était affiché nulle part).
    expect(invoices[0].amountTTC).toBe(120);
    expect(invoices[0].paymentMethod).toBe("bank_transfer");
    expect(invoices[0].status).toBe("paid");
    expect(invoices[0].customerName).toBe("Ing. Sonia Trabelsi");
  });
});

/* ------------------------------------------------------------------ *
 * FACTURE PDF JOINTE AUX E-MAILS
 *
 * Un abonnement ACTIVÉ et un PAIEMENT CONFIRMÉ expédient la facture au client
 * en pièce jointe. Le suivi est vérifié ici sur l'historique des e-mails :
 * chaque envoi porte l'identifiant de la facture enregistrée, c'est-à-dire du
 * document PDF réellement joint (produit côté serveur).
 * ------------------------------------------------------------------ */

describe("facturation — facture jointe aux e-mails", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: string;

  beforeEach(async () => {
    // Les notifications e-mail passent par le scheduler Convex : les tests les
    // exécutent explicitement avec des minuteries simulées.
    vi.useFakeTimers();
    t = convexTest(schema, modules);
    adminId = await createUser(t, { role: "admin", email: "admin-mail@test.tn" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Exécute les envois d'e-mails programmés (activation, paiement confirmé). */
  const flushEmails = () => t.finishAllScheduledFunctions(vi.runAllTimers);

  /** Notifications activées : `createUser` les coupe pour éviter tout envoi. */
  async function allowEmails(userId: string) {
    await t.run(async (ctx) => ctx.db.patch(userId as never, { emailNotifications: true }));
  }

  async function emailRows() {
    return t.run(async (ctx) => ctx.db.query("emailHistory").collect());
  }

  async function invoiceRows() {
    return t.run(async (ctx) => ctx.db.query("invoices").collect());
  }

  it("joint la facture du forfait activé à l'e-mail d'activation", async () => {
    const userId = await createUser(t, { name: "Amine Ben Salah", email: "actif@test.tn" });
    await allowEmails(userId);

    await subscribeConfirmed(t, userId, { paymentMethod: "d17", amount: 80 });
    await flushEmails();

    const [invoice] = await invoiceRows();
    const rows = await emailRows();

    expect(rows).toHaveLength(1);
    expect(rows[0].templateKey).toBe("subscription_activated");
    expect(rows[0].to).toBe("actif@test.tn");
    // La pièce jointe est la facture RÉELLEMENT enregistrée : le même document
    // que celui téléchargé depuis « Mes factures ».
    expect(JSON.parse(rows[0].payloadJson!).invoiceId).toBe(invoice._id);
    expect(invoice.status).toBe("paid");
  });

  it("n'envoie la facture qu'à la confirmation du paiement, avec son numéro réel", async () => {
    const userId = await createUser(t, { email: "attente@test.tn" });
    await allowEmails(userId);

    // Virement en attente de validation : aucune facture n'est expédiée.
    await subscribe(t, userId, { paymentMethod: "bank_transfer", amount: 120 });
    await flushEmails();
    expect(await emailRows()).toHaveLength(0);

    const sub = await asUser(t, userId).query(api.subscriptions.getMySubscription);
    await asUser(t, adminId).mutation(api.subscriptions.markReceiptVerified, {
      subscriptionId: sub!._id,
      verified: true,
    });
    await flushEmails();

    const [invoice] = await invoiceRows();
    const rows = await emailRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].templateKey).toBe("payment_confirmed");

    const payload = JSON.parse(rows[0].payloadJson!);
    expect(payload.invoiceId).toBe(invoice._id);
    // Le numéro affiché dans l'e-mail est celui de la facture jointe — plus
    // jamais un identifiant technique.
    expect(payload.vars.numeroFacture).toBe(invoice.invoiceNumber);
    expect(invoice.invoiceNumber).toBe(formatInvoiceNumber(CURRENT_YEAR, 1));
  });

  it("joint la facture fournisseur à l'e-mail d'activation du compte", async () => {
    const userId = await createUser(t, { email: "fourn-mail@test.tn", userRole: "supplier" });
    await allowEmails(userId);
    const profileId = await t.run(async (ctx) =>
      ctx.db.insert("supplierProfiles", {
        userId: userId as never,
        companyName: "Med Bâtiment SARL",
        phone: "+216 20 000 000",
        email: "contact@medbat.tn",
        address: "Zone Industrielle, Sousse",
        specialties: [],
        regions: [],
        plan: "none",
        subscriptionStatus: "pending",
        paymentMethod: "bank_transfer",
        paymentAmount: 120,
        isVisible: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    await asUser(t, adminId).mutation(api.supplierProfiles.adminApproveSupplierSubscription, {
      profileId,
    });
    await flushEmails();

    const [invoice] = await invoiceRows();
    const rows = await emailRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].templateKey).toBe("subscription_activated");
    expect(JSON.parse(rows[0].payloadJson!).invoiceId).toBe(invoice._id);
    expect(invoice.profileType).toBe("supplier");
    expect(invoice.status).toBe("paid");
  });
});
