// ============================================================================
// FACTURE PDF — DOCUMENT OFFICIEL batibuild
// ----------------------------------------------------------------------------
// Une facture PDF professionnelle, identique pour l'abonné (Profil → Mes
// factures) et pour l'administrateur (Admin → Factures). Elle est générée à
// partir des données ENREGISTRÉES de la facture (montants, période, statut,
// instantané du client et coordonnées de facturation figées à l'émission) :
// la même facture produit donc toujours le même document, même si
// l'utilisateur change ensuite de nom, d'e-mail ou d'abonnement.
//
// Mise en page (A4 portrait, lisible sur mobile comme à l'impression) :
//
//   ┌───────────────────────────────────────────────────────────────┐
//   │  en-tête BLANC PUR : logo officiel + « batibuild » + FACTURE  │
//   │  N° FACT-2026-000001 · date d'émission · statut               │
//   ├───────────────────────────────────────────────────────────────┤
//   │  ÉMETTEUR (batibuild)          │  CLIENT (profil, e-mail…)    │
//   ├───────────────────────────────────────────────────────────────┤
//   │  Tableau détaillé de l'abonnement (HT · TVA · TTC)            │
//   │                              ┌──────────────────────────────┐ │
//   │                              │  TOTAL TTC (mis en avant)    │ │
//   │                              └──────────────────────────────┘ │
//   ├───────────────────────────────────────────────────────────────┤
//   │  Règlement : mode, référence de transaction, conditions       │
//   ├───────────────────────────────────────────────────────────────┤
//   │  pied de page : batibuild — N° facture — Page i/N            │
//   └───────────────────────────────────────────────────────────────┘
//
// Le logo n'est JAMAIS redessiné : il vient de `src/lib/branding.ts`
// (asset officiel de la plateforme), comme tous les autres rapports PDF.
// ============================================================================

import jsPDF from "jspdf";
import { applyPlugin as applyAutotablePlugin } from "jspdf-autotable";

import { BRAND_NAME, BRAND_RGB, BRAND_TAGLINE } from "./branding";
import { drawReportFooters, drawReportHeader, PDF_COLORS } from "./pdfBranding";
import {
  DEFAULT_PAYMENT_TERMS,
  INVOICE_STATUS_RGB,
  formatBillingPeriod,
  formatInvoiceDateLong,
  formatMoney,
  invoicePlanLabel,
  invoiceProfileTypeLabel,
  type InvoiceProfileType,
  type InvoiceStatus,
} from "./invoiceStatus";

applyAutotablePlugin(jsPDF);

/** Coordonnées de facturation de l'émetteur, figées à l'émission de la facture. */
export interface InvoiceIssuer {
  name?: string | null;
  address?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  terms?: string | null;
}

/** Données d'une facture nécessaires au document (structurellement compatible
 *  avec un document Convex `invoices`). */
export interface InvoicePdfData {
  invoiceNumber: string;
  issueDate: number;
  paymentDate?: number | null;
  billingPeriodStart: number;
  billingPeriodEnd: number;
  profileType: InvoiceProfileType;
  plan: string;
  description: string;
  amountHT: number;
  taxAmount: number;
  taxRate: number;
  amountTTC: number;
  currency: string;
  paymentMethod?: string | null;
  status: InvoiceStatus;
  transactionId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerCompany?: string | null;
  issuer?: InvoiceIssuer | null;
}

/** Libellés lisibles des méthodes de paiement internes. */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Virement bancaire",
  d17: "D17",
  admin: "Attribution administrateur",
  card: "Carte bancaire",
};

