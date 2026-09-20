// ============================================================================
// Règles d'onglets de la messagerie : onglets visibles par rôle et repli.
//
// Ces règles sont appliquées deux fois — à l'affichage de la barre d'onglets et
// à la résolution de l'onglet demandé par l'URL (`?tab=` venant d'une
// notification, du menu ou d'un ancien lien). Elles sont donc testées ici
// plutôt que dupliquées dans le composant.
// ============================================================================
import { describe, expect, it } from "vitest";

import {
  messagesTabLayout,
  resolveMessagesTab,
  tabFromSearch,
} from "./messagesTabs";

const EXPERT = messagesTabLayout(true, undefined);
const SUPPLIER = messagesTabLayout(false, true);
const DOUBLE_ROLE = messagesTabLayout(true, true);
const CLIENT = messagesTabLayout(false, false);
const LOADING = messagesTabLayout(undefined, undefined);

describe("messagerie — onglets visibles selon le rôle", () => {
  it("un compte expert voit les demandes reçues et les services, jamais « Mes demandes »", () => {
    expect(EXPERT.isExpertAccount).toBe(true);
    expect(EXPERT.visibleTabs).toEqual(["received", "services"]);
    expect(EXPERT.showSupplierQuotes).toBe(false);
    // « Mes demandes » (rendez-vous côté client) a été retiré de l'espace expert.
    expect(EXPERT.visibleTabs).not.toContain("appointments");
  });

  it("un compte fournisseur ne voit pas les services experts (ni les demandes reçues)", () => {
    expect(SUPPLIER.visibleTabs).toEqual(["quotes", "appointments"]);
    expect(SUPPLIER.showExpertServices).toBe(false);
  });

  it("un compte double rôle conserve les services et les devis, sans « Mes demandes »", () => {
    expect(DOUBLE_ROLE.visibleTabs).toEqual(["received", "services", "quotes"]);
  });

  it("un client conserve « Rendez-vous »", () => {
    expect(CLIENT.visibleTabs).toEqual(["services", "quotes", "appointments"]);
  });

  it("tant que les profils chargent, aucun masquage à l'aveugle", () => {
    expect(LOADING.visibleTabs).toEqual(["services", "quotes", "appointments"]);
    expect(LOADING.isExpertAccount).toBe(false);
  });
});

describe("messagerie — onglet demandé par l'URL", () => {
  it("lit l'onglet de l'URL et retombe sur « services » si absent ou inconnu", () => {
    expect(tabFromSearch("received")).toBe("received");
    expect(tabFromSearch("quotes")).toBe("quotes");
    expect(tabFromSearch(null)).toBe("services");
    expect(tabFromSearch("nope")).toBe("services");
  });

  it("un expert garde l'onglet de la notification (lien profond)", () => {
    expect(resolveMessagesTab("received", EXPERT)).toBe("received");
  });

  it("un ancien lien `?tab=appointments` ne laisse jamais un expert sur un écran vide", () => {
    expect(resolveMessagesTab("appointments", EXPERT)).toBe("services");
    expect(resolveMessagesTab("appointments", DOUBLE_ROLE)).toBe("services");
  });

  it("les autres onglets masqués retombent sur un onglet visible", () => {
    // Un client qui suit un lien de demande reçue.
    expect(resolveMessagesTab("received", CLIENT)).toBe("services");
    // Un fournisseur qui suit un lien de services experts.
    expect(resolveMessagesTab("services", SUPPLIER)).toBe("quotes");
    // Un expert qui suit un lien de devis fournisseurs.
    expect(resolveMessagesTab("quotes", EXPERT)).toBe("services");
  });
});
