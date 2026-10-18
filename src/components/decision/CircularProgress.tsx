// ============================================================================
// AIDE À LA DÉCISION — Indicateur circulaire de progression
// ----------------------------------------------------------------------------
// Anneau de progression SVG pur (aucune dépendance ajoutée) utilisé pour les
// pourcentages essentiels de la page « Aide à la décision ».
//
// • La valeur affichée est TOUJOURS fournie par l'appelant, déjà issue des
//   données existantes — aucun arrondi ni calcul supplémentaire ici ;
// • l'anneau est proportionnel à la valeur réelle (bornée 0–100 pour le
//   dessin) ;
// • animation légère au chargement et à chaque mise à jour (transition CSS,
//   désactivée pour `prefers-reduced-motion`) ;
// • accessible : rôle `img` + libellé vocalisé complet pour les lecteurs
//   d'écran ; le libellé visible est repris sous le cercle.
// ============================================================================

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export type ProgressTone = "primary" | "success" | "warning" | "danger";

/** Couleur d'anneau cohérente avec le niveau représenté (contraste accessible). */
const TONE_STROKE: Record<ProgressTone, string> = {
  primary: "stroke-primary",
  success: "stroke-emerald-500",
  warning: "stroke-amber-500",
  danger: "stroke-red-500",
};

const SIZE = 120;
const RADIUS = 52;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface CircularProgressProps {
  /** Valeur existante 0–100 (aucun recalcul effectué par le composant). */
  value: number;
  /** Texte exact affiché au centre (formaté par l'appelant). */
  displayValue: string;
  /** Libellé explicite affiché sous le cercle. */
  label: string;
  /** Description courte accessible aux lecteurs d'écran. */
  description?: string;
  tone?: ProgressTone;
  className?: string;
}

export function CircularProgress({
  value,
  displayValue,
  label,
  description,
  tone = "primary",
  className,
}: CircularProgressProps) {
  // Animation d'entrée : l'anneau se dessine au premier rendu, puis suit les
  // mises à jour de valeur par simple transition CSS.
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setDrawn(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const safe = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const progress = drawn ? safe : 0;
  const offset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card p-3 text-center",
        className,
      )}
    >
      <div className="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-full w-full -rotate-90"
          role="img"
          aria-label={`${label} : ${displayValue}${description ? `. ${description}` : ""}`}
        >
          {/* Piste */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-muted"
          />
          {/* Anneau de progression proportionnel */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className={cn(
              TONE_STROKE[tone],
              "transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none",
            )}
          />
        </svg>
        {/* Valeur au centre — chiffres grands et lisibles */}
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums text-foreground sm:text-xl"
        >
          {displayValue}
        </span>
      </div>
      <p className="text-[11.5px] font-semibold leading-tight text-foreground">{label}</p>
      {description ? (
        <p className="text-[10px] leading-snug text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export default CircularProgress;
