import { describe, it, expect } from "vitest";
import { generateDqe } from "./dqeEngine";
import {
  generateRoadmap,
  syncRoadmapQuantitatif,
  type RoadmapProjectInput,
} from "./roadmapEngine";
import { resolveRoadmapQuantitatif } from "./roadmapQuantitatif";
import { scaleDqeLots, budgetScenarioFactor } from "./quantitatifCustomLogic";

// ============================================================================
// SYNCHRONISATION DES PRIX — « MON PROJET DE A À Z » ↔ QUANTITATIF DÉTAILLÉ
// ----------------------------------------------------------------------------
// Invariants vérifiés :
//   1. chaque article (désignation, quantité, unité, prix unitaire) de la
//      feuille de route est IDENTIQUE au quantitatif du même scénario ;
//   2. sous-total de catégorie = somme de ses postes ; total = somme des
//      catégories = total du quantitatif ;
//   3. planning + étapes de travaux totalisent le même montant (aucun double
//      comptage) ;
//   4. toute modification d'un prix du moteur de coût se répercute ;
//   5. les projets sans quantitatif ne perdent rien et affichent une alerte.
// ============================================================================

const SURFACE = 150;
const FLOORS = 2;

/** Quantitatif détaillé réel produit par le moteur (villa 150 m², R+1). */
function realDqe(totalBudget = 300_000) {
  return generateDqe({ category: "villa", surface: SURFACE, floors: FLOORS, totalBudget });
}

/** Estimation enregistrée cohérente avec le quantitatif (comme `projects.ts`). */
function estimateFrom(dqe: ReturnType<typeof realDqe>) {
  const total = dqe.totals.total;
  return {
    totalCost: total,
    costPerSquareMeter: dqe.totals.costPerM2,
    breakdown: [],
    budgetScenarios: {
      economique: { totalCost: Math.round(total * 0.85), costPerM2: Math.round(dqe.totals.costPerM2 * 0.85), label: "Économique", multiplier: 0.85 },
      standard: { totalCost: total, costPerM2: dqe.totals.costPerM2, label: "Standard", multiplier: 1 },
      premium: { totalCost: Math.round(total * 1.3), costPerM2: Math.round(dqe.totals.costPerM2 * 1.3), label: "Premium", multiplier: 1.3 },
    },
  };
}

function projectFor(dqe: ReturnType<typeof realDqe>): RoadmapProjectInput {
  return {
    _id: "proj_sync",
    name: "Villa synchronisée",
    category: "villa",
    region: "tunis",
    surface: SURFACE,
    surfaceTotale: 400,
    floors: FLOORS,
    selectedScenario: "standard",
    costEstimate: estimateFrom(dqe),
    quantitatif: { lots: dqe.lots },
  };
}

const lineTotal = (q: ReturnType<typeof resolveRoadmapQuantitatif>) =>
  q.lots.reduce((acc, lot) => acc + lot.lines.reduce((a, l) => a + l.total, 0), 0);

