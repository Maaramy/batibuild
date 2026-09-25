#!/usr/bin/env node
/**
 * PRÉ-VÉRIFICATIONS ANDROID — batibuild Mobile.
 *
 * Exécuté AVANT chaque génération d'APK/AAB (localement et en CI). Objectif :
 * ne jamais produire un APK incomplet ou corrompu parce qu'une dépendance, une
 * route, un asset ou une configuration manquait.
 *
 * Utilisation :
 *   node scripts/preflight-android.mjs            # vérifie tout (échoue si un contrôle échoue)
 *   node scripts/preflight-android.mjs --repair    # régénère la clé debug si absente
 *   SKIP_TYPECHECK=1 node scripts/preflight-android.mjs
 *
 * Contrôles :
 *   1. nettoyage des fichiers de build temporaires / partiels ;
 *   2. dépendances installées (package.json ↔ node_modules) et modules critiques ;
 *   3. configuration Android (app.json, projet natif, manifest, keystore debug) ;
 *   4. routes de la plateforme utilisées par la barre de navigation mobile ;
 *   5. contrat WebView ↔ natif (pastille de la Messagerie, compteur Convex) ;
 *   6. assets, icônes et fichiers statiques référencés ;
 *   7. icônes lucide réellement exportées par la version installée ;
 *   8. build TypeScript (tsc --noEmit) du projet mobile.
 *
 * Aucune écriture hors de `mobile/` : le script ne fait que lire, nettoyer des
 * fichiers temporaires et lancer `tsc`.
 */
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
/** Racine de la plateforme Web (le dépôt entier) — en lecture seule. */
const repoRoot = join(root, "..");

const failures = [];
const warnings = [];

function ok(message) {
  console.log(`  ✅ ${message}`);
}
function fail(check, cause) {
  failures.push({ check, cause });
  console.log(`  ❌ ${check}\n     → ${cause}`);
}
function warn(message) {
  warnings.push(message);
  console.log(`  ⚠️  ${message}`);
}

function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function sizeOf(path) {
  try {
    return statSync(path).size;
  } catch {
    return -1;
  }
}

/* ── 1. Nettoyage des fichiers de build temporaires ───────────────────────── */

function cleanTemporaryFiles() {
  console.log("\n1. Nettoyage des fichiers de build temporaires");
  const dirs = [join(root, "build"), join(root, "android", "app", "build", "outputs")];
  const temporary = /\.(tmp|part|partial|apk\.tmp|apk\.partial)$/i;
  let removed = 0;

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    const stack = [dir];
    while (stack.length) {
      const current = stack.pop();
      let entries;
      try {
        entries = readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        const full = join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
        } else if (temporary.test(entry.name)) {
          rmSync(full, { force: true });
          removed += 1;
          console.log(`  · supprimé : ${relative(root, full)}`);
        }
      }
    }
  }
  ok(
    removed === 0
      ? "aucun fichier temporaire résiduel"
      : `${removed} fichier(s) temporaire(s) supprimé(s)`,
  );
}

/* ── 2. Dépendances ───────────────────────────────────────────────────────── */

/** Modules dont l'absence casse la coque native (chargés au démarrage). */
const CRITICAL_MODULES = [
  "expo",
  "expo-constants",
  "expo-file-system",
  "expo-sharing",
  "expo-splash-screen",
  "react",
  "react-native",
  "react-native-safe-area-context",
  "react-native-svg",
  "react-native-webview",
  "lucide-react-native",
  "@react-native-async-storage/async-storage",
];

