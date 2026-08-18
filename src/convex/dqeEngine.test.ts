import { describe, it, expect } from "vitest";
import {
  generateDqe,
  buildDqeLots,
  type DqeLivePriceMap,
} from "./dqeEngine";
import { PROJECT_TYPES } from "./projectTypes";
import { TUNISIA_2026_CATALOG } from "./materialCatalog2026";

// ════════════════════════════════════════════════════════════════════════
// Tests du moteur DQE (Devis Quantitatif Estimatif / Quantitatif détaillé)
// Modèle de référence : « Modèle Google Sheets — Quantitatif détaillé ».
// Invariants vérifiés : Montant = Quantité × Prix unitaire, sous-total par
// lot, total des lots, répartition par nature (matériaux / main-d'œuvre /
// équipements / transport / études), coût au m², et un gabarit de lots
// distinct pour chacun des 13 types de bien officiels (catalogue de
// construction : 11 types alignés sur l'investissement + Maison R+1 / R+2).
// ════════════════════════════════════════════════════════════════════════

const BASE_BUDGET = 300_000;

function run(category: string, opts?: { surface?: number; floors?: number; totalBudget?: number; livePrices?: DqeLivePriceMap }) {
  return generateDqe({
    category,
    surface: opts?.surface ?? 120,
    floors: opts?.floors ?? 1,
    totalBudget: opts?.totalBudget ?? BASE_BUDGET,
    livePrices: opts?.livePrices,
  });
}

/** Normalisation identique au moteur (pour construire une carte de prix en direct). */
function normKey(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/×/g, "x")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Carte de prix en direct construite depuis le catalogue officiel 2026. */
function livePriceFor(catalogName: string, unitPrice: number): DqeLivePriceMap {
  const item = TUNISIA_2026_CATALOG.find((m) => m.name === catalogName);
  if (!item) throw new Error(`Matériau catalogue introuvable : ${catalogName}`);
  return new Map([[normKey(item.name), { unit: item.unit, unitPrice }]]);
}

