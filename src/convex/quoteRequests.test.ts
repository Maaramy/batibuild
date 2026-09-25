/// <reference types="vite/client" />

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// Test Helpers
// ============================================================================

async function createTestUser(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{
    role: string;
    name: string;
    email: string;
    phone: string;
  }> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? "test@test.com",
      role: overrides.role ?? "user",
      status: "active",
      subscriptionPlan: "free",
      image: undefined,
      company: undefined,
      phone: overrides.phone ?? "+216 99 000 000",
      subscriptionEndDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

async function createTestSupplierProfile(
  t: ReturnType<typeof convexTest>,
  userId: string,
  overrides: Partial<{
    subscriptionStatus: string;
    isVisible: boolean;
    companyName: string;
  }> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("supplierProfiles", {
      userId: userId as any,
      companyName: overrides.companyName ?? "Test Supplier",
      phone: "+216 99 111 111",
      email: "supplier@test.com",
      address: "Tunis, Tunisia",
      specialties: ["ciment", "bois"],
      regions: ["tunis"],
      plan: "trial",
      subscriptionStatus: (overrides.subscriptionStatus as any) ?? "active",
      isVisible: overrides.isVisible ?? true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

// ============================================================================
// create — mutation
// ============================================================================

describe("quoteRequests.create", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("rejects if not authenticated", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);

    // Call without identity (unauthenticated)
    await expect(
      t.mutation(api.quoteRequests.create, {
        supplierId: supplierId as any,
        motif: "comparaison_prix",
        category: "ciment",
        materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
      }),
    ).rejects.toThrow("Utilisateur non connecté");
  });

  it("rejects if supplier does not exist", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);
    const supplierUserId = await createTestUser(t, { email: "supplier@test.com" });
    const supplierId = await createTestSupplierProfile(t, supplierUserId);

    // Delete the supplier profile
    await t.run(async (ctx) => ctx.db.delete(supplierId));

    await expect(
      userT.mutation(api.quoteRequests.create, {
        supplierId: supplierId as any,
        motif: "comparaison_prix",
        category: "ciment",
        materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
      }),
    ).rejects.toThrow("Fournisseur introuvable");
  });

  it("rejects if supplier subscription is inactive", async () => {
    const userId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, userId, {
      subscriptionStatus: "inactive",
    });
    const buyerId = await createTestUser(t, {
      name: "Buyer",
      email: "buyer@test.com",
    });
    const buyerT = asUser(t, buyerId);

    await expect(
      buyerT.mutation(api.quoteRequests.create, {
        supplierId: supplierId as any,
        motif: "comparaison_prix",
        category: "ciment",
        materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
      }),
    ).rejects.toThrow("Ce fournisseur n'est pas actif");
  });

  it("creates a quote request for an active supplier", async () => {
    const supplierUserId = await createTestUser(t, {
      name: "Supplier",
      email: "supplier@test.com",
    });
    const supplierId = await createTestSupplierProfile(t, supplierUserId);

    const buyerId = await createTestUser(t, {
      name: "Buyer",
      email: "buyer@test.com",
    });
    const buyerT = asUser(t, buyerId);

    const quoteId = await buyerT.mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      motif: "comparaison_prix",
      category: "ciment",
      materials: [
        { name: "Ciment gris", quantity: 20, unit: "sac" },
        { name: "Sable", quantity: 5, unit: "m3" },
      ],
    });

    expect(quoteId).toBeTruthy();

    const quote = await t.run(async (ctx) => ctx.db.get(quoteId));
    expect(quote).toBeTruthy();
    expect(quote!.userId).toBe(buyerId);
    expect(quote!.supplierId).toBe(supplierId);
    expect(quote!.category).toBe("ciment");
    expect(quote!.materials).toHaveLength(2);
    expect(quote!.motif).toBe("comparaison_prix");
    expect(quote!.status).toBe("pending");
    expect(quote!.userEmail).toBe("buyer@test.com");
  });

  it("creates a quote request for a trial supplier", async () => {
    const supplierUserId = await createTestUser(t, {
      name: "Trial Supplier",
      email: "trial@test.com",
    });
    const supplierId = await createTestSupplierProfile(t, supplierUserId, {
      subscriptionStatus: "trial",
    });

    const buyerId = await createTestUser(t, {
      name: "Buyer",
      email: "buyer@test.com",
    });
    const buyerT = asUser(t, buyerId);

    const quoteId = await buyerT.mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      motif: "comparaison_prix",
      category: "bois",
      materials: [{ name: "Planche", quantity: 10, unit: "piece" }],
    });

    expect(quoteId).toBeTruthy();
  });
});

