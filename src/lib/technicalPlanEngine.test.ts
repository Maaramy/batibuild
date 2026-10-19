import { describe, expect, it } from "vitest";

import {
  aggregateTechnicalQuantities,
  generateElectricalPlan,
  generatePlumbingPlan,
  sizeCircuit,
  technicalShaft,
} from "./technicalPlanEngine";
import type { FloorPlan, FloorPlanVariant } from "./floorPlanEngine";
import { generateFloorPlans, repairFloorPlan } from "./floorPlanEngine";
import { buildTechnicalCostSync, priceQuantities } from "./technicalPlanPricing";

function house100(): FloorPlanVariant {
  const variants = generateFloorPlans({
    category: "maison",
    surface: 100,
    floors: 1,
    bedrooms: 2,
    bathrooms: 1,
    kitchens: 1,
    wcs: 1,
  });
  const variant = variants[0];
  return {
    ...variant,
    floors: variant.floors.map((f) =>
      repairFloorPlan({
        ...f,
        rooms: f.rooms.map((r) => ({ ...r, doors: [...r.doors], windows: [...r.windows] })),
      }),
    ),
  };
}

function buildingR2(): FloorPlanVariant {
  const variants = generateFloorPlans({
    category: "maison",
    surface: 160,
    floors: 2,
    bedrooms: 4,
    bathrooms: 2,
    kitchens: 1,
    wcs: 2,
  });
  const variant = variants[0];
  return {
    ...variant,
    floors: variant.floors.map((f) =>
      repairFloorPlan({
        ...f,
        rooms: f.rooms.map((r) => ({ ...r, doors: [...r.doors], windows: [...r.windows] })),
      }),
    ),
  };
}

const inside = (plan: FloorPlan, x: number, y: number) =>
  x >= -0.01 && y >= -0.01 && x <= plan.length + 0.01 && y <= plan.width + 0.01;

describe("plan de plomberie — maison 100 m² (cuisine, SDB, WC)", () => {
  const variant = house100();
  const floor = variant.floors[0];
  const plan = generatePlumbingPlan({
    level: 0,
    floor,
    floors: variant.floors,
    context: { bathrooms: 1, kitchens: 1, wcs: 1, dishwasher: true, laundry: true, waterHeater: true },
  });

  it("utilise la surface et l'emprise réelles du plan architectural", () => {
    expect(plan.area).toBeCloseTo(floor.area, 5);
    expect(plan.length).toBeCloseTo(floor.length, 5);
    expect(plan.width).toBeCloseTo(floor.width, 5);
  });

  it("place les appareils exigés dans les pièces existantes", () => {
    const kinds = plan.fixtures.map((f) => f.kind);
    expect(kinds).toContain("wc");
    expect(kinds).toContain("lavabo");
    expect(kinds).toContain("douche");
    expect(kinds).toContain("evier");
    expect(kinds).toContain("chauffe_eau");

    for (const fixture of plan.fixtures) {
      const room = floor.rooms.find((r) => r.id === fixture.roomId);
      expect(room).toBeTruthy();
      const eps = 0.2;
      expect(fixture.x).toBeGreaterThanOrEqual(room!.x - eps);
      expect(fixture.y).toBeGreaterThanOrEqual(room!.y - eps);
      expect(fixture.x).toBeLessThanOrEqual(room!.x + room!.w + eps);
      expect(fixture.y).toBeLessThanOrEqual(room!.y + room!.h + eps);
    }
  });

  it("aucun appareil ne se chevauche (distance minimale)", () => {
    for (let i = 0; i < plan.fixtures.length; i++) {
      for (let j = i + 1; j < plan.fixtures.length; j++) {
        const a = plan.fixtures[i];
        const b = plan.fixtures[j];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0.5);
      }
    }
  });

  it("trace eau froide, eau chaude, évacuation et ventilation dans l'emprise", () => {
    const networks = new Set(plan.pipes.map((p) => p.network));
    expect(networks.has("eau_froide")).toBe(true);
    expect(networks.has("eau_chaude")).toBe(true);
    expect(networks.has("evacuation")).toBe(true);
    expect(networks.has("ventilation")).toBe(true);
    for (const pipe of plan.pipes) {
      for (const point of pipe.points) {
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
        expect(inside(floor, point.x, point.y)).toBe(true);
      }
      expect(pipe.lengthM).toBeGreaterThan(0);
    }
    expect(plan.pipes.some((p) => p.network === "evacuation" && p.dn === 100)).toBe(true);
    expect(plan.pipes.some((p) => p.network === "eau_froide" && p.dn === 16)).toBe(true);
  });

  it("produit un quantitatif cohérent avec les appareils et les longueurs", () => {
    const wc = plan.quantities.find((q) => q.id === "fix-wc");
    expect(wc?.quantity).toBe(plan.fixtures.filter((f) => f.kind === "wc").length);
    const cold = plan.quantities.filter((q) => q.id.startsWith("pipe-eau_froide"));
    expect(cold.length).toBeGreaterThan(0);
    expect(cold.every((q) => q.quantity > 0)).toBe(true);
    const expectedCold = plan.pipes
      .filter((p) => p.network === "eau_froide")
      .reduce((n, p) => n + p.lengthM, 0);
    expect(cold.reduce((n, q) => n + q.quantity, 0)).toBeCloseTo(expectedCold, 1);
    expect(plan.quantities.every((q) => Number.isFinite(q.quantity) && q.quantity >= 0)).toBe(true);
  });
});

