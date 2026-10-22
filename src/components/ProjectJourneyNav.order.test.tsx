// ============================================================================
// PROJECT JOURNEY — ordre de navigation des groupes A et D
// ----------------------------------------------------------------------------
// Groupes A et D : Coût estimatif → Plans architecturaux AI → Aide à la
// décision → Mise en relation → Exécution & Suivi.
// Groupes B et C : Coût estimatif → Mise en relation (inchangé).
// Le Journey affiche UNE étape à la fois : « Suivant → » et « Étape précédente »
// sont déduits de l'ordre des étapes, pas d'une liste codée dans le composant.
// ============================================================================

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/convex/_generated/api", () => ({
  api: {
    subscriptions: { consumeDownload: "consumeDownload" },
    projects: { getMyProjectsForCards: "getMyProjectsForCards" },
    reportCenter: { getMyReportArtifacts: "getMyReportArtifacts" },
    access: { canDownloadPdf: "canDownloadPdf" },
  },
}));

const PROJECT = {
  _id: "project-1",
  name: "Projet test",
  category: "villa",
  surface: 120,
  surfaceTotale: 150,
  region: "tunis",
  costEstimate: { total: 1000 },
};

vi.mock("convex/react", () => ({
  useQuery: (query: string) => {
    if (query === "getMyProjectsForCards") return [PROJECT];
    if (query === "getMyReportArtifacts") return [];
    if (query === "canDownloadPdf") return { allowed: false };
    return undefined;
  },
  useMutation: () => async () => undefined,
  useConvex: () => ({}),
}));

vi.mock("react-router", () => ({
  useNavigate: () => () => undefined,
  useLocation: () => ({ pathname: "/dashboard/project/project-1", hash: "" }),
}));

vi.mock("@/components/HeaderNav", () => ({
  isHeaderNavItemActive: ({ path }: { path: string }, pathname: string) =>
    pathname === path || pathname.startsWith(`${path}/`),
}));

// Les générateurs PDF ne participent pas à la navigation testée.
vi.mock("@/lib/reportDownloads", () => ({
  downloadCostReport: async () => undefined,
  downloadExecutionReport: async () => undefined,
  downloadMaterialsReport: async () => undefined,
  downloadPlansReport: async () => undefined,
}));

import { ProjectJourneyNav } from "@/components/ProjectJourneyNav";

/** Rendu statique du Journey pour une étape donnée. */
function render(
  category: string,
  activeKey:
    | "cost"
    | "plans"
    | "decision"
    | "consult"
    | "execution",
): string {
  return renderToStaticMarkup(
    <ProjectJourneyNav
      projectId="project-1"
      category={category}
      activeKey={activeKey}
    />,
  );
}

describe("Journey — groupes A et D : ordre imposé", () => {
  for (const category of ["villa", "maison", "bureau", "local_commercial"]) {
    it(`${category} : coût → plans → décision → relation → exécution`, () => {
      // 1. Coût estimatif : seulement « Suivant → Plans architecturaux AI ».
      const cost = render(category, "cost");
      expect(cost).toContain("Coût estimatif");
      expect(cost).toContain("Suivant");
      expect(cost).not.toContain("Étape précédente");

      // 2. Plans architecturaux AI : précédent = coût, suivant = décision.
      const plans = render(category, "plans");
      expect(plans).toContain("Plans architecturaux AI");
      expect(plans).toContain("Étape précédente");
      expect(plans).toContain("Coût estimatif");

      // 3. Aide à la décision : précédent = plans, suivant = mise en relation.
      const decision = render(category, "decision");
      expect(decision).toContain("Aide à la décision");
      expect(decision).toContain("Étape précédente");
      expect(decision).toContain("Plans architecturaux AI");

      // 4. Mise en relation : suivant = exécution.
      const consult = render(category, "consult");
      expect(consult).toContain("Mise en relation");
      expect(consult).toContain("Étape précédente");
      expect(consult).toContain("Aide à la décision");

      // 5. Exécution & suivi : dernière étape, plus de « Suivant ».
      const execution = render(category, "execution");
      expect(execution).toContain("Exécution &amp; Suivi");
      expect(execution).not.toContain("Suivant");
    });
  }
});

describe("Journey — groupes B et C : parcours inchangé", () => {
  for (const category of ["piscine", "renovation_cuisine", "electricite_complete"]) {
    it(`${category} : coût estimatif puis mise en relation uniquement`, () => {
      const cost = render(category, "cost");
      expect(cost).toContain("Coût estimatif");
      expect(cost).toContain("Suivant");
      expect(cost).not.toContain("Plans architecturaux AI");
      expect(cost).not.toContain("Aide à la décision");
      expect(cost).not.toContain("Exécution");

      const consult = render(category, "consult");
      expect(consult).toContain("Mise en relation");
      expect(consult).toContain("Étape précédente");
      expect(consult).toContain("Coût estimatif");
      expect(consult).not.toContain("Suivant");
    });
  }
});
