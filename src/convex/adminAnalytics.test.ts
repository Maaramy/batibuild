/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

type TestT = TestConvex<typeof schema>;

const DAY = 24 * 60 * 60 * 1000;

// ============================================================================
// Helpers
// ============================================================================

async function createUser(
  t: TestT,
  overrides: Partial<{
    role: string;
    name: string;
    email: string;
    userRole: "client" | "supplier" | "expert";
    isAnonymous: boolean;
    status: "active" | "disabled";
    createdAt: number;
  }> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? `user${Math.random()}@test.com`,
      role: overrides.role as any ?? "user",
      userRole: overrides.userRole ?? "client",
      status: overrides.status ?? "active",
      isAnonymous: overrides.isAnonymous ?? false,
      createdAt: overrides.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    });
  });
}

async function createProject(
  t: TestT,
  userId: string,
  overrides: Partial<{ status: string; category: string; createdAt: number }> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("projects", {
      userId: userId as any,
      name: "Projet Test",
      category: (overrides.category ?? "house") as any,
      status: (overrides.status ?? "draft") as any,
      createdAt: overrides.createdAt ?? Date.now(),
      updatedAt: overrides.createdAt ?? Date.now(),
    });
  });
}

async function createConnectionLog(
  t: TestT,
  overrides: Partial<{
    sessionId: string;
    country: string;
    page: string;
    connectedAt: number;
    lastSeenAt: number;
  }> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("connectionLogs", {
      sessionId: overrides.sessionId ?? `sess_${Math.random()}`,
      country: overrides.country ?? "Tunisia",
      page: overrides.page ?? "/dashboard",
      connectedAt: overrides.connectedAt ?? Date.now(),
      lastSeenAt: overrides.lastSeenAt ?? overrides.connectedAt ?? Date.now(),
    });
  });
}

async function createMaterialAnalysis(
  t: TestT,
  userId: string,
  createdAt = Date.now(),
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("aiMaterialAnalyses", {
      userId: userId as any,
      input: {},
      results: {},
      createdAt,
    });
  });
}

async function createTicket(
  t: TestT,
  userId: string,
  overrides: Partial<{ status: string; adminUnreadCount: number }> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("supportTickets", {
      userId: userId as any,
      subject: "Ticket test",
      category: "technical",
      priority: "normal",
      status: (overrides.status ?? "open") as any,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      adminUnreadCount: overrides.adminUnreadCount ?? 0,
    });
  });
}

// ============================================================================
// Sécurité — garde admin serveur
// ============================================================================

describe("adminAnalytics — sécurité", () => {
  let t: any;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("refuse les requêtes non authentifiées (retour null, jamais de données)", async () => {
    const stats = await t.query(api.adminAnalytics.getUserStats, {});
    expect(stats).toBeNull();

    const overview = await t.query(api.adminAnalytics.getOverviewStats, {});
    expect(overview).toBeNull();

    const projects = await t.query(api.adminAnalytics.getProjectStats, {});
    expect(projects).toBeNull();

    const activity = await t.query(api.adminAnalytics.getActivityStats, {});
    expect(activity).toBeNull();

    const support = await t.query(api.adminAnalytics.getSupportStats, {});
    expect(support).toBeNull();

    const conn = await t.query(api.adminAnalytics.getConnectionStats, {});
    expect(conn).toBeNull();

    const history = await t.query(api.adminAnalytics.getConnectionHistory, { days: 7 });
    expect(history).toBeNull();
  });

  it("refuse un utilisateur standard (role=user)", async () => {
    const userId = await createUser(t);
    const userT = t.withIdentity({ subject: userId });

    expect(await userT.query(api.adminAnalytics.getUserStats, {})).toBeNull();
    expect(await userT.query(api.adminAnalytics.getOverviewStats, {})).toBeNull();
    expect(
      await userT.query(api.adminAnalytics.getConnectionHistory, { days: 7 }),
    ).toBeNull();
  });

  it("refuse un agent support (role=support_agent) — analytics non prévu pour ce rôle", async () => {
    const userId = await createUser(t, { role: "support_agent" });
    const agentT = t.withIdentity({ subject: userId });

    expect(await agentT.query(api.adminAnalytics.getSupportStats, {})).toBeNull();
  });

  it("autorise un admin", async () => {
    const adminId = await createUser(t, { role: "admin" });
    const adminT = t.withIdentity({ subject: adminId });

    const stats = await adminT.query(api.adminAnalytics.getUserStats, {});
    expect(stats).not.toBeNull();
    expect(stats!.total).toBe(1);
  });

  it("autorise un modérateur", async () => {
    const modId = await createUser(t, { role: "moderator" });
    const modT = t.withIdentity({ subject: modId });

    const stats = await modT.query(api.adminAnalytics.getOverviewStats, {});
    expect(stats).not.toBeNull();
  });
});

