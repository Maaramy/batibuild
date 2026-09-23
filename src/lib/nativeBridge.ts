/**
 * PONT WEB → APPLICATION ANDROID (WebView).
 *
 * La plateforme Web est chargée dans la WebView de l'application Android ; la
 * barre de navigation native (en bas de l'écran) doit afficher la pastille
 * rouge de la Messagerie. Le compteur n'est PAS recalculé côté natif : il est
 * publié ici, à partir de la requête Convex temps réel
 * (`api.messaging.unreadCount`), qui est la seule source de vérité.
 *
 *   Convex (temps réel) → ce pont → `ReactNativeWebView.postMessage`
 *                                     → pastille native (BottomNav)
 *
 * Ainsi, un message reçu sur n'importe quelle page met à jour la pastille sans
 * rechargement, la session et l'état « lu / non lu » restant ceux du serveur.
 *
 * Sur le Web (navigateur classique, aperçu), `window.ReactNativeWebView` est
 * absent : la publication est simplement ignorée, sans erreur.
 */

/** Type de message attendu par la coque native (voir `mobile/src/config.ts`). */
export const NATIVE_UNREAD_MESSAGE_TYPE = "batibuild:unread";

/** Pont exposé par `react-native-webview` dans la page. */
type ReactNativeWebViewBridge = { postMessage: (data: string) => void };

function bridge(): ReactNativeWebViewBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ReactNativeWebView?: ReactNativeWebViewBridge })
    .ReactNativeWebView;
}

/**
 * Charge utile publiée vers le natif, ou `null` si la valeur n'est pas un
 * compteur exploitable (chargement en cours, erreur de synchronisation).
 *
 * Un `null` signifie « ne rien publier » : le natif CONSERVE alors le dernier
 * compteur fiable au lieu d'afficher un faux « 0 » ou de clignoter.
 */
export function unreadCountPayload(count: unknown): { type: string; count: number } | null {
  if (typeof count !== "number" || !Number.isFinite(count) || count < 0) return null;
  return { type: NATIVE_UNREAD_MESSAGE_TYPE, count: Math.floor(count) };
}

/**
 * Publie le nombre de messages non lus vers la coque native.
 * Sans coque native (Web), ne fait rien.
 */
export function postUnreadCount(count: unknown): boolean {
  const payload = unreadCountPayload(count);
  if (!payload) return false;

  const target = bridge();
  if (!target) return false;

  try {
    target.postMessage(JSON.stringify(payload));
    return true;
  } catch {
    // Pont indisponible : on garde le dernier compteur natif connu.
    return false;
  }
}
