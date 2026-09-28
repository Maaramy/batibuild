// ============================================================================
// COOKIES — VERSION WEB UNIQUEMENT.
//
// Couche unique et volontairement minimale des cookies batibuild. Elle ne
// mémorise QUE des informations non sensibles, utiles au démarrage rapide :
//
//   bb_lang     langue de l'interface (fr | en | ar)
//   bb_theme    thème (light | dark | system), appliqué AVANT le premier rendu
//   bb_session  état de connexion (« 1 » quand une session est active)
//   bb_role     type de profil (client | supplier | expert) — indice seulement
//   bb_home     tableau de bord correspondant, pour précharger le bon module
//
// GARANTIES DE SÉCURITÉ (vérifiées par les tests) :
//   · préfixe obligatoire `bb_` : cette couche ne peut toucher à AUCUN autre
//     cookie (ni les cookies techniques de l'hébergeur, ni ceux de tiers) ;
//   · liste de refus stricte sur le NOM et la VALEUR : mot de passe, jeton,
//     JWT, secret, clé d'API, OTP, IBAN, numéro de carte… l'écriture est
//     refusée et l'erreur remonte explicitement ;
//   · les valeurs sont encodées (`encodeURIComponent`) et bornées en longueur ;
//   · les cookies sont posés en `SameSite=Lax` + `Secure` (HTTPS) et leur durée
//     de vie est explicite ;
//   · la session RÉELLE n'est jamais dans un cookie : elle reste gérée par
//     Convex Auth (jeton côté client, rafraîchissement serveur). Le cookie
//     `bb_session` n'est qu'un indice d'affichage, il ne donne aucun accès.
//
// EXCLUSION ANDROID : dans l'application Android (WebView), `browserCookieStore()`
// renvoie `null` — donc AUCUNE lecture ni écriture de cookie, et aucune
// interface de consentement (il n'en existe aucune dans batibuild : les cookies
// utilisés sont strictement nécessaires au fonctionnement).
// ============================================================================
import { IS_ANDROID_APP, shouldUseWebCookies } from "./runtime";

/** Préfixe obligatoire de tous les cookies posés par la plateforme. */
export const COOKIE_PREFIX = "bb_";

/** Noms des cookies batibuild. */
export const COOKIE_NAMES = {
  lang: "bb_lang",
  theme: "bb_theme",
  session: "bb_session",
  role: "bb_role",
  home: "bb_home",
} as const;

export type CookieName = (typeof COOKIE_NAMES)[keyof typeof COOKIE_NAMES];

/** Durées de vie (secondes). */
export const COOKIE_MAX_AGE = {
  /** Préférences non sensibles (langue, thème) : 1 an. */
  preferences: 60 * 60 * 24 * 365,
  /** Indice de session (état de connexion) : 30 jours. */
  sessionHint: 60 * 60 * 24 * 30,
} as const;

/** Clés de `localStorage` déjà utilisées par la plateforme (source de vérité). */
export const THEME_STORAGE_KEY = "budgetbati-theme";
export const LANGUAGE_STORAGE_KEY = "budgetbati-lang";

export type Language = "fr" | "en" | "ar";
export type ThemeSetting = "light" | "dark" | "system";

export const SUPPORTED_COOKIE_LANGUAGES: readonly Language[] = ["fr", "en", "ar"];
export const SUPPORTED_THEMES: readonly ThemeSetting[] = ["light", "dark", "system"];

/** Valeur maximale d'un cookie (les cookies sont publics : on borne tout). */
export const COOKIE_VALUE_MAX_LENGTH = 256;

/* ------------------------------------------------------------------ *
 * Garde-fous : rien de sensible dans un cookie
 * ------------------------------------------------------------------ */

/**
 * Noms interdits : un cookie peut être lu par du JavaScript (et envoyé à
 * chaque requête) — jamais de session, jeton ou secret ici.
 */
const FORBIDDEN_NAME_PATTERN =
  /(password|passwd|pwd|mot[-_ ]?de[-_ ]?passe|secret|token|jwt|bearer|authoriz|credential|api[_-]?key|apikey|private|otp|iban|cvv|card|sessionid|session[_-]?id|refresh)/i;

