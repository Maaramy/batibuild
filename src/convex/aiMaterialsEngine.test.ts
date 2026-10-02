import { describe, it, expect } from "vitest";
import {
  COPILOT_CATEGORY_BY_ID,
  matchCategoryMaterials,
  estimateQuantity,
  recommendForProject,
  optimizeBudget,
  improvePerformance,
  compareMaterials,
  fallbackChatAnswer,
  buildAssistantContext,
  buildTopArticles,
  TOP_ARTICLES_LIMIT,
  CatalogMaterial,
  Offer,
  ProjectContext,
} from "./aiMaterialsEngine";

// ── Jeu de données minimal (prix et offres fictifs, structures réalistes) ──
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
  { _id: "m-isol-1", name: "Laine de verre (rouleau 30m²)", category: "isolation_thermique", subcategory: "Isolation thermique", unit: "rouleau", unitPrice: 89, priceQuality: "observé_en_ligne", confidenceIndex: 0.9 },
  { _id: "m-isol-2", name: "Polystyrène expansé PSE (m²)", category: "isolation_thermique", subcategory: "Isolation thermique", unit: "m²", unitPrice: 12, priceQuality: "publication_2026", confidenceIndex: 0.85 },
  { _id: "m-isol-3", name: "Laine de roche (panneau acoustique)", category: "isolation_thermique", subcategory: "Isolation thermique", unit: "m²", unitPrice: 28, priceQuality: "estimation_indicative", confidenceIndex: 0.7 },
  { _id: "m-cim-1", name: "Ciment CPJ 42.5 (sac 50kg)", category: "liants_ciments_mortiers", unit: "sac", unitPrice: 16.5 },
  { _id: "m-car-1", name: "Carrelage grès cérame 60x60", category: "revetements_sols_murs", unit: "m²", unitPrice: 26 },
  { _id: "m-car-2", name: "Marbre importé (m²)", category: "revetements_sols_murs", unit: "m²", unitPrice: 120 },
  { _id: "m-car-3", name: "Carrelage travertin clair 60x60", category: "revetements_sols_murs", unit: "m²", unitPrice: 45 },
];

const offers: Offer[] = [
  { productId: "m-isol-1", name: "Laine de verre (rouleau 30m²)", unit: "rouleau", minPrice: 85, avgPrice: 89, maxPrice: 95, supplier: "Distri A", governorate: "Tunis", reliabilityIndex: 0.9 },
  { productId: "m-isol-2", name: "Polystyrène expansé PSE (m²)", unit: "m²", minPrice: 11, avgPrice: 12, maxPrice: 14, supplier: "Distri B", governorate: "Sfax", reliabilityIndex: 0.85 },
  { productId: "m-car-1", name: "Carrelage grès cérame 60x60", unit: "m²", minPrice: 24, avgPrice: 26, maxPrice: 30, supplier: "SOPAL", governorate: "Nabeul", reliabilityIndex: 0.88 },
];

describe("matchCategoryMaterials", () => {
  it("correspond par catégorie officielle et par mots-clés", () => {
    const isol = matchCategoryMaterials(COPILOT_CATEGORY_BY_ID["isolation_thermique"], mats);
    expect(isol.map((m) => m._id)).toContain("m-isol-1");
    expect(isol.map((m) => m._id)).toContain("m-isol-2");
    const cim = matchCategoryMaterials(COPILOT_CATEGORY_BY_ID["ciment"], mats);
    expect(cim.map((m) => m._id)).toContain("m-cim-1");
    const marbre = matchCategoryMaterials(COPILOT_CATEGORY_BY_ID["marbre"], mats);
    expect(marbre.map((m) => m._id)).toContain("m-car-2");
  });

  it("ne renvoie rien pour une catégorie absente du jeu de données", () => {
    const res = matchCategoryMaterials(COPILOT_CATEGORY_BY_ID["panneaux_solaires"], mats);
    expect(res).toHaveLength(0);
  });
});

