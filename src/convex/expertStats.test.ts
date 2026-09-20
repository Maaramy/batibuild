/// <reference types="vite/client" />

import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// Helpers
// ============================================================================

async function createUser(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{ role: string; name: string; email: string }> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      name: overrides.name ?? "Expert User",
      email: overrides.email ?? "expert@test.com",
      role: overrides.role ?? "user",
      status: "active",
      subscriptionPlan: "free",
      image: undefined,
      company: undefined,
      phone: "+216 99 111 111",
      subscriptionEndDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

async function createExpertProfile(
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
// Tests
// ============================================================================

describe("expertStats — recordExpertEvent", () => {
  const t = convexTest({ schema, modules });

  it("insère un événement view dans expertAnalytics", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);

    const result = await t.run(async (ctx) => {
      return ctx.runMutation(api.expertStats.recordExpertEvent, {
        expertId: expertId as any,
        eventType: "view",
      });
    });

    expect(result).toEqual({ ok: true });

    // Verify the event was stored
    const events = await t.run(async (ctx) => {
      return ctx.db
        .query("expertAnalytics")
        .withIndex("by_expert", (q) => q.eq("expertId", expertId as any))
        .collect();
    });

    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("view");
  });

  it("insère un événement contact avec source", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);

    await t.run(async (ctx) => {
      return ctx.runMutation(api.expertStats.recordExpertEvent, {
        expertId: expertId as any,
        eventType: "contact",
        source: "direct",
      });
    });

    const events = await t.run(async (ctx) => {
      return ctx.db
        .query("expertAnalytics")
        .withIndex("by_expert", (q) => q.eq("expertId", expertId as any))
        .collect();
    });

    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("contact");
    expect(events[0].source).toBe("direct");
  });
});

