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
  pickLogoField,
  normalizeLogoValue,
  EXPERT_PROFESSION_LABELS,
  EXPERT_CATEGORIES,
  EXPERT_OTHER_CATEGORY,
  expertCategoryOf,
  expertProviderTypes,
  complementaryTypes,
  buildExpertRecommendations,
  expertAvailabilityLabel,
  isCompleteExpertProfile,
  PROVIDER_TYPE_FAMILY,
  type RecommendationCandidate,
  type ExpertCandidate,
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

describe("Images des prestataires — source et normalisation", () => {
  it("lit le champ officiel `logo` en priorité", () => {
    expect(pickLogoField({ logo: "https://x.example/l.png" })).toBe(
      "https://x.example/l.png",
    );
    expect(
      pickLogoField({
        logo: "https://a.example/l.png",
        logoUrl: "https://b.example/l.png",
        image: "https://c.example/l.png",
      }),
    ).toBe("https://a.example/l.png");
  });

  it("replie sur les champs compatibles des anciennes structures", () => {
    expect(pickLogoField({ logoUrl: "https://b.example/l.png" })).toBe(
      "https://b.example/l.png",
    );
    expect(pickLogoField({ companyLogo: "https://c.example/l.png" })).toBe(
      "https://c.example/l.png",
    );
    expect(pickLogoField({ image: "https://d.example/l.png" })).toBe(
      "https://d.example/l.png",
    );
  });

  it("aucun champ image → undefined (fallback volontaire côté UI)", () => {
    expect(pickLogoField({})).toBeUndefined();
    expect(pickLogoField({ logo: "   " })).toBeUndefined();
    expect(pickLogoField(null)).toBeUndefined();
    expect(pickLogoField(undefined)).toBeUndefined();
  });

  it("normalise : URL directe conservée", () => {
    expect(normalizeLogoValue("https://cdn.example/logo.png")).toBe(
      "https://cdn.example/logo.png",
    );
    expect(normalizeLogoValue(" /api/storage/abc123 ")).toBe(
      "/api/storage/abc123",
    );
  });

  it("normalise : valeurs non affichables écartées", () => {
    expect(normalizeLogoValue(undefined)).toBeUndefined();
    expect(normalizeLogoValue("")).toBeUndefined();
    expect(normalizeLogoValue("   ")).toBeUndefined();
    expect(normalizeLogoValue("data:image/png;base64,iVBOR...")).toBeUndefined();
    expect(normalizeLogoValue("blob:https://app.example/uuid")).toBeUndefined();
    // storageId Convex brut — jamais envoyé comme src d'un <img>
    expect(normalizeLogoValue("jd7n4skm1r5bv8qz2c0w9x6a3e5t8h2l")).toBeUndefined();
  });
});