describe("buildTopArticles", () => {
  const offersByProduct = new Map<string, Offer[]>([
    ["m-isol-1", offers.filter((o) => o.productId === "m-isol-1")],
    ["m-isol-2", offers.filter((o) => o.productId === "m-isol-2")],
  ]);
  const cat = COPILOT_CATEGORY_BY_ID["isolation_thermique"];
  const candidates = matchCategoryMaterials(cat, mats);
  const bands = candidates.map((m) => ({ avg: m.unitPrice }));
  const catMin = Math.min(...bands.map((b) => b.avg));
  const catMax = Math.max(...bands.map((b) => b.avg));

  it("retourne au plus 5 articles classés par score décroissant", () => {
    const top = buildTopArticles({ cat, candidates, offersByProduct, ctx, catMinPrice: catMin, catMaxPrice: catMax });
    expect(top.length).toBeLessThanOrEqual(TOP_ARTICLES_LIMIT);
    expect(top.length).toBeGreaterThan(0);
    for (let i = 1; i < top.length; i++) {
      expect(top[i].score).toBeLessThanOrEqual(top[i - 1].score);
    }
    expect(top[0].rank).toBe(1);
  });

  it("utilise le prix fournisseur quand disponible, sinon le prix catalogue (jamais inventé)", () => {
    const top = buildTopArticles({ cat, candidates, offersByProduct, ctx, catMinPrice: catMin, catMaxPrice: catMax });
    const withOffers = top.find((a) => a.id === "m-isol-1");
    const withoutOffers = top.find((a) => a.id === "m-isol-3");
    expect(withOffers).toBeDefined();
    expect(withOffers?.priceSource).toBe("Fournisseur");
    expect(withOffers?.unitPrice).toBeCloseTo(89, 2); // moyenne des offres (une seule offre → avgPrice)
    if (withoutOffers) {
      expect(withoutOffers.priceSource).toBe("Marché 2026");
      expect(withoutOffers.unitPrice).toBeCloseTo(28, 2); // prix catalogue exact
    }
  });

  it("calcule le TTC selon la formule : unitaire × quantité × (1 + TVA)", () => {
    const qty = estimateQuantity("isolation_thermique", ctx).quantity;
    const top = buildTopArticles({ cat, candidates, offersByProduct, ctx, catMinPrice: catMin, catMaxPrice: catMax });
    for (const a of top) {
      expect(a.totalTTC).toBeCloseTo(a.unitPrice * qty * 1.19, 0);
      expect(a.quantity).toBe(qty);
      expect(a.quantityUnit).toBe("m²");
    }
  });

  it("renvoie un tableau vide quand la quantité estimée est nulle (ex : piscine hors villa)", () => {
    const piscine = COPILOT_CATEGORY_BY_ID["piscine"];
    const top = buildTopArticles({
      cat: piscine,
      candidates: matchCategoryMaterials(piscine, mats),
      offersByProduct: new Map(),
      ctx: { ...ctx, projectCategory: "maison" },
      catMinPrice: 100,
      catMaxPrice: 200,
    });
    expect(top).toHaveLength(0);
  });

  it("inclut les fournisseurs recensés triés par prix croissant", () => {
    const top = buildTopArticles({ cat, candidates, offersByProduct, ctx, catMinPrice: catMin, catMaxPrice: catMax });
    const a = top.find((x) => x.id === "m-isol-1");
    expect(a?.suppliers.length).toBeGreaterThan(0);
    expect(a?.suppliers[0].name).toBe("Distri A");
  });
});

describe("estimateQuantity", () => {
  it("estime les quantités selon la surface construite", () => {
    const q = estimateQuantity("isolation_thermique", ctx);
    expect(q.quantity).toBeCloseTo(150 * 1.15, 5);
    expect(q.unitLabel).toBe("m²");
  });

  it("multiplie par le nombre de niveaux", () => {
    const q = estimateQuantity("carrelage", { ...ctx, floors: 2 });
    expect(q.quantity).toBeCloseTo(150 * 2 * 0.85, 5);
  });

  it("piscine : quantité 0 sauf projet concerné", () => {
    expect(estimateQuantity("piscine", { ...ctx, projectCategory: "maison" }).quantity).toBe(0);
    expect(estimateQuantity("piscine", { ...ctx, projectCategory: "villa" }).quantity).toBe(1);
  });
});

