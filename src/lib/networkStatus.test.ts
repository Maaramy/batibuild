// ============================================================================
// ÉTAT DU RÉSEAU — détection temps réel de la connexion Internet.
//
// Ces tests verrouillent les garanties annoncées à l'utilisateur :
//
//   · UNE SEULE alerte par coupure (une coupure = un épisode) ;
//   · la bannière RESTE tant que la connexion n'est pas réellement revenue ;
//   · « Connexion rétablie » disparaît tout seul après quelques secondes ;
//   · seules les opérations ayant ÉCHOUÉ sont rejouées, une seule fois, sans
//     boucle ni reprise parallèle ;
//   · aucune donnée saisie n'est effacée (brouillons locaux) ;
//   · AUCUNE déconnexion automatique sur perte de connexion ;
//   · même contrat sur Desktop, Mobile Web et application Android.
// ============================================================================
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DRAFT_KEY_PREFIX,
  clearDraft,
  createNetworkMonitor,
  draftKey,
  readDraft,
  readNavigatorOnline,
  writeDraft,
  type DraftStore,
  type NetworkSnapshot,
  type RetryOperation,
} from "./networkStatus";

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

type FakeTarget = {
  target: {
    navigator: { readonly onLine: boolean };
    addEventListener: (type: string, listener: () => void) => void;
    removeEventListener: (type: string, listener: () => void) => void;
  };
  /** Simule un évènement navigateur : met à jour `onLine` puis notifie. */
  emit: (type: "online" | "offline") => void;
  /** Force l'état annoncé par le navigateur, sans émettre d'évènement. */
  setOnline: (online: boolean) => void;
  listeners: (type: string) => number;
};

function createTarget(initialOnline = true): FakeTarget {
  const state = { online: initialOnline };
  const registry = new Map<string, Set<() => void>>();

  return {
    target: {
      navigator: {
        get onLine() {
          return state.online;
        },
      },
      addEventListener: (type, listener) => {
        if (!registry.has(type)) registry.set(type, new Set());
        registry.get(type)!.add(listener);
      },
      removeEventListener: (type, listener) => {
        registry.get(type)?.delete(listener);
      },
    },
    emit(type) {
      state.online = type === "online";
      for (const listener of [...(registry.get(type) ?? [])]) listener();
    },
    setOnline(online) {
      state.online = online;
    },
    listeners(type) {
      return registry.get(type)?.size ?? 0;
    },
  };
}

function createStore(): DraftStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

/** Laisse se dérouler les microtâches déclenchées par les évènements. */
const flush = () => vi.advanceTimersByTimeAsync(0);

/**
 * Code source SANS ses commentaires : les garde-fous vérifient l'implémentation
 * réelle, pas la prose explicative (qui mentionne légitimement `signOut`,
 * « cookies » ou « consentement » pour dire qu'ils ne sont pas utilisés).
 */
function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith("//") && !trimmed.startsWith("*");
    })
    .join("\n");
}

afterEach(() => {
  vi.useRealTimers();
});

/* ------------------------------------------------------------------ *
 * Détection et unicité de l'alerte
 * ------------------------------------------------------------------ */

describe("état du réseau — détection", () => {
  it("démarre en ligne et n'annonce aucune coupure", () => {
    const env = createTarget(true);
    const monitor = createNetworkMonitor({ target: env.target, probe: async () => true });
    monitor.start();

    expect(monitor.getSnapshot()).toMatchObject({ online: true, phase: "online", outageCount: 0 });
    monitor.dispose();
  });

  it("démarre hors ligne en comptant une seule coupure", () => {
    const env = createTarget(false);
    const monitor = createNetworkMonitor({ target: env.target, probe: async () => true });
    monitor.start();

    expect(monitor.getSnapshot()).toMatchObject({ online: false, phase: "offline", outageCount: 1 });
    monitor.dispose();
  });

  it("affiche l'alerte UNE SEULE fois pendant la même coupure", () => {
    vi.useFakeTimers();
    const env = createTarget(true);
    const monitor = createNetworkMonitor({ target: env.target, probe: async () => true });
    monitor.start();
    monitor.subscribe(() => {});

    env.emit("offline");
    const first = monitor.getSnapshot();

    // Évènements dupliqués (certains navigateurs en émettent plusieurs) :
    // la coupure reste UN épisode, donc une seule alerte.
    env.emit("offline");
    env.emit("offline");

    expect(first.phase).toBe("offline");
    expect(monitor.getSnapshot().outageCount).toBe(1);
    expect(monitor.getSnapshot().phase).toBe("offline");
    monitor.dispose();
  });

  it("reste hors ligne tant que la connexion n'est pas revenue", async () => {
    vi.useFakeTimers();
    const env = createTarget(true);
    const monitor = createNetworkMonitor({ target: env.target, probe: async () => true });
    monitor.start();

    env.emit("offline");
    await vi.advanceTimersByTimeAsync(120_000);

    // Aucun rétablissement implicite : la bannière reste affichée.
    expect(monitor.getSnapshot().phase).toBe("offline");
    monitor.dispose();
  });
});

