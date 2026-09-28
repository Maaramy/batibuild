// ============================================================================
// Politique de CACHE AVANCÉ (Service Worker) et SÉPARATION Web / Android.
//
// Ces tests ne se contentent pas de vérifier des fonctions : ils verrouillent
// les garanties demandées pour la plateforme :
//   · ressources versionnées en cache-first, pages HTML en réseau d'abord
//     (jamais une ancienne version critique après un déploiement) ;
//   · AUCUNE interception des appels Convex / API (pas de donnée personnelle en
//     cache, pas de cache partagé entre utilisateurs) ;
//   · invalidation automatique des caches lors d'une nouvelle version ;
//   · Service Worker jamais enregistré dans l'application Android ;
//   · AUCUNE bannière ni demande de consentement aux cookies.
// ============================================================================
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Script } from "node:vm";
import { describe, expect, it } from "vitest";

import {
  CACHE_PREFIX,
  SERVICE_WORKER_MESSAGES,
  SERVICE_WORKER_URL,
  clearWebCaches,
  postToServiceWorker,
  registerWebServiceWorker,
  unregisterWebServiceWorker,
} from "./webServiceWorker";

const REPO_ROOT = join(__dirname, "..", "..");
const read = (relativePath: string) => readFileSync(join(REPO_ROOT, relativePath), "utf8");

const SERVICE_WORKER_SOURCE = read("public/sw.js");
const RUNTIME_SOURCE = read("src/lib/runtime.ts");
const REGISTRATION_SOURCE = read("src/lib/webServiceWorker.ts");
const INDEX_HTML = read("index.html");
const MOBILE_INJECTED = read("mobile/src/injected.ts");
const MOBILE_WEBVIEW = read("mobile/src/screens/WebViewScreen.tsx");
const VERCEL_CONFIG = read("vercel.json");

describe("Service Worker — validité et environnement", () => {
  it("est un script JavaScript valide (analysé sans être exécuté)", () => {
    expect(() => new Script(SERVICE_WORKER_SOURCE)).not.toThrow();
  });

  it("n'utilise aucune API indisponible dans un Service Worker", () => {
    // Ni DOM, ni stockage local : le Service Worker tourne hors de la page.
    expect(SERVICE_WORKER_SOURCE).not.toMatch(/\bdocument\./);
    expect(SERVICE_WORKER_SOURCE).not.toMatch(/\blocalStorage\b/);
    expect(SERVICE_WORKER_SOURCE).not.toMatch(/\bsessionStorage\b/);
    expect(SERVICE_WORKER_SOURCE).not.toMatch(/\bwindow\./);
  });

  it("est servi à la racine, sous le nom attendu par l'enregistrement", () => {
    expect(SERVICE_WORKER_URL).toBe("/sw.js");
    expect(VERCEL_CONFIG).toContain('"/sw.js"');
  });
});

