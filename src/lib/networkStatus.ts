// ============================================================================
// ÉTAT DU RÉSEAU — détection temps réel de la connexion Internet.
//
// Objectif : que l'utilisateur comprenne IMMÉDIATEMENT qu'il est hors ligne et
// puisse continuer à travailler sans perdre les informations déjà saisies.
//
//   · DÉTECTION — l'état `navigator.onLine` et les évènements `online` /
//     `offline` du navigateur sont la source PRINCIPALE (instantanés, y compris
//     dans la WebView Android). Une vérification réseau LÉGÈRE et facultative
//     (`probe`) confirme la reprise avant d'annoncer « Connexion rétablie ».
//
//   · UNE SEULE ALERTE PAR COUPURE — une coupure est un ÉPISODE : `outageCount`
//     n'est incrémenté qu'à la transition en ligne → hors ligne, jamais à
//     chaque évènement. L'interface affiche donc une bannière unique, qui reste
//     visible jusqu'à la reprise effective.
//
//   · REPRISE MAÎTRISÉE — une seule vérification est en vol à la fois ; en cas
//     d'échec, une SEULE reconnexion est replanifiée (jamais de rafale ni de
//     boucle parallèle). Les opérations échouées pendant la coupure sont
//     rejouées UNE fois, séquentiellement, et uniquement lorsque le réseau est
//     réellement revenu.
//
//   · DONNÉES PROTÉGÉES — les brouillons sont conservés localement
//     (`writeDraft` / `readDraft` / `clearDraft`) : rien n'est effacé quand la
//     connexion tombe, et la saisie survit à un rechargement. Une opération
//     n'est considérée comme ENREGISTRÉE que si le serveur l'a confirmée (la
//     fonction de reprise doit renvoyer `true`).
//
//   · AUCUNE DÉCONNEXION AUTOMATIQUE — ce module ne touche JAMAIS à la session :
//     il ne connaît ni jetons ni `signOut`. La session est conservée localement
//     et seule une expiration RÉELLE côté serveur (détectée par requête, une
//     fois le réseau revenu) peut ramener l'utilisateur vers la connexion.
//
// Le même contrat s'applique au navigateur (Desktop / Mobile Web) et à
// l'application Android : aucun cookie, aucune bannière de consentement, aucun
// impact sur l'écran de démarrage, le guide de première utilisation ou la
// navigation.
// ============================================================================
import { useEffect, useSyncExternalStore } from "react";

/** Phase d'affichage : en ligne, coupure en cours, ou reprise transitoire. */
export type NetworkPhase = "online" | "offline" | "restored";

/** État réseau observé, immuable (nouvelle référence à chaque changement). */
export interface NetworkSnapshot {
  /** Le réseau est utilisable (et confirmé lorsque la vérification est active). */
  online: boolean;
  /** Phase pilotant l'affichage de la bannière. */
  phase: NetworkPhase;
  /** Nombre de coupures observées depuis le démarrage (une par épisode). */
  outageCount: number;
  /** Opérations échouées en attente de reprise. */
  pendingOperations: number;
  /** Vérification réseau en cours. */
  checking: boolean;
}

export type NetworkListener = (snapshot: NetworkSnapshot) => void;

/** Fonction de reprise d'une opération : `true` = confirmation du SERVEUR. */
export type RetryOperation = () => boolean | Promise<boolean>;

/** Cible évènementielle (fenêtre du navigateur, ou objet simulé en test). */
export interface NetworkEventTarget {
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
  navigator?: { onLine?: boolean } | undefined;
}

type TimeoutHandle = ReturnType<typeof setTimeout>;

/** Horloge injectable (les tests pilotent le temps). */
export interface TimerApi {
  setTimeout: (handler: () => void, ms: number) => TimeoutHandle;
  clearTimeout: (handle: TimeoutHandle) => void;
}

export interface NetworkMonitorOptions {
  /** Fenêtre observée. Par défaut `window` (ou rien hors navigateur). */
  target?: NetworkEventTarget | undefined;
  /** Vérification réseau facultative. `undefined` = `navigator.onLine` suffit. */
  probe?: (() => Promise<boolean>) | undefined;
  /** Délai maximal de la vérification par défaut (ms). */
  probeTimeoutMs?: number;
  /** Délai avant une nouvelle tentative quand la vérification échoue (ms). */
  recheckDelayMs?: number;
  /** Durée d'affichage de « Connexion rétablie » (ms). */
  restoredVisibleMs?: number;
  /** Horloge injectable. */
  timers?: TimerApi;
}

