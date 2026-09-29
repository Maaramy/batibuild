import { useSyncExternalStore } from "react";

import {
  isAppDownloadBannerDismissed,
  subscribeAppDownloadBanner,
} from "@/lib/appDownload";
import { IS_ANDROID_APP } from "@/lib/runtime";

/**
 * Le bandeau de téléchargement Android épinglé en haut de la page est-il
 * visible ? État PARTAGÉ (barre de navigation + contenu de la page) : fermer le
 * bandeau met immédiatement à jour tous les composants abonnés, sans
 * rechargement ni remontage d'arbre.
 *
 * Jamais visible dans l'application Android (elle est déjà installée), ni après
 * fermeture par l'utilisateur (mémorisée pour la session).
 */
function getAppDownloadBannerVisible(): boolean {
  return !IS_ANDROID_APP && !isAppDownloadBannerDismissed();
}

export function useAppDownloadBannerVisible(): boolean {
  return useSyncExternalStore(
    subscribeAppDownloadBanner,
    getAppDownloadBannerVisible,
    () => false,
  );
}