describe("plan électrique — maison 100 m²", () => {
  const variant = house100();
  const plan = generateElectricalPlan({
    level: 0,
    floor: variant.floors[0],
    floors: variant.floors,
    context: { airConditioning: true, waterHeater: true, dishwasher: true },
  });

  it("place tableau, éclairage, interrupteurs et prises dans les pièces réelles", () => {
    const panel = plan.points.find((p) => p.kind === "tableau");
    expect(panel).toBeTruthy();
    expect(inside(variant.floors[0], panel!.x, panel!.y)).toBe(true);
    expect(plan.points.some((p) => p.kind === "luminaire")).toBe(true);
    expect(plan.points.some((p) => p.kind === "interrupteur")).toBe(true);
    expect(plan.points.filter((p) => p.kind === "prise").length).toBeGreaterThan(5);
    for (const point of plan.points.filter((p) => p.kind !== "luminaire_ext")) {
      expect(inside(variant.floors[0], point.x, point.y)).toBe(true);
    }
  });

  it("rattache chaque point à un circuit et calcule calibres/sections", () => {
    for (const point of plan.points.filter((p) => !["tableau", "terre"].includes(p.kind))) {
      expect(point.circuitId).toBeTruthy();
      expect(plan.circuits.some((c) => c.id === point.circuitId)).toBe(true);
    }
    expect(plan.circuits.length).toBeGreaterThan(2);
    for (const circuit of plan.circuits) {
      if (!circuit.computed) continue;
      expect(circuit.breakerA).not.toBeNull();
      expect([1.5, 2.5, 4, 6, 10, 16]).toContain(circuit.sectionMm2);
      if (circuit.role === "eclairage" || circuit.role === "exterieur") {
        expect(circuit.sectionMm2).toBeGreaterThanOrEqual(1.5);
      } else {
        // Prises et circuits spécialisés : 2,5 mm² minimum.
        expect(circuit.sectionMm2).toBeGreaterThanOrEqual(2.5);
      }
      expect(circuit.basis).toMatch(/Charge/);
    }
    expect(plan.mainBreakerA).not.toBeNull();
    expect(plan.diversifiedVA).toBeLessThanOrEqual(plan.installedVA);
  });

  it("quantifie points, câbles et protections", () => {
    expect(plan.quantities.find((q) => q.id === "el-prises")?.quantity).toBe(
      plan.points.filter((p) => p.kind === "prise").length,
    );
    expect(plan.quantities.find((q) => q.id === "el-tableau")?.quantity).toBe(1);
    expect(plan.quantities.some((q) => q.id.startsWith("el-cable"))).toBe(true);
    expect(plan.quantities.every((q) => q.quantity > 0)).toBe(true);
  });

  it("ne divulgue un calibre que lorsque le calcul aboutit", () => {
    const unsafe = sizeCircuit("eclairage", 0, 0);
    expect(unsafe.computed).toBe(false);
    expect(unsafe.breakerA).toBeNull();
    const impossible = sizeCircuit("specialise", 40_000, 40);
    expect(impossible.computed).toBe(false);
    const valid = sizeCircuit("prises", 2300, 18);
    expect(valid.computed).toBe(true);
    expect(valid.sectionMm2).toBeGreaterThanOrEqual(2.5);
  });
});

