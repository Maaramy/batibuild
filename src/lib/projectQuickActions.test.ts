import { describe, it, expect } from "vitest";
import { buildProjectQuickActions, type ProjectForQuickActions } from "./projectQuickActions";

// Projet complet issu d'une estimation (cas courant).
const project: ProjectForQuickActions = {
  _id: "proj_1",
  name: "Villa Ben Ali",
  category: "villa",
  region: "nabeul",
  surface: 250,
  costEstimate: { totalCost: 480000 },
};

// Ancien projet : aucun coût ni région enregistrés (ne doit jamais casser).
const legacyProject: ProjectForQuickActions = {
  _id: "proj_old",
  name: "Ancien projet",
  category: "inconnu_legacy",
};

function byKey(actions: ReturnType<typeof buildProjectQuickActions>) {
  return Object.fromEntries(actions.map((a) => [a.key, a]));
}

describe("buildProjectQuickActions — accès rapides d'un projet", () => {
  it("propose exactement les 4 modules, dans l'ordre Matériaux · ROI · Expert · Plan AI", () => {
    const actions = buildProjectQuickActions(project);
    expect(actions.map((a) => a.key)).toEqual(["materials", "roi", "expert", "plan"]);
    expect(actions.map((a) => a.label)).toEqual(["Matériaux", "ROI", "Expert", "Plan AI"]);
    expect(actions.every((a) => a.tone.length > 0)).toBe(true);
  });

  it("Matériaux ouvre l'assistant Matériaux IA avec le BON projet pré-sélectionné", () => {
    expect(byKey(buildProjectQuickActions(project)).materials.href).toBe(
      "/dashboard/ai-materials?project=proj_1",
    );
  });

  it("Expert conserve le contexte du projet dans l'annuaire", () => {
    expect(byKey(buildProjectQuickActions(project)).expert.href).toBe(
      "/dashboard/professionals-directory?project=proj_1",
    );
  });

  it("Plan AI ouvre le générateur de plans du projet", () => {
    expect(byKey(buildProjectQuickActions(project)).plan.href).toBe("/dashboard/plans/proj_1");
  });

  it("ROI ouvre directement le résultat d'investissement quand le projet en a un", () => {
    const roi = byKey(buildProjectQuickActions(project, "analysis_42")).roi;
    expect(roi.href).toBe("/dashboard/investments/result/analysis_42");
    expect(roi.state).toBeUndefined();
  });

  it("ROI sans analyse : analyse pré-remplie avec les données du projet (aucune re-sélection)", () => {
    const roi = byKey(buildProjectQuickActions(project)).roi;
    expect(roi.href).toBe("/dashboard/investments?type=villa&project=proj_1");
    expect(roi.state?.projectId).toBe("proj_1");
    const prefill = roi.state?.prefill as Record<string, unknown>;
    expect(prefill.name).toBe("Villa Ben Ali");
    expect(prefill.investmentType).toBe("villa");
    expect(prefill.purchasePrice).toBe(480000); // coût de construction du projet
    expect(prefill.area).toBe(250);
    expect(prefill.region).toBe("nabeul");
  });

  it("projet ancien sans coût ni région : liens valides, pré-remplissage sûr", () => {
    const actions = buildProjectQuickActions(legacyProject);
    const roi = byKey(actions).roi;
    // Tous les liens portent bien l'identifiant du projet concerné
    expect(actions.filter((a) => a.key !== "roi").every((a) => a.href.includes("proj_old"))).toBe(true);
    expect(roi.href).toContain("project=proj_old");
    expect(roi.state?.projectId).toBe("proj_old");
    const prefill = roi.state?.prefill as Record<string, unknown>;
    expect(prefill.purchasePrice).toBe(0);
    expect(prefill.region).toBe("tunis");
    expect(prefill.investmentType).toBe("appartement"); // repli du mapping de type
  });
});
