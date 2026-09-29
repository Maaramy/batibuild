import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CONNECTION_ERROR_MESSAGE,
  retryConnection,
  useConnectionErrorActive,
} from "@/lib/chunkLoadError";
import { useNetworkStatus } from "@/lib/networkStatus";

/**
 * ÉCRAN DE CONNEXION — « Erreur de connexion, vérifier votre connexion internet ».
 *
 * Affiché à la place de l'erreur TECHNIQUE quand un module JavaScript de
 * l'application ne peut pas être chargé (voir `src/lib/chunkLoadError.ts`) :
 * perte de connexion Internet, ou ancien fragment devenu introuvable après un
 * nouveau déploiement. Les détails (URL du `.js`, pile d'appels) restent
 * exclusivement dans `console.error` pour le développeur.
 *
 *   · aucune trace technique, aucune URL de fichier à l'écran ;
 *   · plein écran, responsive (Desktop, Mobile Web, WebView Android) ;
 *   · l'état du réseau est lu en direct : hors ligne, le texte le dit
 *     immédiatement ;
 *   · « Réessayer » vérifie que le réseau répond, puis recharge proprement
 *     l'application — c'est ce qui récupère les nouveaux fichiers après un
 *     déploiement.
 *
 * Le composant est monté une seule fois dans `src/main.tsx` (et utilisé par le
 * garde-fou racine) : il ne rend rien tant qu'aucun échec de module n'est
 * survenu, donc il ne modifie ni le routage ni les pages existantes.
 */
export function ConnectionErrorScreen({ force = false }: { force?: boolean } = {}) {
  const { t } = useTranslation("common");
  const active = useConnectionErrorActive();
  const { online } = useNetworkStatus();
  const [checking, setChecking] = useState(false);
  const [stillOffline, setStillOffline] = useState(false);

  if (!(active || force)) return null;

  const message = t("network.connectionErrorTitle", {
    defaultValue: CONNECTION_ERROR_MESSAGE,
  });

  async function handleRetry(): Promise<void> {
    setChecking(true);
    setStillOffline(false);
    const outcome = await retryConnection();
    // En cas de succès la page est rechargée ; sinon l'écran reste affiché avec
    // une explication simple (jamais le détail technique).
    if (outcome !== "reloaded") {
      setChecking(false);
      setStillOffline(true);
    }
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-[70] flex min-h-screen w-full items-center justify-center bg-background px-4 py-6 text-foreground sm:px-6"
    >
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 text-center shadow-xl sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
          <WifiOff className="h-7 w-7" />
        </span>

        <h1 className="mt-4 text-lg font-semibold leading-snug sm:text-xl">{message}</h1>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {online
            ? t("network.connectionErrorDetail")
            : t("network.connectionErrorOfflineDetail")}
        </p>

        {stillOffline && (
          <p className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-medium leading-snug text-amber-700 dark:text-amber-300">
            {t("network.connectionErrorStillOffline")}
          </p>
        )}

        <Button
          className="mt-5 w-full gap-2"
          onClick={() => void handleRetry()}
          disabled={checking}
        >
          {checking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {checking ? t("network.reconnecting") : t("network.retry")}
        </Button>

        <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
          {t("network.connectionErrorHint")}
        </p>
      </div>
    </div>
  );
}

export default ConnectionErrorScreen;
