import { describe, expect, it } from "vitest";
import {
  PERSONALIZED_SCENARIO_KEY,
  computeQuantitatifTotals,
  overlayCustomizations,
  quantitatifLineKey,
  scaleDqeLots,
  type QuantitatifCustomizationEntry,
} from "@/convex/quantitatifCustomLogic";
import {
  isPersonalizedPdfScenario,
  pdfScenarioLabel,
  resolvePdfElectricity,
  resolvePdfScenarioValues,
  scaleBreakdownToTotal,
  type PersonalizedScenarioData,
} from "@/lib/projectPdfScenario";
import { ELECTRICITY_PRICE_M2 } from "@/lib/electricityPricing";

// ── Jeu de données : devis « Standard » de référence (250 m², 500 000 TND) ──
const BUILT_SURFACE = 250;

const scenarios = {
  economique: { totalCost: 400_000, costPerM2: 1600 },
  standard: { totalCost: 500_000, costPerM2: 2000 },
  premium: { totalCost: 650_000, costPerM2: 2600 },
};

const ce = {
  totalCost: 500_000,
  costPerSquareMeter: 2000,
  breakdown: [
    {
      category: "gros_oeuvre",
      label: "Gros œuvre",
      estimatedCost: 300_000,
      percentage: 60,
      items: [
        {
          name: "Béton armé",
          quantity: 100,
          unit: "m3",
          unitPrice: 2500,
          totalPrice: 250_000,
        },
        {
          name: "Acier à béton",
          quantity: 10_000,
          unit: "kg",
          unitPrice: 5,
          totalPrice: 50_000,
        },
      ],
    },
    {
      category: "second_oeuvre",
      label: "Second œuvre",
      estimatedCost: 200_000,
      percentage: 40,
      items: [
        {
          name: "Carrelage 60×60",
          quantity: 200,
          unit: "m2",
          unitPrice: 500,
          totalPrice: 100_000,
        },
        {
          name: "Peinture intérieure",
          quantity: 500,
          unit: "L",
          unitPrice: 200,
          totalPrice: 100_000,
        },
      ],
    },
  ],
};

/** Quantitatif brut du moteur (niveau de référence « Standard »). */
const rawLots = [
  {
    id: "gros_oeuvre",
    name: "Gros œuvre (fondations, structures)",
    nature: "materiaux",
    subtotal: 300_000,
    percent: 60,
    lines: [
      {
        designation: "Béton armé",
        unit: "m3",
        quantity: 100,
        unitPrice: 2500,
        total: 250_000,
        nature: "materiaux",
      },
      {
        designation: "Acier à béton",
        unit: "kg",
        quantity: 10_000,
        unitPrice: 5,
        total: 50_000,
        nature: "materiaux",
      },
    ],
  },
  {
    id: "second_oeuvre",
    name: "Second œuvre et finitions",
    nature: "materiaux",
    subtotal: 200_000,
    percent: 40,
    lines: [
      {
        designation: "Carrelage 60×60",
        unit: "m2",
        quantity: 200,
        unitPrice: 500,
        total: 100_000,
        nature: "materiaux",
      },
      {
        designation: "Peinture intérieure",
        unit: "L",
        quantity: 500,
        unitPrice: 200,
        total: 100_000,
        nature: "materiaux",
      },
    ],
  },
];

const dqe = {
  lots: rawLots,
  totals: {
    materiaux: 500_000,
    mainOeuvre: 0,
    equipements: 0,
    transport: 0,
    etudes: 0,
    total: 500_000,
  },
};

const BASE_LINE_COUNT = rawLots.reduce((s, l) => s + l.lines.length, 0);

