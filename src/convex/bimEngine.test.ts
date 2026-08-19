import { describe, it, expect } from "vitest";
import { runBIMEstimation, type RoomCounts } from "./bimEngine";
import {
  applyRealisticDoorsWindows,
  type RoomCountsInput,
} from "./bimQuantitatif";
import { TUNISIA_2026_CATALOG } from "./materialCatalog2026";

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
    expect(names.some((n) => n.includes("Fenêtre aluminium"))).toBe(true);
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

  it("bureau (commercial) : baie coulissante (vitrine) au lieu de fenêtres résidentielles", () => {
    const names = soItems("bureau");
    expect(names.some((n) => n.includes("Baie coulissante"))).toBe(true);
    expect(names.some((n) => n.includes("Fenêtre aluminium"))).toBe(false);
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
    expect(names.some((n) => n.includes("Fenêtre aluminium"))).toBe(true);
    expect(names.some((n) => n.includes("Porte intérieure"))).toBe(true);
  });

  it("résidence touristique : profil hôtelier (baie coulissante)", () => {
    const names = soItems("residence_touristique");
    expect(names.some((n) => n.includes("Baie coulissante"))).toBe(true);
  });

  it("appartement et studio : profil résidentiel", () => {
    for (const cat of ["appartement", "studio"]) {
      const names = soItems(cat);
      expect(names.some((n) => n.includes("Fenêtre aluminium"))).toBe(true);
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

describe("runBIMEstimation — quantitatif détaillé aligné sur le catalogue 2026", () => {
  const catalogNames = new Set(TUNISIA_2026_CATALOG.map((m) => m.name));

  const item = (res: ReturnType<typeof runBIMEstimation>, category: string, namePart: string) => {
    const b = getBreakdown(res, category);
    return findItem(b, namePart);
  };

  it("gros œuvre : les libellés, unités et prix unitaires suivent le catalogue 2026", () => {
    const res = runBIMEstimation("maison", 150, 1, "tunis", "standard");

    const hourdis = item(res, "gros_oeuvre", "Hourdis");
    expect(hourdis.name).toBe("Hourdis 16×50");
    expect(hourdis.unit).toBe("pièce");
    expect(hourdis.unitPrice).toBe(1.27);

    const cement = item(res, "gros_oeuvre", "Ciment CPJ 42.5");
    expect(cement.name).toBe("Ciment CPJ 42.5 (sac 50 kg)");
    expect(cement.unit).toBe("sac");
    expect(cement.unitPrice).toBe(15.85);

    const steel = item(res, "gros_oeuvre", "Acier à béton T12");
    expect(steel.name).toBe("Acier à béton T12 (tonne)");
    expect(steel.unit).toBe("tonne");
    expect(steel.unitPrice).toBe(3850);
  });

  it("second œuvre : fenêtres, carrelage et portes utilisent les références catalogue", () => {
    const res = runBIMEstimation("maison", 150, 1, "tunis", "standard");

    const fenetre = item(res, "second_oeuvre", "Fenêtre");
    expect(fenetre.name).toBe("Fenêtre aluminium 90×120");
    expect(fenetre.unit).toBe("pièce");

    const carrelage = item(res, "second_oeuvre", "Carrelage");
    expect(carrelage.name).toBe("Carrelage sol 40×40 (m²)");
    expect(carrelage.unit).toBe("m²");
    expect(carrelage.unitPrice).toBe(22);
  });

  it("équipements : sanitaires et électricité résolus vers le catalogue", () => {
    const res = runBIMEstimation("maison", 150, 1, "tunis", "standard");

    const douche = item(res, "equipements", "Receveur de douche");
    expect(douche.name).toBe("Receveur de douche 90×90");
    expect(douche.unit).toBe("pièce");
    expect(douche.unitPrice).toBe(200);

    const cable = item(res, "equipements", "Câble électrique");
    expect(cable.name).toBe("Câble électrique 3×2.5 mm² (rouleau 100 m)");
    expect(cable.unit).toBe("rouleau");
  });

  it("clôture : la brique pleine 22×11×7 est alignée sur le catalogue", () => {
    const res = runBIMEstimation("cloture", 100, 1, "tunis", "standard");
    const brique = item(res, "gros_oeuvre", "Brique pleine");
    expect(brique.name).toBe("Brique pleine 22×11×7");
    expect(brique.unit).toBe("pièce");
    expect(brique.unitPrice).toBe(0.55);
  });

  it("entrepôt : la porte sectionnelle industrielle est alignée sur le catalogue", () => {
    const res = runBIMEstimation("entrepot", 300, 1, "tunis", "standard");
    const porte = item(res, "second_oeuvre", "Porte garage sectionnelle");
    expect(porte.name).toBe("Porte garage sectionnelle 2.5×2.1");
    expect(porte.unit).toBe("pièce");
    expect(porte.unitPrice).toBe(1300);
  });

  it("bureau : la vitrine est mappée vers la baie coulissante alu du catalogue", () => {
    const res = runBIMEstimation("bureau", 150, 1, "tunis", "standard");
    const vitrine = item(res, "second_oeuvre", "Baie coulissante");
    expect(vitrine.name).toBe("Baie coulissante alu 2 vantaux");
    expect(vitrine.unit).toBe("pièce");
  });

  it("maison : tous les postes matériaux (gros œuvre, second œuvre, équipements) existent dans le catalogue 2026", () => {
    const res = runBIMEstimation("maison", 150, 1, "tunis", "standard");
    for (const category of ["gros_oeuvre", "second_oeuvre", "equipements"]) {
      const b = getBreakdown(res, category);
      for (const i of b.items ?? []) {
        expect(catalogNames.has(i.name), `${i.name} doit exister dans le catalogue 2026`).toBe(true);
      }
    }
  });

  it("les postes de main-d'œuvre conservent leurs libellés internes (hors catalogue)", () => {
    const res = runBIMEstimation("maison", 150, 1, "tunis", "standard");
    const mo = getBreakdown(res, "main_oeuvre");
    expect(mo.items?.some((i: any) => i.name === "Chef de chantier & Maçon qualifié")).toBe(true);
    expect(mo.items?.some((i: any) => i.name === "Manœuvre")).toBe(true);
  });
});

describe("applyRealisticDoorsWindows — portes & fenêtres par pièce (Quantitatif détaillé)", () => {
  const MANY: RoomCountsInput = { bedrooms: 6, bathrooms: 3, kitchens: 2, livingRooms: 2, garages: 2 };
  const FEW: RoomCountsInput = { bedrooms: 2, bathrooms: 1, kitchens: 1, livingRooms: 1 };

  // Le moteur BIM applique des défauts pour wc / piscine ; on les aligne ici
  // pour que le total des pièces corresponde à celui utilisé par l'engine.
  const withDefaults = (r: RoomCountsInput): RoomCountsInput => ({
    ...r,
    wcs: r.wcs ?? Math.max(1, Math.round(150 / 90)),
    pools: r.pools ?? 0,
  });

  const roomTotal = (r: RoomCountsInput) =>
    (r.bedrooms ?? 0) + (r.bathrooms ?? 0) + (r.kitchens ?? 0) +
    (r.livingRooms ?? 0) + (r.garages ?? 0) + (r.wcs ?? 0) + (r.pools ?? 0);

  const getSO = (rooms: RoomCountsInput) => {
    const full = withDefaults(rooms);
    const res = runBIMEstimation("maison", 150, 1, "tunis", "standard", full);
    res.costEstimate.breakdown = applyRealisticDoorsWindows(res.costEstimate.breakdown, full);
    return getBreakdown(res, "second_oeuvre");
  };

  const find = (so: ReturnType<typeof getBreakdown>, part: string) => findItem(so, part);

  it("1 porte intérieure par pièce et 2 portes principales", () => {
    const so = getSO(MANY);
    expect(find(so, "Porte intérieure").quantity).toBe(roomTotal(withDefaults(MANY)));
    expect(find(so, "Porte d'entrée").quantity).toBe(2);
  });

  it("1 fenêtre par pièce + 1 fenêtre par chambre, grilles identiques", () => {
    const so = getSO(MANY);
    const expected = roomTotal(withDefaults(MANY)) + (MANY.bedrooms ?? 0);
    expect(find(so, "Fenêtre").quantity).toBe(expected);
    expect(find(so, "Grille").quantity).toBe(expected);
  });

  it("petite maison : quantités entières réalistes (portes = pièces, fenêtres = pièces + chambres)", () => {
    const so = getSO(FEW);
    const full = withDefaults(FEW);
    expect(find(so, "Porte intérieure").quantity).toBe(roomTotal(full));
    expect(find(so, "Porte d'entrée").quantity).toBe(2);
    expect(find(so, "Fenêtre").quantity).toBe(roomTotal(full) + (FEW.bedrooms ?? 0));
    expect(find(so, "Grille").quantity).toBe(roomTotal(full) + (FEW.bedrooms ?? 0));
    for (const part of ["Porte intérieure", "Porte d'entrée", "Fenêtre", "Grille"]) {
      const it = find(so, part);
      expect(Number.isInteger(it.quantity)).toBe(true);
      expect(it.totalPrice).toBe(Math.round(it.quantity * it.unitPrice));
    }
  });

  it("les prix unitaires du catalogue 2026 sont conservés", () => {
    const so = getSO(MANY);
    expect(find(so, "Porte intérieure").unitPrice).toBe(320);
    expect(find(so, "Porte d'entrée").unitPrice).toBe(550);
    expect(find(so, "Fenêtre").unitPrice).toBe(310);
    expect(find(so, "Grille").unitPrice).toBe(220);
  });

  it("le total de la catégorie second œuvre est préservé (budget inchangé)", () => {
    const full = withDefaults(MANY);
    const res = runBIMEstimation("maison", 150, 1, "tunis", "standard", full);
    const before = getBreakdown(res, "second_oeuvre").estimatedCost;
    res.costEstimate.breakdown = applyRealisticDoorsWindows(res.costEstimate.breakdown, full);
    const after = getBreakdown(res, "second_oeuvre").estimatedCost;
    expect(Math.abs(after - before)).toBeLessThan(10);
    const sum =
      getBreakdown(res, "second_oeuvre").items?.reduce(
        (s: number, it: any) => s + it.totalPrice,
        0,
      ) ?? 0;
    expect(Math.abs(sum - after)).toBeLessThan(10);
  });

  it("les catégories hors second œuvre restent inchangées", () => {
    const full = withDefaults(MANY);
    const res = runBIMEstimation("maison", 150, 1, "tunis", "standard", full);
    const goBefore = JSON.stringify(getBreakdown(res, "gros_oeuvre").items);
    const eqBefore = JSON.stringify(getBreakdown(res, "equipements").items);
    res.costEstimate.breakdown = applyRealisticDoorsWindows(res.costEstimate.breakdown, full);
    expect(JSON.stringify(getBreakdown(res, "gros_oeuvre").items)).toBe(goBefore);
    expect(JSON.stringify(getBreakdown(res, "equipements").items)).toBe(eqBefore);
  });

  it("les quantités suivent le nombre de pièces (plus de pièces = plus de portes/fenêtres)", () => {
    const soMany = getSO(MANY);
    const soFew = getSO(FEW);
    expect(find(soMany, "Porte intérieure").quantity).toBeGreaterThan(find(soFew, "Porte intérieure").quantity);
    expect(find(soMany, "Fenêtre").quantity).toBeGreaterThan(find(soFew, "Fenêtre").quantity);
  });
});
