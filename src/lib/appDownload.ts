// ============================================================================
// TÉLÉCHARGEMENT DE L'APPLICATION ANDROID batibuild.
//
// Ce module est la SEULE source du lien de téléchargement : l'interface ne
// l'écrit jamais en dur et ne l'affiche jamais.
//
// Le lien fourni par l'éditeur est la page de partage Google Drive
// (`/file/d/<id>/view?usp=drivesdk`). Elle ouvre une page intermédiaire inutile
// avant le téléchargement : le lien réellement utilisé est donc la forme
// « téléchargement direct » du même fichier
// (`/uc?export=download&id=<id>`), qui déclenche le téléchargement dès le clic
// — jamais automatiquement, toujours après une action de l'utilisateur.
//
// FERMETURE MÉMORISÉE POUR LA SESSION : une fois le bandeau épinglé fermé par
// l'utilisateur, il ne réapparaît pas tant que l'onglet reste ouvert. Le drapeau
// vit dans `sessionStorage` — jamais dans un cookie, jamais dans le stockage
// durable : une nouvelle session réaffiche le bandeau.
//
// La visibilité est un état PARTAGÉ (barre de navigation + contenu de la page) :
// chaque composant intéressé s'y abonne avec `subscribeAppDownloadBanner`
// (voir `useAppDownloadBannerVisible`), afin que la fermeture se répercute
// partout au même instant, sans rechargement.
// ============================================================================

/** Identifiant du fichier officiel de l'application Android (Google Drive). */
export const ANDROID_APP_FILE_ID = "1RlqfsjwysJiywPkz-WCPIXM5d7U8Ko6Y";

/**
 * Lien de partage officiel fourni par l'éditeur (page Google Drive).
 * Conservé comme référence : ce n'est PAS la cible des clics du bandeau.
 */
export const ANDROID_APP_SHARE_URL = `https://drive.google.com/file/d/${ANDROID_APP_FILE_ID}/view?usp=drivesdk`;

/**
 * Lien de TÉLÉCHARGEMENT DIRECT du même fichier : la cible des clics du bandeau
 * (icône batibuild, icône Google Play et zone principale).
 */
export const ANDROID_APP_DOWNLOAD_URL = `https://drive.google.com/uc?export=download&id=${ANDROID_APP_FILE_ID}`;

/** Drapeau de session : bandeau de téléchargement fermé par l'utilisateur. */
export const APP_DOWNLOAD_BANNER_KEY = "bb_app_download_banner_closed";

/** Stockage minimal (une session de navigateur suffit). */
export interface BannerFlagStore {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

/**
 * Stockage de session, ou `null` (navigation privée, WebView sans stockage).
 * Un stockage indisponible ne bloque JAMAIS le bandeau : il s'affiche, et la
 * fermeture est alors seulement mémorisée en mémoire pour la page en cours.
 */
export function resolveBannerFlagStore(
  store?: BannerFlagStore | null,
): BannerFlagStore | null {
  if (store !== undefined) return store;
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Repli mémoire, utilisé uniquement quand aucun stockage n'est disponible :
 * le ✕ doit masquer le bandeau immédiatement dans tous les cas.
 */
let dismissedInMemory = false;

/** L'utilisateur a-t-il déjà fermé le bandeau pendant cette session ? */
export function isAppDownloadBannerDismissed(
  store?: BannerFlagStore | null,
): boolean {
  if (dismissedInMemory) return true;
  const target = resolveBannerFlagStore(store);
  if (!target) return false;
  try {
    return target.getItem(APP_DOWNLOAD_BANNER_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Mémorise la fermeture. Renvoie `true` si le drapeau a réellement été écrit.
 * Sans stockage, renvoie `false` sans jamais échouer : l'interface masque le
 * bandeau dans tous les cas (repli mémoire ci-dessus).
 */
export function dismissAppDownloadBanner(
  store?: BannerFlagStore | null,
): boolean {
  const target = resolveBannerFlagStore(store);
  // Un stockage explicite (tests) n'affecte jamais le repli mémoire.
  if (target === null) {
    if (store === undefined) dismissedInMemory = true;
    notifyAppDownloadBanner();
    return false;
  }
  try {
    target.setItem(APP_DOWNLOAD_BANNER_KEY, "1");
    if (store === undefined) dismissedInMemory = true;
    notifyAppDownloadBanner();
    return true;
  } catch {
    if (store === undefined) dismissedInMemory = true;
    notifyAppDownloadBanner();
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Visibilité partagée (bandeau de la page d'accueil)
 * ------------------------------------------------------------------ */

const listeners = new Set<() => void>();

/** Abonnement à l'état « bandeau fermé ? » — pour `useSyncExternalStore`. */
export function subscribeAppDownloadBanner(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyAppDownloadBanner(): void {
  for (const listener of listeners) listener();
}