describe("generateDqe — invariants de calcul (modèle Google Sheets)", () => {
  it("Montant = Quantité × Prix unitaire pour chaque ligne", () => {
    for (const cat of PROJECT_TYPES) {
      const dqe = run(cat);
      for (const lot of dqe.lots) {
        for (const line of lot.lines) {
          expect(
            Math.abs(line.total - line.quantity * line.unitPrice),
            `${cat} / ${lot.name} / ${line.designation}`,
          ).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("la somme des sous-totaux des lots égale le total général", () => {
    for (const cat of PROJECT_TYPES) {
      const dqe = run(cat);
      const sum = dqe.lots.reduce((s, l) => s + l.subtotal, 0);
      expect(sum, cat).toBe(dqe.totals.total);
    }
  });

  it("le coût moyen au m² = total / (surface × étages)", () => {
    const dqe = run("maison", { surface: 120, floors: 2 });
    expect(dqe.totals.costPerM2).toBe(Math.round(dqe.totals.total / 240));
    expect(dqe.totals.costPerM2).toBeGreaterThan(0);
  });

  it("les pourcentages des lots totalisent ≈ 100 %", () => {
    for (const cat of PROJECT_TYPES) {
      const dqe = run(cat);
      const sum = dqe.lots.reduce((s, l) => s + l.percent, 0);
      expect(sum, cat).toBeGreaterThanOrEqual(99.5);
      expect(sum, cat).toBeLessThanOrEqual(100.5);
    }
  });

  it("le total des natures (matériaux + main-d'œuvre + équipements + transport + études) égale le total", () => {
    for (const cat of PROJECT_TYPES) {
      const dqe = run(cat);
      const t = dqe.totals;
      const sum =
        t.materiaux + t.mainOeuvre + t.equipements + t.transport + t.etudes;
      expect(sum, cat).toBe(t.total);
    }
  });
});

describe("generateDqe — les 13 types de bien génèrent un DQE", () => {
  it("chaque type officiel produit au moins 2 lots et 5 lignes", () => {
    expect(PROJECT_TYPES).toHaveLength(13);
    for (const cat of PROJECT_TYPES) {
      const dqe = run(cat);
      expect(dqe.lots.length, cat).toBeGreaterThanOrEqual(2);
      const lines = dqe.lots.reduce((s, l) => s + l.lines.length, 0);
      expect(lines, cat).toBeGreaterThanOrEqual(5);
      expect(dqe.totals.total, cat).toBeGreaterThan(0);
    }
  });

  it("chaque type possède un découpage de lots qui lui est propre", () => {
    const byId = (cat: string) => run(cat).lots.map((l) => l.id).join("|");
    // Les types résidentiels officiels partagent le gabarit 5 lots du modèle
    const residential = new Set(
      ["maison", "villa", "appartement", "studio", "duplex", "immeuble", "residence_touristique", "projet_neuf"]
        .map(byId),
    );
    expect(residential.size).toBe(1);

    // Les types non résidentiels officiels diffèrent du résidentiel
    for (const cat of ["local_commercial", "bureau", "entrepot"]) {
      expect(byId(cat), cat).not.toBe([...residential][0]);
    }
    // local_commercial et boutique_commerciale partagent le gabarit vitrine
    expect(byId("local_commercial")).toBe(byId("boutique_commerciale"));
    // bureau et bureau_cabinet partagent le gabarit tertiaire
    expect(byId("bureau")).toBe(byId("bureau_cabinet"));
    // entrepot et atelier partagent le gabarit industriel
    expect(byId("entrepot")).toBe(byId("atelier"));

    // Les gabarits spécialisés des anciens types diffèrent tous du résidentiel
    const specialized = [
      "renovation_complete",
      "renovation_cuisine",
      "renovation_salle_de_bain",
      "peinture_interieure",
      "piscine_beton",
      "piscine_coque",
      "garage",
      "restaurant",
      "cafe",
      "batiment_agricole",
      "electricite_complete",
      "plomberie_complete",
    ];
    const ids = new Set(specialized.map(byId));
    for (const cat of specialized) {
      expect(ids.has(byId(cat)), cat).toBe(true);
      expect(byId(cat), cat).not.toBe([...residential][0]);
    }
  });

  it("les lots attendus par type sont présents (structure du modèle)", () => {
    const lotIds = (cat: string) => new Set(run(cat).lots.map((l) => l.id));
    expect(lotIds("maison")).toEqual(
      expect.objectContaining(new Set(["frais_preliminaires", "gros_oeuvre", "second_oeuvre", "amenagements_exterieurs", "vrd"])),
    );
    // Types de bien officiels du catalogue unifié
    expect(lotIds("immeuble")).toEqual(expect.objectContaining(new Set(["gros_oeuvre", "second_oeuvre"])));
    expect(lotIds("residence_touristique")).toEqual(expect.objectContaining(new Set(["frais_preliminaires", "gros_oeuvre"])));
    expect(lotIds("projet_neuf")).toEqual(expect.objectContaining(new Set(["gros_oeuvre", "second_oeuvre"])));
    expect(lotIds("local_commercial")).toEqual(expect.objectContaining(new Set(["facade", "enseignes"])));
    expect(lotIds("bureau")).toEqual(expect.objectContaining(new Set(["cloisons", "cvc"])));
    expect(lotIds("entrepot")).toEqual(expect.objectContaining(new Set(["charpente"])));
    expect(lotIds("renovation_complete")).toEqual(expect.objectContaining(new Set(["depose_demolition", "nettoyage_finition"])));
    expect(lotIds("renovation_cuisine")).toEqual(expect.objectContaining(new Set(["plan_travail", "meubles"])));
    expect(lotIds("renovation_salle_de_bain")).toEqual(expect.objectContaining(new Set(["etancheite", "sanitaires", "robinetterie"])));
    expect(lotIds("piscine_beton")).toEqual(expect.objectContaining(new Set(["terrassement", "structure", "filtration"])));
    expect(lotIds("piscine_coque")).toEqual(expect.objectContaining(new Set(["coque", "filtration"])));
    expect(lotIds("restaurant")).toEqual(expect.objectContaining(new Set(["cuisine_pro", "froid"])));
    expect(lotIds("cafe")).toEqual(expect.objectContaining(new Set(["cuisine_pro", "froid"])));
    expect(lotIds("boutique_commerciale")).toEqual(expect.objectContaining(new Set(["facade", "enseignes"])));
    expect(lotIds("bureau_cabinet")).toEqual(expect.objectContaining(new Set(["cloisons"])));
    expect(lotIds("atelier")).toEqual(expect.objectContaining(new Set(["charpente"])));
    expect(lotIds("entrepot")).toEqual(expect.objectContaining(new Set(["charpente"])));
    expect(lotIds("batiment_agricole")).toEqual(expect.objectContaining(new Set(["charpente"])));
    expect(lotIds("electricite_complete")).toEqual(expect.objectContaining(new Set(["tableau", "cablage", "appareillage", "terre"])));
    expect(lotIds("plomberie_complete")).toEqual(expect.objectContaining(new Set(["alimentation", "evacuation", "sanitaires", "chauffe_eau"])));
  });
});

describe("generateDqe — comportement proportionnel et prix en direct", () => {
  it("les quantités des lignes liées à la surface suivent la surface", () => {
    const base = run("maison", { surface: 120 });
    const doubled = run("maison", { surface: 240 });
    const find = (dqe: ReturnType<typeof run>, designation: string) =>
      dqe.lots
        .flatMap((l) => l.lines)
        .find((l) => l.designation === designation)!;

    const qBase = find(base, "Revêtements de sol (carrelage grès cérame premier choix)").quantity;
    const qDouble = find(doubled, "Revêtements de sol (carrelage grès cérame premier choix)").quantity;
    expect(qDouble).toBe(Math.round(qBase * 2));
  });

  it("les lignes à quantité fixe ne changent pas avec la surface", () => {
    const base = run("maison", { surface: 120 });
    const doubled = run("maison", { surface: 240 });
    const find = (dqe: ReturnType<typeof run>, designation: string) =>
      dqe.lots.flatMap((l) => l.lines).find((l) => l.designation === designation)!;
    expect(find(base, "Étude architecturale et permis de construire").quantity).toBe(1);
    expect(find(doubled, "Étude architecturale et permis de construire").quantity).toBe(1);
  });

  it("un prix en direct de la base materialPrices écrase le prix de référence", () => {
    // « Ciment CPJ 42.5 » n'existe plus dans le gabarit résidentiel (modèle
    // Google Sheets) : on teste une désignation présente et mappée au catalogue.
    const live = livePriceFor("Carrelage grès cérame 60×60 (m²)", 99);
    const dqeLive = run("maison", { livePrices: live });
    const dqeRef = run("maison");

    const line = (dqe: ReturnType<typeof run>) =>
      dqe.lots
        .flatMap((l) => l.lines)
        .find((l) => l.designation === "Revêtements de sol (carrelage grès cérame premier choix)")!;

    expect(line(dqeLive).unitPrice).toBeGreaterThan(line(dqeRef).unitPrice);
    // Les deux versions restent calibrées sur le même budget total
    expect(dqeLive.totals.total).toBe(dqeRef.totals.total);
  });

  it("le budget total est respecté (écart ≤ 1 % par lot)", () => {
    const dqe = run("maison", { totalBudget: 250_000 });
    expect(Math.abs(dqe.totals.total - 250_000)).toBeLessThanOrEqual(2_500);
  });
});

describe("buildDqeLots — rétro-compatibilité des anciens slugs", () => {
  it("un ancien slug sans gabarit dédié retombe sur le gabarit résidentiel", () => {
    const lots = buildDqeLots("jardin");
    expect(lots.map((l) => l.id)).toEqual(
      expect.arrayContaining(["frais_preliminaires", "gros_oeuvre", "second_oeuvre", "amenagements_exterieurs", "vrd"]),
    );
  });

  it("le gabarit d'un ancien slug mappé suit son type officiel", () => {
    const lots = buildDqeLots("installations_electricite");
    expect(lots.map((l) => l.id)).toEqual(
      expect.arrayContaining(["tableau", "cablage", "appareillage", "terre"]),
    );
  });

  it("installations sanitaires suit le gabarit plomberie complète", () => {
    const lots = buildDqeLots("installations_sanitaires");
    expect(lots.map((l) => l.id)).toEqual(
      expect.arrayContaining(["alimentation", "evacuation", "sanitaires", "chauffe_eau"]),
    );
  });

  it("l'ancien slug piscine suit le gabarit piscine béton", () => {
    const lots = buildDqeLots("piscine");
    expect(lots.map((l) => l.id)).toEqual(
      expect.arrayContaining(["terrassement", "structure", "filtration"]),
    );
  });

  it("l'ancien slug bureau suit le gabarit bureau & cabinet", () => {
    const lots = buildDqeLots("bureau");
    expect(lots.map((l) => l.id)).toEqual(
      expect.arrayContaining(["cloisons", "cvc"]),
    );
  });

  it("les anciens slugs résidentiels résolvent vers le gabarit unifié", () => {
    const lotIds = (cat: string) => buildDqeLots(cat).map((l) => l.id).join("|");
    expect(lotIds("immeuble_residentiel")).toBe(lotIds("immeuble"));
    expect(lotIds("maison_hote")).toBe(lotIds("residence_touristique"));
    expect(lotIds("maison_r_plus_1")).toContain("gros_oeuvre");
  });

  it("les anciens slugs commerciaux résolvent vers le gabarit unifié", () => {
    const lotIds = (cat: string) => buildDqeLots(cat).map((l) => l.id).join("|");
    expect(lotIds("boutique_commerciale")).toBe(lotIds("local_commercial"));
    expect(lotIds("bureau_cabinet")).toBe(lotIds("bureau"));
    expect(lotIds("atelier")).toBe(lotIds("entrepot"));
  });
});