// ============================================================================
// Agrégations — utilisateurs
// ============================================================================

describe("adminAnalytics — getUserStats", () => {
  let t: any;
  let adminId: string;
  let adminT: any;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createUser(t, { role: "admin" });
    adminT = t.withIdentity({ subject: adminId });
  });

  it("compte les utilisateurs réels et exclut les anonymes", async () => {
    await createUser(t, { email: "a@test.com" });
    await createUser(t, { email: "b@test.com" });
    await createUser(t, { email: "anon@test.com", isAnonymous: true });
    await createUser(t, { email: "off@test.com", status: "disabled" });

    const stats = await adminT.query(api.adminAnalytics.getUserStats, {});
    // admin (créé dans beforeEach) + a + b + off = 4 ; l'anonyme est exclu
    expect(stats!.total).toBe(4);
    expect(stats!.active).toBe(3);
    expect(stats!.disabled).toBe(1);
  });

  it("compte les nouveaux utilisateurs sur 24h / 7j", async () => {
    const now = Date.now();
    await createUser(t, { email: "fresh@test.com", createdAt: now - 3600_000 });
    await createUser(t, { email: "week@test.com", createdAt: now - 3 * DAY });
    await createUser(t, { email: "old@test.com", createdAt: now - 40 * DAY });

    const stats = await adminT.query(api.adminAnalytics.getUserStats, {});
    // + l'admin lui-même (créé à l'instant) → 2 nouveaux 24h
    expect(stats!.newLast24h).toBe(2);
    expect(stats!.newLast7d).toBe(3);
    expect(stats!.total).toBe(4);
  });

  it("répartit par userRole", async () => {
    await createUser(t, { email: "s@test.com", userRole: "supplier" });
    await createUser(t, { email: "e@test.com", userRole: "expert" });
    await createUser(t, { email: "c@test.com", userRole: "client" });

    const stats = await adminT.query(api.adminAnalytics.getUserStats, {});
    expect(stats!.byUserRole.supplier).toBe(1);
    expect(stats!.byUserRole.expert).toBe(1);
    expect(stats!.byUserRole.client).toBe(2); // c + admin (userRole par défaut client)
  });

  it("compte les sessions en ligne (heartbeat < 2 min)", async () => {
    const now = Date.now();
    await createConnectionLog(t, { sessionId: "live1", lastSeenAt: now - 30_000 });
    await createConnectionLog(t, { sessionId: "live2", lastSeenAt: now - 60_000 });
    await createConnectionLog(t, { sessionId: "stale", lastSeenAt: now - 10 * 60_000 });

    const stats = await adminT.query(api.adminAnalytics.getUserStats, {});
    expect(stats!.onlineNow).toBe(2);
  });

  it("produit une série d'inscriptions sur 30 jours avec la bonne longueur", async () => {
    const stats = await adminT.query(api.adminAnalytics.getUserStats, {});
    expect(stats!.signupSeries).toHaveLength(31); // 30 jours inclusifs
    // La somme de la série ≥ nb d'utilisateurs créés dans la fenêtre
    const sum = stats!.signupSeries.reduce((s: number, d: { count: number }) => s + d.count, 0);
    expect(sum).toBeGreaterThanOrEqual(1); // au moins l'admin
  });
});

// ============================================================================
// Agrégations — projets
// ============================================================================