/** Personnalisation d'un article (identique au format stocké en base). */
function entry(
  lotId: string,
  lineIndex: number,
  baseDesignation: string,
  patch: { quantity?: number; unitPrice?: number; designation?: string },
): QuantitatifCustomizationEntry {
  const line = rawLots.find((l) => l.id === lotId)!.lines[lineIndex];
  return {
    lineKey: quantitatifLineKey(lotId, lineIndex),
    lotId,
    lotName: lotId,
    lineIndex,
    baseDesignation,
    designation: patch.designation ?? baseDesignation,
    unit: line.unit,
    quantity: patch.quantity ?? line.quantity,
    unitPrice: patch.unitPrice ?? line.unitPrice,
    nature: line.nature,
    priceScenario: "standard",
    replacedArticle: false,
    updatedAt: 1,
  };
}

/**
 * Reproduit exactement le scénario « Personnalisé » construit par la page
 * projet (`ProjectDetail.tsx`) avant la génération du PDF.
 */
function buildPersonalized(
  entries: QuantitatifCustomizationEntry[],
): PersonalizedScenarioData {
  const scaled = scaleDqeLots(rawLots, 1); // baseScenario = standard
  const overlay = overlayCustomizations(scaled, entries, {
    scaleFactor: 1,
    realCostFactor: 1,
  });
  return {
    lots: overlay.lots,
    totals: computeQuantitatifTotals(overlay.lots, BUILT_SURFACE),
    modifiedCount: overlay.modifiedCount,
  };
}

/** Carrelage : 260 m² × 620 TND = 161 200 TND (+61 200). */
const carrelageEntry = entry("second_oeuvre", 0, "Carrelage 60×60", {
  quantity: 260,
  unitPrice: 620,
});
/** Béton armé : 110 m³ × 2 700 TND = 297 000 TND (+47 000). */
const betonEntry = entry("gros_oeuvre", 0, "Béton armé", {
  quantity: 110,
  unitPrice: 2700,
});

describe("scénario PDF — résolution du libellé", () => {
  it("utilise les libellés des scénarios budgétaires d'origine", () => {
    expect(pdfScenarioLabel("economique", null)).toBe("Économique");
    expect(pdfScenarioLabel("standard", null)).toBe("Standard");
    expect(pdfScenarioLabel("premium", null)).toBe("Premium");
  });

  it("ne considère « Personnalisé » que si des modifications existent", () => {
    expect(isPersonalizedPdfScenario(PERSONALIZED_SCENARIO_KEY, null)).toBe(
      false,
    );
    expect(
      isPersonalizedPdfScenario(PERSONALIZED_SCENARIO_KEY, {
        lots: [],
        totals: {
          materiaux: 0,
          mainOeuvre: 0,
          equipements: 0,
          transport: 0,
          etudes: 0,
          total: 0,
          costPerM2: 0,
        },
        modifiedCount: 0,
      }),
    ).toBe(false);
    expect(
      isPersonalizedPdfScenario(
        PERSONALIZED_SCENARIO_KEY,
        buildPersonalized([carrelageEntry]),
      ),
    ).toBe(true);
  });
});

