/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { formatProjectName, projectNumberFromName } from "./projectNaming.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// NUMÉROTATION AUTOMATIQUE DES PROJETS — comportement backend (Convex)
// ----------------------------------------------------------------------------
// • nom vide → « #N Mon/Ma <type> » attribué à l'enregistrement ;
// • séquence PROPRE À CHAQUE COMPTE (« #1 » pour le premier projet du compte) ;
// • numéros séquentiels, uniques par compte (même en créations simultanées),
//   persistants et indépendants des projets des autres utilisateurs ;
// • calcul du prochain numéro à partir des projets DÉJÀ enregistrés du compte ;
// • une saisie manuelle n'est jamais écrasée ; un nom déjà généré reçoit son
//   numéro DÉFINITIF (aucun trou, aucun doublon).
// ============================================================================

/** Administrateur : accès Client Pro accordé (bypass de test d'accès). */
async function createUser(t: ReturnType<typeof convexTest>, email?: string) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Client BatiBuild",
      email: email ?? `naming-${Math.random()}@test.com`,
      role: "admin",
      status: "active",
      subscriptionPlan: "pro",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

async function storedNames(t: ReturnType<typeof convexTest>): Promise<string[]> {
  return t.run(async (ctx) => (await ctx.db.query("projects").collect()).map((p) => p.name));
}

async function storedName(
  t: ReturnType<typeof convexTest>,
  projectId: any,
): Promise<string | undefined> {
  return t.run(async (ctx) => (await ctx.db.get(projectId))?.name);
}

