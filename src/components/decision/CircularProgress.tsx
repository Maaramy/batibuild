// ============================================================================
// AIDE À LA DÉCISION — Indicateur circulaire de pourcentage
// ----------------------------------------------------------------------------
// Anneau SVG pur (aucune dépendance ajoutée), au design de la maquette :
// arc de progression BLEU sur une piste VIOLETTE, poursuite arrondie, valeur
// exacte centrée dans l'anneau.
//
// • La valeur affichée est TOUJOURS fournie par l'appelant, déjà issue des
//   données existantes — aucun arrondi ni calcul supplémentaire ici ;
// • l'anneau est proportionnel à la valeur réelle (bornée 0–100 pour le
//   dessin) ;
// • animation légère au chargement et à chaque mise à jour (transition CSS,
//   désactivée pour `prefers-reduced-motion`) ;
// • deux tailles : `sm` pour les lignes (alignée à droite, sans habillage) et
//   `md` pour les cartes d'indicateurs (libellé sous le cercle) ;
// • accessible : rôle `img` + libellé vocalisé complet pour les lecteurs
//   d'écran ; le libellé visible est repris sous le cercle en taille `md`.
// ============================================================================

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const SIZE = 120;
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface CircularProgressProps {
  /** Valeur existante 0–100 (aucun recalcul effectué par le composant). */
  value: number;
  /** Texte exact affiché au centre (formaté par l'appelant). */
  displayValue: string;
  /** Libellé explicite (obligatoire pour l'accessibilité, affiché en `md`). */
  label: string;
  /** Description courte accessible aux lecteurs d'écran. */
  description?: string;
  /** `sm` : anneau de ligne ; `md` : carte d'indicateur avec libellé. */
  size?: "sm" | "md";
  className?: string;
}

export function CircularProgress({
  value,
  displayValue,
  label,
  description,
  size = "md",
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
  const compact = size === "sm";
  const stroke = compact ? 16 : 10;

  const aria = `${label} : ${displayValue}${description ? `. ${description}` : ""}`;

  const ring = (
    <div
      className={cn(
        "relative shrink-0",
        compact ? "h-[3.25rem] w-[3.25rem]" : "h-24 w-24 sm:h-28 sm:w-28",
        className,
      )}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90" role="img" aria-label={aria}>
        {/* Piste violette */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={stroke}
          className="stroke-violet-200 dark:stroke-violet-300/40"
        />
        {/* Arc de progression bleu, proportionnel à la valeur */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={cn(
            "stroke-blue-600 dark:stroke-blue-400",
            "transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none",
          )}
        />
      </svg>
      {/* Pourcentage exact au centre */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 flex items-center justify-center font-semibold tabular-nums text-foreground",
          compact ? "text-[10px]" : "text-lg sm:text-xl",
        )}
      >
        {displayValue}
      </span>
    </div>
  );

  if (compact) return ring;

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card p-3 text-center">
      {ring}
      <p className="text-[11.5px] font-semibold leading-tight text-foreground">{label}</p>
      {description ? (
        <p className="text-[10px] leading-snug text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export default CircularProgress;
