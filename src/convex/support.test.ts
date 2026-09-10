/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
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
      phone: "+216 99 000 000",
      subscriptionEndDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

// ============================================================================
// createTicket — mutation
// ============================================================================

describe("support.createTicket", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("rejects if not authenticated", async () => {
    await expect(
      t.mutation(api.support.createTicket, {
        subject: "Problème",
        category: "technical",
        priority: "normal",
        message: "Message",
      }),
    ).rejects.toThrow("Authentification requise");
  });

  it("creates a ticket with a sequential number and notifies admins", async () => {
    const userId = await createTestUser(t, { name: "Mohamed", email: "mohamed@test.com" });
    const adminId = await createTestUser(t, { role: "admin", name: "Admin", email: "admin@test.com" });

    const ticketId = await asUser(t, userId).mutation(api.support.createTicket, {
      subject: "Problème de connexion",
      category: "technical",
      priority: "high",
      message: "Je ne peux pas me connecter",
    });

    const ticket = await t.run(async (ctx) => ctx.db.get(ticketId));
    expect(ticket).not.toBeNull();
    expect(ticket!.ticketNumber).toMatch(/^SUP-\d{6}$/);
    expect(ticket!.status).toBe("open");
    expect(ticket!.adminUnreadCount).toBe(1);
    expect(ticket!.userUnreadCount).toBe(0);

    // Visible côté admin + compteur
    const adminTickets = await asUser(t, adminId).query(api.support.adminGetTickets, {});
    expect(adminTickets.length).toBe(1);
    expect(adminTickets[0]!.ticketNumber).toBe(ticket!.ticketNumber);
    expect(adminTickets[0]!.userName).toBe("Mohamed");
    expect(adminTickets[0]!.userEmail).toBe("mohamed@test.com");

    const unread = await asUser(t, adminId).query(api.support.adminUnreadTotal, {});
    expect(unread).toBeGreaterThanOrEqual(1);

    // Notification plateforme envoyée aux admins
    const notifs = await t.run(async (ctx) =>
      ctx.db.query("notifications").collect(),
    );
    expect(notifs.some((n) => n.userId === adminId && n.type === "support_ticket_created")).toBe(true);
  });

  it("only exposes the user's own tickets via getMyTickets", async () => {
    const userA = await createTestUser(t, { name: "Alice", email: "a@test.com" });
    const userB = await createTestUser(t, { name: "Bob", email: "b@test.com" });

    await asUser(t, userA).mutation(api.support.createTicket, {
      subject: "Ticket A",
      category: "account",
      priority: "low",
      message: "Message A",
    });

    const myTickets = await asUser(t, userB).query(api.support.getMyTickets, {});
    expect(myTickets.length).toBe(0);

    const ticketsA = await asUser(t, userA).query(api.support.getMyTickets, {});
    expect(ticketsA.length).toBe(1);
    expect(ticketsA[0]!.subject).toBe("Ticket A");
  });

  it("blocks a user from reading another user's conversation", async () => {
    const userA = await createTestUser(t, { name: "Alice", email: "a@test.com" });
    const userB = await createTestUser(t, { name: "Bob", email: "b@test.com" });

    const ticketId = await asUser(t, userA).mutation(api.support.createTicket, {
      subject: "Ticket secret",
      category: "other",
      priority: "normal",
      message: "Confidentiel",
    });

    const msgsB = await asUser(t, userB).query(api.support.getTicketMessages, { ticketId });
    expect(msgsB).toBeNull();
  });
});

// ============================================================================
// Reply / resolve / status flow
// ============================================================================

