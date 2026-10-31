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

async function createProject(t: TestT, userId: any) {
  return t.run(async (ctx) =>
    ctx.db.insert("projects", {
      userId,
      name: "Villa Les Oliviers",
      category: "villa" as any,
      status: "completed" as any,
      surface: 180,
      region: "tunis" as any,
      selectedScenario: "standard",
      description: "Villa R+1 avec piscine",
      costEstimate: {
        totalCost: 240000,
        currency: "TND",
        contingencyBuffer: 0,
        contingencyPercentage: 0,
        breakdown: [
          {
            category: "materiaux",
            label: "Gros œuvre",
            estimatedCost: 120000,
            percentage: 50,
            items: [
              { name: "Ciment", quantity: 500, unit: "sac", unitPrice: 18, totalPrice: 9000 },
              { name: "Acier", quantity: 3, unit: "tonne", unitPrice: 2400, totalPrice: 7200 },
            ],
          },
        ],
        budgetScenarios: {
          economique: { totalCost: 200000, costPerM2: 1111, label: "Économique", multiplier: 0.85 },
          standard: { totalCost: 250000, costPerM2: 1389, label: "Standard", multiplier: 1 },
          premium: { totalCost: 310000, costPerM2: 1722, label: "Premium", multiplier: 1.25 },
        },
      } as any,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

/** Accorde une cotisation active à un utilisateur (parcours admin). */
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
  return orderId;
}

const BASE_SITE = {
  name: "Chantier Villa",
  category: "villa" as const,
  region: "tunis" as const,
  surface: 180,
  clientName: "M. Ben Salah",
  managerName: "Chef Ali",
  budgetInitial: 250000,
  startDate: Date.UTC(2026, 0, 5),
  expectedEndDate: Date.UTC(2026, 11, 20),
  description: "Villa R+1",
};

describe("Suivi de chantier — cotisation obligatoire", () => {
  let t: TestT;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("refuse la création sans cotisation", async () => {
    const userId = await createUser(t);
    const asUser = t.withIdentity({ subject: userId });

    await expect(asUser.mutation(api.siteTracking.createSite, BASE_SITE)).rejects.toThrow(
      /SITE_ACCESS_REQUIRED|cotisation/i,
    );
  });

  it("reste bloqué tant que la demande est en attente", async () => {
    const userId = await createUser(t);
    const asUser = t.withIdentity({ subject: userId });
    await asUser.mutation(api.siteTracking.requestSiteCotisation, { paymentMethod: "bank_transfer" });

    const access = await asUser.query(api.siteTracking.getMySiteAccess, {});
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("pending");
    expect(access.status).toBe("pending");

    await expect(asUser.mutation(api.siteTracking.createSite, BASE_SITE)).rejects.toThrow(
      /attente/i,
    );
  });

  it("ouvre l'accès après validation administrateur, avec la durée configurée", async () => {
    const userId = await createUser(t);
    const asUser = t.withIdentity({ subject: userId });
    await t.run(async (ctx) => {
      await ctx.db.insert("siteModuleConfig", {
        enabled: true,
        price: 150,
        currency: "TND",
        durationDays: 90,
        updatedAt: Date.now(),
      });
    });

    await asUser.mutation(api.siteTracking.requestSiteCotisation, { paymentMethod: "bank_transfer" });
    const adminId = await createUser(t, { role: "admin", email: "admin@test.com" });
    const pending = await t.run(async (ctx) =>
      ctx.db.query("siteCotisations").first(),
    );
    expect(pending!.amount).toBe(150);

    await t.withIdentity({ subject: adminId }).mutation(
      api.siteTracking.adminApproveSiteCotisation,
      { cotisationId: pending!._id },
    );

    const access = await asUser.query(api.siteTracking.getMySiteAccess, {});
    expect(access.allowed).toBe(true);
    expect(access.status).toBe("active");
    expect(access.durationDays).toBe(90);
    // Échéance ≈ 90 jours après la validation.
    const remaining = (access.endDate! - Date.now()) / DAY;
    expect(remaining).toBeGreaterThan(89);
    expect(remaining).toBeLessThanOrEqual(90);
  });

  it("bloque l'accès dès que la cotisation est expirée", async () => {
    const userId = await createUser(t);
    const cotisationId = await activateCotisation(t, userId);
    await t.run(async (ctx) =>
      ctx.db.patch(cotisationId, { endDate: Date.now() - DAY, status: "active" }),
    );

    const access = await t.withIdentity({ subject: userId }).query(
      api.siteTracking.getMySiteAccess,
      {},
    );
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("expired");
  });

  it("un administrateur accède au module sans cotisation (tests internes)", async () => {
    const adminId = await createUser(t, { role: "admin" });
    const asAdmin = t.withIdentity({ subject: adminId });
    const access = await asAdmin.query(api.siteTracking.getMySiteAccess, {});
    expect(access.allowed).toBe(true);
    expect(access.reason).toBe("admin");

    const created = await asAdmin.mutation(api.siteTracking.createSite, BASE_SITE);
    expect(created.siteId).toBeTruthy();
  });

  it("le module désactivé par l'administration ferme l'accès", async () => {
    const userId = await createUser(t);
    await activateCotisation(t, userId);
    await t.run(async (ctx) => {
      const config = await ctx.db.query("siteModuleConfig").first();
      if (config) await ctx.db.patch(config._id, { enabled: false });
      else
        await ctx.db.insert("siteModuleConfig", {
          enabled: false,
          price: 120,
          currency: "TND",
          durationDays: 180,
          updatedAt: Date.now(),
        });
    });

    const access = await t.withIdentity({ subject: userId }).query(
      api.siteTracking.getMySiteAccess,
      {},
    );
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("module_disabled");
  });
});

describe("Suivi de chantier — création et planning", () => {
  let t: TestT;
  let userId: any;
  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createUser(t);
    await activateCotisation(t, userId);
  });

  it("mode indépendant : crée le chantier et le planning adapté au type", async () => {
    const asUser = t.withIdentity({ subject: userId });
    const { siteId } = await asUser.mutation(api.siteTracking.createSite, BASE_SITE);

    const site = await asUser.query(api.siteTracking.getSite, { siteId });
    expect(site.site.name).toBe("Chantier Villa");
    expect(site.site.source).toBe("standalone");
    // Une villa suit les 11 phases du parcours résidentiel.
    expect(site.tasks).toHaveLength(11);
    expect(site.tasks[0].name).toContain("Installation");
    expect(site.tasks.some((task: any) => task.name.includes("Charpente"))).toBe(true);
    // Planning ordonné et dans la période du chantier.
    for (const task of site.tasks) {
      expect(task.startDate).toBeGreaterThanOrEqual(BASE_SITE.startDate);
      expect(task.endDate).toBeLessThanOrEqual(BASE_SITE.expectedEndDate);
    }
    expect(site.progress).toBe(0);
  });

  it("mode estimation : reprend le projet sans le modifier", async () => {
    const projectId = await createProject(t, userId);
    const before = await t.run(async (ctx) => ctx.db.get(projectId));

    const asUser = t.withIdentity({ subject: userId });
    const { siteId, budgetInitial } = await asUser.mutation(
      api.siteTracking.createSiteFromProject,
      { projectId, startDate: BASE_SITE.startDate, expectedEndDate: BASE_SITE.expectedEndDate },
    );

    // Budget = scénario standard du projet, sans arrondi inventé.
    expect(budgetInitial).toBe(250000);
    const after = await t.run(async (ctx) => ctx.db.get(projectId));
    expect(after).toEqual(before); // estimation intacte

    const site = await asUser.query(api.siteTracking.getSite, { siteId });
    expect(site.site.source).toBe("estimation");
    expect(site.site.projectId).toBe(projectId);
    expect(site.materials.length).toBe(2);
    expect(site.materials[0].plannedQty).toBe(500);
    expect(site.materials[0].unit).toBe("sac");
  });

  it("refuse un projet appartenant à un autre utilisateur", async () => {
    const otherId = await createUser(t, { email: "autre@test.com" });
    const projectId = await createProject(t, otherId);
    const asUser = t.withIdentity({ subject: userId });

    await expect(
      asUser.mutation(api.siteTracking.createSiteFromProject, { projectId }),
    ).rejects.toThrow(/appartient/i);
  });

  it("valide les dates et le budget côté serveur", async () => {
    const asUser = t.withIdentity({ subject: userId });
    await expect(
      asUser.mutation(api.siteTracking.createSite, {
        ...BASE_SITE,
        expectedEndDate: BASE_SITE.startDate - DAY,
      }),
    ).rejects.toThrow(/postérieure/i);
    await expect(
      asUser.mutation(api.siteTracking.createSite, { ...BASE_SITE, name: "   " }),
    ).rejects.toThrow(/nom/i);
  });
});

describe("Suivi de chantier — permissions et isolation", () => {
  let t: TestT;
  let ownerId: any;
  let siteId: any;
  beforeEach(async () => {
    t = convexTest(schema, modules);
    ownerId = await createUser(t, { email: "proprietaire@test.com" });
    await activateCotisation(t, ownerId);
    const owner = t.withIdentity({ subject: ownerId });
    ({ siteId } = await owner.mutation(api.siteTracking.createSite, BASE_SITE));
  });

  it("un intervenant sans droit budget ne voit ni ne saisit les montants", async () => {
    const chefId = await createUser(t, { email: "chef@test.com" });
    const owner = t.withIdentity({ subject: ownerId });
    await owner.mutation(api.siteTracking.addStakeholder, {
      siteId,
      name: "Chef de chantier",
      role: "chef_chantier",
      email: "chef@test.com",
      permissions: ["daily", "progress"],
    });

    const chef = t.withIdentity({ subject: chefId });
    const site = await chef.query(api.siteTracking.getSite, { siteId });
    expect(site.expenses).toEqual([]);
    expect(site.budget).toBeNull();

    await expect(
      chef.mutation(api.siteTracking.addExpense, {
        siteId,
        label: "Ciment",
        category: "materiaux",
        nature: "materiaux",
        amount: 500,
        date: Date.now(),
      }),
    ).rejects.toThrow(/PERMISSION_DENIED|autorisé/i);

    const log = await chef.mutation(api.siteTracking.addDailyLog, {
      siteId,
      date: Date.now(),
      activities: "Coulage de la dalle du RDC",
      workers: [{ role: "Maçon", count: 4 }],
      hoursWorked: 32,
    });
    expect(log.logId).toBeTruthy();
  });

  it("un utilisateur extérieur n'accède jamais au chantier", async () => {
    const outsiderId = await createUser(t, { email: "intrus@test.com" });
    await activateCotisation(t, outsiderId);
    const outsider = t.withIdentity({ subject: outsiderId });

    await expect(outsider.query(api.siteTracking.getSite, { siteId })).rejects.toThrow(
      /pas accès/i,
    );
    const list = await outsider.query(api.siteTracking.listSites, {});
    expect(list.sites).toHaveLength(0);
  });

  it("seul le propriétaire gère les intervenants", async () => {
    const chefId = await createUser(t, { email: "chef2@test.com" });
    const owner = t.withIdentity({ subject: ownerId });
    await owner.mutation(api.siteTracking.addStakeholder, {
      siteId,
      name: "Chef",
      role: "chef_chantier",
      email: "chef2@test.com",
      permissions: ["team"],
    });

    const chef = t.withIdentity({ subject: chefId });
    await expect(
      chef.mutation(api.siteTracking.addStakeholder, {
        siteId,
        name: "Complice",
        role: "artisan",
        permissions: ["team"],
      }),
    ).rejects.toThrow(/responsable/i);
  });
});

describe("Suivi de chantier — budget, matériaux et prévisions", () => {
  let t: TestT;
  let userId: any;
  let siteId: any;
  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createUser(t);
    await activateCotisation(t, userId);
    const asUser = t.withIdentity({ subject: userId });
    ({ siteId } = await asUser.mutation(api.siteTracking.createSite, BASE_SITE));
  });

  it("agrège les dépenses et calcule l'écart budgétaire", async () => {
    const asUser = t.withIdentity({ subject: userId });
    await asUser.mutation(api.siteTracking.addExpense, {
      siteId,
      label: "Ciment",
      category: "gros_oeuvre",
      nature: "materiaux",
      amount: 40000,
      date: Date.now(),
    });
    await asUser.mutation(api.siteTracking.addExpense, {
      siteId,
      label: "Maçons",
      category: "main_oeuvre",
      nature: "main_oeuvre",
      amount: 15000,
      date: Date.now(),
    });

    const site = await asUser.query(api.siteTracking.getSite, { siteId });
    expect(site.budget!.spent).toBe(55000);
    expect(site.budget!.variance).toBe(195000);
    expect(site.budget!.byNature.find((row: any) => row.nature === "materiaux")!.amount).toBe(40000);
  });

  it("interdit de livrer plus que commandé et de consommer plus que livré", async () => {
    const asUser = t.withIdentity({ subject: userId });
    const { materialId } = await asUser.mutation(api.siteTracking.addMaterial, {
      siteId,
      name: "Parpaing",
      unit: "u",
      plannedQty: 1000,
      unitPrice: 1.2,
    });

    await expect(
      asUser.mutation(api.siteTracking.updateMaterial, {
        materialId,
        deliveredQty: 10,
        orderedQty: 5,
      }),
    ).rejects.toThrow(/livrées/i);

    await asUser.mutation(api.siteTracking.updateMaterial, {
      materialId,
      orderedQty: 1000,
      deliveredQty: 1000,
      consumedQty: 400,
    });
    const site = await asUser.query(api.siteTracking.getSite, { siteId });
    const material = site.materials.find((row: any) => row._id === materialId)!;
    expect(material.consumedQty).toBe(400);
  });

  it("produit une prévision de risque explicitement marquée comme estimation", async () => {
    const asUser = t.withIdentity({ subject: userId });
    const site = await asUser.query(api.siteTracking.getSite, { siteId });
    expect(site.risk.isEstimate).toBe(true);
    expect(site.risk.disclaimer).toMatch(/pas une certitude/i);
    expect(site.risk.riskScore).toBeGreaterThanOrEqual(0);
    expect(site.risk.riskScore).toBeLessThanOrEqual(100);
    expect(["faible", "modere", "eleve", "critique"]).toContain(site.risk.riskLevel);
  });

  it("un avancement nul sans dépense ne fabrique aucune projection chiffrée", async () => {
    const asUser = t.withIdentity({ subject: userId });
    const site = await asUser.query(api.siteTracking.getSite, { siteId });
    expect(site.risk.budget.projectedFinalCost).toBeNull();
    expect(site.risk.schedule.spi).toBe(0);
  });
});

describe("Suivi de chantier — administration", () => {
  let t: TestT;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("refuse la configuration à un utilisateur standard", async () => {
    const userId = await createUser(t);
    await expect(
      t.withIdentity({ subject: userId }).mutation(api.siteTracking.adminSetModuleConfig, {
        price: 10,
      }),
    ).rejects.toThrow(/Admin/i);
  });

  it("enregistre prix et durée, et expose des statistiques", async () => {
    const adminId = await createUser(t, { role: "admin" });
    const asAdmin = t.withIdentity({ subject: adminId });
    await asAdmin.mutation(api.siteTracking.adminSetModuleConfig, {
      enabled: true,
      price: 99,
      durationDays: 60,
    });

    const config = await asAdmin.query(api.siteTracking.getPublicModuleConfig, {});
    expect(config.price).toBe(99);
    expect(config.durationDays).toBe(60);
    expect(config.enabled).toBe(true);

    const data = await asAdmin.query(api.siteTracking.adminGetSiteModule, {});
    expect(data!.stats).toBeDefined();
    expect(data!.config.price).toBe(99);
  });
});
