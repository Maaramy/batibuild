import { describe, it, expect } from "vitest";
import {
  AI_MATERIALS_STATUS_LABEL,
  buildAiMaterialsHistoryEntry,
  countMaterialsAnalyzed,
  filterAiMaterialsHistory,
  normalizeSearchText,
  type AiMaterialsHistoryEntry,
} from "./aiMaterialsHistory";

// Analyse enregistrée telle que la renvoie `api.aiMaterials.getCopilotAnalyses`.
const doc = {
  _id: "analysis_1",
  createdAt: 1757664000000, // 12 septembre 2026
  input: {
    context: {
      projectName: "Villa Moderne",
      region: "nabeul",
      standing: "premium",
      surface: 250,
    },
    categories: ["ciment", "acier"],
  },
  results: {
    recommend: {
      categories: [
        { categoryId: "ciment", candidatesCount: 40 },
        { categoryId: "acier", candidatesCount: 42 },
      ],
      cost: { total: 128400 },
    },
  },
};

// Analyse manuelle (sans projet) et sans recommandation exploitable.
const legacyDoc = {
  _id: "analysis_old",
  createdAt: 1700000000000,
  input: { context: { surface: 120 } },
  results: {},
};

describe("countMaterialsAnalyzed — même formule que le rapport PDF", () => {
  it("additionne les candidatesCount des catégories", () => {
    expect(countMaterialsAnalyzed(doc.results.recommend.categories)).toBe(82);
  });

  it("renvoie null quand la donnée est absente (jamais inventée)", () => {
    expect(countMaterialsAnalyzed(undefined)).toBeNull();
    expect(countMaterialsAnalyzed([])).toBeNull();
    expect(countMaterialsAnalyzed([{ label: "ciment" }])).toBeNull();
  });
});

describe("buildAiMaterialsHistoryEntry", () => {
  it("extrait projet, date, compteurs, coût et contexte réel", () => {
    const entry = buildAiMaterialsHistoryEntry(doc);
    expect(entry.id).toBe("analysis_1");
    expect(entry.projectName).toBe("Villa Moderne");
    expect(entry.createdAt).toBe(1757664000000);
    expect(entry.materialCount).toBe(82);
    expect(entry.categoryCount).toBe(2);
    expect(entry.totalCost).toBe(128400);
    expect(entry.surface).toBe(250);
    expect(entry.region).toBe("nabeul");
    expect(entry.standing).toBe("premium");
    expect(entry.hasRecommendation).toBe(true);
    expect(entry.status).toBe("completed");
    expect(AI_MATERIALS_STATUS_LABEL[entry.status]).toBe("Terminée");
  });

  it("marque « En cours » l'analyse actuellement chargée (état savedId existant)", () => {
    const entry = buildAiMaterialsHistoryEntry(doc, "analysis_1");
    expect(entry.status).toBe("running");
    expect(AI_MATERIALS_STATUS_LABEL[entry.status]).toBe("En cours");
    // Une autre analyse n'est pas affectée.
    expect(buildAiMaterialsHistoryEntry({ ...doc, _id: "x" }, "analysis_1").status).toBe("completed");
  });

  it("classe en « Erreur » une analyse sans recommandation exploitable", () => {
    const entry = buildAiMaterialsHistoryEntry(legacyDoc);
    expect(entry.status).toBe("error");
    expect(entry.hasRecommendation).toBe(false);
    expect(entry.projectName).toBe("Analyse manuelle");
    expect(entry.materialCount).toBeNull();
    expect(entry.totalCost).toBeNull();
    expect(entry.surface).toBe(120);
    expect(entry.region).toBeNull();
    expect(entry.standing).toBeNull();
  });

  it("ne casse jamais sur un document incomplet", () => {
    const entry = buildAiMaterialsHistoryEntry(null);
    expect(entry.projectName).toBe("Analyse manuelle");
    expect(entry.status).toBe("error");
    expect(entry.createdAt).toBe(0);
    expect(entry.categoryCount).toBe(0);
  });

  it("conserve l'identifiant et la date tels quels (aucune transformation)", () => {
    const entry = buildAiMaterialsHistoryEntry(doc);
    expect(entry.id).toBe(doc._id);
    expect(entry.createdAt).toBe(doc.createdAt);
  });
});

describe("filterAiMaterialsHistory — recherche / statut, purement côté interface", () => {
  const entries: AiMaterialsHistoryEntry[] = [
    buildAiMaterialsHistoryEntry(doc),
    buildAiMaterialsHistoryEntry(doc, "analysis_1"),
    buildAiMaterialsHistoryEntry(legacyDoc),
  ];

  it("sans filtre, renvoie toutes les analyses dans l'ordre reçu", () => {
    expect(filterAiMaterialsHistory(entries).map((e) => e.id)).toEqual([
      "analysis_1",
      "analysis_1",
      "analysis_old",
    ]);
    expect(filterAiMaterialsHistory(entries, { status: "all" })).toHaveLength(3);
  });

  it("filtre par statut", () => {
    expect(filterAiMaterialsHistory(entries, { status: "running" })).toHaveLength(1);
    expect(filterAiMaterialsHistory(entries, { status: "error" }).map((e) => e.id)).toEqual([
      "analysis_old",
    ]);
    expect(filterAiMaterialsHistory(entries, { status: "completed" })).toHaveLength(1);
  });

  it("recherche sans tenir compte de la casse ni des accents", () => {
    expect(filterAiMaterialsHistory(entries, { query: "villa" })).toHaveLength(2);
    expect(filterAiMaterialsHistory(entries, { query: "VILLA" })).toHaveLength(2);
    expect(filterAiMaterialsHistory(entries, { query: "  moderne " })).toHaveLength(2);
    expect(filterAiMaterialsHistory(entries, { query: "nabeul" })).toHaveLength(2);
    expect(filterAiMaterialsHistory(entries, { query: "inexistant" })).toHaveLength(0);
    expect(filterAiMaterialsHistory(entries, { query: "manuelle" }).map((e) => e.id)).toEqual([
      "analysis_old",
    ]);
  });

  it("combine recherche et statut", () => {
    expect(filterAiMaterialsHistory(entries, { query: "villa", status: "running" })).toHaveLength(1);
    expect(filterAiMaterialsHistory(entries, { query: "villa", status: "error" })).toHaveLength(0);
  });

  it("normalise correctement les accents", () => {
    expect(normalizeSearchText("Économique")).toBe("economique");
    expect(normalizeSearchText("  Équilibrée ")).toBe("equilibree");
  });
});
