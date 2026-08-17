import { describe, it, expect } from "vitest";
import {
  PROJECT_TYPE_MODELS,
  getQuantitatifModel,
  buildModelBreakdown,
} from "./bimModelQuantitatif";
import {
  runBIMEstimation,
  buildLivePriceMap,
  BIM_CATEGORIES,
  BIM_CATEGORY_LABELS,
} from "./bimEngine";

// ════════════════════════════════════════════════════════════════════════
// QUANTITATIF DÉTAILLÉ — MODÈLES PAR TYPE DE PROJET (feuille « projecttype »)
// ════════════════════════════════════════════════════════════════════════

const NEW_TYPES = [
  "maison",
  "villa",
  "maison_r_plus_1",
  "maison_r_plus_2",
  "immeuble_residentiel",
  "appartement",
  "studio",
  "duplex",
  "renovation_complete",
  "renovation_cuisine",
  "renovation_salle_de_bain",
  "peinture_interieur",
  "piscine_beton",
  "piscine_coque",
  "garage",
  "boutique_commerciale",
  "restaurant",
  "cafe",
  "bureau_cabinet",
  "atelier",
  "entrepot",
  "maison_d_hotes",
  "batiment_agricole",
  "electricite_complete",
  "plomberie_complete",
];

const ROOMS = {
  bedrooms: 3,
  bathrooms: 2,
  kitchens: 1,
  livingRooms: 1,
  garages: 0,
  wcs: 1,
  pools: 0,
};

function engineBreakdown(category: string, surface = 150) {
  return runBIMEstimation(category, surface, 1, "tunis", "standard", ROOMS)
    .costEstimate.breakdown;
}

function sumItems(items: any[]) {
  return items.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
}

