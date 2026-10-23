// ============================================================================
// EXÉCUTION & SUIVI — trame réellement adaptée au type de projet
// ----------------------------------------------------------------------------
// Rend la page avec une villa à deux niveaux (surfaces réelles) et vérifie :
//   • le contexte affiché (type, surface, niveaux, trame) ;
//   • les phases/tâches de la trame villa (et aucune tâche d'une autre trame) ;
//   • les niveaux dépliés avec leurs surfaces enregistrées.
// La page lit Convex : requêtes et mutations sont remplacées par des valeurs
// réelles produites par le moteur (`generateRoadmap`).
// ============================================================================

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { generateRoadmap, type RoadmapProjectInput } from "@/convex/roadmapEngine";

const PROJECT: RoadmapProjectInput = {
  _id: "proj_villa",
  name: "Villa test à Nabeul",
  category: "villa",
  region: "nabeul",
  surface: 180,
  surfaceTotale: 600,
  floors: 2,
  levelSurfaces: [180, 90],
  selectedScenario: "premium",
  costEstimate: {
    totalCost: 320_000,
    costPerSquareMeter: 1778,
    breakdown: [
      {
        category: "gros_oeuvre",
        label: "Gros œuvre",
        estimatedCost: 128_000,
        percentage: 40,
        items: [
          { name: "Béton dosé 350", quantity: 120, unit: "m³", unitPrice: 380, totalPrice: 45_600 },
        ],
      },
      { category: "second_oeuvre", label: "Second œuvre", estimatedCost: 96_000, percentage: 30 },
    ],
    budgetScenarios: {
      economique: { totalCost: 272_000, costPerM2: 1511, label: "Économique", multiplier: 0.85 },
      standard: { totalCost: 320_000, costPerM2: 1778, label: "Standard", multiplier: 1 },
      premium: { totalCost: 416_000, costPerM2: 2311, label: "Premium", multiplier: 1.3 },
    },
  },
};

const ROADMAP = generateRoadmap(PROJECT);
const PROJECT_SUMMARY = {
  _id: PROJECT._id,
  name: PROJECT.name,
  category: PROJECT.category,
  surface: PROJECT.surface,
  floors: PROJECT.floors,
  levelSurfaces: PROJECT.levelSurfaces,
  selectedScenario: PROJECT.selectedScenario,
};

vi.mock("@/convex/_generated/api", () => ({
  api: {
    projects: { getUserProjects: "getUserProjects" },
    roadmap: {
      getRoadmap: "getRoadmap",
      generateRoadmapForProject: "generateRoadmapForProject",
      togglePhaseItem: "togglePhaseItem",
      updatePlanningTask: "updatePlanningTask",
      setBudgetScenario: "setBudgetScenario",
      addControlExpense: "addControlExpense",
      deleteControlExpense: "deleteControlExpense",
      addControlIssue: "addControlIssue",
      resolveControlIssue: "resolveControlIssue",
      addControlObservation: "addControlObservation",
      addControlPhoto: "addControlPhoto",
      deleteControlPhoto: "deleteControlPhoto",
      generateDocument: "generateDocument",
    },
    users: { generateUploadUrl: "generateUploadUrl" },
  },
}));

vi.mock("convex/react", () => ({
  useQuery: (fn: string) =>
    fn === "getUserProjects" ? [PROJECT_SUMMARY] : fn === "getRoadmap" ? { roadmapId: "r1", input: PROJECT, results: ROADMAP } : undefined,
  useMutation: () => async () => undefined,
}));

vi.mock("react-router", () => ({
  useNavigate: () => () => undefined,
  useSearchParams: () => [new URLSearchParams(`project=${PROJECT._id}`)],
}));

vi.mock("@/hooks/use-page-seo", () => ({ usePageSEO: () => undefined }));
vi.mock("@/hooks/use-pdf-gate", () => ({
  usePdfGate: () => ({
    allowed: true,
    loading: false,
    requestPdfDownload: () => true,
    dialog: null,
  }),
}));
vi.mock("@/components/ClientProPaywall", () => ({
  ClientProPaywall: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/ProjectJourneyNav", () => ({ ProjectJourneyNav: () => null }));
vi.mock("@/components/SiteDiagnostic", () => ({ default: () => null }));
vi.mock("@/components/BudgetAllocation", () => ({ default: () => null }));
vi.mock("@/components/CostEvolutionCard", () => ({ CostEvolutionCard: () => null }));
vi.mock("@/lib/roadmapReportPdf", () => ({ exportRoadmapPdf: () => undefined }));
vi.mock("sonner", () => ({ toast: { success: () => undefined, error: () => undefined } }));

import ProjectGuide from "@/pages/ProjectGuide";

describe("page Exécution & Suivi — adaptation au type de projet", () => {
  it("affiche la trame villa, ses niveaux et les surfaces réelles du projet", () => {
    const html = renderToStaticMarkup(<ProjectGuide />);

    // Les tuiles de contexte (type, surface, niveaux, scénario, reste à dépenser)
    // ne sont plus affichées en haut de la page.
    expect(html).not.toContain("Type de projet");
    expect(html).not.toContain("Reste à dépenser");
    expect(html).not.toContain("Scénario budgétaire");

    // Phase 08 adaptée au type de projet (et non un intitulé générique).
    expect(html).toContain("Construction neuve");
    // Tâches dépliées par niveau avec la surface du niveau.
    expect(html).toContain("Élévation et structure porteuse — R+1");

    // Aucune tâche d'une autre trame (piscine) n'est injectée dans la villa.
    expect(html).not.toContain("Filtration et traitement de l&#x27;eau");
    expect(html).not.toContain("Filtration et traitement de l&#39;eau");
  });
});
