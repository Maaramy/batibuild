import { describe, expect, it } from "vitest";

import {
  COMPLEMENTARY_WORK_MIN_SURFACE,
  COMPLEMENTARY_WORK_PROJECT_TYPES,
  COMPLEMENTARY_WORKS_LOT_ID,
  COMPLEMENTARY_WORKS_LOT_NAME,
  CUSTOM_WORK_CATALOG,
  EXTERIOR_LOT_ID,
  isComplementaryWorkEligible,
  resolveCustomWorkSurface,
  type CustomWorkProjectContext,
} from "./customWorksCatalog";
import {
  buildComplementaryWorksLot,
  complementaryWorksTotal,
  withComplementaryWorksLot,
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

describe("catégorie « Travaux personnalisés » du Quantitatif détaillé", () => {
  it("retourne null (aucune modification) sans travail sélectionné", () => {
    expect(buildComplementaryWorksLot([])).toBeNull();
    expect(buildComplementaryWorksLot(null)).toBeNull();
    expect(withComplementaryWorksLot(DQE_LOTS, [])).toBe(DQE_LOTS);
  });

  it("insère la catégorie IMMÉDIATEMENT avant « Aménagement extérieur »", () => {
    const lots = withComplementaryWorksLot(DQE_LOTS, works(["piscine", "garage"]));
    expect(lots.map((l) => l.id)).toEqual([
      "frais_preliminaires",
      "gros_oeuvre",
      "second_oeuvre",
      COMPLEMENTARY_WORKS_LOT_ID,
      "amenagements_exterieurs",
      "vrd",
    ]);
    const lot = lots.find((l) => l.id === COMPLEMENTARY_WORKS_LOT_ID);
    expect(lot?.name).toBe(COMPLEMENTARY_WORKS_LOT_NAME);
    expect(lot?.customWorks).toBe(true);
    // Les lots d'origine ne sont jamais mutés : les scénarios Économique /
    // Standard / Premium restent strictement identiques.
    expect(DQE_LOTS.map((l) => l.id)).not.toContain(COMPLEMENTARY_WORKS_LOT_ID);
    expect(DQE_LOTS).toHaveLength(5);
  });

  it("ne crée jamais de doublon et n'altère pas les catégories existantes", () => {
    const once = withComplementaryWorksLot(DQE_LOTS, works(["jardin"]));
    const twice = withComplementaryWorksLot(once, works(["jardin"]));
    expect(twice.filter((l) => l.id === COMPLEMENTARY_WORKS_LOT_ID)).toHaveLength(1);
    expect(twice.filter((l) => l.id === EXTERIOR_LOT_ID)).toHaveLength(1);
    // Les lots d'origine sont conservés à l'identique (montants inchangés).
    for (const original of DQE_LOTS) {
      const kept = twice.find((l) => l.id === original.id);
      expect(kept?.subtotal).toBe(original.subtotal);
      expect(kept?.name).toBe(original.name);
    }
  });

  it("porte les articles réels de chaque travail (poste identifié)", () => {
    const selected = works(["piscine", "garage", "solaire"]);
    const lot = buildComplementaryWorksLot(selected);
    expect(lot).not.toBeNull();
    const lines = lot?.lines ?? [];
    expect(lot?.subtotal).toBe(complementaryWorksTotal(selected));
    expect(lines.length).toBe(selected.reduce((s, w) => s + w.lines.length, 0));
    for (const w of selected) {
      const owned = lines.filter((l) => l.description?.includes(w.label));
      expect(owned.length).toBe(w.lines.length);
      expect(owned.reduce((s, l) => s + l.total, 0)).toBeCloseTo(w.total, 2);
    }
    // Panneaux solaires : quantités exprimées en panneaux, jamais en m².
    const solarLines = lines.filter((l) => l.description?.includes("Panneaux solaires"));
    expect(solarLines.length).toBeGreaterThan(0);
    for (const line of solarLines) {
      expect(line.unit).toBe("panneaux");
      expect(line.quantity).toBe(3);
    }
  });

  it("recalcule les pourcentages sur le nouveau total", () => {
    const lots = withComplementaryWorksLot(DQE_LOTS, works(["piscine"]));
    const total = lots.reduce((s, l) => s + (Number(l.subtotal) || 0), 0);
    for (const lot of lots) {
      expect(lot.percent).toBeCloseTo(((Number(lot.subtotal) || 0) / total) * 100, 1);
    }
  });
});
