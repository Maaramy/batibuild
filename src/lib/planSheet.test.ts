import { describe, it, expect } from "vitest";
import { generatePlans, type PlanRequest } from "@/convex/planEngine";
import {
  buildPlanSheet,
  levelLabel,
  standingLabel,
  directionLabel,
  formatTnd,
  type PlanBimResult,
} from "./planSheet";

const BASE_REQUEST: PlanRequest = {
  bienType: "villa",
  surfaceTotale: 600,
  surfaceCouverte: 240,
  floors: 2,
  bedrooms: 4,
  bathrooms: 3,
  wcs: 2,
  hasSalon: true,
  hasSalleAManger: true,
  hasCuisine: true,
  hasBuanderie: true,
  hasDressing: true,
  hasBureau: true,
  hasLocalTechnique: false,
  hasGarage: true,
  hasParking: true,
  hasTerrasse: true,
  hasBalcon: true,
  hasJardin: true,
  hasPiscine: true,
  orientation: "sud",
  entreePosition: "est",
  facades: 3,
  standing: "premium",
  style: "mediterraneen",
  exigences: "Grande suite parentale plein sud",
  seed: 2026,
};

const BIM_RESULT: PlanBimResult = {
  costEstimate: {
    totalCost: 480000,
    costPerSquareMeter: 2000,
    currency: "TND",
    breakdown: [
      { category: "gros_oeuvre", label: "Gros œuvre", estimatedCost: 158400, percentage: 33 },
      { category: "second_oeuvre", label: "Second œuvre", estimatedCost: 163200, percentage: 34 },
    ],
    budgetScenarios: {
      economique: { totalCost: 300000 },
      standard: { totalCost: 480000 },
      premium: { totalCost: 700000 },
    },
  },
  aiAnalysis: {
    confidence: 0.87,
    estimatedDuration: "8 mois",
    laborEstimate: { totalWorkers: 14, totalDays: 220, estimatedCost: 24000 },
  },
};

describe("buildPlanSheet", () => {
  const plan = generatePlans(BASE_REQUEST)[0];
  const sheet = buildPlanSheet(plan, BASE_REQUEST, BIM_RESULT);

  it("produit une fiche complète et structurée", () => {
    expect(sheet.index).toBe(1);
    expect(sheet.name).toBe(plan.name);
    expect(sheet.description).toBe(plan.description);
    expect(sheet.strengths.length).toBeGreaterThan(0);
    expect(sheet.weaknesses.length).toBeGreaterThan(0);
    expect(sheet.meta.bienType).toBe("Villa");
    expect(sheet.meta.style).toBe("Méditerranéen");
    expect(sheet.meta.standing).toBe("Premium");
    expect(sheet.meta.floors).toBe(2);
    expect(sheet.meta.entree).toBe("Est");
    expect(sheet.meta.orientation).toBe("Sud");
    expect(sheet.meta.facades).toBe(3);
  });

  it("dérive les chiffres clés des statistiques du plan", () => {
    const f = Object.fromEntries(sheet.keyFigures.map((k) => [k.label, k.value]));
    expect(f["Surface construite"]).toBe(`${Math.round(plan.stats.construite)} m²`);
    expect(f["Surface utile"]).toBe(`${Math.round(plan.stats.utile)} m²`);
    expect(f["Taux d'utilisation"]).toBe(`${plan.stats.tauxUtilisation}%`);
    // Portes / Fenêtres ne figurent plus dans les chiffres clés (déjà comptées dans le tableau des pièces)
    expect(f["Portes"]).toBeUndefined();
    expect(f["Fenêtres"]).toBeUndefined();
  });

  it("liste toutes les pièces couvertes avec leur niveau et surface", () => {
    const covered = plan.rooms.filter((r) => !r.exterior);
    expect(sheet.rooms.length).toBe(covered.length);
    for (const r of sheet.rooms) {
      expect(r.area).toBeGreaterThan(0);
      expect(["RDC", "Étage 1", "Étage 2"]).toContain(r.levelLabel);
    }
    // Pièces au 1er étage étiquetées « Étage 1 »
    const hasUpper = covered.some((r) => r.level === 1);
    if (hasUpper) expect(sheet.rooms.some((r) => r.levelLabel === "Étage 1")).toBe(true);
  });

  it("sépare les zones extérieures et compte portes / fenêtres / escaliers", () => {
    expect(sheet.exteriorZones.length).toBe(plan.rooms.filter((r) => r.exterior).length);
    expect(sheet.counts.doors).toBe(plan.doors.length);
    expect(sheet.counts.windows).toBe(plan.windows.length);
    expect(sheet.counts.stairs).toBe(plan.stairs.length);
  });

  it("remonte les 5 scores IA (dont le score global)", () => {
    expect(sheet.scores).toHaveLength(5);
    const global = sheet.scores.find((s) => s.key === "global");
    expect(global?.value).toBe(plan.scores.global);
  });

  it("intègre l'estimation BIM : total, prix/m², confiance, durée, MO, postes", () => {
    expect(sheet.cost).not.toBeNull();
    expect(sheet.cost!.totalCost).toBe(480000);
    expect(sheet.cost!.costPerSquareMeter).toBe(2000);
    expect(sheet.cost!.confidence).toBe(87);
    expect(sheet.cost!.duration).toBe("8 mois");
    expect(sheet.cost!.labor?.totalWorkers).toBe(14);
    expect(sheet.cost!.breakdown).toHaveLength(2);
    expect(sheet.cost!.breakdown[0].label).toBe("Gros œuvre");
    expect(sheet.cost!.scenarios.standard).toBe(480000);
  });

  it("renvoie cost = null quand aucune estimation BIM n'est fournie", () => {
    const s = buildPlanSheet(plan, BASE_REQUEST, null);
    expect(s.cost).toBeNull();
  });

  it("est robuste sans request (métadonnées par défaut)", () => {
    const s = buildPlanSheet(plan, null, null);
    expect(s.meta.bienType).toBe("—");
    expect(s.meta.standing).toBe("—");
    expect(s.cost).toBeNull();
    expect(s.rooms.length).toBeGreaterThan(0);
  });
});

describe("helpers d'affichage", () => {
  it("levelLabel traduit les niveaux", () => {
    expect(levelLabel(0)).toBe("RDC");
    expect(levelLabel(1)).toBe("Étage 1");
    expect(levelLabel(2)).toBe("Étage 2");
  });

  it("standingLabel traduit le standing", () => {
    expect(standingLabel("premium")).toBe("Premium");
    expect(standingLabel("economique")).toBe("Économique");
    expect(standingLabel("standard")).toBe("Standard");
    expect(standingLabel(undefined)).toBe("Standard");
  });

  it("directionLabel normalise les directions", () => {
    expect(directionLabel("nord")).toBe("Nord");
    expect(directionLabel("E")).toBe("Est");
    expect(directionLabel("w")).toBe("Ouest");
    expect(directionLabel(undefined)).toBe("—");
  });

  it("formatTnd formate en dinars tunisiens", () => {
    expect(formatTnd(2500)).toContain("DT");
    expect(formatTnd(2500).replace(/\D/g, "")).toContain("2500");
  });
});