/**
 * Valeurs interdites : JWT (`eyJ…`), en-tête `Bearer`, secret, numéro de carte
 * (13 à 19 chiffres), longue chaîne base64 « opaque » (jeton).
 */
const FORBIDDEN_VALUE_PATTERNS: readonly RegExp[] = [
  /eyJ[A-Za-z0-9_-]*\./,
  /bearer\s/i,
  /password|passwd|pwd|mot[-_ ]?de[-_ ]?passe|secret|api[_-]?key|token/i,
  /\b\d{13,19}\b/,
  /^[A-Za-z0-9+/_-]{60,}={0,2}$/,
];

/** Erreur explicite quand une écriture de cookie est refusée. */
export class UnsafeCookieError extends Error {
  readonly cookieName: string;
  constructor(cookieName: string, reason: string) {
    super(`Cookie refusé (${cookieName}) : ${reason}`);
    this.name = "UnsafeCookieError";
    this.cookieName = cookieName;
  }
}

/** Le nom est-il un cookie batibuild ? (préfixe `bb_`, format valide) */
export function isBatibuildCookieName(name: string): boolean {
  return typeof name === "string" && /^bb_[a-z0-9_]{1,40}$/.test(name);
}

/**
 * Vérifie qu'un couple nom/valeur peut être écrit dans un cookie.
 * Lève `UnsafeCookieError` sinon — jamais d'écriture silencieuse.
 */
export function assertCookieSafe(name: string, value: string): void {
  if (!isBatibuildCookieName(name)) {
    throw new UnsafeCookieError(String(name), "nom hors du préfixe « bb_ »");
  }
  if (!name.startsWith(COOKIE_PREFIX)) {
    throw new UnsafeCookieError(String(name), "préfixe « bb_ » absent");
  }
  if (FORBIDDEN_NAME_PATTERN.test(name)) {
    throw new UnsafeCookieError(name, "nom réservé aux données sensibles");
  }
  if (typeof value !== "string") {
    throw new UnsafeCookieError(name, "valeur non textuelle");
  }
  if (value.length > COOKIE_VALUE_MAX_LENGTH) {
    throw new UnsafeCookieError(name, "valeur trop longue");
  }
  for (const pattern of FORBIDDEN_VALUE_PATTERNS) {
    if (pattern.test(value)) {
      throw new UnsafeCookieError(name, "valeur sensible");
    }
  }
}

/* ------------------------------------------------------------------ *
 * Sérialisation / analyse (fonctions pures — testables sans navigateur)
 * ------------------------------------------------------------------ */

export type CookieOptions = {
  /** Durée de vie en secondes. `undefined` = cookie de session du navigateur. */
  maxAgeSeconds?: number;
  /** Chemin (`/` par défaut). */
  path?: string;
  /** `Lax` par défaut : adapté à la navigation Web de batibuild. */
  sameSite?: "Lax" | "Strict" | "None";
  /** `Secure` : posé dès que le contexte est HTTPS. */
  secure?: boolean;
};

/**
 * Couple `nom=valeur` d'un en-tête `Cookie` (sans attributs : `Path`, `Secure`
 * et `SameSite` n'existent que dans l'affectation à `document.cookie`).
 */
export function encodeCookiePair(name: string, value: string): string {
  assertCookieSafe(name, value);
  return `${name}=${encodeURIComponent(value)}`;
}

