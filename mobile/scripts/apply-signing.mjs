#!/usr/bin/env node
/**
 * Réapplique le bloc « Signature Release » dans android/app/build.gradle.
 *
 * `expo prebuild` régénère android/app/build.gradle et efface les modifications
 * manuelles. Ce script réinsère le support de `android/keystore.properties`
 * (signature Release avec repli sur la clé debug) si le bloc est absent.
 *
 * Usage :
 *   bun run scripts/apply-signing
 *   # ou : node scripts/apply-signing.mjs
 *   # test : BUILD_GRADLE=/chemin/build.gradle node scripts/apply-signing.mjs
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target =
  process.env.BUILD_GRADLE || join(root, "android", "app", "build.gradle");

if (!existsSync(target)) {
  console.error("introuvable :", target);
  console.error("Exécutez d'abord : bunx expo prebuild --platform android");
  process.exit(1);
}

let content = readFileSync(target, "utf8");

// Marqueur unique du bloc : la variable `useReleaseSigning` n'existe que dans
// la config appliquée par ce script (jamais dans le template Expo).
if (content.includes("def useReleaseSigning")) {
  console.log("✅ Signature Release déjà présente — rien à faire.");
  process.exit(0);
}

const HEADER_BLOCK = `// ── Signature Release ────────────────────────────────────────────────────────
// Si un fichier android/keystore.properties existe (généré depuis les secrets
// GitHub Actions ou créé manuellement), le build Release est signé avec le
// keystore de production. Sinon, on retombe sur la clé debug (APK installable
// pour les tests). Les mots de passe ne sont JAMAIS commités dans le code.
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file("keystore.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

def useReleaseSigning = keystorePropertiesFile.exists() && keystoreProperties['storeFile']

`;

const RELEASE_SIGNING_CONFIG = `        release {
            if (useReleaseSigning) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }`;

const lines = content.split("\n");

// 1) Insérer l'en-tête (variables keystore) avant `def jscFlavor = ...`
// NB : la ligne doit COMMENCER par `def` — le doc commentaire au-dessus contient
// aussi la chaîne "def jscFlavor = 'org.webkit…'" et ne doit pas être ciblée.
const jscIdx = lines.findIndex((l) => l.trim().startsWith("def jscFlavor = "));
if (jscIdx === -1) {
  console.error("Marqueur « def jscFlavor » introuvable — insertion manuelle requise.");
  process.exit(1);
}
lines.splice(jscIdx, 0, ...HEADER_BLOCK.split("\n"));

// 2) Insérer le signingConfig release après la fermeture du bloc debug
const keyPassIdx = lines.findIndex((l) => l.trim() === "keyPassword 'android'");
const closeDebugIdx = lines.findIndex(
  (l, i) => i > keyPassIdx && l.trim() === "}",
);
if (keyPassIdx === -1 || closeDebugIdx === -1) {
  console.error("Bloc signingConfigs.debug introuvable — insertion manuelle requise.");
  process.exit(1);
}
lines.splice(closeDebugIdx + 1, 0, RELEASE_SIGNING_CONFIG);

// 3) Dans buildTypes.release, remplacer la signature debug par la config dynamique
const buildTypesIdx = lines.findIndex((l) => l.includes("buildTypes {"));
const releaseIdx = lines.findIndex(
  (l, i) => i > buildTypesIdx && l.includes("release {"),
);
const relSignIdx = lines.findIndex(
  (l, i) => i > releaseIdx && l.includes("signingConfig signingConfigs.debug"),
);
if (buildTypesIdx === -1 || releaseIdx === -1 || relSignIdx === -1) {
  console.error("Bloc buildTypes.release introuvable — insertion manuelle requise.");
  process.exit(1);
}
lines[relSignIdx] =
  "            signingConfig useReleaseSigning ? signingConfigs.release : signingConfigs.debug";

writeFileSync(target, lines.join("\n"), "utf8");
console.log("✅ Signature Release réappliquée dans", target);