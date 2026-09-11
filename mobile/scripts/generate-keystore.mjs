#!/usr/bin/env node
/**
 * Génère un keystore Android Release LOCAL pour BatiBuild + le fichier
 * android/keystore.properties lu par Gradle. Aucun service cloud n'est utilisé.
 *
 *   npm run keystore:generate
 *
 * Personnalisation (variables d'environnement, toutes optionnelles) :
 *   ANDROID_KEYSTORE_PATH      chemin du .keystore  (défaut : android/keystore/batibuild-release.keystore)
 *   ANDROID_KEY_ALIAS          alias                (défaut : batibuild)
 *   ANDROID_KEYSTORE_PASSWORD  mot de passe du store (défaut : généré aléatoirement)
 *   ANDROID_KEY_PASSWORD       mot de passe de la clé (défaut : identique au store)
 *   KEYSTORE_DNAME             Distinguished Name  (défaut : CN=BatiBuild, OU=Mobile, O=BatiBuild, L=Tunis, C=TN)
 *
 * ⚠️  Le keystore et keystore.properties sont ignorés par Git (.gitignore).
 *     Sauvegardez-les dans un gestionnaire de mots de passe : sans eux, il est
 *     impossible de publier une mise à jour de l'application sur Google Play.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = join(root, "android");

if (!existsSync(androidDir)) {
  console.error("❌ android/ introuvable. Lancez d'abord : npm run android:prebuild");
  process.exit(1);
}

const alias = process.env.ANDROID_KEY_ALIAS || "batibuild";
const storePassword =
  process.env.ANDROID_KEYSTORE_PASSWORD || randomBytes(18).toString("base64url");
const keyPassword = process.env.ANDROID_KEY_PASSWORD || storePassword;
const dname =
  process.env.KEYSTORE_DNAME || "CN=BatiBuild, OU=Mobile, O=BatiBuild, L=Tunis, C=TN";

const keystorePath = process.env.ANDROID_KEYSTORE_PATH
  ? isAbsolute(process.env.ANDROID_KEYSTORE_PATH)
    ? process.env.ANDROID_KEYSTORE_PATH
    : join(root, process.env.ANDROID_KEYSTORE_PATH)
  : join(androidDir, "keystore", "batibuild-release.keystore");

if (existsSync(keystorePath)) {
  console.error(
    `❌ Un keystore existe déjà :\n   ${keystorePath}\n` +
      "   Supprimez-le explicitement si vous voulez vraiment en recréer un\n" +
      "   (⚠️ cela rend impossible la mise à jour d'une app déjà publiée).",
  );
  process.exit(1);
}

// keytool provient du JDK (JAVA_HOME/bin/keytool, sinon PATH).
const keytool = process.env.JAVA_HOME
  ? join(process.env.JAVA_HOME, "bin", process.platform === "win32" ? "keytool.exe" : "keytool")
  : "keytool";

mkdirSync(dirname(keystorePath), { recursive: true });

const args = [
  "-genkeypair",
  "-v",
  "-keystore", keystorePath,
  "-alias", alias,
  "-keyalg", "RSA",
  "-keysize", "2048",
  "-validity", "10000",
  "-storetype", "PKCS12",
  "-storepass", storePassword,
  "-keypass", keyPassword,
  "-dname", dname,
];

console.log(`▶ ${keytool} -genkeypair -keystore ${keystorePath} -alias ${alias} …`);
const result = spawnSync(keytool, args, { stdio: "inherit" });

if (result.error || result.status !== 0) {
  console.error(
    "\n❌ Échec de keytool. Vérifiez que le JDK 17 est installé et que JAVA_HOME est défini\n" +
      "   (voir MOBILE_BUILD.md §2).",
  );
  process.exit(1);
}

try {
  chmodSync(keystorePath, 0o600); // lecture/écriture propriétaire uniquement
} catch {
  /* Windows : non applicable */
}

// Chemin relatif à mobile/android/ (résolu par rootProject.file(...) dans Gradle).
const relativeStoreFile = keystorePath.startsWith(androidDir)
  ? keystorePath.slice(androidDir.length + 1).split("\\").join("/")
  : keystorePath;

const propertiesPath = join(androidDir, "keystore.properties");
const existing = existsSync(propertiesPath) ? readFileSync(propertiesPath, "utf8") : null;
if (existing) {
  console.warn(`⚠️  ${propertiesPath} existait déjà et a été remplacé.`);
}

writeFileSync(
  propertiesPath,
  [
    "# Généré par scripts/generate-keystore.mjs — NE JAMAIS COMMITER CE FICHIER.",
    `storeFile=${relativeStoreFile}`,
    `storePassword=${storePassword}`,
    `keyAlias=${alias}`,
    `keyPassword=${keyPassword}`,
    "",
  ].join("\n"),
  "utf8",
);

try {
  chmodSync(propertiesPath, 0o600);
} catch {
  /* Windows : non applicable */
}

console.log(`
✅ Keystore Release créé (100 % local, aucun cloud).

   Keystore     : ${keystorePath}
   Propriétés   : ${propertiesPath}
   Alias        : ${alias}
   Mot de passe : ${storePassword}

   ⚠️  Notez ce mot de passe MAINTENANT (gestionnaire de mots de passe) :
      il ne sera plus jamais affiché, et sans lui aucune mise à jour
      ne pourra être publiée sur Google Play.

   Build signé :
     npm run android:apk     # → build/Batibuild-release.apk
     npm run android:aab     # → build/Batibuild-release.aab
`);
