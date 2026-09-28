// ============================================================================
// FACTURATION — LOGIQUE PARTAGÉE : tests.
//
// Ces tests verrouillent les règles annoncées à l'utilisateur et à
// l'administration :
//   • numéros de facture uniques, séquentiels et lisibles (FACT-2026-000001) ;
//   • prix TTC du forfait respecté : HT + TVA = TTC, sans TVA par défaut ;
//   • quatre statuts, jamais de perte d'historique (les annulées/remboursées
//     restent comptées séparément) ;
//   • filtres identiques côté interface et côté serveur.
// ============================================================================
import { describe, expect, it } from "vitest";

import {
  DEFAULT_PAYMENT_TERMS,
  DEFAULT_VAT_RATE_PERCENT,
  INVOICE_NUMBER_PREFIX,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUSES,
  applyInvoiceFilter,
  computeInvoiceStats,
  computeInvoiceTax,
  emptyInvoiceFilter,
  emptyInvoiceStats,
  endOfDay,
  formatBillingPeriod,
  formatInvoiceDate,
  formatInvoiceNumber,
  formatMoney,
  invoiceCounterKind,
  invoiceDescription,
  invoicePeriodEnd,
  invoiceProfileTypeLabel,
  invoicePlanLabel,
  invoiceYear,
  isInvoiceFilterActive,
  matchesInvoiceFilter,
  parseInvoiceNumber,
  roundMoney,
  startOfDay,
  type InvoiceFilterable,
} from "./invoiceStatus";

function invoice(overrides: Partial<InvoiceFilterable> = {}): InvoiceFilterable {
  return {
    invoiceNumber: "FACT-2026-000001",
    issueDate: new Date("2026-03-10T10:00:00Z").getTime(),
    status: "paid",
    profileType: "client",
    plan: "pro",
    amountTTC: 80,
    currency: "TND",
    customerName: "Amine Ben Salah",
    customerEmail: "amine@example.tn",
    ...overrides,
  };
}

describe("facturation — numérotation", () => {
  it("produit un numéro séquentiel lisible et unique", () => {
    expect(formatInvoiceNumber(2026, 1)).toBe("FACT-2026-000001");
    expect(formatInvoiceNumber(2026, 123)).toBe("FACT-2026-000123");
    expect(formatInvoiceNumber(2026, 999999)).toBe("FACT-2026-999999");
    // Un nouveau numéro pour chaque séquence : jamais de doublon.
    const numbers = [1, 2, 3, 4, 5].map((n) => formatInvoiceNumber(2026, n));
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers[4]).toBe("FACT-2026-000005");
  });

  it("préfixe tout numéro par le libellé officiel de facture", () => {
    expect(formatInvoiceNumber(2026, 7).startsWith(`${INVOICE_NUMBER_PREFIX}-`)).toBe(true);
  });

  it("sépare les séquences par année civile", () => {
    expect(invoiceCounterKind(2026)).toBe("invoice:2026");
    expect(invoiceCounterKind(2027)).not.toBe(invoiceCounterKind(2026));
    expect(formatInvoiceNumber(2027, 1)).toBe("FACT-2027-000001");
  });

  it("relit un numéro de facture (année + séquence)", () => {
    expect(parseInvoiceNumber("FACT-2026-000042")).toEqual({ year: 2026, sequence: 42 });
    expect(parseInvoiceNumber("INV-42")).toBeNull();
    expect(parseInvoiceNumber("")).toBeNull();
    expect(parseInvoiceNumber(undefined)).toBeNull();
  });

  it("déduit l'année de numérotation de l'horloge serveur", () => {
    expect(invoiceYear(new Date("2026-09-28T12:00:00Z").getTime())).toBe(2026);
  });
});