/* ------------------------------------------------------------------ *
 * Reprise
 * ------------------------------------------------------------------ */

describe("état du réseau — reprise", () => {
  it("annonce la reprise puis se masque automatiquement", async () => {
    vi.useFakeTimers();
    const env = createTarget(true);
    const monitor = createNetworkMonitor({
      target: env.target,
      probe: async () => true,
      restoredVisibleMs: 4000,
    });
    monitor.start();

    env.emit("offline");
    env.emit("online");
    await flush();

    expect(monitor.getSnapshot()).toMatchObject({ online: true, phase: "restored" });

    await vi.advanceTimersByTimeAsync(3999);
    expect(monitor.getSnapshot().phase).toBe("restored");

    await vi.advanceTimersByTimeAsync(1);
    expect(monitor.getSnapshot().phase).toBe("online");
    monitor.dispose();
  });

  it("ne confirme pas la reprise si le serveur reste injoignable", async () => {
    vi.useFakeTimers();
    const env = createTarget(true);
    const monitor = createNetworkMonitor({
      target: env.target,
      probe: async () => false,
      recheckDelayMs: 5000,
    });
    monitor.start();

    env.emit("offline");
    env.emit("online");
    await flush();

    // Le navigateur annonce un réseau, mais rien ne répond : on reste hors ligne.
    expect(monitor.getSnapshot()).toMatchObject({ online: false, phase: "offline" });
    monitor.dispose();
  });

  it("ne lance qu'UNE vérification à la fois (pas de reprises parallèles)", async () => {
    vi.useFakeTimers();
    const env = createTarget(true);
    let probeCalls = 0;
    const monitor = createNetworkMonitor({
      target: env.target,
      probe: async () => {
        probeCalls += 1;
        return false;
      },
      recheckDelayMs: 5000,
    });
    monitor.start();

    env.emit("offline");
    // Cas type « portail captif » : le navigateur annonce un réseau, le serveur
    // ne répond pas.
    env.setOnline(true);
    await Promise.all([monitor.retryNow(), monitor.retryNow(), monitor.retryNow()]);

    // Trois demandes simultanées → une seule vérification effective.
    expect(probeCalls).toBe(1);
    monitor.dispose();
  });

  it("replanifie une seule reprise, sans boucle de requêtes", async () => {
    vi.useFakeTimers();
    const env = createTarget(true);
    let probeCalls = 0;
    const monitor = createNetworkMonitor({
      target: env.target,
      probe: async () => {
        probeCalls += 1;
        return false;
      },
      recheckDelayMs: 5000,
    });
    monitor.start();

    env.emit("offline");
    env.emit("online");
    await flush();
    expect(probeCalls).toBe(1);

    // Une attente = au plus UNE nouvelle tentative (jamais de rafale).
    await vi.advanceTimersByTimeAsync(5000);
    expect(probeCalls).toBe(2);

    await vi.advanceTimersByTimeAsync(5000);
    expect(probeCalls).toBe(3);

    // Les évènements `online` répétés ne créent pas de vérification en double.
    env.emit("online");
    env.emit("online");
    await flush();
    expect(probeCalls).toBe(4);
    monitor.dispose();
  });

  it("ne vérifie rien si le périphérique n'a toujours aucun réseau", async () => {
    vi.useFakeTimers();
    const env = createTarget(false);
    let probeCalls = 0;
    const monitor = createNetworkMonitor({
      target: env.target,
      probe: async () => {
        probeCalls += 1;
        return true;
      },
    });
    monitor.start();

    expect(await monitor.retryNow()).toBe(false);
    expect(probeCalls).toBe(0);
    expect(monitor.getSnapshot().phase).toBe("offline");
    monitor.dispose();
  });
});

