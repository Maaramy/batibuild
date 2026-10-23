// ============================================================================
// AIDE À LA DÉCISION — carte « Quel est votre budget disponible ? »
// ----------------------------------------------------------------------------
// Vérifie sur le rendu RÉEL de la section d'optimisation :
//   • le champ « Budget total » est remplacé par un curseur borné
//     (50 000 TND → total TTC du scénario actif, pas de 10 000 TND) ;
//   • le maximum suit le scénario sélectionné (Économique / Standard /
//     Premium / Personnalisé), sans plafond fixe ;
//   • un budget supérieur au nouveau maximum est ramené à ce maximum ;
//   • le montant affiché correspond toujours à la valeur du curseur ;
//   • le curseur reste ajustable après l'analyse, sans nouveau chargement ;
//   • un budget sous le seuil affiche le message minimal explicite ;
//   • un scénario sous 50 000 TND n'affiche aucune plage invalide et
//     désactive l'analyse.
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
  projectTotal?: number;
  scenarioLabel?: string;
}) {
  return renderToStaticMarkup(
    <OptimizationSection
      plan={{} as never}
      budgetAnalysis={options.budgetAnalysis}
      budgetAvailable={options.budgetAvailable}
      budgetAnalyzing={options.budgetAnalyzing}
      projectName="Villa #64"
      projectId="project-1"
      projectTotal={options.projectTotal ?? PROJECT_TOTAL}
      scenarioLabel={options.scenarioLabel ?? "Standard"}
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
    expect(html).toContain(formatTndAmount(PROJECT_TOTAL));
    // L'ancien champ numérique « Budget total » n'existe plus (le curseur
    // Radix peut rendre un input masqué interne, sans saisie utilisateur).
    expect(html).not.toContain('type="number"');
    expect(html).not.toContain("Plan de construction selon votre budget");
    // Aucun résultat : la carte reste affichée et aucun bouton de bascule
    // n'est nécessaire (il n'y aurait rien à réafficher).
    expect(html).not.toContain("Voir budget");
    expect(html).not.toContain("Masquer budget");
  });

  it("prend le total TTC du scénario actif comme maximum, sans plafond fixe", () => {
    const scenarios = [
      { label: "Économique", total: 180_000 },
      { label: "Standard", total: 240_000 },
      { label: "Premium", total: 320_000 },
      { label: "Personnalisé", total: 275_500 },
    ];

    for (const s of scenarios) {
      const html = renderSection({
        budgetAnalysis: null,
        budgetAvailable: MIN_BUDGET_TND,
        projectTotal: s.total,
        scenarioLabel: s.label,
      });

      expect(html).toContain(`Max. ${formatTndAmount(s.total)}`);
      expect(html).toContain(`scénario ${s.label}`);
      expect(html).not.toContain("1 000 000 TND");
    }
  });

  it("ramène automatiquement un budget supérieur au nouveau maximum", () => {
    // Budget enregistré 500 000 TND, scénario Standard à 240 000 TND.
    const html = renderSection({
      budgetAnalysis: null,
      budgetAvailable: 500_000,
      projectTotal: 240_000,
      scenarioLabel: "Standard",
    });

    expect(html).toContain(formatTndAmount(240_000));
    expect(html).not.toContain(formatTndAmount(500_000));
  });

  it("affiche le budget enregistré et le montant correspondant au curseur", () => {
    const html = renderSection({
      budgetAnalysis: null,
      budgetAvailable: 100_000,
    });

    expect(html).toContain(formatTndAmount(100_000));
    expect(html).toContain(formatTndAmount(MIN_BUDGET_TND));
  });

  it("conserve le curseur pendant le traitement réel", () => {
    const html = renderSection({
      budgetAnalysis: analysis(),
      budgetAnalyzing: true,
      budgetAvailable: 500_000,
      projectTotal: 500_000,
      scenarioLabel: "Premium",
    });

    expect(html).toContain("Quel est votre budget disponible ?");
    expect(html).toContain('data-slot="slider"');
    expect(html).toContain("BatiBuild analyse votre budget");
  });

  it("masque la carte du budget dès que les résultats sont affichés", () => {
    const html = renderSection({
      budgetAnalysis: analysis(),
      budgetAvailable: 100_000,
    });

    // Carte de saisie masquée par défaut…
    expect(html).not.toContain("Quel est votre budget disponible ?");
    expect(html).not.toContain('data-slot="slider"');
    // …mais accessible à tout moment via « Voir budget ».
    expect(html).toContain("Voir budget");
    expect(html).not.toContain("Masquer budget");
    expect(html).toContain('aria-expanded="false"');
    // Les résultats, eux, restent affichés directement.
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

  it("désactive l'analyse et n'affiche aucune plage invalide sous 50 000 TND", () => {
    const html = renderSection({
      budgetAnalysis: null,
      budgetAvailable: MIN_BUDGET_TND,
      projectTotal: 42_000,
      scenarioLabel: "Économique",
    });

    expect(html).not.toContain('data-slot="slider"');
    expect(html).toContain(
      `Le scénario Économique est estimé à ${formatTndAmount(42_000)}`,
    );
    expect(html).toContain(`budget minimal analysable de ${formatTndAmount(MIN_BUDGET_TND)}`);
    // Bouton d'analyse désactivé.
    expect(html).toContain("Analyser mon budget avec l&#x27;IA");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>/);
  });
});
