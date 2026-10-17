// ============================================================================
// SURFACE COUVERTE — SYNCHRONISATION BIM / DQE / QUANTITATIF DÉTAILLÉ
// ----------------------------------------------------------------------------
// La barre de surface du formulaire « Nouveau projet » ne fait que choisir un
// NOMBRE ; toute la chaîne de calcul doit ensuite réagir à ce nombre. Ce test
// emprunte exactement le chemin du backend (`simulateAnalysis`) :
//
//   surface → moteur BIM (`runBIMEstimation`) → budget clé en main
//           → générateur DQE / quantitatif détaillé (`generateDqe`)
//
// Il vérifie, pour les plages réelles de chaque type (cuisine 8–12, salle de
// bain 4–8, piscine 15–50, autres 50–300) :
//   • le coût total augmente avec la surface ;
//   • les quantités des postes « au m² » suivent la surface ;
//   • l'invariant du quantitatif « Montant = Quantité × P.U. » tient ;
//   • le total du DQE reste calé sur le budget du moteur BIM.
//
// Aucun montant n'est inventé : tout provient des moteurs réels de la
// plateforme (marché de Tunis, scénario Standard).
// ============================================================================

import { describe, it, expect } from "vitest";

import { generateDqe, type DqeResult } from "@/convex/dqeEngine";
import { REGION_COST_M2, runBIMEstimation } from "@/convex/bimEngine";
import { surfaceRuleForCategory } from "@/convex/projectTypes";
import { regionCostFactor } from "@/lib/regionImpact";

const REGION = "tunis";
const FLOORS = 1;

/** Chaîne réelle surface → BIM → DQE (identique à `simulateAnalysis`). */
function chain(category: string, surface: number) {
  const bim = runBIMEstimation(category, surface, FLOORS, REGION, "standard");
  const totalBudget = bim.costEstimate.totalCost;
  const dqe = generateDqe({
    category,
    surface,
    floors: FLOORS,
    totalBudget,
    // Même coefficient régional que `simulateAnalysis` (barème national × grille).
    regionFactor: regionCostFactor(REGION_COST_M2, REGION, "standard"),
    regionLabel: "Tunis",
  });
  return { totalBudget, dqe };
}

const findLine = (dqe: DqeResult, designation: string) =>
  dqe.lots.flatMap((lot) => lot.lines).find((line) => line.designation === designation);

/** Poste de référence clairement proportionnel à la surface, par type. */
const AREA_LINE: Record<string, string> = {
  renovation_cuisine: "Revêtement de sol (carrelage grès cérame)",
  renovation_salle_de_bain: "Démolition carrelage et faïence",
  piscine: "Terrassement et excavation piscine",
};

const CASES = [
  "renovation_cuisine",
  "renovation_salle_de_bain",
  "piscine",
  "maison",
] as const;

describe("surface → BIM → DQE : le coût total suit la surface", () => {
  it("le budget clé en main augmente avec la surface, dans la plage de chaque type", () => {
    for (const category of CASES) {
      const rule = surfaceRuleForCategory(category);
      const low = chain(category, rule.min).totalBudget;
      const mid = chain(category, rule.defaultValue).totalBudget;
      const high = chain(category, rule.max).totalBudget;
      expect(low, category).toBeGreaterThan(0);
      expect(mid, category).toBeGreaterThan(low);
      expect(high, category).toBeGreaterThan(mid);
    }
  });
});

describe("surface → quantitatif détaillé : les quantités suivent la surface", () => {
  it("les postes « au m² » croissent avec la surface (cuisine, SdB, piscine)", () => {
    for (const category of Object.keys(AREA_LINE)) {
      const designation = AREA_LINE[category];
      const rule = surfaceRuleForCategory(category);
      const low = findLine(chain(category, rule.min).dqe, designation);
      const high = findLine(chain(category, rule.max).dqe, designation);
      expect(low, `${category}:${designation}`).toBeDefined();
      expect(high, `${category}:${designation}`).toBeDefined();
      expect(high!.quantity, `${category}:${designation}`).toBeGreaterThan(low!.quantity);
    }
  });

  it("le budget du moteur BIM reste la référence ; seul le Second œuvre réel s'en écarte", () => {
    for (const category of CASES) {
      const rule = surfaceRuleForCategory(category);
      for (const surface of [rule.min, rule.defaultValue, rule.max]) {
        const { totalBudget, dqe } = chain(category, surface);
        const label = `${category}@${surface}`;
        // La somme des budgets alloués retombe sur le budget BIM.
        const allocated = dqe.lots.reduce(
          (s, l) => s + (l.allocatedSubtotal ?? l.subtotal),
          0,
        );
        expect(allocated, label).toBe(Math.round(totalBudget));
        // Le total réel = budget + écart du lot « Second œuvre et finitions ».
        const realDelta = dqe.lots.reduce(
          (s, l) => s + (l.subtotal - (l.allocatedSubtotal ?? l.subtotal)),
          0,
        );
        expect(dqe.totals.total, label).toBe(Math.round(totalBudget) + realDelta);
        // Tous les autres lots gardent exactement leur budget alloué.
        for (const lot of dqe.lots) {
          if (lot.id === "second_oeuvre") continue;
          expect(lot.subtotal, `${label} / ${lot.name}`).toBe(
            lot.allocatedSubtotal ?? lot.subtotal,
          );
        }
        expect(dqe.referenceTotal, label).toBe(Math.round(totalBudget));
      }
    }
  });
});

describe("invariant du quantitatif : Montant = Quantité × P.U.", () => {
  it("tient sur chaque ligne, pour les bornes de chaque type", () => {
    for (const category of CASES) {
      const rule = surfaceRuleForCategory(category);
      for (const surface of [rule.min, rule.max]) {
        const { dqe } = chain(category, surface);
        for (const lot of dqe.lots) {
          for (const line of lot.lines) {
            if (!(line.quantity > 0)) continue;
            const product = line.quantity * line.unitPrice;
            const tolerance = Math.max(1, Math.abs(line.total) * 0.01);
            expect(
              Math.abs(product - line.total),
              `${category}@${surface} · ${line.designation}`,
            ).toBeLessThanOrEqual(tolerance);
          }
        }
      }
    }
  });
});
