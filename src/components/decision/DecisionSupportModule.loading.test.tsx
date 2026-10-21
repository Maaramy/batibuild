// ============================================================================
// MODULE AIDE À LA DÉCISION — aucun chargement automatique
// ----------------------------------------------------------------------------
// Tant que les données réelles (Quantitatif, marché, prix) ne sont pas arrivées,
// le module affiche un squelette discret. L'écran de chargement animé de
// Batibuild n'est jamais déclenché à l'arrivée : il reste réservé au clic sur
// « Analyser mon budget avec l'IA » (vérifié dans OptimizationSection.test).
// ============================================================================

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/convex/_generated/api", () => ({
  api: {
    decisionSupportAccess: { getProjectDecisionSupportAccess: "getAccess" },
    materialSelections: { getMaterialsWorkspace: "getWorkspace" },
    marketData: {
      getPriceTrends: "getTrends",
      getMaterialPriceTrends: "getMaterialTrends",
      getCheapestSuppliers: "getSuppliers",
    },
    materials: { getMaterialPrices: "getPrices" },
    decisionSupport: {
      getProjectBudgetContext: "getBudgetContext",
      getBudgetAnalysis: "getBudgetAnalysis",
      saveBudgetAnalysis: "saveBudgetAnalysis",
    },
  },
}));

// Accès autorisé, mais données d'analyse encore en cours de chargement.
vi.mock("convex/react", () => ({
  useQuery: (query: unknown) => (query === "getAccess" ? { allowed: true } : undefined),
  useMutation: () => async () => undefined,
}));

vi.mock("react-router", () => ({
  useLocation: () => ({ hash: "" }),
}));

import { DecisionSupportModule } from "@/components/decision/DecisionSupportModule";

describe("module Aide à la décision — attente sans animation", () => {
  it("affiche un squelette discret, jamais l'écran animé ni l'analyse budgétaire", () => {
    const html = renderToStaticMarkup(
      <DecisionSupportModule
        projectId="project-1"
        projectName="Villa #64"
        scenarioLabel="Standard"
        projectTotal={500_000}
      />,
    );

    expect(html).toContain('data-slot="skeleton"');
    expect(html).toContain("Chargement des données de votre aide à la décision");

    // Aucun chargement animé avant le clic sur « Analyser mon budget avec l'IA ».
    expect(html).not.toContain("BatiBuild prépare votre aide à la décision");
    expect(html).not.toContain("Progression de l'aide à la décision");
    expect(html).not.toContain("BatiBuild analyse votre budget");
  });
});
