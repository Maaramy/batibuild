import { describe, expect, it } from "vitest";

import {
  ESTIMATE_ANALYSIS_TIMEOUT_MS,
  ESTIMATE_INTRO_MS,
  ESTIMATE_JOURNEY_STEPS,
  describeEstimateError,
  estimateIntroState,
  isEstimateProjectReady,
  isEstimateResultReady,
  resolveEstimateFlowPhase,
} from "./estimateLoaderTiming";

describe("estimateIntroState — animation de l'estimation", () => {
  it("dure exactement 4 000 ms", () => {
    expect(ESTIMATE_INTRO_MS).toBe(4000);
  });

  it("affiche les 6 étapes du Journey dans l'ordre officiel", () => {
    expect(ESTIMATE_JOURNEY_STEPS).toEqual([
      "Type de projet",
      "Coût estimatif",
      "Aide à la décision",
      "Plans architecturaux AI",
      "Mise en relation",
      "Exécution & Suivi",
    ]);
  });

  it("démarre sur la première étape et 0 %", () => {
    expect(estimateIntroState(0)).toEqual({
      progress: 0,
      completed: 0,
      activeIndex: 0,
      done: false,
    });
  });

  it("répartit les 6 étapes sur les 4 secondes", () => {
    // Chaque étape occupe 4 000 / 6 ≈ 666,7 ms.
    const SEGMENT = ESTIMATE_INTRO_MS / ESTIMATE_JOURNEY_STEPS.length;
    expect(estimateIntroState(1).activeIndex).toBe(0);
    expect(estimateIntroState(Math.floor(SEGMENT) - 1).activeIndex).toBe(0);
    expect(estimateIntroState(Math.ceil(SEGMENT) + 1).activeIndex).toBe(1);
    expect(estimateIntroState(Math.ceil(SEGMENT * 2) + 1).activeIndex).toBe(2);
    expect(estimateIntroState(Math.ceil(SEGMENT * 3) + 1).activeIndex).toBe(3);
    expect(estimateIntroState(Math.ceil(SEGMENT * 4) + 1).activeIndex).toBe(4);
    expect(estimateIntroState(Math.ceil(SEGMENT * 5) + 1).activeIndex).toBe(5);
    expect(estimateIntroState(2400).activeIndex).toBe(3);
    expect(estimateIntroState(3999).activeIndex).toBe(5);
  });

  it("n'affiche 100 % qu'à la fin exacte des 4 secondes", () => {
    expect(estimateIntroState(3000).progress).toBe(75);
    expect(estimateIntroState(3999).progress).toBeLessThan(100);
    expect(estimateIntroState(ESTIMATE_INTRO_MS).progress).toBe(100);
  });

  it("atteint 100 % et toutes les étapes terminées à 4 000 ms", () => {
    expect(estimateIntroState(ESTIMATE_INTRO_MS)).toEqual({
      progress: 100,
      completed: 6,
      activeIndex: -1,
      done: true,
    });
  });

  it("ne prolonge jamais l'animation au-delà de 4 000 ms", () => {
    expect(estimateIntroState(4001)).toEqual(estimateIntroState(4000));
    expect(estimateIntroState(60_000)).toEqual(estimateIntroState(4000));
  });

  it("borne les valeurs négatives ou invalides à 0", () => {
    expect(estimateIntroState(-500).progress).toBe(0);
    expect(estimateIntroState(Number.NaN).progress).toBe(0);
  });

  it("estimation rapide : l'animation de 4 s est conservée avant d'afficher les résultats", () => {
    // Données prêtes très tôt (ex. 600 ms) : la page ne doit pas naviguer.
    expect(isEstimateResultReady(false, true)).toBe(false);
    // À 4 000 ms, les données étant prêtes, l'écran rend la main.
    expect(isEstimateResultReady(true, true)).toBe(true);
  });

  it("estimation lente : attente discrète après les 4 s, aucune navigation avant les données", () => {
    expect(isEstimateResultReady(true, false)).toBe(false);
    expect(isEstimateResultReady(false, false)).toBe(false);
  });

  it("des résultats réels arrivés après coup priment sur une erreur précédente", () => {
    // Une erreur seule n'affiche jamais de résultats...
    expect(isEstimateResultReady(true, false)).toBe(false);
    // ...mais dès que les données réelles existent, l'écran doit se fermer.
    expect(isEstimateResultReady(true, true)).toBe(true);
    expect(
      resolveEstimateFlowPhase({ introDone: true, dataReady: true, error: "boom" }),
    ).toBe("complete");
    expect(
      resolveEstimateFlowPhase({ introDone: true, dataReady: false, error: "boom" }),
    ).toBe("error");
  });

  it("ne rend jamais la main sans projet réellement terminé et chiffré", () => {
    expect(isEstimateProjectReady(undefined)).toBe(false);
    expect(isEstimateProjectReady(null)).toBe(false);
    expect(isEstimateProjectReady({ status: "draft" })).toBe(false);
    expect(isEstimateProjectReady({ status: "analyzing" })).toBe(false);
    // Statut terminé mais résultat absent ou partiel : pas encore prêt.
    expect(isEstimateProjectReady({ status: "completed" })).toBe(false);
    expect(
      isEstimateProjectReady({ status: "completed", costEstimate: {} }),
    ).toBe(false);
    expect(
      isEstimateProjectReady({
        status: "completed",
        costEstimate: { totalCost: 1 },
        aiAnalysis: { confidence: 0.9 },
      }),
    ).toBe(true);
  });

  it("expose une machine à états sans cycle (loading → waiting → complete / error)", () => {
    expect(
      resolveEstimateFlowPhase({ introDone: false, dataReady: false, error: null }),
    ).toBe("loading");
    expect(
      resolveEstimateFlowPhase({ introDone: false, dataReady: true, error: null }),
    ).toBe("loading");
    expect(
      resolveEstimateFlowPhase({ introDone: true, dataReady: false, error: null }),
    ).toBe("waiting");
    expect(
      resolveEstimateFlowPhase({ introDone: true, dataReady: true, error: null }),
    ).toBe("complete");
    // L'erreur n'est jamais affichée si les données réelles sont disponibles.
    expect(
      resolveEstimateFlowPhase({ introDone: true, dataReady: true, error: "boom" }),
    ).toBe("complete");
  });

  it("le garde-fou anti-blocage est borné et non infini", () => {
    expect(ESTIMATE_ANALYSIS_TIMEOUT_MS).toBeGreaterThan(ESTIMATE_INTRO_MS);
    expect(ESTIMATE_ANALYSIS_TIMEOUT_MS).toBeLessThanOrEqual(120_000);
  });

  it("produit un message explicite et actionnable pour chaque type d'erreur", () => {
    expect(describeEstimateError(new Error("Accès refusé"))).toContain("Accès refusé");
    expect(describeEstimateError(new Error("network error"))).toMatch(/connexion/i);
    expect(describeEstimateError(new Error("boom"))).toMatch(/réessayez/i);
    expect(describeEstimateError(undefined)).toMatch(/réessayez/i);
  });

  it("supporte une durée de 3 000 ms et un nombre d'étapes configurable", () => {
    // 6 étapes × 500 ms pour l'analyse budgétaire.
    expect(estimateIntroState(0, 3000, 6)).toMatchObject({
      progress: 0,
      activeIndex: 0,
      done: false,
    });
    expect(estimateIntroState(500, 3000, 6).activeIndex).toBe(1);
    expect(estimateIntroState(1500, 3000, 6).progress).toBe(50);
    expect(estimateIntroState(2999, 3000, 6).progress).toBe(99);
    expect(estimateIntroState(3000, 3000, 6)).toEqual({
      progress: 100,
      completed: 6,
      activeIndex: -1,
      done: true,
    });
    // Au-delà : figé, jamais prolongé.
    expect(estimateIntroState(9000, 3000, 6)).toEqual(estimateIntroState(3000, 3000, 6));
  });

  it("progresse de façon monotone (aucun retour en arrière)", () => {
    let previous = -1;
    for (let elapsed = 0; elapsed <= ESTIMATE_INTRO_MS; elapsed += 50) {
      const state = estimateIntroState(elapsed);
      expect(state.progress).toBeGreaterThanOrEqual(previous);
      previous = state.progress;
      expect(state.activeIndex).toBeGreaterThanOrEqual(-1);
      expect(state.activeIndex).toBeLessThan(ESTIMATE_JOURNEY_STEPS.length);
    }
  });
});
