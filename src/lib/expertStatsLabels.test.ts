import { describe, it, expect } from "vitest";
import {
  DEMAND_STATUS_META,
  kindLabel,
  ratePercent,
  sourceLabel,
  statusMeta,
} from "./expertStatsLabels";

describe("sourceLabel", () => {
  it("traduit les sources connues", () => {
    expect(sourceLabel("direct")).toBe("Accès direct");
    expect(sourceLabel("search")).toBe("Recherche / annuaire");
    expect(sourceLabel("social")).toBe("Réseaux sociaux");
    expect(sourceLabel("other")).toBe("Autres sources");
  });

  it("retombe sur la clé brute pour une source inconnue", () => {
    expect(sourceLabel("newsletter")).toBe("newsletter");
  });
});

describe("kindLabel", () => {
  it("traduit les natures de demande", () => {
    expect(kindLabel("devis")).toBe("Devis");
    expect(kindLabel("appointment")).toBe("Rendez-vous");
    expect(kindLabel("urgent")).toBe("Urgence");
    expect(kindLabel("rating")).toBe("Avis");
  });

  it("retombe sur la clé brute pour une nature inconnue", () => {
    expect(kindLabel("inconnu")).toBe("inconnu");
  });
});

describe("statusMeta", () => {
  it("renvoie un libellé et un style pour chaque statut géré", () => {
    for (const status of Object.keys(DEMAND_STATUS_META)) {
      const meta = statusMeta(status);
      expect(meta.label).toBeTruthy();
      expect(meta.className).toBeTruthy();
    }
  });

  it("ne renvoie jamais de libellé vide pour un statut inconnu", () => {
    const meta = statusMeta("statut_bizarre");
    expect(meta.label).toBeTruthy();
    expect(meta.className).toBeTruthy();
  });
});

describe("ratePercent", () => {
  it("calcule un pourcentage à une décimale", () => {
    expect(ratePercent(1, 3)).toBe(33.3);
    expect(ratePercent(2, 3)).toBe(66.7);
    expect(ratePercent(5, 5)).toBe(100);
  });

  it("retourne 0 quand le total est nul (aucune division par zéro)", () => {
    expect(ratePercent(0, 0)).toBe(0);
    expect(ratePercent(4, 0)).toBe(0);
  });
});
