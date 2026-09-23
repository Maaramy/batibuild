import { describe, it, expect } from "vitest";

import {
  badgeCountLabel,
  countByFilter,
  formatProjectDate,
  MY_PROJECTS_FILTERS,
  projectDurationLabel,
  projectMatchesFilter,
  projectProgress,
  projectRegionLabel,
  projectStatusMeta,
} from "./myProjects";

// ============================================================================
// PAGE « MES PROJETS » — règles d'affichage
//
// Couvre : les filtres par statut (En cours / Terminés / Archivés), la
// progression calculée sur les jalons réels, et les libellés optionnels
// (région, durée d'exécution, pastille de compteur).
// ============================================================================

const baseProject = { status: "draft" };

describe("projectMatchesFilter / countByFilter", () => {
  it("keeps every project for the « Tous » filter", () => {
    expect(MY_PROJECTS_FILTERS.map((f) => f.key)).toEqual([
      "all",
      "active",
      "completed",
      "archived",
    ]);
    expect(projectMatchesFilter(baseProject, "all")).toBe(true);
  });

  it("groups drafts and analyzing projects under « En cours »", () => {
    expect(projectMatchesFilter({ status: "draft" }, "active")).toBe(true);
    expect(projectMatchesFilter({ status: "analyzing" }, "active")).toBe(true);
    expect(projectMatchesFilter({ status: "completed" }, "active")).toBe(false);
  });

  it("shows completed projects (réalisés) and archived projects separately", () => {
    expect(projectMatchesFilter({ status: "completed" }, "completed")).toBe(true);
    expect(projectMatchesFilter({ status: "archived" }, "completed")).toBe(false);
    expect(projectMatchesFilter({ status: "archived" }, "archived")).toBe(true);
  });

  it("never hides a project: the sum of the specific filters matches the total", () => {
    const projects = [
      { status: "draft" },
      { status: "analyzing" },
      { status: "completed" },
      { status: "archived" },
    ];
    const counts = countByFilter(projects);
    expect(counts.all).toBe(4);
    expect(counts.active + counts.completed + counts.archived).toBe(counts.all);
  });

  it("treats a missing status as a draft", () => {
    expect(projectMatchesFilter({}, "active")).toBe(true);
  });
});

describe("projectProgress", () => {
  it("starts at 0 for a bare project", () => {
    const progress = projectProgress({});
    expect(progress.percent).toBe(0);
    expect(progress.total).toBe(5);
    expect(progress.done).toBe(0);
  });

  it("adds each real milestone once it exists", () => {
    const progress = projectProgress({
      files: [{ name: "plan.png", type: "image/png" }],
      aiAnalysis: { category: "villa" },
    });
    expect(progress.percent).toBe(40);
    expect(progress.done).toBe(2);
  });

  it("reaches exactly 100% for a completed project", () => {
    const progress = projectProgress({
      status: "completed",
      files: [{ name: "plan.png", type: "image/png" }],
      aiAnalysis: {},
      costEstimate: {},
      dqe: {},
      providerRecommendations: {},
    });
    expect(progress.percent).toBe(100);
    expect(progress.done).toBe(progress.total);
  });

  it("never exceeds 100% and never returns a partial project beyond its data", () => {
    const progress = projectProgress({ costEstimate: {} });
    expect(progress.percent).toBe(25);
  });

  it("keeps archived projects on their real milestones (no invented 100%)", () => {
    const progress = projectProgress({ status: "archived", costEstimate: {} });
    expect(progress.percent).toBe(25);
  });
});

describe("optional labels", () => {
  it("uses the estimated duration from the AI analysis only when present", () => {
    expect(projectDurationLabel({ aiAnalysis: { estimatedDuration: "8 mois" } })).toBe("8 mois");
    expect(projectDurationLabel({ aiAnalysis: {} })).toBeNull();
    expect(projectDurationLabel({})).toBeNull();
  });

  it("maps the stored region slug to its label", () => {
    expect(projectRegionLabel({ region: "tunis" })).toBeTruthy();
    expect(projectRegionLabel({ region: null })).toBeNull();
    expect(projectRegionLabel({})).toBeNull();
  });

  it("formats dates and hides empty values", () => {
    expect(formatProjectDate(0)).toBe("—");
    expect(formatProjectDate(null)).toBe("—");
    expect(formatProjectDate(new Date("2026-01-15T10:00:00Z").getTime())).toContain("2026");
  });

  it("renders the messagerie badge with a 99+ cap and hides 0", () => {
    expect(badgeCountLabel(3)).toBe("3");
    expect(badgeCountLabel(99)).toBe("99");
    expect(badgeCountLabel(100)).toBe("99+");
    expect(badgeCountLabel(0)).toBeNull();
    expect(badgeCountLabel(null)).toBeNull();
    expect(badgeCountLabel(undefined)).toBeNull();
  });

  it("falls back to « Brouillon » for an unknown status", () => {
    expect(projectStatusMeta("completed").label).toBe("Terminé");
    expect(projectStatusMeta("unknown").label).toBe("Brouillon");
  });
});