describe("bâtiment à plusieurs niveaux", () => {
  const variant = buildingR2();

  const plumbing = variant.floors.map((floor, level) =>
    generatePlumbingPlan({ level, floor, floors: variant.floors }),
  );
  const electrical = variant.floors.map((floor, level) =>
    generateElectricalPlan({ level, floor, floors: variant.floors }),
  );

  it("génère un plan technique distinct par étage", () => {
    expect(plumbing).toHaveLength(variant.floors.length);
    expect(electrical).toHaveLength(variant.floors.length);
    expect(new Set(plumbing.map((p) => p.level)).size).toBe(variant.floors.length);
  });

  it("aligne la colonne de plomberie et la gaine électrique entre les niveaux", () => {
    const shaft = technicalShaft(
      { length: variant.floors[0].length, width: variant.floors[0].width },
      variant.floors,
    );
    for (const p of plumbing) {
      expect(p.riser.x).toBeCloseTo(shaft.x, 5);
      expect(p.riser.y).toBeCloseTo(shaft.y, 5);
    }
    for (const p of electrical) {
      expect(p.riser.x).toBeCloseTo(shaft.x, 5);
      expect(p.riser.y).toBeCloseTo(shaft.y, 5);
    }
    expect(variant.floors.every((f) => f.length === variant.floors[0].length)).toBe(true);
    expect(variant.floors.every((f) => f.width === variant.floors[0].width)).toBe(true);
  });

  it("agrège les quantités de tous les niveaux sans perte", () => {
    const perLevel = plumbing.flatMap((p) => p.quantities);
    const merged = aggregateTechnicalQuantities(plumbing);
    const wcLevels = perLevel.filter((q) => q.id === "fix-wc").reduce((n, q) => n + q.quantity, 0);
    const wcMerged = merged.find((q) => q.id === "fix-wc");
    expect(wcMerged?.quantity ?? 0).toBeGreaterThan(0);
    expect(wcMerged?.quantity ?? 0).toBeLessThanOrEqual(wcLevels);
    expect(merged.every((q) => q.quantity > 0)).toBe(true);
  });
});

describe("modification manuelle et régénération", () => {
  const variant = house100();
  const floor = variant.floors[0];
  const first = generatePlumbingPlan({ level: 0, floor, floors: variant.floors });
  const target = first.fixtures.find((f) => f.kind === "lavabo")!;

  it("applique la position modifiée et recalcule les réseaux", () => {
    const moved = generatePlumbingPlan({
      level: 0,
      floor,
      floors: variant.floors,
      overrides: { [target.id]: { x: target.x, y: target.y + 0.3 } },
    });
    const movedTarget = moved.fixtures.find((f) => f.id === target.id)!;
    expect(movedTarget.y).toBeCloseTo(target.y + 0.3, 5);
    const before = first.pipes
      .filter((p) => p.network === "eau_froide" && !p.trunk)
      .reduce((n, p) => n + p.lengthM, 0);
    const after = moved.pipes
      .filter((p) => p.network === "eau_froide" && !p.trunk)
      .reduce((n, p) => n + p.lengthM, 0);
    expect(after).not.toBeCloseTo(before, 5);
  });

  it("régénère à l'identique sans modification (déterminisme)", () => {
    const again = generatePlumbingPlan({ level: 0, floor, floors: variant.floors });
    expect(again.pipes.map((p) => p.lengthM)).toEqual(first.pipes.map((p) => p.lengthM));
    expect(again.fixtures.map((f) => `${f.id}:${f.x}:${f.y}`)).toEqual(
      first.fixtures.map((f) => `${f.id}:${f.x}:${f.y}`),
    );
  });
});

