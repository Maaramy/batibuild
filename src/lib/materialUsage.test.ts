import { describe, it, expect } from "vitest";
import {
  buildMaterialUsage,
  materialUsageQuoteList,
  normalizeMaterialKey,
} from "./materialUsage";
import type { CustomWorkEstimate } from "@/convex/customWorksEngine";
import { runBIMEstimation } from "@/convex/bimEngine";
import { generateDqe } from "@/convex/dqeEngine";

const breakdown = [
  {
    category: "gros_oeuvre",
    label: "Gros œuvre",
    items: [
      { name: "Ciment CPJ 42.5 (sac 50 kg)", quantity: 100, unit: "sacs", unitPrice: 16.5, totalPrice: 1650 },
      { name: "Sable de construction (m³)", quantity: 10, unit: "m³", unitPrice: 45, totalPrice: 450 },
      { name: "Acier à béton T12 (tonne)", quantity: 1.5, unit: "tonnes", unitPrice: 3850, totalPrice: 5775 },
    ],
  },
  {
    category: "second_oeuvre",
    label: "Second œuvre et finitions",
    items: [
      { name: "Carrelage grès cérame 60×60 (m²)", quantity: 80, unit: "m²", unitPrice: 38, totalPrice: 3040 },
      // Doublon volontaire (même article, même unité) : doit être fusionné.
      { name: "ciment cpj 42.5 (sac 50 kg)", quantity: 20, unit: "SACS", unitPrice: 16.5, totalPrice: 330 },
    ],
  },
  {
    category: "equipements",
    label: "Équipements",
    items: [
      { name: "Climatiseur split 12000 BTU", quantity: 2, unit: "unité", unitPrice: 2500, totalPrice: 5000 },
    ],
  },
  {
    category: "main_oeuvre",
    label: "Main-d'œuvre",
    items: [
      { name: "Maçon", quantity: 30, unit: "jour", unitPrice: 55, totalPrice: 1650 },
    ],
  },
];

const euro = (rows: ReturnType<typeof buildMaterialUsage>["rows"], article: string) =>
  rows.find((r) => r.article.toLowerCase().includes(article.toLowerCase()));

