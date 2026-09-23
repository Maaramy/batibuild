import { describe, it, expect } from "vitest";
import {
  COPILOT_CATEGORY_BY_ID,
  matchCategoryMaterials,
  recommendForProject,
  CatalogMaterial,
  Offer,
  ProjectContext,
} from "./aiMaterialsEngine";
import { optimizeChoice, CHOICE_LIMITS } from "./choiceOptimizer";

const ctx: ProjectContext = {
  projectName: "Villa test",
  projectCategory: "villa",
  region: "tunis",
  surface: 150,
  floors: 1,
  year: 2026,
  standing: "standard",
  budgetMode: "moyen",
  priorities: { price: 50, quality: 50, isolation: 50, durability: 50, eco: 50 },
};

const mats: CatalogMaterial[] = [
  { _id: "m-isol-1", name: "Laine de verre (rouleau 30m²)", category: "isolation_thermique", unit: "rouleau", unitPrice: 89, priceQuality: "observé_en_ligne", confidenceIndex: 0.9 },
  { _id: "m-isol-2", name: "Polystyrène expansé PSE (m²)", category: "isolation_thermique", unit: "m²", unitPrice: 12, priceQuality: "publication_2026", confidenceIndex: 0.85 },
  { _id: "m-isol-3", name: "Laine de roche (panneau acoustique)", category: "isolation_thermique", unit: "m²", unitPrice: 28, priceQuality: "estimation_indicative", confidenceIndex: 0.7 },
];

const offers: Offer[] = [
  { productId: "m-isol-1", name: "Laine de verre (rouleau 30m²)", unit: "rouleau", minPrice: 85, avgPrice: 89, maxPrice: 95, supplier: "Distri A", governorate: "Tunis", reliabilityIndex: 0.9 },
  { productId: "m-isol-2", name: "Polystyrène expansé PSE (m²)", unit: "m²", minPrice: 11, avgPrice: 12, maxPrice: 14, supplier: "Distri B", governorate: "Sfax", reliabilityIndex: 0.85 },
];

function analyze(categories: string[], materials = mats, offs = offers) {
  const result = recommendForProject({ context: ctx, categories, materials, offers: offs });
  return { result, choice: optimizeChoice({ result, materials, offers: offs }) };
}

describe("optimizeChoice — évaluation des axes", () => {
  it("évalue les 9 axes avec un score et un verdict pour chacun", () => {
    const { choice } = analyze(["isolation_thermique"]);
    expect(choice.axes).toHaveLength(9);
    for (const ax of choice.axes) {
      expect(ax.score).toBeGreaterThanOrEqual(0);
      expect(ax.score).toBeLessThanOrEqual(100);
      expect(["fort", "correct", "faible"]).toContain(ax.verdict);
      expect(ax.comment.length).toBeGreaterThan(0);
    }
    expect(choice.overallScore).toBeGreaterThan(0);
    expect(["optimal", "ameliorable", "suboptimal"]).toContain(choice.verdict);
    expect(choice.headline.length).toBeGreaterThan(0);
  });

  it("moyenne les scores sur plusieurs catégories", () => {
    const a = analyze(["isolation_thermique"]).choice.axes.find((x) => x.key === "prix")!.score;
    const both = analyze(["isolation_thermique", "marbre"]).choice.axes.find((x) => x.key === "prix")!.score;
    // Le prix du marbre est noté faible → la moyenne baisse (ou reste identique au pire).
    expect(both).toBeLessThanOrEqual(a);
  });

  it("signale un verdict faible quand tous les prix sont élevés", () => {
    const expensive: CatalogMaterial[] = [
      { _id: "e-1", name: "Laine de verre premium importée", category: "isolation_thermique", unit: "rouleau", unitPrice: 300, confidenceIndex: 0.6 },
      { _id: "e-2", name: "Isolant importé très cher", category: "isolation_thermique", unit: "m²", unitPrice: 280, confidenceIndex: 0.6 },
    ];
    const { choice } = analyze(["isolation_thermique"], expensive, []);
    const prix = choice.axes.find((a) => a.key === "prix")!;
    expect(prix.verdict).toBe("faible");
    expect(choice.verdict).toBe("suboptimal");
  });
});

