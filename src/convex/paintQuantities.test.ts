/// <reference types="vite/client" />

// ============================================================================
// QUANTITÉS DE PEINTURE — « QUANTITATIF DÉTAILLÉ » (Second œuvre et finitions)
// ----------------------------------------------------------------------------
// Vérifie les valeurs demandées à travers l'interface réellement utilisée par
// l'application :
//   • projet de référence 100 m² → 10 seaux intérieurs (200 L) et 7 seaux
//     extérieurs (140 L), au seau de 20 litres sur 3 couches ;
//   • montant d'une ligne = Quantité × Prix unitaire du seau ;
//   • sous-total peinture = montant intérieur + montant extérieur, intégré au
//     sous-total du lot et donc au total du Quantitatif détaillé ;
//   • règle proportionnelle configurable (150 m² → 15 et 11 seaux, arrondi à
//     l'entier supérieur), désactivable ;
//   • paramètres modifiables par l'administrateur (données, pas affichage) ;
//   • aucun coefficient régional ni majoration cachée sur les quantités ;
//   • aucun doublon de poste de peinture (mise à jour de la ligne existante) ;
//   • aucune autre catégorie / aucun autre type de projet modifié.
// ============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { generateDqe } from "./dqeEngine.js";
import {
  DEFAULT_PAINT_QUANTITIES,
  PAINT_LINE_DESIGNATIONS,
  PAINT_QUANTITY_RANGES,
  dedupePaintLines,
  paintBucketUnit,
  paintLineRole,
  paintOutOfRange,
  paintQuantityPlan,
  parsePaintQuantities,
  replacePaintLines,
  resolvePaintQuantities,
} from "../lib/paintQuantities";

const modules = import.meta.glob("./**/*.*s");

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Lot « Second œuvre et finitions » d'un Quantitatif généré. */
const secondOeuvreLot = (dqe: any) =>
  dqe.lots.find((l: any) => l.id === "second_oeuvre");

/** Postes de peinture intérieure/extérieure d'un lot. */
const paintLines = (lot: any) =>
  (lot?.lines ?? []).filter((l: any) => paintLineRole(l.designation) !== null);

const lineByRole = (lot: any, role: "interior" | "exterior") =>
  paintLines(lot).find((l: any) => paintLineRole(l.designation) === role);

/** Projet de référence : maison 100 m² (Tunis, standard) → 198 000 TND. */
const referenceDqe = (paint?: any) =>
  generateDqe({
    category: "maison",
    surface: 100,
    floors: 1,
    totalBudget: 1980 * 100,
    paint,
  });

