// ============================================================================
// BARÈME ÉLECTRICITÉ 2026 — PRIX, RÈGLES DE CALCUL ET POSTE DU DQE
// ----------------------------------------------------------------------------
// Vérifie les DEUX usages du barème électricité tunisien 2026 :
//
//   1. « Électricité complète » — le prix au m² du type de projet EST le
//      barème du niveau (Économique 35 · Standard 65 · Premium 100 DT/m²,
//      valeurs de paramétrage), indexé une seule fois par le coefficient
//      régional de la grille 2026 (base Médenine = 100 %).
//   2. « Électricité — Second œuvre et finitions » — la partie électrique du
//      lot « Second œuvre et finitions » du Quantitatif détaillé est chiffrée
//      au barème (TND/m² × surface réellement construite) à la place des
//      forfaits électriques du gabarit, SANS double compte : le sous-total du
//      lot et le coût global TTC restent ceux de la grille.
//
// Les contrôles de non-vacuité sont explicites : sans branchement du barème,
// l'ancien forfait électrique reste en place (les tests le vérifient).
// ============================================================================

/// <reference types="vite/client" />

import { describe, expect, it, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { generateDqe } from "./dqeEngine";
import { runBIMEstimation } from "./bimEngine";
import {
  DEFAULT_ELECTRICITY_PRICES,
  ELECTRICITY_SUBPOSTES,
  buildElectricityPoste,
  electricityPricePerM2,
  electricityRegionIndex,
  electricitySubPostes,
  isElectricityCategory,
  parseElectricityPrices,
  resolveElectricityPrices,
  validateElectricityPrices,
} from "../lib/electricityPricing";

const modules = import.meta.glob("./**/*.*s");

const BAREME = { economique: 35, standard: 65, premium: 100 };
const BAREME_STANDARD = { priceM2: 65, levelLabel: "Standard" };

/** Coût estimatif d'un projet, barème effectif transmis au moteur. */
function estimate(
  category: string,
  surface: number,
  floors: number,
  region: string,
  finishLevel: string,
  electricityPrices?: { economique: number; standard: number; premium: number },
) {
  return runBIMEstimation(category, surface, floors, region, finishLevel, undefined, {
    electricityPrices,
  }).costEstimate;
}

describe("1 · Barème électricité 2026 — données et paramétrage", () => {
  it("les valeurs initiales sont celles de la Tunisie 2026 (Éco 35 · Std 65 · Premium 100)", () => {
    expect(DEFAULT_ELECTRICITY_PRICES).toEqual(BAREME);
    expect(resolveElectricityPrices()).toEqual(BAREME);
  });

  it("une valeur enregistrée partielle est complétée par les défauts", () => {
    expect(resolveElectricityPrices({ standard: 70 })).toEqual({
      economique: 35,
      standard: 70,
      premium: 100,
    });
    // Valeur nulle ou négative : repli sur le défaut, jamais un prix invalide.
    expect(resolveElectricityPrices({ standard: 0 }).standard).toBe(65);
    expect(resolveElectricityPrices({ standard: -5 }).standard).toBe(65);
    expect(parseElectricityPrices("{}")).toBeUndefined();
    expect(parseElectricityPrices("{pas du json")).toBeUndefined();
    expect(parseElectricityPrices('{"standard":70,"premium":"cher"}')).toEqual({ standard: 70 });
  });

  it("une saisie administrative hors fourchette est refusée avec ses bornes", () => {
    expect(validateElectricityPrices(JSON.stringify(BAREME))).toBeNull();
    expect(validateElectricityPrices('{"standard": 65}')).toBeNull();

    const tooHigh = validateElectricityPrices('{"standard": 200}');
    expect(tooHigh).toContain("hors fourchette");
    expect(tooHigh).toContain("30-120");

    const tooLow = validateElectricityPrices('{"premium": 10}');
    expect(tooLow).toContain("50-200");

    expect(validateElectricityPrices("{pas du json")).toContain("illisible");
  });

  it("le coefficient régional est appliqué une seule fois (base Médenine = 100 %)", () => {
    expect(electricityRegionIndex(1800)).toBe(1);
    expect(electricityRegionIndex(1980)).toBe(1.1);
    expect(electricityRegionIndex(undefined)).toBe(1);
    // Prix réellement appliqué : barème × coefficient régional.
    expect(electricityPricePerM2("standard", BAREME, 1)).toBe(65);
    expect(electricityPricePerM2("standard", BAREME, 1.1)).toBe(72);
    expect(electricityPricePerM2("premium", BAREME, 1.1)).toBe(110);
  });

  it("la ventilation du poste ne perd aucune part (somme = montant)", () => {
    const parts = electricitySubPostes(7800);
    expect(parts).toHaveLength(ELECTRICITY_SUBPOSTES.length);
    const shares = ELECTRICITY_SUBPOSTES.reduce((s, sp) => s + sp.share, 0);
    expect(shares).toBeCloseTo(1, 10);
    // Aucune part ne dépasse le montant, la somme reste dans l'arrondi.
    expect(parts.every((p) => p.amount >= 0)).toBe(true);
    expect(parts.reduce((s, p) => s + p.amount, 0)).toBeGreaterThan(7800 - parts.length);
    expect(parts.reduce((s, p) => s + p.amount, 0)).toBeLessThanOrEqual(7800);
  });

  it("seules les catégories d'installation électrique sont concernées", () => {
    expect(isElectricityCategory("electricite_complete")).toBe(true);
    expect(isElectricityCategory("installations_electricite")).toBe(true);
    expect(isElectricityCategory("maison")).toBe(false);
    expect(isElectricityCategory(undefined)).toBe(false);
  });
});

describe("2 · « Électricité complète » — prix au m² = barème", () => {
  it("à la base Médenine (100 %), le prix au m² est exactement le barème", () => {
    const ce = estimate("electricite_complete", 100, 1, "medenine", "standard");
    expect(ce.costPerSquareMeter).toBe(65);
    expect(ce.totalCost).toBe(65 * 100);
    expect(ce.budgetScenarios?.economique.costPerM2).toBe(35);
    expect(ce.budgetScenarios?.standard.costPerM2).toBe(65);
    expect(ce.budgetScenarios?.premium.costPerM2).toBe(100);
    expect(ce.budgetScenarios?.economique.totalCost).toBe(35 * 100);
    expect(ce.budgetScenarios?.premium.totalCost).toBe(100 * 100);
  });

  it("le coefficient régional de la grille 2026 s'applique au barème (Tunis ×1,10)", () => {
    const ce = estimate("electricite_complete", 100, 1, "tunis", "standard");
    expect(ce.costPerSquareMeter).toBe(72);
    expect(ce.budgetScenarios?.standard.costPerM2).toBe(72);
    expect(ce.budgetScenarios?.premium.costPerM2).toBe(110);
    expect(ce.totalCost).toBe(72 * 100);
  });

  it("le barème enregistré par l'administrateur pilote réellement le calcul", () => {
    const custom = { economique: 40, standard: 70, premium: 110 };
    const ce = estimate("electricite_complete", 100, 1, "medenine", "standard", custom);
    expect(ce.costPerSquareMeter).toBe(70);
    expect(ce.totalCost).toBe(7000);
    expect(ce.budgetScenarios?.economique.costPerM2).toBe(40);
    expect(ce.budgetScenarios?.premium.costPerM2).toBe(110);
  });

  it("un projet de bâtiment n'est PAS facturé au barème électricité", () => {
    const sans = estimate("maison", 100, 1, "tunis", "standard");
    const avec = estimate("maison", 100, 1, "tunis", "standard", {
      economique: 999,
      standard: 999,
      premium: 999,
    });
    // Grille 2026 : maison Tunis standard = 1 980 TND/m² — inchangé.
    expect(sans.totalCost).toBe(1980 * 100);
    expect(avec.totalCost).toBe(sans.totalCost);
  });
});

describe("3 · « Électricité — Second œuvre et finitions » — poste du Quantitatif", () => {
  const totalBudget = 216_000; // maison 120 m² (1 800 DT/m²)
  const base = {
    category: "maison",
    surface: 120,
    floors: 1,
    totalBudget,
  } as const;

  const avecBareme = generateDqe({ ...base, electricity: BAREME_STANDARD });
  const sansBareme = generateDqe({ ...base });

  const lot = (dqe: typeof avecBareme) => dqe.lots.find((l) => l.id === "second_oeuvre")!;

  it("le poste est intégré à la catégorie « Second œuvre et finitions », au barème", () => {
    const poste = avecBareme.electricityPoste;
    expect(poste).toBeDefined();
    expect(poste!.lotId).toBe("second_oeuvre");
    expect(poste!.lotName).toBe("Second œuvre et finitions");
    expect(poste!.unit).toBe("m²");
    expect(poste!.quantity).toBe(120);
    expect(poste!.unitPrice).toBe(65);
    expect(poste!.total).toBe(65 * 120);
    expect(poste!.levelLabel).toBe("Standard");

    // La ligne existe bien DANS le lot, avec le montant exact du barème.
    const ligne = lot(avecBareme).lines.find((l: any) => l.electricity);
    expect(ligne).toBeDefined();
    expect(ligne!.total).toBe(7800);
    expect(ligne!.unitPrice).toBe(65);
    expect(ligne!.quantity).toBe(120);
    expect(ligne!.designation).toContain("Électricité");
  });

  it("les forfaits électriques du gabarit sont remplacés (aucun double compte)", () => {
    const elecLines = lot(avecBareme).lines.filter((l: any) =>
      l.designation.includes("Électricité"),
    );
    expect(elecLines).toHaveLength(1);
    // Luminaires et prises du gabarit sont couverts par le poste au barème.
    expect(
      lot(avecBareme).lines.some((l: any) => l.designation.includes("Luminaires intérieurs")),
    ).toBe(false);
    expect(
      lot(avecBareme).lines.some((l: any) => l.designation.includes("Prises et interrupteurs")),
    ).toBe(false);
    // Les postes non électriques du lot (VMC, plomberie, finitions…) restent.
    expect(lot(avecBareme).lines.some((l: any) => l.designation.includes("VMC"))).toBe(true);
    expect(
      lot(avecBareme).lines.some((l: any) => l.designation.includes("Plomberie sanitaire")),
    ).toBe(true);
  });

  it("le sous-total du lot et le coût global TTC restent ceux de la grille", () => {
    expect(lot(avecBareme).subtotal).toBe(lot(sansBareme).subtotal);
    expect(avecBareme.totals.total).toBe(totalBudget);
    expect(sansBareme.totals.total).toBe(totalBudget);
    // Coût global = somme exacte des sous-totaux des lots.
    expect(avecBareme.lots.reduce((s, l) => s + l.subtotal, 0)).toBe(totalBudget);
    // Le poste électrique est bien compris dans le sous-total du lot.
    const autres = lot(avecBareme).lines
      .filter((l: any) => !l.electricity)
      .reduce((s: number, l: any) => s + l.total, 0);
    expect(autres + 7800).toBe(lot(avecBareme).subtotal);
  });

  it("sans barème transmis, le forfait électrique du gabarit reste en place (non-vacuité)", () => {
    expect(sansBareme.electricityPoste).toBeUndefined();
    const forfait = lot(sansBareme).lines.find((l: any) => l.designation.includes("Électricité"));
    expect(forfait).toBeDefined();
    expect((forfait as any).electricity).toBeUndefined();
    // Le montant réellement retenu pour l'électricité diffère du barème.
    expect(forfait!.total).not.toBe(7800);
  });

  it("le barème enregistré change réellement le poste (premium 100 DT/m²)", () => {
    const premium = generateDqe({
      ...base,
      electricity: { priceM2: 100, levelLabel: "Premium" },
    });
    expect(premium.electricityPoste!.total).toBe(100 * 120);
    expect(premium.totals.total).toBe(totalBudget);
    expect(lot(premium).subtotal).toBe(lot(sansBareme).subtotal);
    expect(premium.electricityPoste!.designation).toContain("Premium");
  });
});

describe("4 · Poste électrique enregistré avec le coût estimatif", () => {
  it("porte le barème, le coefficient régional, la surface et la ventilation", () => {
    const poste = buildElectricityPoste({
      scope: "second_oeuvre",
      finishLevel: "standard",
      prices: BAREME,
      regionStdM2: 1980,
      builtArea: 150,
      lot: { id: "second_oeuvre", name: "Second œuvre et finitions" },
      replacedProvision: 5200,
    });
    expect(poste.levelLabel).toBe("Standard");
    expect(poste.basePriceM2).toBe(65);
    expect(poste.regionIndex).toBe(1.1);
    expect(poste.priceM2).toBe(72);
    expect(poste.amount).toBe(72 * 150);
    expect(poste.replacedProvision).toBe(5200);
    expect(poste.prices).toEqual(BAREME);
    expect(poste.subPostes.reduce((s, sp) => s + sp.amount, 0)).toBeLessThanOrEqual(poste.amount);
    expect(poste.note).toContain("pas des tarifs officiels");
  });

  it("le montant du poste est celui du moteur pour « Électricité complète »", () => {
    const ce = estimate("electricite_complete", 120, 1, "medenine", "premium");
    const poste = buildElectricityPoste({
      scope: "installation_complete",
      finishLevel: "premium",
      prices: BAREME,
      regionStdM2: 1800,
      builtArea: 120,
      amount: ce.totalCost,
    });
    expect(poste.levelLabel).toBe("Premium");
    expect(poste.priceM2).toBe(100);
    expect(poste.amount).toBe(ce.totalCost);
    expect(poste.amount).toBe(12000);
  });
});

describe("5 · Configuration administrateur du barème", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function createAdmin() {
    return t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Admin Test",
        email: "admin-elec@test.com",
        role: "admin",
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
  }

  it("enregistre un barème valide et le relit tel quel", async () => {
    const adminId = await createAdmin();
    const adminT = t.withIdentity({ subject: adminId });

    const res = await adminT.mutation(api.bimConfig.saveBIMConfig, {
      electricityPricesM2: JSON.stringify({ economique: 38, standard: 68, premium: 104 }),
    });
    expect(res.electricityPrices).toEqual({ economique: 38, standard: 68, premium: 104 });

    const config = await t.query(api.bimConfig.getBIMConfig, {});
    expect(config?.parsedElectricityPrices).toEqual({
      economique: 38,
      standard: 68,
      premium: 104,
    });
    expect(config?.electricityPricesAreDefault).toBe(false);

    // Le journal d'administration conserve la trace du barème appliqué.
    const logs = await t.run(async (ctx) => ctx.db.query("adminLogs").collect());
    expect(logs.some((l) => String(l.details).includes("barème électricité"))).toBe(true);
  });

  it("refuse un barème hors fourchette (aucune écriture)", async () => {
    const adminId = await createAdmin();
    const adminT = t.withIdentity({ subject: adminId });

    await expect(
      adminT.mutation(api.bimConfig.saveBIMConfig, {
        electricityPricesM2: JSON.stringify({ standard: 900 }),
      }),
    ).rejects.toThrow(/hors fourchette/);

    const config = await t.query(api.bimConfig.getBIMConfig, {});
    expect(config).toBeNull();
  });

  it("une base sans barème enregistré applique les valeurs par défaut", async () => {
    const config = await t.query(api.bimConfig.getBIMConfig, {});
    expect(config).toBeNull();

    const adminId = await createAdmin();
    const adminT = t.withIdentity({ subject: adminId });
    await adminT.mutation(api.bimConfig.saveBIMConfig, {});
    const after = await t.query(api.bimConfig.getBIMConfig, {});
    expect(after?.parsedElectricityPrices).toEqual(BAREME);
    // Enregistré explicitement, mais encore sur les valeurs initiales.
    expect(after?.electricityPricesStored).toBe(true);
    expect(after?.electricityPricesAreDefault).toBe(true);
  });
});

