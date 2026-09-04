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

async function createTestExpertProfile(
  t: ReturnType<typeof convexTest>,
  userId: string,
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("expertProfiles", {
      userId: userId as any,
      profession: "architecte",
      displayName: "Test Expert",
      phone: "+216 99 111 111",
      email: "expert@test.com",
      specialties: ["residential"],
      regions: ["tunis"],
      plan: "trial",
      subscriptionStatus: "active",
      isVisible: true,
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

describe("expertServiceRequests.create", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("rejects if not authenticated", async () => {
    const expertUserId = await createTestUser(t);
    const expertId = await createTestExpertProfile(t, expertUserId);

    // Call without identity
    await expect(
      t.mutation(api.expertServiceRequests.create, {
        expertId: expertId as any,
        requestType: "devis" as const,
        serviceType: "architecture",
        description: "Need an architect",
        userPhone: "+216 99 000 000",
        userEmail: "user@test.com",
        userName: "User",
      }),
    ).rejects.toThrow("Non authentifié");
  });

  it("rejects if expert does not exist", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);
    const expertUserId = await createTestUser(t, { email: "expert@test.com" });
    const expertId = await createTestExpertProfile(t, expertUserId);

    // Delete the expert profile
    await t.run(async (ctx) => ctx.db.delete(expertId));

    await expect(
      userT.mutation(api.expertServiceRequests.create, {
        expertId: expertId as any,
        requestType: "devis" as const,
        serviceType: "architecture",
        description: "Need an architect",
        userPhone: "+216 99 000 000",
        userEmail: "user@test.com",
        userName: "User",
      }),
    ).rejects.toThrow("Expert introuvable");
  });

  it("creates a service request", async () => {
    const expertUserId = await createTestUser(t, {
      name: "Expert",
      email: "expert@test.com",
    });
    const expertId = await createTestExpertProfile(t, expertUserId);

    const clientUserId = await createTestUser(t, {
      name: "Client",
      email: "client@test.com",
    });
    const clientT = asUser(t, clientUserId);

    const result = await clientT.mutation(api.expertServiceRequests.create, {
      expertId: expertId as any,
      requestType: "devis" as const,
      serviceType: "architecture",
      description: "I need architectural plans for a villa",
      userPhone: "+216 99 555 555",
      userEmail: "client@test.com",
      userName: "Client",
    });

    expect(result.success).toBe(true);
    expect(result.requestId).toBeTruthy();

    const request = await t.run(async (ctx) => ctx.db.get(result.requestId));
    expect(request).toBeTruthy();
    expect(request!.userId).toBe(clientUserId);
    expect(request!.expertId).toBe(expertId);
    expect(request!.status).toBe("pending");
    expect(request!.serviceType).toBe("architecture");
  });
});

// ============================================================================
// respond — mutation
// ============================================================================

describe("expertServiceRequests.respond", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("rejects if not authenticated", async () => {
    const expertUserId = await createTestUser(t);
    const expertId = await createTestExpertProfile(t, expertUserId);
    const clientUserId = await createTestUser(t, { email: "client@test.com" });
    const clientT = asUser(t, clientUserId);

    const result = await clientT.mutation(api.expertServiceRequests.create, {
      expertId: expertId as any,
      requestType: "devis" as const,
      serviceType: "architecture",
      description: "Need plans",
      userPhone: "+216 99 000 000",
      userEmail: "client@test.com",
      userName: "Client",
    });

    // Call without identity
    await expect(
      t.mutation(api.expertServiceRequests.respond, {
        serviceRequestId: result.requestId,
        message: "Bonjour",
      }),
    ).rejects.toThrow("Non authentifié");
  });

  it("rejects if user has no expert profile", async () => {
    const expertUserId = await createTestUser(t);
    const expertId = await createTestExpertProfile(t, expertUserId);
    const clientUserId = await createTestUser(t, { email: "client@test.com" });
    const clientT = asUser(t, clientUserId);

    const result = await clientT.mutation(api.expertServiceRequests.create, {
      expertId: expertId as any,
      requestType: "devis" as const,
      serviceType: "architecture",
      description: "Need plans",
      userPhone: "+216 99 000 000",
      userEmail: "client@test.com",
      userName: "Client",
    });

    // A user without expert profile tries to respond
    const regularUserId = await createTestUser(t, { email: "regular@test.com" });
    const regularT = asUser(t, regularUserId);

    await expect(
      regularT.mutation(api.expertServiceRequests.respond, {
        serviceRequestId: result.requestId,
        message: "Bonjour",
      }),
    ).rejects.toThrow("Profil expert introuvable");
  });

  it("rejects if expert does not own the request", async () => {
    const expertUserId = await createTestUser(t);
    const expertId = await createTestExpertProfile(t, expertUserId);

    const clientUserId = await createTestUser(t, { email: "client@test.com" });
    const clientT = asUser(t, clientUserId);

    const result = await clientT.mutation(api.expertServiceRequests.create, {
      expertId: expertId as any,
      requestType: "devis" as const,
      serviceType: "architecture",
      description: "Need plans",
      userPhone: "+216 99 000 000",
      userEmail: "client@test.com",
      userName: "Client",
    });

    // Another expert tries to respond
    const otherExpertUserId = await createTestUser(t, {
      email: "other@test.com",
    });
    await createTestExpertProfile(
      t,
      otherExpertUserId,
    );
    const otherT = asUser(t, otherExpertUserId);

    await expect(
      otherT.mutation(api.expertServiceRequests.respond, {
        serviceRequestId: result.requestId,
        message: "I can help",
      }),
    ).rejects.toThrow("Non autorisé");
  });

  it("expert can respond to their own request", async () => {
    const expertUserId = await createTestUser(t);
    const expertId = await createTestExpertProfile(t, expertUserId);

    const clientUserId = await createTestUser(t, { email: "client@test.com" });
    const clientT = asUser(t, clientUserId);

    const result = await clientT.mutation(api.expertServiceRequests.create, {
      expertId: expertId as any,
      requestType: "service" as const,
      serviceType: "bureau_etudes",
      description: "Études de sol",
      userPhone: "+216 99 000 000",
      userEmail: "client@test.com",
      userName: "Client",
    });

    const expertT = asUser(t, expertUserId);
    await expertT.mutation(api.expertServiceRequests.respond, {
      serviceRequestId: result.requestId,
      message: "Je peux vous aider. Voici mon devis.",
      totalAmount: 8000,
    });

    const request = await t.run(async (ctx) =>
      ctx.db.get(result.requestId),
    );
    expect(request!.status).toBe("responded");
  });
});

