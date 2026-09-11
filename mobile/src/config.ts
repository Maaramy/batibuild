/**
 * Configuration centralisée de l'application mobile BatiBuild.
 *
 * SOURCE UNIQUE DE VÉRITÉ pour l'URL de la plateforme web chargée dans la
 * WebView. Ne jamais dupliquer cette URL ailleurs (app.json, composants, …).
 *
 * Pour changer d'environnement (dev / preview / prod), définir la variable
 * d'environnement EXPO_PUBLIC_WEB_APP_URL — aucune autre modification de code
 * n'est nécessaire.
 */

const DEFAULT_WEB_APP_URL = "https://budgetbati.freebuff.app/";

/** URL de la plateforme web chargée dans la WebView. */
export const WEB_APP_URL: string =
  process.env.EXPO_PUBLIC_WEB_APP_URL?.trim() || DEFAULT_WEB_APP_URL;

/** Origine de la plateforme (ex. `https://budgetbati.freebuff.app`), sans slash final. */
export const APP_ORIGIN: string = WEB_APP_URL.replace(/\/+$/, "");

/** Routes du parcours mobile (plateforme web). */
export const LOGIN_PATH = "/auth";
export const DASHBOARD_PATH = "/dashboard";

/**
 * Point d'entrée de la WebView.
 *
 * On démarre volontairement sur `/dashboard` et JAMAIS sur la page d'accueil
 * publique, car la plateforme web résout déjà les deux cas :
 *   - session valide  → le tableau de bord s'affiche directement ;
 *   - session absente → `RequireAuth` redirige vers `/auth?returnTo=/dashboard`.
 *
 * La page d'accueil marketing n'est donc jamais une étape du parcours mobile.
 */
export const ENTRY_URL: string = `${APP_ORIGIN}${DASHBOARD_PATH}`;

export function getHost(url: string): string {
  const m = url.match(/^https?:\/\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : "";
}

export const APP_HOST = getHost(WEB_APP_URL);

/**
 * Hôtes techniques de la plateforme qui doivent rester DANS la WebView.
 * Les endpoints d'authentification (Convex) sont sur `*.convex.site` /
 * `*.convex.cloud` : les ouvrir dans le navigateur casserait le login.
 */
const INTERNAL_HOST_SUFFIXES = [
  ".freebuff.app",
  ".convex.cloud",
  ".convex.site",
  ".convex.dev",
  ".convexusercontent.com",
];

/**
 * Une URL fait-elle partie de l'application BatiBuild (reste dans la WebView) ?
 * Même hôte, n'importe quel déploiement `*.freebuff.app` (aliases dev/preview/
 * prod) ou un domaine technique Convex.
 */
export function isAppUrl(url: string): boolean {
  const host = getHost(url);
  if (!host) return false;
  if (host === APP_HOST) return true;
  return INTERNAL_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

/**
 * Chemin (+ query) d'une URL, sans l'origine ni le fragment.
 * Renvoie `""` pour les URLs non-web (`about:blank`, `data:`, …).
 */
export function pathOfUrl(url: string): string {
  const withoutOrigin = url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]+/i, "");
  if (!withoutOrigin.startsWith("/")) return "";
  return withoutOrigin.split("#")[0];
}

/** Chemin sans query — pratique pour comparer des routes. */
export function routeOfPath(path: string): string {
  return path.split("?")[0].replace(/\/+$/, "") || "/";
}

/** La route est-elle une page d'authentification ? */
export function isAuthRoute(path: string): boolean {
  const route = routeOfPath(path);
  return route === LOGIN_PATH || route === "/auth/password" || route.startsWith("/auth/");
}

/** La route est-elle la page d'accueil publique ? */
export function isLandingRoute(path: string): boolean {
  const route = routeOfPath(path);
  return route === "/" || route === "/index.html";
}
