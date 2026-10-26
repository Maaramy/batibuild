/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// LIMITE DU NOMBRE DE PROJETS PAR OFFRE — comportement backend (Convex)
// ----------------------------------------------------------------------------
// • réglage administrateur (essai / offre gratuite / Client Pro), persisté ;
// • contrôle côté serveur DANS la transaction de création du projet ;
// • projets existants conservés et accessibles ;
// • changement d'offre et expiration de l'essai prises en compte ;
// • Client Pro payant conserve ses conditions (aucune limite par défaut).
// ============================================================================

const DAY = 24 * 60 * 60 * 1000;

interface UserOverrides {
  email?: string;
  role?: string;
  userRole?: "client" | "supplier" | "expert";
  subscriptionPlan?: "pro" | "supplier" | "expert" | "free";
  trialClaimedAt?: number;
  trialStartDate?: number;
  trialEndDate?: number;
  subscriptionStartDate?: number;
  subscriptionEndDate?: number;
}

async function insertUser(t: ReturnType<typeof convexTest>, overrides: UserOverrides = {}) {
  return t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert("users", {
      name: "Client BatiBuild",
      email: overrides.email ?? `limit-${Math.random()}@test.tn`,
      role: overrides.role ?? "user",
      status: "active",
      userRole: overrides.userRole ?? "client",
      subscriptionPlan: overrides.subscriptionPlan,
      trialClaimedAt: overrides.trialClaimedAt,
      trialStartDate: overrides.trialStartDate,
      trialEndDate: overrides.trialEndDate,
      subscriptionStartDate: overrides.subscriptionStartDate,
      subscriptionEndDate: overrides.subscriptionEndDate,
      createdAt: now,
      updatedAt: now,
    });
  });
}

/** Compte en période d'essai ACTIVE (module « Coût estimatif » ouvert). */
function insertTrialUser(t: ReturnType<typeof convexTest>, overrides: UserOverrides = {}) {
  const now = Date.now();
  return insertUser(t, {
    trialClaimedAt: now - DAY,
    trialStartDate: now - DAY,
    trialEndDate: now + 6 * DAY,
    ...overrides,
  });
}

/** Compte avec abonnement mensuel ACTIF (payant ou gratuit selon `proPrice`). */
function insertMonthlyUser(t: ReturnType<typeof convexTest>, overrides: UserOverrides = {}) {
  const now = Date.now();
  return insertUser(t, {
    subscriptionPlan: "pro",
    subscriptionStartDate: now - 2 * DAY,
    subscriptionEndDate: now + 28 * DAY,
    ...overrides,
  });
}

async function insertAdmin(t: ReturnType<typeof convexTest>, email = "admin@test.tn") {
  return insertUser(t, { role: "admin", email });
}

/** Configuration de facturation : prix Client Pro + paramètres de l'essai. */
async function configurePricing(
  t: ReturnType<typeof convexTest>,
  adminId: any,
  overrides: { proPrice?: number | null; trialEnabled?: boolean; trialModules?: string[] } = {},
) {
  return t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert("paymentConfig", {
      bankName: "",
      bankTitulaire: "",
      bankRib: "",
      bankIban: "",
      bankSwift: "",
      d17MerchantName: "",
      d17Phone: "",
      d17Email: "",
      d17Notice: "",
      currency: "TND",
      proPrice: overrides.proPrice === undefined ? 80 : overrides.proPrice,
      trialEnabled: overrides.trialEnabled ?? true,
      trialModules: overrides.trialModules ?? ["estimation"],
      updatedAt: now,
      updatedBy: adminId,
    });
  });
}

function setLimits(
  adminT: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
  limits: {
    trial?: { enabled: boolean; maxProjects: number; resetMode: "offer" | "total" };
    free?: { enabled: boolean; maxProjects: number; resetMode: "offer" | "total" };
    paid?: { enabled: boolean; maxProjects: number; resetMode: "offer" | "total" };
  },
) {
  return adminT.mutation(api.projectLimits.updateProjectLimitConfig, {
    trial: limits.trial ?? { enabled: false, maxProjects: 1, resetMode: "offer" },
    free: limits.free ?? { enabled: false, maxProjects: 1, resetMode: "offer" },
    paid: limits.paid ?? { enabled: false, maxProjects: 100, resetMode: "total" },
  });
}

/** Création de projet réelle (mutation publique, mêmes règles que le site). */
function createProject(userT: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>, name = "") {
  return userT.mutation(api.projects.createProject, {
    name,
    category: "maison",
    region: "tunis",
    surface: 150,
  });
}

