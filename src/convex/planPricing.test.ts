/// <reference types="vite/client" />

import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { DEFAULT_PLAN_PRICES } from "../lib/planPricing";

// ============================================================================
// Persistance du prix mensuel du forfait Client Pro (régression)
// ============================================================================
// Cause historique : un document `paymentConfig` créé par un AUTRE réglage
// (période d'essai, limite de projets) ne portait aucun champ de prix. La
// lecture transformait ce champ ABSENT en `null`, c'est-à-dire « Offre
// gratuite » : le panneau d'administration affichait alors la valeur codée en
// dur (80 TND) comme si elle était enregistrée, et la sauvegarde suivante
// réécrivait `null`. Le prix saisi par l'administrateur (95 TND) était donc
// perdu à chaque actualisation.
//
// Règle verrouillée ici (voir `lib/planPricing.ts`) :
//   • champ ABSENT  → valeur INITIALE du forfait, jamais « gratuit » ;
//   • `null` / 0    → « Offre gratuite » choisie explicitement par l'admin ;
//   • nombre        → prix enregistré, conservé à l'identique et utilisé
//                     partout (administration, page tarifs, contrôles d'accès).

const modules = import.meta.glob("./**/*.*s");

type T = ReturnType<typeof convexTest>;
type AdminT = ReturnType<T["withIdentity"]>;