describe("devis PDF — projet sans scénario personnalisé", () => {
  it("conserve strictement le devis du scénario d'origine", () => {
    const values = resolvePdfScenarioValues({
      scenario: "standard",
      scenarios,
      ce,
      dqe,
      dqeScaleFactor: 1,
      personalized: null,
    });

    expect(values.isPersonalized).toBe(false);
    expect(values.scenarioLabel).toBe("Standard");
    expect(values.scenarioLabel).not.toContain("Personnalisé");
    expect(values.modifiedCount).toBe(0);
    expect(values.totalCost).toBe(500_000);
    expect(values.costPerM2).toBe(2000);
    // Le quantitatif reste celui du scénario d'origine, sans ligne ajoutée.
    expect(values.dqeLots.flatMap((l: any) => l.lines)).toHaveLength(
      BASE_LINE_COUNT,
    );
    expect(values.dqeTotals?.total).toBe(500_000);
  });

  it("n'ajoute aucune mention « Personnalisé » si le scénario n'existe pas", () => {
    const values = resolvePdfScenarioValues({
      scenario: PERSONALIZED_SCENARIO_KEY,
      scenarios,
      ce,
      dqe,
      personalized: null,
    });

    expect(values.isPersonalized).toBe(false);
    expect(values.scenarioLabel).not.toContain("Personnalisé");
    expect(values.modifiedCount).toBe(0);
    expect(values.totalCost).toBe(500_000);
  });

  it("met les lignes à l'échelle du scénario budgétaire demandé", () => {
    const premiumFactor = scenarios.premium.totalCost / scenarios.standard.totalCost;
    const values = resolvePdfScenarioValues({
      scenario: "premium",
      scenarios,
      ce,
      dqe,
      dqeScaleFactor: premiumFactor,
      personalized: null,
    });

    expect(values.isPersonalized).toBe(false);
    expect(values.scenarioLabel).toBe("Premium");
    expect(values.totalCost).toBe(650_000);
    const carrelage = values.dqeLots
      .flatMap((l: any) => l.lines)
      .find((l: any) => l.designation === "Carrelage 60×60");
    expect(carrelage.total).toBe(Math.round(100_000 * premiumFactor));
    expect(values.dqeTotals!.total).toBe(650_000);
  });

  it("n'utilise jamais le scénario personnalisé pour les autres scénarios", () => {
    const personalized = buildPersonalized([carrelageEntry]);
    for (const scenario of ["economique", "standard", "premium"] as const) {
      const values = resolvePdfScenarioValues({
        scenario,
        scenarios,
        ce,
        dqe,
        dqeScaleFactor: 1,
        personalized,
      });
      expect(values.isPersonalized).toBe(false);
      expect(values.scenarioLabel).not.toContain("Personnalisé");
      expect(values.totalCost).toBe(scenarios[scenario].totalCost);
    }
  });
});

describe("devis PDF — scénario personnalisé avec un article modifié", () => {
  const personalized = buildPersonalized([carrelageEntry]);

  const values = resolvePdfScenarioValues({
    scenario: PERSONALIZED_SCENARIO_KEY,
    scenarios,
    ce,
    dqe,
    dqeScaleFactor: 1,
    personalized,
  });

  it("affiche le libellé « Personnalisé »", () => {
    expect(values.isPersonalized).toBe(true);
    expect(values.scenarioLabel).toBe("Personnalisé");
    expect(values.modifiedCount).toBe(1);
  });

  it("reprend exactement la modification de l'article", () => {
    const lines = values.dqeLots.flatMap((l: any) => l.lines);
    const carrelage = lines.find((l: any) => l.designation === "Carrelage 60×60");

    expect(carrelage.quantity).toBe(260);
    expect(carrelage.unitPrice).toBe(620);
    expect(carrelage.total).toBe(161_200);
    // L'article d'origine est remplacé, jamais dupliqué.
    expect(lines).toHaveLength(BASE_LINE_COUNT);
    expect(lines.filter((l: any) => l.designation === "Carrelage 60×60")).toHaveLength(1);
  });

  it("calcule le total du devis à partir du scénario personnalisé", () => {
    expect(values.totalCost).toBe(561_200);
    expect(values.totalCost).not.toBe(scenarios.standard.totalCost);
    expect(values.costPerM2).toBe(Math.round(561_200 / BUILT_SURFACE));
    expect(values.dqeTotals!.total).toBe(561_200);
  });
});

describe("devis PDF — scénario personnalisé avec plusieurs articles modifiés", () => {
  const personalized = buildPersonalized([betonEntry, carrelageEntry]);

  const values = resolvePdfScenarioValues({
    scenario: PERSONALIZED_SCENARIO_KEY,
    scenarios,
    ce,
    dqe,
    dqeScaleFactor: 1,
    personalized,
  });

  it("reprend toutes les modifications sans dupliquer les articles", () => {
    const lines = values.dqeLots.flatMap((l: any) => l.lines);
    expect(values.modifiedCount).toBe(2);
    expect(lines).toHaveLength(BASE_LINE_COUNT);

    const beton = lines.find((l: any) => l.designation === "Béton armé");
    expect(beton.quantity).toBe(110);
    expect(beton.unitPrice).toBe(2700);
    expect(beton.total).toBe(297_000);

    const carrelage = lines.find((l: any) => l.designation === "Carrelage 60×60");
    expect(carrelage.total).toBe(161_200);
  });

  it("additionne les écarts au total du scénario personnalisé", () => {
    expect(values.dqeTotals!.total).toBe(608_200);
    expect(values.totalCost).toBe(608_200);
    expect(values.scenarioLabel).toBe("Personnalisé");
  });
});

