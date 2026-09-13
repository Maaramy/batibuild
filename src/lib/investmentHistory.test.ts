import { describe, it, expect } from "vitest";
import { buildInvestmentHistoryEntry } from "./investmentHistory";
import { ANALYSIS_STATUS_LABEL } from "./analysisHistory";

// Analyse enregistrée telle que la renvoie `api.investments.listAnalyses`.
const doc = {
  _id: "inv_1",
  createdAt: 1757664000000, // 12 septembre 2026
  isFavorite: true,
  input: {
    name: "Villa Moderne",
    investmentType: "villa",
    region: "nabeul",
    area: 250,
    horizonYears: 10,
  },
  results: {
    indicators: {
      totalCost: 480000,
      netYieldPct: 6.2,
      monthlyCashflow: 1250,
    },
    score: { total: 77.6 },
  },
};

// Analyse incomplète : aucun indicateur enregistré.
const brokenDoc = {
  _id: "inv_old",
  createdAt: 1700000000000,
  input: { investmentType: "studio" },
  results: {},
};

describe("buildInvestmentHistoryEntry", () => {
  it("extrait projet, date, contexte et indicateurs réels", () => {
    const entry = buildInvestmentHistoryEntry(doc);
    expect(entry.id).toBe("inv_1");
    expect(entry.name).toBe("Villa Moderne");
    expect(entry.createdAt).toBe(1757664000000);
    expect(entry.investmentType).toBe("villa");
    expect(entry.region).toBe("nabeul");
    expect(entry.area).toBe(250);
    expect(entry.horizonYears).toBe(10);
    expect(entry.totalCost).toBe(480000);
    expect(entry.netYieldPct).toBe(6.2);
    expect(entry.monthlyCashflow).toBe(1250);
    expect(entry.isFavorite).toBe(true);
    expect(entry.hasResults).toBe(true);
    expect(entry.status).toBe("completed");
    expect(ANALYSIS_STATUS_LABEL[entry.status]).toBe("Terminée");
  });

  it("arrondit seulement le score pour l'affichage (77.6 → 78)", () => {
    expect(buildInvestmentHistoryEntry(doc).score).toBe(78);
  });

  it("classe en « Erreur » une analyse sans indicateurs exploitables", () => {
    const entry = buildInvestmentHistoryEntry(brokenDoc);
    expect(entry.status).toBe("error");
    expect(entry.hasResults).toBe(false);
    expect(entry.totalCost).toBeNull();
    expect(entry.netYieldPct).toBeNull();
    expect(entry.monthlyCashflow).toBeNull();
    expect(entry.score).toBeNull();
    expect(entry.investmentType).toBe("studio");
    expect(entry.area).toBeNull();
    expect(entry.horizonYears).toBeNull();
    expect(entry.isFavorite).toBe(false);
  });

  it("ne casse jamais sur un document incomplet", () => {
    const entry = buildInvestmentHistoryEntry(null);
    expect(entry.id).toBe("");
    expect(entry.name).toBe("");
    expect(entry.createdAt).toBe(0);
    expect(entry.status).toBe("error");
    expect(entry.investmentType).toBeNull();
    expect(entry.region).toBeNull();
  });

  it("conserve l'identifiant et la date tels quels (aucune transformation)", () => {
    const entry = buildInvestmentHistoryEntry(doc);
    expect(entry.id).toBe(doc._id);
    expect(entry.createdAt).toBe(doc.createdAt);
  });
});
