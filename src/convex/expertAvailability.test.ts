/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api, internal } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// Helpers
// ============================================================================

async function createUser(
  t: ReturnType<typeof convexTest>,
  overrides: { name?: string; email?: string; role?: string } = {},
) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: overrides.name ?? "Client Test",
      email: overrides.email ?? "client@test.com",
      role: overrides.role ?? "user",
      status: "active",
      subscriptionPlan: "free",
      image: undefined,
      company: undefined,
      phone: "+216 98 000 000",
      subscriptionEndDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

/**
 * Profil expert actif (ProMarket exige un abonnement actif non expiré tant que
 * l'« Offre gratuite » admin n'est pas activée).
 */
async function createExpert(
  t: ReturnType<typeof convexTest>,
  userId: string,
  overrides: {
    acceptsUrgent?: boolean;
    availability?: "immediate" | "this_week" | "appointment";
    isVisible?: boolean;
    subscriptionStatus?: "active" | "inactive" | "expired" | "pending" | "trial";
    subscriptionEndDate?: number;
  } = {},
) {
  const now = Date.now();
  return t.run(async (ctx) =>
    ctx.db.insert("expertProfiles", {
      userId: userId as any,
      profession: "plombier",
      displayName: "Sami Plombier",
      phone: "+216 99 111 111",
      email: "sami@test.com",
      specialties: ["depannage_plomberie"],
      regions: ["beja"],
      indicativePrice: "À partir de 80 TND",
      availability: overrides.availability ?? "appointment",
      availabilityDetails: "Lundi – Vendredi, 9h – 17h",
      acceptsUrgent: overrides.acceptsUrgent,
      plan: "monthly",
      subscriptionStatus: overrides.subscriptionStatus ?? "active",
      subscriptionStartDate: now,
      subscriptionEndDate: overrides.subscriptionEndDate ?? now + 30 * 86400000,
      isVisible: overrides.isVisible ?? true,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

const asUser = (t: ReturnType<typeof convexTest>, userId: string) =>
  t.withIdentity({ subject: userId });

/** Notifications du système existant, filtrées par destinataire. */
async function notificationsFor(t: ReturnType<typeof convexTest>, userId: string) {
  const rows = await t.run(async (ctx) => ctx.db.query("notifications").collect());
  return rows.filter((n) => n.userId === userId);
}

function tomorrow(hourOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9 + hourOffset, 0, 0, 0);
  return d.getTime();
}

const baseRequest = (expertId: string, overrides: Record<string, unknown> = {}) => ({
  expertId: expertId as any,
  preferredDate: tomorrow(),
  preferredTime: "10:00",
  reason: "Visite du chantier",
  ...overrides,
});

// ============================================================================
// Demandes de rendez-vous
// ============================================================================

describe("expertAvailability.requestAppointment", () => {
  let t: ReturnType<typeof convexTest>;
  let clientId: string;
  let expertUserId: string;
  let expertId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    clientId = await createUser(t);
    expertUserId = await createUser(t, { name: "Sami", email: "sami@test.com" });
    expertId = await createExpert(t, expertUserId);
  });

  it("refuse un utilisateur non authentifié", async () => {
    await expect(
      t.mutation(api.expertAvailability.requestAppointment, baseRequest(expertId)),
    ).rejects.toThrow("Non authentifié");
  });

  it("enregistre la demande en attente et notifie l'expert", async () => {
    const result = await asUser(t, clientId).mutation(
      api.expertAvailability.requestAppointment,
      baseRequest(expertId),
    );
    expect(result.success).toBe(true);

    const rows = await t.run(async (ctx) => ctx.db.query("expertAppointments").collect());
    expect(rows).toHaveLength(1);
    // Jamais confirmé avant approbation explicite
    expect(rows[0].status).toBe("pending");
    expect(rows[0].preferredTime).toBe("10:00");

    const notifications = await t.run(async (ctx) => ctx.db.query("notifications").collect());
    expect(notifications).toHaveLength(1);
    expect(notifications[0].userId).toBe(expertUserId);
    expect(notifications[0].type).toBe("expert_appointment");
    expect(notifications[0].title).toBe("Nouvelle demande de rendez-vous");
    expect(notifications[0].message).toContain("10:00");
  });

  it("ne duplique pas une demande identique (idempotence)", async () => {
    const client = asUser(t, clientId);
    const first = await client.mutation(
      api.expertAvailability.requestAppointment,
      baseRequest(expertId),
    );
    const second = await client.mutation(
      api.expertAvailability.requestAppointment,
      baseRequest(expertId),
    );

    expect((second as any).alreadyExists).toBe(true);
    expect((second as any).appointmentId).toBe((first as any).appointmentId);
    const rows = await t.run(async (ctx) => ctx.db.query("expertAppointments").collect());
    expect(rows).toHaveLength(1);
  });

  it("refuse une date passée ou une heure invalide", async () => {
    const client = asUser(t, clientId);
    await expect(
      client.mutation(
        api.expertAvailability.requestAppointment,
        baseRequest(expertId, { preferredDate: Date.now() - 3 * 86400000 }),
      ),
    ).rejects.toThrow("aujourd'hui ou ultérieure");

    await expect(
      client.mutation(
        api.expertAvailability.requestAppointment,
        baseRequest(expertId, { preferredTime: "25:00" }),
      ),
    ).rejects.toThrow("Heure souhaitée invalide");

    await expect(
      client.mutation(
        api.expertAvailability.requestAppointment,
        baseRequest(expertId, { reason: "  " }),
      ),
    ).rejects.toThrow("motif");
  });

  it("refuse un expert masqué ou dont l'abonnement a expiré", async () => {
    const hiddenExpert = await createExpert(t, expertUserId, { isVisible: false });
    const expiredExpert = await createExpert(t, expertUserId, {
      subscriptionStatus: "expired",
      subscriptionEndDate: Date.now() - 86400000,
    });
    const client = asUser(t, clientId);

    await expect(
      client.mutation(api.expertAvailability.requestAppointment, baseRequest(hiddenExpert)),
    ).rejects.toThrow("pas disponible");
    await expect(
      client.mutation(api.expertAvailability.requestAppointment, baseRequest(expiredExpert)),
    ).rejects.toThrow("pas disponible");
  });
});

// ============================================================================
// Décision de l'expert
// ============================================================================

describe("expertAvailability.respondAppointment", () => {
  let t: ReturnType<typeof convexTest>;
  let clientId: string;
  let expertUserId: string;
  let expertId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    clientId = await createUser(t);
    expertUserId = await createUser(t, { name: "Sami", email: "sami@test.com" });
    expertId = await createExpert(t, expertUserId);
  });

  const requestOnce = async () => {
    const res = await asUser(t, clientId).mutation(
      api.expertAvailability.requestAppointment,
      baseRequest(expertId),
    );
    return (res as any).appointmentId as string;
  };

  it("approuve, passe le statut à approved et notifie le client", async () => {
    const id = await requestOnce();
    const res = await asUser(t, expertUserId).mutation(
      api.expertAvailability.respondAppointment,
      { appointmentId: id as any, approve: true },
    );
    expect((res as any).status).toBe("approved");

    const clientNotifications = await notificationsFor(t, clientId);
    expect(clientNotifications).toHaveLength(1);
    expect(clientNotifications[0].title).toBe("Rendez-vous confirmé");
    expect(clientNotifications[0].message).toContain("Sami Plombier");
  });

  it("décline et notifie « pas disponible pour cette date »", async () => {
    const id = await requestOnce();
    await asUser(t, expertUserId).mutation(api.expertAvailability.respondAppointment, {
      appointmentId: id as any,
      approve: false,
    });
    const clientNotifications = await notificationsFor(t, clientId);
    expect(clientNotifications[0].title).toBe("Demande déclinée");
    expect(clientNotifications[0].message).toBe(
      "Le professionnel n'est pas disponible pour cette date.",
    );
  });

  it("ne permet pas de décider deux fois (statut explicite uniquement)", async () => {
    const id = await requestOnce();
    const expert = asUser(t, expertUserId);
    await expert.mutation(api.expertAvailability.respondAppointment, {
      appointmentId: id as any,
      approve: true,
    });
    const second = await expert.mutation(api.expertAvailability.respondAppointment, {
      appointmentId: id as any,
      approve: false,
    });
    expect((second as any).alreadyDecided).toBe(true);

    const rows = await t.run(async (ctx) => ctx.db.query("expertAppointments").collect());
    expect(rows[0].status).toBe("approved");
    expect(rows[0].decidedAt).toBeDefined();
  });

  it("refuse la décision d'un autre expert", async () => {
    const id = await requestOnce();
    const otherExpertUser = await createUser(t, { email: "other@test.com" });
    await createExpert(t, otherExpertUser);
    await expect(
      asUser(t, otherExpertUser).mutation(api.expertAvailability.respondAppointment, {
        appointmentId: id as any,
        approve: true,
      }),
    ).rejects.toThrow("Non autorisé");
  });

  it("annule un rendez-vous et notifie l'expert", async () => {
    const id = await requestOnce();
    await asUser(t, expertUserId).mutation(api.expertAvailability.respondAppointment, {
      appointmentId: id as any,
      approve: true,
    });
    await asUser(t, clientId).mutation(api.expertAvailability.cancelAppointment, {
      appointmentId: id as any,
    });

    const rows = await t.run(async (ctx) => ctx.db.query("expertAppointments").collect());
    expect(rows[0].status).toBe("cancelled");

    const expertNotifications = await notificationsFor(t, expertUserId);
    expect(expertNotifications.some((n) => n.title === "Annulation d'un rendez-vous")).toBe(true);
  });
});

