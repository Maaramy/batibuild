/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";

const modules = import.meta.glob("./**/*.*s");

async function createTestUser(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{
    role: string;
    name: string;
    email: string;
  }> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? "test@test.com",
      role: overrides.role ?? "user",
      status: "active",
      subscriptionPlan: "free",
      company: "Ma Société",
      phone: "+216 99 000 000",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

function validAdForm() {
  return {
    companyName: "Société Annonce SARL",
    requesterName: "Mohamed Demandeur",
    phone: "+216 20 111 222",
    email: "contact@societe.tn",
    adTitle: "Vente de ciment — prix promotionnel",
    adDescription: "Ciment disponible immédiatement, livraison partout en Tunisie.",
    adType: "Fournisseur de matériaux",
    publicationDurationDays: 30,
  };
}

describe("support.createAdRequestTicket", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("crée une demande d'annonce au stade « nouvelle », jamais publiée", async () => {
    const userId = await createTestUser(t, { name: "Mohamed", email: "m@test.com" });
    const adminId = await createTestUser(t, {
      role: "admin",
      name: "Admin",
      email: "admin@test.com",
    });

    const ticketId = await asUser(t, userId).mutation(api.support.createAdRequestTicket, {
      form: validAdForm(),
    });

    const ticket = await t.run(async (ctx) => ctx.db.get(ticketId));
    expect(ticket).not.toBeNull();
    expect(ticket!.category).toBe("ad_request");
    expect(ticket!.ticketNumber).toMatch(/^SUP-\d{6}$/);
    expect(ticket!.status).toBe("open");
    expect(ticket!.adRequest).toBeDefined();
    expect(ticket!.adRequest!.stage).toBe("nouvelle");
    expect(ticket!.adRequest!.paymentStatus).toBe("pending");
    expect(ticket!.adRequest!.announcementId).toBeUndefined();
    expect(ticket!.subject).toContain("Société Annonce SARL");

    // Visible côté admin avec la catégorie clairement identifiée
    const adminTickets = await asUser(t, adminId).query(api.support.adminGetTickets, {});
    expect(adminTickets.length).toBe(1);
    expect(adminTickets[0]!.category).toBe("ad_request");
    expect(adminTickets[0]!.adRequest!.companyName).toBe("Société Annonce SARL");

    // Notification envoyée aux admins
    const notifs = await t.run(async (ctx) => ctx.db.query("notifications").collect());
    expect(notifs.some((n) => n.title.includes("demande d'annonce"))).toBe(true);

    // Visible côté utilisateur
    const myTickets = await asUser(t, userId).query(api.support.getMyTickets, {});
    expect(myTickets.length).toBe(1);
    expect(myTickets[0]!.adRequestFiles).toBeDefined();
  });

  it("rejette un formulaire incomplet", async () => {
    const userId = await createTestUser(t);
    const form = validAdForm();
    const cases = [
      { ...form, companyName: "  " },
      { ...form, requesterName: "" },
      { ...form, phone: "" },
      { ...form, email: "pas-un-email" },
      { ...form, adTitle: "" },
      { ...form, adDescription: "" },
      { ...form, adType: "" },
      { ...form, publicationDurationDays: 0 },
    ];
    for (const f of cases) {
      await expect(
        asUser(t, userId).mutation(api.support.createAdRequestTicket, { form: f }),
      ).rejects.toThrow();
    }
  });

  it("exige une authentification", async () => {
    await expect(
      t.mutation(api.support.createAdRequestTicket, { form: validAdForm() }),
    ).rejects.toThrow("Authentification requise");
  });
});