/* ------------------------------------------------------------------ *
 * File de reprise — protection des données
 * ------------------------------------------------------------------ */

describe("état du réseau — opérations échouées", () => {
  it("rejoue uniquement les opérations échouées, une fois chacune", async () => {
    vi.useFakeTimers();
    const env = createTarget(true);
    const monitor = createNetworkMonitor({
      target: env.target,
      probe: async () => true,
      restoredVisibleMs: 4000,
    });
    monitor.start();

    const runs: Record<string, number> = {};
    const track = (id: string, saved: boolean): RetryOperation => () => {
      runs[id] = (runs[id] ?? 0) + 1;
      return saved;
    };

    env.emit("offline");
    monitor.registerFailedOperation("estimation", track("estimation", true));
    monitor.registerFailedOperation("message", track("message", false));
    expect(monitor.getSnapshot().pendingOperations).toBe(2);

    env.emit("online");
    await flush();

    expect(runs).toEqual({ estimation: 1, message: 1 });
    // Une opération confirmée par le serveur sort de la file, l'autre reste en
    // attente : jamais considérée comme enregistrée sans confirmation.
    expect(monitor.getSnapshot().pendingOperations).toBe(1);

    // Aucune boucle : le temps qui passe ne relance rien tout seul.
    await vi.advanceTimersByTimeAsync(120_000);
    expect(runs).toEqual({ estimation: 1, message: 1 });

    // Prochaine coupure / reprise : une nouvelle tentative, unique.
    env.emit("offline");
    env.emit("online");
    await flush();
    expect(runs).toEqual({ estimation: 1, message: 2 });
    monitor.dispose();
  });

  it("déduplique les opérations et oublie celles finalement enregistrées", () => {
    const env = createTarget(true);
    const monitor = createNetworkMonitor({ target: env.target, probe: async () => true });
    monitor.start();

    monitor.registerFailedOperation("projet", () => false);
    monitor.registerFailedOperation("projet", () => false);
    expect(monitor.getSnapshot().pendingOperations).toBe(1);

    monitor.clearFailedOperation("projet");
    expect(monitor.getSnapshot().pendingOperations).toBe(0);
    monitor.dispose();
  });

  it("ne rejoue rien tant que la connexion n'est pas revenue", async () => {
    vi.useFakeTimers();
    const env = createTarget(true);
    const monitor = createNetworkMonitor({ target: env.target, probe: async () => true });
    monitor.start();

    let run = 0;
    env.emit("offline");
    monitor.registerFailedOperation("devis", () => {
      run += 1;
      return true;
    });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(run).toBe(0);
    expect(monitor.getSnapshot().pendingOperations).toBe(1);
    monitor.dispose();
  });

  it("conserve l'instantané stable entre deux lectures (useSyncExternalStore)", () => {
    const env = createTarget(true);
    const monitor = createNetworkMonitor({ target: env.target, probe: async () => true });
    monitor.start();

    const first = monitor.getSnapshot();
    expect(monitor.getSnapshot()).toBe(first);

    monitor.registerFailedOperation("x", () => true);
    expect(monitor.getSnapshot()).not.toBe(first);
    monitor.dispose();
  });
});

/* ------------------------------------------------------------------ *
 * Brouillons locaux
 * ------------------------------------------------------------------ */