/** Sérialise un cookie (`document.cookie = …`). Lève si la valeur est risquée. */
export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const path = options.path ?? "/";
  const sameSite = options.sameSite ?? "Lax";
  const parts = [encodeCookiePair(name, value), `Path=${path}`, `SameSite=${sameSite}`];
  if (options.maxAgeSeconds !== undefined) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`);
  }
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

/** Sérialise la SUPPRESSION d'un cookie (Max-Age=0). */
export function serializeCookieRemoval(name: string, options: CookieOptions = {}): string {
  return serializeCookie(name, "", { ...options, maxAgeSeconds: 0 });
}

/** Analyse un en-tête `document.cookie` (ou `Cookie:`) en dictionnaire. */
export function parseCookieHeader(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof header !== "string" || !header) return out;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    const name = part.slice(0, index).trim();
    if (!name) continue;
    const raw = part.slice(index + 1).trim();
    try {
      out[name] = decodeURIComponent(raw);
    } catch {
      out[name] = raw;
    }
  }
  return out;
}

/** Nom d'un couple `nom=valeur` d'un en-tête `Cookie`. */
function cookiePairName(pair: string): string {
  const index = pair.indexOf("=");
  return (index < 0 ? pair : pair.slice(0, index)).trim();
}

/** Couples d'un en-tête `Cookie` (entrées vides ignorées). */
function cookiePairs(header: string | null | undefined): string[] {
  if (typeof header !== "string" || !header) return [];
  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Ajoute / remplace un couple dans un en-tête `Cookie` (fonction pure).
 * La position du cookie existant est conservée (aucune réécriture inutile).
 */
export function upsertCookieHeader(
  header: string | null | undefined,
  name: string,
  value: string,
): string {
  const pair = encodeCookiePair(name, value);
  let replaced = false;
  const next = cookiePairs(header).map((entry) => {
    if (cookiePairName(entry) !== name) return entry;
    replaced = true;
    return pair;
  });
  if (!replaced) next.push(pair);
  return next.join("; ");
}

/** Retire un cookie d'un en-tête (fonction pure). */
export function removeCookieFromHeader(
  header: string | null | undefined,
  name: string,
): string {
  return cookiePairs(header)
    .filter((entry) => cookiePairName(entry) !== name)
    .join("; ");
}

/* ------------------------------------------------------------------ *
 * Accès navigateur (désactivé dans l'application Android)
 * ------------------------------------------------------------------ */

/** Magasin de cookies minimal (permets de tester sans navigateur). */
export type CookieStore = {
  read: () => string;
  write: (value: string) => void;
};

/** Stockage brut du navigateur, SANS contrôle de runtime. */
function rawDocumentStore(): CookieStore | null {
  if (typeof document === "undefined" || typeof document.cookie !== "string") return null;
  return {
    read: () => document.cookie,
    write: (value: string) => {
      document.cookie = value;
    },
  };
}

/**
 * Magasin de cookies de la plateforme Web :
 *   · `null` dans l'application Android (système de cookies Web désactivé) ;
 *   · `null` hors origine sécurisée (les cookies `Secure` y seraient rejetés) ;
 *   · `null` sans `document` (tests, Web Worker).
 */
export function browserCookieStore(): CookieStore | null {
  if (IS_ANDROID_APP) return null;
  if (!shouldUseWebCookies()) return null;
  return rawDocumentStore();
}

/** Options standard batibuild : `Path=/`, `SameSite=Lax`, `Secure` en HTTPS. */
function defaultOptions(maxAgeSeconds?: number): CookieOptions {
  const secure =
    typeof location !== "undefined" && location.protocol === "https:";
  return { maxAgeSeconds, path: "/", sameSite: "Lax", secure };
}

/** Lit un cookie batibuild (formats retournés ou `null`). */
export function readCookie(name: CookieName, store = browserCookieStore()): string | null {
  if (!store) return null;
  const value = parseCookieHeader(store.read())[name];
  return typeof value === "string" ? value : null;
}

/** Écrit un cookie batibuild. Renvoie `false` (sans erreur) si refusé/indisponible. */
export function writeCookie(
  name: CookieName,
  value: string,
  maxAgeSeconds?: number,
  store = browserCookieStore(),
): boolean {
  if (!store) return false;
  try {
    store.write(serializeCookie(name, value, defaultOptions(maxAgeSeconds)));
    return true;
  } catch (error) {
    // Valeur refusée par la politique : on n'écrit rien et on le signale.
    if (typeof console !== "undefined") {
      console.warn("[webCookies]", (error as Error).message);
    }
    return false;
  }
}

/** Supprime un cookie batibuild. Renvoie `false` si le stockage est désactivé. */
export function deleteCookie(name: CookieName, store = browserCookieStore()): boolean {
  if (!store) return false;
  store.write(serializeCookieRemoval(name, defaultOptions()));
  return true;
}

/** Noms des cookies batibuild réellement présents. */
export function listBatibuildCookies(store = browserCookieStore()): string[] {
  if (!store) return [];
  return Object.keys(parseCookieHeader(store.read()))
    .filter(isBatibuildCookieName)
    .sort();
}

/** Supprime TOUS les cookies batibuild (`bb_*`) présents. */
export function purgeBatibuildCookies(store: CookieStore | null = browserCookieStore()): number {
  if (!store) return 0;
  const names = listBatibuildCookies(store) as CookieName[];
  for (const name of names) deleteCookie(name, store);
  return names.length;
}

/**
 * Purge inconditionnelle des cookies batibuild — y compris dans l'application
 * Android, où elle nettoie d'éventuels cookies `bb_*` laissés par une version
 * Web antérieure partageant le même magasin WebView.
 * N'écrit JAMAIS de valeur : uniquement des suppressions.
 */
export function purgeBatibuildCookiesEverywhere(): number {
  return purgeBatibuildCookies(rawDocumentStore());
}

/* ------------------------------------------------------------------ *
 * Préférences de démarrage (API de haut niveau)
 * ------------------------------------------------------------------ */

/** Indice de démarrage : ce qu'un retour d'utilisateur doit restaurer d'emblée. */
export type WebBootHints = {
  lang?: Language;
  theme?: ThemeSetting;
  /** Une session était active lors de la dernière visite. */
  authenticated?: boolean;
  /** Type de profil mémorisé (indice d'affichage uniquement). */
  role?: string;
  /** Tableau de bord correspondant (indice de préchargement). */
  home?: string;
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (SUPPORTED_COOKIE_LANGUAGES as readonly string[]).includes(value);
}

export function isThemeSetting(value: unknown): value is ThemeSetting {
  return typeof value === "string" && (SUPPORTED_THEMES as readonly string[]).includes(value);
}

/** Type de profil : identifiant court et non sensible (`client`, `supplier`…). */
export function isRoleHint(value: unknown): value is string {
  return typeof value === "string" && /^[a-z][a-z0-9_]{1,23}$/.test(value);
}

/** Chemin interne : commence par `/` (jamais `//`), sans espace ni query. */
export function isPathHint(value: unknown): value is string {
  return typeof value === "string" && value.length <= 96 && /^\/(?!\/)[A-Za-z0-9\-_/]*$/.test(value);
}