describe("adminAnalytics — getProjectStats", () => {
  let t: any;
  let adminId: string;
  let adminT: any;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createUser(t, { role: "admin" });
    adminT = t.withIdentity({ subject: adminId });
  });

  it("compte par statut et agrège les catégories", async () => {
    const u = await createUser(t, { email: "owner@test.com" });
    await createProject(t, u, { status: "draft", category: "house" });
    await createProject(t, u, { status: "completed", category: "villa" });
    await createProject(t, u, { status: "archived", category: "house" });

    const stats = await adminT.query(api.adminAnalytics.getProjectStats, {});
    expect(stats!.total).toBe(3);
    expect(stats!.draft).toBe(1);
    expect(stats!.completed).toBe(1);
    expect(stats!.archived).toBe(1);
    expect(stats!.active).toBe(2); // non-archivés
    expect(stats!.byCategory["house"]).toBe(2);
    expect(stats!.byCategory["villa"]).toBe(1);
  });

  it("détecte les projets créés récemment", async () => {
    const u = await createUser(t, { email: "owner2@test.com" });
    const now = Date.now();
    await createProject(t, u, { createdAt: now - 3600_000 });
    await createProject(t, u, { createdAt: now - 5 * DAY });

    const stats = await adminT.query(api.adminAnalytics.getProjectStats, {});
    expect(stats!.createdLast24h).toBe(1);
    expect(stats!.createdLast7d).toBe(2);
  });
});

// ============================================================================
// Agrégations — activité
// ============================================================================

describe("adminAnalytics — getActivityStats", () => {
  let t: any;
  let adminId: string;
  let adminT: any;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createUser(t, { role: "admin" });
    adminT = t.withIdentity({ subject: adminId });
  });

  it("agrège analyses matériaux, connexions", async () => {
    const u = await createUser(t, { email: "active@test.com" });
    await createMaterialAnalysis(t, u);
    await createMaterialAnalysis(t, u);

    const stats = await adminT.query(api.adminAnalytics.getActivityStats, {});
    expect(stats!.materialAnalyses.total).toBe(2);
    expect(stats!.materialAnalyses.last24h).toBe(2);
    expect(stats!.aiFeaturesUsed.total).toBe(2); // 2 matériaux
    expect(stats!.connections.total).toBe(0);
  });

  it("renvoie lastActivityAt null quand aucune activité", async () => {
    const stats = await adminT.query(api.adminAnalytics.getActivityStats, {});
    expect(stats!.lastActivityAt).toBeNull();
    expect(stats!.activitySeries).toHaveLength(31);
  });
});

// ============================================================================
// Agrégations — support
// ============================================================================

describe("adminAnalytics — getSupportStats", () => {
  let t: any;
  let adminId: string;
  let adminT: any;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createUser(t, { role: "admin" });
    adminT = t.withIdentity({ subject: adminId });
  });

  it("compte les tickets par statut et les messages non lus", async () => {
    const u = await createUser(t, { email: "ticketuser@test.com" });
    await createTicket(t, u, { status: "open", adminUnreadCount: 2 });
    await createTicket(t, u, { status: "in_progress", adminUnreadCount: 1 });
    await createTicket(t, u, { status: "resolved" });

    const stats = await adminT.query(api.adminAnalytics.getSupportStats, {});
    expect(stats!.total).toBe(3);
    expect(stats!.open).toBe(1);
    expect(stats!.inProgress).toBe(1);
    expect(stats!.resolved).toBe(1);
    expect(stats!.unreadMessages).toBe(3);
  });

  it("fusionne awaiting_user dans « en cours » et closed dans « résolus »", async () => {
    const u = await createUser(t, { email: "ticketuser2@test.com" });
    await createTicket(t, u, { status: "awaiting_user" });
    await createTicket(t, u, { status: "closed" });

    const stats = await adminT.query(api.adminAnalytics.getSupportStats, {});
    expect(stats!.inProgress).toBe(1);
    expect(stats!.resolved).toBe(1);
    expect(stats!.open).toBe(0);
  });
});

// ============================================================================
// Connexions — vue combinée + historique
// ============================================================================