/** Retire les caractères que l'Helvetica embarqué ne sait pas dessiner. */
function sanitize(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]|\u{FE0F}|\u{200D}|[\u{2600}-\u{27BF}]|[\u{231A}-\u{23FF}]|[\u{24C2}-\u{1F9FF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "—";
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

/** Coordonnées de facturation de l'émetteur, prêtes à imprimer (sans données inventées). */
function issuerContactLines(issuer: InvoiceIssuer | null | undefined): string[] {
  const lines = [issuer?.address, issuer?.taxId ? `Matricule fiscal : ${issuer.taxId}` : null]
    .filter((line): line is string => Boolean(line && line.trim()))
    .map(sanitize);
  return lines;
}

function issuerFooterLine(issuer: InvoiceIssuer | null | undefined): string | undefined {
  const parts = [issuer?.email, issuer?.phone]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map(sanitize);
  return parts.length ? parts.join(" · ") : undefined;
}

/** Dessine un bloc d'informations (cadre très clair, libellé en capitales). */
function drawInfoBlock(
  doc: jsPDF,
  options: {
    x: number;
    y: number;
    width: number;
    title: string;
    lines: string[];
    minHeight?: number;
  },
): number {
  const { x, y, width, title, lines, minHeight = 0 } = options;
  const padding = 3;
  const lineHeight = 4.2;
  const wrapped = lines.flatMap((line) =>
    line ? (doc.splitTextToSize(line, width - padding * 2) as string[]) : [],
  );
  const height = Math.max(minHeight, 10 + wrapped.length * lineHeight);

  doc.setFillColor(...PDF_COLORS.bgLight);
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, width, height, 1.2, 1.2, "FD");

  const secondary = PDF_COLORS.textSecondary;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.6);
  doc.setTextColor(secondary[0], secondary[1], secondary[2]);
  doc.text(title.toUpperCase(), x + padding, y + 4.6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  const text = PDF_COLORS.text;
  doc.setTextColor(text[0], text[1], text[2]);
  wrapped.forEach((line, index) => {
    doc.text(line, x + padding, y + 9.2 + index * lineHeight);
  });

  return y + height;
}

/**
 * Construit le document PDF d'une facture. `doc` est renvoyé pour permettre
 * l'archivage du blob (voir `downloadInvoicePdf`).
 */
export function generateInvoicePdf(invoice: InvoicePdfData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const currency = invoice.currency || "TND";
  const issuer = invoice.issuer ?? {};
  const issuerName = sanitize(issuer.name || BRAND_NAME);
  const statusRgb = INVOICE_STATUS_RGB[invoice.status] ?? BRAND_RGB;

  // ── En-tête commun : fond BLANC PUR + logo officiel + nom de la plateforme ──
  let y = drawReportHeader(doc, {
    title: "FACTURE",
    subtitle: invoice.invoiceNumber,
    margin,
    meta: [
      `N° ${invoice.invoiceNumber}`,
      `Émise le ${formatInvoiceDateLong(invoice.issueDate)}`,
      invoice.status === "paid"
        ? "Statut : Payée"
        : invoice.status === "pending"
          ? "Statut : En attente de paiement"
          : invoice.status === "refunded"
            ? "Statut : Remboursée"
            : "Statut : Annulée",
    ],
    info: [], // les blocs ÉMETTEUR / CLIENT ci-dessous portent l'information
  });
  y += 2;

  // ── Bandeau de statut (couleur du statut, texte lisible) ──
  doc.setFillColor(statusRgb[0], statusRgb[1], statusRgb[2]);
  doc.roundedRect(margin, y, contentWidth, 7, 1.2, 1.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.4);
  doc.setTextColor(255, 255, 255);
  doc.text(
    invoice.status === "paid"
      ? "FACTURE PAYÉE"
      : invoice.status === "pending"
        ? "FACTURE EN ATTENTE DE PAIEMENT"
        : invoice.status === "refunded"
          ? "FACTURE REMBOURSÉE"
          : "FACTURE ANNULÉE",
    margin + 3.2,
    y + 4.8,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.text(
    `Période : ${formatBillingPeriod(invoice.billingPeriodStart, invoice.billingPeriodEnd)}`,
    pageWidth - margin - 3.2,
    y + 4.8,
    { align: "right" },
  );
  y += 12;

  // ── ÉMETTEUR / CLIENT ──
  const gap = 4;
  const columnWidth = (contentWidth - gap) / 2;

  const issuerLines = [
    issuerName,
    ...issuerContactLines(issuer),
    `Profil facturé : ${invoiceProfileTypeLabel(invoice.profileType)}`,
  ];

  const customerLines = [
    sanitize(invoice.customerCompany || invoice.customerName || "Client"),
    invoice.customerCompany && invoice.customerName ? sanitize(invoice.customerName) : "",
    invoice.customerEmail ? sanitize(invoice.customerEmail) : "",
    invoice.customerAddress ? sanitize(invoice.customerAddress) : "",
    `Type de profil : ${invoiceProfileTypeLabel(invoice.profileType)}`,
  ].filter(Boolean);

  const leftBottom = drawInfoBlock(doc, {
    x: margin,
    y,
    width: columnWidth,
    title: "Émetteur",
    lines: issuerLines,
  });
  const rightBottom = drawInfoBlock(doc, {
    x: margin + columnWidth + gap,
    y,
    width: columnWidth,
    title: "Client",
    lines: customerLines,
  });
  y = Math.max(leftBottom, rightBottom) + 7;

  // ── Détail de l'abonnement ──
  const text = PDF_COLORS.text;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.4);
  doc.setTextColor(text[0], text[1], text[2]);
  doc.text("Détail de l'abonnement", margin, y);
  y += 2.5;

  const taxCell =
    invoice.taxRate > 0
      ? `${invoice.taxRate} % (${formatMoney(invoice.taxAmount, currency)})`
      : "Non applicable";

  (doc as unknown as {
    autoTable: (options: Record<string, unknown>) => void;
    lastAutoTable: { finalY: number };
  }).autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Désignation", "Période", "Prix HT", "TVA", "Total TTC"]],
    body: [
      [
        sanitize(invoice.description) || invoicePlanLabel(invoice.plan),
        formatBillingPeriod(invoice.billingPeriodStart, invoice.billingPeriodEnd),
        formatMoney(invoice.amountHT, currency),
        taxCell,
        formatMoney(invoice.amountTTC, currency),
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: BRAND_RGB as unknown as number[],
      fontSize: 8,
      halign: "left",
    },
    bodyStyles: { fontSize: 8.4, cellPadding: 2.6, textColor: text as unknown as number[] },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right", fontStyle: "bold" },
    },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // ── Totaux : le montant TTC est le plus visible ──
  const totalsWidth = 78;
  const totalsX = pageWidth - margin - totalsWidth;
  const rowHeight = 6;
  const lines: [string, string, boolean][] = [
    ["Prix HT", formatMoney(invoice.amountHT, currency), false],
    [
      invoice.taxRate > 0 ? `TVA (${invoice.taxRate} %)` : "TVA",
      invoice.taxRate > 0 ? formatMoney(invoice.taxAmount, currency) : "Non applicable",
      false,
    ],
  ];

  lines.forEach(([label, value], index) => {
    const rowY = y + index * rowHeight;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(...PDF_COLORS.textSecondary);
    doc.text(label, totalsX, rowY + 4);
    doc.setTextColor(text[0], text[1], text[2]);
    doc.text(value, pageWidth - margin, rowY + 4, { align: "right" });
  });
  y += lines.length * rowHeight;

  doc.setFillColor(...PDF_COLORS.bgLight);
  doc.setDrawColor(...PDF_COLORS.border);
  doc.roundedRect(totalsX - 3, y, totalsWidth + 3, 11, 1.4, 1.4, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.6);
  doc.setTextColor(...statusRgb);
  doc.text("TOTAL TTC", totalsX, y + 6.8);
  doc.setFontSize(12);
  doc.text(formatMoney(invoice.amountTTC, currency), pageWidth - margin, y + 7, {
    align: "right",
  });
  y += 17;

  // ── Règlement ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.4);
  doc.setTextColor(text[0], text[1], text[2]);
  doc.text("Règlement et conditions", margin, y);
  y += 2.5;

  (doc as unknown as {
    autoTable: (options: Record<string, unknown>) => void;
    lastAutoTable: { finalY: number };
  }).autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    body: [
      ["Mode de paiement", paymentMethodLabel(invoice.paymentMethod)],
      ["Référence de transaction", sanitize(invoice.transactionId || "—")],
      [
        "Date du paiement",
        invoice.paymentDate ? formatInvoiceDateLong(invoice.paymentDate) : "—",
      ],
      ["Statut", sanitize(statusLabel(invoice.status))],
      ["Devise", currency],
      ["Conditions de paiement", sanitize(issuer.terms || DEFAULT_PAYMENT_TERMS)],
    ],
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 2.1, textColor: text as unknown as number[] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45, textColor: PDF_COLORS.textSecondary as unknown as number[] },
    },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  // ── Mention légale ──
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.8);
  doc.setTextColor(...PDF_COLORS.textLight);
  doc.text(
    doc.splitTextToSize(
      `Document généré électroniquement — valable sans signature. ${issuerName} — ${BRAND_TAGLINE}.`,
      contentWidth,
    ) as string[],
    margin,
    y,
  );

  // ── Pied de page commun (identité batibuild + pagination) ──
  drawReportFooters(doc, {
    left: `Facture ${invoice.invoiceNumber}`,
    right: issuerFooterLine(issuer),
    margin,
  });

  return doc;
}

