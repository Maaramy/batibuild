#!/usr/bin/env node
/**
 * Réapplique le bloc « Signature Release » dans android/app/build.gradle.
 *
 * `expo prebuild` régénère android/app/build.gradle et efface les
 * personnalisations manuelles. Ce script réinsère le support du keystore de
 * production (android/keystore.properties OU variables d'environnement
 * ANDROID_KEYSTORE_PATH / ANDROID_KEYSTORE_PASSWORD / ANDROID_KEY_ALIAS /
 * ANDROID_KEY_PASSWORD) avec repli sur la clé debug.
 *
 * Le script est idempotent : si le bloc est déjà présent, il ne fait rien.
 *
 * Usage :
 *   node scripts/apply-signing.mjs
 *   # test sur une copie : BUILD_GRADLE=/chemin/build.gradle node scripts/apply-signing.mjs
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target =
  process.env.BUILD_GRADLE || join(root, "android", "app", "build.gradle");

if (!existsSync(target)) {
  console.error("❌ introuvable :", target);
  console.error("   Exécutez d'abord : npm run android:prebuild");
  process.exit(1);
}

let content = readFileSync(target, "utf8");

/**
 * Ajoute `enableV1Signing` / `enableV2Signing` aux configurations de signature.
 *
 * AGP n'active la signature v1 que si `minSdk < 24` ; notre minSdk est 24, donc
 * sans ces lignes l'APK ne porte QU'UNE signature v2 (schéma introduit avec
 * Android 7). C'est exactement ce qui produit, sur certains téléphones et
 * installateurs, « L'application n'a pas été installée, car le package semble
 * ne pas être valide » : le paquet ne contient alors aucune signature JAR
 * (META-INF), seule forme que savent lire plusieurs analyseurs de paquets.
 *
 * v1 + v2 est la combinaison la plus largement lisible ; v3 (Android 9+) est
 * ajouté automatiquement par AGP quand minSdk le permet.
 */
/** Les drapeaux de schéma sont-ils déjà présents dans le bloc courant ? */
function hasSchemeFlags(lines, startIndex) {
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "}") return false;
    if (lines[i].includes("enableV1Signing")) return true;
  }
  return false;
}

function ensureSigningSchemes(lines) {
  let changed = false;
  // Config debug (repli utilisé quand aucun keystore Release n'est configuré).
  const debugKeyPassword = lines.findIndex((line) => line.trim() === "keyPassword 'android'");
  if (debugKeyPassword !== -1 && !hasSchemeFlags(lines, debugKeyPassword)) {
    lines.splice(
      debugKeyPassword + 1,
      0,
      "            enableV1Signing true",
      "            enableV2Signing true",
    );
    changed = true;
  }
  // Config release (keystore de production).
  const releaseKeyPassword = lines.findIndex(
    (line) => line.trim() === "keyPassword releaseKeyPassword",
  );
  if (releaseKeyPassword !== -1 && !hasSchemeFlags(lines, releaseKeyPassword)) {
    lines.splice(
      releaseKeyPassword + 1,
      0,
      "                enableV1Signing true",
      "                enableV2Signing true",
    );
    changed = true;
  }
  return changed;
}

/**
 * Signature unique par apksigner : `-PbatibuildSigning=apksigner` demande à
 * Gradle un APK release NON signé (`app-release-unsigned.apk`), que le workflow
 * signe ensuite une seule fois avec apksigner (v1 JAR + v2 + v3).
 *
 * Évite qu'un même APK porte deux signatures successives (Gradle puis
 * apksigner) et lève toute ambiguïté entre `app-release.apk` et
 * `app-release-unsigned.apk`. La propriété doit être déclarée ET prise en
 * compte par le buildType release — y compris sur un build.gradle déjà
 * personnalisé par une version précédente de ce script.
 */
const APKSIGNER_PROPERTY_LINE =
  "def apksignerSigning = (findProperty('batibuildSigning') ?: '').toString() == 'apksigner'";
const RELEASE_SIGNING_LINE =
  "            signingConfig apksignerSigning ? null : (useReleaseSigning ? signingConfigs.release : signingConfigs.debug)";

function ensureApksignerSigning(lines) {
  let changed = false;
  if (!lines.some((line) => line.includes("def apksignerSigning"))) {
    const anchor = lines.findIndex((line) => line.trim().startsWith("def useReleaseSigning"));
    if (anchor !== -1) {
      lines.splice(anchor + 1, 0, "", APKSIGNER_PROPERTY_LINE);
      changed = true;
    }
  }
  const signingIdx = lines.findIndex((line) => line.includes("signingConfig useReleaseSigning"));
  if (signingIdx !== -1 && !lines[signingIdx].includes("apksignerSigning")) {
    lines[signingIdx] = RELEASE_SIGNING_LINE;
    changed = true;
  }
  return changed;
}

// Marqueur unique du bloc : `useReleaseSigning` n'existe que dans la config
// appliquée par ce script (jamais dans le template Expo).
if (content.includes("def useReleaseSigning")) {
  const existingLines = content.split("\n");
  const schemesChanged = ensureSigningSchemes(existingLines);
  const signingChanged = ensureApksignerSigning(existingLines);
  if (schemesChanged || signingChanged) {
    writeFileSync(target, existingLines.join("\n"), "utf8");
    console.log(
      "✅ Signature Release déjà présente — " +
        [schemesChanged ? "schémas v1 + v2" : null, signingChanged ? "signature unique apksigner" : null]
          .filter(Boolean)
          .join(" + ") +
        " ajouté(s).",
    );
  } else {
    console.log("✅ Signature Release déjà présente (v1 + v2, signature unique apksigner) — rien à faire.");
  }
  process.exit(0);
}