/** Lit les indices de démarrage (objet vide si les cookies Web sont désactivés). */
export function readBootHints(store = browserCookieStore()): WebBootHints {
  if (!store) return {};
  const cookies = parseCookieHeader(store.read());
  const hints: WebBootHints = {};

  const lang = cookies[COOKIE_NAMES.lang];
  if (isLanguage(lang)) hints.lang = lang;

  const theme = cookies[COOKIE_NAMES.theme];
  if (isThemeSetting(theme)) hints.theme = theme;

  if (cookies[COOKIE_NAMES.session] === "1") hints.authenticated = true;

  const role = cookies[COOKIE_NAMES.role];
  if (isRoleHint(role)) hints.role = role;

  const home = cookies[COOKIE_NAMES.home];
  if (isPathHint(home)) hints.home = home;

  return hints;
}

/** Écrit les indices fournis ; les entrées invalides sont ignorées. */
export function persistBootHints(hints: WebBootHints, store = browserCookieStore()): boolean {
  if (!store) return false;
  let written = false;

  if (isLanguage(hints.lang)) {
    written = writeCookie(COOKIE_NAMES.lang, hints.lang, COOKIE_MAX_AGE.preferences, store) || written;
  }
  if (isThemeSetting(hints.theme)) {
    written = writeCookie(COOKIE_NAMES.theme, hints.theme, COOKIE_MAX_AGE.preferences, store) || written;
  }
  if (hints.authenticated === true) {
    written = writeCookie(COOKIE_NAMES.session, "1", COOKIE_MAX_AGE.sessionHint, store) || written;
  }
  if (isRoleHint(hints.role)) {
    written = writeCookie(COOKIE_NAMES.role, hints.role, COOKIE_MAX_AGE.sessionHint, store) || written;
  }
  if (isPathHint(hints.home)) {
    written = writeCookie(COOKIE_NAMES.home, hints.home, COOKIE_MAX_AGE.sessionHint, store) || written;
  }

  return written;
}

