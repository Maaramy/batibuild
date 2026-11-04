/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api, internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// CAMPAGNES MARKETING — tests du module « Offres »
// ----------------------------------------------------------------------------
// Le circuit est testé sans réseau : `deliverBatch` met les e-mails en file
// (`emailHistory`) et planifie l'action SMTP ; le serveur SMTP lui-même n'est
// jamais appelé dans les tests.
// ============================================================================

type T = ReturnType<typeof convexTest>;

const SMTP_ENV_KEYS = [
  "SMTP_HOST",
  "SMTP_FROM",
  "SMTP_FROM_NAME",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
];

/** Isolement : la configuration SMTP d'environnement ne fausse pas les tests. */
function clearSmtpEnv() {
  for (const key of SMTP_ENV_KEYS) delete process.env[key];
}

async function createUser(
  t: T,
  overrides: {
    name?: string;
    email: string;
    role?: string;
    userRole?: "client" | "expert" | "supplier";
    marketingOptOut?: boolean;
    clientProPaidProjectsGranted?: number;
    clientProPaidProjectsUsed?: number;
    status?: "active" | "disabled";
  },
): Promise<Id<"users">> {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: overrides.name ?? "Utilisateur Test",
      email: overrides.email,
      role: (overrides.role ?? "user") as any,
      status: overrides.status ?? "active",
      userRole: overrides.userRole ?? "client",
      marketingOptOut: overrides.marketingOptOut,
      clientProPaidProjectsGranted: overrides.clientProPaidProjectsGranted,
      clientProPaidProjectsUsed: overrides.clientProPaidProjectsUsed,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

async function createAdmin(t: T): Promise<Id<"users">> {
  return createUser(t, { name: "Admin Test", email: "admin@test.tn", role: "admin" });
}

async function configureEmail(t: T, senderEmail = "contact@batibuild.tn") {
  await t.run(async (ctx) => {
    const existing = await ctx.db.query("emailConfig").order("desc").first();
    const doc = {
      senderName: "batibuild",
      senderEmail,
      autoEnabled: true,
      updatedAt: Date.now(),
    };
    if (existing) await ctx.db.patch(existing._id, doc);
    else await ctx.db.insert("emailConfig", doc as any);
  });
}

function asUser(t: T, userId: Id<"users"> | string) {
  return t.withIdentity({ subject: userId });
}

async function saveDraft(
  t: T,
  adminId: Id<"users">,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const res = await asUser(t, adminId).mutation(api.marketing.saveCampaign, {
    name: "Campagne test",
    category: "client_pro",
    subject: "Bonjour {{prenom}}, découvrez Batibuild",
    intro: "Bonjour {{prenom}},\n\nVoici notre offre du moment.",
    body: "- Estimer votre budget.\n- Trouver un professionnel.",
    ctaLabel: "Découvrir",
    ctaUrl: "/dashboard",
    feedbackEnabled: false,
    audienceSegments: ["client_pro_all"],
    ...overrides,
  } as any);
  return (res as any).campaignId as string;
}

describe("module Offres — campagnes marketing", () => {
  let t: T;

  beforeEach(() => {
    clearSmtpEnv();
    t = convexTest(schema, modules);
  });

  it("1. réservé aux administrateurs (lecture, écriture, envoi)", async () => {
    const adminId = await createAdmin(t);
    const clientId = await createUser(t, { email: "client@test.tn" });
    const campaignId = await saveDraft(t, adminId);

    expect(await asUser(t, clientId).query(api.marketing.listCampaigns, {})).toEqual([]);
    expect(await asUser(t, clientId).query(api.marketing.getDashboardStats, {})).toBeNull();
    expect(await asUser(t, clientId).query(api.marketing.listFeedback, {})).toEqual([]);

    await expect(
      asUser(t, clientId).mutation(api.marketing.saveCampaign, {
        name: "Pirate",
        category: "client_pro",
        subject: "x",
        intro: "x",
        body: "",
        feedbackEnabled: false,
        audienceSegments: ["client_pro_all"],
      } as any),
    ).rejects.toThrow(/administrateur/i);

    await expect(
      asUser(t, clientId).mutation(api.marketing.startCampaign, { campaignId: campaignId as any }),
    ).rejects.toThrow(/administrateur/i);
  });

  it("2. brouillon enregistré, modifiable, avec validations", async () => {
    const adminId = await createAdmin(t);
    const clientId = await createUser(t, { email: "client@test.tn" });

    await expect(
      asUser(t, adminId).mutation(api.marketing.saveCampaign, {
        name: "   ",
        category: "client_pro",
        subject: "Objet",
        intro: "Intro",
        body: "",
        feedbackEnabled: false,
        audienceSegments: ["client_pro_all"],
      } as any),
    ).rejects.toThrow(/nom de la campagne/i);

    await expect(
      asUser(t, adminId).mutation(api.marketing.saveCampaign, {
        name: "Sans audience",
        category: "client_pro",
        subject: "Objet",
        intro: "Intro",
        body: "",
        feedbackEnabled: false,
        audienceSegments: [],
      } as any),
    ).rejects.toThrow(/au moins un segment/i);

    const campaignId = await saveDraft(t, adminId, { audienceSegments: ["client_pro_all"] });

    const stored = await asUser(t, adminId).query(api.marketing.getCampaign, {
      campaignId: campaignId as any,
    });
    expect(stored?.campaign.status).toBe("draft");
    expect(stored?.campaign.subject).toContain("{{prenom}}");

    await asUser(t, adminId).mutation(api.marketing.saveCampaign, {
      campaignId: campaignId as any,
      name: "Campagne test",
      category: "client_pro",
      subject: "Nouvel objet",
      intro: "Intro",
      body: "",
      feedbackEnabled: false,
      audienceSegments: ["client_pro_all"],
    } as any);

    const updated = await asUser(t, adminId).query(api.marketing.getCampaign, {
      campaignId: campaignId as any,
    });
    expect(updated?.campaign.subject).toBe("Nouvel objet");
    expect(updated?.campaign.audienceSegments).toEqual(["client_pro_all"]);

    // La présence d'un client n'a créé aucun destinataire avant l'envoi.
    const recipients = await asUser(t, adminId).query(api.marketing.getCampaign, {
      campaignId: campaignId as any,
    });
    expect(recipients?.recipients).toHaveLength(0);
    expect(clientId).toBeTruthy();
  });

  it("3. audiences : segments, actifs/inactifs, sélection, consentement, sans doublon", async () => {
    const adminId = await createAdmin(t);
    const activeClient = await createUser(t, {
      email: "actif@test.tn",
      clientProPaidProjectsGranted: 5,
      clientProPaidProjectsUsed: 1,
    });
    const inactiveClient = await createUser(t, { email: "inactif@test.tn" });
    const optedOut = await createUser(t, { email: "desinscrit@test.tn", marketingOptOut: true });
    const expertActive = await createUser(t, { email: "expert-actif@test.tn", userRole: "expert" });
    const expertInactive = await createUser(t, { email: "expert-inactif@test.tn", userRole: "expert" });
    const supplier = await createUser(t, { email: "fournisseur@test.tn", userRole: "supplier" });
    await createUser(t, { email: "moderateur@test.tn", role: "moderator" });

    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("expertProfiles", {
        userId: expertActive,
        profession: "architecte",
        displayName: "Expert Actif",
        phone: "20000000",
        email: "expert-actif@test.tn",
        specialties: [],
        regions: [],
        plan: "monthly",
        subscriptionStatus: "active",
        subscriptionEndDate: now + 10 * 86_400_000,
        isVisible: true,
        createdAt: now,
        updatedAt: now,
      } as any);
      await ctx.db.insert("expertProfiles", {
        userId: expertInactive,
        profession: "architecte",
        displayName: "Expert Inactif",
        phone: "20000001",
        email: "expert-inactif@test.tn",
        specialties: [],
        regions: [],
        plan: "none",
        subscriptionStatus: "inactive",
        isVisible: false,
        createdAt: now,
        updatedAt: now,
      } as any);
      await ctx.db.insert("supplierProfiles", {
        userId: supplier,
        companyName: "Fournisseur SARL",
        phone: "71000000",
        email: "fournisseur@test.tn",
        address: "Tunis",
        specialties: [],
        regions: [],
        plan: "monthly",
        subscriptionStatus: "active",
        subscriptionEndDate: now + 10 * 86_400_000,
        isVisible: true,
        createdAt: now,
        updatedAt: now,
      } as any);
    });

    const clients = await asUser(t, adminId).query(api.marketing.previewAudience, {
      segments: ["client_pro_all"],
    });
    expect(clients?.total).toBe(2);
    expect(clients?.sample.map((u) => u.email).sort()).toEqual(["actif@test.tn", "inactif@test.tn"]);
    expect(clients?.sample.some((u) => u.email === "desinscrit@test.tn")).toBe(false);

    const active = await asUser(t, adminId).query(api.marketing.previewAudience, {
      segments: ["client_pro_active"],
    });
    expect(active?.total).toBe(1);
    expect(active?.sample[0].email).toBe("actif@test.tn");

    const inactive = await asUser(t, adminId).query(api.marketing.previewAudience, {
      segments: ["client_pro_inactive"],
    });
    expect(inactive?.total).toBe(1);
    expect(inactive?.sample[0].email).toBe("inactif@test.tn");

    const experts = await asUser(t, adminId).query(api.marketing.previewAudience, {
      segments: ["expert_all"],
    });
    expect(experts?.total).toBe(2);
    const activeExperts = await asUser(t, adminId).query(api.marketing.previewAudience, {
      segments: ["expert_active"],
    });
    expect(activeExperts?.total).toBe(1);

    // Deux segments qui se recoupent : chaque personne n'est comptée qu'une fois.
    const overlap = await asUser(t, adminId).query(api.marketing.previewAudience, {
      segments: ["client_pro_all", "client_pro_active"],
    });
    expect(overlap?.total).toBe(2);

    // Sélection individuelle, y compris hors segment.
    const selected = await asUser(t, adminId).query(api.marketing.previewAudience, {
      segments: [],
      userIds: [supplier],
    });
    expect(selected?.total).toBe(1);
    expect(selected?.sample[0].email).toBe("fournisseur@test.tn");

    // La sélection d'un désinscrit reste exclue.
    const selectedOptOut = await asUser(t, adminId).query(api.marketing.previewAudience, {
      segments: [],
      userIds: [optedOut],
    });
    expect(selectedOptOut?.total).toBe(0);
  });

  it("4. envoi : destinataires figés, e-mails personnalisés, pas de doublon", async () => {
    const adminId = await createAdmin(t);
    await configureEmail(t);
    const amine = await createUser(t, {
      name: "Amine Ben Salah",
      email: "amine@test.tn",
      clientProPaidProjectsGranted: 2,
    });
    const sara = await createUser(t, { name: "Sara Trabelsi", email: "sara@test.tn" });
    const deselected = await createUser(t, {
      name: "Exclu",
      email: "exclu@test.tn",
      marketingOptOut: true,
    });

    const campaignId = await saveDraft(t, adminId, {
      feedbackEnabled: true,
      ctaLabel: "Estimer mon projet",
      ctaUrl: "/dashboard/new",
    });

    const started = await asUser(t, adminId).mutation(api.marketing.startCampaign, {
      campaignId: campaignId as any,
    });
    expect(started.recipients).toBe(2);

    const pending = await asUser(t, adminId).query(api.marketing.getCampaign, {
      campaignId: campaignId as any,
    });
    expect(pending?.recipients).toHaveLength(2);
    expect(pending?.recipients.every((r) => r.status === "pending")).toBe(true);

    await t.mutation(internal.marketing.deliverBatch, { campaignId: campaignId as any });

    const emails = await t.run(async (ctx) => ctx.db.query("emailHistory").collect());
    expect(emails).toHaveLength(2);
    const byAddress = new Map(emails.map((e) => [e.to, e]));
    expect(byAddress.get("amine@test.tn")?.subject).toBe("Bonjour Amine, découvrez Batibuild");
    expect(byAddress.get("sara@test.tn")?.subject).toBe("Bonjour Sara, découvrez Batibuild");
    expect(byAddress.has("exclu@test.tn")).toBe(false);

    const html = (byAddress.get("amine@test.tn")?.payloadJson as string) ?? "";
    expect(html).toBeTruthy();
    void deselected;

    const recipients = await t.run(async (ctx) =>
      ctx.db
        .query("marketingRecipients")
        .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId as any))
        .collect(),
    );
    expect(recipients).toHaveLength(2);
    expect(new Set(recipients.map((r) => r.token)).size).toBe(2);
    expect(recipients.every((r) => r.status === "sent")).toBe(true);

    const after = await asUser(t, adminId).query(api.marketing.getCampaign, {
      campaignId: campaignId as any,
    });
    expect(after?.campaign.status).toBe("sent");
    expect(after?.campaign.stats.delivered).toBe(2);
    expect(after?.campaign.stats.recipients).toBe(2);

    // Relancer un lot ne renvoie rien.
    await t.mutation(internal.marketing.deliverBatch, { campaignId: campaignId as any });
    const emailsAfter = await t.run(async (ctx) => ctx.db.query("emailHistory").collect());
    expect(emailsAfter).toHaveLength(2);

    // Un second envoi de la même campagne est refusé.
    await expect(
      asUser(t, adminId).mutation(api.marketing.startCampaign, {
        campaignId: campaignId as any,
      }),
    ).rejects.toThrow(/déjà été envoyée|en cours/i);
  });

  it("5. l'e-mail est mis en file avec l'objet personnalisé et un jeton unique", async () => {
    const adminId = await createAdmin(t);
    await configureEmail(t);
    await createUser(t, {
      name: "Amine Ben Salah",
      email: "amine@test.tn",
      clientProPaidProjectsGranted: 1,
    });

    const campaignId = await saveDraft(t, adminId, {
      feedbackEnabled: true,
      ctaLabel: "Mon espace",
      ctaUrl: "/dashboard",
      body: "Bonjour {{prenom}} {{nom}}, votre espace : {{lien_espace_personnel}}",
      name: "Campagne personnalisée",
    });

    await asUser(t, adminId).mutation(api.marketing.startCampaign, {
      campaignId: campaignId as any,
    });
    await t.mutation(internal.marketing.deliverBatch, { campaignId: campaignId as any });

    const recipients = await t.run(async (ctx) =>
      ctx.db
        .query("marketingRecipients")
        .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId as any))
        .collect(),
    );
    expect(recipients[0].token).toMatch(/^[0-9a-f]{48}$/);

    const emails = await t.run(async (ctx) => ctx.db.query("emailHistory").collect());
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe("amine@test.tn");
    expect(emails[0].subject).toBe("Bonjour Amine, découvrez Batibuild");
    expect(emails[0].templateKey).toBe("marketing:custom");

    // Le HTML (variables, pixel, clic, désinscription) est produit par le
    // moteur partagé, testé unitairement dans `src/lib/marketingEmail.test.ts`.
    const payload = JSON.parse(emails[0].payloadJson || "{}");
    expect(payload.feedbackUrl).toContain(`/avis?c=${campaignId}&t=${recipients[0].token}`);
  });

  it("6. ouverture, clic et personas suivis une seule fois", async () => {
    const adminId = await createAdmin(t);
    await configureEmail(t);
    await createUser(t, {
      name: "Amine",
      email: "amine@test.tn",
      clientProPaidProjectsGranted: 1,
    });
    const campaignId = await saveDraft(t, adminId);

    await asUser(t, adminId).mutation(api.marketing.startCampaign, {
      campaignId: campaignId as any,
    });
    await t.mutation(internal.marketing.deliverBatch, { campaignId: campaignId as any });

    const recipients = await t.run(async (ctx) =>
      ctx.db
        .query("marketingRecipients")
        .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId as any))
        .collect(),
    );
    const token = recipients[0].token;

    await t.mutation(internal.marketing.trackOpen, { token });
    await t.mutation(internal.marketing.trackOpen, { token });
    await t.mutation(internal.marketing.trackClick, {
      token,
      url: "https://batibuild.app/dashboard",
    });
    await t.mutation(internal.marketing.trackClick, {
      token,
      url: "https://batibuild.app/dashboard",
    });

    const data = await asUser(t, adminId).query(api.marketing.getCampaign, {
      campaignId: campaignId as any,
    });
    expect(data?.campaign.stats.opened).toBe(1);
    expect(data?.campaign.stats.clicked).toBe(1);
    expect(data?.campaign.stats.conversions).toBe(1);
    expect(data?.recipients[0].openedAt).toBeTruthy();
    expect(data?.recipients[0].clickedAt).toBeTruthy();

    // Une destination non http(s) n'est jamais suivie.
    const res = await t.mutation(internal.marketing.trackClick, {
      token,
      url: "javascript:alert(1)",
    });
    expect(res.url).toBe("https://batibuild.app");
  });

  it("7. évaluation : page publique, un seul avis par personne, statistiques à jour", async () => {
    const adminId = await createAdmin(t);
    await configureEmail(t);
    await createUser(t, {
      name: "Amine",
      email: "amine@test.tn",
      clientProPaidProjectsGranted: 1,
    });
    const campaignId = await saveDraft(t, adminId, { feedbackEnabled: true });

    await asUser(t, adminId).mutation(api.marketing.startCampaign, {
      campaignId: campaignId as any,
    });
    await t.mutation(internal.marketing.deliverBatch, { campaignId: campaignId as any });

    const recipients = await t.run(async (ctx) =>
      ctx.db
        .query("marketingRecipients")
        .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId as any))
        .collect(),
    );
    const token = recipients[0].token;

    const context = await t.query(api.marketing.getFeedbackContext, {
      campaignId: campaignId as any,
      token,
    });
    expect(context?.alreadySubmitted).toBe(false);
    expect(context?.campaignName).toBe("Campagne test");

    expect(
      await t.query(api.marketing.getFeedbackContext, {
        campaignId: campaignId as any,
        token: "jeton-invalide",
      }),
    ).toBeNull();

    await t.mutation(api.marketing.submitFeedback, {
      campaignId: campaignId as any,
      token,
      rating: 4,
      comment: "Très utile",
    });

    await expect(
      t.mutation(api.marketing.submitFeedback, {
        campaignId: campaignId as any,
        token,
        rating: 5,
      }),
    ).rejects.toThrow(/déjà évalué/i);

    expect(
      await t.query(api.marketing.getFeedbackContext, {
        campaignId: campaignId as any,
        token,
      }),
    ).toMatchObject({ alreadySubmitted: true, existingRating: 4 });

    const adminView = await asUser(t, adminId).query(api.marketing.listFeedback, {});
    expect(adminView).toHaveLength(1);
    expect(adminView[0]).toMatchObject({ rating: 4, comment: "Très utile" });

    const data = await asUser(t, adminId).query(api.marketing.getCampaign, {
      campaignId: campaignId as any,
    });
    expect(data?.campaign.stats.feedbacks).toBe(1);

    const stats = await asUser(t, adminId).query(api.marketing.getDashboardStats, {});
    expect(stats?.totals.feedbacks).toBe(1);
    expect(stats?.totals.averageRating).toBe(4);
  });

  it("8. désinscription : exclu immédiatement des campagnes suivantes", async () => {
    const adminId = await createAdmin(t);
    await configureEmail(t);
    const userId = await createUser(t, {
      name: "Amine",
      email: "amine@test.tn",
      clientProPaidProjectsGranted: 1,
    });
    await createUser(t, {
      name: "Sara",
      email: "sara@test.tn",
      clientProPaidProjectsGranted: 1,
    });

    const first = await saveDraft(t, adminId);
    await asUser(t, adminId).mutation(api.marketing.startCampaign, {
      campaignId: first as any,
    });
    await t.mutation(internal.marketing.deliverBatch, { campaignId: first as any });

    const recipients = await t.run(async (ctx) =>
      ctx.db
        .query("marketingRecipients")
        .withIndex("by_campaign", (q) => q.eq("campaignId", first as any))
        .collect(),
    );
    const amineRecipient = recipients.find((r) => r.userId === userId)!;

    const res = await t.mutation(internal.marketing.unsubscribe, {
      token: amineRecipient.token,
    });
    expect(res.ok).toBe(true);

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.marketingOptOut).toBe(true);

    const second = await saveDraft(t, adminId, { name: "Deuxième campagne" });
    const started = await asUser(t, adminId).mutation(api.marketing.startCampaign, {
      campaignId: second as any,
    });
    expect(started.recipients).toBe(1);
  });

  it("10. la configuration SMTP par variables d'environnement suffit (aucune config en base)", async () => {
    const adminId = await createAdmin(t);
    await createUser(t, {
      name: "Amine",
      email: "amine@test.tn",
      clientProPaidProjectsGranted: 1,
    });
    const campaignId = await saveDraft(t, adminId);

    process.env.SMTP_HOST = "smtp.exemple.tn";
    process.env.SMTP_FROM = "no-reply@batibuild.app";
    process.env.SMTP_FROM_NAME = "batibuild";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_SECURE = "tls";

    try {
      const started = await asUser(t, adminId).mutation(api.marketing.startCampaign, {
        campaignId: campaignId as any,
      });
      expect(started.recipients).toBe(1);

      await t.mutation(internal.marketing.deliverBatch, { campaignId: campaignId as any });

      const emails = await t.run(async (ctx) => ctx.db.query("emailHistory").collect());
      expect(emails).toHaveLength(1);
      expect(emails[0].status).toBe("pending");

      const data = await asUser(t, adminId).query(api.marketing.getCampaign, {
        campaignId: campaignId as any,
      });
      expect(data?.campaign.status).toBe("sent");
    } finally {
      clearSmtpEnv();
    }
  });

  it("9. programmation annulée = aucun envoi ; configuration manquante = échec explicite", async () => {
    const adminId = await createAdmin(t);
    await configureEmail(t);
    await createUser(t, {
      name: "Amine",
      email: "amine@test.tn",
      clientProPaidProjectsGranted: 1,
    });

    const campaignId = await saveDraft(t, adminId);
    await asUser(t, adminId).mutation(api.marketing.scheduleCampaign, {
      campaignId: campaignId as any,
      scheduledAt: Date.now() + 120_000,
    });
    await asUser(t, adminId).mutation(api.marketing.cancelCampaign, {
      campaignId: campaignId as any,
    });
    await t.mutation(internal.marketing.startScheduledCampaign, {
      campaignId: campaignId as any,
    });

    const afterCancel = await asUser(t, adminId).query(api.marketing.getCampaign, {
      campaignId: campaignId as any,
    });
    expect(afterCancel?.campaign.status).toBe("cancelled");
    expect(afterCancel?.recipients).toHaveLength(0);

    // Sans expéditeur configuré, l'envoi est refusé avec un message clair.
    await t.run(async (ctx) => {
      const config = await ctx.db.query("emailConfig").order("desc").first();
      if (config) await ctx.db.patch(config._id, { senderEmail: "" });
    });
    const second = await saveDraft(t, adminId, { name: "Sans config" });
    await expect(
      asUser(t, adminId).mutation(api.marketing.startCampaign, {
        campaignId: second as any,
      }),
    ).rejects.toThrow(/Configuration e-mail/i);
  });
});