describe("Professions experts — libellés affichés dans le badge", () => {
  it("libellés corrects pour les 6 professions officielles", () => {
    expect(EXPERT_PROFESSION_LABELS.architecte).toBe("Architecte");
    expect(EXPERT_PROFESSION_LABELS.bureau_etudes).toBe("Bureau d'études");
    expect(EXPERT_PROFESSION_LABELS.ingenieur).toBe("Ingénieur");
    expect(EXPERT_PROFESSION_LABELS.promoteur_immobilier).toBe(
      "Promoteur immobilier",
    );
    expect(EXPERT_PROFESSION_LABELS.plombier).toBe("Plombier");
    expect(EXPERT_PROFESSION_LABELS.electricien).toBe("Électricien");
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

describe("Catégories d'experts — normalisation", () => {
  it("expose les 7 catégories demandées, dans l'ordre d'affichage", () => {
    const keys = [...EXPERT_CATEGORIES.map((c) => c.key), EXPERT_OTHER_CATEGORY.key];
    expect(keys).toEqual([
      "architectes",
      "ingenieurs",
      "bureaux_etudes",
      "electricite",
      "plomberie",
      "promoteurs",
      "autre_specialite",
    ]);
    for (const c of EXPERT_CATEGORIES) {
      expect(c.icon.length).toBeGreaterThan(0);
      expect(c.label.length).toBeGreaterThan(0);
    }
  });

  it("classe chaque profession officielle dans sa catégorie", () => {
    expect(expertCategoryOf("architecte").key).toBe("architectes");
    expect(expertCategoryOf("ingenieur").key).toBe("ingenieurs");
    expect(expertCategoryOf("bureau_etudes").key).toBe("bureaux_etudes");
    expect(expertCategoryOf("electricien").key).toBe("electricite");
    expect(expertCategoryOf("plombier").key).toBe("plomberie");
    expect(expertCategoryOf("promoteur_immobilier").key).toBe("promoteurs");
  });

  it("replie toute profession inconnue sur « Autre spécialité »", () => {
    expect(expertCategoryOf("geometre").key).toBe("autre_specialite");
    expect(expertCategoryOf("").key).toBe("autre_specialite");
    expect(expertCategoryOf(null).key).toBe("autre_specialite");
  });

  it("déduit les métiers couverts par un expert (profession + spécialités)", () => {
    expect(expertProviderTypes("electricien", [])).toContain("electricien");
    expect(expertProviderTypes("ingenieur", [])).toContain("ingenieur_structure");
    // Spécialité connue du mapping fournisseur → type de métier associé
    expect(expertProviderTypes("plombier", ["etancheite"])).toContain("etancheite");
  });
});

describe("Spécialités complémentaires — familles proches", () => {
  it("plomberie et CVC appartiennent à la même famille (fluides)", () => {
    expect(PROVIDER_TYPE_FAMILY.plombier).toBe(PROVIDER_TYPE_FAMILY.climatisation);
    const close = complementaryTypes(["plombier"]);
    expect(close.has("climatisation")).toBe(true);
  });

  it("les métiers d'études sont proches entre eux", () => {
    const close = complementaryTypes(["ingenieur_structure"]);
    expect(close.has("architecte")).toBe(true);
    expect(close.has("bureau_etudes")).toBe(true);
  });

  it("électricité n'est pas complémentaire de la plomberie", () => {
    const close = complementaryTypes(["electricien"]);
    expect(close.has("plombier")).toBe(false);
  });
});

describe("Recommandations d'experts — regroupement et priorisation", () => {
  const expert = (
    id: string,
    profession: string,
    specialties: string[],
    regions: string[],
    extra: Partial<ExpertCandidate> = {},
  ): ExpertCandidate => ({
    id,
    profession,
    specialties,
    regions,
    complete: true,
    ...extra,
  });

  const candidates: ExpertCandidate[] = [
    expert("a1", "architecte", [], ["tunis"]),
    expert("a2", "architecte", [], ["sfax"], { complete: false }),
    expert("e1", "electricien", [], ["tunis"], { availability: "immediate" }),
    expert("e2", "electricien", [], ["tunis"], { availability: "appointment" }),
    expert("p1", "plombier", [], ["tunis"], { availability: "immediate" }),
    expert("i1", "ingenieur", [], ["tunis"]),
    expert("pr1", "promoteur_immobilier", [], ["tunis"]),
  ];

  it("ne garde que les experts pertinents (jamais un profil hors besoin)", () => {
    const groups = buildExpertRecommendations(candidates, {
      exactTypes: ["plombier"],
      compatibleTypes: ["plombier"],
      projectRegion: "tunis",
    });
    const ids = groups.flatMap((g) => g.experts.map((e) => e.candidate.id));
    expect(ids).toContain("p1");
    expect(ids).not.toContain("a1");
    expect(ids).not.toContain("i1");
  });

  it("regroupe par catégorie avec l'emoji d'en-tête", () => {
    const groups = buildExpertRecommendations(candidates, {
      exactTypes: ["electricien", "plombier", "architecte", "promoteur", "ingenieur_structure"],
      compatibleTypes: ["electricien", "plombier", "architecte", "promoteur", "ingenieur_structure"],
      projectRegion: "tunis",
    });
    const keys = groups.map((g) => g.key);
    expect(keys).toContain("architectes");
    expect(keys).toContain("electricite");
    expect(keys).toContain("plomberie");
    expect(groups.find((g) => g.key === "architectes")?.icon).toBe("🏗️");
  });

  it("évite les doublons d'un même expert", () => {
    const dup: ExpertCandidate[] = [
      expert("x", "plombier", [], ["tunis"]),
      expert("x", "plombier", [], ["tunis"]),
    ];
    const groups = buildExpertRecommendations(dup, {
      exactTypes: ["plombier"],
      compatibleTypes: ["plombier"],
      projectRegion: "tunis",
    });
    const ids = groups.flatMap((g) => g.experts.map((e) => e.candidate.id));
    expect(ids).toEqual(["x"]);
  });

  it("priorise la région du projet", () => {
    const groups = buildExpertRecommendations(
      [
        expert("near", "plombier", [], ["tunis"]),
        expert("far", "plombier", [], ["sfax"]),
      ],
      { exactTypes: ["plombier"], compatibleTypes: ["plombier"], projectRegion: "tunis" },
    );
    expect(groups[0].experts[0].candidate.id).toBe("near");
    expect(groups[0].experts[0].regionRank).toBe(0);
  });

  it("départage les ex æquo par la disponibilité", () => {
    const groups = buildExpertRecommendations(
      [
        expert("late", "electricien", [], ["tunis"], { availability: "appointment" }),
        expert("now", "electricien", [], ["tunis"], { availability: "immediate" }),
      ],
      { exactTypes: ["electricien"], compatibleTypes: ["electricien"], projectRegion: "tunis" },
    );
    expect(groups[0].experts[0].candidate.id).toBe("now");
  });

  it("affiche une spécialité complémentaire seulement sans correspondance exacte", () => {
    // Besoin climatisation : le plombier est proche (famille fluides) → complémentaire.
    const groups = buildExpertRecommendations(candidates, {
      exactTypes: ["climatisation"],
      compatibleTypes: ["climatisation"],
      projectRegion: "tunis",
    });
    const plomberie = groups.find((g) => g.key === "plomberie");
    expect(plomberie).toBeDefined();
    expect(plomberie!.experts[0].candidate.id).toBe("p1");
    expect(plomberie!.experts[0].complementary).toBe(true);
  });

  it("exclut les experts sans lien avec le besoin", () => {
    const groups = buildExpertRecommendations(
      [
        expert("exact", "plombier", [], ["tunis"]),
        expert("unrelated", "electricien", [], ["tunis"]),
      ],
      { exactTypes: ["plombier"], compatibleTypes: ["plombier"], projectRegion: "tunis" },
    );
    const ids = groups.flatMap((g) => g.experts.map((e) => e.candidate.id));
    expect(ids).toContain("exact");
    expect(ids).not.toContain("unrelated");
  });

  it("n'est jamais marqué complémentaire quand la correspondance est exacte", () => {
    const groups = buildExpertRecommendations(
      [expert("exact", "plombier", [], ["tunis"])],
      { exactTypes: ["plombier"], compatibleTypes: ["plombier"], projectRegion: "tunis" },
    );
    expect(groups[0].experts[0].exact).toBe(true);
    expect(groups[0].experts[0].complementary).toBe(false);
  });

  it("respecte la limite par catégorie", () => {
    const many = Array.from({ length: 8 }, (_, i) => expert(`p${i}`, "plombier", [], ["tunis"]));
    const groups = buildExpertRecommendations(many, {
      exactTypes: ["plombier"],
      compatibleTypes: ["plombier"],
      projectRegion: "tunis",
      limitPerCategory: 3,
    });
    expect(groups[0].experts.length).toBe(3);
  });
});

describe("Champs affichés des experts", () => {
  it("libellé de disponibilité (repli « Profil vérifié »)", () => {
    expect(expertAvailabilityLabel("immediate")).toBe("Disponible immédiatement");
    expect(expertAvailabilityLabel("this_week")).toBe("Disponible cette semaine");
    expect(expertAvailabilityLabel("appointment")).toBe("Sur rendez-vous");
    expect(expertAvailabilityLabel(undefined)).toBe("Profil vérifié");
  });

  it("un profil complet exige contact + spécialités + régions", () => {
    expect(
      isCompleteExpertProfile({
        displayName: "A",
        phone: "+216",
        email: "a@b.tn",
        specialties: ["plomberie"],
        regions: ["tunis"],
      }),
    ).toBe(true);
    expect(
      isCompleteExpertProfile({ displayName: "A", phone: "+216", specialties: [], regions: [] }),
    ).toBe(false);
  });
});