describe("support.adminUpdateAdRequest", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: Id<"users">;
  let adminId: Id<"users">;
  let ticketId: Id<"supportTickets">;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createTestUser(t, { name: "Mohamed", email: "m@test.com" });
    adminId = await createTestUser(t, { role: "admin", name: "Admin", email: "admin@test.com" });
    ticketId = await asUser(t, userId).mutation(api.support.createAdRequestTicket, {
      form: validAdForm(),
    });
  });

  it("définit le prix et la durée finale", async () => {
    await asUser(t, adminId).mutation(api.support.adminUpdateAdRequest, {
      ticketId,
      price: 150,
      finalDurationDays: 45,
    });
    const ticket = await t.run(async (ctx) => ctx.db.get(ticketId));
    expect(ticket!.adRequest!.price).toBe(150);
    expect(ticket!.adRequest!.finalDurationDays).toBe(45);
  });

  it("passe par tous les stades : nouvelle → en cours → acceptée", async () => {
    await asUser(t, adminId).mutation(api.support.adminUpdateAdRequest, {
      ticketId,
      stage: "en_cours",
    });
    let ticket = await t.run(async (ctx) => ctx.db.get(ticketId));
    expect(ticket!.adRequest!.stage).toBe("en_cours");

    await asUser(t, adminId).mutation(api.support.adminUpdateAdRequest, {
      ticketId,
      stage: "acceptee",
    });
    ticket = await t.run(async (ctx) => ctx.db.get(ticketId));
    expect(ticket!.adRequest!.stage).toBe("acceptee");
    expect(ticket!.adRequest!.decidedAt).toBeDefined();
  });

  it("refuse l'édition par un non-admin", async () => {
    await expect(
      asUser(t, userId).mutation(api.support.adminUpdateAdRequest, {
        ticketId,
        stage: "acceptee",
      }),
    ).rejects.toThrow("Accès réservé à l'équipe support");
  });

  it("bloque la publication sans demande d'annonce", async () => {
    await expect(
      asUser(t, adminId).mutation(api.support.adminSetAdPaymentStatus, {
        ticketId,
        paymentStatus: "confirmed",
      }),
    ).rejects.toThrow("La demande doit être acceptée avant de gérer le paiement");
  });
});

