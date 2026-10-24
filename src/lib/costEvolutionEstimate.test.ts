/// <reference types="vite/client" />

// ============================================================================
// ÉVOLUTION ANNUELLE DES COÛTS — APPLICATION AU MOTEUR D'ESTIMATION
// ----------------------------------------------------------------------------
// Fonction PURE `applyCostEvolutionToEstimate` : un seul facteur par poste,
// quantités jamais modifiées, aucune modification lorsque le mécanisme est
// inactif ou lorsque le chiffrage est déjà validé, empreinte version/date/statut.
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  applyCostEvolutionToEstimate,
  buildAppliedCostEvolutionPdfBlock,
  COST_EVOLUTION_STATUS_LABELS,
  defaultCostEvolutionSettings,
  estimateEvolutionHorizonYears,
  evolutionFactorFor,
  evolutionKeyForCostCategory,
  evolutionKeyForText,
  type CostEvolutionSettings,
  type EstimateEvolutionFingerprint,
} from "./costEvolution";

const NOW = Date.UTC(2026, 9, 24, 10, 0, 0);

/** Barème par défaut (tous les postes à 3 %, scénario modéré), en vigueur. */
function settings(patch: Partial<CostEvolutionSettings> = {}): CostEvolutionSettings {
  return { ...defaultCostEvolutionSettings(NOW), ...patch };
}

/** Quantitatif détaillé réaliste : gros œuvre, peinture (avec main-d'œuvre), études. */
function makeDqe(): any {
  return {
    lots: [
      {
        id: "gros_oeuvre",
        name: "Gros œuvre (fondations, structures)",
        nature: "materiaux",
        percent: 60,
        allocatedSubtotal: 60_000,
        subtotal: 60_000,
        lines: [
          {
            designation: "Béton armé C25/30",
            unit: "m3",
            quantity: 10,
            unitPrice: 400,
            total: 4_000,
            nature: "materiaux",
          },
          {
            designation: "Main-d'œuvre — gros œuvre",
            unit: "lot",
            quantity: 1,
            unitPrice: 56_000,
            total: 56_000,
            nature: "main_oeuvre",
          },
        ],
      },
      {
        id: "peinture",
        name: "Peinture",
        nature: "materiaux",
        percent: 20,
        allocatedSubtotal: 20_000,
        subtotal: 20_000,
        lines: [
          {
            designation: "Peinture intérieure au seau",
            unit: "seau",
            quantity: 20,
            unitPrice: 1_000,
            total: 20_000,
            nature: "materiaux",
            labor: {
              label: "Main-d'œuvre — peinture",
              quantity: 2,
              unit: "lot",
              unitPrice: 500,
              total: 1_000,
            },
          },
        ],
      },
      {
        id: "frais_preliminaires",
        name: "Frais Préliminaires et Études",
        nature: "etudes",
        percent: 20,
        allocatedSubtotal: 20_000,
        subtotal: 20_000,
        lines: [
          {
            designation: "Étude de sol G2",
            unit: "forfait",
            quantity: 1,
            unitPrice: 20_000,
            total: 20_000,
            nature: "etudes",
          },
        ],
      },
    ],
    totals: {
      materiaux: 23_000,
      mainOeuvre: 57_000,
      equipements: 0,
      transport: 0,
      etudes: 20_000,
      total: 100_000,
      costPerM2: 1_000,
    },
    referenceSurface: 120,
    referenceTotal: 100_000,
    generatedAt: NOW,
  };
}