async function createAdminUser(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Admin Test",
      email: "admin-peinture@test.com",
      role: "admin",
      status: "active",
      subscriptionPlan: "free",
      image: undefined,
      company: undefined,
      phone: undefined,
      subscriptionEndDate: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 1. RÈGLE DE QUANTITÉS ET DE PRIX (module pur partagé)
// ════════════════════════════════════════════════════════════════════════════

describe("Barème de peinture — quantités de référence", () => {
  it("le seau de référence est le seau de 20 litres", () => {
    expect(DEFAULT_PAINT_QUANTITIES.bucketLiters).toBe(20);
    expect(paintBucketUnit(DEFAULT_PAINT_QUANTITIES)).toBe("seau de 20 litres");
    expect(DEFAULT_PAINT_QUANTITIES.referenceSurface).toBe(100);
    expect(DEFAULT_PAINT_QUANTITIES.coats).toBe(3);
  });

  it("100 m² construits : exactement 10 seaux intérieurs et 7 extérieurs", () => {
    const plan = paintQuantityPlan(100);
    expect(plan.interior.quantity).toBe(10);
    expect(plan.exterior.quantity).toBe(7);
    // Volumes demandés : 200 L et 140 L.
    expect(plan.interior.liters).toBe(200);
    expect(plan.exterior.liters).toBe(140);
    expect(plan.interior.designation).toBe(PAINT_LINE_DESIGNATIONS.interior);
    expect(plan.exterior.designation).toBe(PAINT_LINE_DESIGNATIONS.exterior);
    expect(plan.interior.unit).toBe("seau de 20 litres");
  });

  it("volume total, couches et surface de référence portés par la ligne", () => {
    const plan = paintQuantityPlan(100);
    expect(plan.interior.description).toContain("Volume total : 200 L");
    expect(plan.interior.description).toContain("10 seaux × 20 L");
    expect(plan.interior.description).toContain("3 couches");
    expect(plan.interior.description).toContain("référence 100 m²");
    expect(plan.exterior.description).toContain("Volume total : 140 L");
    expect(plan.exterior.description).toContain("7 seaux × 20 L");
    // 150 m² : le volume affiché suit les quantités proportionnelles.
    const plan150 = paintQuantityPlan(150);
    expect(plan150.interior.liters).toBe(300); // 15 seaux × 20 L
    expect(plan150.exterior.liters).toBe(220); // 11 seaux × 20 L
    expect(plan150.interior.description).toContain("Volume total : 300 L");
  });

  it("montant d'une ligne = Quantité × Prix unitaire du seau, sous-total = somme", () => {
    const plan = paintQuantityPlan(100);
    expect(plan.interior.amount).toBe(10 * plan.interior.unitPrice);
    expect(plan.exterior.amount).toBe(7 * plan.exterior.unitPrice);
    expect(plan.subtotal).toBe(plan.interior.amount + plan.exterior.amount);
    // Aucune majoration cachée : le prix unitaire retenu est exactement celui
    // du barème configuré.
    expect(plan.interior.unitPrice).toBe(DEFAULT_PAINT_QUANTITIES.interiorBucketPrice);
    expect(plan.exterior.unitPrice).toBe(DEFAULT_PAINT_QUANTITIES.exteriorBucketPrice);
  });

  it("règle proportionnelle : 150 m² → 15 seaux intérieurs et 11 extérieurs (arrondi supérieur)", () => {
    const plan = paintQuantityPlan(150);
    expect(plan.interior.quantity).toBe(15);
    expect(plan.exterior.quantity).toBe(11); // ceil(10,5)
    expect(plan.proportional).toBe(true);
  });

  it("l'arrondi est bien à l'entier supérieur (seaux entiers)", () => {
    expect(paintQuantityPlan(120).interior.quantity).toBe(12);
    expect(paintQuantityPlan(120).exterior.quantity).toBe(9); // ceil(8,4)
    expect(paintQuantityPlan(50).interior.quantity).toBe(5);
    expect(paintQuantityPlan(50).exterior.quantity).toBe(4); // ceil(3,5)
    for (const surface of [1, 33, 99, 101, 137, 999]) {
      const plan = paintQuantityPlan(surface);
      expect(Number.isInteger(plan.interior.quantity)).toBe(true);
      expect(Number.isInteger(plan.exterior.quantity)).toBe(true);
    }
  });

  it("proportionnalité désactivée : les quantités de référence sont conservées", () => {
    const config = { ...DEFAULT_PAINT_QUANTITIES, proportional: false };
    for (const surface of [100, 150, 500, 1000]) {
      const plan = paintQuantityPlan(surface, config);
      expect(plan.interior.quantity).toBe(10);
      expect(plan.exterior.quantity).toBe(7);
      expect(plan.proportional).toBe(false);
    }
  });

  it("quantités de référence et surface de référence configurables", () => {
    const plan = paintQuantityPlan(150, {
      ...DEFAULT_PAINT_QUANTITIES,
      interiorBuckets: 10,
      exteriorBuckets: 7,
      referenceSurface: 200,
    });
    expect(plan.interior.quantity).toBe(8); // ceil(150/200 × 10)
    expect(plan.exterior.quantity).toBe(6); // ceil(150/200 × 7)
  });

  it("aucun coefficient régional : le plan ne dépend que de la surface", () => {
    // La même surface donne rigoureusement les mêmes quantités et les mêmes
    // montants de peinture, quel que soit le budget (donc la région) du projet.
    const plan = paintQuantityPlan(100);
    expect(plan.interior.quantity).toBe(10);
    expect(plan.interior.unitPrice).toBe(DEFAULT_PAINT_QUANTITIES.interiorBucketPrice);
    expect(plan.subtotal).toBe(plan.interior.amount + plan.exterior.amount);
  });
});

describe("Barème de peinture — configuration administrateur", () => {
  it("valeurs par défaut appliquées quand aucune configuration n'est enregistrée", () => {
    expect(resolvePaintQuantities(undefined)).toEqual(DEFAULT_PAINT_QUANTITIES);
    expect(parsePaintQuantities(undefined)).toBeUndefined();
    expect(parsePaintQuantities("{not-json")).toBeUndefined();
  });

  it("une saisie partielle ou invalide retombe sur les défauts, jamais sur un résultat absurde", () => {
    const resolved = resolvePaintQuantities({ interiorBuckets: -5, bucketLiters: NaN } as any);
    expect(resolved.interiorBuckets).toBe(DEFAULT_PAINT_QUANTITIES.interiorBuckets);
    expect(resolved.bucketLiters).toBe(DEFAULT_PAINT_QUANTITIES.bucketLiters);
  });

  it("le JSON enregistré est relu, y compris la désactivation du calcul proportionnel", () => {
    const parsed = parsePaintQuantities(
      JSON.stringify({
        interiorBuckets: 12,
        exteriorBuckets: 8,
        bucketLiters: 15,
        referenceSurface: 100,
        coats: 2,
        proportional: false,
        interiorBucketPrice: 120,
        exteriorBucketPrice: 150,
      }),
    );
    expect(parsed).toBeDefined();
    const resolved = resolvePaintQuantities(parsed);
    expect(resolved.interiorBuckets).toBe(12);
    expect(resolved.bucketLiters).toBe(15);
    expect(resolved.coats).toBe(2);
    expect(resolved.proportional).toBe(false);
    expect(paintBucketUnit(resolved)).toBe("seau de 15 litres");
  });

  it("détecte les paramètres hors fourchette", () => {
    expect(paintOutOfRange(resolvePaintQuantities(DEFAULT_PAINT_QUANTITIES))).toEqual([]);
    const bad = paintOutOfRange(
      resolvePaintQuantities({
        ...DEFAULT_PAINT_QUANTITIES,
        interiorBuckets: PAINT_QUANTITY_RANGES.interiorBuckets.max + 1,
      }),
    );
    expect(bad.map((b) => b.key)).toContain("interiorBuckets");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. INTÉGRATION DANS LE QUANTITATIF DÉTAILLÉ (moteur DQE)
// ════════════════════════════════════════════════════════════════════════════

describe("Quantitatif détaillé — postes de peinture au seau", () => {
  it("le projet de référence 100 m² porte 10 + 7 seaux dans « Second œuvre et finitions »", () => {
    const lot = secondOeuvreLot(referenceDqe());
    const interior = lineByRole(lot, "interior");
    const exterior = lineByRole(lot, "exterior");

    expect(lot.name).toBe("Second œuvre et finitions");
    expect(interior.designation).toBe("Peinture intérieure (murs et plafonds)");
    expect(exterior.designation).toBe("Peinture extérieure (façades)");
    expect(interior.quantity).toBe(10);
    expect(exterior.quantity).toBe(7);
    expect(interior.unit).toBe("seau de 20 litres");
    expect(exterior.unit).toBe("seau de 20 litres");
    // Montant = Quantité × Prix unitaire du seau (prix du barème).
    expect(interior.unitPrice).toBe(DEFAULT_PAINT_QUANTITIES.interiorBucketPrice);
    expect(exterior.unitPrice).toBe(DEFAULT_PAINT_QUANTITIES.exteriorBucketPrice);
    expect(interior.total).toBe(10 * DEFAULT_PAINT_QUANTITIES.interiorBucketPrice);
    expect(exterior.total).toBe(7 * DEFAULT_PAINT_QUANTITIES.exteriorBucketPrice);
    // Volume, couches et surface de référence affichés dans le Quantitatif.
    expect(interior.description).toContain("Volume total : 200 L");
    expect(interior.description).toContain("3 couches");
    expect(interior.description).toContain("surface de référence 100 m²");
    expect(exterior.description).toContain("Volume total : 140 L");
    expect(interior.observations).toContain("3 couches");
    expect(interior.observations).toContain("200 L");
    expect(exterior.observations).toContain("140 L");
  });

  it("exactement deux postes de peinture : les anciennes lignes au m² sont mises à jour, pas dupliquées", () => {
    const lot = secondOeuvreLot(referenceDqe());
    const lines = paintLines(lot);
    expect(lines).toHaveLength(2);
    expect(lines.map((l: any) => l.unit)).toEqual([
      "seau de 20 litres",
      "seau de 20 litres",
    ]);
    // Aucune trace des libellés/quantités au m² du gabarit.
    expect(
      lot.lines.some((l: any) =>
        /peinture intérieure \(3 couches|peinture extérieure \(façade/.test(l.designation),
      ),
    ).toBe(false);
  });

  it("sous-total peinture = intérieur + extérieur, et sous-total du lot respecté", () => {
    const dqe = referenceDqe();
    const lot = secondOeuvreLot(dqe);
    const interior = lineByRole(lot, "interior");
    const exterior = lineByRole(lot, "exterior");
    const subtotal = interior.total + exterior.total;

    expect(subtotal).toBe(paintQuantityPlan(100).subtotal);
    // Le lot tombe exactement sur son budget (39,1 % de 198 000 TND).
    expect(lot.subtotal).toBe(Math.round(1980 * 100 * 0.391));
    expect(lot.lines.reduce((s: number, l: any) => s + l.total, 0)).toBe(lot.subtotal);
    // Total du Quantitatif = coût global de construction.
    expect(dqe.totals.total).toBe(1980 * 100);
  });

  it("150 m² : 15 seaux intérieurs et 11 extérieurs (règle proportionnelle)", () => {
    const dqe = generateDqe({
      category: "maison",
      surface: 150,
      floors: 1,
      totalBudget: 1980 * 150,
    });
    const lot = secondOeuvreLot(dqe);
    expect(lineByRole(lot, "interior").quantity).toBe(15);
    expect(lineByRole(lot, "exterior").quantity).toBe(11);
    expect(lineByRole(lot, "interior").total).toBe(15 * DEFAULT_PAINT_QUANTITIES.interiorBucketPrice);
  });

  it("un bâtiment à étages peint la surface réellement construite (tous niveaux)", () => {
    const dqe = generateDqe({
      category: "maison",
      surface: 100,
      floors: 2,
      levelSurfaces: [100, 100],
      totalBudget: 1980 * 100 + 1485 * 100,
    });
    const lot = secondOeuvreLot(dqe);
    expect(lineByRole(lot, "interior").quantity).toBe(20);
    expect(lineByRole(lot, "exterior").quantity).toBe(14);
  });

  it("le prix du seau (barème admin) pilote les montants, pas les quantités", () => {
    const lot = secondOeuvreLot(
      referenceDqe({ interiorBucketPrice: 130, exteriorBucketPrice: 165 }),
    );
    expect(lineByRole(lot, "interior").quantity).toBe(10);
    expect(lineByRole(lot, "exterior").quantity).toBe(7);
    expect(lineByRole(lot, "interior").unitPrice).toBe(130);
    expect(lineByRole(lot, "interior").total).toBe(1300);
    expect(lineByRole(lot, "exterior").total).toBe(7 * 165);
    // Quantités inchangées d'un barème à l'autre.
    expect(lineByRole(lot, "interior").quantity).toBe(
      lineByRole(secondOeuvreLot(referenceDqe()), "interior").quantity,
    );
  });

  it("aucun coefficient régional sur les quantités : le budget/région ne change ni seaux ni montants de peinture", () => {
    const tunis = secondOeuvreLot(referenceDqe());
    const gafsa = secondOeuvreLot(
      generateDqe({ category: "maison", surface: 100, floors: 1, totalBudget: 1500 * 100 }),
    );
    expect(lineByRole(gafsa, "interior").quantity).toBe(lineByRole(tunis, "interior").quantity);
    expect(lineByRole(gafsa, "exterior").quantity).toBe(lineByRole(tunis, "exterior").quantity);
    expect(lineByRole(gafsa, "interior").unitPrice).toBe(lineByRole(tunis, "interior").unitPrice);
    expect(lineByRole(gafsa, "interior").total).toBe(lineByRole(tunis, "interior").total);
    // La région ne joue que sur la répartition des AUTRES postes du lot.
    expect(gafsa.subtotal).not.toBe(tunis.subtotal);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. GARDE-FOU ANTI-DOUBLON (logique pure du gabarit)
// ════════════════════════════════════════════════════════════════════════════

describe("Anti-doublon des postes de peinture", () => {
  it("remplace les lignes existantes à leur position, sans en créer d'autres", () => {
    const legacy = [
      { d: "Enduits intérieurs (ciment, plâtre)" },
      { d: "Peinture intérieure (3 couches, finition standard)" },
      { d: "Peinture extérieure (façade, monocouche acrylique)" },
      { d: "Plomberie sanitaire" },
    ];
    const lines = replacePaintLines(legacy, {
      interior: { d: PAINT_LINE_DESIGNATIONS.interior },
      exterior: { d: PAINT_LINE_DESIGNATIONS.exterior },
    });
    expect(lines.map((l) => l.d)).toEqual([
      "Enduits intérieurs (ciment, plâtre)",
      PAINT_LINE_DESIGNATIONS.interior,
      PAINT_LINE_DESIGNATIONS.exterior,
      "Plomberie sanitaire",
    ]);
    expect(lines.filter((l) => paintLineRole(l.d) !== null)).toHaveLength(2);
  });

  it("aucun doublon quand plusieurs libellés du même poste coexistent", () => {
    const lines = dedupePaintLines([
      { d: "Peinture intérieure (3 couches)" },
      { d: PAINT_LINE_DESIGNATIONS.interior },
      { d: "Peinture extérieure (façade)" },
      { d: PAINT_LINE_DESIGNATIONS.exterior },
    ]);
    expect(lines.map((l) => l.d)).toEqual([
      PAINT_LINE_DESIGNATIONS.interior,
      PAINT_LINE_DESIGNATIONS.exterior,
    ]);
  });

  it("ne touche pas aux postes qui ne sont pas des postes de peinture", () => {
    const lines = [
      { d: "Peinture des menuiseries intérieures" },
      { d: "Couloirs et circulations (peinture + plinthes)" },
      { d: "Peinture des murs et plafonds" },
    ];
    expect(dedupePaintLines(lines)).toEqual(lines);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. PORTÉE : AUCUNE AUTRE CATÉGORIE / AUCUN AUTRE TYPE MODIFIÉ
// ════════════════════════════════════════════════════════════════════════════

describe("Portée du barème de peinture", () => {
  const otherCategories = [
    "renovation_complete",
    "renovation_cuisine",
    "renovation_salle_de_bain",
    "peinture_interieure",
    "piscine_beton",
    "local_commercial",
    "bureau",
    "entrepot",
    "plomberie_complete",
    "electricite_complete",
  ];

  it("aucun poste au seau en dehors du « Second œuvre » résidentiel", () => {
    for (const category of otherCategories) {
      const dqe = generateDqe({
        category,
        surface: 120,
        floors: 1,
        totalBudget: 200000,
      });
      const bucketLines = dqe.lots.flatMap((l: any) =>
        l.lines.filter((x: any) => /seau de \d+ litres/.test(x.unit)),
      );
      expect(bucketLines, `catégorie ${category}`).toEqual([]);
    }
  });

  it("les quantités de peinture des autres gabarits restent inchangées", () => {
    const renovation = generateDqe({
      category: "renovation_complete",
      surface: 120,
      floors: 1,
      totalBudget: 200000,
    });
    // La rénovation garde son poste au m² : la règle « seaux » ne s'y applique pas.
    const renovationPaint = paintLines(secondOeuvreLot(renovation));
    expect(renovationPaint.map((l: any) => l.quantity)).toEqual([300]);

    // Le type « Peinture intérieure » (travaux de peinture seuls) est intact.
    const peinture = generateDqe({
      category: "peinture_interieure",
      surface: 120,
      floors: 1,
      totalBudget: 40000,
    });
    const peintureLot = peinture.lots.find((l: any) => l.id === "peinture")!;
    expect(peintureLot.lines.some((l: any) => /seau de \d+ litres/.test(l.unit))).toBe(false);
  });

  it("seul le lot « Second œuvre » réagit au barème, les autres lots sont identiques", () => {
    const first = referenceDqe();
    const second = referenceDqe({ interiorBucketPrice: 300, exteriorBucketPrice: 320 });
    for (const lot of first.lots) {
      if (lot.id === "second_oeuvre") continue;
      const other = second.lots.find((l: any) => l.id === lot.id)!;
      expect(other.subtotal, `lot ${lot.id}`).toBe(lot.subtotal);
      expect(other.lines).toEqual(lot.lines);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. BOUT EN BOUT : createProject → simulateAnalysis (interface réelle)
// ════════════════════════════════════════════════════════════════════════════

describe("Barème de peinture enregistré par l'administrateur (bout en bout)", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createAdminUser(t);
  });

  async function createAndEstimate(name: string, surface: number, floors = 1) {
    const userT = t.withIdentity({ subject: adminId });
    const projectId = await userT.mutation(api.projects.createProject, {
      name,
      category: "maison" as any,
      region: "tunis" as any,
      surface,
      floors,
    });
    await userT.mutation(api.projects.simulateAnalysis, { projectId });
    return (await t.run(async (ctx) => ctx.db.get(projectId))) as any;
  }

  it("le projet de référence de 100 m² est chiffré avec 10 + 7 seaux, sans anomalie", async () => {
    const project = await createAndEstimate("Peinture 100 m²", 100);
    const lot = secondOeuvreLot(project.dqe);
    const interior = lineByRole(lot, "interior");
    const exterior = lineByRole(lot, "exterior");

    expect(paintLines(lot)).toHaveLength(2);
    expect(interior.quantity).toBe(10);
    expect(exterior.quantity).toBe(7);
    expect(interior.unit).toBe("seau de 20 litres");
    expect(interior.total).toBe(10 * DEFAULT_PAINT_QUANTITIES.interiorBucketPrice);
    expect(exterior.total).toBe(7 * DEFAULT_PAINT_QUANTITIES.exteriorBucketPrice);

    // Cohérence Quantitatif détaillé ↔ coût estimatif (aucune dérive signalée).
    expect(project.dqe.totals.total).toBe(project.costEstimate.totalCost);
    expect(project.costEstimate.levelBreakdown.anomalies).toEqual([]);
  });

  it("une modification du prix du seau recalcule les montants et l'estimation suivante", async () => {
    const before = await createAndEstimate("Peinture avant", 100);
    const interiorsBefore = lineByRole(secondOeuvreLot(before.dqe), "interior");

    const userT = t.withIdentity({ subject: adminId });
    const saved = await userT.mutation(api.bimConfig.saveBIMConfig, {
      paintQuantities: JSON.stringify({
        ...DEFAULT_PAINT_QUANTITIES,
        interiorBucketPrice: 150,
        exteriorBucketPrice: 180,
      }),
    });
    expect((saved as any).paintQuantities.interiorBucketPrice).toBe(150);

    const after = await createAndEstimate("Peinture après", 100);
    const lotAfter = secondOeuvreLot(after.dqe);
    const interiorAfter = lineByRole(lotAfter, "interior");
    const exteriorAfter = lineByRole(lotAfter, "exterior");

    // Quantités de référence conservées…
    expect(interiorAfter.quantity).toBe(interiorsBefore.quantity);
    expect(exteriorAfter.quantity).toBe(7);
    // …montants et sous-total recalculés immédiatement.
    expect(interiorAfter.unitPrice).toBe(150);
    expect(interiorAfter.total).toBe(10 * 150);
    expect(exteriorAfter.total).toBe(7 * 180);
    expect(interiorAfter.total + exteriorAfter.total).not.toBe(
      interiorsBefore.total + lineByRole(secondOeuvreLot(before.dqe), "exterior").total,
    );
    // Le lot reste exactement sur son budget et le DQE sur le coût global :
    // la hausse du prix du seau est absorbée par les autres postes du lot,
    // l'estimation globale reste celle du barème de construction.
    expect(lotAfter.subtotal).toBe(secondOeuvreLot(before.dqe).subtotal);
    expect(after.dqe.totals.total).toBe(after.costEstimate.totalCost);
    expect(after.costEstimate.levelBreakdown.anomalies).toEqual([]);
  });

  it("le calcul proportionnel est pilotable par l'administrateur (données, pas affichage)", async () => {
    const userT = t.withIdentity({ subject: adminId });
    const project = await createAndEstimate("Peinture 150 m²", 150);
    expect(lineByRole(secondOeuvreLot(project.dqe), "interior").quantity).toBe(15);
    expect(lineByRole(secondOeuvreLot(project.dqe), "exterior").quantity).toBe(11);

    await userT.mutation(api.bimConfig.saveBIMConfig, {
      paintQuantities: JSON.stringify({ ...DEFAULT_PAINT_QUANTITIES, proportional: false }),
    });

    const frozen = await createAndEstimate("Peinture 150 m² figée", 150);
    expect(lineByRole(secondOeuvreLot(frozen.dqe), "interior").quantity).toBe(10);
    expect(lineByRole(secondOeuvreLot(frozen.dqe), "exterior").quantity).toBe(7);
  });

  it("les paramètres de peinture sont exposés par la configuration BIM", async () => {
    const userT = t.withIdentity({ subject: adminId });
    await userT.mutation(api.bimConfig.saveBIMConfig, {
      paintQuantities: JSON.stringify({ ...DEFAULT_PAINT_QUANTITIES, bucketLiters: 15 }),
    });

    const config = (await t.query(api.bimConfig.getBIMConfig, {})) as any;
    expect(config.parsedPaintQuantities.bucketLiters).toBe(15);
    expect(config.parsedPaintQuantities.referenceSurface).toBe(100);
    expect(config.paintQuantityRanges.interiorBuckets).toEqual(
      PAINT_QUANTITY_RANGES.interiorBuckets,
    );
    expect(config.paintQuantitiesAreDefault).toBe(false);
  });

  it("une configuration hors fourchette est refusée par le serveur", async () => {
    const userT = t.withIdentity({ subject: adminId });
    await expect(
      userT.mutation(api.bimConfig.saveBIMConfig, {
        paintQuantities: JSON.stringify({
          ...DEFAULT_PAINT_QUANTITIES,
          interiorBuckets: PAINT_QUANTITY_RANGES.interiorBuckets.max + 5,
        }),
      }),
    ).rejects.toThrow(/hors fourchette/);
  });

  it("aucun doublon de poste de peinture dans le Quantitatif enregistré", async () => {
    const project = await createAndEstimate("Peinture sans doublon", 100);
    const allPaintLines = project.dqe.lots.flatMap((l: any) =>
      l.lines.filter((x: any) => paintLineRole(x.designation) !== null),
    );
    expect(allPaintLines).toHaveLength(2);
    const designations = allPaintLines.map((l: any) => l.designation);
    expect(new Set(designations).size).toBe(2);
  });
});