describe("facturation — montants et TVA", () => {
  it("sans TVA : HT = TTC (TVA non applicable par défaut)", () => {
    const breakdown = computeInvoiceTax(80);
    expect(DEFAULT_VAT_RATE_PERCENT).toBe(0);
    expect(breakdown).toEqual({ amountHT: 80, taxAmount: 0, amountTTC: 80, taxRate: 0 });
  });

  it("avec TVA : le prix TTC payé par le client reste inchangé", () => {
    const breakdown = computeInvoiceTax(119, 19);
    expect(breakdown.amountTTC).toBe(119);
    expect(breakdown.amountHT).toBe(100);
    expect(breakdown.taxAmount).toBe(19);
    expect(breakdown.taxRate).toBe(19);
    // HT + TVA = TTC, toujours.
    expect(roundMoney(breakdown.amountHT + breakdown.taxAmount)).toBe(breakdown.amountTTC);
  });

  it("arrondit au millime et ne descend jamais sous zéro", () => {
    const breakdown = computeInvoiceTax(120, 19);
    expect(roundMoney(breakdown.amountHT + breakdown.taxAmount)).toBe(120);
    expect(computeInvoiceTax(-50).amountTTC).toBe(0);
    expect(computeInvoiceTax(80, Number.NaN).taxAmount).toBe(0);
  });

  it("formate les montants en dinars tunisiens", () => {
    // `Intl` utilise une espace insécable fine comme séparateur de milliers.
    const spaced = (value: string) => value.replace(/[\u202f\u00a0]/g, " ");
    expect(formatMoney(80, "TND")).toBe("80 TND");
    expect(formatMoney(0, "TND")).toBe("0 TND");
    expect(spaced(formatMoney(1234.5, "TND"))).toBe("1 234,5 TND");
    expect(formatMoney(null, "TND")).toBe("0 TND");
  });

  it("formate dates et périodes de facturation", () => {
    const start = new Date("2026-03-10T00:00:00Z").getTime();
    const end = invoicePeriodEnd(start);
    expect(formatInvoiceDate(start)).toMatch(/^1[01]\/03\/2026$/);
    expect(formatBillingPeriod(start, end)).toContain("→");
    expect(formatBillingPeriod(null, end)).toBe("—");
  });
});

describe("facturation — statuts et libellés", () => {
  it("expose exactement les quatre statuts demandés", () => {
    expect([...INVOICE_STATUSES]).toEqual(["paid", "pending", "cancelled", "refunded"]);
    expect(INVOICE_STATUS_LABELS.paid).toBe("Payée");
    expect(INVOICE_STATUS_LABELS.pending).toBe("En attente");
    expect(INVOICE_STATUS_LABELS.cancelled).toBe("Annulée");
    expect(INVOICE_STATUS_LABELS.refunded).toBe("Remboursée");
  });

  it("traduit profils et forfaits", () => {
    expect(invoiceProfileTypeLabel("client")).toBe("Client Pro");
    expect(invoiceProfileTypeLabel("supplier")).toBe("Fournisseur");
    expect(invoiceProfileTypeLabel("expert")).toBe("Expert");
    expect(invoicePlanLabel("pro")).toBe("Client Pro");
    expect(invoicePlanLabel("supplier")).toBe("Fournisseur");
    expect(invoicePlanLabel(null)).toBe("—");
  });

  it("décrit la facture avec sa période réelle", () => {
    const start = new Date("2026-03-10T00:00:00Z").getTime();
    const description = invoiceDescription("pro", start, invoicePeriodEnd(start));
    expect(description).toContain("Client Pro");
    expect(description).toContain("10/03/2026");
    expect(description).toContain("09/04/2026");
  });

  it("rappelle des conditions de paiement explicites", () => {
    expect(DEFAULT_PAYMENT_TERMS).toMatch(/virement bancaire/);
    expect(DEFAULT_PAYMENT_TERMS).toMatch(/Aucun prélèvement automatique/);
  });
});

