// ============================================================================
// Modèle de statut des demandes de devis fournisseur.
//
// Ces règles sont appliquées côté client ET côté fournisseur : elles sont donc
// testées ici plutôt que dupliquées dans chaque composant. Le point important
// est la COMPATIBILITÉ : les anciennes demandes (`pending` / `responded` /
// `closed`) doivent continuer à s'afficher correctement, sans migration.
// ============================================================================
import { describe, expect, it } from "vitest";

import {
  QUOTE_STATUS_META,
  QUOTE_STATUS_ORDER,
  canClientDecide,
  canSupplierAct,
  quoteStatusLabel,
  quoteStatusMeta,
} from "./quoteStatus";

describe("quoteStatus — libellés", () => {
  it("libelle les anciens statuts sans les migrer", () => {
    expect(quoteStatusLabel("pending")).toBe("Nouvelle");
    expect(quoteStatusLabel("responded")).toBe("Devis envoyé");
    expect(quoteStatusLabel("closed")).toBe("Clôturée");
  });

  it("expose tous les statuts demandés par la messagerie", () => {
    expect(quoteStatusLabel("pending")).toBe("Nouvelle");
    expect(quoteStatusLabel("in_progress")).toBe("En cours");
    expect(quoteStatusLabel("responded")).toBe("Devis envoyé");
    expect(quoteStatusLabel("accepted")).toBe("Acceptée");
    expect(quoteStatusLabel("refused")).toBe("Refusée");
    expect(quoteStatusLabel("expired")).toBe("Expirée");
  });

  it("retombe sur un repli neutre pour un statut inconnu", () => {
    expect(quoteStatusMeta("legacy_unknown").label).toBe("Statut inconnu");
    expect(quoteStatusLabel(undefined)).toBe("Statut inconnu");
    expect(quoteStatusMeta(null).chip).toContain("muted");
  });

  it("couvre chaque statut de l'ordre d'affichage", () => {
    for (const status of QUOTE_STATUS_ORDER) {
      expect(QUOTE_STATUS_META[status]).toBeTruthy();
      expect(QUOTE_STATUS_META[status].label.length).toBeGreaterThan(0);
    }
  });
});

describe("quoteStatus — permissions d'action", () => {
  it("autorise le fournisseur tant que le client n'a pas tranché", () => {
    expect(canSupplierAct("pending")).toBe(true);
    expect(canSupplierAct("in_progress")).toBe(true);
    expect(canSupplierAct("responded")).toBe(true);
  });

  it("interdit au fournisseur d'agir sur une demande tranchée", () => {
    expect(canSupplierAct("accepted")).toBe(false);
    expect(canSupplierAct("refused")).toBe(false);
    expect(canSupplierAct("closed")).toBe(false);
    expect(canSupplierAct("expired")).toBe(false);
  });

  it("n'autorise le client à trancher que sur un devis envoyé", () => {
    expect(canClientDecide("responded")).toBe(true);
    expect(canClientDecide("pending")).toBe(false);
    expect(canClientDecide("accepted")).toBe(false);
  });
});
