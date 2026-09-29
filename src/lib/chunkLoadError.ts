// ============================================================================
// ÉCHEC DE CHARGEMENT D'UN MODULE JAVASCRIPT — MESSAGE DE CONNEXION.
//
// Les pages de batibuild sont chargées à la demande (`lazy()` dans
// `src/main.tsx`). Quand un fragment (`chunk`) ne peut pas être téléchargé —
// perte de connexion, coupure pendant la navigation, ou ancien fragment devenu
// introuvable après un nouveau déploiement — le navigateur rejette l'`import()`
// et l'utilisateur se retrouvait devant une erreur TECHNIQUE de l'aperçu
// (« Failed to fetch dynamically imported module: …/MyProjects-xxxx.js »).
//
// Ce module intercepte ce cas GLOBALEMENT (tous les modules dynamiques, pas
// seulement « Mes projets ») et décide :
//
//   · HORS LIGNE (`navigator.onLine === false`) → l'écran de connexion est
//     affiché immédiatement : aucun rechargement inutile, aucun détail
//     technique (« Erreur de connexion, vérifier votre connexion internet »).
//
//   · EN LIGNE → UN SEUL rechargement complet automatique est tenté : c'est la
//     récupération naturelle après un nouveau déploiement (le document est
//     re-servi par le réseau, donc avec les nouveaux noms de fragments — voir
//     le « réseau d'abord » de `public/sw.js`). Le drapeau est conservé pour
//     toute la session : la page ne peut JAMAIS boucler sur elle-même. Si le
//     problème persiste après ce rechargement unique, l'écran de connexion
//     s'affiche avec le bouton « Réessayer ».
//
//   · « Réessayer » → vérifie que le réseau répond RÉELLEMENT (sonde
//     `?bb_ping`, hors Service Worker) puis recharge proprement la page.
//
// Les DÉTAILS TECHNIQUES restent dans `console.error` (débogage développeur) et
// ne sont jamais rendus dans l'interface. Le même contrat s'applique au
// navigateur (Desktop / Mobile Web) et à l'application Android (WebView).
// ============================================================================
import { useSyncExternalStore } from "react";

import { createDefaultProbe } from "./networkStatus";

/** Message affiché à l'utilisateur en cas d'échec de chargement d'un module. */
export const CONNECTION_ERROR_MESSAGE =
  "Erreur de connexion, vérifier votre connexion internet";

/**
 * Drapeau de SESSION : au plus un rechargement automatique par onglet.
 * Conservé APRÈS le rechargement (contrairement à un drapeau effacé au
 * démarrage) : c'est ce qui garantit l'absence de boucle infinie quand un
 * fragment reste introuvable.
 */
export const CHUNK_RELOAD_FLAG = "bb_chunk_reload_attempted";

/**
 * Fragments de message produits par les navigateurs (et par webpack) lorsqu'un
 * module dynamique ne peut pas être chargé. Couvre Chrome / Edge, Firefox,
 * Safari, Android WebView et les bundlers qui lèvent un `ChunkLoadError`.
 */
const CHUNK_ERROR_PATTERNS: readonly string[] = [
  "failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "importing a module script failed",
  "dynamically imported module",
  "loading chunk",
  "loading css chunk",
  "unable to preload css",
  "chunkloaderror",
  "failed to load module script",
];

/** Message en minuscules, ou `null` si la valeur n'en porte pas. */
function messageOf(value: unknown): string | null {
  if (typeof value === "string") return value.toLowerCase();
  if (value instanceof Error) return value.message.toLowerCase();
  return null;
}

/** Un texte (ou un nom d'erreur) désigne-t-il un échec de chargement ? */
function matchesChunkError(text: string): boolean {
  return CHUNK_ERROR_PATTERNS.some((pattern) => text.includes(pattern));
}

/**
 * Vrai si l'erreur (ou sa cause `reason` / `cause`, jusqu'à 4 niveaux) est un
 * échec de chargement de module : `import()` rejeté, erreur de fragment,
 * `ChunkLoadError`, script de module refusé…
 */
export function isChunkLoadError(error: unknown): boolean {
  const visited = new Set<unknown>();
  let current: unknown = error;

  for (let depth = 0; depth < 4; depth += 1) {
    if (current === null || current === undefined) return false;
    if (visited.has(current)) return false;
    visited.add(current);

    const text = messageOf(current);
    if (text !== null && matchesChunkError(text)) return true;

    if (typeof current !== "object") return false;
    const record = current as {
      name?: unknown;
      reason?: unknown;
      cause?: unknown;
    };
    if (record.name === "ChunkLoadError") return true;
    current = record.reason ?? record.cause;
  }

  return false;
}

