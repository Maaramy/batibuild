// ============================================================================
// TESTS — PRESTATAIRES RECOMMANDÉS PAR L'IA (moteur pur, sans Convex)
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  PROJECT_TYPE_SPECIALTIES,
  DEFAULT_SPECIALTIES,
  detectSpecialtiesFromText,
  projectTypeSpecialties,
  needsForProject,
  specialtiesToProviderTypes,
  regionRankFor,
  mulberry32,
  seedFromString,
  pickRecommendations,
  buildRecommendationPlan,
  type RecommendationCandidate,
} from "./recommendedProviders";
import { PROJECT_TYPES, resolveProjectType } from "./projectTypes";

describe("Besoins par type de projet", () => {
  it("couvre les 21 types officiels du catalogue", () => {
    for (const t of PROJECT_TYPES) {
      const s = PROJECT_TYPE_SPECIALTIES[t];
      expect(s, `spécialités manquantes pour ${t}`).toBeDefined();
      expect(s.length).toBeGreaterThan(0);
    }
  });

  it("plomberie complète → plomberie, salle de bain, cuisine", () => {
    const s = projectTypeSpecialties("plomberie_complete");
    expect(s).toContain("plomberie");
    expect(s).toContain("salle_de_bain");
    expect(s).toContain("cuisine");
    expect(s).not.toContain("peinture");
  });

  it("villa → piscines et jardins en plus du gros œuvre", () => {
    const s = projectTypeSpecialties("villa");
    expect(s).toContain("villas");
    expect(s).toContain("piscines");
    expect(s).toContain("jardins");
    expect(s).toContain("gros_oeuvre");
  });

  it("peinture intérieure → peinture uniquement (pas de plomberie)", () => {
    const s = projectTypeSpecialties("peinture_interieure");
    expect(s).toContain("peinture");
    expect(s).not.toContain("plomberie");
  });

  it("résout les anciens slugs et les libellés libres", () => {
    // Ancien slug mappé vers un type officiel ayant des spécialités
    expect(resolveProjectType("maison_r_plus_1")).toBe("maison");
    expect(projectTypeSpecialties("maison_r_plus_1")).toEqual(
      PROJECT_TYPE_SPECIALTIES["maison"],
    );
    // Libellé libre
    expect(projectTypeSpecialties("Villa")).toEqual(PROJECT_TYPE_SPECIALTIES["villa"]);
  });

  it("type inconnu → détection par mots-clés du libellé, sinon repli", () => {
    expect(projectTypeSpecialties("rénovation façade")).toContain("peinture");
    expect(projectTypeSpecialties("mur de clôture")).toContain("jardins");
    expect(projectTypeSpecialties("type extraterrestre")).toEqual(DEFAULT_SPECIALTIES);
    expect(projectTypeSpecialties("")).toEqual(DEFAULT_SPECIALTIES);
  });

  it("le DQE enrichit les besoins du type (ne les remplace pas)", () => {
    const needs = needsForProject(
      "peinture_interieure",
      "Fourniture et pose de tuyaux PPR, raccords, chauffe-eau et robinetterie",
    );
    expect(needs.specialties).toContain("peinture"); // du type
    expect(needs.specialties).toContain("plomberie"); // du DQE
    expect(needs.specialties).toContain("salle_de_bain"); // chauffe-eau → sanitaire
  });

  it("détecte les spécialités depuis le texte du DQE", () => {
    const dqe =
      "Lot 1 : gros œuvre — ciment, blocs, ferraillage. " +
      "Lot 2 : carrelage grès cérame 60x60 et faience. " +
      "Lot 3 : électricité — câbles, disjoncteurs, tableaux, prises.";
    const s = detectSpecialtiesFromText(dqe);
    expect(s).toContain("macconnerie");
    expect(s).toContain("ferraillage");
    expect(s).toContain("carrelage");
    expect(s).toContain("electricite");
    expect(s).not.toContain("plomberie");
  });

  it("texte vide → aucune détection", () => {
    expect(detectSpecialtiesFromText("")).toEqual([]);
    expect(detectSpecialtiesFromText("   ")).toEqual([]);
  });

  it("spécialités → corps de métiers correspondants (experts)", () => {
    const trades = specialtiesToProviderTypes(["plomberie", "electricite", "architecte"]);
    expect(trades).toContain("plombier");
    expect(trades).toContain("electricien");
    expect(trades).toContain("architecte");
    expect(trades).not.toContain("peintre");
  });
});

describe("Régions — priorité projet → voisines → Tunisie", () => {
  it("rang 0 pour la région exacte du projet", () => {
    expect(regionRankFor(["beja"], "beja")).toBe(0);
    expect(regionRankFor(["sousse", "monastir"], "sousse")).toBe(0);
  });

  it("rang 1 pour une région voisine", () => {
    expect(regionRankFor(["jendouba"], "beja")).toBe(1);
    expect(regionRankFor(["ariana"], "tunis")).toBe(1);
  });

  it("rang 2 pour le reste de la Tunisie", () => {
    expect(regionRankFor(["sfax"], "beja")).toBe(2);
  });

  it("gère les libellés accentués et les alias", () => {
    expect(regionRankFor(["Béja"], "beja")).toBe(0);
    expect(regionRankFor(["le_kef"], "Le Kef")).toBe(0);
  });

  it("sans région projet ou sans région profil → rang 2", () => {
    expect(regionRankFor(["sfax"], null)).toBe(2);
    expect(regionRankFor([], "sfax")).toBe(2);
  });
});