describe("support admin reply & resolution", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: any;
  let adminId: any;
  let ticketId: any;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createTestUser(t, { name: "Mohamed", email: "mohamed@test.com" });
    adminId = await createTestUser(t, { role: "admin", name: "Admin", email: "admin@test.com" });
    ticketId = await asUser(t, userId).mutation(api.support.createTicket, {
      subject: "Problème de connexion",
      category: "technical",
      priority: "high",
      message: "Je ne peux pas me connecter",
    });
  });

  it("admin reply persists, notifies the user and moves status to in_progress", async () => {
    await asUser(t, adminId).mutation(api.support.adminReply, {
      ticketId,
      body: "Pouvez-vous préciser votre navigateur ?",
    });

    const msgs = await asUser(t, userId).query(api.support.getTicketMessages, { ticketId });
    expect(msgs?.length).toBe(2);
    const reply = msgs?.find((m) => m.senderRole === "support");
    expect(reply?.body).toBe("Pouvez-vous préciser votre navigateur ?");
    expect(reply?.senderName).toBe("Admin");

    const ticket = await t.run(async (ctx) => ctx.db.get(ticketId));
    expect(ticket!.status).toBe("in_progress");
    expect(ticket!.userUnreadCount).toBe(1);

    const notifs = await t.run(async (ctx) => ctx.db.query("notifications").collect());
    expect(notifs.some((n) => n.userId === userId && n.type === "support_reply")).toBe(true);
  });

  it("user reply reopens a resolved ticket and bumps admin unread", async () => {
    // L'admin résout le ticket
    await asUser(t, adminId).mutation(api.support.adminUpdateTicket, {
      ticketId,
      status: "resolved",
    });
    let ticket = await t.run(async (ctx) => ctx.db.get(ticketId));
    expect(ticket!.status).toBe("resolved");
    expect(ticket!.resolvedAt).toBeTypeOf("number");

    // L'utilisateur répond → réouverture
    await asUser(t, userId).mutation(api.support.sendUserMessage, {
      ticketId,
      body: "Le problème persiste",
    });
    ticket = await t.run(async (ctx) => ctx.db.get(ticketId));
    expect(ticket!.status).toBe("open");
    expect(ticket!.adminUnreadCount).toBe(2);
  });

  it("resolve sets resolvedAt and notifies the user", async () => {
    await asUser(t, adminId).mutation(api.support.adminUpdateTicket, {
      ticketId,
      status: "resolved",
    });
    const ticket = await t.run(async (ctx) => ctx.db.get(ticketId));
    expect(ticket!.status).toBe("resolved");
    expect(ticket!.resolvedAt).toBeTypeOf("number");

    const notifs = await t.run(async (ctx) => ctx.db.query("notifications").collect());
    expect(notifs.some((n) => n.userId === userId && n.type === "support_ticket_resolved")).toBe(true);
  });

  it("blocks user messages on a closed ticket", async () => {
    await asUser(t, adminId).mutation(api.support.adminUpdateTicket, {
      ticketId,
      status: "closed",
    });
    await expect(
      asUser(t, userId).mutation(api.support.sendUserMessage, {
        ticketId,
        body: "Je veux répondre",
      }),
    ).rejects.toThrow("fermée");
  });

  it("regular users cannot run admin actions", async () => {
    await expect(
      asUser(t, userId).mutation(api.support.adminReply, {
        ticketId,
        body: "Je m'improvise admin",
      }),
    ).rejects.toThrow("équipe support");

    await expect(
      asUser(t, userId).mutation(api.support.adminUpdateTicket, {
        ticketId,
        status: "resolved",
      }),
    ).rejects.toThrow("équipe support");
  });
});

// ============================================================================
// Internal notes & assignment
// ============================================================================

describe("support internal notes & assignment", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: any;
  let adminId: any;
  let ticketId: any;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createTestUser(t, { name: "Mohamed", email: "mohamed@test.com" });
    adminId = await createTestUser(t, { role: "admin", name: "Admin", email: "admin@test.com" });
    ticketId = await asUser(t, userId).mutation(api.support.createTicket, {
      subject: "Question",
      category: "other",
      priority: "normal",
      message: "Bonjour",
    });
  });

  it("lets staff add internal notes, but never the user", async () => {
    await expect(
      asUser(t, userId).mutation(api.support.addInternalSupportNote, {
        ticketId,
        body: "Note cachée",
      }),
    ).rejects.toThrow("équipe support");

    await asUser(t, adminId).mutation(api.support.addInternalSupportNote, {
      ticketId,
      body: "Vérifier le problème SMTP avant de répondre",
    });

    const notes = await asUser(t, adminId).query(api.support.getInternalSupportNotes, { ticketId });
    expect(notes?.length).toBe(1);
    expect(notes![0]!.body).toContain("SMTP");

    // L'utilisateur ne voit jamais les notes internes
    const userNotes = await asUser(t, userId).query(api.support.getInternalSupportNotes, { ticketId });
    expect(userNotes).toBeNull();
  });

  it("assigns a ticket to a support agent", async () => {
    await asUser(t, adminId).mutation(api.support.assignSupportTicket, {
      ticketId,
      assignedTo: adminId,
    });
    const tickets = await asUser(t, adminId).query(api.support.adminGetTickets, {});
    expect(tickets[0]!.assignedTo).toBe(adminId);
    expect(tickets[0]!.assigneeName).toBe("Admin");

    const agents = await asUser(t, adminId).query(api.support.adminGetSupportAgents, {});
    expect(agents.some((a) => a._id === adminId)).toBe(true);
  });
});