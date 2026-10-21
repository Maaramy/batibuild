import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================================
// ZOOM PARTAGÉ DES PLANS (ARCHITECTURE 2D / 3D, PLOMBERIE, ÉLECTRICITÉ)
// ----------------------------------------------------------------------------
// Même présentation sur tous les plans : trois boutons ronds (loupe +, loupe −,
// recadrage), alignés à droite de la barre d'outils du plan, identiques à ceux
// du plan technique. Cibles tactiles de 36 px, libellé accessible et infobulle
// sur ordinateur ; aucun pourcentage ni cadre autour des boutons.
// ============================================================================

export interface PlanZoomButtonsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** Recadrage / retour au zoom initial. */
  onReset?: () => void;
  resetLabel?: string;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
  className?: string;
}

export function PlanZoomButtons({
  onZoomIn,
  onZoomOut,
  onReset,
  resetLabel = "Réinitialiser le zoom",
  canZoomIn = true,
  canZoomOut = true,
  className,
}: PlanZoomButtonsProps) {
  return (
    <div
      data-slot="plan-zoom-controls"
      className={cn("flex shrink-0 items-center gap-1.5", className)}
    >
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-9 w-9 rounded-full bg-background shadow-sm"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        aria-label="Zoom avant"
        title="Agrandir le plan"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-9 w-9 rounded-full bg-background shadow-sm"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        aria-label="Zoom arrière"
        title="Réduire le plan"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      {onReset && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 rounded-full bg-background shadow-sm"
          onClick={onReset}
          aria-label={resetLabel}
          title={resetLabel}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
