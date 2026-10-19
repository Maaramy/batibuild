import { describe, expect, it } from "vitest";

import { resolvePlanPagePhase, resolvePlanPageView } from "./planPageState";

const PROJECT_ID = "jd7abcdefghijklmnopqrstuvwxyz012";

describe("resolvePlanPagePhase — page Plans architecturaux AI", () => {
  it("affiche l'introduction au montage, même si la requête a déjà répondu", () => {
    expect(
      resolvePlanPagePhase({
        introLoading: true,
        projectId: PROJECT_ID,
        project: { _id: PROJECT_ID },
        customWorks: { keys: [] },
      }),
    ).toBe("intro");
  });

  it("scénario 1 — projet existant ouvert depuis le Journey : chargement puis prêt", () => {
    // Première réponse de Convex : `undefined` = requête en cours.
    expect(
      resolvePlanPagePhase({
        introLoading: false,
        projectId: PROJECT_ID,
        project: undefined,
        customWorks: undefined,
      }),
    ).toBe("loading");

    expect(
      resolvePlanPagePhase({
        introLoading: false,
        projectId: PROJECT_ID,
        project: { _id: PROJECT_ID },
        customWorks: { keys: [] },
      }),
    ).toBe("ready");
  });

  it("scénario 2 — données Convex lentes : jamais « Projet introuvable » pendant l'attente", () => {
    for (const project of [undefined, undefined, undefined]) {
      expect(
        resolvePlanPagePhase({
          introLoading: false,
          projectId: PROJECT_ID,
          project,
          customWorks: undefined,
        }),
      ).toBe("loading");
    }
  });

  it("scénario 5 — projet avec plans déjà générés : affichage direct dès réception", () => {
    expect(
      resolvePlanPagePhase({
        introLoading: false,
        projectId: PROJECT_ID,
        project: { _id: PROJECT_ID, plans: ["v1"] },
        customWorks: { keys: ["garage"] },
      }),
    ).toBe("ready");
  });

  it("attend les travaux complémentaires pour ne pas remplacer les plans affichés", () => {
    expect(
      resolvePlanPagePhase({
        introLoading: false,
        projectId: PROJECT_ID,
        project: { _id: PROJECT_ID },
        customWorks: undefined,
      }),
    ).toBe("loading");
  });

  it("scénario 6 — projet réellement inexistant : message après réponse serveur", () => {
    expect(
      resolvePlanPagePhase({
        introLoading: false,
        projectId: PROJECT_ID,
        project: null,
        customWorks: null,
      }),
    ).toBe("not-found");
  });

  it("identifiant absent ou vide : aucune requête, projet introuvable", () => {
    for (const projectId of [null, undefined, "", "   "]) {
      expect(
        resolvePlanPagePhase({
          introLoading: false,
          projectId,
          project: undefined,
          customWorks: undefined,
        }),
      ).toBe("not-found");
    }
  });

  it("un identifiant présent avec une requête en cours reste en chargement", () => {
    expect(
      resolvePlanPagePhase({
        introLoading: false,
        projectId: "  jd7abc  ",
        project: undefined,
        customWorks: undefined,
      }),
    ).toBe("loading");
  });
});

describe("resolvePlanPageView — animation de 4 s puis affichage des plans", () => {
  it("affiche l'écran de chargement partagé pendant toute l'animation", () => {
    expect(resolvePlanPageView({ phase: "intro", revealed: false })).toBe("loading");
  });

  it("attend la fin de l'animation même si les données sont déjà prêtes", () => {
    // Données prêtes dès la première réponse, mais `onComplete` n'a pas encore
    // été appelé (fin des 4 s) : les plans ne doivent pas s'afficher.
    expect(resolvePlanPageView({ phase: "ready", revealed: false })).toBe("loading");
    expect(resolvePlanPageView({ phase: "ready", revealed: true })).toBe("plans");
  });

  it("données lentes : attente discrète après les 4 s, jamais de page vide", () => {
    expect(resolvePlanPageView({ phase: "loading", revealed: false })).toBe("loading");
    expect(resolvePlanPageView({ phase: "loading", revealed: true })).toBe("loading");
  });

  it("aucun « Projet introuvable » pendant l'animation ou une requête en cours", () => {
    // Réponse `null` arrivée pendant l'introduction : la phase reste `intro`.
    const introPhase = resolvePlanPagePhase({
      introLoading: true,
      projectId: PROJECT_ID,
      project: null,
      customWorks: null,
    });
    expect(introPhase).toBe("intro");
    expect(resolvePlanPageView({ phase: introPhase, revealed: false })).toBe("loading");
    expect(resolvePlanPageView({ phase: "loading", revealed: false })).toBe("loading");
  });

  it("affiche « Projet introuvable » seulement après la réponse serveur", () => {
    expect(resolvePlanPageView({ phase: "not-found", revealed: false })).toBe("not-found");
    expect(resolvePlanPageView({ phase: "not-found", revealed: true })).toBe("not-found");
  });

  it("les plans ne s'affichent jamais sans données réellement prêtes", () => {
    for (const phase of ["intro", "loading"] as const) {
      expect(resolvePlanPageView({ phase, revealed: true })).toBe("loading");
    }
  });
});
