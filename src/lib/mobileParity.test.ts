import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * GARDE-FOU DE SYNCHRONISATION WEB ↔ APPLICATION ANDROID.
 *
 * L'application Android est une coque native (WebView) autour de la
 * plateforme : elle réutilise le routeur, les pages, les données et le
 * backend du Web. Deux choses peuvent cependant dériver silencieusement et ne
 * se voir qu'à l'installation sur un téléphone :
 *
 *   1. une route du menu natif qui n'existe plus (ou n'a jamais existé) côté
 *      plateforme → l'utilisateur touche un onglet et rien ne se passe ;
 *   2. une version mobile désynchronisée entre `app.json` (ce que la CI
 *      publie) et `android/app/build.gradle` (ce qui est réellement compilé) →
 *      APK mal étiquetée, ou installation refusée par Android.
 *
 * Ce fichier lit les deux côtés comme du TEXTE (aucun import croisé entre les
 * deux projets, aucun couplage d'exécution) et échoue dès qu'ils divergent.
 */

const ROOT = process.cwd();
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const ROUTER = "src/main.tsx";
const MOBILE_CONFIG = "mobile/src/config.ts";
const MOBILE_INJECTED = "mobile/src/injected.ts";
const MOBILE_APP_JSON = "mobile/app.json";
const MOBILE_BUILD_GRADLE = "mobile/android/app/build.gradle";

/** Routes déclarées par le routeur de la plateforme. */
function webRoutes(): string[] {
  return [...read(ROUTER).matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
}

/** Routes que l'application Android demande d'ouvrir. */
function mobileRoutes(): string[] {
  const src = read(MOBILE_CONFIG);
  const constant = (name: string) => {
    const m = src.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)"`));
    expect(m, `${name} introuvable dans ${MOBILE_CONFIG}`).not.toBeNull();
    return m![1];
  };
  return [
    constant("DASHBOARD_PATH"),
    constant("LOGIN_PATH"),
    constant("SUPPORT_PATH"),
    constant("SETTINGS_PATH"),
    ...[...src.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]),
  ];
}

describe("parité Web ↔ Android — routes du menu natif", () => {
  it("chaque route demandée par l'application existe dans le routeur de la plateforme", () => {
    const routes = new Set(webRoutes());
    for (const mobilePath of mobileRoutes()) {
      expect(routes, `route mobile absente du routeur : ${mobilePath}`).toContain(mobilePath);
    }
  });

  it("le menu natif conserve ses 5 sections (Profile · Projets · Home · ROI · Message)", () => {
    const ids = [...read(MOBILE_CONFIG).matchAll(/id:\s*"(profile|projects|dashboard|investments|messages)"/g)].map(
      (m) => m[1],
    );
    expect(ids).toEqual(["profile", "projects", "dashboard", "investments", "messages"]);
  });

  it("aucune barre de navigation inférieure ne subsiste dans la coque Android", () => {
    expect(existsSync(resolve(ROOT, "mobile/src/components/BottomNav.tsx"))).toBe(false);
    expect(read(MOBILE_CONFIG)).not.toContain("shouldShowBottomNav");
  });

  it("l'application ne masque ni ne retouche l'interface de la plateforme", () => {
    const injected = read(MOBILE_INJECTED);
    expect(injected).not.toContain("display:none");
    expect(injected).not.toContain("MOBILE_CHROME_SCRIPT");
  });
});

describe("parité Web ↔ Android — version de l'application", () => {
  it("app.json et android/app/build.gradle portent la même version et le même versionCode", () => {
    const expo = JSON.parse(read(MOBILE_APP_JSON)).expo;
    const gradle = read(MOBILE_BUILD_GRADLE);

    const versionCode = gradle.match(/versionCode\s+(\d+)/);
    const versionName = gradle.match(/versionName\s+"([^"]+)"/);
    expect(versionCode, "versionCode introuvable dans build.gradle").not.toBeNull();
    expect(versionName, "versionName introuvable dans build.gradle").not.toBeNull();

    // Android refuse d'installer par-dessus une APK de versionCode inférieur :
    // les deux fichiers doivent donc avancer ENSEMBLE.
    expect(Number(versionCode![1])).toBe(expo.android.versionCode);
    expect(versionName![1]).toBe(expo.version);
  });

  it("le versionCode est un entier croissant (jamais remis à zéro)", () => {
    const code = JSON.parse(read(MOBILE_APP_JSON)).expo.android.versionCode;
    expect(Number.isInteger(code)).toBe(true);
    expect(code).toBeGreaterThan(0);
  });
});