// ============================================================================
// Demandes urgentes
// ============================================================================

describe("expertAvailability urgent requests", () => {
  let t: ReturnType<typeof convexTest>;
  let clientId: string;
  let expertUserId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    clientId = await createUser(t);
    expertUserId = await createUser(t, { name: "Sami", email: "sami@test.com" });
  });

  const urgentArgs = (expertId: string) => ({
    expertId: expertId as any,
    description: "Fuite d'eau importante",
    userPhone: "+216 98 123 456",
    region: "beja",
  });

  it("refuse un expert qui n'accepte pas les urgences", async () => {
    const expertId = await createExpert(t, expertUserId, { acceptsUrgent: false });
    await expect(
      asUser(t, clientId).mutation(api.expertAvailability.requestUrgent, urgentArgs(expertId)),
    ).rejects.toThrow("n'accepte pas les demandes urgentes");
  });

  it("envoie une notification prioritaire à l'expert", async () => {
    const expertId = await createExpert(t, expertUserId, { acceptsUrgent: true });
    await asUser(t, clientId).mutation(api.expertAvailability.requestUrgent, urgentArgs(expertId));

    const notifications = await t.run(async (ctx) => ctx.db.query("notifications").collect());
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("expert_urgent");
    expect(notifications[0].title).toContain("⚡");
  });

  it("communique immédiatement la décision au client", async () => {
    const expertId = await createExpert(t, expertUserId, { acceptsUrgent: true });
    const res = await asUser(t, clientId).mutation(
      api.expertAvailability.requestUrgent,
      urgentArgs(expertId),
    );
    const urgentId = (res as any).urgentId as string;

    await asUser(t, expertUserId).mutation(api.expertAvailability.respondUrgent, {
      urgentId: urgentId as any,
      accept: true,
    });

    const rows = await t.run(async (ctx) => ctx.db.query("expertUrgentRequests").collect());
    expect(rows[0].status).toBe("accepted");

    const clientNotifications = await notificationsFor(t, clientId);
    expect(clientNotifications[0].title).toBe("Demande urgente acceptée");
  });

  it("refuse une urgence sans décision préalable et la notifie", async () => {
    const expertId = await createExpert(t, expertUserId, { acceptsUrgent: true });
    const res = await asUser(t, clientId).mutation(
      api.expertAvailability.requestUrgent,
      urgentArgs(expertId),
    );
    await asUser(t, expertUserId).mutation(api.expertAvailability.respondUrgent, {
      urgentId: (res as any).urgentId as any,
      accept: false,
    });

    const clientNotifications = await notificationsFor(t, clientId);
    expect(clientNotifications[0].title).toBe("Demande urgente refusée");
  });
});

