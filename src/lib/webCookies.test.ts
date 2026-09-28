// ============================================================================
// Couche COOKIES Web — sérialisation, garde-fous et préférences de démarrage.
//
// Aucune donnée sensible (mot de passe, jeton, JWT, secret…) ne doit JAMAIS
// pouvoir être écrite dans un cookie : ces tests échouent si ce verrou saute.
// ============================================================================
import { describe, expect, it, vi } from "vitest";

import {
  COOKIE_MAX_AGE,
  COOKIE_NAMES,
  COOKIE_PREFIX,
  COOKIE_VALUE_MAX_LENGTH,
  UnsafeCookieError,
  assertCookieSafe,
  clearSessionHint,
  isBatibuildCookieName,
  isLanguage,
  isPathHint,
  isRoleHint,
  isThemeSetting,
  listBatibuildCookies,
  parseCookieHeader,
  persistBootHints,
  persistLanguage,
  persistSessionHint,
  persistTheme,
  purgeBatibuildCookies,
  readBootHints,
  readCookie,
  readStoredLanguage,
  readStoredTheme,
  removeCookieFromHeader,
  serializeCookie,
  serializeCookieRemoval,
  upsertCookieHeader,
  writeCookie,
  type CookieStore,
} from "./webCookies";

/**
 * Magasin de cookies en mémoire, avec la sémantique de `document.cookie`
 * (Max-Age=0 supprime, sinon remplace). Permet de tester sans navigateur.
 */
function memoryStore(initial = ""): CookieStore & { header: () => string } {
  let header = initial;
  return {
    header: () => header,
    read: () => header,
    write: (cookie: string) => {
      const pair = cookie.split(";")[0];
      const index = pair.indexOf("=");
      const name = pair.slice(0, index);
      const value = decodeURIComponent(pair.slice(index + 1));
      const maxAge = /Max-Age=(\d+)/.exec(cookie);
      const removing = !!maxAge && Number(maxAge[1]) === 0;
      header = removing
        ? removeCookieFromHeader(header, name)
        : upsertCookieHeader(header, name, value);
    },
  };
}

describe("cookies — sérialisation", () => {
  it("produit un cookie SameSite=Lax avec chemin et durée de vie", () => {
    expect(
      serializeCookie(COOKIE_NAMES.lang, "fr", {
        maxAgeSeconds: COOKIE_MAX_AGE.preferences,
        secure: true,
      }),
    ).toBe("bb_lang=fr; Path=/; SameSite=Lax; Max-Age=31536000; Secure");
  });

  it("n'ajoute « Secure » que sur une origine sécurisée", () => {
    expect(serializeCookie(COOKIE_NAMES.theme, "dark")).toBe("bb_theme=dark; Path=/; SameSite=Lax");
    expect(serializeCookie(COOKIE_NAMES.theme, "dark", { secure: true })).toContain("Secure");
  });

  it("supprime un cookie avec Max-Age=0", () => {
    expect(serializeCookieRemoval(COOKIE_NAMES.session)).toBe(
      "bb_session=; Path=/; SameSite=Lax; Max-Age=0",
    );
  });

  it("encode les valeurs", () => {
    expect(serializeCookie(COOKIE_NAMES.home, "/dashboard")).toContain("bb_home=%2Fdashboard");
  });

  it("analyse un en-tête Cookie (valeurs encodées comprises)", () => {
    expect(parseCookieHeader("bb_lang=fr; bb_home=%2Fdashboard; autre=1")).toEqual({
      bb_lang: "fr",
      bb_home: "/dashboard",
      autre: "1",
    });
    expect(parseCookieHeader("")).toEqual({});
    expect(parseCookieHeader(null)).toEqual({});
  });

  it("ajoute, remplace et retire un couple dans un en-tête", () => {
    expect(upsertCookieHeader("bb_lang=fr", COOKIE_NAMES.lang, "ar")).toBe("bb_lang=ar");
    expect(upsertCookieHeader("bb_lang=fr; bb_theme=dark", COOKIE_NAMES.lang, "en")).toBe(
      "bb_lang=en; bb_theme=dark",
    );
    expect(removeCookieFromHeader("bb_lang=fr; bb_theme=dark", COOKIE_NAMES.lang)).toBe(
      "bb_theme=dark",
    );
  });
});