// ============================================================================
// updateStatus — mutation
// ============================================================================

describe("quoteRequests.updateStatus", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("rejects if not authenticated", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const buyerId = await createTestUser(t, { email: "buyer@test.com" });
    const buyerT = asUser(t, buyerId);

    const quoteId = await buyerT.mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      motif: "comparaison_prix",
      category: "ciment",
      materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
    });

    // Call without identity
    await expect(
      t.mutation(api.quoteRequests.updateStatus, {
        quoteRequestId: quoteId,
        status: "responded",
      }),
    ).rejects.toThrow("Utilisateur non connecté");
  });

  it("allows the quote creator to update status", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const buyerId = await createTestUser(t, {
      name: "Buyer",
      email: "buyer@test.com",
    });
    const buyerT = asUser(t, buyerId);

    const quoteId = await buyerT.mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      motif: "comparaison_prix",
      category: "ciment",
      materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
    });

    await buyerT.mutation(api.quoteRequests.updateStatus, {
      quoteRequestId: quoteId,
      status: "closed",
    });

    const quote = await t.run(async (ctx) => ctx.db.get(quoteId));
    expect(quote!.status).toBe("closed");
  });

  it("rejects unauthorized user from updating", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const buyerId = await createTestUser(t, {
      name: "Buyer",
      email: "buyer@test.com",
    });
    const buyerT = asUser(t, buyerId);

    const quoteId = await buyerT.mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      motif: "comparaison_prix",
      category: "ciment",
      materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
    });

    const thirdUserId = await createTestUser(t, {
      name: "Third Party",
      email: "third@test.com",
    });
    const thirdT = asUser(t, thirdUserId);

    await expect(
      thirdT.mutation(api.quoteRequests.updateStatus, {
        quoteRequestId: quoteId,
        status: "responded",
      }),
    ).rejects.toThrow("Non autorisé");
  });
});

// ============================================================================
// getBySupplier — query
// ============================================================================

describe("quoteRequests.getBySupplier", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns empty if not authenticated", async () => {
    const result = await t.query(api.quoteRequests.getBySupplier, {});
    expect(result).toEqual([]);
  });

  it("returns quotes for the current supplier", async () => {
    const supplierUserId = await createTestUser(t, {
      name: "Supplier",
      email: "supplier@test.com",
    });
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const supplierT = asUser(t, supplierUserId);

    const buyerId = await createTestUser(t, {
      name: "Buyer",
      email: "buyer@test.com",
    });
    const buyerT = asUser(t, buyerId);

    await buyerT.mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      motif: "comparaison_prix",
      category: "ciment",
      materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
    });

    const quotes = await supplierT.query(api.quoteRequests.getBySupplier, {});
    expect(quotes).toHaveLength(1);
    expect(quotes[0].supplierId).toBe(supplierId);
  });

  it("returns empty array for a user without supplier profile", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    const quotes = await userT.query(api.quoteRequests.getBySupplier, {});
    expect(quotes).toEqual([]);
  });
});

// ============================================================================
// getMyRequests — query
// ============================================================================

describe("quoteRequests.getMyRequests", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns quotes created by the current user", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);

    const buyerId = await createTestUser(t, {
      name: "Buyer",
      email: "buyer@test.com",
    });
    const buyerT = asUser(t, buyerId);

    await buyerT.mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      motif: "comparaison_prix",
      category: "bois",
      materials: [{ name: "Bois", quantity: 5, unit: "planche" }],
    });

    const requests = await buyerT.query(api.quoteRequests.getMyRequests, {});
    expect(requests).toHaveLength(1);
    expect(requests[0].userId).toBe(buyerId);
  });
});

// ============================================================================
// pendingCount — query
// ============================================================================

describe("quoteRequests.pendingCount", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("counts pending quotes for the supplier", async () => {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const supplierT = asUser(t, supplierUserId);

    const buyerId = await createTestUser(t, {
      name: "Buyer",
      email: "buyer@test.com",
    });
    const buyerT = asUser(t, buyerId);

    // Create 3 pending quotes
    for (let i = 0; i < 3; i++) {
      await buyerT.mutation(api.quoteRequests.create, {
        supplierId: supplierId as any,
        motif: "comparaison_prix",
        category: "ciment",
        materials: [{ name: "Item", quantity: 1, unit: "kg" }],
      });
    }

    const count = await supplierT.query(api.quoteRequests.pendingCount, {});
    expect(count).toBe(3);
  });

  it("returns 0 for a user without supplier profile", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    const count = await userT.query(api.quoteRequests.pendingCount, {});
    expect(count).toBe(0);
  });
});

