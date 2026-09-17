// ============================================================================
// Tests du moteur « Intelligence prédictive » Groupe B
// (src/convex/predictiveDomains.ts)
//
// Vérifient :
//   - l'association automatique type de projet → domaines (plomberie,
//     électricité, cuisine, salle de bain, piscine…) ;
//   - la détection des besoins couverts (DQE) / non couverts (prévision IA) ;
//   - le calcul de l'impact financier sur les postes réels ;
//   - les risques, délais et dépendances spécifiques au domaine ;
//   - le repli générique et la lecture seule du DQE.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  DOMAINS,
  TYPE_DOMAINS,
  buildPredictiveAnalysis,
  normText,
  type PredictiveContext,
} from "./predictiveDomains";
import type { DqeLine, DqeLot } from "./dqeEngine";

// ── Aides de fabrication de contexte ────────────────────────────────────────

const line = (
  designation: string,
  total: number,
  extra: Partial<DqeLine> = {},
): DqeLine => ({
  designation,
  unit: "u",
  quantity: 1,
  unitPrice: total,
  total,
  nature: "materiaux",
  ...extra,
});

const lot = (name: string, lines: DqeLine[]): DqeLot => ({
  id: name.toLowerCase().replace(/\s+/g, "_"),
  name,
  nature: "materiaux",
  subtotal: lines.reduce((s, l) => s + l.total, 0),
  percent: 0,
  lines,
});

const baseCtx: PredictiveContext = {
  projectType: "plomberie_complete",
  surface: 120,
  region: "tunis",
  totalCost: 20000,
  dqeLots: [],
  ceItems: [],
};

// ── Bibliothèque de domaines ────────────────────────────────────────────────

describe("bibliothèque de domaines", () => {
  it("couvre les corps d'état demandés (plomberie, électricité, clim, peinture, maçonnerie, étanchéité, toiture, cuisine, salle de bain, piscine, rénovation, extension)", () => {
    for (const key of [
      "plomberie",
      "electricite",
      "climatisation",
      "peinture",
      "maconnerie",
      "etancheite",
      "toiture",
      "cuisine",
      "salle_de_bain",
      "piscine",
      "renovation",
      "extension",
      "construction_complete",
    ]) {
      const d = DOMAINS[key];
      expect(d, key).toBeDefined();
      expect(d.families.length, `${key}.families`).toBeGreaterThan(0);
      expect(d.materials.length, `${key}.materials`).toBeGreaterThan(0);
      expect(d.risks.length, `${key}.risques`).toBeGreaterThan(0);
      expect(d.missingChecks.length, `${key}.missingChecks`).toBeGreaterThan(0);
      expect(d.delays.length, `${key}.delays`).toBeGreaterThan(0);
      expect(
        d.dependencies.before.length + d.dependencies.after.length,
        `${key}.dependencies`,
      ).toBeGreaterThan(0);
    }
  });

  it("associe automatiquement les types de projet à leurs domaines", () => {
    expect(TYPE_DOMAINS["plomberie_complete"]).toEqual(["plomberie"]);
    expect(TYPE_DOMAINS["electricite_complete"]).toEqual(["electricite"]);
    expect(TYPE_DOMAINS["renovation_cuisine"]).toContain("cuisine");
    expect(TYPE_DOMAINS["renovation_salle_de_bain"]).toContain("salle_de_bain");
    expect(TYPE_DOMAINS["piscine"]).toEqual(["piscine"]);
    // Types immobiliers : ensemble des corps d'état
    expect(TYPE_DOMAINS["maison"]).toEqual(["construction_complete"]);
  });

  it("normalise les libellés indépendamment des accents et de la ponctuation", () => {
    expect(normText("Tubes PER Ø16/Ø20")).toBe("tubes per 16 20");
    expect(normText("Essais d'étanchéité")).toBe("essais d etancheite");
  });
});

// ── Plomberie complète (exemple de référence du cahier des charges) ─────────

