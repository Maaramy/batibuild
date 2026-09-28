/* ============================================================================
 * SERVICE WORKER — PLATEFORME WEB batibuild.
 *
 * Objectif : accélérer les visites suivantes (ressources statiques
 * versionnées servies depuis le cache) SANS jamais figer une ancienne version
 * critique de l'application et SANS jamais mettre en cache des données
 * personnelles.
 *
 * Règles appliquées :
 *
 *   1. NAVIGATION (pages HTML)  → RÉSEAU D'ABORD, cache seulement en secours
 *      (hors ligne). Une nouvelle version déployée est donc TOUJOURS chargée :
 *      le contenu HTML n'est jamais servi depuis le cache quand le réseau
 *      répond.
 *   2. `/assets/*-<hash>.<ext>`  → CACHE D'ABORD. Vite versionne ces fichiers
 *      par empreinte de contenu : leur contenu ne change JAMAIS pour une même
 *      URL, et une mise à jour référence de NOUVELLES URLs (donc aucun risque
 *      de servir l'ancienne application).
 *   3. Autres ressources statiques (logo, manifeste, icônes) → revalidation en
 *      arrière-plan (« stale-while-revalidate »).
 *   4. Polices Google Fonts → cache dédié (CSS : revalidation en arrière-plan,
 *      fichiers `.woff2` : cache d'abord, ils sont eux aussi versionnés).
 *   5. API / données de l'utilisateur → JAMAIS interceptées : les requêtes
 *      Convex (temps réel, mutations, fichiers) et toute autre API passent
 *      directement au réseau, sans lecture ni écriture de cache.
 *      ⇒ aucune donnée personnelle ou réponse authentifiée ne peut être servie
 *        depuis le cache, ni partagée entre utilisateurs.
 *   6. Mise à jour : `activate` supprime tous les caches batibuild d'une autre
 *      version ; la page peut aussi demander une activation immédiate
 *      (`BB_SKIP_WAITING`) ou une purge complète (`BB_CLEAR_CACHES`).
 *
 * Ce fichier n'est JAMAIS chargé dans l'application Android : l'enregistrement
 * est conditionné au runtime Web (`src/lib/webServiceWorker.ts`).
 * ==========================================================================*/

/* Version du schéma de cache. À incrémenter lors d'un changement de stratégie :
   les caches des versions précédentes sont supprimés automatiquement. */
const CACHE_VERSION = "v1";

/** Préfixe commun à tous les caches créés ici (sert à la purge). */
const CACHE_PREFIX = "batibuild-";

