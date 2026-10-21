import { Minus, Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================================
// ZOOM PARTAGÉ DES PLANS ARCHITECTURAUX (2D et 3D)
// ----------------------------------------------------------------------------
// Mêmes boutons « + » / « − » sur les deux vues, superposés au plan sans
// masquer son contenu : ils restent accessibles au clavier, sur ordinateur
// comme sur mobile (cibles tactiles de 32 px). Le pourcentage n'est affiché
// que lorsque le plan possède un facteur de zoom explicite (vue 2D) ; la vue
// 3D zoome la caméra et n'affiche donc que les deux boutons.
// ============================================================================

export interface PlanZoomButtonsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** Recadrage / retour au zoom initial (facultatif). */
  onReset?: () => void;
  resetLabel?: string;
  /** Facteur de zoom courant (1 = plan entier). */
  zoom?: number;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
  className?: string;
}

export function PlanZoomButtons({
  onZoomIn,
  onZoomOut,
  onReset,
  resetLabel = "Réinitialiser le zoom",
  zoom,
  canZoomIn = true,
  canZoomOut = true,
  className,
}: PlanZoomButtonsProps) {
  return (
    <div
      data-slot="plan-zoom-controls"
      className={cn(
        "flex items-center gap-0.5 rounded-lg border border-border/70 bg-background/95 p-0.5 shadow-sm backdrop-blur",
        className,
      )}
    >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-md"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        aria-label="Zoom arrière (−)"
        title="Réduire le plan (−)"
      >
        <Minus className="h-4 w-4" />
      </Button>
      {typeof zoom === "number" && (
        <span
          aria-live="polite"
          className="min-w-[38px] text-center text-[10px] font-semibold tabular-nums text-muted-foreground"
        >
          {Math.round(zoom * 100)} %
        </span>
      )}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-md"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        aria-label="Zoom avant (+)"
        title="Agrandir le plan (+)"
      >
        <Plus className="h-4 w-4" />
      </Button>
      {onReset && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-md"
          onClick={onReset}
          aria-label={resetLabel}
          title={resetLabel}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