describe("devis PDF — total personnalisé différent des scénarios existants", () => {
  const personalized = buildPersonalized([carrelageEntry]);
  const values = resolvePdfScenarioValues({
    scenario: PERSONALIZED_SCENARIO_KEY,
    scenarios,
    ce,
    dqe,
    personalized,
  });

  it("n'emprunte le total à aucun scénario d'origine", () => {
    const originals = Object.values(scenarios).map((s) => s.totalCost);
    expect(originals).not.toContain(values.totalCost);
    expect(values.totalCost).toBe(561_200);
  });

  it("aligne la répartition par catégorie sur le total personnalisé", () => {
    const sum = values.breakdown.reduce(
      (s: number, c: any) => s + c.estimatedCost,
      0,
    );
    expect(sum).toBe(values.totalCost);
    // Les pourcentages (part de chaque catégorie) restent inchangés.
    expect(values.breakdown.map((c: any) => c.percentage)).toEqual([60, 40]);
  });
});

describe("devis PDF — intégrité des données du projet", () => {
  it("ne modifie ni le coût estimé, ni les scénarios, ni le quantitatif", () => {
    const ceBefore = JSON.stringify(ce);
    const scenariosBefore = JSON.stringify(scenarios);
    const dqeBefore = JSON.stringify(dqe);

    const personalized = buildPersonalized([carrelageEntry]);
    resolvePdfScenarioValues({
      scenario: PERSONALIZED_SCENARIO_KEY,
      scenarios,
      ce,
      dqe,
      personalized,
    });

    expect(JSON.stringify(ce)).toBe(ceBefore);
    expect(JSON.stringify(scenarios)).toBe(scenariosBefore);
    expect(JSON.stringify(dqe)).toBe(dqeBefore);
  });

  it("ne touche pas au quantitatif brut du projet", () => {
    const rawBefore = JSON.stringify(rawLots);
    const personalized = buildPersonalized([carrelageEntry]);
    resolvePdfScenarioValues({
      scenario: PERSONALIZED_SCENARIO_KEY,
      scenarios,
      ce,
      dqe,
      personalized,
    });
    expect(JSON.stringify(rawLots)).toBe(rawBefore);
  });
});