export const DEFAULT_RESTORED_VISIBLE_MS = 4000;
export const DEFAULT_RECHECK_DELAY_MS = 5000;
export const DEFAULT_PROBE_TIMEOUT_MS = 4000;

export interface NetworkMonitor {
  getSnapshot(): NetworkSnapshot;
  subscribe(listener: NetworkListener): () => void;
  /** Démarre l'écoute (idempotent). */
  start(): void;
  /** Nouvelle tentative demandée par l'utilisateur (bouton « Réessayer »). */
  retryNow(): Promise<boolean>;
  /** Enregistre une opération échouée (dédupliquée par identifiant). */
  registerFailedOperation(id: string, run: RetryOperation): void;
  /** Retire une opération (elle a été enregistrée par un autre chemin). */
  clearFailedOperation(id: string): void;
  /** Arrête l'écoute et annule les minuteries (tests). */
  dispose(): void;
}

const defaultTimers: TimerApi = {
  setTimeout: (handler, ms) => setTimeout(handler, ms),
  clearTimeout: (handle) => clearTimeout(handle),
};

/** Fenêtre du navigateur, ou `undefined` (tests, rendu serveur). */
function defaultTarget(): NetworkEventTarget | undefined {
  return typeof window === "undefined" ? undefined : (window as NetworkEventTarget);
}

/** Cible fournie, ou la fenêtre courante si elle en expose une. */
function resolveTarget(explicit?: NetworkEventTarget): NetworkEventTarget | undefined {
  if (explicit !== undefined) return explicit;
  return defaultTarget();
}

/**
 * État réseau annoncé par le navigateur. Inconnu (contexte de test, WebView
 * sans API) → considéré EN LIGNE : on ne signale jamais une coupure imaginaire.
 */
export function readNavigatorOnline(target?: NetworkEventTarget): boolean {
  const state = target?.navigator?.onLine;
  if (typeof state === "boolean") return state;
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return true;
}

/**
 * Vérification réseau par défaut : une requête `GET` minimale vers l'origine
 * courante. Elle réussit dès qu'une réponse arrive (même 404 : la preuve est
 * que le réseau répond), échoue sur erreur réseau ou dépassement de délai.
 *
 * L'en-tête `Range` fait volontairement SORTIR la requête du Service Worker
 * (voir `public/sw.js` : les requêtes `Range` ne sont jamais interceptées) :
 * la vérification interroge donc toujours le réseau réel, jamais un cache
 * hors ligne qui ferait croire à tort que la connexion est revenue.
 */
