import { describe, expect, it } from "vitest";

import {
  CUSTOM_WORK_CATALOG,
  CUSTOM_WORK_KEYS,
  isCustomWorkKey,
  normalizeCustomWorkKeys,
  resolveCustomWorkSurface,
  scenarioToFinishLevel,
  type CustomWorkProjectContext,
} from "../lib/customWorksCatalog";
import {
  estimateCustomWork,
  estimateSelectedCustomWorks,
} from "./customWorksEngine";

const CTX: CustomWorkProjectContext = {
  surface: 150,
  floors: 1,
  surfaceTotale: 400,
  pools: 0,
  garages: 0,
};

describe("customWorksCatalog", () => {
  it("expose au moins les quatre travaux prédéfinis demandés", () => {
    const labels = CUSTOM_WORK_CATALOG.map((w) => w.label);
    expect(labels).toContain("Piscine");
    expect(labels).toContain("Garage");
    expect(labels).toContain("Jardin");
    expect(labels).toContain("Panneaux solaires");
  });

  it("normalise une sélection : déduplique et ignore les clés inconnues", () => {
    expect(normalizeCustomWorkKeys(["piscine", "piscine", "bidon", "garage"])).toEqual([
      "piscine",
      "garage",
    ]);
    expect(isCustomWorkKey("solaire")).toBe(true);
    expect(isCustomWorkKey("inconnu")).toBe(false);
  });

  it("déduit les quantités des données réelles du projet", () => {
    expect(resolveCustomWorkSurface("garage", CTX)).toBe(18);
    expect(resolveCustomWorkSurface("garage", { ...CTX, garages: 2 })).toBe(36);
    expect(resolveCustomWorkSurface("piscine", { ...CTX, pools: 1 })).toBe(32);
    // Jardin : reste du terrain hors bâti (400 - 150).
    expect(resolveCustomWorkSurface("jardin", CTX)).toBe(250);
  });

  it("associe chaque scénario budgétaire à un niveau de finition du moteur BIM", () => {
    expect(scenarioToFinishLevel("economique")).toBe("economique");
    expect(scenarioToFinishLevel("standard")).toBe("standard");
    expect(scenarioToFinishLevel("premium")).toBe("premium");
    expect(scenarioToFinishLevel(undefined)).toBe("standard");
  });
});

describe("estimateCustomWork", () => {
  it("chiffre chaque travail prédéfini à partir du projet (matériaux + main-d'œuvre)", () => {
    for (const key of CUSTOM_WORK_KEYS) {
      const work = estimateCustomWork(key, CTX, "tunis", "standard");
      expect(work.key).toBe(key);
      expect(work.surface).toBeGreaterThan(0);
      expect(work.total).toBeGreaterThan(0);
      expect(work.materials).toBeGreaterThan(0);
      expect(work.labor).toBeGreaterThan(0);
      expect(work.lines.length).toBeGreaterThan(0);
      // Le total est exactement la somme des natures (aucun montant ajouté).
      expect(work.total).toBe(
        Math.round(
          (work.materials + work.equipments + work.labor + work.transport + work.studies) * 100,
        ) / 100,
      );
    }
  });

  it("respecte le scénario budgétaire (Économique < Standard < Premium)", () => {
    const eco = estimateCustomWork("piscine", CTX, "tunis", "economique");
    const std = estimateCustomWork("piscine", CTX, "tunis", "standard");
    const prem = estimateCustomWork("piscine", CTX, "tunis", "premium");
    expect(eco.finishLevel).toBe("economique");
    expect(prem.finishLevel).toBe("premium");
    expect(eco.total).toBeLessThan(std.total);
    expect(std.total).toBeLessThan(prem.total);
  });

  it("agrège les travaux sélectionnés et leur total", () => {
    const rollup = estimateSelectedCustomWorks(
      ["piscine", "garage", "jardin", "solaire"],
      CTX,
      "tunis",
      "standard",
    );
    expect(rollup.works).toHaveLength(4);
    expect(rollup.total).toBe(
      Math.round(rollup.works.reduce((s, w) => s + w.total, 0) * 100) / 100,
    );
    expect(rollup.total).toBeGreaterThan(0);
  });

  it("garantit qu'un travail déjà sélectionné n'est jamais compté deux fois", () => {
    const rollup = estimateSelectedCustomWorks(
      ["piscine", "piscine", "piscine"],
      CTX,
      "tunis",
      "standard",
    );
    expect(rollup.works).toHaveLength(1);
  });
});
