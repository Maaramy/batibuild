#!/usr/bin/env node
/**
 * Installe sur un appareil Android branché en USB l'APK Release généré
 * localement (mobile/build/Batibuild-release.apk). Aucun cloud, aucun EAS.
 *
 *   npm run android:install
 *
 * Prérequis : platform-tools / adb dans le PATH, téléphone en mode développeur
 * avec le débogage USB activé (voir MOBILE_BUILD.md §5 et §10).
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const adb = process.env.ADB || "adb";

const candidates = [
  process.env.APK_PATH,
  join(root, "build", "Batibuild-release.apk"),
  join(root, "build", "Batibuild-debug.apk"),
  join(root, "android/app/build/outputs/apk/release/app-release.apk"),
].filter(Boolean);

const apk = candidates.find((p) => existsSync(p));

if (!apk) {
  console.error(
    "❌ Aucun APK trouvé. Générez-le d'abord :\n" +
      "   npm run android:apk      (Release)\n" +
      "   npm run android:debug    (Debug)",
  );
  process.exit(1);
}

function run(command, args) {
  console.log(`\n▶ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: root,
    shell: isWindows,
  });
  return result.status ?? 1;
}

if (run(adb, ["start-server"]) !== 0) {
  console.error(
    "\n❌ adb introuvable ou non fonctionnel.\n" +
      "   Installez Android Platform Tools et ajoutez-le au PATH (voir MOBILE_BUILD.md §5).",
  );
  process.exit(1);
}

run(adb, ["devices"]);

console.log(`\n▶ Installation de : ${apk}\n`);
const status = run(adb, ["install", "-r", apk]);

if (status !== 0) {
  console.error(
    "\n❌ Installation échouée.\n" +
      "   • Vérifiez que l'appareil est listé comme « device » par `adb devices` ;\n" +
      "   • acceptez la demande d'autorisation USB sur le téléphone ;\n" +
      "   • si l'app est déjà installée avec une autre clé, désinstallez-la :\n" +
      "     adb uninstall com.batibuild.app\n",
  );
  process.exit(1);
}

console.log("\n✅ BatiBuild est installé sur l'appareil.\n");
