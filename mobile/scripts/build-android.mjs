#!/usr/bin/env node
/**
 * Build Android 100 % LOCAL pour batibuild (aucun service cloud, aucun EAS).
 *
 * Utilisation :
 *   npm run android:apk                 # APK Release  → mobile/build/Batibuild-release.apk
 *   npm run android:debug               # APK Debug    → mobile/build/Batibuild-debug.apk
 *   npm run android:aab                 # AAB Release  → mobile/build/Batibuild-release.aab
 *   npm run android:install             # installe l'APK Release sur l'appareil branché (adb)
 *   npm run android:clean               # ./gradlew clean (supprime les sorties de build)
 *   npm run android:preflight           # vérifications seules (aucun build)
 *
 * Options (variables d'environnement) :
 *   ARCHS=arm64-v8a,armeabi-v7a   limiter les ABI (build plus rapide)
 *   SKIP_PREBUILD=1               ne pas resynchroniser android/ depuis app.json
 *   SKIP_TYPECHECK=1              ne pas lancer tsc --noEmit dans les pré-vérifications
 *
 * SÉQUENCE GARANTIE (aucun APK incomplet ou corrompu) :
 *   1. nettoie les fichiers temporaires restants ;
 *   2. vérifie les dépendances, la configuration Android, les routes de la
 *      plateforme utilisées par le mobile, les assets/icônes, le contrat
 *      WebView ↔ natif et lance le build TypeScript (`preflight-android.mjs`) ;
 *   3. corrige automatiquement ce qui est réparable (projet natif absent,
 *      clé debug manquante, signature release effacée, bit exécutable gradlew) ;
 *   4. lance Gradle en journalisant TOUTE la sortie dans
 *      `build/logs/gradle-<mode>.log` ;
 *   5. en cas d'échec : affiche la CAUSE EXACTE (« What went wrong », tâches en
 *      échec, signatures connues), retente UNE fois si la cause est réparable,
 *      puis termine par « BUILD FAILED » — sans jamais copier d'artefact ;
 *   6. vérifie l'artefact produit (existence, taille, structure ZIP, entrées
 *      obligatoires, signature) avec `verify-artifact.mjs` ;
 *   7. copie l'APK/AAB sous un nom identifiable SANS supprimer les autres
 *      artefacts déjà générés (debug, release, aab…), et écrit `BUILD-INFO.txt` ;
 *   8. termine par « BUILD SUCCESS » avec le chemin, la taille et le SHA-256.
 */