describe("Sélection intelligente — matching, randomisation, déduplication", () => {
  const candidates: RecommendationCandidate[] = [
    { id: "s1", specialties: ["plomberie"], regions: ["beja"] },
    { id: "s2", specialties: ["plomberie", "salle_de_bain"], regions: ["jendouba"] },
    { id: "s3", specialties: ["plomberie"], regions: ["sfax"] },
    { id: "s4", specialties: ["plomberie"], regions: ["beja"] },
    { id: "s5", specialties: ["peinture"], regions: ["beja"] }, // hors besoin
  ];

  it("ne sélectionne JAMAIS un profil hors besoin", () => {
    const picks = pickRecommendations(
      candidates,
      ["plomberie"],
      "beja",
      seedFromString("a"),
      10,
      new Set(),
    );
    expect(picks.map((p) => p.candidate.id)).not.toContain("s5");
    expect(picks.every((p) => p.matchedSpecialties.includes("plomberie"))).toBe(true);
  });

  it("exclut les profils déjà associés au projet (déduplication)", () => {
    const picks = pickRecommendations(
      candidates,
      ["plomberie"],
      "beja",
      seedFromString("a"),
      10,
      new Set(["s1", "s4"]),
    );
    const ids = picks.map((p) => p.candidate.id);
    expect(ids).not.toContain("s1");
    expect(ids).not.toContain("s4");
    expect(ids).toContain("s2"); // voisin, éligible
    expect(ids).toContain("s3"); // autre région, éligible
  });

  it("priorise la région du projet avant les régions voisines et lointaines", () => {
    const picks = pickRecommendations(
      candidates,
      ["plomberie"],
      "beja",
      seedFromString("b"),
      10,
      new Set(),
    );
    expect(picks[0].regionRank).toBe(0);
    expect(["s2", "s3"]).toContain(picks[picks.length - 1].candidate.id);
  });

  it("la randomisation change l'ordre des ex æquo sans changer l'éligibilité", () => {
    const sameTier = candidates.filter((c) => c.specialties.includes("plomberie"));
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const picks = pickRecommendations(
        sameTier,
        ["plomberie"],
        null, // rang 2 pour tous → ex æquo garantis
        seedFromString(`seed-${i}`),
        10,
        new Set(),
      );
      seen.add(picks.map((p) => p.candidate.id).join(","));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("respecte la limite demandée", () => {
    const picks = pickRecommendations(
      candidates,
      ["plomberie"],
      null,
      42,
      2,
      new Set(),
    );
    expect(picks.length).toBe(2);
  });

  it("le PRNG est déterministe pour une même seed", () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });
});

describe("Plan de recommandations (mutation refresh)", () => {
  const suppliers: RecommendationCandidate[] = [
    { id: "sup1", specialties: ["plomberie"], regions: ["beja"] },
    { id: "sup2", specialties: ["plomberie", "salle_de_bain"], regions: ["sfax"] },
    { id: "sup3", specialties: ["peinture"], regions: ["beja"] },
  ];
  const experts: RecommendationCandidate[] = [
    { id: "exp1", specialties: ["plombier", "plomberie"], regions: ["beja"] },
    { id: "exp2", specialties: ["electricien"], regions: ["beja"] },
  ];

  it("produit fournisseurs ET experts, toujours dans le besoin", () => {
    const plan = buildRecommendationPlan(
      { category: "plomberie_complete", dqeText: "", region: "beja", seed: 7 },
      suppliers,
      experts,
      new Set(),
    );
    const supIds = plan.suppliers.map((p) => p.candidate.id);
    const expIds = plan.experts.map((p) => p.candidate.id);
    expect(supIds).toContain("sup1");
    expect(supIds).not.toContain("sup3");
    expect(expIds).toContain("exp1");
    expect(expIds).not.toContain("exp2");
    expect(plan.needs.specialties).toContain("plomberie");
    expect(plan.needs.trades).toContain("plombier");
  });

  it("n'ajoute aucun nouveau prestataire si tout est déjà associé", () => {
    const plan = buildRecommendationPlan(
      { category: "plomberie_complete", dqeText: "", region: "beja", seed: 99 },
      suppliers,
      experts,
      new Set(["sup1", "sup2", "sup3", "exp1", "exp2"]),
    );
    expect(plan.suppliers).toEqual([]);
    expect(plan.experts).toEqual([]);
  });

  it("complète avec de nouveaux profils quand des associations existent déjà", () => {
    const plan1 = buildRecommendationPlan(
      { category: "plomberie_complete", dqeText: "", region: "beja", seed: 1 },
      suppliers,
      experts,
      new Set(["sup1"]),
    );
    expect(plan1.suppliers.map((p) => p.candidate.id)).not.toContain("sup1");
    expect(plan1.suppliers.map((p) => p.candidate.id)).toContain("sup2");
  });
});