// ============================================================================
// Rappels automatiques (cron)
// ============================================================================

describe("expertAvailability.sendAppointmentReminders", () => {
  let t: ReturnType<typeof convexTest>;
  let clientId: string;
  let expertUserId: string;
  let expertId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    clientId = await createUser(t);
    expertUserId = await createUser(t, { name: "Sami", email: "sami@test.com" });
    expertId = await createExpert(t, expertUserId);
  });

  it("envoie un rappel 24 h avant, une seule fois", async () => {
    const res = await asUser(t, clientId).mutation(
      api.expertAvailability.requestAppointment,
      baseRequest(expertId),
    );
    const id = (res as any).appointmentId as string;
    await asUser(t, expertUserId).mutation(api.expertAvailability.respondAppointment, {
      appointmentId: id as any,
      approve: true,
    });

    const first = await t.mutation(internal.expertAvailability.sendAppointmentReminders, {});
    expect((first as any).sent).toBe(1);

    const reminders = await notificationsFor(t, clientId);
    expect(reminders.some((n) => n.title === "Rappel de rendez-vous")).toBe(true);

    const expertReminders = await notificationsFor(t, expertUserId);
    expect(expertReminders.some((n) => n.title === "Rendez-vous à venir")).toBe(true);

    // Idempotent : le second passage n'envoie rien
    const second = await t.mutation(internal.expertAvailability.sendAppointmentReminders, {});
    expect((second as any).sent).toBe(0);
  });
});

// ============================================================================
// Queries
// ============================================================================

describe("expertAvailability queries", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("renvoie les demandes du client avec le nom de l'expert", async () => {
    const clientId = await createUser(t);
    const expertUserId = await createUser(t, { email: "sami@test.com" });
    const expertId = await createExpert(t, expertUserId);

    await asUser(t, clientId).mutation(
      api.expertAvailability.requestAppointment,
      baseRequest(expertId),
    );

    const mine = await asUser(t, clientId).query(
      api.expertAvailability.getMyAppointments,
      {},
    );
    expect(mine).toHaveLength(1);
    expect(mine[0].expertName).toBe("Sami Plombier");

    const expertView = await asUser(t, expertUserId).query(
      api.expertAvailability.getExpertAppointments,
      {},
    );
    expect(expertView).toHaveLength(1);

    const pending = await asUser(t, expertUserId).query(
      api.expertAvailability.pendingAvailabilityCount,
      {},
    );
    expect(pending).toBe(1);
  });

  it("renvoie [] sans profil expert", async () => {
    const clientId = await createUser(t);
    const expertView = await asUser(t, clientId).query(
      api.expertAvailability.getExpertAppointments,
      {},
    );
    expect(expertView).toEqual([]);
  });
});
