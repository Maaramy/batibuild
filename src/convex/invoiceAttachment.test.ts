// ============================================================================
// PIÈCE JOINTE PDF DE LA FACTURE — génération côté serveur
//
// L'e-mail d'activation d'abonnement et celui de confirmation de paiement
// portent la facture en pièce jointe. Le PDF est produit dans l'action Node
// (`src/convex/invoiceAttachment.ts`) par le MÊME module que le téléchargement
// navigateur : ces tests vérifient que le document est réellement produit, sur
// une page A4, avec le logo officiel, et que le fichier joint porte le nom
// officiel de la facture.
// ============================================================================

import { describe, expect, it } from "vitest";

import { buildInvoicePdfAttachment } from "./invoiceAttachment";
import type { InvoicePdfData } from "../lib/invoicePdf";

const ISSUE_DATE = new Date("2026-09-12T10:00:00Z").getTime();

function invoice(overrides: Partial<InvoicePdfData> = {}): InvoicePdfData {
  return {
    invoiceNumber: "FACT-2026-000001",
    issueDate: ISSUE_DATE,
    paymentDate: ISSUE_DATE,
    billingPeriodStart: ISSUE_DATE,
    billingPeriodEnd: ISSUE_DATE + 30 * 24 * 60 * 60 * 1000,
    profileType: "client",
    plan: "pro",
    description: "Abonnement Client Pro — période du 12/09/2026 au 12/10/2026",
    amountHT: 82.64,
    taxAmount: 15.86,
    taxRate: 19,
    amountTTC: 98.5,
    currency: "TND",
    paymentMethod: "bank_transfer",
    status: "paid",
    transactionId: "TRX-2026-0009",
    customerName: "Amine Ben Salah",
    customerEmail: "amine@example.tn",
    customerAddress: "12 rue de Carthage, Tunis",
    customerCompany: "Ben Salah Bâtiment",
    issuer: {
      name: "batibuild",
      address: "Avenue Habib Bourguiba, Tunis",
      taxId: "1234567/A/M/000",
      email: "facturation@batibuild.app",
      phone: "+216 70 000 000",
      terms: "Paiement à réception de la facture.",
    },
    ...overrides,
  };
}

describe("pièce jointe PDF de facture", () => {
  it("produit un vrai PDF A4 envoyable par e-mail", () => {
    const attachment = buildInvoicePdfAttachment(invoice());

    // Fichier joint nommé comme le téléchargement de « Mes factures ».
    expect(attachment.filename).toBe("FACT-2026-000001.pdf");
    expect(attachment.content.subarray(0, 5).toString()).toBe("%PDF-");
    expect(attachment.content.includes(Buffer.from("%%EOF"))).toBe(true);
    // Document complet : texte de la facture + logo officiel embarqué.
    expect(attachment.content.length).toBeGreaterThan(10_000);
    // Le repli VLY reçoit exactement le même octet-à-octet.
    expect(Buffer.from(attachment.base64, "base64").equals(attachment.content)).toBe(true);
  });

  it("joint aussi une facture en attente ou remboursée (statuts internes)", () => {
    for (const status of ["pending", "cancelled", "refunded"] as const) {
      const attachment = buildInvoicePdfAttachment(
        invoice({ status, paymentDate: status === "pending" ? null : ISSUE_DATE }),
      );
      expect(attachment.content.subarray(0, 5).toString()).toBe("%PDF-");
      expect(attachment.filename).toBe("FACT-2026-000001.pdf");
    }
  });

  it("supporte les forfaits Fournisseur / Expert et les caractères accentués", () => {
    const attachment = buildInvoicePdfAttachment(
      invoice({
        invoiceNumber: "FACT-2026-000042",
        profileType: "supplier",
        plan: "supplier",
        customerCompany: "Société Électro Bâtiment",
        customerName: "Fournisseur Méditerranée",
        amountHT: 0,
        taxAmount: 0,
        taxRate: 0,
        amountTTC: 120,
        currency: "TND",
      }),
    );

    expect(attachment.filename).toBe("FACT-2026-000042.pdf");
    expect(attachment.content.subarray(0, 5).toString()).toBe("%PDF-");
    expect(attachment.content.length).toBeGreaterThan(10_000);
  });
});
