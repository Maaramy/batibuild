import { describe, it, expect } from "vitest";
import { runBIMEstimation, type RoomCounts } from "./bimEngine";

// ════════════════════════════════════════════════════════════════════════
// Tests d'impact du nombre de pièces sur le moteur BIM
// ════════════════════════════════════════════════════════════════════════

const MANY_ROOMS: RoomCounts = {
  bedrooms: 6,
  bathrooms: 3,
  kitchens: 2,
  livingRooms: 2,
  garages: 2,
};

const FEW_ROOMS: RoomCounts = {
  bedrooms: 2,
  bathrooms: 1,
  kitchens: 1,
  livingRooms: 1,
  garages: 0,
};

function getBreakdown(result: ReturnType<typeof runBIMEstimation>, category: string) {
  const cat = result.costEstimate.breakdown.find((b) => b.category === category);
  if (!cat) throw new Error(`Catégorie ${category} introuvable`);
  return cat;
}

function findItem(breakdown: ReturnType<typeof getBreakdown>, namePart: string) {
  const item = breakdown.items?.find((i: any) => i.name.includes(namePart));
  if (!item) throw new Error(`Item "${namePart}" introuvable`);
  return item;
}

describe("runBIMEstimation — impact du nombre de pièces", () => {
  it("plus de pièces = coût total supérieur", () => {
    const base = runBIMEstimation("maison", 150, 1, "tunis", "standard");
    const many = runBIMEstimation("maison", 150, 1, "tunis", "standard", MANY_ROOMS);
    const few = runBIMEstimation("maison", 150, 1, "tunis", "standard", FEW_ROOMS);

    expect(many.costEstimate.totalCost).toBeGreaterThan(few.costEstimate.totalCost);
    expect(many.costEstimate.totalCost).toBeGreaterThanOrEqual(base.costEstimate.totalCost);
    expect(few.costEstimate.totalCost).toBeLessThanOrEqual(base.costEstimate.totalCost);
  });

  it("le nombre de pièces déclaré modifie le coût au m² (facteur borné)", () => {
    const many = runBIMEstimation("maison", 150, 1, "tunis", "standard", MANY_ROOMS);
    const few = runBIMEstimation("maison", 150, 1, "tunis", "standard", FEW_ROOMS);

    expect(many.costEstimate.costPerSquareMeter).toBeGreaterThan(
      few.costEstimate.costPerSquareMeter,
    );
    // Facteur max ±12% → le coût au m² reste dans une plage raisonnable
    const fewCpm = few.costEstimate.costPerSquareMeter;
    const manyCpm = many.costEstimate.costPerSquareMeter;
    expect(manyCpm).toBeLessThanOrEqual(Math.round(fewCpm * 1.12) + 1);
  });

  it("les WC et douches suivent le nombre de salles de bain", () => {
    const many = runBIMEstimation("maison", 150, 1, "tunis", "standard", MANY_ROOMS);
    const few = runBIMEstimation("maison", 150, 1, "tunis", "standard", FEW_ROOMS);

    const eqMany = getBreakdown(many, "equipements");
    const eqFew = getBreakdown(few, "equipements");

    const wcMany = findItem(eqMany, "WC");
    const wcFew = findItem(eqFew, "WC");
    const showerMany = findItem(eqMany, "Receveur de douche");
    const showerFew = findItem(eqFew, "Receveur de douche");

    expect(wcMany.quantity).toBe(3);
    expect(wcFew.quantity).toBe(1);
    expect(showerMany.quantity).toBe(3);
    expect(showerFew.quantity).toBe(1);
  });

  it("les portes intérieures suivent le nombre de pièces", () => {
    const many = runBIMEstimation("maison", 150, 1, "tunis", "standard", MANY_ROOMS);
    const few = runBIMEstimation("maison", 150, 1, "tunis", "standard", FEW_ROOMS);

    const soMany = getBreakdown(many, "second_oeuvre");
    const soFew = getBreakdown(few, "second_oeuvre");

    const doorMany = findItem(soMany, "Porte intérieure");
    const doorFew = findItem(soFew, "Porte intérieure");

    expect(doorMany.quantity).toBeGreaterThan(doorFew.quantity);
  });

  it("la main-d'œuvre électricien/plombier augmente avec les pièces", () => {
    const many = runBIMEstimation("maison", 150, 1, "tunis", "standard", MANY_ROOMS);
    const few = runBIMEstimation("maison", 150, 1, "tunis", "standard", FEW_ROOMS);

    const moMany = getBreakdown(many, "main_oeuvre");
    const moFew = getBreakdown(few, "main_oeuvre");

    const elecMany = findItem(moMany, "Électricien");
    const elecFew = findItem(moFew, "Électricien");
    const plumbMany = findItem(moMany, "Plombier");
    const plumbFew = findItem(moFew, "Plombier");

    expect(elecMany.quantity).toBeGreaterThan(elecFew.quantity);
    expect(plumbMany.quantity).toBeGreaterThan(plumbFew.quantity);
  });

  it("la durée du chantier est allongée quand il y a plus de pièces", () => {
    const many = runBIMEstimation("maison", 150, 1, "tunis", "standard", MANY_ROOMS);
    const few = runBIMEstimation("maison", 150, 1, "tunis", "standard", FEW_ROOMS);

    const toMonths = (s: string) => parseInt(s, 10);
    expect(toMonths(many.aiAnalysis.estimatedDuration)).toBeGreaterThanOrEqual(
      toMonths(few.aiAnalysis.estimatedDuration),
    );
  });

  it("l'absence de pièces (anciens projets) ne casse pas l'estimation", () => {
    const res = runBIMEstimation("villa", 220, 2, "nabeul", "premium");
    expect(res.costEstimate.totalCost).toBeGreaterThan(0);
    expect(res.costEstimate.breakdown.length).toBe(6);
    expect(res.aiAnalysis.estimatedDuration).toMatch(/mois/);
  });
});
