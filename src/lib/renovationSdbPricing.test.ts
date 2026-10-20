import { describe, it, expect } from "vitest";

import {
  SDB_DEFAULT_OPTIONS,
  SDB_PRICE_BASE,
  SDB_VAT_RATE,
  buildSdbEstimate,
  buildSdbPriceResolver,
  latestSdbAdminPriceUpdate,
  normalizeSdbPriceKey,
  resolveSdbVatRate,
  sdbDqeLots,
  sdbGeometry,
  type SdbScenario,
} from "./renovationSdbPricing";

// ============================================================================
// DQE — RÉNOVATION SALLE DE BAIN (Tunisie 2026)
// ----------------------------------------------------------------------------
// Vérifie la grille de prix, les quantités réelles, les scénarios, les postes
// optionnels et la décomposition HT / TVA / TTC. Aucun prix « unique de
// catégorie » ne doit subsister.
// ============================================================================

const SMALL = 4;
const LARGE = 8;

const allLines = (surface: number, scenario: SdbScenario = "standard") =>
  buildSdbEstimate({ surface, scenario }).lots.flatMap((l) => l.lines);

describe("géométrie réelle de la pièce", () => {
  it("distingue surface au sol, périmètre et surface de faïence", () => {
    const g = sdbGeometry(6);
    expect(g.floorArea).toBe(6);
    expect(g.perimeter).toBeCloseTo(4 * Math.sqrt(6), 2);
    expect(g.wallArea).toBeCloseTo(g.perimeter * 2 - 1.4, 2);
    // La surface de faïence n'est JAMAIS la surface au sol.
    expect(g.wallArea).not.toBe(g.floorArea);
    expect(g.wallArea).toBeGreaterThan(g.floorArea);
    expect(g.ceilingArea).toBe(g.floorArea);
  });

  it("les quantités de revêtement incluent une marge de coupe (10 %)", () => {
    const est = buildSdbEstimate({ surface: SMALL });
    const floorTile = est.lots
      .flatMap((l) => l.lines)
      .find((l) => l.designation === "Carrelage de sol antidérapant (grès cérame)");
    expect(floorTile?.quantity).toBeCloseTo(SMALL * 1.1, 1);
    const wallTile = est.lots
      .flatMap((l) => l.lines)
      .find((l) => l.designation === "Faïence murale (20×30 ou 25×40)");
    // Quantité arrondie à l'unité au-delà de 10 m² : écart maximal de 0,5 m².
    const expectedWall = est.geometry.wallArea * 1.1;
    expect(Math.abs((wallTile?.quantity ?? 0) - expectedWall)).toBeLessThanOrEqual(0.5);
    expect(wallTile?.quantity).toBeGreaterThan(SMALL);
  });
});

describe("prix distincts par article (plus de prix identiques par défaut)", () => {
  it("chaque poste a son propre prix unitaire", () => {
    const lines = allLines(SMALL).filter((l) => l.unitPriceHT > 0);
    const byPrice = new Map<number, string[]>();
    for (const line of lines) {
      byPrice.set(line.unitPriceHT, [...(byPrice.get(line.unitPriceHT) ?? []), line.designation]);
    }
    // Aucun groupe de prix ne doit rassembler des articles sans rapport : on
    // vérifie explicitement les postes phares du cahier des charges.
    const priceOf = (designation: string) =>
      lines.find((l) => l.designation === designation)?.unitPriceHT;
    expect(priceOf("WC (à poser ou suspendu)")).not.toBe(priceOf("Mitigeur de lavabo"));
    expect(priceOf("Mitigeur de lavabo")).not.toBe(priceOf("Carrelage de sol antidérapant (grès cérame)"));
    expect(priceOf("Colle à carrelage adaptée au support")).not.toBe(
      priceOf("Joints hydrofuges"),
    );
    expect(priceOf("Lavabo ou vasque")).not.toBe(priceOf("Meuble sous vasque"));
    // Les prix restent dans les fourchettes du marché tunisien 2026.
    const floorTile = priceOf("Carrelage de sol antidérapant (grès cérame)")!;
    expect(floorTile).toBeGreaterThanOrEqual(15);
    expect(floorTile).toBeLessThanOrEqual(80);
  });

  it("fourniture et main-d'œuvre sont distinguées sur chaque poste", () => {
    const pose = allLines(SMALL).find((l) => l.designation === "Pose du carrelage de sol");
    expect(pose?.nature).toBe("main_oeuvre");
    expect(pose?.unitPriceHT).toBeGreaterThan(0);
    const supply = allLines(SMALL).find(
      (l) => l.designation === "Carrelage de sol antidérapant (grès cérame)",
    );
    expect(supply?.unitPriceLaborHT).toBe(0);
  });
});