// ============================================================================
// getByExpert — query
// ============================================================================

describe("expertServiceRequests.getByExpert", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns requests for the current expert", async () => {
    const expertUserId = await createTestUser(t);
    const expertId = await createTestExpertProfile(t, expertUserId);

    const clientUserId = await createTestUser(t, { email: "client@test.com" });
    const clientT = asUser(t, clientUserId);

    await clientT.mutation(api.expertServiceRequests.create, {
      expertId: expertId as any,
      requestType: "devis" as const,
      serviceType: "architecture",
      description: "Villa plans",
      userPhone: "+216 99 000 000",
      userEmail: "client@test.com",
      userName: "Client",
    });

    const expertT = asUser(t, expertUserId);
    const requests = await expertT.query(
      api.expertServiceRequests.getByExpert,
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].expertId).toBe(expertId);
  });

  it("returns empty for user without expert profile", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    const requests = await userT.query(
      api.expertServiceRequests.getByExpert,
    );
    expect(requests).toEqual([]);
  });
});

// ============================================================================
// getMyRequests — query
// ============================================================================

describe("expertServiceRequests.getMyRequests", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns requests created by the current user", async () => {
    const expertUserId = await createTestUser(t);
    const expertId = await createTestExpertProfile(t, expertUserId);

    const clientUserId = await createTestUser(t, { email: "client@test.com" });
    const clientT = asUser(t, clientUserId);

    await clientT.mutation(api.expertServiceRequests.create, {
      expertId: expertId as any,
      requestType: "devis" as const,
      serviceType: "ingenieur",
      description: "Structure analysis",
      userPhone: "+216 99 000 000",
      userEmail: "client@test.com",
      userName: "Client",
    });

    const requests = await clientT.query(
      api.expertServiceRequests.getMyRequests,
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].userId).toBe(clientUserId);
  });
});

// ============================================================================
// pendingCount — query
// ============================================================================

describe("expertServiceRequests.pendingCount", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("counts pending requests for the expert", async () => {
    const expertUserId = await createTestUser(t);
    const expertId = await createTestExpertProfile(t, expertUserId);

    const clientUserId = await createTestUser(t, { email: "client@test.com" });
    const clientT = asUser(t, clientUserId);

    // Create 2 pending requests
    for (let i = 0; i < 2; i++) {
      await clientT.mutation(api.expertServiceRequests.create, {
        expertId: expertId as any,
        requestType: "devis" as const,
        serviceType: "architecture",
        description: `Request ${i}`,
        userPhone: "+216 99 000 000",
        userEmail: "client@test.com",
        userName: "Client",
      });
    }

    const expertT = asUser(t, expertUserId);
    const count = await expertT.query(api.expertServiceRequests.pendingCount);
    expect(count).toBe(2);
  });

  it("returns 0 for user without expert profile", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    const count = await userT.query(api.expertServiceRequests.pendingCount);
    expect(count).toBe(0);
  });
});