/**
 * Mémorise la langue choisie (cookie de préférence, 1 an).
 * Aucune écriture si le cookie porte déjà cette valeur.
 */
export function persistLanguage(lang: unknown, store = browserCookieStore()): boolean {
  if (!isLanguage(lang)) return false;
  if (readCookie(COOKIE_NAMES.lang, store) === lang) return false;
  return writeCookie(COOKIE_NAMES.lang, lang, COOKIE_MAX_AGE.preferences, store);
}

/**
 * Mémorise le thème (appliqué avant le premier rendu au chargement suivant).
 * Aucune écriture si le cookie porte déjà cette valeur.
 */
export function persistTheme(theme: unknown, store = browserCookieStore()): boolean {
  if (!isThemeSetting(theme)) return false;
  if (readCookie(COOKIE_NAMES.theme, store) === theme) return false;
  return writeCookie(COOKIE_NAMES.theme, theme, COOKIE_MAX_AGE.preferences, store);
}

/**
 * Mémorise l'état de connexion et le type de profil — SANS aucune donnée
 * personnelle (ni identifiant, ni e-mail, ni jeton).
 */
export function persistSessionHint(
  hint: { role?: unknown; home?: unknown },
  store = browserCookieStore(),
): boolean {
  if (!store) return false;
  let written = writeCookie(COOKIE_NAMES.session, "1", COOKIE_MAX_AGE.sessionHint, store);
  if (isRoleHint(hint.role)) {
    written = writeCookie(COOKIE_NAMES.role, hint.role, COOKIE_MAX_AGE.sessionHint, store) || written;
  } else {
    deleteCookie(COOKIE_NAMES.role, store);
  }
  if (isPathHint(hint.home)) {
    written = writeCookie(COOKIE_NAMES.home, hint.home, COOKIE_MAX_AGE.sessionHint, store) || written;
  } else {
    deleteCookie(COOKIE_NAMES.home, store);
  }
  return written;
}

/**
 * Efface l'indice de session (déconnexion, session expirée, expiration
 * détectée). Aucune donnée de session ne subsiste côté cookies.
 */
export function clearSessionHint(store = browserCookieStore()): boolean {
  if (!store) return false;
  deleteCookie(COOKIE_NAMES.session, store);
  deleteCookie(COOKIE_NAMES.role, store);
  deleteCookie(COOKIE_NAMES.home, store);
  return true;
}

/* ------------------------------------------------------------------ *
 * Lecture des préférences déjà présentes côté navigateur
 * ------------------------------------------------------------------ */

/** Accès à `localStorage` tolérant (mode privé, WebView restrictive…). */
export type StorageLike = { getItem: (key: string) => string | null };

export function safeLocalStorage(): StorageLike | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** Thème mémorisé par `next-themes` (`localStorage`), ou `null`. */
export function readStoredTheme(storage: StorageLike | null = safeLocalStorage()): ThemeSetting | null {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY) ?? null;
    return isThemeSetting(value) ? value : null;
  } catch {
    return null;
  }
}

/** Langue mémorisée par i18next (`localStorage`), ou `null`. */
export function readStoredLanguage(storage: StorageLike | null = safeLocalStorage()): Language | null {
  try {
    const value = storage?.getItem(LANGUAGE_STORAGE_KEY) ?? null;
    return isLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Thème effectif : la préférence enregistrée par `next-themes`, ou `system`
 * lorsqu'aucun choix explicite n'a été fait. On ne déduit JAMAIS le thème de la
 * classe appliquée sur `<html>` : cela figerait le mode « système » (l'utilisateur
 * perdrait le suivi automatique du thème de son appareil).
 */
export function resolveThemeSetting(): ThemeSetting {
  return readStoredTheme() ?? "system";
}
