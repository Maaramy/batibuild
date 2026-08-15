/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { TUNISIA_2026_CATALOG } from "./materialCatalog2026";

const modules = import.meta.glob("./**/*.*s");

// Catégories officielles 2026 (non-legacy) — doivent rester stables dans le schéma
const OFFICIAL_2026_CATEGORIES = [
  "terrassement_granulats",
  "liants_ciments_mortiers",
  "betons_prefabrication",
  "acier_metaux_structure",
  "maconnerie_plancher",
  "bois_panneaux_coffrage",
  "etancheite_protection",
  "isolation_thermique",
  "cloisons_platre_plafonds",
  "toitures_bardages_facades",
  "revetements_sols_murs",
  "peintures_enduits_finitions",
  "menuiseries",
  "vitrage_verriers",
  "chimie_construction",
  "quincaillerie_fixations",
  "eclairage",
  "cvc_chauffage_ventilation",
  "energies_renouvelables",
  "securite_incendie_surete",
  "voirie_reseaux_drainage",
  "amenagements_exterieurs",
  "materiaux_durables_biosources",
  "equipements",
];

async function createUser(
  t: ReturnType<typeof convexTest>,
  role: string,
  email: string,
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      name: role === "admin" ? "Admin Test" : "User Test",
      email,
      role,
      status: "active",
      subscriptionPlan: "free",
      image: undefined,
      company: undefined,
      phone: undefined,
      subscriptionEndDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

/** Insère une ancienne référence legacy + son historique de prix */
async function insertLegacyMaterial(
  t: ReturnType<typeof convexTest>,
  adminId: string,
) {
  return t.run(async (ctx) => {
    const materialId = await ctx.db.insert("materialPrices", {
      category: "ciment" as any, // catégorie legacy
      name: "Ancienne référence (legacy)",
      unit: "sac",
      unitPrice: 12.5,
      currency: "TND",
      lastUpdated: Date.now(),
      updatedBy: adminId as any,
      priceQuality: "estimation_indicative" as any,
    });
    await ctx.db.insert("priceHistory", {
      materialPriceId: materialId,
      previousPrice: 11,
      newPrice: 12.5,
      changedBy: adminId as any,
      changedAt: Date.now(),
    });
    return materialId;
  });
}

describe("resetMaterialPrices", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("refuse la réinitialisation à un utilisateur non-admin", async () => {
    const userId = await createUser(t, "user", "user@test.com");
    const userT = t.withIdentity({ subject: userId });
    await expect(
      userT.mutation(api.materials.resetMaterialPrices, {}),
    ).rejects.toThrow("Unauthorized");
  });

  it("refuse la réinitialisation à un modérateur", async () => {
    const modId = await createUser(t, "moderator", "mod@test.com");
    const modT = t.withIdentity({ subject: modId });
    await expect(
      modT.mutation(api.materials.resetMaterialPrices, {}),
    ).rejects.toThrow("Unauthorized");
  });

  it("supprime les anciennes références + leur historique puis charge le catalogue 2026", async () => {
    const adminId = await createUser(t, "admin", "admin@test.com");
    const adminT = t.withIdentity({ subject: adminId });
    const legacyId = await insertLegacyMaterial(t, adminId);

    const res = await adminT.mutation(api.materials.resetMaterialPrices, {});
    expect(res.deleted).toBe(1);
    expect(res.seeded).toBe(TUNISIA_2026_CATALOG.length);
    expect(res.total).toBe(TUNISIA_2026_CATALOG.length);

    // L'ancienne référence a disparu
    const gone = await t.run(async (ctx) => ctx.db.get(legacyId as any));
    expect(gone).toBeNull();

    // L'historique de prix est purgé
    const history = await t.run(async (ctx) =>
      ctx.db.query("priceHistory").collect(),
    );
    expect(history.length).toBe(0);

    // Le catalogue officiel est présent
    const materials = await t.run(async (ctx) =>
      ctx.db.query("materialPrices").collect(),
    );
    expect(materials.length).toBe(TUNISIA_2026_CATALOG.length);
    const names = materials.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length); // pas de doublons
  });

  it("fonctionne sur une base vide", async () => {
    const adminId = await createUser(t, "admin", "admin@test.com");
    const adminT = t.withIdentity({ subject: adminId });
    const res = await adminT.mutation(api.materials.resetMaterialPrices, {});
    expect(res.deleted).toBe(0);
    expect(res.seeded).toBe(TUNISIA_2026_CATALOG.length);
  });

  it("charge uniquement des catégories officielles 2026 avec qualité de prix", async () => {
    const adminId = await createUser(t, "admin", "admin@test.com");
    const adminT = t.withIdentity({ subject: adminId });
    await insertLegacyMaterial(t, adminId);
    await adminT.mutation(api.materials.resetMaterialPrices, {});

    const materials = await t.run(async (ctx) =>
      ctx.db.query("materialPrices").collect(),
    );
    for (const m of materials) {
      expect(OFFICIAL_2026_CATEGORIES).toContain(m.category);
      expect(m.priceQuality).toBeTruthy();
      expect(m.confidenceIndex).toBeGreaterThan(0);
      expect(m.currency).toBe("TND");
      expect(m.unitPrice).toBeGreaterThan(0);
    }
  });
});

describe("seedMaterialPrices", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("refuse le seed à un utilisateur non-admin", async () => {
    const userId = await createUser(t, "user", "user@test.com");
    const userT = t.withIdentity({ subject: userId });
    await expect(
      userT.mutation(api.materials.seedMaterialPrices, {}),
    ).rejects.toThrow("Unauthorized");
  });

  it("seed idempotent : un second seed ne crée pas de doublons", async () => {
    const adminId = await createUser(t, "admin", "admin@test.com");
    const adminT = t.withIdentity({ subject: adminId });
    const res1 = await adminT.mutation(api.materials.seedMaterialPrices, {});
    expect(res1.count).toBe(TUNISIA_2026_CATALOG.length);

    const res2 = await adminT.mutation(api.materials.seedMaterialPrices, {});
    expect(res2.count).toBe(0);
    expect(res2.total).toBe(TUNISIA_2026_CATALOG.length);

    const materials = await t.run(async (ctx) =>
      ctx.db.query("materialPrices").collect(),
    );
    expect(materials.length).toBe(TUNISIA_2026_CATALOG.length);
  });

  it("réaligne une référence legacy existante vers sa catégorie 2026", async () => {
    const adminId = await createUser(t, "admin", "admin@test.com");
    const adminT = t.withIdentity({ subject: adminId });

    // Insère « Ciment CPJ 42.5 (sac 50 kg) » (présent dans le catalogue) en catégorie legacy
    const legacyId = await t.run(async (ctx) =>
      ctx.db.insert("materialPrices", {
        category: "ciment" as any,
        name: "Ciment CPJ 42.5 (sac 50 kg)",
        unit: "sac",
        unitPrice: 10,
        currency: "TND",
        lastUpdated: Date.now(),
        updatedBy: adminId as any,
        priceQuality: "estimation_indicative" as any,
      }),
    );

    const res = await adminT.mutation(api.materials.seedMaterialPrices, {});
    expect(res.count).toBe(TUNISIA_2026_CATALOG.length - 1); // 1 existant → mis à jour
    expect(res.updated).toBeGreaterThanOrEqual(1);

    const updated = await t.run(async (ctx) => ctx.db.get(legacyId as any));
    expect(updated.category).toBe("liants_ciments_mortiers");
    expect(updated.unitPrice).toBe(16.5);
    expect(updated.priceQuality).toBe("observé_en_ligne");
  });
});