function checkDependencies() {
  console.log("\n2. Dépendances (package.json ↔ node_modules)");
  let pkg = {};
  try {
    pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  } catch {
    fail("package.json", "illisible ou JSON invalide");
    return;
  }

  const declared = Object.keys(pkg.dependencies || {});
  if (declared.length === 0) fail("package.json", "aucune dépendance déclarée");

  const missing = [];
  for (const name of declared) {
    const manifest = join(root, "node_modules", name, "package.json");
    if (!existsSync(manifest)) missing.push(name);
  }
  if (missing.length) {
    fail(
      "dépendances installées",
      `modules absents de node_modules : ${missing.join(", ")} — lancez « npm install » (ou « bun install ») dans mobile/`,
    );
  } else {
    ok(`${declared.length} dépendances déclarées, toutes installées`);
  }

  const missingCritical = CRITICAL_MODULES.filter(
    (name) => !existsSync(join(root, "node_modules", name, "package.json")),
  );
  if (missingCritical.length) {
    fail("modules critiques", missingCritical.join(", "));
  } else {
    ok(`modules critiques présents (${CRITICAL_MODULES.length})`);
  }

  // Le catalogue React Native fournit les versions compileSdk / buildTools / NDK
  // lues par la CI : sans lui, le SDK ne peut pas être aligné sur le projet.
  const catalog = join(root, "node_modules", "react-native", "gradle", "libs.versions.toml");
  if (!existsSync(catalog)) {
    fail("catalogue React Native", `introuvable : ${relative(root, catalog)}`);
  } else {
    ok("catalogue React Native présent (versions compileSdk / buildTools / NDK)");
  }
}

/* ── 3. Configuration Android ─────────────────────────────────────────────── */

