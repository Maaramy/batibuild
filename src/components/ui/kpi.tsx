// ============================================================================
// KPI — indicateurs clés (montants, pourcentages, compteurs).
// ----------------------------------------------------------------------------
// Hiérarchie visuelle forte pour les chiffres, sobriété pour le reste :
// étiquette discrète, valeur dense, éventuel indice. La couleur ne sert qu'à
// SIGNALER une information (succès, attention, erreur, information).
// ============================================================================

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type KPITone = "default" | "success" | "warning" | "danger" | "info";

const TONE_TEXT: Record<KPITone, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
};

export interface KPIProps {
  /** Étiquette courte (« Coût total », « Budget disponible »…). */
  label: string;
  /** Valeur mise en avant (montant, %, compteur). */
  value: ReactNode;
  /** Précision discrète sous la valeur (unité, période, explication). */
  hint?: ReactNode;
  tone?: KPITone;
  /** Icône linéaire facultative (même bibliothèque que la plateforme). */
  icon?: ReactNode;
  className?: string;
}

/** Indicateur compact : une étiquette, une valeur, un indice. */
export function KPI({ label, value, hint, tone = "default", icon, className }: KPIProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-3xl border border-outline-variant/60 bg-surface-container-low px-4 py-3 shadow-elev-1",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "mt-1.5 truncate font-display text-xl font-extrabold leading-tight tabular-nums sm:text-2xl",
          TONE_TEXT[tone],
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export interface KPIGridProps {
  /** Nombre de colonnes sur grand écran (2 par défaut → 4 maximum). */
  columns?: 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}

/** Grille de KPI : 2 colonnes sur mobile, 3-4 sur desktop. */
export function KPIGrid({ columns = 4, className, children }: KPIGridProps) {
  const desktop =
    columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4";
  return (
    <div className={cn("grid grid-cols-2 gap-2", desktop, className)}>{children}</div>
  );
}
