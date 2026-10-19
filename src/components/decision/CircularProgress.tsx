// ============================================================================
// INDICATEUR CIRCULAIRE DE PROGRESSION — Aide à la décision
// ----------------------------------------------------------------------------
// Anneau SVG pur (aucune dépendance) : la valeur affichée est exactement celle
// qui lui est transmise (0 → 100), arrondie seulement au moment de l'affichage
// par l'appelant. L'anneau est proportionnel à la valeur réelle, animé via une
// transition CSS légère, et accessible aux lecteurs d'écran (role="img" +
// libellé explicite). Il s'adapte à son conteneur sans jamais se déformer.
// ============================================================================

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type CircularTone = "primary" | "success" | "warning" | "danger" | "muted";

const TONE_CLASS: Record<CircularTone, string> = {
  primary: "text-primary",
  success: "text-emerald-500",
  warning: "text-amber-500",
  danger: "text-red-500",
  muted: "text-muted-foreground",
};

export interface CircularProgressProps {
  /** Valeur réelle en pourcentage (0 → 100). */
  value: number;
  /** Libellé accessible complet, ex. « Capacité de construction : 83,9 % ». */
  label: string;
  /** Couleur de l'anneau, cohérente avec le niveau représenté. */
  tone?: CircularTone;
  /** Taille / espacement gérés par le parent (classes de largeur et hauteur). */
  className?: string;
  /** Contenu centré (pourcentage en grands chiffres). */
  children?: ReactNode;
  /** Épaisseur de l'anneau, en unités du viewBox 120 × 120. */
  strokeWidth?: number;
}

export function CircularProgress({
  value,
  label,
  tone = "primary",
  className,
  children,
  strokeWidth = 9,
}: CircularProgressProps) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        className,
      )}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            "stroke-current transition-[stroke-dashoffset] duration-700 ease-out",
            TONE_CLASS[tone],
          )}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default CircularProgress;