/** Coût estimatif du moteur (grille) cohérent avec le DQE ci-dessus. */
function makeCostEstimate(): any {
  return {
    totalCost: 100_000,
    costPerSquareMeter: 1_000,
    currency: "TND",
    contingencyBuffer: 0,
    contingencyPercentage: 0,
    breakdown: [
      {
        category: "gros_oeuvre",
        label: "Gros œuvre",
        estimatedCost: 60_000,
        percentage: 60,
        items: [
          { name: "Béton armé C25/30", quantity: 10, unit: "m3", unitPrice: 400, totalPrice: 4_000 },
          { name: "Main-d'œuvre — gros œuvre", quantity: 1, unit: "lot", unitPrice: 56_000, totalPrice: 56_000 },
        ],
      },
      {
        category: "second_oeuvre",
        label: "Second œuvre et finitions",
        estimatedCost: 20_000,
        percentage: 20,
        items: [
          { name: "Peinture intérieure au seau", quantity: 20, unit: "seau", unitPrice: 1_000, totalPrice: 20_000 },
        ],
      },
      {
        category: "etudes_imprevus",
        label: "Études et imprévus",
        estimatedCost: 20_000,
        percentage: 20,
        items: [],
      },
    ],
    budgetScenarios: {
      economique: { totalCost: 80_000, costPerM2: 800, label: "Économique", multiplier: 0.8 },
      standard: { totalCost: 100_000, costPerM2: 1_000, label: "Standard", multiplier: 1 },
      premium: { totalCost: 130_000, costPerM2: 1_300, label: "Premium", multiplier: 1.3 },
    },
    levelBreakdown: {
      pricePerM2: 1_000,
      realBuiltArea: 100,
      equivalentArea: 100,
      levels: [{ index: 1, label: "RDC", area: 100, coefficient: 1, commonAmount: 5_000, amount: 95_000 }],
      roof: { label: "Toiture", area: 100, weight: 0.1, amount: 0, counted: false },
      common: { share: 0.05, amount: 5_000, countedOnce: true },
      costAdjustments: [],
      total: 95_000,
      costPerM2Real: 950,
      anomalies: [],
    },
  };
}

function makeAiAnalysis() {
  return { laborEstimate: { totalWorkers: 4, totalDays: 30, estimatedCost: 57_000 } };
}

const apply = (opts: {
  settings: CostEvolutionSettings;
  version?: number;
  chiffrageValide?: boolean;
  now?: number;
}) =>
  applyCostEvolutionToEstimate({
    settings: opts.settings,
    version: opts.version ?? 1,
    now: opts.now ?? NOW,
    chiffrageValide: opts.chiffrageValide,
    costEstimate: makeCostEstimate(),
    dqe: makeDqe(),
    aiAnalysis: makeAiAnalysis(),
    builtSurface: 100,
  });

// ============================================================================
describe("horizon appliqué aux estimations", () => {
  it("1 an dès que le barème est en vigueur, 0 si la date d'application est à venir", () => {
    expect(estimateEvolutionHorizonYears(NOW - 1000, NOW)).toBe(1);
    expect(estimateEvolutionHorizonYears(Date.UTC(2020, 0, 1), NOW)).toBe(1);
    expect(estimateEvolutionHorizonYears(NOW + 86_400_000, NOW)).toBe(0);
  });
});

describe("rattachement des postes au barème", () => {
  it("reconnaît les familles de travaux par libellé", () => {
    expect(evolutionKeyForText("Gros œuvre (fondations, structures)")).toBe("gros_oeuvre");
    expect(evolutionKeyForText("Peinture intérieure au seau")).toBe("peinture");
    expect(evolutionKeyForText("Plomberie complète")).toBe("plomberie");
    expect(evolutionKeyForText("Électricité complète")).toBe("electricite");
    expect(evolutionKeyForText("Carrelage et faïence")).toBe("revetements_finitions");
    expect(evolutionKeyForText("Menuiserie bois")).toBe("menuiserie_ferronnerie");
    expect(evolutionKeyForText("Aménagements extérieurs")).toBe("amenagements_exterieurs");
    expect(evolutionKeyForText("Transports & autres")).toBe("transport_logistique");
    // Postes sans taux dédié → taux global (null).
    expect(evolutionKeyForText("Frais Préliminaires et Études")).toBeNull();
    expect(evolutionKeyForText("Équipements techniques")).toBeNull();
  });

  it("rattache les catégories de coût de l'estimation", () => {
    expect(evolutionKeyForCostCategory("gros_oeuvre")).toBe("gros_oeuvre");
    expect(evolutionKeyForCostCategory("second_oeuvre")).toBe("revetements_finitions");
    expect(evolutionKeyForCostCategory("main_oeuvre")).toBe("main_oeuvre");
    expect(evolutionKeyForCostCategory("transport")).toBe("transport_logistique");
    expect(evolutionKeyForCostCategory("equipements")).toBeNull();
    expect(evolutionKeyForCostCategory("etudes_imprevus")).toBeNull();
  });

  it("n'applique JAMAIS deux fois le même taux sur un même poste", () => {
    const s = settings();
    const once = evolutionFactorFor({ settings: s, key: "peinture", years: 1 });
    expect(once).toBeCloseTo(1.03, 6);
    // Le facteur est composé, pas cumulé : 3 % sur 2 ans ≠ 6 %.
    expect(evolutionFactorFor({ settings: s, key: "peinture", years: 2 })).toBeCloseTo(
      Math.pow(1.03, 2),
      6,
    );
  });
});