describe("expertStats — getExpertKPIs", () => {
  const t = convexTest({ schema, modules });

  it("retourne des compteurs à 0 quand aucun événement n'existe", async () => {
    const userId = await createUser(t);
    await createExpertProfile(t, userId);

    const kpis = (await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertKPIs, { period: "30d" });
    }))!;

    expect(kpis.views).toBe(0);
    expect(kpis.requestsReceived).toBe(0);
    expect(kpis.responsesSent).toBe(0);
    expect(kpis.responseRate).toBe(0);
  });

  it("compte les vues correctement", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);

    // Record 3 views
    for (let i = 0; i < 3; i++) {
      await t.run(async (ctx) => {
        return ctx.runMutation(api.expertStats.recordExpertEvent, {
          expertId: expertId as any,
          eventType: "view",
        });
      });
    }

    const kpis = (await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertKPIs, { period: "30d" });
    }))!;

    expect(kpis.views).toBe(3);
  });

  it("compte les demandes reçues depuis expertServiceRequests", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);

    // Insert 2 service requests
    await t.run(async (ctx) => {
      await ctx.db.insert("expertServiceRequests", {
        userId: userId as any,
        expertId: expertId as any,
        requestType: "devis",
        serviceType: "architecture",
        description: "Test request 1",
        userPhone: "+216 99 000 000",
        userEmail: "user@test.com",
        userName: "Test User",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("expertServiceRequests", {
        userId: userId as any,
        expertId: expertId as any,
        requestType: "service",
        serviceType: "engineering",
        description: "Test request 2",
        userPhone: "+216 99 000 000",
        userEmail: "user@test.com",
        userName: "Test User",
        status: "responded",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const kpis = (await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertKPIs, { period: "30d" });
    }))!;

    expect(kpis.requestsReceived).toBe(2);
  });

  it("calcule le taux de réponse", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);

    await t.run(async (ctx) => {
      // 3 requests
      for (let i = 0; i < 3; i++) {
        await ctx.db.insert("expertServiceRequests", {
          userId: userId as any,
          expertId: expertId as any,
          requestType: "devis",
          serviceType: "architecture",
          description: `Request ${i}`,
          userPhone: "+216 99 000 000",
          userEmail: "user@test.com",
          userName: "Test User",
          status: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      // 2 responses
      const requests = await ctx.db
        .query("expertServiceRequests")
        .withIndex("by_expert", (q) => q.eq("expertId", expertId as any))
        .collect();
      for (let i = 0; i < 2; i++) {
        await ctx.db.insert("expertServiceResponses", {
          serviceRequestId: requests[i]._id,
          expertId: expertId as any,
          userId: userId as any,
          message: `Response ${i}`,
          createdAt: Date.now(),
        });
      }
    });

    const kpis = (await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertKPIs, { period: "30d" });
    }))!;

    expect(kpis.requestsReceived).toBe(3);
    expect(kpis.responsesSent).toBe(2);
    expect(kpis.responseRate).toBe(67); // 2/3 * 100 = 66.67 → rounded to 67
  });

  it("filtrage par période fonctionne", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);

    // Insert an event from 60 days ago (outside 30d window)
    await t.run(async (ctx) => {
      await ctx.db.insert("expertAnalytics", {
        expertId: expertId as any,
        date: Date.now() - 60 * 24 * 60 * 60 * 1000,
        eventType: "view",
      });
      // Insert a recent event
      await ctx.db.insert("expertAnalytics", {
        expertId: expertId as any,
        date: Date.now(),
        eventType: "view",
      });
    });

    const kpis30d = (await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertKPIs, { period: "30d" });
    }))!;

    const kpis90d = (await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertKPIs, { period: "90d" });
    }))!;

    expect(kpis30d.views).toBe(1); // only recent
    expect(kpis90d.views).toBe(2); // both
  });

  it("expose le détail performance (clics, contacts, rendez-vous, urgences)", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);
    const clientId = await createUser(t, { email: "client@test.com" });

    await t.run(async (ctx) => {
      // 4 vues, 2 clics, 1 contact
      for (const eventType of [
        "view",
        "view",
        "view",
        "view",
        "click",
        "click",
        "contact",
      ] as const) {
        await ctx.db.insert("expertAnalytics", {
          expertId: expertId as any,
          date: Date.now(),
          eventType,
        });
      }
      // 1 demande en attente
      await ctx.db.insert("expertServiceRequests", {
        userId: clientId as any,
        expertId: expertId as any,
        requestType: "devis",
        serviceType: "devis",
        description: "Demande",
        userPhone: "+216 99 000 000",
        userEmail: "client@test.com",
        userName: "Client Test",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      // 2 rendez-vous dont 1 confirmé, 1 urgence acceptée
      const now = Date.now();
      await ctx.db.insert("expertAppointments", {
        userId: clientId as any,
        expertId: expertId as any,
        preferredDate: now,
        preferredTime: "09:00",
        reason: "Visite",
        status: "approved",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("expertAppointments", {
        userId: clientId as any,
        expertId: expertId as any,
        preferredDate: now,
        preferredTime: "10:00",
        reason: "Devis",
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("expertUrgentRequests", {
        userId: clientId as any,
        expertId: expertId as any,
        description: "Fuite importante",
        region: "beja",
        userPhone: "+216 99 000 000",
        status: "accepted",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("expertRatings", {
        expertId: expertId as any,
        userId: clientId as any,
        rating: 5,
        createdAt: now,
      });
    });

    const kpis = (await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertKPIs, { period: "30d" });
    }))!;

    expect(kpis.views).toBe(4);
    expect(kpis.clicks).toBe(2);
    expect(kpis.contacts).toBe(1);
    expect(kpis.contactRate).toBe(25); // 1 contact / 4 vues
    expect(kpis.pendingRequests).toBe(1);
    expect(kpis.appointments).toBe(2);
    expect(kpis.appointmentsApproved).toBe(1);
    expect(kpis.appointmentsPending).toBe(1);
    expect(kpis.urgentRequests).toBe(1);
    expect(kpis.urgentAccepted).toBe(1);
    expect(kpis.avgRating).toBe(5);
    expect(kpis.totalRatings).toBe(1);
  });
});

// ============================================================================
// Séries, répartitions et lecture de l'activité
// ============================================================================

describe("expertStats — séries et répartitions", () => {
  const t = convexTest({ schema, modules });

  it("getExpertViewsOverTime renvoie une série journalière continue", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("expertAnalytics", {
        expertId: expertId as any,
        date: now,
        eventType: "view",
      });
      await ctx.db.insert("expertAnalytics", {
        expertId: expertId as any,
        date: now,
        eventType: "contact",
      });
      // Hors période : jamais compté sur 7 jours
      await ctx.db.insert("expertAnalytics", {
        expertId: expertId as any,
        date: now - 60 * 24 * 60 * 60 * 1000,
        eventType: "view",
      });
    });

    const series = await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertViewsOverTime, {
        period: "7d",
      });
    });

    // 8 jours de série (aujourd'hui compris), dont les jours vides à 0
    expect(series.length).toBeGreaterThanOrEqual(7);
    expect(series.every((d) => typeof d.views === "number")).toBe(true);

    const today = series[series.length - 1];
    expect(today.views).toBe(1);
    expect(today.contacts).toBe(1);

    const totalViews = series.reduce((s, d) => s + d.views, 0);
    expect(totalViews).toBe(1); // l'événement de 60 jours est exclu
  });

  it("getExpertTrafficSources regroupe les visites par source", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);

    await t.run(async (ctx) => {
      for (const source of ["search", "search", "social"] as const) {
        await ctx.db.insert("expertAnalytics", {
          expertId: expertId as any,
          date: Date.now(),
          eventType: "view",
          source,
        });
      }
      await ctx.db.insert("expertAnalytics", {
        expertId: expertId as any,
        date: Date.now(),
        eventType: "view",
      });
    });

    const sources = await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertTrafficSources, {
        period: "30d",
      });
    });

    expect(sources[0]).toEqual({ name: "search", value: 2 });
    expect(sources).toContainEqual({ name: "social", value: 1 });
    // Sans source explicite, l'événement est classé « other »
    expect(sources).toContainEqual({ name: "other", value: 1 });
  });

  it("getExpertDemandBreakdown sépare devis, services, rendez-vous et urgences", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);
    const clientId = await createUser(t, { email: "client2@test.com" });
    const now = Date.now();

    await t.run(async (ctx) => {
      for (const requestType of ["devis", "service", "service"] as const) {
        await ctx.db.insert("expertServiceRequests", {
          userId: clientId as any,
          expertId: expertId as any,
          requestType,
          serviceType: requestType,
          description: "Demande",
          userPhone: "+216 99 000 000",
          userEmail: "client2@test.com",
          userName: "Client",
          status: "pending",
          createdAt: now,
          updatedAt: now,
        });
      }
      await ctx.db.insert("expertAppointments", {
        userId: clientId as any,
        expertId: expertId as any,
        preferredDate: now,
        preferredTime: "09:00",
        reason: "Visite",
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("expertUrgentRequests", {
        userId: clientId as any,
        expertId: expertId as any,
        description: "Urgence",
        userPhone: "+216 99 000 000",
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    });

    const breakdown = await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertDemandBreakdown, {
        period: "30d",
      });
    });

    expect(breakdown).toEqual([
      { name: "Devis", value: 1 },
      { name: "Services experts", value: 2 },
      { name: "Rendez-vous", value: 1 },
      { name: "Urgences", value: 1 },
    ]);
  });

  it("getExpertRegions classe les régions par volume de demandes", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);
    const clientId = await createUser(t, { email: "client3@test.com" });
    const now = Date.now();

    await t.run(async (ctx) => {
      for (const region of ["beja", "beja", "tunis"] as const) {
        await ctx.db.insert("expertServiceRequests", {
          userId: clientId as any,
          expertId: expertId as any,
          requestType: "devis",
          serviceType: "devis",
          description: "Demande",
          region,
          userPhone: "+216 99 000 000",
          userEmail: "client3@test.com",
          userName: "Client",
          status: "pending",
          createdAt: now,
          updatedAt: now,
        });
      }
      // Sans région : ignorée
      await ctx.db.insert("expertUrgentRequests", {
        userId: clientId as any,
        expertId: expertId as any,
        description: "Urgence sans région",
        userPhone: "+216 99 000 000",
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    });

    const regions = await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertRegions, { period: "30d" });
    });

    expect(regions).toEqual([
      { name: "beja", value: 2 },
      { name: "tunis", value: 1 },
    ]);
  });

  it("getExpertDemandTable calcule demandes, réponses, taux et en attente", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);
    const clientId = await createUser(t, { email: "client4@test.com" });
    const now = Date.now();

    await t.run(async (ctx) => {
      const requestIds: any[] = [];
      for (const status of ["pending", "responded", "pending"] as const) {
        requestIds.push(
          await ctx.db.insert("expertServiceRequests", {
            userId: clientId as any,
            expertId: expertId as any,
            requestType: "devis",
            serviceType: "devis",
            description: "Demande",
            userPhone: "+216 99 000 000",
            userEmail: "client4@test.com",
            userName: "Client",
            status,
            createdAt: now,
            updatedAt: now,
          }),
        );
      }
      await ctx.db.insert("expertServiceResponses", {
        serviceRequestId: requestIds[1],
        expertId: expertId as any,
        userId: clientId as any,
        message: "Voici mon offre",
        createdAt: now,
      });
    });

    const table = await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertDemandTable, {
        period: "30d",
      });
    });

    const devisRow = table.find((r) => r.key === "devis")!;
    expect(devisRow.requests).toBe(3);
    expect(devisRow.responses).toBe(1);
    expect(devisRow.rate).toBe(33); // 1/3
    expect(devisRow.pending).toBe(2);
    expect(devisRow.lastAt).toBeGreaterThan(0);

    // Les types sans demande restent présents mais à zéro
    expect(table.find((r) => r.key === "urgent")!.requests).toBe(0);
  });

  it("getExpertRecentActivity fusionne et trie les interactions", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);
    const clientId = await createUser(t, { email: "client5@test.com" });
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("expertServiceRequests", {
        userId: clientId as any,
        expertId: expertId as any,
        requestType: "devis",
        serviceType: "devis",
        description: "Devis plomberie",
        userPhone: "+216 99 000 000",
        userEmail: "client5@test.com",
        userName: "Amine",
        status: "pending",
        createdAt: now - 2 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      });
      await ctx.db.insert("expertAppointments", {
        userId: clientId as any,
        expertId: expertId as any,
        preferredDate: now,
        preferredTime: "09:00",
        reason: "Visite de chantier",
        userName: "Sonia",
        status: "approved",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("expertRatings", {
        expertId: expertId as any,
        userId: clientId as any,
        rating: 4,
        comment: "Travail soigné",
        createdAt: now - 20 * 24 * 60 * 60 * 1000,
      });
    });

    const activity = await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertRecentActivity, {
        period: "30d",
      });
    });

    expect(activity.length).toBe(3);
    // Plus récente en premier
    expect(activity[0].kind).toBe("appointment");
    expect(activity[0].title).toBe("Sonia");
    expect(activity.map((a) => a.kind)).toContain("rating");
    const rating = activity.find((a) => a.kind === "rating")!;
    expect(rating.subtitle).toBe("Travail soigné");

    // Hors période
    const shortActivity = await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertRecentActivity, {
        period: "7d",
      });
    });
    expect(shortActivity.map((a) => a.kind)).not.toContain("rating");
  });
});

