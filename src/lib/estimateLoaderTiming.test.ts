import { describe, expect, it } from "vitest";

import {
  ESTIMATE_ANALYSIS_TIMEOUT_MS,
  ESTIMATE_INTRO_MS,
  ESTIMATE_JOURNEY_STEPS,
  describeEstimateError,
  estimateIntroElapsed,
  estimateIntroState,
  isEstimateProjectReady,
  isEstimateResultReady,
  resolveEstimateFlowPhase,
  resolveEstimateResultsPhase,
  shouldShowAnimatedEstimateLoader,
} from "./estimateLoaderTiming";

describe("estimateIntroElapsed — reprise d'un chargement déjà commencé", () => {
  it("reprend la progression au lieu de redémarrer les 4 s", () => {
    // La page a commencé le chargement à 1 000 ms ; le module prend le relais
    // 1 500 ms plus tard : l'animation continue à 1 500 ms.
    expect(estimateIntroElapsed(1000, 2500)).toBe(1500);
    expect(estimateIntroState(estimateIntroElapsed(1000, 2500)).progress).toBe(37);
  });

  it("repart de zéro sans horodatage exploitable", () => {
    for (const start of [undefined, 0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(estimateIntroElapsed(start, 5000), String(start)).toBe(0);
    }
  });

  it("ne renvoie jamais un temps négatif (horloge incohérente)", () => {
    expect(estimateIntroElapsed(3000, 1000)).toBe(0);
  });

  it("termine immédiatement l'introduction si le chargement dure déjà 4 s", () => {
    const elapsed = estimateIntroElapsed(1000, 1000 + ESTIMATE_INTRO_MS + 250);
    expect(estimateIntroState(elapsed).done).toBe(true);
  });
});

describe("estimateIntroState — animation de l'estimation", () => {
  it("dure exactement 4 000 ms", () => {
    expect(ESTIMATE_INTRO_MS).toBe(4000);
  });

  it("affiche les 5 étapes du parcours complet (groupe A) dans l'ordre officiel", () => {
    expect(ESTIMATE_JOURNEY_STEPS).toEqual([
      "Coût estimatif",
      "Plans architecturaux AI",
      "Aide à la décision",
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

  it("répartit les 5 étapes sur les 4 secondes", () => {
    // Chaque étape occupe 4 000 / 5 = 800 ms.
    const SEGMENT = ESTIMATE_INTRO_MS / ESTIMATE_JOURNEY_STEPS.length;
    expect(SEGMENT).toBe(800);
    expect(estimateIntroState(1).activeIndex).toBe(0);
    expect(estimateIntroState(799).activeIndex).toBe(0);
    expect(estimateIntroState(801).activeIndex).toBe(1);
    expect(estimateIntroState(1601).activeIndex).toBe(2);
    expect(estimateIntroState(2401).activeIndex).toBe(3);
    expect(estimateIntroState(3201).activeIndex).toBe(4);
    expect(estimateIntroState(3999).activeIndex).toBe(4);
  });

  it("n'affiche 100 % qu'à la fin exacte des 4 secondes", () => {
    expect(estimateIntroState(3000).progress).toBe(75);
    expect(estimateIntroState(3999).progress).toBeLessThan(100);
    expect(estimateIntroState(ESTIMATE_INTRO_MS).progress).toBe(100);
  });

  it("atteint 100 % et toutes les étapes terminées à 4 000 ms", () => {
    expect(estimateIntroState(ESTIMATE_INTRO_MS)).toEqual({
      progress: 100,
      completed: 5,
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

  it("termine le chargement à 4 000 ms pour les 5, 4 et 2 étapes des trois groupes", () => {
    // Groupe A : 5 étapes, durée totale inchangée (4 000 ms).
    expect(estimateIntroState(ESTIMATE_INTRO_MS, ESTIMATE_INTRO_MS, 5)).toEqual({
      progress: 100,
      completed: 5,
      activeIndex: -1,
      done: true,
    });
    // Groupe B : 4 étapes, même durée totale.
    expect(estimateIntroState(ESTIMATE_INTRO_MS, ESTIMATE_INTRO_MS, 4)).toEqual({
      progress: 100,
      completed: 4,
      activeIndex: -1,
      done: true,
    });
    // Groupe C : 2 étapes, même durée totale, aucune prolongation.
    expect(estimateIntroState(ESTIMATE_INTRO_MS, ESTIMATE_INTRO_MS, 2)).toEqual({
      progress: 100,
      completed: 2,
      activeIndex: -1,
      done: true,
    });
    expect(estimateIntroState(ESTIMATE_INTRO_MS - 1, ESTIMATE_INTRO_MS, 2).done).toBe(false);
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

  it("résultats : « introuvable » seulement après la réponse serveur, jamais pendant le chargement", () => {
    // Requête en cours → chargement (aucun message d'erreur intermédiaire).
    expect(resolveEstimateResultsPhase(undefined)).toBe("loading");
    expect(resolveEstimateResultsPhase(undefined, true)).toBe("loading");
    // Réponse serveur `null` → projet réellement introuvable.
    expect(resolveEstimateResultsPhase(null)).toBe("not_found");
    // Résultats prêts → affichage des résultats du projet demandé.
    expect(resolveEstimateResultsPhase({ _id: "p1" })).toBe("ready");
  });

  it("résultats : l'écran animé n'apparaît que pendant une attente réelle venue de l'estimation", () => {
    const loading = "loading" as const;
    // Attente normale mais délai anti-clignotement non écoulé → squelette.
    expect(
      shouldShowAnimatedEstimateLoader({
        phase: loading,
        fromEstimate: true,
        delayElapsed: false,
      }),
    ).toBe(false);
    // Chargement lent depuis l'estimation → écran animé existant.
    expect(
      shouldShowAnimatedEstimateLoader({
        phase: loading,
        fromEstimate: true,
        delayElapsed: true,
      }),
    ).toBe(true);
    // Accès direct (rafraîchissement) → squelette, pas de faux parcours.
    expect(
      shouldShowAnimatedEstimateLoader({
        phase: loading,
        fromEstimate: false,
        delayElapsed: true,
      }),
    ).toBe(false);
    // Données prêtes ou erreur réelle → jamais l'écran de chargement.
    for (const phase of ["ready", "not_found"] as const) {
      expect(
        shouldShowAnimatedEstimateLoader({
          phase,
          fromEstimate: true,
          delayElapsed: true,
        }),
        phase,
      ).toBe(false);
    }
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
