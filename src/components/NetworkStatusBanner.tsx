import { useTranslation } from "react-i18next";
import { CloudOff, Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";

import { getNetworkMonitor, useNetworkStatus } from "@/lib/networkStatus";
import { cn } from "@/lib/utils";

/**
 * BANNIÈRE D'ÉTAT DU RÉSEAU — « Connexion Internet perdue » / « Connexion rétablie ».
 *
 * Discret, non bloquant et identique sur Desktop, Mobile Web et dans
 * l'application Android (même plateforme Web) :
 *
 *   · une SEULE alerte par coupure — un unique élément, monté au plus une fois ;
 *   · la bannière reste affichée jusqu'à la reprise RÉELLE de la connexion ;
 *   · « Connexion rétablie » apparaît brièvement puis disparaît tout seul
 *     (minuterie gérée par l'observateur, voir `src/lib/networkStatus.ts`) ;
 *   · le conteneur est `pointer-events-none` : même superposée à un en-tête,
 *     elle ne bloque JAMAIS les boutons situés dessous — seul le bouton
 *     « Réessayer » capte les clics ;
 *   · aucune bannière de cookies, aucun impact sur l'écran de démarrage, le
 *     guide de première utilisation ou la navigation.
 *
 * Les styles viennent exclusivement de l'application (Tailwind + jetons de
 * thème) : rien de lourd n'entre dans le bundle d'entrée, la bannière étant
 * montée dans `src/main.tsx`.
 */
export function NetworkStatusBanner() {
  const { t } = useTranslation("common");
  const { phase, pendingOperations, checking } = useNetworkStatus();

  const offline = phase === "offline";

  // Le conteneur reste monté (mais vide) en permanence : la zone `aria-live`
  // existe donc AVANT l'alerte, condition pour qu'elle soit annoncée par les
  // lecteurs d'écran. Elle est `pointer-events-none` et sans fond : invisible,
  // elle ne touche ni la mise en page ni les boutons situés dessous.
  //
  // Une clé par phase : l'animation d'entrée se rejoue à chaque transition
  // (coupure, puis reprise), jamais à un simple changement de compteur — la
  // bannière n'apparaît donc qu'UNE fois par coupure.
  return (
    <div
      aria-live={offline ? "assertive" : "polite"}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-2 sm:pt-3"
    >
      {phase === "online" ? null : (
        <div
          key={phase}
          role="status"
          className={cn(
            "pointer-events-none flex w-full max-w-xl items-start gap-3 rounded-xl border px-3.5 py-2.5",
            "shadow-lg backdrop-blur-sm duration-300 animate-in fade-in-0 slide-in-from-top-2",
            "sm:px-4 sm:py-3",
            offline
              ? "border-red-400/50 bg-red-600/95 text-white dark:border-red-400/40 dark:bg-red-950/95 dark:text-red-50"
              : "border-emerald-400/50 bg-emerald-600/95 text-white dark:border-emerald-400/40 dark:bg-emerald-950/95 dark:text-emerald-50",
          )}
        >
          <span
            className={cn(
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              offline ? "bg-white/15" : "bg-emerald-400/20",
            )}
          >
            {offline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">
              {offline ? t("network.offlineTitle") : t("network.backOnline")}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug opacity-90 sm:text-xs">
              {offline ? t("network.offlineDetail") : t("network.backOnlineDetail")}
            </p>

            {offline && pendingOperations > 0 && (
              <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-400/95 px-2 py-1.5 text-[11px] font-medium leading-snug text-amber-950">
                <CloudOff className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="min-w-0">
                  <span className="block">{t("network.dataPreserved")}</span>
                  <span className="mt-0.5 block font-semibold">
                    {t("network.pending", { count: pendingOperations })}
                  </span>
                </span>
              </div>
            )}
          </div>

          {offline && (
            <button
              type="button"
              onClick={() => void getNetworkMonitor().retryNow()}
              disabled={checking}
              className="pointer-events-auto inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/25 disabled:opacity-70"
            >
              {checking ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">
                {checking ? t("network.reconnecting") : t("network.retry")}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default NetworkStatusBanner;