describe("buildMaterialUsage — articles réels du projet", () => {
  it("ne retient que les catégories matériaux et fusionne les doublons", () => {
    const result = buildMaterialUsage({ costEstimate: { breakdown } });

    expect(result.source).toBe("bim");
    expect(result.articleCount).toBe(4);
    // Ni équipement ni main-d'œuvre dans le tableau.
    expect(result.rows.some((r) => /climatiseur/i.test(r.article))).toBe(false);
    expect(result.rows.some((r) => /maçon/i.test(r.article))).toBe(false);

    const ciment = result.rows.find((r) => r.article.startsWith("Ciment CPJ 42.5"))!;
    expect(ciment.quantity).toBe(120);
    expect(ciment.unit.toLowerCase()).toBe("sacs");
    expect(ciment.unitPrice).toBe(16.5);
    expect(ciment.total).toBe(1980);
  });

  it("calcule chaque ligne et le total à partir de la quantité et du prix unitaire", () => {
    const result = buildMaterialUsage({ costEstimate: { breakdown } });
    for (const row of result.rows) {
      expect(row.total).toBeCloseTo(Math.round(row.quantity * row.unitPrice * 100) / 100, 2);
    }
    const sum = result.rows.reduce((s, r) => s + r.total, 0);
    expect(result.total).toBeCloseTo(Math.round(sum * 100) / 100, 2);
    // Aucune confusion avec le coût global de construction.
    expect(result.total).toBeLessThan(20000);
    expect(result.total).toBeGreaterThan(0);
  });

  it("applique le facteur du scénario aux prix unitaires et aux totaux", () => {
    const base = buildMaterialUsage({ costEstimate: { breakdown } });
    const premium = buildMaterialUsage({ costEstimate: { breakdown }, scenarioFactor: 1.2 });

    const baseCiment = euro(base.rows, "Ciment")!;
    const premiumCiment = euro(premium.rows, "Ciment")!;
    expect(premiumCiment.unitPrice).toBeCloseTo(19.8, 2);
    expect(premiumCiment.total).toBeCloseTo(Math.round(120 * 19.8 * 100) / 100, 2);
    expect(premium.total).toBeGreaterThan(base.total);
    expect(premiumCiment.quantity).toBe(baseCiment.quantity);
  });

  it("retire l'ancienne majoration d'imprévus des estimations historiques", () => {
    const legacy = {
      breakdown,
      contingencyPercentage: 10,
    };
    const result = buildMaterialUsage({ costEstimate: legacy });
    const ciment = euro(result.rows, "Ciment")!;
    // 16,5 / 1,1 = 15 → total 120 × 15 = 1800.
    expect(ciment.unitPrice).toBe(15);
    expect(ciment.total).toBe(1800);
  });

  it("replie sur les lignes matériaux du DQE uniquement sans articles BIM", () => {
    const result = buildMaterialUsage({
      costEstimate: { breakdown: [] },
      dqeLots: [
        {
          name: "Gros œuvre (fondations, structures)",
          lines: [
            { designation: "Ciment CPJ 42.5", unit: "sacs", quantity: 60, unitPrice: 16.5, nature: "materiaux" },
            { designation: "Main-d'œuvre maçonnerie", unit: "jour", quantity: 10, unitPrice: 55, nature: "main_oeuvre" },
          ],
        },
      ],
    });
    expect(result.source).toBe("dqe");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].article).toBe("Ciment CPJ 42.5");
    expect(result.rows[0].total).toBe(990);
  });

  it("préfère un DQE matériaux granulaires au BIM, sans jamais additionner les deux sources", () => {
    const result = buildMaterialUsage({
      costEstimate: { breakdown },
      dqeLots: [
        {
          name: "Gros œuvre",
          lines: [
            { designation: "Ciment CPJ 42.5", unit: "sacs", quantity: 60, unitPrice: 16.5, nature: "materiaux" },
          ],
        },
      ],
    });
    // Le DQE porte les articles réels (et ses modifications) : source unique.
    expect(result.source).toBe("dqe");
    expect(result.rows.filter((r) => /ciment/i.test(r.article))).toHaveLength(1);
    expect(result.rows.find((r) => /ciment/i.test(r.article))!.quantity).toBe(60);
    // Aucun article BIM n'est ajouté (pas de sable, d'acier ni de carrelage).
    expect(result.rows).toHaveLength(1);
  });

  it("un DQE en postes de travaux (m²) ne remplace pas les articles détaillés du BIM", () => {
    const result = buildMaterialUsage({
      costEstimate: { breakdown },
      dqeLots: [
        {
          name: "Gros œuvre (fondations, structures)",
          lines: [
            { designation: "Terrassement et fondations", unit: "m²", quantity: 120, unitPrice: 75, nature: "materiaux" },
            { designation: "Murs porteurs et refends", unit: "m²", quantity: 120, unitPrice: 120, nature: "materiaux" },
          ],
        },
      ],
    });
    expect(result.source).toBe("bim");
    expect(result.rows.some((r) => r.article.startsWith("Ciment CPJ 42.5"))).toBe(true);
    expect(result.rows.some((r) => r.article === "Murs porteurs et refends")).toBe(false);
  });

  it("reflète une modification de quantité/prix d'un article du DQE", () => {
    const baseLots = [
      {
        name: "Gros œuvre",
        lines: [
          { designation: "Ciment CPJ 42.5", unit: "sacs", quantity: 60, unitPrice: 16.5, nature: "materiaux" },
        ],
      },
    ];
    const modifiedLots = [
      {
        name: "Gros œuvre",
        lines: [
          { designation: "Ciment CPJ 42.5", unit: "sacs", quantity: 75, unitPrice: 18, nature: "materiaux" },
        ],
      },
    ];
    const before = buildMaterialUsage({ costEstimate: null, dqeLots: baseLots });
    const after = buildMaterialUsage({ costEstimate: null, dqeLots: modifiedLots });
    expect(before.rows[0].total).toBe(990);
    expect(after.rows[0].quantity).toBe(75);
    expect(after.rows[0].unitPrice).toBe(18);
    expect(after.rows[0].total).toBe(1350);
    expect(after.total).toBe(1350);
  });

  it("ajoute les matériaux des travaux complémentaires du scénario Personnalisé", () => {
    const garage = {
      key: "garage",
      label: "Garage",
      icon: "Car",
      category: "gros_oeuvre",
      surface: 18,
      finishLevel: "standard",
      materials: 12000,
      equipments: 0,
      labor: 4000,
      transport: 500,
      studies: 1321,
      total: 17821,
      lines: [
        { designation: "Ciment CPJ 42.5 (sac 50 kg)", quantity: 40, unit: "sacs", unitPrice: 16.5, total: 660, nature: "materiaux" },
        { designation: "Parpaing creux 20 (m²)", quantity: 35, unit: "m²", unitPrice: 8.5, total: 297.5, nature: "materiaux" },
        { designation: "Main-d'œuvre gros œuvre", quantity: 1, unit: "lot", unitPrice: 4000, total: 4000, nature: "main_oeuvre" },
      ],
    } as unknown as CustomWorkEstimate;

    const result = buildMaterialUsage({
      costEstimate: { breakdown },
      complementaryWorks: [garage],
    });
    const ciment = result.rows.find((r) => r.article.startsWith("Ciment CPJ 42.5"))!;
    expect(ciment.quantity).toBe(160);
    expect(result.rows.some((r) => /main-d'œuvre/i.test(r.article))).toBe(false);
    expect(result.rows.some((r) => r.category === "Garage")).toBe(true);
  });

  it("renvoie un résultat vide et explicite sans donnée exploitable", () => {
    const result = buildMaterialUsage({ costEstimate: null });
    expect(result.rows).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.articleCount).toBe(0);
    expect(result.source).toBe("none");
  });

  it("ignore les lignes sans quantité ou sans prix", () => {
    const result = buildMaterialUsage({
      costEstimate: {
        breakdown: [
          {
            category: "gros_oeuvre",
            label: "Gros œuvre",
            items: [
              { name: "Sable", quantity: 0, unit: "m³", unitPrice: 45 },
              { name: "Gravier", quantity: 2, unit: "m³", unitPrice: 0 },
              { name: "Brique creuse 10 (m²)", quantity: 50, unit: "m²", unitPrice: 1.2 },
            ],
          },
        ],
      },
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].article).toBe("Brique creuse 10 (m²)");
  });

  it("transmet au devis le nom, la quantité et l'unité de chaque ligne", () => {
    const result = buildMaterialUsage({ costEstimate: { breakdown } });
    const list = materialUsageQuoteList(result);
    expect(list).toHaveLength(result.rows.length);
    const ciment = list.find((m) => m.name.startsWith("Ciment"))!;
    expect(ciment).toEqual({ name: "Ciment CPJ 42.5 (sac 50 kg)", quantity: 120, unit: "sacs" });
  });

  it("normalise les libellés pour la déduplication", () => {
    expect(normalizeMaterialKey("Ciment CPJ 42.5 (sac 50 kg)")).toBe(
      normalizeMaterialKey("ciment   cpj 42,5 sac 50 KG"),
    );
  });
});

