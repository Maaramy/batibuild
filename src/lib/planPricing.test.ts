import { describe, it, expect } from "vitest";
import {
  DEFAULT_PLAN_PRICES,
  defaultPlanPriceFields,
  isFreePlanPrice,
  planPriceLabel,
  planPricingFormValues,
  resolvePlanPrice,
} from "./planPricing";

// ============================================================================
// Règle de lecture du prix d'un forfait (régression « 80 TND »)
// ============================================================================
// Le prix enregistré par l'administrateur ne doit JAMAIS être remplacé par la
// valeur initiale : un champ ABSENT (document créé par un autre réglage) vaut
// la valeur initiale, tandis qu'un `null`/0 explicite vaut « Offre gratuite ».

describe("resolvePlanPrice", () => {
  it("champ absent → valeur initiale du forfait", () => {
    expect(resolvePlanPrice(undefined, DEFAULT_PLAN_PRICES.pro)).toBe(80);
    expect(resolvePlanPrice(undefined, DEFAULT_PLAN_PRICES.supplier)).toBe(120);
    expect(resolvePlanPrice(undefined, DEFAULT_PLAN_PRICES.expert)).toBe(120);
  });

  it("prix enregistré → valeur conservée telle quelle", () => {
    expect(resolvePlanPrice(95, DEFAULT_PLAN_PRICES.pro)).toBe(95);
    expect(resolvePlanPrice(130, DEFAULT_PLAN_PRICES.supplier)).toBe(130);
  });

  it("null / 0 explicite → offre gratuite (jamais remplacé par la valeur initiale)", () => {
    expect(resolvePlanPrice(null, DEFAULT_PLAN_PRICES.pro)).toBeNull();
    expect(resolvePlanPrice(0, DEFAULT_PLAN_PRICES.pro)).toBe(0);
  });
});

describe("isFreePlanPrice", () => {
  it("seul un prix explicite null/0 est gratuit", () => {
    expect(isFreePlanPrice(null)).toBe(true);
    expect(isFreePlanPrice(0)).toBe(true);
    expect(isFreePlanPrice(undefined)).toBe(false);
    expect(isFreePlanPrice(80)).toBe(false);
    expect(isFreePlanPrice(95)).toBe(false);
  });
});

describe("planPricingFormValues — formulaire d'administration", () => {
  it("n'invente aucun prix tant que la configuration n'est pas chargée", () => {
    expect(planPricingFormValues(undefined)).toBeNull();
    expect(planPricingFormValues(null)).toBeNull();
  });

  it("reprend le prix enregistré par l'administrateur", () => {
    const values = planPricingFormValues({
      proPrice: 95,
      supplierPrice: 130,
      expertPrice: 140,
    });
    expect(values).toEqual({
      clientProPrice: 95,
      clientProFree: false,
      supplierPrice: 130,
      supplierFree: false,
      expertPrice: 140,
      expertFree: false,
    });
  });

  it("un champ absent n'est PAS traité comme « gratuit » (régression 80 TND)", () => {
    const values = planPricingFormValues({
      proPrice: undefined,
      supplierPrice: undefined,
      expertPrice: undefined,
    });
    // Le forfait reste payant à sa valeur initiale : l'ancienne lecture le
    // marquait « gratuit », ce qui réécrivait `null` et perdait le prix saisi.
    expect(values).toEqual({
      clientProPrice: 80,
      clientProFree: false,
      supplierPrice: 120,
      supplierFree: false,
      expertPrice: 120,
      expertFree: false,
    });
  });

  it("un forfait explicitement gratuit est signalé comme tel", () => {
    const values = planPricingFormValues({
      proPrice: null,
      supplierPrice: 0,
      expertPrice: 120,
    });
    expect(values!.clientProFree).toBe(true);
    expect(values!.supplierFree).toBe(true);
    expect(values!.expertFree).toBe(false);
    // Champ désactivé : il réaffiche la valeur initiale du forfait.
    expect(values!.clientProPrice).toBe(80);
    expect(values!.supplierPrice).toBe(120);
  });
});

describe("planPriceLabel", () => {
  it("distingue prix enregistré, offre gratuite et valeur inconnue", () => {
    expect(planPriceLabel(95)).toBe("95 TND");
    expect(planPriceLabel(null)).toBe("Gratuit");
    expect(planPriceLabel(0)).toBe("Gratuit");
    expect(planPriceLabel(undefined)).toBe("—");
  });
});

describe("defaultPlanPriceFields", () => {
  it("fournit les prix à écrire lors de la création d'un document de configuration", () => {
    expect(defaultPlanPriceFields()).toEqual({
      proPrice: 80,
      supplierPrice: 120,
      expertPrice: 120,
    });
  });
});
