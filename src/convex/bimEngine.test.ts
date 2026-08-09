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

describe("runBIMEstimation — quantitatif cohérent par type de projet", () => {
  const soItems = (cat: string) => {
    const res = runBIMEstimation(cat, 100, 1, "tunis", "standard");
    return getBreakdown(res, "second_oeuvre").items?.map((i: any) => i.name) ?? [];
  };
  const eqItems = (cat: string) => {
    const res = runBIMEstimation(cat, 100, 1, "tunis", "standard");
    return getBreakdown(res, "equipements").items?.map((i: any) => i.name) ?? [];
  };

  it("piscine : pas de fenêtres aluminium ni de portes intérieures", () => {
    const names = soItems("piscine");
    expect(names.some((n) => n.includes("Fenêtre"))).toBe(false);
    expect(names.some((n) => n.includes("Porte intérieure"))).toBe(false);
    expect(names.some((n) => n.includes("Tuile canal"))).toBe(false);
    expect(names.some((n) => n.includes("liner") || n.includes("Liner"))).toBe(true);
    // Équipements spécifiques piscine présents
    const eq = eqItems("piscine");
    expect(eq.some((n) => n.includes("Pompe de filtration"))).toBe(true);
    expect(eq.some((n) => n.includes("Chauffage électrique piscine"))).toBe(true);
  });

  it("maison : garde fenêtres alu, portes et tuiles (profil résidentiel)", () => {
    const names = soItems("maison");
    expect(names.some((n) => n.includes("Fenêtre coulissante alu"))).toBe(true);
    expect(names.some((n) => n.includes("Porte intérieure"))).toBe(true);
    expect(names.some((n) => n.includes("Tuile canal"))).toBe(true);
  });

  it("jardin : pas de menuiserie, mais gazon et pavés", () => {
    const names = soItems("jardin");
    expect(names.some((n) => n.includes("Fenêtre"))).toBe(false);
    expect(names.some((n) => n.includes("Porte intérieure"))).toBe(false);
    expect(names.some((n) => n.includes("Gazon"))).toBe(true);
    const eq = eqItems("jardin");
    expect(eq.some((n) => n.includes("arrosage") || n.includes("Arrosage"))).toBe(true);
    // Pas de sanitaires résidentiels pour un jardin
    expect(eq.some((n) => n.includes("WC"))).toBe(false);
  });

  it("clôture : portail au lieu de fenêtres", () => {
    const names = soItems("cloture");
    expect(names.some((n) => n.includes("Fenêtre"))).toBe(false);
    expect(names.some((n) => n.includes("Portail"))).toBe(true);
  });

  it("bureau (commercial) : vitrine au lieu de fenêtres résidentielles", () => {
    const names = soItems("bureau");
    expect(names.some((n) => n.includes("Vitrine"))).toBe(true);
    expect(names.some((n) => n.includes("Fenêtre coulissante alu"))).toBe(false);
  });

  it("solaire : pas de tuiles, mais équipements photovoltaïques", () => {
    const names = soItems("installation_solaire");
    expect(names.some((n) => n.includes("Tuile"))).toBe(false);
    expect(names.some((n) => n.includes("Fenêtre"))).toBe(false);
    const eq = eqItems("installation_solaire");
    expect(eq.some((n) => n.includes("Panneau photovoltaïque"))).toBe(true);
    expect(eq.some((n) => n.includes("Batterie"))).toBe(true);
  });

  it("parking : enrobé et marquage, pas de portes ni fenêtres", () => {
    const names = soItems("parking");
    expect(names.some((n) => n.includes("Fenêtre"))).toBe(false);
    expect(names.some((n) => n.includes("Enrobé"))).toBe(true);
    expect(names.some((n) => n.includes("marquage"))).toBe(true);
  });

  it("main-d'œuvre : piscine mobilise un piscinier, pas un maçon de logement", () => {
    const res = runBIMEstimation("piscine", 60, 1, "tunis", "standard");
    const mo = getBreakdown(res, "main_oeuvre");
    const names = mo.items?.map((i: any) => i.name) ?? [];
    expect(names.some((n) => n.includes("Piscinier"))).toBe(true);
    expect(names.some((n) => n.includes("Maçon qualifié"))).toBe(false);
  });

  it("immeuble : profil résidentiel (menuiseries et tuiles)", () => {
    const names = soItems("immeuble");
    expect(names.some((n) => n.includes("Fenêtre coulissante alu"))).toBe(true);
    expect(names.some((n) => n.includes("Porte intérieure"))).toBe(true);
  });

  it("résidence touristique : profil hôtelier (vitrine)", () => {
    const names = soItems("residence_touristique");
    expect(names.some((n) => n.includes("Vitrine"))).toBe(true);
  });

  it("appartement et studio : profil résidentiel", () => {
    for (const cat of ["appartement", "studio"]) {
      const names = soItems(cat);
      expect(names.some((n) => n.includes("Fenêtre coulissante alu"))).toBe(true);
    }
  });

  it("les types synchronisés avec l'investissement produisent une estimation complète", () => {
    for (const cat of ["appartement", "studio", "duplex", "immeuble", "residence_touristique", "projet_neuf"]) {
      const res = runBIMEstimation(cat, 100, 1, "tunis", "standard");
      expect(res.costEstimate.totalCost).toBeGreaterThan(0);
      expect(res.costEstimate.breakdown.length).toBe(6);
    }
  });
});