describe("cookies — garde-fous de sécurité", () => {
  it("n'accepte que des noms préfixés « bb_ »", () => {
    expect(isBatibuildCookieName(COOKIE_NAMES.lang)).toBe(true);
    expect(isBatibuildCookieName("sessionid")).toBe(false);
    expect(isBatibuildCookieName("bb_lang bis")).toBe(false);
    expect(COOKIE_PREFIX).toBe("bb_");
    expect(() => assertCookieSafe("sessionid", "abc")).toThrow(UnsafeCookieError);
    expect(() => serializeCookie("analytics_id", "abc")).toThrow(UnsafeCookieError);
  });

  it("refuse les noms réservés aux données sensibles", () => {
    for (const name of ["bb_token", "bb_session_id", "bb_password", "bb_api_key", "bb_jwt"]) {
      expect(() => assertCookieSafe(name, "valeur")).toThrow(UnsafeCookieError);
    }
  });

  it("refuse les valeurs sensibles (JWT, Bearer, secret, carte bancaire)", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N";
    expect(() => assertCookieSafe(COOKIE_NAMES.session, jwt)).toThrow(UnsafeCookieError);
    expect(() => assertCookieSafe(COOKIE_NAMES.session, "Bearer abc123")).toThrow(UnsafeCookieError);
    expect(() => assertCookieSafe(COOKIE_NAMES.session, "mot-de-passe: xyz")).toThrow(
      UnsafeCookieError,
    );
    expect(() => assertCookieSafe(COOKIE_NAMES.session, "4111111111111111")).toThrow(
      UnsafeCookieError,
    );
    expect(() => assertCookieSafe(COOKIE_NAMES.session, "A".repeat(COOKIE_VALUE_MAX_LENGTH + 1))).toThrow(
      UnsafeCookieError,
    );
  });

  it("accepte les valeurs prévues par la plateforme", () => {
    expect(() => assertCookieSafe(COOKIE_NAMES.lang, "fr")).not.toThrow();
    expect(() => assertCookieSafe(COOKIE_NAMES.theme, "system")).not.toThrow();
    expect(() => assertCookieSafe(COOKIE_NAMES.session, "1")).not.toThrow();
    expect(() => assertCookieSafe(COOKIE_NAMES.role, "supplier")).not.toThrow();
    expect(() => assertCookieSafe(COOKIE_NAMES.home, "/dashboard/expert")).not.toThrow();
  });

  it("n'écrit rien quand une valeur est refusée (et ne lève pas dans l'interface)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = memoryStore();
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N";
    expect(writeCookie(COOKIE_NAMES.session, jwt, 60, store)).toBe(false);
    expect(store.header()).toBe("");
    warn.mockRestore();
  });

  it("considère chaque écriture comme non sensible", () => {
    const store = memoryStore();
    persistBootHints(
      { lang: "ar", theme: "dark", authenticated: true, role: "supplier", home: "/dashboard/supplier" },
      store,
    );
    expect(listBatibuildCookies(store).sort()).toEqual(
      ["bb_home", "bb_lang", "bb_role", "bb_session", "bb_theme"].sort(),
    );
    expect(store.header()).not.toMatch(/eyJ|Bearer|password/i);
  });
});

describe("cookies — magasin navigateur indisponible", () => {
  it("renvoie des valeurs neutres sans stockage (application Android, tests)", () => {
    const store = null;
    expect(readCookie(COOKIE_NAMES.lang, store)).toBeNull();
    expect(writeCookie(COOKIE_NAMES.lang, "fr", COOKIE_MAX_AGE.preferences, store)).toBe(false);
    expect(readBootHints(store)).toEqual({});
    expect(persistBootHints({ lang: "fr" }, store)).toBe(false);
    expect(persistSessionHint({ role: "client" }, store)).toBe(false);
    expect(clearSessionHint(store)).toBe(false);
    expect(purgeBatibuildCookies(store)).toBe(0);
    expect(listBatibuildCookies(store)).toEqual([]);
  });
});

