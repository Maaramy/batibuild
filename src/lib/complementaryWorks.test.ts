import { describe, expect, it } from "vitest";

import {
  COMPLEMENTARY_WORK_MIN_SURFACE,
  COMPLEMENTARY_WORK_PROJECT_TYPES,
  CUSTOM_WORK_CATALOG,
  EXTERIOR_LOT_ID,
  complementaryWorkLotId,
  getCustomWorkDef,
  isComplementaryWorkEligible,
  resolveCustomWorkSurface,
  type CustomWorkProjectContext,
} from "./customWorksCatalog";
import {
  buildChartBreakdown,
  buildComplementaryWorksLots,
  complementaryWorksTotal,
  withComplementaryWorksLots,
  type QuantitatifLotLike,
} from "./complementaryWorks";
import { estimateCustomWork } from "../convex/customWorksEngine";

const CTX: CustomWorkProjectContext = {
  surface: 150,
  floors: 1,
  surfaceTotale: 400,
  pools: 0,
  garages: 0,
};

/** Lots du moteur DQE pour un projet de logement neuf (ordre de référence). */
const DQE_LOTS: QuantitatifLotLike[] = [
  { id: "frais_preliminaires", name: "Frais Préliminaires et Études", subtotal: 12000 },
  { id: "gros_oeuvre", name: "Gros œuvre (fondations, structures)", subtotal: 180000 },
  { id: "second_oeuvre", name: "Second œuvre et finitions", subtotal: 120000 },
  { id: "amenagements_exterieurs", name: "Aménagements extérieurs", subtotal: 30000 },
  { id: "vrd", name: "Transports & autres", subtotal: 15000 },
];

type WorkKey = "piscine" | "garage" | "cuisine_exterieure" | "jardin" | "solaire";

const works = (keys: WorkKey[]) =>
  keys.map((k) => estimateCustomWork(k, CTX, "tunis", "standard", 3));

/** Somme des sous-totaux des lots. */
const lotsTotal = (lots: QuantitatifLotLike[]) =>
  lots.reduce((s, l) => s + (Number(l?.subtotal) || 0), 0);

describe("éligibilité aux travaux complémentaires", () => {
  it("n'autorise que les types logement / immobilier neuf", () => {
    for (const type of COMPLEMENTARY_WORK_PROJECT_TYPES) {
      expect(isComplementaryWorkEligible(type, 150)).toBe(true);
    }
    expect(COMPLEMENTARY_WORK_PROJECT_TYPES).toContain("maison");
    expect(COMPLEMENTARY_WORK_PROJECT_TYPES).toContain("villa");
    expect(COMPLEMENTARY_WORK_PROJECT_TYPES).toContain("appartement");
    expect(COMPLEMENTARY_WORK_PROJECT_TYPES).toContain("duplex");
    expect(COMPLEMENTARY_WORK_PROJECT_TYPES).toContain("projet_neuf");
    // Autres types : fonctionnalité masquée.
    for (const other of ["studio", "immeuble", "bureau", "hotel", "route"]) {
      expect(isComplementaryWorkEligible(other, 400)).toBe(false);
    }
  });

  it("exige une surface couverte ≥ 120 m²", () => {
    expect(COMPLEMENTARY_WORK_MIN_SURFACE).toBe(120);
    expect(isComplementaryWorkEligible("maison", 119)).toBe(false);
    expect(isComplementaryWorkEligible("maison", 120)).toBe(true);
    expect(isComplementaryWorkEligible("villa", 450)).toBe(true);
    expect(isComplementaryWorkEligible("maison", undefined)).toBe(false);
    expect(isComplementaryWorkEligible(undefined, 200)).toBe(false);
  });
});

describe("liste prédéfinie des travaux complémentaires", () => {
  it("propose les cinq travaux demandés", () => {
    const labels = CUSTOM_WORK_CATALOG.map((w) => w.label);
    expect(labels).toEqual([
      "Piscine",
      "Garage",
      "Cuisine extérieure",
      "Jardin",
      "Panneaux solaires",
    ]);
  });

  it("chiffre automatiquement la cuisine extérieure à partir du projet", () => {
    const surface = resolveCustomWorkSurface("cuisine_exterieure", CTX);
    expect(surface).toBeGreaterThanOrEqual(10);
    expect(surface).toBeLessThanOrEqual(24);
    const estimate = estimateCustomWork("cuisine_exterieure", CTX, "tunis", "standard");
    expect(estimate.total).toBeGreaterThan(0);
    expect(estimate.lines.length).toBeGreaterThan(0);
  });
});