describe("6 · Chemin réel de l'application (createProject → simulateAnalysis)", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Admin Test",
        email: "admin-e2e@test.com",
        role: "admin",
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
  });

  async function createAndEstimate(category: string, surface = 120, floors = 1) {
    const userT = t.withIdentity({ subject: userId });
    const projectId = await userT.mutation(api.projects.createProject, {
      name: `Électricité ${category}`,
      category: category as any,
      region: "tunis" as any,
      surface,
      floors,
    });
    await userT.mutation(api.projects.simulateAnalysis, { projectId });
    const project: any = await t.run(async (ctx) => ctx.db.get(projectId));
    return project;
  }

  it("un projet de bâtiment enregistre le poste dans « Second œuvre et finitions »", async () => {
    const project = await createAndEstimate("maison");
    const poste = project.costEstimate.electricityPoste;

    // Tunis standard : barème 65 DT/m² × 1,10 (coefficient régional) = 72 DT/m².
    expect(poste.scope).toBe("second_oeuvre");
    expect(poste.levelLabel).toBe("Standard");
    expect(poste.basePriceM2).toBe(65);
    expect(poste.prices).toEqual(BAREME);
    expect(poste.regionIndex).toBe(1.1);
    expect(poste.priceM2).toBe(72);
    expect(poste.builtArea).toBe(120);
    expect(poste.amount).toBe(72 * 120);
    expect(poste.lot.name).toBe("Second œuvre et finitions");
    expect(poste.note).toContain("pas des tarifs officiels");

    // Le poste est bien DANS le lot « Second œuvre et finitions » du DQE…
    const lot = project.dqe.lots.find((l: any) => l.id === "second_oeuvre");
    const ligne = lot.lines.find((l: any) => l.electricity);
    expect(ligne.total).toBe(72 * 120);
    expect(ligne.unitPrice).toBe(72);
    expect(ligne.quantity).toBe(120);

    // …et le Quantitatif détaillé retombe toujours sur le coût estimatif.
    const sumLots = project.dqe.lots.reduce((s: number, l: any) => s + l.subtotal, 0);
    expect(sumLots).toBe(project.costEstimate.totalCost);
    expect(project.costEstimate.levelBreakdown.anomalies).toEqual([]);
  });

  it("un projet « Électricité complète » est facturé au barème du niveau", async () => {
    const project = await createAndEstimate("electricite_complete");
    const ce = project.costEstimate;
    const poste = ce.electricityPoste;

    expect(ce.costPerSquareMeter).toBe(72);
    expect(ce.totalCost).toBe(72 * 120);
    expect(poste.scope).toBe("installation_complete");
    expect(poste.priceM2).toBe(72);
    expect(poste.amount).toBe(ce.totalCost);

    // Quantitatif dédié à l'installation — cohérent avec le coût global.
    const sumLots = project.dqe.lots.reduce((s: number, l: any) => s + l.subtotal, 0);
    expect(sumLots).toBe(ce.totalCost);
    expect(project.dqe.lots.some((l: any) => l.id === "cablage")).toBe(true);
  });

  it("le barème réglé dans le panneau d'administration pilote l'estimation suivante", async () => {
    const adminT = t.withIdentity({ subject: userId });
    await adminT.mutation(api.bimConfig.saveBIMConfig, {
      electricityPricesM2: JSON.stringify({ economique: 40, standard: 80, premium: 130 }),
    });

    const project = await createAndEstimate("maison");
    const poste = project.costEstimate.electricityPoste;
    // 80 DT/m² (Standard enregistré) × 1,10 (Tunis) = 88 DT/m².
    expect(poste.basePriceM2).toBe(80);
    expect(poste.priceM2).toBe(88);
    expect(poste.amount).toBe(88 * 120);

    const electricProject = await createAndEstimate("electricite_complete");
    expect(electricProject.costEstimate.costPerSquareMeter).toBe(88);
    expect(electricProject.costEstimate.budgetScenarios?.premium.costPerM2).toBe(143);
  });
});
