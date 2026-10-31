/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");
type TestT = TestConvex<typeof schema>;

const DAY = 24 * 60 * 60 * 1000;

async function createUser(
  t: TestT,
  overrides: Partial<{ role: string; name: string; email: string }> = {},
) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: overrides.name ?? "Utilisateur test",
      email: overrides.email ?? `user${Math.random()}@test.com`,
      role: (overrides.role ?? "user") as any,
      userRole: "client",
      status: "active",
      isAnonymous: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

async function activateCotisation(t: TestT, userId: any) {
  const orderId = await t.run(async (ctx) =>
    ctx.db.insert("siteCotisations", {
      userId,
      amount: 120,
      currency: "TND",
      durationDays: 180,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  const adminId = await createUser(t, { role: "admin", email: `admin${Math.random()}@test.com` });
  await t.withIdentity({ subject: adminId }).mutation(api.siteTracking.adminApproveSiteCotisation, {
    cotisationId: orderId,
  });
}

/** Chantier autonome prêt pour le suivi intelligent. */
async function setupSite(t: TestT) {
  const userId = await createUser(t);
  await activateCotisation(t, userId);
  const asUser = t.withIdentity({ subject: userId });
  const { siteId } = await asUser.mutation(api.siteTracking.createSite, {
    name: "Chantier IA",
    category: "villa",
    region: "tunis",
    surface: 160,
    budgetInitial: 200000,
    startDate: Date.now() - 90 * DAY,
    expectedEndDate: Date.now() + 60 * DAY,
    clientName: "Mme Trabelsi",
    managerName: "Chef Sami",
  });
  const site = await t.run(async (ctx) => ctx.db.get(siteId));
  const tasks = await t.run(async (ctx) =>
    ctx.db
      .query("siteTasks")
      .withIndex("by_site_order", (q) => q.eq("siteId", siteId))
      .collect(),
  );
  return { userId, siteId, site: site!, tasks };
}

async function addStakeholder(t: TestT, siteId: any, permissions: string[]) {
  const userId = await createUser(t);
  await t.run(async (ctx) =>
    ctx.db.insert("siteStakeholders", {
      siteId,
      name: "Intervenant",
      role: "entrepreneur",
      email: `stake${Math.random()}@test.com`,
      userId,
      permissions,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  return userId;
}

async function createSession(
  t: TestT,
  identity: string,
  siteId: any,
  phaseKey: string,
  imageCount = 2,
) {
  return t.withIdentity({ subject: identity }).mutation(
    api.siteIntelligence.createMonitoringSession,
    {
      siteId,
      title: "Inspection hebdomadaire",
      date: Date.now() - 3 * DAY,
      phaseKey,
      images: await t.run(async (ctx) => {
        const ids: any[] = [];
        for (let index = 0; index < imageCount; index++) {
          const storageId = await ctx.storage.store(
            new Blob([`photo-${index}`], { type: "image/jpeg" }),
          );
          ids.push({
            storageId,
            fileName: `photo-${index}.jpg`,
            contentType: "image/jpeg",
            sizeBytes: 1200,
            capturedAt: Date.now() - 3 * DAY,
          });
        }
        return ids;
      }),
    },
  );
}

describe("AI Site Intelligence — permissions et données", () => {
  let t: TestT;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("un intervenant sans permission IA ne peut pas ouvrir le module", async () => {
    const { siteId } = await setupSite(t);
    const stakeholder = await addStakeholder(t, siteId, ["progress"]);
    await expect(
      t.withIdentity({ subject: stakeholder }).query(api.siteIntelligence.getAiWorkspace, { siteId }),
    ).rejects.toThrow(/PERMISSION_DENIED|pas ouvert/i);
  });

  it("un intervenant avec la permission IA peut consulter sans être cotisant", async () => {
    const { siteId } = await setupSite(t);
    const stakeholder = await addStakeholder(t, siteId, ["ai"]);
    // L'intervenant n'a AUCUNE cotisation : l'accès vient du chantier partagé.
    const workspace = await t
      .withIdentity({ subject: stakeholder })
      .query(api.siteIntelligence.getAiWorkspace, { siteId });
    expect(workspace.isOwner).toBe(false);
    expect(workspace.site.name).toBe("Chantier IA");
    expect(workspace.provider.available).toBe(false); // aucune clé en test
  });

  it("la session photo ne stocke que des métadonnées et une politique de conservation", async () => {
    const { userId, siteId, tasks } = await setupSite(t);
    const sessionId = await createSession(t, userId, siteId, tasks[0].phaseKey, 2);
    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    const images = await t.run(async (ctx) =>
      ctx.db
        .query("siteMonitoringImages")
        .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
        .collect(),
    );
    expect(session!.imageCount).toBe(2);
    expect(images).toHaveLength(2);
    expect(images[0].storageId).toBeTruthy();
    expect((images[0] as any).base64).toBeUndefined();
    expect(images[0].purgeAfter).toBeGreaterThan(Date.now() + 300 * DAY);
  });

  it("refuse des photos d'un autre chantier lors du contexte d'analyse", async () => {
    const first = await setupSite(t);
    const second = await setupSite(t);
    await createSession(t, first.userId, first.siteId, first.tasks[0].phaseKey, 1);
    const foreignImage = await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(new Blob(["x"], { type: "image/jpeg" }));
      const sessionId = await ctx.db.insert("siteMonitoringSessions", {
        siteId: second.siteId,
        title: "Autre",
        date: Date.now(),
        imageCount: 1,
        createdBy: second.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return await ctx.db.insert("siteMonitoringImages", {
        siteId: second.siteId,
        sessionId,
        storageId,
        capturedAt: Date.now(),
        uploadedBy: second.userId,
        purgeAfter: Date.now() + DAY,
        createdAt: Date.now(),
      });
    });
    await expect(
      t.withIdentity({ subject: first.userId }).query(api.siteIntelligence.getAnalysisContext, {
        siteId: first.siteId,
        imageIds: [foreignImage],
        phaseKey: first.tasks[0].phaseKey,
      }),
    ).rejects.toThrow(/introuvable sur ce chantier/i);
  });
});

describe("AI Site Intelligence — avancement et validation humaine", () => {
  let t: TestT;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("une analyse IA est proposée mais ne modifie jamais l'avancement validé", async () => {
    const { userId, siteId, tasks } = await setupSite(t);
    const phase = tasks[0];
    const sessionId = await createSession(t, userId, siteId, phase.phaseKey, 1);
    const images = await t.run(async (ctx) =>
      ctx.db
        .query("siteMonitoringImages")
        .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
        .collect(),
    );

    await t.withIdentity({ subject: userId }).mutation(api.siteIntelligence.recordAnalysis, {
      siteId,
      sessionId,
      imageIds: [images[0]._id],
      mode: "ai",
      provider: "test",
      phaseKey: phase.phaseKey,
      elements: ["Semelles"],
      worksObserved: ["Semelles coulées"],
      worksRemaining: ["Longrines"],
      changes: [],
      visualAnomalies: [],
      progressEstimate: 70,
      confidence: 0.6,
      summary: "Semelles visibles sur la zone nord.",
    });

    const task = await t.run(async (ctx) => ctx.db.get(phase._id));
    expect(task!.progress).toBe(0);

    const records = await t.run(async (ctx) =>
      ctx.db
        .query("siteProgressRecords")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .collect(),
    );
    expect(records).toHaveLength(1);
    expect(records[0].source).toBe("ai");
    expect(records[0].status).toBe("pending");
    expect(records[0].percent).toBe(70);
  });

  it("la déclaration terrain attend une validation, puis met à jour la tâche", async () => {
    const { userId, siteId, tasks } = await setupSite(t);
    const phase = tasks[0];
    const stakeholder = await addStakeholder(t, siteId, ["ai"]);

    const recordId = await t
      .withIdentity({ subject: stakeholder })
      .mutation(api.siteIntelligence.recordProgress, {
        siteId,
        phaseKey: phase.phaseKey,
        percent: 45,
        note: "Ferraillage terminé",
      });

    const before = await t.run(async (ctx) => ctx.db.get(phase._id));
    expect(before!.progress).toBe(0);

    // Un intervenant « ai » ne peut pas valider : c'est un acte de contrôle.
    await expect(
      t
        .withIdentity({ subject: stakeholder })
        .mutation(api.siteIntelligence.validateProgress, { recordId }),
    ).rejects.toThrow(/PERMISSION_DENIED|qualité/i);

    await t.withIdentity({ subject: userId }).mutation(api.siteIntelligence.validateProgress, {
      recordId,
    });
    const after = await t.run(async (ctx) => ctx.db.get(phase._id));
    expect(after!.progress).toBe(45);
    expect(after!.status).toBe("in_progress");

    const validated = await t.run(async (ctx) =>
      ctx.db
        .query("siteProgressRecords")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .collect()
        .then((rows) => rows.filter((row) => row.source === "validated")),
    );
    expect(validated).toHaveLength(1);
  });

  it("le contrôle qualité peut valider, et un refus motive le pointage", async () => {
    const { siteId, tasks } = await setupSite(t);
    const engineer = await addStakeholder(t, siteId, ["ai", "quality"]);
    const recordId = await t
      .withIdentity({ subject: engineer })
      .mutation(api.siteIntelligence.recordProgress, {
        siteId,
        phaseKey: tasks[1].phaseKey,
        percent: 20,
      });
    await t
      .withIdentity({ subject: engineer })
      .mutation(api.siteIntelligence.rejectProgress, { recordId, reason: "Non constaté sur site" });
    const record = await t.run(async (ctx) => ctx.db.get(recordId));
    expect(record!.status).toBe("rejected");
    const task = await t.run(async (ctx) => ctx.db.get(tasks[1]._id));
    expect(task!.progress).toBe(0);
  });

  it("le mode démonstration est enregistré comme tel, avec une confiance nulle", async () => {
    const { userId, siteId, tasks } = await setupSite(t);
    const sessionId = await createSession(t, userId, siteId, tasks[0].phaseKey, 1);
    const images = await t.run(async (ctx) =>
      ctx.db
        .query("siteMonitoringImages")
        .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
        .collect(),
    );
    await t.withIdentity({ subject: userId }).mutation(api.siteIntelligence.recordAnalysis, {
      siteId,
      sessionId,
      imageIds: [images[0]._id],
      mode: "demo",
      provider: "demo-engine",
      phaseKey: tasks[0].phaseKey,
      elements: ["Exemple"],
      worksObserved: ["Exemple"],
      worksRemaining: ["Exemple"],
      changes: [],
      visualAnomalies: [],
      progressEstimate: 10,
      confidence: 0,
      summary: "Démonstration",
    });
    const analyses = await t.run(async (ctx) =>
      ctx.db
        .query("siteAiAnalyses")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .collect(),
    );
    expect(analyses[0].mode).toBe("demo");
    expect(analyses[0].confidence).toBe(0);
    expect(analyses[0].isEstimate).toBe(true);
  });
});

describe("AI Site Intelligence — anomalies et rapports", () => {
  let t: TestT;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("détecte un retard réel, déduplique les scans et trace le statut", async () => {
    const { userId, siteId, tasks } = await setupSite(t);
    // Phase 1 dépassée et non terminée → anomalie de retard attendue.
    await t.run(async (ctx) =>
      ctx.db.patch(tasks[0]._id, { startDate: Date.now() - 120 * DAY, endDate: Date.now() - 20 * DAY }),
    );

    const first = await t
      .withIdentity({ subject: userId })
      .mutation(api.siteIntelligence.scanAnomalies, { siteId });
    expect(first.inserted).toBeGreaterThan(0);

    const second = await t
      .withIdentity({ subject: userId })
      .mutation(api.siteIntelligence.scanAnomalies, { siteId });
    expect(second.inserted).toBe(0);

    const anomalies = await t.run(async (ctx) =>
      ctx.db
        .query("siteAnomalies")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .collect(),
    );
    const delay = anomalies.find((anomaly) => anomaly.type === "retard_phase");
    expect(delay).toBeTruthy();
    expect(["moyen", "eleve", "critique"]).toContain(delay!.severity);

    await t
      .withIdentity({ subject: userId })
      .mutation(api.siteIntelligence.setAnomalyStatus, {
        anomalyId: delay!._id,
        status: "resolu",
        note: "Reprise planifiée",
      });
    const resolved = await t.run(async (ctx) => ctx.db.get(delay!._id));
    expect(resolved!.status).toBe("resolu");
  });

  it("un intervenant terrain ne peut pas clôturer une anomalie", async () => {
    const { userId, siteId, tasks } = await setupSite(t);
    await t.run(async (ctx) =>
      ctx.db.patch(tasks[0]._id, { startDate: Date.now() - 120 * DAY, endDate: Date.now() - 20 * DAY }),
    );
    await t.withIdentity({ subject: userId }).mutation(api.siteIntelligence.scanAnomalies, { siteId });
    const anomalies = await t.run(async (ctx) =>
      ctx.db
        .query("siteAnomalies")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .collect(),
    );
    const stakeholder = await addStakeholder(t, siteId, ["ai"]);
    await expect(
      t
        .withIdentity({ subject: stakeholder })
        .mutation(api.siteIntelligence.setAnomalyStatus, {
          anomalyId: anomalies[0]._id,
          status: "resolu",
        }),
    ).rejects.toThrow(/PERMISSION_DENIED|qualité/i);
  });

  it("l'historique des rapports exige la permission rapports", async () => {
    const { userId, siteId } = await setupSite(t);
    const stakeholder = await addStakeholder(t, siteId, ["ai"]);
    await expect(
      t.withIdentity({ subject: stakeholder }).mutation(api.siteIntelligence.saveMonitoringReport, {
        siteId,
        kind: "progression",
        periodStart: Date.now() - DAY,
        periodEnd: Date.now(),
        snapshot: { validated: 10 },
        imageIds: [],
      }),
    ).rejects.toThrow(/PERMISSION_DENIED/i);

    await t.withIdentity({ subject: userId }).mutation(api.siteIntelligence.saveMonitoringReport, {
      siteId,
      kind: "progression",
      periodStart: Date.now() - DAY,
      periodEnd: Date.now(),
      snapshot: { validated: 10 },
      imageIds: [],
    });
    const reports = await t.run(async (ctx) =>
      ctx.db
        .query("siteMonitoringReports")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .collect(),
    );
    expect(reports).toHaveLength(1);
  });

  it("le tableau de bord agrège les indicateurs sans inventer de projection", async () => {
    const { userId, siteId } = await setupSite(t);
    const workspace = await t
      .withIdentity({ subject: userId })
      .query(api.siteIntelligence.getAiWorkspace, { siteId });
    expect(workspace.summary.validated).toBe(0);
    expect(workspace.metrics.progress.isEstimate).toBe(true);
    expect(workspace.metrics.progress.schedule.projectedEndDate).toBeNull();
    expect(workspace.metrics.monitoringSessions).toBe(0);
    expect(workspace.provider.demoAllowed).toBe(true);
    expect(workspace.provider.retentionDays).toBe(365);
  });
});