describe("scénarios — grilles distinctes, sans pourcentage global", () => {
  it("Économique < Standard < Premium, sur les mêmes quantités", () => {
    const eco = buildSdbEstimate({ surface: SMALL, scenario: "economique" });
    const std = buildSdbEstimate({ surface: SMALL, scenario: "standard" });
    const pre = buildSdbEstimate({ surface: SMALL, scenario: "premium" });
    expect(eco.totals.totalTTC).toBeLessThan(std.totals.totalTTC);
    expect(std.totals.totalTTC).toBeLessThan(pre.totals.totalTTC);

    const qty = (est: typeof std, designation: string) =>
      est.lots.flatMap((l) => l.lines).find((l) => l.designation === designation)?.quantity;
    // Les quantités sont identiques : seuls les articles (et leurs prix) changent.
    expect(qty(pre, "Faïence murale (20×30 ou 25×40)")).toBe(
      qty(eco, "Faïence murale (20×30 ou 25×40)"),
    );
  });

  it("les écarts viennent des articles : plus de dix prix unitaires diffèrent", () => {
    const eco = buildSdbEstimate({ surface: SMALL, scenario: "economique" });
    const pre = buildSdbEstimate({ surface: SMALL, scenario: "premium" });
    const ecoPrice = new Map(
      eco.lots.flatMap((l) => l.lines).map((l) => [l.designation, l.unitPriceHT]),
    );
    const changed = pre.lots
      .flatMap((l) => l.lines)
      .filter(
        (l) => Math.abs(l.unitPriceHT - (ecoPrice.get(l.designation) ?? l.unitPriceHT)) > 0.01,
      );
    expect(changed.length).toBeGreaterThan(10);
  });

  it("le montant de chaque scénario est la somme de ses lignes", () => {
    for (const scenario of ["economique", "standard", "premium"] as const) {
      const est = buildSdbEstimate({ surface: SMALL, scenario });
      const sum = est.lots.reduce((s, lot) => s + lot.subtotalTTC, 0);
      expect(Math.abs(sum - est.totals.totalTTC)).toBeLessThanOrEqual(0.05);
    }
  });
});

describe("postes optionnels — jamais comptés s'ils ne sont pas retenus", () => {
  it("douche à l'italienne et baignoire absentes par défaut", () => {
    const designations = allLines(SMALL).map((l) => l.designation);
    expect(designations).not.toContain("Douche à l'italienne (caniveau + pente)");
    expect(designations).not.toContain("Baignoire");
    expect(designations).not.toContain("Démolition localisée des cloisons et supports");
    expect(designations).toContain("Receveur de douche 90×90");
  });

  it("sélectionner la douche italienne remplace le receveur et crée la pente", () => {
    const std = buildSdbEstimate({ surface: SMALL });
    const ita = buildSdbEstimate({
      surface: SMALL,
      options: { shower: "italienne" },
    });
    const names = (e: typeof std) => e.lots.flatMap((l) => l.lines).map((l) => l.designation);
    expect(names(ita)).toContain("Douche à l'italienne (caniveau + pente)");
    expect(names(ita)).not.toContain("Receveur de douche 90×90");
    expect(ita.totals.totalTTC).not.toBe(std.totals.totalTTC);
  });

  it("retirer le WC, le meuble ou l'extracteur retire leurs lignes et leur coût", () => {
    const full = buildSdbEstimate({ surface: SMALL });
    const noWc = buildSdbEstimate({ surface: SMALL, options: { toilet: false } });
    expect(noWc.lots.flatMap((l) => l.lines).some((l) => l.designation === "WC (à poser ou suspendu)")).toBe(
      false,
    );
    expect(noWc.totals.totalTTC).toBeLessThan(full.totals.totalTTC);

    const noExtractor = buildSdbEstimate({ surface: SMALL, options: { extractor: false } });
    expect(noExtractor.totals.totalTTC).toBeLessThan(full.totals.totalTTC);
  });

  it("aucune fourniture n'est comptée deux fois", () => {
    const designations = allLines(SMALL).map((l) => l.designation);
    expect(new Set(designations).size).toBe(designations.length);
  });
});