import {
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

import { runPreflight } from "./preflight-android.mjs";
import { verifyArtifact } from "./verify-artifact.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = join(root, "android");
const outDir = join(root, "build");
const logsDir = join(outDir, "logs");
const isWindows = process.platform === "win32";
const gradlew = join(androidDir, isWindows ? "gradlew.bat" : "gradlew");

// ── 1. Type de build demandé ─────────────────────────────────────────────────
const mode = (process.argv[2] || "apk").toLowerCase();
const TASKS = {
  apk: {
    gradleTask: "assembleRelease",
    variantDir: join(androidDir, "app/build/outputs/apk/release"),
    extension: ".apk",
    output: "Batibuild-release.apk",
  },
  debug: {
    gradleTask: "assembleDebug",
    variantDir: join(androidDir, "app/build/outputs/apk/debug"),
    extension: ".apk",
    output: "Batibuild-debug.apk",
  },
  aab: {
    gradleTask: "bundleRelease",
    variantDir: join(androidDir, "app/build/outputs/bundle/release"),
    extension: ".aab",
    output: "Batibuild-release.aab",
  },
  clean: {
    gradleTask: "clean",
    variantDir: null,
    extension: null,
    output: null,
  },
};

const plan = TASKS[mode];
if (!plan) {
  console.error(`\nBUILD FAILED\n\n❌ Mode inconnu : "${mode}" (attendu : apk | debug | aab | clean)\n`);
  process.exit(1);
}

const logPath = plan.variantDir ? join(logsDir, `gradle-${mode}.log`) : null;

/** Message final unique — TOUJOURS affiché, quel que soit le code de sortie. */
function buildFailed(causes) {
  console.error("\n════════════════════════════════════════════════════════════");
  console.error(" BUILD FAILED");
  console.error("════════════════════════════════════════════════════════════");
  for (const cause of [].concat(causes)) console.error(` ❌ ${cause}`);
  if (logPath) console.error(`\n   Log Gradle complet : ${relative(root, logPath)}`);
  console.error("");
  process.exit(1);
}

function buildSucceeded(lines) {
  console.log("\n════════════════════════════════════════════════════════════");
  console.log(" BUILD SUCCESS");
  console.log("════════════════════════════════════════════════════════════");
  for (const line of lines) console.log(` ${line}`);
  console.log("");
}

function die(cause) {
  buildFailed(cause);
}

/** Exécute une commande courte en héritant de la sortie (échec = arrêt). */
function run(command, args, options = {}) {
  console.log(`\n▶ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: options.cwd || root,
    shell: isWindows,
    env: process.env,
  });
  if (result.status !== 0) {
    die(`La commande « ${command} ${args.join(" ")} » a échoué (code ${result.status ?? "?"}).`);
  }
}

/** Journalise et affiche simultanément la sortie de Gradle. */
function runGradle(args) {
  return new Promise((resolve) => {
    const stream = createWriteStream(logPath, { flags: "w" });
    const child = spawn(gradlew, args, {
      cwd: androidDir,
      shell: isWindows,
      env: process.env,
    });
    const forward = (target) => (chunk) => {
      target.write(chunk);
      stream.write(chunk);
    };
    child.stdout.on("data", forward(process.stdout));
    child.stderr.on("data", forward(process.stderr));
    child.on("error", (error) => {
      stream.write(`\n[spawn error] ${error.message}\n`);
      stream.end();
      resolve({ status: 1, error: error.message });
    });
    child.on("close", (code) => {
      stream.end();
      resolve({ status: code ?? 1 });
    });
  });
}

/** Extrait la cause réelle d'un échec Gradle (jamais le pavé de stacktrace). */
function extractGradleCause() {
  const log = existsSync(logPath) ? readFileSync(logPath, "utf8") : "";
  if (!log) return ["Aucun log Gradle disponible : l'échec est survenu avant la compilation."];

  const causes = [];
  const section = log.match(/What went wrong:([\s\S]{0,900}?)(?:\n\* Try:|\n\* Get more help)/);
  if (section) {
    causes.push(
      `Cause Gradle : ${section[1].trim().split("\n").slice(0, 8).join("\n     ")}`,
    );
  }
  const failedTasks = [...log.matchAll(/^> Task .*FAILED.*$/gm)].map((m) => m[0].trim());
  if (failedTasks.length) causes.push(`Tâches en échec : ${[...new Set(failedTasks)].slice(0, 5).join(", ")}`);

  const signatures = [
    ["java.lang.OutOfMemoryError", "mémoire insuffisante (augmentez org.gradle.jvmargs dans android/gradle.properties)"],
    ["Java heap space", "mémoire insuffisante pour le daemon Gradle"],
    ["Killed", "processus tué par le noyau (mémoire épuisée : réduisez ARCHS)"],
    ["No space left on device", "disque plein"],
    ["ninja: build stopped", "compilation C++ (CMake/ninja) interrompue"],
    ["CMake Error", "configuration CMake invalide"],
    ["Keystore file", "clé de signature introuvable"],
    ["validateSigning", "configuration de signature invalide"],
    ["SDK location not found", "SDK Android introuvable (ANDROID_HOME / ANDROID_SDK_ROOT)"],
    ["e: file", "erreur de compilation Kotlin"],
  ];
  for (const [pattern, explanation] of signatures) {
    if (log.includes(pattern)) causes.push(`Signature connue : ${pattern} → ${explanation}`);
  }
  if (!causes.length) causes.push("Voir le log Gradle complet ci-dessus (aucune signature connue détectée).");
  return [...new Set(causes)];
}

/** Corrige automatiquement ce qui est réparable avant de relancer le build. */
function repairAndroidProject() {
  console.log("\n🛠  Correction automatique (projet natif, clé debug, signature release)…");
  run(process.execPath, [join(root, "scripts", "ensure-debug-keystore.mjs")]);
  run(process.execPath, [join(root, "scripts", "apply-signing.mjs")]);
  run("npx", ["expo", "prebuild", "--platform", "android", "--no-install"]);
  run(process.execPath, [join(root, "scripts", "apply-signing.mjs")]);
  if (!isWindows) {
    try {
      spawnSync("chmod", ["+x", gradlew], { stdio: "ignore" });
    } catch {
      /* non bloquant */
    }
  }
}

/** Chemin réel de l'artefact produit par Gradle (nom dépendant de la variante). */
function findArtifact() {
  if (!existsSync(plan.variantDir)) return null;
  const candidate = readdirSync(plan.variantDir).find(
    (name) => name.endsWith(plan.extension) && !name.includes("androidTest"),
  );
  return candidate ? join(plan.variantDir, candidate) : null;
}

/* ── 2. Pré-vérifications (dépendances, config, routes, assets, TS) ───────── */

if (mode === "clean") {
  console.log("▶ Nettoyage Gradle (./gradlew clean)");
  const result = spawnSync(gradlew, ["clean", "--console=plain"], {
    stdio: "inherit",
    cwd: androidDir,
    shell: isWindows,
    env: process.env,
  });
  if (result.status !== 0) die(`« gradlew clean » a échoué (code ${result.status ?? "?"}).`);
  buildSucceeded([`Nettoyage terminé — sorties de build supprimées.`]);
  process.exit(0);
}

{
  const preflight = runPreflight({ repair: true });
  if (!preflight.ok) {
    buildFailed([
      "Pré-vérifications en échec — l'APK n'est PAS généré pour éviter un fichier incomplet.",
      ...preflight.failures.map(({ check, cause }) => `${check} → ${cause}`),
    ]);
  }
}

/* ── 3. Projet natif + signature (corrections automatiques) ───────────────── */

if (!existsSync(androidDir) || !existsSync(join(androidDir, "app/build.gradle"))) {
  console.log("ℹ️  Projet natif android/ absent ou incomplet — génération via expo prebuild…");
  run("npx", ["expo", "prebuild", "--platform", "android", "--no-install"]);
}

if (process.env.PREBUILD === "1" || process.env.PREBUILD === "true") {
  console.log("ℹ️  PREBUILD=1 — resynchronisation du projet natif depuis app.json…");
  run("npx", ["expo", "prebuild", "--platform", "android", "--no-install"]);
}

// Clé de signature DEBUG : déclarée dans android/app/build.gradle, obligatoire
// sinon Gradle échoue après la compilation (:app:validateSigningDebug).
run(process.execPath, [join(root, "scripts", "ensure-debug-keystore.mjs")]);

// Signature Release (idempotent — réinsère le bloc si un prebuild l'a effacé).
run(process.execPath, [join(root, "scripts", "apply-signing.mjs")]);

/* ── 4. Préparation de la sortie (sans détruire les autres artefacts) ─────── */

if (!existsSync(gradlew)) die(`Gradle Wrapper introuvable : ${gradlew}`);
if (!isWindows) {
  try {
    // Le bit exécutable peut être perdu lors d'un clone Windows → Linux.
    spawnSync("chmod", ["+x", gradlew], { stdio: "ignore" });
  } catch {
    /* non bloquant */
  }
}

mkdirSync(logsDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

// Seul le fichier de CE mode est remplacé : les autres builds (debug, release,
// aab…) déjà présents dans mobile/build/ sont CONSERVÉS.
const destination = join(outDir, plan.output);
if (existsSync(destination)) {
  rmSync(destination, { force: true });
  console.log(`ℹ️  Ancien artefact remplacé : ${relative(root, destination)}`);
}

/* ── 5. Build Gradle (journalisé) ────────────────────────────────────────── */

const gradleArgs = [plan.gradleTask, "--console=plain"];
if (process.env.ARCHS) {
  gradleArgs.push(`-PreactNativeArchitectures=${process.env.ARCHS}`);
}

console.log(`\n▶ ${gradlew} ${gradleArgs.join(" ")}`);
console.log(`  Log : ${relative(root, logPath)}\n`);
let { status } = await runGradle(gradleArgs);

// Cause réparable (clé de signature, projet natif) → UNE seule tentative de
// correction automatique, puis relance du build.
if (status !== 0) {
  const log = existsSync(logPath) ? readFileSync(logPath, "utf8") : "";
  const fixable = /validateSigning|Keystore file|debug\.keystore|apply-signing|prebuild/i.test(log);
  if (fixable && process.env.NO_AUTO_REPAIR !== "1") {
    console.log("\n⚠️  Échec réparable détecté → correction automatique puis nouvelle tentative…");
    try {
      repairAndroidProject();
    } catch {
      /* `run()` termine déjà le script en cas d'échec de la correction */
    }
    ({ status } = await runGradle(gradleArgs));
  }
}

if (status !== 0) {
  const causes = extractGradleCause();
  console.error("\n──── Cause réelle de l'échec Gradle ────");
  for (const cause of causes) console.error(` ${cause}`);
  console.error("────────────────────────────────────");
  buildFailed([
    `Gradle a échoué (code ${status}) — aucune APK n'a été copiée.`,
    ...causes,
  ]);
}

