/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";
import { DECISION_ACCESS_MARKER } from "./decisionSupportAccess.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// « AIDE À LA DÉCISION » — accès vérifié CÔTÉ SERVEUR
//   • projet du GROUPE A uniquement ;
//   • abonnement CLIENT PRO actif, valide et non expiré.
//
// Les tests couvrent les 7 scénarios obligatoires : ils appellent directement
// les queries/mutations protégées (aucune interface), ce qui prouve que le
// contrôle ne peut pas être contourné en atteignant l'URL ou l'API.
// ============================================================================

const DAY_MS = 24 * 60 * 60 * 1000;

async function configurePricing(
  t: ReturnType<typeof convexTest>,
  freePlanEnabled: boolean,
) {
  await t.run(async (ctx) =>
    ctx.db.insert("paymentConfig", {
      bankName: "Banque",
      bankTitulaire: "BatiBuild",
      bankRib: "000000000000000000000",
      bankIban: "TN0000000000000000000000",
      bankSwift: "BANKTNTT",
      d17MerchantName: "BatiBuild",
      d17Phone: "00000000",
      d17Email: "contact@batibuild.tn",
      d17Notice: "",
      proPrice: 80,
      currency: "TND",
      freePlanEnabled,
      // Offre gratuite (essai) désactivée : les scénarios portent sur l'abonnement.
      clientProEnabled: true,
    }),
  );
}

interface UserOpts {
  plan?: "pro" | "free" | null;
  /** Fin d'abonnement relative à maintenant (`null` = aucune date). */
  endDate?: number | null;
  role?: string;
}