describe("facturation — filtres", () => {
  it("un filtre vide conserve toutes les factures", () => {
    const filter = emptyInvoiceFilter();
    expect(isInvoiceFilterActive(filter)).toBe(false);
    expect(matchesInvoiceFilter(invoice(), filter)).toBe(true);
  });

  it("recherche par numéro, nom ou e-mail du client (sans accent ni casse)", () => {
    const rows = [
      invoice({ invoiceNumber: "FACT-2026-000001", customerName: "Amine Ben Salah" }),
      invoice({
        invoiceNumber: "FACT-2026-000002",
        customerName: "Société Med Bâtiment",
        customerEmail: "contact@medbat.tn",
        status: "pending",
        profileType: "supplier",
        plan: "supplier",
        amountTTC: 120,
      }),
    ];

    expect(applyInvoiceFilter(rows, { ...emptyInvoiceFilter(), search: "000002" })).toHaveLength(1);
    // « med BAT » retrouve « Société Med Bâtiment » (accents ignorés).
    expect(applyInvoiceFilter(rows, { ...emptyInvoiceFilter(), search: "med BAT" })).toHaveLength(1);
    expect(applyInvoiceFilter(rows, { ...emptyInvoiceFilter(), search: "societe med batiment" })).toHaveLength(1);
    expect(applyInvoiceFilter(rows, { ...emptyInvoiceFilter(), search: "AMINE@" })).toHaveLength(1);
    expect(applyInvoiceFilter(rows, { ...emptyInvoiceFilter(), search: "inconnu" })).toHaveLength(0);
  });

  it("filtre par statut, profil et abonnement", () => {
    const rows = [
      invoice(),
      invoice({ status: "pending", profileType: "supplier", plan: "supplier" }),
      invoice({ status: "refunded", profileType: "expert", plan: "expert" }),
      invoice({ status: "cancelled" }),
    ];

    expect(applyInvoiceFilter(rows, { ...emptyInvoiceFilter(), status: "paid" })).toHaveLength(1);
    expect(applyInvoiceFilter(rows, { ...emptyInvoiceFilter(), status: "cancelled" })).toHaveLength(1);
    expect(
      applyInvoiceFilter(rows, { ...emptyInvoiceFilter(), profileType: "supplier" }),
    ).toHaveLength(1);
    expect(applyInvoiceFilter(rows, { ...emptyInvoiceFilter(), plan: "expert" })).toHaveLength(1);
    expect(isInvoiceFilterActive({ ...emptyInvoiceFilter(), status: "paid" })).toBe(true);
  });

  it("filtre par période, bornes incluses sur la journée", () => {
    const day = new Date("2026-03-10T10:00:00Z").getTime();
    const rows = [
      invoice({ invoiceNumber: "FACT-2026-000001", issueDate: day }),
      invoice({ invoiceNumber: "FACT-2026-000002", issueDate: new Date("2026-04-15T09:00:00Z").getTime() }),
    ];

    const march = {
      ...emptyInvoiceFilter(),
      from: startOfDay(day),
      to: endOfDay(day),
    };
    expect(applyInvoiceFilter(rows, march)).toHaveLength(1);
    expect(endOfDay(day) - startOfDay(day)).toBe(24 * 60 * 60 * 1000 - 1);

    const from = { ...emptyInvoiceFilter(), from: new Date("2026-04-01T00:00:00Z").getTime() };
    expect(applyInvoiceFilter(rows, from)).toHaveLength(1);

    const all = { ...emptyInvoiceFilter(), from: startOfDay(day), to: endOfDay(new Date("2026-04-30T10:00:00Z").getTime()) };
    expect(applyInvoiceFilter(rows, all)).toHaveLength(2);
  });

  it("combine plusieurs critères", () => {
    const rows = [
      invoice({ status: "pending", profileType: "supplier", plan: "supplier", amountTTC: 120 }),
      invoice({ status: "pending", profileType: "expert", plan: "expert", amountTTC: 120 }),
    ];
    const filtered = applyInvoiceFilter(rows, {
      ...emptyInvoiceFilter(),
      status: "pending",
      profileType: "supplier",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].plan).toBe("supplier");
  });
});

describe("facturation — statistiques", () => {
  it("compte les factures de chaque statut", () => {
    const stats = computeInvoiceStats([
      invoice({ status: "paid" }),
      invoice({ status: "paid", amountTTC: 120 }),
      invoice({ status: "pending", amountTTC: 120 }),
      invoice({ status: "refunded", amountTTC: 80 }),
      invoice({ status: "cancelled", amountTTC: 1000 }),
    ]);

    expect(stats.count).toBe(5);
    expect(stats.byStatus).toEqual({ paid: 2, pending: 1, cancelled: 1, refunded: 1 });
    // CA facturé = payées + en attente (une facture annulée ne compte pas).
    expect(stats.billedTTC).toBe(320);
    expect(stats.collectedTTC).toBe(200);
    expect(stats.pendingTTC).toBe(120);
    expect(stats.refundedTTC).toBe(80);
    expect(stats.currency).toBe("TND");
  });

  it("n'invente aucun montant quand il n'y a aucune facture", () => {
    expect(emptyInvoiceStats()).toMatchObject({
      count: 0,
      billedTTC: 0,
      collectedTTC: 0,
      pendingTTC: 0,
      refundedTTC: 0,
    });
    expect(computeInvoiceStats([]).byStatus).toEqual({ paid: 0, pending: 0, cancelled: 0, refunded: 0 });
    expect(computeInvoiceStats([]).billedTTC).toBe(0);
  });

  it("additionne sans perte de millimes", () => {
    const stats = computeInvoiceStats([
      invoice({ amountTTC: 80.333, status: "paid" }),
      invoice({ amountTTC: 80.334, status: "paid" }),
    ]);
    expect(stats.collectedTTC).toBe(roundMoney(160.667));
  });
});