// ============================================================================
// unreadCount & markAllRead — badge de notification
// ============================================================================

describe("quoteRequests.unreadCount / markAllRead", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function seedQuotes(count: number) {
    const supplierUserId = await createTestUser(t);
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const buyerId = await createTestUser(t, { name: "Buyer", email: "buyer@test.com" });
    const buyerT = asUser(t, buyerId);
    const supplierT = asUser(t, supplierUserId);

    for (let i = 0; i < count; i++) {
      await buyerT.mutation(api.quoteRequests.create, {
        supplierId: supplierId as any,
        motif: "comparaison_prix",
        category: "ciment",
        materials: [{ name: "Item", quantity: 1, unit: "kg" }],
      });
    }
    return { supplierT };
  }

  it("counts every new request as unread before consultation", async () => {
    const { supplierT } = await seedQuotes(2);
    const count = await supplierT.query(api.quoteRequests.unreadCount, {});
    expect(count).toBe(2);
  });

  it("markAllRead clears the unread badge once consulted", async () => {
    const { supplierT } = await seedQuotes(2);
    await supplierT.mutation(api.quoteRequests.markAllRead, {});

    const count = await supplierT.query(api.quoteRequests.unreadCount, {});
    expect(count).toBe(0);

    // All requests now carry a readAt timestamp
    const requests = await supplierT.query(api.quoteRequests.getBySupplier, {});
    expect(requests).toHaveLength(2);
    for (const r of requests) {
      expect(typeof r.readAt).toBe("number");
    }
  });

  it("markAllRead is idempotent and only stamps unread requests", async () => {
    const { supplierT } = await seedQuotes(1);
    await supplierT.mutation(api.quoteRequests.markAllRead, {});
    const first = await supplierT.query(api.quoteRequests.getBySupplier, {});
    const firstReadAt = first[0].readAt;

    // A second run must not overwrite the read timestamp
    await supplierT.mutation(api.quoteRequests.markAllRead, {});
    const second = await supplierT.query(api.quoteRequests.getBySupplier, {});
    expect(second[0].readAt).toBe(firstReadAt);
  });

  it("returns 0 for a user without supplier profile", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    const count = await userT.query(api.quoteRequests.unreadCount, {});
    expect(count).toBe(0);
  });
});

// ============================================================================
// Notifications & statuts — la messagerie est l'unique point de gestion
// ============================================================================

describe("quoteRequests — notifications de la messagerie", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function seed() {
    const supplierUserId = await createTestUser(t, {
      name: "Supplier",
      email: "supplier@test.com",
    });
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const buyerId = await createTestUser(t, { name: "Buyer", email: "buyer@test.com" });
    const buyerT = asUser(t, buyerId);
    const supplierT = asUser(t, supplierUserId);
    return { supplierUserId, supplierId, buyerId, buyerT, supplierT };
  }

  it("notifie le fournisseur dès la création d'une demande (lien messagerie)", async () => {
    const { supplierUserId, supplierId, buyerT } = await seed();

    await buyerT.mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      motif: "comparaison_prix",
      projectName: "Villa Sousse",
      category: "ciment",
      materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
    });

    const notifications = await t.run(async (ctx) =>
      ctx.db.query("notifications").collect(),
    );
    expect(notifications).toHaveLength(1);
    expect(notifications[0].userId).toBe(supplierUserId);
    expect(notifications[0].type).toBe("quote_request");
    expect(notifications[0].read).toBe(false);
    expect(notifications[0].link).toContain("tab=requests");
  });

  it("le fournisseur peut refuser une demande et le client est notifié", async () => {
    const { supplierId, buyerId, buyerT, supplierT } = await seed();
    const quoteId = await buyerT.mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      motif: "comparaison_prix",
      category: "ciment",
      materials: [{ name: "Ciment", quantity: 1, unit: "sac" }],
    });

    await supplierT.mutation(api.quoteRequests.updateStatus, {
      quoteRequestId: quoteId,
      status: "refused",
    });

    const quote = await t.run(async (ctx) => ctx.db.get(quoteId));
    expect(quote!.status).toBe("refused");

    const notifications = await t.run(async (ctx) =>
      ctx.db.query("notifications").collect(),
    );
    const clientNotifications = notifications.filter((n) => n.userId === buyerId);
    expect(clientNotifications).toHaveLength(1);
    expect(clientNotifications[0].type).toBe("quote_update");
    expect(clientNotifications[0].link).toContain("tab=quotes");
  });

  it("le client peut accepter un devis et le fournisseur est notifié", async () => {
    const { supplierUserId, supplierId, buyerT } = await seed();
    const quoteId = await buyerT.mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      motif: "comparaison_prix",
      category: "ciment",
      materials: [{ name: "Ciment", quantity: 1, unit: "sac" }],
    });
    // Le fournisseur a déjà répondu (statut « Devis envoyé »).
    await t.run(async (ctx) => ctx.db.patch(quoteId, { status: "responded" }));

    await buyerT.mutation(api.quoteRequests.updateStatus, {
      quoteRequestId: quoteId,
      status: "accepted",
    });

    const notifications = await t.run(async (ctx) =>
      ctx.db.query("notifications").collect(),
    );
    const supplierNotifications = notifications.filter(
      (n) => n.userId === supplierUserId && n.type === "quote_update",
    );
    expect(supplierNotifications).toHaveLength(1);
    expect(supplierNotifications[0].title).toBe("Devis accepté");
  });
});

