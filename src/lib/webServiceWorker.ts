// ============================================================================
// CACHE AVANCÉ — SERVICE WORKER, WEB UNIQUEMENT.
//
// Enregistre `public/sw.js`, qui met en cache les ressources statiques
// versionnées et accélère les visites suivantes. Le Service Worker n'est
// JAMAIS enregistré :
//
//   · dans l'application Android (`IS_ANDROID_APP`) — le cache/session reste
//     celui de la coque native, aucun cookie ni cache Web n'est utilisé ;
//   · en développement ni dans l'aperçu (HMR) — uniquement sur un build de
//     production ;
//   · hors origine sécurisée (HTTPS), où les Service Workers sont interdits.
//
// Les stratégies de cache (cache-first versionné, réseau d'abord pour les
// pages, aucune interception des appels Convex/API) sont décrites dans
// `public/sw.js` et vérifiées par `src/lib/webServiceWorker.test.ts`.
// ============================================================================
import { canUseWebCache, IS_ANDROID_APP } from "./runtime";

/** Script du Service Worker (servi depuis `public/`). */
export const SERVICE_WORKER_URL = "/sw.js";

/** Préfixe des caches créés par le Service Worker (purge ciblée). */
export const CACHE_PREFIX = "batibuild-";

/** Messages compris par le Service Worker (voir `public/sw.js`). */
export const SERVICE_WORKER_MESSAGES = {
  /** Active immédiatement la nouvelle version en attente. */
  skipWaiting: "BB_SKIP_WAITING",
  /** Supprime tous les caches batibuild (mise à jour majeure, purge). */
  clearCaches: "BB_CLEAR_CACHES",
} as const;

/** Drapeau de session : un seul rechargement après mise à jour de version. */
const RELOAD_FLAG = "bb-sw-version-reloaded";

/** Enregistrement déjà tenté dans cette page ? */
let registrationAttempted = false;

/** Conteneur Service Worker du contexte courant, ou `null`. */
export function serviceWorkerContainer(): ServiceWorkerContainer | null {
  if (typeof navigator === "undefined") return null;
  const container = navigator.serviceWorker;
  return container && typeof container.register === "function" ? container : null;
}

/** Un rechargement peut-il être déclenché pour appliquer une nouvelle version ? */
function shouldReloadForNewVersion(): boolean {
  try {
    if (!sessionStorage) return false;
    if (sessionStorage.getItem(RELOAD_FLAG)) return false;
    sessionStorage.setItem(RELOAD_FLAG, "1");
    return true;
  } catch {
    // sessionStorage indisponible : ne jamais recharger en boucle.
    return false;
  }
}

/**
 * Enregistre le Service Worker Web (idempotent).
 * Sans effet dans l'application Android, en développement ou hors HTTPS.
 */
export function registerWebServiceWorker(win?: unknown): void {
  if (registrationAttempted) return;
  if (IS_ANDROID_APP) return;
  if (!import.meta.env.PROD) return;
  if (!canUseWebCache(win)) return;

  const container = serviceWorkerContainer();
  if (!container) return;
  registrationAttempted = true;

  try {
    container
      .register(SERVICE_WORKER_URL, { scope: "/" })
      .then((registration) => {
        // Une nouvelle version détectée est activée immédiatement : l'utilisateur
        // n'attend jamais la fermeture de tous les onglets.
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && container.controller) {
              installing.postMessage(SERVICE_WORKER_MESSAGES.skipWaiting);
            }
          });
        });
      })
      .catch((error) => {
        // Cache avancé indisponible : la plateforme fonctionne normalement, en
        // s'appuyant uniquement sur le cache HTTP (voir `vercel.json`).
        if (import.meta.env.DEV) console.warn("[webCache] Service Worker non enregistré:", error);
      });

    // Le nouveau Service Worker a pris la main : un seul rechargement, sans
    // boucle, pour que la page courante utilise la nouvelle version.
    container.addEventListener("controllerchange", () => {
      if (!container.controller) return;
      if (!shouldReloadForNewVersion()) return;
      window.location.reload();
    });
  } catch (error) {
    if (import.meta.env.DEV) console.warn("[webCache] Service Worker non enregistré:", error);
  }
}

/** Retire un éventuel Service Worker (utile hors contexte Web, ou en purge). */
export async function unregisterWebServiceWorker(): Promise<boolean> {
  const container = serviceWorkerContainer();
  if (!container) return false;
  try {
    const registrations = await container.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    return registrations.length > 0;
  } catch {
    return false;
  }
}

/** Envoie un message au Service Worker actif (`false` si aucun). */
export function postToServiceWorker(message: string): boolean {
  const container = serviceWorkerContainer();
  const worker = container?.controller;
  if (!worker) return false;
  try {
    worker.postMessage({ type: message });
    return true;
  } catch {
    return false;
  }
}

/**
 * Purge complète des caches batibuild (mise à jour majeure, actualisation
 * manuelle). Les ressources statiques versionnées seront simplement
 * rechargées depuis le réseau au prochain affichage.
 * Renvoie `true` si une purge a été demandée au Service Worker.
 */
export async function clearWebCaches(): Promise<boolean> {
  const requested = postToServiceWorker(SERVICE_WORKER_MESSAGES.clearCaches);

  // Repli : purge directe depuis la page (Service Worker inactif ou en cours
  // d'installation), afin que la mise à jour soit toujours effective.
  try {
    if (typeof caches !== "undefined" && typeof caches.keys === "function") {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name.startsWith(CACHE_PREFIX)).map((name) => caches.delete(name)),
      );
    }
  } catch {
    // Cache indisponible : rien à purger.
  }

  return requested;
}

/** Demande au navigateur de vérifier une nouvelle version du Service Worker. */
export async function updateWebServiceWorker(): Promise<void> {
  const container = serviceWorkerContainer();
  if (!container) return;
  try {
    const registration = await container.getRegistration();
    await registration?.update();
  } catch {
    // Vérification impossible : la prochaine visite s'en chargera.
  }
}
