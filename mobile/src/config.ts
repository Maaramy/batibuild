/**
 * Configuration centralisée de l'application mobile BatiBuild.
 *
 * SOURCE UNIQUE DE VÉRITÉ pour l'URL de la plateforme web chargée dans la
 * WebView. Ne jamais dupliquer cette URL ailleurs (app.json, composants, …).
 *
 * Pour changer d'environnement (dev / preview / prod), définir la variable
 * d'environnement EXPO_PUBLIC_WEB_APP_URL (voir .env.example) — aucune autre
 * modification de code n'est nécessaire.
 */

const DEFAULT_WEB_APP_URL = "https://budgetbati.freebuff.app/";

/** URL de la plateforme web chargée dans la WebView. */
export const WEB_APP_URL: string =
  process.env.EXPO_PUBLIC_WEB_APP_URL?.trim() || DEFAULT_WEB_APP_URL;

export function getHost(url: string): string {
  const m = url.match(/^https?:\/\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : "";
}

export const APP_HOST = getHost(WEB_APP_URL);

/**
 * Une URL fait-elle partie de l'application BatiBuild (reste dans la WebView) ?
 * Même hôte ou n'importe quel hôte de déploiement *.freebuff.app
 * (aliases dev/preview/prod).
 */
export function isAppUrl(url: string): boolean {
  const host = getHost(url);
  if (!host) return false;
  return host === APP_HOST || host.endsWith(".freebuff.app");
}