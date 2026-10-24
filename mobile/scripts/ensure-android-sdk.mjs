#!/usr/bin/env node
/**
 * NIVEAUX DE SDK ANDROID — source de vérité unique, déclarée EXPLICITEMENT.
 *
 * Problème corrigé : `android/app/build.gradle` lisait
 *   minSdkVersion rootProject.ext.minSdkVersion
 *   targetSdkVersion rootProject.ext.targetSdkVersion
 *   compileSdk rootProject.ext.compileSdkVersion
 * Ces valeurs provenaient du catalogue `expoLibs`
 * (node_modules/react-native/gradle/libs.versions.toml) via le plugin
 * `expo-root-project`. Un catalogue absent, un `expo prebuild` régénérant
 * `android/` ou une propriété non propagée suffisaient donc à produire un
 * manifeste final SANS `<uses-sdk android:minSdkVersion=…>` — APK refusé à
 * l'installation (« le package semble ne pas être valide »).
 *
 * Ce script garantit, de façon IDEMPOTENTE :
 *   1. `android/gradle.properties` déclare
 *        android.minSdkVersion / android.compileSdkVersion /
 *        android.targetSdkVersion / android.buildToolsVersion
 *      (ces propriétés alimentent `expoLibs`, donc tous les modules Expo) ;
 *   2. `android/app/build.gradle` porte des littéraux numériques
 *        compileSdk 36 / minSdkVersion 24 / targetSdkVersion 36
 *      ainsi que `applicationId`, `versionCode` et `versionName` identiques
 *      à `app.json`.
 *
 * minSdk = 24 et non 23 : React Native 0.86 publie `react-android` avec
 * minSdkVersion 24 et Expo 57 exige la même valeur. L'API 23 échouerait à la
 * fusion de manifestes (« uses-sdk:minSdkVersion 23 cannot be smaller than
 * version 24 declared in library »). Le script REFUSE donc un minSdk < 24.
 *
 * Usage :
 *   node scripts/ensure-android-sdk.mjs           # corrige (idempotent)
 *   node scripts/ensure-android-sdk.mjs --check   # vérifie seulement (CI)
 *
 * Code de sortie 0 si conforme, 1 sinon (avec la cause exacte).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK_ONLY = process.argv.includes("--check");

/** Valeurs par défaut, alignées sur node_modules/react-native/gradle/libs.versions.toml. */
const SDK_DEFAULTS = {
  minSdk: 24,
  compileSdk: 36,
  targetSdk: 36,
  buildTools: "36.0.0",
};

/**
 * Minimum réellement supporté par la pile applicative : react-android
 * (React Native 0.86) et expo-modules-core sont publiés en minSdkVersion 24.
 */
const MIN_SUPPORTED_MIN_SDK = 24;

// Chemins surchargeables : indispensable pour tester la réparation sur une
// copie sans toucher au projet (même convention que apply-signing.mjs).
const GRADLE_PROPERTIES = process.env.GRADLE_PROPERTIES || join(root, "android", "gradle.properties");
const APP_BUILD_GRADLE = process.env.BUILD_GRADLE || join(root, "android", "app", "build.gradle");
const APP_JSON = process.env.APP_JSON_PATH || join(root, "app.json");

const problems = [];
const changes = [];
const fail = (message) => problems.push(message);

function readRequired(path, label) {
  if (!existsSync(path)) {
    fail(`${label} introuvable : ${path}`);
    return null;
  }
  return readFileSync(path, "utf8");
}

function toLevel(value, label) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) {
    fail(`${label} invalide : « ${text} » — un entier d'API Android est attendu.`);
    return null;
  }
  return Number(text);
}

/* ── 1. app.json : package, versionCode, version ─────────────────────────── */

let appConfig = null;
try {
  appConfig = JSON.parse(readFileSync(APP_JSON, "utf8")).expo;
} catch (error) {
  fail(`app.json illisible : ${error.message}`);
}

const expectedPackage = appConfig?.android?.package;
const expectedVersionCode = appConfig?.android?.versionCode;
const expectedVersionName = appConfig?.version;

if (!expectedPackage) fail("app.json › expo.android.package absent");
if (typeof expectedVersionCode !== "number") {
  fail("app.json › expo.android.versionCode absent ou non numérique");
}
if (!expectedVersionName) fail("app.json › expo.version absent");

/* ── 2. android/gradle.properties : propriétés explicites ────────────────── */

const PROPERTIES = [
  ["android.minSdkVersion", String(SDK_DEFAULTS.minSdk)],
  ["android.compileSdkVersion", String(SDK_DEFAULTS.compileSdk)],
  ["android.targetSdkVersion", String(SDK_DEFAULTS.targetSdk)],
  ["android.buildToolsVersion", SDK_DEFAULTS.buildTools],
];

const properties = new Map();
const propertiesContent = readRequired(GRADLE_PROPERTIES, "android/gradle.properties");

