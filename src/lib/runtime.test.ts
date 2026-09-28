// ============================================================================
// Détection du RUNTIME — navigateur Web vs application Android.
//
// Ces tests verrouillent la séparation Web / Android : l'application Android de
// batibuild ne doit JAMAIS activer le système de cookies Web ni le cache
// avancé, tandis qu'un navigateur (même sur Android) doit les conserver.
// ============================================================================
import { describe, expect, it } from "vitest";

import {
  ANDROID_APP_MARKER,
  ANDROID_APP_UA_TOKEN,
  detectRuntime,
  hasAndroidAppMarker,
  hasAndroidAppUserAgent,
  hasNativeBridge,
  isSecureWebOrigin,
  canUseWebCache,
  shouldUseWebCookies,
} from "./runtime";

const CHROME_DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const CHROME_ANDROID_BROWSER_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36";
const ANDROID_APP_UA = `${CHROME_ANDROID_BROWSER_UA} ${ANDROID_APP_UA_TOKEN}/1.3.2`;

const HTTPS = { protocol: "https:", hostname: "budgetbati.freebuff.app" };
const HTTP_LOCAL = { protocol: "http:", hostname: "localhost" };
const HTTP_LAN = { protocol: "http:", hostname: "192.168.1.20" };

const browserWindow = (userAgent: string) => ({ navigator: { userAgent } });
const androidAppWindow = (userAgent = ANDROID_APP_UA) => ({
  ReactNativeWebView: { postMessage: () => {} },
  navigator: { userAgent },
});

describe("runtime — signaux de détection", () => {
  it("détecte le pont react-native-webview (objet ou fonction)", () => {
    expect(hasNativeBridge({ ReactNativeWebView: { postMessage: () => {} } })).toBe(true);
    expect(hasNativeBridge({ ReactNativeWebView: () => {} })).toBe(true);
    expect(hasNativeBridge({ ReactNativeWebView: null })).toBe(false);
    expect(hasNativeBridge({})).toBe(false);
    expect(hasNativeBridge(undefined)).toBe(false);
    expect(hasNativeBridge("window")).toBe(false);
  });

  it("détecte le marqueur explicite de l'application Android", () => {
    expect(hasAndroidAppMarker({ [ANDROID_APP_MARKER]: true })).toBe(true);
    expect(hasAndroidAppMarker({ [ANDROID_APP_MARKER]: "1" })).toBe(true);
    expect(hasAndroidAppMarker({ [ANDROID_APP_MARKER]: false })).toBe(false);
    expect(hasAndroidAppMarker({})).toBe(false);
  });

  it("détecte le jeton du User-Agent de l'application", () => {
    expect(hasAndroidAppUserAgent(ANDROID_APP_UA)).toBe(true);
    expect(hasAndroidAppUserAgent(CHROME_ANDROID_BROWSER_UA)).toBe(false);
    expect(hasAndroidAppUserAgent(undefined)).toBe(false);
  });
});

describe("runtime — classification", () => {
  it("classe l'application Android comme ANDROID_APP", () => {
    expect(detectRuntime(androidAppWindow())).toBe("ANDROID_APP");
    expect(detectRuntime({ [ANDROID_APP_MARKER]: true })).toBe("ANDROID_APP");
    expect(detectRuntime(browserWindow(ANDROID_APP_UA))).toBe("ANDROID_APP");
  });

  it("classe un navigateur classique comme WEB_BROWSER", () => {
    expect(detectRuntime(browserWindow(CHROME_DESKTOP_UA))).toBe("WEB_BROWSER");
    expect(detectRuntime(undefined)).toBe("WEB_BROWSER");
    expect(detectRuntime({})).toBe("WEB_BROWSER");
  });

  it("conserve le système Web pour Chrome Android — un navigateur n'est pas l'application", () => {
    // Détection volontairement NON basée sur la taille d'écran ni sur « Android »
    // dans le User-Agent : seul le contexte de l'application est exclu.
    expect(detectRuntime(browserWindow(CHROME_ANDROID_BROWSER_UA))).toBe("WEB_BROWSER");
    expect(shouldUseWebCookies(browserWindow(CHROME_ANDROID_BROWSER_UA), HTTPS)).toBe(true);
  });
});

describe("runtime — sécurité de l'origine", () => {
  it("accepte HTTPS et la boucle locale uniquement", () => {
    expect(isSecureWebOrigin(HTTPS)).toBe(true);
    expect(isSecureWebOrigin(HTTP_LOCAL)).toBe(true);
    expect(isSecureWebOrigin({ protocol: "http:", hostname: "127.0.0.1" })).toBe(true);
    expect(isSecureWebOrigin(HTTP_LAN)).toBe(false);
    expect(isSecureWebOrigin({ protocol: "http:", hostname: "budgetbati.freebuff.app" })).toBe(false);
    expect(isSecureWebOrigin(undefined)).toBe(false);
  });

  it("refuse les cookies Web dans l'application Android", () => {
    expect(shouldUseWebCookies(androidAppWindow(), HTTPS)).toBe(false);
    expect(shouldUseWebCookies({ [ANDROID_APP_MARKER]: true }, HTTPS)).toBe(false);
    expect(shouldUseWebCookies(browserWindow(ANDROID_APP_UA), HTTPS)).toBe(false);
  });

  it("active les cookies Web dans un navigateur sur origine sécurisée", () => {
    expect(shouldUseWebCookies(browserWindow(CHROME_DESKTOP_UA), HTTPS)).toBe(true);
    expect(shouldUseWebCookies(browserWindow(CHROME_DESKTOP_UA), HTTP_LOCAL)).toBe(true);
    expect(shouldUseWebCookies(browserWindow(CHROME_DESKTOP_UA), HTTP_LAN)).toBe(false);
  });
});

describe("runtime — cache avancé", () => {
  it("exige Web + origine sécurisée + API Service Worker", () => {
    expect(canUseWebCache(browserWindow(CHROME_DESKTOP_UA), HTTPS)).toBe(false);
    expect(
      canUseWebCache({ navigator: { userAgent: CHROME_DESKTOP_UA }, serviceWorker: {} }, HTTPS),
    ).toBe(true);
    expect(canUseWebCache(androidAppWindow(), HTTPS)).toBe(false);
    expect(
      canUseWebCache({ navigator: { userAgent: CHROME_DESKTOP_UA }, serviceWorker: {} }, HTTP_LAN),
    ).toBe(false);
  });
});
