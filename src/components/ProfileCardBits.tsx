import type { ComponentType, ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Éléments partagés des cartes « Fournisseur » / « Expert » (maquette profil) :
 * - carte blanche arrondie avec ombre douce
 * - pastille « vérifié » circulaire sur l'avatar
 * - ligne descriptive sous le nom (spécialité / statut)
 * - métriques empilées séparées par de fines lignes
 * - lignes de détail icône + texte
 */

export const profileCardClass =
  "overflow-hidden rounded-2xl border border-border/40 bg-card shadow-soft transition-all hover:shadow-soft-lg";

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-card",
        className,
      )}
    >
      <ShieldCheck className="h-3 w-3" />
    </span>
  );
}

export function TrophyLine({ children }: { children: ReactNode }) {
  return (
    <p className="text-center text-[10px] font-medium text-muted-foreground">
      <span className="line-clamp-1">{children}</span>
    </p>
  );
}

export function MetricRow({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-1.5 py-2 text-center">
      <p className="text-base font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[8px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

export function DetailRow({ icon: Icon, label }: { icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex min-w-0 items-start gap-1.5 text-[10px] text-muted-foreground">
      <Icon className="mt-px h-3 w-3 shrink-0" />
      <span className="min-w-0 truncate" title={label}>
        {label}
      </span>
    </div>
  );
}