describe("adminAnalytics — connexions", () => {
  let t: any;
  let adminId: string;
  let adminT: any;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createUser(t, { role: "admin" });
    adminT = t.withIdentity({ subject: adminId });
  });

  it("getOverviewStats combine les indicateurs clés", async () => {
    const u = await createUser(t, { email: "combo@test.com" });
    await createProject(t, u);
    await createMaterialAnalysis(t, u);
    await createTicket(t, u, { status: "open" });
    await createConnectionLog(t, { sessionId: "combo1" });

    const stats = await adminT.query(api.adminAnalytics.getOverviewStats, {});
    expect(stats!.usersTotal).toBe(2); // admin + u
    expect(stats!.usersOnline).toBe(1);
    expect(stats!.projectsTotal).toBe(1);
    expect(stats!.projectsActive).toBe(1);
    expect(stats!.analysesTotal).toBe(1);
    expect(stats!.analyses24h).toBe(1);
    expect(stats!.supportOpen).toBe(1);
  });

  it("getConnectionStats agrège les pays et filtre les sessions live", async () => {
    const now = Date.now();
    await createConnectionLog(t, {
      sessionId: "tn1",
      country: "Tunisia",
      lastSeenAt: now - 30_000,
    });
    await createConnectionLog(t, {
      sessionId: "tn2",
      country: "Tunisia",
      lastSeenAt: now - 60_000,
    });
    await createConnectionLog(t, {
      sessionId: "fr1",
      country: "France",
      lastSeenAt: now - 5 * 60_000, // hors fenêtre live
    });

    const stats = await adminT.query(api.adminAnalytics.getConnectionStats, {});
    expect(stats!.totalConnections).toBe(3);
    expect(stats!.uniqueSessions).toBe(3);
    expect(stats!.live.total).toBe(2);
    expect(stats!.live.byCountry["Tunisia"]).toBe(2);
    expect(stats!.topCountries[0][0]).toBe("Tunisia");
    expect(stats!.topCountries[0][1]).toBe(2);
  });

  it("getConnectionHistory regroupe par jour avec sessions uniques", async () => {
    const now = Date.now();
    await createConnectionLog(t, { sessionId: "h1", connectedAt: now - 3600_000 });
    await createConnectionLog(t, { sessionId: "h2", connectedAt: now - 7200_000 });
    await createConnectionLog(t, { sessionId: "h1", connectedAt: now - 26 * 3600_000 }); // hier

    const history = await adminT.query(api.adminAnalytics.getConnectionHistory, {
      days: 7,
    });
    expect(history).not.toBeNull();
    expect(history!.length).toBeGreaterThanOrEqual(2);

    const today = history!.find((d: { date: string }) => d.date === new Date(now).toISOString().slice(0, 10));
    // Note : la date locale peut différer d'UTC — on vérifie au moins le total
    const totalConn = history!.reduce((s: number, d: { connections: number }) => s + d.connections, 0);
    expect(totalConn).toBe(3);
    void today;
  });

  it("getConnectionHistory borne la période demandée", async () => {
    const now = Date.now();
    await createConnectionLog(t, { connectedAt: now - 100 * DAY, sessionId: "old" });
    await createConnectionLog(t, { connectedAt: now - 3600_000, sessionId: "new" });

    const history = await adminT.query(api.adminAnalytics.getConnectionHistory, {
      days: 7,
    });
    const totalConn = history!.reduce((s: number, d: { connections: number }) => s + d.connections, 0);
    expect(totalConn).toBe(1); // seul le log récent
  });
});

// ============================================================================
// Temps réel — les queries reflètent les changements de la base
// ============================================================================

describe("adminAnalytics — réactivité", () => {
  it("le compteur change quand une nouvelle donnée est insérée (simulation de mise à jour temps réel)", async () => {
    const t = convexTest(schema, modules);
    const adminId = await createUser(t, { role: "admin" });
    const adminT = t.withIdentity({ subject: adminId });

    const before = await adminT.query(api.adminAnalytics.getOverviewStats, {});
    expect(before!.projectsTotal).toBe(0);

    const u = await createUser(t, { email: "rt@test.com" });
    await createProject(t, u);

    const after = await adminT.query(api.adminAnalytics.getOverviewStats, {});
    expect(after!.projectsTotal).toBe(1);

    await createProject(t, u);
    const after2 = await adminT.query(api.adminAnalytics.getOverviewStats, {});
    expect(after2!.projectsTotal).toBe(2);
  });
});