// ============================================================================
// Visibilité et complétude du profil
// ============================================================================

describe("expertStats — visibilité et complétude", () => {
  const t = convexTest({ schema, modules });

  it("getExpertVisibility classe le profil parmi les experts visibles du même métier", async () => {
    const myUserId = await createUser(t, { email: "moi@test.com" });
    const myExpertId = await createExpertProfile(t, myUserId);
    const peerUserId = await createUser(t, { email: "peer@test.com" });
    const peerExpertId = await createExpertProfile(t, peerUserId);
    const hiddenUserId = await createUser(t, { email: "hidden@test.com" });
    const hiddenExpertId = await createExpertProfile(t, hiddenUserId);
    const clientId = await createUser(t, { email: "client6@test.com" });

    await t.run(async (ctx) => {
      // Le pair est mieux noté → il passe devant
      await ctx.db.insert("expertRatings", {
        expertId: peerExpertId as any,
        userId: clientId as any,
        rating: 5,
        createdAt: Date.now(),
      });
      // Un profil masqué est exclu du classement
      await ctx.db.patch(hiddenExpertId, { isVisible: false });
    });

    const visibility = (await asUser(t, myUserId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertVisibility, {});
    }))!;

    expect(visibility.total).toBe(2); // le profil masqué n'est pas compté
    expect(visibility.rank).toBe(2);
    expect(visibility.isVisible).toBe(true);
    expect(visibility.profession).toBe("architecte");

    // Aucun profil → réponse nulle, pas d'erreur
    const otherUser = await createUser(t, { email: "sans-profil@test.com" });
    const none = await asUser(t, otherUser).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertVisibility, {});
    });
    expect(none).toBeNull();

    // Le profil reste compté même masqué (statut affiché à l'expert)
    const hiddenVisibility = (await asUser(t, hiddenUserId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertVisibility, {});
    }))!;
    expect(hiddenVisibility.isVisible).toBe(false);
    expect(hiddenVisibility.rank).toBeNull();
  });

  it("getExpertProfileCompleteness liste les informations manquantes", async () => {
    const userId = await createUser(t);
    const expertId = await createExpertProfile(t, userId);

    const before = (await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertProfileCompleteness, {});
    }))!;

    expect(before.total).toBeGreaterThan(0);
    expect(before.score).toBeLessThan(100);
    const keys = before.missing.map((m) => m.key);
    expect(keys).toContain("logo");
    expect(keys).toContain("description");
    expect(keys).toContain("indicativePrice");
    // Le téléphone et l'e-mail sont déjà renseignés par le helper
    expect(keys).not.toContain("phone");
    expect(before.filled + before.missing.length).toBe(before.total);

    await t.run(async (ctx) => {
      await ctx.db.patch(expertId, {
        logo: "https://cdn.test/logo.png",
        description: "Artisan expérimenté",
        companyName: "Atelier Test",
        address: "12 rue du Chantier, Béja",
        website: "https://atelier.test",
        indicativePrice: "À partir de 80 TND",
        availability: "appointment",
      });
    });

    const after = (await asUser(t, userId).run(async (ctx) => {
      return ctx.runQuery(api.expertStats.getExpertProfileCompleteness, {});
    }))!;

    expect(after.score).toBe(100);
    expect(after.missing).toEqual([]);
  });
});