describe("recommendForProject", () => {
  it("n'ajoute aucune marge d'imprévus au coût (total = coûts réels + TVA)", () => {
    const res = recommendForProject({
      context: ctx,
      categories: ["isolation_thermique", "carrelage"],
      materials: mats,
      offers,
    });
    // Plus aucun poste « imprévus » dans le récapitulatif de coût
    expect(Object.keys(res.cost)).not.toContain("contingency");
    const subtotal =
      res.cost.materials + res.cost.pose + res.cost.transport + res.cost.waste + res.cost.accessories;
    // Le total est exactement le sous-total réel + TVA 19 % (± arrondi des lignes)
    expect(Math.abs(res.cost.total - subtotal * (1 + 0.19))).toBeLessThan(subtotal * 0.01);
    // Aucune solution ne porte de champ d'imprévus
    for (const cat of res.categories) {
      for (const s of cat.solutions) {
        expect(Object.keys(s.material)).not.toContain("contingencyCost");
      }
    }
  });

  it("produit 3 solutions distinctes par catégorie avec scores /100 et coût total", () => {
    const res = recommendForProject({
      context: ctx,
      categories: ["isolation_thermique", "carrelage"],
      materials: mats,
      offers,
    });
    expect(res.categories).toHaveLength(2);
    for (const cat of res.categories) {
      expect(cat.solutions).toHaveLength(3);
      const ids = new Set(cat.solutions.map((s) => s.material.id));
      expect(ids.size).toBe(3); // 3 matériaux distincts
      for (const s of cat.solutions) {
        expect(s.scores.noteGlobale).toBeGreaterThanOrEqual(0);
        expect(s.scores.noteGlobale).toBeLessThanOrEqual(100);
        expect(s.material.totalCost).toBeGreaterThan(0);
      }
    }
    expect(res.cost.total).toBeGreaterThan(0);
    expect(res.cost.materials).toBeGreaterThan(0);
    expect(res.cost.pose).toBeGreaterThan(0);
    expect(res.cost.tva).toBeGreaterThan(0);
    expect(res.cost.min).toBeLessThanOrEqual(res.cost.total);
    expect(res.cost.max).toBeGreaterThanOrEqual(res.cost.total);
    expect(res.recommendation.materialName).toBeTruthy();
    expect(res.recommendation.explanation).toContain("marché tunisien");
    // Meilleur fournisseur renseigné pour les catégories disposant d'offres
    for (const cat of res.categories) {
      const hasOffers = cat.solutions.some((s) => s.suppliers.length > 0);
      if (hasOffers) {
        expect(cat.bestSupplier).not.toBeNull();
        expect(cat.bestSupplier!.name.length).toBeGreaterThan(0);
        expect(cat.bestSupplier!.price).toBeGreaterThan(0);
      } else {
        expect(cat.bestSupplier).toBeNull();
      }
    }
  });

  it("bestSupplier : null sans offre, et = offre la moins chère de la solution recommandée sinon", () => {
    // Catégorie sans offre → pas de fournisseur
    const noOffers = recommendForProject({
      context: ctx,
      categories: ["ciment"],
      materials: mats,
      offers: [],
    });
    const cim = noOffers.categories.find((c) => c.categoryId === "ciment")!;
    expect(cim.bestSupplier).toBeNull();

    // Avec offres → le meilleur fournisseur est l'offre la moins chère (fiabilité max en cas d'égalité)
    const withOffers = recommendForProject({
      context: ctx,
      categories: ["isolation_thermique"],
      materials: mats,
      offers,
    });
    const isol = withOffers.categories.find((c) => c.categoryId === "isolation_thermique")!;
    expect(isol.bestSupplier).not.toBeNull();
    if (isol.bestSupplier) {
      const allPrices = isol.solutions.flatMap((s) => s.suppliers.map((x) => x.price));
      expect(allPrices.length).toBeGreaterThan(0);
      expect(isol.bestSupplier.price).toBe(Math.min(...allPrices));
      expect(isol.bestSupplier.name.length).toBeGreaterThan(0);
    }
  });

  it("la solution économique est moins chère que la premium, et les deux sont distinctes", () => {
    const res = recommendForProject({
      context: ctx,
      categories: ["carrelage"],
      materials: mats,
      offers,
    });
    const carrelage = res.categories.find((c) => c.categoryId === "carrelage")!;
    const eco = carrelage.solutions.find((s) => s.profile === "economique")!;
    const prem = carrelage.solutions.find((s) => s.profile === "premium")!;
    expect(eco.material.band.avg).toBeLessThanOrEqual(prem.material.band.avg);
    expect(eco.material.id).not.toBe(prem.material.id);
    // Chaque solution porte un badge pertinent
    expect(carrelage.bestValue).toBeTruthy();
  });

  it("signale les catégories sans données au lieu d'inventer", () => {
    const res = recommendForProject({
      context: ctx,
      categories: ["panneaux_solaires", "isolation_thermique"],
      materials: mats,
      offers,
    });
    expect(res.categories.map((c) => c.categoryId)).not.toContain("panneaux_solaires");
    expect(res.missingData.some((m) => m.includes("panneaux_solaires") || m.includes("Panneaux solaires"))).toBe(true);
  });

  it("le budget personnalisé plafonne les matériaux trop chers sans inventer de prix", () => {
    const res = recommendForProject({
      context: { ...ctx, budgetMode: "personnalise", budgetAmount: 3000 },
      categories: ["carrelage", "marbre"],
      materials: mats,
      offers,
    });
    expect(res.categories.length).toBeGreaterThan(0);
    expect(res.cost.total).toBeGreaterThan(0);
    // Budget large → la solution premium peut dépasser l'économique en prix
    const big = recommendForProject({
      context: { ...ctx, budgetMode: "personnalise", budgetAmount: 500000 },
      categories: ["carrelage"],
      materials: mats,
      offers,
    });
    const cat = big.categories.find((c) => c.categoryId === "carrelage")!;
    const eco = cat.solutions.find((s) => s.profile === "economique")!;
    const prem = cat.solutions.find((s) => s.profile === "premium")!;
    expect(prem.material.band.avg).toBeGreaterThanOrEqual(eco.material.band.avg);
  });
});