export function createDefaultProbe(timeoutMs = DEFAULT_PROBE_TIMEOUT_MS): () => Promise<boolean> {
  return async () => {
    if (typeof fetch !== "function" || typeof location === "undefined") return true;
    const controller = typeof AbortController === "function" ? new AbortController() : undefined;
    const timer = controller
      ? setTimeout(() => controller.abort(), timeoutMs)
      : undefined;
    try {
      const url = `${location.origin}/?bb_ping=${Date.now()}`;
      await fetch(url, {
        method: "GET",
        cache: "no-store",
        credentials: "omit",
        headers: { Range: "bytes=0-0" },
        signal: controller?.signal,
      });
      return true;
    } catch {
      return false;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  };
}

/**
 * Observateur du réseau : coupures dédupliquées, reprise vérifiée, file de
 * reprise des opérations échouées. Sans effet de bord sur la session.
 */
export function createNetworkMonitor(options: NetworkMonitorOptions = {}): NetworkMonitor {
  const timers = options.timers ?? defaultTimers;
  const target = resolveTarget(options.target);
  const recheckDelayMs = options.recheckDelayMs ?? DEFAULT_RECHECK_DELAY_MS;
  const restoredVisibleMs = options.restoredVisibleMs ?? DEFAULT_RESTORED_VISIBLE_MS;
  const probe =
    options.probe ??
    (typeof fetch === "function" && typeof location !== "undefined"
      ? createDefaultProbe(options.probeTimeoutMs)
      : undefined);

  let online = readNavigatorOnline(target);
  let phase: NetworkPhase = online ? "online" : "offline";
  let outageCount = online ? 0 : 1;
  let checking = false;
  let disposed = false;
  let started = false;
  let recheckTimer: TimeoutHandle | null = null;
  let restoredTimer: TimeoutHandle | null = null;
  let probeInFlight: Promise<boolean> | null = null;
  let runningPending = false;

  const pending = new Map<string, { id: string; run: RetryOperation }>();
  const listeners = new Set<NetworkListener>();

  function buildSnapshot(): NetworkSnapshot {
    return {
      online,
      phase,
      outageCount,
      pendingOperations: pending.size,
      checking,
    };
  }

  // La référence n'est recréée qu'à un changement : `useSyncExternalStore`
  // exige un instantané stable entre deux rendus.
  let snapshot: NetworkSnapshot = buildSnapshot();

  function emit(): void {
    snapshot = buildSnapshot();
    for (const listener of [...listeners]) {
      try {
        listener(snapshot);
      } catch {
        // Un auditeur défaillant ne doit jamais interrompre la surveillance.
      }
    }
  }

  function cancelRecheck(): void {
    if (recheckTimer === null) return;
    timers.clearTimeout(recheckTimer);
    recheckTimer = null;
  }

  function cancelRestored(): void {
    if (restoredTimer === null) return;
    timers.clearTimeout(restoredTimer);
    restoredTimer = null;
  }

  /**
   * Replanifie AU PLUS UNE vérification. Le réseau est annoncé disponible par
   * le navigateur mais la vérification a échoué : on retente calmement, sans
   * jamais empiler plusieurs reprises parallèles.
   */
  function scheduleRecheck(): void {
    if (disposed || recheckTimer !== null) return;
    recheckTimer = timers.setTimeout(() => {
      recheckTimer = null;
      if (disposed) return;
      if (!readNavigatorOnline(target)) return; // encore hors ligne : on attend l'évènement
      void verify();
    }, recheckDelayMs);
  }

  /** Une seule vérification à la fois : les appels concurrents partagent la même. */
  function verify(): Promise<boolean> {
    if (disposed) return Promise.resolve(false);
    if (probeInFlight) return probeInFlight;
    if (phase === "online") {
      online = true;
      return Promise.resolve(true);
    }

    const run = async (): Promise<boolean> => {
      if (disposed) return false;
      checking = true;
      emit();

      let reachable = true;
      if (probe) {
        try {
          reachable = await probe();
        } catch {
          reachable = false;
        }
      }

      if (disposed) return false;
      checking = false;

      if (!reachable) {
        // Toujours injoignable : la bannière reste, une seule reprise est planifiée.
        online = false;
        phase = "offline";
        emit();
        scheduleRecheck();
        return false;
      }

      cancelRecheck();
      online = true;
      phase = "restored";
      emit();

      // Rejoue UNIQUEMENT les opérations ayant échoué pendant la coupure.
      void runPending();

      cancelRestored();
      restoredTimer = timers.setTimeout(() => {
        restoredTimer = null;
        if (disposed || phase !== "restored") return;
        phase = "online";
        emit();
      }, restoredVisibleMs);

      return true;
    };

    probeInFlight = run().finally(() => {
      probeInFlight = null;
    });
    return probeInFlight;
  }

  /** Rejoue la file UNE fois, séquentiellement (aucune boucle, aucun parallèle). */
  async function runPending(): Promise<void> {
    if (disposed || runningPending || !online) return;
    runningPending = true;
    try {
      for (const entry of [...pending.values()]) {
        if (disposed || !online) break;
        let saved = false;
        try {
          saved = await entry.run();
        } catch {
          saved = false;
        }
        // Une seule confirmation serveur retire l'opération : un échec reste en
        // attente du PROCHAIN retour du réseau (ou d'une reprise manuelle).
        if (saved) pending.delete(entry.id);
      }
    } finally {
      runningPending = false;
      emit();
    }
  }

  function handleOffline(): void {
    if (disposed) return;
    cancelRecheck();
    cancelRestored();
    checking = false;
    const alreadyDown = phase === "offline";
    online = false;
    if (!alreadyDown) {
      // Nouvelle coupure : l'alerte est comptée une seule fois pour l'épisode.
      phase = "offline";
      outageCount += 1;
    }
    emit();
  }

  function handleOnline(): void {
    if (disposed) return;
    void verify();
  }

  const monitor: NetworkMonitor = {
    getSnapshot: () => snapshot,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    start() {
      if (started || disposed) return;
      started = true;
      if (!online) phase = "offline";
      target?.addEventListener?.("online", handleOnline);
      target?.addEventListener?.("offline", handleOffline);
      emit();
    },

    async retryNow() {
      if (disposed) return false;
      if (!readNavigatorOnline(target)) {
        // Le périphérique ne voit toujours aucun réseau : garder la bannière.
        return false;
      }
      const restored = await verify();
      if (restored) await runPending();
      return restored;
    },

    registerFailedOperation(id, run) {
      if (disposed || !id) return;
      pending.set(id, { id, run });
      emit();
    },

    clearFailedOperation(id) {
      if (disposed || !pending.delete(id)) return;
      emit();
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      cancelRecheck();
      cancelRestored();
      target?.removeEventListener?.("online", handleOnline);
      target?.removeEventListener?.("offline", handleOffline);
      listeners.clear();
    },
  };

  return monitor;
}

let singleton: NetworkMonitor | null = null;

/** Observateur partagé de l'application (un seul écouteur pour toute la page). */
export function getNetworkMonitor(): NetworkMonitor {
  if (!singleton) singleton = createNetworkMonitor();
  return singleton;
}

/**
 * État réseau réactif. Monté en un seul endroit (`NetworkStatusBanner`) : la
 * surveillance est globale, jamais dupliquée par page.
 */
export function useNetworkStatus(): NetworkSnapshot {
  const monitor = getNetworkMonitor();
  useEffect(() => {
    monitor.start();
  }, [monitor]);
  return useSyncExternalStore(monitor.subscribe, monitor.getSnapshot, monitor.getSnapshot);
}

/** Enregistre une opération échouée pour reprise au retour du réseau. */
export function registerFailedOperation(id: string, run: RetryOperation): void {
  getNetworkMonitor().registerFailedOperation(id, run);
}

/** Retire une opération de la file (elle a fini par être enregistrée). */
export function clearFailedOperation(id: string): void {
  getNetworkMonitor().clearFailedOperation(id);
}

/* ------------------------------------------------------------------ *
 * Brouillons locaux — « Vos données sont conservées localement. »
 * ------------------------------------------------------------------ */

export type DraftStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

/** Préfixe commun aux brouillons (aucune donnée sensible : jamais de jeton). */
export const DRAFT_KEY_PREFIX = "bb_draft_";

/**
 * Magasin de brouillons : celui fourni, sinon `localStorage` quand il existe
 * (navigateur ET WebView Android, où le stockage local est celui de la coque).
 * Un stockage indisponible (navigation privée, quota) renvoie `null` : l'appel
 * est alors simplement ignoré, jamais une erreur.
 */
export function resolveDraftStore(store?: DraftStore | null): DraftStore | null {
  if (store !== undefined) return store;
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** Clé de brouillon, éventuellement par entité (projet, devis, message…). */
export function draftKey(scope: string, id?: string | null): string {
  const base = `${DRAFT_KEY_PREFIX}${scope}`;
  return id === undefined || id === null || id === "" ? base : `${base}:${id}`;
}

/** Conserve un brouillon localement. `true` si l'écriture a réussi. */
export function writeDraft(key: string, value: unknown, store?: DraftStore | null): boolean {
  const target = resolveDraftStore(store);
  if (!target) return false;
  try {
    target.setItem(key, JSON.stringify({ v: 1, at: Date.now(), data: value }));
    return true;
  } catch {
    return false;
  }
}

/** Relit un brouillon localement, ou la valeur de repli. */
export function readDraft<T>(key: string, fallback: T, store?: DraftStore | null): T {
  const target = resolveDraftStore(store);
  if (!target) return fallback;
  try {
    const raw = target.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { data?: T } | null;
    if (!parsed || typeof parsed !== "object" || !("data" in parsed)) return fallback;
    return parsed.data as T;
  } catch {
    return fallback;
  }
}

/** Supprime un brouillon (données envoyées, ou volonté de l'utilisateur). */
export function clearDraft(key: string, store?: DraftStore | null): void {
  const target = resolveDraftStore(store);
  if (!target) return;
  try {
    target.removeItem(key);
  } catch {
    /* stockage indisponible : rien à supprimer */
  }
}