// ============================================================================
describe("mécanisme inactif — aucun montant modifié", () => {
  it("ne change rien et produit une empreinte « inactive »", () => {
    const result = apply({ settings: settings({ enabled: false }), now: NOW });
    expect(result.applied).toBe(false);
    expect(result.gridFactor).toBe(1);
    expect(result.fingerprint.status).toBe("inactive");
    expect(result.fingerprint.increase).toBe(0);
    // Les montants restent strictement identiques à ceux du moteur.
    expect(result.fingerprint.referenceCost).toBe(100_000);
    expect(result.fingerprint.projectedCost).toBe(100_000);
  });
});

describe("barème actif mais pas encore en vigueur", () => {
  it("n'applique aucun taux (date d'application à venir)", () => {
    const future = Date.UTC(2027, 0, 1);
    const result = apply({
      settings: settings({ enabled: true, effectiveFrom: future }),
      now: NOW,
    });
    expect(result.applied).toBe(false);
    expect(result.years).toBe(0);
    expect(result.fingerprint.status).toBe("active");
    expect(result.fingerprint.projectedCost).toBe(100_000);
  });
});

describe("chiffrage déjà validé", () => {
  it("n'applique aucun taux (empreinte « validated »)", () => {
    const result = apply({ settings: settings({ enabled: true }), chiffrageValide: true });
    expect(result.applied).toBe(false);
    expect(result.fingerprint.status).toBe("validated");
    expect(result.fingerprint.increase).toBe(0);
  });
});