if (propertiesContent !== null) {
  const lines = propertiesContent.split("\n");
  const missing = [];
  for (const [key, fallback] of PROPERTIES) {
    const index = lines.findIndex((line) => new RegExp(`^\\s*${key}\\s*=`).test(line));
    if (index === -1) {
      missing.push(`${key}=${fallback}`);
      properties.set(key, fallback);
      if (CHECK_ONLY) {
        fail(
          `android/gradle.properties : ${key} absent (valeur attendue : ${fallback}) — les modules Expo retomberaient sur un catalogue externe.`,
        );
      } else {
        changes.push(`android/gradle.properties : ${key}=${fallback} ajouté`);
      }
      continue;
    }
    properties.set(key, lines[index].slice(lines[index].indexOf("=") + 1).trim());
  }
  if (missing.length && !CHECK_ONLY) {
    // Bloc ajouté en tête, dans l'ordre de PROPERTIES.
    lines.splice(0, 0, ...missing);
    writeFileSync(GRADLE_PROPERTIES, lines.join("\n"), "utf8");
  }
}

const pinnedMinSdk = toLevel(
  properties.get("android.minSdkVersion") ?? SDK_DEFAULTS.minSdk,
  "android.minSdkVersion",
);
const pinnedCompileSdk = toLevel(
  properties.get("android.compileSdkVersion") ?? SDK_DEFAULTS.compileSdk,
  "android.compileSdkVersion",
);
const pinnedTargetSdk = toLevel(
  properties.get("android.targetSdkVersion") ?? SDK_DEFAULTS.targetSdk,
  "android.targetSdkVersion",
);

if (pinnedMinSdk !== null && pinnedMinSdk < MIN_SUPPORTED_MIN_SDK) {
  fail(
    `minSdkVersion ${pinnedMinSdk} refusé : React Native 0.86 / Expo 57 exigent l'API ${MIN_SUPPORTED_MIN_SDK} minimum ` +
      "(react-android est publié en minSdkVersion 24 ; l'API 23 casse la fusion de manifestes).",
  );
}
if (pinnedTargetSdk !== null && pinnedMinSdk !== null && pinnedTargetSdk < pinnedMinSdk) {
  fail(`targetSdkVersion ${pinnedTargetSdk} < minSdkVersion ${pinnedMinSdk}`);
}

/* ── 3. android/app/build.gradle : littéraux + versions d'app.json ───────── */

const gradleContent = readRequired(APP_BUILD_GRADLE, "android/app/build.gradle");