describe("workflow complet : demande → validation → prix → paiement → publication", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function setupAdFlow() {
    const userId = await createTestUser(t, { name: "Mohamed", email: "m@test.com" });
    const adminId = await createTestUser(t, { role: "admin", name: "Admin", email: "admin@test.com" });
    const ticketId = await asUser(t, userId).mutation(api.support.createAdRequestTicket, {
      form: validAdForm(),
    });
    return { userId, adminId, ticketId };
  }

  it("la publication est refusée tant que le paiement n'est pas confirmé", async () => {
    const { userId, adminId, ticketId } = await setupAdFlow();

    await asUser(t, adminId).mutation(api.support.adminUpdateAdRequest, {
      ticketId,
      stage: "acceptee",
      price: 150,
    });

    // Publication refusée avant paiement
    await expect(
      asUser(t, adminId).mutation(api.support.adminPublishAdRequest, { ticketId }),
    ).rejects.toThrow("Le paiement doit être confirmé avant publication");

    // Le paiement ne peut pas être confirmé par l'utilisateur lui-même
    await expect(
      asUser(t, userId).mutation(api.support.adminSetAdPaymentStatus, {
        ticketId,
        paymentStatus: "confirmed",
      }),
    ).rejects.toThrow("Accès réservé à l'équipe support");

    // Preuve de paiement refusée si le prix n'est pas défini ? Non — mais le
    // refus de publication reste bloqué avant confirmation admin.
    const ticket = await t.run(async (ctx) => ctx.db.get(ticketId));
    expect(ticket!.adRequest!.announcementId).toBeUndefined();
  });

  it("l'utilisateur ne peut envoyer une preuve qu'après acceptation", async () => {
    const { userId, adminId, ticketId } = await setupAdFlow();

    // Un vrai storage id, inséré pour le test
    const proofId = await t.run(async (ctx) => ctx.storage.store(new Blob(["pdf"])));

    // Refusé au stade « nouvelle »
    await expect(
      asUser(t, userId).mutation(api.support.uploadAdPaymentProof, {
        ticketId,
        storageId: proofId,
      }),
    ).rejects.toThrow("La demande doit être acceptée avant d'envoyer un paiement");

    await asUser(t, adminId).mutation(api.support.adminUpdateAdRequest, {
      ticketId,
      stage: "acceptee",
      price: 100,
    });

    // Maintenant autorisé
    await asUser(t, userId).mutation(api.support.uploadAdPaymentProof, {
      ticketId,
      storageId: proofId,
      fileName: "recu.pdf",
    });
    const ticket = await t.run(async (ctx) => ctx.db.get(ticketId));
    expect(ticket!.adRequest!.paymentStatus).toBe("proof_uploaded");
  });

  it("publie l'annonce après paiement confirmé et crée une annonce type « annonce »", async () => {
    const { userId, adminId, ticketId } = await setupAdFlow();

    await asUser(t, adminId).mutation(api.support.adminUpdateAdRequest, {
      ticketId,
      stage: "acceptee",
      price: 150,
      finalDurationDays: 60,
    });
    await asUser(t, adminId).mutation(api.support.adminSetAdPaymentStatus, {
      ticketId,
      paymentStatus: "confirmed",
    });

    const announcementId = await asUser(t, adminId).mutation(
      api.support.adminPublishAdRequest,
      { ticketId, externalUrl: "https://societe.tn" },
    );
    expect(announcementId).toBeTruthy();

    const announcement = await t.run(async (ctx) => ctx.db.get(announcementId));
    expect(announcement).not.toBeNull();
    expect(announcement!.type).toBe("annonce");
    expect(announcement!.status).toBe("published");
    expect(announcement!.isActive).toBe(true);
    expect(announcement!.targetType).toBe("all");
    expect(announcement!.authorName).toBe("Société Annonce SARL");
    expect(announcement!.externalUrl).toBe("https://societe.tn");
    // Durée : 60 jours à partir de maintenant (±1s)
    const durationDays = Math.round(
      (announcement!.endDate! - announcement!.startDate!) / (24 * 60 * 60 * 1000),
    );
    expect(durationDays).toBe(60);

    const ticket = await t.run(async (ctx) => ctx.db.get(ticketId));
    expect(ticket!.adRequest!.announcementId).toBe(announcementId);
    expect(ticket!.adRequest!.stage).toBe("terminee");
    expect(ticket!.adRequest!.publishedAt).toBeDefined();
    expect(ticket!.status).toBe("resolved");
  });

  it("interdit la double publication", async () => {
    const { adminId, ticketId } = await setupAdFlow();
    await asUser(t, adminId).mutation(api.support.adminUpdateAdRequest, {
      ticketId,
      stage: "acceptee",
    });
    await asUser(t, adminId).mutation(api.support.adminSetAdPaymentStatus, {
      ticketId,
      paymentStatus: "not_required",
    });
    await asUser(t, adminId).mutation(api.support.adminPublishAdRequest, { ticketId });
    await expect(
      asUser(t, adminId).mutation(api.support.adminPublishAdRequest, { ticketId }),
    ).rejects.toThrow("Cette annonce est déjà publiée");
  });

  it("refuse une demande jamais publiée automatiquement", async () => {
    const { userId, ticketId } = await setupAdFlow();
    // La demande seule ne crée jamais d'annonce
    const ticket = await t.run(async (ctx) => ctx.db.get(ticketId));
    expect(ticket!.adRequest!.announcementId).toBeUndefined();
    void userId;
  });

  it("le changement de prix après confirmation réinitialise le paiement", async () => {
    const { adminId, ticketId } = await setupAdFlow();
    await asUser(t, adminId).mutation(api.support.adminUpdateAdRequest, {
      ticketId,
      stage: "acceptee",
      price: 100,
    });
    await asUser(t, adminId).mutation(api.support.adminSetAdPaymentStatus, {
      ticketId,
      paymentStatus: "confirmed",
    });
    await asUser(t, adminId).mutation(api.support.adminUpdateAdRequest, {
      ticketId,
      price: 200,
    });
    const ticket = await t.run(async (ctx) => ctx.db.get(ticketId));
    expect(ticket!.adRequest!.price).toBe(200);
    expect(ticket!.adRequest!.paymentStatus).toBe("pending");
  });
});