function checkAndroidConfig(repair) {
  console.log("\n3. Configuration Android (app.json + projet natif)");

  let app = null;
  try {
    app = JSON.parse(readFileSync(join(root, "app.json"), "utf8")).expo;
  } catch {
    fail("app.json", "illisible ou JSON invalide");
  }

  if (app) {
    if (!app.name) fail("app.json › name", "nom d'application absent");
    if (!app.version) fail("app.json › version", "version absente");
    if (!app.android?.package) {
      fail("app.json › android.package", "identifiant d'application absent (installation impossible)");
    } else if (!/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/.test(app.android.package)) {
      fail("app.json › android.package", `identifiant invalide : ${app.android.package}`);
    }
    if (typeof app.android?.versionCode !== "number") {
      fail("app.json › android.versionCode", "versionCode manquant ou non numérique");
    }
    for (const key of ["icon", "adaptiveIcon"]) {
      const value =
        key === "icon" ? app.icon : app.android?.adaptiveIcon?.foregroundImage;
      if (!value) {
        fail(`app.json › ${key}`, "chemin d'image absent");
        continue;
      }
      const file = join(root, value.replace(/^\.\//, ""));
      if (!existsSync(file) || sizeOf(file) <= 0) {
        fail(`app.json › ${key}`, `fichier introuvable ou vide : ${value}`);
      }
    }
    if (!failures.length) ok(`app.json valide (${app.android.package}, versionCode ${app.android.versionCode})`);
  }

  const requiredFiles = [
    "android/settings.gradle",
    "android/build.gradle",
    "android/gradle.properties",
    "android/gradlew",
    "android/gradle/wrapper/gradle-wrapper.properties",
    "android/app/build.gradle",
    "android/app/src/main/AndroidManifest.xml",
    "android/app/src/main/java/com/batibuild/app/MainActivity.kt",
    "android/app/src/main/java/com/batibuild/app/MainApplication.kt",
  ];
  const missingFiles = requiredFiles.filter((rel) => !existsSync(join(root, rel)));
  if (missingFiles.length) {
    fail(
      "projet natif android/",
      `fichiers manquants : ${missingFiles.join(", ")} — lancez « npm run android:prebuild »`,
    );
  } else {
    ok(`projet natif complet (${requiredFiles.length} fichiers clés)`);
  }

  const manifest = read(join(root, "android/app/src/main/AndroidManifest.xml"));
  if (manifest) {
    if (!manifest.includes("MainActivity")) {
      fail("AndroidManifest.xml", "activity principale absente");
    }
    if (!manifest.includes("android.permission.INTERNET")) {
      fail("AndroidManifest.xml", "permission INTERNET absente (la WebView ne chargerait rien)");
    }
    if (!failures.some((f) => f.check === "AndroidManifest.xml")) {
      ok("AndroidManifest.xml (activity + permission INTERNET)");
    }
  }

  const gradleProps = read(join(root, "android/gradle.properties"));
  if (gradleProps && !gradleProps.includes("org.gradle.jvmargs")) {
    warn("android/gradle.properties : org.gradle.jvmargs absent (mémoire du daemon Gradle)");
  }

  // Clé de signature DEBUG : déclarée dans android/app/build.gradle, elle est
  // obligatoire sinon Gradle échoue APRÈS la compilation (:app:validateSigningDebug).
  const debugKeystore = join(root, "android/app/debug.keystore");
  if (!existsSync(debugKeystore) || sizeOf(debugKeystore) <= 0) {
    if (repair) {
      console.log("  · clé debug absente → régénération (ensure-debug-keystore.mjs)");
      const res = spawnSync(process.execPath, [join(root, "scripts", "ensure-debug-keystore.mjs")], {
        stdio: "inherit",
      });
      if (res.status !== 0 || !existsSync(debugKeystore)) {
        fail("clé de signature debug", "régénération impossible (voir la sortie ci-dessus)");
      } else {
        ok("clé de signature debug régénérée");
      }
    } else {
      fail(
        "clé de signature debug",
        "android/app/debug.keystore absent — relancez avec --repair ou « npm run keystore:debug »",
      );
    }
  } else {
    ok("clé de signature debug présente");
  }
}

/* ── 4. Routes de la plateforme utilisées par le mobile ───────────────────── */

/**
 * Routes RÉELLES de la plateforme (`src/main.tsx`) atteintes depuis la coque
 * native : barre de navigation, en-tête (Support / Paramètres), connexion et
 * point d'entrée de la WebView. Si une page est renommée côté Web, le build
 * mobile échoue AVANT de produire une APK avec un lien mort.
 */
const REQUIRED_WEB_ROUTES = [
  "/auth",
  "/dashboard",
  "/dashboard/profile",
  "/dashboard/projects",
  "/dashboard/reports",
  "/dashboard/messages",
  "/dashboard/support",
  "/dashboard/settings",
];

function checkWebRoutes() {
  console.log("\n4. Routes de la plateforme utilisées par le mobile");
  const router = read(join(repoRoot, "src", "main.tsx"));
  if (!router) {
    fail("src/main.tsx", "routeur de la plateforme introuvable ou illisible");
    return;
  }

  const missing = REQUIRED_WEB_ROUTES.filter((route) => !router.includes(`path="${route}"`));
  if (missing.length) {
    fail(
      "routes de la plateforme",
      `route(s) introuvable(s) dans src/main.tsx : ${missing.join(", ")} — la navigation mobile pointerait dans le vide`,
    );
  } else {
    ok(`${REQUIRED_WEB_ROUTES.length} routes vérifiées (dont /dashboard/reports et /dashboard/projects)`);
  }

  for (const page of ["Dashboard", "ReportCenter"]) {
    if (!router.includes(page)) {
      warn(`src/main.tsx : page « ${page} » non référencée (vérifiez le routeur)`);
    }
  }
}

/* ── 5. Contrat WebView ↔ natif (pastille de la Messagerie) ───────────────── */

function checkNativeBridge() {
  console.log("\n5. Contrat WebView ↔ natif (pastille « Message »)");
  const nativeConfig = read(join(root, "src", "config.ts"));
  const webBridge = read(join(repoRoot, "src", "lib", "nativeBridge.ts"));

  const nativeType = nativeConfig.match(/UNREAD_MESSAGE_TYPE\s*=\s*"([^"]+)"/)?.[1];
  const webType = webBridge.match(/NATIVE_UNREAD_MESSAGE_TYPE\s*=\s*"([^"]+)"/)?.[1];

  if (!nativeType || !webType) {
    fail(
      "type du message de pastille",
      "UNREAD_MESSAGE_TYPE (mobile) ou NATIVE_UNREAD_MESSAGE_TYPE (web) introuvable",
    );
  } else if (nativeType !== webType) {
    fail(
      "type du message de pastille",
      `désynchronisé : mobile="${nativeType}" ≠ web="${webType}" (la pastille ne s'afficherait jamais)`,
    );
  } else {
    ok(`type de message identique des deux côtés (« ${nativeType} »)`);
  }

  const router = read(join(repoRoot, "src", "main.tsx"));
  if (!router.includes("MessagingBadgeSync")) {
    fail(
      "publication du compteur",
      "MessagingBadgeSync n'est plus monté dans src/main.tsx — la pastille native ne serait jamais mise à jour",
    );
  } else {
    ok("MessagingBadgeSync monté globalement (mise à jour en temps réel)");
  }

  const messaging = read(join(repoRoot, "src", "convex", "messaging.ts"));
  if (!messaging.includes("unreadCount")) {
    fail(
      "requête du compteur",
      "api.messaging.unreadCount introuvable — la pastille n'aurait aucune source de vérité",
    );
  } else {
    ok("source serveur du compteur présente (api.messaging.unreadCount)");
  }

  const nav = read(join(root, "src", "config.ts"));
  if (!nav.includes('label: "Message"')) {
    fail("onglet « Message »", "libellé absent de NAV_DESTINATIONS");
  }
  if (/label:\s*"ROI"/.test(nav)) {
    fail("ancien libellé « ROI »", "encore présent dans NAV_DESTINATIONS (interdit dans le menu mobile)");
  } else {
    ok("aucun libellé « ROI » dans la navigation mobile");
  }
  if (!/label:\s*"Rapport"/.test(nav)) {
    fail("onglet « Rapport »", "libellé absent de NAV_DESTINATIONS");
  } else {
    ok("onglet « Rapport » présent");
  }
  if (!/label:\s*"Mes projets"/.test(nav)) {
    fail("onglet « Mes projets »", "libellé absent de NAV_DESTINATIONS");
  } else {
    ok("onglet « Mes projets » présent");
  }
}

