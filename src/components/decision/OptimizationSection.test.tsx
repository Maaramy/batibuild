// ============================================================================
// AIDE À LA DÉCISION — carte « Quel est votre budget disponible ? »
// ----------------------------------------------------------------------------
// Vérifie sur le rendu RÉEL de la section d'optimisation :
//   • le champ « Budget total » est remplacé par un curseur borné
//     (50 000 TND → 1 000 000 TND, pas de 10 000 TND) ;
//   • le montant affiché correspond toujours à la valeur du curseur ;
//   • le curseur reste ajustable après l'analyse, sans nouveau chargement ;
//   • un budget sous le seuil affiche le message minimal explicite.
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
  MAX_BUDGET_TND,
  MIN_BUDGET_TND,
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
  budgetAvailable?: number;
}) {
  return renderToStaticMarkup(
    <OptimizationSection
      plan={{} as never}
      budgetAnalysis={options.budgetAnalysis}
      budgetAvailable={options.budgetAvailable}
      budgetAnalyzing={options.budgetAnalyzing}
      projectName="Villa #64"
      projectId="project-1"
      complementaryWorksEnabled={false}
    />,
  );
}

describe("OptimizationSection — curseur de budget", () => {
  it("affiche un curseur initialisé à 50 000 TND, sans champ de saisie", () => {
    const html = renderSection({ budgetAnalysis: null });

    expect(html).toContain("Quel est votre budget disponible ?");
    expect(html).toContain('data-slot="slider"');
    expect(html).toContain(formatTndAmount(MIN_BUDGET_TND));
    expect(html).toContain(formatTndAmount(MAX_BUDGET_TND));
    // L'ancien champ numérique « Budget total » n'existe plus (le curseur
    // Radix peut rendre un input masqué interne, sans saisie utilisateur).
    expect(html).not.toContain('type="number"');
    expect(html).not.toContain("Plan de construction selon votre budget");
  });

  it("affiche le budget enregistré et le montant correspondant au curseur", () => {
    const html = renderSection({
      budgetAnalysis: null,
      budgetAvailable: 500_000,
    });

    expect(html).toContain(formatTndAmount(500_000));
    expect(html).toContain(formatTndAmount(MIN_BUDGET_TND));
  });

  it("conserve le curseur pendant le traitement réel", () => {
    const html = renderSection({
      budgetAnalysis: analysis(),
      budgetAnalyzing: true,
      budgetAvailable: 500_000,
    });

    expect(html).toContain("Quel est votre budget disponible ?");
    expect(html).toContain('data-slot="slider"');
    expect(html).toContain("BatiBuild analyse votre budget");
  });

  it("garde le curseur ajustable avec les résultats, sans chargement résiduel", () => {
    const html = renderSection({
      budgetAnalysis: analysis(),
      budgetAvailable: 500_000,
    });

    // Le curseur reste visible pour actualiser les résultats.
    expect(html).toContain("Quel est votre budget disponible ?");
    expect(html).toContain('data-slot="slider"');
    expect(html).toContain(formatTndAmount(500_000));
    // Les résultats (et le budget analysé) restent affichés directement.
    expect(html).toContain("Plan de construction selon votre budget");
    expect(html).toContain(formatTndAmount(PROJECT_TOTAL));
    expect(html).not.toContain("BatiBuild analyse votre budget");
  });

  it("affiche le message explicite sous le seuil de 50 000 TND", () => {
    const html = renderSection({
      budgetAnalysis: null,
      budgetAvailable: 30_000,
    });

    expect(html).toContain(
      `Budget insuffisant : le minimum requis est de ${formatTndAmount(MIN_BUDGET_TND)}.`,
    );
  });
});
