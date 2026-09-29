import { describe, it, expect } from "vitest";
import {
  PAYMENT_METHOD_CATALOG,
  availablePaymentMethods,
  defaultPaymentMethodStates,
  enabledPaymentMethodSlugs,
  isPaymentMethodEnabled,
  mergePaymentMethodStates,
  requiresManualValidation,
} from "./paymentMethods";

describe("catalogue des méthodes de paiement", () => {
  it("expose des slugs uniques et une méthode « Carte bancaire »", () => {
    const slugs = PAYMENT_METHOD_CATALOG.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toContain("card");
  });

  it("par défaut : les méthodes implémentées sont actives, les autres non", () => {
    const states = defaultPaymentMethodStates();
    expect(isPaymentMethodEnabled(states, "bank_transfer")).toBe(true);
    expect(isPaymentMethodEnabled(states, "d17")).toBe(true);
    // Méthode déclarée mais dont le flux n'est pas connecté.
    expect(isPaymentMethodEnabled(states, "card")).toBe(false);
  });
});

describe("requiresManualValidation", () => {
  it("le virement ET le D17 sont validés manuellement par l'administrateur", () => {
    expect(requiresManualValidation("bank_transfer")).toBe(true);
    expect(requiresManualValidation("d17")).toBe(true);
  });

  it("une méthode à encaissement automatique n'exige pas de validation", () => {
    expect(requiresManualValidation("card")).toBe(false);
  });

  it("une méthode absente ou inconnue est traitée comme manuelle", () => {
    // Sécurité : on n'active jamais un paiement qu'on ne sait pas encaisser.
    expect(requiresManualValidation(undefined)).toBe(true);
    expect(requiresManualValidation(null)).toBe(true);
    expect(requiresManualValidation("crypto")).toBe(true);
  });
});

describe("mergePaymentMethodStates", () => {
  it("sans configuration en base, applique les valeurs du catalogue", () => {
    expect(mergePaymentMethodStates(undefined)).toEqual(
      defaultPaymentMethodStates(),
    );
    expect(mergePaymentMethodStates(null)).toEqual(defaultPaymentMethodStates());
  });

  it("respecte une désactivation enregistrée par l'administrateur", () => {
    const states = mergePaymentMethodStates([
      { slug: "bank_transfer", enabled: false },
    ]);
    expect(isPaymentMethodEnabled(states, "bank_transfer")).toBe(false);
    expect(isPaymentMethodEnabled(states, "d17")).toBe(true);
  });

  it("ignore les slugs inconnus stockés en base", () => {
    const states = mergePaymentMethodStates([
      { slug: "crypto", enabled: true },
    ]);
    expect(states.map((s) => s.slug)).toEqual(
      PAYMENT_METHOD_CATALOG.map((m) => m.slug),
    );
  });

  it("ne peut jamais activer une méthode non implémentée", () => {
    const states = mergePaymentMethodStates([{ slug: "card", enabled: true }]);
    expect(isPaymentMethodEnabled(states, "card")).toBe(false);
  });

  it("conserve l'ordre du catalogue, indépendamment de la base", () => {
    const states = mergePaymentMethodStates([
      { slug: "d17", enabled: true },
      { slug: "bank_transfer", enabled: true },
    ]);
    expect(states.map((s) => s.slug)).toEqual(
      PAYMENT_METHOD_CATALOG.map((m) => m.slug),
    );
  });
});

describe("enabledPaymentMethodSlugs / availablePaymentMethods", () => {
  it("liste uniquement les méthodes activées et implémentées", () => {
    const slugs = enabledPaymentMethodSlugs([
      { slug: "d17", enabled: false },
      { slug: "card", enabled: true },
    ]);
    expect(slugs).toEqual(["bank_transfer"]);
  });

  it("retourne toutes les méthodes disponibles quand le catalogue est vide", () => {
    expect(enabledPaymentMethodSlugs([])).toEqual(["bank_transfer", "d17"]);
  });

  it("availablePaymentMethods suit la configuration serveur", () => {
    expect(availablePaymentMethods(["d17"]).map((m) => m.slug)).toEqual(["d17"]);
    expect(availablePaymentMethods([])).toEqual([]);
  });

  it("availablePaymentMethods retombe sur les valeurs par défaut tant que la config n'est pas chargée", () => {
    expect(availablePaymentMethods(undefined).map((m) => m.slug)).toEqual([
      "bank_transfer",
      "d17",
    ]);
  });
});
