import { describe, expect, it } from "vitest";

import {
  CUSTOM_WORK_CATALOG,
  CUSTOM_WORK_KEYS,
  SOLAR_PANEL_COUNT_OPTIONS,
  SOLAR_PANEL_DEFAULT_COUNT,
  SOLAR_PANEL_TYPE,
  isCustomWorkKey,
  normalizeCustomWorkKeys,
  normalizeSolarPanelCount,
  resolveCustomWorkSurface,
  scenarioToFinishLevel,
  type CustomWorkProjectContext,
} from "../lib/customWorksCatalog";
import { solarPanelUnitPrice } from "./bimEngine";
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

const round2 = (n: number) => Math.round(n * 100) / 100;

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

  it("propose un sélecteur de 1 à 5 panneaux solaires", () => {
    expect(SOLAR_PANEL_COUNT_OPTIONS).toEqual([1, 2, 3, 4, 5]);
    expect(SOLAR_PANEL_DEFAULT_COUNT).toBeGreaterThanOrEqual(1);
    expect(SOLAR_PANEL_DEFAULT_COUNT).toBeLessThanOrEqual(5);
    expect(SOLAR_PANEL_TYPE.unit).toBe("panneaux");
    expect(SOLAR_PANEL_TYPE.powerWc).toBeGreaterThan(0);
  });

  it("borne le nombre de panneaux à un entier de 1 à 5 (défaut si absent)", () => {
    expect(normalizeSolarPanelCount(1)).toBe(1);
    expect(normalizeSolarPanelCount(5)).toBe(5);
    expect(normalizeSolarPanelCount(0)).toBe(SOLAR_PANEL_DEFAULT_COUNT);
    expect(normalizeSolarPanelCount(-3)).toBe(SOLAR_PANEL_DEFAULT_COUNT);
    expect(normalizeSolarPanelCount(99)).toBe(5);
    expect(normalizeSolarPanelCount(2.6)).toBe(3);
    expect(normalizeSolarPanelCount(undefined)).toBe(SOLAR_PANEL_DEFAULT_COUNT);
    expect(normalizeSolarPanelCount("4")).toBe(4);
  });

  it("n'utilise AUCUN métrage pour les panneaux solaires", () => {
    expect(resolveCustomWorkSurface("solaire", CTX)).toBe(0);
    expect(resolveCustomWorkSurface("solaire", { ...CTX, surface: 900 })).toBe(0);
  });

  it("associe chaque scénario budgétaire à un niveau de finition du moteur BIM", () => {
    expect(scenarioToFinishLevel("economique")).toBe("economique");
    expect(scenarioToFinishLevel("standard")).toBe("standard");
    expect(scenarioToFinishLevel("premium")).toBe("premium");
    expect(scenarioToFinishLevel(undefined)).toBe("standard");
  });
});