/* ------------------------------------------------------------------ *
 * Environnement (injectable : les tests pilotent réseau, stockage, rechargement)
 * ------------------------------------------------------------------ */

/** Stockage minimal (une session de navigateur suffit). */
export interface ReloadFlagStore {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

/** Fenêtre (ou objet équivalent) exposant `addEventListener`. */
export interface ChunkLoadErrorTarget {
  addEventListener?: (type: string, listener: (event: never) => void, capture?: boolean) => void;
  removeEventListener?: (type: string, listener: (event: never) => void, capture?: boolean) => void;
}

/** Dépendances externes, toutes remplaçables dans les tests. */
export interface ChunkLoadErrorOptions {
  /** Stockage du drapeau de rechargement. `null` = aucun rechargement automatique. */
  storage?: ReloadFlagStore | null;
  /** Rechargement complet de la page. */
  reload?: () => void;
  /** État réseau annoncé par le navigateur. */
  isOnline?: () => boolean;
  /** Sonde réseau (vérifie que le réseau répond vraiment). */
  probe?: (() => Promise<boolean>) | undefined;
  /** Fenêtre observée pour `unhandledrejection` / `error`. */
  target?: ChunkLoadErrorTarget | undefined;
}

/** Réseau annoncé par le navigateur. Inconnu → considéré EN LIGNE. */
export function readOnline(): boolean {
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return true;
}

/** Stockage de session, ou `null` (navigation privée, WebView sans stockage). */
export function resolveReloadFlagStore(
  store?: ReloadFlagStore | null,
): ReloadFlagStore | null {
  if (store !== undefined) return store;
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

/** Rechargement complet de la page (document et fragments re-servis par le réseau). */
export function defaultReload(): void {
  const win = typeof window === "undefined" ? undefined : window;
  if (win && typeof win.location?.reload === "function") {
    win.location.reload();
  }
}

/* ------------------------------------------------------------------ *
 * État observé par l'interface
 * ------------------------------------------------------------------ */

export interface ConnectionErrorState {
  /** L'écran de connexion doit-il être affiché ? */
  active: boolean;
}

let active = false;
let reloadTriggered = false;
let snapshot: ConnectionErrorState = { active: false };

const listeners = new Set<() => void>();

function emit(): void {
  snapshot = { active };
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      // Un auditeur défaillant n'empêche jamais l'affichage de l'écran.
    }
  }
}

/** Affiche l'écran de connexion (idempotent). */
export function showConnectionError(): void {
  if (active) return;
  active = true;
  emit();
}

/** Instantané stable (exigence de `useSyncExternalStore`). */
export function getConnectionErrorSnapshot(): ConnectionErrorState {
  return snapshot;
}