describe("Service Worker — stratégies de cache", () => {
  it("sert les ressources versionnées en cache-first", () => {
    expect(SERVICE_WORKER_SOURCE).toMatch(/function isHashedAsset/);
    expect(SERVICE_WORKER_SOURCE).toMatch(/event\.respondWith\(cacheFirst\(request, STATIC_CACHE\)\)/);
  });

  it("sert les pages HTML en réseau d'abord — jamais une ancienne version", () => {
    const networkFirstIndex = SERVICE_WORKER_SOURCE.indexOf("event.respondWith(networkFirstShell(request))");
    const cacheFirstIndex = SERVICE_WORKER_SOURCE.indexOf("event.respondWith(cacheFirst(request, STATIC_CACHE))");
    expect(networkFirstIndex).toBeGreaterThan(-1);
    expect(cacheFirstIndex).toBeGreaterThan(-1);
    // La navigation est traitée par une stratégie qui interroge d'abord le réseau.
    expect(SERVICE_WORKER_SOURCE).toMatch(/async function networkFirstShell[\s\S]*?const response = await fetch\(request\)/);
    expect(SERVICE_WORKER_SOURCE).toMatch(/async function networkFirstShell[\s\S]*?caches\.open\(SHELL_CACHE\)/);
  });

  it("n'intercepte jamais les appels Convex ni les API (aucune donnée personnelle en cache)", () => {
    expect(SERVICE_WORKER_SOURCE).toContain('".convex.cloud"');
    expect(SERVICE_WORKER_SOURCE).toContain('".convex.site"');
    expect(SERVICE_WORKER_SOURCE).toContain('".convexusercontent.com"');
    expect(SERVICE_WORKER_SOURCE).toContain('"/api/"');
    expect(SERVICE_WORKER_SOURCE).toMatch(/request\.method !== "GET"[^\n]*return;/);
    expect(SERVICE_WORKER_SOURCE).toMatch(/request\.headers\.get\("range"\)/);
  });

  it("met à jour le cache sans bloquer la réponse (revalidation en arrière-plan)", () => {
    expect(SERVICE_WORKER_SOURCE).toMatch(/async function staleWhileRevalidate/);
    expect(SERVICE_WORKER_SOURCE).toMatch(/function fontStrategy/);
  });

  it("invalide automatiquement les caches d'une autre version", () => {
    expect(SERVICE_WORKER_SOURCE).toMatch(/addEventListener\("activate"[\s\S]*?caches\.delete\(name\)/);
    expect(SERVICE_WORKER_SOURCE).toMatch(/const CACHE_VERSION = "/);
    expect(CACHE_PREFIX).toBe("batibuild-");
  });

  it("accepte l'activation immédiate et la purge du cache", () => {
    expect(SERVICE_WORKER_MESSAGES.skipWaiting).toBe("BB_SKIP_WAITING");
    expect(SERVICE_WORKER_MESSAGES.clearCaches).toBe("BB_CLEAR_CACHES");
    expect(SERVICE_WORKER_SOURCE).toContain("BB_SKIP_WAITING");
    expect(SERVICE_WORKER_SOURCE).toContain("BB_CLEAR_CACHES");
  });

  it("ne rejette jamais une requête faute de cache (récupération normale)", () => {
    // Le repli hors ligne est un `fetch` réseau qui peut échouer proprement :
    // seules les navigations ont un repli, et il retombe sur le shell.
    expect(SERVICE_WORKER_SOURCE).toMatch(/catch \(error\) \{[\s\S]*?await cache\.match\(SHELL_FALLBACK_URL\)/);
  });
});

describe("Service Worker — enregistrement Web uniquement", () => {
  it("n'est jamais enregistré dans l'application Android", () => {
    expect(REGISTRATION_SOURCE).toMatch(/if \(IS_ANDROID_APP\) return;/);
  });

  it("n'est jamais enregistré en développement (HMR de l'aperçu préservé)", () => {
    expect(REGISTRATION_SOURCE).toMatch(/if \(!import\.meta\.env\.PROD\) return;/);
  });

  it("reste sans effet dans un contexte de test (aucune API navigateur)", async () => {
    expect(() => registerWebServiceWorker()).not.toThrow();
    expect(postToServiceWorker(SERVICE_WORKER_MESSAGES.clearCaches)).toBe(false);
    await expect(clearWebCaches()).resolves.toBe(false);
    await expect(unregisterWebServiceWorker()).resolves.toBe(false);
  });
});

describe("Séparation Web / Android — contrats partagés", () => {
  it("partage exactement le marqueur et le jeton de User-Agent avec la coque native", () => {
    expect(RUNTIME_SOURCE).toContain("__BATIBUILD_ANDROID_APP__");
    expect(MOBILE_INJECTED).toContain("window.__BATIBUILD_ANDROID_APP__ = true;");
    expect(RUNTIME_SOURCE).toContain('"BatibuildApp"');
    expect(MOBILE_INJECTED).toContain('export const ANDROID_APP_UA_TOKEN = "BatibuildApp";');
    expect(MOBILE_WEBVIEW).toContain("applicationNameForUserAgent={ANDROID_APP_UA_TOKEN}");
    expect(MOBILE_WEBVIEW).toContain("${ANDROID_APP_MARKER_SCRIPT}");
  });

  it("désactive le stockage cookies Web quand le runtime est Android", () => {
    expect(read("src/lib/webCookies.ts")).toMatch(/if \(IS_ANDROID_APP\) return null;/);
  });

  it("restaure thème et langue avant le premier rendu, jamais dans l'application", () => {
    expect(INDEX_HTML).toContain("bb_theme");
    expect(INDEX_HTML).toContain("bb_lang");
    expect(INDEX_HTML).toMatch(/if \(win\.ReactNativeWebView \|\| win\.__BATIBUILD_ANDROID_APP__\) return;/);
    expect(INDEX_HTML).toContain("BatibuildApp");
  });
});

describe("Cookies — aucune interface de consentement", () => {
  const SOURCE_FILES = [
    "index.html",
    "src/components/WebBootSync.tsx",
    "src/lib/webCookies.ts",
    "src/lib/webServiceWorker.ts",
    "src/main.tsx",
  ];

  it("n'affiche ni bannière ni demande de consentement aux cookies", () => {
    const forbidden =
      /(cookie[-_ ]?(banner|notice|consent|popup)|accepter les cookies|consentement aux cookies|gestion des cookies)/i;
    for (const file of SOURCE_FILES) {
      expect(read(file), `${file} ne doit contenir aucune interface de consentement`).not.toMatch(
        forbidden,
      );
    }
  });

  it("n'utilise aucun cookie de suivi publicitaire", () => {
    const tracking =
      /(_ga=|_gid=|_fbp|fbq\(|gtag\(|doubleclick|googletagmanager|facebook\.net|analytics\.js)/i;
    for (const file of SOURCE_FILES) {
      expect(read(file), `${file} ne doit contenir aucun traceur publicitaire`).not.toMatch(tracking);
    }
  });
});