/* ── 6. Artefact → mobile/build/Batibuild-… ──────────────────────────────── */

const artifact = findArtifact();
if (!artifact) {
  buildFailed([
    `Build terminé mais aucun ${plan.extension} trouvé dans ${relative(root, plan.variantDir)}.`,
    "Vérifiez la sortie Gradle ci-dessus.",
  ]);
}

copyFileSync(artifact, destination);

/* ── 7. Vérification de l'artefact final (taille, ZIP, entrées, signature) ─ */

const verification = verifyArtifact(destination, {
  kind: mode === "aab" ? "aab" : "apk",
});
for (const line of verification.details) console.log(`  ${line}`);
if (!verification.ok) {
  rmSync(destination, { force: true });
  buildFailed([
    "L'artefact produit est invalide : il a été supprimé pour ne pas être distribué.",
    ...verification.problems,
  ]);
}

/* ── 8. Traçabilité multi-artefacts + BUILD SUCCESS ──────────────────────── */

const sizeMb = (statSync(destination).size / (1024 * 1024)).toFixed(1);
const sha256 = createHash("sha256").update(readFileSync(destination)).digest("hex");
let version = "?";
let versionCode = "?";
try {
  const app = JSON.parse(readFileSync(join(root, "app.json"), "utf8")).expo;
  version = app.version ?? version;
  versionCode = app.android?.versionCode ?? versionCode;
} catch {
  /* app.json déjà vérifié pendant le préflight */
}