describe("plomberie_complete — analyse spécifique", () => {
  const dqe = [
    lot("Alimentation en eau", [
      line("Tubes PER Ø16/Ø20", 640),
      line("Collecteur d'alimentation", 250),
      line("Raccords et vannes", 500),
    ]),
    lot("Évacuation", [
      line("Tubes PVC Ø40/Ø50", 175),
      line("Siphons et bouchons de visite", 300),
    ]),
    lot("Sanitaires", [
      line("WC à l'anglaise complet", 560),
      line("Mitigeurs", 600),
    ]),
  ];

  const result = buildPredictiveAnalysis({ ...baseCtx, dqeLots: dqe });

  it("n'analyse que le domaine plomberie", () => {
    expect(result.domainKeys).toEqual(["plomberie"]);
    expect(result.domainLabel).toBe("Plomberie");
  });

  it("identifie les familles couvertes par le DQE et celles manquantes", () => {
    const covered = result.needs.filter((n) => n.covered).map((n) => n.label);
    const uncovered = result.needs.filter((n) => !n.covered).map((n) => n.label);

    expect(covered).toContain("Alimentation eau froide");
    expect(covered).toContain("Évacuation (eaux usées, vannes, ménagères)");
    // Le chauffe-eau n'est pas dans le DQE fourni → prévision IA
    expect(uncovered).toContain("Alimentation eau chaude");
    // Essais absents du DQE → prévision IA
    expect(uncovered.some((l) => l.toLowerCase().includes("essais"))).toBe(true);
  });

  it("distingue données DQE et prédictions IA", () => {
    for (const n of result.needs) {
      if (n.covered) expect(n.source).toBe("dqe");
      else expect(n.source).toBe("ia");
    }
  });

  it("produit des risques et matériaux spécifiques à la plomberie", () => {
    expect(result.risks.some((r) => r.label === "Raccords sous-estimés")).toBe(true);
    expect(result.risks.some((r) => r.label === "Conflit avec les autres réseaux")).toBe(true);
    expect(result.materials.some((m) => m.name.includes("Tubes PPR"))).toBe(true);
    expect(result.materials.some((m) => m.name.includes("Siphons"))).toBe(true);
    // Aucun risque « générique » sans lien
    expect(result.risks.some((r) => r.label.includes("Variation des prix —"))).toBe(false);
  });

  it("estime l'impact financier sur le budget plomberie réel", () => {
    expect(result.financial.length).toBeGreaterThan(0);
    expect(result.totalPotentialImpactTnd).toBeGreaterThan(0);
    // La volatilité ±5 % s'applique au budget détecté dans les postes réels
    const volatility = result.financial.find((f) => f.label.includes("Variation des prix"));
    expect(volatility).toBeDefined();
  });

  it("relie les dépendances à la plomberie", () => {
    expect(result.dependencies.some((d) => d.label.includes("maçonnerie"))).toBe(true);
    expect(result.dependencies.some((d) => d.label.includes("Carrelage"))).toBe(true);
    expect(result.dependencies.every((d) => d.type === "avant" || d.type === "apres")).toBe(true);
  });

  it("signale l'absence d'essais comme prévision et non comme quantité contractuelle", () => {
    const essai = result.needs.find((n) => n.label.toLowerCase().includes("essais"));
    expect(essai).toBeDefined();
    expect(essai!.source).toBe("ia");
    expect(result.disclaimer).toContain("non contractuelles");
  });
});

// ── Électricité complète ────────────────────────────────────────────────────

describe("electricite_complete — analyse spécifique", () => {
  const result = buildPredictiveAnalysis({
    ...baseCtx,
    projectType: "electricite_complete",
    dqeLots: [
      lot("Tableau électrique", [
        line("Tableau électrique général", 420),
        line("Disjoncteurs divisionnaires", 520),
        line("Interrupteurs différentiels 30mA", 270),
      ]),
      lot("Câblage", [
        line("Câble électrique 1.5 mm² (éclairage)", 450),
        line("Gaines ICTA / tubes IRL", 1000),
      ]),
      lot("Mise à la terre", [
        line("Prise de terre (piquet + boucle)", 600),
      ]),
    ],
  });

  it("n'analyse que le domaine électricité", () => {
    expect(result.domainKeys).toEqual(["electricite"]);
  });

  it("détecte la mise à la terre couverte et le parafoudre manquant", () => {
    expect(result.needs.some((n) => n.covered && n.label === "Mise à la terre")).toBe(true);
    expect(
      result.needs.some((n) => !n.covered && n.label === "Parafoudre"),
    ).toBe(true);
  });

  it("produit des risques liés à l'électricité (pas à la plomberie)", () => {
    expect(result.risks.some((r) => r.label.includes("Circuits spécialisés"))).toBe(true);
    expect(result.risks.some((r) => r.label.includes("Raccords"))).toBe(false);
  });
});