describe("catégories « Travaux complémentaires personnalisés » du Quantitatif détaillé", () => {
  it("ne modifie rien sans travail sélectionné", () => {
    expect(buildComplementaryWorksLots([])).toEqual([]);
    expect(buildComplementaryWorksLots(null)).toEqual([]);
    expect(withComplementaryWorksLots(DQE_LOTS, [])).toBe(DQE_LOTS);
  });

  it("présente CHAQUE travail sélectionné comme sa propre catégorie, juste avant « Aménagement extérieur »", () => {
    const selected = works(["piscine", "garage"]);
    const lots = withComplementaryWorksLots(DQE_LOTS, selected);
    expect(lots.map((l) => l.id)).toEqual([
      "frais_preliminaires",
      "gros_oeuvre",
      "second_oeuvre",
      complementaryWorkLotId("piscine"),
      complementaryWorkLotId("garage"),
      "amenagements_exterieurs",
      "vrd",
    ]);
    // Une catégorie par travail : titre = libellé du travail, même structure de
    // lot que les catégories du moteur DQE (aucune propriété spécifique).
    for (const work of selected) {
      const lot = lots.find((l) => l.id === complementaryWorkLotId(work.key));
      expect(lot?.name).toBe(work.label);
      expect(lot?.customWorks).toBe(true);
      expect(Object.keys(lot ?? {}).sort()).toEqual([
        "customWorks",
        "id",
        "lines",
        "name",
        "percent",
        "subtotal",
      ]);
    }
    // Les lots d'origine ne sont jamais mutés : les scénarios Économique /
    // Standard / Premium restent strictement identiques.
    expect(DQE_LOTS).toHaveLength(5);
    expect(DQE_LOTS.map((l) => l.id)).not.toContain(complementaryWorkLotId("piscine"));
  });

  it("ne crée jamais de doublon et n'altère pas les catégories existantes", () => {
    const once = withComplementaryWorksLots(DQE_LOTS, works(["jardin"]));
    const twice = withComplementaryWorksLots(once, works(["jardin"]));
    expect(twice.filter((l) => l.id === complementaryWorkLotId("jardin"))).toHaveLength(1);
    expect(twice.filter((l) => l.id === EXTERIOR_LOT_ID)).toHaveLength(1);
    // Les lots d'origine sont conservés à l'identique (montants inchangés).
    for (const original of DQE_LOTS) {
      const kept = twice.find((l) => l.id === original.id);
      expect(kept?.subtotal).toBe(original.subtotal);
      expect(kept?.name).toBe(original.name);
    }
  });

  it("porte les articles réels de chaque travail (quantités, unités, prix et montants inchangés)", () => {
    const selected = works(["piscine", "garage", "solaire"]);
    const lots = buildComplementaryWorksLots(selected);
    expect(lots.map((l) => l.id)).toEqual(selected.map((w) => complementaryWorkLotId(w.key)));

    for (const work of selected) {
      const lot = lots.find((l) => l.id === complementaryWorkLotId(work.key));
      const lines = lot?.lines ?? [];
      const source = work.lines.filter((l) => (Number(l.total) || 0) > 0);
      expect(lot?.subtotal).toBe(work.total);
      expect(lines).toHaveLength(source.length);
      lines.forEach((line, i) => {
        expect(line.designation).toBe(source[i].designation);
        expect(line.quantity).toBe(source[i].quantity);
        expect(line.unit).toBe(source[i].unit);
        expect(line.unitPrice).toBe(source[i].unitPrice);
        expect(line.total).toBe(source[i].total);
        expect(line.nature).toBe(source[i].nature);
      });
    }

    // Le total des catégories reste EXACTEMENT le total des travaux chiffrés :
    // le coût total du projet et les résultats d'estimation restent synchronisés.
    expect(lotsTotal(lots)).toBeCloseTo(complementaryWorksTotal(selected), 2);
  });

  it("conserve les panneaux solaires au nombre de panneaux (jamais au m²)", () => {
    const lots = buildComplementaryWorksLots(works(["solaire"]));
    const solarLines = lots.find((l) => l.id === complementaryWorkLotId("solaire"))?.lines ?? [];
    expect(solarLines.length).toBeGreaterThan(0);
    for (const line of solarLines) {
      expect(line.unit).toBe("panneaux");
      expect(line.quantity).toBe(3);
    }
  });

  it("affiche des totaux par nature égaux aux agrégats de chaque travail", () => {
    const selected = works([
      "piscine",
      "garage",
      "cuisine_exterieure",
      "jardin",
      "solaire",
    ]);
    const lots = buildComplementaryWorksLots(selected);

    for (const work of selected) {
      const lines = lots.find((l) => l.id === complementaryWorkLotId(work.key))?.lines ?? [];
      const sum = (nature: string) =>
        lines.filter((l) => l.nature === nature).reduce((s, l) => s + l.total, 0);
      // Les postes affichés (Matériaux, Équipements, Main-d'œuvre, Transport,
      // Études) correspondent exactement aux agrégats chiffrés par le moteur.
      expect(sum("materiaux")).toBeCloseTo(work.materials, 2);
      expect(sum("equipements")).toBeCloseTo(work.equipments, 2);
      expect(sum("main_oeuvre")).toBeCloseTo(work.labor, 2);
      expect(sum("transport")).toBeCloseTo(work.transport, 2);
      expect(sum("etudes")).toBeCloseTo(work.studies, 2);
    }
  });

  it("recalcule les pourcentages sur le nouveau total, sans changer le total", () => {
    const selected = works(["piscine", "garage"]);
    const lots = withComplementaryWorksLots(DQE_LOTS, selected);
    const total = lotsTotal(lots);
    // Total inchangé : celui du quantitatif + les travaux complémentaires.
    expect(total).toBeCloseTo(lotsTotal(DQE_LOTS) + complementaryWorksTotal(selected), 2);
    for (const lot of lots) {
      expect(lot.percent).toBeCloseTo(((Number(lot.subtotal) || 0) / total) * 100, 1);
    }
    // Les pourcentages d'origine ne sont pas conservés tels quels : ils sont
    // recalculés sur le total incluant les travaux complémentaires.
    const gros = lots.find((l) => l.id === "gros_oeuvre");
    expect(gros?.percent).toBeLessThan(100);
    expect(gros?.subtotal).toBe(180000);
  });
});