describe("estimateCustomWork", () => {
  it("chiffre chaque travail prédéfini à partir du projet", () => {
    for (const key of CUSTOM_WORK_KEYS) {
      const work = estimateCustomWork(key, CTX, "tunis", "standard");
      expect(work.key).toBe(key);
      expect(work.total).toBeGreaterThan(0);
      expect(work.lines.length).toBeGreaterThan(0);
      // Le total est exactement la somme des natures (aucun montant ajouté).
      expect(work.total).toBe(
        round2(
          work.materials + work.equipments + work.labor + work.transport + work.studies,
        ),
      );
      if (key === "solaire") {
        // Aucun métrage : le poste solaire se chiffre au nombre de panneaux.
        expect(work.surface).toBe(0);
      } else {
        expect(work.surface).toBeGreaterThan(0);
        expect(work.materials).toBeGreaterThan(0);
        expect(work.labor).toBeGreaterThan(0);
      }
    }
  });

  it("chiffre les panneaux solaires : nombre de panneaux × prix unitaire système", () => {
    const unitPrice = solarPanelUnitPrice();
    expect(unitPrice).toBeGreaterThan(0);

    for (const count of SOLAR_PANEL_COUNT_OPTIONS) {
      const work = estimateCustomWork("solaire", CTX, "tunis", "standard", count);
      expect(work.panelCount).toBe(count);
      expect(work.panelUnitPrice).toBe(unitPrice);
      expect(work.quantityUnit).toBe("panneaux");
      expect(work.total).toBe(round2(count * unitPrice));
      // Exemple demandé : 3 panneaux × prix unitaire = coût total.
      if (count === 3) {
        expect(work.total).toBe(round2(3 * unitPrice));
      }
      // La quantité affichée est exprimée EN PANNEAUX, jamais en m².
      expect(work.surface).toBe(0);
      const panel = work.lines[0];
      expect(panel.unit).toBe("panneaux");
      expect(panel.quantity).toBe(count);
      expect(panel.unitPrice).toBe(unitPrice);
      expect(panel.total).toBe(work.total);
    }
  });

  it("ne dépend jamais d'une surface en m² (piscine/garage/jardin si)", () => {
    const small = estimateCustomWork("solaire", { ...CTX, surface: 20 }, "tunis", "standard", 3);
    const huge = estimateCustomWork(
      "solaire",
      { ...CTX, surface: 5000, floors: 4 },
      "tunis",
      "standard",
      3,
    );
    expect(small.total).toBe(huge.total);
    expect(small.surface).toBe(0);
    expect(huge.surface).toBe(0);
    // Les autres travaux restent, eux, dimensionnés par le projet.
    expect(estimateCustomWork("garage", { ...CTX, garages: 2 }, "tunis", "standard").surface).toBe(36);
  });

  it("utilise le même prix unitaire système dans tous les scénarios budgétaires", () => {
    const eco = estimateCustomWork("solaire", CTX, "tunis", "economique", 4);
    const std = estimateCustomWork("solaire", CTX, "tunis", "standard", 4);
    const prem = estimateCustomWork("solaire", CTX, "tunis", "premium", 4);
    expect(eco.panelUnitPrice).toBe(std.panelUnitPrice);
    expect(prem.panelUnitPrice).toBe(std.panelUnitPrice);
    // Le montant est intégré à l'identique dans chaque scénario.
    expect(eco.total).toBe(std.total);
    expect(prem.total).toBe(std.total);
    expect(eco.total).toBe(round2(4 * (std.panelUnitPrice as number)));
  });

  it("retombe sur 3 panneaux si aucun nombre n'est fourni", () => {
    const work = estimateCustomWork("solaire", CTX, "tunis", "standard");
    expect(work.panelCount).toBe(SOLAR_PANEL_DEFAULT_COUNT);
    expect(work.total).toBe(round2(SOLAR_PANEL_DEFAULT_COUNT * (work.panelUnitPrice as number)));
  });

  it("respecte le scénario budgétaire (Économique < Standard < Premium) pour les autres travaux", () => {
    const eco = estimateCustomWork("piscine", CTX, "tunis", "economique");
    const std = estimateCustomWork("piscine", CTX, "tunis", "standard");
    const prem = estimateCustomWork("piscine", CTX, "tunis", "premium");
    expect(eco.finishLevel).toBe("economique");
    expect(prem.finishLevel).toBe("premium");
    expect(eco.total).toBeLessThan(std.total);
    expect(std.total).toBeLessThan(prem.total);
  });
});

describe("estimateSelectedCustomWorks", () => {
  it("agrège les travaux sélectionnés et leur total", () => {
    const rollup = estimateSelectedCustomWorks(
      ["piscine", "garage", "jardin", "solaire"],
      CTX,
      "tunis",
      "standard",
      2,
    );
    expect(rollup.works).toHaveLength(4);
    expect(rollup.total).toBe(round2(rollup.works.reduce((s, w) => s + w.total, 0)));
    expect(rollup.total).toBeGreaterThan(0);
    const solar = rollup.works.find((w) => w.key === "solaire");
    expect(solar?.panelCount).toBe(2);
  });

  it("garantit qu'un travail déjà sélectionné n'est jamais compté deux fois", () => {
    const rollup = estimateSelectedCustomWorks(
      ["piscine", "piscine", "piscine", "solaire", "solaire"],
      CTX,
      "tunis",
      "standard",
      5,
    );
    expect(rollup.works).toHaveLength(2);
    expect(rollup.works.find((w) => w.key === "solaire")?.panelCount).toBe(5);
  });
});