// ============================================================================
describe("barème actif — application par poste", () => {
  it("majore chaque poste à son taux, quantités inchangées, total = somme du DQE", () => {
    const result = apply({ settings: settings({ enabled: true }) });
    expect(result.applied).toBe(true);
    expect(result.years).toBe(1);

    const total = result.fingerprint.projectedCost; // = total DQE recalculé
    expect(total).toBe(103_000); // 100 000 × 1,03 — une seule application
    expect(result.fingerprint.increase).toBe(3_000);
  });

  it("conserve les quantités et recalcule les montants à l'identique du moteur", () => {
    const costEstimate = makeCostEstimate();
    const dqe = makeDqe();
    const aiAnalysis = makeAiAnalysis();
    applyCostEvolutionToEstimate({
      settings: settings({ enabled: true }),
      version: 3,
      now: NOW,
      costEstimate,
      dqe,
      aiAnalysis,
      builtSurface: 100,
    });

    // Quantités et unités strictement inchangées.
    const ga = dqe.lots[0].lines[0];
    expect(ga.quantity).toBe(10);
    expect(ga.unit).toBe("m3");
    expect(ga.unitPrice).toBe(412); // round2(400 × 1,03)
    expect(ga.total).toBe(4_120); // 10 × 412

    const mo = dqe.lots[0].lines[1];
    expect(mo.unitPrice).toBe(57_680);
    expect(mo.total).toBe(57_680);

    const peinture = dqe.lots[1].lines[0];
    expect(peinture.quantity).toBe(20);
    expect(peinture.unitPrice).toBe(1_030);
    expect(peinture.total).toBe(20_600);
    expect(peinture.labor.unitPrice).toBe(515);
    expect(peinture.labor.total).toBe(1_030);

    // Sous-totaux, totaux par nature et total TTC recalculés.
    expect(dqe.lots[0].subtotal).toBe(61_800);
    expect(dqe.lots[1].subtotal).toBe(20_600);
    expect(dqe.lots[2].subtotal).toBe(20_600);
    expect(dqe.totals.total).toBe(103_000);
    expect(dqe.totals.mainOeuvre).toBe(57_680 + 1_030);
    expect(dqe.totals.materiaux).toBe(4_120 + (20_600 - 1_030));
    expect(dqe.totals.etudes).toBe(20_600);
    expect(dqe.totals.costPerM2).toBe(1_030); // 103 000 / 100 m²
    expect(
      dqe.totals.materiaux + dqe.totals.mainOeuvre + dqe.totals.etudes,
    ).toBe(dqe.totals.total);

    // Budget alloué : facteur GLOBAL de la grille (1,03 ici).
    expect(dqe.lots[0].allocatedSubtotal).toBe(61_800);
    expect(dqe.referenceTotal).toBe(103_000);

    // Coût estimatif aligné sur le Quantitatif.
    expect(costEstimate.totalCost).toBe(103_000);
    expect(costEstimate.budgetScenarios.standard.totalCost).toBe(103_000);
    expect(costEstimate.budgetScenarios.economique.totalCost).toBe(82_400);
    expect(costEstimate.budgetScenarios.premium.totalCost).toBe(133_900);
    // Détail multi-niveaux : montants majorés, invariant total = Σ niveaux.
    expect(costEstimate.levelBreakdown.levels[0].amount).toBe(97_850);
    expect(costEstimate.levelBreakdown.total).toBe(97_850);
    expect(costEstimate.levelBreakdown.pricePerM2).toBeCloseTo(1_030, 6);
    // Analyse IA : estimation de main-d'œuvre alignée sur le barème (3 %).
    expect(aiAnalysis.laborEstimate.estimatedCost).toBe(58_710);
  });

  it("applique des taux distincts par catégorie, sans taux global supplémentaire", () => {
    const s = settings({ enabled: true });
    s.categories = s.categories.map((c) => (c.key === "peinture" ? { ...c, rate: 8 } : c));
    const dqe = makeDqe();
    const costEstimate = makeCostEstimate();
    const result = applyCostEvolutionToEstimate({
      settings: s,
      version: 2,
      now: NOW,
      costEstimate,
      dqe,
      builtSurface: 100,
    });

    // Gros œuvre 3 % → 61 800 ; peinture 8 % → 21 600 ; études (taux global 3 %) → 20 600.
    expect(dqe.lots[0].subtotal).toBe(61_800);
    expect(dqe.lots[1].subtotal).toBe(21_600);
    expect(dqe.lots[1].lines[0].labor.total).toBe(1_080); // main-d'œuvre à 8 %
    expect(dqe.lots[2].subtotal).toBe(20_600);
    expect(dqe.totals.total).toBe(104_000);
    expect(result.fingerprint.projectedCost).toBe(104_000);
  });

  it("utilise le taux annuel global pour les postes sans taux dédié", () => {
    const s = settings({ enabled: true, customRate: 10 });
    const dqe = makeDqe();
    applyCostEvolutionToEstimate({
      settings: s,
      version: 1,
      now: NOW,
      costEstimate: makeCostEstimate(),
      dqe,
      builtSurface: 100,
    });
    // Études (aucun taux dédié) → taux global 10 % ; gros œuvre & peinture → 3 %.
    expect(dqe.lots[2].subtotal).toBe(22_000);
    expect(dqe.lots[0].subtotal).toBe(61_800);
    expect(dqe.totals.total).toBe(104_400);
  });

  it("ventile les composantes (matériaux / main-d'œuvre) lorsqu'elles sont paramétrées", () => {
    const s = settings({ enabled: true });
    s.categories = s.categories.map((c) =>
      c.key === "gros_oeuvre"
        ? {
            ...c,
            useComponents: true,
            components: { materials: 10, labor: 2, transport: 5, equipment: 7 },
          }
        : c,
    );
    const dqe = makeDqe();
    applyCostEvolutionToEstimate({
      settings: s,
      version: 1,
      now: NOW,
      costEstimate: makeCostEstimate(),
      dqe,
      builtSurface: 100,
    });
    const [beton, mainOeuvre] = dqe.lots[0].lines;
    expect(beton.unitPrice).toBe(440); // matériaux +10 %
    expect(mainOeuvre.unitPrice).toBe(57_120); // main-d'œuvre +2 %
    // Les autres postes gardent leur taux de catégorie (3 %).
    expect(dqe.lots[1].subtotal).toBe(20_600);
  });

  it("produit EXACTEMENT les mêmes montants à chaque recalcul (aucune accumulation)", () => {
    const once = apply({ settings: settings({ enabled: true }) });
    const twice = apply({ settings: settings({ enabled: true }) });
    expect(twice.fingerprint.projectedCost).toBe(once.fingerprint.projectedCost);
    expect(twice.fingerprint.increase).toBe(once.fingerprint.increase);
  });
});

