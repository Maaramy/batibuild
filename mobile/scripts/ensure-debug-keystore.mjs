#!/usr/bin/env node
/**
 * Garantit la présence de la clé de signature DEBUG d'Android.
 *
 * `android/app/build.gradle` déclare :
 *
 *     signingConfigs {
 *         debug {
 *             storeFile file('debug.keystore')
 *             storePassword 'android'
 *             keyAlias 'androiddebugkey'
 *             keyPassword 'android'
 *         }
 *     }
 *
 * Si ce fichier est absent (clone frais, runner GitHub vierge, `android/`
 * régénéré), Gradle échoue — souvent APRÈS une longue compilation — avec :
 *
 *     Execution failed for task ':app:validateSigningDebug'.
 *     > Keystore file '.../android/app/debug.keystore' not found for signing config 'debug'.
 *
 * Ce script génère alors la CLÉ DEBUG STANDARD d'Android
 * (alias `androiddebugkey`, mots de passe `android`, dname `CN=Android Debug`)
 * avec `keytool` (fourni par le JDK du poste / du runner). Si la clé est
 * présente mais illisible (corrompue, incomplète), elle est régénérée.
 *
 * ⚠️ Il ne s'agit PAS d'un secret de production : cette clé est publique,
 * versionnée par le modèle Android officiel, et ne sert qu'à signer les APK de
 * test (et, à défaut de keystore Release, les builds release de test — refusés
 * par Google Play). Le keystore de production reste, lui, hors du dépôt
 * (android/keystore.properties + android/keystore/, jamais commités).
 *
 * Usage :
 *   node scripts/ensure-debug-keystore.mjs            # crée la clé si absente/invalide
 *   node scripts/ensure-debug-keystore.mjs --force    # la régénère toujours
 *   DEBUG_KEYSTORE_PATH=/tmp/debug.keystore node scripts/ensure-debug-keystore.mjs
 */
import { existsSync, mkdirSync, statSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const keystorePath =
  process.env.DEBUG_KEYSTORE_PATH || join(root, "android", "app", "debug.keystore");
const force = process.argv.includes("--force");

const ALIAS = "androiddebugkey";
const PASSWORD = "android";

function fail(message, hint) {
  console.error(`\n❌ ${message}`);
  if (hint) console.error(`   ${hint}`);
  console.error("");
  process.exit(1);
}

// `keytool` provient du JDK : on privilégie JAVA_HOME, puis le PATH.
const isWindows = process.platform === "win32";
function resolveKeytool() {
  const candidates = [];
  if (process.env.JAVA_HOME) {
    candidates.push(join(process.env.JAVA_HOME, "bin", isWindows ? "keytool.exe" : "keytool"));
  }
  candidates.push(isWindows ? "keytool.exe" : "keytool");
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ["-help"], { stdio: "ignore" });
    if (!probe.error) return candidate; // trouvé (quel que soit le code retour de -help)
  }
  return null;
}

function isValidKeystore(keytool) {
  const probe = spawnSync(
    keytool,
    ["-list", "-keystore", keystorePath, "-storepass", PASSWORD, "-alias", ALIAS],
    { stdio: "ignore" },
  );
  return probe.status === 0;
}

let keytool = resolveKeytool();

// Clé déjà présente (et lisible) → rien à faire.
if (existsSync(keystorePath) && !force) {
  const size = statSync(keystorePath).size;
  if (keytool && !isValidKeystore(keytool)) {
    console.warn(
      `⚠️  ${keystorePath} (${size} octets) est présent mais illisible → régénération.`,
    );
  } else {
    console.log(`✅ Clé debug déjà présente : ${keystorePath} (${size} octets)`);
    process.exit(0);
  }
}

if (!keytool) {
  fail(
    "`keytool` introuvable : impossible de générer la clé debug Android.",
    "Installez un JDK 17 et définissez JAVA_HOME (voir MOBILE_BUILD.md §2), ou fournissez la clé à " +
      keystorePath,
  );
}

if (!existsSync(dirname(keystorePath))) {
  mkdirSync(dirname(keystorePath), { recursive: true });
}
if (existsSync(keystorePath)) {
  rmSync(keystorePath, { force: true });
}

console.log(`🔑 Génération de la clé debug Android avec ${keytool}…`);

const result = spawnSync(
  keytool,
  [
    "-genkeypair",
    "-noprompt",
    "-storetype",
    "PKCS12",
    "-keystore",
    keystorePath,
    "-storepass",
    PASSWORD,
    "-keypass",
    PASSWORD,
    "-alias",
    ALIAS,
    "-keyalg",
    "RSA",
    "-keysize",
    "2048",
    "-validity",
    "10000",
    "-dname",
    "CN=Android Debug,O=Android,C=US",
  ],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  fail(
    `keytool a échoué (code ${result.status ?? "?"}).`,
    "Vérifiez que JAVA_HOME pointe vers un JDK 17 valide (java -version && keytool -help).",
  );
}

if (!existsSync(keystorePath) || statSync(keystorePath).size === 0 || !isValidKeystore(keytool)) {
  fail(`La clé debug n'a pas pu être créée/vérifiée : ${keystorePath}`);
}

console.log(`✅ Clé debug Android prête : ${keystorePath}`);
console.log("   Alias : androiddebugkey — utilisée uniquement pour les APK de test.");
