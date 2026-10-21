// ============================================================================
// AIDE À LA DÉCISION — carte « Quel est votre budget disponible ? »
// ----------------------------------------------------------------------------
// Vérifie sur le rendu RÉEL de la section d'optimisation :
//   • avant l'analyse, la carte de saisie du budget reste affichée (comportement
//     actuel de saisie) ;
//   • pendant le traitement, elle reste affichée avec l'écran de chargement ;
//   • dès que les résultats sont affichés, elle est MASQUÉE — la valeur saisie
//     et l'analyse restent utilisées par les résultats.
// ============================================================================

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Travaux personnalisés lus via Convex (aucun dans ce test).
vi.mock("convex/react", () => ({
  useQuery: () => undefined,
  useMutation: () => async () => undefined,
}));

import { OptimizationSection } from "@/components/decision/OptimizationSection";
import {
  buildBudgetAnalysis,
  formatTndAmount,
  type CategoryBreakdownItem,
} from "@/lib/budgetEngine";

const BREAKDOWN: CategoryBreakdownItem[] = [
  { category: "etudes", label: "Études & frais préliminaires", estimatedCost: 7_920, percentage: 6 },
  { category: "gros_oeuvre", label: "Gros œuvre", estimatedCost: 38_927, percentage: 32 },
  { category: "second_oeuvre", label: "Second œuvre", estimatedCost: 62_000, percentage: 51 },
  { category: "main_oeuvre", label: "Main-d'œuvre", estimatedCost: 9_000, percentage: 7 },
  { category: "amenagements_exterieurs", label: "Aménagements extérieurs", estimatedCost: 4_000, percentage: 4 },
];

const PROJECT_TOTAL = BREAKDOWN.reduce((s, c) => s + c.estimatedCost, 0);

function analysis(budgetAvailable = 500_000) {
  return buildBudgetAnalysis({
    projectId: "project-1",
    userId: "user-1",
    projectName: "Villa #64",
    scenarioLabel: "Standard",
    projectTotal: PROJECT_TOTAL,
    budgetAvailable,
    breakdown: BREAKDOWN,
    surface: 120,
    costPerM2: Math.round(PROJECT_TOTAL / 120),
  });
}

function renderSection(options: {
  budgetAnalysis: ReturnType<typeof analysis> | null;
  budgetAnalyzing?: boolean;
}) {
  return renderToStaticMarkup(
    <OptimizationSection
      plan={{} as never}
      budgetAnalysis={options.budgetAnalysis}
      budgetAvailable={500_000}
      budgetAnalyzing={options.budgetAnalyzing}
      projectName="Villa #64"
      projectId="project-1"
      complementaryWorksEnabled={false}
    />,
  );
}

describe("OptimizationSection — masquage de la carte budget après résultats", () => {
  it("affiche la carte de saisie avant l'analyse", () => {
    const html = renderSection({ budgetAnalysis: null });

    expect(html).toContain("Quel est votre budget disponible ?");
    expect(html).not.toContain("Plan de construction selon votre budget");
  });

  it("conserve la saisie pendant le traitement réel", () => {
    const html = renderSection({
      budgetAnalysis: analysis(),
      budgetAnalyzing: true,
    });

    expect(html).toContain("Quel est votre budget disponible ?");
    expect(html).toContain("BatiBuild analyse votre budget");
  });

  it("masque la carte dès que les résultats sont affichés, sans perdre le budget", () => {
    const html = renderSection({ budgetAnalysis: analysis() });

    expect(html).not.toContain("Quel est votre budget disponible ?");
    // Les résultats (et le budget analysé) restent affichés.
    expect(html).toContain("Plan de construction selon votre budget");
    expect(html).toContain(formatTndAmount(500_000));
    expect(html).toContain(formatTndAmount(PROJECT_TOTAL));
  });
});
