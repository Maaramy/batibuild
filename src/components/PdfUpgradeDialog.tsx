import { useNavigate } from "react-router";
import { Check, Lock, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CLIENT_PRO_PLAN_LABEL,
  FREE_PLAN_LABEL,
  PLAN_COMPARISON,
  PRICING_PAGE_PATH,
  PDF_UPGRADE_CANCEL,
  PDF_UPGRADE_CTA,
  PDF_UPGRADE_MESSAGE,
  PDF_UPGRADE_TITLE,
} from "@/lib/freePlan";

// ============================================================================
// PdfUpgradeDialog — « Rapport PDF disponible avec Client Pro »
// ============================================================================
// Affiché lorsqu'un utilisateur du forfait Free tente de télécharger un rapport
// PDF. Le contrôle réel est fait côté serveur (`api.access.canDownloadPdf`) ;
// ce dialogue n'est que la présentation de la mise à niveau.

export function PdfUpgradeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden">
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Lock className="h-5 w-5" />
          </div>
          <DialogTitle className="text-base">{PDF_UPGRADE_TITLE}</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {PDF_UPGRADE_MESSAGE}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-xl border border-border/40">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-border/30 bg-muted/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Fonctionnalité</span>
            <span className="w-12 text-center">{FREE_PLAN_LABEL}</span>
            <span className="w-16 text-center text-indigo-600 dark:text-indigo-400">
              {CLIENT_PRO_PLAN_LABEL}
            </span>
          </div>
          {PLAN_COMPARISON.map((row) => (
            <div
              key={row.feature}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-border/20 px-3 py-2 text-xs last:border-b-0"
            >
              <span className="min-w-0 truncate">{row.feature}</span>
              <span className="flex w-12 justify-center">
                {row.free ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                )}
              </span>
              <span className="flex w-16 justify-center">
                {row.pro ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-[11px] text-indigo-700 dark:text-indigo-300">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>
            <Badge variant="outline" className="mr-1 border-indigo-500/30 text-[9px]">
              {CLIENT_PRO_PLAN_LABEL}
            </Badge>
            Toutes les fonctionnalités Free, plus le téléchargement des rapports PDF et l'accès aux
            rapports professionnels.
          </span>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {PDF_UPGRADE_CANCEL}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={() => {
              onOpenChange(false);
              navigate(PRICING_PAGE_PATH);
            }}
          >
            <Lock className="h-3.5 w-3.5" />
            {PDF_UPGRADE_CTA}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PdfUpgradeDialog;
