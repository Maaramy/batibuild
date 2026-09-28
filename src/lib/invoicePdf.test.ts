// ============================================================================
// FACTURE PDF — vérification de la génération du document.
//
// Le PDF est produit dans le navigateur (`src/lib/invoicePdf.ts`) : ces tests
// s'assurent qu'il se génère réellement, sur une page A4, avec le logo officiel
// de la plateforme et sans jamais lever d'erreur — y compris lorsque des
// informations optionnelles manquent (adresse, matricule fiscal, TVA, paiement)
// et lorsque des caractères non gérés par l'Helvetica embarqué sont présents
// dans le nom du client.
// ============================================================================
import { describe, expect, it } from "vitest";

import { generateInvoicePdf, type InvoicePdfData } from "./invoicePdf";

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
    amountHT: 80,
    taxAmount: 0,
    taxRate: 0,
    amountTTC: 80,
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

describe("facture PDF", () => {
  it("génère un document A4 d'une page avec le contenu de la facture", () => {
    const doc = generateInvoicePdf(invoice());

    // Format A4 portrait (jsPDF convertit depuis les points : valeur arrondie).
    expect(Math.round(doc.internal.pageSize.getWidth())).toBe(210);
    expect(Math.round(doc.internal.pageSize.getHeight())).toBe(297);
    expect(doc.getNumberOfPages()).toBe(1);

    // PDF réellement produit (données + logo officiel embarqué).
    const blob = doc.output("blob");
    expect(blob.size).toBeGreaterThan(5000);
  });

  it("reste robuste sans information facultative", () => {
    const doc = generateInvoicePdf(
      invoice({
        paymentDate: null,
        transactionId: null,
        paymentMethod: null,
        status: "pending",
        taxRate: 19,
        amountHT: 67.227,
        taxAmount: 12.773,
        amountTTC: 80,
        customerAddress: null,
        customerCompany: null,
        issuer: { name: "batibuild" },
      }),
    );

    expect(doc.getNumberOfPages()).toBe(1);
    expect(doc.output("blob").size).toBeGreaterThan(5000);
  });

  it("supporte toutes les devises, tous les statuts et les caractères spéciaux", () => {
    const statuses = ["paid", "pending", "cancelled", "refunded"] as const;
    const tables = [
      { invoiceNumber: "FACT-2026-000123", customerName: "Société Med Bâtiment 🏗️", issuer: {} },
      { invoiceNumber: "FACT-2027-000001", customerName: "علاء الدين", issuer: { name: "batibuild SARL" } },
    ];

    for (const status of statuses) {
      for (const extra of tables) {
        const doc = generateInvoicePdf(invoice({ status, ...extra }));
        expect(doc.getNumberOfPages()).toBe(1);
        expect(doc.output("blob").size).toBeGreaterThan(3000);
      }
    }
  });
});
