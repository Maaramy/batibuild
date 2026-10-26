import { describe, it, expect } from "vitest";

import {
  evaluateProjectLimit,
  shouldBlockNewProjectCreation,
  type ProjectLimitRule,
} from "./projectLimits";

// ============================================================================
// Quota de projets — décision d'affichage de l'écran de limitation
// ----------------------------------------------------------------------------
// L'écran « Limite de projets atteinte » ne doit apparaître que sur une
// TENTATIVE de création au-delà du quota : jamais après la création du dernier
// projet autorisé (dont le résultat doit s'afficher), jamais pendant la
// création, jamais quand le quota n'est pas encore connu côté interface.
// ============================================================================

const rule = (maxProjects: number): ProjectLimitRule => ({
  enabled: true,
  maxProjects,
  resetMode: "offer",
});

/** Tentative de création par un compte dont le quota est chargé. */
function attempt(rule: ProjectLimitRule, used: number) {
  return shouldBlockNewProjectCreation({
    status: evaluateProjectLimit(rule, "trial", used),
    creationInProgress: false,
    hasCreatedProject: false,
  });
}

describe("quota de projets — décision de blocage", () => {
  it("quota de 1 : la première création passe, la deuxième est bloquée", () => {
    const quota = rule(1);
    expect(attempt(quota, 0)).toBe(false);
    expect(attempt(quota, 1)).toBe(true);
    expect(attempt(quota, 2)).toBe(true);
  });

  it("quota de 2 : les deux premiers projets passent, le troisième est bloqué", () => {
    const quota = rule(2);
    expect(attempt(quota, 0)).toBe(false);
    expect(attempt(quota, 1)).toBe(false);
    expect(attempt(quota, 2)).toBe(true);
  });

  it("quota de 5 : les cinq premiers projets passent, le sixième est bloqué", () => {
    const quota = rule(5);
    for (let used = 0; used < 5; used += 1) {
      expect(attempt(quota, used)).toBe(false);
    }
    expect(attempt(quota, 5)).toBe(true);
  });

  it("le résultat du projet qui vient d'être créé n'est jamais remplacé", () => {
    const status = evaluateProjectLimit(rule(1), "trial", 1);
    expect(status.allowed).toBe(false);

    // Création en cours ou projet déjà créé par ce parcours : aucun écran de
    // limitation, la page de résultat continue de s'afficher.
    expect(
      shouldBlockNewProjectCreation({
        status,
        creationInProgress: true,
        hasCreatedProject: false,
      }),
    ).toBe(false);
    expect(
      shouldBlockNewProjectCreation({
        status,
        creationInProgress: false,
        hasCreatedProject: true,
      }),
    ).toBe(false);
  });

  it("aucune limite configurée ou quota non chargé : jamais de blocage d'interface", () => {
    expect(
      shouldBlockNewProjectCreation({
        status: evaluateProjectLimit(rule(1), null, 3),
        creationInProgress: false,
        hasCreatedProject: false,
      }),
    ).toBe(false);
    expect(
      shouldBlockNewProjectCreation({
        status: evaluateProjectLimit({ ...rule(1), enabled: false }, "trial", 9),
        creationInProgress: false,
        hasCreatedProject: false,
      }),
    ).toBe(false);
    expect(
      shouldBlockNewProjectCreation({
        status: null,
        creationInProgress: false,
        hasCreatedProject: false,
      }),
    ).toBe(false);
    expect(
      shouldBlockNewProjectCreation({
        status: undefined,
        creationInProgress: false,
        hasCreatedProject: false,
      }),
    ).toBe(false);
  });
});