describe("quantitatif détaillé → Mon projet de A à Z", () => {
  it("reprend le total, les catégories et les articles du quantitatif", () => {
    const dqe = realDqe();
    const roadmap = generateRoadmap(projectFor(dqe));
    const q = roadmap.quantitatif!;

    expect(q.source).toBe("quantitatif_detaille");
    expect(q.totals.total).toBe(dqe.totals.total);
    expect(roadmap.budget.totalCost).toBe(dqe.totals.total);
    expect(roadmap.summary.plannedBudget).toBe(dqe.totals.total);
    expect(q.alerts).toEqual([]);

    // Catégories identiques (mêmes identifiants, mêmes libellés, sous-totaux).
    const reference = scaleDqeLots(dqe.lots, 1);
    expect(q.lots.map((l) => l.id)).toEqual(reference.map((l: any) => l.id));
    expect(q.lots.map((l) => l.name)).toEqual(reference.map((l: any) => l.name));
    expect(q.lots.map((l) => l.subtotal)).toEqual(reference.map((l: any) => Math.round(l.subtotal)));

    // Sous-total = somme réelle des postes de la catégorie.
    for (const lot of q.lots) {
      expect(lot.subtotal).toBe(lot.lines.reduce((a, l) => a + l.total, 0));
    }
    // Total = somme des postes = total du quantitatif.
    expect(lineTotal(q)).toBe(dqe.totals.total);
    // Une ligne budgétaire par catégorie, aucun poste ajouté (ni « autorisations »).
    expect(roadmap.budget.scenarios.find((s) => s.key === "standard")!.rows.map((r) => r.key)).toEqual(
      q.lots.map((l) => l.id),
    );
  });

  it("affiche les mêmes quantités, unités et prix unitaires que le quantitatif", () => {
    const dqe = realDqe();
    const roadmap = generateRoadmap(projectFor(dqe));
    const reference = scaleDqeLots(dqe.lots, 1);

    for (const [lotIndex, lot] of roadmap.quantitatif!.lots.entries()) {
      const refLines = reference[lotIndex].lines;
      expect(lot.lines).toHaveLength(refLines.length);
      for (const [index, line] of lot.lines.entries()) {
        const ref = refLines[index];
        expect(line.designation).toBe(ref.designation);
        expect(line.unit).toBe(ref.unit);
        expect(line.quantity).toBe(ref.quantity);
        expect(line.unitPrice).toBe(ref.unitPrice);
        expect(line.total).toBe(Math.round(ref.total));
      }
    }
  });

  it("répartit le planning et les étapes de travaux sur le total du quantitatif", () => {
    const dqe = realDqe();
    const roadmap = generateRoadmap(projectFor(dqe));
    const total = roadmap.budget.totalCost;
    expect(roadmap.planning.reduce((a, t) => a + t.cost, 0)).toBe(total);
    expect(roadmap.construction.reduce((a, c) => a + c.budgetEstime, 0)).toBe(total);
  });

  it("synchronise les matériaux (quantités, unités, prix unitaires, montants)", () => {
    const dqe = realDqe();
    const roadmap = generateRoadmap(projectFor(dqe));
    const materials = roadmap.materials ?? [];
    expect(materials.length).toBeGreaterThan(0);

    // Chaque matériau provient d'un article « materiaux » du quantitatif.
    const dqeMaterials = roadmap.quantitatif!.lots
      .flatMap((lot) => lot.lines.filter((l) => l.nature === "materiaux"))
      .filter((l) => l.quantity > 0);
    for (const material of materials) {
      const source = dqeMaterials.find(
        (l) => l.designation === material.name && l.unit === material.unit,
      );
      expect(source).toBeTruthy();
      expect(material.quantity).toBeGreaterThan(0);
      expect(material.unitPrice).toBeGreaterThan(0);
      expect(material.total).toBeGreaterThan(0);
    }
  });

  it("répercute une modification de prix du moteur de coût", () => {
    const dqe = realDqe();
    const before = generateRoadmap(projectFor(dqe));

    // Prix unitaire modifié dans le quantitatif (ex. acier), montants et
    // sous-totaux recalculés comme le fait le moteur.
    const modified = structuredClone(dqe);
    const lot = modified.lots.find((l) => l.lines.some((line) => line.nature === "materiaux"))!;
    const line = lot.lines.find((l) => l.nature === "materiaux")!;
    line.unitPrice = Math.round(line.unitPrice * 1.5 * 100) / 100;
    line.total = Math.round(line.quantity * line.unitPrice);
    lot.subtotal = lot.lines.reduce((a, l) => a + l.total, 0);
    const newTotal = modified.lots.reduce((a, l) => a + l.subtotal, 0);
    modified.totals.total = newTotal;
    modified.totals.costPerM2 = Math.round(newTotal / (SURFACE * FLOORS));
    const modifiedDqe = modified as unknown as ReturnType<typeof realDqe>;

    const after = generateRoadmap(projectFor(modifiedDqe));
    const rewritten = after.quantitatif!.lots
      .flatMap((l) => l.lines)
      .find((l) => l.lotId === lot.id && l.designation === line.designation)!;
    expect(rewritten.unitPrice).toBeCloseTo(line.unitPrice, 2);
    expect(rewritten.total).toBe(line.total);
    expect(after.budget.totalCost).not.toBe(before.budget.totalCost);
    expect(after.budget.totalCost).toBe(newTotal);
  });

  it("respecte les scénarios budgétaires (montants du quantitatif mis à l'échelle)", () => {
    const dqe = realDqe();
    const roadmap = generateRoadmap(projectFor(dqe));
    const q = roadmap.quantitatif!;
    expect(q.scenarios.map((s) => s.key)).toEqual(["economique", "standard", "premium"]);

    const standard = q.scenarios.find((s) => s.key === "standard")!;
    expect(standard.totalCost).toBe(dqe.totals.total);

    for (const key of ["economique", "premium"] as const) {
      const scenario = q.scenarios.find((s) => s.key === key)!;
      // Chaque scénario est la somme de SES catégories (aucun écart interne).
      expect(scenario.rows.reduce((a, r) => a + r.amount, 0)).toBe(scenario.totalCost);
      // Montant cible du scénario de l'estimation : seul un écart d'arrondi au
      // dinar près est admis (il est signalé dans `alerts` s'il dépasse 1 TND).
      const target = roadmap.budget.scenarios.find((s) => s.key === key)!.totalCost;
      expect(Math.abs(target - scenario.totalCost)).toBeLessThanOrEqual(5);
    }
    expect(q.scenarios.find((s) => s.key === "economique")!.totalCost).toBeLessThan(standard.totalCost);
    expect(q.scenarios.find((s) => s.key === "premium")!.totalCost).toBeGreaterThan(standard.totalCost);
  });

  it("applique le scénario Personnalisé (article modifié) sans toucher aux scénarios d'origine", () => {
    const dqe = realDqe();
    const reference = scaleDqeLots(dqe.lots, 1);
    const lot = reference.find((l: any) => l.id === "gros_oeuvre") ?? reference[0];
    const line = lot.lines.find((l: any) => l.nature === "materiaux") ?? lot.lines[0];

    const input = projectFor(dqe);
    input.selectedScenario = "personnalise";
    input.quantitatif = {
      lots: dqe.lots,
      modifications: [
        {
          lineKey: `${lot.id}::${lot.lines.indexOf(line)}`,
          lotId: lot.id,
          lotName: lot.name,
          lineIndex: lot.lines.indexOf(line),
          baseDesignation: line.designation,
          designation: line.designation,
          unit: line.unit,
          quantity: line.quantity,
          unitPrice: Math.round(line.unitPrice * 2 * 100) / 100,
          nature: line.nature,
          priceScenario: "standard",
          replacedArticle: false,
          updatedAt: 0,
        },
      ],
    };

    const roadmap = generateRoadmap(input);
    const q = roadmap.quantitatif!;
    expect(q.scenario).toBe("personnalise");
    expect(roadmap.budget.selected).toBe("personnalise");
    expect(q.scenarios.map((s) => s.key)).toContain("personnalise");

    // Le total du scénario Personnalisé est supérieur de la modification.
    const expectedDelta = Math.round(line.quantity * line.unitPrice);
    expect(q.totals.total).toBe(dqe.totals.total + expectedDelta);
    expect(roadmap.budget.totalCost).toBe(q.totals.total);

    // Les scénarios Économique / Standard / Premium restent inchangés.
    const standard = q.scenarios.find((s) => s.key === "standard")!;
    expect(standard.totalCost).toBe(dqe.totals.total);
    expect(budgetScenarioFactor(estimateFrom(dqe).budgetScenarios, "standard")).toBe(1);
  });

  it("conserve la progression saisie lors d'une resynchronisation", () => {
    const dqe = realDqe();
    const roadmap = generateRoadmap(projectFor(dqe));
    const withProgress = {
      ...roadmap,
      planning: roadmap.planning.map((t, i) =>
        i === 0 ? { ...t, progress: 60, status: "in_progress" as const } : t,
      ),
      construction: roadmap.construction.map((c, i) =>
        i === 0 ? { ...c, status: "done" as const } : c,
      ),
    };
    const synced = syncRoadmapQuantitatif(withProgress, projectFor(dqe));
    expect(synced.planning[0].progress).toBe(60);
    expect(synced.planning[0].status).toBe("in_progress");
    expect(synced.construction[0].status).toBe("done");
    expect(synced.planning.reduce((a, t) => a + t.cost, 0)).toBe(synced.budget.totalCost);
  });

  it("n'utilise aucun montant propre : la répartition BIM est ignorée quand le quantitatif existe", () => {
    const dqe = realDqe();
    const input = projectFor(dqe);
    input.costEstimate!.breakdown = [
      {
        category: "gros_oeuvre",
        label: "Ancienne répartition indépendante",
        estimatedCost: 999_999,
        percentage: 100,
        items: [{ name: "Prix obsolète", quantity: 1, unit: "u", unitPrice: 999_999, totalPrice: 999_999 }],
      },
    ];
    const roadmap = generateRoadmap(input);
    const standard = roadmap.budget.scenarios.find((s) => s.key === "standard")!;
    expect(standard.rows.some((r) => r.amount === 999_999)).toBe(false);
    expect(roadmap.budget.totalCost).toBe(dqe.totals.total);
    expect(roadmap.materials?.some((m) => m.name === "Prix obsolète")).toBeFalsy();
  });

  it("vérifie l'invariant Montant = Quantité × Prix unitaire sur chaque poste", () => {
    const roadmap = generateRoadmap(projectFor(realDqe()));
    for (const line of roadmap.quantitatif!.lots.flatMap((lot) => lot.lines)) {
      // Le prix unitaire est arrondi au centime (même règle que le quantitatif).
      expect(Math.abs(line.total - line.quantity * line.unitPrice)).toBeLessThanOrEqual(
        Math.max(1, Math.abs(line.quantity) * 0.01),
      );
    }
  });

  it("signale explicitement l'absence de quantitatif sans inventer de prix", () => {
    const input = projectFor(realDqe());
    delete input.quantitatif;
    const roadmap = generateRoadmap(input);
    expect(roadmap.quantitatif!.source).toBe("estimation");
    expect(roadmap.quantitatif!.alerts.length).toBeGreaterThan(0);
    // L'estimation enregistrée reste la référence : aucun montant perdu.
    expect(roadmap.budget.totalCost).toBeGreaterThan(0);
    expect(roadmap.materials).toBeDefined();
  });
});