async function createUser(t: ReturnType<typeof convexTest>, opts: UserOpts = {}) {
  const now = Date.now();
  const plan = opts.plan === undefined ? "pro" : opts.plan;
  const endDate =
    opts.endDate === undefined ? (plan === "pro" ? now + 30 * DAY_MS : null) : opts.endDate;
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Client Aide à la décision",
      email: `decision-access-${Math.random()}@test.com`,
      role: opts.role ?? "user",
      status: "active",
      subscriptionPlan: plan ?? undefined,
      subscriptionStatus: plan === "pro" && (endDate ?? 0) > now ? "active" : undefined,
      subscriptionStartDate: plan === "pro" ? now - 5 * DAY_MS : undefined,
      subscriptionEndDate: endDate ?? undefined,
      image: undefined,
      company: undefined,
      phone: undefined,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

async function createProject(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  category: string,
): Promise<Id<"projects">> {
  const now = Date.now();
  const dqe = {
    lots: [
      {
        id: "fondations",
        name: "Fondations",
        subtotal: 100_000,
        lines: [
          {
            designation: "Béton C25/30",
            sousLot: "Dalle",
            quantity: 20,
            unit: "m³",
            unitPrice: 320,
            total: 6_400,
          },
        ],
      },
    ],
  };
  return t.run(async (ctx) =>
    ctx.db.insert("projects", {
      userId,
      name: `Projet ${category}`,
      category,
      status: "completed",
      region: "tunis",
      surface: 120,
      floors: 1,
      selectedScenario: "standard",
      dqe,
      costEstimate: {
        totalCost: 237_000,
        costPerSquareMeter: 1_975,
        currency: "TND",
        breakdown: [{ category: "fondations", label: "Fondations", estimatedCost: 92_593, percentage: 39.1 }],
        contingencyBuffer: 0,
        budgetScenarios: {
          economique: { label: "Économique", totalCost: 189_600, costPerM2: 1_580, multiplier: 0.8 },
          standard: { label: "Standard", totalCost: 237_000, costPerM2: 1_975, multiplier: 1 },
          premium: { label: "Premium", totalCost: 296_250, costPerM2: 2_469, multiplier: 1.25 },
        },
        dqe,
      },
      createdAt: now,
      updatedAt: now,
    }),
  );
}

function asUser(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

// ============================================================================

describe("getProjectDecisionSupportAccess — scénarios obligatoires", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    await configurePricing(t, false);
  });

  it("1. Groupe A + Client Pro actif → accès autorisé (données disponibles)", async () => {
    const userId = await createUser(t);
    const projectId = await createProject(t, userId, "villa");
    const user = asUser(t, userId);

    const access = await user.query(api.decisionSupportAccess.getProjectDecisionSupportAccess, {
      projectId,
    });
    expect(access).toMatchObject({ allowed: true, reason: "ok", group: "A" });

    // Les données du module sont bien accessibles.
    const ctx = await user.query(api.decisionSupport.getProjectBudgetContext, { projectId });
    expect(ctx).not.toBeNull();
    expect(ctx?.lots).toHaveLength(1);

    // Et l'écriture (mutation) est acceptée.
    await expect(
      user.mutation(api.decisionSupport.saveBudgetAnalysis, {
        projectId,
        budgetAvailable: 250_000,
        result: { ok: true },
      }),
    ).resolves.not.toThrow();
  });

  it("1 bis. Restaurant, café et rénovation complète appartiennent au Groupe A → accès Client Pro autorisé", async () => {
    const userId = await createUser(t);
    const user = asUser(t, userId);

    for (const category of ["restaurant", "cafe", "renovation_complete"]) {
      const projectId = await createProject(t, userId, category);
      const access = await user.query(
        api.decisionSupportAccess.getProjectDecisionSupportAccess,
        { projectId },
      );
      expect(access, category).toMatchObject({ allowed: true, reason: "ok", group: "A" });
    }
  });

  it("2. Groupe A + compte gratuit → accès refusé (frontend ET backend)", async () => {
    await configurePricing(t, true);
    const userId = await createUser(t, { plan: "free" });
    const projectId = await createProject(t, userId, "maison");
    const user = asUser(t, userId);

    const access = await user.query(api.decisionSupportAccess.getProjectDecisionSupportAccess, {
      projectId,
    });
    expect(access).toMatchObject({
      allowed: false,
      reason: "free_plan",
      upgradeRequired: true,
    });

    // Aucune donnée d'aide à la décision n'est renvoyée.
    expect(
      await user.query(api.decisionSupport.getProjectBudgetContext, { projectId }),
    ).toBeNull();
    expect(await user.query(api.decisionSupport.getBudgetAnalysis, { projectId })).toBeNull();

    // Aucune écriture n'est possible.
    await expect(
      user.mutation(api.decisionSupport.saveBudgetAnalysis, {
        projectId,
        budgetAvailable: 100_000,
        result: {},
      }),
    ).rejects.toThrow(DECISION_ACCESS_MARKER);
  });

  it("3. Groupe A + Client Pro expiré → accès refusé jusqu'à réactivation", async () => {
    const userId = await createUser(t, { plan: "pro", endDate: Date.now() - DAY_MS });
    const projectId = await createProject(t, userId, "appartement");
    const user = asUser(t, userId);

    const access = await user.query(api.decisionSupportAccess.getProjectDecisionSupportAccess, {
      projectId,
    });
    expect(access).toMatchObject({
      allowed: false,
      reason: "expired",
      renewalRequired: true,
    });
    expect(
      await user.query(api.decisionSupport.getProjectBudgetContext, { projectId }),
    ).toBeNull();
  });

  it("4. Groupe B + Client Pro actif → accès refusé (aucune donnée)", async () => {
    const userId = await createUser(t);
    const projectId = await createProject(t, userId, "extension_batiment");
    const user = asUser(t, userId);

    const access = await user.query(api.decisionSupportAccess.getProjectDecisionSupportAccess, {
      projectId,
    });
    expect(access).toMatchObject({ allowed: false, reason: "group_b", group: "B" });
    expect(
      await user.query(api.decisionSupport.getProjectBudgetContext, { projectId }),
    ).toBeNull();
    await expect(
      user.mutation(api.decisionSupport.clearBudgetAnalysis, { projectId }),
    ).resolves.toBeNull();
  });

  it("5. Groupe B + compte gratuit → accès refusé", async () => {
    await configurePricing(t, true);
    const userId = await createUser(t, { plan: "free" });
    const projectId = await createProject(t, userId, "piscine");
    const user = asUser(t, userId);

    const access = await user.query(api.decisionSupportAccess.getProjectDecisionSupportAccess, {
      projectId,
    });
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("group_b");
  });

  it("6. Accès direct sans autorisation → refusé côté backend", async () => {
    const ownerId = await createUser(t);
    const projectId = await createProject(t, ownerId, "villa");

    // 6a. Utilisateur non connecté (URL ouverte dans un nouvel onglet).
    const anonymous = await t.query(
      api.decisionSupportAccess.getProjectDecisionSupportAccess,
      { projectId },
    );
    expect(anonymous).toMatchObject({ allowed: false, reason: "not_authenticated" });
    expect(
      await t.query(api.decisionSupport.getProjectBudgetContext, { projectId }),
    ).toBeNull();

    // 6b. Autre utilisateur, même avec un Client Pro actif.
    const intruderId = await createUser(t);
    const intruder = asUser(t, intruderId);
    const access = await intruder.query(
      api.decisionSupportAccess.getProjectDecisionSupportAccess,
      { projectId },
    );
    expect(access).toMatchObject({ allowed: false, reason: "not_owner" });
    expect(
      await intruder.query(api.decisionSupport.getProjectBudgetContext, { projectId }),
    ).toBeNull();
    await expect(
      intruder.mutation(api.decisionSupport.saveBudgetAnalysis, {
        projectId,
        budgetAvailable: 10_000,
        result: {},
      }),
    ).rejects.toThrow(DECISION_ACCESS_MARKER);
  });

  it("7. Les autres étapes du parcours restent accessibles aux utilisateurs non éligibles", async () => {
    await configurePricing(t, true);
    // Groupe B + compte gratuit : « Coût estimatif » reste consultable.
    const userId = await createUser(t, { plan: "free" });
    const projectId = await createProject(t, userId, "renovation_cuisine");
    const user = asUser(t, userId);

    expect(await user.query(api.projects.getProject, { projectId })).not.toBeNull();
    // … alors que l'aide à la décision est verrouillée.
    const access = await user.query(api.decisionSupportAccess.getProjectDecisionSupportAccess, {
      projectId,
    });
    expect(access.allowed).toBe(false);
  });
});