async function storedProjectCount(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
) {
  return t.run(async (ctx) => {
    const rows = await ctx.db.query("projects").collect();
    return rows.filter((p) => p.userId === userId).length;
  });
}

// ---------------------------------------------------------------------------
// Comportement par défaut (aucune limite active)
// ---------------------------------------------------------------------------

describe("limite de projets — aucun réglage", () => {
  let t: ReturnType<typeof convexTest>;
  let adminT: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    const adminId = await insertAdmin(t);
    adminT = t.withIdentity({ subject: adminId });
    await configurePricing(t, adminId, { proPrice: 80 });
  });

  it("sans limite configurée, la création reste illimitée (comportement inchangé)", async () => {
    const userId = await insertTrialUser(t);
    const userT = t.withIdentity({ subject: userId });

    await createProject(userT);
    await createProject(userT);
    await createProject(userT);

    expect(await storedProjectCount(t, userId)).toBe(3);
  });

  it("l'administrateur n'est jamais limité", async () => {
    await setLimits(adminT, {
      trial: { enabled: true, maxProjects: 1, resetMode: "total" },
    });
    const adminUserT = adminT;

    await createProject(adminUserT);
    await createProject(adminUserT);

    const adminId = await t.run(async (ctx) => {
      const rows = await ctx.db.query("users").collect();
      return rows.find((u) => u.role === "admin")!._id;
    });
    expect(await storedProjectCount(t, adminId)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Période d'essai
// ---------------------------------------------------------------------------

describe("limite de projets — période d'essai", () => {
  let t: ReturnType<typeof convexTest>;
  let adminT: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    const adminId = await insertAdmin(t);
    adminT = t.withIdentity({ subject: adminId });
    await configurePricing(t, adminId, { proPrice: 80 });
  });

  it("bloque la création au-delà du plafond de l'essai, avec un message explicite", async () => {
    await setLimits(adminT, { trial: { enabled: true, maxProjects: 1, resetMode: "offer" } });

    const userId = await insertTrialUser(t);
    const userT = t.withIdentity({ subject: userId });

    await createProject(userT);

    await expect(createProject(userT)).rejects.toThrow(/PROJECT_LIMIT_REACHED:/);
    await expect(createProject(userT)).rejects.toThrow(/limite de 1 projet/);
    await expect(createProject(userT)).rejects.toThrow(/Passez à Client Pro/);

    // Aucun projet supplémentaire n'a été enregistré.
    expect(await storedProjectCount(t, userId)).toBe(1);
  });

  it("quota de 5 : les cinq premiers projets passent, le sixième est refusé", async () => {
    await setLimits(adminT, { trial: { enabled: true, maxProjects: 5, resetMode: "total" } });

    const userId = await insertTrialUser(t);
    const userT = t.withIdentity({ subject: userId });

    for (let i = 0; i < 5; i += 1) {
      await createProject(userT);
    }
    expect(await storedProjectCount(t, userId)).toBe(5);

    await expect(createProject(userT)).rejects.toThrow(/PROJECT_LIMIT_REACHED:/);
    expect(await storedProjectCount(t, userId)).toBe(5);
  });

  it("les projets existants restent consultables et modifiables après le blocage", async () => {
    await setLimits(adminT, { trial: { enabled: true, maxProjects: 1, resetMode: "total" } });

    const userId = await insertTrialUser(t);
    const userT = t.withIdentity({ subject: userId });
    const projectId = await createProject(userT, "Ma villa");

    await expect(createProject(userT)).rejects.toThrow(/PROJECT_LIMIT_REACHED:/);

    const project = await userT.query(api.projects.getProject, { projectId });
    expect(project?._id).toBe(projectId);
    expect(project?.name).toBe("Ma villa");

    // Modification d'un projet existant toujours autorisée.
    await userT.mutation(api.projects.updateProjectDimensions, { projectId, surface: 180 });
    const updated = await userT.query(api.projects.getProject, { projectId });
    expect(updated?.surface).toBe(180);
  });

  it("deux créations lancées ensemble ne dépassent jamais le plafond", async () => {
    await setLimits(adminT, { trial: { enabled: true, maxProjects: 1, resetMode: "total" } });

    const userId = await insertTrialUser(t);
    const userT = t.withIdentity({ subject: userId });

    const results = await Promise.allSettled([createProject(userT), createProject(userT)]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");

    expect(fulfilled).toHaveLength(1);
    expect(await storedProjectCount(t, userId)).toBe(1);
    expect(await userT.query(api.projectLimits.getMyProjectLimit, {})).toMatchObject({
      allowed: false,
      limitEnabled: true,
      maxProjects: 1,
      usedProjects: 1,
      remainingProjects: 0,
    });
  });

  it("le mode « par période de l'offre » ne compte que les projets de la période", async () => {
    const now = Date.now();
    const userId = await insertTrialUser(t, {
      trialStartDate: now - 2 * DAY,
      trialEndDate: now + 5 * DAY,
    });
    const userT = t.withIdentity({ subject: userId });

    // Projet créé AVANT le début de l'essai en cours (historique du compte).
    await t.run(async (ctx) =>
      ctx.db.insert("projects", {
        userId,
        name: "Ancien projet",
        category: "maison",
        status: "completed",
        createdAt: now - 30 * DAY,
        updatedAt: now - 30 * DAY,
      }),
    );

    await setLimits(adminT, { trial: { enabled: true, maxProjects: 1, resetMode: "offer" } });

    // La limite est disponible : l'ancien projet n'est pas décompté.
    await createProject(userT);
    await expect(createProject(userT)).rejects.toThrow(/PROJECT_LIMIT_REACHED:/);
    expect(await storedProjectCount(t, userId)).toBe(2);
  });

  it("le mode « total cumulé » compte aussi les projets antérieurs", async () => {
    const now = Date.now();
    const userId = await insertTrialUser(t);
    const userT = t.withIdentity({ subject: userId });

    await t.run(async (ctx) =>
      ctx.db.insert("projects", {
        userId,
        name: "Ancien projet",
        category: "maison",
        status: "completed",
        createdAt: now - 30 * DAY,
        updatedAt: now - 30 * DAY,
      }),
    );

    await setLimits(adminT, { trial: { enabled: true, maxProjects: 1, resetMode: "total" } });

    await expect(createProject(userT)).rejects.toThrow(/PROJECT_LIMIT_REACHED:/);
    expect(await storedProjectCount(t, userId)).toBe(1);
  });

  it("l'essai expiré bloque toujours par le contrôle Client Pro (projets conservés)", async () => {
    await setLimits(adminT, { trial: { enabled: true, maxProjects: 1, resetMode: "total" } });

    const now = Date.now();
    const userId = await insertTrialUser(t, {
      trialStartDate: now - 10 * DAY,
      trialEndDate: now - 3 * DAY,
    });
    const userT = t.withIdentity({ subject: userId });

    await t.run(async (ctx) =>
      ctx.db.insert("projects", {
        userId,
        name: "Projet de l'essai",
        category: "maison",
        status: "completed",
        createdAt: now - 5 * DAY,
        updatedAt: now - 5 * DAY,
      }),
    );

    await expect(createProject(userT)).rejects.toThrow(/CLIENT_PRO_ACCESS:/);
    expect(await storedProjectCount(t, userId)).toBe(1);
  });

  it("une désactivation des limites n'altère pas les projets déjà créés", async () => {
    await setLimits(adminT, { trial: { enabled: true, maxProjects: 1, resetMode: "total" } });
    const userId = await insertTrialUser(t);
    const userT = t.withIdentity({ subject: userId });
    await createProject(userT);

    await setLimits(adminT, {});

    // Le projet déjà enregistré reste lisible.
    expect(await storedProjectCount(t, userId)).toBe(1);
    // Et la création redevient possible.
    await createProject(userT);
    expect(await storedProjectCount(t, userId)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Offre gratuite et Client Pro payant
// ---------------------------------------------------------------------------

describe("limite de projets — offre gratuite et Client Pro", () => {
  let t: ReturnType<typeof convexTest>;
  let adminT: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>;
  let adminId: any;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await insertAdmin(t);
    adminT = t.withIdentity({ subject: adminId });
  });

  it("l'offre gratuite (prix null/0) a son propre plafond", async () => {
    // Client Pro rendu gratuit par l'administrateur (« Offre gratuite »).
    await configurePricing(t, adminId, { proPrice: 0 });
    await setLimits(adminT, { free: { enabled: true, maxProjects: 2, resetMode: "offer" } });

    const userId = await insertMonthlyUser(t);
    const userT = t.withIdentity({ subject: userId });

    await createProject(userT);
    await createProject(userT);
    await expect(createProject(userT)).rejects.toThrow(/offre gratuite/);
    expect(await storedProjectCount(t, userId)).toBe(2);
  });

  it("le plafond de l'offre gratuite ne s'applique pas au Client Pro payant", async () => {
    await configurePricing(t, adminId, { proPrice: 80 });
    await setLimits(adminT, { free: { enabled: true, maxProjects: 1, resetMode: "total" } });

    const userId = await insertMonthlyUser(t);
    const userT = t.withIdentity({ subject: userId });

    await createProject(userT);
    await createProject(userT);
    await createProject(userT);

    expect(await storedProjectCount(t, userId)).toBe(3);
  });

  it("Client Pro payant : le plafond facultatif, s'il est activé, s'applique séparément", async () => {
    await configurePricing(t, adminId, { proPrice: 80 });
    await setLimits(adminT, {
      trial: { enabled: true, maxProjects: 1, resetMode: "total" },
      free: { enabled: true, maxProjects: 1, resetMode: "total" },
      paid: { enabled: true, maxProjects: 3, resetMode: "offer" },
    });

    const userId = await insertMonthlyUser(t);
    const userT = t.withIdentity({ subject: userId });

    await createProject(userT);
    await createProject(userT);
    await createProject(userT);
    await expect(createProject(userT)).rejects.toThrow(/abonnement Client Pro/);
    expect(await storedProjectCount(t, userId)).toBe(3);
  });

  it("le passage à Client Pro lève le plafond de l'essai", async () => {
    await configurePricing(t, adminId, { proPrice: 80 });
    await setLimits(adminT, { trial: { enabled: true, maxProjects: 1, resetMode: "total" } });

    const now = Date.now();
    const userId = await insertTrialUser(t);
    const userT = t.withIdentity({ subject: userId });
    await createProject(userT);
    await expect(createProject(userT)).rejects.toThrow(/PROJECT_LIMIT_REACHED:/);

    // Souscription Client Pro active (30 jours) : l'essai est remplacé.
    await t.run(async (ctx) =>
      ctx.db.patch(userId, {
        subscriptionPlan: "pro",
        subscriptionStartDate: now,
        subscriptionEndDate: now + 30 * DAY,
      }),
    );

    await createProject(userT);
    expect(await storedProjectCount(t, userId)).toBe(2);
  });

  it("la configuration est persistée et relue (aucune valeur codée en dur)", async () => {
    await configurePricing(t, adminId, { proPrice: 80 });
    await setLimits(adminT, {
      trial: { enabled: true, maxProjects: 3, resetMode: "total" },
      free: { enabled: false, maxProjects: 5, resetMode: "offer" },
      paid: { enabled: true, maxProjects: 12, resetMode: "offer" },
    });

    const stored = await adminT.query(api.projectLimits.getProjectLimitConfig, {});
    expect(stored?.config).toEqual({
      trial: { enabled: true, maxProjects: 3, resetMode: "total" },
      free: { enabled: false, maxProjects: 5, resetMode: "offer" },
      paid: { enabled: true, maxProjects: 12, resetMode: "offer" },
    });
  });

  it("les paramètres sont refusés hors bornes et réservés à l'administrateur", async () => {
    await configurePricing(t, adminId, { proPrice: 80 });

    await expect(
      setLimits(adminT, { trial: { enabled: true, maxProjects: 0, resetMode: "total" } }),
    ).rejects.toThrow(/compris entre 1 et/);

    await expect(
      setLimits(adminT, { paid: { enabled: true, maxProjects: 100000, resetMode: "offer" } }),
    ).rejects.toThrow(/compris entre 1 et/);

    const userId = await insertMonthlyUser(t);
    await expect(
      setLimits(t.withIdentity({ subject: userId }), {
        trial: { enabled: true, maxProjects: 1, resetMode: "total" },
      }),
    ).rejects.toThrow(/Admin access required/);
  });

  it("la réinitialisation retire toutes les limites", async () => {
    await configurePricing(t, adminId, { proPrice: 80 });
    await setLimits(adminT, {
      trial: { enabled: true, maxProjects: 1, resetMode: "total" },
      paid: { enabled: true, maxProjects: 2, resetMode: "total" },
    });

    await adminT.mutation(api.projectLimits.resetProjectLimitConfig, {});

    const stored = await adminT.query(api.projectLimits.getProjectLimitConfig, {});
    expect(stored?.config.trial.enabled).toBe(false);
    expect(stored?.config.paid.enabled).toBe(false);

    const userId = await insertMonthlyUser(t);
    const userT = t.withIdentity({ subject: userId });
    await createProject(userT);
    await createProject(userT);
    await createProject(userT);
    expect(await storedProjectCount(t, userId)).toBe(3);
  });
});