// ============================================================================
describe("empreinte du calcul", () => {
  it("conserve version, date, statut, scénario, horizon et impacts", () => {
    const result = apply({ settings: settings({ enabled: true }), version: 7 });
    const fp: EstimateEvolutionFingerprint = result.fingerprint;
    expect(fp.version).toBe(7);
    expect(fp.status).toBe("active");
    expect(fp.appliedAt).toBe(NOW);
    expect(fp.referenceYear).toBe(2026);
    expect(fp.effectiveFrom).toBe(Date.UTC(2026, 0, 1));
    expect(fp.scenario).toBe("moderee");
    expect(fp.scenarioLabel).toBe("Modéré");
    expect(fp.years).toBe(1);
    expect(fp.globalRate).toBe(3);
    expect(fp.referenceCost).toBe(100_000);
    expect(fp.projectedCost).toBe(103_000);
    expect(fp.increase).toBe(3_000);
    expect(fp.increasePct).toBe(3);
    expect(COST_EVOLUTION_STATUS_LABELS[fp.status]).toMatch(/Actif/);
  });
});

describe("section PDF issue de l'empreinte", () => {
  const active = apply({ settings: settings({ enabled: true }), version: 4 }).fingerprint;

  it("n'affiche la section QUE si les taux ont réellement été appliqués", () => {
    expect(buildAppliedCostEvolutionPdfBlock(null)).toBeNull();
    expect(buildAppliedCostEvolutionPdfBlock(undefined)).toBeNull();
    expect(
      buildAppliedCostEvolutionPdfBlock(
        apply({ settings: settings({ enabled: false }) }).fingerprint,
      ),
    ).toBeNull();
    expect(
      buildAppliedCostEvolutionPdfBlock(
        apply({ settings: settings({ enabled: true }), chiffrageValide: true }).fingerprint,
      ),
    ).toBeNull();
  });

  it("reprend la date, la version, le statut et les montants du calcul", () => {
    const block = buildAppliedCostEvolutionPdfBlock(active)!;
    expect(block).not.toBeNull();
    expect(block.title).toBe("Hypothèses d'évolution des coûts");
    expect(block.referenceYear).toBe(2026);
    const values = block.rows.map((r) => `${r.label}: ${r.value}`);
    expect(values.some((v) => v.includes("v4"))).toBe(true); // version des taux
    expect(values.some((v) => /Statut: Actif/.test(v))).toBe(true);
    expect(values.some((v) => v.includes("24 octobre 2026"))).toBe(true); // date du calcul
    expect(block.projectedCost).toBe(103_000);
    expect(block.increase).toBe(3_000);
    expect(block.disclaimer).toMatch(/ne constituent pas un devis garanti/);
  });
});
