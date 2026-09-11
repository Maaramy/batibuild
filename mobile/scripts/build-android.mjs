#!/usr/bin/env node
/**
 * Build Android 100 % LOCAL pour BatiBuild (aucun service cloud, aucun EAS).
 *
 * Utilisation :
 *   npm run android:apk                 # APK Release  → mobile/build/Batibuild-release.apk
 *   npm run android:debug               # APK Debug    → mobile/build/Batibuild-debug.apk
 *   npm run android:aab                 # AAB Release  → mobile/build/Batibuild-release.aab
 *   npm run android:install             # installe l'APK Release sur l'appareil branché (adb)
 *   npm run android:clean               # ./gradlew clean (supprime les sorties de build)
 *
 * Options (variables d'environnement) :
 *   ARCHS=arm64-v8a,armeabi-v7a   limiter les ABI (build plus rapide)
 *   SKIP_PREBUILD=1               ne pas resynchroniser android/ depuis app.json
 *
 * Le script :
 *   1. vérifie les prérequis (JAVA_HOME, Android SDK, node_modules) ;
 *   2. resynchronise le projet natif si `android/` est absent (expo prebuild) ;
 *   3. réapplique la signature Release (idempotent) ;
 *   4. lance le Gradle Wrapper du projet (gradlew / gradlew.bat) ;
 *   5. copie l'artefact dans mobile/build/ avec un nom explicite (Batibuild-…).
 */
import { existsSync, mkdirSync, copyFileSync, statSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = join(root, "android");
const outDir = join(root, "build");
const isWindows = process.platform === "win32";
const gradlew = join(androidDir, isWindows ? "gradlew.bat" : "gradlew");

// ── 1. Type de build demandé ─────────────────────────────────────────────────
const mode = (process.argv[2] || "apk").toLowerCase();
const TASKS = {
  apk: {
    gradleTask: "assembleRelease",
    variant: "release",
    artifact: join(androidDir, "app/build/outputs/apk/release/app-release.apk"),
    output: "Batibuild-release.apk",
  },
  debug: {
    gradleTask: "assembleDebug",
    variant: "debug",
    artifact: join(androidDir, "app/build/outputs/apk/debug/app-debug.apk"),
    output: "Batibuild-debug.apk",
  },
  aab: {
    gradleTask: "bundleRelease",
    variant: "release",
    artifact: join(androidDir, "app/build/outputs/bundle/release/app-release.aab"),
    output: "Batibuild-release.aab",
  },
  clean: {
    gradleTask: "clean",
    variant: null,
    artifact: null,
    output: null,
  },
};

const plan = TASKS[mode];
if (!plan) {
  console.error(`❌ Mode inconnu : "${mode}" (attendu : apk | debug | aab | clean)`);
  process.exit(1);
}

function die(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function run(command, args, options = {}) {
  console.log(`\n▶ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: options.cwd || root,
    shell: isWindows, // nécessaire pour gradlew.bat / npm sous Windows
    env: process.env,
  });
  if (result.status !== 0) {
    die(`La commande a échoué (code ${result.status ?? "?"}). Voir la sortie ci-dessus.`);
  }
}

// ── 2. Prérequis ─────────────────────────────────────────────────────────────
if (!existsSync(join(root, "node_modules"))) {
  die("Dépendances manquantes : lancez `npm install` (ou `bun install`) dans mobile/.");
}
if (!process.env.JAVA_HOME) {
  console.warn(
    "⚠️  JAVA_HOME n'est pas défini. Installez le JDK 17 et définissez JAVA_HOME " +
      "(voir MOBILE_BUILD.md §2). Gradle tentera d'utiliser `java` du PATH.",
  );
}
if (!process.env.ANDROID_HOME && !process.env.ANDROID_SDK_ROOT) {
  console.warn(
    "⚠️  ANDROID_HOME / ANDROID_SDK_ROOT n'est pas défini — le build échouera si " +
      "le SDK Android n'est pas trouvé (voir MOBILE_BUILD.md §4).",
  );
}

// ── 3. Projet natif android/ ─────────────────────────────────────────────────
if (!existsSync(androidDir)) {
  console.log("ℹ️  Projet natif android/ absent — génération via expo prebuild…");
  run("npx", ["expo", "prebuild", "--platform", "android"]);
}

// PREBUILD=1 force la resynchronisation du projet natif depuis app.json.
if (process.env.PREBUILD === "1" || process.env.PREBUILD === "true") {
  console.log("ℹ️  PREBUILD=1 — resynchronisation du projet natif depuis app.json…");
  run("npx", ["expo", "prebuild", "--platform", "android"]);
}

// Signature Release (idempotent — réinsère le bloc si un prebuild l'a effacé).
run(process.execPath, [join(root, "scripts", "apply-signing.mjs")]);

// ── 4. Build Gradle local ────────────────────────────────────────────────────
if (!existsSync(gradlew)) {
  die(`Gradle Wrapper introuvable : ${gradlew}`);
}
if (!isWindows) {
  try {
    // Le bit exécutable peut être perdu lors d'un clone Windows → Linux.
    spawnSync("chmod", ["+x", gradlew], { stdio: "ignore" });
  } catch {
    /* non bloquant */
  }
}

// La mémoire du daemon Gradle est définie dans android/gradle.properties
// (org.gradle.jvmargs) — fiable sur toutes les plateformes.
const gradleArgs = [plan.gradleTask, "--console=plain"];
if (process.env.ARCHS) {
  gradleArgs.push(`-PreactNativeArchitectures=${process.env.ARCHS}`);
}

run(gradlew, gradleArgs, { cwd: androidDir });

// ── 5. Artefact → mobile/build/Batibuild-… ───────────────────────────────────
if (!plan.artifact) {
  console.log("\n✅ Nettoyage terminé (aucun artefact à copier).\n");
  process.exit(0);
}

if (!existsSync(plan.artifact)) {
  die(
    `Build terminé mais artefact introuvable :\n   ${plan.artifact}\n` +
      "   Vérifiez la sortie Gradle ci-dessus.",
  );
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const destination = join(outDir, plan.output);
copyFileSync(plan.artifact, destination);

const sizeMb = (statSync(destination).size / (1024 * 1024)).toFixed(1);
console.log(`
✅ Build ${mode.toUpperCase()} terminé — 100 % local, sans EAS ni cloud.

   Fichier  : ${destination}
   Taille   : ${sizeMb} Mo
   Source   : ${plan.artifact}

   Installer sur un téléphone branché en USB :
     adb install "${destination}"
`);

if (mode === "apk" && !process.env.ANDROID_KEYSTORE_PATH && !existsSync(join(androidDir, "keystore.properties"))) {
  console.log(
    "ℹ️  Aucun keystore Release configuré : cet APK est signé avec la clé debug\n" +
      "   (installable pour tester, mais refusé par Google Play).\n" +
      "   Créez un keystore : npm run keystore:generate — voir MOBILE_BUILD.md §11.\n",
  );
}