/* ── 6. Assets, icônes et fichiers statiques ─────────────────────────────── */

function checkAssets() {
  console.log("\n6. Assets, icônes et fichiers statiques");
  const assetsDir = join(root, "assets");
  if (!existsSync(assetsDir)) {
    fail("dossier mobile/assets", "introuvable");
    return;
  }

  const files = readdirSync(assetsDir);
  const empty = files.filter((name) => sizeOf(join(assetsDir, name)) <= 0);
  if (empty.length) {
    fail("assets vides", empty.join(", "));
  } else {
    ok(`${files.length} assets présents et non vides`);
  }

  let app = null;
  try {
    app = JSON.parse(readFileSync(join(root, "app.json"), "utf8")).expo;
  } catch {
    /* déjà signalé par checkAndroidConfig */
  }
  const referenced = [
    app?.icon,
    app?.android?.adaptiveIcon?.foregroundImage,
    app?.plugins?.find?.((p) => Array.isArray(p) && p[0] === "expo-splash-screen")?.[1]?.image,
  ].filter((value) => typeof value === "string" && value.length > 0);

  const missing = referenced.filter((value) => !existsSync(join(root, value.replace(/^\.\//, ""))));
  if (missing.length) {
    fail("assets référencés par app.json", `introuvable(s) : ${missing.join(", ")}`);
  } else if (referenced.length) {
    ok(`${referenced.length} assets référencés par app.json vérifiés`);
  }

  // Logo de la plateforme utilisé par les écrans natifs (`Logo.tsx`).
  const logo = read(join(root, "src", "components", "Logo.tsx"));
  if (!logo) {
    fail("Logo natif", "src/components/Logo.tsx introuvable");
  } else {
    ok("composant Logo natif présent");
  }
}

/* ── 7. Icônes lucide réellement exportées ───────────────────────────────── */

/**
 * Icônes utilisées par la coque native : elles proviennent de
 * `lucide-react-native` (même famille que la plateforme Web). Une icône
 * supprimée/renommée dans la version installée casserait l'écran de navigation
 * au démarrage — l'erreur est détectée ici, avant le build.
 */
const REQUIRED_ICONS = [
  "FileDown", // onglet « Rapport »
  "User",
  "HardHat",
  "LayoutDashboard",
  "MessageSquare",
  "Headset",
  "Settings",
  "CloudOff",
];

function checkIcons() {
  console.log("\n7. Icônes lucide utilisées par le mobile");
  const types = join(root, "node_modules", "lucide-react-native", "dist", "lucide-react-native.d.ts");
  if (!existsSync(types)) {
    fail("lucide-react-native", `fichier de types introuvable : ${relative(root, types)}`);
    return;
  }
  const content = read(types);
  const missing = REQUIRED_ICONS.filter((icon) => !content.includes(`declare const ${icon}`));
  if (missing.length) {
    fail("icônes manquantes", `${missing.join(", ")} — absentes de lucide-react-native installé`);
  } else {
    ok(`${REQUIRED_ICONS.length} icônes vérifiées (dont FileDown pour « Rapport »)`);
  }
}

/* ── 8. Build TypeScript ─────────────────────────────────────────────────── */

function checkTypeScript() {
  console.log("\n8. Build TypeScript (tsc --noEmit)");
  if (process.env.SKIP_TYPECHECK === "1") {
    warn("contrôle ignoré (SKIP_TYPECHECK=1)");
    return;
  }
  const tsc = join(root, "node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc");
  if (!existsSync(tsc)) {
    fail("typescript", "binaire tsc introuvable dans node_modules/.bin");
    return;
  }
  const res = spawnSync(tsc, ["--noEmit"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (res.status !== 0) {
    fail(
      "tsc --noEmit",
      `échec de compilation TypeScript (code ${res.status ?? "?"}) — corrigez les erreurs ci-dessus`,
    );
  } else {
    ok("aucune erreur TypeScript");
  }
}

/* ── Exécution ───────────────────────────────────────────────────────────── */

export function runPreflight({ repair = false } = {}) {
  failures.length = 0;
  warnings.length = 0;

  console.log("════════════════════════════════════════════════════════════");
  console.log(" PRÉ-VÉRIFICATIONS ANDROID — batibuild mobile");
  console.log("════════════════════════════════════════════════════════════");

  cleanTemporaryFiles();
  checkDependencies();
  checkAndroidConfig(repair);
  checkWebRoutes();
  checkNativeBridge();
  checkAssets();
  checkIcons();
  checkTypeScript();

  console.log("\n════════════════════════════════════════════════════════════");
  if (failures.length) {
    console.log(` PRÉ-VÉRIFICATIONS : ÉCHEC (${failures.length} problème(s))`);
    for (const { check, cause } of failures) console.log(`   ❌ ${check} → ${cause}`);
    console.log("════════════════════════════════════════════════════════════\n");
    return { ok: false, failures };
  }
  console.log(" PRÉ-VÉRIFICATIONS : OK");
  if (warnings.length) {
    for (const message of warnings) console.log(`   ⚠️  ${message}`);
  }
  console.log("════════════════════════════════════════════════════════════\n");
  return { ok: true, failures: [] };
}

// Exécution directe : `node scripts/preflight-android.mjs [--repair]`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const repair = process.argv.includes("--repair");
  const result = runPreflight({ repair });
  process.exit(result.ok ? 0 : 1);
}