describe("catalogue des types de projet (25 types officiels)", () => {
  it("BIM_CATEGORIES contient exactement les 25 nouveaux types", () => {
    expect([...BIM_CATEGORIES]).toEqual(NEW_TYPES);
    expect(BIM_CATEGORIES).toHaveLength(25);
  });

  it("chaque type a un libellé français et un modèle de quantitatif", () => {
    for (const cat of BIM_CATEGORIES) {
      expect(BIM_CATEGORY_LABELS[cat]).toBeTruthy();
      expect(getQuantitatifModel(cat), cat).toBeDefined();
    }
  });

  it("chaque modèle a une surface de référence et des sections non vides", () => {
    for (const cat of BIM_CATEGORIES) {
      const model = PROJECT_TYPE_MODELS[cat];
      expect(model.refSurface, cat).toBeGreaterThan(0);
      expect(model.sections.length, cat).toBeGreaterThan(0);
      for (const section of model.sections) {
        expect(section.budget, `${cat} / ${section.name}`).toBeGreaterThan(0);
        expect(section.items.length, `${cat} / ${section.name}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("buildModelBreakdown — génération pilotée par le modèle", () => {
  it("remplace les lignes des catégories couvertes par le modèle", () => {
    const engine = engineBreakdown("maison");
    const modelBreakdown = buildModelBreakdown(
      "maison",
      150,
      ROOMS,
      undefined,
      engine,
    );

    const goEngine = engine.find((b) => b.category === "gros_oeuvre")!;
    const goModel = modelBreakdown.find((b) => b.category === "gros_oeuvre")!;
    expect(goModel.items!.length).toBeGreaterThan(0);
    // Libellés du modèle (ex. « Terrassement et fondations ») ≠ libellés du moteur
    const names = goModel.items!.map((i: any) => i.name);
    expect(names.some((n: string) => n.includes("Terrassement et fondations"))).toBe(true);
    expect(names.some((n: string) => n === goEngine.items[0]?.name)).toBe(false);
  });

  it("préserve les budgets des macro-catégories du moteur", () => {
    const engine = engineBreakdown("maison");
    const modelBreakdown = buildModelBreakdown(
      "maison",
      150,
      ROOMS,
      undefined,
      engine,
    );

    for (const entry of modelBreakdown) {
      const budget = entry.estimatedCost ?? 0;
      const itemsTotal = sumItems(entry.items ?? []);
      // Écart maximal : arrondis unitaires (quelques TND)
      expect(Math.abs(itemsTotal - budget), entry.category).toBeLessThanOrEqual(
        Math.max(3, budget * 0.01),
      );
    }
  });

  it("les postes du modèle sont tarifés via le catalogue 2026", () => {
    const modelBreakdown = buildModelBreakdown(
      "maison",
      150,
      ROOMS,
      undefined,
      engineBreakdown("maison"),
    );
    const go = modelBreakdown.find((b) => b.category === "gros_oeuvre")!;
    const priced = go.items!.filter((i: any) => i.unitPrice > 0);
    // Au moins un poste résolu depuis le catalogue (ciment, béton, sable…)
    expect(priced.length).toBeGreaterThan(0);
  });

  it("les prix en direct (base materialPrices) écrasent le catalogue", () => {
    // Le modèle « studio » contient un poste « … briques, ciment, sable » →
    // résolu vers « Ciment CPJ 42.5 (sac 50 kg) » du catalogue 2026.
    const live = buildLivePriceMap([
      { name: "Ciment CPJ 42.5 (sac 50 kg)", unit: "sac", unitPrice: 999 },
    ]);
    const modelBreakdown = buildModelBreakdown(
      "studio",
      150,
      ROOMS,
      live,
      engineBreakdown("studio"),
    );

    // Le poste du modèle conserve son libellé (« … briques, ciment, sable ») ;
    // seul son prix est résolu vers la référence catalogue « Ciment CPJ 42.5 ».
    const all = modelBreakdown.flatMap((b) => b.items ?? []);
    const cement = all.find((i: any) =>
      i.name.includes("Maçonnerie murs porteurs et cloisons"),
    );
    expect(cement).toBeDefined();
    // Le prix en direct (999 TND) remplace le prix catalogue (~16,5 TND) : la
    // section est ensuite remise à l'échelle du budget, mais le prix unitaire
    // doit être nettement supérieur à celui du catalogue seul.
    expect(cement.unitPrice).toBeGreaterThan(100);

    const noLive = buildModelBreakdown(
      "studio",
      150,
      ROOMS,
      undefined,
      engineBreakdown("studio"),
    );
    const cementNoLive = noLive
      .flatMap((b) => b.items ?? [])
      .find((i: any) => i.name.includes("Maçonnerie murs porteurs et cloisons"));
    expect(cementNoLive).toBeDefined();
    expect(cement.unitPrice).toBeGreaterThan(cementNoLive.unitPrice);
  });

  it("les quantités évoluent avec la surface du projet", () => {
    const small = buildModelBreakdown("maison", 60, ROOMS, undefined, engineBreakdown("maison", 60));
    const large = buildModelBreakdown("maison", 240, ROOMS, undefined, engineBreakdown("maison", 240));

    const qtyOf = (bd: typeof small) => {
      const go = bd.find((b) => b.category === "gros_oeuvre")!;
      const item = go.items!.find((i: any) => i.name.includes("Terrassement et fondations"))!;
      return item.quantity as number;
    };
    expect(qtyOf(large)).toBeGreaterThan(qtyOf(small));
  });

  it("les catégories sans postes dans le modèle gardent les lignes du moteur", () => {
    const engine = engineBreakdown("maison");
    const modelBreakdown = buildModelBreakdown(
      "maison",
      150,
      ROOMS,
      undefined,
      engine,
    );
    // « Main-d'œuvre » n'a pas de postes dans le modèle maison → lignes moteur.
    const moModel = modelBreakdown.find((b) => b.category === "main_oeuvre")!;
    const moEngine = engine.find((b) => b.category === "main_oeuvre")!;
    expect(moModel.items).toEqual(moEngine.items);
  });

  it("les catégories sans modèle (legacy hors liste) ne sont pas modifiées", () => {
    const engine = engineBreakdown("route", 200);
    const before = JSON.stringify(engine);
    const after = buildModelBreakdown("route", 200, ROOMS, undefined, engine);
    expect(JSON.stringify(after)).toBe(before);
  });
});

describe("compatibilité des anciens slugs", () => {
  it("les anciens types (piscine, bureau, ferme…) résolvent vers le modèle le plus proche", () => {
    expect(getQuantitatifModel("piscine")).toBe(getQuantitatifModel("piscine_beton"));
    expect(getQuantitatifModel("bureau")).toBe(getQuantitatifModel("bureau_cabinet"));
    expect(getQuantitatifModel("ferme")).toBe(getQuantitatifModel("batiment_agricole"));
    expect(getQuantitatifModel("renovation_interieure")).toBe(
      getQuantitatifModel("renovation_complete"),
    );
    expect(getQuantitatifModel("installations_sanitaires")).toBe(
      getQuantitatifModel("plomberie_complete"),
    );
    expect(getQuantitatifModel("local_commercial")).toBe(
      getQuantitatifModel("boutique_commerciale"),
    );
  });
});