describe("optimizeBudget", () => {
  it("propose des substitutions et calcule l'économie", () => {
    const res = recommendForProject({
      context: ctx,
      categories: ["revetements_sols_murs", "isolation_thermique"],
      materials: mats,
      offers,
    });
    const opt = optimizeBudget({ result: res, budgetAmount: 100000 });
    expect(opt.originalTotal).toBe(res.cost.total);
    expect(opt.optimizedTotal).toBeLessThanOrEqual(opt.originalTotal);
    expect(opt.savings).toBeGreaterThanOrEqual(0);
    expect(opt.savingsPct).toBeGreaterThanOrEqual(0);
    for (const c of opt.changes) {
      expect(c.saving).toBeGreaterThan(0);
      expect(c.from).not.toBe(c.to);
    }
  });
});

describe("improvePerformance", () => {
  it("suggère des améliorations thermiques avec hypothèses explicites", () => {
    // Jeu dédié : le choix « équilibré » (plâtre, pas cher) n'est PAS le
    // meilleur performer → l'IA propose l'upgrade vers la laine de roche.
    const perfMats: CatalogMaterial[] = [
      { _id: "p-1", name: "Plâtre en plaques BA13 (m²)", category: "isolation_thermique", unit: "m²", unitPrice: 9, priceQuality: "publication_2026", confidenceIndex: 0.8 },
      { _id: "p-2", name: "Laine de verre (rouleau 30m²)", category: "isolation_thermique", unit: "rouleau", unitPrice: 89, priceQuality: "observé_en_ligne", confidenceIndex: 0.9 },
      { _id: "p-3", name: "Laine de roche (panneau acoustique)", category: "isolation_thermique", unit: "m²", unitPrice: 55, priceQuality: "observé_en_ligne", confidenceIndex: 0.95 },
    ];
    const perfOffers: Offer[] = [
      { productId: "p-2", name: "Laine de verre (rouleau 30m²)", unit: "rouleau", minPrice: 85, avgPrice: 89, maxPrice: 95, supplier: "Distri A", governorate: "Tunis", reliabilityIndex: 0.9 },
      { productId: "p-3", name: "Laine de roche (panneau acoustique)", unit: "m²", minPrice: 52, avgPrice: 55, maxPrice: 60, supplier: "Distri C", governorate: "Sousse", reliabilityIndex: 0.95 },
    ];
    const res = recommendForProject({
      context: ctx,
      categories: ["isolation_thermique"],
      materials: perfMats,
      offers: perfOffers,
    });
    const perf = improvePerformance({ result: res });
    expect(perf.improvements.length).toBeGreaterThan(0);
    const imp = perf.improvements[0];
    expect(imp.from).not.toBe(imp.to);
    expect(imp.to).toContain("roche");
    expect(perf.assumptions.length).toBeGreaterThan(0);
    expect(perf.note).toContain("Hypothèses");
  });
});

describe("compareMaterials", () => {
  it("compare jusqu'à 5 matériaux et émet une recommandation", () => {
    const comp = compareMaterials({
      ids: ["m-isol-1", "m-isol-2", "m-car-1"],
      materials: mats,
      offers,
    });
    expect(comp.materials).toHaveLength(3);
    for (const m of comp.materials) {
      expect(m.scores.noteGlobale).toBeGreaterThan(0);
      expect(m.technical.length).toBeGreaterThan(0);
      expect(m.financial.length).toBeGreaterThan(0);
    }
    expect(comp.recommendation.id).toBeTruthy();
  });

  it("refuse au-delà de 5 matériaux", () => {
    const many = [...mats, { _id: "x1", name: "X1", category: "divers", unit: "u", unitPrice: 1 } as CatalogMaterial];
    const comp = compareMaterials({ ids: many.map((m) => m._id), materials: many, offers: [] });
    expect(comp.materials.length).toBeLessThanOrEqual(5);
  });
});

describe("fallbackChatAnswer & contexte", () => {
  it("répond de façon structurée aux questions courantes", () => {
    expect(fallbackChatAnswer("Quel isolant choisir pour une villa à Tunis ?", {})).toContain("XPS");
    expect(fallbackChatAnswer("Aluminium ou PVC pour mes fenêtres ?", {})).toContain("PVC");
    expect(fallbackChatAnswer("quel matériau avec un budget de 50 000 DT ?", {})).toContain("Optimiser");
  });

  it("construit un contexte projet pour le chat", () => {
    const text = buildAssistantContext(null, { ...ctx, region: "ariana" });
    expect(text).toContain("Villa test");
    expect(text).toContain("ariana");
  });
});