describe("devis PDF — poste électricité (barème 2026)", () => {
  const ceElectricity = {
    ...ce,
    // Poste du scénario Standard : 65 DT/m² × 250 m² × 1,10 = 17 875 TND.
    electricity: {
      scenario: "standard",
      priceM2: 65,
      regionFactor: 1.1,
      surface: 250,
      amount: 17_875,
      provision: 15_000,
      prices: { ...ELECTRICITY_PRICE_M2 },
    },
  };

  const dqeWithElectricity = {
    lots: [
      {
        id: "second_oeuvre",
        name: "Second œuvre et finitions",
        subtotal: 120_000,
        lines: [
          { designation: "Carrelage 60×60", sousLot: "Revêtements", unit: "m2", quantity: 200, unitPrice: 500, total: 100_000 },
          { designation: "Électricité — Câblage, gaines et boîtes d'encastrement", sousLot: "Électricité", unit: "lot", quantity: 1, unitPrice: 5_362, total: 5_362 },
          { designation: "Électricité — Main-d'œuvre de pose, raccordement et essais", sousLot: "Électricité", unit: "lot", quantity: 1, unitPrice: 12_513, total: 12_513 },
        ],
      },
    ],
  };

  it("n'affiche rien quand l'estimation ne porte pas de poste électrique", () => {
    expect(resolvePdfElectricity({ scenario: "standard", ce })).toBeNull();
  });

  it("prend le montant des lignes électriques du devis imprimé", () => {
    const values = resolvePdfScenarioValues({
      scenario: "standard",
      scenarios,
      ce: ceElectricity,
      dqe: dqeWithElectricity,
    });
    expect(values.electricity).not.toBeNull();
    expect(values.electricity!.amount).toBe(17_875);
    // 5 362 + 12 513 = 17 875 : le poste est exactement le prix de référence.
    expect(values.electricity!.scenarioLabel).toBe("Standard");
    expect(values.electricity!.priceM2).toBe(65);
    expect(values.electricity!.matchesBareme).toBe(true);
    expect(values.electricity!.surface).toBe(250);
    expect(values.electricity!.regionFactor).toBeCloseTo(1.1, 5);
    expect(values.electricity!.provision).toBe(15_000);
  });

  it("suit le montant réellement imprimé, même modifié par l'utilisateur", () => {
    const summary = resolvePdfElectricity({
      scenario: PERSONALIZED_SCENARIO_KEY,
      ce: ceElectricity,
      dqeLots: [
        {
          id: "second_oeuvre",
          lines: [
            { designation: "Électricité — Câblage, gaines et boîtes", sousLot: "Électricité", total: 6_000 },
            { designation: "Électricité — Main-d'œuvre de pose", sousLot: "Électricité", total: 12_000 },
          ],
        },
      ],
    });
    expect(summary).not.toBeNull();
    expect(summary!.amount).toBe(18_000);
    // Le montant ne vaut plus « barème × surface » : le détail n'est pas annoncé.
    expect(summary!.matchesBareme).toBe(false);
  });

  it("retombe sur le barème quand le quantitatif imprimé n'a pas de ligne électrique", () => {
    const summary = resolvePdfElectricity({
      scenario: "standard",
      ce: ceElectricity,
      dqeLots: [{ id: "second_oeuvre", lines: [{ designation: "Carrelage", total: 100_000 }] }],
    });
    expect(summary!.amount).toBe(17_875);
    expect(summary!.matchesBareme).toBe(true);
  });

  it("le scénario budgétaire exporté impose son propre niveau de barème", () => {
    const values = resolvePdfScenarioValues({
      scenario: "premium",
      scenarios,
      ce: ceElectricity,
      dqe: dqeWithElectricity,
      dqeScaleFactor: 1.3,
    });
    expect(values.electricity!.scenarioLabel).toBe("Premium");
    expect(values.electricity!.priceM2).toBe(ELECTRICITY_PRICE_M2.premium);
    // Le montant reste celui du quantitatif mis à l'échelle du scénario :
    // jamais un second montant électrique dans le même devis.
    const printed = values
      .dqeLots!.flatMap((l: any) => l.lines ?? [])
      .filter((l: any) => l.sousLot === "Électricité")
      .reduce((s: number, l: any) => s + l.total, 0);
    expect(printed).toBeGreaterThan(17_875);
    expect(values.electricity!.amount).toBe(printed);
    // Le montant n'est plus « barème × surface » : le détail n'est pas annoncé.
    expect(values.electricity!.matchesBareme).toBe(false);
  });
});

describe("scaleBreakdownToTotal", () => {
  it("retourne la répartition d'origine lorsque le total est identique", () => {
    expect(scaleBreakdownToTotal(ce.breakdown, 500_000, 500_000)).toBe(
      ce.breakdown,
    );
  });

  it("reste proportionnelle et gère l'absence de répartition", () => {
    const scaled = scaleBreakdownToTotal(ce.breakdown, 600_000, 500_000);
    expect(scaled.reduce((s: number, c: any) => s + c.estimatedCost, 0)).toBe(
      600_000,
    );
    expect(scaled[0].items[0].totalPrice).toBe(300_000);
    expect(scaleBreakdownToTotal(undefined, 100, 0)).toEqual([]);
  });
});