describe("calculs HT / TVA / TTC", () => {
  it("chaque ligne applique le taux de TVA et l'invariant Montant = Qté × P.U.", () => {
    for (const line of allLines(SMALL)) {
      expect(line.vatRate).toBe(SDB_VAT_RATE);
      expect(line.totalHT).toBeCloseTo(line.quantity * line.unitPriceHT, 1);
      expect(line.vatAmount).toBeCloseTo((line.totalHT * SDB_VAT_RATE) / 100, 1);
      expect(line.totalTTC).toBeCloseTo(line.totalHT + line.vatAmount, 1);
    }
  });

  it("les totaux généraux somment HT, TVA et TTC", () => {
    const est = buildSdbEstimate({ surface: SMALL });
    const sumHT = est.lots.reduce((s, l) => s + l.subtotalHT, 0);
    const sumVat = est.lots.reduce((s, l) => s + l.vatAmount, 0);
    expect(Math.abs(sumHT - est.totals.totalHT)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(sumVat - est.totals.vatAmount)).toBeLessThanOrEqual(0.05);
    expect(est.totals.totalTTC).toBeCloseTo(est.totals.totalHT + est.totals.vatAmount, 1);
    // Les natures couvrent exactement le total HT.
    expect(
      est.totals.materiaux +
        est.totals.mainOeuvre +
        est.totals.equipements +
        est.totals.transport +
        est.totals.etudes,
    ).toBeCloseTo(est.totals.totalHT, 1);
  });
});

describe("petite et grande salle de bain", () => {
  it("les quantités et le coût augmentent avec la surface", () => {
    const small = buildSdbEstimate({ surface: SMALL });
    const large = buildSdbEstimate({ surface: LARGE });
    expect(large.geometry.wallArea).toBeGreaterThan(small.geometry.wallArea);
    expect(large.totals.totalTTC).toBeGreaterThan(small.totals.totalTTC);
    const priceOf = (e: typeof small, d: string) =>
      e.lots.flatMap((l) => l.lines).find((l) => l.designation === d);
    expect(priceOf(large, "Pose de la faïence murale")!.quantity).toBeGreaterThan(
      priceOf(small, "Pose de la faïence murale")!.quantity,
    );
    // Le prix unitaire ne change pas avec la surface : seule la quantité varie.
    expect(priceOf(large, "Pose de la faïence murale")!.unitPriceHT).toBe(
      priceOf(small, "Pose de la faïence murale")!.unitPriceHT,
    );
  });
});

