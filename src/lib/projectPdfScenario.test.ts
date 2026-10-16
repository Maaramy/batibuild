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
  resolvePdfScenarioValues,
  scaleBreakdownToTotal,
  type PersonalizedScenarioData,
} from "@/lib/projectPdfScenario";
import { generateDqe } from "@/convex/dqeEngine";
import { DEFAULT_PAINT_QUANTITIES, paintLineRole } from "@/lib/paintQuantities";

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

// ── Postes de peinture au seau (Quantitatif détaillé, Second œuvre) ──────────
describe("resolvePdfScenarioValues — postes de peinture au seau", () => {
  const paintDqe = generateDqe({
    category: "maison",
    surface: 100,
    floors: 1,
    totalBudget: 1980 * 100,
  });
  const paintScenarios = {
    economique: { totalCost: Math.round(1980 * 100 * 0.8) },
    standard: { totalCost: 1980 * 100 },
    premium: { totalCost: Math.round(1980 * 100 * 1.3) },
  };
  const paintCe = { totalCost: 1980 * 100, breakdown: [] };
  const paintOf = (lots: any[]) =>
    (lots.find((l: any) => l.id === "second_oeuvre")?.lines ?? []).filter(
      (l: any) => paintLineRole(l.designation) !== null,
    );

  it("Standard : 10 seaux intérieurs et 7 extérieurs au prix du barème", () => {
    const values = resolvePdfScenarioValues({
      scenario: "standard",
      scenarios: paintScenarios,
      ce: paintCe,
      dqe: paintDqe,
    });
    const lines = paintOf(values.dqeLots);
    expect(values.scenarioLabel).toBe("Standard");
    expect(lines.map((l: any) => l.quantity)).toEqual([10, 7]);
    expect(lines.map((l: any) => l.unit)).toEqual(["seau de 20 litres", "seau de 20 litres"]);
    expect(lines[0].total).toBe(10 * DEFAULT_PAINT_QUANTITIES.interiorBucketPrice);
    expect(lines[1].total).toBe(7 * DEFAULT_PAINT_QUANTITIES.exteriorBucketPrice);
  });

  it("Premium : quantités (seaux) conservées, montants mis à l'échelle", () => {
    const values = resolvePdfScenarioValues({
      scenario: "premium",
      scenarios: paintScenarios,
      ce: paintCe,
      dqe: paintDqe,
      dqeScaleFactor: 1.3,
    });
    const lines = paintOf(values.dqeLots);
    expect(lines.map((l: any) => l.quantity)).toEqual([10, 7]);
    expect(lines[0].total).toBe(Math.round(1070 * 1.3));
    // Le quantitatif d'origine n'est jamais modifié par la résolution PDF.
    const raw = paintOf(paintDqe.lots);
    expect(raw[0].total).toBe(1070);
  });

  it("Personnalisé : quantités de référence conservées dans le devis exporté", () => {
    const personalized: PersonalizedScenarioData = {
      lots: scaleDqeLots(paintDqe.lots, 1),
      totals: computeQuantitatifTotals(paintDqe.lots, 100),
      modifiedCount: 1,
    };
    const values = resolvePdfScenarioValues({
      scenario: PERSONALIZED_SCENARIO_KEY,
      scenarios: paintScenarios,
      ce: paintCe,
      dqe: paintDqe,
      personalized,
    });
    const lines = paintOf(values.dqeLots);
    expect(values.isPersonalized).toBe(true);
    expect(lines.map((l: any) => l.quantity)).toEqual([10, 7]);
    expect(values.dqeTotals?.total).toBe(personalized.totals.total);
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
