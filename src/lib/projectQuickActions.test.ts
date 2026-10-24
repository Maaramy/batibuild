import { describe, it, expect } from "vitest";
import { buildProjectQuickActions, type ProjectForQuickActions } from "./projectQuickActions";

const project: ProjectForQuickActions = { _id: "proj_1" };

function byKey(actions: ReturnType<typeof buildProjectQuickActions>) {
  return Object.fromEntries(actions.map((a) => [a.key, a]));
}

describe("buildProjectQuickActions — accès rapides d'un projet", () => {
  it("propose les modules Plans AI · Décision · Expert · Démarche", () => {
    const actions = buildProjectQuickActions(project);
    expect(actions.map((a) => a.key)).toEqual([
      "plan",
      "decision",
      "expert",
      "guide",
    ]);
    expect(actions.map((a) => a.label)).toEqual([
      "Plans AI",
      "Décision",
      "Expert",
      "Démarche",
    ]);
    expect(actions.every((a) => a.tone.length > 0)).toBe(true);
  });

  it("n'expose plus l'accès Matériaux ni l'accès ROI", () => {
    const actions = buildProjectQuickActions(project);
    expect(actions.map((a) => a.key)).not.toContain("materials");
    expect(actions.map((a) => a.label)).not.toContain("Matériaux");
    expect(actions.map((a) => a.key)).not.toContain("roi");
    expect(actions.map((a) => a.label)).not.toContain("ROI");
  });

  it("Plans AI ouvre le résultat « Plans architecturaux IA » du projet", () => {
    expect(byKey(buildProjectQuickActions(project)).plan.href).toBe(
      "/dashboard/plans/proj_1",
    );
  });

  it("Décision ouvre les résultats « Aide à la décision » du projet", () => {
    const decision = byKey(buildProjectQuickActions(project)).decision;
    expect(decision.href).toBe("/dashboard/decision/proj_1");
    expect(decision.label).toBe("Décision");
  });

  it("Expert conserve le contexte du projet dans la mise en relation", () => {
    expect(byKey(buildProjectQuickActions(project)).expert.href).toBe(
      "/dashboard/professionals-directory?project=proj_1",
    );
  });

  it("Démarche ouvre la page Exécution & Suivi sur le projet concerné", () => {
    const guide = byKey(buildProjectQuickActions(project)).guide;
    expect(guide.href).toBe("/dashboard/guide?project=proj_1");
    expect(guide.label).toBe("Démarche");
  });

  it("tous les liens portent l'identifiant du projet concerné (projets anciens compris)", () => {
    const legacy = buildProjectQuickActions({ _id: "proj_old" });
    expect(legacy).toHaveLength(4);
    expect(legacy.every((a) => a.href.includes("proj_old"))).toBe(true);
  });
});