describe("buildMaterialUsage — intégration moteurs réels", () => {
  it("maison R+1 : quantités et articles matériaux réels du BIM", () => {
    const ce = runBIMEstimation("maison", 125, 2, "tunis", "standard").costEstimate;
    const usage = buildMaterialUsage({ costEstimate: ce });

    expect(usage.source).toBe("bim");
    expect(usage.rows.length).toBeGreaterThan(5);
    expect(usage.rows.some((r) => /Ciment CPJ 42\.5/.test(r.article))).toBe(true);
    expect(usage.rows.some((r) => /Acier à béton/.test(r.article))).toBe(true);
    expect(usage.rows.some((r) => /Hourdis/.test(r.article))).toBe(true);
    expect(usage.rows.some((r) => /Brique creuse/.test(r.article))).toBe(true);
    expect(usage.total).toBeGreaterThan(0);
    // Les niveaux multiples augmentent les quantités de structure.
    const rdc = runBIMEstimation("maison", 125, 1, "tunis", "standard").costEstimate;
    const usageRdc = buildMaterialUsage({ costEstimate: rdc });
    const cimentR1 = usage.rows.find((r) => /^Ciment CPJ 42\.5/.test(r.article))!;
    const cimentRdc = usageRdc.rows.find((r) => /^Ciment CPJ 42\.5/.test(r.article))!;
    expect(cimentR1.quantity).toBeGreaterThan(cimentRdc.quantity);
  });

  it("les scénarios Économique / Standard / Premium font varier les prix", () => {
    const ce = runBIMEstimation("villa", 150, 1, "sfax", "standard").costEstimate;
    const standard = buildMaterialUsage({ costEstimate: ce });
    const ecoFactor =
      (ce.budgetScenarios?.economique?.totalCost ?? 0) /
      (ce.budgetScenarios?.standard?.totalCost ?? 1);
    const premiumFactor =
      (ce.budgetScenarios?.premium?.totalCost ?? 0) /
      (ce.budgetScenarios?.standard?.totalCost ?? 1);
    const eco = buildMaterialUsage({ costEstimate: ce, scenarioFactor: ecoFactor });
    const premium = buildMaterialUsage({ costEstimate: ce, scenarioFactor: premiumFactor });

    expect(eco.total).toBeLessThan(standard.total);
    expect(premium.total).toBeGreaterThan(standard.total);
    // Les quantités ne changent pas avec le scénario : seuls les prix varient.
    const cimentStd = standard.rows.find((r) => /^Ciment CPJ 42\.5/.test(r.article))!;
    const cimentPre = premium.rows.find((r) => /^Ciment CPJ 42\.5/.test(r.article))!;
    expect(cimentPre.quantity).toBe(cimentStd.quantity);
    expect(cimentPre.unitPrice).toBeGreaterThan(cimentStd.unitPrice);
  });

  it("rénovation : le DQE matériaux du projet est repris (ciment, sable, acier)", () => {
    const ce = runBIMEstimation("renovation_complete", 100, 1, "sousse", "standard").costEstimate;
    const dqe = generateDqe({
      category: "renovation_complete",
      surface: 100,
      floors: 1,
      totalBudget: ce.totalCost,
    });
    const usage = buildMaterialUsage({ costEstimate: ce, dqeLots: dqe.lots });

    expect(usage.source).toBe("dqe");
    expect(usage.rows.some((r) => /Ciment CPJ 42\.5/.test(r.article))).toBe(true);
    expect(usage.rows.some((r) => /Sable de construction/.test(r.article))).toBe(true);
    // Aucun doublon de libellé dans le tableau final.
    const keys = usage.rows.map((r) => `${normalizeMaterialKey(r.article)}::${normalizeMaterialKey(r.unit)}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