// ============================================================================
// E-mail automatique au fournisseur (modèle « Demande de devis »)
// ============================================================================

/** Envois d'e-mails enregistrés par le moteur (config SMTP absente en test). */
async function emailHistoryRows(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => ctx.db.query("emailHistory").collect());
}

describe("quoteRequests — e-mail automatique au fournisseur", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    // Les notifications e-mail passent par le scheduler Convex : les tests les
    // exécutent explicitement avec des minuteries simulées.
    vi.useFakeTimers();
    t = convexTest(schema, modules);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const flushEmails = () => t.finishAllScheduledFunctions(vi.runAllTimers);

  async function seed() {
    const supplierUserId = await createTestUser(t, {
      name: "Supplier",
      email: "supplier-user@test.com",
    });
    const supplierId = await createTestSupplierProfile(t, supplierUserId);
    const buyerId = await createTestUser(t, {
      name: "Ahmed Ben Salah",
      email: "ahmed@test.com",
      phone: "+216 98 123 456",
    });
    return { supplierUserId, supplierId, buyerId };
  }

  it("envoie le modèle « Demande de devis » au fournisseur dès la création", async () => {
    const { supplierId, buyerId } = await seed();

    const quoteId = await asUser(t, buyerId).mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      motif: "comparaison_prix",
      projectName: "Villa Sousse",
      category: "ciment",
      materials: [{ name: "Ciment", quantity: 10, unit: "sac" }],
    });

    await flushEmails();

    const history = await emailHistoryRows(t);
    expect(history).toHaveLength(1);
    // L'e-mail part vers l'adresse du profil fournisseur.
    expect(history[0].to).toBe("supplier@test.com");
    expect(history[0].templateKey).toBe("quote_request_sent");
    expect(history[0].dedupeKey).toBe(`quote_request_sent:${quoteId}`);

    // Variables transmises au modèle personnalisable (Espace admin → E-mails).
    const vars = JSON.parse(history[0].payloadJson!).vars;
    expect(vars.prenom).toBe("Ahmed");
    expect(vars.nom).toBe("Ben Salah");
    expect(vars.entreprise).toBe("Test Supplier");
    expect(vars.nomProjet).toBe("Villa Sousse");
    expect(vars.typeProjet).toBe("ciment");
    expect(vars.detailsDemande).toContain("Comparaison des prix");
    expect(vars.detailsDemande).toContain("Ciment × 10 sac");
    expect(vars.detailsDemande).toContain("+216 98 123 456");
    // Le lien pointe directement sur la conversation, pas sur l'accueil.
    expect(vars.lienConnexion).toBe(
      `/dashboard/messages?tab=requests&request=${quoteId}`,
    );
  });

  it("respecte le refus de notifications e-mail du fournisseur", async () => {
    const { supplierUserId, supplierId, buyerId } = await seed();
    await t.run(async (ctx) =>
      ctx.db.patch(supplierUserId as any, { emailNotifications: false }),
    );

    await asUser(t, buyerId).mutation(api.quoteRequests.create, {
      supplierId: supplierId as any,
      motif: "comparaison_prix",
      category: "ciment",
      materials: [{ name: "Ciment", quantity: 1, unit: "sac" }],
    });

    await flushEmails();

    expect(await emailHistoryRows(t)).toHaveLength(0);
  });
});