/** Abonnement à l'affichage de l'écran de connexion. */
export function subscribeConnectionError(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** L'écran de connexion est-il affiché ? */
export function isConnectionErrorActive(): boolean {
  return active;
}

/** État réactif pour l'interface. */
export function useConnectionErrorActive(): boolean {
  return useSyncExternalStore(
    subscribeConnectionError,
    () => snapshot.active,
    () => false,
  );
}

/* ------------------------------------------------------------------ *
 * Décision : rechargement unique, ou écran de connexion
 * ------------------------------------------------------------------ */

export type ChunkLoadErrorOutcome = "ignored" | "offline" | "reloaded" | "shown";

/**
 * Réservé une seule fois le droit de recharger automatiquement dans cette
 * session. `false` → garde déjà consommée, ou stockage indisponible : dans les
 * deux cas on n'essaie JAMAIS de recharger (aucune boucle possible).
 */
function claimAutoReload(store: ReloadFlagStore | null): boolean {
  if (!store) return false;
  try {
    if (store.getItem(CHUNK_RELOAD_FLAG)) return false;
    store.setItem(CHUNK_RELOAD_FLAG, "1");
    return true;
  } catch {
    return false;
  }
}

/**
 * Traite un échec de chargement de module : écran de connexion immédiat hors
 * ligne, sinon UN SEUL rechargement automatique, puis l'écran avec « Réessayer »
 * si le problème persiste. Ne fait rien pour toute autre erreur.
 */
export function reportChunkLoadError(
  error: unknown,
  options: ChunkLoadErrorOptions = {},
): ChunkLoadErrorOutcome {
  if (!isChunkLoadError(error)) return "ignored";

  // Détails techniques : console uniquement, jamais dans l'interface.
  console.error("[batibuild] Échec de chargement d'un module JavaScript :", error);

  // L'écran est affiché dans TOUS les cas : si le rechargement n'aboutit pas
  // (fenêtre figée, navigation refusée), l'utilisateur n'a jamais un écran vide.
  showConnectionError();

  if (reloadTriggered) return "shown";
  if (!(options.isOnline ?? readOnline)()) return "offline";

  const store = resolveReloadFlagStore(options.storage);
  if (!claimAutoReload(store)) return "shown";

  reloadTriggered = true;
  console.warn(
    "[batibuild] Nouveau fichier de l'application introuvable — un seul rechargement automatique.",
  );
  (options.reload ?? defaultReload)();
  return "reloaded";
}

/* ------------------------------------------------------------------ *
 * Bouton « Réessayer »
 * ------------------------------------------------------------------ */

export type RetryOutcome = "reloaded" | "offline" | "unreachable";

/**
 * « Réessayer » : vérifie que la connexion est RÉELLEMENT revenue, puis
 * recharge proprement la page (ce qui récupère aussi les nouveaux fichiers
 * JavaScript après un déploiement). Aucun rechargement si le réseau ne répond
 * pas — l'écran reste affiché.
 */
export async function retryConnection(
  options: ChunkLoadErrorOptions = {},
): Promise<RetryOutcome> {
  if (!(options.isOnline ?? readOnline)()) return "offline";

  const probe =
    options.probe ??
    (typeof fetch === "function" && typeof location !== "undefined"
      ? createDefaultProbe()
      : undefined);

  if (probe) {
    let reachable = false;
    try {
      reachable = await probe();
    } catch {
      reachable = false;
    }
    if (!reachable) return "unreachable";
  }

  reloadTriggered = true;
  (options.reload ?? defaultReload)();
  return "reloaded";
}

/* ------------------------------------------------------------------ *
 * Interception globale
 * ------------------------------------------------------------------ */

let globalHandlerInstalled = false;

/**
 * Intercepte GLOBALEMENT les échecs de chargement de modules :
 *
 *   · `unhandledrejection` — `import()` rejeté hors du cycle de rendu React
 *     (préchargement, import à la demande dans un gestionnaire d'évènement) ;
 *   · `error` (phase de capture) — script de module refusé ou évènement
 *     d'erreur de ressource.
 *
 * Les erreurs qui ne concernent PAS un chargement de module sont ignorées :
 * le comportement habituel de l'application n'est jamais modifié.
 * Idempotent sur la fenêtre réelle ; renvoie la fonction de désabonnement.
 */
export function installChunkLoadErrorHandler(
  options: ChunkLoadErrorOptions = {},
): () => void {
  const explicitTarget = options.target;
  const target: ChunkLoadErrorTarget | undefined = explicitTarget ??
    (typeof window === "undefined" ? undefined : (window as unknown as ChunkLoadErrorTarget));

  if (!target?.addEventListener) return () => {};

  if (!explicitTarget) {
    if (globalHandlerInstalled) return () => {};
    globalHandlerInstalled = true;
  }

  const onUnhandledRejection = (event: unknown): void => {
    const reason = (event as { reason?: unknown } | null)?.reason;
    if (!isChunkLoadError(reason)) return;
    reportChunkLoadError(reason, options);
  };

  const onError = (event: unknown): void => {
    const record = event as { error?: unknown; message?: unknown } | null;
    const value = record?.error ?? record?.message;
    if (!isChunkLoadError(value)) return;
    reportChunkLoadError(value, options);
  };

  target.addEventListener("unhandledrejection", onUnhandledRejection as (event: never) => void);
  target.addEventListener("error", onError as (event: never) => void, true);

  return () => {
    target.removeEventListener?.("unhandledrejection", onUnhandledRejection as (event: never) => void);
    target.removeEventListener?.("error", onError as (event: never) => void, true);
    if (!explicitTarget) globalHandlerInstalled = false;
  };
}

/** Réinitialise l'état interne (tests uniquement). */
export function resetConnectionErrorState(): void {
  active = false;
  reloadTriggered = false;
  emit();
}
