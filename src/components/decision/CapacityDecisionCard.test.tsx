// ============================================================================
// CAPACITÉ DE CONSTRUCTION — cohérence d'AFFICHAGE de la carte
// ----------------------------------------------------------------------------
// Ces tests verrouillent les défauts visuels corrigés dans la carte :
//
//   • AUCUN pourcentage contradictoire : l'anneau de la tuile « Capacité de
//     construction », la phrase récapitulative, la barre de progression et le
//     total du plan affichent LA MÊME valeur, calculée sur les montants
//     imprimés juste à côté (financés ÷ programme sélectionné) ;
//   • AUCUN compteur incohérent : la tuile « Travaux réalisables », les trois
//     groupes (Réalisables / Partiellement / Non réalisables) et la phrase
//     récapitulative comptent la MÊME liste de postes chiffrés ;
//   • la tuile « Travaux réalisables » ne porte AUCUN anneau de pourcentage :
//     elle affiche un nombre de postes — plus deux anneaux identiques portant
//     deux sens différents ;
//   • le bandeau supérieur et les lignes du plan restent insécables : les
//     largeurs minimales sont présentes pour que l'anneau passe à la ligne au
//     lieu de comprimer/chevaucher le libellé sur un écran étroit.
//
// Le rendu est produit sur la carte RÉELLE avec les moteurs réels
// (`buildBudgetAnalysis` + `deriveWorks` + `buildConstructionPlan`) : aucun
// montant, aucun pourcentage n'est écrit en dur dans ce fichier.
// ============================================================================

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// La carte lit les travaux personnalisés du projet via Convex : ici, aucun
// travail personnalisé (hors conditions d'accès d'ailleurs).
vi.mock("convex/react", () => ({
  useQuery: () => undefined,
  useMutation: () => async () => undefined,
}));

import { CapacityDecisionCard } from "@/components/decision/CapacityDecisionCard";
import {
  buildBudgetAnalysis,
  formatPercent,
  formatTndAmount,
  type CategoryBreakdownItem,
} from "@/lib/budgetEngine";
import { buildConstructionPlan, deriveWorks } from "@/lib/constructionPlanEngine";

/**
 * Cas de référence — mêmes ordres de grandeur que le projet signalé :
 * programme de 206 711 TND financé par un budget de 150 000 TND.
 * Financement séquentiel : Études (12 000) puis Gros œuvre (98 000) intégraux,
 * Second œuvre partiel (40 000 / 62 000), le reste reporté.
 */
const PROGRAM_TOTAL = 206_711;
const BUDGET = 150_000;

const BREAKDOWN: CategoryBreakdownItem[] = [
  { category: "etudes", label: "Études & frais préliminaires", estimatedCost: 12_000, percentage: 5.8 },
  { category: "gros_oeuvre", label: "Gros œuvre", estimatedCost: 98_000, percentage: 47.4 },
  { category: "second_oeuvre", label: "Second œuvre", estimatedCost: 62_000, percentage: 30 },
  { category: "amenagements_exterieurs", label: "Aménagements extérieurs", estimatedCost: 20_711, percentage: 10 },
  { category: "transport", label: "Transport & divers", estimatedCost: 14_000, percentage: 6.8 },
];

function renderCard() {
  const analysis = buildBudgetAnalysis({
    projectId: "project-1",
    userId: "user-1",
    projectName: "Dar tunis",
    scenarioLabel: "Standard",
    projectTotal: PROGRAM_TOTAL,
    budgetAvailable: BUDGET,
    breakdown: BREAKDOWN,
    surface: 100,
    costPerM2: 2067,
  });

  const works = deriveWorks(analysis);
  const plan = buildConstructionPlan({
    works,
    budget: analysis.availableBudget,
    selectedIds: works.map((w) => w.id),
  });

  const html = renderToStaticMarkup(
    <CapacityDecisionCard analysis={analysis} complementaryWorksEnabled={false} />,
  );

  return { analysis, works, plan, html };
}