const HEADER_BLOCK = `
// ── Signature Release (100 % locale) ────────────────────────────────────────
// Ordre de priorité pour trouver le keystore de production :
//   1. android/keystore.properties  (fichier local, ignoré par Git)
//   2. Variables d'environnement    ANDROID_KEYSTORE_PATH / _PASSWORD
//                                   ANDROID_KEY_ALIAS / ANDROID_KEY_PASSWORD
//                                   (pratique en CI, rien n'est écrit sur disque)
// Sans keystore configuré, l'APK Release est signé avec la clé debug :
// installable pour tester, mais refusé par Google Play.
// Aucun mot de passe n'est JAMAIS commité ni affiché dans les logs.
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file("keystore.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

def envOrKeystoreProperty = { String envName, String propName ->
    def envValue = System.getenv(envName)
    if (envValue != null && !envValue.trim().isEmpty()) return envValue.trim()
    def propValue = keystoreProperties[propName]
    return (propValue != null && !propValue.toString().trim().isEmpty()) ? propValue.toString().trim() : null
}

def releaseStoreFile = envOrKeystoreProperty('ANDROID_KEYSTORE_PATH', 'storeFile')
def releaseStorePassword = envOrKeystoreProperty('ANDROID_KEYSTORE_PASSWORD', 'storePassword')
def releaseKeyAlias = envOrKeystoreProperty('ANDROID_KEY_ALIAS', 'keyAlias')
def releaseKeyPassword = envOrKeystoreProperty('ANDROID_KEY_PASSWORD', 'keyPassword') ?: releaseStorePassword

// Chemin absolu conservé tel quel ; chemin relatif résolu depuis mobile/android/.
def releaseKeystoreFile = releaseStoreFile == null ? null : (new File(releaseStoreFile).isAbsolute() ? new File(releaseStoreFile) : rootProject.file(releaseStoreFile))

def useReleaseSigning = releaseKeystoreFile != null && releaseKeystoreFile.exists() && releaseStorePassword != null && releaseKeyAlias != null

// SIGNATURE UNIQUE PAR apksigner (CI) : avec -PbatibuildSigning=apksigner,
// Gradle produit un APK release NON signé (app-release-unsigned.apk) et
// l'unique signature de l'artefact publié est posée par apksigner dans le
// workflow (v1 JAR + v2 + v3). Aucun fichier ne porte deux signatures
// successives. Sans cette propriété (builds locaux, AAB), rien ne change.
def apksignerSigning = (findProperty('batibuildSigning') ?: '').toString() == 'apksigner'

if (apksignerSigning) {
    println "🖊️  APK release NON signé par Gradle (-PbatibuildSigning=apksigner) : apksigner le signera (v1 + v2 + v3)."
} else if (useReleaseSigning) {
    println "🔐 APK/AAB Release signé avec le keystore : \${releaseKeystoreFile}"
} else if (releaseStoreFile != null) {
    println "⚠️  ANDROID_KEYSTORE_PATH/keystore.properties défini mais fichier introuvable : \${releaseKeystoreFile}"
} else {
    println "⚠️  Aucun keystore Release configuré — repli sur la clé debug (tests uniquement, refusé par Google Play)."
}

`;

const RELEASE_SIGNING_CONFIG = `        release {
            if (useReleaseSigning) {
                storeFile releaseKeystoreFile
                storePassword releaseStorePassword
                keyAlias releaseKeyAlias
                keyPassword releaseKeyPassword
                enableV1Signing true
                enableV2Signing true
            }
        }`;

const lines = content.split("\n");

// 1) Insérer l'en-tête (variables keystore) juste après `def jscFlavor = ...`
// NB : la ligne doit COMMENCER par `def` — le doc commentaire au-dessus contient
// aussi la chaîne "def jscFlavor = 'org.webkit…'" et ne doit pas être ciblée.
const jscIdx = lines.findIndex((l) => l.trim().startsWith("def jscFlavor = "));
if (jscIdx === -1) {
  console.error("❌ Marqueur « def jscFlavor » introuvable — insertion manuelle requise.");
  process.exit(1);
}
const headerLines = HEADER_BLOCK.replace(/\n+$/, "").split("\n");
headerLines.push(""); // une seule ligne vide après le bloc
lines.splice(jscIdx + 1, 0, ...headerLines);

// Normaliser : AU PLUS une ligne vide entre le bloc inséré et la suite
// (prebuild peut laisser plusieurs lignes vides à cet endroit).
// Le dernier élément inséré est la ligne vide ajoutée juste après `}`.
const blankStart = jscIdx + headerLines.length;
let blankRun = 0;
while (lines[blankStart + blankRun] === "") blankRun++;
if (blankRun > 1) lines.splice(blankStart + 1, blankRun - 1);

// 2) Insérer le signingConfig release après la fermeture du bloc debug
const keyPassIdx = lines.findIndex((l) => l.trim() === "keyPassword 'android'");
const closeDebugIdx = lines.findIndex(
  (l, i) => i > keyPassIdx && l.trim() === "}",
);
if (keyPassIdx === -1 || closeDebugIdx === -1) {
  console.error("❌ Bloc signingConfigs.debug introuvable — insertion manuelle requise.");
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
  console.error("❌ Bloc buildTypes.release introuvable — insertion manuelle requise.");
  process.exit(1);
}
lines[relSignIdx] = RELEASE_SIGNING_LINE;

// 4) Garantir les schémas de signature v1 + v2 (compatibilité maximale) et la
//    propriété de signature unique par apksigner (CI).
ensureSigningSchemes(lines);
ensureApksignerSigning(lines);

writeFileSync(target, lines.join("\n"), "utf8");
console.log("✅ Signature Release réappliquée dans", target);
