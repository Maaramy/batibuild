// ============================================================================
// ÉCRAN DE CHARGEMENT — RENDU DU RÉSUMÉ RÉEL
// ----------------------------------------------------------------------------
// Vérifie sur le rendu réel :
//   • les informations et montants du projet apparaissent avec le design du
//     chargement (mêmes cartes, mêmes libellés) ;
//   • une valeur indisponible garde son emplacement avec un indicateur discret
//     et n'affiche AUCUN montant inventé ;
//   • sans résumé, l'écran d'origine (parcours du projet) est inchangé.
// ============================================================================

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { EstimateLoadingScreen } from "./EstimateLoadingScreen";
import { formatTndAmount } from "@/lib/budgetEngine";
import type { EstimateLoadingSummary } from "@/lib/estimateLoadingSummary";

const SUMMARY: EstimateLoadingSummary = {
  projectName: "Villa test",
  projectType: "Villa",
  region: "Tunis",
  builtSurface: 120,
  floors: 2,
  scenario: "Standard",
  total: 246_000,
  costPerM2: 2_050,
  breakdown: [
    { label: "Frais Préliminaires et Études", category: "frais_preliminaires", amount: 12_000, percentage: 4.9 },
    { label: "Gros œuvre (fondations, structures)", category: "gros_oeuvre", amount: 110_000, percentage: 44.7 },
    { label: "Second œuvre et finitions", category: "second_oeuvre", amount: 98_000, percentage: 39.8 },
    { label: "Aménagements extérieurs", category: "amenagements_exterieurs", amount: 26_000, percentage: 10.6 },
  ],
  steps: [
    { key: "quantities", label: "Quantités des travaux", done: true },
    { key: "prices", label: "Prix des matériaux", done: true },
    { key: "categories", label: "Coûts par catégorie", done: true },
    { key: "total", label: "Total TTC", done: true },
  ],
  ready: true,
};

function render(summary?: EstimateLoadingSummary): string {
  return renderToStaticMarkup(
    <EstimateLoadingScreen pending summary={summary} onComplete={() => {}} />,
  );
}

describe("chargement de l'estimation — résumé réel", () => {
  const html = render(SUMMARY);

  it("affiche les informations réelles du projet", () => {
    expect(html).toContain("Villa");
    expect(html).toContain("Tunis");
    expect(html).toContain("120 m²");
    expect(html).toContain("RDC + 1");
  });

  it("affiche le scénario, le budget TTC et le coût au m² réels", () => {
    expect(html).toContain("Standard");
    expect(html).toContain(formatTndAmount(246_000));
    expect(html).toContain(formatTndAmount(2_050));
    expect(html).toContain("Répartition des coûts");
  });

  it("affiche les catégories réelles avec leurs montants", () => {
    for (const row of SUMMARY.breakdown) {
      expect(html).toContain(row.label);
      expect(html).toContain(formatTndAmount(row.amount));
    }
  });

  it("marque les quatre opérations comme calculées", () => {
    expect(html).toContain("Quantités des travaux");
    expect(html).toContain("Prix des matériaux");
    expect(html).toContain("Coûts par catégorie");
    expect(html).toContain("Total TTC");
    expect(html).toContain("Calculé");
  });

  it("ne conserve ni étape de parcours ni pourcentage générique", () => {
    expect(html).not.toContain("Plans architecturaux AI");
    expect(html).not.toContain("Aide à la décision");
  });
});

describe("chargement de l'estimation — valeurs pas encore calculées", () => {
  const pending: EstimateLoadingSummary = {
    projectName: null,
    projectType: null,
    region: null,
    builtSurface: null,
    floors: null,
    scenario: null,
    total: null,
    costPerM2: null,
    breakdown: [],
    steps: [
      { key: "quantities", label: "Quantités des travaux", done: false },
      { key: "prices", label: "Prix des matériaux", done: false },
      { key: "categories", label: "Coûts par catégorie", done: false },
      { key: "total", label: "Total TTC", done: false },
    ],
    ready: false,
  };
  const html = render(pending);

  it("garde les emplacements avec un indicateur discret", () => {
    expect(html).toContain("Budget total estimé");
    expect(html).toContain("Calcul en cours");
    expect(html).toContain("animate-pulse");
  });

  it("affiche les catégories attendues sans montant inventé", () => {
    expect(html).toContain("Frais préliminaires et études");
    expect(html).toContain("Gros œuvre");
    expect(html).toContain("Second œuvre et finitions");
    expect(html).toContain("Aménagements extérieurs");
    expect(html).not.toContain("0 TND");
  });

  it("laisse les opérations en cours", () => {
    expect(html).toContain("En cours");
    expect(html).not.toContain("Calculé");
  });
});

describe("chargement de l'estimation — écran d'origine conservé", () => {
  const html = render(undefined);

  it("conserve le parcours du projet quand aucun résumé n'est fourni", () => {
    expect(html).toContain("Coût estimatif");
    expect(html).toContain("Plans architecturaux AI");
    expect(html).not.toContain("Budget total estimé");
  });
});