if (gradleContent !== null && pinnedMinSdk !== null && pinnedCompileSdk !== null && pinnedTargetSdk !== null) {
  const lines = gradleContent.split("\n");
  const androidIndex = lines.findIndex((line) => /^android\s*\{/.test(line.trim()));
  const defaultConfigIndex =
    androidIndex === -1
      ? -1
      : lines.findIndex((line, index) => index > androidIndex && /^defaultConfig\s*\{/.test(line.trim()));
  const defaultConfigEnd =
    defaultConfigIndex === -1
      ? -1
      : lines.findIndex((line, index) => index > defaultConfigIndex && line.trim() === "}");

  if (androidIndex === -1) {
    fail("android/app/build.gradle : bloc `android {` introuvable.");
  } else if (defaultConfigIndex === -1 || defaultConfigEnd === -1) {
    fail("android/app/build.gradle : bloc `defaultConfig { … }` introuvable.");
  } else {
    /**
     * Fixe une propriété du DSL Android sur une valeur littérale numérique.
     * Accepte les formes Groovy (`minSdkVersion 24`) et Kotlin (`minSdk = 24`),
     * dont l'ancienne indirection `rootProject.ext.*` (source du bug).
     * En mode --check, signale l'écart au lieu de modifier le fichier.
     */
    const setLiteral = ({ name, aliases, value, indent, from, to, after }) => {
      const pattern = new RegExp(`^\\s*(?:${aliases.join("|")})\\s*=?\\s*\\S+\\s*$`);
      for (let index = from; index < to; index += 1) {
        if (!pattern.test(lines[index])) continue;
        const desired = `${indent}${name} ${value}`;
        if (lines[index] !== desired) {
          if (CHECK_ONLY) {
            fail(
              `android/app/build.gradle : « ${lines[index].trim()} » (attendu « ${name} ${value} ») — le manifeste final doit porter cette valeur en dur.`,
            );
          } else {
            changes.push(`android/app/build.gradle : ${lines[index].trim()} → ${name} ${value}`);
            lines[index] = desired;
          }
        }
        return;
      }
      if (CHECK_ONLY) {
        fail(`android/app/build.gradle : « ${name} ${value} » absent — le manifeste final pourrait sortir sans <uses-sdk>.`);
      } else {
        const anchor = lines.findIndex(
          (line, index) => index >= from && index < to && after.test(line.trim()),
        );
        lines.splice(anchor === -1 ? from + 1 : anchor + 1, 0, `${indent}${name} ${value}`);
        changes.push(`android/app/build.gradle : ${name} ${value} ajouté`);
      }
    };

    setLiteral({
      name: "compileSdk",
      aliases: ["compileSdk", "compileSdkVersion"],
      value: pinnedCompileSdk,
      indent: "    ",
      from: androidIndex,
      to: defaultConfigIndex,
      after: /^buildToolsVersion\s/,
    });

    setLiteral({
      name: "minSdkVersion",
      aliases: ["minSdkVersion", "minSdk"],
      value: pinnedMinSdk,
      indent: "        ",
      from: defaultConfigIndex,
      to: defaultConfigEnd,
      after: /^applicationId\s/,
    });

    setLiteral({
      name: "targetSdkVersion",
      aliases: ["targetSdkVersion", "targetSdk"],
      value: pinnedTargetSdk,
      indent: "        ",
      from: defaultConfigIndex,
      to: defaultConfigEnd,
      after: /^minSdkVersion\s/,
    });

    if (expectedPackage) {
      const applicationIdIndex = lines.findIndex(
        (line, index) =>
          index > defaultConfigIndex && index < defaultConfigEnd && /^applicationId\s/.test(line.trim()),
      );
      const desired = `        applicationId '${expectedPackage}'`;
      if (applicationIdIndex === -1) {
        fail("android/app/build.gradle : `applicationId` absent de defaultConfig.");
      } else if (lines[applicationIdIndex] !== desired) {
        if (CHECK_ONLY) {
          fail(
            `android/app/build.gradle : « ${lines[applicationIdIndex].trim()} » (attendu « applicationId '${expectedPackage}' »).`,
          );
        } else {
          changes.push(`android/app/build.gradle : applicationId → '${expectedPackage}'`);
          lines[applicationIdIndex] = desired;
        }
      }
    }

    if (typeof expectedVersionCode === "number") {
      setLiteral({
        name: "versionCode",
        aliases: ["versionCode"],
        value: expectedVersionCode,
        indent: "        ",
        from: defaultConfigIndex,
        to: defaultConfigEnd,
        after: /^targetSdkVersion\s/,
      });
    }

    if (expectedVersionName) {
      const versionNamePattern = /^\s*versionName\s*=?\s*\S+\s*$/;
      const versionNameIndex = lines.findIndex(
        (line, index) =>
          index > defaultConfigIndex && index < defaultConfigEnd && versionNamePattern.test(line),
      );
      const desired = `        versionName "${expectedVersionName}"`;
      if (versionNameIndex === -1) {
        if (CHECK_ONLY) {
          fail(`android/app/build.gradle : « versionName "${expectedVersionName}" » absent de defaultConfig.`);
        } else {
          const versionCodeIndex = lines.findIndex(
            (line, index) =>
              index > defaultConfigIndex && index < defaultConfigEnd && /^versionCode\s/.test(line.trim()),
          );
          lines.splice(
            versionCodeIndex === -1 ? defaultConfigIndex + 1 : versionCodeIndex + 1,
            0,
            desired,
          );
          changes.push(`android/app/build.gradle : versionName "${expectedVersionName}" ajouté`);
        }
      } else if (lines[versionNameIndex] !== desired) {
        if (CHECK_ONLY) {
          fail(
            `android/app/build.gradle : « ${lines[versionNameIndex].trim()} » (attendu « versionName "${expectedVersionName}" », valeur de app.json).`,
          );
        } else {
          changes.push(
            `android/app/build.gradle : ${lines[versionNameIndex].trim()} → versionName "${expectedVersionName}"`,
          );
          lines[versionNameIndex] = desired;
        }
      }
    }

    if (!CHECK_ONLY && changes.length) {
      writeFileSync(APP_BUILD_GRADLE, lines.join("\n"), "utf8");
    }
  }
}

/* ── 4. Rapport ──────────────────────────────────────────────────────────── */

console.log("════════════════════════════════════════════════════════════");
console.log(` NIVEAUX DE SDK ANDROID — ${CHECK_ONLY ? "contrôle" : "réparation"}`);
console.log("════════════════════════════════════════════════════════════");

if (changes.length) {
  for (const change of changes) console.log(`  · ${change}`);
} else if (!CHECK_ONLY) {
  console.log("  · rien à corriger (configuration déjà explicite).");
}

console.log(
  `  · minSdk=${pinnedMinSdk} targetSdk=${pinnedTargetSdk} compileSdk=${pinnedCompileSdk} ` +
    `versionCode=${expectedVersionCode} versionName=${expectedVersionName}`,
);
console.log(`  · package=${expectedPackage}`);

if (problems.length) {
  console.log("\n  Causes exactes :");
  for (const problem of problems) console.log(`   ❌ ${problem}`);
  console.log("\nSDK ANDROID NON CONFORME\n");
  process.exit(1);
}

console.log(
  `\n  ✔ Le manifeste final portera <uses-sdk android:minSdkVersion="${pinnedMinSdk}" ` +
    `android:targetSdkVersion="${pinnedTargetSdk}" />.\n`,
);