describe("état du réseau — brouillons locaux", () => {
  it("conserve la saisie localement puis la relit", () => {
    const store = createStore();
    const key = draftKey("estimation", "projet-42");
    expect(key.startsWith(DRAFT_KEY_PREFIX)).toBe(true);

    expect(writeDraft(key, { surface: 120, pieces: 5 }, store)).toBe(true);
    expect(readDraft(key, null, store)).toEqual({ surface: 120, pieces: 5 });
  });

  it("retombe sur la valeur de repli si le stockage est indisponible", () => {
    expect(writeDraft("bb_draft_x", { a: 1 }, null)).toBe(false);
    expect(readDraft("bb_draft_x", "défaut", null)).toBe("défaut");
    // Aucune exception, même sur une chaîne corrompue.
    const store = createStore();
    store.setItem("bb_draft_broken", "pas du json");
    expect(readDraft("bb_draft_broken", "défaut", store)).toBe("défaut");
  });

  it("supprime le brouillon une fois l'enregistrement confirmé", () => {
    const store = createStore();
    writeDraft("bb_draft_message", { texte: "bonjour" }, store);
    clearDraft("bb_draft_message", store);
    expect(readDraft("bb_draft_message", null, store)).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * Compatibilité Android et garde-fous
 * ------------------------------------------------------------------ */

describe("état du réseau — Android et garde-fous", () => {
  it("n'annonce jamais une coupure sans information réseau (WebView sans API)", () => {
    // Une WebView qui n'expose pas `navigator.onLine` est considérée EN LIGNE :
    // aucune fausse alerte ne doit apparaître dans l'application.
    expect(readNavigatorOnline(undefined)).toBe(true);
    expect(readNavigatorOnline({})).toBe(true);
    expect(readNavigatorOnline({ navigator: {} })).toBe(true);
  });

  it("fonctionne à l'identique dans l'application Android (mêmes évènements)", async () => {
    vi.useFakeTimers();
    // Coque Android : pont natif présent + jeton de User-Agent. La détection
    // réseau ne dépend PAS du stockage Web (cookies désactivés) : les mêmes
    // évènements `online` / `offline` pilotent la bannière.
    const env = createTarget(true);
    const monitor = createNetworkMonitor({
      target: env.target,
      probe: async () => true,
      restoredVisibleMs: 4000,
    });
    monitor.start();

    env.emit("offline");
    expect(monitor.getSnapshot().phase).toBe("offline");
    env.emit("online");
    await flush();
    expect(monitor.getSnapshot().phase).toBe("restored");
    monitor.dispose();
  });

  it("ne touche jamais à la session : aucune déconnexion automatique", () => {
    const files = [
      join(__dirname, "networkStatus.ts"),
      join(__dirname, "..", "components", "NetworkStatusBanner.tsx"),
      join(__dirname, "..", "components", "RequireAuth.tsx"),
    ];

    for (const file of files) {
      const code = stripComments(readFileSync(file, "utf8"));
      expect(code, `${file} ne doit jamais déconnecter l'utilisateur`).not.toMatch(
        /\bsignOut\b|useAuthActions|@convex-dev\/auth/,
      );
    }
  });

  it("n'affiche aucune bannière de cookies et reste léger pour le bundle d'entrée", () => {
    const banner = stripComments(
      readFileSync(join(__dirname, "..", "components", "NetworkStatusBanner.tsx"), "utf8"),
    );

    // Aucune demande de consentement, aucun cookie : la bannière réseau est
    // purement informative (et identique dans l'application Android).
    expect(banner).not.toMatch(/cookie|consent/i);
    // Montée dans `src/main.tsx` : framer-motion alourdirait le chunk d'entrée.
    expect(banner).not.toMatch(/framer-motion/);
  });

  it("nettoie ses écouteurs à l'arrêt", () => {
    const env = createTarget(true);
    const monitor = createNetworkMonitor({ target: env.target, probe: async () => true });
    monitor.start();
    expect(env.listeners("online")).toBe(1);
    expect(env.listeners("offline")).toBe(1);

    monitor.dispose();
    expect(env.listeners("online")).toBe(0);
    expect(env.listeners("offline")).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * Types exposés
 * ------------------------------------------------------------------ */

describe("état du réseau — contrat public", () => {
  it("expose un instantané complet", () => {
    const env = createTarget(true);
    const monitor = createNetworkMonitor({ target: env.target, probe: async () => true });
    const snapshot: NetworkSnapshot = monitor.getSnapshot();

    expect(Object.keys(snapshot).sort()).toEqual([
      "checking",
      "online",
      "outageCount",
      "pendingOperations",
      "phase",
    ]);
    monitor.dispose();
  });
});
