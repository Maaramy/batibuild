// ============================================================================
// Règles d'onglets de la messagerie : onglets visibles par rôle et repli.
//
// Ces règles sont appliquées deux fois — à l'affichage de la barre d'onglets et
// à la résolution de l'onglet demandé par l'URL (`?tab=` venant d'une
// notification, du menu ou d'un ancien lien). Elles sont donc testées ici
// plutôt que dupliquées dans le composant.
//
// Depuis la refonte, la messagerie est l'unique point d'entrée des demandes de
// devis fournisseur : un compte fournisseur voit l'onglet « Demandes de devis »
// (demandes reçues) et non plus un onglet « Devis fournisseurs » (demandes
// envoyées). L'ancien onglet « Rendez-vous » reste redirigé vers « services ».
// ============================================================================
import { describe, expect, it } from "vitest";

import {
  APPOINTMENTS_TAB_ALIAS,
  messagesTabLayout,
  normalizeMessagesTab,
  resolveMessagesTab,
  tabFromSearch,
} from "./messagesTabs";

const EXPERT = messagesTabLayout(true, undefined);
const SUPPLIER = messagesTabLayout(false, true);
const DOUBLE_ROLE = messagesTabLayout(true, true);
const CLIENT = messagesTabLayout(false, false);
const LOADING = messagesTabLayout(undefined, undefined);

describe("messagerie — onglets visibles selon le rôle", () => {
  it("un compte expert voit les demandes reçues et les services, jamais les devis", () => {
    expect(EXPERT.isExpertAccount).toBe(true);
    expect(EXPERT.visibleTabs).toEqual(["received", "services"]);
    expect(EXPERT.showSupplierQuotes).toBe(false);
    expect(EXPERT.showSupplierRequests).toBe(false);
  });

  it("un compte fournisseur voit la gestion des demandes de devis reçues", () => {
    expect(SUPPLIER.visibleTabs).toEqual(["requests"]);
    expect(SUPPLIER.showExpertServices).toBe(false);
    expect(SUPPLIER.showSupplierRequests).toBe(true);
    // Un professionnel pur ne voit pas l'onglet « demandes envoyées » (client).
    expect(SUPPLIER.showSupplierQuotes).toBe(false);
  });

  it("un compte double rôle conserve les services, les demandes reçues et les devis envoyés", () => {
    expect(DOUBLE_ROLE.visibleTabs).toEqual(["received", "services", "requests", "quotes"]);
  });

  it("un client voit les services experts et ses devis envoyés", () => {
    expect(CLIENT.visibleTabs).toEqual(["services", "quotes"]);
    expect(CLIENT.showSupplierRequests).toBe(false);
  });

  it("tant que les profils chargent, aucun masquage à l'aveugle", () => {
    expect(LOADING.visibleTabs).toEqual(["services", "quotes"]);
    expect(LOADING.isExpertAccount).toBe(false);
  });
});

describe("messagerie — onglet demandé par l'URL", () => {
  it("lit l'onglet de l'URL et retombe sur « services » si absent ou inconnu", () => {
    expect(tabFromSearch("received")).toBe("received");
    expect(tabFromSearch("quotes")).toBe("quotes");
    expect(tabFromSearch("requests")).toBe("requests");
    expect(tabFromSearch(null)).toBe("services");
    expect(tabFromSearch("nope")).toBe("services");
  });

  it("redirige l'ancien onglet « Rendez-vous » vers « Services experts »", () => {
    expect(APPOINTMENTS_TAB_ALIAS).toBe("services");
    expect(normalizeMessagesTab("appointments")).toBe("services");
    expect(tabFromSearch("appointments")).toBe("services");
  });

  it("un expert garde l'onglet de la notification (lien profond)", () => {
    expect(resolveMessagesTab("received", EXPERT)).toBe("received");
  });

  it("un ancien lien `?tab=appointments` ouvre les services pour n'importe quel rôle", () => {
    expect(resolveMessagesTab(tabFromSearch("appointments"), EXPERT)).toBe("services");
    expect(resolveMessagesTab(tabFromSearch("appointments"), CLIENT)).toBe("services");
    expect(resolveMessagesTab(tabFromSearch("appointments"), SUPPLIER)).toBe("requests");
  });

  it("les autres onglets masqués retombent sur un onglet visible", () => {
    // Un client qui suit un lien de demande reçue.
    expect(resolveMessagesTab("received", CLIENT)).toBe("services");
    // Un fournisseur qui suit un lien de services experts → ses demandes de devis.
    expect(resolveMessagesTab("services", SUPPLIER)).toBe("requests");
    // Un expert qui suit un lien de devis fournisseurs (masqué).
    expect(resolveMessagesTab("quotes", EXPERT)).toBe("services");
    // Un fournisseur qui suit un lien de devis envoyés (masqué).
    expect(resolveMessagesTab("quotes", SUPPLIER)).toBe("requests");
  });
});