describe("CapacityDecisionCard — cohérence des pourcentages", () => {
  it("affiche un seul pourcentage pour la part du programme financée", () => {
    const { analysis, plan, html } = renderCard();
    expect(analysis.available).toBe(true);

    // Le programme du plan = les postes chiffrés, et le financement = le budget
    // alloué : le pourcentage doit être celui de CES DEUX montants.
    expect(plan.selectedCost).toBe(PROGRAM_TOTAL);
    expect(plan.funded).toBe(BUDGET);

    const pct = formatPercent((plan.funded / plan.selectedCost) * 100);
    expect(pct).toBe(formatPercent(plan.globalPct));

    // 1) Anneau de la tuile « Capacité de construction ».
    expect(html).toContain(`Part du programme sélectionné financée : ${pct}`);
    // 2) Phrase récapitulative + barre de progression (même valeur).
    expect(html).toContain(`environ ${pct} du programme sélectionné`);
    // 3) Les montants imprimés à côté du pourcentage sont ceux du plan.
    expect(html).toContain(`sur un programme de ${formatTndAmount(plan.selectedCost)}`);
    expect(html).toContain(
      `${formatTndAmount(plan.funded)} financés sur ${formatTndAmount(plan.selectedCost)}`,
    );
  });

  it("n'affiche aucun pourcentage de programme libellé « du projet »", () => {
    const { html } = renderCard();
    // La part du PROJET (coût total estimé) et la part du PROGRAMME SÉLECTIONNÉ
    // (postes du plan) sont deux grandeurs distinctes : la carte ne doit jamais
    // faire passer la seconde pour la première.
    expect(html).not.toMatch(/[\d,]+\s*%\s*du projet/);
  });

  it("ne met aucun anneau de pourcentage sur la tuile « Travaux réalisables »", () => {
    const { html } = renderCard();
    // Un anneau sur cette tuile affichait un second pourcentage ambigu à côté
    // de celui de la capacité de construction : la tuile ne montre qu'un nombre
    // de postes.
    expect(html).not.toMatch(/Travaux réalisables : [^"<]*%/);
    expect(html).toContain("Travaux réalisables");
  });
});

describe("CapacityDecisionCard — cohérence des compteurs", () => {
  it("compte la même liste de postes dans la tuile, les groupes et la phrase", () => {
    const { plan, html } = renderCard();

    const priced = plan.works.filter((w) => w.cost > 0);
    const realisable = priced.filter((w) => w.status === "realisable");
    const partiel = priced.filter((w) => w.status === "partiel");
    const report = priced.filter((w) => w.status === "report");

    // Le plan de référence de ce test : 2 intégraux, 1 partiel, 2 reportés.
    expect(realisable.length).toBe(2);
    expect(partiel.length).toBe(1);
    expect(report.length).toBe(2);

    // Tuile « Travaux réalisables » : réalisables / total chiffré.
    expect(html).toContain(
      `${realisable.length} / ${priced.length}`,
    );
    // Groupes — même découpage, même total.
    expect(html).toContain(`Réalisables à 100 % (${realisable.length})`);
    expect(html).toContain(`Partiellement réalisables (${partiel.length})`);
    expect(html).toContain(`Non réalisables (budget actuel) (${report.length})`);
    expect(realisable.length + partiel.length + report.length).toBe(priced.length);

    // Phrase récapitulative : « retenus » = la même liste chiffrée.
    expect(html).toContain(`${priced.length} retenus, 0 exclus`);
    // Indice de la tuile « Travaux réalisables » : détail cohérent.
    expect(html).toContain(`${partiel.length} partiel · ${report.length} à reporter`);
  });
});

describe("CapacityDecisionCard — anti-chevauchement", () => {
  it("garde les largeurs minimales qui empêchent l'anneau de comprimer le texte", () => {
    const { html } = renderCard();
    // Tuile de résumé : le bloc texte ne descend pas sous 8,5 rem.
    expect(html).toContain("min-w-[8.5rem]");
    // Lignes du plan de construction : le libellé ne descend pas sous 9 rem.
    expect(html).toContain("min-w-[9rem]");
    // Les conteneurs concernés peuvent passer à la ligne au lieu de superposer.
    expect(html).toContain("flex flex-wrap items-start justify-between");
  });

  it("aligne la colonne « Réalisation » sur la largeur de l'anneau", () => {
    const { html } = renderCard();
    expect(html).toContain("w-[3.25rem]");
    expect(html).not.toContain("w-12 shrink-0 text-right");
  });
});