describe("provenance des prix", () => {
  it("la base est datée et explicitement non connectée au marché", () => {
    expect(SDB_PRICE_BASE.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(SDB_PRICE_BASE.connectedToMarketFeed).toBe(false);
    expect(SDB_PRICE_BASE.note.length).toBeGreaterThan(20);
  });

  it("les lots exportés pour le quantitatif portent la TVA de chaque ligne", () => {
    const lots = sdbDqeLots(buildSdbEstimate({ surface: SMALL }));
    expect(lots.map((l) => l.name)).toEqual([
      "Dépose et démolition",
      "Maçonnerie et préparation",
      "Étanchéité",
      "Revêtements",
      "Plomberie et évacuation",
      "Sanitaires et mobilier",
      "Électricité et ventilation",
      "Finitions",
    ]);
    for (const lot of lots) {
      for (const line of lot.lines) {
        expect(line.vatRate).toBe(SDB_VAT_RATE);
        expect(line.totalHT).toBeGreaterThan(0);
      }
    }
  });

  it("les options par défaut sont explicites", () => {
    expect(SDB_DEFAULT_OPTIONS.localizedDemolition).toBe(false);
    expect(SDB_DEFAULT_OPTIONS.grandFormat).toBe(false);
    expect(SDB_DEFAULT_OPTIONS.shower).toBe("receveur");
  });

  it("un prix administré remplace la grille, sans toucher aux autres postes", () => {
    const before = buildSdbEstimate({ surface: SMALL });
    const resolver = buildSdbPriceResolver([
      { name: "Mitigeur de lavabo", unitPrice: 260, lastUpdated: 1_780_000_000_000 },
    ]);
    expect(resolver).toBeDefined();
    const after = buildSdbEstimate({ surface: SMALL, resolvePrice: resolver });

    const find = (e: typeof before, d: string) =>
      e.lots.flatMap((l) => l.lines).find((l) => l.designation === d)!;
    const line = find(after, "Mitigeur de lavabo");
    // Prix administré saisi TTC → prix HT = TTC / 1,19.
    expect(line.unitPriceHT).toBeCloseTo(260 / 1.19, 2);
    expect(line.source).toBe("prix_administre");
    expect(after.adminPricedLines).toBe(1);
    // Aucun autre prix ne bouge.
    expect(find(after, "WC (à poser ou suspendu)").unitPriceHT).toBe(
      find(before, "WC (à poser ou suspendu)").unitPriceHT,
    );
    expect(after.totals.totalTTC).toBeGreaterThan(before.totals.totalTTC);
  });

  it("un prix administré est ramené en HT avec le taux de TVA effectif", () => {
    const rows = [{ name: "Mitigeur de lavabo", unitPrice: 260 }];
    // Taux par défaut : TTC / 1,19.
    expect(buildSdbPriceResolver(rows)!("Mitigeur de lavabo", 40).price).toBeCloseTo(
      260 / 1.19,
      2,
    );
    // Taux réglé par l'administrateur : c'est ce même taux qui doit servir à
    // la conversion, sinon page et DQE enregistré divergent dès que TVA ≠ 19 %.
    expect(buildSdbPriceResolver(rows, 13)!("Mitigeur de lavabo", 40).price).toBeCloseTo(
      260 / 1.13,
      2,
    );
    // Taux invalide → taux de droit commun (19 %), jamais une division absurde.
    expect(buildSdbPriceResolver(rows, 55)!("Mitigeur de lavabo", 40).price).toBeCloseTo(
      260 / 1.19,
      2,
    );
    const est = buildSdbEstimate({
      surface: SMALL,
      vatRate: 13,
      resolvePrice: buildSdbPriceResolver(rows, 13),
    });
    const line = est.lots
      .flatMap((l) => l.lines)
      .find((l) => l.designation === "Mitigeur de lavabo")!;
    expect(line.vatRate).toBe(13);
    // Le TTC affiché reste le prix administré saisi (aux arrondis près).
    expect(line.unitPriceTTC).toBeCloseTo(260, 1);
  });

  it("le rapprochement des libellés ignore accents, casse et symbole ×", () => {
    expect(normalizeSdbPriceKey("Faïence murale (20×30 ou 25×40)")).toBe(
      normalizeSdbPriceKey("faience murale 20x30 ou 25x40"),
    );
    const resolver = buildSdbPriceResolver([
      { name: "FAIENCE MURALE 20x30 OU 25x40", unitPrice: 119 },
    ]);
    expect(resolver?.("Faïence murale (20×30 ou 25×40)", 40).source).toBe("prix_administre");
  });

  it("sans prix administré, la grille 2026 est conservée", () => {
    expect(buildSdbPriceResolver([])).toBeUndefined();
    expect(buildSdbPriceResolver(null)).toBeUndefined();
    const est = buildSdbEstimate({ surface: SMALL, resolvePrice: buildSdbPriceResolver([]) });
    expect(est.adminPricedLines).toBe(0);
    expect(est.lots.flatMap((l) => l.lines).every((l) => l.source === "grille_2026")).toBe(true);
  });

  it("le taux de TVA administré s'applique à chaque ligne, sans changer le HT", () => {
    const base = buildSdbEstimate({ surface: SMALL });
    const reduced = buildSdbEstimate({ surface: SMALL, vatRate: 13 });
    expect(reduced.vatRate).toBe(13);
    expect(reduced.totals.totalHT).toBeCloseTo(base.totals.totalHT, 2);
    for (const line of reduced.lots.flatMap((l) => l.lines)) {
      expect(line.vatRate).toBe(13);
      expect(line.vatAmount).toBeCloseTo((line.totalHT * 13) / 100, 1);
      expect(line.totalTTC).toBeCloseTo(line.totalHT + line.vatAmount, 1);
    }
    expect(reduced.totals.totalTTC).toBeCloseTo(
      reduced.totals.totalHT + reduced.totals.vatAmount,
      1,
    );
    expect(reduced.totals.totalTTC).toBeLessThan(base.totals.totalTTC);
  });

  it("un taux de TVA hors 0-30 % retombe sur le taux de droit commun", () => {
    expect(resolveSdbVatRate(undefined)).toBe(SDB_VAT_RATE);
    expect(resolveSdbVatRate(0)).toBe(0);
    expect(resolveSdbVatRate(30)).toBe(30);
    expect(resolveSdbVatRate(-1)).toBe(SDB_VAT_RATE);
    expect(resolveSdbVatRate(31)).toBe(SDB_VAT_RATE);
    expect(resolveSdbVatRate(Number.NaN)).toBe(SDB_VAT_RATE);
  });

  it("la date de mise à jour retenue est la plus récente", () => {
    expect(latestSdbAdminPriceUpdate([{ name: "A", unitPrice: 1, lastUpdated: 100 }])).toBe(100);
    expect(
      latestSdbAdminPriceUpdate([
        { name: "A", unitPrice: 1, lastUpdated: 100 },
        { name: "B", unitPrice: 2, lastUpdated: 500 },
      ]),
    ).toBe(500);
    expect(latestSdbAdminPriceUpdate([])).toBeUndefined();
  });
});
