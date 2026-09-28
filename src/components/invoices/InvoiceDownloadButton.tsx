import { useState } from "react";
import { useMutation } from "convex/react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { downloadInvoicePdf, type InvoicePdfData } from "@/lib/invoicePdf";
import { cn } from "@/lib/utils";

/**
 * Facture telle que renvoyée par Convex (les champs métier + l'identifiant).
 */
export type InvoiceRecord = InvoicePdfData & {
  _id: string;
  pdfStorageId?: string | null;
};

/**
 * TÉLÉCHARGEMENT D'UNE FACTURE EN PDF — utilisé par l'espace abonné
 * (« Mes factures ») et par le dashboard administrateur (« Factures »).
 *
 * Le document est produit dans le navigateur à partir des données enregistrées
 * de la facture (`src/lib/invoicePdf.ts`) : même PDF des deux côtés, aucune
 * dépendance à un service externe, et un fonctionnement identique sur
 * ordinateur, mobile et application Android.
 *
 * Une copie est archivée côté serveur au premier téléchargement (confort :
 * `pdfStorageId`). L'archivage est accessoire : s'il échoue, la facture est
 * quand même téléchargée.
 */
export function InvoiceDownloadButton({
  invoice,
  variant = "outline",
  size = "sm",
  className,
  showLabel = true,
}: {
  invoice: InvoiceRecord;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon";
  className?: string;
  showLabel?: boolean;
}) {
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const archiveInvoicePdf = useMutation(api.invoices.archiveInvoicePdf);
  const [busy, setBusy] = useState(false);

  const handleDownload = () => {
    setBusy(true);
    try {
      downloadInvoicePdf(invoice, {
        onGenerated: async (blob) => {
          // Facture déjà archivée, ou archivage impossible : on n'insiste pas.
          if (invoice.pdfStorageId) return;
          const uploadUrl = await generateUploadUrl();
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": "application/pdf" },
            body: blob,
          });
          if (!response.ok) return;
          const { storageId } = (await response.json()) as { storageId: string };
          await archiveInvoicePdf({
            invoiceId: invoice._id as never,
            storageId: storageId as never,
          });
        },
      });
      toast.success(`Facture ${invoice.invoiceNumber} téléchargée`);
    } catch {
      toast.error("Impossible de générer la facture. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={busy}
      aria-label={`Télécharger la facture ${invoice.invoiceNumber} en PDF`}
      className={cn("gap-1.5", className)}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {showLabel && <span>PDF</span>}
    </Button>
  );
}

export default InvoiceDownloadButton;
