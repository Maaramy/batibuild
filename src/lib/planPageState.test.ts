import { describe, expect, it } from "vitest";

import { resolvePlanPagePhase } from "./planPageState";

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