describe("cookies — préférences de démarrage", () => {
  it("restaure langue, thème et état de connexion", () => {
    const store = memoryStore();
    persistBootHints(
      { lang: "en", theme: "light", authenticated: true, role: "expert", home: "/dashboard/expert" },
      store,
    );
    expect(readBootHints(store)).toEqual({
      lang: "en",
      theme: "light",
      authenticated: true,
      role: "expert",
      home: "/dashboard/expert",
    });
  });

  it("ignore les valeurs invalides sans écrire de cookie", () => {
    const store = memoryStore();
    persistBootHints(
      {
        lang: "de" as never,
        theme: "neon" as never,
        role: "ADMIN !" as never,
        home: "https://exemple.tn" as never,
      },
      store,
    );
    expect(readBootHints(store)).toEqual({});
    expect(store.header()).toBe("");
  });

  it("valide les types aux limites (rôle, chemin)", () => {
    expect(isRoleHint("client")).toBe(true);
    expect(isRoleHint("client_pro")).toBe(true);
    expect(isRoleHint("a")).toBe(false);
    expect(isRoleHint("Client")).toBe(false);
    expect(isPathHint("/dashboard")).toBe(true);
    expect(isPathHint("//evil.tn")).toBe(false);
    expect(isPathHint("/dashboard?x=1")).toBe(false);
    expect(isPathHint("http://evil.tn")).toBe(false);
  });

  it("mémorise langue et thème avec la durée de vie des préférences", () => {
    const store = memoryStore();
    expect(persistLanguage("ar", store)).toBe(true);
    expect(persistTheme("dark", store)).toBe(true);
    expect(persistLanguage("de", store)).toBe(false);
    expect(persistTheme("neon", store)).toBe(false);
    expect(readCookie(COOKIE_NAMES.lang, store)).toBe("ar");
    expect(readCookie(COOKIE_NAMES.theme, store)).toBe("dark");
  });

  it("n'écrit pas deux fois la même préférence (aucune écriture répétitive)", () => {
    const store = memoryStore();
    expect(persistLanguage("fr", store)).toBe(true);
    expect(persistLanguage("fr", store)).toBe(false);
    expect(persistTheme("system", store)).toBe(true);
    expect(persistTheme("system", store)).toBe(false);
    expect(listBatibuildCookies(store).sort()).toEqual(["bb_lang", "bb_theme"]);
  });

  it("mémorise puis efface l'indice de session (aucune donnée de session conservée)", () => {
    const store = memoryStore();
    persistSessionHint({ role: "supplier", home: "/dashboard/supplier" }, store);
    expect(readBootHints(store).authenticated).toBe(true);

    clearSessionHint(store);
    expect(readBootHints(store)).toEqual({});
    expect(listBatibuildCookies(store)).toEqual([]);
  });

  it("retire les indices devenus invalides (rôle ou dashboard inconnus)", () => {
    const store = memoryStore(
      "bb_session=1; bb_role=supplier; bb_home=%2Fdashboard%2Fsupplier",
    );
    persistSessionHint({ role: "ancien-role", home: null }, store);
    const hints = readBootHints(store);
    expect(hints.authenticated).toBe(true);
    expect(hints.role).toBeUndefined();
    expect(hints.home).toBeUndefined();
  });

  it("purge tous les cookies batibuild", () => {
    const store = memoryStore("bb_lang=fr; bb_theme=dark; bb_session=1; autre=1");
    expect(purgeBatibuildCookies(store)).toBe(3);
    expect(store.header()).toBe("autre=1");
  });

  it("valide les valeurs de langue et de thème", () => {
    expect(isLanguage("fr")).toBe(true);
    expect(isLanguage("en")).toBe(true);
    expect(isLanguage("ar")).toBe(true);
    expect(isLanguage("de")).toBe(false);
    expect(isThemeSetting("system")).toBe(true);
    expect(isThemeSetting("auto")).toBe(false);
  });

  it("relit les préférences locales (thème next-themes, langue i18next)", () => {
    const storage = (values: Record<string, string>) => ({
      getItem: (key: string) => values[key] ?? null,
    });
    expect(readStoredTheme(storage({ "budgetbati-theme": "dark" }))).toBe("dark");
    expect(readStoredTheme(storage({ "budgetbati-theme": "neon" }))).toBeNull();
    expect(readStoredLanguage(storage({ "budgetbati-lang": "ar" }))).toBe("ar");
    expect(readStoredLanguage(storage({}))).toBeNull();
    expect(readStoredTheme(null)).toBeNull();
  });
});