describe("getProjectDecisionSupportAccess — cohérence de l'abonnement", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    await configurePricing(t, false);
  });

  it("un essai gratuit actif ne remplace pas un abonnement Client Pro", async () => {
    const now = Date.now();
    const userId = await createUser(t, { plan: "free" });
    await t.run(async (ctx) =>
      ctx.db.patch(userId, {
        trialClaimedAt: now - DAY_MS,
        trialStartDate: now - DAY_MS,
        trialEndDate: now + 6 * DAY_MS,
        subscriptionStatus: "trialing",
      }),
    );
    const projectId = await createProject(t, userId, "villa");
    const access = await asUser(t, userId).query(
      api.decisionSupportAccess.getProjectDecisionSupportAccess,
      { projectId },
    );
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("not_client_pro");
  });

  it("l'accès se referme dès que l'abonnement expire (vérifié à chaque appel)", async () => {
    const userId = await createUser(t);
    const projectId = await createProject(t, userId, "villa");
    const user = asUser(t, userId);

    expect(
      (await user.query(api.decisionSupportAccess.getProjectDecisionSupportAccess, { projectId }))
        .allowed,
    ).toBe(true);

    // L'horloge serveur fait expirer l'abonnement : aucun cache côté client.
    await t.run(async (ctx) => ctx.db.patch(userId, { subscriptionEndDate: Date.now() - 1000 }));

    expect(
      (await user.query(api.decisionSupportAccess.getProjectDecisionSupportAccess, { projectId }))
        .allowed,
    ).toBe(false);
    expect(
      await user.query(api.decisionSupport.getProjectBudgetContext, { projectId }),
    ).toBeNull();
  });

  it("l'administrateur conserve l'accès (bypass de test), jamais pour le groupe B", async () => {
    const adminId = await createUser(t, { plan: null, role: "admin" });
    const projectA = await createProject(t, adminId, "villa");
    const projectB = await createProject(t, adminId, "piscine");
    const admin = asUser(t, adminId);

    expect(
      (await admin.query(api.decisionSupportAccess.getProjectDecisionSupportAccess, {
        projectId: projectA,
      })).allowed,
    ).toBe(true);
    expect(
      (await admin.query(api.decisionSupportAccess.getProjectDecisionSupportAccess, {
        projectId: projectB,
      })).allowed,
    ).toBe(false);
  });
});