describe("valorisation avec les prix existants", () => {
  const lots = [
    {
      id: "plomberie",
      name: "Plomberie",
      subtotal: 10_000,
      lines: [
        { designation: "Tubes PER Ø16/Ø20", unit: "ml", unitPrice: 8, quantity: 80, total: 640, nature: "equipements" },
        { designation: "Tubes PVC Ø100/Ø110", unit: "ml", unitPrice: 15, quantity: 15, total: 225, nature: "equipements" },
        { designation: "WC à l'anglaise complet", unit: "unités", unitPrice: 280, quantity: 2, total: 560, nature: "equipements" },
        { designation: "Lavabo + meuble", unit: "unités", unitPrice: 450, quantity: 2, total: 900, nature: "equipements" },
        { designation: "Receveur de douche + paroi", unit: "unité", unitPrice: 500, quantity: 1, total: 500, nature: "equipements" },
        { designation: "Chauffe-eau électrique 80L", unit: "unité", unitPrice: 480, quantity: 1, total: 480, nature: "equipements" },
        { designation: "Main-d'œuvre plombier", unit: "jours", unitPrice: 80, quantity: 15, total: 1200, nature: "main_oeuvre" },
      ],
    },
    {
      id: "electricite",
      name: "Électricité",
      subtotal: 8_000,
      lines: [
        { designation: "Tableau électrique général", unit: "unité", unitPrice: 420, quantity: 1, total: 420, nature: "equipements" },
        { designation: "Disjoncteurs divisionnaires", unit: "unités", unitPrice: 52, quantity: 10, total: 520, nature: "equipements" },
        { designation: "Câble électrique 2.5 mm² (prises)", unit: "ml", unitPrice: 2.4, quantity: 400, total: 960, nature: "equipements" },
        { designation: "Points d'éclairage", unit: "points", unitPrice: 45, quantity: 15, total: 675, nature: "equipements" },
        { designation: "Prises de courant 2P+T", unit: "unités", unitPrice: 9, quantity: 20, total: 180, nature: "equipements" },
      ],
    },
  ];

  const variant = house100();
  const plan = generatePlumbingPlan({
    level: 0,
    floor: variant.floors[0],
    floors: variant.floors,
    context: { dishwasher: true, laundry: true },
  });

  it("utilise les prix configurés et signale les prix manquants", () => {
    const priced = priceQuantities(plan.quantities, lots);
    const wc = priced.find((q) => q.label === "WC")!;
    expect(wc.unitPrice).toBe(280);
    expect(wc.priceMissing).toBe(false);
    const evier = priced.find((q) => q.label === "Évier");
    expect(evier).toBeTruthy();
    expect(evier!.priceMissing).toBe(true);
    expect(evier!.unitPrice).toBeNull();
    expect(evier!.total).toBeNull();
    expect(wc.total).toBe(280 * wc.quantity);
  });

  it("ne double pas le coût déjà comptabilisé dans le total TTC", () => {
    const sync = buildTechnicalCostSync({ kind: "plomberie", quantities: plan.quantities, lots });
    expect(sync.existingLots.map((l) => l.id)).toContain("plomberie");
    expect(sync.existingSubtotal).toBeGreaterThan(0);
    expect(sync.existingSupplySubtotal).toBeLessThan(sync.existingSubtotal);
    expect(sync.notes[0]).toMatch(/jamais un montant ajouté une seconde fois/);
    expect(sync.missingPrices.length).toBeGreaterThan(0);
    expect(sync.technicalTotal).toBeGreaterThan(0);
  });

  it("signale explicitement l'absence de quantitatif au lieu d'inventer un prix", () => {
    const sync = buildTechnicalCostSync({ kind: "electricite", quantities: plan.quantities, lots: [] });
    expect(sync.existingSubtotal).toBe(0);
    expect(sync.technicalTotal).toBe(0);
    expect(sync.notes.join(" ")).toMatch(/Aucun poste/);
    expect(sync.missingPrices.length).toBe(plan.quantities.length);
  });
});
