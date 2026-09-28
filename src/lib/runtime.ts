// ============================================================================
// RUNTIME DE LA PLATEFORME — NAVIGATEUR WEB ou APPLICATION ANDROID.
//
// La même plateforme Web est servie dans deux contextes :
//
//   "WEB_BROWSER"  → navigateur classique (Chrome, Firefox, Safari, PWA) :
//                    cookies + cache Web + Service Worker ACTIFS.
//   "ANDROID_APP"  → application Android native (WebView `react-native-webview`) :
//                    système de cookies Web DÉSACTIVÉ, aucun Service Worker,
//                    aucune demande de consentement ; la session et le stockage
//                    restent ceux de la coque native (AsyncStorage).
//
// La détection est VOLONTAIREMENT multi-signaux, jamais basée sur la taille de
// l'écran ni sur le seul User-Agent :
//
//   1. `window.ReactNativeWebView` — pont injecté par `react-native-webview`
//      dans TOUTE WebView de l'application (déjà utilisé par
//      `src/lib/nativeBridge.ts`) : signal fiable, présent dès aujourd'hui sur
//      les applications déjà installées ;
//   2. `window.__BATIBUILD_ANDROID_APP__` — marqueur explicite posé par la coque
//      native avant le premier rendu (`mobile/src/injected.ts`, voir
//      `ANDROID_APP_MARKER_SCRIPT`) ;
//   3. le jeton `BatibuildApp` ajouté au User-Agent par la coque
//      (`applicationNameForUserAgent` dans `mobile/src/screens/WebViewScreen.tsx`).
//
// Un navigateur classique ne peut présenter AUCUN de ces trois signaux : la
// séparation Web / Android est donc explicite et non ambiguë.
// ============================================================================

/** Runtime courant de la plateforme. */
export type PlatformRuntime = "WEB_BROWSER" | "ANDROID_APP";

/**
 * Marqueur global posé par l'application Android avant le premier rendu.
 * Valeur IDENTIQUE à `ANDROID_APP_MARKER_SCRIPT` dans `mobile/src/injected.ts`.
 */
export const ANDROID_APP_MARKER = "__BATIBUILD_ANDROID_APP__";

/**
 * Jeton ajouté au User-Agent par la coque Android
 * (`applicationNameForUserAgent`). Valeur partagée avec la coque native.
 */
export const ANDROID_APP_UA_TOKEN = "BatibuildApp";

/** Objet `window` (ou tout objet équivalent — simplifie les tests). */
type RuntimeWindow = {
  ReactNativeWebView?: unknown;
  navigator?: { userAgent?: unknown } | undefined;
};

/** Pont `react-native-webview` présent ? (WebView Android uniquement) */
export function hasNativeBridge(win: unknown): boolean {
  if (!win || typeof win !== "object") return false;
  const bridge = (win as RuntimeWindow).ReactNativeWebView;
  if (!bridge) return false;
  return typeof bridge === "object" || typeof bridge === "function";
}

/** Marqueur explicite posé par la coque Android ? */
export function hasAndroidAppMarker(win: unknown): boolean {
  if (!win || typeof win !== "object") return false;
  const value = (win as Record<string, unknown>)[ANDROID_APP_MARKER];
  return value === true || value === "1" || value === "true";
}

/** User-Agent de l'application Android ? */
export function hasAndroidAppUserAgent(userAgent: unknown): boolean {
  return typeof userAgent === "string" && userAgent.includes(ANDROID_APP_UA_TOKEN);
}

/**
 * Runtime d'un contexte donné. `WEB_BROWSER` par défaut : un contexte inconnu
 * (environnement de test, rendu serveur, aperçu) ne doit jamais être traité
 * comme l'application Android.
 */
export function detectRuntime(win?: unknown): PlatformRuntime {
  const target =
    win === undefined ? (typeof window === "undefined" ? undefined : window) : win;
  if (hasNativeBridge(target) || hasAndroidAppMarker(target)) return "ANDROID_APP";
  const userAgent = (target as RuntimeWindow | undefined)?.navigator?.userAgent;
  return hasAndroidAppUserAgent(userAgent) ? "ANDROID_APP" : "WEB_BROWSER";
}

/** Runtime détecté pour la page en cours (figé au chargement du module). */
export const RUNTIME: PlatformRuntime = detectRuntime();

/** Vrai dans l'application Android native (WebView). */
export const IS_ANDROID_APP: boolean = RUNTIME === "ANDROID_APP";

/** Vrai dans un navigateur Web classique. */
export const IS_WEB_BROWSER: boolean = !IS_ANDROID_APP;

/** Contexte disposant d'une origine (`location`) — simplifie les tests. */
export type OriginLike = { protocol?: unknown; hostname?: unknown };

/** `location` du contexte courant, ou `undefined` (tests, Web Worker…). */
export function currentOrigin(): OriginLike | undefined {
  if (typeof location === "undefined") return undefined;
  return location as OriginLike;
}

/**
 * Origine éligible au stockage Web sécurisé : HTTPS, ou boucle locale
 * (`localhost`) en développement. Les cookies `Secure` et les Service Workers
 * exigent ce contexte — ailleurs, le système Web est simplement désactivé
 * plutôt que dégradé (jamais de cookie non `Secure`).
 */
export function isSecureWebOrigin(origin: OriginLike | undefined): boolean {
  const protocol = typeof origin?.protocol === "string" ? origin.protocol.toLowerCase() : "";
  if (protocol === "https:") return true;
  if (protocol !== "http:") return false;
  const hostname = typeof origin?.hostname === "string" ? origin.hostname.toLowerCase() : "";
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  );
}

/**
 * Le système de COOKIES Web doit-il être actif dans ce contexte ?
 * Web navigateur + origine sécurisée : l'application Android est exclue.
 */
export function shouldUseWebCookies(
  win?: unknown,
  origin: OriginLike | undefined = currentOrigin(),
): boolean {
  if (detectRuntime(win) === "ANDROID_APP") return false;
  return isSecureWebOrigin(origin);
}

/**
 * Le CACHE Web avancé (Service Worker) est-il disponible dans ce contexte ?
 * Web navigateur + origine sécurisée + API Service Worker présente.
 */
export function canUseWebCache(
  win?: unknown,
  origin: OriginLike | undefined = currentOrigin(),
): boolean {
  if (!shouldUseWebCookies(win, origin)) return false;
  const target =
    win === undefined ? (typeof navigator === "undefined" ? undefined : navigator) : win;
  return !!target && typeof (target as { serviceWorker?: unknown }).serviceWorker === "object";
}
