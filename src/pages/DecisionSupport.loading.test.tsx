// ============================================================================
// AIDE À LA DÉCISION — aucun chargement automatique à l'arrivée
// ----------------------------------------------------------------------------
// Le parcours demandé : après les résultats du coût estimatif, l'utilisateur
// reste sur la page de résultats. S'il ouvre explicitement « Aide à la
// décision », la page ne doit lancer AUCUNE animation de chargement : elle
// attend seulement les données réelles avec un squelette discret. L'écran
// animé de Batibuild est réservé au clic sur « Analyser mon budget avec l'IA ».
// ============================================================================

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Requêtes Convex réduites à des identifiants lisibles par le mock de useQuery.
vi.mock("@/convex/_generated/api", () => ({
  api: {
    projects: { getProject: "getProject" },
    decisionSupportAccess: { getProjectDecisionSupportAccess: "getAccess" },
    quantitatifCustom: { getCustomization: "getCustomization" },
    customWorks: { getProjectCustomWorks: "getCustomWorks" },
    materialSelections: { getMaterialsWorkspace: "getWorkspace" },
    marketData: {
      getPriceTrends: "getTrends",
      getMaterialPriceTrends: "getMaterialTrends",
      getCheapestSuppliers: "getSuppliers",
    },
    materials: { getMaterialPrices: "getPrices" },
    access: { canDownloadPdf: "canDownloadPdf" },
    decisionSupport: {
      getProjectBudgetContext: "getBudgetContext",
      getBudgetAnalysis: "getBudgetAnalysis",
      saveBudgetAnalysis: "saveBudgetAnalysis",
    },
  },
}));

// Données pas encore arrivées : c'est exactement l'état d'attente à vérifier.
vi.mock("convex/react", () => ({
  useQuery: () => undefined,
  useMutation: () => async () => undefined,
}));

vi.mock("react-router", () => ({
  useParams: () => ({ id: "project-1" }),
  useNavigate: () => () => undefined,
  useLocation: () => ({ hash: "" }),
}));

vi.mock("@/hooks/use-page-seo", () => ({
  usePageSEO: () => undefined,
}));

// L'en-tête de parcours lit ses propres requêtes : sans objet pour ce test.
vi.mock("@/components/ProjectJourneyNav", () => ({
  ProjectJourneyNav: () => null,
}));

import DecisionSupport from "@/pages/DecisionSupport";

describe("page Aide à la décision — pas de chargement automatique", () => {
  it("affiche un squelette discret, jamais l'écran animé de Batibuild", () => {
    const html = renderToStaticMarkup(<DecisionSupport />);

    // Le squelette d'attente des données réelles est bien présent.
    expect(html).toContain('data-slot="skeleton"');
    expect(html).toContain("Chargement des données de votre aide à la décision");

    // Aucun écran de chargement animé ne doit apparaître avant le clic.
    expect(html).not.toContain("BatiBuild prépare votre aide à la décision");
    expect(html).not.toContain("Progression de l'aide à la décision");
    expect(html).not.toContain("BatiBuild analyse votre budget");
  });
});
