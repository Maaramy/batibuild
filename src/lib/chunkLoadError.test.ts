// ============================================================================
// ÉCHEC DE CHARGEMENT D'UN MODULE JAVASCRIPT — MESSAGE DE CONNEXION.
//
// Ces tests verrouillent le contrat annoncé à l'utilisateur :
//
//   · un `import()` rejeté (« Failed to fetch dynamically imported module »,
//     erreur de fragment, `ChunkLoadError`) n'affiche JAMAIS l'erreur technique ;
//   · hors ligne → message de connexion IMMÉDIAT, sans rechargement ;
//   · en ligne → UN SEUL rechargement automatique par session, puis l'écran
//     avec « Réessayer » (aucune boucle de rechargement possible) ;
//   · « Réessayer » vérifie que le réseau répond avant de recharger ;
//   · les détails techniques restent dans `console.error` ;
//   · l'interception est globale (tous les modules dynamiques de batibuild).
// ============================================================================
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CHUNK_RELOAD_FLAG,
  CONNECTION_ERROR_MESSAGE,
  type ChunkLoadErrorTarget,
  type ReloadFlagStore,
  installChunkLoadErrorHandler,
  isChunkLoadError,
  isConnectionErrorActive,
  reportChunkLoadError,
  resetConnectionErrorState,
  retryConnection,
} from "./chunkLoadError";

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

/** Le message produit par Chrome / Edge — celui de l'incident « Mes projets ». */
const CHROME_ERROR =
  "Failed to fetch dynamically imported module: https://budgetbati.freebuff.app/assets/MyProjects-8hJSlXxS.js";

/** Stockage de session simulé, sans navigateur. */
function createStore(initial: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(initial));
  const store: ReloadFlagStore & { data: Map<string, string> } = {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
  return store;
}

/** Fenêtre simulée : enregistre les auditeurs et permet de les déclencher. */
function createTarget() {
  const registry = new Map<string, Set<(event: unknown) => void>>();
  const target: ChunkLoadErrorTarget = {
    addEventListener: (type, listener) => {
      if (!registry.has(type)) registry.set(type, new Set());
      registry.get(type)!.add(listener as (event: unknown) => void);
    },
    removeEventListener: (type, listener) => {
      registry.get(type)?.delete(listener as (event: unknown) => void);
    },
  };
  return {
    target,
    dispatch(type: string, event: unknown) {
      for (const listener of [...(registry.get(type) ?? [])]) listener(event);
    },
    listeners(type: string) {
      return registry.get(type)?.size ?? 0;
    },
  };
}

/** Réseau simulé : `online` décide de `navigator.onLine`. */
function conn(config: { online: boolean; probe?: boolean } = { online: true }) {
  const reload = vi.fn();
  const state = { online: config.online };
  return {
    reload,
    isOnline: () => state.online,
    setOnline(online: boolean) {
      state.online = online;
    },
    probe: () => Promise.resolve(config.probe ?? true),
  };
}

/** Code sans ses commentaires (la prose mentionne légitimement les cas traités). */
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

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetConnectionErrorState();
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  resetConnectionErrorState();
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ *
 * Détection
 * ------------------------------------------------------------------ */

