// ============================================================================
// PLAN DE CONSTRUCTION — emplacement des travaux complémentaires
// ----------------------------------------------------------------------------
// Vérifie sur le rendu RÉEL de la carte « Capacité de construction » que les
// travaux complémentaires personnalisés (piscine, garage, jardin, cuisine
// extérieure…) apparaissent UNIQUEMENT en fin de plan, immédiatement APRÈS
// « Main-d'œuvre », et que leur montant entre dans le total du programme.
// ============================================================================

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

/** Travaux complémentaires renvoyés par la requête Convex du projet. */
const DATA = vi.hoisted(() => {
  const works = [
    {
      key: "piscine",
      label: "Piscine",
      icon: "Waves",
      category: "piscine",
      surface: 120,
      finishLevel: "standard",
      materials: 21000,
      equipments: 9000,
      labor: 5000,
      transport: 700,
      studies: 1300,
      total: 37000,
      lines: [
        {
          designation: "Bassin béton armé 8 × 4 m",
          quantity: 24,
          unit: "m²",
          unitPrice: 875,
          total: 21000,
          nature: "materiaux",
        },
        {
          designation: "Filtration, pompe et éclairage",
          quantity: 1,
          unit: "lot",
          unitPrice: 9000,
          total: 9000,
          nature: "equipements",
        },
        {
          designation: "Pose et raccordement",
          quantity: 1,
          unit: "lot",
          unitPrice: 5000,
          total: 5000,
          nature: "main_oeuvre",
        },
        {
          designation: "Évacuation des terres",
          quantity: 1,
          unit: "lot",
          unitPrice: 700,
          total: 700,
          nature: "transport",
        },
        {
          designation: "Études et mise en service",
          quantity: 1,
          unit: "lot",
          unitPrice: 1300,
          total: 1300,
          nature: "etudes",
        },
      ],
    },
    {
      key: "garage",
      label: "Garage",
      icon: "Car",
      category: "garage",
      surface: 24,
      finishLevel: "standard",
      materials: 12000,
      equipments: 0,
      labor: 5000,
      transport: 600,
      studies: 400,
      total: 18000,
      lines: [
        {
          designation: "Dalle et élévations du garage",
          quantity: 24,
          unit: "m²",
          unitPrice: 500,
          total: 12000,
          nature: "materiaux",
        },
        {
          designation: "Montage et finitions",
          quantity: 1,
          unit: "lot",
          unitPrice: 5000,
          total: 5000,
          nature: "main_oeuvre",
        },
        {
          designation: "Transport des matériaux",
          quantity: 1,
          unit: "lot",
          unitPrice: 600,
          total: 600,
          nature: "transport",
        },
        {
          designation: "Études et contrôle",
          quantity: 1,
          unit: "lot",
          unitPrice: 400,
          total: 400,
          nature: "etudes",
        },
      ],
    },
  ];
  return { works, total: works.reduce((sum, w) => sum + w.total, 0) };
});

vi.mock("convex/react", () => ({
  useQuery: () => ({
    keys: DATA.works.map((w) => w.key),
    works: DATA.works,
    total: DATA.total,
    solarPanels: 3,
  }),
  useMutation: () => async () => undefined,
}));

import { CapacityDecisionCard } from "@/components/decision/CapacityDecisionCard";
import {
  buildBudgetAnalysis,
  formatTndAmount,
  type CategoryBreakdownItem,
} from "@/lib/budgetEngine";
import { deriveWorks } from "@/lib/constructionPlanEngine";

const BREAKDOWN: CategoryBreakdownItem[] = [
  { category: "etudes", label: "Études & frais préliminaires", estimatedCost: 7_920, percentage: 5 },
  { category: "gros_oeuvre", label: "Gros œuvre", estimatedCost: 38_927, percentage: 25 },
  { category: "second_oeuvre", label: "Second œuvre", estimatedCost: 62_000, percentage: 40 },
  // La main-d'œuvre de la répartition : elle reste AVANT les travaux
  // complémentaires dans le plan.
  { category: "main_oeuvre", label: "Main-d'œuvre", estimatedCost: 9_000, percentage: 6 },
  { category: "amenagements_exterieurs", label: "Aménagements extérieurs", estimatedCost: 4_000, percentage: 3 },
];

function buildCase() {
  const analysis = buildBudgetAnalysis({
    projectId: "project-1",
    userId: "user-1",
    projectName: "Villa avec piscine",
    scenarioLabel: "Standard",
    // Coût de construction (hors travaux complémentaires) : la carte ajoute
    // elle-même les travaux personnalisés au coût total du projet.
    projectTotal: 121_847,
    budgetAvailable: 500_000,
    breakdown: BREAKDOWN,
    surface: 120,
    costPerM2: 1_015,
  });

  const html = renderToStaticMarkup(
    <CapacityDecisionCard analysis={analysis} projectId="project-1" />,
  );

  const planSection = html.slice(
    html.indexOf("Plan de construction selon votre budget"),
    html.indexOf("Priorisation intelligente"),
  );

  return { analysis, html, planSection };
}

describe("CapacityDecisionCard — travaux complémentaires en fin de plan", () => {
  it("termine le plan par les travaux complémentaires, après « Main-d'œuvre »", () => {
    const { planSection } = buildCase();

    // L'apostrophe est échappée par le rendu serveur (`&#x27;`).
    const laborAt = planSection.search(/Main-d(?:&#x27;|')œuvre/);
    const poolAt = planSection.indexOf("Piscine");
    const garageAt = planSection.indexOf("Garage");

    expect(laborAt).toBeGreaterThanOrEqual(0);
    expect(poolAt).toBeGreaterThan(laborAt);
    expect(garageAt).toBeGreaterThan(poolAt);
  });

  it("affiche chaque travail une seule fois dans le plan (aucun doublon)", () => {
    const { planSection } = buildCase();

    expect((planSection.match(/Piscine/g) ?? []).length).toBe(1);
    expect((planSection.match(/Garage/g) ?? []).length).toBe(1);
  });

  it("intègre les travaux complémentaires au total du programme", () => {
    const { analysis, html, planSection } = buildCase();
    const baseCost = deriveWorks(analysis).reduce((s, w) => s + w.cost, 0);
    const total = baseCost + DATA.total;

    expect(planSection).toContain("37 000 TND");
    expect(planSection).toContain("18 000 TND");
    // Total du programme = postes de construction + main-d'œuvre + travaux.
    expect(planSection).toContain(formatTndAmount(total));
    // Même montant que le « Coût total estimatif du projet » de la page de
    // résultat : l'estimation et le plan restent synchronisés.
    expect(html).toContain("Coût total estimatif du projet");
    expect(html).toContain(formatTndAmount(total));
  });
});
