// ============================================================================
// PLAN DE CONSTRUCTION — rendu de la carte « Capacité de construction »
// ----------------------------------------------------------------------------
// Vérifie sur le rendu RÉEL de la carte (mêmes moteurs que l'application :
// `buildBudgetAnalysis` + `deriveWorks`) qu'un poste n'affiche jamais deux fois
// le même intitulé :
//   • la ligne du poste « Gros œuvre » annonce ses ARTICLES (et non une
//     sous-catégorie qui porterait le même nom) ;
//   • son nom n'apparaît qu'une seule fois dans le plan de construction ;
//   • aucune ligne du plan n'annonce un niveau de sous-catégories inutile.
//
// La règle elle-même (tous les cas) est testée dans
// `src/lib/planWorkLevels.test.ts`.
// ============================================================================

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Travaux personnalisés : lus via Convex (aucun dans ce test).
vi.mock("convex/react", () => ({
  useQuery: () => undefined,
  useMutation: () => async () => undefined,
}));

import { CapacityDecisionCard } from "@/components/decision/CapacityDecisionCard";
import {
  buildBudgetAnalysis,
  type CategoryBreakdownItem,
  type QuantitatifLot,
} from "@/lib/budgetEngine";
import { deriveWorks } from "@/lib/constructionPlanEngine";

/** Catégories du projet (coûts = somme des lignes du Quantitatif associé). */
const BREAKDOWN: CategoryBreakdownItem[] = [
  { category: "etudes", label: "Études & frais préliminaires", estimatedCost: 7_920, percentage: 6.4 },
  { category: "gros_oeuvre", label: "Gros œuvre", estimatedCost: 38_927, percentage: 31.7 },
  { category: "second_oeuvre", label: "Second œuvre", estimatedCost: 62_000, percentage: 50.5 },
  { category: "transport", label: "Transport & divers", estimatedCost: 14_000, percentage: 11.4 },
];

/**
 * Quantitatif réel du cas signalé : le lot « Gros œuvre » n'a AUCUNE
 * sous-catégorie dans ses lignes, donc la sous-catégorie déduite porte le nom du
 * lot — c'est-à-dire le nom du poste (« Gros œuvre » affiché deux fois).
 */
const LOTS: QuantitatifLot[] = [
  {
    id: "etudes",
    name: "Études & frais préliminaires",
    subtotal: 7_920,
    lines: [
      {
        designation: "Permis de bâtir et frais",
        subcategory: "Études & permis",
        quantity: 1,
        unit: "forfait",
        total: 7_920,
      },
    ],
  },
  {
    id: "gros_oeuvre",
    name: "Gros œuvre",
    subtotal: 38_927,
    lines: [
      { designation: "Terrassement et fondations", quantity: 100, unit: "m²", unitPrice: 111.01, total: 11_101 },
      { designation: "Soubassement et dallage", quantity: 100, unit: "m²", unitPrice: 100.65, total: 10_065 },
      { designation: "Murs porteurs et refends", quantity: 100, unit: "m²", unitPrice: 177.61, total: 17_761 },
    ],
  },
  {
    id: "second_oeuvre",
    name: "Second œuvre",
    subtotal: 62_000,
    lines: [{ designation: "Cloisons et revêtements", quantity: 100, unit: "m²", unitPrice: 620, total: 62_000 }],
  },
];

function buildCase() {
  const analysis = buildBudgetAnalysis({
    projectId: "project-1",
    userId: "user-1",
    projectName: "Ma maison",
    scenarioLabel: "Standard",
    projectTotal: 122_847,
    budgetAvailable: 100_000,
    breakdown: BREAKDOWN,
    lots: LOTS,
    surface: 100,
    costPerM2: 1_228,
  });

  const works = deriveWorks(analysis, LOTS);
  const html = renderToStaticMarkup(
    <CapacityDecisionCard analysis={analysis} lots={LOTS} complementaryWorksEnabled={false} />,
  );

  // Section « Plan de construction » : c'est là que le doublon apparaissait.
  const planSection = html.slice(
    html.indexOf("Plan de construction selon votre budget"),
    html.indexOf("Priorisation intelligente"),
  );

  return { analysis, works, html, planSection };
}

/** Libellé tel qu'affiché (sans le complément entre parenthèses). */
const shown = (label: string) => label.replace(/\s*\([^()]*\)\s*$/, "").trim();

describe("CapacityDecisionCard — doublons de libellés dans le plan", () => {
  it("reproduit le cas signalé : le poste porte une sous-catégorie du même nom", () => {
    const { works } = buildCase();
    const grosOeuvre = works.find((w) => /gros\s*(oe|œ)uvre/i.test(w.label));

    expect(grosOeuvre).toBeDefined();
    expect(grosOeuvre!.parts?.length).toBe(1);
    expect(shown(grosOeuvre!.label)).toBe(shown(grosOeuvre!.parts![0].label));
  });

  it("annonce les articles du poste au lieu d'une sous-catégorie en double", () => {
    const { planSection } = buildCase();

    expect(planSection).toContain("3 articles");
    // Aucune ligne du plan n'annonce plus un niveau de sous-catégories ici.
    expect((planSection.match(/sous-catégorie/gi) ?? []).length).toBe(0);
  });

  it("n'écrit jamais deux fois le même libellé de poste dans le plan", () => {
    const { planSection } = buildCase();
    expect((planSection.match(/Gros œuvre/g) ?? []).length).toBe(1);
  });

  it("continue d'afficher les montants du poste et le total du programme", () => {
    const { planSection } = buildCase();

    // Le poste reste chiffré et financé : seule la présentation change.
    expect(planSection).toContain("38 927 TND");
    expect(planSection).toContain("Total programme sélectionné");
    expect(planSection).toContain("122 847 TND");
  });
});