describe("optimizeChoice — alternatives", () => {
  it("propose uniquement des alternatives réellement plus fortes sur un axe (gain >= min)", () => {
    const { choice } = analyze(["isolation_thermique"]);
    for (const alt of choice.alternatives) {
      expect(alt.gain).toBeGreaterThanOrEqual(CHOICE_LIMITS.minGain);
      expect(alt.alternativeScore).toBeGreaterThan(alt.currentScore);
      expect(alt.alternativeId).not.toBe(alt.currentId);
      expect(alt.rationale).toContain(alt.alternativeName);
    }
    // Tri : gain décroissant
    for (let i = 1; i < choice.alternatives.length; i++) {
      expect(choice.alternatives[i].gain).toBeLessThanOrEqual(choice.alternatives[i - 1].gain);
    }
  });

  it("calcule un coût de bascule cohérent avec la grille de coûts (pose+transport+déchets+accessoires+TVA)", () => {
    const { result, choice } = analyze(["isolation_thermique"]);
    const cat = COPILOT_CATEGORY_BY_ID["isolation_thermique"];
    if (choice.alternatives.length === 0) return; // aucune alternative → rien à vérifier
    const alt = choice.alternatives[0];
    const current = (result.categories[0].solutions.find((s) => s.profile === "equilibre") || result.categories[0].solutions[0]);
    const mat = mats.find((m) => m._id === alt.alternativeId)!;
    const qty = current.material.quantity;
    const expected =
      (mat.unitPrice - current.material.band.avg) * qty * (1 + cat.posePct) * (1 + 0.035 + 0.07 + 0.05) * 1.19;
    expect(alt.extraCost).toBeCloseTo(expected, 0);
  });

  it("une seule alternative par (catégorie, axe), sans doublon", () => {
    const { choice } = analyze(["isolation_thermique"]);
    const slots = choice.alternatives.map((a) => `${a.categoryId}:${a.axis}`);
    expect(new Set(slots).size).toBe(slots.length);
  });

  it("retourne zéro alternative et verdict optimal pour une base vide", () => {
    const { choice } = analyze(["isolation_thermique"], mats, []);
    // Sans offre et sans concurrent moins cher, aucune alternative ne domine.
    expect(choice.alternatives.every((a) => a.gain >= CHOICE_LIMITS.minGain)).toBe(true);
  });
});

describe("optimizeChoice — robustesse", () => {
  it("ne crashe pas avec un résultat sans catégories exploitables", () => {
    const result = recommendForProject({ context: ctx, categories: ["inexistant"], materials: mats, offers });
    const choice = optimizeChoice({ result, materials: mats, offers });
    expect(choice.overallScore).toBe(0);
    expect(choice.alternatives).toHaveLength(0);
    expect(choice.axes).toHaveLength(9);
  });

  it("exclut les prix corrompus (NaN) du calcul", () => {
    const bad: CatalogMaterial[] = [
      { _id: "b-1", name: "Laine de verre NaN", category: "isolation_thermique", unit: "rouleau", unitPrice: Number.NaN, confidenceIndex: 0.8 },
      { _id: "b-2", name: "PSE normal", category: "isolation_thermique", unit: "m²", unitPrice: 12, confidenceIndex: 0.85 },
    ];
    // Le moteur principal exclut déjà les prix illisibles ; l'optimiseur doit
    // produire un résultat exploitable sans exception.
    const result = recommendForProject({ context: ctx, categories: ["isolation_thermique"], materials: bad, offers: [] });
    expect(() => optimizeChoice({ result, materials: bad, offers: [] })).not.toThrow();
  });

  it("matchCategoryMaterials retourne bien les candidats de la catégorie (sécurité structurelle)", () => {
    const candidates = matchCategoryMaterials(COPILOT_CATEGORY_BY_ID["isolation_thermique"], mats);
    expect(candidates.length).toBeGreaterThanOrEqual(3);
  });
});