// ============================================================================
// unreadCount & markAllRead — badge de notification
// ============================================================================

describe("expertServiceRequests.unreadCount / markAllRead", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function seedRequests(count: number) {
    const expertUserId = await createTestUser(t);
    const expertId = await createTestExpertProfile(t, expertUserId);
    const clientUserId = await createTestUser(t, { email: "client@test.com" });
    const clientT = asUser(t, clientUserId);
    const expertT = asUser(t, expertUserId);

    for (let i = 0; i < count; i++) {
      await clientT.mutation(api.expertServiceRequests.create, {
        expertId: expertId as any,
        requestType: "devis" as const,
        serviceType: "architecture",
        description: `Request ${i}`,
        userPhone: "+216 99 000 000",
        userEmail: "client@test.com",
        userName: "Client",
      });
    }
    return { expertT };
  }

  it("counts every new request as unread before consultation", async () => {
    const { expertT } = await seedRequests(2);
    const count = await expertT.query(api.expertServiceRequests.unreadCount);
    expect(count).toBe(2);
  });

  it("markAllRead clears the unread badge once consulted", async () => {
    const { expertT } = await seedRequests(2);
    await expertT.mutation(api.expertServiceRequests.markAllRead);

    const count = await expertT.query(api.expertServiceRequests.unreadCount);
    expect(count).toBe(0);

    const requests = await expertT.query(api.expertServiceRequests.getByExpert);
    expect(requests).toHaveLength(2);
    for (const r of requests) {
      expect(typeof r.readAt).toBe("number");
    }
  });

  it("markAllRead is idempotent and only stamps unread requests", async () => {
    const { expertT } = await seedRequests(1);
    await expertT.mutation(api.expertServiceRequests.markAllRead);
    const first = await expertT.query(api.expertServiceRequests.getByExpert);
    const firstReadAt = first[0].readAt;

    await expertT.mutation(api.expertServiceRequests.markAllRead);
    const second = await expertT.query(api.expertServiceRequests.getByExpert);
    expect(second[0].readAt).toBe(firstReadAt);
  });

  it("returns 0 for user without expert profile", async () => {
    const userId = await createTestUser(t);
    const userT = asUser(t, userId);

    const count = await userT.query(api.expertServiceRequests.unreadCount);
    expect(count).toBe(0);
  });
});

// ============================================================================
// Réponses côté client — getMyResponses / responsesUnreadCount / responsesMarkAllRead
// ============================================================================

describe("expertServiceRequests responses (client badge)", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function seedResponses(count: number) {
    const expertUserId = await createTestUser(t, { email: "expert@test.com" });
    const expertId = await createTestExpertProfile(t, expertUserId);
    const clientUserId = await createTestUser(t, { email: "client@test.com" });
    const clientT = asUser(t, clientUserId);
    const expertT = asUser(t, expertUserId);

    const res = await clientT.mutation(api.expertServiceRequests.create, {
      expertId: expertId as any,
      requestType: "devis" as const,
      serviceType: "architecture",
      description: "Demande test",
      userPhone: "+216 99 000 000",
      userEmail: "client@test.com",
      userName: "Client",
    });

    for (let i = 0; i < count; i++) {
      await expertT.mutation(api.expertServiceRequests.respond, {
        serviceRequestId: res.requestId,
        message: `Réponse ${i}`,
      });
    }
    return { clientT };
  }

  it("getMyResponses returns expert responses addressed to the client", async () => {
    const { clientT } = await seedResponses(2);
    const responses = await clientT.query(api.expertServiceRequests.getMyResponses);
    expect(responses).toHaveLength(2);
  });

  it("responsesUnreadCount counts responses not yet consulted by the client", async () => {
    const { clientT } = await seedResponses(2);
    const count = await clientT.query(api.expertServiceRequests.responsesUnreadCount);
    expect(count).toBe(2);
  });

  it("responsesMarkAllRead clears the badge once the Messagerie is consulted", async () => {
    const { clientT } = await seedResponses(2);
    await clientT.mutation(api.expertServiceRequests.responsesMarkAllRead);

    const count = await clientT.query(api.expertServiceRequests.responsesUnreadCount);
    expect(count).toBe(0);

    const responses = await clientT.query(api.expertServiceRequests.getMyResponses);
    for (const r of responses) {
      expect(typeof r.readAt).toBe("number");
    }
  });

  it("returns 0 unread when the client received no expert response", async () => {
    const clientUserId = await createTestUser(t, { email: "lonely@test.com" });
    const clientT = asUser(t, clientUserId);

    const count = await clientT.query(api.expertServiceRequests.responsesUnreadCount);
    expect(count).toBe(0);
    expect(await clientT.query(api.expertServiceRequests.getMyResponses)).toHaveLength(0);
  });
});
