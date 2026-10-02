import { useCallback, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { PdfUpgradeDialog } from "@/components/PdfUpgradeDialog";

// ============================================================================
// usePdfGate — contrôle client centralisé du téléchargement PDF
// ============================================================================
// Le droit réel vient du backend (`api.access.canDownloadPdf`, forfait payant
// Client Pro). Ce hook ne fait que l'exposer : `requestPdfDownload(run)` lance
// la génération si autorisé, sinon ouvre le dialogue « Rapport PDF disponible
// avec Client Pro ». Le serveur reste l'autorité (les générateurs PDF passent
// par la mutation `api.subscriptions.consumeDownload`, qui rejette le Free).
//
// Usage :
//   const { requestPdfDownload, dialog } = usePdfGate();
//   ...
//   <Button onClick={() => requestPdfDownload(() => downloadX())}>PDF</Button>
//   {dialog}

export interface PdfGate {
  /** Vrai si l'utilisateur a le droit de télécharger des rapports PDF. */
  allowed: boolean;
  /** Vrai tant que le droit n'est pas encore connu (chargement). */
  loading: boolean;
  /**
   * Lance `run` si le téléchargement est autorisé, sinon ouvre le dialogue de
   * mise à niveau. Renvoie true si la génération a été déclenchée.
   */
  requestPdfDownload: (run: () => void | Promise<void>) => boolean;
  /** Élément à monter une seule fois dans le rendu de la page. */
  dialog: ReactNode;
}

export function usePdfGate(): PdfGate {
  const access = useQuery(api.access.canDownloadPdf);
  const [open, setOpen] = useState(false);

  const allowed = access?.allowed === true;

  const requestPdfDownload = useCallback(
    (run: () => void | Promise<void>) => {
      if (access?.allowed) {
        void run();
        return true;
      }
      setOpen(true);
      return false;
    },
    [access?.allowed],
  );

  return {
    allowed,
    loading: access === undefined,
    requestPdfDownload,
    dialog: <PdfUpgradeDialog open={open} onOpenChange={setOpen} />,
  };
}

export default usePdfGate;