const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}static-${CACHE_VERSION}`;
const FONT_CACHE = `${CACHE_PREFIX}fonts-${CACHE_VERSION}`;

/** Caches conservés lors d'une activation. */
const KEEP_CACHES = [SHELL_CACHE, STATIC_CACHE, FONT_CACHE];

/** Shell de l'application, mis en cache à l'installation (accès hors ligne). */
const PRECACHE_URLS = ["/", "/manifest.webmanifest", "/batibuild-logo.png"];

/** Repli hors ligne pour toute navigation. */
const SHELL_FALLBACK_URL = "/index.html";

/**
 * Hôtes techniques JAMAIS mis en cache : Convex (requêtes temps réel,
 * mutations, stockage de fichiers) et l'API interne de l'hébergeur.
 */
const NEVER_CACHE_HOST_SUFFIXES = [
  ".convex.cloud",
  ".convex.site",
  ".convex.dev",
  ".convexusercontent.com",
];

/** Chemins JAMAIS mis en cache (API, endpoints internes). */
const NEVER_CACHE_PATH_PREFIXES = ["/api/", "/_vercel/", "/.netlify/", "/.well-known/"];

/** Hôtes de polices autorisés au cache. */
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

/** Destinations de requête considérées comme ressources statiques. */
const STATIC_DESTINATIONS = ["style", "script", "image", "font", "manifest"];

/** Messages acceptés depuis la page (voir `src/lib/webServiceWorker.ts`). */
const MESSAGE_SKIP_WAITING = "BB_SKIP_WAITING";
const MESSAGE_CLEAR_CACHES = "BB_CLEAR_CACHES";

/* ------------------------------------------------------------------ *
 * Prédicats
 * ------------------------------------------------------------------ */

function matchesHostSuffix(hostname, suffixes) {
  return suffixes.some((suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix));
}

/** Requête dont la réponse ne doit jamais être mise en cache (API, Convex). */
function isNeverCached(url) {
  if (matchesHostSuffix(url.hostname, NEVER_CACHE_HOST_SUFFIXES)) return true;
  return NEVER_CACHE_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

/** Ressource versionnée par empreinte : `/assets/<nom>-<hash>.<ext>`. */
function isHashedAsset(url) {
  return /\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.[A-Za-z0-9]+$/.test(url.pathname);
}

function isFontRequest(url) {
  return FONT_HOSTS.includes(url.hostname);
}

/** Navigation (document HTML) : jamais servie depuis le cache si le réseau répond. */
function isNavigationRequest(request, url) {
  if (request.mode === "navigate") return true;
  if (request.destination === "document") return true;
  // Requêtes SPA (`Accept: text/html`) et routes sans extension.
  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/html")) return true;
  return !/\.[a-z0-9]{2,5}$/i.test(url.pathname);
}

/** La réponse peut-elle être mise en cache (statut et type sûrs) ? */
function isCacheableResponse(response) {
  if (!response || !response.ok) return false;
  return response.type === "basic" || response.type === "cors" || response.type === "default";
}

/* ------------------------------------------------------------------ *
 * Stratégies
 * ------------------------------------------------------------------ */

/** Cache d'abord — réservé aux ressources versionnées et immuables. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheableResponse(response)) {
    try {
      await cache.put(request, response.clone());
    } catch (error) {
      /* quota dépassé : on sert simplement la réponse réseau */
    }
  }
  return response;
}

/** Réseau d'abord, cache en secours (pages HTML : jamais de version figée). */
async function networkFirstShell(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      try {
        await cache.put(SHELL_FALLBACK_URL, response.clone());
      } catch (error) {
        /* cache indisponible : la réponse réseau reste servie */
      }
    }
    return response;
  } catch (error) {
    const cached = (await cache.match(request)) || (await cache.match(SHELL_FALLBACK_URL));
    if (cached) return cached;
    throw error;
  }
}

/** Sert le cache puis met à jour en arrière-plan (ressources non versionnées). */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (isCacheableResponse(response)) {
        try {
          await cache.put(request, response.clone());
        } catch (error) {
          /* quota dépassé : le cache existant reste utilisé */
        }
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;
  const response = await network;
  if (response) return response;
  throw new Error("batibuild: ressource indisponible hors ligne");
}

/** Polices : CSS revalidé en arrière-plan, fichiers `.woff2` servis du cache. */
function fontStrategy(request) {
  const url = new URL(request.url);
  if (url.hostname === "fonts.gstatic.com") return cacheFirst(request, FONT_CACHE);
  return staleWhileRevalidate(request, FONT_CACHE);
}

/* ------------------------------------------------------------------ *
 * Cycle de vie
 * ------------------------------------------------------------------ */

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: "reload", credentials: "same-origin" });
            if (isCacheableResponse(response)) await cache.put(url, response);
          } catch (error) {
            /* hors ligne : le shell sera mis en cache au premier chargement */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Invalidation automatique : tout cache batibuild d'une autre version est
      // supprimé (nouvelle version ⇒ aucun ancien fichier ne subsiste).
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && !KEEP_CACHES.includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Aucune méthode d'écriture n'est interceptée (mutations, téléversements).
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch (error) {
    return;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Téléchargements partiels (PDF, vidéos) : jamais de cache.
  if (request.headers.get("range")) return;

  // Données dynamiques / personnelles : réseau uniquement, cache vierge.
  if (isNeverCached(url)) return;

  // Ressources versionnées : cache d'abord.
  if (isHashedAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (isFontRequest(url)) {
    event.respondWith(fontStrategy(request));
    return;
  }

  // Pages de l'application : réseau d'abord (jamais une ancienne version).
  // Une navigation hors de la plateforme n'est jamais interceptée.
  if (isNavigationRequest(request, url)) {
    if (url.origin !== self.location.origin) return;
    event.respondWith(networkFirstShell(request));
    return;
  }

  // Reste des ressources statiques de même origine.
  if (url.origin === self.location.origin && STATIC_DESTINATIONS.includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});

/* ------------------------------------------------------------------ *
 * Messages de la page
 * ------------------------------------------------------------------ */

/** Supprime tous les caches batibuild (mise à jour majeure, déconnexion…). */
async function clearBatibuildCaches() {
  const names = await caches.keys();
  await Promise.all(
    names.filter((name) => name.startsWith(CACHE_PREFIX)).map((name) => caches.delete(name)),
  );
  return names.length;
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === MESSAGE_SKIP_WAITING) {
    // Nouvelle version prête : activation immédiate demandée par la page.
    self.skipWaiting();
    return;
  }
  if (data.type === MESSAGE_CLEAR_CACHES) {
    event.waitUntil(clearBatibuildCaches());
  }
});