const infoPath = join(outDir, "BUILD-INFO.txt");
const info = [
  `batibuild mobile — build ${mode.toUpperCase()}`,
  `Date           : ${new Date().toISOString()}`,
  `Version        : ${version} (versionCode ${versionCode})`,
  `Fichier        : ${plan.output}`,
  `Taille         : ${sizeMb} Mo`,
  `SHA-256        : ${sha256}`,
  `ABI            : ${process.env.ARCHS || "défaut du projet"}`,
  `Source Gradle  : ${relative(root, artifact)}`,
  `Log            : ${relative(root, logPath)}`,
  "",
].join("\n");
writeFileSync(infoPath, info, "utf8");

const others = existsSync(outDir)
  ? readdirSync(outDir).filter((name) => name !== plan.output && name !== "logs" && name !== "BUILD-INFO.txt")
  : [];
if (others.length) {
  console.log(`\nℹ️  Autres artefacts conservés dans mobile/build/ : ${others.join(", ")}`);
}

buildSucceeded([
  `Fichier  : ${destination}`,
  `Taille   : ${sizeMb} Mo`,
  `SHA-256  : ${sha256}`,
  `Version  : ${version} (versionCode ${versionCode})`,
  `Infos    : ${relative(root, infoPath)}`,
  `Log      : ${relative(root, logPath)}`,
  "",
  "Installer sur un téléphone branché en USB :",
  `  adb install -r "${destination}"`,
]);

if (mode === "apk" && !process.env.ANDROID_KEYSTORE_PATH && !existsSync(join(androidDir, "keystore.properties"))) {
  console.log(
    "ℹ️  Aucun keystore Release configuré : cet APK est signé avec la clé debug\n" +
      "   (installable pour tester, mais refusé par Google Play).\n" +
      "   Créez un keystore : npm run keystore:generate — voir MOBILE_BUILD.md §11.\n",
  );
}
