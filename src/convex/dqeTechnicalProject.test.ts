/// <reference types="vite/client" />

// ============================================================================
// PLOMBERIE & ÉLECTRICITÉ — SYNCHRONISATION DE BOUT EN BOUT
// ----------------------------------------------------------------------------
// Chemin réel de l'application :
//   createProject (surface + équipements déclarés) → simulateAnalysis
//   (moteur BIM + Quantitatif détaillé) → projet enregistré.
// Vérifie que les quantités des postes techniques suivent la surface ET les
// équipements du projet, et que TOUS les montants restent synchronisés :
// DQE ↔ coût de construction ↔ scénarios ↔ répartition par catégorie.
// ============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

async function createAdminUser(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Admin DQE",
      email: "admin-dqe-technique@test.com",
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

async function createAndEstimate(
  t: ReturnType<typeof convexTest>,
  userId: string,
  input: {
    name: string;
    surface: number;
    floors?: number;
    bathrooms?: number;
    kitchens?: number;
    wcs?: number;
    category?: string;
  },
) {
  const userT = t.withIdentity({ subject: userId });
  const projectId = await userT.mutation(api.projects.createProject, {
    name: input.name,
    category: (input.category ?? "maison") as any,
    region: "medenine" as any,
    surface: input.surface,
    floors: input.floors ?? 1,
    bathrooms: input.bathrooms,
    kitchens: input.kitchens,
    wcs: input.wcs,
  });
  await userT.mutation(api.projects.simulateAnalysis, { projectId });
  const project = await t.run(async (ctx) => ctx.db.get(projectId));
  return project as ProjectLike;
}

type DqeLineLike = {
  designation: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  labor?: { total: number };
};

type DqeLotLike = {
  id: string;
  name: string;
  subtotal: number;
  lines: DqeLineLike[];
};

type ProjectLike = {
  dqe: {
    lots: DqeLotLike[];
    totals: { total: number; costPerM2: number };
  };
  costEstimate: {
    totalCost: number;
    costPerSquareMeter: number;
    budgetScenarios: Record<
      "economique" | "standard" | "premium",
      { totalCost: number }
    >;
    breakdown: { estimatedCost: number }[];
    levelBreakdown: { realBuiltArea: number; anomalies: unknown[] };
  };
};

const technicalLine = (
  project: ProjectLike,
  designation: string,
): DqeLineLike => {
  const line = project.dqe.lots
    .flatMap((lot) => lot.lines)
    .find((l) => l.designation === designation);
  if (!line) throw new Error(`Poste introuvable : ${designation}`);
  return line;
};

describe("Quantitatif détaillé : plomberie et électricité adaptées au projet", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    userId = await createAdminUser(t);
  });

  it("maison 100 m² avec 3 SdB / 2 cuisines / 3 WC : quantités majorées, prix du barème", () => {
    return (async () => {
      const project = await createAndEstimate(t, userId, {
        name: "Maison équipée",
        surface: 100,
        bathrooms: 3,
        kitchens: 2,
        wcs: 3,
      });
      const plumbing = technicalLine(project, "Plomberie sanitaire");
      const electricity = technicalLine(project, "Électricité");

      // Surface construite 100 m² + équipements supplémentaires.
      expect(plumbing.quantity).toBeGreaterThan(100);
      expect(electricity.quantity).toBeGreaterThan(100);
      // Prix unitaire = barème national (Médenine = base 100 %).
      expect(plumbing.unitPrice).toBe(85);
      expect(electricity.unitPrice).toBe(65);
      expect(plumbing.total).toBe(Math.round(plumbing.quantity * 85));
      expect(electricity.total).toBe(Math.round(electricity.quantity * 65));
      // La main-d'œuvre du barème est incluse, jamais recomptée.
      expect(plumbing.labor!.total).toBe(Math.round(plumbing.quantity * 35));
      expect(electricity.labor!.total).toBe(Math.round(electricity.quantity * 25));
    })();
  });

  it("maison 100 m² sans équipement déclaré : quantité = surface, prix du barème", async () => {
    const project = await createAndEstimate(t, userId, {
      name: "Maison 100",
      surface: 100,
    });
    expect(technicalLine(project, "Plomberie sanitaire").quantity).toBe(100);
    expect(technicalLine(project, "Électricité").quantity).toBe(100);
  });

  it("appartement 80 m² : quantités à 80 m², coût global = total du DQE", async () => {
    const project = await createAndEstimate(t, userId, {
      name: "Appartement 80",
      surface: 80,
      category: "appartement",
      bathrooms: 1,
      kitchens: 1,
      wcs: 1,
    });
    expect(technicalLine(project, "Plomberie sanitaire").quantity).toBe(80);
    expect(technicalLine(project, "Électricité").quantity).toBe(80);
    expect(project.costEstimate.totalCost).toBe(project.dqe.totals.total);
    expect(project.costEstimate.costPerSquareMeter).toBe(project.dqe.totals.costPerM2);
    expect(project.costEstimate.levelBreakdown.anomalies).toEqual([]);
  });

  it("villa 200 m² sur 2 niveaux : la quantité suit la surface réellement construite", async () => {
    const project = await createAndEstimate(t, userId, {
      name: "Villa 200",
      surface: 100,
      floors: 2,
      category: "villa",
    });
    expect(technicalLine(project, "Plomberie sanitaire").quantity).toBe(200);
    expect(technicalLine(project, "Électricité").quantity).toBe(200);
    expect(project.costEstimate.levelBreakdown.realBuiltArea).toBe(200);
  });

  it("aucune autre catégorie de travaux n'est retouchée par l'adaptation", async () => {
    const plain = await createAndEstimate(t, userId, {
      name: "Maison standard",
      surface: 100,
    });
    const equipped = await createAndEstimate(t, userId, {
      name: "Maison équipée",
      surface: 100,
      bathrooms: 3,
      kitchens: 2,
      wcs: 3,
    });

    for (const lot of plain.dqe.lots) {
      if (lot.id === "second_oeuvre") continue;
      const other = equipped.dqe.lots.find((l) => l.id === lot.id)!;
      expect(other.subtotal, lot.name).toBe(lot.subtotal);
    }
    // Seul le lot des postes techniques porte l'écart.
    expect(equipped.costEstimate.totalCost).toBeGreaterThan(
      plain.costEstimate.totalCost,
    );
  });

  it("scénarios Économique / Standard / Premium restent ordonnés et synchronisés", async () => {
    const project = await createAndEstimate(t, userId, {
      name: "Maison scénarios",
      surface: 120,
      bathrooms: 2,
    });
    const ce = project.costEstimate;
    expect(ce.budgetScenarios.standard.totalCost).toBe(ce.totalCost);
    expect(ce.budgetScenarios.economique.totalCost).toBeLessThan(
      ce.budgetScenarios.standard.totalCost,
    );
    expect(ce.budgetScenarios.premium.totalCost).toBeGreaterThan(
      ce.budgetScenarios.standard.totalCost,
    );
    // La répartition par grande catégorie retombe sur le total (tolérance des
    // arrondis d'un dinar par catégorie, comme pour le total du DQE).
    const sumBreakdown = ce.breakdown.reduce(
      (s, c) => s + c.estimatedCost,
      0,
    );
    expect(Math.abs(sumBreakdown - ce.totalCost)).toBeLessThanOrEqual(
      ce.breakdown.length,
    );
  });
});