async function insertAdmin(t: T, email = "admin@batibuild.tn") {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Administrateur",
      email,
      role: "admin",
      status: "active",
      subscriptionPlan: "pro",
      image: undefined,
      company: undefined,
      phone: undefined,
      subscriptionEndDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

/** Champs obligatoires d'un `paymentConfig` (sans aucun prix : document « partiel »). */
function partialConfig(extra: Record<string, unknown> = {}) {
  return {
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
    updatedAt: Date.now(),
    ...extra,
  } as any;
}

async function storedConfig(t: T) {
  return t.run(async (ctx) => (await ctx.db.query("paymentConfig").collect())[0]);
}

/** Prix vu par la page tarifs, les contrôles d'accès et le paiement. */
async function publicProPrice(t: T) {
  return (await t.query(api.payments.getPublicPricing)).proPrice;
}

async function adminProPrice(adminT: AdminT) {
  return (await adminT.query(api.payments.getPlanPricing))!.proPrice;
}

describe("prix Client Pro — persistance après enregistrement", () => {
  let t: T;
  let adminT: AdminT;

  async function setup(config?: Record<string, unknown>) {
    t = convexTest(schema, modules);
    const adminId = await insertAdmin(t);
    adminT = t.withIdentity({ subject: adminId });
    if (config) {
      await t.run(async (ctx) => ctx.db.insert("paymentConfig", config as any));
    }
    return adminId;
  }

  it("enregistre 95 TND et le conserve à chaque relecture (équivalent actualisation)", async () => {
    const adminId = await setup();

    await adminT.mutation(api.payments.updatePlanPricing, { plan: "pro", price: 95 });

    // Valeur réellement écrite en base.
    expect((await storedConfig(t)).proPrice).toBe(95);

    // Relectures répétées : plusieurs « actualisations » de la plateforme.
    for (let i = 0; i < 3; i++) {
      expect(await adminProPrice(adminT)).toBe(95);
      expect(await publicProPrice(t)).toBe(95);
    }

    // Déconnexion / reconnexion de l'administrateur : même valeur relue.
    adminT = t.withIdentity({ subject: adminId });
    expect(await adminProPrice(adminT)).toBe(95);
  });

  it("un document créé par la période d'essai n'est plus lu comme « gratuit »", async () => {
    await setup();

    // Création du document par le panneau « Période d'essai gratuite ».
    await adminT.mutation(api.trialConfig.updateTrialConfig, {
      enabled: true,
      durationDays: 14,
      validFrom: null,
      validUntil: null,
      eligibleProfiles: ["supplier", "expert"],
      modules: ["estimation"],
      newAccountsOnly: true,
    });

    // Le document créé porte désormais les prix : plus aucun champ absent.
    const stored = await storedConfig(t);
    expect(stored.proPrice).toBe(DEFAULT_PLAN_PRICES.pro);
    expect(stored.supplierPrice).toBe(DEFAULT_PLAN_PRICES.supplier);
    expect(stored.expertPrice).toBe(DEFAULT_PLAN_PRICES.expert);

    // Lecture : forfait PAYANT à sa valeur initiale, jamais « gratuit »/null.
    expect(await adminProPrice(adminT)).toBe(DEFAULT_PLAN_PRICES.pro);
    expect(await publicProPrice(t)).toBe(DEFAULT_PLAN_PRICES.pro);
  });

  it("un document partiel (sans prix) reste PAYANT à la valeur initiale", async () => {
    await setup(partialConfig({ trialEnabled: true }));

    expect(await adminProPrice(adminT)).toBe(DEFAULT_PLAN_PRICES.pro);
    expect(await publicProPrice(t)).toBe(DEFAULT_PLAN_PRICES.pro);
  });

  it("bout en bout : 80 TND → 95 TND sur un document partiel, puis conservation", async () => {
    await setup(partialConfig({ trialEnabled: true }));

    // Séquence exacte du bouton « Enregistrer les abonnements ».
    await adminT.mutation(api.payments.updateClientProEnabled, { enabled: true });
    await adminT.mutation(api.payments.updateDefaultPlanConfig, { plan: "trial" });
    await adminT.mutation(api.payments.updatePlanPricing, { plan: "pro", price: 95 });
    await adminT.mutation(api.payments.updatePlanPricing, { plan: "supplier", price: 130 });
    await adminT.mutation(api.payments.updatePlanPricing, { plan: "expert", price: 140 });

    expect(await adminProPrice(adminT)).toBe(95);
    expect(await publicProPrice(t)).toBe(95);
    expect((await storedConfig(t)).proPrice).toBe(95);

    // Actualisation : la valeur reste 95 TND (ce n'est plus 80 TND).
    expect(await adminProPrice(adminT)).toBe(95);
    expect(await publicProPrice(t)).toBe(95);
  });

  it("les autres réglages d'administration ne réinitialisent jamais le prix", async () => {
    await setup(partialConfig());
    await adminT.mutation(api.payments.updatePlanPricing, { plan: "pro", price: 95 });

    // Période d'essai
    await adminT.mutation(api.trialConfig.updateTrialConfig, {
      enabled: true,
      durationDays: 30,
      validFrom: null,
      validUntil: null,
      eligibleProfiles: ["supplier", "expert"],
      modules: ["estimation", "decision"],
      newAccountsOnly: true,
    });
    // Limite du nombre de projets
    await adminT.mutation(api.projectLimits.updateProjectLimitConfig, {
      trial: { enabled: true, maxProjects: 1, resetMode: "offer" },
      free: { enabled: true, maxProjects: 3, resetMode: "offer" },
      paid: { enabled: false, maxProjects: 100, resetMode: "total" },
    });
    // Coordonnées de paiement / méthode de paiement
    await adminT.mutation(api.payments.updatePaymentConfig, { bankName: "Banque de Tunisie" });
    await adminT.mutation(api.payments.updatePaymentMethodState, {
      slug: "bank_transfer",
      enabled: true,
    });

    expect(await adminProPrice(adminT)).toBe(95);
    expect(await publicProPrice(t)).toBe(95);
    expect((await storedConfig(t)).proPrice).toBe(95);
  });

  it("« Offre gratuite » (null) reste prise en charge et réversible", async () => {
    await setup();
    await adminT.mutation(api.payments.updatePlanPricing, { plan: "pro", price: 95 });

    // Activation explicite de l'offre gratuite : prix null enregistré.
    await adminT.mutation(api.payments.updatePlanPricing, { plan: "pro", price: null });
    expect(await adminProPrice(adminT)).toBeNull();
    expect(await publicProPrice(t)).toBeNull();

    // Retour à un forfait payant : la valeur reprend un montant réel.
    await adminT.mutation(api.payments.updatePlanPricing, { plan: "pro", price: 95 });
    expect(await adminProPrice(adminT)).toBe(95);
    expect(await publicProPrice(t)).toBe(95);
  });

  it("un prix invalide est refusé et n'écrase pas le prix enregistré", async () => {
    await setup();
    await adminT.mutation(api.payments.updatePlanPricing, { plan: "pro", price: 95 });

    await expect(
      adminT.mutation(api.payments.updatePlanPricing, { plan: "pro", price: -20 }),
    ).rejects.toThrow(/prix mensuel/i);

    expect(await adminProPrice(adminT)).toBe(95);
    expect((await storedConfig(t)).proPrice).toBe(95);
  });

  it("l'administrateur non autorisé ne peut pas modifier le prix", async () => {
    await setup();
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Utilisateur",
        email: "user@batibuild.tn",
        role: "user",
        status: "active",
        subscriptionPlan: "free",
        image: undefined,
        company: undefined,
        phone: undefined,
        subscriptionEndDate: undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    const userT = t.withIdentity({ subject: userId });

    await expect(
      userT.mutation(api.payments.updatePlanPricing, { plan: "pro", price: 95 }),
    ).rejects.toThrow(/Unauthorized/);

    // Aucun document de configuration n'a été créé par cette tentative.
    expect(await storedConfig(t)).toBeFalsy();
  });

  it("le prix est identique côté administration et côté utilisateur (source unique)", async () => {
    await setup(partialConfig({ trialEnabled: true }));

    await adminT.mutation(api.payments.updatePlanPricing, { plan: "pro", price: 95 });

    const admin = await adminT.query(api.payments.getPlanPricing);
    const publicPricing = await t.query(api.payments.getPublicPricing);

    expect(admin!.proPrice).toBe(95);
    expect(publicPricing.proPrice).toBe(95);
    expect(publicPricing.proPrice).toBe(admin!.proPrice);
  });
});