function statusLabel(status: InvoiceStatus): string {
  return status === "paid"
    ? "Payée"
    : status === "pending"
      ? "En attente"
      : status === "refunded"
        ? "Remboursée"
        : "Annulée";
}

/** Options de téléchargement. */
export interface DownloadInvoiceOptions {
  /**
   * Appelé avec le fichier généré AVANT son enregistrement : permet à
   * l'appelant d'archiver la copie côté serveur (`invoices.pdfStorageId`)
   * sans jamais bloquer ni faire échouer le téléchargement.
   */
  onGenerated?: (blob: Blob) => void | Promise<void>;
}

/** Nom de fichier officiel : `FACT-2026-000001.pdf`. */
function invoiceFileName(invoiceNumber: string): string {
  return `${sanitize(invoiceNumber) || "facture"}.pdf`;
}

/**
 * Génère puis télécharge la facture au format PDF.
 * Le PDF est produit localement (aucun service tiers) : il fonctionne donc
 * aussi bien sur ordinateur que sur mobile / WebView Android.
 */
export function downloadInvoicePdf(
  invoice: InvoicePdfData,
  options: DownloadInvoiceOptions = {},
): void {
  const doc = generateInvoicePdf(invoice);

  if (options.onGenerated) {
    try {
      const blob = doc.output("blob");
      // L'archivage est accessoire : une erreur ne doit jamais empêcher
      // l'utilisateur de récupérer sa facture.
      void Promise.resolve(options.onGenerated(blob)).catch(() => undefined);
    } catch {
      /* le téléchargement continue */
    }
  }

  doc.save(invoiceFileName(invoice.invoiceNumber));
}