// ── Cuisine : multi-domaines ────────────────────────────────────────────────

describe("renovation_cuisine — analyse multi-domaines", () => {
  const result = buildPredictiveAnalysis({
    ...baseCtx,
    projectType: "renovation_cuisine",
    dqeLots: [lot("Meubles", [line("Meubles hauts et bas", 5000)])],
  });

  it("combine cuisine, plomberie et électricité", () => {
    expect(result.domainKeys).toEqual(["cuisine", "plomberie", "electricite"]);
    expect(result.domainLabel).toBe("Cuisine · Plomberie · Électricité");
  });

  it("agrège les dépendances des trois domaines", () => {
    expect(result.dependencies.length).toBeGreaterThan(2);
  });
});

// ── Règles transverses ──────────────────────────────────────────────────────

describe("règles transverses", () => {
  it("repli générique : type inconnu + aucune donnée → analyse basée sur le quantitatif", () => {
    const generic = buildPredictiveAnalysis({
      ...baseCtx,
      projectType: "type_inconnu",
      totalCost: null,
      dqeLots: [],
      ceItems: [{ name: "Ciment CPJ 42.5", quantity: 100, unitPrice: 35, totalPrice: 3500 }],
    });
    expect(generic.domainKeys).toEqual([]);
    expect(generic.materials.length).toBeGreaterThan(0);
    expect(generic.materials[0].name).toContain("Ciment");
    expect(generic.needs.some((n) => !n.covered)).toBe(true);
  });

  it("aucun type du catalogue ne reste sans domaine assigné", () => {
    for (const t of [
      "maison", "villa", "appartement", "studio", "duplex", "immeuble",
      "local_commercial", "bureau", "entrepot", "residence_touristique",
      "projet_neuf", "renovation_complete", "extension_batiment",
      "renovation_cuisine", "renovation_salle_de_bain", "peinture_interieure",
      "piscine", "restaurant", "cafe", "electricite_complete", "plomberie_complete",
    ]) {
      expect(TYPE_DOMAINS[t], t).toBeDefined();
      expect(TYPE_DOMAINS[t]!.length).toBeGreaterThan(0);
    }
  });

  it("lit le DQE sans jamais le modifier (lecture seule)", () => {
    const dqe = [lot("Évacuation", [line("Tubes PVC Ø100/Ø110", 225)])];
    const snapshot = JSON.stringify(dqe);
    buildPredictiveAnalysis({ ...baseCtx, dqeLots: dqe });
    expect(JSON.stringify(dqe)).toBe(snapshot);
  });

  it("calcule un budget de repli au m² quand ni DQE ni coût total ne sont fournis", () => {
    const p = buildPredictiveAnalysis({
      projectType: "plomberie_complete",
      surface: 100,
      totalCost: null,
    });
    // 100 m² × 120 TND/m² = 12 000 TND → volatilité 5 % = 600 TND
    const volatility = p.financial.find((f) => f.label.includes("Variation des prix"));
    expect(volatility?.impactTnd).toBe(600);
  });

  it("expose la traçabilité des données sources", () => {
    const p = buildPredictiveAnalysis({ ...baseCtx, dqeLots: [lot("Sanitaires", [line("WC", 560)])] });
    expect(p.dataSource.dqeLots).toBe(1);
    expect(p.dataSource.dqeLines).toBe(1);
    expect(p.dataSource.totalCost).toBe(20000);
    expect(p.dataSource.generatedAt).toBeGreaterThan(0);
  });

  it("ajoute un risque de repli quand aucune donnée réelle n'est disponible", () => {
    const p = buildPredictiveAnalysis({
      projectType: "plomberie_complete",
      surface: null,
      totalCost: null,
      dqeLots: null,
      ceItems: null,
    });
    expect(p.risks.some((r) => r.label.includes("Analyse basée uniquement"))).toBe(true);
    // Familles + checks du domaine quand même fournis (aucune liste vide)
    expect(p.needs.length).toBeGreaterThan(0);
    expect(p.materials.length).toBeGreaterThan(0);
  });
});