describe("nom du projet généré automatiquement", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: any;
  let asUser: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createUser(t);
    asUser = t.withIdentity({ subject: userId });
  });

  it("génère « #1 Ma maison » pour un projet Maison sans nom", async () => {
    const projectId = await asUser.mutation(api.projects.createProject, {
      name: "",
      category: "maison",
      region: "tunis",
      surface: 150,
    });

    expect(await storedName(t, projectId)).toBe("#1 Ma maison");
  });

  it("génère « #N Mon bureau » pour un projet Bureau", async () => {
    const first = await asUser.mutation(api.projects.createProject, {
      name: "",
      category: "maison",
    });
    const second = await asUser.mutation(api.projects.createProject, {
      // Nom pré-rempli par le formulaire (aperçu) : le numéro définitif est
      // attribué à l'enregistrement.
      name: "#2 Mon bureau",
      category: "bureau",
    });

    expect(await storedName(t, first)).toBe("#1 Ma maison");
    expect(await storedName(t, second)).toBe("#2 Mon bureau");
  });

  it("incrémente correctement sur des créations successives", async () => {
    const categories = ["maison", "villa", "piscine", "renovation_cuisine"] as const;
    for (const category of categories) {
      await asUser.mutation(api.projects.createProject, { name: "", category });
    }

    expect([...(await storedNames(t))].sort()).toEqual(
      ["#1 Ma maison", "#2 Ma villa", "#3 Ma piscine", "#4 Ma rénovation cuisine"].sort(),
    );
  });

  it("ne produit aucun doublon en créations simultanées", async () => {
    const projectIds = await Promise.all(
      Array.from({ length: 6 }, () =>
        asUser.mutation(api.projects.createProject, { name: "", category: "maison" }),
      ),
    );

    const names = await Promise.all(projectIds.map((id) => storedName(t, id)));
    const numbers = names.map((name) => projectNumberFromName(name ?? ""));

    expect(numbers.filter((n) => n === null)).toHaveLength(0);
    expect(new Set(numbers).size).toBe(6);
    expect([...names].sort()).toEqual(
      Array.from({ length: 6 }, (_, i) => formatProjectName("maison", i + 1)).sort(),
    );
  });

  it("numérote chaque compte indépendamment (deux comptes peuvent avoir « #1 »)", async () => {
    const otherUserId = await createUser(t, "voisin@test.com");
    const asOther = t.withIdentity({ subject: otherUserId });

    const [mine, theirs] = await Promise.all([
      asUser.mutation(api.projects.createProject, { name: "", category: "villa" }),
      asOther.mutation(api.projects.createProject, { name: "", category: "duplex" }),
    ]);

    // Le numéro ne dépend jamais des projets des autres utilisateurs.
    expect(await storedName(t, mine)).toBe("#1 Ma villa");
    expect(await storedName(t, theirs)).toBe("#1 Mon duplex");
  });

  it("continue la séquence du compte à partir de SES projets existants", async () => {
    // Compte existant avec 7 projets déjà numérotés.
    await t.run(async (ctx) => {
      for (let i = 1; i <= 7; i += 1) {
        await ctx.db.insert("projects", {
          userId,
          name: formatProjectName("maison", i),
          category: "maison",
          status: "draft",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as any);
      }
    });

    // ... et un autre compte dont les numéros sont beaucoup plus élevés.
    const otherUserId = await createUser(t, "grand-compte@test.com");
    await t.run(async (ctx) =>
      ctx.db.insert("projects", {
        userId: otherUserId,
        name: "#40 Ma maison",
        category: "maison",
        status: "draft",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any),
    );

    const projectId = await asUser.mutation(api.projects.createProject, {
      name: "",
      category: "maison",
    });
    expect(await storedName(t, projectId)).toBe("#8 Ma maison");

    // Le compte voisin, lui, continue à partir de son propre numéro.
    const asOther = t.withIdentity({ subject: otherUserId });
    const theirProject = await asOther.mutation(api.projects.createProject, {
      name: "",
      category: "maison",
    });
    expect(await storedName(t, theirProject)).toBe("#41 Ma maison");
  });

  it("n'attribue jamais deux fois le même numéro à un compte, même en concurrence avec un autre", async () => {
    const otherUserId = await createUser(t, "concurrent@test.com");
    const asOther = t.withIdentity({ subject: otherUserId });

    const ids = await Promise.all([
      asUser.mutation(api.projects.createProject, { name: "", category: "maison" }),
      asOther.mutation(api.projects.createProject, { name: "", category: "maison" }),
      asUser.mutation(api.projects.createProject, { name: "", category: "villa" }),
      asOther.mutation(api.projects.createProject, { name: "", category: "villa" }),
    ]);

    const rows = await t.run(async (ctx) =>
      Promise.all(ids.map(async (id) => (await ctx.db.get(id))!)),
    );

    // Chaque compte a bien sa propre séquence #1 puis #2, sans doublon.
    for (const [owner, expected] of [
      [userId, ["#1 Ma maison", "#2 Ma villa"]],
      [otherUserId, ["#1 Ma maison", "#2 Ma villa"]],
    ] as const) {
      const names = rows.filter((p) => p.userId === owner).map((p) => p.name).sort();
      expect(names).toEqual([...expected].sort());
    }
  });

  it("conserve le nom et le numéro après relecture (actualisation, réouverture)", async () => {
    const projectId = await asUser.mutation(api.projects.createProject, {
      name: "",
      category: "piscine",
    });

    // Première lecture (création) puis relectures : le nom est persisté en base,
    // il ne dépend pas de l'état du formulaire.
    const first = await asUser.query(api.projects.getProject, { projectId });
    const second = await asUser.query(api.projects.getProject, { projectId });

    expect(first?.name).toBe("#1 Ma piscine");
    expect(second?.name).toBe("#1 Ma piscine");
    expect(await storedName(t, projectId)).toBe("#1 Ma piscine");
  });

  it("préserve une saisie manuelle et n'y touche pas après enregistrement", async () => {
    const projectId = await asUser.mutation(api.projects.createProject, {
      name: "Villa familiale à Sousse",
      category: "villa",
    });
    const manual = await storedName(t, projectId);
    expect(manual).toBe("Villa familiale à Sousse");

    // Aucun numéro n'a été consommé pour ce nom : le prochain projet généré
    // démarre bien à #1 (pas de trou artificiel).
    const generated = await asUser.mutation(api.projects.createProject, {
      name: "",
      category: "villa",
    });
    expect(await storedName(t, generated)).toBe("#1 Ma villa");
  });

  it("remplace un numéro provisoire par le numéro définitif (jamais de trou ni de doublon)", async () => {
    // Aperçu obsolète : un autre projet a été créé entre-temps.
    await asUser.mutation(api.projects.createProject, { name: "", category: "maison" });
    const second = await asUser.mutation(api.projects.createProject, {
      name: "#99 Ma maison",
      category: "maison",
    });

    expect(await storedName(t, second)).toBe("#2 Ma maison");
  });

  it("calcule le prochain numéro à partir des projets déjà enregistrés", async () => {
    // Base existante SANS compteur (projets créés avant cette fonctionnalité).
    await t.run(async (ctx) =>
      ctx.db.insert("projects", {
        userId,
        name: "#7 Mon bureau",
        category: "bureau",
        status: "draft",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any),
    );

    const projectId = await asUser.mutation(api.projects.createProject, {
      name: "",
      category: "bureau",
    });
    expect(await storedName(t, projectId)).toBe("#8 Mon bureau");
  });

  it("ne réutilise jamais un numéro déjà attribué (projet supprimé ensuite)", async () => {
    const first = await asUser.mutation(api.projects.createProject, {
      name: "",
      category: "maison",
    });
    await t.run(async (ctx) => ctx.db.delete(first));

    const second = await asUser.mutation(api.projects.createProject, {
      name: "",
      category: "maison",
    });
    expect(await storedName(t, second)).toBe("#2 Ma maison");
  });

  it("annonce en aperçu le numéro qui sera réellement attribué", async () => {
    const before = await asUser.query(api.projects.nextProjectNumber, { category: "appartement" });
    expect(before).toEqual({ number: 1, name: "#1 Mon appartement" });

    const projectId = await asUser.mutation(api.projects.createProject, {
      name: before!.name!,
      category: "appartement",
    });
    expect(await storedName(t, projectId)).toBe(before!.name);

    // L'aperçu ne réserve rien mais reste exact après l'enregistrement.
    const after = await asUser.query(api.projects.nextProjectNumber, { category: "appartement" });
    expect(after).toEqual({ number: 2, name: "#2 Mon appartement" });
  });

  it("n'expose pas l'aperçu aux visiteurs non authentifiés", async () => {
    expect(await t.query(api.projects.nextProjectNumber, {})).toBeNull();
  });
});
