import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import type { JourneyStepStatus } from "@/convex/journey";

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Bandeau d'état d'une étape du Project Journey, partagé par tous les modules.
 *
 *   ✓ Analyse déjà réalisée        → le résultat sauvegardé est affiché ;
 *   ↻ Actualiser l'analyse          → bouton secondaire, jamais automatique ;
 *   ⚠️ Les données du projet ont changé → ancien résultat conservé + actualisation ;
 *   ◐ Analyse en cours…
 *
 * Aucune analyse n'est déclenchée ici : `onRefresh` n'est appelé que sur un
 * clic explicite de l'utilisateur.
 */
export function JourneyStepBanner({
  status,
  analyzedAt,
  onRefresh,
  refreshing = false,
  className,
}: {
  status: JourneyStepStatus;
  analyzedAt?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  className?: string;
}) {
  if (status === "none") return null;

  const stale = status === "stale";
  const running = status === "running";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl border px-3 py-2 text-xs",
        stale
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          : running
            ? "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400"
            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        className,
      )}
      role="status"
    >
      {stale ? (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      ) : running ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="font-semibold">
        {stale
          ? "⚠️ Les données du projet ont changé"
          : running
            ? "Analyse en cours…"
            : "✓ Analyse déjà réalisée"}
      </span>
      {!stale && !running && analyzedAt ? (
        <span className="text-[10px] font-normal opacity-80">
          le {fmtDate(analyzedAt)}
        </span>
      ) : null}
      {stale && analyzedAt ? (
        <span className="text-[10px] font-normal opacity-80">
          ancien résultat conservé (le {fmtDate(analyzedAt)})
        </span>
      ) : null}
      {onRefresh ? (
        <button
          type="button"
          disabled={refreshing || running}
          onClick={onRefresh}
          className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border border-current px-2 py-0.5 text-[11px] font-medium transition-colors hover:bg-foreground/5 disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Actualiser l'analyse
        </button>
      ) : null}
    </div>
  );
}
