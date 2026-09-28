import {
  generateInvoicePdf,
  invoicePdfFileName,
  type InvoicePdfData,
} from "../lib/invoicePdf";

// ============================================================================
// PIÈCE JOINTE PDF D'UNE FACTURE — GÉNÉRATION CÔTÉ SERVEUR
// ----------------------------------------------------------------------------
// Appelé par l'action Node d'envoi d'e-mail (`emailSender.ts`) pour joindre la
// facture PDF aux notifications d'ACTIVATION d'abonnement et de CONFIRMATION
// de paiement.
//
// Le document est produit par le MÊME module que le téléchargement côté
// navigateur (`src/lib/invoicePdf.ts`) : la facture reçue par e-mail est donc
// rigoureusement identique à celle téléchargée depuis « Mes factures »
// (en-tête blanc, logo officiel batibuild, tableau HT/TVA/TTC, total, statut,
// pied de page). Les montants, le client et les coordonnées de l'émetteur
// proviennent de la facture ENREGISTRÉE (historique figé), jamais d'un calcul
// refait à l'envoi.
//
// PÉRIMÈTRE : ce module utilise `Buffer` (API Node) — il ne doit être importé
// que depuis un fichier Convex `"use node"`.
// ============================================================================

export interface InvoicePdfAttachment {
  /** Nom du fichier joint : `FACT-2026-000001.pdf`. */
  filename: string;
  /** Contenu binaire du PDF (nodemailer). */
  content: Buffer;
  /** Même contenu en base64 (repli VLY, qui n'accepte que du texte). */
  base64: string;
}

/**
 * Construit la pièce jointe PDF d'une facture.
 * Lève une erreur si le document ne peut pas être produit : l'appelant décide
 * alors d'envoyer l'e-mail sans pièce jointe plutôt que d'échouer.
 */
export function buildInvoicePdfAttachment(invoice: InvoicePdfData): InvoicePdfAttachment {
  const bytes = Buffer.from(generateInvoicePdf(invoice).output("arraybuffer"));
  return {
    filename: invoicePdfFileName(invoice.invoiceNumber),
    content: bytes,
    base64: bytes.toString("base64"),
  };
}