describe("travaux complémentaires dans « Répartition » et « Détail par catégorie »", () => {
  /** Répartition BIM du projet (scénario de référence). */
  const BIM_BREAKDOWN = [
    { category: "gros_oeuvre", label: "Gros œuvre", estimatedCost: 180000, percentage: 60 },
    { category: "second_oeuvre", label: "Second œuvre", estimatedCost: 120000, percentage: 40 },
  ];

  it("n'ajoute aucune part sans travail sélectionné (répartition d'origine inchangée)", () => {
    expect(buildChartBreakdown(BIM_BREAKDOWN, [])).toBe(BIM_BREAKDOWN);
    expect(buildChartBreakdown(BIM_BREAKDOWN, null)).toBe(BIM_BREAKDOWN);
  });

  it("ajoute une part par travail : libellé, coût, couleur et icône du travail", () => {
    const selected = works(["piscine", "solaire"]);
    const chart = buildChartBreakdown(BIM_BREAKDOWN, selected);
    expect(chart).toHaveLength(BIM_BREAKDOWN.length + selected.length);
    for (const work of selected) {
      const part = chart.find((e) => e.workKey === work.key);
      expect(part?.label).toBe(work.label);
      expect(part?.estimatedCost).toBe(work.total);
      expect(part?.category).toBe(complementaryWorkLotId(work.key));
      expect(part?.color).toBe(getCustomWorkDef(work.key)?.color);
      expect(part?.icon).toBe(work.icon);
    }
  });

  it("recalcule les parts du total sans modifier aucun montant", () => {
    const selected = works(["piscine", "jardin"]);
    const chart = buildChartBreakdown(BIM_BREAKDOWN, selected);
    const total = chart.reduce((s, e) => s + e.estimatedCost, 0);
    const bimTotal = BIM_BREAKDOWN.reduce((s, b) => s + b.estimatedCost, 0);
    // Le total de la répartition = quantitatif BIM + travaux complémentaires.
    expect(total).toBeCloseTo(bimTotal + complementaryWorksTotal(selected), 2);
    // La somme des parts affichées reste égale à 100 %.
    const share = chart.reduce((s, e) => s + (e.percentage ?? 0), 0);
    expect(Math.abs(share - 100)).toBeLessThan(1);
    // Les montants du quantitatif BIM sont repris tels quels.
    for (const entry of chart) {
      const stock = BIM_BREAKDOWN.find((b) => b.label === entry.label);
      if (stock) expect(entry.estimatedCost).toBe(stock.estimatedCost);
    }
  });

  it("donne à chaque travail du catalogue une teinte distincte et valide", () => {
    const colors = CUSTOM_WORK_CATALOG.map((w) => w.color);
    for (const color of colors) expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(new Set(colors).size).toBe(colors.length);
  });
});