describe("isChunkLoadError", () => {
  it("reconnaît le message Chrome / Edge de l'incident", () => {
    expect(isChunkLoadError(new TypeError(CHROME_ERROR))).toBe(true);
    expect(isChunkLoadError(CHROME_ERROR)).toBe(true);
  });

  it("reconnaît les variantes Firefox, Safari et WebView Android", () => {
    expect(isChunkLoadError(new Error("error loading dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(new Error("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new Error("Unable to preload CSS for /assets/x.css"))).toBe(true);
    expect(isChunkLoadError(new TypeError("Failed to fetch"))).toBe(false);
  });

  it("reconnaît un ChunkLoadError (bundlers) et les erreurs de fragment", () => {
    const error = new Error("Loading chunk 42 failed.");
    error.name = "ChunkLoadError";
    expect(isChunkLoadError(error)).toBe(true);
    expect(isChunkLoadError({ name: "ChunkLoadError" })).toBe(true);
    expect(isChunkLoadError(new Error("Loading CSS chunk 7 failed."))).toBe(true);
  });

  it("regarde aussi la cause (`reason` / `cause`) d'une promesse rejetée", () => {
    expect(isChunkLoadError({ reason: new Error(CHROME_ERROR) })).toBe(true);

    const wrapped = new Error("wrapper") as Error & { cause?: unknown };
    wrapped.cause = new Error(CHROME_ERROR);
    expect(isChunkLoadError(wrapped)).toBe(true);
  });

  it("ignore les erreurs qui ne sont pas des chargements de module", () => {
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError(new Error("Une erreur serveur est survenue"))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(42)).toBe(false);
    expect(isChunkLoadError({})).toBe(false);
  });

  it("ne boucle pas sur une chaîne de causes cyclique", () => {
    const a = new Error("a") as Error & { cause?: unknown };
    const b = new Error("b") as Error & { cause?: unknown };
    b.cause = a;
    a.cause = b;
    expect(isChunkLoadError(a)).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * Décision : message de connexion, rechargement unique
 * ------------------------------------------------------------------ */

describe("reportChunkLoadError", () => {
  it("ignore les erreurs ordinaires (aucun impact sur l'application)", () => {
    const { reload, isOnline } = conn();
    expect(reportChunkLoadError(new Error("bug métier"), { reload, isOnline })).toBe("ignored");
    expect(reload).not.toHaveBeenCalled();
    expect(isConnectionErrorActive()).toBe(false);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("hors ligne : affiche immédiatement le message, sans rechargement", () => {
    const { reload, isOnline } = conn({ online: false });
    const store = createStore();

    expect(reportChunkLoadError(new TypeError(CHROME_ERROR), { reload, isOnline, storage: store }))
      .toBe("offline");
    expect(isConnectionErrorActive()).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    // Aucun drapeau consommé : le rechargement automatique reste disponible.
    expect(store.getItem(CHUNK_RELOAD_FLAG)).toBeNull();
  });

  it("en ligne : un seul rechargement automatique, puis l'écran de connexion", () => {
    const first = conn();
    const store = createStore();

    expect(reportChunkLoadError(new TypeError(CHROME_ERROR), { ...first, storage: store }))
      .toBe("reloaded");
    expect(first.reload).toHaveBeenCalledTimes(1);
    expect(store.getItem(CHUNK_RELOAD_FLAG)).toBe("1");
    expect(isConnectionErrorActive()).toBe(true);

    // La page recharge : le drapeau de session survit, l'état mémoire est neuf.
    resetConnectionErrorState();
    const second = conn();
    expect(reportChunkLoadError(new TypeError(CHROME_ERROR), { ...second, storage: store }))
      .toBe("shown");
    expect(second.reload).not.toHaveBeenCalled();
    expect(isConnectionErrorActive()).toBe(true);
  });

  it("sans stockage disponible : jamais de rechargement (aucune boucle possible)", () => {
    const { reload, isOnline } = conn();
    expect(reportChunkLoadError(new TypeError(CHROME_ERROR), { reload, isOnline, storage: null }))
      .toBe("shown");
    expect(reload).not.toHaveBeenCalled();
    expect(isConnectionErrorActive()).toBe(true);
  });

  it("ne tente plus jamais de recharger après un premier rechargement dans la page", () => {
    const { reload, isOnline } = conn();
    const store = createStore();

    reportChunkLoadError(new TypeError(CHROME_ERROR), { reload, isOnline, storage: store });
    reportChunkLoadError(new TypeError(CHROME_ERROR), { reload, isOnline, storage: store });
    reportChunkLoadError(new TypeError("error loading dynamically imported module"), {
      reload,
      isOnline,
      storage: store,
    });

    expect(reload).toHaveBeenCalledTimes(1);
    expect(isConnectionErrorActive()).toBe(true);
  });

  it("garde les détails techniques dans `console.error`, jamais à l'écran", () => {
    const { reload, isOnline } = conn();
    reportChunkLoadError(new TypeError(CHROME_ERROR), { reload, isOnline, storage: createStore() });

    expect(consoleError).toHaveBeenCalledTimes(1);
    const [label, detail] = consoleError.mock.calls[0] as unknown[];
    expect(String(label)).toContain("[batibuild]");
    expect(detail).toBeInstanceOf(Error);
  });
});

/* ------------------------------------------------------------------ *
 * Bouton « Réessayer »
 * ------------------------------------------------------------------ */

describe("retryConnection", () => {
  it("hors ligne : ne recharge pas et le signale", async () => {
    const { reload, isOnline } = conn({ online: false });
    await expect(retryConnection({ reload, isOnline })).resolves.toBe("offline");
    expect(reload).not.toHaveBeenCalled();
  });

  it("réseau injoignable : ne recharge pas et le signale", async () => {
    const { reload, isOnline, probe } = conn({ online: true, probe: false });
    await expect(retryConnection({ reload, isOnline, probe })).resolves.toBe("unreachable");
    expect(reload).not.toHaveBeenCalled();
  });

  it("sonde en échec (exception) : ne recharge pas", async () => {
    const { reload, isOnline } = conn();
    const probe = () => Promise.reject(new Error("network"));
    await expect(retryConnection({ reload, isOnline, probe })).resolves.toBe("unreachable");
    expect(reload).not.toHaveBeenCalled();
  });

  it("connexion revenue : recharge proprement la page", async () => {
    const { reload, isOnline, probe } = conn({ online: true, probe: true });
    await expect(retryConnection({ reload, isOnline, probe })).resolves.toBe("reloaded");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("revient en ligne après une coupure : le rechargement repart", async () => {
    const net = conn({ online: false, probe: true });
    await expect(retryConnection({ reload: net.reload, isOnline: net.isOnline, probe: net.probe }))
      .resolves.toBe("offline");

    net.setOnline(true);
    await expect(retryConnection({ reload: net.reload, isOnline: net.isOnline, probe: net.probe }))
      .resolves.toBe("reloaded");
    expect(net.reload).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------ *
 * Interception globale
 * ------------------------------------------------------------------ */

describe("installChunkLoadErrorHandler", () => {
  it("intercepte un `import()` rejeté non géré et affiche l'écran", () => {
    const { target, dispatch } = createTarget();
    const store = createStore();
    const dispose = installChunkLoadErrorHandler({
      target,
      storage: store,
      isOnline: () => false,
      reload: () => {},
    });

    dispatch("unhandledrejection", { reason: new TypeError(CHROME_ERROR) });

    expect(isConnectionErrorActive()).toBe(true);
    dispose();
  });

  it("intercepte aussi les erreurs de script de module (phase de capture)", () => {
    const { target, dispatch } = createTarget();
    const dispose = installChunkLoadErrorHandler({
      target,
      storage: createStore(),
      isOnline: () => false,
      reload: () => {},
    });

    dispatch("error", { message: "Importing a module script failed." });

    expect(isConnectionErrorActive()).toBe(true);
    dispose();
  });

  it("laisse totalement passer les erreurs non liées aux modules", () => {
    const { target, dispatch } = createTarget();
    const reload = vi.fn();
    const dispose = installChunkLoadErrorHandler({
      target,
      storage: createStore(),
      isOnline: () => true,
      reload,
    });

    dispatch("unhandledrejection", { reason: new Error("erreur métier") });
    dispatch("error", { message: "Cannot read properties of null" });

    expect(isConnectionErrorActive()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    dispose();
  });

  it("le désabonnement retire les auditeurs", () => {
    const { target, listeners, dispatch } = createTarget();
    const dispose = installChunkLoadErrorHandler({
      target,
      storage: createStore(),
      isOnline: () => false,
      reload: () => {},
    });

    expect(listeners("unhandledrejection")).toBe(1);
    expect(listeners("error")).toBe(1);

    dispose();

    expect(listeners("unhandledrejection")).toBe(0);
    expect(listeners("error")).toBe(0);
    dispatch("unhandledrejection", { reason: new TypeError(CHROME_ERROR) });
    expect(isConnectionErrorActive()).toBe(false);
  });

  it("sans objet `window` (tests, rendu hors navigateur) : inactif", () => {
    expect(installChunkLoadErrorHandler()).toBeInstanceOf(Function);
    expect(isConnectionErrorActive()).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * Interface : aucun détail technique ne peut être affiché
 * ------------------------------------------------------------------ */

describe("interface utilisateur", () => {
  it("le message demandé est exactement celui attendu", () => {
    expect(CONNECTION_ERROR_MESSAGE).toBe("Erreur de connexion, vérifier votre connexion internet");
  });

  it("l'écran de connexion n'expose ni URL de fichier ni trace technique", () => {
    const code = stripComments(
      readFileSync(join(__dirname, "..", "components", "ConnectionErrorScreen.tsx"), "utf8"),
    );

    expect(code).toContain("connectionErrorTitle");
    expect(code).toContain("CONNECTION_ERROR_MESSAGE");
    expect(code).not.toContain("Failed to fetch");
    expect(code).not.toContain("dynamically imported module");
    expect(code).not.toContain("Preview runtime error");
    expect(code).not.toContain("<pre");
    expect(code).not.toContain(".stack");
  });

  it("l'entrée de l'application n'affiche plus l'erreur technique ni la pile", () => {
    const code = stripComments(readFileSync(join(__dirname, "..", "main.tsx"), "utf8"));

    expect(code).not.toContain("Preview runtime error");
    expect(code).not.toContain("WebContainer preview");
    expect(code).not.toContain("<pre");
    expect(code).toContain("installChunkLoadErrorHandler");
    expect(code).toContain("ConnectionErrorScreen");
  });

  it("l'interception globale est installée avant le premier rendu", () => {
    const code = stripComments(readFileSync(join(__dirname, "..", "main.tsx"), "utf8"));

    const install = code.indexOf("installChunkLoadErrorHandler();");
    const render = code.indexOf("createRoot(");
    expect(install).toBeGreaterThanOrEqual(0);
    expect(render).toBeGreaterThan(install);
  });

  it("le message français affiché est exactement celui demandé (fr / en / ar)", () => {
    const read = (locale: string) =>
      JSON.parse(
        readFileSync(join(__dirname, "..", "i18n", "locales", locale, "common.json"), "utf8"),
      ).network as Record<string, string>;

    const fr = read("fr");
    expect(fr.connectionErrorTitle).toBe(CONNECTION_ERROR_MESSAGE);
    // Le bouton demandé, et son libellé pendant la vérification de connexion.
    expect(fr.retry).toBe("Réessayer");

    for (const locale of ["en", "ar"]) {
      const messages = read(locale);
      expect(messages.connectionErrorTitle).toBeTruthy();
      expect(messages.connectionErrorOfflineDetail).toBeTruthy();
      expect(messages.connectionErrorDetail).toBeTruthy();
      expect(messages.connectionErrorStillOffline).toBeTruthy();
    }
  });
});
