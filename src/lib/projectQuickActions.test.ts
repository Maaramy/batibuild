import { describe, it, expect } from "vitest";
import { buildProjectQuickActions, type ProjectForQuickActions } from "./projectQuickActions";

const project: ProjectForQuickActions = { _id: "proj_1" };

function byKey(actions: ReturnType<typeof buildProjectQuickActions>) {
  return Object.fromEntries(actions.map((a) => [a.key, a]));
}

describe("buildProjectQuickActions — accès rapides d'un projet", () => {
  it("propose les modules Démarche · Expert · Plan AI", () => {
    const actions = buildProjectQuickActions(project);
    expect(actions.map((a) => a.key)).toEqual(["guide", "expert", "plan"]);
    expect(actions.map((a) => a.label)).toEqual(["Démarche", "Expert", "Plan AI"]);
    expect(actions.every((a) => a.tone.length > 0)).toBe(true);
  });

  it("n'expose plus d'accès ROI (remplacé par la démarche A-Z)", () => {
    const actions = buildProjectQuickActions(project);
    expect(actions.map((a) => a.key)).not.toContain("roi");
    expect(actions.map((a) => a.label)).not.toContain("ROI");
    expect(actions.every((a) => !a.href.includes("/investments"))).toBe(true);
  });

  it("Démarche ouvre le guide de construction A-Z sur le projet concerné", () => {
    const guide = byKey(buildProjectQuickActions(project)).guide;
    expect(guide.href).toBe("/dashboard/guide?project=proj_1");
    expect(guide.label).toBe("Démarche");
  });

  it("Expert conserve le contexte du projet dans l'annuaire", () => {
    expect(byKey(buildProjectQuickActions(project)).expert.href).toBe(
      "/dashboard/professionals-directory?project=proj_1",
    );
  });

  it("Plan AI ouvre le générateur de plans du projet", () => {
    expect(byKey(buildProjectQuickActions(project)).plan.href).toBe("/dashboard/plans/proj_1");
  });

  it("tous les liens portent l'identifiant du projet concerné (projets anciens compris)", () => {
    const legacy = buildProjectQuickActions({ _id: "proj_old" });
    expect(legacy).toHaveLength(3);
    expect(legacy.every((a) => a.href.includes("proj_old"))).toBe(true);
  });
});
